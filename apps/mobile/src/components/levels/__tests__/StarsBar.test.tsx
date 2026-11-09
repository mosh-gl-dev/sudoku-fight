import 'react-native-reanimated';

import type { StarRule } from '@sudoku-fight/engine';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { I18nManager, StyleSheet, type ViewStyle } from 'react-native';

import i18n from '../../../i18n';
import { useSettings } from '../../../state/settings';
import { tokens } from '../../../theme';
import { setWindow, widthIn } from '../../ui/testing/layout';
import { FONT_SCALE_CAPS } from '../../ui/Text';
import { axisOf, litStars, numbersHeight, placeNumbers, StarsBar } from '../StarsBar';

/**
 * The star meter (components.md §19.5): a time axis that fills left to right in both languages, a mark at
 * each threshold at its share of the axis, the stars above each band, a label that lists the thresholds; a
 * race's pips by owner (● me, ▲ the bot); a fill that moves, or jumps under Reduced Motion.
 */

const hidden = { includeHiddenElements: true };
const styleOf = (el: { props: { style?: unknown } }) =>
  (StyleSheet.flatten(el.props.style as ViewStyle) ?? {}) as ViewStyle;

const FIND: StarRule = { by: 'timeMs', three: 5000, two: 10000, one: 20000 };
const RACE: StarRule = { by: 'spots', three: 4, two: 3, one: 2 };

beforeEach(async () => {
  await i18n.changeLanguage('he');
  useSettings.setState({ reduceMotion: 'off' });
});
afterEach(() => jest.useRealTimers());

describe('StarsBar', () => {
  it('a time axis reads left to right, in Hebrew too (the axis is time, not reading order)', async () => {
    expect(I18nManager.isRTL || i18n.language === 'he').toBe(true);
    await render(<StarsBar rule={FIND} value={0} max={20000} />);
    expect(styleOf(screen.getByTestId('stars-bar-axis', hidden))).toMatchObject({ direction: 'ltr' });
    // The fill is the track's first child, so it grows from the axis's start: the left.
    const track = screen.getByTestId('stars-bar-track', hidden);
    expect(styleOf(track)).toMatchObject({ flexDirection: 'row' });
    expect((track.children[0] as unknown as { props: { testID: string } }).props.testID).toBe(
      'stars-bar-fill',
    );
  });

  it('marks each threshold at its share of the axis, with its seconds under it', async () => {
    await render(<StarsBar rule={FIND} value={0} max={20000} />);
    expect(styleOf(screen.getByTestId('stars-bar-tick-3', hidden)).start).toBe('25%');
    expect(styleOf(screen.getByTestId('stars-bar-tick-2', hidden)).start).toBe('50%');
    expect(styleOf(screen.getByTestId('stars-bar-tick-1', hidden)).start).toBe('100%');
    expect(screen.getByTestId('stars-bar-number-3', hidden)).toHaveTextContent('5');
    expect(screen.getByTestId('stars-bar-number-2', hidden)).toHaveTextContent('10');
    expect(axisOf(FIND, 7000, 30000).marks.map((m) => [m.stars, m.share, m.lit])).toEqual([
      [3, 5000 / 30000, false],
      [2, 10000 / 30000, true],
      [1, 20000 / 30000, true],
    ]);
    expect(litStars(axisOf(FIND, 7000).marks)).toBe(2);
  });

  it('its label lists the thresholds', async () => {
    await render(<StarsBar rule={FIND} value={0} max={20000} />);
    expect(screen.getByRole('progressbar')).toHaveProp(
      'accessibilityLabel',
      '3 כוכבים: עד 5 ש׳ · 2 כוכבים: עד 10 ש׳ · כוכב אחד: עד 20 ש׳',
    );
    await act(async () => void (await i18n.changeLanguage('en')));
    await render(<StarsBar rule={RACE} value={0} spots={[null, null, null, null, null]} />);
    expect(screen.getByRole('progressbar')).toHaveProp(
      'accessibilityLabel',
      // The range is an LTR isolate: its dash would turn it around in a Hebrew line.
      '3 stars: ⁦4–5⁩ spots · 2 stars: 3 spots · 1 star: 2 spots',
    );
  });

  it('a band’s stars are gold while it can be had, faint once lost', async () => {
    await render(<StarsBar rule={FIND} value={7000} max={20000} />);
    // 7 s: ★★★ (up to 5 s) is lost, ★★ and ★ can still be had.
    expect(screen.getAllByTestId('stars-bar-mark-3-out', hidden)).toHaveLength(3);
    expect(screen.getAllByTestId('stars-bar-mark-2-lit', hidden)).toHaveLength(2);
    expect(screen.getAllByTestId('stars-bar-mark-1-lit', hidden)[0]).toHaveProp('width', 11);
  });

  it('a race: a pip per spot, in its taker’s colour and shape', async () => {
    await render(<StarsBar rule={RACE} value={2} spots={['me', 'bot', 'me', null, null]} />);
    expect(screen.getByTestId('stars-bar-pip-0-me', hidden)).toBeTruthy();
    expect(screen.getByTestId('stars-bar-pip-1-bot', hidden)).toBeTruthy();
    expect(screen.getByTestId('stars-bar-pip-3-open', hidden)).toBeTruthy();
    expect(screen.getAllByTestId('glyph-circle', hidden)).toHaveLength(2);
    expect(screen.getAllByTestId('glyph-triangle', hidden)).toHaveLength(1);
  });

  it('the fill moves to a new value; under Reduced Motion it jumps', async () => {
    jest.useFakeTimers();
    const view = await render(<StarsBar rule={FIND} value={0} max={20000} />);
    await view.rerender(<StarsBar rule={FIND} value={10000} max={20000} />);
    expect(screen.getByTestId('stars-bar-fill', hidden)).not.toHaveAnimatedStyle({ width: '50%' });
    await act(async () => void jest.advanceTimersByTime(400));
    expect(screen.getByTestId('stars-bar-fill', hidden)).toHaveAnimatedStyle({ width: '50%' });
    await view.unmount();

    useSettings.setState({ reduceMotion: 'on' });
    const still = await render(<StarsBar rule={FIND} value={0} max={20000} />);
    await still.rerender(<StarsBar rule={FIND} value={10000} max={20000} />);
    // One frame: there already (with full motion it would be on its way, 240 ms).
    await act(async () => void jest.advanceTimersByTime(16));
    expect(screen.getByTestId('stars-bar-fill', hidden)).toHaveAnimatedStyle({ width: '50%' });
  });
});

/**
 * The numbers under the bar at any text size (QA 2026-11-03, the point hunter L041 at ×2.0: "15.517.5", and the
 * last digit cut at the screen's edge): never into each other, never further past the axis's end than at the
 * design's size. The widths are the numbers' real ones in Teko (layout.ts widthIn).
 */
describe('StarsBar: its numbers never run together or off the edge', () => {
  /** L041's rule: the board's best is 18 (engine stars.test). */
  const HUNTER: StarRule = { by: 'points', max: 18, three: 17.5, two: 15.5, one: 13 };
  /** The bar on a 384 dp phone (the Galaxy A16): the screen less the game's gutters. */
  const AXIS = 384 - 2 * tokens.layout.gutterGame;
  const TEKO = { fontFamily: tokens.type.ratingCompact.fontFamily, fontSize: tokens.type.ratingCompact.size };
  const widthsAt = (texts: readonly string[], fontScale: number) =>
    texts.map((s) => widthIn('he', s, TEKO, { fontScale }));
  const hunter = axisOf(HUNTER, 0);
  const shares = hunter.marks.map((m) => m.share);
  const texts = hunter.marks.map((m) => m.text);
  /** The numbers' boxes on the axis, in order along it, line by line. */
  const boxes = (starts: readonly number[], widths: readonly number[], lines: readonly number[]) =>
    starts
      .map((start, i) => ({ start, end: start + widths[i]!, line: lines[i]! }))
      .sort((a, b) => a.start - b.start);
  const apart = (b: ReturnType<typeof boxes>) =>
    b.every((x, i) => b.slice(i + 1).every((y) => y.line !== x.line || y.start >= x.end + 4 - 1e-9));

  it('at the design’s size: where they always were, 6 before each tick', () => {
    expect(texts).toEqual(['13', '15.5', '17.5']);
    const widths = widthsAt(texts, 1);
    const { starts, lines } = placeNumbers(shares, widths, AXIS, 1);
    expect(starts).toEqual(shares.map((s) => s * AXIS - 6));
    expect(lines).toEqual([0, 0, 0]);
    // "17.5" at 97 % hangs a little past the end, as designed.
    expect(starts[2]! + widths[2]!).toBeGreaterThan(AXIS);
  });

  it.each([1.35, 2])('at ×%s: apart, and no further past the end than at ×1.0', (scale) => {
    const design = widthsAt(texts, 1);
    const widths = widthsAt(texts, scale);
    // Before: each 6 before its tick, "17.5" hung further past the end, and at ×2 "15.5" ran into it.
    const before = shares.map((s) => s * AXIS - 6);
    const designEnd = before[2]! + design[2]!;
    expect(before[2]! + widths[2]!).toBeGreaterThan(designEnd);
    expect(apart(boxes(before, widths, [0, 0, 0]))).toBe(scale < 2);
    const { starts, lines } = placeNumbers(shares, widths, AXIS, scale);
    expect(lines).toEqual([0, 0, 0]);
    const placed = boxes(starts, widths, lines);
    expect(apart(placed)).toBe(true);
    expect(Math.max(...placed.map((b) => b.end))).toBeLessThanOrEqual(designEnd + 1e-9);
    expect(Math.min(...placed.map((b) => b.start))).toBeGreaterThanOrEqual(0);
    // Each still over its tick.
    starts.forEach((start, i) => {
      expect(start).toBeLessThanOrEqual(shares[i]! * AXIS);
      expect(start + widths[i]!).toBeGreaterThanOrEqual(shares[i]! * AXIS);
    });
  });

  it('the other bars too: a time bar’s last number, at the very end, hangs past it no further than designed', () => {
    // A box or fill stage: ★★★ to 40 s, ★★ to 50, ★ to 60, of 60 (its seconds at 67, 83 and 100 %).
    const time = axisOf({ by: 'timeMs', three: 40000, two: 50000, one: 60000 }, 0, 60000);
    const words = time.marks.map((m) => m.text);
    const at = (scale: number) => widthsAt(words, scale);
    const ticks = time.marks.map((m) => m.share);
    const designEnd = AXIS - 6 + at(1)[2]!;
    for (const scale of [1, FONT_SCALE_CAPS.hud]) {
      const { starts, lines } = placeNumbers(ticks, at(scale), AXIS, scale);
      const placed = boxes(starts, at(scale), lines);
      expect(apart(placed)).toBe(true);
      expect(Math.max(...placed.map((b) => b.end))).toBeLessThanOrEqual(designEnd + 1e-9);
    }
    expect(placeNumbers(ticks, at(1), AXIS, 1).starts).toEqual(ticks.map((s) => s * AXIS - 6));
  });

  it('where one line cannot hold them, every other one goes on a second line, each line apart', () => {
    const { starts, lines } = placeNumbers([0.6, 0.8, 1], [30, 30, 30], 70, 1);
    expect(lines).toEqual([0, 1, 0]);
    const placed = boxes(starts, [30, 30, 30], lines);
    expect(apart(placed)).toBe(true);
    expect(Math.min(...placed.map((b) => b.start))).toBeGreaterThanOrEqual(0);
  });

  it('on the phone at ×2.0: the HUD’s cap, a taller row, and the numbers placed by their measured widths', async () => {
    const restore = setWindow({ fontScale: 2 });
    try {
      await render(<StarsBar rule={HUNTER} value={0} testID="hunt-bar" />);
      const number = (stars: number) => screen.getByTestId(`hunt-bar-number-${stars}`, hidden);
      // Before the layout: as designed, 6 before each tick.
      expect(styleOf(number(3))).toMatchObject({
        start: `${shares[2]! * 100}%`,
        transform: [{ translateX: -6 }],
      });
      for (const stars of [1, 2, 3])
        expect(number(stars)).toHaveProp('maxFontSizeMultiplier', FONT_SCALE_CAPS.hud);
      const scale = FONT_SCALE_CAPS.hud;
      const row = screen.getByTestId('hunt-bar-numbers', hidden);
      expect(styleOf(row).height).toBe(numbersHeight(scale));
      expect(numbersHeight(1)).toBe(tokens.type.ratingCompact.lineHeight + 2);
      expect(numbersHeight(scale)).toBeGreaterThan(numbersHeight(1));

      const widths = widthsAt(texts, scale);
      const layout = (width: number) => ({ nativeEvent: { layout: { width, height: 20, x: 0, y: 0 } } });
      await fireEvent(row, 'layout', layout(AXIS));
      for (const [i, stars] of [1, 2, 3].entries())
        await fireEvent(number(stars), 'layout', layout(widths[i]!));
      const starts = [1, 2, 3].map((stars, i) => {
        const style = styleOf(number(stars)) as { transform: { translateX: number }[] };
        return shares[i]! * AXIS + style.transform[0]!.translateX;
      });
      expect(starts).toEqual(placeNumbers(shares, widths, AXIS, scale).starts);
      expect(apart(boxes(starts, widths, [0, 0, 0]))).toBe(true);
    } finally {
      await restore();
    }
  });
});
