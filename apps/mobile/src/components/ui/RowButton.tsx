import type { Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { color, size, space, text } from '../../theme';
import { Icon, type IconName } from '../Icon';
import { Spinner } from './Spinner';
import { PressableCard } from './tactile';
import { Text } from './Text';

export interface RowButtonProps {
  icon: IconName;
  title: string;
  /** Second line, e.g. "מדורג · 2 שחקנים · רגיל". */
  subtitle?: string;
  onPress?: () => void;
  disabled?: boolean;
  /** Replaces the chevron with a spinner, sets `busy`, and ignores presses. */
  loading?: boolean;
  /** Chip-like use: gold border and title (components.md §1.2). */
  selected?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  ref?: Ref<View>;
}

/**
 * The full-width list row of Dir-C-Home ("עוד סיבוב"): icon, title over subtitle, and a chevron that points the
 * way reading goes (left in Hebrew). Everything sits in a `row`, so React Native mirrors it with the language.
 * Since D125 it is a tappable card (VIS-2): the card surface on its base, with the one card press. Its own
 * screen plays its sound, so the card plays none.
 */
export function RowButton({
  icon,
  title,
  subtitle,
  onPress,
  disabled = false,
  loading = false,
  selected,
  accessibilityHint,
  style,
  testID,
  ref,
}: RowButtonProps) {
  const { t } = useTranslation('ui');
  const label = subtitle ? t('row.label', { title, subtitle }) : title;
  const faint = disabled ? styles.faint : null;
  return (
    <PressableCard
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={loading ? t('button.loading', { label }) : label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        disabled,
        busy: loading,
        ...(selected === undefined ? null : { selected }),
      }}
      disabled={disabled}
      selected={selected}
      cue={null}
      onPress={loading ? undefined : onPress}
      testID={testID}
      style={[styles.row, style]}
    >
      <Icon name={icon} size={size.icon.row} color={disabled ? color.iconFaint : color.textMuted} />
      <View style={styles.texts}>
        <Text style={[styles.title, selected && styles.titleSelected, faint]} numberOfLines={ROW_TITLE_LINES}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, faint]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {loading ? (
        <Spinner color={color.text} size={size.icon.chevron} />
      ) : (
        <Icon name="chevronForward" size={size.icon.chevron} color={color.iconFaint} />
      )}
    </PressableCard>
  );
}

/**
 * The title takes a second line, broken between words, rather than ending in "…" (QA 2026-11-03: en-XA's "[Ĥîðé
 * ťĥé ťéšťîñĝ šéçťîöñ one t…" in Settings). Two lines of it and the subtitle still fit the row's 64.
 */
export const ROW_TITLE_LINES = 2;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[7],
    // The least: a taller script (Thai, Arabic) may need more, never cut (localization plan 0ט).
    minHeight: size.listRow,
    paddingHorizontal: space[8],
  },
  texts: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
    gap: space[2],
  },
  title: {
    ...text('rowTitle'),
    color: color.text,
  },
  titleSelected: {
    color: color.accent,
  },
  subtitle: {
    ...text('caption'),
    color: color.textMuted,
  },
  // Disabled: no base and no press; the words go to the faint level (never a faded row).
  faint: {
    color: color.tactile.disabledLabel,
  },
});
