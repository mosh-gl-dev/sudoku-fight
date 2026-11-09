import { StyleSheet, View } from 'react-native';
import Animated, { css } from 'react-native-reanimated';

import { radius, size, tokens } from '../../theme';
import { motion, useReduceMotion } from '../../theme/motion';

export interface SpinnerProps {
  /** Outer diameter in dp. */
  size?: number;
  /** Ring width in dp. */
  stroke?: number;
  /** Color of the moving arc; the track is the same color, faded. */
  color: string;
  testID?: string;
}

/**
 * The turn: once every 800 ms, linearly, for ever. A Reanimated CSS animation, not a worklet style
 * (./cssMotion.ts): a spinner is always replaced by what it waited for, often a screen of avatars drawn for the
 * first time, and on Android a worklet-moved view deleted in that frame fails once for every new shape (B14/B32,
 * QA run #3: the results after a game).
 */
export const SPINNER_TURN = {
  animationName: css.keyframes({
    from: { transform: [{ rotate: '0deg' }] },
    to: { transform: [{ rotate: '360deg' }] },
  }),
  animationDuration: motion.loop.spinner,
  animationTimingFunction: 'linear',
  animationIterationCount: 'infinite',
} as const;

/**
 * The loading ring of components.md §1 (motion.md `spinner`): a faint track with one arc that turns every 800 ms,
 * linearly. Decorative: the button around it says "…, טוען" and sets `busy`. Reduced motion: the ring stands still.
 */
export function Spinner({
  size: px = size.icon.header,
  stroke = size.iconStroke,
  color,
  testID,
}: SpinnerProps) {
  const reduce = useReduceMotion();
  const ring = { width: px, height: px, borderRadius: radius.pill, borderWidth: stroke };

  return (
    <View
      style={{ width: px, height: px }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
    >
      <View
        style={[StyleSheet.absoluteFill, ring, { borderColor: color, opacity: tokens.opacity.iconBadgeFill }]}
      />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          ring,
          styles.arc,
          { borderTopColor: color },
          reduce ? null : SPINNER_TURN,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  arc: {
    borderColor: 'transparent',
  },
});
