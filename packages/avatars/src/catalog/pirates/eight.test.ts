import { type Extents, markupBounds } from '../../bounds';
import { gimmickAnims, triggeredBy } from '../../gimmick';
import { gimmickNodeKey, gimmickPlans, motionPlan, type NativeRect, nativeLayers } from '../../native';
import { FACE, HAIR, TILE } from '../../palette';
import { CANVAS, defaultIdPrefix, renderAvatar, renderFace } from '../../render';
import { eyeSlots } from '../../rig';
import { checkXml, duplicates } from '../../testing/xml';
import { type AvatarDef, EXPRESSIONS, GIMMICK_DEPTHS, type GimmickTrigger, MOTION_IDS } from '../../types';
import * as eightFile from './eight';
import { GRANDPA_COOK } from './eight';
import { CAPTAIN } from './one';
import { PEG } from './seven';
import {
  PIRATE_LOOKS,
  PIRATE_TILES,
  type PirateCharacter,
  pirateId,
  pirateName,
  wood,
  woodMid,
} from './shared';

/**
 * 8, Grandpa Cook (eight.ts), held to the series' checks (pirates.test.ts) and the catalog's own (index.test.ts,
 * render.test.ts) before he joins the cast, plus his brief: the old man of Moshe's crew, a cook with a steaming
 * pot, a ladle he stirs, a toque, a white beard and brows (docs/avatars/PIRATES.md, section 2).
 */

const LOOKS = PIRATE_LOOKS.map((l) => [l, GRANDPA_COOK.looks[l]] as const);
const { house, invested } = GRANDPA_COOK.looks;

const TILE_BOX: Extents = { x0: 0, y0: 0, x1: 100, y1: 100 };
const holds = (outer: Extents, inner: Extents) =>
  outer.x0 <= inner.x0 + 1e-6 &&
  outer.y0 <= inner.y0 + 1e-6 &&
  outer.x1 >= inner.x1 - 1e-6 &&
  outer.y1 >= inner.y1 - 1e-6;
const extentsOf = (r: NativeRect): Extents => ({ x0: r.x, y0: r.y, x1: r.x + r.width, y1: r.y + r.height });
const inCanvas = (v: number, margin = 0) => v - margin >= 0 && v + margin <= CANVAS;
const ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/** Every piece of art a look draws at rest: its layers and each gimmick. */
const allArt = (a: AvatarDef) => [
  a.layers.back,
  a.layers.front ?? '',
  ...(a.gimmicks ?? []).map((g) => g.markup),
];
const gimmick = (a: AvatarDef, id: string) => (a.gimmicks ?? []).find((g) => g.id === id);
const triggers = (a: AvatarDef, id: string): GimmickTrigger[] =>
  gimmickAnims(gimmick(a, id) ?? { id, markup: '', anim: [] }).flatMap((an) => an.trigger);

/** A clean SVG fragment: well-formed, no ids, no scripts, no links, no text or images. */
const expectClean = (markup: string) => {
  expect(() => checkXml(`<g>${markup}</g>`)).not.toThrow();
  expect(markup).not.toMatch(/\sid=/);
  expect(markup).not.toMatch(/<script|<style|\son[a-z]+=|href|url\(|<image|<text/i);
};

describe('Grandpa Cook (8)', () => {
  it('is the one character eight.ts exports, of the digit 8', () => {
    const characters = Object.values(eightFile).filter(
      (v): v is PirateCharacter => typeof v === 'object' && v !== null && 'digit' in v && 'looks' in v,
    );
    expect(characters).toEqual([GRANDPA_COOK]);
    expect(GRANDPA_COOK.digit).toBe(8);
    expect(Object.keys(GRANDPA_COOK.looks)).toEqual([...PIRATE_LOOKS]);
  });

  it.each(LOOKS)('names the %s look, with its id and the jade tile of the 8', (look, a) => {
    expect(a.id).toBe(pirateId(8, look));
    expect(a.kind).toBe('symbol');
    expect(a.name).toEqual(pirateName({ he: 'סבא הטבח', en: 'Grandpa Cook' }, look));
    expect(a.tile).toBe(PIRATE_TILES[8]);
    expect(a.tile).toBe(TILE.jade);
    // not the Captain's tile, not Peg's
    expect(a.tile).not.toBe(CAPTAIN.looks[look].tile);
    expect(a.tile).not.toBe(PEG.looks[look].tile);
  });

  it('draws both looks with the same face anchors and the same moving parts, so they compare 1:1', () => {
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
    // the invested foot is a little lower, as in the Captain and Peg
    expect(invested.base! - house.base!).toBeGreaterThan(0);
    expect(invested.base! - house.base!).toBeLessThanOrEqual(2);
  });

  it('is one of the series: a wooden digit that squashes, with gimmicks; the invested one of bevelled planks', () => {
    for (const [, a] of LOOKS) {
      expect(a.layers.back).toContain(`fill="${wood.base}"`);
      expect(a.squash).toBe(true);
      expect(a.face.eyes.style).toBe('round');
      expect((a.gimmicks ?? []).length).toBeGreaterThanOrEqual(2);
      expect(a.motionBias?.length).toBeGreaterThanOrEqual(3);
      expect(gimmickPlans(a, { expression: 'neutral', size: 96, idle: true }).length).toBeGreaterThan(0);
    }
    expect(invested.layers.back).toContain(`fill="${woodMid}"`);
    expect(invested.layers.back).toContain(`fill="${wood.light}"`);
  });

  it('draws the invested look with an ink outline, and the house look without one (STYLE.md §5)', () => {
    const outline = `stroke="${FACE.ink}"`;
    expect(allArt(invested).join('')).toContain(outline);
    expect(allArt(house).join('')).not.toContain(outline);
  });

  it('keeps both counters of the 8 open: house ovals cut to the tile, invested planks and a cut slab', () => {
    // the house look cuts two counters (houseCounter fills them with the tile)
    expect(house.layers.back.split(`fill="${house.tile}"`).length - 1).toBe(2);
    // the invested look cuts one: the belly's, through its one slab (as the 6's bowl); the head's counter is the
    // tile between its planks
    expect(allArt(invested).join('').split(`fill="${invested.tile}"`).length - 1).toBe(1);
  });

  it('tucks the house top counter under the toque band, never on his forehead (it read as a bindi)', () => {
    // houseCounter draws each counter as an ellipse in the tile's colour; the top one is the first
    const counters = [
      ...house.layers.back.matchAll(
        new RegExp(
          `<ellipse cx="([\\d.]+)" cy="([\\d.]+)" rx="([\\d.]+)" ry="([\\d.]+)" fill="${house.tile}"`,
          'g',
        ),
      ),
    ].map((m) => ({ cy: Number(m[2]), ry: Number(m[4]) }));
    expect(counters).toHaveLength(2);
    const top = counters[0]!;
    // the toque's band ends at y 13.6: the counter's top slips under it
    expect(gimmick(house, 'toque')!.markup).toContain('13.6H40');
    expect(top.cy - top.ry).toBeLessThan(13.6);
    // and it ends well above the brows (the eyes' room)
    const eyes = eyeSlots(house.face);
    const roomTop = Math.min(...eyes.map((s) => s.c.y - 1.3 * s.r));
    expect(top.cy + top.ry).toBeLessThan(roomTop - 8);
  });

  it('is an old man: white bushy brows, rosy cheeks, adult eyes, a kind slow nod first', () => {
    for (const [, a] of LOOKS) {
      const brows = a.face.brows;
      expect(brows && brows.color).toBe(HAIR.silver.base);
      expect(brows && brows.thickness).toBeGreaterThan(2.3);
      expect(a.face.cheeks).toBeDefined();
      expect(a.face.eyes.r).toBeGreaterThanOrEqual(5.2);
      expect(a.face.eyes.r).toBeLessThanOrEqual(5.3);
      expect(a.motionBias?.[0]).toBe('nod');
      expect(a.motionBias).toEqual(expect.arrayContaining(['wobble', 'tilt']));
    }
  });

  it('plays his brief: the pot steams, he stirs the ladle, the toque puffs and falls, the beard jiggles', () => {
    for (const [, a] of LOOKS) {
      // three puffs of steam, hidden at rest, idling a third of a beat apart
      const puffs = (a.gimmicks ?? []).filter((g) => g.id.startsWith('steam-'));
      expect(puffs.map((g) => g.id)).toEqual(['steam-1', 'steam-2', 'steam-3']);
      const idle = puffs.map((g) => gimmickAnims(g).find((an) => an.trigger.includes('idle'))!);
      for (const [i, an] of idle.entries()) {
        expect(an.loop).toBe(true);
        expect(an.delayMs).toBeCloseTo((i * an.durationMs) / 3, 6);
      }
      for (const g of puffs) {
        expect(g.rest).toBe('hidden');
        expect(gimmickAnims(g).flatMap((an) => an.trigger)).toEqual(
          expect.arrayContaining(['idle', 'smile', 'laugh', 'angry']),
        );
      }
      // the arm (out from behind the belly) and the ladle stir together, round the same point in the soup
      expect(gimmick(a, 'arm')?.z).toBe('behind');
      expect(gimmick(a, 'ladle')?.z).toBe('back');
      expect(gimmickAnims(gimmick(a, 'arm')!)).toEqual(gimmickAnims(gimmick(a, 'ladle')!));
      expect(triggers(a, 'ladle')).toEqual(expect.arrayContaining(['laugh', 'surprised', 'idle', 'sleepy']));
      expect(triggers(a, 'toque')).toEqual(expect.arrayContaining(['surprised', 'sad', 'sleepy', 'laugh']));
      expect(triggers(a, 'beard')).toEqual(['laugh']);
      // the beard and the arm sit under the face; the toque over it
      expect(gimmick(a, 'beard')?.z).toBe('back');
      expect(gimmick(a, 'toque')?.z ?? 'front').toBe('front');
    }
  });

  it('keeps to the series timing: surprises once, joy and follow-through in quick loops, idle slow and small', () => {
    for (const g of house.gimmicks ?? [])
      for (const an of gimmickAnims(g)) {
        if (an.trigger.includes('surprised')) {
          expect(an.loop).toBeFalsy();
          expect(an.durationMs).toBeGreaterThanOrEqual(700);
          expect(an.durationMs).toBeLessThanOrEqual(1100);
        }
        if (an.trigger.includes('idle')) {
          expect(an.loop).toBe(true);
          expect(an.durationMs).toBeGreaterThanOrEqual(2200);
          expect(an.durationMs).toBeLessThanOrEqual(3000);
          for (const k of an.keyframes) expect(Math.abs(k.rotate ?? 0)).toBeLessThanOrEqual(6);
        }
        // a part he moves (not the steam, which keeps the pot's pace)
        if (g.rest !== 'hidden' && an.loop && (an.trigger.includes('laugh') || an.trigger.includes('wobble')))
          expect(an.durationMs).toBeLessThanOrEqual(760);
      }
  });
});

describe.each(LOOKS)('Grandpa Cook, %s look', (_, a) => {
  it('draws only inside its tile, everything measurable', () => {
    for (const art of allArt(a)) {
      const b = markupBounds(art);
      expect(b.known).toBe(true);
      if (b.extents) expect(holds(TILE_BOX, b.extents)).toBe(true);
    }
  });

  it('crops to the toque, the head and the beard in a locked cell, never to the whole numeral', () => {
    const box = a.headBox!;
    expect(box).toBeDefined();
    expect(box.size).toBeGreaterThanOrEqual(54);
    expect(box.size).toBeLessThanOrEqual(62);
    const crop: Extents = { x0: box.x, y0: box.y, x1: box.x + box.size, y1: box.y + box.size };
    for (const s of eyeSlots(a.face))
      expect(holds(crop, { x0: s.c.x - s.r, y0: s.c.y - s.r, x1: s.c.x + s.r, y1: s.c.y + s.r })).toBe(true);
    const m = a.face.mouth;
    expect(m).toBeTruthy();
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

  // The catalog's own checks (index.test.ts, render.test.ts), met before he joins it.

  it('has clean layers, a palette tile and anchors inside the canvas, the eyes far enough apart', () => {
    for (const layer of [a.layers.back, a.layers.front ?? '']) expectClean(layer);
    expect(Object.values(TILE)).toContain(a.tile);
    expect(a.name.he).toMatch(/[֐-׿]/);
    const slots = eyeSlots(a.face);
    for (const s of slots) {
      expect(inCanvas(s.c.x, s.r) && inCanvas(s.c.y, s.r)).toBe(true);
    }
    slots.forEach((p, i) => {
      for (const q of slots.slice(i + 1))
        expect(Math.hypot(q.c.x - p.c.x, q.c.y - p.c.y)).toBeGreaterThanOrEqual(1.35 * (p.r + q.r));
    });
    const m = a.face.mouth;
    if (m) {
      expect(inCanvas(m.x, m.w / 2) && inCanvas(m.y)).toBe(true);
      expect(m.y).toBeGreaterThan(Math.max(...slots.map((s) => s.c.y)));
    }
    expect(inCanvas(a.pivot.x) && inCanvas(a.pivot.y)).toBe(true);
    expect(inCanvas(a.base!)).toBe(true);
    expect(inCanvas(a.face.halo!.x) && inCanvas(a.face.halo!.y)).toBe(true);
    const bias = a.motionBias ?? [];
    expect(new Set(bias).size).toBe(bias.length);
    for (const mo of bias) expect(MOTION_IDS).toContain(mo);
  });

  it('declares well-formed gimmicks', () => {
    const gimmicks = a.gimmicks ?? [];
    const ids = gimmicks.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(gimmicks.filter((g) => g.z === 'face')).toHaveLength(0);
    for (const g of gimmicks) {
      expect(g.id).toMatch(ID);
      expectClean(g.markup);
      expect(g.markup.trim()).not.toBe('');
      expect(GIMMICK_DEPTHS).toContain(g.z ?? 'front');
      for (const an of gimmickAnims(g)) {
        expect(an.trigger.length).toBeGreaterThan(0);
        for (const t of an.trigger) expect([...EXPRESSIONS, ...MOTION_IDS, 'idle']).toContain(t);
        expect(an.trigger).not.toContain('neutral');
        expect(an.trigger).not.toContain('blink');
        expect(an.durationMs).toBeGreaterThan(0);
        expect(an.delayMs ?? 0).toBeGreaterThanOrEqual(0);
        expect(inCanvas(an.origin.x) && inCanvas(an.origin.y)).toBe(true);
        const ts = an.keyframes.map((k) => k.t);
        expect(ts[0]).toBe(0);
        expect(ts[ts.length - 1]).toBe(1);
        for (let i = 1; i < ts.length; i++) expect(ts[i]).toBeGreaterThan(ts[i - 1] ?? 1);
        if (g.rest === 'hidden') expect(an.keyframes.some((k) => (k.opacity ?? 1) > 0)).toBe(true);
      }
    }
  });

  it.each(EXPRESSIONS)(
    'renders well-formed SVG for %s at every size and crop, a face of its own',
    (expression) => {
      for (const size of [24, 48, 160])
        for (const crop of ['tile', 'head'] as const) {
          const svg = renderAvatar(a, { expression, size, crop, idle: true });
          const r = checkXml(svg);
          expect(r.root).toBe('svg');
          expect(duplicates(r.ids)).toEqual([]);
          expect(svg).toContain(`clip-path="url(#${defaultIdPrefix(a)}-clip)"`);
          for (const g of a.gimmicks ?? []) expect(svg).toContain(`class="sfa-gimmick sfa-g-${g.id}"`);
        }
      const others = EXPRESSIONS.filter((e) => e !== expression).map((e) => renderFace(a, e, { size: 160 }));
      expect(others).not.toContain(renderFace(a, expression, { size: 160 }));
    },
  );
});
