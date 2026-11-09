import 'react-native-reanimated';

import { act, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import i18n from '../../../i18n';
import { useSettings } from '../../../state/settings';
import { color } from '../../../theme';
import { REVEAL, revealMs, StarRow, STAR_SIZES } from '../StarRow';

/**
 * A stage's stars (components.md §19.5; motion.md `level.stars.reveal`): earned ones gold, the rest outlined,
 * counted from the start side; one label for the row; on the result they pop in one by one, and appear at once
 * under Reduced Motion.
 */

const hidden = { includeHiddenElements: true };

beforeEach(async () => {
  await i18n.changeLanguage('he');
  useSettings.setState({ reduceMotion: 'off' });
});
afterEach(() => jest.useRealTimers());

describe('StarRow', () => {
  it('draws the earned stars gold and the others outlined, at the boards’ sizes', async () => {
    await render(<StarRow stars={2} size={STAR_SIZES.panel} label="שני כוכבים מתוך שלושה" />);
    expect(screen.getByRole('image', { name: 'שני כוכבים מתוך שלושה' })).toBeOnTheScreen();
    const filled = screen.getByTestId('star-row-0-filled', hidden);
    expect(filled).toHaveProp('width', 16);
    expect(screen.getByTestId('star-row-1-filled', hidden)).toBeTruthy();
    expect(screen.getByTestId('star-row-2-empty', hidden)).toBeTruthy();
    expect(Object.values(STAR_SIZES)).toEqual([11, 16, 28, 40]);
    expect([color.star.filled, color.star.empty]).toEqual([color.accent, color.iconFaint]);
  });

  it('a row inside a labelled element is hidden from screen readers', async () => {
    await render(<StarRow stars={1} size={STAR_SIZES.chip} label={null} />);
    expect(screen.queryByRole('image')).toBeNull();
    expect(screen.getByTestId('star-row', hidden)).toHaveProp('accessibilityElementsHidden', true);
  });

  it('the reveal: the earned stars pop in one by one, 150 ms apart, after 200 ms', async () => {
    jest.useFakeTimers();
    await render(<StarRow stars={3} size={STAR_SIZES.result} label="x" reveal />);
    const pop = (i: number) => screen.getByTestId(`star-row-${i}-pop`, hidden);
    expect(pop(0)).toHaveAnimatedStyle({ opacity: 0 });
    // Between the first star's start and the second's: the first is coming in, the others wait.
    await act(async () => void jest.advanceTimersByTime(REVEAL.delayMs + REVEAL.staggerMs - 10));
    expect(pop(0)).not.toHaveAnimatedStyle({ opacity: 0 });
    expect(pop(1)).toHaveAnimatedStyle({ opacity: 0 });
    expect(pop(2)).toHaveAnimatedStyle({ opacity: 0 });
    await act(async () => void jest.advanceTimersByTime(revealMs(3)));
    for (const i of [0, 1, 2]) expect(pop(i)).toHaveAnimatedStyle({ opacity: 1, transform: [{ scale: 1 }] });
  });

  it('once popped, React holds each star in too, not only the animation (B11)', async () => {
    jest.useFakeTimers();
    await render(<StarRow stars={2} size={STAR_SIZES.result} label="שני כוכבים מתוך שלושה" reveal />);
    const held = (i: number) =>
      StyleSheet.flatten(screen.getByTestId(`star-row-${i}-pop`, hidden).props.style);
    expect(held(0)).toMatchObject({ opacity: 0 });
    await act(async () => void jest.advanceTimersByTime(revealMs(2) + 100));
    for (const i of [0, 1]) expect(held(i)).toMatchObject({ opacity: 1, transform: [{ scale: 1 }] });
  });

  it('the reveal under Reduced Motion: every earned star at once, nothing to animate', async () => {
    useSettings.setState({ reduceMotion: 'on' });
    await render(<StarRow stars={3} size={STAR_SIZES.result} label="x" reveal />);
    expect(screen.queryByTestId('star-row-0-pop', hidden)).toBeNull();
    for (const i of [0, 1, 2]) expect(screen.getByTestId(`star-row-${i}-filled`, hidden)).toBeTruthy();
  });

  it('a boss’s pedestal: only the new stars pop (from `from`), starting `delayMs` from now', async () => {
    jest.useFakeTimers();
    await render(
      <StarRow stars={3} size={STAR_SIZES.chip} label={null} reveal={{ from: 1, delayMs: 350 }} />,
    );
    const pop = (i: number) => screen.getByTestId(`star-row-${i}-pop`, hidden);
    // The star I had stays still and filled; the two new ones pop.
    expect(screen.queryByTestId('star-row-0-pop', hidden)).toBeNull();
    expect(screen.getByTestId('star-row-0-filled', hidden)).toBeTruthy();
    expect(pop(1)).toHaveAnimatedStyle({ opacity: 0 });
    // Not at REVEAL.delayMs (200) as the result's: at the step's 350.
    await act(async () => void jest.advanceTimersByTime(340));
    expect(pop(1)).toHaveAnimatedStyle({ opacity: 0 });
    await act(async () => void jest.advanceTimersByTime(REVEAL.staggerMs));
    expect(pop(1)).not.toHaveAnimatedStyle({ opacity: 0 });
    expect(pop(2)).toHaveAnimatedStyle({ opacity: 0 });
    await act(async () => void jest.advanceTimersByTime(revealMs(3)));
    for (const i of [1, 2]) expect(pop(i)).toHaveAnimatedStyle({ opacity: 1, transform: [{ scale: 1 }] });
  });

  it('only the earned stars pop; the empty outlines are there from the start', async () => {
    await render(<StarRow stars={1} size={STAR_SIZES.result} label="x" reveal />);
    expect(screen.getByTestId('star-row-0-pop', hidden)).toBeTruthy();
    expect(screen.queryByTestId('star-row-1-pop', hidden)).toBeNull();
    expect(screen.getByTestId('star-row-2-empty', hidden)).toBeTruthy();
  });
});
