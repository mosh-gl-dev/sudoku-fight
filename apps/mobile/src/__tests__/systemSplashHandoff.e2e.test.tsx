// First: expo-router's testing library swaps Reanimated for its old mock (no useReducedMotion), unless the real
// module is already in place as the mock (see the jest.mock below).
import 'react-native-reanimated';
import { renderRouter, screen, waitFor } from 'expo-router/testing-library';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet } from 'react-native';

import RootLayout from '../../app/_layout';
import Index from '../../app/index';
import { setAuthDeps, useAuth } from '../auth/authStore';
import { installSignedInPlayer } from '../auth/testing/testAuth';
import { memoryDb, type SqlJsDb } from '../game/testing/sqlJsDb';
import i18n from '../i18n';
import {
  endSystemSplashExit,
  hideSystemSplash,
  hideSystemSplashAfterLayout,
  resetSystemSplash,
  SPLASH_SEEN_FRAMES,
  SPLASH_SEEN_MS,
  SYSTEM_SPLASH_EXIT_MARGIN_MS,
  SYSTEM_SPLASH_EXIT_MS,
  SYSTEM_SPLASH_FAILSAFE_MS,
  systemSplashCovering,
  systemSplashHoldStep,
  systemSplashPhase,
} from '../services/systemSplash';
import { useSettings } from '../state/settings';

/**
 * QA account-open-splash-look (run #2): on a cold start the system splash (the icon on dark) covered the app's own
 * Splash and both went in the same frame, because the root layout hid the system splash at "ready" (the fonts),
 * not once the app's Splash was drawn. The order now:
 * - the app's Splash is up under the system splash from the first full render, even when the sign-in is already
 *   known (never Home first);
 * - the system splash goes a frame after the Splash's first layout, by a short cross-fade;
 * - the Splash under it is whole from its first frame (no entrance of its own under the cross-fade);
 * - it stays until the display has drawn it alone for SPLASH_SEEN_FRAMES frames and SPLASH_SEEN_MS (a frame count,
 *   so a stall can't run both exits out in one frame), then fades to Home.
 */

const mockApp: { db: SqlJsDb | null } = { db: null };

jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated'));
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: async () => mockApp.db }));
jest.mock('../services/analytics', () => ({ track: jest.fn() }));
// A development build, as on the phones (Jest otherwise runs as Expo Go, which has no handoff).
jest.mock('expo', () => ({ ...jest.requireActual('expo'), isRunningInExpoGo: () => false }));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(async () => true),
  hideAsync: jest.fn(async () => undefined),
  hide: jest.fn(),
  setOptions: jest.fn(),
}));
type NativeMocks = typeof import('../screens/home/testing/nativeMocks');
jest.mock(
  'expo-audio',
  () => jest.requireActual<NativeMocks>('../screens/home/testing/nativeMocks').expoAudio,
);
jest.mock(
  'expo-haptics',
  () => jest.requireActual<NativeMocks>('../screens/home/testing/nativeMocks').expoHaptics,
);

jest.setTimeout(60_000);

const ROUTES = { _layout: RootLayout, index: Index };
const hideAsync = SplashScreen.hideAsync as jest.Mock;
const LAYOUT = { nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 860 } } };
const UNCOVERED_AT = SYSTEM_SPLASH_EXIT_MS + SYSTEM_SPLASH_EXIT_MARGIN_MS;
// renderRouter runs on Jest's fake timers (Date.now too): waitFor moves them on.

// What the root layout's import did (before any test resets it).
const heldAtImport = {
  prevented: (SplashScreen.preventAutoHideAsync as jest.Mock).mock.calls.length,
  options: (SplashScreen.setOptions as jest.Mock).mock.calls.slice(),
  phase: systemSplashPhase(),
};

/**
 * The Splash lays out (its onLayout, called as the native side would: RNTL's fireEvent of a layout on Reanimated's
 * view left the overlay's later updates unflushed in this harness).
 */
function layout(): void {
  (screen.getByTestId('splash-overlay').props as { onLayout: (e: typeof LAYOUT) => void }).onLayout(LAYOUT);
}

/**
 * The Splash's first layout: nothing yet (the frame after it is still to come), then, a frame later, the system
 * splash is told to go.
 */
async function layOutSplash(): Promise<void> {
  layout();
  expect(hideAsync).not.toHaveBeenCalled();
  await waitFor(() => expect(hideAsync).toHaveBeenCalledTimes(1));
}

beforeAll(async () => {
  mockApp.db = await memoryDb();
});

afterEach(() => {
  setAuthDeps(null);
  resetSystemSplash();
});

describe('the system splash hands over to the app Splash (QA account-open-splash-look)', () => {
  beforeEach(async () => {
    // A build's cold start: the system splash is held (as the root layout's import left it).
    resetSystemSplash('held');
    hideAsync.mockClear();
    await i18n.changeLanguage('he');
    useSettings.setState({ language: 'he', languageSource: 'app', reduceMotion: 'off' });
  });

  it('is held at import with a short fade', () => {
    expect(heldAtImport.prevented).toBeGreaterThan(0);
    expect(heldAtImport.options).toContainEqual([{ duration: SYSTEM_SPLASH_EXIT_MS, fade: true }]);
    expect(heldAtImport.phase).toBe('held');
  });

  it('a slow sign-in: the Splash stays after the handoff until the sign-in is known', async () => {
    // Reduced Motion here: Reanimated's frame loop is one per module, and an ambient canvas left drawing by an
    // earlier test (full motion) ties it to that test's fake clock. This test runs first.
    useSettings.setState({ reduceMotion: 'on' });
    const auth = await installSignedInPlayer();
    const restore = auth.provider.restore.bind(auth.provider);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    auth.provider.restore = () => gate.then(restore);

    await renderRouter(ROUTES, { initialUrl: '/' });
    await waitFor(() => expect(screen.getByTestId('splash-tip')).toBeOnTheScreen());
    expect(hideAsync).not.toHaveBeenCalled();
    await layOutSplash();
    expect(hideAsync).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('splash-brand')).toBeOnTheScreen();
    expect(screen.getByTestId('splash-loading')).toBeOnTheScreen();

    // The handoff is over; the sign-in still loads, so the Splash stays.
    await waitFor(() => expect(systemSplashPhase()).toBe('done'));
    expect(screen.getByTestId('splash-overlay').props.pointerEvents).toBe('auto');

    // The sign-in arrives: Home.
    release();
    await waitFor(() => expect(screen.getByTestId('home-scroll')).toBeOnTheScreen());
    await waitFor(() => expect(screen.queryByTestId('splash')).toBeNull());
    screen.unmount();
  });

  it('a sign-in known at once: the Splash, whole, is what the system splash uncovers, and it is seen before Home', async () => {
    await installSignedInPlayer();
    await renderRouter(ROUTES, { initialUrl: '/' });
    // The sign-in is known and Home is mounted under it, but the app's Splash covers it: the system splash will
    // uncover the Splash, never Home (before: Home first, then the Splash over it, or the system splash went at
    // "ready" over Home).
    await waitFor(() => expect(useAuth.getState().status).toBe('ready'));
    await waitFor(() => expect(screen.getByTestId('splash-tip')).toBeOnTheScreen());
    expect(screen.getByTestId('splash-overlay').props.pointerEvents).toBe('auto');
    expect(screen.queryByTestId('home-scroll')).toBeNull();
    // Not hidden at "ready": nothing has said the Splash is laid out.
    expect(hideAsync).not.toHaveBeenCalled();

    // Whole from its first frame, with full motion: no entrance under the system splash's cross-fade.
    for (const id of [
      'splash-brand-seat-0',
      'splash-brand-seat-3',
      'splash-brand-wordmark',
      'splash-tagline',
    ]) {
      expect({ id, opacity: StyleSheet.flatten(screen.getByTestId(id).props.style)?.opacity }).not.toEqual({
        id,
        opacity: 0,
      });
    }

    await layOutSplash();
    const hiddenAt = Date.now();
    expect(systemSplashPhase()).toBe('exiting');
    // Still the Splash, through the exit and after it, until the display has drawn it alone long enough.
    expect(screen.getByTestId('splash-overlay').props.pointerEvents).toBe('auto');
    expect(screen.queryByTestId('home-scroll')).toBeNull();
    layout();

    // The frames end it (not the fail-safe): then the Splash fades to Home.
    await waitFor(() => expect(systemSplashPhase()).toBe('done'));
    const heldFor = Date.now() - hiddenAt;
    expect(heldFor).toBeGreaterThanOrEqual(UNCOVERED_AT + SPLASH_SEEN_MS);
    expect(heldFor).toBeLessThan(SYSTEM_SPLASH_FAILSAFE_MS);
    await waitFor(() => expect(screen.getByTestId('home-scroll')).toBeOnTheScreen());
    await waitFor(() => expect(screen.queryByTestId('splash')).toBeNull());
    // Once, whatever layouts followed.
    expect(hideAsync).toHaveBeenCalledTimes(1);
    screen.unmount();
  });
});

describe('services/systemSplash', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    hideAsync.mockClear();
  });
  afterEach(() => jest.useRealTimers());

  it('counts the Splash seen only in frames past the exit, and never by the clock alone (a stall)', () => {
    // Frames during the exit don't count.
    let state = { seen: 0, done: false };
    for (let t = 0; t < UNCOVERED_AT; t += 16) {
      state = systemSplashHoldStep(state.seen, t);
      expect(state).toEqual({ seen: 0, done: false });
    }
    // A stall: the first frame after it is 2 s on, both exits' clocks have run out, but the Splash has been
    // drawn alone in one frame only.
    state = systemSplashHoldStep(0, 2000);
    expect(state).toEqual({ seen: 1, done: false });
    for (let i = 2; i < SPLASH_SEEN_FRAMES; i += 1) {
      state = systemSplashHoldStep(state.seen, 2000 + i * 16);
      expect(state.done).toBe(false);
    }
    expect(systemSplashHoldStep(state.seen, 2000 + SPLASH_SEEN_FRAMES * 16).done).toBe(true);
    // Enough frames (a 120 Hz display) but not yet the time: not yet.
    expect(systemSplashHoldStep(SPLASH_SEEN_FRAMES + 5, UNCOVERED_AT + SPLASH_SEEN_MS - 1).done).toBe(false);
    expect(systemSplashHoldStep(SPLASH_SEEN_FRAMES + 5, UNCOVERED_AT + SPLASH_SEEN_MS).done).toBe(true);
    expect(SPLASH_SEEN_FRAMES).toBeGreaterThanOrEqual(2);
  });

  it('hides once, a frame after the layout, and covers until the Splash is seen (or the fail-safe)', () => {
    resetSystemSplash('held');
    expect(systemSplashCovering()).toBe(true);
    hideSystemSplashAfterLayout();
    expect(hideAsync).not.toHaveBeenCalled();
    jest.advanceTimersByTime(20);
    expect(hideAsync).toHaveBeenCalledTimes(1);
    hideSystemSplashAfterLayout();
    hideSystemSplash();
    jest.advanceTimersByTime(20);
    expect(hideAsync).toHaveBeenCalledTimes(1);
    // No wall-clock end: still covering long after the exit, until the frames say so.
    jest.advanceTimersByTime(UNCOVERED_AT + SPLASH_SEEN_MS + 500);
    expect(systemSplashCovering()).toBe(true);
    endSystemSplashExit();
    expect(systemSplashCovering()).toBe(false);

    // Should no frame ever count it out, the fail-safe lets it go.
    resetSystemSplash('held');
    hideSystemSplash();
    jest.advanceTimersByTime(SYSTEM_SPLASH_FAILSAFE_MS);
    expect(systemSplashPhase()).toBe('done');
  });

  it('the fail-safe hides without the handoff; Expo Go has none', () => {
    resetSystemSplash('held');
    hideSystemSplash({ handOver: false });
    expect(hideAsync).toHaveBeenCalledTimes(1);
    expect(systemSplashPhase()).toBe('done');

    resetSystemSplash('off');
    expect(systemSplashCovering()).toBe(false);
    hideSystemSplashAfterLayout();
    jest.advanceTimersByTime(20);
    expect(hideAsync).toHaveBeenCalledTimes(1);
  });
});
