import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { BackHandler } from 'react-native';

import ResultsRoute from '../../../../app/results/[id]';
import { useGameStore } from '../../../game/gameStore';
import i18n from '../../../i18n';
import { useSettings } from '../../../state/settings';
import { lostDuel } from '../testing/duelGames';
import { endedPractice, move, savedPractice } from '../testing/practiceGames';

/**
 * The /results/[id] route: reads the saved game (flushing the store's session first) and leaves the flow;
 * "משחק חדש" starts the same kind of game in one tap (UX-2); Android's back is "לבית".
 */

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), dismissTo: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../../../services/feedback', () => ({ cue: jest.fn() }));
jest.mock('../../../game/storage', () => ({ practiceStorageOrNull: jest.fn() }));
// The starts themselves are home's (startGame.test.tsx): here, only what the results ask of them.
jest.mock('../../home', () => ({
  ...jest.requireActual<object>('../../home'),
  startAndOpen: jest.fn(async () => true),
  startRankedAndOpen: jest.fn(() => true),
}));

const { router, useLocalSearchParams } = jest.requireMock<{
  router: { dismissTo: jest.Mock; replace: jest.Mock };
  useLocalSearchParams: jest.Mock;
}>('expo-router');
const storage = jest.requireMock<{ practiceStorageOrNull: jest.Mock }>('../../../game/storage');
const home = jest.requireMock<{ startAndOpen: jest.Mock; startRankedAndOpen: jest.Mock }>('../../home');

const settle = () =>
  act(async () => {
    await new Promise((r) => setImmediate(r));
    // The route hands the results over two frames later (app/results/[id].tsx); a frame is a 0 ms timer here.
    for (let i = 0; i < 3; i++) await new Promise((r) => setTimeout(r, 0));
  });

let backs: jest.SpyInstance;

/** Android back: the newest handler first, as React Native does, until one takes it. */
async function pressBack(): Promise<boolean> {
  const handlers = backs.mock.calls
    .filter(([event]) => event === 'hardwareBackPress')
    .map(([, handler]) => handler as () => boolean | null | undefined)
    .reverse();
  let taken = false;
  await act(async () => {
    for (const handler of handlers)
      if (handler()) {
        taken = true;
        return;
      }
  });
  return taken;
}

beforeEach(async () => {
  jest.clearAllMocks();
  backs = jest.spyOn(BackHandler, 'addEventListener');
  await i18n.changeLanguage('he');
  useSettings.setState({ reduceMotion: 'off' });
});

afterEach(() => {
  backs.mockRestore();
  useGameStore.setState({ session: null, view: null, lastUpdate: null });
});

it('shows the game that just ended once it is on disk; "לבית" leaves the flow', async () => {
  const game = await savedPractice();
  move(game, game.cells[0]!, 2_000);
  game.session.endPractice(); // still being written
  storage.practiceStorageOrNull.mockResolvedValue(game.repo);
  useGameStore.setState({ session: game.session, view: game.session.getView(), lastUpdate: null });
  useLocalSearchParams.mockReturnValue({ id: game.session.id });

  await render(<ResultsRoute />);
  await settle();
  expect(screen.getByRole('header', { name: 'האימון הסתיים' })).toBeOnTheScreen();
  expect(screen.getByLabelText('מהלכים נכונים: 1')).toBeOnTheScreen();
  expect((await game.repo.getGame(game.session.id))?.status).toBe('finished');

  await fireEvent.press(screen.getByRole('button', { name: 'לבית' }));
  expect(router.dismissTo).toHaveBeenCalledWith('/');
  expect(useGameStore.getState().session).toBeNull();
});

it('after a restart (no session) reads the database; "משחק חדש" starts the same solo practice at once', async () => {
  const game = await endedPractice();
  storage.practiceStorageOrNull.mockResolvedValue(game.repo);
  useLocalSearchParams.mockReturnValue({ id: game.session.id });

  await render(<ResultsRoute />);
  await settle();
  expect(screen.getByLabelText('מהלכים נכונים: 2')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'משחק חדש' }));
  await settle();
  // Over the results (which leave the history once covered: dropWhenCovered), no stop at the game-type screen.
  expect(home.startAndOpen).toHaveBeenCalledWith({ mode: 'solo', gameType: 'fast' }, 'push');
  expect(router.dismissTo).not.toHaveBeenCalled();
});

it('a practice against a bot: its headline, and "משחק חדש" plays the same bot again at once', async () => {
  const game = await lostDuel();
  storage.practiceStorageOrNull.mockResolvedValue(game.repo);
  useLocalSearchParams.mockReturnValue({ id: game.id });

  await render(<ResultsRoute />);
  await settle();
  expect(screen.getByRole('header', { name: 'הפסד' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'משחק חדש' }));
  await settle();
  expect(home.startAndOpen).toHaveBeenCalledWith({ mode: 'bot', gameType: 'fast', botLevel: 3 }, 'push');
  expect(home.startRankedAndOpen).not.toHaveBeenCalled();
});

it('a practice that cannot start says so, and the results stay', async () => {
  home.startAndOpen.mockResolvedValueOnce(false);
  const { useToast } = jest.requireActual<typeof import('../../../components/ui/toastStore')>(
    '../../../components/ui/toastStore',
  );
  const show = jest.spyOn(useToast.getState(), 'show');
  const game = await endedPractice();
  storage.practiceStorageOrNull.mockResolvedValue(game.repo);
  useLocalSearchParams.mockReturnValue({ id: game.session.id });

  await render(<ResultsRoute />);
  await settle();
  await fireEvent.press(screen.getByRole('button', { name: 'משחק חדש' }));
  await settle();
  expect(show).toHaveBeenCalledWith({ variant: 'error', message: 'לא הצלחנו להתחיל את המשחק. נסו שוב.' });
  expect(screen.getByRole('button', { name: 'משחק חדש' })).toBeOnTheScreen();
  show.mockRestore();
});

it('Android back is "לבית": home, and the flow let go', async () => {
  const game = await endedPractice();
  storage.practiceStorageOrNull.mockResolvedValue(game.repo);
  useGameStore.setState({ session: game.session, view: game.session.getView(), lastUpdate: null });
  useLocalSearchParams.mockReturnValue({ id: game.session.id });

  await render(<ResultsRoute />);
  await settle();
  expect(await pressBack()).toBe(true);
  expect(router.dismissTo).toHaveBeenCalledWith('/');
  expect(useGameStore.getState().session).toBeNull();
});
