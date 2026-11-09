import { appTypeface, radius, size, space, text, tokens, type Typeface } from '../../../theme';
import { rubikStyle, tekoStyle } from '../../../components/player/metrics';
import { FONT_SCALE_CAPS } from '../../../components/ui/Text';

/**
 * Dimensions of the interference picker (components.md §13, motion.md §4.4) that tokens.json does not name.
 * They live here, in one place, derived from tokens where one exists, so the components hold no raw numbers.
 * pickerLayout (arsenalModel) adds them up to prove that every kind fits without a scroll [D45].
 *
 * The heights that hold text are the design's, or more where the app's language writes taller lines
 * (theme/typeface.ts: Arabic, Thai, Vietnamese, CJK; localization plan 0ט): a kind button, the header and the
 * info line grow instead of cutting the marks above and below. Hebrew and English get the design's exactly.
 * arsenalMetricsFor(typeface) gives them in another language, for its layout test (D124).
 *
 * And at the system text size (`fontScale`, React Native's; QA fixcheck of APK 15, English at 360 dp and 1.3): the
 * kinds' names, the info line and the price row's words grow with it up to PICKER_FONT_CAP, and the boxes that hold
 * them grow with them (a name's two lines, the button; the price row puts its halves on two lines, the info line
 * takes a second one), so no
 * word is cut and none is drawn below the design's size. React Native grows a text's lineHeight by the same
 * scale. A smaller system text keeps the design's boxes.
 */
export function arsenalMetricsFor(typeface: Typeface = appTypeface(), fontScale = 1) {
  const grow = textGrowth(fontScale);
  const nameStyle = rubikStyle(13, '600', typeface);
  const button = {
    paddingTop: space[3],
    art: 36,
    nameTop: space[1],
    nameLines: 2,
    chipTop: space[2],
    chip: { height: 22, radius: 11, paddingX: space[4], gap: space[1], icon: space[6] },
  };
  /** The two lines' room of a name, as tall as its text draws them. */
  const nameBox = grown(button.nameLines * (nameStyle.lineHeight ?? 0), grow);
  /** A kind button's content, top to bottom, inside its hairline: the preview, two lines of name, the chip. */
  const buttonContent =
    button.paddingTop +
    button.art +
    button.nameTop +
    nameBox +
    button.chipTop +
    button.chip.height +
    2 * tokens.border.hairline;
  const lineOf = (name: 'h1' | 'label' | 'micro') => text(name, typeface).lineHeight ?? 0;
  const header = { top: space[4], gap: space[2] };
  /** The info line's design line; a grown text may take a second line. */
  const infoLine = Math.max(space[8], lineOf('micro'));
  const infoLines = grow > 1 ? 2 : 1;
  const priceStyle = tekoStyle(30);
  const scoreStyle = tekoStyle(22);
  /** The stacked price row (a grown text): its padding and the gap between its two lines. */
  const priceStack = { paddingY: space[3], rowGap: space[2] };
  const stackedPrice =
    2 * tokens.border.hairline +
    2 * priceStack.paddingY +
    priceStack.rowGap +
    Math.ceil(
      grow *
        (Math.max(priceStyle.lineHeight ?? 0, lineOf('label')) +
          Math.max(scoreStyle.lineHeight ?? 0, lineOf('label'))),
    );
  return {
    /** The system text size the picker's words are drawn at (1 … PICKER_FONT_CAP); their maxFontSizeMultiplier. */
    textScale: grow,
    /** The sheet: padding 10 16 (16 + the inset at its foot), the handle, at most 85 % of the window. */
    sheet: {
      paddingTop: space[5],
      paddingX: space[8],
      paddingBottom: space[8],
      handle: size.sheetHandle.height,
      maxShare: 0.85,
    },
    /** The title "בחר הפרעה" (h1) and under it the target line, or the route in 3–4 players: 52 at least. */
    header: {
      ...header,
      height: Math.max(space[14] + space[2], lineOf('h1') + header.gap + lineOf('label')),
    },
    /** "יעד:" / the route with the mini avatars (a 1.5 dp ring in their colour) and the seat shapes. */
    subtitle: { gap: space[3], avatarRing: 1.5, avatarRadius: radius.sm, glyph: 7 },
    /** The price row: h 48, radius 12; the price in Teko 30 (accent), my score in Teko 22 (P1). */
    price: {
      top: space[5],
      /**
       * 48; with a grown text, the row's halves on two lines (`stacked`: "מחיר −2 נק׳ · הבאה: 4" over "הניקוד שלך
       * 6 → 4"), each line as tall as its grown number or words, so "· Next: 4" has the row's width and never
       * breaks (QA fixcheck of APK 15).
       */
      height: grow > 1 ? stackedPrice : size.buttonModal,
      stacked: grow > 1,
      paddingY: priceStack.paddingY,
      rowGap: priceStack.rowGap,
      paddingX: space[6],
      radius: radius.lg,
      gap: space[4],
      priceStyle,
      scoreStyle,
    },
    /** The grid of kinds: columns from ARSENAL_CONFIG, gap 8. */
    grid: { top: space[6], gap: space[4] },
    /**
     * A kind button: h 104 (its content exactly, in Hebrew and English), radius 16, the preview 36, the name
     * (Rubik 600 13, up to 2 lines, so the chips line up), and the price chip (h 22, radius 11, the number in
     * Teko 17).
     */
    button: {
      ...button,
      height: Math.max(104, buttonContent),
      nameBox,
      radius: space[8],
      paddingX: space[2],
      nameStyle,
      chipNumberStyle: tekoStyle(17),
      chipTextStyle: rubikStyle(11, '500', typeface),
      pressedScale: 0.96,
    },
    /**
     * "כל הפרעה נמשכת 5 שניות · הקשה משגרת": mt 10, one line (16, or the language's taller micro line); two with
     * a grown system text. `line` is its style's lineHeight, `height` all its lines as drawn.
     */
    info: {
      top: space[5],
      line: infoLine,
      lines: infoLines,
      height: grown(infoLine * infoLines, grow),
    },
    /**
     * The reason bubble over a blocked kind: radius 10, Rubik 500 12, gone after 2 s. It may run `overhang` past
     * its button on each side, so a long reason still fits.
     */
    bubble: {
      radius: radius.md,
      paddingX: space[5],
      paddingY: space[3],
      holdMs: 2000,
      overhang: space[15] + space[14],
      style: rubikStyle(12, '500', typeface),
    },
    /** The launch ripple: a stroke ring out of the target card, 1 → 1.15, opacity .6 → 0, 480 ms. */
    ripple: { width: 2, from: 0.6, scale: 1.15, ms: 480 },
    /** The sheet closes in 200 ms after a launch (motion.md `launch`). */
    launch: { closeMs: 200 },
    /** A downward drag of the header this far (or a fling) closes the sheet; RNGH speeds are per second. */
    closeDragActivate: space[4],
  } as const;
}

/**
 * The most the system text size grows the picker's words: the play surface's cap for its fixed rows (BRD-3), so
 * every kind still fits at once on a small phone (D45; pickerFits.test.ts).
 */
export const PICKER_FONT_CAP = FONT_SCALE_CAPS.hud;

/** A design height drawn at `grow`, rounded up to whole dp; at the design's size, the design's exactly. */
const grown = (height: number, grow: number): number => (grow > 1 ? Math.ceil(height * grow) : height);

/** How much the picker's words grow at `fontScale`: never below the design's size, never past PICKER_FONT_CAP. */
export const textGrowth = (fontScale: number): number => Math.min(Math.max(1, fontScale), PICKER_FONT_CAP);

export type ArsenalMetrics = ReturnType<typeof arsenalMetricsFor>;

/** The picker's dimensions in the app's language, at the design's text size. */
export const arsenalMetrics: ArsenalMetrics = arsenalMetricsFor();

const byScale = new Map<number, ArsenalMetrics>();

/** The picker's dimensions in the app's language at the system text size (useWindowDimensions().fontScale). */
export function arsenalMetricsAt(fontScale: number): ArsenalMetrics {
  const grow = textGrowth(fontScale);
  if (grow === 1) return arsenalMetrics;
  let found = byScale.get(grow);
  if (!found) {
    found = arsenalMetricsFor(appTypeface(), grow);
    byScale.set(grow, found);
  }
  return found;
}
