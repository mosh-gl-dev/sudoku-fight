import type { GameType, PlayerId } from '@sudoku-fight/engine';
import {
  COUNTDOWN_MS,
  COUNTDOWN_STEPS,
  MATCH_RANGE,
  matchmakingRoomOf,
  parseQueueKey,
  type QueueKey,
} from '@sudoku-fight/protocol';

import { type AvatarIdOrNone, normalizeAvatarId } from '../../avatars';
import type { MatchmakingFailureCode, MatchmakingInfo } from '../../net/matchmaking';

/**
 * What the match screens show (work plan stage 9, spec §10; Match-Search, Match-Found, Match-Countdown,
 * Match-Timeout), as a pure function of the search (net/matchmaking.ts) and the time. No rules here: the
 * server matches, ranges and counts down; this only says which screen, and with what.
 *
 * - search: connecting, then searching: the search time, my rating, the range (rating ± range, as the server
 *   widens it; "keep searching" lifts the cap), the empty seats, and a line when a match fell through.
 *   `alone`: the server says nobody (not enough players, at a table of 3–4) this player could meet is
 *   searching now (`nextRange` null): the screen says so instead of the range, and offers a bot meanwhile.
 *   Never while connecting, nor with an older server that does not say.
 * - found: the VS: every player (me in P1's colour and ●, the others ▲ ■ ◆ in seat order), ready or still
 *   connecting (D37: connected = ready), whether we met lately.
 * - countdown: 3 · 2 · 1 · GO at the server's time (a count shown late runs faster: none skipped); after GO
 *   "GO!" holds until the board is here.
 * - timeout: how long it searched and in what range (spec §10: keep searching, a bot, home); `alone` when
 *   nobody else was searching at all.
 * - failed / cancelled / play: an error to show, a screen to leave, the game to open.
 */

export interface MatchHeader {
  gameType: GameType;
  players: number;
}

export interface RatingRange {
  low: number;
  high: number;
  /** Half-width: ratings within rating ± half. */
  half: number;
  /** "Keep searching": no cap. */
  extended: boolean;
  /** 0–1: how far the range has widened toward its cap (the bar's dashed ends). */
  widened: number;
}

/** A player at the table, as the VS and the countdown show them. */
export interface SeatModel {
  id: PlayerId;
  name: string;
  avatarId: AvatarIdOrNone;
  country: string | null;
  rating: number;
  provisional: boolean;
  isMe: boolean;
  /** The palette on this phone: me 0 (P1, ●), the others 1–3 in seat order. */
  colorIndex: number;
  ready: boolean;
}

/** Me while searching: the account's look, and the rating once the server said. */
export interface SelfModel {
  name: string | null;
  avatarId: AvatarIdOrNone;
  rating: number | null;
}

export type CountdownStep = 3 | 2 | 1 | 'go';

export type MatchScreenModel =
  | {
      kind: 'search';
      header: MatchHeader;
      /** Getting into the queue: no rating or range yet. */
      connecting: boolean;
      elapsedMs: number;
      me: SelfModel;
      range: RatingRange | null;
      /** Opponents still to find (1 in a 2-player queue). */
      openSeats: number;
      /** Back at the head of the queue after a match fell through. */
      requeued: boolean;
      /** Nobody else to meet is searching now (the server's nextRange is null). */
      alone: boolean;
    }
  | {
      kind: 'timeout';
      header: MatchHeader;
      elapsedMs: number;
      range: RatingRange | null;
      /** Nobody else to meet was searching at the timeout. */
      alone: boolean;
    }
  | {
      kind: 'found';
      header: MatchHeader;
      seats: SeatModel[];
      readyCount: number;
      allReady: boolean;
      rematch: boolean;
    }
  | {
      kind: 'countdown';
      header: MatchHeader;
      seats: SeatModel[];
      step: CountdownStep;
      /** Until GO (0 after it). */
      remainingMs: number;
    }
  | {
      kind: 'failed';
      header: MatchHeader;
      code: MatchmakingFailureCode;
      supportCode: string;
      /**
       * `alreadyQueued` over this account's ranked game still running: its room (the server names it), for
       * "back to the game" (QA density-change-orphans-ranked-game); null otherwise.
       */
      gameRoom?: string | null;
    }
  | { kind: 'cancelled' }
  /** The board is here: open the game. */
  | { kind: 'play' };

export function headerOf(queueKey: QueueKey): MatchHeader {
  const spec = parseQueueKey(queueKey);
  return { gameType: spec?.gameType ?? 'normal', players: spec?.players ?? 2 };
}

/** rating ± half, and how far it has widened toward the cap. */
export function rangeOf(rating: number, half: number, extended: boolean): RatingRange {
  const span = MATCH_RANGE.cap - MATCH_RANGE.initial;
  const widened = extended ? 1 : Math.min(1, Math.max(0, (half - MATCH_RANGE.initial) / span));
  return { low: rating - half, high: rating + half, half, extended, widened };
}

/** The seats in seat order, me in P1's colour and the others after it. */
export function seatsOf(info: MatchmakingInfo): SeatModel[] {
  const match = info.match;
  if (!match) return [];
  let next = 1;
  return match.players.map((p) => {
    const isMe = p.id === match.me;
    return {
      id: p.id,
      name: p.name,
      avatarId: normalizeAvatarId(p.avatarId),
      country: p.country,
      rating: p.rating,
      provisional: p.provisional,
      isMe,
      colorIndex: isMe ? 0 : next++,
      ready: match.ready.includes(p.id),
    };
  });
}

/** The shortest a digit of a late count is shown: below it, the first digits are left out. */
export const MIN_COUNTDOWN_STEP_MS = 250;

/** 3 · 2 · 1 by the second, then GO at `goAt`. */
export function countdownStep(remainingMs: number): CountdownStep {
  return countdownStepOver(remainingMs, COUNTDOWN_MS);
}

/**
 * The same over `spanMs`: how long the screen had for the count, from when it first showed it until GO (QA
 * B37). A count shown late (its message slow, the phone busy, the clock's sync off) runs its digits evenly over
 * what is left, so none is skipped and GO keeps the server's time; under MIN_COUNTDOWN_STEP_MS a digit, the
 * first ones are left out. A whole count (spanMs ≥ COUNTDOWN_MS) is countdownStep's, by the second.
 */
export function countdownStepOver(remainingMs: number, spanMs: number): CountdownStep {
  if (remainingMs <= 0) return 'go';
  const span = Math.min(COUNTDOWN_MS, Math.max(remainingMs, spanMs));
  const digits = Math.max(1, Math.min(COUNTDOWN_STEPS.length, Math.floor(span / MIN_COUNTDOWN_STEP_MS)));
  const step = Math.ceil((remainingMs / span) * digits);
  return step >= 3 ? 3 : step === 2 ? 2 : 1;
}

/**
 * A count first drawn this long after the render that showed it was held up: the phone was still busy drawing
 * that first frame (QA B37-still: up to 1.5 s on a Galaxy A16), so it runs from the frame instead. Within it (a
 * frame or two) the count keeps the server's whole seconds.
 */
export const COUNTDOWN_DRAW_SLACK_MS = 150;

/**
 * When the count started on screen, for matchScreenModel's `countdownSince`: the render that first showed it
 * (`renderedAt`), or its first drawn frame (`drawnAt`) when that came more than COUNTDOWN_DRAW_SLACK_MS later.
 * Not drawn yet: `now`, so the first digit holds until it has been seen (JS ticks keep running while the UI
 * thread draws, and a digit they move on is one nobody saw).
 */
export function countdownShownAt(renderedAt: number, drawnAt: number | null, now: number): number {
  if (drawnAt === null) return now;
  return drawnAt - renderedAt > COUNTDOWN_DRAW_SLACK_MS ? drawnAt : renderedAt;
}

/** m:ss, for the search time ("0:14", "1:00"). */
export function clockText(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** `countdownSince`: when the screen first showed the count (phone time); none: a whole count from now on. */
export function matchScreenModel(
  info: MatchmakingInfo,
  self: Omit<SelfModel, 'rating'>,
  now: number,
  countdownSince: number | null = null,
): MatchScreenModel {
  const header = headerOf(info.queueKey);
  switch (info.phase) {
    case 'connecting':
    case 'searching': {
      const search = info.search;
      return {
        kind: 'search',
        header,
        connecting: search === null,
        elapsedMs: search ? Math.max(0, now - search.startedAt) : 0,
        me: { ...self, rating: search?.rating ?? null },
        range: search ? rangeOf(search.rating, search.range, search.extended) : null,
        openSeats: Math.max(1, header.players - 1),
        requeued: info.fellThrough !== null || (search?.requeued ?? false),
        alone: search !== null && search.nextRange === null,
      };
    }
    case 'timeout': {
      const t = info.timeout;
      const rating = info.search?.rating;
      return {
        kind: 'timeout',
        header,
        elapsedMs: t?.elapsedMs ?? 0,
        range: t && rating !== undefined ? rangeOf(rating, t.range, t.extended) : null,
        alone: t?.nextRange === null,
      };
    }
    case 'found': {
      if (info.hasGame) return { kind: 'play' };
      const seats = seatsOf(info);
      const readyCount = seats.filter((s) => s.ready).length;
      return {
        kind: 'found',
        header,
        seats,
        readyCount,
        allReady: seats.length > 0 && readyCount === seats.length,
        rematch: info.match?.rematch ?? false,
      };
    }
    case 'countdown':
    case 'started': {
      if (info.hasGame) return { kind: 'play' };
      const goAt = info.match?.goAt ?? null;
      const remainingMs = info.phase === 'started' || goAt === null ? 0 : Math.max(0, goAt - now);
      const spanMs = goAt === null || countdownSince === null ? COUNTDOWN_MS : goAt - countdownSince;
      // Ready by now, whatever the last `ready` said: the countdown starts only when everyone is in.
      const seats = seatsOf(info).map((s) => ({ ...s, ready: true }));
      return { kind: 'countdown', header, seats, step: countdownStepOver(remainingMs, spanMs), remainingMs };
    }
    case 'failed':
      return {
        kind: 'failed',
        header,
        code: info.error?.code ?? 'unknown',
        supportCode: info.error?.supportCode ?? 'unknown',
        gameRoom: info.error ? matchmakingRoomOf(info.error.message) : null,
      };
    case 'cancelled':
      return { kind: 'cancelled' };
  }
}
