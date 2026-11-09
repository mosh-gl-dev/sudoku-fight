import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus, Dimensions, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { type AmbientConfig, ambientConfig } from '../../config/ambient';
import { whenIdle } from '../../services/startup';
import { color } from '../../theme';
import { useReduceMotion } from '../../theme/motion';
import { timing } from '../ui/motion';
import { mixOver } from './ambientModel';

/**
 * The wandering digits behind the whole app (D126, Moshe 31.10.2026: "בכל מקום שבו יש רקע"; motion.md §4.13):
 * rendered once, in the root layout, behind the navigator. The screens are transparent over it (their Stack's
 * contentStyle and their roots paint no bg); their cards and content stay opaque, and the digits show in the gaps.
 *
 * This part is on the start's path (the root layout), so it imports no Skia: the canvas (AmbientCanvas.tsx) is
 * required once the first screen is up (the Splash gone) and the JS thread is idle, and fades in once. The clock
 * stands still while the Splash covers the app or the app is in the background. The field is laid out in the
 * window's coordinates, not this view's box, so a keyboard that opens never moves it.
 * Reduced Motion: one still frame. Screen readers never meet it, and it takes no touch.
 */

type CanvasModule = typeof import('./AmbientCanvas');

let canvasModule: CanvasModule | null = null;

/** The canvas's module, required on first use (Skia with it). */
function loadCanvas(): CanvasModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy on purpose: Skia stays off the start
  canvasModule ??= require('./AmbientCanvas') as CanvasModule;
  return canvasModule;
}

/**
 * The canvas's module: at once if it was loaded before, else required on the first idle moment once `start`
 * (the first screen is up). Once there, it stays.
 */
function useCanvasModule(wanted: boolean, start: boolean): CanvasModule | null {
  const [loaded, setLoaded] = useState(canvasModule);
  useEffect(() => {
    if (!wanted || !start || loaded) return;
    return whenIdle(() => setLoaded(loadCanvas()));
  }, [wanted, start, loaded]);
  return wanted ? loaded : null;
}

/** Whether the app is in the foreground (an unknown state counts as yes). */
function useAppActive(): boolean {
  const [state, setState] = useState<unknown>(() => AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => setState(next));
    return () => sub.remove();
  }, []);
  return state !== 'background' && state !== 'inactive';
}

/**
 * The field's size, dp: the window's width, and the taller of the window and the screen (an edge-to-edge
 * Android app draws under the navigation bar, which the window may leave out). A keyboard changes neither.
 */
function useFieldSize(): { width: number; height: number } {
  const window = useWindowDimensions();
  const [screenHeight, setScreenHeight] = useState(() => Dimensions.get('screen').height);
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ screen }) => setScreenHeight(screen.height));
    return () => sub.remove();
  }, []);
  return { width: Math.round(window.width), height: Math.round(Math.max(window.height, screenHeight)) };
}

export interface AmbientLayerProps {
  /** The Splash covers the app (the sign-in loads): nothing loads or moves under it. */
  covered: boolean;
  cfg?: AmbientConfig;
}

/**
 * The layer itself: absolute, under the navigator (render it before the Stack), never touchable, hidden from
 * screen readers.
 */
export function AmbientLayer({ covered, cfg = ambientConfig }: AmbientLayerProps) {
  const reduce = useReduceMotion();
  const appActive = useAppActive();
  const { width, height } = useFieldSize();
  const canvas = useCanvasModule(cfg.enabled, !covered);
  // Shown once the canvas is there and the Splash gone; then it stays (a Splash that comes back only stops its
  // clock). Set while rendering, React's way to keep what an earlier render saw.
  const [shown, setShown] = useState(false);
  if (!shown && canvas !== null && !covered) setShown(true);

  const opacity = useSharedValue(0);
  useEffect(() => {
    if (shown) opacity.set(withTiming(1, timing(cfg.fadeInMs, 'standard', reduce)));
  }, [shown, opacity, cfg.fadeInMs, reduce]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  if (!cfg.enabled) return null;
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, fade]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="ambient"
    >
      {shown && canvas && width > 0 && height > 0 ? (
        <canvas.AmbientCanvas
          key={`${width}x${height}`}
          width={width}
          height={height}
          ink={mixOver(color.textMuted, color.bg, cfg.ink.level)}
          reduce={reduce}
          paused={covered || !appActive}
          cfg={cfg}
        />
      ) : null}
    </Animated.View>
  );
}
