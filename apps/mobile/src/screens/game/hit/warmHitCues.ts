import type { InterferenceKind } from '@sudoku-fight/engine';
import { useEffect } from 'react';

import { preloadCues } from '../../../services/feedback';
import { useSettings } from '../../../state/settings';
import { hitWarmCues, warmGameLater } from '../../match/warmGame';

/**
 * The interference sounds' players, made on idle moments once a game with interferences is up (QA loop 8,
 * interference-hit-warp-look). sfx makes a sound's player on its first play, and expo-audio builds it on the UI
 * thread while the JS thread waits (docs/PERF.md, "ההקשה הראשונה"; screens/match/warmGame.ts). The game screen
 * preloads only its own sounds (GAME_CUES), so the first hit of each kind built its player right as the hit
 * started: no frame and no JS while it was built, which fits the frozen frame without banner or dim that QA saw
 * at the start of a warp (the black frame before it is the warp's own: see WarpFrame), and the sender's first
 * launch paid the same. Now each is made ahead, one per idle moment (one short stall each, never several in a
 * row), after the board's entrance. With sound off nothing is made (nothing would play). The wait before the game
 * (the search, a friends room's lobby: screens/match/warmGame.ts) makes them first, so here, in the board's first
 * seconds, only what it had no time for (QA warp-standby-stalls, APK 21).
 */

/** After the board's entrance and the first moves' sounds; a hit can't come before the first points anyway. */
export const HIT_WARM_DELAY_MS = 1500;

export { hitWarmCues };

/** Starts the warm-up; returns what stops it (the screen went). */
export function warmHitCuesLater(
  kinds: readonly InterferenceKind[],
  delayMs: number = HIT_WARM_DELAY_MS,
): () => void {
  return warmGameLater(
    () =>
      hitWarmCues(kinds).map((name) => () => {
        if (useSettings.getState().sound) preloadCues([name]);
      }),
    delayMs,
  );
}

/** The game screen's part: warms the sounds while interferences are on in this game (never in a practice, D44). */
export function useWarmHitCues(rules: {
  interferences: boolean;
  interferenceKinds: readonly InterferenceKind[];
}) {
  const kinds = rules.interferences ? rules.interferenceKinds.join(',') : '';
  useEffect(() => (kinds ? warmHitCuesLater(kinds.split(',') as InterferenceKind[]) : undefined), [kinds]);
}
