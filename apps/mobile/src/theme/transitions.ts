import { DarkTheme, type NativeStackNavigationOptions, type Theme } from 'expo-router';
import { Platform } from 'react-native';

import { motion } from './motion';

export type Transition = Pick<NativeStackNavigationOptions, 'animation' | 'animationDuration'>;

/** The screens' transparent background (D126): the wandering digits under the navigator show through. */
export const SCREEN_CONTENT_STYLE = { backgroundColor: 'transparent' } as const;

/**
 * The navigator's theme (D126): dark, with a transparent background. On iOS the native stack paints the theme's
 * background on its container (`nativeContainerStyle`), above the wandering digits and under every screen; with
 * no theme it would be the default light grey (rgb(242, 242, 242)) behind every transparent screen. Android ignores
 * that colour, so only an iPhone would show it.
 */
export const NAVIGATION_THEME: Theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: 'transparent' },
};

/**
 * motion.md §4.9: how one screen gives way to the next. Every screen is transparent over the wandering digits
 * (D126, Moshe 31.10.2026), so two screens in a native slide would show through each other as they pass; every
 * change is a cross-fade instead, and the digits move on under it, uninterrupted. Menus (`stack.push`) and a
 * game's flow, game → results (`flow.fade`): a 240 ms cross-fade. The bottom navigation's tabs (`tabs`): a
 * 140 ms cross-fade. Reduced Motion: 200 ms fades, and the tabs switch at once. (The durations are iOS's;
 * Android fades at its own pace.)
 *
 * Open for the iOS device check: Android fades both screens, but iOS's native 'fade' only brings the new screen in
 * over the old one, which stays fully drawn until the end (and on a pop, fades the old one out over the next, which
 * is drawn at once). Over transparent screens, both screens' content still overlaps there for the 240 ms of every
 * change. The fix, when an iPhone can show it: fade the outgoing screen's content out in the app (a screen layout
 * that fades on blur), or no native animation on iOS and an in-screen fade-in.
 */
export function transitions(reduce: boolean): Record<'menu' | 'flow' | 'tab', Transition> {
  const d = motion.duration;
  if (reduce) {
    const fade: Transition = { animation: 'fade', animationDuration: d.reducedFade };
    return { menu: fade, flow: fade, tab: { animation: 'none' } };
  }
  const fade: Transition = { animation: 'fade', animationDuration: d.stateChange };
  return {
    menu: fade,
    flow: fade,
    tab: { animation: 'fade', animationDuration: d.tapFeedbackMax },
  };
}

/**
 * How long react-native-screens' 'fade' runs on Android, ms: its own tween (android/src/main/res/base/anim/
 * rns_fade_in.xml and rns_fade_out.xml, `android:duration="150"`), whatever `animationDuration` says. That prop is
 * the native `transitionDuration`, iOS only: Android's ScreenViewManager ignores it.
 */
export const ANDROID_FADE_MS = 150;

/**
 * How long the fade into a screen of a game's flow (`flow.fade`: the game, the results) really runs on this
 * platform: iOS takes the transition's `animationDuration` (240 ms; reduced motion 200), Android fades in its
 * fixed ANDROID_FADE_MS either way.
 */
export function flowFadeMs(reduce: boolean, os: typeof Platform.OS = Platform.OS): number {
  if (os === 'android') return ANDROID_FADE_MS;
  return transitions(reduce).flow.animationDuration ?? 0;
}
