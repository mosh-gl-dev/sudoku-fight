import 'react-native-reanimated';

import { cellName, ManualClock, ManualScheduler } from '@sudoku-fight/engine';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { puzzleById } from '../../../game/offlinePool';
import { type PracticeSession, startPractice } from '../../../game/session';
import { answerIn, emptyCellsOf, smallPool } from '../../../game/testing/practice';
import i18n from '../../../i18n';
import { useSettings } from '../../../state/settings';
import { motion } from '../../../theme/motion';
import { ANDROID_FADE_MS, flowFadeMs } from '../../../theme/flowFade';
import { goCoverGate, GoCoverGateContext } from '../../match/goCoverGate';
import { BOARD_REVEAL, isFreshGame, revealTimingOf } from '../boardReveal';
import { GameScreen } from '../GameScreen';

/**
 * The game's start (motion.md §4.6 `go`, MOT-6, BRD-8): a fresh game's board rises 24 dp and fades in one
 * `revealStagger` after the screen opens, the keypad one more; a game the screen comes back to is shown as it
 * is, and with Reduced Motion nothing moves. Taps go through from the first frame.
 */

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../../../services/feedback', () => ({
  cue: jest.fn(),
  preloadCues: jest.fn(),
  cueCountUp: jest.fn(() => jest.fn()),
}));

const hidden = { includeHiddenElements: true };
const animatedStyleOf = (id: string) =>
  (screen.getByTestId(id, hidden).props as { jestAnimatedStyle?: unknown }).jestAnimatedStyle;

let running: PracticeSession | null = null;
async function practice() {
  const clock = new ManualClock(1_700_000_000_000);
  const scheduler = new ManualScheduler(clock);
  const session = await startPractice(
    { gameType: 'fast' },
    { repo: null, clock, scheduler, pool: smallPool(1), seed: 7, track: () => undefined },
  );
  running = session;
  const puzzle = puzzleById(session.puzzleId)!;
  return { session, puzzle, cells: emptyCellsOf(puzzle) };
}

/** Moves time on frame by frame (16 ms, a requestAnimationFrame under fake timers), rendering after each. */
async function frames(ms: number) {
  for (let t = 0; t < ms; t += 16) {
    await act(async () => {
      jest.advanceTimersByTime(Math.min(16, ms - t));
    });
  }
}

beforeEach(async () => {
  jest.useFakeTimers();
  await i18n.changeLanguage('he');
  useSettings.setState({ reduceMotion: 'off' });
});
afterEach(() => {
  running?.close();
  running = null;
  jest.useRealTimers();
});

describe('isFreshGame', () => {
  const view = {
    status: 'running' as const,
    owner: Array<number | null>(81).fill(null),
    wrong: Array.from({ length: 81 }, () => []),
    pausedAt: null,
  };

  it('a game nobody has played a digit in yet', () => {
    expect(isFreshGame(view)).toBe(true);
    expect(isFreshGame({ ...view, status: 'waiting' })).toBe(true);
  });

  it('not once a digit is down (right or wrong), frozen, or over', () => {
    const owner = [...view.owner];
    owner[40] = 0;
    expect(isFreshGame({ ...view, owner })).toBe(false);
    const wrong = view.wrong.map((w, i) => (i === 3 ? [{ digit: 5 as const, playerId: 'p1' }] : w));
    expect(isFreshGame({ ...view, wrong })).toBe(false);
    expect(isFreshGame({ ...view, pausedAt: 1 })).toBe(false);
    expect(isFreshGame({ ...view, status: 'paused' })).toBe(false);
    expect(isFreshGame({ ...view, status: 'over' })).toBe(false);
  });

  it('the timings come from the tokens: the board one revealStagger after the cards, the keypad one more', () => {
    expect(motion.sequence.matchFound.revealStagger).toBe(60);
    expect(BOARD_REVEAL).toEqual({ rise: 24, boardAt: 60, keypadAt: 120, keypadRise: 12 });
  });
});

describe('GameScreen: the board reveal', () => {
  it('a fresh practice: the board rises 24 dp and fades in, then the keypad; a tap works at once', async () => {
    const { session, puzzle, cells } = await practice();
    await render(<GameScreen session={session} onEnded={jest.fn()} />);
    expect(screen.getByTestId('board-reveal', hidden)).toHaveAnimatedStyle({
      opacity: 0,
      transform: [{ translateY: BOARD_REVEAL.rise }],
    });
    expect(screen.getByTestId('keypad-reveal', hidden)).toHaveAnimatedStyle({ opacity: 0 });
    // Input is live from the first frame: a cell and a digit, mid-reveal.
    const cell = cells[0]!;
    await fireEvent.press(screen.getByTestId(`cell-${cellName(cell)}`, hidden));
    await fireEvent.press(screen.getByTestId(`key-${answerIn(puzzle, cell)}`, hidden));
    expect(session.getView().grid[cell]).toBe(answerIn(puzzle, cell));

    await frames(1500);
    expect(screen.getByTestId('board-reveal', hidden)).toHaveAnimatedStyle({
      opacity: 1,
      transform: [{ translateY: 0 }],
    });
    expect(screen.getByTestId('keypad-reveal', hidden)).toHaveAnimatedStyle({
      opacity: 1,
      transform: [{ translateY: 0 }],
    });
  });

  it('a game the screen comes back to (a digit already down) is shown as it is', async () => {
    const { session, puzzle, cells } = await practice();
    const cell = cells[0]!;
    session.host.select(cell);
    session.host.place(cell, answerIn(puzzle, cell));
    await render(<GameScreen session={session} onEnded={jest.fn()} />);
    expect(animatedStyleOf('board-reveal')).toBeUndefined();
    expect(animatedStyleOf('keypad-reveal')).toBeUndefined();
  });

  it('Reduced Motion: the board and the keypad are there at once', async () => {
    useSettings.setState({ reduceMotion: 'on' });
    const { session } = await practice();
    await render(<GameScreen session={session} onEnded={jest.fn()} />);
    expect(animatedStyleOf('board-reveal')).toBeUndefined();
    expect(animatedStyleOf('keypad-reveal')).toBeUndefined();
    expect(screen.getByTestId('board-reveal', hidden)).toBeOnTheScreen();
  });
});

/**
 * QA board-no-rise (APK 22, practice against Pip): "the board shows up in its final place, together with the
 * whole screen's fade, and does not move at all". The board's rise started one stagger after the mount, while the
 * screen itself was still fading in (Android 150 ms, iOS 240), and the `standard` curve spends 80 % of it in its
 * first 90 ms: it was over before the screen was fully drawn. With no GO! over the game the board now waits for the
 * screen's first frames and its fade, then rises; under GO! (ranked, friends) nothing changes.
 */
describe('the reveal waits for the screen’s own fade (QA board-no-rise)', () => {
  const opacityOf = (id: string) =>
    (animatedStyleOf(id) as { value?: { opacity?: number } } | undefined)?.value?.opacity;

  it('revealTimingOf: with no GO!, the board as the screen’s fade ends, the keypad a stagger later', () => {
    const stagger = motion.sequence.matchFound.revealStagger;
    expect(revealTimingOf(false, 'android')).toEqual({
      boardAt: ANDROID_FADE_MS,
      keypadAt: ANDROID_FADE_MS + stagger,
      frames: 2,
    });
    expect(revealTimingOf(false, 'ios')).toEqual({
      boardAt: motion.duration.stateChange,
      keypadAt: motion.duration.stateChange + stagger,
      frames: 2,
    });
    // Under GO!: as before, from the mount (QA loops 13-16).
    expect(revealTimingOf(true, 'android')).toEqual({ boardAt: 60, keypadAt: 120, frames: 0 });
    expect(revealTimingOf(true, 'ios')).toEqual({ boardAt: 60, keypadAt: 120, frames: 0 });
  });

  it('a practice: the board is still at its start while the screen fades in, then rises on a drawn screen', async () => {
    const { session } = await practice();
    await render(<GameScreen session={session} onEnded={jest.fn()} />);
    // Well into the screen's own fade (the old reveal was 95 % in by now): not a pixel yet.
    await frames(flowFadeMs(false) - 20);
    expect(screen.getByTestId('board-reveal', hidden)).toHaveAnimatedStyle({
      opacity: 0,
      transform: [{ translateY: BOARD_REVEAL.rise }],
    });
    // The fade is over (and the first frames drawn): the board is on its way up, the keypad still waits.
    await frames(120);
    const board = opacityOf('board-reveal') ?? 0;
    expect(board).toBeGreaterThan(0);
    expect(board).toBeLessThan(1);
    await frames(1500);
    expect(screen.getByTestId('board-reveal', hidden)).toHaveAnimatedStyle({
      opacity: 1,
      transform: [{ translateY: 0 }],
    });
  });

  it('under GO! (ranked, friends): the board starts as the game mounts under it, as before', async () => {
    const { session } = await practice();
    await render(
      <GoCoverGateContext.Provider value={goCoverGate()}>
        <GameScreen session={session} onEnded={jest.fn()} />
      </GoCoverGateContext.Provider>,
    );
    await frames(BOARD_REVEAL.boardAt + 60);
    expect(opacityOf('board-reveal') ?? 0).toBeGreaterThan(0);
    await frames(1500);
    expect(screen.getByTestId('board-reveal', hidden)).toHaveAnimatedStyle({
      opacity: 1,
      transform: [{ translateY: 0 }],
    });
  });
});
