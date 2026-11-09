import { renderRoomPage, ROOM_PAGE_CSS } from '../friends/links';
import { LEGAL_CSS, LEGAL_LANGS, PAGE_LANGUAGE_NAMES, renderLegalPage } from '.';

/**
 * QA run #2, B6: the language bar at the top of /legal/… and /r/<code>. With 19 languages in one flex row that
 * could not wrap, and the body's overflow-wrap:anywhere (long addresses in the texts may break anywhere), each
 * name and the brand shrank to one letter per line ("Português (Brasil)" about 1,700 px tall on a phone), and the
 * row still ran wider than the screen (in Hebrew and Arabic the page scrolled into empty space). Checked in a
 * headless Chrome at 360, 412 and 800 px: nothing sticks out, each name on one line, the brand on its own.
 */

/** The page's style as selector → its declarations (the rules outside @media; one rule per line). */
function rulesOf(css: string): Map<string, Map<string, string>> {
  const rules = new Map<string, Map<string, string>>();
  for (const line of css.split('\n')) {
    const m = /^([^@{][^{]*)\{([^}]*)\}$/.exec(line);
    if (m === null) continue;
    const declarations = new Map<string, string>();
    for (const d of m[2]!.split(';')) {
      const colon = d.indexOf(':');
      if (colon > 0) declarations.set(d.slice(0, colon).trim(), d.slice(colon + 1).trim());
    }
    rules.set(m[1]!.trim(), declarations);
  }
  return rules;
}

const SET = { contactEmail: 'privacy@sudoku.example', operatorName: 'Sudoku Fight Ltd.' };
const ROOM = {
  code: '123456',
  platform: 'android',
  pageUrl: '',
  storeUrls: { android: null, ios: null },
} as const;

describe.each([
  ['the legal pages', LEGAL_CSS],
  ['the room page', ROOM_PAGE_CSS],
])('[B6] %s: the language bar wraps by whole names', (_name, css) => {
  const rules = rulesOf(css);
  const rule = (selector: string) => rules.get(selector) ?? new Map<string, string>();

  it('the body may still break a long word anywhere (the reason the header needs its own rules)', () => {
    expect(rule('body').get('overflow-wrap')).toBe('anywhere');
  });

  it('the names wrap onto more rows instead of shrinking, and the bar goes under the brand', () => {
    expect(rule('.langs').get('display')).toBe('flex');
    expect(rule('.langs').get('flex-wrap')).toBe('wrap');
    expect(rule('.top .wrap').get('display')).toBe('flex');
    expect(rule('.top .wrap').get('flex-wrap')).toBe('wrap');
  });

  it('a name and the brand never break inside: one line each', () => {
    expect(rule('.langs a').get('white-space')).toBe('nowrap');
    expect(rule('.brand').get('white-space')).toBe('nowrap');
  });

  it('every row keeps a 44 px touch target, the brand’s too', () => {
    expect(rule('.langs a').get('min-height')).toBe('44px');
    expect(rule('.langs a').get('line-height')).toBe('44px');
    expect(rule('.brand').get('line-height')).toBe('44px');
  });
});

describe('[B6] the header those rules apply to', () => {
  const header = (html: string) => /<header class="top">([\s\S]*?)<\/header>/.exec(html)?.[1] ?? '';

  it('the brand and the bar of every language, in both directions', () => {
    for (const lang of ['he', 'ar', 'en', 'pt-BR'] as const) {
      for (const html of [renderLegalPage('privacy', lang, SET), renderRoomPage({ ...ROOM, lang })]) {
        const top = header(html);
        expect(top).toMatch(
          /^<div class="wrap"><span class="brand">[^<]+<\/span><nav class="langs" aria-label="[^"]+">/,
        );
        for (const l of LEGAL_LANGS) expect(top).toContain(`>${PAGE_LANGUAGE_NAMES[l]}</a>`);
      }
    }
  });
});
