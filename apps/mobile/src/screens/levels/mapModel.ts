import {
  chapterLevelIds,
  chapterOf,
  chapterStars,
  countsAsPlayed,
  gateState,
  type GateState,
  isBossLevel,
  isLevelOpen,
  LEVEL_RULES,
  levelIdOf,
  type LevelOutcome,
  type LevelRecords,
  type LevelRules,
  maxLevel,
  nextLevelId,
  type Stars,
} from '@sudoku-fight/engine';

import { LEVEL_UI } from '../../config/levels';
import { color, size } from '../../theme';

/**
 * The level map's geometry and states (components.md §19.2–§19.4, §19.14: the board-game road of 31.10.2026).
 * Pure: the screen's FlatList takes its item heights (getItemLayout) and where to open from here, and every number
 * of the map is a constant below. What is open, the gates and the stars come from the engine's progress rules
 * (isLevelOpen, gateState, chapterStars): nothing is decided here.
 *
 * The map is one list item per chapter, every item the same height (a gate that opens never moves the list). An
 * item stacks, top to bottom ('down', D60):
 *   the gateway block (184): the chapter's banner (16–72) as the lintel of an arch, its two pillars, the gate's
 *   sign hanging under it and, while the gate is shut, a striped barrier across the road (chapter 1: the banner
 *   and the start pad) · ten stage coins on a winding road (64, the boss's fortress 92), each with its crown of
 *   stars over its top edge · 32 below (chapter 30: and the finish line).
 * The road is one smooth curve (Catmull-Rom) through the start, every stage and every gate, drawn thick: gold up
 * to the stage I am on, slate after it. x are measured from the start edge (the right in Hebrew), so the whole
 * map mirrors with the language; the digits never do. `mapDirection: 'up'` turns each item upside down (stage 1
 * at the bottom) but keeps its gateway block upright, at the item's bottom, and the list's order around.
 */

export type MapDirection = 'down' | 'up';

/** The road map's numbers (components.md §19.14). */
export const MAP = {
  /** Nothing of the map but the ground tones comes closer than this to the screen's sides. */
  gutter: 16,
  /** Each stage's sideways place in its chapter, as a share of the amplitude: sin(0.3πk), k = 0…9. */
  sway: [0, 0.809, 0.951, 0.309, -0.588, -1, -0.588, 0.309, 0.951, 0.809],
  /** The amplitude: (width − 2 gutters − the boss)/2, held between these. */
  ampMax: 104,
  ampMin: 80,
  /** From one stage's centre to the next one's (116 into the boss). */
  pitch: [0, 76, 92, 88, 76, 92, 92, 76, 88, 116],
  /** The banner's top in the block, and its least height (a taller script may grow it, never cut). */
  top: 16,
  header: 56,
  /** The banner's widest. */
  bannerMax: 332,
  /** Every chapter's gateway block: from the item's top to the first stage's crown. */
  block: 184,
  /** Where the road crosses the gateway (chapter 1: the start pad's centre). */
  roadY: 140,
  /** A coin's crown of stars over its top edge, and the coin's edge (its depth) under it. */
  crown: 14,
  edge: 6,
  /** Over the boss's face (its crown badge and merlons), and under it (the stars' pedestal). */
  bossAbove: 24,
  bossBelow: 22,
  /** Under the last coin's box, and chapter 30's extra room for the finish line. */
  bottom: 32,
  finish: 48,
  /** The road: 44 wide, a 3 dp kerb each side, a 6 dp edge under it, a 10/12 dashed middle 3 dp wide. */
  road: {
    width: 44,
    kerb: 3,
    edge: 6,
    dash: 10,
    gap: 12,
    dashWidth: 3,
    padSide: 24,
    padAbove: 24,
    padBelow: 30,
  },
  /** The gateway's pillars: centred this far each side of the middle. */
  pillarX: 126,
  pillar: { w: 22, top: 64, bottom: 184 },
  /**
   * The gate's sign, hung under the banner: its box (never under 44 high, components.md), and `face`, the height
   * of the sign drawn in its middle (the chains reach it). The open pill (36) is smaller than its touch box. The
   * closed plate hangs from its box's top, as tall as its words need (GatePlate GATE_SIGN_TEXT: one line or two;
   * 31.10.2026, "נפתח ב־20 כוכבים" was cut beside the count): 44 to 70, two lines of a tall script (Arabic or
   * CJK, 19 a line) over the bar, with its border; it ends 2 above the barrier.
   */
  sign: { closed: { w: 220, h: 70, y: 76, face: 70 }, open: { w: 168, h: 44, y: 84, face: 36 } },
  /** The striped barrier of a shut gate: from the start-side pillar's inner edge to this far past the middle. */
  barrier: { y: 148, h: 8, past: 30 },
  /** Chapter 1's start pad, and chapter 30's finish line (its centre this far under the boss's). */
  startPad: 44,
  finishStrip: { w: 72, h: 12, below: 100 },
  /** My token (an avatar of 44, 50 with its shadow), this far from its coin's side. */
  tokenGap: 6,
  token: { w: 44, h: 50 },
  /** The current stage sits at this share of the map's height when it opens. */
  openAt: 0.4,
  /** A chosen coin (or gate) is brought this far inside the map's edges when it is not all in sight. */
  revealGap: 16,
} as const;

/** A coin's side: 64, the boss's 92. */
export const nodeSize = (boss: boolean): number => (boss ? size.levelCoinBoss : size.levelCoin);

/** A box, x from the start edge, y from the item's top. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface NodeSpot {
  id: string;
  /** The stage number, 1–300. */
  n: number;
  /** Its place in its chapter, 0–9. */
  k: number;
  boss: boolean;
  /** The coin's centre: x from the start edge, y from the item's top. */
  cx: number;
  cy: number;
  /** The coin's side (64, or 92 for the boss). */
  size: number;
}

export type PlateKind = 'closed' | 'open';

/** The block at a chapter's entrance: the banner, and the gate's arch (or chapter 1's start pad). */
export interface Gateway {
  kind: 'gate' | 'start';
  /** The banner (the arch's lintel): "פרק 4", its name and its stars. */
  banner: Rect;
  /** Where the road crosses the block. */
  cross: Point;
  /** The two pillars (a gate only). */
  pillars: [Rect, Rect] | null;
  /** The gate's sign, by its state (a gate only). */
  sign: Rect | null;
  /** The barrier across the road while the gate is shut. */
  barrier: Rect | null;
  /** The gate's state (a gate only). */
  plate: PlateKind | null;
  /** Chapter 1's start pad. */
  start: Rect | null;
}

/**
 * A piece of the road: one segment of the curve (start or gate or stage → the next), as drawn by one item. A
 * segment across two items is in both, with the same path, so the seam never shows. Its path is in the frame's own
 * coordinates (x from the start edge).
 */
export interface RoadPiece {
  key: string;
  /** The segment's index in the whole road. */
  seg: number;
  frame: Rect;
  d: string;
  length: number;
  /** Where the dashed middle stands at the segment's start, so the dashes run on across pieces. */
  dashOffset: number;
  /** Gold (up to where I am) or slate. */
  reached: boolean;
}

/** One segment of the whole road, in the list's coordinates (for the tests and the choreography). */
export interface RoadSegment {
  p0: Point;
  c1: Point;
  c2: Point;
  p1: Point;
  length: number;
  dashOffset: number;
  reached: boolean;
  /** What it leads into: a stage, a chapter's gate, or the finish. */
  to: { kind: 'stage'; n: number } | { kind: 'gate'; chapter: number } | { kind: 'finish' };
  /** The stage it leaves from, if it leaves a stage. */
  from: number | null;
}

export interface ChapterLayout {
  chapter: number;
  /** From the top of the list. */
  offset: number;
  height: number;
  /** +1 in odd chapters, −1 in even ones: the side the road bends to first. */
  sigma: 1 | -1;
  gateway: Gateway;
  nodes: NodeSpot[];
  /** The road pieces this item draws, the lower ones last (an edge never lies over the road above it). */
  road: RoadPiece[];
  /** Chapter 30's finish line. */
  finish: Rect | null;
}

export interface MapLayout {
  width: number;
  direction: MapDirection;
  /** The amplitude of the road's bends here. */
  amp: number;
  /** In list order (chapter 30 first when 'up'). */
  chapters: ChapterLayout[];
  /** The whole road, start to finish. */
  segments: RoadSegment[];
  /** The list's whole height. */
  height: number;
}

export interface MapLayoutOptions {
  /** Each gate's state: closed or open (by the chapter it opens). Closed when missing. */
  plateOf?: (chapter: number) => PlateKind;
  /** Whether a stage is open (its road gold up to it). */
  isOpen?: (n: number) => boolean;
  rules?: LevelRules;
}

/** The amplitude of the road's bends on a map `width` wide. */
export function amplitude(width: number): number {
  const free = (width - 2 * MAP.gutter - size.levelCoinBoss) / 2;
  return Math.min(MAP.ampMax, Math.max(MAP.ampMin, free));
}

/** +1 in odd chapters, −1 in even ones. */
export const sigmaOf = (chapter: number): 1 | -1 => (chapter % 2 === 1 ? 1 : -1);

/** A stage's centre x (from the start edge): the middle, moved by its chapter's bend. */
export function roadX(chapter: number, k: number, width: number): number {
  return width / 2 + sigmaOf(chapter) * amplitude(width) * MAP.sway[k % MAP.sway.length]!;
}

/** The coins' centres from the item's top, 'down': 230, then the pitches. */
export function stageYs(count = LEVEL_RULES.chapterSize): number[] {
  const out: number[] = [];
  let y = MAP.block + MAP.crown + size.levelCoin / 2;
  for (let k = 0; k < count; k++) {
    if (k > 0) y += MAP.pitch[k % MAP.pitch.length]!;
    out.push(y);
  }
  return out;
}

/** An item's height: every chapter alike, the last one with room for the finish line. */
export function chapterHeight(chapter: number, rules = LEVEL_RULES): number {
  const ys = stageYs(rules.chapterSize);
  const base = ys[ys.length - 1]! + size.levelCoinBoss / 2 + MAP.bossBelow + MAP.bottom;
  return chapter === rules.chapterCount ? base + MAP.finish : base;
}

/** A coin's box with its crown and edge (64 × 84), or the boss's with its crown badge and pedestal (92 × 138). */
export function nodeBox(p: Pick<NodeSpot, 'cx' | 'cy' | 'boss'>): Rect {
  const half = nodeSize(p.boss) / 2;
  const above = p.boss ? MAP.bossAbove : MAP.crown;
  const below = p.boss ? MAP.bossBelow : MAP.edge;
  return { x: p.cx - half, y: p.cy - half - above, w: 2 * half, h: 2 * half + above + below };
}

// ---------------------------------------------------------------------------------------------------------
// The road's curve

/**
 * A uniform Catmull-Rom spline through `points`, as cubic Béziers: for the segment Pi → Pi+1,
 * C1 = Pi + (Pi+1 − Pi−1)/6 and C2 = Pi+1 − (Pi+2 − Pi)/6, the ends repeated. The tangent is continuous at every
 * point, so the road bends smoothly through each stage.
 */
export function catmullRom(points: readonly Point[]): { p0: Point; c1: Point; c2: Point; p1: Point }[] {
  const at = (i: number) => points[Math.max(0, Math.min(points.length - 1, i))]!;
  const out: { p0: Point; c1: Point; c2: Point; p1: Point }[] = [];
  for (let i = 0; i + 1 < points.length; i++) {
    const [a, p0, p1, b] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    out.push({
      p0,
      c1: { x: p0.x + (p1.x - a.x) / 6, y: p0.y + (p1.y - a.y) / 6 },
      c2: { x: p1.x - (b.x - p0.x) / 6, y: p1.y - (b.y - p0.y) / 6 },
      p1,
    });
  }
  return out;
}

/** A point of a cubic at t. */
export function cubicAt(p0: Point, c1: Point, c2: Point, p1: Point, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return { x: a * p0.x + b * c1.x + c * c2.x + d * p1.x, y: a * p0.y + b * c1.y + c * c2.y + d * p1.y };
}

/** A cubic's length, as the sum of `samples` chords. */
export function cubicLength(p0: Point, c1: Point, c2: Point, p1: Point, samples = 32): number {
  let length = 0;
  let prev = p0;
  for (let i = 1; i <= samples; i++) {
    const p = cubicAt(p0, c1, c2, p1, i / samples);
    length += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return length;
}

const r1 = (v: number) => Math.round(v * 10) / 10;

// ---------------------------------------------------------------------------------------------------------
// The layout

/** A chapter's gateway block, 'down', in item coordinates; `blockTop` moves it (the item's bottom when 'up'). */
function gatewayOf(chapter: number, width: number, plate: PlateKind | null, blockTop: number): Gateway {
  const mid = width / 2;
  const bannerW = Math.min(width - 2 * MAP.gutter, MAP.bannerMax);
  const banner = { x: (width - bannerW) / 2, y: blockTop + MAP.top, w: bannerW, h: MAP.header };
  const cross = { x: mid, y: blockTop + MAP.roadY };
  if (plate === null) {
    const s = MAP.startPad;
    return {
      kind: 'start',
      banner,
      cross,
      pillars: null,
      sign: null,
      barrier: null,
      plate: null,
      start: { x: mid - s / 2, y: cross.y - s / 2, w: s, h: s },
    };
  }
  const { w: pw, top, bottom } = MAP.pillar;
  const pillar = (side: number): Rect => ({
    x: mid + side * MAP.pillarX - pw / 2,
    y: blockTop + top,
    w: pw,
    h: bottom - top,
  });
  const s = plate === 'open' ? MAP.sign.open : MAP.sign.closed;
  const inner = mid - MAP.pillarX + pw / 2;
  return {
    kind: 'gate',
    banner,
    cross,
    pillars: [pillar(-1), pillar(1)],
    sign: { x: mid - s.w / 2, y: blockTop + s.y, w: s.w, h: s.h },
    barrier:
      plate === 'closed'
        ? { x: inner, y: blockTop + MAP.barrier.y, w: mid + MAP.barrier.past - inner, h: MAP.barrier.h }
        : null,
    plate,
    start: null,
  };
}

/** A point of the road, in item coordinates, and what it is. */
type RoadStop = Point &
  ({ kind: 'start' | 'finish' } | { kind: 'gate'; chapter: number } | { kind: 'stage'; n: number });

/**
 * The whole map's layout (getItemLayout's offsets and heights, the coins, the gateways and the road). Pure: the
 * gates' states and what is open come in as functions of the progress.
 */
export function mapLayout(
  width: number,
  direction: MapDirection,
  { plateOf = () => 'closed', isOpen = () => false, rules = LEVEL_RULES }: MapLayoutOptions = {},
): MapLayout {
  const amp = amplitude(width);
  const ys = stageYs(rules.chapterSize);
  const up = direction === 'up';
  const byChapter = new Map<number, ChapterLayout>();
  const stopsOf = new Map<number, RoadStop[]>();

  for (let chapter = 1; chapter <= rules.chapterCount; chapter++) {
    const h = chapterHeight(chapter, rules);
    const flip = (y: number) => (up ? h - y : y);
    const sigma = sigmaOf(chapter);
    const plate = chapter > 1 ? plateOf(chapter) : null;
    const gateway = gatewayOf(chapter, width, plate, up ? h - MAP.block : 0);
    const nodes: NodeSpot[] = chapterLevelIds(chapter, rules).map((id, k) => {
      const n = (chapter - 1) * rules.chapterSize + k + 1;
      const boss = isBossLevel(n, rules);
      return { id, n, k, boss, cx: roadX(chapter, k, width), cy: flip(ys[k]!), size: nodeSize(boss) };
    });
    const last = nodes[nodes.length - 1]!;
    let finish: Rect | null = null;
    const stops: RoadStop[] = [
      chapter === 1 ? { ...gateway.cross, kind: 'start' } : { ...gateway.cross, kind: 'gate', chapter },
      ...nodes.map((p): RoadStop => ({ x: p.cx, y: p.cy, kind: 'stage', n: p.n })),
    ];
    if (chapter === rules.chapterCount) {
      const { w, h: fh, below } = MAP.finishStrip;
      const fy = flip(ys[ys.length - 1]! + below);
      finish = { x: last.cx - w / 2, y: fy - fh / 2, w, h: fh };
      stops.push({ x: last.cx, y: fy, kind: 'finish' });
    }
    stopsOf.set(chapter, stops);
    byChapter.set(chapter, { chapter, offset: 0, height: h, sigma, gateway, nodes, road: [], finish });
  }

  // The list's order and offsets.
  const order = Array.from({ length: rules.chapterCount }, (_, i) => (up ? rules.chapterCount - i : i + 1));
  let offset = 0;
  const chapters = order.map((c) => {
    const item = byChapter.get(c)!;
    item.offset = offset;
    offset += item.height;
    return item;
  });
  const total = offset;

  // The road through every stop, start to finish, in the list's coordinates.
  const stops: RoadStop[] = [];
  for (let c = 1; c <= rules.chapterCount; c++) {
    const item = byChapter.get(c)!;
    for (const s of stopsOf.get(c)!) stops.push({ ...s, y: s.y + item.offset });
  }
  const top = (s: RoadStop): RoadSegment['to'] =>
    s.kind === 'stage'
      ? { kind: 'stage', n: s.n }
      : s.kind === 'gate'
        ? { kind: 'gate', chapter: s.chapter }
        : { kind: 'finish' };
  const reachedInto = (s: RoadStop): boolean =>
    s.kind === 'stage'
      ? isOpen(s.n)
      : s.kind === 'gate'
        ? plateOf(s.chapter) === 'open'
        : s.kind === 'finish'
          ? isOpen(maxLevel(rules))
          : true;
  const period = MAP.road.dash + MAP.road.gap;
  let run = 0;
  const segments: RoadSegment[] = catmullRom(stops.map(({ x, y }) => ({ x, y }))).map((c, i) => {
    const length = cubicLength(c.p0, c.c1, c.c2, c.p1);
    const seg: RoadSegment = {
      ...c,
      length,
      dashOffset: run % period,
      reached: reachedInto(stops[i + 1]!),
      to: top(stops[i + 1]!),
      from: stops[i]!.kind === 'stage' ? (stops[i] as { n: number }).n : null,
    };
    run += length;
    return seg;
  });

  // Each segment drawn by every item its padded box crosses, cut to the item.
  const { padSide, padAbove, padBelow } = MAP.road;
  segments.forEach((s, i) => {
    const xs = [s.p0.x, s.c1.x, s.c2.x, s.p1.x];
    const yy = [s.p0.y, s.c1.y, s.c2.y, s.p1.y];
    const x0 = Math.max(0, Math.floor(Math.min(...xs) - padSide));
    const x1 = Math.min(width, Math.ceil(Math.max(...xs) + padSide));
    const y0 = Math.min(...yy) - padAbove;
    const y1 = Math.max(...yy) + padBelow;
    for (const item of chapters) {
      const a = Math.max(y0, item.offset);
      const b = Math.min(y1, item.offset + item.height);
      if (b <= a) continue;
      const fy0 = Math.floor(a - item.offset);
      const fy1 = Math.ceil(b - item.offset);
      const frame = { x: x0, y: fy0, w: x1 - x0, h: fy1 - fy0 };
      const ox = frame.x;
      const oy = item.offset + frame.y;
      const p = (q: Point) => `${r1(q.x - ox)} ${r1(q.y - oy)}`;
      item.road.push({
        key: `${i}-${item.chapter}`,
        seg: i,
        frame,
        d: `M${p(s.p0)} C${p(s.c1)} ${p(s.c2)} ${p(s.p1)}`,
        length: s.length,
        dashOffset: s.dashOffset,
        reached: s.reached,
      });
    }
  });
  for (const item of chapters)
    item.road.sort((a, b) => a.frame.y + a.frame.h / 2 - (b.frame.y + b.frame.h / 2));

  return { width, direction, amp, chapters, segments, height: total };
}

/** FlatList's getItemLayout over the layout's items. */
export function itemLayoutOf(layout: MapLayout) {
  return (_: unknown, index: number) => {
    const item = layout.chapters[index]!;
    return { length: item.height, offset: item.offset, index };
  };
}

/** The list index of a chapter. */
export const indexOfChapter = (layout: MapLayout, chapter: number): number =>
  layout.chapters.findIndex((c) => c.chapter === chapter);

/** A chapter's item. */
export const chapterLayoutOf = (layout: MapLayout, chapter: number): ChapterLayout | undefined =>
  layout.chapters.find((c) => c.chapter === chapter);

/**
 * Where the map opens (scrollToOffset): the coin of stage `n` at MAP.openAt (40 %) of a viewport `viewport`
 * high, never before the top or past the end.
 */
export function openOffset(layout: MapLayout, n: number, viewport: number, rules = LEVEL_RULES): number {
  const chapter = chapterLayoutOf(layout, chapterOf(n, rules));
  const node = chapter?.nodes.find((p) => p.n === n);
  if (!chapter || !node) return 0;
  const at = chapter.offset + node.cy - viewport * MAP.openAt;
  return Math.max(0, Math.min(at, Math.max(0, layout.height - viewport)));
}

/** A stretch of the list, top to bottom (list coordinates). */
export interface MapSpan {
  top: number;
  bottom: number;
}

/** Stage `n`'s coin on the map, from its crown of stars (the boss: its crown badge) down to its edge. */
export function stageSpan(layout: MapLayout, n: number, rules = LEVEL_RULES): MapSpan | null {
  const chapter = chapterLayoutOf(layout, chapterOf(n, rules));
  const node = chapter?.nodes.find((p) => p.n === n);
  if (!chapter || !node) return null;
  const y = chapter.offset + node.cy;
  const above = node.boss ? MAP.bossAbove : MAP.crown;
  const below = node.boss ? MAP.bossBelow : MAP.edge;
  return { top: y - node.size / 2 - above, bottom: y + node.size / 2 + below };
}

/** The sign of the gate in front of `chapter` (none in front of chapter 1). */
export function gateSpan(layout: MapLayout, chapter: number): MapSpan | null {
  const item = chapterLayoutOf(layout, chapter);
  const sign = item?.gateway.sign;
  if (!item || !sign) return null;
  return { top: item.offset + sign.y, bottom: item.offset + sign.y + sign.h };
}

/**
 * The scroll that shows all of `span` (with MAP.revealGap around it) in a list `viewport` high, now scrolled to
 * `offset`: null when it already shows, else the nearest offset that shows it (never before the top or past the
 * end). Choosing a stage near the bottom opens a taller panel (a boss's) that the map's height gives way to:
 * this brings the chosen coin back above it (QA: only the boss's crown was left in sight).
 */
export function revealOffset(
  layout: Pick<MapLayout, 'height'>,
  span: MapSpan,
  offset: number,
  viewport: number,
  gap: number = MAP.revealGap,
): number | null {
  if (viewport <= 0) return null;
  const top = span.top - gap;
  const bottom = span.bottom + gap;
  let to = offset;
  if (bottom > offset + viewport) to = bottom - viewport;
  // Taller than the list: its top (the crown, the stars) wins.
  if (top < to) to = top;
  to = Math.max(0, Math.min(to, Math.max(0, layout.height - viewport)));
  return Math.abs(to - offset) < 1 ? null : to;
}

/**
 * Where my token stands beside a coin (its centre, in item coordinates): on the coin's side toward the middle
 * (a coin on the middle line: away from the next stage), its gap from the coin's side, at the coin's height.
 */
export function tokenSpot(item: Pick<ChapterLayout, 'sigma' | 'nodes'>, n: number): Point | null {
  const p = item.nodes.find((q) => q.n === n);
  if (!p) return null;
  const sway = MAP.sway[p.k % MAP.sway.length]!;
  const side = sway !== 0 ? -Math.sign(item.sigma * sway) : -item.sigma;
  return { x: p.cx + side * (p.size / 2 + MAP.tokenGap + MAP.token.w / 2), y: p.cy };
}

/** My token's box at its spot. */
export const tokenBox = (spot: Point): Rect => ({
  x: spot.x - MAP.token.w / 2,
  y: spot.y - MAP.token.w / 2,
  w: MAP.token.w,
  h: MAP.token.h,
});

/** The segments that run from stage `from`'s point to stage `to`'s (one in a chapter, two across a gate). */
export function segmentsBetween(layout: Pick<MapLayout, 'segments'>, from: number, to: number): number[] {
  const out: number[] = [];
  let on = false;
  layout.segments.forEach((s, i) => {
    if (s.from === from) on = true;
    if (on) out.push(i);
    if (on && s.to.kind === 'stage' && s.to.n === to) on = false;
  });
  const last = layout.segments[out[out.length - 1] ?? -1];
  return last && last.to.kind === 'stage' && last.to.n === to ? out : [];
}

// ---------------------------------------------------------------------------------------------------------
// States, from the progress

export type NodeState = 'played' | 'current' | 'open' | 'locked';

export interface NodeInfo {
  n: number;
  id: string;
  state: NodeState;
  /** The best stars (0 for a stage never played). */
  stars: Stars;
  boss: boolean;
}

/**
 * The stage to go on with (the map's current node, the panel's "המשך"): the first open stage never played, else
 * the last open one. The same rule as levels.db's summary.
 */
export function currentLevel(
  records: LevelRecords,
  openedChapters: readonly number[] = [],
  rules = LEVEL_RULES,
): number {
  let lastOpen = 1;
  for (let n = 1; n <= maxLevel(rules); n++) {
    if (!isLevelOpen(n, records, openedChapters, rules)) break;
    lastOpen = n;
    if ((records[levelIdOf(n)]?.plays ?? 0) === 0) return n;
  }
  return lastOpen;
}

/** A node's state: played, the current one, open (not played, not current), or locked. */
export function nodeInfo(
  n: number,
  records: LevelRecords,
  openedChapters: readonly number[],
  current: number,
  rules = LEVEL_RULES,
): NodeInfo {
  const id = levelIdOf(n);
  const record = records[id];
  const stars = record?.stars ?? 0;
  const boss = isBossLevel(n, rules);
  if (n === current) return { n, id, state: 'current', stars, boss };
  if ((record?.plays ?? 0) > 0) return { n, id, state: 'played', stars, boss };
  const open = isLevelOpen(n, records, openedChapters, rules);
  return { n, id, state: open ? 'open' : 'locked', stars, boss };
}

/**
 * How a coin looks (components.md §19.2): closed in its chapter's tone (`locked`), the light board-cell face
 * (`plain`: open, current, or played with no star), the same with a gold edge (`gilded`: one or two stars), or
 * all gold (`gold`: three stars; LEVEL_UI.goldPerfectCoins, else gilded).
 */
export type CoinLook = 'plain' | 'gilded' | 'gold' | 'locked';

export function coinLook(
  info: Pick<NodeInfo, 'state' | 'stars'>,
  goldPerfect = LEVEL_UI.goldPerfectCoins,
): CoinLook {
  if (info.state === 'locked') return 'locked';
  if (info.stars >= 3) return goldPerfect ? 'gold' : 'gilded';
  return info.stars > 0 ? 'gilded' : 'plain';
}

/** A chapter's tone (tokens color.levelMap.chapter, cycling): its ground, its deep colour and its ink. */
export type ChapterTone = (typeof color.levelMap.chapter)[number];

export const toneOf = (chapter: number): ChapterTone => {
  const tones = color.levelMap.chapter;
  return tones[(((chapter - 1) % tones.length) + tones.length) % tones.length]!;
};

/**
 * "פתח את כל השלבים (בדיקה)" (a staging build's switch, config/testing.ts): every chapter as if its gate had
 * opened, so every gate is open and "לשלב הבא" goes on past it. With unlockedNode, every stage is open on the map.
 */
export const everyChapter = (rules = LEVEL_RULES): number[] =>
  Array.from({ length: Math.max(0, rules.chapterCount - 1) }, (_, i) => i + 2);

/** A node as the map draws it with every stage open (the testing switch): a locked one is open. */
export const unlockedNode = (info: NodeInfo): NodeInfo =>
  info.state === 'locked' ? { ...info, state: 'open' } : info;

/** The gate in front of `chapter` (2 and up): the previous chapter's, as gateState reads it. */
export const gateBefore = (
  chapter: number,
  records: LevelRecords,
  openedChapters: readonly number[] = [],
  rules = LEVEL_RULES,
): GateState => gateState(chapter - 1, records, openedChapters, rules);

/**
 * How a gate's sign reads (components.md §19.3): closed ("נפתח ב־20 כוכבים", "17/20"), enough stars but the
 * boss not played ("22/20", "שחק את שלב הבוס כדי לפתוח"), or open ("פרק 5 פתוח").
 */
export type PlateState = 'closed' | 'bossMissing' | 'open';

export function plateState(gate: GateState): PlateState {
  if (gate.open) return 'open';
  return gate.stars >= gate.need && !gate.bossPlayed ? 'bossMissing' : 'closed';
}

/** Every stage's best stars, summed ("★ 84/900"), and the most there are. */
export function totalStars(records: LevelRecords, rules = LEVEL_RULES): { stars: number; max: number } {
  let stars = 0;
  for (let n = 1; n <= maxLevel(rules); n++) stars += records[levelIdOf(n)]?.stars ?? 0;
  return { stars, max: maxLevel(rules) * 3 };
}

/** A chapter's best stars ("★ 18/30"), and the most it has. */
export const chapterTotal = (chapter: number, records: LevelRecords, rules = LEVEL_RULES) => ({
  stars: chapterStars(chapter, records, rules),
  max: rules.chapterSize * 3,
});

// ---------------------------------------------------------------------------------------------------------
// Back from a stage: what moved (the map's short celebration, motion.md level.map.*)

/** The progress as the map last showed it. */
export interface MapSnapshot {
  records: LevelRecords;
  current: number;
}

export interface ProgressStep {
  /** The one stage whose best stars rose. */
  stars?: { n: number; from: Stars; to: Stars };
  /** The current stage moved on by one. */
  advance?: { from: number; to: number };
}

/**
 * What changed between the map's last picture and now, if it is one step the map can play (pure): the best
 * stars of one stage rose, and/or the current stage moved on by one. Null, so the map simply shows the new state:
 * on the first picture, when more than one stage's stars changed, when the current stage moved back or by more
 * than one, or with the testing switch (every stage open).
 */
export function progressStep(
  prev: MapSnapshot | null,
  next: MapSnapshot,
  { unlockAll = false, rules = LEVEL_RULES }: { unlockAll?: boolean; rules?: LevelRules } = {},
): ProgressStep | null {
  if (!prev || unlockAll) return null;
  if (prev.records === next.records && prev.current === next.current) return null;
  const changed: { n: number; from: Stars; to: Stars }[] = [];
  for (let n = 1; n <= maxLevel(rules); n++) {
    const id = levelIdOf(n);
    const from = prev.records[id]?.stars ?? 0;
    const to = next.records[id]?.stars ?? 0;
    if (from !== to) changed.push({ n, from, to });
  }
  const moved = next.current - prev.current;
  if (changed.length > 1 || moved < 0 || moved > 1) return null;
  const rose = changed[0] && changed[0].to > changed[0].from ? changed[0] : undefined;
  if (changed.length === 1 && !rose) return null;
  const step: ProgressStep = {};
  if (rose) step.stars = rose;
  if (moved === 1) step.advance = { from: prev.current, to: next.current };
  return step.stars || step.advance ? step : null;
}

// ---------------------------------------------------------------------------------------------------------
// After an attempt

/**
 * The records as they stand after an attempt that ended with `outcome` (the result's "לשלב הבא" and its chapter
 * line): the best stars never lower, and one more play when the end counts (countsAsPlayed, which reads
 * LEVEL_RULES.quitCountsAsPlayed). levels.db does the same when it stores the attempt; this only spares the
 * result from waiting for the store to read it back.
 */
export function withAttempt(
  records: LevelRecords,
  levelId: string,
  outcome: Pick<LevelOutcome, 'reason' | 'stars'>,
  rules = LEVEL_RULES,
): LevelRecords {
  const prev = records[levelId];
  const plays = (prev?.plays ?? 0) + (countsAsPlayed(outcome.reason, rules) ? 1 : 0);
  const stars = Math.max(prev?.stars ?? 0, outcome.stars) as Stars;
  return { ...records, [levelId]: { ...prev, stars, plays } };
}

/** "לשלב הבא" after an attempt: the next stage when it is open now, else null (a closed gate, the last stage). */
export function nextAfterAttempt(
  levelId: string,
  records: LevelRecords,
  openedChapters: readonly number[],
  outcome: Pick<LevelOutcome, 'reason' | 'stars'>,
  rules = LEVEL_RULES,
): string | null {
  return nextLevelId(levelId, withAttempt(records, levelId, outcome, rules), openedChapters, rules);
}

/** What the X's "יציאה" leaves after a stage (afterQuit): the next stage open, still locked, or none at all. */
export type AfterQuit = 'opens' | 'locked' | 'last';

/**
 * [D51] What a quit would leave, for "לצאת מהשלב?" to say it (B39): a quit is 0 stars and counts as played
 * (quitCountsAsPlayed), so the next stage opens, unless it is behind a gate still shut after it (a boss whose
 * chapter lacks its stars) or the quit does not count; after stage 300 there is none. The same reading as the
 * result's "לשלב הבא" (nextAfterAttempt), before the quit.
 */
export function afterQuit(
  levelId: string,
  records: LevelRecords,
  openedChapters: readonly number[],
  rules = LEVEL_RULES,
): AfterQuit {
  if (levelId === levelIdOf(maxLevel(rules))) return 'last';
  return nextAfterAttempt(levelId, records, openedChapters, { reason: 'quit', stars: 0 }, rules)
    ? 'opens'
    : 'locked';
}
