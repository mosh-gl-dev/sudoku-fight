import type { Stars } from '@sudoku-fight/engine';
import { useEffect } from 'react';
import { I18nManager, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';

import { color } from '../../theme';
import { reduceMotionFlag, useReduceMotion } from '../../theme/motion';
import { curve } from '../ui/motion';
import { REVEAL, STAR_PATH } from './StarRow';

/**
 * A coin's crown of three stars on the level map (components.md §19.2): it straddles the coin's top edge, the
 * middle star (18) on the edge line, the two side ones (15) a little lower and turned outward, like the stars over
 * a level in a saga map. Each star has a dark outline, so it reads over the gold road and the light coin alike.
 * The earned ones are gold and count from the start side (right first in Hebrew); the rest are dark with a faint
 * outline. Decorative: the node's button says the stars.
 *
 * `reveal` (back from a stage, motion.md `level.map.stars`): only the stars from `from` up to the earned ones pop
 * in (0.6 → 1.12 → 1, the result's timings), after `delayMs`. Reduced Motion: all of them at once.
 */

const C = color.levelMap.crown;

/** The crown's box: as wide as a coin, its top 14 over the coin's top edge. */
export const CROWN_BOX = { width: 64, height: 28, edge: 14 } as const;

interface Place {
  x: number;
  y: number;
  size: number;
  turn: number;
}

/** The three stars' places in the box, left to right: centre, size and turn. */
const PLACES: readonly Place[] = [
  { x: 12, y: 17, size: 15, turn: -12 },
  { x: 32, y: 14, size: 18, turn: 0 },
  { x: 52, y: 17, size: 15, turn: 12 },
];

/** The outline drawn under each star (about 2 dp of it shows). */
const OUTLINE = 4;
const EMPTY_STROKE = 1.5;

export interface StarCrownProps {
  stars: Stars;
  /** Pop the stars from `from` up to `stars`, `delayMs` from now. */
  reveal?: { from: number; delayMs: number } | null;
  testID: string;
}

/** The stars' places in the order they are earned: from the start side. */
const placesInOrder = () => (I18nManager.isRTL ? [...PLACES].reverse() : [...PLACES]);

function StarShape({ place, filled }: { place: Place; filled: boolean }) {
  const s = place.size / 24;
  const transform = `translate(${place.x} ${place.y}) rotate(${place.turn}) scale(${s}) translate(-12 -12)`;
  return (
    <G transform={transform}>
      <Path
        d={STAR_PATH}
        fill={C.outline}
        stroke={C.outline}
        strokeWidth={OUTLINE / s}
        strokeLinejoin="round"
      />
      <Path
        d={STAR_PATH}
        fill={filled ? C.filled : C.emptyFill}
        stroke={filled ? C.filled : C.emptyStroke}
        strokeWidth={(filled ? 0.5 : EMPTY_STROKE) / s}
        strokeLinejoin="round"
      />
    </G>
  );
}

export function StarCrown({ stars, reveal = null, testID }: StarCrownProps) {
  const reduce = useReduceMotion();
  const places = placesInOrder();
  const popping = reveal && !reduce ? reveal : null;
  return (
    <View
      style={styles.box}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
    >
      <Svg width={CROWN_BOX.width} height={CROWN_BOX.height}>
        {places.map((place, i) => {
          const filled = i < stars && !(popping && i >= popping.from);
          return (
            <G key={i} testID={`${testID}-${i}-${i < stars ? 'filled' : 'empty'}`}>
              <StarShape place={place} filled={filled} />
            </G>
          );
        })}
      </Svg>
      {popping
        ? places.map((place, i) =>
            i >= popping.from && i < stars ? (
              <PopStar
                key={i}
                place={place}
                delayMs={popping.delayMs + (i - popping.from) * REVEAL.staggerMs}
                testID={`${testID}-${i}-pop`}
              />
            ) : null,
          )
        : null}
    </View>
  );
}

/** A star popping in over its empty place. */
function PopStar({ place, delayMs, testID }: { place: Place; delayMs: number; testID: string }) {
  const scale = useSharedValue<number>(REVEAL.from);
  const opacity = useSharedValue(0);
  useEffect(() => {
    const grow = REVEAL.popMs * 0.7;
    opacity.set(
      withDelay(
        delayMs,
        withTiming(1, { duration: grow, easing: curve('standard'), reduceMotion: NEVER }),
        NEVER,
      ),
    );
    scale.set(
      withDelay(
        delayMs,
        withSequence(
          NEVER,
          withTiming(REVEAL.over, { duration: grow, easing: curve('emphasized'), reduceMotion: NEVER }),
          withTiming(1, { duration: REVEAL.popMs - grow, easing: curve('standard'), reduceMotion: NEVER }),
        ),
        NEVER,
      ),
    );
    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [delayMs, scale, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ scale: scale.get() }] }));
  const box = place.size + OUTLINE * 2;
  return (
    <Animated.View
      style={[
        styles.pop,
        { left: place.x - box / 2, top: place.y - box / 2, width: box, height: box },
        style,
      ]}
      testID={testID}
    >
      <Svg width={box} height={box}>
        <StarShape place={{ ...place, x: box / 2, y: box / 2 }} filled />
      </Svg>
    </Animated.View>
  );
}

const NEVER = reduceMotionFlag(false);

const styles = StyleSheet.create({
  box: { width: CROWN_BOX.width, height: CROWN_BOX.height },
  pop: { position: 'absolute' },
});
