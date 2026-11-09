import { cubicBezier } from 'react-native-reanimated';

import { motion } from '../../theme/motion';

/**
 * Motion that runs as a Reanimated CSS animation (keyframes in the style), not as a worklet style (docs/PERF.md,
 * B14/B32, QA run #3).
 *
 * On Android, Reanimated 4.5 keeps the last props of every view a worklet style moved until 2 s after its last
 * frame, and applies them all again, on the UI thread, for each layout event react-native-svg sends when it draws
 * a shape for the first time (an avatar has 50–130 shapes). A view of that list deleted in the frame that draws
 * new shapes fails each time, with an exception and its stack trace in the log, about 1 ms each: the History's
 * 24 pulsing skeleton blocks against its cards' ~370 new shapes froze the phone for 6.5–7.4 s. A CSS animation
 * runs in Reanimated's native core and is not on that list: deleting its view, or drawing new shapes beside it,
 * costs nothing.
 *
 * So the views that are replaced by new SVG content, or deleted beside it, animate this way: the loaders' endless
 * loops (Skeleton, Spinner), my lock's pulse and a move's flash on a cell (components/board/Cell.tsx). The look is
 * the same keyframes, durations and curves as before. CSS animations ignore Reanimated's reduced-motion flag, so
 * each caller picks its reduced variant itself (none of them animates with Reduced Motion, or it picks its own
 * shorter fade).
 */

/** The curves of motion.md §3, as CSS timing functions. */
export function cssCurve(name: 'standard' | 'emphasized' | 'exit' | 'countUp' | 'loop') {
  const [x1, y1, x2, y2] = motion.easing[name];
  return cubicBezier(x1, y1, x2, y2);
}
