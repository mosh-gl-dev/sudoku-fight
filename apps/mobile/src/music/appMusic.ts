import type { Music } from '../services/music';

/**
 * The app's music service (services/music.ts), required on first use: the start (app/_layout.tsx) does not load
 * expo-audio for it, and the music under the Splash is silence anyway. Null should it not load (music is
 * optional). The director (MusicDirector.tsx) asks it for each scene.
 */
let loaded: Music | null = null;

/** The service, required now if it was not yet (null should it not load). */
export function appMusic(): Music | null {
  try {
    /* eslint-disable @typescript-eslint/no-require-imports -- lazy on purpose: not part of the start */
    loaded ??= (require('../services/music') as typeof import('../services/music')).music;
    /* eslint-enable @typescript-eslint/no-require-imports */
    return loaded;
  } catch (error) {
    if (__DEV__) console.warn('[music]', error);
    return null;
  }
}

/** The service if it was required already, else null (nothing has played). */
export const loadedMusic = (): Music | null => loaded;

/**
 * Silence, without the director: the root layout shows "צריך לעדכן את האפליקציה" in place of the whole app, the
 * director with it, and a track playing would play on under it (the director lets the service be on unmount: a
 * recreated activity's root asks for the same track, which plays on).
 */
export function silenceMusic(): void {
  try {
    loaded?.play(null);
  } catch (error) {
    if (__DEV__) console.warn('[music]', error);
  }
}
