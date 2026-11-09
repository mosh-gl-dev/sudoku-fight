import { useTranslation } from 'react-i18next';
import {
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { color, space, text, tokens } from '../../theme';
import { maxFontScale, Text, type TextScale } from '../ui/Text';
import { metrics } from './metrics';

export type RatingSize = 'home' | 'list' | 'card' | 'compact';

/** components.md §5.1: 44 Home · 22 lists · 16 the 2P card · 15 the compact card. */
const NUMBER_STYLE: Record<RatingSize, TextStyle> = {
  home: text('rating'),
  list: metrics.rating.listStyle,
  card: metrics.card.ratingStyle,
  compact: text('ratingCompact'),
};

export interface RatingProps {
  value: number;
  size?: RatingSize;
  /** The rating key's name ("רגיל"): drawn above the number on Home, and spoken. */
  label?: string;
  /** Shows the label above the number (Home's three columns). */
  showLabel?: boolean;
  /** The first 10 games in this rating key (spec §11.2). */
  provisional?: boolean;
  /** Inside a card, the card's label already says the rating. */
  decorative?: boolean;
  /** The provisional chip under the number, not beside it (see STACKED). Default: the size's own. */
  stacked?: boolean;
  /**
   * Beside the number while both fit the width it has, else the chip under it, centred (the leaderboard's podium:
   * a third of the row, where "1232 Provisional" at font 1.3 ran past its column to the screen's edge, QA loop 9).
   */
  wrap?: boolean;
  /** How far the system text size may grow it (BRD-3): 'hud' on the compact card. No cap by default. */
  scale?: TextScale;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Home's three columns: the number is 44 and a column a third of the card, so the provisional chip goes under
 * the number, not beside it (Moshe's device test, 14.10.2026: "זמני" squeezed the numbers), and the number
 * stays whole on one line, shrinking a little rather than being cut at the largest text sizes.
 */
const STACKED: Record<RatingSize, boolean> = { home: true, list: false, card: false, compact: false };
const FIT_NUMBER = { numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: 0.6 } as const;
/**
 * Under the number the chip has its column's width: a word too long for one line takes a second, broken between
 * words and centred, rather than ending in "…" (QA 2026-11-03: en-XA's "[Þŕövîšîöñåļ o…"). Beside the number (lists,
 * cards) it stays one line: the rows there are fixed.
 */
const STACKED_CHIP_LINES = 2;

/**
 * The stacked chip's text props at the phone's text size. Its column is a third of Home's card (76 dp for the
 * words on a 360 dp phone), and one long word may be wider than that once the text is large (QA
 * levels-new-game-small-phone, loop 5: "Provisiona" / "l" at font scale 1.3; Polish "Tymczasowy", Russian
 * "Временный" too, and at 2.0 most languages). A word is never broken: the chip takes a line per word (at most
 * STACKED_CHIP_LINES, so a word broken in two would need one more), and a word that is still too wide steps its
 * size down toward the design's own (11, plateNameCompact), never below it. Every layout language's word fits
 * the column at the design's size (wrapNotCut.test); at the normal text size nothing changes.
 */
export function stackedChipText(words: string, fontScale: number, scale?: TextScale) {
  const lines = Math.min(STACKED_CHIP_LINES, Math.max(1, words.trim().split(/\s+/).length));
  const grown = Math.min(fontScale, maxFontScale(scale) ?? fontScale);
  return grown > 1
    ? { numberOfLines: lines, adjustsFontSizeToFit: true, minimumFontScale: 1 / grown }
    : { numberOfLines: lines };
}

/** A rating number: Teko, tabular, LTR, gold. No star in C. */
export function Rating({
  value,
  size = 'card',
  label,
  showLabel = false,
  provisional = false,
  decorative = false,
  stacked = STACKED[size],
  wrap = false,
  scale,
  style,
  testID,
}: RatingProps) {
  const { t } = useTranslation('player');
  const { fontScale } = useWindowDimensions();
  const shown = Math.round(value);
  const base =
    label === undefined
      ? t('rating.label', { value: shown })
      : t('rating.labelWithKey', { key: label, value: shown });
  const a11y = provisional ? t('rating.provisionalLabel', { label: base }) : base;
  return (
    <View
      style={[styles.column, style]}
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'text'}
      accessibilityLabel={decorative ? undefined : a11y}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
      testID={testID}
    >
      {showLabel && label !== undefined ? <Text style={[text('label'), styles.label]}>{label}</Text> : null}
      <View style={stacked ? styles.stack : [styles.row, wrap && styles.wrap]}>
        <Text scale={scale} style={[NUMBER_STYLE[size], styles.number]} {...(stacked ? FIT_NUMBER : null)}>
          {String(shown)}
        </Text>
        {provisional ? (
          <View style={styles.chip} testID={testID && `${testID}-provisional`}>
            <Text
              scale={scale}
              style={[text('plateNameCompact'), styles.chipText, stacked && styles.chipTextStacked]}
              {...(stacked
                ? stackedChipText(t('rating.provisional'), fontScale, scale)
                : { numberOfLines: 1 })}
            >
              {t('rating.provisional')}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/**
 * The provisional chip on its own, beside the line under a name rather than the number (the leaderboard's rows on a
 * narrow phone or at a large text size, QA loop 7: there the chip beside or under the number took the name's room).
 * One line, at its design size: the line it sits in wraps before it, so it never breaks.
 */
export function ProvisionalChip({ testID }: { testID?: string }) {
  const { t } = useTranslation('player');
  return (
    <View style={styles.chip} testID={testID}>
      <Text style={[text('plateNameCompact'), styles.chipText]} numberOfLines={1}>
        {t('rating.provisional')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  column: { alignItems: 'center' },
  // Dir-C-Home: the key name sits 8 above the number.
  label: { color: color.textMuted, marginBottom: space[4] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  stack: { alignItems: 'center', gap: space[2] },
  wrap: { flexWrap: 'wrap', justifyContent: 'center', maxWidth: '100%' },
  number: { color: color.accent },
  chip: {
    minHeight: metrics.rating.provisionalChipHeight,
    paddingHorizontal: metrics.rating.provisionalPaddingX,
    borderRadius: metrics.rating.provisionalChipHeight / 2,
    borderWidth: tokens.border.hairline,
    borderColor: color.border,
    justifyContent: 'center',
  },
  chipText: { color: color.textMuted },
  chipTextStacked: { textAlign: 'center' },
});
