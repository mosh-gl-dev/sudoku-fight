import { render, screen } from '@testing-library/react-native';

import { DEFAULT_REDUCE_MOTION, useSettings } from '../../../state/settings';
import { space, tokens } from '../../../theme';
import { REDUCED_LIFT, ReactionLayer } from '../ReactionLayer';

/**
 * QA avatars-motion-on-game (loop 5): with reduced motion the 🔥 float stood still right on my avatar's centre,
 * the 36 px emoji over the whole 36 px picture, for as long as the reaction's laugh lasted: the laugh was never
 * seen. Now the still emoji sits where the moving one is last seen whole, above the avatar, off its face.
 */

const BOX = space[14];
const EMOJI = space[13] - space[2];
const hidden = { includeHiddenElements: true };

afterEach(() => useSettings.setState({ reduceMotion: DEFAULT_REDUCE_MOTION }));

describe('a reaction float with reduced motion (motion.md §4.5)', () => {
  it.each(['🔥', '😂', '😱', '😎', '🤦', '👀'])('%s stands above the avatar, off its face', async (emoji) => {
    useSettings.setState({ reduceMotion: 'on' });
    const from = { x: 300, y: 80 };
    await render(<ReactionLayer floats={[{ id: 1, emoji, from, playerId: 'p1' }]} />);
    const float = screen.getByTestId('reaction-1', hidden);
    expect(float).toHaveAnimatedStyle({
      transform: [{ translateX: from.x - BOX / 2 }, { translateY: from.y - BOX / 2 - REDUCED_LIFT }],
    });
    // The emoji's glyph ends above the middle of the card's avatar picture (its eyes and mouth), and of the
    // compact card's (3–4 players) too.
    const glyphBottom = from.y - REDUCED_LIFT + EMOJI / 2;
    for (const picture of [tokens.size.avatar.card.image, tokens.size.avatar.compact.image])
      expect(glyphBottom).toBeLessThanOrEqual(from.y - picture / 2 + space[2]);
  });

  it('the moving float is unchanged: it starts low on the avatar and rises', async () => {
    useSettings.setState({ reduceMotion: 'off' });
    const from = { x: 300, y: 80 };
    await render(<ReactionLayer floats={[{ id: 2, emoji: '🔥', from, playerId: 'p1' }]} />);
    expect(screen.getByTestId('reaction-2', hidden)).toHaveAnimatedStyle({ opacity: 0 });
  });
});
