import type { TFunction } from 'i18next';

import { I18N_CONFIG } from '../config/i18n';

/**
 * Text built from parts, in any language (localization plan 0ה, D108). The code glues no words with a literal
 * space, full stop, colon or "%": each comes from a translation key, so a language with other punctuation gets
 * its own ("label : value" in French, "%57" in Turkish, "39,5" in German) and Japanese and Chinese put no space
 * after a sentence. In Hebrew and English every key holds what the code wrote before, so their text is the same
 * byte for byte (__tests__/compose.test.ts).
 *
 * Pure: `t` is any namespace's (the keys here name their own namespace). A leaf besides config/i18n.ts, so any
 * screen or model may import it.
 */

type Part = string | null | false | undefined;
const present = (parts: readonly Part[]): string[] => parts.filter((p): p is string => !!p);

/**
 * Sentences one after another, each already ending as it should: "…נסה שוב. נרשמת עם Google?…". The space after a
 * sentence is match:sentenceSpace (none in Japanese and Chinese). Empty parts are skipped.
 */
export function spaceSentences(parts: readonly Part[], t: TFunction): string {
  return present(parts).join(t('match:sentenceSpace'));
}

/**
 * Parts that are not sentences yet, each closed and put after the other: "הבוס: Pip. מהיר." (match:sep between
 * them, the language's full stop and space: ". ", "。" in Japanese). The last part gets no stop.
 */
export function stopSentences(parts: readonly Part[], t: TFunction): string {
  return present(parts).join(t('match:sep'));
}

/** One sentence closed with the language's full stop: "בריבוע 5." / "ボックス5。" (common:text.sentence). */
export const closeSentence = (text: string, t: TFunction): string => t('common:text.sentence', { text });

/** Where a sentence may end: a full stop, "?", "!", "…" in any script ("。", "؟", "।"…). */
const SENTENCE_END = /[.!?…。！？؟।]$/u;
/** Marks that may follow the last letter and take no room (an isolate's PDI, a ZWSP): not the end. */
const TRAILING_MARKS = /[\u{200B}-\u{200F}\u{061C}\u{202A}-\u{202E}\u{2060}-\u{2069}\u{FEFF}\s]+$/u;

/** Whether `text` already ends as a sentence (its last mark is a full stop, a question mark…). */
export const endsSentence = (text: string): boolean => SENTENCE_END.test(text.replace(TRAILING_MARKS, ''));

/**
 * Parts that may or may not be sentences, one after another, never run together: each that doesn't end as a
 * sentence yet is closed with the language's full stop (closeSentence), then they follow with match:sentenceSpace
 * (spaceSentences). For a label made of sentences, short lines and "label: value" parts (the replay's card:
 * Japanese has no space after a sentence, so "5ではなく1" ran into "1が入らない理由…" as "5ではなく11が…").
 */
export function closeSentences(parts: readonly Part[], t: TFunction): string {
  return spaceSentences(
    present(parts).map((p) => (endsSentence(p) ? p : closeSentence(p, t))),
    t,
  );
}

/** Words one after another: "7.6 ש׳", "Found 1 of 2" (common:text.wordSpace: none in Japanese, Chinese, Thai). */
export function spaceWords(parts: readonly Part[], t: TFunction): string {
  return present(parts).join(t('common:text.wordSpace'));
}

/** A list: "A8, B3, C1" (player:listSep: "، " in Arabic, "、" in Japanese). */
export function listOf(parts: readonly Part[], t: TFunction): string {
  return present(parts).join(t('player:listSep'));
}

/** "label: value" (common:text.labelValue: "label : value" in French, "label：value" in Japanese). */
export const labelValue = (label: string, value: string, t: TFunction): string =>
  t('common:text.labelValue', { label, value });

/** "text (note)": "NinaVolt (אני)" (common:text.parenthetical: full-width brackets in Japanese and Chinese). */
export const parenthetical = (text: string, note: string, t: TFunction): string =>
  t('common:text.parenthetical', { text, note });

// ---------------------------------------------------------------------------------------------------------
// Numbers and dates (D108: Western digits in every language)

/**
 * The language's decimal separator: "." in Hebrew and English, "," in German (common:number.decimal). From a key,
 * not from Intl.NumberFormat, so the phone shows exactly what the tests check on every Android version. The
 * formatters of components/player/format.ts are worklets (a count-up formats on the UI thread, where t() is not):
 * a screen reads this once and passes it to them.
 */
export const decimalSeparator = (t: TFunction): string => t('common:number.decimal');

/**
 * A percent in the language's pattern, not isolated: "57%", "%57" in Turkish, "57 %" in French
 * (common:number.percent). In RTL text the caller wraps it in an LTR isolate (format.ts `ltr`).
 */
export const percent = (value: number, t: TFunction): string => t('common:number.percent', { value });

/**
 * A language whose dates are in a calendar of its own, named outright: Thai's Buddhist year (2569; docs/i18n
 * style/th.md). Node takes it for plain 'th' (it reads the region in, TH); Hermes on the phone does not, and wrote
 * 2026 (QA run #2, B2).
 */
const CALENDARS: Readonly<Record<string, string>> = { th: 'buddhist' };
const calendarOf = (language: string): string | undefined => CALENDARS[language.split('-')[0]!];

/**
 * The locale Intl formats dates in: the app's language with Western digits ("ar-u-nu-latn": 23/10/2026 on every
 * phone; plain 'ar' is Western on a new Android and ٢٣/١٠/٢٠٢٦ on some, as 'ar-SA' is in Node), and its calendar
 * where it has one of its own ("th-u-ca-buddhist-nu-latn"). D108's alternative
 * (I18N_CONFIG.westernDigitsEverywhere off): the system's own digits. Thai keeps the Buddhist year either way:
 * that is its calendar, not its digits.
 *
 * Not checked on a phone yet: whether Hermes' Intl honours the -u-nu-latn extension (Node does). If the debug
 * screen (plan 0יג) shows Arabic-Indic digits, pass `numberingSystem: 'latn'` among the options in dateFormat too.
 */
export function intlLocale(language: string): string {
  const calendar = calendarOf(language);
  const keys = [
    calendar ? `ca-${calendar}` : null,
    I18N_CONFIG.westernDigitsEverywhere ? 'nu-latn' : null,
  ].filter((key) => key !== null);
  return keys.length > 0 ? `${language}-u-${keys.join('-')}` : language;
}

/**
 * Intl.DateTimeFormat in the app's language (intlLocale), its calendar asked for in the options too (both ways
 * Intl takes one). Throws as Intl does on a tag it can't read.
 */
export function dateFormat(language: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const calendar = calendarOf(language);
  return new Intl.DateTimeFormat(intlLocale(language), calendar ? { calendar, ...options } : options);
}
