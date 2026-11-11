import { act, render, screen, within } from '@testing-library/react-native';
import { useEffect } from 'react';
import { BackHandler, Platform, Text, View } from 'react-native';
import { getAnimatedStyle } from 'react-native-reanimated';

import { RETIRE_MS, SWAP_FRAMES } from '../../../components/ui/retire';
import type { OnlineInfo } from '../../../net/remoteGameHost';
import { motion } from '../../../theme/motion';
import { ANDROID_FADE_MS } from '../../../theme/transitions';
import { FriendsCountdown } from '../../friends/FriendsCountdown';
import type { FriendsLobby } from '../../friends/friendsModel';
import { slamAt } from '../../game/connection/motion';
import { hidden, type Setup, setUp, wait } from '../../game/connection/testing/setup';
import {
  gameOnItsWay,
  GoCover,
  goFadeFrom,
  goFadeOf,
  handedGoCover,
  handGoCover,
  UNDER_OPACITY,
} from '../GoCover';
import type { FriendsGo } from '../goHandoff';
import { headerOf, type MatchScreenModel } from '../matchModel';

/**
 * GO! from the match screen to the game screen (QA loop 3, 2a: ~250 ms with nothing on screen between GO! and the
 * board): the game screen opens on GO! as it was, the game is drawn under it, then GO! fades out as the game
 * fades in. Never a frame without one of them.
 */

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
// The friends room's GO! draws its header (screens/home/parts), whose buttons load the sounds.
jest.mock(
  'expo-audio',
  () =>
    jest.requireActual<typeof import('../../home/testing/nativeMocks')>('../../home/testing/nativeMocks')
      .expoAudio,
);

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
let mounts = 0;

/** The game: counts its mounts (it must mount once, never again as GO! goes). */
function Game() {
  useEffect(() => {
    mounts += 1;
  }, []);
  return <Text testID="game-probe">board</Text>;
}

afterEach(() => {
  env.restore();
  handGoCover(null);
  mounts = 0;
});

describe.each(['off', 'on'] as const)('reduced motion %s', (reduceMotion) => {
  const fadeMs = reduceMotion === 'on' ? motion.duration.reducedFade : motion.duration.stateChange;

  it('opens on GO! as it was drawn, the game a frame later under it, then GO! fades out as the game fades in', async () => {
    env = await setUp('he', reduceMotion);
    const backs = jest.spyOn(BackHandler, 'addEventListener');
    await render(
      <GoCover model={GO}>
        <Game />
      </GoCover>,
    );
    // The first frame: GO! alone, at rest (no entrance, no slam: it stands for the one already on screen).
    const cover = screen.getByTestId('go-cover', hidden);
    expect(screen.getByTestId('go-cover-count-step-text', hidden)).toHaveTextContent('GO!');
    expect(screen.getByTestId('go-cover-count-step-text', hidden)).toHaveAnimatedStyle({
      opacity: 1,
      transform: [{ scale: 1 }],
    });
    expect(cover).toHaveAnimatedStyle({ opacity: 1 });
    expect(screen.queryByTestId('game-probe')).toBeNull();
    // Untouchable, and screen readers skip it (the count already said GO), nothing said again.
    expect(cover.props.pointerEvents).toBe('none');
    expect(screen.queryByTestId('go-cover')).toBeNull();
    expect(env.announced()).toEqual([]);
    // Android's back does nothing in that frame (the game's own handler is not there yet).
    const [, onBack] = backs.mock.calls.at(-1)!;
    expect((onBack as () => boolean)()).toBe(true);

    // A frame later the game mounts under GO!: drawn, not seen yet.
    await wait(FRAME_MS);
    expect(screen.getByTestId('game-probe')).toBeOnTheScreen();
    expect(screen.getByTestId('go-cover-game')).toHaveAnimatedStyle({ opacity: UNDER_OPACITY });
    expect(screen.getByTestId('go-cover', hidden)).toHaveAnimatedStyle({ opacity: 1 });

    // Its frames come again (it is drawn): the cross-fade, as long as the platform's screen fade.
    for (let k = 0; k <= SWAP_FRAMES; k += 1) await wait(FRAME_MS);
    expect(screen.getByTestId('go-cover-game')).not.toHaveAnimatedStyle({ opacity: UNDER_OPACITY });
    for (let t = 0; t <= fadeMs; t += FRAME_MS) await wait(FRAME_MS);
    expect(screen.getByTestId('go-cover-game')).toHaveAnimatedStyle({ opacity: 1 });
    expect(screen.getByTestId('go-cover', hidden)).toHaveAnimatedStyle({ opacity: 0 });

    // Gone once Reanimated let go of it (retire.ts); the game stayed the same all along.
    await wait(RETIRE_MS);
    expect(screen.queryByTestId('go-cover', hidden)).toBeNull();
    expect(screen.getByTestId('game-probe')).toBeOnTheScreen();
    expect(mounts).toBe(1);
    backs.mockRestore();
  });

  it('a slow first draw keeps GO! on screen: no fade until the frames come', async () => {
    env = await setUp('he', reduceMotion);
    const raf = jest.spyOn(globalThis, 'requestAnimationFrame');
    await render(
      <GoCover model={GO}>
        <Game />
      </GoCover>,
    );
    await wait(FRAME_MS);
    expect(screen.getByTestId('game-probe')).toBeOnTheScreen();
    // The UI thread busy with the game's first draw: no frame comes.
    raf.mockImplementation(() => 0);
    await wait(500);
    expect(screen.getByTestId('go-cover', hidden)).toHaveAnimatedStyle({ opacity: 1 });
    raf.mockRestore();
  });
});

/** A friends room's lobby at GO!: me (the host) and Dana. */
const LOBBY: FriendsLobby = {
  code: '123456',
  gameType: 'fast',
  players: [
    { id: 'me', name: 'Moshe', avatarId: 'av00', country: 'IL', rating: 1287 },
    { id: 'dana', name: 'Dana', avatarId: 'av00', country: 'US', rating: 1190 },
  ],
  hostId: 'me',
  minPlayers: 2,
  maxPlayers: 4,
};

/** A GO!'s opacity and scale as drawn now. */
function pose(el: Parameters<typeof getAnimatedStyle>[0]): { opacity: number; scale: number } {
  const style = getAnimatedStyle(el) as { opacity?: number; transform?: { scale?: number }[] };
  return { opacity: style.opacity ?? 1, scale: style.transform?.[0]?.scale ?? 1 };
}

/** The friends room's GO!, first shown `agoMs` before the game screen opened on it. */
const friendsGo = (agoMs: number): FriendsGo => ({
  kind: 'friendsGo',
  lobby: LOBBY,
  myId: 'me',
  shownAt: Date.now() - agoMs,
});

/**
 * QA go-hold-joiner (loop 13): the friends room held GO! 250 ms before the game screen even began its ~0.6 s
 * mount. The room now opens the game the moment it came, its slam still under way, on its own GO! picture.
 */
describe.each(['off', 'on'] as const)('a friends room GO!, reduced motion %s', (reduceMotion) => {
  const reduce = reduceMotion === 'on';
  const fadeMs = reduce ? motion.duration.reducedFade : motion.duration.stateChange;
  const { goAt, boardRevealAt } = motion.sequence.matchFound;
  /** When GO! may start to fade, from its first frame on the room: seen GO + 400 ms with the fade. */
  const fadeFromMs = boardRevealAt - goAt - fadeMs;

  it('opens on the room GO! picture, its slam going on (not again), the game mounting under it', async () => {
    env = await setUp('he', reduceMotion);
    await render(
      <GoCover model={friendsGo(80)}>
        <Game />
      </GoCover>,
    );
    // The room's picture: its header, the players, GO! and its line; nothing said again.
    expect(screen.getByTestId('friends-go-frame', hidden)).toBeOnTheScreen();
    expect(screen.getByTestId('friends-countdown-step', hidden)).toHaveTextContent('GO!');
    expect(screen.getByText('מכינים את הלוח…', hidden)).toBeOnTheScreen();
    expect(screen.getByTestId('friends-countdown-me', hidden)).toBeOnTheScreen();
    expect(screen.getByTestId('friends-countdown-dana', hidden)).toBeOnTheScreen();
    expect(env.announced()).toEqual([]);
    // From its first frame, GO! 80 ms (and that frame) into its slam, where the room's is: neither from nothing at
    // 1.4 nor landed at once.
    await wait(FRAME_MS);
    const at = slamAt(reduce, 80 + FRAME_MS);
    expect(at.opacity).toBeGreaterThan(0);
    expect(at.opacity).toBeLessThan(1);
    if (!reduce) expect(at.scale).toBeLessThan(1.4);
    const go = pose(screen.getByTestId('friends-countdown-step', hidden));
    expect(go.opacity).toBeCloseTo(at.opacity, 3);
    expect(go.scale).toBeCloseTo(at.scale, 3);
    // The game a frame later, under it.
    expect(screen.getByTestId('game-probe')).toBeOnTheScreen();
    expect(screen.getByTestId('go-cover-game')).toHaveAnimatedStyle({ opacity: UNDER_OPACITY });
  });

  it('its first frame late (the game screen mounting): GO! is where the room GO! is, one GO!, no new slam', async () => {
    // QA go-cover-slam-jump (loop 15): the cover's GO! took its point in the slam as the game screen rendered, but
    // its first frame came 120–140 ms later; it then started a spring from that older point, so for 3–5 frames a
    // GO! at ~1.1–1.2 lay over the room's (still under the game screen in the cut) and slammed down again.
    env = await setUp('he', reduceMotion);
    const shownAt = Date.now();
    const room = (cover: boolean) => (
      <>
        <View testID="room">
          <FriendsCountdown lobby={LOBBY} myId="me" step="go" goShownAt={shownAt} />
        </View>
        {cover ? (
          <GoCover model={{ ...friendsGo(0), shownAt }}>
            <Game />
          </GoCover>
        ) : null}
      </>
    );
    const view = await render(room(false));
    // The room's GO!, 64 ms into its slam; then the game came and the game screen rendered on it.
    for (let k = 0; k < 4; k += 1) await wait(FRAME_MS);
    await view.rerender(room(true));
    // Its first frame only 120 ms later (the phone's clock moved on, no frame meanwhile).
    jest.setSystemTime(Date.now() + 120);
    // Drawn before its clock's first frame (the view mounted, its slam not run yet): not the pose of 120 ms ago
    // (the old cut, one frame) but nothing, the room's GO! under it the one seen.
    const roomNow = pose(within(screen.getByTestId('room')).getByTestId('friends-countdown-step'));
    expect(roomNow.opacity).toBeGreaterThan(0);
    expect(
      pose(within(screen.getByTestId('go-cover', hidden)).getByTestId('friends-countdown-step', hidden))
        .opacity,
    ).toBe(0);
    for (let k = 0; k < 3; k += 1) {
      await wait(FRAME_MS);
      const at = slamAt(reduce, Date.now() - shownAt);
      const roomGo = pose(within(screen.getByTestId('room')).getByTestId('friends-countdown-step'));
      const coverGo = pose(
        within(screen.getByTestId('go-cover', hidden)).getByTestId('friends-countdown-step', hidden),
      );
      // Both where the slam is now (not where it was as the cover rendered): one picture, one GO!.
      expect(coverGo.opacity).toBeCloseTo(at.opacity, 3);
      expect(coverGo.scale).toBeCloseTo(at.scale, 3);
      expect(roomGo).toEqual(coverGo);
      // Reduced motion: never a scale.
      if (reduce) expect(coverGo.scale).toBe(1);
    }
    // Landed, and its frames stop: GO! at rest.
    await wait(1000);
    expect(
      pose(within(screen.getByTestId('go-cover', hidden)).getByTestId('friends-countdown-step', hidden)),
    ).toEqual({ opacity: 1, scale: 1 });
  });

  it('a game drawn sooner waits: GO! fades into it once seen GO + 400 ms with the fade', async () => {
    env = await setUp('he', reduceMotion);
    await render(
      <GoCover model={friendsGo(0)}>
        <Game />
      </GoCover>,
    );
    await wait(FRAME_MS);
    for (let k = 0; k <= SWAP_FRAMES; k += 1) await wait(FRAME_MS);
    // The game is drawn, GO! not seen long enough yet: no fade.
    expect(screen.getByTestId('go-cover-game')).toHaveAnimatedStyle({ opacity: UNDER_OPACITY });
    expect(screen.getByTestId('go-cover', hidden)).toHaveAnimatedStyle({ opacity: 1 });
    await wait(fadeFromMs - (SWAP_FRAMES + 3) * FRAME_MS);
    expect(screen.getByTestId('go-cover', hidden)).toHaveAnimatedStyle({ opacity: 1 });
    // From then on the fade, as a ranked GO!'s.
    await wait(2 * FRAME_MS);
    for (let t = 0; t <= fadeMs; t += FRAME_MS) await wait(FRAME_MS);
    expect(screen.getByTestId('go-cover-game')).toHaveAnimatedStyle({ opacity: 1 });
    expect(screen.getByTestId('go-cover', hidden)).toHaveAnimatedStyle({ opacity: 0 });
    expect(mounts).toBe(1);
  });

  it('a GO! seen long enough already fades as soon as the game is drawn', async () => {
    env = await setUp('he', reduceMotion);
    await render(
      <GoCover model={friendsGo(1000)}>
        <Game />
      </GoCover>,
    );
    expect(screen.getByTestId('friends-countdown-step', hidden)).toHaveAnimatedStyle({
      opacity: 1,
      transform: [{ scale: 1 }],
    });
    await wait(FRAME_MS);
    for (let k = 0; k <= SWAP_FRAMES; k += 1) await wait(FRAME_MS);
    expect(screen.getByTestId('go-cover-game')).not.toHaveAnimatedStyle({ opacity: UNDER_OPACITY });
  });

  it('handed over as GO! shows, the game still on its way (QA go-hold-joiner, loop 16): GO! alone however long, then the game mounts under it in the render it comes, and GO! fades into it as before', async () => {
    // The room opens the game screen at GO!, not once the game came (17–189 ms after GO! on the phones): the push,
    // the route and this cover's first draw are paid meanwhile, and the game's mount starts the moment it comes.
    env = await setUp('he', reduceMotion);
    const backs = jest.spyOn(BackHandler, 'addEventListener');
    const model = friendsGo(0);
    const view = await render(
      <GoCover model={model} waiting>
        <Game />
      </GoCover>,
    );
    // Frames go by: GO! (the room's picture) alone, nothing mounted under it (not the room's online lobby, not the
    // game), and Android's back does nothing.
    for (let k = 0; k < 10; k += 1) await wait(FRAME_MS);
    expect(screen.getByTestId('friends-go-frame', hidden)).toBeOnTheScreen();
    expect(screen.getByTestId('go-cover', hidden)).toHaveAnimatedStyle({ opacity: 1 });
    expect(screen.queryByTestId('game-probe')).toBeNull();
    expect(mounts).toBe(0);
    // All there is on screen meanwhile: screen readers may reach it (not an empty screen to TalkBack).
    expect(screen.getByTestId('go-cover')).toHaveProp('accessibilityElementsHidden', false);
    expect(screen.getByTestId('go-cover')).toHaveProp('importantForAccessibility', 'auto');
    const [, onBack] = backs.mock.calls.filter(([event]) => event === 'hardwareBackPress').at(-1)!;
    expect((onBack as () => boolean)()).toBe(true);

    // The game comes: mounted under GO! in that very render, no frame waited for (the cover was drawn long ago).
    await view.rerender(
      <GoCover model={model} waiting={false}>
        <Game />
      </GoCover>,
    );
    expect(screen.getByTestId('game-probe')).toBeOnTheScreen();
    expect(screen.getByTestId('go-cover-game')).toHaveAnimatedStyle({ opacity: UNDER_OPACITY });
    expect(screen.getByTestId('go-cover', hidden)).toHaveAnimatedStyle({ opacity: 1 });
    // The game under it now: GO! is skipped by screen readers again, as every cover over a game.
    expect(screen.getByTestId('go-cover', hidden)).toHaveProp('accessibilityElementsHidden', true);
    expect(screen.getByTestId('go-cover', hidden)).toHaveProp(
      'importantForAccessibility',
      'no-hide-descendants',
    );
    // Then as before: GO! fades into the game once it is drawn and GO! has been seen GO + 400 ms with the fade.
    const untilFaded = Math.max(fadeFromMs, (SWAP_FRAMES + 1) * FRAME_MS) + fadeMs + 3 * FRAME_MS;
    for (let t = 0; t <= untilFaded; t += FRAME_MS) await wait(FRAME_MS);
    expect(screen.getByTestId('go-cover-game')).toHaveAnimatedStyle({ opacity: 1 });
    expect(screen.getByTestId('go-cover', hidden)).toHaveAnimatedStyle({ opacity: 0 });
    expect(mounts).toBe(1);
    backs.mockRestore();
  });

  it('on Android: GO! fades into the game over the stack fade the room used (150 ms), not 240, from GO + 250 ms', async () => {
    const os = jest.replaceProperty(Platform, 'OS', 'android');
    env = await setUp('he', reduceMotion);
    expect(goFadeOf(friendsGo(0), reduce).duration).toBe(ANDROID_FADE_MS);
    // The ranked GO! keeps its own fade.
    expect(goFadeOf(GO, reduce).duration).toBe(fadeMs);
    await render(
      <GoCover model={friendsGo(1000)}>
        <Game />
      </GoCover>,
    );
    await wait(FRAME_MS);
    for (let k = 0; k <= SWAP_FRAMES; k += 1) await wait(FRAME_MS);
    expect(screen.getByTestId('go-cover-game')).not.toHaveAnimatedStyle({ opacity: UNDER_OPACITY });
    // The whole cross-fade within the 150 ms (and a frame), where 240 would still be under way.
    await wait(ANDROID_FADE_MS + FRAME_MS);
    expect(screen.getByTestId('go-cover-game')).toHaveAnimatedStyle({ opacity: 1 });
    expect(screen.getByTestId('go-cover', hidden)).toHaveAnimatedStyle({ opacity: 0 });
    // Seen GO + 400 ms: the fade may start 250 ms after GO! was first drawn.
    const shownAt = 5000;
    expect(goFadeFrom({ ...friendsGo(0), shownAt }, reduce)).toBe(
      shownAt + boardRevealAt - goAt - ANDROID_FADE_MS,
    );
    os.restore();
  });
});

describe('slamAt: a slam some way into its run', () => {
  it('starts from nothing at slamFrom, dips to about 0.94 (motion.md slam) and lands at 1', () => {
    expect(slamAt(false, 0)).toMatchObject({ opacity: 0, scale: 1.4, landed: false });
    expect(slamAt(false, 0).velocity).toBeCloseTo(0);
    const dip = Math.min(...Array.from({ length: 60 }, (_, k) => slamAt(false, k * 10).scale));
    expect(dip).toBeGreaterThan(0.92);
    expect(dip).toBeLessThan(0.96);
    expect(slamAt(false, motion.duration.stateChange).opacity).toBe(1);
    expect(slamAt(false, Infinity)).toMatchObject({ opacity: 1, scale: 1, landed: true });
    // Going down at first (towards 1), then back up after the dip.
    expect(slamAt(false, 50).velocity).toBeLessThan(0);
    expect(slamAt(false, 300).velocity).toBeGreaterThan(0);
  });

  it('reduced motion: the fade only, never a scale', () => {
    expect(slamAt(true, 0)).toMatchObject({ opacity: 0, scale: 1, landed: true });
    expect(slamAt(true, motion.duration.reducedFade / 2).scale).toBe(1);
    expect(slamAt(true, motion.duration.reducedFade).opacity).toBe(1);
  });
});

it('nothing handed over (a practice, a room by code): the game as it is, no cover', async () => {
  env = await setUp();
  await render(
    <GoCover model={null}>
      <Game />
    </GoCover>,
  );
  expect(screen.getByTestId('game-probe')).toBeOnTheScreen();
  expect(screen.queryByTestId('go-cover', hidden)).toBeNull();
  expect(screen.queryByTestId('go-cover-game')).toBeNull();
});

it('hands GO! over once', async () => {
  env = await setUp();
  handGoCover(GO);
  expect(handedGoCover()).toBe(GO);
  await act(async () => handGoCover(null));
  expect(handedGoCover()).toBeNull();
});

it('the game on its way: a friends GO! with the room counting still (not a ranked GO!, not once the game is here, the connection lost or the room closed)', () => {
  env = { restore: () => undefined } as Setup;
  const info = (over: Partial<OnlineInfo>) =>
    ({ status: 'lobby', hasGame: false, startsAt: 5000, ...over }) as OnlineInfo;
  const friends = friendsGo(0);
  expect(gameOnItsWay(friends, info({}))).toBe(true);
  // The connection lost on the way: not GO! alone with no way out, but the game route's reconnecting under it
  // (its attempts, its ways out), as the room's lobby showed it before.
  expect(gameOnItsWay(friends, info({ status: 'reconnecting' }))).toBe(false);
  // Its first state on the way (the room live, no snapshot yet): GO! holds on.
  expect(gameOnItsWay(friends, info({ status: 'live' }))).toBe(true);
  expect(gameOnItsWay(friends, info({ status: 'live', hasGame: true }))).toBe(false);
  // The room closed on the way: the game route's own error, with its ways out.
  expect(gameOnItsWay(friends, info({ status: 'closed' }))).toBe(false);
  expect(gameOnItsWay(GO, info({}))).toBe(false);
  expect(gameOnItsWay(null, info({}))).toBe(false);
  expect(gameOnItsWay(friends, null)).toBe(false);
});
