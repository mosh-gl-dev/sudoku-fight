import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, type TextStyle } from 'react-native';

import { STAR_SIZES } from '../../../components/levels/StarRow';
import { expectFits, layoutLanguages, PHONE, widthIn } from '../../../components/ui/testing/layout';
import i18n from '../../../i18n';
import { size, space, text, tokens } from '../../../theme';
import { ScreenHeader, TITLE_WRAP, wrapsWhole } from '../../home/parts';

/**
 * B7 (QA run 2, 2026-11-02): the level map's title, "אימון בשלבים", ended in "…" beside its "★ 8/900" chip in 12
 * languages (es, pt-BR, de, fr, ru, it, tr, id, pl, vi, th, nl). The map's header lets it take two lines and a
 * smaller size, never a word cut in the middle (ScreenHeader `wrapTitle`): the size steps down while the phone's
 * lines (onTextLayout) are more than two, cut it, or break a word. Here: those steps, and that every language's
 * title fits whole at the least size on Moshe's phone (360 dp) beside the widest chip ("★ 900/900"), measured in
 * the font the app ships (layout.ts widthIn), so the steps always end on a clean title.
 */

const TITLE = 'Entraînement par étapes';
/** An onTextLayout event: the lines as the phone drew them (only their text counts here). */
const lines = (...texts: string[]) => ({ nativeEvent: { lines: texts.map((t) => ({ text: t })) } });
const titleStyle = () => StyleSheet.flatten(screen.getByTestId('screen-title').props.style as TextStyle);

describe('wrapsWhole: the phone’s lines hold the title whole, broken between words', () => {
  it('one line, or two broken at a space', () => {
    expect(wrapsWhole(TITLE, [TITLE])).toBe(true);
    expect(wrapsWhole(TITLE, ['Entraînement ', 'par étapes'])).toBe(true);
    expect(wrapsWhole(TITLE, ['Entraînement', ' par étapes'])).toBe(true);
    // A line that drops the space it broke at.
    expect(wrapsWhole(TITLE, ['Entraînement', 'par étapes'])).toBe(true);
    expect(wrapsWhole('אימון בשלבים', ['אימון ', 'בשלבים'])).toBe(true);
  });

  it('not a word broken in the middle, three lines, or a title cut short', () => {
    expect(wrapsWhole(TITLE, ['Entraîneme', 'nt par étapes'])).toBe(false);
    expect(wrapsWhole('Etappentraining', ['Etappentrainin', 'g'])).toBe(false);
    expect(wrapsWhole(TITLE, ['Entraînement ', 'par ', 'étapes'])).toBe(false);
    expect(wrapsWhole(TITLE, ['Entraînement ', 'par'])).toBe(false);
    expect(wrapsWhole(TITLE, [])).toBe(false);
  });
});

describe('ScreenHeader wrapTitle (the level map’s header)', () => {
  it('without it, one line ended with "…", as before', async () => {
    await render(<ScreenHeader title={TITLE} />);
    expect(screen.getByRole('header')).toHaveProp('numberOfLines', 1);
    expect(screen.queryByTestId('screen-title')).toBeNull();
  });

  it('starts at the screen title’s size, every line shown, and stays there when it fits', async () => {
    await render(<ScreenHeader title={TITLE} wrapTitle />);
    const full = text('screenTitle');
    expect(titleStyle()).toMatchObject({ fontSize: full.fontSize, lineHeight: full.lineHeight });
    expect(screen.getByTestId('screen-title').props.numberOfLines).toBeUndefined();
    expect(screen.getByRole('header')).toHaveTextContent(TITLE);
    await fireEvent(screen.getByTestId('screen-title'), 'textLayout', lines('Entraînement ', 'par étapes'));
    expect(titleStyle().fontSize).toBe(full.fontSize);
  });

  it('a word broken or a third line: a step smaller, its line height with it; down to the least, then two lines', async () => {
    await render(<ScreenHeader title={TITLE} wrapTitle />);
    const full = text('screenTitle');
    await fireEvent(screen.getByTestId('screen-title'), 'textLayout', lines('Entraîneme', 'nt par étapes'));
    expect(titleStyle()).toMatchObject({
      fontSize: full.fontSize! - TITLE_WRAP.step,
      lineHeight: (full.lineHeight! * (full.fontSize! - TITLE_WRAP.step)) / full.fontSize!,
    });
    await fireEvent(
      screen.getByTestId('screen-title'),
      'textLayout',
      lines('Entraînement ', 'par ', 'étapes'),
    );
    expect(titleStyle().fontSize).toBe(full.fontSize! - 2 * TITLE_WRAP.step);
    for (let k = 0; k < 10; k++)
      await fireEvent(screen.getByTestId('screen-title'), 'textLayout', lines('Entraîneme', 'nt par étapes'));
    expect(titleStyle().fontSize).toBe(TITLE_WRAP.minSize);
    expect(screen.getByTestId('screen-title')).toHaveProp('numberOfLines', TITLE_WRAP.lines);
  });

  it('another title (another language) starts again at the full size', async () => {
    await render(<ScreenHeader title={TITLE} wrapTitle />);
    await fireEvent(screen.getByTestId('screen-title'), 'textLayout', lines('Entraîneme', 'nt par étapes'));
    expect(titleStyle().fontSize).toBeLessThan(text('screenTitle').fontSize!);
    await screen.rerender(<ScreenHeader title="אימון בשלבים" wrapTitle />);
    expect(titleStyle().fontSize).toBe(text('screenTitle').fontSize);
  });
});

/**
 * The title's room in the map's header on a 360 dp phone: the screen less its gutters (16 each side), the back
 * button (44), the header's two gaps (12) and the stars chip at its widest, "★ 900/900" (LevelMapScreen: a slate
 * face with its border, its padding 12 each side, the star and a 6 gap before the Teko count).
 */
function room(lang: string): number {
  const count = text('scoreSm');
  const chip =
    2 * tokens.border.hairline +
    2 * space[6] +
    STAR_SIZES.chip +
    3 +
    space[3] +
    widthIn(lang, '900/900', { fontFamily: count.fontFamily, fontSize: count.fontSize! });
  return PHONE.width - 2 * tokens.layout.gutterGame - size.iconButton - 2 * space[6] - chip;
}

/** The lines `title` takes in `width`, broken only at spaces (as wrapsWhole allows), at `fontSize`. */
function wrapAt(lang: string, title: string, fontSize: number, width: number): string[] | null {
  const style = { fontFamily: text('screenTitle').fontFamily, fontSize };
  const out: string[] = [];
  for (const word of title.split(' ')) {
    const joined = out.length ? `${out[out.length - 1]} ${word}` : word;
    if (out.length && widthIn(lang, joined, style) <= width) out[out.length - 1] = joined;
    else if (widthIn(lang, word, style) <= width) out.push(word);
    else return null;
  }
  return out;
}

describe('the map’s title fits whole in every language (B7)', () => {
  it.each(layoutLanguages())(
    'at the least size, beside "★ 900/900", on two lines at most (%s)',
    async (lang) => {
      await i18n.changeLanguage(lang);
      const title = i18n.t('levels:title');
      const wrapped = wrapAt(lang, title, TITLE_WRAP.minSize, room(lang));
      expectFits(
        lang,
        `levels:title "${title}" in ${Math.floor(room(lang))} dp at ${TITLE_WRAP.minSize}`,
        wrapped !== null && wrapped.length <= TITLE_WRAP.lines,
      );
    },
  );

  it('Hebrew needs no step at all: whole at the screen title’s size', async () => {
    await i18n.changeLanguage('he');
    const wrapped = wrapAt('he', i18n.t('levels:title'), text('screenTitle').fontSize!, room('he'));
    expect(wrapped).not.toBeNull();
    expect(wrapped!.length).toBeLessThanOrEqual(TITLE_WRAP.lines);
  });
});
