import { THINK_TIME_MS } from '@sudoku-fight/engine';
import type { TFunction } from 'i18next';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { retryLoad, signOut, useAuth } from '../../auth/authStore';
import { Button, Spinner } from '../../components/ui';
import { Enter } from '../../components/ui/Enter';
import { curve, usePresence } from '../../components/ui/motion';
import { Text } from '../../components/ui/Text';
import { color, radius, size, space, text, tokens } from '../../theme';
import { motion, reduceMotionFlag, useReduceMotion } from '../../theme/motion';
import { errorMessage } from './messages';
import { AccountApiError } from '../../api/accountApi';
import {
  systemSplashCovering,
  useSystemSplashExiting,
  useSystemSplashPacer,
} from '../../services/systemSplash';
import { Brand, BRAND_ENTRANCE, DevModeBadge } from './parts';

const TIPS = ['lock', 'hard', 'mistake', 'interfere'] as const;
/** A new tip every few seconds while the arena loads. */
export const TIP_MS = 4_000;
/** A tip gives way to the next: out, then in, 240 ms in all (MOT-3: no hard cut). */
export const TIP_FADE_MS = 240;
/** The tagline fades in after the wordmark (the Splash's entrance). */
const TAGLINE_AT = BRAND_ENTRANCE.subAt + 120;

/**
 * A tip's words. The numbers come from the rules, not the copy (the Splash board's "12 שניות במשחק רגיל"
 * is the normal game's think time [D2]). The mistake tip has no number: a mistake costs what the right
 * digit would have scored there (spec §6.5).
 */
export function splashTip(t: TFunction<'account'>, tip: (typeof TIPS)[number]): string {
  if (tip === 'lock') {
    const seconds = THINK_TIME_MS.normal / 1000;
    return t('splash.tips.lock', { count: seconds, seconds, type: t('home:gameTypes.normal.name') });
  }
  return t(`splash.tips.${tip}`);
}

/**
 * The Splash (spec §4.1 #1, §4.2: "Splash → logged in → Home / not logged in → Login"), in direction C: the
 * wordmark with the four seat shapes, the tagline, "טוען את הזירה…" with a spinner, and a tip. It covers the
 * app while the auth status is loading, and fades away once the router has the right screen under it
 * (motion.md: 240 ms; reduced motion: a 200 ms fade).
 *
 * When a sign-in's profile can't be read and none is saved on the phone (first run offline), it says so,
 * with "נסה שוב" and "התנתקות".
 *
 * `onFirstLayout`: it has laid out, so it is what the system splash uncovers (the root layout hides that one
 * then, services/systemSplash.ts). Called on each layout; the handler acts once. While that one's exit runs, the
 * overlay counts the frames it is seen alone (SystemSplashPacer).
 */
export function SplashOverlay({ visible, onFirstLayout }: { visible: boolean; onFirstLayout?: () => void }) {
  const reduce = useReduceMotion();
  const handingOver = useSystemSplashExiting();
  const { mounted, progress } = usePresence(visible, {
    inMs: 0,
    outMs: motion.duration.stateChange,
    reduce,
  });
  const fade = useAnimatedStyle(() => ({ opacity: progress.get() }));
  if (!mounted) return null;
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.overlay, visible ? null : fade]}
      pointerEvents={visible ? 'auto' : 'none'}
      onLayout={onFirstLayout}
      testID="splash-overlay"
    >
      <SplashScreen />
      {handingOver ? <SystemSplashPacer /> : null}
    </Animated.View>
  );
}

/** Counts the frames the Splash is seen alone after the system splash's exit (mounted only while that runs). */
function SystemSplashPacer() {
  useSystemSplashPacer();
  return null;
}

export function SplashScreen() {
  const { t } = useTranslation('account');
  // Under the system splash (a cold start), it is drawn whole from its first frame: the system splash's cross-fade
  // is its entrance (an entrance of its own would still be on its way in when the Splash goes). Decided on mount.
  const [entrance] = useState(() => !systemSplashCovering());
  const { top, bottom } = useSafeAreaInsets();
  const loadError = useAuth((s) => s.loadError);
  const [tip, setTip] = useState(0);
  const [busy, setBusy] = useState<'retry' | 'signOut' | null>(null);
  const shownTip = useCrossFade(tip);

  useEffect(() => {
    const timer = setInterval(() => setTip((i) => (i + 1) % TIPS.length), TIP_MS);
    return () => clearInterval(timer);
  }, []);

  const act = async (what: 'retry' | 'signOut') => {
    setBusy(what);
    try {
      await (what === 'retry' ? retryLoad() : signOut());
    } finally {
      setBusy(null);
    }
  };

  return (
    <View
      style={[styles.screen, { paddingTop: top + space[13], paddingBottom: bottom + space[10] }]}
      testID="splash"
    >
      <View style={styles.top}>
        <DevModeBadge />
      </View>
      <View style={styles.middle}>
        <Brand entrance={entrance} testID="splash-brand" />
        <Enter kind="fade" enabled={entrance} delayMs={TAGLINE_AT} testID="splash-tagline">
          <Text style={styles.tagline}>{t('splash.tagline')}</Text>
        </Enter>
      </View>

      {loadError ? (
        <View style={styles.bottom} testID="splash-error">
          <Text style={styles.errorTitle} accessibilityRole="header">
            {t('splash.errorTitle')}
          </Text>
          <Text style={styles.errorBody} accessibilityRole="alert">
            {errorMessage(t, new AccountApiError(loadError))}
          </Text>
          <Button
            label={t('splash.retry')}
            size="lg"
            loading={busy === 'retry'}
            onPress={() => void act('retry')}
            testID="splash-retry"
          />
          <Button
            label={t('splash.signOut')}
            variant="ghost"
            icon="logout"
            loading={busy === 'signOut'}
            onPress={() => void act('signOut')}
            testID="splash-sign-out"
          />
        </View>
      ) : (
        <View style={styles.bottom}>
          <View
            style={styles.loading}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={t('splash.loading')}
            testID="splash-loading"
          >
            <Spinner color={color.accent} size={size.icon.header} />
            <Text style={styles.loadingText}>{t('splash.loading')}</Text>
          </View>
          <View style={styles.tip}>
            <View style={styles.tipChip}>
              <Text style={styles.tipChipText}>{t('splash.tipLabel')}</Text>
            </View>
            <Animated.View style={[styles.tipBox, shownTip.style]}>
              <Text style={styles.tipText} accessibilityLiveRegion="none" testID="splash-tip">
                {splashTip(t, TIPS[shownTip.value]!)}
              </Text>
            </Animated.View>
          </View>
        </View>
      )}
    </View>
  );
}

/**
 * A value that gives way to the next by a cross-fade (TIP_FADE_MS: half out, then the new one half in), so a
 * tip never cuts hard to the next. Reduced Motion: the new one at once.
 */
function useCrossFade(value: number) {
  const reduce = useReduceMotion();
  const [shown, setShown] = useState(value);
  // Reduced Motion: the new value at once (derived during render, no extra effect pass).
  if (reduce && shown !== value) setShown(value);
  const opacity = useSharedValue(1);
  useEffect(() => {
    const half = {
      duration: TIP_FADE_MS / 2,
      easing: curve('standard'),
      reduceMotion: reduceMotionFlag(false),
    };
    if (value === shown) {
      opacity.set(withTiming(1, half));
      return;
    }
    if (reduce) return;
    opacity.set(
      withTiming(0, half, (finished) => {
        if (finished) scheduleOnRN(setShown, value);
      }),
    );
  }, [value, shown, reduce, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return { value: shown, style };
}

const styles = StyleSheet.create({
  overlay: { zIndex: 10, elevation: 10, backgroundColor: color.bg },
  screen: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: tokens.layout.gutterGame,
    backgroundColor: color.bg,
  },
  top: { minHeight: size.touch, alignItems: 'center' },
  middle: { alignItems: 'center', gap: space[8] },
  tagline: { ...text('bodyLong'), color: color.textMuted, textAlign: 'center' },
  bottom: { gap: space[8] },
  loading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[4] },
  loadingText: { ...text('status'), color: color.textMuted },
  tip: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: space[4] },
  tipChip: {
    paddingHorizontal: space[4],
    paddingVertical: space[1],
    borderRadius: radius.xs,
    backgroundColor: color.surface2,
  },
  tipChipText: { ...text('micro'), color: color.accent },
  tipBox: { flexShrink: 1 },
  tipText: { ...text('caption'), color: color.textMuted },
  errorTitle: { ...text('h1'), color: color.text, textAlign: 'center' },
  errorBody: { ...text('body'), color: color.textMuted, textAlign: 'center' },
});
