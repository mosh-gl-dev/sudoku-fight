import { INTERFERENCE_KINDS } from '@sudoku-fight/engine';
import type { TextStyle } from 'react-native';

import {
  expectFits,
  expectRoom,
  fixedT,
  layoutLanguages,
  lineHeightAs,
  typefaceOf,
  widthIn,
} from '../../../../components/ui/testing/layout';
import { signedText } from '../../../../components/player/format';
import { size, space, text, tokens } from '../../../../theme';
import { fittedPicker, pickerLayout } from '../arsenalModel';
import { arsenalMetrics, arsenalMetricsFor } from '../metrics';
import { type GameT, nextPriceText } from '../wording';

/**
 * The interference picker shows every kind at once, never a scroll (spec §7.3, 01-SPEC line 1032, D45), in every
 * layout language the app has strings for (localization plan 0טו, D124: a language that doesn't fit shortens its
 * words): the sheet's height with the language's line heights, and its words in their room on the phones of the
 * picker's own test (arsenalModel.test.ts).
 */

const PHONES = [
  [360, 780, 48],
  [360, 640, 48],
  [320, 568, 48],
  [390, 844, 34],
] as const;

/** A text style's font: Rubik's file, or the system font's weight (no fontFamily: theme uiFont). */
type Font = { fontFamily?: string; fontWeight?: TextStyle['fontWeight']; fontSize: number };

/** A chip's words already cut in English on Moshe's phone (found by this test, 2026-10-23; reported). */
const CUT_TODAY: ReadonlySet<string> = new Set(['arsenal.busy']);

/** A space a line may break at: any but the no-break space (U+00A0), which joins the words on its sides. */
const BREAKABLE = /[^\S ]+/;
/** The words as drawn: a no-break space is as wide as a space. */
const drawn = (words: string): string => words.replace(/ /g, ' ');

/**
 * How many lines `words` take in `room`, broken at their breakable spaces (anywhere in a script without spaces).
 * A piece wider than the room can't be drawn at this size (Infinity: the text must shrink).
 */
function lineCount(lang: string, words: string, font: Font, room: number): number {
  // A script written with spaces (a no-break one too) breaks only at the breakable ones.
  const spaced = /\s/.test(words.trim());
  const pieces = spaced ? words.trim().split(BREAKABLE) : [...words];
  let lines = 1;
  let line = '';
  for (const piece of pieces) {
    if (widthIn(lang, drawn(piece), font) > room) return Infinity;
    const next = line ? `${line}${spaced ? ' ' : ''}${piece}` : piece;
    if (widthIn(lang, drawn(next), font) <= room) line = next;
    else {
      lines += 1;
      line = piece;
    }
  }
  return lines;
}

const fontOf = (style: TextStyle): Font => ({
  fontFamily: style.fontFamily,
  fontWeight: style.fontWeight,
  fontSize: style.fontSize!,
});

/** The price row's words wrap to two lines, then shrink to 3/4 (ArsenalOverlay PriceRow's WRAP). */
const PRICE_WORDS = { lines: 2, minScale: 0.75 };

/** Scripts that break a line inside a run of letters (no spaces between their words): Thai by its dictionary. */
const BREAKS_IN_WORDS: ReadonlySet<string> = new Set(['th', 'ja', 'zh-Hans', 'zh-Hant']);

/**
 * Whether `words` take at most PRICE_WORDS.lines lines in `room`, at their size or shrunk down to minScale. On
 * Android the floor is this fit, not minimumFontScale (Fabric's TextLayoutManager ignores it and shrinks to 4 dp
 * at worst): its search keeps the largest size that fits, so words that fit at the floor are never drawn below it.
 */
function wrapsIn(
  lang: string,
  words: string,
  font: Font,
  room: number,
  minScale: number = PRICE_WORDS.minScale,
  most: number = PRICE_WORDS.lines,
): boolean {
  const lines = (scale: number) =>
    BREAKS_IN_WORDS.has(lang)
      ? Math.ceil((widthIn(lang, drawn(words), font) * scale) / room)
      : lineCount(lang, words, { ...font, fontSize: font.fontSize * scale }, room);
  for (let scale = 1; scale >= minScale - 1e-9; scale -= 0.01) {
    if (lines(scale) <= most) return true;
  }
  return false;
}

/** A price row of a game under way: the second launch (−4, the next 8) on a two-digit score with a half. */
const PRICE_ROW = { cost: 4, next: 8, score: '18.5', after: '14.5' };

/**
 * Where the "· הבאה" words are still cut with "…" (never over the score since B45): on a 360 dp phone, "· Siguiente:
 * 8" and "· Próxima: 8" need a third line. Listed, so a shorter translation (D124) shows up here as a change to make.
 */
const PRICE_CUT_TODAY: ReadonlySet<string> = new Set(['es@360', 'pt-BR@360']);

/**
 * The price row on a `width` phone with the picker's `m` (ArsenalOverlay PriceRow), every text of it drawn at
 * m.textScale (maxFontSizeMultiplier). At the design's size: the halves share one line, and "· הבאה: 8" and
 * "הניקוד שלך" each fit two lines of their share, shrunk to WRAP's 3/4 at most. Grown (m.price.stacked): each half
 * has a line of the row's width, and its words (nextPriceText's, its no-break spaces kept: one piece) fit that one
 * line, at the grown size or shrunk to the design's size and no further, so the row's height holds them.
 */
function priceRowFits(lang: string, t: GameT, width: number, m: ReturnType<typeof arsenalMetricsFor>) {
  const typeface = typefaceOf(lang);
  const grow = (font: Font): Font => ({ ...font, fontSize: font.fontSize * m.textScale });
  const label = grow(fontOf(text('label', typeface)));
  const gap = space[2];
  const inner = width - 2 * m.sheet.paddingX - 2 * m.price.paddingX - 2 * tokens.border.hairline;
  // The numbers keep their size; the words beside them take what is left of their half.
  const startFixed =
    widthIn(lang, t('arsenal.price'), label) +
    widthIn(lang, signedText(-PRICE_ROW.cost), grow(fontOf(m.price.priceStyle))) +
    widthIn(lang, t('arsenal.unit'), grow(fontOf(text('badge', typeface)))) +
    3 * gap;
  const endFixed =
    widthIn(lang, PRICE_ROW.score, grow(fontOf(m.price.scoreStyle))) +
    widthIn(lang, PRICE_ROW.after, grow(fontOf(m.price.scoreStyle))) +
    widthIn(lang, t('arsenal.routeArrow'), label) +
    3 * gap;
  const next = m.price.stacked
    ? nextPriceText(PRICE_ROW.next, t)
    : t('arsenal.nextPrice', { cost: PRICE_ROW.next });
  const score = t('arsenal.score');
  if (m.price.stacked) {
    const minScale = 1 / m.textScale;
    const missing = t('arsenal.missing', { count: 12 });
    return {
      next,
      score,
      nextFits: wrapsIn(lang, next, label, inner - startFixed, minScale, 1),
      scoreFits:
        wrapsIn(lang, score, label, inner - endFixed, minScale, 1) &&
        wrapsIn(lang, missing, label, inner, minScale, 1),
    };
  }
  const start = startFixed + widthIn(lang, drawn(next), label);
  const end = endFixed + widthIn(lang, score, label);
  // Yoga: both halves shrink by what overflows, in proportion to their widths.
  const over = Math.max(0, start + m.price.gap + end - inner);
  const share = (w: number) => w - (over * w) / (start + end);
  return {
    next,
    score,
    nextFits: wrapsIn(lang, next, label, share(start) - startFixed),
    scoreFits: wrapsIn(lang, score, label, share(end) - endFixed),
  };
}

describe('the picker’s sizes in each script (plan 0ט)', () => {
  it('Hebrew and English: the design’s, exactly', () => {
    for (const lang of ['he', 'en']) {
      const m = arsenalMetricsFor(typefaceOf(lang));
      expect({ button: m.button.height, header: m.header.height, info: m.info.height }).toEqual({
        button: 104,
        header: 52,
        info: 16,
      });
      expect(m).toEqual(arsenalMetrics);
    }
  });

  it('a taller script grows a kind button, the header and the info line by what its lines need', () => {
    const thai = arsenalMetricsFor(typefaceOf('th'));
    // Two lines of 13 at 1.5 (20 each): 6 + 36 + 2 + 40 + 4 + 22 and the hairlines.
    expect(thai.button.height).toBe(112);
    // h1 22 at 1.5 (33), the gap, label 13 at 1.5 (20).
    expect(thai.header.height).toBe(57);
    expect(thai.info.height).toBe(18);
    expect(arsenalMetricsFor(typefaceOf('ar')).button.height).toBe(108);
  });

  it.each(['ar', 'th', 'vi', 'ja'])(
    'with %s’s line heights, every kind still fits on every phone',
    (lang) => {
      const metrics = arsenalMetricsFor(typefaceOf(lang));
      for (const [width, height, bottomInset] of PHONES) {
        const layout = pickerLayout({
          width,
          height,
          bottomInset,
          count: INTERFERENCE_KINDS.length,
          metrics,
        });
        expect({ lang, width, height, fits: layout.fits }).toEqual({ lang, width, height, fits: true });
      }
    },
  );
});

describe.each(layoutLanguages())('the picker in %s (D45, D124)', (lang) => {
  const m = arsenalMetricsFor(typefaceOf(lang));

  // The phones of 360 dp and more (a 320 dp one may still cut the words with "…", never draw them over each other).
  it.each(PHONES.filter(([width]) => width >= 360))(
    '%i × %i: the price row’s halves share it, their words in two lines, never over each other (B45)',
    async (width) => {
      const t = await fixedT(lang, 'game');
      const row = priceRowFits(lang, t as unknown as GameT, width, m);
      if (PRICE_CUT_TODAY.has(`${lang}@${width}`))
        expect({ lang, nextFits: row.nextFits }).toEqual({ lang, nextFits: false });
      else expectFits(lang, `game:arsenal.nextPrice "${row.next}"`, row.nextFits);
      expectFits(lang, `game:arsenal.score "${row.score}"`, row.scoreFits);
      // Two lines of words stand in the 48-dp row.
      expect(PRICE_WORDS.lines * lineHeightAs(lang, text('label'))).toBeLessThanOrEqual(
        m.price.height - 2 * tokens.border.hairline,
      );
    },
  );

  it.each(PHONES)('%i × %i: every kind at once, no scroll', (width, height, bottomInset) => {
    expect(
      pickerLayout({ width, height, bottomInset, count: INTERFERENCE_KINDS.length, metrics: m }).fits,
    ).toBe(true);
  });

  it.each(PHONES)(
    '%i × %i: the title and the info on one line, a name in two, a chip in one',
    async (width, height) => {
      const t = await fixedT(lang, 'game');
      const layout = pickerLayout({ width, height, count: INTERFERENCE_KINDS.length, metrics: m });
      const inner = width - 2 * m.sheet.paddingX;
      // The title beside the close button (44) and the header's gap.
      expectRoom(
        lang,
        'game:arsenal.title',
        widthIn(lang, t('arsenal.title'), fontOf(text('h1'))),
        inner - space[6] - size.iconButton,
      );
      expectRoom(
        lang,
        'game:arsenal.info',
        widthIn(lang, t('arsenal.info', { count: 5, seconds: 5 }), fontOf(text('micro'))),
        inner,
      );

      const column = layout.columnWidth - 2 * m.button.paddingX - 2 * tokens.border.hairline;
      for (const kind of INTERFERENCE_KINDS) {
        const name = t(`arsenal.kind.${kind}`);
        expectFits(
          lang,
          `game:arsenal.kind.${kind} in ${m.button.nameLines} lines`,
          lineCount(lang, name, fontOf(m.button.nameStyle), column) <= m.button.nameLines,
        );
      }

      // A chip: the price ("⁦−16⁩ נק׳"), or why the kind can't go now (a lock before a level). English's "Under
      // interference" is already cut on a 104 dp button (CUT_TODAY): there a language may be as wide as the wider of
      // Hebrew and English, no wider.
      const room = column - 2 * m.button.chip.paddingX;
      const unit = fontOf(m.button.chipTextStyle);
      const sources = await Promise.all(['he', 'en'].map((l) => fixedT(l, 'game')));
      const chip = (key: string, options?: Record<string, number>) =>
        CUT_TODAY.has(key)
          ? Math.max(room, ...sources.map((s, i) => widthIn(['he', 'en'][i]!, s(key, options), unit)))
          : room;
      const price =
        widthIn(lang, signedText(-16), fontOf(m.button.chipNumberStyle)) +
        m.button.chip.gap +
        widthIn(lang, t('arsenal.unit'), unit);
      expectRoom(lang, 'the price chip', price, room);
      const lock = m.button.chip.icon + m.button.chip.gap;
      for (const [key, options, extra] of [
        ['arsenal.missing', { count: 12 }, 0],
        ['arsenal.busy', undefined, 0],
        ['arsenal.unavailable', undefined, 0],
        ['arsenal.locked', undefined, lock],
        ['arsenal.level', { level: 12 }, lock],
      ] as const) {
        const words = t(key, options);
        expectRoom(lang, `game:${key} "${words}"`, widthIn(lang, words, unit) + extra, chip(key, options));
      }
    },
  );
});

/**
 * QA fixcheck of APK 15 (interference-picker-en-360-labels-clipped): English at 360 dp (wm density 480) with the
 * system text at 1.3. "Scrambled digits" / "Scrambled keypad" lost their second line under the chip (the name's
 * room stayed two design lines while React Native drew them 1.3 times as tall), the info line ended in "…" (one
 * line), and "Next: 4" broke between the word and its number. At that size, in every layout language: the names in
 * their two lines and a room as tall as they draw, the info in its lines, the number with its word, and every kind
 * still at once, never below the design's size.
 */
describe.each(layoutLanguages())('the picker in %s at a 1.3 system text size', (lang) => {
  const SCALE = 1.3;
  const m = arsenalMetricsFor(typefaceOf(lang), SCALE);
  const grown = (font: Font): Font => ({ ...font, fontSize: font.fontSize * SCALE });

  it('its words grow by the system size, up to the play surface’s cap, never below the design’s', () => {
    expect(m.textScale).toBe(SCALE);
    expect(arsenalMetricsFor(typefaceOf(lang), 2).textScale).toBe(1.35);
    expect(arsenalMetricsFor(typefaceOf(lang), 0.85).textScale).toBe(1);
    expect(arsenalMetricsFor(typefaceOf(lang), 0.85)).toEqual(arsenalMetricsFor(typefaceOf(lang)));
  });

  it.each(PHONES.filter(([width]) => width >= 360))(
    '%i × %i: a name’s two lines have the room they draw in; a name takes two lines, or shrinks to fit, never below the design’s size',
    async (width, height) => {
      const t = await fixedT(lang, 'game');
      const lineHeight = lineHeightAs(lang, m.button.nameStyle);
      expect(m.button.nameBox).toBeGreaterThanOrEqual(m.button.nameLines * lineHeight * SCALE);
      const layout = pickerLayout({ width, height, count: INTERFERENCE_KINDS.length, metrics: m });
      const column = layout.columnWidth - 2 * m.button.paddingX - 2 * tokens.border.hairline;
      for (const kind of INTERFERENCE_KINDS) {
        const name = t(`arsenal.kind.${kind}`);
        // KindButton shrinks a grown name that needs a third line (adjustsFontSizeToFit), down to 1 / textScale.
        const atGrown = lineCount(lang, name, grown(fontOf(m.button.nameStyle)), column);
        const atDesign = lineCount(lang, name, fontOf(m.button.nameStyle), column);
        expectFits(
          lang,
          `game:arsenal.kind.${kind} at ${SCALE}, or shrunk to the design's size, in ${m.button.nameLines} lines`,
          atGrown <= m.button.nameLines || atDesign <= m.button.nameLines,
        );
      }
    },
  );

  it.each(PHONES.filter(([width]) => width >= 360))(
    '%i × %i: the info line in its lines, never cut with "…"',
    async (width) => {
      const t = await fixedT(lang, 'game');
      const info = t('arsenal.info', { count: 5, seconds: 5 });
      const lines = BREAKS_IN_WORDS.has(lang)
        ? Math.ceil(widthIn(lang, info, grown(fontOf(text('micro')))) / (width - 2 * m.sheet.paddingX))
        : lineCount(lang, info, grown(fontOf(text('micro'))), width - 2 * m.sheet.paddingX);
      expect(m.info.lines).toBe(2);
      expectFits(lang, `game:arsenal.info at ${SCALE} in ${m.info.lines} lines`, lines <= m.info.lines);
      expect(m.info.height).toBeGreaterThanOrEqual(m.info.lines * m.info.line * SCALE);
    },
  );

  it('the price row puts its halves on two lines, each as tall as its grown number or words', () => {
    expect(m.price.stacked).toBe(true);
    expect(arsenalMetricsFor(typefaceOf(lang)).price.stacked).toBe(false);
    const label = lineHeightAs(lang, text('label'));
    const line = (number: TextStyle) => Math.max(number.lineHeight ?? 0, label) * SCALE;
    expect(
      m.price.height - 2 * tokens.border.hairline - 2 * m.price.paddingY - m.price.rowGap,
    ).toBeGreaterThanOrEqual(line(m.price.priceStyle) + line(m.price.scoreStyle));
  });

  // "· Next: 4" is one piece when grown (nextPriceText): on Android a piece wider than its room shrinks the whole
  // text, as far as 4 dp. So, measured as drawn, it fits its line at the grown size or shrunk to the design's size.
  it.each(PHONES.filter(([width]) => width >= 360))(
    '%i × %i: "· Next: 4" and "Your score" each on its line of the row, never below the design’s size',
    async (width, height, bottomInset) => {
      const t = await fixedT(lang, 'game');
      const { metrics } = fittedPicker(
        { width, height, bottomInset, count: INTERFERENCE_KINDS.length, fontScale: SCALE },
        (growth) => arsenalMetricsFor(typefaceOf(lang), growth),
      );
      const row = priceRowFits(lang, t as unknown as GameT, width, metrics);
      const at = `at ${metrics.textScale}`;
      // Its own line: even Spanish's and Portuguese's (cut in the shared line, PRICE_CUT_TODAY) fit.
      expectFits(lang, `game:arsenal.nextPrice "${row.next}" ${at}`, row.nextFits);
      expectFits(lang, `game:arsenal.score "${row.score}" ${at}`, row.scoreFits);
    },
  );

  it.each(PHONES)(
    '%i × %i: every kind at once, no scroll; the words grow less on a small phone, never below the design’s',
    (width, height, bottomInset) => {
      const fitted = fittedPicker(
        { width, height, bottomInset, count: INTERFERENCE_KINDS.length, fontScale: SCALE },
        (growth) => arsenalMetricsFor(typefaceOf(lang), growth),
      );
      expect(fitted.layout.fits).toBe(true);
      expect(fitted.metrics.textScale).toBeGreaterThanOrEqual(1);
      // Where the 1.3 text was reported (360 dp, 780 tall), it grows all the way.
      if (width === 360 && height === 780) expect(fitted.metrics.textScale).toBe(SCALE);
    },
  );
});

describe('"· Next: 4" keeps its number with its word, and the bullet with it (nextPriceText)', () => {
  it.each(layoutLanguages())('%s', async (lang) => {
    const t = await fixedT(lang, 'game');
    const words = nextPriceText(8, t as unknown as GameT);
    // The same words, drawn the same (a no-break space where a space was; French's own before ":" stays).
    expect(drawn(words)).toBe(drawn(t('arsenal.nextPrice', { cost: 8 })));
    // A line may break only between two words: never before the number, after the bullet, or before a ":".
    for (const breakable of words.matchAll(/ +/g)) {
      const at = breakable.index;
      expect(`${words.charAt(at - 1)}|${words.charAt(at + breakable[0].length)}`).toMatch(
        /^[\p{L}\p{M}]\|[\p{L}\p{M}]$/u,
      );
    }
    expect(words).not.toMatch(/ \S*8\S*$/);
    expect(words).not.toMatch(/^· /);
  });

  it('English: "·", "Next:" and "8" in one piece; Vietnamese may break between its two words', async () => {
    const nbsp = String.fromCharCode(0xa0);
    const at = async (lang: string) => nextPriceText(8, (await fixedT(lang, 'game')) as unknown as GameT);
    expect(await at('en')).toBe(`·${nbsp}Next:${nbsp}8`);
    expect(await at('fr')).toBe(`·${nbsp}Suivante${nbsp}:${nbsp}8`);
    expect(await at('vi')).toBe(`·${nbsp}Tiếp theo:${nbsp}8`);
  });
});
