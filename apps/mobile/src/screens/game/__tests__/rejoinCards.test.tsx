// First: Reanimated's frame callbacks are set up before the screen's first animation frame.
import 'react-native-reanimated';
import type { LobbyPlayer } from '@sudoku-fight/protocol';
import { act, render, screen, within } from '@testing-library/react-native';

import { avatarIdsIn } from '../../../avatars/testing/avatarTesting';
import { OnlineSession } from '../../../game/onlineSession';
import { elapse, FakeFriendsTable, FCODE } from '../../../net/testing/fakeFriends';
import { FakeRoom } from '../../../net/testing/fakeServer';
import { hidden, type Setup, setUp } from '../connection/testing/setup';
import { OnlineGame } from '../online/OnlineGame';

/**
 * QA rejoin-opponent-avatar-lost: a friends game, the app swiped away mid-game and opened again. The new process
 * kept nothing of the lobby it saw, and the room sent only the snapshot, so the opponent's card showed the grey
 * avatar and no flag to the end (and on the results). The room now sends its `lobby` again after the snapshot
 * (GameRoom.welcomeBack; net/testing/fakeFriends.ts does the same): the cards come with it, also when the game
 * screen is already up.
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

const NINA: LobbyPlayer = { id: 'nina', name: 'NinaVolt', avatarId: 'pirate', country: 'DE', rating: 1190 };

let setup: Setup;
let session: OnlineSession | null = null;

beforeEach(async () => {
  setup = await setUp('he');
});

afterEach(() => {
  session?.close();
  session = null;
  jest.restoreAllMocks();
  setup.restore();
});

/** The fake server's clock and the phone's timers, together. */
async function pass(table: FakeFriendsTable, ms: number): Promise<void> {
  for (let done = 0; done < ms; done += 50) {
    await act(async () => {
      await elapse(table, 50);
      jest.advanceTimersByTime(50);
    });
  }
}

/** A friends game running already; this phone comes into it as after a cold start (a new ticket, no lobby kept). */
function coldReturn(): FakeFriendsTable {
  const table = new FakeFriendsTable({ host: false, others: [NINA] });
  table.startGame();
  session = new OnlineSession({
    host: table.host,
    request: { kind: 'friends', code: FCODE, reservation: table.reservation(), room: table.summary() },
    friends: { rejoin: table.rejoin },
  });
  return table;
}

const show = () =>
  render(
    <OnlineGame
      session={session!}
      onEnded={jest.fn()}
      onHome={jest.fn()}
      onRetry={jest.fn()}
      onLeave={jest.fn()}
    />,
  );

describe('back into a friends game after the app was killed (QA rejoin-opponent-avatar-lost)', () => {
  it('the cards come with the lobby after the snapshot: the opponent’s avatar and flag', async () => {
    const table = coldReturn();
    await session!.ready;
    await elapse(table, 200);
    expect(session!.hasGame).toBe(true);
    expect(session!.profiles?.[NINA.id]).toEqual({ avatarId: 'pirate', country: 'DE' });
    await show();
    const card = screen.getByTestId('card-opponent');
    expect(avatarIdsIn(card)).toEqual(['pirate']);
    expect(within(card).getByTestId('flag-DE', hidden)).toBeTruthy();
  });

  it('a lobby that comes after the game screen is up still gives the card its avatar and flag', async () => {
    // Hold the room's `lobby` back: the snapshot alone first, as two separate socket messages can arrive.
    const held: (() => void)[] = [];
    const deliver = FakeRoom.prototype.deliver;
    jest.spyOn(FakeRoom.prototype, 'deliver').mockImplementation(function (this: FakeRoom, m) {
      if (m.type === 'lobby') held.push(() => deliver.call(this, m));
      else deliver.call(this, m);
    });
    const table = coldReturn();
    await show();
    await pass(table, 200);
    expect(session!.hasGame).toBe(true);
    // Without the cards: the grey avatar, no flag (what QA saw to the end of the game).
    expect(within(screen.getByTestId('card-opponent')).queryByTestId('flag-DE', hidden)).toBeNull();
    expect(held).toHaveLength(1);
    await act(async () => held.forEach((release) => release()));
    await pass(table, 50);
    const card = screen.getByTestId('card-opponent');
    expect(avatarIdsIn(card)).toEqual(['pirate']);
    expect(within(card).getByTestId('flag-DE', hidden)).toBeTruthy();
  });
});
