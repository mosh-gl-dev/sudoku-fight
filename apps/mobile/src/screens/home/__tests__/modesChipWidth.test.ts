import { maxLevel } from '@sudoku-fight/engine';

import { expectRoom, layoutLanguages, PHONE, widthIn } from '../../../components/ui/testing/layout';
import i18n from '../../../i18n';
import { isPseudoLanguage } from '../../../i18n/languages';
import { size, space, tokens } from '../../../theme';
import { CHIP } from '../parts';

/**
 * "אימון בשלבים" on "משחק חדש" (D48; components.md §19.1): its chips stay on one line on Moshe's phone (360 dp),
 * even at the very end ("שלב 300 · ★ 900"), or the six rows no longer fit without scrolling
 * (ModesAndGameType.test: a row is 77). Measured in the font the app ships (fontMetrics: the glyphs' real
 * advances), in every layout language the app has strings for (layout.ts widthIn: estimated by script where the
 * language takes the system's font; localization plan 0טו).
 *
 * The column the chips have: the screen less its gutters (16 each side), the card's border and padding (1 and
 * 12), the 44 picture, the gap after it (12) and the chevron (20): 226. The chips' line, the card's bottom one,
 * runs into the gap before the chevron (QA run #2, B9: "Aşama 300 · ★ 900" and Turkish's own "Çevrimdışı").
 */

const COLUMN =
  PHONE.width -
  2 * tokens.layout.gutterGame -
  2 * tokens.border.hairline -
  2 * space[6] -
  size.avatar.card.frame -
  space[6] -
  size.icon.chevron;
/** Between two chips (ModesScreen's chips row). */
const CHIPS_GAP = space[3];

const words = (text: string) =>
  widthIn(i18n.language, text, { fontFamily: CHIP.font.fontFamily, fontSize: CHIP.font.size });
const chip = (inner: number) => 2 * CHIP.paddingX + 2 * CHIP.border + inner;
/** "שלב 300 ·", the star, "900". */
const progressChip = () =>
  chip(
    words(i18n.t('home:modes.levels.chip', { stage: maxLevel() })) +
      CHIP.gap +
      CHIP.icon +
      CHIP.gap +
      words(String(3 * maxLevel())),
  );

describe('the staged practice row’s chips fit one line (Modes-Levels, D48)', () => {
  it('has a 226 dp column: the texts’ 214 and the gap before the chevron', () => {
    expect(COLUMN).toBe(226);
  });

  it.each(layoutLanguages())('at the end, "שלב 300 · ★ 900" and its offline chip fit (%s)', async (lang) => {
    await i18n.changeLanguage(lang);
    const line = progressChip() + CHIPS_GAP + chip(words(i18n.t('home:modes.levels.offline')));
    expectRoom(lang, 'home:modes.levels.chip and home:modes.levels.offline', line, COLUMN);
  });

  it.each(layoutLanguages())(
    'a new player: the full "עובד גם בלי אינטרנט" alone, online or not (%s)',
    async (lang) => {
      await i18n.changeLanguage(lang);
      expectRoom(lang, 'home:modes.chips.offline', chip(words(i18n.t('home:modes.chips.offline'))), COLUMN);
      expectRoom(
        lang,
        'match:offline.availableOffline',
        chip(words(i18n.t('match:offline.availableOffline'))),
        COLUMN,
      );
    },
  );

  // QA run #2, B3: in Russian and French "Без рейтинга" | "Работает без сети" went to two lines on both practice
  // rows, and staged practice slid under the friends buttons.
  it.each(layoutLanguages())(
    'a practice row: "ללא דירוג" and "עובד גם בלי אינטרנט" side by side, online or not (%s)',
    async (lang) => {
      await i18n.changeLanguage(lang);
      const unrated = chip(words(i18n.t('home:modes.chips.unrated')));
      for (const works of ['home:modes.chips.offline', 'match:offline.availableOffline'])
        expectRoom(
          lang,
          `home:modes.chips.unrated and ${works}`,
          unrated + CHIPS_GAP + chip(words(i18n.t(works))),
          COLUMN,
        );
    },
  );

  it('the long words would not fit beside the progress chip: why the row says them short', async () => {
    await i18n.changeLanguage('he');
    expect(progressChip() + CHIPS_GAP + chip(words(i18n.t('home:modes.chips.offline')))).toBeGreaterThan(
      COLUMN,
    );
  });

  // QA 2026-11-03: the short chip read "Offline" in de, it, nl and id, beside "Auch offline", "Anche offline",
  // "Werkt offline" and "Bisa offline" on the rows above it. It says the row's offline in the language's own
  // words, the same word as its other offline chips (a language without spaces: the same two letters at least).
  it.each(layoutLanguages().filter((lang) => !isPseudoLanguage(lang)))(
    'the short offline chip uses the word of the other offline chips, never the bare English "Offline" (%s)',
    async (lang) => {
      await i18n.changeLanguage(lang);
      const short = i18n.t('home:modes.levels.offline');
      const long = i18n.t('home:modes.chips.offline');
      if (lang !== 'en') expect({ lang, short: short.toLowerCase() }).not.toEqual({ lang, short: 'offline' });
      if (OWN_SHORT_WORD[lang] !== undefined) return;
      expect({ lang, short, long, shared: sharesWord(short, long) }).toEqual({
        lang,
        short,
        long,
        shared: true,
      });
    },
  );
});

/**
 * The languages whose short chip has a word of its own, and why: the source's, and two where the other chips'
 * word does not fit beside "שלב 300 · ★ 900" (the test above; widths at the end of the game, of 226).
 */
const OWN_SHORT_WORD: Readonly<Record<string, string>> = {
  he: 'the source: "גם אופליין" beside "עובד גם בלי אינטרנט"',
  ar: 'as the source\'s "אופליין": "دون اتصال" is 228 beside "مرحلة 300 · ★ 900"',
  ja: '"通信不要" (no connection needed): "オフライン対応" is 242 beside "ステージ300 · ★ 900"',
};

/** Whether two labels share a word (3 letters at least), or, written without spaces, two letters in a row. */
function sharesWord(a: string, b: string): boolean {
  const words = (s: string) =>
    s
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => [...w].length >= 3);
  if (/\s/.test(a) || /\s/.test(b)) return words(a).some((w) => words(b).includes(w));
  const chars = [...a];
  return chars.slice(0, -1).some((c, i) => b.includes(c + chars[i + 1]));
}
