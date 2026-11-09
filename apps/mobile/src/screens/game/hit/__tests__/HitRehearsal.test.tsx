import type { InterferenceKind } from '@sudoku-fight/engine';
import { act, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { useSettings } from '../../../../state/settings';
import {
  HIT_REHEARSAL_DELAY_MS,
  HIT_REHEARSAL_HOLD_MS,
  HIT_REHEARSAL_OPACITY,
  HitRehearsal,
  type HitRehearsalProps,
  rehearsalSteps,
  rehearseLater,
} from '../HitRehearsal';

/**
 * The first hit's mount costs, paid ahead (QA fixcheck of APK 14, warp-sound-on-dim-before-overlay: on the first hit
 * of a game the dim showed ~170 ms before the warp's Skia overlay and the banner): each effect this game allows, and
 * the banner, mounted once on idle moments, unseen, never while a real hit is on, never in a practice.
 */

// Skia draws natively; under Jest a canvas is a plain view.
jest.mock(
  '@shopify/react-native-skia',
  () => jest.requireActual('../../../../components/interference/testing/skiaMock').skiaModule,
);

jest.mock('../../../../services/feedback', () => ({ cue: jest.fn() }));

const hidden = { includeHiddenElements: true };
const ALL: InterferenceKind[] = ['fireworks', 'cats', 'warp', 'ink', 'scramble', 'keypad'];
const rules = (kinds: InterferenceKind[], interferences = true) => ({
  interferences,
  interferenceKinds: kinds,
});
const layer = (props: HitRehearsalProps) => <HitRehearsal {...props} />;
const shown = (id: string) => screen.queryByTestId(id, hidden) !== null;

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

/** An idle moment comes (React Native's requestIdleCallback is a timer under Jest). */
const idle = () => advance(100);

/** Time goes on in frames until `id` shows (at most `max` ms); says how long it took. */
async function until(id: string, max = 1_000): Promise<number> {
  for (let t = 0; t <= max; t += 16) {
    if (shown(id)) return t;
    await advance(16);
  }
  throw new Error(`${id} never showed`);
}

beforeEach(() => {
  useSettings.setState({ reduceMotion: 'off' });
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

describe('rehearsalSteps', () => {
  it('the banner, then each allowed kind with an effect of its own, once', () => {
    expect(rehearsalSteps(ALL)).toEqual(['banner', 'fireworks', 'cats', 'warp', 'ink']);
    expect(rehearsalSteps(['warp', 'warp', 'scramble'])).toEqual(['banner', 'warp']);
  });
});

describe('HitRehearsal', () => {
  it('mounts each piece in turn after the delay, unseen and untouchable, then nothing', async () => {
    await render(layer({ rules: rules(['warp', 'ink']), hitOn: false }));
    expect(shown('hit-rehearsal')).toBe(false);
    await advance(HIT_REHEARSAL_DELAY_MS - 1);
    expect(shown('hit-rehearsal')).toBe(false);
    await advance(1);
    await idle();
    expect(shown('hit-rehearsal-banner')).toBe(true);
    const root = screen.getByTestId('hit-rehearsal', hidden);
    expect(StyleSheet.flatten(root.props.style).opacity).toBe(HIT_REHEARSAL_OPACITY);
    expect(root.props.pointerEvents).toBe('none');
    expect(root.props.importantForAccessibility).toBe('no-hide-descendants');

    // Each piece stays its hold, then the next: the warp's overlay, drawn as in the middle of a hit (the same Skia
    // canvas a real hit mounts), then the ink's.
    expect(await until('hit-rehearsal-warp')).toBeGreaterThanOrEqual(HIT_REHEARSAL_HOLD_MS - 100);
    expect(shown('hit-rehearsal-banner')).toBe(false);
    expect(await until('hit-rehearsal-ink')).toBeGreaterThanOrEqual(HIT_REHEARSAL_HOLD_MS - 16);
    await advance(HIT_REHEARSAL_HOLD_MS);
    await idle();
    expect(shown('hit-rehearsal')).toBe(false);
    // And never again in this game.
    await advance(60_000);
    expect(shown('hit-rehearsal')).toBe(false);
  });

  it('nothing while a real hit is on', async () => {
    const { rerender } = await render(layer({ rules: rules(['warp']), hitOn: true }));
    await advance(HIT_REHEARSAL_DELAY_MS);
    await idle();
    expect(shown('hit-rehearsal')).toBe(false);
    await rerender(layer({ rules: rules(['warp']), hitOn: false }));
    expect(shown('hit-rehearsal-banner')).toBe(true);
  });

  it('nothing in a game without interferences (a practice, D44)', async () => {
    await render(layer({ rules: rules(ALL, false), hitOn: false }));
    await advance(HIT_REHEARSAL_DELAY_MS + 10 * HIT_REHEARSAL_HOLD_MS);
    expect(shown('hit-rehearsal')).toBe(false);
  });

  it('stops when the screen goes', async () => {
    const show = jest.fn();
    const stop = rehearseLater(['banner', 'warp'], show, 1_000, 250);
    await advance(1_000);
    await idle();
    expect(show.mock.calls).toEqual([['banner']]);
    stop();
    await advance(10_000);
    expect(show.mock.calls).toEqual([['banner']]);
  });
});
