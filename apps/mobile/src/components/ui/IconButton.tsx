import type { Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { type Insets, Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { color, radius, size } from '../../theme';
import { Icon, type IconName } from '../Icon';
import { Spinner } from './Spinner';
import { TactileSurface } from './tactile';

export interface IconButtonProps {
  icon: IconName;
  /** Required: an icon alone says nothing to a screen reader ("הגדרות", "כניעה", "תגובות", "סגירה"). */
  accessibilityLabel: string;
  onPress?: () => void;
  /** 20 inside a card (default), 22 in a header (components.md §1.4). */
  iconSize?: 'card' | 'header';
  disabled?: boolean;
  /** Shows a spinner, sets `busy`, and ignores presses. */
  loading?: boolean;
  /** For a button that opens something (the reactions picker): sets `expanded` and the open look. */
  expanded?: boolean;
  /**
   * A quiet icon inside a panel of its own (a tip's close): no face and no edge, only the pressed overlay, as
   * the ghost button.
   */
  plain?: boolean;
  accessibilityHint?: string;
  hitSlop?: number | Insets;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  ref?: Ref<View>;
}

/**
 * The 44×44 icon button (settings, surrender, reactions, close; components.md §1.4): the slate surface of D125
 * on a 2 dp edge, which it sinks onto when pressed.
 */
export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  iconSize = 'card',
  disabled = false,
  loading = false,
  expanded,
  plain = false,
  accessibilityHint,
  hitSlop,
  style,
  testID,
  ref,
}: IconButtonProps) {
  const { t } = useTranslation('ui');
  const a11y = {
    ref,
    accessibilityRole: 'button' as const,
    accessibilityLabel: loading ? t('button.loading', { label: accessibilityLabel }) : accessibilityLabel,
    accessibilityHint,
    accessibilityState: {
      disabled,
      busy: loading,
      ...(expanded === undefined ? null : { expanded }),
    },
    disabled,
    onPress: loading ? undefined : onPress,
    hitSlop,
    testID,
  };
  const glyph = (pressed: boolean) =>
    loading ? (
      <Spinner color={color.textMuted} size={size.icon.inline} />
    ) : (
      <Icon
        name={icon}
        size={iconSize === 'header' ? size.icon.header : size.icon.card}
        color={disabled ? color.tactile.disabledLabel : pressed || expanded ? color.text : color.textMuted}
      />
    );
  if (plain) {
    return (
      <Pressable
        {...a11y}
        style={({ pressed }) => [styles.face, styles.plain, pressed && styles.plainDown, style]}
      >
        {({ pressed }) => glyph(pressed)}
      </Pressable>
    );
  }
  return (
    <TactileSurface
      {...a11y}
      kind="icon"
      expanded={expanded}
      inert={loading}
      edgeTestID={testID && `${testID}-edge`}
      faceTestID={testID && `${testID}-face`}
      style={[styles.box, style]}
      faceStyle={styles.face}
    >
      {({ pressed }) => glyph(pressed)}
    </TactileSurface>
  );
}

const styles = StyleSheet.create({
  box: {
    width: size.iconButton,
    height: size.iconButton,
  },
  face: {
    width: size.iconButton,
    height: size.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plain: {
    borderRadius: radius.button,
  },
  plainDown: {
    backgroundColor: color.pressedOverlay,
  },
});
