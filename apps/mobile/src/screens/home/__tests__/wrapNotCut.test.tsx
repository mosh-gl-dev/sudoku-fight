import 'react-native-reanimated';

import { render, screen } from '@testing-library/react-native';
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { Rating } from '../../../components/player/Rating';
import { metrics } from '../../../components/player/metrics';
import { ROW_TITLE_LINES, RowButton } from '../../../components/ui/RowButton';
import { LARGE_TEXT_SCALE } from '../../../components/ui';
import { fixedT, layoutLanguages, PHONE, setWindow, widthIn } from '../../../components/ui/testing/layout';
import i18n from '../../../i18n';
import { size, space, tokens } from '../../../theme';
import { TAGLINE_LINES } from '../ModesScreen';
import { GUTTER, linesAt, SECTION_NOTE_LINES, SECTION_RULE_MIN, SectionLabel } from '../parts';

type Mocks = typeof import('../testing/nativeMocks');
// ModesScreen (its TAGLINE_LINES) reaches the sounds and haptics.
jest.mock('expo-audio', () => jest.requireActual<Mocks>('../testing/nativeMocks').expoAudio);
jest.mock('expo-haptics', () => jest.requireActual<Mocks>('../testing/nativeMocks').expoHaptics);

/**
 * Words that used to end in "…" in en-XA (QA 2026-11-03; English about 40 % longer, as a long translation would
 * be) take a second line instead, broken between words: Home's "זמני" under each rating, a section's note
 * ("מדורג ——— …" on "משחק חדש"), a row's tagline there ("שלבים קצרים · עד 3 כוכבים") and a row button's title
 * (Settings' "הסתרת אזור הבדיקה"). Every layout language, en-XA too, fits its words in two lines on a 360 dp phone;
 * a real language keeps them on one, so Hebrew and English look as before (their own fit tests: HomeAccount,
 * modesFit, ModesAndGameType). Widths in the app's font (layout.ts widthIn).
 */

const hidden = { includeHiddenElements: true };
const styleOf = (el: { props: { style?: unknown } }) =>
  (StyleSheet.flatten(el.props.style as TextStyle) ?? {}) as TextStyle;
type Font = { fontFamily: string; fontSize: number };
const fontOf = (name: keyof typeof tokens.type): Font => ({
  fontFamily: tokens.type[name].fontFamily,
  fontSize: tokens.type[name].size,
});
/** A script that breaks a line anywhere (no spaces between its words). */
const BREAKS_ANYWHERE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u;

/** How many lines `words` take in `room`, broken between words as the phone does (anywhere in CJK and Thai). */
function linesOf(lang: string, words: string, font: Font, room: number): number {
  const width = (s: string) => widthIn(lang, s, font);
  if (BREAKS_ANYWHERE.test(words)) return Math.ceil(width(words) / room);
  let lines = 1;
  let line = '';
  for (const word of words.split(/\s+/)) {
    if (width(word) > room) return Infinity;
    const next = line ? `${line} ${word}` : word;
    if (width(next) <= room) line = next;
    else {
      lines += 1;
      line = word;
    }
  }
  return lines;
}

/** Home's rating column, a third of the profile card (HomeAccount.test), less the chip's padding and border. */
const RATING_CHIP_ROOM =
  (PHONE.width - 2 * GUTTER.home - 2 * tokens.layout.home.profileCardPadding - 2 * tokens.border.hairline) /
    3 -
  2 * metrics.rating.provisionalPaddingX -
  2 * tokens.border.hairline;
/** A section label's row on "משחק חדש" (modesFit.test): the screen less its gutters, the icon and three gaps. */
const SECTION_ROW = PHONE.width - 2 * GUTTER.screen - size.icon.inline - 3 * space[4];
/** A "משחק חדש" row's texts: less its border, padding, the 44 picture, two gaps and the chevron. */
const TAGLINE_ROOM =
  PHONE.width -
  2 * GUTTER.screen -
  2 * tokens.border.hairline -
  2 * space[6] -
  size.avatar.card.frame -
  2 * space[6] -
  size.icon.chevron;
/** A row button in Settings: the screen less its gutters, the card's border, padding, icon, gaps and chevron. */
const ROW_TITLE_ROOM =
  PHONE.width -
  2 * GUTTER.screen -
  2 * tokens.border.hairline -
  2 * space[8] -
  size.icon.row -
  2 * space[7] -
  size.icon.chevron;

describe('words wrap to a second line rather than end in "…" (QA 2026-11-03, en-XA)', () => {
  it('has the rooms of a 360 dp phone, and two lines for each', () => {
    expect([RATING_CHIP_ROOM, SECTION_ROW, TAGLINE_ROOM, ROW_TITLE_ROOM]).toEqual([76, 286, 214, 224]);
    expect([SECTION_NOTE_LINES, TAGLINE_LINES, ROW_TITLE_LINES]).toEqual([2, 2, 2]);
  });

  it('Home’s "זמני" under its number: a line per word (two at most), centred; beside a number still one', async () => {
    await i18n.changeLanguage('he');
    await render(<Rating value={1200} size="home" provisional testID="home" />);
    // One word, one line: a word too long for its column steps down rather than break (largeTextChips.test).
    const word = screen.getByText('זמני', hidden);
    expect(word).toHaveProp('numberOfLines', 1);
    expect(styleOf(word).textAlign).toBe('center');
    await screen.unmount();
    await i18n.changeLanguage('en-XA');
    await render(<Rating value={1200} size="home" provisional testID="pseudo" />);
    expect(screen.getByText(i18n.t('player:rating.provisional'), hidden)).toHaveProp('numberOfLines', 2);
    await screen.unmount();
    await i18n.changeLanguage('he');
    await render(<Rating value={1200} size="list" provisional testID="list" />);
    expect(screen.getByText('זמני', hidden)).toHaveProp('numberOfLines', 1);
  });

  it('a section’s note: two lines, and the rule before it keeps its 16', async () => {
    // At the normal text size (Jest's window is at fontScale 2, where nothing is capped: linesAt).
    const restore = setWindow(PHONE);
    await render(<SectionLabel title="מדורג" note="יריבים אמיתיים, בזמן אמת" />);
    const note = screen.getByText('יריבים אמיתיים, בזמן אמת');
    expect(note).toHaveProp('numberOfLines', SECTION_NOTE_LINES);
    await restore();
    const rule = (note as unknown as { parent: { children: { props: { style?: unknown } }[] } }).parent
      .children[1]!;
    expect(styleOf(rule) as ViewStyle).toMatchObject({ flex: 1, minWidth: SECTION_RULE_MIN });
    expect(SECTION_RULE_MIN).toBe(16);
  });

  it('large text (QA levels-new-game-small-phone): a section’s note is not capped, it wraps', async () => {
    expect([linesAt(1, 2), linesAt(1.14, 1), linesAt(LARGE_TEXT_SCALE, 2), linesAt(2, 1)]).toEqual([
      2,
      1,
      undefined,
      undefined,
    ]);
    const restore = setWindow({ ...PHONE, fontScale: 2 });
    await render(<SectionLabel title="Ranked" note="Real opponents, in real time" />);
    expect(screen.getByText('Real opponents, in real time')).not.toHaveProp('numberOfLines');
    await restore();
  });

  it('a row button’s title: two lines; its subtitle one', async () => {
    await render(<RowButton icon="eyeOff" title="הסתרת אזור הבדיקה" subtitle="תת־כותרת" />);
    expect(screen.getByText('הסתרת אזור הבדיקה')).toHaveProp('numberOfLines', ROW_TITLE_LINES);
    expect(screen.getByText('תת־כותרת')).toHaveProp('numberOfLines', 1);
    // Two lines of the title, the gap and the subtitle fit the row's 64.
    const title = tokens.type.rowTitle.lineHeight;
    expect(ROW_TITLE_LINES * title + space[2] + tokens.type.caption.lineHeight).toBeLessThanOrEqual(
      size.listRow,
    );
  });

  it.each(layoutLanguages())(
    'each of them fits two lines, its words whole, on a 360 dp phone (%s)',
    async (lang) => {
      await i18n.changeLanguage(lang);
      const fits = (place: string, words: string, font: Font, room: number, max: number) =>
        expect({ lang, place, words, lines: linesOf(lang, words, font, room) <= max }).toEqual({
          lang,
          place,
          words,
          lines: true,
        });
      fits(
        'player:rating.provisional',
        i18n.t('player:rating.provisional'),
        fontOf('plateNameCompact'),
        RATING_CHIP_ROOM,
        2,
      );
      for (const group of ['ranked', 'practice']) {
        const title = widthIn(lang, i18n.t(`home:modes.groups.${group}.title`), fontOf('label'));
        const note = i18n.t(`home:modes.groups.${group}.note`);
        fits(
          `home:modes.groups.${group}.note`,
          note,
          fontOf('caption'),
          SECTION_ROW - title - SECTION_RULE_MIN,
          SECTION_NOTE_LINES,
        );
      }
      for (const tagline of [
        i18n.t('home:modes.levels.tagline'),
        i18n.t('home:modes.levels.taglineNew', { count: 300, total: 300 }),
      ])
        fits('home:modes.levels tagline', tagline, fontOf('caption'), TAGLINE_ROOM, TAGLINE_LINES);
      // Settings' testing section is English in every real language (D109, dev.json); en-XA has its own.
      const td = await fixedT(lang, 'dev');
      fits(
        'dev:testingSection.hide',
        td('testingSection.hide'),
        fontOf('rowTitle'),
        ROW_TITLE_ROOM,
        ROW_TITLE_LINES,
      );
    },
  );
});
