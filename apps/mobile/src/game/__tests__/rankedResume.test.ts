import Storage from 'expo-sqlite/kv-store';

import { CODE, elapse, FakeTable, ME } from '../../net/testing/fakeServer';
import { RemoteGameHost } from '../../net/remoteGameHost';
import { createGameStore } from '../gameStore';
import {
  followRankedGame,
  forgetRankedGame,
  noteLiveGameShown,
  RANKED_RESUME,
  type RankedGameRecord,
  readRankedGame,
  resumeAtStart,
  sanitizeRankedGame,
} from '../rankedResume';

/**
 * The review of loop 8 and QA "density-change-orphans-ranked-game": after the app's process is killed mid ranked
 * game (or the JS reloaded), the server holds the seat until the grace runs out and gives it back to the same
 * account joining the room by its id (GameRoom holdSeat, loop 8), but the app kept nothing of the game and
 * started on Home: the game ran on without the player and was recorded as a loss. Now the phone keeps "the
 * ranked game I am in" (never a token), and the next start joins it again.
 */

const OWNER = 'fb-uid-1';
const NOW = 1_000_000;
const quietStore = () => createGameStore({ repo: async () => null, onlineTrack: () => undefined });

/** A ranked game under way on the fake server: joined by its room (as a match's room is), lobby, then GO. */
async function liveRankedGame() {
  const table = new FakeTable();
  const store = quietStore();
  store
    .getState()
    .startOnline({ kind: 'join', code: CODE, gameType: 'fast', queueKey: 'fast-2p' }, () => table.host, {
      [ME]: { avatarId: 'a01', country: 'IL', name: 'Moshe', rating: 1210 },
    });
  await elapse(table, 50);
  table.lobby();
  table.startGame();
  await elapse(table, 300);
  return { table, store };
}

/** The phone's process dies: no goodbye, nothing more from that host; the server sees the socket drop. */
async function killApp(table: FakeTable) {
  table.cutMe();
  table.host.close();
  await elapse(table, 100);
}

/** A new process's host on the same server. */
const newHost = (table: FakeTable) =>
  new RemoteGameHost({ client: table, clock: table.clock, scheduler: table.scheduler, appState: null });

const record = (over: Partial<RankedGameRecord> = {}): RankedGameRecord => ({
  roomId: CODE,
  gameType: 'fast',
  queueKey: 'fast-2p',
  owner: OWNER,
  at: NOW,
  profiles: null,
  ...over,
});
const keep = (r: RankedGameRecord) => Storage.setItemSync('ranked-game', JSON.stringify(r));

beforeEach(() => forgetRankedGame());

describe('"the ranked game I am in", kept on the phone', () => {
  it('is kept while the store holds the game, with no token; forgotten once its end is seen', async () => {
    const { table, store } = await liveRankedGame();
    const stop = followRankedGame({ store, owner: () => OWNER, now: () => NOW });
    expect(readRankedGame()).toEqual({
      roomId: CODE,
      gameType: 'fast',
      queueKey: 'fast-2p',
      owner: OWNER,
      at: NOW,
      profiles: { [ME]: { avatarId: 'a01', country: 'IL', name: 'Moshe', rating: 1210 } },
    });
    expect(Storage.getItemSync('ranked-game')).not.toMatch(/secret/);

    // The surrender (2 players: a loss at once): the end is seen, nothing to go back to.
    store.getState().online!.surrender();
    await elapse(table, 300);
    expect(store.getState().online!.getView().status).toBe('over');
    expect(readRankedGame()).toBeNull();
    stop();
  });

  it('left on purpose (the store let go of it): forgotten; a start with nothing in the store forgets nothing', async () => {
    keep(record({ roomId: 'OLD123' }));
    const empty = quietStore();
    const stopEmpty = followRankedGame({ store: empty, owner: () => OWNER, now: () => NOW });
    expect(readRankedGame()?.roomId).toBe('OLD123');
    stopEmpty();

    const { store } = await liveRankedGame();
    const stop = followRankedGame({ store, owner: () => OWNER, now: () => NOW });
    expect(readRankedGame()?.roomId).toBe(CODE);
    store.getState().clear();
    expect(readRankedGame()).toBeNull();
    stop();
  });

  it('reads back only what it writes', () => {
    expect(sanitizeRankedGame(record())).toEqual(record());
    expect(sanitizeRankedGame({ ...record(), roomId: 'no spaces' })).toBeNull();
    expect(sanitizeRankedGame({ ...record(), gameType: 'blitz' })).toBeNull();
    expect(sanitizeRankedGame({ ...record(), owner: '' })).toBeNull();
    // A record of before the queue was kept, or a bad queue: read, with no queue.
    expect(sanitizeRankedGame({ ...record(), queueKey: undefined })).toEqual(record({ queueKey: null }));
    expect(sanitizeRankedGame({ ...record(), queueKey: 'blitz-9p' })).toEqual(record({ queueKey: null }));
    expect(sanitizeRankedGame('x')).toBeNull();
  });
});

describe('the next start goes back into the game (app killed mid ranked game)', () => {
  it('the same game, the same seat: the room is joined again by its id, then the game screen opens', async () => {
    const { table, store: before } = await liveRankedGame();
    const stopBefore = followRankedGame({ store: before, owner: () => OWNER, now: () => NOW });
    const gameId = before.getState().online!.id;
    stopBefore();
    await killApp(table);

    // The new process: an empty store, the record on the phone.
    const store = quietStore();
    const navigate = jest.fn();
    const went = resumeAtStart(OWNER, {
      store,
      makeHost: () => newHost(table),
      navigate,
      now: () => NOW + 5_000,
      schedule: (run, ms) => void table.scheduler.setTimeout(run, ms),
    });
    expect(went).toBe(true);
    await elapse(table, 300);

    expect(table.calls.filter((c) => c.kind === 'join').map((c) => c.arg)).toEqual([CODE, CODE]);
    expect(navigate).toHaveBeenCalledWith('/game');
    const online = store.getState().online!;
    expect(online.hasGame).toBe(true);
    expect(online.id).toBe(gameId);
    expect(online.getView().status).toBe('running');
    expect(table.meAtServer?.connected).toBe(true);
    // The loading card had the players' cards before the snapshot.
    expect(online.profiles?.[ME]?.name).toBe('Moshe');
    // Still the match's queue: the results' "משחק חדש" searches there again (not the rooms screen).
    expect(online.queueKey).toBe('fast-2p');
  });

  it('the game opened meanwhile by a "Play" on Home: once in, no second game screen over it', async () => {
    const { table } = await liveRankedGame();
    keep(record());
    await killApp(table);
    const store = quietStore();
    const navigate = jest.fn();
    resumeAtStart(OWNER, {
      store,
      makeHost: () => newHost(table),
      navigate,
      now: () => NOW,
      schedule: (run, ms) => void table.scheduler.setTimeout(run, ms),
    });
    // Home's "Play" during the join (screens/home/startGame.ts) opened the game already.
    noteLiveGameShown();
    await elapse(table, 300);
    expect(store.getState().online?.hasGame).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('opened meanwhile, and the room is gone: the game screen keeps the refusal to show; the record is forgotten', async () => {
    const table = new FakeTable();
    keep(record({ roomId: 'GONE99' }));
    const store = quietStore();
    const navigate = jest.fn();
    resumeAtStart(OWNER, {
      store,
      makeHost: () => newHost(table),
      navigate,
      now: () => NOW,
      schedule: (run, ms) => void table.scheduler.setTimeout(run, ms),
    });
    noteLiveGameShown();
    await elapse(table, 200);
    expect(navigate).not.toHaveBeenCalled();
    expect(store.getState().online?.online.status).toBe('closed');
    expect(readRankedGame()).toBeNull();
  });

  it('the server has not seen the old connection go yet (alreadyInRoom): tried again, then in', async () => {
    const { table } = await liveRankedGame();
    keep(record());
    table.unnoticed = true;
    await killApp(table);
    const store = quietStore();
    const navigate = jest.fn();
    resumeAtStart(OWNER, {
      store,
      makeHost: () => newHost(table),
      navigate,
      now: () => NOW,
      schedule: (run, ms) => void table.scheduler.setTimeout(run, ms),
    });
    await elapse(table, 100);
    expect(navigate).not.toHaveBeenCalled();
    expect(store.getState().online?.online.error?.code).toBe('alreadyInRoom');
    table.notice();
    await elapse(table, RANKED_RESUME.retryDelaysMs[0]! + 300);
    expect(navigate).toHaveBeenCalledWith('/game');
    expect(store.getState().online?.hasGame).toBe(true);
  });

  it('back too late (the grace ran out, the room still shows the end): the end is shown, then forgotten', async () => {
    const { table } = await liveRankedGame();
    keep(record());
    await killApp(table);
    // The soft phase and the grace pass: abandonment, the game over at the server.
    await elapse(table, table.rules.softGraceMs! + table.rules.graceMs + 2_000, 100);
    expect(table.game?.state.status).toBe('over');

    const store = quietStore();
    const stop = followRankedGame({ store, owner: () => OWNER, now: () => NOW });
    const navigate = jest.fn();
    resumeAtStart(OWNER, {
      store,
      makeHost: () => newHost(table),
      navigate,
      now: () => NOW,
      schedule: (run, ms) => void table.scheduler.setTimeout(run, ms),
    });
    await elapse(table, 300);
    expect(navigate).toHaveBeenCalledWith('/game');
    expect(store.getState().online?.getView().status).toBe('over');
    expect(readRankedGame()).toBeNull();
    stop();
  });

  it('a room that is gone (the game ended and closed, a server restart): forgotten, Home stays', async () => {
    const table = new FakeTable();
    keep(record({ roomId: 'GONE99' }));
    const store = quietStore();
    const navigate = jest.fn();
    resumeAtStart(OWNER, {
      store,
      makeHost: () => newHost(table),
      navigate,
      now: () => NOW,
      schedule: (run, ms) => void table.scheduler.setTimeout(run, ms),
    });
    await elapse(table, 200);
    expect(navigate).not.toHaveBeenCalled();
    expect(store.getState().online).toBeNull();
    expect(readRankedGame()).toBeNull();
  });

  it('another account, or a record too old: nothing is tried', () => {
    const store = quietStore();
    const deps = {
      store,
      makeHost: () => {
        throw new Error('no join expected');
      },
      navigate: jest.fn(),
      now: () => NOW,
      schedule: () => undefined,
    };
    keep(record({ owner: 'someone-else' }));
    expect(resumeAtStart(OWNER, deps)).toBe(false);
    keep(record({ at: NOW - RANKED_RESUME.maxAgeMs }));
    expect(resumeAtStart(OWNER, deps)).toBe(false);
    expect(resumeAtStart(null, deps)).toBe(false);
    expect(deps.navigate).not.toHaveBeenCalled();
  });

  it('the store still holds a live game (a recreated activity on Home): its screen, no new join', async () => {
    const { store } = await liveRankedGame();
    const navigate = jest.fn();
    const went = resumeAtStart(OWNER, {
      store,
      makeHost: () => {
        throw new Error('no join expected');
      },
      navigate,
      now: () => NOW,
      schedule: () => undefined,
    });
    expect(went).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/game');
  });
});
