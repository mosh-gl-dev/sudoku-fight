import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  type Probe,
  useProbeWidths,
  WidthProbes,
  widthsOf,
  wordsOf,
} from '../../components/player/statusFit';
import { Text } from '../../components/ui/Text';
import { color, radius, size, space, text } from '../../theme';
import type { StatCell } from './playerCardModel';

/**
 * The player card's statistics (Profile.dc.html: four cells in a row, the number over its label). A label takes two
 * lines, broken between words; a word wider than a quarter of the row at the phone's text size would break in the
 * middle (QA loop 7, 360 dp at font 1.3: "Mistak es per …"), so then the cells go two to a row. Each label's words
 * are measured at full size (statusFit's probes); nothing is drawn smaller.
 */
export function StatCells({ cells }: { cells: readonly StatCell[] }) {
  const [rowWidth, setRowWidth] = useState<number | null>(null);
  const [widths, report] = useProbeWidths();
  const probes: Probe[] = cells.flatMap((cell, i) =>
    breakableWords(cell.label).map((word, k) => ({ id: `stat-${i}-${k}`, text: word, style: text('micro') })),
  );
  const measured = widthsOf(probes, widths);
  const perRow = rowWidth !== null && measured !== null ? statsPerRow(rowWidth, measured) : STATS_PER_ROW;
  return (
    <View
      style={styles.stats}
      onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}
      testID="player-card-stats"
    >
      <WidthProbes probes={probes} onWidth={report} />
      {cells.map((cell) => (
        <View
          key={cell.key}
          style={[styles.stat, perRow === STATS_PER_ROW ? styles.quarter : styles.half]}
          accessible
          accessibilityLabel={`${cell.label}: ${cell.value}`}
          testID={`player-card-stat-${cell.key}`}
        >
          <Text style={[text('scoreCompact'), styles.strong]}>{cell.value}</Text>
          <Text style={[text('micro'), styles.muted, styles.center]} numberOfLines={2}>
            {cell.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const STATS_PER_ROW = 4;
const GAP = space[4];
const PADDING = space[3];

/**
 * The words a label may break between. A script written without spaces (Chinese, Japanese, Thai) breaks between its
 * characters, so it has no word to keep whole.
 */
function breakableWords(label: string): string[] {
  if (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u.test(label)) return [];
  return wordsOf(label);
}

/** Four to a row while every label's widest word fits a quarter's inner width; else two. */
export function statsPerRow(rowWidth: number, wordWidths: readonly number[]): 2 | 4 {
  const inner = (rowWidth - (STATS_PER_ROW - 1) * GAP) / STATS_PER_ROW - 2 * PADDING;
  return wordWidths.every((w) => w <= inner) ? STATS_PER_ROW : 2;
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  stat: {
    flexGrow: 1,
    minHeight: size.listRow,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    padding: PADDING,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  quarter: { width: '22%' },
  half: { width: '45%' },
  strong: { color: color.text },
  muted: { color: color.textMuted },
  center: { textAlign: 'center' },
});
