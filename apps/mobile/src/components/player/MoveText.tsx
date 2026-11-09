import { type StyleProp, StyleSheet, type TextStyle, View } from 'react-native';

import { space } from '../../theme';
import { Text } from '../ui/Text';

export interface MoveTextProps {
  /** The translated move, "A2 → 4" (replay:explain.move, game:results.best.move), with no isolate around it. */
  move: string;
  /** Each word's text style (the cellRef type and its colour). */
  style: StyleProp<TextStyle>;
  testID?: string;
}

/**
 * A move as the design draws it (Replay.dc.html: cell, arrow and digit, three spans in a nowrap LTR row): each
 * word of the line its own text, side by side left to right in any language.
 *
 * Not one text (B20): Android measures a text as an LTR paragraph (React Native's TextLayoutManager leaves out
 * the view's text direction), but an RTL screen's TextView draws "⁦A2 → 4⁩" as an RTL one, since the isolate
 * hides its letters from first-strong detection. In the box measured to its width, the phone then drew "A2 →"
 * and put the 4 on a second line, out of sight. A word with no space and no isolate has nowhere to break, and
 * "A2" reads left to right on both sides.
 */
export function MoveText({ move, style, testID }: MoveTextProps) {
  return (
    <View style={styles.row} testID={testID}>
      {move.split(/ +/).map((word, i) => (
        <Text key={i} style={style}>
          {word}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Replay.dc.html: gap 4 between the three spans.
  row: { flexDirection: 'row', direction: 'ltr', alignItems: 'baseline', gap: space[2] },
});
