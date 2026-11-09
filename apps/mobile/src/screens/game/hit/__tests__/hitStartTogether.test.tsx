import { ManualClock } from '@sudoku-fight/engine';
import { act, render, screen } from '@testing-library/react-native';
import { act as actNow, useState } from 'react';
import { View } from 'react-native';
import { getAnimatedStyle, makeMutable } from 'react-native-reanimated';

import { HIT_DIM, WarpFrame } from '../../../../components/interference';
import i18n from '../../../../i18n';
import { useSettings } from '../../../../state/settings';
import * as warpModel from '../../../../components/interference/warpModel';
import { NO_WARP, warpTransform } from '../../../../components/interference/warpModel';
import { BoardHitLayer } from '../BoardHitLayer';
import { bannerEnter } from '../HitBanner';
import { HitLayer } from '../HitLayer';
import type { HitInfo } from '../hitModel';

/**
 * A hit's layers start together (QA fixcheck of APK 14, warp-sound-on-dim-before-overlay: with sound on, the
 * board's dim showed ~170 ms before the warp's overlay and banner; with sound off the overlay came ~80 ms first):
 * - every layer reads the screen's one clock for the hit when it is given one (the game screen does), not one
 *   clock each, started and anchored on its own;
 * - the start cue (whose sound player keeps the JS thread waiting on the UI thread) plays only once the commit's
 *   effects have handed the hit's start to the UI thread, never inside them.
 */

// Skia draws natively; under Jest a canvas is a plain view.
jest.mock(
  '@shopify/react-native-skia',
  () => jest.requireActual('../../../../components/interference/testing/skiaMock').skiaModule,
);
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../../../../services/feedback', () => ({ cue: jest.fn() }));
const feedback = jest.requireMock<{ cue: jest.Mock }>('../../../../services/feedback');
const cues = (): string[] => feedback.cue.mock.calls.map((c: unknown[]) => String(c[0]));

const hidden = { includeHiddenElements: true };
const START = 10_000;
let clock: ManualClock;

const hitOn = (over: Partial<HitInfo> = {}): HitInfo => ({
  kind: 'warp',
  fromId: 'p2',
  fromName: 'NinaVolt',
  fromColorIndex: 1,
  endsAt: START + 5000,
  totalMs: 5000,
  gameId: 'g-1',
  id: 1,
  ...over,
});

beforeEach(async () => {
  clock = new ManualClock(START);
  feedback.cue.mockClear();
  useSettings.setState({ reduceMotion: 'off' });
  await i18n.changeLanguage('he');
});
afterEach(() => jest.useRealTimers());

describe('the start cue comes after the start is handed to the UI thread', () => {
  /** The hit comes in by a state change, so it can be committed in a synchronous act (effects, no microtasks). */
  function Screen({ onSet }: { onSet: (set: (hit: HitInfo | null) => void) => void }) {
    const [hit, setHit] = useState<HitInfo | null>(null);
    onSet(setHit);
    return <HitLayer hit={hit} now={clock.now()} clock={clock} topInset={0} announce={false} />;
  }

  it('not inside the commit that mounts the hit, then once, in the same JS turn', async () => {
    let set: (hit: HitInfo | null) => void = () => {};
    await render(<Screen onSet={(s) => (set = s)} />);
    actNow(() => set(hitOn()));
    // The commit and its effects are done: the clock's start and the layers' styles are queued for the UI thread;
    // the sound (which would keep the JS thread waiting on the UI thread) is not played yet.
    expect(screen.getByTestId('hit-layer-banner')).toBeOnTheScreen();
    expect(cues()).toEqual([]);
    await act(async () => {
      await Promise.resolve();
    });
    expect(cues()).toEqual(['hitWarp']);
  });

  it('a hit gone before its cue was played plays none', async () => {
    let set: (hit: HitInfo | null) => void = () => {};
    await render(<Screen onSet={(s) => (set = s)} />);
    actNow(() => set(hitOn()));
    actNow(() => set(null));
    await act(async () => {
      await Promise.resolve();
    });
    expect(cues()).toEqual([]);
  });
});

describe("a hit's layers read the screen's one clock", () => {
  it('the dim, the banner and the tilt follow the shared clock, not one of their own', async () => {
    // The UI registry of frame callbacks is set up on a real frame first (the worklets mock schedules on frames).
    await new Promise((r) => setTimeout(r, 20));
    jest.useFakeTimers();
    const hit = hitOn();
    // The game clock says 2 s into the hit; the shared clock (the screen's) is 120 ms in.
    clock.advance(2_000);
    const shared = makeMutable(120);
    await render(
      <View>
        <WarpFrame
          hit={hit}
          now={clock.now()}
          clock={clock}
          region="screen"
          elapsed={shared}
          testID="warp-frame"
        >
          <BoardHitLayer hit={hit} now={clock.now()} clock={clock} cells={[]} width={300} elapsed={shared} />
        </WarpFrame>
        <HitLayer hit={hit} now={clock.now()} clock={clock} topInset={0} feedback={false} elapsed={shared} />
      </View>,
    );
    await act(async () => {
      jest.advanceTimersByTime(16);
    });
    // Half way through the dim's fade-in (120 of 240 ms): half its opacity, as the shared clock says.
    expect(getAnimatedStyle(screen.getByTestId('hit-dim', hidden)).opacity).toBeCloseTo(
      (HIT_DIM.opacity * 120) / HIT_DIM.fadeInMs,
      5,
    );
    // Still inside the fade-in: the content is not tilted yet (its own clock, 2 s in, would tilt it).
    expect(getAnimatedStyle(screen.getByTestId('warp-frame')).transform).toEqual(warpTransform(NO_WARP));

    // The shared clock moves on: all of them with it.
    await act(async () => {
      shared.set(3_500);
      jest.advanceTimersByTime(16);
    });
    expect(getAnimatedStyle(screen.getByTestId('hit-dim', hidden)).opacity).toBeCloseTo(HIT_DIM.opacity, 5);
    // The ring's number: 2 s left at 3.5 s (its own clock, 2 s in, would say 3).
    expect(screen.getByTestId('hit-layer-banner-ring-seconds', hidden)).toHaveAnimatedProps({ text: '2' });
    // Past the fade-in: the tilt has begun.
    expect(getAnimatedStyle(screen.getByTestId('warp-frame')).transform).not.toEqual(warpTransform(NO_WARP));
  });

  it('the banner drops in from the same clock, not from a spring of its own started at its mount', async () => {
    await new Promise((r) => setTimeout(r, 20));
    jest.useFakeTimers();
    const shared = makeMutable(0);
    await render(
      <HitLayer
        hit={hitOn()}
        now={clock.now()}
        clock={clock}
        topInset={0}
        feedback={false}
        elapsed={shared}
      />,
    );
    // A second after its mount, with the clock not started (the dim and the effect at 0 too): still out. Its own
    // spring would have landed it long ago.
    await act(async () => {
      jest.advanceTimersByTime(1_000);
    });
    const banner = () => getAnimatedStyle(screen.getByTestId('hit-layer-banner', hidden));
    expect(banner().opacity).toBe(0);
    // The clock starts: the banner with it, as the `settle` spring from rest at that instant.
    await act(async () => {
      shared.set(120);
      jest.advanceTimersByTime(16);
    });
    expect(banner().opacity).toBeCloseTo(bannerEnter(120, false), 5);
    expect(banner().opacity).toBeGreaterThan(0.3);
    expect(banner().opacity).toBeLessThan(1);
    await act(async () => {
      shared.set(1_000);
      jest.advanceTimersByTime(16);
    });
    expect(banner().opacity).toBeCloseTo(1, 3);
  });

  it('bannerEnter: the settle spring (in ≈ 300 ms, < 1 % over), or a 200 ms fade with reduced motion', () => {
    expect(bannerEnter(0, false)).toBe(0);
    expect(bannerEnter(-5, false)).toBe(0);
    expect(bannerEnter(300, false)).toBeGreaterThan(0.95);
    for (let t = 0; t <= 2_000; t += 10) expect(bannerEnter(t, false)).toBeLessThan(1.01);
    expect(bannerEnter(2_000, false)).toBeCloseTo(1, 5);
    expect(bannerEnter(100, true)).toBeCloseTo(0.5, 5);
    expect(bannerEnter(200, true)).toBe(1);
  });

  it('a frame that does not tilt (another kind) does not follow the shared clock frame by frame', async () => {
    await new Promise((r) => setTimeout(r, 20));
    jest.useFakeTimers();
    // Before the render: a worklet keeps the functions it calls from when it was made.
    const transforms = jest.spyOn(warpModel, 'warpTransform');
    const shared = makeMutable(0);
    await render(
      <WarpFrame
        hit={hitOn({ kind: 'fireworks' })}
        now={clock.now()}
        clock={clock}
        region="screen"
        elapsed={shared}
        testID="warp-frame"
      >
        <View />
      </WarpFrame>,
    );
    try {
      transforms.mockClear();
      await act(async () => {
        for (let t = 16; t <= 160; t += 16) {
          shared.set(t);
          jest.advanceTimersByTime(16);
        }
      });
      // No new style per frame (each one a new array, sent to the view again): nothing is computed at all.
      expect(transforms).not.toHaveBeenCalled();
      expect(getAnimatedStyle(screen.getByTestId('warp-frame')).transform).toEqual(warpTransform(NO_WARP));
    } finally {
      transforms.mockRestore();
    }
  });
});
