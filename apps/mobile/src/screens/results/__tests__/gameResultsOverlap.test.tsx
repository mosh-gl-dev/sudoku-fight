// First: keeps the real Reanimated in place of the router testing library's old mock (see homeTesting.tsx).
import 'react-native-reanimated';
import { router, Stack } from 'expo-router';
import { store } from 'expo-router/build/global-state/router-store';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Pressable, Text } from 'react-native';

import GameRoute from '../../../../app/game';
import { useGameStore } from '../../../game/gameStore';

/**
 * QA loop 7 (apk11, phone 3; motion on): about 1.5 s after "כן, להיכנע" in a ranked game (4 of 4) or "כן, לסיים"
 * in a practice against Mr. Hoot (3 of 3), a frame with nothing but the wandering digits, between the final board
 * and the results. The game *replaced* itself with its results: react-native-screens on Android fades the old
 * screen out, but its views can be gone before that fade starts (a race; dropWhenCovered.ts, loop 6's results →
 * search), so the results faded in over nothing. Now the results are pushed over the game, which stays whole
 * under their fade and leaves the history once covered. The game screen's `game.end` hold (when it calls
 * onEnded) is the game screen's own and does not change.
 *
 * The real /game route (app/game.tsx) on the real native stack; the game screen is a stand-in whose "end" does
 * what the game screen does after its hold: onEnded(gameId).
 */

jest.mock('../../../screens/game', () => {
  const { Pressable: MockPressable, Text: MockText } =
    jest.requireActual<typeof import('react-native')>('react-native');
  const Board = ({ onEnded }: { onEnded: (id: string) => void }) => (
    <MockPressable accessibilityRole="button" onPress={() => onEnded('g1')}>
      <MockText testID="final-board">end</MockText>
    </MockPressable>
  );
  return { GameScreen: Board, OnlineGame: Board };
});
jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated'));
jest.mock('../../../services/analytics', () => ({ track: jest.fn() }));

const Layout = () => <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
const ROUTES = {
  _layout: Layout,
  index: () => <Text>home</Text>,
  game: GameRoute,
  'results/[id]': () => (
    <Pressable accessibilityRole="button" onPress={() => router.back()}>
      <Text testID="results">results</Text>
    </Pressable>
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

const HIDDEN = { includeHiddenElements: true } as const;
const pathname = () => store.getRouteInfo().pathname;
const boardThere = () => screen.queryAllByTestId('final-board', HIDDEN).length > 0;

async function endTheGame({ beforeEnd = () => {} } = {}) {
  await renderRouter(ROUTES, { initialUrl: '/' });
  useGameStore.setState({ session: { id: 'g1' } as never, online: null });
  await act(async () => router.push('/game'));
  expect(boardThere()).toBe(true);
  beforeEnd();
  await fireEvent.press(screen.getByRole('button', { name: 'end' }));
}

afterEach(() => {
  useGameStore.setState({ session: null, online: null });
});

describe('game → results (QA loop 7: an empty frame between the board and the results)', () => {
  it('the results come over the final board, which stays for their fade and then leaves the history', async () => {
    await endTheGame();
    expect(pathname()).toBe('/results/g1');
    // Both are there as the stack fades between them (a replace: the board gone at once).
    expect(nativeScreens()).toHaveLength(3);
    expect(boardThere()).toBe(true);

    // Covered (the stack's transitionEnd for the game): it leaves, unseen; back goes where it went before.
    await act(async () => (nativeScreens()[1]!.props.onDisappear as () => void)());
    expect(boardThere()).toBe(false);
    expect(nativeScreens()).toHaveLength(2);
    expect(pathname()).toBe('/results/g1');
    await act(async () => router.back());
    expect(pathname()).toBe('/');
  });

  it('a second end opens nothing more, and the store letting go of the game under the results sends nobody Home', async () => {
    await endTheGame();
    // The game screen's end, again (a late timer): still one results screen over the game.
    await fireEvent.press(screen.getByRole('button', { name: 'end', ...HIDDEN }));
    expect(nativeScreens()).toHaveLength(3);
    expect(pathname()).toBe('/results/g1');
    // The results' "לבית" / "משחק חדש" clear the store, and the game may still be under them.
    await act(async () => useGameStore.setState({ session: null }));
    expect(pathname()).toBe('/results/g1');
  });

  it('a push that was lost: the watchdog\'s "לתוצאות" (onEnded again, the game still shown) opens the results', async () => {
    // The first push never reaches a navigator (QA loop 7's "navigation object hasn't been initialized yet").
    const push = jest.spyOn(router, 'push');
    await endTheGame({ beforeEnd: () => push.mockClear().mockImplementationOnce(() => undefined) });
    expect(pathname()).toBe('/game');
    expect(nativeScreens()).toHaveLength(2);

    await fireEvent.press(screen.getByRole('button', { name: 'end' }));
    expect(push).toHaveBeenCalledTimes(2);
    expect(pathname()).toBe('/results/g1');
    expect(nativeScreens()).toHaveLength(3);
    await act(async () => (nativeScreens()[1]!.props.onDisappear as () => void)());
    expect(nativeScreens()).toHaveLength(2);
    await act(async () => router.back());
    expect(pathname()).toBe('/');
    push.mockRestore();
  });
});
