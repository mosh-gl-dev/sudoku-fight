import { type ReactNode, type Ref, useState } from 'react';
import {
  type BoxShadowValue,
  type GestureResponderEvent,
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  ReduceMotion,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { FeedbackCue } from '../../services/feedback';
import { color, radius, tokens } from '../../theme';
import { motion, useReduceMotion } from '../../theme/motion';
import { curve } from './motion';
import { Slant } from './slant';

/**
 * The tactile surfaces of D125 (Moshe 2026-10-30, "כפתורים וכרטיסים עם עומק"; components.md §0.7): every raised
 * control is an edge, a face and its label, and every press is the same one.
 *
 * - **Edge:** a hard band under the face, in a tone of the palette (gold under gold, the border's tone under
 *   slate). Buttons draw it as a View under the face (Android-safe, as the CTA always did); a card's 2 dp base is
 *   an RN boxShadow, which keeps the card itself the pressable (and its layout untouched).
 * - **Face:** a tonal gradient through existing tokens (`experimental_backgroundImage`; the plain fill under it is
 *   what shows if a phone draws no gradient), a lit top border and an inset top highlight (RN `boxShadow` inset).
 * - **Press:** the face sinks onto its edge (leaving 1 dp of it; a card covers its base) in 80 ms, the whole
 *   surface shrinks to 0.98, and both come back on the `press` spring. With Reduced Motion there is no scale and
 *   no tween: the face lands at once and its colour changes, so the press still shows.
 * - **Slant** (`skew`): the face's plate and the edge are drawn as slanted shapes (slant.tsx, since Android drops
 *   a `skewX`), and the label sits upright on the plate.
 *
 * Never Skia (startupGraph.test.ts keeps it off the startup path): native styles only.
 */

const T = tokens.elevation.tactile;
const C = color.tactile;
const HAIRLINE = tokens.border.hairline;

/** gold: the primary. slate: secondary. icon: the 44 icon button (a thinner edge). danger: the red outline. */
export type SurfaceKind = 'gold' | 'slate' | 'icon' | 'danger';

/** Each kind's edge: its colour, its depth under the face, and how far the face travels onto it. */
export const EDGE: Readonly<Record<SurfaceKind, { color: string; depth: number; travel: number }>> = {
  gold: {
    color: color.accentShadow,
    depth: tokens.elevation.cta.offsetY,
    travel: tokens.elevation.cta.pressedTranslateY,
  },
  slate: { color: C.slateEdge, depth: T.slate.offsetY, travel: T.slate.pressedTranslateY },
  icon: { color: C.slateEdge, depth: T.icon.offsetY, travel: T.icon.pressedTranslateY },
  danger: { color: C.dangerEdge, depth: T.danger.offsetY, travel: T.danger.pressedTranslateY },
};

/** A card's base and its travel: the whole base is covered when pressed. */
export const CARD_BASE = { depth: T.card.offsetY, travel: T.card.pressedTranslateY } as const;

/** The scale a pressed surface shrinks to (full motion only). */
export const PRESSED_SCALE = T.pressedScale;

/** A top-to-bottom gradient through `stops`, spread evenly (RN's experimental_backgroundImage). */
export function verticalGradient(stops: readonly string[]): string {
  const last = Math.max(1, stops.length - 1);
  return `linear-gradient(180deg, ${stops.map((c, i) => `${c} ${Math.round((i / last) * 100)}%`).join(', ')})`;
}

/**
 * A surface with a gradient never loses its border width; it goes to 0. React Native 0.86 on Android reads a
 * border width that a style drops as NaN, so the gradient's area turns NaN, and drawing it throws (LinearGradient
 * nativeCreate, IllegalArgumentException). The app crashed when a disabled gold button (hairline border) came on,
 * as Edit profile's "שמור" once an avatar is chosen (Moshe, 31.10.2026). So a face that has a border in one state
 * sets one in every state.
 */
export const NO_BORDER = { borderWidth: 0 } as const satisfies ViewStyle;

/** One flat layer of `tint` over the face's own fill (an alpha colour on an opaque face, so no edge shows through). */
export const tintLayer = (tint: string): string => `linear-gradient(${tint}, ${tint})`;

const insetLine = (offsetY: number, tint: string): BoxShadowValue => ({
  offsetX: 0,
  offsetY,
  blurRadius: 0,
  color: tint,
  inset: true,
});

/** The state a face is drawn in. */
export interface FaceState {
  pressed: boolean;
  disabled: boolean;
  /** Chip-like use: gold border, the accent's 10% over the face. */
  selected?: boolean;
  /** An icon button whose picker is open. */
  expanded?: boolean;
}

/**
 * The face of a button of `kind` in a state (components.md §1). Every face is opaque, so the edge under it never
 * shows through. Disabled is one look for every kind: surface2, the border, no edge and no gradient (never a
 * faded gold).
 */
export function faceStyle(
  kind: SurfaceKind,
  { pressed, disabled, selected, expanded }: FaceState,
): ViewStyle {
  const shape: ViewStyle = { borderRadius: radius.button };
  if (disabled) {
    return {
      ...shape,
      backgroundColor: C.disabledFace,
      borderWidth: HAIRLINE,
      borderColor: C.disabledBorder,
    };
  }
  if (kind === 'gold') {
    return {
      ...shape,
      // An explicit 0, never a border that goes away (NO_BORDER).
      ...NO_BORDER,
      backgroundColor: color.accent,
      experimental_backgroundImage: verticalGradient(pressed ? C.goldFacePressed : C.goldFace),
      boxShadow: pressed
        ? [insetLine(T.lip.gold, C.goldLip)]
        : [insetLine(T.lip.gold, C.goldLip), insetLine(-T.goldShade, C.goldShade)],
    };
  }
  if (kind === 'danger') {
    return {
      ...shape,
      backgroundColor: C.dangerFace,
      experimental_backgroundImage: tintLayer(pressed ? color.dangerPressed : color.dangerSubtle),
      borderWidth: HAIRLINE,
      borderColor: color.dangerBorder,
    };
  }
  const outline: ViewStyle = { ...shape, borderWidth: HAIRLINE };
  if (selected) {
    return {
      ...outline,
      backgroundColor: pressed ? C.slatePressed : color.surface2,
      experimental_backgroundImage: tintLayer(color.accentSubtle),
      borderColor: color.accent,
    };
  }
  if (pressed || expanded) {
    // Held down (or held open): a flat, lighter face, as a pressed key (keypad.keyPressedBg).
    return {
      ...outline,
      backgroundColor: pressed ? C.slatePressed : color.surface2,
      borderColor: expanded ? color.textMuted : color.border,
    };
  }
  return {
    ...outline,
    backgroundColor: color.surface2,
    experimental_backgroundImage: verticalGradient(C.slateFace),
    borderColor: color.border,
    borderTopColor: C.borderLit,
    boxShadow: [insetLine(T.lip.slate, C.slateLip)],
  };
}

export interface CardState {
  pressed: boolean;
  disabled: boolean;
  selected?: boolean;
  /** A border of its own (my leaderboard row in P1). Selected wins. */
  tone?: string;
}

/**
 * The L1 card of VIS-2: surface, a hairline border lit at the top, an inset top highlight and a 2 dp base in the
 * border's tone. Pressed: the face goes to surface2 and covers its base. Disabled: flat, no base (it can't be
 * pressed); the caller keeps its own dimmed look (dashed, faded).
 */
export function cardStyle({ pressed, disabled, selected, tone }: CardState): ViewStyle {
  const border = selected ? color.accent : (tone ?? color.border);
  const base: ViewStyle = { borderRadius: radius.card, borderWidth: HAIRLINE, borderColor: border };
  if (disabled) return { ...base, backgroundColor: color.surface };
  return {
    ...base,
    backgroundColor: pressed ? C.cardPressed : color.surface,
    ...(selected ? { experimental_backgroundImage: tintLayer(color.accentSubtle) } : null),
    borderTopColor: selected || tone ? border : C.borderLit,
    boxShadow: pressed
      ? []
      : [
          { offsetX: 0, offsetY: CARD_BASE.depth, blurRadius: 0, color: C.cardBase },
          insetLine(T.lip.card, C.cardLip),
        ],
  };
}

/**
 * The one press of every tactile surface: `progress` runs 0 → 1 in 80 ms (the `standard` curve) when the finger
 * lands and back on the `press` spring when it lifts. With Reduced Motion it jumps (no tween), and `scale` stays 1.
 */
export function useTactilePress(reduce: boolean): {
  progress: SharedValue<number>;
  pressIn: () => void;
  pressOut: () => void;
} {
  const progress = useSharedValue(0);
  return {
    progress,
    pressIn: () =>
      progress.set(
        reduce
          ? 1
          : withTiming(1, {
              duration: motion.duration.tapFeedbackMin,
              easing: curve('standard'),
              reduceMotion: ReduceMotion.Never,
            }),
      ),
    pressOut: () =>
      progress.set(reduce ? 0 : withSpring(0, { ...motion.spring.press, reduceMotion: ReduceMotion.Never })),
  };
}

/** The whole surface's scale at a press progress (none with Reduced Motion). */
export function pressScale(progress: number, reduce: boolean): number {
  'worklet';
  return reduce ? 1 : 1 - progress * (1 - PRESSED_SCALE);
}

type FeedbackModule = typeof import('../../services/feedback');

/**
 * Plays a press cue. The feedback service is loaded with the first press, not with every screen that draws a
 * button: it brings the sound player (expo-audio), which a test without that native module cannot load. There
 * the cue is simply not heard; the press itself always works.
 */
function playCue(name: FeedbackCue): void {
  try {
    /* eslint-disable @typescript-eslint/no-require-imports -- lazy on purpose, see above */
    (require('../../services/feedback') as FeedbackModule).cue(name);
    /* eslint-enable @typescript-eslint/no-require-imports */
  } catch {
    // No sound player here (a test without expo-audio's native module): nothing to play.
  }
}

/** Plays the surface's cue, then runs the press (so a test's `press` hears it too). */
const withCue = (cueName: FeedbackCue | null | undefined, onPress: PressableProps['onPress']) =>
  onPress
    ? (e: GestureResponderEvent) => {
        if (cueName) playCue(cueName);
        onPress(e);
      }
    : undefined;

export interface TactileSurfaceProps extends Omit<PressableProps, 'style' | 'children'> {
  kind: SurfaceKind;
  /** The −8° brand slant: the primary always, a button beside it in one row too (the pair rule, §1.0). */
  skew?: boolean;
  selected?: boolean;
  expanded?: boolean;
  /** Presses do nothing visible (loading): no sinking. */
  inert?: boolean;
  /** The outer box: size and place (height or minHeight, flex, margins). */
  style?: StyleProp<ViewStyle>;
  /** The face's own layout over its recipe: height, padding, alignment. */
  faceStyle?: StyleProp<ViewStyle>;
  /** A cue played on press (the primary's "primaryPress"); none by default. */
  cue?: FeedbackCue | null;
  /** The edge's box. Slanted, its look is on `${edgeTestID}-shape`. */
  edgeTestID?: string;
  /** The face's box (its layout and its press). Slanted, its look is on the plate, `${faceTestID}-shape`. */
  faceTestID?: string;
  children: (state: { pressed: boolean }) => ReactNode;
  ref?: Ref<View>;
}

/**
 * A button's layered surface (components.md §0.7): the outer box is the pressable and keeps the caller's size and
 * place; inside it the edge sits `depth` lower than the face (outside the box, so layouts don't change), and the
 * face carries the content. Pressed: the face travels onto the edge and the whole shrinks to 0.98. Slanted, the
 * face's look moves to a slanted plate under the content, and the edge is the same slanted shape.
 */
export function TactileSurface({
  kind,
  skew = false,
  selected,
  expanded,
  inert = false,
  disabled,
  style,
  faceStyle: faceLayout,
  cue: cueName = null,
  edgeTestID,
  faceTestID,
  onPress,
  onPressIn,
  onPressOut,
  children,
  ref,
  ...pressable
}: TactileSurfaceProps) {
  const reduce = useReduceMotion();
  const edge = EDGE[kind];
  // Held down, as the press handlers hear it (the same moments as Pressable's own `pressed`).
  const [down, setDown] = useState(false);
  const { progress, pressIn, pressOut } = useTactilePress(reduce);
  const off = !!disabled;
  const travel = edge.travel;
  const body = useAnimatedStyle(() => ({ transform: [{ scale: pressScale(progress.get(), reduce) }] }));
  const face = useAnimatedStyle(() => ({ transform: [{ translateY: progress.get() * travel }] }));
  const look = faceStyle(kind, { pressed: down, disabled: off, selected, expanded });
  const depth = { top: edge.depth, bottom: -edge.depth };
  return (
    <Pressable
      {...pressable}
      ref={ref}
      disabled={disabled}
      onPress={withCue(cueName, onPress)}
      onPressIn={(e) => {
        if (!inert) {
          setDown(true);
          pressIn();
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setDown(false);
        pressOut();
        onPressOut?.(e);
      }}
      style={style}
    >
      <Animated.View style={body} testID={pressable.testID && `${pressable.testID}-body`}>
        {off ? null : skew ? (
          <Slant
            style={depth}
            shapeStyle={[styles.edgeShape, { backgroundColor: edge.color }]}
            testID={edgeTestID}
            shapeTestID={edgeTestID && `${edgeTestID}-shape`}
          />
        ) : (
          <View testID={edgeTestID} style={[styles.edge, depth, { backgroundColor: edge.color }]} />
        )}
        {/* Slanted, the look is on the plate; the box keeps an explicit border width all the same (NO_BORDER). */}
        <Animated.View testID={faceTestID} style={[skew ? NO_BORDER : look, faceLayout, face]}>
          {skew ? <Slant shapeStyle={look} shapeTestID={faceTestID && `${faceTestID}-shape`} /> : null}
          {children({ pressed: down })}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableCardProps extends Omit<PressableProps, 'style' | 'children'> {
  /** card: the L1 surface. bare: no surface of its own (a podium column), only the press and its overlay. */
  variant?: 'card' | 'bare';
  selected?: boolean;
  /** A border of its own (my leaderboard row in P1). */
  tone?: string;
  /** The card's layout (and any look of its own, e.g. a dashed offline card), over the surface. */
  style?: StyleProp<ViewStyle>;
  /** The cue on press: a selection tick by default; null when the screen plays its own. */
  cue?: FeedbackCue | null;
  children?: ReactNode;
  ref?: Ref<View>;
}

/**
 * A tappable card (VIS-2): the pressable is the card itself, so its layout, role and test id stay where they
 * were. One press for every card: it sinks onto its base, shrinks to 0.98 and springs back, with a selection
 * tick. It replaces the old opacity, surface and surface2 presses.
 */
export function PressableCard({
  variant = 'card',
  selected,
  tone,
  disabled,
  style,
  cue: cueName = 'toggle',
  onPress,
  onPressIn,
  onPressOut,
  children,
  ref,
  ...pressable
}: PressableCardProps) {
  const reduce = useReduceMotion();
  const [pressed, setPressed] = useState(false);
  const { progress, pressIn, pressOut } = useTactilePress(reduce);
  const off = !!disabled;
  const travel = variant === 'card' ? CARD_BASE.travel : 0;
  const motionStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.get() * travel }, { scale: pressScale(progress.get(), reduce) }],
  }));
  const surface =
    variant === 'card'
      ? cardStyle({ pressed, disabled: off, selected, tone })
      : pressed
        ? styles.bareDown
        : null;
  return (
    <AnimatedPressable
      {...pressable}
      ref={ref}
      disabled={disabled}
      onPress={withCue(cueName, onPress)}
      onPressIn={(e: GestureResponderEvent) => {
        setPressed(true);
        pressIn();
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        setPressed(false);
        pressOut();
        onPressOut?.(e);
      }}
      style={[surface, style, motionStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  edge: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: radius.button,
  },
  edgeShape: {
    borderRadius: radius.button,
  },
  bareDown: {
    backgroundColor: color.pressedOverlay,
    borderRadius: radius.card,
  },
});
