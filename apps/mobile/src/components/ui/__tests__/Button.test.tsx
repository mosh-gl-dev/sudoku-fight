import { act, fireEvent, render, screen, userEvent, within } from '@testing-library/react-native';
import { I18nManager, StyleSheet, type ViewStyle } from 'react-native';

import i18n from '../../../i18n';
import { cue } from '../../../services/feedback';
import { useSettings } from '../../../state/settings';
import { color, size, text, tokens } from '../../../theme';
import { Button, LARGE_TEXT_SCALE } from '../Button';
import { SLANT } from '../slant';
import { EDGE, tintLayer, verticalGradient } from '../tactile';
import { directionProblems, hostStyles, PHONE, setWindow } from '../testing/layout';

jest.mock('../../../services/feedback', () => ({ cue: jest.fn() }));
const cueOf = jest.mocked(cue);

const styleOf = (el: { props: { style?: unknown } }) => StyleSheet.flatten(el.props.style as ViewStyle) ?? {};

describe('Button', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('he');
    useSettings.setState({ reduceMotion: 'off' });
    cueOf.mockClear();
  });

  it('renders the skewed gold primary with its label and presses', async () => {
    const onPress = jest.fn();
    await render(<Button label="שחק" size="hero" onPress={onPress} testID="play" />);
    const button = screen.getByRole('button', { name: 'שחק' });
    expect(button).toBeEnabled();
    expect(styleOf(button).height).toBe(size.ctaHero);
    // The hard edge is a shape under the face in accentShadow, 4 dp lower, slanted like the face (slant.tsx).
    expect(styleOf(screen.getByTestId('play-shadow'))).toMatchObject({
      top: tokens.elevation.cta.offsetY,
      bottom: -tokens.elevation.cta.offsetY,
      transform: SLANT.outer,
    });
    expect(styleOf(screen.getByTestId('play-shadow-shape'))).toMatchObject({
      backgroundColor: color.accentShadow,
      transform: SLANT.inner,
    });
    // The face (D125): the gold gradient through accentHover, accent and accentPressed, a lit lip, the same height;
    // its look on the slanted plate under the label.
    expect(styleOf(screen.getByTestId('play-face'))).toMatchObject({ height: size.ctaHero });
    expect(styleOf(screen.getByTestId('play-face-shape'))).toMatchObject({
      backgroundColor: color.accent,
      experimental_backgroundImage: verticalGradient(color.tactile.goldFace),
      transform: SLANT.inner,
    });
    expect(screen.getByTestId('play-label')).toHaveStyle({ color: color.onAccent });
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('the primary plays its light press cue itself, once (MOT-4); a caller may turn it off', async () => {
    const onPress = jest.fn();
    await render(<Button label="שחק" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button'));
    expect(cueOf.mock.calls).toEqual([['primaryPress']]);
    expect(onPress).toHaveBeenCalledTimes(1);
    cueOf.mockClear();
    await render(<Button label="שחק" cue={null} onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button'));
    expect(cueOf).not.toHaveBeenCalled();
    // The others leave the sound to their screen.
    await render(<Button label="נסה שוב" variant="secondary" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button'));
    expect(cueOf).not.toHaveBeenCalled();
    // No press, no cue: a loading button ignores it.
    await render(<Button label="שחק" loading onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button'));
    expect(cueOf).not.toHaveBeenCalled();
  });

  it.each([
    ['hero', size.ctaHero],
    ['lg', size.buttonLg],
    ['md', size.buttonMd],
    ['modal', size.buttonModal],
    ['sm', size.buttonSm],
  ] as const)('primary %s is %i high', async (name, height) => {
    await render(<Button label="שחק" size={name} />);
    expect(styleOf(screen.getByRole('button'))).toMatchObject({ height });
  });

  describe('wrapLabel: a second line only at large system text sizes', () => {
    it.each([1, 1.1, LARGE_TEXT_SCALE - 0.01])(
      'at fontScale %d the label keeps to one line',
      async (fontScale) => {
        const restore = setWindow({ ...PHONE, fontScale });
        try {
          await render(<Button label="צור משתמש והיכנס לזירה" size="md" wrapLabel testID="go" />);
          expect(screen.getByTestId('go-label')).toHaveProp('numberOfLines', 1);
          expect(styleOf(screen.getByRole('button'))).toMatchObject({ height: size.buttonMd });
          expect(styleOf(screen.getByTestId('go-face'))).toMatchObject({ height: size.buttonMd });
          expect(styleOf(screen.getByTestId('go-shadow'))).toMatchObject({
            top: tokens.elevation.cta.offsetY,
            bottom: -tokens.elevation.cta.offsetY,
          });
        } finally {
          await restore();
        }
      },
    );

    it.each([LARGE_TEXT_SCALE, 1.5, 2])(
      'at fontScale %d it may wrap, and the button grows',
      async (fontScale) => {
        const restore = setWindow({ ...PHONE, fontScale });
        try {
          await render(<Button label="צור משתמש והיכנס לזירה" size="md" wrapLabel testID="go" />);
          const label = screen.getByTestId('go-label');
          expect(label).toHaveProp('numberOfLines', 2);
          expect(styleOf(label).flexShrink).toBe(1);
          const button = styleOf(screen.getByRole('button'));
          expect(button.height).toBeUndefined();
          expect(button.minHeight).toBe(size.buttonMd);
          // The shadow follows the face's height, 4 dp lower.
          expect(styleOf(screen.getByTestId('go-shadow'))).toMatchObject({
            top: tokens.elevation.cta.offsetY,
            bottom: -tokens.elevation.cta.offsetY,
          });
        } finally {
          await restore();
        }
      },
    );

    it('without it, a label stays on one line at any size, as before', async () => {
      const restore = setWindow({ ...PHONE, fontScale: 2 });
      try {
        await render(<Button label="שחק" size="hero" testID="play" />);
        expect(screen.getByTestId('play-label')).toHaveProp('numberOfLines', 1);
        expect(styleOf(screen.getByRole('button'))).toMatchObject({ height: size.ctaHero });
      } finally {
        await restore();
      }
    });
  });

  it('presses down and back with and without reduced motion', async () => {
    jest.useFakeTimers();
    try {
      for (const reduceMotion of ['off', 'on'] as const) {
        useSettings.setState({ reduceMotion });
        await render(<Button label="שחק" />);
        const button = screen.getByRole('button');
        await fireEvent(button, 'pressIn');
        await act(async () => void jest.advanceTimersByTime(tokens.motion.duration.tapFeedbackMin));
        await fireEvent(button, 'pressOut');
        await act(async () => void jest.advanceTimersByTime(tokens.motion.duration.tapFeedbackMax));
        expect(button).toBeOnTheScreen();
        await screen.unmount();
      }
    } finally {
      jest.useRealTimers();
    }
  });

  it('when disabled: a slate face with a faint label, still skewed, no edge, never a faded gold; no press', async () => {
    const onPress = jest.fn();
    await render(<Button label="שחק" disabled onPress={onPress} testID="play" />);
    const button = screen.getByRole('button', { name: 'שחק' });
    expect(button).toBeDisabled();
    expect(styleOf(button).opacity).toBeUndefined();
    expect(screen.queryByTestId('play-shadow')).not.toBeOnTheScreen();
    const face = styleOf(screen.getByTestId('play-face-shape'));
    expect(face).toMatchObject({
      backgroundColor: color.tactile.disabledFace,
      borderColor: color.tactile.disabledBorder,
      borderWidth: tokens.border.hairline,
      transform: SLANT.inner,
    });
    expect(face.experimental_backgroundImage).toBeUndefined();
    expect(screen.getByTestId('play-face')).toHaveAnimatedStyle({ transform: [{ translateY: 0 }] });
    expect(screen.getByTestId('play-label')).toHaveStyle({ color: color.tactile.disabledLabel });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(cueOf).not.toHaveBeenCalled();
  });

  it('when loading: busy, says so, and ignores presses', async () => {
    const onPress = jest.fn();
    await render(<Button label="שחק" loading onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'שחק, טוען' });
    expect(button).toBeBusy();
    await userEvent.setup().press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  // K1 (2026-11-06): a flattenable wrapper made "loading" move the label into a new native view; in the same
  // commit as the next screen that reparenting tore the React host down on Android (Results → "משחק חדש").
  it.each(['primary', 'secondary', 'danger'] as const)(
    'loading never moves the %s label to another native parent: its wrapper is always a view of its own',
    async (variant) => {
      await render(<Button label="שחק" variant={variant} testID="b" />);
      const before = screen.getByTestId('b-content');
      expect(before).toHaveProp('collapsable', false);
      expect(within(before).getByText('שחק')).toBeOnTheScreen();

      await screen.rerender(<Button label="שחק" variant={variant} testID="b" loading />);
      const after = screen.getByTestId('b-content');
      expect(after).toBe(before);
      expect(after).toHaveProp('collapsable', false);
      expect(StyleSheet.flatten(after.props.style as ViewStyle).opacity).toBe(0);
      expect(within(after).getByText('שחק')).toBeOnTheScreen();
    },
  );

  it('speaks English too', async () => {
    await i18n.changeLanguage('en');
    await render(<Button label="Play" loading />);
    expect(screen.getByRole('button', { name: 'Play, loading' })).toBeBusy();
  });

  it('draws the secondary as a filled slate on its hard edge, not skewed, with a leading icon', async () => {
    const onPress = jest.fn();
    await render(
      <Button
        label="נסה שוב"
        variant="secondary"
        size="modal"
        icon="refresh"
        onPress={onPress}
        testID="retry"
      />,
    );
    const button = screen.getByRole('button', { name: 'נסה שוב' });
    expect(styleOf(button)).toMatchObject({ height: size.buttonModal });
    expect(styleOf(button).transform).toBeUndefined();
    expect(styleOf(screen.getByTestId('retry-face'))).toMatchObject({
      height: size.buttonModal,
      backgroundColor: color.surface2,
      experimental_backgroundImage: verticalGradient(color.tactile.slateFace),
      borderWidth: tokens.border.hairline,
      borderColor: color.border,
      borderTopColor: color.tactile.borderLit,
    });
    expect(styleOf(screen.getByTestId('retry-edge'))).toMatchObject({
      backgroundColor: color.tactile.slateEdge,
      top: EDGE.slate.depth,
      bottom: -EDGE.slate.depth,
    });
    // Not skewed on its own: the edge is straight, the face only sinks.
    expect(styleOf(screen.getByTestId('retry-edge')).transform).toBeUndefined();
    expect(screen.queryByTestId('retry-face-shape')).not.toBeOnTheScreen();
    expect(screen.getByTestId('retry-face')).toHaveAnimatedStyle({ transform: [{ translateY: 0 }] });
    expect(screen.queryByTestId('retry-shadow')).not.toBeOnTheScreen();
    expect(screen.getByText('נסה שוב')).toHaveStyle({ color: color.text, ...text('button') });
    expect(screen.getByTestId('icon-refresh', { includeHiddenElements: true })).toBeOnTheScreen();
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('beside the primary in one row, the secondary skews with it (the pair rule); its words stand upright', async () => {
    await render(<Button label="הצטרף עם קוד" variant="secondary" size="modal" skew testID="join" />);
    expect(styleOf(screen.getByTestId('join-edge')).transform).toEqual(SLANT.outer);
    expect(styleOf(screen.getByTestId('join-edge-shape'))).toMatchObject({
      backgroundColor: color.tactile.slateEdge,
      transform: SLANT.inner,
    });
    expect(styleOf(screen.getByTestId('join-face-shape'))).toMatchObject({
      backgroundColor: color.surface2,
      transform: SLANT.inner,
    });
    expect(screen.getByTestId('join-face')).toHaveAnimatedStyle({ transform: [{ translateY: 0 }] });
    // The words sit beside the plate, not inside it: no transform at all, upright on Android and iOS alike.
    const words = (screen.getByText('הצטרף עם קוד') as unknown as { parent: { props: { style?: unknown } } })
      .parent;
    expect(styleOf(words).transform).toBeUndefined();
    expect(styleOf(screen.getByRole('button')).transform).toBeUndefined();
  });

  it('marks a selected secondary chip', async () => {
    await render(<Button label="רגיל" variant="secondary" selected testID="chip" />);
    const button = screen.getByRole('button', { name: 'רגיל' });
    expect(button).toBeSelected();
    expect(styleOf(screen.getByTestId('chip-face'))).toMatchObject({
      borderColor: color.accent,
      experimental_backgroundImage: tintLayer(color.accentSubtle),
    });
    expect(screen.getByText('רגיל')).toHaveStyle({ color: color.accent });
  });

  it('a disabled secondary: no edge and a faint label', async () => {
    await render(<Button label="הצטרף עם קוד" variant="secondary" disabled testID="join" />);
    expect(screen.queryByTestId('join-edge')).not.toBeOnTheScreen();
    expect(styleOf(screen.getByTestId('join-face')).backgroundColor).toBe(color.tactile.disabledFace);
    expect(screen.getByText('הצטרף עם קוד')).toHaveStyle({ color: color.tactile.disabledLabel });
  });

  it('draws the danger outline in red on its red edge, never gold', async () => {
    const onPress = jest.fn();
    await render(<Button label="כן, להיכנע" variant="danger" size="lg" onPress={onPress} testID="yes" />);
    const button = screen.getByRole('button', { name: 'כן, להיכנע' });
    expect(styleOf(button)).toMatchObject({ height: size.buttonLg });
    expect(styleOf(screen.getByTestId('yes-face'))).toMatchObject({
      backgroundColor: color.tactile.dangerFace,
      experimental_backgroundImage: tintLayer(color.dangerSubtle),
      borderColor: color.dangerBorder,
    });
    expect(styleOf(screen.getByTestId('yes-edge'))).toMatchObject({
      backgroundColor: color.tactile.dangerEdge,
    });
    expect(screen.queryByTestId('yes-shadow')).not.toBeOnTheScreen();
    expect(screen.getByText('כן, להיכנע')).toHaveStyle({ color: color.danger });
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('size sm: 40 high, the 44 touch target by its hit slop, a bold 16 label', async () => {
    await render(<Button label="שחק" size="sm" testID="play" />);
    const button = screen.getByRole('button');
    expect(styleOf(button)).toMatchObject({ height: size.buttonSm });
    expect(button).toHaveProp('hitSlop', (size.touch - size.buttonSm) / 2);
    expect(screen.getByTestId('play-label')).toHaveStyle(text('h2'));
  });

  it('draws the ghost text button 44 high, with a spinner while loading', async () => {
    const onPress = jest.fn();
    await render(<Button label="ביטול בחירה" variant="ghost" icon="cancel" onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'ביטול בחירה' });
    expect(styleOf(button).height).toBe(size.buttonGhost);
    expect(styleOf(button).backgroundColor).toBeUndefined();
    expect(screen.getByText('ביטול בחירה')).toHaveStyle({ color: color.textMuted });
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);

    await screen.rerender(<Button label="ביטול בחירה" variant="ghost" icon="cancel" disabled loading />);
    expect(screen.getByRole('button', { name: 'ביטול בחירה, טוען' })).toBeDisabled();
  });

  it('lets the caller override the spoken label', async () => {
    await render(<Button label="הכל" variant="ghost" accessibilityLabel="כל המשחקים האחרונים" />);
    expect(screen.getByRole('button', { name: 'כל המשחקים האחרונים' })).toBeOnTheScreen();
  });

  it('does not hard-code a direction: the same layout in RTL and LTR', async () => {
    const layouts: unknown[] = [];
    for (const rtl of [true, false]) {
      jest.replaceProperty(I18nManager, 'isRTL', rtl);
      await render(
        <>
          <Button label="שחק" icon="bolt" />
          <Button label="נסה שוב" variant="secondary" icon="refresh" />
          <Button label="הכל" variant="ghost" />
          <Button label="כן, להיכנע" variant="danger" />
        </>,
      );
      expect(directionProblems(screen.container)).toEqual([]);
      layouts.push(hostStyles(screen.container));
      await screen.unmount();
    }
    expect(layouts[0]).toEqual(layouts[1]);
  });
});
