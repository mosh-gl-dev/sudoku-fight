import { cellName, type MoveScore, moveScore } from '@sudoku-fight/engine';

import type { PracticeSession } from '../../../game/session';
import {
  loadPracticeResults,
  myEndCue,
  newGameTarget,
  type PlayAgain,
  playAgainOf,
  type ResultsModel,
  resultsModel,
  scoreCountsOf,
  sessionResultsModel,
} from '../resultsModel';
import { lostDuel, wonDuel } from '../testing/duelGames';
import {
  completedPractice,
  endedPractice,
  interruptedPractice,
  move,
  savedPractice,
} from '../testing/practiceGames';

const noSession = (): PracticeSession | null => null;

describe('resultsModel', () => {
  it('a practice ended with "סיום אימון": my numbers, the move of the game and its calculation', async () => {
    const game = await endedPractice();
    const saved = (await game.repo.getGame(game.session.id))!;
    const view = game.session.getView();
    const me = view.players[0]!;
    const model = resultsModel(saved);

    expect(model).toMatchObject({
      gameId: game.session.id,
      mode: 'solo',
      gameType: 'fast',
      end: 'ended',
      score: me.score,
      mistakes: 1,
      correct: 2,
      durationMs: 10_000,
      avgThinkMs: 2_500,
      saved: true,
    });
    const best = me.bestMove!;
    const b = best.breakdown;
    // The engine's breakdown, told as the results tell it: the four counts, and the two that set the score.
    expect(model.bestMove).toMatchObject({
      cell: cellName(best.cell),
      digit: best.digit,
      points: best.points,
      counts: { row: b.row, col: b.col, box: b.box, num: b.num },
      highest: { value: b.X },
      next: { value: b.Y },
    });
    expect(model.bestMove).not.toHaveProperty('line');
  });

  it('a full board is "completed"', async () => {
    const game = await completedPractice();
    const model = resultsModel((await game.repo.getGame(game.session.id))!);
    expect(model.end).toBe('completed');
    expect(model.correct).toBe(game.cells.length);
    expect(model.mistakes).toBe(0);
    expect(model.avgThinkMs).toBe(1_000);
  });

  it('an interrupted practice: its row’s numbers, and the best move and think time from its saved log', async () => {
    const game = await interruptedPractice();
    const saved = (await game.repo.getGame(game.session.id))!;
    expect(saved.status).toBe('interrupted');
    expect(saved.result).toBeNull();
    const events = await game.repo.loadEvents(game.session.id);
    const model = resultsModel(saved, events);
    expect(model).toMatchObject({ end: 'interrupted', correct: 1, mistakes: 1, avgThinkMs: 2_500 });
    expect(model.score).toBe(saved.score);
    expect(model.durationMs).toBe(saved.durationMs);
    expect(model.bestMove?.cell).toBe(cellName(game.cells[0]!));

    // Without its log, the numbers still come from the row.
    expect(resultsModel(saved)).toMatchObject({
      end: 'interrupted',
      correct: 1,
      bestMove: null,
      avgThinkMs: null,
    });
  });

  it('a practice without a correct move has no move of the game and no think time', async () => {
    const game = await savedPractice();
    game.session.endPractice();
    await game.session.flush();
    const model = resultsModel((await game.repo.getGame(game.session.id))!);
    expect(model).toMatchObject({ score: 0, correct: 0, bestMove: null, avgThinkMs: null });
  });

  it('sessionResultsModel: the same results from the session, marked unsaved; none while it runs', async () => {
    const game = await savedPractice();
    move(game, game.cells[0]!, 2_000);
    expect(sessionResultsModel(game.session)).toBeNull();
    game.session.endPractice();
    expect(sessionResultsModel(game.session)).toMatchObject({
      gameId: game.session.id,
      end: 'ended',
      correct: 1,
      avgThinkMs: 2_000,
      saved: false,
    });
  });
});

describe('loadPracticeResults', () => {
  it('waits for the session that just ended to reach the disk, then reads it', async () => {
    const game = await savedPractice();
    move(game, game.cells[0]!, 2_000);
    game.session.endPractice(); // the finish is still on its way to the database
    const loaded = await loadPracticeResults(game.session.id, {
      repo: async () => game.repo,
      session: () => game.session,
    });
    expect(loaded).toMatchObject({ kind: 'found', model: { end: 'ended', correct: 1, saved: true } });
  });

  it('reads a saved game with no session around (after an app restart)', async () => {
    const game = await interruptedPractice();
    const loaded = await loadPracticeResults(game.session.id, {
      repo: async () => game.repo,
      session: noSession,
    });
    expect(loaded).toMatchObject({ kind: 'found', model: { end: 'interrupted', correct: 1 } });
  });

  it('a game that is not on the phone is missing; without a database it is unavailable', async () => {
    const game = await savedPractice();
    expect(await loadPracticeResults('nope', { repo: async () => game.repo, session: noSession })).toEqual({
      kind: 'missing',
    });
    expect(await loadPracticeResults('nope', { repo: async () => null, session: noSession })).toEqual({
      kind: 'unavailable',
    });
    game.session.close();
  });

  it('without a database, the session that just ended still shows its results', async () => {
    const game = await savedPractice();
    game.session.endPractice();
    const loaded = await loadPracticeResults(game.session.id, {
      repo: async () => null,
      session: () => game.session,
    });
    expect(loaded).toMatchObject({ kind: 'found', model: { end: 'ended', saved: false } });
  });

  it('a failing read falls back to the session, or reports the database unavailable', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const game = await savedPractice();
    game.session.endPractice();
    const failing = { repo: async () => Promise.reject(new Error('disk on fire')) };
    expect(
      await loadPracticeResults(game.session.id, { ...failing, session: () => game.session }),
    ).toMatchObject({ kind: 'found', model: { saved: false } });
    expect(await loadPracticeResults(game.session.id, { ...failing, session: noSession })).toEqual({
      kind: 'unavailable',
    });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('the move of the game, told by its counts (spec §6.4)', () => {
  const score = (row: number, col: number, box: number, num: number, X: number, Y: number): MoveScore => ({
    row,
    col,
    box,
    num,
    X,
    Y,
    points: 9 - X + (9 - Y) / 2,
  });

  it('names the counts that hold the engine’s X and Y', () => {
    expect(scoreCountsOf(score(6, 4, 6, 5, 6, 6))).toEqual({
      counts: { row: 6, col: 4, box: 6, num: 5 },
      highest: { count: 'row', value: 6 },
      next: { count: 'box', value: 6 },
    });
    expect(scoreCountsOf(score(2, 7, 3, 5, 7, 5))).toMatchObject({
      highest: { count: 'col', value: 7 },
      next: { count: 'num', value: 5 },
    });
  });

  it('four equal counts: the first two are named, never the same one twice', () => {
    const { highest, next } = scoreCountsOf(score(3, 3, 3, 3, 3, 3));
    expect([highest.count, next.count]).toEqual(['row', 'col']);
  });

  it('follows the engine on a real board, whichever way it picks Y [D13]', () => {
    // A9 on a board where its row and column are equally full (6 each), so the two ways of picking Y differ.
    const grid = new Array<number>(81).fill(0);
    [1, 2, 3, 4, 5, 6].forEach((d, i) => (grid[i] = d));
    [7, 8, 9, 7, 8, 9].forEach((d, i) => (grid[9 * (i + 1) + 8] = d));
    const ys = new Set<number>();
    for (const y of ['sorted', 'distinct'] as const) {
      const b = moveScore(grid, 8, 9, y);
      ys.add(b.Y);
      const told = scoreCountsOf(b);
      expect(told.counts).toEqual({ row: b.row, col: b.col, box: b.box, num: b.num });
      expect(told.counts[told.highest.count]).toBe(b.X);
      expect(told.counts[told.next.count]).toBe(b.Y);
      expect(told.next.count).not.toBe(told.highest.count);
    }
    expect(ys.size).toBe(2);
  });
});

describe('my avatar’s end (the hero)', () => {
  const end = (m: Partial<ResultsModel>) =>
    myEndCue({ players: 2, outcome: null, end: 'completed', ...m } as ResultsModel);

  it('a solo practice: a win only with the board completed', () => {
    expect(end({ players: 1, end: 'completed' })).toBe('win');
    expect(end({ players: 1, end: 'ended' })).toBeNull();
    expect(end({ players: 1, end: 'interrupted' })).toBeNull();
  });

  it('with opponents: win, draw or loss by my place; out of the game is a loss', () => {
    expect(end({ outcome: 'win' })).toBe('win');
    expect(end({ outcome: 'tie' })).toBe('draw');
    expect(end({ outcome: 'loss' })).toBe('lose');
    expect(end({ end: 'surrendered', outcome: null })).toBe('lose');
    expect(end({ end: 'abandoned', outcome: null })).toBe('lose');
    expect(end({ end: 'interrupted', outcome: null })).toBeNull();
  });
});

describe('"משחק חדש": the same kind of game, one tap (UX-2)', () => {
  const again = (p: Partial<PlayAgain>): PlayAgain => ({
    mode: 'solo',
    gameType: 'fast',
    botLevel: null,
    botName: null,
    players: 1,
    friends: false,
    ...p,
  });

  it('reads it off the results: a solo practice, and a bot game with its level and name', async () => {
    const practice = await endedPractice();
    const solo = resultsModel((await practice.repo.getGame(practice.session.id))!);
    expect(playAgainOf(solo)).toEqual(again({ gameType: solo.gameType }));
    for (const game of [await wonDuel(), await lostDuel()]) {
      const model = resultsModel((await game.repo.getGame(game.id))!, await game.repo.loadEvents(game.id));
      expect(playAgainOf(model)).toEqual(
        again({ mode: 'bot', gameType: 'fast', botLevel: 3, botName: 'Mr. Hoot', players: 2 }),
      );
    }
  });

  it('solo: the same practice at once; bot: the same bot at once', () => {
    expect(newGameTarget(again({}), null)).toEqual({
      kind: 'practice',
      play: { mode: 'solo', gameType: 'fast' },
    });
    expect(newGameTarget(again({ mode: 'bot', gameType: 'hard', botLevel: 4, players: 2 }), null)).toEqual({
      kind: 'practice',
      play: { mode: 'bot', gameType: 'hard', botLevel: 4 },
    });
    // A bot game whose bot could not be read: the bot mode, and startAndOpen picks the level.
    expect(newGameTarget(again({ mode: 'bot', players: 2 }), null)).toEqual({
      kind: 'practice',
      play: { mode: 'bot', gameType: 'fast' },
    });
  });

  it('ranked from matchmaking: the same queue; a table that is not open falls back to 2', () => {
    const ranked = again({ mode: 'ranked', gameType: 'normal', players: 3 });
    const queue = { queueKey: 'normal-3p', friendsHost: false };
    expect(newGameTarget(ranked, queue)).toEqual({ kind: 'ranked', gameType: 'normal', players: 3 });
    expect(newGameTarget({ ...ranked, players: 7 }, queue)).toEqual({
      kind: 'ranked',
      gameType: 'normal',
      players: 2,
    });
  });

  it('a room by code outside matchmaking: back to the rooms', () => {
    const ranked = again({ mode: 'ranked', players: 2 });
    expect(newGameTarget(ranked, { queueKey: null, friendsHost: false })).toEqual({ kind: 'rooms' });
    expect(newGameTarget(ranked, null)).toEqual({ kind: 'rooms' });
  });

  it('friends: back to playing with friends, as the host (a new room) or a guest (a code), never the modes', () => {
    const friends = again({ mode: 'ranked', players: 3, friends: true });
    expect(newGameTarget(friends, { queueKey: null, friendsHost: true })).toEqual({
      kind: 'friends',
      host: true,
    });
    expect(newGameTarget(friends, { queueKey: null, friendsHost: false })).toEqual({
      kind: 'friends',
      host: false,
    });
    expect(newGameTarget(friends, null)).toEqual({ kind: 'friends', host: false });
  });
});
