import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';
import { ReduceMotion, useReducedMotion } from 'react-native-reanimated';

import { useSettings } from '../state/settings';
import { tokens } from './tokens.generated';

/** Motion timings of direction C (docs/design/motion.md, tokens.json "motion"). */
export const motion = tokens.motion;

/**
 * The phone's Reduce Motion as it is now (Android: "Remove animations", or the transition scale at 0; iOS: Reduce
 * Motion), kept in step with the phone while the app runs. Reanimated's useReducedMotion is read once, as the app
 * starts, and never changes (fixcheck APK 18, results-reduced-motion-late-cards-and-count: animations turned off
 * while the app was open left "כמו במכשיר" in full motion until a restart). Null until the first hook seeds it.
 */
let phoneReduces: boolean | null = null;
const phoneListeners = new Set<() => void>();
let watchingPhone = false;

const setPhoneReduces = (value: boolean) => {
  if (phoneReduces === value) return;
  phoneReduces = value;
  phoneListeners.forEach((listener) => listener());
};

/** One subscription for the whole app, from the first screen that asks, for as long as the app runs. */
function watchPhone(): void {
  if (watchingPhone) return;
  watchingPhone = true;
  try {
    AccessibilityInfo.addEventListener('reduceMotionChanged', (value: boolean) => setPhoneReduces(value));
    AccessibilityInfo.isReduceMotionEnabled().then(setPhoneReduces, () => undefined);
  } catch {
    // No accessibility module (a test without it): the value read at start stays.
  }
}

const subscribePhone = (listener: () => void) => {
  watchPhone();
  phoneListeners.add(listener);
  return () => {
    phoneListeners.delete(listener);
  };
};
const phoneNow = () => phoneReduces ?? false;

/**
 * Whether to reduce motion (spec §22, CLAUDE.md): the player's setting wins; "system" follows the phone, also when
 * the phone's setting changes while the app is open. With it, animations shorten or become static, and an
 * interference becomes a static cover for the same 5 s. (Spec §4.1, settings: off by default, even when the phone
 * reduces motion.)
 */
export function useReduceMotion(): boolean {
  const atStart = useReducedMotion();
  phoneReduces ??= atStart;
  const system = useSyncExternalStore(subscribePhone, phoneNow, phoneNow);
  const setting = useSettings((s) => s.reduceMotion);
  return setting === 'on' || (setting === 'system' && system);
}

/** The Reanimated flag for an animation, from the decision above. */
export const reduceMotionFlag = (reduce: boolean): ReduceMotion =>
  reduce ? ReduceMotion.Always : ReduceMotion.Never;
