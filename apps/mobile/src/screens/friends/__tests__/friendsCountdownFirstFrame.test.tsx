import type { LobbyPlayer } from '@sudoku-fight/protocol';
import { render, screen } from '@testing-library/react-native';
import { getAnimatedStyle } from 'react-native-reanimated';

import { slamAt } from '../../game/connection/motion';
import { type Setup, setUp, styleOf, wait } from '../../game/connection/testing/setup';
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

  it('GO! is set by the time the room noted it (goShownAt), the one the game screen’s GO! takes (QA go-cover-slam-jump, loop 15)', async () => {
    const p = props({ kind: 'countdown', lobby, myId: 'p-moshe', step: 'go' });
    // The room noted GO! 100 ms before this GO! first rendered: both GO!s run on that time, not each on its own.
    const goShownAt = Date.now() - 100;
    await render(<FriendsRoomScreen {...p} goShownAt={goShownAt} />);
    await wait(FRAME_MS);
    const at = slamAt(reduce === 'on', Date.now() - goShownAt);
    const style = getAnimatedStyle(screen.getByTestId('friends-countdown-step')) as {
      opacity?: number;
      transform?: { scale?: number }[];
    };
    expect(style.opacity ?? 1).toBeCloseTo(at.opacity, 3);
    expect(style.transform?.[0]?.scale ?? 1).toBeCloseTo(at.scale, 3);
  });
});

/** One frame of the UI thread (requestAnimationFrame under fake timers). */
const FRAME_MS = 16;
