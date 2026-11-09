import { fireEvent, render } from '@testing-library/react-native';
import { createAudioPlayer } from 'expo-audio';

import { Button } from '../../../components/ui/Button';
import { sfx, SOUND_SOURCES } from '../../../services/sfx';
import { useSettings } from '../../../state/settings';
import { warmModes } from '../warmModes';

/**
 * QA run #3, T3-FIRST-PLAY-SLOW, apk6 (docs/PERF.md, B14/B32): with the route's code and my avatar's pictures made
 * ahead, the first "שחק" after the start still showed no frame from ~85 to 533–606 ms (later ones: the first frame
 * at 270–320 ms). The press itself: "שחק" is a primary Button, whose press plays its cue before router.push, and
 * the first sound of the run makes its player there (expo-audio builds it on the UI thread while the JS thread
 * waits). Home's warm-up makes that player now, so the first press finds it as every later one does.
 */

type Mocks = typeof import('../testing/nativeMocks');

jest.mock('expo-audio', () => jest.requireActual<Mocks>('../testing/nativeMocks').expoAudio);
jest.mock('expo-haptics', () => jest.requireActual<Mocks>('../testing/nativeMocks').expoHaptics);

const made = jest.mocked(createAudioPlayer);

/** The players made for the primary press's sound (`ui_tap`). */
const pressPlayers = () => made.mock.calls.filter(([source]) => source === SOUND_SOURCES.ui_tap).length;

beforeEach(() => {
  useSettings.setState({ sound: true });
});

afterEach(() => {
  // A fresh run: no player kept, the next play or preload makes them again.
  sfx.release();
  made.mockClear();
});

it('Home’s warm-up makes the primary press’s player: the first "שחק" makes none, and plays at once', async () => {
  warmModes('cassette');
  expect(pressPlayers()).toBe(1);
  const player = made.mock.results[0]!.value as { play: jest.Mock; volume: number };
  made.mockClear();
  // Its warm-up: one play, muted (sfx.ts, QA loop 6), so that the first real one is heard.
  expect(player.play).toHaveBeenCalledTimes(1);
  expect(player.volume).toBe(0);

  const onPress = jest.fn();
  const { getByTestId } = await render(<Button label="שחק" onPress={onPress} testID="play" />);
  await fireEvent.press(getByTestId('play'));

  expect(onPress).toHaveBeenCalledTimes(1);
  expect(made).not.toHaveBeenCalled();
  expect(player.play).toHaveBeenCalledTimes(2);
  expect(player.volume).toBe(0.3);
});

it('without it, the first press makes the player itself, before its onPress (the cost apk6 measured)', async () => {
  const onPress = jest.fn();
  const { getByTestId } = await render(<Button label="שחק" onPress={onPress} testID="play" />);
  await fireEvent.press(getByTestId('play'));
  expect(pressPlayers()).toBe(1);
  // Made first, then the press runs (router.push, for "שחק"): the next screen waited for it.
  expect(made.mock.invocationCallOrder[0]).toBeLessThan(onPress.mock.invocationCallOrder[0]!);
});

it('makes no player with sound off (the press then plays nothing), and one once it is turned on', () => {
  useSettings.setState({ sound: false });
  warmModes('cassette');
  expect(pressPlayers()).toBe(0);

  useSettings.setState({ sound: true });
  warmModes('cassette');
  warmModes('cassette');
  expect(pressPlayers()).toBe(1);
});
