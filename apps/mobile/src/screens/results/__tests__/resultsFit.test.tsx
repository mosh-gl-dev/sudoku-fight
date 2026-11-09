import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import {
  expectRoom,
  layoutLanguages,
  PHONE,
  setWindow,
  widthIn,
} from '../../../components/ui/testing/layout';
import i18n from '../../../i18n';
import { useProfile } from '../../../state/profile';
import { useSettings } from '../../../state/settings';
import { size, space, text, tokens } from '../../../theme';
import { BOT } from '../../game/testing/duel';
import { loadPracticeResults, type ResultsLoad } from '../resultsModel';
import { breaksInsideWord, ResultsScreen } from '../ResultsScreen';
import { lostDuel, type SavedDuel } from '../testing/duelGames';
import { endedPractice, type SavedPractice } from '../testing/practiceGames';

/**
 * The results' lines in every language and text size (QA run #2: B17, B21, B22): nothing is cut and no word is
 * broken in two. The four counts of the move of the game go two by two (then one a line) when a label breaks
 * inside a word; the header and an award's line wrap between words; "משחק חדש" and "צפייה חוזרת" stay side by
 * side at the normal text size, each label shrinking in its own half.
 */

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../../../services/feedback', () => ({ cue: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const hidden = { includeHiddenElements: true };

const fromDisk = (game: SavedPractice | SavedDuel) => (id: string) =>
  loadPracticeResults(id, { repo: async () => game.repo, session: () => null });

async function show(load: (id: string) => Promise<ResultsLoad>, id: string) {
  await render(<ResultsScreen gameId={id} load={load} onNewGame={jest.fn()} onHome={jest.fn()} />);
  await act(async () => {
    await new Promise((r) => setImmediate(r));
  });
}

let restore: (() => Promise<void>) | null = null;

beforeEach(async () => {
  await i18n.changeLanguage('he');
  useSettings.setState({ reduceMotion: 'on' });
  useProfile.setState({ avatarId: 'fox' });
  restore = setWindow(PHONE);
});

afterEach(async () => {
  await restore?.();
  restore = null;
});

describe('breaksInsideWord: whether a label was broken inside a word', () => {
  it('between two letters of a word: yes (the A16 at the largest text, B17)', () => {
    expect(breaksInsideWord('בשורה', ['בשור', 'ה'])).toBe(true);
    expect(breaksInsideWord('ספרות 6 בלוח', ['ספרו', 'ת 6 ', 'בלוח'])).toBe(true);
    expect(breaksInsideWord('4er auf dem Spielfeld', ['4er auf ', 'dem ', 'Spielfel', 'd'])).toBe(true);
  });

  it('at a space, the space on the line or not: no', () => {
    expect(breaksInsideWord('ספרות 6 בלוח', ['ספרות 6 ', 'בלוח'])).toBe(false);
    expect(breaksInsideWord('ספרות 6 בלוח', ['ספרות 6', 'בלוח'])).toBe(false);
    expect(breaksInsideWord('in der Zeile', ['in der', 'Zeile'])).toBe(false);
    expect(breaksInsideWord('בשורה', ['בשורה'])).toBe(false);
  });

  it('in a script without spaces (Japanese, Chinese, Thai) any break is a break between letters: no', () => {
    expect(breaksInsideWord('同じブロック', ['同じブロ', 'ック'])).toBe(false);
    expect(breaksInsideWord('盘面上的5', ['盘面上', '的5'])).toBe(false);
    expect(breaksInsideWord('บนกระดาน', ['บนกระ', 'ดาน'])).toBe(false);
  });

  it('after a hyphen or a zero-width space (a translation’s break hint): no; lines it can’t place: no', () => {
    expect(breaksInsideWord('Box-Linie', ['Box-', 'Linie'])).toBe(false);
    expect(breaksInsideWord('Spiel​feld', ['Spiel​', 'feld'])).toBe(false);
    expect(breaksInsideWord('בשורה', ['בשו…'])).toBe(false);
    expect(breaksInsideWord('בשורה', ['abc', 'de'])).toBe(false);
  });
});

describe('the counts of the move of the game (B17, B21)', () => {
  const basis = (c: string) =>
    StyleSheet.flatten(
      screen.getByTestId(new RegExp(`^results-best-count-${c}(-marked)?$`), hidden).props.style,
    ).flexBasis;
  const layOut = (c: string, lines: string[]) =>
    fireEvent(screen.getByTestId(`results-best-count-${c}-label`, hidden), 'textLayout', {
      nativeEvent: { lines: lines.map((t) => ({ text: t })) },
    });

  it('four in a row while every label fits; a word broken in two puts them two by two, then one a line', async () => {
    const game = await endedPractice();
    await show(fromDisk(game), game.session.id);
    const counts = screen.getByTestId('results-best-counts', hidden);
    expect(StyleSheet.flatten(counts.props.style)).toMatchObject({ flexDirection: 'row', flexWrap: 'wrap' });
    for (const c of ['row', 'col', 'box', 'num']) {
      expect(basis(c)).toBe(0);
      // Never "…": a label keeps all its words.
      expect(screen.getByTestId(`results-best-count-${c}-label`, hidden).props.numberOfLines).toBeUndefined();
    }

    // Labels that fit (one line, or two broken at a space) keep the four.
    await layOut('row', ['בשורה']);
    await layOut('num', ['ספרות 9 ', 'בלוח']);
    expect(basis('row')).toBe(0);

    // "בשור" + "ה" at the largest text: two by two. Another label of the same layout of four (its handler as
    // that layout had it) changes nothing more.
    const staleBox = screen.getByTestId('results-best-count-box-label', hidden).props as {
      onTextLayout: (e: object) => void;
    };
    await layOut('row', ['בשור', 'ה']);
    await act(async () => {
      staleBox.onTextLayout({ nativeEvent: { lines: [{ text: 'בריבו' }, { text: 'ע' }] } });
    });
    expect(['row', 'col', 'box', 'num'].map(basis)).toEqual(['40%', '40%', '40%', '40%']);

    // Still cut two by two (or three lines): one a line.
    await layOut('num', ['ספרות 9', 'ב', 'לוח']);
    expect(basis('num')).toBe('100%');
    await layOut('num', ['ספרו', 'ת 9 בלוח']);
    expect(basis('num')).toBe('100%');
  });

  it('a label on three lines is too tall for four in a row (German "4er auf / dem / Spielfeld")', async () => {
    const game = await endedPractice();
    await show(fromDisk(game), game.session.id);
    await layOut('num', ['4er auf ', 'dem ', 'Spielfeld']);
    expect(basis('num')).toBe('40%');
  });

  it('a new text size starts again at four', async () => {
    const game = await endedPractice();
    await show(fromDisk(game), game.session.id);
    await layOut('row', ['בשור', 'ה']);
    expect(basis('row')).toBe('40%');
    await act(async () => {
      setWindow({ ...PHONE, fontScale: 1.3 });
    });
    expect(basis('row')).toBe(0);
  });

  it('the move itself, "A2 → 4", is three words side by side, as in the replay (B20)', async () => {
    const game = await endedPractice();
    await show(fromDisk(game), game.session.id);
    const move = screen.getByTestId('results-best-move', hidden);
    const words = within(move)
      .getAllByText(/\S/, hidden)
      .map((w) => String(w.props.children));
    expect(words).toEqual([expect.stringMatching(/^[A-I][1-9]$/), '→', expect.stringMatching(/^[1-9]$/)]);
    expect(StyleSheet.flatten(move.props.style)).toMatchObject({ flexDirection: 'row', direction: 'ltr' });
  });
});

describe('the header, the awards and the bot tag keep every word (B17, B22)', () => {
  it('the header wraps between words instead of "…" ("Training gegen Bot • Schnell • 2 Spi…")', async () => {
    const game = await lostDuel();
    await show(fromDisk(game), game.id);
    const header = screen.getByTestId('results-header');
    expect(header).toHaveTextContent('אימון מול בוט · מהיר · 2 שחקנים');
    expect(header.props.numberOfLines).toBeUndefined();
  });

  it('an award’s line wraps between words instead of "…" ("Меньше всех ошибо…", "המהלך הטוב …")', async () => {
    const game = await lostDuel();
    await show(fromDisk(game), game.id);
    const awards = screen.getByTestId('results-awards');
    const titles = within(awards).getAllByTestId(/^results-award-\w+-title$/, hidden);
    expect(titles.length).toBeGreaterThan(0);
    for (const title of titles) expect(title.props.numberOfLines).toBeUndefined();
  });

  it('the bot tag on the opponent’s avatar has its own room, wider than the avatar ("ボッ", "בו")', async () => {
    const game = await lostDuel();
    await show(fromDisk(game), game.id);
    const row = screen.getByTestId(`results-opponent-${BOT.id}`);
    const chip = within(row).getByTestId('bot-chip', hidden);
    const room = StyleSheet.flatten(chip.parent?.props.style);
    expect(room).toMatchObject({ position: 'absolute', flexDirection: 'row' });
    expect(room.width).toBeGreaterThan(size.avatar.compact.frame);
    const word = within(chip).getByText('בוט', hidden);
    expect(word.props.numberOfLines).toBe(1);
    // Capped as the cards' HUD text is (×1.35): its 18 dp chip still holds it.
    expect(word.props.maxFontSizeMultiplier).toBe(1.35);
  });

  it.each(layoutLanguages())(
    'the bot tag’s word fits its room at the HUD’s largest text (%s)',
    async (lang) => {
      await i18n.changeLanguage(lang);
      const game = await lostDuel();
      await show(fromDisk(game), game.id);
      const chip = within(screen.getByTestId(`results-opponent-${BOT.id}`)).getByTestId('bot-chip', hidden);
      const room = StyleSheet.flatten(chip.parent?.props.style).width as number;
      const style = StyleSheet.flatten(chip.props.style);
      const word = within(chip).getByText(i18n.t('player:bot'), hidden);
      const wordStyle = StyleSheet.flatten(word.props.style) as { fontFamily?: string; fontSize: number };
      const chipWidth =
        widthIn(lang, i18n.t('player:bot'), wordStyle, { fontScale: 1.35 }) +
        2 * (style.paddingHorizontal as number) +
        2 * tokens.border.hairline;
      expectRoom(lang, 'player:bot', chipWidth, room);
    },
  );
});

describe('"משחק חדש" and "צפייה חוזרת" side by side (B21)', () => {
  it('at the normal text size: one row, never wrapped; both narrow when they must', async () => {
    const game = await endedPractice();
    await show(fromDisk(game), game.session.id);
    expect(StyleSheet.flatten(screen.getByTestId('results-actions').props.style)).not.toHaveProperty(
      'flexWrap',
    );
    for (const id of ['results-new-game', 'results-replay']) {
      expect(StyleSheet.flatten(screen.getByTestId(id).props.style)).toMatchObject({
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: 'auto',
        minWidth: 0,
      });
    }
  });

  it('with the phone’s large text the second may take its own line, not to cut its label', async () => {
    await restore?.();
    restore = setWindow({ ...PHONE, fontScale: 2 });
    const game = await endedPractice();
    await show(fromDisk(game), game.session.id);
    expect(StyleSheet.flatten(screen.getByTestId('results-actions').props.style)).toMatchObject({
      flexWrap: 'wrap',
    });
  });

  // The row on a 360 dp phone: 360 less the gutters (24 each) and the gap (12). Each button is its label and its
  // face's padding (the gold 24 a side; the slate 16 a side, its 20 icon and a gap of 8); when the two are wider
  // than the row, Yoga narrows both in proportion to their widths. A label shrinks to 70 % at most (FIT_LABEL).
  const ROW = PHONE.width - 2 * tokens.layout.gutterHome - space[6];
  const GOLD_PADDING = 2 * space[10];
  const SLATE_PADDING = 2 * space[8] + size.icon.card + space[4];
  const MIN_SCALE = 0.7;
  const labelStyle = (name: 'h1' | 'button') => text(name) as { fontFamily?: string; fontSize: number };

  it.each(layoutLanguages())('both labels fit side by side on a 360 dp phone (%s)', async (lang) => {
    await i18n.changeLanguage(lang);
    // The gold label is h1 (Button PRIMARY_LABEL md), the slate's `button`.
    const newGame = widthIn(lang, i18n.t('game:results.actions.newGame'), labelStyle('h1'));
    const replay = widthIn(lang, i18n.t('history:results.replay'), labelStyle('button'));
    const gold = newGame + GOLD_PADDING;
    const slate = replay + SLATE_PADDING;
    const narrowed = Math.min(1, ROW / (gold + slate));
    expectRoom(lang, 'game:results.actions.newGame', newGame * MIN_SCALE, gold * narrowed - GOLD_PADDING);
    expectRoom(lang, 'history:results.replay', replay * MIN_SCALE, slate * narrowed - SLATE_PADDING);
  });
});
