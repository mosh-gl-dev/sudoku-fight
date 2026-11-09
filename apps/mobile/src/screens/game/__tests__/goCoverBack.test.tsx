import { act, render, screen } from '@testing-library/react-native';
import { BackHandler } from 'react-native';

import { SWAP_FRAMES } from '../../../components/ui/retire';
import { motion } from '../../../theme/motion';
import { GoCover, UNDER_OPACITY } from '../../match/GoCover';
import { headerOf, type MatchScreenModel } from '../../match/matchModel';
import { type Setup, setUp, wait } from '../connection/testing/setup';
import { OnlineGame } from '../online/OnlineGame';
import { liveOnlineSession, type OnlineGame as Online } from '../testing/online';

/**
 * QA fixcheck of APK 13 (back-during-go-opens-surrender): Android's back while GO! was still on the game route
 * (the game already mounted under GoCover, 0.3–0.6 s before the board showed) opened "אתה בטוח שאתה רוצה
 * להיכנע?" over GO!. GoCover blocked back only for its first frame, and the game screen's own handler, registered
 * later, is the one React Native asks first. From "found" on back does nothing [D32]; GO! stands for that screen.
 *
 * The real GoCover over the real OnlineGame (its GameScreen) on a live fake server.
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

type CountdownModel = Extract<MatchScreenModel, { kind: 'countdown' }>;

const GO: CountdownModel = {
  kind: 'countdown',
  header: headerOf('normal-2p'),
  seats: [
    {
      id: 'me',
      name: 'Moshe',
      avatarId: 'av00',
      country: 'IL',
      rating: 1200,
      provisional: false,
      isMe: true,
      colorIndex: 0,
      ready: true,
    },
    {
      id: 'opp',
      name: 'Noa',
      avatarId: 'av00',
      country: 'IL',
      rating: 1210,
      provisional: false,
      isMe: false,
      colorIndex: 1,
      ready: true,
    },
  ],
  step: 'go',
  remainingMs: 0,
};

/** One frame of the UI thread (requestAnimationFrame under fake timers). */
const FRAME_MS = 16;

let env: Setup;
let game: Online | null = null;
let backs: jest.SpyInstance;

afterEach(() => {
  game?.session.close();
  game = null;
  backs.mockRestore();
  env.restore();
});

/** Android back: the newest handler first, as React Native does, until one takes it. Whether one did. */
async function pressBack(): Promise<boolean> {
  const handlers = backs.mock.calls
    .filter(([event]) => event === 'hardwareBackPress')
    .map(([, handler]) => handler as () => boolean | null | undefined)
    .reverse();
  let taken = false;
  await act(async () => {
    for (const handler of handlers) {
      // A removed handler is still in the spy's calls; GoCover's first-frame one returns true all the same.
      if (handler()) {
        taken = true;
        return;
      }
    }
  });
  return taken;
}

describe.each(['off', 'on'] as const)('reduced motion %s', (reduceMotion) => {
  const fadeMs = reduceMotion === 'on' ? motion.duration.reducedFade : motion.duration.stateChange;

  it('back does nothing while GO! is on screen (the game under it, then its fade), and asks to surrender after', async () => {
    env = await setUp('he', reduceMotion);
    backs = jest.spyOn(BackHandler, 'addEventListener');
    game = await liveOnlineSession();
    const onLeave = jest.fn();
    const onHome = jest.fn();
    await render(
      <GoCover model={GO}>
        <OnlineGame
          session={game.session}
          onEnded={jest.fn()}
          onHome={onHome}
          onRetry={jest.fn()}
          onLeave={onLeave}
          onPractice={jest.fn()}
        />
      </GoCover>,
    );

    // A frame later the game is mounted under GO! (with its own back handler): back takes nothing from it.
    await wait(FRAME_MS);
    expect(screen.getByTestId('go-cover-game')).toHaveAnimatedStyle({ opacity: UNDER_OPACITY });
    expect(await pressBack()).toBe(true);
    expect(screen.queryByTestId('ranked-surrender')).toBeNull();

    // GO! fading into the board: still nothing.
    for (let k = 0; k <= SWAP_FRAMES; k += 1) await wait(FRAME_MS);
    await wait(fadeMs / 2);
    expect(screen.getByTestId('go-cover-game')).not.toHaveAnimatedStyle({ opacity: 1 });
    expect(await pressBack()).toBe(true);
    expect(screen.queryByTestId('ranked-surrender')).toBeNull();
    expect(onLeave).not.toHaveBeenCalled();
    expect(onHome).not.toHaveBeenCalled();

    // GO! gone into the board: back asks first, as it always did (spec §6.6).
    await wait(fadeMs);
    expect(screen.getByTestId('go-cover-game')).toHaveAnimatedStyle({ opacity: 1 });
    await pressBack();
    expect(screen.getByTestId('ranked-surrender')).toBeOnTheScreen();
  });
});
