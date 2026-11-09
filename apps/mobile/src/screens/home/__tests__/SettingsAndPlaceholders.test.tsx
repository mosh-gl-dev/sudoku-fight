// First: keeps the real Reanimated in place of the router testing library's old mock (see homeTesting.tsx).
import 'react-native-reanimated';
import { ENGINE_VERSION } from '@sudoku-fight/engine';
import { router } from 'expo-router';
import Storage from 'expo-sqlite/kv-store';
import { act, fireEvent, screen } from 'expo-router/testing-library';

import { ltr } from '../../../components/player';
import { directionProblems } from '../../../components/ui/testing/layout';
import { useToast } from '../../../components/ui/toastStore';
import { UNLOCK_TAPS } from '../../../config/testing';
import { practiceStorageOrNull } from '../../../game/storage';
import i18n from '../../../i18n';
import { haptics as hapticsService } from '../../../services/haptics';
import { useSettings } from '../../../state/settings';
import { useTestingSwitches } from '../../../state/testingSwitches';
import { PlaceholderScreen } from '../PlaceholderScreen';
import { SettingsScreen } from '../SettingsScreen';
import { renderApp } from '../testing/homeTesting';

type Mocks = typeof import('../testing/nativeMocks');

jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated'));
jest.mock('../../../game/storage', () => jest.requireActual<Mocks>('../testing/nativeMocks').practiceStorage);
jest.mock('../../../services/analytics', () => ({ track: jest.fn() }));
jest.mock('expo-audio', () => jest.requireActual<Mocks>('../testing/nativeMocks').expoAudio);
jest.mock('expo-haptics', () => jest.requireActual<Mocks>('../testing/nativeMocks').expoHaptics);

const haptics = jest.requireMock<{ selectionAsync: jest.Mock }>('expo-haptics');

/** The version lines the "בדיקה" tests tap (a staging build's). */
const VERSION = { version: '1.1.0', build: 'a1b2c3d', server: 'staging' };

/** `n` quick taps on the version lines (one right after another, well within UNLOCK_TAP_GAP_MS). */
async function tapVersion(n: number) {
  for (let i = 0; i < n; i++) await fireEvent.press(screen.getByTestId('app-version'));
}

beforeEach(async () => {
  jest.useRealTimers();
  jest.mocked(practiceStorageOrNull).mockImplementation(async () => null);
  useSettings.setState({ sound: true, haptics: true, reduceMotion: 'system', language: 'he' });
  haptics.selectionAsync.mockClear();
  await i18n.changeLanguage('he');
});

afterEach(() => {
  jest.useRealTimers();
});

describe('settings (spec §4.1)', () => {
  it('switches sound and haptics in the persisted store', async () => {
    await renderApp('/settings');
    expect(screen.getByRole('header', { name: 'הגדרות' })).toBeTruthy();
    const sound = screen.getByRole('switch', { name: 'צליל' });
    expect(sound).toHaveProp('accessibilityState', { checked: true });

    await fireEvent.press(sound);
    expect(useSettings.getState().sound).toBe(false);
    expect(screen.getByRole('switch', { name: 'צליל' })).toHaveProp('accessibilityState', { checked: false });

    await fireEvent.press(screen.getByRole('switch', { name: 'רטט' }));
    expect(useSettings.getState().haptics).toBe(false);
    // The toggle cue follows the new setting: turning haptics off is not felt, turning them on is. (The reset
    // lifts the service's 80 ms gap after the sound switch's tick.)
    await Promise.resolve();
    hapticsService.reset();
    haptics.selectionAsync.mockClear();
    await fireEvent.press(screen.getByRole('switch', { name: 'רטט' }));
    expect(useSettings.getState().haptics).toBe(true);
    await Promise.resolve();
    expect(haptics.selectionAsync).toHaveBeenCalledTimes(1);
    expect(directionProblems(screen.getByTestId('setting-sound'))).toEqual([]);
  });

  it('chooses reduced motion: like the device, on or off', async () => {
    await renderApp('/settings');
    const group = screen.getByTestId('setting-motion');
    expect(group).toHaveProp('accessibilityRole', 'radiogroup');
    expect(screen.getByRole('radio', { name: 'כמו במכשיר' })).toHaveProp('accessibilityState', {
      checked: true,
    });
    await fireEvent.press(screen.getByRole('radio', { name: 'מופעלת' }));
    expect(useSettings.getState().reduceMotion).toBe('on');
    await fireEvent.press(screen.getByRole('radio', { name: 'כבויה' }));
    expect(useSettings.getState().reduceMotion).toBe('off');
    expect(screen.getByRole('radio', { name: 'כבויה' })).toHaveProp('accessibilityState', { checked: true });
  });

  it('changes the language once the restart is confirmed (the root layout then restarts the app)', async () => {
    await renderApp('/settings');
    expect(screen.getByText('החלפת שפה מפעילה מחדש את האפליקציה.')).toBeTruthy();
    // The picker (localization plan 0י): a field, then a sheet with "שפת המכשיר" and this build's languages.
    await fireEvent.press(screen.getByRole('button', { name: 'שפה: עברית' }));
    expect((await screen.findAllByRole('radio', { name: /^(שפת המכשיר|עברית|English)$/ })).length).toBe(3);
    await fireEvent.press(screen.getByRole('radio', { name: 'English' }));
    expect(useSettings.getState().language).toBe('he');
    expect(await screen.findByText('להחליף את השפה ל־English?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'החלפה והפעלה מחדש' }));
    expect(useSettings.getState().language).toBe('en');
  });

  it('shows the version, then the build, the server and the engine (Moshe: "I can see it in the app")', async () => {
    const version = { version: '1.0.1', build: 'a1b2c3d', server: 'staging' };
    await renderApp('/settings', { settings: () => <SettingsScreen version={version} /> });
    expect(screen.getByTestId('app-version-version')).toHaveTextContent(`גרסה ${ltr('1.0.1')}`);
    expect(screen.getByTestId('app-version-details')).toHaveTextContent(
      ltr(`build ${ltr('a1b2c3d')} · staging · מנוע ${ltr(String(ENGINE_VERSION))}`),
    );
    expect(screen.getByTestId('app-version')).toHaveProp(
      'accessibilityLabel',
      `גרסה ${ltr('1.0.1')}, build ${ltr('a1b2c3d')} · staging · מנוע ${ltr(String(ENGINE_VERSION))}`,
    );
  });

  it('a build that did not say its commit (Metro, EAS) shows the server alone', async () => {
    const version = { version: '1.0.0', build: null, server: 'production' };
    await renderApp('/settings', { settings: () => <SettingsScreen version={version} /> });
    expect(screen.getByTestId('app-version-details')).toHaveTextContent(
      ltr(`production · מנוע ${ltr(String(ENGINE_VERSION))}`),
    );
  });

  it('no version known: no lines', async () => {
    await renderApp('/settings', { settings: () => <SettingsScreen version={null} /> });
    expect(screen.queryByTestId('app-version')).toBeNull();
  });

  it('a staging build: "בדיקה" with the chain switch and "פתח את כל השלבים", kept on the phone', async () => {
    // Opened by the version's taps (the describe below).
    useTestingSwitches.setState({ chainPenalty: false, unlockAllLevels: false, sectionOpen: true });
    try {
      const staging = { server: 'staging', dev: false };
      await renderApp('/settings', { settings: () => <SettingsScreen build={staging} /> });
      expect(screen.getByTestId('settings-testing')).toBeTruthy();
      expect(screen.getByText('רק בגרסת הבדיקה (staging). בגרסה לחנות אין את זה.')).toBeTruthy();
      const chain = screen.getByRole('switch', { name: 'שרשרת: ניחוש עולה 5 ש׳' });
      expect(chain).toHaveProp('accessibilityState', { checked: false });
      await fireEvent.press(chain);
      expect(useTestingSwitches.getState().chainPenalty).toBe(true);
      expect(screen.getByRole('switch', { name: 'שרשרת: ניחוש עולה 5 ש׳' })).toHaveProp(
        'accessibilityState',
        {
          checked: true,
        },
      );
      await fireEvent.press(screen.getByRole('switch', { name: 'פתח את כל השלבים (בדיקה)' }));
      expect(useTestingSwitches.getState().unlockAllLevels).toBe(true);
      // Kept on the phone, apart from the player's settings.
      expect(JSON.parse(Storage.getItemSync('testing-switches')!)).toMatchObject({
        state: { chainPenalty: true, unlockAllLevels: true },
      });
      expect(Storage.getItemSync('settings') ?? '').not.toContain('chainPenalty');
      // The Pirates slice, for Moshe to judge on the phone (a staging APK has no __DEV__).
      const push = jest.spyOn(router, 'push').mockImplementation(() => {});
      await fireEvent.press(screen.getByRole('button', { name: 'פיראטים (טיוטת אווטרים)' }));
      expect(push).toHaveBeenCalledWith('/dev/pirates');
      push.mockRestore();
    } finally {
      await act(async () =>
        useTestingSwitches.setState({ chainPenalty: false, unlockAllLevels: false, sectionOpen: false }),
      );
    }
  });

  it('a production build never shows "בדיקה" (a development build pointed at production neither)', async () => {
    useToast.getState().clear();
    for (const build of [
      { server: 'production', dev: false },
      { server: 'production', dev: true },
    ]) {
      // Not even when the phone kept it open (from a staging build), nor after 7 taps on the version.
      useTestingSwitches.setState({ sectionOpen: true });
      await renderApp('/settings', { settings: () => <SettingsScreen build={build} version={VERSION} /> });
      expect(screen.queryByTestId('settings-testing')).toBeNull();
      expect(screen.queryByRole('switch', { name: 'שרשרת: ניחוש עולה 5 ש׳' })).toBeNull();
      expect(screen.queryByTestId('setting-pirates')).toBeNull();
      await act(async () => useTestingSwitches.setState({ sectionOpen: false }));
      await tapVersion(7);
      expect(screen.queryByTestId('settings-testing')).toBeNull();
      expect(useTestingSwitches.getState().sectionOpen).toBe(false);
      expect(useToast.getState().current).toBeNull();
      await screen.unmount();
    }
  });

  it('goes back to where it was opened from', async () => {
    const app = await renderApp('/');
    await fireEvent.press(screen.getByRole('button', { name: 'הגדרות' }));
    expect(app.pathname()).toBe('/settings');
    await fireEvent.press(screen.getByRole('button', { name: 'חזרה' }));
    expect(app.pathname()).toBe('/');
  });

  it('speaks English too', async () => {
    await i18n.changeLanguage('en');
    await renderApp('/settings');
    expect(screen.getByRole('header', { name: 'Settings' })).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'Sound' })).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'Haptics' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Like the device' })).toBeTruthy();
    // Each language is named in itself.
    await fireEvent.press(screen.getByRole('button', { name: 'Language: עברית' }));
    expect(await screen.findByRole('radio', { name: 'Device language' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'עברית' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'English' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    // A development build (not on production) has the testing switches too, once the version's taps open them.
    expect(screen.queryByRole('switch', { name: 'Chain: a guess costs 5 s' })).toBeNull();
    await act(async () => useTestingSwitches.setState({ sectionOpen: true }));
    try {
      expect(screen.getByRole('switch', { name: 'Chain: a guess costs 5 s' })).toBeTruthy();
      expect(screen.getByRole('switch', { name: 'Unlock all stages (testing)' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Hide the testing section' })).toBeTruthy();
    } finally {
      await act(async () => useTestingSwitches.setState({ sectionOpen: false }));
    }
  });
});

describe('the hidden "בדיקה" section (Moshe 31.10.2026: "ראיתי דברים מוזרים במסך הגדרות שלא הבנתי")', () => {
  const STAGING = { server: 'staging', dev: false };
  const showStaging = () =>
    renderApp('/settings', { settings: () => <SettingsScreen build={STAGING} version={VERSION} /> });

  beforeEach(() => {
    useTestingSwitches.setState({ chainPenalty: false, unlockAllLevels: false, sectionOpen: false });
    useToast.getState().clear();
  });
  afterEach(async () => {
    await act(async () =>
      useTestingSwitches.setState({ chainPenalty: false, unlockAllLevels: false, sectionOpen: false }),
    );
  });

  it('is hidden on staging; 6 quick taps on the version do nothing, the 7th opens it with a toast', async () => {
    await showStaging();
    expect(screen.queryByTestId('settings-testing')).toBeNull();
    expect(screen.queryByTestId('setting-pirates')).toBeNull();
    await tapVersion(6);
    expect(screen.queryByTestId('settings-testing')).toBeNull();
    expect(useTestingSwitches.getState().sectionOpen).toBe(false);
    expect(useToast.getState().current).toBeNull();
    await tapVersion(1);
    expect(screen.getByTestId('settings-testing')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'פיראטים (טיוטת אווטרים)' })).toBeTruthy();
    expect(useToast.getState().current).toMatchObject({
      variant: 'success',
      message: 'אזור הבדיקה נפתח, בתחתית ההגדרות',
    });
    // Open: more taps change nothing and say nothing more.
    await act(async () => useToast.getState().clear());
    await tapVersion(7);
    expect(useToast.getState().current).toBeNull();
    expect(screen.getByTestId('settings-testing')).toBeTruthy();
  });

  it('stays open (kept on the phone) on the next visit, and hides again from inside, its switches kept', async () => {
    await showStaging();
    await tapVersion(7);
    await fireEvent.press(screen.getByRole('switch', { name: 'פתח את כל השלבים (בדיקה)' }));
    expect(JSON.parse(Storage.getItemSync('testing-switches')!)).toMatchObject({
      state: { sectionOpen: true, unlockAllLevels: true },
    });
    await screen.unmount();
    await showStaging();
    expect(screen.getByTestId('settings-testing')).toBeTruthy();

    // Its hint says how to come back, with the count of the config (UNLOCK_TAPS), not a number in the text.
    expect(screen.getByTestId('setting-testing-hide')).toHaveProp(
      'accessibilityHint',
      `המתגים נשארים כמו שהם. ${UNLOCK_TAPS} הקשות מהירות על הגרסה פותחות אותו שוב.`,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'הסתרת אזור הבדיקה' }));
    expect(screen.queryByTestId('settings-testing')).toBeNull();
    // Hidden, the switch stays on (the map still reads it), on the phone too.
    expect(useTestingSwitches.getState()).toMatchObject({ sectionOpen: false, unlockAllLevels: true });
    expect(JSON.parse(Storage.getItemSync('testing-switches')!)).toMatchObject({
      state: { sectionOpen: false, unlockAllLevels: true },
    });
    // And 7 taps open it again.
    await tapVersion(7);
    expect(screen.getByRole('switch', { name: 'פתח את כל השלבים (בדיקה)' })).toHaveProp(
      'accessibilityState',
      { checked: true },
    );
  });
});

describe('the stage-12 tabs (routes)', () => {
  it('/leaderboard: its title and the navigation with its tab on; signed out, it says so', async () => {
    await renderApp('/leaderboard');
    expect(screen.getByTestId('leaderboard')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'טבלת מובילים' })).toBeTruthy();
    expect(await screen.findByText('צריך להתחבר כדי לראות את זה')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'טבלת מובילים', selected: true })).toBeTruthy();
  });

  it('/achievements: progress, "בקרוב" for the achievements, and the navigation with its tab on', async () => {
    await renderApp('/achievements');
    expect(screen.getByTestId('progress')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'הישגים והתקדמות' })).toBeTruthy();
    expect(screen.getByText('בקרוב')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'הישגים' })).toHaveProp('accessibilityState', { selected: true });
  });

  it('the placeholder of a tab still to come: a title, "בקרוב" and the navigation', async () => {
    await renderApp('/history', { history: () => <PlaceholderScreen tab="history" /> });
    expect(screen.getByTestId('placeholder-history')).toBeTruthy();
    expect(screen.getByText('בקרוב')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'היסטוריה' })).toHaveProp('accessibilityState', {
      selected: true,
    });
  });

  it('speak English too', async () => {
    await i18n.changeLanguage('en');
    await renderApp('/leaderboard');
    expect(screen.getByRole('header', { name: 'Leaderboard' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Friends' })).toBeTruthy();
  });
});
