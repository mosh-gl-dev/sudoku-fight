import { useCallback, useMemo, useRef, useState } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';

/** What a scroll view shows of its content: from `y` down, `height` tall (0: not laid out yet). */
export interface ScrollWindow {
  y: number;
  height: number;
}

/** Whether content that ends at `bottom` (in the content's own coordinates) is under the scroll view's bottom edge. */
export function belowFold(shown: ScrollWindow, bottom: number): boolean {
  return shown.height > 0 && bottom > shown.y + shown.height + 1;
}

/**
 * How far a scroll view must scroll down for content that ends at `bottom` to be `margin` above its bottom edge,
 * or null when it need not (already in view, not laid out) or should not (more than `maxShare` of the view's
 * height: the screen's top would go out of sight for it; the user scrolls there).
 */
export function revealOffset(
  shown: ScrollWindow,
  bottom: number,
  margin: number,
  maxShare: number,
): number | null {
  if (!belowFold(shown, bottom)) return null;
  const by = bottom + margin - (shown.y + shown.height);
  return by > shown.height * maxShare ? null : shown.y + by;
}

/** At most this share of the scroll view's height is scrolled to bring the part into view (`reveal`). */
export const REVEAL_MAX_SHARE = 0.4;

/**
 * Whether a part of a scroll view's content is still below the fold, until it is first seen (QA loop 8, A16 at
 * 1080 × 2340: the rating card's number sat under "משחק חדש" / "צפייה חוזרת", and its count from the old rating
 * to the new one ran there, unseen). `below` is false until the layouts say otherwise (nothing measured: shown),
 * true while the part is under the fold, and false for good once it has come into view (scrolled to, or there
 * from the start): what counts there may start then, and never goes back.
 *
 * The part: a block of the content (`onBlockLayout`, its top in the content) and, inside it, where what must be
 * seen ends (`onPartLayout`: its bottom inside the block). The scroll view takes `scroll` (its height and offset,
 * and its ref).
 *
 * `reveal(margin, animated)` scrolls the view down just enough to bring the part into view, `margin` above the
 * bottom edge (QA fixcheck of APK 14: after an abandon win on the A16 the number stayed under the bar, only the
 * card's title in view): only while it is unseen, never after the user has dragged the view, and never by more
 * than REVEAL_MAX_SHARE of its height. Says whether it scrolled.
 */
export function useScrolledIntoView() {
  const shown = useRef<ScrollWindow>({ y: 0, height: 0 });
  const block = useRef<{ top: number | null; part: number | null }>({ top: null, part: null });
  const seen = useRef(false);
  const dragged = useRef(false);
  const ref = useRef<ScrollView>(null);
  const [below, setBelow] = useState(false);
  // Once seen, the scroll view stops sending its offset to JS (no onScroll, no throttle): nothing waits on it.
  const [watching, setWatching] = useState(true);

  const check = useCallback(() => {
    if (seen.current) return;
    const { top, part } = block.current;
    if (top === null || part === null || shown.current.height <= 0) return;
    const hidden = belowFold(shown.current, top + part);
    if (!hidden) {
      seen.current = true;
      setWatching(false);
    }
    setBelow(hidden);
  }, []);

  const scroll = useMemo(() => {
    const onLayout = (e: LayoutChangeEvent) => {
      shown.current = { ...shown.current, height: e.nativeEvent.layout.height };
      check();
    };
    if (!watching) return { ref, onLayout };
    return {
      ref,
      scrollEventThrottle: 16,
      onLayout,
      onScrollBeginDrag: () => {
        dragged.current = true;
      },
      onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (seen.current) return;
        shown.current = { ...shown.current, y: e.nativeEvent.contentOffset.y };
        check();
      },
    };
  }, [check, watching]);
  const onBlockLayout = useCallback(
    (e: LayoutChangeEvent) => {
      block.current = { ...block.current, top: e.nativeEvent.layout.y };
      check();
    },
    [check],
  );
  const onPartLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { y, height } = e.nativeEvent.layout;
      block.current = { ...block.current, part: y + height };
      check();
    },
    [check],
  );
  const reveal = useCallback((margin: number, animated: boolean): boolean => {
    const { top, part } = block.current;
    if (seen.current || dragged.current || top === null || part === null) return false;
    const y = revealOffset(shown.current, top + part, margin, REVEAL_MAX_SHARE);
    if (y === null || !ref.current) return false;
    ref.current.scrollTo({ y, animated });
    return true;
  }, []);
  return { below, scroll, onBlockLayout, onPartLayout, reveal };
}
