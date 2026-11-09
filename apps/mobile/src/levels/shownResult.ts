import type { LevelPlayed } from '../screens/levels/LevelResultView';

/**
 * The stage's result on the screen now (QA "levels-map-recreate-lands-home"), for a recreated activity.
 *
 * A stage's result is a state of its route (app/levels/play.tsx), and that route starts its stage as it mounts,
 * so a new React root (a display or font size change) never re-creates it blindly (game/flowStack.ts). While a
 * result is up, it is kept here, by the key of the route that shows it (module state: it outlives the root).
 * The new root gets that route back, with the same key, and the route shows this result again in place of
 * starting the stage: the same screen, nothing played or stored a second time.
 *
 * Forgotten as the result is left ("לשלב הבא", "שוב", "למפה", Android's back). Never on the route's unmount:
 * a recreation unmounts the old root too. A route that went another way keeps a stale entry, which no other
 * route can match (route keys are not reused); the next result replaces it.
 */

interface ShownResult {
  routeKey: string;
  levelId: string;
  played: LevelPlayed;
}

let shown: ShownResult | null = null;

/** A stage's result just showed on the route `routeKey`. */
export function noteShownResult(routeKey: string, levelId: string, played: LevelPlayed): void {
  shown = { routeKey, levelId, played };
}

/** The result of the route `routeKey` was left (a button, Android's back). */
export function forgetShownResult(routeKey: string): void {
  if (shown?.routeKey === routeKey) shown = null;
}

/** The result the route `routeKey` showed for the stage `levelId`, while it is up; else null. */
export function shownResultOf(routeKey: string, levelId: string | undefined): LevelPlayed | null {
  return shown && shown.routeKey === routeKey && shown.levelId === levelId ? shown.played : null;
}

/** Tests: no result kept. */
export function resetShownResultForTests(): void {
  shown = null;
}
