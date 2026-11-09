import { GAME_TYPES, type GameType } from '@sudoku-fight/engine';
import { isQueueKey, type QueueKey } from '@sudoku-fight/protocol';
import Storage from 'expo-sqlite/kv-store';
import { type Href, router } from 'expo-router';
import { AppState } from 'react-native';

import { useAuth } from '../auth/authStore';
import type { OnlineErrorCode } from '../net/errors';
import type { RemoteGameHost } from '../net/remoteGameHost';
import { useGameStore } from './gameStore';
import { isLiveOnline, liveFlowPathOf } from './liveFlow';
import type { OnlineProfile, OnlineProfiles, OnlineSession } from './onlineSession';

/**
 * Back into a ranked game the app was taken out of (QA "density-change-orphans-ranked-game", and the review of
 * loop 8; spec §16.2: the game is kept on the server, and the app reconnects by itself).
 *
 * - The app's process killed in the game (swiped away, Android closing it in the background, a crash), or the
 *   JS reloaded: the game store is gone, and so is the room's reconnection token. The server holds the seat
 *   until the grace runs out, and gives it back to the same account joining the room by its id (GameRoom
 *   holdSeat, loop 8). So the phone keeps "the ranked game I am in": the room's id, its game type, the account,
 *   and the players' public cards for the loading card (never a token). At the next start, on Home, the app
 *   joins that room again, quietly: the game opens once the room took it back; a room that is gone or over
 *   (it closes a minute after its end) is forgotten, and Home stays. A seat the server has not seen go yet
 *   (`alreadyInRoom`), or no network for a moment, is tried again a few times within the grace.
 * - The activity recreated (display size, font size, bold text…) with the JS alive: the store still holds the
 *   game, and its connection comes back by itself; the new root starts on its screen (game/liveFlow.ts,
 *   app/+native-intent.tsx), and should it start on Home all the same, the start sends it there.
 *
 * Kept while the store holds a ranked game that is not over (its time refreshed whenever the app leaves the
 * foreground); forgotten once the phone is out of it: the end seen (the app does not go back into a game whose
 * end it saw, §16.2), left on purpose, given up on, or another account. Friends rooms have their own way back
 * (auth/pendingInvite.ts "the current room").
 */

export interface RankedGameRecord {
  /** The match room's id (its code: GameRoom roomIdIsCode); a join by it with the same account takes the seat. */
  roomId: string;
  gameType: GameType;
  /** The match's queue (its type and players): the results' "משחק חדש" searches there again. */
  queueKey: QueueKey | null;
  /** The account (Firebase uid) in the game: another account signed in on this phone does not go back to it. */
  owner: string;
  /** When the phone was last in it (epoch ms). */
  at: number;
  /** The players' public cards as "found" gave them (avatars, names, ratings), for the loading card. */
  profiles: OnlineProfiles | null;
}

export const RANKED_RESUME = {
  /** Past this, a record is not tried at all (no game lasts this long; a room past its end is gone anyway). */
  maxAgeMs: 2 * 60 * 60_000,
  /** Waits before each new try when the seat is still held for the dead connection, or no answer came. */
  retryDelaysMs: [2_000, 4_000, 8_000, 12_000] as readonly number[],
};

/** Refusals worth another try: the server has not seen the old connection go yet, or no answer came. */
const RETRY_ON: readonly OnlineErrorCode[] = ['alreadyInRoom', 'network'];

const STORAGE_KEY = 'ranked-game';
const ROOM_ID = /^[A-Za-z0-9_-]{1,64}$/;

// ---------------------------------------------------------------------------------------------------------
// The record on the phone

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const shortText = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;

function sanitizeProfile(raw: unknown): OnlineProfile | null {
  if (!isRecord(raw)) return null;
  const profile: OnlineProfile = {
    avatarId: shortText(raw.avatarId, 32) ? raw.avatarId : null,
    country: shortText(raw.country, 8) ? raw.country : null,
  };
  if (shortText(raw.name, 64)) profile.name = raw.name;
  if (typeof raw.rating === 'number' && Number.isFinite(raw.rating)) profile.rating = raw.rating;
  if (typeof raw.provisional === 'boolean') profile.provisional = raw.provisional;
  return profile;
}

/** What was saved, kept only when it is what this file writes. */
export function sanitizeRankedGame(raw: unknown): RankedGameRecord | null {
  if (!isRecord(raw)) return null;
  const { roomId, gameType, queueKey, owner, at, profiles } = raw;
  if (typeof roomId !== 'string' || !ROOM_ID.test(roomId)) return null;
  if (!(GAME_TYPES as readonly unknown[]).includes(gameType)) return null;
  if (typeof owner !== 'string' || owner.length === 0 || owner.length > 128 || !isTime(at)) return null;
  let cards: Record<string, OnlineProfile> | null = null;
  if (isRecord(profiles)) {
    cards = {};
    for (const [id, card] of Object.entries(profiles).slice(0, 4)) {
      const profile = sanitizeProfile(card);
      if (profile && id.length <= 64) cards[id] = profile;
    }
  }
  return {
    roomId,
    gameType: gameType as GameType,
    queueKey: isQueueKey(queueKey) ? queueKey : null,
    owner,
    at,
    profiles: cards,
  };
}

export function readRankedGame(): RankedGameRecord | null {
  try {
    const raw = Storage.getItemSync(STORAGE_KEY);
    return raw ? sanitizeRankedGame(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeRankedGame(record: RankedGameRecord): void {
  try {
    Storage.setItemSync(STORAGE_KEY, JSON.stringify(record));
  } catch (error) {
    if (__DEV__) console.warn('[ranked] could not keep the game for a restart', error);
  }
}

export function forgetRankedGame(): void {
  try {
    if (Storage.getItemSync(STORAGE_KEY) !== null) Storage.removeItemSync(STORAGE_KEY);
  } catch {
    // Nothing to do: a record that stays is tried once and then forgotten.
  }
}

/** The ranked game to go back to at a start, for this account. */
export function rankedToResumeOf(
  record: RankedGameRecord | null,
  owner: string | null,
  now: number,
): RankedGameRecord | null {
  if (!record || owner === null || record.owner !== owner) return null;
  const age = now - record.at;
  return age >= 0 && age < RANKED_RESUME.maxAgeMs ? record : null;
}

/**
 * The store's online game as a record to keep: a ranked one (a match's room, or one joined again by its id)
 * that is not over, whose room is known, with someone signed in. Null for anything else (a friends room, a dev
 * room created here, nothing).
 */
export function rankedRecordOf(
  online: OnlineSession | null,
  owner: string | null,
  now: number,
): RankedGameRecord | null {
  if (!online || owner === null || online.isFriends || online.request.kind === 'create') return null;
  // (Optional only for the stand-ins of some screens' tests, which hold no host.)
  const roomId = (online.host as RemoteGameHost | undefined)?.roomCode ?? null;
  if (roomId === null || !ROOM_ID.test(roomId) || !isLiveOnline(online)) return null;
  return {
    roomId,
    gameType: online.gameType,
    queueKey: online.queueKey,
    owner,
    at: now,
    profiles: online.profiles,
  };
}

/** A ranked game whose end this phone saw (§16.2: never gone back into). */
const endSeen = (online: OnlineSession | null): boolean =>
  online !== null && !online.isFriends && online.hasGame && online.getView().status === 'over';

// ---------------------------------------------------------------------------------------------------------
// Following the store

type GameStore = typeof useGameStore;

export interface FollowRankedDeps {
  store: GameStore;
  owner: () => string | null;
  now: () => number;
}

const appFollowDeps = (): FollowRankedDeps => ({
  store: useGameStore,
  owner: () => useAuth.getState().user?.uid ?? null,
  now: Date.now,
});

/**
 * Keeps "the ranked game I am in" with the game store: kept when in one, its time refreshed whenever the app
 * leaves the foreground, forgotten once the phone is out of it. Nothing is forgotten at the start (no game in
 * the store yet): that is the one to go back to. Returns the unsubscribe function.
 */
export function followRankedGame(deps: FollowRankedDeps = appFollowDeps()): () => void {
  const { store, owner, now } = deps;
  let watched: OnlineSession | null = null;
  let unwatch: (() => void) | null = null;
  /** The session whose record is on the phone. */
  let kept: OnlineSession | null = null;

  const check = () => {
    const online = store.getState().online;
    if (online !== watched) {
      unwatch?.();
      watched = online;
      unwatch = online ? online.subscribeOnline(check) : null;
    }
    const record = rankedRecordOf(online, owner(), now());
    if (record) {
      if (kept !== online) writeRankedGame(record);
      kept = online;
    } else if (kept !== null || endSeen(online)) {
      // Out of it; or the end of a game joined again after it had ended (the room shows it for a minute).
      kept = null;
      forgetRankedGame();
    }
  };

  const unsubscribeStore = store.subscribe(check);
  check();
  const appState = AppState.addEventListener('change', (state) => {
    if (state === 'active' || kept === null) return;
    const record = rankedRecordOf(kept, owner(), now());
    if (record) writeRankedGame(record);
  });
  return () => {
    unsubscribeStore();
    unwatch?.();
    appState.remove();
  };
}

// ---------------------------------------------------------------------------------------------------------
// Going back

export interface ResumeDeps {
  store: GameStore;
  /** A RemoteGameHost that has joined nothing yet (the phone's: net/device.ts deviceHost). */
  makeHost: () => RemoteGameHost;
  /** Opens a screen over the current one. */
  navigate: (path: string) => void;
  now: () => number;
  schedule: (run: () => void, ms: number) => void;
}

type Device = typeof import('../net/device');
/* eslint-disable @typescript-eslint/no-require-imports -- the network SDK, only once there is a game to join */
const deviceHost = (): RemoteGameHost => (require('../net/device') as Device).deviceHost();
/* eslint-enable @typescript-eslint/no-require-imports */

let resumeOverrides: Partial<ResumeDeps> | null = null;

/** Tests: the joins' host, the clock, the scheduler … in place of the phone's (null: the phone's again). */
export function setRankedResumeDeps(next: Partial<ResumeDeps> | null): void {
  resumeOverrides = next;
}

const appResumeDeps = (): ResumeDeps => ({
  store: useGameStore,
  makeHost: deviceHost,
  navigate: (path) => router.push(path as Href),
  now: Date.now,
  schedule: (run, ms) => void setTimeout(run, ms),
  ...resumeOverrides,
});

/**
 * Into the ranked game of `roomId` again, with the same account (the room takes the seat it holds for it):
 * a new online session in the store, at once. The caller opens the game screen, whose connecting and refusal
 * screens show how it goes (the match screen's "back to the game", after an `alreadyQueued`).
 */
export function rejoinRankedGame(
  game: Pick<RankedGameRecord, 'roomId' | 'gameType' | 'queueKey'> & { profiles?: OnlineProfiles | null },
  deps: Pick<ResumeDeps, 'store' | 'makeHost'> = appResumeDeps(),
): OnlineSession {
  const { roomId: code, gameType, queueKey, profiles = null } = game;
  const request = { kind: 'join', code, gameType, ...(queueKey ? { queueKey } : {}) } as const;
  return deps.store.getState().startOnline(request, deps.makeHost, profiles);
}

/** A start's quiet join under way (resumeAtStart), and whether its game screen is open already. */
let quietJoin: { shown: boolean } | null = null;

/**
 * The game screen of the store's live online game was opened another way (Home's "Play" during a start's quiet
 * join: screens/home/startGame.ts): the join, once in, does not open a second one over it (the review of this
 * fix: two game screens on one session, and its results opened twice).
 */
export function noteLiveGameShown(): void {
  if (quietJoin) quietJoin.shown = true;
}

/**
 * At a start, on Home, signed in as `owner` (auth/useAuthGate.ts, once per root): back to what is under way.
 * - The store still holds a game, a search or a practice (a recreated activity whose root started on Home all
 *   the same): its screen.
 * - Else a ranked game kept on the phone for this account: its room is joined again, quietly; the game opens
 *   once the room took it back (see above).
 * Returns whether it went anywhere (or is on its way).
 */
export function resumeAtStart(owner: string | null, deps: ResumeDeps = appResumeDeps()): boolean {
  const { store } = deps;
  const live = liveFlowPathOf(store.getState());
  if (live) {
    deps.navigate(live);
    return true;
  }
  const record = rankedToResumeOf(readRankedGame(), owner, deps.now());
  if (!record) return false;
  const join = { shown: false };
  quietJoin = join;
  const done = () => {
    if (quietJoin === join) quietJoin = null;
  };
  let tries = 0;
  const attempt = () => {
    const session = rejoinRankedGame(record, deps);
    void session.ready.then(() => {
      // Something else started meanwhile (a practice, a search, a room): it is the player's now.
      if (store.getState().online !== session) return done();
      const info = session.online;
      if (info.status !== 'closed') {
        done();
        // Opened already (the player's "Play" on Home brought it up): one game screen, not two.
        if (!join.shown) deps.navigate('/game');
        return;
      }
      const delay = RANKED_RESUME.retryDelaysMs[tries];
      const code = info.error?.code;
      if (delay !== undefined && code !== undefined && RETRY_ON.includes(code)) {
        tries++;
        deps.schedule(() => {
          if (store.getState().online === session) attempt();
          else done();
        }, delay);
        return;
      }
      // The room is gone, over, or will not take this account: nothing to go back to. Quietly, unless the game
      // screen is open on it already: there, its refusal screen says so, with its way out.
      done();
      forgetRankedGame();
      if (!join.shown) store.getState().clear();
    });
  };
  attempt();
  return true;
}
