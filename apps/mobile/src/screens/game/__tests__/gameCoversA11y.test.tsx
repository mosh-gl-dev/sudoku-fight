import { act, render, screen } from '@testing-library/react-native';

import { hidden, type Setup, setUp } from '../connection/testing/setup';
import { TIME_UP_HOLD_MS } from '../connection/useTimeUpHold';
import { ONLINE_END_HOLD_MS, RESULTS_WATCHDOG_MS } from '../model';
import { OnlineGame } from '../online/OnlineGame';
import { liveOnlineSession, OPP, type OnlineGame as Online, pass } from '../testing/online';

/**
 * fixcheck APK 18, a11y-game-nodes-under-error-cover: under "לא חזרת למשחק בזמן" (the connection error over the
 * game) and under "… עזב את המשחק · ניצחת בנטישה", a screen reader must reach the message, never the dead game
 * (its cards, "כניעה", "תגובות", the 81 cells, the keypad). The game's content is hidden on both platforms:
 * importantForAccessibility for TalkBack, accessibilityElementsHidden for VoiceOver (which ignores the first),
 * and the full connection screens are modal for VoiceOver. The game's live region is hidden with it. The same
 * for the results watchdog's cover. A screen reader's own check: uiautomator's plain dump lists views hidden from
 * accessibility too (it includes the "not important" ones); `uiautomator dump --compressed` leaves them out.
 */

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
jest.mock('../../../services/crashlytics', () => {
  const reporter = { enabled: true, recordError: jest.fn(), setUser: jest.fn(), log: jest.fn() };
  return { crashReporter: () => reporter };
});

let setup: Setup;
let game: Online | null = null;

beforeEach(async () => {
  setup = await setUp('he');
});
afterEach(() => {
  game?.session.close();
  game = null;
  setup.restore();
});

async function live(o: Parameters<typeof liveOnlineSession>[0] = {}) {
  game = await liveOnlineSession(o);
  await render(
    <OnlineGame
      session={game.session}
      onEnded={jest.fn()}
      onHome={jest.fn()}
      onRetry={jest.fn()}
      onLeave={jest.fn()}
      onPractice={jest.fn()}
    />,
  );
  return game;
}

/** Hidden from TalkBack and VoiceOver alike. */
function expectHiddenOnBoth(el: ReturnType<typeof screen.getByTestId>) {
  expect(el).toHaveProp('importantForAccessibility', 'no-hide-descendants');
  expect(el).toHaveProp('accessibilityElementsHidden', true);
}

const content = () => screen.getByTestId('game-content', hidden);
/** The view that holds the game's live region (its text's parent). */
const liveRegion = () => screen.getByTestId('game-live', hidden).parent!;

describe('a cover over the online game hides the game from screen readers', () => {
  it('the connection error ("לא חזרת למשחק בזמן"): only its message and buttons are reached', async () => {
    const g = await live({
      rules: { graceMs: 1000, softGraceMs: 0 },
      options: { serverNoticeMs: 0, reconnectSlackMs: 0, afterGraceRetryMs: 2000 },
    });
    // While playing, the game is there for both readers.
    expect(content()).toHaveProp('importantForAccessibility', 'auto');
    expect(content()).toHaveProp('accessibilityElementsHidden', false);
    g.table.offline = true;
    await act(async () => {
      g.table.cutMe();
    });
    await pass(g.table, 4500);
    expect(screen.getByTestId('connection-error')).toBeOnTheScreen();
    expectHiddenOnBoth(content());
    expectHiddenOnBoth(liveRegion());
    expect(screen.getByTestId('connection-error-cover')).toHaveProp('accessibilityViewIsModal', true);
    // What a reader reaches: the error's header and buttons, and none of the game's ("כניעה", the cells).
    expect(screen.getByRole('header')).toHaveTextContent('לא חזרת למשחק בזמן');
    expect(screen.queryByRole('button', { name: 'כניעה' })).toBeNull();
    expect(screen.queryByTestId('board')).toBeNull();
  });

  it('the opponent left ("ניצחת בנטישה"): the game under the dialog is hidden on both platforms', async () => {
    const g = await live({ rules: { graceMs: 2000 } });
    await act(async () => {
      g.table.game!.apply({ type: 'disconnect', playerId: OPP });
    });
    // The ring's time-up state first (useTimeUpHold), then the dialog.
    await pass(g.table, 2500 + TIME_UP_HOLD_MS);
    expect(screen.getByTestId('opponent-left')).toBeOnTheScreen();
    expectHiddenOnBoth(content());
    expectHiddenOnBoth(liveRegion());
    expect(screen.getByTestId('opponent-left')).toHaveProp('accessibilityViewIsModal', true);
  });

  it('the opponent reconnecting (the freeze): hidden on both platforms too', async () => {
    const g = await live();
    await act(async () => {
      g.table.game!.apply({ type: 'disconnect', playerId: OPP });
    });
    await pass(g.table, 100);
    expect(screen.getByTestId('opponent-reconnecting-frozen', hidden)).toBeOnTheScreen();
    expectHiddenOnBoth(content());
  });

  it('the results watchdog’s cover (the results did not come): the game under it is hidden too', async () => {
    const g = await live();
    await act(async () => {
      g.table.opponent({ type: 'surrender' });
    });
    await pass(g.table, ONLINE_END_HOLD_MS + 100);
    expect(content()).toHaveProp('accessibilityElementsHidden', false);
    await pass(g.table, RESULTS_WATCHDOG_MS);
    expect(screen.getByTestId('results-fallback')).toBeOnTheScreen();
    expectHiddenOnBoth(content());
    expect(screen.queryByTestId('board')).toBeNull();
  });
});
