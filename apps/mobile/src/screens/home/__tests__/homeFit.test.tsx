import 'react-native-reanimated';

import { BOT_LEVEL_IDS, botLevel } from '@sudoku-fight/engine';
import { render, screen, within } from '@testing-library/react-native';
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { ltr } from '../../../components/player';
import {
  expectFits,
  fixedT,
  layoutLanguages,
  PHONE,
  setWindow,
  widthIn,
} from '../../../components/ui/testing/layout';
import type { PracticeGameRecord } from '../../../game/practiceRepo';
import i18n from '../../../i18n';
import { percent as percentText } from '../../../i18n/compose';
import { useSettings } from '../../../state/settings';
import { size, space, text, tokens } from '../../../theme';
import { playedAtText } from '../homeModel';
import { GUTTER } from '../parts';
import { ProfileCard } from '../ProfileCard';
import { RecentGames } from '../RecentGames';

/**
 * Home's rows keep their words whole on the phone (QA run #2, 1.1.0), in every layout language:
 * - B4: a recent game against a bot, "הפסד מול Mr. Hoot" beside its date, cut both ("הפסד מול Mr. …",
 *   "23 באוק׳, 0…"). The line wraps: the date goes under the result when the two don't fit, and either may take
 *   a second line on a narrow phone in a long language.
 * - B8: the profile card's numbers, "10 pertandingan" ran over its divider into "40% menang". The label goes
 *   under its number when the two don't fit its third of the card, and never past it.
 */

const flat = (style: unknown) => (StyleSheet.flatten(style as ViewStyle) ?? {}) as ViewStyle & TextStyle;
const font = (name: Parameters<typeof text>[0]) => ({
  fontFamily: text(name).fontFamily,
  fontWeight: text(name).fontWeight,
  fontSize: text(name).fontSize!,
});

/**
 * How many lines `line` takes in `room` dp, broken between words as the phone breaks them (ICU's word breaks:
 * spaces, and inside Japanese, Chinese and Thai); Infinity when one word alone is wider than the room.
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

/** That a line takes at most `most` lines in a layout language (expectFits). */
const expectLines = (lang: string, place: string, lines: number, most: number) =>
  expectFits(lang, lines <= most ? place : `${place}: ${lines} lines > ${most}`, lines <= most);

beforeEach(async () => {
  await i18n.changeLanguage('he');
  useSettings.setState({ reduceMotion: 'on' });
});

const record = (over: Partial<PracticeGameRecord> = {}): PracticeGameRecord => ({
  id: 'g1',
  mode: 'bot',
  gameType: 'fast',
  puzzleId: 'p1',
  playerId: 'me',
  seed: 1,
  startedAt: Date.UTC(2026, 9, 23, 9, 41),
  endedAt: Date.UTC(2026, 9, 23, 9, 50),
  status: 'finished',
  endReason: 'practiceEnded',
  score: 0,
  mistakes: 0,
  correct: 0,
  durationMs: 540_000,
  opponents: [{ id: 'bot-3', name: null, isBot: true }],
  place: 2,
  outcome: 'loss',
  engineVersion: 'test',
  ...over,
});

describe('a recent game against a bot keeps its result and its date whole (B4)', () => {
  it('the result and the date sit on a line that wraps, each whole (a second line before an ellipsis)', async () => {
    // At the normal text size (Jest's window is at fontScale 2, where nothing is capped: largeTextChips.test).
    const restore = setWindow(PHONE);
    await render(<RecentGames games={[record()]} status="ready" onOpen={jest.fn()} />);
    const sub = screen.getByTestId('recent-sub-g1');
    expect(flat(sub.props.style)).toMatchObject({ flexDirection: 'row', flexWrap: 'wrap' });
    expect(within(sub).getByText('הפסד מול ⁦Mr. Hoot⁩')).toHaveProp('numberOfLines', 2);
    expect(within(sub).getByText(playedAtText(record().startedAt, 'he'))).toHaveProp('numberOfLines', 2);
    await screen.unmount();
    await restore();
  });

  // The row on Moshe's phone: the gutters, the card's border and padding, the 36 avatar, three gaps, the numbers'
  // column (its widest line) and the chevron; what is left is the column of the words.
  async function wordsColumn(lang: string): Promise<number> {
    const tPlayer = await fixedT(lang, 'player');
    const numbers = Math.max(
      widthIn(lang, '84.5', font('scoreSm')),
      ...[0, 1, 2, 5, 11].map((count) =>
        widthIn(lang, tPlayer('mistakes.short', { count }), font('caption')),
      ),
    );
    return (
      PHONE.width -
      2 * GUTTER.home -
      2 * tokens.border.hairline -
      2 * space[6] -
      size.avatar.list.size -
      3 * space[6] -
      numbers -
      size.icon.chevron
    );
  }

  it('in Hebrew the two side by side are wider than the column (the phone’s case); each alone takes one line', async () => {
    const column = await wordsColumn('he');
    const t = await fixedT('he', 'home');
    const result = t('recent.versus', { outcome: t('recent.outcome.loss'), name: ltr('Mr. Hoot') });
    const when = playedAtText(record().startedAt, 'he');
    const both = widthIn('he', result, font('caption')) + space[4] + widthIn('he', when, font('caption'));
    expect(both).toBeGreaterThan(column);
    expect(linesIn('he', result, font('caption'), column)).toBe(1);
    expect(linesIn('he', when, font('caption'), column)).toBe(1);
  });

  it.each(layoutLanguages())(
    'the result against every bot and the date fit two lines each (%s)',
    async (lang) => {
      const column = await wordsColumn(lang);
      const t = await fixedT(lang, 'home');
      for (const outcome of ['win', 'loss', 'tie'] as const) {
        for (const level of BOT_LEVEL_IDS) {
          const line = t('recent.versus', {
            outcome: t(`recent.outcome.${outcome}`),
            name: ltr(botLevel(level).name),
          });
          expectLines(lang, `home:recent.versus "${line}"`, linesIn(lang, line, font('caption'), column), 2);
        }
      }
      for (let month = 0; month < 12; month++) {
        const when = playedAtText(Date.UTC(2026, month, 28, 22, 58), lang);
        expectLines(lang, `the date "${when}"`, linesIn(lang, when, font('caption'), column), 2);
      }
    },
  );
});

describe('the profile card’s numbers stay in their third of the card (B8)', () => {
  const props = { name: 'Moshe', avatarId: 'av00' as const, country: 'IL', winRate: 0.4, streak: 3 };

  it('a number and its label sit on a line that wraps; the label stays inside its third', async () => {
    await render(<ProfileCard {...props} gamesPlayed={10} />);
    for (const key of ['games', 'wins', 'streak']) {
      const stat = screen.getByTestId(`stat-${key}`);
      expect(flat(stat.props.style)).toMatchObject({ flexDirection: 'row', flexWrap: 'wrap', minWidth: 0 });
      const label = stat.children[1] as typeof stat;
      expect(label).toHaveProp('numberOfLines', 2);
      expect(flat(label.props.style)).toMatchObject({ flexShrink: 1 });
    }
  });

  // A third of the card on Moshe's phone: the gutters, the card's border and padding, and the two rules between.
  const third =
    (PHONE.width -
      2 * GUTTER.home -
      2 * tokens.border.hairline -
      2 * tokens.layout.home.profileCardPadding -
      2 * tokens.border.hairline) /
    3;

  it('in Indonesian "10 pertandingan" is wider than its third (the phone’s case); the label alone takes one line', async () => {
    const t = await fixedT('id', 'home');
    const label = t('profile.gamesLabel', { count: 10 });
    const line = widthIn('id', '10', font('scoreSm')) + space[3] + widthIn('id', label, font('caption'));
    expect(line).toBeGreaterThan(third);
    expect(linesIn('id', label, font('caption'), third)).toBe(1);
  });

  it.each(layoutLanguages())(
    'each number fits its third, and each label two lines of it (%s)',
    async (lang) => {
      const t = await fixedT(lang, 'home');
      const labels = [
        ...[0, 1, 2, 5, 10, 11, 21, 100].map((count) => t('profile.gamesLabel', { count })),
        t('profile.winsLabel'),
        t('profile.streakLabel'),
      ];
      for (const label of labels) {
        expectLines(lang, `home:profile label "${label}"`, linesIn(lang, label, font('caption'), third), 2);
      }
      for (const value of ['1000', ltr(percentText(100, t)), t('profile.none')]) {
        expectLines(lang, `the number "${value}"`, linesIn(lang, value, font('scoreSm'), third), 1);
      }
    },
  );
});
