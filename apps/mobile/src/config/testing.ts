import { LEVEL_RULES, type LevelRules } from '@sudoku-fight/engine';

import { type TestingSwitchesState, useTestingSwitches } from '../state/testingSwitches';
import { serverLabelOf } from './appVersion';
import { serverEndpoint } from './server';

/**
 * The testing switches of a staging build (1.0.2; dev-plan, Moshe's answers of 2026-10-18): the settings' "בדיקה"
 * section, so Moshe can try staged practice before he decides.
 *
 * - "שרשרת: ניחוש עולה 5 ש׳": [D64] is waiting for Moshe, so a chain is built per the original §14
 *   (LEVEL_RULES.chainNotYet 'accept'); the switch plays the next chain stage under the proposal ('penalty').
 * - "פתח את כל השלבים (בדיקה)": every stage open on the map (and "לשלב הבא" past a closed gate), so the later
 *   kinds (the first chain is L085, behind 8 gates) can be tried at once. Stars and XP count as usual.
 *
 * Which builds: a staging build (the server label 'staging': `npm run apk`, eas.json's preview profile), and a
 * development build (Metro) unless it points at production. Never a production build: the section is not
 * shown there, and what the phone kept of the switches is not read (every reader goes through here).
 *
 * Hidden even there (31.10.2026, Moshe: "ראיתי דברים מוזרים במסך הגדרות שלא הבנתי"): the section shows only once
 * UNLOCK_TAPS quick taps on the version lines opened it, like Android's developer options; it stays open on the
 * phone (the store's sectionOpen) until it is hidden again from inside. Hidden or shown, a switch that is on
 * stays on: activeSwitches reads the switches, not the section.
 */

export interface TestingBuildSources {
  /** The server's label (config/appVersion.ts serverLabelOf): 'staging', 'production', 'local' or a host. */
  server: string;
  /** A development build (__DEV__). */
  dev: boolean;
}

/** This build's: its server label, and whether it is a development build. */
export const thisBuild = (): TestingBuildSources => ({
  // By its name: Metro inlines EXPO_PUBLIC_* only when read this way.
  server: serverLabelOf(process.env.EXPO_PUBLIC_SERVER_LABEL, serverEndpoint.hostname),
  dev: __DEV__,
});

/** Does this build show (and read) the testing switches: staging, or a development build not on production. */
export function testingSwitchesAllowed({ server, dev }: TestingBuildSources = thisBuild()): boolean {
  if (server === 'production') return false;
  return server === 'staging' || dev;
}

/** Does the settings screen show the "בדיקה" section: a build that has it, once the taps opened it. */
export function testingSectionShown(
  sectionOpen: boolean = useTestingSwitches.getState().sectionOpen,
  build: TestingBuildSources = thisBuild(),
): boolean {
  return sectionOpen && testingSwitchesAllowed(build);
}

/** Quick taps on the version lines that open the "בדיקה" section (Android's developer options: 7). */
export const UNLOCK_TAPS = 7;
/** A tap is quick when it comes within this long of the one before; a slower one starts the count again. */
export const UNLOCK_TAP_GAP_MS = 1000;

/** The run of quick taps so far: how many, and when the last one was (ms). */
export interface TapRun {
  count: number;
  at: number;
}

/** The run after one more tap at `now`: one more if it was quick, else a new run of one. Pure. */
export function nextTapRun(run: TapRun | null, now: number): TapRun {
  const quick = run !== null && now - run.at >= 0 && now - run.at <= UNLOCK_TAP_GAP_MS;
  return { count: quick ? run.count + 1 : 1, at: now };
}

type Switches = Pick<TestingSwitchesState, 'chainPenalty' | 'unlockAllLevels'>;

/** The switches as the code reads them: all off where they are not allowed. */
export function activeSwitches(
  switches: Switches = useTestingSwitches.getState(),
  build: TestingBuildSources = thisBuild(),
): Switches {
  if (!testingSwitchesAllowed(build)) return { chainPenalty: false, unlockAllLevels: false };
  return { chainPenalty: switches.chainPenalty, unlockAllLevels: switches.unlockAllLevels };
}

/**
 * The stages' rules for an attempt starting now (levels/levelSession.ts): LEVEL_RULES, with a chain's
 * chainNotYet 'penalty' while the staging switch is on [D64]. Read as a stage starts, so flipping the switch
 * changes the next chain stage only.
 */
export function levelRulesNow(switches: Switches = activeSwitches()): LevelRules {
  return switches.chainPenalty ? { ...LEVEL_RULES, chainNotYet: 'penalty' } : LEVEL_RULES;
}

/** "פתח את כל השלבים (בדיקה)", as the map reads it (false where the switches are not allowed). */
export function useUnlockAllLevels(build: TestingBuildSources = thisBuild()): boolean {
  const on = useTestingSwitches((s) => s.unlockAllLevels);
  return on && testingSwitchesAllowed(build);
}
