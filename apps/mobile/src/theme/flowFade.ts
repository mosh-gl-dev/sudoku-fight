import { Platform } from 'react-native';

import { motion } from './motion';

/**
 * How long react-native-screens' 'fade' runs on Android, ms: its own tween (android/src/main/res/base/anim/
 * rns_fade_in.xml and rns_fade_out.xml, `android:duration="150"`), whatever `animationDuration` says. That prop is
 * the native `transitionDuration`, iOS only: Android's ScreenViewManager ignores it.
 *
 * Kept apart from transitions.ts (which re-exports it) so a screen can read it without loading the navigator's
 * theme (expo-router) into every one of its tests.
 */
export const ANDROID_FADE_MS = 150;

/**
 * How long the fade into a screen of a game's flow (`flow.fade`: the game, the results) really runs on this
 * platform: iOS takes the transition's `animationDuration` (transitions.ts: 240 ms; reduced motion 200), Android
 * fades in its fixed ANDROID_FADE_MS either way.
 */
export function flowFadeMs(reduce: boolean, os: typeof Platform.OS = Platform.OS): number {
  if (os === 'android') return ANDROID_FADE_MS;
  return reduce ? motion.duration.reducedFade : motion.duration.stateChange;
}
