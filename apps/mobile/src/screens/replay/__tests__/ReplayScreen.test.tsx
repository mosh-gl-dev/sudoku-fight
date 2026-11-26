import { cellName } from '@sudoku-fight/engine';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { formatScore, ltr, signedText } from '../../../components/player';
import i18n from '../../../i18n';
import { color } from '../../../theme';
import { decimalSeparator } from '../../../i18n/compose';
import { useSettings } from '../../../state/settings';
import { scoreCountsOf } from '../../results/resultsModel';
import { buildReplay, stepView } from '../replayModel';
import { ReplayScreen } from '../ReplayScreen';
import { loadReplay, type ReplayLoad, type ReplaySourceDeps } from '../replaySource';
import { softDropDuel, soloGame } from '../testing/games';
import { botDuelTable, fakeHistoryApi, memoryRepo, rankedDuel, savePractice } from '../testing/sources';

/**
 * The replay screen (spec §13; work plan stage 11): a practice from the phone and a ranked game from the
 * server, stepped through one step at a time, with the right explanation at every step.
 */

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);

const hidden = { includeHiddenElements: true };

async function show(load: (id: string) => Promise<ReplayLoad>, id: string) {
  const onBack = jest.fn();
  await render(<ReplayScreen gameId={id} load={load} onBack={onBack} />);
  await act(async () => {
    await new Promise((r) => setImmediate(r));
  });
  return { onBack };
}

const next = () => fireEvent.press(screen.getByTestId('replay-next'));

/** A move as the card draws it (MoveText, B20): its words, each its own text ("A2", "→", "4"). */
const moveWords = (testID: string): string[] =>
  within(screen.getByTestId(testID, hidden))
    .getAllByText(/\S/, hidden)
    .map((w) => String(w.props.children));

beforeEach(async () => {
  await i18n.changeLanguage('he');
  useSettings.setState({ reduceMotion: 'on' });
});

async function practiceDeps(): Promise<{
  deps: ReplaySourceDeps;
  id: string;
  table: ReturnType<typeof soloGame>;
}> {
  const repo = await memoryRepo();
  const table = soloGame();
  await savePractice(repo, table);
  return {
    table,
    id: table.config.id,
    deps: { practice: async () => repo, ranked: null, myAvatar: 'lava-lamp', myCountry: 'IL' },
  };
}

describe('a practice from the phone', () => {
  it('opens at the start: the board, my card, "שלב 1 מתוך N", the clock, and no step back', async () => {
    const { deps, id, table } = await practiceDeps();
    await show((g) => loadReplay(g, null, deps), id);
    const total = buildReplay(table.log, { me: 'me' }).steps.length;
    expect(screen.getByRole('header', { name: 'צפייה חוזרת' })).toBeOnTheScreen();
    expect(screen.getByText(/^אימון לבד · מהיר · /)).toBeOnTheScreen();
    expect(screen.getByTestId('replay-counter')).toHaveTextContent(`שלב 1 מתוך ${total}`);
    expect(screen.getByTestId('replay-narration')).toHaveTextContent('המשחק מתחיל');
    expect(screen.getByTestId('replay-clock')).toHaveTextContent('0:00');
    expect(screen.getByTestId('replay-prev')).toBeDisabled();
    expect(screen.getByTestId('replay-card-me')).toBeOnTheScreen();
    expect(screen.getByTestId('replay-board')).toBeOnTheScreen();
    expect(screen.getByTestId('replay-explain-me')).toHaveProp(
      'accessibilityLabel',
      'עוד אין לי מהלך: ההסבר יופיע אחרי המהלך הראשון',
    );
  });

  it('steps forward and back: a choice, then the right digit with its explanation and score line', async () => {
    const { deps, id, table } = await practiceDeps();
    await show((g) => loadReplay(g, null, deps), id);
    const replay = buildReplay(table.log, { me: 'me' });
    const select = replay.steps[1]!;
    const correct = replay.steps[2]!;

    await next();
    expect(screen.getByTestId('replay-counter')).toHaveTextContent(`שלב 2 מתוך ${replay.steps.length}`);
    expect(screen.getByTestId('replay-narration')).toHaveTextContent(
      `אני · בחירה ב־${ltr(cellName(select.cell!))}`,
    );
    expect(screen.getByTestId('replay-explain-me-status', hidden)).toHaveTextContent('בבחירה');

    await next();
    const x = stepView(replay, 2, 'he').explanations[0]!;
    expect(screen.getByTestId('replay-narration')).toHaveTextContent(
      `אני · נכון ב־${ltr(cellName(correct.cell!))} · ${signedText(correct.points!)}`,
    );
    expect(screen.getByTestId('replay-explain-me-status', hidden)).toHaveTextContent(
      `נכון ${signedText(correct.points!)}`,
    );
    expect(moveWords('replay-explain-me-move')).toEqual([
      cellName(correct.cell!),
      '→',
      String(correct.digit),
    ]);
    expect(screen.getByTestId('replay-explain-me-text', hidden)).toHaveTextContent(x.text!);
    expect(screen.getByTestId('replay-explain-me-technique', hidden)).toHaveTextContent(x.techniqueName!);
    const b = correct.breakdown!;
    expect(screen.getByTestId('replay-explain-me-score', hidden)).toHaveTextContent(
      ltr(`9 − ${b.X} + (9 − ${b.Y}) / 2 = ${b.points}`),
      { exact: true },
    );

    await fireEvent.press(screen.getByTestId('replay-prev'));
    expect(screen.getByTestId('replay-counter')).toHaveTextContent(`שלב 2 מתוך ${replay.steps.length}`);
  });

  it('“done” (work plan stage 11): every step to the end, each with the right explanation', async () => {
    const { deps, id, table } = await practiceDeps();
    await show((g) => loadReplay(g, null, deps), id);
    const replay = buildReplay(table.log, { me: 'me' });
    for (let k = 0; k < replay.steps.length; k++) {
      const s = replay.steps[k]!;
      expect(screen.getByTestId('replay-counter')).toHaveTextContent(
        `שלב ${k + 1} מתוך ${replay.steps.length}`,
      );
      const x = stepView(replay, k, 'he').explanations[0]!;
      if (x.status !== 'none') {
        expect(screen.getByTestId('replay-explain-me-text', hidden)).toHaveTextContent(x.text!);
        expect(moveWords('replay-explain-me-move')).toEqual([
          cellName(x.cell!),
          '→',
          String(table.config.puzzle.solution[x.cell!]),
        ]);
      }
      if (s.kind === 'correct')
        expect(x).toMatchObject({ status: 'correct', played: s.digit, answer: s.digit });
      if (k < replay.steps.length - 1) await next();
    }
    expect(screen.getByTestId('replay-next')).toBeDisabled();
    expect(screen.getByTestId('replay-narration')).toHaveTextContent('אני · סיום אימון · המשחק נגמר');
  }, 60_000);

  it('the wrong move: the digit played, the right one, and why', async () => {
    const { deps, id, table } = await practiceDeps();
    await show((g) => loadReplay(g, null, deps), id);
    const replay = buildReplay(table.log, { me: 'me' });
    const wrong = replay.steps.find((s) => s.kind === 'wrong')!;
    await fireEvent.press(screen.getByTestId('replay-moment-mistakes'));
    expect(screen.getByTestId('replay-counter')).toHaveTextContent(
      `שלב ${wrong.index + 1} מתוך ${replay.steps.length}`,
    );
    expect(screen.getByTestId('replay-explain-me-status', hidden)).toHaveTextContent(
      `טעות ${signedText(-wrong.penalty!)}`,
    );
    expect(screen.getByTestId('replay-explain-me')).toHaveProp(
      'accessibilityLabel',
      expect.stringContaining(`${wrong.digit} במקום ${wrong.answer}`),
    );
    // The penalty's calculation (§6.5, §13.2): what the right digit would have scored there.
    const missed = stepView(replay, wrong.index, 'he').explanations[0]!.penaltyScore!;
    expect(missed.points).toBe(wrong.penalty);
    const formula = ltr(`9 − ${missed.X} + (9 − ${missed.Y}) / 2 = ${wrong.penalty}`);
    expect(screen.getByTestId('replay-explain-me-penalty', hidden)).toHaveTextContent(formula, {
      exact: true,
    });
    expect(screen.getByTestId('replay-explain-me')).toHaveProp(
      'accessibilityLabel',
      expect.stringContaining(`הקנס: כמה הייתה שווה הספרה הנכונה: ${formula}, `),
    );
  });

  it('the calculation in the viewer’s language (B1): the formula in numbers, and the two counts it came from', async () => {
    const { deps, id, table } = await practiceDeps();
    const replay = buildReplay(table.log, { me: 'me' });
    const correct = replay.steps.find((s) => s.kind === 'correct')!;
    const b = correct.breakdown!;
    const { highest, next: second } = scoreCountsOf(b);
    for (const lng of ['ar', 'ja', 'de', 'he'] as const) {
      await act(async () => {
        await i18n.changeLanguage(lng);
      });
      await show((g) => loadReplay(g, null, deps), id);
      for (let k = 0; k < correct.index; k++) await next();
      const score = screen.getByTestId('replay-explain-me-score', hidden);
      const points = formatScore(b.points, decimalSeparator(i18n.t));
      expect(score).toHaveTextContent(ltr(`9 − ${b.X} + (9 − ${b.Y}) / 2 = ${points}`), { exact: true });
      expect(score).not.toHaveTextContent(/points/);
      const counts = [highest, second]
        .map((c) => i18n.t(`game:results.best.filled.${c.count}`, { count: c.value, digit: correct.digit! }))
        .join(i18n.t('game:listSep'));
      expect(screen.getByTestId('replay-explain-me-score-counts', hidden)).toHaveTextContent(counts, {
        exact: true,
      });
      expect(screen.getByTestId('replay-explain-me')).toHaveProp(
        'accessibilityLabel',
        expect.not.stringContaining('points'),
      );
    }
  });

  it('my card says "אני", as in the game and the explanations (B18/B24): not "שחקן"', async () => {
    const { deps, id } = await practiceDeps();
    await show((g) => loadReplay(g, null, deps), id);
    expect(screen.getByTestId('replay-card-me-summary')).toHaveProp(
      'accessibilityLabel',
      expect.stringMatching(/^אני · מקום 1 · /),
    );
    expect(screen.getByTestId('replay-card-me-summary')).not.toHaveProp(
      'accessibilityLabel',
      expect.stringContaining('שחקן'),
    );
  });

  it('against a bot too (B31/B34): "אני" on my card, the bot by its name', async () => {
    const repo = await memoryRepo();
    const table = botDuelTable();
    await savePractice(repo, table);
    const deps = { practice: async () => repo, ranked: null, myAvatar: 'lava-lamp' as const };
    await show((g) => loadReplay(g, null, deps), table.config.id);
    expect(screen.getByText(/^אימון מול בוט · /)).toBeOnTheScreen();
    expect(screen.getByTestId('replay-card-me-summary')).toHaveProp(
      'accessibilityLabel',
      expect.stringMatching(/^אני · /),
    );
    const bot = table.config.players.find((p) => p.isBot)!;
    expect(screen.getByTestId(`replay-card-${bot.id}-summary`)).toHaveProp(
      'accessibilityLabel',
      expect.stringMatching(new RegExp(`^${bot.name!.replace('.', '\\.')} · `)),
    );
  });

  it('"A2 → 4" is three words side by side, so nothing can go to a hidden line (B20, Replay.dc.html)', async () => {
    const { deps, id, table } = await practiceDeps();
    await show((g) => loadReplay(g, null, deps), id);
    const replay = buildReplay(table.log, { me: 'me' });
    const at = replay.steps.findIndex((s) => s.kind === 'correct');
    for (let k = 0; k < at; k++) await next();
    const step = replay.steps[at]!;
    // Not one "⁦A2 → 4⁩" text, which Android broke before the 4: cell, arrow and digit, each a text with no
    // space and no isolate (MoveText), left to right in a row that never wraps.
    expect(moveWords('replay-explain-me-move')).toEqual([cellName(step.cell!), '→', String(step.digit)]);
    const move = screen.getByTestId('replay-explain-me-move', hidden);
    expect(StyleSheet.flatten(move.props.style)).toMatchObject({ flexDirection: 'row', direction: 'ltr' });
    expect(StyleSheet.flatten(move.props.style)).not.toHaveProperty('flexWrap');
    expect(StyleSheet.flatten(move.parent?.props.style)).not.toHaveProperty('flexWrap');
    // The card still says the whole move.
    expect(screen.getByTestId('replay-explain-me', hidden).props.accessibilityLabel).toContain(
      ltr(`${cellName(step.cell!)} → ${step.digit}`),
    );
    const technique = screen.getByTestId('replay-explain-me-technique', hidden);
    expect(StyleSheet.flatten(technique.props.style)).toMatchObject({ flexShrink: 1 });
    expect(technique.props.numberOfLines).toBe(2);
  });

  it('the timeline: an adjustable control, with the step and the clock; key moments jump', async () => {
    const { deps, id, table } = await practiceDeps();
    await show((g) => loadReplay(g, null, deps), id);
    const replay = buildReplay(table.log, { me: 'me' });
    const timeline = screen.getByTestId('replay-timeline');
    expect(timeline).toHaveProp('accessibilityRole', 'adjustable');
    expect(timeline).toHaveProp('accessibilityValue', {
      min: 1,
      max: replay.steps.length,
      now: 1,
      text: `שלב 1 מתוך ${replay.steps.length}, 0:00`,
    });
    await fireEvent(timeline, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(screen.getByTestId('replay-counter')).toHaveTextContent(`שלב 2 מתוך ${replay.steps.length}`);
    expect(within(timeline).getAllByTestId('replay-timeline-dot-correct', hidden)).toHaveLength(3);
    expect(within(timeline).getAllByTestId('replay-timeline-dot-wrong', hidden)).toHaveLength(1);
    // A wrong step: half the player's colour, half red, so the line still says whose it was (Moshe, 2026-11-26).
    const wrongTick = within(timeline).getByTestId('replay-timeline-dot-wrong', hidden);
    const correctTick = within(timeline).getAllByTestId('replay-timeline-dot-correct', hidden)[0]!;
    expect(StyleSheet.flatten(wrongTick.props.style).backgroundColor).not.toBe(color.danger);
    expect(within(wrongTick).getByTestId('replay-timeline-dot-wrong-half', hidden)).toHaveStyle({
      backgroundColor: color.danger,
      height: '50%',
      bottom: 0,
    });
    expect(within(correctTick).queryByTestId('replay-timeline-dot-wrong-half', hidden)).toBeNull();

    await fireEvent.press(screen.getByTestId('replay-moment-bestMove'));
    expect(screen.getByTestId('replay-counter')).toHaveTextContent(
      `שלב ${replay.keyMoments.bestMove! + 1} מתוך ${replay.steps.length}`,
    );
    expect(screen.queryByTestId('replay-moment-turningPoint')).toBeNull();
  });
});

describe('a ranked game from the server', () => {
  it('shows both players, with today’s names, and explains both at every step', async () => {
    const table = rankedDuel();
    const api = fakeHistoryApi([table]);
    await show(
      (g) => loadReplay(g, 'ranked', { practice: async () => null, ranked: api, myAvatar: 'microphone' }),
      table.config.id,
    );
    expect(api.calls).toEqual(['replay:ranked-1']);
    expect(screen.getByText(/^מדורג · מהיר · /)).toBeOnTheScreen();
    expect(screen.getByTestId('replay-card-nina')).toBeOnTheScreen();
    const replay = buildReplay(table.log, { me: 'me' });
    for (let k = 0; k < replay.steps.length; k++) {
      const view = stepView(replay, k, 'he');
      for (const x of view.explanations) {
        if (x.status === 'none') continue;
        expect(screen.getByTestId(`replay-explain-${x.playerId}-text`, hidden)).toHaveTextContent(x.text!);
      }
      if (k < replay.steps.length - 1) await next();
    }
    expect(screen.getByTestId('replay-narration')).toHaveTextContent('המשחק נגמר', { exact: false });
  }, 60_000);

  it('a friends room’s game is "עם חברים", as its history card says, not "מדורג" (B44/B52)', async () => {
    const table = rankedDuel('friends-1');
    const api = fakeHistoryApi([table]);
    // The server sends it as mode 'ranked' with friends: true (protocol HistoryGame.friends).
    const friendsApi = {
      ...api,
      replay: async (gameId: string) => {
        const answer = await api.replay(gameId);
        return { ...answer, game: { ...answer.game, friends: true } };
      },
    };
    await show(
      (g) =>
        loadReplay(g, 'ranked', { practice: async () => null, ranked: friendsApi, myAvatar: 'microphone' }),
      table.config.id,
    );
    expect(screen.getByText(/^עם חברים · מהיר · /)).toBeOnTheScreen();
    expect(screen.queryByText(/^מדורג · /)).toBeNull();
    // And my card is "אני" here too, the opponent by today's name.
    expect(screen.getByTestId('replay-card-me-summary')).toHaveProp(
      'accessibilityLabel',
      expect.stringMatching(/^אני · /),
    );
    expect(screen.getByTestId('replay-card-nina-summary')).toHaveProp(
      'accessibilityLabel',
      expect.stringMatching(/^NinaVolt · /),
    );
  });

  it('says why it can not show a game: missing, still being saved, offline (with a retry), signed out', async () => {
    const table = rankedDuel();
    const deps = (failWith?: 'notFinished' | 'network') => ({
      practice: async () => null,
      ranked: fakeHistoryApi([table], { failWith }),
      myAvatar: 'microphone' as const,
    });
    await show((g) => loadReplay(g, 'ranked', deps()), 'nope');
    expect(screen.getByRole('header', { name: 'לא מצאנו את המשחק הזה' })).toBeOnTheScreen();
    expect(screen.queryByTestId('replay-retry')).toBeNull();

    await show((g) => loadReplay(g, 'ranked', deps('notFinished')), table.config.id);
    expect(
      screen.getByRole('header', { name: 'המשחק עוד נשמר בשרת. אפשר לנסות שוב בעוד רגע' }),
    ).toBeOnTheScreen();

    const load = jest.fn((g: string) => loadReplay(g, 'ranked', deps('network')));
    await show(load, table.config.id);
    expect(screen.getByRole('header', { name: 'אין חיבור לשרת. משחק מדורג נטען מהשרת' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('replay-retry'));
    await act(async () => {
      await new Promise((r) => setImmediate(r));
    });
    expect(load).toHaveBeenCalledTimes(2);

    await show(
      (g) => loadReplay(g, 'ranked', { practice: async () => null, ranked: null, myAvatar: 'microphone' }),
      'x',
    );
    expect(screen.getByRole('header', { name: 'צריך להתחבר כדי לצפות במשחק מדורג' })).toBeOnTheScreen();
  });

  it('a lost connection in its soft phase [D42]: said as such, and the digits it sent on the return marked', async () => {
    const table = softDropDuel();
    const api = fakeHistoryApi([table]);
    await show(
      (g) => loadReplay(g, 'ranked', { practice: async () => null, ranked: api, myAvatar: 'microphone' }),
      table.config.id,
    );
    const replay = buildReplay(table.log, { me: 'me' });
    const lost = replay.steps.findIndex((s) => s.kind === 'offline');
    const [right, wrong] = replay.steps.filter((s) => s.offline);
    for (let k = 0; k < lost; k++) await next();
    expect(screen.getByTestId('replay-narration')).toHaveTextContent('NinaVolt · בלי חיבור');
    for (let k = lost; k < right!.index; k++) await next();
    expect(screen.getByTestId('replay-narration')).toHaveTextContent(
      `NinaVolt · נכון ב־${ltr(cellName(right!.cell!))} · ${signedText(right!.points!)} · נשלח כשהחיבור חזר`,
    );
    for (let k = right!.index; k < wrong!.index; k++) await next();
    expect(screen.getByTestId('replay-narration')).toHaveTextContent(/ · טעות ב־.* · נשלח כשהחיבור חזר$/);
  }, 30_000);

  it('speaks English', async () => {
    await i18n.changeLanguage('en');
    const table = rankedDuel();
    const api = fakeHistoryApi([table]);
    await show(
      (g) => loadReplay(g, 'ranked', { practice: async () => null, ranked: api, myAvatar: 'microphone' }),
      table.config.id,
    );
    expect(screen.getByRole('header', { name: 'Replay' })).toBeOnTheScreen();
    expect(screen.getByTestId('replay-counter')).toHaveTextContent(/^Step 1 of \d+$/);
    expect(screen.getByRole('button', { name: 'Next step' })).toBeEnabled();
    await next();
    expect(screen.getByTestId('replay-narration')).toHaveTextContent(/^(Me|NinaVolt) · chooses /);
  });
});
