import type { LobbyPlayer } from '@sudoku-fight/protocol';
import { render, screen, within } from '@testing-library/react-native';
import { View } from 'react-native';
import { getAnimatedStyle } from 'react-native-reanimated';

import { slamAt } from '../../game/connection/motion';
import { type Setup, setUp, styleOf, wait } from '../../game/connection/testing/setup';
import { FriendsCountdown } from '../FriendsCountdown';
import type { FriendsLobby } from '../friendsModel';
import { type FriendsRoomPhase, FriendsRoomScreen, type FriendsRoomScreenProps } from '../FriendsRoomScreen';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../../../services/feedback', () => ({ cue: jest.fn() }));

const MOSHE: LobbyPlayer = { id: 'p-moshe', name: 'MosheG', avatarId: 'av00', country: 'IL', rating: 1287 };
const DANA: LobbyPlayer = { id: 'p-dana', name: 'Dana', avatarId: 'av00', country: 'US', rating: 1190 };
const lobby: FriendsLobby = {
  code: '123456',
  gameType: 'fast',
  players: [MOSHE, DANA],
  hostId: 'p-moshe',
  minPlayers: 2,
  maxPlayers: 4,
};

function props(phase: FriendsRoomPhase): FriendsRoomScreenProps {
  return {
    phase,
    linkFor: (code) => `https://sudoku-fight-staging.fly.dev/r/${code}`,
    onShare: jest.fn().mockResolvedValue(undefined),
    onCopy: jest.fn().mockResolvedValue(undefined),
    onStart: jest.fn(),
    onSetGameType: jest.fn(),
    onKick: jest.fn(),
    onLeave: jest.fn(),
    onRetry: jest.fn(),
    onCreateRoom: jest.fn(),
    onJoinWithCode: jest.fn(),
    onHome: jest.fn(),
    onReplace: jest.fn(),
  };
}

/** A rendered element, and the way up from it. */
interface Drawn {
  props: { style?: unknown };
  parent: Drawn | null;
}

/** The lowest opacity on the way from the element up to the screen: what its first frame draws it at. */
function drawnOpacity(el: Drawn): number {
  let lowest = 1;
  for (let at: Drawn | null = el; at; at = at.parent) {
    const style = at.props.style as unknown;
    if (style !== undefined) lowest = Math.min(lowest, Number(styleOf({ props: { style } }).opacity ?? 1));
  }
  return lowest;
}

/**
 * QA go-hold-joiner (loop 12, 12 of 12 count starts on both phones): between the lobby and "3" one frame (two on
 * the host) showed only the header, then the count faded in from nothing. The count's whole column (the players
 * and the line under the step) entered at opacity 0. Now the players are there from the count's first frame;
 * only the step slams in.
 */
describe.each(['off', 'on'] as const)('the friends count’s first frame (reduced motion %s)', (reduce) => {
  let env: Setup;
  beforeEach(async () => {
    env = await setUp('he', reduce);
  });
  afterEach(() => env.restore());

  it('shows the players and the line at once, as the lobby goes', async () => {
    const p = props({ kind: 'lobby', lobby, myId: 'p-moshe' });
    const { rerender } = await render(<FriendsRoomScreen {...p} />);
    await wait(500);
    await rerender(
      <FriendsRoomScreen {...p} phase={{ kind: 'countdown', lobby, myId: 'p-moshe', step: 3 }} />,
    );
    // No time passes: the count's first frame.
    expect(drawnOpacity(screen.getByTestId('friends-countdown-p-moshe'))).toBe(1);
    expect(drawnOpacity(screen.getByTestId('friends-countdown-p-dana'))).toBe(1);
    expect(drawnOpacity(screen.getByText('התכוננו…'))).toBe(1);
    // The step itself still slams (or fades) in, and lands whole.
    await wait(600);
    expect(screen.getByTestId('friends-countdown-step')).toHaveAnimatedStyle({ opacity: 1 });
  });

  it('GO! slams from its own first frame, not from when the room noted it; the game screen’s GO! runs from that frame too (QA go-slam-start-skipped, APK 21)', async () => {
    // APK 21: the room noted GO! (goShownAt) as it rendered, and its first frame came 45–200 ms later (the render,
    // the commit, the mount): that frame showed the slam that far in, GO! first seen at 1.28–1.32 or at 0.96–0.98,
    // never from 1.4. Here the room noted it 100 ms before GO!'s first frame.
    const p = props({ kind: 'countdown', lobby, myId: 'p-moshe', step: 'go' });
    const goShownAt = Date.now() - 100;
    const view = await render(
      <>
        <View testID="room">
          <FriendsRoomScreen {...p} goShownAt={goShownAt} />
        </View>
        <View testID="cover-slot" />
      </>,
    );
    const drawnAt = Date.now();
    await wait(FRAME_MS);
    const room = () => goPose(within(screen.getByTestId('room')).getByTestId('friends-countdown-step'));
    // Its first frames: the slam's start (from 1.4 with the fade), not 100 ms into it.
    const start = slamAt(reduce === 'on', Date.now() - drawnAt);
    expect(room().opacity).toBeCloseTo(start.opacity, 3);
    expect(room().scale).toBeCloseTo(start.scale, 3);
    if (reduce === 'off') expect(room().scale).toBeGreaterThan(1.35);

    // The game screen's GO! (the cover, the same goShownAt), mounted later: where the room's is, from that frame.
    for (let k = 0; k < 3; k += 1) await wait(FRAME_MS);
    await view.rerender(
      <>
        <View testID="room">
          <FriendsRoomScreen {...p} goShownAt={goShownAt} />
        </View>
        <View testID="cover-slot">
          <FriendsCountdown lobby={lobby} myId="p-moshe" step="go" goShownAt={goShownAt} cover />
        </View>
      </>,
    );
    for (let k = 0; k < 3; k += 1) {
      await wait(FRAME_MS);
      const at = slamAt(reduce === 'on', Date.now() - drawnAt);
      const cover = goPose(within(screen.getByTestId('cover-slot')).getByTestId('friends-countdown-step'));
      expect(cover.opacity).toBeCloseTo(at.opacity, 3);
      expect(cover.scale).toBeCloseTo(at.scale, 3);
      expect(room()).toEqual(cover);
    }
  });
});

/** A GO!'s opacity and scale as drawn now. */
function goPose(el: Parameters<typeof getAnimatedStyle>[0]): { opacity: number; scale: number } {
  const style = getAnimatedStyle(el) as { opacity?: number; transform?: { scale?: number }[] };
  return { opacity: style.opacity ?? 1, scale: style.transform?.[0]?.scale ?? 1 };
}

/** One frame of the UI thread (requestAnimationFrame under fake timers). */
const FRAME_MS = 16;
