import { useEffect, useRef, useState } from 'react';

/**
 * Never delete a view a worklet just moved in the frame that draws new SVG (docs/PERF.md, B14/B32, QA run #3).
 *
 * On Android, Reanimated 4.5 keeps the last props of every view a worklet style moved until 2 s after its last
 * frame (its settled-props sync runs every 500 ms on the JS thread), and applies them all again for each layout
 * event react-native-svg sends when it draws a shape for the first time. A view deleted while it is still kept
 * fails each time, with an exception and its stack trace in the log (about 1 ms each), until the frame is over.
 * A move's flash on a cell went exactly as the mover's avatar finished its nod and drew its still picture
 * (both at 900 ms): ~230 failures a move. Two ways out, both here:
 * - keep the view, at rest and unseen, until Reanimated has let go of it (`useRetired`, RETIRE_MS), as AvatarArt
 *   keeps its layers (LAYERS_RETIRE_MS);
 * - or delete it first and draw the new shapes a couple of frames later (`afterFrames`, SWAP_FRAMES), as the pirates
 *   lab does: the results after the game, a list swapped for another (History's filters and "נסה שוב", the
 *   leaderboard's tabs).
 * Every animated style counts, not only one that moved: Reanimated writes each one once as its view mounts
 * (ViewDescriptorsSet.add, updater(true)), so a card's press or an entrance is held its first ~2 s too.
 */

/** How long a part that moved stays after it goes: past Reanimated's 2 s (+ its 500 ms poll), with room for a busy JS thread. */
export const RETIRE_MS = 4000;

/**
 * What was `current` before and no longer is, each kept RETIRE_MS (oldest first), so the caller draws it at rest
 * and unseen, as the same element (same key), instead of deleting it. One that becomes `current` again comes back
 * as it is. Derived during render (as AvatarArt's stacks): the part that goes and what replaces it are one commit;
 * React runs the component's function a second time for it, with no commit of its own.
 */
export function useRetired<T>(current: T | null, keyOf: (item: T) => string | number): readonly T[] {
  const [last, setLast] = useState(current);
  const [retired, setRetired] = useState<readonly T[]>([]);
  const currentKey = current === null ? null : keyOf(current);
  const lastKey = last === null ? null : keyOf(last);
  if (currentKey !== lastKey) {
    setLast(current);
    if (last !== null) setRetired((list) => [...list.filter((x) => keyOf(x) !== lastKey), last]);
  }
  // Each kept item's timer, by key; made on first use, and emptied with the timers it stops (effects that run
  // again without an unmount, Fast Refresh or a hidden Activity shown again, start them again).
  const timers = useRef<Map<string | number, { item: T; timer: ReturnType<typeof setTimeout> }> | null>(null);
  useEffect(() => {
    const live = (timers.current ??= new Map());
    for (const item of retired) {
      const key = keyOf(item);
      if (live.get(key)?.item === item) continue;
      // Kept again (it came back and went again): its time starts over.
      if (live.has(key)) clearTimeout(live.get(key)!.timer);
      live.set(key, {
        item,
        timer: setTimeout(() => {
          live.delete(key);
          setRetired((list) => list.filter((x) => x !== item));
        }, RETIRE_MS),
      });
    }
  }, [retired, keyOf]);
  useEffect(
    () => () => {
      timers.current?.forEach(({ timer }) => clearTimeout(timer));
      timers.current = null;
    },
    [],
  );
  return currentKey === null ? retired : retired.filter((x) => keyOf(x) !== currentKey);
}

/**
 * The frames between deleting what a screen showed and drawing what replaces it (`afterFrames`, `framesPassed`):
 * the deletion is mounted in one, and Reanimated lets go of the deleted views after it (its mount hook); two leave
 * room for a frame that was already on its way.
 */
export const SWAP_FRAMES = 2;

/** A promise of `afterFrames`: resolves once `frames` frames have gone by. */
export function framesPassed(frames: number): Promise<void> {
  return new Promise((resolve) => {
    afterFrames(frames, resolve);
  });
}

/**
 * Runs `run` once `frames` frames have gone by (each requestAnimationFrame comes with a frame of the UI thread,
 * after it mounted the commits before it); returns what cancels it.
 */
export function afterFrames(frames: number, run: () => void): () => void {
  let id = 0;
  let cancelled = false;
  const next = (left: number) => {
    id = requestAnimationFrame(() => {
      if (cancelled) return;
      if (left > 1) next(left - 1);
      else run();
    });
  };
  next(frames);
  return () => {
    cancelled = true;
    cancelAnimationFrame(id);
  };
}
