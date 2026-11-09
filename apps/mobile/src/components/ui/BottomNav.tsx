import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { appTypeface, color, radius, size, space, text, tokens, uiFont } from '../../theme';
import { motion, useReduceMotion } from '../../theme/motion';
import { Icon, type IconName } from '../Icon';
import { curve } from './motion';
import { Text } from './Text';

export type NavTab = 'home' | 'leaderboard' | 'history' | 'achievements';

/** Start → end: "בית" · "טבלת מובילים" · "היסטוריה" · "הישגים" (Dir-C-Home). In Hebrew "בית" is rightmost. */
export const NAV_TABS: readonly { key: NavTab; icon: IconName }[] = [
  { key: 'home', icon: 'home' },
  { key: 'leaderboard', icon: 'leaderboard' },
  { key: 'history', icon: 'history' },
  { key: 'achievements', icon: 'trophy' },
];

export interface BottomNavProps {
  active: NavTab;
  onSelect: (tab: NavTab) => void;
  testID?: string;
}

/** The scale the active tab's pill pops in from (VIS-10). */
export const PILL_FROM_SCALE = 0.8;

/**
 * A label wider than its quarter of the bar shrinks, down to 70% as a button's does, instead of ending in "…"
 * ("Achievements" and "Bảng xếp hạng" in a quarter of a 360 phone; QA run #2, after B3; bottomNavFit.test).
 */
export const NAV_LABEL_FIT = { adjustsFontSizeToFit: true, minimumFontScale: 0.7 } as const;

/**
 * The bottom navigation of the home-level screens (components.md §16). Never shown during a game.
 * Height is 64 plus the real bottom safe area (the design draws 20). The active tab (VIS-10) has a pill behind
 * its icon and a bold label as well as the gold; a pressed tab shows the pressed overlay's pill.
 */
export function BottomNav({ active, onSelect, testID }: BottomNavProps) {
  const { t } = useTranslation('ui');
  const { bottom } = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={t('nav.label')}
      testID={testID}
      style={[styles.bar, { height: size.navBar - size.navBarBottomInset + bottom, paddingBottom: bottom }]}
    >
      {NAV_TABS.map(({ key, icon }) => {
        const selected = key === active;
        const label = t(`nav.tabs.${key}`);
        const tabID = testID && `${testID}-${key}`;
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            onPress={() => onSelect(key)}
            testID={tabID}
            style={styles.item}
          >
            {({ pressed }) => {
              const tint = selected ? color.nav.active : pressed ? color.text : color.nav.inactive;
              return (
                <>
                  <View style={styles.iconWrap}>
                    {selected ? (
                      <ActivePill testID={tabID && `${tabID}-pill`} />
                    ) : pressed ? (
                      <View style={[styles.pill, styles.pillPressed]} />
                    ) : null}
                    <Icon name={icon} size={size.icon.nav} color={tint} />
                  </View>
                  <Text
                    style={[styles.label, selected && styles.labelActive, { color: tint }]}
                    numberOfLines={1}
                    {...NAV_LABEL_FIT}
                  >
                    {label}
                  </Text>
                </>
              );
            }}
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * The active tab's pill. Each tab screen draws its own navigation, so the pill pops in as the screen opens (the
 * `pop` spring from 0.8, fading in over 140 ms) instead of sliding between tabs. With Reduced Motion it is simply
 * there.
 */
function ActivePill({ testID }: { testID?: string }) {
  const reduce = useReduceMotion();
  const shown = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) {
      shown.set(1);
      return;
    }
    shown.set(withSpring(1, { ...motion.spring.pop, reduceMotion: ReduceMotion.Never }));
  }, [reduce, shown]);
  const fade = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    fade.set(
      reduce
        ? 1
        : withTiming(1, {
            duration: motion.duration.tapFeedbackMax,
            easing: curve('standard'),
            reduceMotion: ReduceMotion.Never,
          }),
    );
  }, [reduce, fade]);
  const pop = useAnimatedStyle(() => ({
    opacity: fade.get(),
    transform: [{ scale: PILL_FROM_SCALE + (1 - PILL_FROM_SCALE) * shown.get() }],
  }));
  return <Animated.View style={[styles.pill, styles.pillActive, pop]} testID={testID} />;
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingHorizontal: space[4],
    backgroundColor: color.nav.bg,
    borderTopWidth: tokens.border.hairline,
    borderTopColor: color.nav.border,
  },
  item: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[3],
  },
  iconWrap: {
    width: size.navPill.width,
    height: size.navPill.height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.pill,
  },
  pillActive: {
    backgroundColor: color.nav.activePill,
  },
  pillPressed: {
    backgroundColor: color.pressedOverlay,
  },
  label: {
    ...text('label'),
  },
  // The active label in Rubik 700 (VIS-10), the same size, so nothing moves.
  labelActive: uiFont(appTypeface(), '700'),
});
