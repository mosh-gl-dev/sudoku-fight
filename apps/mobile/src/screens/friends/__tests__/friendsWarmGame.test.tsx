// First: keeps the real Reanimated in place of the router testing library's old mock (see homeTesting.tsx).
import 'react-native-reanimated';
import { act, screen, waitFor } from 'expo-router/testing-library';
import { createAudioPlayer } from 'expo-audio';
import { Text } from 'react-native';

import FriendsRoomRoute from '../../../../app/friends/room';
import { useAuth } from '../../../auth/authStore';
import { usePendingInvite } from '../../../auth/pendingInvite';
import { useGameStore } from '../../../game/gameStore';
import { openPracticeRepo } from '../../../game/practiceRepo';
import { practiceStorageOrNull } from '../../../game/storage';
import { memoryDb } from '../../../game/testing/sqlJsDb';
import i18n from '../../../i18n';
import { createFriendsRooms } from '../../../net/friends';
import { deviceFriendsDeps, setFriendsRooms } from '../../../net/friendsDevice';
import { DANA, elapse, FakeFriendsTable, FakeRoomsApi } from '../../../net/testing/fakeFriends';
import { CUES, GAME_CUES } from '../../../services/feedback';
import { sfx, type SoundId, voicesOf } from '../../../services/sfx';
import { useProfile } from '../../../state/profile';
import { useSettings } from '../../../state/settings';
import { renderApp } from '../../home/testing/homeTesting';
import { FRIENDS_COUNT_CUES, loadGameCode, warmFriendsGameSteps } from '../../match/warmGame';

/**
 * QA go-hold-long-on-joiner (APK 14): on the phone that joined a friends room right after the app started, GO!
 * with "מכינים את הלוח…" stayed ~2.1 s before the board; ~1.0 s in every later game. That phone never passed the
 * game type screen or a search, where a ranked game's first game is made ready (warmGame.ts, QA K2), so its first
 * game built the game screen's 13 sound players (each a stall of the UI thread with the JS thread waiting) and
 * loaded its code as the board was coming, under GO!. Now the room's lobby makes them, a step per idle moment,
 * and stops when the count starts.
 */

type Mocks = typeof import('../../home/testing/nativeMocks');

jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated'));
jest.mock(
  '../../../game/storage',
  () => jest.requireActual<Mocks>('../../home/testing/nativeMocks').practiceStorage,
);
jest.mock('../../../services/analytics', () => ({ track: jest.fn() }));
jest.mock('expo-audio', () => jest.requireActual<Mocks>('../../home/testing/nativeMocks').expoAudio);
jest.mock('expo-haptics', () => jest.requireActual<Mocks>('../../home/testing/nativeMocks').expoHaptics);
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(() => Promise.resolve(true)),
  getStringAsync: jest.fn(() => Promise.resolve('')),
}));
// The game screen's code: when it is first required.
const mockGameCode = jest.fn();
jest.mock('../../game', () => {
  mockGameCode();
  return {};
});

const ROUTES = {
  'friends/room': () => <FriendsRoomRoute />,
  game: () => <Text testID="stub-game">game</Text>,
};

const made = jest.mocked(createAudioPlayer);
const playersOf = (cues: readonly (keyof typeof CUES)[]) =>
  [...new Set(cues.map((c) => CUES[c].sound))]
    .filter((s): s is SoundId => s !== null)
    .reduce((n, id) => n + voicesOf(id), 0);

let table: FakeFriendsTable;

beforeEach(async () => {
  jest.useRealTimers();
  const repo = await openPracticeRepo(await memoryDb());
  jest.mocked(practiceStorageOrNull).mockImplementation(async () => repo);
  useProfile.setState({ name: 'Moshe', avatarId: 'av00', country: 'IL', lastPlay: null });
  useSettings.setState({ reduceMotion: 'on', sound: true });
  await i18n.changeLanguage('he');
  useAuth.setState({ status: 'ready' });
  usePendingInvite.setState({ room: null });
  table = new FakeFriendsTable();
  const api = new FakeRoomsApi(table);
  setFriendsRooms(createFriendsRooms(deviceFriendsDeps({ api: () => api, makeHost: () => table.host })));
  sfx.release();
  made.mockClear();
  mockGameCode.mockClear();
});

afterEach(async () => {
  await act(async () => useGameStore.getState().clear());
  setFriendsRooms(null);
  sfx.release();
});

const serve = (ms = 100) => act(() => elapse(table, ms));

it('the lobby makes the first game’s players and loads its code; the count makes nothing new (QA go-hold-long-on-joiner)', async () => {
  const app = await renderApp('/friends/room?create=1', ROUTES);
  await serve();
  await waitFor(() => expect(screen.getByTestId('friends-code')).toBeOnTheScreen());
  await act(async () =>
    table.arrive({ id: DANA, name: 'Dana', avatarId: 'av00', country: 'IL', rating: 1190 }),
  );
  await serve();
  // Waiting for the host's "התחל": the game screen's players and code, then the count's two.
  const all = playersOf([...GAME_CUES, ...FRIENDS_COUNT_CUES]);
  // (The lobby's own cue, Dana coming in, may make one more.)
  await waitFor(() => expect(made.mock.calls.length).toBeGreaterThanOrEqual(all), { timeout: 5000 });
  expect(mockGameCode).toHaveBeenCalledTimes(1);
  const before = made.mock.calls.length;

  // 3… 2… 1…, GO! and the game: the count plays players already made.
  await act(async () => void table.countdown(3000));
  await serve();
  await waitFor(() => expect(screen.getByTestId('friends-countdown-step')).toHaveTextContent('3'));
  await act(async () => {
    await elapse(table, 3000);
    table.startGame();
  });
  await serve();
  await waitFor(() => expect(app.pathname()).toBe('/game'));
  expect(made).toHaveBeenCalledTimes(before);
});

it('the steps: the game screen’s sounds first, then its code, then the count’s two', () => {
  const steps = warmFriendsGameSteps();
  expect(steps).toHaveLength(GAME_CUES.length + 1 + FRIENDS_COUNT_CUES.length);
  expect(steps[GAME_CUES.length]).toBe(loadGameCode);
});
