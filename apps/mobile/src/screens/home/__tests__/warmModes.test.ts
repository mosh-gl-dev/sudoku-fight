import * as svg from 'react-native-svg';

import { avatarDef } from '../../../avatars/catalog';
import { staticXml } from '../../../avatars/layerStack';
import { svgAst } from '../../../avatars/svgMarkup';
import { AVATAR_SIZES } from '../../../components/player/metrics';
import { MODES_WARM_DELAY_MS, warmModes, warmModesLater } from '../warmModes';

/**
 * QA run #3, T3-FIRST-PLAY-SLOW (docs/PERF.md, B14/B32): the first "שחק" → "משחק חדש" after the start took
 * 0.8–1.1 s, the later ones 0.45–0.5 s. The first one also ran the route's code (the home barrel) and made my
 * avatar's two still pictures for the screen (markup, then react-native-svg's parse). Home now has them made
 * once it has settled, so the first tap finds them ready.
 */

// The barrel brings the sound player (expo-audio), which has no native module under Jest.
jest.mock('../../../services/feedback', () => ({ cue: jest.fn() }));

const picture = (avatarId: string, size: 'compact' | 'card') =>
  staticXml(avatarDef(avatarId), {
    size: AVATAR_SIZES[size].image,
    crop: 'tile',
    expression: 'neutral',
    grayscale: false,
  });

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

it('makes my avatar’s pictures for "משחק חדש" once: the screen then finds both parsed', () => {
  const parse = jest.spyOn(svg, 'parse');
  warmModes('cassette');
  expect(parse).toHaveBeenCalledTimes(2);
  expect(parse).toHaveBeenCalledWith(picture('cassette', 'compact'));
  expect(parse).toHaveBeenCalledWith(picture('cassette', 'card'));
  parse.mockClear();
  // What ModesScreen's two avatars ask for: remembered, no parse.
  expect(svgAst(picture('cassette', 'compact'))).not.toBeNull();
  expect(svgAst(picture('cassette', 'card'))).not.toBeNull();
  warmModes('cassette');
  expect(parse).not.toHaveBeenCalled();
});

it('loads the route’s code (the home barrel the start never loads)', () => {
  jest.isolateModules(() => {
    const loaded = jest.fn();
    jest.doMock('../index', () => {
      loaded();
      return {};
    });
    const { warmModes: warm } = jest.requireActual<typeof import('../warmModes')>('../warmModes');
    warm('astronaut');
    expect(loaded).toHaveBeenCalledTimes(1);
  });
});

it('runs once Home has settled (after MODES_WARM_DELAY_MS, at an idle moment), and not once cancelled', () => {
  jest.useFakeTimers();
  const parse = jest.spyOn(svg, 'parse');
  const cancel = warmModesLater('microphone');
  jest.advanceTimersByTime(MODES_WARM_DELAY_MS - 1);
  expect(parse).not.toHaveBeenCalled();
  jest.advanceTimersByTime(1100);
  expect(parse).toHaveBeenCalledTimes(2);
  cancel();

  parse.mockClear();
  const stop = warmModesLater('lava-lamp');
  stop();
  jest.advanceTimersByTime(MODES_WARM_DELAY_MS + 2000);
  expect(parse).not.toHaveBeenCalled();
});
