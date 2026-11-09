/**
 * @jest-environment node
 */
import type * as Babel from '@babel/core';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

/**
 * Every worklet as the release bundle builds it (QA loop 8, interference-new-ink-look, critical): the ink hit
 * killed the receiver's JS runtime with "ReferenceError: Property 'INK' doesn't exist at inkPose_inkModelTs1". The
 * worklets plugin moves what a worklet reads from its module (INK) into a closure, and the worklet reads that
 * closure in its BODY (`const {INK} = this.__closure`). A default parameter (`splatMs = INK.splatMs`) runs before
 * the body, so on the UI runtime INK is not there yet. Under Jest worklets run as plain JS, where INK is the
 * module's own constant: no test of the effect could see it.
 *
 * So this runs Expo's Babel preset (with the worklets plugin, as Metro does for the APK) over every file with a
 * worklet, takes each worklet's code as the UI runtime gets it, and checks:
 * 1. no parameter of a worklet (a default value, a destructuring default) reads its closure;
 * 2. a function of ours that a worklet calls through its closure is a worklet itself (a plain JS function can't
 *    run on the UI runtime).
 */

const ROOT = join(__dirname, '..', '..', '..', '..');
const MOBILE = join(ROOT, 'apps', 'mobile');
const babel = jest.requireActual<typeof Babel>('@babel/core');
const EXPO_PRESET = require.resolve('babel-preset-expo', { paths: [MOBILE] });

type Node = Babel.types.Node;
type Fn = Babel.types.Function;

const posix = (path: string): string => relative(ROOT, path).split(sep).join('/');

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory())
      return name === '__tests__' || name === 'node_modules' ? [] : sources(path);
    return /\.tsx?$/.test(name) && !name.endsWith('.d.ts') ? [path] : [];
  });
}

/** The files that may hold a worklet: a 'worklet' directive, or a Reanimated / Skia hook that makes one. */
const FILES = [
  ...sources(join(MOBILE, 'src')),
  ...sources(join(MOBILE, 'app')),
  ...sources(join(ROOT, 'packages', 'avatars', 'src')),
].filter((file) =>
  /'worklet'|react-native-reanimated|@shopify\/react-native-skia/.test(readFileSync(file, 'utf8')),
);

const parse = (code: string, typescript: boolean): Babel.types.File =>
  babel.parseSync(code, {
    babelrc: false,
    configFile: false,
    sourceType: 'module',
    parserOpts: { plugins: typescript ? ['typescript', 'jsx'] : ['jsx'] },
  }) as Babel.types.File;

/** One worklet as the UI runtime gets it. */
interface Worklet {
  file: string;
  name: string;
  /** What it reads from outside itself (the plugin's `this.__closure`). */
  closure: Set<string>;
  /** Closure names read by its parameters. */
  paramReads: string[];
  /** Closure names it calls as functions. */
  calls: Set<string>;
}

function workletsOf(file: string): Worklet[] {
  const out = babel.transformSync(readFileSync(file, 'utf8'), {
    filename: file,
    cwd: MOBILE,
    babelrc: false,
    configFile: false,
    presets: [EXPO_PRESET],
    caller: { name: 'metro', bundler: 'metro', platform: 'android', isDev: false, supportsStaticESM: true },
  } as Babel.TransformOptions);
  const codes: string[] = [];
  babel.traverse(parse(out!.code!, false), {
    VariableDeclarator(path) {
      const { id, init } = path.node;
      if (id.type !== 'Identifier' || !/^_worklet_\d+_init_data$/.test(id.name)) return;
      if (init?.type !== 'ObjectExpression') return;
      for (const prop of init.properties) {
        if (
          prop.type === 'ObjectProperty' &&
          prop.key.type === 'Identifier' &&
          prop.key.name === 'code' &&
          prop.value.type === 'StringLiteral'
        )
          codes.push(prop.value.value);
      }
    },
  });
  return codes.map((code) => {
    const ast = parse(code, false);
    const fn = ast.program.body[0] as Fn & { id?: { name: string } | null };
    const closure = new Set<string>();
    const calls = new Set<string>();
    const paramReads: string[] = [];
    babel.traverse(ast, {
      VariableDeclarator(path) {
        const { id, init } = path.node;
        if (
          init?.type === 'MemberExpression' &&
          init.property.type === 'Identifier' &&
          init.property.name === '__closure' &&
          id.type === 'ObjectPattern'
        )
          for (const p of id.properties)
            if (p.type === 'ObjectProperty' && p.key.type === 'Identifier') closure.add(p.key.name);
      },
      CallExpression(path) {
        if (path.node.callee.type === 'Identifier') calls.add(path.node.callee.name);
      },
    });
    babel.traverse(ast, {
      Identifier(path) {
        if (!path.isReferencedIdentifier()) return;
        if (path.findParent((p) => fn.params.includes(p.node as never))) paramReads.push(path.node.name);
      },
    });
    return {
      file: posix(file),
      name: fn.id?.name ?? '?',
      closure,
      paramReads: paramReads.filter((n) => closure.has(n)),
      calls: new Set([...calls].filter((n) => closure.has(n))),
    };
  });
}

/** What a module-level name of ours is: a function (worklet or not), a value, or something from a package. */
type Binding =
  { kind: 'fn'; worklet: boolean } | { kind: 'value' } | { kind: 'package' } | { kind: 'missing' };

const isWorkletFn = (node: Node | null | undefined): boolean =>
  !!node &&
  (node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression') &&
  node.body.type === 'BlockStatement' &&
  node.body.directives.some((d) => d.value.value === 'worklet');

function resolveModule(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith('.')) base = resolve(dirname(from), spec);
  else if (spec.startsWith('@sudoku-fight/'))
    base = join(ROOT, 'packages', spec.split('/')[1]!, 'src', 'index');
  else return null;
  return (
    [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')].find((c) =>
      existsSync(c),
    ) ?? null
  );
}

interface ModuleIndex {
  locals: Map<string, Binding | { kind: 'import'; source: string; imported: string }>;
  reexports: Map<string, { source: string; imported: string }>;
  stars: string[];
}
const indexes = new Map<string, ModuleIndex>();

function indexOf(file: string): ModuleIndex {
  const known = indexes.get(file);
  if (known) return known;
  const index: ModuleIndex = { locals: new Map(), reexports: new Map(), stars: [] };
  for (let st of parse(readFileSync(file, 'utf8'), true).program.body as Node[]) {
    if (st.type === 'ImportDeclaration') {
      for (const s of st.specifiers) {
        const imported =
          s.type === 'ImportSpecifier'
            ? s.imported.type === 'Identifier'
              ? s.imported.name
              : s.imported.value
            : 'default';
        index.locals.set(s.local.name, { kind: 'import', source: st.source.value, imported });
      }
      continue;
    }
    if (st.type === 'ExportNamedDeclaration' && st.source) {
      for (const s of st.specifiers)
        if (s.type === 'ExportSpecifier') {
          const exported = s.exported.type === 'Identifier' ? s.exported.name : s.exported.value;
          index.reexports.set(exported, { source: st.source.value, imported: s.local.name });
        }
      continue;
    }
    if (st.type === 'ExportAllDeclaration') {
      index.stars.push(st.source.value);
      continue;
    }
    if (st.type === 'ExportNamedDeclaration' && st.declaration) st = st.declaration;
    if (st.type === 'FunctionDeclaration' && st.id)
      index.locals.set(st.id.name, { kind: 'fn', worklet: isWorkletFn(st) });
    if (st.type === 'VariableDeclaration')
      for (const d of st.declarations) {
        if (d.id.type !== 'Identifier') continue;
        const init = d.init;
        const fn = init?.type === 'FunctionExpression' || init?.type === 'ArrowFunctionExpression';
        index.locals.set(d.id.name, fn ? { kind: 'fn', worklet: isWorkletFn(init) } : { kind: 'value' });
      }
  }
  indexes.set(file, index);
  return index;
}

function bindingOf(file: string, name: string, exported = false, depth = 0): Binding {
  if (depth > 8) return { kind: 'missing' };
  const index = indexOf(file);
  const via = exported ? (index.reexports.get(name) ?? null) : null;
  const local = via ? null : index.locals.get(name);
  const link = via ?? (local?.kind === 'import' ? local : null);
  if (link) {
    const target = resolveModule(file, link.source);
    return target ? bindingOf(target, link.imported, true, depth + 1) : { kind: 'package' };
  }
  if (local) return local as Binding;
  if (exported)
    for (const star of index.stars) {
      const target = resolveModule(file, star);
      if (!target) continue;
      const found = bindingOf(target, name, true, depth + 1);
      if (found.kind !== 'missing') return found;
    }
  return { kind: 'missing' };
}

const WORKLETS = FILES.flatMap(workletsOf);

describe('worklets as the release bundle builds them (QA loop 8: the ink hit’s crash)', () => {
  it('finds the app’s worklets, the ink blot’s pose among them', () => {
    expect(WORKLETS.length).toBeGreaterThan(150);
    expect(WORKLETS.map((w) => w.name)).toEqual(
      expect.arrayContaining(['inkPose_inkModelTs1', 'hitAlpha_hitClockTs1']),
    );
    // The ink layer's pose reads the blot's pose through its closure, and that resolves to inkModel's worklet.
    const ink = WORKLETS.find((w) => w.file.endsWith('interference/Ink.tsx') && w.calls.has('inkPose'));
    expect(ink).toBeDefined();
    expect(bindingOf(join(ROOT, ink!.file), 'inkPose')).toEqual({ kind: 'fn', worklet: true });
    // And a plain function is told apart (inkPlan builds the plan on the JS thread).
    expect(bindingOf(join(ROOT, ink!.file), 'inkPlan')).toEqual({ kind: 'fn', worklet: false });
  });

  it('no worklet parameter reads its closure (it is only there once the body runs)', () => {
    const bad = WORKLETS.filter((w) => w.paramReads.length > 0).map(
      (w) => `${w.file}: ${w.name} reads ${[...new Set(w.paramReads)].join(', ')} in its parameters`,
    );
    expect(bad).toEqual([]);
  });

  it('every function of ours a worklet calls is a worklet too', () => {
    const bad = WORKLETS.flatMap((w) =>
      [...w.calls].flatMap((name) => {
        const b = bindingOf(join(ROOT, w.file), name);
        return b.kind === 'fn' && !b.worklet ? [`${w.file}: ${w.name} calls ${name}, not a worklet`] : [];
      }),
    );
    expect(bad).toEqual([]);
  });
});
