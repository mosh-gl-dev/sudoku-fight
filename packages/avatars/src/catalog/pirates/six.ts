/**
 * 6, the Deckhand (Moshe: "6 and 7 are pirates"; the twin brother of the Navigator, 9): a big, friendly young
 * sailor who keeps the deck shining. Read docs/avatars/PIRATES.md first; the series' toolbox is shared.ts.
 *
 * The digit is the body. The 6's upper stroke is his head, swept wide for the face, under the twins' bandana (red
 * with cream stripes), knotted where the stroke flicks up into the 6's terminal; the knot's tails stream back
 * behind it like a pennant. A grown man, not a kid: no blush, heavy brows, long sideburns, and the espresso hair
 * of his twin sister, the 9. Under his chin a cream sailor's shirt with blue stripes and a rope belt; below the
 * belt the bowl is his round wooden belly, a ring round the counter, with an anchor tattoo in faded blue (the wood
 * is his skin). The sleeve on the viewer's left holds a soapy mop: it swabs to and fro when he laughs, jerks up
 * when he is surprised, scrubs hard when he is cross and sways when idle; soap bubbles rise from it when he
 * smiles or laughs. His favourite motion is the flip: a 6 turned over is his twin, the 9. No guns, no blades.
 *
 * In a locked board cell (22 px) the app crops to `headBox`: the head under the bandana, never the bowl, so he
 * never reads as a placed 6.
 */

import { GIMMICK_RECIPES as R } from '../../gimmick';
import { CLOTH, FACE, FUR, HAIR, mix, OBJECT, type Ramp } from '../../palette';
import { f } from '../../svg';
import type { AvatarDef, GimmickAnim, GimmickDef } from '../../types';
import { circle, ellipse, lerp, line, P, path, type Pt, shaded } from '../draw';
import {
  anchor,
  bandanaRed,
  BROWS,
  chamfer,
  cream,
  flutter,
  grain,
  houseCounter,
  INK,
  inked,
  inkedLine,
  inset,
  iron,
  ironSlab,
  nail,
  PIRATE_TILES,
  type PirateCharacter,
  pirateId,
  pirateName,
  poly,
  type Pts,
  withIris,
  wood,
  woodDeep,
  woodMid,
  woodSlab,
} from './shared';

const ROLE = { he: 'מלח הסיפון', en: 'The Deckhand' } as const;
const tile = PIRATE_TILES[6];
/** The twins' espresso hair (the 9's): apart from the auburn of the 2 and the 3. */
const hair = HAIR.espresso;
/** The shirt's stripes: sailor's blue on cream (Peg wears the reverse, cream on navy). */
const stripe = CLOTH.denim;
/** The mop's handle: pale ash, so it stands apart from the digit's wood. */
const ash: Ramp = {
  base: mix(CLOTH.cream.shade, FUR.tawny.light, 0.4),
  shade: mix(CLOTH.cream.shade, FUR.tawny.base, 0.6),
  light: CLOTH.cream.light,
};
/** The mop's wet cotton yarn: a cool off-white. */
const yarn: Ramp = {
  base: mix(FUR.white.base, OBJECT.steel.light, 0.35),
  shade: mix(FUR.white.shade, OBJECT.steel.base, 0.5),
  light: FUR.white.light,
};
/** The rope belt. */
const rope: Ramp = {
  base: mix(HAIR.honey.base, CLOTH.cream.shade, 0.45),
  shade: mix(HAIR.honey.shade, FUR.brown.base, 0.35),
  light: HAIR.honey.light,
};
/** Soap: a bubble's skin and its rim. */
const soap = mix(OBJECT.blue.light, OBJECT.white.base, 0.6);
const soapRim = mix(OBJECT.blue.light, OBJECT.white.base, 0.15);
/** A sailor's tattoo on his wooden belly: an anchor in faded blue ink, on the ring's right side. */
const tattoo = mix(CLOTH.denim.shade, wood.base, 0.18);
const TATTOO: Pt = [75.8, 73.4];

const DECK_FACE: AvatarDef['face'] = {
  ink: FACE.ink,
  eyes: { left: { x: 35, y: 34.5 }, right: { x: 52, y: 34.5 }, r: 5.3, style: 'round' },
  // heavier brows than the series', and no cheeks (as the Captain): a grown sailor, not a kid
  brows: { ...BROWS, color: hair.base, thickness: 2.6 },
  mouth: { x: 43.5, y: 45.5, w: 14 },
  halo: { x: 43.5, y: 6.5 },
};

// Curves ---------------------------------------------------------------------------------------------------

type Cubic = readonly [Pt, Pt, Pt, Pt];
const bez = (c: Cubic, t: number): Pt => {
  const u = 1 - t;
  const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t] as const;
  return [
    k[0] * c[0][0] + k[1] * c[1][0] + k[2] * c[2][0] + k[3] * c[3][0],
    k[0] * c[0][1] + k[1] * c[1][1] + k[2] * c[2][1] + k[3] * c[3][1],
  ];
};
/** Where a cubic that only rises or only falls reaches height y (0-1). */
const tAtY = (c: Cubic, y: number): number => {
  const down = c[3][1] > c[0][1];
  let [lo, hi] = [0, 1];
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (bez(c, m)[1] < y === down) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
};
const xAtY = (c: Cubic, y: number): number => bez(c, tAtY(c, y))[0];
/** The cubic's first part, from its start to height y, as an SVG "C" command (de Casteljau). */
const cubicTo = (c: Cubic, y: number): string => {
  const t = tAtY(c, y);
  const a = lerp(c[0], c[1], t);
  const b = lerp(c[1], c[2], t);
  const ab = lerp(a, b, t);
  const end = bez(c, t);
  return `C${P(a)} ${P(ab)} ${P(end)}`;
};

// The moving parts, the same in both looks -----------------------------------------------------------------

/** The bandana's knot, where its tails are tied: they stream back behind the terminal, like a pennant. */
const TAILS_ROOT = { x: 67.8, y: 18.8 } as const;
const tailsAnims = flutter(TAILS_ROOT);

/** The mop: its handle from the top end down to the iron ferrule, held in his sleeve at the grip. */
const HANDLE_TOP: Pt = [11.4, 27.6];
const HANDLE_FOOT: Pt = [16, 80.6];
const handleAt = (y: number): number =>
  HANDLE_TOP[0] + ((y - HANDLE_TOP[1]) * (HANDLE_FOOT[0] - HANDLE_TOP[0])) / (HANDLE_FOOT[1] - HANDLE_TOP[1]);
const GRIP_Y = 54;
const MOP_GRIP = { x: handleAt(GRIP_Y), y: GRIP_Y } as const;
const handlePath = `M${P(HANDLE_TOP)}L${P(HANDLE_FOOT)}`;

const mopAnims: readonly GimmickAnim[] = [
  // he swabs the deck: the mop head swishes to and fro, more toward him than toward the tile's edge
  {
    trigger: ['laugh'],
    durationMs: 760,
    loop: true,
    keyframes: [{ t: 0 }, { t: 0.25, rotate: 5 }, { t: 0.75, rotate: -12 }, { t: 1 }],
    origin: MOP_GRIP,
  },
  {
    trigger: ['smile', 'wink'],
    durationMs: 1300,
    loop: true,
    keyframes: [{ t: 0 }, { t: 0.25, rotate: 3 }, { t: 0.75, rotate: -6 }, { t: 1 }],
    origin: MOP_GRIP,
  },
  // startled, he jerks the mop up and holds it
  {
    trigger: ['surprised'],
    durationMs: 900,
    keyframes: [
      { t: 0, ease: 'emphasized' },
      { t: 0.3, rotate: -9, y: -5 },
      { t: 0.62, rotate: -6, y: -3.4 },
      { t: 1, rotate: -6, y: -3.4 },
    ],
    origin: MOP_GRIP,
  },
  // cross, he scrubs hard
  {
    trigger: ['angry'],
    durationMs: 340,
    loop: true,
    keyframes: [{ t: 0 }, { t: 0.25, rotate: 3 }, { t: 0.75, rotate: -6 }, { t: 1 }],
    origin: MOP_GRIP,
  },
  // the body rocks, the mop swings after it
  { ...R.sway({ angle: 5, ms: 520 }), trigger: ['wobble', 'shake'], origin: MOP_GRIP },
  // idle: he leans on it, swaying a little
  { ...R.sway({ angle: 4, ms: 2800 }), trigger: ['idle'], origin: MOP_GRIP },
];

/** Soap bubbles rise from the mop head, a third of a beat apart; one keeps rising slowly when idle. */
const BUBBLES: readonly Pt[] = [
  [9.8, 82.4],
  [17.6, 80],
  [25.2, 83.6],
];
const BUBBLE_MS = 2100;
const bubbleAnims = (i: number): readonly GimmickAnim[] => {
  const [x, y] = BUBBLES[i] ?? [0, 0];
  const origin = { x, y };
  const busy: GimmickAnim = {
    ...R.bubble({ rise: 24, ms: BUBBLE_MS }),
    delayMs: Math.round((i * BUBBLE_MS) / 3),
    trigger: ['laugh', 'smile'],
    origin,
  };
  return i === 0 ? [busy, { ...R.bubble({ rise: 20, ms: 3000 }), trigger: ['idle'], origin }] : [busy];
};
const BUBBLE_ANIMS = BUBBLES.map((_, i) => bubbleAnims(i));

const bubbles = (draw: (at: Pt) => string): GimmickDef[] =>
  BUBBLES.map((at, i) => ({
    id: `bubble-${i}`,
    rest: 'hidden',
    markup: draw(at),
    anim: BUBBLE_ANIMS[i] ?? [],
  }));

// The shared costume pieces ------------------------------------------------------------------------------

/** Where the shirt ends and the rope belt runs, in both looks. */
const SHIRT_END = 59.4;
const BELT_END = 62.8;
/** The shirt's top: the shoulders, and the neckline round his chin (clear of the laughing mouth). */
const NECK_L: Pt = [29.6, 47.2];
const NECK_R: Pt = [57.4, 47.2];
const neckline = `C32.4 53.6 37.6 55.8 43.5 55.8C49.4 55.8 54.6 53.6 ${P(NECK_R)}`;
/** The wood showing inside the neckline (drawn over the stripes). */
const neck = `M${P(NECK_L)}${neckline}Z`;
/** The stripes' bands (y0, y1): over the shoulders, and under the neckline. */
const STRIPES = [
  [50.6, 52.8],
  [56, 58.2],
] as const;

const bandana =
  'M19.4 31.4C19.4 17 30 11 43.5 11C57 11 65.6 14.6 66.4 27Q55.6 22.6 43.5 22.6Q30.4 21.8 19.4 31.4Z';
const bandanaStripes =
  'M22.4 22.6C26.6 16.4 34 13.8 43.5 13.8C53 13.8 60.4 16.4 63.6 21.6M20.2 28C25.6 20.6 34 18.2 43.5 18.2C53 18.2 61 20.4 65.4 25.6';
const knot = 'M62 17.4Q65.4 14.8 68.6 17.2Q70.2 20.8 67.2 23.2Q63.4 24.2 61.8 21Z';
/** The knot's tails: two streamers with notched ends, flying back over the terminal like a pennant. */
const tailHigh =
  'M66.6 17C70.6 11.6 76.6 10.2 83.4 11.4C81 12.8 80.8 14.8 82.8 16.4C77.4 15.6 72.6 16.8 69.2 20Z';
const tailLow = 'M68.6 19.4C73 16.6 78 16.4 82.8 18.4C80.6 19.4 80.2 21 81.6 22.4C76.8 21 72.8 21.4 69.6 23Z';
/** Long sideburns down to y 42, outside the eyes' room (1.3 r). */
const sideburns =
  'M20.8 31.2Q24.6 28.6 27.4 29.8Q27.6 36.4 26.4 42Q24.2 40.4 21.2 41.2Z' +
  'M63.4 27.2Q60.6 26.6 59.4 28.4Q59.6 36 60.4 42Q62 40.6 63.4 41.4Z';

/** The cuff of his sleeve, round the grip. */
const cuff = `M13.4 ${GRIP_Y - 3.6}H20.6Q22 ${GRIP_Y - 3.6} 22 ${GRIP_Y - 2.2}V${GRIP_Y + 2.2}Q22 ${GRIP_Y + 3.6} 20.6 ${GRIP_Y + 3.6}H13.4Q12 ${GRIP_Y + 3.6} 12 ${GRIP_Y + 2.2}V${GRIP_Y - 2.2}Q12 ${GRIP_Y - 3.6} 13.4 ${GRIP_Y - 3.6}Z`;
const cuffStripe = `M12 ${GRIP_Y - 1.2}H22V${GRIP_Y + 0.6}H12Z`;
const ferrule = 'M13.5 79.2H18.5L18.9 83.6H13.2Z';
/** The mop head: yarn hanging from the ferrule and spreading on the deck. */
const mopHead =
  'M13.4 83.2H19.2Q23.4 85.8 26.8 91.4Q25.2 93.8 22.8 92.4Q21.2 94.2 19.2 92.6Q17.2 94.4 15.2 92.6' +
  'Q13 94.2 11.2 92.4Q9 93.8 7.4 91.6Q10.4 85.8 13.4 83.2Z';
const mopStrands = 'M14.8 85.2Q12.8 88.6 10.6 91.6M16.6 85.4V92M18.4 85.2Q20.6 88.6 22.8 91.6';
/** Suds on the mop head, part of its rest pose. */
const suds = (rim: string): string =>
  circle(9.6, 88, 1.8, rim) +
  circle(9.6, 88, 1.3, soap) +
  circle(23.8, 88.4, 1.5, rim) +
  circle(23.8, 88.4, 1, soap) +
  circle(21.4, 85.8, 1.1, rim) +
  circle(21.4, 85.8, 0.7, soap) +
  circle(9.1, 87.5, 0.45, OBJECT.white.base) +
  circle(23.4, 88, 0.4, OBJECT.white.base);

/** Rope twists across a belt from x0 to x1 between y0 and y1. */
const twists = (x0: number, x1: number, y0: number, y1: number, color: string, width: number): string => {
  let d = '';
  for (let x = x0 + 2.2; x < x1 - 0.4; x += 3.2) d += `M${f(x)} ${f(y0 + 0.5)}L${f(x - 1.6)} ${f(y1 - 0.5)}`;
  return line(d, color, width);
};

// House look: the balloon 6 --------------------------------------------------------------------------------

/** The bowl's right side, from the notch round to its widest point (the shirt and the belt end on it). */
const HOUSE_RIGHT: Cubic = [
  [67, 47.2],
  [79, 49.6],
  [85, 59],
  [85, 70.4],
];
const houseSix =
  'M21 70V50C21 31 34 15 58 15C72 15 83 19 86.4 26.6C88 30.4 86 35.4 81.4 36.4C77.4 37.2 74.6 34.8 72.4 32.8' +
  'C69.6 30.4 66.6 30.6 64.6 33.6Q63.4 35.6 63.4 40V43Q63.6 46.6 67 47.2' +
  `C79 49.6 85 59 85 70.4C85 84 72 93.6 53 93.6C34 93.6 21 84.6 21 70Z`;
/** A band across the house body between y0 and y1 (the left side is straight there, the right side round). */
const houseBand = (y0: number, y1: number): string =>
  poly([
    [21, y0],
    [xAtY(HOUSE_RIGHT, y0), y0],
    [xAtY(HOUSE_RIGHT, y1), y1],
    [21, y1],
  ]);
const houseShirt =
  `M21 50.4Q23.6 47.4 ${P(NECK_L)}${neckline}L63.4 45.6Q63.6 46.6 67 47.2` +
  `${cubicTo(HOUSE_RIGHT, SHIRT_END)}H21Z`;

const houseTails = path(tailLow, bandanaRed.shade) + path(tailHigh, bandanaRed.base);

const houseMop =
  line(handlePath, ash.shade, 3) +
  line(handlePath, ash.base, 1.8) +
  path(ferrule, iron.base) +
  shaded(mopHead, yarn.base, yarn.shade, -0.9, -0.9) +
  line(mopStrands, yarn.shade, 0.7) +
  suds(OBJECT.white.base) +
  path(cuff, cream.shade) +
  path(cuff, cream.base, ' transform="translate(-0.5 -0.5)"') +
  path(cuffStripe, stripe.base);

const houseBubble = ([x, y]: Pt): string =>
  circle(x, y, 3.1, OBJECT.white.base) +
  circle(x, y, 2.3, soap) +
  circle(x - 1, y - 1, 0.75, OBJECT.white.base);

const deckHouse: AvatarDef = {
  id: pirateId(6, 'house'),
  kind: 'symbol',
  name: pirateName(ROLE, 'house'),
  tile,
  layers: {
    back:
      // the 6: his head (the upper stroke and its terminal) and his body (the bowl), the counter open
      shaded(houseSix, wood.base, wood.shade) +
      ellipse(24.6, 43, 1.5, 3.6, wood.light) +
      ellipse(76.6, 19.4, 4, 1.3, wood.light, 18) +
      ellipse(28.6, 78.4, 1.8, 4.6, wood.light, 20) +
      houseCounter(54, 73, 11.5, 9.5, tile, wood.shade) +
      anchor(...TATTOO, 0.95, tattoo, 1.15) +
      // the shirt: cream with blue stripes, its shade on the right
      path(houseShirt, cream.shade) +
      `<g transform="translate(-1.2 -1.1)">` +
      path(houseShirt, cream.base) +
      STRIPES.map(([y0, y1]) => path(houseBand(y0, y1), stripe.base)).join('') +
      path(neck, wood.base) +
      `</g>` +
      // the rope belt
      path(houseBand(SHIRT_END, BELT_END), rope.base) +
      twists(21, xAtY(HOUSE_RIGHT, SHIRT_END), SHIRT_END, BELT_END, rope.shade, 0.9) +
      // his sideburns under the bandana
      path(sideburns, hair.base),
    front:
      // the twins' bandana: red with cream stripes, knotted at the back
      path(bandana, bandanaRed.shade) +
      path(bandana, bandanaRed.base, ' transform="translate(-0.6 -0.8)"') +
      line(bandanaStripes, cream.base, 1.5) +
      path(knot, bandanaRed.shade) +
      path(knot, bandanaRed.base, ' transform="translate(-0.4 -0.5)"'),
  },
  face: DECK_FACE,
  pivot: { x: 47, y: 40 },
  headBox: { x: 14, y: 4, size: 58 },
  base: 93.6,
  squash: true,
  motionBias: ['flip', 'wobble', 'nod', 'tilt'],
  gimmicks: [
    { id: 'tails', z: 'behind', markup: houseTails, anim: tailsAnims },
    { id: 'mop', markup: houseMop, anim: mopAnims },
    ...bubbles(houseBubble),
  ],
};

// Invested look: the 6 in planks ------------------------------------------------------------------------

/** The head: a broad plank whose top-left corner is cut twice, the 6's sweep; nailed over the terminal. */
const head: Pts = [
  [21, 40],
  [27, 26],
  [38, 17.4],
  [46, 15.4],
  [63.4, 15.4],
  [63.4, 61],
  [21, 61],
];
/**
 * The terminal: a slanted plank at most 14 deep that rises toward its cut end (x 86, y 14.4–26.4), the 6's
 * upward flick.
 */
const terminal: Pts = [
  [58, 15.4],
  [80, 13],
  [86, 14.4],
  [86, 26.4],
  [63.4, 28.6],
  [58, 28.6],
];
/** The bowl's shoulder toward the notch: a 45° cut from (68, 47.6) to the right side; its x at height y. */
const SHOULDER = (y: number): number => 68 + (y - 47.6);
/** The bowl: one octagonal plank under the head and the shirt, big cuts at its lower corners. */
const bowl: Pts = [
  [21, 47.6],
  [68, 47.6],
  [85, 64.6],
  [85, 76.4],
  [67, 94.4],
  [39, 94.4],
  [21, 76.4],
];
/** The counter, cut through the bowl's plank: 24 × 18, its walls at least 12 (its top just under the belt). */
const counter = chamfer(42, 64.4, 66, 82.4, 6);

/** The counter: the ink edge, the tile through it, and the plank's thickness on its upper and left walls. */
function counterHole(): string {
  const d = poly(counter);
  const w = inset(counter, 2);
  const at = (pts: Pts, i: number): Pt => pts[i] ?? [0, 0];
  const lip = poly([6, 7, 0, 1, 2].map((i) => at(counter, i)).concat([2, 1, 0, 7, 6].map((i) => at(w, i))));
  return inked(d, tile) + path(lip, wood.shade);
}
const investedShirt = `M21 49.6Q23.6 47.2 ${P(NECK_L)}${neckline}L63.4 46.6V47.6H68L${f(SHOULDER(SHIRT_END))} ${SHIRT_END}H21Z`;
const investedBand = (y0: number, y1: number): Pts => [
  [21, y0],
  [SHOULDER(y0), y0],
  [SHOULDER(y1), y1],
  [21, y1],
];

const investedTails = inked(tailLow, bandanaRed.shade) + inked(tailHigh, bandanaRed.base);

const investedMop =
  inkedLine(handlePath, ash.base, 2.6, 5) +
  line(
    `M${f(HANDLE_TOP[0] - 0.6)} ${f(HANDLE_TOP[1] + 1.4)}L${f(handleAt(GRIP_Y - 5) - 0.6)} ${GRIP_Y - 5}`,
    ash.light,
    0.7,
  ) +
  ironSlab(
    [
      [13.5, 79.2],
      [18.5, 79.2],
      [18.9, 83.6],
      [13.2, 83.6],
    ],
    0.9,
  ) +
  inked(mopHead, yarn.base) +
  path(
    'M19.2 83.2Q23.4 85.8 26.8 91.4Q25.2 93.8 22.8 92.4Q21.2 94.2 19.2 92.6Q20.6 88 18.2 84.4Z',
    yarn.shade,
  ) +
  line(mopStrands, yarn.shade, 0.7) +
  line('M12.6 85.4Q10.6 88.2 8.8 90.6', yarn.light, 0.7) +
  suds(soapRim) +
  inked(cuff, cream.base) +
  path(
    `M12 ${GRIP_Y + 1.6}H22V${GRIP_Y + 2.2}Q22 ${GRIP_Y + 3.6} 20.6 ${GRIP_Y + 3.6}H13.4Q12 ${GRIP_Y + 3.6} 12 ${GRIP_Y + 2.2}Z`,
    cream.shade,
  ) +
  path(cuffStripe, stripe.base);

const investedBubble = ([x, y]: Pt): string =>
  circle(x, y, 3.2, soapRim) +
  circle(x, y, 2.5, soap) +
  circle(x - 0.85, y - 0.85, 0.65, OBJECT.white.base) +
  circle(x + 0.9, y + 1, 0.35, OBJECT.white.base);

const deckInvested: AvatarDef = {
  id: pirateId(6, 'invested'),
  kind: 'symbol',
  name: pirateName(ROLE, 'invested'),
  tile,
  layers: {
    back:
      // the bowl: an octagonal plank, the counter cut through it, nailed at its foot
      woodSlab(bowl) +
      grain([
        [26.4, 64],
        [27.2, 70],
        [26.4, 76],
      ]) +
      grain([
        [79.4, 66],
        [80.2, 71],
        [79.4, 76],
      ]) +
      grain([
        [42, 88.4],
        [50, 87.6],
        [58, 88.6],
        [65, 88],
      ]) +
      ellipse(33.6, 69.6, 0.8, 2, woodDeep) +
      counterHole() +
      anchor(TATTOO[0] + 0.25, TATTOO[1] + 0.25, 0.95, INK, 1.7) +
      anchor(...TATTOO, 0.95, tattoo, 1.15) +
      nail(33.4, 84.4) +
      nail(72.6, 84.4) +
      // the terminal, and the head nailed over it (its edge is the joint)
      woodSlab(terminal, 2.2) +
      grain([
        [76.4, 23.6],
        [80.4, 22.8],
        [84, 21.4],
      ]) +
      woodSlab(head) +
      grain([
        [24.2, 47],
        [25, 43],
        [24.4, 39.6],
      ]) +
      nail(66.4, 25.6) +
      nail(73.6, 24.8) +
      // the shirt: cream with blue stripes, light on the shoulders, shade down its right edge and under the belt
      inked(investedShirt, cream.base) +
      path(
        `M65.6 47.6H68L${f(SHOULDER(SHIRT_END))} ${SHIRT_END}H${f(SHOULDER(SHIRT_END) - 3.6)}Z`,
        cream.shade,
      ) +
      path(
        `M21 ${SHIRT_END - 1.2}H${f(SHOULDER(SHIRT_END - 1.2))}L${f(SHOULDER(SHIRT_END))} ${SHIRT_END}H21Z`,
        cream.shade,
      ) +
      path(`M21 49.6Q23.6 47.2 ${P(NECK_L)}L30.4 48.8Q24.6 48.8 21 51.2Z`, cream.light) +
      path(`M${P(NECK_R)}L63.4 46.6V48L56.6 48.8Z`, cream.light) +
      STRIPES.map(([y0, y1]) => path(poly(investedBand(y0, y1)), stripe.base)).join('') +
      path(neck, wood.base) +
      // the rope belt
      inked(poly(investedBand(SHIRT_END, BELT_END)), rope.base) +
      path(poly(investedBand(BELT_END - 1, BELT_END)), rope.shade) +
      twists(21, SHOULDER(SHIRT_END), SHIRT_END, BELT_END, rope.shade, 0.9) +
      // the shadow the bandana casts on his brow, and his sideburns
      path(
        'M22.4 27.6Q32 21.2 43.5 21.4Q55 21.4 64.4 25.4V28.4Q55 25 43.5 24.8Q32.4 24.8 23 30.6Z',
        woodMid,
      ) +
      inked(sideburns, hair.base) +
      line('M22.8 32.4Q24 35 23.8 36.8M61.2 30Q61 32.6 61.8 34.6', hair.shade, 0.7),
    front:
      // the twins' bandana: red with cream stripes, the knot at the back
      inked(bandana, bandanaRed.base) +
      path(
        'M43.5 22.6Q55.6 22.6 66.4 27Q65.6 15.4 55 12.2Q61.6 17.6 61 23.2Q52.4 22.4 43.5 22.6Z',
        bandanaRed.shade,
      ) +
      line(bandanaStripes, cream.base, 1.5) +
      line('M22.4 25.6Q26.6 16.4 36 12.6', bandanaRed.light, 0.9) +
      inked(knot, bandanaRed.base) +
      path('M68.6 17.2Q70.2 20.8 67.2 23.2Q63.4 24.2 61.8 21Q65.8 22 68.6 17.2Z', bandanaRed.shade),
  },
  face: withIris(DECK_FACE, HAIR.chestnut.light),
  pivot: { x: 47, y: 40 },
  headBox: { x: 14, y: 4, size: 58 },
  base: 94.4,
  squash: true,
  motionBias: ['flip', 'wobble', 'nod', 'tilt'],
  gimmicks: [
    { id: 'tails', z: 'behind', markup: investedTails, anim: tailsAnims },
    { id: 'mop', markup: investedMop, anim: mopAnims },
    ...bubbles(investedBubble),
  ],
};

/** The Deckhand, both looks. */
export const DECKHAND: PirateCharacter = {
  digit: 6,
  looks: { house: deckHouse, invested: deckInvested },
};
