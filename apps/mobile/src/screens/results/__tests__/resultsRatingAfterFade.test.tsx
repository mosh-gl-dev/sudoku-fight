import { type PlayerInfo, toView } from '@sudoku-fight/engine';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ScrollView } from 'react-native';

import i18n from '../../../i18n';
import { space } from '../../../theme';
import { useProfile } from '../../../state/profile';
import { useSettings } from '../../../state/settings';
import { configOf, Table } from '../../replay/testing/games';
import { sessionResultsModel } from '../resultsModel';
import { RATING_SETTLE_MS, ResultsScreen } from '../ResultsScreen';

/**
 * fullboard-empty-frame, loop 12 review: on Android the handed-over results mount their rating card only once the
 * stack's fade is over (useStackEntered.ts), up to about a second after the screen's first frame. The glide that
 * brings the card's number into view, and the count from the old rating to the new one, still run at
 * `ratingCountAt` from that first frame, not 1200 ms after the late card; and a glide tried before the card has
 * laid out is tried again (it used to be tried once: the number then stayed under the bar, the count waiting for a
 * scroll, the APK 14 bug back).
 */

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../../../services/feedback', () => ({ cue: jest.fn() }));

const hidden = { includeHiddenElements: true };

/** Two rated players; `me` fills most of the board and wins. */
function rankedDuel(): Table {
  const players: PlayerInfo[] = [
    { id: 'me', name: 'Moshe', rating: 1287, ratedGames: 12 },
    { id: 'nina', name: 'NinaVolt', rating: 1305, ratedGames: 12 },
  ];
  const table = new Table(configOf('ranked', players, { id: 'duel' }));
  let k = 0;
  while (table.state.status === 'running') {
    table.move(k % 4 === 3 ? 'nina' : 'me', table.empty()[0]!, 1_000);
    k++;
  }
  return table;
}

const table = rankedDuel();
const mine = table.state.result!.ratingChanges.find((c) => c.playerId === 'me')!;
const model = sessionResultsModel({
  id: table.config.id,
  mode: table.config.mode,
  gameType: table.config.gameType,
  playerId: 'me',
  getView: () => toView(table.state, 'me', table.now),
})!;

const scrollToMock = () => ScrollView.prototype.scrollTo as unknown as jest.Mock;
const ratingShows = (rating: number) =>
  expect(screen.getByTestId('results-rating-value', hidden)).toHaveAnimatedProps({
    text: String(Math.round(rating)),
  });
const layout = (y: number, height: number) => ({ nativeEvent: { layout: { x: 0, y, width: 400, height } } });
const tick = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

beforeEach(async () => {
  await i18n.changeLanguage('he');
  useSettings.setState({ reduceMotion: 'off' });
  useProfile.setState({ avatarId: 'lava-lamp' });
  scrollToMock().mockClear();
});

it('a rating card that mounted after a late fade glides and counts at ratingCountAt from the first frame, its layout in late', async () => {
  jest.useFakeTimers();
  try {
    const screenOf = (entered: number | null) => (
      <ResultsScreen
        gameId={model.gameId}
        load={async () => ({ kind: 'found', model })}
        initial={{ kind: 'found', model }}
        entered={entered}
        onNewGame={jest.fn()}
        onHome={jest.fn()}
      />
    );
    const view = await render(screenOf(null));
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByTestId('results-rating-block', hidden)).toBeNull();
    // The fade began late and ended 1000 ms after the first frame: the card mounts now.
    await tick(1000);
    await view.rerender(screenOf(1000));
    expect(screen.getByTestId('results-rating-block', hidden)).toBeTruthy();
    // A slow phone: its layouts come 250 ms later (past ratingCountAt from the first frame, 1200).
    await tick(250);
    await fireEvent(screen.getByTestId('results-scroll'), 'layout', layout(0, 700));
    await fireEvent(screen.getByTestId('results-rating-block', hidden), 'layout', layout(650, 260));
    await fireEvent(screen.getByTestId('results-rating-row', hidden), 'layout', layout(40, 40));
    // The glide comes once the card has had RATING_SETTLE_MS to lay out (it was tried once at 1200 and lost).
    await tick(RATING_SETTLE_MS - 250);
    expect(scrollToMock()).toHaveBeenCalledWith({ y: 30 + space[8], animated: true });
    ratingShows(mine.before);
    await fireEvent.scroll(screen.getByTestId('results-scroll'), {
      nativeEvent: { contentOffset: { x: 0, y: 30 + space[8] }, contentSize: { width: 400, height: 1800 } },
    });
    // In view at 1300: the count runs then, not 1200 ms after the card's mount (2200).
    await tick(900);
    await tick(10);
    ratingShows(mine.after);
  } finally {
    jest.useRealTimers();
  }
});

it('a glide tried before the late card has laid out is tried again', async () => {
  jest.useFakeTimers();
  try {
    const screenOf = (entered: number | null) => (
      <ResultsScreen
        gameId={model.gameId}
        load={async () => ({ kind: 'found', model })}
        initial={{ kind: 'found', model }}
        entered={entered}
        onNewGame={jest.fn()}
        onHome={jest.fn()}
      />
    );
    const view = await render(screenOf(null));
    await act(async () => {
      await Promise.resolve();
    });
    await tick(1000);
    await view.rerender(screenOf(1000));
    // Tried at 1300, with nothing laid out: nothing to move yet.
    await tick(RATING_SETTLE_MS);
    expect(scrollToMock()).not.toHaveBeenCalled();
    // The layouts come in at 1450; the next try (1600) glides.
    await tick(150);
    await fireEvent(screen.getByTestId('results-scroll'), 'layout', layout(0, 700));
    await fireEvent(screen.getByTestId('results-rating-block', hidden), 'layout', layout(650, 260));
    await fireEvent(screen.getByTestId('results-rating-row', hidden), 'layout', layout(40, 40));
    await tick(RATING_SETTLE_MS - 150);
    expect(scrollToMock()).toHaveBeenCalledTimes(1);
    expect(scrollToMock()).toHaveBeenCalledWith({ y: 30 + space[8], animated: true });
  } finally {
    jest.useRealTimers();
  }
});
