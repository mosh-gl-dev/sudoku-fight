import type { GameView } from '@sudoku-fight/engine';

import { motion } from '../../theme/motion';

/**
 * The game's start (motion.md §4.6 `go`, MOT-6, BRD-8): "the board appears for all players at once: cards
 * first, then the board (rises 24 px and fades in), then the keypad, staggered 60 ms" (tokens
 * motion.sequence.matchFound.revealStagger).
 *
 * The cards come in with the screen itself (the `flow.fade` that brings the game in), so the board follows one
 * stagger after them, and the keypad one more. matchFound.boardRevealAt (GO + 400) is spent before the game
 * screen opens: "GO!" holds on the countdown until the game is here (CountdownView), so nothing here waits on
 * top of it. Online every player's screen opens at the server's start, so everyone sees the same reveal.
 *
 * It never delays play: only transform and opacity move, the digits read within the first ~150 ms, and every
 * tap goes through from the first frame. Reduced Motion: none, the board is there at once (Enter).
 */
export const BOARD_REVEAL = {
  /** How far the board rises, dp (motion.md `go`). */
  rise: 24,
  /** The board's wait after the screen opens, ms (one `revealStagger` after the cards). */
  boardAt: motion.sequence.matchFound.revealStagger,
  /** The keypad's, ms. */
  keypadAt: 2 * motion.sequence.matchFound.revealStagger,
  /** How far the keypad rises, dp (list.enter's). */
  keypadRise: 12,
} as const;

/**
 * Whether the game on screen is a fresh one, to reveal: still to be played (not over), with no digit on the
 * board from anyone (no solved cell, no wrong digit) and not frozen. A game the screen comes back to (a
 * reconnect, the app back from the background, a frozen practice's "3, 2, 1" [D65]) is shown as it is.
 */
export function isFreshGame(view: Pick<GameView, 'status' | 'owner' | 'wrong' | 'pausedAt'>): boolean {
  if (view.status === 'over' || view.status === 'paused' || view.pausedAt !== null) return false;
  return view.owner.every((o) => o === null) && view.wrong.every((w) => w.length === 0);
}
