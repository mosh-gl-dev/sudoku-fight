import 'react-native-reanimated';

import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { useSettings } from '../../../state/settings';
import { motion } from '../../../theme/motion';
import { ENTER, Enter, staggerDelay } from '../Enter';

/**
 * The app's one entrance (MOT-3, motion.md §4.9 `list.enter`): fade, rise and pop, staggered by a list's index
 * for its first eight rows. With Reduced Motion nothing animated is mounted: the part is there at once.
 */

const animatedStyleOf = (id: string) =>
  (screen.getByTestId(id).props as { jestAnimatedStyle?: { value?: unknown } }).jestAnimatedStyle;

async function frames(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  useSettings.setState({ reduceMotion: 'off' });
});
afterEach(() => jest.useRealTimers());

describe('staggerDelay (list.enter)', () => {
  it('40 ms apart (listStagger), for the first 8 rows only', () => {
    expect(ENTER.stagger).toBe(motion.sequence.listStagger);
    expect(ENTER.stagger).toBe(40);
    expect(ENTER.cap).toBe(8);
    expect([0, 1, 2, 7].map((i) => staggerDelay(i))).toEqual([0, 40, 80, 280]);
    // Past the cap (and a row a virtualized list mounts later as it scrolls): at once.
    expect([8, 9, 30].map((i) => staggerDelay(i))).toEqual([null, null, null]);
  });

  it('takes its own gap, cap and first wait', () => {
    expect(staggerDelay(3, { stagger: 80 })).toBe(240);
    expect(staggerDelay(2, { cap: 2 })).toBeNull();
    expect(staggerDelay(1, { base: 260 })).toBe(300);
    expect([-1, 1.5, Number.NaN].map((i) => staggerDelay(i))).toEqual([null, null, null]);
  });
});

describe('Enter', () => {
  it('rise: from 12 dp down and transparent, up and opaque after its wait', async () => {
    await render(
      <Enter index={2} testID="part">
        <Text>row</Text>
      </Enter>,
    );
    expect(screen.getByTestId('part')).toHaveAnimatedStyle({
      opacity: 0,
      transform: [{ translateY: ENTER.rise }],
    });
    // Still waiting its turn (2 × 40 ms).
    await frames(staggerDelay(2)! - 20);
    expect(screen.getByTestId('part')).toHaveAnimatedStyle({ opacity: 0 });
    await frames(ENTER.riseMs + 200);
    expect(screen.getByTestId('part')).toHaveAnimatedStyle({ opacity: 1, transform: [{ translateY: 0 }] });
    expect(screen.getByText('row')).toBeOnTheScreen();
  });

  it('pop and settle grow to full size; fade only fades', async () => {
    await render(
      <>
        <Enter kind="pop" testID="pop" />
        <Enter kind="settle" testID="settle" />
        <Enter kind="fade" testID="fade" />
      </>,
    );
    expect(screen.getByTestId('pop')).toHaveAnimatedStyle({
      opacity: 0,
      transform: [{ scale: ENTER.popFrom }],
    });
    expect(screen.getByTestId('settle')).toHaveAnimatedStyle({
      opacity: 0,
      transform: [{ scale: ENTER.settleFrom }],
    });
    expect(screen.getByTestId('fade')).toHaveAnimatedStyle({ opacity: 0 });
    await frames(2000);
    expect(screen.getByTestId('pop')).toHaveAnimatedStyle({ opacity: 1, transform: [{ scale: 1 }] });
    expect(screen.getByTestId('settle')).toHaveAnimatedStyle({ opacity: 1, transform: [{ scale: 1 }] });
    expect(screen.getByTestId('fade')).toHaveAnimatedStyle({ opacity: 1 });
  });

  it('a row past the first 8 is simply there: nothing animated', async () => {
    await render(<Enter index={ENTER.cap} testID="late" />);
    expect(animatedStyleOf('late')).toBeUndefined();
  });

  it('`play` holds it at its start until it turns true (Home waits for the Splash)', async () => {
    const view = await render(<Enter play={false} testID="held" />);
    await frames(2000);
    expect(screen.getByTestId('held')).toHaveAnimatedStyle({ opacity: 0 });
    await view.rerender(<Enter play testID="held" />);
    await frames(2000);
    expect(screen.getByTestId('held')).toHaveAnimatedStyle({ opacity: 1 });
    // Once played it stays, whatever `play` does next.
    await view.rerender(<Enter play={false} testID="held" />);
    await frames(2000);
    expect(screen.getByTestId('held')).toHaveAnimatedStyle({ opacity: 1 });
  });

  it('Reduced Motion: a plain View, there at once, for every kind', async () => {
    useSettings.setState({ reduceMotion: 'on' });
    await render(
      <>
        <Enter testID="rise" />
        <Enter kind="pop" index={1} testID="pop" />
        <Enter kind="settle" testID="settle" />
        <Enter kind="fade" play={false} testID="fade" />
      </>,
    );
    for (const id of ['rise', 'pop', 'settle', 'fade']) {
      expect(animatedStyleOf(id)).toBeUndefined();
      expect(screen.getByTestId(id)).toBeOnTheScreen();
    }
  });

  it('enabled={false}: a plain View; the choice is made once, so a later change never remounts it', async () => {
    const view = await render(
      <>
        <Enter enabled={false} testID="off">
          <Text>still</Text>
        </Enter>
        <Enter testID="on">
          <Text>moving</Text>
        </Enter>
      </>,
    );
    expect(animatedStyleOf('off')).toBeUndefined();
    expect(animatedStyleOf('on')).toBeDefined();
    const before = [screen.getByText('still'), screen.getByText('moving')];
    // Reduced Motion turned on in Settings while the screen stays open, and `enabled` flips: nothing remounts.
    await act(async () => useSettings.setState({ reduceMotion: 'on' }));
    await view.rerender(
      <>
        <Enter enabled testID="off">
          <Text>still</Text>
        </Enter>
        <Enter enabled={false} testID="on">
          <Text>moving</Text>
        </Enter>
      </>,
    );
    expect(animatedStyleOf('off')).toBeUndefined();
    expect(animatedStyleOf('on')).toBeDefined();
    expect([screen.getByText('still'), screen.getByText('moving')]).toEqual(before);
  });

  it('once in, its end is React’s own style: a later render never brings back the start (B46)', async () => {
    // Reanimated renders the start (opacity 0) under an animated style and keeps the end only natively; after the
    // restart for a new direction that end was dropped, and Home's profile card stayed at opacity 0.
    const view = await render(
      <>
        <Enter testID="rise">
          <Text>card</Text>
        </Enter>
        <Enter kind="pop" delayMs={120} testID="pop" />
        <Enter kind="settle" testID="settle" />
        <Enter kind="fade" testID="fade" />
      </>,
    );
    expect(screen.getByTestId('rise')).toHaveStyle({ opacity: 0 });
    await frames(ENTER.riseMs + 50);
    expect(screen.getByTestId('rise')).toHaveStyle({ opacity: 1, transform: [{ translateY: 0 }] });
    await frames(2000);
    expect(screen.getByTestId('pop')).toHaveStyle({ opacity: 1, transform: [{ scale: 1 }] });
    expect(screen.getByTestId('settle')).toHaveStyle({ opacity: 1, transform: [{ scale: 1 }] });
    expect(screen.getByTestId('fade')).toHaveStyle({ opacity: 1 });
    // What it holds changes (the card's ratings arrive): still opaque, in place.
    await view.rerender(
      <>
        <Enter testID="rise">
          <Text>card, again</Text>
        </Enter>
        <Enter kind="pop" delayMs={120} testID="pop" />
        <Enter kind="settle" testID="settle" />
        <Enter kind="fade" testID="fade" />
      </>,
    );
    expect(screen.getByTestId('rise')).toHaveStyle({ opacity: 1, transform: [{ translateY: 0 }] });
    expect(screen.getByText('card, again')).toBeOnTheScreen();
  });

  it('held, its start is its own style; once played, its end comes even if `play` turns false meanwhile', async () => {
    const view = await render(<Enter play={false} testID="held" />);
    await frames(2000);
    expect(screen.getByTestId('held')).toHaveStyle({ opacity: 0, transform: [{ translateY: ENTER.rise }] });
    // Nothing animated is on it while it waits: a start Reanimated kept that long would come back over its end
    // (enterSettled.test.tsx).
    expect(animatedStyleOf('held')?.value).toEqual({});
    await view.rerender(<Enter play testID="held" />);
    await view.rerender(<Enter play={false} testID="held" />);
    await frames(2000);
    expect(screen.getByTestId('held')).toHaveStyle({ opacity: 1, transform: [{ translateY: 0 }] });
  });

  it('keeps the style it is given (the layout of what it wraps)', async () => {
    await render(<Enter style={{ marginTop: 24 }} testID="styled" />);
    expect(screen.getByTestId('styled')).toHaveStyle({ marginTop: 24 });
  });
});
