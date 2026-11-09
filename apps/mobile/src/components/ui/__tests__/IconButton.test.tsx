import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { I18nManager, StyleSheet, type ViewStyle } from 'react-native';

import i18n from '../../../i18n';
import { color, size, tokens } from '../../../theme';
import { IconButton } from '../IconButton';
import { EDGE, verticalGradient } from '../tactile';
import { directionProblems, hostStyles } from '../testing/layout';

const styleOf = (el: { props: { style?: unknown } }) => StyleSheet.flatten(el.props.style as ViewStyle) ?? {};

describe('IconButton', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('he');
  });

  it('is a 44×44 slate button on a 2 dp edge, named by its label', async () => {
    const onPress = jest.fn();
    await render(<IconButton icon="settings" accessibilityLabel="הגדרות" onPress={onPress} testID="gear" />);
    const button = screen.getByRole('button', { name: 'הגדרות' });
    expect(styleOf(button)).toMatchObject({ width: size.iconButton, height: size.iconButton });
    expect(styleOf(screen.getByTestId('gear-face'))).toMatchObject({
      width: size.iconButton,
      height: size.iconButton,
      backgroundColor: color.surface2,
      experimental_backgroundImage: verticalGradient(color.tactile.slateFace),
      borderColor: color.border,
      borderTopColor: color.tactile.borderLit,
      borderWidth: tokens.border.hairline,
    });
    expect(styleOf(screen.getByTestId('gear-edge'))).toMatchObject({
      backgroundColor: color.tactile.slateEdge,
      top: EDGE.icon.depth,
      bottom: -EDGE.icon.depth,
    });
    expect(screen.getByTestId('icon-settings', { includeHiddenElements: true })).toHaveProp(
      'stroke',
      color.textMuted,
    );
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('sinks 1 dp onto its edge when pressed, and lights its icon', async () => {
    await render(<IconButton icon="settings" accessibilityLabel="הגדרות" testID="gear" />);
    await fireEvent(screen.getByRole('button'), 'pressIn');
    expect(styleOf(screen.getByTestId('gear-face')).backgroundColor).toBe(color.tactile.slatePressed);
    expect(screen.getByTestId('icon-settings', { includeHiddenElements: true })).toHaveProp(
      'stroke',
      color.text,
    );
  });

  it('plain (a tip’s close): no face and no edge, the overlay only when pressed', async () => {
    await render(<IconButton icon="close" accessibilityLabel="סגירה" plain testID="x" />);
    const button = screen.getByRole('button', { name: 'סגירה' });
    expect(screen.queryByTestId('x-edge')).not.toBeOnTheScreen();
    expect(styleOf(button)).toMatchObject({ width: size.iconButton, height: size.iconButton });
    expect(styleOf(button).backgroundColor).toBeUndefined();
    expect(styleOf(button).borderWidth).toBeUndefined();
  });

  it('draws the icon at 20 in a card and 22 in a header', async () => {
    await render(
      <>
        <IconButton icon="surrender" accessibilityLabel="כניעה" />
        <IconButton icon="settings" accessibilityLabel="הגדרות" iconSize="header" />
      </>,
    );
    expect(screen.getByTestId('icon-surrender', { includeHiddenElements: true })).toHaveProp(
      'width',
      size.icon.card,
    );
    expect(screen.getByTestId('icon-settings', { includeHiddenElements: true })).toHaveProp(
      'width',
      size.icon.header,
    );
  });

  it('shows the open state of the reactions picker', async () => {
    await render(<IconButton icon="reactions" accessibilityLabel="תגובות" expanded testID="r" />);
    const button = screen.getByRole('button', { name: 'תגובות' });
    expect(button).toBeExpanded();
    expect(styleOf(screen.getByTestId('r-face'))).toMatchObject({
      backgroundColor: color.surface2,
      borderColor: color.textMuted,
    });
    expect(styleOf(screen.getByTestId('r-face')).experimental_backgroundImage).toBeUndefined();
  });

  it('only reports expanded when it controls something', async () => {
    await render(<IconButton icon="settings" accessibilityLabel="הגדרות" />);
    const button = screen.getByRole('button');
    expect(button).not.toBeExpanded();
    expect(button).not.toBeCollapsed();
  });

  it('when disabled: the disabled face, no edge, a faint icon, and it does not press', async () => {
    const onPress = jest.fn();
    await render(
      <IconButton icon="reactions" accessibilityLabel="תגובות" disabled onPress={onPress} testID="r" />,
    );
    const button = screen.getByRole('button', { name: 'תגובות' });
    expect(button).toBeDisabled();
    expect(screen.queryByTestId('r-edge')).not.toBeOnTheScreen();
    expect(styleOf(screen.getByTestId('r-face')).backgroundColor).toBe(color.tactile.disabledFace);
    expect(screen.getByTestId('icon-reactions', { includeHiddenElements: true })).toHaveProp(
      'stroke',
      color.tactile.disabledLabel,
    );
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('when loading: busy, says so, and ignores presses', async () => {
    const onPress = jest.fn();
    await render(<IconButton icon="settings" accessibilityLabel="הגדרות" loading onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'הגדרות, טוען' });
    expect(button).toBeBusy();
    expect(screen.queryByTestId('icon-settings', { includeHiddenElements: true })).not.toBeOnTheScreen();
    await userEvent.setup().press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not hard-code a direction', async () => {
    const layouts: unknown[] = [];
    for (const rtl of [true, false]) {
      jest.replaceProperty(I18nManager, 'isRTL', rtl);
      await render(<IconButton icon="close" accessibilityLabel="סגירה" />);
      expect(directionProblems(screen.container)).toEqual([]);
      layouts.push(hostStyles(screen.container));
      await screen.unmount();
    }
    expect(layouts[0]).toEqual(layouts[1]);
  });
});
