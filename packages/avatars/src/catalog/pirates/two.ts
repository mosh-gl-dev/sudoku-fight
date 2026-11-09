/**
 * 2, the Pirate Lady (Moshe's "2 is the pirate lady"), the ship's quartermaster, who keeps the treasure map.
 * Read docs/avatars/PIRATES.md first; the series' toolbox is shared.ts, the references one.ts and seven.ts.
 *
 * The digit is the body: the 2's round top is her head (the face on it), the swan curve below it her long,
 * graceful neck, and the slanted stroke her plum coat, its hem on the base bar. A wide plum hat with a long rose
 * plume (not a tricorne: that is the Captain's), auburn hair falling down the back of her neck, a pearl choker
 * and a pearl drop earring (not a hoop: that is Peg's), a lace jabot, and the treasure map rolled up and tucked
 * into her mustard sash, along the 2's slanted stroke so it never breaks the numeral. No guns, no blades.
 *
 * Her moves: the map unrolls when she laughs (and rolls back up), wiggles in her sash when she smiles and pops up
 * when she is surprised; the plume flutters with her motions, springs up on surprise and droops when she is sad
 * or sleepy. Her favourite motion is a graceful head tilt.
 *
 * The open sheet of the map is the one `rest: 'hidden'` part that is not a sparkle (PIRATES.md section 10): it
 * exists only while she shows it; at rest the map is rolled up in her sash, so the rest pose is complete.
 *
 * In a locked board cell (22 px) the app crops to `headBox`: her hat, hair and face, never the coat and the
 * base, so she never reads as a placed 2.
 */

import { GIMMICK_RECIPES as R } from '../../gimmick';
import { CLOTH, FACE, HAIR, mix, OBJECT, type Ramp, shade } from '../../palette';
import { f } from '../../svg';
import type { AvatarDef, GimmickAnim } from '../../types';
import { circle, ellipse, line, path, type Pt, shaded } from '../draw';
import {
  BROWS,
  brass,
  chamfer,
  cream,
  flutter,
  grain,
  INK,
  inked,
  nail,
  PIRATE_TILES,
  type PirateCharacter,
  pirateId,
  pirateName,
  type Pts,
  slantedPlank,
  withIris,
  wood,
  woodDeep,
  woodMid,
  woodSlab,
} from './shared';

const ROLE = { he: 'הגברת הפיראטית', en: 'The Pirate Lady' } as const;
const tile = PIRATE_TILES[2];
const hair = HAIR.auburn;
const coat = CLOTH.plum;
/** Her hat: a deeper plum than the coat, so hat and coat read as two pieces of one outfit. */
const hatPlum: Ramp = {
  base: CLOTH.plum.shade,
  shade: shade(CLOTH.plum.shade, -0.22),
  light: CLOTH.plum.base,
};
/** The plume: a rose ostrich feather. */
const plume: Ramp = HAIR.pink;
const sash = CLOTH.mustard;
/** The map's parchment: cream aged toward the wood. */
const parchment: Ramp = {
  base: mix(CLOTH.cream.base, wood.light, 0.25),
  shade: mix(CLOTH.cream.shade, wood.base, 0.3),
  light: CLOTH.cream.light,
};
const pearl = OBJECT.white;
const xRed = OBJECT.red;
const sea = OBJECT.blue;

const LADY_FACE: AvatarDef['face'] = {
  ink: FACE.ink,
  eyes: { left: { x: 41.5, y: 34.5 }, right: { x: 58.5, y: 34.5 }, r: 5.3, style: 'round' },
  brows: { ...BROWS, color: hair.base },
  mouth: { x: 50, y: 45.5, w: 14 },
  cheeks: { color: FACE.blush, dx: 0.55, dy: 1.45, size: 0.72 },
  halo: { x: 50, y: 4 },
};

// The moving parts, the same in both looks -----------------------------------------------------------------

/**
 * The plume is tucked into the hat band at its brooch; it sweeps up and out to the upper left (so turning it
 * clockwise, a positive angle, stands it up; anticlockwise lowers it). It reacts to every mood: it flutters
 * with her motions and her laugh (12°, as Peg's tails), springs up on surprise, bristles upright when she is
 * cross, droops and twitches when she is puzzled, circles when she is dizzy and droops when she is sad.
 */
const PLUME_ROOT = { x: 38, y: 14.2 } as const;
const plumeAnims: readonly GimmickAnim[] = [
  ...flutter(PLUME_ROOT, { angle: 12, trigger: ['laugh', 'wobble', 'spin', 'flip', 'bounce', 'tilt'] }),
  {
    // it springs up on surprise, and holds
    trigger: ['surprised'],
    durationMs: 800,
    keyframes: [
      { t: 0, ease: 'emphasized' },
      { t: 0.3, rotate: 8, y: -0.6 },
      { t: 0.6, rotate: 6, y: -0.4 },
      { t: 1, rotate: 6, y: -0.4 },
    ],
    origin: PLUME_ROOT,
  },
  {
    // it droops when she is sad or sleepy
    trigger: ['sad', 'sleepy'],
    durationMs: 1000,
    keyframes: [
      { t: 0, ease: 'standard' },
      { t: 0.7, rotate: -15 },
      { t: 1, rotate: -13 },
    ],
    origin: PLUME_ROOT,
  },
  {
    // cross, it bristles upright and holds
    trigger: ['angry'],
    durationMs: 700,
    keyframes: [
      { t: 0, ease: 'emphasized' },
      { t: 0.3, rotate: 16 },
      { t: 0.5, rotate: 13 },
      { t: 1, rotate: 14 },
    ],
    origin: PLUME_ROOT,
  },
  {
    // puzzled, it droops and twitches twice
    trigger: ['confused'],
    durationMs: 760,
    loop: true,
    keyframes: [
      { t: 0 },
      { t: 0.2, rotate: -7 },
      { t: 0.35, rotate: -3 },
      { t: 0.5, rotate: -8 },
      { t: 0.65, rotate: -3 },
      { t: 1 },
    ],
    origin: PLUME_ROOT,
  },
  // dizzy, it circles round
  { ...R.sway({ angle: 10, ms: 520 }), trigger: ['dizzy'], origin: PLUME_ROOT },
];

/**
 * The rolled map, tucked into her sash: its axis through `x, y` at `deg` (up and to the right), `half` its half
 * length, `r` its radius. It is drawn level and turned by `deg`, and so is the sheet that unrolls from it.
 */
const MAP = { x: 48.5, y: 71.5, deg: -60, half: 8, r: 3.4 } as const;
const MAP_AXIS = { x: MAP.x, y: MAP.y } as const;
/** How deep the open sheet hangs from the roll. */
const SHEET_DEPTH = 21;
const mapDir: Pt = [Math.cos((MAP.deg * Math.PI) / 180), Math.sin((MAP.deg * Math.PI) / 180)];
const mapGroup = (inner: string) =>
  `<g transform="rotate(${f(MAP.deg)} ${f(MAP.x)} ${f(MAP.y)})">${inner}</g>`;

/** The roll wiggles and bobs in the sash when she smiles, idles a little, and pops up out of it on surprise. */
const POP = 4.5;
const scrollAnims: readonly GimmickAnim[] = [
  {
    trigger: ['smile', 'wink'],
    durationMs: 760,
    loop: true,
    keyframes: [
      { t: 0 },
      { t: 0.25, rotate: 7, y: -1.5 },
      { t: 0.5 },
      { t: 0.75, rotate: -7, y: -1.5 },
      { t: 1 },
    ],
    origin: MAP_AXIS,
  },
  {
    trigger: ['idle'],
    durationMs: 2800,
    loop: true,
    keyframes: [{ t: 0 }, { t: 0.25, rotate: 3 }, { t: 0.75, rotate: -3 }, { t: 1 }],
    origin: MAP_AXIS,
  },
  {
    trigger: ['surprised'],
    durationMs: 900,
    keyframes: [
      { t: 0, ease: 'emphasized' },
      { t: 0.3, x: mapDir[0] * POP * 1.1, y: mapDir[1] * POP * 1.1, ease: 'standard' },
      { t: 0.6, x: mapDir[0] * POP * 0.7, y: mapDir[1] * POP * 0.7 },
      { t: 1, x: mapDir[0] * POP * 0.7, y: mapDir[1] * POP * 0.7 },
    ],
    origin: MAP_AXIS,
  },
];

/**
 * The map unrolls from the roll when she laughs, shows the X, and rolls back up. The sheet is drawn level,
 * under the roll's axis; every keyframe turns it to the roll's angle, so it opens down and out to the right.
 */
const mapAnim: GimmickAnim = {
  trigger: ['laugh'],
  durationMs: 1500,
  keyframes: [
    { t: 0, rotate: MAP.deg, sy: 0.08, opacity: 0, ease: 'emphasized' },
    { t: 0.06, rotate: MAP.deg, sy: 0.3, opacity: 1, ease: 'emphasized' },
    { t: 0.3, rotate: MAP.deg, sy: 1.04 },
    { t: 0.42, rotate: MAP.deg, sy: 1, ease: 'standard' },
    { t: 0.8, rotate: MAP.deg, sy: 1, ease: 'standard' },
    { t: 0.96, rotate: MAP.deg, sy: 0.12 },
    { t: 1, rotate: MAP.deg, sy: 0.08, opacity: 0 },
  ],
  origin: MAP_AXIS,
};

// Shared shapes ------------------------------------------------------------------------------------------

/** The hat, tilted a little to her left (the viewer's right): crown, band, brim. */
const HAT_TILT = ' transform="rotate(5 50 18)"';
const hatCrown = 'M34 19C33.6 9.4 40.4 4.6 50 4.6S66.4 9.4 66 19Z';
const hatBand = 'M34.2 15.2Q50 13.4 65.8 15.2L66 19.2H34Z';
const hatBrim =
  'M14.6 17.4Q16 13.6 25 14.2Q38 15.6 50 15.6Q62 15.6 75 14.2Q84 13.6 85.4 17.4Q80.6 24.6 50 24Q19.4 24.6 14.6 17.4Z';
const hatBrimTop = 'M16.4 15.6Q25 14.6 38 15.8Q50 16.4 62 15.8Q75 14.6 83.6 15.6';

/**
 * The plume at rest: an ostrich feather along a curved quill from its root in the band (`root`) out to its tip,
 * fuller toward the end, its fronds scalloped along the upper edge (the lower edge tucks behind the brim).
 */
const PLUME = {
  root: [38, 14.2],
  bend: [27.4, 5.4],
  tip: [12.6, 9.6],
  upper: 4.6,
  lower: 3.4,
  fronds: 7,
} as const;

function plumePaths(): { outline: string; under: string; quill: string; barbs: string } {
  const [r, c, t] = [PLUME.root, PLUME.bend, PLUME.tip];
  const at = (s: number): Pt => [
    (1 - s) ** 2 * r[0] + 2 * s * (1 - s) * c[0] + s ** 2 * t[0],
    (1 - s) ** 2 * r[1] + 2 * s * (1 - s) * c[1] + s ** 2 * t[1],
  ];
  /** The unit normal toward the upper edge. */
  const up = (s: number): Pt => {
    const dx = 2 * (1 - s) * (c[0] - r[0]) + 2 * s * (t[0] - c[0]);
    const dy = 2 * (1 - s) * (c[1] - r[1]) + 2 * s * (t[1] - c[1]);
    const len = Math.hypot(dx, dy) || 1;
    return [-dy / len, dx / len];
  };
  const width = (s: number) => Math.sin(Math.PI * Math.min(1, s ** 1.25 * 0.94 + 0.03));
  const n = PLUME.fronds;
  const ss = Array.from({ length: n + 1 }, (_, i) => i / n);
  const edge = (s: number, w: number): Pt => {
    const p = at(s);
    const u = up(s);
    return [p[0] + u[0] * w * width(s), p[1] + u[1] * w * width(s)];
  };
  const upper = ss.map((s) => edge(s, PLUME.upper));
  const lower = ss.map((s) => edge(s, -PLUME.lower));
  const P2 = (p: Pt) => `${f(p[0])} ${f(p[1])}`;
  // the upper edge: one scallop per frond, bulging out
  let outline = `M${P2(upper[0]!)}`;
  for (let i = 1; i <= n; i++) {
    const a = upper[i - 1]!;
    const b = upper[i]!;
    const u = up((ss[i - 1]! + ss[i]!) / 2);
    const k = 1.25 * Math.min(1, 0.4 + ss[i]!);
    outline += `Q${f((a[0] + b[0]) / 2 + u[0] * k)} ${f((a[1] + b[1]) / 2 + u[1] * k)} ${P2(b)}`;
  }
  // round the tip, then the smooth lower edge back to the root
  const tipOut = at(1.06);
  outline += `Q${P2(tipOut)} ${P2(lower[n]!)}`;
  const back = [...lower].reverse();
  const smooth = (pts: Pt[]) => {
    let d = '';
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i]!;
      const q = pts[i + 1]!;
      d += `Q${P2(p)} ${f((p[0] + q[0]) / 2)} ${f((p[1] + q[1]) / 2)}`;
    }
    return `${d}L${P2(pts[pts.length - 1]!)}`;
  };
  outline += `${smooth(back)}Z`;
  // the underside: between the lower edge and a line a little below the quill
  const mid = ss.map((s) => edge(s, -0.6));
  const under = `M${P2(lower[n]!)}${smooth(back)}L${P2(mid[0]!)}${smooth(mid)}Z`;
  const quill = `M${P2(at(0.04))}Q${P2(c)} ${P2(at(0.94))}`;
  const barbs = [0.3, 0.5, 0.7]
    .map((s) => {
      const a = at(s);
      const b = edge(s + 0.08, PLUME.upper * 0.75);
      return `M${P2(a)}L${P2(b)}`;
    })
    .join('');
  return { outline, under, quill, barbs };
}
const { outline: plumeShape, under: plumeUnder, quill: plumeSpine, barbs: plumeBarbs } = plumePaths();

/** Her hair: a lock down the left side to the 2's top terminal, a long fall down the back of her neck. */
const hairLeft =
  'M31.6 21.6A25.5 25.5 0 0 0 24.5 38.5V43Q24.6 47.4 28.6 49Q32.8 47 33.2 41.6Q33.6 32.6 36 23.4Q34 21.8 31.6 21.6Z';
const hairRight =
  'M68.4 21.6A25.5 25.5 0 0 1 75.5 38.5C75.5 48 68 57.6 62.6 63.4Q60.6 64.2 60.4 62.6' +
  'C64.8 56.6 66.4 50.8 66.2 44.4C66 37.6 66.4 28.6 64.2 23.4Q66.2 21.8 68.4 21.6Z';

/** The pearl choker round her neck. */
const pearls: Pts = [
  [43.4, 58.8],
  [46.2, 59.6],
  [49, 60.1],
  [51.8, 60.2],
  [54.6, 59.9],
  [57.3, 59.2],
];

/** Her pearl drop earring, hanging from under the left lock. */
const EARRING: Pt = [29.4, 53];
const EARRING_HOOK = 'M29.2 49.4Q29.6 50.6 29.4 51.6';

/** The sash round her waist, over the rolled map; its knot and tails on her left hip. */
const sashBand = 'M25.4 71.2Q40 72.6 54.4 71.2L50.4 75.6Q36 77 21 75.6Z';
const sashKnot = 'M23.4 71.6Q27.2 70.6 28.6 73.4Q27.2 76.4 23 75.6Q21.8 73.4 23.4 71.6Z';
const sashTails = 'M24.2 75.2L20.6 82.4L23.4 81.6L24.4 84L27.4 76Z';

/** The lace jabot at her neckline. */
const jabot = 'M36.2 65.6Q41 64.6 45.6 64.8L40.4 71.4Q36.8 69.4 36.2 65.6Z';

// The map's parts, drawn level around its axis (mapGroup turns them).
const { x: MX, y: MY, half: MH, r: MR } = MAP;
const rect = (x0: number, y0: number, x1: number, y1: number) =>
  `M${f(x0)} ${f(y0)}H${f(x1)}V${f(y1)}H${f(x0)}Z`;
/** An end of the roll: an oval cap, its spiral inside. */
const capPath = (x: number, r: number) =>
  `M${f(x)} ${f(MY - r)}A${f(0.5 * r)} ${f(r)} 0 0 1 ${f(x)} ${f(MY + r)}A${f(0.5 * r)} ${f(r)} 0 0 1 ${f(x)} ${f(MY - r)}Z`;
const spiral = (x: number) =>
  `M${f(x + 0.2)} ${f(MY - 1.6)}A0.9 1.6 0 1 1 ${f(x - 0.6)} ${f(MY + 0.6)}A0.5 0.9 0 1 1 ${f(x + 0.2)} ${f(MY - 0.2)}`;
/** The open sheet, level under the roll's axis: an island in the sea, a dashed trail to the X. */
const SX0 = MX - MH + 0.8;
const SX1 = MX + MH - 0.8;
const SY1 = MY + SHEET_DEPTH;
/** A point on the sheet, from the middle of the roll's axis. */
const on = (dx: number, dy: number) => `${f(MX + dx)} ${f(MY + dy)}`;
const island =
  `M${on(-4.9, 9.4)}Q${on(-4.5, 5.4)} ${on(-0.1, 5.8)}Q${on(2.9, 5)} ${on(4.5, 7.4)}Q${on(6.5, 10.4)} ${on(4.9, 13.6)}` +
  `Q${on(4.1, 17)} ${on(0.1, 16.6)}Q${on(-3.9, 17.2)} ${on(-4.7, 13.8)}Q${on(-5.9, 11.6)} ${on(-4.9, 9.4)}Z`;
const waves =
  `M${on(-5.4, 3)}Q${on(-4.6, 2)} ${on(-3.8, 3)}Q${on(-3, 4)} ${on(-2.2, 3)}` +
  `M${on(1.6, 19)}Q${on(2.4, 18)} ${on(3.2, 19)}Q${on(4, 20)} ${on(4.8, 19)}`;
const trail = `M${on(-3.6, 8.2)}L${on(-2.8, 9)}M${on(-2, 9.8)}L${on(-1.2, 10.6)}M${on(-0.5, 11.3)}L${on(0, 11.8)}`;
const xMark = (cx: number, cy: number, s: number) =>
  `M${f(cx - s)} ${f(cy - s)}L${f(cx + s)} ${f(cy + s)}M${f(cx + s)} ${f(cy - s)}L${f(cx - s)} ${f(cy + s)}`;
const X_AT: Pt = [MX + 1.8, MY + 13];
const islandGreen = OBJECT.green;

// House look --------------------------------------------------------------------------------------------

/** The 2: her round head, the swan curve of her neck, the slanted stroke and the base bar. */
const ladyHouseBody =
  'M24.5 38.5A25.5 25.5 0 0 1 75.5 38.5C75.5 48 66 59.5 62 63.5L45.5 80H75Q81.5 80 81.5 86.5Q81.5 93 75 93H25' +
  'Q18.5 93 18.5 86.5V84Q18.5 81 21 78.5L41.5 58Q34 50.6 28.6 49Q24.5 47.6 24.5 43Z';
/** Her coat on the slanted stroke, its hem flaring onto the base bar. */
const houseCoat =
  'M31 66.2Q45.4 63.8 59.5 66L45.5 80Q47.6 81.2 48.4 83.4Q33 84.6 18.6 83.2Q17.4 81.6 17.2 79.8Z';
const houseCoatShade =
  'M59.5 66L45.5 80Q47.6 81.2 48.4 83.4Q45.6 83.7 43.2 83.8Q44 81.6 42.4 80.4L56.6 66.1Z';

function houseScroll(): string {
  return mapGroup(
    path(rect(MX - MH, MY - MR, MX + MH, MY + MR), parchment.shade) +
      path(rect(MX - MH, MY - MR, MX + MH, MY + 1), parchment.base) +
      path(capPath(MX + MH, MR), parchment.shade) +
      line(spiral(MX + MH), woodDeep, 0.5) +
      path(rect(MX + 2.4, MY - MR, MX + 4.4, MY + MR), xRed.base),
  );
}

function houseSheet(): string {
  return (
    path(rect(SX0, MY, SX1, SY1), parchment.shade) +
    path(rect(SX0, MY, SX1 - 1.4, SY1), parchment.base) +
    line(waves, sea.base, 0.9) +
    path(island, islandGreen.light) +
    path(
      `M${on(4.9, 13.6)}Q${on(4.1, 17)} ${on(0.1, 16.6)}Q${on(-3.9, 17.2)} ${on(-4.7, 13.8)}Q${on(0, 15.2)} ${on(4.9, 13.6)}Z`,
      islandGreen.base,
    ) +
    line(trail, woodDeep, 0.8) +
    line(xMark(X_AT[0], X_AT[1], 1.7), xRed.base, 1.4) +
    path(rect(SX0 - 0.6, SY1 - 1.8, SX1 + 0.6, SY1 + 1.8), parchment.shade)
  );
}

const ladyHouse: AvatarDef = {
  id: pirateId(2, 'house'),
  kind: 'symbol',
  name: pirateName(ROLE, 'house'),
  tile,
  layers: {
    back:
      shaded(ladyHouseBody, wood.base, wood.shade) +
      ellipse(31, 30, 1.6, 4.6, wood.light, 22) +
      ellipse(28, 86.6, 3.4, 1.3, wood.light) +
      // the shade her chin casts on her neck
      path('M38.8 56.2Q50 61.4 66.6 56.8L64.4 59.6Q52 63.4 41.8 58.6Z', wood.shade) +
      // the hair, the pearls
      path(hairLeft, hair.base) +
      path(hairRight, hair.base) +
      line('M27.6 30Q28.6 25.4 32 23.6', hair.light, 1.1) +
      pearls.map(([x, y]) => circle(x, y, 1.25, pearl.base)).join('') +
      // a pearl drop at her ear, under the lock
      line(EARRING_HOOK, brass.base, 0.7) +
      circle(EARRING[0], EARRING[1], 1.5, pearl.base) +
      // the coat, and the lace jabot at its neckline
      path(houseCoat, coat.base) +
      path(houseCoatShade, coat.shade) +
      path(jabot, cream.base) +
      path('M45.6 64.8L40.4 71.4Q39.4 70.8 38.8 70L43.4 64.8Z', cream.shade),
    front:
      // the sash over the rolled map, its knot and tails
      path(sashBand, sash.base) +
      path('M21 75.6Q36 77 50.4 75.6L51.6 74.2Q36 75.4 22.2 74.2Z', sash.shade) +
      path(sashTails, sash.shade) +
      path(sashKnot, sash.base) +
      // the hat: the brim, the crown, the band and the brooch that holds the plume
      `<g${HAT_TILT}>` +
      path(hatBrim, hatPlum.shade) +
      path(hatBrim, hatPlum.base, ' transform="translate(-0.6 -0.9)"') +
      path(hatCrown, hatPlum.shade) +
      path('M34 19C33.6 9.4 40.4 4.6 50 4.6C57.6 4.6 63.4 8.8 64 19Z', hatPlum.base) +
      path(hatBand, sash.base) +
      line(hatBrimTop, hatPlum.light, 1) +
      circle(38, 16.6, 2.4, brass.base) +
      circle(37.4, 16, 0.8, brass.light) +
      `</g>`,
  },
  face: LADY_FACE,
  pivot: { x: 50, y: 46 },
  headBox: { x: 20, y: 3, size: 60 },
  base: 93,
  squash: true,
  motionBias: ['tilt', 'spin', 'nod', 'bounce'],
  gimmicks: [
    {
      id: 'plume',
      z: 'back',
      markup:
        path(plumeShape, plume.base) + path(plumeUnder, plume.shade) + line(plumeSpine, plume.light, 0.9),
      anim: plumeAnims,
    },
    { id: 'map', z: 'back', rest: 'hidden', markup: houseSheet(), anim: mapAnim },
    { id: 'scroll', z: 'back', markup: houseScroll(), anim: scrollAnims },
  ],
};

// Invested look -----------------------------------------------------------------------------------------

/** Her neck and coat's stroke: one slanted plank from under her chin to the base bar. */
const neck = slantedPlank([49.5, 75.5, 50], [17.5, 43.5, 82]);
/** Her head: an octagon plank, its lower right cut along the neck's back so the 2's curve runs on. */
const head: Pt[] = [
  [36, 15],
  [64, 15],
  [76, 27],
  [76, 49.5],
  [68.5, 57],
  [37, 57],
  [24, 44],
  [24, 27],
];
/** The base bar, nailed over the foot of the slanted plank. */
const foot = chamfer(15, 81, 85, 94, 3);

const investedCoat =
  'M30.6 66.4Q45.4 64 59.7 65.8L46 79.6Q48.6 81 49.4 83.8Q33 85.4 16.6 83.8Q15.4 82 16.4 79.6Z';

function investedScroll(): string {
  return mapGroup(
    inked(rect(MX - MH, MY - MR, MX + MH, MY + MR), parchment.base) +
      path(rect(MX - MH, MY + 1, MX + MH, MY + MR), parchment.shade) +
      line(`M${f(MX - MH + 1.4)} ${f(MY - 1.8)}H${f(MX + MH - 1.4)}`, parchment.light, 0.8) +
      inked(capPath(MX + MH, MR), parchment.shade) +
      line(spiral(MX + MH), woodDeep, 0.5) +
      inked(rect(MX + 2.4, MY - MR - 0.3, MX + 4.4, MY + MR + 0.3), xRed.base) +
      path(rect(MX + 2.4, MY + 1.2, MX + 4.4, MY + MR + 0.3), xRed.shade),
  );
}

function investedSheet(): string {
  return (
    inked(rect(SX0, MY, SX1, SY1), parchment.base) +
    path(rect(SX1 - 2, MY, SX1, SY1), parchment.shade) +
    line(waves, sea.base, 0.9) +
    inked(island, islandGreen.light) +
    path(
      `M${on(4.9, 13.6)}Q${on(4.1, 17)} ${on(0.1, 16.6)}Q${on(-3.9, 17.2)} ${on(-4.7, 13.8)}Q${on(0, 15.2)} ${on(4.9, 13.6)}Z`,
      islandGreen.base,
    ) +
    line(trail, woodDeep, 0.7) +
    line(xMark(X_AT[0], X_AT[1], 1.7), INK, 2.4) +
    line(xMark(X_AT[0], X_AT[1], 1.7), xRed.base, 1.3) +
    inked(rect(SX0 - 0.6, SY1 - 1.8, SX1 + 0.6, SY1 + 1.8), parchment.shade)
  );
}

const ladyInvested: AvatarDef = {
  id: pirateId(2, 'invested'),
  kind: 'symbol',
  name: pirateName(ROLE, 'invested'),
  tile,
  layers: {
    back:
      // the slanted plank and its grain, then the foot plank nailed over it
      woodSlab(neck.pts, 2.4) +
      grain([
        [37.4, 64.8],
        [39.4, 62.6],
        [41.4, 61],
      ]) +
      woodSlab(foot) +
      grain([
        [20, 89.4],
        [34, 88.6],
        [50, 90],
        [66, 88.8],
        [80, 89.6],
      ]) +
      ellipse(68, 86.4, 2, 0.8, woodDeep) +
      nail(19.4, 88.6) +
      nail(80.6, 88.6) +
      // the coat over the plank's lower half, its hem on the foot
      inked(investedCoat, coat.base) +
      path(
        'M59.7 65.8L46 79.6Q48.6 81 49.4 83.8Q46.4 84.1 43.6 84.2Q44.6 81.8 42.6 80.6L56.8 65.9Z',
        coat.shade,
      ) +
      path(
        'M30.6 66.4Q32.6 66 34.6 65.9L21.4 79.2Q19.4 81.2 19.4 84L16.6 83.8Q15.4 82 16.4 79.6Z',
        coat.light,
      ) +
      line('M17.2 84Q33 85.6 49 84', brass.base, 1.1) +
      inked(jabot, cream.base) +
      path('M45.6 64.8L40.4 71.4Q39.4 70.8 38.8 70L43.4 64.8Z', cream.shade) +
      line('M37.8 67.2Q40.4 67.2 42.6 66.2M38.8 69.4Q40.2 69.2 41.2 68.6', cream.shade, 0.6) +
      // the head plank over the neck (its sides are under her hair, so no grain on it)
      woodSlab(head) +
      // the hat's shadow on her brow, the hair, the pearls
      path('M27 21.4Q50 26.4 73 22.4V25.6Q50 30.4 27 25.2Z', woodMid) +
      inked(hairLeft, hair.base) +
      inked(hairRight, hair.base) +
      path('M24.5 40Q28 42 32.6 42.6Q32 46.6 28.6 49Q24.6 47.4 24.5 43Z', hair.shade) +
      path(
        'M75.5 40Q71 44 66.2 45.6Q65.6 52 60.6 62.6Q62 63.8 62.6 63.4C68 57.6 75.5 48 75.5 40Z',
        hair.shade,
      ) +
      line('M27.6 30Q28.6 25.4 32 23.6M70 25.4Q73 29 74 34', hair.light, 1) +
      pearls
        .map(([x, y]) => circle(x, y, 1.3, pearl.base) + circle(x - 0.4, y - 0.4, 0.45, pearl.light))
        .join('') +
      line(EARRING_HOOK, INK, 1.6) +
      line(EARRING_HOOK, brass.base, 0.7) +
      circle(EARRING[0], EARRING[1], 1.5, pearl.base) +
      circle(EARRING[0] - 0.5, EARRING[1] - 0.5, 0.5, pearl.light),
    front:
      inked(sashBand, sash.base) +
      path('M21 75.6Q36 77 50.4 75.6L51.6 74.2Q36 75.4 22.2 74.2Z', sash.shade) +
      line('M25.4 72.4Q40 73.8 53.4 72.4', sash.light, 0.7) +
      inked(sashTails, sash.shade) +
      inked(sashKnot, sash.base) +
      `<g${HAT_TILT}>` +
      inked(hatBrim, hatPlum.base) +
      path('M50 24Q80.6 24.6 85.4 17.4Q79 21.6 50 21.4Z', hatPlum.shade) +
      line('M17.4 18.6Q30 22.4 50 22.4', hatPlum.light, 0.9) +
      inked(hatCrown, hatPlum.base) +
      path('M56 5.4Q66.4 9.4 66 19H58.4Q59.6 10.6 56 5.4Z', hatPlum.shade) +
      line('M39 15Q39.4 9 45.4 6.6', hatPlum.light, 1.1) +
      inked(hatBand, sash.base) +
      path('M34.1 17.6Q50 16.6 65.9 17.6L66 19.2H34Z', sash.shade) +
      line(hatBrimTop, brass.base, 1) +
      inked('M38 13.8A2.8 2.8 0 1 1 37.99 13.8Z', brass.base) +
      circle(37.2, 15.8, 0.8, brass.light) +
      `</g>`,
  },
  face: withIris(LADY_FACE, CLOTH.plum.light),
  pivot: { x: 50, y: 46 },
  headBox: { x: 20, y: 3, size: 60 },
  base: 94,
  squash: true,
  motionBias: ['tilt', 'spin', 'nod', 'bounce'],
  gimmicks: [
    {
      id: 'plume',
      z: 'back',
      markup:
        inked(plumeShape, plume.base) +
        path(plumeUnder, plume.shade) +
        line(plumeSpine, plume.light, 0.8) +
        line(plumeBarbs, plume.shade, 0.5),
      anim: plumeAnims,
    },
    { id: 'map', z: 'back', rest: 'hidden', markup: investedSheet(), anim: mapAnim },
    { id: 'scroll', z: 'back', markup: investedScroll(), anim: scrollAnims },
  ],
};

/** The Pirate Lady, both looks. */
export const PIRATE_LADY: PirateCharacter = {
  digit: 2,
  looks: { house: ladyHouse, invested: ladyInvested },
};
