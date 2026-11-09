import { type Extents, markupBounds } from '../../bounds';
import { gimmickAnims, triggeredBy } from '../../gimmick';
import { gimmickNodeKey, gimmickPlans, motionPlan, type NativeRect, nativeLayers } from '../../native';
import { CLOTH, FACE, FUR, HAIR, OBJECT, SKIN, TILE } from '../../palette';
import { CANVAS, renderAvatar } from '../../render';
import { eyeSlots } from '../../rig';
import { checkXml } from '../../testing/xml';
import { type AvatarDef, EXPRESSIONS, GIMMICK_DEPTHS, type GimmickTrigger, MOTION_IDS } from '../../types';
import {
  brass,
  iron,
  nailHead,
  PIRATE_LOOKS,
  PIRATE_TILES,
  type PirateCharacter,
  type PirateLook,
  pirateId,
  pirateName,
  wood,
  woodMid,
} from './shared';
import * as file from './three';
import { CABIN_GIRL } from './three';

/**
 * The Cabin Girl (3), checked on her own before she joins PIRATE_CAST: the series' checks (pirates.test.ts),
 * the catalog's checks every avatar meets (index.test.ts), and her own moves (docs/avatars/PIRATES.md).
 */

const LOOKS = PIRATE_LOOKS.map((l) => [l, CABIN_GIRL.looks[l]] as const);
const ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const TILE_BOX: Extents = { x0: 0, y0: 0, x1: CANVAS, y1: CANVAS };

const isCharacter = (v: unknown): v is PirateCharacter => {
  const c = v as Partial<PirateCharacter> | null;
  return typeof c === 'object' && c !== null && typeof c.digit === 'number' && typeof c.looks === 'object';
};
const extentsOf = (r: NativeRect): Extents => ({ x0: r.x, y0: r.y, x1: r.x + r.width, y1: r.y + r.height });
const holds = (outer: Extents, inner: Extents) =>
  outer.x0 <= inner.x0 + 1e-6 &&
  outer.y0 <= inner.y0 + 1e-6 &&
  outer.x1 >= inner.x1 - 1e-6 &&
  outer.y1 >= inner.y1 - 1e-6;
const inCanvas = (v: number, margin = 0) => v - margin >= 0 && v + margin <= CANVAS;

/** Every piece of art a look draws at rest: its layers and each gimmick. */
const allArt = (a: AvatarDef) => [
  a.layers.back,
  a.layers.front ?? '',
  ...(a.gimmicks ?? []).map((g) => g.markup),
];
const gimmick = (a: AvatarDef, id: string) => (a.gimmicks ?? []).find((g) => g.id === id);
const triggers = (a: AvatarDef, id: string): GimmickTrigger[] =>
  gimmickAnims(gimmick(a, id)!).flatMap((an) => an.trigger);
const role = (a: AvatarDef, look: PirateLook) => ({
  he: a.name.he.replace(pirateName({ he: '', en: '' }, look).he, ''),
  en: a.name.en.replace(pirateName({ he: '', en: '' }, look).en, ''),
});

/** A clean SVG fragment: well-formed, no ids, no scripts, no links, no text or images. */
const expectClean = (markup: string) => {
  expect(() => checkXml(`<g>${markup}</g>`)).not.toThrow();
  expect(markup).not.toMatch(/\sid=/);
  expect(markup).not.toMatch(/<script|<style|\son[a-z]+=|href|url\(|<image|<text/i);
};

/** The colours she may use: the palette's and the series' own mixes (no pasted hex values). */
const ALLOWED = new Set<string>([
  ...[SKIN, HAIR, FUR, OBJECT, CLOTH].flatMap((group) =>
    Object.values(group).flatMap((r) => [r.base, r.shade, r.light]),
  ),
  ...Object.values(FACE),
  ...Object.values(TILE),
  woodMid,
  brass.base,
  brass.shade,
  brass.light,
  iron.base,
  iron.shade,
  iron.light,
  nailHead,
]);

describe('the Cabin Girl (3)', () => {
  it('is the one character of three.ts, of its own digit', () => {
    expect(Object.values(file).filter(isCharacter)).toEqual([CABIN_GIRL]);
    expect(CABIN_GIRL.digit).toBe(3);
    expect(Object.keys(CABIN_GIRL.looks)).toEqual([...PIRATE_LOOKS]);
  });

  it('names her and gives her the rose tile, the same in both looks', () => {
    for (const [look, a] of LOOKS) {
      expect(a.id).toBe(pirateId(3, look));
      expect(a.id).toMatch(ID);
      expect(a.kind).toBe('symbol');
      expect(a.tile).toBe(PIRATE_TILES[3]);
      expect(a.name).toEqual(pirateName(role(a, look), look));
      expect(a.name.he).toMatch(/[֐-׿]/);
    }
    expect(role(CABIN_GIRL.looks.house, 'house')).toEqual({ he: 'נערת הסיפון', en: 'The Cabin Girl' });
    expect(role(CABIN_GIRL.looks.invested, 'invested')).toEqual(role(CABIN_GIRL.looks.house, 'house'));
  });

  it('draws both looks with the same face anchors and the same moving parts, so they compare 1:1', () => {
    const { house, invested } = CABIN_GIRL.looks;
    const { iris, ...investedEyes } = invested.face.eyes;
    expect(iris).toBe(HAIR.honey.base);
    expect(house.face.eyes.iris).toBeUndefined();
    expect(investedEyes).toEqual(house.face.eyes);
    expect({ ...invested.face, eyes: null }).toEqual({ ...house.face, eyes: null });
    for (const k of ['pivot', 'headBox', 'squash', 'motionBias'] as const)
      expect(invested[k]).toEqual(house[k]);
    expect(invested.tile).toBe(house.tile);
    const timing = (a: AvatarDef) =>
      (a.gimmicks ?? []).map((g) => ({ id: g.id, z: g.z, rest: g.rest, anims: gimmickAnims(g) }));
    expect(timing(invested)).toEqual(timing(house));
    // the invested foot sits a little lower, as on the Captain and Peg
    expect(invested.base).toBeGreaterThan(house.base!);
  });

  it('is one of the series: a wooden digit that squashes, a kid with big eyes and cheeks', () => {
    for (const [, a] of LOOKS) {
      expect(a.layers.back).toContain(`fill="${wood.base}"`);
      expect(a.squash).toBe(true);
      expect(a.face.eyes.style).toBe('round');
      // a kid (PIRATES.md §4): bigger eyes, a smaller mouth, cheeks, brows in her hair colour
      expect(a.face.eyes.r).toBeGreaterThanOrEqual(5.6);
      expect(a.face.eyes.r).toBeLessThanOrEqual(6);
      const m = a.face.mouth;
      expect(m && m.w >= 12 && m.w <= 13).toBe(true);
      expect(a.face.cheeks).toBeDefined();
      expect(a.face.brows && a.face.brows.color).toBe(HAIR.auburn.shade);
      expect((a.gimmicks ?? []).length).toBeGreaterThanOrEqual(2);
      expect(a.motionBias?.length).toBeGreaterThanOrEqual(3);
    }
    // the invested digit is planks: bevelled wood slabs
    expect(CABIN_GIRL.looks.invested.layers.back).toContain(`fill="${woodMid}"`);
    expect(CABIN_GIRL.looks.invested.layers.back).toContain(`fill="${wood.light}"`);
  });

  it('draws the invested look with an ink outline, and the house look without one (STYLE.md §5)', () => {
    const outline = `stroke="${FACE.ink}"`;
    expect(allArt(CABIN_GIRL.looks.invested).join('')).toContain(outline);
    expect(allArt(CABIN_GIRL.looks.house).join('')).not.toContain(outline);
  });

  it('paints with the palette and the series colours only', () => {
    for (const [, a] of LOOKS) {
      const used = new Set(allArt(a).flatMap((art) => [...art.matchAll(/#[0-9a-f]{6}/gi)].map((m) => m[0])));
      expect([...used].filter((c) => !ALLOWED.has(c))).toEqual([]);
    }
  });

  it('plays her moves: bounces first, blows bubbles, waves the wand, the ponytail springs up', () => {
    for (const [, a] of LOOKS) {
      // a kid: bounce first, squash too
      expect(a.motionBias?.[0]).toBe('bounce');
      expect(a.motionBias).toContain('squash');
      // something idles on a stage view, quietly
      const idles = (a.gimmicks ?? []).flatMap((g) =>
        gimmickAnims(g).filter((an) => triggeredBy(an, 'idle')),
      );
      expect(idles.length).toBeGreaterThan(0);
      for (const an of idles) expect(an.durationMs).toBeGreaterThanOrEqual(2200);
      // the wand: waves when happy, sways when idle, droops when sad; it comes out of the 3's middle point
      expect(triggers(a, 'wand')).toEqual(expect.arrayContaining(['smile', 'laugh', 'idle', 'sad']));
      // soap bubbles drift out of the ring (hidden until they play), and a big one pops on surprise
      for (const id of ['bubble', 'bubble-2']) {
        expect(gimmick(a, id)?.rest).toBe('hidden');
        expect(triggers(a, id)).toEqual(expect.arrayContaining(['idle', 'laugh']));
      }
      expect(gimmick(a, 'big-bubble')?.rest).toBe('hidden');
      expect(triggers(a, 'big-bubble')).toEqual(['surprised']);
      // the ponytail comes out from behind her head, bounces with her and springs up on surprise
      expect(gimmick(a, 'ponytail')?.z).toBe('behind');
      expect(triggers(a, 'ponytail')).toEqual(
        expect.arrayContaining(['laugh', 'bounce', 'surprised', 'idle']),
      );
      // the surprise is a single beat, as in the series (700–1100 ms)
      for (const g of a.gimmicks ?? [])
        for (const an of gimmickAnims(g))
          if (an.trigger.includes('surprised')) {
            expect(an.loop).toBeFalsy();
            expect(an.durationMs).toBeGreaterThanOrEqual(700);
            expect(an.durationMs).toBeLessThanOrEqual(1100);
          }
    }
  });
});

describe.each(LOOKS)('the Cabin Girl, %s look', (_, a) => {
  it('has layers and gimmicks that are clean SVG fragments', () => {
    for (const layer of [a.layers.back, a.layers.front ?? '']) expectClean(layer);
    for (const g of a.gimmicks ?? []) expectClean(g.markup);
  });

  it('keeps its anchors inside the canvas, the eyes far enough apart to grow', () => {
    const slots = eyeSlots(a.face);
    for (const s of slots) expect(inCanvas(s.c.x, s.r) && inCanvas(s.c.y, s.r)).toBe(true);
    slots.forEach((p, i) => {
      for (const q of slots.slice(i + 1))
        expect(Math.hypot(q.c.x - p.c.x, q.c.y - p.c.y)).toBeGreaterThanOrEqual(1.35 * (p.r + q.r));
    });
    const m = a.face.mouth;
    expect(m).toBeTruthy();
    if (m) {
      expect(inCanvas(m.x, m.w / 2) && inCanvas(m.y)).toBe(true);
      expect(m.y).toBeGreaterThan(Math.max(...slots.map((s) => s.c.y)));
    }
    expect(inCanvas(a.pivot.x) && inCanvas(a.pivot.y)).toBe(true);
    expect(inCanvas(a.base!)).toBe(true);
    expect(a.face.halo && inCanvas(a.face.halo.x) && inCanvas(a.face.halo.y)).toBe(true);
    const b = a.headBox!;
    expect(inCanvas(b.x) && inCanvas(b.y) && inCanvas(b.x + b.size) && inCanvas(b.y + b.size)).toBe(true);
  });

  it('prefers real motions, each once', () => {
    const bias = a.motionBias ?? [];
    expect(new Set(bias).size).toBe(bias.length);
    for (const m of bias) expect(MOTION_IDS).toContain(m);
  });

  it('declares well-formed gimmicks', () => {
    const gimmicks = a.gimmicks ?? [];
    expect(new Set(gimmicks.map((g) => g.id)).size).toBe(gimmicks.length);
    expect(gimmicks.filter((g) => g.z === 'face').length).toBeLessThanOrEqual(1);
    for (const g of gimmicks) {
      expect(g.id).toMatch(ID);
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
        for (let i = 1; i < ts.length; i++) expect(ts[i]).toBeGreaterThan(ts[i - 1]!);
        // a hidden gimmick must show at some point
        if (g.rest === 'hidden') expect(an.keyframes.some((k) => (k.opacity ?? 1) > 0)).toBe(true);
      }
    }
  });

  it('draws only inside its tile, everything measurable', () => {
    for (const art of allArt(a)) {
      const b = markupBounds(art);
      expect(b.known).toBe(true);
      if (b.extents) expect(holds(TILE_BOX, b.extents)).toBe(true);
    }
  });

  it('crops to the face and the hat in a locked cell, never to the whole numeral', () => {
    const box = a.headBox!;
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
      const expected = (a.gimmicks ?? []).filter((g) =>
        gimmickAnims(g).some((an) => triggeredBy(an, expression)),
      ).length;
      expect(gimmickPlans(a, { expression, size: 96 })).toHaveLength(expected);
      expect(gimmickPlans(a, { expression, size: 36 })).toEqual([]);
      expect(gimmickPlans(a, { expression, size: 96, reducedMotion: true })).toEqual([]);
    }
    expect(gimmickPlans(a, { expression: 'neutral', size: 96, idle: true }).length).toBeGreaterThan(0);
  });
});
