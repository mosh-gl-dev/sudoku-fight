import { expectRoom, layoutLanguages, PHONE, widthIn } from '../../../components/ui/testing/layout';
import i18n from '../../../i18n';
import { size, space, tokens } from '../../../theme';
import { TITLE_FIT } from '../parts';

/**
 * "משחק חדש" on a 360 dp phone in every language, its words whole (QA run #2, B3 and B8: "Новая парт…",
 * "Nouvelle par…", "Pertandingan …" in the header, "Живые соперники в реальном вр…" beside "Рейтинговые"). D124: a
 * language that does not fit says it shorter. Widths in the font the app ships (layout.ts widthIn: measured where
 * the language draws in Rubik, estimated wide where it takes the system's). The rows' own fit is in
 * ModesAndGameType.test and modesChipWidth.test.
 */

/** A section label's row (parts SectionLabel): the screen less its gutters, the icon and the three gaps around the rule. */
const SECTION_ROW = PHONE.width - 2 * tokens.layout.gutterGame - size.icon.inline - 3 * space[4];
/** The least of the rule between a section's title and its note, so that it still reads "title ——— note". */
const RULE_MIN = space[8];
/**
 * The header's title when it comes first (ScreenHeader `fitTitle`): the row less its gutters, the back button,
 * the two gaps and my avatar (my name gives way first).
 */
const TITLE_ROOM =
  PHONE.width - 2 * tokens.layout.gutterGame - size.iconButton - 2 * space[6] - size.avatar.compact.frame;

describe('"משחק חדש" says its words whole on a 360 dp phone (B3, B8; D124)', () => {
  it('has a 286 dp section row and a 226 dp title', () => {
    expect([SECTION_ROW, TITLE_ROOM]).toEqual([286, 226]);
  });

  it.each(layoutLanguages())(
    'each section label: its title, a rule and its whole note on one line, online, offline or suspended (%s)',
    async (lang) => {
      await i18n.changeLanguage(lang);
      const title = (key: string) =>
        widthIn(lang, i18n.t(key), {
          fontFamily: tokens.type.label.fontFamily,
          fontSize: tokens.type.label.size,
        });
      const note = (key: string) =>
        widthIn(lang, i18n.t(key), {
          fontFamily: tokens.type.caption.fontFamily,
          fontSize: tokens.type.caption.size,
        });
      const labels: readonly (readonly [string, string])[] = [
        ['home:modes.groups.ranked.title', 'home:modes.groups.ranked.note'],
        ['home:modes.groups.practice.title', 'home:modes.groups.practice.note'],
        // Suspended (spec §3.5), and offline (spec §16.1: the practices first, then what needs the connection).
        ['home:modes.groups.ranked.title', 'moderation:suspended.chip'],
        ['home:modes.groups.practice.title', 'match:offline.practiceNote'],
        ['home:modes.needsConnection.rankedAndFriends', 'match:offline.rankedNote'],
      ];
      for (const [t, n] of labels)
        expectRoom(lang, `${t} ——— ${n}`, title(t) + RULE_MIN + note(n), SECTION_ROW);
    },
  );

  it.each(layoutLanguages())(
    'the header’s title fits its room, at its own size or shrunk no further than TITLE_FIT allows (%s)',
    async (lang) => {
      await i18n.changeLanguage(lang);
      const width = widthIn(lang, i18n.t('home:modes.title'), {
        fontFamily: tokens.type.screenTitle.fontFamily,
        fontSize: tokens.type.screenTitle.size,
      });
      expectRoom(lang, 'home:modes.title', width * TITLE_FIT.minimumFontScale, TITLE_ROOM);
    },
  );
});
