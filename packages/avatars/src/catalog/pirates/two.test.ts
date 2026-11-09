import { type Extents, markupBounds } from '../../bounds';
import { gimmickAnims, playingGimmicks, sampleGimmick, triggeredBy } from '../../gimmick';
import { poseMatrix } from '../../motion';
import { gimmickNodeKey, gimmickPlans, motionPlan, type NativeRect, nativeLayers } from '../../native';
import { FACE, TILE as TILES } from '../../palette';
import { CANVAS, renderAvatar } from '../../render';
import { eyeSlots } from '../../rig';
import { checkXml } from '../../testing/xml';
import { type AvatarDef, EXPRESSIONS, GIMMICK_DEPTHS, type GimmickTrigger, MOTION_IDS } from '../../types';
import { PIRATE_LOOKS, type PirateCharacter } from './index';
import { PIRATE_TILES, pirateId, pirateName, wood, woodMid } from './shared';
import * as file from './two';
import { PIRATE_LADY } from './two';

/**
 * 2, the Pirate Lady (two.ts), held to the series' checks (pirates.test.ts) and the catalog's (index.test.ts)
 * before she joins PIRATE_CAST, and to her own brief: the plume that flutters, droops and springs up, the map
 * that unrolls when she laughs, the roll that wiggles and pops up in her sash, and a graceful tilt.
 */

const ROLE = { he: 'הגברת הפיראטית', en: 'The Pirate Lady' };
const { house, invested } = PIRATE_LADY.looks;
const EACH = PIRATE_LOOKS.map((l) => [PIRATE_LADY.looks[l].id, PIRATE_LADY.looks[l]] as const);

const TILE: Extents = { x0: 0, y0: 0, x1: CANVAS, y1: CANVAS };
const ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const inCanvas = (v: number, margin = 0) => v - margin >= 0 && v + margin <= CANVAS;
const extentsOf = (r: NativeRect): Extents => ({ x0: r.x, y0: r.y, x1: r.x + r.width, y1: r.y + r.height });
const holds = (outer: Extents, inner: Extents, slack = 1e-6) =>
  outer.x0 <= inner.x0 + slack &&
  outer.y0 <= inner.y0 + slack &&
  outer.x1 >= inner.x1 - slack &&
  outer.y1 >= inner.y1 - slack;
const allArt = (a: AvatarDef) => [
  a.layers.back,
  a.layers.front ?? '',
  ...(a.gimmicks ?? []).map((g) => g.markup),
];
const gimmick = (a: AvatarDef, id: string) => (a.gimmicks ?? []).find((g) => g.id === id)!;
const triggers = (a: AvatarDef, id: string): GimmickTrigger[] =>
  gimmickAnims(gimmick(a, id)).flatMap((an) => an.trigger);
const expectClean = (markup: string) => {
  expect(() => checkXml(`<g>${markup}</g>`)).not.toThrow();
  expect(markup).not.toMatch(/\sid=/);
  expect(markup).not.toMatch(/<script|<style|\son[a-z]+=|href|url\(|<image|<text/i);
};
const isCharacter = (v: unknown): v is PirateCharacter => {
  const c = v as Partial<PirateCharacter> | null;
  return typeof c === 'object' && c !== null && typeof c.digit === 'number' && typeof c.looks === 'object';
};

describe('the Pirate Lady (2)', () => {
  it('is the one character two.ts exports, of the digit 2, and it exports no loose avatar', () => {
    const exported = Object.values(file);
    expect(exported.filter(isCharacter)).toEqual([PIRATE_LADY]);
    expect(exported.filter((v) => typeof v === 'object' && v !== null && 'layers' in v)).toEqual([]);
    expect(PIRATE_LADY.digit).toBe(2);
    expect(Object.keys(PIRATE_LADY.looks)).toEqual([...PIRATE_LOOKS]);
  });

  it('is named, with her id and the cobalt tile of the 2, the same in both looks', () => {
    for (const look of PIRATE_LOOKS) {
      const a = PIRATE_LADY.looks[look];
      expect(a.id).toBe(pirateId(2, look));
      expect(a.id).toMatch(ID);
      expect(a.kind).toBe('symbol');
      expect(a.name).toEqual(pirateName(ROLE, look));
      expect(a.name.he).toMatch(/[֐-׿]/);
      expect(a.tile).toBe(PIRATE_TILES[2]);
      expect(a.tile).toBe(TILES.cobalt);
    }
  });

  it('draws both looks with the same face anchors and moving parts, so they compare 1:1', () => {
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
    // the anims are declared once and shared
    for (const g of house.gimmicks ?? []) expect(gimmick(invested, g.id).anim).toBe(g.anim);
    // the invested foot is a little lower
    expect(invested.base).toBeGreaterThanOrEqual(house.base!);
  });

  it('is one of the series: a wooden digit that squashes, round eyes, gimmicks and motions', () => {
    for (const look of PIRATE_LOOKS) {
      const a = PIRATE_LADY.looks[look];
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

  it('draws the invested look with an ink outline, and the house look without one', () => {
    const outline = `stroke="${FACE.ink}"`;
    expect(allArt(invested).join('')).toContain(outline);
    expect(allArt(house).join('')).not.toContain(outline);
  });

  it('keeps both eyes (no patch: that is Peg) and cheeks, on the series face', () => {
    for (const look of PIRATE_LOOKS) {
      const { eyes, cheeks, mouth } = PIRATE_LADY.looks[look].face;
      expect(eyes.count === undefined || eyes.count === 2 ? eyes.covered : 'one eye').toBeUndefined();
      expect(eyes.r).toBeGreaterThanOrEqual(5.2);
      expect(eyes.r).toBeLessThanOrEqual(5.3);
      expect(cheeks).toBeDefined();
      expect(mouth && mouth.y - eyeSlots(PIRATE_LADY.looks[look].face)[0]!.c.y).toBeGreaterThanOrEqual(11);
    }
  });

  it("plays her brief's moves: the map unrolls on laugh, the plume flutters, the roll pops up", () => {
    for (const look of PIRATE_LOOKS) {
      const a = PIRATE_LADY.looks[look];
      expect(a.motionBias).toEqual(['tilt', 'spin', 'nod', 'bounce']);
      // the plume: flutters with her motions and laugh, idles, springs up on surprise, droops when sad, and
      // reacts when she is cross, puzzled or dizzy too ("very invested": every mood moves something)
      expect(triggers(a, 'plume')).toEqual(
        expect.arrayContaining([
          'laugh',
          'wobble',
          'spin',
          'flip',
          'idle',
          'surprised',
          'sad',
          'sleepy',
          'angry',
          'confused',
          'dizzy',
        ]),
      );
      // cross, it stands up (clockwise: the plume points left), the way the surprise springs it up
      const plumeAnims = gimmickAnims(gimmick(a, 'plume'));
      const cross = plumeAnims.find((an) => an.trigger.includes('angry'))!;
      const up = plumeAnims.find((an) => an.trigger.includes('surprised'))!;
      expect(Math.sign(sampleGimmick(cross, 1).rotate)).toBe(Math.sign(sampleGimmick(up, 1).rotate));
      expect(cross.loop).toBeFalsy();
      // the laugh flutter is as big as Peg's tails
      const laugh = plumeAnims.find((an) => an.trigger.includes('laugh'))!;
      expect(Math.max(...laugh.keyframes.map((k) => Math.abs(k.rotate ?? 0)))).toBeGreaterThanOrEqual(12);
      // the map: hidden until she laughs, then it opens from the roll at the roll's angle
      const map = gimmick(a, 'map');
      expect(map.rest).toBe('hidden');
      const [unroll] = gimmickAnims(map);
      expect(unroll!.trigger).toEqual(['laugh']);
      const open = sampleGimmick(unroll!, 0.5);
      expect(open.opacity).toBe(1);
      expect(open.sy).toBeCloseTo(1, 6);
      expect(sampleGimmick(unroll!, 0).sy).toBeLessThan(0.15);
      for (const k of unroll!.keyframes) expect(k.rotate).toBe(-60);
      // the roll: wiggles when she smiles, idles, pops up out of the sash when surprised
      expect(triggers(a, 'scroll')).toEqual(expect.arrayContaining(['smile', 'wink', 'idle', 'surprised']));
      expect(triggers(a, 'scroll')).not.toContain('laugh');
      expect(gimmickAnims(gimmick(a, 'scroll'))[0]!.origin).toEqual(unroll!.origin);
      // the sheet unrolls under the roll: it comes first at the same depth
      const ids = (a.gimmicks ?? []).map((g) => g.id);
      expect(ids.indexOf('map')).toBeLessThan(ids.indexOf('scroll'));
      expect(map.z).toBe(gimmick(a, 'scroll').z);
    }
  });

  it('lets one anim per gimmick play on her laugh: the map opens while the roll holds still', () => {
    const playing = playingGimmicks(house, { expression: 'laugh', size: 96 }).map((p) => p.gimmick.id);
    expect(playing).toEqual(['plume', 'map']);
    const surprised = playingGimmicks(house, { expression: 'surprised', size: 96 }).map((p) => p.gimmick.id);
    expect(surprised).toEqual(['plume', 'scroll']);
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

  it('keeps the map and the roll inside the tile in every frame of their anims', () => {
    for (const id of ['map', 'scroll']) {
      const g = gimmick(a, id);
      const box = markupBounds(g.markup).extents!;
      const corners = [
        [box.x0, box.y0],
        [box.x1, box.y0],
        [box.x1, box.y1],
        [box.x0, box.y1],
      ] as const;
      for (const an of gimmickAnims(g))
        for (let t = 0; t <= 1.0001; t += 0.05) {
          const [m0, m1, m2, m3, m4, m5] = poseMatrix(sampleGimmick(an, t), an.origin);
          for (const [x, y] of corners) {
            const px = m0 * x + m2 * y + m4;
            const py = m1 * x + m3 * y + m5;
            expect(inCanvas(px) && inCanvas(py)).toBe(true);
          }
        }
    }
  });

  it('crops to the face and the hat in a locked cell, never to the whole numeral', () => {
    const box = a.headBox!;
    expect(box).toBeDefined();
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

  it('meets the catalog: clean SVG, anchors in the canvas, eyes apart, real motions', () => {
    for (const layer of [a.layers.back, a.layers.front ?? '']) expectClean(layer);
    const { eyes, mouth } = a.face;
    const slots = eyeSlots(a.face);
    expect(eyes.r).toBeGreaterThan(0);
    for (const s of slots) expect(inCanvas(s.c.x, s.r) && inCanvas(s.c.y, s.r)).toBe(true);
    slots.forEach((p, i) => {
      for (const q of slots.slice(i + 1))
        expect(Math.hypot(q.c.x - p.c.x, q.c.y - p.c.y)).toBeGreaterThanOrEqual(1.35 * (p.r + q.r));
    });
    expect(mouth && inCanvas(mouth.x, mouth.w / 2) && inCanvas(mouth.y)).toBe(true);
    if (mouth) expect(mouth.y).toBeGreaterThan(Math.max(...slots.map((s) => s.c.y)));
    expect(inCanvas(a.pivot.x) && inCanvas(a.pivot.y)).toBe(true);
    expect(a.base !== undefined && inCanvas(a.base)).toBe(true);
    expect(a.face.halo && inCanvas(a.face.halo.x) && inCanvas(a.face.halo.y)).toBe(true);
    const bias = a.motionBias ?? [];
    expect(new Set(bias).size).toBe(bias.length);
    for (const m of bias) expect(MOTION_IDS).toContain(m);
    // she stands on the base bar, at the series' foot line
    expect(a.base).toBeGreaterThanOrEqual(92);
    expect(a.base).toBeLessThanOrEqual(94);
  });

  it('declares well-formed gimmicks (the catalog test)', () => {
    const gimmicks = a.gimmicks ?? [];
    const ids = gimmicks.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(gimmicks.filter((g) => g.z === 'face').length).toBeLessThanOrEqual(1);
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
        if (g.rest === 'hidden') expect(an.keyframes.some((k) => (k.opacity ?? 1) > 0)).toBe(true);
      }
    }
  });

  it('renders well-formed SVG for every expression, in the tile and the head crop', () => {
    for (const expression of EXPRESSIONS)
      for (const crop of ['tile', 'head'] as const)
        expect(checkXml(renderAvatar(a, { expression, size: 96, crop, idle: true })).root).toBe('svg');
  });
});
