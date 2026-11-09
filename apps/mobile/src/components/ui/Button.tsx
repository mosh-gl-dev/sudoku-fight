import type { Ref } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type Insets,
  Pressable,
  type StyleProp,
  StyleSheet,
  type TextStyle,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';

import type { FeedbackCue } from '../../services/feedback';
import { color, radius, size, space, text, tokens } from '../../theme';
import { Icon, type IconName } from '../Icon';
import { Spinner } from './Spinner';
import { TactileSurface } from './tactile';
import { Text } from './Text';

/**
 * components.md §1: primary (skewed gold on its gold edge), secondary (a filled slate on its edge), ghost (text)
 * and danger (the red outline, on a red edge).
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
/**
 * Heights: hero 96 · lg 60 · md 52 · modal 48 · sm 40 (`size.ctaHero`, `buttonLg`, `buttonMd`, `buttonModal`,
 * `buttonSm`; sm reaches the 44 touch target with its hit slop). Ghost is always 44.
 */
export type ButtonSize = 'hero' | 'lg' | 'md' | 'modal' | 'sm';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading icon, before the label (the start edge, so it mirrors with the language). */
  icon?: IconName;
  disabled?: boolean;
  /** Shows a spinner, sets `busy`, and ignores presses. */
  loading?: boolean;
  /** Secondary "chip" use: gold border and label (components.md §1.2). */
  selected?: boolean;
  /**
   * Secondary or danger beside the primary in one row: skewed with it, so the two edges between them run
   * parallel (components.md §1.0, the pair rule). The primary is always skewed.
   */
  skew?: boolean;
  /**
   * The press's sound and haptic, played as the press lands. The primary plays "primaryPress" by default
   * (components.md §1.1: a light haptic); the others none, since their screens choose their own. Null: none.
   */
  cue?: FeedbackCue | null;
  /**
   * Not ghost: once the phone's text is large (fontScale ≥ LARGE_TEXT_SCALE), the label may take a second line
   * instead of being cut or shrunk, and the button grows to hold it. Below that the label keeps to one line at
   * the button's height, as every button does. `'always'`: at any text size (a dialog's stacked actions, each
   * the whole width already: ConfirmModal), so a long label is never drawn smaller than its button's text.
   */
  wrapLabel?: boolean | 'always';
  /** Overrides the visible label for screen readers (the visible label is the default). */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  hitSlop?: number | Insets;
  /** Style of the outer box: flex, margins, alignSelf. */
  style?: StyleProp<ViewStyle>;
  testID?: string;
  ref?: Ref<View>;
}

const HEIGHT: Record<ButtonSize, number> = {
  hero: size.ctaHero,
  lg: size.buttonLg,
  md: size.buttonMd,
  modal: size.buttonModal,
  sm: size.buttonSm,
};

/**
 * From this system text scale (Android's "Large" font size and up), a `wrapLabel` button may take two lines.
 * It takes the second only when the label doesn't fit on one, and stays as high as before when it does.
 */
export const LARGE_TEXT_SCALE = 1.15;

/** Rubik 700, 44 / 28 / 22 / 18 / 16. */
const PRIMARY_LABEL: Record<ButtonSize, TextStyle> = {
  hero: text('ctaHero'),
  lg: text('screenTitle'),
  md: text('h1'),
  modal: text('sheetTitle'),
  sm: text('h2'),
};

const ICON_SIZE: Record<ButtonSize, number> = {
  hero: size.icon.nav,
  lg: size.icon.header,
  md: size.icon.card,
  modal: size.icon.inline,
  sm: size.icon.inline,
};

/** A small button's hit slop above and below: 40 high, a 44 touch target. */
const SM_SLOP = (size.touch - size.buttonSm) / 2;

/**
 * A one-line label too long for its button in a long language (German "Neuer Raum" on the A16, localization D124)
 * shrinks, down to 70%, instead of ending in "…". Hebrew and English labels fit, so they never shrink.
 */
const FIT_LABEL = { adjustsFontSizeToFit: true, minimumFontScale: 0.7 } as const;

/** The label's style of a raised (not ghost) button: what a caller measures to know whether it fits. */
export function buttonLabelStyle(variant: Exclude<ButtonVariant, 'ghost'>, sizeName: ButtonSize): TextStyle {
  if (variant === 'primary') return { ...PRIMARY_LABEL[sizeName], ...styles.primaryLabel };
  return text(variant === 'danger' ? 'sheetTitle' : 'button');
}

/** The face's padding on each side of a raised button's label (primaryFace, outlineFace). */
export const buttonLabelInset = (variant: Exclude<ButtonVariant, 'ghost'>): number =>
  variant === 'primary' ? space[10] : space[8];

/*
 * The label's wrapper is a native view of its own at all times (`collapsable={false}`), loading or not (K1,
 * 2026-11-06). Without it, Fabric flattens the plain flex wrapper away and the label sits straight on the face;
 * `loading` adds opacity 0, the wrapper can no longer be flattened, and that one commit has to create it and
 * move the label into it (a Remove from the face and an Insert into the wrapper). Results' "משחק חדש" sets
 * loading in the same commit as router.replace to /match, and on Android that batch, through Reanimated's
 * layout-animation proxy, applied the Insert before the label left the face: addViewAt "View already has a
 * parent", the React host torn down, a dark screen for good. With the wrapper always there, loading is only an
 * opacity update, and no view changes parent. (Until round 1 a constant unskew transform kept it unflattened.)
 */

/**
 * The app's button. One gold primary per screen (components.md §0.6). The primary is skewed −8° in both
 * languages (a brand slant, not a direction cue); its label stands upright on the slanted face. Every raised
 * button is a tactile surface (D125, tactile.tsx): its face sits on a hard edge, sinks onto it when pressed, and
 * springs back.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size: sizeName = 'md',
  icon,
  disabled = false,
  loading = false,
  selected,
  skew = false,
  cue,
  wrapLabel = false,
  accessibilityLabel,
  accessibilityHint,
  hitSlop,
  style,
  testID,
  ref,
}: ButtonProps) {
  const { t } = useTranslation('ui');
  const { fontScale } = useWindowDimensions();
  const twoLines =
    variant !== 'ghost' && (wrapLabel === 'always' || (wrapLabel && fontScale >= LARGE_TEXT_SCALE));

  const spoken = accessibilityLabel ?? label;
  const a11y = {
    accessibilityRole: 'button' as const,
    accessibilityLabel: loading ? t('button.loading', { label: spoken }) : spoken,
    accessibilityHint,
    accessibilityState: {
      disabled,
      busy: loading,
      ...(selected === undefined ? null : { selected }),
    },
    disabled,
    onPress: loading ? undefined : onPress,
    hitSlop: hitSlop ?? (sizeName === 'sm' ? SM_SLOP : undefined),
    testID,
    ref,
  };

  if (variant === 'ghost') {
    return (
      <Pressable
        {...a11y}
        style={({ pressed }) => [
          styles.ghost,
          icon ? styles.ghostWithIcon : styles.ghostTextOnly,
          pressed && styles.ghostPressed,
          disabled && styles.disabled,
          style,
        ]}
      >
        {({ pressed }) => {
          const tint = pressed ? color.text : color.textMuted;
          return (
            <View style={styles.content}>
              {loading ? <Spinner color={tint} size={space[7]} stroke={size.iconStroke} /> : null}
              {icon && !loading ? <Icon name={icon} size={size.icon.card} color={tint} /> : null}
              <Text style={[text(icon ? 'status' : 'buttonSm'), { color: tint }]} numberOfLines={1}>
                {label}
              </Text>
            </View>
          );
        }}
      </Pressable>
    );
  }

  const height = HEIGHT[sizeName];
  // Two lines of a large label: the height becomes a minimum, and the face (and its edge) grow with it.
  const box = twoLines ? { minHeight: height } : { height };
  const faceTestID = testID && `${testID}-face`;

  if (variant === 'primary') {
    const tint = disabled ? color.tactile.disabledLabel : color.onAccent;
    return (
      <TactileSurface
        {...a11y}
        kind="gold"
        skew
        inert={loading}
        cue={cue === undefined ? 'primaryPress' : cue}
        style={[box, style]}
        faceStyle={[styles.primaryFace, box, twoLines && styles.primaryFaceTall]}
        edgeTestID={testID && `${testID}-shadow`}
        faceTestID={faceTestID}
      >
        {() => (
          <>
            <View
              style={[styles.content, loading && styles.hidden]}
              collapsable={false}
              testID={testID && `${testID}-content`}
            >
              {icon ? <Icon name={icon} size={ICON_SIZE[sizeName]} color={tint} /> : null}
              <Text
                style={[
                  PRIMARY_LABEL[sizeName],
                  styles.primaryLabel,
                  { color: tint },
                  twoLines && styles.labelWrap,
                ]}
                numberOfLines={twoLines ? 2 : 1}
                {...(twoLines ? null : FIT_LABEL)}
                testID={testID && `${testID}-label`}
              >
                {label}
              </Text>
            </View>
            {loading ? (
              <View style={styles.spinnerOverlay}>
                <Spinner color={tint} stroke={tokens.border.lockRing} size={size.icon.header} />
              </View>
            ) : null}
          </>
        )}
      </TactileSurface>
    );
  }

  // Secondary and danger: a filled slate, or the red outline, each on its own edge.
  const danger = variant === 'danger';
  const tint = disabled
    ? color.tactile.disabledLabel
    : danger
      ? color.danger
      : selected
        ? color.accent
        : color.text;
  return (
    <TactileSurface
      {...a11y}
      kind={danger ? 'danger' : 'slate'}
      skew={skew}
      selected={selected}
      inert={loading}
      cue={cue ?? null}
      style={[box, style]}
      faceStyle={[styles.outlineFace, box, twoLines && styles.primaryFaceTall]}
      edgeTestID={testID && `${testID}-edge`}
      faceTestID={faceTestID}
    >
      {() => (
        <>
          <View
            style={[styles.content, loading && styles.hidden]}
            collapsable={false}
            testID={testID && `${testID}-content`}
          >
            {icon ? (
              <Icon name={icon} size={danger ? size.icon.inline : size.icon.card} color={tint} />
            ) : null}
            <Text
              style={[
                text(danger ? 'sheetTitle' : 'button'),
                { color: tint },
                twoLines && styles.outlineLabelWrap,
              ]}
              numberOfLines={twoLines ? 2 : 1}
              {...(twoLines ? null : FIT_LABEL)}
              testID={testID && `${testID}-label`}
            >
              {label}
            </Text>
          </View>
          {loading ? (
            <View style={styles.spinnerOverlay}>
              <Spinner color={tint} size={size.icon.card} />
            </View>
          ) : null}
        </>
      )}
    </TactileSurface>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: tokens.opacity.disabled,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[4],
  },
  hidden: {
    opacity: 0,
  },
  spinnerOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryFace: {
    justifyContent: 'center',
    paddingHorizontal: space[10],
  },
  primaryFaceTall: {
    paddingVertical: space[4],
  },
  primaryLabel: {
    textAlign: 'center',
  },
  labelWrap: {
    flexShrink: 1,
  },
  outlineFace: {
    justifyContent: 'center',
    paddingHorizontal: space[8],
  },
  outlineLabelWrap: {
    flexShrink: 1,
    textAlign: 'center',
  },
  ghostPressed: {
    backgroundColor: color.pressedOverlay,
  },
  ghost: {
    height: size.buttonGhost,
    justifyContent: 'center',
    borderRadius: radius.button,
  },
  ghostTextOnly: {
    paddingHorizontal: space[2],
  },
  ghostWithIcon: {
    paddingHorizontal: space[8],
  },
});
