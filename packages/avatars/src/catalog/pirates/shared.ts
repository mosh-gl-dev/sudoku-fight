/**
 * The Pirates series: what every character of it shares. Read docs/avatars/PIRATES.md (the series bible) first,
 * then one.ts (the Captain) and seven.ts (Peg-leg Peg), the two the series was built from, and the other seven
 * characters' files (two.ts … nine.ts).
 *
 * Moshe's idea (30.10.2026): avatars that are only digits, in themed series of 1 to 9, with "very invested"
 * animation. Every character comes in two looks until he picks one (PIRATE_LOOKS):
 * - `house`: the current flat style (docs/avatars/STYLE.md): a round "balloon" digit, flat fills, one offset
 *   shade (draw.ts `shaded`), a highlight or two, no outlines.
 * - `invested`: the series' own typeface, a chunky digit built of wooden planks with bevelled edges, grain and
 *   nails; an ink outline, a light bevel on the edges that face the light (rim light), tonal shading and cast
 *   shadows, and a richer costume. It breaks STYLE.md §5 (no outlines) on purpose, with flat colours only (no
 *   gradients or filters, which the rig cannot carry to the phone).
 * Both looks of a character share the tile, the face anchors, pivot, headBox, squash, motionBias and the
 * gimmicks' ids and timing, so every expression and motion compares 1:1 (pirates.test.ts checks).
 *
 * This file is the series' toolbox: its colours, the plank geometry of the invested typeface, the inked
 * helpers, the gimmick building blocks and the cast's types. While the characters are drawn in parallel it is
 * frozen: a character file only imports from it. Need something else? Keep it in your own file.
 */

import { GIMMICK_RECIPES as R } from '../../gimmick';
import { CLOTH, FACE, FUR, HAIR, mix, OBJECT, type Ramp, shade, TILE } from '../../palette';
import { f } from '../../svg';
import type { AvatarDef, GimmickAnim, GimmickDef, GimmickTrigger, Localized, Point } from '../../types';
import { circle, ellipse, line, P, path, type Pt, type Side } from '../draw';

// ---------------------------------------------------------------------------------------------------------
// The cast's types

/** The two looks every character of the series is drawn in, until Moshe picks one. */
export const PIRATE_LOOKS = ['house', 'invested'] as const;
export type PirateLook = (typeof PIRATE_LOOKS)[number];

/** A digit of the series: 1 to 9 (no 0: a sudoku has none). */
export type PirateDigit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface PirateCharacter {
  /** The digit the character is. */
  digit: PirateDigit;
  /** Its two looks, one AvatarDef each. */
  looks: Readonly<Record<PirateLook, AvatarDef>>;
}

/** A look's id: `pirates-<digit>-<look>`. Stored with the user once chosen, so never renamed. */
export const pirateId = (digit: PirateDigit, look: PirateLook): string => `pirates-${digit}-${look}`;

const LOOK_NAMES: Readonly<Record<PirateLook, Localized>> = {
  house: { he: 'סגנון הבית', en: 'house style' },
  invested: { he: 'מושקע', en: 'invested' },
};

/** A look's name: the role and the look, e.g. "The Captain (house style)", "הקפטן (מושקע)". */
export const pirateName = (role: Localized, look: PirateLook): Localized => ({
  he: `${role.he} (${LOOK_NAMES[look].he})`,
  en: `${role.en} (${LOOK_NAMES[look].en})`,
});

/**
 * Each digit's tile, the same in both looks. Chosen for the picker's order (look by look, each in digit order,
 * after the creatures' walking eye and before the 8): no two neighbours are alike (catalog index.test.ts), the
 * wood of every digit reads on its tile, and none clashes with the 8 (iris) that follows the last pirate.
 */
export const PIRATE_TILES: Readonly<Record<PirateDigit, string>> = {
  1: TILE.teal,
  2: TILE.cobalt,
  3: TILE.rose,
  4: TILE.slate,
  5: TILE.leaf,
  6: TILE.orchid,
  7: TILE.sky,
  8: TILE.jade,
  9: TILE.berry,
};

// ---------------------------------------------------------------------------------------------------------
// The series' colours: ship's wood, navy cloth, brass. Mixed from the palette (STYLE.md §4), calm on purpose.

/** The digits' wood, in both looks. */
export const wood: Ramp = FUR.tawny;
/** Grain, cast shadows and the deepest bevel. */
export const woodDeep = FUR.brown.base;
/** A bevel that faces neither toward the light nor away from it; also the soft cast shadow of a hat. */
export const woodMid = mix(wood.base, wood.shade, 0.5);
export const brass: Ramp = {
  base: mix(OBJECT.gold.base, wood.base, 0.3),
  shade: mix(OBJECT.gold.shade, FUR.brown.base, 0.38),
  light: mix(OBJECT.gold.light, OBJECT.white.base, 0.3),
};
export const navy = CLOTH.navy;
export const cream = CLOTH.cream;
export const hatCloth = CLOTH.charcoal;
export const leather: Ramp = FUR.brown;
export const iron: Ramp = {
  base: CLOTH.charcoal.light,
  shade: CLOTH.charcoal.base,
  light: OBJECT.steel.shade,
};
export const steel = OBJECT.steel;
export const bandanaRed: Ramp = {
  base: CLOTH.brick.base,
  shade: CLOTH.brick.shade,
  light: CLOTH.brick.light,
};
export const patchBlack = HAIR.black;
/** The invested look's outline: the face's own ink, so lines and face read as one drawing. */
export const INK = FACE.ink;
/** Half the outline's width that shows outside a shape (it is stroked at twice this, behind the fill). */
export const OUTLINE = 1.25;
/** A dark nail head, and its glint. */
export const nailHead = shade(iron.shade, -0.25);

// ---------------------------------------------------------------------------------------------------------
// Plank geometry (the invested typeface). draw.ts stays as it is.

export type Pts = readonly Pt[];

/** A closed polygon. */
export const poly = (pts: Pts): string => `M${pts.map(P).join('L')}Z`;

/** A rectangle with its four corners cut off by `c`: the planks' chamfered corners, clockwise. */
export const chamfer = (x0: number, y0: number, x1: number, y1: number, c: number): Pt[] => [
  [x0 + c, y0],
  [x1 - c, y0],
  [x1, y0 + c],
  [x1, y1 - c],
  [x1 - c, y1],
  [x0 + c, y1],
  [x0, y1 - c],
  [x0, y0 + c],
];

/** The signed area of a polygon: > 0 when it winds clockwise on screen (y down). */
export const signedArea = (pts: Pts): number =>
  pts.reduce((a, p, i) => {
    const q = pts[(i + 1) % pts.length] ?? p;
    return a + p[0] * q[1] - q[0] * p[1];
  }, 0) / 2;

/** The inward unit normal of each edge (p_i → p_i+1) of a convex polygon, in either winding. */
export function inwardNormals(pts: Pts): Pt[] {
  const s = signedArea(pts) > 0 ? 1 : -1;
  return pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length] ?? p;
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const len = Math.hypot(dx, dy) || 1;
    return [(s * -dy) / len, (s * dx) / len];
  });
}

/** A convex polygon moved in by `b` on every edge (the inner edge of its bevel). */
export function inset(pts: Pts, b: number): Pt[] {
  const n = inwardNormals(pts);
  const cross = (u: Pt, v: Pt) => u[0] * v[1] - u[1] * v[0];
  return pts.map((p, i) => {
    const j = (i + pts.length - 1) % pts.length; // the edge that ends at p
    const prev = pts[j] ?? p;
    const nj = n[j] ?? [0, 0];
    const ni = n[i] ?? [0, 0];
    const a: Pt = [prev[0] + nj[0] * b, prev[1] + nj[1] * b];
    const u: Pt = [p[0] - prev[0], p[1] - prev[1]];
    const next = pts[(i + 1) % pts.length] ?? p;
    const c: Pt = [p[0] + ni[0] * b, p[1] + ni[1] * b];
    const v: Pt = [next[0] - p[0], next[1] - p[1]];
    const den = cross(u, v);
    if (Math.abs(den) < 1e-9) return c;
    const t = cross([c[0] - a[0], c[1] - a[1]], v) / den;
    return [a[0] + u[0] * t, a[1] + u[1] * t];
  });
}

/** Where the light comes from (STYLE.md §5: the upper left), as a unit vector toward it. */
export const LIGHT: Pt = [-0.66, -0.75];

/**
 * A bevelled slab (the invested look): the ink outline behind it, the face in `base`, and a bevel strip on each
 * edge, light where the edge faces the light, `shade` where it faces away, `mid` in between. A convex polygon:
 * build a digit of several planks, each convex, and let a later plank overlap an earlier one (the ink seam is
 * the joint). `ink: null` leaves the outline out.
 */
export function slab(pts: Pts, ramp: Ramp, bevel: number, mid: string, ink: string | null = INK): string {
  const inner = inset(pts, bevel);
  const normals = inwardNormals(pts);
  const d = poly(pts);
  let out = ink
    ? `<path d="${d}" fill="${ink}" stroke="${ink}" stroke-width="${f(2 * OUTLINE)}" stroke-linejoin="round"/>`
    : '';
  out += path(d, ramp.base);
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length] ?? p;
    const n = normals[i] ?? [0, 0];
    const facing = -n[0] * LIGHT[0] - n[1] * LIGHT[1];
    const fill = facing > 0.35 ? ramp.light : facing < -0.35 ? ramp.shade : mid;
    out += path(poly([p, q, inner[(i + 1) % pts.length] ?? q, inner[i] ?? p]), fill);
  });
  return out;
}

/** The standard wooden plank: `slab` in the series' wood, bevel 2.4 (2.2 for a narrow plank, under ~20 wide). */
export const woodSlab = (pts: Pts, bevel = 2.4): string => slab(pts, wood, bevel, woodMid);

/** An iron fitting (a band, a shoe, a hinge): `slab` in iron with a thin bevel and no mid tone. */
export const ironSlab = (pts: Pts, bevel = 1): string => slab(pts, iron, bevel, iron.base);

/** A slanted plank between two horizontal edges (a 7's stem, a 4's or a 2's diagonal), with what sits on it. */
export interface SlantedPlank {
  /** The plank's outline, clockwise from its top-left corner: for `slab`. */
  pts: Pt[];
  /** x of the plank's left and right edges at height `y` (they may lean differently: a tapered peg). */
  left: (y: number) => number;
  right: (y: number) => number;
  /** A band across the plank between y0 and y1, `over` units wider than the plank on each side. */
  band: (y0: number, y1: number, over: number) => Pt[];
}

/** A plank from its top edge (x from `top[0]` to `top[1]` at y `top[2]`) down to its bottom edge. */
export function slantedPlank(
  top: readonly [x0: number, x1: number, y: number],
  bottom: readonly [x0: number, x1: number, y: number],
): SlantedPlank {
  const [tl, tr, ty] = top;
  const [bl, br, by] = bottom;
  const left = (y: number) => tl + ((y - ty) * (bl - tl)) / (by - ty);
  const right = (y: number) => tr + ((y - ty) * (br - tr)) / (by - ty);
  return {
    pts: [
      [tl, ty],
      [tr, ty],
      [br, by],
      [bl, by],
    ],
    left,
    right,
    band: (y0, y1, over) => [
      [left(y0) - over, y0],
      [right(y0) + over, y0],
      [right(y1) + over, y1],
      [left(y1) - over, y1],
    ],
  };
}

/** The point `t` of the way along the segment, for things placed on a slanted edge (a nail on a band). */
export const along = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// ---------------------------------------------------------------------------------------------------------
// Inked pieces (the invested look's costume and props)

/** A filled path with the ink outline behind it (the invested look's costume pieces). */
export const inked = (d: string, fill: string, extra = ''): string =>
  `<path d="${d}" fill="${INK}" stroke="${INK}" stroke-width="${f(2 * OUTLINE)}" stroke-linejoin="round"${extra}/>` +
  path(d, fill, extra);

/**
 * A line with ink behind it (a hook, a strap, a rope): the ink line `inkWidth` wide, then the line. Default
 * ink: the line plus the outline on each side; thin straps use about `width` + 1.6.
 */
export const inkedLine = (d: string, color: string, width: number, inkWidth = width + 2 * OUTLINE): string =>
  line(d, INK, inkWidth) + line(d, color, width);

/** A ring, unfilled (a hoop earring, a porthole rim). */
export const ring = (x: number, y: number, r: number, color: string, width: number): string =>
  `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="none" stroke="${color}" stroke-width="${f(width)}"/>`;

/** A ring with ink behind it (Peg's brass hoop: width 1.2 on ink 2.6). */
export const inkedRing = (
  x: number,
  y: number,
  r: number,
  color: string,
  width: number,
  inkWidth = width + 1.4,
) => ring(x, y, r, INK, inkWidth) + ring(x, y, r, color, width);

/** A nail head with its glint (1.05 on a plank, 0.8 on an iron band). Never on a face. */
export const nail = (x: number, y: number, r = 1.05): string =>
  circle(x, y, r, nailHead) + circle(x - 0.35 * r, y - 0.35 * r, 0.38 * r, iron.light);

/** A thin wavy grain line through the given points (quadratic curves through the midpoints). */
export function grain(pts: Pts, color = woodDeep, width = 0.55): string {
  const [first, ...rest] = pts;
  if (!first) return '';
  let d = `M${P(first)}`;
  for (let i = 0; i < rest.length - 1; i++) {
    const p = rest[i];
    const q = rest[i + 1];
    if (p && q) d += `Q${P(p)} ${f((p[0] + q[0]) / 2)} ${f((p[1] + q[1]) / 2)}`;
  }
  const last = rest[rest.length - 1];
  if (last) d += `L${P(last)}`;
  return line(d, color, width);
}

/** An anchor emblem centred at (x, y), `s` = its height / 10, drawn as lines. */
export function anchor(x: number, y: number, s: number, color: string, width: number): string {
  const k = (v: number) => f(v * s);
  return (
    `<g transform="translate(${f(x)} ${f(y)})">` +
    `<circle cx="0" cy="${k(-3.9)}" r="${k(1.15)}" fill="none" stroke="${color}" stroke-width="${f(width)}"/>` +
    line(
      `M0 ${k(-2.7)}V${k(4.3)}M${k(-2.5)} ${k(-1.5)}H${k(2.5)}` +
        `M${k(-3.6)} ${k(1.2)}Q${k(-3.2)} ${k(4.4)} 0 ${k(4.4)}Q${k(3.2)} ${k(4.4)} ${k(3.6)} ${k(1.2)}`,
      color,
      width,
    ) +
    `</g>`
  );
}

/** A four-point sparkle (a glint on brass). */
export function star(x: number, y: number, s: number, fill: string): string {
  const k = 0.18 * s;
  return path(
    `M${f(x)} ${f(y - s)}Q${f(x + k)} ${f(y - k)} ${f(x + s)} ${f(y)}Q${f(x + k)} ${f(y + k)} ${f(x)} ${f(y + s)}` +
      `Q${f(x - k)} ${f(y + k)} ${f(x - s)} ${f(y)}Q${f(x - k)} ${f(y - k)} ${f(x)} ${f(y - s)}Z`,
    fill,
  );
}

// ---------------------------------------------------------------------------------------------------------
// The house look's counter (the round digits of digits.ts)

/**
 * An oval counter cut to the tile, with a shade lip along its top edge: the house look's hole in a 4, 6, 8 or
 * 9 (the same as digits.ts draws). The invested look paints no holes: its counters are the tile between planks.
 */
export function houseCounter(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  tile: string,
  lip: string,
): string {
  const k = 0.42;
  const a = rx * Math.sqrt(1 - k * k);
  const y = cy - k * ry;
  return (
    ellipse(cx, cy, rx, ry, tile) +
    path(
      `M${f(cx - a)} ${f(y)}A${f(rx)} ${f(ry)} 0 0 1 ${f(cx + a)} ${f(y)}` +
        `A${f(1.31 * a)} ${f(1.31 * a)} 0 0 0 ${f(cx - a)} ${f(y)}Z`,
      lip,
    )
  );
}

// ---------------------------------------------------------------------------------------------------------
// The shared face: both looks of a character use the same anchors, so expressions compare 1:1.

/** The series' brows: short and thick. Recolour them to the hair (`{ ...BROWS, color: hair.base }`). */
export const BROWS = { lift: 1.75, length: 1.75, thickness: 2.3, color: HAIR.espresso.base } as const;

/** The invested look's face: the same anchors, with a coloured iris in each eye (rig, EyeLook.iris). */
export const withIris = (face: AvatarDef['face'], iris: string): AvatarDef['face'] => ({
  ...face,
  eyes: { ...face.eyes, iris },
});

// ---------------------------------------------------------------------------------------------------------
// Gimmick building blocks: the series' timing (docs/avatars/PIRATES.md, "Gimmicks"). Both looks of a character
// pass the same arguments, so their anims stay equal.

/**
 * A hat that tips: on laugh it lifts off the head and leans around its hinge (`R.lid`), and on surprise it hops
 * up and settles a little higher. The hinge is the hat's far brim point (the Captain: his right brim tip).
 */
export function tipAndHop(hinge: Point, { angle = -15, lift = 6, ms = 1300 } = {}): readonly GimmickAnim[] {
  return [
    { ...R.lid({ angle, lift, ms }), trigger: ['laugh'], origin: hinge },
    {
      trigger: ['surprised'],
      durationMs: 700,
      keyframes: [{ t: 0, ease: 'emphasized' }, { t: 0.3, y: -3.5 }, { t: 0.7, y: -2.6 }, { t: 1 }],
      origin: hinge,
    },
  ];
}

export interface FlutterOptions {
  /** The busy sway, while the body moves or laughs. */
  angle?: number;
  ms?: number;
  /** The quiet idle sway on a stage view. */
  idleAngle?: number;
  idleMs?: number;
  trigger?: readonly GimmickTrigger[];
}

/**
 * Cloth that flutters (a bandana's knot tails, a pennant, a sail's corner, a plume): a fast sway while the body
 * moves or laughs, a slow one when idle. `root` is where the cloth is tied.
 */
export function flutter(
  root: Point,
  {
    angle = 12,
    ms = 520,
    idleAngle = 5,
    idleMs = 3000,
    trigger = ['laugh', 'wobble', 'spin', 'flip'],
  }: FlutterOptions = {},
): readonly GimmickAnim[] {
  return [
    { ...R.sway({ angle, ms }), trigger, origin: root },
    { ...R.sway({ angle: idleAngle, ms: idleMs }), trigger: ['idle'], origin: root },
  ];
}

export interface WaveOptions {
  /** The wave, while happy. */
  angle?: number;
  ms?: number;
  /** The quiet idle sway on a stage view. */
  idleAngle?: number;
  idleMs?: number;
  trigger?: readonly GimmickTrigger[];
  /** Which side of the body the arm is on: the surprised jerk turns it up, toward the face. */
  side?: Side;
}

/**
 * A raised hand that waves (Peg's hook; a map, a ladle, a compass held up): it waves while happy, sways when
 * idle, and jerks up on surprise and holds. `wrist` is the pivot.
 */
export function wave(
  wrist: Point,
  {
    angle = 16,
    ms = 760,
    idleAngle = 6,
    idleMs = 2800,
    trigger = ['laugh', 'smile', 'wink'],
    side = -1,
  }: WaveOptions = {},
): readonly GimmickAnim[] {
  return [
    { ...R.sway({ angle, ms }), trigger, origin: wrist },
    { ...R.sway({ angle: idleAngle, ms: idleMs }), trigger: ['idle'], origin: wrist },
    {
      trigger: ['surprised'],
      durationMs: 800,
      keyframes: [
        { t: 0, ease: 'emphasized' },
        { t: 0.3, rotate: -side * 14, y: -2 },
        { t: 1, rotate: -side * 10, y: -1.5 },
      ],
      origin: wrist,
    },
  ];
}

export interface GlintOptions {
  /** The sparkle's half size. */
  size?: number;
  ms?: number;
  trigger?: readonly GimmickTrigger[];
  /** Where it scales from: default its centre. Keep it the same in both looks. */
  origin?: Point;
  id?: string;
  color?: string;
}

/** A glint that flashes on brass (a button, a buckle, a compass): a hidden sparkle, `R.sparks`, on idle and smile. */
export function glint(
  at: Pt,
  {
    size = 3.2,
    ms = 2200,
    trigger = ['idle', 'smile'],
    origin = { x: at[0], y: at[1] },
    id = 'glint',
    color = OBJECT.white.base,
  }: GlintOptions = {},
): GimmickDef {
  return {
    id,
    rest: 'hidden',
    markup: star(at[0], at[1], size, color),
    anim: { ...R.sparks({ ms }), trigger, origin },
  };
}
