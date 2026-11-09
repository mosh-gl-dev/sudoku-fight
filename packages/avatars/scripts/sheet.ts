/**
 * The visual check loop (docs/avatars/STYLE.md, "Check what you draw"): contact sheets and motion filmstrips.
 *
 *   npm run sheet -w @sudoku-fight/avatars -- [ids…] [--file <module.ts>]… [--lineup] [--fixtures]
 *                                              [--out <dir>] [--shoot]
 *
 * For each avatar (default: all) it writes, to <dir> (default: <os temp>/sfa-sheets, never the repo):
 * - sheet-<id>.html: every expression at 160, 48 and 24 px (plus the head crop) on the dark app and the light
 *   board, and 24/48 px again at 3x (a phone's real pixels);
 * - film-<id>.html: every motion as 10 frames, sampled from the same data the app and the CSS play;
 * - gimmicks-<id>.html (avatars with gimmicks): every gimmick anim as 10 frames over one run, on the face that
 *   triggers it, sampled with sampleGimmick (what the app plays).
 * With --shoot it screenshots each page with headless Chrome to a .png next to it: open the PNGs and look.
 * --fixtures adds the demo characters of src/testing/fixtures.ts (one per rig and gimmick option).
 *
 * --file <module> draws a character that is not in the catalog yet: every AvatarDef the module exports (a
 * def, a list of defs, or a series character's looks, e.g. a PirateCharacter: house, then invested). Without
 * ids, all of them; with ids, the ids are looked up in the file first, then in the catalog, so a new character
 * can be drawn beside a finished one. Repeatable. A relative path is taken from the folder npm was run in
 * (INIT_CWD), else from packages/avatars:
 *
 *   npm run sheet -w @sudoku-fight/avatars -- --file packages/avatars/src/catalog/pirates/two.ts --shoot
 *
 * --lineup adds lineup.html: every chosen avatar in a row at the app's sizes (96 to 24 px, and the 48 and 22 px
 * head crop), neutral, on the dark app and the light board, to compare a series side by side:
 *
 *   … -- --file <two.ts> pirates-2-invested pirates-1-invested pirates-7-invested --lineup --shoot
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  AVATARS,
  type AvatarDef,
  type Expression,
  EXPRESSIONS,
  faceChanges,
  gimmickAnims,
  MOTION_IDS,
  MOTIONS,
  type MotionId,
  motionOrigin,
  PIRATE_LOOKS,
  poseMatrix,
  renderAvatar,
  resolveMotion,
  sampleGimmick,
  sampleTrack,
  TARGET_CLASSES,
} from '../src';
import { FIXTURES } from '../src/testing/fixtures';

const ids: string[] = [];
const files: string[] = [];
let OUT = join(tmpdir(), 'sfa-sheets');
let shoot = false;
let fixtures = false;
let lineup = false;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const a = args[i] ?? '';
  if (a === '--out') OUT = resolve(args[++i] ?? '.');
  else if (a === '--shoot') shoot = true;
  else if (a === '--fixtures') fixtures = true;
  else if (a === '--lineup') lineup = true;
  else if (a === '--file') files.push(args[++i] ?? '');
  else ids.push(a);
}

const GROUNDS = { app: '#0f1218', board: '#f7f8fa' };
const page = (body: string, bg: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:12px;background:${bg};` +
  `font:12px system-ui,sans-serif;color:#9aa3b5}.row{display:flex;gap:10px;align-items:center;margin-bottom:10px}` +
  `.cell{text-align:center}.label{width:70px;flex:none}</style></head><body>${body}</body></html>`;

function row(
  def: AvatarDef,
  size: number,
  crop: 'tile' | 'head',
  tag: string,
  captions: boolean,
  note = '',
): string {
  const cells = EXPRESSIONS.map(
    (e) =>
      `<div class="cell">${renderAvatar(def, { expression: e, size, crop, idPrefix: `${tag}-${e}` })}` +
      `${captions ? `<div>${e}</div>` : ''}</div>`,
  ).join('');
  return `<div class="row"><div class="label">${size}${crop === 'head' ? ' head' : ''}${note}</div>${cells}</div>`;
}

function sheet(def: AvatarDef): string {
  let body = '';
  for (const [name, bg] of Object.entries(GROUNDS)) {
    body += `<div style="background:${bg};padding:10px;margin:-2px -2px 10px">`;
    body += row(def, 160, 'tile', `${name}-160`, true);
    body += row(def, 48, 'tile', `${name}-48`, false);
    body += row(def, 24, 'tile', `${name}-24`, false);
    if (def.headBox) {
      body += row(def, 48, 'head', `${name}-h48`, false);
      body += row(def, 24, 'head', `${name}-h24`, false);
    }
    body += '</div>';
  }
  // A phone draws 24 pt with 3 px per point: the same sizes, zoomed 3x, crisp.
  body += `<div style="zoom:3">`;
  body += row(def, 24, 'tile', 'x3-24', false, ' ×3');
  if (def.headBox) body += row(def, 24, 'head', 'x3-h24', false, ' ×3');
  body += '</div>';
  return page(body, '#0f1218');
}

const matrix = (pose: Parameters<typeof poseMatrix>[0], origin: { x: number; y: number }) =>
  `transform="matrix(${poseMatrix(pose, origin)
    .map((v) => v.toFixed(3))
    .join(' ')})"`;

function film(def: AvatarDef): string {
  const frames = 10;
  let body = '';
  for (const id of MOTION_IDS) {
    const m = resolveMotion(def, id);
    body += `<div class="row"><div class="label">${id}${m.id !== id ? ` → ${m.id}` : ''}</div>`;
    for (let i = 0; i < frames; i++) {
      const t = i / (frames - 1);
      let face: Expression | 'base' = 'neutral';
      for (const c of faceChanges(m)) if (c.atMs <= t * m.durationMs) face = c.expression;
      let svg = renderAvatar(def, {
        expression: face === 'base' ? 'neutral' : face,
        size: 110,
        idPrefix: `${id}-${i}`,
      });
      for (const tr of m.tracks) {
        const pose = sampleTrack(tr, t, m.ease);
        if (tr.target === 'eyes')
          // every eye around its own centre (rig.ts drawEyes puts it on the eye's group)
          svg = svg.replace(
            /<g class="sfa-eye" style="--sfa-eyes:([\d.]+)px ([\d.]+)px">/g,
            (g: string, x: string, y: string) =>
              g.replace(
                '<g ',
                `<g ${matrix(pose, tr.origin === 'eyes' ? { x: +x, y: +y } : motionOrigin(def, tr.origin))} `,
              ),
          );
        else
          // a face track moves the extras too (render.ts draws them in their own group)
          for (const c of TARGET_CLASSES[tr.target])
            svg = svg.replace(`class="${c}"`, `class="${c}" ${matrix(pose, motionOrigin(def, tr.origin))}`);
      }
      body += svg;
    }
    body += '</div>';
  }
  return page(body, '#0f1218');
}

/** The face a gimmick anim shows on: its first expression trigger, else its motion's face, else neutral. */
function faceFor(trigger: readonly string[]): Expression {
  for (const t of trigger) if ((EXPRESSIONS as readonly string[]).includes(t)) return t as Expression;
  for (const t of trigger) {
    const m = (MOTION_IDS as readonly string[]).includes(t) ? MOTIONS[t as MotionId] : undefined;
    if (m?.expression) return m.expression;
  }
  return 'neutral';
}

function gimmickFilm(def: AvatarDef): string {
  const frames = 10;
  let body = '';
  for (const g of def.gimmicks ?? [])
    gimmickAnims(g).forEach((anim, i) => {
      const face = faceFor(anim.trigger);
      body +=
        `<div class="row"><div class="label">${g.id}${gimmickAnims(g).length > 1 ? ` #${i}` : ''}<br>` +
        `${anim.trigger.join(', ')}${anim.loop ? ' ↻' : ''}</div>`;
      for (let k = 0; k < frames; k++) {
        const p = sampleGimmick(anim, k / (frames - 1));
        const svg = renderAvatar(def, {
          expression: face,
          size: 110,
          idPrefix: `g-${g.id}-${i}-${k}`,
        }).replace(
          new RegExp(`<g class="sfa-gimmick sfa-g-${g.id}"(?: opacity="0")?>`),
          `<g class="sfa-gimmick sfa-g-${g.id}" ${matrix(p, anim.origin)} opacity="${p.opacity.toFixed(3)}">`,
        );
        body += svg;
      }
      body += '</div>';
    });
  return page(body, '#0f1218');
}

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((p) => existsSync(p));

function screenshot(html: string, png: string, width: number, height: number): void {
  if (!CHROME) throw new Error('Chrome not found: open the HTML files in a browser instead.');
  execFileSync(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      `--window-size=${width},${height}`,
      `--screenshot=${png}`,
      pathToFileURL(html).href,
    ],
    { stdio: 'ignore' },
  );
}

/** The sizes the app draws an avatar at (a profile, Home, a duel's card, an in-game card, a list) and the cell. */
const LINEUP_TILE = [96, 64, 48, 36, 24] as const;
const LINEUP_HEAD = [48, 22] as const;

function lineupPage(defs: readonly AvatarDef[]): string {
  let body = '';
  for (const [name, bg] of Object.entries(GROUNDS)) {
    body += `<div style="background:${bg};padding:10px;margin:-2px -2px 10px">`;
    for (const def of defs) {
      const cells = [
        ...LINEUP_TILE.map((size) => ({ size, crop: 'tile' as const })),
        ...LINEUP_HEAD.map((size) => ({ size, crop: 'head' as const })),
      ]
        .filter((c) => c.crop === 'tile' || def.headBox)
        .map(
          (c) =>
            `<div class="cell">${renderAvatar(def, { size: c.size, crop: c.crop, idPrefix: `l-${name}-${def.id}-${c.crop}${c.size}` })}</div>`,
        )
        .join('');
      body += `<div class="row"><div class="label" style="width:150px">${def.id}</div>${cells}</div>`;
    }
    body += '</div>';
  }
  return page(body, '#0f1218');
}

// ---------------------------------------------------------------------------------------------------------
// --file: the AvatarDefs a module exports

const isDef = (v: unknown): v is AvatarDef => {
  const d = v as Partial<AvatarDef> | null;
  return (
    typeof d === 'object' &&
    d !== null &&
    typeof d.id === 'string' &&
    typeof d.layers?.back === 'string' &&
    typeof d.face === 'object'
  );
};

/** The defs in an exported value: a def, a list (of defs or characters), or a series character's looks. */
function defsIn(v: unknown): AvatarDef[] {
  if (isDef(v)) return [v];
  if (Array.isArray(v)) return v.flatMap(defsIn);
  const c = v as { digit?: unknown; looks?: Record<string, unknown> } | null;
  const looks = typeof c === 'object' && c !== null && typeof c.digit === 'number' ? c.looks : undefined;
  if (typeof looks !== 'object' || looks === null) return [];
  return PIRATE_LOOKS.flatMap((l) => {
    const d = looks[l];
    return isDef(d) ? [d] : [];
  });
}

function defsOfModule(mod: Record<string, unknown>): AvatarDef[] {
  const out: AvatarDef[] = [];
  for (const [key, value] of Object.entries(mod)) {
    const found = defsIn(value);
    if (found.length) out.push(...found);
    // a CommonJS module imported from here: its named exports sit on `default`
    else if (key === 'default' && typeof value === 'object' && value !== null)
      out.push(...defsOfModule(value as Record<string, unknown>));
  }
  return out;
}

/** Each id once, the first one found winning. */
const uniqueById = (defs: readonly AvatarDef[]): AvatarDef[] =>
  defs.filter((d, i) => defs.findIndex((e) => e.id === d.id) === i);

async function loadFile(file: string): Promise<AvatarDef[]> {
  const candidates = [resolve(process.env.INIT_CWD ?? process.cwd(), file), resolve(process.cwd(), file)];
  const path = candidates.find((p) => existsSync(p));
  if (!file || !path) throw new Error(`--file: no such module: ${file || '(missing path)'}`);
  const mod = (await import(pathToFileURL(path).href)) as Record<string, unknown>;
  const defs = uniqueById(defsOfModule(mod));
  if (!defs.length) throw new Error(`--file ${file}: it exports no AvatarDef (nor a character with looks).`);
  return defs;
}

async function main(): Promise<void> {
  const fileDefs = uniqueById((await Promise.all(files.map(loadFile))).flat());
  const catalog = fixtures ? [...AVATARS, ...FIXTURES] : AVATARS;
  // the file's defs first: a character being drawn wins over an older copy of it in the catalog
  const pool = uniqueById([...fileDefs, ...catalog]);
  const chosen = ids.length
    ? ids.flatMap((id) => pool.filter((a) => a.id === id))
    : files.length
      ? fileDefs
      : fixtures
        ? FIXTURES
        : AVATARS;
  const unknown = ids.filter((id) => !pool.some((a) => a.id === id));
  if (unknown.length) console.warn(`Unknown avatar ids: ${unknown.join(', ')}`);
  if (files.length)
    console.log(`From ${files.join(', ')}: ${fileDefs.map((d) => d.id).join(', ')}\nInto ${OUT}`);
  mkdirSync(OUT, { recursive: true });
  const write = (name: string, markup: string, w: number, h: number) => {
    const html = join(OUT, `${name}.html`);
    writeFileSync(html, markup);
    if (shoot) {
      const png = join(OUT, `${name}.png`);
      screenshot(html, png, w, h);
      console.log(png);
    } else console.log(html);
  };
  for (const def of chosen) {
    write(`sheet-${def.id}`, sheet(def), 140 + EXPRESSIONS.length * 172, def.headBox ? 1560 : 1300);
    write(`film-${def.id}`, film(def), 1240, 1100);
    const anims = (def.gimmicks ?? []).reduce((n, g) => n + gimmickAnims(g).length, 0);
    if (anims) write(`gimmicks-${def.id}`, gimmickFilm(def), 1240, 40 + anims * 124);
  }
  if (lineup && chosen.length) write('lineup', lineupPage(chosen), 1000, 64 + 2 * chosen.length * 116);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
