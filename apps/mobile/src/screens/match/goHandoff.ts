import type { PlayerId } from '@sudoku-fight/engine';
import type { NativeStackNavigationOptions } from 'expo-router';

import type { FriendsLobby } from '../friends/friendsModel';
import type { MatchScreenModel } from './matchModel';

/**
 * GO! handed from the match screen to the game route (GoCover.tsx), and how that route comes in. Kept apart from
 * GoCover so the root layout can read it without loading the count's views at the start (startupGraph.test.ts).
 */

export type CountdownModel = Extract<MatchScreenModel, { kind: 'countdown' }>;

/**
 * A friends room's GO! (app/friends/room.tsx), handed over the moment GO! shows (or the game came, if sooner), not
 * after a hold (QA go-hold-joiner, loop 13: GO! held 250 ms on the room before the game screen even began its ~0.6 s
 * mount, so GO! → board was 1.1–1.34 s; loop 16: not after the game's arrival either, 17–189 ms after GO!): the
 * players, and when GO! was first shown (phone time, systemClock). The game mounts under it the moment it is here
 * (GoCover `waiting`), and GO! fades into it no sooner than motion.md's GO + 400 ms (GoCover).
 */
export interface FriendsGo {
  kind: 'friendsGo';
  lobby: FriendsLobby;
  myId: PlayerId | null;
  shownAt: number;
}

/** GO! as a screen handed it over: a ranked match's count, or a friends room's. */
export type HandedGo = CountdownModel | FriendsGo;

/** What the match screen (or the friends room) handed over as it opened the game: GO! as it was drawn. */
let handed: HandedGo | null = null;

/** The match screen or the friends room, as it opens the game: what to keep on screen; null, nothing. */
export function handGoCover(model: HandedGo | null): void {
  handed = model;
}

/** What the game route opens on (read as it first renders; it then calls handGoCover(null)). */
export function handedGoCover(): HandedGo | null {
  return handed;
}

/**
 * How the game route comes in over a handed GO! (QA loop 6, apk10-go-to-board-no-empty-frame: in 3 ranked games of
 * 4, ~80 ms of nothing but the wandering digits as the match screen gave way to the game, then GO! faded in from
 * 0). The game used to *replace* the match screen with the stack's own fade (`flow.fade`): on Android
 * react-native-screens fades the new screen in from 0 over 150 ms while the old one fades out, and the old one's
 * content is not reliably there for it: its removal transition (Screen.startRemovalTransition) is posted to the UI
 * thread from the mounting thread (NativeProxy.notifyScreenRemoved), and when the batch that removes the match
 * screen's views runs first, they are gone at once. Whether it does is a race, hence 3 of 4.
 *
 * So the game is now *pushed* over the match screen, which stays whole under it until it is covered and only then
 * leaves the history (app/match/index.tsx, dropWhenCovered), and it comes in at once ('none'; the new screen's
 * animation even for a replace: 'push'). GoCover's first frame is that same GO!, drawn where the match screen
 * drew it, opaque from its first frame: what is under it is the same picture. The fade that matters, GO! to the
 * board, is GoCover's own (and with Reduced Motion its shorter one). Nothing moves in the cut.
 */
export const GO_HANDOFF_TRANSITION: Pick<
  NativeStackNavigationOptions,
  'animation' | 'animationTypeForReplace'
> = {
  animation: 'none',
  animationTypeForReplace: 'push',
};

/**
 * The game routes (by key) and whether each came in over a handed GO!, decided as each is first drawn and kept:
 * the navigator reads a screen's options on every render, and the game route lets go of the GO! (handGoCover(null))
 * as it mounts, before the native stack has played its transition (the route's own setOptions renders the
 * navigator again at once). Only the last few are kept (one game route at a time).
 */
const cutRoutes = new Map<string, boolean>();
const KEPT_ROUTES = 8;

/**
 * The game route's transition, read as the navigator draws (the root layout's options for /game, with the route's
 * key): for a route that came in over a handed GO!, the cut above, for as long as it is there; else the flow's own.
 */
export function gameRouteTransition<T extends object>(
  flow: T,
  routeKey: string,
): T | (T & typeof GO_HANDOFF_TRANSITION) {
  let cut = cutRoutes.get(routeKey);
  if (cut === undefined) {
    cut = handed !== null;
    cutRoutes.set(routeKey, cut);
    if (cutRoutes.size > KEPT_ROUTES) cutRoutes.delete(cutRoutes.keys().next().value!);
  }
  return cut ? { ...flow, ...GO_HANDOFF_TRANSITION } : flow;
}
