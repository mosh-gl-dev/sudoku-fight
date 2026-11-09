import { type AmbientConfig, ambientConfig } from '../../config/ambient';

/**
 * The wandering digits' motion (D126, Moshe 31.10.2026; motion.md §4.13): pure and deterministic, so it can be
 * tested like the interferences' models. No Math.random and no Date.now: the seed is the config's, and the time
 * is the ambient's own clock (the ms it has run, from the display's frames while the app is in the foreground).
 *
 * There is no state and no plan: where a digit is at `t` is a function of `t` and of the field alone. Each digit
 * drifts at its own pace along its own heading, sways gently sideways (a meander) and tilts slowly, and wraps
 * around the screen's edges: the field is the window plus a strip off each edge as wide as a digit and its sway,
 * so a digit leaves the screen whole before it comes back on the other side. Positions never jump, a remount at
 * the same clock shows the same field, and every frame costs the same.
 *
 * Positions are the middle of a digit's ink, in dp from the window's top left. `ambientField` runs in plain JS
 * (once per window size); `poseAt` and `inView` are worklets (every frame, on the UI thread).
 */

/** A glyph's measures (digitPaths.generated.ts), in units of 1/100 of the digits' height. */
export interface GlyphMetrics {
  digit: number;
  width: number;
  top: number;
  descent: number;
}

/** The units of GlyphMetrics: a digit `size` dp tall is scaled by size / GLYPH_UNITS. */
export const GLYPH_UNITS = 100;

export interface AmbientDigit {
  digit: number;
  /** Glyph height, dp. */
  size: number;
  /** The radius of its ink about its middle, dp: turned any way, the ink stays inside it. */
  radius: number;
  /** From the glyph's feet (its path's origin) to the middle of its ink, in glyph units (up is negative). */
  midY: number;
  /** Where its drift starts, in the field (0 … the field's period). */
  x0: number;
  y0: number;
  /** Its heading, a unit vector. */
  ux: number;
  uy: number;
  /** Its drift, dp per ms. */
  v: number;
  /** The sway: dp either way, radians per ms, phase. */
  sway: number;
  swayW: number;
  swayPhase: number;
  /** The tilt: degrees either way, radians per ms, phase. */
  tilt: number;
  tiltW: number;
  tiltPhase: number;
}

export interface AmbientField {
  /** The window, dp. */
  width: number;
  height: number;
  /** The strip off each edge where a digit wraps, dp: the largest ink radius plus the largest sway. */
  margin: number;
  digits: readonly AmbientDigit[];
}

export interface Pose {
  /** The middle of the ink, dp. */
  x: number;
  y: number;
  /** Degrees, clockwise, about the middle. */
  rot: number;
}

// ---- the seeded hash ---------------------------------------------------------------------------------------

/** A number in [0, 1) from integers: the same everywhere (integer maths only), never Math.random. */
export function hash01(seed: number, a: number, b: number, c: number): number {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15) ^ Math.imul(a + 1, 0xc2b2ae35), 0x27d4eb2f);
  h = Math.imul(h ^ (h >>> 13) ^ Math.imul(b + 1, 0x165667b1), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 16) ^ Math.imul(c + 1, 0x7feb352d), 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** What each hash decides (its last argument). */
const SALT = {
  cell: 1,
  jitterX: 2,
  jitterY: 3,
  heading: 4,
  speed: 5,
  sway: 6,
  swayMs: 7,
  swayPhase: 8,
  tilt: 9,
  tiltMs: 10,
  tiltPhase: 11,
} as const;

/** The golden ratio's fraction: i × this, mod 1, spreads any run of digits evenly over [0, 1). */
const GOLDEN = 0.6180339887498949;

const TAU = Math.PI * 2;

const lerp = (range: readonly [number, number], u: number): number => range[0] + (range[1] - range[0]) * u;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

// ---- the ink, the glyphs ---------------------------------------------------------------------------------------

/** `fg` laid over `bg` at `alpha`, as one solid colour (#rrggbb): the ink has no alpha, so overlaps never add up. */
export function mixOver(fg: string, bg: string, alpha: number): string {
  const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const a = rgb(fg);
  const b = rgb(bg);
  return `#${b
    .map((v, i) => Math.round(v + (a[i]! - v) * alpha))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
}

/** The radius of a glyph's ink about its middle, dp, at `size` dp tall. */
export function glyphRadius(g: GlyphMetrics, size: number): number {
  const half = (g.top + g.descent) / 2;
  return (Math.hypot(g.width / 2, half) * size) / GLYPH_UNITS;
}

/** The strip off each edge where a digit wraps: the largest ink radius, plus the largest sway, dp. */
export function ambientMargin(glyphs: readonly GlyphMetrics[], cfg: AmbientConfig = ambientConfig): number {
  const radius = Math.max(0, ...glyphs.map((g) => glyphRadius(g, cfg.sizeDp[1])));
  return Math.ceil(radius + cfg.sway.dp[1]);
}

/** How many digits a window gets: one per areaPerDigitDp2 of the field (window and margins), within the bounds. */
export function ambientCount(
  width: number,
  height: number,
  margin: number,
  cfg: AmbientConfig = ambientConfig,
): number {
  const area = (width + 2 * margin) * (height + 2 * margin);
  return clamp(Math.round(area / cfg.areaPerDigitDp2), cfg.minCount, cfg.maxCount);
}

/** The fastest a digit ever moves, dp/s: its drift and its sway's fastest moment, at right angles. */
export function topSpeedDpS(d: Pick<AmbientDigit, 'v' | 'sway' | 'swayW'>): number {
  return Math.hypot(d.v, d.sway * d.swayW) * 1000;
}

// ---- the field -------------------------------------------------------------------------------------------------

export interface FieldInput {
  /** The window, dp. */
  width: number;
  height: number;
  glyphs: readonly GlyphMetrics[];
  cfg?: AmbientConfig;
}

/**
 * The field for a window: every digit's size, start, heading, pace, sway and tilt. The same window and config give
 * the same field, every run. The digits take turns 1–9 (as many of each), their sizes spread evenly over the range,
 * and they start one in each cell of a grid over the field, in a seeded order, so the first frame is even too.
 */
export function ambientField({ width, height, glyphs, cfg = ambientConfig }: FieldInput): AmbientField {
  const margin = ambientMargin(glyphs, cfg);
  const fieldW = width + 2 * margin;
  const fieldH = height + 2 * margin;
  const count = width > 0 && height > 0 && glyphs.length > 0 ? ambientCount(width, height, margin, cfg) : 0;
  const seed = cfg.seed;

  // A grid of about `count` cells as square as the field allows; each digit gets one cell, in a seeded order.
  const cols = Math.max(1, Math.round(Math.sqrt((count * fieldW) / fieldH)));
  const rows = Math.max(1, Math.ceil(count / cols));
  const order = Array.from({ length: count }, (_, i) => i).sort(
    (a, b) => hash01(seed, a, 0, SALT.cell) - hash01(seed, b, 0, SALT.cell),
  );

  const digits = order.map((cell, i): AmbientDigit => {
    const g = glyphs[i % glyphs.length]!;
    const size = lerp(cfg.sizeDp, (i * GOLDEN) % 1);
    const u = (salt: number) => hash01(seed, i, 0, salt);
    const heading = TAU * u(SALT.heading);
    const v = Math.min(lerp(cfg.speedDpS, u(SALT.speed)), cfg.maxSpeedDpS) / 1000;
    const swayW = TAU / lerp(cfg.sway.ms, u(SALT.swayMs));
    // The sway's fastest moment is at right angles to the drift: together they stay within the cap.
    const room = Math.sqrt(Math.max(0, (cfg.maxSpeedDpS / 1000) ** 2 - v * v));
    const sway = Math.min(lerp(cfg.sway.dp, u(SALT.sway)), room / swayW);
    return {
      digit: g.digit,
      size,
      radius: glyphRadius(g, size),
      midY: (g.descent - g.top) / 2,
      x0: (((cell % cols) + u(SALT.jitterX)) / cols) * fieldW,
      y0: ((Math.floor(cell / cols) + u(SALT.jitterY)) / rows) * fieldH,
      ux: Math.cos(heading),
      uy: Math.sin(heading),
      v,
      sway,
      swayW,
      swayPhase: TAU * u(SALT.swayPhase),
      tilt: lerp(cfg.tilt.deg, u(SALT.tilt)),
      tiltW: TAU / lerp(cfg.tilt.ms, u(SALT.tiltMs)),
      tiltPhase: TAU * u(SALT.tiltPhase),
    };
  });
  return { width, height, margin, digits };
}

// ---- a pose (worklets) -----------------------------------------------------------------------------------------

/** `a` folded into [0, period). */
export function wrap(a: number, period: number): number {
  'worklet';
  return a - period * Math.floor(a / period);
}

/**
 * Where digit `i` is at `t` (ms on the ambient's clock): its drift, wrapped around the field, then its sway across
 * the heading, and its tilt. The wrap happens on the drift alone, in the strip off the window's edges, where the
 * digit and its sway are wholly out of sight.
 */
export function poseAt(field: AmbientField, i: number, t: number): Pose {
  'worklet';
  const d = field.digits[i]!;
  const m = field.margin;
  const s = d.v * t;
  const bx = wrap(d.x0 + d.ux * s, field.width + 2 * m) - m;
  const by = wrap(d.y0 + d.uy * s, field.height + 2 * m) - m;
  const w = d.sway * Math.sin(d.swayW * t + d.swayPhase);
  return {
    x: bx - d.uy * w,
    y: by + d.ux * w,
    rot: d.tilt * Math.sin(d.tiltW * t + d.tiltPhase),
  };
}

/** Whether any of a digit's ink can be on the window at this pose (the picture skips the rest). */
export function inView(field: AmbientField, i: number, pose: Pose): boolean {
  'worklet';
  const r = field.digits[i]!.radius;
  return pose.x > -r && pose.x < field.width + r && pose.y > -r && pose.y < field.height + r;
}
