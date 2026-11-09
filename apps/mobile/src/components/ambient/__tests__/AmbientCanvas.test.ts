import { Skia } from '@shopify/react-native-skia';

import type { DrawCall } from '../../interference/testing/skiaMock';
import { DIGIT_OUTLINES, GLYPHS, parseOutlines, recordAmbient } from '../AmbientCanvas';
import { ambientField, inView, poseAt } from '../ambientModel';

/** The picture (D126): drawn here into the Skia stand-in of jest.setup.ts, which records the calls. */

const WINDOW = { width: 400, height: 860 };

interface PaintRecord {
  color?: unknown;
  alpha?: number;
}

function record(t: number, field = ambientField({ ...WINDOW, glyphs: GLYPHS })) {
  const paints: PaintRecord[] = [];
  const paint = jest.spyOn(Skia, 'Paint').mockImplementation(() => {
    const p: PaintRecord = {};
    paints.push(p);
    return {
      setAntiAlias: () => {},
      setColor: (c: unknown) => void (p.color = c),
      setAlphaf: (a: number) => void (p.alpha = a),
      dispose: () => {},
    } as unknown as ReturnType<typeof Skia.Paint>;
  });
  const parsed: { svg: string; disposed: boolean }[] = [];
  const path = jest.spyOn(Skia.Path, 'MakeFromSVGString').mockImplementation((svg: string) => {
    const p = { svg, disposed: false, dispose: () => void (p.disposed = true) };
    parsed.push(p);
    return p as unknown as ReturnType<typeof Skia.Path.MakeFromSVGString>;
  });
  const picture = recordAmbient(parseOutlines(DIGIT_OUTLINES), field, t, '#21252c', '#0f1116') as unknown as {
    calls: DrawCall[];
  };
  paint.mockRestore();
  path.mockRestore();
  return { field, paints, parsed, calls: picture.calls };
}

const ops = (calls: DrawCall[], op: string) => calls.filter((c) => c.op === op);

describe('the ambient picture', () => {
  it('draws every digit in view once, as its outline, in one solid ink with no alpha (overlaps never add up)', () => {
    const t = 42_000;
    const { field, paints, calls } = record(t);
    const shown = field.digits.filter((_, i) => inView(field, i, poseAt(field, i, t)));
    expect(shown.length).toBeGreaterThan(30);
    expect(ops(calls, 'drawPath')).toHaveLength(shown.length);
    expect(ops(calls, 'save')).toHaveLength(shown.length);
    expect(ops(calls, 'restore')).toHaveLength(shown.length);
    expect(paints).toEqual([{ color: '#21252c' }]);
    // The ground first, under every digit: the canvas is opaque (a SurfaceView on Android).
    expect(calls[0]).toEqual({ op: 'drawColor', args: [Skia.Color('#0f1116')] });
    expect(ops(calls, 'drawColor')).toHaveLength(1);
    const outlines = ops(calls, 'drawPath').map((c) => (c.args[0] as { svg: string }).svg);
    expect(outlines).toEqual(shown.map((d) => DIGIT_OUTLINES[d.digit - 1]));
  });

  it('skips the digits wholly off the window (those waiting in the strip where they wrap)', () => {
    const t = 42_000;
    const { field, calls } = record(t);
    const hidden = field.digits.filter((_, i) => !inView(field, i, poseAt(field, i, t)));
    expect(hidden.length).toBeGreaterThan(0);
    expect(ops(calls, 'drawPath').length + hidden.length).toBe(field.digits.length);
  });

  it('places each digit at its pose: its ink’s middle there, turned about it, scaled to its size', () => {
    const t = 90_000;
    const { field, calls } = record(t);
    const shown = field.digits.flatMap((d, i) => {
      const pose = poseAt(field, i, t);
      return inView(field, i, pose) ? [{ d, pose }] : [];
    });
    const moves = ops(calls, 'translate').map((c) => c.args);
    const turns = ops(calls, 'rotate').map((c) => c.args);
    const scales = ops(calls, 'scale').map((c) => c.args);
    shown.forEach(({ d, pose }, k) => {
      expect(moves[2 * k]).toEqual([pose.x, pose.y]);
      expect(turns[k]).toEqual([pose.rot, 0, 0]);
      expect(scales[k]).toEqual([d.size / 100, d.size / 100]);
      // The glyph's path starts at its feet: moved up by half its ink, so it turns about its middle.
      expect(moves[2 * k + 1]).toEqual([0, -d.midY]);
    });
  });

  it('parses nothing per picture: it draws the nine paths it is given, however many digits share them', () => {
    const paths = parseOutlines(DIGIT_OUTLINES);
    const parse = jest.spyOn(Skia.Path, 'MakeFromSVGString');
    try {
      const field = ambientField({ ...WINDOW, glyphs: GLYPHS });
      for (const t of [0, 33, 67]) recordAmbient(paths, field, t, '#21252c', '#0f1116');
      expect(parse).not.toHaveBeenCalled();
    } finally {
      parse.mockRestore();
    }
  });

  it('the nine outlines parse into nine paths, digits 1–9 in order', () => {
    const { parsed } = record(0);
    expect(parsed.map((p) => p.svg)).toEqual(DIGIT_OUTLINES);
  });
});
