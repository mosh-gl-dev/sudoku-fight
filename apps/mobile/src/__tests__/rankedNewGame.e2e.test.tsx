// First, before anything of the app loads: the globals the phone's JS engine (Hermes) lacks are taken away.
import { onHermes } from '../testing/asOnHermes';
// Then: expo-router's testing library swaps Reanimated for its old mock (no useReducedMotion), unless the real
// module is already in place as the mock (see the jest.mock below).
import 'react-native-reanimated';
import type { PlayerInfo } from '@sudoku-fight/engine';
import type { HistoryPage, MatchPlayer } from '@sudoku-fight/protocol';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import RootLayout from '../../app/_layout';
import BotSelectRoute from '../../app/bot-select';
import GameRoute from '../../app/game';
import GameTypeRoute from '../../app/game-type';
import Index from '../../app/index';
import MatchRoute from '../../app/match/index';
import ModesRoute from '../../app/modes';
import ResultsRoute from '../../app/results/[id]';
import { installSignedInPlayer } from '../auth/testing/testAuth';
import type { RankedDeps } from '../game/gameStore';
import { useGameStore } from '../game/gameStore';
import { PUZZLE } from '../game/testing/practice';
import { memoryDb, type SqlJsDb } from '../game/testing/sqlJsDb';
import i18n from '../i18n';
import { FakeMatchmaking } from '../net/testing/fakeMatchmaking';
import { elapse, FakeTable, ME, OPP } from '../net/testing/fakeServer';
import { rankedRefresh } from '../progress/appProgress';
import type { HistoryApi } from '../screens/history/historyApi';
import { track } from '../services/analytics';
import { useProfile } from '../state/profile';
import { useSettings } from '../state/settings';

/**
 * "משחק חדש" on the results of a ranked game (QA 03.11.2026, NEW-black-new-game: on the A16 the whole app went
 * dark ~0.9 s after the tap, three times out of three). The flow through the app's real routes, as on the phone
 * (Hermes' globals, Reduced Motion off): a ranked 2-player game that the opponent gives up → the results →
 * "משחק חדש" → the search in the same queue at once (the results replaced, the finished game let go, never a
 * fallback, an error screen or a report) → found → 3-2-1 → the new game's board.
 *
 * This passes in Jest: the black screen is the phone's React host torn down by an exception this run never meets
 * (react-native-screens, Reanimated's UI thread, react-native-svg drawing, the network SDK), see the item's notes.
 * It keeps the JS side of the flow covered: nothing tested "משחק חדש" after a ranked game before.
 */

/** A fake game server and matchmaking per search, as the phone's wiring makes one per search. */
const mockNet: {
  players: PlayerInfo[];
  table: FakeTable | null;
  mm: FakeMatchmaking | null;
  searches: number;
  deps(): RankedDeps;
} = {
  players: [],
  table: null,
  mm: null,
  searches: 0,
  deps() {
    const table = new FakeTable({ players: mockNet.players });
    table.clock.set(Date.now());
    const mm = new FakeMatchmaking(table.clock, table.scheduler);
    mm.rating = 1200;
    mockNet.table = table;
    mockNet.mm = mm;
    mockNet.searches += 1;
    return {
      connector: mm,
      clock: table.clock,
      scheduler: table.scheduler,
      track: (name, props) => track(name, props),
      makeHost: () => table.host,
    };
  },
};

const mockApp: { db: SqlJsDb | null; history: HistoryApi | null } = { db: null, history: null };

jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated'));
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: async () => mockApp.db }));
jest.mock('../services/analytics', () => ({ track: jest.fn() }));
jest.mock('../services/crashlytics', () => {
  const reporter = { enabled: true, recordError: jest.fn(), setUser: jest.fn(), log: jest.fn() };
  return { crashReporter: () => reporter };
});
const crash = jest
  .requireMock<{ crashReporter: () => { recordError: jest.Mock } }>('../services/crashlytics')
  .crashReporter();
jest.mock('../net/matchmakingDevice', () => ({ deviceMatchmakingDeps: () => mockNet.deps() }));
type MockWiring = typeof import('../screens/history/appWiring');
jest.mock('../screens/history/appWiring', () => {
  const actual = jest.requireActual<MockWiring>('../screens/history/appWiring');
  return {
    signedInHistoryApi: () => mockApp.history,
    appHistoryDeps: () => ({ ...actual.appHistoryDeps(), ranked: mockApp.history }),
    appReplayDeps: () => ({ ...actual.appReplayDeps(), ranked: mockApp.history }),
  } satisfies MockWiring;
});
type NativeMocks = typeof import('../screens/home/testing/nativeMocks');
jest.mock(
  'expo-audio',
  () => jest.requireActual<NativeMocks>('../screens/home/testing/nativeMocks').expoAudio,
);
jest.mock(
  'expo-haptics',
  () => jest.requireActual<NativeMocks>('../screens/home/testing/nativeMocks').expoHaptics,
);

jest.setTimeout(300_000);

const ROUTES = {
  _layout: RootLayout,
  index: Index,
  modes: ModesRoute,
  'game-type': GameTypeRoute,
  'bot-select': BotSelectRoute,
  'match/index': MatchRoute,
  game: GameRoute,
  'results/[id]': ResultsRoute,
};

const ME_MATCH: MatchPlayer = {
  id: ME,
  name: 'Tester',
  avatarId: 'sun',
  country: 'IL',
  rating: 1200,
  provisional: true,
};
const NINA: MatchPlayer = {
  id: OPP,
  name: 'NinaVolt',
  avatarId: 'maya',
  country: 'DE',
  rating: 1305,
  provisional: false,
};
const infoOf = (p: MatchPlayer): PlayerInfo => ({
  id: p.id,
  name: p.name,
  rating: p.rating,
  ratedGames: p.provisional ? 0 : 12,
});

/** The phone's timers and the fake servers' clock move on together, `step` at a time. */
async function pass(ms: number, step = 50) {
  for (let done = 0; done < ms; done += step) {
    const d = Math.min(step, ms - done);
    await act(async () => {
      const table = mockNet.table;
      if (table) await elapse(table, d, Math.min(10, d));
      jest.advanceTimersByTime(d);
    });
  }
}

/** A message from a fake server, now. */
async function server(send: () => void) {
  await act(async () => send());
}

const press = (testID: string) => fireEvent.press(screen.getByTestId(testID));

/** Moves on until `ok`, a little at a time. */
async function passUntil(ok: () => boolean, max = 5000, step = 50) {
  for (let done = 0; done < max && !ok(); done += step) await pass(step, step);
  expect(ok()).toBe(true);
}

/** Nothing went wrong on the way: no fallback, no error screen, no report. */
function nothingBroke() {
  expect(screen.queryByTestId('flow-fallback')).toBeNull();
  expect(screen.queryByTestId('error-screen')).toBeNull();
  expect(crash.recordError).not.toHaveBeenCalled();
}

/** found → everyone in → 3 · 2 · 1 → GO and the board, on the search's own fake servers. */
async function foundToBoard(pathname: () => string) {
  const mm = mockNet.mm!;
  const table = mockNet.table!;
  await server(() => mm.found({ players: [ME_MATCH, NINA] }));
  await pass(100);
  await server(() => mm.ready([ME, OPP]));
  await server(() => void mm.countdown(3000));
  await pass(3000, 100);
  await server(() => {
    mm.started();
    table.startGame();
  });
  await passUntil(() => pathname() === '/game', 2000);
  await screen.findByTestId('game');
}

beforeAll(async () => {
  mockApp.db = await memoryDb();
  await installSignedInPlayer();
  mockApp.history = {
    async myGames() {
      const page: HistoryPage = { games: [], nextCursor: null };
      return page;
    },
    async replay() {
      throw new Error('not in this test');
    },
  };
});

afterAll(() => onHermes.restore());

beforeEach(async () => {
  await i18n.changeLanguage('he');
  // As on the QA phones: Reduced Motion off, so every entrance and press animates.
  useSettings.setState({ language: 'he', reduceMotion: 'off', sound: true, haptics: true });
  useProfile.setState({ lastPlay: null, botLevel: null });
  crash.recordError.mockClear();
  mockNet.players = [ME_MATCH, NINA].map(infoOf);
  mockNet.searches = 0;
});

afterEach(async () => {
  await act(async () => {
    useGameStore.getState().clear();
    rankedRefresh().stop();
  });
  jest.useRealTimers();
});

it('ranked results → "משחק חדש": the search in the same queue at once, then found, the count and a new board', async () => {
  const app = renderRouter(ROUTES, { initialUrl: '/' });
  const rendered = await app;
  await screen.findByTestId('home-scroll');

  // ---- Home → "שחק" → "מדורג · 2" → the type → "מצא יריב" → found → GO → the board ----
  await fireEvent.press(screen.getByRole('button', { name: 'שחק' }));
  await waitFor(() => expect(app.getPathname()).toBe('/modes'));
  await press('mode-ranked2');
  await waitFor(() => expect(app.getPathname()).toBe('/game-type'));
  await press(`type-${PUZZLE.gameType}`);
  await fireEvent.press(screen.getByRole('button', { name: 'מצא יריב' }));
  await waitFor(() => expect(app.getPathname()).toBe('/match'));
  await server(() => mockNet.mm!.searching());
  await foundToBoard(() => app.getPathname());

  // ---- Nina gives up: the results ----
  const first = mockNet.table!;
  await server(() => void first.opponent({ type: 'surrender' }));
  const id = first.game!.state.config.id;
  await passUntil(
    () => app.getPathname() === `/results/${id}` && screen.queryByTestId('results-title') !== null,
  );
  const finished = useGameStore.getState().online;
  expect(finished?.id).toBe(id);

  // ---- "משחק חדש": the search replaces the results at once, in the same queue ----
  await press('results-new-game');
  await pass(100);
  expect(app.getPathname()).toBe('/match');
  expect(screen.queryByTestId('results-title')).toBeNull();
  expect(mockNet.searches).toBe(2);
  expect(mockNet.mm!.joins).toEqual([`${PUZZLE.gameType}-2p`]);
  const { match, online } = useGameStore.getState();
  expect(match?.queueKey).toBe(`${PUZZLE.gameType}-2p`);
  // The finished game is let go (its room left): only the new search is in the store.
  expect(online).toBeNull();
  expect(screen.getByRole('header')).toHaveTextContent('מתחבר לתור…');
  nothingBroke();

  // ---- The server answers: searching, then found (a rematch), the count, and the new game's board ----
  await server(() => mockNet.mm!.searching());
  expect(screen.getByRole('header')).toHaveTextContent('מחפש יריב…');
  await foundToBoard(() => app.getPathname());
  // A new game's session (each fake table numbers its games from 1, so the id alone can't tell).
  expect(useGameStore.getState().online).not.toBeNull();
  expect(useGameStore.getState().online).not.toBe(finished);
  nothingBroke();
  rendered.unmount();
});
