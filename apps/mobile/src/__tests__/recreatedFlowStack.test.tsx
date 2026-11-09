// First: keeps the real Reanimated in place of the router testing library's old mock (see homeTesting.tsx).
import 'react-native-reanimated';
import { levelOutcome } from '@sudoku-fight/engine';
import { act, fireEvent, render } from '@testing-library/react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { type ComponentType, type ReactNode, useEffect, useRef } from 'react';
import { Pressable, Text } from 'react-native';

import * as nativeIntent from '../../app/+native-intent';
import { LevelPlayFlow, type LevelPlayingProps } from '../../app/levels/play';
import { useAuth } from '../auth/authStore';
import { usePendingInvite } from '../auth/pendingInvite';
import { useAuthGate } from '../auth/useAuthGate';
import { LEVEL_UI } from '../config/levels';
import {
  type FlowNavState,
  resetFlowStackForTests,
  restoredFlowState,
  restoredHomeState,
  useFlowStack,
} from '../game/flowStack';
import { type GameStoreState, useGameStore } from '../game/gameStore';
import i18n from '../i18n';
import { levelsOf } from '../levels/__tests__/helpers/levelsOf';
import { forgetShownResult, noteShownResult, resetShownResultForTests } from '../levels/shownResult';
import { useTutorials } from '../screens/levels/HowToPlay';
import { goBack } from '../screens/home/navigation';
import { resetLatestRootForTests } from '../services/latestRoot';

/**
 * QA "cancel-after-recreate-skips-type-screen" (APK 17): Home → שחק → 2 שחקנים → מהיר → מצא יריב, then `adb
 * shell wm density 540` during the search. The search came back on its screen (loop 11), but "ביטול חיפוש" went
 * to "משחק חדש" instead of "סוג משחק": the recreated activity's new React root started on '/match' alone
 * (app/+native-intent.tsx), without the screens the player had come through.
 *
 * Through the app's real entry (index.ts, latestRootOnly), its real +native-intent and auth gate, and the root
 * layout's useFlowStack: the new root gets the old root's screens back under its own, which stays the same
 * React instance (a search is never left by a remount).
 */

type Mocks = typeof import('../screens/home/testing/nativeMocks');
jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated'));
jest.mock('../services/analytics', () => ({ track: jest.fn() }));
jest.mock('expo-audio', () => jest.requireActual<Mocks>('../screens/home/testing/nativeMocks').expoAudio);
jest.mock('expo-haptics', () => jest.requireActual<Mocks>('../screens/home/testing/nativeMocks').expoHaptics);
jest.mock('../auth/authStore', () => ({
  ...jest.requireActual<typeof import('../auth/authStore')>('../auth/authStore'),
  initAuth: jest.fn(async () => undefined),
}));
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

/** How many times a search's screen mounted (a remount would leave the search: MatchScreen's cleanup). */
const mockMounts = { match: 0, stage: 0 };

/** app/match/index.tsx's ways out: "ביטול חיפוש" goes back; no search left (and not leaving), the modes. */
function MockMatchRoute() {
  const match = useGameStore((s) => s.match);
  const leaving = useRef(false);
  useEffect(() => {
    mockMounts.match++;
  }, []);
  useEffect(() => {
    if (!match && !leaving.current) router.replace('/modes');
  }, [match]);
  return (
    <Pressable
      onPress={() => {
        leaving.current = true;
        useGameStore.setState({ match: null } as Partial<GameStoreState>);
        goBack();
      }}
    >
      <Text>MATCH</Text>
    </Pressable>
  );
}

/** The level map, with the stage it has chosen in its params (app/levels/index.tsx's `select`). */
function MockLevelsRoute() {
  const { select } = useLocalSearchParams<{ select?: string }>();
  return <Text>{`MAP ${select ?? '-'}`}</Text>;
}

/** A stage's `playing` phase in the real app/levels/play.tsx: counts its starts; "finish" ends it. */
function MockStage({ level, onFinished }: LevelPlayingProps) {
  useEffect(() => {
    mockMounts.stage++;
  }, []);
  return (
    <Pressable
      testID="mock-stage-finish"
      onPress={() =>
        onFinished({
          outcome: levelOutcome(level, {
            reason: 'targetReached',
            elapsedMs: 3000,
            penaltyMs: 0,
            spots: 1,
            found: 0,
            stars: 0,
          }),
          finished: null,
          mistakes: 0,
          opponent: null,
          bestMove: null,
          why: null,
        })
      }
    >
      <Text>STAGE</Text>
    </Pressable>
  );
}
const FIND = levelsOf('find', { chapter: 1 })[1]!;

function MockLayout() {
  useAuthGate();
  useFlowStack();
  return <Stack screenOptions={{ animation: 'none' }} />;
}

const mockRoutes = {
  _layout: () => <MockLayout />,
  index: () => <Text>HOME</Text>,
  modes: () => <Text>MODES</Text>,
  'game-type': () => <Text>TYPE</Text>,
  game: () => <Text>GAME</Text>,
  'match/index': () => <MockMatchRoute />,
  'levels/index': () => <MockLevelsRoute />,
  'levels/play': () => <LevelPlayFlow Playing={MockStage} attemptOf={async () => 1} />,
  settings: () => <Text>SETTINGS</Text>,
  'room/[code]': () => <Text>ROOM</Text>,
  // The app's own: expo-router asks it for every root's first URL.
  '+native-intent': { redirectSystemPath: (o: { path: string; initial: boolean }) => mockIntent(o) },
};
/**
 * `async`: the first URL as Android gives it, later (expo-router's linking awaits Linking.getInitialURL there,
 * so the root's first route info is empty until it comes); else at once, as on iOS.
 */
const mockIntentMode = { async: false };
const mockIntent = (o: { path: string; initial: boolean }) =>
  mockIntentMode.async
    ? Promise.resolve().then(() => nativeIntent.redirectSystemPath(o))
    : nativeIntent.redirectSystemPath(o);

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

const shown = (root: { queryByText(text: string): unknown }) =>
  ['HOME', 'MODES', 'TYPE', 'MATCH', 'SETTINGS', 'STAGE'].filter((name) => root.queryByText(name) !== null);
/** The level map's text (its params in it), or null when it is not shown. */
const mapShown = (root: { queryByText(text: RegExp): { props: { children?: unknown } } | null }) =>
  root.queryByText(/^MAP /)?.props.children ?? null;

beforeEach(async () => {
  await i18n.changeLanguage('he');
  useTutorials.setState({ seen: { find: true } });
  jest.useFakeTimers();
  resetLatestRootForTests();
  resetFlowStackForTests();
  resetShownResultForTests();
  mockMounts.match = 0;
  mockMounts.stage = 0;
  mockIntentMode.async = false;
  process.env.EXPO_ROUTER_IMPORT_MODE = 'sync';
  useAuth.setState({ status: 'ready', user: { uid: 'me' } as never, me: null });
  usePendingInvite.setState({ room: null });
  useGameStore.setState({ session: null, online: null, match: null } as Partial<GameStoreState>);
});
afterEach(() => {
  useGameStore.setState({ session: null, online: null, match: null } as Partial<GameStoreState>);
  jest.useRealTimers();
});

describe('a recreated activity keeps the screens under its flow (cancel-after-recreate-skips-type-screen)', () => {
  it('a search: back on it, and "ביטול חיפוש" goes back to "סוג משחק", as without the recreation', async () => {
    const Root = entryRoot();
    const first = await render(<Root />);
    await act(async () => router.push('/modes'));
    await act(async () => router.push('/game-type'));
    useGameStore.setState({ match: { info: { phase: 'searching' } } } as never);
    await act(async () => router.push('/match'));
    expect(shown(first)).toEqual(['MATCH']);

    // `wm density 540`: the new root starts on the search, with Home, the modes and the game type under it.
    const recreated = await render(<Root />);
    await act(async () => jest.runOnlyPendingTimers());
    expect(shown(recreated)).toEqual(['MATCH']);
    expect(router.canGoBack()).toBe(true);
    // One search screen in the new root, mounted once (a remount would have left the search).
    expect(mockMounts.match).toBe(2);

    await fireEvent.press(recreated.getByText('MATCH'));
    await act(async () => jest.runOnlyPendingTimers());
    expect(shown(recreated)).toEqual(['TYPE']);
    // And on back as before: the modes, then Home.
    await act(async () => goBack());
    expect(shown(recreated)).toEqual(['MODES']);
    await act(async () => goBack());
    expect(shown(recreated)).toEqual(['HOME']);
  });

  it('Android (the first URL comes later): one search screen, never pushed a second time, and the cancel', async () => {
    const Root = entryRoot();
    const first = await render(<Root />);
    await act(async () => router.push('/modes'));
    await act(async () => router.push('/game-type'));
    useGameStore.setState({ match: { info: { phase: 'searching' } } } as never);
    await act(async () => router.push('/match'));
    expect(shown(first)).toEqual(['MATCH']);

    mockIntentMode.async = true;
    const recreated = await render(<Root />);
    await act(async () => jest.runOnlyPendingTimers());
    await act(async () => jest.runOnlyPendingTimers());
    expect(shown(recreated)).toEqual(['MATCH']);
    // The start's own way back (useAuthGate: resumeAtStart) saw no Home: no second search screen over the first.
    expect(mockMounts.match).toBe(2);

    await fireEvent.press(recreated.getByText('MATCH'));
    await act(async () => jest.runOnlyPendingTimers());
    expect(shown(recreated)).toEqual(['TYPE']);
  });

  it('nothing under way: the new root starts on Home, and the old screens come back over it', async () => {
    const Root = entryRoot();
    const first = await render(<Root />);
    await act(async () => router.push('/modes'));
    expect(shown(first)).toEqual(['MODES']);
    const recreated = await render(<Root />);
    await act(async () => jest.runOnlyPendingTimers());
    // QA "levels-map-recreate-lands-home" (loop 15): not Home any more, the screen the player was on.
    expect(shown(recreated)).toEqual(['MODES']);
    await act(async () => goBack());
    expect(shown(recreated)).toEqual(['HOME']);
    expect(router.canGoBack()).toBe(false);
  });
});

describe('a recreated activity on any other screen comes back to it (levels-map-recreate-lands-home)', () => {
  it.each([
    ['the first URL at once', false],
    ['Android: the first URL comes later', true],
  ])('%s: the level map, with "משחק חדש" and Home under it, and its params', async (_, async) => {
    const Root = entryRoot();
    const first = await render(<Root />);
    await act(async () => router.push('/modes'));
    await act(async () => router.push({ pathname: '/levels', params: { select: 'L078' } }));
    expect(mapShown(first as never)).toBe('MAP L078');

    // `wm density 540` on the map: nothing under way, so the new root starts on Home and gets its screens back.
    mockIntentMode.async = async;
    const recreated = await render(<Root />);
    await act(async () => jest.runOnlyPendingTimers());
    await act(async () => jest.runOnlyPendingTimers());
    expect(mapShown(recreated as never)).toBe('MAP L078');
    expect(shown(recreated)).toEqual([]);
    expect(router.canGoBack()).toBe(true);

    // Android's back: "משחק חדש", then Home (and only then out of the app).
    await act(async () => goBack());
    expect(shown(recreated)).toEqual(['MODES']);
    await act(async () => goBack());
    expect(shown(recreated)).toEqual(['HOME']);
    expect(router.canGoBack()).toBe(false);
  });

  it('the settings (a screen of Home): back on them, Home under them', async () => {
    const Root = entryRoot();
    await render(<Root />);
    await act(async () => router.push('/settings'));
    const recreated = await render(<Root />);
    await act(async () => jest.runOnlyPendingTimers());
    expect(shown(recreated)).toEqual(['SETTINGS']);
    await act(async () => goBack());
    expect(shown(recreated)).toEqual(['HOME']);
  });

  /** Home → "משחק חדש" → the map → a stage of the real app/levels/play.tsx, past its "מוכן?". */
  async function toStage(Root: ComponentType) {
    const first = await render(<Root />);
    await act(async () => router.push('/modes'));
    await act(async () => router.push('/levels'));
    await act(async () => router.push({ pathname: '/levels/play', params: { id: FIND.id } }));
    await act(async () => void jest.advanceTimersByTime(LEVEL_UI.readyMs));
    expect(shown(first)).toEqual(['STAGE']);
    expect(mockMounts.stage).toBe(1);
    return first;
  }
  /** A new root (`wm density 540`), settled. */
  async function recreate(Root: ComponentType) {
    const recreated = await render(<Root />);
    await act(async () => jest.runOnlyPendingTimers());
    await act(async () => jest.runOnlyPendingTimers());
    return recreated;
  }

  it('in the middle of a stage (its route starts it as it mounts): never started again, the map', async () => {
    const Root = entryRoot();
    await toStage(Root);
    const recreated = await recreate(Root);
    expect(shown(recreated)).toEqual([]);
    expect(mapShown(recreated as never)).toBe('MAP -');
    expect(recreated.queryByTestId('level-ready')).toBeNull();
    expect(mockMounts.stage).toBe(1);
    await act(async () => goBack());
    expect(shown(recreated)).toEqual(['MODES']);
  });

  it.each([
    ['the first URL at once', false],
    ['Android: the first URL comes later', true],
  ])(
    '%s: on a stage’s result, the same result again, nothing started; "למפה", then back',
    async (_, async) => {
      const Root = entryRoot();
      const first = await toStage(Root);
      await fireEvent.press(first.getByTestId('mock-stage-finish'));
      expect(first.getByTestId('level-result')).toBeOnTheScreen();
      const title = first.getByTestId('level-result-title').props.children as unknown;

      mockIntentMode.async = async;
      const recreated = await recreate(Root);
      expect(recreated.getByTestId('level-result')).toBeOnTheScreen();
      expect(recreated.getByTestId('level-result-title').props.children).toEqual(title);
      // Not the stage again: no "מוכן?", no second start, no map.
      expect(recreated.queryByTestId('level-ready')).toBeNull();
      expect(shown(recreated)).toEqual([]);
      expect(mapShown(recreated as never)).toBeNull();
      await act(async () => void jest.advanceTimersByTime(LEVEL_UI.readyMs + 60_000));
      expect(mockMounts.stage).toBe(1);

      // Its buttons work as before: "למפה", then back to "משחק חדש".
      await fireEvent.press(recreated.getByTestId('level-result-map'));
      await act(async () => jest.runOnlyPendingTimers());
      expect(mapShown(recreated as never)).toBe('MAP -');
      await act(async () => goBack());
      expect(shown(recreated)).toEqual(['MODES']);
    },
  );

  it('a result that was left is never brought back: a recreation on the map stays on the map', async () => {
    const Root = entryRoot();
    const first = await toStage(Root);
    await fireEvent.press(first.getByTestId('mock-stage-finish'));
    await fireEvent.press(first.getByTestId('level-result-map'));
    await act(async () => jest.runOnlyPendingTimers());
    expect(mapShown(first as never)).toBe('MAP -');
    const recreated = await recreate(Root);
    expect(mapShown(recreated as never)).toBe('MAP -');
    expect(recreated.queryByTestId('level-result')).toBeNull();
  });

  it('"שוב" on a result, then a recreation mid-stage: the map, not the old result', async () => {
    const Root = entryRoot();
    const first = await toStage(Root);
    await fireEvent.press(first.getByTestId('mock-stage-finish'));
    await fireEvent.press(first.getByTestId('level-result-again'));
    await act(async () => void jest.advanceTimersByTime(LEVEL_UI.readyMs));
    expect(mockMounts.stage).toBe(2);
    const recreated = await recreate(Root);
    expect(recreated.queryByTestId('level-result')).toBeNull();
    expect(mapShown(recreated as never)).toBe('MAP -');
    expect(mockMounts.stage).toBe(2);
  });

  it('the start’s own way back (a room the app was closed in) is not pushed over the screens that come back', async () => {
    const Root = entryRoot();
    await render(<Root />);
    await act(async () => router.push('/settings'));
    usePendingInvite.setState({ room: { code: '123456', owner: 'me', at: Date.now() } });
    const recreated = await render(<Root />);
    await act(async () => jest.runOnlyPendingTimers());
    expect(shown(recreated)).toEqual(['SETTINGS']);
    expect(recreated.queryByText('ROOM')).toBeNull();
  });

  it('a recreation on Home stays on Home, with nothing under it', async () => {
    const Root = entryRoot();
    await render(<Root />);
    await act(async () => router.push('/modes'));
    await act(async () => goBack());
    const recreated = await render(<Root />);
    await act(async () => jest.runOnlyPendingTimers());
    expect(shown(recreated)).toEqual(['HOME']);
    expect(router.canGoBack()).toBe(false);
  });
});

describe('restoredFlowState (pure)', () => {
  const stack = (names: string[], key = 'stack-new'): FlowNavState => ({
    key,
    type: 'stack',
    stale: false,
    index: names.length - 1,
    routes: names.map((name, i) => ({ name, key: `${name}-${key}-${i}` })),
  });
  const root = (inner: FlowNavState, key = 'root-new'): FlowNavState => ({
    key,
    index: 0,
    routes: [{ name: '__root', key: `__root-${key}`, state: inner }],
  });

  it('puts the old screens under the new root’s own, keeping its keys', () => {
    const now = root(stack(['match/index']));
    const before = root(stack(['index', 'modes', 'game-type', 'match/index'], 'stack-old'), 'root-old');
    const out = restoredFlowState(now, before, '/match')!;
    expect(out.key).toBe('root-new');
    const inner = out.routes[0]!.state!;
    expect(inner.key).toBe('stack-new');
    expect(inner.routes.map((r) => r.name)).toEqual(['index', 'modes', 'game-type', 'match/index']);
    expect(inner.index).toBe(3);
    // The new root's own screen: the same route (the same React instance).
    expect(inner.routes[3]).toBe(now.routes[0]!.state!.routes[0]);
  });

  it('never a screen that starts something of its own as it mounts (a search under its game, the results)', () => {
    const now = root(stack(['game']));
    const before = root(stack(['index', 'modes', 'game-type', 'match/index', 'game'], 'old'), 'r-old');
    const names = restoredFlowState(now, before, '/game')!.routes[0]!.state!.routes.map((r) => r.name);
    expect(names).toEqual(['index', 'modes', 'game-type', 'game']);
  });

  it('nothing when the old root was elsewhere, had nothing under it, or the new one is not alone', () => {
    const before = root(stack(['index', 'modes', 'game-type', 'match/index'], 'old'), 'r-old');
    expect(restoredFlowState(root(stack(['game'])), before, '/game')).toBeNull();
    expect(restoredFlowState(root(stack(['match/index'])), null, '/match')).toBeNull();
    expect(
      restoredFlowState(root(stack(['match/index'])), root(stack(['match/index'], 'o'), 'r'), '/match'),
    ).toBeNull();
    expect(restoredFlowState(root(stack(['index', 'match/index'])), before, '/match')).toBeNull();
  });
});

describe('restoredHomeState (pure)', () => {
  const stack = (names: string[], key = 'stack-new'): FlowNavState => ({
    key,
    type: 'stack',
    stale: false,
    index: names.length - 1,
    routes: names.map((name, i) => ({ name, key: `${name}-${key}-${i}`, params: { at: i } })),
  });
  const root = (inner: FlowNavState, key = 'root-new'): FlowNavState => ({
    key,
    index: 0,
    routes: [{ name: '__root', key: `__root-${key}`, state: inner }],
  });

  it('puts the old screens over the new Home, keeping its key and the old screens’ params', () => {
    const now = root(stack(['index']));
    const before = root(stack(['index', 'modes', 'levels/index'], 'old'), 'r-old');
    const inner = restoredHomeState(now, before)!.routes[0]!.state!;
    expect(inner.routes.map((r) => r.name)).toEqual(['index', 'modes', 'levels/index']);
    expect(inner.index).toBe(2);
    expect(inner.routes[0]).toBe(now.routes[0]!.state!.routes[0]);
    expect(inner.routes[2]!.params).toEqual({ at: 2 });
  });

  it('up to the screen shown, never one that starts something as it mounts', () => {
    const now = root(stack(['index']));
    const before = root(stack(['index', 'modes', 'bot-select', 'game', 'results/[id]'], 'old'), 'r-old');
    const names = restoredHomeState(now, before)!.routes[0]!.state!.routes.map((r) => r.name);
    expect(names).toEqual(['index', 'modes', 'bot-select']);
    const back = root({ ...stack(['index', 'modes', 'settings'], 'old'), index: 1 }, 'r-old');
    expect(restoredHomeState(now, back)!.routes[0]!.state!.routes.map((r) => r.name)).toEqual([
      'index',
      'modes',
    ]);
  });

  it('a stage’s route only while it shows its result (kept by its key and stage)', () => {
    const now = root(stack(['index']));
    const before = root(stack(['index', 'modes', 'levels/index', 'levels/play'], 'old'), 'r-old');
    const play = before.routes[0]!.state!.routes[3]!;
    const names = () => restoredHomeState(now, before)!.routes[0]!.state!.routes.map((r) => r.name);
    const withId = { ...play, params: { id: FIND.id } };
    const withStage = root(
      { ...before.routes[0]!.state!, routes: [...before.routes[0]!.state!.routes.slice(0, 3), withId] },
      'r-old',
    );
    expect(names()).toEqual(['index', 'modes', 'levels/index']);
    noteShownResult('another-route', FIND.id, {} as never);
    expect(restoredHomeState(now, withStage)!.routes[0]!.state!.routes.at(-1)!.name).toBe('levels/index');
    noteShownResult(play.key, 'L999', {} as never);
    expect(restoredHomeState(now, withStage)!.routes[0]!.state!.routes.at(-1)!.name).toBe('levels/index');
    noteShownResult(play.key, FIND.id, {} as never);
    const back = restoredHomeState(now, withStage)!.routes[0]!.state!;
    expect(back.routes.map((r) => r.name)).toEqual(['index', 'modes', 'levels/index', 'levels/play']);
    expect(back.routes[3]!.key).toBe(play.key);
    forgetShownResult(play.key);
    expect(restoredHomeState(now, withStage)!.routes[0]!.state!.routes.at(-1)!.name).toBe('levels/index');
  });

  it('nothing when the old root was on Home, outside Home’s stack, or the new root is not on Home alone', () => {
    const now = root(stack(['index']));
    expect(restoredHomeState(now, null)).toBeNull();
    expect(restoredHomeState(now, root(stack(['index'], 'o'), 'r'))).toBeNull();
    expect(restoredHomeState(now, root(stack(['login', 'register/account'], 'o'), 'r'))).toBeNull();
    const before = root(stack(['index', 'settings'], 'o'), 'r');
    expect(restoredHomeState(root(stack(['room/[code]'])), before)).toBeNull();
    expect(restoredHomeState(root(stack(['index', 'settings'])), before)).toBeNull();
  });
});
