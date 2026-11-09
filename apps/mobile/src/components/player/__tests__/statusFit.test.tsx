import { render, screen } from '@testing-library/react-native';
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import i18n from '../../../i18n';
import { useSettings } from '../../../state/settings';
import { size, text, tokens } from '../../../theme';
import { expectFits, fixedT, layoutLanguages, typefaceOf, widthIn } from '../../ui/testing/layout';
import { ActivityLine, MistakesText } from '../ActivityLine';
import type { Activity } from '../cardModel';
import { InterferenceButton } from '../InterferenceButton';
import { metrics, rubikStyle } from '../metrics';

/**
 * B47: the status row of a 2-player card (components.md §3.2, row 3) is what its buttons leave: beside mine 63 dp,
 * beside the opponent's "הפרעה" what the button doesn't take. "Keine Fehler", "Без ошибок", "ไม่มีข้อผิดพลาด"
 * and "Überlegt" were cut with "…" on the phone. Now my mistakes wrap to a second line (two lines of body text
 * fit the 44-dp row in every script), the opponent's activity and the button share the row and shrink a little,
 * and nothing is cut before that.
 */

const hidden = { includeHiddenElements: true };
const card = tokens.layout.game.playerCard;
const MIN = metrics.card.statusMinFontScale;
const lockOn: Activity = {
  kind: 'locking',
  cell: 'A8',
  cellIndex: 7,
  remainingMs: 6000,
  expiresAt: null,
  totalMs: 12000,
  secondsLeft: 6,
  paused: false,
  turn: false,
};

type Font = { fontFamily?: string; fontWeight?: TextStyle['fontWeight']; fontSize: number };
const fontOf = (style: TextStyle): Font => ({
  fontFamily: style.fontFamily,
  fontWeight: style.fontWeight,
  fontSize: style.fontSize!,
});

/** How many lines `words` take in `room` at `scale`, broken between words (anywhere in a script without spaces). */
function lineCount(lang: string, words: string, font: Font, room: number, scale: number): number {
  const spaced = /\s/.test(words.trim());
  const pieces = spaced ? words.trim().split(/\s+/) : [...words];
  const width = (s: string) => widthIn(lang, s, font) * scale;
  let lines = 1;
  let line = '';
  for (const piece of pieces) {
    if (width(piece) > room) return Infinity;
    const next = line ? `${line}${spaced ? ' ' : ''}${piece}` : piece;
    if (width(next) <= room) line = next;
    else {
      lines += 1;
      line = piece;
    }
  }
  return lines;
}

/** The largest scale, down to MIN, at which `words` take at most `lines` lines in `room`; 0 if none. */
function fitScale(lang: string, words: string, font: Font, room: number, lines: number): number {
  for (let scale = 1; scale >= MIN - 1e-9; scale -= 0.01) {
    if (lineCount(lang, words, font, room, scale) <= lines) return scale;
  }
  return 0;
}

/**
 * The opponent's "thinking" row in `lang`, as Yoga lays it out: the activity ("Überlegt…") and the button both
 * shrink by what overflows, in proportion to their widths; then each shrinks its words to its share.
 * Returns the scale each needs.
 */
async function thinkingRow(lang: string): Promise<{ word: number; label: number }> {
  const t = await fixedT(lang, 'player');
  const typeface = typefaceOf(lang);
  const body = fontOf(text('body', typeface));
  const m = metrics.interfere;
  const label = widthIn(lang, t('interfere.button'), fontOf(rubikStyle(14, '600', typeface)));
  const frame = 2 * m.paddingX + m.icon + m.gap + 2 * tokens.border.hairline;
  const word = widthIn(lang, t('activity.thinking'), body);
  const dots = widthIn(lang, t('ellipsis'), body);
  const activity = word + dots;
  const button = frame + label;
  const over = Math.max(0, activity + card.actionsGap + button - size.playerCard.width);
  const share = (w: number) => w - (over * w) / (activity + button);
  return {
    word: Math.min(1, (share(activity) - dots) / word),
    label: Math.min(1, (share(button) - frame) / label),
  };
}

describe('the status row’s words (B47)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('he');
    useSettings.setState({ reduceMotion: 'off' });
  });

  it('my mistakes wrap to two lines, then shrink to fit; never one line cut short', async () => {
    await render(<MistakesText count={0} />);
    expect(screen.getByTestId('mistakes', hidden).props).toMatchObject({
      numberOfLines: 2,
      adjustsFontSizeToFit: true,
      minimumFontScale: MIN,
    });
  });

  it('the opponent’s word shrinks on its line; with a cell, the cell may take a second line', async () => {
    await render(<ActivityLine activity={{ kind: 'thinking' }} colorIndex={1} />);
    const word = screen.getByText('חושב', hidden);
    expect(word.props).toMatchObject({ numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: MIN });
    // "חושב…": the blinking ellipsis follows its word with no gap.
    expect(StyleSheet.flatten(screen.getByTestId('activity', hidden).props.style as ViewStyle).gap).toBe(0);
    await render(<ActivityLine activity={lockOn} colorIndex={1} />);
    expect(screen.getByText(/בוחר/, hidden).props).toMatchObject({
      numberOfLines: 2,
      adjustsFontSizeToFit: true,
    });
  });

  it('"הפרעה" gives way beside a long activity: the button may shrink, its word shrinks to fit', async () => {
    await render(
      <InterferenceButton name="NinaVolt" state={{ kind: 'available', cost: 2 }} testID="interfere" />,
    );
    expect(StyleSheet.flatten(screen.getByTestId('interfere').props.style as ViewStyle)).toMatchObject({
      flexShrink: 1,
      minWidth: 0,
    });
    expect(screen.getByTestId('interfere-label', hidden).props).toMatchObject({
      numberOfLines: 1,
      adjustsFontSizeToFit: true,
      minimumFontScale: metrics.interfere.minFontScale,
    });
  });

  it('two lines of body text fit the 44-dp row in every script', () => {
    for (const lang of layoutLanguages()) {
      const line = text('body', typefaceOf(lang)).lineHeight!;
      expect({ lang, fits: 2 * line <= card.actionsRowHeight }).toEqual({ lang, fits: true });
    }
  });

  describe.each(layoutLanguages())('in %s', (lang) => {
    it('my mistakes fit beside my two buttons, in two lines at 3/4 size or more', async () => {
      const t = await fixedT(lang, 'player');
      const body = fontOf(text('body', typefaceOf(lang)));
      const room = size.playerCard.width - 2 * size.iconButton - 2 * card.actionsGap;
      for (const count of [0, 1, 12]) {
        const words = t('mistakes.short', { count });
        expectFits(lang, `player:mistakes.short "${words}"`, fitScale(lang, words, body, room, 2) >= MIN);
      }
    });

    // In every language: where they were too long, the words were shortened (D124): es "Piensa", pt-BR "Pensa",
    // fr "Pense", vi "Nghĩ", ar "يفكر", and the button nl "Storen", tr "Baltala".
    it('the opponent’s "thinking" and "הפרעה" share the row, each at 3/4 size or more', async () => {
      const { word, label } = await thinkingRow(lang);
      expectFits(
        lang,
        `the word ${word.toFixed(2)} and the button ${label.toFixed(2)}`,
        word >= MIN && label >= MIN,
      );
    });
  });
});
