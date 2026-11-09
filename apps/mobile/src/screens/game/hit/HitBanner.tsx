import { useEffect } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { AVATAR_REACTIONS, type AvatarIdOrNone } from '../../../avatars';
import { HIT_FADE_OUT_MS } from '../../../components/interference/config';
import { hitAlpha } from '../../../components/interference/hitClock';
import { Avatar, AVATAR_SIZES } from '../../../components/player';
import { Text } from '../../../components/ui/Text';
import { color, radius, size, space, text, tokens } from '../../../theme';
import { motion } from '../../../theme/motion';
import { type HitSender, senderKeyOf } from './hitModel';

export interface HitBannerProps {
  /** "NinaVolt שלח/ה לך זיקוקים!" */
  title: string;
  /** "זה עלה 2 נק׳ · המשחק ממשיך" */
  subtitle: string;
  /** Whole seconds left, in the ring. */
  seconds: number;
  /** What a screen reader says when it reaches the banner (title, subtitle and the time left). */
  label: string;
  fromAvatar?: AvatarIdOrNone | null;
  /** The sender's seat colour as this phone shows it: the avatar's frame. */
  fromColorIndex: number;
  /** ms into the hit, from its clock: the ring drains with it, and the banner fades out at the end. */
  elapsed: SharedValue<number>;
  totalMs: number;
  reduce: boolean;
  /** Distance from the top of the screen (under the safe area plus 8). */
  top: number;
  /**
   * Everyone who may send a hit (HitLayer's standby): their avatars stay mounted in the avatar's place, unseen but
   * the sender's, so a hit from one of them shows a picture that is already made. Left out: the sender's alone.
   */
  senders?: readonly HitSender[];
  /**
   * Between hits (HitLayer's standby): kept mounted, unseen (its clock stands at 0), with no sender shown and
   * nothing for screen readers.
   */
  standby?: boolean;
  testID?: string;
}

/** components.md §15.2: 52 high; the ring 38 with a 3 dp stroke; the banner drops 16 dp in. */
const RING = 38;
const RING_STROKE = 3;
const DROP = space[8];
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

/**
 * The ring's number at `elapsedMs` of the hit's `totalMs`, on the UI thread (QA loop 8, interference-hit-banner:
 * after a move during the hit, the number stayed on "2" for ~1.7 s and "1" showed ~0.3 s while the arc drained
 * smoothly): whole seconds left, rounded up like `hitSeconds`, from the same clock as the arc. Never more than
 * the screen's own `seconds` (the game clock at its last render): that one wins while the hit's clock has not
 * started yet (a hit that began part-way, under Jest) or once it stands at the end (the fade-out). A worklet.
 */
export function ringSeconds(elapsedMs: number, totalMs: number, seconds: number): number {
  'worklet';
  const left = Math.ceil((totalMs - elapsedMs) / 1000);
  return left >= 1 ? Math.min(seconds, left) : seconds;
}

const SETTLE = motion.spring.settle;
const SETTLE_W0 = Math.sqrt(SETTLE.stiffness / SETTLE.mass);
const SETTLE_ZETA = SETTLE.damping / (2 * Math.sqrt(SETTLE.stiffness * SETTLE.mass));
const SETTLE_DECAY = SETTLE_ZETA * SETTLE_W0;
const SETTLE_WD = SETTLE_W0 * Math.sqrt(Math.max(1e-6, 1 - SETTLE_ZETA * SETTLE_ZETA));
const REDUCED_IN_MS = motion.duration.reducedFade;

/**
 * The banner's entry (0 → 1) at `elapsedMs` into the hit, from the hit's clock: the `settle` spring from rest
 * (motion.md `hit.banner`; mass 1, stiffness 300, damping 30, ζ ≈ 0.87: in ≈ 300 ms, < 1 % over), or a linear
 * 200 ms fade with reduced motion. Its own spring (started by its own effect) could land a frame or more apart
 * from the dim and the effect (QA fixcheck of APK 14: dim first, the warp's overlay and the banner ~170 ms later);
 * read from the one clock, all three start together. A worklet.
 */
export function bannerEnter(elapsedMs: number, reduce: boolean): number {
  'worklet';
  if (!(elapsedMs > 0)) return 0;
  if (reduce) return Math.min(1, elapsedMs / REDUCED_IN_MS);
  const s = elapsedMs / 1000;
  const wave = Math.cos(SETTLE_WD * s) + (SETTLE_DECAY / SETTLE_WD) * Math.sin(SETTLE_WD * s);
  return 1 - Math.exp(-SETTLE_DECAY * s) * wave;
}

/**
 * The banner the hit player sees (spec §7.4; components.md §15.2; motion.md `hit.banner`): the sender's avatar
 * in their seat colour (with the sender's face, a wink: AVATAR_REACTIONS.moods.sender), "NinaVolt שלח/ה לך זיקוקים!", "המשחק ממשיך", and a gold ring counting the 5 s down.
 * It drops in 16 dp with the `settle` spring (reduced motion: a 200 ms fade), both from the hit's clock
 * (bannerEnter), and fades out over the effect's
 * last 240 ms, so it is gone at `endsAt` with the effect. The ring is information: it drains with reduced
 * motion too.
 *
 * Above the effect and never touchable (play goes on under it). For screen readers it is one element, an
 * alert, whose label says what happened and how long is left; the hit layer announces its start and end.
 *
 * HitLayer keeps it mounted between hits (`standby`, with every possible sender's avatar in `senders`): made at the
 * hit, it was the bulk of the hit's first frame (QA measure of APK 20: ~140 new native views at the hit, ~120 of
 * them the sender's avatar drawing, and the ring's text field), so a hit now only changes what it says and shows.
 */
export function HitBanner({
  title,
  subtitle,
  seconds,
  label,
  fromAvatar,
  fromColorIndex,
  elapsed,
  totalMs,
  reduce,
  top,
  senders,
  standby = false,
  testID = 'hit-banner',
}: HitBannerProps) {
  // In and out from the hit's clock alone, like the dim and the effect: the three start in the same frame.
  const motionStyle = useAnimatedStyle(() => {
    const t = elapsed.get();
    const enter = bannerEnter(t, reduce);
    const leaving = hitAlpha(t, totalMs, 0, HIT_FADE_OUT_MS);
    return {
      opacity: Math.min(1, enter) * leaving,
      transform: [{ translateY: reduce ? 0 : (enter - 1) * DROP }],
    };
  });

  // The sender's avatar, and the others kept ready (unseen) in its place: a sender among them changes only which one
  // is seen. One who is not (no standby yet, or a player the list did not have) is added, as before.
  const sender: HitSender | null = standby
    ? null
    : { avatarId: fromAvatar ?? null, colorIndex: fromColorIndex };
  const shownKey = sender ? senderKeyOf(sender) : null;
  const ready = senders ?? [];
  const faces =
    sender === null || ready.some((s) => senderKeyOf(s) === shownKey) ? ready : [...ready, sender];

  return (
    <Animated.View
      pointerEvents="none"
      accessible={!standby}
      accessibilityRole={standby ? undefined : 'alert'}
      accessibilityLabel={standby ? undefined : label}
      accessibilityElementsHidden={standby}
      importantForAccessibility={standby ? 'no-hide-descendants' : undefined}
      style={[styles.banner, { top }, motionStyle]}
      testID={testID}
    >
      <View style={styles.avatar}>
        {faces.map((face) => {
          const key = senderKeyOf(face);
          const seen = key === shownKey;
          return (
            <Avatar
              key={key}
              avatarId={face.avatarId}
              size="compact"
              colorIndex={face.colorIndex}
              backdrop={color.surface2}
              expression={AVATAR_REACTIONS.moods.sender}
              style={[styles.face, seen ? null : styles.unseen]}
              testID={seen ? `${testID}-avatar` : `${testID}-ready-avatar`}
            />
          );
        })}
      </View>
      <View style={styles.texts}>
        <Text style={styles.title} numberOfLines={1} testID={`${testID}-title`}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1} testID={`${testID}-subtitle`}>
          {subtitle}
        </Text>
      </View>
      <CountdownRing elapsed={elapsed} totalMs={totalMs} seconds={seconds} testID={`${testID}-ring`} />
    </Animated.View>
  );
}

/** The 5 s ring: a gold arc that drains from 12 o'clock, the seconds in the middle (components.md §15.2). */
function CountdownRing({
  elapsed,
  totalMs,
  seconds,
  testID,
}: {
  elapsed: SharedValue<number>;
  totalMs: number;
  seconds: number;
  testID: string;
}) {
  const r = (RING - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const arc = useAnimatedProps(() => ({
    strokeDashoffset: circumference * Math.min(1, Math.max(0, totalMs > 0 ? elapsed.get() / totalMs : 1)),
  }));
  // The number: an animated read-only TextInput, like CountUpText, so it turns with the arc and never waits for
  // a render (the banner's label says the time left for screen readers). The screen's seconds reach it as a shared
  // value, so a new one is read at once.
  const screenSeconds = useSharedValue(seconds);
  useEffect(() => {
    screenSeconds.set(seconds);
  }, [screenSeconds, seconds]);
  const number = useAnimatedProps(() => {
    const text = String(ringSeconds(elapsed.get(), totalMs, screenSeconds.get()));
    return { text, defaultValue: text };
  });
  return (
    <View style={styles.ring} testID={testID}>
      <Svg width={RING} height={RING} style={styles.rotate}>
        <Circle
          cx={RING / 2}
          cy={RING / 2}
          r={r}
          stroke={color.border}
          strokeWidth={RING_STROKE}
          fill={color.bg}
        />
        <AnimatedCircle
          cx={RING / 2}
          cy={RING / 2}
          r={r}
          stroke={color.accent}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={arc}
        />
      </Svg>
      <View style={styles.center}>
        <AnimatedTextInput
          animatedProps={number}
          editable={false}
          focusable={false}
          caretHidden
          contextMenuHidden
          scrollEnabled={false}
          showSoftInputOnFocus={false}
          underlineColorAndroid="transparent"
          accessible={false}
          aria-hidden
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.seconds}
          testID={`${testID}-seconds`}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: tokens.layout.gutterGame,
    right: tokens.layout.gutterGame,
    // The least: a taller script may need more, never cut (localization plan 0ט).
    minHeight: size.buttonMd,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[5],
    paddingHorizontal: space[5],
    borderRadius: radius.lg,
    borderWidth: tokens.border.hairline,
    borderColor: color.accent,
    backgroundColor: color.surface2,
  },
  avatar: { width: AVATAR_SIZES.compact.frame, height: AVATAR_SIZES.compact.frame },
  // Each avatar in the same place (start, top): the one seen, and the ones kept ready under it.
  face: { position: 'absolute', top: 0, start: 0 },
  unseen: { opacity: 0 },
  texts: { flex: 1, minWidth: 0, gap: space[2] },
  title: { ...text('playerName'), color: color.text },
  subtitle: { ...text('micro'), color: color.textMuted },
  ring: { width: RING, height: RING },
  rotate: { transform: [{ rotate: '-90deg' }] },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  // The ring's width, centred: the number changes on the UI thread, with no new layout for a wider digit.
  seconds: {
    ...text('scoreSm'),
    color: color.accent,
    includeFontPadding: false,
    width: RING,
    textAlign: 'center',
    padding: 0,
    margin: 0,
    borderWidth: 0,
    pointerEvents: 'none',
  },
});
