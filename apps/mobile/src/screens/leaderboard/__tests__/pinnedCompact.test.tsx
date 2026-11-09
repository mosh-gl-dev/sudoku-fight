import { render, screen, within } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';

import { entry } from '../../../api/testing/fakeProgress';
import { metrics } from '../../../components/player/metrics';
import { fixedT, PHONE, widthIn } from '../../../components/ui/testing/layout';
import i18n from '../../../i18n';
import { size, space, text, tokens } from '../../../theme';
import { LeaderboardRow, PinnedMe } from '../LeaderboardParts';

/**
 * B23 (QA run #2, the A16): my pinned row, beside "שחק", cut the line under my name, "בדירוג זמני · ר…", where a
 * list row has it whole. The pinned row is narrow (spec §14.2: "#214 · MosheG · 1287", "שחק" beside it): the
 * provisional chip goes under the rating, which gives the line its room, and the line may take a second line before
 * an ellipsis. A list row keeps the chip beside its number, on one line.
 */

const hidden = { includeHiddenElements: true };
const ME = entry({
  id: 'me',
  displayName: 'מומו',
  rank: 1,
  rating: 1235,
  league: null,
  level: 4,
  provisional: true,
});
const flat = (style: unknown) => (StyleSheet.flatten(style as ViewStyle) ?? {}) as ViewStyle;
const font = (name: Parameters<typeof text>[0]) => ({
  fontFamily: text(name).fontFamily,
  fontWeight: text(name).fontWeight,
  fontSize: text(name).fontSize!,
});

/**
 * How many lines `line` takes in `room` dp, broken between words as the phone breaks them; Infinity when one word
 * alone is wider than the room.
 */
function linesIn(lang: string, line: string, style: ReturnType<typeof font>, room: number): number {
  const words = [...new Intl.Segmenter(lang, { granularity: 'word' }).segment(line)].map((s) => s.segment);
  let lines = 1;
  let current = '';
  for (const word of words) {
    const next = current + word;
    if (widthIn(lang, next.trim(), style) <= room) {
      current = next;
      continue;
    }
    if (widthIn(lang, word.trim(), style) > room) return Infinity;
    lines += 1;
    current = word.trimStart();
  }
  return lines;
}

/** The rating's number and its chip: their row, under the rating's own view. */
const ratingStack = (row: ReturnType<typeof screen.getByTestId>) =>
  within(row).getByText('1235', hidden).parent!;

beforeEach(async () => {
  await i18n.changeLanguage('he');
});

describe('my pinned row keeps the line under my name whole (B23)', () => {
  it('pinned: the whole line, a second line before an ellipsis, and "זמני" under the rating', async () => {
    await render(<PinnedMe me={ME} onOpen={jest.fn()} onPlay={jest.fn()} />);
    const row = screen.getByTestId('leaderboard-me-row');
    expect(within(row).getByText('בדירוג זמני · רמה 4', hidden)).toHaveProp('numberOfLines', 2);
    expect(within(row).getByText('זמני', hidden)).toBeTruthy();
    expect(flat(ratingStack(row).props.style).flexDirection).toBeUndefined();
    // A screen reader hears the same as before.
    expect(row).toHaveProp('accessibilityLabel', expect.stringContaining('מומו (אתה)'));
  });

  it('a list row is as it was: the full line and the chip beside the number', async () => {
    await render(<LeaderboardRow entry={ME} mine onOpen={jest.fn()} testID="listed" />);
    const row = screen.getByTestId('listed');
    expect(within(row).getByText('בדירוג זמני · רמה 4', hidden)).toHaveProp('numberOfLines', 1);
    expect(flat(ratingStack(row).props.style).flexDirection).toBe('row');
  });

  // The pinned row's name column: the phone less the gutters, the gap and "שחק" (its label and padding), the card's
  // border and padding, the rank ("#214"), three gaps, the 34 avatar and the rating (the number and the chip,
  // beside or stacked).
  async function nameColumn(width: number, stacked: boolean): Promise<number> {
    const t = await fixedT('he', 'progress');
    const tPlayer = await fixedT('he', 'player');
    const play = widthIn('he', t('leaderboard.play'), font('h2')) + 2 * space[10];
    const rank = Math.max(space[10], widthIn('he', '#214', font('label')));
    const listStyle = metrics.rating.listStyle;
    const number = widthIn('he', '1235', { fontFamily: listStyle.fontFamily, fontSize: listStyle.fontSize! });
    const chip =
      widthIn('he', tPlayer('rating.provisional'), font('plateNameCompact')) +
      2 * metrics.rating.provisionalPaddingX +
      2 * tokens.border.hairline;
    const rating = stacked ? Math.max(number, chip) : number + space[2] + chip;
    return (
      width -
      2 * tokens.layout.gutterGame -
      space[4] -
      play -
      2 * tokens.border.hairline -
      2 * space[5] -
      rank -
      3 * space[5] -
      size.avatar.compact.frame -
      rating
    );
  }

  /** The A16 of QA run #2 (1080 px at 2.8125). */
  const A16 = 384;

  it('on the A16 the line did not fit beside the chip; with the chip under the rating it fits one line there, two on Moshe’s phone', async () => {
    const t = await fixedT('he', 'progress');
    const tPlayer = await fixedT('he', 'player');
    const line = `${t('common.provisional')}${tPlayer('sep')}${t('common.level', { level: 14 })}`;
    expect(widthIn('he', line, font('micro'))).toBeGreaterThan(await nameColumn(A16, false));
    expect(linesIn('he', line, font('micro'), await nameColumn(A16, true))).toBe(1);
    expect(linesIn('he', line, font('micro'), await nameColumn(PHONE.width, true))).toBeLessThanOrEqual(2);
    for (const width of [PHONE.width, A16]) {
      const column = await nameColumn(width, true);
      expect(column).toBeGreaterThan((await nameColumn(width, false)) + space[10]);
      // My name and its seat glyph (10, the name row's gap 6) have room too.
      expect(widthIn('he', 'מומו', font('playerName')) + space[3] + space[5]).toBeLessThanOrEqual(column);
    }
  });
});
