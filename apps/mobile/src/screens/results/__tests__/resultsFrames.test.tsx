import { act, render, screen } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';

import ResultsRoute from '../../../../app/results/[id]';
import { useGameStore } from '../../../game/gameStore';
import i18n from '../../../i18n';
import { useSettings } from '../../../state/settings';
import { RESULTS_QUIET_MS, ResultsScreen } from '../ResultsScreen';
import { endedPractice } from '../testing/practiceGames';

const opacityOf = (el: { props: { style?: unknown } }) =>
  StyleSheet.flatten(el.props.style as ViewStyle)?.opacity ?? 1;

/**
 * QA run #3, T3-GAME-RESULTS-HITCH (docs/PERF.md, B14/B32): game → results gave two frames of 763 and 801 ms and
 * ~944 'synchronouslyUpdateUIProps failed' on Android. The results replace the game in one commit, which deletes
 * the game's views that just moved; the results came back at once and drew their avatars and icons in that same
 * frame, while Reanimated still held the deleted views. The results now show their loading state for two frames
 * of the UI thread first (components/ui/retire.ts afterFrames): the game is gone for Reanimated by then.
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

const { useLocalSearchParams } = jest.requireMock<{ useLocalSearchParams: jest.Mock }>('expo-router');
const storage = jest.requireMock<{ practiceStorageOrNull: jest.Mock }>('../../../game/storage');

const settle = () =>
  act(async () => {
    for (let i = 0; i < 10; i++) await new Promise((r) => setImmediate(r));
  });

/** The UI thread's frames, one at a time. */
let frames: FrameRequestCallback[] = [];
const frame = () =>
  act(async () => {
    const due = frames;
    frames = [];
    due.forEach((run) => run(0));
  });

beforeEach(async () => {
  await i18n.changeLanguage('he');
  useSettings.setState({ reduceMotion: 'off' });
  frames = [];
  jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((run) => frames.push(run));
  jest.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
  useGameStore.setState({ session: null, view: null, lastUpdate: null });
});

it('the results are drawn two frames after the screen that replaced the game, never in its first frame', async () => {
  const game = await endedPractice();
  storage.practiceStorageOrNull.mockResolvedValue(game.repo);
  useLocalSearchParams.mockReturnValue({ id: game.session.id });

  await render(<ResultsRoute />);
  await settle(); // the game is read already: only the frames are missing
  expect(screen.getByTestId('results-loading')).toBeOnTheScreen();
  // ...and nothing of it is seen meanwhile (no spinner, no "טוען…" between the game and its results).
  expect(opacityOf(screen.getByTestId('results-loading-shown'))).toBe(0);
  await frame();
  await settle();
  expect(screen.getByTestId('results-loading')).toBeOnTheScreen();
  expect(opacityOf(screen.getByTestId('results-loading-shown'))).toBe(0);
  await frame();
  await settle();
  expect(screen.queryByTestId('results-loading')).toBeNull();
  expect(screen.getByLabelText('מהלכים נכונים: 2')).toBeOnTheScreen();
});

it('the loading state is unseen for RESULTS_QUIET_MS (the screen’s fade-in), and shows for a slower load', async () => {
  jest.useFakeTimers();
  try {
    await render(
      <ResultsScreen
        gameId="slow"
        load={() => new Promise(() => undefined)}
        onNewGame={jest.fn()}
        onHome={jest.fn()}
      />,
    );
    const shown = screen.getByTestId('results-loading-shown');
    expect(opacityOf(shown)).toBe(0);
    await act(async () => void jest.advanceTimersByTime(RESULTS_QUIET_MS - 1));
    expect(opacityOf(screen.getByTestId('results-loading-shown'))).toBe(0);
    await act(async () => void jest.advanceTimersByTime(1));
    // The same spinner and words as before, where they were.
    expect(opacityOf(screen.getByTestId('results-loading-shown'))).toBe(1);
    expect(screen.getByText('טוען את התוצאה…')).toBeOnTheScreen();
  } finally {
    jest.useRealTimers();
  }
});
