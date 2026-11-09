import {
  type ChapterLayout,
  cubicAt,
  MAP,
  type MapLayout,
  nodeBox,
  type Point,
  type Rect,
  tokenBox,
  tokenSpot,
} from './mapModel';

/**
 * The quiet scenery beside the road (components.md §19.14, LEVEL_UI.mapScenery): what makes each chapter a place
 * of its own without a ground of its own. Pure and seeded (no Math.random): the same chapter, width and direction
 * always give the same scenery. Nothing here is opaque over a wide area, so the wandering digits behind the app
 * (D126) still show; nothing moves; nothing is read by a screen reader.
 *
 * - **zones:** two big rounded patches in the chapter's tone (translucent), in the bays the road leaves empty;
 *   they may pass under the road and the coins;
 * - **grid:** a faint, empty 3 × 3 sudoku box. No digits in the scenery: the only digits behind the app are the
 *   small wandering ones (D126, Moshe 31.10.2026: "מספרים קטנים (בין 6 ל12 DP) משוטטים על המסך"), never big
 *   still ones beside them;
 * - **signpost:** the chapter's number on a little sign beside the first stage;
 * - **pennant:** a small flag beside the boss;
 * - **sparkles:** three tiny gold four-point stars.
 *
 * Every item but the zones keeps clear of the road (34 dp from its middle line), of every coin's box and every
 * place my token can stand (8 dp), and of the gateway (banner, pillars, sign, barrier, start pad) and the finish;
 * an item with no room on its side tries the other side, then is left out.
 */

export type SceneryItem =
  | { kind: 'zone'; rect: Rect; rotate: number }
  | { kind: 'grid'; rect: Rect; rotate: number }
  | { kind: 'signpost'; rect: Rect; arrow: 1 | -1 }
  | { kind: 'pennant'; rect: Rect }
  | { kind: 'sparkle'; rect: Rect };

export const SCENERY = {
  /** Clear of the road's middle line, and of a coin's box, a token's place or the gateway. */
  roadClear: 34,
  boxClear: 8,
  zoneA: { w: 220, h: 300 },
  zoneB: { w: 240, h: 320 },
  zoneRotate: -8,
  /** The sudoku box: the largest of these that fits (never under 96). */
  gridSizes: [132, 120, 108, 96],
  gridRotate: -8,
  signpost: { w: 48, h: 48, plateH: 22 },
  pennant: { w: 26, h: 44 },
  sparkleSizes: [8, 10, 12],
  sparkles: 3,
  /** The search's step over a bay. */
  step: 8,
  /** The road is sampled this often to keep clear of it. */
  sample: 4,
} as const;

/** A small seeded generator (mulberry32): the same chapter always draws the same numbers. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A rect's bounds once turned by `deg` about its centre. */
export function rotatedBounds(w: number, h: number, deg: number): { w: number; h: number } {
  const r = (Math.abs(deg) * Math.PI) / 180;
  return { w: w * Math.cos(r) + h * Math.sin(r), h: w * Math.sin(r) + h * Math.cos(r) };
}

const grow = (r: Rect, by: number): Rect => ({ x: r.x - by, y: r.y - by, w: r.w + 2 * by, h: r.h + 2 * by });
export const overlaps = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
/** How far a point is from a rect (0 inside it). */
export const distanceTo = (p: Point, r: Rect): number =>
  Math.hypot(Math.max(r.x - p.x, 0, p.x - (r.x + r.w)), Math.max(r.y - p.y, 0, p.y - (r.y + r.h)));

/** The road's middle line in an item, every few dp, in the item's coordinates. */
export function roadSamples(layout: Pick<MapLayout, 'segments'>, item: ChapterLayout): Point[] {
  const out: Point[] = [];
  for (const s of layout.segments) {
    const lo = Math.min(s.p0.y, s.c1.y, s.c2.y, s.p1.y) - item.offset;
    const hi = Math.max(s.p0.y, s.c1.y, s.c2.y, s.p1.y) - item.offset;
    if (hi < -SCENERY.roadClear || lo > item.height + SCENERY.roadClear) continue;
    const count = Math.max(2, Math.ceil(s.length / SCENERY.sample));
    for (let i = 0; i <= count; i++) {
      const p = cubicAt(s.p0, s.c1, s.c2, s.p1, i / count);
      out.push({ x: p.x, y: p.y - item.offset });
    }
  }
  return out;
}

/** What an item of scenery must keep clear of, in one chapter's item. */
export interface Keepout {
  width: number;
  height: number;
  road: Point[];
  /** Coins, every token place, the gateway and the finish (already grown by their clearance). */
  boxes: Rect[];
}

export function keepoutOf(layout: Pick<MapLayout, 'segments' | 'width'>, item: ChapterLayout): Keepout {
  const g = item.gateway;
  const solid: Rect[] = [
    ...item.nodes.map(nodeBox),
    ...item.nodes.map((p) => tokenBox(tokenSpot(item, p.n)!)),
    g.banner,
    ...(g.pillars ?? []),
    ...(g.start ? [g.start] : []),
    ...(item.finish ? [item.finish] : []),
  ];
  if (g.kind === 'gate') {
    // The sign and the barrier as they are while the gate is shut (the larger), whatever the gate's state now:
    // the scenery never moves with the progress.
    const s = MAP.sign.closed;
    const mid = layout.width / 2;
    const top = g.banner.y - MAP.top;
    const inner = mid - MAP.pillarX + MAP.pillar.w / 2;
    solid.push({ x: mid - s.w / 2, y: top + s.y, w: s.w, h: s.h });
    solid.push({ x: inner, y: top + MAP.barrier.y, w: mid + MAP.barrier.past - inner, h: MAP.barrier.h });
  }
  return {
    width: layout.width,
    height: item.height,
    road: roadSamples(layout, item),
    boxes: solid.map((r) => grow(r, SCENERY.boxClear)),
  };
}

/** Whether `rect` may stand here: inside the item and its gutters, clear of the road and of every box. */
export function fits(rect: Rect, k: Keepout): boolean {
  if (rect.x < MAP.gutter || rect.x + rect.w > k.width - MAP.gutter) return false;
  if (rect.y < 0 || rect.y + rect.h > k.height) return false;
  if (k.boxes.some((b) => overlaps(rect, b))) return false;
  const clear = SCENERY.roadClear ** 2;
  const x1 = rect.x + rect.w;
  const y1 = rect.y + rect.h;
  for (const p of k.road) {
    const dx = Math.max(rect.x - p.x, 0, p.x - x1);
    const dy = Math.max(rect.y - p.y, 0, p.y - y1);
    if (dx * dx + dy * dy < clear) return false;
  }
  return true;
}

/**
 * The free place nearest to `prefer` for a box `w` × `h` (its bounds), its centre within `area`; null when none.
 */
export function place(w: number, h: number, area: Rect, prefer: Point, k: Keepout): Rect | null {
  const candidates: Point[] = [];
  const x0 = area.x + w / 2;
  const x1 = area.x + area.w - w / 2;
  const y0 = area.y + h / 2;
  const y1 = area.y + area.h - h / 2;
  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y += SCENERY.step)
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x += SCENERY.step) candidates.push({ x, y });
  candidates.sort(
    (a, b) => (a.x - prefer.x) ** 2 + (a.y - prefer.y) ** 2 - ((b.x - prefer.x) ** 2 + (b.y - prefer.y) ** 2),
  );
  // Only the road and the boxes near the area can be in the way (a chapter is mounted mid-fling: keep it quick).
  const reach = SCENERY.roadClear + Math.max(w, h);
  const near = {
    x: area.x - reach,
    y: area.y - reach,
    w: area.w + 2 * reach,
    h: area.h + 2 * reach,
  };
  const local: Keepout = {
    ...k,
    road: k.road.filter(
      (p) => p.x >= near.x && p.x <= near.x + near.w && p.y >= near.y && p.y <= near.y + near.h,
    ),
    boxes: k.boxes.filter((b) => overlaps(b, near)),
  };
  for (const c of candidates) {
    const rect = { x: c.x - w / 2, y: c.y - h / 2, w, h };
    if (fits(rect, local)) return rect;
  }
  return null;
}

/** A bay beside stages `from`…`to` of a chapter, on `side` (+1: toward the end edge). */
function bay(item: ChapterLayout, width: number, from: number, to: number, side: number): Rect {
  const boxes = item.nodes.slice(from, to + 1).map(nodeBox);
  const y0 = Math.min(...boxes.map((b) => b.y));
  const y1 = Math.max(...boxes.map((b) => b.y + b.h));
  const x = side > 0 ? width / 2 : MAP.gutter;
  return { x, y: y0, w: width / 2 - MAP.gutter, h: y1 - y0 };
}

const centreOf = (r: Rect): Point => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const bayPrefer = (r: Rect, side: number): Point => ({
  x: side > 0 ? r.x + r.w * 0.55 : r.x + r.w * 0.45,
  y: r.y + r.h / 2,
});

/** Drops a rotated item's bounds back to its own size, about the same centre. */
function unrotated(bounds: Rect, w: number, h: number): Rect {
  const c = centreOf(bounds);
  return { x: c.x - w / 2, y: c.y - h / 2, w, h };
}

const cache = new Map<string, SceneryItem[]>();

/** One chapter's scenery (cached by chapter, width and direction: the progress never moves it). */
export function chapterScenery(layout: MapLayout, chapter: number): SceneryItem[] {
  const key = `${layout.width}|${layout.direction}|${chapter}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const item = layout.chapters.find((c) => c.chapter === chapter);
  if (!item) return [];
  const out = sceneryOf(layout, item);
  cache.set(key, out);
  return out;
}

function sceneryOf(layout: MapLayout, item: ChapterLayout): SceneryItem[] {
  const W = layout.width;
  const s = item.sigma;
  const rand = seeded(item.chapter * 7919);
  const k = keepoutOf(layout, item);
  const out: SceneryItem[] = [];
  /** Keeps every later item clear of one just placed. */
  const take = (r: Rect) => k.boxes.push(grow(r, SCENERY.boxClear));
  const last = item.nodes.length - 1;
  if (last < 9) return out;

  // The zones: the bays beside stages 2–4 (−σ) and 5–7 (+σ), centred in them, inside the item.
  const zone = (area: Rect, side: number, size: { w: number; h: number }) => {
    const c = { x: W / 2 + side * W * 0.24, y: area.y + area.h / 2 };
    const y = Math.max(0, Math.min(item.height - size.h, c.y - size.h / 2));
    out.push({
      kind: 'zone',
      rect: { x: c.x - size.w / 2, y, w: size.w, h: size.h },
      rotate: SCENERY.zoneRotate,
    });
  };
  const bayA = bay(item, W, 1, 3, -s);
  const bayB = bay(item, W, 4, 6, s);
  const bayC = bay(item, W, 7, 8, -s);
  zone(bayA, -s, SCENERY.zoneA);
  zone(bayB, s, SCENERY.zoneB);

  const tryBoth = (
    w: number,
    h: number,
    first: { area: Rect; side: number },
    other: { area: Rect; side: number },
  ): Rect | null =>
    place(w, h, first.area, bayPrefer(first.area, first.side), k) ??
    place(w, h, other.area, bayPrefer(other.area, other.side), k);

  // The sudoku box in bay A or B (by the seed), else in bay C.
  const gridBay = rand() < 0.5 ? { area: bayA, side: -s } : { area: bayB, side: s };
  for (const S of SCENERY.gridSizes) {
    const b = rotatedBounds(S, S, SCENERY.gridRotate);
    const at = tryBoth(b.w, b.h, gridBay, { area: bayC, side: -s });
    if (!at) continue;
    out.push({ kind: 'grid', rect: unrotated(at, S, S), rotate: SCENERY.gridRotate });
    take(at);
    break;
  }

  // The signpost beside the first stage, toward the side the road bends to first.
  {
    const first = item.nodes[0]!;
    const { w, h } = SCENERY.signpost;
    const up = layout.direction === 'up';
    const near = (side: number): { area: Rect; side: number } => ({
      area: {
        x: side > 0 ? first.cx + first.size / 2 : MAP.gutter,
        y: up ? first.cy - 10 : first.cy - 80,
        w: side > 0 ? W - MAP.gutter - (first.cx + first.size / 2) : first.cx - first.size / 2 - MAP.gutter,
        h: 90,
      },
      side,
    });
    const a = near(s);
    const b = near(-s);
    const at =
      place(w, h, a.area, { x: first.cx + s * 68, y: first.cy + (up ? 36 : -36) }, k) ??
      place(w, h, b.area, { x: first.cx - s * 68, y: first.cy + (up ? 36 : -36) }, k);
    if (at) {
      out.push({ kind: 'signpost', rect: at, arrow: centreOf(at).x > W / 2 ? -1 : 1 });
      take(at);
    }
  }

  // The pennant beside the boss, on its outer side when there is room.
  {
    const boss = item.nodes[last]!;
    const { w, h } = SCENERY.pennant;
    const outer = Math.sign(boss.cx - W / 2) || s;
    const area = (side: number): Rect => ({
      x: side > 0 ? boss.cx + boss.size / 2 : MAP.gutter,
      y: boss.cy - 70,
      w: side > 0 ? W - MAP.gutter - (boss.cx + boss.size / 2) : boss.cx - boss.size / 2 - MAP.gutter,
      h: 120,
    });
    const prefer = (side: number): Point => ({ x: boss.cx + side * (boss.size / 2 + 24), y: boss.cy - 20 });
    const at = place(w, h, area(outer), prefer(outer), k) ?? place(w, h, area(-outer), prefer(-outer), k);
    if (at) {
      out.push({ kind: 'pennant', rect: at });
      take(at);
    }
  }

  // The sparkles, anywhere free.
  for (let i = 0; i < SCENERY.sparkles; i++) {
    const size = SCENERY.sparkleSizes[Math.floor(rand() * SCENERY.sparkleSizes.length)]!;
    const prefer = { x: MAP.gutter + rand() * (W - 2 * MAP.gutter), y: rand() * item.height };
    const around = { x: prefer.x - 80, y: prefer.y - 80, w: 160, h: 160 };
    const at = place(size, size, around, prefer, k);
    if (at) {
      out.push({ kind: 'sparkle', rect: at });
      take(at);
    }
  }
  return out;
}
