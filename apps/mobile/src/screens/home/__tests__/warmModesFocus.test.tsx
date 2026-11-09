// First: expo-router's testing library swaps Reanimated for its old mock (no useReducedMotion), unless the real
// module is already in place as the mock (see the jest.mock below).
import 'react-native-reanimated';
import { router } from 'expo-router';
import { act } from 'expo-router/testing-library';

import { useAuth } from '../../../auth/authStore';
import { useGameStore } from '../../../game/gameStore';
import { openPracticeRepo, type PracticeRepo } from '../../../game/practiceRepo';
import { practiceStorageOrNull } from '../../../game/storage';
import { memoryDb } from '../../../game/testing/sqlJsDb';
import i18n from '../../../i18n';
import { usePracticeHistory } from '../../../state/practiceHistory';
import { useProfile } from '../../../state/profile';
import { usePracticeStats } from '../practiceStats';
import { renderApp } from '../testing/homeTesting';

/**
 * QA run #3, T3-FIRST-PLAY-SLOW (docs/PERF.md, B14/B32): Home makes "משחק חדש" ready ahead of the first tap
 * (./warmModes.ts), only while Home is the screen shown. Home stays mounted under the screens it opens: a game
 * opened before the warm-up ran ("עוד סיבוב") must not have it run in the middle of play.
 */

type Mocks = typeof import('../testing/nativeMocks');

const mockWarmLater = jest.fn<void, [string | null]>();
const mockStopWarm = jest.fn();
jest.mock('../warmModes', () => ({
  warmModesLater: (avatarId: string | null) => {
    mockWarmLater(avatarId);
    return mockStopWarm;
  },
}));
jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated'));
jest.mock('../../../game/storage', () => jest.requireActual<Mocks>('../testing/nativeMocks').practiceStorage);
jest.mock('../../../services/analytics', () => ({ track: jest.fn() }));
jest.mock('expo-audio', () => jest.requireActual<Mocks>('../testing/nativeMocks').expoAudio);
jest.mock('expo-haptics', () => jest.requireActual<Mocks>('../testing/nativeMocks').expoHaptics);

let repo: PracticeRepo;

beforeEach(async () => {
  jest.useRealTimers();
  mockWarmLater.mockClear();
  mockStopWarm.mockClear();
  repo = await openPracticeRepo(await memoryDb());
  jest.mocked(practiceStorageOrNull).mockImplementation(async () => repo);
  usePracticeHistory.setState({ recent: [], status: 'idle' });
  usePracticeStats.setState({ gamesPlayed: null, winRate: null, streak: null });
  useProfile.setState({ name: null, avatarId: 'cassette', country: 'IL', lastPlay: null, botLevel: null });
  // The Splash is gone: the sign-in has its answer.
  useAuth.setState({ status: 'ready', user: null, me: null });
  await i18n.changeLanguage('he');
});

afterEach(() => {
  useAuth.setState({ status: 'loading', user: null, me: null });
  useGameStore.getState().clear();
  jest.useRealTimers();
});

it('warms "משחק חדש" for my avatar while Home is shown, stops when a screen covers Home, and again on return', async () => {
  await renderApp('/');
  expect(mockWarmLater).toHaveBeenCalledTimes(1);
  expect(mockWarmLater).toHaveBeenLastCalledWith('cassette');
  expect(mockStopWarm).not.toHaveBeenCalled();

  // A screen over Home (a game, the settings) before the warm-up ran: it is stopped, never run under it.
  await act(async () => router.push('/settings'));
  expect(mockStopWarm).toHaveBeenCalledTimes(1);
  expect(mockWarmLater).toHaveBeenCalledTimes(1);

  // Home shown again: it may run now (it does each avatar once).
  await act(async () => router.back());
  expect(mockWarmLater).toHaveBeenCalledTimes(2);
});

it('waits for the Splash: nothing warms while the sign-in loads', async () => {
  useAuth.setState({ status: 'loading' });
  await renderApp('/');
  expect(mockWarmLater).not.toHaveBeenCalled();
});
