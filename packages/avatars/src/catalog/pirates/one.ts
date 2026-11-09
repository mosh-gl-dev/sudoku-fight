/**
 * 1, the Captain: the first pirate drawn, and one of the two references of the series (with seven.ts). Read
 * docs/avatars/PIRATES.md first; the series' toolbox is shared.ts.
 *
 * The flag of the 1 is his long, pointed cartoon nose (never hooked). A tricorne with an anchor, a navy coat, a
 * spyglass through his belt whose draw tube slides out when he is surprised, a hat tip when he laughs, a glint
 * on his buttons when idle, and a proud nod (his favourite motion). No guns, no blades.
 *
 * The digit is the body: the stem is his head and torso, the face at its top under the hat, the coat on its
 * lower half; the foot is the 1's base serif, and his boots' plank in the invested look.
 *
 * In a locked board cell (22 px) the app crops to `headBox`: the face, the nose and the hat, never the whole
 * numeral, so he never reads as a placed 1.
 */

import { CLOTH, FACE } from '../../palette';
import { f } from '../../svg';
import type { AvatarDef, GimmickAnim } from '../../types';
import { circle, ellipse, line, path, type Pt, shaded } from '../draw';
import {
  anchor,
  BROWS,
  brass,
  chamfer,
  cream,
  glint,
  grain,
  hatCloth,
  INK,
  inked,
  leather,
  nail,
  navy,
  PIRATE_TILES,
  type PirateCharacter,
  pirateId,
  pirateName,
  tipAndHop,
  withIris,
  wood,
  woodDeep,
  woodMid,
  woodSlab,
} from './shared';

const ROLE = { he: 'הקפטן', en: 'The Captain' } as const;
const tile = PIRATE_TILES[1];

const CAPTAIN_FACE: AvatarDef['face'] = {
  ink: FACE.ink,
  eyes: { left: { x: 42, y: 35 }, right: { x: 58, y: 35 }, r: 5.2, style: 'round' },
  brows: BROWS,
  mouth: { x: 51.5, y: 55, w: 13.5 },
  // no cheeks: the nose takes the left one's place
  halo: { x: 50, y: 5 },
};

// The moving parts, the same in both looks -----------------------------------------------------------------

/** The spyglass lies along this line, through his belt: centre, angle (deg), half length. */
const SPY = { x: 58.5, y: 74, deg: -33.7, half: 14 } as const;
/** How far the draw tube slides out when he is surprised, along the spyglass. */
const SPY_REACH = 9;
const spyDir: Pt = [Math.cos((SPY.deg * Math.PI) / 180), Math.sin((SPY.deg * Math.PI) / 180)];
const spyGroup = (inner: string) =>
  `<g transform="translate(${f(SPY.x)} ${f(SPY.y)}) rotate(${f(SPY.deg)})">${inner}</g>`;

/** The draw tube slides out on surprise and holds; the glint idles. */
const spyAnim: GimmickAnim = {
  trigger: ['surprised'],
  durationMs: 1100,
  keyframes: [
    { t: 0, ease: 'emphasized' },
    { t: 0.32, x: spyDir[0] * SPY_REACH * 1.08, y: spyDir[1] * SPY_REACH * 1.08, ease: 'standard' },
    { t: 0.55, x: spyDir[0] * SPY_REACH, y: spyDir[1] * SPY_REACH },
    { t: 1, x: spyDir[0] * SPY_REACH, y: spyDir[1] * SPY_REACH },
  ],
  origin: { x: SPY.x, y: SPY.y },
};

/** The hat tips: lifts off his head and leans, around its right point, and drops back; it hops on surprise. */
const HAT_HINGE = { x: 74, y: 14 } as const;
const hatAnims = tipAndHop(HAT_HINGE);

/** The glint on his coat's brass, idling: the same anim in both looks (the invested star sits 0.5 higher). */
const GLINT_AT = { x: 66, y: 66 } as const;

// House look --------------------------------------------------------------------------------------------

const captainHouseBody =
  'M40 16H60Q66 16 66 22V80H72Q78.5 80 78.5 86.5Q78.5 93 72 93H28Q21.5 93 21.5 86.5Q21.5 80 28 80H34V22Q34 16 40 16Z';
const captainNose =
  'M49.5 39.4C41 40 26.5 44.6 15.6 50.6Q12.6 52.6 15.4 53.6C27.5 54 41.5 51 53.6 47.6Q56.4 42.4 49.5 39.4Z';
const houseHatCrown = 'M35 19C35 8.5 42 4 50 4S65 8.5 65 19Z';
const hatBrim = 'M22.5 11Q37 16.5 50 13.5Q63 16.5 77.5 11Q73 22.5 50 25.6Q27 22.5 22.5 11Z';
const hatBrimTop = 'M22.5 11Q37 16.5 50 13.5Q63 16.5 77.5 11';

function houseSpyglass(): string {
  const h = SPY.half;
  return spyGroup(
    path(`M${-h} -2.6H${h - 4}V2.6H${-h}Z`, brass.shade) +
      path(`M${-h} -2.6H${h - 4}V1.2H${-h}Z`, brass.base) +
      path(`M${h - 5} -3.3H${h}V3.3H${h - 5}Z`, brass.shade) +
      path(`M${h - 5} -3.3H${h}V1.6H${h - 5}Z`, brass.base) +
      path(`M${-h + 2} -2.7H${-h + 8}V2.7H${-h + 2}Z`, leather.base),
  );
}

function houseDrawTube(): string {
  const h = SPY.half;
  return spyGroup(
    path(`M${h - 6} -1.9H${h + 3}V1.9H${h - 6}Z`, brass.shade) +
      path(`M${h - 6} -1.9H${h + 3}V0.6H${h - 6}Z`, brass.base),
  );
}

const captainHouse: AvatarDef = {
  id: pirateId(1, 'house'),
  kind: 'symbol',
  name: pirateName(ROLE, 'house'),
  tile,
  layers: {
    back:
      shaded(captainHouseBody, wood.base, wood.shade) +
      ellipse(37.4, 30, 1.8, 5, wood.light) +
      ellipse(26.5, 84.5, 3.4, 1.4, wood.light) +
      // the coat, its collar and the belt
      path('M36 59H64Q67 59 67 62V78L70.5 84.5H29.5L33 78V62Q33 59 36 59Z', navy.shade) +
      path('M36 59H63Q66 59 66 62V78L69 83.5H29.5L33 78V62Q33 59 36 59Z', navy.base) +
      path('M42.5 59L50 68.5L57.5 59Z', cream.base) +
      path('M50 68.5L57.5 59H54.5L50 64.5Z', cream.shade) +
      houseSpyglass() +
      path('M33 73.5H67V77.5H33Z', leather.base) +
      path('M46.6 72.4H53.4V78.6H46.6Z', brass.base) +
      path('M48.4 74.2H51.6V76.8H48.4Z', leather.base),
    front:
      // the nose: the 1's flag, long and pointed; its shadow on the face first
      path('M53.4 47.6C45 50 39 51.4 35.4 52.2L36.2 50.6C42 49.6 47.5 48.4 53.4 46.6Z', wood.shade) +
      shaded(captainNose, wood.base, wood.shade, -0.9, -1.1) +
      line('M46 41.2C39 42 30 44.6 22 48.2', wood.light, 1.1),
  },
  face: CAPTAIN_FACE,
  pivot: { x: 50, y: 50 },
  headBox: { x: 12, y: 2, size: 62 },
  base: 93,
  squash: true,
  motionBias: ['nod', 'tilt', 'bounce', 'flip'],
  gimmicks: [
    { id: 'draw-tube', z: 'behind', markup: houseDrawTube(), anim: spyAnim },
    {
      id: 'hat',
      markup:
        path(houseHatCrown, hatCloth.shade) +
        path('M35 19C35 8.5 41.5 4.6 49 4.6S63 8.5 63.5 19Z', hatCloth.base) +
        path(hatBrim, hatCloth.shade) +
        path(hatBrim, hatCloth.base, ' transform="translate(-0.8 -1)"') +
        line(hatBrimTop, brass.base, 1.6) +
        anchor(50, 19.4, 0.9, brass.light, 1.1),
      anim: hatAnims,
    },
    glint([GLINT_AT.x, GLINT_AT.y]),
  ],
};

// Invested look -----------------------------------------------------------------------------------------

/** The two planks of the 1: the stem (head and torso) and the foot (the base serif), nailed over it. */
const capStem = chamfer(33, 14, 67, 85, 3);
const capFoot = chamfer(17.5, 82, 82.5, 94, 3);
/** The carved nose: the house nose, a touch longer and sharper, and its lit top facet. */
const capNose =
  'M49.4 39.2C41 39.8 26 44.4 14.6 50.8Q12.2 52.4 14.6 53.2C27 53.4 41.6 50.8 53.8 47.6Q56.6 42.2 49.4 39.2Z';
const capNoseFacet =
  'M49.4 39.2C41 39.8 26 44.4 14.6 50.8Q22.6 48.4 33.6 45.6Q44 43.2 52.6 42.6Q52 40.4 49.4 39.2Z';

function investedSpyglass(): string {
  const h = SPY.half;
  const k = (v: number) => f(v);
  return spyGroup(
    // the barrel, its rings, the leather grip with stitches
    inked(`M${k(-h)} -2.7H${k(h - 4.5)}V2.7H${k(-h)}Z`, brass.base) +
      path(`M${k(-h)} 0.9H${k(h - 4.5)}V2.7H${k(-h)}Z`, brass.shade) +
      line(`M${k(-h + 1)} -1.5H${k(h - 5.5)}`, brass.light, 0.8) +
      inked(`M${k(h - 5.5)} -3.5H${k(h)}V3.5H${k(h - 5.5)}Z`, brass.base) +
      path(`M${k(h - 5.5)} 1.3H${k(h)}V3.5H${k(h - 5.5)}Z`, brass.shade) +
      line(`M${k(h - 4.6)} -2.3H${k(h - 0.8)}`, brass.light, 0.8) +
      path(`M${k(-h + 1.6)} -2.75H${k(-h + 8.6)}V2.75H${k(-h + 1.6)}Z`, leather.base) +
      path(`M${k(-h + 1.6)} 1H${k(-h + 8.6)}V2.75H${k(-h + 1.6)}Z`, leather.shade) +
      line(
        `M${k(-h + 2.6)} -1.6L${k(-h + 3.6)} 1.6M${k(-h + 4.8)} -1.6L${k(-h + 5.8)} 1.6M${k(-h + 7)} -1.6L${k(-h + 8)} 1.6`,
        leather.light,
        0.45,
      ) +
      path(`M${k(1)} -2.75H${k(2.4)}V2.75H${k(1)}Z`, brass.shade),
  );
}

function investedDrawTube(): string {
  const h = SPY.half;
  return spyGroup(
    inked(`M${f(h - 7)} -2H${f(h + 3)}V2H${f(h - 7)}Z`, brass.base) +
      path(`M${f(h - 7)} 0.7H${f(h + 3)}V2H${f(h - 7)}Z`, brass.shade) +
      line(`M${f(h - 6)} -1H${f(h + 2.2)}`, brass.light, 0.7) +
      inked(`M${f(h + 2.2)} -2.5H${f(h + 4.2)}V2.5H${f(h + 2.2)}Z`, brass.shade),
  );
}

const capCoat = 'M35.5 58.5H64.5Q67.6 58.5 67.6 61.6V77.6L71 84.8H29L32.4 77.6V61.6Q32.4 58.5 35.5 58.5Z';

const captainInvested: AvatarDef = {
  id: pirateId(1, 'invested'),
  kind: 'symbol',
  name: pirateName(ROLE, 'invested'),
  tile,
  layers: {
    back:
      woodSlab(capStem) +
      // grain along the stem, kept off the face
      grain([
        [36.4, 60],
        [37.2, 48],
        [36.2, 36],
        [37, 22],
      ]) +
      grain([
        [63.8, 22],
        [64.4, 34],
        [63.6, 46],
        [64.4, 58],
      ]) +
      ellipse(64.2, 40.5, 0.8, 2, woodDeep) +
      // the hat's shadow on his brow
      path('M35.4 16.4H64.6V20.8Q58.5 26.6 50 28.4Q41.5 26.6 35.4 20.8Z', woodMid) +
      woodSlab(capFoot) +
      grain([
        [22, 88.5],
        [34, 87.6],
        [50, 89],
        [66, 87.8],
        [78, 88.6],
      ]) +
      nail(21.4, 88) +
      nail(78.6, 88) +
      // the coat: navy, lapels edged in brass braid, epaulettes, a cream jabot, brass buttons
      inked(capCoat, navy.base) +
      path('M60 58.5H64.5Q67.6 58.5 67.6 61.6V77.6L71 84.8H62Z', navy.shade) +
      path('M35.5 58.5H39L35 84.8H29L32.4 77.6V61.6Q32.4 58.5 35.5 58.5Z', navy.light) +
      inked('M41.6 58.5L50 70L58.4 58.5Z', cream.base) +
      path('M50 70L58.4 58.5H55.2L50 66Z', cream.shade) +
      line('M45.2 61.2Q48 63 47.4 66M52.6 61.2Q52 64 50.6 65.4', cream.shade, 0.7) +
      line('M40.6 58.6L47.6 69.6M59.4 58.6L52.4 69.6', brass.base, 1.2) +
      // epaulettes: a brass pad on each shoulder and a short fringe
      line(
        'M32.2 60.4V63.2M34.4 61V63.8M36.6 60.4V63.2M63.4 60.4V63.2M65.6 61V63.8M67.8 60.4V63.2',
        brass.shade,
        0.9,
      ) +
      inked('M30.8 60Q31.4 57.4 35 57.4Q38.6 57.4 39.2 60Q35 61.8 30.8 60Z', brass.base) +
      inked('M60.8 60Q61.4 57.4 65 57.4Q68.6 57.4 69.2 60Q65 61.8 60.8 60Z', brass.base) +
      line('M32.6 58.8Q34.4 58 36.4 58.2M62.6 58.8Q64.4 58 66.4 58.2', brass.light, 0.6) +
      circle(44.6, 72.6, 1.25, brass.base) +
      circle(55.4, 72.6, 1.25, brass.base) +
      circle(44.2, 72.2, 0.45, brass.light) +
      circle(55, 72.2, 0.45, brass.light) +
      investedSpyglass() +
      // the belt and its buckle
      inked('M32.6 76H67.4V80H32.6Z', leather.base) +
      path('M32.6 78.8H67.4V80H32.6Z', leather.shade) +
      inked('M46.2 74.8H53.8V81.2H46.2Z', brass.base) +
      path('M48.2 76.8H51.8V79.2H48.2Z', leather.shade) +
      line('M47 75.6H53', brass.light, 0.7),
    front:
      // the nose wedge, nailed on (no nail on a face), its shadow on the cheek
      path('M53 48.6C46 50.6 40 51.8 35.6 52.6L36 50.4C42 49.6 47.6 48.4 53 47.2Z', woodDeep) +
      inked(capNose, wood.base) +
      path(
        'M53.8 47.6Q56.6 42.2 49.4 39.2Q54.2 42.8 51.6 46.6C40.6 49.6 27 52 14.6 53.2C27 53.4 41.6 50.8 53.8 47.6Z',
        wood.shade,
      ) +
      path(capNoseFacet, wood.light) +
      grain(
        [
          [46.6, 45.6],
          [38, 47.2],
          [28, 49.2],
          [19.5, 51],
        ],
        woodMid,
        0.5,
      ),
  },
  face: withIris(CAPTAIN_FACE, CLOTH.denim.base),
  pivot: { x: 50, y: 50 },
  headBox: { x: 12, y: 2, size: 62 },
  base: 94,
  squash: true,
  motionBias: ['nod', 'tilt', 'bounce', 'flip'],
  gimmicks: [
    { id: 'draw-tube', z: 'behind', markup: investedDrawTube(), anim: spyAnim },
    {
      id: 'hat',
      markup:
        // a cream plume behind the crown, the crown, the brim with its braid, and the anchor
        inked('M40 12.6C33.4 11.4 27.8 8.6 26.4 4.6C31.4 3.4 38.4 5.4 43 10.6Z', cream.base) +
        line('M28.6 5.4Q35 7 40.4 11', cream.shade, 0.7) +
        inked('M34.6 19C34.6 8.2 41.6 3.6 50 3.6S65.4 8.2 65.4 19Z', hatCloth.base) +
        path('M55 4.4Q65.4 8 65.4 19H57Q58.4 10 55 4.4Z', hatCloth.shade) +
        path(
          'M38.4 16Q38.6 8.8 45.4 6.2',
          'none',
          ` stroke="${hatCloth.light}" stroke-width="1.2" stroke-linecap="round"`,
        ) +
        inked(hatBrim, hatCloth.base) +
        path('M50 25.6Q73 22.5 77.5 11Q72 19 50 21.6Z', hatCloth.shade) +
        line('M24.6 12.8Q37 17.4 50 15.2', hatCloth.light, 0.9) +
        line(hatBrimTop, brass.shade, 2.2) +
        line(hatBrimTop, brass.base, 1.3) +
        anchor(50.25, 19.65, 0.92, INK, 1.6) +
        anchor(50, 19.4, 0.92, brass.light, 1.05),
      anim: hatAnims,
    },
    glint([GLINT_AT.x, 65.5], { origin: GLINT_AT }),
  ],
};

/** The Captain, both looks. */
export const CAPTAIN: PirateCharacter = {
  digit: 1,
  looks: { house: captainHouse, invested: captainInvested },
};
