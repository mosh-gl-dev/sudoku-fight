import { useEffect, useRef, useState } from 'react';
import {
  type AnimationObject,
  cancelAnimation,
  defineAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { easing, NEVER_REDUCE } from '../../../components/player/anim';
import { timing } from '../../../components/ui/motion';
import { systemClock } from '../../../game/clock';
import { motion } from '../../../theme/motion';
import { metrics } from './metrics';

/**
 * The motion of the connection UI (motion.md §4.8, §4.9). Each hook takes the reduced-motion decision
 * (useReduceMotion) and picks its reduced variant itself (motion.md §6): the information stays, the movement
 * goes. Countdowns are information, so their rings and bars drain with reduced motion too (in the components).
 */

export type EnterKind = 'fade' | 'scale' | 'drop';

/**
 * In on mount, 240 ms `standard`: a fade, a fade from 96 % (a centred card, components.md §14.2) or a 12 dp
 * drop (a banner, motion.md `toast`). Reduced motion: a 200 ms fade. `still`: there from the first frame (a
 * view that stands for one already on screen, as the game screen's GO! does for the count's).
 */
export function useEnter(reduce: boolean, kind: EnterKind = 'fade', still = false) {
  const shown = useSharedValue(still ? 1 : 0);
  useEffect(() => {
    if (still) return;
    shown.set(withTiming(1, timing(motion.duration.stateChange, 'standard', reduce)));
  }, [shown, reduce, still]);
  return useAnimatedStyle(() => {
    const v = shown.get();
    if (reduce || kind === 'fade') return { opacity: v };
    if (kind === 'scale') {
      return { opacity: v, transform: [{ scale: metrics.enterScale + (1 - metrics.enterScale) * v }] };
    }
    return { opacity: v, transform: [{ translateY: (v - 1) * metrics.bannerDrop }] };
  });
}

/**
 * A countdown's number as it changes (motion.md `countdown.tick`): 1.22 → 1 while 0.5 → 1 opaque, 320 ms.
 * Reduced motion: no scale, only the fade (200 ms). Never on the first render.
 */
export function useTick(value: number, reduce: boolean) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const last = useRef(value);
  useEffect(() => {
    if (last.current === value) return;
    last.current = value;
    const config = {
      duration: reduce ? motion.duration.reducedFade : metrics.tick.ms,
      easing: easing.standard,
      reduceMotion: NEVER_REDUCE,
    };
    opacity.set(metrics.tick.opacity);
    opacity.set(withTiming(1, config));
    if (!reduce) {
      scale.set(metrics.tick.from);
      scale.set(withTiming(1, config));
    }
  }, [value, reduce, opacity, scale]);
  return useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ scale: scale.get() }] }));
}

/**
 * A word that lands (motion.md §2: round 1's `sf-slam` → C): 1.4 → 1 on the `slam` spring as it fades in.
 * Reduced motion: a 200 ms fade. `still`: landed already, from the first frame (as useEnter's). A slam that
 * another screen takes over as it runs (the friends room's GO!): useSlamSince.
 */
export function useSlam(reduce: boolean, still = false) {
  const [from] = useState(() => slamAt(reduce, still ? Infinity : 0));
  const shown = useSharedValue(from.opacity);
  const scale = useSharedValue(from.scale);
  useEffect(() => {
    if (still) return;
    const fade = timing(motion.duration.stateChange, 'standard', reduce);
    const left = (fade.duration ?? 0) - from.sinceMs;
    if (left > 0) shown.set(withTiming(1, { ...fade, duration: left }));
    else shown.set(1);
    if (reduce || from.landed) {
      scale.set(1);
      return;
    }
    scale.set(withSpring(1, { ...motion.spring.slam, velocity: from.velocity, reduceMotion: NEVER_REDUCE }));
  }, [reduce, still, shown, scale, from]);
  return useAnimatedStyle(() => ({ opacity: shown.get(), transform: [{ scale: scale.get() }] }));
}

/** Past this a slam has landed: its scale is within 0.1 % of 1 (the `slam` spring, ≈ 530 ms to settle). */
const SLAM_LANDED_MS = 900;

/** The slam's fade curve (`standard`), a worklet: slamPose runs on the UI thread too. */
const SLAM_FADE_CURVE = Easing.bezierFn(...motion.easing.standard);
/** The `slam` spring and where it starts. */
const SLAM_SPRING = motion.spring.slam;
const SLAM_FROM = metrics.slamFrom;

/**
 * A slam `sinceMs` into its run (useSlam): its opacity (the `stateChange` fade, `standard`; reduced, the 200 ms
 * fade) and its scale with the scale's speed (the `slam` spring from `slamFrom`, a damped spring solved exactly,
 * per second, as withSpring's `velocity`). 0: it starts; Infinity: it has landed.
 */
export function slamAt(
  reduce: boolean,
  sinceMs: number,
): { sinceMs: number; opacity: number; scale: number; velocity: number; landed: boolean } {
  const since = Math.max(0, sinceMs);
  return { sinceMs: since, ...slamPose(since, slamFadeMs(reduce), reduce) };
}

/** The slam's fade: `stateChange` (240 ms); reduced motion, the 200 ms fade. */
const slamFadeMs = (reduce: boolean): number =>
  timing(motion.duration.stateChange, 'standard', reduce).duration ?? 0;

/** slamAt's pose, `since` ms in with a `fadeMs` fade: a worklet, for useSlamSince's frames. */
function slamPose(
  since: number,
  fadeMs: number,
  reduce: boolean,
): { opacity: number; scale: number; velocity: number; landed: boolean } {
  'worklet';
  const ms = Math.max(0, since);
  const opacity = ms >= fadeMs ? 1 : SLAM_FADE_CURVE(ms / fadeMs);
  const landed = reduce || ms >= SLAM_LANDED_MS;
  if (landed) return { opacity, scale: 1, velocity: 0, landed };
  const { mass, stiffness, damping } = SLAM_SPRING;
  const t = ms / 1000;
  const x0 = SLAM_FROM - 1;
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const a = zeta * w0;
  const decay = Math.exp(-a * t);
  if (zeta >= 1) {
    // Critically damped (or near it): x = x0 (1 + a t) e^(-a t).
    return {
      opacity,
      scale: 1 + x0 * (1 + a * t) * decay,
      velocity: -x0 * a * a * t * decay,
      landed,
    };
  }
  // Under-damped, from rest: x = x0 e^(-a t) (cos wd t + a / wd sin wd t), v = -x0 w0² / wd e^(-a t) sin wd t.
  const wd = w0 * Math.sqrt(1 - zeta * zeta);
  return {
    opacity,
    scale: 1 + x0 * decay * (Math.cos(wd * t) + (a / wd) * Math.sin(wd * t)),
    velocity: ((-x0 * w0 * w0) / wd) * decay * Math.sin(wd * t),
    landed,
  };
}

/**
 * The same slam set by the clock, not started on a first frame: in every frame it is where a slam that began at
 * `origin` (phone time, systemClock) is at that frame's time. The friends room's GO! and the game screen's GO! that
 * takes it over (GoCover, FriendsGoFrame) both run on the time GO! was first shown, so wherever both are drawn (the
 * room stays under the game screen for a few frames of the cut) they are the same picture.
 *
 * QA go-cover-slam-jump (loop 15): the cover's GO! read its point in the slam as the game screen first rendered and
 * started a spring from there on its first frame, but that frame came 120–140 ms later (the new screen's mount), so
 * for 3–5 frames a GO! still at ~1.1–1.2 lay over the room's (at ~1) and then slammed down again. Reduced motion:
 * never a scale, the fade only. Past the landing the frames stop.
 *
 * Until its first frame on the UI thread it is not drawn (the slam's start, opacity 0), unless it had landed by
 * the render: the view can be drawn before the clock's first frame, and a pose worked out as it rendered is the
 * very pose the cut used to show, one frame. In that frame the room's GO! under it is the one seen.
 */
export function useSlamSince(reduce: boolean, origin: number) {
  const fadeMs = slamFadeMs(reduce);
  const end = reduce ? fadeMs : Math.max(fadeMs, SLAM_LANDED_MS);
  const [seed] = useState(() => (systemClock.now() - origin >= end ? end : 0));
  const since = useSharedValue(seed);
  useEffect(() => {
    since.set(withClockSince(origin, end));
  }, [since, origin, end]);
  return useAnimatedStyle(() => {
    const pose = slamPose(since.get(), fadeMs, reduce);
    return { opacity: pose.opacity, transform: [{ scale: pose.scale }] };
  });
}

/**
 * An animation whose value is, in each frame, the phone's time since `origin` (systemClock's Date.now, read on the
 * UI thread as the frame is drawn), up to `end`, where it stops: the frame's own time, not the time it was started
 * (a frame that comes late, or after a stall, shows where the slam is then).
 */
function withClockSince(origin: number, end: number): number {
  'worklet';
  return defineAnimation<AnimationObject<number>>(end, () => {
    'worklet';
    return {
      onStart: (animation: AnimationObject<number>) => {
        animation.current = Math.min(end, Date.now() - origin);
      },
      onFrame: (animation: AnimationObject<number>) => {
        animation.current = Math.min(end, Date.now() - origin);
        return animation.current >= end;
      },
      // Its target until it starts (as withTiming's): Reanimated skips an animation whose target is the value now.
      current: end,
      // Information as much as motion: the fade runs with reduced motion too (slamPose drops the scale itself).
      reduceMotion: false,
    };
  }) as unknown as number;
}

/**
 * A waiting dot or a "…" (motion.md `self.lost`, `opp.disconnecting`): opacity 1 ↔ 0.35 every 1200 ms while
 * `active`, started `delayMs` late so a row of dots blinks in turn. It is a functional loop (waiting). Reduced
 * motion: static.
 */
export function usePulse(active: boolean, reduce: boolean, delayMs = 0, low = 0.35) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (!active || reduce) {
      cancelAnimation(opacity);
      opacity.set(1);
      return;
    }
    const half = { duration: motion.loop.statusBlink / 2, easing: easing.loop, reduceMotion: NEVER_REDUCE };
    opacity.set(withDelay(delayMs, withRepeat(withTiming(low, half), -1, true), NEVER_REDUCE));
    return () => cancelAnimation(opacity);
  }, [active, reduce, delayMs, low, opacity]);
  return useAnimatedStyle(() => ({ opacity: opacity.get() }));
}

/**
 * A countdown's share left, drawn as it runs out: set to `remainingMs / totalMs` on each update and drained
 * linearly to 0 over `remainingMs` (motion.md §6: timers come from the server's clock). Stopped at 0 and with
 * `paused`. It is information, so it keeps moving with reduced motion.
 */
export function useDrain(remainingMs: number, totalMs: number, paused = false) {
  const share = useSharedValue(totalMs > 0 ? Math.min(1, Math.max(0, remainingMs / totalMs)) : 0);
  useEffect(() => {
    const start = totalMs > 0 ? Math.min(1, Math.max(0, remainingMs / totalMs)) : 0;
    cancelAnimation(share);
    share.set(start);
    if (!paused && remainingMs > 0) {
      share.set(withTiming(0, { duration: remainingMs, easing: easing.linear, reduceMotion: NEVER_REDUCE }));
    }
  }, [remainingMs, totalMs, paused, share]);
  return share;
}
