import { act, render, screen, within } from '@testing-library/react-native';
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { compactRows } from '../../../components/player/PlayerCardCompact';
import { metrics } from '../../../components/player/metrics';
import { FONT_SCALE_CAPS } from '../../../components/ui/Text';
import { setWindow } from '../../../components/ui/testing/layout';
import i18n from '../../../i18n';
import { useSettings } from '../../../state/settings';
import { tokens } from '../../../theme';
import { ReplayScreen } from '../ReplayScreen';
import { loadReplay } from '../replaySource';
import { botDuelTable, memoryRepo, savePractice } from '../testing/sources';

/**
 * The replay at the largest system text size (QA 2026-11-03, Galaxy A16 at font_scale 2.0): in the cards at the
 * top, the score ("4.5", "5") and "חושב" lost their top half, the flag covered most of my avatar, "בוט" and "#2"
 * covered Pip's, and the line under the title ended in "…". Every text on a compact card is capped (the HUD's
 * ×1.35, ×1.0 on the avatar), the rows grow with the capped text, the score's TextInput gets its whole box, and the
 * header's title and line wrap instead of ending in "…". The same at the normal size.
 */

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);

const hidden = { includeHiddenElements: true };
const flat = (style: unknown) => (StyleSheet.flatten(style as ViewStyle) ?? {}) as ViewStyle & TextStyle;

async function showBotReplay() {
  const repo = await memoryRepo();
  const table = botDuelTable();
  await savePractice(repo, table);
  const deps = { practice: async () => repo, ranked: null, myAvatar: 'lava-lamp' as const, myCountry: 'IL' };
  await render(
    <ReplayScreen gameId={table.config.id} load={(g) => loadReplay(g, null, deps)} onBack={jest.fn()} />,
  );
  await act(async () => {
    await new Promise((r) => setImmediate(r));
  });
  const bot = table.config.players.find((p) => p.isBot)!;
  return { bot };
}

/** A rendered host element, as far as this file reads it. */
interface Host {
  type: unknown;
  props: Record<string, unknown>;
  children: readonly (Host | string)[];
}
const hostsOf = (node: Host, out: Host[] = []): Host[] => {
  out.push(node);
  for (const child of node.children) if (typeof child !== 'string') hostsOf(child, out);
  return out;
};

beforeEach(async () => {
  await i18n.changeLanguage('he');
  useSettings.setState({ reduceMotion: 'on' });
});

describe.each([2, 1])('font scale %s', (fontScale) => {
  let restore: () => Promise<void>;
  beforeEach(() => {
    restore = setWindow({ width: 384, height: 832, fontScale });
  });
  afterEach(async () => {
    await restore();
  });

  it('every word on the cards is capped: the HUD’s ×1.35, the flag and the bot chip on the avatar ×1.0', async () => {
    const { bot } = await showBotReplay();
    for (const id of ['me', bot.id]) {
      const card = screen.getByTestId(`replay-card-${id}`, hidden);
      // Every Text, and the score's TextInput (CountUpText).
      const texts = hostsOf(card as unknown as Host).filter(
        (n) => n.type === 'Text' || n.type === 'TextInput',
      );
      expect(texts.length).toBeGreaterThan(3);
      for (const t of texts) {
        const cap = t.props.maxFontSizeMultiplier as number | undefined;
        expect({
          id,
          testID: t.props.testID,
          capped: cap !== undefined && cap <= FONT_SCALE_CAPS.hud,
        }).toEqual({
          id,
          testID: t.props.testID,
          capped: true,
        });
      }
      // "חושב" (the activity) at the HUD's cap.
      const thinking = within(card).getByTestId('activity', hidden);
      for (const w of within(thinking).getAllByText(/\S/, hidden))
        expect(w.props.maxFontSizeMultiplier).toBe(FONT_SCALE_CAPS.hud);
    }
    // On the avatars: the flag on mine, the bot chip on Pip's, as designed (×1.0).
    expect(within(screen.getByTestId('replay-card-me', hidden)).getByTestId('flag-IL', hidden)).toHaveProp(
      'maxFontSizeMultiplier',
      FONT_SCALE_CAPS.board,
    );
    const chip = within(screen.getByTestId(`replay-card-${bot.id}`, hidden)).getByTestId('bot-chip', hidden);
    expect(within(chip).getByText(/\S/, hidden)).toHaveProp('maxFontSizeMultiplier', FONT_SCALE_CAPS.board);
  });

  it('the score gets its whole box (no TextInput scrolled to its bottom), and the rows grow with the text', async () => {
    await showBotReplay();
    const rows = compactRows(fontScale);
    const grown = Math.min(fontScale, FONT_SCALE_CAPS.hud);
    const score = tokens.type.scoreCompact;
    const box = score.paddingTop + score.lineHeight * grown;

    const row = flat(screen.getByTestId('replay-card-me-score-row', hidden).props.style);
    expect(row.height).toBe(rows.scoreRow);
    expect(row.height).toBeGreaterThanOrEqual(metrics.compact.scoreRowHeight * Math.max(1, grown) - 0.5);
    const input = flat(screen.getByTestId('replay-card-me-score', hidden).props.style);
    expect(input.marginVertical).toBe(rows.scoreMargin);
    // What Yoga lets the TextInput have: the row's height less its (negative) margins, at least its box.
    expect((row.height as number) - 2 * (input.marginVertical as number)).toBeGreaterThanOrEqual(box + 1);

    // "חושב": its row holds the capped line (a least height, no fixed one that would cut it).
    const activity = flat(screen.getByTestId('replay-card-me-activity-row', hidden).props.style);
    expect(activity.height).toBeUndefined();
    expect(activity.minHeight).toBe(rows.activity);
    expect(rows.activity).toBeGreaterThanOrEqual(tokens.type.plateNameCompact.lineHeight * grown);

    // The card is 160 high at least, and may grow; never a fixed height that cuts its column.
    const card = flat(screen.getByTestId('replay-card-me', hidden).props.style);
    expect(card.height).toBeUndefined();
    expect(card.minHeight).toBe(metrics.compact.height);
  });

  it('the header’s title and the line under it wrap, never "…"', async () => {
    await showBotReplay();
    expect(screen.getByTestId('screen-title')).toHaveTextContent('צפייה חוזרת');
    const subtitle = screen.getByTestId('screen-subtitle');
    expect(subtitle).toHaveTextContent(/^אימון מול בוט · /);
    expect(subtitle.props.numberOfLines).toBeUndefined();
  });
});

describe('the rows, worked out', () => {
  it('normal size: the designed rows; the score box (29) overflows its 24 row by its margins only', () => {
    expect(compactRows(1)).toEqual({ scoreRow: 24, scoreMargin: -3.5, activity: 16 });
  });

  it('the largest sizes stop at the HUD’s cap (×1.35); a smaller text keeps the designed rows', () => {
    expect(compactRows(2)).toEqual(compactRows(FONT_SCALE_CAPS.hud));
    expect(compactRows(1.35)).toEqual({ scoreRow: 32, scoreMargin: -3.875, activity: 22 });
    expect(compactRows(0.85).scoreRow).toBe(24);
    expect(compactRows(0.85).activity).toBe(16);
  });

  it('a replay card (no buttons) holds its column in its 160 at the cap: nothing grows past the card', () => {
    const c = metrics.compact;
    const rows = compactRows(2);
    const cap = FONT_SCALE_CAPS.hud;
    const nameLine = tokens.type.plateNameCompact.lineHeight * cap;
    const rating = tokens.type.ratingCompact;
    const ratingBox = (rating.paddingTop ?? 0) + rating.lineHeight * cap;
    const column =
      c.paddingTop +
      tokens.size.avatar.compact.frame +
      c.nameTop +
      nameLine +
      c.ratingTop +
      ratingBox +
      c.scoreTop +
      rows.scoreRow +
      c.activityTop +
      rows.activity;
    expect(column + c.paddingTop).toBeLessThanOrEqual(c.height);
  });
});
