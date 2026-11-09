import type { Rules } from '@sudoku-fight/engine';
import { act, render } from '@testing-library/react-native';

import { useSettings } from '../../../../state/settings';
import { GameScreen } from '../../GameScreen';
import { type Duel, duel } from '../../testing/duel';
import { HIT_WARM_DELAY_MS, hitWarmCues } from '../warmHitCues';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../../../../services/analytics', () => ({ track: jest.fn() }));
jest.mock('../../../../services/feedback', () => ({
  cue: jest.fn(),
  preloadCues: jest.fn(),
  cueCountUp: jest.fn(() => jest.fn()),
}));
const feedback = jest.requireMock<{ preloadCues: jest.Mock }>('../../../../services/feedback');
/** Every cue the screen asked to make ahead of time, one list per call. */
const preloaded = (): string[] =>
  feedback.preloadCues.mock.calls.flatMap((c: unknown[]) => (c[0] as string[]) ?? []);

let game: Duel | null = null;
async function show(rules?: Partial<Rules>) {
  game = duel({ rules });
  await render(<GameScreen session={game.session} onEnded={jest.fn()} />);
}
async function wait(ms: number, frame = 100) {
  for (let t = 0; t < ms; t += frame) {
    await act(async () => {
      jest.advanceTimersByTime(frame);
    });
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  useSettings.setState({ sound: true, reduceMotion: 'off' });
});
afterEach(() => {
  game?.session.close();
  game = null;
  jest.useRealTimers();
});

describe('the interference sounds, made before the first hit (QA loop 8, interference-hit-warp-look)', () => {
  it('each kind’s start, and the sender’s picker and launch', () => {
    expect(hitWarmCues(['warp', 'ink'])).toEqual(['hitWarp', 'hitInk', 'arsenalOpen', 'launch']);
  });

  it('a game with interferences makes them after the board’s entrance, one per idle moment', async () => {
    await show({ interferences: true });
    expect(preloaded()).not.toContain('hitWarp');
    await wait(HIT_WARM_DELAY_MS + 2000);
    expect(preloaded()).toEqual(
      expect.arrayContaining(['hitFireworks', 'hitCats', 'hitWarp', 'hitInk', 'arsenalOpen', 'launch']),
    );
    // One player per call: never a row of them in one stall.
    const hitCalls = feedback.preloadCues.mock.calls.filter((c: unknown[]) =>
      ((c[0] as string[]) ?? []).some((name) => name.startsWith('hit')),
    );
    expect(hitCalls.every((c: unknown[]) => (c[0] as string[]).length === 1)).toBe(true);
  });

  it('a practice against a bot has none (D44): nothing made', async () => {
    await show();
    await wait(HIT_WARM_DELAY_MS + 2000);
    expect(preloaded().filter((name) => name.startsWith('hit') || name === 'launch')).toEqual([]);
  });

  it('with sound off, nothing is made (nothing would play)', async () => {
    useSettings.setState({ sound: false });
    await show({ interferences: true });
    await wait(HIT_WARM_DELAY_MS + 2000);
    expect(preloaded().filter((name) => name.startsWith('hit') || name === 'launch')).toEqual([]);
  });
});
