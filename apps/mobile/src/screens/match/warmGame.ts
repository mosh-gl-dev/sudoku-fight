import { INTERFERENCE_KINDS, type InterferenceKind } from '@sudoku-fight/engine';

import { type FeedbackCue, GAME_CUES, preloadCues } from '../../services/feedback';
import { whenIdle } from '../../services/startup';
import { useSettings } from '../../state/settings';
import { hitCue } from '../game/model';

/**
 * The first ranked game of a run, ready while searching (QA loop 2, K2: GO! stayed 1.75 s before the board in the
 * first ranked game after the launch, 1.0–1.1 s in every later one, on both phones). What only the first game paid:
 * - the sounds' players. sfx makes each sound's player on its first use and keeps it. The game screen makes the
 *   players of its sounds as it mounts (GameScreen: preloadCues(GAME_CUES), 11 sounds, 13 players), and the flow
 *   plays "matchFound" as the VS shows, "countdownBeat" with 3 · 2 · 1 and "go" with GO!. expo-audio builds each
 *   player on the UI thread while the JS thread waits for it (AudioModule: runBlocking on the main queue;
 *   docs/PERF.md, T3-FIRST-PLAY-SLOW): no frame and no JS until it is there. So the first game opened with ~13
 *   players built in a row, under GO!, and "go" itself built one as GO! was first drawn. Every later game found
 *   them made.
 * - the game screen's code (screens/game, which the route /game loads the first time it is shown).
 * The game type screen (where the player chooses, then taps "מצא יריב" or starts a practice) and the search (a
 * wait with nothing to draw but the radar) make them, one at a time on an idle moment (each a short stall, never
 * one long one), the game screen's sounds first. Each stops when its screen is covered or the search ends (found:
 * the VS, the count and GO! are drawn undisturbed; whatever is left is made as before, by the game screen). With
 * sound off, no player (nothing would play); turned on later, the game screen makes them.
 */

/** After the search screen is up (its fade in and the radar's start), before the first step. */
export const GAME_WARM_DELAY_MS = 400;

/** After the game type screen is up: its push (~250 ms) and its cards' staggered entrance (~360 ms) first. */
export const GAME_WARM_CHOICE_DELAY_MS = 700;

/** The flow's own sounds: the VS, 3 · 2 · 1 and GO!. */
export const MATCH_CUES: readonly FeedbackCue[] = ['matchFound', 'countdownBeat', 'go'];

/** One step of the warm-up: one player (or none), or the game screen's code. */
type Step = () => void;

function soundStep(name: FeedbackCue): Step {
  return () => {
    if (useSettings.getState().sound) preloadCues([name]);
  };
}

/** The game screen's code (the route /game loads it the first time it is shown). */
export function loadGameCode(): void {
  /* eslint-disable @typescript-eslint/no-require-imports -- lazy on purpose: only a search loads the game screen */
  require('../game');
  /* eslint-enable @typescript-eslint/no-require-imports */
}

/**
 * The steps, in order: the game screen's sounds first (13 players that land together as it mounts, under GO!),
 * then its code, then the flow's own three (one player each, as the VS, the "3" and GO! come, spread out). A search
 * found before the end still has the costliest part done. Each step is cheap once done (a player made is kept, a
 * module loaded is cached), so a second run (the game type screen's, then the search's) only goes on with the rest.
 */
export function warmGameSteps(): readonly Step[] {
  return [...GAME_CUES.map(soundStep), loadGameCode, ...MATCH_CUES.map(soundStep)];
}

/** The sounds an interference plays: the start of each kind this game allows, and the sender's picker and launch. */
export function hitWarmCues(kinds: readonly InterferenceKind[]): FeedbackCue[] {
  return [...new Set<FeedbackCue>([...kinds.map(hitCue), 'arsenalOpen', 'launch'])];
}

/**
 * A game with interferences (ranked, a friends room) also has their sounds (screens/game/hit/warmHitCues.ts). The
 * game screen made them on idle moments from 1.5 s after it mounted, one player each, right in the board's first
 * seconds (QA warp-standby-stalls, APK 21, sound on: stalls of 92 and 136 ms at +1.3 s after the board, 132 ms
 * during ExoPlayer's warm-up, 6–11 frames per 250 ms from +1.25 to +2.25 s; sound off, one of 53 ms). So the wait
 * before the game (the search, the room's lobby) makes them too, after everything the count and GO! need: every
 * kind (a room may narrow them, [D47]; a player too many costs nothing on screen), so the game screen finds them
 * made and makes only what the wait had no time for.
 */
function hitSteps(): Step[] {
  return hitWarmCues(INTERFERENCE_KINDS).map(soundStep);
}

/** The search's steps (a ranked game, with interferences): the first game's, then the interferences' sounds. */
export function warmRankedGameSteps(): readonly Step[] {
  return [...warmGameSteps(), ...hitSteps()];
}

/** A friends room's count: 3 · 2 · 1 and GO! (no VS). */
export const FRIENDS_COUNT_CUES: readonly FeedbackCue[] = ['countdownBeat', 'go'];

/**
 * A friends room's lobby (QA go-hold-long-on-joiner: on a phone that joined by a code or a link right after the app
 * started, GO! stayed ~2.1 s before the board, ~1.0 s in every later game). Such a phone never saw the game type
 * screen or a search, so the first game made its 13 players and loaded its code under GO!, as ranked's did before
 * QA K2. The same steps while the players wait in the lobby, the count's two players next, the interferences'
 * sounds last (QA warp-standby-stalls: not in the board's first seconds).
 */
export function warmFriendsGameSteps(): readonly Step[] {
  return [...GAME_CUES.map(soundStep), loadGameCode, ...FRIENDS_COUNT_CUES.map(soundStep), ...hitSteps()];
}

/**
 * Runs the warm-up from `delayMs` on (the screen's entrance first), a step per idle moment; returns what stops it
 * (the search is over, or the screen went or was covered). A step that fails is skipped: a head start only,
 * whatever failed fails again where it used to. Started by the game type screen (the last stop before a game or a
 * search, where the player chooses: QA K2's search could be short) and again by the search, for what is left.
 */
export function warmGameLater(
  makeSteps: () => readonly Step[] = warmGameSteps,
  delayMs: number = GAME_WARM_DELAY_MS,
): () => void {
  let steps: readonly Step[];
  try {
    steps = makeSteps();
  } catch {
    // A test's stand-in for the feedback service (only cue()): nothing to warm.
    return () => undefined;
  }
  let next = 0;
  let stopped = false;
  let stopIdle: (() => void) | null = null;
  const run = () => {
    stopIdle = null;
    if (stopped || next >= steps.length) return;
    try {
      steps[next++]!();
    } catch {
      // A head start only (sfx never throws; a test's stand-in for the feedback service may have no preloadCues).
    }
    stopIdle = whenIdle(run);
  };
  const timer = setTimeout(() => {
    stopIdle = whenIdle(run);
  }, delayMs);
  return () => {
    stopped = true;
    clearTimeout(timer);
    stopIdle?.();
  };
}
