import Storage from 'expo-sqlite/kv-store';

import { useSettings } from '../settings';

/**
 * The settings are read and written synchronously (work plan stage 13): the language is there from the
 * first render, and a change is on disk before the app restarts for it. From 1.1.0 the language may be
 * "שפת המכשיר" ('system'), and where the choice came from is saved too (localization plan 0א, D102).
 */

const onDisk = () =>
  JSON.parse(Storage.getItemSync('settings') ?? 'null') as { state: object; version: number } | null;

describe('settings persistence', () => {
  it('starts on "שפת המכשיר" (D102), and writes a change at once', () => {
    expect(useSettings.getState()).toMatchObject({ language: 'system', languageSource: 'default' });
    useSettings.getState().setLanguage('en');
    useSettings.getState().setReduceMotion('on');
    expect(onDisk()).toEqual({
      state: {
        language: 'en',
        languageSource: 'app',
        appLocalesSeen: null,
        systemLocaleSeen: null,
        sound: true,
        haptics: true,
        reduceMotion: 'on',
      },
      version: 3,
    });
    useSettings.getState().setLanguage('he');
    expect(onDisk()?.state).toMatchObject({ language: 'he' });
    useSettings.getState().setLanguage('system', 'system');
    expect(onDisk()?.state).toMatchObject({ language: 'system', languageSource: 'system' });
  });

  it('reads the saved settings without waiting', () => {
    useSettings.setState({ language: 'he', sound: true });
    // Another run saved these (setState above wrote too: the store saves every change).
    Storage.setItemSync(
      'settings',
      JSON.stringify({
        state: { language: 'en', languageSource: 'app', sound: false, haptics: true, reduceMotion: 'on' },
        version: 3,
      }),
    );
    void useSettings.persist.rehydrate();
    // No await: already there.
    expect(useSettings.getState()).toMatchObject({ language: 'en', sound: false, reduceMotion: 'on' });
    expect(useSettings.persist.hasHydrated()).toBe(true);
  });

  it("a player's settings from before 1.1.0 keep their language, as their own choice (D102)", () => {
    Storage.setItemSync(
      'settings',
      JSON.stringify({
        state: { language: 'he', sound: false, haptics: true, reduceMotion: 'on' },
        version: 1,
      }),
    );
    void useSettings.persist.rehydrate();
    expect(useSettings.getState()).toMatchObject({
      language: 'he',
      languageSource: 'migrated',
      appLocalesSeen: null,
      systemLocaleSeen: null,
      sound: false,
      reduceMotion: 'on',
    });
    expect(onDisk()).toMatchObject({ state: { language: 'he', languageSource: 'migrated' }, version: 3 });
  });

  it('reduced motion starts off (Moshe, 31.10.2026), and an older record that held the old default takes it', () => {
    expect(useSettings.getInitialState().reduceMotion).toBe('off');
    const saved = { language: 'en', languageSource: 'app', appLocalesSeen: null, systemLocaleSeen: null };
    Storage.setItemSync(
      'settings',
      JSON.stringify({ state: { ...saved, sound: true, haptics: true, reduceMotion: 'system' }, version: 2 }),
    );
    void useSettings.persist.rehydrate();
    expect(useSettings.getState()).toMatchObject({
      language: 'en',
      languageSource: 'app',
      reduceMotion: 'off',
    });
    expect(onDisk()).toMatchObject({ state: { reduceMotion: 'off' }, version: 3 });
    // A choice the player made stays: 'on' from before, and 'system' chosen from now on.
    Storage.setItemSync(
      'settings',
      JSON.stringify({ state: { ...saved, sound: true, haptics: true, reduceMotion: 'on' }, version: 2 }),
    );
    void useSettings.persist.rehydrate();
    expect(useSettings.getState().reduceMotion).toBe('on');
    Storage.setItemSync(
      'settings',
      JSON.stringify({ state: { ...saved, sound: true, haptics: true, reduceMotion: 'system' }, version: 3 }),
    );
    void useSettings.persist.rehydrate();
    expect(useSettings.getState().reduceMotion).toBe('system');
  });
});
