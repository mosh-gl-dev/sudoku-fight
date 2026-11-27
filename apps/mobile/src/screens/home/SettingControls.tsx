import { useMemo, useState } from 'react';
import {
  type AccessibilityActionEvent,
  I18nManager,
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { Text } from '../../components/ui/Text';
import { color, radius, size, space, text, tokens } from '../../theme';
import { opaqueOver } from '../../theme/blend';

/**
 * The controls of the settings screen (spec §4.1 "הגדרות"; no board draws it, so these follow direction C's
 * flat look). A switch row and a segmented choice. Both are whole-row targets of at least 44, with the role and
 * state a screen reader needs, and nothing in them moves: a change of state is an instant redraw. Their fills
 * are opaque, the wandering digits behind the screen (D126) never show through them (B12).
 */

export interface SwitchRowProps {
  title: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  testID?: string;
}

/** A row that is one switch: the title, an optional hint, and the track at the end. */
export function SwitchRow({ title, hint, value, onChange, testID }: SwitchRowProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityHint={hint}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      testID={testID}
    >
      <View style={styles.texts}>
        <Text style={styles.title}>{title}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <View style={[styles.track, value ? styles.trackOn : styles.trackOff]}>
        <View style={[styles.thumb, value ? styles.thumbOn : styles.thumbOff]} />
      </View>
    </Pressable>
  );
}

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
}

export interface ChoiceProps<T extends string> {
  /** The group's name for screen readers. */
  label: string;
  options: readonly ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** The opaque colour it sits on: the screen's ground, or a card's surface. Its fills are laid over it (B12). */
  ground?: string;
  testID?: string;
}

/** A segmented choice: one option of a few, each a radio button. */
export function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
  ground = color.bg,
  testID,
}: ChoiceProps<T>) {
  const checkedFill = { backgroundColor: opaqueOver(color.accentSubtle, ground) };
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[styles.choice, { backgroundColor: ground }]}
      testID={testID}
    >
      {options.map((o) => {
        const checked = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ checked }}
            onPress={() => {
              if (!checked) onChange(o.value);
            }}
            style={({ pressed }) => [
              styles.segment,
              checked && [styles.segmentChecked, checkedFill],
              pressed && !checked && styles.pressed,
            ]}
            testID={testID && `${testID}-${o.value}`}
          >
            {/* Two lines in the segment's 44 rather than "…": "Как на устр…", "Come il disp…" in a third of a
                360 phone (QA run #2, after B3; settingsFit.test). */}
            <Text
              style={[styles.segmentText, checked && styles.segmentTextChecked]}
              numberOfLines={SEGMENT_LINES}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export interface SliderRowProps {
  title: string;
  hint?: string;
  /** 0..1. */
  value: number;
  /** What the value reads as, shown at the end of the title and said by a screen reader ("60%", "כבוי"). */
  valueText: string;
  /** Each step while dragging (live; the same value again too), and each tap or screen-reader step. */
  onChange: (value: number) => void;
  /** The drag's step (0.05) and a screen reader's (0.1). */
  step?: number;
  a11yStep?: number;
  testID?: string;
}

/**
 * The value at a touch on the track: 0 at its start and 1 at its end, which is the right in RTL (the app's
 * direction: a slider runs with the reading, as the system's do), on the drag's steps.
 */
export function sliderValueAt(x: number, width: number, rtl: boolean, step: number): number {
  if (!(width > 0)) return 0;
  const along = Math.min(1, Math.max(0, x / width));
  const v = rtl ? 1 - along : along;
  return Math.round(Math.round(v / step) * step * 100) / 100;
}

/**
 * A row with a small slider under its title (the music's volume): the title and the value on one line, an
 * optional hint, and the track. Drag or tap the track; a screen reader adjusts it (increment, decrement) and
 * reads the value. Nothing in it moves by itself: the fill and the thumb are redrawn where the value is.
 */
export function SliderRow({
  title,
  hint,
  value,
  valueText,
  onChange,
  step = 0.05,
  a11yStep = 0.1,
  testID,
}: SliderRowProps) {
  const [width, setWidth] = useState(0);
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);

  // Stable while dragging (its inputs change only with the layout): a new gesture would cancel the drag. The
  // owner of `onChange` drops a value it already holds (the settings store does).
  const gesture = useMemo(() => {
    const at = (x: number) => onChange(sliderValueAt(x, width, I18nManager.isRTL, step));
    // On the JS thread (runOnJS): each step is a settings write and a volume change, nothing to draw on the UI
    // thread in between.
    const pan = Gesture.Pan()
      .runOnJS(true)
      .activeOffsetX([-SLIDER.dragSlop, SLIDER.dragSlop])
      .failOffsetY([-SLIDER.scrollSlop, SLIDER.scrollSlop])
      .maxPointers(1)
      .withTestId(testID ? `${testID}-drag` : 'slider-drag')
      .onStart((e) => at(e.x))
      .onUpdate((e) => at(e.x));
    const tap = Gesture.Tap()
      .runOnJS(true)
      .withTestId(testID ? `${testID}-tap` : 'slider-tap')
      .onEnd((e, success) => {
        if (success) at(e.x);
      });
    return Gesture.Exclusive(pan, tap);
  }, [testID, width, onChange, step]);

  const adjust = (event: AccessibilityActionEvent) => {
    const by =
      event.nativeEvent.actionName === 'increment'
        ? a11yStep
        : event.nativeEvent.actionName === 'decrement'
          ? -a11yStep
          : 0;
    if (by === 0) return;
    const next = Math.round(Math.min(1, Math.max(0, value + by)) * 100) / 100;
    if (next !== value) onChange(next);
  };

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={title}
      accessibilityHint={hint}
      accessibilityValue={{ min: 0, max: 100, now: percent, text: valueText }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={adjust}
      style={styles.sliderRow}
      testID={testID}
    >
      <View style={styles.sliderHead}>
        <View style={styles.texts}>
          <Text style={styles.title}>{title}</Text>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
        <Text style={styles.sliderValue} testID={testID && `${testID}-value`}>
          {valueText}
        </Text>
      </View>
      <GestureDetector gesture={gesture}>
        <View
          style={styles.sliderTouch}
          onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
          testID={testID && `${testID}-track`}
        >
          <View style={styles.sliderTrack}>
            <View style={[styles.sliderFill, { width: `${percent}%` }]} />
          </View>
          {/* The thumb, centred on the value: the same share of the width from the track's start. */}
          <View pointerEvents="none" style={[styles.sliderThumbLane, { start: `${percent}%` }]}>
            <View style={[styles.sliderThumb, percent === 0 && styles.sliderThumbOff]} />
          </View>
        </View>
      </GestureDetector>
    </View>
  );
}

/** The slider's measures: a 4 track and a 20 thumb in a 44 touch lane; a drag starts after 6, a scroll wins after 12. */
const SLIDER = { track: 4, thumb: 20, dragSlop: 6, scrollSlop: 12 } as const;

/** A segment's words: up to two lines, which its 44 holds in every script (buttonSm's line, D106's taller ones). */
export const SEGMENT_LINES = 2;

/** The switch track of iOS proportions, flat: 44 × 26 with a 20 thumb. */
const TRACK = { width: 44, height: 26, thumb: 20 } as const;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[8],
    minHeight: size.listRow,
    paddingHorizontal: space[8],
    paddingVertical: space[5],
  },
  pressed: { backgroundColor: color.surface2 },
  texts: { flex: 1, minWidth: 0, alignItems: 'flex-start', gap: space[2] },
  title: { ...text('rowTitle'), color: color.text },
  hint: { ...text('caption'), color: color.textMuted },
  track: {
    width: TRACK.width,
    height: TRACK.height,
    borderRadius: TRACK.height / 2,
    borderWidth: tokens.border.hairline,
    padding: (TRACK.height - TRACK.thumb) / 2 - tokens.border.hairline,
    justifyContent: 'center',
  },
  trackOn: { backgroundColor: color.accent, borderColor: color.accent, alignItems: 'flex-end' },
  trackOff: { backgroundColor: color.surface2, borderColor: color.textMuted, alignItems: 'flex-start' },
  thumb: { width: TRACK.thumb, height: TRACK.thumb, borderRadius: TRACK.thumb / 2 },
  thumbOn: { backgroundColor: color.onAccent },
  thumbOff: { backgroundColor: color.textMuted },
  sliderRow: {
    minHeight: size.listRow,
    paddingHorizontal: space[8],
    paddingTop: space[5],
    paddingBottom: space[2],
    gap: space[2],
  },
  sliderHead: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  sliderValue: { ...text('buttonSm'), color: color.accent },
  // The touch lane is the full 44; the track is centred in it, and the thumb sits on the value.
  sliderTouch: { height: size.touch, justifyContent: 'center', marginHorizontal: SLIDER.thumb / 2 },
  sliderTrack: {
    height: SLIDER.track,
    borderRadius: SLIDER.track / 2,
    backgroundColor: color.surface2,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  sliderFill: { height: SLIDER.track, backgroundColor: color.accent },
  sliderThumbLane: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SLIDER.thumb,
    marginStart: -SLIDER.thumb / 2,
    justifyContent: 'center',
  },
  sliderThumb: {
    width: SLIDER.thumb,
    height: SLIDER.thumb,
    borderRadius: SLIDER.thumb / 2,
    backgroundColor: color.accent,
    borderWidth: tokens.border.hairline,
    borderColor: color.onAccent,
  },
  sliderThumbOff: { backgroundColor: color.textMuted, borderColor: color.surface2 },
  // Filled with what it sits on (`ground`): it looks as before, and hides the digits behind it.
  choice: {
    flexDirection: 'row',
    gap: space[2],
    padding: space[2],
    borderRadius: radius.button,
    borderWidth: tokens.border.hairline,
    borderColor: color.border,
  },
  segment: {
    flex: 1,
    minWidth: 0,
    minHeight: size.touch,
    paddingHorizontal: space[4],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: tokens.border.hairline,
    borderColor: 'transparent',
  },
  // Its fill is accentSubtle laid over the ground (checkedFill).
  segmentChecked: { borderColor: color.accent },
  segmentText: { ...text('buttonSm'), color: color.textMuted, textAlign: 'center' },
  segmentTextChecked: { color: color.accent },
});
