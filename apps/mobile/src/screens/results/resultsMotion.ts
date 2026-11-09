import { useEffect, useState } from 'react';
import { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';

import { timing } from '../../components/ui/motion';
import { space } from '../../theme';
import { motion, reduceMotionFlag } from '../../theme/motion';

/**
 * The results' entrance (motion.md §4.7). A win lands: the title slams, the place badge and the crown pop, the
 * confetti falls, the score counts up, the podium grows, the awards pop one by one. Anything else enters
 * calmly: the title drops 12 dp and fades in, the rest rises and fades. Reduced motion: every part is in its
 * final state, faded in over 200 ms together; no scale, no count, no confetti (the caller mounts none).
 *
 * Each hook picks its reduced variant itself and passes ReduceMotion.Never (motion.md §6), so the 200 ms fade
 * still plays.
 */

const NEVER = reduceMotionFlag(false);
export const victory = motion.sequence.victory;

/** `results.title.win` and `vs.slam`: the word lands from 1.4. */
export const SLAM_FROM = 1.4;
/** `results.rank` and the awards: a badge pops from 0.6. */
export const POP_FROM = 0.6;
/** `results.title.loss`: the word drops 12 dp. */
export const TITLE_DROP = space[6];
/** `results.sections`: a part rises 14 dp. */
export const SECTION_RISE = space[7];
/** `podium`: each column grows over 500 ms, 100 ms after the one beside it. */
export const PODIUM_GROW_MS = 500;
export const PODIUM_STAGGER_MS = 100;

/** How a part of the results comes in. */
export type Entrance = 'slam' | 'pop' | 'drop' | 'rise' | 'fade';

const SCALE_FROM: Readonly<Record<Entrance, number>> = {
  slam: SLAM_FROM,
  pop: POP_FROM,
  drop: 1,
  rise: 1,
  fade: 1,
};
const Y_FROM: Readonly<Record<Entrance, number>> = {
  slam: 0,
  pop: 0,
  drop: -TITLE_DROP,
  rise: SECTION_RISE,
  fade: 0,
};

/**
 * A part of the results coming in at `delayMs`, fading in as it moves: `slam` (1.4 → 1 on the `slam` spring),
 * `pop` (0.6 → 1 on `pop`), `drop` (12 dp down, no overshoot, 420 ms), `rise` (14 dp up, 420 ms) or `fade`
 * (still). Reduced motion: a 200 ms fade at once, nothing moves.
 *
 * `seen`: the part is in view from the screen's first frame, the stack's own fade bringing it in (the hero of a
 * game that just ended, its results handed over: resultsHandoff.ts; QA fixcheck of APK 13, a fade from 0 here
 * left the screen empty after the board had gone). Fully opaque from the start; its move (slam, drop, rise)
 * starts at once, under that fade. Reduced motion: simply there.
 */
export function useEntrance(kind: Entrance, delayMs: number, reduce: boolean, seen = false) {
  const opacity = useSharedValue(seen ? 1 : 0);
  const scale = useSharedValue(reduce ? 1 : SCALE_FROM[kind]);
  const y = useSharedValue(reduce ? 0 : Y_FROM[kind]);
  useEffect(() => {
    const delay = reduce || seen ? 0 : delayMs;
    const slides = kind === 'drop' || kind === 'rise';
    const fadeMs = slides ? motion.duration.rewardMin : motion.duration.stateChange;
    if (!seen) opacity.set(withDelay(delay, withTiming(1, timing(fadeMs, 'standard', reduce)), NEVER));
    if (reduce) {
      scale.set(1);
      y.set(0);
      return;
    }
    if (slides) {
      y.set(withDelay(delay, withTiming(0, timing(motion.duration.rewardMin, 'standard', false)), NEVER));
      return;
    }
    if (kind === 'fade') return;
    const spring = kind === 'slam' ? motion.spring.slam : motion.spring.pop;
    scale.set(withDelay(delay, withSpring(1, { ...spring, reduceMotion: NEVER }), NEVER));
  }, [kind, delayMs, reduce, seen, opacity, scale, y]);
  return useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateY: y.get() }, { scale: scale.get() }],
  }));
}

/**
 * `podium` (motion.md §4.7): a column grows from its foot (scaleY 0 → 1) over 500 ms from `delayMs`. Reduced
 * motion: at its height at once. The caller sets `transformOrigin: 'bottom'`.
 */
export function useGrow(delayMs: number, reduce: boolean) {
  const grown = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) {
      grown.set(1);
      return;
    }
    grown.set(withDelay(delayMs, withTiming(1, timing(PODIUM_GROW_MS, 'standard', false)), NEVER));
  }, [delayMs, reduce, grown]);
  return useAnimatedStyle(() => ({ transform: [{ scaleY: grown.get() }] }));
}

/** Where a count-up is: waiting at 0, counting to the final value, or done (the plain number in its place). */
export type CountPhase = 'waiting' | 'counting' | 'done';

/**
 * The final score's count (motion.md §4.7, MOT-2): with `active` (a win, full motion) it waits at 0 until
 * `victory.barsAt`, counts to the final score over `motion.duration.rewardMax`, and is done after that. Without
 * it, done from the start: the number is simply there.
 */
export function useCountPhase(active: boolean): CountPhase {
  const [phase, setPhase] = useState<CountPhase>(active ? 'waiting' : 'done');
  // A change of `active` (reduced motion turned on mid-count) ends the count at once.
  if (!active && phase !== 'done') setPhase('done');
  useEffect(() => {
    if (!active) return;
    const start = setTimeout(() => setPhase('counting'), victory.barsAt);
    const end = setTimeout(() => setPhase('done'), victory.barsAt + COUNT_MS);
    return () => {
      clearTimeout(start);
      clearTimeout(end);
    };
  }, [active]);
  return phase;
}

/** The final score's count: 900 ms (motion.md `rewardMax`), from `victory.barsAt`. */
export const COUNT_MS = motion.duration.rewardMax;
