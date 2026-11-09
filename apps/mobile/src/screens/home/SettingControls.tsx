import { Pressable, StyleSheet, View } from 'react-native';

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
