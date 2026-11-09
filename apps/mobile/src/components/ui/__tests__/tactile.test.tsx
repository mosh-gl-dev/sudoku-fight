import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { I18nManager, Platform, StyleSheet, Text, type ViewStyle } from 'react-native';

import i18n from '../../../i18n';
import { cue } from '../../../services/feedback';
import { useSettings } from '../../../state/settings';
import { color, contrast, radius, tokens } from '../../../theme';
import {
  CARD_BASE,
  cardStyle,
  EDGE,
  faceStyle,
  NO_BORDER,
  PRESSED_SCALE,
  PressableCard,
  type SurfaceKind,
  TactileSurface,
  tintLayer,
  verticalGradient,
} from '../tactile';
import { SLANT } from '../slant';
import { directionProblems, hostStyles } from '../testing/layout';

jest.mock('../../../services/feedback', () => ({ cue: jest.fn() }));
const cueOf = jest.mocked(cue);

const styleOf = (el: { props: { style?: unknown } }) => StyleSheet.flatten(el.props.style as ViewStyle) ?? {};
const T = tokens.elevation.tactile;
const C = color.tactile;
const KINDS: SurfaceKind[] = ['gold', 'slate', 'icon', 'danger'];
const idle = { pressed: false, disabled: false };
/** One frame at 60 Hz. */
const FRAME = 16;

/** Mixes an rgba(…) colour over an opaque #rrggbb one, to a #rrggbb (what the eye sees). */
function over(rgba: string, under: string): string {
  const [r, g, b, a] = rgba.match(/[\d.]+/g)!.map(Number) as [number, number, number, number];
  const n = parseInt(under.slice(1), 16);
  const base = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return `#${[r, g, b]
    .map((v, i) => Math.round(v * a + base[i]! * (1 - a)))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
}

describe('tactile recipes (D125: depth from the palette’s own light and shade)', () => {
  it('uses no new hue: every gradient stop and edge is a colour the palette already had', () => {
    expect(C.goldFace).toEqual([color.accentHover, color.accent, color.accentPressed]);
    expect(C.goldFacePressed).toEqual([color.accent, color.accentPressed]);
    expect(C.slateFace).toEqual([color.surface2, color.surface]);
    expect([C.slateEdge, C.cardBase, C.disabledBorder, C.slatePressed]).toEqual(Array(4).fill(color.border));
    expect([C.dangerFace, C.cardPressed, C.disabledFace]).toEqual([
      color.surface,
      color.surface2,
      color.surface2,
    ]);
    expect(C.disabledLabel).toBe(color.textFaint);
    expect(EDGE.gold.color).toBe(color.accentShadow);
    // Lips and shades are white or black, nothing else.
    for (const light of [C.goldLip, C.slateLip, C.cardLip])
      expect(light).toMatch(/^rgba\(255,255,255,0\.\d+\)$/);
    expect(C.goldShade).toMatch(/^rgba\(0,0,0,0\.\d+\)$/);
    expect(tokens.effects).toMatchObject({ gradients: true, textures: false, glows: false });
  });

  it('every face leaves 1 dp of its edge when pressed, and a card covers its base', () => {
    for (const kind of KINDS) expect(EDGE[kind].depth - EDGE[kind].travel).toBe(1);
    expect(EDGE.gold).toMatchObject({ depth: tokens.elevation.cta.offsetY, travel: 3 });
    expect(EDGE.slate).toMatchObject({ depth: 3, travel: 2 });
    expect(EDGE.icon).toMatchObject({ depth: 2, travel: 1 });
    expect(CARD_BASE.depth).toBe(CARD_BASE.travel);
    expect(PRESSED_SCALE).toBe(0.98);
  });

  it('every face and card state sets a border width (0 when it has none): Android crashed when one was dropped', () => {
    // React Native 0.86 reads a dropped border width as NaN, and a gradient drawn over it throws: Edit profile's
    // "שמור" (disabled → on) crashed the app once an avatar was chosen (Moshe, 31.10.2026).
    const flags = [false, true];
    for (const kind of KINDS)
      for (const pressed of flags)
        for (const disabled of flags)
          for (const selected of flags)
            for (const expanded of flags) {
              const face = faceStyle(kind, { pressed, disabled, selected, expanded });
              expect([kind, pressed, disabled, selected, expanded, typeof face.borderWidth]).toEqual([
                kind,
                pressed,
                disabled,
                selected,
                expanded,
                'number',
              ]);
            }
    for (const pressed of flags)
      for (const disabled of flags)
        for (const selected of flags)
          expect(typeof cardStyle({ pressed, disabled, selected }).borderWidth).toBe('number');
  });

  it('builds gradients through the stops, evenly', () => {
    expect(verticalGradient(['#111111', '#222222', '#333333'])).toBe(
      'linear-gradient(180deg, #111111 0%, #222222 50%, #333333 100%)',
    );
    expect(verticalGradient(['#111111', '#222222'])).toBe(
      'linear-gradient(180deg, #111111 0%, #222222 100%)',
    );
    expect(tintLayer('rgba(1,2,3,0.1)')).toBe('linear-gradient(rgba(1,2,3,0.1), rgba(1,2,3,0.1))');
  });

  it('gold: the gradient face with a lit lip and a shaded foot; pressed, one step darker', () => {
    const rest = faceStyle('gold', idle);
    expect(rest).toMatchObject({
      backgroundColor: color.accent,
      experimental_backgroundImage: verticalGradient(C.goldFace),
      borderRadius: radius.button,
    });
    expect(rest.boxShadow).toEqual([
      { offsetX: 0, offsetY: T.lip.gold, blurRadius: 0, color: C.goldLip, inset: true },
      { offsetX: 0, offsetY: -T.goldShade, blurRadius: 0, color: C.goldShade, inset: true },
    ]);
    const down = faceStyle('gold', { ...idle, pressed: true });
    expect(down.experimental_backgroundImage).toBe(verticalGradient(C.goldFacePressed));
    expect(down.boxShadow).toHaveLength(1);
  });

  it('slate: a filled face lit at the top; pressed, flat and lighter; selected, gold', () => {
    expect(faceStyle('slate', idle)).toMatchObject({
      backgroundColor: color.surface2,
      experimental_backgroundImage: verticalGradient(C.slateFace),
      borderWidth: tokens.border.hairline,
      borderColor: color.border,
      borderTopColor: C.borderLit,
      boxShadow: [{ offsetX: 0, offsetY: T.lip.slate, blurRadius: 0, color: C.slateLip, inset: true }],
    });
    const down = faceStyle('slate', { ...idle, pressed: true });
    expect(down).toMatchObject({ backgroundColor: C.slatePressed, borderColor: color.border });
    expect(down.experimental_backgroundImage).toBeUndefined();
    expect(down.boxShadow).toBeUndefined();
    expect(faceStyle('slate', { ...idle, selected: true })).toMatchObject({
      borderColor: color.accent,
      experimental_backgroundImage: tintLayer(color.accentSubtle),
    });
    expect(faceStyle('icon', { ...idle, expanded: true })).toMatchObject({
      backgroundColor: color.surface2,
      borderColor: color.textMuted,
    });
  });

  it('danger: the red tint on an opaque face (its edge never shows through), still readable', () => {
    expect(faceStyle('danger', idle)).toMatchObject({
      backgroundColor: C.dangerFace,
      experimental_backgroundImage: tintLayer(color.dangerSubtle),
      borderColor: color.dangerBorder,
    });
    expect(faceStyle('danger', { ...idle, pressed: true }).experimental_backgroundImage).toBe(
      tintLayer(color.dangerPressed),
    );
    expect(contrast(color.danger, over(color.dangerSubtle, C.dangerFace))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(color.danger, over(color.dangerPressed, C.dangerFace))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(KINDS)('disabled %s: surface2, the border, no gradient, no highlight, never faded', (kind) => {
    const face = faceStyle(kind, { pressed: false, disabled: true });
    expect(face).toEqual({
      borderRadius: radius.button,
      backgroundColor: C.disabledFace,
      borderWidth: tokens.border.hairline,
      borderColor: C.disabledBorder,
    });
    expect(contrast(C.disabledLabel, C.disabledFace)).toBeGreaterThanOrEqual(4.5);
  });

  it('labels stay readable on every face', () => {
    for (const stop of C.goldFace) expect(contrast(color.onAccent, stop)).toBeGreaterThanOrEqual(4.5);
    for (const stop of C.slateFace) expect(contrast(color.text, stop)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(color.text, C.slatePressed)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(color.accent, over(color.accentSubtle, color.surface2))).toBeGreaterThanOrEqual(4.5);
  });

  it('card: surface, lit top, a 2 dp base in the border’s tone; pressed, surface2 over its base', () => {
    expect(cardStyle(idle)).toMatchObject({
      backgroundColor: color.surface,
      borderRadius: radius.card,
      borderColor: color.border,
      borderTopColor: C.borderLit,
      boxShadow: [
        { offsetX: 0, offsetY: CARD_BASE.depth, blurRadius: 0, color: C.cardBase },
        { offsetX: 0, offsetY: T.lip.card, blurRadius: 0, color: C.cardLip, inset: true },
      ],
    });
    expect(cardStyle({ ...idle, pressed: true })).toMatchObject({
      backgroundColor: C.cardPressed,
      boxShadow: [],
    });
    expect(cardStyle({ ...idle, selected: true })).toMatchObject({
      borderColor: color.accent,
      borderTopColor: color.accent,
      experimental_backgroundImage: tintLayer(color.accentSubtle),
    });
    const mine = color.players[0]!.ring;
    expect(cardStyle({ ...idle, tone: mine })).toMatchObject({ borderColor: mine, borderTopColor: mine });
    const off = cardStyle({ pressed: false, disabled: true });
    expect(off.boxShadow).toBeUndefined();
    expect(off.borderTopColor).toBeUndefined();
  });
});

describe('TactileSurface', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('he');
    useSettings.setState({ reduceMotion: 'off' });
    cueOf.mockClear();
  });

  const surface = (props: Partial<Parameters<typeof TactileSurface>[0]> = {}) => (
    <TactileSurface
      kind="slate"
      accessibilityRole="button"
      testID="s"
      edgeTestID="s-edge"
      faceTestID="s-face"
      style={{ height: 52 }}
      faceStyle={{ height: 52 }}
      onPress={jest.fn()}
      {...props}
    >
      {({ pressed }) => <Text>{pressed ? 'down' : 'up'}</Text>}
    </TactileSurface>
  );

  it('draws the edge its depth under the face, outside the box (the layout does not change)', async () => {
    await render(surface());
    expect(styleOf(screen.getByTestId('s'))).toEqual({ height: 52 });
    expect(styleOf(screen.getByTestId('s-edge'))).toMatchObject({
      position: 'absolute',
      left: 0,
      right: 0,
      top: EDGE.slate.depth,
      bottom: -EDGE.slate.depth,
      backgroundColor: C.slateEdge,
    });
    expect(styleOf(screen.getByTestId('s-face'))).toMatchObject({
      height: 52,
      backgroundColor: color.surface2,
    });
  });

  it('full motion: the face sinks onto the edge and the whole shrinks, then springs back', async () => {
    jest.useFakeTimers();
    try {
      await render(surface());
      const button = screen.getByRole('button');
      await fireEvent(button, 'pressIn');
      await act(async () => void jest.advanceTimersByTime(tokens.motion.duration.tapFeedbackMax));
      expect(screen.getByTestId('s-face')).toHaveAnimatedStyle({
        transform: [{ translateY: EDGE.slate.travel }],
      });
      expect(screen.getByTestId('s-body')).toHaveAnimatedStyle({ transform: [{ scale: PRESSED_SCALE }] });
      expect(screen.getByText('down')).toBeOnTheScreen();
      expect(styleOf(screen.getByTestId('s-face')).backgroundColor).toBe(C.slatePressed);
      await fireEvent(button, 'pressOut');
      await act(async () => void jest.advanceTimersByTime(1000));
      expect(screen.getByTestId('s-face')).toHaveAnimatedStyle({ transform: [{ translateY: 0 }] });
      expect(screen.getByTestId('s-body')).toHaveAnimatedStyle({ transform: [{ scale: 1 }] });
    } finally {
      jest.useRealTimers();
    }
  });

  it('reduced motion: no scale and no tween, yet the press still shows (the face lands, its colour turns)', async () => {
    useSettings.setState({ reduceMotion: 'on' });
    jest.useFakeTimers();
    try {
      await render(surface({ kind: 'gold', skew: true }));
      const button = screen.getByRole('button');
      await fireEvent(button, 'pressIn');
      // At once: one frame, far short of the 80 ms tween.
      await act(async () => void jest.advanceTimersByTime(FRAME));
      expect(screen.getByTestId('s-face')).toHaveAnimatedStyle({
        transform: [{ translateY: EDGE.gold.travel }],
      });
      expect(screen.getByTestId('s-body')).toHaveAnimatedStyle({ transform: [{ scale: 1 }] });
      expect(styleOf(screen.getByTestId('s-face-shape')).experimental_backgroundImage).toBe(
        verticalGradient(C.goldFacePressed),
      );
      await act(async () => void jest.advanceTimersByTime(tokens.motion.duration.tapFeedbackMax));
      expect(screen.getByTestId('s-body')).toHaveAnimatedStyle({ transform: [{ scale: 1 }] });
      await fireEvent(button, 'pressOut');
      await act(async () => void jest.advanceTimersByTime(FRAME));
      expect(screen.getByTestId('s-face')).toHaveAnimatedStyle({ transform: [{ translateY: 0 }] });
    } finally {
      jest.useRealTimers();
    }
  });

  it('skews the edge with the face (the pair rule) and leaves the box alone', async () => {
    await render(surface({ skew: true }));
    // The edge: the slanted shape (slant.tsx), its depth under the face, in the edge's colour.
    expect(styleOf(screen.getByTestId('s-edge'))).toMatchObject({
      top: EDGE.slate.depth,
      bottom: -EDGE.slate.depth,
      transform: SLANT.outer,
    });
    expect(styleOf(screen.getByTestId('s-edge-shape'))).toMatchObject({
      backgroundColor: C.slateEdge,
      borderRadius: radius.button,
      transform: SLANT.inner,
    });
    // The face's look is on its slanted plate; the face itself only holds the content and sinks.
    const plate = screen.getByTestId('s-face-shape');
    expect(styleOf(plate)).toMatchObject({ ...faceStyle('slate', idle), transform: SLANT.inner });
    expect(styleOf(plate.parent!)).toMatchObject({ transform: SLANT.outer });
    const face = styleOf(screen.getByTestId('s-face'));
    expect(face).toMatchObject({ ...NO_BORDER, height: 52 });
    expect([face.backgroundColor, face.experimental_backgroundImage, face.boxShadow]).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
    // The label is beside the plate, not in it: upright, nothing to counter-skew.
    expect(screen.getByText('up').parent).toBe(screen.getByTestId('s-face'));
    expect(styleOf(screen.getByTestId('s')).transform).toBeUndefined();
  });

  it('on Android the slant is drawn: no transform there holds a skew (Android drops it, B13/B16)', async () => {
    const os = jest.replaceProperty(Platform, 'OS', 'android');
    try {
      for (const kind of KINDS) {
        await render(surface({ kind, skew: true }));
        expect(screen.getByTestId('s-edge-shape')).toBeOnTheScreen();
        expect(screen.getByTestId('s-face-shape')).toBeOnTheScreen();
        const ops = hostStyles(screen.container).flatMap((s) => (s.transform as object[] | undefined) ?? []);
        expect(ops.flatMap(Object.keys).filter((k) => /skew|matrix/.test(k))).toEqual([]);
        await screen.unmount();
      }
    } finally {
      os.restore();
    }
  });

  it('a disabled slanted face keeps the slant and the flat look, with no edge', async () => {
    await render(surface({ kind: 'gold', skew: true, disabled: true }));
    expect(screen.queryByTestId('s-edge')).not.toBeOnTheScreen();
    expect(styleOf(screen.getByTestId('s-face-shape'))).toMatchObject({
      ...faceStyle('gold', { pressed: false, disabled: true }),
      transform: SLANT.inner,
    });
  });

  it('disabled: no edge, the disabled face, no press', async () => {
    const onPress = jest.fn();
    await render(surface({ disabled: true, onPress }));
    expect(screen.queryByTestId('s-edge')).not.toBeOnTheScreen();
    expect(styleOf(screen.getByTestId('s-face')).backgroundColor).toBe(C.disabledFace);
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('inert (loading): a press does not sink', async () => {
    jest.useFakeTimers();
    try {
      await render(surface({ inert: true }));
      await fireEvent(screen.getByRole('button'), 'pressIn');
      await act(async () => void jest.advanceTimersByTime(tokens.motion.duration.tapFeedbackMax));
      expect(screen.getByTestId('s-face')).toHaveAnimatedStyle({ transform: [{ translateY: 0 }] });
    } finally {
      jest.useRealTimers();
    }
  });

  it('plays its cue once, as the press lands, then the press', async () => {
    const onPress = jest.fn(() => expect(cueOf).toHaveBeenCalledWith('primaryPress'));
    await render(surface({ cue: 'primaryPress', onPress }));
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(cueOf.mock.calls).toEqual([['primaryPress']]);
    cueOf.mockClear();
    await render(surface());
    await fireEvent.press(screen.getByRole('button'));
    expect(cueOf).not.toHaveBeenCalled();
  });

  it('does not hard-code a direction', async () => {
    const layouts: unknown[] = [];
    for (const rtl of [true, false]) {
      jest.replaceProperty(I18nManager, 'isRTL', rtl);
      await render(surface({ skew: true }));
      expect(directionProblems(screen.container)).toEqual([]);
      layouts.push(hostStyles(screen.container));
      await screen.unmount();
    }
    expect(layouts[0]).toEqual(layouts[1]);
  });
});

describe('PressableCard', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('he');
    useSettings.setState({ reduceMotion: 'off' });
    cueOf.mockClear();
  });

  const card = (props: Partial<Parameters<typeof PressableCard>[0]> = {}) => (
    <PressableCard
      accessibilityRole="button"
      accessibilityLabel="כרטיס"
      onPress={jest.fn()}
      style={{ flexDirection: 'row', padding: 16 }}
      testID="card"
      {...props}
    >
      <Text>כרטיס</Text>
    </PressableCard>
  );

  it('is the card itself: its layout and the surface on one pressable', async () => {
    await render(card());
    const el = screen.getByRole('button', { name: 'כרטיס' });
    expect(styleOf(el)).toMatchObject({
      flexDirection: 'row',
      padding: 16,
      backgroundColor: color.surface,
      borderTopColor: C.borderLit,
    });
    expect(styleOf(el).boxShadow).toHaveLength(2);
  });

  it('one press: it sinks onto its base, shrinks to 0.98, turns surface2, ticks, and springs back', async () => {
    jest.useFakeTimers();
    try {
      const onPress = jest.fn();
      await render(card({ onPress }));
      const el = screen.getByRole('button');
      await fireEvent(el, 'pressIn');
      await act(async () => void jest.advanceTimersByTime(tokens.motion.duration.tapFeedbackMax));
      expect(el).toHaveAnimatedStyle({
        transform: [{ translateY: CARD_BASE.travel }, { scale: PRESSED_SCALE }],
      });
      expect(styleOf(screen.getByRole('button'))).toMatchObject({
        backgroundColor: C.cardPressed,
        boxShadow: [],
      });
      await fireEvent(el, 'pressOut');
      await fireEvent.press(el);
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(cueOf.mock.calls).toEqual([['toggle']]);
      await act(async () => void jest.advanceTimersByTime(1000));
      expect(screen.getByRole('button')).toHaveAnimatedStyle({
        transform: [{ translateY: 0 }, { scale: 1 }],
      });
      expect(styleOf(screen.getByRole('button')).backgroundColor).toBe(color.surface);
    } finally {
      jest.useRealTimers();
    }
  });

  it('reduced motion: no scale and no tween; the face lands, turns surface2 and covers its base', async () => {
    useSettings.setState({ reduceMotion: 'on' });
    await render(card());
    const el = screen.getByRole('button');
    await fireEvent(el, 'pressIn');
    expect(screen.getByRole('button')).toHaveAnimatedStyle({
      transform: [{ translateY: CARD_BASE.travel }, { scale: 1 }],
    });
    expect(styleOf(screen.getByRole('button'))).toMatchObject({
      backgroundColor: C.cardPressed,
      boxShadow: [],
    });
  });

  it('a screen that plays its own sound turns the tick off', async () => {
    await render(card({ cue: null }));
    await fireEvent.press(screen.getByRole('button'));
    expect(cueOf).not.toHaveBeenCalled();
  });

  it('disabled: no base and no press', async () => {
    const onPress = jest.fn();
    await render(card({ disabled: true, onPress }));
    const el = screen.getByRole('button');
    expect(styleOf(el).boxShadow).toBeUndefined();
    await fireEvent.press(el);
    expect(onPress).not.toHaveBeenCalled();
    expect(cueOf).not.toHaveBeenCalled();
  });

  it('selected and toned borders; the caller’s own look wins over the surface', async () => {
    await render(card({ selected: true }));
    expect(styleOf(screen.getByRole('button'))).toMatchObject({ borderColor: color.accent });
    await render(card({ style: { borderRadius: radius.button, borderStyle: 'dashed' } }));
    expect(styleOf(screen.getByRole('button'))).toMatchObject({
      borderRadius: radius.button,
      borderStyle: 'dashed',
    });
  });

  it('bare: no surface of its own, only the press and its overlay', async () => {
    jest.useFakeTimers();
    try {
      await render(card({ variant: 'bare' }));
      const el = screen.getByRole('button');
      expect(styleOf(el).backgroundColor).toBeUndefined();
      await fireEvent(el, 'pressIn');
      await act(async () => void jest.advanceTimersByTime(tokens.motion.duration.tapFeedbackMax));
      expect(styleOf(screen.getByRole('button')).backgroundColor).toBe(color.pressedOverlay);
      expect(screen.getByRole('button')).toHaveAnimatedStyle({
        transform: [{ translateY: 0 }, { scale: PRESSED_SCALE }],
      });
    } finally {
      jest.useRealTimers();
    }
  });
});
