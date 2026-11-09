import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { color, text } from '../../theme';
import { motion, useReduceMotion } from '../../theme/motion';
import { Icon } from '../Icon';
import { FONT_SCALE_CAPS, Text } from '../ui/Text';
import { easing, NEVER_REDUCE, springs, useBlink } from './anim';
import type { Activity } from './cardModel';
import { ltr } from './format';
import { metrics, paletteAt } from './metrics';
import { TimerRing } from './TimerRing';
import { activityTrails, activityWord, type Gender, mistakesShort } from './wording';

const hidden = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

/**
 * B47: the status row of a 2-player card holds what its buttons leave (63 dp beside mine), and German, Russian or
 * Thai words are longer ("Keine Fehler", "Без ошибок"). They wrap to a second line where they can, then shrink a
 * little, and are cut only past that.
 */
const FIT = { adjustsFontSizeToFit: true, minimumFontScale: metrics.card.statusMinFontScale } as const;

export interface ActivityLineProps {
  activity: Activity;
  colorIndex: number;
  gender?: Gender;
  /** The compact card: a 16-dp ring with the seconds inside, the cell in Teko 17 (§7.2). */
  compact?: boolean;
}

/**
 * What a player is doing (components.md §3.3): "בוחרת · A8" with the lock's timer ring, "מושהה · A8",
 * "חושב…" with a blinking ellipsis, "מתנתק…", "נטש". Silent for screen readers: the card's label says it.
 */
export function ActivityLine({ activity, colorIndex, gender, compact = false }: ActivityLineProps) {
  const { t } = useTranslation('player');
  const reduce = useReduceMotion();
  const trails = activityTrails(activity);
  const blink = useBlink(trails, reduce, motion.loop.statusBlink);
  if (activity.kind === 'idle') return null;

  const word = activityWord(activity, t, gender);
  const lock = activity.kind === 'locking' ? activity : null;
  const wordStyle = compact ? text('plateNameCompact') : text('body');
  const ring = compact ? metrics.timerRing.compact : metrics.timerRing.card;

  return (
    <View
      style={[styles.row, compact ? styles.compactRow : trails && styles.trailing]}
      {...hidden}
      testID="activity"
    >
      {lock ? (
        <TimerRing
          size={ring}
          tint={paletteAt(colorIndex).ring}
          remainingMs={lock.remainingMs}
          expiresAt={lock.expiresAt}
          totalMs={lock.totalMs}
          seconds={compact ? lock.secondsLeft : null}
          testID="activity-ring"
        />
      ) : null}
      {compact ? (
        // The compact card's row grows with the text only up to the HUD's cap (BRD-3): "חושב" at the largest
        // system size was taller than the row and lost its top (QA 2026-11-03, the replay's cards).
        <>
          <Text scale="hud" style={[wordStyle, styles.muted]} numberOfLines={1}>
            {word}
          </Text>
          {lock ? (
            <Text scale="hud" style={[metrics.compact.cellStyle, styles.strong]}>
              {lock.cell}
            </Text>
          ) : null}
        </>
      ) : (
        // A lone word shrinks on its line (a second line would cut it in the middle); with a cell, the cell may
        // take the second line.
        <Text style={[wordStyle, styles.muted, styles.shrink]} numberOfLines={lock ? 2 : 1} {...FIT}>
          {word}
          {lock ? t('sep') : null}
          {lock ? <Text style={styles.strong}>{ltr(lock.cell)}</Text> : null}
        </Text>
      )}
      {trails ? (
        <Animated.Text
          maxFontSizeMultiplier={compact ? FONT_SCALE_CAPS.hud : undefined}
          style={[wordStyle, styles.muted, blink]}
        >
          {t('ellipsis')}
        </Animated.Text>
      ) : null}
    </View>
  );
}

/**
 * My mistake count on the 2P card ("1 טעות", components.md §3.2). A new mistake pops it (.8 → 1) and turns it
 * red for 600 ms (motion.md `mistakes.tag`); reduced motion keeps the colour and drops the pop.
 * `mark`: where the words don't fit at their full size (statusFit mistakesWordsFit; 320 dp in English, QA loop
 * 6), the mistake mark and the count in Teko, never a word broken or shrunk. The card's label says it in words.
 */
export function MistakesText({ count, mark = false }: { count: number; mark?: boolean }) {
  const { t } = useTranslation('player');
  const reduce = useReduceMotion();
  const scale = useSharedValue(1);
  const red = useSharedValue(0);
  const last = useRef(count);
  useEffect(() => {
    const before = last.current;
    last.current = count;
    if (count <= before) return;
    red.set(1);
    red.set(
      withDelay(
        metrics.mistakeFlashMs,
        withTiming(0, {
          duration: motion.duration.stateChange,
          easing: easing.standard,
          reduceMotion: NEVER_REDUCE,
        }),
        NEVER_REDUCE,
      ),
    );
    if (!reduce) {
      scale.set(metrics.mistakePopFrom);
      scale.set(withSpring(1, { ...springs.pop, reduceMotion: NEVER_REDUCE }));
    }
  }, [count, reduce, red, scale]);
  const anim = useAnimatedStyle(() => ({
    color: interpolateColor(red.get(), [0, 1], [color.textMuted, color.danger]),
    transform: [{ scale: scale.get() }],
  }));
  if (mark) {
    return (
      <View style={styles.mark} {...hidden} testID="mistakes-mark">
        <Icon name="cancel" size={metrics.card.mistakesMarkIcon} color={color.textMuted} />
        <Animated.Text style={[text('scoreDelta'), anim]} numberOfLines={1} testID="mistakes">
          {count}
        </Animated.Text>
      </View>
    );
  }
  return (
    <Animated.Text
      style={[text('body'), styles.shrink, anim]}
      numberOfLines={2}
      {...FIT}
      {...hidden}
      testID="mistakes"
    >
      {mistakesShort(count, t)}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: metrics.card.statusGap,
    flexShrink: 1,
    minWidth: 0,
  },
  compactRow: { gap: metrics.compact.activityGap },
  // "חושבת…" (components.md §3.3): the blinking ellipsis follows its word with no gap (there is no ring then).
  trailing: { gap: 0 },
  muted: { color: color.textMuted },
  strong: { color: color.text },
  shrink: { flexShrink: 1 },
  mark: { flexDirection: 'row', alignItems: 'center', gap: metrics.card.mistakesMarkGap, flexShrink: 0 },
});
