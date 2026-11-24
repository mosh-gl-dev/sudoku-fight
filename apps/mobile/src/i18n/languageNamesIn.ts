import { LANGUAGE_NAMES_IN } from './languageNamesIn.generated';
import { isLanguage, type Language, languageName } from './languages';

/**
 * A language's name in the language the app speaks, over its own name (Moshe, 25.11.2026: one who switched the
 * app to Chinese by mistake reads "希伯来语" and, under it, "עברית"). The names are our own table
 * (languageNamesIn.generated.ts, scripts/gen-language-names.ts), not the phone's: Hermes has no
 * Intl.DisplayNames. The pseudo languages of development builds (en-XA, ar-XB) read English (D101).
 */

/** The table a language of the app reads: its own, or English for a pseudo language (or anything else). */
export const namesLanguage = (appLanguage: string): Language =>
  isLanguage(appLanguage) ? appLanguage : 'en';

/** `lang` by its name in `appLanguage` ("de" in Hebrew: "גרמנית"); a pseudo language (or unknown code) by its code. */
export function languageNameIn(lang: string, appLanguage: string): string {
  return isLanguage(lang) ? LANGUAGE_NAMES_IN[namesLanguage(appLanguage)][lang] : lang;
}

/**
 * What a row shows for `lang` while the app speaks `appLanguage`: its name in the app's language, and its own
 * name under it ("גרמנית" / "Deutsch"); `native` is null when the two are the same (the app's own language).
 */
export function languageLabels(lang: string, appLanguage: string): { name: string; native: string | null } {
  const name = languageNameIn(lang, appLanguage);
  const native = languageName(lang);
  return { name, native: native === name ? null : native };
}
