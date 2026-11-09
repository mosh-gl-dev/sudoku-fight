import 'react-native-reanimated';

import { avatarById, renderStatic } from '@sudoku-fight/avatars';
import { render, screen } from '@testing-library/react-native';

import { AVATAR_STAGES } from '../../../avatars';
import { drawnAvatarId, svgXmlsIn } from '../../../avatars/testing/avatarTesting';
import { AVATAR_SIZES } from '../../../components/player/metrics';
import i18n from '../../../i18n';
import { useSettings } from '../../../state/settings';
import { ProfileCard } from '../ProfileCard';

/**
 * Living avatars (decision 3.19, approved 30.10.2026): my avatar on Home's card idles (its blink, and from 48 px
 * its own moving parts) while Home is the screen shown, and never with Reduced Motion. So does a player's card
 * (the profile); the search, the VS and the countdown stay still.
 */

const hidden = { includeHiddenElements: true };
const xmls = () => svgXmlsIn(screen.getByTestId('profile-card', hidden)).map((x) => x.props.xml as string);
const still = () => renderStatic(avatarById('noam')!, { size: AVATAR_SIZES.home.image });

const card = () => (
  <ProfileCard name="MosheG" avatarId="noam" country="IL" gamesPlayed={3} winRate={0.5} streak={1} />
);

beforeEach(async () => {
  jest.useFakeTimers();
  await i18n.changeLanguage('he');
});
afterEach(() => {
  useSettings.setState({ reduceMotion: 'system' });
  jest.useRealTimers();
});

describe('living avatars (3.19)', () => {
  it('the stages: the picker, the winner, Home and the player card; not the search, the VS or the countdown', () => {
    expect(AVATAR_STAGES).toEqual({
      picker: true,
      winner: true,
      home: true,
      profile: true,
      search: false,
      vs: false,
      countdown: false,
    });
  });

  it('my avatar on Home’s card idles: every part that may move in a layer of its own', async () => {
    useSettings.setState({ reduceMotion: 'off' });
    await render(card());
    // Moving: not one still picture of the whole avatar, but its layers (each nobody's whole picture).
    expect(xmls()).not.toContain(still());
    expect(xmls().filter((x) => drawnAvatarId(x) === null).length).toBeGreaterThan(1);
  });

  it('with Reduced Motion it is one still picture', async () => {
    useSettings.setState({ reduceMotion: 'on' });
    await render(card());
    expect(xmls()).toContain(still());
  });
});
