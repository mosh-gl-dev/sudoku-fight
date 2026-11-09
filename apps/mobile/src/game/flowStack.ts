import { useNavigationContainerRef, useRootNavigationState } from 'expo-router';
import { useEffect } from 'react';

import { shownResultOf } from '../levels/shownResult';
import type { LiveFlowPath } from './liveFlow';

/**
 * The screens under a flow that a recreated activity brings back (QA "cancel-after-recreate-skips-type-screen").
 *
 * Android recreates the activity on a configuration change the manifest does not list (display size, font
 * size, bold text…), and the new React root starts on the screen of what the game store still holds
 * (app/+native-intent.tsx, game/liveFlow.ts): '/match' for a search, '/game', '/friends/room'. That screen
 * alone: the screens the player came through (Home, "משחק חדש", "סוג משחק") were the old root's. So "ביטול
 * חיפוש" (a back to the previous screen) had nothing under it, and the search's screen, Home or "משחק חדש"
 * took the place of "סוג משחק".
 *
 * The root's navigation state is kept here on every change (module state: it outlives the root). A new root
 * that started on a live flow's screen puts the old root's screens back under it, once its navigation is
 * ready: the same stack as before the recreation, its own screen untouched (the same route, so the same React
 * instance: a search or a seat is never left by a remount).
 *
 * And every other screen (QA "levels-map-recreate-lands-home"): a new root with nothing under way starts on
 * Home, so the player on the level map, "משחק חדש", the settings or the history came back on Home, with no way
 * back (Android's back left the app). A new root that started on Home while the old one was on another screen
 * gets the old root's stack back: the same screens, with their params, over its own Home (the same route, so
 * the same React instance). Screens that start something as they mount (NOT_RESTORED) never come back: the
 * player lands on the screen under them (a stage's result does come back: levels/shownResult.ts).
 *
 * And the start's own way back (auth/useAuthGate.ts): a root that started on a live flow, or that gets the old
 * root's screens back, is not on Home, even while its first route info still reads as the root (on Android the
 * first URL comes asynchronously, and expo-router's route info is empty until the first change), so it never
 * pushes a screen of its own over them.
 */

/** A route as the navigation state holds it (the parts read here). */
export interface FlowRoute {
  key: string;
  name: string;
  params?: object;
  state?: FlowNavState;
}

/** A navigator's state (the parts read here; the rest is kept as it is). */
export interface FlowNavState {
  key?: string;
  index?: number;
  routes: readonly FlowRoute[];
  [other: string]: unknown;
}

/** The route of each live flow's screen. */
const ROUTE_OF: Readonly<Record<LiveFlowPath, string>> = {
  '/game': 'game',
  '/match': 'match/index',
  '/friends/room': 'friends/room',
};

/** Home's route (app/index.tsx): where a root with nothing under way starts. */
const HOME = 'index';

/**
 * Screens never put back by a new root: each starts or joins something of its own as it mounts (a search's
 * screen opens the game at its GO, a room's screen and a link's room enter a room, the results read a game, a
 * stage's route starts its stage, unless it shows its result: see comesBack()).
 */
const NOT_RESTORED: readonly string[] = [
  'game',
  'match/index',
  'friends/room',
  'friends/join',
  'room/[code]',
  'results/[id]',
  'levels/play',
];

/**
 * Whether a route of the old root comes back. A stage's route does while it shows its result (levels/
 * shownResult.ts): it then shows that result again, and never starts its stage.
 */
function comesBack(route: FlowRoute): boolean {
  if (!NOT_RESTORED.includes(route.name)) return true;
  if (route.name !== 'levels/play') return false;
  const id = (route.params as { id?: unknown } | undefined)?.id;
  return shownResultOf(route.key, typeof id === 'string' ? id : undefined) !== null;
}

let kept: FlowNavState | null = null;
let startedOn: LiveFlowPath | null = null;
/** The root starting now gets the old root's screens over its Home (noted at its first URL). */
let restoringHome = false;

/** The root's navigation state, as it is now (every change). */
export function keepFlowStack(state: FlowNavState | null | undefined): void {
  if (state) kept = state;
}

/**
 * The first screen of the root starting now: a live flow's (app/+native-intent.tsx), or null (Home, or a
 * link's screen). With null and an old root that was on another screen than Home, its screens come back.
 */
export function noteFlowStart(path: LiveFlowPath | null): void {
  startedOn = path;
  restoringHome = path === null && kept !== null && homeStackOf(kept) !== null;
}

/**
 * Whether the root starting now is not on Home for the start's own way back (auth/useAuthGate.ts): it started
 * on a live flow, or the old root's screens come back over its Home.
 */
export function startedOffHome(): boolean {
  return startedOn !== null || restoringHome;
}

/** The navigators from the root down to the focused route's (the innermost one last). */
function focusedChain(state: FlowNavState): FlowNavState[] {
  const chain: FlowNavState[] = [state];
  for (;;) {
    const nav = chain[chain.length - 1]!;
    const route = nav.routes[nav.index ?? nav.routes.length - 1];
    if (!route?.state || route.state.routes.length === 0) return chain;
    chain.push(route.state);
  }
}

const focusedOf = (nav: FlowNavState): FlowRoute | undefined =>
  nav.routes[nav.index ?? nav.routes.length - 1];

/**
 * The state `current` (a new root on `path`'s screen, alone in its navigator) with the screens that were under
 * that screen in `before` (the old root's, on the same screen) put back under it; null when there is nothing
 * to put back, or the two are not the same flow. Pure.
 */
export function restoredFlowState(
  current: FlowNavState,
  before: FlowNavState | null,
  path: LiveFlowPath,
): FlowNavState | null {
  if (!before) return null;
  const name = ROUTE_OF[path];
  const now = focusedChain(current);
  const then = focusedChain(before);
  if (now.length !== then.length) return null;
  // The same navigators down to the screen: the same route names along the way.
  for (let i = 0; i < now.length - 1; i++)
    if (focusedOf(now[i]!)?.name !== focusedOf(then[i]!)?.name) return null;
  const stack = now[now.length - 1]!;
  const old = then[then.length - 1]!;
  const screen = focusedOf(stack);
  if (!screen || screen.name !== name || stack.routes.length !== 1) return null;
  if (focusedOf(old)?.name !== name) return null;
  const below = old.routes.slice(0, old.index ?? old.routes.length - 1).filter(comesBack);
  if (below.length === 0) return null;
  // The new root's own screen stays as it is (its key: the same React instance).
  return rewrapped(now, { ...stack, routes: [...below, screen], index: below.length });
}

/** `stack` in place of the innermost navigator of `chain` (a focused chain), the navigators over it kept. */
function rewrapped(chain: readonly FlowNavState[], stack: FlowNavState): FlowNavState {
  let rebuilt = stack;
  for (let i = chain.length - 2; i >= 0; i--) {
    const nav = chain[i]!;
    const at = nav.index ?? nav.routes.length - 1;
    const inner = rebuilt;
    rebuilt = { ...nav, routes: nav.routes.map((r, j) => (j === at ? { ...r, state: inner } : r)) };
  }
  return rebuilt;
}

/**
 * The screens of `before` (an old root's state) a new root on Home gets back: its stack up to the screen it
 * showed, without the ones that start something as they mount, from Home up. Null when that is Home alone, or
 * the stack did not start at Home (the sign-in's screens: the auth gate's).
 */
function homeStackOf(before: FlowNavState): FlowRoute[] | null {
  const old = focusedChain(before).at(-1)!;
  const upTo = old.routes.slice(0, (old.index ?? old.routes.length - 1) + 1).filter(comesBack);
  return upTo.length > 1 && upTo[0]!.name === HOME ? upTo : null;
}

/**
 * The state `current` (a new root on Home, alone in its navigator) with the screens `before` (the old root's)
 * showed over Home put back over it (QA "levels-map-recreate-lands-home"): the same screens, each with its
 * params, the one the player was on focused. Null when there is nothing to put back, or the two roots'
 * navigators differ. Pure.
 */
export function restoredHomeState(current: FlowNavState, before: FlowNavState | null): FlowNavState | null {
  if (!before) return null;
  const now = focusedChain(current);
  const then = focusedChain(before);
  if (now.length !== then.length) return null;
  for (let i = 0; i < now.length - 1; i++)
    if (focusedOf(now[i]!)?.name !== focusedOf(then[i]!)?.name) return null;
  const stack = now[now.length - 1]!;
  const home = focusedOf(stack);
  if (!home || home.name !== HOME || stack.routes.length !== 1) return null;
  const screens = homeStackOf(before);
  if (!screens) return null;
  // The new root's own Home stays as it is (its key: the same React instance).
  const routes = [home, ...screens.slice(1)];
  return rewrapped(now, { ...stack, routes, index: routes.length - 1 });
}

/** The parts of expo-router's container ref used here. */
interface FlowContainerRef {
  isReady(): boolean;
  getRootState(): unknown;
  resetRoot(state?: never): void;
  addListener(type: 'state' | 'ready', callback: () => void): () => void;
}

/**
 * The root layout's part (app/_layout.tsx): once its navigation is ready, a root that started on a live flow
 * gets the screens under it back (see above); then every change of its state is kept for the next root.
 */
export function useFlowStack(): void {
  const ref = useNavigationContainerRef() as unknown as FlowContainerRef;
  const ready = Boolean(useRootNavigationState()?.key);
  useEffect(() => {
    if (!ready) return;
    let stopKeeping: (() => void) | null = null;
    const start = () => {
      if (stopKeeping) return;
      const path = startedOn;
      const now = ref.getRootState() as FlowNavState | undefined;
      const restored = !now
        ? null
        : path
          ? restoredFlowState(now, kept, path)
          : restoringHome
            ? restoredHomeState(now, kept)
            : null;
      if (restored) ref.resetRoot(restored as never);
      // Nothing came back over Home after all (the navigators differ): the root is on Home for the start's own
      // way back, when the auth gate decides after this (it usually does: it waits for the sign-in too).
      if (!path) restoringHome = restored !== null;
      keepFlowStack(restored ?? now);
      stopKeeping = ref.addListener('state', () =>
        keepFlowStack(ref.getRootState() as FlowNavState | undefined),
      );
    };
    // The layout's first effect may come before the container's own (its `ready`).
    const stopWaiting = ref.isReady() ? null : ref.addListener('ready', start);
    if (!stopWaiting) start();
    return () => {
      stopWaiting?.();
      stopKeeping?.();
    };
  }, [ready, ref]);
}

/** Tests: nothing kept, no start noted. */
export function resetFlowStackForTests(): void {
  kept = null;
  startedOn = null;
  restoringHome = false;
}
