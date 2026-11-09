// First: keeps the real Reanimated in place of the router testing library's old mock (see homeTesting.tsx).
import 'react-native-reanimated';
import { router } from 'expo-router';
import { act, fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import { useState } from 'react';
import { AppState, BackHandler, Share, Text } from 'react-native';

import FriendsJoinRoute from '../../../../app/friends/join';
import FriendsRoomRoute from '../../../../app/friends/room';
import RoomByCodeRoute from '../../../../app/room/[code]';
import { RoomsApiError } from '../../../api/roomsApi';
import { useAuth } from '../../../auth/authStore';
import { rememberRoom, usePendingInvite } from '../../../auth/pendingInvite';
import { ltr } from '../../../components/player/format';
import { useGameStore } from '../../../game/gameStore';
import { openPracticeRepo } from '../../../game/practiceRepo';
import { practiceStorageOrNull } from '../../../game/storage';
import { memoryDb } from '../../../game/testing/sqlJsDb';
import i18n from '../../../i18n';
import { createFriendsRooms } from '../../../net/friends';
import { deviceFriendsDeps, setFriendsRooms } from '../../../net/friendsDevice';
import { GoCover } from '../../match/GoCover';
import { handedGoCover, handGoCover } from '../../match/goHandoff';
import { DANA, elapse, FakeFriendsTable, FakeRoomsApi, FCODE } from '../../../net/testing/fakeFriends';
import { ME } from '../../../net/testing/fakeServer';
import { useProfile } from '../../../state/profile';
import { useSettings } from '../../../state/settings';
import { hidden, iso } from '../../game/connection/testing/setup';
import { renderApp } from '../../home/testing/homeTesting';

/**
 * The friends screens with their routes and net/friends.ts (1.0.4; friends-room.md §3): "צור חדר" from "משחק
 * חדש" opens the room at once, a friend comes in, "התחל" counts 3… 2… 1…, and the game screen takes over; a
 * typed code and a link go straight in; leaving the screen leaves the room. The server is M1's fake
 * (net/testing/fakeFriends.ts): its routes and its room.
 */

type Mocks = typeof import('../../home/testing/nativeMocks');

jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated'));
jest.mock(
  '../../../game/storage',
  () => jest.requireActual<Mocks>('../../home/testing/nativeMocks').practiceStorage,
);
jest.mock('../../../services/analytics', () => ({ track: jest.fn() }));
jest.mock('expo-audio', () => jest.requireActual<Mocks>('../../home/testing/nativeMocks').expoAudio);
jest.mock('expo-haptics', () => jest.requireActual<Mocks>('../../home/testing/nativeMocks').expoHaptics);
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(() => Promise.resolve(true)),
  getStringAsync: jest.fn(() => Promise.resolve('')),
}));

const clipboard = jest.requireMock<{ setStringAsync: jest.Mock; getStringAsync: jest.Mock }>(
  'expo-clipboard',
);

const ROUTES = {
  'friends/room': () => <FriendsRoomRoute />,
  'friends/join': () => <FriendsJoinRoute />,
  'room/[code]': () => <RoomByCodeRoute />,
  game: () => <StubGame />,
};

/** The game route as app/game.tsx opens it: on the GO! handed over (GoCover), read as it first renders. */
function StubGame() {
  const [goCover] = useState(handedGoCover);
  return (
    <GoCover model={goCover}>
      <Text testID="stub-game">game</Text>
    </GoCover>
  );
}

let table: FakeFriendsTable;
let api: FakeRoomsApi;

beforeEach(async () => {
  jest.useRealTimers();
  const repo = await openPracticeRepo(await memoryDb());
  jest.mocked(practiceStorageOrNull).mockImplementation(async () => repo);
  useProfile.setState({
    name: 'Moshe',
    avatarId: 'av00',
    country: 'IL',
    lastPlay: null,
    friendsGameType: null,
  });
  useSettings.setState({ reduceMotion: 'on' });
  await i18n.changeLanguage('he');
  // A signed-in player (a room link's screen waits for that); the routes are the fake's.
  useAuth.setState({ status: 'ready' });
  usePendingInvite.setState({ room: null });
  table = new FakeFriendsTable();
  api = new FakeRoomsApi(table);
  setFriendsRooms(createFriendsRooms(deviceFriendsDeps({ api: () => api, makeHost: () => table.host })));
});

afterEach(async () => {
  await act(async () => useGameStore.getState().clear());
  setFriendsRooms(null);
  jest.useRealTimers();
});

/** Lets the fake server's messages arrive (its clock is its own). */
const serve = (ms = 100) => act(() => elapse(table, ms));

describe('the friends routes', () => {
  it('"צור חדר" → the room at once, my last type; a friend comes in; "התחל" → 3… 2… 1… → the game', async () => {
    useProfile.setState({ lastPlay: { mode: 'ranked', gameType: 'hard', players: 2 } });
    const app = await renderApp('/modes', ROUTES);
    await fireEvent.press(screen.getByTestId('modes-friends-create'));
    expect(app.pathname()).toBe('/friends/room');
    await serve();
    // POST /v1/rooms with my last game type [D82].
    expect(api.calls).toEqual([{ kind: 'create', body: expect.objectContaining({ gameType: 'hard' }) }]);
    await waitFor(() => expect(screen.getByTestId('friends-code')).toHaveTextContent(ltr('123 456')));
    expect(screen.getByTestId('friends-seat-0-who')).toHaveAccessibleName(
      'Moshe, אני, מארח, ישראל, דירוג 1287',
    );
    expect(screen.getByTestId('friends-start')).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ disabled: true }),
    );

    // Dana comes in: her seat, and "התחל משחק · 2 שחקנים".
    await act(async () =>
      table.arrive({ id: DANA, name: 'Dana', avatarId: 'av00', country: 'IL', rating: 1190 }),
    );
    await serve();
    expect(screen.getByTestId('friends-seat-1-who')).toHaveAccessibleName('Dana, ישראל, דירוג 1190');
    expect(screen.getByTestId('friends-live')).toHaveTextContent(`${iso('Dana')} הצטרף`);

    // The host's game type and start reach the server.
    await fireEvent.press(screen.getByRole('radio', { name: 'מהיר' }));
    await fireEvent.press(screen.getByRole('button', { name: 'התחל משחק · 2 שחקנים' }));
    await serve();
    expect(table.commands).toEqual([{ type: 'setGameType', gameType: 'fast' }, { type: 'start' }]);

    // 3… 2… 1…, then GO and the board: the game screen.
    await act(async () => void table.countdown(3000));
    await serve();
    await waitFor(() => expect(screen.getByTestId('friends-countdown-step')).toHaveTextContent('3'));
    await act(async () => {
      await elapse(table, 3000);
      table.startGame();
    });
    await serve();
    await waitFor(() => expect(app.pathname()).toBe('/game'));
    expect(useGameStore.getState().online?.isFriends).toBe(true);
    // A game with friends is not Home's "עוד סיבוב": the last setting stays the ranked one.
    expect(useProfile.getState().lastPlay).toEqual({ mode: 'ranked', gameType: 'hard', players: 2 });
  });

  it('the board before my own GO (a clock a little behind the server’s): GO! first, then the game (QA loop 8), opened at once over that GO! (QA go-hold-joiner, loop 13)', async () => {
    const app = await renderApp('/friends/room?create=1', ROUTES);
    await serve();
    await waitFor(() => expect(screen.getByTestId('friends-code')).toBeOnTheScreen());
    await act(async () =>
      table.arrive({ id: DANA, name: 'Dana', avatarId: 'av00', country: 'IL', rating: 1190 }),
    );
    await serve();
    await fireEvent.press(screen.getByRole('button', { name: 'התחל משחק · 2 שחקנים' }));
    await act(async () => void table.countdown(3000));
    await serve();
    await waitFor(() => expect(screen.getByTestId('friends-countdown-step')).toHaveTextContent('3'));
    // The game comes while this phone still counts "1".
    await act(async () => {
      await elapse(table, 2300);
      table.startGame();
    });
    await serve();
    // GO!, never "1", and the game screen opens at once over it: no hold on the room first (it put the game's
    // whole mount after 250 ms of GO!), the game screen keeping this GO! until the game is drawn under it.
    expect(app.pathname()).toBe('/game');
    // The game screen's first frame is the room's GO! picture (header, players, GO! and its line), never "1".
    const frame = screen.getByTestId('friends-go-frame', hidden);
    expect(within(frame).getByTestId('friends-countdown-step', hidden)).toHaveTextContent('GO!');
    expect(within(frame).getByText('מכינים את הלוח…', hidden)).toBeOnTheScreen();
    expect(within(frame).getByTestId(`friends-countdown-${ME}`, hidden)).toBeOnTheScreen();
    expect(within(frame).getByTestId(`friends-countdown-${DANA}`, hidden)).toBeOnTheScreen();
    for (const step of screen.getAllByTestId('friends-countdown-step', hidden))
      expect(step).toHaveTextContent('GO!');
    expect(handedGoCover()).toEqual({
      kind: 'friendsGo',
      lobby: expect.objectContaining({
        players: [expect.objectContaining({ id: ME }), expect.objectContaining({ id: DANA })],
      }),
      myId: ME,
      shownAt: expect.any(Number),
    });
    await act(async () => handGoCover(null));
  });

  it('"שתף קישור" and "העתק קוד" use the share sheet and the clipboard', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    await renderApp('/friends/room?create=1', ROUTES);
    await serve();
    await waitFor(() => expect(screen.getByTestId('friends-code')).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'שתף קישור' }));
    expect(share).toHaveBeenCalledWith({
      message: `בוא לשחק איתי סודוקו פייט! קוד החדר: ${FCODE}\nhttp://localhost:2567/r/${FCODE}`,
    });
    await fireEvent.press(screen.getByRole('button', { name: 'העתק קוד' }));
    await waitFor(() => expect(screen.getByTestId('friends-copied')).toBeOnTheScreen());
    expect(clipboard.setStringAsync).toHaveBeenCalledWith(FCODE);
    share.mockRestore();
  });

  it('the next "צור חדר" opens with the type I chose in my last room, not the last practice’s (QA friends-room-type-not-remembered)', async () => {
    // The last game elsewhere was hard: the first room opens with it [D82].
    useProfile.setState({
      lastPlay: { mode: 'ranked', gameType: 'hard', players: 2 },
      friendsGameType: null,
    });
    const app = await renderApp('/modes', ROUTES);
    await fireEvent.press(screen.getByTestId('modes-friends-create'));
    await serve();
    expect(api.calls).toEqual([{ kind: 'create', body: expect.objectContaining({ gameType: 'hard' }) }]);
    await waitFor(() => expect(screen.getByTestId('friends-code')).toBeOnTheScreen());
    // I choose "מהיר" there, and the server takes it (its lobby says so).
    await fireEvent.press(screen.getByRole('radio', { name: 'מהיר' }));
    await serve();
    expect(table.commands).toEqual([{ type: 'setGameType', gameType: 'fast' }]);
    table.gameType = 'fast';
    await act(async () => table.lobby());
    await serve();
    expect(useProfile.getState().friendsGameType).toBe('fast');
    // Home's "עוד סיבוב" keeps the last practice or ranked game.
    expect(useProfile.getState().lastPlay).toEqual({ mode: 'ranked', gameType: 'hard', players: 2 });
    await fireEvent.press(screen.getByRole('button', { name: 'יציאה מהחדר' }));
    await serve();
    expect(app.pathname()).toBe('/modes');

    // A new room later (a fresh server table): it opens with "מהיר".
    table = new FakeFriendsTable();
    api = new FakeRoomsApi(table);
    setFriendsRooms(createFriendsRooms(deviceFriendsDeps({ api: () => api, makeHost: () => table.host })));
    await fireEvent.press(screen.getByTestId('modes-friends-create'));
    await serve();
    expect(api.calls).toEqual([{ kind: 'create', body: expect.objectContaining({ gameType: 'fast' }) }]);
  });

  it('a room whose hosting passed to me (its host left) is not my choice: its type is not remembered, until I change it', async () => {
    useProfile.setState({ friendsGameType: 'fast' });
    table = new FakeFriendsTable({ host: false });
    table.gameType = 'hard';
    api = new FakeRoomsApi(table);
    setFriendsRooms(createFriendsRooms(deviceFriendsDeps({ api: () => api, makeHost: () => table.host })));
    const app = await renderApp('/friends/join', ROUTES);
    for (const [i, d] of [...FCODE].entries())
      await fireEvent.changeText(screen.getByTestId(`friends-code-input-${i}`), d);
    await serve();
    await waitFor(() => expect(app.pathname()).toBe('/friends/room'));
    await serve();
    await waitFor(() => expect(screen.getByTestId('friends-code')).toBeOnTheScreen());
    // Dana (the host) leaves: I host her "קשה" room now.
    table.players = table.players.filter((p) => p.id !== DANA);
    table.hostId = ME;
    await act(async () => table.lobby());
    await serve();
    await waitFor(() => expect(screen.getByRole('radio', { name: 'מהיר' })).toBeOnTheScreen());
    expect(useProfile.getState().friendsGameType).toBe('fast');
    // My own choice there is remembered.
    await fireEvent.press(screen.getByRole('radio', { name: 'רגיל' }));
    await serve();
    table.gameType = 'normal';
    await act(async () => table.lobby());
    await serve();
    expect(useProfile.getState().friendsGameType).toBe('normal');
  });

  it('"יציאה מהחדר" leaves the room (the seat is freed) and goes back', async () => {
    const app = await renderApp('/modes', ROUTES);
    await fireEvent.press(screen.getByTestId('modes-friends-create'));
    await serve();
    await waitFor(() => expect(screen.getByTestId('friends-code')).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'יציאה מהחדר' }));
    await serve();
    expect(app.pathname()).toBe('/modes');
    expect(useGameStore.getState().online).toBeNull();
    expect(table.players.some((p) => p.id === 'me')).toBe(false);
  });

  it('a lobby I host already: "לסגור את החדר הקודם?", then a new room with replace', async () => {
    api.refuse = new RoomsApiError('tooManyRooms', 409, {
      error: 'tooManyRooms',
      rooms: true,
      code: '654321',
    });
    await renderApp('/friends/room?create=1', ROUTES);
    await serve();
    await waitFor(() =>
      expect(screen.getByRole('header', { name: 'לסגור את החדר הקודם?' })).toBeOnTheScreen(),
    );
    api.refuse = null;
    await fireEvent.press(screen.getByRole('button', { name: 'סגור ופתח חדש' }));
    await serve();
    expect(api.calls[1]).toEqual({ kind: 'create', body: expect.objectContaining({ replace: true }) });
    await waitFor(() => expect(screen.getByTestId('friends-code')).toBeOnTheScreen());
  });

  it('"הצטרף עם קוד": six digits → POST /v1/rooms/join → the room; a wrong code is said under the boxes', async () => {
    const app = await renderApp('/friends/join', ROUTES);
    for (const [i, d] of [...'111111'].entries())
      await fireEvent.changeText(screen.getByTestId(`friends-code-input-${i}`), d);
    await serve();
    await waitFor(() =>
      expect(screen.getByTestId('friends-code-input-error')).toHaveTextContent(
        `לא מצאנו חדר עם הקוד ${String.fromCharCode(0x2066)}111 111${String.fromCharCode(0x2069)}. בדוק את הספרות.`,
      ),
    );
    expect(app.pathname()).toBe('/friends/join');

    clipboard.getStringAsync.mockResolvedValueOnce(`קוד החדר: ${FCODE} https://x/r/${FCODE}`);
    await fireEvent.press(screen.getByRole('button', { name: 'הדבק' }));
    await serve();
    await waitFor(() => expect(app.pathname()).toBe('/friends/room'));
    expect(api.calls.map((c) => c.body)).toEqual([
      expect.objectContaining({ code: '111111' }),
      expect.objectContaining({ code: FCODE }),
    ]);
    await serve();
    await waitFor(() => expect(screen.getByTestId('friends-code')).toHaveTextContent(ltr('123 456')));
  });

  it('a link (/room/123456) goes straight in [D88]; a room that is not there is said, with the way on', async () => {
    const app = await renderApp(`/room/${FCODE}`, ROUTES);
    await serve();
    await waitFor(() => expect(app.pathname()).toBe('/friends/room'));
    expect(api.calls).toEqual([{ kind: 'join', body: expect.objectContaining({ code: FCODE }) }]);
    await act(async () => useGameStore.getState().clear());

    await renderApp('/room/999999', ROUTES);
    await serve();
    await waitFor(() =>
      expect(screen.getByText(/לא מצאנו חדר עם הקוד .*999 999.*\. בדוק את הספרות\./)).toBeOnTheScreen(),
    );
    expect(screen.getByRole('button', { name: 'הצטרף עם קוד' })).toBeOnTheScreen();
  });

  it('back while "פותח חדר…": the late room is never entered, and what the player started meanwhile stays', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const create = api.create.bind(api);
    api.create = (request) => {
      const answer = create(request);
      return gate.then(() => answer);
    };
    const app = await renderApp('/modes', ROUTES);
    await fireEvent.press(screen.getByTestId('modes-friends-create'));
    await waitFor(() => expect(screen.getByTestId('friends-opening')).toBeOnTheScreen());
    await serve();
    expect(api.calls).toHaveLength(1);
    await act(async () => router.back());
    await serve();
    expect(app.pathname()).toBe('/modes');
    // A practice, started while the server still had not answered.
    const practice = await act(() => useGameStore.getState().startPractice({ gameType: 'fast' }));
    await act(async () => release());
    await serve();
    expect(useGameStore.getState().online).toBeNull();
    expect(useGameStore.getState().session).toBe(practice);
    expect(app.pathname()).toBe('/modes');
  });

  it('back while "מצטרף לחדר…" (a typed code): the late seat is never taken, nothing navigates', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const join = api.join.bind(api);
    api.join = (request) => {
      const answer = join(request);
      return gate.then(() => answer);
    };
    const app = await renderApp('/modes', ROUTES);
    await act(async () => router.push('/friends/join'));
    for (const [i, d] of [...FCODE].entries())
      await fireEvent.changeText(screen.getByTestId(`friends-code-input-${i}`), d);
    await serve();
    expect(api.calls).toHaveLength(1);
    await act(async () => router.back());
    await serve();
    await act(async () => release());
    await serve();
    expect(useGameStore.getState().online).toBeNull();
    expect(app.pathname()).toBe('/modes');
  });

  it('3… 2… 1…: Android back is held (the game is never left without a screen), then the board', async () => {
    const backs = jest.spyOn(BackHandler, 'addEventListener');
    const pressBack = () =>
      act(() => {
        const handlers = backs.mock.calls
          .filter(([event]) => event === 'hardwareBackPress')
          .map(([, handler]) => handler as () => boolean | null | undefined)
          .reverse();
        for (const handler of handlers) if (handler()) return true;
        return false;
      });
    const app = await renderApp('/friends/room?create=1', ROUTES);
    await serve();
    await waitFor(() => expect(screen.getByTestId('friends-code')).toBeOnTheScreen());
    await act(async () =>
      table.arrive({ id: DANA, name: 'Dana', avatarId: 'av00', country: 'IL', rating: 1190 }),
    );
    await serve();
    await fireEvent.press(screen.getByRole('button', { name: 'התחל משחק · 2 שחקנים' }));
    await act(async () => void table.countdown(3000));
    await serve();
    await waitFor(() => expect(screen.getByTestId('friends-countdown-step')).toBeOnTheScreen());

    expect(await pressBack()).toBe(true);
    await serve();
    expect(app.pathname()).toBe('/friends/room');
    expect(useGameStore.getState().online?.isFriends).toBe(true);

    await act(async () => {
      await elapse(table, 3000);
      table.startGame();
    });
    await serve();
    await waitFor(() => expect(app.pathname()).toBe('/game'));
    backs.mockRestore();
  });

  it('back to my room after the app was closed (?resume=1), the game started without me: "המשחק התחיל בלעדיך" [D83]; the room is forgotten', async () => {
    rememberRoom(FCODE, 'uid-me');
    api.refuse = new RoomsApiError('gameStarted', 409, { error: 'gameStarted', rooms: true });
    await renderApp(`/room/${FCODE}?resume=1`, ROUTES);
    await serve();
    await waitFor(() => expect(screen.getByText('המשחק התחיל בלעדיך.')).toBeOnTheScreen());
    expect(usePendingInvite.getState().room).toBeNull();
    // A stranger's link to the same room: the stranger's words.
    await act(async () => useGameStore.getState().clear());
    await renderApp(`/room/${FCODE}`, ROUTES);
    await serve();
    await waitFor(() => expect(screen.getByText('המשחק בחדר הזה כבר התחיל.')).toBeOnTheScreen());
  });

  it('?resume=1 with no connection: the room is kept for the next start', async () => {
    rememberRoom(FCODE, 'uid-me');
    api.refuse = new RoomsApiError('network', 0);
    await renderApp(`/room/${FCODE}?resume=1`, ROUTES);
    await serve();
    await waitFor(() => expect(screen.getByTestId('friends-failed')).toBeOnTheScreen());
    expect(usePendingInvite.getState().room).toMatchObject({ code: FCODE });
  });

  it('put out by the host: "המארח הוציא אותך מהחדר", and a new room is a tap away', async () => {
    await renderApp('/friends/room?create=1', ROUTES);
    await serve();
    await waitFor(() => expect(screen.getByTestId('friends-code')).toBeOnTheScreen());
    await act(async () => table.closeMe('kicked'));
    await serve();
    await waitFor(() => expect(screen.getByText('המארח הוציא אותך מהחדר.')).toBeOnTheScreen());
    expect(screen.getByRole('button', { name: 'צור חדר' })).toBeOnTheScreen();
  });
});

describe('the room screen going with its React root (QA density-change-orphans-ranked-game)', () => {
  /** A lobby I host, Dana in it. */
  async function lobby() {
    await renderApp('/friends/room?create=1', ROUTES);
    await serve();
    await waitFor(() => expect(screen.getByTestId('friends-code')).toBeOnTheScreen());
    await act(async () =>
      table.arrive({ id: DANA, name: 'Dana', avatarId: 'av00', country: 'IL', rating: 1190 }),
    );
    await serve();
  }

  it('left by the player (the app in front): the seat is freed, as before', async () => {
    await lobby();
    await act(async () => screen.unmount());
    await serve();
    expect(useGameStore.getState().online).toBeNull();
    expect(table.players.some((p) => p.id === 'me')).toBe(false);
  });

  it('Android recreating the activity (paused first): the seat and the room stay, for the new root', async () => {
    await lobby();
    const session = useGameStore.getState().online;
    // The activity's pause reached AppState before its surface's stop unmounted the tree. (The test
    // environment's AppState holds a mock function there: set the value, then put it back.)
    const appState = AppState as { currentState: unknown };
    const was = appState.currentState;
    appState.currentState = 'background';
    try {
      await act(async () => screen.unmount());
    } finally {
      appState.currentState = was;
    }
    await serve();
    expect(useGameStore.getState().online).toBe(session);
    expect(table.players.some((p) => p.id === 'me')).toBe(true);
  });
});
