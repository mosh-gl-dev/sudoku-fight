import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';

import { entry } from '../../../api/testing/fakeProgress';
import { metrics } from '../../../components/player/metrics';
import { fixedT, setWindow, widthIn } from '../../../components/ui/testing/layout';
import i18n from '../../../i18n';
import { size, space, text, tokens } from '../../../theme';
import { Segmented } from '../../progress/parts';
import { LeaderboardRow, PinnedMe } from '../LeaderboardParts';
import { tightRows } from '../rowFit';

/**
 * QA loop 7 (postgame-leaderboard-english, general-display-small-big-font): my pinned row in English on the A16
 * drew "· Level 6" over the provisional chip ("LevelProvisional"); at 360 dp and font 1.3 "זמני" sat on the "6" in
 * Hebrew too, "Bronze" and "Level 6" broke in the middle, Hebrew names in the list came out as one letter, and the
 * tabs were cut ("Gene…", "Nor…", "Frien…"). The line under a name wraps between its parts; on a narrow phone or at
 * a large text size the chip joins that line and "שחק" goes under my row; the tabs wrap when a label does not fit.
 */

const hidden = { includeHiddenElements: true };
const flat = (el: { props: { style?: unknown } }) =>
  (StyleSheet.flatten(el.props.style as ViewStyle) ?? {}) as ViewStyle;
const font = (name: Parameters<typeof text>[0]) => ({
  fontFamily: text(name).fontFamily,
  fontWeight: text(name).fontWeight,
  fontSize: text(name).fontSize!,
});
const LIST = metrics.rating.listStyle;
const numberFont = { fontFamily: LIST.fontFamily, fontSize: LIST.fontSize! };

/** Akhvata's account in QA: Bronze, level 6, a provisional 1200, 4th. */
const ME = (displayName: string) =>
  entry({ id: 'me', displayName, rank: 4, rating: 1200, league: 'bronze', level: 6, provisional: true });

let restore: (() => Promise<void>) | null = null;
afterEach(async () => {
  await restore?.();
  restore = null;
});

async function phone(lang: 'he' | 'en', width: number, fontScale: number) {
  await i18n.changeLanguage(lang);
  restore = setWindow({ width, fontScale });
}

/** The parts of the line under my name, each of which must fit the name's column whole. */
async function underParts(lang: 'he' | 'en', fontScale: number, chip: boolean) {
  const t = await fixedT(lang, 'player');
  const micro = (s: string) => widthIn(lang, s, font('micro'), { fontScale });
  const parts = [
    metrics.league.hexWidth + metrics.league.gap + micro(t('league.bronze')),
    micro(t('league.levelAfter', { level: 6 })),
  ];
  if (chip) {
    parts.push(
      widthIn(lang, t('rating.provisional'), font('plateNameCompact'), { fontScale }) +
        2 * metrics.rating.provisionalPaddingX +
        2 * tokens.border.hairline,
    );
  }
  return parts;
}

describe('the line under a name wraps, never over the rating', () => {
  it('English on the A16 (384 dp, normal size): "Bronze · Level 6" is wider than the column, so the level wraps', async () => {
    await phone('en', 384, 1);
    expect(tightRows(384, 1)).toBe(false);
    await render(<PinnedMe me={ME('אחוותא')} onOpen={jest.fn()} onPlay={jest.fn()} />);
    const row = screen.getByTestId('leaderboard-me-row');
    const badge = within(row).getByTestId('league-bronze', hidden);
    expect(flat(badge)).toMatchObject({ flexWrap: 'wrap', maxWidth: '100%' });
    expect(flat(within(row).getByTestId('under-leaderboard-me-row', hidden))).toMatchObject({
      flexWrap: 'wrap',
    });
    // The column beside "Play" and the rating with its chip under it (B23).
    const t = await fixedT('en', 'progress');
    const tp = await fixedT('en', 'player');
    const play = widthIn('en', t('leaderboard.play'), font('h2')) + 2 * space[10];
    const chip =
      widthIn('en', tp('rating.provisional'), font('plateNameCompact')) +
      2 * metrics.rating.provisionalPaddingX +
      2;
    const rating = Math.max(widthIn('en', '1200', numberFont), chip);
    const rank = Math.max(space[10], widthIn('en', '#4', font('label')));
    const column =
      384 -
      2 * tokens.layout.gutterGame -
      space[4] -
      play -
      2 -
      2 * space[5] -
      rank -
      3 * space[5] -
      34 -
      rating;
    const [tier, level] = await underParts('en', 1, false);
    expect(tier! + metrics.league.gap + level!).toBeGreaterThan(column);
    expect(tier).toBeLessThanOrEqual(column);
    expect(level).toBeLessThanOrEqual(column);
  });
});

describe.each(['he', 'en'] as const)('360 dp at font 1.3 (%s)', (lang) => {
  const name = lang === 'he' ? 'אחוותא' : 'Akhvata';

  it('my pinned row: "Play" under it, the chip in the line under my name, every part whole', async () => {
    await phone(lang, 360, 1.3);
    await render(<PinnedMe me={ME(name)} onOpen={jest.fn()} onPlay={jest.fn()} />);
    expect(flat(screen.getByTestId('leaderboard-me')).flexDirection).not.toBe('row');
    const row = screen.getByTestId('leaderboard-me-row');
    const under = within(row).getByTestId('under-leaderboard-me-row', hidden);
    const tp = await fixedT(lang, 'player');
    expect(within(under).getByText(tp('rating.provisional'), hidden)).toHaveProp('numberOfLines', 1);
    // The number alone at the row's end: no chip beside or under it.
    expect(within(row).getAllByText(tp('rating.provisional'), hidden)).toHaveLength(1);

    const f = 1.3;
    const rank = Math.max(space[10], widthIn(lang, '#4', font('label'), { fontScale: f }));
    const column =
      360 -
      2 * tokens.layout.gutterGame -
      2 * tokens.border.hairline -
      2 * space[5] -
      rank -
      3 * space[5] -
      size.avatar.compact.frame -
      widthIn(lang, '1200', numberFont, { fontScale: f });
    for (const part of await underParts(lang, f, true)) expect(part).toBeLessThanOrEqual(column);
    // My name whole, with its glyph.
    expect(
      widthIn(lang, name, font('playerName'), { fontScale: f }) + space[3] + space[5],
    ).toBeLessThanOrEqual(column);
  });

  it('a list row: the chip under the name, so a Hebrew name is not cut to a letter', async () => {
    await phone(lang, 360, 1.3);
    const other = entry({
      id: 'p9',
      displayName: 'ליהי33',
      rank: 2,
      rating: 1233,
      league: 'bronze',
      level: 3,
      provisional: true,
    });
    await render(<LeaderboardRow entry={other} mine={false} onOpen={jest.fn()} testID="listed" />);
    const row = screen.getByTestId('listed');
    const tp = await fixedT(lang, 'player');
    expect(
      within(within(row).getByTestId('under-listed', hidden)).getByText(tp('rating.provisional'), hidden),
    ).toBeTruthy();
    const f = 1.3;
    const rank = Math.max(space[14], widthIn(lang, '#2', font('label'), { fontScale: f }));
    const column =
      360 -
      2 * tokens.layout.gutterGame -
      2 * tokens.border.hairline -
      2 * space[5] -
      rank -
      3 * space[5] -
      size.avatar.compact.frame -
      widthIn(lang, '1233', numberFont, { fontScale: f });
    const flag = 13 + space[3];
    expect(widthIn(lang, 'ליהי33', font('playerName'), { fontScale: f }) + flag).toBeLessThanOrEqual(column);
    for (const part of await underParts(lang, f, true)) expect(part).toBeLessThanOrEqual(column);
  });

  it('the tabs wrap rather than cut a label', async () => {
    await phone(lang, 360, 1.3);
    const t = await fixedT(lang, 'progress');
    const keys = ['general', 'fast', 'normal', 'hard', 'friends'] as const;
    const items = keys.map((key) => ({ key, label: t(`leaderboard.tabs.${key}`), testID: `tab-${key}` }));
    await render(
      <Segmented role="tab" label="tabs" items={items} value="general" onChange={jest.fn()} testID="tabs" />,
    );
    const row = 360 - 2 * tokens.layout.gutterGame;
    const labels = items.map((it) => widthIn(lang, it.label, font('label'), { fontScale: 1.3 }));
    await act(async () => {
      fireEvent(screen.getByTestId('tabs'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: row, height: 44 } },
      });
      labels.forEach((w, k) =>
        fireEvent(screen.getByTestId(`probe-segment-${k}`, hidden), 'layout', {
          nativeEvent: { layout: { x: 0, y: 0, width: w, height: 17 } },
        }),
      );
    });
    if (lang === 'en') expect(flat(screen.getByTestId('tabs')).flexWrap).toBe('wrap');
    for (const key of keys) {
      const segment = flat(screen.getByTestId(`tab-${key}`));
      if (flat(screen.getByTestId('tabs')).flexWrap === 'wrap') {
        // Each as wide as its label at least: nothing cut.
        expect(segment).toMatchObject({ flexGrow: 1, flexShrink: 0 });
      } else {
        // Equal shares, as designed, only where every label fits one.
        const share = (row - 4 * space[2]) / 5;
        expect(Math.max(...labels) + 2 * space[2] + 2).toBeLessThanOrEqual(share);
      }
    }
  });
});

it('the tabs keep their equal shares where every label fits (360 dp, normal size, English)', async () => {
  await phone('en', 360, 1);
  const t = await fixedT('en', 'progress');
  const keys = ['general', 'fast', 'normal', 'hard', 'friends'] as const;
  const items = keys.map((key) => ({ key, label: t(`leaderboard.tabs.${key}`), testID: `tab-${key}` }));
  await render(
    <Segmented role="tab" label="tabs" items={items} value="general" onChange={jest.fn()} testID="tabs" />,
  );
  await act(async () => {
    fireEvent(screen.getByTestId('tabs'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 328, height: 44 } },
    });
    items.forEach((it, k) =>
      fireEvent(screen.getByTestId(`probe-segment-${k}`, hidden), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: widthIn('en', it.label, font('label')), height: 13 } },
      }),
    );
  });
  expect(flat(screen.getByTestId('tabs')).flexWrap).toBeUndefined();
  expect(flat(screen.getByTestId('tab-general'))).toMatchObject({ flex: 1 });
});
