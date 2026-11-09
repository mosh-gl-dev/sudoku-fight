import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * The patch-package patch to react-native-reanimated (patches/react-native-reanimated+<version>.patch, docs/PERF.md,
 * "the Reanimated patch"). Two Android fixes, both in Kotlin, applied by the root `postinstall` on every install
 * (local, CI and EAS):
 * 1. NodesManager.onEventDispatch, on the UI thread: return before handling and flushing an event no worklet waits
 *    for (react-native-svg's topSvgLayout per shape, react-native-screens' transition progress). Before it, every
 *    such event re-applied the props of every recently animated view (B14, B32, the back arrow, ~230 failures per
 *    game move, the ANR in /dev/pirates).
 * 2. NativeProxy.synchronouslyUpdateUIProps: a failure is logged without its stack and at most 5 lines a second,
 *    plus one line with the count of the rest (the 22,253 stacks of k1 variant (a) were an ANR).
 * An upgrade of Reanimated or a lost patch would bring both back without a sound: this fails first.
 */

const ROOT = join(__dirname, '..', '..', '..', '..');
const MOBILE = join(ROOT, 'apps', 'mobile');
const PACKAGE = 'react-native-reanimated';
const KOTLIN = join('android', 'src', 'main', 'java', 'com', 'swmansion', 'reanimated');

const read = (path: string): string => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const json = <T>(path: string): T => JSON.parse(read(path)) as T;

type Manifest = {
  version?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

/** The Reanimated the app is built with: apps/mobile/node_modules first, then the root's (hoisted). */
const installedDir = dirname(require.resolve(`${PACKAGE}/package.json`, { paths: [MOBILE] }));
const installedVersion = json<Manifest>(join(installedDir, 'package.json')).version!;
const PATCH = join(ROOT, 'patches', `${PACKAGE}+${installedVersion}.patch`);

const patchText = (): string => read(PATCH);
const nodesManager = (): string => read(join(installedDir, KOTLIN, 'NodesManager.kt'));
const nativeProxy = (): string => read(join(installedDir, KOTLIN, 'NativeProxy.kt'));

/** A Kotlin function's text: from its `fun` line to the next line that closes at the same indent. */
function kotlinFunction(source: string, signature: string): string {
  const start = source.indexOf(signature);
  if (start < 0) throw new Error(`not found: ${signature}`);
  const lineStart = source.lastIndexOf('\n', start) + 1;
  const indent = /^\s*/.exec(source.slice(lineStart))![0];
  const end = source.indexOf(`\n${indent}}\n`, start);
  return source.slice(start, end < 0 ? undefined : end);
}

/** Each hunk of a unified diff, per file: the text after the change (context lines and added lines). */
function hunksAfter(diff: string): { file: string; after: string }[] {
  const hunks: { file: string; after: string }[] = [];
  let file = '';
  let lines: string[] | null = null;
  const flush = () => {
    if (lines && lines.length > 0) hunks.push({ file, after: lines.join('\n') });
    lines = null;
  };
  for (const line of diff.split('\n')) {
    if (line.startsWith('diff --git ')) {
      flush();
      file = line.split(' b/')[1]!.replace(`node_modules/${PACKAGE}/`, '');
    } else if (line.startsWith('@@')) {
      flush();
      lines = [];
    } else if (lines && (line.startsWith(' ') || line.startsWith('+'))) lines.push(line.slice(1));
    else if (lines && line === '') lines.push('');
  }
  flush();
  return hunks.map((hunk) => ({ ...hunk, after: hunk.after.replace(/\n+$/, '') }));
}

describe('the Reanimated patch (patch-package)', () => {
  it('is applied on every install: the root postinstall runs patch-package', () => {
    const root = json<Manifest>(join(ROOT, 'package.json'));
    expect(root.scripts?.postinstall).toBe('patch-package');
    expect(root.devDependencies?.['patch-package']).toBeDefined();
  });

  it('is made for the Reanimated the app pins and the one installed', () => {
    const app = json<Manifest>(join(MOBILE, 'package.json'));
    // An exact pin: a caret would let an install take a version the patch was not made for.
    expect(app.dependencies?.[PACKAGE]).toBe(installedVersion);
    expect(existsSync(PATCH)).toBe(true);
  });

  it('touches only the two Kotlin files, nothing that needs CMake or a JS change', () => {
    const files = hunksAfter(patchText()).map((hunk) => hunk.file);
    expect([...new Set(files)].sort()).toEqual([
      `${KOTLIN.replace(/\\/g, '/')}/NativeProxy.kt`,
      `${KOTLIN.replace(/\\/g, '/')}/NodesManager.kt`,
    ]);
  });

  it('is applied in node_modules: every hunk of the patch is there as it is after the change', () => {
    const hunks = hunksAfter(patchText());
    expect(hunks.length).toBeGreaterThanOrEqual(4);
    for (const { file, after } of hunks) expect(read(join(installedDir, file))).toContain(after);
  });

  it('still finds the native API it calls, with the same signature', () => {
    // NativeProxy.isAnyHandlerWaitingForEvent(eventName, emitterReactTag), implemented in C++
    // (UIEventHandlerRegistry). The branch for events from other threads already calls it.
    expect(nativeProxy()).toMatch(
      /external fun isAnyHandlerWaitingForEvent\(\s*eventName: String,\s*emitterReactTag: Int,\s*\): Boolean/,
    );
    // EventHandler.receiveEvent resolves the name with the same resolver: the name checked is the name handled.
    const handler = read(join(installedDir, KOTLIN, 'nativeProxy', 'EventHandler.kt'));
    expect(handler).toContain('mCustomEventNamesResolver!!.resolveCustomEventName(eventName) ?: eventName');
  });

  it('onEventDispatch: on the UI thread, an event no worklet waits for returns before handling and flushing', () => {
    const fn = kotlinFunction(nodesManager(), 'override fun onEventDispatch(event: Event<*>)');
    const uiBranch = fn.slice(fn.indexOf('if (UiThreadUtil.isOnUiThread())'), fn.indexOf('} else {'));
    const earlyOut = uiBranch.indexOf(
      'if (mNativeProxy?.isAnyHandlerWaitingForEvent(eventName, event.viewTag) != true) return',
    );
    expect(uiBranch).toContain(
      'val eventName = mCustomEventNamesResolver.resolveCustomEventName(event.eventName) ?: return',
    );
    expect(earlyOut).toBeGreaterThan(0);
    expect(earlyOut).toBeLessThan(uiBranch.indexOf('handleEvent(event)'));
    expect(earlyOut).toBeLessThan(uiBranch.indexOf('performOperationsRespectingDrawPass()'));
    // The branch for other threads keeps its own check (it queues only events a worklet waits for).
    expect(fn.slice(fn.indexOf('} else {'))).toContain('isAnyHandlerWaitingForEvent(eventName, viewTag)');
  });

  it('synchronouslyUpdateUIProps: a failure is logged in one line, without its stack, and rate-limited', () => {
    const source = nativeProxy();
    const update = kotlinFunction(source, 'fun synchronouslyUpdateUIProps(');
    expect(update).toContain('logSyncUpdateFailure(viewTag, e)');
    expect(update).not.toContain('Log.');

    const log = kotlinFunction(source, 'private fun logSyncUpdateFailure(');
    const count = kotlinFunction(source, 'private fun logSyncUpdateNotLogged()');
    // QA greps logcat for this text: the first failures of every second still say it, and so does the count line.
    expect(log).toContain('"synchronouslyUpdateUIProps failed for tag $viewTag: ');
    expect(count).toContain('"synchronouslyUpdateUIProps failed $syncUpdateNotLogged more times');
    // No Throwable handed to Log (that prints the stack), and no stack printed any other way.
    for (const body of [log, count]) {
      expect(body).not.toMatch(/Log\.\w\([^)]*,\s*(e|cause)\s*\)/);
      expect(body).not.toMatch(/printStackTrace|stackTraceToString|getStackTraceString/);
    }
    expect(source).not.toMatch(
      /Log\.w\("Reanimated", "synchronouslyUpdateUIProps failed for tag \$viewTag", e\)/,
    );
    // At most LIMIT lines per window, then one line with the count when the window ends.
    expect(log).toMatch(/if \(syncUpdateLogged < SYNC_UPDATE_LOG_LIMIT\)/);
    expect(log).toContain('UiThreadUtil.runOnUiThread(Runnable { logSyncUpdateNotLogged() }, delay)');
    const limit = Number(/private const val SYNC_UPDATE_LOG_LIMIT = (\d+)\n/.exec(source)?.[1]);
    const windowMs = Number(/private const val SYNC_UPDATE_LOG_WINDOW_MS = (\d+)L\n/.exec(source)?.[1]);
    expect(limit).toBeGreaterThanOrEqual(1);
    expect(limit).toBeLessThanOrEqual(20);
    expect(windowMs).toBe(1000);
  });
});
