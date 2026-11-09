import 'react-native-reanimated';

import { GAME_TYPES } from '@sudoku-fight/engine';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { metrics } from '../../../components/player/metrics';
import { Rating } from '../../../components/player/Rating';
import { fixedT, layoutLanguages, PHONE, setWindow, widthIn } from '../../../components/ui/testing/layout';
import type { PracticeGameRecord } from '../../../game/practiceRepo';
import i18n from '../../../i18n';
import { useSettings } from '../../../state/settings';
import { size, space, text, tokens } from '../../../theme';
import { CHIP, Chip, GUTTER } from '../parts';
import { RecentGames, TITLE_LINES } from '../RecentGames';

/**
 * QA levels-new-game-small-phone (loop 5), a 360 × 780 dp phone:
 * - at font scale 2.0, "משחק חדש"'s chips ("ללא דירוג", "עובד גם בלי אינטרנט", "שלב 76 • ★ 130", "גם אופליין")
 *   kept a fixed 22 dp height, so the border cut the bottom of their words. A chip grows with the text now
 *   (a least height, no height) and its words wrap rather than end in "…".
 * - at font scale 1.3 in English, Home's "Provisional" under a rating broke inside the word ("Provisiona" /
 *   "l"), and the recent games' titles ended in "…" ("Practice…", "Solo pra…"). The chip takes a line per word
 *   and a too-wide word steps down toward the design's size (never below it); a title wraps.
 */

const flat = (style: unknown) => (StyleSheet.flatten(style as ViewStyle) ?? {}) as ViewStyle & TextStyle;
const hidden = { includeHiddenElements: true };
type Font = { fontFamily: string; fontSize: number };
const fontOf = (name: Parameters<typeof text>[0]): Font => ({
  fontFamily: text(name).fontFamily!,
  fontSize: text(name).fontSize!,
});
/** A script that breaks a line anywhere (no spaces between its words). */
const BREAKS_ANYWHERE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u;
const wordsOf = (line: string) => (BREAKS_ANYWHERE.test(line) ? [] : line.split(/\s+/).filter(Boolean));

beforeEach(async () => {
  await i18n.changeLanguage('he');
  useSettings.setState({ reduceMotion: 'on' });
});

describe('a chip grows with the text (font scale 2.0, "משחק חדש")', () => {
  it.each([1, 1.3, 2])(
    'has no fixed height, and a least one that grows (font scale %s)',
    async (fontScale) => {
      const restore = setWindow({ ...PHONE, fontScale });
      await render(
        <>
          <Chip label="ללא דירוג" testID="plain" />
          <Chip label="שלב 76 ·" icon="star" value="130" testID="progress" />
        </>,
      );
      for (const id of ['plain', 'progress']) {
        const style = flat(screen.getByTestId(id).props.style);
        expect(style.height).toBeUndefined();
        expect(style.minHeight).toBe(CHIP.height * fontScale);
        // Its words' line fits inside it (the line height grows with the text as the chip does).
        expect(tokens.type.micro.lineHeight * fontScale + 2 * CHIP.border).toBeLessThanOrEqual(
          num(style.minHeight),
        );
      }
      const words = screen.getByText('ללא דירוג');
      // At the normal size, the design's one line; once the text is large, as many as the words need.
      if (fontScale === 1) expect(words).toHaveProp('numberOfLines', 1);
      else expect(words).not.toHaveProp('numberOfLines');
      // The words give way to the star and the number, and the chip to its row.
      expect(flat(screen.getByText('שלב 76 ·').props.style).flexShrink).toBe(1);
      expect(flat(screen.getByTestId('plain').props.style)).toMatchObject({
        flexShrink: 1,
        maxWidth: '100%',
      });
      await restore();
    },
  );

  it('keeps the design’s 22 at the normal size (and below it)', async () => {
    const restore = setWindow({ ...PHONE, fontScale: 0.85 });
    await render(<Chip label="Unrated" testID="plain" />);
    expect(flat(screen.getByTestId('plain').props.style)).toMatchObject({
      minHeight: 22,
      paddingVertical: 0,
    });
    await restore();
  });
});

/** Home's rating column, a third of the profile card, less the chip's padding and border (wrapNotCut.test). */
const RATING_CHIP_ROOM =
  (PHONE.width - 2 * GUTTER.home - 2 * tokens.layout.home.profileCardPadding - 2 * tokens.border.hairline) /
    3 -
  2 * metrics.rating.provisionalPaddingX -
  2 * tokens.border.hairline;

describe('Home’s "Provisional" never breaks inside the word (font scale 1.3)', () => {
  it('in English at 1.3: one line for its one word, stepping down toward the design’s size, never below', async () => {
    await i18n.changeLanguage('en');
    const restore = setWindow({ ...PHONE, fontScale: 1.3 });
    await render(<Rating value={1200} size="home" provisional testID="home" />);
    const word = screen.getByText('Provisional', hidden);
    expect(word).toHaveProp('numberOfLines', 1);
    expect(word).toHaveProp('adjustsFontSizeToFit', true);
    expect(word).toHaveProp('minimumFontScale', 1 / 1.3);
    // The design's size itself (plateNameCompact, 11) is never shrunk.
    expect(flat(word.props.style).fontSize).toBe(tokens.type.plateNameCompact.size);
    await restore();
  });

  it('at the normal size nothing steps down; beside a number (lists, cards) one line as before', async () => {
    await i18n.changeLanguage('en');
    const restore = setWindow(PHONE);
    await render(<Rating value={1200} size="home" provisional testID="home" />);
    const word = screen.getByText('Provisional', hidden);
    expect(word).toHaveProp('numberOfLines', 1);
    expect(word).not.toHaveProp('adjustsFontSizeToFit');
    await render(<Rating value={1200} size="list" provisional testID="list" />);
    expect(screen.getByText('Provisional', hidden)).toHaveProp('numberOfLines', 1);
    await restore();
  });

  it('the play surface’s cap (scale "hud") bounds how far it steps down', async () => {
    await i18n.changeLanguage('en');
    const restore = setWindow({ ...PHONE, fontScale: 2 });
    await render(<Rating value={1200} size="home" provisional scale="hud" testID="home" />);
    expect(screen.getByText('Provisional', hidden)).toHaveProp('minimumFontScale', 1 / 1.35);
    await restore();
  });

  it.each(layoutLanguages())(
    'every word fits its column at the design’s size, and one too wide at 1.3 or 2.0 may step down (%s)',
    async (lang) => {
      const t = await fixedT(lang, 'player');
      const label = t('rating.provisional');
      const font = fontOf('plateNameCompact');
      const pieces = BREAKS_ANYWHERE.test(label) ? [label] : wordsOf(label);
      for (const piece of pieces)
        expect({ lang, piece, fits: widthIn(lang, piece, font) <= RATING_CHIP_ROOM }).toEqual({
          lang,
          piece,
          fits: true,
        });
      await i18n.changeLanguage(lang);
      for (const fontScale of [1.3, 2]) {
        const restore = setWindow({ ...PHONE, fontScale });
        await render(<Rating value={1200} size="home" provisional testID="home" />);
        const word = screen.getByText(label, hidden);
        // A line per word (two at most): a word broken in two would need a line more, so it steps down instead.
        expect(word).toHaveProp('numberOfLines', Math.min(2, Math.max(1, pieces.length)));
        expect(word).toHaveProp('adjustsFontSizeToFit', true);
        await screen.unmount();
        await restore();
      }
    },
  );
});

const record = (over: Partial<PracticeGameRecord> = {}): PracticeGameRecord => ({
  id: 'g1',
  mode: 'solo',
  gameType: 'normal',
  puzzleId: 'p1',
  playerId: 'me',
  seed: 1,
  startedAt: Date.UTC(2026, 9, 23, 9, 41),
  endedAt: Date.UTC(2026, 9, 23, 9, 50),
  status: 'finished',
  endReason: 'practiceEnded',
  score: 84.5,
  mistakes: 2,
  correct: 30,
  durationMs: 540_000,
  opponents: [],
  place: 1,
  outcome: null,
  engineVersion: 'test',
  ...over,
});

describe('a recent game’s title wraps, never "…" (font scale 1.3, Home)', () => {
  it('at 1.3 in English it is not capped; at the normal size it takes two lines at most', async () => {
    await i18n.changeLanguage('en');
    const title = i18n.t('home:recent.title', {
      mode: i18n.t('home:modes.solo.name'),
      type: i18n.t('home:gameTypes.normal.name'),
    });
    let restore = setWindow({ ...PHONE, fontScale: 1.3 });
    await render(<RecentGames games={[record()]} status="ready" onOpen={jest.fn()} />);
    expect(screen.getByText(title)).not.toHaveProp('numberOfLines');
    await screen.unmount();
    await restore();
    restore = setWindow(PHONE);
    await render(<RecentGames games={[record()]} status="ready" onOpen={jest.fn()} />);
    expect(screen.getByText(title)).toHaveProp('numberOfLines', TITLE_LINES);
    expect(TITLE_LINES).toBe(2);
    await restore();
  });

  it('at 1.3 the score and the mistakes go under the words (the row keeps its width for them)', async () => {
    await i18n.changeLanguage('en');
    let restore = setWindow({ ...PHONE, fontScale: 1.3 });
    await render(<RecentGames games={[record()]} status="ready" onOpen={jest.fn()} />);
    const texts = (screen.getByTestId('recent-sub-g1') as unknown as { parent: unknown }).parent;
    expect((screen.getByTestId('recent-numbers-g1') as unknown as { parent: unknown }).parent).toBe(texts);
    expect(flat(screen.getByTestId('recent-numbers-g1').props.style)).toMatchObject({
      flexDirection: 'row',
      flexWrap: 'wrap',
    });
    expect(screen.getByText(i18n.t('player:mistakes.short', { count: 2 }))).not.toHaveProp('numberOfLines');
    await screen.unmount();
    await restore();
    // At the normal size, the column at the row's end as in the design.
    restore = setWindow(PHONE);
    await render(<RecentGames games={[record()]} status="ready" onOpen={jest.fn()} />);
    expect((screen.getByTestId('recent-numbers-g1') as unknown as { parent: unknown }).parent).not.toBe(
      (screen.getByTestId('recent-sub-g1') as unknown as { parent: unknown }).parent,
    );
    await restore();
  });

  // The row's words column with large text: the screen less the gutters, the card's border and padding, the 36
  // avatar and its gap (the numbers are under the words, and the chevron is gone). The words grow with the font scale.
  const WORDS_COLUMN =
    PHONE.width -
    2 * GUTTER.home -
    2 * tokens.border.hairline -
    2 * space[6] -
    size.avatar.list.size -
    space[6];

  it('with large text the row has no chevron (its room goes to the words); at the normal size it has', async () => {
    let restore = setWindow({ ...PHONE, fontScale: 2 });
    await render(<RecentGames games={[record()]} status="ready" onOpen={jest.fn()} />);
    expect(screen.queryByTestId('icon-chevronForward', { includeHiddenElements: true })).toBeNull();
    await screen.unmount();
    await restore();
    restore = setWindow(PHONE);
    await render(<RecentGames games={[record()]} status="ready" onOpen={jest.fn()} />);
    expect(screen.getByTestId('icon-chevronForward', { includeHiddenElements: true })).toBeTruthy();
    await screen.unmount();
    await restore();
  });

  it.each(layoutLanguages().flatMap((lang) => [1.3, 2].map((scale) => [lang, scale] as const)))(
    'each word of every title has a line of its own (%s, font scale %s)',
    async (lang, scale) => {
      const t = await fixedT(lang, 'home');
      for (const mode of ['solo', 'bot'] as const)
        for (const type of GAME_TYPES) {
          const title = t('recent.title', {
            mode: t(`modes.${mode}.name`),
            type: t(`gameTypes.${type}.name`),
          });
          for (const word of wordsOf(title))
            expect({
              lang,
              word,
              fits: scale * widthIn(lang, word, fontOf('rowTitle')) <= WORDS_COLUMN,
            }).toEqual({
              lang,
              word,
              fits: true,
            });
        }
    },
  );
});

function num(v: unknown): number {
  return typeof v === 'number' ? v : 0;
}
