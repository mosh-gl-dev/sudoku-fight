import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { I18nManager, StyleSheet, type ViewStyle } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import i18n from '../../../i18n';
import { useSettings } from '../../../state/settings';
import { appTypeface, color, radius, size, text, uiFont } from '../../../theme';
import { BottomNav, NAV_TABS, PILL_FROM_SCALE } from '../BottomNav';
import { directionProblems, hostStyles } from '../testing/layout';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);

const styleOf = (el: { props: { style?: unknown } }) => StyleSheet.flatten(el.props.style as ViewStyle) ?? {};

const metrics = (bottom: number) => ({
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, bottom, left: 0, right: 0 },
});

describe('BottomNav', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('he');
  });

  it('is a labelled tab list with the four tabs in order', async () => {
    await render(<BottomNav active="home" onSelect={jest.fn()} />);
    // The list itself is not one accessibility element (that would hide its tabs on iOS), so it is found by
    // its label, and its role is checked as a prop.
    const list = screen.getByLabelText('ניווט ראשי');
    expect(list).toHaveProp('accessibilityRole', 'tablist');
    const tabs = within(list).getAllByRole('tab');
    expect(tabs.map((tab) => tab.props.accessibilityLabel)).toEqual([
      'בית',
      'טבלת מובילים',
      'היסטוריה',
      'הישגים',
    ]);
    expect(NAV_TABS.map((t) => t.key)).toEqual(['home', 'leaderboard', 'history', 'achievements']);
  });

  it.each(NAV_TABS.map((t) => t.key))('marks %s as the selected tab, in gold', async (key) => {
    await render(<BottomNav active={key} onSelect={jest.fn()} testID="nav" />);
    for (const tab of NAV_TABS) {
      const el = screen.getByTestId(`nav-${tab.key}`);
      if (tab.key === key) {
        expect(el).toBeSelected();
        expect(within(el).getByText(/./)).toHaveStyle({ color: color.nav.active });
      } else {
        expect(el).not.toBeSelected();
        expect(within(el).getByText(/./)).toHaveStyle({ color: color.nav.inactive });
      }
    }
  });

  it('VIS-10: the active tab has a pill behind its icon and a bold label; the others neither', async () => {
    await render(<BottomNav active="history" onSelect={jest.fn()} testID="nav" />);
    expect(styleOf(screen.getByTestId('nav-history-pill'))).toMatchObject({
      backgroundColor: color.nav.activePill,
      borderRadius: radius.pill,
    });
    // The pill fills the icon's 56 × 32 box.
    const box = styleOf((screen.getByTestId('nav-history-pill') as unknown as { parent: never }).parent);
    expect(box).toMatchObject({ width: size.navPill.width, height: size.navPill.height });
    expect(within(screen.getByTestId('nav-history')).getByText(/./)).toHaveStyle(
      uiFont(appTypeface(), '700'),
    );
    for (const key of ['home', 'leaderboard', 'achievements']) {
      expect(screen.queryByTestId(`nav-${key}-pill`)).not.toBeOnTheScreen();
      expect(within(screen.getByTestId(`nav-${key}`)).getByText(/./)).toHaveStyle({
        fontFamily: text('label').fontFamily,
      });
    }
  });

  it('the pill pops in as the screen opens (from 0.8, fading in); with reduced motion it is simply there', async () => {
    jest.useFakeTimers();
    try {
      useSettings.setState({ reduceMotion: 'off' });
      await render(<BottomNav active="home" onSelect={jest.fn()} testID="nav" />);
      const pill = () =>
        (
          screen.getByTestId('nav-home-pill').props as {
            jestAnimatedStyle?: { value: { opacity: number; transform: { scale: number }[] } };
          }
        ).jestAnimatedStyle!.value;
      expect(pill().opacity).toBe(0);
      expect(pill().transform[0]!.scale).toBe(PILL_FROM_SCALE);
      await act(async () => void jest.advanceTimersByTime(1000));
      expect(pill().opacity).toBe(1);
      expect(pill().transform[0]!.scale).toBeCloseTo(1, 3);
      await screen.unmount();

      useSettings.setState({ reduceMotion: 'on' });
      await render(<BottomNav active="home" onSelect={jest.fn()} testID="nav" />);
      expect(screen.getByTestId('nav-home-pill')).toHaveAnimatedStyle({
        opacity: 1,
        transform: [{ scale: 1 }],
      });
      await screen.unmount();
    } finally {
      jest.useRealTimers();
      useSettings.setState({ reduceMotion: 'off' });
    }
    expect(PILL_FROM_SCALE).toBe(0.8);
  });

  it('reports the pressed tab', async () => {
    const onSelect = jest.fn();
    await render(<BottomNav active="home" onSelect={onSelect} />);
    await fireEvent.press(screen.getByRole('tab', { name: 'היסטוריה' }));
    expect(onSelect).toHaveBeenCalledWith('history');
  });

  it('is 64 high plus the real bottom safe area', async () => {
    await render(
      <SafeAreaProvider initialMetrics={metrics(34)}>
        <BottomNav active="home" onSelect={jest.fn()} />
      </SafeAreaProvider>,
    );
    expect(styleOf(screen.getByLabelText('ניווט ראשי'))).toMatchObject({
      height: size.navBar - size.navBarBottomInset + 34,
      paddingBottom: 34,
    });
  });

  it('speaks English too', async () => {
    await i18n.changeLanguage('en');
    await render(<BottomNav active="leaderboard" onSelect={jest.fn()} />);
    expect(screen.getByLabelText('Main navigation')).toHaveProp('accessibilityRole', 'tablist');
    expect(screen.getByRole('tab', { name: 'Leaderboard' })).toBeSelected();
  });

  it('is a plain row (mirrored by React Native), the same in RTL and LTR', async () => {
    const layouts: unknown[] = [];
    for (const rtl of [true, false]) {
      jest.replaceProperty(I18nManager, 'isRTL', rtl);
      await render(<BottomNav active="home" onSelect={jest.fn()} />);
      expect(styleOf(screen.getByLabelText('ניווט ראשי')).flexDirection).toBe('row');
      expect(directionProblems(screen.container)).toEqual([]);
      layouts.push(hostStyles(screen.container));
      await screen.unmount();
    }
    expect(layouts[0]).toEqual(layouts[1]);
  });
});
