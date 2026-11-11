import { INTERFERENCE_KINDS, ManualClock, ManualScheduler } from '@sudoku-fight/engine';
import { act, render, screen } from '@testing-library/react-native';
import { createAudioPlayer } from 'expo-audio';

import { MatchmakingClient } from '../../../net/matchmaking';
import { FakeMatchEntry, FakeMatchmaking } from '../../../net/testing/fakeMatchmaking';
import { CUES, GAME_CUES, preloadCues } from '../../../services/feedback';
import { sfx, type SoundId, voicesOf } from '../../../services/sfx';
import { useSettings } from '../../../state/settings';
import { type Setup, setUp, wait } from '../../game/connection/testing/setup';
import { MatchScreen } from '../MatchScreen';
import {
  GAME_WARM_CHOICE_DELAY_MS,
  GAME_WARM_DELAY_MS,
  hitWarmCues,
  loadGameCode,
  MATCH_CUES,
  warmGameLater,
  warmGameSteps,
  warmRankedGameSteps,
} from '../warmGame';

/**
 * QA loop 2, K2 (apk6, two Galaxy A16): in the first ranked game after the launch GO! stayed 1.75 s before the
 * board, in every later one 1.0–1.1 s. What only the first game paid: the sounds' players, which expo-audio builds
 * on the UI thread while the JS thread waits (no frame meanwhile; docs/PERF.md T3-FIRST-PLAY-SLOW). The game
 * screen made its 13 as it mounted, under GO!, and "go" made its own as GO! was drawn. Now the game type screen
 * (ModesAndGameType.test.tsx) and the search make them, one per idle moment, the game screen's first, and load
 * the game screen's code too.
 */

type Mocks = typeof import('../../home/testing/nativeMocks');

jest.mock('expo-audio', () => jest.requireActual<Mocks>('../../home/testing/nativeMocks').expoAudio);
jest.mock('expo-haptics', () => jest.requireActual<Mocks>('../../home/testing/nativeMocks').expoHaptics);
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
// The game screen's code: when it is first required.
const mockGameCode = jest.fn();
jest.mock('../../game', () => {
  mockGameCode();
  return {};
});

const made = jest.mocked(createAudioPlayer);
const soundsOf = (cues: readonly (keyof typeof CUES)[]) =>
  [...new Set(cues.map((c) => CUES[c].sound))].filter((s): s is SoundId => s !== null);
/** The players of the flow's and the game screen's sounds: what the first game used to make under GO!. */
const FIRST_GAME_PLAYERS = soundsOf([...MATCH_CUES, ...GAME_CUES]).reduce((n, id) => n + voicesOf(id), 0);
/** The interferences' players (every kind, the picker and the launch), made after them. */
const HIT_PLAYERS = soundsOf(hitWarmCues(INTERFERENCE_KINDS)).reduce((n, id) => n + voicesOf(id), 0);

let env: Setup;

beforeEach(() => {
  useSettings.setState({ sound: true });
});

afterEach(() => {
  env.restore();
  sfx.release();
  made.mockClear();
  mockGameCode.mockClear();
});

async function show() {
  env = await setUp('he', 'off');
  const clock = new ManualClock(1_000_000);
  const scheduler = new ManualScheduler(clock);
  const mm = new FakeMatchmaking(clock, scheduler);
  const entries: FakeMatchEntry[] = [];
  const client = new MatchmakingClient('fast-2p', {
    connector: mm,
    clock,
    scheduler,
    enter: (m) => {
      const entry = new FakeMatchEntry(() => clock.now(), m.reservation);
      entries.push(entry);
      return entry;
    },
  });
  const onPlay = jest.fn();
  await render(
    <MatchScreen
      match={client}
      self={{ name: 'Moshe', avatarId: 'lava-lamp' }}
      clock={clock}
      onPlay={onPlay}
      onLeave={jest.fn()}
      onBot={jest.fn()}
      onPractice={jest.fn()}
      onVerifyEmail={jest.fn()}
      onHome={jest.fn()}
    />,
  );
  await act(async () => {
    await client.start();
  });
  const server = async (send: () => void) => {
    await act(async () => send());
  };
  const advance = async (ms: number, step = 100) => {
    for (let done = 0; done < ms; done += step) {
      const by = Math.min(step, ms - done);
      scheduler.advance(by);
      await wait(by);
    }
  };
  return { mm, entries, server, advance, onPlay };
}

it('the search makes the first game’s players and loads its code: nothing is made from the VS to the board (QA K2)', async () => {
  const { mm, entries, server, advance, onPlay } = await show();
  await server(() => mm.searching());
  // Not at once: the search screen comes in first.
  await advance(GAME_WARM_DELAY_MS - 100);
  expect(made).not.toHaveBeenCalled();
  expect(mockGameCode).not.toHaveBeenCalled();
  await advance(3000);
  expect(made).toHaveBeenCalledTimes(FIRST_GAME_PLAYERS + HIT_PLAYERS);
  expect(mockGameCode).toHaveBeenCalledTimes(1);
  const before = made.mock.calls.length;
  // The interferences' sounds too (QA warp-standby-stalls): the game screen's own warm-up in the board's first
  // seconds finds them made.
  hitWarmCues(INTERFERENCE_KINDS).forEach((name) => preloadCues([name]));
  expect(made.mock.calls.length).toBe(before);

  // The match: the VS's chime, 3 · 2 · 1 and GO! play players already made…
  await server(() => mm.found());
  await server(() => mm.ready(['me', 'opp']));
  await advance(1200);
  await server(() => void mm.countdown(3000));
  await advance(3100);
  expect(screen.getByTestId('match-countdown-step-text')).toHaveTextContent('GO!');
  await server(() => entries[0]!.host.set({ status: 'live', hasGame: true }));
  await advance(500);
  expect(onPlay).toHaveBeenCalledTimes(1);
  // …and the game screen's preload as it mounts finds them all.
  preloadCues();
  expect(made.mock.calls.length).toBe(before);
});

it('one step per idle moment, never all at once (each player is a stall of the UI thread); stopped, no more', () => {
  jest.useFakeTimers();
  const idle: (() => void)[] = [];
  const g = globalThis as { requestIdleCallback?: unknown; cancelIdleCallback?: unknown };
  const saved = { request: g.requestIdleCallback, cancel: g.cancelIdleCallback };
  g.requestIdleCallback = (run: () => void) => idle.push(run);
  g.cancelIdleCallback = () => undefined;
  try {
    const steps = [jest.fn(), jest.fn(), jest.fn(), jest.fn()];
    const stop = warmGameLater(() => steps);
    jest.advanceTimersByTime(GAME_WARM_DELAY_MS - 1);
    expect(idle).toHaveLength(0);
    jest.advanceTimersByTime(1);
    const ran = () => steps.filter((s) => s.mock.calls.length > 0).length;
    for (let k = 1; k <= 2; k++) {
      idle.shift()!();
      expect(ran()).toBe(k);
    }
    stop();
    idle.splice(0).forEach((run) => run());
    expect(ran()).toBe(2);
  } finally {
    g.requestIdleCallback = saved.request;
    g.cancelIdleCallback = saved.cancel;
    jest.useRealTimers();
  }
  env = { announced: () => [], restore: () => undefined };
});

it('a search found before the warm-up is through: nothing more is made while the VS and the count are drawn', async () => {
  const { mm, server, advance } = await show();
  await server(() => mm.searching());
  // Found at once (the server pairs on its next tick), before the warm-up's first step.
  await server(() => mm.found());
  await advance(3000);
  // Only the VS's chime, which the flow plays itself (it makes its own player, as before).
  expect(made).toHaveBeenCalledTimes(soundsOf(['matchFound']).reduce((n, id) => n + voicesOf(id), 0));
  expect(mockGameCode).not.toHaveBeenCalled();
});

it('the game screen’s sounds first, then its code, then the flow’s three: a short search still has the costly part done (QA K2)', () => {
  const steps = warmGameSteps();
  const gamePlayers = soundsOf(GAME_CUES).reduce((n, id) => n + voicesOf(id), 0);
  steps.slice(0, GAME_CUES.length).forEach((step) => step());
  // The 13 players the game screen used to make as it mounted, under GO!: made.
  expect(made).toHaveBeenCalledTimes(gamePlayers);
  preloadCues(GAME_CUES);
  expect(made).toHaveBeenCalledTimes(gamePlayers);
  // Then the game screen's code (JS only), then the flow's three players.
  expect(steps[GAME_CUES.length]).toBe(loadGameCode);
  steps.slice(GAME_CUES.length + 1).forEach((step) => step());
  expect(made).toHaveBeenCalledTimes(FIRST_GAME_PLAYERS);
  expect(steps).toHaveLength(GAME_CUES.length + 1 + MATCH_CUES.length);
  env = { announced: () => [], restore: () => undefined };
});

it('the search’s steps: the first game’s first, then the interferences’ sounds, one player per step (QA warp-standby-stalls)', () => {
  const first = warmGameSteps().length;
  const steps = warmRankedGameSteps();
  const hits = hitWarmCues(INTERFERENCE_KINDS);
  expect(steps).toHaveLength(first + hits.length);
  steps.slice(0, first).forEach((step) => step());
  expect(made).toHaveBeenCalledTimes(FIRST_GAME_PLAYERS);
  for (const [k, step] of steps.slice(first).entries()) {
    step();
    expect(made).toHaveBeenCalledTimes(FIRST_GAME_PLAYERS + soundsOf(hits.slice(0, k + 1)).length);
  }
  env = { announced: () => [], restore: () => undefined };
});

it('a later delay (the game type screen’s, after its entrance)', () => {
  jest.useFakeTimers();
  try {
    const step = jest.fn();
    const stop = warmGameLater(() => [step], GAME_WARM_CHOICE_DELAY_MS);
    jest.advanceTimersByTime(GAME_WARM_CHOICE_DELAY_MS - 1);
    expect(step).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1000);
    expect(step).toHaveBeenCalledTimes(1);
    stop();
  } finally {
    jest.useRealTimers();
  }
  env = { announced: () => [], restore: () => undefined };
});

it('with sound off: no player (nothing would play)', async () => {
  useSettings.setState({ sound: false });
  const { mm, server, advance } = await show();
  await server(() => mm.searching());
  await advance(3000);
  expect(made).not.toHaveBeenCalled();
});
