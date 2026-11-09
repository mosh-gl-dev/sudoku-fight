import 'react-native-reanimated';

import { act, render, screen } from '@testing-library/react-native';
import { NavigationContext } from 'expo-router/react-navigation';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuth } from '../../../auth/authStore';
import { RETIRED_LAYERS_ID } from '../../../avatars/AvatarArt';
import { drawnAvatarId, svgXmlsIn } from '../../../avatars/testing/avatarTesting';
import { openPracticeRepo, type PracticeRepo } from '../../../game/practiceRepo';
import { practiceStorageOrNull } from '../../../game/storage';
import { memoryDb } from '../../../game/testing/sqlJsDb';
import i18n from '../../../i18n';
import { usePracticeHistory } from '../../../state/practiceHistory';
import { useProfile } from '../../../state/profile';
import { useSettings } from '../../../state/settings';
import { markHomeEntrancePlayed, resetHomeEntrance } from '../homeEntrance';
import { HomeScreen } from '../HomeScreen';
import { usePracticeStats } from '../practiceStats';
import { RecentGames } from '../RecentGames';

/**
 * A change of screen from Home and back (B14, QA run #2: each came 0.5 to 1 s after the tap, after one long
 * frame): Home stays as it is under the next screen. Its avatar keeps its layers, the same views (one still
 * picture under the next screen, and the layers again on the way back, drew some 130 shapes each way, and
 * deleted views Reanimated still held), and Home itself does not render again for being covered or shown, nor
 * for its recent games and numbers read again as it is shown, when they did not change.
 */

type Mocks = typeof import('../testing/nativeMocks');

jest.mock('../../../game/storage', () => jest.requireActual<Mocks>('../testing/nativeMocks').practiceStorage);
jest.mock('../../../services/analytics', () => ({ track: jest.fn() }));
jest.mock('expo-audio', () => jest.requireActual<Mocks>('../testing/nativeMocks').expoAudio);
jest.mock('expo-haptics', () => jest.requireActual<Mocks>('../testing/nativeMocks').expoHaptics);
// Home in a navigator of its own (below): its focus effect runs as it comes into view and each time it is shown
// again, as expo-router's does (it reads the recent games and the numbers again).
jest.mock('expo-router', () => {
  const actual = jest.requireActual<typeof import('expo-router')>('expo-router');
  const { useContext, useEffect } = jest.requireActual<typeof import('react')>('react');
  const { NavigationContext: Navigation } = jest.requireActual<typeof import('expo-router/react-navigation')>(
    'expo-router/react-navigation',
  );
  return {
    ...actual,
    useFocusEffect: (effect: () => void) => {
      const navigation = useContext(Navigation);
      useEffect(() => {
        let shown = navigation?.isFocused() ?? true;
        if (shown) effect();
        return navigation?.addListener('focus', () => {
          if (navigation.isFocused() && !shown) effect();
          shown = navigation.isFocused();
        });
      }, [effect, navigation]);
    },
  };
});
// Each render of Home renders its recent games: counted.
jest.mock('../RecentGames', () => {
  const actual = jest.requireActual<typeof import('../RecentGames')>('../RecentGames');
  return { ...actual, RecentGames: jest.fn(actual.RecentGames) };
});

const hidden = { includeHiddenElements: true };
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const card = () => screen.getByTestId('profile-card', hidden);
const homeRenders = () => jest.mocked(RecentGames).mock.calls.length;

/** Home on a screen of a stack: `cover(true)` puts the next screen over it, `cover(false)` comes back. */
async function showHome() {
  let focused = true;
  const listeners = new Set<() => void>();
  const navigation = {
    isFocused: () => focused,
    addListener: (_: string, cb: () => void) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <NavigationContext.Provider value={navigation as never}>
        <HomeScreen devLinks={false} />
      </NavigationContext.Provider>
    </SafeAreaProvider>,
  );
  await frames(2000);
  return (covered: boolean) =>
    act(async () => {
      focused = !covered;
      listeners.forEach((cb) => cb());
    });
}

async function frames(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

let repo: PracticeRepo;

beforeEach(async () => {
  jest.useFakeTimers();
  resetHomeEntrance();
  repo = await openPracticeRepo(await memoryDb());
  jest.mocked(practiceStorageOrNull).mockImplementation(async () => repo);
  usePracticeHistory.setState({ recent: [], status: 'idle' });
  usePracticeStats.setState({ gamesPlayed: null, winRate: null, streak: null });
  useProfile.setState({ name: null, avatarId: 'noam', country: 'IL', lastPlay: null, botLevel: null });
  useSettings.setState({ reduceMotion: 'off' });
  useAuth.setState({ status: 'ready' });
  await i18n.changeLanguage('he');
});

afterEach(() => {
  useAuth.setState({ status: 'loading' });
  useSettings.setState({ reduceMotion: 'system' });
  jest.useRealTimers();
});

describe('a change of screen from Home and back (B14)', () => {
  it('Home’s avatar keeps its layers, the same views, under the next screen and on the way back', async () => {
    markHomeEntrancePlayed();
    const cover = await showHome();
    const layers = svgXmlsIn(card());
    // Moving (Home is a stage): its layers, none of them the whole still picture.
    expect(layers.length).toBeGreaterThan(1);
    expect(layers.every((x) => drawnAvatarId(x.props.xml) === null)).toBe(true);
    for (const covered of [true, false]) {
      await cover(covered);
      await frames(500);
      const now = svgXmlsIn(card());
      expect(now).toHaveLength(layers.length);
      now.forEach((x, i) => expect(x).toBe(layers[i]));
      expect(screen.queryByTestId(RETIRED_LAYERS_ID, hidden)).toBeNull();
    }
  });

  it('Home does not render again for being covered or shown, once its entrance has played', async () => {
    await repo.createGame({
      id: 'g1',
      mode: 'solo',
      gameType: 'fast',
      puzzleId: 'p',
      playerId: 'me',
      seed: 1,
      startedAt: 1,
    });
    const reads = jest.spyOn(repo, 'listRecent');
    const cover = await showHome();
    expect(screen.getByTestId('recent-list', hidden)).toBeTruthy();
    // Leaving Home the first time ends its entrance (a render), and coming back shows it as it is.
    await cover(true);
    await cover(false);
    await frames(500);
    const renders = homeRenders();
    const read = reads.mock.calls.length;
    await cover(true);
    await frames(500);
    expect(homeRenders()).toBe(renders);
    // Shown again: its recent games are read again (the same ones), and Home stays as it is.
    await cover(false);
    await frames(500);
    expect(reads).toHaveBeenCalledTimes(read + 1);
    expect(homeRenders()).toBe(renders);
  });
});
