import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

/**
 * The app's picture in Android's Recents, while a stage runs (QA levels-freeze-background, D65): Android takes
 * that picture as the app leaves, before any JS answer can draw the freeze's cover, so a frozen stage's board
 * could be studied in Recents. Through our own native module (modules/app-window,
 * Activity.setRecentsScreenshotEnabled, Android 13 and up) the app keeps no picture there while a stage holds
 * it: Recents shows the app's plain card. The player's own screenshots still work (this is not FLAG_SECURE).
 *
 * Holds are counted: the picture comes back when the last one is let go. Unsupported means a no-op, never an
 * error: iOS (the module is Android only; iOS has no such picture problem at 'inactive'), Android below 13, a
 * binary built before the module, and Jest. Then `hideRecentsPicture` answers false, and the stage freezes at
 * the window's blur instead (levels/levelSession.ts).
 *
 * The functions never throw: a native call that fails counts as unsupported (logged in development).
 */

/** The native module's name (AppWindowModule.kt `Name("AppWindow")`). */
export const APP_WINDOW_MODULE = 'AppWindow';

/** What modules/app-window exposes (AppWindowModule.kt). */
export interface AppWindowNative {
  /** Android 13 (API 33) and up. */
  isRecentsScreenshotToggleSupported(): boolean;
  /** False below Android 13 or with no activity (nothing changed). */
  setRecentsScreenshotEnabled(enabled: boolean): boolean;
}

/** One hold on the hidden picture: `release` lets it go (once; again does nothing). */
export interface RecentsPictureHold {
  /** Whether the picture is really kept out of Recents (false: unsupported, see above). */
  readonly hidden: boolean;
  release(): void;
}

export type HideRecentsPicture = () => RecentsPictureHold;

/** The API over a native module (tests pass their own `load`). `load` runs once, on first use. */
export function createRecentsPicture(load: () => AppWindowNative | null): HideRecentsPicture {
  let loaded = false;
  let native: AppWindowNative | null = null;
  let supported: boolean | null = null;
  let holds = 0;
  let hiddenNow = false;

  const nativeModule = (): AppWindowNative | null => {
    if (!loaded) {
      loaded = true;
      try {
        native = load();
      } catch (error) {
        report(error);
        native = null;
      }
    }
    return native;
  };

  const isSupported = (): boolean => {
    if (supported === null) {
      const m = nativeModule();
      try {
        supported = m !== null && m.isRecentsScreenshotToggleSupported() === true;
      } catch (error) {
        report(error);
        supported = false;
      }
    }
    return supported;
  };

  const set = (enabled: boolean): boolean => {
    const m = nativeModule();
    if (!m) return false;
    try {
      return m.setRecentsScreenshotEnabled(enabled) === true;
    } catch (error) {
      report(error);
      return false;
    }
  };

  return () => {
    if (!isSupported()) return { hidden: false, release: () => {} };
    holds += 1;
    if (holds === 1) hiddenNow = set(false);
    let released = false;
    return {
      hidden: hiddenNow,
      release: () => {
        if (released) return;
        released = true;
        holds -= 1;
        if (holds === 0 && hiddenNow) {
          set(true);
          hiddenNow = false;
        }
      },
    };
  };
}

/**
 * The module in this binary: Android only; null on iOS, in Jest, or in a build from before the module. Tests
 * pass the platform and the lookup.
 */
export function windowModule(
  os: string = Platform.OS,
  lookup: (name: string) => AppWindowNative | null = requireOptionalNativeModule,
): AppWindowNative | null {
  return os === 'android' ? lookup(APP_WINDOW_MODULE) : null;
}

export const hideRecentsPicture: HideRecentsPicture = createRecentsPicture(() => windowModule());

function report(error: unknown): void {
  if (__DEV__) console.warn('[app-window]', error);
}
