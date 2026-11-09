import { act, render } from '@testing-library/react-native';

import i18n from '../../../i18n';
import { useSettings } from '../../../state/settings';
import { ConfirmModal } from '../ConfirmModal';
import { modalWindowOpen } from '../modalWindows';
import { Sheet } from '../Sheet';

/**
 * The app's own windows are counted while they are up (modalWindows.ts), so a stage does not take the focus
 * they move ('blur' on Android) for the app leaving (QA levels-freeze-background): the exit dialog and the
 * sheets, from the commit that shows them until their exit is over.
 */

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../../../services/feedback', () => ({ cue: jest.fn() }));

beforeEach(async () => {
  jest.useFakeTimers();
  await i18n.changeLanguage('he');
  useSettings.setState({ reduceMotion: 'off' });
});
afterEach(() => jest.useRealTimers());

const settle = async () => act(async () => void jest.advanceTimersByTime(2000));

describe('modalWindowOpen', () => {
  it('ConfirmModal: counted while it is up, and no more once it has left', async () => {
    const dialog = (visible: boolean) => (
      <ConfirmModal
        visible={visible}
        title="t"
        confirmLabel="ok"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    const view = await render(dialog(false));
    expect(modalWindowOpen()).toBe(false);
    await view.rerender(dialog(true));
    expect(modalWindowOpen()).toBe(true);
    await view.rerender(dialog(false));
    await settle();
    expect(modalWindowOpen()).toBe(false);
    await view.rerender(dialog(true));
    await view.unmount();
    expect(modalWindowOpen()).toBe(false);
  });

  it('Sheet too', async () => {
    const sheet = (visible: boolean) => <Sheet visible={visible} title="t" onClose={jest.fn()} />;
    const view = await render(sheet(true));
    expect(modalWindowOpen()).toBe(true);
    await view.rerender(sheet(false));
    await settle();
    expect(modalWindowOpen()).toBe(false);
  });
});
