import { render, screen } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';

import { InterferenceButton } from '../../../components/player/InterferenceButton';
import { color } from '../../../theme';
import { opaqueOver } from '../../../theme/blend';
import { Segmented } from '../../progress/parts';
import { Choice } from '../SettingControls';

/**
 * B12: the wandering digits (D126) lie behind every screen, and a segmented choice sits on the screen itself, so
 * every fill in it is opaque: the settings' choice ("הפחתת תנועה") and the leaderboard's tabs and 2 / 3 / 4.
 * A selected or pressed segment keeps its tint, laid flat over the ground. So is the 2-player card's "הפרעה",
 * which sits on the game screen with no card surface under it.
 */

const fill = (testID: string) =>
  (StyleSheet.flatten(screen.getByTestId(testID).props.style as ViewStyle) ?? {}).backgroundColor;
const isOpaque = (value: unknown) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

describe('segmented choices are opaque to the ground’s digits (B12)', () => {
  it('the settings choice: its frame and the chosen segment', async () => {
    const options = [
      { value: 'system', label: 'כמו במכשיר' },
      { value: 'on', label: 'מופעלת' },
      { value: 'off', label: 'כבויה' },
    ] as const;
    await render(
      <Choice label="הפחתת תנועה" options={options} value="off" onChange={jest.fn()} testID="motion" />,
    );
    expect(fill('motion')).toBe(color.bg);
    expect(fill('motion-off')).toBe(opaqueOver(color.accentSubtle, color.bg));
    expect(isOpaque(fill('motion-off'))).toBe(true);
    // An unchosen segment shows the frame's opaque ground (none of its own).
    expect(fill('motion-on')).toBeUndefined();

    // On a card (the pseudo-language block), it is filled with the card's surface, and the tint laid over that.
    await render(
      <Choice
        label="שפת בדיקה"
        options={options}
        value="off"
        onChange={jest.fn()}
        ground={color.surface}
        testID="pseudo"
      />,
    );
    expect(fill('pseudo')).toBe(color.surface);
    expect(fill('pseudo-off')).toBe(opaqueOver(color.accentSubtle, color.surface));
  });

  it('the leaderboard’s tabs: every chip, chosen or not', async () => {
    await render(
      <Segmented
        role="tab"
        label="טבלה"
        items={[
          { key: 'all', label: 'כללי', testID: 'tab-all' },
          { key: 'quick', label: 'מהיר', testID: 'tab-quick' },
        ]}
        value="all"
        onChange={jest.fn()}
      />,
    );
    expect(fill('tab-all')).toBe(opaqueOver(color.accentSubtle, color.bg));
    expect(fill('tab-quick')).toBe(color.bg);
  });

  it('the 2-player card’s "הפרעה", ready and blocked, on the screen itself (no card surface)', async () => {
    await render(<InterferenceButton name="NinaVolt" state={{ kind: 'available', cost: 2 }} testID="zap" />);
    expect(fill('zap')).toBe(opaqueOver(color.interfere.bg));
    await render(
      <InterferenceButton name="NinaVolt" state={{ kind: 'points', cost: 8, missing: 3 }} testID="zap" />,
    );
    // Blocked: still opaque, dimmed by a veil of the ground's colour (never an opacity on the button).
    expect(isOpaque(fill('zap'))).toBe(true);
    expect(StyleSheet.flatten(screen.getByTestId('zap').props.style as ViewStyle).opacity).toBeUndefined();
    expect(fill('zap-veil')).toBe(color.bg);
  });
});
