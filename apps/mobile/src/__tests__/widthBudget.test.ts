import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { wordsFitLines, wordsOf } from '../components/player/statusFit';
import { localeBundle } from '../i18n';
import { isPseudoLanguage, PSEUDO_LANGUAGES } from '../i18n/languages';
import { layoutLanguages, notePseudoMiss, PHONE, widthIn } from '../components/ui/testing/layout';
import { SHEET_GUTTER } from '../components/ui/Sheet';
import { APP_LOCALES, readLocales } from '../testing/localeFiles';
import { singleLineTexts, type SingleLineKind, type SingleLineText } from '../testing/singleLineTexts';
import { size, space, text, tokens, type TypeName } from '../theme';

/**
 * The width budget of every text that must stay on one line (localization plan 6.1 #10), built from the code
 * (testing/singleLineTexts.ts), in every layout language the app has strings for (layoutLanguages: Hebrew and
 * English in stage 0; each language as its folder arrives; en-XA once registered):
 * - Where the width is known (a sheet's title and subtitle, the dialogs' titles), a translation wider than it
 *   fails, measured in the language's font (Rubik's file, or an estimate by script).
 * - A toast wraps between words and grows (components.md §15.1, QA loop 9: "Not enough points for the next i…"
 *   hid the cost): each of its words must fit the toast's line, and the whole of it TOAST_LINES lines.
 * - Elsewhere, a translation more than 15 % wider than the wider of Hebrew and English is a warning (printed,
 *   not failed): someone looks at that screen in that language.
 * - A text whose key the code doesn't say (a name, a helper's result) is "not checked": the list is printed with
 *   I18N_WIDTH_REPORT=1.
 */

const texts = singleLineTexts();
const LANGUAGES = layoutLanguages();
const SOURCES = ['he', 'en'];

/** Every language's strings as "ns:key" → value: the app's folders, and the pseudo languages once registered. */
const strings: Record<string, Map<string, string>> = {};
function flatten(tree: unknown, path: string, out: Map<string, string>): Map<string, string> {
  if (typeof tree === 'string') out.set(path, tree);
  else if (tree && typeof tree === 'object') {
    for (const [k, v] of Object.entries(tree))
      flatten(v, path.endsWith(':') ? `${path}${k}` : `${path}.${k}`, out);
  }
  return out;
}
for (const [lang, namespaces] of Object.entries(readLocales(APP_LOCALES))) {
  strings[lang] = new Map();
  for (const [ns, tree] of Object.entries(namespaces)) flatten(tree, `${ns}:`, strings[lang]);
}
for (const lang of PSEUDO_LANGUAGES) {
  const bundle = localeBundle(lang);
  if (!bundle) continue;
  strings[lang] = new Map();
  for (const [ns, tree] of Object.entries(bundle)) flatten(tree, `${ns}:`, strings[lang]);
}

const PLURAL = '(_(zero|one|two|few|many|other))?';
const base = (key: string) => key.replace(new RegExp(`${PLURAL}$`), '');
/** A separator alone ("player:sep", "game:listSep") says nothing about what the line shows. */
const SEPARATOR = /:(\w+\.)*(sep|listSep)$/;

/** The keys of a text in a language's strings: an exact key with its plural forms, or a pattern's matches. */
function keysOf(item: SingleLineText, dict: Map<string, string>): string[] {
  return item.keys.flatMap(({ key, pattern }) => {
    const colon = key.indexOf(':');
    const ns = key.slice(0, colon);
    const rest = pattern ? key.slice(colon + 1) : key.slice(colon + 1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`^${ns}:${rest}${PLURAL}$`);
    return [...dict.keys()].filter((k) => re.test(k) && !SEPARATOR.test(k));
  });
}

/** Placeholders that take a number; any other takes a player's name. */
const NUMBERS =
  /^(count|n|num|cost|need|total|seconds|secs|minutes|time|level|chapter|prev|rating|score|points|stage|stars|place|rank|max|min|days|left|done|xp|delta|percent|seats|players)$/i;

/** The words as the phone shows them, near enough: sample values in the placeholders, nested keys read. */
function shown(value: string, ns: string, dict: Map<string, string>, depth = 0): string {
  return value
    .replace(/\$t\(([^,)]+)(,[^)]*)?\)/g, (_, key: string) => {
      const full = key.includes(':') ? key : `${ns}:${key}`;
      const nested = dict.get(full) ?? dict.get(`${full}_other`) ?? '';
      return depth < 3 ? shown(nested, ns, dict, depth + 1) : nested;
    })
    .replace(/\{\{\s*(\w+)[^}]*\}\}/g, (_, name: string) => (NUMBERS.test(name) ? '12' : 'NinaVolt'))
    .replace(/<\/?\w+>/g, '');
}

type Font = { fontFamily: string; fontSize: number };

/**
 * Each of a text's keys (by its plural's base, as English has it) and its widest form in a language (each
 * language has its own plural forms), in the font given; null where the language has none of its forms.
 */
function widths(item: SingleLineText, lang: string, font: Font): Map<string, number | null> {
  const dict = strings[lang]!;
  const out = new Map<string, number | null>(keysOf(item, strings.en!).map((key) => [base(key), null]));
  for (const key of keysOf(item, dict)) {
    if (!out.has(base(key))) continue;
    const width = widthIn(lang, shown(dict.get(key)!, key.slice(0, key.indexOf(':')), dict), font);
    out.set(base(key), Math.max(out.get(base(key)) ?? 0, width));
  }
  return out;
}

const style = (name: TypeName): Font => ({
  fontFamily: text(name).fontFamily!,
  fontSize: text(name).fontSize!,
});

/**
 * The widths known from the components (on Moshe's phone, 360 dp): a sheet's title and subtitle (Sheet.tsx): its
 * gutters, and the close button (44) with its 12 gap.
 */
const KNOWN: Partial<Record<SingleLineKind, { room: number; font: Font }>> = {
  sheetTitle: { room: PHONE.width - 2 * SHEET_GUTTER - space[6] - size.iconButton, font: style('h1') },
  sheetSubtitle: { room: PHONE.width - 2 * SHEET_GUTTER - space[6] - size.iconButton, font: style('label') },
};

/** A toast's line (Toast.tsx): 16 from each side of the screen, its padding 12 and border, the 24 icon, a 10 gap. */
const TOAST_ROOM =
  PHONE.width - 2 * space[8] - 2 * space[6] - 2 * tokens.border.hairline - size.toastIcon - space[5];
/**
 * The most lines a toast's words may take at 360 dp (font 1.0): it grows with them, and a longer message is a
 * paragraph, not a toast. 4: "account:settings.deletedPartly" (at the top of the settings, after deleting the
 * account) takes 4 in German, Polish, Vietnamese, Dutch…; every other toast 3 at most. The sender's chip, the one
 * toast under the cards, has its own 2 (fitAt360Loop9.test.tsx).
 */
const TOAST_LINES = 4;
/** Scripts written without spaces: the phone breaks their lines between letters. */
const NO_SPACES = /^(ja|zh|th)/;

const checked = texts.filter((item) => keysOf(item, strings.en!).length > 0);
const where = (item: SingleLineText) => `${item.file}:${item.line}`;

/** What outgrows its known width in a language: "file:line key: width > room". */
function overflows(lang: string, kind: SingleLineKind): { key: string; line: string }[] {
  const { room, font } = KNOWN[kind]!;
  return checked
    .filter((item) => item.kind === kind)
    .flatMap((item) =>
      [...widths(item, lang, font)]
        .filter(([, width]) => width !== null && width > room)
        .map(([key, width]) => ({
          key,
          line: `${where(item)} ${key}: ${Math.ceil(width!)} > ${Math.floor(room)}`,
        })),
    );
}

describe('the single-line texts, from the code', () => {
  it('finds them: about 170 one-line Texts, the toasts and the sheets’ titles', () => {
    const count = (kind: SingleLineKind) => texts.filter((t) => t.kind === kind).length;
    expect(count('text')).toBeGreaterThan(150);
    expect(count('toast')).toBeGreaterThan(20);
    expect(count('sheetTitle')).toBeGreaterThanOrEqual(5);
    // The toast's message, wherever it is in Toast.tsx: no one-line Text any more (QA loop 9, components.md §15.1).
    const toast = readFileSync(join(__dirname, '..', 'components', 'ui', 'Toast.tsx'), 'utf8').split(/\r?\n/);
    const line = toast.findIndex((l) => l.trim() === 'style={styles.message}'); // the line after its "<Text"
    expect(toast[line - 1]?.trim()).toBe('<Text');
    expect(texts.map(where)).not.toContain(`src/components/ui/Toast.tsx:${line}`);
    expect(
      texts.filter((t) => t.file === 'src/screens/levels/LevelMapScreen.tsx' && t.kind === 'toast'),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keys: [{ key: 'levels:map.gateToast', pattern: false }] }),
      ]),
    );
  });

  it('most say their keys, and every key the code names exists in English', () => {
    expect(checked.length).toBeGreaterThan(texts.length / 2);
    const english = [...strings.en!.keys()];
    const missing = texts.flatMap((item) =>
      item.keys
        .filter(({ key, pattern }) => !pattern && !SEPARATOR.test(key))
        .filter(({ key }) => !strings.en!.has(key) && !english.some((k) => k.startsWith(`${key}_`)))
        .map(({ key }) => `${where(item)} ${key}`),
    );
    expect(missing).toEqual([]);
  });

  it('prints the "not checked" report on request (I18N_WIDTH_REPORT=1)', () => {
    const unchecked = texts.filter((item) => !checked.includes(item)).map(where);
    if (process.env.I18N_WIDTH_REPORT) {
      const over = SOURCES.flatMap((lang) => toastsOver(lang).map((line) => `${lang} ${line}`));
      console.log(
        `Not checked (${unchecked.length}):\n${unchecked.join('\n')}\n\nToasts over their lines in Hebrew or English:\n${over.join('\n')}`,
      );
    }
    expect(unchecked.length + checked.length).toBe(texts.length);
  });
});

describe.each(LANGUAGES)('%s: where the width is known, the words fit', (lang) => {
  it.each(Object.keys(KNOWN) as SingleLineKind[])('%s', (kind) => {
    const over = overflows(lang, kind).map((o) => o.line);
    // en-XA, English about 40 % longer (plan 0יג): a place to watch, not a failure (layout.ts pseudoMisses).
    if (isPseudoLanguage(lang)) over.forEach((line) => notePseudoMiss(lang, line));
    else expect(over).toEqual([]);
  });
});

/** The lines `line` takes in a toast in `lang`, broken between words (between letters where it has no spaces). */
function toastLines(lang: string, line: string): number {
  const font = style('buttonSm');
  const parts = NO_SPACES.test(lang) ? [...line.replace(/\s+/g, '')] : wordsOf(line);
  const widths = parts.map((p) => widthIn(lang, p, font));
  const gap = NO_SPACES.test(lang) ? 0 : widthIn(lang, 'a b', font) - widthIn(lang, 'ab', font);
  for (let n = 1; n <= parts.length; n++) if (wordsFitLines(widths, gap, TOAST_ROOM, n)) return n;
  return Infinity;
}

/** The toasts of a language whose words take more than TOAST_LINES lines (or a word is wider than one). */
function toastsOver(lang: string): string[] {
  const dict = strings[lang]!;
  return checked
    .filter((item) => item.kind === 'toast')
    .flatMap((item) =>
      keysOf(item, dict).flatMap((key) => {
        const lines = toastLines(lang, shown(dict.get(key)!, key.slice(0, key.indexOf(':')), dict));
        return lines > TOAST_LINES ? [`${where(item)} ${key}: ${lines} lines > ${TOAST_LINES}`] : [];
      }),
    );
}

describe.each(LANGUAGES)('%s: a toast’s words fit its lines, none broken', (lang) => {
  it(`each word within a line, ${TOAST_LINES} lines at most`, () => {
    const over = toastsOver(lang);
    if (isPseudoLanguage(lang)) over.forEach((line) => notePseudoMiss(lang, line));
    else expect(over).toEqual([]);
  });
});

/** The warnings of a language: its words more than 15 % wider than the wider of Hebrew and English. */
function widthWarnings(lang: string, items: readonly SingleLineText[] = checked): string[] {
  const font = { fontFamily: 'Rubik_500Medium', fontSize: 100 };
  return items.flatMap((item) => {
    const mine = widths(item, lang, font);
    const source = SOURCES.map((l) => widths(item, l, font));
    return [...mine].flatMap(([key, width]) => {
      const widest = Math.max(...source.map((w) => w.get(key) ?? 0));
      return width !== null && widest > 0 && width > 1.15 * widest
        ? [`${lang} ${where(item)} ${key}: +${Math.round((width / widest - 1) * 100)} %`]
        : [];
    });
  });
}

describe('elsewhere, a translation much wider than Hebrew and English is a warning', () => {
  it('Hebrew and English are the measure, never warned', () => {
    expect([...widthWarnings('he'), ...widthWarnings('en')]).toEqual([]);
  });

  it('warns on a line 15 % wider, and not on one as wide', () => {
    const item: SingleLineText = {
      file: 'x.tsx',
      line: 1,
      kind: 'text',
      keys: [{ key: 'game:arsenal.title', pattern: false }],
    };
    const en = strings.en!.get('game:arsenal.title')!;
    strings.zz = new Map([['game:arsenal.title', `${en}${en.slice(0, Math.ceil(en.length * 0.3))}`]]);
    strings.yy = new Map([['game:arsenal.title', en]]);
    try {
      expect(widthWarnings('zz', [item])).toEqual([
        expect.stringMatching(/^zz x\.tsx:1 game:arsenal\.title: \+\d+ %$/),
      ]);
      expect(widthWarnings('yy', [item])).toEqual([]);
    } finally {
      delete strings.zz;
      delete strings.yy;
    }
  });

  it('prints those of every other layout language the app has (none in stage 0)', () => {
    // Not en-XA's: it is 40 % longer by design (plan 0יג), so its every line would be one.
    const warnings = LANGUAGES.filter((lang) => !SOURCES.includes(lang) && !isPseudoLanguage(lang)).flatMap(
      (lang) => widthWarnings(lang),
    );
    if (warnings.length) console.warn(`Width warnings (${warnings.length}):\n${warnings.join('\n')}`);
    expect(warnings.every((w) => / \+\d+ %$/.test(w))).toBe(true);
  });
});
