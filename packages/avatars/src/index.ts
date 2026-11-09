/**
 * @sudoku-fight/avatars — our own animated avatars (docs/avatars/STYLE.md).
 * Pure TypeScript: data plus functions that return SVG strings. No React, no DOM, no platform imports, so the
 * app, the admin site and the preview page share it.
 */

export * from './types';
export * from './palette';
export * from './rig';
export * from './render';
export * from './motion';
export * from './gimmick';
export * from './bounds';
export * from './native';
export * from './catalog';
// The Pirates series' own exports (catalog/pirates/index.ts), for /dev/pirates; its looks are in AVATARS since
// 31.10.2026. Its toolbox (catalog/pirates/shared.ts) stays inside the catalog.
export * from './catalog/pirates';
