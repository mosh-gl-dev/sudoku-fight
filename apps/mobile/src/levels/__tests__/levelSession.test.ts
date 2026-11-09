import {
  type AppLevel,
  attachBot,
  countsAsPlayed,
  type Digit,
  type FindLevelOver,
  type GameEvent,
  type HostUpdate,
  levelBotConfig,
  ManualClock,
  ManualScheduler,
} from '@sudoku-fight/engine';
import { renderHook } from '@testing-library/react-native';
import { AppState, Platform } from 'react-native';

import { useAuth } from '../../auth/authStore';
import { useModalWindow } from '../../components/ui/modalWindows';
import { LEVEL_UI } from '../../config/levels';
import { activeSwitches, levelRulesNow } from '../../config/testing';
import { openPracticeStorage } from '../../game/storage';
import type { SqlJsDb } from '../../game/testing/sqlJsDb';
import { levelFinished, type LevelFinisher } from '../appLevels';
import {
  type AppStateSource,
  findWhy,
  type LevelSession,
  type LevelSessionDeps,
  startLevel,
  type WindowFocusSource,
} from '../levelSession';
import { allLevels } from '../levelsData';
import { firstBossOf, firstLevelOf, levelsOf } from './helpers/levelsOf';
import { forgetLevels } from '../levelsStore';
import { useTestingSwitches } from '../../state/testingSwitches';

/**
 * One attempt at a stage (dev-plan §2ח, §3.1): the attempt's board (the stored one first, an equivalent one
 * from the second attempt, D63), its bot (the stage's seed and attempt, the stage's final pace, never an
 * interference), one level_start, the end stored once, close() before the end (level_quit, nothing stored),
 * quit() (0 stars, played), and the background freeze with its 3-2-1 countdown [D65]. All on a manual clock.
 */

const mockDbs = new Map<string, Promise<SqlJsDb>>();
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: (name: string) => {
    let db = mockDbs.get(name);
    if (!db) {
      db = jest
        .requireActual<typeof import('../../game/testing/sqlJsDb')>('../../game/testing/sqlJsDb')
        .memoryDb();
      mockDbs.set(name, db);
    }
    return db;
  },
}));
jest.mock('../../services/analytics', () => ({ track: jest.fn() }));
jest.mock('@sudoku-fight/engine', () => {
  const actual = jest.requireActual<typeof import('@sudoku-fight/engine')>('@sudoku-fight/engine');
  return {
    ...actual,
    attachBot: jest.fn((...args: Parameters<typeof actual.attachBot>) => actual.attachBot(...args)),
  };
});

// Picked by kind, never by id (a rebuild may give an id another kind): helpers/levelsOf.
const FIND = firstLevelOf('find', 1); // find, chapter 1's first stage
const BOX = firstLevelOf('fillBox', 1); // fill the box, chapter 1
const RACE = firstLevelOf('findDuel'); // the first race (not a boss): against Pip
const DUEL = firstLevelOf('duel'); // the first duel: against Pip
/**
 * A duel against Pip whose bot moves inside the stage's 30 s (Pip thinks 15–25 s a move, so on some stages'
 * dice its first move comes after the end): the second Pip duel.
 */
const PIP_DUEL = levelsOf('duel').filter((l) => l.bot?.level === 1)[1]!;
const DUEL_BOSS = firstBossOf('duel'); // the first duel boss (chapter 3): its bot at ×0.9

/** A fake AppState: the test says when the app goes and comes back (and where it is as the stage starts). */
function fakeAppState(initial = 'active') {
  let listener: ((state: string) => void) | null = null;
  let now = initial;
  const source: AppStateSource = {
    get currentState() {
      return now;
    },
    addEventListener: (_type, l) => {
      listener = l;
      return { remove: () => (listener = null) };
    },
  };
  const set = (state: string) => {
    now = state;
    listener?.(state);
  };
  return { source, set, listening: () => listener !== null };
}

interface Harness {
  clock: ManualClock;
  scheduler: ManualScheduler;
  track: jest.Mock;
  finish: jest.Mock<ReturnType<LevelFinisher>, Parameters<LevelFinisher>>;
  app: ReturnType<typeof fakeAppState>;
  deps: LevelSessionDeps;
}

function harness(over: Partial<LevelSessionDeps> = {}): Harness {
  const clock = new ManualClock(1_000_000);
  const scheduler = new ManualScheduler(clock);
  const track = jest.fn();
  const finish: Harness['finish'] = jest.fn(async (_end: Parameters<LevelFinisher>[0]) => null);
  const app = fakeAppState();
  return {
    clock,
    scheduler,
    track,
    finish,
    app,
    deps: {
      clock,
      scheduler,
      track,
      finish,
      appState: app.source,
      attemptOf: async () => 1,
      bestStarsOf: () => 0,
      onTimerError: (error) => {
        throw error;
      },
      ...over,
    },
  };
}

/** The stage's answer cell (find: its target; a race: the current spot's). */
function answerOf(session: LevelSession): number {
  const level = session.played;
  if (level.kind === 'find') return level.targets.target.accept[0]!;
  if (level.kind === 'findDuel')
    return level.targets.spots[session.getView().level!.find!.spotIndex]!.accept[0]!;
  throw new Error('not a tap stage');
}

/** An empty cell of the find's box that is not the answer. */
function wrongCellOf(level: AppLevel): number {
  if (level.kind !== 'find') throw new Error('not a find');
  const { target } = level.targets;
  const box = target.scope.kind === 'box' ? target.scope.index : 0;
  for (let i = 0; i < 81; i++) {
    const inBox = Math.floor(Math.floor(i / 9) / 3) * 3 + Math.floor((i % 9) / 3) === box;
    if (inBox && level.board.grid[i] === '0' && !target.accept.includes(i)) return i;
  }
  throw new Error('no wrong cell');
}

const sessions: LevelSession[] = [];
async function start(level: AppLevel, h: Harness, quick = false): Promise<LevelSession> {
  const s = await startLevel(level, { quick }, h.deps);
  sessions.push(s);
  return s;
}

afterEach(() => {
  for (const s of sessions.splice(0)) s.close();
  jest.mocked(attachBot).mockClear();
});

describe('the attempt’s board', () => {
  it('attempt 1 plays the stored board', async () => {
    const h = harness();
    for (const level of [FIND, BOX]) {
      const s = await start(level, h);
      expect(s.attempt).toBe(1);
      expect(s.getView().grid.join('')).toBe(level.board.grid);
      expect(s.played).toBe(level);
    }
  });

  it('attempt 2 plays an equivalent board: another grid, the same star rule and limit', async () => {
    const h = harness({ attemptOf: async () => 2 });
    for (const level of [FIND, BOX]) {
      const s = await start(level, h);
      expect(s.attempt).toBe(2);
      expect(s.getView().grid.join('')).not.toBe(level.board.grid);
      expect(s.levelView()!.marks).toEqual(level.stars);
      expect(s.levelView()!.limitMs).toBe(level.timeLimitMs);
    }
  });

  it('a stage runs as the engine says: find in the tap engine, the box and the duel in the game engine', async () => {
    const h = harness();
    expect((await start(FIND, h)).mode).toBe('solo');
    expect((await start(RACE, h)).mode).toBe('bot');
    const box = await start(BOX, h);
    expect(box.getView().rules.interferences).toBe(false);
    expect(box.levelView()!.editableCells).toEqual(BOX.kind === 'fillBox' ? BOX.targets.cells : null);
  });
});

describe('the point hunter’s "שווה 6" (LEVEL_UI.worthHintLevels)', () => {
  const hunters = allLevels().filter((l) => l.kind === 'pointHunter');

  it('the kind’s first stages show what my locked cell is worth; the later ones do not', async () => {
    expect(LEVEL_UI.worthHintLevels).toBe(2);
    const h = harness();
    const first = await start(hunters[0]!, h);
    expect(first.played.worthHint).toBe(true);
    const cell = [...first.played.board.grid].findIndex((d) => d === '0');
    first.host.select(cell);
    expect(first.levelView()!.selectedWorth).toEqual(expect.any(Number));
    expect((await start(hunters[1]!, h)).played.worthHint).toBe(true);
    const third = await start(hunters[2]!, h);
    expect(third.played.worthHint).toBeUndefined();
    third.host.select([...third.played.board.grid].findIndex((d) => d === '0'));
    expect(third.levelView()!.selectedWorth).toBeUndefined();
  });

  it('the setting decides: 0 shows it nowhere, 5 in the first five', async () => {
    const none = harness({ settings: { ...LEVEL_UI, worthHintLevels: 0 } });
    expect((await start(hunters[0]!, none)).played.worthHint).toBeUndefined();
    const five = harness({ settings: { ...LEVEL_UI, worthHintLevels: 5 } });
    expect((await start(hunters[4]!, five)).played.worthHint).toBe(true);
    expect((await start(hunters[5]!, five)).played.worthHint).toBeUndefined();
    // Any other kind is played as stored.
    expect((await start(FIND, five)).played).toBe(FIND);
  });
});

describe('the bot', () => {
  it('a duel attaches the engine’s bot at the stage’s pace, and it never interferes', async () => {
    const h = harness();
    const s = await start(PIP_DUEL, h);
    expect(attachBot).toHaveBeenCalledTimes(1);
    const opts = jest.mocked(attachBot).mock.calls[0]![1];
    expect(opts).toMatchObject({ botId: 'bot-1', level: 1, config: levelBotConfig(PIP_DUEL.bot!.pace) });
    const events: GameEvent[] = [];
    s.subscribe((u: HostUpdate) => u.kind === 'events' && events.push(...u.events));
    for (let k = 0; k < 30; k++) h.scheduler.advance(1000);
    expect(events.some((e) => e.type === 'placedCorrect' && e.playerId === 'bot-1')).toBe(true);
    expect(events.filter((e) => e.type === 'interference' || e.type === 'interferenceEnded')).toEqual([]);
  });

  it('a boss duel’s bot runs at the boss’s final pace (the chapter’s × 0.9)', async () => {
    expect(DUEL_BOSS.boss).toBe(true);
    expect(DUEL_BOSS.bot!.pace).toBeCloseTo(0.9);
    await start(DUEL_BOSS, harness());
    expect(jest.mocked(attachBot).mock.calls[0]![1].config).toEqual(levelBotConfig(0.9));
  });

  it('its dice come from the stage’s seed and the attempt: the first attempt meets the same bot', async () => {
    const play = async (attempt: number) => {
      const h = harness({ attemptOf: async () => attempt });
      const s = await start(PIP_DUEL, h);
      const moves: string[] = [];
      s.subscribe(
        (u) =>
          u.kind === 'events' &&
          u.events.forEach((e) => e.type === 'placedCorrect' && moves.push(`${e.t}:${e.cell}`)),
      );
      for (let k = 0; k < 30; k++) h.scheduler.advance(1000);
      s.close();
      return moves.join(' ');
    };
    const first = await play(1);
    expect(first.length).toBeGreaterThan(0);
    expect(await play(1)).toBe(first);
    expect(await play(2)).not.toBe(first);
  });

  it('a race needs no attached bot: it lives in the tap engine', async () => {
    const s = await start(RACE, harness());
    expect(attachBot).not.toHaveBeenCalled();
    expect(s.getView().players.map((p) => p.id)).toEqual(['me', 'bot-1']);
  });
});

describe('level_start', () => {
  it('goes once per start, with the attempt, the best stars and quick', async () => {
    const h = harness({ attemptOf: async () => 3, bestStarsOf: () => 2 });
    await start(FIND, h, true);
    const starts = h.track.mock.calls.filter(([name]) => name === 'level_start');
    expect(starts).toEqual([
      [
        'level_start',
        { level: 1, rev: FIND.rev, chapter: 1, kind: 'find', attempt: 3, bestStars: 2, quick: true },
      ],
    ]);
    await start(BOX, h);
    expect(h.track.mock.calls.filter(([name]) => name === 'level_start')).toHaveLength(2);
    expect(h.track).toHaveBeenLastCalledWith(
      'level_start',
      expect.objectContaining({ level: 2, quick: false }),
    );
  });
});

describe('the end', () => {
  it('a found target is stored once, with its stars, reason and measure', async () => {
    const h = harness();
    const s = await start(FIND, h);
    h.scheduler.advance(4000);
    s.tap(answerOf(s));
    const result = await s.result;
    expect(h.finish).toHaveBeenCalledTimes(1);
    const finish = h.finish.mock.calls[0]![0];
    expect(finish).toMatchObject({ level: FIND, attempt: 1, playerId: 'me', mistakes: 0, quick: false });
    expect((finish.end as FindLevelOver).reason).toBe('targetReached');
    expect(result.outcome).toEqual({
      reason: 'completed',
      stars: 3,
      metric: 4000,
      elapsedMs: 4000,
      bossBeaten: null,
    });
    // Nothing more after the end.
    s.tap(answerOf(s));
    h.scheduler.advance(30_000);
    expect(h.finish).toHaveBeenCalledTimes(1);
  });

  it('a wrong tap costs 5 s, and "למה?" explains the target and the wrong tap', async () => {
    const h = harness();
    const s = await start(FIND, h);
    const wrong = wrongCellOf(FIND);
    s.tap(wrong);
    s.tap(answerOf(s));
    const result = await s.result;
    expect(result.mistakes).toBe(1);
    expect(result.wrongTaps).toEqual([wrong]);
    expect(result.outcome.elapsedMs).toBe(5000);
    const why = findWhy(s.played, result.wrongTaps, 'he');
    expect(why).toContain(String(FIND.kind === 'find' ? FIND.targets.target.digit : ''));
    expect(findWhy(BOX, [], 'he')).toBeNull();
  });

  it('close() before the end tracks level_quit and stores nothing', async () => {
    const h = harness();
    const s = await start(FIND, h);
    h.scheduler.advance(3000);
    s.close();
    expect(h.finish).not.toHaveBeenCalled();
    expect(h.track).toHaveBeenCalledWith('level_quit', { level: 1, rev: FIND.rev, atMs: 3000 });
    expect(s.over).toBeNull();
  });

  it('quit() (the X, confirmed) ends the stage with 0 stars, and it counts as played', async () => {
    for (const level of [FIND, BOX, DUEL]) {
      const h = harness();
      const s = await start(level, h);
      h.scheduler.advance(2000);
      s.quit();
      const result = await s.result;
      expect(h.finish).toHaveBeenCalledTimes(1);
      expect(result.outcome).toMatchObject({ reason: 'quit', stars: 0 });
      expect(countsAsPlayed(result.outcome.reason)).toBe(true);
      s.close();
      expect(h.track).not.toHaveBeenCalledWith('level_quit', expect.anything());
    }
  });
});

describe('[D65] the background freeze', () => {
  it.each(['background', 'inactive'])(
    "AppState '%s' freezes the stage; 'active' counts 3, 2, 1 over the cover, then it goes on",
    async (away) => {
      const h = harness();
      const s = await start(FIND, h);
      const states: string[] = [];
      s.onPause((p) => states.push(p.kind === 'countdown' ? String(p.count) : p.kind));
      h.scheduler.advance(4000);
      const left = s.levelView()!.remainingMs;
      h.app.set(away);
      expect(s.getView().status).toBe('paused');
      expect(s.pause).toEqual({ kind: 'paused' });
      // Away for a minute: nothing runs out, no time passes on the stage.
      h.scheduler.advance(60_000);
      expect(s.levelView()!.remainingMs).toBe(left);
      h.app.set('active');
      expect(s.pause).toEqual({ kind: 'countdown', count: 3 });
      expect(s.getView().status).toBe('paused');
      h.scheduler.advance(1000);
      expect(s.pause).toEqual({ kind: 'countdown', count: 2 });
      h.scheduler.advance(1000);
      expect(s.pause).toEqual({ kind: 'countdown', count: 1 });
      h.scheduler.advance(LEVEL_UI.resumeCountdownMs - 2000);
      expect(s.pause).toEqual({ kind: 'none' });
      expect(s.getView().status).toBe('running');
      // The same time left as before the freeze: the countdown is not the stage's time either.
      expect(s.levelView()!.remainingMs).toBe(left);
      expect(states).toEqual(['paused', '3', '2', '1', 'none']);
      // The attempt goes on: not cancelled, no level_quit.
      expect(h.track).not.toHaveBeenCalledWith('level_quit', expect.anything());
      s.tap(answerOf(s));
      expect((await s.result).outcome).toMatchObject({ reason: 'completed', elapsedMs: 4000 });
    },
  );

  it('a digit stage freezes too: its clock and its time limit', async () => {
    const h = harness();
    const s = await start(BOX, h);
    h.scheduler.advance(5000);
    const left = s.levelView()!.remainingMs;
    h.app.set('background');
    h.scheduler.advance(120_000);
    expect(s.getView().status).toBe('paused');
    h.app.set('active');
    h.scheduler.advance(LEVEL_UI.resumeCountdownMs);
    expect(s.getView().status).toBe('running');
    expect(s.levelView()!.remainingMs).toBe(left);
  });

  it('away again during the countdown: frozen again, and the countdown starts over at the return', async () => {
    const h = harness();
    const s = await start(FIND, h);
    h.app.set('background');
    h.app.set('active');
    h.scheduler.advance(1500);
    h.app.set('background');
    expect(s.pause).toEqual({ kind: 'paused' });
    h.scheduler.advance(10_000);
    expect(s.getView().status).toBe('paused');
    h.app.set('active');
    expect(s.pause).toEqual({ kind: 'countdown', count: 3 });
  });

  it.each([
    ['a tap stage', FIND],
    ['a digit stage', BOX],
  ])(
    '%s that starts with the app already away (it left after "מוכן?") starts frozen; the return counts down (B28)',
    async (_name, level) => {
      const h = harness();
      h.app.set('background');
      const s = await start(level, h);
      expect(s.pause).toEqual({ kind: 'paused' });
      expect(s.getView().status).toBe('paused');
      const left = s.levelView()!.remainingMs;
      // A minute and a half away: none of the stage's time goes.
      h.scheduler.advance(90_000);
      expect(s.levelView()!.remainingMs).toBe(left);
      h.app.set('active');
      expect(s.pause).toEqual({ kind: 'countdown', count: 3 });
      h.scheduler.advance(LEVEL_UI.resumeCountdownMs);
      expect(s.getView().status).toBe('running');
      expect(s.levelView()!.remainingMs).toBe(left);
    },
  );

  it('LEVEL_UI.backgroundPause off: a stage that starts away is not frozen either', async () => {
    const h = harness({ settings: { ...LEVEL_UI, backgroundPause: false } });
    h.app.set('background');
    const s = await start(FIND, h);
    expect(s.getView().status).toBe('running');
    expect(s.pause).toEqual({ kind: 'none' });
  });

  it('LEVEL_UI.backgroundPause off: no freeze', async () => {
    const h = harness({ settings: { ...LEVEL_UI, backgroundPause: false } });
    const s = await start(FIND, h);
    expect(h.app.listening()).toBe(false);
    s.background();
    expect(s.getView().status).toBe('running');
    expect(s.pause).toEqual({ kind: 'none' });
  });

  it('LEVEL_UI.resumeCountdownMs is the countdown’s length', async () => {
    const h = harness({ settings: { ...LEVEL_UI, resumeCountdownMs: 1000 } });
    const s = await start(FIND, h);
    h.app.set('background');
    h.app.set('active');
    expect(s.pause).toEqual({ kind: 'countdown', count: 1 });
    h.scheduler.advance(1000);
    expect(s.getView().status).toBe('running');
  });

  it('close() stops listening to the app', async () => {
    const h = harness();
    const s = await start(FIND, h);
    expect(h.app.listening()).toBe(true);
    s.close();
    expect(h.app.listening()).toBe(false);
  });
});

describe('a stage is never a practice', () => {
  afterEach(async () => {
    useAuth.setState({ status: 'loading', user: null });
    forgetLevels();
  });

  it('practice_games and puzzle_plays stay empty after a stored stage', async () => {
    useAuth.setState({
      status: 'ready',
      user: { uid: 'session-owner', email: null, emailVerified: true, methods: [] },
    });
    const practice = await openPracticeStorage();
    const h = harness({ finish: levelFinished });
    const s = await start(FIND, h);
    s.tap(answerOf(s));
    const result = await s.result;
    expect(result.finished?.outcome.stars).toBe(3);
    const db = (await mockDbs.get('practice.db'))!;
    const count = async (table: string) =>
      (await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`, []))?.n;
    expect(await count('practice_games')).toBe(0);
    expect(await count('puzzle_plays')).toBe(0);
    expect(await practice.playHistory('fast')).toEqual([]);
    expect(h.track).not.toHaveBeenCalledWith('game_start', expect.anything());
  });
});

describe('[D64] the chain under the staging switch (Moshe tries both first, 2026-10-18)', () => {
  const CHAIN = firstLevelOf('chain'); // the first chain stage

  afterEach(() => {
    useTestingSwitches.setState({ chainPenalty: false });
  });

  it("off (the default): the chain plays per the original §14, 'accept'", async () => {
    const s = await start(CHAIN, harness());
    expect(s.rules.chainNotYet).toBe('accept');
    expect(levelRulesNow().chainNotYet).toBe('accept');
  });

  it("on: the next chain stage plays 'penalty'; flipping it back changes the next one only", async () => {
    useTestingSwitches.setState({ chainPenalty: true });
    const penalty = await start(CHAIN, harness());
    expect(penalty.rules.chainNotYet).toBe('penalty');
    // The engine plays it: a right digit of the second step, before the first, costs 5 s and is not placed.
    const [, second] = (penalty.played as Extract<AppLevel, { kind: 'chain' }>).targets.cells;
    const answer = (cell: number) => Number(penalty.played.board.solution[cell]) as Digit;
    penalty.host.select(second!);
    penalty.host.place(second!, answer(second!));
    expect(penalty.getView().grid[second!]).toBe(0);
    expect(penalty.levelView()!.penaltyMs).toBe(5000);

    useTestingSwitches.setState({ chainPenalty: false });
    // The stage already running keeps its rules; the next one is 'accept' again.
    expect(penalty.rules.chainNotYet).toBe('penalty');
    const accept = await start(CHAIN, harness());
    expect(accept.rules.chainNotYet).toBe('accept');
    accept.host.select(second!);
    accept.host.place(second!, answer(second!));
    expect(accept.getView().grid[second!]).toBe(answer(second!));
    expect(accept.levelView()!.penaltyMs).toBe(0);
  });

  it('a production build never reads it: on, it is still the original', () => {
    const on = { chainPenalty: true, unlockAllLevels: true };
    const production = { server: 'production', dev: false };
    expect(activeSwitches(on, production)).toEqual({ chainPenalty: false, unlockAllLevels: false });
    expect(levelRulesNow(activeSwitches(on, production)).chainNotYet).toBe('accept');
    expect(levelRulesNow(activeSwitches(on, { server: 'staging', dev: false })).chainNotYet).toBe('penalty');
  });
});

describe('[D65] Android: the freeze comes with the window’s blur (QA levels-freeze-background)', () => {
  /** A fake window focus: the test says when the window loses and gets back the focus. */
  function fakeFocus(app: ReturnType<typeof fakeAppState>) {
    const listeners: Partial<Record<'blur' | 'focus', () => void>> = {};
    const source: WindowFocusSource = {
      get currentState() {
        return app.source.currentState;
      },
      addEventListener: (type, l) => {
        listeners[type] = l;
        return { remove: () => delete listeners[type] };
      },
    };
    return {
      source,
      blur: () => listeners.blur?.(),
      focus: () => listeners.focus?.(),
      listening: () => Object.keys(listeners).length > 0,
    };
  }

  function focusHarness() {
    const h = harness();
    const win = fakeFocus(h.app);
    h.deps.windowFocus = win.source;
    return { h, win };
  }

  it("Recents: the cover is up at the blur, before 'background' (Android’s Recents picture comes between)", async () => {
    const { h, win } = focusHarness();
    const s = await start(FIND, h);
    h.scheduler.advance(3000);
    const left = s.levelView()!.remainingMs;
    win.blur();
    expect(s.pause).toEqual({ kind: 'paused' });
    expect(s.getView().status).toBe('paused');
    h.app.set('background');
    h.scheduler.advance(30_000);
    // Back: 'focus' may come before 'active'; the 3, 2, 1 starts with 'active', once.
    win.focus();
    expect(s.pause).toEqual({ kind: 'paused' });
    h.app.set('active');
    win.focus();
    expect(s.pause).toEqual({ kind: 'countdown', count: 3 });
    h.scheduler.advance(LEVEL_UI.resumeCountdownMs);
    expect(s.getView().status).toBe('running');
    expect(s.levelView()!.remainingMs).toBe(left);
  });

  it('a blur with no going away (the notification shade): frozen, then 3, 2, 1 at the focus', async () => {
    const { h, win } = focusHarness();
    const s = await start(FIND, h);
    win.blur();
    expect(s.pause).toEqual({ kind: 'paused' });
    h.scheduler.advance(10_000);
    win.focus();
    expect(s.pause).toEqual({ kind: 'countdown', count: 3 });
    h.scheduler.advance(LEVEL_UI.resumeCountdownMs);
    expect(s.pause).toEqual({ kind: 'none' });
    expect(s.getView().status).toBe('running');
  });

  it('the app’s own window ("לצאת מהשלב?") takes the focus: the stage runs on under it', async () => {
    const { h, win } = focusHarness();
    const s = await start(FIND, h);
    const dialog = await renderHook(({ up }: { up: boolean }) => useModalWindow(up), {
      initialProps: { up: true },
    });
    try {
      win.blur();
      expect(s.pause).toEqual({ kind: 'none' });
      expect(s.getView().status).toBe('running');
      win.focus();
      expect(s.pause).toEqual({ kind: 'none' });
      // The dialog gone, a blur is the app's again.
      await dialog.rerender({ up: false });
      win.blur();
      expect(s.pause).toEqual({ kind: 'paused' });
    } finally {
      await dialog.unmount();
    }
  });

  it('not with LEVEL_UI.backgroundPause off; and a closed stage stops listening', async () => {
    const off = focusHarness();
    off.h.deps.settings = { ...LEVEL_UI, backgroundPause: false };
    const s = await start(FIND, off.h);
    off.win.blur();
    expect(s.pause).toEqual({ kind: 'none' });
    expect(off.win.listening()).toBe(false);
    const on = focusHarness();
    const t = await start(FIND, on.h);
    expect(on.win.listening()).toBe(true);
    t.close();
    expect(on.win.listening()).toBe(false);
  });

  it("by default: React Native’s AppState on Android, none on iOS (its 'inactive' comes in time)", async () => {
    const listen = jest.spyOn(AppState, 'addEventListener');
    let os: jest.ReplaceProperty<typeof Platform.OS> | null = null;
    try {
      const focusTypes = () =>
        listen.mock.calls.map(([type]) => type).filter((type) => type === 'blur' || type === 'focus');
      await start(FIND, harness());
      expect(focusTypes()).toEqual([]);
      os = jest.replaceProperty(Platform, 'OS', 'android');
      await start(FIND, harness());
      expect(focusTypes()).toEqual(['blur', 'focus']);
    } finally {
      os?.restore();
      listen.mockRestore();
    }
  });
});

describe('[D65] Android 13+: no Recents picture while a stage runs (QA levels-freeze-background)', () => {
  /** A fake services/recentsPicture: counts the holds; `hidden` says whether this Android has the switch. */
  function fakeRecents(hidden: boolean) {
    let held = 0;
    const hide = jest.fn(() => {
      held += 1;
      let released = false;
      return {
        hidden,
        release: () => {
          if (released) return;
          released = true;
          held -= 1;
        },
      };
    });
    return { hide, held: () => held };
  }

  /** A window focus that only says whether anyone listens. */
  function listenedFocus() {
    let listeners = 0;
    const source: WindowFocusSource = {
      currentState: 'active',
      addEventListener: () => {
        listeners += 1;
        return { remove: () => void (listeners -= 1) };
      },
    };
    return { source, listening: () => listeners > 0 };
  }

  it('held from the start to the close, whatever is on top ("לצאת מהשלב?" too); no freeze at the blur then', async () => {
    const recents = fakeRecents(true);
    const win = listenedFocus();
    const h = harness({ hideRecentsPicture: recents.hide, windowFocus: win.source });
    const s = await start(FIND, h);
    expect(recents.held()).toBe(1);
    // The picture is out of Recents already: the window's blur (the shade, a screenshot bar) freezes nothing.
    expect(win.listening()).toBe(false);
    // 'background' still freezes, as D65 says.
    h.app.set('background');
    expect(s.pause).toEqual({ kind: 'paused' });
    s.close();
    expect(recents.held()).toBe(0);
    s.close();
    expect(recents.held()).toBe(0);
  });

  it('the stage ending by itself lets the picture go at the close too', async () => {
    const recents = fakeRecents(true);
    const h = harness({ hideRecentsPicture: recents.hide, windowFocus: null });
    const s = await start(FIND, h);
    s.tap(answerOf(s));
    expect(s.over).not.toBeNull();
    s.close();
    expect(recents.held()).toBe(0);
  });

  it('where there is no switch (below Android 13, an older binary): the freeze at the blur instead', async () => {
    const recents = fakeRecents(false);
    const win = listenedFocus();
    const s = await start(FIND, harness({ hideRecentsPicture: recents.hide, windowFocus: win.source }));
    expect(recents.hide).toHaveBeenCalledTimes(1);
    expect(win.listening()).toBe(true);
    s.close();
    expect(win.listening()).toBe(false);
    expect(recents.held()).toBe(0);
  });

  it('not with LEVEL_UI.backgroundPause off; a hide that throws is reported, and the blur freeze stands', async () => {
    const recents = fakeRecents(true);
    const off = harness({ hideRecentsPicture: recents.hide, windowFocus: null });
    off.deps.settings = { ...LEVEL_UI, backgroundPause: false };
    await start(FIND, off);
    expect(recents.hide).not.toHaveBeenCalled();
    const win = listenedFocus();
    const onError = jest.fn();
    await start(
      FIND,
      harness({
        hideRecentsPicture: () => {
          throw new Error('no activity');
        },
        windowFocus: win.source,
        onError,
      }),
    );
    expect(onError).toHaveBeenCalledWith('could not hide the Recents picture', expect.any(Error));
    expect(win.listening()).toBe(true);
  });
});
