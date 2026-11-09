import type { NativeStackNavigationProp } from 'expo-router';
import type { NavigationProp, ParamListBase } from 'expo-router/react-navigation';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

/**
 * The latest a handed-over results screen waits for its stack transition to end before it draws the rest, ms, when
 * the transition never says it has begun (no `transitionStart`). On the phone the fade began up to 857 ms after the
 * results mounted (QA loop 12, APK 17, rmoff4) and runs 150 ms; the stack's events normally come well before this.
 */
export const RESULTS_REST_FALLBACK_MS = 1500;

/**
 * Once the transition has begun (its opening `transitionStart`), the latest its end is waited for, ms after that:
 * Android's fixed fade (ANDROID_FADE_MS, 150; theme/transitions.ts, not imported here: it brings the navigator's
 * theme into every screen's tests) and a 100 ms margin for a late frame. A fallback that fired in the middle of the
 * fade would mount the rest in its frames, the overlap all this avoids (loop 12 review: rmoff4's fade began at
 * +857 ms).
 */
export const RESULTS_REST_AFTER_START_MS = 250;

type Events = Pick<NativeStackNavigationProp<ParamListBase>, 'addListener'>;

/**
 * Whether the stack's transition into this screen is over: its opening `transitionEnd`; at the latest
 * RESULTS_REST_AFTER_START_MS after its opening `transitionStart`, or `fallbackMs` after the first commit when no
 * start came. Null while it runs, then how many ms after the screen's first commit it ended (0 when nothing was
 * waited for; the parts that mount then take it off their entrance delays). Only waited for where it matters:
 * `wait` (the results of a game that just ended, pushed over the final board with their hero in the first commit)
 * on Android.
 *
 * Why (fullboard-empty-frame, QA loop 12 device measurements): on Android react-native-screens' fade is a pair of
 * 150 ms view tweens (rns_fade_in / rns_fade_out) that run by the clock on the UI thread. The results' first mount
 * and draw landed on that thread at the same time (frames of 60–150 ms: anim 52–60 ms, draw 36–52 ms), so the
 * fade got 0–2 frames: in 3 of 5 runs without Reduced Motion the board went in one frame and the results came in
 * part-transparent (a stalled fade, or a hard cut). With the incoming screen near 0 in that frame, it is the
 * reported "only the background" frame. The parts below the hero are not seen during the fade anyway (they enter
 * from 0 later), so they mount once it is over: the fade's frames carry only what it shows. iOS's transition runs
 * on the render server, not by the app's main-thread frames, so nothing waits there.
 */
export function useStackEntered(
  navigation: Pick<NavigationProp<ParamListBase>, 'addListener'> | undefined,
  wait: boolean,
  fallbackMs: number = RESULTS_REST_FALLBACK_MS,
): number | null {
  // null while it runs; then how long after the screen's first commit it ended, ms (0: nothing waited).
  const [entered, setEntered] = useState<number | null>(() =>
    !wait || Platform.OS !== 'android' ? 0 : null,
  );
  const start = useRef<number | null>(null);
  // When the opening transition began (its transitionStart), kept if the effect runs again.
  const begun = useRef<number | null>(null);
  useEffect(() => {
    if (entered !== null) return;
    const from = (start.current ??= Date.now());
    const done = () => setEntered(Math.max(0, Date.now() - from));
    const deadline = () =>
      begun.current === null ? from + fallbackMs : begun.current + RESULTS_REST_AFTER_START_MS;
    let timer = setTimeout(done, Math.max(0, deadline() - Date.now()));
    const events = navigation as unknown as Events | undefined;
    const off: (() => void)[] = [];
    try {
      // The fade has begun: no plain clock ends the wait in its middle; its end, or its length and a margin.
      off.push(
        events?.addListener('transitionStart', (e) => {
          if (e.data.closing || begun.current !== null) return;
          begun.current = Date.now();
          clearTimeout(timer);
          timer = setTimeout(done, Math.max(0, deadline() - Date.now()));
        }) ?? (() => {}),
      );
      off.push(
        events?.addListener('transitionEnd', (e) => {
          if (!e.data.closing) done();
        }) ?? (() => {}),
      );
    } catch {
      // No native stack around it: the fallback draws the rest.
    }
    return () => {
      clearTimeout(timer);
      off.forEach((f) => f());
    };
  }, [entered, navigation, fallbackMs]);
  return entered;
}
