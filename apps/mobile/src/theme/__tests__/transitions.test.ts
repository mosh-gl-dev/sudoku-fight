import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { motion } from '../motion';
import {
  ANDROID_FADE_MS,
  flowFadeMs,
  NAVIGATION_THEME,
  SCREEN_CONTENT_STYLE,
  transitions,
} from '../transitions';

/**
 * motion.md §4.9 with D126 (Moshe 31.10.2026): every screen is transparent over the wandering digits, so two
 * screens passing in a native slide would show through each other; every change cross-fades instead, and the digits
 * move on under it. Reduced Motion: shorter fades, the tabs at once.
 */

describe('screen transitions (motion.md §4.9)', () => {
  it('menus cross-fade, like a game’s flow: 240 ms, never a slide', () => {
    const moves = transitions(false);
    expect(moves.menu).toEqual({ animation: 'fade', animationDuration: motion.duration.stateChange });
    expect(moves.flow).toEqual({ animation: 'fade', animationDuration: motion.duration.stateChange });
    expect(motion.duration.stateChange).toBe(240);
  });

  it('the tabs cross-fade in 140 ms', () => {
    expect(transitions(false).tab).toEqual({
      animation: 'fade',
      animationDuration: motion.duration.tapFeedbackMax,
    });
    expect(motion.duration.tapFeedbackMax).toBe(140);
  });

  it('Reduced Motion: 200 ms fades, and the tabs switch at once', () => {
    const fade = { animation: 'fade', animationDuration: motion.duration.reducedFade };
    expect(transitions(true)).toEqual({ menu: fade, flow: fade, tab: { animation: 'none' } });
    expect(motion.duration.reducedFade).toBe(200);
  });

  it('no transition slides, with motion or without (transparent screens would show through each other)', () => {
    for (const reduce of [false, true])
      for (const move of Object.values(transitions(reduce)))
        expect(String(move.animation)).not.toMatch(/slide|default/);
  });

  it('the root layout uses them, over transparent screens', () => {
    expect(SCREEN_CONTENT_STYLE).toEqual({ backgroundColor: 'transparent' });
    const layout = readFileSync(join(__dirname, '..', '..', '..', 'app', '_layout.tsx'), 'utf8');
    expect(layout).toMatch(/const moves = transitions\(reduceMotion\);/);
    expect(layout).toMatch(
      /screenOptions=\{\{ headerShown: false, contentStyle: SCREEN_CONTENT_STYLE, \.\.\.moves\.menu \}\}/,
    );
    for (const route of ['game', 'results/[id]', 'levels/play'])
      expect(layout).toContain(`<Stack.Screen name="${route}" options={`);
    for (const route of ['leaderboard', 'history', 'achievements'])
      expect(layout).toContain(`<Stack.Screen name="${route}" options={moves.tab} />`);
  });

  it('a flow’s fade really runs 240 ms (reduced motion 200) on iOS, and react-native-screens’ own 150 ms on Android', () => {
    expect(flowFadeMs(false, 'ios')).toBe(motion.duration.stateChange);
    expect(flowFadeMs(true, 'ios')).toBe(motion.duration.reducedFade);
    expect(flowFadeMs(false, 'android')).toBe(ANDROID_FADE_MS);
    expect(flowFadeMs(true, 'android')).toBe(ANDROID_FADE_MS);
    // The library's Android fade, in and out, is a fixed tween of that length; its duration prop is iOS only.
    const screens = dirname(require.resolve('react-native-screens/package.json'));
    for (const file of ['rns_fade_in.xml', 'rns_fade_out.xml']) {
      const xml = readFileSync(join(screens, 'android', 'src', 'main', 'res', 'base', 'anim', file), 'utf8');
      expect(xml).toContain(`android:duration="${ANDROID_FADE_MS}"`);
    }
    const manager = readFileSync(
      join(
        screens,
        'android',
        'src',
        'main',
        'java',
        'com',
        'swmansion',
        'rnscreens',
        'ScreenViewManager.kt',
      ),
      'utf8',
    );
    expect(manager).toMatch(
      /override fun setTransitionDuration\(\s*view: Screen\?,\s*value: Int,\s*\) = Unit/,
    );
  });

  it("the navigator's theme is dark with a transparent background (iOS paints it under every screen)", () => {
    expect(NAVIGATION_THEME.dark).toBe(true);
    expect(NAVIGATION_THEME.colors.background).toBe('transparent');
    const layout = readFileSync(join(__dirname, '..', '..', '..', 'app', '_layout.tsx'), 'utf8');
    const theme = layout.indexOf('<ThemeProvider value={NAVIGATION_THEME}>');
    expect(theme).toBeGreaterThan(0);
    expect(layout.indexOf('<Stack ')).toBeGreaterThan(theme);
    expect(layout.indexOf('</ThemeProvider>')).toBeGreaterThan(layout.indexOf('</Stack>'));
  });
});
