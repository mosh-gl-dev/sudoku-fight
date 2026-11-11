// The gesture handler's Jest mocks, before anything loads it (its native module does not exist under Jest).
import 'react-native-gesture-handler/jestSetup';

import { fireEvent, render, screen } from '@testing-library/react-native';

import { NOW, twoPlayerView } from '../../../components/player/__fixtures__/gameView';
import { cardModel } from '../../../components/player/cardModel';
import i18n from '../../../i18n';
import { useSettings } from '../../../state/settings';
import { SoloHud, soloTargetOf } from '../SoloHud';

jest.mock('../../../services/feedback', () => ({ cue: jest.fn() }));

/**
 * QA solo-score-flight-target (APK 22): in a solo practice the "+4.5" / "−3.5" chip landed on the time and the
 * best move, ~350 dp from the score that counts up. The delta slot's place was read in the score row, and the
 * score row's in my summary, but the summary's own place in the HUD was left out: at the HUD's start, which is
 * its right side in Hebrew. The chip must land on the delta slot beside my score (motion.md `points.flight`),
 * wherever the summary sits (Hebrew, English, any font scale: every step is a measured layout).
 */

const hidden = { includeHiddenElements: true };
const rect = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });

async function hudWith(onTargetLayout: jest.Mock) {
  await render(
    <SoloHud
      card={cardModel(twoPlayerView(), 'moshe', 0, NOW)}
      delta={null}
      gameType="fast"
      stats={{ elapsedMs: 21_000, filled: 30, total: 81, best: null }}
      onEnd={jest.fn()}
      onTargetLayout={onTargetLayout}
    />,
  );
  return async (testID: string, r: ReturnType<typeof rect>) =>
    fireEvent(screen.getByTestId(testID, hidden), 'layout', { nativeEvent: { layout: r } });
}

beforeEach(async () => {
  await i18n.changeLanguage('he');
  useSettings.setState({ reduceMotion: 'off' });
});

describe('soloTargetOf', () => {
  it('adds every step: the summary in the HUD, the score row in it, the slot in the row', () => {
    expect(soloTargetOf(rect(200, 0, 158, 140), rect(0, 58, 158, 56), rect(70, 10, 44, 18))).toEqual(
      rect(270, 68, 44, 18),
    );
  });

  it('none until all three are laid out', () => {
    expect(soloTargetOf(null, rect(0, 58, 158, 56), rect(70, 10, 44, 18))).toBeNull();
    expect(soloTargetOf(rect(200, 0, 158, 140), null, rect(70, 10, 44, 18))).toBeNull();
    expect(soloTargetOf(rect(200, 0, 158, 140), rect(0, 58, 158, 56), null)).toBeNull();
  });
});

describe('SoloHud: where the chips land', () => {
  it('Hebrew: my summary at the HUD’s right, the slot beside my score there (not on the time at the left)', async () => {
    const onTargetLayout = jest.fn();
    const layout = await hudWith(onTargetLayout);
    // A 358 dp HUD, as on the phone: the summary (start) at the right, the end column (time, best) at the left.
    await layout('solo-hud-score-row', rect(0, 58, 150, 56));
    await layout('solo-hud-delta-slot', rect(80, 12, 44, 30));
    expect(onTargetLayout).not.toHaveBeenCalled(); // the summary's place is still unknown
    await layout('solo-hud-summary', rect(208, 0, 150, 140));
    expect(onTargetLayout).toHaveBeenLastCalledWith(rect(288, 70, 44, 30));
  });

  it('English: the summary at the left, the slot at its offset there; a new summary place moves the target', async () => {
    await i18n.changeLanguage('en');
    const onTargetLayout = jest.fn();
    const layout = await hudWith(onTargetLayout);
    await layout('solo-hud-summary', rect(0, 0, 150, 140));
    await layout('solo-hud-score-row', rect(0, 58, 150, 56));
    await layout('solo-hud-delta-slot', rect(80, 12, 44, 30));
    expect(onTargetLayout).toHaveBeenLastCalledWith(rect(80, 70, 44, 30));
    // A bigger font scale: the summary grows down and the slot moves with it, each read from its layout.
    await layout('solo-hud-summary', rect(0, 4, 170, 160));
    expect(onTargetLayout).toHaveBeenLastCalledWith(rect(80, 74, 44, 30));
  });
});
