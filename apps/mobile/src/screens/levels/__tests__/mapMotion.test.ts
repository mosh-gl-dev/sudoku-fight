import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { REVEAL } from '../../../components/levels/StarRow';
import { MAP_MOTION } from '../../../config/levels';
import { BEACON_BURST_MS, BEACON_PERIOD_MS, beaconOpacity, stepTimeline } from '../mapMotion';

/**
 * The level map's motion (motion.md §4.11; config/levels.ts MAP_MOTION): the current stage's beacon beats with
 * rests between its bursts (no view animates without end: avatars/idleBeat.ts), and the short sequence back from a
 * stage runs the stars, then the pour, then the hop.
 */

describe('the beacon (level.node.current), in beats', () => {
  it('a burst is two pulses of 1200 ms, then a rest of 3600 ms, then again; the first after 400 ms', () => {
    expect(MAP_MOTION).toMatchObject({
      beaconBeatMs: 1200,
      beaconBeats: 2,
      beaconRestMs: 3600,
      beaconWakeMs: 400,
    });
    expect(BEACON_BURST_MS).toBe(2400);
    expect(BEACON_PERIOD_MS).toBe(6000);
    expect(beaconOpacity(0)).toBe(0);
    expect(beaconOpacity(399)).toBe(0);
    // Each pulse: 0 → 1 in 600 ms, back to 0 in 600.
    expect(beaconOpacity(400 + 600)).toBeCloseTo(1, 5);
    expect(beaconOpacity(400 + 1200)).toBeCloseTo(0, 5);
    expect(beaconOpacity(400 + 1800)).toBeCloseTo(1, 5);
    // The rest: still.
    for (let t = 400 + 2400; t < 400 + 6000; t += 100) expect(beaconOpacity(t)).toBe(0);
    // And again.
    expect(beaconOpacity(400 + 6000 + 600)).toBeCloseTo(1, 5);
  });

  it('two bursts never come without a rest of 2.4 s or more (uiautomator and Android’s accessibility need it)', () => {
    expect(MAP_MOTION.beaconRestMs).toBeGreaterThanOrEqual(2400);
  });
});

describe('back from a stage: the timeline', () => {
  const one = [{ seg: 8, length: 120 }];

  it('stars and an advance: the stars pop from 350, then the gold pours (600), then the token hops (520 + 160)', () => {
    const t = stepTimeline({ stars: { n: 8, from: 0, to: 2 }, advance: { from: 8, to: 9 } }, one);
    const starsEnd = 350 + REVEAL.popMs + REVEAL.staggerMs;
    expect(t).toEqual({
      starsAt: 350,
      starsEnd,
      pour: [{ seg: 8, delayMs: starsEnd, durationMs: 600 }],
      hopAt: starsEnd + 600,
      doneAt: starsEnd + 600 + 520 + 160,
    });
  });

  it('an advance only: the pour from 350; across a gate, its two segments share the 600 ms by length', () => {
    const t = stepTimeline({ advance: { from: 10, to: 11 } }, [
      { seg: 10, length: 300 },
      { seg: 11, length: 100 },
    ]);
    expect(t.starsAt).toBeNull();
    expect(t.pour).toEqual([
      { seg: 10, delayMs: 350, durationMs: 450 },
      { seg: 11, delayMs: 800, durationMs: 150 },
    ]);
    expect(t.hopAt).toBe(950);
  });

  it('stars only (a replay): no pour, no hop; over when the last star is in', () => {
    const t = stepTimeline({ stars: { n: 5, from: 2, to: 3 } }, []);
    expect(t).toEqual({
      starsAt: 350,
      starsEnd: 350 + REVEAL.popMs,
      pour: [],
      hopAt: null,
      doneAt: 350 + REVEAL.popMs,
    });
  });

  it('the longest one is still short (about 2.6 s at most), and never blocks: a touch ends it', () => {
    const t = stepTimeline({ stars: { n: 8, from: 0, to: 3 }, advance: { from: 8, to: 9 } }, one);
    expect(t.doneAt).toBeLessThanOrEqual(2700);
  });
});

describe('the map’s code', () => {
  const dir = join(__dirname, '..');
  const files = readdirSync(dir)
    .filter((f) => /^(Map|map|LevelPath|LevelNode|ChapterGateway|scenery)/.test(f) && /\.tsx?$/.test(f))
    .map((f) => ({ name: f, code: readFileSync(join(dir, f), 'utf8') }));

  it('reads the map’s files', () => {
    expect(files.map((f) => f.name)).toEqual(
      expect.arrayContaining([
        'MapRoad.tsx',
        'MapToken.tsx',
        'MapScenery.tsx',
        'mapModel.ts',
        'mapMotion.ts',
      ]),
    );
  });

  it('no endless loop (withRepeat), no Math.random or Date.now, no Skia (off the start path, one GPU surface less)', () => {
    for (const f of files) {
      const code = f.code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      expect({ file: f.name, repeat: /withRepeat\(/.test(code) }).toEqual({ file: f.name, repeat: false });
      expect({ file: f.name, random: /Math\.random|Date\.now/.test(code) }).toEqual({
        file: f.name,
        random: false,
      });
      expect({ file: f.name, skia: /react-native-skia/.test(code) }).toEqual({ file: f.name, skia: false });
    }
  });
});
