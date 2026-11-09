import { toView } from '@sudoku-fight/engine';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { avatarIdsIn } from '../../../avatars/testing/avatarTesting';
import { formatScore, ltr, scoreText, signedText } from '../../../components/player';
import i18n from '../../../i18n';
import { useProfile } from '../../../state/profile';
import { useSettings } from '../../../state/settings';
import { formatClock } from '../../game/model';
import { fourPlayerGame } from '../../replay/testing/games';
import {
  loadPracticeResults,
  type ResultsLoad,
  type ScoreCount,
  scoreCountsOf,
  sessionResultsModel,
} from '../resultsModel';
import { PODIUM_GROW_MS, PODIUM_STAGGER_MS, victory } from '../resultsMotion';
import { ResultsScreen, type ResultsScreenProps } from '../ResultsScreen';
import {
  completedPractice,
  endedPractice,
  interruptedPractice,
  type SavedPractice,
} from '../testing/practiceGames';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../../../services/feedback', () => ({ cue: jest.fn() }));
const feedback = jest.requireMock<{ cue: jest.Mock }>('../../../services/feedback');
jest.mock('../../../services/crashlytics', () => {
  const reporter = { enabled: true, recordError: jest.fn(), setUser: jest.fn(), log: jest.fn() };
  return { crashReporter: () => reporter };
});
const crash = jest
  .requireMock<{ crashReporter: () => { recordError: jest.Mock } }>('../../../services/crashlytics')
  .crashReporter();

const hidden = { includeHiddenElements: true };

/** The counts by name, as the rule's line says them in Hebrew and English. */
const NAMES_HE = (digit: number): Record<ScoreCount, string> => ({
  row: 'השורה',
  col: 'הטור',
  box: 'הריבוע',
  num: `ספרות ה־${digit}`,
});
const NAMES_EN = (digit: number): Record<ScoreCount, string> => ({
  row: 'the row',
  col: 'the column',
  box: 'the box',
  num: `the ${digit}s`,
});

/** Reads the saved game from the practice's database, as after a restart (no session around). */
const fromDisk = (game: SavedPractice) => (id: string) =>
  loadPracticeResults(id, { repo: async () => game.repo, session: () => null });

async function show(
  load: (id: string) => Promise<ResultsLoad>,
  id: string,
  props: Partial<ResultsScreenProps> = {},
) {
  const onNewGame = jest.fn();
  const onHome = jest.fn();
  await render(<ResultsScreen gameId={id} load={load} onNewGame={onNewGame} onHome={onHome} {...props} />);
  // The load resolves on the next turns.
  await act(async () => {
    await new Promise((r) => setImmediate(r));
  });
  return { onNewGame, onHome };
}

beforeEach(async () => {
  jest.clearAllMocks();
  await i18n.changeLanguage('he');
  useSettings.setState({ reduceMotion: 'off' });
  useProfile.setState({ avatarId: 'fox' });
});

describe('ResultsScreen (solo practice, spec §12)', () => {
  it('a practice ended early: score, mistakes, the move of the game with its calculation, time, moves, think time', async () => {
    const game = await endedPractice();
    const me = game.session.getView().players[0]!;
    const best = me.bestMove!;
    await show(fromDisk(game), game.session.id);

    expect(screen.getByRole('header', { name: 'האימון הסתיים' })).toBeOnTheScreen();
    expect(screen.getByTestId('results-end')).toHaveTextContent(
      'איך זה נגמר: סיימת את האימון לפני שהלוח התמלא',
    );
    expect(screen.getByText('אימון לבד · מהיר')).toBeOnTheScreen();
    expect(screen.getByTestId('results-score', hidden)).toHaveTextContent(scoreText(me.score));
    expect(screen.getByLabelText(`ניקוד סופי: ${scoreText(me.score)} נקודות`)).toBeOnTheScreen();

    // The move of the game in plain words: its four counts, the two that set the score, and the rule.
    const b = best.breakdown;
    expect(screen.getByTestId('results-best', hidden)).toHaveTextContent(signedText(best.points), {
      exact: false,
    });
    expect(screen.getByTestId('results-best-counts', hidden)).toHaveTextContent(
      `${b.row}בשורה${b.col}בטור${b.box}בריבוע${b.num}ספרות ${best.digit} בלוח`,
    );
    expect(screen.getAllByTestId(/^results-best-count-.*-marked$/, hidden)).toHaveLength(2);
    const { highest, next } = scoreCountsOf(b);
    const he = NAMES_HE(best.digit);
    expect(screen.getByTestId('results-best-why', hidden)).toHaveTextContent(
      `ככל שפחות מלא סביב המשבצת, המהלך שווה יותר. את הניקוד קבעו שתי הספירות הגבוהות: ${he[highest.count]} במשקל מלא, ו${he[next.count]} בחצי משקל.`,
    );
    // The marked counts are those two.
    expect(screen.getByTestId(`results-best-count-${highest.count}-marked`, hidden)).toBeTruthy();
    expect(screen.getByTestId(`results-best-count-${next.count}-marked`, hidden)).toBeTruthy();
    expect(screen.getByTestId('results-best')).toHaveProp(
      'accessibilityLabel',
      expect.stringContaining(`מהלך המשחק: ${ltr(formatScore(best.points))} נקודות`),
    );
    expect(screen.getByTestId('results-best')).toHaveProp(
      'accessibilityLabel',
      expect.stringContaining(
        `כמה היה מלא לפני המהלך: ${b.row} בשורה, ${b.col} בטור, ${b.box} בריבוע, הספרה ${best.digit} `,
      ),
    );
    // The engine's raw line is gone: no English formula on a Hebrew screen.
    expect(screen.queryByText(/points =/, hidden)).toBeNull();

    expect(screen.getByLabelText(`זמן משחק: ${formatClock(10_000)}`)).toBeOnTheScreen();
    expect(screen.getByLabelText('טעויות: 1')).toBeOnTheScreen();
    expect(screen.getByLabelText('מהלכים נכונים: 2')).toBeOnTheScreen();
    expect(screen.getByLabelText('זמן חשיבה ממוצע: 2.5 ש׳')).toBeOnTheScreen();
    expect(feedback.cue).not.toHaveBeenCalled();
  });

  it('an interrupted practice says so, with the numbers its log reached', async () => {
    const game = await interruptedPractice();
    await show(fromDisk(game), game.session.id);
    expect(screen.getByRole('header', { name: 'האימון נקטע' })).toBeOnTheScreen();
    expect(screen.getByTestId('results-end')).toHaveTextContent(
      'איך זה נגמר: האימון נעצר באמצע, למשל כשהאפליקציה נסגרה',
    );
    expect(screen.getByLabelText('טעויות: 1')).toBeOnTheScreen();
    expect(screen.getByLabelText('מהלכים נכונים: 1')).toBeOnTheScreen();
    expect(screen.getByLabelText('זמן חשיבה ממוצע: 2.5 ש׳')).toBeOnTheScreen();
    expect(screen.getByTestId('results-best-why', hidden)).toHaveTextContent(/^ככל שפחות מלא/);
    expect(screen.queryByText(/points =/, hidden)).toBeNull();
  });

  it('a full board just played gets its title and its fanfare', async () => {
    jest.useFakeTimers();
    try {
      const game = await completedPractice();
      await render(
        <ResultsScreen
          gameId={game.session.id}
          load={fromDisk(game)}
          celebrate
          onNewGame={jest.fn()}
          onHome={jest.fn()}
        />,
      );
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
      expect(screen.getByRole('header', { name: 'הלוח הושלם!' })).toBeOnTheScreen();
      await act(async () => {
        jest.advanceTimersByTime(200);
      });
      expect(feedback.cue).toHaveBeenCalledWith('practiceDone');
    } finally {
      jest.useRealTimers();
    }
  });

  it('the buttons: a new game of the same kind, home, and the replay of this game (stage 11)', async () => {
    const game = await endedPractice();
    const onReplay = jest.fn();
    const { onNewGame, onHome } = await show(fromDisk(game), game.session.id, { onReplay });
    const again = screen.getByRole('button', { name: 'משחק חדש' });
    expect(again).toHaveProp('accessibilityHint', 'מתחיל מיד עוד אימון לבד, מהיר');
    await fireEvent.press(again);
    // A frame or two later (the spinner's commit goes first: K1).
    await waitFor(() => expect(again).not.toBeBusy());
    expect(onNewGame).toHaveBeenCalledWith({
      mode: 'solo',
      gameType: 'fast',
      botLevel: null,
      botName: null,
      players: 1,
      friends: false,
    });
    const replay = screen.getByRole('button', { name: 'צפייה חוזרת' });
    expect(replay).toBeEnabled();
    expect(replay).toHaveProp('accessibilityHint', 'המשחק מההתחלה, שלב אחרי שלב, עם הסבר לכל מהלך');
    await fireEvent.press(replay);
    expect(onReplay).toHaveBeenCalledWith(game.session.id, 'solo');
    await fireEvent.press(screen.getByRole('button', { name: 'לבית' }));
    expect(onHome).toHaveBeenCalledTimes(1);
  });

  it('speaks English too', async () => {
    await i18n.changeLanguage('en');
    const game = await endedPractice();
    const best = game.session.getView().players[0]!.bestMove!;
    const { highest, next } = scoreCountsOf(best.breakdown);
    const en = NAMES_EN(best.digit);
    await show(fromDisk(game), game.session.id);
    expect(screen.getByRole('header', { name: 'Practice ended' })).toBeOnTheScreen();
    expect(screen.getByText('Solo practice · Fast')).toBeOnTheScreen();
    expect(screen.getByTestId('results-best-why', hidden)).toHaveTextContent(
      `The emptier around the cell, the more a move is worth. The two fullest set the score: ${en[highest.count]} at full weight, ${en[next.count]} at half weight.`,
    );
    expect(screen.getByText('Filled before the move', hidden)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'New game' })).toHaveProp(
      'accessibilityHint',
      'Starts another solo practice right away, Fast',
    );
    expect(screen.getByLabelText('Mistakes: 1')).toBeOnTheScreen();
    expect(screen.getByLabelText('Avg. think time: 2.5 s')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'New game' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Replay' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Home' })).toBeOnTheScreen();
  });

  it('an interrupted practice in English', async () => {
    await i18n.changeLanguage('en');
    const game = await interruptedPractice();
    await show(fromDisk(game), game.session.id);
    expect(screen.getByRole('header', { name: 'Practice interrupted' })).toBeOnTheScreen();
  });

  it('shows a loading state, then a missing or unreadable game with a way home', async () => {
    let resolve: (r: ResultsLoad) => void = () => undefined;
    const pending = new Promise<ResultsLoad>((r) => (resolve = r));
    const onHome = jest.fn();
    await render(<ResultsScreen gameId="x" load={() => pending} onNewGame={jest.fn()} onHome={onHome} />);
    expect(screen.getByText('טוען את התוצאה…')).toBeOnTheScreen();
    await act(async () => resolve({ kind: 'missing' }));
    expect(screen.getByRole('header', { name: 'לא מצאנו את האימון הזה' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'לבית' }));
    expect(onHome).toHaveBeenCalled();

    await render(
      <ResultsScreen
        gameId="y"
        load={async () => ({ kind: 'unavailable' })}
        onNewGame={jest.fn()}
        onHome={onHome}
      />,
    );
    await act(async () => undefined);
    expect(screen.getByRole('header', { name: 'לא הצלחנו לקרוא את האימונים השמורים' })).toBeOnTheScreen();
  });

  it('a load that fails is reported, and says so with a way home: never a spinner for ever (bug 9)', async () => {
    const boom = new Error('could not read');
    const onHome = jest.fn();
    await render(
      <ResultsScreen gameId="z" load={() => Promise.reject(boom)} onNewGame={jest.fn()} onHome={onHome} />,
    );
    await act(async () => undefined);
    expect(screen.getByRole('header', { name: 'לא הצלחנו לקרוא את האימונים השמורים' })).toBeOnTheScreen();
    expect(crash.recordError).toHaveBeenCalledWith(boom, 'results: could not load');
    await fireEvent.press(screen.getByRole('button', { name: 'לבית' }));
    expect(onHome).toHaveBeenCalled();
  });

  it('the hero: my own avatar over the title (it was missing in 1.0.4), with no crown and no confetti alone', async () => {
    useSettings.setState({ reduceMotion: 'on' });
    const game = await completedPractice();
    await show(fromDisk(game), game.session.id);
    expect(avatarIdsIn(screen.getByTestId('results-hero-avatar', hidden))).toEqual(['fox']);
    expect(screen.getByRole('header', { name: 'הלוח הושלם!' })).toBeOnTheScreen();
    // A full board is gold, with its edge; but a crown and confetti are for a win against someone.
    expect(screen.getByTestId('results-title-edge', hidden)).toHaveTextContent('הלוח הושלם!');
    expect(screen.queryByTestId('results-crown', hidden)).toBeNull();
    expect(screen.queryByTestId('results-confetti', hidden)).toBeNull();
    expect(screen.queryByTestId('results-score-count', hidden)).toBeNull();
  });

  it('the hero idles only as the winner (spec §3.4): a full board yes, a practice ended early no', async () => {
    const done = await completedPractice();
    await show(fromDisk(done), done.session.id);
    // Idling: its moving parts in layers of their own, never one still picture of the whole avatar.
    expect(avatarIdsIn(screen.getByTestId('results-hero-avatar', hidden))).toEqual([]);
    screen.unmount();

    const ended = await endedPractice();
    await show(fromDisk(ended), ended.session.id);
    expect(avatarIdsIn(screen.getByTestId('results-hero-avatar', hidden))).toEqual(['fox']);
  });

  it('"משחק חדש" shows it is starting until the start settles, and takes no second tap meanwhile', async () => {
    const game = await endedPractice();
    let finish: () => void = () => undefined;
    const onNewGame = jest.fn(() => new Promise<void>((r) => (finish = r)));
    await show(fromDisk(game), game.session.id, { onNewGame });
    await fireEvent.press(screen.getByTestId('results-new-game'));
    expect(screen.getByTestId('results-new-game')).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ busy: true }),
    );
    await fireEvent.press(screen.getByTestId('results-new-game'));
    await waitFor(() => expect(onNewGame).toHaveBeenCalled());
    expect(onNewGame).toHaveBeenCalledTimes(1);
    await act(async () => finish());
    expect(screen.getByTestId('results-new-game')).not.toHaveProp(
      'accessibilityState',
      expect.objectContaining({ busy: true }),
    );
  });

  // K1 (2026-11-06): the spinner and the next screen in one commit tore the React host down on Android (a ranked
  // or friends start navigates at once). The results' last change is committed and drawn first, frames before.
  it('"משחק חדש" commits its spinner frames before it starts the next game (never in the same commit)', async () => {
    const game = await endedPractice();
    jest.useFakeTimers({ doNotFake: ['setImmediate'] });
    try {
      const onNewGame = jest.fn();
      await show(fromDisk(game), game.session.id, { onNewGame });
      await fireEvent.press(screen.getByTestId('results-new-game'));
      expect(screen.getByTestId('results-new-game')).toHaveProp(
        'accessibilityState',
        expect.objectContaining({ busy: true }),
      );
      expect(onNewGame).not.toHaveBeenCalled();
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      expect(onNewGame).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('"משחק חדש" starts nothing once the results are gone before its frames pass', async () => {
    const game = await endedPractice();
    jest.useFakeTimers({ doNotFake: ['setImmediate'] });
    try {
      const onNewGame = jest.fn();
      await show(fromDisk(game), game.session.id, { onNewGame });
      await fireEvent.press(screen.getByTestId('results-new-game'));
      await screen.unmount();
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      expect(onNewGame).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('the podium of 3–4 players grows (motion.md §4.7 `podium`)', () => {
  const table = fourPlayerGame();
  const ranking = table.state.result!.ranking;
  const me = ranking.find((r) => r.place === 2)!.playerId;
  const model = sessionResultsModel({
    id: table.config.id,
    mode: table.config.mode,
    gameType: table.config.gameType,
    playerId: me,
    getView: () => toView(table.state, me, table.now),
  })!;
  const steps = () =>
    [1, 2, 3].map((place) => {
      const r = ranking.find((x) => x.place === place)!;
      return screen.getByTestId(`results-podium-${place}-${r.playerId}-step`);
    });

  afterEach(() => jest.useRealTimers());

  it('each column grows from its foot as the ranking lands, 100 ms after the one beside it', async () => {
    jest.useFakeTimers({ doNotFake: ['setImmediate'] });
    await show(async () => ({ kind: 'found', model }), model.gameId);
    for (const step of steps()) expect(step).toHaveAnimatedStyle({ transform: [{ scaleY: 0 }] });
    const end = victory.crownAt + victory.awardsStagger + 2 * PODIUM_STAGGER_MS + PODIUM_GROW_MS;
    for (let t = 0; t < end + 200; t += 50)
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
    for (const step of steps()) expect(step).toHaveAnimatedStyle({ transform: [{ scaleY: 1 }] });
  });

  it('reduced motion: the steps are at their height from the start', async () => {
    useSettings.setState({ reduceMotion: 'on' });
    await show(async () => ({ kind: 'found', model }), model.gameId);
    for (const step of steps()) expect(step).toHaveAnimatedStyle({ transform: [{ scaleY: 1 }] });
  });
});
