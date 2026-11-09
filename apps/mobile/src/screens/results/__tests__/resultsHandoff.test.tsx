// First: keeps the real Reanimated in place of the router testing library's old mock (see homeTesting.tsx).
import 'react-native-reanimated';
import { router, Stack } from 'expo-router';
import { store } from 'expo-router/build/global-state/router-store';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { useLayoutEffect } from 'react';
import { Text } from 'react-native';

import GameRoute from '../../../../app/game';
import ResultsRoute from '../../../../app/results/[id]';
import { useGameStore } from '../../../game/gameStore';
import i18n from '../../../i18n';
import { useSettings } from '../../../state/settings';
import { handedResults, RESULTS_READ_CEILING_MS, readResultsThenOpen } from '../resultsHandoff';
import { savedPractice } from '../testing/practiceGames';

/**
 * QA fixcheck of APK 13 (surrender-end-empty-frame-still, the third round): after "כן, להיכנע" (ranked, 4 of 4)
 * or "סיום אימון" (3 of 3), Reduced Motion too, the board faded to ~50 % and went, then 0.6–1.0 s of nothing but
 * the wandering digits (later "לבית" alone), then "הפסד". On Android the stack fades the covered board out over
 * a fixed 150 ms as the push begins; the results came in over it with their loading state (unseen), read an
 * effect and two frames later, and their hero then faded in from 0. Now the results are read while the board is
 * on screen and handed over: the commit that opens them already has the hero, fully opaque.
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

/** What the results route's very first commit had in it (read as it commits, before any effect or frame). */
let firstCommit: string | null = null;
function FirstCommit() {
  useLayoutEffect(() => {
    firstCommit = screen.queryByTestId('results-title', HIDDEN)
      ? 'hero'
      : screen.queryByTestId('results-loading', HIDDEN)
        ? 'loading'
        : 'nothing';
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

beforeEach(async () => {
  jest.clearAllMocks();
  firstCommit = null;
  await i18n.changeLanguage('he');
});

afterEach(() => {
  useGameStore.setState({ session: null, online: null, view: null, lastUpdate: null });
  useSettings.setState({ reduceMotion: 'off' });
});

describe.each(['off', 'on'] as const)('reduced motion %s', (reduceMotion) => {
  it('"סיום אימון": read while the board is up, then the results open with the hero in their first commit, opaque', async () => {
    useSettings.setState({ reduceMotion });
    const game = await savedPractice();
    storage.practiceStorageOrNull.mockResolvedValue(game.repo);
    await renderRouter(ROUTES, { initialUrl: '/' });
    useGameStore.setState({ session: game.session, view: game.session.getView(), online: null });
    await act(async () => router.push('/game'));
    game.session.endPractice(); // still being written

    await fireEvent.press(screen.getByRole('button', { name: 'end' }));
    for (let i = 0; i < 20 && pathname() !== `/results/${game.session.id}`; i++) {
      await act(async () => {
        await new Promise((r) => setImmediate(r));
      });
    }
    expect(pathname()).toBe(`/results/${game.session.id}`);
    // Never the loading state (nothing but the digits under the stack's fade): the hero, as the push commits.
    expect(firstCommit).toBe('hero');
    expect(screen.getByRole('header', { name: 'האימון הסתיים' })).toBeOnTheScreen();
    // In view from the first frame, the stack's fade being its fade (no fade of its own from 0).
    expect(screen.getByTestId('results-title-block')).toHaveAnimatedStyle({ opacity: 1 });
    expect(screen.getByTestId('results-end')).toBeOnTheScreen();
    expect((await game.repo.getGame(game.session.id))?.status).toBe('finished');
    // Taken: a later open of the same game (the history) reads for itself.
    expect(handedResults(game.session.id)).toBeNull();
  });
});

it('a read slower than the ceiling opens the results all the same, with nothing handed over', () => {
  jest.useFakeTimers();
  try {
    storage.practiceStorageOrNull.mockReturnValue(new Promise(() => undefined));
    const open = jest.fn();
    readResultsThenOpen('slow-1', open);
    jest.advanceTimersByTime(RESULTS_READ_CEILING_MS - 1);
    expect(open).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(open).toHaveBeenCalledTimes(1);
    expect(handedResults('slow-1')).toBeNull();
  } finally {
    jest.useRealTimers();
  }
});
