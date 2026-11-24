import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { REVEAL } from '../../../components/levels/StarRow';
import { MAP_MOTION } from '../../../config/levels';
import { LINE } from '../MapRoad';
import { MAP } from '../mapModel';
import {
  BEACON_BURST_MS,
  BEACON_PERIOD_MS,
  beaconOpacity,
  DRIFT,
  driftSpec,
  gridPose,
  msUntilBeat,
  nodePose,
  shadowPose,
  stepTimeline,
  zonePose,
} from '../mapMotion';

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

describe('the drift (Moshe 25.11.2026: the coins, the zones and the sudoku box float)', () => {
  it('moves in beats with the beacon, and rests 2.4 s or more between them', () => {
    expect(DRIFT.moveMs + DRIFT.restMs).toBe(BEACON_PERIOD_MS);
    expect(DRIFT.restMs).toBeGreaterThanOrEqual(2400);
    // The beacon's burst falls inside the drift's move: both rest together.
    expect(BEACON_BURST_MS).toBeLessThanOrEqual(DRIFT.moveMs);
  });

  it('each piece has its own rhythm, from its index alone (no random): the same index, the same float', () => {
    expect(driftSpec(7)).toEqual(driftSpec(7));
    const specs = Array.from({ length: 30 }, (_, i) => driftSpec(i + 1));
    for (const s of specs) {
      for (const p of s.periods) {
        expect(p).toBeGreaterThanOrEqual(DRIFT.periodMin);
        expect(p).toBeLessThanOrEqual(DRIFT.periodMin + DRIFT.periodSpan);
      }
      for (const f of s.phases) {
        expect(f).toBeGreaterThanOrEqual(0);
        expect(f).toBeLessThan(1);
      }
    }
    // Neighbours never move in step.
    for (let i = 1; i < specs.length; i++) expect(specs[i]).not.toEqual(specs[i - 1]);
    const lifts = specs.map((s) => nodePose(s, 0).lift.toFixed(2));
    expect(new Set(lifts).size).toBeGreaterThan(20);
    // The reading source has no Math.random.
    const src = readFileSync(join(__dirname, '..', 'mapMotion.ts'), 'utf8');
    expect(src).not.toMatch(/Math\.random/);
  });

  it('a coin bobs ±3 dp and tilts ±6° at most; its shadow shrinks and pales as it rises', () => {
    for (let i = 1; i <= 50; i++)
      for (let b = 0; b < 12; b += 0.25) {
        const p = nodePose(driftSpec(i), b);
        expect(Math.abs(p.lift)).toBeLessThanOrEqual(DRIFT.node.lift + 1e-9);
        expect(Math.abs(p.tiltX)).toBeLessThanOrEqual(DRIFT.node.tilt + 1e-9);
        expect(Math.abs(p.tiltY)).toBeLessThanOrEqual(DRIFT.node.tilt + 1e-9);
        expect(Math.abs(p.spin)).toBeLessThanOrEqual(DRIFT.node.spin + 1e-9);
      }
    const up = shadowPose(-3);
    const down = shadowPose(3);
    expect(up.scale).toBeLessThan(1);
    expect(up.opacity).toBeLessThan(down.opacity);
    expect(shadowPose(0)).toEqual({ scale: 1, opacity: 1 });
  });

  it('a zone wanders and breathes a little; the sudoku box wanders, turns and tilts', () => {
    const spec = driftSpec(16);
    const scales = Array.from({ length: 40 }, (_, k) => zonePose(spec, k / 4).scale);
    expect(Math.min(...scales)).toBeGreaterThanOrEqual(1 - DRIFT.zone.breathe - 1e-9);
    expect(Math.max(...scales)).toBeLessThanOrEqual(1 + DRIFT.zone.breathe + 1e-9);
    expect(Math.max(...scales) - Math.min(...scales)).toBeGreaterThan(0.05);
    const g = gridPose(spec, 1.3);
    expect(Math.abs(g.dx)).toBeLessThanOrEqual(DRIFT.grid.dx);
    expect(Math.abs(g.tiltX)).toBeLessThanOrEqual(DRIFT.grid.tilt);
    expect(Math.abs(g.spin)).toBeLessThanOrEqual(DRIFT.grid.spin);
  });

  it('a beacon that comes later waits for the drift’s next beat', () => {
    expect(msUntilBeat(1000, 1000)).toBe(MAP_MOTION.beaconWakeMs);
    expect(msUntilBeat(1000 + MAP_MOTION.beaconWakeMs, 1000)).toBe(0);
    expect(msUntilBeat(1000 + MAP_MOTION.beaconWakeMs + 1000, 1000)).toBe(BEACON_PERIOD_MS - 1000);
    expect(msUntilBeat(1000 + MAP_MOTION.beaconWakeMs + 2 * BEACON_PERIOD_MS, 1000)).toBe(0);
  });
});

describe('the way: a thin gold line, then dots (Moshe 25.11.2026: "אולי קו זהב דק")', () => {
  it('thin, and the dots run on across pieces (a whole number of them in the dash period)', () => {
    expect(LINE.gold).toBeLessThanOrEqual(3);
    expect(LINE.glow).toBeLessThan(MAP.road.width / 4);
    const period = MAP.road.dash + MAP.road.gap;
    expect(Number.isInteger(period / LINE.dotEvery)).toBe(true);
  });
});
