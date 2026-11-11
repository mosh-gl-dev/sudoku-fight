import {
  type FindLevelOver,
  LEVEL_RULES,
  levelIdOf,
  type LevelRecords,
  levelOutcome,
} from '@sudoku-fight/engine';

import { LEVEL_UI } from '../../../config/levels';
import { color, size } from '../../../theme';
import {
  afterQuit,
  amplitude,
  catmullRom,
  chapterHeight,
  coinLook,
  currentLevel,
  everyChapter,
  gateBefore,
  gateSpan,
  indexOfChapter,
  itemLayoutOf,
  MAP,
  mapLayout,
  type MapLayout,
  mapAfterAttempt,
  nextAfterAttempt,
  nodeBox,
  nodeInfo,
  openOffset,
  plateState,
  progressStep,
  type Rect,
  revealOffset,
  roadX,
  segmentsBetween,
  stageSpan,
  stageYs,
  toneOf,
  tokenBox,
  tokenSpot,
  totalStars,
  unlockedNode,
  withAttempt,
} from '../mapModel';

/**
 * The level map's geometry and states (components.md §19.2–§19.4, §19.14; the board-game road of 31.10.2026):
 * every number of the road is a constant of mapModel, the list's item heights add up the way getItemLayout says,
 * no two pieces of a chapter ever cover each other, and the road runs smoothly through every stage.
 */

/** Played stages 1…n, each with these stars. */
function played(
  n: number,
  stars: 0 | 1 | 2 | 3 = 2,
  from = 1,
): Record<string, { stars: 0 | 1 | 2 | 3; plays: number }> {
  const out: Record<string, { stars: 0 | 1 | 2 | 3; plays: number }> = {};
  for (let k = from; k <= n; k++) out[levelIdOf(k)] = { stars, plays: 1 };
  return out;
}

const overlap = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const WIDTHS = [320, 360, 390, 430];
const DIRECTIONS = ['down', 'up'] as const;

describe('the road’s bends', () => {
  it('the amplitude is (width − 2 gutters − the boss)/2, between 80 and 104; centred on a wider screen', () => {
    expect(amplitude(390)).toBe(104);
    expect(amplitude(360)).toBe(104);
    expect(amplitude(320)).toBe(98);
    expect(amplitude(300)).toBe(88);
    expect(amplitude(260)).toBe(80);
    expect(amplitude(600)).toBe(104);
    expect(roadX(1, 2, 600)).toBeCloseTo(300 + 104 * 0.951, 5);
  });

  it('stage k of chapter c stands at W/2 + σ·A·sway[k] (σ = +1 in odd chapters, −1 in even ones)', () => {
    const xs = Array.from({ length: 10 }, (_, k) => Math.round(roadX(1, k, 390)));
    expect(xs).toEqual([195, 279, 294, 227, 134, 91, 134, 227, 294, 279]);
    for (let k = 0; k < 10; k++) expect(roadX(2, k, 390) - 195).toBeCloseTo(-(roadX(1, k, 390) - 195), 5);
  });

  it('the coins are 64, the boss 92; their centres follow the pitches (116 into the boss)', () => {
    expect([size.levelCoin, size.levelCoinBoss, size.levelCoinPanel]).toEqual([64, 92, 48]);
    expect(stageYs()).toEqual([230, 306, 398, 486, 562, 654, 746, 822, 910, 1026]);
    const c1 = mapLayout(390, 'down').chapters[0]!;
    expect(c1.nodes.map((p) => p.size)).toEqual([...Array(9).fill(64), 92]);
    expect(c1.nodes.map((p) => p.cy)).toEqual(stageYs());
    expect(c1.nodes[9]).toMatchObject({ n: 10, boss: true, k: 9 });
  });
});

describe('a chapter’s item', () => {
  it('every item is 1126 high whether its gate is open or not; chapter 30 has 48 more for the finish line', () => {
    expect(chapterHeight(1)).toBe(1126);
    expect(chapterHeight(30)).toBe(1174);
    const closed = mapLayout(390, 'down');
    const open = mapLayout(390, 'down', { plateOf: () => 'open' });
    expect(closed.chapters.map((c) => c.height)).toEqual(open.chapters.map((c) => c.height));
    expect(closed.height).toBe(29 * 1126 + 1174);
  });

  it('getItemLayout: each offset is the sum of the heights before it, and the total their sum', () => {
    const layout = mapLayout(360, 'down', { plateOf: (c) => (c <= 3 ? 'open' : 'closed') });
    const at = itemLayoutOf(layout);
    let sum = 0;
    layout.chapters.forEach((c, i) => {
      expect(at(null, i)).toEqual({ length: c.height, offset: sum, index: i });
      sum += c.height;
    });
    expect(layout.height).toBe(sum);
    expect(layout.chapters).toHaveLength(30);
  });

  it('the gateway block: the banner 16–72, the pillars at W/2 ± 126, the sign under it, the road crossing at 140', () => {
    const layout = mapLayout(390, 'down', { plateOf: (c) => (c === 2 ? 'open' : 'closed') });
    const [c1, c2, c3] = layout.chapters;
    expect(c1!.gateway).toMatchObject({ kind: 'start', pillars: null, sign: null, barrier: null });
    expect(c1!.gateway.start).toEqual({ x: 195 - 22, y: 140 - 22, w: 44, h: 44 });
    expect(c2!.gateway.banner).toEqual({ x: (390 - 332) / 2, y: 16, w: 332, h: 56 });
    expect(c2!.gateway.cross).toEqual({ x: 195, y: 140 });
    expect(c2!.gateway.pillars!.map((p) => p.x + p.w / 2)).toEqual([195 - 126, 195 + 126]);
    // Open: the small sign and no barrier; shut: the larger sign and the barrier across the road. The closed
    // plate's box holds two lines of its words over its bar (31.10.2026: one line cut them), above the barrier.
    expect(c2!.gateway).toMatchObject({ plate: 'open', barrier: null, sign: { w: 168, h: 44, y: 84 } });
    expect(c3!.gateway).toMatchObject({ plate: 'closed', sign: { w: 220, h: 70, y: 76 } });
    expect(c3!.gateway.sign!.y + c3!.gateway.sign!.h).toBeLessThan(c3!.gateway.barrier!.y);
    expect(c3!.gateway.barrier).toEqual({ x: 195 - 115, y: 148, w: 145, h: 8 });
    // The sign is the gate's button: a touch box of 44 or more either way; the open pill (36) sits in its middle.
    for (const kind of ['open', 'closed'] as const) {
      expect(MAP.sign[kind].h).toBeGreaterThanOrEqual(44);
      expect(MAP.sign[kind].face).toBeLessThanOrEqual(MAP.sign[kind].h);
    }
    expect(MAP.sign.open.face).toBe(36);
    // The banner never wider than the screen less its gutters.
    expect(mapLayout(320, 'down').chapters[1]!.gateway.banner.w).toBe(288);
  });

  it('chapter 30 ends at a finish line under its boss', () => {
    const c30 = mapLayout(390, 'down').chapters[29]!;
    const boss = c30.nodes[9]!;
    expect(c30.finish).toEqual({ x: boss.cx - 36, y: boss.cy + 100 - 6, w: 72, h: 12 });
    expect(mapLayout(390, 'down').chapters[0]!.finish).toBeNull();
  });

  it.each(DIRECTIONS.flatMap((d) => WIDTHS.map((w) => [d, w] as const)))(
    'no two coins cover each other (their crowns, edges, the boss’s badge and pedestal included): %s at %i dp',
    (direction, width) => {
      for (const item of mapLayout(width, direction).chapters) {
        const boxes = item.nodes.map(nodeBox);
        for (let i = 0; i < boxes.length; i++)
          for (let j = i + 1; j < boxes.length; j++)
            expect({ chapter: item.chapter, i, j, hit: overlap(boxes[i]!, boxes[j]!) }).toEqual({
              chapter: item.chapter,
              i,
              j,
              hit: false,
            });
        // Nor any coin the gateway block.
        const g = item.gateway;
        const block = [
          g.banner,
          ...(g.pillars ?? []),
          ...(g.sign ? [g.sign] : []),
          ...(g.start ? [g.start] : []),
        ];
        for (const b of boxes) for (const r of block) expect(overlap(b, r)).toBe(false);
      }
    },
  );
});

describe('the road', () => {
  const layout = mapLayout(390, 'down', {
    isOpen: (n) => n <= 12,
    plateOf: (c) => (c === 2 ? 'open' : 'closed'),
  });
  const global = (l: MapLayout, chapter: number) => l.chapters.find((c) => c.chapter === chapter)!;

  it('runs through the start pad, every stage, every gate crossing and the finish, in that order', () => {
    const segs = layout.segments;
    // 30 chapters × 10 stages, 29 gates, the start and the finish: 331 points, 330 segments.
    expect(segs).toHaveLength(330);
    const c1 = global(layout, 1);
    expect(segs[0]!.p0).toEqual({ x: 195, y: 140 });
    expect(segs[0]!.p1).toEqual({ x: c1.nodes[0]!.cx, y: c1.nodes[0]!.cy });
    const c2 = global(layout, 2);
    expect(segs[10]!.to).toEqual({ kind: 'gate', chapter: 2 });
    expect(segs[10]!.p1).toEqual({ x: 195, y: c2.offset + 140 });
    expect(segs[11]!.to).toEqual({ kind: 'stage', n: 11 });
    expect(segs[329]!.to).toEqual({ kind: 'finish' });
    for (let i = 1; i < segs.length; i++) expect(segs[i]!.p0).toEqual(segs[i - 1]!.p1);
  });

  it('bends smoothly: at every point the controls on both sides are in line with it (Catmull-Rom)', () => {
    const segs = layout.segments;
    for (let i = 1; i < segs.length; i++) {
      const p = segs[i]!.p0;
      const a = segs[i - 1]!.c2;
      const b = segs[i]!.c1;
      const cross = (p.x - a.x) * (b.y - p.y) - (p.y - a.y) * (b.x - p.x);
      expect(Math.abs(cross)).toBeLessThan(1e-6);
      // Same direction, not a turn back.
      expect((p.x - a.x) * (b.x - p.x) + (p.y - a.y) * (b.y - p.y)).toBeGreaterThan(0);
    }
    expect(
      catmullRom([
        { x: 0, y: 0 },
        { x: 0, y: 6 },
      ])[0],
    ).toEqual({
      p0: { x: 0, y: 0 },
      c1: { x: 0, y: 1 },
      c2: { x: 0, y: 5 },
      p1: { x: 0, y: 6 },
    });
  });

  it('the dashes run on: each segment starts where the one before left the 10/12 pattern', () => {
    const segs = layout.segments;
    for (let i = 1; i < segs.length; i++)
      expect(segs[i]!.dashOffset).toBeCloseTo((segs[i - 1]!.dashOffset + segs[i - 1]!.length) % 22, 6);
  });

  it('is gold up to the current stage and slate after; boss → gate follows the gate, gate → stage its stage', () => {
    const segs = layout.segments;
    // Into stages 1–12 open: gold; 13 on: slate. Into chapter 2's gate (open): gold; chapter 3's (shut): slate.
    const into = (to: (typeof segs)[number]['to']) =>
      segs.find((s) => JSON.stringify(s.to) === JSON.stringify(to))!.reached;
    expect(into({ kind: 'stage', n: 12 })).toBe(true);
    expect(into({ kind: 'stage', n: 13 })).toBe(false);
    expect(into({ kind: 'gate', chapter: 2 })).toBe(true);
    expect(into({ kind: 'gate', chapter: 3 })).toBe(false);
    expect(into({ kind: 'finish' })).toBe(false);
  });

  it('every piece lies inside its item; a segment across two items is in both, with the same path', () => {
    for (const item of layout.chapters)
      for (const p of item.road) {
        expect(p.frame.y).toBeGreaterThanOrEqual(0);
        expect(p.frame.y + p.frame.h).toBeLessThanOrEqual(item.height);
        expect(p.frame.x).toBeGreaterThanOrEqual(0);
        expect(p.frame.x + p.frame.w).toBeLessThanOrEqual(390);
      }
    // Chapter 1's boss → chapter 2's gate: drawn by both items, the same curve at the same place on the screen.
    const c1 = global(layout, 1);
    const c2 = global(layout, 2);
    const a = c1.road.find((p) => p.seg === 10)!;
    const b = c2.road.find((p) => p.seg === 10)!;
    expect(a.length).toBe(b.length);
    expect(a.dashOffset).toBe(b.dashOffset);
    expect(a.frame.y + a.frame.h).toBe(c1.height);
    expect(b.frame.y).toBe(0);
    const start = (piece: typeof a, item: typeof c1) => {
      const [, x, y] = /^M([\d.-]+) ([\d.-]+)/.exec(piece.d)!;
      return { x: Number(x) + piece.frame.x, y: Number(y) + piece.frame.y + item.offset };
    };
    expect(start(a, c1)).toEqual(start(b, c2));
  });

  it('never one piece as tall as a chapter (react-native-svg draws each Svg into a bitmap of its size)', () => {
    for (const item of layout.chapters)
      for (const p of item.road) expect(p.frame.h).toBeLessThan(item.height / 2);
  });

  it('segmentsBetween: one segment between two stages of a chapter, two across a gate', () => {
    // Segment 0 runs from the start pad to stage 1, segment k from stage k on.
    expect(segmentsBetween(layout, 7, 8)).toEqual([7]);
    expect(segmentsBetween(layout, 10, 11)).toEqual([10, 11]);
    expect(segmentsBetween(layout, 7, 9)).toEqual([7, 8]);
    expect(segmentsBetween(layout, 300, 301)).toEqual([]);
  });
});

describe('my token’s place', () => {
  it('beside its coin, on the side toward the middle (a coin on the middle line: away from the next stage)', () => {
    const c1 = mapLayout(390, 'down').chapters[0]!;
    const off = 32 + MAP.tokenGap + MAP.token.w / 2;
    // Stage 1 on the middle line, stage 2 bends to +σ: the token on −σ.
    expect(tokenSpot(c1, 1)).toEqual({ x: 195 - off, y: 230 });
    // Stage 3 right of the middle (σ = +1): the token toward the middle, to its left.
    expect(tokenSpot(c1, 3)!.x).toBeCloseTo(c1.nodes[2]!.cx - off, 5);
    // Stage 6 left of it: to its right.
    expect(tokenSpot(c1, 6)!.x).toBeCloseTo(c1.nodes[5]!.cx + off, 5);
    // The boss: half its 92 out.
    expect(tokenSpot(c1, 10)!.x).toBeCloseTo(c1.nodes[9]!.cx - (46 + MAP.tokenGap + MAP.token.w / 2), 5);
    // Chapter 2 bends the other way.
    expect(tokenSpot(mapLayout(390, 'down').chapters[1]!, 11)).toEqual({ x: 195 + off, y: 230 });
  });

  it.each(DIRECTIONS.flatMap((d) => WIDTHS.map((w) => [d, w] as const)))(
    'never covers another coin, the gateway or the screen’s gutter: %s at %i dp',
    (direction, width) => {
      for (const item of mapLayout(width, direction).chapters.slice(0, 3)) {
        const g = item.gateway;
        const block = [
          g.banner,
          ...(g.pillars ?? []),
          ...(g.sign ? [g.sign] : []),
          ...(g.barrier ? [g.barrier] : []),
        ];
        for (const p of item.nodes) {
          const box = tokenBox(tokenSpot(item, p.n)!);
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.x + box.w).toBeLessThanOrEqual(width);
          for (const q of item.nodes)
            if (q.n !== p.n)
              expect({ p: p.n, q: q.n, hit: overlap(box, nodeBox(q)) }).toEqual({
                p: p.n,
                q: q.n,
                hit: false,
              });
          for (const r of block) expect(overlap(box, r)).toBe(false);
        }
      }
    },
  );
});

describe('where the map opens', () => {
  it('at the current coin, 40 % down a viewport', () => {
    const layout = mapLayout(390, 'down');
    const c2 = layout.chapters[1]!;
    const node = c2.nodes.find((p) => p.n === 14)!;
    const offset = openOffset(layout, 14, 600);
    expect(offset).toBe(c2.offset + node.cy - 0.4 * 600);
    expect(c2.offset + node.cy - offset).toBeCloseTo(240, 5);
  });

  it('never before the top, never past the end', () => {
    const layout = mapLayout(390, 'down');
    expect(openOffset(layout, 1, 800)).toBe(0);
    expect(openOffset(layout, 300, 800)).toBe(layout.height - 800);
  });

  it("mapDirection 'up': chapter 30 first, stage 1 at the bottom of its item, the gateway upright at the bottom", () => {
    const up = mapLayout(390, 'up');
    expect(up.chapters.map((c) => c.chapter).slice(0, 3)).toEqual([30, 29, 28]);
    expect(indexOfChapter(up, 1)).toBe(29);
    const c2 = up.chapters[indexOfChapter(up, 2)]!;
    expect(c2.nodes[0]!.cy).toBe(1126 - 230);
    expect(c2.nodes[0]!.cy).toBeGreaterThan(c2.nodes[9]!.cy);
    // The block keeps its own order (banner over sign over the crossing), at the item's bottom.
    expect(c2.gateway.banner.y).toBe(1126 - 184 + 16);
    expect(c2.gateway.cross.y).toBe(1126 - 184 + 140);
    expect(c2.gateway.banner.y).toBeLessThan(c2.gateway.sign!.y);
    expect(up.height).toBe(mapLayout(390, 'down').height);
    // The road still goes from stage 1 to the finish, now up the screen.
    expect(up.segments[0]!.p1.y).toBeLessThan(up.segments[0]!.p0.y);
    // The current stage still at 40 %.
    const c15 = up.chapters[indexOfChapter(up, 15)]!;
    const offset = openOffset(up, 145, 600);
    expect(c15.offset + c15.nodes[4]!.cy - offset).toBeCloseTo(240, 5);
  });
});

describe('a chosen coin kept in sight (QA: a boss near the bottom went under its taller panel)', () => {
  const layout = mapLayout(390, 'down', { plateOf: () => 'closed' });
  const c2 = layout.chapters[1]!;

  it('a coin from its crown of stars to its edge; the boss from its crown badge to its pedestal', () => {
    const coin = c2.nodes.find((p) => p.n === 14)!;
    expect(stageSpan(layout, 14)).toEqual({
      top: c2.offset + coin.cy - size.levelCoin / 2 - MAP.crown,
      bottom: c2.offset + coin.cy + size.levelCoin / 2 + MAP.edge,
    });
    const boss = c2.nodes.find((p) => p.n === 20)!;
    expect(stageSpan(layout, 20)).toEqual({
      top: c2.offset + boss.cy - size.levelCoinBoss / 2 - MAP.bossAbove,
      bottom: c2.offset + boss.cy + size.levelCoinBoss / 2 + MAP.bossBelow,
    });
    expect(stageSpan(layout, 301)).toBeNull();
    // A gate: its sign; chapter 1 has none.
    const sign = c2.gateway.sign!;
    expect(gateSpan(layout, 2)).toEqual({ top: c2.offset + sign.y, bottom: c2.offset + sign.y + sign.h });
    expect(gateSpan(layout, 1)).toBeNull();
  });

  it('scrolls only when it is not all in sight, and then just enough (its gap inside the edge)', () => {
    const span = stageSpan(layout, 20)!;
    const g = MAP.revealGap;
    // All in sight: nothing.
    expect(revealOffset(layout, span, span.top - g - 10, 600)).toBeNull();
    // Under the bottom edge (the panel grew): up until its edge is `gap` over the map's bottom.
    expect(revealOffset(layout, span, span.top - 400, 480)).toBe(span.bottom + g - 480);
    // Over the top edge: down until its crown is `gap` under the top.
    expect(revealOffset(layout, span, span.top + 30, 480)).toBe(span.top - g);
    // A map lower than the coin: its crown wins.
    expect(revealOffset(layout, span, span.top + 30, 60)).toBe(span.top - g);
    // Never before the top nor past the end; no list height yet: nothing.
    expect(revealOffset(layout, { top: 4, bottom: 70 }, 50, 400)).toBe(0);
    const end = { top: layout.height - 50, bottom: layout.height - 2 };
    expect(revealOffset(layout, end, 0, 400)).toBe(layout.height - 400);
    expect(revealOffset(layout, span, 0, 0)).toBeNull();
  });
});

describe('the states, from the engine’s progress rules', () => {
  it('the current stage: the first open one never played', () => {
    expect(currentLevel({})).toBe(1);
    expect(currentLevel(played(13))).toBe(14);
    // Chapter 1 done with 10 stars (< 20): the gate stays shut, so the last open stage is current.
    expect(currentLevel(played(10, 1))).toBe(10);
    // Opened once (a restored phone): the next chapter's first stage.
    expect(currentLevel(played(10, 1), [2])).toBe(11);
  });

  it('a node is played, current, open or locked; the stars are its best', () => {
    const records: LevelRecords = played(13, 2);
    expect(nodeInfo(7, records, [], 14)).toMatchObject({ state: 'played', stars: 2 });
    expect(nodeInfo(14, records, [], 14)).toMatchObject({ state: 'current', stars: 0 });
    expect(nodeInfo(15, records, [], 14)).toMatchObject({ state: 'locked' });
    expect(nodeInfo(20, records, [], 14)).toMatchObject({ state: 'locked', boss: true });
  });

  it('a coin’s look: locked in its tone; plain; gilded with one or two stars; gold with three', () => {
    expect(coinLook({ state: 'locked', stars: 0 })).toBe('locked');
    expect(coinLook({ state: 'current', stars: 0 })).toBe('plain');
    expect(coinLook({ state: 'open', stars: 0 })).toBe('plain');
    expect(coinLook({ state: 'played', stars: 0 })).toBe('plain');
    expect(coinLook({ state: 'played', stars: 1 })).toBe('gilded');
    expect(coinLook({ state: 'played', stars: 2 })).toBe('gilded');
    expect(coinLook({ state: 'played', stars: 3 })).toBe('gold');
    expect(coinLook({ state: 'current', stars: 3 })).toBe('gold');
    // LEVEL_UI.goldPerfectCoins off: ★★★ keeps the gold edge only.
    expect(LEVEL_UI.goldPerfectCoins).toBe(true);
    expect(coinLook({ state: 'played', stars: 3 }, false)).toBe('gilded');
    // The testing switch's open node is plain.
    expect(coinLook(unlockedNode(nodeInfo(12, played(7), [], 8)))).toBe('plain');
  });

  it('each chapter has its tone, cycling every 6 (tokens color.levelMap.chapter)', () => {
    const tones = color.levelMap.chapter;
    expect(tones).toHaveLength(6);
    expect(toneOf(1)).toBe(tones[0]);
    expect(toneOf(6)).toBe(tones[5]);
    expect(toneOf(7)).toBe(tones[0]);
    expect(new Set(tones.map((t) => t.deep)).size).toBe(6);
  });

  it('a gate’s sign: closed, enough stars with the boss not played, or open', () => {
    const closed = gateBefore(2, played(10, 1));
    expect(plateState(closed)).toBe('closed');
    expect(closed).toMatchObject({ stars: 10, need: 20, bossPlayed: true });
    const bossless = { ...played(39, 3) };
    expect(plateState(gateBefore(5, bossless))).toBe('bossMissing');
    expect(plateState(gateBefore(2, played(10, 2)))).toBe('open');
  });

  it('"★ 84/900"', () => {
    expect(totalStars(played(42, 2))).toEqual({ stars: 84, max: 900 });
  });
});

describe('back from a stage: the step the map plays (progressStep)', () => {
  const at = (records: LevelRecords) => ({ records, current: currentLevel(records) });

  it('stage 8 played with ★★, stage 9 now current: the stars from 0 to 2, and the advance 8 → 9', () => {
    expect(progressStep(at(played(7)), at(played(8)))).toEqual({
      stars: { n: 8, from: 0, to: 2 },
      advance: { from: 8, to: 9 },
    });
  });

  it('a replay that only betters its stars: the stars only', () => {
    const better = { ...played(8), [levelIdOf(5)]: { stars: 3 as const, plays: 2 } };
    expect(progressStep(at(played(8)), at(better))).toEqual({ stars: { n: 5, from: 2, to: 3 } });
  });

  it('a first play with no star: the advance only', () => {
    expect(progressStep(at(played(7)), at({ ...played(7), [levelIdOf(8)]: { stars: 0, plays: 1 } }))).toEqual(
      {
        advance: { from: 8, to: 9 },
      },
    );
  });

  it('the boss played and the gate open: the advance 10 → 11, over the gate’s two segments', () => {
    const step = progressStep(at(played(9)), at(played(10)));
    expect(step).toEqual({ stars: { n: 10, from: 0, to: 2 }, advance: { from: 10, to: 11 } });
    expect(segmentsBetween(mapLayout(390, 'down'), 10, 11)).toHaveLength(2);
  });

  it('nothing to play: no earlier picture, the same progress, two stages changed, a jump, a step back, the switch', () => {
    expect(progressStep(null, at(played(8)))).toBeNull();
    expect(progressStep(at(played(8)), at(played(8)))).toBeNull();
    expect(progressStep(at(played(8)), at({ ...played(8) }))).toBeNull();
    expect(progressStep(at(played(6)), at(played(8)))).toBeNull();
    expect(progressStep(at(played(8)), at(played(7)))).toBeNull();
    expect(progressStep(at(played(7)), at(played(8)), { unlockAll: true })).toBeNull();
  });
});

describe('after an attempt (the result’s "לשלב הבא")', () => {
  const find = { kind: 'find', stars: { by: 'timeMs', three: 5000, two: 10000, one: 20000 } } as const;
  const found: FindLevelOver = {
    reason: 'targetReached',
    elapsedMs: 4000,
    penaltyMs: 0,
    spots: 1,
    found: 0,
    stars: 3,
  };

  it('a played stage opens the next one', () => {
    const outcome = levelOutcome(find, found);
    expect(nextAfterAttempt('L013', played(12), [], outcome)).toBe('L014');
    expect(withAttempt(played(12), 'L013', outcome).L013).toMatchObject({ stars: 3, plays: 1 });
  });

  it('a quit counts as played too (LEVEL_RULES.quitCountsAsPlayed), with 0 stars', () => {
    const quit = levelOutcome(find, { ...found, reason: 'quit' });
    expect(nextAfterAttempt('L013', played(12), [], quit)).toBe('L014');
  });

  it('at a closed gate, and after the last stage, there is no next', () => {
    const boss = levelOutcome(find, { ...found, elapsedMs: 15000 });
    expect(nextAfterAttempt('L010', played(9, 1), [], boss)).toBeNull();
    // 9 × ★★★ and this ★: 28 stars, and the boss played.
    expect(nextAfterAttempt('L010', played(9, 3), [], boss)).toBe('L011');
    expect(nextAfterAttempt('L300', played(299, 3), [], boss)).toBeNull();
  });

  it('"פתח את כל השלבים (בדיקה)": every chapter as opened, so "לשלב הבא" goes on past a closed gate', () => {
    const boss = levelOutcome(find, { ...found, elapsedMs: 15000 });
    expect(everyChapter()).toEqual(Array.from({ length: 29 }, (_, i) => i + 2));
    expect(nextAfterAttempt('L010', played(9, 1), everyChapter(), boss)).toBe('L011');
    expect(nextAfterAttempt('L300', played(299, 3), everyChapter(), boss)).toBeNull();
    // Every node open on the map; the played and the current ones stay as they are.
    const locked = nodeInfo(12, played(7), [], 8);
    expect(locked.state).toBe('locked');
    expect(unlockedNode(locked)).toEqual({ ...locked, state: 'open' });
    const current = nodeInfo(8, played(7), [], 8);
    expect(unlockedNode(current)).toBe(current);
  });

  it('QA levels-to-map: "למפה" chooses the next stage after a replay, and the new current one after a first play', () => {
    const outcome = levelOutcome(find, found);
    // L019–L033 played before (the staging switch), L018 not: its first play takes the map to L034, "השלב הבא".
    const gap = { ...played(17, 3), ...played(33, 3, 19) };
    expect(mapAfterAttempt('L018', gap, everyChapter(), outcome, true)).toBe('L034');
    // An old stage replayed: the one after it, which "לשלב הבא" starts, not the current one.
    expect(mapAfterAttempt('L007', played(33, 3), everyChapter(), outcome, false)).toBe('L008');
    expect(mapAfterAttempt('L010', played(33, 3), everyChapter(), outcome, false)).toBe('L011');
    // A plain run: N → N + 1 either way.
    expect(mapAfterAttempt('L013', played(12), [], outcome, true)).toBe('L014');
    // A boss at a gate still shut: the boss itself; and the last stage.
    const boss = levelOutcome(find, { ...found, elapsedMs: 15000 });
    expect(mapAfterAttempt('L010', played(9, 1), [], boss, true)).toBe('L010');
    expect(mapAfterAttempt('L010', played(10, 1), [], boss, false)).toBe('L010');
    expect(mapAfterAttempt('L300', played(299, 3), everyChapter(), boss, true)).toBe('L300');
    // A first play far ahead of the current stage (the staging switch): the one after it.
    expect(mapAfterAttempt('L050', played(33, 3), everyChapter(), outcome, true)).toBe('L051');
  });

  it('never lowers the best', () => {
    const slow = levelOutcome(find, { ...found, elapsedMs: 15000 });
    expect(withAttempt({ L005: { stars: 3, plays: 2 } }, 'L005', slow).L005).toMatchObject({
      stars: 3,
      plays: 3,
    });
  });
});

/**
 * B39 (QA run 2): "לצאת מהשלב?" promised "והשלב הבא ייפתח" on chapter 1's boss with 8 of 20 stars, and the result
 * then said "השלב הבא עוד נעול". afterQuit reads what a quit would leave, as the result's "לשלב הבא" does.
 */
describe('after a quit ("לצאת מהשלב?", afterQuit)', () => {
  it('a stage that is not a boss: the next one opens (a quit counts as played)', () => {
    expect(afterQuit('L013', played(12), [])).toBe('opens');
    // Played before: it is open already.
    expect(afterQuit('L005', played(12), [])).toBe('opens');
  });

  it('a boss whose chapter lacks its stars: the next stays locked; with them, or opened once, it opens', () => {
    // 9 × ★ = 9 stars, and the boss's 0: under 20.
    expect(afterQuit('L010', played(9, 1), [])).toBe('locked');
    // 9 × ★★★ = 27: the quit plays the boss, and the gate opens.
    expect(afterQuit('L010', played(9, 3), [])).toBe('opens');
    expect(afterQuit('L010', played(9, 1), [2])).toBe('opens');
    expect(afterQuit('L010', played(9, 1), everyChapter())).toBe('opens');
  });

  it('a quit that does not count (quitCountsAsPlayed off): the next stays locked unless it is open already', () => {
    const rules = { ...LEVEL_RULES, quitCountsAsPlayed: false };
    expect(afterQuit('L013', played(12), [], rules)).toBe('locked');
    expect(afterQuit('L005', played(12), [], rules)).toBe('opens');
  });

  it('the last stage: none', () => {
    expect(afterQuit('L300', played(299, 3), [])).toBe('last');
    expect(afterQuit('L300', played(299, 3), everyChapter())).toBe('last');
  });
});
