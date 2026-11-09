import { createContext, useContext } from 'react';

/**
 * Android's back while GO! is still on the game screen (QA fixcheck of APK 13, back-during-go-opens-surrender:
 * back a moment before the board showed opened "אתה בטוח שאתה רוצה להיכנע?" over GO!). From "found" on there is
 * no way out of a match but abandonment [D32], and back does nothing on the match screen; GO! on the game route
 * (GoCover) stands for that same screen, so back does nothing there either until GO! has faded into the board.
 *
 * GoCover's own back handler cannot do it alone: React Native asks the newest handler first, and the game screen
 * (mounted under GO!) registers its own as it mounts, after GoCover's. So the game's handlers ask this gate at the
 * press instead. A ref-like object, never a changing context value: lifting it renders nothing.
 * Kept apart from GoCover so the game screen reads it without loading the count's views.
 */
export interface GoCoverGate {
  /** GO! is still on screen (its cover, the game drawn under it, or GO!'s fade into the board). */
  covering(): boolean;
}

/** None (null): no GO! over this game (a practice, a room by code), back as it always was. */
export const GoCoverGateContext = createContext<GoCoverGate | null>(null);

/** GoCover's gate: covering from the start, until `lift()` (GO!'s fade has ended, or GoCover is gone). */
export function goCoverGate(): GoCoverGate & { lift(): void } {
  let covering = true;
  return {
    covering: () => covering,
    lift: () => {
      covering = false;
    },
  };
}

/** The GO! over this game, if any: its back handlers do nothing while `covering()` (read at the press). */
export function useGoCoverGate(): GoCoverGate | null {
  return useContext(GoCoverGateContext);
}
