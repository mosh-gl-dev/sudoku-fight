import { render, screen } from '@testing-library/react-native';

import { ConnectionLayer } from '../ConnectionLayer';
import { connectionModel, type ConnectionModel } from '../connectionModel';
import { NINA, rankedGame } from '../testing/games';
import { hidden, type Setup, setUp, wait } from '../testing/setup';
import { TIME_UP_HOLD_MS } from '../useTimeUpHold';

/**
 * QA (APK 18, opponent-countdown-stops-at-1): on the winner's phone the opponent's ring went 15 → 1 and then
 * straight to "… עזב את המשחק · ניצחת בנטישה", with no 0 and no "הזמן נגמר · בודקים מול השרת…" (STAGE7 test
 * 3 and QA checklist row 25 expect both, as my own countdown shows them). The server's verdict comes at
 * graceEndsAt, while the ring (whole seconds, rounded up) still shows 1: the layer now holds the time-up state
 * for TIME_UP_HOLD_MS before the dialog.
 */

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../../../../services/feedback', () => ({ cue: jest.fn() }));

let env: Setup;
beforeEach(async () => {
  env = await setUp('he');
});
afterEach(() => env.restore());

const noop = () => {};
const layer = (model: ConnectionModel) => (
  <ConnectionLayer
    model={model}
    onRetry={noop}
    onHome={noop}
    onResults={noop}
    onLeave={noop}
    onPractice={noop}
  />
);

/** A 2-player ranked game frozen for Nina, `leftMs` before her grace ends (15 s). */
function frozen(leftMs: number) {
  const game = rankedGame();
  game.disconnect(NINA);
  game.advance(15_000 - leftMs);
  const at = (): ConnectionModel => connectionModel(game.view(), { kind: 'online' }, game.now());
  return { game, at };
}

const timeUpShows = () => {
  expect(screen.getByTestId('opponent-reconnecting-card-title', hidden)).toHaveTextContent(/לא חזר/);
  expect(screen.getByTestId('opponent-reconnecting-win', hidden)).toHaveTextContent('בודקים מול השרת…');
  expect(screen.getByTestId('opponent-reconnecting-card-reconnecting', hidden)).toHaveTextContent(
    'Reconnecting... 0',
  );
  expect(screen.queryByTestId('opponent-left', hidden)).toBeNull();
};

describe('the opponent’s countdown ends on its time-up state', () => {
  it('a verdict on time (the ring still at 1): 0 and "בודקים מול השרת…" first, then "the opponent left"', async () => {
    const { game, at } = frozen(200);
    const view = await render(layer(at()));
    expect(screen.getByTestId('opponent-reconnecting-card-reconnecting', hidden)).toHaveTextContent(
      'Reconnecting... 1',
    );

    // The server ends the grace at graceEndsAt; its verdict arrives before the next tick.
    game.advance(200);
    const left = at();
    expect(left.kind).toBe('opponentLeft');
    await view.rerender(layer(left));
    timeUpShows();

    await wait(TIME_UP_HOLD_MS - 50);
    timeUpShows();
    await wait(50);
    expect(screen.getByTestId('opponent-left', hidden)).toBeOnTheScreen();
    expect(screen.getByTestId('opponent-left-win', hidden)).toHaveTextContent('ניצחת בנטישה');
  });

  it('a late verdict: the time-up state already showed its while, so the dialog comes at once', async () => {
    const { game, at } = frozen(200);
    const view = await render(layer(at()));
    game.advance(200);
    // The server is late: the phone's own count reaches 0 first.
    const expired = connectionModel(game.view(), { kind: 'online' }, game.now());
    expect(expired.kind).toBe('opponentLeft');
    // (The engine here is the phone's own, so the freeze is drawn from the frozen view, in its time.)
    await view.rerender(
      layer({
        kind: 'opponentReconnecting',
        playerId: NINA,
        name: 'NinaVolt',
        colorIndex: 1,
        secondsLeft: 0,
        remainingMs: 0,
        graceMs: 15_000,
        expired: true,
      }),
    );
    timeUpShows();
    await wait(TIME_UP_HOLD_MS);
    await view.rerender(layer(expired));
    expect(screen.getByTestId('opponent-left', hidden)).toBeOnTheScreen();
  });

  it('a freeze that ends before its last second is not the time running out: no time-up state', async () => {
    const { game, at } = frozen(5_000);
    const view = await render(layer(at()));
    expect(screen.getByTestId('opponent-reconnecting-card-reconnecting', hidden)).toHaveTextContent(
      'Reconnecting... 5',
    );
    game.advance(5_000);
    // As if the verdict came while the ring showed 5 (the opponent's own end, not the grace).
    await view.rerender(layer(at()));
    expect(screen.getByTestId('opponent-left', hidden)).toBeOnTheScreen();
    expect(screen.queryByText('בודקים מול השרת…', hidden)).toBeNull();
  });

  it('a game opened over already (no freeze seen here): "the opponent left" at once', async () => {
    const { game, at } = frozen(0);
    game.advance(1);
    await render(layer(at()));
    expect(screen.getByTestId('opponent-left', hidden)).toBeOnTheScreen();
  });
});
