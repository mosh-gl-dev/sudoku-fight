import { useCallback, useState } from 'react';
import { type StyleProp, StyleSheet, type TextStyle, View } from 'react-native';

import { size, text, tokens } from '../../theme';
import { Text } from '../ui/Text';
import { metrics } from './metrics';
import type { Gender, PlayerT } from './wording';

/**
 * What fits in the status row of a 2-player card (components.md §3.2 row 3, §8.1), decided on the phone in its own
 * fonts, so no word is drawn smaller than its design size or broken in the middle (QA loop 6, 320 dp in English:
 * "No mi / stakes", a tiny "Interfere"). Android breaks a word that is wider than its line in the middle instead
 * of shrinking it, once the text may take two lines; and where the word does shrink, Moshe hates tiny text.
 *
 * Hidden copies of the words (WidthProbes) report their widths at full size; the pure rules below say whether
 * the opponent's "הפרעה" keeps its word (else the button is its icon, its label unchanged) and whether my mistakes
 * keep their words (else a mark and the count).
 */

const card = tokens.layout.game.playerCard;

/** A word to measure: `id` names it in the card (and in tests: `probe-<id>`). */
export interface Probe {
  id: string;
  text: string;
  style: StyleProp<TextStyle>;
}

export type ProbeWidths = Readonly<Record<string, number>>;

/** The widths the probes reported, by `id:text` (a probe whose text changed is measured again). */
export function useProbeWidths(): [ProbeWidths, (probe: Probe, width: number) => void] {
  const [widths, setWidths] = useState<ProbeWidths>({});
  const report = useCallback((probe: Probe, width: number) => {
    const key = probeKey(probe);
    setWidths((was) => (was[key] === width ? was : { ...was, [key]: width }));
  }, []);
  return [widths, report];
}

export const probeKey = (probe: Pick<Probe, 'id' | 'text'>): string => `${probe.id}:${probe.text}`;

/** The measured width of each probe, in order, or null while any of them is not measured yet. */
export function widthsOf(probes: readonly Probe[], widths: ProbeWidths): number[] | null {
  const out: number[] = [];
  for (const p of probes) {
    const w = widths[probeKey(p)];
    if (w === undefined) return null;
    out.push(w);
  }
  return out;
}

/**
 * Hidden copies of words at their natural width, one line each, that report it (as TargetFrame's chip sizer).
 * Never seen, touched or read.
 */
export function WidthProbes({
  probes,
  onWidth,
}: {
  probes: readonly Probe[];
  onWidth: (probe: Probe, width: number) => void;
}) {
  return (
    <View
      style={styles.probes}
      pointerEvents="none"
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {probes.map((p) => (
        <Text
          key={probeKey(p)}
          style={[p.style, styles.probe]}
          numberOfLines={1}
          onLayout={(e) => onWidth(p, e.nativeEvent.layout.width)}
          testID={`probe-${p.id}`}
        >
          {p.text}
        </Text>
      ))}
    </View>
  );
}

/** The opponent's status words at full size: "הפרעה", "חושב…", "בוחר", "מושהה". */
export interface OpponentStatusWidths {
  label: number;
  thinking: number;
  choosing: number;
  paused: number;
}

/** The opponent's status words to measure, as the card draws them (ActivityLine, InterferenceButton). */
export function opponentProbes(t: PlayerT, gender?: Gender): Probe[] {
  const body = text('body');
  return [
    { id: 'label', text: t('interfere.button'), style: metrics.interfere.labelStyle },
    { id: 'thinking', text: `${t('activity.thinking', { context: gender })}${t('ellipsis')}`, style: body },
    { id: 'choosing', text: t('activity.locking', { context: gender }), style: body },
    { id: 'paused', text: t('activity.paused'), style: body },
  ];
}

/** The widths of opponentProbes, once all are measured. */
export function opponentWidths(probes: readonly Probe[], widths: ProbeWidths): OpponentStatusWidths | null {
  const w = widthsOf(probes, widths);
  if (!w || w.length !== 4) return null;
  return { label: w[0]!, thinking: w[1]!, choosing: w[2]!, paused: w[3]! };
}

/** My mistakes to measure: the whole text, then each word (MistakesText draws them in body text). */
export function mistakesProbes(words: string): Probe[] {
  const body = text('body');
  return [
    { id: 'mistakes', text: words, style: body },
    ...wordsOf(words).map((w, i) => ({ id: `mistakes-${i}`, text: w, style: body })),
  ];
}

/** The "הפרעה" button around its word (§8.1): padding 10 each side, icon 20, gap 6, the 1-dp border. */
export const interfereFrameWidth = (): number =>
  2 * metrics.interfere.paddingX +
  metrics.interfere.icon +
  metrics.interfere.gap +
  2 * tokens.border.hairline;

/**
 * The room the opponent's activity needs at full size: "חושב…" on one line, or the timer ring and the lock's
 * word ("בוחר", "מושהה"), its cell free to take the second line (§3.3).
 */
export const activityNeed = (w: Omit<OpponentStatusWidths, 'label'>): number =>
  Math.max(w.thinking, metrics.timerRing.card + metrics.card.statusGap + Math.max(w.choosing, w.paused));

/**
 * Whether "הפרעה" keeps its word on a card `cardWidth` wide: the word at full size beside the activity at full
 * size. Otherwise the button is its icon alone (44 × 44), its label as before. Hebrew keeps the word on a 159-dp
 * card; English, German or Russian don't, nor any language at 140 (320 dp).
 */
export function interfereWordFits(cardWidth: number, w: OpponentStatusWidths): boolean {
  return activityNeed(w) + card.actionsGap + interfereFrameWidth() + w.label <= cardWidth;
}

/** The room my mistakes have beside my two 44-dp buttons (§3.2 row 3). */
export const mistakesRoom = (cardWidth: number): number =>
  cardWidth - 2 * size.iconButton - 2 * card.actionsGap;

/**
 * Whether words of these widths fit `lines` lines of `room` with no word broken: each word fits a line, and they
 * fill the lines greedily, `space` between two on a line.
 */
export function wordsFitLines(words: readonly number[], space: number, room: number, lines: number): boolean {
  let used = 1;
  let line = -1;
  for (const w of words) {
    if (w > room) return false;
    if (line < 0) line = w;
    else if (line + space + w <= room) line += space + w;
    else {
      used += 1;
      line = w;
    }
  }
  return used <= lines;
}

/** A text split into the words a line may break between (a script without spaces is one word: conservative). */
export const wordsOf = (text: string): string[] => text.trim().split(/\s+/).filter(Boolean);

/**
 * Whether my mistakes ("No mistakes", "12 טעויות") fit beside my buttons at full size in the two lines the row
 * holds, no word broken: `widths` are the whole text's and then each word's. A space is what the whole has more
 * than its words.
 */
export function mistakesWordsFit(cardWidth: number, whole: number, words: readonly number[]): boolean {
  const sum = words.reduce((a, b) => a + b, 0);
  const space = words.length > 1 ? Math.max(0, (whole - sum) / (words.length - 1)) : 0;
  return wordsFitLines(words, space, mistakesRoom(cardWidth), 2);
}

/** mistakesWordsFit from mistakesProbes' widths; null while they are not all measured. */
export function mistakesFitIn(
  cardWidth: number,
  probes: readonly Probe[],
  widths: ProbeWidths,
): boolean | null {
  const w = widthsOf(probes, widths);
  return w ? mistakesWordsFit(cardWidth, w[0]!, w.slice(1)) : null;
}

/**
 * How far each card's name block keeps off its inner edge so the VS badge, centred between the cards, never
 * covers the flag or the rating (§3.5; QA loop 6: at 320–360 dp the cards are 8–10 dp apart and VS is 36 wide).
 * Nothing where the gap already holds the badge with `metrics.vs.clear` on each side.
 */
export function vsInset(rowWidth: number, cardWidth: number): number {
  const gap = rowWidth - 2 * cardWidth;
  return Math.max(0, Math.ceil((metrics.vs.width - gap) / 2 + metrics.vs.clear));
}

const styles = StyleSheet.create({
  probes: { position: 'absolute', top: 0, start: 0, opacity: 0, alignItems: 'flex-start' },
  probe: { flexShrink: 0 },
});
