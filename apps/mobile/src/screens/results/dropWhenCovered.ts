import type { NativeStackNavigationProp } from 'expo-router';
import { CommonActions, type NavigationProp, type ParamListBase } from 'expo-router/react-navigation';

import { crashReporter } from '../../services/crashlytics';

/**
 * The results leave the history once the next screen covers them (QA loop 6: 80–90 ms of nothing but the
 * wandering digits between the results' "משחק חדש" and the search, then the search faded in).
 *
 * "משחק חדש" used to *replace* the results. On Android react-native-screens then fades the old screen out while
 * the new one fades in from 0, and the old one's content is not reliably there for it: its removal transition
 * is posted to the UI thread from the mounting thread (NativeProxy.notifyScreenRemoved), and when the batch that
 * removes its views runs first they are gone at once (goHandoff.ts, the same race at GO!). The new screen then
 * fades in over nothing. So the next screen is *pushed* over the results instead: they stay whole under it for
 * the whole cross-fade (`flow.fade` / `stack.push`, their reduced-motion fades too), and only once they are
 * covered (the stack's `transitionEnd`, or COVERED_DROP_FALLBACK_MS at the latest) are they taken out of the
 * history, unseen, so back from the search goes where it went before and the stack never grows.
 * The match screen hands over to the game the same way at GO! (app/match/index.tsx, goHandoff.ts).
 */

/** The latest the results wait to be covered: well past any screen fade (Android 150 ms, iOS 240 ms). */
export const COVERED_DROP_FALLBACK_MS = 600;

type StackNavigation = Pick<NavigationProp<ParamListBase>, 'addListener' | 'dispatch' | 'getState'>;
/** A screen of the root stack, which is a native stack: it has its transition events. */
type NativeStackEvents = Pick<NativeStackNavigationProp<ParamListBase>, 'addListener'>;

/**
 * Takes the route `key` out of its stack once it is covered (never while it is the screen shown: back from the
 * next one within the fade brings it back, and it stays). Resolves once that is settled.
 */
export function dropWhenCovered(
  navigation: StackNavigation,
  key: string,
  fallbackMs: number = COVERED_DROP_FALLBACK_MS,
): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const drop = () => {
      if (done) return;
      done = true;
      unsubscribe();
      clearTimeout(timer);
      try {
        const state = navigation.getState();
        const shown = state?.routes[state.index]?.key;
        if (state && shown !== undefined && shown !== key && state.routes.some((r) => r.key === key)) {
          const routes = state.routes.filter((r) => r.key !== key);
          navigation.dispatch({
            ...CommonActions.reset({ ...state, routes, index: routes.findIndex((r) => r.key === shown) }),
            target: state.key,
          });
        }
      } catch (error) {
        // Best effort, from a timer or a native event: the screen just stays in the history (back shows it).
        crashReporter().recordError(error, 'dropWhenCovered');
      } finally {
        resolve();
      }
    };
    let unsubscribe = () => {};
    const timer = setTimeout(drop, fallbackMs);
    try {
      unsubscribe = (navigation as unknown as NativeStackEvents).addListener('transitionEnd', (e) => {
        if (e.data.closing) drop();
      });
    } catch (error) {
      crashReporter().recordError(error, 'dropWhenCovered'); // the fallback still drops it
    }
  });
}
