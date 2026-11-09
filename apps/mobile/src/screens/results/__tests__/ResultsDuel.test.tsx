import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import { formatScore, ltr, scoreText } from '../../../components/player';
import i18n from '../../../i18n';
import { useProfile } from '../../../state/profile';
import { useSettings } from '../../../state/settings';
import { color } from '../../../theme';
import { formatSeconds } from '../../game/model';
import { BOT } from '../../game/testing/duel';
import { loadPracticeResults, type ResultsLoad, resultsModel } from '../resultsModel';
import { COUNT_MS, POP_FROM, SLAM_FROM, TITLE_DROP, victory } from '../resultsMotion';
import { ResultsScreen, type ResultsScreenProps } from '../ResultsScreen';
import { AwardsSection } from '../ResultsVersus';
import { endedDuel, lostDuel, type SavedDuel, tiedRecord, wonDuel } from '../testing/duelGames';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../../../services/feedback', () => ({ cue: jest.fn() }));
// The burst itself is Confetti's own (40 pieces, each frame by frame, would take seconds under Jest): here only
// whether the results mount it, and when it starts.
jest.mock('../../../components/ui/Confetti', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Confetti: ({ testID, delayMs }: { testID?: string; delayMs?: number }) =>
      createElement(View, { testID, accessibilityValue: { now: delayMs } }),
  };
});
const feedback = jest.requireMock<{ cue: jest.Mock }>('../../../services/feedback');

const hidden = { includeHiddenElements: true };

/** Reads the saved game from the practice's database, as after a restart. */
const fromDisk = (game: SavedDuel) => (id: string) =>
  loadPracticeResults(id, { repo: async () => game.repo, session: () => null });

async function show(
  load: (id: string) => Promise<ResultsLoad>,
  id: string,
  props: Partial<ResultsScreenProps> = {},
) {
  const onNewGame = jest.fn();
  const onHome = jest.fn();
  await render(<ResultsScreen gameId={id} load={load} onNewGame={onNewGame} onHome={onHome} {...props} />);
  await act(async () => {
    await new Promise((r) => setImmediate(r));
  });
  return { onNewGame, onHome };
}

/** A tie, from a won game's record (see tiedRecord). */
async function tiedLoad(game: SavedDuel) {
  const saved = (await game.repo.getGame(game.id))!;
  const events = await game.repo.loadEvents(game.id);
  const model = resultsModel(tiedRecord(saved, BOT.id), events);
  return async (): Promise<ResultsLoad> => ({ kind: 'found', model });
}

beforeEach(async () => {
  jest.clearAllMocks();
  await i18n.changeLanguage('he');
  useSettings.setState({ reduceMotion: 'off' });
  useProfile.setState({ avatarId: 'fox' });
});

/** Steps the test's clock in frames, for the entrance's springs and timers (fake timers only). */
async function frames(ms: number, frame = 50) {
  for (let t = 0; t < ms; t += frame) {
    await act(async () => {
      jest.advanceTimersByTime(frame);
    });
  }
}

/** Renders with the test's clock faked (the load still resolves on a real setImmediate). */
async function showTimed(load: (id: string) => Promise<ResultsLoad>, id: string) {
  jest.useFakeTimers({ doNotFake: ['setImmediate'] });
  await show(load, id);
}

describe('ResultsScreen against a bot (spec §12)', () => {
  it('a win: the headline, how it ended, my numbers, the bot’s row, the awards, and no rating change', async () => {
    const game = await wonDuel();
    const view = game.host.getView();
    const me = view.players[0]!;
    const result = view.result!;
    await show(fromDisk(game), game.id);

    expect(screen.getByRole('header', { name: 'ניצחון!' })).toBeOnTheScreen();
    expect(screen.getByText('אימון מול בוט · מהיר · 2 שחקנים')).toBeOnTheScreen();
    expect(screen.getByTestId('results-place')).toHaveTextContent('מקום 1 מתוך 2');
    expect(screen.getByTestId('results-end')).toHaveTextContent('איך זה נגמר: הלוח התמלא');
    expect(screen.getByLabelText(`ניקוד סופי: ${scoreText(me.score)} נקודות`)).toBeOnTheScreen();
    expect(screen.getByLabelText('טעויות: 1')).toBeOnTheScreen();
    expect(screen.getByLabelText(`מהלכים נכונים: ${game.cells.length}`)).toBeOnTheScreen();
    expect(screen.getByTestId('results-best-why', hidden)).toHaveTextContent(/^ככל שפחות מלא/);
    expect(screen.queryByText(/points =/, hidden)).toBeNull();

    // The opponent: avatar (with the bot chip), name, score, mistakes.
    const row = screen.getByTestId(`results-opponent-${BOT.id}`);
    expect(row).toHaveProp('accessibilityLabel', 'Mr. Hoot · 0 נקודות · אין טעויות');
    expect(within(row).getByTestId('bot-chip', hidden)).toBeOnTheScreen();
    expect(screen.getByTestId(`results-opponent-${BOT.id}-score`, hidden)).toHaveTextContent('0');

    // The awards: mine say "אני", the bot's its name.
    const best = result.awards.find((a) => a.kind === 'bestMove')!;
    expect(screen.getByTestId('results-award-bestMove')).toHaveProp(
      'accessibilityLabel',
      `המהלך הטוב ביותר: אני, ${ltr(formatScore(best.value))} נק׳. הניקוד הגבוה ביותר במהלך בודד`,
    );
    expect(screen.getByTestId('results-award-fewestMistakes')).toHaveProp(
      'accessibilityLabel',
      'הכי מעט טעויות: Mr. Hoot, טעויות: 0. הכי מעט טעויות. בתיקו, הניקוד הגבוה יותר',
    );
    const fastest = result.awards.find((a) => a.kind === 'fastest')!;
    expect(screen.getByTestId('results-award-fastest')).toHaveProp(
      'accessibilityLabel',
      `הכי מהיר: אני, ${formatSeconds(fastest.value)} ש׳ למהלך. זמן החשיבה הממוצע הנמוך ביותר למהלך נכון (לפחות 5 מהלכים)`,
    );
    expect(screen.getByTestId('results-unrated')).toHaveTextContent('אימון: אין שינוי בדירוג');
    expect(feedback.cue).not.toHaveBeenCalled();
  });

  it('a loss: "הפסד", and the bot’s winning score in its row', async () => {
    const game = await lostDuel();
    const bot = game.host.getView().players[1]!;
    await show(fromDisk(game), game.id);
    expect(screen.getByRole('header', { name: 'הפסד' })).toBeOnTheScreen();
    expect(screen.getByTestId(`results-opponent-${BOT.id}`)).toHaveProp(
      'accessibilityLabel',
      `Mr. Hoot · ${scoreText(bot.score)} נקודות · אין טעויות`,
    );
    expect(screen.getByLabelText('מהלכים נכונים: 1')).toBeOnTheScreen();
  });

  it('a practice I ended: a loss, said as "סיימת את האימון…"', async () => {
    const game = await endedDuel();
    await show(fromDisk(game), game.id);
    expect(screen.getByRole('header', { name: 'הפסד' })).toBeOnTheScreen();
    expect(screen.getByTestId('results-end')).toHaveTextContent(
      'איך זה נגמר: סיימת את האימון לפני שהלוח התמלא',
    );
  });

  it('a tie: "תיקו"', async () => {
    const game = await wonDuel();
    await show(await tiedLoad(game), game.id);
    expect(screen.getByRole('header', { name: 'תיקו' })).toBeOnTheScreen();
    expect(screen.queryByTestId('results-awards')).toBeNull();
  });

  it('just played: a win sounds the win (with the count’s ticks), a loss the loss', async () => {
    // The load on a real setImmediate; the entrance on the test's clock, a frame at a time (running every
    // pending timer at once would play the whole confetti burst frame by frame).
    jest.useFakeTimers({ doNotFake: ['setImmediate'] });
    try {
      const won = await wonDuel();
      await show(fromDisk(won), won.id, { celebrate: true });
      await frames(victory.slamAt + 50);
      expect(feedback.cue).toHaveBeenCalledWith('win');
      expect(feedback.cue).not.toHaveBeenCalledWith('countTick');
      // The score's count starts at +900: its five ticks.
      await frames(victory.barsAt - victory.slamAt + 500);
      expect(feedback.cue.mock.calls.filter(([c]) => c === 'countTick')).toHaveLength(5);
      await screen.unmount();

      feedback.cue.mockClear();
      const lost = await lostDuel();
      await show(fromDisk(lost), lost.id, { celebrate: true });
      await frames(victory.barsAt + COUNT_MS);
      expect(feedback.cue).toHaveBeenCalledWith('lose');
      expect(feedback.cue).not.toHaveBeenCalledWith('countTick');
    } finally {
      jest.useRealTimers();
    }
  });

  it('"משחק חדש" asks for the same kind of game: the type, the bot mode and the same bot', async () => {
    const game = await lostDuel();
    const { onNewGame } = await show(fromDisk(game), game.id);
    const again = screen.getByRole('button', { name: 'משחק חדש' });
    expect(again).toHaveProp('accessibilityHint', `מתחיל מיד עוד משחק מול ${ltr('Mr. Hoot')}, מהיר`);
    await fireEvent.press(again);
    // A frame or two later: the spinner's commit goes first (K1).
    await waitFor(() => expect(onNewGame).toHaveBeenCalled());
    expect(onNewGame).toHaveBeenCalledWith({
      mode: 'bot',
      gameType: 'fast',
      botLevel: 3,
      botName: 'Mr. Hoot',
      players: 2,
      friends: false,
    });
  });
});

describe('a win feels like a win (motion.md §4.7, VIS-4, MOT-2)', () => {
  afterEach(() => jest.useRealTimers());

  it('my avatar with the crown; the title slams, the place and the crown pop; one burst of confetti', async () => {
    const game = await wonDuel();
    await showTimed(fromDisk(game), game.id);
    expect(screen.getByTestId('results-hero-avatar', hidden)).toBeTruthy();
    // One burst, as the crown lands (+700).
    expect(screen.getByTestId('results-confetti', hidden)).toHaveProp('accessibilityValue', {
      now: victory.crownAt,
    });
    expect(screen.getByTestId('results-title-edge', hidden)).toHaveTextContent('ניצחון!');
    expect(screen.getByTestId('results-title')).toHaveStyle({ color: color.accent });
    // Before the slam: the word waits big and unseen; the place and the crown wait small.
    expect(screen.getByTestId('results-title-block')).toHaveAnimatedStyle({
      opacity: 0,
      transform: [{ translateY: 0 }, { scale: SLAM_FROM }],
    });
    expect(screen.getByTestId('results-tags')).toHaveAnimatedStyle({
      transform: [{ translateY: 0 }, { scale: POP_FROM }],
    });
    expect(screen.getByTestId('results-crown', hidden)).toHaveAnimatedStyle({
      transform: [{ translateY: 0 }, { scale: POP_FROM }],
    });
    // Landed.
    await frames(victory.crownAt + 1_500);
    expect(screen.getByTestId('results-title-block')).toHaveAnimatedStyle({
      opacity: 1,
      transform: [{ translateY: 0 }, { scale: 1 }],
    });
    expect(screen.getByTestId('results-crown', hidden)).toHaveAnimatedStyle({
      opacity: 1,
      transform: [{ translateY: 0 }, { scale: 1 }],
    });
  });

  it('the final score counts up from +900, then the plain number takes its place', async () => {
    const game = await wonDuel();
    const me = game.host.getView().players[0]!;
    await showTimed(fromDisk(game), game.id);
    // The final number holds its place (and says it) while the count runs over it.
    expect(screen.getByTestId('results-score', hidden)).toHaveTextContent(scoreText(me.score));
    expect(screen.getByTestId('results-score-count', hidden)).toBeTruthy();
    await frames(victory.barsAt + COUNT_MS + 100);
    expect(screen.queryByTestId('results-score-count', hidden)).toBeNull();
    expect(screen.getByTestId('results-score')).toHaveTextContent(scoreText(me.score));
  });

  it('the awards come in one by one from +1500, 150 ms apart, each badge popping', async () => {
    const game = await wonDuel();
    await showTimed(fromDisk(game), game.id);
    const lines = () => screen.getAllByTestId(/^results-award-\w+-in$/);
    expect(lines().length).toBeGreaterThanOrEqual(3);
    for (const line of lines()) expect(line).toHaveAnimatedStyle({ opacity: 0 });
    // The first is in while the third has not started.
    await frames(victory.awardsAt + 250);
    expect(lines()[0]).toHaveAnimatedStyle({ opacity: 1 });
    expect(lines()[2]).toHaveAnimatedStyle({ opacity: 0 });
    await frames(victory.awardsStagger * lines().length + 1_000);
    for (const line of lines()) expect(line).toHaveAnimatedStyle({ opacity: 1 });
  });

  it('a loss enters calmly: no confetti, no crown, no count; the word drops in, muted', async () => {
    const game = await lostDuel();
    await showTimed(fromDisk(game), game.id);
    expect(screen.getByRole('header', { name: 'הפסד' })).toHaveStyle({ color: color.textMuted });
    expect(screen.queryByTestId('results-confetti', hidden)).toBeNull();
    expect(screen.queryByTestId('results-crown', hidden)).toBeNull();
    expect(screen.queryByTestId('results-title-edge', hidden)).toBeNull();
    expect(screen.queryByTestId('results-score-count', hidden)).toBeNull();
    expect(screen.getByTestId('results-title-block')).toHaveAnimatedStyle({
      opacity: 0,
      transform: [{ translateY: -TITLE_DROP }, { scale: 1 }],
    });
    await frames(victory.slamAt + 600);
    expect(screen.getByTestId('results-title-block')).toHaveAnimatedStyle({
      opacity: 1,
      transform: [{ translateY: 0 }, { scale: 1 }],
    });
  });

  it('a tie: no crown and no confetti either', async () => {
    const game = await wonDuel();
    await show(await tiedLoad(game), game.id);
    expect(screen.queryByTestId('results-confetti', hidden)).toBeNull();
    expect(screen.queryByTestId('results-crown', hidden)).toBeNull();
  });

  it('reduced motion: everything in its final state, no confetti, no count, nothing scaled', async () => {
    useSettings.setState({ reduceMotion: 'on' });
    const game = await wonDuel();
    const me = game.host.getView().players[0]!;
    await showTimed(fromDisk(game), game.id);
    expect(screen.queryByTestId('results-confetti', hidden)).toBeNull();
    expect(screen.queryByTestId('results-score-count', hidden)).toBeNull();
    expect(screen.getByTestId('results-score')).toHaveTextContent(scoreText(me.score));
    expect(screen.getByTestId('results-crown', hidden)).toHaveAnimatedStyle({
      transform: [{ translateY: 0 }, { scale: 1 }],
    });
    expect(screen.getByTestId('results-title-block')).toHaveAnimatedStyle({
      transform: [{ translateY: 0 }, { scale: 1 }],
    });
    // The 200 ms fade, together, from the start.
    await frames(300);
    expect(screen.getByTestId('results-title-block')).toHaveAnimatedStyle({ opacity: 1 });
    expect(screen.getByTestId('results-tags')).toHaveAnimatedStyle({ opacity: 1 });
  });
});

describe('the awards, one line each (VIS-4)', () => {
  it('title, who and value on one line; what the award is for opens with a tap', async () => {
    const game = await wonDuel();
    await show(fromDisk(game), game.id);
    const row = screen.getByTestId('results-award-fastest');
    const definition = screen.getByTestId('results-award-fastest-definition', hidden);
    expect(definition).toHaveStyle({ display: 'none' });
    expect(row).toHaveProp('accessibilityState', expect.objectContaining({ expanded: false }));
    await fireEvent.press(row);
    expect(screen.getByTestId('results-award-fastest-definition')).not.toHaveStyle({ display: 'none' });
    expect(screen.getByTestId('results-award-fastest-definition')).toHaveTextContent(
      'זמן החשיבה הממוצע הנמוך ביותר למהלך נכון (לפחות 5 מהלכים)',
    );
    expect(screen.getByTestId('results-award-fastest')).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ expanded: true }),
    );
  });

  it('"Comeback" is said in Hebrew', async () => {
    await render(
      <AwardsSection
        awards={[{ kind: 'comeback', winners: [{ playerId: 'me', name: null, mine: true }], value: 19 }]}
      />,
    );
    expect(screen.getByTestId('results-award-comeback')).toHaveProp(
      'accessibilityLabel',
      `מהפך: אני, פיגור של ${ltr('19')} נק׳. ניצחון אחרי פיגור של 15 נקודות או יותר`,
    );
    expect(screen.queryByText(/Comeback/, hidden)).toBeNull();
  });
});

describe('ResultsScreen against a bot, in English', () => {
  it('win, loss and tie headlines; the opponent, the awards and the rating note', async () => {
    await i18n.changeLanguage('en');
    const won = await wonDuel();
    await show(fromDisk(won), won.id);
    expect(screen.getByRole('header', { name: 'Victory!' })).toBeOnTheScreen();
    expect(screen.getByText('Practice vs bot · Fast · 2 players')).toBeOnTheScreen();
    expect(screen.getByTestId('results-place')).toHaveTextContent('Place 1 of 2');
    expect(screen.getByTestId('results-end')).toHaveTextContent('How it ended: The board filled up');
    expect(screen.getByRole('header', { name: 'Opponent' })).toBeOnTheScreen();
    expect(screen.getByTestId(`results-opponent-${BOT.id}`)).toHaveProp(
      'accessibilityLabel',
      'Mr. Hoot · 0 points · No mistakes',
    );
    expect(screen.getByRole('header', { name: 'Game awards' })).toBeOnTheScreen();
    expect(screen.getByTestId('results-award-fewestMistakes')).toHaveProp(
      'accessibilityLabel',
      'Fewest mistakes: Mr. Hoot, Mistakes: 0. The fewest mistakes. On a tie, the higher score',
    );
    expect(screen.getByTestId('results-unrated')).toHaveTextContent('Practice: your rating does not change');

    const lost = await lostDuel();
    await show(fromDisk(lost), lost.id);
    expect(screen.getByRole('header', { name: 'Defeat' })).toBeOnTheScreen();

    await show(await tiedLoad(won), won.id);
    expect(screen.getByRole('header', { name: 'Draw' })).toBeOnTheScreen();
  });
});
