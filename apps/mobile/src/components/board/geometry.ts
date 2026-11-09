import type { Insets } from 'react-native';

import { size, tokens } from '../../theme';

/**
 * Board geometry of direction C (components.md §11.1): 3 × 3 boxes with 3 dp gaps, 3 × 3 cells per box with
 * 1 dp lines. At the design's 358 dp a cell is ((358 − 6) ÷ 3 − 2) ÷ 3 ≈ 38.4 dp, and every inner value (digit,
 * ring, pill, glyph, mini avatar) scales with the cell. Corner offsets stay whole dp.
 */

const { boxGap, grid } = tokens.border;

export interface BoardGeometry {
  /** Side of the whole board. */
  width: number;
  /** Side of one cell. */
  cell: number;
  /** Cell size relative to the design's (1 at 358 dp). */
  scale: number;
  /**
   * The system text is large (fontScale ≥ LARGE_TEXT.fontScale, BRD-3): the cells draw their digits a little
   * bigger, within the cell. Absent: the design's sizes.
   */
  largeText?: boolean;
}

export function boardGeometry(width: number = size.board, { largeText = false } = {}): BoardGeometry {
  const cell = ((width - 2 * boxGap) / 3 - 2 * grid) / 3;
  return { width, cell, scale: cell / size.boardCell, ...(largeText ? { largeText } : null) };
}

/** The cell size of a board of `width`, for a single cell drawn on its own. */
export const geometryForCell = (cell: number = size.boardCell): BoardGeometry =>
  boardGeometry(3 * (3 * cell + 2 * grid) + 2 * boxGap);

/** A design value (dp) at this board's scale, in whole dp, never below 1. */
export const px = (g: BoardGeometry, dp: number): number => Math.max(1, Math.round(dp * g.scale));

/** A font size at this board's scale, to half a dp. */
export const fontPx = (g: BoardGeometry, dp: number): number => Math.round(dp * g.scale * 2) / 2;

/**
 * BRD-3: the board's digits never follow the system text size (ui/Text scale 'board'): the cell can't grow, and
 * would cut them. From a slightly larger system text on, a cell gives its digits more of itself instead: the
 * digit from about 0.57 to 0.66 of the cell (Rubik 22 → 25 at the design's 38.4 dp), the wrong marks 11 → 12.
 */
export const LARGE_TEXT = { fontScale: 1.15, digit: 25, wrongDigit: 12 } as const;

/** Whether the phone's text size (React Native's fontScale) asks for the cells' larger digits. */
export const isLargeText = (fontScale: number): boolean => fontScale >= LARGE_TEXT.fontScale;

/** A cell's digit or wrong-mark size at this board's scale, larger for large text: font size and line height. */
export function cellTextPx(
  g: BoardGeometry,
  kind: 'digit' | 'wrongDigit',
): { fontSize: number; lineHeight: number } {
  const type = kind === 'digit' ? tokens.type.digitCell : tokens.type.wrongDigit;
  const dp = g.largeText ? LARGE_TEXT[kind] : type.size;
  // The tokens set the line height to the size (22/22, 11/11); keep that ratio at the larger size.
  return { fontSize: fontPx(g, dp), lineHeight: fontPx(g, (dp * type.lineHeight) / type.size) };
}

/** A rect in the board's own coordinates (dp from its top-left corner). */
export interface CellRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Where row or column `k` (0–8) starts: whole boxes with their gap, then cells with their lines. */
const startOf = (k: number, g: BoardGeometry): number =>
  Math.floor(k / 3) * (3 * g.cell + 2 * grid + boxGap) + (k % 3) * (g.cell + grid);

/**
 * Where a cell (index 0–80, row by row) is drawn on the board, in the board's own coordinates: always LTR, so
 * column 1 is on the left in Hebrew too (CLAUDE.md). For what is drawn over the board, like an interference.
 */
export function cellRect(g: BoardGeometry, cell: number): CellRect {
  const row = Math.floor(cell / 9);
  const col = cell % 9;
  return { x: startOf(col, g), y: startOf(row, g), width: g.cell, height: g.cell };
}

/**
 * The extra touch area around a cell. Inside the board each side reaches halfway across the line or box gap to
 * its neighbour, so the whole board is tappable without two cells sharing a point; on the board's outer edge
 * the side reaches out until the target is 44 dp (`size.touch`). Cells can't reach 44 inside the board without
 * overlapping (tokens.json `size.touch`, components.md §17.1).
 */
export function cellHitSlop(row: number, col: number, g: BoardGeometry): Required<Insets> {
  const outer = Math.max(0, (size.touch - g.cell) / 2);
  const before = (k: number) => (k === 0 ? outer : k % 3 === 0 ? boxGap / 2 : grid / 2);
  const after = (k: number) => (k === 8 ? outer : k % 3 === 2 ? boxGap / 2 : grid / 2);
  return { top: before(row), bottom: after(row), left: before(col), right: after(col) };
}

/** Which outer corner of the board a cell sits in; that corner is rounded (radius.board). */
export type BoardCorner = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

export function cornerOf(row: number, col: number): BoardCorner | null {
  if (row === 0 && col === 0) return 'topLeft';
  if (row === 0 && col === 8) return 'topRight';
  if (row === 8 && col === 0) return 'bottomLeft';
  if (row === 8 && col === 8) return 'bottomRight';
  return null;
}
