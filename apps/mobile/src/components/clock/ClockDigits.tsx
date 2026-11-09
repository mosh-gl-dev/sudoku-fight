import { memo } from 'react';
import { type TextStyle, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { maxFontScale, type TextScale } from '../ui/Text';
import {
  CLOCK_ASCENT,
  CLOCK_DESCENT,
  CLOCK_GLYPHS,
  CLOCK_UNITS,
  type ClockGlyph,
} from './clockGlyphs.generated';

export interface ClockDigitsProps {
  /** What the clock shows: digits and ":" ("3:12"). */
  value: string;
  /** The Teko text style it stands in for: its size and line height (text('cellRef')). */
  textStyle: Pick<TextStyle, 'fontSize' | 'lineHeight'>;
  color: string;
  /** Caps the system text size as Text's `scale` does; without one it grows with it freely, as a Text does. */
  scale?: TextScale;
  testID?: string;
}

/**
 * A running clock drawn as paths, not text (Q1): on Android a text view whose text changes sends an accessibility
 * event, and a clock that ticks every second keeps the screen from ever settling (uiautomator: "could not get idle
 * state"); a screen reader gains nothing from the stream either. It looks like the Teko text it replaces, in the
 * same line box, but its digits are tabular, so its box keeps its size while it runs. Screen readers skip it: the
 * element around it says the time in its label, in steps (format.ts clockLabelSeconds).
 */
export const ClockDigits = memo(function ClockDigits({
  value,
  textStyle,
  color,
  scale,
  testID,
}: ClockDigitsProps) {
  const { fontScale } = useWindowDimensions();
  const grow = Math.min(fontScale, maxFontScale(scale) ?? Infinity);
  const size = textStyle.fontSize ?? 14;
  const k = (size * grow) / CLOCK_UNITS;
  const lineHeight = (textStyle.lineHeight ?? size) * grow;

  const glyphs = [...value].flatMap((char): ClockGlyph[] => (CLOCK_GLYPHS[char] ? [CLOCK_GLYPHS[char]] : []));
  const starts = glyphs.map((_, i) => glyphs.slice(0, i).reduce((sum, g) => sum + g.advance, 0));
  const width = glyphs.reduce((sum, g) => sum + g.advance, 0);
  // The baseline where a Text sets it in its line box: half the leading over the font's ascent (CSS inline-3,
  // as React Native's line height does it).
  const baseline = lineHeight / k / 2 + (CLOCK_ASCENT - CLOCK_DESCENT) / 2;

  return (
    <Svg
      width={width * k}
      height={lineHeight}
      viewBox={`0 ${-baseline} ${width} ${lineHeight / k}`}
      fill={color}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
    >
      {glyphs.map((g, i) => (
        <Path key={i} d={g.d} transform={`translate(${starts[i]} 0)`} />
      ))}
    </Svg>
  );
});
