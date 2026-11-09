import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { color, radius, size, space, text, tokens } from '../../theme';
import { motion, useReduceMotion } from '../../theme/motion';
import { Icon, type IconName } from '../Icon';
import { timing } from './motion';
import { Text } from './Text';
import { toastHoldMs, toastLook, type ToastVariant } from './toastModel';
import { useToast } from './toastStore';

/**
 * The clock a toast uses to leave on its own. Injected, so tests (and a paused game) control it: `start` runs
 * `done` after `ms` and returns a cancel function.
 */
export interface ToastTimer {
  start: (done: () => void, ms: number) => () => void;
}

/** The real clock. */
export const realToastTimer: ToastTimer = {
  start: (done, ms) => {
    const handle = setTimeout(done, ms);
    return () => clearTimeout(handle);
  },
};

export interface ToastProps {
  variant: ToastVariant;
  message: string;
  /** Seconds in the countdown pill (connection toast). */
  countdown?: number;
  /** Replaces the variant's icon. */
  icon?: IconName;
  /** Overrides the variant's hold time (toastModel); `null` stays until `hidden`. */
  holdMs?: number | null;
  /** The clock for the auto-hide. Default: the real one. */
  timer?: ToastTimer;
  /**
   * The most lines the message takes (toastStore `maxLines`). Only for a message whose tail is a name (names may
   * shorten); none: every line the words need.
   */
  maxLines?: number;
  /** Set by the owner to make the toast leave now (e.g. the connection came back). */
  hidden?: boolean;
  /** Called once the toast has finished leaving. */
  onHide?: () => void;
  testID?: string;
}

/**
 * One toast (components.md §15.1): 40 high, a semantic border and icon circle, one line of text (more, and taller,
 * when the words need them: never "…"). Not tappable.
 * Enters 12 dp from above with a fade (240 ms), leaves with a fade (240 ms). Reduced motion: fades only.
 */
export function Toast({
  variant,
  message,
  countdown,
  icon,
  holdMs,
  maxLines,
  timer = realToastTimer,
  hidden = false,
  onHide,
  testID,
}: ToastProps) {
  const { t } = useTranslation('ui');
  const reduce = useReduceMotion();
  const look = toastLook(variant);
  const hold = toastHoldMs(variant, holdMs);
  const [expired, setExpired] = useState(false);
  const leaving = hidden || expired;
  const progress = useSharedValue(0);

  // Tell VoiceOver (Android reads the live region by itself). Only the message is announced: the countdown
  // changes every second and must not be read every second.
  useEffect(() => {
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(message);
  }, [message]);

  useEffect(() => {
    if (hold === null || leaving) return;
    return timer.start(() => setExpired(true), hold);
  }, [hold, leaving, timer]);

  // In on mount, out when it expires or the owner hides it; `onHide` runs once the exit has finished.
  useEffect(() => {
    if (!leaving) {
      progress.set(withTiming(1, timing(motion.duration.stateChange, 'standard', reduce)));
      return;
    }
    progress.set(
      withTiming(0, timing(motion.duration.stateChange, 'exit', reduce), (finished) => {
        if (finished && onHide) scheduleOnRN(onHide);
      }),
    );
  }, [leaving, onHide, progress, reduce]);

  const motionStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ translateY: reduce ? 0 : (progress.get() - 1) * space[6] }],
  }));

  const label =
    countdown === undefined
      ? message
      : t('toast.withCountdown', { message, time: t('toast.secondsLeft', { count: countdown }) });

  return (
    <Animated.View
      accessible
      role={look.role}
      accessibilityLabel={label}
      accessibilityLiveRegion={look.role === 'alert' ? 'assertive' : 'polite'}
      testID={testID}
      style={[styles.box, { borderColor: look.border }, motionStyle]}
    >
      <View style={[styles.iconCircle, { backgroundColor: look.iconBg }]}>
        <Icon name={icon ?? look.icon} size={space[7]} color={look.iconColor} />
      </View>
      <Text
        style={styles.message}
        numberOfLines={maxLines}
        testID={testID ? `${testID}-message` : 'toast-message'}
      >
        {message}
      </Text>
      {countdown === undefined ? null : (
        <View style={styles.pill}>
          <Text style={styles.pillText}>{countdown}</Text>
        </View>
      )}
    </Animated.View>
  );
}

export interface ToastViewportProps {
  /** The clock for the auto-hide. Default: the real one. */
  timer?: ToastTimer;
}

/**
 * Shows the store's current toast at the top, under the safe area plus 8 (or at its own `top`), 16 from each
 * side. It sits over the card area and never over the board. Mount it once, above the screens.
 */
export function ToastViewport({ timer }: ToastViewportProps) {
  const current = useToast((s) => s.current);
  const remove = useToast((s) => s.remove);
  const { top } = useSafeAreaInsets();
  if (!current) return null;
  const { id, hiding, top: at, ...content } = current;
  return (
    <View style={[styles.viewport, { top: at ?? top + space[4] }]}>
      <Toast key={id} {...content} hidden={hiding} timer={timer} onHide={() => remove(id)} />
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    position: 'absolute',
    left: space[8],
    right: space[8],
    pointerEvents: 'box-none',
  },
  // 40 high for one line (components.md §15.1); a message wider than the toast takes more lines, broken between
  // words, and the box grows with it, never "…" (QA loop 9, 360 dp: "Not enough points for the next i…" hid the
  // cost). The icon and the countdown stay centred on its height. The sender's chip under the cards keeps to two
  // lines (maxLines): at font 1.3 that is 2 × 23.4 + 12 + 2 ≈ 61, and the board starts 76 under the chip's top.
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[5],
    minHeight: size.toast,
    paddingVertical: space[3],
    paddingHorizontal: space[6],
    borderRadius: radius.button,
    borderWidth: tokens.border.hairline,
    backgroundColor: color.toast.bg,
  },
  iconCircle: {
    width: size.toastIcon,
    height: size.toastIcon,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    ...text('buttonSm'),
    // buttonSm's line is its size (14/14), for one line in a button; lines that may wrap get the body's (18), which
    // holds Rubik's whole height, so neither a descender nor the next line is cut.
    lineHeight: Math.max(text('buttonSm').lineHeight ?? 0, text('body').lineHeight ?? 0),
    flex: 1,
    color: color.toast.text,
  },
  pill: {
    height: size.toastIcon,
    minWidth: size.toastIcon,
    paddingHorizontal: space[4],
    borderRadius: radius.pill,
    borderWidth: tokens.border.hairline,
    borderColor: color.textMuted,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    ...text('vsBadge'),
    color: color.text,
    includeFontPadding: false,
  },
});
