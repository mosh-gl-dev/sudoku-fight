// First: expo-router's testing library swaps Reanimated for its old mock (no useReducedMotion), unless the real
// module is already in place as the mock (see the jest.mock below).
import 'react-native-reanimated';
import { renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { type StyleProp, StyleSheet, type ViewStyle } from 'react-native';

import RootLayout from '../../app/_layout';
import Index from '../../app/index';
import SettingsRoute from '../../app/settings';
import { setAuthDeps } from '../auth/authStore';
import { installSignedInPlayer } from '../auth/testing/testAuth';
import { memoryDb, type SqlJsDb } from '../game/testing/sqlJsDb';
import i18n from '../i18n';
import { useSettings } from '../state/settings';

/**
 * D126 (Moshe 31.10.2026, "בכל מקום שבו יש רקע"), through the app's real root layout: the wandering digits' layer
 * is there once, under the navigator; its canvas comes only after the Splash; and the screens over it paint no
 * ground of their own, so the digits show around their cards.
 */

const mockApp: { db: SqlJsDb | null } = { db: null };

jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated'));
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: async () => mockApp.db }));
jest.mock('../services/analytics', () => ({ track: jest.fn() }));
type NativeMocks = typeof import('../screens/home/testing/nativeMocks');
jest.mock(
  'expo-audio',
  () => jest.requireActual<NativeMocks>('../screens/home/testing/nativeMocks').expoAudio,
);
jest.mock(
  'expo-haptics',
  () => jest.requireActual<NativeMocks>('../screens/home/testing/nativeMocks').expoHaptics,
);

jest.setTimeout(60_000);

const ROUTES = { _layout: RootLayout, index: Index, settings: SettingsRoute };

/** The layer is hidden from screen readers, so queries must include hidden elements. */
const HIDDEN = { includeHiddenElements: true } as const;

/** The views from `el` up to the root. */
function ancestors(el: { parent: unknown }): { props: { style?: unknown; testID?: string } }[] {
  const up: { props: { style?: unknown; testID?: string } }[] = [];
  let node = el.parent as { parent: unknown; props: { style?: unknown } } | null;
  while (node) {
    up.push(node);
    node = node.parent as typeof node;
  }
  return up;
}

beforeAll(async () => {
  mockApp.db = await memoryDb();
});

beforeEach(async () => {
  await installSignedInPlayer();
  await i18n.changeLanguage('he');
  useSettings.setState({ language: 'he', languageSource: 'app', reduceMotion: 'on' });
});

afterEach(() => {
  setAuthDeps(null);
  jest.useRealTimers();
});

describe('[D126] the wandering digits in the real app', () => {
  it('one layer behind the screens, its canvas after the Splash, and Home over it with no ground of its own', async () => {
    await renderRouter(ROUTES, { initialUrl: '/' });
    await waitFor(() => expect(screen.getByTestId('home-scroll')).toBeOnTheScreen());
    await waitFor(() => expect(screen.queryByTestId('splash')).toBeNull());

    expect(screen.getAllByTestId('ambient', HIDDEN)).toHaveLength(1);
    // Reduced Motion is on: the still frame of the field.
    await waitFor(() => expect(screen.getByTestId('ambient-canvas-still', HIDDEN)).toBeTruthy());

    // The layer is not inside any screen: Home's views are not under it.
    const layer = screen.getByTestId('ambient', HIDDEN);
    const homeUp = ancestors(screen.getByTestId('home-scroll') as unknown as { parent: unknown });
    expect(homeUp).not.toContain(layer);
    // The navigator's screen around Home is transparent (its contentStyle), …
    const fill = (v: { props: { style?: unknown } }) =>
      StyleSheet.flatten(v.props.style as StyleProp<ViewStyle>)?.backgroundColor as string | undefined;
    expect(homeUp.filter((v) => fill(v) === 'transparent').length).toBeGreaterThan(0);
    // …and nothing between Home's list and the root paints the ground but the root itself.
    const grounds = homeUp.filter((v) => fill(v) !== undefined && fill(v) !== 'transparent');
    expect(grounds).toHaveLength(1);
    expect(ancestors(layer as unknown as { parent: unknown })).toContain(grounds[0]);
    // iOS paints the native stack's container under every screen, in the navigator theme's background: it must
    // be transparent too, not the default theme's light grey.
    const stacks = homeUp.filter((v) => 'nativeContainerBackgroundColor' in v.props);
    expect(stacks).toHaveLength(1);
    expect(
      (stacks[0]!.props as { nativeContainerBackgroundColor?: unknown }).nativeContainerBackgroundColor,
    ).toBe('transparent');
  });

  it('the layer stays as the screens change (one for the whole app)', async () => {
    await renderRouter(ROUTES, { initialUrl: '/settings' });
    await waitFor(() => expect(screen.getByTestId('setting-language')).toBeOnTheScreen());
    await waitFor(() => expect(screen.queryByTestId('splash')).toBeNull());
    expect(screen.getAllByTestId('ambient', HIDDEN)).toHaveLength(1);
  });
});
