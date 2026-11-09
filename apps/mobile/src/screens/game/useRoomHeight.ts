import { useCallback, useState } from 'react';
import type { View } from 'react-native';

import { layoutHeightOf } from './geometry';

/**
 * The height of the room the board sits in, for its side (boardSide): `ref` goes on the room, and its onLayout
 * calls `setHeight`. The ref reads it as the room comes (layoutHeightOf: the tree is laid out before refs and
 * layout effects run, and an update made then is drawn in the same frame), so the board's first frame has its
 * final size already. QA levels-freeze-ready (apk7): the board and the keypad first drew at the window's width,
 * then shrank to the room's height at its onLayout, about half a second later. Where the layout cannot be
 * read (tests), onLayout alone, as before.
 */
export function useRoomHeight() {
  const [height, setHeight] = useState<number | null>(null);
  const ref = useCallback((node: View | null) => {
    const now = layoutHeightOf(node);
    if (now !== null) setHeight((was) => was ?? now);
  }, []);
  return { ref, height, setHeight };
}
