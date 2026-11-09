import { act, render } from '@testing-library/react-native';
import { router, Stack } from 'expo-router';
import type { ComponentType, ReactNode } from 'react';
import { Text } from 'react-native';

import { useSettings } from '../../state/settings';
import { MotionPolicy } from '../../theme/MotionPolicy';
import { KEEP_AWAKE_TAG, useKeepScreenOn } from '../keepAwake';
import { latestRootOnly, resetLatestRootForTests } from '../latestRoot';

/**
 * QA loop 7, "postgame-progress-english" (MAJOR): with the app open, `wm size reset`, `wm density reset` and
 * `font_scale 1.0` recreated Android's activity (twice: density and fontScale are not in the manifest's
 * configChanges), the app came back on Home, and from then on the profile card, "My player card" and at times
 * a bottom tab did nothing, each tap logging "The 'navigation' object hasn't been initialized yet", until a
 * restart. Each recreation starts a new React root in the same JS runtime; the root of the activity destroyed
 * at once was never laid out (no safe-area insets: expo-router's SafeAreaProvider renders nothing, so its
 * NavigationContainer has no navigator), and it was never unmounted. expo-router's one routing queue handed
 * the visible app's `router.push` to that container first, which dropped it with that very error.
 *
 * Through the app's real entry (index.ts): only the newest root is the app (services/latestRoot.tsx).
 */

// The roots' safe-area provider: insets arrive for a root that is laid out; `stuck` mounts one that never is.
const mockSafeArea = { stuck: false };
jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>(
    'react-native-safe-area-context',
  );
  const { useState: useMockState } = jest.requireActual<typeof import('react')>('react');
  const MOCK_METRICS = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 0, left: 0, right: 0, bottom: 0 },
  };
  function SafeAreaProvider({ children }: { children?: ReactNode }) {
    const [laidOut] = useMockState(() => !mockSafeArea.stuck);
    return laidOut ? (
      <actual.SafeAreaProvider initialMetrics={MOCK_METRICS}>{children}</actual.SafeAreaProvider>
    ) : null;
  }
  return { ...actual, SafeAreaProvider };
});

// The keep-awake tags Android holds (expo-keep-awake's manager), released and taken by app/_layout.tsx.
const mockKeepAwake = { tags: new Set<string>() };
jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: async (tag: string) => void mockKeepAwake.tags.add(tag),
  deactivateKeepAwake: async (tag: string) => void mockKeepAwake.tags.delete(tag),
}));

/** What app/_layout.tsx sets for the whole run on mount and puts back on unmount: the motion policy, keep-awake. */
function RootPieces() {
  useKeepScreenOn(true);
  return <MotionPolicy />;
}

const mockRoutes = {
  _layout: () => (
    <>
      <RootPieces />
      <Stack screenOptions={{ animation: 'none' }} />
    </>
  ),
  index: () => <Text>HOME</Text>,
  results: () => <Text>RESULTS</Text>,
  'player/[id]': () => <Text>PLAYER CARD</Text>,
};

// expo-router's qualified entry renders ExpoRoot over the app/ folder (require.context, which Jest lacks):
// here, over ROUTES, at the URL the next root starts at (a recreated activity starts the app at '/').
const mockStart = { url: '/' };
jest.mock('expo-router/build/qualified-entry', () => {
  const { useState: useMockState } = jest.requireActual<typeof import('react')>('react');
  const { ExpoRoot: MockExpoRoot } = jest.requireActual<typeof import('expo-router/build/ExpoRoot')>(
    'expo-router/build/ExpoRoot',
  );
  const { getMockContext } = jest.requireActual<
    typeof import('expo-router/build/testing-library/mock-config')
  >('expo-router/build/testing-library/mock-config');
  return {
    App: function App() {
      const [url] = useMockState(() => mockStart.url);
      return <MockExpoRoot context={getMockContext(mockRoutes as never)} location={url} />;
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

const NOT_INITIALIZED = /The 'navigation' object hasn't been initialized yet/;

/** The root the app's entry registers ("main"). */
function entryRoot(): ComponentType {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- the entry's side effect, once the mocks are in
  require('../../../index');
  if (!mockRegistered.root) throw new Error('index.ts registered no root');
  return mockRegistered.root;
}

async function mountRoot(Root: ComponentType, url: string, { stuck = false } = {}) {
  mockStart.url = url;
  mockSafeArea.stuck = stuck;
  process.env.EXPO_ROUTER_IMPORT_MODE = 'sync';
  const root = await render(<Root />);
  mockSafeArea.stuck = false;
  return root;
}

// Reanimated's global reduce-motion flag, the one ReducedMotionConfig (MotionPolicy) sets and puts back.
const { ReducedMotionManager } = jest.requireActual<{
  ReducedMotionManager: { jsValue: boolean; setEnabled(value: boolean): void };
}>('react-native-reanimated/lib/module/ReducedMotion');

beforeEach(() => {
  jest.useFakeTimers();
  resetLatestRootForTests();
  mockKeepAwake.tags.clear();
  // ReducedMotionConfig says in development that it overrides the phone; expected here.
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('index.ts: one React root is the app (QA loop 7, postgame-progress-english)', () => {
  it('package.json starts the app from index.ts', () => {
    expect(jest.requireActual<{ main: string }>('../../../package.json').main).toBe('index.ts');
  });

  it('after two recreations, the visible app navigates: the root that was never laid out takes no tap', async () => {
    const errors = jest.spyOn(console, 'error');
    const Root = entryRoot();
    // The results screen, then density (the activity recreated: a root never laid out, destroyed at once),
    // then fontScale (recreated again: the app comes back on Home). The first activity's surface is stopped.
    const first = await mountRoot(Root, '/results');
    expect(first.getByText('RESULTS')).toBeTruthy();
    const destroyedAtOnce = await mountRoot(Root, '/', { stuck: true });
    const visible = await mountRoot(Root, '/');
    await first.unmount();
    expect(visible.getByText('HOME')).toBeTruthy();

    // The profile card's openPlayerCard.
    await act(() => router.push({ pathname: '/player/[id]', params: { id: 'me' } }));
    await act(() => jest.runOnlyPendingTimers());

    expect(visible.queryByText('PLAYER CARD')).not.toBeNull();
    expect(errors.mock.calls.filter(([m]) => NOT_INITIALIZED.test(String(m)))).toEqual([]);
    // The older root is empty: no container of its own is left to take the app's navigation.
    expect(destroyedAtOnce.toJSON()).toBeNull();
    errors.mockRestore();
  });

  it('a single recreation: the old root goes, the new one navigates (a tab, then back)', async () => {
    const Root = entryRoot();
    const old = await mountRoot(Root, '/results');
    const fresh = await mountRoot(Root, '/');
    // The old root renders nothing as soon as the new one is up, stopped by Android or not.
    expect(old.toJSON()).toBeNull();
    expect(fresh.getByText('HOME')).toBeTruthy();

    // A route of this test's own app (not one of the real app's typed routes).
    await act(() => router.push('/results' as never));
    await act(() => jest.runOnlyPendingTimers());
    expect(fresh.queryByText('RESULTS')).not.toBeNull();
    await act(() => router.back());
    await act(() => jest.runOnlyPendingTimers());
    expect(fresh.queryByText('HOME')).not.toBeNull();
  });

  // Review of loop 7: the old root went after the new one had mounted, so its cleanups undid the new root's
  // setup. ReducedMotionConfig puts back on unmount the value it found on mount: the phone's, for the first root.
  // Through the real entry here; the strict case (the pieces in a root's first commit) is in the next block.
  it.each([
    ['on', false, true],
    ['off', true, false],
  ] as const)(
    "after a recreation, the app's Reduced Motion (%s) still governs Reanimated, the phone's is %s",
    async (setting, phoneReduces, expected) => {
      useSettings.setState({ reduceMotion: setting });
      ReducedMotionManager.setEnabled(phoneReduces);
      const Root = entryRoot();
      const old = await mountRoot(Root, '/results');
      await act(async () => undefined);
      expect(ReducedMotionManager.jsValue).toBe(expected);
      expect([...mockKeepAwake.tags]).toEqual([KEEP_AWAKE_TAG]);

      const fresh = await mountRoot(Root, '/');
      await act(async () => undefined);
      expect(old.toJSON()).toBeNull();
      expect(fresh.getByText('HOME')).toBeTruthy();
      expect(ReducedMotionManager.jsValue).toBe(expected);
      // The screen stays on: the old root let go of the tag before the new one took it.
      expect([...mockKeepAwake.tags]).toEqual([KEEP_AWAKE_TAG]);
      ReducedMotionManager.setEnabled(false);
    },
  );

  it('the first root of a run is the app, as before', async () => {
    const only = await mountRoot(entryRoot(), '/');
    await act(() => router.push({ pathname: '/player/[id]', params: { id: 'me' } }));
    await act(() => jest.runOnlyPendingTimers());
    expect(only.queryByText('PLAYER CARD')).not.toBeNull();
  });
});

describe('latestRootOnly: the old root goes before the new one mounts (review of loop 7)', () => {
  // The pieces the app's root sets on mount, in a root's first commit (the strict case: expo-router may mount
  // the layout a commit later, which hid the order above).
  const Root = latestRootOnly(RootPieces);

  it.each([
    ['on', false, true],
    ['off', true, false],
  ] as const)(
    "app's Reduced Motion %s, the phone's %s: Reanimated's flag stays the app's after a recreation",
    async (setting, phoneReduces, expected) => {
      useSettings.setState({ reduceMotion: setting });
      ReducedMotionManager.setEnabled(phoneReduces);
      const old = await render(<Root />);
      expect(ReducedMotionManager.jsValue).toBe(expected);

      const fresh = await render(<Root />);
      await act(async () => undefined);
      expect(old.toJSON()).toBeNull();
      expect(ReducedMotionManager.jsValue).toBe(expected);
      expect([...mockKeepAwake.tags]).toEqual([KEEP_AWAKE_TAG]);

      // And once more (two changes in a row): still the app's.
      await render(<Root />);
      await act(async () => undefined);
      expect(fresh.toJSON()).toBeNull();
      expect(ReducedMotionManager.jsValue).toBe(expected);
      expect([...mockKeepAwake.tags]).toEqual([KEEP_AWAKE_TAG]);
      ReducedMotionManager.setEnabled(false);
    },
  );

  it('the first root of a run draws in its first commit', async () => {
    const Root2 = latestRootOnly(() => <Text>APP</Text>);
    const only = await render(<Root2 />);
    expect(only.getByText('APP')).toBeTruthy();
  });
});
