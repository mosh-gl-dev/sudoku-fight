/**
 * 9, the Navigator (Moshe: "9 is a young woman"; the twin sister of the Deckhand, 6): the ship's navigator and
 * lookout, who reads the compass and the stars. Read docs/avatars/PIRATES.md first; the series' toolbox is
 * shared.ts, the references one.ts (the Captain) and seven.ts (Peg-leg Peg).
 *
 * The digit is the body. The 9's bowl is her round head under the twins' pirate scarf (red with cream stripes,
 * the mirror of her brother's bandana): it covers her crown up to just under the counter, where her dark hair is
 * put up in a bun round the hole, and it is knotted at the back on the left, its tails flying. Her face fills the
 * lower part of the bowl, a loose wave of hair falls past the scarf at her right temple, and a long braid tied off
 * with a red ribbon streams out behind her to the left, blown by the sea wind like the scarf's tails. The 9's tail
 * is her body in a long forest-green coat over a cream collar, a brass compass on a cord on her chest (the north
 * star is the compass's); the coat's hem sweeps left with the tail's curl, over the wooden foot.
 *
 * Her moves: the compass needle whirls round and settles when she is surprised, spins when she is dizzy, hunts
 * to and fro when she is confused, turns back against the body's spin (it keeps north) and drifts a little when
 * idle, with a glint on the brass; her braid swings with her, flicks up on surprise and hangs when she is sad or
 * sleepy; the scarf's tails flutter. Her favourite motion is the flip (a mirror, not the half turn that would
 * make her twin's 6). No guns, no blades.
 *
 * In a locked board cell (22 px) the app crops to `headBox`: the bun, the scarf and the face, never the tail, so
 * she never reads as a placed 9.
 */

import { GIMMICK_RECIPES as R } from '../../gimmick';
import { CLOTH, FACE, HAIR } from '../../palette';
import { f } from '../../svg';
import type { AvatarDef, GimmickAnim } from '../../types';
import { circle, ellipse, lerp, line, P, path, type Pt, shaded } from '../draw';
import {
  bandanaRed,
  brass,
  BROWS,
  cream,
  flutter,
  glint,
  grain,
  houseCounter,
  inked,
  inkedLine,
  inkedRing,
  inset,
  leather,
  nail,
  navy,
  PIRATE_TILES,
  type PirateCharacter,
  pirateId,
  pirateName,
  poly,
  type Pts,
  steel,
  withIris,
  wood,
  woodMid,
  woodSlab,
} from './shared';

const ROLE = { he: 'הנווטת', en: 'The Navigator' } as const;
const tile = PIRATE_TILES[9];
/** Dark espresso hair: it stands out on the berry tile, and apart from the auburn of the 2, the 3 and her twin. */
const hair = HAIR.espresso;
const coat = CLOTH.forest;
/** The compass's dial: a warm paper white. */
const dial = CLOTH.cream;

const NAV_FACE: AvatarDef['face'] = {
  ink: FACE.ink,
  eyes: { left: { x: 41.5, y: 44.5 }, right: { x: 58.5, y: 44.5 }, r: 5.3, style: 'round' },
  brows: { ...BROWS, color: hair.base },
  mouth: { x: 50, y: 56, w: 14 },
  // smaller cheeks than the kids' (0.72): a young woman, not a child
  cheeks: { color: FACE.blush, dx: 0.55, dy: 1.45, size: 0.6 },
  halo: { x: 50, y: 4 },
};
const PIVOT = { x: 50, y: 42 } as const;
const HEAD_BOX = { x: 18, y: 4, size: 62 } as const;
const MOTION_BIAS = ['flip', 'tilt', 'spin', 'nod'] as const;

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
/** The part of a cubic from t0 to t1, as an SVG "C" command (de Casteljau, twice). */
const subCubic = (c: Cubic, t0: number, t1: number): string => {
  const split = (q: Cubic, t: number): [Cubic, Cubic] => {
    const a = lerp(q[0], q[1], t);
    const b = lerp(q[1], q[2], t);
    const d = lerp(q[2], q[3], t);
    const ab = lerp(a, b, t);
    const bd = lerp(b, d, t);
    const m = lerp(ab, bd, t);
    return [
      [q[0], a, ab, m],
      [m, bd, d, q[3]],
    ];
  };
  const [, right] = split(c, t0);
  const [part] = split(right, (t1 - t0) / (1 - t0));
  return `C${P(part[1])} ${P(part[2])} ${P(part[3])}`;
};

// The moving parts, the same in both looks -----------------------------------------------------------------

/** The scarf's knot (at the back on the left, the mirror of her twin's): its tails stream out to the left. */
const TAILS_ROOT = { x: 23, y: 31.4 } as const;
const tailsAnims = flutter(TAILS_ROOT);

/** The braid: tied behind her head, it streams out to the left. Its root is hidden behind the bowl. */
const BRAID_ROOT = { x: 27, y: 41 } as const;
const braidAnims: readonly GimmickAnim[] = [
  // the body moves or she laughs: it swings after her; idle, it sways in the breeze
  ...flutter(BRAID_ROOT, { angle: 9, trigger: ['laugh', 'wobble', 'spin', 'flip', 'bounce', 'shake'] }),
  // startled, it flicks up and settles a little higher
  {
    trigger: ['surprised'],
    durationMs: 800,
    keyframes: [
      { t: 0, ease: 'emphasized' },
      { t: 0.3, rotate: 10 },
      { t: 0.65, rotate: 6 },
      { t: 1, rotate: 6 },
    ],
    origin: BRAID_ROOT,
  },
  // sad or sleepy, it hangs
  {
    trigger: ['sad', 'sleepy'],
    durationMs: 1200,
    keyframes: [
      { t: 0, ease: 'standard' },
      { t: 0.6, rotate: -13 },
      { t: 1, rotate: -12 },
    ],
    origin: BRAID_ROOT,
  },
];

/** The compass on her chest; its needle turns on the pivot. */
const COMPASS = { x: 62.6, y: 75.6, r: 6.4 } as const;
const COMPASS_AT = { x: COMPASS.x, y: COMPASS.y } as const;
const needleAnims: readonly GimmickAnim[] = [
  // the body spins, the needle keeps north: it turns back against the spin
  { ...R.spin({ ms: 1000, reverse: true }), trigger: ['spin'], origin: COMPASS_AT },
  // startled: it whirls round twice, overshoots and settles on north again
  {
    trigger: ['surprised'],
    durationMs: 1100,
    keyframes: [
      { t: 0, ease: 'emphasized' },
      { t: 0.55, rotate: 740, ease: 'standard' },
      { t: 0.75, rotate: 712 },
      { t: 0.88, rotate: 724 },
      { t: 1, rotate: 720 },
    ],
    origin: COMPASS_AT,
  },
  // dizzy: round and round
  { ...R.spin({ ms: 900 }), trigger: ['dizzy'], origin: COMPASS_AT },
  // confused: it hunts to and fro and cannot settle
  {
    trigger: ['confused'],
    durationMs: 1000,
    loop: true,
    keyframes: [{ t: 0 }, { t: 0.2, rotate: 38 }, { t: 0.45, rotate: -24 }, { t: 0.7, rotate: 52 }, { t: 1 }],
    origin: COMPASS_AT,
  },
  // idle: it drifts a little about north
  { ...R.sway({ angle: 9, ms: 2600 }), trigger: ['idle'], origin: COMPASS_AT },
];
/** The glint on the compass's brass rim (upper left). */
const GLINT_AT: Pt = [COMPASS.x - 4.4, COMPASS.y - 4.6];

/** The needle: north in red, south in steel, each half lit on the left; a brass pin. Drawn pointing north. */
function needle(): string {
  const { x, y } = COMPASS;
  const n = 5.2;
  const w = 1.6;
  return (
    path(`M${f(x)} ${f(y - n)}L${f(x + w)} ${f(y)}H${f(x - w)}Z`, bandanaRed.shade) +
    path(`M${f(x)} ${f(y - n)}V${f(y)}H${f(x - w)}Z`, bandanaRed.base) +
    path(`M${f(x)} ${f(y + n)}L${f(x + w)} ${f(y)}H${f(x - w)}Z`, steel.shade) +
    path(`M${f(x)} ${f(y + n)}V${f(y)}H${f(x - w)}Z`, steel.base) +
    circle(x, y, 0.95, brass.base) +
    circle(x - 0.3, y - 0.3, 0.35, brass.light)
  );
}

/** The dial's marks: a north tick in red, three in navy (not the outline's ink: the house look has none). */
function dialMarks(): string {
  const { x, y, r } = COMPASS;
  const a = r - 1.5;
  return (
    line(
      `M${f(x + a - 1.3)} ${f(y)}H${f(x + a - 0.3)}M${f(x)} ${f(y + a - 1.3)}V${f(y + a - 0.3)}` +
        `M${f(x - a + 1.3)} ${f(y)}H${f(x - a + 0.3)}`,
      navy.shade,
      0.55,
    ) + line(`M${f(x)} ${f(y - a + 0.3)}V${f(y - a + 1.4)}`, bandanaRed.base, 0.7)
  );
}

// The braid -------------------------------------------------------------------------------------------------

/** The braid's beads, from the root to the tie: centre and half width (it tapers). */
const BRAID: readonly (readonly [x: number, y: number, w: number])[] = [
  [22.4, 43.4, 4.2],
  [18.2, 47.2, 4],
  [15.4, 51.8, 3.7],
  [14, 57, 3.4],
  [13.6, 62, 3.1],
];
/** Where the ribbon ties the braid off. */
const BRAID_TIE: Pt = [13.6, 66];
/** One bead of the plait: a lens along the braid, leaning alternately left and right. */
function bead(i: number): string {
  const c = BRAID[i] ?? [0, 0, 0];
  const prev = BRAID[i - 1] ?? [BRAID_ROOT.x, BRAID_ROOT.y, 0];
  const next = BRAID[i + 1] ?? [BRAID_TIE[0], BRAID_TIE[1], 0];
  const dx = next[0] - prev[0];
  const dy = next[1] - prev[1];
  const len = Math.hypot(dx, dy) || 1;
  const u: Pt = [dx / len, dy / len];
  const n: Pt = [-u[1], u[0]];
  const half = 3.5;
  const lean = i % 2 ? 1 : -1;
  const a: Pt = [c[0] - u[0] * half + n[0] * lean, c[1] - u[1] * half + n[1] * lean];
  const b: Pt = [c[0] + u[0] * half - n[0] * lean, c[1] + u[1] * half - n[1] * lean];
  const w = c[2] * 1.25;
  const p1: Pt = [c[0] + n[0] * w, c[1] + n[1] * w];
  const p2: Pt = [c[0] - n[0] * w, c[1] - n[1] * w];
  return `M${P(a)}Q${P(p1)} ${P(b)}Q${P(p2)} ${P(a)}Z`;
}
const beads = BRAID.map((_, i) => bead(i));
/**
 * The tuft below the ribbon, the ribbon (red, as the scarf: two pointed loops, like the 3's) and its knot, drawn
 * round the tie.
 */
const tuft = 'M-1.6 0.6Q-3.4 4 -2.6 7Q-0.8 5 0 6.4Q0.8 4.8 2.4 6.6Q2.8 3.4 1.6 0.4Z';
const tuftStrands = 'M-0.8 2.2Q-1.4 4.2 -1.2 5.6M1.2 2.2Q1.8 4 1.6 5.4';
const bow = 'M0 0L-4.6 -3.8L-4.4 2.6Z' + 'M0 0L4.6 -3.2L4.4 3.2Z';
const bowShade = 'M0 0L4.5 0L4.4 3.2Z' + 'M0 0L-4.5 -0.6L-4.4 2.6Z';
const ribbonKnot =
  'M0 -1.5C0.9 -1.5 1.5 -0.8 1.5 0C1.5 0.8 0.9 1.5 0 1.5C-0.9 1.5 -1.5 0.8 -1.5 0C-1.5 -0.8 -0.9 -1.5 0 -1.5Z';
const braidGlints = 'M20.2 42.2Q22.2 41.2 24.2 41.8M13.4 51Q14 49.4 15.6 49M12.4 60.2Q12.6 58.4 13.6 57.8';

function braidMarkup(ink: boolean): string {
  const piece = (d: string, fill: string) => (ink ? inked(d, fill) : path(d, fill));
  const atTie = (inner: string) => `<g transform="translate(${P(BRAID_TIE)})">${inner}</g>`;
  return (
    atTie(piece(tuft, hair.base) + line(tuftStrands, hair.shade, 0.5)) +
    [...beads]
      .reverse()
      .map((d) =>
        ink
          ? inked(d, hair.base)
          : path(d, hair.shade) + path(d, hair.base, ' transform="translate(-0.5 -0.5)"'),
      )
      .join('') +
    line(braidGlints, hair.light, 0.8) +
    atTie(
      piece(bow, bandanaRed.base) + path(bowShade, bandanaRed.shade) + piece(ribbonKnot, bandanaRed.shade),
    )
  );
}

// The head's dressing, the same shapes in both looks --------------------------------------------------------

/**
 * The scarf (the twins' bandana, the mirror of her brother's): its lower edge along her brow, its sides on the
 * bowl's edge, and its top edge up over the crown to just under the counter, round the bun of hair there. The
 * invested look follows the head plank's corners instead of the bowl's curve (investedScarf).
 */
const SCARF_BROW = 'M21.6 37.6Q34 29.6 50 29.6Q66 29.6 78.4 37.6';
/** Round the bun, from the bowl's edge on the right to its edge on the left, under the counter. */
const BUN_EDGE = 'C61.4 17.8 57.6 24 50 24C42.4 24 38.6 17.8 39.7 10';
const headband = `${SCARF_BROW}A28.5 29.5 0 0 0 60.3 10${BUN_EDGE}A28.5 29.5 0 0 0 21.6 37.6Z`;
/** Its cream stripes: one across, under the bun, and one up each side of the dome. */
const headbandStripes =
  'M21.4 34.4Q34 26.6 50 26.8Q66 26.6 78.6 34.4M24.4 26.4Q29.6 18.4 37.4 14M75.6 26.4Q70.4 18.4 62.6 14';
const knot = 'M27.4 29.6Q24 27 20.6 29.4Q19 33 22 35.6Q25.8 36.6 27.6 33.2Z';
/** A loose wave of hair falling past the scarf at her right temple, clear of the eye's room. */
const wave = 'M69.2 34Q74 38.6 70.8 43.4Q68 47.6 71.6 52.6Q75 49 74 45Q76.6 40.2 72.8 34.2Z';
const waveShine = 'M71 36.6Q72.6 39 71.2 42';
const tailHigh = 'M22.6 30.4C19.4 25.6 14.6 23.6 9 24C11 25.4 11 27.2 9.4 28.6C13.8 28.2 17.4 29.6 20.4 33Z';
const tailLow =
  'M21 32.6C17.2 30.4 13.2 30.2 9.2 31.8C11 32.8 11.2 34.2 10 35.4C13.8 34.4 17 34.8 19.8 36.2Z';
/** Her hair framing her face below the scarf, a curl at each temple. */
const locks =
  'M22 36.6Q27.8 33.2 33 33.6Q30.2 38.6 31.2 44.6Q28.4 43.6 25.8 46.4Q22.6 42.4 22 36.6Z' +
  'M78 36.6Q72.2 33.2 67 33.6Q69.8 38.6 68.8 44.6Q71.6 43.6 74.2 46.4Q77.4 42.4 78 36.6Z';

// House look: the balloon 9 --------------------------------------------------------------------------------

/** The bowl, her head (an ellipse), and the tail, her body: its outer edge, the curl, its inner edge. */
const BOWL = { cx: 50, cy: 37.5, rx: 28.5, ry: 29.5 } as const;
const onBowl = (y: number, side: -1 | 1): Pt => [
  BOWL.cx + side * BOWL.rx * Math.sqrt(Math.max(0, 1 - ((y - BOWL.cy) / BOWL.ry) ** 2)),
  y,
];
const JOIN = onBowl(65.9, 1);
const OUT: Cubic = [
  [78.5, 37.5],
  [78.5, 64],
  [71, 89.6],
  [46, 93.6],
];
const IN: Cubic = [[40.4, 82], [50, 79], [55.6, 74], JOIN];
const houseNine =
  `M${P(OUT[0])}C${P(OUT[1])} ${P(OUT[2])} ${P(OUT[3])}` +
  `Q37 95 35 89.4Q34 83.8 ${P(IN[0])}C${P(IN[1])} ${P(IN[2])} ${P(IN[3])}` +
  `A${BOWL.rx} ${BOWL.ry} 0 1 1 ${P(OUT[0])}Z`;

/** The crown of hair: the bowl above the headband (its lower edge is under the headband). */
const CROWN_Y = 33;
const crownL = onBowl(CROWN_Y, -1);
const crownR = onBowl(CROWN_Y, 1);
const houseCrown = `M${P(crownL)}A${BOWL.rx} ${BOWL.ry} 0 0 1 ${P(crownR)}Q50 25 ${P(crownL)}Z`;

/** The coat: from under her head down the tail to its hem, where the curl's wood shows. */
const COAT_TOP = 0.24;
const HEM_OUT = 0.8;
const HEM_IN = 0.34;
const coatTop = bez(OUT, COAT_TOP);
const hemOut = bez(OUT, HEM_OUT);
const hemIn = bez(IN, HEM_IN);
const coatNeck = onBowl(coatTop[1], 1);
const houseCoat =
  `M${P(coatTop)}${subCubic(OUT, COAT_TOP, HEM_OUT)}` +
  `Q${f((hemOut[0] + hemIn[0]) / 2 - 1.6)} ${f((hemOut[1] + hemIn[1]) / 2 + 3)} ${P(hemIn)}` +
  `${subCubic(IN, HEM_IN, 1)}` +
  `A${BOWL.rx} ${BOWL.ry} 0 0 0 ${P(coatNeck)}Z`;
/** A point of the bowl's edge pushed out by `d`: the collar's outer edge. */
const outOfBowl = ([x, y]: Pt, d: number): Pt => [
  BOWL.cx + (x - BOWL.cx) * ((BOWL.rx + d) / BOWL.rx),
  BOWL.cy + (y - BOWL.cy) * ((BOWL.ry + d) / BOWL.ry),
];
/** Her blouse's collar, round her neck where the coat meets her head. */
const COLLAR = 2.8;
const houseCollar =
  `M${P(coatNeck)}A${BOWL.rx} ${BOWL.ry} 0 0 1 ${P(JOIN)}` +
  `L${P(outOfBowl(JOIN, COLLAR))}` +
  `A${f(BOWL.rx + COLLAR)} ${f(BOWL.ry + COLLAR)} 0 0 0 ${P(outOfBowl(coatNeck, COLLAR))}Z`;

const compassHouse =
  line(`M58.2 64.8Q${f(COMPASS.x - 1)} 67 ${f(COMPASS.x)} ${f(COMPASS.y - COMPASS.r - 1)}`, leather.base, 1) +
  line(`M70.6 60.6Q${f(COMPASS.x + 3)} 64 ${f(COMPASS.x)} ${f(COMPASS.y - COMPASS.r - 1)}`, leather.base, 1) +
  circle(COMPASS.x + 0.6, COMPASS.y + 0.6, COMPASS.r, brass.shade) +
  circle(COMPASS.x, COMPASS.y, COMPASS.r, brass.base) +
  circle(COMPASS.x, COMPASS.y, COMPASS.r - 1.5, dial.base) +
  circle(COMPASS.x, COMPASS.y - COMPASS.r - 0.4, 1.2, brass.base) +
  dialMarks();

const navHouse: AvatarDef = {
  id: pirateId(9, 'house'),
  kind: 'symbol',
  name: pirateName(ROLE, 'house'),
  tile,
  layers: {
    back:
      // the 9: her head (the bowl) and her body (the tail)
      shaded(houseNine, wood.base, wood.shade) +
      ellipse(27.6, 50, 1.8, 5, wood.light, 14) +
      ellipse(38.4, 88.6, 1.4, 3, wood.light, 60) +
      // her crown of hair (the scarf leaves only the bun round the counter), a sheen on the bun's left
      path(houseCrown, hair.base) +
      line('M41.4 15Q42.4 12 45.4 10.8', hair.light, 1.2) +
      houseCounter(50, 16.6, 6.2, 4.6, tile, hair.shade) +
      // the coat, its shade on the right
      path(houseCoat, coat.shade) +
      path(houseCoat, coat.base, ' transform="translate(-1 -0.8)"') +
      path(houseCollar, cream.shade) +
      path(houseCollar, cream.base, ' transform="translate(-0.4 -0.5)"') +
      compassHouse +
      // her hair at the temples, and the loose wave on the right
      path(locks, hair.base) +
      path(wave, hair.base) +
      line(waveShine, hair.light, 0.8),
    front:
      // the twins' pirate scarf: red with cream stripes, knotted at the back on the left
      path(headband, bandanaRed.shade) +
      path(headband, bandanaRed.base, ' transform="translate(-0.5 -0.7)"') +
      line(headbandStripes, cream.base, 1.5) +
      path(knot, bandanaRed.shade) +
      path(knot, bandanaRed.base, ' transform="translate(-0.4 -0.5)"'),
  },
  face: NAV_FACE,
  pivot: PIVOT,
  headBox: HEAD_BOX,
  base: 94,
  squash: true,
  motionBias: MOTION_BIAS,
  gimmicks: [
    {
      id: 'tails',
      z: 'behind',
      markup: path(tailLow, bandanaRed.shade) + path(tailHigh, bandanaRed.base),
      anim: tailsAnims,
    },
    { id: 'braid', z: 'behind', markup: braidMarkup(false), anim: braidAnims },
    { id: 'needle', markup: needle(), anim: needleAnims },
    glint(GLINT_AT, { size: 2.8 }),
  ],
};

// Invested look: the 9 in planks -----------------------------------------------------------------------------

/** A regular polygon with `n` sides, a flat edge at the top: its apothem `a`, clockwise. */
const flatPolygon = (cx: number, cy: number, a: number, n: number): Pt[] => {
  const r = a / Math.cos(Math.PI / n);
  return Array.from({ length: n }, (_, i): Pt => {
    const rad = ((-90 + 180 / n + (360 * i) / n) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  });
};
/** The head: one twelve-sided plank, as round as planks get. */
const head = flatPolygon(50, 37.5, 29, 12);
/** The counter through the crown: a small eight-sided hole. */
const counter = flatPolygon(50, 16.8, 4.8, 8).map(([x, y]): Pt => [50 + (x - 50) * 1.25, y]);
/**
 * The tail, two planks along the house curve: an upright stem from under her head, its foot cut on the slant,
 * over the kick that turns down to the left (the 9's curl).
 */
const stem: Pts = [
  [55, 50],
  [78.5, 50],
  [74.6, 80.4],
  [51, 86.4],
];
const kick: Pts = [
  [53, 77],
  [74.4, 80.4],
  [53, 94.4],
  [31.6, 94.4],
];
/** The coat on the stem and the top of the kick, its hem across the kick (the kick's end is wood). */
const investedCoat = 'M53.7 59L79 51L75.1 80.2L62.4 88.6Q51.6 89.6 41.6 86.2L51.8 77.8Z';
/** The collar, drawn behind the head: only its band outside the head's lower edges shows. */
const investedCollar = 'M53.6 63H57.6L70 56L74.6 50.6L77.4 53.4L73.4 61.4L58.6 69.6H53.4Z';

/** The counter: the ink edge, the tile through it, and the plank's thickness on its upper walls. */
function counterHole(): string {
  const w = inset(counter, 1.6);
  const at = (pts: Pts, i: number): Pt => pts[i] ?? [0, 0];
  const lip = poly([6, 7, 0, 1, 2].map((i) => at(counter, i)).concat([2, 1, 0, 7, 6].map((i) => at(w, i))));
  return inked(poly(counter), tile) + path(lip, wood.shade);
}

/** The invested crown: the head plank's top, to under the scarf's brow. */
const investedCrown = (() => {
  // the corners above the headband, left to right (the polygon starts at the top edge's right end)
  const top = [9, 10, 11, 0, 1, 2].map((i): Pt => head[i] ?? [50, 8.5]);
  return `M21 ${CROWN_Y}L${top.map(P).join('L')}L79 ${CROWN_Y}Q50 25 21 ${CROWN_Y}Z`;
})();

/** The invested scarf: the same brow and bun, its sides on the head plank's corners. */
const investedScarf = (() => {
  const at = (i: number): Pt => head[i] ?? [50, 37.5];
  const cut = (a: Pt, b: Pt, x: number): Pt => [x, a[1] + ((x - a[0]) * (b[1] - a[1])) / (b[0] - a[0])];
  // where the bun meets the plank's upper edges, the same x as in the house look
  const right = cut(at(0), at(1), 60.3);
  const left = cut(at(11), at(10), 39.7);
  return (
    `M21 37.6Q34 29.6 50 29.6Q66 29.6 79 37.6L${P(at(2))}L${P(at(1))}L${P(right)}` +
    `C61.4 17.8 57.6 24 50 24C42.4 24 38.6 17.8 ${P(left)}L${P(at(10))}L${P(at(9))}Z`
  );
})();

const compassInvested =
  inkedLine(
    `M58.2 64.8Q${f(COMPASS.x - 1)} 67 ${f(COMPASS.x)} ${f(COMPASS.y - COMPASS.r - 1)}`,
    leather.base,
    1,
    2.4,
  ) +
  inkedLine(
    `M70.6 60.6Q${f(COMPASS.x + 3)} 64 ${f(COMPASS.x)} ${f(COMPASS.y - COMPASS.r - 1)}`,
    leather.base,
    1,
    2.4,
  ) +
  inkedRing(COMPASS.x, COMPASS.y - COMPASS.r - 0.4, 1.1, brass.base, 1) +
  inked(
    `M${f(COMPASS.x - COMPASS.r)} ${f(COMPASS.y)}A${COMPASS.r} ${COMPASS.r} 0 1 1 ${f(COMPASS.x + COMPASS.r)} ${f(COMPASS.y)}` +
      `A${COMPASS.r} ${COMPASS.r} 0 1 1 ${f(COMPASS.x - COMPASS.r)} ${f(COMPASS.y)}Z`,
    brass.base,
  ) +
  path(
    `M${f(COMPASS.x + COMPASS.r)} ${f(COMPASS.y)}A${COMPASS.r} ${COMPASS.r} 0 0 1 ${f(COMPASS.x - COMPASS.r)} ${f(COMPASS.y)}Z`,
    brass.shade,
  ) +
  circle(COMPASS.x, COMPASS.y, COMPASS.r - 1.4, brass.shade) +
  circle(COMPASS.x, COMPASS.y, COMPASS.r - 1.8, dial.base) +
  dialMarks();

const navInvested: AvatarDef = {
  id: pirateId(9, 'invested'),
  kind: 'symbol',
  name: pirateName(ROLE, 'invested'),
  tile,
  layers: {
    back:
      // the kick (the 9's curl) and the stem over it; the kick's end, under the hem, is nailed
      woodSlab(kick, 2.2) +
      grain([
        [37.6, 91.2],
        [44, 90.4],
        [51, 91.4],
      ]) +
      nail(36.4, 92) +
      nail(50.4, 92.2) +
      woodSlab(stem) +
      // the coat: light down its front edge, shade down its back and along the hem, which shades the wood
      inked(investedCoat, coat.base) +
      path('M79 51L75.1 80.2L62.4 88.6L60.6 86.4L72.2 78.6L75.6 52Z', coat.shade) +
      path('M53.7 59L51.8 77.8L54.4 77.4L56.2 58.4Z', coat.light) +
      path('M62.4 88.6Q51.6 89.6 41.6 86.2L43.4 84.6Q52 87.4 61 86.4Z', coat.shade) +
      path('M42.6 86.9Q51.6 90.4 60 89.4L58 90.8Q51.4 91.6 44.4 89Z', woodMid) +
      // her blouse's collar, standing up behind her head
      inked(investedCollar, cream.base) +
      path('M53.4 68.2H58.4L72.4 60.6L76.8 54.6L77.4 53.4L73.4 61.4L58.6 69.6H53.4Z', cream.shade) +
      compassInvested +
      // her head, the crown of hair with the counter through it, the headband's shadow on her brow
      woodSlab(head) +
      grain([
        [26, 46],
        [25.4, 52],
        [26.8, 57],
      ]) +
      grain([
        [74, 46],
        [74.8, 52],
        [73.4, 57],
      ]) +
      inked(investedCrown, hair.base) +
      line('M27.4 25.6Q30.6 17.2 38 13', hair.light, 1.1) +
      counterHole() +
      path(
        'M23 36.4Q34.4 29.2 50 29.2Q65.6 29.2 77 36.4L77.2 39.4Q65.4 32.6 50 32.6Q34.6 32.6 22.8 39.4Z',
        woodMid,
      ) +
      inked(locks, hair.base) +
      inked(wave, hair.base) +
      line(waveShine, hair.light, 0.8),
    front:
      inked(investedScarf, bandanaRed.base) +
      path('M50 29.6Q66 29.6 79 37.6L78.8 35.2Q66 27.6 50 27.6Z', bandanaRed.shade) +
      path('M79 37.6L79 29.73L76.6 25.6Q78 31 77 36.4Z', bandanaRed.shade) +
      line(headbandStripes, cream.base, 1.5) +
      inked(knot, bandanaRed.base) +
      path('M27.6 33.2Q25.8 36.6 22 35.6Q25.2 35.2 27.4 31.2Z', bandanaRed.shade),
  },
  face: withIris(NAV_FACE, HAIR.chestnut.light),
  pivot: PIVOT,
  headBox: HEAD_BOX,
  base: 94.4,
  squash: true,
  motionBias: MOTION_BIAS,
  gimmicks: [
    {
      id: 'tails',
      z: 'behind',
      markup: inked(tailLow, bandanaRed.shade) + inked(tailHigh, bandanaRed.base),
      anim: tailsAnims,
    },
    { id: 'braid', z: 'behind', markup: braidMarkup(true), anim: braidAnims },
    { id: 'needle', markup: needle(), anim: needleAnims },
    glint(GLINT_AT, { size: 2.8 }),
  ],
};

/** The Navigator, both looks. */
export const NAVIGATOR: PirateCharacter = {
  digit: 9,
  looks: { house: navHouse, invested: navInvested },
};
