import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { getLocales } from 'expo-localization';
import { Platform, StyleSheet } from 'react-native';

import i18n from '../../../i18n';
import { LANGUAGE_NAMES_IN } from '../../../i18n/languageNamesIn.generated';
import { LANGUAGE_NAMES, LANGUAGES } from '../../../i18n/languages';
import { useSettings } from '../../../state/settings';
import { text, typefaceFor } from '../../../theme';
import { LanguagePicker } from '../LanguagePicker';

/**
 * The language picker (localization plan 0י, components.md §21), as a later stage has it, with all 19
 * languages on (enabled-languages.json): "שפת המכשיר" first (the phone's language under it), then each language
 * by its name in the app's language and, under it, by its own name in its own font (Moshe, 25.11.2026), read by
 * a screen reader in the app's language; a choice that changes the language asks first (the app restarts for
 * it, D104), one that keeps it is saved at once. SettingsAndPlaceholders.test.tsx and
 * languageSwitch.e2e.test.tsx drive it with this build's two languages.
 */

// Every language on, in another order than the plan's (the picker keeps the plan's).
jest.mock('../../../i18n/enabled-languages.json', () => [
  'nl',
  'en',
  'he',
  'ar',
  'es',
  'pt-BR',
  'de',
  'fr',
  'ja',
  'ru',
  'ko',
  'it',
  'tr',
  'zh-Hans',
  'id',
  'pl',
  'zh-Hant',
  'vi',
  'th',
]);
jest.mock('expo-localization', () => ({ getLocales: jest.fn() }));
jest.mock('../../../services/feedback', () => ({ cue: jest.fn() }));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);

const phone = (tag: string) =>
  jest.mocked(getLocales).mockReturnValue([{ languageTag: tag }] as unknown as ReturnType<typeof getLocales>);

/** The sheet (or the dialog) has come and gone: its animation is over. */
const settle = () => act(async () => void jest.advanceTimersByTime(1000));

async function openSheet() {
  await fireEvent.press(screen.getByTestId('setting-language'));
  await settle();
}

const rows = () => screen.getAllByRole('radio');

/** A row's spoken name in Hebrew: "גרמנית, Deutsch"; Hebrew's own row is "עברית". */
const row = (lang: (typeof LANGUAGES)[number]) =>
  lang === 'he' ? 'עברית' : `${LANGUAGE_NAMES_IN.he[lang]}, ${LANGUAGE_NAMES[lang]}`;

beforeEach(async () => {
  jest.useFakeTimers();
  phone('he-IL');
  await i18n.changeLanguage('he');
  useSettings.setState({ language: 'he', languageSource: 'app', reduceMotion: 'on' });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('the language picker (plan 0י)', () => {
  it('"שפת המכשיר" first, then every language in the plan\'s order, in Hebrew and in itself', async () => {
    await render(<LanguagePicker />);
    await openSheet();
    expect(rows().map((r) => r.props.accessibilityLabel)).toEqual([
      'שפת המכשיר, עברית',
      ...LANGUAGES.map(row),
    ]);
    expect(rows().map((r) => r.props.accessibilityLabel)).toContain('גרמנית, Deutsch');
    // One language to a label: the app's (iOS).
    expect(rows().map((r) => r.props.accessibilityLanguage)).toEqual(Array(LANGUAGES.length + 1).fill('he'));
    expect(screen.getByRole('radio', { name: 'עברית' })).toHaveProp('accessibilityState', { checked: true });
    expect(screen.getByRole('radio', { name: 'גרמנית, Deutsch' })).toHaveProp('accessibilityState', {
      checked: false,
    });
  });

  it("the name in the app's font; its own name under it, smaller, in its font (the system's for 日本語)", async () => {
    await render(<LanguagePicker />);
    await openSheet();
    const inRow = (value: string, name: string) =>
      within(screen.getByTestId(`setting-language-${value}`)).getByText(name);
    const style = (value: string, name: string) => StyleSheet.flatten(inRow(value, name).props.style);
    expect(style('he', 'עברית')).toMatchObject(text('rowTitle'));
    expect(style('de', 'גרמנית')).toMatchObject(text('rowTitle'));
    expect(style('de', 'Deutsch')).toMatchObject(text('caption', typefaceFor('de', Platform.OS)));
    expect(style('ja', 'יפנית')).toMatchObject(text('rowTitle'));
    expect(style('ja', '日本語')).toMatchObject(text('caption', typefaceFor('ja', Platform.OS)));
    expect(style('ja', '日本語').fontFamily).not.toBe(style('he', 'עברית').fontFamily);
    // Hebrew's own row has one line: its name is the same both ways.
    expect(screen.queryByTestId('setting-language-he-native')).not.toBeOnTheScreen();
    expect(screen.getByTestId('setting-language-de-native')).toHaveTextContent('Deutsch');
    // "שפת המכשיר" is in the app's language, in its font, with the phone's language under it.
    expect(style('system', 'שפת המכשיר')).toMatchObject(text('rowTitle'));
    expect(screen.getByTestId('setting-language-system-native')).toHaveTextContent('עברית');
  });

  it('in Chinese (switched by mistake), Hebrew is "希伯来语" with "עברית" under it', async () => {
    await act(async () => void (await i18n.changeLanguage('zh-Hans')));
    useSettings.setState({ language: 'zh-Hans' });
    await render(<LanguagePicker />);
    await openSheet();
    expect(within(screen.getByTestId('setting-language-he')).getByText('希伯来语')).toBeOnTheScreen();
    expect(screen.getByTestId('setting-language-he-native')).toHaveTextContent('עברית');
    expect(screen.getByRole('radio', { name: '希伯来语，עברית' })).toHaveProp(
      'accessibilityLanguage',
      'zh-Hans',
    );
    expect(screen.queryByTestId('setting-language-zh-Hans-native')).not.toBeOnTheScreen();
    // The phone is Hebrew: "设备语言" says so in Hebrew.
    expect(screen.getByTestId('setting-language-system-native')).toHaveTextContent('עברית');
  });

  it("a language that changes the app asks first; the confirm saves it as the app's choice", async () => {
    await render(<LanguagePicker />);
    await openSheet();
    await fireEvent.press(screen.getByRole('radio', { name: 'גרמנית, Deutsch' }));
    expect(useSettings.getState().language).toBe('he');
    await settle();
    expect(screen.getByText('להחליף את השפה ל־Deutsch?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'החלפה והפעלה מחדש' }));
    expect(useSettings.getState()).toMatchObject({ language: 'de', languageSource: 'app' });
  });

  it('"ביטול" changes nothing', async () => {
    await render(<LanguagePicker />);
    await openSheet();
    await fireEvent.press(screen.getByRole('radio', { name: 'אנגלית, English' }));
    await settle();
    await fireEvent.press(screen.getByRole('button', { name: 'ביטול' }));
    await settle();
    expect(useSettings.getState().language).toBe('he');
    expect(screen.queryByText('להחליף את השפה ל־English?')).not.toBeOnTheScreen();
  });

  it('"שפת המכשיר" on a phone in another language asks with its own title', async () => {
    phone('en-US');
    await render(<LanguagePicker />);
    await openSheet();
    await fireEvent.press(screen.getByRole('radio', { name: 'שפת המכשיר, English' }));
    await settle();
    expect(screen.getByText('לעבור לשפת המכשיר?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'החלפה והפעלה מחדש' }));
    expect(useSettings.getState()).toMatchObject({ language: 'system', languageSource: 'app' });
  });

  it('a choice that keeps the language ("עברית" while "שפת המכשיר" is Hebrew) is saved at once, no question', async () => {
    useSettings.setState({ language: 'system', languageSource: 'default' });
    await render(<LanguagePicker />);
    await openSheet();
    await fireEvent.press(screen.getByRole('radio', { name: 'עברית' }));
    await settle();
    expect(useSettings.getState()).toMatchObject({ language: 'he', languageSource: 'app' });
    expect(screen.queryByTestId('language-confirm')).not.toBeOnTheScreen();
  });

  it('the field: "שפת המכשיר" with the language it is now under it; a chosen language by its name', async () => {
    useSettings.setState({ language: 'system', languageSource: 'default' });
    const view = await render(<LanguagePicker />);
    expect(screen.getByRole('button', { name: 'שפה: שפת המכשיר, עברית' })).toBeOnTheScreen();
    expect(screen.getByTestId('setting-language-value')).toHaveTextContent('שפת המכשיר');
    expect(screen.getByTestId('setting-language-device')).toHaveTextContent('עברית');
    await act(async () => useSettings.setState({ language: 'he', languageSource: 'app' }));
    await view.rerender(<LanguagePicker />);
    expect(screen.getByRole('button', { name: 'שפה: עברית' })).toBeOnTheScreen();
    expect(screen.queryByTestId('setting-language-device')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('setting-language-native')).not.toBeOnTheScreen();
  });

  it('the field: a language other than the one running is named in it and in itself', async () => {
    useSettings.setState({ language: 'de', languageSource: 'app' });
    await render(<LanguagePicker />);
    expect(screen.getByRole('button', { name: 'שפה: גרמנית, Deutsch' })).toBeOnTheScreen();
    expect(screen.getByTestId('setting-language-value')).toHaveTextContent('גרמנית');
    expect(screen.getByTestId('setting-language-native')).toHaveTextContent('Deutsch');
  });
});
