import type { MatchPhase } from '../net/matchmaking';

/**
 * The screen of what the game store still holds under way (QA "density-change-orphans-ranked-game"): a ranked or
 * friends game, a ranked search, a practice. Null when nothing is.
 *
 * Android recreates the activity on a configuration change the manifest does not list (display size, font size,
 * bold text…), and React Native starts a new React root in the same JS runtime. The game store is the same one
 * (a module), with the live game in it and its connection coming back by itself; but the new root starts at
 * Home. A root that starts with something under way starts on its screen instead (app/+native-intent.tsx),
 * and a start from Home never leaves a live online game behind (screens/home/startGame.ts): a "Play" there
 * used to leave its room on purpose, which the server ends as abandonment (a loss).
 *
 * - An online game (ranked or with friends) not over and not closed: a friends room before its start is its
 *   lobby (its 3… 2… 1… too); a ranked match before its board is the match screen (its VS, 3… 2… 1…); anything else is the game.
 * - A ranked search still going (not failed or called off): the match screen.
 * - A practice not over: the game.
 */
export type LiveFlowPath = '/game' | '/match' | '/friends/room';

/** The parts of the game store read here (game/gameStore.ts; plain objects in tests). */
export interface LiveFlowSources {
  session: { getView(): { status: string } } | null;
  online: {
    readonly hasGame: boolean;
    readonly isFriends: boolean;
    getView(): { status: string };
    readonly online: { readonly status: string };
  } | null;
  match: { readonly info: { readonly phase: MatchPhase } } | null;
}

/** A search not over: the match screen still has something to show. */
const SEARCH_GOING: readonly MatchPhase[] = [
  'connecting',
  'searching',
  'timeout',
  'found',
  'countdown',
  'started',
];

/** An online game still on: its connection not closed, its game not over. */
export function isLiveOnline(online: NonNullable<LiveFlowSources['online']>): boolean {
  if (online.online.status === 'closed') return false;
  return !(online.hasGame && online.getView().status === 'over');
}

export function liveFlowPathOf({ session, online, match }: LiveFlowSources): LiveFlowPath | null {
  if (online && isLiveOnline(online)) {
    if (online.isFriends && !online.hasGame) return '/friends/room';
    if (!online.hasGame && match) return '/match';
    return '/game';
  }
  if (match && SEARCH_GOING.includes(match.info.phase)) return '/match';
  if (session && session.getView().status !== 'over') return '/game';
  return null;
}
