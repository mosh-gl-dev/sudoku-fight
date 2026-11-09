import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { SCREEN_CONTENT_STYLE } from '../theme/transitions';

/**
 * D126, Moshe 31.10.2026: "הרקע בכל האפליקציה צריך להיות מספרים קטנים … משוטטים על המסך … בכל מקום שבו יש רקע".
 * One layer of wandering digits, in the root layout, behind the navigator; the navigator's screens and every
 * screen's root are transparent over it, so the digits show wherever the ground shows. This reads the source the
 * way a grep would: a screen that paints its own ground again would hide the digits on it.
 */

const MOBILE = join(__dirname, '..', '..');

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory())
      return ['__tests__', '__fixtures__', 'testing', 'node_modules'].includes(name) ? [] : sources(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

const rel = (path: string) => relative(MOBILE, path).split(sep).join('/');

/** The code without its comments (a `//` after a colon is a URL, not a comment). */
const stripComments = (code: string): string =>
  code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:\\])\/\/.*$/gm, '$1');

const files = [...sources(join(MOBILE, 'src')), ...sources(join(MOBILE, 'app'))].map((path) => ({
  name: rel(path),
  code: stripComments(readFileSync(path, 'utf8')),
}));

const layout = files.find((f) => f.name === 'app/_layout.tsx')!.code;

/**
 * The only screen-filling styles that may paint the ground themselves, and why: they are not over the layer.
 */
const OPAQUE: Record<string, string> = {
  // The one ground: the root view, under the layer.
  'app/_layout.tsx': 'the root view that the digits are drawn on',
  'src/screens/account/SplashScreen.tsx': 'the Splash covers the whole app while the sign-in loads',
  'src/screens/ErrorScreen.tsx':
    "the root layout's error boundary shows it in place of the layout and its layer",
};

/**
 * Every style object that fills a screen (`flex: 1`) and paints the ground (`backgroundColor: color.bg`). A chip
 * or a cell that grows in its row has a border or rounded corners; a screen's ground has neither.
 */
function screenGrounds(code: string): string[] {
  return (code.match(/\{[^{}]*\}/g) ?? [])
    .filter((block) => /\bflex:\s*1\b/.test(block) && /\bbackgroundColor:\s*color\.bg\b/.test(block))
    .filter((block) => !/\bborder(?:Width|Radius|Color)\b/.test(block))
    .map((block) => block.replace(/\s+/g, ' '));
}

describe('[D126] the wandering digits behind every screen', () => {
  it('reads the screens and the routes', () => {
    expect(files.length).toBeGreaterThan(200);
    expect(files.some((f) => f.name === 'src/screens/home/HomeScreen.tsx')).toBe(true);
    expect(files.some((f) => f.name === 'app/game.tsx')).toBe(true);
  });

  it('one layer, in the root layout, before the navigator (so under every screen), stopped under the Splash', () => {
    const users = files.filter((f) => /components\/ambient\/AmbientLayer'/.test(f.code)).map((f) => f.name);
    expect(users).toEqual(['app/_layout.tsx']);
    const at = layout.indexOf('<AmbientLayer covered={splash} />');
    expect(at).toBeGreaterThan(0);
    expect(layout.indexOf('<Stack')).toBeGreaterThan(at);
    // Under the layer, the root view paints the one ground.
    expect(layout.slice(0, at)).toMatch(
      /<GestureHandlerRootView style=\{\{ flex: 1, backgroundColor: color\.bg \}\}>/,
    );
  });

  it("the navigator's screens are transparent, and no route paints a screen's content again", () => {
    expect(SCREEN_CONTENT_STYLE).toEqual({ backgroundColor: 'transparent' });
    expect(layout).toMatch(/contentStyle: SCREEN_CONTENT_STYLE/);
    const others = files.filter((f) => f.name !== 'app/_layout.tsx' && /\bcontentStyle\b/.test(f.code));
    expect(others.map((f) => f.name)).toEqual([]);
    // Every screen is a card: none is presented over another one that could show through it.
    expect(files.filter((f) => /\bpresentation:/.test(f.code)).map((f) => f.name)).toEqual([]);
  });

  it('no screen root paints the ground (the digits would be hidden there)', () => {
    const painting = files
      .filter((f) => !(f.name in OPAQUE))
      .flatMap((f) => screenGrounds(f.code).map((style) => `${f.name}: ${style}`));
    expect(painting).toEqual([]);
  });

  it('the opaque ones are still there, and still opaque (else drop them from the list)', () => {
    for (const name of Object.keys(OPAQUE)) {
      const file = files.find((f) => f.name === name);
      expect({ name, grounds: (file && screenGrounds(file.code).length > 0) ?? false }).toEqual({
        name,
        grounds: true,
      });
    }
  });

  it('the per-screen layer of 30.10.2026 is gone: no screen mounts digits of its own', () => {
    const old = files.filter((f) => /\bAmbientScreen\b|\bAmbientHost\b|ambient=["{]/.test(f.code));
    expect(old.map((f) => f.name)).toEqual([]);
  });
});
