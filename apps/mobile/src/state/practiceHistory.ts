import { create } from 'zustand';

import type { PracticeGameRecord, PracticeRepo } from '../game/practiceRepo';
import { practiceStorageOrNull } from '../game/storage';

/**
 * The practices saved on this phone [D25], newest first, for the home screen's recent list. Interrupted games
 * are listed too. Screens call refresh() when they come into view; the database is the source, nothing here
 * is persisted.
 *
 * A list already read stays as it is while it is read again, and a read that finds the same games changes
 * nothing: Home, read again each time it is shown, renders again only for a list that changed (B14, QA run #2).
 */
export interface PracticeHistoryState {
  recent: PracticeGameRecord[];
  /** 'unavailable': the database could not open (the list stays empty). */
  status: 'idle' | 'loading' | 'ready' | 'unavailable';
  refresh(limit?: number): Promise<void>;
}

export const RECENT_LIMIT = 20;

/** The same games, each as it was (the rows are plain data from the database). */
const sameGames = (a: readonly PracticeGameRecord[], b: readonly PracticeGameRecord[]) =>
  a.length === b.length && a.every((game, i) => JSON.stringify(game) === JSON.stringify(b[i]));

export function createPracticeHistory(repo: () => Promise<PracticeRepo | null> = practiceStorageOrNull) {
  return create<PracticeHistoryState>()((set, get) => {
    let latest = 0;
    return {
      recent: [],
      status: 'idle',
      async refresh(limit = RECENT_LIMIT) {
        const mine = ++latest;
        if (get().status !== 'ready') set({ status: 'loading' });
        let recent: PracticeGameRecord[] | null = null;
        try {
          const r = await repo();
          recent = r ? await r.listRecent(limit) : null;
        } catch (error) {
          console.warn('[practice] could not read the saved games', error);
        }
        if (mine !== latest) return; // a newer refresh answers
        const was = get();
        if (!recent) set({ status: 'unavailable' });
        else if (was.status !== 'ready' || !sameGames(was.recent, recent)) set({ recent, status: 'ready' });
      },
    };
  });
}

export const usePracticeHistory = createPracticeHistory();
