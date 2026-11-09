/**
 * Number and direction helpers for the player components (components.md §0.4, §0.6). Pure, no React.
 * `ltr`, `formatScore` and `scoreText` are worklets too: a count-up formats every frame of it on the UI thread
 * (CountUpText, motion.md §6).
 *
 * Digits are always Western (D108). The decimal separator is the language's (common:number.decimal: "." in
 * Hebrew and English, "," in German): a worklet can't call t(), so the formatters take it as an argument, which a
 * screen reads once with i18n/compose.ts `decimalSeparator(t)`. Without one they write ".": every number shown
 * on screen passes one (i18n/__tests__/decimalSites.test.tsx).
 */

/** U+2212, the minus sign the design uses for negative numbers ("−2"). */
export const MINUS = '−';
const LRI = '⁦';
const PDI = '⁩';

/**
 * An LTR isolate: a cell name, a signed number or a Latin name inside Hebrew text keeps its own order
 * ("בוחרת · ⁦A8⁩", "⁦+3.5⁩").
 */
export function ltr(s: string): string {
  'worklet';
  return `${LRI}${s}${PDI}`;
}

/** The decimal separator when the caller passes none: Hebrew's and English's. */
export const DEFAULT_DECIMAL = '.';

/**
 * A score as the cards show it: Latin digits, one decimal only for halves, U+2212 for a minus (55, 39.5, −2;
 * "39,5" with `decimal` ",").
 */
export function formatScore(n: number, decimal?: string): string {
  'worklet';
  // Not a default parameter: a worklet's closure (DEFAULT_DECIMAL) is read in its body, after the parameters
  // (src/__tests__/workletClosures.test.ts).
  const sep = decimal ?? DEFAULT_DECIMAL;
  const abs = Math.abs(n);
  const body = Number.isInteger(abs) ? String(abs) : abs.toFixed(1).replace('.', sep);
  return n < 0 && abs !== 0 ? `${MINUS}${body}` : body;
}

/** A change with its sign: "+3.5", "−2", "0". */
export function formatSigned(n: number, decimal: string = DEFAULT_DECIMAL): string {
  if (n > 0) return `+${formatScore(n, decimal)}`;
  return formatScore(n, decimal);
}

/**
 * A score as screen text: a negative one is an LTR isolate, so the minus stays before the number in Hebrew
 * (CLAUDE.md). On Android `writingDirection` is ignored, and "−2" alone in an RTL line would show as "2−".
 */
export function scoreText(n: number, decimal?: string): string {
  'worklet';
  const sep = decimal ?? DEFAULT_DECIMAL;
  return n < 0 ? ltr(formatScore(n, sep)) : formatScore(n, sep);
}

/** A signed change as screen text ("+3.5", "−2"), always an LTR isolate (CLAUDE.md). */
export const signedText = (n: number, decimal: string = DEFAULT_DECIMAL): string =>
  ltr(formatSigned(n, decimal));

/**
 * A count-up's format (CountUpText) with the language's separator already in it: scoreText as a worklet of
 * one argument. Make it once per separator (useMemo), so the count's animated props are not set up again on
 * every render.
 */
export function scoreFormat(decimal: string = DEFAULT_DECIMAL): (n: number) => string {
  return (n: number): string => {
    'worklet';
    return scoreText(n, decimal);
  };
}

/**
 * Text written with "." between digits, with the language's separator instead: a how-to-play chip "+3,5" ("."
 * stays as it is in Hebrew and English).
 */
export const withDecimal = (s: string, decimal: string = DEFAULT_DECIMAL): string =>
  decimal === DEFAULT_DECIMAL ? s : s.replace(/(\d)\.(?=\d)/g, `$1${decimal}`);

/** Seconds as the timers show them: always rounded up, never below 0 (7 while 6.2 s are left). */
export const secondsOf = (ms: number): number => Math.max(0, Math.ceil(ms / 1000));

/** How often a running clock's accessibility label changes, in seconds (Q1). */
export const CLOCK_LABEL_STEP_S = 5;

/**
 * A running clock's seconds as its accessibility label says them (Q1): in steps of CLOCK_LABEL_STEP_S, never every
 * second. A label that changes every second sends a change event every second: a screen reader gains nothing from
 * it, and the screen never settles (uiautomator: "could not get idle state"). Both round down, so a label never
 * says more time has passed, or more is left, than the clock shows; time left is exact in its last step (5, 4, 3…),
 * so it never says "0" while some is left (labelSecondsLeft).
 */
export function clockLabelSeconds(ms: number, kind: 'elapsed' | 'left'): number {
  if (kind === 'elapsed') return Math.floor(Math.max(0, ms) / 1000 / CLOCK_LABEL_STEP_S) * CLOCK_LABEL_STEP_S;
  return labelSecondsLeft(secondsOf(ms));
}

/** Whole seconds left (a timer's `secondsOf`) as a label says them: exact in the last step, else down to it. */
export const labelSecondsLeft = (seconds: number): number =>
  seconds <= CLOCK_LABEL_STEP_S ? seconds : Math.floor(seconds / CLOCK_LABEL_STEP_S) * CLOCK_LABEL_STEP_S;

/** `#rrggbb` at an opacity, for fills the tokens define as "ring at 16%". */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
