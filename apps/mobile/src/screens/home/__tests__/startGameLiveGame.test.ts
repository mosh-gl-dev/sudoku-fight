import { router } from 'expo-router';

import { useAuth } from '../../../auth/authStore';
import { type GameStoreState, useGameStore } from '../../../game/gameStore';
import * as rankedResume from '../../../game/rankedResume';
import { startAndOpen, startRankedAndOpen } from '../startGame';

/**
 * QA "density-change-orphans-ranked-game" (MAJOR): after Android recreated the activity mid ranked game, the app
 * showed Home while the game store still held the game. "Play ranked" there started a search, which first closed
 * the game: its room left on purpose (a consented leave), which the server ends as abandonment once the grace
 * runs out (a loss, −13), and the search itself was refused alreadyQueued. A start never leaves a live online
 * game behind: it opens that game instead.
 */

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() } }));
jest.mock('../../../services/analytics', () => ({ track: jest.fn() }));

const push = jest.mocked(router.push);
const replace = jest.mocked(router.replace);

/** An online game in the store, as liveFlow reads it. */
function online(o: { status?: string; over?: boolean; hasGame?: boolean; friends?: boolean } = {}) {
  return {
    hasGame: o.hasGame ?? true,
    isFriends: o.friends ?? false,
    getView: () => ({ status: o.over ? 'over' : 'running' }),
    online: { status: o.status ?? 'live' },
    close: jest.fn(),
  };
}
const hold = (state: Partial<Record<'session' | 'online' | 'match', unknown>>) =>
  useGameStore.setState({ session: null, online: null, match: null, ...state } as Partial<GameStoreState>);

beforeEach(() => {
  push.mockClear();
  replace.mockClear();
  // Verified and not suspended: ranked would start.
  useAuth.setState({ user: { uid: 'u1', emailVerified: true } as never, me: null });
});
afterEach(() => hold({}));

describe('a start while a ranked or friends game still runs (density-change-orphans-ranked-game)', () => {
  it('"Play ranked": the running game opens; no search, the game is not left', () => {
    const game = online({ status: 'reconnecting' });
    hold({ online: game });
    const startRanked = jest.spyOn(useGameStore.getState(), 'startRanked');
    expect(startRankedAndOpen({ gameType: 'fast', players: 2 }, 'push')).toBe(false);
    expect(push).toHaveBeenCalledWith('/game');
    expect(push).not.toHaveBeenCalledWith('/match');
    expect(startRanked).not.toHaveBeenCalled();
    expect(game.close).not.toHaveBeenCalled();
    expect(useGameStore.getState().online).toBe(game);
  });

  it("during a start's quiet join back into the game: it says so, and that join opens no second game screen", () => {
    const shown = jest.spyOn(rankedResume, 'noteLiveGameShown');
    hold({ online: online({ status: 'connecting', hasGame: false }) });
    expect(startRankedAndOpen({ gameType: 'fast', players: 2 }, 'push')).toBe(false);
    expect(push).toHaveBeenCalledWith('/game');
    expect(shown).toHaveBeenCalledTimes(1);
    shown.mockRestore();
  });

  it('a practice or a bot from Home: the same; a friends lobby opens its room', async () => {
    const game = online();
    hold({ online: game });
    expect(await startAndOpen({ mode: 'solo', gameType: 'fast' }, 'replace')).toBe(true);
    expect(replace).toHaveBeenCalledWith('/game');
    expect(game.close).not.toHaveBeenCalled();

    const lobby = online({ status: 'lobby', hasGame: false, friends: true });
    hold({ online: lobby });
    expect(await startAndOpen({ mode: 'bot', gameType: 'fast' }, 'push')).toBe(true);
    expect(push).toHaveBeenCalledWith('/friends/room');
    expect(lobby.close).not.toHaveBeenCalled();
  });

  it('a game over (the results\' "new game") or a closed connection does not hold a start back', () => {
    const startRanked = jest
      .spyOn(useGameStore.getState(), 'startRanked')
      .mockImplementation(() => ({}) as never);
    for (const game of [online({ over: true }), online({ status: 'closed' })]) {
      hold({ online: game });
      push.mockClear();
      expect(startRankedAndOpen({ gameType: 'fast', players: 2 }, 'push')).toBe(true);
      expect(push).toHaveBeenCalledWith('/match');
    }
    expect(startRanked).toHaveBeenCalledTimes(2);
  });
});
