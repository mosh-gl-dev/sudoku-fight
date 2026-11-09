import { ManualClock } from '@sudoku-fight/engine';
import { act, cleanup, render, renderHook, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { HIT_FADE_IN_MS } from '../../../../components/interference/config';
import {
  HIT_MAX_START_STEP_MS,
  HIT_START_WINDOW_MS,
  hitAlpha,
  hitClockStep,
  type HitTime,
  useHitClock,
} from '../../../../components/interference/hitClock';
import i18n from '../../../../i18n';
import { useSettings } from '../../../../state/settings';
import { HIT_STANDBY_DELAY_MS, HitLayer } from '../HitLayer';
import type { HitInfo } from '../hitModel';
import { HIT_REHEARSAL_DELAY_MS } from '../HitRehearsal';
import { HIT_WARM_DELAY_MS } from '../warmHitCues';

/**
 * QA measure of APK 17 (warp-start-split): the first warp of a game came on in pieces. Banner and tilt first, then
 * the dim, then the brown overlay up to ~350 ms later, each at full strength in one frame:
 * - every warp made a new full-screen Skia TextureView, whose first picture shows frames after the plain views
 *   mounted in the same commit (the banner, the dim);
 * - the hit's clock was read from the server, which the receiver's first frame was already past the fade-in of
 *   (the trip from the sender's tap, then a 150–230 ms mount frame).
 * Review (loop 12): the standby canvas is made once the screen has settled, never with the screen under GO!, never
 * in the middle of a hit, and a hit of another kind draws next to it without unmounting it; a hit that follows
 * another with no frame between them starts as a new hit.
 */

// A Skia canvas is a plain view under Jest; this one counts its mounts (a new native surface on a phone).
jest.mock('@shopify/react-native-skia', () => {
  const { useEffect, createElement } = jest.requireActual<typeof import('react')>('react');
  const base = jest.requireActual<{ skiaModule: Record<string, unknown> }>(
    '../../../../components/interference/testing/skiaMock',
  ).skiaModule;
  const Inner = base.Canvas as never;
  function Canvas(props: object) {
    useEffect(() => {
      (globalThis as { mockCanvasMounts?: number }).mockCanvasMounts =
        ((globalThis as { mockCanvasMounts?: number }).mockCanvasMounts ?? 0) + 1;
    }, []);
    return createElement(Inner, props);
  }
  return { ...base, Canvas };
});
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../../../../services/feedback', () => ({ cue: jest.fn() }));

const mounts = () => (globalThis as { mockCanvasMounts?: number }).mockCanvasMounts ?? 0;
const hidden = { includeHiddenElements: true };
const START = 10_000;

const warpHit = (over: Partial<HitInfo> = {}): HitInfo => ({
  kind: 'warp',
  fromId: 'p2',
  fromName: 'NinaVolt',
  fromColorIndex: 2,
  endsAt: START + 5000,
  totalMs: 5000,
  gameId: 'g-1',
  id: 1,
  ...over,
});

// Reanimated's mock sets up its frame callbacks' registry on a (real) timer of its own: let it run before any test
// fakes the timers.
beforeAll(async () => {
  await new Promise((resolve) => setTimeout(resolve, 20));
});

beforeEach(async () => {
  (globalThis as { mockCanvasMounts?: number }).mockCanvasMounts = 0;
  useSettings.setState({ reduceMotion: 'off' });
  await i18n.changeLanguage('he');
});

describe('the warp overlay is ready before the warp', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(async () => {
    // Unmounted while the timers are still fake, so Reanimated's frame callbacks come and go on the same timers.
    await act(async () => {
      cleanup();
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  const layer = (hit: HitInfo | null, now: number, clock: ManualClock) => (
    <HitLayer
      hit={hit}
      now={now}
      clock={clock}
      topInset={0}
      feedback={false}
      announce={false}
      standby="warp"
    />
  );
  /** The effect's region: the hit's while one is on, the standby's between hits (the same view for a warp). */
  const regionOpacity = (id = 'hit-layer-region') =>
    StyleSheet.flatten(screen.getByTestId(id, hidden).props.style).opacity;
  /** Time passes (React Native's requestIdleCallback is a timer under Jest). */
  const advance = async (ms: number) => {
    await act(async () => {
      jest.advanceTimersByTime(ms);
    });
  };
  /** The standby's delay, then an idle moment. */
  const settle = () => advance(HIT_STANDBY_DELAY_MS + 1100);

  it('is made after the hit sounds warm up and before the rehearsal, never with the screen (GO!)', () => {
    expect(HIT_STANDBY_DELAY_MS).toBeGreaterThan(HIT_WARM_DELAY_MS);
    expect(HIT_STANDBY_DELAY_MS).toBeLessThan(HIT_REHEARSAL_DELAY_MS);
  });

  it('is not there on the first render, then stays mounted, unseen: a warp only shows it, never makes it', async () => {
    const clock = new ManualClock(START - 5000);
    const { rerender } = await render(layer(null, clock.now(), clock));
    // The screen's first frames (the countdown, GO!): no canvas yet.
    expect(screen.queryByTestId('hit-warp', hidden)).toBeNull();
    expect(mounts()).toBe(0);
    await advance(HIT_STANDBY_DELAY_MS - 1);
    expect(screen.queryByTestId('hit-warp', hidden)).toBeNull();

    // Settled: the overlay's canvas is there, at opacity 0, with no banner and nothing said.
    await settle();
    expect(screen.getByTestId('hit-warp', hidden)).toBeOnTheScreen();
    expect(regionOpacity('hit-layer-standby-region')).toBe(0);
    expect(screen.queryByTestId('hit-layer-banner', hidden)).toBeNull();
    expect(screen.queryByTestId('hit-layer', hidden)).toBeNull();
    expect(screen.queryByTestId('hit-layer-region', hidden)).toBeNull();
    expect(mounts()).toBe(1);

    // The warp comes: the same canvas (no new surface), now seen, with its banner.
    clock.set(START + 100);
    await rerender(layer(warpHit(), clock.now(), clock));
    expect(screen.getByTestId('hit-layer-banner', hidden)).toBeOnTheScreen();
    expect(regionOpacity()).not.toBe(0);
    expect(mounts()).toBe(1);

    // It ends: unseen again, still mounted for the next one.
    clock.set(START + 5000);
    await rerender(layer(warpHit(), clock.now(), clock));
    expect(screen.queryByTestId('hit-layer-banner', hidden)).toBeNull();
    expect(regionOpacity('hit-layer-standby-region')).toBe(0);
    expect(mounts()).toBe(1);
  });

  it('a warp before the standby is drawn in its own canvas, and the standby is not made under it', async () => {
    const clock = new ManualClock(START);
    const { rerender } = await render(layer(warpHit(), clock.now(), clock));
    expect(mounts()).toBe(1);
    // The standby's time passes while the warp is on: nothing new is made (it would replace the drawn canvas).
    await settle();
    clock.set(START + 3500);
    await rerender(layer(warpHit(), clock.now(), clock));
    expect(screen.queryByTestId('hit-layer-standby-region', hidden)).toBeNull();
    expect(regionOpacity()).not.toBe(0);
    expect(mounts()).toBe(1);
    // After it, once settled again: the standby.
    clock.set(START + 5000);
    await rerender(layer(warpHit(), clock.now(), clock));
    await settle();
    expect(regionOpacity('hit-layer-standby-region')).toBe(0);
    expect(mounts()).toBe(2);
  });

  it('a hit of another kind draws next to the standby, which stays mounted through it and after it', async () => {
    const clock = new ManualClock(START - 5000);
    const { rerender } = await render(layer(null, clock.now(), clock));
    await settle();
    expect(mounts()).toBe(1);

    clock.set(START + 100);
    await rerender(layer(warpHit({ kind: 'fireworks' }), clock.now(), clock));
    expect(screen.getByTestId('hit-fireworks', hidden)).toBeOnTheScreen();
    expect(regionOpacity()).not.toBe(0);
    // The warp's canvas is still the same one, unseen.
    expect(screen.getByTestId('hit-warp', hidden)).toBeOnTheScreen();
    expect(regionOpacity('hit-layer-standby-region')).toBe(0);
    expect(mounts()).toBe(2);

    clock.set(START + 5000);
    await rerender(layer(warpHit({ kind: 'fireworks' }), clock.now(), clock));
    expect(screen.queryByTestId('hit-fireworks', hidden)).toBeNull();
    expect(screen.getByTestId('hit-warp', hidden)).toBeOnTheScreen();
    expect(mounts()).toBe(2);
  });

  it('without a standby kind (a practice, or no warps in this game) nothing is mounted between hits', async () => {
    const clock = new ManualClock(START - 3000);
    await render(<HitLayer hit={null} now={clock.now()} clock={clock} topInset={0} feedback={false} />);
    await settle();
    expect(screen.queryByTestId('hit-warp', hidden)).toBeNull();
    expect(mounts()).toBe(0);
  });
});

describe("the hit's clock starts from the first frame on this phone", () => {
  const hook = (hit: HitTime | null, clock: ManualClock) =>
    renderHook(({ h }: { h: HitTime | null }) => useHitClock(h, clock), { initialProps: { h: hit } });

  it('a hit that reaches me 180 ms into its time starts at 0, not where the server says it is', async () => {
    const clock = new ManualClock(START + 180);
    const { result } = await hook({ endsAt: START + 5000, totalMs: 5000 }, clock);
    expect(result.current.get()).toBe(0);
  });

  it('a freeze while it is on goes on from where it is drawn (no jump back to the start)', async () => {
    const clock = new ManualClock(START + 180);
    const { result, rerender } = await hook({ endsAt: START + 5000, totalMs: 5000 }, clock);
    result.current.set(1500);
    clock.set(START + 2000);
    await rerender({ h: { endsAt: null, remainingMs: 3000, totalMs: 5000 } });
    expect(result.current.get()).toBe(1500);
  });

  it('a new hit that follows another with no frame between them starts as a new hit', async () => {
    const a = { endsAt: START + 5000, totalMs: 5000, id: 1, kind: 'warp', fromId: 'p2' };
    const clock = new ManualClock(START + 100);
    const { result, rerender } = await hook(a, clock);
    result.current.set(4900);
    // The app was away through A's end and B's start: B (another seq) is the next thing rendered.
    clock.set(START + 5100);
    await rerender({ h: { ...a, id: 2, endsAt: START + 10_000 } });
    expect(result.current.get()).toBe(0);
  });

  it('the same hit whose seq comes a render after its view goes on (it is not a new hit)', async () => {
    const a = { endsAt: START + 5000, totalMs: 5000, id: null, kind: 'warp', fromId: 'p2' };
    const clock = new ManualClock(START + 100);
    const { result, rerender } = await hook(a, clock);
    result.current.set(300);
    await rerender({ h: { ...a, id: 7 } });
    expect(result.current.get()).toBe(300);
  });

  it('a hit that comes in frozen is drawn where it stands', async () => {
    const clock = new ManualClock(START);
    const { result } = await hook({ endsAt: null, remainingMs: 4700, totalMs: 5000 }, clock);
    expect(result.current.get()).toBe(300);
  });

  it('hitClockStep: a long mount frame counts for little, and the hit still ends exactly at its end', () => {
    // The receiver starts it 180 ms late (4820 ms of display time left); the first frame after the mount takes
    // 200 ms, then the phone draws every 40 ms (QA: 20–30 fps during a warp).
    const total = 5000;
    let shown = 0;
    let left = 4820;
    const frames = [200, ...Array.from({ length: 200 }, () => 40)];
    let spent = 0;
    const seen: number[] = [];
    for (const dt of frames) {
      const next = hitClockStep(shown, total, dt, left);
      expect(next).toBeGreaterThanOrEqual(shown);
      if (shown < HIT_START_WINDOW_MS) {
        expect(next - shown).toBeLessThanOrEqual((HIT_MAX_START_STEP_MS * total) / left + 1e-9);
      }
      shown = next;
      left = Math.max(0, left - dt);
      spent += dt;
      seen.push(shown);
      if (spent >= 4820) break;
    }
    // The first frame anyone sees is early in the fade-in, and the fade-in takes several frames.
    expect(hitAlpha(seen[0]!, total, HIT_FADE_IN_MS, 240)).toBeLessThan(0.2);
    expect(seen.filter((t) => t < HIT_FADE_IN_MS).length).toBeGreaterThanOrEqual(6);
    // Over exactly at the end, not before it.
    expect(shown).toBe(total);
    expect(seen[seen.length - 2]!).toBeLessThan(total);
  });
});
