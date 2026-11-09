import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type NativeSyntheticEvent,
  type StyleProp,
  StyleSheet,
  type TextLayoutEventData,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';

import { Icon, type IconName } from '../../components/Icon';
import { IconButton, LARGE_TEXT_SCALE } from '../../components/ui';
import { Text } from '../../components/ui/Text';
import { color, radius, size, space, text, tokens } from '../../theme';

/**
 * Small pieces shared by the home-level screens, in direction C: flat surfaces, 1 dp borders, no skew
 * (components.md §0.1). They follow the app direction: every row is a plain `row`, mirrored in Hebrew.
 */

/** Side gutters: 24 on Home (Dir-C-Home), 16 on the other screens (Modes, GameType). */
export const GUTTER = {
  home: tokens.layout.gutterHome,
  screen: tokens.layout.gutterGame,
} as const;

/** The back button of a header: the 44×44 icon button with the chevron turned to point back. */
export function BackButton({
  onPress,
  label,
  testID = 'back',
}: {
  onPress: () => void;
  /** What it says to a screen reader; "חזרה" by default ("חזרה להתחברות" on the registration). */
  label?: string;
  testID?: string;
}) {
  const { t } = useTranslation('home');
  return (
    <IconButton
      icon="chevronForward"
      iconSize="header"
      accessibilityLabel={label ?? t('header.back')}
      onPress={onPress}
      // The box is symmetric, so turning it over only turns the chevron: "forward" becomes "back" in both
      // directions (left in English, right in Hebrew).
      style={styles.flip}
      testID={testID}
    />
  );
}

export interface ScreenHeaderProps {
  title: string;
  /** A line under the title, e.g. the mode on the game-type screen. */
  subtitle?: string;
  onBack?: () => void;
  /** Something at the end of the row (an avatar, a button). */
  end?: ReactNode;
  /**
   * The title may take two lines and a smaller size, never a word cut in the middle (WrappingTitle): a long
   * title beside a wide end item. Off, one line ended with "…".
   */
  wrapTitle?: boolean;
  /**
   * The one-line title first, and whole (B3: "Новая парт…" beside my name on "משחק חדש"): it takes its width
   * before the end item, which gets the rest (`flexGrow: 1, flexBasis: 0` in its own style); a title wider than
   * the row shrinks, down to 70% as a button's label does (TITLE_FIT), instead of ending in "…".
   */
  fitTitle?: boolean;
  /**
   * The subtitle takes as many lines as it needs, broken between words (the replay's "אימון מול בוט · מהיר ·
   * היום" at the largest text size, QA 2026-11-03). Off, one line ended with "…".
   */
  wrapSubtitle?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Back button, title and an optional end item, 56 high (the Modes and GameType boards). */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  end,
  wrapTitle = false,
  fitTitle = false,
  wrapSubtitle = false,
  style,
}: ScreenHeaderProps) {
  return (
    <View style={[styles.header, style]}>
      {onBack ? <BackButton onPress={onBack} /> : null}
      <View style={[styles.titles, fitTitle ? styles.titlesFirst : styles.titlesRest]}>
        {wrapTitle ? (
          <WrappingTitle title={title} />
        ) : (
          <Text
            accessibilityRole="header"
            style={styles.title}
            numberOfLines={1}
            {...(fitTitle ? TITLE_FIT : null)}
          >
            {title}
          </Text>
        )}
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={wrapSubtitle ? undefined : 1} testID="screen-subtitle">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {end}
    </View>
  );
}

/** A title that comes first (ScreenHeader `fitTitle`): one line, shrunk to fit down to 70% (Button's FIT_LABEL). */
export const TITLE_FIT = { adjustsFontSizeToFit: true, minimumFontScale: 0.7 } as const;

/** A wrapping title (ScreenHeader `wrapTitle`): up to two lines, its size stepping down to `minSize`. */
export const TITLE_WRAP = { lines: 2, step: 2, minSize: 18 } as const;

/**
 * Whether `lines` (a title as the phone laid it out, onTextLayout) hold all of `title` on at most `max` lines,
 * each break between two words (counted without spaces: a line may or may not keep the space it broke at). A
 * language without spaces (Japanese, Chinese, Thai) breaks inside its one word: it gets one line.
 */
export function wrapsWhole(title: string, lines: readonly string[], max: number = TITLE_WRAP.lines): boolean {
  const solid = (s: string) => s.replace(/\s+/g, '');
  if (lines.length === 0 || lines.length > max || solid(lines.join('')) !== solid(title)) return false;
  // Where the words meet, in letters from the start; every break must be one of them.
  let letters = 0;
  const seams = new Set(
    title
      .trim()
      .split(/\s+/)
      .map((word) => (letters += word.length)),
  );
  letters = 0;
  return lines.slice(0, -1).every((line) => seams.has((letters += solid(line).length)));
}

/**
 * A title that may take two lines, never cut in the middle of a word (B7: "אימון בשלבים" beside the map's
 * "★ 8/900" chip ended in "…" in 12 languages; German's one long word). It starts at screenTitle's size and
 * steps down while the phone lays it out on more lines or breaks a word (onTextLayout, the lines as drawn),
 * down to TITLE_WRAP.minSize, where two lines and "…" are the last resort.
 */
function WrappingTitle({ title }: { title: string }) {
  const full = styles.title.fontSize!;
  const [fit, setFit] = useState({ title, size: full });
  // Another title (another language) starts again at the full size (derived during render).
  if (fit.title !== title) setFit({ title, size: full });
  const at = fit.title === title ? fit.size : full;
  const last = at <= TITLE_WRAP.minSize;
  const onTextLayout = (e: NativeSyntheticEvent<TextLayoutEventData>) => {
    const drawn = e.nativeEvent.lines.map((line) => line.text);
    if (last || wrapsWhole(title, drawn)) return;
    const smaller = Math.max(TITLE_WRAP.minSize, at - TITLE_WRAP.step);
    // Once per size: a second layout of the same size steps no further.
    setFit((f) => (f.title === title && f.size === at ? { title, size: smaller } : f));
  };
  return (
    <Text
      accessibilityRole="header"
      style={[styles.title, { fontSize: at, lineHeight: (styles.title.lineHeight! * at) / full }]}
      // Every line while it fits (the measure counts them); two at the least size.
      numberOfLines={last ? TITLE_WRAP.lines : undefined}
      onTextLayout={onTextLayout}
      testID="screen-title"
    >
      {title}
    </Text>
  );
}

/**
 * A section's note takes a second line, broken between words, rather than ending in "…" (QA 2026-11-03: en-XA's
 * "[Ŕéåļ öþþöñéñťš, îñ ŕéåļ ťîmé one t…"), and the rule before it keeps SECTION_RULE_MIN ("title ——— note"). A
 * real language says it on one line (modesFit.test, D124); the second line is for a longer one.
 */
export const SECTION_NOTE_LINES = 2;
export const SECTION_RULE_MIN = space[8];

/**
 * A capped text's lines at the phone's text size: the design's cap (`lines`) at the normal size; none once the
 * text is large (fontScale ≥ LARGE_TEXT_SCALE, as the app's Button), where the words wrap to every line they need
 * rather than end in "…" (QA levels-new-game-small-phone: "Real opponents, in …", "Practice vs b…" and
 * "אימון לבד • לוח …" at font scale 2.0 on a 360 dp phone; the lists there scroll).
 */
export const linesAt = (fontScale: number, lines: number): number | undefined =>
  fontScale >= LARGE_TEXT_SCALE ? undefined : lines;

/** A section's title with a rule that runs to the end, and an optional note after it ("מדורג ——— …"). */
export function SectionLabel({ title, note, icon }: { title: string; note?: string; icon?: IconName }) {
  const { fontScale } = useWindowDimensions();
  return (
    <View style={styles.section}>
      {icon ? <Icon name={icon} size={size.icon.inline} color={color.textMuted} /> : null}
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      <View style={[styles.rule, note ? styles.ruleBeforeNote : null]} />
      {note ? (
        <Text style={styles.sectionNote} numberOfLines={linesAt(fontScale, SECTION_NOTE_LINES)}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}

export interface ChipProps {
  label: string;
  /** An icon after the label, and a value after it in the text colour ("שלב 14 · ★ 29", Modes-Levels). */
  icon?: IconName;
  iconColor?: string;
  /** The icon drawn filled (a star earned). */
  iconFilled?: boolean;
  /** Latin and LTR (a number). */
  value?: string;
  testID?: string;
}

/** A small flat tag ("ללא דירוג", "בקרוב", "הופסק"), or one with an icon and a value ("שלב 14 · ★ 29"). */
export function Chip({
  label,
  icon,
  iconColor = color.textMuted,
  iconFilled = false,
  value,
  testID,
}: ChipProps) {
  const { fontScale } = useWindowDimensions();
  const grown = chipSizeAt(fontScale);
  const words = (
    <Text style={[styles.chipText, styles.chipWords]} numberOfLines={linesAt(fontScale, 1)}>
      {label}
    </Text>
  );
  // A plain tag is its words alone (as before the icon chips: the bot selection reads it so).
  if (icon === undefined && value === undefined) {
    return (
      <View style={[styles.chip, grown]} testID={testID}>
        {words}
      </View>
    );
  }
  return (
    <View style={[styles.chip, grown, styles.chipRow]} testID={testID}>
      {words}
      {icon ? <Icon name={icon} size={CHIP.icon} color={iconColor} filled={iconFilled} /> : null}
      {value !== undefined ? (
        <Text style={[styles.chipText, styles.chipValue]} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * A chip's height at the phone's text size: the design's 22 (CHIP.height) at the normal size, growing with the
 * text, never fixed (QA levels-new-game-small-phone, loop 5: at font scale 2.0 the 22 dp pills cut the bottom
 * of "Stage", "Unrated" and "עובד גם בלי אינטרנט"). The least height grows as the words do, so the words keep
 * the room above and below them that they have at the normal size; with large text the words may take a second
 * line (linesAt), and the chip grows with it. A chip of a size below the normal one keeps the design's 22.
 */
export function chipSizeAt(fontScale: number): ViewStyle {
  const scale = Math.max(1, fontScale);
  return {
    minHeight: CHIP.height * scale,
    paddingVertical: scale >= LARGE_TEXT_SCALE ? CHIP.paddingYLarge : 0,
  };
}

/** Sizes from the boards that have no token: the Modes header row (56). */
const HEADER_HEIGHT = 56;

/** The Modes board's chips: 22 high, 8 in from each side, an 11 icon 4 from the words (modesChipWidth.test). */
export const CHIP = {
  height: 22,
  paddingX: space[4],
  /** Above and below the words once the text is large, so a second line's glyphs stay off the border. */
  paddingYLarge: space[2],
  gap: space[2],
  icon: 11,
  border: tokens.border.hairline,
  font: tokens.type.micro,
} as const;

const styles = StyleSheet.create({
  flip: { transform: [{ scaleX: -1 }] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[6],
    minHeight: HEADER_HEIGHT,
  },
  titles: { minWidth: 0, alignItems: 'flex-start', gap: space[1] },
  // The title takes what the end item leaves.
  titlesRest: { flex: 1 },
  // `fitTitle`: its own width, shrinking only when the row is too narrow; the end item grows into the rest. No
  // `flex` here: a positive one makes Yoga read an auto basis as 0, and the title would get no width at all.
  titlesFirst: { flexGrow: 0, flexShrink: 1, flexBasis: 'auto' },
  title: { ...text('screenTitle'), color: color.text },
  subtitle: { ...text('caption'), color: color.textMuted },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
    minHeight: size.icon.chevron,
  },
  sectionTitle: { ...text('label'), color: color.textMuted },
  rule: { flex: 1, height: tokens.border.hairline, backgroundColor: color.border },
  ruleBeforeNote: { minWidth: SECTION_RULE_MIN },
  sectionNote: { ...text('caption'), color: color.textMuted, flexShrink: 1 },
  // No fixed height: chipSizeAt gives the least one, and the words may make it taller.
  chip: {
    flexShrink: 1,
    maxWidth: '100%',
    paddingHorizontal: CHIP.paddingX,
    justifyContent: 'center',
    borderRadius: radius.xs,
    borderWidth: tokens.border.hairline,
    borderColor: color.border,
    backgroundColor: color.surface2,
  },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: CHIP.gap },
  chipText: { ...text('micro'), color: color.textMuted },
  // The words give way to the star and the number beside them, wrapping rather than pushing them out.
  chipWords: { flexShrink: 1 },
  chipValue: { color: color.text, writingDirection: 'ltr' },
});
