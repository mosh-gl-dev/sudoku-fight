import { ManualClock, ManualScheduler } from '@sudoku-fight/engine';
import { act, render, screen } from '@testing-library/react-native';

import { type PracticeSession, startPractice } from '../../../game/session';
import { smallPool } from '../../../game/testing/practice';
import i18n from '../../../i18n';
import { useSettings } from '../../../state/settings';
import { GameScreen } from '../GameScreen';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../../../services/feedback', () => ({
  cue: jest.fn(),
  preloadCues: jest.fn(),
  cueCountUp: jest.fn(() => jest.fn()),
}));
const feedback = jest.requireMock<{ preloadCues: jest.Mock }>('../../../services/feedback');

let running: PracticeSession | null = null;
async function show() {
  const clock = new ManualClock(1_700_000_000_000);
  const scheduler = new ManualScheduler(clock);
  running = await startPractice(
    { gameType: 'fast' },
    { repo: null, clock, scheduler, pool: smallPool(1), seed: 7, track: () => undefined },
  );
  await render(<GameScreen session={running} onEnded={jest.fn()} />);
}

beforeEach(async () => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  await i18n.changeLanguage('he');
  useSettings.setState({ reduceMotion: 'off', sound: true });
});

afterEach(() => {
  running?.close();
  running = null;
  useSettings.setState({ sound: true });
  jest.useRealTimers();
});

/**
 * QA go-hold-joiner (loop 12): with sound off, a friends joiner fresh from a cold start held GO! 2.2–2.5 s (1.2 s
 * with sound on): the game screen built every sound's player as it mounted (expo-audio, each on the UI thread
 * while JS waits), for sounds that would never play. The lobby's warm-up (warmGame.ts) had skipped them.
 */
describe('the game screen makes its sounds’ players only with sound on', () => {
  it('sound on: they are made as it mounts, once', async () => {
    await show();
    expect(screen.getByTestId('board')).toBeOnTheScreen();
    expect(feedback.preloadCues).toHaveBeenCalledTimes(1);
  });

  it('sound off: none as it mounts; turned on during the game: then, once', async () => {
    useSettings.setState({ sound: false });
    await show();
    expect(screen.getByTestId('board')).toBeOnTheScreen();
    expect(feedback.preloadCues).not.toHaveBeenCalled();
    await act(async () => {
      useSettings.setState({ sound: true });
    });
    expect(feedback.preloadCues).toHaveBeenCalledTimes(1);
  });
});
