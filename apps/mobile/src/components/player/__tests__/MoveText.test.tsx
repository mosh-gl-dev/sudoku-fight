import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { color, text } from '../../../theme';
import { MoveText } from '../MoveText';

/**
 * A move, "A2 → 4", as the replay's explanation and the results' move of the game draw it (B20): on the A16 one
 * "⁦A2 → 4⁩" text showed "A2 →" alone, its 4 on a second line out of the box. Three texts can't break.
 */
describe('MoveText', () => {
  const style = [text('cellRef'), { color: color.text }];

  it('each word its own text, with no space and no bidi mark to break or turn it', async () => {
    await render(<MoveText move="A2 → 4" style={style} testID="move" />);
    const words = screen.getAllByText(/\S/);
    expect(words.map((w) => w.props.children)).toEqual(['A2', '→', '4']);
    for (const w of words) {
      expect(String(w.props.children)).not.toMatch(/[\s‎‏‪-‮⁦-⁩]/u);
      expect(StyleSheet.flatten(w.props.style)).toMatchObject({
        fontFamily: 'Teko_600SemiBold',
        color: color.text,
      });
      expect(w.props.numberOfLines).toBeUndefined();
    }
  });

  it('left to right in any language, in a row that never wraps (Replay.dc.html: gap 4)', async () => {
    await render(<MoveText move="J9 → 7" style={style} testID="move" />);
    const row = StyleSheet.flatten(screen.getByTestId('move').props.style);
    expect(row).toMatchObject({ flexDirection: 'row', direction: 'ltr', alignItems: 'baseline', gap: 4 });
    expect(row).not.toHaveProperty('flexWrap');
  });
});
