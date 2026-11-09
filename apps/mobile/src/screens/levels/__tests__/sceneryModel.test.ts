import { mapLayout, MAP, nodeBox, type Rect, tokenBox, tokenSpot } from '../mapModel';
import {
  chapterScenery,
  distanceTo,
  overlaps,
  roadSamples,
  rotatedBounds,
  SCENERY,
  type SceneryItem,
  seeded,
} from '../sceneryModel';

/**
 * The quiet scenery beside the road (components.md §19.14, LEVEL_UI.mapScenery): seeded and pure, so a chapter
 * always looks the same; never in the way (clear of the road, the coins, my token's places and the gateway);
 * never more than its share; and nothing of it but the translucent zones may pass under the road.
 */

const WIDTHS = [320, 360, 390, 430];
const DIRECTIONS = ['down', 'up'] as const;

/** An item's bounds on the screen, its turn included. */
function bounds(item: SceneryItem): Rect {
  const turn = 'rotate' in item ? item.rotate : 0;
  const b = rotatedBounds(item.rect.w, item.rect.h, turn);
  return {
    x: item.rect.x + item.rect.w / 2 - b.w / 2,
    y: item.rect.y + item.rect.h / 2 - b.h / 2,
    w: b.w,
    h: b.h,
  };
}

describe('the scenery', () => {
  it('the same chapter, width and direction always give the same scenery (a seeded generator, no Math.random)', () => {
    const a = chapterScenery(mapLayout(390, 'down'), 4);
    const b = chapterScenery(mapLayout(390, 'down', { isOpen: () => true, plateOf: () => 'open' }), 4);
    expect(b).toEqual(a);
    expect(seeded(7)()).toBe(seeded(7)());
    expect(seeded(7)()).not.toBe(seeded(8)());
  });

  it('the chapters are not all alike', () => {
    const layout = mapLayout(390, 'down');
    const looks = Array.from({ length: 6 }, (_, i) =>
      JSON.stringify(chapterScenery(layout, i + 1).filter((s) => s.kind !== 'zone')),
    );
    expect(new Set(looks).size).toBe(6);
  });

  it('at most 2 zones, 1 sudoku box, 1 signpost, 1 pennant and 3 sparkles a chapter', () => {
    const layout = mapLayout(390, 'down');
    for (const item of layout.chapters) {
      const count = (kind: SceneryItem['kind']) =>
        chapterScenery(layout, item.chapter).filter((s) => s.kind === kind).length;
      expect(count('zone')).toBe(2);
      expect(count('grid')).toBeLessThanOrEqual(1);
      expect(count('signpost')).toBeLessThanOrEqual(1);
      expect(count('pennant')).toBeLessThanOrEqual(1);
      expect(count('sparkle')).toBeLessThanOrEqual(SCENERY.sparkles);
    }
    // On the drawn phone, the box and the signpost are there in every chapter of the first world.
    for (let c = 1; c <= 6; c++) {
      const kinds = chapterScenery(layout, c).map((s) => s.kind);
      expect(kinds).toEqual(expect.arrayContaining(['zone', 'grid', 'signpost']));
    }
  });

  it.each(DIRECTIONS.flatMap((d) => WIDTHS.map((w) => [d, w] as const)))(
    'never in the way, and inside the item and its gutters: %s at %i dp',
    (direction, width) => {
      const layout = mapLayout(width, direction);
      for (const item of layout.chapters.filter((c) => [1, 2, 7, 30].includes(c.chapter))) {
        const road = roadSamples(layout, item);
        const solid: Rect[] = [
          ...item.nodes.map(nodeBox),
          ...item.nodes.map((p) => tokenBox(tokenSpot(item, p.n)!)),
          item.gateway.banner,
          ...(item.gateway.pillars ?? []),
          ...(item.gateway.sign ? [item.gateway.sign] : []),
          ...(item.gateway.barrier ? [item.gateway.barrier] : []),
          ...(item.gateway.start ? [item.gateway.start] : []),
          ...(item.finish ? [item.finish] : []),
        ];
        for (const s of chapterScenery(layout, item.chapter)) {
          const b = bounds(s);
          if (s.kind === 'zone') {
            // The ground: it may pass under the road and the coins, but stays inside its item.
            expect(b.y).toBeGreaterThanOrEqual(-1);
            expect(b.y + b.h).toBeLessThanOrEqual(item.height + 1);
            continue;
          }
          const where = { chapter: item.chapter, kind: s.kind };
          expect({ ...where, x: b.x >= MAP.gutter - 0.01 }).toEqual({ ...where, x: true });
          expect({ ...where, x: b.x + b.w <= width - MAP.gutter + 0.01 }).toEqual({ ...where, x: true });
          expect({ ...where, y: b.y >= 0 && b.y + b.h <= item.height }).toEqual({ ...where, y: true });
          const nearRoad = Math.min(...road.map((p) => distanceTo(p, b)));
          expect({ ...where, road: nearRoad >= SCENERY.roadClear - 0.01 }).toEqual({ ...where, road: true });
          for (const r of solid) {
            const grown = { x: r.x - 8, y: r.y - 8, w: r.w + 16, h: r.h + 16 };
            expect({ ...where, hit: overlaps(b, grown) }).toEqual({ ...where, hit: false });
          }
        }
      }
    },
  );

  it('its items never cover one another (the zones aside)', () => {
    const layout = mapLayout(360, 'down');
    for (const item of layout.chapters.slice(0, 10)) {
      const solid = chapterScenery(layout, item.chapter)
        .filter((s) => s.kind !== 'zone')
        .map(bounds);
      for (let i = 0; i < solid.length; i++)
        for (let j = i + 1; j < solid.length; j++) expect(overlaps(solid[i]!, solid[j]!)).toBe(false);
    }
  });

  it('no digits in the scenery (D126: the only digits behind the app are the small wandering ones)', () => {
    const layout = mapLayout(390, 'down');
    for (const item of layout.chapters) {
      for (const s of chapterScenery(layout, item.chapter)) {
        // Only the empty sudoku box, the zones, the signpost (its chapter number), the pennant and the sparkles.
        expect(['zone', 'grid', 'signpost', 'pennant', 'sparkle']).toContain(s.kind);
        expect(s).not.toHaveProperty('digits');
        expect(s).not.toHaveProperty('digit');
        if (s.kind === 'grid') {
          expect(s.rect.w).toBeGreaterThanOrEqual(96);
          expect(s.rect.w).toBeLessThanOrEqual(132);
        }
      }
    }
  });
});
