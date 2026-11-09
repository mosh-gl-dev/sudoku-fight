// The gesture handler's Jest mocks, before anything loads it (its native module does not exist under Jest).
import 'react-native-gesture-handler/jestSetup';

import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { NOW, twoPlayerView } from '../../../components/player/__fixtures__/gameView';
import { cardModel } from '../../../components/player/cardModel';
import { duelCardWidth, metrics } from '../../../components/player/metrics';
import {
  expectRoom,
  fixedT,
  layoutLanguages,
  setWindow,
  typefaceOf,
  widthIn,
} from '../../../components/ui/testing/layout';
import i18n from '../../../i18n';
import { useSettings } from '../../../state/settings';
import { size, text, tokens } from '../../../theme';
import { DuelHud } from '../DuelHud';

jest.mock('../../../services/feedback', () => ({ cue: jest.fn() }));

/**
 * QA loop 6 (apk10-2p-header-360dp): at 320 dp in English my "No mistakes" broke as "No mi / stakes" (Android
 * breaks a word wider than its line rather than shrink it), "Interfere" shrank to tiny text, and the VS badge sat
 * over the opponent's flag. Now the card measures its status words at full size (statusFit) and keeps them only
 * where they fit: else my mistakes are the mark and the count, and "הפרעה" its icon (same label). The name blocks
 * keep clear of VS. Checked at 320 and 360 dp in English, German, Russian and Hebrew, with the phone's widths
 * (the fonts' own advances, as the layout tests measure them).
 */

const hidden = { includeHiddenElements: true };
const gutter = tokens.layout.gutterGame;
const card = tokens.layout.game.playerCard;
const styleOf = (el: { props: { style?: unknown } }) =>
  StyleSheet.flatten(el.props.style as ViewStyle & TextStyle) ?? {};
const textOf = (el: { props: { children?: unknown } }) => String(el.props.children);

/** Reports each hidden probe's width as the phone would lay it out in `lang`. */
async function measureProbes(lang: string, cardID: string) {
  for (const probe of within(screen.getByTestId(cardID, hidden)).queryAllByTestId(/^probe-/, hidden)) {
    const s = styleOf(probe);
    const width = widthIn(lang, textOf(probe), {
      fontFamily: s.fontFamily,
      fontWeight: s.fontWeight,
      fontSize: s.fontSize!,
    });
    await fireEvent(probe, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height: 18 } } });
  }
}

async function showAt(lang: string, width: number, mistakes: number) {
  await i18n.changeLanguage(lang);
  const restore = setWindow({ width, height: 780, fontScale: 1 });
  const view = twoPlayerView();
  await render(
    <DuelHud
      me={{ ...cardModel(view, 'moshe', 0, NOW), mistakes }}
      opponent={cardModel(view, 'nina', 0, NOW)}
      onSurrender={() => {}}
      onInterfere={() => {}}
      style={{ marginHorizontal: gutter }}
    />,
  );
  await measureProbes(lang, 'card-me');
  await measureProbes(lang, 'card-opponent');
  return restore;
}

/** Words at full size in `room`, broken only between words: how many lines they take (Infinity: a word won't fit). */
function linesAtFullSize(lang: string, words: string, room: number): number {
  const body = { fontFamily: undefined as string | undefined, fontSize: 14 };
  const probe = screen.getAllByTestId('probe-mistakes', hidden)[0]!;
  body.fontFamily = styleOf(probe).fontFamily;
  const w = (s: string) => widthIn(lang, s, body);
  let lines = 1;
  let line = '';
  for (const word of words.trim().split(/\s+/)) {
    if (w(word) > room) return Infinity;
    const next = line ? `${line} ${word}` : word;
    if (w(next) <= room) line = next;
    else {
      lines += 1;
      line = word;
    }
  }
  return lines;
}

// [language, screen width, my mistakes, my words kept?, "הפרעה" keeps its word?]
const CASES: [string, number, number, boolean, boolean][] = [
  ['en', 320, 0, false, false],
  ['en', 320, 1, false, false],
  ['en', 360, 0, true, false],
  ['en', 360, 1, true, false],
  ['de', 320, 0, true, false],
  ['de', 360, 0, true, false],
  ['ru', 320, 0, false, false],
  ['ru', 360, 0, true, false],
  ['he', 320, 0, true, false],
  ['he', 360, 0, true, true],
  ['he', 360, 1, true, true],
];

describe('the 2-player header at 320–360 dp: every word at full size, none broken (QA loop 6)', () => {
  beforeEach(() => {
    useSettings.setState({ reduceMotion: 'system' });
  });
  afterAll(async () => {
    await i18n.changeLanguage('he');
  });

  it.each(CASES)('%s at %i dp, %i mistakes', async (lang, w, mistakes, wordsKept, interfereWord) => {
    const restore = await showAt(lang, w, mistakes);
    const row = w - 2 * gutter;
    const cardWidth = duelCardWidth(row);
    const mine = within(screen.getByTestId('card-me', hidden));
    const theirs = within(screen.getByTestId('card-opponent', hidden));

    // My mistakes: their words where every word fits its line at full size, in the row's two lines…
    const room = cardWidth - 2 * size.iconButton - 2 * card.actionsGap;
    const words = textOf(mine.getAllByTestId('probe-mistakes', hidden)[0]!);
    expect(mine.queryByTestId('mistakes-mark', hidden) === null).toBe(wordsKept);
    if (wordsKept) {
      expect(linesAtFullSize(lang, words, room)).toBeLessThanOrEqual(2);
      expect(mine.getByTestId('mistakes', hidden)).toHaveTextContent(words);
    } else {
      // …else the mark and the count, in Teko at the delta's size: not a word cut, nothing tiny.
      expect(linesAtFullSize(lang, words, room)).toBeGreaterThan(2);
      const count = mine.getByTestId('mistakes', hidden);
      expect(count).toHaveTextContent(String(mistakes));
      expect(styleOf(count).fontSize).toBeGreaterThanOrEqual(14);
      expect(mine.getByTestId('icon-cancel', hidden)).toBeTruthy();
    }

    // "הפרעה": its word only at full size beside the activity at full size; else its icon, same label.
    const zap = theirs.getByTestId('interfere');
    expect(theirs.queryByTestId('interfere-label', hidden) !== null).toBe(interfereWord);
    expect(zap.props.accessibilityLabel).toBe(
      i18n.t('player:interfere.label', { name: 'NinaVolt', cost: 2 }),
    );
    if (!interfereWord) {
      expect(styleOf(zap)).toMatchObject({ width: size.touch, height: size.touch, flexShrink: 0 });
      // The activity now has the rest at full size: "Thinking…", or the ring and "Choosing".
      const probe = (id: string) => {
        const el = theirs.getByTestId(`probe-${id}`, hidden);
        const s = styleOf(el);
        return widthIn(lang, textOf(el), {
          fontFamily: s.fontFamily,
          fontWeight: s.fontWeight,
          fontSize: s.fontSize!,
        });
      };
      const rest = cardWidth - card.actionsGap - size.touch;
      expect(probe('thinking')).toBeLessThanOrEqual(rest);
      expect(metrics.timerRing.card + metrics.card.statusGap + probe('choosing')).toBeLessThanOrEqual(rest);
    }

    // VS (36 dp, centred between the cards) never covers a name block: each keeps off its inner edge.
    for (const id of ['card-me-identity', 'card-opponent-identity']) {
      const s = styleOf(screen.getByTestId(id, hidden));
      const inset = (id === 'card-me-identity' ? s.paddingEnd : s.paddingStart) as number;
      expect(cardWidth - inset).toBeLessThanOrEqual(row / 2 - metrics.vs.width / 2 - 2);
    }
    await restore();
  });

  it('as designed until the words are measured: the word on "הפרעה", my mistakes in words', async () => {
    await i18n.changeLanguage('en');
    const restore = setWindow({ width: 320, height: 780, fontScale: 1 });
    const view = twoPlayerView();
    await render(
      <DuelHud
        me={cardModel(view, 'moshe', 0, NOW)}
        opponent={cardModel(view, 'nina', 0, NOW)}
        onSurrender={() => {}}
        onInterfere={() => {}}
      />,
    );
    expect(screen.getByTestId('interfere-label', hidden)).toHaveTextContent('Interfere');
    expect(screen.queryByTestId('mistakes-mark', hidden)).toBeNull();
    await restore();
  });

  // Beside the icon alone, the opponent's activity has its words at full size in every language: "Thinking…" on its
  // line, the ring and each word of "Choosing" / "Paused" (the cell may take the second line). nl "Pauze" and tr
  // "Durdu" were shortened for 320 dp (D124's way): "Gepauzeerd" and "Duraklatıldı" were wider than the line.
  describe.each(layoutLanguages())('in %s', (lang) => {
    it.each([320, 360])('at %i dp the activity fits beside the icon at full size', async (w) => {
      const t = await fixedT(lang, 'player');
      const body = text('body', typefaceOf(lang));
      const font = { fontFamily: body.fontFamily, fontWeight: body.fontWeight, fontSize: body.fontSize! };
      const width = (s: string) => widthIn(lang, s, font);
      // A script without spaces breaks between its letters (Thai between its words, as narrow or narrower).
      const widest = (s: string) => {
        const pieces = /\s/.test(s.trim()) ? s.trim().split(/\s+/) : [...s];
        return Math.max(...pieces.map(width));
      };
      const rest = duelCardWidth(w - 2 * gutter) - card.actionsGap - size.touch;
      const ring = metrics.timerRing.card + metrics.card.statusGap;
      for (const gender of [undefined, 'female'] as const) {
        const thinking = width(`${t('activity.thinking', { context: gender })}${t('ellipsis')}`);
        expectRoom(lang, `player:activity.thinking (${gender ?? 'male'})`, thinking, rest);
        for (const key of ['activity.locking', 'activity.paused']) {
          expectRoom(
            lang,
            `player:${key} (${gender ?? 'male'})`,
            ring + widest(t(key, { context: gender })),
            rest,
          );
        }
      }
    });
  });

  it('at 390 dp the cards are far enough apart: VS needs no more than a sliver', async () => {
    const restore = await showAt('he', 390, 0);
    const s = styleOf(screen.getByTestId('card-me-identity', hidden));
    expect((s.paddingEnd as number | undefined) ?? 0).toBeLessThanOrEqual(2);
    await restore();
  });
});
