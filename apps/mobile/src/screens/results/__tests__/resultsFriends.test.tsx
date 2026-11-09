import { act, render, screen } from '@testing-library/react-native';

import { useGameStore } from '../../../game/gameStore';
import i18n from '../../../i18n';
import { elapse } from '../../../net/testing/fakeServer';
import { useSettings } from '../../../state/settings';
import { liveOnlineSession } from '../../game/testing/online';
import { loadOnlineResults, type ResultsSession, sessionResultsModel } from '../resultsModel';
import { ResultsScreen } from '../ResultsScreen';

/**
 * The results of a game with friends (1.0.4; friends-room.md §3.5, D81a): the ranked game's screen, named "משחק
 * עם חברים", and "משחק עם חברים · בלי דירוג" where a ranked game waits for its rating.
 */

jest.mock('expo-router', () => ({ router: { replace: jest.fn(), dismissTo: jest.fn() } }));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../../../services/feedback', () => ({ cue: jest.fn() }));
jest.mock('../../../services/analytics', () => ({ track: jest.fn() }));

const settle = () =>
  act(async () => {
    await new Promise((r) => setImmediate(r));
  });

beforeEach(async () => {
  await i18n.changeLanguage('he');
  useSettings.setState({ reduceMotion: 'on' });
});

afterEach(() => useGameStore.getState().clear());

/** A finished online game, as a friends room's session hands it to the results (OnlineSession.isFriends). */
async function friendsGameOver(isFriends = true): Promise<{ session: ResultsSession; close: () => void }> {
  const game = await liveOnlineSession();
  game.session.endPractice();
  await elapse(game.table, 200);
  const s = game.session;
  return {
    session: {
      id: s.id,
      mode: s.mode,
      gameType: s.gameType,
      playerId: s.playerId,
      getView: () => s.getView(),
      profiles: s.profiles,
      isFriends,
    },
    close: () => s.close(),
  };
}

describe('the results of a game with friends', () => {
  it('the model knows it; any other online game does not say so', async () => {
    const friends = await friendsGameOver();
    expect(sessionResultsModel(friends.session)).toMatchObject({
      mode: 'ranked',
      friends: true,
      rating: null,
    });
    friends.close();
    const ranked = await friendsGameOver(false);
    expect(sessionResultsModel(ranked.session)).not.toHaveProperty('friends');
    ranked.close();
  });

  it('says "משחק עם חברים", and "בלי דירוג" instead of waiting for one', async () => {
    const { session, close } = await friendsGameOver();
    await render(
      <ResultsScreen
        gameId={session.id}
        load={(id) => Promise.resolve(loadOnlineResults(id, session))}
        onNewGame={jest.fn()}
        onHome={jest.fn()}
      />,
    );
    await settle();
    expect(screen.getByText('משחק עם חברים · מהיר · 2 שחקנים')).toBeOnTheScreen();
    expect(screen.getByTestId('results-unrated')).toHaveTextContent('משחק עם חברים · בלי דירוג');
    expect(screen.queryByTestId('results-rating')).toBeNull();
    close();
  });

  it.each([
    ['with friends', true],
    ['ranked', false],
  ])('no correct move: said for a game, not "באימון הזה" (B41, B54): %s', async (_kind, isFriends) => {
    const { session, close } = await friendsGameOver(isFriends);
    await render(
      <ResultsScreen
        gameId={session.id}
        load={(id) => Promise.resolve(loadOnlineResults(id, session))}
        onNewGame={jest.fn()}
        onHome={jest.fn()}
      />,
    );
    await settle();
    const best = screen.getByTestId('results-best');
    expect(best).toHaveTextContent('לא היה לך מהלך נכון במשחק הזה', { exact: false });
    expect(best).not.toHaveTextContent(/אימון/);
    expect(best).toHaveProp('accessibilityLabel', 'לא היה לך מהלך נכון במשחק הזה');
    close();
  });

  it('in English too', async () => {
    await i18n.changeLanguage('en');
    const { session, close } = await friendsGameOver();
    await render(
      <ResultsScreen
        gameId={session.id}
        load={(id) => Promise.resolve(loadOnlineResults(id, session))}
        onNewGame={jest.fn()}
        onHome={jest.fn()}
      />,
    );
    await settle();
    expect(screen.getByTestId('results-unrated')).toHaveTextContent('Game with friends · unrated');
    expect(screen.getByTestId('results-best')).toHaveTextContent('You had no correct move in this game', {
      exact: false,
    });
    close();
  });
});
