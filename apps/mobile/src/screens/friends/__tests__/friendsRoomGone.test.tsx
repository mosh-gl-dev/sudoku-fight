// First: keeps the real Reanimated in place of the router testing library's old mock (see homeTesting.tsx).
import 'react-native-reanimated';
import { router, Stack } from 'expo-router';
import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { BackHandler, Text } from 'react-native';

import FriendsRoomRoute from '../../../../app/friends/room';
import { useAuth } from '../../../auth/authStore';
import { usePendingInvite } from '../../../auth/pendingInvite';
import { useGameStore } from '../../../game/gameStore';
import i18n from '../../../i18n';
import { createFriendsRooms } from '../../../net/friends';
import { deviceFriendsDeps, setFriendsRooms } from '../../../net/friendsDevice';
import { elapse, FakeFriendsTable, FakeRoomsApi } from '../../../net/testing/fakeFriends';
import { useProfile } from '../../../state/profile';
import { useSettings } from '../../../state/settings';
import { renderApp } from '../../home/testing/homeTesting';

/**
 * QA "friends-room-spinner-after-game" (APK 17): the host's room screen showed only "חדר עם חברים" and a spinner
 * for over a minute: no code, no seats, no back button, and Android's back left the app (the screen was the
 * stack's only one). That is the route's 'gone' phase (no room: left, or the room closed after its game, with
 * no reason to say), which only covers the route's own move away (goBack), with no way out of its own. When the
 * move did not come, the spinner stayed for good.
 *
 * Here the move goes nowhere (goBack does nothing, as on the phone): past a short wait the screen says the room
 * is closed, with "צור חדר" and "לבית".
 *
 * And the likely way in: a room screen left under the game and its results (a second room screen pushed by a
 * recreated root's start) whose "no room any more" went back from under them, taking the results away.
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
// The route's move away that does not come.
jest.mock('../../home/navigation', () => ({
  ...jest.requireActual<typeof import('../../home/navigation')>('../../home/navigation'),
  goBack: jest.fn(),
}));

const navigation = jest.requireMock<{ goBack: jest.Mock }>('../../home/navigation');
const realGoBack = jest.requireActual<typeof import('../../home/navigation')>('../../home/navigation').goBack;

let table: FakeFriendsTable;
let api: FakeRoomsApi;

beforeEach(async () => {
  jest.useRealTimers();
  useProfile.setState({
    name: 'Moshe',
    avatarId: 'av00',
    country: 'IL',
    lastPlay: null,
    friendsGameType: null,
  });
  useSettings.setState({ reduceMotion: 'on' });
  await i18n.changeLanguage('he');
  useAuth.setState({ status: 'ready' });
  usePendingInvite.setState({ room: null });
  table = new FakeFriendsTable();
  api = new FakeRoomsApi(table);
  setFriendsRooms(createFriendsRooms(deviceFriendsDeps({ api: () => api, makeHost: () => table.host })));
  navigation.goBack.mockReset();
});

afterEach(async () => {
  await act(async () => useGameStore.getState().clear());
  setFriendsRooms(null);
});

jest.setTimeout(30_000);

describe('the room screen with no room, its move away gone nowhere (QA friends-room-spinner-after-game)', () => {
  it('a spinner for a moment, then "החדר נסגר." with "צור חדר" and "לבית"', async () => {
    const app = await renderApp('/friends/room', { 'friends/room': () => <FriendsRoomRoute /> });
    expect(screen.getByTestId('friends-gone')).toBeOnTheScreen();
    expect(navigation.goBack).toHaveBeenCalledTimes(1);

    await waitFor(() => expect(screen.getByTestId('friends-closed')).toBeOnTheScreen(), { timeout: 4000 });
    expect(screen.queryByTestId('friends-gone')).toBeNull();
    expect(screen.getByText('החדר נסגר.')).toBeOnTheScreen();
    expect(screen.getByTestId('friends-create')).toBeOnTheScreen();
    expect(screen.getByTestId('friends-home')).toBeOnTheScreen();

    // "צור חדר": a new room, here.
    await fireEvent.press(screen.getByTestId('friends-create'));
    await act(() => elapse(table, 100));
    expect(api.calls).toEqual([{ kind: 'create', body: expect.any(Object) }]);
    expect(app.pathname()).toBe('/friends/room');
    await waitFor(() => expect(screen.getByTestId('friends-code')).toBeOnTheScreen());
    expect(screen.queryByTestId('friends-closed')).toBeNull();
  });

  it('"לבית" from there goes Home', async () => {
    const app = await renderApp('/friends/room', { 'friends/room': () => <FriendsRoomRoute /> });
    await waitFor(() => expect(screen.getByTestId('friends-home')).toBeOnTheScreen(), { timeout: 4000 });
    await fireEvent.press(screen.getByTestId('friends-home'));
    await waitFor(() => expect(app.pathname()).toBe('/'));
  });

  it('Android back there (nothing under it) goes Home, not out of the app', async () => {
    const backs = jest.spyOn(BackHandler, 'addEventListener');
    const app = await renderApp('/friends/room', { 'friends/room': () => <FriendsRoomRoute /> });
    await waitFor(() => expect(screen.getByTestId('friends-closed')).toBeOnTheScreen(), { timeout: 4000 });
    const handler = backs.mock.calls.filter(([event]) => event === 'hardwareBackPress').at(-1)?.[1] as
      (() => boolean | null | undefined) | undefined;
    let handled: boolean | null | undefined = false;
    await act(async () => {
      handled = handler?.();
    });
    expect(handled).toBe(true);
    await waitFor(() => expect(app.pathname()).toBe('/'));
    backs.mockRestore();
  });

  it('a room screen under another (the results) never moves that one away; it moves on once shown again', async () => {
    navigation.goBack.mockImplementation(realGoBack);
    const app = await renderApp('/', {
      // As on the phone (native stack on Fabric): the screen right under the one shown is not frozen.
      _layout: () => <Stack screenOptions={{ freezeOnBlur: false }} />,
      index: () => <Text testID="stub-home">home</Text>,
      'friends/room': () => <FriendsRoomRoute />,
      'results/[id]': () => <Text testID="stub-results">results</Text>,
    });
    await act(async () => router.push({ pathname: '/friends/room', params: { create: '1' } }));
    await act(() => elapse(table, 100));
    expect(screen.getByTestId('friends-code')).toBeOnTheScreen();
    // Another screen over it (as the results over a room screen left under the game).
    await act(async () => router.push('/results/g1'));
    expect(app.pathname()).toBe('/results/g1');

    // The room ends (closed after its game: no room any more) while the results are shown.
    await act(async () => useGameStore.getState().clear());
    // Past the closed room's way out (2 s): renderRouter's fake timers.
    await act(async () => jest.advanceTimersByTime(2500));
    expect(app.pathname()).toBe('/results/g1');
    expect(navigation.goBack).not.toHaveBeenCalled();

    // Shown again: it moves on.
    await act(async () => router.back());
    await act(async () => jest.advanceTimersByTime(100));
    expect(app.pathname()).toBe('/');
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });
});
