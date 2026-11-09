import { render, screen } from '@testing-library/react-native';

import { text } from '../../../theme';
import { setWindow } from '../../ui/testing/layout';
import { ClockDigits } from '../ClockDigits';
import { CLOCK_ASCENT, CLOCK_DESCENT, CLOCK_GLYPHS, CLOCK_UNITS } from '../clockGlyphs.generated';

/**
 * Q1: a running clock is drawn as paths. On Android a text view whose text changes is an accessibility event, and
 * a clock that changes every second kept the game screen from ever settling for uiautomator. Its box must not
 * change size as it runs either (a layout pass is an event too): the digits are tabular.
 */

const hidden = { includeHiddenElements: true };
const style = text('cellRef'); // Teko 600 24 / 19
type Node = { type: unknown; props: Record<string, unknown>; children: (Node | string)[] };
/** The host elements of `type` under `node`, in drawing order. */
const host = (node: Node, type: string): Node[] => [
  ...(node.type === type ? [node] : []),
  ...node.children.flatMap((c) => (typeof c === 'string' ? [] : host(c, type))),
];
/** The drawn box (dp) and the part of the glyphs' plane it shows (units): what react-native-svg hands the view. */
const box = () => {
  const { bbWidth, bbHeight, minX, minY, vbWidth, vbHeight } = screen.getByTestId('clock', hidden).props;
  return {
    width: bbWidth as number,
    height: bbHeight as number,
    view: [minX, minY, vbWidth, vbHeight] as number[],
  };
};
const clock = () => screen.getByTestId('clock', hidden) as unknown as Node;
const paths = () => host(clock(), 'RNSVGPath').map((n) => n.props.d as string);

describe('ClockDigits', () => {
  let restore: () => Promise<void>;
  beforeEach(() => {
    restore = setWindow({ fontScale: 1 });
  });
  afterEach(async () => {
    await restore();
  });

  it('draws each character’s outline, and no text at all', async () => {
    await render(<ClockDigits value="3:12" textStyle={style} color="#eef1f6" testID="clock" />);
    expect(paths()).toEqual(['3', ':', '1', '2'].map((c) => CLOCK_GLYPHS[c]!.d));
    expect(host(screen.root as unknown as Node, 'RCTText')).toEqual([]);
  });

  it('sits in the Teko text’s line box, its baseline where a Text puts it', async () => {
    await render(<ClockDigits value="3:12" textStyle={style} color="#eef1f6" testID="clock" />);
    const k = style.fontSize! / CLOCK_UNITS;
    const width = 3 * CLOCK_GLYPHS['0']!.advance + CLOCK_GLYPHS[':']!.advance;
    expect(box().height).toBe(style.lineHeight);
    expect(box().width).toBeCloseTo(width * k, 6);
    // Half the leading over the ascent: the digits' tops (636 units up) meet the box's top at 24 / 19.
    const baseline = style.lineHeight! / k / 2 + (CLOCK_ASCENT - CLOCK_DESCENT) / 2;
    expect(box().view).toEqual([0, -baseline, width, style.lineHeight! / k]);
  });

  it('keeps its size while it runs: tabular digits, only the outlines change', async () => {
    await render(<ClockDigits value="1:11" textStyle={style} color="#eef1f6" testID="clock" />);
    const narrow = box();
    await screen.rerender(<ClockDigits value="8:08" textStyle={style} color="#eef1f6" testID="clock" />);
    expect(box()).toEqual(narrow);
    expect(paths()).toEqual(['8', ':', '0', '8'].map((c) => CLOCK_GLYPHS[c]!.d));
    for (const d of '0123456789') expect(CLOCK_GLYPHS[d]!.advance).toBe(CLOCK_GLYPHS['0']!.advance);
  });

  it('is decoration for screen readers: the element around it says the time', async () => {
    await render(<ClockDigits value="0:07" textStyle={style} color="#eef1f6" testID="clock" />);
    expect(screen.getByTestId('clock', hidden).props).toMatchObject({
      accessibilityElementsHidden: true,
      importantForAccessibility: 'no-hide-descendants',
    });
  });

  it('grows with the system text size as a Text does, up to its scale’s cap', async () => {
    await render(<ClockDigits value="0:07" textStyle={style} color="#eef1f6" testID="clock" />);
    const normal = box();
    await restore();
    restore = setWindow({ fontScale: 2 });
    await screen.rerender(<ClockDigits value="0:07" textStyle={style} color="#eef1f6" testID="clock" />);
    expect(box().height).toBeCloseTo(normal.height * 2, 6);
    expect(box().width).toBeCloseTo(normal.width * 2, 6);
    await screen.rerender(
      <ClockDigits value="0:07" textStyle={style} color="#eef1f6" scale="hud" testID="clock" />,
    );
    expect(box().height).toBeCloseTo(normal.height * 1.35, 6);
  });
});
