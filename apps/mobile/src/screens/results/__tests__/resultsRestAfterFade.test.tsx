// First: keeps the real Reanimated in place of the router testing library's old mock (see homeTesting.tsx).
import 'react-native-reanimated';
import { renderHook } from '@testing-library/react-native';
import { router, Stack } from 'expo-router';
import { store } from 'expo-router/build/global-state/router-store';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { useLayoutEffect } from 'react';
import { Platform, Text } from 'react-native';

import GameRoute from '../../../../app/game';
import ResultsRoute from '../../../../app/results/[id]';
import { useGameStore } from '../../../game/gameStore';
import i18n from '../../../i18n';
import { useSettings } from '../../../state/settings';
import { ANDROID_FADE_MS } from '../../../theme/transitions';
import { savedPractice } from '../testing/practiceGames';
import { RESULTS_REST_AFTER_START_MS, RESULTS_REST_FALLBACK_MS, useStackEntered } from '../useStackEntered';

/**
 * fullboard-empty-frame (QA loop 12, APK 17, device measurements): on Android the stack's fade from the final board
 * to the results is a pair of 150 ms tweens run by the clock on the UI thread, and the results' first mount and
 * draw landed on that thread at the same time (frames of 60–150 ms). The fade then got 0–2 frames: the board went in
 * one frame and the results came in part-transparent (3 of 5 runs without Reduced Motion); with the results near 0
 * in that frame it is the reported "only the background" frame. Now the commit that pushes the results carries only
 * what the fade shows (the top bar, the hero, the score), and the parts below mount once the stack's transition is
 * over (its opening transitionEnd, or a fallback): the fade's frames no longer carry their mount.
 *
 * The real /game and /results/[id] routes on the real native stack; the game screen is a stand-in whose end does
 * what the game screen does after its hold: onEnded(gameId).
 */

jest.mock('../../../screens/game', () => {
  const { Pressable: MockPressable, Text: MockText } =
    jest.requireActual<typeof import('react-native')>('react-native');
  const Board = ({ session, onEnded }: { session: { id: string }; onEnded: (id: string) => void }) => (
    <MockPressable accessibilityRole="button" onPress={() => onEnded(session.id)}>
      <MockText testID="final-board">end</MockText>
    </MockPressable>
  );
  return { GameScreen: Board, OnlineGame: Board };
});
jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../../../services/analytics', () => ({ track: jest.fn() }));
jest.mock('../../../services/feedback', () => ({ cue: jest.fn() }));
jest.mock('../../../game/storage', () => ({ practiceStorageOrNull: jest.fn() }));

const storage = jest.requireMock<{ practiceStorageOrNull: jest.Mock }>('../../../game/storage');
const HIDDEN = { includeHiddenElements: true } as const;
const pathname = () => store.getRouteInfo().pathname;
/** The parts below the hero (the stats, the actions), on the screen or not. */
const restThere = () =>
  screen.queryAllByTestId('results-stat-time', HIDDEN).length > 0 &&
  screen.queryAllByTestId('results-actions', HIDDEN).length > 0;

/** What the results route's very first commit had in it. */
let firstCommit: { hero: boolean; rest: boolean } | null = null;
function FirstCommit() {
  useLayoutEffect(() => {
    firstCommit = { hero: screen.queryAllByTestId('results-title', HIDDEN).length > 0, rest: restThere() };
  }, []);
  return null;
}

const Layout = () => <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
const ROUTES = {
  _layout: Layout,
  index: () => <Text>home</Text>,
  game: GameRoute,
  'results/[id]': () => (
    <>
      <ResultsRoute />
      <FirstCommit />
    </>
  ),
};

/** The stack's native screens, bottom first (react-native-screens' RNSScreen host elements). */
function nativeScreens(): { props: Record<string, unknown> }[] {
  const found: { props: Record<string, unknown> }[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    const n = node as { type?: string; props?: Record<string, unknown>; children?: unknown[] };
    if (n.type === 'RNSScreen' && n.props) found.push({ props: n.props });
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return found;
}

async function endThePractice() {
  const game = await savedPractice();
  storage.practiceStorageOrNull.mockResolvedValue(game.repo);
  await renderRouter(ROUTES, { initialUrl: '/' });
  useGameStore.setState({ session: game.session, view: game.session.getView(), online: null });
  await act(async () => router.push('/game'));
  game.session.endPractice();
  await fireEvent.press(screen.getByRole('button', { name: 'end' }));
  for (let i = 0; i < 20 && pathname() !== `/results/${game.session.id}`; i++) {
    await act(async () => {
      await new Promise((r) => setImmediate(r));
    });
  }
  expect(pathname()).toBe(`/results/${game.session.id}`);
}

const os = Platform.OS;
beforeEach(async () => {
  jest.clearAllMocks();
  firstCommit = null;
  await i18n.changeLanguage('he');
});
afterEach(() => {
  Platform.OS = os;
  useGameStore.setState({ session: null, online: null, view: null, lastUpdate: null });
  useSettings.setState({ reduceMotion: 'off' });
});

describe.each(['off', 'on'] as const)('reduced motion %s', (reduceMotion) => {
  it('Android: the push commits the hero alone; the parts below mount once the stack has faded the results in', async () => {
    Platform.OS = 'android';
    useSettings.setState({ reduceMotion });
    await endThePractice();
    // The fade's frames: the hero, opaque, and nothing below it to mount and draw.
    expect(firstCommit).toEqual({ hero: true, rest: false });
    expect(screen.getByTestId('results-title-block')).toHaveAnimatedStyle({ opacity: 1 });
    expect(screen.getByTestId('results-end')).toBeOnTheScreen();
    expect(restThere()).toBe(false);

    // The results' own opening transition is over (the stack's transitionEnd, closing: false): the rest comes.
    const results = nativeScreens().at(-1)!;
    await act(async () => (results.props.onAppear as () => void)());
    expect(restThere()).toBe(true);
    expect(screen.getByTestId('results-new-game')).toBeOnTheScreen();
  });

  it('iOS (its transition runs off the main thread): everything in the first commit, as before', async () => {
    Platform.OS = 'ios';
    useSettings.setState({ reduceMotion });
    await endThePractice();
    expect(firstCommit).toEqual({ hero: true, rest: true });
  });
});

describe('useStackEntered', () => {
  type Listener = (e: { data: { closing: boolean } }) => void;
  type Kind = 'transitionStart' | 'transitionEnd';
  const navigationStub = () => {
    const all: { kind: Kind; l: Listener }[] = [];
    const nav = {
      addListener: jest.fn((kind: Kind, l: Listener) => {
        const entry = { kind, l };
        all.push(entry);
        return () => all.splice(all.indexOf(entry), 1);
      }),
    };
    const emit = (closing: boolean, kind: Kind = 'transitionEnd') =>
      all.filter((x) => x.kind === kind).forEach((x) => x.l({ data: { closing } }));
    return { nav, emit, listeners: all };
  };

  it('Android, handed over: waits for the opening transitionEnd (a closing one is not it), and says when it came', async () => {
    jest.useFakeTimers();
    try {
      Platform.OS = 'android';
      const { nav, emit, listeners } = navigationStub();
      const { result, unmount } = await renderHook(() => useStackEntered(nav as never, true));
      expect(result.current).toBeNull();
      expect(nav.addListener).toHaveBeenCalledWith('transitionEnd', expect.any(Function));
      await act(async () => jest.advanceTimersByTime(120));
      await act(async () => emit(true));
      expect(result.current).toBeNull();
      await act(async () => jest.advanceTimersByTime(110));
      await act(async () => emit(false));
      // 230 ms after the first commit: the parts that mount now take it off their entrance delays.
      expect(result.current).toBe(230);
      expect(listeners).toHaveLength(0);
      await unmount();
    } finally {
      jest.useRealTimers();
    }
  });

  it('Android: a fade that began late is not cut short by the fallback (rmoff4: it began at +857 ms)', async () => {
    jest.useFakeTimers();
    try {
      Platform.OS = 'android';
      const { nav, emit } = navigationStub();
      const { result, rerender } = await renderHook(() => useStackEntered(nav as never, true, 1000));
      expect(nav.addListener).toHaveBeenCalledWith('transitionStart', expect.any(Function));
      await act(async () => jest.advanceTimersByTime(100));
      await act(async () => emit(true, 'transitionStart'));
      await act(async () => jest.advanceTimersByTime(800));
      // The results' own fade begins at 900 ms; a plain 1000 ms clock would end the wait 100 ms into it.
      await act(async () => emit(false, 'transitionStart'));
      // A second start (a re-emitted event) does not push the end out; nor does the effect running again.
      await act(async () => jest.advanceTimersByTime(50));
      await act(async () => emit(false, 'transitionStart'));
      await rerender({});
      await act(async () => jest.advanceTimersByTime(1000 - 950));
      expect(result.current).toBeNull();
      await act(async () => jest.advanceTimersByTime(RESULTS_REST_AFTER_START_MS - 100 - 1));
      expect(result.current).toBeNull();
      // Its end did not come: the fade's length and a margin after its start, at the latest.
      await act(async () => jest.advanceTimersByTime(1));
      expect(result.current).toBe(900 + RESULTS_REST_AFTER_START_MS);
    } finally {
      jest.useRealTimers();
    }
  });

  it("once begun, the wait's cap is Android's fade and a margin", () => {
    expect(RESULTS_REST_AFTER_START_MS).toBe(ANDROID_FADE_MS + 100);
  });

  it('Android: once begun, its end ends the wait', async () => {
    jest.useFakeTimers();
    try {
      Platform.OS = 'android';
      const { nav, emit } = navigationStub();
      const { result } = await renderHook(() => useStackEntered(nav as never, true));
      await act(async () => jest.advanceTimersByTime(300));
      await act(async () => emit(false, 'transitionStart'));
      await act(async () => jest.advanceTimersByTime(160));
      await act(async () => emit(false));
      expect(result.current).toBe(460);
    } finally {
      jest.useRealTimers();
    }
  });

  it('Android: never waits longer than the fallback', async () => {
    jest.useFakeTimers();
    try {
      Platform.OS = 'android';
      const { nav } = navigationStub();
      const { result } = await renderHook(() => useStackEntered(nav as never, true));
      await act(async () => jest.advanceTimersByTime(RESULTS_REST_FALLBACK_MS - 1));
      expect(result.current).toBeNull();
      await act(async () => jest.advanceTimersByTime(1));
      expect(result.current).toBe(RESULTS_REST_FALLBACK_MS);
      // No navigator at all: the fallback still ends the wait.
      const lone = await renderHook(() => useStackEntered(undefined, true));
      await act(async () => jest.advanceTimersByTime(RESULTS_REST_FALLBACK_MS));
      expect(lone.result.current).toBe(RESULTS_REST_FALLBACK_MS);
    } finally {
      jest.useRealTimers();
    }
  });

  it('nothing handed over, or iOS: entered at once', async () => {
    Platform.OS = 'android';
    expect(
      (await renderHook(() => useStackEntered(navigationStub().nav as never, false))).result.current,
    ).toBe(0);
    Platform.OS = 'ios';
    expect(
      (await renderHook(() => useStackEntered(navigationStub().nav as never, true))).result.current,
    ).toBe(0);
  });
});
