import { type Clock, type InterferenceKind, isInterferenceKind } from '@sudoku-fight/engine';
import type { TFunction } from 'i18next';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type LayoutChangeEvent, StyleSheet, useWindowDimensions, View } from 'react-native';
import { type SharedValue, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  DEFAULT_HIT_MS,
  effectColors,
  HIT_FADE_IN_MS,
  HIT_FADE_IN_REDUCED_MS,
  HIT_FADE_OUT_MS,
  HitEffect,
  INTERFERENCE_SCOPE,
  type InterferenceScope,
  type RegionRect,
  useLayerHitClock,
} from '../../../components/interference';
import { formatScore } from '../../../components/player';
import { decimalSeparator } from '../../../i18n/compose';
import { whenIdle } from '../../../services/startup';
import { space } from '../../../theme';
import { useReduceMotion } from '../../../theme/motion';
import type { Rect } from '../geometry';
import { HitBanner } from './HitBanner';
import {
  type HitInfo,
  hitSeconds,
  type HitSender,
  hitSeedOf,
  isHitOn,
  isolateName,
  senderKeyOf,
} from './hitModel';
import { type HitAnnounce, useHitFeedback } from './useHitFeedback';

export interface HitLayerProps {
  /** The interference on me (hitOf(view, …)), or null. */
  hit: HitInfo | null;
  /** The game clock's time, as the screen last rendered it: the effect is gone once it reaches `endsAt`. */
  now: number;
  /** The game's clock (the session's): where the effect is in its 5 s comes from it, not from a timer. */
  clock: Clock;
  /** [D35] The whole screen (the default until the proposal is approved) or the board. */
  scope?: InterferenceScope;
  /** The board, in this layer's coordinates (the game screen's root): the region in 'board' scope. */
  boardRect?: Rect | null;
  /** Defaults to the player's setting (useReduceMotion). */
  reduceMotion?: boolean;
  /**
   * The kind's cue at the start (sound and a Warning haptic) and its rumble while it lasts (motion.md §7).
   * Turn it off if the screen already plays the start cue.
   */
  feedback?: boolean;
  /**
   * Where the start and end lines go: the screen's live announcer, to queue them with the rest, or `false`
   * when the screen says them itself. Default: the screen reader's own announcement.
   */
  announce?: HitAnnounce;
  /** The safe area's top; default from react-native-safe-area-context. */
  topInset?: number;
  /** The screen's one clock for the hit (useHitClock), shared with the board's dim and the warp's tilt. */
  elapsed?: SharedValue<number>;
  /**
   * The kind whose effect stays mounted between hits, unseen (opacity 0, drawn at its start, which is transparent),
   * so a hit of that kind finds its canvas ready: the game screen passes 'warp' when the game allows it. It is
   * mounted only once the screen has settled (useStandbyLater), never under the countdown and GO!.
   */
  standby?: InterferenceKind | null;
  /**
   * Everyone who may send me a hit (hitSendersOf): the banner, with each of their avatars, stays mounted between
   * hits, unseen, once the screen has settled (HIT_BANNER_STANDBY_DELAY_MS), so a hit only changes what it says and
   * which avatar shows. Null or empty (a practice): the banner is made at each hit.
   */
  senders?: readonly HitSender[] | null;
  testID?: string;
}

/** The effect re-renders only when what it draws changes, not on every tick of the screen's countdown. */
const Effect = memo(HitEffect);
/** The banner between hits: not re-rendered by the screen's ticks (its props stand still then). */
const Banner = memo(HitBanner);

const NO_SENDERS: readonly HitSender[] = [];
/** The standby banner's ring (unseen): a whole hit's seconds. */
const STANDBY_SECONDS = Math.ceil(DEFAULT_HIT_MS / 1000);

/**
 * When the standby's canvas is made: after the board's entrance, GO! and the hit sounds' first warm-up
 * (HIT_WARM_DELAY_MS, 1.5 s), before the first hit's rehearsal (HIT_REHEARSAL_DELAY_MS, 2.5 s), so the three never
 * share one idle moment. A full-screen Skia surface made with the screen (QA review, loop 12) would have cost its
 * first frames, the moment the joiner's GO! already stalled on (go-hold-joiner).
 */
export const HIT_STANDBY_DELAY_MS = 2000;

/**
 * When the banner's standby is made (HitLayer `senders`): after the warp's canvas, on an idle moment of its own, and
 * before the rehearsal (HIT_REHEARSAL_DELAY_MS, 2.5 s). Never under the countdown and GO!. Made bare (its ring, its
 * number's text field and its texts): the senders' avatars follow one at a time (HIT_BANNER_FACE_GAP_MS).
 */
export const HIT_BANNER_STANDBY_DELAY_MS = HIT_STANDBY_DELAY_MS + 250;

/**
 * Between one sender's standby avatar and the next (and after the bare banner), then an idle moment: each avatar
 * (40–130 SVG nodes) is a commit and a first draw of its own, never all of a 4-player game's in one frame.
 */
export const HIT_BANNER_FACE_GAP_MS = 250;

/**
 * `kind` once the screen has settled (`delayMs`, then an idle moment) and no hit is on, null before: a hit that
 * comes before then makes its canvas at the hit, as it always did, and the standby waits until it is over (made
 * mid-hit it would replace the canvas the hit is drawn in).
 */
export function useStandbyLater<T extends string>(
  kind: T | null,
  busy: boolean,
  delayMs: number = HIT_STANDBY_DELAY_MS,
): T | null {
  const [ready, setReady] = useState<T | null>(null);
  useEffect(() => {
    if (kind === null || busy || ready === kind) return undefined;
    let stopIdle: (() => void) | null = null;
    const timer = setTimeout(() => {
      stopIdle = whenIdle(() => setReady(kind));
    }, delayMs);
    return () => {
      clearTimeout(timer);
      stopIdle?.();
    };
  }, [kind, busy, ready, delayMs]);
  return kind !== null && ready === kind ? kind : null;
}

const sendersKey = (list: readonly HitSender[]): string => list.map(senderKeyOf).join(',');

/** The senders, the same list (by identity) for as long as they are the same players, avatars and colours. */
function useSameSenders(senders: readonly HitSender[] | null | undefined): readonly HitSender[] {
  const list = senders ?? NO_SENDERS;
  const [kept, setKept] = useState(list);
  if (sendersKey(kept) === sendersKey(list)) return kept;
  setKept(list);
  return list;
}

/**
 * The senders whose avatars the standby banner holds: none at first (`on` false: no banner yet), then one more of
 * `senders` per HIT_BANNER_FACE_GAP_MS and idle moment, in their order. Never changed while a hit is on (`busy`):
 * a list that changes then (profiles that came late) is taken up after it, one avatar at a time again. One who
 * left the list is dropped between hits. The same list (by identity) while nothing changes.
 */
export function useWarmSenders(
  senders: readonly HitSender[],
  on: boolean,
  busy: boolean,
): readonly HitSender[] {
  const [warm, setWarm] = useState<readonly HitSender[]>(NO_SENDERS);
  const keys = new Set(senders.map(senderKeyOf));
  const stale = warm.some((s) => !keys.has(senderKeyOf(s)));
  const next = senders.find((s) => !warm.some((w) => senderKeyOf(w) === senderKeyOf(s))) ?? null;
  const nextKey = next === null ? null : senderKeyOf(next);
  // One who left: dropped at once between hits (an unmount costs nothing worth spreading out).
  if (on && !busy && stale) setWarm(warm.filter((s) => keys.has(senderKeyOf(s))));
  useEffect(() => {
    if (!on || busy || stale || next === null) return undefined;
    let stopIdle: (() => void) | null = null;
    const timer = setTimeout(() => {
      stopIdle = whenIdle(() => setWarm((w) => [...w, next]));
    }, HIT_BANNER_FACE_GAP_MS);
    return () => {
      clearTimeout(timer);
      stopIdle?.();
    };
    // `next` is read through its key: a new, equal object is the same sender.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, busy, stale, nextKey]);
  return on ? warm : NO_SENDERS;
}

/**
 * What an interference on me looks like (spec §7.4 "מי שנפגע: באנר … עם טבעת שסופרת 5 שניות לאחור, והאפקט
 * עצמו"; motion.md §4.4, §5): the kind's 5 s effect over the whole screen or the board [D35], and above it the
 * banner with the sender and the countdown. Mount it over the game screen (absolute, after the reactions);
 * it is never touchable, so play goes on under it (spec §7.2). For a warp, also wrap the screen (or the
 * board) in WarpFrame: the overlay is drawn here, the tilt is the content's own.
 *
 * Time: the effect is on while `now < endsAt` (React), and runs from the game clock on the UI thread: it is
 * fully faded out at `endsAt`, the same instant the engine ends it (spec §7.2: exactly 5 s). With reduced
 * motion (spec §22) the effect is a static cover of the same area for the same time.
 *
 * Screen readers: the effect is hidden from them; the banner is an alert they can reach, and the layer
 * announces the start ("… הלוח מוחשך, נותרו 5 שניות. הטיימר שלך עצור", D46: the board's dim is
 * BoardHitLayer's, inside the board) and the end. For the scramble it adds that the rolling digits are not real,
 * and for the keypad that every key still enters its own digit [D47].
 *
 * A kind this app doesn't know (a newer player's): the generic banner "NinaVolt שלח/ה לך הפרעה!", no effect.
 */
export function HitLayer({
  hit,
  now,
  clock,
  scope = INTERFERENCE_SCOPE,
  boardRect = null,
  reduceMotion,
  feedback = true,
  announce,
  topInset,
  elapsed: shared,
  standby = null,
  senders,
  testID = 'hit-layer',
}: HitLayerProps) {
  const { t } = useTranslation('game');
  const reducedSetting = useReduceMotion();
  const reduce = reduceMotion ?? reducedSetting;
  const insets = useSafeAreaInsets();
  const windowSize = useWindowDimensions();
  const [measured, setMeasured] = useState<{ width: number; height: number } | null>(null);

  const shown = isHitOn(hit, now) ? hit : null;
  const elapsed = useLayerHitClock(shown, clock, shared);
  const ready = useStandbyLater(standby, shown !== null);
  // The standby's canvas draws this hit (its kind); for another kind it stays unseen on a clock that stands at 0,
  // so its worklets do nothing while the other kind's effect is drawn next to it.
  const inStandby = shown !== null && shown.kind === ready;
  const still = useSharedValue(0);
  // The banner's standby: made once the screen has settled, never mid-hit (a hit's own banner is drawn then).
  const kept = useSameSenders(senders);
  const bannerReady =
    useStandbyLater(kept.length > 0 ? 'banner' : null, shown !== null, HIT_BANNER_STANDBY_DELAY_MS) !== null;
  const warm = useWarmSenders(kept, bannerReady, shown !== null);
  const bannerTop = (topInset ?? insets.top) + space[4];

  const seconds = shown ? hitSeconds(shown, now) : 0;
  const title = shown ? hitTitle(shown.kind, shown.fromName, t) : '';
  const subtitle =
    shown?.cost === undefined || shown.cost === null
      ? t('hit.goesOn')
      : t('hit.cost', { cost: formatScore(shown.cost, decimalSeparator(t)) });
  const time = t('hit.seconds', { count: seconds });
  // Said once, as the hit starts: what happened, that the board is dimmed, and for how long.
  const startLine = shown ? startLineOf(shown.kind, t('hit.started', { title, time }), t) : '';

  useHitFeedback({
    hit: shown,
    clock,
    reduce,
    feedback,
    announce,
    startLine,
    endLine: t('hit.ended'),
  });

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setMeasured((m) => (m && m.width === width && m.height === height ? m : { width, height }));
  }, []);

  const colors = useMemo(() => effectColors(shown?.fromColorIndex ?? 1), [shown?.fromColorIndex]);
  const seed = shown ? hitSeedOf(shown) : 0;
  const idleColors = useMemo(() => effectColors(1), []);

  // Between hits, the standby kind's effect stays mounted, unseen. A Skia canvas on Android draws into a TextureView
  // of its own, and a new one shows its first picture only once its surface is made and drawn into: 94–348 ms after
  // the banner and the dim, which mount as plain views in the same commit (QA measure of APK 17: a new full-screen
  // SkiaTextureView at every warp, the overlay always last). Kept mounted, the hit only changes what it draws. A hit
  // of another kind draws in a slot of its own next to it, so it never unmounts the standby's surface either.
  if (!shown && ready === null && !bannerReady) return null;

  // [D35] The board alone needs its rect; until it is known the effect covers the screen, as the spec says.
  const onBoard = scope === 'board' && boardRect !== null;
  const screen = measured ?? { width: windowSize.width, height: windowSize.height };
  const region: RegionRect = onBoard ? boardRect : { x: 0, y: 0, ...screen };
  const board: RegionRect | null = onBoard
    ? { x: 0, y: 0, width: region.width, height: region.height }
    : boardRect;

  return (
    <View
      style={styles.layer}
      pointerEvents="none"
      onLayout={onLayout}
      testID={shown ? testID : `${testID}-standby`}
    >
      {/* Physical coordinates (LTR), like the rects from onLayout; hidden from screen readers. */}
      <View
        style={styles.physical}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {ready !== null ? (
          <View
            key="standby"
            style={[
              styles.region,
              { left: region.x, top: region.y, width: region.width, height: region.height },
              inStandby ? null : styles.unseen,
            ]}
            pointerEvents="none"
            testID={inStandby ? `${testID}-region` : `${testID}-standby-region`}
          >
            <Effect
              kind={ready}
              width={region.width}
              height={region.height}
              elapsed={shown === null || inStandby ? elapsed : still}
              totalMs={inStandby ? shown.totalMs : DEFAULT_HIT_MS}
              colors={inStandby ? colors : idleColors}
              reduce={reduce}
              fadeInMs={reduce ? HIT_FADE_IN_REDUCED_MS : HIT_FADE_IN_MS}
              fadeOutMs={HIT_FADE_OUT_MS}
              scope={onBoard ? 'board' : 'screen'}
              board={board}
              seed={inStandby ? seed : 0}
            />
          </View>
        ) : null}
        {shown && !inStandby ? (
          <View
            key="hit"
            style={[
              styles.region,
              { left: region.x, top: region.y, width: region.width, height: region.height },
            ]}
            pointerEvents="none"
            testID={`${testID}-region`}
          >
            <Effect
              kind={shown.kind}
              width={region.width}
              height={region.height}
              elapsed={elapsed}
              totalMs={shown.totalMs}
              colors={colors}
              reduce={reduce}
              fadeInMs={reduce ? HIT_FADE_IN_REDUCED_MS : HIT_FADE_IN_MS}
              fadeOutMs={HIT_FADE_OUT_MS}
              scope={onBoard ? 'board' : 'screen'}
              board={board}
              seed={seed}
            />
          </View>
        ) : null}
      </View>
      {/*
       * One element in one place, the hit's or the standby's: a hit changes its props, never mounts it anew. Both read
       * the hit's clock, so a hit's banner starts in the same frame as the dim (no new worklet at the hit). The
       * standby is hidden by its slot's own opacity, set in the same commit: when a hit ends early (cleared by the
       * server, or the app back from the background past `endsAt`) the clock still holds its mid-hit value until
       * useHitClock's effect resets it, and the empty banner would otherwise show at full strength for that frame.
       */}
      {shown || bannerReady ? (
        <View
          style={[styles.layer, shown ? null : styles.unseen]}
          pointerEvents="none"
          testID={`${testID}-banner-slot`}
        >
          {shown ? (
            <Banner
              title={title}
              subtitle={subtitle}
              seconds={seconds}
              label={t('hit.banner', { title, subtitle, time })}
              fromAvatar={shown.fromAvatar}
              fromColorIndex={shown.fromColorIndex ?? 1}
              elapsed={elapsed}
              totalMs={shown.totalMs}
              reduce={reduce}
              top={bannerTop}
              senders={bannerReady ? warm : undefined}
              testID={`${testID}-banner`}
            />
          ) : (
            <Banner
              title=""
              subtitle=""
              seconds={STANDBY_SECONDS}
              label=""
              fromColorIndex={1}
              elapsed={elapsed}
              totalMs={DEFAULT_HIT_MS}
              reduce={reduce}
              top={bannerTop}
              senders={warm}
              standby
              testID={`${testID}-banner-standby`}
            />
          )}
        </View>
      ) : null}
    </View>
  );
}

type GameT = TFunction<'game'>;

/** The banner's title: the kind's own ("NinaVolt שלח/ה לך זיקוקים!"), or the generic one for a kind unknown here. */
export function hitTitle(kind: InterferenceKind, fromName: string, t: GameT): string {
  const name = isolateName(fromName);
  return isInterferenceKind(kind) ? t(`hit.title.${kind}`, { name }) : t('hit.title.generic', { name });
}

/** The start's announcement, with what the screen reader should know about the kind [D47]. */
export function startLineOf(kind: InterferenceKind, line: string, t: GameT): string {
  return kind === 'scramble' || kind === 'keypad'
    ? t('hit.withNote', { line, note: t(`hit.note.${kind}`) })
    : line;
}

const styles = StyleSheet.create({
  layer: StyleSheet.absoluteFill,
  physical: { ...StyleSheet.absoluteFill, direction: 'ltr' },
  region: { position: 'absolute', overflow: 'hidden' },
  unseen: { opacity: 0 },
});
