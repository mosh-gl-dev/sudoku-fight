import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ExpoConfig } from 'expo/config';

import { appJsonFiles } from '../../scripts/lib/build-apk.mjs';

/**
 * plugins/withNightModeAtStart.js (QA "nav-bar-light-on-some-screens", APK 19): Android's navigation bar was light
 * grey on some screens and dark on others. React Native picks the bar's scrim once per activity, from the
 * activity's night mode when it is created, and expo-system-ui set the app's dark mode only after that (in an
 * activity listener that runs later): an activity created first in its process on a phone in light mode kept a
 * light bar, one recreated later (the QA's density changes) a dark one. The plugin sets the night mode in
 * MainApplication.onCreate, before any activity. Its mod runs here on MainApplication.kt as prebuild generates
 * it (Expo 57).
 */

/* eslint-disable @typescript-eslint/no-require-imports -- the plugin is CommonJS, run by Node at prebuild */
const plugin = require('../../plugins/withNightModeAtStart.js') as {
  (config: ExpoConfig): ExpoConfig;
  MARKER: string;
  nightModeLine: (style: unknown) => string | null;
  setNightModeAtStart: (source: string, style: unknown) => string;
};
/* eslint-enable @typescript-eslint/no-require-imports */

const PLUGIN = './plugins/withNightModeAtStart.js';
const APP_JSON = join(__dirname, '..', '..', 'app.json');

/** android/app/src/main/java/.../MainApplication.kt as `expo prebuild` writes it for this app (not in git). */
const GENERATED = `package com.mosheg.sudokufight

import android.app.Application
import android.content.res.Configuration

import com.facebook.react.ReactApplication
import expo.modules.ApplicationLifecycleDispatcher

class MainApplication : Application(), ReactApplication {

  override fun onCreate() {
    super.onCreate()
    DefaultNewArchitectureEntryPoint.releaseLevel = ReleaseLevel.STABLE
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
`;

const DARK =
  'androidx.appcompat.app.AppCompatDelegate.setDefaultNightMode(androidx.appcompat.app.AppCompatDelegate.MODE_NIGHT_YES)';

type MainApplicationMod = (
  config: ExpoConfig & { modResults: { contents: string; language: string }; modRequest: unknown },
) => Promise<{ modResults: { contents: string } }>;

describe('the app is dark from its start, so every activity gets the dark navigation bar', () => {
  it('app.json applies it to every build (the app is dark), and `npm run apk` hashes it', () => {
    const text = readFileSync(APP_JSON, 'utf8');
    const expo = (JSON.parse(text) as { expo: ExpoConfig }).expo;
    expect(expo.userInterfaceStyle).toBe('dark');
    expect((expo.plugins ?? []).map((p) => (Array.isArray(p) ? p[0] : p))).toContain(PLUGIN);
    expect(appJsonFiles(text)).toContain(PLUGIN);
  });

  it('MainApplication.onCreate sets the night mode right after super.onCreate(), before anything else', () => {
    const out = plugin.setNightModeAtStart(GENERATED, 'dark');
    const lines = out.split('\n').map((l) => l.trim());
    const at = lines.indexOf('super.onCreate()');
    expect(lines.slice(at + 1, at + 3)).toEqual([plugin.MARKER, DARK]);
    expect(out).toContain(`    ${DARK}\n`);
    // Only Application.onCreate: not onConfigurationChanged's super call.
    expect(out.split('setDefaultNightMode')).toHaveLength(2);
    // The rest as prebuild wrote it.
    expect(out.replace(`    ${plugin.MARKER}\n    ${DARK}\n`, '')).toBe(GENERATED);
  });

  it('once (a second prebuild adds nothing); light: MODE_NIGHT_NO; automatic or none: the system’s mode', () => {
    const once = plugin.setNightModeAtStart(GENERATED, 'dark');
    expect(plugin.setNightModeAtStart(once, 'dark')).toBe(once);
    expect(plugin.nightModeLine('light')).toContain('MODE_NIGHT_NO');
    expect(plugin.setNightModeAtStart(GENERATED, 'automatic')).toBe(GENERATED);
    expect(plugin.setNightModeAtStart(GENERATED, undefined)).toBe(GENERATED);
    expect(() => plugin.setNightModeAtStart('class MainApplication', 'dark')).toThrow(/super\.onCreate/);
  });

  it('registers an Android MainApplication mod that reads userInterfaceStyle (android’s first)', async () => {
    const run = async (config: ExpoConfig) => {
      const withPlugin = plugin(config);
      const mods = (withPlugin as ExpoConfig & { mods: Record<string, Record<string, MainApplicationMod>> })
        .mods;
      expect(Object.keys(mods)).toEqual(['android']);
      const out = await mods.android!.mainApplication!({
        ...withPlugin,
        modResults: { contents: GENERATED, language: 'kt' },
        modRequest: { platform: 'android', modName: 'mainApplication', introspect: false },
      });
      return out.modResults.contents;
    };
    expect(await run({ name: 'Sudoku Fight', slug: 'sudoku-fight', userInterfaceStyle: 'dark' })).toContain(
      DARK,
    );
    expect(
      await run({
        name: 'Sudoku Fight',
        slug: 'sudoku-fight',
        userInterfaceStyle: 'dark',
        android: { userInterfaceStyle: 'automatic' },
      }),
    ).toBe(GENERATED);
  });
});
