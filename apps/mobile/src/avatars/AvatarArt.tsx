import {
  type AvatarDef,
  blinkPlan,
  CANVAS,
  type Crop,
  type EasingName,
  EASINGS,
  type Expression,
  type FaceChange,
  gimmickAnims,
  gimmickPlans,
  type GimmickState,
  grayOf,
  type MotionPlan,
  motionPlan,
  NATIVE_PROPERTIES,
  type NativeFrame,
  nativeLayers,
  type NativeNode,
  type NativeProperty,
  type NativeRect,
  nativeTransform,
  type NodePlan,
  nodeRest,
  originFromCentrePx,
  type PlacePx,
  placePx,
  type PropertyPlan,
  TILE_RADIUS,
  triggeredBy,
} from '@sudoku-fight/avatars';
import { memo, type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { NEVER_REDUCE } from '../components/player/anim';
import { useReduceMotion } from '../theme/motion';
import { avatarDef } from './catalog';
import { burstRepeats, burstSpanMs, type IdleBeat, useIdleBeat } from './idleBeat';
import { idleMovers, layerStack, type StackItem, staticXml } from './layerStack';
import { type AvatarReaction, reactionSpanMs } from './reactions';
import { SvgMarkup } from './svgMarkup';
import { useScreenFocused } from './useScreenFocused';

export { type AvatarReaction, REACTION_FACE_MS } from './reactions';

/**
 * One of our avatars (packages/avatars, spec §3.4), drawn and moved in the app. A plain picture: no frame, no
 * badges, no label (Avatar in components/player puts it in its frame; it is decorative, hidden from screen
 * readers, and a caller that stands it alone labels its own container).
 *
 * Still (most of the time): ONE SvgXml of renderStatic(), remembered per avatar, size, crop, face and grey.
 * That is every list, every card at rest and the 22 px avatar in a locked cell. (Each SvgXml here is drawn by
 * SvgMarkup: the same drawing, its markup parsed once for every mount, ./svgMarkup.tsx.)
 *
 * Moving: the layers of nativeLayers(), stacked in a view of `size` that clips them to the rounded tile; each
 * layer that moves now is an Animated.View that Reanimated 4 turns, scales and fades on the UI thread with the
 * package's plans (motionPlan, gimmickPlans, blinkPlan), and the layers between them stand still, merged into
 * as few SvgXml as their order allows (layerStack.ts). Each SvgXml is a bitmap as big as its layer's own
 * rectangle (an eye's is an eye's size). The clip renders to one texture on Android while it moves, so a parent
 * that fades (a section entering) or dims (a reconnecting player) fades the avatar as one picture, not each layer
 * over the tile's colour. An avatar moves only:
 * - during a `reaction` with a motion (then it goes back to one SvgXml);
 * - while one of its gimmicks plays (its expression or motion starts one; only at 48 px and up, packages/avatars
 *   GIMMICK_MIN_SIZE: the kettle's steam, the rain cloud's drops);
 * - on a stage view (`idle`), while its screen is the one shown (useScreenFocused: Home under the game does not
 *   idle): in beats, a burst of its idle gimmicks or a blink, with a rest between them (./idleBeat.ts). Where
 *   avatars idle: AVATAR_STAGES (./reactions.ts). A stage keeps its layers, still, while another screen covers it:
 *   one picture under the new screen and the layers again on the way back cost every change of screen from Home a
 *   long frame (B14, QA run #2).
 *
 * Layers it no longer shows (the motion is over, another avatar or size, other layers move now) are kept a while,
 * hidden and still, before they go (LAYERS_RETIRE_MS: until Reanimated has let go of their views, B32).
 *
 * Reduced motion (the app's own decision, useReduceMotion): nothing moves, no gimmick, no blink. Faces still
 * change, at once: a reaction shows its face for as long as it would have played, then the base face again.
 *
 * Expressions and reactions (for the screens that react to the game):
 * - `expression` is the base face, shown until it changes (the default `neutral`). A new one swaps at once, and
 *   starts the gimmicks it triggers (the rain cloud rains while `sad`).
 * - `reaction` plays once each time its `key` changes (never the one present on the first render): its
 *   `expression`, if given, for the whole reaction (otherwise the motion's own faces: bounce laughs, nod
 *   smiles), and its `motion`, if given (squash falls back to bounce for an avatar that can't squash). Without
 *   a motion it lasts REACTION_FACE_MS; with `faceMs` the face stays on, still, after the motion, that long in
 *   all. Then the base face shows again. A new key mid-reaction starts over. A reaction that goes away (null:
 *   the replay between two steps) stops at once, and the next one plays even with a key that played before
 *   (the replay back on a step it showed).
 *   Which reaction plays when, in the game, the results and the replay: ./reactions.ts (AVATAR_REACTIONS).
 *
 * The picture is decorative and hidden from screen readers: the name beside it, or its card's label, says who it
 * is (Avatar's `label` makes a lone one speak the name). Under Jest only, the root view's accessibilityValue text
 * is the face shown now (an expression id), for tests (testing/avatarTesting.ts shownFace). Never in the app:
 * Android writes that text into the view's content description, and "neutral" stood there in all 19 languages
 * (B10, QA run #2).
 */

/**
 * How long a stack of layers the avatar no longer shows stays, hidden and still, ms. Reanimated 4.5 keeps the
 * last props of every view it moved until 2 s after its last frame (its settled-props sync, every 500 ms), and on
 * Android it applies them all again for each layout event a react-native-svg shape sends when it is first drawn.
 * A view deleted while it is still kept fails each time, with an exception and its stack trace in the log, for
 * every shape that frame draws (one picture of an avatar has 50 to 130): a long frame wherever a moving avatar
 * changes for a new picture, a frozen phone in the pirates lab (B32, QA run #2). Deleted after this, nothing
 * holds them any more.
 */
export const LAYERS_RETIRE_MS = 4000;

/** The testID of a stack of layers kept hidden (LAYERS_RETIRE_MS), which tests skip (testing/avatarTesting.ts). */
export const RETIRED_LAYERS_ID = 'avatar-retired-layers';

export interface AvatarArtProps {
  /**
   * One of ours (AvatarId). av00, null or anything else draws the "no avatar" placeholder; an id of the old
   * pack draws its replacement.
   */
  avatarId: string | null | undefined;
  /** Width and height, px. */
  size: number;
  /** `head`: the head only, for tiny sizes (the 22 px avatar in a locked cell); objects show whole. */
  crop?: Crop;
  /** The base face. Default `neutral`. */
  expression?: Expression;
  reaction?: AvatarReaction | null;
  /** A stage view (AVATAR_STAGES: the picker's stage, the winner): idle gimmicks and the blink. */
  idle?: boolean;
  /** Grey (a player who reconnects, left or surrendered): colour math on every colour, contrasts kept. */
  inactive?: boolean;
  /** Corner radius of the clip, px. Default the tile's own (18 % of the side). */
  radius?: number;
  /**
   * Overrides the app's reduced-motion decision (useReduceMotion), for this avatar only: the dev avatar lab's own
   * switch. Leave it out everywhere else.
   */
  reduceMotion?: boolean;
  /**
   * Kept still, unseen, under another view (the VS under the count): it stays exactly as it is drawn now. No
   * reaction starts or ends (a motion under way runs on to its end on the UI thread, its layers kept, never swapped
   * for the still picture), no face or grey changes, no idle beat, and no stack of layers goes. Nothing is drawn
   * anew, so nothing new is drawn in the frames of what covers it (docs/PERF.md B14/B32). Shown again, it goes on.
   */
  frozen?: boolean;
  testID?: string;
}

/** An avatar of ours, still or moving (see the top of this file). */
export const AvatarArt = memo(function AvatarArt({
  avatarId,
  size,
  crop = 'tile',
  expression = 'neutral',
  reaction = null,
  idle = false,
  inactive = false,
  radius,
  reduceMotion,
  frozen = false,
  testID,
}: AvatarArtProps) {
  const appReduce = useReduceMotion();
  const reduce = reduceMotion ?? appReduce;
  const focused = useScreenFocused();
  const def = avatarDef(avatarId);
  const playing = useReaction(def, reaction, reduce, size, frozen);
  const face = useHeld(playing === null || playing.face === 'base' ? expression : playing.face, frozen);
  const gray = useHeld(inactive, frozen);
  // A stage keeps its layers under another screen (Home under the game stays mounted, B14), and idles only while
  // it is the one shown (frozen, it is covered).
  const staged = idle && !reduce && def !== null;
  const stage = staged && focused && !frozen;
  const burstMs = useMemo(
    () =>
      stage && def
        ? burstSpanMs(
            gimmickPlans(def, { expression: face, motion: null, idle: true, size, reducedMotion: false }),
          )
        : 0,
    [stage, def, face, size],
  );
  // In beats, never an endless loop (./idleBeat.ts).
  const beat = useIdleBeat(stage && playing === null, burstMs);

  const state: GimmickState = {
    expression: face,
    motion: playing?.plan?.id ?? null,
    idle: stage && (playing !== null || beat?.kind === 'burst'),
    size,
    reducedMotion: reduce,
  };
  const plans = def && !reduce ? nodePlans(def, state, playing, stage ? beat : null, stage) : NO_PLANS;
  // The layers, when it moves now (else one still picture): on a stage every layer that may move has its own
  // view, so the stack stays put while it idles; elsewhere only the layers that move now do.
  const movers = staged ? STAGE_MOVERS : plans.size > 0 ? [...plans.keys()].sort().join(' ') : null;
  const shown: Stack | null =
    def !== null && movers !== null
      ? { key: `${def.id}:${size}:${crop}:${movers}`, def, size, crop, face, grayscale: gray, movers }
      : null;
  const retired = useRetiredStacks(shown, frozen);
  const moving = shown?.def ?? null;

  return (
    <View
      style={[
        styles.clip,
        { width: size, height: size, borderRadius: radius ?? (TILE_RADIUS * size) / CANVAS },
        moving ? [styles.moving, { backgroundColor: gray ? grayOf(moving.tile) : moving.tile }] : null,
      ]}
      // Moving, the tile and the layers are separate draws: as one texture, a fading parent fades them as one
      // picture (Android only; iOS composites a group's opacity already).
      renderToHardwareTextureAndroid={moving !== null}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      // Tests only: the face shown now (see the top of this file, B10).
      accessibilityValue={process.env.NODE_ENV === 'test' ? { text: face } : undefined}
      testID={testID}
    >
      {[
        // One keyed list, so a stack that goes is the same views, hidden: never deleted with the new picture.
        ...retired.map((s) => <LayeredArt key={s.key} stack={s} plans={NO_PLANS} retired />),
        shown ? (
          // A new avatar, size, crop or set of moving layers is a new stack.
          <LayeredArt key={shown.key} stack={shown} plans={plans} retired={false} />
        ) : (
          <StaticArt key={STILL_KEY} def={def} size={size} crop={crop} face={face} grayscale={gray} />
        ),
      ]}
    </View>
  );
});

// ---------------------------------------------------------------------------------------------------------
// The stacks of layers: the one shown, and the ones kept hidden a while (LAYERS_RETIRE_MS)

/** `movers` of a stage: every layer that may move (layerStack.ts idleMovers). */
const STAGE_MOVERS = 'idle';
/** The key of the one still picture (never a stack's). */
const STILL_KEY = 'still';

/** A stack of layers: its avatar, size and crop, the face it draws and which layers move in it. */
interface Stack {
  /** A new avatar, size, crop or set of moving layers is a new stack. */
  key: string;
  def: AvatarDef;
  size: number;
  crop: Crop;
  face: Expression;
  grayscale: boolean;
  /** STAGE_MOVERS, or the keys of the layers that move, sorted, space-separated. */
  movers: string;
}

/**
 * `value`, or while `hold`, the one it had when the hold began (a frozen avatar's face and grey). Kept in state,
 * adjusted while rendering, so it is never a frame late.
 */
function useHeld<T extends string | boolean>(value: T, hold: boolean): T {
  const [held, setHeld] = useState(value);
  if (!hold && held !== value) setHeld(value);
  return hold ? held : value;
}

/**
 * The stacks this avatar drew and no longer shows, each kept for LAYERS_RETIRE_MS as it was last drawn (hidden and
 * still). One shown again comes back as it is. While `frozen` none goes: their time starts again once it is not.
 */
function useRetiredStacks(shown: Stack | null, frozen: boolean): readonly Stack[] {
  const [last, setLast] = useState(shown);
  const [retired, setRetired] = useState<readonly Stack[]>([]);
  // Derived during render, so the stack that goes and the new picture are one commit (no frame in between).
  if (shown?.key !== last?.key || shown?.face !== last?.face || shown?.grayscale !== last?.grayscale) {
    setLast(shown);
    if (last !== null && shown?.key !== last.key)
      setRetired((list) => [...list.filter((s) => s.key !== last.key), last]);
  }
  // Each kept stack's timer; made on first use, and emptied with the timers it stops (effects that run again
  // without an unmount, a hidden Activity shown again or Fast Refresh, start them all again).
  const timers = useRef<Map<Stack, ReturnType<typeof setTimeout>> | null>(null);
  useEffect(() => {
    const live = (timers.current ??= new Map());
    if (frozen) {
      live.forEach(clearTimeout);
      live.clear();
      return;
    }
    for (const s of retired)
      if (!live.has(s))
        live.set(
          s,
          setTimeout(() => {
            live.delete(s);
            setRetired((list) => list.filter((x) => x !== s));
          }, LAYERS_RETIRE_MS),
        );
  }, [retired, frozen]);
  useEffect(
    () => () => {
      timers.current?.forEach(clearTimeout);
      timers.current = null;
    },
    [],
  );
  return shown === null ? retired : retired.filter((s) => s.key !== shown.key);
}

// ---------------------------------------------------------------------------------------------------------
// Reactions and the idle blink: what plays now, in React state (the movement itself runs on the UI thread)

interface Playing {
  key: string | number;
  /** Its motion (no nodes with reduced motion), or null for a face only. */
  plan: MotionPlan | null;
  face: Expression | 'base';
}

/**
 * The reaction playing now (see AvatarReaction), or null. Its motion moves farther on a small avatar (under 48
 * px: packages/avatars motionAmplitude), so a nod still shows on a 28 px card. While `frozen` it stays as it is:
 * nothing starts, and what plays never ends (its motion runs on to its end on the UI thread; its layers stay).
 * Shown again, a reaction cut short so ends at once, and one asked for meanwhile plays.
 */
function useReaction(
  def: AvatarDef | null,
  reaction: AvatarReaction | null,
  reduce: boolean,
  size: number,
  frozen: boolean,
): Playing | null {
  const [playing, setPlaying] = useState<Playing | null>(null);
  // The reaction of the first render has played already, as far as this avatar knows.
  const played = useRef(reaction?.key);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // A reaction whose end was put off by a freeze.
  const cut = useRef(false);
  const key = reaction?.key;
  const expression = reaction?.expression;
  const motionId = reaction?.motion;
  const faceMs = reaction?.faceMs;

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const list = timers.current;
    if (frozen) {
      if (list.length > 0) cut.current = true;
      list.forEach(clearTimeout);
      list.length = 0;
      return;
    }
    if (cut.current && key !== undefined && key === played.current) {
      cut.current = false;
      list.push(setTimeout(() => setPlaying(null), 0));
      return;
    }
    cut.current = false;
    if (key === undefined) {
      // No reaction now (the replay between two steps): what plays stops, and any key may play next, even one
      // that played before (the replay back on a step it showed).
      played.current = undefined;
      list.forEach(clearTimeout);
      list.length = 0;
      list.push(setTimeout(() => setPlaying(null), 0));
      return;
    }
    if (key === played.current) return;
    played.current = key;
    list.forEach(clearTimeout);
    list.length = 0;
    const plan = def && motionId ? motionPlan(def, motionId, { reducedMotion: reduce, size }) : null;
    const motionMs = plan?.durationMs ?? 0;
    const total = reactionSpanMs(motionMs, faceMs);
    const faces: FaceChange[] = expression ? [{ atMs: 0, expression }] : (plan?.faceChanges ?? []);
    const first = faces[0]?.atMs === 0 ? faces[0].expression : 'base';
    const at = (ms: number, run: () => void) => list.push(setTimeout(run, ms));
    const mine = (change: (p: Playing) => Playing | null) =>
      setPlaying((p) => (p !== null && p.key === key ? change(p) : p));
    at(0, () => setPlaying({ key, plan, face: first }));
    for (const c of faces)
      if (c.atMs > 0 && c.atMs < total) at(c.atMs, () => mine((p) => ({ ...p, face: c.expression })));
    // The face stays on after the motion: one still picture again meanwhile.
    if (plan && total > motionMs) at(motionMs, () => mine((p) => ({ ...p, plan: null })));
    at(total, () => mine(() => null));
    // The size is read as the reaction starts (a new size alone never replays it: same key).
  }, [key, def, expression, motionId, faceMs, reduce, size, frozen]);

  return playing;
}

// ---------------------------------------------------------------------------------------------------------
// Which plan each layer plays

interface Planned {
  plan: NodePlan;
  /** A new key starts the plan over; the same key leaves it running. */
  key: string;
  /** Part of an idle burst: its loops repeat a few times (burstRepeats), not forever. */
  burst?: boolean;
}

const NO_PLANS: ReadonlyMap<string, Planned> = new Map();

const blinks = new WeakMap<AvatarDef, MotionPlan>();
const blinkOf = (def: AvatarDef): MotionPlan => {
  let plan = blinks.get(def);
  if (!plan) blinks.set(def, (plan = blinkPlan(def)));
  return plan;
};

/**
 * Every layer's plan now: the gimmicks this state plays (one that keeps its anim keeps running, as in CSS; one a
 * motion plays starts over with each reaction), then the reaction's motion, else the idle blink. On a stage,
 * between reactions, gimmicks play only in an idle burst (useIdleBeat), each burst from the start.
 */
function nodePlans(
  def: AvatarDef,
  state: GimmickState,
  playing: Playing | null,
  beat: IdleBeat | null,
  stage: boolean,
): ReadonlyMap<string, Planned> {
  const out = new Map<string, Planned>();
  const burst = stage && playing === null && beat?.kind === 'burst' ? beat.n : null;
  const gimmicks = stage && playing === null && burst === null ? [] : gimmickPlans(def, state);
  for (const p of gimmicks) {
    const g = def.gimmicks?.find((x) => x.id === p.gimmick);
    const anim = g ? gimmickAnims(g)[p.index] : undefined;
    const run =
      playing !== null && state.motion && anim && triggeredBy(anim, state.motion) ? playing.key : '';
    out.set(
      p.node,
      burst !== null
        ? { plan: p, key: `g${p.index}:i${burst}`, burst: true }
        : { plan: p, key: `g${p.index}:${run}` },
    );
  }
  if (playing?.plan) for (const n of playing.plan.nodes) out.set(n.node, { plan: n, key: `m${playing.key}` });
  else if (beat?.kind === 'blink')
    for (const n of blinkOf(def).nodes) out.set(n.node, { plan: n, key: `b${beat.n}` });
  return out;
}

// ---------------------------------------------------------------------------------------------------------
// Drawing

/** One SvgXml, its markup remembered (layerStack.ts staticXml) and parsed once (SvgMarkup). */
const StaticArt = memo(function StaticArt({
  def,
  size,
  crop,
  face,
  grayscale,
}: {
  def: AvatarDef | null;
  size: number;
  crop: Crop;
  face: Expression;
  grayscale: boolean;
}) {
  const xml = useMemo(
    () => staticXml(def, { size, crop, expression: face, grayscale }),
    [def, size, crop, face, grayscale],
  );
  return <SvgMarkup xml={xml} width={size} height={size} />;
});

/**
 * A stack of layers over the whole tile, shown, or kept hidden and still (`retired`: its plans none, its views at
 * rest, not drawn).
 */
const LayeredArt = memo(function LayeredArt({
  stack: { def, size, crop, face, grayscale, movers },
  plans,
  retired,
}: {
  stack: Stack;
  plans: ReadonlyMap<string, Planned>;
  retired: boolean;
}) {
  const layers = useMemo(
    () => nativeLayers(def, { expression: face, size, crop, grayscale, pixelRatio: PixelRatio.get() }),
    [def, face, size, crop, grayscale],
  );
  const items = useMemo(
    () => layerStack(layers, movers === STAGE_MOVERS ? idleMovers(layers) : new Set(movers.split(' '))),
    [layers, movers],
  );
  return (
    <View
      style={[styles.stack, retired && styles.retired]}
      // Kept as a view of its own, shown or hidden (never flattened into the clip and back).
      collapsable={false}
      testID={retired ? RETIRED_LAYERS_ID : undefined}
    >
      {layerItems(items, layers.frame, plans, layers.frame.rect)}
    </View>
  );
});

/** The items of one level, each placed by its rect inside `outer` (the moving layer that holds them, or the tile). */
function layerItems(
  items: readonly StackItem[],
  frame: NativeFrame,
  plans: ReadonlyMap<string, Planned>,
  outer: NativeRect,
): ReactNode[] {
  return items.map((it) =>
    it.kind === 'svg' ? (
      <LayerSvg key={it.key} xml={it.xml} {...placePx(frame, it.rect, outer)} />
    ) : (
      <LayerNode
        key={it.key}
        node={it.node}
        frame={frame}
        place={placePx(frame, it.node.rect, outer)}
        plan={plans.get(it.key)?.plan ?? null}
        planKey={plans.get(it.key)?.key ?? null}
        burst={plans.get(it.key)?.burst ?? false}
      >
        {layerItems(it.items, frame, plans, it.node.rect)}
      </LayerNode>
    ),
  );
}

const LayerSvg = memo(function LayerSvg({ xml, left, top, width, height }: PlacePx & { xml: string }) {
  return <SvgMarkup xml={xml} width={width} height={height} style={[styles.layer, { left, top }]} />;
});

/** The curves of motion.md §3, built once. */
const EASE = Object.fromEntries(
  (Object.keys(EASINGS) as EasingName[]).map((name) => [name, Easing.bezier(...EASINGS[name])]),
) as Record<EasingName, ReturnType<typeof Easing.bezier>>;

/**
 * One property of a plan, for Reanimated: each loop jumps to `from`, then runs its segments. A loop runs
 * forever, or `repeats` times (an idle burst).
 */
function propertyAnimation(p: PropertyPlan, repeats = -1): number {
  const timing = (to: number, duration: number, ease: EasingName) =>
    withTiming(to, { duration, easing: EASE[ease], reduceMotion: NEVER_REDUCE });
  const loop = withSequence(
    NEVER_REDUCE,
    timing(p.from, 0, 'linear'),
    ...p.segments.map((s) => timing(s.to, s.durationMs, s.ease)),
  );
  return withDelay(
    p.delayMs,
    withRepeat(loop, p.loop ? repeats : 1, false, undefined, NEVER_REDUCE),
    NEVER_REDUCE,
  );
}

/**
 * A layer that moves: an Animated.View over the layer's rect, its transform built around the plan's origin
 * (nativeTransform), with the layers it holds inside it. A new `planKey` starts its plan over (from rest when
 * there is none); the same key leaves it running.
 */
function LayerNode({
  node,
  frame,
  place,
  plan,
  planKey,
  burst,
  children,
}: {
  node: NativeNode;
  frame: NativeFrame;
  /** Where its rect sits in its parent's (placePx). */
  place: PlacePx;
  plan: NodePlan | null;
  planKey: string | null;
  /** Part of an idle burst: its loops repeat burstRepeats() times. */
  burst: boolean;
  children: ReactNode;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);
  const opacity = useSharedValue(node.restOpacity);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  // The plan of the latest render, for the effect below (which runs only when the key changes).
  const latest = useRef({ node, plan, burst });
  useLayoutEffect(() => {
    latest.current = { node, plan, burst };
  });

  // Where it turns, from its rect's centre: set whenever it changes, also while a plan plays on (a new face
  // can change the rect, which holds the face's parts).
  const origin = originFromCentrePx(frame, node.rect, plan?.origin ?? node.origin);
  useEffect(() => {
    originX.set(origin.x);
    originY.set(origin.y);
  }, [origin.x, origin.y, originX, originY]);

  useEffect(() => {
    const values: Record<NativeProperty, SharedValue<number>> = {
      translateX,
      translateY,
      rotate,
      scaleX,
      scaleY,
      opacity,
    };
    const { node: n, plan: p, burst: inBurst } = latest.current;
    const rest = p?.rest ?? nodeRest(n);
    for (const property of NATIVE_PROPERTIES) {
      cancelAnimation(values[property]);
      values[property].set(rest[property]);
    }
    for (const pp of p?.properties ?? []) {
      // During a delay the first keyframe shows (CSS's `both`).
      values[pp.property].set(pp.from);
      values[pp.property].set(propertyAnimation(pp, inBurst ? burstRepeats(pp) : -1));
    }
    return () => {
      for (const property of NATIVE_PROPERTIES) cancelAnimation(values[property]);
    };
  }, [planKey, translateX, translateY, rotate, scaleX, scaleY, opacity]);

  const scale = frame.scale;
  const style = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: nativeTransform(
      { x: translateX.get(), y: translateY.get(), rotate: rotate.get(), sx: scaleX.get(), sy: scaleY.get() },
      { x: originX.get(), y: originY.get() },
      scale,
    ),
  }));

  return <Animated.View style={[styles.layer, place, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  // The layers, left to right in either language: React Native turns a `left` into a `start` in an RTL app, and
  // `start` is the left again in an LTR view, so every layer keeps its place in the picture (as the board does).
  moving: { direction: 'ltr' },
  // A stack fills the tile, left to right on its own too (a hidden one may outlive the moving clip).
  stack: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, direction: 'ltr' },
  retired: { opacity: 0 },
  layer: { position: 'absolute' },
});
