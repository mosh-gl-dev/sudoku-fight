/**
 * 5, the Parrot Keeper: the youngest of the crew (Moshe: "3, 4 and 5 are kids"). Read docs/avatars/PIRATES.md
 * first; the series' toolbox is shared.ts, and one.ts (the Captain) and seven.ts (Peg) are the references.
 *
 * The digit is the body: the 5's bar is a perch, and the kid's red macaw sits on its end, its long tail hanging
 * down beside the stem; the stem runs down the kid's left side; the bowl is a round belly, the face high on it,
 * in denim overalls with a paper boat in the hip pocket; the tail of the 5 curls out at the lower left, and the
 * notch above it stays open. A baby curl on top.
 *
 * Gimmicks: the parrot bobs (idle), dances and flaps (laugh), hops with its wings up (surprised), tilts its head
 * (confused), puffs up (angry), droops with the kid (sad), nods off (sleepy) and flaps for balance while the
 * kid moves; the paper boat rocks (idle), bobs (smile, laugh), pops up out of the pocket (surprised) and lists
 * (sad). Round-bottomed, the kid rocks like a roly-poly toy (wobble, its favourite) and bounces. No guns, no
 * blades.
 *
 * In a locked board cell (22 px) the app crops to `headBox`: the face and the top of the belly under the perch,
 * which reads as a cap's brim there. The crop leaves out the stem's corner and the bar's left end (with the
 * parrot), and the bowl's lower half: a bar, a stem and a bowl are what make a placed 5.
 */

import { CLOTH, FACE, HAIR, OBJECT } from '../../palette';
import { f } from '../../svg';
import type { AvatarDef, GimmickAnim, GimmickKeyframe } from '../../types';
import { circle, ellipse, line, path, type Pt, shaded } from '../draw';
import {
  BROWS,
  brass,
  chamfer,
  cream,
  grain,
  INK,
  inked,
  inkedLine,
  nail,
  PIRATE_TILES,
  type PirateCharacter,
  pirateId,
  pirateName,
  poly,
  type Pts,
  steel,
  withIris,
  wood,
  woodDeep,
  woodMid,
  woodSlab,
} from './shared';

const ROLE = { he: 'שומר התוכי', en: 'The Parrot Keeper' } as const;
const tile = PIRATE_TILES[5];
const hair = HAIR.espresso;
const denim = CLOTH.denim;
/** The macaw: red, a blue wing with a gold band, a gold beak (PIRATES.md §2). */
const macaw = OBJECT.red;
const wingBlue = OBJECT.blue;
const beak = OBJECT.gold;
/** The paper of the toy boat. */
const paper = cream;

/**
 * A kid's face, high on the round belly, a little right of its middle (clear of the stem, for the head crop):
 * bigger eyes, cheeks (PIRATES.md §4), and the mouth's laugh box ending where the head crop does (y 68.5, 25
 * above the house foot). Dizzy stars circle just under the perch, above the brows.
 */
const KID_FACE: AvatarDef['face'] = {
  ink: FACE.ink,
  eyes: { left: { x: 46.1, y: 52 }, right: { x: 63.1, y: 52 }, r: 5.8, style: 'round' },
  brows: { ...BROWS, color: hair.base },
  mouth: { x: 54.6, y: 62.9, w: 12.4 },
  cheeks: { color: FACE.blush, dx: 0.55, dy: 1.45, size: 0.72 },
  halo: { x: 54.6, y: 35 },
};

/** The middle of the face; its x over the middle of the round bottom, which the wobble rocks on. */
const PIVOT = { x: 56.6, y: 57 } as const;
/**
 * The face and the top of the belly under the bar: the left eye's room (1.3 r) starts at x 38.56, right of the
 * stem (x 37), so the stem's corner, the bar's left end and the parrot stay out; it ends 25 above the house foot,
 * where the mouth's laugh box does.
 */
const HEAD_BOX = { x: 38.5, y: 12.5, size: 56 } as const;
const MOTION_BIAS = ['wobble', 'nod', 'bounce', 'squash'] as const;

// ---------------------------------------------------------------------------------------------------------
// Small helpers of this file

/** An ellipse as a path (for `inked`, which outlines a path). */
const ellipseD = (cx: number, cy: number, rx: number, ry: number): string =>
  `M${f(cx - rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(cy)}` +
  `A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)}Z`;

/** The part of a convex polygon below the horizontal line `y` (Sutherland-Hodgman, one edge). */
function below(pts: Pts, y: number): Pt[] {
  const out: Pt[] = [];
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length] ?? p;
    const pin = p[1] >= y;
    const qin = q[1] >= y;
    if (pin) out.push(p);
    if (pin !== qin) {
      const t = (y - p[1]) / (q[1] - p[1]);
      out.push([p[0] + (q[0] - p[0]) * t, y]);
    }
  });
  return out;
}

const round3 = (v: number) => Math.round(v * 1000) / 1000;

// ---------------------------------------------------------------------------------------------------------
// The moving parts, the same in both looks

/** The parrot grips the end of its perch (the 5's bar) here: it hops from its feet and turns around them. */
const FEET = { x: 27, y: 21.5 } as const;
/** Its wing's shoulder: the wing flaps around it. */
const SHOULDER = { x: 27.8, y: 12.8 } as const;

/** A keyframe of the parrot, and how far its wing is raised then (degrees: clockwise lifts it up and back). */
type ParrotKey = GimmickKeyframe & { flap?: number };
interface ParrotMove extends Omit<GimmickAnim, 'keyframes' | 'origin'> {
  keys: readonly ParrotKey[];
}

/** The parrot's own anim: the keyframes without the wing. */
const parrotAnim = ({ keys, ...rest }: ParrotMove): GimmickAnim => ({
  ...rest,
  origin: FEET,
  keyframes: keys.map(({ flap: _, ...k }) => k),
});

/**
 * The wing's anim for the same move: it rides on the parrot (the parrot's turn and puff around its feet carry
 * the shoulder along) and flaps around the shoulder on top of that, so the two never come apart.
 */
const wingAnim = ({ keys, ...rest }: ParrotMove): GimmickAnim => {
  const sx = SHOULDER.x - FEET.x;
  const sy = SHOULDER.y - FEET.y;
  return {
    ...rest,
    origin: SHOULDER,
    keyframes: keys.map(({ flap = 0, ...k }) => {
      const a = ((k.rotate ?? 0) * Math.PI) / 180;
      // the pose scales, then turns, then slides (motion.ts poseMatrix)
      const px = sx * (k.sx ?? 1);
      const py = sy * (k.sy ?? 1);
      const x = round3((k.x ?? 0) + px * Math.cos(a) - py * Math.sin(a) - sx);
      const y = round3((k.y ?? 0) + px * Math.sin(a) + py * Math.cos(a) - sy);
      const rotate = round3((k.rotate ?? 0) + flap);
      const { x: _x, y: _y, rotate: _r, ...out } = k;
      return { ...out, ...(x ? { x } : {}), ...(y ? { y } : {}), ...(rotate ? { rotate } : {}) };
    }),
  };
};

/**
 * What the parrot does: per gimmick the motion's anim plays first, then the face's, then idle. The series'
 * timing (PIRATES.md §10): the surprise peaks at t 0.3 and settles; the joy loops at 520 ms; idle is slow, at
 * most 6°.
 */
const PARROT_MOVES: readonly ParrotMove[] = [
  // the kid moves: the parrot holds on to its perch and flaps for balance
  {
    trigger: ['wobble', 'spin', 'flip', 'shake', 'bounce', 'squash'],
    durationMs: 520,
    loop: true,
    keys: [
      { t: 0 },
      { t: 0.25, rotate: -6, y: -0.6, flap: 70 },
      { t: 0.5, flap: 10 },
      { t: 0.75, rotate: 6, y: -0.6, flap: 70 },
      { t: 1 },
    ],
  },
  // surprised: it hops up with its wing up, and lands
  {
    trigger: ['surprised'],
    durationMs: 900,
    keys: [
      { t: 0, ease: 'emphasized' },
      { t: 0.3, y: -2.6, flap: 64, ease: 'standard' },
      { t: 0.58, flap: 25 },
      { t: 0.7, y: -0.7, flap: 30 },
      { t: 0.84, flap: 0 },
      { t: 1 },
    ],
  },
  // laugh: it dances, bobbing and flapping
  {
    trigger: ['laugh'],
    durationMs: 520,
    loop: true,
    keys: [
      { t: 0 },
      { t: 0.25, y: -2.4, rotate: 5, flap: 80 },
      { t: 0.5, flap: 8 },
      { t: 0.75, y: -1.2, rotate: -4, flap: 50 },
      { t: 1 },
    ],
  },
  // smile and wink: a happy little bob
  {
    trigger: ['smile', 'wink'],
    durationMs: 760,
    loop: true,
    keys: [{ t: 0 }, { t: 0.5, y: -1.2, rotate: 5 }, { t: 1 }],
  },
  // confused: a parrot's head tilt, held
  {
    trigger: ['confused'],
    durationMs: 800,
    keys: [
      { t: 0, ease: 'emphasized' },
      { t: 0.4, rotate: -14 },
      { t: 1, rotate: -11 },
    ],
  },
  // angry: it puffs up and ruffles its wing
  {
    trigger: ['angry'],
    durationMs: 700,
    keys: [
      { t: 0, ease: 'emphasized' },
      { t: 0.3, sx: 1.14, sy: 1.1, flap: 30 },
      { t: 0.5, sx: 1.08, sy: 1.06, flap: 12 },
      { t: 1, sx: 1.1, sy: 1.08, flap: 18 },
    ],
  },
  // dizzy: it reels on the perch
  {
    trigger: ['dizzy'],
    durationMs: 900,
    loop: true,
    keys: [{ t: 0 }, { t: 0.25, rotate: -10 }, { t: 0.75, rotate: 10 }, { t: 1 }],
  },
  // sad: it droops with the kid, and stays so
  {
    trigger: ['sad'],
    durationMs: 900,
    keys: [
      { t: 0, ease: 'standard' },
      { t: 1, rotate: 12, y: 0.5, flap: -8 },
    ],
  },
  // sleepy: it nods off
  {
    trigger: ['sleepy'],
    durationMs: 2800,
    loop: true,
    keys: [
      { t: 0, rotate: 7 },
      { t: 0.5, rotate: 14, y: 0.4 },
      { t: 1, rotate: 7 },
    ],
  },
  // idle: a slow bob, barely there
  {
    trigger: ['idle'],
    durationMs: 2600,
    loop: true,
    keys: [{ t: 0 }, { t: 0.5, y: -0.9, rotate: 3 }, { t: 1 }],
  },
];
const parrotAnims = PARROT_MOVES.map(parrotAnim);
const wingAnims = PARROT_MOVES.map(wingAnim);

/** The paper boat sits in the hip pocket and rocks on its keel, here. */
const KEEL = { x: 70, y: 79.2 } as const;
const boatAnims: readonly GimmickAnim[] = [
  {
    trigger: ['wobble', 'spin', 'flip', 'shake'],
    durationMs: 520,
    loop: true,
    keyframes: [{ t: 0 }, { t: 0.25, rotate: -10 }, { t: 0.75, rotate: 10 }, { t: 1 }],
    origin: KEEL,
  },
  {
    trigger: ['surprised'],
    durationMs: 900,
    keyframes: [
      { t: 0, ease: 'emphasized' },
      { t: 0.3, y: -5, rotate: -8 },
      { t: 0.62, y: -2.4, rotate: 3 },
      { t: 1, y: -2.4 },
    ],
    origin: KEEL,
  },
  {
    trigger: ['laugh', 'smile', 'wink'],
    durationMs: 760,
    loop: true,
    keyframes: [
      { t: 0 },
      { t: 0.25, y: -1.6, rotate: -7 },
      { t: 0.5 },
      { t: 0.75, y: -1.6, rotate: 7 },
      { t: 1 },
    ],
    origin: KEEL,
  },
  {
    trigger: ['sad'],
    durationMs: 1000,
    keyframes: [
      { t: 0, ease: 'standard' },
      { t: 1, y: 1.4, rotate: 12 },
    ],
    origin: KEEL,
  },
  {
    trigger: ['idle'],
    durationMs: 2600,
    loop: true,
    keyframes: [{ t: 0 }, { t: 0.25, rotate: -5 }, { t: 0.75, rotate: 5 }, { t: 1 }],
    origin: KEEL,
  },
];

// The parrot at rest: on the end of the perch, facing along it toward the kid, its tail down beside the stem.
const tailBlue = 'M21.4 18.4L12.4 33.8Q11.2 35.6 10.4 33.6L18.8 17.2Z';
const tailRed = 'M23.4 19.4L15.8 38.6Q14.6 40.8 13.2 39L19.6 18.4Z';
/** The red feather's blue tip, as a macaw's. */
const tailTip = 'M15.8 38.6Q14.6 40.8 13.2 39L14.6 35.6L16.8 36.2Z';
const BODY = { x: 26.2, y: 16.2, rx: 5.2, ry: 6.6, rot: 32 } as const;
const HEAD = { x: 30.8, y: 10.9, r: 4.4 } as const;
const beakTop = 'M34 8.1C37.8 7.2 40.8 10.4 39 14.6C38.4 13.2 37.4 12.6 35.2 13Z';
const beakLow = 'M35.2 13C36.8 12.8 37.8 13.6 37.6 14.8C36.6 15.4 35.6 14.8 35 13.8Z';
const facePatch =
  'M31.2 9.2C33 7.6 35.8 8.6 35.6 11.6C35.4 13.8 33.2 14.6 31.6 13.6C30.6 12.6 30.4 10.4 31.2 9.2Z';
const wingShape = 'M29.6 12.6C31.6 16.6 29.8 21.8 19.2 24.2C20 19.6 22.4 14.8 26 12.6Z';
const wingBand =
  'M29.6 12.6C30.3 14.2 30.4 15.6 30 17C27.6 16.8 25.2 16.2 23.8 15.4C24.4 14.2 25.2 13.2 26 12.6Z';
const bodyRot = ` transform="rotate(${BODY.rot} ${BODY.x} ${BODY.y})"`;
const toes = line('M24.2 21.2Q24.6 23.4 26.4 23.2M27.6 21.2Q28 23.4 29.8 23.2', steel.shade, 1.3);

function parrotArt(invested: boolean): string {
  const body = ellipseD(BODY.x, BODY.y, BODY.rx, BODY.ry);
  const head = ellipseD(HEAD.x, HEAD.y, HEAD.r, HEAD.r);
  if (!invested)
    return (
      path(tailBlue, wingBlue.base) +
      path(tailRed, macaw.shade) +
      path(tailTip, wingBlue.base) +
      toes +
      `<g${bodyRot}>${shaded(body, macaw.base, macaw.shade, -0.8, -0.7)}</g>` +
      shaded(head, macaw.base, macaw.shade, -0.7, -0.7) +
      path(facePatch, OBJECT.white.base) +
      circle(33.2, 10.6, 1, HAIR.black.base) +
      circle(32.9, 10.3, 0.32, OBJECT.white.base) +
      path(beakTop, beak.base) +
      path(beakLow, HAIR.black.light)
    );
  return (
    inked(tailBlue, wingBlue.base) +
    line('M18.8 19.6L11.8 32.4', wingBlue.shade, 0.6) +
    inked(tailRed, macaw.base) +
    line('M21.2 20.4L14.8 37.2', macaw.shade, 0.7) +
    path(tailTip, wingBlue.base) +
    toes +
    inked(body, macaw.base, bodyRot) +
    path('M32 15.4C31.6 19.8 28.8 22.6 24.4 22.8C27.8 21 30 18.6 30.4 15Z', macaw.shade) +
    inked(head, macaw.base) +
    line('M27.4 9.4Q28.6 7.4 31 7', macaw.light, 0.9) +
    path(facePatch, OBJECT.white.base) +
    line('M31.8 12.4L33.8 13.2M31.6 10.8L32.4 11', OBJECT.white.shade, 0.35) +
    circle(33.2, 10.6, 1.05, INK) +
    circle(32.9, 10.3, 0.35, OBJECT.white.base) +
    inked(beakTop, beak.base) +
    path('M39 14.6C39.6 12.2 38.6 9.4 35.6 8.2C38.4 8 41 10.6 39 14.6Z', beak.shade) +
    line('M35.2 9.2Q36.8 9 37.8 10.2', beak.light, 0.6) +
    inked(beakLow, HAIR.black.light)
  );
}

function wingArt(invested: boolean): string {
  if (!invested)
    return (
      path(wingShape, wingBlue.shade) +
      path(wingShape, wingBlue.base, ' transform="translate(-0.5 -0.5)"') +
      path(wingBand, beak.base)
    );
  return (
    inked(wingShape, wingBlue.base) +
    path('M30.8 15.6C30.4 19.2 27.2 22.2 19.2 24.2C24.2 21.8 28.2 19 29.4 15.8Z', wingBlue.shade) +
    path(wingBand, beak.base) +
    line('M29.8 16.8C28 16.7 25.6 16.1 24.2 15.3', beak.shade, 0.5) +
    line('M28.4 18.4L22.6 22.6M29.4 17.2L24.6 20.4', wingBlue.light, 0.55)
  );
}

// The paper boat, a folded hat of a boat, in the hip pocket
const boatHull = 'M63.4 74.8H76.6L74 79.6H66Z';
const boatPeak = 'M66.4 74.8L70 68L73.6 74.8Z';

function boatArt(invested: boolean): string {
  if (!invested)
    return (
      path(boatPeak, paper.shade) +
      path('M66.4 74.8L70 68L70 74.8Z', paper.base) +
      path(boatHull, paper.base) +
      path('M70 74.8H76.6L74 79.6H70Z', paper.shade)
    );
  return (
    inked(boatPeak, paper.base) +
    path('M70 68L73.6 74.8H70Z', paper.shade) +
    inked(boatHull, paper.base) +
    path('M70 74.8H76.6L74 79.6H70Z', paper.shade) +
    line('M64.8 76H75.2', paper.light, 0.5)
  );
}

// The kid's treasures: a red feather of its parrot tucked under the right strap, a five-point star patch.
const feather = 'M73.4 67.8C73.6 62.4 76.2 57.6 79.6 55.2C80.4 59.4 78.6 64.4 74.8 67.6Z';
const featherTip = 'M77 58C77.8 56.8 78.6 55.9 79.6 55.2C79.9 56.8 79.8 58.4 79.3 59.9Z';
const featherQuill = 'M74 67.2Q75.6 61 79.2 56';
/** A five-point star around (x, y), its points `r` out, the dents `k` of that. */
const starPts = (x: number, y: number, r: number, k = 0.45, turn = -90): Pt[] =>
  Array.from({ length: 10 }, (_, i) => {
    const a = ((turn + i * 36) * Math.PI) / 180;
    const d = i % 2 ? r * k : r;
    return [round3(x + d * Math.cos(a)), round3(y + d * Math.sin(a))] as Pt;
  });
const starPatch = poly(starPts(43.6, 83, 4.4, 0.47, -96));
const starStitch = poly(starPts(43.6, 83, 3.1, 0.47, -96));

// ---------------------------------------------------------------------------------------------------------
// House look

/** The house 5 in one balloon shape: the bar (perch), the stem, the round bowl, the open notch, the tail. */
const houseFive =
  'M25.5 21H73.5Q79.5 21 79.5 27Q79.5 33 73.5 33H40Q37 33 37 36V36.5Q37 38.5 39.5 38.5H60' +
  'C73.5 38.5 82.5 49 82.5 64C82.5 81 70.5 93.5 56 93.5C46.5 93.5 38.5 90.5 32.8 85.4L20.4 78.8' +
  'Q15 74.8 18.6 70.6Q20.8 68.8 24 70.4L31.4 73.4Q34.5 74.6 34.5 71.2V66.2Q34.5 63.2 31.5 63.2H25.5' +
  'Q19.5 63.2 19.5 57.2V27Q19.5 21 25.5 21Z';
/** The overalls on the house belly: below the waist, inside the bowl. */
const houseOveralls = 'M34.5 72H81.7C80.4 84.6 69.6 93.5 56 93.5C46.5 93.5 38.5 90.5 34.5 86.6Z';
const straps = 'M41 72.4Q38.6 67 35.2 63.6M65 72.4Q71.4 66.8 79.6 62.4';
const pocket = 'M62.6 77.4H75.8V83.4Q75.8 86.2 73 86.2H65.4Q62.6 86.2 62.6 83.4Z';
/** The baby curl on top of the head (over the face's middle). */
const curl = 'M53.2 38.8C52.8 36.8 54.2 35.4 56 35.8C57.4 36.2 57.4 37.8 56.2 38';

const keeperHouse: AvatarDef = {
  id: pirateId(5, 'house'),
  kind: 'symbol',
  name: pirateName(ROLE, 'house'),
  tile,
  layers: {
    back:
      shaded(houseFive, wood.base, wood.shade) +
      ellipse(50, 24.4, 9, 1.3, wood.light) +
      ellipse(23.2, 46, 1.6, 6.5, wood.light) +
      ellipse(19.8, 73.4, 1.1, 2.2, wood.light, 50) +
      // the overalls: denim below the waist, a shade on the lower right, straps up over the shoulders
      path(houseOveralls, denim.shade) +
      path('M34.5 72H80.4C78.6 83 68.6 91.6 56 91.6C47 91.6 39.6 88.8 34.5 85.2Z', denim.base) +
      path('M34.5 72H81.7V74.4H34.5Z', denim.shade) +
      path(feather, macaw.base) +
      path(featherTip, wingBlue.base) +
      line(straps, denim.base, 3) +
      path(starPatch, CLOTH.mustard.shade) +
      path(starPatch, CLOTH.mustard.base, ' transform="translate(-0.4 -0.4)"') +
      circle(41, 73.2, 1.4, brass.base) +
      circle(65, 73.2, 1.4, brass.base) +
      line(curl, hair.base, 1.7),
    front: path(pocket, denim.shade) + path('M62.6 77.4H75.8V78.8H62.6Z', denim.light),
  },
  face: KID_FACE,
  pivot: PIVOT,
  headBox: HEAD_BOX,
  base: 93.5,
  squash: true,
  motionBias: MOTION_BIAS,
  gimmicks: [
    { id: 'boat', z: 'back', markup: boatArt(false), anim: boatAnims },
    { id: 'parrot', markup: parrotArt(false), anim: parrotAnims },
    { id: 'wing', markup: wingArt(false), anim: wingAnims },
  ],
};

// ---------------------------------------------------------------------------------------------------------
// Invested look

/** The planks: the stem down the kid's left side, the bar (perch) nailed over it, the tail, the belly. */
const stem = chamfer(19.5, 21, 37, 63.2, 3);
const bar = chamfer(19.5, 21, 79.5, 33, 3.2);
/** The tail of the 5: a plank slanting up to the lower left, its foot under the belly. */
const tail: Pts = [
  [16, 69.6],
  [36.5, 77.2],
  [41, 92],
  [18.4, 81.8],
];
/** The round belly: a D of facets, flat on the stem side, over the stem and the tail. */
const belly: Pts = [
  [39, 38.5],
  [62, 38.5],
  [71, 41],
  [78, 47.5],
  [81.8, 56.5],
  [82.5, 66],
  [81, 76],
  [76.5, 85],
  [69, 91.5],
  [60, 94.5],
  [45, 94.5],
  [37.5, 92],
  [33.5, 87],
  [33.5, 46],
  [35.2, 41.4],
];
const WAIST = 72;
const overalls = below(belly, WAIST);

const keeperInvested: AvatarDef = {
  id: pirateId(5, 'invested'),
  kind: 'symbol',
  name: pirateName(ROLE, 'invested'),
  tile,
  layers: {
    back:
      woodSlab(stem, 2.2) +
      grain([
        [23, 60],
        [23.8, 50],
        [23, 40],
      ]) +
      grain([
        [29.6, 61],
        [30.2, 52],
        [29.4, 42],
      ]) +
      woodSlab(tail, 2.2) +
      grain([
        [19.6, 74.8],
        [25, 77.4],
        [31.6, 79.6],
      ]) +
      woodSlab(bar) +
      grain([
        [36, 25.6],
        [50, 24.8],
        [64, 25.8],
        [76, 25.2],
      ]) +
      grain([
        [40, 29.4],
        [56, 30],
        [72, 29.2],
      ]) +
      ellipse(60.6, 27.6, 2, 0.8, woodDeep) +
      // the parrot's shadow on its perch
      ellipse(27.4, 23.8, 5.6, 1.1, woodMid) +
      nail(23.6, 29.4) +
      nail(32.8, 29.4) +
      woodSlab(belly) +
      grain([
        [77.4, 50],
        [79, 58],
        [78.8, 66],
      ]) +
      ellipse(76.6, 60, 0.8, 2, woodDeep) +
      // the overalls: denim, a shade on the lower right, straps, brass buttons
      inked(poly(overalls), denim.base) +
      path('M81 76L76.5 85L69 91.5L60 94.5H54C66 92 76 85 80.4 74Z', denim.shade) +
      path(`M33.5 ${WAIST}H81.6L81.4 74.2H33.5Z`, denim.shade) +
      line('M36 76V86', denim.light, 0.9) +
      inked(feather, macaw.base) +
      path(featherTip, wingBlue.base) +
      line(featherQuill, macaw.shade, 0.5) +
      inkedLine(straps, denim.base, 3, 4.6) +
      inked(starPatch, CLOTH.mustard.base) +
      path(poly(starPts(43.6, 83, 4.4, 0.47, -96).slice(3, 8)), CLOTH.mustard.shade) +
      line(starStitch, CLOTH.mustard.light, 0.4) +
      line('M40 70.6Q38.6 67.6 36.4 65.2', denim.light, 0.6) +
      line('M38 73.4H44M62 73.4H68', denim.shade, 0.5) +
      inked(ellipseD(41, 73.4, 1.5, 1.5), brass.base) +
      inked(ellipseD(65, 73.4, 1.5, 1.5), brass.base) +
      circle(40.5, 72.9, 0.5, brass.light) +
      circle(64.5, 72.9, 0.5, brass.light) +
      inkedLine(curl, hair.base, 1.7, 3.1),
    front:
      inked(pocket, denim.base) +
      path('M62.6 83.4V84H75.8V83.4Q75.8 86.2 73 86.2H65.4Q62.6 86.2 62.6 83.4Z', denim.shade) +
      line('M64 79.2H74.4', denim.light, 0.5) +
      line('M63.8 78.4V83.4Q63.8 85 65.4 85H73Q74.6 85 74.6 83.4V78.4', denim.shade, 0.4),
  },
  face: withIris(KID_FACE, OBJECT.green.base),
  pivot: PIVOT,
  headBox: HEAD_BOX,
  base: 94.5,
  squash: true,
  motionBias: MOTION_BIAS,
  gimmicks: [
    { id: 'boat', z: 'back', markup: boatArt(true), anim: boatAnims },
    { id: 'parrot', markup: parrotArt(true), anim: parrotAnims },
    { id: 'wing', markup: wingArt(true), anim: wingAnims },
  ],
};

/** The Parrot Keeper, both looks. */
export const PARROT_KEEPER: PirateCharacter = {
  digit: 5,
  looks: { house: keeperHouse, invested: keeperInvested },
};
