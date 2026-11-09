import { LEVEL_RULES } from '@sudoku-fight/engine';
import { act, renderHook } from '@testing-library/react-native';

import { useTestingSwitches } from '../../state/testingSwitches';
import {
  activeSwitches,
  levelRulesNow,
  nextTapRun,
  testingSectionShown,
  testingSwitchesAllowed,
  thisBuild,
  UNLOCK_TAP_GAP_MS,
  UNLOCK_TAPS,
  useUnlockAllLevels,
} from '../testing';

/**
 * The testing switches of a staging build (1.0.2, so Moshe can try staged practice before he decides): which
 * builds have them, and that a production build never reads them.
 */

const ON = { chainPenalty: true, unlockAllLevels: true };

afterEach(() => {
  useTestingSwitches.setState({ chainPenalty: false, unlockAllLevels: false, sectionOpen: false });
});

describe('which builds have the testing switches', () => {
  it.each([
    [{ server: 'staging', dev: false }, true],
    [{ server: 'staging', dev: true }, true],
    [{ server: 'local', dev: true }, true],
    [{ server: '192.168.1.20', dev: true }, true],
    [{ server: 'production', dev: false }, false],
    [{ server: 'production', dev: true }, false],
    [{ server: 'local', dev: false }, false],
    [{ server: 'sudoku.example.com', dev: false }, false],
  ])('%j: %s', (build, allowed) => {
    expect(testingSwitchesAllowed(build)).toBe(allowed);
    expect(activeSwitches(ON, build)).toEqual(allowed ? ON : { chainPenalty: false, unlockAllLevels: false });
  });

  it('this build: its server label (EXPO_PUBLIC_SERVER_LABEL, else the host) and __DEV__', () => {
    expect(thisBuild()).toEqual({ server: 'local', dev: true });
  });
});

describe('what the code reads', () => {
  it("[D64] the stages' rules: LEVEL_RULES ('accept'), and 'penalty' with the chain switch", () => {
    expect(levelRulesNow({ chainPenalty: false, unlockAllLevels: false })).toBe(LEVEL_RULES);
    expect(levelRulesNow({ chainPenalty: true, unlockAllLevels: false })).toEqual({
      ...LEVEL_RULES,
      chainNotYet: 'penalty',
    });
    // By default from the store, in this (development) build.
    expect(levelRulesNow().chainNotYet).toBe('accept');
    useTestingSwitches.setState({ chainPenalty: true });
    expect(levelRulesNow().chainNotYet).toBe('penalty');
  });

  it('"פתח את כל השלבים": the switch, and never on production', async () => {
    const staging = await renderHook(() => useUnlockAllLevels({ server: 'staging', dev: false }));
    const production = await renderHook(() => useUnlockAllLevels({ server: 'production', dev: false }));
    expect(staging.result.current).toBe(false);
    await act(async () => useTestingSwitches.getState().setUnlockAllLevels(true));
    expect(staging.result.current).toBe(true);
    expect(production.result.current).toBe(false);
  });
});

describe('the hidden "בדיקה" section (31.10.2026): 7 quick taps on the version open it', () => {
  it('counts quick taps: each within UNLOCK_TAP_GAP_MS of the one before; a slower one starts again', () => {
    expect(UNLOCK_TAPS).toBe(7);
    let run = nextTapRun(null, 10_000);
    expect(run).toEqual({ count: 1, at: 10_000 });
    for (let i = 2; i <= UNLOCK_TAPS; i++) run = nextTapRun(run, run.at + UNLOCK_TAP_GAP_MS);
    expect(run.count).toBe(UNLOCK_TAPS);
    // A pause longer than the gap starts a new run, and so does a clock that went back.
    expect(nextTapRun({ count: 6, at: 10_000 }, 10_000 + UNLOCK_TAP_GAP_MS + 1)).toEqual({
      count: 1,
      at: 10_000 + UNLOCK_TAP_GAP_MS + 1,
    });
    expect(nextTapRun({ count: 6, at: 10_000 }, 9_000).count).toBe(1);
  });

  it('shows the section once opened, in a build that has it; never in production, whatever the phone kept', () => {
    const staging = { server: 'staging', dev: false };
    expect(testingSectionShown(false, staging)).toBe(false);
    expect(testingSectionShown(true, staging)).toBe(true);
    expect(testingSectionShown(true, { server: 'local', dev: true })).toBe(true);
    expect(testingSectionShown(true, { server: 'production', dev: false })).toBe(false);
    expect(testingSectionShown(true, { server: 'production', dev: true })).toBe(false);
    // By default from the store: closed until the taps open it.
    expect(testingSectionShown()).toBe(false);
    useTestingSwitches.getState().setSectionOpen(true);
    expect(testingSectionShown()).toBe(true);
  });

  it('hidden, a switch that is on stays on: the code reads the switches, not the section', () => {
    const staging = { server: 'staging', dev: false };
    useTestingSwitches.setState({ chainPenalty: true, unlockAllLevels: true, sectionOpen: false });
    expect(activeSwitches(undefined, staging)).toEqual(ON);
    expect(levelRulesNow(activeSwitches(undefined, staging)).chainNotYet).toBe('penalty');
  });
});
