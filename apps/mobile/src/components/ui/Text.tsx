import type { ComponentRef, Ref } from 'react';
import { Text as NativeText, type TextProps as NativeTextProps } from 'react-native';

import { appTypeface, type Typeface } from '../../theme';

/**
 * How far the system text size may grow a text drawn on the play surface (BRD-3, polish audit 2026-10-30). The
 * 9 × 9 board and the keypad have fixed geometry that cannot grow with the text, so the system scale would only
 * cut their digits:
 * - 'board': the cell digits, wrong marks, the seconds pill, a key's digit and count. Never larger than the
 *   design (×1.0); a cell gives large-text users its own bigger digit instead (geometry.ts LARGE_TEXT).
 * - 'hud': the lock strip, the names and scores on the game cards, "ביטול בחירה". Up to ×1.35, which their
 *   fixed-height rows still hold.
 * Smaller system text still shrinks them (the cap is a ceiling only). Every other text scales freely.
 */
export type TextScale = 'board' | 'hud';

export const FONT_SCALE_CAPS: Readonly<Record<TextScale, number>> = { board: 1, hud: 1.35 };

/** The React Native `maxFontSizeMultiplier` of a scale; undefined (no cap) without one. */
export const maxFontScale = (scale: TextScale | undefined): number | undefined =>
  scale ? FONT_SCALE_CAPS[scale] : undefined;

export type TextProps = NativeTextProps & {
  ref?: Ref<ComponentRef<typeof NativeText>>;
  /** Caps the system text size on the play surface (BRD-3); an explicit maxFontSizeMultiplier wins. */
  scale?: TextScale;
};

/**
 * What every text needs of the app's language beyond its style (localization plan 0ט): Korean on iOS breaks
 * lines between words ("hangul-word"), never inside one. Nothing for any other language, so Hebrew and English
 * render exactly as React Native's Text. Android has no such prop (React Native's TextProps): there a word that
 * breaks badly in a label gets U+200B at the right place in its translation.
 */
export function languageTextProps(typeface: Typeface = appTypeface()): Partial<NativeTextProps> {
  return typeface.lineBreakStrategyIOS ? { lineBreakStrategyIOS: typeface.lineBreakStrategyIOS } : {};
}

/**
 * The app's base Text: React Native's, with languageTextProps under the caller's props (a caller may still set
 * its own), and the play surface's font-scale cap (`scale`). Use it for text that may wrap; textBase.test.tsx
 * lists the files that still use React Native's, and fails on them once Korean is in the app.
 */
export function Text({ scale, ...props }: TextProps) {
  const cap = scale ? { maxFontSizeMultiplier: FONT_SCALE_CAPS[scale] } : null;
  return <NativeText {...languageTextProps()} {...cap} {...props} />;
}
