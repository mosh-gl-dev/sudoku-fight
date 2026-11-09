import { idleBlinkDelayMs, MOTIONS, type NodePlan, type PropertyPlan } from '@sudoku-fight/avatars';
import { useEffect, useRef, useState } from 'react';

/**
 * How a stage avatar idles (AvatarArt `idle`): in beats, never in an endless loop. A rest (IDLE_BLINK_MS, 2.4-5.2
 * s), then one beat: a burst of its idle gimmicks (the calculator's keys tap, the kettle steams) for about
 * IDLE_BURST_MS, or a blink, by turns; then a rest again. The first beat comes soon, so a screen that opens
 * shows the character alive at once.
 *
 * Between two beats nothing moves. A moving view keeps telling Android's accessibility layer that the screen
 * changed, so a loop that never ends leaves the screen never quiet: uiautomator (our ADB tools, Google Play's
 * pre-launch crawler) waits for a quiet second and gives up, and the GPU never rests. A rest of 2.4 s or more
 * between beats gives both.
 */

/** About how long a burst of idle gimmicks plays: each loop repeats a whole number of times to come near it. */
export const IDLE_BURST_MS = 2400;
/** The wait before the first beat, after the stage starts idling. */
export const IDLE_FIRST_BEAT_MS = 800;

const BLINK_MS = MOTIONS.blink.durationMs;

/** How many times a looping property plays in one burst (a one-shot plays once). */
export function burstRepeats(p: PropertyPlan): number {
  if (!p.loop) return 1;
  const cycle = p.segments.reduce((sum, s) => sum + s.durationMs, 0);
  return cycle > 0 ? Math.max(1, Math.round(IDLE_BURST_MS / cycle)) : 1;
}

/** How long a burst of these gimmick plans lasts, ms; 0 when none of them moves (then the idle only blinks). */
export function burstSpanMs(plans: readonly NodePlan[]): number {
  let span = 0;
  for (const plan of plans)
    for (const p of plan.properties) {
      const cycle = p.segments.reduce((sum, s) => sum + s.durationMs, 0);
      span = Math.max(span, p.delayMs + cycle * burstRepeats(p));
    }
  return Math.ceil(span);
}

export interface IdleBeat {
  kind: 'burst' | 'blink';
  /** Counts the beats: a new one starts its gimmicks over. */
  n: number;
}

/** Beat n (from 1): odd ones burst when there is something to burst, the others blink. */
export function beatKind(n: number, burstMs: number): IdleBeat['kind'] {
  return burstMs > 0 && n % 2 === 1 ? 'burst' : 'blink';
}

/** While `active`: the beat playing now, else null (a rest). `burstMs` 0: blinks only. */
export function useIdleBeat(active: boolean, burstMs: number): IdleBeat | null {
  const [beat, setBeat] = useState<IdleBeat | null>(null);
  const count = useRef(0);
  useEffect(() => {
    if (!active) return;
    // A beat cut short when the avatar stopped idling is over.
    const reset = setTimeout(() => setBeat(null), 0);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const rest = (ms: number) => {
      timer = setTimeout(() => {
        count.current += 1;
        const kind = beatKind(count.current, burstMs);
        setBeat({ kind, n: count.current });
        timer = setTimeout(
          () => {
            setBeat(null);
            rest(idleBlinkDelayMs(Math.random()));
          },
          kind === 'burst' ? burstMs : BLINK_MS,
        );
      }, ms);
    };
    // Each new start opens with a burst: the count is even before it.
    if (count.current % 2 === 1) count.current += 1;
    rest(IDLE_FIRST_BEAT_MS);
    return () => {
      clearTimeout(reset);
      clearTimeout(timer);
    };
  }, [active, burstMs]);
  return active ? beat : null;
}
