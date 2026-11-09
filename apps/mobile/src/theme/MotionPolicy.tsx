import { ReducedMotionConfig } from 'react-native-reanimated';

import { reduceMotionFlag, useReduceMotion } from './motion';

/**
 * The app's Reduced Motion decision for every Reanimated animation that doesn't set its own (spec §4.1: off by
 * default, even when the phone reduces motion). Without it, those animations follow the phone. A screen that drew
 * its full-motion version would then freeze its loops: a lock band that never pulses, a blink that never blinks,
 * a spinner that turns once and stops (found after the default became 'off', 1.11.2026). Mounted once, first in the
 * root layout, so the setting applies before any screen starts an animation.
 */
export function MotionPolicy() {
  return <ReducedMotionConfig mode={reduceMotionFlag(useReduceMotion())} />;
}
