import { type PlayerInfo, toView } from '@sudoku-fight/engine';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, ScrollView } from 'react-native';

import i18n from '../../../i18n';
import { useProfile } from '../../../state/profile';
import { useSettings } from '../../../state/settings';
import { configOf, Table } from '../../replay/testing/games';
import { type ResultsSession, sessionResultsModel } from '../resultsModel';
import { ResultsScreen } from '../ResultsScreen';

/**
 * fixcheck APK 18, results-reduced-motion-late-cards-and-count: the phone's animations were turned off while the
 * app was open ("כמו במכשיר" follows the phone). The results still ran in full motion: the cards rose at +0.85 s,
 * the bar at +1.9 s, the view jumped ~60 dp at +1.2 s (the glide, with the phone's animator at 0) and the rating
 * counted. The app's decision read the phone once, at start (Reanimated's useReducedMotion). Now it follows the
 * phone's change: nothing glides and the new rating is simply there.
 */

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../../../services/feedback', () => ({ cue: jest.fn() }));

const hidden = { includeHiddenElements: true };
// Spied on before the app's one subscription to the phone's setting is made (by the first screen that asks).
const listen = jest.spyOn(AccessibilityInfo, 'addEventListener');

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
const session: ResultsSession = {
  id: table.config.id,
  mode: table.config.mode,
  gameType: table.config.gameType,
  playerId: 'me',
  getView: () => toView(table.state, 'me', table.now),
};
const scrollToMock = () => ScrollView.prototype.scrollTo as unknown as jest.Mock;

beforeEach(async () => {
  await i18n.changeLanguage('he');
  useProfile.setState({ avatarId: 'lava-lamp' });
  scrollToMock().mockClear();
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

async function showWithPhoneTurningReduceOn() {
  // "כמו במכשיר"; the phone did not reduce motion when the app started.
  useSettings.setState({ reduceMotion: 'system' });
  const model = sessionResultsModel(session)!;
  await render(
    <ResultsScreen
      gameId={model.gameId}
      load={jest.fn()}
      initial={{ kind: 'found', model }}
      onNewGame={jest.fn()}
      onHome={jest.fn()}
    />,
  );
  // Now the phone's animations go off (QA: animator, transition and window scales at 0).
  const changed = (listen.mock.calls as unknown as [string, (value: boolean) => void][]).filter(
    ([event]) => event === 'reduceMotionChanged',
  );
  expect(changed).toHaveLength(1);
  const handler = changed[0]![1];
  await act(async () => handler(true));
  // The A16 after a full-board game: the rating card's title in view, its number (650 + 80) under the edge.
  const layout = (y: number, height: number) => ({
    nativeEvent: { layout: { x: 0, y, width: 400, height } },
  });
  await fireEvent(screen.getByTestId('results-scroll'), 'layout', layout(0, 700));
  await fireEvent(screen.getByTestId('results-rating-block', hidden), 'layout', layout(650, 260));
  await fireEvent(screen.getByTestId('results-rating-row', hidden), 'layout', layout(40, 40));
}

it('the phone turns Reduce Motion on while the app runs: no glide, no count, the new rating at once', async () => {
  await showWithPhoneTurningReduceOn();
  // A frame later (the animated text is set on the UI side): the new rating, not the old one counting up.
  await act(async () => {
    jest.advanceTimersByTime(50);
  });
  expect(screen.getByTestId('results-rating-value', hidden)).toHaveAnimatedProps({
    text: String(Math.round(mine.after)),
  });
  await act(async () => {
    jest.advanceTimersByTime(2_950);
  });
  // No jump of the view (the loop-10 glide is a full-motion nicety) and still the new rating.
  expect(scrollToMock()).not.toHaveBeenCalled();
  expect(screen.getByTestId('results-rating-value', hidden)).toHaveAnimatedProps({
    text: String(Math.round(mine.after)),
  });
  // Everything is there from the first frame: the opponent, the rating card and the action bar.
  expect(screen.getByTestId('results-actions', hidden)).toBeOnTheScreen();
  expect(screen.getByTestId('results-opponent-nina', hidden)).toBeOnTheScreen();
});
