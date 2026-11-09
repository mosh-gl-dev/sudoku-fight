import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';

import { ToastViewport, useToast } from '../../../components/ui';
import { answerIn } from '../../../game/testing/practice';
import i18n from '../../../i18n';
import { space } from '../../../theme';
import { GameScreen } from '../GameScreen';
import { type Duel, duel } from '../testing/duel';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../../../services/analytics', () => ({ track: jest.fn() }));
jest.mock('../../../services/feedback', () => ({
  cue: jest.fn(),
  preloadCues: jest.fn(),
  cueCountUp: jest.fn(() => jest.fn()),
}));

/** The HUD of a 390 × 844 screen as on Dir-C-Game: the cards at 48, 160 high. */
const HUD = { x: 16, y: 48, width: 358, height: 160 };

let game: Duel | null = null;

beforeEach(async () => {
  jest.useFakeTimers();
  useToast.getState().clear();
  await i18n.changeLanguage('he');
});
afterEach(() => {
  game?.session.close();
  game = null;
  useToast.getState().clear();
  jest.useRealTimers();
});

describe('the sender’s chip after a launch (motion.md sender.toast; QA loop 8, avatars-react-hit-sender)', () => {
  it('shows under the cards, not over them: my wink and my score stay in sight', async () => {
    const g = (game = duel({ rules: { interferences: true } }));
    await render(
      <>
        <GameScreen session={g.session} onEnded={jest.fn()} />
        <ToastViewport />
      </>,
    );
    await fireEvent(screen.getByTestId('duel-hud'), 'layout', { nativeEvent: { layout: HUD } });
    await act(async () => {
      for (const cell of g.cells) {
        if (g.host.getView().players[0]!.score >= 2) break;
        g.host.select(cell);
        g.host.place(cell, answerIn(g.puzzle, cell));
      }
    });
    await act(async () => void g.host.interfere(g.host.getView().players[1]!.id, 'cats'));
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    const under = HUD.y + HUD.height + space[2];
    expect(useToast.getState().current).toMatchObject({ variant: 'info', top: under });
    const chip = screen.getByRole('status');
    expect(StyleSheet.flatten(chip.parent!.props.style as ViewStyle)).toMatchObject({ top: under });
  });

  it('any other toast keeps its place at the top, under the safe area', async () => {
    await render(<ToastViewport />);
    await act(async () => void useToast.getState().show({ variant: 'warning', message: 'לא נשלח' }));
    const toast = screen.getByRole('status', { name: 'לא נשלח' });
    expect(StyleSheet.flatten(toast.parent!.props.style as ViewStyle)).toMatchObject({ top: space[4] });
  });
});
