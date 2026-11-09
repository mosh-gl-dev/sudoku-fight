import {
  Canvas,
  createPicture,
  Picture,
  Skia,
  type SkPath,
  type SkPicture,
} from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { makeMutable, useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';

import { type AmbientConfig, ambientConfig } from '../../config/ambient';
import { color } from '../../theme';
import { type AmbientField, ambientField, GLYPH_UNITS, inView, poseAt } from './ambientModel';
import { DIGIT_PATHS } from './digitPaths.generated';

/**
 * The wandering digits' canvas (D126, Moshe 31.10.2026; motion.md §4.13). It loads after the first screen
 * (AmbientLayer requires it lazily): Skia stays off the start (startupGraph.test.ts, docs/PERF.md).
 *
 * One Skia picture, recorded on the UI thread from one frame clock (the pattern of the interferences' Scramble):
 * no React render per frame, and no React view that moves. That matters: a view animated without end keeps
 * Android's accessibility layer from ever going quiet, and uiautomator (our ADB tools, Google Play's pre-launch
 * crawler) gives up on such a screen (avatars/idleBeat.ts); the canvas redraws its own surface only.
 *
 * The clock is the app's one ambient time base (module state, so a remount goes on where it stood): it runs while
 * the app is in the foreground and the Splash is gone, and the picture follows it at `hz`. Reduced Motion: one
 * still frame of the same field, at the clock's moment. One solid ink and no alpha, so two digits that overlap
 * never add up.
 *
 * Opaque: the picture paints the ground (color.bg) under the digits, so on Android the canvas is a SurfaceView,
 * composed by the system apart from the window, and a new picture never makes Android redraw the screens over it.
 * Measured on a Galaxy A16 (31.10.2026), Home with the window's TextureView at 30 Hz: about 60 frames a second and
 * 85 % of a core, for digits alone. A SurfaceView ignores its parent's opacity, so on Android the digits appear at
 * once rather than fading in (the ground under them is the same colour as before).
 */

/** The glyphs' measures, for the field. */
export const GLYPHS = DIGIT_PATHS.map(({ digit, width, top, descent }) => ({ digit, width, top, descent }));

/** The outlines, digits 1–9 (SVG paths). */
export const DIGIT_OUTLINES = DIGIT_PATHS.map((g) => g.d);

/** The outlines as Skia paths, digits 1–9 (null where one could not be parsed). */
export type DigitPaths = readonly (SkPath | null)[];

/** Parses the outlines into Skia paths. */
export function parseOutlines(outlines: readonly string[]): DigitPaths {
  return outlines.map((d) => Skia.Path.MakeFromSVGString(d));
}

let parsed: DigitPaths | null = null;

/**
 * The nine digit paths, parsed once for the app's life on the JS thread (Skia's objects can be handed to a
 * worklet): the layer is mounted once and lives as long as the app, so the pictures, `hz` a second, only pose and
 * draw them. Nine small paths, never freed.
 */
function digitPaths(): DigitPaths {
  parsed ??= parseOutlines(DIGIT_OUTLINES);
  return parsed;
}

/** A frame further from the last than this (a hitch, a resume) moves the clock by this much only, ms. */
const MAX_STEP_MS = 100;

/** The ambient's clock: the ms it has run, for the whole app (one layer draws it). */
export const ambientClock = makeMutable(0);

export interface AmbientCanvasProps {
  /** The window, dp (the field's coordinates: a keyboard that opens never moves it). */
  width: number;
  height: number;
  /** The solid ink (mixOver(textMuted, bg, level)). */
  ink: string;
  /** The ground the picture paints under the digits (the canvas is opaque); the app's bg by default. */
  ground?: string;
  reduce: boolean;
  /** The app in the background, or the Splash over it: the clock stands still. */
  paused: boolean;
  cfg?: AmbientConfig;
  testID?: string;
}

/**
 * Records the ground and the digits at `t` into one picture, from the nine parsed paths (the digits share them).
 * A worklet: the live canvas calls it on the UI thread.
 */
export function recordAmbient(
  paths: DigitPaths,
  field: AmbientField,
  t: number,
  ink: string,
  ground: string,
): SkPicture {
  'worklet';
  return createPicture(
    (canvas) => {
      canvas.drawColor(Skia.Color(ground));
      const paint = Skia.Paint();
      paint.setAntiAlias(true);
      paint.setColor(Skia.Color(ink));
      for (let i = 0; i < field.digits.length; i++) {
        const d = field.digits[i]!;
        const path = paths[d.digit - 1];
        if (!path) continue;
        const pose = poseAt(field, i, t);
        if (!inView(field, i, pose)) continue;
        const k = d.size / GLYPH_UNITS;
        canvas.save();
        canvas.translate(pose.x, pose.y);
        canvas.rotate(pose.rot, 0, 0);
        canvas.scale(k, k);
        canvas.translate(0, -d.midY);
        canvas.drawPath(path, paint);
        canvas.restore();
      }
      // The picture keeps what it drew: free the paint now, not at the UI runtime's next GC.
      paint.dispose();
    },
    { width: field.width, height: field.height },
  );
}

export function AmbientCanvas(props: AmbientCanvasProps) {
  return props.reduce ? <AmbientStill {...props} /> : <AmbientLive {...props} />;
}

function useField({ width, height, cfg = ambientConfig }: AmbientCanvasProps): AmbientField {
  return useMemo(() => ambientField({ width, height, glyphs: GLYPHS, cfg }), [width, height, cfg]);
}

/** Where the clock stands as this canvas mounts (read once, on the first render: a remount goes on from it). */
function useClockAtMount(): number {
  const [t] = useState(() => ambientClock.get());
  return t;
}

/** Reduced Motion: the field as it stands on the clock, still. No clock at all. */
function AmbientStill(props: AmbientCanvasProps) {
  const { width, height, ink, ground = color.bg, testID = 'ambient-canvas' } = props;
  const field = useField(props);
  const t = useClockAtMount();
  const picture = useMemo(
    () => recordAmbient(digitPaths(), field, t, ink, ground),
    [field, t, ink, ground],
  );
  return (
    <Canvas opaque style={[styles.canvas, { width, height }]} pointerEvents="none" testID={`${testID}-still`}>
      <Picture picture={picture} />
    </Canvas>
  );
}

function AmbientLive(props: AmbientCanvasProps) {
  const { width, height, ink, ground = color.bg, paused, cfg = ambientConfig, testID = 'ambient-canvas' } = props;
  const field = useField(props);
  const start = useClockAtMount();
  /** The clock of the picture on screen. */
  const drawn = useSharedValue(start);
  const lastFrame = useSharedValue(-1);
  const stepMs = 1000 / cfg.hz;

  const frame = useFrameCallback((info) => {
    'worklet';
    const prev = lastFrame.get();
    lastFrame.set(info.timestamp);
    // The first frame after a start or a resume only anchors: the clock goes on where it stood, no jump.
    if (prev < 0) return;
    const t = ambientClock.get() + Math.min(MAX_STEP_MS, Math.max(0, info.timestamp - prev));
    ambientClock.set(t);
    if (t - drawn.get() >= stepMs - 0.5) drawn.set(t);
  }, false);

  useEffect(() => {
    if (paused) {
      frame.setActive(false);
      return;
    }
    lastFrame.set(-1);
    frame.setActive(true);
    return () => frame.setActive(false);
  }, [paused, frame, lastFrame]);

  const paths = digitPaths();
  const picture = useDerivedValue(() => recordAmbient(paths, field, drawn.get(), ink, ground));

  return (
    <Canvas opaque style={[styles.canvas, { width, height }]} pointerEvents="none" testID={testID}>
      <Picture picture={picture} />
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: { position: 'absolute', left: 0, top: 0 },
});
