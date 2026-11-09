import { useEffect } from 'react';
import { I18nManager, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { AvatarIdOrNone } from '../../avatars';
import { Avatar, SeatGlyph } from '../../components/player';
import { paletteAt } from '../../components/player/metrics';
import { curve } from '../../components/ui/motion';
import { MAP_MOTION } from '../../config/levels';
import { color, space } from '../../theme';
import { motion, reduceMotionFlag, useReduceMotion } from '../../theme/motion';
import { MAP, type Point } from './mapModel';

/**
 * My token on the level map (components.md §19.2, LEVEL_UI.mapToken): my avatar stands beside the current stage
 * like a piece on a board game, in P1's frame with my ● beside it, a soft shadow under it, leaning a little toward
 * its coin. Never idle (it is still between moves). It lands on its spot when the map first shows
 * (`level.map.token.land`), and back from a stage it hops to the next one on a little arc
 * (`level.map.token.hop`). Reduced Motion: it is simply there. Hidden from screen readers and from touch: the
 * current stage's own label says "השלב הבא".
 */

const NEVER = reduceMotionFlag(false);
const ME = paletteAt(0);

export interface MapTokenProps {
  /** Where it stands: its centre, x from the start edge, in the item's coordinates. */
  spot: Point;
  /** Which side of its coin it stands on (+1: toward the end edge), so it leans toward the coin. */
  side: number;
  avatarId: AvatarIdOrNone | null;
  /** Drop onto the spot after `delayMs` (the map's first showing). */
  land?: { delayMs: number } | null;
  /** Hop from `from` (in the same item) after `delayMs`. */
  hop?: { from: Point; delayMs: number } | null;
  testID: string;
}

export function MapToken({ spot, side, avatarId, land = null, hop = null, testID }: MapTokenProps) {
  const reduce = useReduceMotion();
  const physical = I18nManager.isRTL ? -1 : 1;
  const lean = -side * physical * TILT;

  // The landing: 0 → 1 (drop and grow), and the opacity.
  const drop = useSharedValue(land && !reduce ? 0 : 1);
  const shown = useSharedValue(land && !reduce ? 0 : 1);
  // The hop: 0 (at `from`) → 1 (here), and the squash on landing.
  const along = useSharedValue(hop && !reduce ? 0 : 1);
  const squash = useSharedValue(0);
  const dx = hop ? (hop.from.x - spot.x) * physical : 0;
  const dy = hop ? hop.from.y - spot.y : 0;
  const landDelay = land?.delayMs ?? null;
  const hopDelay = hop?.delayMs ?? null;

  // Started once per mount (the map remounts the token, by its key, for each new place).
  useEffect(() => {
    if (landDelay === null || reduce) return;
    shown.set(withDelay(landDelay, withTiming(1, { duration: LAND_FADE_MS, reduceMotion: NEVER }), NEVER));
    drop.set(withDelay(landDelay, withSpring(1, { ...motion.spring.pop, reduceMotion: NEVER }), NEVER));
  }, [landDelay, reduce, shown, drop]);

  useEffect(() => {
    if (hopDelay === null || reduce) return;
    along.set(
      withDelay(
        hopDelay,
        withTiming(1, { duration: MAP_MOTION.hopMs, easing: curve('standard'), reduceMotion: NEVER }),
        NEVER,
      ),
    );
    squash.set(
      withDelay(
        hopDelay + MAP_MOTION.hopMs,
        withSequence(
          NEVER,
          withTiming(1, { duration: MAP_MOTION.landSquashMs / 2, reduceMotion: NEVER }),
          withTiming(0, {
            duration: MAP_MOTION.landSquashMs / 2,
            easing: curve('standard'),
            reduceMotion: NEVER,
          }),
        ),
        NEVER,
      ),
    );
  }, [hopDelay, reduce, along, squash]);

  // Unmounted mid-way: nothing keeps running.
  useEffect(
    () => () => {
      for (const v of [shown, drop, along, squash]) cancelAnimation(v);
    },
    [shown, drop, along, squash],
  );

  const arc = MAP_MOTION.hopArcDp;
  const fall = MAP_MOTION.tokenDropDp;
  const style = useAnimatedStyle(() => {
    const p = along.get();
    const q = squash.get();
    const d = drop.get();
    return {
      opacity: shown.get(),
      transform: [
        { translateX: dx * (1 - p) },
        // A parabola over the straight line: always up on the screen, whatever the map's direction.
        { translateY: dy * (1 - p) - 4 * arc * p * (1 - p) - fall * (1 - d) },
        { scale: 0.7 + 0.3 * d },
        { scaleX: 1 + 0.08 * q },
        { scaleY: 1 - 0.12 * q },
        { rotate: `${lean}deg` },
      ],
    };
  });

  return (
    <View
      style={[styles.box, { start: spot.x - MAP.token.w / 2, top: spot.y - MAP.token.w / 2 }]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
    >
      <View style={styles.shadow} />
      <Animated.View style={style} testID={`${testID}-piece`}>
        <Avatar avatarId={avatarId} size="card" colorIndex={0} testID={`${testID}-avatar`} />
        <View style={styles.glyph}>
          <SeatGlyph colorIndex={0} size={GLYPH} />
        </View>
      </Animated.View>
    </View>
  );
}

/** The lean toward the coin, the glyph's circle and glyph, the landing's fade. */
const TILT = 6;
const GLYPH_BOX = 16;
const GLYPH = 8;
const LAND_FADE_MS = 140;
const SHADOW = { w: 30, h: 6 } as const;

const styles = StyleSheet.create({
  box: { position: 'absolute', width: MAP.token.w, height: MAP.token.h },
  shadow: {
    position: 'absolute',
    bottom: 0,
    start: (MAP.token.w - SHADOW.w) / 2,
    width: SHADOW.w,
    height: SHADOW.h,
    borderRadius: SHADOW.h / 2,
    backgroundColor: color.levelMap.token.shadow,
  },
  glyph: {
    position: 'absolute',
    bottom: -space[2],
    end: -space[2],
    width: GLYPH_BOX,
    height: GLYPH_BOX,
    borderRadius: GLYPH_BOX / 2,
    borderWidth: 2,
    borderColor: ME.ring,
    backgroundColor: color.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
