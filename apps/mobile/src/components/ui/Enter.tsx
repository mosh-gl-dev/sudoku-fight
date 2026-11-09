import { type ReactNode, type Ref, useEffect, useMemo, useState } from 'react';
import { type StyleProp, View, type ViewProps, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { motion, reduceMotionFlag, useReduceMotion } from '../../theme/motion';
import { curve } from './motion';

/**
 * One part of a screen coming in (motion.md §4.9, MOT-3): the app's one entrance, so the menus, the lists, the
 * Splash and the game's board all arrive the same way.
 *
 * - `fade`: opacity 0 → 1 (`stateChange`, 240 ms).
 * - `rise`: `list.enter`, 12 dp up while it fades in (320 ms `standard`); `distance` for another height (the
 *   game's board rises 24, motion.md `go`).
 * - `pop`: 0.6 → 1 on the `pop` spring, as it fades in (a seat glyph, a rival).
 * - `settle`: 0.94 → 1 on the `settle` spring (a hero button landing).
 *
 * A list staggers its first rows by `index` (40 ms apart, `listStagger`; the first ENTER.cap = 8 only: a row
 * past them, or one a virtualized list mounts later as it scrolls, appears at once).
 *
 * `play` holds the part at its start until it turns true (Home waits for the Splash to go); once played it stays.
 * Only transform and opacity move, once, on mount: nothing waits for it, and taps go through at once.
 *
 * It always ends at its end (B46, E1-E3). Reanimated 4.5 hands React the start of an animated style on every
 * render, and keeps what the UI thread drew in a native registry, laid over React's props on each commit. Its
 * settled-props sync (the FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS flag) hands JS what a view's entry holds once
 * it has stood still 1 to 2 s, as settled props laid over the view's style, and at its top, for good; past 2 s the
 * entry is dropped, synced or not. So what the phone shows can be the start (an end dropped unsynced while JS was
 * busy: B46, the restart for a new direction) or whatever the UI thread last drew when it stood still (a stall
 * while it draws a screen's first frame: Home after a cold start, History's cards). Two rules, then:
 * - Once started, its animated style stays on the view until it unmounts, so the UI thread always runs the
 *   entrance out and the registry's last word is the end. (Taking it off on a JS timer while the UI thread
 *   lagged left the registry at the start or half way, for good: E1-E3.)
 * - Once in (the animation's own end, or a JS timer should the UI thread's lag), its end is laid over everything
 *   Reanimated hands the view, settled props included (MovingView), so no commit can show anything else.
 * While held, the start is React's style and nothing animated is on the view.
 *
 * Reduced Motion (useReduceMotion): it appears at once, a plain View with nothing animated mounted. Whether it
 * animates is decided once, on mount: turning the setting while a screen is open never remounts what it holds.
 */

export type EnterKind = 'fade' | 'rise' | 'pop' | 'settle';

export const ENTER = {
  /** `list.enter`: how far a part rises, dp. */
  rise: 12,
  /** `list.enter`: how long a rise takes, ms. */
  riseMs: 320,
  /** Between two rows of a list, ms (`listStagger`). */
  stagger: motion.sequence.listStagger,
  /** Only the first rows of a list stagger in (motion.md §4.9: "first 8 items only"). */
  cap: 8,
  /** Where a pop starts (scale). */
  popFrom: 0.6,
  /** Where a settle starts (scale). */
  settleFrom: 0.94,
  /** The latest a part is handed its end after its wait, ms: past the longest kind (a pop's spring). */
  endSafetyMs: 1500,
} as const;

/**
 * When item `index` of a staggered entrance starts, ms: `base`, then `stagger` apart, for the first `cap` items;
 * null past them (that item appears at once).
 */
export function staggerDelay(
  index: number,
  {
    stagger = ENTER.stagger,
    cap = ENTER.cap,
    base = 0,
  }: { stagger?: number; cap?: number; base?: number } = {},
): number | null {
  if (!Number.isInteger(index) || index < 0 || index >= cap) return null;
  return base + index * stagger;
}

/** How a list's rows come in, from the screen that shows it (each row: an Enter with its index). */
export interface ListEntrance {
  /** Held until true (default true). */
  play?: boolean;
  /** False: the rows are simply there (default true). */
  enabled?: boolean;
  /** The first row's wait, ms. */
  delayMs?: number;
}

export interface EnterProps {
  kind?: EnterKind;
  /** Waits this long before it starts, ms (with `index`: the first item's wait). */
  delayMs?: number;
  /** Its place in a staggered list (see staggerDelay). */
  index?: number;
  /** Between two items of the list, ms. Default ENTER.stagger. */
  stagger?: number;
  /** How many items of the list stagger in. Default ENTER.cap. */
  cap?: number;
  /** Held at its start until true. Default true. */
  play?: boolean;
  /** False: no entrance, a plain View (read once, on mount). Default true. */
  enabled?: boolean;
  /** How far a `rise` rises, dp. Default ENTER.rise. */
  distance?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children?: ReactNode;
}

export function Enter({
  kind = 'rise',
  delayMs = 0,
  index,
  stagger,
  cap,
  play = true,
  enabled = true,
  distance = ENTER.rise,
  style,
  testID,
  children,
}: EnterProps) {
  const reduce = useReduceMotion();
  const delay = index === undefined ? delayMs : staggerDelay(index, { stagger, cap, base: delayMs });
  // Decided once: switching between the two forms would remount what it holds.
  const [moving] = useState(() => enabled && !reduce && delay !== null);
  if (!moving) {
    return (
      <View style={style} testID={testID}>
        {children}
      </View>
    );
  }
  return (
    <Moving kind={kind} delayMs={delay ?? 0} play={play} distance={distance} style={style} testID={testID}>
      {children}
    </Moving>
  );
}

const NEVER = reduceMotionFlag(false);

/** Where a part starts: React's own style while it waits, and under the animated one (see the top of this file). */
function startOf(kind: EnterKind, distance: number): ViewStyle {
  if (kind === 'fade') return { opacity: 0 };
  if (kind === 'rise') return { opacity: 0, transform: [{ translateY: distance }] };
  return { opacity: 0, transform: [{ scale: kind === 'pop' ? ENTER.popFrom : ENTER.settleFrom }] };
}

/** Where each kind ends: React's own style once the part is in (see the top of this file). */
const END: Record<EnterKind, ViewStyle> = {
  fade: { opacity: 1 },
  rise: { opacity: 1, transform: [{ translateY: 0 }] },
  pop: { opacity: 1, transform: [{ scale: 1 }] },
  settle: { opacity: 1, transform: [{ scale: 1 }] },
};

type MovingViewProps = ViewProps & {
  /** Once the part is in: its end, laid over everything Reanimated hands the view. */
  endStyle?: ViewStyle;
  ref?: Ref<View>;
  /** Reanimated's settled props, at the top (see MovingView). */
  opacity?: unknown;
  transform?: unknown;
};

/**
 * The view an entrance moves. Reanimated renders it with its settled props laid over the style it is given, and
 * spread at the top of its props too, where a View applies them as well (AnimatedComponent.render). Those are never
 * Enter's own (it hands a View no opacity or transform there), and once the part is in, its end goes over them.
 */
function MovingView({
  endStyle,
  style,
  ref,
  opacity: _opacity,
  transform: _transform,
  ...props
}: MovingViewProps) {
  return <View {...props} ref={ref} style={endStyle ? [style, endStyle] : style} />;
}

const AnimatedMovingView = Animated.createAnimatedComponent(MovingView);

function Moving({
  kind,
  delayMs,
  play,
  distance,
  style,
  testID,
  children,
}: {
  kind: EnterKind;
  delayMs: number;
  play: boolean;
  distance: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children?: ReactNode;
}) {
  const shown = useSharedValue(0);
  const scale = useSharedValue(kind === 'pop' ? ENTER.popFrom : kind === 'settle' ? ENTER.settleFrom : 1);
  // Once played it stays, whatever `play` does next (derived during render, no extra effect pass).
  const [started, setStarted] = useState(play);
  if (play && !started) setStarted(true);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    if (!started) return;
    const ms = kind === 'rise' ? ENTER.riseMs : motion.duration.stateChange;
    // In once each of its animations has ended: the fade, and a pop's or a settle's spring.
    let left = kind === 'pop' || kind === 'settle' ? 2 : 1;
    const partEnded = () => {
      left -= 1;
      if (left === 0) setEnded(true);
    };
    shown.set(
      withDelay(
        delayMs,
        withTiming(1, { duration: ms, easing: curve('standard'), reduceMotion: NEVER }, (finished) => {
          if (finished) scheduleOnRN(partEnded);
        }),
        NEVER,
      ),
    );
    if (kind === 'pop' || kind === 'settle')
      scale.set(
        withDelay(
          delayMs,
          withSpring(1, { ...motion.spring[kind], reduceMotion: NEVER }, (finished) => {
            if (finished) scheduleOnRN(partEnded);
          }),
          NEVER,
        ),
      );
    const safety = setTimeout(() => setEnded(true), delayMs + ENTER.endSafetyMs);
    return () => clearTimeout(safety);
  }, [started, kind, delayMs, shown, scale]);

  const animated = useAnimatedStyle(() => {
    const v = shown.get();
    if (kind === 'fade') return { opacity: v };
    if (kind === 'rise') return { opacity: v, transform: [{ translateY: (1 - v) * distance }] };
    return { opacity: v, transform: [{ scale: scale.get() }] };
  });

  // Its start stays under the animated style: one attached after the first render hands React nothing of its own.
  // Once started, the animated style stays on, past the end (see the top of this file).
  const start = useMemo(() => startOf(kind, distance), [kind, distance]);
  return (
    <AnimatedMovingView
      style={started ? [style, start, animated] : [style, start]}
      endStyle={ended ? END[kind] : undefined}
      testID={testID}
    >
      {children}
    </AnimatedMovingView>
  );
}
