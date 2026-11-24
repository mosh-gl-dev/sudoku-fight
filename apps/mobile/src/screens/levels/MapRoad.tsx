import { memo, useEffect } from 'react';
import { I18nManager, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';

import { curve } from '../../components/ui/motion';
import { MAP_MOTION } from '../../config/levels';
import { color } from '../../theme';
import { reduceMotionFlag } from '../../theme/motion';
import type { RoadPiece } from './mapModel';

/**
 * A piece of the way (components.md §19.14; Moshe 25.11.2026: "הכביש בצבע זהב, לא מתאים. אולי קו זהב דק"): one
 * segment of the curve as one item draws it, in a small Svg of its own (react-native-svg draws each Svg into a
 * bitmap of its size, so the way never costs a bitmap as tall as a chapter). No road any more: a thin line.
 * - **where I have been** (up to where I am): a gold line (`roadDone.kerb`) in a soft gold glow (`beacon.band`),
 *   a cream thread (`roadDone.dash`) down its middle;
 * - **ahead**: a quiet slate dotted line (`road.kerb`), its dots running on from piece to piece.
 * Butt ends (the dots round): the pieces meet edge to edge under the coins.
 *
 * `pour` (back from a stage, motion.md `level.map.pour`): the gold runs along the piece from its start, over the
 * dots, and its cream thread fades in at the end. The screen plays it only without Reduced Motion.
 */

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);
const NEVER = reduceMotionFlag(false);

/**
 * The line's widths: the glow, the gold line and its thread; ahead, dots of `dot` every `dotEvery` dp (a whole
 * number of them in the model's dash period, MAP.road.dash + gap, so the dots run on across the pieces).
 */
export const LINE = { glow: 9, gold: 3, thread: 1, dot: 2.5, dotEvery: 5.5 } as const;
const DOTS = `0.5 ${LINE.dotEvery - 0.5}`;

export interface RoadPour {
  delayMs: number;
  durationMs: number;
}

export interface RoadPieceViewProps {
  piece: RoadPiece;
  /** Pour the gold along it now (its chapter's choreography). */
  pour?: RoadPour | null;
  /** Draw it as not reached yet (the step back from a stage, before its pour). */
  ahead?: boolean;
}

const DONE = color.levelMap.roadDone;
const GLOW = color.levelMap.beacon.band;

/** The gold line: its glow, the line, the thread. */
function Gold({ d }: { d: string }) {
  return (
    <>
      <Path d={d} stroke={GLOW} strokeWidth={LINE.glow} strokeLinecap="butt" fill="none" />
      <Path d={d} stroke={DONE.kerb} strokeWidth={LINE.gold} strokeLinecap="butt" fill="none" />
      <Path d={d} stroke={DONE.dash} strokeWidth={LINE.thread} strokeLinecap="butt" fill="none" />
    </>
  );
}

/** The dotted line ahead. */
function Dots({ d, dashOffset }: { d: string; dashOffset: number }) {
  return (
    <Path
      d={d}
      stroke={color.levelMap.road.kerb}
      strokeWidth={LINE.dot}
      strokeDasharray={DOTS}
      strokeDashoffset={dashOffset}
      strokeLinecap="round"
      fill="none"
    />
  );
}

/** The gold line running along the piece (the pour). */
function Pouring({ piece, pour }: { piece: RoadPiece; pour: RoadPour }) {
  const L = Math.max(1, piece.length);
  const run = useSharedValue(0);
  const thread = useSharedValue(0);
  useEffect(() => {
    run.set(
      withDelay(
        pour.delayMs,
        withTiming(1, { duration: pour.durationMs, easing: curve('standard'), reduceMotion: NEVER }),
        NEVER,
      ),
    );
    const fade = MAP_MOTION.pourDashFadeMs;
    thread.set(
      withDelay(
        pour.delayMs + Math.max(0, pour.durationMs - fade),
        withTiming(1, { duration: fade, easing: curve('standard'), reduceMotion: NEVER }),
        NEVER,
      ),
    );
    return () => {
      cancelAnimation(run);
      cancelAnimation(thread);
    };
  }, [pour.delayMs, pour.durationMs, run, thread]);
  const running = useAnimatedProps(() => ({ strokeDashoffset: L * (1 - run.get()) }));
  const fading = useAnimatedProps(() => ({ opacity: thread.get() }));
  const dashes = `${L} ${L}`;
  return (
    <>
      <AnimatedPath
        d={piece.d}
        stroke={GLOW}
        strokeWidth={LINE.glow}
        strokeDasharray={dashes}
        strokeLinecap="butt"
        fill="none"
        animatedProps={running}
      />
      <AnimatedPath
        d={piece.d}
        stroke={DONE.kerb}
        strokeWidth={LINE.gold}
        strokeDasharray={dashes}
        strokeLinecap="butt"
        fill="none"
        animatedProps={running}
        testID={`road-${piece.key}-pour`}
      />
      <AnimatedG animatedProps={fading}>
        <Path d={piece.d} stroke={DONE.dash} strokeWidth={LINE.thread} strokeLinecap="butt" fill="none" />
      </AnimatedG>
    </>
  );
}

export const RoadPieceView = memo(function RoadPieceView({
  piece,
  pour = null,
  ahead = false,
}: RoadPieceViewProps) {
  const { frame } = piece;
  const gold = piece.reached && !ahead && !pour;
  // The path is measured from the start edge; the Svg draws left to right, so it is mirrored in a right-to-left
  // layout (the piece's box itself is placed from the start edge).
  const mirror = I18nManager.isRTL ? `translate(${frame.w} 0) scale(-1 1)` : undefined;
  return (
    <View
      style={[styles.piece, { start: frame.x, top: frame.y, width: frame.w, height: frame.h }]}
      pointerEvents="none"
      testID={`road-${piece.key}`}
    >
      <Svg width={frame.w} height={frame.h}>
        <G transform={mirror} testID={`road-${piece.key}-${gold ? 'done' : 'ahead'}`}>
          {gold ? <Gold d={piece.d} /> : <Dots d={piece.d} dashOffset={piece.dashOffset} />}
          {pour ? <Pouring piece={piece} pour={pour} /> : null}
        </G>
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  piece: { position: 'absolute' },
});
