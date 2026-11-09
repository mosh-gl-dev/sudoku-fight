import {
  type ComponentType,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import { AppState } from 'react-native';

/**
 * One app at a time (QA loop 7, "postgame-progress-english": after `wm density reset` and a font-size change
 * with the app open, the profile card, "My player card" and at times a bottom tab did nothing, each tap logging
 * "The 'navigation' object hasn't been initialized yet", until the app was restarted).
 *
 * A configuration change the manifest doesn't list (density, fontScale, bold text…) recreates Android's
 * activity, and React Native starts a new React root (a surface) for the new one, in the same JS runtime. Each
 * root holds its own expo-router ExpoRoot, with its own NavigationContainer; but `router.push`, `replace` and
 * `back` go through ONE module-level queue (expo-router's routingQueue), and the first container whose effect
 * runs takes every waiting action and dispatches it into its own tree. A root that outlives its activity (two
 * changes in a row recreate twice; the root of an activity destroyed before it was ever laid out never gets its
 * safe-area insets, so its SafeAreaProvider renders nothing and its container has no navigator) takes the taps
 * of the visible app: its container has no navigator to hand them to ("hasn't been initialized yet"), and the
 * action is gone.
 *
 * The fix: the newest root is the app. Every older root renders nothing from the moment a newer one has
 * mounted, which unmounts its ExpoRoot and so its container, its routing-queue subscription and every screen
 * and effect in it, whether or not the native side ever stops its surface. A root never comes back once a newer
 * one has mounted.
 *
 * Old before new, as when Android stops the old surface first: the newest root draws the app only once no older
 * root still draws it. Several of the app's pieces set a module-level value on mount and put back, on unmount,
 * the one they found (Reanimated's ReducedMotionConfig in MotionPolicy, the keep-awake tag, the background
 * work's start and stop). Were the new tree mounted first, the old one's cleanup would undo it: the phone's
 * Reduce Motion back in place of the app's setting, for the rest of the run (review of loop 7). The newest root
 * is empty for that one commit (only after a recreation; the first root of a run draws at once).
 *
 * Only the app's own root goes through this (index.ts wraps it); React Native's other surfaces (LogBox in
 * development) don't.
 */

/** The roots counted so far (each root's order), the newest one that has mounted, and those drawing the app. */
let counted = 0;
let newest = 0;
const drawing = new Set<number>();
/** The roots whose whole tree is being unmounted (their surface stopped): see useRootTeardown. */
const going = new Set<number>();
/** Bumped on each change, for the roots' useSyncExternalStore. */
let version = 0;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getVersion = () => version;
const changed = () => {
  version += 1;
  for (const listener of [...listeners]) listener();
};

/** Whether the root of this order draws the app: no newer root has mounted, and no older one still draws it. */
function mayDraw(order: number): boolean {
  if (order < newest) return false;
  for (const other of drawing) if (other < order) return false;
  return true;
}

/**
 * Marks its root as drawing the app while mounted. Rendered after the app, so that on the way out its cleanup
 * runs after the app's own (React unmounts a removed tree's effects in order).
 */
function Drawing({ order }: { order: number }) {
  useEffect(() => {
    drawing.add(order);
    return () => {
      drawing.delete(order);
      changed();
    };
  }, [order]);
  return null;
}

/** The root component, rendered only while it is the newest root of the app (see above). */
export function latestRootOnly<P extends object>(Root: ComponentType<P>): ComponentType<P> {
  function LatestRootOnly(props: P) {
    // The order this root started in, counted in its first render.
    const [order] = useState(() => ++counted);
    useSyncExternalStore(subscribe, getVersion, getVersion);
    // Once mounted, it is the newest, and the older roots are told: they render nothing from then on.
    useEffect(() => {
      if (order <= newest) return;
      newest = order;
      changed();
    }, [order]);
    // The whole root going (its surface stopped): React runs a removed tree's effect cleanups from the top down,
    // so this one runs before any of its screens' own, which then know they go with it (useRootTeardown). Back
    // on a remount (React's strict mode in development runs a cleanup and the effect again at once).
    useEffect(() => {
      going.delete(order);
      return () => {
        going.add(order);
      };
    }, [order]);
    // (Should this module ever be evaluated again, by Fast Refresh in development, the counts restart at 0 and
    // the app's one root keeps drawing.)
    if (!mayDraw(order)) return null;
    return (
      <RootOrder.Provider value={order}>
        <Root {...props} />
        <Drawing order={order} />
      </RootOrder.Provider>
    );
  }
  LatestRootOnly.displayName = `LatestRootOnly(${Root.displayName ?? Root.name ?? 'Root'})`;
  return LatestRootOnly;
}

/** The order of the root a component is in (null outside latestRootOnly: tests that mount a screen alone). */
const RootOrder = createContext<number | null>(null);

/**
 * Whether a screen unmounting now goes with its whole React root rather than being left by the player (QA
 * "density-change-orphans-ranked-game", the review of its fix): Android stopping the activity's surface (a
 * recreation: display size, font size, bold text…, or the activity destroyed), or a newer root having taken
 * over. The app goes on in the new root, which opens what the game store still holds (game/liveFlow.ts), so an
 * unmount cleanup that ends something under way (a ranked search left, a friends room's seat freed) skips it.
 *
 * - A newer root has mounted: this one is gone for good (see above).
 * - The app is not in the foreground: Android pauses an activity before it destroys it, and its surface's stop
 *   unmounts the tree after AppState heard of the pause (both go through the JS thread in that order); a player
 *   cannot leave a screen while the app is in the background, so the screen goes with its surface.
 *
 * - Its whole root is being unmounted (QA "density-change-cancels-ranked-search"): the root's own cleanup ran
 *   first (see latestRootOnly). The AppState check alone was a race: Android pauses, destroys and creates the
 *   activity in one go on its main thread, and React's unmount of a stopped surface is a scheduled render (Fabric
 *   stopSurface is updateContainer(null)), so by the time the old tree's cleanups ran, the new activity's resume
 *   had already put AppState back to 'active', and the new root had not mounted yet. A player never unmounts a
 *   whole root, so this one is never a leave.
 *
 * Read in the cleanup itself (not later: by then the new root is up and the app in front again).
 */
export function useRootTeardown(): () => boolean {
  const order = useContext(RootOrder);
  return useCallback(
    () =>
      (order !== null && (order < newest || going.has(order))) ||
      AppState.currentState === 'background' ||
      AppState.currentState === 'inactive',
    [order],
  );
}

/** Test-only: forgets the roots counted so far. */
export function resetLatestRootForTests(): void {
  counted = 0;
  newest = 0;
  drawing.clear();
  going.clear();
  version = 0;
}
