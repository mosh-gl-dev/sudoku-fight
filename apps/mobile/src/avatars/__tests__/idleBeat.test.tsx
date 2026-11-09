import { avatarById, gimmickPlans, IDLE_BLINK_MS, MOTIONS, type PropertyPlan } from '@sudoku-fight/avatars';
import { act, renderHook } from '@testing-library/react-native';

import {
  beatKind,
  burstRepeats,
  burstSpanMs,
  IDLE_BURST_MS,
  IDLE_FIRST_BEAT_MS,
  type IdleBeat,
  useIdleBeat,
} from '../idleBeat';

/**
 * A stage avatar idles in beats with a rest between them, never in an endless loop: a screen that never goes
 * quiet defeats uiautomator (our ADB tools, Play's pre-launch crawler) and keeps the GPU busy.
 */

const prop = (loop: boolean, ...durations: number[]): PropertyPlan => ({
  property: 'rotate',
  from: 0,
  segments: durations.map((durationMs) => ({ to: 1, durationMs, ease: 'linear', bezier: [0, 0, 1, 1] })),
  delayMs: 0,
  loop,
});

describe('a burst', () => {
  it('repeats each loop a whole number of times, near IDLE_BURST_MS; a one-shot plays once', () => {
    expect(burstRepeats(prop(true, 300, 300))).toBe(Math.round(IDLE_BURST_MS / 600));
    expect(burstRepeats(prop(true, 5000))).toBe(1);
    expect(burstRepeats(prop(false, 300))).toBe(1);
  });

  it('lasts as long as its longest property, delay included; nothing to move is 0', () => {
    const slow = { ...prop(true, 1000), delayMs: 200 };
    const plan = {
      node: 'n',
      origin: { x: 0, y: 0 },
      rest: {} as never,
      properties: [prop(true, 700), slow],
    };
    expect(burstSpanMs([plan])).toBe(200 + 1000 * burstRepeats(slow));
    expect(burstSpanMs([])).toBe(0);
  });

  it("the calculator's tapping keys make a finite burst (they used to loop forever on Home)", () => {
    const calculator = avatarById('calculator')!;
    const plans = gimmickPlans(calculator, {
      expression: 'neutral',
      motion: null,
      idle: true,
      size: 86,
      reducedMotion: false,
    });
    expect(plans.some((p) => p.properties.some((pp) => pp.loop))).toBe(true);
    const span = burstSpanMs(plans);
    expect(span).toBeGreaterThan(0);
    expect(span).toBeLessThan(IDLE_BURST_MS * 2);
  });
});

describe('useIdleBeat', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const advance = async (ms: number) => {
    await act(async () => {
      jest.advanceTimersByTime(ms);
    });
  };

  it('opens with a burst soon, rests, blinks, rests: still between beats', async () => {
    const burstMs = 1800;
    const { result } = await renderHook(() => useIdleBeat(true, burstMs));
    expect(result.current).toBeNull();
    await advance(IDLE_FIRST_BEAT_MS);
    expect(result.current).toEqual<IdleBeat>({ kind: 'burst', n: 1 });
    await advance(burstMs);
    expect(result.current).toBeNull();
    // The rest is at least IDLE_BLINK_MS.min: the quiet second uiautomator waits for, and more.
    await advance(IDLE_BLINK_MS.min - 1);
    expect(result.current).toBeNull();
    await advance(1);
    expect(result.current).toEqual<IdleBeat>({ kind: 'blink', n: 2 });
    await advance(MOTIONS.blink.durationMs);
    expect(result.current).toBeNull();
    await advance(IDLE_BLINK_MS.min);
    expect(result.current?.kind).toBe('burst');
  });

  it('without anything to burst it only blinks; inactive it is null and schedules nothing', async () => {
    const blinks = await renderHook(() => useIdleBeat(true, 0));
    await advance(IDLE_FIRST_BEAT_MS);
    expect(blinks.result.current?.kind).toBe('blink');
    const off = await renderHook(() => useIdleBeat(false, 1800));
    await advance(20_000);
    expect(off.result.current).toBeNull();
  });

  it('every new start opens with a burst', async () => {
    const view = await renderHook(({ on }: { on: boolean }) => useIdleBeat(on, 1800), {
      initialProps: { on: true },
    });
    await advance(IDLE_FIRST_BEAT_MS);
    expect(view.result.current?.kind).toBe('burst');
    await view.rerender({ on: false });
    expect(view.result.current).toBeNull();
    await view.rerender({ on: true });
    await advance(IDLE_FIRST_BEAT_MS);
    expect(view.result.current?.kind).toBe('burst');
  });

  it('beatKind: odd beats burst when there is something to burst', () => {
    expect([1, 2, 3].map((n) => beatKind(n, 1000))).toEqual(['burst', 'blink', 'burst']);
    expect(beatKind(1, 0)).toBe('blink');
  });
});
