import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { render, screen } from '@testing-library/react-native';
import { I18nManager, Platform, StyleSheet, type ViewStyle } from 'react-native';

import i18n from '../../../i18n';
import { color, tokens } from '../../../theme';
import { VsBadge } from '../../player/Badges';
import { SLANT, Slant, slantTransforms } from '../slant';
import { hostStyles } from '../testing/layout';

const styleOf = (el: { props: { style?: unknown } }) => StyleSheet.flatten(el.props.style as ViewStyle) ?? {};

/** A 2-D affine map: x' = a·x + c·y + tx, y' = b·x + d·y + ty (y down, as on screen). */
type Affine = { a: number; b: number; c: number; d: number; tx: number; ty: number };
type Op = Record<string, string | number>;

const ID: Affine = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
const rad = (v: string | number) => (parseFloat(String(v)) * Math.PI) / 180;
const times = (m: Affine, n: Affine): Affine => ({
  a: m.a * n.a + m.c * n.b,
  b: m.b * n.a + m.d * n.b,
  c: m.a * n.c + m.c * n.d,
  d: m.b * n.c + m.d * n.d,
  tx: m.a * n.tx + m.c * n.ty + m.tx,
  ty: m.b * n.tx + m.d * n.ty + m.ty,
});

/** One transform as React Native builds it (TransformHelper / MatrixMathHelper's apply*). */
function opMatrix(op: Op): Affine {
  const [key, value] = Object.entries(op)[0]!;
  switch (key) {
    case 'rotate':
      return {
        ...ID,
        a: Math.cos(rad(value)),
        b: Math.sin(rad(value)),
        c: -Math.sin(rad(value)),
        d: Math.cos(rad(value)),
      };
    case 'scaleX':
      return { ...ID, a: Number(value) };
    case 'scaleY':
      return { ...ID, d: Number(value) };
    case 'skewX':
      return { ...ID, c: Math.tan(rad(value)) };
    case 'translateY':
      return { ...ID, ty: Number(value) };
    default:
      throw new Error(`no ${key} here`);
  }
}

/** A transform list as React Native composes it: CSS order, the first one outermost. */
const matrixOf = (ops: readonly Op[]): Affine => ops.reduce<Affine>((m, op) => times(m, opMatrix(op)), ID);

/**
 * What an Android View draws from a transform (RN 0.86 BaseViewManager.setTransformProperty): the matrix is
 * decomposed (MatrixMathHelper.decomposeMatrix), and only the translation, the rotation (rounded to 3 places)
 * and the scales reach the View, which draws translate · rotate · scale. The skew is dropped.
 */
function androidDraws(ops: readonly Op[]): Affine {
  const m = matrixOf(ops);
  let sx = Math.hypot(m.a, m.b);
  let r0 = [m.a / sx, m.b / sx] as const;
  const skew = r0[0] * m.c + r0[1] * m.d;
  let r1 = [m.c - skew * r0[0], m.d - skew * r0[1]] as const;
  let sy = Math.hypot(r1[0], r1[1]);
  r1 = [r1[0] / sy, r1[1] / sy];
  if (r0[0] * r1[1] - r0[1] * r1[0] < 0) {
    [sx, sy, r0, r1] = [-sx, -sy, [-r0[0], -r0[1]], [-r1[0], -r1[1]]];
  }
  const deg = Math.round(((-Math.atan2(r1[0], r0[0]) * 180) / Math.PI) * 1000) / 1000;
  return times(
    { ...matrixOf([{ rotate: `${deg}deg` }]), tx: m.tx, ty: m.ty },
    matrixOf([{ scaleX: sx }, { scaleY: sy }]),
  );
}

/** A box's corners, about its centre, through a map: top-left, top-right, bottom-right, bottom-left. */
function corners(m: Affine, width: number, height: number): number[][] {
  return [
    [-width / 2, -height / 2],
    [width / 2, -height / 2],
    [width / 2, height / 2],
    [-width / 2, height / 2],
  ].map(([x, y]) => [m.a * x! + m.c * y! + m.tx + width / 2, m.b * x! + m.d * y! + m.ty + height / 2]);
}

const near = (got: number[][], want: number[][], within: number) =>
  got.forEach((p, i) => p.forEach((v, j) => expect(Math.abs(v - want[i]![j]!)).toBeLessThan(within)));

/** The shape two nested views draw: the outer's transform over the inner's. */
const drawn = (t: { outer: readonly Op[]; inner: readonly Op[] }, draw = matrixOf) =>
  times(draw(t.outer), draw(t.inner));

describe('slantTransforms: skewX as transforms a View can draw', () => {
  it.each([-8, 8, -20, 0])('outer · inner is exactly skewX(%d°)', (deg) => {
    const m = drawn(slantTransforms(deg));
    const want = matrixOf([{ skewX: `${deg}deg` }]);
    for (const k of ['a', 'b', 'c', 'd', 'tx', 'ty'] as const) expect(m[k]).toBeCloseTo(want[k], 12);
  });

  it('keeps the area (the stretches multiply to 1) and nothing in it is a skew', () => {
    const [rotate, { scaleX }, { scaleY }] = SLANT.outer;
    expect(scaleX * scaleY).toBeCloseTo(1, 12);
    expect(scaleX - scaleY).toBeCloseTo(Math.abs(Math.tan(rad(tokens.effects.skewXDeg))), 12);
    expect(Object.keys(rotate)).toEqual(['rotate']);
    expect(SLANT.inner.map((op) => Object.keys(op))).toEqual([['rotate']]);
  });

  it('Android draws each part whole, so the slant survives there (a plain skewX does not: B13/B16)', () => {
    // The hero "שחק" (342 × 96): its corners as Android draws the two parts, within a hundredth of a dp.
    const want = corners(matrixOf([{ skewX: `${tokens.effects.skewXDeg}deg` }]), 342, 96);
    near(corners(drawn(SLANT, androidDraws), 342, 96), want, 0.01);
    // The old way: one view with skewX. Android keeps no skew, so it is the plain box.
    near(
      corners(androidDraws([{ skewX: `${tokens.effects.skewXDeg}deg` }]), 342, 96),
      corners(ID, 342, 96),
      1e-9,
    );
    // The face's press moves the box it sits in, not the slant: still whole on Android.
    near(
      corners(androidDraws([{ translateY: 3 }, ...SLANT.outer]), 342, 96),
      corners(matrixOf([{ translateY: 3 }, ...SLANT.outer]), 342, 96),
      0.01,
    );
  });

  it.each([
    ['hero', 342, tokens.size.ctaHero],
    ['modal', 160, tokens.size.buttonModal],
    ['VS badge', tokens.size.vsBadge.width, tokens.size.vsBadge.height],
  ])('the %s parallelogram: the top leans right and the foot left, by tan 8° × h/2 each', (_, w, h) => {
    const lean = Math.tan(rad(-tokens.effects.skewXDeg)) * (h / 2);
    near(
      corners(drawn(SLANT), w, h),
      [
        [lean, 0],
        [w + lean, 0],
        [w - lean, h],
        [-lean, h],
      ],
      1e-9,
    );
  });

  it('stands out 3.4 dp at 48 dp, as components.md §1.0 says', () => {
    expect(Math.tan(rad(8)) * (tokens.size.buttonModal / 2)).toBeCloseTo(3.4, 1);
  });
});

describe('Slant', () => {
  it('draws the look on the inner view, slanted by the two transforms; the outer is only the box', async () => {
    await render(
      <Slant
        style={{ top: 4, bottom: -4 }}
        shapeStyle={{ backgroundColor: '#123456', borderRadius: 12 }}
        testID="edge"
        shapeTestID="edge-shape"
      />,
    );
    const outer = screen.getByTestId('edge');
    expect(outer).toHaveProp('pointerEvents', 'none');
    expect(styleOf(outer)).toEqual({
      position: 'absolute',
      left: 0,
      right: 0,
      top: 4,
      bottom: -4,
      transform: SLANT.outer,
    });
    expect(styleOf(screen.getByTestId('edge-shape'))).toEqual({
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      backgroundColor: '#123456',
      borderRadius: 12,
      transform: SLANT.inner,
    });
  });

  it('on Android too: no skew in any transform it draws, only rotations and scales', async () => {
    const os = jest.replaceProperty(Platform, 'OS', 'android');
    try {
      await render(<Slant shapeStyle={{ backgroundColor: '#123456' }} />);
      const ops = hostStyles(screen.container).flatMap((s) => (s.transform as Op[] | undefined) ?? []);
      expect(ops.map((op) => Object.keys(op)[0])).toEqual(['rotate', 'scaleX', 'scaleY', 'rotate']);
    } finally {
      os.restore();
    }
  });

  it('is not mirrored in RTL: a brand slant, not a direction (components.md §1.1)', async () => {
    const looks: unknown[] = [];
    for (const rtl of [true, false]) {
      jest.replaceProperty(I18nManager, 'isRTL', rtl);
      await render(<Slant shapeStyle={{ backgroundColor: '#123456' }} />);
      looks.push(hostStyles(screen.container));
      await screen.unmount();
    }
    expect(looks[0]).toEqual(looks[1]);
  });
});

describe('every slanted look is drawn with it', () => {
  it('the VS badge (§3.5): a slanted plate in its colours, the word upright', async () => {
    await i18n.changeLanguage('he');
    await render(<VsBadge />);
    const styles = hostStyles(screen.container);
    expect(styles).toContainEqual(
      expect.objectContaining({
        backgroundColor: color.vsBadge.bg,
        borderColor: color.vsBadge.border,
        transform: SLANT.inner,
      }),
    );
    expect(styleOf(screen.getByText('VS', { includeHiddenElements: true })).transform).toBeUndefined();
  });

  /** Where a `skewX` stays on purpose, and why. */
  const ALLOWED: Record<string, string> = {
    'src/screens/game/arsenal/TokenArt.tsx':
      "the Warp token's wobble, an icon animation and not the brand slant (on Android only its swell shows)",
  };

  it('no view in the app skews itself: Android would draw it straight (B13/B16)', () => {
    const app = join(__dirname, '../../../..');
    const files = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const path = join(dir, e.name);
        if (e.isDirectory()) return /^(__tests__|testing|node_modules)$/.test(e.name) ? [] : files(path);
        return /\.tsx?$/.test(e.name) ? [path] : [];
      });
    const skewing = [...files(join(app, 'src')), ...files(join(app, 'app'))]
      .filter((f) => /\bskew[XY]\s*:/.test(readFileSync(f, 'utf8')))
      .map((f) => relative(app, f).split(sep).join('/'));
    expect(skewing).toEqual(Object.keys(ALLOWED));
  });
});
