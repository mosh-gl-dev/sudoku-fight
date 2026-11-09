import { useWindowDimensions } from 'react-native';

/**
 * The leaderboard's rows on a narrow phone or at a large text size (QA loop 7, 360 dp at font 1.3: Hebrew names
 * cut to one letter, "Bro nze" and "Le vel 6" broken, "זמני" over the level): below this many dp of room at the
 * normal text size (the window's width over its font scale), the provisional chip leaves the number for the line
 * under the name, which wraps, and my pinned row gives "שחק" a line of its own under it. A 360 dp phone at the normal
 * size (and the A16's 384) keeps the design's rows; 360 at 1.1, or 411 at 1.3, takes these.
 */
export const TIGHT_ROWS_ROOM = 340;

export const tightRows = (width: number, fontScale: number): boolean => width / fontScale < TIGHT_ROWS_ROOM;

/** Whether this phone, at its text size, lays the rows out tight (see TIGHT_ROWS_ROOM). */
export function useTightRows(): boolean {
  const { width, fontScale } = useWindowDimensions();
  return tightRows(width, fontScale);
}
