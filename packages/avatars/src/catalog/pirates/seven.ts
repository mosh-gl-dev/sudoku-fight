/**
 * 7, "Peg-leg Peg", the boatswain: one of the two references of the series (with one.ts). Read
 * docs/avatars/PIRATES.md first; the series' toolbox is shared.ts.
 *
 * The bar is her head and shoulders: her face in the middle, dark hair under a red bandana in the top corners,
 * and a navy-and-cream striped shirt on the shoulders below, its neckline round her chin. The slanted stem is
 * her peg leg. Her raised left arm ends in a hook that waves; her bandana's knot tails flutter; she rocks on the
 * peg (her favourite motion, wobble, turns around her foot). No guns, no blades.
 *
 * In a locked board cell (22 px) the app crops to `headBox`: the bar's middle (face, bandana, patch), never the
 * stem, so she never reads as a placed 7.
 */

import { CLOTH, FACE, HAIR } from '../../palette';
import { f } from '../../svg';
import type { AvatarDef } from '../../types';
import { circle, ellipse, line, path, shaded } from '../draw';
import {
  along,
  bandanaRed,
  BROWS,
  brass,
  chamfer,
  cream,
  flutter,
  grain,
  inked,
  inkedLine,
  inkedRing,
  iron,
  ironSlab,
  nail,
  navy,
  patchBlack,
  PIRATE_TILES,
  type PirateCharacter,
  pirateId,
  pirateName,
  poly,
  type Pts,
  slantedPlank,
  steel,
  wave,
  withIris,
  wood,
  woodMid,
  woodSlab,
} from './shared';

const ROLE = { he: 'פג רגל־עץ', en: 'Peg-leg Peg' } as const;
const tile = PIRATE_TILES[7];
const hair = HAIR.chestnut;

const PEG_FACE: AvatarDef['face'] = {
  ink: FACE.ink,
  eyes: { left: { x: 41.5, y: 34.5 }, right: { x: 58.5, y: 34.5 }, r: 5.3, style: 'round', covered: 'left' },
  brows: { ...BROWS, color: hair.base },
  mouth: { x: 50, y: 45.5, w: 14 },
  cheeks: { color: FACE.blush, dx: 0.55, dy: 1.45, size: 0.72 },
  halo: { x: 50, y: 8 },
};

// The moving parts, the same in both looks -----------------------------------------------------------------

/** The wrist the hook waves around (her raised left arm, on the viewer's left). */
const HOOK_WRIST = { x: 12, y: 37 } as const;
const hookAnims = wave(HOOK_WRIST);
/** The bandana's knot tails flutter. */
const TAILS_ROOT = { x: 71, y: 20 } as const;
const tailsAnims = flutter(TAILS_ROOT);

/** The stem, her peg leg: a convex outline from under the bar to the foot (it tapers toward the foot). */
const peg = slantedPlank([60, 84, 51], [40.5, 53, 88.5]);

/** The hook: up from the wrist, curling over to a blunt point. Drawn at rest (the gimmick waves it). */
const hookPath = 'M12 35.6V24.6A4.6 4.6 0 0 1 21.2 24.6V25.8';
const hookTip = 'M19.7 25.2H22.7L21.2 28.4Z';
/** Two stripes across each shoulder, inside the neckline (x0: the shoulder's outer edge). */
const shoulderStripes = (x0: number, color: string): string =>
  path(`M${f(x0)} 44.4H32.1L32.9 46.6H${f(x0)}Z`, color) +
  path(`M${f(x0 + 0.2)} 48.8H34.1L35.6 50.8H${f(x0 + 0.6)}Z`, color) +
  path(`M${f(100 - x0)} 44.4H67.9L67.1 46.6H${f(100 - x0)}Z`, color) +
  path(`M${f(99.8 - x0)} 48.8H65.9L64.4 50.8H${f(99.4 - x0)}Z`, color);
const bandana = 'M27 26Q27.6 13 50 12.4Q72.4 13 73 26Q62 22 50 22Q38 22 27 26Z';
const patchStrap = 'M35 32.4L27.6 29.4M46.2 29.8L54.6 22.6';
const patchShape =
  'M41.5 28.2C46 28.2 48.6 31 48.4 34.6C48.2 38.6 45.2 40.8 41.5 40.8C37.6 40.8 34.6 38.2 34.6 34.4C34.6 30.6 37.4 28.2 41.5 28.2Z';

// House look --------------------------------------------------------------------------------------------

const pegHouseBar = 'M22 18H78Q86 18 86 26V46Q86 54 78 54H22Q14 54 14 46V26Q14 18 22 18Z';
const pegHouseStem =
  'M61 50H83Q86 50 84.4 52.6L54.4 88.4Q53 90 51 90H42.6Q39.4 90 41 87.2L58.6 51.4Q59.4 50 61 50Z';
const houseHair =
  'M22 18H31.4Q28.6 26 29.4 33Q30 38 31.2 42.4L14 41.4V26Q14 18 22 18Z' +
  'M78 18H68.6Q71.4 26 70.6 33Q70 38 68.8 42.4L86 41.4V26Q86 18 78 18Z';
const houseShirt =
  'M14 40.6Q22 39.4 31.2 41.6Q32.6 47.4 36 51.2H64Q67.4 47.4 68.8 41.6Q78 39.4 86 40.6V46Q86 54 78 54H22Q14 54 14 46Z';

const houseTails =
  path('M70 19.4Q77 13.6 81.6 15.4Q77.6 18.6 72 21.6Z', bandanaRed.shade) +
  path('M70.4 20.6Q78.6 21 82 24.6Q76.6 25.6 71 22.6Z', bandanaRed.base);

const pegHouse: AvatarDef = {
  id: pirateId(7, 'house'),
  kind: 'symbol',
  name: pirateName(ROLE, 'house'),
  tile,
  layers: {
    back:
      // the peg leg: wood, an iron band and an iron foot
      shaded(pegHouseStem, wood.base, wood.shade) +
      path(poly(peg.band(69, 73, 0.6)), iron.base) +
      path('M41.6 86H55.2L54.4 88.4Q53 90.6 51 90.6H42.6Q39.6 90.6 40.4 88.2Z', iron.base) +
      ellipse(60.6, 62, 1.2, 4, wood.light, 34) +
      // her head and shoulders
      shaded(pegHouseBar, wood.base, wood.shade) +
      path(houseHair, hair.base) +
      line('M17.6 25Q19 21.6 23 20.8', hair.light, 1.3) +
      path(houseShirt, navy.base) +
      shoulderStripes(15, cream.base),
    front:
      // the patch (its strap under the bandana), the bandana, and the cuff of her raised arm
      line(patchStrap, patchBlack.base, 1.8) +
      path(patchShape, patchBlack.base) +
      ellipse(38.4, 31.4, 1.6, 1, patchBlack.light, -30) +
      path(bandana, bandanaRed.shade) +
      path(bandana, bandanaRed.base, ' transform="translate(-0.6 -0.8)"') +
      path(
        'M10 35.4H14.4Q15.8 35.4 15.8 36.8V41.2Q15.8 42.6 14.4 42.6H10Q8.6 42.6 8.6 41.2V36.8Q8.6 35.4 10 35.4Z',
        navy.base,
      ) +
      path('M8.6 37H15.8V38.6H8.6Z', cream.base),
  },
  face: PEG_FACE,
  pivot: { x: 48, y: 40 },
  headBox: { x: 23, y: 8, size: 54 },
  base: 90.6,
  squash: true,
  motionBias: ['wobble', 'tilt', 'nod', 'shake'],
  gimmicks: [
    { id: 'tails', z: 'behind', markup: houseTails, anim: tailsAnims },
    {
      id: 'hook',
      markup: line(hookPath, steel.shade, 3.4) + line(hookPath, steel.base, 2.2) + path(hookTip, steel.base),
      anim: hookAnims,
    },
  ],
};

// Invested look -----------------------------------------------------------------------------------------

/** The bar plank: her head and shoulders, nailed over the top of the peg. */
const pegBar = chamfer(13, 17.5, 87, 55, 3.4);
const investedHairL = 'M16.4 17.5H31.4Q28.6 26 29.4 33Q30 38 31.2 42.4L13 41.4V20.9Z';
const investedHairR = 'M83.6 17.5H68.6Q71.4 26 70.6 33Q70 38 68.8 42.4L87 41.4V20.9Z';
const investedShirt =
  'M13 40.6Q22 39.4 31.2 41.6Q32.6 47.4 36 51.2H64Q67.4 47.4 68.8 41.6Q78 39.4 87 40.6V51.6L83.6 55H16.4L13 51.6Z';

const investedTails =
  inked('M70 19.4Q77 13.4 81.8 15.2Q77.6 18.6 72 21.6Z', bandanaRed.shade) +
  inked('M70.4 20.6Q78.8 20.8 82.2 24.6Q76.6 25.8 71 22.6Z', bandanaRed.base);

/** White polka dots on the bandana, kept inside its shape. */
const dots: Pts = [
  [35, 20.6],
  [42.4, 16.4],
  [50, 14.8],
  [57.6, 16.4],
  [65, 20.6],
  [46, 20],
  [54, 20],
];

const pegInvested: AvatarDef = {
  id: pirateId(7, 'invested'),
  kind: 'symbol',
  name: pirateName(ROLE, 'invested'),
  tile,
  layers: {
    back:
      // the peg leg: a tapered post with grain, an iron band with rivets, an iron foot
      woodSlab(peg.pts, 2.2) +
      grain([
        [64, 53],
        [57.6, 63],
        [52.4, 74],
        [47, 85],
      ]) +
      grain([
        [74, 53],
        [68.6, 62],
        [62.4, 72],
        [55.6, 82],
      ]) +
      ironSlab(peg.band(68.5, 73.5, 1)) +
      nail(...along([peg.left(71), 71], [peg.right(71), 71], 0.25), 0.8) +
      nail(...along([peg.left(71), 71], [peg.right(71), 71], 0.75), 0.8) +
      ironSlab(
        [
          [peg.left(84.5) - 1.2, 84.5],
          [peg.right(84.5) + 1.2, 84.5],
          [55.4, 90],
          [52.4, 92.6],
          [43.2, 92.6],
          [40, 90],
        ],
        1.1,
      ) +
      // her head and shoulders: a wooden slab; hair in the top corners, the striped shirt below
      woodSlab(pegBar) +
      inked(investedHairL, hair.base) +
      inked(investedHairR, hair.base) +
      path('M13 33Q21 35 30 34.2Q30.4 38.4 31.2 42.4L13 41.4Z', hair.shade) +
      path('M87 33Q79 35 70 34.2Q69.6 38.4 68.8 42.4L87 41.4Z', hair.shade) +
      line('M16.6 26.4Q18 21.8 23.4 20.6M76 21Q80.6 22 82.6 26', hair.light, 1.1) +
      line('M22 29Q26 31.4 29.2 30.8M78 29Q74 31.4 70.8 30.8', hair.shade, 0.8) +
      inked(investedShirt, navy.base) +
      shoulderStripes(13, cream.base) +
      path('M13 51.6V51.2H36.6Q40 53.4 50 53.4Q60 53.4 63.4 51.2H87V51.6L83.6 55H16.4Z', navy.shade) +
      path('M13 40.6Q22 39.4 31.2 41.6L31.5 43.2Q22 41.2 13 42.4Z', navy.light) +
      path('M87 40.6Q78 39.4 68.8 41.6L68.5 43.2Q78 41.2 87 42.4Z', navy.light) +
      // a brass hoop at her right ear, and the shadow the bandana casts on her brow
      inkedRing(70.4, 43.4, 2.5, brass.base, 1.2) +
      path('M30.8 24.6Q39 21 50 21Q61 21 69.2 24.6V27.6Q61 24.6 50 24.4Q39 24.6 30.8 27.6Z', woodMid) +
      nail(66, 52.4) +
      nail(80.6, 52.4),
    front:
      // the patch and its strap; the bandana with dots and folds; the cuff of her raised arm
      inkedLine(patchStrap, patchBlack.base, 1.8, 3.4) +
      inked(patchShape, patchBlack.base) +
      line('M37 31.6Q39 29.6 42 29.6', patchBlack.light, 0.9) +
      inked(bandana, bandanaRed.base) +
      path('M50 22Q62 22 73 26Q72 17 62 14Q67 19 66 23Q58 21.6 50 22Z', bandanaRed.shade) +
      line('M30 22.6Q38 15.6 50 14.4', bandanaRed.light, 1) +
      dots.map(([x, y]) => circle(x, y, 1.15, cream.light)).join('') +
      line('M40 21.6Q45 19.8 50 19.8', bandanaRed.shade, 0.6) +
      inked(
        'M10 35.2H14.6Q16 35.2 16 36.6V41.4Q16 42.8 14.6 42.8H10Q8.6 42.8 8.6 41.4V36.6Q8.6 35.2 10 35.2Z',
        navy.base,
      ) +
      path('M8.6 40.4H16V41.4Q16 42.8 14.6 42.8H10Q8.6 42.8 8.6 41.4Z', navy.shade) +
      path('M8.6 36.8H16V38.4H8.6Z', cream.base),
  },
  face: withIris(PEG_FACE, CLOTH.forest.light),
  pivot: { x: 48, y: 40 },
  headBox: { x: 23, y: 8, size: 54 },
  base: 92.6,
  squash: true,
  motionBias: ['wobble', 'tilt', 'nod', 'shake'],
  gimmicks: [
    { id: 'tails', z: 'behind', markup: investedTails, anim: tailsAnims },
    {
      id: 'hook',
      markup:
        inkedLine(hookPath, steel.base, 2.6, 5) +
        line('M11.2 34V24.6A5.2 5.2 0 0 1 14.2 20.2', steel.light, 0.8) +
        inked(hookTip, steel.base),
      anim: hookAnims,
    },
  ],
};

/** Peg-leg Peg, both looks. */
export const PEG: PirateCharacter = {
  digit: 7,
  looks: { house: pegHouse, invested: pegInvested },
};
