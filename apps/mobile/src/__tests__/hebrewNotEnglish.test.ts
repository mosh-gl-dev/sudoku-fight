import { flatten, isDevOnly, KEEP_LATIN } from '../../../../scripts/lib/i18n-locales.mjs';
import { APP_LOCALES, readLocales } from '../testing/localeFiles';

/**
 * Hebrew is written by hand, so the i18n check (scripts/lib/i18n-locales.mjs) holds it to neither "the same as
 * English" nor "Latin letters": an English value left in a Hebrew file passed every check, and showed on the
 * phone (QA loop 8: "Reconnecting... 13" under the opponent's ring). Here: no Hebrew value is English, but for the
 * ones below, each with its reason.
 */
const ENGLISH_OK: Record<string, string> = {
  'account:fields.emailPlaceholder': 'an example address',
  'account:errors.auth.googleConfig': "Google's error code (DEVELOPER_ERROR), for a report",
  'common:hello.engineLine': 'the development build’s hello screen (app/dev/hello.tsx)',
  'common:hello.versions': 'the development build’s hello screen (app/dev/hello.tsx)',
  'common:hello.server.rtt': 'the development build’s hello screen (app/dev/hello.tsx)',
  'common:appVersion.build': 'the build tag under the version, "build a1b2c3d · staging" (VersionInfo)',
  // The original spec's words (00-original-spec-v1.md, "Offline במהלך משחק": "Reconnecting... 15"), kept as
  // they are until Moshe decides on a Hebrew caption (CLAUDE.md: the original wins).
  'game:connection.opponent.ring': 'the original spec’s caption, "Reconnecting... 15"',
};

/** The words of a value: no placeholders, tags, $t(), the names that stay Latin, roman numerals or cell names. */
function ownWords(value: string): string {
  let words = value
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\$t\([^)]*\)/g, '');
  for (const name of KEEP_LATIN) words = words.split(name).join('');
  return words.replace(/\b[IVX]{2,4}\b/g, '').replace(/\b[A-I][1-9]\b/g, '');
}

const trees = readLocales(APP_LOCALES);
const strings = (lang: string) =>
  Object.entries(trees[lang] ?? {}).flatMap(([ns, tree]) =>
    flatten(tree)
      .filter(([key, value]) => typeof value === 'string' && !isDevOnly(ns, key))
      .map(([key, value]): [string, string] => [`${ns}:${key}`, value as string]),
  );

describe('Hebrew has no English left in it', () => {
  const english = new Map(strings('en'));
  const hebrew = strings('he').filter(([id]) => !isDevOnly(id.split(':')[0]!));

  it('no value the same as English (but for the allow-list)', () => {
    const same = hebrew
      .filter(([id, value]) => english.get(id) === value && /\p{L}/u.test(ownWords(value)))
      .map(([id]) => id)
      .filter((id) => !ENGLISH_OK[id]);
    expect(same).toEqual([]);
  });

  it('no Latin word in a value (but for the allow-list)', () => {
    const latin = hebrew
      .filter(([, value]) => /[A-Za-z]{2,}/.test(ownWords(value)))
      .map(([id]) => id)
      .filter((id) => !ENGLISH_OK[id]);
    expect(latin).toEqual([]);
  });

  it('the allow-list holds only what is still there (a translated value leaves it)', () => {
    const he = new Map<string, string>(hebrew);
    const stale = Object.keys(ENGLISH_OK).filter((id) => {
      const value = he.get(id);
      return value === undefined || !/[A-Za-z]{2,}/.test(ownWords(value));
    });
    expect(stale).toEqual([]);
  });
});
