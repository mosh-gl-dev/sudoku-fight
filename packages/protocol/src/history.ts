import {
  type EndReason,
  GAME_MODES,
  type GameEvent,
  type GameMode,
  type GameType,
  isGameType,
  type PlayerStatus,
} from '@sudoku-fight/engine';

import {
  avatarIdForCatalog,
  type AvatarId,
  type CountryCode,
  isAvatarId,
  isCountryCode,
  NO_AVATAR_ID,
  normalizeAvatarId,
} from './account';

/**
 * Game history and replays over HTTP (spec §13, §14.1, §19, §21; work plan stage 11): the contract between
 * the app's history and replay screens and the server, which keeps every ranked game with its full event log.
 * Practice games never reach the server [D25]: the app merges them in from the phone.
 *
 * Who is calling: `Authorization: Bearer <Firebase ID token>` (or `dev:<uid>` outside production), as for the
 * account routes (./account.ts).
 *
 * Routes (JSON; times are epoch ms):
 *   GET /v1/me/games?cursor=…   → 200 HistoryPage. The caller's finished games on the server, newest first,
 *                                  HISTORY_PAGE_SIZE at a time; `nextCursor` asks for the page after (null:
 *                                  that was the last one). The cursor is opaque: send back what came.
 *                                  `&rated=1`: the rated games only (HISTORY_RATED_PARAM).
 *   GET /v1/games/:id/replay    → 200 ReplayAnswer: the game and its whole event log, solution included
 *                                  (gameCreated carries it). Only for a player of that game, and only once
 *                                  it is over (spec §21: the solution never leaves the server mid-game).
 *                                  404 notFound: no such game, or the caller did not play in it (the same
 *                                  answer, so ids can't be probed) · 409 notFinished: still being played (or
 *                                  its end is still being written: try again in a moment).
 * Every route may answer: 400 badRequest (a bad cursor or id) · 401 unauthorized (refresh the token and try
 * once more) · 404 notRegistered (the sign-in has no account) · 429 tooManyRequests (wait Retry-After
 * seconds) · 503 disabled (no Firebase project on this server) or unavailable (tokens can't be checked now)
 * · 500 internal. Answers are personal: `Cache-Control: no-store`.
 */

export const HISTORY_PATHS = {
  myGames: '/v1/me/games',
  /** The route pattern; replayPath() builds one. */
  replay: '/v1/games/:id/replay',
} as const;

export const replayPath = (gameId: string): string => `/v1/games/${encodeURIComponent(gameId)}/replay`;

/** Spec §14.1: "טעינה הדרגתית, 20 משחקים בכל פעם". */
export const HISTORY_PAGE_SIZE = 20;

/**
 * `GET /v1/me/games?rated=1` (QA loop 18, history-ranked-more): only the games that can move a rating, without
 * the friends rooms' ones (HistoryGame.friends), a page at a time, so the app's "מדורג" filter pages through
 * them alone and not through every friends game in between. A server before it ignores the parameter and sends
 * every game: the app leaves the friends games out itself either way.
 */
export const HISTORY_RATED_PARAM = 'rated';

/** The path of a page of my games: after `cursor` (null: the first page), only the rated ones when `rated`. */
export function myGamesPath(cursor: string | null, rated = false): string {
  const query = [
    ...(rated ? [`${HISTORY_RATED_PARAM}=1`] : []),
    ...(cursor === null ? [] : [`cursor=${encodeURIComponent(cursor)}`]),
  ];
  return query.length === 0 ? HISTORY_PATHS.myGames : `${HISTORY_PATHS.myGames}?${query.join('&')}`;
}

/** A game id the routes take: the server's UUIDs (and short ids in tests). */
export const GAME_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

// ---------------------------------------------------------------------------------------------------------
// Answers

/** A seat of a game, as the history card and the replay show it. */
export interface HistoryPlayer {
  seat: number;
  /** users.id (also the player's id in the game's events); null for a seat without an account (a bot). */
  userId: string | null;
  /** Null for a deleted account, or a seat without one. */
  displayName: string | null;
  /** Null when the player has none (or the account was deleted). */
  avatarId: AvatarId | null;
  country: CountryCode | null;
  /** The final numbers (spec §6.7); null while a game has not ended. */
  score: number | null;
  mistakes: number | null;
  place: number | null;
  status: PlayerStatus;
  /** The rating this game moved (spec §11.1), before and after; all null when it moved none for this seat. */
  ratingKey: string | null;
  ratingBefore: number | null;
  ratingAfter: number | null;
}

export interface HistoryGame {
  id: string;
  mode: GameMode;
  gameType: GameType;
  playerCount: number;
  startedAt: number;
  endedAt: number | null;
  endReason: EndReason | null;
  /** The caller's seat in it. */
  mySeat: number;
  /** In seat order. */
  players: HistoryPlayer[];
  /**
   * A game played in a friends room (1.0.4, friends.ts; games.mode 'friends' on the server): no rating moved
   * [D81a], so every seat's rating fields are null, and the app labels it "משחק עם חברים · בלי דירוג". It comes
   * as mode 'ranked', because an app before 1.0.4 refuses an unknown mode and with it the whole page
   * (isHistoryGame); the app's "ranked" filter leaves out the games with friends: true. Absent: false.
   */
  friends?: boolean;
}

export interface HistoryPage {
  games: HistoryGame[];
  nextCursor: string | null;
}

export interface ReplayAnswer {
  game: HistoryGame;
  /** In seq order, from gameCreated (with the solution) to gameOver. */
  events: GameEvent[];
}

export const HISTORY_ERROR_CODES = [
  'badRequest',
  'unauthorized',
  'notRegistered',
  'notFound',
  'notFinished',
  'tooManyRequests',
  'internal',
  'disabled',
  'unavailable',
] as const;
export type HistoryErrorCode = (typeof HISTORY_ERROR_CODES)[number];

export interface HistoryError {
  error: HistoryErrorCode;
  message?: string;
}

// ---------------------------------------------------------------------------------------------------------
// The cursor (opaque to the app): the last game of a page, as "<startedAt ms>_<game id>".

export interface HistoryCursor {
  startedAt: number;
  id: string;
}

export const encodeHistoryCursor = ({ startedAt, id }: HistoryCursor): string => `${startedAt}_${id}`;

/** The cursor's parts, or null when `value` is not one this server made. */
export function decodeHistoryCursor(value: unknown): HistoryCursor | null {
  if (typeof value !== 'string') return null;
  const cut = value.indexOf('_');
  if (cut <= 0) return null;
  const ms = value.slice(0, cut);
  const id = value.slice(cut + 1);
  if (!/^\d{1,15}$/.test(ms) || !GAME_ID_PATTERN.test(id)) return null;
  return { startedAt: Number(ms), id };
}

// ---------------------------------------------------------------------------------------------------------
// Checks for the app (an answer it can't read is refused, never half-used)

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isNumOrNull = (v: unknown) => v === null || isNum(v);
const isStrOrNull = (v: unknown) => v === null || typeof v === 'string';
const PLAYER_STATUSES: readonly PlayerStatus[] = ['active', 'surrendered', 'abandoned'];
const END_REASONS: readonly EndReason[] = ['boardComplete', 'lastPlayerStanding', 'practiceEnded'];

export function isHistoryPlayer(v: unknown): v is HistoryPlayer {
  if (!isRecord(v)) return false;
  return (
    isNum(v.seat) &&
    isStrOrNull(v.userId) &&
    isStrOrNull(v.displayName) &&
    (v.avatarId === null || isAvatarId(v.avatarId)) &&
    (v.country === null || isCountryCode(v.country)) &&
    isNumOrNull(v.score) &&
    isNumOrNull(v.mistakes) &&
    isNumOrNull(v.place) &&
    PLAYER_STATUSES.includes(v.status as PlayerStatus) &&
    isStrOrNull(v.ratingKey) &&
    isNumOrNull(v.ratingBefore) &&
    isNumOrNull(v.ratingAfter)
  );
}

export function isHistoryGame(v: unknown): v is HistoryGame {
  if (!isRecord(v)) return false;
  return (
    typeof v.id === 'string' &&
    GAME_MODES.includes(v.mode as GameMode) &&
    isGameType(v.gameType) &&
    isNum(v.playerCount) &&
    isNum(v.startedAt) &&
    isNumOrNull(v.endedAt) &&
    (v.endReason === null || END_REASONS.includes(v.endReason as EndReason)) &&
    isNum(v.mySeat) &&
    (v.friends === undefined || typeof v.friends === 'boolean') &&
    Array.isArray(v.players) &&
    v.players.every(isHistoryPlayer) &&
    v.players.some((p: HistoryPlayer) => p.seat === v.mySeat)
  );
}

export function isHistoryPage(v: unknown): v is HistoryPage {
  return isRecord(v) && Array.isArray(v.games) && v.games.every(isHistoryGame) && isStrOrNull(v.nextCursor);
}

/** The shape of a stored event: seq, time and type (the engine checks the rest as it replays). */
const isEventLike = (v: unknown): boolean =>
  isRecord(v) && isNum(v.seq) && isNum(v.t) && typeof v.type === 'string';

export function isReplayAnswer(v: unknown): v is ReplayAnswer {
  if (!isRecord(v) || !isHistoryGame(v.game) || !Array.isArray(v.events)) return false;
  const first: unknown = v.events[0];
  return v.events.every(isEventLike) && isRecord(first) && first.type === 'gameCreated';
}

// ---------------------------------------------------------------------------------------------------------
// Avatars the app does not know (account.ts AVATAR_CATALOG_HEADER)

/** A seat's avatar as this app can show it: an old one as its replacement, one it does not know as none. */
const shownAvatar = (v: string): AvatarId | null => {
  const id = normalizeAvatarId(v);
  return id === NO_AVATAR_ID ? null : id;
};
/** A game as it came, with each seat's avatar id read through shownAvatar (the rest as it was). */
function withKnownAvatars(game: unknown): unknown {
  if (!isRecord(game) || !Array.isArray(game.players)) return game;
  return {
    ...game,
    players: game.players.map((p: unknown) =>
      isRecord(p) && typeof p.avatarId === 'string' ? { ...p, avatarId: shownAvatar(p.avatarId) } : p,
    ),
  };
}

/**
 * A history page from the server, or null. A seat whose avatar this app does not know (a newer app's, or one
 * of a newer catalog) shows no avatar: an app before this one refused the whole page over it.
 */
export function readHistoryPage(v: unknown): HistoryPage | null {
  const page = isRecord(v) && Array.isArray(v.games) ? { ...v, games: v.games.map(withKnownAvatars) } : v;
  return isHistoryPage(page) ? page : null;
}

/** A replay from the server, or null; its seats' avatars read as readHistoryPage reads them. */
export function readReplayAnswer(v: unknown): ReplayAnswer | null {
  const answer = isRecord(v) ? { ...v, game: withKnownAvatars(v.game) } : v;
  return isReplayAnswer(answer) ? answer : null;
}

/** A game as an app of that catalog can show it (the server's side): an avatar it does not know as none. */
export function historyGameForCatalog(game: HistoryGame, catalog: number): HistoryGame {
  return {
    ...game,
    players: game.players.map((p) => {
      if (p.avatarId === null) return p;
      const id = avatarIdForCatalog(p.avatarId, catalog);
      return id === p.avatarId ? p : { ...p, avatarId: id === NO_AVATAR_ID ? null : id };
    }),
  };
}
