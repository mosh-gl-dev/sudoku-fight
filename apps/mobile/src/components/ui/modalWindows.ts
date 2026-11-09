import { useLayoutEffect } from 'react';

/**
 * The app's own native windows that are up now (React Native's Modal: ConfirmModal, Sheet). On Android such a
 * window takes the focus from the app's, and AppState says 'blur', just as when the app goes to Recents. A
 * stage freezes and covers its board on 'blur' (QA levels-freeze-background: before Android takes the Recents
 * picture), but not for a window of its own ("לצאת מהשלב?" keeps the stage running under it).
 */
let open = 0;

/** One of the app's own windows is up. */
export const modalWindowOpen = (): boolean => open > 0;

/**
 * Counts this window while `up` (its Modal is on the screen). Counted at the commit, before the native window
 * shows, so its 'blur' always finds it counted.
 */
export function useModalWindow(up: boolean): void {
  useLayoutEffect(() => {
    if (!up) return;
    open += 1;
    return () => {
      open -= 1;
    };
  }, [up]);
}
