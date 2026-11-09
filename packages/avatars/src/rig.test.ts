import { AVATARS } from './catalog';
import { PIRATE_CAST } from './catalog/pirates';
import { FACE } from './palette';
import {
  drawBrows,
  drawCheeks,
  drawExtras,
  drawEyes,
  drawMouth,
  eyeCentres,
  eyeSlots,
  haloOf,
  SMALL_SIZE,
} from './rig';
import { clipEllipse, cutEllipse, ellipsePath, f, sideOf } from './svg';
import { FIXTURES } from './testing/fixtures';
import { checkXml } from './testing/xml';
import {
  EXPRESSIONS,
  EYE_STYLES,
  type EyeStyle,
  type FaceDef,
  type OneEye,
  type ThreeEyes,
  type TwoEyes,
} from './types';

const DRAW = [drawEyes, drawBrows, drawMouth, drawCheeks, drawExtras];

/** A plain face for each eye style: the rig must not depend on any one avatar. */
const face = (style: EyeStyle, r = 5): FaceDef & { eyes: TwoEyes } => ({
  ink: FACE.ink,
  eyes: { left: { x: 40, y: 50 }, right: { x: 60, y: 50 }, r, style },
  brows: {},
  mouth: { x: 50, y: 68, w: 14 },
  cheeks: { color: FACE.blush },
});

/** The same face with one big eye in the middle (a cyclops). */
const oneEye = (style: EyeStyle, r = 9): FaceDef & { eyes: OneEye } => ({
  ...face(style),
  eyes: { count: 1, middle: { x: 50, y: 48 }, r, style },
  mouth: { x: 50, y: 72, w: 16 },
});

/** Three eyes, the middle one higher (an alien). */
const threeEyes = (style: EyeStyle, r = 5): FaceDef & { eyes: ThreeEyes } => ({
  ...face(style, r),
  eyes: { count: 3, left: { x: 36, y: 52 }, right: { x: 64, y: 52 }, middle: { x: 50, y: 36 }, r, style },
});

/** Two eyes, the left one under a patch (a pirate). */
const patched = (style: EyeStyle): FaceDef & { eyes: TwoEyes } => {
  const fc = face(style);
  return { ...fc, eyes: { ...fc.eyes, covered: 'left' } };
};

const strokeWidths = (svg: string) => [...svg.matchAll(/stroke-width="([\d.]+)"/g)].map((m) => Number(m[1]));
const count = (svg: string, re: RegExp) => (svg.match(re) ?? []).length;
/** Eye groups drawn: one <g class="sfa-eye"> per eye. */
const eyeGroups = (svg: string) => count(svg, /<g class="sfa-eye"/g);
/** Closed eyes and spirals are strokes; open eyes are fills. */
const strokes = (svg: string) => count(svg, /fill="none"/g);
const paths = (svg: string) => count(svg, /<path /g);

describe('the face rig', () => {
  it.each(EYE_STYLES)('draws every expression for %s eyes as well-formed SVG', (style) => {
    for (const fc of [face(style, 3.5), face(style, 8), oneEye(style), threeEyes(style), patched(style)])
      for (const expression of EXPRESSIONS)
        for (const size of [24, 48, 160]) {
          const out = DRAW.map((d) => d(fc, expression, { size })).join('');
          expect(() => checkXml(`<g>${out}</g>`)).not.toThrow();
          expect(out).not.toMatch(/NaN|Infinity|undefined/);
        }
  });

  it('draws different eyes for every expression, with one, two or three eyes', () => {
    for (const style of EYE_STYLES)
      for (const fc of [face(style), oneEye(style), threeEyes(style), patched(style)]) {
        const eyes = new Set(EXPRESSIONS.map((e) => drawEyes(fc, e)));
        // neutral and surprised differ by size, smile and wink by a closed eye, sad and confused by lids
        expect(eyes.size).toBe(EXPRESSIONS.length);
      }
  });

  it('draws every expression of the catalog and the demos with distinct faces', () => {
    for (const a of [...AVATARS, ...FIXTURES]) {
      const faces = EXPRESSIONS.map((e) => DRAW.map((d) => d(a.face, e, { size: 160 })).join(''));
      expect(new Set(faces).size).toBe(EXPRESSIONS.length);
    }
  });

  it('closes exactly one eye for a wink', () => {
    const out = drawEyes(face('round'), 'wink');
    expect(strokes(out)).toBe(1); // the closed eye is a stroke
  });

  it('simplifies small sizes: no brows, cheeks or extras, and lines no thinner than about a pixel', () => {
    for (const a of [...AVATARS, ...FIXTURES])
      for (const expression of EXPRESSIONS) {
        const size = 24;
        expect(drawBrows(a.face, expression, { size })).toBe('');
        expect(drawCheeks(a.face, expression, { size })).toBe('');
        expect(drawExtras(a.face, expression, { size })).toBe('');
        const lines = strokeWidths(
          drawEyes(a.face, expression, { size }) + drawMouth(a.face, expression, { size }),
        );
        for (const w of lines) expect(w).toBeGreaterThanOrEqual((0.6 * 100) / size);
      }
    expect(SMALL_SIZE).toBeGreaterThan(24);
    expect(SMALL_SIZE).toBeLessThan(48);
  });

  it('keeps brows and extras at full size', () => {
    for (const a of [...AVATARS, ...FIXTURES]) {
      if (a.face.brows) expect(drawBrows(a.face, 'surprised', { size: 160 })).not.toBe('');
      expect(drawExtras(a.face, 'dizzy', { size: 160 })).not.toBe('');
      expect(drawExtras(a.face, 'sad', { size: 160 })).toContain(FACE.tear);
      expect(drawExtras(a.face, 'angry', { size: 160 })).toContain(FACE.anger);
      expect(drawExtras(a.face, 'sleepy', { size: 160 })).toContain(FACE.zzz);
      expect(drawExtras(a.face, 'neutral', { size: 160 })).toBe('');
    }
  });

  it('draws the comic marks over a white edge, so they read on any surface', () => {
    for (const e of ['angry', 'sleepy'] as const) {
      const out = drawExtras(face('dot'), e, { size: 160 });
      expect(out).toContain(`stroke="${FACE.markEdge}"`);
      expect(out.indexOf(FACE.markEdge)).toBeLessThan(out.indexOf(e === 'angry' ? FACE.anger : FACE.zzz));
    }
  });

  it('places dizzy stars at the halo, or above the eyes', () => {
    const plain = face('dot', 4);
    expect(haloOf(plain)).toEqual({ x: 50, y: 50 - 4.2 * 4 });
    expect(haloOf({ ...plain, halo: { x: 30, y: 9 } })).toEqual({ x: 30, y: 9 });
    expect(
      haloOf({ ...plain, eyes: { ...plain.eyes, left: { x: 40, y: 10 }, right: { x: 60, y: 10 } } }).y,
    ).toBe(7);
    // above the highest eye
    expect(haloOf(threeEyes('dot', 4)).y).toBeCloseTo(36 - 4.2 * 4);
  });

  it('draws no brows for a face without them, and no mouth when the art draws it', () => {
    expect(drawBrows({ ...face('dot'), brows: false }, 'surprised')).toBe('');
    for (const e of EXPRESSIONS) expect(drawMouth({ ...face('dot'), mouth: false }, e)).toBe('');
  });

  it('puts every drawn eye in its own group, centred for its blink', () => {
    const out = drawEyes(threeEyes('round'), 'neutral');
    expect(eyeGroups(out)).toBe(3);
    for (const c of eyeCentres(threeEyes('round')))
      expect(out).toContain(`style="--sfa-eyes:${f(c.x)}px ${f(c.y)}px"`);
  });

  it('draws angry eyes with lids sloping to the middle, and sleepy ones half shut', () => {
    // the lids cut the eye: an angry or sleepy eye is drawn smaller than a neutral one
    for (const fc of [face('round'), oneEye('round'), threeEyes('round')]) {
      const neutral = drawEyes(fc, 'neutral');
      expect(drawEyes(fc, 'angry')).not.toBe(neutral);
      expect(drawEyes(fc, 'sleepy')).not.toBe(neutral);
      expect(strokes(drawEyes(fc, 'angry'))).toBe(0); // open, not closed
    }
  });
});

describe('one eye', () => {
  const fc = oneEye('round');

  it('draws one eye in the middle', () => {
    expect(eyeSlots(fc)).toEqual([{ c: { x: 50, y: 48 }, r: 9, out: 0, drawn: true, middle: false }]);
    expect(eyeGroups(drawEyes(fc, 'neutral'))).toBe(1);
  });

  it('winks with a sly half-closed squint, not a closed eye', () => {
    const wink = drawEyes(fc, 'wink');
    expect(strokes(wink)).toBe(0);
    expect(wink).not.toBe(drawEyes(fc, 'neutral'));
    expect(strokes(drawEyes(fc, 'laugh'))).toBe(1); // laughing closes it
  });

  it('spirals when dizzy', () => {
    expect(strokes(drawEyes(fc, 'dizzy'))).toBe(1);
  });

  it('has one unibrow: a sharp V when angry, a curve when sad', () => {
    for (const e of EXPRESSIONS) expect(paths(drawBrows(fc, e, { size: 160 }))).toBe(1);
    expect(drawBrows(fc, 'angry', { size: 160 })).toMatch(/d="M[\d. -]+L[\d. -]+L[\d. -]+"/);
    expect(drawBrows(fc, 'sad', { size: 160 })).toMatch(/d="M[\d. -]+Q[\d. -]+"/);
  });

  it('puts a cheek on each side and its tear beside the eye, clear of the mouth', () => {
    expect(count(drawCheeks(fc, 'smile', { size: 160 }), /<ellipse /g)).toBe(2);
    // the drop starts at its tip (M x y) and is about 2.7 of its size s = 3.5 tall
    const tip = /M([\d.]+) ([\d.]+)/.exec(drawExtras(fc, 'sad', { size: 160 }));
    const mouth = fc.mouth;
    if (!tip || !mouth) throw new Error('no tear or no mouth');
    expect(Number(tip[2]) + 2.7 * 3.5).toBeLessThan(mouth.y - 0.15 * mouth.w);
    expect(Number(tip[1])).toBeLessThan(fc.eyes.middle.x - 0.5 * fc.eyes.r);
  });
});

describe('three eyes', () => {
  const fc = threeEyes('round');

  it('draws three eyes; the middle one has no brow', () => {
    expect(eyeGroups(drawEyes(fc, 'neutral'))).toBe(3);
    expect(paths(drawBrows(fc, 'neutral', { size: 160 }))).toBe(2);
    expect(eyeSlots(fc).map((s) => s.middle)).toEqual([false, true, false]);
  });

  it('winks with the outer two, the middle one keeps looking', () => {
    expect(strokes(drawEyes(fc, 'wink'))).toBe(2);
    expect(strokes(drawEyes(fc, 'laugh'))).toBe(3);
  });

  it('spirals every eye when dizzy', () => {
    expect(strokes(drawEyes(fc, 'dizzy'))).toBe(3);
  });

  it('scales the middle eye on request', () => {
    const big = { ...fc, eyes: { ...fc.eyes, middleScale: 1.5 } };
    expect(eyeSlots(big)[1]?.r).toBeCloseTo(7.5);
    expect(drawEyes(big, 'neutral')).not.toBe(drawEyes(fc, 'neutral'));
  });
});

describe('a covered eye', () => {
  const fc = patched('dot');

  it('is not drawn, but keeps its place for brows and cheeks', () => {
    expect(eyeGroups(drawEyes(fc, 'neutral'))).toBe(1);
    expect(eyeCentres(fc)).toEqual([{ x: 60, y: 50 }]);
    expect(eyeSlots(fc)).toHaveLength(2);
    expect(paths(drawBrows(fc, 'neutral', { size: 160 }))).toBe(2);
    expect(count(drawCheeks(fc, 'smile', { size: 160 }), /<ellipse /g)).toBe(2);
  });

  it('carries every expression with the other eye: its wink is a squint, its tear falls from it', () => {
    expect(strokes(drawEyes(fc, 'wink'))).toBe(0);
    expect(strokes(drawEyes(fc, 'laugh'))).toBe(1);
    const tear = drawExtras(fc, 'sad', { size: 160 });
    const xs = [...tear.matchAll(/M([\d.]+) /g)].map((m) => Number(m[1]));
    for (const x of xs) expect(x).toBeGreaterThan(50);
  });
});

describe('an iris (EyeLook.iris)', () => {
  const IRIS = '#4f74b3';
  const withIris = (style: EyeStyle): FaceDef & { eyes: TwoEyes } => {
    const fc = face(style);
    return { ...fc, eyes: { ...fc.eyes, iris: IRIS } };
  };
  /** The centre of each ellipse path of one fill, from its "M{x-rx} {cy}a{rx} …" start. */
  const discs = (svg: string, fill: string) =>
    [
      ...svg.matchAll(
        new RegExp(`<path d="M([\\d.]+) ([\\d.]+)a([\\d.]+) [\\d.]+ [^"]*" fill="${fill}"`, 'g'),
      ),
    ].map((m) => ({ x: Number(m[1]) + Number(m[3]), y: Number(m[2]), r: Number(m[3]) }));

  it('draws an iris in round and oval eyes, between the eyeball and the pupil', () => {
    for (const style of ['round', 'oval'] as const) {
      const svg = drawEyes(withIris(style), 'neutral', { size: 160 });
      expect(count(svg, new RegExp(`fill="${IRIS}"`, 'g'))).toBe(2);
      const ball = svg.indexOf(`fill="${FACE.white}"`);
      const iris = svg.indexOf(`fill="${IRIS}"`);
      const pupil = svg.indexOf(`fill="${FACE.ink}"`);
      expect(ball).toBeLessThan(iris);
      expect(iris).toBeLessThan(pupil);
      // the pupil sits inside the iris, the iris inside the eyeball
      const [i] = discs(svg, IRIS);
      const [p] = discs(svg, FACE.ink);
      expect(p!.r).toBeLessThan(i!.r);
      expect(i!.r).toBeLessThan(5);
    }
  });

  it('keeps the iris its size when surprised: the pupil shrinks inside it', () => {
    const fc = withIris('round');
    const plain = drawEyes(fc, 'neutral', { size: 160 });
    const wide = drawEyes(fc, 'surprised', { size: 160 });
    expect(discs(wide, IRIS)[0]!.r).toBeCloseTo(discs(plain, IRIS)[0]!.r, 1);
    expect(discs(wide, FACE.ink)[0]!.r).toBeLessThan(discs(plain, FACE.ink)[0]!.r);
  });

  it('moves the iris with the gaze, and lids cut it like the rest of the eye', () => {
    const fc = withIris('round');
    const down = discs(drawEyes(fc, 'confused', { size: 160 }), IRIS);
    expect(down[0]!.y).toBeLessThan(50); // confused looks up
    const sleepy = drawEyes(fc, 'sleepy', { size: 160 });
    expect(sleepy).toContain(`fill="${IRIS}"`);
    expect(sleepy).not.toMatch(new RegExp(`<path d="M[\\d.]+ [\\d.]+a[^"]*" fill="${IRIS}"`)); // cut: no whole ellipse
  });

  it('leaves the plain pupil under 40 px, and every other eye style as it was', () => {
    for (const style of EYE_STYLES) {
      for (const e of EXPRESSIONS) {
        expect(drawEyes(withIris(style), e, { size: SMALL_SIZE - 1 })).toBe(
          drawEyes(face(style), e, { size: SMALL_SIZE - 1 }),
        );
        if (style === 'dot' || style === 'button')
          expect(drawEyes(withIris(style), e, { size: 160 })).toBe(drawEyes(face(style), e, { size: 160 }));
      }
    }
  });

  it('changes nothing for a face without one (every avatar of the catalog but the invested pirates)', () => {
    // The iris is the pirates' invested look (catalog/pirates/, choosable since 31.10.2026); no other has one.
    expect(AVATARS.filter((a) => a.face.eyes.iris !== undefined).map((a) => a.id)).toEqual(
      PIRATE_CAST.map((c) => c.looks.invested.id),
    );
    const fc = face('round');
    expect(drawEyes({ ...fc, eyes: { ...fc.eyes, iris: undefined } }, 'smile', { size: 160 })).toBe(
      drawEyes(fc, 'smile', { size: 160 }),
    );
  });
});

describe('svg helpers', () => {
  it('formats numbers short, without -0', () => {
    expect(f(1.23456)).toBe('1.23');
    expect(f(-0.001)).toBe('0');
    expect(f(10)).toBe('10');
  });

  it('cuts an ellipse with a half-plane', () => {
    const e = { cx: 50, cy: 50, rx: 4, ry: 5 };
    const below = (y: number) => sideOf({ x: 0, y }, { x: 100, y }, 'below');
    expect(cutEllipse(e, below(40))).toBe(ellipsePath(e)); // the line is above the ellipse: all kept
    expect(cutEllipse(e, below(60))).toBe(''); // the line is below it: nothing kept
    // through the centre: the lower half, from the left point down round the bottom (sweep 0) to the right
    expect(cutEllipse(e, below(50))).toBe('M46 50A4 5 0 0 0 54 50Z');
    // and the upper half the other way round, over the top
    expect(cutEllipse(e, sideOf({ x: 0, y: 50 }, { x: 100, y: 50 }, 'above'))).toBe(
      'M54 50A4 5 0 0 0 46 50Z',
    );
    // a low cut keeps a small cap (small arc); a high cut keeps most of it (large arc)
    expect(cutEllipse(e, below(53))).toBe('M46.8 53A4 5 0 0 0 53.2 53Z');
    expect(cutEllipse(e, below(47))).toBe('M46.8 47A4 5 0 1 0 53.2 47Z');
    // a slanted lid (a sad eye): a large arc between two points on the ellipse
    const lid = cutEllipse(e, sideOf({ x: 46, y: 49 }, { x: 54, y: 46 }, 'below'));
    expect(lid).toMatch(/^M[\d.]+ [\d.]+A4 5 0 1 0 [\d.]+ [\d.]+Z$/);
    for (const m of lid.matchAll(/([\d.]+) ([\d.]+)(?=A|Z)/g)) {
      const [x, y] = [Number(m[1]), Number(m[2])];
      expect(((x - 50) / 4) ** 2 + ((y - 50) / 5) ** 2).toBeCloseTo(1, 1);
    }
  });

  it('clips an ellipse to several half-planes at once', () => {
    const e = { cx: 50, cy: 50, rx: 4, ry: 5 };
    const below = (y: number) => sideOf({ x: 0, y }, { x: 100, y }, 'below');
    const above = (y: number) => sideOf({ x: 0, y }, { x: 100, y }, 'above');
    expect(clipEllipse(e, [])).toBe(ellipsePath(e));
    expect(clipEllipse(e, [below(48)])).toBe(cutEllipse(e, below(48)));
    expect(clipEllipse(e, [below(40), above(60)])).toBe(ellipsePath(e)); // both lines outside: all kept
    expect(clipEllipse(e, [below(53), above(47)])).toBe(''); // nothing between them
    // a band: two straight edges and two arcs, every corner on the ellipse
    const band = clipEllipse(e, [below(48), above(52)]);
    expect(count(band, /L/g)).toBe(2);
    expect(count(band, /A/g)).toBe(2);
    for (const m of band.matchAll(/([\d.]+) ([\d.]+)(?=[LAZ])/g)) {
      const [x, y] = [Number(m[1]), Number(m[2])];
      expect(((x - 50) / 4) ** 2 + ((y - 50) / 5) ** 2).toBeCloseTo(1, 1);
    }
  });
});
