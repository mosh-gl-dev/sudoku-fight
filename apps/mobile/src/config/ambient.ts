/**
 * The wandering digits behind the whole app (D126; motion.md §4.13). Moshe, 31.10.2026: "הרקע בכל האפליקציה צריך
 * להיות מספרים קטנים (בין 6 ל12 DP) משוטטים על המסך. לאט. כל הזמן. בכל מקום שבו יש רקע". So the digits 1–9, 6–12
 * dp tall, drift slowly over the screen, all the time, behind every screen: one layer under the navigator
 * (app/_layout.tsx), the screens transparent over it, their cards and content opaque, the digits in the gaps.
 * Every number to tune is here (CLAUDE.md: decisions as config).
 *
 * (His first look, 30.10.2026, was 9 digits of 44–72 dp at a 7 % ink, on Home, Login and the search only, settling
 * 25 s after the last touch: "אני לא רואה שום שינוי". All of that is gone.)
 *
 * Calm by rule: one neutral ink, never a seat's colour or gold (so it never reads as the "scrambling numbers"
 * interference, D47); slow, with a hard cap on the fastest moment; no jumps (a digit leaves the screen whole
 * before it comes back on the other side). Reduced Motion: one still frame of the same field.
 */
export const ambientConfig = {
  /** False: no digits anywhere. */
  enabled: true,
  /** "(בין 6 ל12 DP)": the glyphs' heights, dp, spread evenly over the digits. */
  sizeDp: [6, 12],
  /**
   * "לאט": each digit's drift, dp/s, along its own heading. With the sway below, no digit ever moves faster than
   * `maxSpeedDpS` (the model holds it): a 400 dp wide phone is crossed in about 1–2 minutes.
   */
  speedDpS: [3, 6],
  maxSpeedDpS: 8,
  /** The meander: a sideways sway of up to `dp` either way, one swing every `ms`. */
  sway: { dp: [3, 10], ms: [12_000, 24_000] },
  /** A slow tilt about the glyph's middle: up to ±`deg`, one swing every `ms`. */
  tilt: { deg: [3, 10], ms: [8_000, 16_000] },
  /**
   * The density: one digit per `areaPerDigitDp2` of the field (the window, plus the strip just off its edges where
   * a digit wraps). A 400 × 860 dp phone gets 52, about 48 of them on the screen at once: one per 85 × 85 dp patch,
   * a light field (their ink covers well under 1 % of the screen). Never fewer than `minCount` (each digit once),
   * never more than `maxCount` (a tablet: the cost stays flat).
   */
  areaPerDigitDp2: 7_500,
  minCount: 9,
  maxCount: 120,
  /**
   * The ink: textMuted laid over bg at `level`, one solid colour (two digits that overlap never add up). Tiny
   * glyphs need far more than the first 7 %: 0.13 is #21252c, 1.22:1 against bg, as bright as a raised card
   * (surface2), clearly there and still calm. It is also the most the text allows: textFaint stays at 4.51:1 on
   * the ink (contrast.test.ts holds 4.5:1 or more up to `maxLevel`; 0.135 would give 4.45:1).
   */
  ink: { level: 0.13, maxLevel: 0.13 },
  /** One field for the whole app, the same run after run (no per-visit seed). */
  seed: 1009,
  /**
   * Picture updates a second ("כל הזמן": while the app is in the foreground and not under the Splash). 15, not 30:
   * at 3–6 dp/s a step is under half a dp, too small to see, and the phone does half the work (a Galaxy A16 kept
   * 85 % of a core busy on Home at 30, 31.10.2026; AmbientCanvas.tsx).
   */
  hz: 15,
  /** The digits fade in once, when the canvas is ready after the first screen (Reduced Motion: 200 ms). */
  fadeInMs: 600,
} as const;

/** The config's shape with plain numbers (a test may pass other values). */
type Widen<T> = T extends number
  ? number
  : T extends string
    ? string
    : T extends boolean
      ? boolean
      : { readonly [K in keyof T]: Widen<T[K]> };

export type AmbientConfig = Widen<typeof ambientConfig>;
