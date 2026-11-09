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
import { MAP, type RoadPiece } from './mapModel';

/**
 * A piece of the road (components.md §19.14): one segment of the curve as one item draws it, in a small Svg of its
 * own (react-native-svg draws each Svg into a bitmap of its size, so the road never costs a bitmap as tall as a
 * chapter). Four strokes, bottom to top: the edge (the road's depth, 6 dp lower), the kerb, the body (a 3 dp kerb
 * shows each side) and the dashed middle, whose dashes run on from piece to piece. Gold up to where I am
 * (`color.levelMap.roadDone`), slate after it (`road`). Butt ends: the pieces meet edge to edge under the coins.
 *
 * `pour` (back from a stage, motion.md `level.map.pour`): the gold runs along the piece from its start, over the
 * slate, and its cream middle dash fades in at the end. The screen plays it only without Reduced Motion.
 */

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);
const NEVER = reduceMotionFlag(false);

const R = MAP.road;
const BODY = R.width - 2 * R.kerb;

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

type Tones = { edge: string; kerb: string; body: string; dash: string };

/** The four strokes of the road, in one set of colours. */
function Strokes({ d, dashOffset, tones }: { d: string; dashOffset: number; tones: Tones }) {
  return (
    <>
      <Path
        d={d}
        transform={`translate(0 ${R.edge})`}
        stroke={tones.edge}
        strokeWidth={R.width}
        strokeLinecap="butt"
        fill="none"
      />
      <Path d={d} stroke={tones.kerb} strokeWidth={R.width} strokeLinecap="butt" fill="none" />
      <Path d={d} stroke={tones.body} strokeWidth={BODY} strokeLinecap="butt" fill="none" />
      <Path
        d={d}
        stroke={tones.dash}
        strokeWidth={R.dashWidth}
        strokeDasharray={`${R.dash} ${R.gap}`}
        strokeDashoffset={dashOffset}
        strokeLinecap="butt"
        fill="none"
      />
    </>
  );
}

/** The gold strokes running along the piece (the pour). */
function Pouring({ piece, pour }: { piece: RoadPiece; pour: RoadPour }) {
  const tones = color.levelMap.roadDone;
  const L = Math.max(1, piece.length);
  const run = useSharedValue(0);
  const dash = useSharedValue(0);
  useEffect(() => {
    run.set(
      withDelay(
        pour.delayMs,
        withTiming(1, { duration: pour.durationMs, easing: curve('standard'), reduceMotion: NEVER }),
        NEVER,
      ),
    );
    const fade = MAP_MOTION.pourDashFadeMs;
    dash.set(
      withDelay(
        pour.delayMs + Math.max(0, pour.durationMs - fade),
        withTiming(1, { duration: fade, easing: curve('standard'), reduceMotion: NEVER }),
        NEVER,
      ),
    );
    return () => {
      cancelAnimation(run);
      cancelAnimation(dash);
    };
  }, [pour.delayMs, pour.durationMs, run, dash]);
  const running = useAnimatedProps(() => ({ strokeDashoffset: L * (1 - run.get()) }));
  const fading = useAnimatedProps(() => ({ opacity: dash.get() }));
  const dashes = `${L} ${L}`;
  return (
    <>
      <AnimatedPath
        d={piece.d}
        transform={`translate(0 ${R.edge})`}
        stroke={tones.edge}
        strokeWidth={R.width}
        strokeDasharray={dashes}
        strokeLinecap="butt"
        fill="none"
        animatedProps={running}
      />
      <AnimatedPath
        d={piece.d}
        stroke={tones.kerb}
        strokeWidth={R.width}
        strokeDasharray={dashes}
        strokeLinecap="butt"
        fill="none"
        animatedProps={running}
      />
      <AnimatedPath
        d={piece.d}
        stroke={tones.body}
        strokeWidth={BODY}
        strokeDasharray={dashes}
        strokeLinecap="butt"
        fill="none"
        animatedProps={running}
        testID={`road-${piece.key}-pour`}
      />
      <AnimatedG animatedProps={fading}>
        <Path
          d={piece.d}
          stroke={tones.dash}
          strokeWidth={R.dashWidth}
          strokeDasharray={`${R.dash} ${R.gap}`}
          strokeDashoffset={piece.dashOffset}
          strokeLinecap="butt"
          fill="none"
        />
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
          <Strokes
            d={piece.d}
            dashOffset={piece.dashOffset}
            tones={gold ? color.levelMap.roadDone : color.levelMap.road}
          />
          {pour ? <Pouring piece={piece} pour={pour} /> : null}
        </G>
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  piece: { position: 'absolute' },
});
