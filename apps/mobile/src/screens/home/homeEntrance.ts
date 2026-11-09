/**
 * Home's entrance (MOT-3): the first time Home is seen in a run of the app, its parts come in (the profile
 * card rises, "שחק" settles, "עוד סיבוב" and the recent games follow). Coming back to Home (from a game, the
 * modes, another tab) shows it as it is: the choreography plays once per run, not on every return.
 */

/** When each part of Home starts, ms after Home is first in view. */
export const HOME_ENTRANCE = {
  card: 0,
  play: 120,
  again: 180,
  recentHeader: 220,
  /** The first recent row; the rest follow `listStagger` apart. */
  recent: 260,
} as const;

let played = false;

/** Whether the entrance is still to play in this run of the app. */
export function homeEntrancePending(): boolean {
  return !played;
}

/** It has played (Home was in view with it). */
export function markHomeEntrancePlayed(): void {
  played = true;
}

/** Tests: a fresh run of the app. */
export function resetHomeEntrance(): void {
  played = false;
}
