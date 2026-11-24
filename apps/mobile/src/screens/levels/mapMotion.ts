import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import {
  cancelAnimation,
  Easing,
  type SharedValue,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { REVEAL } from '../../components/levels/StarRow';
import { curve } from '../../components/ui/motion';
import { MAP_MOTION } from '../../config/levels';
import { reduceMotionFlag } from '../../theme/motion';
import type { ProgressStep } from './mapModel';

/**
 * The level map's timings (motion.md §4.11; config/levels.ts MAP_MOTION): the current stage's beacon, in beats,
 * and the short sequence back from a stage (the stars, the pour, the hop). Pure where it can be, so the tests read
 * the timeline without a clock.
 */

// ---------------------------------------------------------------------------------------------------------
// The beacon: `level.node.current`, in beats

/** One beat: a burst of pulses, then the rest. */
export const BEACON_BURST_MS = MAP_MOTION.beaconBeats * MAP_MOTION.beaconBeatMs;
export const BEACON_PERIOD_MS = BEACON_BURST_MS + MAP_MOTION.beaconRestMs;

/**
 * The beacon band's opacity `ms` after it woke (pure): nothing for the wake delay, then a burst of pulses (each 0
 * → 1 → 0, half out and half back), then still for the rest, and again. Between two bursts nothing moves for at
 * least 2.4 s (avatars/idleBeat.ts: a moving view keeps Android's accessibility layer from going quiet).
 */
export function beaconOpacity(ms: number): number {
  const t = ms - MAP_MOTION.beaconWakeMs;
  if (t < 0) return 0;
  const inPeriod = t % BEACON_PERIOD_MS;
  if (inPeriod >= BEACON_BURST_MS) return 0;
  const half = MAP_MOTION.beaconBeatMs / 2;
  const inBeat = inPeriod % MAP_MOTION.beaconBeatMs;
  return inBeat < half ? inBeat / half : 1 - (inBeat - half) / half;
}

/** Whether the app is in front (the beacon rests while it is not). */
export function useAppActive(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const sub = AppState.addEventListener('change', onChange);
      return () => sub.remove();
    },
    () => AppState.currentState !== 'background' && AppState.currentState !== 'inactive',
    () => true,
  );
}

const NEVER = reduceMotionFlag(false);

/**
 * The beacon band's opacity, on the UI thread, while `active` (the map shown, the app in front, no Reduced
 * Motion): a timer starts each burst (a short sequence of tweens), and nothing runs during the rest.
 */
export function useBeacon(active: boolean): SharedValue<number> {
  const band = useSharedValue(0);
  useEffect(() => {
    if (!active) {
      cancelAnimation(band);
      band.set(0);
      return;
    }
    const half = MAP_MOTION.beaconBeatMs / 2;
    const step = (to: number) =>
      withTiming(to, { duration: half, easing: curve('loop'), reduceMotion: NEVER });
    let timer: ReturnType<typeof setTimeout>;
    const burst = () => {
      const pulses = Array.from({ length: MAP_MOTION.beaconBeats }, () => [step(1), step(0)]).flat();
      band.set(withSequence(NEVER, ...pulses));
      timer = setTimeout(burst, BEACON_PERIOD_MS);
    };
    timer = setTimeout(burst, beaconWakeDelay());
    return () => {
      clearTimeout(timer);
      cancelAnimation(band);
      band.set(0);
    };
  }, [active, band]);
  return band;
}

// ---------------------------------------------------------------------------------------------------------
// Back from a stage: `level.map.stars`, `level.map.pour`, `level.map.token.hop`

export interface StepTimeline {
  /** When the new stars start popping (ms from the start), and when the last one is in. */
  starsAt: number | null;
  starsEnd: number | null;
  /** The pour, segment by segment (a gate's two segments share it by length). */
  pour: { seg: number; delayMs: number; durationMs: number }[];
  /** When my token hops (or, across a chapter, lands) on the new stage. */
  hopAt: number | null;
  /** When it is all over. */
  doneAt: number;
}

/** The sequence's timeline (pure): the stars, then the pour, then the hop; each one only if it happened. */
export function stepTimeline(
  step: ProgressStep,
  segments: readonly { seg: number; length: number }[],
): StepTimeline {
  let at: number = MAP_MOTION.stepGapMs;
  let starsAt: number | null = null;
  let starsEnd: number | null = null;
  if (step.stars) {
    const count = Math.max(1, step.stars.to - step.stars.from);
    starsAt = at;
    starsEnd = at + REVEAL.popMs + (count - 1) * REVEAL.staggerMs;
    at = starsEnd;
  }
  const pour: StepTimeline['pour'] = [];
  let hopAt: number | null = null;
  if (step.advance && segments.length > 0) {
    const total = segments.reduce((sum, s) => sum + s.length, 0) || 1;
    let delay = at;
    for (const s of segments) {
      const durationMs = Math.round((MAP_MOTION.pourMs * s.length) / total);
      pour.push({ seg: s.seg, delayMs: delay, durationMs });
      delay += durationMs;
    }
    hopAt = at + MAP_MOTION.pourMs;
    at = hopAt + MAP_MOTION.hopMs + MAP_MOTION.landSquashMs;
  }
  return { starsAt, starsEnd, pour, hopAt, doneAt: at };
}

// ---------------------------------------------------------------------------------------------------------
// The drift: the coins, the big zones and the sudoku box float (Moshe 25.11.2026: "החלונות של השלבים ... לנוע
// בעדינות מעט במקומם כאילו מרחפים", "העיגולים הגדולים שירחפו וינועו וישנו גודל", the sudoku box "שירחף בחלל")

/**
 * The map's one clock for everything that floats, in beats like the beacon (no view animates without end:
 * avatars/idleBeat.ts): every `BEACON_PERIOD_MS` the clock moves on by one whole beat in `moveMs` (eased in and out,
 * so each piece glides and settles), then everything rests for `restMs` (2.4 s, the quiet uiautomator and
 * Android's accessibility layer need). It starts with the beacon (`beaconWakeMs`), so the beacon's burst falls in
 * the drift's move and both rest together. Each piece reads its own pose off the clock (pure, below): its own
 * periods and phases, from its index, so no two move in step. None of it under Reduced Motion.
 */
export const DRIFT = {
  restMs: 2400,
  moveMs: BEACON_PERIOD_MS - 2400,
  /** A coin: a bob of ±3 dp, a tilt of ±6° about each axis seen through a 600 dp perspective, a turn of ±1.2°. */
  node: { lift: 3, tilt: 6, spin: 1.2, perspective: 600 },
  /** A coin's shadow on the ground, under it: it shrinks and pales as the coin rises. */
  shadow: { scalePerDp: 0.03, opacityPerDp: 0.06 },
  /** A big zone: a wander of ±10 × ±12 dp, a breath of ±6 % in size, a turn of ±2°. */
  zone: { dx: 10, dy: 12, breathe: 0.06, spin: 2 },
  /** The sudoku box: a wander of ±8 × ±10 dp, a turn of ±4°, a tilt of ±12° in space (500 dp perspective). */
  grid: { dx: 8, dy: 10, spin: 4, tilt: 12, perspective: 500 },
  /** A piece's periods, in beats (a beat swings it about half way): between these. */
  periodMin: 1.8,
  periodSpan: 1.6,
} as const;

/** A piece's own rhythm: a period (in beats) and a phase (0–1) for each of its four motions. */
export interface DriftSpec {
  periods: readonly [number, number, number, number];
  phases: readonly [number, number, number, number];
}

const frac = (x: number) => x - Math.floor(x);
/** Irrational steps (the golden ratio, √2, √3, √5): neighbouring indices land far apart, and never repeat. */
const STEPS = [0.6180339887, 0.4142135624, 0.7320508076, 0.2360679775] as const;

/** The rhythm of the piece at `index` (pure, no random: the same index always floats the same way). */
export function driftSpec(index: number): DriftSpec {
  const i = Math.abs(Math.round(index)) + 1;
  const at = (k: number, salt: number) => frac(i * STEPS[k]! + salt);
  const period = (k: number) => DRIFT.periodMin + DRIFT.periodSpan * at(k, 0.5);
  return {
    periods: [period(0), period(1), period(2), period(3)],
    phases: [at(1, 0.25), at(2, 0.125), at(3, 0.375), at(0, 0.0625)],
  };
}

/** One motion of a piece, −1…1, at `beat` on the drift's clock. */
export function wave(spec: DriftSpec, k: 0 | 1 | 2 | 3, beat: number): number {
  'worklet';
  return Math.sin(2 * Math.PI * (beat / spec.periods[k] + spec.phases[k]));
}

/** A coin's pose: its lift (dp, up is negative), its tilts and its turn (degrees). */
export function nodePose(spec: DriftSpec, beat: number) {
  'worklet';
  const N = DRIFT.node;
  return {
    lift: N.lift * wave(spec, 0, beat),
    tiltX: N.tilt * wave(spec, 1, beat),
    tiltY: N.tilt * wave(spec, 2, beat),
    spin: N.spin * wave(spec, 3, beat),
  };
}

/** The shadow under a coin `lift` dp off its rest (negative: higher): smaller and paler as it rises. */
export function shadowPose(lift: number) {
  'worklet';
  return {
    scale: 1 + lift * DRIFT.shadow.scalePerDp,
    opacity: Math.min(1, Math.max(0, 1 + lift * DRIFT.shadow.opacityPerDp)),
  };
}

/** A big zone's pose: where it wandered (dp), its size (a scale) and its turn (degrees, over its own). */
export function zonePose(spec: DriftSpec, beat: number) {
  'worklet';
  const Z = DRIFT.zone;
  return {
    dx: Z.dx * wave(spec, 0, beat),
    dy: Z.dy * wave(spec, 1, beat),
    scale: 1 + Z.breathe * wave(spec, 2, beat),
    spin: Z.spin * wave(spec, 3, beat),
  };
}

/** The sudoku box's pose: where it wandered (dp), its turn and its tilts in space (degrees). */
export function gridPose(spec: DriftSpec, beat: number) {
  'worklet';
  const G = DRIFT.grid;
  return {
    dx: G.dx * wave(spec, 0, beat),
    dy: G.dy * wave(spec, 1, beat),
    spin: G.spin * wave(spec, 2, beat),
    tiltX: G.tilt * wave(spec, 3, beat),
    tiltY: G.tilt * wave(spec, 1, beat + 0.5),
  };
}

/**
 * How long until the drift's next beat starts, `now` ms on a clock that woke at `epoch` (pure): a beacon that
 * mounts later (its chapter scrolled back in) waits for it, so the two keep resting together.
 */
export function msUntilBeat(now: number, epoch: number): number {
  const t = now - epoch - MAP_MOTION.beaconWakeMs;
  if (t <= 0) return Math.abs(t);
  return (BEACON_PERIOD_MS - (t % BEACON_PERIOD_MS)) % BEACON_PERIOD_MS;
}

/** When the map's drift clock woke (performance.now()), while it runs; null otherwise. */
let driftEpoch: number | null = null;
const nowMs = (): number => globalThis.performance?.now?.() ?? 0;

/** The first beacon burst's delay: the drift's next beat when the drift runs, else the beacon's own wake. */
export function beaconWakeDelay(): number {
  return driftEpoch === null ? MAP_MOTION.beaconWakeMs : msUntilBeat(nowMs(), driftEpoch);
}

/**
 * The drift's clock, on the UI thread: a whole number at rest, gliding to the next one in each beat, while
 * `running` (the map shown, the app in front; the caller never asks under Reduced Motion). Stopped, it holds
 * where it is, so nothing jumps.
 */
export function useDriftClock(running: boolean): SharedValue<number> {
  const beat = useSharedValue(0);
  useEffect(() => {
    if (!running) return;
    driftEpoch = nowMs();
    let timer: ReturnType<typeof setTimeout>;
    const move = () => {
      beat.set(
        withTiming(Math.floor(beat.get()) + 1, {
          duration: DRIFT.moveMs,
          easing: Easing.inOut(Easing.sin),
          reduceMotion: NEVER,
        }),
      );
      timer = setTimeout(move, BEACON_PERIOD_MS);
    };
    timer = setTimeout(move, MAP_MOTION.beaconWakeMs);
    return () => {
      clearTimeout(timer);
      cancelAnimation(beat);
      driftEpoch = null;
    };
  }, [running, beat]);
  return beat;
}
