import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { syncSettingsStorage } from './settings';

/**
 * The testing switches a staging build shows in its settings (1.0.2, so Moshe can try staged practice before he
 * decides; config/testing.ts says which builds show them and reads them). Kept on the phone like the settings,
 * apart from them: a production build never shows them and never reads what is kept here.
 *
 * 31.10.2026 (Moshe: "ראיתי דברים מוזרים במסך הגדרות שלא הבנתי"): the "בדיקה" section is hidden until 7 quick
 * taps on the version lines open it (`sectionOpen`, like Android's developer options), and it hides again from
 * inside. Hiding it changes no switch: one that is on stays on.
 */
export interface TestingSwitchesState {
  /** [D64, waiting for Moshe] The next chain stage charges 5 s for a digit that cannot be known yet ('penalty'). */
  chainPenalty: boolean;
  /** Every stage is open on the map (testing only); stars and XP count as usual. */
  unlockAllLevels: boolean;
  /** The settings show the "בדיקה" section: opened by 7 quick taps on the version, closed from inside it. */
  sectionOpen: boolean;
  setChainPenalty: (on: boolean) => void;
  setUnlockAllLevels: (on: boolean) => void;
  setSectionOpen: (open: boolean) => void;
}

export const useTestingSwitches = create<TestingSwitchesState>()(
  persist(
    (set) => ({
      chainPenalty: false,
      unlockAllLevels: false,
      sectionOpen: false,
      setChainPenalty: (chainPenalty) => set({ chainPenalty }),
      setUnlockAllLevels: (unlockAllLevels) => set({ unlockAllLevels }),
      setSectionOpen: (sectionOpen) => set({ sectionOpen }),
    }),
    {
      name: 'testing-switches',
      // Still 1: what an older build kept has no sectionOpen, and the merge with the defaults reads it as closed.
      version: 1,
      storage: createJSONStorage(() => syncSettingsStorage),
      partialize: ({ chainPenalty, unlockAllLevels, sectionOpen }) => ({
        chainPenalty,
        unlockAllLevels,
        sectionOpen,
      }),
    },
  ),
);
