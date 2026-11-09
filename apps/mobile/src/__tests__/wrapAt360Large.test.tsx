import 'react-native-reanimated';

import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { card, myProgress } from '../api/testing/fakeProgress';
import { AVATAR_SIZES } from '../components/player/metrics';
import { setWindow, widthIn } from '../components/ui/testing/layout';
import i18n from '../i18n';
import { levelById } from '../levels/levelsData';
import { HistoryCard } from '../screens/history/HistoryCard';
import { LevelPanel } from '../screens/levels/LevelPanel';
import type { HistoryEntry } from '../screens/history/historyModel';
import { PlayerCardScreen } from '../screens/player/PlayerCardScreen';
import { ProgressScreen } from '../screens/progress/ProgressScreen';
import { StepButton } from '../screens/replay/ReplayParts';
import { useSettings } from '../state/settings';
import { size, space, text, tokens } from '../theme';

/**
 * QA loop 7 (general-display-small-big-font): a Galaxy A16 at 360 dp (wm density 480) and font 1.3 broke words in
 * the middle or cut them: "Mistak es per …" and "Playing since Octobe…" on the player card, "Previous st…" in the
 * replay, "Loss • Ranke…" / "הפסד • אימו…" in the history, "Bronz…", "Diam…", "Lege…" in the achievements. Each
 * now wraps between words, or goes to a row of its own, at full size. Checked in English and Hebrew with the
 * fonts' own widths at 1.3 (the layout tests' measure).
 */

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);

const hidden = { includeHiddenElements: true };
const F = 1.3;
const W = 360;
const flat = (el: { props: { style?: unknown } }) =>
  (StyleSheet.flatten(el.props.style as ViewStyle & TextStyle) ?? {}) as ViewStyle & TextStyle;
const textOf = (el: { props: { children?: unknown } }) => [el.props.children].flat(Infinity).join('');
const settle = () =>
  act(async () => {
    for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r));
  });

/** The widest word of `line` in `style` at font 1.3. */
function widestWord(lang: string, line: string, style: TextStyle): number {
  const font = { fontFamily: style.fontFamily, fontWeight: style.fontWeight, fontSize: style.fontSize! };
  return Math.max(
    ...line
      .trim()
      .split(/\s+/)
      .map((w) => widthIn(lang, w, font, { fontScale: F })),
  );
}

/** Reports every probe under `root` at its width in `lang` at font 1.3, as the phone lays it out. */
async function measureProbes(lang: string) {
  for (const probe of screen.queryAllByTestId(/^probe-/, hidden)) {
    const s = flat(probe);
    const width = widthIn(
      lang,
      textOf(probe),
      { fontFamily: s.fontFamily, fontWeight: s.fontWeight, fontSize: s.fontSize! },
      { fontScale: F },
    );
    await fireEvent(probe, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height: 16 } } });
  }
}

const layout = (testID: string, width: number) =>
  fireEvent(screen.getByTestId(testID, hidden), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height: 100 } },
  });

let restore: (() => Promise<void>) | null = null;
beforeEach(() => {
  useSettings.setState({ reduceMotion: 'on' });
  restore = setWindow({ width: W, height: 780, fontScale: F });
});
afterEach(async () => {
  await restore?.();
});
afterAll(async () => {
  await i18n.changeLanguage('he');
});

describe.each(['en', 'he'] as const)('360 dp at font 1.3 in %s', (lang) => {
  beforeEach(async () => {
    await i18n.changeLanguage(lang);
  });

  it('player card: the stats go two to a row when a word is wider than a quarter; "Playing since" wraps', async () => {
    const nina = card({ id: 'nina', displayName: 'NinaVolt', country: 'DE', league: 'diamond', level: 22 });
    await render(
      <PlayerCardScreen
        playerId="nina"
        load={async () => nina}
        myId="me"
        onBack={jest.fn()}
        onEditProfile={jest.fn()}
        onOpenReplay={jest.fn()}
      />,
    );
    await settle();
    const row = W - 2 * tokens.layout.gutterGame;
    await act(async () => {
      await layout('player-card-stats', row);
      await measureProbes(lang);
    });
    const cells = screen.getAllByTestId(/^player-card-stat-/);
    const labels = cells.map((c) => textOf(within(c).getAllByText(/\S/)[1]!));
    const widest = Math.max(...labels.map((l) => widestWord(lang, l, text('micro'))));
    const quarter = (row - 3 * space[4]) / 4 - 2 * space[3];
    const half = (row - space[4]) / 2 - 2 * space[3];
    if (widest > quarter) for (const c of cells) expect(flat(c).width).toBe('45%');
    expect(widest).toBeLessThanOrEqual(half);
    if (lang === 'en') expect(widest).toBeGreaterThan(quarter);

    // "Playing since October 2026": two lines, each word whole beside the 96 avatar.
    const joined = screen.getByTestId('player-card-joined');
    expect(joined).toHaveProp('numberOfLines', 2);
    const column = row - 2 * space[8] - AVATAR_SIZES.profile.frame - space[8];
    expect(widestWord(lang, textOf(joined), text('caption'))).toBeLessThanOrEqual(column);
  });

  it('achievements: the leagues go in two rows when a name does not fit a fifth', async () => {
    await render(
      <ProgressScreen
        progress={myProgress()}
        status="ok"
        pending={0}
        myAvatar="lava-lamp"
        level={14}
        onOpenMyCard={jest.fn()}
        onOpenInterferences={jest.fn()}
        onRetry={jest.fn()}
        onTab={jest.fn()}
      />,
    );
    const ladderWidth = W - 2 * tokens.layout.gutterGame - 2 * space[8];
    await act(async () => {
      await layout('progress-league-ladder', ladderWidth);
      await measureProbes(lang);
    });
    const steps = screen.getAllByTestId(/^progress-league-(bronze|silver|gold|diamond|legend)/);
    expect(steps).toHaveLength(5);
    const names = steps.map((s) => textOf(within(s).getAllByText(/\S/)[0]!));
    const widest = Math.max(...names.map((n) => widestWord(lang, n, text('micro'))));
    const fifth = (ladderWidth - 4 * space[2]) / 5;
    if (widest > fifth) {
      const third = (ladderWidth - 2 * space[2]) / 3;
      for (const s of steps) expect(flat(s).width).toBeCloseTo(third);
      expect(widest).toBeLessThanOrEqual(third);
    }
    if (lang === 'en') expect(widest).toBeGreaterThan(fifth);
  });

  it('replay: "Previous step" takes two lines, each word whole (the chevron goes if it must)', async () => {
    await render(<StepButton direction="prev" disabled={false} onPress={jest.fn()} testID="prev" />);
    const label = within(screen.getByTestId('prev')).getByText(/\S/);
    expect(label).toHaveProp('numberOfLines', 2);
    // The row less its gutters and gap, 2 : 3 (Replay.dc.html).
    const button = (W - 2 * tokens.layout.gutterGame - space[4]) / 2.5;
    await act(async () => {
      await layout('prev', button);
      await measureProbes(lang);
    });
    const word = widestWord(lang, textOf(label), text('button'));
    const inner = button - 2 * space[4] - 2 * tokens.border.hairline;
    const besideChevron = inner - size.icon.card - space[3];
    const chevron = screen.queryByTestId('icon-chevronForward', hidden);
    if (word > besideChevron) expect(chevron).toBeNull();
    else expect(chevron).not.toBeNull();
    expect(word).toBeLessThanOrEqual(chevron ? besideChevron : inner);
    if (lang === 'en') expect(word).toBeGreaterThan(besideChevron);
  });

  it('the map: "שלב 10 · מרוץ מול הבוט" in the panel takes two lines, each word whole', async () => {
    const level = levelById('L010')!;
    await render(
      <LevelPanel
        selection={{
          kind: 'level',
          level,
          info: { n: 10, id: level.id, state: 'open', stars: 0, boss: false },
          bestMetric: null,
        }}
        current={10}
        onPlay={jest.fn()}
        bottomInset={0}
      />,
    );
    const title = screen.getByTestId('level-panel-title');
    expect(title).toHaveProp('numberOfLines', 2);
    expect(screen.getByTestId('level-panel-sub')).toHaveProp('numberOfLines', 2);
    // The panel less its gutters, the 56 lead tile and the gap.
    const titles = W - 2 * tokens.layout.gutterGame - 2 * space[8] - 56 - space[6] * 2;
    expect(widestWord(lang, textOf(title), text('playerName'))).toBeLessThanOrEqual(titles);
  });

  it('history: "Loss • Ranked • Normal" takes two lines, each word whole', async () => {
    const entry: HistoryEntry = {
      id: 'g1',
      source: 'ranked',
      mode: 'ranked',
      gameType: 'normal',
      startedAt: Date.UTC(2026, 9, 10, 12),
      outcome: 'loss',
      place: 2,
      playerCount: 2,
      opponents: [{ id: 'lior', name: 'Lior.K', avatar: 'maya', isBot: false, country: 'IL', colorIndex: 1 }],
      myScore: 62,
      opponentScore: 84.5,
      ratingDelta: -11,
    };
    await render(
      <HistoryCard entry={entry} myAvatar="lava-lamp" now={Date.UTC(2026, 9, 10, 13)} onOpen={jest.fn()} />,
    );
    const kind = screen.getByTestId('history-card-g1-kind');
    // Every line it needs (loop 9: a Hebrew practice card needs three; fitAt360Loop9.test).
    expect(kind.props.numberOfLines).toBeUndefined();
    // The card less its stripe, the avatar, the score column and "Replay" (about 60 each at 1.3).
    const middle =
      W - 2 * tokens.layout.gutterGame - space[2] - AVATAR_SIZES.compact.frame - 4 * space[5] - 120;
    expect(widestWord(lang, textOf(kind), text('caption'))).toBeLessThanOrEqual(middle);
  });
});
