/**
 * 4, the Rigger Boy: the ship's boy who climbs the rigging and sets the sails, one of the series' three kids
 * (Moshe: "3, 4 and 5 are kids"). Read docs/avatars/PIRATES.md first; the series' toolbox is shared.ts.
 *
 * The digit is his little ship. The upright stem is the boy: his face at its top under a mop of dark hair with
 * a cowlick, a forest vest over a cream shirt and a rope belt below. The diagonal is the yard and the crossbar
 * the boom; a small cream sail is laced to the yard, its sheet tied down to the boom, with tile all round its
 * free edges, so the 4's counter stays open. A red pennant flies from a pole at the apex, and a coil of rope
 * hangs on his right shoulder (rope is his trade: the lashings, the sheet, the belt, the coil).
 *
 * The sail billows when he laughs, fills with a gust when he is surprised, breathes when idle and goes slack
 * when he is sad or sleepy; the pennant flutters with every move and droops with the sail; the coil swings
 * when he bounces and jumps when he is surprised. A kid: big eyes, freckles, a cowlick, and he bounces and
 * squashes (his favourite motions). No guns, no blades.
 *
 * In a locked board cell (22 px) the app crops to `headBox`: his face, hair and the pennant's pole, never the
 * crossbar or the foot, so he never reads as a placed 4.
 */

import { GIMMICK_RECIPES as R } from '../../gimmick';
import { CLOTH, FACE, HAIR, mix, OBJECT, type Ramp } from '../../palette';
import { f } from '../../svg';
import type { AvatarDef, GimmickAnim, GimmickTrigger } from '../../types';
import { circle, ellipse, line, path, type Pt } from '../draw';
import {
  BROWS,
  bandanaRed,
  brass,
  chamfer,
  cream,
  flutter,
  grain,
  INK,
  inked,
  inkedLine,
  nail,
  OUTLINE,
  PIRATE_TILES,
  type PirateCharacter,
  pirateId,
  pirateName,
  type Pts,
  withIris,
  wood,
  woodDeep,
  woodMid,
  woodSlab,
} from './shared';

const ROLE = { he: 'נער החבלים', en: 'The Rigger Boy' } as const;
const tile = PIRATE_TILES[4];
const hair = HAIR.espresso;
const vest = CLOTH.forest;
/** Manila rope: the lashings, the sheet, his belt and the coil on his shoulder. */
const hemp: Ramp = {
  base: mix(cream.shade, wood.light, 0.35),
  shade: mix(cream.shade, wood.shade, 0.55),
  light: cream.light,
};
/** The back of the coil's loops, in their own shadow. */
const hempDeep = mix(hemp.shade, woodDeep, 0.4);

const BOY_FACE: AvatarDef['face'] = {
  ink: FACE.ink,
  eyes: { left: { x: 64.5, y: 45 }, right: { x: 80.5, y: 45 }, r: 5.7, style: 'round' },
  brows: { ...BROWS, color: hair.base },
  mouth: { x: 72.5, y: 57, w: 12.5 },
  cheeks: { color: FACE.blush, dx: 0.55, dy: 1.45, size: 0.72 },
  halo: { x: 73, y: 8 },
};

// The digit's geometry, the same in both looks -------------------------------------------------------------

/** The yard (the 4's diagonal) leans this much: x per unit of y. */
const SLOPE = 0.856;
/** x of the yard's outer (upper-left) edge at height y. */
const yardOut = (y: number) => 11 + (68.5 - y) * SLOPE;
/** The yard's width, measured across (x), and x of its inner edge: the long side of the counter. */
const YARD_W = 16;
const yardIn = (y: number) => yardOut(y) + YARD_W;
/** The stem (the boy): its left edge, and where the counter's top corner meets it. */
const STEM_X = 56;
const STEM_R = 89;
const COUNTER_TOP = 68.5 - (STEM_X - YARD_W - 11) / SLOPE;
/** The boom's top (the counter's floor) in the house look; the invested plank is 0.5 taller. */
const BOOM_TOP = 67.5;

// The moving parts, the same in both looks -----------------------------------------------------------------

/** The sail, laced to the yard from its head to its tack; its clew is tied down to the boom by the sheet. */
const SAIL_HEAD: Pt = [yardIn(41.5), 41.5];
const SAIL_TACK: Pt = [yardIn(62), 62];
const SAIL_CLEW: Pt = [45.6, 60];
const LEECH_BELLY: Pt = [49.8, 51];
const FOOT_BELLY: Pt = [38.8, 62.2];

/** It billows around its tack, so its head slides along the yard and it never leaves it. */
const TACK = { x: Number(f(SAIL_TACK[0])), y: SAIL_TACK[1] } as const;
const sailAnims: readonly GimmickAnim[] = [
  // a gust fills it with a snap, and it holds full
  {
    trigger: ['surprised'],
    durationMs: 900,
    keyframes: [
      { t: 0, ease: 'emphasized' },
      { t: 0.3, sx: 1.16, sy: 1.16 },
      { t: 0.62, sx: 1.1, sy: 1.1 },
      { t: 1, sx: 1.1, sy: 1.1 },
    ],
    origin: TACK,
  },
  { ...R.inflate({ scale: 1.14, ms: 1300 }), trigger: ['laugh'], origin: TACK },
  { ...R.inflate({ scale: 1.06, ms: 1300 }), trigger: ['smile', 'wink'], origin: TACK },
  // the wind drops: it goes slack and stays so
  { ...R.deflate({ scale: 0.86, droop: 0, ms: 1400 }), trigger: ['sad', 'sleepy'], origin: TACK },
  // it breathes in the breeze
  {
    trigger: ['idle'],
    durationMs: 2800,
    loop: true,
    keyframes: [{ t: 0 }, { t: 0.5, sx: 1.04, sy: 1.04 }, { t: 1 }],
    origin: TACK,
  },
];

/** The pennant's hoist, on the pole at the apex: it flutters with every move of his. */
const POLE_X = 52.2;
const PENNANT_ROOT = { x: POLE_X, y: 13.8 } as const;
const BUSY: readonly GimmickTrigger[] = [
  'laugh',
  'surprised',
  'angry',
  'bounce',
  'squash',
  'tilt',
  'wobble',
  'spin',
  'flip',
];
const pennantAnims: readonly GimmickAnim[] = [
  ...flutter(PENNANT_ROOT, { trigger: BUSY }),
  // no wind: it droops along the pole and hangs there
  {
    trigger: ['sad', 'sleepy'],
    durationMs: 1400,
    keyframes: [
      { t: 0, ease: 'standard' },
      { t: 0.6, rotate: -40 },
      { t: 0.8, rotate: -35 },
      { t: 1, rotate: -37 },
    ],
    origin: PENNANT_ROOT,
  },
];

/** Where the coil hangs on his right shoulder: it swings when he moves and jumps when he is surprised. */
const COIL_HOOK = { x: 87, y: 63 } as const;
const coilAnims: readonly GimmickAnim[] = [
  {
    ...R.sway({ angle: 8, ms: 620 }),
    trigger: ['bounce', 'squash', 'flip', 'tilt', 'laugh'],
    origin: COIL_HOOK,
  },
  {
    trigger: ['surprised'],
    durationMs: 800,
    keyframes: [
      { t: 0, ease: 'emphasized' },
      { t: 0.3, y: -3, rotate: -7 },
      { t: 0.62, y: -0.6, rotate: 3 },
      { t: 1 },
    ],
    origin: COIL_HOOK,
  },
];

/** The sail's outline: the leech and the foot are free; the luff tucks behind the yard. */
const sailShape =
  `M${P2(SAIL_HEAD)}Q${P2(LEECH_BELLY)} ${P2(SAIL_CLEW)}Q${P2(FOOT_BELLY)} ${P2(SAIL_TACK)}` +
  `L${f(yardIn(62.6) - 5)} 62.6L${f(yardIn(40.9) - 5)} 40.9Z`;
/** The sheet: from the clew down behind the boom. */
const sheetLine = `M${P2(SAIL_CLEW)}Q47.2 63.6 47.4 69.4`;
/** A seam across the cloth at height y, from the yard to the leech. */
const sailSeam = (y: number) => `M${f(yardIn(y) - 1)} ${f(y)}L${f(leechX(y) - 0.4)} ${f(y + 0.5)}`;

/** "x y" of a point, two decimals. */
function P2(p: Pt): string {
  return `${f(p[0])} ${f(p[1])}`;
}

/** x of the leech (the quadratic head → belly → clew) at height y. */
function leechX(y: number): number {
  const [x0, y0] = SAIL_HEAD;
  const [cx, cy] = LEECH_BELLY;
  const [x1, y1] = SAIL_CLEW;
  const a = y0 - 2 * cy + y1;
  const b = 2 * (cy - y0);
  const c = y0 - y;
  const t = Math.abs(a) < 1e-9 ? -c / b : (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
  return (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
}

/** The pennant: a long red flag streaming left from the pole, a cream band at the hoist. */
const pennantShape = `M${POLE_X} 10.4C45 10.6 36 12.8 26.6 15.8C36 16.6 45 17.2 ${POLE_X} 17.6Z`;
const pennantBand = `M${POLE_X - 3} 10.6L${POLE_X} 10.4V17.6L${POLE_X - 3} 17.4Z`;
const pennantFold = 'M41.6 16.8C37 16.4 32 16.1 26.6 15.8C33 14.6 38 14.2 42.6 14.4Z';

/**
 * The rope coil, hung on his shoulder: the rope wound flat in turns round a dark middle (a spiral of rope, each
 * turn edged in shade so the turns part, twists marked along the outer turn), slung over the shoulder at the
 * top, and a short loose end hanging down from the outer turn, frayed. Never a ring with a stem: at 48 px that
 * read as a racket.
 */
const COIL_C: Pt = [88.4, 73.6];
/** The spiral's turns, its middle and outer radii, and where it ends (lower right, the loose end's start). */
const COIL = { turns: 2, r0: 1.2, r1: 7.2, end: Math.PI / 4 } as const;
const coilAt = (th: number): Pt => {
  const r = COIL.r0 + ((COIL.r1 - COIL.r0) * (th - COIL.end)) / (COIL.turns * 2 * Math.PI);
  return [COIL_C[0] + r * Math.cos(th), COIL_C[1] + r * Math.sin(th)];
};
/** The spiral from its middle out, as a polyline fine enough to look round (64 points). */
const coilSpiral = (() => {
  const n = 64;
  const span = COIL.turns * 2 * Math.PI;
  const pts = Array.from({ length: n + 1 }, (_, i) => coilAt(COIL.end + (span * i) / n));
  return `M${pts.map(P2).join('L')}`;
})();
const COIL_END = coilAt(COIL.end + COIL.turns * 2 * Math.PI);
/** The rope's twists along the outer turn: short ticks across it. */
const coilTwists = (() => {
  let d = '';
  for (let k = 0; k < 9; k++) {
    const th = COIL.end + (COIL.turns - 1) * 2 * Math.PI + (k + 0.5) * ((2 * Math.PI) / 9);
    const [x, y] = coilAt(th);
    const u: Pt = [Math.cos(th + 0.6), Math.sin(th + 0.6)];
    d += `M${f(x - 0.8 * u[0])} ${f(y - 0.8 * u[1])}L${f(x + 0.8 * u[0])} ${f(y + 0.8 * u[1])}`;
  }
  return d;
})();
const coilMiddle = circle(COIL_C[0], COIL_C[1], 1.5, hempDeep);
const coilSling = 'M86.8 67.8Q87.4 64 85.8 62';
const coilEnd = `M${P2(COIL_END)}Q94.4 81.6 92.6 84.2Q91.2 86.2 92 88.4`;
const coilFray = 'M92 88.4L91.2 89.6M92 88.4L92.8 89.6';

/** A rope lashing across the yard at height y: square to the yard, from its outer edge to its inner edge. */
function lashing(y: number): string {
  const n = Math.hypot(1, SLOPE);
  const ux = 1 / n;
  const uy = SLOPE / n; // across the yard, down to the right
  const w = YARD_W / n; // the yard's width, square to it
  const x0 = yardOut(y) + 0.5;
  return `M${f(x0)} ${f(y)}L${f(x0 + ux * (w - 0.9))} ${f(y + uy * (w - 0.9))}`;
}

// The boy's clothes and hair, the same shapes in both looks ------------------------------------------------

const hairShape =
  'M55 35C54.2 28.4 55 22 60 19.8Q62.6 15.4 68 16.4Q71.6 12.4 77 14.6Q82.6 14.2 84.6 18.4' +
  'Q90 19.6 90.4 25.4Q91 30 89.6 35Q88.2 31.8 86.6 32.4Q85 29.2 81.8 31.4Q79.4 28 75 30.6' +
  'Q72.2 27.4 67.8 30.2Q64.6 27.6 60.8 30.8Q58.4 30.6 57.4 33Q56.4 33.4 55 35Z';
const cowlick = 'M72.6 14.6Q72 9.4 77.6 8.4Q75 10.8 76 14.2Z';

const shirt = 'M56 61.8Q61.6 60.6 65.4 62.4Q68.8 66.4 72.5 66.4Q76.2 66.4 79.6 62.4Q83.4 60.6 89 61.8V83H56Z';
const vestLeft = 'M56 61.8Q61.6 60.6 65.4 62.4L71 82.6H56Z';
const vestRight = 'M89 61.8Q83.4 60.6 79.6 62.4L74 82.6H89Z';
const collar = 'M65.2 62.2Q68.8 66.4 72.5 66.4L67.8 69.6ZM79.8 62.2Q76.2 66.4 72.5 66.4L77.2 69.6Z';
const BELT_Y = 83.2;
/** Freckles across the bridge of the nose: below the eyes and above the mouth, outside the rig's room. */
const freckles = (color: string): string =>
  (
    [
      [70.7, 50.8],
      [72.5, 51.6],
      [74.3, 50.8],
    ] as const
  )
    .map(([x, y]) => circle(x, y, 0.6, color))
    .join('');
const beltKnot = 'M66.6 84.4L65.6 87.4M68.2 84.4L69 87.6';

// House look --------------------------------------------------------------------------------------------

/** The whole 4 as one balloon outline, its counter wound the other way (a hole) so the sail shows through. */
const houseFour =
  `M${f(yardOut(28))} 28Q${f(yardOut(24))} 24 ${f(yardOut(24) + 4)} 24H${STEM_R - 7}Q${STEM_R} 24 ${STEM_R} 31` +
  `V${BOOM_TOP}Q93.6 ${BOOM_TOP} 93.6 72.1V77Q93.6 81.5 ${STEM_R} 81.5V85.5Q${STEM_R} 92.5 ${STEM_R - 7} 92.5` +
  `H${STEM_X + 7}Q${STEM_X} 92.5 ${STEM_X} 85.5V81.5H15Q8.5 81.5 8.5 75V73.6` +
  `Q8.5 ${f(68.5 + (11 - 8.5) / SLOPE)} ${f(yardOut(70.6))} 70.6Z` +
  // the counter
  `M${STEM_X} ${f(COUNTER_TOP + 3.2)}Q${STEM_X} ${f(COUNTER_TOP)} ${f(yardIn(COUNTER_TOP + 2.4))} ` +
  `${f(COUNTER_TOP + 2.4)}L${f(yardIn(BOOM_TOP - 2.4))} ${BOOM_TOP - 2.4}Q${f(yardIn(BOOM_TOP))} ` +
  `${BOOM_TOP} ${f(yardIn(BOOM_TOP) + 3)} ${BOOM_TOP}H${STEM_X - 2.5}Q${STEM_X} ${BOOM_TOP} ${STEM_X} ` +
  `${BOOM_TOP - 2.5}Z`;

function houseSail(): string {
  return (
    line(sheetLine, hemp.shade, 1) +
    path(sailShape, cream.shade) +
    path(sailShape, cream.base, ' transform="translate(-1.4 -0.6)"') +
    line(sailSeam(48.4), cream.shade, 0.7) +
    line(sailSeam(54.8), cream.shade, 0.7)
  );
}

function houseCoil(): string {
  return (
    line(coilSling, hemp.shade, 2) +
    // the rope edged in shade, as the house look edges a line (Peg's hook), so the turns part
    coilMiddle +
    line(coilSpiral, hempDeep, 3) +
    line(coilSpiral, hemp.base, 1.9) +
    line(coilTwists, hemp.shade, 0.5) +
    line(coilEnd, hempDeep, 3) +
    line(coilEnd, hemp.base, 1.9) +
    line(coilFray, hemp.shade, 0.6)
  );
}

const boyHouse: AvatarDef = {
  id: pirateId(4, 'house'),
  kind: 'symbol',
  name: pirateName(ROLE, 'house'),
  tile,
  layers: {
    back:
      // the pennant's pole, rising from behind the apex, and its brass truck
      line(`M${POLE_X} 30V10.4`, wood.shade, 2) +
      circle(POLE_X, 9.6, 1.9, brass.base) +
      // the 4: one wooden piece, the sail showing through its counter
      path(houseFour, wood.shade) +
      path(houseFour, wood.base, ' transform="translate(-1.4 -1.3)"') +
      ellipse(yardOut(44) + 3.4, 44, 1.5, 7, wood.light, 40.6) +
      ellipse(14.6, 70.8, 3, 1.2, wood.light) +
      // the lashings that hold the sail to the yard
      [47, 56].map((y) => line(lashing(y), hemp.base, 1.4)).join('') +
      // his hair, with a cowlick
      path(hairShape, hair.shade) +
      path(hairShape, hair.base, ' transform="translate(-0.7 -0.8)"') +
      path(cowlick, hair.base) +
      line('M58.6 25Q60.6 20.8 65 19.8', hair.light, 1.2) +
      freckles(wood.shade) +
      // the shirt and the vest, and the rope belt
      path(shirt, cream.base) +
      path(collar, cream.shade) +
      path(vestLeft, vest.base) +
      path(vestRight, vest.shade) +
      path('M89 61.8Q83.4 60.6 79.6 62.4L78.4 66Q83.8 63.8 89 64.8Z', vest.base) +
      line(`M56.6 ${BELT_Y}H88.4`, hemp.base, 2.2) +
      circle(67.4, BELT_Y, 1.6, hemp.shade) +
      line(beltKnot, hemp.base, 1.1),
  },
  face: BOY_FACE,
  pivot: { x: 62, y: 54 },
  headBox: { x: 43, y: 10, size: 57 },
  base: 92.5,
  squash: true,
  motionBias: ['bounce', 'flip', 'tilt', 'squash'],
  gimmicks: [
    { id: 'sail', z: 'behind', markup: houseSail(), anim: sailAnims },
    {
      id: 'pennant',
      z: 'behind',
      markup:
        path(pennantShape, bandanaRed.base) +
        path(pennantFold, bandanaRed.shade) +
        path(pennantBand, cream.base),
      anim: pennantAnims,
    },
    { id: 'coil', markup: houseCoil(), anim: coilAnims },
  ],
};

// Invested look -----------------------------------------------------------------------------------------

/** The planks: the yard (behind), the boom over its foot, the stem (the boy) over both. */
const yardPlank: Pts = [
  [yardOut(23.5), 23.5],
  [yardIn(23.5), 23.5],
  [yardIn(76), 76],
  [10.2, 76],
  [10.2, 68.5 + (11 - 10.2) / SLOPE],
];
const boomPlank = chamfer(8, BOOM_TOP - 0.5, 93.6, 81.5, 3.2);
const stemPlank = chamfer(STEM_X, 23.5, STEM_R, 93.5, 3.2);

function investedSail(): string {
  return (
    inkedLine(sheetLine, hemp.base, 1, 2.4) +
    inked(sailShape, cream.base) +
    // the belly's shade along the leech, and the light along the foot
    path(
      `M${P2(SAIL_HEAD)}Q${P2(LEECH_BELLY)} ${P2(SAIL_CLEW)}L43 60.4Q47 52.2 ${f(SAIL_HEAD[0] - 1.2)} 44.4Z`,
      cream.shade,
    ) +
    line(sailSeam(48), cream.shade, 0.6) +
    line(sailSeam(54.4), cream.shade, 0.6) +
    // a little patch, stitched on
    path('M38.6 56.2L42.2 56.4L42 59.6L38.4 59.4Z', cream.shade) +
    line('M39.1 56.8L39.7 57.4M41.1 56.9L41.7 57.5M39 58.4L39.6 59M41 58.5L41.6 59.1', hemp.shade, 0.4)
  );
}

function investedCoil(): string {
  return (
    inkedLine(coilSling, hemp.shade, 2) +
    // the turns inked as one rope, the ink parting them; the twists on the outer turn
    circle(COIL_C[0], COIL_C[1], 2.4, INK) +
    coilMiddle +
    inkedLine(coilSpiral, hemp.base, 1.9, 1.9 + 2 * OUTLINE) +
    line(coilTwists, hemp.shade, 0.55) +
    inkedLine(coilEnd, hemp.base, 1.8) +
    line(coilFray, hemp.shade, 0.55)
  );
}

const boyInvested: AvatarDef = {
  id: pirateId(4, 'invested'),
  kind: 'symbol',
  name: pirateName(ROLE, 'invested'),
  tile,
  layers: {
    back:
      // the pennant's pole, rising from behind the apex, and its brass truck
      inkedLine(`M${POLE_X} 30V10.8`, wood.shade, 2.2) +
      line(`M${POLE_X - 0.5} 28V12.4`, wood.light, 0.6) +
      circle(POLE_X, 9.6, 2.2 + OUTLINE, INK) +
      circle(POLE_X, 9.6, 2.2, brass.base) +
      circle(POLE_X - 0.7, 8.9, 0.6, brass.light) +
      // the yard, with its grain and the lashings that hold the sail
      woodSlab(yardPlank, 2.2) +
      grain([
        [yardOut(30) + 4.4, 30],
        [yardOut(42) + 4, 42],
        [yardOut(54) + 4.6, 54],
        [yardOut(64) + 4.2, 64],
      ]) +
      grain([
        [yardIn(32) - 4.6, 32],
        [yardIn(40) - 4.2, 40],
      ]) +
      ellipse(yardOut(36) + 10.4, 36, 0.8, 2, woodDeep, 40.6) +
      [47, 56]
        .map(
          (y) =>
            inkedLine(lashing(y), hemp.base, 1.2, 2.7) + inkedLine(lashing(y + 1.6), hemp.base, 1.2, 2.7),
        )
        .join('') +
      // the boom, nailed over the yard's foot
      woodSlab(boomPlank, 2.2) +
      grain([
        [12, 71.6],
        [24, 70.8],
        [38, 71.8],
        [54, 71],
      ]) +
      grain([
        [14, 76.6],
        [28, 77.4],
        [42, 76.4],
        [54, 77],
      ]) +
      nail(13.8, 74) +
      nail(21.4, 74) +
      // the stem: the boy
      woodSlab(stemPlank) +
      grain([
        [61, 92],
        [62, 88],
        [61.4, 85.4],
      ]) +
      grain([
        [83, 92],
        [84, 88.4],
        [83.4, 85.6],
      ]) +
      // the hair's shadow on his brow, then the hair
      path('M57 31.4Q64 29 72.5 29.4Q81 29 88 31.4V33.6Q81 32.2 72.5 32Q64 32.2 57 33.6Z', woodMid) +
      inked(hairShape, hair.base) +
      path(
        'M89.6 35Q88.2 31.8 86.6 32.4Q85 29.2 81.8 31.4Q79.4 28 75 30.6Q76.4 24.6 83 23.2Q89.6 23 90.4 27.6Z',
        hair.shade,
      ) +
      inked(cowlick, hair.base) +
      line('M57.6 27Q59 21.6 64.6 19.8M68.4 17Q71.4 14.2 75.6 14.8', hair.light, 1.1) +
      line('M61.6 28.6Q64 25.2 68 24.6M70.6 27.4Q73.6 23.8 78 23.6', hair.shade, 0.8) +
      freckles(woodDeep) +
      // the shirt, the vest with brass buttons, and the rope belt
      inked(shirt, cream.base) +
      path('M79.6 62.4Q76.2 66.4 72.5 66.4V83H74Z', cream.shade) +
      inked(collar, cream.light) +
      path('M72.5 66.4L77.2 69.6L79.8 62.2Q77 65.8 72.5 66.4Z', cream.shade) +
      inked(vestLeft, vest.base) +
      path('M56 61.8Q58.6 61.3 60.6 61.4L58.4 82.6H56Z', vest.light) +
      inked(vestRight, vest.base) +
      path('M89 61.8V82.6H81.4Q83.6 72 84.6 61.3Q87 61.4 89 61.8Z', vest.shade) +
      circle(69, 71.4, 1.1, brass.base) +
      circle(70.4, 76.6, 1.1, brass.base) +
      circle(68.7, 71.1, 0.4, brass.light) +
      circle(70.1, 76.3, 0.4, brass.light) +
      inkedLine(`M56.4 ${BELT_Y}H88.6`, hemp.base, 2) +
      line('M59 83L60 83.6M63 83L64 83.6M76 83L77 83.6M80 83L81 83.6M84 83L85 83.6', hemp.shade, 0.5) +
      circle(67.4, BELT_Y, 1.7 + OUTLINE, INK) +
      circle(67.4, BELT_Y, 1.7, hemp.base) +
      inkedLine(beltKnot, hemp.base, 1.1, 2.4),
  },
  face: withIris(BOY_FACE, OBJECT.blue.base),
  pivot: { x: 62, y: 54 },
  headBox: { x: 43, y: 10, size: 57 },
  base: 93.5,
  squash: true,
  motionBias: ['bounce', 'flip', 'tilt', 'squash'],
  gimmicks: [
    { id: 'sail', z: 'behind', markup: investedSail(), anim: sailAnims },
    {
      id: 'pennant',
      z: 'behind',
      markup:
        inked(pennantShape, bandanaRed.base) +
        path(pennantFold, bandanaRed.shade) +
        line('M50 11.6C44 12 37 13.4 30.4 15.2', bandanaRed.light, 0.8) +
        path(pennantBand, cream.base) +
        inkedLine(`M${POLE_X} 12.2V15.8`, hemp.base, 1.2, 2.6),
      anim: pennantAnims,
    },
    { id: 'coil', markup: investedCoil(), anim: coilAnims },
  ],
};

/** The Rigger Boy, both looks. */
export const RIGGER_BOY: PirateCharacter = {
  digit: 4,
  looks: { house: boyHouse, invested: boyInvested },
};
