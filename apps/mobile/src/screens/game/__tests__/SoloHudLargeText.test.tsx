// The gesture handler's Jest mocks, before anything loads it (its native module does not exist under Jest).
import 'react-native-gesture-handler/jestSetup';

import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, type TextStyle } from 'react-native';

import { NOW, twoPlayerView } from '../../../components/player/__fixtures__/gameView';
import { cardModel } from '../../../components/player/cardModel';
import { setWindow, widthIn } from '../../../components/ui/testing/layout';
import i18n from '../../../i18n';
import { useSettings } from '../../../state/settings';
import { size, space, text, tokens } from '../../../theme';
import { SoloHud, soloTitleRoom } from '../SoloHud';

jest.mock('../../../services/feedback', () => ({ cue: jest.fn() }));

/**
 * QA loop 7 (general-display-small-big-font): at 360 dp with font 1.3 the solo HUD's title under my name read
 * "Solo prac…". The identity is one button high, so the line can't take a second line: where the whole title is
 * wider than its room at full size, it keeps the game type alone, at its design size, whole.
 */

const hidden = { includeHiddenElements: true };
const FONT = 1.3;
const WIDTH = 360;
const styleOf = (el: { props: { style?: unknown } }) => StyleSheet.flatten(el.props.style as TextStyle) ?? {};
const layout = (width: number) => ({ nativeEvent: { layout: { x: 0, y: 0, width, height: 48 } } });

/** "סיום אימון" (secondary, modal: 16 each side, the inline icon, its gap) above the time and the best move. */
function endWidth(lang: string): number {
  const label = widthIn(lang, i18n.t('game:end.button'), text('sheetTitle') as { fontSize: number }, {
    fontScale: FONT,
  });
  return label + 2 * space[8] + size.icon.inline + space[3];
}

async function renderAt(lang: string, gameType: 'fast' | 'normal' | 'hard') {
  await i18n.changeLanguage(lang);
  const restore = setWindow({ width: WIDTH, height: 780, fontScale: FONT });
  await render(
    <SoloHud
      card={cardModel(twoPlayerView(), 'moshe', 0, NOW)}
      delta={null}
      gameType={gameType}
      stats={{ elapsedMs: 61_000, filled: 30, total: 81, best: null }}
      onEnd={jest.fn()}
    />,
  );
  const hudWidth = WIDTH - 2 * tokens.layout.gutterGame;
  const end = endWidth(lang);
  await fireEvent(screen.getByTestId('solo-hud', hidden), 'layout', layout(hudWidth));
  await fireEvent(screen.getByTestId('solo-hud-end', hidden), 'layout', layout(end));
  const probe = screen.getByTestId('probe-solo-title', hidden);
  const ps = styleOf(probe);
  const titleWidth = widthIn(
    lang,
    String(probe.props.children),
    { fontFamily: ps.fontFamily, fontWeight: ps.fontWeight, fontSize: ps.fontSize! },
    { fontScale: FONT },
  );
  await fireEvent(probe, 'layout', layout(titleWidth));
  return { restore, room: soloTitleRoom(hudWidth, end), titleWidth };
}

describe('the solo HUD title at 360 dp and font 1.3: whole, never "Solo prac…" (QA loop 7)', () => {
  beforeEach(() => useSettings.setState({ reduceMotion: 'system' }));
  afterAll(async () => {
    await i18n.changeLanguage('he');
  });

  it.each(['en', 'he'] as const)('%s', async (lang) => {
    const { restore, room, titleWidth } = await renderAt(lang, 'normal');
    const title = screen.getByTestId('solo-hud-title', hidden);
    const shown = String(title.props.children);
    const full = i18n.t('game:subtitle', { title: i18n.t('game:title'), type: i18n.t('game:type.normal') });
    if (titleWidth > room) expect(shown).toBe(i18n.t('game:type.normal'));
    else expect(shown).toBe(full);
    // What is shown fits its line at full size: nothing cut, nothing smaller than the caption.
    const ts = styleOf(title);
    expect(ts.fontSize).toBe(text('caption').fontSize);
    expect(title.props.numberOfLines).toBe(1);
    expect(
      widthIn(lang, shown, { fontFamily: ts.fontFamily, fontSize: ts.fontSize! }, { fontScale: FONT }),
    ).toBeLessThanOrEqual(room);
    // English is the reported case: "Solo practice · Normal" doesn't fit there.
    if (lang === 'en') expect(titleWidth).toBeGreaterThan(room);
    await restore();
  });

  it('keeps the whole title where it fits (a wide phone at normal size)', async () => {
    await i18n.changeLanguage('en');
    const restore = setWindow({ width: 600, height: 900, fontScale: 1 });
    await render(
      <SoloHud
        card={cardModel(twoPlayerView(), 'moshe', 0, NOW)}
        delta={null}
        gameType="fast"
        stats={{ elapsedMs: 0, filled: 30, total: 81, best: null }}
        onEnd={jest.fn()}
      />,
    );
    await fireEvent(screen.getByTestId('solo-hud', hidden), 'layout', layout(600));
    await fireEvent(screen.getByTestId('solo-hud-end', hidden), 'layout', layout(150));
    await fireEvent(screen.getByTestId('probe-solo-title', hidden), 'layout', layout(150));
    expect(String(screen.getByTestId('solo-hud-title', hidden).props.children)).toBe('Solo practice · Fast');
    await restore();
  });
});
