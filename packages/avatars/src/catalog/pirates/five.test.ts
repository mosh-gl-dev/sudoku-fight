import { type Extents, markupBounds } from '../../bounds';
import { gimmickAnims, sampleGimmick, triggeredBy } from '../../gimmick';
import { poseMatrix } from '../../motion';
import { gimmickNodeKey, gimmickPlans, motionPlan, type NativeRect, nativeLayers } from '../../native';
import { FACE, TILE as TILES } from '../../palette';
import { CANVAS, renderAvatar } from '../../render';
import { eyeSlots } from '../../rig';
import { checkXml } from '../../testing/xml';
import {
  type AvatarDef,
  EXPRESSIONS,
  GIMMICK_DEPTHS,
  type GimmickAnim,
  type GimmickTrigger,
  MOTION_IDS,
} from '../../types';
import * as file from './five';
import { PARROT_KEEPER } from './five';
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
 * 5, the Parrot Keeper (five.ts), held to the series' checks (pirates.test.ts, which also runs them on this
 * file once it exists) and to the catalog's own (catalog/index.test.ts), before it joins PIRATE_CAST; then its
 * own brief: the parrot on the perch bobs and flaps, its wing never comes off it, and every frame stays in the
 * tile.
 */

const { house, invested } = PARROT_KEEPER.looks;
const LOOKS = PIRATE_LOOKS.map((l) => [l, PARROT_KEEPER.looks[l]] as const);

const TILE: Extents = { x0: 0, y0: 0, x1: CANVAS, y1: CANVAS };
const ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const inCanvas = (v: number, margin = 0) => v - margin >= 0 && v + margin <= CANVAS;
const holds = (outer: Extents, inner: Extents, slack = 1e-6) =>
  outer.x0 <= inner.x0 + slack &&
  outer.y0 <= inner.y0 + slack &&
  outer.x1 >= inner.x1 - slack &&
  outer.y1 >= inner.y1 - slack;
const extentsOf = (r: NativeRect): Extents => ({ x0: r.x, y0: r.y, x1: r.x + r.width, y1: r.y + r.height });
const expectClean = (markup: string) => {
  expect(() => checkXml(`<g>${markup}</g>`)).not.toThrow();
  expect(markup).not.toMatch(/\sid=/);
  expect(markup).not.toMatch(/<script|<style|\son[a-z]+=|href|url\(|<image|<text/i);
};
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
/** The top-level pieces of a markup string (this file's art: shapes, and groups with no group inside). */
const pieces = (markup: string): string[] => markup.match(/<g\b[^>]*>.*?<\/g>|<[a-z]+\b[^>]*\/>/g) ?? [];
/** Where each piece of a gimmick paints at progress t of an anim. */
const framed = (markup: string, an: GimmickAnim, t: number): Extents[] => {
  const m = poseMatrix(sampleGimmick(an, t), an.origin)
    .map((v) => v.toFixed(4))
    .join(' ');
  return pieces(markup).flatMap((p) => {
    const b = markupBounds(`<g transform="matrix(${m})">${p}</g>`);
    expect(b.known).toBe(true);
    return b.extents ? [b.extents] : [];
  });
};
/** Where a point lands under an anim's pose at progress t. */
const posed = (an: GimmickAnim, t: number, x: number, y: number) => {
  const [a, b, c, d, e, f] = poseMatrix(sampleGimmick(an, t), an.origin);
  return { x: a * x + c * y + e, y: b * x + d * y + f };
};

describe('the Parrot Keeper (5), as one of the series', () => {
  it('is the one character of its file, the digit 5', () => {
    const characters = Object.values(file).filter(
      (v): v is PirateCharacter => typeof v === 'object' && v !== null && 'digit' in v && 'looks' in v,
    );
    expect(characters).toEqual([PARROT_KEEPER]);
    expect(PARROT_KEEPER.digit).toBe(5);
    expect(Object.keys(PARROT_KEEPER.looks)).toEqual([...PIRATE_LOOKS]);
  });

  it('names both looks and gives them the 5 tile', () => {
    const role = (a: AvatarDef, look: PirateLook) => ({
      he: a.name.he.replace(pirateName({ he: '', en: '' }, look).he, ''),
      en: a.name.en.replace(pirateName({ he: '', en: '' }, look).en, ''),
    });
    for (const [look, a] of LOOKS) {
      expect(a.id).toBe(pirateId(5, look));
      expect(a.kind).toBe('symbol');
      expect(a.tile).toBe(PIRATE_TILES[5]);
      expect(Object.values(TILES)).toContain(a.tile);
      expect(a.name).toEqual(pirateName(role(a, look), look));
      expect(a.name.he).toMatch(/[֐-׿]/);
    }
    expect(role(invested, 'invested')).toEqual(role(house, 'house'));
    expect(role(house, 'house')).toEqual({ he: 'שומר התוכי', en: 'The Parrot Keeper' });
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
    // the invested foot sits a little lower, never higher
    expect(invested.base! - house.base!).toBeGreaterThanOrEqual(0);
    expect(invested.base! - house.base!).toBeLessThanOrEqual(2);
  });

  it('is a wooden digit that squashes, with round eyes, gimmicks and motions', () => {
    for (const [, a] of LOOKS) {
      expect(a.layers.back).toContain(`fill="${wood.base}"`);
      expect(a.squash).toBe(true);
      expect(a.face.eyes.style).toBe('round');
      expect((a.gimmicks ?? []).length).toBeGreaterThanOrEqual(2);
      expect(a.motionBias?.length).toBeGreaterThanOrEqual(3);
      expect((a.gimmicks ?? []).some((g) => gimmickAnims(g).some((an) => an.trigger.includes('idle')))).toBe(
        true,
      );
    }
    // the invested digit is planks: bevelled wood slabs
    expect(invested.layers.back).toContain(`fill="${woodMid}"`);
    expect(invested.layers.back).toContain(`fill="${wood.light}"`);
  });

  it('outlines the invested look in ink, and never the house look (STYLE.md §5)', () => {
    const outline = `stroke="${FACE.ink}"`;
    expect(allArt(invested).join('')).toContain(outline);
    expect(allArt(house).join('')).not.toContain(outline);
  });

  it('is a kid: bigger eyes and cheeks, a short digit under its parrot (PIRATES.md §4)', () => {
    const { eyes, mouth, cheeks, brows } = house.face;
    expect(eyes.r).toBeGreaterThanOrEqual(5.6);
    expect(eyes.r).toBeLessThanOrEqual(6);
    expect(cheeks).toBeDefined();
    expect(brows && brows.color).toBeTruthy();
    if (!mouth) throw new Error('a rig mouth');
    expect(mouth.w).toBeGreaterThanOrEqual(12);
    expect(mouth.w).toBeLessThanOrEqual(13);
    // two open eyes: the patch is Peg's alone
    expect(eyes.count === undefined || eyes.count === 2 ? (eyes.covered ?? null) : 'not two').toBeNull();
  });
});

describe.each(LOOKS)('the Parrot Keeper, %s look', (_, a) => {
  it('draws only inside its tile, everything measurable', () => {
    for (const art of allArt(a)) {
      const b = markupBounds(art);
      expect(b.known).toBe(true);
      if (b.extents) expect(holds(TILE, b.extents)).toBe(true);
    }
  });

  it('crops to the face under the perch in a locked cell, never to the strokes that make a 5', () => {
    const box = a.headBox!;
    expect(box).toBeDefined();
    expect(box.size).toBeGreaterThanOrEqual(54);
    expect(box.size).toBeLessThanOrEqual(62);
    const crop: Extents = { x0: box.x, y0: box.y, x1: box.x + box.size, y1: box.y + box.size };
    // the eyes with the room the rig needs round them (1.3 r: STYLE.md §6)
    for (const s of eyeSlots(a.face)) {
      const room = 1.3 * s.r;
      expect(holds(crop, { x0: s.c.x - room, y0: s.c.y - room, x1: s.c.x + room, y1: s.c.y + room })).toBe(
        true,
      );
    }
    // a bar over a stem over a bowl is the top of a placed 5: the stem's corner (and the parrot on the bar's
    // left end) stay out of the crop, so it shows a bar over a face, a cap's brim
    expect(box.x).toBeGreaterThanOrEqual(37);
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

  it('renders well-formed SVG for every expression, at every size and crop', () => {
    for (const expression of EXPRESSIONS)
      for (const [size, crop] of [
        [160, 'tile'],
        [48, 'tile'],
        [24, 'tile'],
        [22, 'head'],
      ] as const)
        expect(() => checkXml(renderAvatar(a, { expression, size, crop }))).not.toThrow();
  });

  // the catalog's own checks (catalog/index.test.ts), met before joining it
  it('has clean layers, anchors inside the canvas, eyes apart, and real motions', () => {
    for (const layer of [a.layers.back, a.layers.front ?? '']) expectClean(layer);
    const slots = eyeSlots(a.face);
    for (const s of slots) expect(inCanvas(s.c.x, s.r) && inCanvas(s.c.y, s.r)).toBe(true);
    slots.forEach((p, i) => {
      for (const q of slots.slice(i + 1))
        expect(Math.hypot(q.c.x - p.c.x, q.c.y - p.c.y)).toBeGreaterThanOrEqual(1.35 * (p.r + q.r));
    });
    const { mouth, halo } = a.face;
    if (mouth) {
      expect(inCanvas(mouth.x, mouth.w / 2) && inCanvas(mouth.y)).toBe(true);
      expect(mouth.y).toBeGreaterThan(Math.max(...slots.map((s) => s.c.y)));
    }
    expect(inCanvas(a.pivot.x) && inCanvas(a.pivot.y)).toBe(true);
    if (a.base !== undefined) expect(inCanvas(a.base)).toBe(true);
    if (halo) expect(inCanvas(halo.x) && inCanvas(halo.y)).toBe(true);
    const bias = a.motionBias ?? [];
    expect(new Set(bias).size).toBe(bias.length);
    for (const m of bias) expect(MOTION_IDS).toContain(m);
  });

  it('declares well-formed gimmicks', () => {
    const gimmicks = a.gimmicks ?? [];
    const ids = gimmicks.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(gimmicks.filter((g) => g.z === 'face').length).toBeLessThanOrEqual(1);
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
        expect(inCanvas(an.origin.x) && inCanvas(an.origin.y)).toBe(true);
        const ts = an.keyframes.map((k) => k.t);
        expect(ts[0]).toBe(0);
        expect(ts[ts.length - 1]).toBe(1);
        for (let i = 1; i < ts.length; i++) expect(ts[i]).toBeGreaterThan(ts[i - 1] ?? 1);
        if (g.rest === 'hidden') expect(an.keyframes.some((k) => (k.opacity ?? 1) > 0)).toBe(true);
      }
    }
  });

  it('keeps every frame of every gimmick inside the tile', () => {
    for (const g of a.gimmicks ?? []) {
      // the pieces are the whole of the markup
      expect(pieces(g.markup).join('')).toBe(g.markup);
      for (const an of gimmickAnims(g))
        for (let i = 0; i <= 40; i++)
          for (const e of framed(g.markup, an, i / 40)) expect(holds(TILE, e)).toBe(true);
    }
  });
});

describe("the Parrot Keeper's brief", () => {
  it('rocks like a roly-poly (wobble first) on its round bottom', () => {
    for (const [, a] of LOOKS) {
      expect(a.motionBias?.[0]).toBe('wobble');
      expect(a.base).toBeGreaterThanOrEqual(92);
      expect(a.base).toBeLessThanOrEqual(95);
    }
  });

  it('has a parrot that bobs when idle, dances and flaps on laugh, and hops on surprise', () => {
    for (const [, a] of LOOKS) {
      expect(triggers(a, 'parrot')).toEqual(expect.arrayContaining(['idle', 'laugh', 'surprised', 'smile']));
      const flap = gimmickAnims(gimmick(a, 'wing')).find((an) => an.trigger.includes('laugh'))!;
      expect(flap.loop).toBe(true);
      expect(Math.max(...flap.keyframes.map((k) => k.rotate ?? 0))).toBeGreaterThan(45);
      // the idle bob is barely there (PIRATES.md §10: at most 6°, 2200-3000 ms)
      const idle = gimmickAnims(gimmick(a, 'parrot')).find((an) => an.trigger.includes('idle'))!;
      expect(Math.max(...idle.keyframes.map((k) => Math.abs(k.rotate ?? 0)))).toBeLessThanOrEqual(6);
      expect(idle.durationMs).toBeGreaterThanOrEqual(2200);
      expect(idle.durationMs).toBeLessThanOrEqual(3000);
      // the paper boat in the pocket rocks when idle and pops up on surprise
      expect(triggers(a, 'boat')).toEqual(expect.arrayContaining(['idle', 'surprised']));
    }
  });

  it('never lets the wing come off the parrot: they play the same moves, the shoulder riding on the bird', () => {
    for (const [, a] of LOOKS) {
      const bird = gimmickAnims(gimmick(a, 'parrot'));
      const wing = gimmickAnims(gimmick(a, 'wing'));
      expect(wing.map((w) => [w.trigger, w.durationMs, w.loop, w.ease, w.delayMs])).toEqual(
        bird.map((b) => [b.trigger, b.durationMs, b.loop, b.ease, b.delayMs]),
      );
      bird.forEach((b, i) => {
        const w = wing[i]!;
        expect(w.keyframes.map((k) => k.t)).toEqual(b.keyframes.map((k) => k.t));
        const s = w.origin;
        for (let j = 0; j <= 20; j++) {
          const t = j / 20;
          const onBird = posed(b, t, s.x, s.y);
          const onWing = posed(w, t, s.x, s.y);
          // exact on the keyframes; between them the turn and the slide interpolate a hair apart
          expect(Math.hypot(onBird.x - onWing.x, onBird.y - onWing.y)).toBeLessThan(0.25);
        }
      });
    }
  });

  it('keeps the moving parts off the face: nothing crosses the eyes or the mouth while it plays', () => {
    for (const [, a] of LOOKS) {
      const slots = eyeSlots(a.face);
      const m = a.face.mouth;
      if (!m) throw new Error('a rig mouth');
      const room: Extents[] = [
        ...slots.map((s) => ({
          x0: s.c.x - 1.3 * s.r,
          y0: s.c.y - 1.3 * s.r,
          x1: s.c.x + 1.3 * s.r,
          y1: s.c.y + 1.3 * s.r,
        })),
        { x0: m.x - m.w / 2, y0: m.y - 0.15 * m.w, x1: m.x + m.w / 2, y1: m.y + 0.45 * m.w },
      ];
      const meets = (p: Extents, q: Extents) => p.x0 < q.x1 && q.x0 < p.x1 && p.y0 < q.y1 && q.y0 < p.y1;
      for (const g of a.gimmicks ?? [])
        for (const an of gimmickAnims(g))
          for (let i = 0; i <= 20; i++)
            for (const e of framed(g.markup, an, i / 20))
              for (const r of room) expect(meets(e, r)).toBe(false);
    }
  });
});
