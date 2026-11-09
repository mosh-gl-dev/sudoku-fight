import { ManualClock, type PlayerView } from '@sudoku-fight/engine';
import { AVATAR_IDS } from '@sudoku-fight/protocol';
import { act, cleanup, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { getAnimatedStyle, makeMutable, type SharedValue } from 'react-native-reanimated';

import i18n from '../../../../i18n';
import { useSettings } from '../../../../state/settings';
import {
  HIT_BANNER_FACE_GAP_MS,
  HIT_BANNER_STANDBY_DELAY_MS,
  HIT_STANDBY_DELAY_MS,
  HitLayer,
} from '../HitLayer';
import { type HitInfo, hitOf, type HitSender, hitSendersOf, isolateName, senderKeyOf } from '../hitModel';
import { HIT_REHEARSAL_DELAY_MS, HitRehearsal } from '../HitRehearsal';
import { HIT_WARM_DELAY_MS } from '../warmHitCues';

/**
 * QA measure of APK 20 (warp-first-hit-freeze, 6 traced runs, sound on and off): the hit's commit made ~140 native
 * views every time, the same in every run: one whole avatar drawing (94 paths, 21 circles, its clip and defs: the
 * sender's face in the banner), the ring's SVG and its text field (an EditText, 8–18 ms to create alone), the
 * banner's texts and views. Then a 165–200 ms JS render, a mount over 3–5 frames (preMountItems 14–30 ms each) and a
 * 21–33 ms first draw, on the frames of the hit's fade-in. The banner is now kept mounted between hits, unseen, with
 * every possible sender's avatar: a hit changes its props and which avatar shows, and makes none of it.
 *
 * QA review, loop 15: made bare first (ring, text field, texts), then one sender's avatar per idle moment, never all
 * of a 4-player game's in one commit; never changed under a hit; and hidden by its slot in the very commit a hit ends.
 */

// Skia draws natively; under Jest a canvas is a plain view.
jest.mock(
  '@shopify/react-native-skia',
  () => jest.requireActual('../../../../components/interference/testing/skiaMock').skiaModule,
);
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../../../../services/feedback', () => ({ cue: jest.fn() }));

/** What was made (a mount is new native views on a phone) and rendered, counted. */
interface Made {
  bannerMounts: number;
  bannerRenders: number;
  avatarMounts: Record<string, number>;
}
const made = (): Made =>
  ((globalThis as { mockMade?: Made }).mockMade ??= {
    bannerMounts: 0,
    bannerRenders: 0,
    avatarMounts: {},
  });

jest.mock('../HitBanner', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const actual = jest.requireActual<typeof import('../HitBanner')>('../HitBanner');
  const count = () =>
    ((globalThis as { mockMade?: Made }).mockMade ??= {
      bannerMounts: 0,
      bannerRenders: 0,
      avatarMounts: {},
    });
  function HitBanner(props: import('../HitBanner').HitBannerProps) {
    count().bannerRenders += 1;
    React.useEffect(() => {
      count().bannerMounts += 1;
    }, []);
    return React.createElement(actual.HitBanner, props);
  }
  return { ...actual, HitBanner };
});

jest.mock('../../../../components/player', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const actual = jest.requireActual<typeof import('../../../../components/player')>(
    '../../../../components/player',
  );
  function Avatar(props: import('../../../../components/player').AvatarProps) {
    const id = String(props.avatarId ?? 'none');
    React.useEffect(() => {
      const mounts = ((globalThis as { mockMade?: Made }).mockMade ??= {
        bannerMounts: 0,
        bannerRenders: 0,
        avatarMounts: {},
      }).avatarMounts;
      mounts[id] = (mounts[id] ?? 0) + 1;
    }, [id]);
    return React.createElement(actual.Avatar, props);
  }
  return { ...actual, Avatar };
});

const hidden = { includeHiddenElements: true };
const START = 10_000;
const [NINA, OMER, LIOR] = [AVATAR_IDS[3]!, AVATAR_IDS[7]!, AVATAR_IDS[11]!];
const SENDERS: HitSender[] = [
  { avatarId: NINA, colorIndex: 1 },
  { avatarId: OMER, colorIndex: 2 },
];

const hitFrom = (sender: HitSender, over: Partial<HitInfo> = {}): HitInfo => ({
  kind: 'warp',
  fromId: `p${sender.colorIndex}`,
  fromName: 'NinaVolt',
  fromAvatar: sender.avatarId,
  fromColorIndex: sender.colorIndex,
  endsAt: START + 5000,
  totalMs: 5000,
  gameId: 'g-1',
  id: 1,
  ...over,
});

const layer = (
  hit: HitInfo | null,
  now: number,
  clock: ManualClock,
  senders: readonly HitSender[] | null = SENDERS,
  elapsed?: SharedValue<number>,
) => (
  <HitLayer
    hit={hit}
    now={now}
    clock={clock}
    topInset={0}
    feedback={false}
    announce={false}
    standby="warp"
    senders={senders}
    elapsed={elapsed}
  />
);

/** Time passes (React Native's requestIdleCallback is a timer under Jest). */
const advance = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};
/** The banner standby's delay, then an idle moment: the bare banner. */
const bare = () => advance(HIT_BANNER_STANDBY_DELAY_MS + 1100);
/** One more sender's avatar: its gap, then an idle moment. */
const nextFace = () => advance(HIT_BANNER_FACE_GAP_MS + 1100);
/** The bare banner, then every sender's avatar (SENDERS has two). */
const settle = async (faces = SENDERS.length) => {
  await bare();
  for (let i = 0; i < faces; i += 1) await nextFace();
};
/** What is seen of an element: its opacity times every ancestor's (static styles; and the animated one's own). */
const seenOpacity = (id: string): number => {
  let node: ReturnType<typeof screen.getByTestId> | null = screen.getByTestId(id, hidden);
  let seen = Number(getAnimatedStyle(node).opacity ?? 1);
  for (node = node.parent; node; node = node.parent) {
    if (typeof node.type === 'string') seen *= Number(StyleSheet.flatten(node.props.style)?.opacity ?? 1);
  }
  return seen;
};
const opacityOf = (id: string) => StyleSheet.flatten(screen.getByTestId(id, hidden).props.style).opacity;
/** The avatars kept ready, unseen (the standby's, or the hit's but its sender's). */
const readyAvatars = () => screen.queryAllByTestId(/^hit-layer-banner(-standby)?-ready-avatar$/, hidden);

// Reanimated's mock sets up its frame callbacks' registry on a (real) timer of its own: let it run first.
beforeAll(async () => {
  await new Promise((resolve) => setTimeout(resolve, 20));
});

beforeEach(async () => {
  (globalThis as { mockMade?: Made }).mockMade = { bannerMounts: 0, bannerRenders: 0, avatarMounts: {} };
  useSettings.setState({ reduceMotion: 'off' });
  await i18n.changeLanguage('he');
  jest.useFakeTimers();
});

afterEach(async () => {
  await act(async () => {
    cleanup();
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
});

describe('the hit banner is made before the hit, not by it (QA measure of APK 20)', () => {
  it('is made after GO! and the warp canvas, on an idle moment of its own, before the rehearsal', () => {
    expect(HIT_BANNER_STANDBY_DELAY_MS).toBeGreaterThan(HIT_WARM_DELAY_MS);
    expect(HIT_BANNER_STANDBY_DELAY_MS).toBeGreaterThan(HIT_STANDBY_DELAY_MS);
    expect(HIT_BANNER_STANDBY_DELAY_MS).toBeLessThan(HIT_REHEARSAL_DELAY_MS);
  });

  it('stays mounted between hits, unseen, with every sender; the hit makes no banner and no avatar', async () => {
    const clock = new ManualClock(START - 5000);
    const { rerender } = await render(layer(null, clock.now(), clock));
    // The countdown and GO!: nothing yet.
    expect(screen.queryByTestId('hit-layer-banner-standby', hidden)).toBeNull();
    await advance(HIT_BANNER_STANDBY_DELAY_MS - 1);
    expect(screen.queryByTestId('hit-layer-banner-standby', hidden)).toBeNull();
    expect(made().bannerMounts).toBe(0);

    // Settled: the bare banner first (the ring, its number, the texts), with no avatar in the same commit.
    await bare();
    expect(screen.getByTestId('hit-layer-banner-standby-ring-seconds', hidden)).toBeOnTheScreen();
    expect(readyAvatars()).toHaveLength(0);
    expect(made()).toMatchObject({ bannerMounts: 1, avatarMounts: {} });
    // Then one sender's avatar per idle moment, never both in one commit.
    await advance(HIT_BANNER_FACE_GAP_MS - 1);
    expect(readyAvatars()).toHaveLength(0);
    await nextFace();
    expect(made().avatarMounts).toEqual({ [NINA]: 1 });
    await nextFace();
    expect(made().avatarMounts).toEqual({ [NINA]: 1, [OMER]: 1 });
    // The banner with both senders' avatars, the ring and its number, unseen and not for screen readers.
    const standby = screen.getByTestId('hit-layer-banner-standby', hidden);
    expect(getAnimatedStyle(standby).opacity).toBe(0);
    expect(standby).toHaveProp('accessible', false);
    expect(standby).toHaveProp('importantForAccessibility', 'no-hide-descendants');
    expect(standby).not.toHaveProp('accessibilityRole', 'alert');
    expect(screen.queryByTestId('hit-layer-banner-standby')).toBeNull();
    expect(screen.getByTestId('hit-layer-banner-standby-ring-seconds', hidden)).toBeOnTheScreen();
    expect(readyAvatars()).toHaveLength(2);
    expect(screen.queryByTestId('hit-layer-banner-avatar', hidden)).toBeNull();
    expect(made()).toMatchObject({ bannerMounts: 1, avatarMounts: { [NINA]: 1, [OMER]: 1 } });

    // The screen's ticks (and a new, equal senders list) do not render it again.
    const renders = made().bannerRenders;
    clock.set(START - 1000);
    await rerender(
      layer(
        null,
        clock.now(),
        clock,
        SENDERS.map((s) => ({ ...s })),
      ),
    );
    expect(made().bannerRenders).toBe(renders);

    // Omer's warp: the same banner and avatars, now with what the hit says, and Omer's avatar seen.
    clock.set(START + 100);
    await rerender(layer(hitFrom(SENDERS[1]!), clock.now(), clock));
    const banner = screen.getByTestId('hit-layer-banner', hidden);
    expect(banner).toHaveProp('accessibilityRole', 'alert');
    expect(banner).toHaveProp('accessible', true);
    expect(screen.getByTestId('hit-layer-banner-title')).toHaveTextContent(
      `${isolateName('NinaVolt')} שלח/ה לך עיוות!`,
    );
    expect(opacityOf('hit-layer-banner-avatar')).not.toBe(0);
    expect(readyAvatars()).toHaveLength(1);
    expect(opacityOf('hit-layer-banner-ready-avatar')).toBe(0);
    expect(made()).toMatchObject({ bannerMounts: 1, avatarMounts: { [NINA]: 1, [OMER]: 1 } });

    // It ends: unseen again, still mounted, nothing made or unmade.
    clock.set(START + 5000);
    await rerender(layer(hitFrom(SENDERS[1]!), clock.now(), clock));
    expect(screen.queryByTestId('hit-layer-banner', hidden)).toBeNull();
    expect(screen.getByTestId('hit-layer-banner-standby', hidden)).toBeOnTheScreen();
    expect(readyAvatars()).toHaveLength(2);
    expect(made()).toMatchObject({ bannerMounts: 1, avatarMounts: { [NINA]: 1, [OMER]: 1 } });
  });

  it('a sender the list does not have gets an avatar at the hit, and the others stay unseen', async () => {
    const clock = new ManualClock(START - 5000);
    const { rerender } = await render(layer(null, clock.now(), clock));
    await settle();
    clock.set(START + 100);
    const lior = { avatarId: LIOR, colorIndex: 3 };
    await rerender(layer(hitFrom(lior), clock.now(), clock));
    expect(opacityOf('hit-layer-banner-avatar')).not.toBe(0);
    expect(readyAvatars().map((a) => StyleSheet.flatten(a.props.style).opacity)).toEqual([0, 0]);
    expect(made()).toMatchObject({ bannerMounts: 1, avatarMounts: { [NINA]: 1, [OMER]: 1, [LIOR]: 1 } });
  });

  it('a hit before the standby makes its banner at the hit; the standby waits until it is over', async () => {
    const clock = new ManualClock(START);
    const { rerender } = await render(layer(hitFrom(SENDERS[0]!), clock.now(), clock));
    expect(made()).toMatchObject({ bannerMounts: 1, avatarMounts: { [NINA]: 1 } });
    // Its time passes during the hit: nothing more is made under it.
    await settle();
    clock.set(START + 3500);
    await rerender(layer(hitFrom(SENDERS[0]!), clock.now(), clock));
    expect(readyAvatars()).toHaveLength(0);
    expect(made().avatarMounts[OMER]).toBeUndefined();
    // After it, once settled: the standby, with both.
    clock.set(START + 5000);
    await rerender(layer(hitFrom(SENDERS[0]!), clock.now(), clock));
    expect(screen.queryByTestId('hit-layer-banner', hidden)).toBeNull();
    await settle();
    expect(screen.getByTestId('hit-layer-banner-standby', hidden)).toBeOnTheScreen();
    expect(readyAvatars()).toHaveLength(2);
  });

  it('a senders list that changes under a hit is taken up after it, one avatar at a time', async () => {
    const clock = new ManualClock(START - 5000);
    const { rerender } = await render(layer(null, clock.now(), clock, SENDERS.slice(0, 1)));
    await settle(1);
    expect(made().avatarMounts).toEqual({ [NINA]: 1 });
    // Nina's warp; meanwhile Omer's profile arrives (ranked: the profiles may come after the screen).
    clock.set(START + 100);
    await rerender(layer(hitFrom(SENDERS[0]!), clock.now(), clock, SENDERS));
    await advance(3 * (HIT_BANNER_FACE_GAP_MS + 1100));
    clock.set(START + 3000);
    await rerender(layer(hitFrom(SENDERS[0]!), clock.now(), clock, SENDERS));
    expect(made().avatarMounts).toEqual({ [NINA]: 1 });
    expect(readyAvatars()).toHaveLength(0);
    // Over: Omer's avatar comes on an idle moment of its own, not in the hit's last commit.
    clock.set(START + 5000);
    await rerender(layer(hitFrom(SENDERS[0]!), clock.now(), clock, SENDERS));
    expect(made().avatarMounts[OMER]).toBeUndefined();
    await nextFace();
    expect(made().avatarMounts).toEqual({ [NINA]: 1, [OMER]: 1 });
    expect(readyAvatars()).toHaveLength(2);
    // A player who left is dropped between hits.
    await rerender(layer(null, clock.now(), clock, SENDERS.slice(1)));
    await advance(1);
    expect(readyAvatars()).toHaveLength(1);
    expect(made().bannerMounts).toBe(1);
  });

  it('a hit that ends early leaves no empty banner, even while its clock still stands mid-hit', async () => {
    const clock = new ManualClock(START - 5000);
    const elapsed = makeMutable(0);
    const { rerender } = await render(layer(null, clock.now(), clock, SENDERS, elapsed));
    await settle();
    clock.set(START + 2500);
    elapsed.value = 2500;
    await rerender(layer(hitFrom(SENDERS[1]!), clock.now(), clock, SENDERS, elapsed));
    expect(seenOpacity('hit-layer-banner')).toBe(1);
    // The server clears it (or the app comes back past its end): the screen's clock has not been reset yet.
    await rerender(layer(null, clock.now(), clock, SENDERS, elapsed));
    expect(elapsed.value).toBe(2500);
    expect(screen.queryByTestId('hit-layer-banner', hidden)).toBeNull();
    expect(seenOpacity('hit-layer-banner-standby')).toBe(0);
  });

  it('without senders (a practice, D44) no banner is kept between hits', async () => {
    const clock = new ManualClock(START - 5000);
    await render(
      <HitLayer hit={null} now={clock.now()} clock={clock} topInset={0} feedback={false} senders={null} />,
    );
    await settle();
    expect(screen.queryByTestId('hit-layer-standby', hidden)).toBeNull();
    expect(made().bannerMounts).toBe(0);
  });
});

describe('the rehearsal leaves the banner to the standby (QA review, loop 15)', () => {
  it('mounts no banner of its own when the layer keeps one', async () => {
    const rules = { interferences: true, interferenceKinds: ['warp' as const] };
    await render(<HitRehearsal rules={rules} hitOn={false} banner={false} />);
    for (let t = 0; t < HIT_REHEARSAL_DELAY_MS + 3000; t += 100) {
      await advance(100);
      expect(screen.queryByTestId('hit-rehearsal-banner', hidden)).toBeNull();
    }
    expect(made().bannerMounts).toBe(0);
  });
});

describe('hitSendersOf: the players who may hit me, as a hit shows its sender', () => {
  const player = (id: string, seat: number): PlayerView => ({ id, seat }) as unknown as PlayerView;
  const avatars: Record<string, string> = { a: NINA, b: OMER, c: LIOR };

  it('is the others, each with the avatar and seat colour hitOf gives their hits', () => {
    const players = [player('a', 2), player('me', 0), player('b', 3), player('c', 1)];
    const view = { me: 'me', players, rules: { interferenceMs: 5000 } };
    const senders = hitSendersOf(view as never, { avatarOf: (id) => avatars[id] as never });
    expect(senders.map((s) => s.avatarId)).toEqual([NINA, OMER, LIOR]);
    for (const from of ['a', 'b', 'c']) {
      const hitView = {
        ...view,
        players: players.map((p) =>
          p.id === 'me'
            ? ({ ...p, hitBy: { fromId: from, kind: 'warp', expiresAt: 1, remainingMs: 1 } } as never)
            : p,
        ),
      };
      const hit = hitOf(hitView as never, { nameOf: () => '', avatarOf: (id) => avatars[id] as never })!;
      const key = senderKeyOf({ avatarId: hit.fromAvatar ?? null, colorIndex: hit.fromColorIndex ?? 1 });
      expect(senders.map(senderKeyOf)).toContain(key);
    }
  });

  it('is empty when I am not in the game', () => {
    expect(hitSendersOf({ me: 'x', players: [player('a', 0)] } as never, {})).toEqual([]);
  });
});
