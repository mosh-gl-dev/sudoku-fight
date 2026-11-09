import type { Clock } from '@sudoku-fight/engine';
import { useEffect, useRef } from 'react';
import { type SharedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';

/**
 * The time of an interference on screen (spec §7.2: exactly 5 s). The effects never run a timer of their
 * own: where they are in their 5 s comes from the game's clock and the hit's `endsAt`, the same numbers the
 * engine (and later the server) uses to end it.
 */
export interface HitTime {
  /** When it ends, in the game's clock; null while the game is frozen (spec §16.2), then `remainingMs`. */
  endsAt: number | null;
  /** Time left while frozen (the view's `remainingMs`). Ignored while `endsAt` is set. */
  remainingMs?: number;
  /** Its whole length: the rules' `interferenceMs`. */
  totalMs: number;
  /**
   * Which hit it is, when known (HitInfo's seq, kind and sender): tells a new hit from the same one whose deadline
   * moved (a freeze), also when no frame came between the two (sameHit).
   */
  id?: number | null;
  kind?: string;
  fromId?: string;
}

/**
 * Whether `next` is the same hit as `prev`, with its deadline perhaps moved: the same kind, sender and length, and
 * the same id unless one of them is not known yet (the hit's event can reach the screen a render after its view).
 */
export function sameHit(prev: HitTime, next: HitTime): boolean {
  if (prev.kind !== next.kind || prev.fromId !== next.fromId || prev.totalMs !== next.totalMs) return false;
  return prev.id == null || next.id == null || prev.id === next.id;
}

/** Time left at `now`, never below 0. */
export function remainingOf(hit: HitTime, now: number): number {
  if (hit.endsAt === null) return Math.max(0, hit.remainingMs ?? 0);
  return Math.max(0, hit.endsAt - now);
}

/** How far into its `totalMs` the hit is at `now` (0 … totalMs). */
export function elapsedOf(hit: HitTime, now: number): number {
  return Math.min(hit.totalMs, Math.max(0, hit.totalMs - remainingOf(hit, now)));
}

/**
 * The effect's opacity at `elapsed`: in over `fadeIn` from its start, out over the last `fadeOut` before its
 * end, and 0 from the end on, so nothing of it is left at `endsAt`.
 */
export function hitAlpha(elapsed: number, total: number, fadeIn: number, fadeOut: number): number {
  'worklet';
  if (elapsed >= total) return 0;
  const enter = fadeIn > 0 ? Math.min(1, Math.max(0, elapsed) / fadeIn) : 1;
  const leave = fadeOut > 0 ? Math.min(1, (total - elapsed) / fadeOut) : 1;
  return Math.max(0, Math.min(enter, leave));
}

/**
 * A hit that reaches this phone at most this far into its time (the server's clock: the sender's tap, the trip
 * to the server and on to me, the commit that mounts it) is shown from its first frame, not from where the
 * server says it already is. Later than this (the app came back mid-hit), it is shown where it is.
 */
export const HIT_LATE_START_MS = 500;

/**
 * While a hit comes in (its fade-in, then the tilt's ease-in), its clock moves at most this much in one frame,
 * however long that frame took: the frame that mounts the hit's layers can take 150–230 ms on a phone (QA
 * measure of APK 17), and a step that long would land the fade-in at full strength in one frame.
 */
export const HIT_MAX_START_STEP_MS = 34;

/** How long "while a hit comes in" is: its fade-in (240 ms) and the tilt's ease-in after it. */
export const HIT_START_WINDOW_MS = 480;

/**
 * One frame of the hit's clock: from `shown` (where the hit was drawn last frame), `dt` ms of display time later,
 * with `left` ms of display time left until its end (`endsAt`) as of the last frame. It runs at the pace that
 * lands it on `total` exactly at the end, so a hit shown from 0 although it began a little earlier catches up
 * (a few % faster, unseen) and is still gone exactly at `endsAt` (spec §7.2). While it comes in, a long frame
 * counts for at most HIT_MAX_START_STEP_MS.
 */
export function hitClockStep(shown: number, total: number, dt: number, left: number): number {
  'worklet';
  if (shown >= total || left <= dt) return total;
  if (dt <= 0) return shown;
  const step = shown < HIT_START_WINDOW_MS ? Math.min(dt, HIT_MAX_START_STEP_MS) : dt;
  return Math.min(total, shown + ((total - shown) * step) / left);
}

/**
 * Where a hit is drawn from when it comes on: from 0 (its first frame on this phone) when it reached me early in
 * its time, else where it is (`serverElapsed`). A hit that comes in frozen is shown where it stands.
 */
export function hitStartAt(serverElapsed: number, frozen: boolean): number {
  return !frozen && serverElapsed <= HIT_LATE_START_MS ? 0 : serverElapsed;
}

/**
 * Where the hit is in its time, in ms (0 … totalMs), on the UI thread: a shared value the effects read in
 * their worklets, so nothing re-renders per frame (spec §22: 60 fps).
 *
 * A hit that has just come on starts from 0 on its first frame here, whatever the server's clock says (QA measure
 * of APK 17: the receiver mounts a hit 150–230 ms after the sender's tap, and its first frame takes as long again,
 * so a clock read from the server was past the 240 ms fade-in by the first frame anyone saw: the dim, the banner
 * and the overlay each popped in at full strength, whenever each happened to reach the screen). From there it
 * follows the display's frames (hitClockStep: one frame callback, no JS timer) at the pace that ends it exactly at
 * `endsAt`, and a long frame while it comes in counts for little. When the deadline moves while it is on (a
 * freeze), it goes on from where it is. While the game is frozen (`endsAt` null) it stands still. The React side
 * ends the effect by `now >= endsAt`; the worklets reach their end on the same instant.
 */
export function useHitClock(hit: HitTime | null, clock: Clock): SharedValue<number> {
  const elapsed = useSharedValue(0);
  const left = useSharedValue(0);
  const last = useSharedValue(-1);
  const total = useSharedValue(0);
  const drawing = useRef<HitTime | null>(null);

  const frame = useFrameCallback((info) => {
    'worklet';
    const ts = info.timestamp;
    const prev = last.get();
    last.set(ts);
    // The first frame anchors the end on the display's timeline; nothing has been drawn of the hit yet.
    if (prev < 0) return;
    const dt = ts - prev;
    const shown = elapsed.get();
    const remaining = left.get();
    elapsed.set(hitClockStep(shown, total.get(), dt, remaining));
    left.set(Math.max(0, remaining - dt));
  }, false);

  const on = hit !== null;
  const endsAt = hit?.endsAt ?? null;
  const frozenLeft = hit && hit.endsAt === null ? Math.max(0, hit.remainingMs ?? 0) : 0;
  const totalMs = hit?.totalMs ?? 0;
  const id = hit?.id ?? null;
  const kind = hit?.kind;
  const fromId = hit?.fromId;

  useEffect(() => {
    if (!on) {
      drawing.current = null;
      frame.setActive(false);
      // Back to the start, so the next hit's first frames never read where this one ended (its end, where the
      // banner, the dim and the ring's number would show as over until the next start lands; QA loop 8).
      elapsed.set(0);
      return;
    }
    const time: HitTime = { endsAt, remainingMs: frozenLeft, totalMs, id, kind, fromId };
    // A new hit, also one that follows another with no frame between them (the app was in the background).
    const fresh = drawing.current === null || !sameHit(drawing.current, time);
    drawing.current = time;
    const now = clock.now();
    total.set(totalMs);
    left.set(remainingOf(time, now));
    last.set(-1);
    // A new hit starts from its first frame here; a moved deadline (a freeze) goes on from where it is drawn.
    if (fresh) elapsed.set(hitStartAt(elapsedOf(time, now), endsAt === null));
    frame.setActive(endsAt !== null && remainingOf(time, now) > 0);
    return () => frame.setActive(false);
  }, [on, endsAt, frozenLeft, totalMs, id, kind, fromId, clock, frame, elapsed, left, last, total]);

  return elapsed;
}

/**
 * The clock a hit's layer reads: the screen's one clock for the hit (`shared`, from useHitClock), or its own.
 * On the game screen every layer of a hit (the board's dim, the overlay, the banner, the warp's tilt) reads the
 * same one, so they start in the same frame and move together (QA fixcheck of APK 14: with sound on the dim
 * showed ~170 ms before the warp's overlay and banner, with sound off ~80 ms after them: four clocks, each
 * started and anchored on its own). Without `shared` (a layer alone, the tests, the gallery) its own runs.
 */
export function useLayerHitClock(
  hit: HitTime | null,
  clock: Clock,
  shared: SharedValue<number> | undefined,
): SharedValue<number> {
  const own = useHitClock(shared ? null : hit, clock);
  return shared ?? own;
}
