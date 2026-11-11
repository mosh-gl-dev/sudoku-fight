import { isRunningInExpoGo } from 'expo';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useSyncExternalStore } from 'react';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { accountConfig } from '../config/account';

/**
 * The system's splash (Android 12+: the app icon on dark; iOS: the launch screen) hands over to the app's own
 * Splash (spec §4.1 #1, §4.2; screens/account/SplashScreen.tsx), in this order (QA account-open-splash-look):
 *
 * 1. `held`: the system splash stays up while the JS loads and the first tree mounts (`holdSystemSplash`, at the
 *    root layout's import). The app's Splash is up under it from the first full render, whatever the sign-in
 *    already knows (`useSystemSplashCovering`), so what the system splash uncovers is always the Splash, never Home.
 * 2. `exiting`: once the Splash has laid out and a frame has passed (`hideSystemSplashAfterLayout`, from the
 *    Splash's first onLayout), the system splash goes by a short cross-fade (`SYSTEM_SPLASH_EXIT_MS`; Reduced
 *    Motion's short fade too, motion.md `splash.handoff`). The Splash under it is drawn whole from its first frame
 *    (no entrance: the cross-fade is its entrance), and it stays: the two never go together.
 * 3. `done`: the Splash has been seen whole, with no icon over it, for `SPLASH_SEEN_FRAMES` frames the display has
 *    drawn and `accountConfig.splashSeenMs` (counted on the UI thread, `useSystemSplashPacer`, so a busy start
 *    that runs both exits out in one late frame still leaves the Splash alone on screen for those frames). From
 *    here it fades to the first screen as it always did, once the sign-in is known.
 *
 * Expo Go (and Jest, which runs as Expo Go unless a test says otherwise) has no handoff (`off`): the system splash
 * goes when the fonts are ready, as before. The app runs as a development or release build (CLAUDE.md).
 *
 * Before: the system splash was hidden when the fonts were ready (the first render's effect), with Expo's 400 ms
 * accelerating fade, while the sign-in (a saved profile: a few frames) was already done. The app's Splash was only
 * ever seen faintly under the icon (its entrance had not even started), and both went in the same frame.
 */

/** The system splash's exit: a short cross-fade into the app's Splash (Expo's default is 400 ms). */
export const SYSTEM_SPLASH_EXIT_MS = 200;
/**
 * Past the exit's length, before the Splash counts as uncovered: the native exit starts on the first frame drawn
 * after the hide, which can come a frame or two after the hold's clock starts.
 */
export const SYSTEM_SPLASH_EXIT_MARGIN_MS = 50;
/** One frame at 60 Hz, ms. */
const FRAME_MS = 1000 / 60;
/**
 * Frames the display must draw with the Splash whole and uncovered before it may go: the seen time in 60 Hz
 * frames, at least 2 (one frame where the system splash is surely gone, and the next). A frame count, not only a
 * clock: after a stall the clock has run out in one frame, and both exits with it.
 */
export const SPLASH_SEEN_FRAMES = Math.max(2, Math.round(accountConfig.splashSeenMs / FRAME_MS));
/** The Splash's time alone on screen after the system splash's exit, ms (a setting: accountConfig.splashSeenMs). */
export const SPLASH_SEEN_MS = accountConfig.splashSeenMs;
/**
 * The system splash goes after this long even if no layout ever says so, and the app's Splash is let go this long
 * after the exit started even if no frame ever counts it out (fail-safes: neither may stay over the app).
 */
export const SYSTEM_SPLASH_FAILSAFE_MS = 3000;

export type SystemSplashPhase = 'off' | 'held' | 'exiting' | 'done';

let phase: SystemSplashPhase = 'off';
let exitTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function setPhase(next: SystemSplashPhase): void {
  if (phase === next) return;
  phase = next;
  if (next !== 'exiting' && exitTimer) {
    clearTimeout(exitTimer);
    exitTimer = null;
  }
  listeners.forEach((listener) => listener());
}

/** At the root layout's import: the system splash waits for the app's Splash, and leaves by a short fade. */
export function holdSystemSplash(): void {
  void SplashScreen.preventAutoHideAsync().catch(() => undefined);
  // Expo Go has no options and no handoff (see the top of this file).
  if (isRunningInExpoGo()) return;
  try {
    SplashScreen.setOptions({ duration: SYSTEM_SPLASH_EXIT_MS, fade: true });
  } catch {
    // An older native module without options: its default fade.
  }
  if (phase === 'off') setPhase('held');
}

/**
 * The system splash goes (once per run). `handOver`: the app's Splash is under it and stays through its exit
 * until it has been seen (`useSystemSplashPacer`); a fail-safe hides it without that.
 */
export function hideSystemSplash({ handOver = true }: { handOver?: boolean } = {}): void {
  if (phase === 'exiting' || phase === 'done') return;
  const handing = handOver && phase === 'held';
  void SplashScreen.hideAsync().catch(() => undefined);
  if (!handing) {
    setPhase('done');
    return;
  }
  setPhase('exiting');
  exitTimer = setTimeout(endSystemSplashExit, SYSTEM_SPLASH_FAILSAFE_MS);
}

/**
 * The app's Splash laid out (its first onLayout): one frame later its first frame is mounted and drawable, and the
 * system splash goes. Only while it is held (a handoff); a second layout does nothing.
 */
export function hideSystemSplashAfterLayout(): void {
  if (phase !== 'held') return;
  const raf = (globalThis as { requestAnimationFrame?: (cb: () => void) => unknown }).requestAnimationFrame;
  if (typeof raf === 'function') raf(() => hideSystemSplash());
  else hideSystemSplash();
}

/** The app's Splash has been seen after the system splash's exit: it may go once the sign-in is known. */
export function endSystemSplashExit(): void {
  if (phase === 'exiting') setPhase('done');
}

/**
 * One frame drawn after the system splash was told to go, `elapsedMs` after the first: how many frames so far had
 * the Splash uncovered (the exit and its margin over), and whether it has been seen long enough.
 */
export function systemSplashHoldStep(seen: number, elapsedMs: number): { seen: number; done: boolean } {
  'worklet';
  const uncoveredAt = SYSTEM_SPLASH_EXIT_MS + SYSTEM_SPLASH_EXIT_MARGIN_MS;
  const next = elapsedMs >= uncoveredAt ? seen + 1 : seen;
  return {
    seen: next,
    done: next >= SPLASH_SEEN_FRAMES && elapsedMs >= uncoveredAt + SPLASH_SEEN_MS,
  };
}

/**
 * The hold's clock, on the UI thread, for a component mounted only while the system splash's exit runs (the
 * app's Splash mounts it then: `useSystemSplashExiting`). Counts the frames the display draws from its mount, and
 * lets the Splash go when `systemSplashHoldStep` says it has been seen. Not an animation: nothing moves; it only
 * counts. Nothing is registered with the frame loop for the rest of the run.
 */
export function useSystemSplashPacer(): void {
  const anchor = useSharedValue(-1);
  const seen = useSharedValue(0);
  const done = useSharedValue(false);
  useFrameCallback((info) => {
    'worklet';
    if (done.get()) return;
    if (anchor.get() < 0) anchor.set(info.timestamp);
    const step = systemSplashHoldStep(seen.get(), info.timestamp - anchor.get());
    seen.set(step.seen);
    if (!step.done) return;
    done.set(true);
    scheduleOnRN(endSystemSplashExit);
  });
}

/** True while the system splash's exit runs over the app's Splash, until the Splash has been seen alone. */
export function useSystemSplashExiting(): boolean {
  return useSyncExternalStore(subscribe, systemSplashExiting);
}

/** Whether the system splash's exit runs over the app's Splash now (outside React). */
export function systemSplashExiting(): boolean {
  return phase === 'exiting';
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * True while the app's Splash must cover the app for the system splash: while that one is held over it, and while
 * its exit runs and the Splash has not been seen yet.
 */
export function useSystemSplashCovering(): boolean {
  return useSyncExternalStore(subscribe, systemSplashCovering);
}

/** Whether the app's Splash covers the app for the system splash now (outside React). */
export function systemSplashCovering(): boolean {
  return phase === 'held' || phase === 'exiting';
}

/** Where the handoff is (outside React). */
export function systemSplashPhase(): SystemSplashPhase {
  return phase;
}

/**
 * From the root layout, once the fonts are ready: no handoff (Expo Go), the system splash goes now; else a
 * fail-safe, should no layout ever send it away.
 */
export function useSystemSplashFailSafe(ready: boolean): void {
  useEffect(() => {
    if (!ready) return;
    if (phase === 'off') {
      hideSystemSplash({ handOver: false });
      return;
    }
    const timer = setTimeout(() => hideSystemSplash({ handOver: false }), SYSTEM_SPLASH_FAILSAFE_MS);
    return () => clearTimeout(timer);
  }, [ready]);
}

/** Tests: the next run's system splash (`held` as a build's start, `off` as Expo Go's). */
export function resetSystemSplash(next: 'off' | 'held' = 'off'): void {
  if (exitTimer) clearTimeout(exitTimer);
  exitTimer = null;
  setPhase(next);
}
