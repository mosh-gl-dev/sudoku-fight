import { Pressable, StyleSheet } from 'react-native';

import { color, size, tokens } from '../../theme';
import { Icon, type IconName } from '../Icon';
import { TactileSurface } from '../ui/tactile';
import { metrics } from './metrics';

export interface CardIconButtonProps {
  icon: IconName;
  /** Required: the button has no visible text. */
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  /** The reaction rate limit [D19]: disabled and at .5 for its 2 s. */
  coolingDown?: boolean;
  /** The reactions picker is open. */
  expanded?: boolean;
  /** The compact card's 32-dp strip button (a 44-dp target through hitSlop). */
  compact?: boolean;
  testID?: string;
}

/**
 * The 44 × 44 icon button of a card (components.md §1.4), and its compact form (§7.2). The 44 dp one is the
 * app's icon button since D125 (components.md §0.7): slate on its 2 dp edge, with the one press, so "כניעה" and
 * "תגובות" look the same in a game and in a staged practice's HUD (IconButton). The compact strip button stays
 * flat: its 32 dp row has no room for an edge.
 */
export function CardIconButton({
  icon,
  label,
  onPress,
  disabled = false,
  coolingDown = false,
  expanded,
  compact = false,
  testID,
}: CardIconButtonProps) {
  const off = disabled || coolingDown;
  const resting = off && {
    opacity: coolingDown && !disabled ? tokens.opacity.inactivePlayer : tokens.opacity.disabled,
  };
  const a11y = {
    onPress,
    disabled: off,
    accessibilityRole: 'button' as const,
    accessibilityLabel: label,
    accessibilityState: { disabled: off, ...(expanded === undefined ? null : { expanded }) },
    testID,
  };
  const glyph = (pressed: boolean) => (
    <Icon
      name={icon}
      size={compact ? metrics.compact.actionIcon : size.icon.card}
      color={pressed || expanded ? color.text : color.textMuted}
    />
  );

  if (!compact) {
    return (
      <TactileSurface
        {...a11y}
        kind="icon"
        expanded={expanded}
        edgeTestID={testID && `${testID}-edge`}
        faceTestID={testID && `${testID}-face`}
        style={[styles.box, resting]}
        faceStyle={styles.face}
      >
        {({ pressed }) => glyph(pressed)}
      </TactileSurface>
    );
  }

  const slop = { top: metrics.compact.hitSlop, bottom: metrics.compact.hitSlop };
  return (
    <Pressable
      {...a11y}
      hitSlop={slop}
      style={({ pressed }) => [
        styles.compact,
        (pressed || expanded) && styles.active,
        expanded && styles.expanded,
        resting,
      ]}
    >
      {({ pressed }) => glyph(pressed)}
    </Pressable>
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
  compact: {
    flex: 1,
    minWidth: 0,
    height: metrics.compact.actionHeight,
    borderRadius: metrics.compact.actionRadius,
    borderWidth: tokens.border.hairline,
    borderColor: color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: { backgroundColor: color.surface2 },
  expanded: { borderColor: color.textMuted },
});
