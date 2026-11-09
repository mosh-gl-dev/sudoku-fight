import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import {
  cancelAnimation,
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
    timer = setTimeout(burst, MAP_MOTION.beaconWakeMs);
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
