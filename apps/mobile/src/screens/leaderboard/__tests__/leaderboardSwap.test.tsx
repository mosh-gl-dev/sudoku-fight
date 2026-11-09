import 'react-native-reanimated';

import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { entry, fakeProgressApi, ranked } from '../../../api/testing/fakeProgress';
import i18n from '../../../i18n';
import { useSettings } from '../../../state/settings';
import { LeaderboardScreen } from '../LeaderboardScreen';

/**
 * QA run #3 (docs/PERF.md, B14/B32; the History's freeze, T3-HISTORY-FREEZE, from another list): every row's press
 * and entrance is held by Reanimated on Android its first ~2 s (each animated style writes once as its view
 * mounts). A tab read before came back in one commit with its rows and podium, which deleted the rows shown in the
 * frame that drew the new rows' avatars: each new shape failed on every old row. A tab, or a table size, now
 * shows the table's loading state first, in a commit of its own, and its rows SWAP_FRAMES later; the rest of the
 * screen (the tabs, my pinned row) already shows the tab it swaps to.
 */

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);

const settle = () =>
  act(async () => {
    for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r));
  });

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
/** Runs the frames the screen waits for, as the phone would. */
const frameOut = async () => {
  for (let i = 0; i < 4; i++) await frame();
  await settle();
};

const ME = entry({ id: 'me', displayName: 'MosheG', rank: 214, rating: 1287, league: 'gold', level: 14 });
const rowIds = () =>
  screen
    .queryAllByTestId(/^leaderboard-row-/)
    .map((r) => (r.props.testID as string).replace('leaderboard-row-', ''));

beforeEach(async () => {
  await i18n.changeLanguage('he');
  useSettings.setState({ reduceMotion: 'off' });
});
afterEach(() => jest.restoreAllMocks());

/** The board on screen, its frames held from here on. Option B (one table a tab), or option A (`sized`). */
async function showBoard(sized = false) {
  const api = fakeProgressApi(
    sized
      ? {
          sized: { 'fast:2': ranked(5, 1, 'two'), 'fast:3': ranked(6, 1, 'three') },
          tabs: { general: ranked(4) },
        }
      : { tabs: { general: ranked(8), normal: ranked(6, 1, 'n') }, me: ME },
  );
  await render(
    <LeaderboardScreen
      api={() => api}
      myId="me"
      myAvatar="lava-lamp"
      myLeague={{ league: 'gold', rating: 1276 }}
      onOpenPlayer={jest.fn()}
      onPlay={jest.fn()}
      onTab={jest.fn()}
    />,
  );
  await settle();
  holdFrames();
  return api;
}

it('a tab read before: its rows and podium come two frames after the old ones went, never with them', async () => {
  await showBoard();
  expect(rowIds()).toEqual(['p4', 'p5', 'p6', 'p7', 'p8']);
  await fireEvent.press(screen.getByRole('tab', { name: 'רגיל' }));
  await frameOut();
  expect(rowIds()).toEqual(['n4', 'n5', 'n6']);

  // Back to "כללי", read already (feed.peek has it): the old rows go now, with the table's loading state.
  await fireEvent.press(screen.getByRole('tab', { name: 'כללי' }));
  await settle();
  expect(rowIds()).toEqual([]);
  expect(screen.queryByTestId('leaderboard-podium')).toBeNull();
  expect(screen.getByTestId('leaderboard-loading')).toBeOnTheScreen();
  // The rest of the screen is the new tab's at once: the tab, its caption, my pinned row (never blinks).
  expect(screen.getByRole('tab', { name: 'כללי' })).toHaveProp('accessibilityState', { selected: true });
  expect(screen.getByTestId('leaderboard-caption')).toHaveTextContent('כללי · הדירוג הגבוה של כל שחקן');
  expect(screen.getByTestId('leaderboard-me-row')).toBeOnTheScreen();
  await frame();
  await settle();
  expect(rowIds()).toEqual([]);
  await frame();
  await settle();
  expect(screen.queryByTestId('leaderboard-loading')).toBeNull();
  expect(screen.getByTestId('leaderboard-podium')).toBeOnTheScreen();
  expect(rowIds()).toEqual(['p4', 'p5', 'p6', 'p7', 'p8']);
});

it('a table size: the same', async () => {
  const api = await showBoard(true);
  await fireEvent.press(screen.getByRole('tab', { name: 'מהיר' }));
  await frameOut();
  expect(rowIds()).toEqual(['two4', 'two5']);
  await fireEvent.press(screen.getByRole('radio', { name: '3 שחקנים' }));
  await settle();
  expect(rowIds()).toEqual([]);
  await frameOut();
  expect(api.queries.at(-1)).toEqual({ tab: 'fast', players: 3 });
  expect(rowIds()).toEqual(['three4', 'three5', 'three6']);
});
