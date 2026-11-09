import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { act, render, screen } from '@testing-library/react-native';
import { useEffect } from 'react';
import Animated, {
  ReducedMotionConfig,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { timing } from '../../components/board/animation';
import { useBlink } from '../../components/player/anim';
import { useSettings } from '../../state/settings';
import { useReduceMotion } from '../motion';
import { MotionPolicy } from '../MotionPolicy';

/**
 * The app's Reduced Motion decision governs every animation (spec §4.1: off by default, even when the phone
 * reduces motion). A loop with no flag of its own used to follow the phone: with the setting off and the phone's
 * Reduce Motion on, a screen drew its full-motion version and its loops froze (the review of 1.11.2026). The
 * phone's setting is stood in for by a ReducedMotionConfig mounted before the policy.
 */

const PHONE_REDUCES = <ReducedMotionConfig mode={ReduceMotion.Always} />;

/** A lock's pulse band (Cell.tsx PulseBand): a reversed endless loop whose repeat sets no flag. */
function Pulse() {
  const level = useSharedValue(0);
  useEffect(() => {
    level.set(withRepeat(withTiming(1, timing(800, 'loop')), -1, true));
  }, [level]);
  const style = useAnimatedStyle(() => ({ opacity: level.get() }));
  return <Animated.View testID="pulse" style={style} />;
}

/** "חושב…" (components/player/anim.ts useBlink), gated on the app's decision. */
function Blink() {
  const style = useBlink(true, useReduceMotion(), 1000);
  return <Animated.View testID="blink" style={style} />;
}

/** The opacity a view shows over 8 samples, 230 ms apart. */
async function opacities(testID: string): Promise<unknown[]> {
  const seen: unknown[] = [];
  for (let i = 0; i < 8; i++) {
    await act(async () => void jest.advanceTimersByTime(230));
    const el = screen.getByTestId(testID, { includeHiddenElements: true });
    seen.push((el.props.jestAnimatedStyle?.value as { opacity?: unknown } | undefined)?.opacity);
  }
  return seen;
}

const distinct = (values: unknown[]) => new Set(values).size;

beforeEach(() => {
  jest.useFakeTimers();
  // ReducedMotionConfig says in development that it overrides the phone; expected here.
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('the motion policy', () => {
  it('setting off, the phone reducing motion: loops still move', async () => {
    useSettings.setState({ reduceMotion: 'off' });
    await render(
      <>
        {PHONE_REDUCES}
        <MotionPolicy />
        <Pulse />
        <Blink />
      </>,
    );
    expect(distinct(await opacities('pulse'))).toBeGreaterThan(3);
    expect(distinct(await opacities('blink'))).toBeGreaterThan(3);
  });

  it('without the policy, the same loop freezes (what it fixes)', async () => {
    useSettings.setState({ reduceMotion: 'off' });
    await render(
      <>
        {PHONE_REDUCES}
        <Pulse />
      </>,
    );
    expect(distinct(await opacities('pulse'))).toBe(1);
  });

  it('setting on: an animation without its own flag is reduced too', async () => {
    useSettings.setState({ reduceMotion: 'on' });
    await render(
      <>
        <MotionPolicy />
        <Pulse />
      </>,
    );
    expect(distinct(await opacities('pulse'))).toBe(1);
  });

  it('the root layout mounts it first, in both of its returns', () => {
    const layout = readFileSync(join(__dirname, '../../../app/_layout.tsx'), 'utf8');
    expect(layout).toContain('if (!fontsReady) return <MotionPolicy />;');
    expect(layout).toMatch(/return \(\s*<>\s*<MotionPolicy \/>\s*<GestureHandlerRootView/);
  });
});
