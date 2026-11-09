import { type Extents, markupBounds } from '../../bounds';
import { gimmickAnims, triggeredBy } from '../../gimmick';
import * as pkg from '../../index';
import { gimmickNodeKey, gimmickPlans, motionPlan, type NativeRect, nativeLayers } from '../../native';
import { FACE, TILE as TILES } from '../../palette';
import { renderAvatar } from '../../render';
import { eyeSlots } from '../../rig';
import { checkXml } from '../../testing/xml';
import { type AvatarDef, EXPRESSIONS, type GimmickTrigger, MOTION_IDS } from '../../types';
import { AVATARS, avatarById, CATALOG_FILES } from '../index';
import { __pirateGeometry, PIRATE_CAST, PIRATE_LOOKS, type PirateLook, PIRATES, pirateById } from './index';
import {
  flutter,
  glint,
  houseCounter,
  INK,
  inkedLine,
  inkedRing,
  iron,
  ironSlab,
  PIRATE_TILES,
  type PirateCharacter,
  type PirateDigit,
  pirateId,
  pirateName,
  slab,
  slantedPlank,
  tipAndHop,
  wave,
  wood,
  woodMid,
  woodSlab,
} from './shared';

/**
 * The Pirates series (catalog/pirates/): every character, each in two looks, choosable since 31.10.2026. The
 * catalog's own checks (index.test.ts, render.test.ts) run on the characters of PIRATE_CAST as on every avatar;
 * here, what is the series' own: where the picker shows it, the looks compare 1:1, the series' rules, the brief's
 * moves, the tile and the face crop.
 *
 * The series' checks run on every character of PIRATE_CAST and on every character file of this folder (one.ts …
 * nine.ts, docs/avatars/PIRATES.md), so a character being drawn is checked before it joins the cast.
 */

/** The catalog before the series: the 101 house characters. */
const HOUSE_SET = 101;

/** A character file is named after its digit. */
const FILES = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'] as const;

const isCharacter = (v: unknown): v is PirateCharacter => {
  const c = v as Partial<PirateCharacter> | null;
  return typeof c === 'object' && c !== null && typeof c.digit === 'number' && typeof c.looks === 'object';
};

interface Found {
  file: string;
  digit: PirateDigit;
  characters: PirateCharacter[];
  /** Why the file would not load (not "missing": a file not drawn yet is simply not found). */
  error: Error | null;
}

/** Each character file that exists, with what it exports, or why it would not load. */
const FOUND = FILES.flatMap((file, i): Found[] => {
  const digit = (i + 1) as PirateDigit;
  let mod: Record<string, unknown>;
  try {
    mod = jest.requireActual<Record<string, unknown>>(`./${file}`);
  } catch (error) {
    // not drawn yet; any other error (a typo, a throw) is reported below, against that file only
    if (String(error).includes(`Cannot find module './${file}'`)) return [];
    return [
      { file, digit, characters: [], error: error instanceof Error ? error : new Error(String(error)) },
    ];
  }
  return [{ file, digit, characters: Object.values(mod).filter(isCharacter), error: null }];
});

/** Every character: the cast, then the files not in it yet (by digit). */
const ALL: readonly PirateCharacter[] = [
  ...PIRATE_CAST,
  ...FOUND.flatMap((f) => f.characters).filter((c) => !PIRATE_CAST.some((d) => d.digit === c.digit)),
].sort((a, b) => a.digit - b.digit);

const EACH = PIRATE_LOOKS.flatMap((l) => ALL.map((c) => [c.looks[l].id, c.looks[l]] as const));
const CAST = ALL.map((c) => [c.digit, c] as const);
const captain = PIRATE_CAST.find((c) => c.digit === 1)!;
const peg = PIRATE_CAST.find((c) => c.digit === 7)!;

const extentsOf = (r: NativeRect): Extents => ({ x0: r.x, y0: r.y, x1: r.x + r.width, y1: r.y + r.height });
const holds = (outer: Extents, inner: Extents) =>
  outer.x0 <= inner.x0 + 1e-6 &&
  outer.y0 <= inner.y0 + 1e-6 &&
  outer.x1 >= inner.x1 - 1e-6 &&
  outer.y1 >= inner.y1 - 1e-6;
const TILE: Extents = { x0: 0, y0: 0, x1: 100, y1: 100 };

/** Every piece of art an avatar draws at rest: its layers and each gimmick. */
const allArt = (a: AvatarDef) => [
  a.layers.back,
  a.layers.front ?? '',
  ...(a.gimmicks ?? []).map((g) => g.markup),
];
const triggers = (a: AvatarDef, gimmick: string): GimmickTrigger[] =>
  (a.gimmicks ?? [])
    .filter((g) => g.id === gimmick)
    .flatMap((g) => gimmickAnims(g).flatMap((an) => an.trigger));

describe('the Pirates series', () => {
  it('is choosable (31.10.2026): its own catalog file, the first of the symbols in the picker', () => {
    expect(AVATARS).toHaveLength(HOUSE_SET + PIRATES.length);
    expect(CATALOG_FILES.pirates).toBe(PIRATES);
    for (const a of PIRATES) expect(avatarById(a.id)).toBe(a);
    // the picker's symbols open with the pirates, before the digits
    const symbols = AVATARS.filter((a) => a.kind === 'symbol');
    expect(symbols.slice(0, PIRATES.length + 1).map((a) => a.id)).toEqual([
      ...PIRATES.map((a) => a.id),
      'eight',
    ]);
    // the package exports the series' own pieces beside the catalog, for /dev/pirates
    expect(pkg.PIRATES).toBe(PIRATES);
    expect(pkg.PIRATE_CAST).toBe(PIRATE_CAST);
    expect(pkg.PIRATE_LOOKS).toBe(PIRATE_LOOKS);
    expect(pkg.AVATARS).toBe(AVATARS);
    // the toolbox stays inside the catalog: the package does not export the series' helpers
    expect('slab' in pkg).toBe(false);
    expect('PIRATE_TILES' in pkg).toBe(false);
  });

  it('casts each digit once, in digit order, the Captain (1) and Peg-leg Peg (7) among them', () => {
    const digits = PIRATE_CAST.map((c) => c.digit);
    expect(digits).toEqual(expect.arrayContaining([1, 7]));
    digits.forEach((d, i) => {
      expect(Number.isInteger(d) && d >= 1 && d <= 9).toBe(true);
      if (i) expect(d).toBeGreaterThan(digits[i - 1]!);
    });
    expect(PIRATE_LOOKS).toEqual(['house', 'invested']);
  });

  it('is the whole crew (31.10.2026): every digit 1 to 9, and every character file in the cast', () => {
    expect(PIRATE_CAST.map((c) => c.digit)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(PIRATES).toHaveLength(18);
    for (const f of FOUND) for (const c of f.characters) expect(PIRATE_CAST).toContain(c);
  });

  it('lists the looks look by look, each in cast order, so no two neighbours share a tile', () => {
    expect(PIRATES.map((a) => a.id)).toEqual(
      PIRATE_LOOKS.flatMap((l) => PIRATE_CAST.map((c) => `pirates-${c.digit}-${l}`)),
    );
    PIRATES.slice(1).forEach((a, i) => expect(a.tile).not.toBe(PIRATES[i]!.tile));
    for (const a of PIRATES) {
      expect(a.kind).toBe('symbol');
      expect(pirateById(a.id)).toBe(a);
    }
    expect(pirateById('one')).toBeUndefined();
  });

  it.each(CAST)('names %s and gives it its tile, the same in both looks', (digit, c) => {
    const role = (a: AvatarDef, look: PirateLook) => ({
      he: a.name.he.replace(pirateName({ he: '', en: '' }, look).he, ''),
      en: a.name.en.replace(pirateName({ he: '', en: '' }, look).en, ''),
    });
    for (const look of PIRATE_LOOKS) {
      const a = c.looks[look];
      expect(a.id).toBe(pirateId(digit, look));
      expect(a.tile).toBe(PIRATE_TILES[digit]);
      expect(a.name).toEqual(pirateName(role(a, look), look));
    }
    expect(role(c.looks.invested, 'invested')).toEqual(role(c.looks.house, 'house'));
  });

  it.each(CAST)(
    'draws both looks of %s with the same face anchors and the same moving parts, so they compare 1:1',
    (_, c) => {
      const { house, invested } = c.looks;
      const { iris, ...investedEyes } = invested.face.eyes;
      expect(iris).toBeDefined();
      expect(house.face.eyes.iris).toBeUndefined();
      expect(investedEyes).toEqual(house.face.eyes);
      expect({ ...invested.face, eyes: null }).toEqual({ ...house.face, eyes: null });
      for (const k of ['pivot', 'headBox', 'squash', 'motionBias'] as const)
        expect(invested[k]).toEqual(house[k]);
      expect(invested.tile).toBe(house.tile);
      const timing = (a: AvatarDef) =>
        (a.gimmicks ?? []).map((g) => ({ id: g.id, z: g.z, rest: g.rest, anims: gimmickAnims(g) }));
      expect(timing(invested)).toEqual(timing(house));
    },
  );

  it.each(CAST)('draws %s as one of the series: a wooden digit that squashes, with gimmicks', (_, c) => {
    for (const look of PIRATE_LOOKS) {
      const a = c.looks[look];
      expect(a.layers.back).toContain(`fill="${wood.base}"`);
      expect(a.squash).toBe(true);
      expect(a.face.eyes.style).toBe('round');
      expect((a.gimmicks ?? []).length).toBeGreaterThanOrEqual(2);
      expect(a.motionBias?.length).toBeGreaterThanOrEqual(3);
    }
    // the invested digit is planks: bevelled wood slabs
    expect(c.looks.invested.layers.back).toContain(`fill="${woodMid}"`);
    expect(c.looks.invested.layers.back).toContain(`fill="${wood.light}"`);
  });

  it.each(FOUND.map((f) => [`${f.file}.ts`, f] as const))(
    '%s exports one character, of its own digit',
    (_, f) => {
      if (f.error) throw f.error;
      expect(f.characters.map((c) => c.digit)).toEqual([f.digit]);
    },
  );

  it('draws the invested look with an ink outline, and the house look without one (STYLE.md §5)', () => {
    const outline = `stroke="${FACE.ink}"`;
    for (const c of ALL) {
      expect(allArt(c.looks.invested).join('')).toContain(outline);
      expect(allArt(c.looks.house).join('')).not.toContain(outline);
    }
  });

  it("plays the brief's moves: the Captain's spyglass, hat tip and nod; Peg's hook wave and rocking", () => {
    for (const look of PIRATE_LOOKS) {
      const cap = captain.looks[look];
      expect(cap.motionBias?.[0]).toBe('nod');
      expect(triggers(cap, 'draw-tube')).toContain('surprised');
      expect(triggers(cap, 'hat')).toContain('laugh');
      const p = peg.looks[look];
      expect(p.motionBias?.[0]).toBe('wobble');
      expect(triggers(p, 'hook')).toEqual(expect.arrayContaining(['idle', 'smile', 'laugh']));
      // she rocks on her peg: the wobble turns around her foot
      expect(Math.abs(p.pivot.x - 47)).toBeLessThan(3);
      expect(p.base).toBeGreaterThan(88);
    }
  });

  it('covers her left eye with the patch, and gives the Captain no cheeks (his nose takes the place)', () => {
    for (const look of PIRATE_LOOKS) {
      const eyes = peg.looks[look].face.eyes;
      expect(eyes.count === undefined || eyes.count === 2 ? eyes.covered : null).toBe('left');
      expect(captain.looks[look].face.cheeks).toBeUndefined();
    }
  });
});

describe.each(EACH)('pirate %s', (_, a) => {
  it('draws only inside its tile, everything measurable', () => {
    for (const art of allArt(a)) {
      const b = markupBounds(art);
      expect(b.known).toBe(true);
      if (b.extents) expect(holds(TILE, b.extents)).toBe(true);
    }
  });

  it('crops to the face and the hat in a locked cell, never to the whole numeral', () => {
    const box = a.headBox!;
    expect(box).toBeDefined();
    const crop: Extents = { x0: box.x, y0: box.y, x1: box.x + box.size, y1: box.y + box.size };
    for (const s of eyeSlots(a.face))
      expect(holds(crop, { x0: s.c.x - s.r, y0: s.c.y - s.r, x1: s.c.x + s.r, y1: s.c.y + s.r })).toBe(true);
    const m = a.face.mouth;
    if (m)
      expect(holds(crop, { x0: m.x - m.w / 2, y0: m.y, x1: m.x + m.w / 2, y1: m.y + 0.45 * m.w })).toBe(true);
    // the numeral's lower half stays out: the crop ends well above the foot
    expect(crop.y1).toBeLessThanOrEqual((a.base ?? 100) - 25);
    expect(renderAvatar(a, { size: 22, crop: 'head' })).toContain(
      `viewBox="${box.x} ${box.y} ${box.size} ${box.size}"`,
    );
  });

  it('cuts into native layers that each hold what they draw, at the app sizes', () => {
    for (const [size, crop] of [
      [96, 'tile'],
      [36, 'tile'],
      [22, 'head'],
    ] as const)
      for (const expression of ['neutral', 'surprised', 'laugh'] as const) {
        const { nodes } = nativeLayers(a, { size, crop, expression, pixelRatio: 3 });
        for (const n of nodes) {
          const own = markupBounds(n.markup);
          expect(own.known).toBe(true);
          if (own.extents) expect(n.drawRect && holds(extentsOf(n.drawRect), own.extents)).toBe(true);
        }
        for (const g of a.gimmicks ?? [])
          expect(nodes.some((n) => n.key === gimmickNodeKey(g.id) && n.kind === 'gimmick')).toBe(true);
      }
  });

  it('plays every motion, and its gimmicks only at 48 px and up, never with reduced motion', () => {
    for (const id of MOTION_IDS) expect(motionPlan(a, id).nodes.length).toBeGreaterThan(0);
    for (const expression of EXPRESSIONS) {
      const big = gimmickPlans(a, { expression, size: 96 });
      const expected = (a.gimmicks ?? []).filter((g) =>
        gimmickAnims(g).some((an) => triggeredBy(an, expression)),
      ).length;
      expect(big).toHaveLength(expected);
      expect(gimmickPlans(a, { expression, size: 36 })).toEqual([]);
      expect(gimmickPlans(a, { expression, size: 96, reducedMotion: true })).toEqual([]);
    }
    expect(gimmickPlans(a, { expression: 'neutral', size: 96, idle: true }).length).toBeGreaterThan(0);
  });
});

describe('the slab helpers (the invested look)', () => {
  const { inset, chamfer } = __pirateGeometry;
  const close = (pts: readonly (readonly [number, number])[], want: [number, number][]) =>
    pts.forEach((p, i) => {
      expect(p[0]).toBeCloseTo(want[i]![0], 6);
      expect(p[1]).toBeCloseTo(want[i]![1], 6);
    });

  it('exports the same helpers to the tests and to the character files', () => {
    expect(__pirateGeometry.slab).toBe(slab);
  });

  it('moves a convex outline in by the bevel, in either winding', () => {
    const square: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    close(inset(square, 2), [
      [2, 2],
      [8, 2],
      [8, 8],
      [2, 8],
    ]);
    close(inset([...square].reverse(), 2), [
      [2, 8],
      [8, 8],
      [8, 2],
      [2, 2],
    ]);
  });

  it('cuts the four corners of a rectangle', () => {
    expect(chamfer(0, 0, 20, 10, 2)).toEqual([
      [2, 0],
      [18, 0],
      [20, 2],
      [20, 8],
      [18, 10],
      [2, 10],
      [0, 8],
      [0, 2],
    ]);
  });

  it('lights the edges that face the upper left and shades the others', () => {
    const ramp = { base: '#888888', shade: '#444444', light: '#cccccc' };
    const svg = slab(chamfer(0, 0, 20, 20, 3), ramp, 2, '#666666');
    // the outline behind, the face, and one strip per edge
    expect(svg.startsWith(`<path d="M3 0L17 0L20 3L20 17L17 20L3 20L0 17L0 3Z" fill="${FACE.ink}"`)).toBe(
      true,
    );
    const fills = [...svg.matchAll(/fill="(#[0-9a-f]{6})"/g)].map((m) => m[1]);
    // top, top-right, right, bottom-right, bottom, bottom-left, left, top-left
    expect(fills.slice(2)).toEqual([
      ramp.light,
      '#666666',
      ramp.shade,
      ramp.shade,
      ramp.shade,
      '#666666',
      ramp.light,
      ramp.light,
    ]);
    // without ink: no outline
    expect(slab(chamfer(0, 0, 20, 20, 3), ramp, 2, '#666666', null)).toBe(svg.slice(svg.indexOf('/>') + 2));
  });

  it('makes the standard planks: wood with a 2.4 bevel, iron with a thin one', () => {
    const pts = chamfer(10, 10, 40, 30, 3);
    expect(woodSlab(pts)).toBe(slab(pts, wood, 2.4, woodMid));
    expect(woodSlab(pts, 2.2)).toBe(slab(pts, wood, 2.2, woodMid));
    expect(ironSlab(pts)).toBe(slab(pts, iron, 1, iron.base));
  });

  it('lays a slanted plank and bands across it', () => {
    const p = slantedPlank([60, 84, 51], [40.5, 53, 88.5]);
    expect(p.pts).toEqual([
      [60, 51],
      [84, 51],
      [53, 88.5],
      [40.5, 88.5],
    ]);
    expect(p.left(51)).toBe(60);
    expect(p.right(88.5)).toBe(53);
    expect(p.left(69.75)).toBeCloseTo(50.25, 9);
    const band = p.band(60, 64, 1);
    expect(band[0]).toEqual([p.left(60) - 1, 60]);
    expect(band[2]).toEqual([p.right(64) + 1, 64]);
  });
});

describe('the rest of the toolbox', () => {
  it('draws inked lines and rings: the ink first, wider, then the colour', () => {
    const l = inkedLine('M0 0L10 0', '#123456', 2);
    const ink = l.indexOf(`stroke="${INK}" stroke-width="4.5"`);
    expect(ink).toBeGreaterThan(0);
    expect(l.indexOf('stroke="#123456" stroke-width="2"')).toBeGreaterThan(ink);
    expect(inkedLine('M0 0L10 0', '#123456', 1.8, 3.4)).toContain(`stroke="${INK}" stroke-width="3.4"`);
    const r = inkedRing(50, 50, 2.5, '#123456', 1.2);
    expect(r).toBe(
      `<circle cx="50" cy="50" r="2.5" fill="none" stroke="${INK}" stroke-width="2.6"/>` +
        `<circle cx="50" cy="50" r="2.5" fill="none" stroke="#123456" stroke-width="1.2"/>`,
    );
  });

  it('cuts the house look a counter to the tile, as the round digits do', () => {
    const svg = houseCounter(50, 40, 6, 8, TILES.teal, '#000000');
    expect(() => checkXml(`<g>${svg}</g>`)).not.toThrow();
    expect(svg.startsWith(`<ellipse cx="50" cy="40" rx="6" ry="8" fill="${TILES.teal}"/>`)).toBe(true);
  });

  it('builds the gimmicks with the series timing', () => {
    const o = { x: 10, y: 20 };
    const [tip, hop] = tipAndHop(o);
    expect(tip!.trigger).toEqual(['laugh']);
    expect(hop!.trigger).toEqual(['surprised']);
    expect([tip!.origin, hop!.origin]).toEqual([o, o]);
    const [busy, idle] = flutter(o);
    expect(busy!.loop && idle!.loop).toBe(true);
    expect(idle!.trigger).toEqual(['idle']);
    expect(idle!.durationMs).toBeGreaterThan(busy!.durationMs);
    // a raised hand jerks up toward the face: clockwise on the left, counter-clockwise on the right
    const raise = (side: -1 | 1) => wave(o, { side })[2]!.keyframes[1]!.rotate!;
    expect(raise(-1)).toBeGreaterThan(0);
    expect(raise(1)).toBe(-raise(-1));
    const g = glint([30, 40]);
    expect(g).toMatchObject({ id: 'glint', rest: 'hidden', anim: { origin: { x: 30, y: 40 } } });
  });

  it('names the looks and keeps the ids stable', () => {
    expect(pirateId(4, 'invested')).toBe('pirates-4-invested');
    expect(pirateName({ he: 'הקפטן', en: 'The Captain' }, 'house')).toEqual({
      he: 'הקפטן (סגנון הבית)',
      en: 'The Captain (house style)',
    });
  });

  it('gives every digit its own palette tile', () => {
    const digits: PirateDigit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const tiles = digits.map((d) => PIRATE_TILES[d]);
    expect(new Set(tiles).size).toBe(9);
    for (const t of tiles) expect(Object.values(TILES)).toContain(t);
  });
});
