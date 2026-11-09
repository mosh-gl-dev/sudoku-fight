// The gesture handler's Jest mocks, before anything loads it (its native module does not exist under Jest).
import 'react-native-gesture-handler/jestSetup';

import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { NOW, twoPlayerView } from '../../../components/player/__fixtures__/gameView';
import { cardModel } from '../../../components/player/cardModel';
import { duelCardWidth, metrics } from '../../../components/player/metrics';
import { setWindow } from '../../../components/ui/testing/layout';
import i18n from '../../../i18n';
import { useSettings } from '../../../state/settings';
import { size, text, tokens } from '../../../theme';
import { DuelHud } from '../DuelHud';
import { defaultCardRect } from '../reactions/model';

jest.mock('../../../services/feedback', () => ({ cue: jest.fn() }));

/**
 * QA loop 4 (interference-picker-grid-small): at the largest display zoom (320 dp wide on the A16) the two
 * 159-dp cards needed 326 dp of a 288-dp row, so the opponent's card started 14 dp off the left edge, its avatar
 * and score cut. Now both share the row on a narrow screen (duelCardWidth) and stay 159 where they fit.
 */

const hidden = { includeHiddenElements: true };
const gutter = tokens.layout.gutterGame;
const styleOf = (el: { props: { style?: unknown } }) =>
  StyleSheet.flatten(el.props.style as ViewStyle & TextStyle) ?? {};
const widthOf = (testID: string) => styleOf(screen.getByTestId(testID, hidden)).width;

async function showAt(width: number) {
  const restore = setWindow({ width, height: 780, fontScale: 1 });
  const view = twoPlayerView();
  await render(
    <DuelHud
      me={cardModel(view, 'moshe', 0, NOW)}
      opponent={cardModel(view, 'nina', 0, NOW)}
      onSurrender={() => {}}
      onInterfere={() => {}}
      style={{ marginHorizontal: gutter }}
    />,
  );
  return restore;
}

describe('the 2-player cards on a narrow screen', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('he');
    useSettings.setState({ reduceMotion: 'system' });
  });

  it('share the row: 159 where two fit with room between, an equal share below that', () => {
    expect(duelCardWidth(390 - 2 * gutter)).toBe(size.playerCard.width);
    expect(duelCardWidth(360 - 2 * gutter)).toBe(size.playerCard.width);
    expect(duelCardWidth(320 - 2 * gutter)).toBe(140);
    for (let screenWidth = 320; screenWidth <= 430; screenWidth++) {
      const row = screenWidth - 2 * gutter;
      const card = duelCardWidth(row);
      expect({ screenWidth, fits: 2 * card + metrics.card.pairGap <= row }).toEqual({
        screenWidth,
        fits: true,
      });
    }
  });

  it.each([320, 360])('at %i dp both cards fit the row, the score and name at their full size', async (w) => {
    const restore = await showAt(w);
    const row = w - 2 * gutter;
    const mine = widthOf('card-me');
    const theirs = widthOf('card-opponent');
    expect(mine).toBe(theirs);
    expect(typeof mine).toBe('number');
    expect((mine as number) * 2 + metrics.card.pairGap).toBeLessThanOrEqual(row);
    expect(mine).toBe(w >= 360 ? size.playerCard.width : duelCardWidth(row));
    // Nothing gets tiny to fit (Moshe): the score stays 64, the name 16.
    for (const id of ['card-me-score', 'card-opponent-score']) {
      expect(styleOf(screen.getByTestId(id, hidden)).fontSize).toBe(text('scoreXL').fontSize);
    }
    for (const name of screen.getAllByText(/MosheG|NinaVolt/, hidden)) {
      expect(styleOf(name).fontSize).toBe(text('playerName').fontSize);
    }
    await restore();
  });

  it('follows the row it is measured in', async () => {
    const restore = await showAt(390);
    expect(widthOf('card-opponent')).toBe(size.playerCard.width);
    await fireEvent(screen.getByTestId('duel-hud'), 'layout', {
      nativeEvent: { layout: { x: gutter, y: 0, width: 320 - 2 * gutter, height: 160 } },
    });
    expect(widthOf('card-me')).toBe(140);
    expect(widthOf('card-opponent')).toBe(140);
    await restore();
  });

  it('the reactions picker’s first-frame guess at a card has the same width', () => {
    expect(defaultCardRect(320, false)).toMatchObject({ x: gutter, width: 140 });
    expect(defaultCardRect(360, true)).toMatchObject({
      x: 360 - gutter - size.playerCard.width,
      width: size.playerCard.width,
    });
  });
});
