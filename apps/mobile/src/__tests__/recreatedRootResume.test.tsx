import { render } from '@testing-library/react-native';
import { Stack } from 'expo-router';
import type { ComponentType, ReactNode } from 'react';
import { Text } from 'react-native';

import * as nativeIntent from '../../app/+native-intent';
import { type GameStoreState, useGameStore } from '../game/gameStore';
import { resetLatestRootForTests } from '../services/latestRoot';

/**
 * QA "density-change-orphans-ranked-game" (MAJOR, APK 13): mid ranked 2P game, `adb shell wm density 540` (the
 * phone's display size) recreated Android's activity. React Native started a new React root in the same JS
 * runtime, and the game store still held the game, its connection coming back by itself; but the new root
 * started at Home, with no way back to the game. Home's "Play" then left the game's room on purpose (a new
 * search refused alreadyQueued) and the server recorded the game as a loss.
 *
 * Through the app's real entry (index.ts) and its real app/+native-intent.tsx: a root that starts while the
 * store holds something under way starts on its screen (game/liveFlow.ts).
 */

// The roots' safe-area provider, laid out at once.
jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>(
    'react-native-safe-area-context',
  );
  const MOCK_METRICS = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 0, left: 0, right: 0, bottom: 0 },
  };
  function SafeAreaProvider({ children }: { children?: ReactNode }) {
    return <actual.SafeAreaProvider initialMetrics={MOCK_METRICS}>{children}</actual.SafeAreaProvider>;
  }
  return { ...actual, SafeAreaProvider };
});

const mockRoutes = {
  _layout: () => <Stack screenOptions={{ animation: 'none' }} />,
  index: () => <Text>HOME</Text>,
  game: () => <Text>GAME</Text>,
  'match/index': () => <Text>MATCH</Text>,
  'friends/room': () => <Text>FRIENDS ROOM</Text>,
  // The app's own: expo-router asks it for every root's first URL.
  '+native-intent': { redirectSystemPath: (o: { path: string; initial: boolean }) => mockIntent(o) },
};
const mockIntent = (o: { path: string; initial: boolean }) => nativeIntent.redirectSystemPath(o);

// expo-router's qualified entry renders ExpoRoot over the app/ folder (require.context, which Jest lacks): here,
// over the routes above, at the URL a recreated activity starts the app at (its launcher intent: the root).
jest.mock('expo-router/build/qualified-entry', () => {
  const { ExpoRoot: MockExpoRoot } = jest.requireActual<typeof import('expo-router/build/ExpoRoot')>(
    'expo-router/build/ExpoRoot',
  );
  const { getMockContext } = jest.requireActual<
    typeof import('expo-router/build/testing-library/mock-config')
  >('expo-router/build/testing-library/mock-config');
  return {
    App: function App() {
      return <MockExpoRoot context={getMockContext(mockRoutes as never)} location="/" />;
    },
  };
});
const mockRegistered: { root: ComponentType | null } = { root: null };
jest.mock('expo-router/build/renderRootComponent', () => ({
  renderRootComponent: (root: ComponentType) => {
    mockRegistered.root = root;
  },
}));
jest.mock('@expo/metro-runtime', () => ({}));

function entryRoot(): ComponentType {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- the entry's side effect, once the mocks are in
  require('../../index');
  if (!mockRegistered.root) throw new Error('index.ts registered no root');
  return mockRegistered.root;
}

async function mountRoot(Root: ComponentType) {
  process.env.EXPO_ROUTER_IMPORT_MODE = 'sync';
  return render(<Root />);
}

/** What the store holds, as liveFlow reads it (plain objects: the connection itself is not under test here). */
const ranked = (
  over: { status?: string; gameStatus?: string; hasGame?: boolean; friends?: boolean } = {},
) => ({
  hasGame: over.hasGame ?? true,
  isFriends: over.friends ?? false,
  getView: () => ({ status: over.gameStatus ?? 'running' }),
  online: { status: over.status ?? 'live' },
  close: jest.fn(),
});
const hold = (state: Partial<Record<'session' | 'online' | 'match', unknown>>) =>
  useGameStore.setState({ session: null, online: null, match: null, ...state } as Partial<GameStoreState>);

beforeEach(() => {
  jest.useFakeTimers();
  resetLatestRootForTests();
  hold({});
});
afterEach(() => {
  hold({});
  jest.useRealTimers();
});

describe('a recreated activity starts on what the store still holds (density-change-orphans-ranked-game)', () => {
  it('mid ranked game: the new root shows the game, not Home; the game is never left', async () => {
    const Root = entryRoot();
    const online = ranked();
    hold({ online });
    const first = await mountRoot(Root);
    // (The first root of this test starts on the game too: the store holds it.)
    expect(first.queryByText('GAME')).not.toBeNull();

    // `wm density 540`: Android recreates the activity; the new root starts from the launcher intent ('/').
    const recreated = await mountRoot(Root);
    expect(first.toJSON()).toBeNull();
    expect(recreated.queryByText('GAME')).not.toBeNull();
    expect(recreated.queryByText('HOME')).toBeNull();
    expect(online.close).not.toHaveBeenCalled();
    expect(useGameStore.getState().online).toBe(online);
  });

  it('a game whose connection is coming back (the old activity went to the background) is still the game', async () => {
    hold({ online: ranked({ status: 'reconnecting' }) });
    const root = await mountRoot(entryRoot());
    expect(root.queryByText('GAME')).not.toBeNull();
  });

  it('a ranked match before its board: the match screen (its VS, 3… 2… 1…); a search: the match screen', async () => {
    hold({ online: ranked({ status: 'lobby', hasGame: false }), match: { info: { phase: 'countdown' } } });
    const vs = await mountRoot(entryRoot());
    expect(vs.queryByText('MATCH')).not.toBeNull();
    hold({ match: { info: { phase: 'searching' } } });
    const search = await mountRoot(entryRoot());
    expect(search.queryByText('MATCH')).not.toBeNull();
  });

  it("a friends room's lobby: the room; a practice: the game", async () => {
    hold({ online: ranked({ status: 'lobby', hasGame: false, friends: true }) });
    const room = await mountRoot(entryRoot());
    expect(room.queryByText('FRIENDS ROOM')).not.toBeNull();
    hold({ session: { getView: () => ({ status: 'running' }) } });
    const practice = await mountRoot(entryRoot());
    expect(practice.queryByText('GAME')).not.toBeNull();
  });

  it('nothing under way (a game over, a connection closed, nothing at all): Home, as before', async () => {
    hold({ online: ranked({ gameStatus: 'over' }) });
    expect((await mountRoot(entryRoot())).queryByText('HOME')).not.toBeNull();
    hold({ online: ranked({ status: 'closed' }) });
    expect((await mountRoot(entryRoot())).queryByText('HOME')).not.toBeNull();
    hold({ match: { info: { phase: 'failed' } } });
    expect((await mountRoot(entryRoot())).queryByText('HOME')).not.toBeNull();
    hold({});
    expect((await mountRoot(entryRoot())).queryByText('HOME')).not.toBeNull();
  });
});
