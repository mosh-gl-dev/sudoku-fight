import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  APP_WINDOW_MODULE,
  type AppWindowNative,
  createRecentsPicture,
  hideRecentsPicture,
  windowModule,
} from '../recentsPicture';

/**
 * services/recentsPicture.ts (QA levels-freeze-background, D65): no Recents picture of the app while a stage
 * holds it (Android 13+, our native module), counted holds, and a no-op that says so wherever it can't be.
 */

/** A native module like modules/app-window's on Android 13+: whether Recents may keep a picture. */
function fakeNative(supported = true) {
  const state = { enabled: true };
  const native = {
    isRecentsScreenshotToggleSupported: jest.fn(() => supported),
    setRecentsScreenshotEnabled: jest.fn((enabled: boolean) => {
      state.enabled = enabled;
      return true;
    }),
  } satisfies AppWindowNative;
  return { native, state };
}

describe('without the native module (Jest, iOS, a build from before it)', () => {
  it('is a hold that hides nothing and throws nothing', () => {
    const hold = hideRecentsPicture();
    expect(hold.hidden).toBe(false);
    expect(() => hold.release()).not.toThrow();
  });

  it('only Android asks for the module', () => {
    const lookup = jest.fn(() => fakeNative().native);
    expect(windowModule('ios', lookup)).toBeNull();
    expect(lookup).not.toHaveBeenCalled();
    expect(windowModule('android', lookup)).not.toBeNull();
    expect(lookup).toHaveBeenCalledWith(APP_WINDOW_MODULE);
  });
});

describe('with the module (Android 13+)', () => {
  it('hides the picture while held, and gives it back when the last hold goes (each release once)', () => {
    const { native, state } = fakeNative();
    const hide = createRecentsPicture(() => native);
    const a = hide();
    expect(a.hidden).toBe(true);
    expect(state.enabled).toBe(false);
    const b = hide();
    expect(b.hidden).toBe(true);
    a.release();
    a.release();
    expect(state.enabled).toBe(false);
    b.release();
    expect(state.enabled).toBe(true);
    expect(native.setRecentsScreenshotEnabled.mock.calls).toEqual([[false], [true]]);
  });

  it('below Android 13: nothing is called, and the hold says it hides nothing', () => {
    const { native } = fakeNative(false);
    const hold = createRecentsPicture(() => native)();
    expect(hold.hidden).toBe(false);
    hold.release();
    expect(native.setRecentsScreenshotEnabled).not.toHaveBeenCalled();
  });

  it('a native call that fails (no activity, an exception) hides nothing, and throws nothing', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const { native } = fakeNative();
      native.setRecentsScreenshotEnabled.mockImplementation(() => {
        throw new Error('no activity');
      });
      const hold = createRecentsPicture(() => native)();
      expect(hold.hidden).toBe(false);
      expect(() => hold.release()).not.toThrow();
      // Released with nothing hidden: nothing to give back.
      expect(native.setRecentsScreenshotEnabled).toHaveBeenCalledTimes(1);
      const noActivity = fakeNative().native;
      noActivity.setRecentsScreenshotEnabled.mockReturnValue(false);
      expect(createRecentsPicture(() => noActivity)().hidden).toBe(false);
      expect(
        createRecentsPicture(() => {
          throw new Error('no module');
        })().hidden,
      ).toBe(false);
    } finally {
      warn.mockRestore();
    }
  });
});

describe('the native module (modules/app-window)', () => {
  const MODULE = join(__dirname, '..', '..', '..', 'modules', 'app-window');
  const config = JSON.parse(readFileSync(join(MODULE, 'expo-module.config.json'), 'utf8')) as {
    platforms: string[];
    android: { modules: string[] };
  };
  const kotlinOf = () =>
    readFileSync(
      join(MODULE, 'android', 'src', 'main', 'java', ...config.android.modules[0]!.split('.')) + '.kt',
      'utf8',
    );

  it("is Android's only, and its class is where the config says (autolinked from apps/mobile/modules)", () => {
    expect(config.platforms).toEqual(['android']);
    expect(config.android.modules).toHaveLength(1);
    const source =
      join(MODULE, 'android', 'src', 'main', 'java', ...config.android.modules[0]!.split('.')) + '.kt';
    expect(existsSync(source)).toBe(true);
    expect(existsSync(join(MODULE, 'android', 'build.gradle'))).toBe(true);
    expect(existsSync(join(MODULE, 'android', 'src', 'main', 'AndroidManifest.xml'))).toBe(true);
  });

  it('answers to the name the JS asks for, with the functions it calls; Recents only, never FLAG_SECURE', () => {
    const kotlin = kotlinOf();
    expect(kotlin).toContain(`Name("${APP_WINDOW_MODULE}")`);
    const functions = [...kotlin.matchAll(/Function\("(\w+)"\)/g)].map((m) => m[1]);
    expect(functions.sort()).toEqual(
      (
        [
          'isRecentsScreenshotToggleSupported',
          'setRecentsScreenshotEnabled',
        ] satisfies (keyof AppWindowNative)[]
      ).sort(),
    );
    expect(kotlin).toContain('setRecentsScreenshotEnabled(enabled)');
    expect(kotlin).toContain('@RequiresApi(Build.VERSION_CODES.TIRAMISU)');
    expect(kotlin).toContain('runOnUiThread');
    expect(kotlin).not.toMatch(/addFlags|setFlags|LayoutParams.FLAG_SECURE/);
  });
});
