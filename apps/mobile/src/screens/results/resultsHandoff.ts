import { useGameStore } from '../../game/gameStore';
import { practiceStorageOrNull } from '../../game/storage';
import { loadOnlineResults, loadPracticeResults, type ResultsLoad } from './resultsModel';

/**
 * The results of the game that just ended, read *before* they open and handed to their route, so they are drawn
 * in the very commit that pushes them (QA fixcheck of APK 13, surrender-end-empty-frame-still, the third round:
 * after "כן, להיכנע" or "סיום אימון", 0.6–1.0 s of nothing but the wandering digits between the board and
 * "הפסד", Reduced Motion too).
 *
 * On Android react-native-screens fades the screen a push covers out over its own 150 ms (rns_fade_out) and takes
 * it away in the same transaction, whatever comes over it (ScreenStack.onUpdate): the board was always gone 150
 * ms after the push (loop 7's push only took away the race that deleted it sooner). The results came in over
 * that fade empty: their first commit was the loading state (unseen for RESULTS_QUIET_MS), the read came back
 * an effect and two frames later (app/results/[id].tsx), and the hero then faded in from 0. So the read is done
 * while the final board is still on screen (an online game's at once; a practice's from the phone's database,
 * the board holding a moment longer, never longer than RESULTS_READ_CEILING_MS), and the results' first frame is
 * the hero itself (ResultsScreen `initial`).
 */

/** A read slower than this opens the results all the same; they then read for themselves, as from the history. */
export const RESULTS_READ_CEILING_MS = 1000;

/** Reads a game's results now: the store's online session if it is this game, else the phone's database [D25]. */
export function loadResultsNow(id: string): Promise<ResultsLoad> {
  const online = useGameStore.getState().online;
  if (online?.id === id) return Promise.resolve(loadOnlineResults(id, online));
  return loadPracticeResults(id, {
    repo: practiceStorageOrNull,
    session: () => useGameStore.getState().session,
  });
}

let handed: { id: string; load: ResultsLoad } | null = null;

/** What the game route read for the results it opens (only found results: anything else they read again). */
export function handResults(id: string, load: ResultsLoad): void {
  handed = load.kind === 'found' ? { id, load } : null;
}

/** The results handed over for this game, if any (read as their route first renders). */
export function handedResults(id: string): ResultsLoad | null {
  return handed?.id === id ? handed.load : null;
}

/** The results route has taken what was handed for this game (a later open reads for itself). */
export function clearHandedResults(id: string): void {
  if (handed?.id === id) handed = null;
}

/**
 * The game is over: reads its results, hands them over, then `open()`s them, once. An online game at once; a
 * practice once its database read is back, or after `ceilingMs` (the results then read for themselves).
 */
export function readResultsThenOpen(
  id: string,
  open: () => void,
  ceilingMs: number = RESULTS_READ_CEILING_MS,
): void {
  const online = useGameStore.getState().online;
  if (online?.id === id) {
    handResults(id, loadOnlineResults(id, online));
    open();
    return;
  }
  let opened = false;
  const go = () => {
    if (opened) return;
    opened = true;
    clearTimeout(ceiling);
    open();
  };
  const ceiling = setTimeout(go, ceilingMs);
  loadResultsNow(id).then(
    (load) => {
      if (!opened) handResults(id, load);
      go();
    },
    () => go(),
  );
}
