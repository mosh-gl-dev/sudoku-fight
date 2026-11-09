/**
 * 8, Grandpa Cook (Moshe: "8 is an old man"): the ship's cook, the oldest and kindest of the crew. Read
 * docs/avatars/PIRATES.md first; the series' toolbox is shared.ts, the references are one.ts and seven.ts.
 *
 * The digit is the body: the top bowl is his round head, its counter tucked under a short puffy cook's toque (it
 * reads as the gap under the cap, never as a mark on his forehead); the bottom bowl is his round belly, its counter open in the middle, a white apron tied under it
 * and two little boots peeking out below. A white beard frames his face and hangs over the waist, a white
 * moustache sits over his mouth (never in its room), bushy white brows, rosy cheeks. At his left side (the
 * viewer's right) stands his soup pot, steaming; his arm comes out from behind his belly to stir it.
 *
 * Gimmicks: the soup steams (three puffs a third apart when idle, smiling or laughing, twice as fast when he
 * fumes); he stirs the ladle (slowly when idle, briskly when he laughs or is dizzy), jerks it when surprised and
 * lets it lean when he dozes off; his toque puffs up like a soufflé when surprised, falls like one when he is sad,
 * droops when sleepy and flops when he laughs or rocks; his beard jiggles when he laughs. Motion: a slow, kind
 * nod first. No pipe, no bottle, no blades.
 *
 * The invested look builds the head as an octagon of planks round its counter (the tile between them, under the
 * toque) and the belly as one octagonal slab with its counter cut through it, as the 6's bowl: few joints, so
 * both loops read at 48 px.
 *
 * In a locked board cell (22 px) the app crops to `headBox`: the toque, the head and the beard, never the belly,
 * so he never reads as a placed 8.
 */

import { GIMMICK_RECIPES as R } from '../../gimmick';
import { CLOTH, FACE, FUR, HAIR, mix, OBJECT, type Ramp } from '../../palette';
import { f } from '../../svg';
import type { AvatarDef, GimmickAnim, GimmickDef } from '../../types';
import { circle, ellipse, line, P, path, type Pt, shaded } from '../draw';
import {
  BROWS,
  chamfer,
  cream,
  grain,
  hatCloth,
  houseCounter,
  inked,
  inkedLine,
  inset,
  nail,
  navy,
  PIRATE_TILES,
  type PirateCharacter,
  pirateId,
  pirateName,
  type Pts,
  steel,
  withIris,
  wood,
  woodDeep,
  woodMid,
  woodSlab,
} from './shared';

const ROLE = { he: 'סבא הטבח', en: 'Grandpa Cook' } as const;
const tile = PIRATE_TILES[8];

// His colours: white hair, a white toque, sleeve and apron, a navy enamel pot, an orange soup.
const beard = HAIR.platinum;
const linen = CLOTH.white;
const boots = hatCloth;
const steamWhite = OBJECT.white.base;
/** A warm vegetable soup, mixed from the palette. */
const soup: Ramp = {
  base: mix(OBJECT.orange.base, FUR.tawny.base, 0.35),
  shade: mix(OBJECT.orange.shade, FUR.brown.base, 0.4),
  light: mix(OBJECT.orange.light, OBJECT.white.base, 0.3),
};

const COOK_FACE: AvatarDef['face'] = {
  ink: FACE.ink,
  eyes: { left: { x: 41.5, y: 39.5 }, right: { x: 58.5, y: 39.5 }, r: 5.2, style: 'round' },
  // bushy white brows, a little longer and thicker than the series'
  brows: { ...BROWS, color: HAIR.silver.base, length: 2, thickness: 2.9 },
  mouth: { x: 50, y: 53, w: 13.5 },
  // cheeks a little smaller than the series': they sit between the beard and the moustache
  cheeks: { color: FACE.blush, dx: 0.55, dy: 1.45, size: 0.66 },
  halo: { x: 50, y: 5 },
};

// Geometry helpers of this file -------------------------------------------------------------------------

/** Points mirrored across the middle of the tile (x → 100 − x). */
const mirrorX = (pts: Pts): Pt[] => pts.map(([x, y]) => [100 - x, y]);

/** A closed polygon, as path data. */
const poly = (pts: Pts): string => `M${pts.map(P).join('L')}Z`;

/** Quadratic curves through `pts` (from the current point, which is pts[0]), each bowed outward by `bulge`. */
function bowed(pts: Pts, bulge: number): string {
  let d = '';
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (!a || !b) continue;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    d += `Q${f((a[0] + b[0]) / 2 - (dy / len) * bulge)} ${f((a[1] + b[1]) / 2 + (dx / len) * bulge)} ${P(b)}`;
  }
  return d;
}

/** A smooth line through `pts` (quadratic curves through the midpoints), from pts[0]. */
function smooth(pts: Pts): string {
  let d = '';
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i];
    const q = pts[i + 1];
    if (p && q) d += `Q${P(p)} ${f((p[0] + q[0]) / 2)} ${f((p[1] + q[1]) / 2)}`;
  }
  const last = pts[pts.length - 1];
  return last ? `${d}L${P(last)}` : d;
}

/** An ellipse as path data (to ink several as one shape). */
const oval = (x: number, y: number, rx: number, ry = rx): string =>
  `M${f(x - rx)} ${f(y)}A${f(rx)} ${f(ry)} 0 1 0 ${f(x + rx)} ${f(y)}A${f(rx)} ${f(ry)} 0 1 0 ${f(x - rx)} ${f(y)}Z`;

// The pieces of his costume: one outline, both looks -------------------------------------------------------

/**
 * The beard: a fluffy U from below his cheeks, round the mouth's laugh room, down over the waist, narrowing
 * with the 8's waist so the digit keeps its pinch. Scalloped outside, smooth inside.
 */
const BEARD_OUTER_L: Pts = [
  [29.8, 45.2],
  [29.2, 48.8],
  [31, 52.2],
  [35.6, 54.8],
  [38.8, 57],
  [38.2, 60.2],
  [39.4, 63.4],
  [42.2, 65.6],
  [46, 66.6],
  [50, 67],
];
const BEARD_INNER_L: Pts = [
  [33.8, 45.4],
  [34, 50.4],
  [37.2, 52.4],
  [41.8, 51.8],
  [42.5, 55],
  [42.7, 58],
  [45, 60.2],
  [50, 60.5],
];
const beardOuter = [...BEARD_OUTER_L, ...mirrorX(BEARD_OUTER_L).reverse().slice(1)];
const beardInnerR = mirrorX(BEARD_INNER_L);
const beardShape =
  `M${P(BEARD_INNER_L[0]!)}` +
  bowed([BEARD_INNER_L[0]!, [32, 43.6], BEARD_OUTER_L[0]!], 0.6) +
  bowed(beardOuter, 0.9) +
  bowed([beardOuter[beardOuter.length - 1]!, [68, 43.6], beardInnerR[0]!], 0.6) +
  smooth(beardInnerR) +
  smooth([...BEARD_INNER_L].reverse()) +
  'Z';
/** The beard's shade: along its scalloped bottom, under the chin. */
const beardShadeShape =
  'M38.8 62.4Q40.6 64.8 43.4 65.6Q46.8 66.6 50 66.7Q53.2 66.6 56.6 65.6Q59.4 64.8 61.2 62.4' +
  'Q60 64.2 56 64.8Q50 65.6 44 64.8Q40 64.2 38.8 62.4Z';
/** The moustache: two soft lobes over the mouth, clear of the eyes, the cheeks and the laugh room. */
const moustache =
  'M50 47.4C47.6 46.2 44.2 46.2 42.4 47.6C41.6 48.4 41.3 50 41.7 51C42.8 50.2 44.4 50.2 46.4 50.6' +
  'C48 50.9 49.2 50.6 50 50C50.8 50.6 52 50.9 53.6 50.6C55.6 50.2 57.2 50.2 58.3 51' +
  'C58.7 50 58.4 48.4 57.6 47.6C55.8 46.2 52.4 46.2 50 47.4Z';
const moustacheShade =
  'M41.7 51C42.8 50.2 44.4 50.2 46.4 50.6C48 50.9 49.2 50.6 50 50C50.8 50.6 52 50.9 53.6 50.6' +
  'C55.6 50.2 57.2 50.2 58.3 51C58.5 50.4 58.4 49.6 58 49C55.8 48.6 53.2 49 50 48.6C46.8 49 44.2 48.6 42 49Q41.6 50 41.7 51Z';

/**
 * The toque: a short puffy cook's cap, its band on the top of the head, narrower than the head so the wood
 * round the top counter shows on both sides of it (the head reads as the 8's loop, with a hat on it).
 */
const toqueBand = 'M40 9H60Q61.6 9 61.6 10.6V12Q61.6 13.6 60 13.6H40Q38.4 13.6 38.4 12V10.6Q38.4 9 40 9Z';
const toquePuff =
  'M40 10C37.4 9.6 37 6 40 5.2C40.8 3.2 44.4 3 46 4.2C47.4 2.8 52.6 2.8 54 4.2C55.6 3 59.2 3.2 60 5.2' +
  'C63 6 62.6 9.6 60 10Z';
const toquePuffShade = 'M54 4.2C55.6 3 59.2 3.2 60 5.2C63 6 62.6 9.6 60 10H52C55 8.6 56 6.2 54 4.2Z';
const toquePleats = 'M44 9.6Q43.2 7.4 43.8 5.4M50 9.6V4.4M56 9.6Q56.8 7.4 56.2 5.4';

/** The apron: a panel tied with a string round the belly, under its counter, with a pocket. */
const apronString = 'M24.4 82.2Q50 85.4 75.6 82.2';
const apronPanel = 'M33.2 83.2Q50 85 66.8 83.2L68.2 92.2Q50 93.6 31.8 92.2Z';
const apronPanelShade = 'M60.4 84.2Q64 83.8 66.8 83.2L68.2 92.2Q65.4 92.6 62.2 92.8Z';
const apronPocket = 'M44.4 86.4H55.6V89.6Q55.6 90.8 54.4 90.8H45.6Q44.4 90.8 44.4 89.6Z';
/** Two boots, toes out, peeking under the apron. */
const bootL = 'M33.4 93.8Q32.8 89.8 37.8 89.8H43.4Q46 89.8 46 92.2V93.8Z';
const bootR = 'M66.6 93.8Q67.2 89.8 62.2 89.8H56.6Q54 89.8 54 92.2V93.8Z';

/** The soup pot: a navy enamel stock pot on the deck at his side (behind him), a cream rim, orange soup. */
const POT = { x: 83, rim: 84, rx: 8.4, ry: 2.3 } as const;
/** Wider than tall and tapered to its foot, so it reads as a pot (not a mug), clear of the tile's corner. */
const potBody = 'M74.8 84Q75 89.8 77.4 92.2Q78.6 93.4 80.6 93.4H85.4Q87.4 93.4 88.6 92.2Q91 89.8 91.2 84Z';

// The moving parts, the same in both looks -----------------------------------------------------------------

/** Where the ladle dips into the soup: he stirs round this point. */
const STIR = { x: 81.6, y: 83.9 } as const;
/** His right arm, out from behind his belly: a puffy linen sleeve to a cuff, the ladle below it. */
const sleeve = 'M65.4 60.6Q74.6 60.2 81.2 65.4L78 71Q72.4 68.6 65.8 69.2Z';
const cuff = 'M81.2 65.4L83.8 66.9L80.6 72.5L78 71Z';
const ladleHandle = 'M82.2 69.8L81.6 83.8';

/** A stir: the handle sways round the dip point, as a ladle does in a pot. */
const stir = (angle: number, ms: number) => R.sway({ angle, ms });
const stirAnims: readonly GimmickAnim[] = [
  {
    trigger: ['surprised'],
    durationMs: 800,
    keyframes: [
      { t: 0, ease: 'emphasized' },
      { t: 0.3, rotate: -9, y: -1.2 },
      { t: 1, rotate: -6, y: -0.8 },
    ],
    origin: STIR,
  },
  { ...stir(12, 760), trigger: ['laugh', 'dizzy'], origin: STIR },
  { ...stir(7, 1300), trigger: ['smile', 'wink'], origin: STIR },
  // dozing off: the ladle leans away and stays
  {
    trigger: ['sleepy'],
    durationMs: 1400,
    keyframes: [
      { t: 0, ease: 'standard' },
      { t: 1, rotate: 7, y: 0.4 },
    ],
    origin: STIR,
  },
  { ...stir(4, 2800), trigger: ['idle'], origin: STIR },
];

/**
 * The toque: puffs up like a soufflé when surprised and falls like one when sad, droops when he dozes, flops
 * when he laughs or rocks. Its band is the root.
 */
const TOQUE_ROOT = { x: 50, y: 13.6 } as const;
const toqueAnims: readonly GimmickAnim[] = [
  {
    trigger: ['surprised'],
    durationMs: 900,
    keyframes: [
      { t: 0, ease: 'emphasized' },
      { t: 0.3, sx: 1.08, sy: 1.18, y: -0.6 },
      { t: 0.62, sx: 1.05, sy: 1.12, y: -0.4 },
      { t: 1, sx: 1.05, sy: 1.12, y: -0.4 },
    ],
    origin: TOQUE_ROOT,
  },
  {
    trigger: ['sad'],
    durationMs: 1100,
    keyframes: [
      { t: 0, ease: 'standard' },
      { t: 0.6, sx: 1.05, sy: 0.84, y: 0.3 },
      { t: 1, sx: 1.04, sy: 0.86, y: 0.3 },
    ],
    origin: TOQUE_ROOT,
  },
  {
    trigger: ['sleepy'],
    durationMs: 1600,
    keyframes: [
      { t: 0, ease: 'standard' },
      { t: 1, rotate: 9, y: 0.5 },
    ],
    origin: { x: 60, y: 13.6 },
  },
  { ...R.sway({ angle: 7, ms: 640 }), trigger: ['laugh'], origin: TOQUE_ROOT },
  { ...R.sway({ angle: 9, ms: 520 }), trigger: ['wobble', 'shake', 'spin', 'flip'], origin: TOQUE_ROOT },
];

/** The beard jiggles while he laughs (ho, ho), from its top: it moves down, away from the mouth. */
const BEARD_ROOT = { x: 50, y: 45 } as const;
const beardAnims: readonly GimmickAnim[] = [
  {
    trigger: ['laugh'],
    durationMs: 520,
    loop: true,
    keyframes: [{ t: 0 }, { t: 0.5, y: 0.6, sy: 1.04 }, { t: 1 }],
    origin: BEARD_ROOT,
  },
];

/** Three puffs of steam from the pot, a third apart; twice as fast when he fumes. */
const STEAM_AT: Pt = [88.6, 79.4];
const steamAnims = [0, 1, 2].map((i): readonly GimmickAnim[] => [
  {
    ...R.steam({ rise: 15, ms: 1200 }),
    delayMs: i * 400,
    trigger: ['angry'],
    origin: { x: STEAM_AT[0], y: STEAM_AT[1] },
  },
  {
    ...R.steam({ rise: 15, ms: 2400 }),
    delayMs: i * 800,
    trigger: ['idle', 'smile', 'laugh'],
    origin: { x: STEAM_AT[0], y: STEAM_AT[1] },
  },
]);
const puffShape =
  oval(STEAM_AT[0], STEAM_AT[1], 3.1) +
  oval(STEAM_AT[0] + 2.5, STEAM_AT[1] - 1.7, 2.2) +
  oval(STEAM_AT[0] - 2.2, STEAM_AT[1] - 2, 2);

/** A look's gimmicks, from its art: the same ids, depths, rest poses and anims in both looks. */
function gimmicksOf(art: {
  arm: string;
  ladle: string;
  beard: string;
  toque: string;
  puff: string;
}): readonly GimmickDef[] {
  return [
    // the arm comes out from behind the belly; the ladle, over the pot, moves with it
    { id: 'arm', z: 'behind', markup: art.arm, anim: stirAnims },
    { id: 'ladle', z: 'back', markup: art.ladle, anim: stirAnims },
    { id: 'beard', z: 'back', markup: art.beard, anim: beardAnims },
    { id: 'toque', markup: art.toque, anim: toqueAnims },
    ...steamAnims.map((anim, i): GimmickDef => ({
      id: `steam-${i + 1}`,
      rest: 'hidden',
      markup: art.puff,
      anim,
    })),
  ];
}

// House look --------------------------------------------------------------------------------------------

/** The balloon 8: a round head on a rounder belly, pinched at the waist. */
const houseEight =
  'M50 13C63.6 13 73.5 22.6 73.5 36C73.5 45.6 70.2 51.6 65.6 56C73.6 60.4 78 66.6 78 74.2' +
  'C78 85.2 66 93 50 93C34 93 22 85.2 22 74.2C22 66.6 26.4 60.4 34.4 56C29.8 51.6 26.5 45.6 26.5 36' +
  'C26.5 22.6 36.4 13 50 13Z';

const cookHouse: AvatarDef = {
  id: pirateId(8, 'house'),
  kind: 'symbol',
  name: pirateName(ROLE, 'house'),
  tile,
  layers: {
    back:
      // the pot at his side, behind him
      path(potBody, navy.shade) +
      path(potBody, navy.base, ' transform="translate(-0.9 -0.5)"') +
      ellipse(POT.x, POT.rim, POT.rx, POT.ry, cream.base) +
      ellipse(POT.x, POT.rim + 0.15, POT.rx - 1.3, POT.ry - 0.75, soup.base) +
      circle(79.6, 88.6, 0.6, cream.base) +
      circle(83.4, 90.8, 0.6, cream.base) +
      // the digit: one offset shade, a highlight on each bowl, both counters open
      shaded(houseEight, wood.base, wood.shade) +
      ellipse(32.4, 27.6, 1.8, 5, wood.light, 32) +
      ellipse(27.2, 70.4, 1.9, 4.6, wood.light, 12) +
      // the top counter tucked under the toque's band (13.6), wood beside it: the gap under the cap
      houseCounter(50, 16.4, 8, 3.2, tile, wood.shade) +
      houseCounter(50, 74.5, 8.4, 7, tile, wood.shade) +
      // the moustache; the apron on its string; the boots
      path(moustache, beard.shade) +
      path(moustache, beard.base, ' transform="translate(-0.3 -0.4)"') +
      line(apronString, linen.shade, 1.5) +
      path(apronPanel, linen.shade) +
      path('M33.2 83.2Q50 85 66.8 83.2L67.8 89.6Q50 91.6 31.8 92.2Z', linen.base) +
      path(apronPocket, linen.shade) +
      path(bootL, boots.base) +
      path(bootR, boots.base) +
      ellipse(38.4, 91, 2.2, 0.8, boots.light, -8) +
      ellipse(61.6, 91, 2.2, 0.8, boots.light, 8),
  },
  face: COOK_FACE,
  pivot: { x: 50, y: 44 },
  headBox: { x: 19, y: 4, size: 62 },
  base: 93.4,
  squash: true,
  motionBias: ['nod', 'wobble', 'tilt', 'shake'],
  gimmicks: gimmicksOf({
    arm:
      path(sleeve, linen.shade) +
      path(sleeve, linen.base, ' transform="translate(-0.3 -0.7)"') +
      path(cuff, linen.shade),
    ladle:
      line(ladleHandle, steel.shade, 2.2) +
      line(ladleHandle, steel.base, 1.2) +
      ellipse(STIR.x, STIR.y + 0.15, 1.8, 0.55, soup.light),
    beard: path(beardShape, beard.shade) + path(beardShape, beard.base, ' transform="translate(-0.5 -0.6)"'),
    toque:
      path(toquePuff, linen.shade) +
      path(toquePuff, linen.base, ' transform="translate(-0.6 -0.6)"') +
      line(toquePleats, linen.shade, 0.9) +
      path(toqueBand, linen.shade) +
      path(toqueBand, linen.base, ' transform="translate(-0.4 -0.6)"'),
    puff: path(puffShape, steamWhite),
  }),
};

// Invested look -----------------------------------------------------------------------------------------

/**
 * The head: an octagon of planks round the top counter. A thin plank across the top (under the toque), a post
 * on each side of the counter, and the face plank under them, nailed over the posts.
 */
const plankTop: Pts = [
  [33, 16.5],
  [37.5, 12],
  [62.5, 12],
  [67, 16.5],
  [56, 17],
  [44, 17],
];
const plankPostL: Pts = [
  [33, 16.5],
  [44, 17],
  [44, 27],
  [26.5, 27],
  [26.5, 23],
];
const plankPostR = mirrorX(plankPostL).reverse();
const plankFace: Pts = [
  [26.5, 25.5],
  [73.5, 25.5],
  [73.5, 49],
  [60.5, 62],
  [39.5, 62],
  [26.5, 49],
];
/**
 * The belly: one bigger octagonal slab with the bottom counter cut through it (as the 6's bowl), so the loop
 * reads round at 48 px, with no mitre joints.
 */
const belly = chamfer(22.5, 55.5, 77.5, 93.5, 12.5);
const bellyCounter = chamfer(41.5, 67.5, 58.5, 81.5, 4);

/** The bottom counter: the ink edge, the tile through it, and the slab's thickness on its upper and left walls. */
function bellyHole(): string {
  const w = inset(bellyCounter, 2);
  const at = (pts: Pts, i: number): Pt => pts[i] ?? [0, 0];
  const lip = poly(
    [6, 7, 0, 1, 2].map((i) => at(bellyCounter, i)).concat([2, 1, 0, 7, 6].map((i) => at(w, i))),
  );
  return inked(poly(bellyCounter), tile) + path(lip, wood.shade);
}
/** The toque's shadow on the top plank, just under its band (never over the counter: that is the tile). */
const toqueShadow: Pts = [
  [38.6, 13.6],
  [61.4, 13.6],
  [61.8, 15.2],
  [38.2, 15.2],
];

const investedPot =
  inked(potBody, navy.base) +
  path('M86.4 84H91.2Q91 89.8 88.6 92.2Q87.4 93.4 85.4 93.4H84.6Q87.6 89.6 86.4 84Z', navy.shade) +
  path('M74.8 85.4H77.2Q77.4 89.6 79.4 92.9Q78.2 92.9 77.4 92.2Q75 89.8 74.8 85.4Z', navy.light) +
  path('M74.8 84H91.2L91.1 85.6H74.9Z', cream.shade) +
  [
    [80.4, 88.2],
    [83.4, 91],
    [85.4, 87.4],
    [81.6, 91.8],
    [78.4, 89.4],
  ]
    .map(([x, y]) => circle(x ?? 0, y ?? 0, 0.5, cream.light))
    .join('') +
  inked(oval(POT.x, POT.rim, POT.rx, POT.ry), cream.base) +
  path(oval(POT.x, POT.rim + 0.15, POT.rx - 1.3, POT.ry - 0.75), soup.base) +
  path('M76.4 83.8Q83 82.2 89.6 83.8Q83 83.2 76.4 83.8Z', soup.shade) +
  line('M84.6 84.8Q86.8 84.6 88 84.2', soup.light, 0.6);

const cookInvested: AvatarDef = {
  id: pirateId(8, 'invested'),
  kind: 'symbol',
  name: pirateName(ROLE, 'invested'),
  tile,
  layers: {
    back:
      investedPot +
      // the belly: one octagonal slab, its counter cut through it, nailed at the waist joint
      woodSlab(belly) +
      grain([
        [27.4, 70],
        [28, 75],
        [27.2, 80],
      ]) +
      grain([
        [72.6, 70],
        [72, 75],
        [72.8, 80],
      ]) +
      ellipse(66.2, 75.4, 0.8, 2, woodDeep) +
      bellyHole() +
      nail(34.6, 62.6) +
      nail(65.4, 62.6) +
      // the head: the posts round the top counter, the plank across it, the face plank nailed over the posts
      woodSlab(plankPostL, 2.2) +
      woodSlab(plankPostR, 2.2) +
      woodSlab(plankTop, 2.2) +
      path(poly(toqueShadow), woodMid) +
      grain([
        [29.8, 23.6],
        [35.6, 22.4],
        [42.2, 23],
      ]) +
      grain([
        [70.2, 23.6],
        [64.4, 22.4],
        [57.8, 23],
      ]) +
      woodSlab(plankFace) +
      grain([
        [30, 34.4],
        [30.6, 38.8],
        [29.8, 43.4],
      ]) +
      grain([
        [70, 34.4],
        [69.4, 38.8],
        [70.2, 43.4],
      ]) +
      // the moustache
      inked(moustache, beard.base) +
      path(moustacheShade, beard.shade) +
      line('M43.4 47.8Q46 46.8 48.6 47.6M51.4 47.6Q54 46.8 56.6 47.8', beard.light, 0.7) +
      // the apron on its string, its pocket; the boots
      inkedLine(apronString, linen.base, 1.4, 3.6) +
      inked(apronPanel, linen.base) +
      path(apronPanelShade, linen.shade) +
      path('M31.8 92.2Q50 93.6 68.2 92.2L68 91Q50 92.4 32 91Z', linen.shade) +
      path(apronPocket, linen.shade) +
      line('M45.2 87.4H54.8', linen.base, 0.5) +
      inked(bootL, boots.base) +
      inked(bootR, boots.base) +
      path('M33.4 93.8V93Q40 93.4 46 93V93.8Z', boots.shade) +
      path('M66.6 93.8V93Q60 93.4 54 93V93.8Z', boots.shade) +
      line('M35.2 91.4Q36 90.6 38.4 90.6', boots.light, 0.8) +
      line('M64.8 91.4Q64 90.6 61.6 90.6', boots.light, 0.8),
  },
  face: withIris(COOK_FACE, OBJECT.steel.shade),
  pivot: { x: 50, y: 44 },
  headBox: { x: 19, y: 4, size: 62 },
  base: 94,
  squash: true,
  motionBias: ['nod', 'wobble', 'tilt', 'shake'],
  gimmicks: gimmicksOf({
    arm:
      inked(sleeve, linen.base) +
      path('M65.8 66.4Q72.6 65.8 79.4 68.6L78 71Q72.4 68.6 65.8 69.2Z', linen.shade) +
      line('M70 62.2Q75.4 62.4 79.6 65', linen.light, 0.7) +
      inked(cuff, linen.base) +
      path('M79.8 69.6L82.6 71.1L80.6 72.5L78 71Z', linen.shade),
    ladle:
      inkedLine(ladleHandle, steel.base, 1.5, 3.4) +
      line('M81.7 70.4L82 79.4', steel.light, 0.5) +
      path(oval(STIR.x, STIR.y + 0.15, 2, 0.6), soup.light),
    beard:
      inked(beardShape, beard.base) +
      path(beardShadeShape, beard.shade) +
      line('M31.4 47.4Q31.4 50.8 33.4 52.8M68.6 47.4Q68.6 50.8 66.6 52.8', beard.light, 0.8) +
      line(
        'M39.8 61.6Q41.2 63.2 43.4 63.6M60.2 61.6Q58.8 63.2 56.6 63.6M47.6 62.6Q50 63.4 52.4 62.6',
        beard.shade,
        0.6,
      ),
    toque:
      inked(toquePuff, linen.base) +
      path(toquePuffShade, linen.shade) +
      line(toquePleats, linen.shade, 0.7) +
      inked(toqueBand, linen.base) +
      path('M38.4 11.8H61.6V12Q61.6 13.6 60 13.6H40Q38.4 13.6 38.4 12Z', linen.shade),
    puff: inked(puffShape, steamWhite),
  }),
};

/** Grandpa Cook, both looks. */
export const GRANDPA_COOK: PirateCharacter = {
  digit: 8,
  looks: { house: cookHouse, invested: cookInvested },
};
