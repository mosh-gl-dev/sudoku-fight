import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ExpoConfig } from 'expo/config';
import { XML } from 'expo/config-plugins';

import { appJsonFiles } from '../../scripts/lib/build-apk.mjs';

/**
 * plugins/withTextAdvanceWidths.js (QA 2026-11-03, Android 16: Arabic "سلسلة الفوز" drawn as "سلسلة", Thai
 * "แรงก์" as "แร"): React Native measures a Text by its glyphs' advances, and since Android 15 a TextView of an
 * app targeting API 35+ breaks lines by the glyphs' bounds, so a glyph reaching past its advance pushed the last
 * word onto a line the measured box had no room for. The plugin gives the app's theme
 * android:useBoundsForWidth=false: the TextViews break lines as React Native measured them. Its mod runs here on
 * styles.xml as prebuild generates it (Expo 57).
 */

/* eslint-disable @typescript-eslint/no-require-imports -- the plugin is CommonJS, run by Node at prebuild */
const plugin = require('../../plugins/withTextAdvanceWidths.js') as {
  (config: ExpoConfig): ExpoConfig;
  ITEM: string;
  TARGET_API: string;
  setAdvanceWidths: (styles: unknown) => StylesXml;
};
/* eslint-enable @typescript-eslint/no-require-imports */

const PLUGIN = './plugins/withTextAdvanceWidths.js';

interface StyleItem {
  $: { name: string; 'tools:targetApi'?: string };
  _: string;
}
interface StylesXml {
  resources: {
    $?: Record<string, string>;
    style: { $: { name: string; parent?: string }; item: StyleItem[] }[];
  };
}

/** res/values/styles.xml as `expo prebuild` writes it for this app (android/ is generated, not in git). */
const GENERATED = `<resources xmlns:tools="http://schemas.android.com/tools">
  <style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar">
    <item name="android:editTextBackground">@drawable/rn_edit_text_material</item>
    <item name="colorPrimary">@color/colorPrimary</item>
    <item name="android:statusBarColor">@android:color/transparent</item>
    <item name="android:navigationBarColor">@android:color/transparent</item>
    <item name="android:windowBackground">@color/activityBackground</item>
  </style>
  <style name="Theme.App.SplashScreen" parent="Theme.SplashScreen">
    <item name="windowSplashScreenBackground">@color/splashscreen_background</item>
    <item name="postSplashScreenTheme">@style/AppTheme</item>
  </style>
</resources>`;

const parsed = async () => (await XML.parseXMLAsync(GENERATED)) as unknown as StylesXml;
const theme = (styles: StylesXml, name: string) => styles.resources.style.find((s) => s.$.name === name)!;
const itemsOf = (styles: StylesXml, name: string) =>
  Object.fromEntries(theme(styles, name).item.map((i) => [i.$.name, i._]));

type StylesMod = (config: ExpoConfig & { modResults: unknown; modRequest: unknown }) => Promise<{
  modResults: StylesXml;
}>;

describe('the app theme breaks lines by advances, as React Native measures them', () => {
  it('app.json applies the plugin to every build, and `npm run apk` hashes it (a change regenerates android/)', () => {
    const appJson = readFileSync(join(__dirname, '..', '..', 'app.json'), 'utf8');
    const plugins = (JSON.parse(appJson) as { expo: ExpoConfig }).expo.plugins ?? [];
    expect(plugins.map((p) => (Array.isArray(p) ? p[0] : p))).toContain(PLUGIN);
    expect(appJsonFiles(appJson)).toContain(PLUGIN);
  });

  it('AppTheme gets android:useBoundsForWidth false, for API 35 and later; the rest is kept', async () => {
    expect(plugin.ITEM).toBe('android:useBoundsForWidth');
    const before = itemsOf(await parsed(), 'AppTheme');
    const styles = plugin.setAdvanceWidths(await parsed());
    expect(itemsOf(styles, 'AppTheme')).toEqual({ ...before, 'android:useBoundsForWidth': 'false' });
    const item = theme(styles, 'AppTheme').item.find((i) => i.$.name === plugin.ITEM)!;
    expect(item.$['tools:targetApi']).toBe('35');
    expect(theme(styles, 'AppTheme').$.parent).toBe('Theme.AppCompat.DayNight.NoActionBar');
    expect(itemsOf(styles, 'Theme.App.SplashScreen')).toEqual(
      itemsOf(await parsed(), 'Theme.App.SplashScreen'),
    );
    // The XML the build gets.
    const xml = XML.format(styles);
    expect(xml).toContain('<item name="android:useBoundsForWidth" tools:targetApi="35">false</item>');
  });

  it('once: a second prebuild does not add it again', async () => {
    const twice = plugin.setAdvanceWidths(plugin.setAdvanceWidths(await parsed()));
    expect(theme(twice, 'AppTheme').item.filter((i) => i.$.name === plugin.ITEM)).toHaveLength(1);
  });

  it("registers an Android styles mod (iOS untouched) that writes it into prebuild's styles.xml", async () => {
    const config = plugin({ name: 'Sudoku Fight', slug: 'sudoku-fight' });
    const mods = (config as ExpoConfig & { mods: Record<string, Record<string, StylesMod>> }).mods;
    expect(Object.keys(mods)).toEqual(['android']);
    const out = await mods.android!.styles!({
      ...config,
      modResults: await parsed(),
      modRequest: { platform: 'android', modName: 'styles', introspect: false },
    });
    expect(itemsOf(out.modResults, 'AppTheme')['android:useBoundsForWidth']).toBe('false');
  });
});
