import { render, screen } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';
import { cubicBezier } from 'react-native-reanimated';

import { useSettings } from '../../../state/settings';
import { color } from '../../../theme';
import { motion } from '../../../theme/motion';
import { cssCurve } from '../cssMotion';
import { Skeleton, SKELETON_OPACITY, SKELETON_PULSE, SkeletonGroup, SkeletonRows } from '../Skeleton';
import { Spinner, SPINNER_TURN } from '../Spinner';

/**
 * The loaders' endless loops run as Reanimated CSS animations, never as worklet styles (docs/PERF.md, B14/B32,
 * QA run #3 T3-HISTORY-FREEZE). On Android, Reanimated 4.5 keeps the last props of every view a worklet moved
 * for 2 s and applies them again for each react-native-svg shape drawn for the first time; a view of that list
 * deleted in the frame that draws new shapes fails each time, with an exception and its stack in the log. The
 * History's skeleton (6 rows, 24 pulsing blocks) was replaced by cards with ~370 new shapes: about 8,900
 * failures, a frozen phone for 6.5–7.4 s. A CSS animation is not on that list, so swapping a loader for its
 * content costs nothing.
 *
 * Under Jest the host keeps the inline style Reanimated was given (`jestInlineStyle`, CSS animation included)
 * and the worklet style it runs (`jestAnimatedStyle`).
 */

type Host = { props: Record<string, unknown> };
const hidden = { includeHiddenElements: true } as const;
const cssOf = (el: Host) =>
  (StyleSheet.flatten(el.props.jestInlineStyle as ViewStyle) ?? {}) as Record<string, unknown>;
const workletStyleOf = (el: Host) =>
  (el.props.jestAnimatedStyle as { value?: object } | undefined)?.value ?? {};

beforeEach(() => {
  useSettings.setState({ reduceMotion: 'off' });
});

describe('cssCurve', () => {
  it('is the motion.md curve as a CSS cubic-bezier', () => {
    expect(cssCurve('loop')).toEqual(cubicBezier(...motion.easing.loop));
  });
});

describe('the skeleton pulse (motion.md skeleton)', () => {
  it('is 0.5 → 1 and back over 1200 ms on the loop curve, endless', () => {
    expect(SKELETON_PULSE).toMatchObject({
      animationDuration: motion.loop.skeleton / 2,
      animationIterationCount: 'infinite',
      animationDirection: 'alternate',
      animationTimingFunction: cssCurve('loop'),
    });
    const rules = (SKELETON_PULSE.animationName as unknown as { cssRules: object }).cssRules;
    expect(JSON.stringify(rules)).toContain(`"opacity":${SKELETON_OPACITY.low}`);
    expect(JSON.stringify(rules)).toContain(`"opacity":${SKELETON_OPACITY.high}`);
  });

  it('every block of a group pulses with it, from 0.5, and no block is moved by a worklet', async () => {
    await render(
      <SkeletonGroup label="loading">
        <Skeleton height={20} testID="block" />
        <SkeletonRows count={6} testID="rows" />
      </SkeletonGroup>,
    );
    const block = screen.getByTestId('block', hidden) as unknown as Host;
    expect(cssOf(block)).toMatchObject({
      ...SKELETON_PULSE,
      opacity: SKELETON_OPACITY.low,
      backgroundColor: color.skeleton.base,
    });
    expect(workletStyleOf(block)).toEqual({});
    // The History's skeleton: 6 rows of an avatar, two lines and a number, 24 blocks, none on a worklet.
    const rows = screen.getByTestId('rows', hidden) as unknown as {
      queryAll: (p: (n: Host & { type: unknown }) => boolean) => Host[];
    };
    const blocks = rows.queryAll(
      (n) => typeof n.type === 'string' && n.props.jestAnimatedStyle !== undefined,
    );
    expect(blocks).toHaveLength(24);
    for (const b of blocks) {
      expect(workletStyleOf(b)).toEqual({});
      expect(cssOf(b).animationName).toBe(SKELETON_PULSE.animationName);
    }
  });

  it('reduced motion: no animation at all, the blocks stand still at 0.7', async () => {
    useSettings.setState({ reduceMotion: 'on' });
    await render(
      <SkeletonGroup label="loading">
        <Skeleton height={20} testID="block" />
      </SkeletonGroup>,
    );
    const block = screen.getByTestId('block', hidden) as unknown as Host;
    expect(cssOf(block).animationName).toBeUndefined();
    expect(cssOf(block).opacity).toBe(SKELETON_OPACITY.still);
    expect(workletStyleOf(block)).toEqual({});
  });

  it('outside a group: still at 0.7, no animation', async () => {
    await render(<Skeleton height={20} testID="block" />);
    const block = screen.getByTestId('block', hidden) as unknown as Host;
    expect(cssOf(block).animationName).toBeUndefined();
    expect(cssOf(block).opacity).toBe(SKELETON_OPACITY.still);
  });
});

describe('the spinner (motion.md spinner)', () => {
  it('turns once every 800 ms, linearly, endless, as a CSS animation', async () => {
    expect(SPINNER_TURN).toMatchObject({
      animationDuration: motion.loop.spinner,
      animationIterationCount: 'infinite',
      animationTimingFunction: 'linear',
    });
    const rules = JSON.stringify((SPINNER_TURN.animationName as unknown as { cssRules: object }).cssRules);
    expect(rules).toContain('"rotate":"0deg"');
    expect(rules).toContain('"rotate":"360deg"');

    await render(<Spinner color={color.text} testID="spin" />);
    const arc = (screen.getByTestId('spin', hidden) as unknown as { children: Host[] }).children[1]!;
    expect(cssOf(arc)).toMatchObject(SPINNER_TURN);
    expect(workletStyleOf(arc)).toEqual({});
  });

  it('reduced motion: the ring stands still', async () => {
    useSettings.setState({ reduceMotion: 'on' });
    await render(<Spinner color={color.text} testID="spin" />);
    const arc = (screen.getByTestId('spin', hidden) as unknown as { children: Host[] }).children[1]!;
    expect(cssOf(arc).animationName).toBeUndefined();
    expect(workletStyleOf(arc)).toEqual({});
  });
});
