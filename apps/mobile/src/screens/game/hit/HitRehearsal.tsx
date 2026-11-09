import type { InterferenceKind } from '@sudoku-fight/engine';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import {
  DEFAULT_HIT_MS,
  effectColors,
  HIT_FADE_IN_MS,
  HIT_FADE_IN_REDUCED_MS,
  HIT_FADE_OUT_MS,
  HitEffect,
  type RegionRect,
} from '../../../components/interference';
import { whenIdle } from '../../../services/startup';
import { useReduceMotion } from '../../../theme/motion';
import { HitBanner } from './HitBanner';
import { HIT_WARM_DELAY_MS } from './warmHitCues';

/**
 * The first hit's own costs, paid ahead (QA fixcheck of APK 14, warp-sound-on-dim-before-overlay: on the first hit
 * of a game the board's dim showed ~170 ms before the warp's overlay and banner; later hits did not). The dim is a
 * plain view. The overlay is a Skia canvas, which on Android draws into its own TextureView: its picture shows only
 * once its surface is made and Skia has drawn into it, and the first canvas of a kind also pays Skia's set-up and
 * the shaders of what it draws, and the JS of its first mount. The banner mounts an SVG ring and its avatar. So the
 * dim could be there while the rest was still being made, sound on or off.
 *
 * Once a game with interferences is up, after the hit sounds' warm-up, this mounts each effect this game allows
 * (and the banner), one at a time on an idle moment, for a short while, as a real hit would draw it in its middle,
 * then takes it away. All of it at 1 % opacity (not 0: a fully transparent view may be skipped by the renderer,
 * and then nothing is drawn and nothing warmed), never touchable, hidden from screen readers, and gone while a real
 * hit is on. The scramble and the keypad draw no effect here (the scramble's tiles are the board's, the keypad's
 * keys move): nothing to rehearse.
 */

/** After the hit sounds' warm-up has started (HIT_WARM_DELAY_MS): the board's entrance and first moves first. */
export const HIT_REHEARSAL_DELAY_MS = HIT_WARM_DELAY_MS + 1000;

/** How long each piece stays: enough for its surface to be made and drawn into (a few frames), not more. */
export const HIT_REHEARSAL_HOLD_MS = 250;

/** Where in a hit the rehearsal draws: mid-hit, everything in and drawn at full strength (alpha 1). */
export const HIT_REHEARSAL_AT_MS = 2500;

/** Low enough that no one sees it, high enough that the platform still draws it. */
export const HIT_REHEARSAL_OPACITY = 0.01;

/** The kinds with an effect of their own over the hit layer (HitEffect). */
const EFFECT_KINDS: ReadonlySet<InterferenceKind> = new Set(['fireworks', 'cats', 'warp', 'ink']);

export type RehearsalStep = InterferenceKind | 'banner';

/**
 * What to rehearse, in order: the banner (every hit has one), then each allowed kind that has an effect. Without the
 * banner (`banner` false) when HitLayer keeps one made between hits (its `senders`): that one has paid it already.
 */
export function rehearsalSteps(kinds: readonly InterferenceKind[], banner = true): RehearsalStep[] {
  const effects = [...new Set(kinds)].filter((k) => EFFECT_KINDS.has(k));
  return banner ? ['banner', ...effects] : effects;
}

/**
 * Shows each step from `delayMs` on, one per idle moment, each for `holdMs`, then none; returns what stops it (the
 * screen went). `show(null)` at the end.
 */
export function rehearseLater(
  steps: readonly RehearsalStep[],
  show: (step: RehearsalStep | null) => void,
  delayMs: number = HIT_REHEARSAL_DELAY_MS,
  holdMs: number = HIT_REHEARSAL_HOLD_MS,
): () => void {
  let next = 0;
  let stopped = false;
  let stopIdle: (() => void) | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const step = () => {
    stopIdle = null;
    if (stopped) return;
    if (next >= steps.length) {
      show(null);
      return;
    }
    show(steps[next++]!);
    timer = setTimeout(() => {
      timer = null;
      stopIdle = whenIdle(step);
    }, holdMs);
  };
  timer = setTimeout(() => {
    timer = null;
    stopIdle = whenIdle(step);
  }, delayMs);
  return () => {
    stopped = true;
    if (timer !== null) clearTimeout(timer);
    stopIdle?.();
  };
}

export interface HitRehearsalProps {
  /** The rules' interferences: none (a practice, D44) rehearses nothing. */
  rules: { interferences: boolean; interferenceKinds: readonly InterferenceKind[] };
  /** A real hit is on: nothing is drawn here meanwhile. */
  hitOn: boolean;
  /** The board in the screen's coordinates (the warp's offset copy follows it), when known. */
  boardRect?: RegionRect | null;
  /**
   * Rehearse the banner too (default). False when HitLayer keeps the banner made between hits (its `senders`): a
   * second one here would only be mounted and taken away again next to it (QA review, loop 15).
   */
  banner?: boolean;
  testID?: string;
}

/** The game screen's part (mount it over the game screen, next to HitLayer). */
export function HitRehearsal({
  rules,
  hitOn,
  boardRect = null,
  banner = true,
  testID = 'hit-rehearsal',
}: HitRehearsalProps) {
  const reduce = useReduceMotion();
  const { width, height } = useWindowDimensions();
  const elapsed = useSharedValue(HIT_REHEARSAL_AT_MS);
  const colors = useMemo(() => effectColors(1), []);
  const [step, setStep] = useState<RehearsalStep | null>(null);
  const kinds = rules.interferences ? rules.interferenceKinds.join(',') : '';

  useEffect(() => {
    if (!kinds) return undefined;
    const steps = rehearsalSteps(kinds.split(',') as InterferenceKind[], banner);
    if (steps.length === 0) return undefined;
    const stop = rehearseLater(steps, setStep);
    return () => {
      stop();
      setStep(null);
    };
  }, [kinds, banner]);

  if (step === null || hitOn) return null;
  return (
    <View
      style={styles.layer}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
    >
      {step === 'banner' ? (
        <HitBanner
          title=""
          subtitle=""
          seconds={Math.ceil(DEFAULT_HIT_MS / 1000)}
          label=""
          fromColorIndex={1}
          elapsed={elapsed}
          totalMs={DEFAULT_HIT_MS}
          reduce={reduce}
          top={0}
          testID={`${testID}-banner`}
        />
      ) : (
        <HitEffect
          kind={step}
          width={width}
          height={height}
          elapsed={elapsed}
          totalMs={DEFAULT_HIT_MS}
          colors={colors}
          reduce={reduce}
          fadeInMs={reduce ? HIT_FADE_IN_REDUCED_MS : HIT_FADE_IN_MS}
          fadeOutMs={HIT_FADE_OUT_MS}
          scope="screen"
          board={boardRect}
          seed={1}
          testID={`${testID}-${step}`}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFill, direction: 'ltr', opacity: HIT_REHEARSAL_OPACITY },
});
