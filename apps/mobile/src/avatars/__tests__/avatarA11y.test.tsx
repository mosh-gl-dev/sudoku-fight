import { render, screen } from '@testing-library/react-native';

import { Avatar } from '../../components/player/Avatar';
import { useSettings } from '../../state/settings';
import { AvatarArt } from '../AvatarArt';
import { shownFace } from '../testing/avatarTesting';

/**
 * B10 (QA run #2): the avatar's picture had the content description "neutral", its face's id, in all 19
 * languages, on Home, "משחק חדש" and the level map: Android writes a view's accessibilityValue text into its
 * content description. In the app the picture carries no words of its own: it is decorative next to the name
 * (its card's label says who it is), and a lone avatar speaks the player's name (Avatar's `label`).
 */

const hidden = { includeHiddenElements: true };

interface Node {
  props: Record<string, unknown>;
  children: readonly (Node | string)[];
}

/** Every accessibility word under an element: labels and value texts. */
function spokenWords(el: Node): string[] {
  const value = el.props.accessibilityValue as { text?: unknown } | undefined;
  const own = [el.props.accessibilityLabel, value?.text].filter((w): w is string => typeof w === 'string');
  return [...own, ...el.children.flatMap((c) => (typeof c === 'string' ? [] : spokenWords(c)))];
}

/** Renders as the app does (NODE_ENV is "production" in a build), then back to Jest's. */
async function inTheApp(run: () => Promise<void>) {
  const env = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    await run();
  } finally {
    process.env.NODE_ENV = env;
  }
}

beforeEach(() => {
  useSettings.setState({ reduceMotion: 'on' });
});

describe('an avatar carries no words of its own in the app (B10)', () => {
  it('next to a name: decorative, hidden, with no content description (no "neutral")', async () => {
    await inTheApp(async () => {
      await render(<Avatar avatarId="fox" size="home" colorIndex={0} testID="me" />);
      const frame = screen.getByTestId('me', hidden);
      expect(frame).toHaveProp('importantForAccessibility', 'no-hide-descendants');
      expect(spokenWords(frame as unknown as Node)).toEqual([]);
      expect(screen.getByTestId('me-image', hidden)).not.toHaveProp('accessibilityValue', expect.anything());
    });
  });

  it('alone: an image that says the player’s name, and nothing else', async () => {
    await inTheApp(async () => {
      await render(<Avatar avatarId="fox" size="card" label="Moshe" testID="me" />);
      const frame = screen.getByRole('image', { name: 'Moshe' });
      expect(spokenWords(frame as unknown as Node)).toEqual(['Moshe']);
    });
  });

  it('the picture alone, whatever face it shows', async () => {
    await inTheApp(async () => {
      await render(<AvatarArt avatarId="fox" size={44} expression="sad" testID="art" />);
      expect(spokenWords(screen.getByTestId('art', hidden) as unknown as Node)).toEqual([]);
    });
  });

  it('under Jest the face is still there for the tests that read it', async () => {
    await render(<AvatarArt avatarId="fox" size={44} expression="sad" testID="art" />);
    expect(shownFace(screen.getByTestId('art', hidden) as unknown as Node)).toBe('sad');
  });
});
