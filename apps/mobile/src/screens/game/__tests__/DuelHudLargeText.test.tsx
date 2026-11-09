// The gesture handler's Jest mocks, before anything loads it (its native module does not exist under Jest).
import 'react-native-gesture-handler/jestSetup';

import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { NOW, twoPlayerView } from '../../../components/player/__fixtures__/gameView';
import { cardModel } from '../../../components/player/cardModel';
import { duelCardWidth } from '../../../components/player/metrics';
import { setWindow, widthIn } from '../../../components/ui/testing/layout';
import i18n from '../../../i18n';
import { useSettings } from '../../../state/settings';
import { size, tokens } from '../../../theme';
import { DuelHud } from '../DuelHud';

jest.mock('../../../services/feedback', () => ({ cue: jest.fn() }));

/**
 * QA loop 7 (general-display-small-big-font, apk11): at 360 dp with font 1.3, my card's "No mistakes" broke as
 * "No mis / takes" (bot practice and ranked). Loop 6's statusFit (in APK 12) measures the words at the phone's own
 * text size: at 1.3 a word that no longer fits its line makes the mistakes the mark and the count, at full size.
 */

const hidden = { includeHiddenElements: true };
const card = tokens.layout.game.playerCard;
const styleOf = (el: { props: { style?: unknown } }) =>
  StyleSheet.flatten(el.props.style as ViewStyle & TextStyle) ?? {};
const textOf = (el: { props: { children?: unknown } }) => String(el.props.children);
const FONT = 1.3;

async function measureProbes(lang: string, cardID: string) {
  for (const probe of within(screen.getByTestId(cardID, hidden)).queryAllByTestId(/^probe-/, hidden)) {
    const s = styleOf(probe);
    const width = widthIn(
      lang,
      textOf(probe),
      { fontFamily: s.fontFamily, fontWeight: s.fontWeight, fontSize: s.fontSize! },
      { fontScale: FONT },
    );
    await fireEvent(probe, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height: 23 } } });
  }
}

describe('my mistakes at 360 dp and font 1.3: the words only where no word breaks (QA loop 7)', () => {
  beforeEach(() => useSettings.setState({ reduceMotion: 'system' }));
  afterAll(async () => {
    await i18n.changeLanguage('he');
  });

  it.each(['en', 'he'] as const)('%s', async (lang) => {
    await i18n.changeLanguage(lang);
    const restore = setWindow({ width: 360, height: 780, fontScale: FONT });
    const view = twoPlayerView();
    await render(
      <DuelHud
        me={{ ...cardModel(view, 'moshe', 0, NOW), mistakes: 0 }}
        opponent={cardModel(view, 'nina', 0, NOW)}
        onSurrender={() => {}}
        onInterfere={() => {}}
        style={{ marginHorizontal: tokens.layout.gutterGame }}
      />,
    );
    await measureProbes(lang, 'card-me');
    await measureProbes(lang, 'card-opponent');
    const mine = within(screen.getByTestId('card-me', hidden));
    const cardWidth = duelCardWidth(360 - 2 * tokens.layout.gutterGame);
    const room = cardWidth - 2 * size.iconButton - 2 * card.actionsGap;
    const words = textOf(mine.getAllByTestId('probe-mistakes', hidden)[0]!).trim().split(/\s+/);
    const body = styleOf(mine.getAllByTestId('probe-mistakes', hidden)[0]!);
    const widest = Math.max(
      ...words.map((w) =>
        widthIn(lang, w, { fontFamily: body.fontFamily, fontSize: body.fontSize! }, { fontScale: FONT }),
      ),
    );
    if (widest > room) {
      // "mistakes" is wider than its line at 1.3: the mark and the count, never "No mis / takes".
      expect(mine.getByTestId('mistakes-mark', hidden)).toBeTruthy();
      expect(styleOf(mine.getByTestId('mistakes', hidden)).fontSize).toBeGreaterThanOrEqual(14);
    } else {
      expect(mine.queryByTestId('mistakes-mark', hidden)).toBeNull();
    }
    if (lang === 'en') expect(widest).toBeGreaterThan(room);
    await restore();
  });
});
