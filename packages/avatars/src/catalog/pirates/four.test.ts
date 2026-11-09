import { type Extents, markupBounds } from '../../bounds';
import { gimmickAnims, playingGimmicks, triggeredBy } from '../../gimmick';
import { gimmickNodeKey, gimmickPlans, motionPlan, type NativeRect, nativeLayers } from '../../native';
import { FACE, TILE as TILES } from '../../palette';
import { CANVAS, defaultIdPrefix, renderAvatar, renderFace } from '../../render';
import { eyeSlots } from '../../rig';
import { checkXml, duplicates } from '../../testing/xml';
import { type AvatarDef, EXPRESSIONS, GIMMICK_DEPTHS, type GimmickTrigger, MOTION_IDS } from '../../types';
import * as file from './four';
import {
  PIRATE_LOOKS,
  PIRATE_TILES,
  type PirateCharacter,
  type PirateLook,
  pirateId,
  pirateName,
  wood,
  woodMid,
} from './shared';

/**
 * 4, the Rigger Boy (four.ts), held to the series' checks (pirates.test.ts, which also loads this file by name)
 * and to the catalog's own (catalog/index.test.ts, render.test.ts), which run on him once he joins the cast;
 * then his brief (docs/avatars/PIRATES.md §2): a kid who bounces, a sail that billows in the 4's counter
 * without filling it, a pennant that flutters, a coil of rope that swings.
 */

const isCharacter = (v: unknown): v is PirateCharacter => {
  const c = v as Partial<PirateCharacter> | null;
  return typeof c === 'object' && c !== null && typeof c.digit === 'number' && typeof c.looks === 'object';
};

const boy = file.RIGGER_BOY;
const LOOKS = PIRATE_LOOKS.map((l) => [l, boy.looks[l]] as const);
const ROLE = { he: 'נער החבלים', en: 'The Rigger Boy' };

const TILE: Extents = { x0: 0, y0: 0, x1: 100, y1: 100 };
const extentsOf = (r: NativeRect): Extents => ({ x0: r.x, y0: r.y, x1: r.x + r.width, y1: r.y + r.height });
const holds = (outer: Extents, inner: Extents) =>
  outer.x0 <= inner.x0 + 1e-6 &&
  outer.y0 <= inner.y0 + 1e-6 &&
  outer.x1 >= inner.x1 - 1e-6 &&
  outer.y1 >= inner.y1 - 1e-6;
const inCanvas = (v: number, margin = 0) => v - margin >= 0 && v + margin <= CANVAS;
const ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/** Every piece of art an avatar draws at rest: its layers and each gimmick. */
const allArt = (a: AvatarDef) => [
  a.layers.back,
  a.layers.front ?? '',
  ...(a.gimmicks ?? []).map((g) => g.markup),
];
const gimmick = (a: AvatarDef, id: string) => {
  const g = (a.gimmicks ?? []).find((x) => x.id === id);
  if (!g) throw new Error(`${a.id} has no gimmick ${id}`);
  return g;
};
const triggers = (a: AvatarDef, id: string): GimmickTrigger[] =>
  gimmickAnims(gimmick(a, id)).flatMap((an) => an.trigger);

/** A clean SVG fragment: well-formed, no ids, no scripts, no links, no text or images (catalog/index.test.ts). */
const expectClean = (markup: string) => {
  expect(() => checkXml(`<g>${markup}</g>`)).not.toThrow();
  expect(markup).not.toMatch(/\sid=/);
  expect(markup).not.toMatch(/<script|<style|\son[a-z]+=|href|url\(|<image|<text/i);
};

describe('the Rigger Boy (4)', () => {
  it("is his file's one character, the digit 4", () => {
    expect(Object.values(file).filter(isCharacter)).toEqual([boy]);
    expect(boy.digit).toBe(4);
  });

  it('names both looks after his role and gives them the 4’s tile', () => {
    for (const look of PIRATE_LOOKS) {
      const a = boy.looks[look];
      expect(a.id).toBe(pirateId(4, look));
      expect(a.kind).toBe('symbol');
      expect(a.tile).toBe(PIRATE_TILES[4]);
      expect(a.name).toEqual(pirateName(ROLE, look));
      expect(a.name.he).toMatch(/[֐-׿]/);
    }
  });

  it('draws both looks with the same face anchors and the same moving parts, so they compare 1:1', () => {
    const { house, invested } = boy.looks;
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
    // the invested foot is a little lower
    expect(invested.base).toBeGreaterThanOrEqual(house.base ?? 100);
  });

  it('is one of the series: a wooden digit that squashes, with gimmicks; planks in the invested look', () => {
    for (const look of PIRATE_LOOKS) {
      const a = boy.looks[look];
      expect(a.layers.back).toContain(`fill="${wood.base}"`);
      expect(a.squash).toBe(true);
      expect(a.face.eyes.style).toBe('round');
      expect((a.gimmicks ?? []).length).toBeGreaterThanOrEqual(2);
      expect(a.motionBias?.length).toBeGreaterThanOrEqual(3);
      expect(gimmickAnims(gimmick(a, 'pennant')).some((an) => triggeredBy(an, 'idle'))).toBe(true);
    }
    expect(boy.looks.invested.layers.back).toContain(`fill="${woodMid}"`);
    expect(boy.looks.invested.layers.back).toContain(`fill="${wood.light}"`);
  });

  it('draws the invested look with an ink outline, and the house look without one (STYLE.md §5)', () => {
    const outline = `stroke="${FACE.ink}"`;
    expect(allArt(boy.looks.invested).join('')).toContain(outline);
    expect(allArt(boy.looks.house).join('')).not.toContain(outline);
  });

  it('is a kid: big eyes, cheeks, a small mouth, low on his short digit (PIRATES.md §4, §8)', () => {
    for (const [, a] of LOOKS) {
      const { eyes, mouth, cheeks } = a.face;
      expect(eyes.r).toBeGreaterThanOrEqual(5.6);
      expect(eyes.r).toBeLessThanOrEqual(6);
      const [l, r] = eyeSlots(a.face);
      expect(l && r && l.c.y === r.c.y).toBe(true);
      const apart = r!.c.x - l!.c.x;
      expect(apart).toBeGreaterThanOrEqual(16);
      expect(apart).toBeLessThanOrEqual(17);
      expect(cheeks).toBeDefined();
      if (!mouth) throw new Error('a rig mouth');
      expect(mouth.w).toBeGreaterThanOrEqual(12);
      expect(mouth.w).toBeLessThanOrEqual(13);
      expect(mouth.y - l!.c.y).toBeGreaterThanOrEqual(11);
      expect(mouth.y - l!.c.y).toBeLessThanOrEqual(20);
    }
  });

  it("plays his brief's moves: a kid's bounce, the sail, the pennant and the coil of rope", () => {
    for (const [, a] of LOOKS) {
      expect(a.motionBias).toEqual(['bounce', 'flip', 'tilt', 'squash']);
      expect(a.gimmicks?.map((g) => g.id)).toEqual(['sail', 'pennant', 'coil']);
      // the sail comes out of the counter from behind the frame; it billows, fills, breathes and goes slack
      expect(gimmick(a, 'sail').z).toBe('behind');
      expect(triggers(a, 'sail')).toEqual(
        expect.arrayContaining(['laugh', 'surprised', 'smile', 'idle', 'sad', 'sleepy']),
      );
      // the pennant flutters with his moves, when idle, and droops when he is sad
      expect(triggers(a, 'pennant')).toEqual(
        expect.arrayContaining(['laugh', 'surprised', 'bounce', 'squash', 'flip', 'idle', 'sad']),
      );
      // the coil swings when he bounces and jumps when he is surprised
      expect(triggers(a, 'coil')).toEqual(expect.arrayContaining(['bounce', 'squash', 'laugh', 'surprised']));
      // nothing hidden at rest: every part is a finished rest pose
      for (const g of a.gimmicks ?? []) expect(g.rest ?? 'shown').toBe('shown');
    }
  });

  it("keeps the 4's counter open: the sail never reaches the boy, even full of wind", () => {
    // the stem (the boy) starts at x 56; the counter's top corner meets it at y ~34.6
    const STEM_X = 56;
    for (const [, a] of LOOKS) {
      const sail = gimmick(a, 'sail');
      const b = markupBounds(sail.markup).extents!;
      for (const an of gimmickAnims(sail)) {
        // it only grows or shrinks around its tack, on the yard, so it never slides off the yard
        expect(an.keyframes.every((k) => !k.x && !k.y && !k.rotate)).toBe(true);
        for (const k of an.keyframes) {
          // its free edge stays clear of the stem, and its head below the counter's top corner
          expect(an.origin.x + (b.x1 - an.origin.x) * (k.sx ?? 1)).toBeLessThan(STEM_X - 1);
          expect(an.origin.y + (b.y0 - an.origin.y) * (k.sy ?? 1)).toBeGreaterThan(34.6);
        }
      }
      // at rest the sail leaves at least 4 units of tile between its edge and the boy
      expect(b.x1).toBeLessThanOrEqual(STEM_X - 4);
    }
  });

  it("meets the catalog's checks: palette tile, clean SVG, anchors in the canvas, real motions, sound gimmicks", () => {
    for (const [, a] of LOOKS) {
      expect(Object.values(TILES)).toContain(a.tile);
      for (const layer of [a.layers.back, a.layers.front ?? '']) expectClean(layer);
      const slots = eyeSlots(a.face);
      for (const s of slots) expect(inCanvas(s.c.x, s.r) && inCanvas(s.c.y, s.r)).toBe(true);
      slots.forEach((p, i) => {
        for (const q of slots.slice(i + 1))
          expect(Math.hypot(q.c.x - p.c.x, q.c.y - p.c.y)).toBeGreaterThanOrEqual(1.35 * (p.r + q.r));
      });
      const m = a.face.mouth;
      if (m) {
        expect(inCanvas(m.x, m.w / 2) && inCanvas(m.y)).toBe(true);
        expect(m.y).toBeGreaterThan(Math.max(...slots.map((s) => s.c.y)));
      }
      expect(inCanvas(a.pivot.x) && inCanvas(a.pivot.y) && inCanvas(a.base ?? 100)).toBe(true);
      expect(a.face.halo && inCanvas(a.face.halo.x) && inCanvas(a.face.halo.y)).toBe(true);
      const hb = a.headBox!;
      expect(inCanvas(hb.x) && inCanvas(hb.y) && inCanvas(hb.x + hb.size) && inCanvas(hb.y + hb.size)).toBe(
        true,
      );
      const bias = a.motionBias ?? [];
      expect(new Set(bias).size).toBe(bias.length);
      for (const mo of bias) expect(MOTION_IDS).toContain(mo);
      const gimmicks = a.gimmicks ?? [];
      expect(new Set(gimmicks.map((g) => g.id)).size).toBe(gimmicks.length);
      for (const g of gimmicks) {
        expect(g.id).toMatch(ID);
        expectClean(g.markup);
        expect(GIMMICK_DEPTHS).toContain(g.z ?? 'front');
        for (const an of gimmickAnims(g)) {
          expect(an.trigger.length).toBeGreaterThan(0);
          for (const t of an.trigger) expect([...EXPRESSIONS, ...MOTION_IDS, 'idle']).toContain(t);
          expect(an.trigger).not.toContain('neutral');
          expect(an.trigger).not.toContain('blink');
          expect(an.durationMs).toBeGreaterThan(0);
          expect(inCanvas(an.origin.x) && inCanvas(an.origin.y)).toBe(true);
          const ts = an.keyframes.map((k) => k.t);
          expect(ts[0]).toBe(0);
          expect(ts[ts.length - 1]).toBe(1);
          for (let i = 1; i < ts.length; i++) expect(ts[i]).toBeGreaterThan(ts[i - 1] ?? 1);
          // a loop does not jump at its seam
          if (an.loop) expect({ ...an.keyframes[ts.length - 1], t: 0 }).toEqual({ ...an.keyframes[0], t: 0 });
        }
      }
    }
  });
});

describe.each(LOOKS)('pirate 4, %s look', (_look: PirateLook, a) => {
  it('draws only inside its tile, everything measurable', () => {
    for (const art of allArt(a)) {
      const b = markupBounds(art);
      expect(b.known).toBe(true);
      if (b.extents) expect(holds(TILE, b.extents)).toBe(true);
    }
  });

  it('crops to the face and the hair in a locked cell, never to the whole numeral', () => {
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
    expect(box.size).toBeGreaterThanOrEqual(54);
    expect(box.size).toBeLessThanOrEqual(62);
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
      for (const expression of ['neutral', 'surprised', 'laugh', 'sad'] as const) {
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
    // the app plays what playingGimmicks picks (motion, then face, then idle)
    for (const st of [
      { expression: 'laugh', size: 160, motion: 'bounce' },
      { expression: 'sad', size: 96, motion: 'shake' },
      { expression: 'surprised', size: 96, idle: true },
    ] as const)
      expect(gimmickPlans(a, st).map((p) => `${p.gimmick}#${p.index}`)).toEqual(
        playingGimmicks(a, st).map((p) => `${p.gimmick.id}#${p.index}`),
      );
  });

  it.each(EXPRESSIONS)('renders well-formed SVG for %s at every size and crop', (expression) => {
    for (const size of [24, 48, 160])
      for (const crop of ['tile', 'head'] as const) {
        const svg = renderAvatar(a, { expression, size, crop, idle: true });
        const r = checkXml(svg);
        expect(r.root).toBe('svg');
        expect(duplicates(r.ids)).toEqual([]);
        expect(svg).toContain(`clip-path="url(#${defaultIdPrefix(a)}-clip)"`);
        for (const g of a.gimmicks ?? []) expect(svg).toContain(`class="sfa-gimmick sfa-g-${g.id}"`);
      }
  });

  it('draws a different face for every expression', () => {
    expect(new Set(EXPRESSIONS.map((e) => renderFace(a, e, { size: 160 }))).size).toBe(EXPRESSIONS.length);
  });
});
