import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { color, radius, size, tokens } from '../../theme';
import { opaqueOver } from '../../theme/blend';
import { Icon } from '../Icon';
import { Text } from '../ui/Text';
import type { InterferenceModel } from './cardModel';
import { withAlpha } from './format';
import { metrics, paletteAt } from './metrics';
import { interferenceLabel } from './wording';

export interface InterferenceButtonProps {
  /** The opponent's display name, for the label ("הפרעה ל־NinaVolt · עלות 2 נק׳"). */
  name: string;
  state: InterferenceModel;
  /** The compact card's strip version (height 32, a 44-dp target through hitSlop). */
  compact?: boolean;
  /** The interference picker is open from this card. */
  expanded?: boolean;
  /**
   * The 2-player card where the word doesn't fit at its full size beside the activity (statusFit
   * interfereWordFits): the icon alone, 44 × 44, its label as always. Never a shrunken word (QA loop 6).
   */
  iconOnly?: boolean;
  /** Tap when it can be sent: opens the picker aimed at this card (the first of the two taps, D45). */
  onPress?: () => void;
  /**
   * Tap while it can't be sent (short of points, the target busy, the game not running): the screen says why in
   * a short toast with a light haptic (components.md §8.1). While the picker is open it closes it instead.
   */
  onBlockedPress?: (state: InterferenceModel) => void;
  testID?: string;
}

/** My colour, because it is my action (components.md §8.1). */
const ME = paletteAt(0);
const PRESSED_BG = withAlpha(ME.ring, tokens.opacity.iconBadgeFill);

/**
 * The 2-player button sits right on the screen, over the wandering digits (D126), so it is opaque (B12, B50): its
 * fills are the colours their translucent tokens make over the ground, and "blocked" is a veil of the ground's
 * colour over the opaque button (it looks as the button at .5 over the ground), never a see-through button. The
 * compact one sits on its card's opaque surface and stays as drawn.
 */
const FILL = opaqueOver(color.interfere.bg);
const PRESSED_FILL = opaqueOver(PRESSED_BG);

/**
 * The "הפרעה" button on an opponent's card (original §10 "אצל היריב: לחצן הפרעה"; components.md §8.1) [D45]:
 * an icon button in the reactions button's family, as tall as it, with the 'interfere' glyph and the word only.
 * Its price is in the picker and in its accessible label ("הפרעה ל־NinaVolt · עלות 2 נק׳"), not on it. On a
 * 2-player card too narrow for the word at its full size (`iconOnly`), the glyph alone, with the same label.
 *
 * Blocked (short of points, the target under interference or immune, the game not running), it is dimmed and
 * reads as disabled, but a tap still answers, with the reason (`onBlockedPress`). Hidden while the opponent is
 * disconnected (the reconnect pill takes its place) or out of the game. While the picker is open from it, it is
 * filled in my colour and reads "סגירת חלון ההפרעות": a tap closes it.
 */
export function InterferenceButton({
  name,
  state,
  compact = false,
  expanded = false,
  iconOnly = false,
  onPress,
  onBlockedPress,
  testID,
}: InterferenceButtonProps) {
  const { t } = useTranslation('player');
  if (state.kind === 'disconnected' || state.kind === 'out') return null;

  const available = state.kind === 'available';
  const blocked = !available && !expanded;
  const fg = expanded ? color.bg : color.interfere.label;
  const iconColor = expanded ? color.bg : color.interfere.icon;
  const m = metrics.interfere;

  return (
    <Pressable
      onPress={() => (available ? onPress?.() : onBlockedPress?.(state))}
      // Never `disabled`: a blocked tap says why. (Pressable would also overwrite accessibilityState.disabled.)
      hitSlop={compact ? { top: metrics.compact.hitSlop, bottom: metrics.compact.hitSlop } : undefined}
      accessibilityRole="button"
      accessibilityLabel={interferenceLabel(name, state, t, expanded)}
      accessibilityState={{ disabled: !available, expanded }}
      testID={testID}
      style={({ pressed }) => [
        compact ? styles.compact : styles.regular,
        iconOnly && !compact && styles.iconOnly,
        pressed && available && !expanded && { backgroundColor: compact ? PRESSED_BG : PRESSED_FILL },
        expanded && styles.expanded,
        blocked && compact && styles.compactBlocked,
      ]}
    >
      <Icon name="interfere" size={compact ? m.compactIcon : m.icon} color={iconColor} />
      {iconOnly && !compact ? null : (
        <Text
          style={[compact ? m.compactLabelStyle : m.labelStyle, styles.label, { color: fg }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={m.minFontScale}
          testID={testID ? `${testID}-label` : undefined}
        >
          {t('interfere.button')}
        </Text>
      )}
      {blocked && !compact ? (
        <View pointerEvents="none" style={styles.veil} testID={testID ? `${testID}-veil` : undefined} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // It gives way beside a long activity line (B47): the row shares what overflows, and the word shrinks to fit.
  regular: {
    flexShrink: 1,
    minWidth: 0,
    height: size.touch,
    paddingHorizontal: metrics.interfere.paddingX,
    flexDirection: 'row',
    alignItems: 'center',
    gap: metrics.interfere.gap,
    borderRadius: radius.button,
    borderWidth: tokens.border.hairline,
    borderColor: color.interfere.border,
    backgroundColor: FILL,
  },
  // Blocked: the ground's colour over the whole button, its border too, letting .5 of it through.
  veil: {
    position: 'absolute',
    top: -tokens.border.hairline,
    bottom: -tokens.border.hairline,
    start: -tokens.border.hairline,
    end: -tokens.border.hairline,
    borderRadius: radius.button,
    backgroundColor: color.bg,
    opacity: 1 - tokens.opacity.inactivePlayer,
  },
  compact: {
    flex: 1,
    minWidth: 0,
    height: metrics.compact.actionHeight,
    paddingHorizontal: metrics.interfere.compactPaddingX,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: metrics.interfere.compactGap,
    borderRadius: metrics.compact.actionRadius,
    borderWidth: tokens.border.hairline,
    borderColor: color.interfere.border,
    backgroundColor: color.interfere.bg,
  },
  // The icon alone: a 44-dp square like the reactions button beside it, never shrunk by the row.
  iconOnly: {
    width: size.touch,
    flexShrink: 0,
    paddingHorizontal: 0,
    justifyContent: 'center',
  },
  compactBlocked: { opacity: tokens.opacity.inactivePlayer },
  label: { flexShrink: 1 },
  expanded: { backgroundColor: ME.ring, borderColor: ME.ring },
});
