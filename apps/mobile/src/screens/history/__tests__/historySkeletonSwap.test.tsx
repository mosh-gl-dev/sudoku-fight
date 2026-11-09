import 'react-native-reanimated';

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet, type ViewStyle } from 'react-native';

import { SKELETON_PULSE } from '../../../components/ui/Skeleton';
import type { PracticeRepo } from '../../../game/practiceRepo';
import i18n from '../../../i18n';
import { useSettings } from '../../../state/settings';
import { T0 } from '../../replay/testing/games';
import { fakeHistoryApi, memoryRepo, rankedDuel } from '../../replay/testing/sources';
import { type HistoryApi, HistoryApiError } from '../historyApi';
import { HistoryScreen } from '../HistoryScreen';

/**
 * QA run #3, T3-HISTORY-FREEZE (docs/PERF.md, B14/B32): Home → "היסטוריה" froze the phone for 6.5–7.4 s, every
 * time. The cards (an avatar each, ~370 react-native-svg shapes drawn for the first time) replaced the loading
 * skeleton in one commit, and its 24 blocks pulsed on a worklet style: on Android, Reanimated still held each
 * deleted block and every new shape failed on all 24 of them (6,700–8,900 logged exceptions in one frame).
 * The skeleton the cards replace must hold no view a worklet moves; its pulse is a CSS animation.
 */

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);

type Host = { type: unknown; props: Record<string, unknown> };

const settle = () =>
  act(async () => {
    for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r));
  });

let announce: jest.SpyInstance;

beforeEach(async () => {
  await i18n.changeLanguage('he');
  useSettings.setState({ reduceMotion: 'off' });
  announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
});
afterEach(() => announce.mockRestore());

it('the loading skeleton the cards replace pulses as a CSS animation: no block is moved by a worklet', async () => {
  let open: (repo: PracticeRepo) => void = () => undefined;
  const repo = await memoryRepo();
  const games = Array.from({ length: 8 }, (_, i) => rankedDuel(`ranked-${i}`, T0 + i * 60_000));
  await render(
    <HistoryScreen
      deps={() => ({
        practice: () => new Promise((resolve) => (open = resolve)),
        ranked: fakeHistoryApi(games),
      })}
      onOpen={jest.fn()}
      onPlay={jest.fn()}
      onTab={jest.fn()}
      myAvatar="lava-lamp"
      now={() => T0 + 2 * 86_400_000}
    />,
  );
  await settle();

  const loading = screen.getByTestId('history-loading') as unknown as {
    queryAll: (p: (n: Host) => boolean) => Host[];
  };
  // Every Reanimated view in it (under Jest each one carries its worklet style, empty or not).
  const animated = loading.queryAll(
    (n) => typeof n.type === 'string' && n.props.jestAnimatedStyle !== undefined,
  );
  expect(animated).toHaveLength(24);
  for (const block of animated) {
    expect((block.props.jestAnimatedStyle as { value: object }).value).toEqual({});
    expect(StyleSheet.flatten(block.props.jestInlineStyle as ViewStyle)).toMatchObject(SKELETON_PULSE);
  }

  await act(async () => open(repo));
  await settle();
  expect(screen.queryByTestId('history-loading')).toBeNull();
  expect(screen.getAllByTestId(/^history-card-/).length).toBeGreaterThan(0);
});

/**
 * The same freeze, from the list itself: every card's press and entrance is held by Reanimated its first ~2 s
 * (each animated style writes once as its view mounts). A list swapped for another in one commit deleted them in
 * the frame that drew the new cards' avatars. What was shown goes first (the skeleton), and the new cards come
 * SWAP_FRAMES later.
 */
describe('a list swapped for another never draws its cards in the frame that deletes the old ones', () => {
  /** The UI thread's frames, run one at a time from here on. */
  let frames: FrameRequestCallback[] = [];
  const holdFrames = () => {
    frames = [];
    jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((run) => frames.push(run));
    jest.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => undefined);
  };
  const frame = () =>
    act(async () => {
      const due = frames;
      frames = [];
      due.forEach((run) => run(0));
    });
  afterEach(() => jest.restoreAllMocks());

  const games = Array.from({ length: 4 }, (_, i) => rankedDuel(`ranked-${i}`, T0 + i * 60_000));
  const cards = () => screen.queryAllByTestId(/^history-card-ranked-\d+$/);
  const showHistory = async (ranked: HistoryApi) => {
    const repo = await memoryRepo();
    await render(
      <HistoryScreen
        deps={() => ({ practice: async () => repo, ranked })}
        onOpen={jest.fn()}
        onPlay={jest.fn()}
        onTab={jest.fn()}
        myAvatar="lava-lamp"
        now={() => T0 + 2 * 86_400_000}
      />,
    );
    await settle();
  };

  it('another filter: its skeleton at once, and its cards two frames later, though the loader had them', async () => {
    await showHistory(fakeHistoryApi(games));
    expect(cards()).toHaveLength(4);
    holdFrames();
    await fireEvent.press(screen.getByTestId('history-filter-ranked'));
    await settle(); // both sources were read: the page is ready, only the frames are missing
    expect(cards()).toHaveLength(0);
    expect(screen.getByTestId('history-loading')).toBeOnTheScreen();
    await frame();
    await settle();
    expect(cards()).toHaveLength(0);
    await frame();
    await settle();
    expect(screen.queryByTestId('history-loading')).toBeNull();
    expect(cards()).toHaveLength(4);
  });

  it('"נסה שוב" that brings the cards: the failure (its button just pressed) goes first', async () => {
    const online = fakeHistoryApi(games);
    let offline = true;
    await showHistory({
      ...online,
      myGames: (cursor) =>
        offline ? Promise.reject(new HistoryApiError('network')) : online.myGames(cursor),
    });
    expect(screen.getByTestId('history-offline')).toBeOnTheScreen();
    offline = false;
    holdFrames();
    await fireEvent.press(screen.getByTestId('history-retry'));
    await settle();
    expect(screen.queryByTestId('history-offline')).toBeNull();
    expect(screen.getByTestId('history-loading')).toBeOnTheScreen();
    expect(cards()).toHaveLength(0);
    await frame();
    await frame();
    await settle();
    expect(screen.queryByTestId('history-loading')).toBeNull();
    expect(cards()).toHaveLength(4);
  });

  it('"נסה שוב" that fails again: the same state stays, nothing swaps', async () => {
    await showHistory(fakeHistoryApi(games, { failWith: 'network' }));
    const state = screen.getByTestId('history-offline');
    holdFrames();
    await fireEvent.press(screen.getByTestId('history-retry'));
    await settle();
    expect(screen.queryByTestId('history-loading')).toBeNull();
    expect(screen.getByTestId('history-offline')).toBe(state);
  });
});
