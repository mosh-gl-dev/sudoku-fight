// First: expo-router's testing library swaps Reanimated for its old mock (no useReducedMotion), unless the real
// module is already in place as the mock (see the jest.mock below).
import 'react-native-reanimated';
import { act, renderRouter, screen } from 'expo-router/testing-library';
import Storage from 'expo-sqlite/kv-store';
import { Text } from 'react-native';

import RootLayout from '../../app/_layout';
import { usePendingInvite } from '../auth/pendingInvite';
import { installSignedInPlayer } from '../auth/testing/testAuth';
import { useGameStore } from '../game/gameStore';
import { forgetRankedGame, readRankedGame, setRankedResumeDeps } from '../game/rankedResume';
import i18n from '../i18n';
import { RemoteGameHost } from '../net/remoteGameHost';
import { CODE, elapse, FakeTable, ME } from '../net/testing/fakeServer';
import { useSettings } from '../state/settings';

/**
 * The review of loop 8 (and QA "density-change-orphans-ranked-game"): the app's process killed mid ranked game
 * and opened again within the grace. The server holds the seat for the same account (GameRoom holdSeat, loop 8),
 * but the app started on Home with no way back, and the game was recorded as a loss. Through the real root
 * layout (its auth gate): the start goes back into the same game, by its room, and the game screen opens.
 */

jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated'));
jest.mock('../services/analytics', () => ({ track: jest.fn() }));
jest.mock('../services/telemetry', () => ({
  startTelemetry: jest.fn(),
  telemetry: () => ({ track: jest.fn() }),
}));
// The layout opens the practice database: here it never opens (and is not needed).
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: () => new Promise(() => undefined) }));

jest.setTimeout(60_000);

function stand(name: string) {
  return function StandIn() {
    return <Text testID={`screen-${name}`}>{name}</Text>;
  };
}

const ROUTES = {
  _layout: RootLayout,
  index: stand('home'),
  login: stand('login'),
  game: stand('game'),
  match: stand('match'),
  'friends/room': stand('friends-room'),
  'room/[code]': stand('room'),
};

/** A ranked game on the fake server, the phone's process killed in it (no goodbye; the server saw it drop). */
async function gameLeftByAKilledApp(): Promise<FakeTable> {
  const table = new FakeTable();
  await table.host.join(CODE);
  table.lobby();
  table.startGame();
  await elapse(table, 300);
  table.cutMe();
  table.host.close();
  await elapse(table, 100);
  return table;
}

beforeEach(async () => {
  await i18n.changeLanguage('he');
  useSettings.setState({ language: 'he', reduceMotion: 'on', sound: false, haptics: false });
  usePendingInvite.setState({
    invite: null,
    room: null,
    arrival: null,
    started: false,
    prompt: null,
    going: null,
  });
  useGameStore.setState({ session: null, online: null, match: null, view: null, lastUpdate: null });
  forgetRankedGame();
});

afterEach(() => {
  useGameStore.getState().clear();
  setRankedResumeDeps(null);
});

describe('the app killed mid ranked game, opened again within the grace', () => {
  it('starts back in the same game (its room joined again by the same account), not on Home', async () => {
    const auth = await installSignedInPlayer();
    const uid = auth.provider.currentUser()!.uid;
    const table = await gameLeftByAKilledApp();
    const joinsBefore = table.calls.filter((c) => c.kind === 'join').length;
    // What the killed app kept on the phone (game/rankedResume.ts followRankedGame): the room, never a token.
    Storage.setItemSync(
      'ranked-game',
      JSON.stringify({ roomId: CODE, gameType: 'fast', owner: uid, at: Date.now(), profiles: null }),
    );
    setRankedResumeDeps({
      makeHost: () =>
        new RemoteGameHost({ client: table, clock: table.clock, scheduler: table.scheduler, appState: null }),
      schedule: (run, ms) => void table.scheduler.setTimeout(run, ms),
    });

    const app = renderRouter(ROUTES, { initialUrl: '/' });
    await app;
    await screen.findByTestId('screen-game');
    expect(app.getPathname()).toBe('/game');
    await act(async () => elapse(table, 200));

    const online = useGameStore.getState().online!;
    expect(online.hasGame).toBe(true);
    expect(online.playerId).toBe(ME);
    expect(online.getView().status).toBe('running');
    expect(table.calls.filter((c) => c.kind === 'join').length).toBe(joinsBefore + 1);
    expect(table.meAtServer?.connected).toBe(true);
    // Still kept (the game goes on), now for this run's session.
    expect(readRankedGame()?.roomId).toBe(CODE);
  });

  it('another account on this phone: Home, nothing joined', async () => {
    await installSignedInPlayer();
    const table = await gameLeftByAKilledApp();
    Storage.setItemSync(
      'ranked-game',
      JSON.stringify({
        roomId: CODE,
        gameType: 'fast',
        owner: 'someone-else',
        at: Date.now(),
        profiles: null,
      }),
    );
    const joins = table.calls.length;
    setRankedResumeDeps({
      makeHost: () =>
        new RemoteGameHost({ client: table, clock: table.clock, scheduler: table.scheduler, appState: null }),
    });
    const app = renderRouter(ROUTES, { initialUrl: '/' });
    await app;
    await screen.findByTestId('screen-home');
    await act(async () => elapse(table, 200));
    expect(app.getPathname()).toBe('/');
    expect(table.calls.length).toBe(joins);
  });
});
