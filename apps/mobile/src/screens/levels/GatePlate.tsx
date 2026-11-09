import type { GateState } from '@sudoku-fight/engine';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { Icon } from '../../components/Icon';
import { MiniBar } from '../../components/levels/MiniBar';
import { Star, STAR_SIZES } from '../../components/levels/StarRow';
import { ltr } from '../../components/player/format';
import { curve } from '../../components/ui/motion';
import { cardStyle } from '../../components/ui/tactile';
import { Text } from '../../components/ui/Text';
import { color, radius, size, space, text, tokens } from '../../theme';
import { motion, reduceMotionFlag, useReduceMotion } from '../../theme/motion';
import type { LevelsT } from './levelWording';
import { MAP, type PlateState, plateState } from './mapModel';

/**
 * The gate's sign (components.md §19.3; the Map-Gate board, and since 31.10.2026 the sign that hangs under a
 * chapter's banner in its gateway, ChapterGateway), standing for the gate at the end of the chapter before:
 * - **closed:** a dashed plate: "נפתח ב־20 כוכבים" across its whole width (up to two lines: beside the count it
 *   was cut to "נפתח ב־20 כו…" on the phone, 31.10.2026), and under it a lock, a gold bar and "17/20";
 * - **enough stars, the boss not played:** "22/20" and "שחק את שלב הבוס כדי לפתוח" (the gate stays shut
 *   without the boss, plan §4.5);
 * - **open:** a solid raised pill (the L1 card of D125), an open lock and "פרק 5 פתוח".
 * A button: a closed plate opens the gate sheet, an open one shows the chapter in the panel. The first time it is
 * seen open (`unlocking`) the shackle lifts and the words fade in (`level.gate.unlock`); Reduced Motion: only
 * the state changes.
 */

export interface GatePlateProps {
  /** The chapter the gate opens (the plate sits under its header). */
  chapter: number;
  /** The gate at the end of the chapter before (gateState). */
  gate: GateState;
  /** Width and height from the map's layout (220 × 44 closed; open, a 168 × 44 touch box round its pill). */
  width: number;
  height: number;
  selected: boolean;
  /** It has just opened: play the unlock once. */
  unlocking?: boolean;
  onPress: () => void;
}

/** The closed plate's inner side margins. */
const PAD_X = space[6];

/**
 * The closed plate's words ("נפתח ב־20 כוכבים", or the boss's line): the plate's whole inner width, up to two
 * lines, in buttonSm. A layout test measures every language's words against it (__tests__/gatePlate.test.tsx);
 * the plate grows to two lines, at most MAP.sign.closed.face high (the tallest script's two lines).
 */
export const GATE_SIGN_TEXT = {
  width: MAP.sign.closed.w - 2 * PAD_X - 2 * tokens.border.hairline,
  lines: 2,
  type: 'buttonSm',
} as const;

/** The plate's label: "פרק 5 נעול, 17 מתוך 20 כוכבים בפרק 4". */
export function gatePlateLabel(chapter: number, gate: GateState, state: PlateState, t: LevelsT): string {
  // Plurals of the stars the gate needs.
  const values = { n: chapter, prev: chapter - 1, stars: gate.stars, need: gate.need, count: gate.need };
  if (state === 'open') return t('gate.openLabel', values);
  return t(state === 'bossMissing' ? 'gate.bossLabel' : 'gate.lockedLabel', values);
}

export function GatePlate({
  chapter,
  gate,
  width,
  height,
  selected,
  unlocking = false,
  onPress,
}: GatePlateProps) {
  const { t } = useTranslation('levels');
  const state = plateState(gate);
  const label = gatePlateLabel(chapter, gate, state, t);
  const testID = `gate-${chapter}`;
  if (state === 'open') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        onPress={onPress}
        style={[styles.open, { width, height }]}
        testID={testID}
      >
        <View style={[styles.openPill, selected && styles.selected]} testID={`${testID}-open`}>
          <Unlocking unlocking={unlocking} />
          <Text style={styles.openText} numberOfLines={1}>
            {t('gate.open', { n: chapter })}
          </Text>
        </View>
      </Pressable>
    );
  }
  // Hung from the top of its box (the chains reach its top corners), as tall as its words need: never under a
  // touch target, never past the box.
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.closed, { width, maxHeight: height }, selected && styles.selected]}
      testID={testID}
    >
      <Text style={styles.need} numberOfLines={GATE_SIGN_TEXT.lines} testID={`${testID}-line`}>
        {state === 'bossMissing' ? t('gate.boss') : t('gate.need', { count: gate.need, need: gate.need })}
      </Text>
      <View style={styles.progress}>
        <Icon name="lock" size={size.icon.inline} color={color.textMuted} />
        <View style={styles.bar}>
          <MiniBar share={gate.stars / gate.need} testID={`${testID}-bar`} />
        </View>
        <View style={styles.count}>
          <Star filled size={STAR_SIZES.panel} />
          <Text style={styles.countText} testID={`${testID}-count`}>
            {ltr(t('gate.count', { stars: gate.stars, need: gate.need }))}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

/** The open lock; the first time, its shackle lifts (a turn and a fade), then the words come. */
function Unlocking({ unlocking }: { unlocking: boolean }) {
  const reduce = useReduceMotion();
  const moving = unlocking && !reduce;
  const lift = useSharedValue(moving ? 0 : 1);
  useEffect(() => {
    if (!moving) {
      lift.set(1);
      return;
    }
    lift.set(
      withDelay(
        motion.duration.reducedFade,
        withTiming(1, {
          duration: UNLOCK_MS,
          easing: curve('emphasized'),
          reduceMotion: reduceMotionFlag(false),
        }),
        reduceMotionFlag(false),
      ),
    );
  }, [moving, lift]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.4 + 0.6 * lift.get(),
    transform: [{ rotate: `${(1 - lift.get()) * -20}deg` }, { translateY: (1 - lift.get()) * 2 }],
  }));
  return (
    <Animated.View style={style} testID="gate-unlock-icon">
      <Icon name="unlock" size={OPEN_ICON} color={color.textMuted} />
    </Animated.View>
  );
}

/** motion.md `level.gate.unlock`: the shackle 360 ms. */
const UNLOCK_MS = 360;
const OPEN_ICON = 14;
const OPEN_PILL = 32;

const styles = StyleSheet.create({
  closed: {
    justifyContent: 'center',
    gap: space[2],
    minHeight: size.touch,
    paddingHorizontal: PAD_X,
    paddingVertical: space[2],
    borderRadius: radius.lg,
    borderWidth: tokens.border.hairline,
    borderStyle: 'dashed',
    borderColor: color.iconFaint,
    backgroundColor: color.surface,
  },
  selected: { borderColor: color.text, borderTopColor: color.text },
  need: { ...text(GATE_SIGN_TEXT.type), color: color.text, textAlign: 'center' },
  progress: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  bar: { flex: 1, minWidth: 0 },
  count: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  countText: { ...text('scoreDelta'), color: color.text },
  open: { alignItems: 'center', justifyContent: 'center' },
  openPill: {
    ...cardStyle({ pressed: false, disabled: false }),
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    // The least: a taller script may need more, never cut (localization plan 0ט).
    minHeight: OPEN_PILL,
    paddingHorizontal: space[6],
    borderRadius: radius.pill,
  },
  openText: { ...text('label'), color: color.text },
});
