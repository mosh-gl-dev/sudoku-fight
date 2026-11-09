/**
 * 3, the Cabin Girl: the youngest hand on deck (a kid). Read docs/avatars/PIRATES.md first; the series' toolbox
 * is shared.ts, and the two references are one.ts (the Captain) and seven.ts (Peg-leg Peg).
 *
 * The 3's top bowl is her head, the face on its right part, under a folded paper hat (a kid playing captain)
 * with a blue crayon fish on it, a red ponytail in a blue ribbon hanging down along the head's right curve. The
 * top bowl is narrower than the bottom one, as in a 3. The middle point is her arm, a long cusp: its tip holds
 * up a bubble wand (a brass ring on a stick), out in the 3's open left side. The bottom bowl is her body in a
 * mustard pinafore with a cream collar; the wood of the bowl's curve shows around its right side and under its
 * hem, so the bowl reads as the 3's. Soap bubbles drift up
 * from the ring (idle, smile, laugh), a big one balloons out of it and pops when she is surprised; the wand
 * waves when she is happy and droops when she is sad; the ponytail bounces with her and springs up on surprise.
 * Kids bounce and squash (her favourite motion: bounce). No guns, no blades.
 *
 * In a locked board cell (22 px) the app crops to `headBox`: the head, the hat and the ponytail, never the
 * bottom bowl, so she never reads as a placed 3.
 */

import { GIMMICK_RECIPES as R } from '../../gimmick';
import { CLOTH, FACE, HAIR, OBJECT, type Ramp } from '../../palette';
import { f } from '../../svg';
import type { AvatarDef, GimmickAnim, GimmickDef, Point } from '../../types';
import { circle, ellipse, line, path, type Pt, shaded } from '../draw';
import {
  brass,
  BROWS,
  chamfer,
  cream,
  flutter,
  grain,
  INK,
  inked,
  inkedLine,
  inkedRing,
  leather,
  nail,
  PIRATE_TILES,
  type PirateCharacter,
  pirateId,
  pirateName,
  poly,
  type Pts,
  ring,
  wave,
  withIris,
  wood,
  woodDeep,
  woodMid,
  woodSlab,
} from './shared';

const ROLE = { he: 'נערת הסיפון', en: 'The Cabin Girl' } as const;
const tile = PIRATE_TILES[3];
/** Red hair: auburn, lit in ginger (ginger alone sits too close to the rose tile and the wood). */
const hair: Ramp = { base: HAIR.auburn.base, shade: HAIR.auburn.shade, light: HAIR.ginger.base };
const dress = CLOTH.mustard;
const ribbon = OBJECT.blue;
const soap = OBJECT.white;

const GIRL_FACE: AvatarDef['face'] = {
  ink: FACE.ink,
  eyes: { left: { x: 52.5, y: 44 }, right: { x: 69, y: 44 }, r: 5.7, style: 'round' },
  brows: { ...BROWS, color: hair.shade },
  mouth: { x: 60.75, y: 55.5, w: 12.5 },
  cheeks: { color: FACE.blush, dx: 0.55, dy: 1.45, size: 0.72 },
  halo: { x: 61.5, y: 6.5 },
};

const PIVOT = { x: 60, y: 50 } as const;
const HEAD_BOX = { x: 32, y: 6, size: 62 } as const;
const MOTIONS = ['bounce', 'squash', 'tilt', 'nod'] as const;

// The moving parts, the same in both looks -----------------------------------------------------------------

/** Where the ponytail is tied: it bounces with her (follow-through), sways when idle, springs up on surprise. */
const TIE: Point = { x: 78.6, y: 27.4 };
const ponytailAnims: readonly GimmickAnim[] = [
  ...flutter(TIE, {
    angle: -14,
    idleAngle: -5,
    trigger: ['laugh', 'bounce', 'squash', 'wobble', 'spin', 'flip'],
  }),
  {
    trigger: ['surprised'],
    durationMs: 800,
    keyframes: [
      { t: 0, ease: 'emphasized' },
      { t: 0.3, rotate: -26 },
      { t: 0.6, rotate: -15 },
      { t: 1, rotate: -18 },
    ],
    origin: TIE,
  },
];

/** The wrist (the tip of the 3's middle point) the wand turns around. */
const WRIST: Point = { x: 25.5, y: 53 };
const wandAnims: readonly GimmickAnim[] = [
  // happy: she waves it (bubbles stream out); idle: a quiet sway
  ...wave(WRIST, { angle: 13, idleAngle: 5 }).filter((a) => !a.trigger.includes('surprised')),
  // sad or sleepy: it droops, and stays down
  {
    trigger: ['sad', 'sleepy'],
    durationMs: 900,
    keyframes: [
      { t: 0, ease: 'standard' },
      { t: 0.6, rotate: -26, y: 1 },
      { t: 1, rotate: -24, y: 1 },
    ],
    origin: WRIST,
  },
];

/** The ring the bubbles come out of. */
const RING: Point = { x: 13, y: 36 };
/** Two bubbles a beat apart: slow and quiet when idle, quicker when she smiles or laughs. */
const bubbleAnims = (at: Point, delayMs: number): readonly GimmickAnim[] => [
  { ...R.bubble({ rise: 20, ms: 1800 }), trigger: ['laugh', 'smile'], origin: at, delayMs: delayMs / 2 },
  { ...R.bubble({ rise: 22, ms: 3200 }), trigger: ['idle'], origin: at, delayMs },
];
const BUBBLE_1: Point = { x: 11, y: 28.2 };
const BUBBLE_2: Point = { x: 17.2, y: 29.2 };
const bubble1Anims = bubbleAnims(BUBBLE_1, 0);
const bubble2Anims = bubbleAnims(BUBBLE_2, 1600);

/** Surprised: a big bubble balloons out of the ring, wobbles, and pops. */
const BIG_BUBBLE: Point = { x: 17.2, y: 22.4 };
const bigBubbleAnim: GimmickAnim = {
  trigger: ['surprised'],
  durationMs: 1100,
  keyframes: [
    { t: 0, sx: 0.2, sy: 0.2, opacity: 0, ease: 'standard' },
    { t: 0.08, sx: 0.35, sy: 0.35, opacity: 1, ease: 'emphasized' },
    { t: 0.4, sx: 1, sy: 1 },
    { t: 0.52, sx: 1.07, sy: 0.95 },
    { t: 0.64, sx: 0.97, sy: 1.05, ease: 'exit' },
    { t: 0.74, sx: 1.08, sy: 1.08, opacity: 1 },
    { t: 0.8, sx: 1.35, sy: 1.35, opacity: 0 },
    { t: 1, sx: 1.35, sy: 1.35, opacity: 0 },
  ],
  origin: RING,
};

// Shapes shared by both looks -------------------------------------------------------------------------------

const paperHat = 'M46 20.5L61.5 6L77 20.5Z';
const hatBand = 'M43.5 18.6H79.5L78.7 25.6H44.3Z';
/** A crayon fish on the hat, wobbly on purpose (a kid drew it): its body, its tail, and an eye. */
const crayonFish = 'M55.6 14Q59.2 10.4 63.2 13.8Q59.2 17.4 55.6 14ZM62.6 13.8L66.2 11.6L65.6 16.2Z';
const fishEye: Pt = [58.2, 13.5];
/** Two curls of fringe under the hat. */
const fringe =
  'M47.6 25.4Q47.8 30 51.6 29.6Q53 28 53.6 25.6Z' + 'M75.4 25.4Q75.4 30 71.6 29.6Q70.2 28 69.6 25.6Z';

/**
 * The ponytail, hanging down from the ribbon along the head's right curve (its root and inner edge hidden
 * behind the head): at most 7 wide, it rounds the top bowl out instead of widening it.
 */
const ponytail =
  'M76 22.5C81.5 23.5 85.6 28.6 86.2 35.4C86.8 41 86.6 45.4 87 48C84 46.6 81.6 43.6 80 40L76 30Z';
const ponytailShade = 'M86.2 35.4C86.8 41 86.6 45.4 87 48C85.6 47.3 84.6 46.2 83.8 44.6Q85 40 84.6 35Z';
const ponytailStrands = 'M80.6 27.2Q84 30.6 84.2 38.4';
/** The ribbon round the ponytail's root: two loops and a knot. */
const bowLoops = 'M78.6 27.4L74.8 23.4L74.2 29.8ZM78.6 27.4L82.8 24.2L82.6 30.6Z';

const freckles = (color: string, r: number): string =>
  (
    [
      [45.4, 50],
      [47.4, 52.4],
      [44.6, 53.4],
      [76.1, 50],
      [74.1, 52.4],
      [76.9, 53.4],
    ] as const
  )
    .map(([x, y]) => circle(x, y, r, color))
    .join('');

/** The wand: a stick from her hand (the middle point's tip) up to a brass ring, out in the 3's open left side. */
const wandStick = 'M25.5 53L15.6 39.4';
const ringShine = 'M10.2 33.6Q11.2 32.2 13 32';

const collar =
  'M60.75 62.4Q54.2 61.6 49 63.6Q49.6 69.2 55.2 69Q59.4 68.4 60.75 62.4Z' +
  'M60.75 62.4Q67.3 61.6 72.5 63.6Q71.9 69.2 66.3 69Q62.1 68.4 60.75 62.4Z';

/** A soap bubble's art: a thin ring with a shine and a tint of colour, the tile showing through (flat colours). */
function bubbleArt(x: number, y: number, r: number, inkIt: boolean): string {
  const arc = (a0: number, a1: number) => {
    const p = (a: number) =>
      `${f(x + r * Math.cos((a * Math.PI) / 180))} ${f(y + r * Math.sin((a * Math.PI) / 180))}`;
    return `M${p(a0)}A${f(r)} ${f(r)} 0 0 1 ${p(a1)}`;
  };
  const w = Math.max(1.1, r * 0.22);
  return (
    (inkIt ? ring(x, y, r, INK, w + 1.2) : '') +
    ring(x, y, r, soap.base, w) +
    line(arc(15, 75), OBJECT.blue.light, w) +
    line(arc(100, 150), OBJECT.pink.light, w) +
    line(arc(200, 240), soap.base, w * 1.5)
  );
}

/** A hidden soap bubble that drifts up out of the ring. */
const bubble = (
  id: string,
  at: Point,
  r: number,
  anim: GimmickAnim | readonly GimmickAnim[],
  inkIt: boolean,
): GimmickDef => ({ id, rest: 'hidden', markup: bubbleArt(at.x, at.y, r, inkIt), anim });

/** The soap film shining in the ring (it moves with the wand), and one bubble already afloat: the wand reads at rest. */
const film =
  line('M10.74 35.18A2.4 2.4 0 0 1 12.58 33.64', soap.base, 0.8) +
  line('M15.26 36.82A2.4 2.4 0 0 1 13.42 38.36', OBJECT.pink.light, 0.7);
const afloat = (inkIt: boolean) => bubbleArt(19.4, 18.2, 2.1, inkIt);

// House look --------------------------------------------------------------------------------------------

/**
 * The digit as one union (nonzero fill): the top stroke, the middle point (a long cusp, its base hidden in the
 * bowls) and the bottom stroke, each round at the left; the head (the top bowl, x 43–80) and the body (the
 * bottom bowl, x 41–86, wider, as a 3's is), round. The tile between the strokes is the 3's open left side: two
 * counters that widen to the left; on the right, the waist notch between the bowls is 12 deep.
 */
const houseDigit =
  'M27.75 23H60V34.5H27.75A5.75 5.75 0 0 1 27.75 23Z' +
  'M50 42.5V63.5L26 54.5A2.5 2.5 0 0 1 26 51.5Z' +
  'M31.25 74.5H62V93H31.25A9.25 9.25 0 0 1 31.25 74.5Z' +
  'M58 23H65A15 15 0 0 1 80 38V48.5A15 15 0 0 1 65 63.5H58A15 15 0 0 1 43 48.5V38A15 15 0 0 1 58 23Z' +
  'M57.5 60H69.5A16.5 16.5 0 0 1 86 76.5A16.5 16.5 0 0 1 69.5 93H57.5A16.5 16.5 0 0 1 41 76.5A16.5 16.5 0 0 1 57.5 60Z';

/**
 * The pinafore dress: from the neck to the hem (y 84), its right edge at x 76, so the bowl's wood shows around
 * its right side (10) and under it (9); its left edge follows the body's curve, the skirt over the bottom stroke.
 */
const houseDress =
  'M53 62.5H73A3 3 0 0 1 76 65.5V80A4 4 0 0 1 72 84H45.6A2.6 2.6 0 0 1 43 81.4L43.2 77A15.4 15.4 0 0 1 53 62.5Z';

const girlHouse: AvatarDef = {
  id: pirateId(3, 'house'),
  kind: 'symbol',
  name: pirateName(ROLE, 'house'),
  tile,
  layers: {
    back:
      shaded(houseDigit, wood.base, wood.shade) +
      ellipse(30.4, 27.4, 4, 1.5, wood.light) +
      ellipse(45, 37.6, 1.4, 3.4, wood.light, 25) +
      ellipse(29.6, 78.4, 3.4, 1.4, wood.light) +
      ellipse(82.6, 70.4, 1.2, 3.2, wood.light, -20) +
      freckles(wood.shade, 0.75) +
      // the dress, the blouse's collar and puff sleeve
      path(houseDress, dress.shade) +
      path(houseDress, dress.base, ' transform="translate(-0.6 -0.8)"') +
      path(collar, cream.base) +
      circle(60.75, 72, 1.2, dress.shade) +
      circle(60.75, 77.2, 1.2, dress.shade),
    front:
      // a bubble afloat, her fringe, the ribbon on the ponytail, the paper hat
      afloat(false) +
      path(fringe, hair.base) +
      path(bowLoops, ribbon.base) +
      circle(TIE.x, TIE.y, 1.5, ribbon.shade) +
      path(paperHat, cream.shade) +
      path(paperHat, cream.base, ' transform="translate(-0.6 -0.6)"') +
      path(hatBand, cream.shade) +
      path(hatBand, cream.light, ' transform="translate(-0.4 -0.6)"') +
      path(crayonFish, ribbon.base) +
      circle(fishEye[0], fishEye[1], 0.55, cream.light),
  },
  face: GIRL_FACE,
  pivot: PIVOT,
  headBox: HEAD_BOX,
  base: 93,
  squash: true,
  motionBias: MOTIONS,
  gimmicks: [
    {
      id: 'ponytail',
      z: 'behind',
      markup:
        path(ponytail, hair.base) + path(ponytailShade, hair.shade) + line(ponytailStrands, hair.light, 1),
      anim: ponytailAnims,
    },
    {
      id: 'wand',
      z: 'behind',
      markup:
        line(wandStick, leather.base, 1.6) +
        ring(RING.x, RING.y, 4.2, brass.base, 1.7) +
        line(ringShine, brass.light, 0.8) +
        film,
      anim: wandAnims,
    },
    bubble('bubble', BUBBLE_1, 4.2, bubble1Anims, false),
    bubble('bubble-2', BUBBLE_2, 3.2, bubble2Anims, false),
    bubble('big-bubble', BIG_BUBBLE, 10, bigBubbleAnim, false),
  ],
};

// Invested look -----------------------------------------------------------------------------------------

/**
 * A bowl's plank: a convex slab whose corners are cut in two facets each (a ring of short planks), so the 3's
 * bowls read round. Corner sizes clockwise from the top left.
 */
function bowlPlank(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  [tl, tr, br, bl]: readonly [number, number, number, number],
): Pt[] {
  const corner = (cx: number, cy: number, r: number, from: number): Pt[] =>
    [0, 45, 90].map((d) => {
      const a = ((from + d) * Math.PI) / 180;
      return [Math.round((cx + r * Math.cos(a)) * 100) / 100, Math.round((cy + r * Math.sin(a)) * 100) / 100];
    });
  return [
    ...corner(x0 + tl, y0 + tl, tl, 180),
    ...corner(x1 - tr, y0 + tr, tr, 270),
    ...corner(x1 - br, y1 - br, br, 0),
    ...corner(x0 + bl, y1 - bl, bl, 90),
  ];
}

/**
 * The part of a convex polygon on one side of a line x = v (axis 0) or y = v (axis 1), `above` keeping the
 * greater side. It stays convex: the dress on the body's plank, its shade and light strips.
 */
function clip(pts: Pts, axis: 0 | 1, v: number, above: boolean): Pt[] {
  const inside = (p: Pt) => (above ? p[axis] >= v : p[axis] <= v);
  const round = (n: number) => Math.round(n * 100) / 100;
  return pts.flatMap((p, i) => {
    const q = pts[(i + 1) % pts.length] ?? p;
    const out: Pt[] = inside(p) ? [p] : [];
    if (inside(p) !== inside(q)) {
      const t = (v - p[axis]) / (q[axis] - p[axis]);
      const o = axis === 0 ? 1 : 0;
      const cross = round(p[o] + (q[o] - p[o]) * t);
      out.push(axis === 0 ? [v, cross] : [cross, v]);
    }
    return out;
  });
}
const between = (pts: Pts, top: number, bottom: number): Pt[] =>
  clip(clip(pts, 1, top, true), 1, bottom, false);

/** The head (the top bowl, narrower than the bottom one): one calm slab for the face, over the strokes' roots. */
const head = bowlPlank(43, 23, 80, 63.5, [7, 15, 15, 9]);
/** The body (the bottom bowl), under the head, over the bottom stroke. */
const body = bowlPlank(41, 60, 86, 93.8, [12, 16.5, 16.5, 12]);
const topArm = chamfer(22, 23, 60, 34.5, 3);
/** The middle point (her arm): a long cusp, tapering to its tip (its base hidden under the head). */
const prong: Pts = [
  [48, 43.25],
  [48, 62.75],
  [26.4, 54.65],
  [24, 53.5],
  [24, 52.5],
  [26.4, 51.35],
];
const foot = chamfer(22, 74.5, 62, 94, 3);

/** The pinafore's right edge: the bowl's wood shows past it, and under its hem. */
const DRESS_RIGHT = 76;
/** The part of the body's plank a pinafore covers between two heights, its lower right corner cut. */
function pinafore(top: number, bottom: number): Pt[] {
  return clip(between(body, top, bottom), 0, DRESS_RIGHT, false).flatMap((p): Pt[] =>
    p[0] === DRESS_RIGHT && p[1] === bottom
      ? [
          [DRESS_RIGHT, bottom - 2.4],
          [DRESS_RIGHT - 2.4, bottom],
        ]
      : [p],
  );
}

/** The pinafore dress: the body's plank from the neck to the hem, a cream trim along the hem. */
const dressShape = pinafore(62.5, 84);
const investedDress = poly(dressShape);
const hemTrim = poly(clip(dressShape, 1, 82.2, true));

const girlInvested: AvatarDef = {
  id: pirateId(3, 'invested'),
  kind: 'symbol',
  name: pirateName(ROLE, 'invested'),
  tile,
  layers: {
    back:
      // the bottom stroke, the body bowl over it (nailed), and the dress
      woodSlab(foot) +
      grain([
        [26, 84.4],
        [32, 83.4],
        [38, 84.6],
      ]) +
      woodSlab(body) +
      inked(investedDress, dress.base) +
      path(poly(clip(dressShape, 0, 72.6, true)), dress.shade) +
      path(poly(clip(between(body, 62.5, 82.2), 0, 44.6, false)), dress.light) +
      inked(hemTrim, cream.base) +
      grain([
        [52, 89.6],
        [60, 88.8],
        [68, 89.8],
      ]) +
      grain([
        [80.8, 69],
        [81.8, 75],
        [80.8, 81],
      ]) +
      nail(52.4, 90) +
      nail(59.4, 90.6) +
      ellipse(70, 89.4, 2, 0.8, woodDeep) +
      // the middle point (her arm) and the top stroke, under the head
      woodSlab(prong, 2.2) +
      woodSlab(topArm, 2.2) +
      grain([
        [26.6, 27.4],
        [32, 26.6],
        [38, 27.8],
      ]) +
      nail(38.5, 49.8, 0.9) +
      nail(38.5, 56.2, 0.9) +
      nail(37.6, 28.8, 0.9) +
      woodSlab(head) +
      freckles(woodDeep, 0.7) +
      // the hat's shadow on her brow
      path('M45.6 25.6H74.3L78.6 27.4Q62 30.6 45.6 27.6Z', woodMid) +
      // the collar
      inked(collar, cream.base) +
      path(
        'M60.75 62.4Q62.1 68.4 66.3 69Q71.9 69.2 72.5 63.6Q69.4 66.6 66.3 66.6Q62.8 66.4 60.75 62.4Z',
        cream.shade,
      ) +
      circle(60.75, 72.2, 1.25, brass.base) +
      circle(60.75, 77.4, 1.25, brass.base) +
      circle(60.35, 71.8, 0.45, brass.light) +
      circle(60.35, 77, 0.45, brass.light),
    front:
      afloat(true) +
      inked(fringe, hair.base) +
      line('M49.6 26.6Q50 28.4 51.6 28.4M74.6 26.6Q74.4 28.4 72.8 28.4', hair.light, 0.6) +
      inked(bowLoops, ribbon.base) +
      path('M78.6 27.4L82.8 24.2L82.6 30.6Z', ribbon.shade) +
      circle(TIE.x, TIE.y, 1.5, ribbon.light) +
      inked(paperHat, cream.base) +
      path('M61.5 6L77 20.5H68Z', cream.shade) +
      line('M50.4 16.8L56.4 11.4M53.2 17.8L59 12.6', cream.shade, 0.6) +
      inked(hatBand, cream.light) +
      path('M44.1 23.4H78.9L78.7 25.6H44.3Z', cream.shade) +
      path(crayonFish, ribbon.base) +
      circle(fishEye[0], fishEye[1], 0.55, cream.light),
  },
  face: withIris(GIRL_FACE, HAIR.honey.base),
  pivot: PIVOT,
  headBox: HEAD_BOX,
  base: 94,
  squash: true,
  motionBias: MOTIONS,
  gimmicks: [
    {
      id: 'ponytail',
      z: 'behind',
      markup:
        inked(ponytail, hair.base) + path(ponytailShade, hair.shade) + line(ponytailStrands, hair.light, 1),
      anim: ponytailAnims,
    },
    {
      id: 'wand',
      z: 'behind',
      markup:
        inkedLine(wandStick, leather.base, 1.5, 3.6) +
        inkedRing(RING.x, RING.y, 4.2, brass.base, 1.6, 3.4) +
        line(ringShine, brass.light, 0.7) +
        film,
      anim: wandAnims,
    },
    bubble('bubble', BUBBLE_1, 4.2, bubble1Anims, true),
    bubble('bubble-2', BUBBLE_2, 3.2, bubble2Anims, true),
    bubble('big-bubble', BIG_BUBBLE, 10, bigBubbleAnim, true),
  ],
};

/** The Cabin Girl, both looks. */
export const CABIN_GIRL: PirateCharacter = {
  digit: 3,
  looks: { house: girlHouse, invested: girlInvested },
};
