import { render, screen } from '@testing-library/react-native';

import { expectFits, layoutLanguages, PHONE, widthIn } from '../../../components/ui/testing/layout';
import i18n from '../../../i18n';
import { space, tokens } from '../../../theme';
import { Choice, SEGMENT_LINES } from '../SettingControls';

/**
 * The settings' "הפחתת תנועה" choice in every language (QA run #2: "Как на устр…" in Russian, "Come il disp…" in
 * Italian; en-XA's "[Ļîķé ťĥé ðévîçé…"): three segments in the screen's width, each word whole, on at most two
 * lines in the segment's 44. Widths in the app's font (layout.ts widthIn).
 */

/** A third of the choice: the screen less its gutters, the frame's border and padding, and the gaps between segments. */
const SEGMENT =
  (PHONE.width - 2 * tokens.layout.gutterGame - 2 * tokens.border.hairline - 2 * space[2] - 2 * space[2]) / 3;
/** What a segment leaves its words: its padding and its border on each side. */
const ROOM = SEGMENT - 2 * space[4] - 2 * tokens.border.hairline;
/** A script that breaks a line anywhere (no spaces between its words). */
const BREAKS_ANYWHERE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u;

/** How many lines `words` take in `room`, broken between words as the phone does (anywhere in CJK and Thai). */
function linesOf(lang: string, words: string, room: number): number {
  const width = (s: string) =>
    widthIn(lang, s, { fontFamily: tokens.type.buttonSm.fontFamily, fontSize: tokens.type.buttonSm.size });
  if (BREAKS_ANYWHERE.test(words)) return Math.ceil(width(words) / room);
  let lines = 1;
  let line = '';
  for (const word of words.split(/\s+/)) {
    if (width(word) > room) return Infinity;
    const next = line ? `${line} ${word}` : word;
    if (width(next) <= room) line = next;
    else {
      lines += 1;
      line = word;
    }
  }
  return lines;
}

describe('"הפחתת תנועה": every option whole in its segment (after B3)', () => {
  it('lets a segment’s words take two lines', async () => {
    const options = [
      { value: 'system', label: 'Как на устройстве' },
      { value: 'on', label: 'Вкл.' },
    ] as const;
    await render(<Choice label="Меньше движения" options={options} value="on" onChange={jest.fn()} />);
    expect(screen.getByText('Как на устройстве')).toHaveProp('numberOfLines', SEGMENT_LINES);
    expect(SEGMENT_LINES).toBe(2);
  });

  it.each(layoutLanguages())('%s', async (lang) => {
    await i18n.changeLanguage(lang);
    for (const key of ['system', 'on', 'off']) {
      const label = i18n.t(`home:settings.reduceMotion.${key}`);
      const lines = linesOf(lang, label, ROOM);
      expectFits(lang, `home:settings.reduceMotion.${key}: ${lines} lines`, lines <= SEGMENT_LINES);
    }
  });
});
