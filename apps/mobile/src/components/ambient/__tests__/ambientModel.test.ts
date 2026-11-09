import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { type AmbientConfig, ambientConfig } from '../../../config/ambient';
import { tokens } from '../../../theme/tokens.generated';
import {
  type AmbientField,
  ambientCount,
  ambientField,
  ambientMargin,
  GLYPH_UNITS,
  glyphRadius,
  hash01,
  inView,
  mixOver,
  poseAt,
  topSpeedDpS,
  wrap,
} from '../ambientModel';
import { DIGIT_PATHS, DIGIT_UNITS } from '../digitPaths.generated';

/**
 * The wandering digits' motion (D126, Moshe 31.10.2026: "מספרים קטנים (בין 6 ל12 DP) משוטטים על המסך. לאט. כל
 * הזמן"): a pure function of the clock and one fixed seed. Positions never jump, sizes stay 6–12 dp, no digit is
 * ever faster than the cap, and a digit wraps around the screen only when it is wholly off it.
 */

const GLYPHS = DIGIT_PATHS.map(({ digit, width, top, descent }) => ({ digit, width, top, descent }));
/** A 400 × 860 dp phone (Moshe's class of phone, edge to edge). */
const PHONE = { width: 400, height: 860 };
const field = (size = PHONE, cfg: AmbientConfig = ambientConfig) =>
  ambientField({ ...size, glyphs: GLYPHS, cfg });

/** Times from `from` to `to`, every `step` ms. */
const times = (from: number, to: number, step: number): number[] =>
  Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, k) => from + k * step);

/** Whether a digit's whole ink (its circle) is off the window at this moment. */
function offScreen(f: AmbientField, i: number, t: number): boolean {
  const { x, y } = poseAt(f, i, t);
  const r = f.digits[i]!.radius;
  return x + r <= 0 || x - r >= f.width || y + r <= 0 || y - r >= f.height;
}

const visibleAt = (f: AmbientField, t: number): number =>
  f.digits.filter((_, i) => inView(f, i, poseAt(f, i, t))).length;

describe('the seeded hash', () => {
  it('is the same for the same numbers, in [0, 1), and spread', () => {
    expect(hash01(1, 2, 3, 4)).toBe(hash01(1, 2, 3, 4));
    expect(hash01(1, 2, 3, 4)).not.toBe(hash01(2, 2, 3, 4));
    const values = times(0, 999, 1).map((k) => hash01(42, k, 0, 1));
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThan(1);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.55);
  });

  it('never reads Math.random or Date.now (the model is pure: CLAUDE.md)', () => {
    const source = readFileSync(join(__dirname, '..', 'ambientModel.ts'), 'utf8').replace(
      /\/\*[\s\S]*?\*\/|\/\/.*$/gm,
      '',
    );
    expect(source).toMatch(/export function ambientField/);
    expect(source).not.toMatch(/Math\.random|Date\.now|performance\.now/);
  });
});

describe('determinism: one field for the whole app, a function of the clock', () => {
  it('the same window gives the same field, run after run (the seed is the config’s, not a visit’s)', () => {
    expect(field()).toEqual(field());
    expect(field().digits).not.toEqual(field(PHONE, { ...ambientConfig, seed: 7 }).digits);
  });

  it('the same moment gives the same picture: a remount at the same clock shows the same field', () => {
    const a = field();
    const b = field();
    for (const t of [0, 1234, 60_000, 3_600_000]) {
      a.digits.forEach((_, i) => expect(poseAt(a, i, t)).toEqual(poseAt(b, i, t)));
    }
  });

  it('a pose depends only on the field and the time (any frame rate draws the same frame)', () => {
    const f = field();
    const direct = poseAt(f, 5, 10_000);
    for (const t of times(0, 10_000, 333)) poseAt(f, 5, t);
    expect(poseAt(f, 5, 10_000)).toEqual(direct);
  });

  it('wrap folds any number into [0, period)', () => {
    expect(wrap(5, 10)).toBe(5);
    expect(wrap(15, 10)).toBe(5);
    expect(wrap(-3, 10)).toBe(7);
    expect(wrap(0, 10)).toBe(0);
  });
});

describe('"(בין 6 ל12 DP)": the digits and their sizes', () => {
  const f = field();

  it('every size is within 6–12 dp, spread evenly over the range', () => {
    const sizes = f.digits.map((d) => d.size);
    for (const s of sizes) {
      expect(s).toBeGreaterThanOrEqual(ambientConfig.sizeDp[0]);
      expect(s).toBeLessThanOrEqual(ambientConfig.sizeDp[1]);
    }
    expect(ambientConfig.sizeDp).toEqual([6, 12]);
    // Each third of the range holds about a third of the digits.
    const third = (lo: number, hi: number) => sizes.filter((s) => s >= lo && s < hi).length / sizes.length;
    for (const [lo, hi] of [
      [6, 8],
      [8, 10],
      [10, 12.01],
    ] as const) {
      expect(third(lo, hi)).toBeGreaterThan(0.25);
      expect(third(lo, hi)).toBeLessThan(0.42);
    }
  });

  it('the digits 1–9 take turns: as many of each (within one)', () => {
    const counts = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => f.digits.filter((d) => d.digit === n).length);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    expect(Math.min(...counts)).toBeGreaterThan(0);
  });

  it("the paths' units are the model's, and a digit's radius holds its ink however it turns", () => {
    expect(DIGIT_UNITS).toBe(GLYPH_UNITS);
    expect(DIGIT_PATHS.map((g) => g.digit)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const d of f.digits) {
      const g = GLYPHS[d.digit - 1]!;
      const k = d.size / GLYPH_UNITS;
      // The ink box's corners, about its middle (the point the pose places).
      for (const [x, y] of [
        [-g.width / 2, -g.top - d.midY],
        [g.width / 2, g.descent - d.midY],
      ] as const)
        expect(Math.hypot(x * k, y * k)).toBeLessThanOrEqual(d.radius + 1e-9);
      expect(d.radius).toBe(glyphRadius(g, d.size));
    }
  });
});

describe('the density: a light field', () => {
  it('a 400 × 860 phone: about 48 on screen at once, 52 in all (the rest just off its edges)', () => {
    const f = field();
    expect(f.digits.length).toBe(52);
    for (const t of [0, 15_000, 60_000, 300_000, 1_800_000]) {
      const visible = visibleAt(f, t);
      expect(visible).toBeGreaterThanOrEqual(35);
      expect(visible).toBeLessThanOrEqual(60);
    }
  });

  it('follows the area: fewer on a small phone, more on a large one, within 9 and 120', () => {
    const m = ambientMargin(GLYPHS);
    expect(ambientCount(360, 640, m)).toBeLessThan(ambientCount(400, 860, m));
    expect(ambientCount(430, 932, m)).toBeGreaterThan(ambientCount(400, 860, m));
    expect(ambientCount(100, 100, m)).toBe(ambientConfig.minCount);
    expect(ambientCount(1024, 1366, m)).toBe(ambientConfig.maxCount);
    expect(field({ width: 0, height: 0 }).digits).toEqual([]);
  });

  it('starts even: every eighth of the screen (2 × 4) has digits in the first frame', () => {
    const f = field();
    const cells = new Map<string, number>();
    f.digits.forEach((_, i) => {
      const { x, y } = poseAt(f, i, 0);
      if (x < 0 || x >= f.width || y < 0 || y >= f.height) return;
      const key = `${Math.floor((x / f.width) * 2)}:${Math.floor((y / f.height) * 4)}`;
      cells.set(key, (cells.get(key) ?? 0) + 1);
    });
    expect(cells.size).toBe(8);
    for (const n of cells.values()) expect(n).toBeGreaterThanOrEqual(2);
  });
});

describe('"לאט. כל הזמן": slow, steady, never a jump', () => {
  const f = field();
  const STEP = 33;
  const RUN = times(0, 600_000, STEP);

  it('no digit is ever faster than the cap (8 dp/s), by its own numbers', () => {
    expect(ambientConfig.maxSpeedDpS).toBeLessThanOrEqual(8);
    for (const d of f.digits) expect(topSpeedDpS(d)).toBeLessThanOrEqual(ambientConfig.maxSpeedDpS + 1e-9);
    // Its drift alone is within the configured pace.
    for (const d of f.digits) {
      expect(d.v * 1000).toBeGreaterThanOrEqual(ambientConfig.speedDpS[0] - 1e-9);
      expect(d.v * 1000).toBeLessThanOrEqual(ambientConfig.speedDpS[1] + 1e-9);
    }
  });

  it('the cap holds even when the config asks for more: the sway gives way', () => {
    const wild: AmbientConfig = {
      ...ambientConfig,
      speedDpS: [7, 9],
      sway: { dp: [30, 40], ms: [3000, 4000] },
    };
    for (const d of field(PHONE, wild).digits)
      expect(topSpeedDpS(d)).toBeLessThanOrEqual(wild.maxSpeedDpS + 1e-9);
  });

  it('for 10 minutes, every 33 ms: each step is within the cap, but for a wrap, which happens wholly off screen', () => {
    const cap = (ambientConfig.maxSpeedDpS * STEP) / 1000 + 1e-6;
    let wraps = 0;
    f.digits.forEach((_, i) => {
      let mine = 0;
      let a = poseAt(f, i, RUN[0]!);
      for (let k = 1; k < RUN.length; k++) {
        const b = poseAt(f, i, RUN[k]!);
        const step = Math.hypot(b.x - a.x, b.y - a.y);
        a = b;
        if (step <= cap) continue;
        // A wrap: gone on one side, back on the other, never seen to jump.
        expect({
          i,
          t: RUN[k],
          before: offScreen(f, i, RUN[k - 1]!),
          after: offScreen(f, i, RUN[k]!),
        }).toEqual({
          i,
          t: RUN[k],
          before: true,
          after: true,
        });
        mine++;
      }
      // Each digit crosses the screen at least once in 10 minutes ("משוטטים על המסך").
      expect({ i, wraps: mine > 0 }).toEqual({ i, wraps: true });
      wraps += mine;
    });
    expect(wraps).toBeGreaterThan(f.digits.length);
  });

  it('they meander and tilt: the heading sways and the glyph turns, gently', () => {
    for (const d of f.digits) {
      expect(d.sway).toBeGreaterThan(0);
      expect(d.sway).toBeLessThanOrEqual(ambientConfig.sway.dp[1]);
      expect(Math.abs(d.tilt)).toBeGreaterThanOrEqual(ambientConfig.tilt.deg[0]);
      expect(Math.abs(d.tilt)).toBeLessThanOrEqual(ambientConfig.tilt.deg[1]);
    }
    const turns = times(0, 20_000, 500).map((t) => poseAt(f, 0, t).rot);
    expect(Math.max(...turns) - Math.min(...turns)).toBeGreaterThan(1);
  });

  it('the wrap strip is wide enough for the largest digit and its sway', () => {
    const largest = Math.max(...GLYPHS.map((g) => glyphRadius(g, ambientConfig.sizeDp[1])));
    expect(f.margin).toBeGreaterThanOrEqual(largest + ambientConfig.sway.dp[1]);
  });
});

describe('the ink', () => {
  it('is textMuted over bg, solid, at the configured level: #21252c at 13 %', () => {
    expect(mixOver(tokens.color.textMuted, tokens.color.bg, 0.07)).toBe('#191c23');
    expect(mixOver(tokens.color.textMuted, tokens.color.bg, ambientConfig.ink.level)).toBe('#21252c');
  });

  it('is neutral: never a seat colour, gold or the accent (it must not read as an interference, D47)', () => {
    const ink = mixOver(tokens.color.textMuted, tokens.color.bg, ambientConfig.ink.level);
    const [r, g, b] = [1, 3, 5].map((k) => parseInt(ink.slice(k, k + 2), 16));
    expect(Math.max(r!, g!, b!) - Math.min(r!, g!, b!)).toBeLessThanOrEqual(12);
    const forbidden = [
      tokens.color.accent,
      ...tokens.color.players.flatMap((p) => [p.ring, p.digit, p.tint]),
    ];
    expect(forbidden.map((c) => c.toLowerCase())).not.toContain(ink);
  });
});
