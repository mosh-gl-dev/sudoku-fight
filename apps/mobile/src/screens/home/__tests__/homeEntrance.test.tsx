// First: expo-router's testing library swaps Reanimated for its old mock (no useReducedMotion), unless the real
// module is already in place as the mock (see the jest.mock below).
import 'react-native-reanimated';
import { act, screen } from 'expo-router/testing-library';

import { useAuth } from '../../../auth/authStore';
import { ENTER } from '../../../components/ui/Enter';
import { useGameStore } from '../../../game/gameStore';
import { openPracticeRepo, type PracticeRepo } from '../../../game/practiceRepo';
import { practiceStorageOrNull } from '../../../game/storage';
import { memoryDb } from '../../../game/testing/sqlJsDb';
import i18n from '../../../i18n';
import { usePracticeHistory } from '../../../state/practiceHistory';
import { useProfile } from '../../../state/profile';
import { useSettings } from '../../../state/settings';
import { homeEntrancePending, markHomeEntrancePlayed, resetHomeEntrance } from '../homeEntrance';
import { usePracticeStats } from '../practiceStats';
import { renderApp } from '../testing/homeTesting';
import { seedPractices } from '../testing/seed';

/**
 * Home's entrance (MOT-3): the first time Home is seen in a run, the profile card rises, "שחק" settles in and the
 * recent games stagger; it waits for the Splash to go (Home is mounted under it while the sign-in loads), plays
 * once per run, and with Reduced Motion everything is simply there.
 */

type Mocks = typeof import('../testing/nativeMocks');

jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated'));
jest.mock('../../../game/storage', () => jest.requireActual<Mocks>('../testing/nativeMocks').practiceStorage);
jest.mock('../../../services/analytics', () => ({ track: jest.fn() }));
jest.mock('expo-audio', () => jest.requireActual<Mocks>('../testing/nativeMocks').expoAudio);
jest.mock('expo-haptics', () => jest.requireActual<Mocks>('../testing/nativeMocks').expoHaptics);

const hidden = { includeHiddenElements: true };
const storage = jest.mocked(practiceStorageOrNull);
let repo: PracticeRepo;

/** The entrance wrapper around an element: its parent, the one with the animated style (or a plain View). */
const wrapperOf = (testID: string) => screen.getByTestId(testID, hidden).parent!;
const animatedStyleOf = (testID: string) =>
  (wrapperOf(testID).props as { jestAnimatedStyle?: unknown }).jestAnimatedStyle;

async function frames(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

beforeEach(async () => {
  resetHomeEntrance();
  repo = await openPracticeRepo(await memoryDb());
  storage.mockImplementation(async () => repo);
  usePracticeHistory.setState({ recent: [], status: 'idle' });
  usePracticeStats.setState({ gamesPlayed: null, winRate: null, streak: null });
  useProfile.setState({ name: null, avatarId: 'av00', country: 'IL', lastPlay: null, botLevel: null });
  useSettings.setState({ reduceMotion: 'off' });
  useAuth.setState({ status: 'ready' });
  await i18n.changeLanguage('he');
});

afterEach(() => {
  useGameStore.getState().clear();
  useAuth.setState({ status: 'loading' });
  useSettings.setState({ reduceMotion: 'system' });
  jest.useRealTimers();
});

describe('Home’s entrance (MOT-3)', () => {
  it('the card rises, "שחק" settles in, the recent games stagger in, once', async () => {
    await seedPractices(repo);
    await renderApp();
    await screen.findByTestId('recent-list');
    expect(wrapperOf('profile-card')).toHaveAnimatedStyle({
      opacity: 0,
      transform: [{ translateY: ENTER.rise }],
    });
    expect(wrapperOf('play')).toHaveAnimatedStyle({ opacity: 0, transform: [{ scale: ENTER.settleFrom }] });
    expect(homeEntrancePending()).toBe(false);

    await frames(2000);
    expect(wrapperOf('profile-card')).toHaveAnimatedStyle({ opacity: 1, transform: [{ translateY: 0 }] });
    expect(wrapperOf('play')).toHaveAnimatedStyle({ opacity: 1, transform: [{ scale: 1 }] });
    const rows = screen.getByTestId('recent-list').children as { props: { jestAnimatedStyle?: unknown } }[];
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.props.jestAnimatedStyle).toBeDefined();
      expect(row).toHaveAnimatedStyle({ opacity: 1, transform: [{ translateY: 0 }] });
    }
  });

  it('once in, the card is opaque in its own style: a later render of Home never hides it (B46)', async () => {
    await renderApp();
    await screen.findByTestId('profile-card');
    expect(wrapperOf('profile-card')).toHaveStyle({ opacity: 0 });
    await frames(2000);
    for (const id of ['profile-card', 'play']) expect(wrapperOf(id)).toHaveStyle({ opacity: 1 });
    // The card's content changes (the name comes, as the account does after the restart for a new direction).
    await act(async () => useProfile.setState({ name: 'מומו' }));
    expect(screen.getByTestId('profile-name')).toHaveTextContent('מומו');
    expect(wrapperOf('profile-card')).toHaveStyle({ opacity: 1, transform: [{ translateY: 0 }] });
  });

  it('waits for the Splash to go: under it (the sign-in loading) the parts hold at their start', async () => {
    useAuth.setState({ status: 'loading' });
    await renderApp();
    await frames(2000);
    expect(wrapperOf('profile-card')).toHaveAnimatedStyle({ opacity: 0 });
    // Its start is its own style, with nothing animated on it to be synced back over its end later (B46).
    expect(wrapperOf('profile-card')).toHaveStyle({ opacity: 0, transform: [{ translateY: ENTER.rise }] });
    expect(animatedStyleOf('profile-card')).toEqual({ value: {} });
    expect(homeEntrancePending()).toBe(true);
    // Signed out: the Splash stays until Login replaces Home, so Home's entrance is kept for later.
    await act(async () => useAuth.setState({ status: 'signedOut' }));
    await frames(2000);
    expect(wrapperOf('profile-card')).toHaveAnimatedStyle({ opacity: 0 });
    expect(homeEntrancePending()).toBe(true);
    await act(async () => useAuth.setState({ status: 'ready' }));
    await frames(2000);
    expect(wrapperOf('profile-card')).toHaveAnimatedStyle({ opacity: 1, transform: [{ translateY: 0 }] });
    expect(homeEntrancePending()).toBe(false);
  });

  it('once per run: a Home mounted after the entrance played (signed out and in again) is simply there', async () => {
    markHomeEntrancePlayed();
    await renderApp();
    expect(animatedStyleOf('profile-card')).toBeUndefined();
    expect(animatedStyleOf('play')).toBeUndefined();
    expect(screen.getByTestId('profile-card')).toBeOnTheScreen();
  });

  it('Reduced Motion: everything is there at once, nothing animated', async () => {
    useSettings.setState({ reduceMotion: 'on' });
    await seedPractices(repo);
    await renderApp();
    await screen.findByTestId('recent-list');
    expect(animatedStyleOf('profile-card')).toBeUndefined();
    expect(animatedStyleOf('play')).toBeUndefined();
    const rows = screen.getByTestId('recent-list').children as { props: { jestAnimatedStyle?: unknown } }[];
    for (const row of rows) expect(row.props.jestAnimatedStyle).toBeUndefined();
  });
});
