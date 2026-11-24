import { LANGUAGE_NAMES_IN } from '../languageNamesIn.generated';
import { languageLabels, languageNameIn, namesLanguage } from '../languageNamesIn';
import { ENABLED_LANGUAGES, LANGUAGE_NAMES, LANGUAGES, type Language } from '../languages';

/**
 * Each language by its name in the app's language (Moshe, 25.11.2026: the picker shows "希伯来语" over "עברית"
 * in Chinese). Our own table (languageNamesIn.generated.ts, scripts/gen-language-names.ts), since Hermes has no
 * Intl.DisplayNames. A language added to LANGUAGES fails here until the generator runs again.
 */

/** The script each language's names are written in (a letter of it in every name). */
const SCRIPT: Readonly<Record<Language, RegExp>> = (() => {
  const latin = /[A-Za-z]/;
  return {
    he: /[א-ת]/,
    en: latin,
    ar: /[؀-ۿ]/,
    es: latin,
    'pt-BR': latin,
    de: latin,
    fr: latin,
    ja: /[぀-ヿ一-鿿]/,
    ru: /[а-яё]/i,
    ko: /[가-힯]/,
    it: latin,
    tr: latin,
    'zh-Hans': /[一-鿿]/,
    id: latin,
    pl: latin,
    'zh-Hant': /[一-鿿]/,
    vi: latin,
    th: /[฀-๿]/,
    nl: latin,
  };
})();

describe('language names in every language of the app', () => {
  it('there is a table for every language of the app, and no other', () => {
    expect(Object.keys(LANGUAGE_NAMES_IN)).toEqual([...LANGUAGES]);
  });

  it.each([...LANGUAGES])('%s names every enabled language, each once, in its own script', (ui) => {
    const table = LANGUAGE_NAMES_IN[ui];
    expect(Object.keys(table)).toEqual([...LANGUAGES]);
    for (const lang of ENABLED_LANGUAGES) {
      const name = table[lang];
      expect(name.trim()).toBe(name);
      expect(name).not.toBe(lang);
      expect(name).toMatch(SCRIPT[ui]);
    }
    expect(new Set(ENABLED_LANGUAGES.map((lang) => table[lang])).size).toBe(ENABLED_LANGUAGES.length);
    // The app's own language is its own name: its row in the picker has one line.
    expect(table[ui]).toBe(LANGUAGE_NAMES[ui]);
  });

  it('a few names a reader would check', () => {
    expect(LANGUAGE_NAMES_IN.he).toMatchObject({
      de: 'גרמנית',
      en: 'אנגלית',
      'zh-Hans': 'סינית פשוטה',
      'zh-Hant': 'סינית מסורתית',
    });
    expect(LANGUAGE_NAMES_IN['zh-Hans'].he).toBe('希伯来语');
    expect(LANGUAGE_NAMES_IN['zh-Hant'].he).toBe('希伯來文');
    expect(LANGUAGE_NAMES_IN.en).toMatchObject({ he: 'Hebrew', 'pt-BR': 'Brazilian Portuguese' });
    expect(LANGUAGE_NAMES_IN.ar.he).toBe('العبرية');
    // A name opens with a capital, as an item of a list (CLDR writes French and Russian names in lower case).
    expect(LANGUAGE_NAMES_IN.fr.de).toBe('Allemand');
    expect(LANGUAGE_NAMES_IN.ru.he).toBe('Иврит');
    expect(LANGUAGE_NAMES_IN.id.en).toBe('Bahasa Inggris');
  });

  it("the picker reads the app language's table: English for a pseudo language", () => {
    expect(namesLanguage('he')).toBe('he');
    expect(namesLanguage('en-XA')).toBe('en');
    expect(languageNameIn('de', 'zh-Hans')).toBe('德语');
    expect(languageNameIn('de', 'ar-XB')).toBe('German');
    expect(languageNameIn('en-XA', 'he')).toBe('en-XA');
  });

  it('a row: the name in the app language, its own name under it, one line for the app language itself', () => {
    expect(languageLabels('he', 'zh-Hans')).toEqual({ name: '希伯来语', native: 'עברית' });
    expect(languageLabels('de', 'he')).toEqual({ name: 'גרמנית', native: 'Deutsch' });
    expect(languageLabels('he', 'he')).toEqual({ name: 'עברית', native: null });
    for (const ui of LANGUAGES) expect(languageLabels(ui, ui).native).toBeNull();
  });
});
