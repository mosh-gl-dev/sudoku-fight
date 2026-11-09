import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { wordsOf } from '../../../components/player/statusFit';
import { setWindow, widthIn } from '../../../components/ui/testing/layout';
import { size, space, text, tokens } from '../../../theme';
import { type Setup, setUp } from '../../game/connection/testing/setup';
import type { MatchScreenModel } from '../matchModel';
import { metrics } from '../metrics';
import { SearchView } from '../SearchView';

/**
 * QA loop 7 (ranked-four-type-and-search): at a table of 4 on a Galaxy A16, "כרגע אין מספיק שחקנים…" with
 * "שחק מול בוט בינתיים" pushed "יריבים 0/3" down, and the three empty seats went under "ביטול חיפוש" ("מחפש…"
 * only after a scroll). With the notice the radar, the seats and the gaps give the room back, so the whole
 * column fits above the cancel button on that phone; no text is smaller.
 */

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);

type SearchModel = Extract<MatchScreenModel, { kind: 'search' }>;

const model = (alone: boolean, players = 4): SearchModel => ({
  kind: 'search',
  header: { players, gameType: 'normal' },
  connecting: false,
  elapsedMs: 12_000,
  me: { name: 'Moshe', avatarId: 'lava-lamp', rating: 1200 },
  range: alone ? null : { low: 1150, high: 1250, half: 50, extended: false, widened: 0 },
  openSeats: players - 1,
  requeued: false,
  alone,
});

const flat = (el: { props: { style?: unknown } }) =>
  StyleSheet.flatten(el.props.style as never) as Record<string, number>;

let env: Setup;
afterEach(() => env.restore());

async function show(alone: boolean, lang: 'he' | 'en' = 'he') {
  env = await setUp(lang, 'off');
  await render(<SearchView model={model(alone)} reduce={false} onCancel={jest.fn()} onBot={jest.fn()} />);
}

/** Line heights as drawn (the type tokens), and a button's height. */
const line = (name: Parameters<typeof text>[0]) => text(name).lineHeight as number;

/**
 * The column's height on a Galaxy A16 (384 × 832 dp, 3-button navigation): what the search shows with the notice,
 * from the rendered sizes, against the room above the footer ("ביטול חיפוש").
 */
function columnHeight() {
  const radar = flat(screen.getByTestId('match-search-radar')).height!;
  const seat = flat(screen.getAllByTestId('empty-seat')[0]!).height!;
  const gap = flat(screen.getByTestId('match-search-column')).gap ?? 0;
  const chip = metrics.chipHeight;
  const title = line('screenTitle') + space[3] + line('scoreCompact') + 4;
  // The notice in Hebrew on 384 dp: padding, the icon, a 2-line title, a 3-line body, the bot button.
  const notice = 2 * space[7] + 16 + space[3] + 2 * line('rowTitle') + space[3] + 3 * line('body') + space[5];
  const noticeButton = size.buttonMd;
  const seatsHeader = line('micro') + space[6];
  // chip · title · radar · notice · seats: four gaps between five blocks.
  return chip + title + radar + notice + noticeButton + seatsHeader + seat + 4 * gap;
}

const A16 = { height: 832, top: 32, bottom: 48 };
/** Above the footer: the screen less the status bar, the column's padding, and the footer with its button. */
const ROOM = A16.height - A16.top - space[8] - space[8] - (space[6] + size.buttonMd + A16.bottom + space[8]);

describe('Search with the "nobody else" notice fits above the cancel button (QA loop 7)', () => {
  it.each(['he', 'en'] as const)(
    'a table of 4 (%s): the notice, the radar and the three seats fit',
    async (lang) => {
      await show(true, lang);
      expect(screen.getAllByTestId('empty-seat')).toHaveLength(3);
      expect(screen.getByTestId('match-search-alone')).toBeOnTheScreen();
      expect(columnHeight()).toBeLessThanOrEqual(ROOM);
      // The avatar (72, centred) still sits whole in the radar, above my rating's chip.
      const radar = flat(screen.getByTestId('match-search-radar')).height!;
      const avatarBottom = (radar + 72) / 2;
      const chipTop = radar - metrics.alone.chipBottom - metrics.meChipHeight;
      expect(chipTop).toBeGreaterThanOrEqual(avatarBottom);
    },
  );

  it('without the notice the search keeps its full radar and seats', async () => {
    await show(false);
    expect(flat(screen.getByTestId('match-search-radar')).height).toBe(metrics.radar.size);
    expect(flat(screen.getAllByTestId('empty-seat')[0]!).height).toBe(metrics.slot.height);
  });

  it('no text is smaller with the notice', async () => {
    await show(true);
    expect(flat(screen.getByTestId('match-search-alone-title')).fontSize).toBe(text('rowTitle').fontSize);
    expect(flat(screen.getByTestId('match-search-alone-body')).fontSize).toBe(text('body').fontSize);
    expect(flat(screen.getAllByText('מחפש…')[0]!).fontSize).toBe(text('caption').fontSize);
  });
});

/**
 * The same at 360 dp with font 1.3 (wm density 480, font_scale 1.3; review of loop 7): the notice's words take more
 * lines and the shrunk radar is still too much. Where the column overflows its room, the radar gives way to my
 * rating's chip alone (kept while the notice stays); in Hebrew the column then fits above "ביטול חיפוש".
 */
describe('Search with the notice at 360 dp and font 1.3', () => {
  const FONT = 1.3;
  const PHONE = { width: 360, height: 780, top: 32, bottom: 48 };
  const L = (name: Parameters<typeof text>[0]) => line(name) * FONT;
  type Styled = { props: { style?: unknown; children?: unknown } };

  /** How many lines a centred text takes in `room`, its words whole (greedy, as Android breaks them). */
  function linesOf(lang: string, el: Styled, room: number): number {
    const s = flat(el) as unknown as { fontFamily?: string; fontSize: number };
    const w = (word: string) => widthIn(lang, word, s, { fontScale: FONT });
    let used = 1;
    let filled = -1;
    for (const word of wordsOf(String(el.props.children))) {
      const ww = w(word);
      if (filled < 0) filled = ww;
      else if (filled + w(' ') + ww <= room) filled += w(' ') + ww;
      else {
        used += 1;
        filled = ww;
      }
    }
    return used;
  }

  function columnAt(lang: string): number {
    const width = PHONE.width - 2 * tokens.layout.gutterGame;
    const inner = Math.min(width, metrics.actionsMaxWidth) - 2 * space[7];
    const titleLines = linesOf(lang, screen.getByTestId('match-search-title'), width);
    const noticeTitle = linesOf(lang, screen.getByTestId('match-search-alone-title'), inner);
    const noticeBody = linesOf(lang, screen.getByTestId('match-search-alone-body'), inner);
    const radar = flat(screen.getByTestId('match-search-radar')).height ?? metrics.meChipHeight;
    const seat = flat(screen.getAllByTestId('empty-seat')[0]!).height!;
    const gap = flat(screen.getByTestId('match-search-column')).gap ?? 0;
    const title = titleLines * L('screenTitle') + space[3] + L('scoreCompact') + 4;
    const notice =
      2 * space[7] +
      16 +
      space[3] +
      noticeTitle * L('rowTitle') +
      space[3] +
      noticeBody * L('body') +
      space[5];
    return (
      metrics.chipHeight + title + radar + notice + size.buttonMd + L('micro') + space[6] + seat + 4 * gap
    );
  }

  const footer = space[6] + size.buttonMd + PHONE.bottom + space[8];
  const viewport = PHONE.height - footer;
  const room = viewport - PHONE.top - 2 * space[8];

  async function showAt(lang: 'he' | 'en') {
    env = await setUp(lang, 'off');
    const restore = setWindow({ width: PHONE.width, height: PHONE.height, fontScale: FONT });
    const view = await render(
      <SearchView model={model(true)} reduce={false} onCancel={jest.fn()} onBot={jest.fn()} />,
    );
    const scroll = screen.getByTestId('match-search-scroll');
    await fireEvent(scroll, 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 360, height: viewport } },
    });
    const full = columnAt(lang);
    await fireEvent(scroll, 'contentSizeChange', 360, full + PHONE.top + 2 * space[8]);
    return { restore, view, full, scroll };
  }

  it.each(['he', 'en'] as const)('%s: the radar gives way to my rating, and stays so', async (lang) => {
    const { restore, full, scroll } = await showAt(lang);
    // With the compact radar the column is taller than its room: the reported case at this size.
    expect(full).toBeGreaterThan(room);
    const radar = screen.getByTestId('match-search-radar');
    expect(flat(radar).height).toBeUndefined();
    expect(screen.queryByTestId('match-search-radar-arc', { includeHiddenElements: true })).toBeNull();
    expect(screen.getByTestId('match-search-radar-rating')).toHaveTextContent('1200');
    expect(radar.props.accessibilityLabel).toContain('1200');
    const tight = columnAt(lang);
    expect(tight).toBeLessThan(full);
    if (lang === 'he') expect(tight).toBeLessThanOrEqual(room);
    // The smaller column fits now: it does not flip back while the notice stays.
    await fireEvent(scroll, 'contentSizeChange', 360, viewport);
    expect(screen.queryByTestId('match-search-radar-arc', { includeHiddenElements: true })).toBeNull();
    // No text is smaller.
    expect(flat(screen.getByTestId('match-search-alone-body')).fontSize).toBe(text('body').fontSize);
    await restore();
  });

  it('the radar is back once the notice goes', async () => {
    const { restore, view } = await showAt('he');
    expect(screen.queryByTestId('match-search-radar-arc', { includeHiddenElements: true })).toBeNull();
    await view.rerender(
      <SearchView model={model(false)} reduce={false} onCancel={jest.fn()} onBot={jest.fn()} />,
    );
    expect(screen.getByTestId('match-search-radar-arc', { includeHiddenElements: true })).toBeTruthy();
    expect(flat(screen.getByTestId('match-search-radar')).height).toBe(metrics.radar.size);
    await restore();
  });

  it('at normal size on 360 dp nothing changes when the column fits', async () => {
    env = await setUp('he', 'off');
    await render(<SearchView model={model(true)} reduce={false} onCancel={jest.fn()} onBot={jest.fn()} />);
    const scroll = screen.getByTestId('match-search-scroll');
    await fireEvent(scroll, 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 360, height: viewport } },
    });
    await fireEvent(scroll, 'contentSizeChange', 360, viewport);
    expect(flat(screen.getByTestId('match-search-radar')).height).toBe(metrics.alone.radar);
  });
});
