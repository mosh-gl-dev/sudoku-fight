import type { StarRule, Stars } from '@sudoku-fight/engine';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type LayoutChangeEvent, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { decimalSeparator } from '../../i18n/compose';
import { color, radius, space, text, tokens } from '../../theme';
import { motion, reduceMotionFlag, useReduceMotion } from '../../theme/motion';
import { scaleLine } from '../../screens/levels/levelWording';
import { secondsText } from '../../screens/home/homeModel';
import { DEFAULT_DECIMAL } from '../player/format';
import { SeatGlyph } from '../player/SeatGlyph';
import { paletteAt } from '../player/metrics';
import { curve } from '../ui/motion';
import { FONT_SCALE_CAPS, Text, type TextScale } from '../ui/Text';
import { Star, STAR_SIZES } from './StarRow';

/**
 * The star meter, a stage's "scale" (components.md §19.5): an axis with a mark at each star threshold and the
 * stars of each band above it, from the stage's own star rule (never typed in a screen).
 *
 * - **Time** (find, fill the box, spot the error, chain): a 6 dp bar that fills with the level clock **left to
 *   right in both languages** (the axis is time, not reading order; `direction: 'ltr'`), ticks at ★★★ and ★★, the
 *   seconds under them. A band's stars are gold while it can still be had, faint once lost.
 * - **Count** (the race): one pip per spot, mine in P1 with ●, the bot's in P2 with ▲, so the two never differ by
 *   colour alone.
 * - **Gap** (the duel) and **points** (point hunter): the bar fills to the measure, a band's stars gold once had.
 *
 * Its label lists the thresholds ("3 כוכבים: עד 5 ש׳ · …"). A change of the measure moves the fill over 240 ms;
 * Reduced Motion: it jumps (the clock itself is information, motion.md `level.timeBar`).
 */

/** Who took a race's spot: me, the bot, or nobody (yet). */
export type SpotOwner = 'me' | 'bot' | null;

export interface StarsBarProps {
  rule: StarRule;
  /** The measure now: the level clock in ms (a time rule), my spots, my lead, my points. */
  value: number;
  /** The axis's end: the stage's time limit (a time rule), or its spots; by default the rule's own. */
  max?: number;
  /** A race: who took each spot, in order (its length is the spots there are). */
  spots?: readonly SpotOwner[];
  testID?: string;
}

/** The marks along the axis, as shares of it (0–1), each with the stars it gives. */
export interface AxisMark {
  share: number;
  stars: 1 | 2 | 3;
  /** The number under it: seconds, points or a lead. */
  text: string;
  /** Still to be had (time) or already had (the others): its stars are gold. */
  lit: boolean;
}

/**
 * The bar's axis: its end, the fill's share and the marks (pure; exported for the tests). `decimal` is the
 * language's separator for the numbers under the marks (D108: "7,5" in German).
 */
export function axisOf(
  rule: StarRule,
  value: number,
  max?: number,
  decimal: string = DEFAULT_DECIMAL,
): { fill: number; marks: AxisMark[] } {
  const clamp = (x: number) => Math.max(0, Math.min(1, x));
  switch (rule.by) {
    case 'timeMs': {
      const end = max ?? rule.one;
      const mark = (ms: number, stars: 1 | 2 | 3): AxisMark => ({
        share: clamp(ms / end),
        stars,
        text: secondsText(ms, decimal),
        lit: value <= ms,
      });
      return { fill: clamp(value / end), marks: [mark(rule.three, 3), mark(rule.two, 2), mark(rule.one, 1)] };
    }
    case 'points': {
      const end = max ?? rule.max;
      const mark = (p: number, stars: 1 | 2 | 3): AxisMark => ({
        share: clamp(p / end),
        stars,
        text: secondsless(p, decimal),
        lit: value >= p,
      });
      return { fill: clamp(value / end), marks: [mark(rule.one, 1), mark(rule.two, 2), mark(rule.three, 3)] };
    }
    case 'gap': {
      // The duel's lead: the axis runs a third past ★★★, so the mark is not at the very end.
      const end = max ?? Math.ceil(rule.three * (4 / 3));
      const mark = (g: number, stars: 2 | 3): AxisMark => ({
        share: clamp(g / end),
        stars,
        text: secondsless(g, decimal),
        lit: value >= g,
      });
      return { fill: clamp(value / end), marks: [mark(rule.two, 2), mark(rule.three, 3)] };
    }
    case 'spots': {
      const end = max ?? rule.three + 1;
      const mark = (n: number, stars: 1 | 2 | 3): AxisMark => ({
        share: clamp(n / end),
        stars,
        text: String(n),
        lit: value >= n,
      });
      return { fill: clamp(value / end), marks: [mark(rule.one, 1), mark(rule.two, 2), mark(rule.three, 3)] };
    }
  }
}

/** Points and leads as the scores show them (55, 17.5; "17,5" with the German separator). */
const secondsless = (n: number, decimal: string): string =>
  Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', decimal);

/** Where the numbers under the bar go: each one's left edge on the axis (dp), and its line (0, or 1 under it). */
export interface NumberPlacement {
  starts: number[];
  lines: number[];
}

/**
 * Places the numbers under the bar from the widths the phone laid out (QA 2026-11-03: at the largest text size
 * the point hunter's "15.5" and "17.5" ran together, "15.517.5", and the last digit fell off the screen's edge).
 * Each starts NUMBER_LEAD before its tick, as designed, unless that runs it into the next one or past the axis's
 * end: then it moves just enough, keeping NUMBER_GAP between neighbours. A number may hang past an end only as far
 * as it does at the design's size (`scale`: how much the text size grew it; "17.5" at 97 % hangs a little at 1.0),
 * never further. Where one line cannot hold them all, every other one, from the last, keeps the line and the rest
 * go on a second line under it, each line placed the same way. `shares` are the ticks' places on the axis (0–1),
 * `widths` the numbers' widths, in the same order; `axis` the axis's width. Pure; the left of the axis is 0 in
 * either language (the axis reads left to right).
 */
export function placeNumbers(
  shares: readonly number[],
  widths: readonly number[],
  axis: number,
  scale = 1,
): NumberPlacement {
  const wanted = shares.map((share) => share * axis - NUMBER_LEAD);
  const left = Math.min(0, ...wanted);
  const right = Math.max(axis, ...wanted.map((start, i) => start + widths[i]! / scale));
  const order = shares.map((_, i) => i).sort((a, b) => shares[a]! - shares[b]!);
  const starts = [...wanted];
  // One line of numbers, in order along the axis: from the end, each ends before the next starts (less the gap)
  // and inside the right end; then from the start, each starts after the one before it and inside the left end.
  const place = (line: readonly number[]): boolean => {
    let limit = right;
    for (const i of [...line].reverse()) {
      starts[i] = Math.min(wanted[i]!, limit - widths[i]!);
      limit = starts[i]! - NUMBER_GAP;
    }
    let floor = left;
    for (const i of line) {
      starts[i] = Math.max(starts[i]!, floor);
      floor = starts[i]! + widths[i]! + NUMBER_GAP;
    }
    return floor - NUMBER_GAP <= right + FIT_SLACK;
  };
  if (place(order)) return { starts, lines: shares.map(() => 0) };
  const lines = shares.map(() => 0);
  order.forEach((i, k) => (lines[i] = (order.length - 1 - k) % 2));
  place(order.filter((i) => lines[i] === 0));
  place(order.filter((i) => lines[i] === 1));
  return { starts, lines };
}

export function StarsBar({ rule, value, max, spots, testID = 'stars-bar' }: StarsBarProps) {
  const { t } = useTranslation('levels');
  const total = spots?.length;
  const label = scaleLine(rule, t, total);
  if (rule.by === 'spots' && spots) return <SpotPips spots={spots} label={label} testID={testID} />;
  return <Axis rule={rule} value={value} max={max} label={label} testID={testID} />;
}

function Axis({
  rule,
  value,
  max,
  label,
  testID,
}: Pick<StarsBarProps, 'rule' | 'value' | 'max'> & { label: string; testID: string }) {
  const { t } = useTranslation('levels');
  const reduce = useReduceMotion();
  const { fill, marks } = axisOf(rule, value, max, decimalSeparator(t));
  const share = useSharedValue(fill);
  useEffect(() => {
    share.set(
      reduce
        ? fill
        : withTiming(fill, {
            duration: motion.duration.stateChange,
            easing: curve('standard'),
            reduceMotion: reduceMotionFlag(false),
          }),
    );
  }, [fill, reduce, share]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${share.get() * 100}%` }));
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} testID={testID}>
      {/* A time axis reads left to right in both languages; so do the other measures' axes. */}
      <View style={styles.ltr} testID={`${testID}-axis`}>
        <View style={styles.bands}>
          {marks.map((m) => (
            <View
              key={m.stars}
              style={[
                styles.band,
                { start: `${m.share * 100}%`, transform: [{ translateX: -bandWidth(m.stars) }] },
              ]}
            >
              <View style={styles.bandStars}>
                {Array.from({ length: m.stars }, (_, i) => (
                  <Star
                    key={i}
                    filled={m.lit}
                    size={STAR_SIZES.chip}
                    testID={`${testID}-mark-${m.stars}-${m.lit ? 'lit' : 'out'}`}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
        <View style={styles.track} testID={`${testID}-track`}>
          <Animated.View style={[styles.fill, fillStyle]} testID={`${testID}-fill`} />
          {marks.map((m) => (
            <View
              key={m.stars}
              style={[styles.tick, { start: `${m.share * 100}%` }]}
              testID={`${testID}-tick-${m.stars}`}
            />
          ))}
        </View>
        <Numbers marks={marks} testID={testID} />
      </View>
    </View>
  );
}

/**
 * The numbers under the ticks (Teko 15, muted). HUD text: they grow with the phone's text size up to the HUD's cap
 * (BRD-3), and their row grows with them. Placed by placeNumbers from the widths the phone laid out (the row's and
 * each number's); until those are known, as designed, NUMBER_LEAD before each tick.
 */
function Numbers({ marks, testID }: { marks: readonly AxisMark[]; testID: string }) {
  const { fontScale } = useWindowDimensions();
  const scale = Math.min(fontScale, FONT_SCALE_CAPS[NUMBER_SCALE]);
  const [axis, setAxis] = useState<number | null>(null);
  // Each number's width, by its mark and its words (another number is measured again).
  const [widths, setWidths] = useState<Readonly<Record<string, number>>>({});
  const keyOf = (m: AxisMark) => `${m.stars}:${m.text}`;
  const known = marks.map((m) => widths[keyOf(m)]);
  const placement =
    axis !== null && known.every((w) => w !== undefined)
      ? placeNumbers(
          marks.map((m) => m.share),
          known as number[],
          axis,
          scale,
        )
      : null;
  const line = numberLine(scale);
  const measure = (key: string) => (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    setWidths((w) => (w[key] === width ? w : { ...w, [key]: width }));
  };
  return (
    <View
      style={[
        styles.numbers,
        { height: numbersHeight(scale, placement ? Math.max(...placement.lines) + 1 : 1) },
      ]}
      onLayout={(e) => setAxis(e.nativeEvent.layout.width)}
      testID={`${testID}-numbers`}
    >
      {marks.map((m, i) => (
        <Text
          // By its words too: another number is laid out anew, and reports its width even when as wide.
          key={keyOf(m)}
          scale={NUMBER_SCALE}
          style={[
            styles.number,
            {
              start: `${m.share * 100}%`,
              top: space[1] + (placement?.lines[i] ?? 0) * line,
              transform: [{ translateX: placement ? placement.starts[i]! - m.share * axis! : -NUMBER_LEAD }],
            },
          ]}
          onLayout={measure(keyOf(m))}
          testID={`${testID}-number-${m.stars}`}
        >
          {m.text}
        </Text>
      ))}
    </View>
  );
}

/** A race's spots: a pip each, in the taker's colour and shape (components.md §19.5 "Count"). */
function SpotPips({ spots, label, testID }: { spots: readonly SpotOwner[]; label: string; testID: string }) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={styles.pips}
      testID={testID}
    >
      {spots.map((owner, i) => {
        const p = owner === 'me' ? paletteAt(0) : owner === 'bot' ? paletteAt(1) : null;
        return (
          <View
            key={i}
            style={[styles.pip, p ? { backgroundColor: p.ring, borderColor: p.ring } : styles.pipEmpty]}
            testID={`${testID}-pip-${i}-${owner ?? 'open'}`}
          >
            {p ? <SeatGlyph colorIndex={owner === 'me' ? 0 : 1} size={PIP_GLYPH} color={color.bg} /> : null}
          </View>
        );
      })}
    </View>
  );
}

/** The meter's stars: what a band gives, gold while it can be had. */
export const litStars = (marks: readonly AxisMark[]): Stars =>
  marks.reduce((best, m) => (m.lit && m.stars > best ? m.stars : best), 0 as Stars);

/** components.md §19.5: the bar 6 high, the race's pips 28 with a 12 shape. */
const BAR_HEIGHT = 6;
const TICK_WIDTH = 2;
const PIP = 28;
const PIP_GLYPH = 12;
/** The band's stars over the bar, and the numbers under it. */
const BAND_HEIGHT = STAR_SIZES.chip + space[2];
const BAND_GAP = 1;
/** A band's stars end at its tick. */
const bandWidth = (stars: number): number => stars * STAR_SIZES.chip + (stars - 1) * BAND_GAP;
const NUMBERS_HEIGHT = tokens.type.ratingCompact.lineHeight + space[1];
/** The numbers are HUD text (BRD-3): up to ×1.35 of the design, however large the phone's text size. */
const NUMBER_SCALE: TextScale = 'hud';
/** A number starts this far before its tick (the design: about centred under it). */
const NUMBER_LEAD = space[3];
/** The least room between two numbers. */
const NUMBER_GAP = space[2];
/** Layout rounding a line of numbers may be over its room by. */
const FIT_SLACK = 0.5;
/** A line of numbers at a text size (`scale`, capped): never less than the design's. */
const numberLine = (scale: number): number =>
  Math.round(tokens.type.ratingCompact.lineHeight * Math.max(1, scale));
/** The numbers' row: the design's at 1.0 (NUMBERS_HEIGHT), as tall as its lines of numbers at a larger size. */
export const numbersHeight = (scale: number, lines = 1): number =>
  NUMBERS_HEIGHT - tokens.type.ratingCompact.lineHeight + lines * numberLine(scale);

const styles = StyleSheet.create({
  ltr: { direction: 'ltr' },
  bands: { height: BAND_HEIGHT },
  band: { position: 'absolute', top: 0 },
  bandStars: { flexDirection: 'row', gap: BAND_GAP },
  track: {
    height: BAR_HEIGHT,
    borderRadius: radius.bar + 1,
    backgroundColor: color.surface2,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  fill: { height: BAR_HEIGHT, backgroundColor: color.accent },
  tick: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: TICK_WIDTH,
    marginStart: -TICK_WIDTH / 2,
    backgroundColor: color.bg,
  },
  numbers: { height: NUMBERS_HEIGHT },
  // Its place along the axis and its line: Numbers (placeNumbers).
  number: {
    ...text('ratingCompact'),
    position: 'absolute',
    color: color.textMuted,
  },
  pips: { flexDirection: 'row', gap: space[3] },
  pip: {
    width: PIP,
    height: PIP,
    borderRadius: radius.badge,
    borderWidth: tokens.border.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipEmpty: { backgroundColor: color.surface2, borderColor: color.border },
});
