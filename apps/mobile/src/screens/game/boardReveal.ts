import type { GameView } from '@sudoku-fight/engine';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { afterFrames, SWAP_FRAMES } from '../../components/ui/retire';
import { motion } from '../../theme/motion';
import { flowFadeMs } from '../../theme/flowFade';
import { useGoCoverGate } from '../match/goCoverGate';

/**
 * The game's start (motion.md §4.6 `go`, MOT-6, BRD-8): "the board appears for all players at once: cards
 * first, then the board (rises 24 px and fades in), then the keypad, staggered 60 ms" (tokens
 * motion.sequence.matchFound.revealStagger).
 *
 * The cards come in with the screen itself (the `flow.fade` that brings the game in), so the board follows them,
 * and the keypad one stagger after it: under GO! one stagger after the mount (BOARD_REVEAL), and with no GO! once
 * the screen's own fade is over (revealTimingOf, useBoardReveal). matchFound.boardRevealAt (GO + 400) is spent
 * before the game screen opens: "GO!" holds on the countdown until the game is here (CountdownView), so nothing
 * here waits on top of it. Online every player's screen opens at the server's start, so everyone sees the same
 * reveal.
 *
 * It never delays play: only transform and opacity move, the digits read within the first ~150 ms, and every
 * tap goes through from the first frame. Reduced Motion: none, the board is there at once (Enter).
 */
export const BOARD_REVEAL = {
  /** How far the board rises, dp (motion.md `go`). */
  rise: 24,
  /** The board's wait after the screen opens under GO!, ms (one `revealStagger` after the cards). */
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

/** When a fresh game's board and keypad start to come in (useBoardReveal). */
export interface RevealTiming {
  /** The board's wait, ms, from `play`. */
  boardAt: number;
  /** The keypad's, ms, from `play`. */
  keypadAt: number;
  /** The frames drawn before the waits start (0: at once, as the screen mounts). */
  frames: number;
}

/**
 * The reveal's timing (QA board-no-rise, APK 22: "the board shows up in its final place, with the whole screen's
 * fade, and does not move at all").
 *
 * With no GO! over the game (a practice, alone or against a bot; a room by code), the screen itself fades in as it
 * opens (`flow.fade`: Android's own 150 ms, iOS 240), and the `standard` curve spends 80 % of the board's rise in
 * its first 90 ms. One stagger after the mount, the rise was all but over before the screen was fully drawn, and a
 * slow first draw (the whole game at once, on the UI thread) took the rest. So the waits start once the screen's
 * first frames are drawn (SWAP_FRAMES), and the board starts as the screen's fade ends: the cards come in with that
 * fade, then the board rises 24 dp and fades in, then the keypad one `revealStagger` after it, all on a screen
 * already drawn in full. Taps go through from the first frame all the same.
 *
 * Under a ranked or friends GO! (GoCover, QA loops 13-16) it stays as it was: the game is drawn under GO! and GO!
 * fades into it, so the board's waits start as it mounts (BOARD_REVEAL), never later.
 */
export function revealTimingOf(underGo: boolean, os: typeof Platform.OS = Platform.OS): RevealTiming {
  if (underGo) return { boardAt: BOARD_REVEAL.boardAt, keypadAt: BOARD_REVEAL.keypadAt, frames: 0 };
  const boardAt = flowFadeMs(false, os);
  return { boardAt, keypadAt: boardAt + motion.sequence.matchFound.revealStagger, frames: SWAP_FRAMES };
}

/**
 * The reveal of the game screen (revealTimingOf), decided once as it mounts: its waits, and `play`, held false
 * until the screen's first frames are drawn (the board and the keypad keep their start meanwhile, unseen).
 * `reveal` false: nothing comes in, `play` is true at once and no frame is waited for.
 */
export function useBoardReveal(reveal: boolean): RevealTiming & { play: boolean } {
  const underGo = useGoCoverGate() !== null;
  const [timing] = useState(() => revealTimingOf(underGo));
  const [play, setPlay] = useState(() => !reveal || timing.frames === 0);
  useEffect(() => {
    if (play) return;
    return afterFrames(timing.frames, () => setPlay(true));
  }, [play, timing]);
  return { ...timing, play };
}
