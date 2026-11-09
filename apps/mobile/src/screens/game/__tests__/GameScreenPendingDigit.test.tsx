import { type CellIndex, cellName, ManualClock, ManualScheduler } from '@sudoku-fight/engine';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { puzzleById } from '../../../game/offlinePool';
import { type PracticeSession, startPractice } from '../../../game/session';
import { answerIn, emptyCellsOf, PUZZLE, smallPool, wrongIn } from '../../../game/testing/practice';
import { hidden, type Setup, setUp } from '../connection/testing/setup';
import { GameScreen } from '../GameScreen';
import { OnlineGame } from '../online/OnlineGame';
import { liveOnlineSession, ME, type OnlineGame as Online, OPP, pass } from '../testing/online';

/*
 * BRD-1 (polish audit, 2026-10-30): a digit goes to the cell the player sees as selected. Online, a tap only
 * shows the cell pending until the server's lock comes back (about 80–200 ms). A digit pressed meanwhile used to
 * go to the old lock (a mistake there cost a penalty) or, with no lock yet, was dropped with a "בחר משבצת"
 * nudge. Now the keypad is armed for the pending cell and the digit follows its select on the same socket: the
 * server judges it in the new cell, or refuses both at no cost, with the usual "taken" or re-lock shake.
 */

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../../../services/analytics', () => ({ track: jest.fn() }));
jest.mock('../../../services/feedback', () => ({
  cue: jest.fn(),
  preloadCues: jest.fn(),
  cueCountUp: jest.fn(() => jest.fn()),
}));
const feedback = jest.requireMock<{ cue: jest.Mock }>('../../../services/feedback');
const cues = (): string[] => feedback.cue.mock.calls.map((c: unknown[]) => String(c[0]));

const [c0, c1] = emptyCellsOf(PUZZLE) as [CellIndex, CellIndex];
const cellButton = (cell: CellIndex) => screen.getByTestId(`cell-${cellName(cell)}`);
const key = (digit: number) => screen.getByTestId(`key-${digit}`);

let setup: Setup;
let game: Online | null = null;

beforeEach(async () => {
  setup = await setUp('he');
  feedback.cue.mockClear();
});

afterEach(() => {
  game?.session.close();
  game = null;
  setup.restore();
});

/** A live two-player game against the fake server, 60 ms each way (a lock comes back 120 ms after a tap). */
async function live() {
  game = await liveOnlineSession({ oneWayMs: 60 });
  const g = game;
  await render(
    <OnlineGame
      session={g.session}
      onEnded={jest.fn()}
      onHome={jest.fn()}
      onRetry={jest.fn()}
      onLeave={jest.fn()}
      onPractice={jest.fn()}
    />,
  );
  const me = () => g.session.getView().players.find((p) => p.id === ME)!;
  /** What I sent the server, without the pings. */
  const sent = () => g.table.room.actions.map(({ clientSeq: _seq, ...action }) => action);
  return { ...g, me, sent };
}

describe('online: a digit pressed while my tap waits for the server (BRD-1)', () => {
  it('the first tap: the keys work at once, and the digit is not lost', async () => {
    const g = await live();
    expect(key(5)).toBeDisabled();
    await fireEvent.press(cellButton(c0));
    expect(cellButton(c0)).toHaveAccessibleName(/ממתינה לאישור הנעילה/);
    // Armed for the cell on its way: no "בחר משבצת" nudge, the digit goes out right behind the select.
    expect(key(answerIn(PUZZLE, c0))).toBeEnabled();
    await fireEvent.press(key(answerIn(PUZZLE, c0)));
    expect(cues()).not.toContain('nudge');
    expect(g.sent().slice(-2)).toEqual([
      { type: 'select', cell: c0 },
      { type: 'place', cell: c0, digit: answerIn(PUZZLE, c0) },
    ]);
    // A digit's result still only comes from the server.
    expect(g.session.getView().grid[c0]).toBe(0);
    await pass(g.table, 300);
    expect(g.session.getView().grid[c0]).toBe(answerIn(PUZZLE, c0));
    expect(g.me()).toMatchObject({ correct: 1, mistakes: 0 });
  });

  it('a switch on its way: the digit lands in the new cell, never in the lock it replaces', async () => {
    const g = await live();
    await fireEvent.press(cellButton(c0));
    await pass(g.table, 200);
    expect(g.me().lock?.cell).toBe(c0);

    await fireEvent.press(cellButton(c1));
    await fireEvent.press(key(answerIn(PUZZLE, c1)));
    expect(g.sent().at(-1)).toEqual({ type: 'place', cell: c1, digit: answerIn(PUZZLE, c1) });
    await pass(g.table, 300);
    const view = g.session.getView();
    expect(view.grid[c1]).toBe(answerIn(PUZZLE, c1));
    expect(view.grid[c0]).toBe(0);
    expect(view.wrong[c0]).toEqual([]);
    expect(g.me()).toMatchObject({ correct: 1, mistakes: 0 });
  });

  it('a switch refused (the opponent took the cell): the "taken" shake, my lock kept, no penalty', async () => {
    const g = await live();
    await fireEvent.press(cellButton(c0));
    await pass(g.table, 200);
    // The opponent takes c1 at the server; the news is still on its way to me, so c1 looks free.
    expect(g.table.opponent({ type: 'select', cell: c1 })).toBeNull();
    await fireEvent.press(cellButton(c1));
    // Wrong in c0 (and in c1): sent to the old lock it would have cost a penalty.
    const digit = wrongIn(PUZZLE, c0, [answerIn(PUZZLE, c1)]);
    await fireEvent.press(key(digit));
    expect(g.sent().at(-1)).toEqual({ type: 'place', cell: c1, digit });
    await pass(g.table, 300);

    expect(cues()).toContain('cellDenied');
    expect(cellButton(c1)).toHaveAccessibleName(/נעולה על ידי/);
    expect(g.me()).toMatchObject({ score: 0, mistakes: 0, lock: { cell: c0 } });
    expect(g.session.getView().wrong[c0]).toEqual([]);
    expect(screen.getByTestId('lock-strip-seconds', hidden)).toBeOnTheScreen();
    // The opponent's lock stays theirs.
    expect(g.session.getView().players.find((p) => p.id === OPP)?.lock?.cell).toBe(c1);
  });

  it('a switch refused (back to my cell during its re-lock wait): the same shake, no penalty', async () => {
    const g = await live();
    await fireEvent.press(cellButton(c0));
    await pass(g.table, 200);
    await fireEvent.press(cellButton(c1)); // c0 now waits 1 s [D2]
    await pass(g.table, 200);
    expect(g.me().lock?.cell).toBe(c1);
    feedback.cue.mockClear();

    await fireEvent.press(cellButton(c0));
    const digit = wrongIn(PUZZLE, c1, [answerIn(PUZZLE, c0)]);
    await fireEvent.press(key(digit));
    expect(g.sent().at(-1)).toEqual({ type: 'place', cell: c0, digit });
    await pass(g.table, 300);

    expect(cues()).toContain('cellDenied');
    expect(g.me()).toMatchObject({ score: 0, mistakes: 0, lock: { cell: c1 } });
    expect(g.session.getView().wrong[c1]).toEqual([]);
  });
});

describe('offline (LocalGameHost): the same, as before', () => {
  let running: PracticeSession | null = null;
  afterEach(() => {
    running?.close();
    running = null;
  });

  it('a tap locks at once, so a switch and a digit right after it go to the new cell', async () => {
    const clock = new ManualClock(1_700_000_000_000);
    const session = await startPractice(
      { gameType: 'fast' },
      {
        repo: null,
        clock,
        scheduler: new ManualScheduler(clock),
        pool: smallPool(1),
        seed: 7,
        track: () => undefined,
      },
    );
    running = session;
    const puzzle = puzzleById(session.puzzleId)!;
    const [a, b] = emptyCellsOf(puzzle) as [CellIndex, CellIndex];
    await render(<GameScreen session={session} onEnded={jest.fn()} />);

    await fireEvent.press(cellButton(a));
    await fireEvent.press(cellButton(b));
    await fireEvent.press(key(answerIn(puzzle, b)));
    expect(session.getView().grid[b]).toBe(answerIn(puzzle, b));
    expect(session.getView().grid[a]).toBe(0);
    expect(session.getView().players[0]).toMatchObject({ correct: 1, mistakes: 0 });
    // No lock, nothing tapped: a key only nudges "בחר משבצת".
    feedback.cue.mockClear();
    await fireEvent.press(key(answerIn(puzzle, a)));
    expect(cues()).toEqual(['nudge']);
    expect(session.getView().grid[a]).toBe(0);
  });
});
