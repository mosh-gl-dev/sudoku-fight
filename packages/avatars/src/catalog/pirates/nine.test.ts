import { type Extents, markupBounds } from '../../bounds';
import { gimmickAnims, sampleGimmick, triggeredBy } from '../../gimmick';
import { poseMatrix } from '../../motion';
import { gimmickNodeKey, gimmickPlans, motionPlan, type NativeRect, nativeLayers } from '../../native';
import { FACE, HAIR, TILE as TILES } from '../../palette';
import { CANVAS, renderAvatar } from '../../render';
import { eyeSlots } from '../../rig';
import { checkXml } from '../../testing/xml';
import { type AvatarDef, EXPRESSIONS, GIMMICK_DEPTHS, type GimmickTrigger, MOTION_IDS } from '../../types';
import * as nine from './nine';
import { NAVIGATOR } from './nine';
import {
  BROWS,
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
 * 9, the Navigator (nine.ts), held to the series' checks (pirates.test.ts) and the catalog's own (index.test.ts,
 * render.test.ts) before she joins PIRATE_CAST, and to her brief (docs/avatars/PIRATES.md, section 2): a young
 * woman whose head is the 9's bowl and whose body is its tail in a long coat; the counter open above her face;
 * the twins' bandana (worn as a headband) with tails that flutter; a braid that swings; a brass compass whose
 * needle spins; and the flip first (a 9 turned over is her twin, the 6).
 */

const LOOKS = PIRATE_LOOKS.map((l) => [l, NAVIGATOR.looks[l]] as const);
const { house, invested } = NAVIGATOR.looks;

const extentsOf = (r: NativeRect): Extents => ({ x0: r.x, y0: r.y, x1: r.x + r.width, y1: r.y + r.height });
const holds = (outer: Extents, inner: Extents) =>
  outer.x0 <= inner.x0 + 1e-6 &&
  outer.y0 <= inner.y0 + 1e-6 &&
  outer.x1 >= inner.x1 - 1e-6 &&
  outer.y1 >= inner.y1 - 1e-6;
const TILE: Extents = { x0: 0, y0: 0, x1: 100, y1: 100 };
const inCanvas = (v: number, margin = 0) => v - margin >= 0 && v + margin <= CANVAS;
const ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/** Every piece of art an avatar draws at rest: its layers and each gimmick. */
const allArt = (a: AvatarDef) => [
  a.layers.back,
  a.layers.front ?? '',
  ...(a.gimmicks ?? []).map((g) => g.markup),
];
const gimmick = (a: AvatarDef, id: string) => (a.gimmicks ?? []).find((g) => g.id === id);
const triggers = (a: AvatarDef, id: string): GimmickTrigger[] =>
  (a.gimmicks ?? []).filter((g) => g.id === id).flatMap((g) => gimmickAnims(g).flatMap((an) => an.trigger));
const twoEyes = (a: AvatarDef) => {
  const { eyes } = a.face;
  if (eyes.count === 1 || eyes.count === 3) throw new Error('two eyes');
  return eyes;
};

/** A clean SVG fragment: well-formed, no ids, no scripts, no links, no text or images. */
const expectClean = (markup: string) => {
  expect(() => checkXml(`<g>${markup}</g>`)).not.toThrow();
  expect(markup).not.toMatch(/\sid=/);
  expect(markup).not.toMatch(/<script|<style|\son[a-z]+=|href|url\(|<image|<text/i);
};

/** The shapes a layer cuts to the tile (its counter), each as its own fragment. */
const tileShapes = (a: AvatarDef): string[] =>
  [...a.layers.back.matchAll(/<(?:path|ellipse|circle)\b[^>]*\/>/g)]
    .map((m) => m[0])
    .filter((s) => s.includes(`fill="${a.tile}"`));

describe('the Navigator (9)', () => {
  it('is the one character nine.ts exports, of digit 9, and it exports no loose avatar', () => {
    const isCharacter = (v: unknown): v is PirateCharacter =>
      typeof v === 'object' && v !== null && 'digit' in v && 'looks' in v;
    expect(Object.values(nine).filter(isCharacter)).toEqual([NAVIGATOR]);
    expect(Object.keys(nine)).toEqual(['NAVIGATOR']);
    expect(NAVIGATOR.digit).toBe(9);
  });

  it('names both looks after the same role, with their ids and the 9 tile (berry)', () => {
    expect(PIRATE_TILES[9]).toBe(TILES.berry);
    const role = (a: AvatarDef, look: PirateLook) => ({
      he: a.name.he.replace(pirateName({ he: '', en: '' }, look).he, ''),
      en: a.name.en.replace(pirateName({ he: '', en: '' }, look).en, ''),
    });
    for (const [look, a] of LOOKS) {
      expect(a.id).toBe(pirateId(9, look));
      expect(a.kind).toBe('symbol');
      expect(a.tile).toBe(PIRATE_TILES[9]);
      expect(a.name).toEqual(pirateName(role(a, look), look));
    }
    expect(role(invested, 'invested')).toEqual(role(house, 'house'));
    expect(role(house, 'house')).toEqual({ he: 'הנווטת', en: 'The Navigator' });
  });

  it('draws both looks with the same face anchors and the same moving parts, so they compare 1:1', () => {
    const { iris, ...investedEyes } = invested.face.eyes;
    expect(iris).toBe(HAIR.chestnut.light); // the twins' iris (the 6 has the same)
    expect(house.face.eyes.iris).toBeUndefined();
    expect(investedEyes).toEqual(house.face.eyes);
    expect({ ...invested.face, eyes: null }).toEqual({ ...house.face, eyes: null });
    for (const k of ['pivot', 'headBox', 'squash', 'motionBias'] as const)
      expect(invested[k]).toEqual(house[k]);
    expect(invested.tile).toBe(house.tile);
    const timing = (a: AvatarDef) =>
      (a.gimmicks ?? []).map((g) => ({ id: g.id, z: g.z, rest: g.rest, anims: gimmickAnims(g) }));
    expect(timing(invested)).toEqual(timing(house));
    // the invested foot is a little lower, as on 1 and 7, both on the series' foot line
    expect(invested.base!).toBeGreaterThan(house.base!);
    for (const [, a] of LOOKS) {
      expect(a.base).toBeGreaterThanOrEqual(92);
      expect(a.base).toBeLessThanOrEqual(94.4);
    }
  });

  it('is one of the series: a wooden digit that squashes, with gimmicks; the invested one in planks', () => {
    for (const [, a] of LOOKS) {
      expect(a.layers.back).toContain(`fill="${wood.base}"`);
      expect(a.squash).toBe(true);
      expect(a.face.eyes.style).toBe('round');
      expect((a.gimmicks ?? []).length).toBeGreaterThanOrEqual(2);
      expect(a.motionBias?.length).toBeGreaterThanOrEqual(3);
      expect((a.gimmicks ?? []).some((g) => gimmickAnims(g).some((an) => triggeredBy(an, 'idle')))).toBe(
        true,
      );
    }
    expect(invested.layers.back).toContain(`fill="${woodMid}"`);
    expect(invested.layers.back).toContain(`fill="${wood.light}"`);
  });

  it('inks the invested look and leaves the house look without outlines (STYLE.md §5)', () => {
    const outline = `stroke="${FACE.ink}"`;
    expect(allArt(invested).join('')).toContain(outline);
    expect(allArt(house).join('')).not.toContain(outline);
  });

  it('keeps the 9 open: its counter shows the tile in both looks, high in the bowl, above her face', () => {
    for (const [, a] of LOOKS) {
      const shapes = tileShapes(a);
      expect(shapes.length).toBeGreaterThanOrEqual(1);
      const eyes = twoEyes(a);
      // above the raised brows, so it never sits on her face (PIRATES.md section 4)
      const brows = Math.min(eyes.left.y, eyes.right.y) - (BROWS.lift + 0.8) * eyes.r;
      for (const s of shapes) {
        const b = markupBounds(s).extents!;
        expect(b.y1).toBeLessThan(brows);
        expect((b.x0 + b.x1) / 2).toBeCloseTo((eyes.left.x + eyes.right.x) / 2, 0);
        // a counter, not a slit or a dot: it reads at 48 px
        expect(b.x1 - b.x0).toBeGreaterThanOrEqual(10);
        expect(b.y1 - b.y0).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it('wears the face in the bowl, an adult of the series, both eyes and cheeks (no patch: that is Peg)', () => {
    const eyes = twoEyes(house);
    const { mouth, cheeks, brows } = house.face;
    expect(eyes.covered).toBeUndefined();
    expect(eyes.r).toBeGreaterThanOrEqual(5.2);
    expect(eyes.r).toBeLessThanOrEqual(5.3);
    expect(eyes.left.y).toBe(eyes.right.y);
    // the counter sits above the face in the bowl, so her eyes are lower than on a flat plank (34-35)
    expect(eyes.left.y).toBeGreaterThanOrEqual(40);
    expect(eyes.left.y).toBeLessThanOrEqual(46);
    const apart = eyes.right.x - eyes.left.x;
    expect(apart).toBeGreaterThanOrEqual(16);
    expect(apart).toBeLessThanOrEqual(17);
    if (!mouth) throw new Error('a mouth');
    expect(mouth.y - eyes.left.y).toBeGreaterThanOrEqual(11);
    expect(mouth.y - eyes.left.y).toBeLessThanOrEqual(20);
    expect(mouth.w).toBeGreaterThanOrEqual(13.5);
    expect(mouth.w).toBeLessThanOrEqual(14);
    expect(cheeks).toBeDefined();
    expect(brows && brows.color).toBe(HAIR.espresso.base);
  });

  it('plays her brief: the flip first, the needle spins and keeps north, the braid swings, tails flutter', () => {
    for (const [, a] of LOOKS) {
      expect(a.motionBias).toEqual(['flip', 'tilt', 'spin', 'nod']);
      // the compass needle: whirls on surprise, spins when dizzy, hunts when confused, drifts when idle
      expect(triggers(a, 'needle')).toEqual(
        expect.arrayContaining(['surprised', 'dizzy', 'confused', 'spin', 'idle']),
      );
      const needle = gimmick(a, 'needle')!;
      const whirl = gimmickAnims(needle).find((an) => triggeredBy(an, 'surprised'))!;
      expect(whirl.loop).toBeFalsy();
      const last = whirl.keyframes[whirl.keyframes.length - 1]!.rotate ?? 0;
      expect(Math.abs(last % 360)).toBe(0); // it settles on north again
      expect(Math.abs(last)).toBeGreaterThanOrEqual(360);
      const spin = gimmickAnims(needle).find((an) => triggeredBy(an, 'spin'))!;
      expect(spin.keyframes[spin.keyframes.length - 1]!.rotate).toBe(-360); // against the body's turn
      // the glint flashes on the compass's brass, round the needle's pivot
      const g = gimmick(a, 'glint')!;
      expect(g.rest).toBe('hidden');
      expect(triggers(a, 'glint')).toEqual(expect.arrayContaining(['idle', 'smile']));
      const glintAt = gimmickAnims(g)[0]!.origin;
      const pivot = gimmickAnims(needle)[0]!.origin;
      expect(Math.hypot(glintAt.x - pivot.x, glintAt.y - pivot.y)).toBeLessThan(8);
      // the braid: swings with her, flicks up on surprise, hangs when sad or sleepy; behind her head
      expect(triggers(a, 'braid')).toEqual(
        expect.arrayContaining(['laugh', 'flip', 'wobble', 'idle', 'surprised', 'sad', 'sleepy']),
      );
      expect(gimmick(a, 'braid')?.z).toBe('behind');
      // the bandana's tails, behind the knot
      expect(triggers(a, 'tails')).toEqual(expect.arrayContaining(['laugh', 'wobble', 'flip', 'idle']));
      expect(gimmick(a, 'tails')?.z).toBe('behind');
    }
  });
});

describe.each(LOOKS)('the Navigator, %s look', (_, a) => {
  it('has a Hebrew and an English name and a palette tile', () => {
    expect(a.name.he).toMatch(/[֐-׿]/);
    expect(a.name.en.trim()).not.toBe('');
    expect(Object.values(TILES)).toContain(a.tile);
  });

  it('draws clean SVG fragments', () => {
    for (const layer of [a.layers.back, a.layers.front ?? '']) expectClean(layer);
    for (const g of a.gimmicks ?? []) {
      expectClean(g.markup);
      expect(g.markup.trim()).not.toBe('');
    }
  });

  it('draws only inside its tile, everything measurable', () => {
    for (const art of allArt(a)) {
      const b = markupBounds(art);
      expect(b.known).toBe(true);
      if (b.extents) expect(holds(TILE, b.extents)).toBe(true);
    }
  });

  it('keeps every gimmick inside the tile at every moment of every anim', () => {
    for (const g of a.gimmicks ?? [])
      for (const an of gimmickAnims(g))
        for (let i = 0; i <= 40; i++) {
          const p = sampleGimmick(an, i / 40);
          const m = poseMatrix(p, an.origin)
            .map((v) => Math.round(v * 1e4) / 1e4)
            .join(' ');
          const b = markupBounds(`<g transform="matrix(${m})">${g.markup}</g>`);
          expect(b.known).toBe(true);
          if (b.extents) expect([g.id, i, holds(TILE, b.extents)]).toEqual([g.id, i, true]);
        }
  });

  it('keeps its anchors in the canvas, the eyes apart and the mouth below them', () => {
    const slots = eyeSlots(a.face);
    for (const s of slots) {
      expect(inCanvas(s.c.x, s.r)).toBe(true);
      expect(inCanvas(s.c.y, s.r)).toBe(true);
    }
    slots.forEach((p, i) => {
      for (const q of slots.slice(i + 1))
        expect(Math.hypot(q.c.x - p.c.x, q.c.y - p.c.y)).toBeGreaterThanOrEqual(1.35 * (p.r + q.r));
    });
    const { mouth, halo } = a.face;
    if (mouth) {
      expect(inCanvas(mouth.x, mouth.w / 2)).toBe(true);
      expect(mouth.y).toBeGreaterThan(Math.max(...slots.map((s) => s.c.y)));
    }
    expect(inCanvas(a.pivot.x) && inCanvas(a.pivot.y)).toBe(true);
    expect(inCanvas(a.base!)).toBe(true);
    expect(halo && inCanvas(halo.x) && inCanvas(halo.y)).toBe(true);
    const box = a.headBox!;
    expect(
      inCanvas(box.x) && inCanvas(box.y) && inCanvas(box.x + box.size) && inCanvas(box.y + box.size),
    ).toBe(true);
  });

  it('crops to the head in a locked cell, never to the whole numeral', () => {
    const box = a.headBox!;
    expect(box.size).toBeGreaterThanOrEqual(54);
    expect(box.size).toBeLessThanOrEqual(62);
    const crop: Extents = { x0: box.x, y0: box.y, x1: box.x + box.size, y1: box.y + box.size };
    for (const s of eyeSlots(a.face))
      expect(holds(crop, { x0: s.c.x - s.r, y0: s.c.y - s.r, x1: s.c.x + s.r, y1: s.c.y + s.r })).toBe(true);
    const m = a.face.mouth;
    if (m)
      expect(holds(crop, { x0: m.x - m.w / 2, y0: m.y, x1: m.x + m.w / 2, y1: m.y + 0.45 * m.w })).toBe(true);
    expect(crop.y1).toBeLessThanOrEqual((a.base ?? 100) - 25);
    expect(renderAvatar(a, { size: 22, crop: 'head' })).toContain(
      `viewBox="${box.x} ${box.y} ${box.size} ${box.size}"`,
    );
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
      expect(GIMMICK_DEPTHS).toContain(g.z ?? 'front');
      const anims = gimmickAnims(g);
      expect(anims.length).toBeGreaterThan(0);
      for (const an of anims) {
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
        // a loop must not jump at its seam: it ends where it starts (a whole turn counts), or is invisible at
        // both ends (STYLE.md §14)
        if (an.loop) {
          const first = sampleGimmick(an, 0);
          const last = sampleGimmick(an, 1);
          if (first.opacity > 0 || last.opacity > 0)
            for (const k of ['x', 'y', 'sx', 'sy', 'opacity'] as const)
              expect(last[k]).toBeCloseTo(first[k], 6);
          expect(Math.abs((last.rotate - first.rotate) % 360)).toBeCloseTo(0, 6);
        }
      }
    }
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

  it('renders well-formed SVG for every expression, in the tile and the head crop', () => {
    for (const expression of EXPRESSIONS)
      for (const crop of ['tile', 'head'] as const)
        expect(checkXml(renderAvatar(a, { expression, size: 96, crop, idle: true })).root).toBe('svg');
  });
});
