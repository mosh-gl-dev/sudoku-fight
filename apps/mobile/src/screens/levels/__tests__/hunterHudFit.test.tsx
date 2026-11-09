import type { TextStyle } from 'react-native';

import { scoreText, signedText } from '../../../components/player/format';
import {
  expectFits,
  expectRoom,
  fixedT,
  layoutLanguages,
  PHONE,
  typefaceOf,
  widthIn,
} from '../../../components/ui/testing/layout';
import { FONT_SCALE_CAPS } from '../../../components/ui/Text';
import { decimalSeparator } from '../../../i18n/compose';
import { levelsOf } from '../../../levels/__tests__/helpers/levelsOf';
import { space, text, tokens } from '../../../theme';
import { HUNT_ROW } from '../hud/PointHunterHud';

/**
 * B25/B29 (QA run 2, 2026-11-02): on L041, after a wrong digit, the score became "‎−0.5" and its row ran over the
 * move dots ("נקודות" on "מהלך 2 נשרף", the "‎−4" on the dots). The row is three columns (PointHunterHud): my
 * points in one half, the dots and "מהלך 1 מתוך 3" in the middle, the clock in the other half. Here, in the font
 * the app ships (layout.ts widthIn), on Moshe's phone (360 dp), at the normal text size and at the HUD's largest
 * (×1.35: every larger system size stops there, Text `scale`), in every language:
 * - the move words take two lines at most within `movesTextMax`;
 * - "נקודות" and the burned move's chip leave the number room in its half;
 * - the widest score a shipped stage can reach shows whole at `scoreMinFontScale` or more (never "…").
 * The number itself never grows with the system text (`scale="board"`).
 */

type Font = { fontFamily?: string; fontWeight?: TextStyle['fontWeight']; fontSize: number };
const fontOf = (style: TextStyle): Font => ({
  fontFamily: style.fontFamily,
  fontWeight: style.fontWeight,
  fontSize: style.fontSize!,
});

/** How many lines `words` take in `room` at `scale`, broken between words (anywhere in a script without spaces). */
function lineCount(lang: string, words: string, font: Font, room: number, scale: number): number {
  const spaced = /\s/.test(words.trim());
  const pieces = spaced ? words.trim().split(/\s+/) : [...words];
  const width = (s: string) => widthIn(lang, s, font) * scale;
  let lines = 1;
  let line = '';
  for (const piece of pieces) {
    if (width(piece) > room) return Infinity;
    const next = line ? `${line}${spaced ? ' ' : ''}${piece}` : piece;
    if (width(next) <= room) line = next;
    else {
      lines += 1;
      line = piece;
    }
  }
  return lines;
}

const ROW = PHONE.width - 2 * tokens.layout.gutterGame;
/** The three move dots, 14 dp each, 8 apart. */
const DOTS = 3 * 14 + 2 * space[4];
const CHIP_FRAME = 2 * space[3] + 2 * tokens.border.hairline;

/**
 * The widest scores a shipped stage can reach: every move a wrong digit in its costliest cell (a wrong digit
 * costs what the right one would score there, rules.scoreY: "‎−28.5" today), and its best line (27.5 today).
 */
const hunters = [...levelsOf('pointHunter'), ...levelsOf('pointHunter', { boss: true })];
const costliest = Math.max(...hunters.flatMap((l) => l.targets.best.map((m) => m.points)));
const bestLine = Math.max(...hunters.map((l) => l.targets.best.reduce((sum, m) => sum + m.points, 0)));
const maxMoves = Math.max(...hunters.map((l) => l.targets.maxMoves));
const SCORES = [-maxMoves * costliest, -(maxMoves - 1) * costliest + 0.5, -0.5, bestLine];

describe.each(layoutLanguages())('the point hunter’s row in %s (B25)', (lang) => {
  it.each([1, FONT_SCALE_CAPS.hud])(
    'at text size ×%s, nothing runs over the dots and the score shows whole',
    async (scale) => {
      const t = await fixedT(lang, 'levels');
      const typeface = typefaceOf(lang);
      const caption = fontOf(text('caption', typeface));
      const decimal = decimalSeparator(t);

      // The middle column: the dots, or the move words up to `movesTextMax` (two lines at most).
      const words = [1, 2, 3].flatMap((n) => [t('hud.hunt.move', { n, max: 3 }), t('hud.hunt.burnt', { n })]);
      let middle = DOTS;
      for (const w of words) {
        expectFits(
          lang,
          `"${w}" in two lines`,
          lineCount(lang, w, caption, HUNT_ROW.movesTextMax, scale) <= 2,
        );
        middle = Math.max(middle, Math.min(widthIn(lang, w, caption) * scale, HUNT_ROW.movesTextMax));
      }
      const half = (ROW - middle - 2 * space[4]) / 2;

      // Beside the number: the burned move's chip ("‎−9.5" at most) over "נקודות", which never shrink.
      const badge = fontOf(text('badge', typeface));
      const chip = widthIn(lang, signedText(-costliest, decimal), badge) * scale + CHIP_FRAME;
      const side = Math.max(widthIn(lang, t('hud.hunt.points'), caption) * scale, chip);
      const room = half - space[3] - side;

      for (const score of SCORES) {
        const shown = scoreText(score, decimal);
        const least = widthIn(lang, shown, fontOf(text('scoreXL'))) * HUNT_ROW.scoreMinFontScale;
        expectRoom(lang, `"${shown}" at ${HUNT_ROW.scoreMinFontScale} of its size`, least, room);
      }
    },
  );
});
