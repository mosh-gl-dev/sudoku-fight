import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AppState, Dimensions } from 'react-native';

import type { DrawCall } from '../../interference/testing/skiaMock';
import { useSettings } from '../../../state/settings';
import { ambientClock, AmbientCanvas, type AmbientCanvasProps, GLYPHS } from '../AmbientCanvas';
import { AmbientLayer } from '../AmbientLayer';
import { ambientField, inView, poseAt } from '../ambientModel';

/**
 * The wandering digits' layer (D126, Moshe 31.10.2026): one, in the root layout, behind every screen. Lazy, hidden
 * from screen readers, never touchable, laid out in the window; its clock runs all the time the app is in the
 * foreground and the Splash is gone, and stands still otherwise; Reduced Motion gives one still frame of the same
 * field. The frame clock is replaced by a stand-in that records setActive (Jest runs no display frames), the
 * canvas by itself plus a record of its props, and Skia's Picture by a record of the picture it was given.
 */

const mockFrame = { setActive: jest.fn(), isActive: false, callbackId: -1 };
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual<object>('react-native-reanimated'),
  __esModule: true,
  useFrameCallback: () => mockFrame,
}));

const mockPicture = jest.fn();
jest.mock('@shopify/react-native-skia', () => {
  const { skiaModule } = jest.requireActual<typeof import('../../interference/testing/skiaMock')>(
    '../../interference/testing/skiaMock',
  );
  return {
    ...skiaModule,
    Picture: (props: { picture: unknown }) => {
      mockPicture(props.picture);
      return null;
    },
  };
});

const mockCanvas = jest.fn();
jest.mock('../AmbientCanvas', () => {
  const actual = jest.requireActual<typeof import('../AmbientCanvas')>('../AmbientCanvas');
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  return {
    ...actual,
    AmbientCanvas: (props: AmbientCanvasProps) => {
      mockCanvas(props);
      return createElement(actual.AmbientCanvas, props);
    },
  };
});

const appState = AppState as unknown as { addEventListener: jest.Mock };

/** The layer is hidden from screen readers, so queries must include hidden elements. */
const HIDDEN = { includeHiddenElements: true } as const;

const canvas = () => mockCanvas.mock.calls.at(-1)?.[0] as AmbientCanvasProps;
const lastActive = () => mockFrame.setActive.mock.calls.at(-1)?.[0];

async function mount(covered = false) {
  await render(<AmbientLayer covered={covered} />);
  await waitFor(() => expect(mockCanvas).toHaveBeenCalled());
  return canvas();
}

beforeEach(() => {
  mockFrame.setActive.mockClear();
  mockCanvas.mockClear();
  mockPicture.mockClear();
  ambientClock.set(0);
  useSettings.setState({ reduceMotion: 'off' });
});

describe('the ambient layer', () => {
  it('draws nothing on the first render: the canvas (and Skia) come after the first screen, when idle', async () => {
    await render(<AmbientLayer covered={false} />);
    expect(mockCanvas).not.toHaveBeenCalled();
    expect(screen.queryByTestId('ambient-canvas', HIDDEN)).toBeNull();
    await waitFor(() => expect(screen.getByTestId('ambient-canvas', HIDDEN)).toBeTruthy());
  });

  it('nothing loads or moves under the Splash; once it is gone the clock runs', async () => {
    const view = await render(<AmbientLayer covered />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(mockCanvas).not.toHaveBeenCalled();
    await view.rerender(<AmbientLayer covered={false} />);
    await waitFor(() => expect(mockCanvas).toHaveBeenCalled());
    expect(canvas().paused).toBe(false);
    expect(lastActive()).toBe(true);
    // A Splash that comes back (a sign-out that reloads) stops the clock; the canvas stays.
    await view.rerender(<AmbientLayer covered />);
    expect(canvas().paused).toBe(true);
    expect(lastActive()).toBe(false);
  });

  it('fills the screen behind everything, hidden from screen readers and never touchable', async () => {
    await mount();
    const layer = screen.getByTestId('ambient', HIDDEN);
    expect(layer.props.pointerEvents).toBe('none');
    expect(layer.props.accessibilityElementsHidden).toBe(true);
    expect(layer.props.importantForAccessibility).toBe('no-hide-descendants');
    const style = [layer.props.style].flat(3).reduce((all, s) => ({ ...all, ...s }), {});
    expect(style).toMatchObject({ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 });
    expect(screen.getByTestId('ambient-canvas', HIDDEN).props.pointerEvents).toBe('none');
  });

  it('runs its clock all the time, in one neutral ink (textMuted over bg at 13 %)', async () => {
    const props = await mount();
    expect(props.paused).toBe(false);
    expect(props.reduce).toBe(false);
    expect(props.ink).toBe('#21252c');
    expect(lastActive()).toBe(true);
  });

  it('is laid out in the window, not its box: a keyboard that shrinks the screen never moves the digits', async () => {
    const props = await mount();
    const window = Dimensions.get('window');
    const screenSize = Dimensions.get('screen');
    expect(props.width).toBe(Math.round(window.width));
    expect(props.height).toBe(Math.round(Math.max(window.height, screenSize.height)));
    await fireEvent(screen.getByTestId('ambient', HIDDEN), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: window.width, height: 300 } },
    });
    expect(canvas().height).toBe(props.height);
  });

  it('stands still while the app is in the background, and goes on when it comes back', async () => {
    await mount();
    const listener = appState.addEventListener.mock.calls.at(-1)?.[1] as (s: string) => void;
    await act(async () => listener('background'));
    expect(canvas().paused).toBe(true);
    expect(lastActive()).toBe(false);
    await act(async () => listener('active'));
    expect(canvas().paused).toBe(false);
    expect(lastActive()).toBe(true);
  });

  it('Reduced Motion: one still frame, and the clock never starts', async () => {
    useSettings.setState({ reduceMotion: 'on' });
    expect((await mount()).reduce).toBe(true);
    expect(screen.getByTestId('ambient-canvas-still', HIDDEN)).toBeTruthy();
    expect(screen.queryByTestId('ambient-canvas', HIDDEN)).toBeNull();
    expect(mockFrame.setActive).not.toHaveBeenCalledWith(true);
  });
});

describe('one field on one clock', () => {
  const WINDOW = { width: 400, height: 860 };
  /** Where the last picture placed each digit (the live canvas hands Picture a derived value). */
  const placed = (given: unknown) => {
    const picture = (given as { get?: () => unknown }).get?.() ?? given;
    return (picture as { calls: DrawCall[] }).calls
      .filter((c) => c.op === 'translate')
      .filter((_, k) => k % 2 === 0);
  };

  it('the still frame is the field where the clock stands: the same digits, where they were, never a jump', async () => {
    ambientClock.set(73_000);
    await render(<AmbientCanvas {...WINDOW} ink="#21252c" reduce paused={false} />);
    const field = ambientField({ ...WINDOW, glyphs: GLYPHS });
    const expected = field.digits.flatMap((_, i) => {
      const pose = poseAt(field, i, 73_000);
      return inView(field, i, pose) ? [[pose.x, pose.y]] : [];
    });
    expect(placed(mockPicture.mock.calls.at(-1)?.[0]).map((c) => c.args)).toEqual(expected);
  });

  it('both canvases are opaque (a SurfaceView on Android: a new picture never redraws the screens over it)', async () => {
    const live = await render(<AmbientCanvas {...WINDOW} ink="#21252c" reduce={false} paused={false} />);
    expect(screen.getByTestId('ambient-canvas')).toHaveProp('opaque', true);
    await live.unmount();
    await render(<AmbientCanvas {...WINDOW} ink="#21252c" reduce paused={false} />);
    expect(screen.getByTestId('ambient-canvas-still')).toHaveProp('opaque', true);
  });

  it('a remount goes on from the app’s clock, not from zero', async () => {
    ambientClock.set(5_000);
    const first = await render(<AmbientCanvas {...WINDOW} ink="#21252c" reduce={false} paused={false} />);
    const before = placed(mockPicture.mock.calls.at(-1)?.[0]);
    await first.unmount();
    await render(<AmbientCanvas {...WINDOW} ink="#21252c" reduce={false} paused={false} />);
    expect(placed(mockPicture.mock.calls.at(-1)?.[0])).toEqual(before);
    // …and that is the field at 5 s, not at 0.
    const field = ambientField({ ...WINDOW, glyphs: GLYPHS });
    const first0 = field.digits.findIndex((_, i) => inView(field, i, poseAt(field, i, 5_000)));
    const pose = poseAt(field, first0, 5_000);
    expect(before[0]?.args).toEqual([pose.x, pose.y]);
  });
});
