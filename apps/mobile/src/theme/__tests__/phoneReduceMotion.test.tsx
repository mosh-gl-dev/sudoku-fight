import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Text } from 'react-native';

import { useSettings } from '../../state/settings';
import { useReduceMotion } from '../motion';

/**
 * The app's Reduced Motion decision follows the phone's setting as it changes while the app is open, when the
 * player chose "כמו במכשיר" (fixcheck APK 18, results-reduced-motion-late-cards-and-count: the phone's animations
 * were turned off with the app running, and the results still glided and counted). Reanimated's own value is read
 * once at start. With the app's setting "off" (the default, spec §4.1) the phone is still not followed.
 */

// Spied on before the first hook subscribes (once for the app, from the first screen that asks).
const listen = jest.spyOn(AccessibilityInfo, 'addEventListener');

/** The handler the app subscribed to RN's 'reduceMotionChanged' with (one for the whole app). */
function phoneHandler(): (value: boolean) => void {
  const calls = (listen.mock.calls as unknown as [string, (value: boolean) => void][]).filter(
    ([event]) => event === 'reduceMotionChanged',
  );
  expect(calls).toHaveLength(1);
  return calls[0]![1];
}

/** The phone changes its Reduce Motion. */
async function phoneSets(value: boolean) {
  const handler = phoneHandler();
  await act(async () => handler(value));
}

function Probe() {
  return <Text testID="reduce">{String(useReduceMotion())}</Text>;
}

// Each test starts with the phone not reducing motion (nothing is mounted between tests: no act needed).
beforeEach(() => {
  if ((listen.mock.calls as unknown[][]).some(([event]) => event === 'reduceMotionChanged'))
    phoneHandler()(false);
});

describe('the phone’s Reduce Motion, changed while the app runs', () => {
  it('"כמו במכשיר": followed at once, both ways, with one subscription for every screen', async () => {
    useSettings.setState({ reduceMotion: 'system' });
    await render(
      <>
        <Probe />
        <Probe />
      </>,
    );
    expect(screen.getAllByTestId('reduce').map((el) => el.props.children)).toEqual(['false', 'false']);
    await phoneSets(true);
    expect(screen.getAllByTestId('reduce').map((el) => el.props.children)).toEqual(['true', 'true']);
    await phoneSets(false);
    expect(screen.getAllByTestId('reduce').map((el) => el.props.children)).toEqual(['false', 'false']);
  });

  it('a screen opened after the change starts reduced', async () => {
    useSettings.setState({ reduceMotion: 'system' });
    await render(<Probe />);
    await phoneSets(true);
    // A new instance (another key): mounted after the change, it reads the phone's value as it is now.
    await screen.rerender(<Probe key="later" />);
    expect(screen.getByTestId('reduce')).toHaveTextContent('true');
  });

  it('the app’s setting still wins: "off" ignores the phone, "on" reduces whatever it says', async () => {
    useSettings.setState({ reduceMotion: 'off' });
    await render(<Probe />);
    await phoneSets(true);
    expect(screen.getByTestId('reduce')).toHaveTextContent('false');
    await act(async () => useSettings.setState({ reduceMotion: 'on' }));
    await phoneSets(false);
    expect(screen.getByTestId('reduce')).toHaveTextContent('true');
  });
});
