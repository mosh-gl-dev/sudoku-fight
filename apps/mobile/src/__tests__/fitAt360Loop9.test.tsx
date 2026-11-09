// The gesture handler's Jest mocks, before anything loads it (its native module does not exist under Jest).
import 'react-native-gesture-handler/jestSetup';
import 'react-native-reanimated';

import { readFileSync } from 'fs';
import { dirname, join } from 'path';

import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { INTERFERENCE_KINDS, type InterferenceKind } from '@sudoku-fight/engine';
import { useEffect } from 'react';
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { card, entry } from '../api/testing/fakeProgress';
import { NOW, twoPlayerView, withPlayer } from '../components/player/__fixtures__/gameView';
import { cardModel } from '../components/player/cardModel';
import { AVATAR_SIZES, duelCardWidth, metrics } from '../components/player/metrics';
import { botLevelForm, levelChipRoom } from '../components/player/PlayerCard';
import { vsInset, wordsFitLines } from '../components/player/statusFit';
import { setWindow, widthIn } from '../components/ui/testing/layout';
import { Toast, ToastViewport, type ToastTimer } from '../components/ui/Toast';
import { useToast } from '../components/ui/toastStore';
import i18n from '../i18n';
import { SENDER_TOAST_LINES, useSenderFeedback } from '../screens/game/arsenal/useSenderFeedback';
import { senderText } from '../screens/game/arsenal/wording';
import { DuelHud } from '../screens/game/DuelHud';
import { HistoryCard } from '../screens/history/HistoryCard';
import type { HistoryEntry } from '../screens/history/historyModel';
import { BotSelectScreen } from '../screens/home/BotSelectScreen';
import { Podium } from '../screens/leaderboard/LeaderboardParts';
import { PlayerCardScreen } from '../screens/player/PlayerCardScreen';
import { useSettings } from '../state/settings';
import { size, space, text, tokens } from '../theme';

/**
 * QA loop 9 (APK 13, 360 dp: wm density 480 at font 1.3, or 540 at 1.0). Every text keeps its design size and
 * every word stays whole: it wraps, or something shorter takes its place, never "…".
 * - history: a Hebrew practice card's "הפסד • אימון מול בוט • מהיר" needs three lines beside "ללא דירוג";
 * - player card: "Stages: 9 • ★ 0" lost the tail of its "g" (a 13/13 line, clipped on Android);
 * - toast: "Not enough points for the next interference (2 pts)" was one line with "…" at 1.0;
 * - bot card in the game: "3 • Adva…" under "Mr. Ho…";
 * - leaderboard podium: "1232 Provisional" wider than its third of the row, out to the screen's edge;
 * - bot select: the descriptions ended in "…" after two lines.
 */

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../services/feedback', () => ({ cue: jest.fn() }));
jest.mock('../services/analytics', () => ({ track: jest.fn() }));
jest.mock('../screens/home/startGame', () => ({ startAndOpen: jest.fn(async () => true) }));

const hidden = { includeHiddenElements: true };
const W = 360;
type Style = ViewStyle & TextStyle;
const flat = (el: { props: { style?: unknown } }) =>
  (StyleSheet.flatten(el.props.style as Style) ?? {}) as Style;
const textOf = (el: { props: { children?: unknown } }) => [el.props.children].flat(Infinity).join('');
const settle = () =>
  act(async () => {
    for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r));
  });

/** How wide `line` is in `lang`, in `style`, at `fontScale`. */
const widthOf = (lang: string, line: string, style: TextStyle, fontScale: number) =>
  widthIn(
    lang,
    line,
    { fontFamily: style.fontFamily, fontWeight: style.fontWeight, fontSize: style.fontSize! },
    { fontScale },
  );

/** The lines `line` takes in `room`, broken between words only (Infinity where a word alone is wider). */
function linesIn(lang: string, line: string, style: TextStyle, fontScale: number, room: number): number {
  const words = line.trim().split(/\s+/);
  const widths = words.map((w) => widthOf(lang, w, style, fontScale));
  const gap = widthOf(lang, 'a b', style, fontScale) - widthOf(lang, 'ab', style, fontScale);
  for (let n = 1; n <= words.length; n++) if (wordsFitLines(widths, gap, room, n)) return n;
  return Infinity;
}

/** Reports every probe under `root` at its width in `lang` at `fontScale`, as the phone lays it out. */
async function measureProbes(lang: string, fontScale: number, root: Parameters<typeof within>[0]) {
  for (const probe of within(root).queryAllByTestId(/^probe-/, hidden)) {
    const width = widthOf(lang, textOf(probe), flat(probe), fontScale);
    await fireEvent(probe, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height: 16 } } });
  }
}

/** Rubik's line (hhea ascent + descent) in em: the least line height that clips no glyph of it. */
function rubikLineEm(family: string): number {
  const [name, weight] = family.split('_') as [string, string];
  const pkg = dirname(require.resolve(`@expo-google-fonts/${name.toLowerCase()}/package.json`));
  const b = readFileSync(join(pkg, weight, `${family}.ttf`));
  const tables = new Map<string, number>();
  for (let i = 0; i < b.readUInt16BE(4); i++) {
    const at = 12 + i * 16;
    tables.set(b.toString('ascii', at, at + 4), b.readUInt32BE(at + 8));
  }
  const unitsPerEm = b.readUInt16BE(tables.get('head')! + 18);
  const hhea = tables.get('hhea')!;
  return (b.readInt16BE(hhea + 4) - b.readInt16BE(hhea + 6)) / unitsPerEm;
}

let restore: (() => Promise<void>) | null = null;
const at = (fontScale: number) => {
  restore = setWindow({ width: W, height: 780, fontScale });
};
beforeEach(() => {
  useSettings.setState({ reduceMotion: 'on' });
});
afterEach(async () => {
  await restore?.();
  restore = null;
});
afterAll(async () => {
  await i18n.changeLanguage('he');
});

describe.each(['en', 'he'] as const)('360 dp in %s (QA loop 9)', (lang) => {
  beforeEach(async () => {
    await i18n.changeLanguage(lang);
  });

  it('history, font 1.3: a practice card’s outcome • mode • type line takes every line it needs', async () => {
    at(1.3);
    const base = { startedAt: Date.UTC(2026, 9, 10, 12), playerCount: 1, ratingDelta: null } as const;
    const bot: HistoryEntry = {
      ...base,
      id: 'bot',
      source: 'practice',
      mode: 'bot',
      gameType: 'fast',
      outcome: 'loss',
      place: 2,
      opponents: [
        { id: 'bot-3', name: 'Mr. Hoot', avatar: 'lava-lamp', isBot: true, country: null, colorIndex: 1 },
      ],
      myScore: 0,
      opponentScore: 17,
    };
    const solo: HistoryEntry = {
      ...base,
      id: 'solo',
      source: 'practice',
      mode: 'solo',
      gameType: 'fast',
      outcome: 'ended',
      place: null,
      opponents: [],
      myScore: 0,
      opponentScore: null,
    };
    const now = Date.UTC(2026, 9, 10, 13);
    for (const e of [bot, solo]) {
      await render(<HistoryCard entry={e} myAvatar="lava-lamp" now={now} onOpen={jest.fn()} />);
      const kind = screen.getByTestId(`history-card-${e.id}-kind`);
      // No cap: the old 2 ended "הפסד • אימון / מול בוט • מ…" and "האימון / הסתיים • אי…".
      expect(kind.props.numberOfLines).toBeUndefined();

      // The room it has, as the phone lays the card out: the row less the stripe, the avatar, the score column
      // ("ללא דירוג" / "Unrated" is its widest) and "צפייה חוזרת", the four gaps and the end padding.
      const end = Math.max(
        widthOf(lang, i18n.t('history:card.unrated'), text('caption'), 1.3),
        widthOf(lang, i18n.t('history:card.today'), text('micro'), 1.3),
      );
      const open = Math.max(
        widthOf(lang, i18n.t('history:card.replay'), text('micro'), 1.3),
        size.icon.chevron,
      );
      const middle =
        W -
        2 * tokens.layout.gutterGame -
        2 * tokens.border.hairline -
        space[2] -
        AVATAR_SIZES.compact.frame -
        4 * space[5] -
        space[4] -
        end -
        open;
      const lines = linesIn(lang, textOf(kind), text('caption'), 1.3, middle);
      expect(lines).toBeLessThan(Infinity); // every word whole on a line
      // Hebrew needs three (the device's "…" after two); English fits two (loop 7, unchanged).
      if (lang === 'he') expect(lines).toBeGreaterThan(2);
      await screen.unmount();
    }
  });

  it('player card, font 1.3: "Stages" and the XP stand on a line tall enough for Rubik', async () => {
    at(1.3);
    const me = card({ id: 'me', displayName: 'MosheG', country: 'IL', league: 'bronze', level: 7 });
    await render(
      <PlayerCardScreen
        playerId="me"
        load={async () => me}
        myId="me"
        cached={me}
        levels={{ played: 9, stars: 0, current: 10 }}
        onBack={jest.fn()}
        onEditProfile={jest.fn()}
        onOpenReplay={jest.fn()}
      />,
    );
    await settle();
    for (const id of ['player-card-levels', 'player-card-xp-text']) {
      const s = flat(screen.getByTestId(id));
      // The old 13/13: Android split the missing ~2.4 dp between the top and the bottom and clipped the "g".
      expect(s.lineHeight!).toBeGreaterThanOrEqual(s.fontSize! * rubikLineEm(s.fontFamily!));
      expect(s.fontSize).toBe(tokens.type.label.size);
    }
    expect(textOf(screen.getByTestId('player-card-levels'))).toMatch(/9/);
  });

  it.each([1, 1.3])(
    'toast, font %s: "not enough points" wraps between words, all of it, in a box that grows',
    async (fontScale) => {
      at(fontScale);
      const message = i18n.t('game:arsenal.notEnough', { cost: 2 });
      await render(<Toast variant="error" message={message} testID="toast" />);
      const box = screen.getByTestId('toast');
      const words = screen.getByTestId('toast-message');
      // The old toast: height 40 and one line, "Not enough points for the next i…" / "…להפרעה הבאה (2 …".
      expect(words.props.numberOfLines).toBeUndefined();
      expect(flat(box).height).toBeUndefined();
      expect(flat(box).minHeight).toBe(size.toast);
      const style = flat(words);
      // The QA phone: 1080 px at wm density 540 is 320 dp (1080 / 3.375), at 480 it is 360 dp.
      for (const screenWidth of [W, 320]) {
        const room =
          screenWidth - 2 * space[8] - 2 * space[6] - 2 * tokens.border.hairline - size.toastIcon - space[5];
        const lines = linesIn(lang, message, style, fontScale, room);
        // Every word whole: two lines at 1.0, three at most at 1.3 (320 dp).
        expect(lines).toBeLessThanOrEqual(fontScale > 1 ? 3 : 2);
        // It can't be one line: English at 360 already, Hebrew at 320 ("…להפרעה הבאה (2 …" on the phone).
        if (lang === 'en' || screenWidth === 320 || fontScale > 1) {
          expect(widthOf(lang, message, style, fontScale)).toBeGreaterThan(room);
          expect(lines).toBeGreaterThanOrEqual(2);
        }
      }
      // Lines that hold Rubik's height, so the second line never cuts the first one's tails.
      expect(style.lineHeight!).toBeGreaterThanOrEqual(style.fontSize! * rubikLineEm(style.fontFamily!));
      expect(style.fontSize).toBe(tokens.type.buttonSm.size);
    },
  );

  it.each([1, 1.3])(
    'sender chip, font %s: two lines at most under the duel cards, ending above the board; only the name shortens',
    async (fontScale) => {
      at(fontScale);
      const name = 'NinaVoltMaximus7'; // 16, the longest name (protocol NAME_RULES)
      const manual: ToastTimer = { start: () => () => {} };
      const t = i18n.getFixedT(lang, 'game');
      function Sender({ kind }: { kind: InterferenceKind }) {
        const notify = useSenderFeedback();
        useEffect(() => notify({ kind, targetName: name, cost: 2, top: 200 }), [kind, notify]);
        return null;
      }
      useToast.getState().clear();
      await render(
        <>
          <Sender kind={INTERFERENCE_KINDS[0]} />
          <ToastViewport timer={manual} />
        </>,
      );
      const words = screen.getByTestId('toast-message');
      // The old 1 line ("Fireworks → NinaVo…" at best); now 2, and the tail that shortens is the name.
      expect(words.props.numberOfLines).toBe(SENDER_TOAST_LINES);
      expect(SENDER_TOAST_LINES).toBe(2);
      const style = flat(words);
      const box = flat(screen.getByLabelText(senderText(INTERFERENCE_KINDS[0], name, t)));

      // Two lines' height, as the phone scales the line: it ends above the board. Under the duel's cards
      // (GameScreen's rhythm): 16, the lead bar (4, its tag 3 + 15), 2, the lock strip (24), 16, the board,
      // which the room centres, so never higher. The chip starts 4 under the cards.
      const toBoard =
        space[8] +
        size.dominanceBar.height +
        metrics.lead.tagTop +
        metrics.lead.tagHeight +
        space[1] +
        metrics.lockStrip.height +
        space[8] -
        space[2];
      const twoLines =
        SENDER_TOAST_LINES * style.lineHeight! * fontScale +
        2 * (box.paddingVertical as number) +
        2 * (box.borderWidth as number);
      expect(Math.max(size.toast, twoLines)).toBeLessThanOrEqual(toBoard);
      // Why the cap: a third line at 1.3 would reach over the board.
      if (fontScale > 1) expect(twoLines + style.lineHeight! * fontScale).toBeGreaterThan(toBoard);

      // The kind and its arrow always fit the first line, whole, so the name starts on it and only the name
      // can end in "…" (at 360 and at 320 dp).
      for (const kind of INTERFERENCE_KINDS) {
        const head = senderText(kind, '', t).replace(/[\u2066-\u2069]/g, '');
        for (const screenWidth of [W, 320]) {
          const room =
            screenWidth -
            2 * space[8] -
            2 * space[6] -
            2 * tokens.border.hairline -
            size.toastIcon -
            space[5];
          expect(linesIn(lang, head, style, fontScale, room)).toBe(1);
          // And the whole of it, a 16-letter name included, fits the two lines: in en and he nothing shortens.
          expect(linesIn(lang, senderText(kind, name, t), style, fontScale, room)).toBeLessThanOrEqual(2);
        }
      }
      await screen.unmount();
      useToast.getState().clear();
    },
  );

  it('bot card in the game, font 1.3: the level chip shows the longest form that fits, never "Adva…"', async () => {
    at(1.3);
    const view = withPlayer(twoPlayerView({ mode: 'bot' }), 'nina', {
      isBot: true,
      rating: null,
      name: 'Mr. Hoot',
    });
    // As GameScreen builds it.
    const words = { level: 3, title: i18n.t('home:botSelect.levels.3.title') };
    const level = {
      text: i18n.t('game:botLevel.tag', words),
      label: i18n.t('game:botLevel.label', words),
      shorter: [words.title, String(words.level)],
    };
    await render(
      <DuelHud
        me={cardModel(view, 'moshe', 0, NOW)}
        opponent={cardModel(view, 'nina', 0, NOW)}
        opponentBotLevel={level}
        onSurrender={() => {}}
        style={{ marginHorizontal: tokens.layout.gutterGame }}
      />,
    );
    await act(async () => {
      await measureProbes(lang, 1.3, screen.getByTestId('card-opponent', hidden));
    });
    const row = W - 2 * tokens.layout.gutterGame;
    const cardWidth = duelCardWidth(row);
    const room = levelChipRoom(cardWidth, vsInset(row, cardWidth));
    // The same room from the card as rendered: its width, less the avatar's frame, the gap beside it and the
    // inset kept clear of the VS badge, less the chip's padding and border.
    const identity = flat(screen.getByTestId('card-opponent-identity', hidden));
    const chipBox = flat(screen.getByTestId('card-opponent-bot-level', hidden));
    const rendered =
      (flat(screen.getByTestId('card-opponent', hidden)).width as number) -
      (flat(screen.getByTestId('card-opponent-avatar', hidden)).width as number) -
      (identity.gap as number) -
      ((identity.paddingStart ?? identity.paddingEnd ?? 0) as number) -
      2 * (chipBox.paddingHorizontal as number) -
      2 * (chipBox.borderWidth as number);
    expect(rendered).toBeCloseTo(room, 5);
    expect(rendered).toBeGreaterThan(0);
    const shown = textOf(screen.getByTestId('card-opponent-bot-level-text', hidden));
    const forms = [level.text, ...level.shorter];
    const widths = forms.map((f) => widthOf(lang, f, text('micro'), 1.3));
    expect(shown).toBe(botLevelForm(forms, widths, room));
    expect(widthOf(lang, shown, text('micro'), 1.3)).toBeLessThanOrEqual(room);
    // English: "3 · Advanced" is wider than the chip's room (the old "3 • Adva…"); "Advanced" fits.
    if (lang === 'en') {
      expect(widths[0]).toBeGreaterThan(room);
      expect(shown).toBe(words.title);
    }
    // The chip's words at full size, and the whole level still spoken.
    expect(flat(screen.getByTestId('card-opponent-bot-level-text', hidden)).fontSize).toBe(
      tokens.type.micro.size,
    );
    expect(screen.getByLabelText(new RegExp(level.label))).toBeTruthy();
  });

  it('leaderboard podium, font 1.3: the provisional chip goes under the number when both don’t fit', async () => {
    at(1.3);
    const podium = [
      entry({ id: 'uri', rank: 1, rating: 1280, displayName: 'אורי' }),
      entry({ id: 'yair', rank: 2, rating: 1232, displayName: 'יאיר', provisional: true }),
      entry({ id: 'momo', rank: 3, rating: 1214, displayName: 'מומו' }),
    ];
    await render(<Podium podium={podium} myId={null} onOpen={jest.fn()} />);
    const rating = screen.getByTestId('leaderboard-podium-2-rating', hidden);
    expect(flat(rating).maxWidth).toBe('100%');
    const line = flat(rating.children[0] as never);
    expect(line).toMatchObject({ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' });
    // A third of the row: "1232" and "Provisional" side by side are wider at 1.3 (the old overflow to x≈5 px).
    const column = (W - 2 * tokens.layout.gutterGame - 2 * space[4]) / 3;
    const number = widthOf(lang, '1232', flat(within(rating).getByText('1232', hidden)), 1.3);
    const chip = within(rating).getByTestId('leaderboard-podium-2-rating-provisional', hidden);
    const word = within(chip).getByText(/\S/, hidden);
    const chipWidth =
      widthOf(lang, textOf(word), flat(word), 1.3) +
      2 * metrics.rating.provisionalPaddingX +
      2 * tokens.border.hairline;
    if (lang === 'en') expect(number + space[2] + chipWidth).toBeGreaterThan(column);
    // Alone on its line, the chip fits the column.
    expect(chipWidth).toBeLessThanOrEqual(column);
  });

  it('bot select, font 1.3: each bot’s description takes every line it needs', async () => {
    at(1.3);
    await render(<BotSelectScreen gameType="fast" initialLevel={3} />);
    for (const level of [1, 2, 3, 4, 5]) {
      const behavior = screen.getByTestId(`bot-${level}-behavior`, hidden);
      // The old 2 ended "Slow, makes a fair few mistakes, and lets you …".
      expect(behavior.props.numberOfLines).toBeUndefined();
      expect(flat(behavior).fontSize).toBe(tokens.type.caption.size);
    }
  });
});
