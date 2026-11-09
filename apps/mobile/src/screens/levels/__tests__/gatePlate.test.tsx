import 'react-native-reanimated';

import type { GateState } from '@sudoku-fight/engine';
import { render, screen } from '@testing-library/react-native';

import {
  expectFits,
  expectRoom,
  layoutLanguages,
  lineHeightAs,
  widthIn,
} from '../../../components/ui/testing/layout';
import i18n from '../../../i18n';
import { useSettings } from '../../../state/settings';
import { size, space, tokens } from '../../../theme';
import { GATE_SIGN_TEXT, GatePlate } from '../GatePlate';
import { MAP, mapLayout } from '../mapModel';

/**
 * A closed gate's sign (components.md §19.3) says its whole line. On the phone (Claude on the phone, 31.10.2026)
 * it showed "נפתח ב־20 כו…": one line beside the star count, too narrow. Now the words take the plate's whole
 * width, up to two lines, over the lock, the bar and "8/20", and the plate grows to fit them. Measured in the
 * font the app ships (fontMetrics: the glyphs' real advances; estimated by script where a language takes the
 * system's font: layout.ts widthIn), in every layout language the app has strings for, at the default text
 * scale, on a 360–412 dp phone (the sign is 220 wide on any of them, between the gateway's pillars).
 */

const STYLE = tokens.type[GATE_SIGN_TEXT.type];
const FONT = { fontFamily: STYLE.fontFamily, fontSize: STYLE.size };
/** The row under the words: the lock (18), the bar, the star (16) and the count (Teko, 18 high). */
const ROW = Math.max(size.icon.inline, tokens.type.scoreDelta.lineHeight, 16);
/** The plate's height around its words: the border, the padding (4 each side) and the gap over the row. */
const CHROME = 2 * tokens.border.hairline + 2 * space[2] + space[2] + ROW;
/** The stars a gate can ask: one, the rule's 20, and a whole chapter's 30. */
const NEEDS = [1, 2, 5, 20, 30];

/** The scripts that write words without spaces, where a line may break between any two letters. */
const NO_SPACES = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u;

/** How many lines `line` takes at `width` dp, breaking between words (a word wider than a line: Infinity). */
function linesOf(lang: string, line: string, width: number): number {
  const measure = (s: string) => widthIn(lang, s, FONT);
  const spaced = !NO_SPACES.test(line);
  const parts = spaced ? line.split(' ') : [...line];
  let lines = 1;
  let current = '';
  for (const part of parts) {
    const next = current === '' ? part : `${current}${spaced ? ' ' : ''}${part}`;
    if (measure(next) <= width) current = next;
    else {
      if (measure(part) > width) return Infinity;
      lines++;
      current = part;
    }
  }
  return lines;
}

/** Every line a closed sign may show in the language now: the stars it needs (each plural), and the boss's. */
const signLines = (): string[] => [
  ...NEEDS.map((n) => i18n.t('levels:gate.need', { count: n, need: n })),
  i18n.t('levels:gate.boss'),
];

const gate = (stars: number, need = 20, bossPlayed = false): GateState => ({
  chapter: 4,
  stars,
  need,
  bossPlayed,
  open: false,
});

beforeEach(async () => {
  await i18n.changeLanguage('he');
  useSettings.setState({ reduceMotion: 'on' });
});

describe('the closed gate sign says its whole line', () => {
  it('gives the words the plate’s whole inner width (194 of 220), up to two lines', () => {
    expect(MAP.sign.closed.w).toBe(220);
    expect(GATE_SIGN_TEXT.width).toBe(194);
    expect(GATE_SIGN_TEXT.lines).toBe(2);
  });

  it('in Hebrew, "נפתח ב־20 כוכבים" takes one line, with room to spare (the phone showed "נפתח ב־20 כו…")', () => {
    const line = i18n.t('levels:gate.need', { count: 20, need: 20 });
    expect(line).toBe('נפתח ב־20 כוכבים');
    const width = widthIn('he', line, FONT);
    expect(linesOf('he', line, GATE_SIGN_TEXT.width)).toBe(1);
    expect(width).toBeLessThan(0.75 * GATE_SIGN_TEXT.width);
  });

  it.each(layoutLanguages())(
    'every line fits two lines of the plate, and the plate its box (%s)',
    async (lang) => {
      await i18n.changeLanguage(lang);
      const lineHeight = lineHeightAs(lang, { ...FONT, lineHeight: STYLE.lineHeight });
      for (const line of signLines()) {
        // the words, with 4 % to spare for kerning and the phone's own rounding
        const lines = linesOf(lang, line, GATE_SIGN_TEXT.width / 1.04);
        expectFits(lang, `levels:gate "${line}": ${lines} lines`, lines <= GATE_SIGN_TEXT.lines);
        if (lines <= GATE_SIGN_TEXT.lines)
          expectRoom(lang, `the plate of "${line}"`, CHROME + lines * lineHeight, MAP.sign.closed.face);
      }
      // the count beside the bar: "30/30" with the lock and the star, and room left for the bar
      const count = widthIn(lang, i18n.t('levels:gate.count', { stars: 30, need: 30 }), {
        fontFamily: tokens.type.scoreDelta.fontFamily,
        fontSize: tokens.type.scoreDelta.size,
      });
      expectRoom(
        lang,
        'levels:gate.count',
        size.icon.inline + 16 + count + 3 * space[4] + 40,
        GATE_SIGN_TEXT.width,
      );
    },
  );

  it.each([360, 390, 412])('hangs between the pillars and above the barrier on a %i dp phone', (width) => {
    const item = mapLayout(width, 'down', { plateOf: () => 'closed' }).chapters[2]!;
    const { sign, pillars, barrier, banner } = item.gateway;
    const [left, right] = pillars!;
    expect(sign!.x).toBeGreaterThanOrEqual(left!.x + left!.w);
    expect(sign!.x + sign!.w).toBeLessThanOrEqual(right!.x);
    expect(sign!.y).toBeGreaterThan(banner.y + banner.h);
    // at its tallest (two lines of a tall script) it still ends above the barrier across the road
    expect(sign!.y + MAP.sign.closed.face).toBeLessThan(barrier!.y);
    expect(sign!.h).toBe(MAP.sign.closed.face);
  });

  it('draws the whole line, up to two lines, over the lock, the bar and the count', async () => {
    await render(
      <GatePlate
        chapter={5}
        gate={gate(8)}
        width={MAP.sign.closed.w}
        height={MAP.sign.closed.h}
        selected={false}
        onPress={() => {}}
      />,
    );
    const line = screen.getByTestId('gate-5-line');
    expect(line).toHaveTextContent('נפתח ב־20 כוכבים');
    expect(line).toHaveProp('numberOfLines', 2);
    expect(screen.getByTestId('gate-5-count')).toHaveTextContent('⁦8/20⁩');
    // the plate hangs from its box's top: a touch target at least, the box at most
    const plate = screen.getByTestId('gate-5');
    const style = Object.assign({}, ...[plate.props.style].flat(Infinity).filter(Boolean)) as Record<
      string,
      unknown
    >;
    expect(style.minHeight).toBe(size.touch);
    expect(style.maxHeight).toBe(MAP.sign.closed.h);
    expect(style.height).toBeUndefined();
  });

  it('the boss’s line too, when the stars are there but the boss is not played', async () => {
    await render(
      <GatePlate
        chapter={5}
        gate={gate(22)}
        width={MAP.sign.closed.w}
        height={MAP.sign.closed.h}
        selected={false}
        onPress={() => {}}
      />,
    );
    expect(screen.getByTestId('gate-5-line')).toHaveTextContent(i18n.t('levels:gate.boss'));
    expect(screen.getByTestId('gate-5-line')).toHaveProp('numberOfLines', 2);
  });
});
