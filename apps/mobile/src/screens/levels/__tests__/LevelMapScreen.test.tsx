// First: keeps the real Reanimated in place of the router testing library's old mock (see homeTesting.tsx).
import 'react-native-reanimated';
import {
  type AppLevel,
  type FindLevelOver,
  levelIdOf,
  levelNumber,
  levelOutcome,
  type Stars,
} from '@sudoku-fight/engine';
import { render } from '@testing-library/react-native';
import { act, fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import { FlatList, Pressable, StyleSheet, Text, View, type ViewStyle, VirtualizedList } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LevelsRoute from '../../../../app/levels/index';
import { LevelPlayFlow, type LevelPlayingProps } from '../../../../app/levels/play';
import { useAuth } from '../../../auth/authStore';
import { drawnAvatarId, svgXmlsIn } from '../../../avatars/testing/avatarTesting';
import { useToast } from '../../../components/ui';
import { LEVEL_UI, MAP_MOTION } from '../../../config/levels';
import { openPracticeRepo } from '../../../game/practiceRepo';
import { practiceStorageOrNull } from '../../../game/storage';
import { memoryDb, type SqlJsDb } from '../../../game/testing/sqlJsDb';
import i18n from '../../../i18n';
import { levelFinished } from '../../../levels/appLevels';
import { firstLevelOf, levelsOf } from '../../../levels/__tests__/helpers/levelsOf';
import { allLevels, levelById } from '../../../levels/levelsData';
import { forgetLevels } from '../../../levels/levelsStore';
import { track } from '../../../services/analytics';
import { useProfile } from '../../../state/profile';
import { useSettings } from '../../../state/settings';
import { useTestingSwitches } from '../../../state/testingSwitches';
import { color } from '../../../theme';
import { renderApp } from '../../home/testing/homeTesting';
import { useTutorials } from '../HowToPlay';
import { LevelMapScreen, type LevelMapScreenProps } from '../LevelMapScreen';
import { MAP, mapLayout, openOffset, segmentsBetween, stageSpan, toneOf } from '../mapModel';
import { stepTimeline } from '../mapMotion';

/**
 * The level map (components.md §19.2–§19.4; dev-plan §3.1 2ז): it opens at the current chapter with the current
 * node at 40 %, every node has its label, a locked node shakes and says why (not under Reduced Motion), the
 * boss shows its bot from chapter 1, the header chip jumps to a chapter, a closed gate opens its sheet, an open
 * one reads "פרק 5 פתוח", and the panel's button plays. Then the whole way, with a stand-in for the stage
 * screens: משחק חדש → the map → the panel → "מוכן?" → the result → the map, in Hebrew and English.
 */

type Mocks = typeof import('../../home/testing/nativeMocks');

const mockDbs = new Map<string, Promise<SqlJsDb>>();
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: (name: string) => {
    let db = mockDbs.get(name);
    if (!db) {
      db = jest
        .requireActual<typeof import('../../../game/testing/sqlJsDb')>('../../../game/testing/sqlJsDb')
        .memoryDb();
      mockDbs.set(name, db);
    }
    return db;
  },
}));
jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated'));
jest.mock(
  '../../../game/storage',
  () => jest.requireActual<Mocks>('../../home/testing/nativeMocks').practiceStorage,
);
jest.mock('../../../services/analytics', () => ({ track: jest.fn() }));
jest.mock('expo-audio', () => jest.requireActual<Mocks>('../../home/testing/nativeMocks').expoAudio);
jest.mock('expo-haptics', () => jest.requireActual<Mocks>('../../home/testing/nativeMocks').expoHaptics);

const hidden = { includeHiddenElements: true };
const METRICS = {
  frame: { x: 0, y: 0, width: 360, height: 780 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const LEVELS = allLevels();
/**
 * Picked by kind, never by id (a rebuild may give an id another kind): helpers/levelsOf. FIND_N is chapter 1's
 * second find (played, in the tests below), NEXT_N the stage after it (a fill-box, the current one then), RACE_N
 * the first race (against Pip).
 */
const FIND_N = levelNumber(levelsOf('find', { chapter: 1 })[1]!.id)!;
const NEXT_N = FIND_N + 1;
const RACE_N = levelNumber(firstLevelOf('findDuel').id)!;

/** Stages 1…n played, each with these stars (an engine LevelRecords). */
function played(n: number, stars: Stars = 2, from = 1): LevelMapScreenProps['records'] {
  const out: Record<string, { stars: Stars; plays: number; metric: number | null }> = {};
  for (let k = from; k <= n; k++) out[levelIdOf(k)] = { stars, plays: 1, metric: 7600 };
  return out;
}

async function show(over: Partial<LevelMapScreenProps> = {}) {
  const props: LevelMapScreenProps = {
    levels: LEVELS,
    records: {},
    openedChapters: [],
    onBack: jest.fn(),
    onPlay: jest.fn(),
    ...over,
  };
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <LevelMapScreen {...props} />
    </SafeAreaProvider>,
  );
  return props;
}

/** The map shown again with new props (back from a stage: new records). */
async function again(props: LevelMapScreenProps, over: Partial<LevelMapScreenProps>) {
  await screen.rerender(
    <SafeAreaProvider initialMetrics={METRICS}>
      <LevelMapScreen {...props} {...over} />
    </SafeAreaProvider>,
  );
}

const styleOf = (el: { props: { style?: unknown } }) =>
  (StyleSheet.flatten(el.props.style as ViewStyle) ?? {}) as ViewStyle;

beforeEach(async () => {
  await i18n.changeLanguage('he');
  useSettings.setState({ reduceMotion: 'off' });
  useToast.getState().clear();
  useTutorials.setState({ seen: {} });
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('the level map', () => {
  it('opens at the current chapter, the current node at 40 % of the map', async () => {
    const scrolled = jest.spyOn(FlatList.prototype, 'scrollToOffset');
    await show({ records: played(19) });
    const list = screen.getByTestId('level-map-list');
    // Stage 20 is next: chapter 2, the list's second item.
    expect(list).toHaveProp('initialScrollIndex', 1);
    await fireEvent(list, 'layout', { nativeEvent: { layout: { width: 750, height: 600, x: 0, y: 0 } } });
    await fireEvent(list, 'contentSizeChange', 750, 30000);
    const layout = mapLayout(750, 'down', { plateOf: () => 'open' });
    expect(scrolled).toHaveBeenCalledWith({ offset: openOffset(layout, 20, 600), animated: false });
    expect(screen.getByTestId('node-20-ring', hidden)).toBeTruthy();
  });

  it.each([
    ['its height first', ['layout', 'content']],
    ['its content first', ['content', 'layout']],
  ])(
    'B33: the list’s own jump to the chapter’s top never undoes the 40 % placement (%s)',
    async (_, order) => {
      const jumped = jest.spyOn(VirtualizedList.prototype, 'scrollToIndex');
      const scrolled = jest.spyOn(FlatList.prototype, 'scrollToOffset');
      // Stage 17 is next: in the middle of chapter 2, under the panel when the map shows the chapter's top.
      await show({ records: played(16) });
      const list = screen.getByTestId('level-map-list');
      const viewport = { nativeEvent: { layout: { width: 750, height: 600, x: 0, y: 0 } } };
      for (const event of order) {
        if (event === 'layout') await fireEvent(list, 'layout', viewport);
        else await fireEvent(list, 'contentSizeChange', 750, 30000);
      }
      // FlatList's jump to initialScrollIndex (on the first content layout), then the map's own place, once.
      expect(jumped).toHaveBeenCalledWith({ animated: false, index: 1 });
      const layout = mapLayout(750, 'down', { plateOf: () => 'open' });
      expect(scrolled).toHaveBeenCalledTimes(1);
      expect(scrolled).toHaveBeenCalledWith({ offset: openOffset(layout, 17, 600), animated: false });
      expect(scrolled.mock.invocationCallOrder[0]).toBeGreaterThan(jumped.mock.invocationCallOrder[0]!);
    },
  );

  it('QA: a stage chosen near the bottom is scrolled back above the panel it opens (a boss’s is taller)', async () => {
    const scrolled = jest.spyOn(FlatList.prototype, 'scrollToOffset');
    // Stage 17 is next: the map opens with it at 40 %, chapter 2's boss (stage 20) near the bottom.
    await show({ records: played(16) });
    const list = screen.getByTestId('level-map-list');
    const layout = mapLayout(750, 'down', { plateOf: () => 'open' });
    const viewport = (height: number) => ({ nativeEvent: { layout: { width: 750, height, x: 0, y: 0 } } });
    await fireEvent(list, 'layout', viewport(600));
    await fireEvent(list, 'contentSizeChange', 750, 30000);
    const opened = openOffset(layout, 17, 600);
    expect(scrolled).toHaveBeenLastCalledWith({ offset: opened, animated: false });

    // A coin already all in sight: the map stays where it is.
    await fireEvent.press(screen.getByTestId('node-17'));
    expect(scrolled).toHaveBeenCalledTimes(1);

    // The boss chosen: its panel is taller, and the map is left 480 high. Its whole coin (crown to edge) shows.
    await fireEvent.press(screen.getByTestId('node-20'));
    await fireEvent(list, 'layout', viewport(480));
    const boss = stageSpan(layout, 20)!;
    const last = scrolled.mock.calls.at(-1)![0] as { offset: number; animated: boolean };
    expect(last.animated).toBe(true);
    expect(last.offset).toBeLessThanOrEqual(boss.top);
    expect(last.offset + 480).toBeGreaterThanOrEqual(boss.bottom + MAP.revealGap);
    expect(boss.bottom).toBeGreaterThan(opened + 480);

    // Once the map is dragged, it is the player's: a new height moves nothing.
    const calls = scrolled.mock.calls.length;
    await fireEvent(list, 'scrollBeginDrag');
    await fireEvent(list, 'scroll', {
      nativeEvent: {
        contentOffset: { x: 0, y: opened },
        contentSize: { width: 750, height: 30000 },
        layoutMeasurement: { width: 750, height: 480 },
      },
    });
    await fireEvent(list, 'layout', viewport(420));
    expect(scrolled).toHaveBeenCalledTimes(calls);
  });

  it("LEVEL_UI.mapDirection 'up': the list runs from chapter 30 down to stage 1 (D60: 'down')", async () => {
    expect(LEVEL_UI.mapDirection).toBe('down');
    jest.replaceProperty(LEVEL_UI, 'mapDirection', 'up');
    await show({ records: played(19) });
    const list = screen.getByTestId('level-map-list');
    expect((list.props as { data: { chapter: number }[] }).data[0]!.chapter).toBe(30);
    // Chapter 2 is the 29th item from the top.
    expect(list).toHaveProp('initialScrollIndex', 28);
  });

  it('a chapter’s header: "פרק 2", its name, and "★ 18/30"', async () => {
    await show({ records: played(19) });
    const header = screen.getByTestId('chapter-2-header');
    expect(header).toHaveTextContent(/פרק 2/);
    expect(header).toHaveTextContent(/Pip מאתגר/);
    expect(screen.getByTestId('chapter-2-stars')).toHaveProp('accessibilityLabel', '18 כוכבים מתוך 30');
    expect(screen.getByTestId('chapter-2-stars')).toHaveTextContent('⁦18/30⁩');
    // B7: the title beside the chip wraps rather than ending in "…" (mapTitle.test).
    expect(screen.getByTestId('screen-title')).toHaveTextContent('אימון בשלבים');
    expect(screen.getByTestId('level-map-total')).toHaveProp(
      'accessibilityLabel',
      '38 כוכבים מתוך 900, מעבר לפרק',
    );
  });

  it('every node has its label: "שלב 5, מיקום מדויק, שני כוכבים מתוך שלושה", "שלב 12, נעול"', async () => {
    expect(LEVELS[NEXT_N - 1]!.kind).toBe('fillBox');
    await show({ records: played(FIND_N) });
    expect(
      screen.getByRole('button', { name: `שלב ${FIND_N}, מיקום מדויק, שני כוכבים מתוך שלושה` }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'שלב 12, נעול' })).toBeOnTheScreen();
    expect(screen.getByTestId(`node-${NEXT_N}`)).toHaveProp(
      'accessibilityLabel',
      `שלב ${NEXT_N}, מלא את הריבוע, השלב הבא`,
    );
    expect(screen.getByTestId('node-10')).toHaveProp('accessibilityLabel', 'שלב 10, נעול');
    // Every node a button with a label.
    for (const node of screen.getAllByTestId(/^node-\d+$/))
      expect(node).toHaveProp('accessibilityLabel', expect.stringMatching(/^שלב \d+, /));
  });

  it('the boss won with ★★★ and the next chapter closed: the current node says its stars, not "השלב הבא"', async () => {
    // QA loop 10 (levels-gate-locked): L010 stays the current node (L011 is behind the gate), and said "השלב הבא".
    await show({ records: { ...played(9, 0), [levelIdOf(10)]: { stars: 3, plays: 1, metric: 7600 } } });
    expect(screen.getByTestId('node-11')).toHaveProp('accessibilityLabel', 'שלב 11, נעול');
    expect(screen.getByTestId('node-10-tile-pin', hidden)).toBeTruthy();
    expect(screen.getByTestId('node-10')).toHaveProp(
      'accessibilityLabel',
      'שלב 10, בוס, מרוץ מול הבוט, שלושה כוכבים מתוך שלושה',
    );
  });

  it('the current node: my P1 pin and the gold ring, pulsing (static under Reduced Motion)', async () => {
    await show({ records: played(7) });
    expect(screen.getByTestId('node-8-tile-pin', hidden)).toBeTruthy();
    expect(screen.getByTestId('node-8-ring-band', hidden)).toBeTruthy();
    expect(screen.queryByTestId('node-7-tile-pin', hidden)).toBeNull();
    await screen.unmount();
    useSettings.setState({ reduceMotion: 'on' });
    await show({ records: played(7) });
    expect(screen.getByTestId('node-8-ring', hidden)).toBeTruthy();
    expect(screen.queryByTestId('node-8-ring-band', hidden)).toBeNull();
  });

  it('a locked node shakes and says to play the current stage first; under Reduced Motion, no shake', async () => {
    jest.useFakeTimers();
    await show({ records: played(7) });
    await fireEvent.press(screen.getByTestId('node-9'));
    expect(useToast.getState().current?.message).toBe('קודם משחקים את שלב 8');
    await act(async () => void jest.advanceTimersByTime(60));
    const moving = screen.getByTestId('node-9-shake');
    expect(moving).not.toHaveAnimatedStyle({ transform: [{ translateX: 0 }] });
    await act(async () => void jest.advanceTimersByTime(1000));
    expect(moving).toHaveAnimatedStyle({ transform: [{ translateX: 0 }] });
    // The panel says why too.
    expect(screen.getByTestId('level-panel-goal')).toHaveTextContent('שחק את שלב 8 קודם.');
    await screen.unmount();

    useSettings.setState({ reduceMotion: 'on' });
    useToast.getState().clear();
    await show({ records: played(7) });
    await fireEvent.press(screen.getByTestId('node-9'));
    expect(useToast.getState().current?.message).toBe('קודם משחקים את שלב 8');
    await act(async () => void jest.advanceTimersByTime(60));
    expect(screen.getByTestId('node-9-shake')).toHaveAnimatedStyle({ transform: [{ translateX: 0 }] });
    // Instead: the lock badge's border lights up for a moment.
    expect(screen.getByTestId('node-9-tile-lock', hidden)).toHaveStyle({ borderColor: '#eef1f6' });
    await act(async () => void jest.advanceTimersByTime(400));
    expect(screen.getByTestId('node-9-tile-lock', hidden)).not.toHaveStyle({ borderColor: '#eef1f6' });
  });

  it('a stage behind a closed gate says what the gate needs', async () => {
    await show({ records: played(19) });
    await fireEvent.press(screen.getByTestId('node-21'));
    expect(useToast.getState().current?.message).toBe('פרק 3 נפתח ב־20 כוכבים בפרק 2');
  });

  it('the boss shows its bot from chapter 1 (every boss is a bot fight since 1.0.3, D72), and its crown', async () => {
    await show({ records: played(19) });
    expect(screen.getByTestId('node-20-bot', hidden)).toBeTruthy();
    expect(screen.getByTestId('node-20-tile-crown', hidden)).toBeTruthy();
    await screen.unmount();
    await show({ records: played(7) });
    expect(screen.getByTestId('node-10-tile-crown', hidden)).toBeTruthy();
    expect(screen.getByTestId('node-10-bot', hidden)).toBeTruthy();
  });

  it('LEVEL_UI.nodeKindIcon: no kind icon on a node (D60), unless it is turned on', async () => {
    await show({ records: played(FIND_N) });
    expect(screen.queryByTestId(`node-${FIND_N}-kind`, hidden)).toBeNull();
    await screen.unmount();
    jest.replaceProperty(LEVEL_UI, 'nodeKindIcon', true);
    await show({ records: played(FIND_N) });
    expect(
      within(screen.getByTestId(`node-${FIND_N}-kind`, hidden)).getByTestId('icon-target', hidden),
    ).toBeTruthy();
  });

  it('the header chip opens the chapter list, and a row takes the map to its chapter', async () => {
    const jumped = jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation(() => undefined);
    await show({ records: played(19) });
    await fireEvent.press(screen.getByTestId('level-map-total'));
    expect(screen.getByRole('header', { name: 'קפיצה לפרק' })).toBeOnTheScreen();
    expect(screen.getByTestId('chapter-jump-1')).toHaveProp(
      'accessibilityLabel',
      'פרק 1, צעדים ראשונים, 20 כוכבים מתוך 30, פתוח',
    );
    expect(screen.getByTestId('chapter-jump-5')).toHaveProp(
      'accessibilityLabel',
      expect.stringMatching(/נעול$/),
    );
    await fireEvent.press(screen.getByTestId('chapter-jump-5'));
    expect(jumped).toHaveBeenCalledWith({ index: 4, animated: true });
  });

  it('a closed gate opens its sheet, with at most 3 stages to play again', async () => {
    await show({ records: played(19) });
    const gate = screen.getByTestId('gate-3');
    expect(gate).toHaveProp('accessibilityLabel', 'פרק 3 נעול, 18 מתוך 20 כוכבים בפרק 2');
    expect(screen.getByTestId('gate-3-count')).toHaveTextContent('⁦18/20⁩');
    await fireEvent.press(gate);
    expect(screen.getByRole('header', { name: 'פרק 3 נעול' })).toBeOnTheScreen();
    const rows = within(screen.getByTestId('gate-sheet-rows')).getAllByRole('button');
    expect(rows.length).toBeLessThanOrEqual(3);
    // The boss not played yet comes first: without it the gate never opens.
    expect(rows[0]).toHaveProp('accessibilityLabel', expect.stringMatching(/^שחק את שלב 20,/));
  });

  it('an open gate reads "פרק 5 פתוח"', async () => {
    await show({ records: played(40) });
    expect(screen.getByTestId('gate-5-open')).toHaveTextContent('פרק 5 פתוח');
    expect(screen.getByTestId('gate-5')).toHaveProp(
      'accessibilityLabel',
      'פרק 5 פתוח, נפתח ב־20 כוכבים מפרק 4',
    );
  });

  it('the panel: the current stage, its goal and scale, and "המשך · שלב N" plays it', async () => {
    const { onPlay } = await show({ records: played(FIND_N) });
    expect(screen.getByTestId('level-panel-title')).toHaveTextContent(`שלב ${NEXT_N} · מלא את הריבוע`);
    expect(screen.getByTestId('level-panel-next')).toBeTruthy();
    expect(screen.getByTestId('level-scale-3')).toHaveProp('accessibilityLabel', '3 כוכבים: עד 10 ש׳');
    await fireEvent.press(screen.getByRole('button', { name: `המשך · שלב ${NEXT_N}` }));
    expect(onPlay).toHaveBeenCalledWith(levelIdOf(NEXT_N));
    // A played stage: my best, and "שחק".
    await fireEvent.press(screen.getByTestId(`node-${FIND_N}`));
    expect(screen.getByTestId('level-panel-best')).toHaveProp(
      'accessibilityLabel',
      'השיא שלך: שני כוכבים מתוך שלושה, ⁦7.6⁩ ש׳',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'שחק' }));
    expect(onPlay).toHaveBeenLastCalledWith(levelIdOf(FIND_N));
  });

  it('[D73] a best made at another rev is not shown ("השיא התאפס"); one at the level’s own rev is', async () => {
    const id = levelIdOf(FIND_N);
    const rev = levelById(id)!.rev;
    const at = (bestRev: number) => ({
      ...played(FIND_N),
      [id]: { stars: 2 as Stars, plays: 3, metric: 7600, rev: bestRev },
    });
    // Played at the rev before the rebuild (1.0.2's rev 1): the stars stay, the measure is gone.
    await show({ records: at(rev - 1) });
    await fireEvent.press(screen.getByTestId(`node-${FIND_N}`));
    expect(screen.getByTestId('level-panel-best')).toHaveProp(
      'accessibilityLabel',
      'השיא שלך: שני כוכבים מתוך שלושה',
    );
    expect(screen.getByTestId('level-panel-best')).not.toHaveTextContent(/7\.6/);
    await screen.unmount();
    // At the level's own rev: the best, as before.
    await show({ records: at(rev) });
    await fireEvent.press(screen.getByTestId(`node-${FIND_N}`));
    expect(screen.getByTestId('level-panel-best')).toHaveProp(
      'accessibilityLabel',
      'השיא שלך: שני כוכבים מתוך שלושה, ⁦7.6⁩ ש׳',
    );
  });

  it('a staging build’s "פתח את כל השלבים (בדיקה)": every stage and every gate open; the stars as they are', async () => {
    const { onPlay } = await show({ records: played(FIND_N), unlockAll: true });
    expect(screen.queryAllByRole('button', { name: /, נעול$/ })).toEqual([]);
    expect(screen.getByTestId('node-12')).not.toHaveProp('accessibilityLabel', 'שלב 12, נעול');
    expect(screen.getByTestId('gate-2-open')).toBeTruthy();
    // A stage far ahead plays: no "locked" toast, and the panel's "שחק".
    await fireEvent.press(screen.getByTestId('node-12'));
    expect(useToast.getState().current).toBeNull();
    await fireEvent.press(screen.getByTestId('level-panel-play'));
    expect(onPlay).toHaveBeenCalledWith('L012');
    // The progress is unchanged: the current stage is still the next one to play, the stars still mine.
    expect(screen.getByTestId(`node-${NEXT_N}`)).toHaveProp(
      'accessibilityLabel',
      `שלב ${NEXT_N}, מלא את הריבוע, השלב הבא`,
    );
    expect(
      screen.getByRole('button', { name: `שלב ${FIND_N}, מיקום מדויק, שני כוכבים מתוך שלושה` }),
    ).toBeOnTheScreen();
  });

  it('"פתח את כל השלבים" comes from the testing switch by default (off: the gates hold)', async () => {
    await show({ records: played(7) });
    expect(screen.getByRole('button', { name: 'שלב 12, נעול' })).toBeOnTheScreen();
    await screen.unmount();
    useTestingSwitches.setState({ unlockAllLevels: true });
    try {
      await show({ records: played(7) });
      expect(screen.queryByRole('button', { name: 'שלב 12, נעול' })).toBeNull();
    } finally {
      await act(async () => useTestingSwitches.setState({ unlockAllLevels: false }));
    }
  });

  it('a stage against a bot: the panel shows the bot with ▲, its name and level', async () => {
    await show({ records: played(RACE_N - 1) });
    await fireEvent.press(screen.getByTestId(`node-${RACE_N}`));
    // B27: an RLM first, or Android lays the line out left to right from "Pip".
    expect(screen.getByTestId('level-panel-bot')).toHaveProp('accessibilityLabel', '‏Pip · רמה 1 · טירון');
    expect(within(screen.getByTestId('level-panel-bot')).getByTestId('glyph-triangle', hidden)).toBeTruthy();
    // B30: the bot chip on the 22 dp avatar says its whole word, on one line.
    const chip = within(screen.getByTestId('level-panel-bot')).getByTestId('bot-chip', hidden);
    expect(chip).toHaveTextContent('בוט');
    expect(within(chip).getByText('בוט', hidden)).toHaveProp('numberOfLines', 1);
  });
});

// ---------------------------------------------------------------------------------------------------------
// The board-game road (31.10.2026, Moshe: "מסך אימון בשלבים נראה ממש דלוח ועלוב")

describe('the board-game road', () => {
  afterEach(() => useProfile.setState({ avatarId: 'av00' }));

  it('paints no ground of its own: the wandering digits behind the app show through (D126)', async () => {
    await show({ records: played(7) });
    expect(styleOf(screen.getByTestId('level-map')).backgroundColor).toBeUndefined();
    expect(styleOf(screen.getByTestId('chapter-1')).backgroundColor).toBeUndefined();
    // The banner is a ribbon in its chapter's tone, not a strip of the ground across the screen.
    expect(styleOf(screen.getByTestId('chapter-1-header')).backgroundColor).toBeUndefined();
  });

  it('each coin in its look: ★★★ gold, ★★ a gold edge, the current one light, a closed one in its chapter’s tone', async () => {
    const records = { ...played(7, 2), [levelIdOf(1)]: { stars: 3 as Stars, plays: 1, metric: 7600 } };
    await show({ records });
    const face = (n: number) => styleOf(screen.getByTestId(`node-${n}-tile-face`, hidden));
    const edge = (n: number) => styleOf(screen.getByTestId(`node-${n}-tile-edge`, hidden));
    expect(face(1)).toMatchObject({ backgroundColor: color.accent });
    expect(edge(2)).toMatchObject({ backgroundColor: color.levelMap.coin.gildedEdge });
    expect(face(8)).toMatchObject({ backgroundColor: color.levelMap.coin.face[1] });
    expect(edge(8)).toMatchObject({ backgroundColor: color.levelMap.coin.plainEdge });
    expect(face(9)).toMatchObject({ backgroundColor: toneOf(1).deep });
    expect(screen.getByTestId('node-9-tile-lock', hidden)).toBeTruthy();
    // A closed coin has no crown; an open one its three stars.
    expect(screen.queryByTestId('node-9-stars', hidden)).toBeNull();
    expect(screen.getByTestId('node-2-stars-1-filled', hidden)).toBeTruthy();
    expect(screen.getByTestId('node-2-stars-2-empty', hidden)).toBeTruthy();
  });

  it('the banner: a ribbon in the chapter’s tone, its stars chip ringed in gold at 30/30', async () => {
    // Stage 30 is current: chapters 3 and 4 drawn, chapter 3 with 27 of 30.
    await show({ records: played(29, 3) });
    const plate = (c: number) =>
      styleOf(screen.getByTestId(`chapter-${c}-header`).children.at(-1) as { props: { style?: unknown } });
    expect(plate(3)).toMatchObject({ backgroundColor: toneOf(3).deep });
    expect(plate(4)).toMatchObject({ backgroundColor: toneOf(4).deep });
    expect(toneOf(3).deep).not.toBe(toneOf(4).deep);
    expect(styleOf(screen.getByTestId('chapter-3-stars'))).not.toMatchObject({ borderColor: color.accent });
    await screen.unmount();
    // Chapter 2 complete (30 of 30), shown when its stage is chosen.
    await show({ records: played(29, 3), select: 'L015' });
    expect(styleOf(screen.getByTestId('chapter-2-stars'))).toMatchObject({ borderColor: color.accent });
    expect(screen.getByTestId('chapter-2-stars')).toHaveProp('accessibilityLabel', '30 כוכבים מתוך 30');
  });

  it('my token beside the current stage: my avatar in P1’s frame with ●; the gold ring, its beacon, the glow', async () => {
    useProfile.setState({ avatarId: 'noam' });
    await show({ records: played(7) });
    const token = screen.getByTestId('node-8-tile-pin', hidden);
    expect(token).toHaveProp('accessibilityElementsHidden', true);
    expect(token).toHaveProp('pointerEvents', 'none');
    expect(svgXmlsIn(token).some((x) => drawnAvatarId(x.props.xml as string) === 'noam')).toBe(true);
    const frame = screen.getByTestId('node-8-tile-pin-avatar', hidden).children[0] as {
      props: { style?: unknown };
    };
    expect(styleOf(frame)).toMatchObject({ borderColor: color.players[0]!.ring });
    expect(within(token).getByTestId('glyph-circle', hidden)).toBeTruthy();
    expect(screen.getByTestId('node-8-ring', hidden)).toBeTruthy();
    expect(screen.getByTestId('node-8-ring-band', hidden)).toBeTruthy();
    expect(screen.getByTestId('node-8-halo', hidden)).toBeTruthy();
    expect(screen.queryByTestId('node-7-tile-pin', hidden)).toBeNull();
    // The locked stage right after it: a dashed ring; none further on.
    expect(styleOf(screen.getByTestId('node-9-next', hidden))).toMatchObject({ borderStyle: 'dashed' });
    expect(screen.queryByTestId('node-10-next', hidden)).toBeNull();
  });

  it('the beacon beats with rests, and is absent under Reduced Motion (the ring and the glow stay)', async () => {
    jest.useFakeTimers();
    await show({ records: played(7) });
    const band = () => screen.getByTestId('node-8-ring-band', hidden);
    expect(band()).toHaveAnimatedStyle({ opacity: 0 });
    await act(async () => void jest.advanceTimersByTime(400 + 600));
    expect(band()).not.toHaveAnimatedStyle({ opacity: 0 });
    // Into the rest: still.
    await act(async () => void jest.advanceTimersByTime(1400 + 1000));
    expect(band()).toHaveAnimatedStyle({ opacity: 0 });
    await screen.unmount();
    useSettings.setState({ reduceMotion: 'on' });
    await show({ records: played(7) });
    expect(screen.queryByTestId('node-8-ring-band', hidden)).toBeNull();
    expect(screen.getByTestId('node-8-ring', hidden)).toBeTruthy();
    expect(screen.getByTestId('node-8-halo', hidden)).toBeTruthy();
  });

  it('LEVEL_UI.mapToken off: 1.0.2’s 22 dp pin on the current coin (the same testID)', async () => {
    expect(LEVEL_UI.mapToken).toBe(true);
    jest.replaceProperty(LEVEL_UI, 'mapToken', false);
    await show({ records: played(7) });
    const pin = within(screen.getByTestId('node-8-tile', hidden)).getByTestId('node-8-tile-pin', hidden);
    expect(styleOf(pin)).toMatchObject({ width: 22, borderColor: color.players[0]!.ring });
    expect(screen.queryByTestId('node-8-tile-pin-avatar', hidden)).toBeNull();
  });

  it('the road: gold up to the current stage, slate after it; hidden from screen readers', async () => {
    await show({ records: played(7) });
    const road = screen.getByTestId('chapter-1-road', hidden);
    expect(road).toHaveProp('importantForAccessibility', 'no-hide-descendants');
    // Segment 7 runs from stage 7 to 8 (open), segment 8 from 8 to 9 (locked).
    expect(screen.getByTestId('road-7-1-done', hidden)).toBeTruthy();
    expect(screen.getByTestId('road-8-1-ahead', hidden)).toBeTruthy();
  });

  it('LEVEL_UI.mapScenery: the chapter’s scenery under the road, hidden; off, none', async () => {
    expect(LEVEL_UI.mapScenery).toBe(true);
    await show({ records: played(7) });
    const scenery = screen.getByTestId('chapter-1-scenery', hidden);
    expect(scenery).toHaveProp('accessibilityElementsHidden', true);
    expect(scenery).toHaveProp('pointerEvents', 'none');
    expect(within(scenery).getAllByTestId('chapter-1-zone', hidden)).toHaveLength(2);
    await screen.unmount();
    jest.replaceProperty(LEVEL_UI, 'mapScenery', false);
    await show({ records: played(7) });
    expect(screen.queryByTestId('chapter-1-scenery', hidden)).toBeNull();
  });

  it('a chapter reads in order: its banner, its stars, its gate, then stages 1…10 (the rest is hidden)', async () => {
    await show({ records: played(19) });
    const chapter = screen.getByTestId('chapter-3');
    const order = within(chapter)
      .getAllByRole(/^(header|image|img|button)$/)
      .map((el) => {
        const props = el.props as { testID?: string; accessibilityRole?: string };
        return props.testID ?? props.accessibilityRole;
      });
    expect(order).toEqual([
      'header',
      'chapter-3-stars',
      'gate-3',
      ...Array.from({ length: 10 }, (_, i) => `node-${21 + i}`),
    ]);
  });

  it('a shut gate: its barrier across the road; an open one none, its barrier swinging away the first time', async () => {
    await show({ records: played(19) });
    expect(screen.getByTestId('gate-3-barrier', hidden)).toBeTruthy();
    expect(screen.queryByTestId('gate-2-barrier', hidden)).toBeNull();
    await screen.unmount();
    await show({ records: played(19), celebrate: 2 });
    expect(screen.getByTestId('gate-2-barrier-swing', hidden)).toBeTruthy();
    await screen.unmount();
    useSettings.setState({ reduceMotion: 'on' });
    await show({ records: played(19), celebrate: 2 });
    expect(screen.queryByTestId('gate-2-barrier-swing', hidden)).toBeNull();
  });

  it('the panel: the chosen stage’s coin at its head, and the scale as three cards, the ones I reached in gold', async () => {
    await show({ records: played(FIND_N) });
    await fireEvent.press(screen.getByTestId(`node-${FIND_N}`));
    expect(screen.getByTestId('level-panel-coin', hidden)).toBeTruthy();
    expect(screen.getByTestId('level-panel-coin-tile-number', hidden)).toHaveTextContent(String(FIND_N));
    // My best is ★★: the ★ and ★★ cards in gold, not the ★★★ one; their labels unchanged.
    expect(styleOf(screen.getByTestId('level-scale-1'))).toMatchObject({ borderColor: color.accent });
    expect(styleOf(screen.getByTestId('level-scale-2'))).toMatchObject({ borderColor: color.accent });
    expect(styleOf(screen.getByTestId('level-scale-3'))).not.toMatchObject({ borderColor: color.accent });
    expect(screen.getByTestId('level-scale-3')).toHaveProp(
      'accessibilityLabel',
      expect.stringMatching(/^3 כוכבים: /),
    );
    // A gate: its lock on a raised tile.
    await fireEvent.press(screen.getByTestId('gate-2'));
    expect(screen.getByTestId('level-panel-gate-tile', hidden)).toBeTruthy();
  });
});

describe('the panel when the choice changes (level.map.panel)', () => {
  it('its content fades in from nothing, rising; under Reduced Motion it is there at once', async () => {
    jest.useFakeTimers();
    await show({ records: played(FIND_N) });
    const content = () =>
      (screen.getByTestId('level-panel-content').props as { jestAnimatedStyle: { value: ViewStyle } })
        .jestAnimatedStyle.value;
    expect(content()).toMatchObject({ opacity: 1 });
    await fireEvent.press(screen.getByTestId(`node-${FIND_N}`));
    // Two frames in: on its way up from 0, and still a little low.
    await act(async () => void jest.advanceTimersByTime(32));
    expect(content().opacity).toBeLessThan(0.9);
    expect(content().transform).toEqual([{ translateY: expect.any(Number) }]);
    expect((content().transform as { translateY: number }[])[0]!.translateY).toBeGreaterThan(0);
    await act(async () => void jest.advanceTimersByTime(MAP_MOTION.panelSwapMs + 50));
    expect(content()).toMatchObject({ opacity: 1, transform: [{ translateY: 0 }] });
    await screen.unmount();
    useSettings.setState({ reduceMotion: 'on' });
    await show({ records: played(FIND_N) });
    await fireEvent.press(screen.getByTestId(`node-${FIND_N}`));
    await act(async () => void jest.advanceTimersByTime(32));
    expect(content()).toMatchObject({ opacity: 1 });
  });
});

describe('back from a stage (LEVEL_UI.mapChoreography)', () => {
  const doneAt = () => {
    const layout = mapLayout(360, 'down');
    const segs = segmentsBetween(layout, 8, 9);
    return stepTimeline(
      { stars: { n: 8, from: 0, to: 2 }, advance: { from: 8, to: 9 } },
      segs.map((seg) => ({ seg, length: layout.segments[seg]!.length })),
    ).doneAt;
  };

  it('the new stars pop on the coin, the gold pours to the next stage, my token hops there; then all is still', async () => {
    expect(LEVEL_UI.mapChoreography).toBe(true);
    jest.useFakeTimers();
    const props = await show({ records: played(7) });
    await again(props, { records: played(8) });
    // The labels and the panel say the true state at once.
    expect(screen.getByTestId('node-9')).toHaveProp(
      'accessibilityLabel',
      expect.stringMatching(/, השלב הבא$/),
    );
    expect(screen.getByTestId('level-panel-title')).toHaveTextContent(/^שלב 9 · /);
    // The sequence: stage 8's two new stars, the road from 8 to 9 pouring, my token hopping to stage 9.
    expect(screen.getByTestId('node-8-stars-0-pop', hidden)).toBeTruthy();
    expect(screen.getByTestId('node-8-stars-1-pop', hidden)).toBeTruthy();
    expect(screen.getByTestId('road-8-1-pour', hidden)).toBeTruthy();
    expect(screen.getByTestId('node-9-tile-pin', hidden)).toBeTruthy();
    expect(screen.queryByTestId('node-8-tile-pin', hidden)).toBeNull();
    await act(async () => void jest.advanceTimersByTime(doneAt() + 50));
    expect(screen.queryByTestId('node-8-stars-0-pop', hidden)).toBeNull();
    expect(screen.queryByTestId('road-8-1-pour', hidden)).toBeNull();
    expect(screen.getByTestId('road-8-1-done', hidden)).toBeTruthy();
    expect(screen.getByTestId('node-9-tile-pin', hidden)).toBeTruthy();
  });

  it('a touch on the map finishes it at once', async () => {
    jest.useFakeTimers();
    const props = await show({ records: played(7) });
    await again(props, { records: played(8) });
    expect(screen.getByTestId('road-8-1-pour', hidden)).toBeTruthy();
    await fireEvent(screen.getByTestId('level-map'), 'touchStart', {});
    expect(screen.queryByTestId('road-8-1-pour', hidden)).toBeNull();
    expect(screen.getByTestId('road-8-1-done', hidden)).toBeTruthy();
  });

  it('under Reduced Motion, or turned off: the new state at once, no pop, no pour, no hop', async () => {
    useSettings.setState({ reduceMotion: 'on' });
    let props = await show({ records: played(7) });
    await again(props, { records: played(8) });
    expect(screen.queryByTestId('node-8-stars-0-pop', hidden)).toBeNull();
    expect(screen.queryByTestId('road-8-1-pour', hidden)).toBeNull();
    expect(screen.getByTestId('road-8-1-done', hidden)).toBeTruthy();
    expect(screen.getByTestId('node-9-tile-pin', hidden)).toBeTruthy();
    await screen.unmount();
    useSettings.setState({ reduceMotion: 'off' });
    jest.replaceProperty(LEVEL_UI, 'mapChoreography', false);
    props = await show({ records: played(7) });
    await again(props, { records: played(8) });
    expect(screen.queryByTestId('road-8-1-pour', hidden)).toBeNull();
    expect(screen.getByTestId('road-8-1-done', hidden)).toBeTruthy();
  });

  it('a boss from ★ to ★★★: only its two new stars pop on the pedestal', async () => {
    jest.useFakeTimers();
    const props = await show({ records: { ...played(9), ...played(10, 1, 10) } });
    await again(props, { records: { ...played(9), ...played(10, 3, 10) } });
    expect(screen.queryByTestId('node-10-stars-0-pop', hidden)).toBeNull();
    expect(screen.getByTestId('node-10-stars-1-pop', hidden)).toBeTruthy();
    expect(screen.getByTestId('node-10-stars-2-pop', hidden)).toBeTruthy();
  });

  it('across a gate it waits for "פרק חדש נפתח" to close, and the tap that closes it does not finish it', async () => {
    jest.useFakeTimers();
    const pours = () => screen.queryAllByTestId(/^road-.+-pour$/, hidden);
    // Stage 10 (the boss) played: chapter 1 has its 20 stars, gate 2 opens and is celebrated over the map.
    const props = await show({ records: played(9) });
    await again(props, { records: played(10), celebrate: 2 });
    expect(screen.getByTestId('chapter-unlocked', hidden)).toBeTruthy();
    expect(pours()).toHaveLength(0);
    await fireEvent(screen.getByTestId('level-map'), 'touchStart', {});
    await act(async () => void jest.advanceTimersByTime(5_000));
    expect(pours()).toHaveLength(0);
    // Closed: now the gold pours over the gate to stage 11.
    await again(props, { records: played(10), celebrate: null });
    expect(pours().length).toBeGreaterThan(0);
  });

  it('nothing plays on the map’s first showing', async () => {
    await show({ records: played(8) });
    expect(screen.queryByTestId('road-8-1-pour', hidden)).toBeNull();
    expect(screen.queryByTestId('node-8-stars-0-pop', hidden)).toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------------------
// The whole way, with a stand-in for the stage screens (2ח builds the real ones)

/** A stage that ends as soon as "סיום" is pressed: found in 4 s, stored through the app's levelFinished. */
function FakeStage({ level, onFinished }: LevelPlayingProps) {
  return (
    <View testID="fake-stage">
      <Text>{level.id}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="finish"
        testID="fake-stage-finish"
        onPress={() => {
          const end: FindLevelOver = {
            reason: 'targetReached',
            elapsedMs: 4000,
            penaltyMs: 0,
            spots: 1,
            found: 0,
            stars: 3,
          };
          void levelFinished({ level, end, attempt: 1, startedAt: 1, endedAt: 2 }).then((finished) =>
            onFinished({
              outcome: levelOutcome(level, end),
              finished,
              mistakes: 0,
              opponent: null,
              bestMove: null,
              why: null,
            }),
          );
        }}
      />
    </View>
  );
}

const ROUTES = {
  'levels/index': LevelsRoute,
  'levels/play': () => <LevelPlayFlow Playing={FakeStage} />,
};

let uid = 0;
async function signIn() {
  uid += 1;
  await act(async () =>
    useAuth.setState({
      status: 'ready',
      user: { uid: `map-${uid}`, email: null, emailVerified: true, methods: [] },
    }),
  );
}

describe.each(['he', 'en'] as const)('the way through, %s', (lang) => {
  beforeEach(async () => {
    jest.mocked(practiceStorageOrNull).mockImplementation(async () => openPracticeRepo(await memoryDb()));
    await i18n.changeLanguage(lang);
    useSettings.setState({ reduceMotion: 'on', language: lang });
    // "איך משחקים" has its own tests (HowToPlay.test).
    useTutorials.setState({ seen: { find: true, fillBox: true, boss: true } });
    await signIn();
  });
  afterEach(async () => {
    await act(async () => useAuth.setState({ status: 'loading', user: null }));
    forgetLevels();
  });

  it('משחק חדש → the map → the panel → "מוכן?" → the result → the map, with Reduced Motion', async () => {
    const app = await renderApp('/modes', ROUTES);
    await fireEvent.press(screen.getByTestId('mode-levels'));
    expect(app.pathname()).toBe('/levels');
    await screen.findByTestId('level-map');
    expect(jest.mocked(track)).toHaveBeenCalledWith('level_map_open', { level: 1, stars: 0 });
    // Every node it drew has its label.
    for (const node of screen.getAllByTestId(/^node-\d+$/))
      expect(node).toHaveProp(
        'accessibilityLabel',
        expect.stringMatching(lang === 'he' ? /^שלב \d+, / : /^Stage \d+, /),
      );

    await fireEvent.press(screen.getByTestId('level-panel-play'));
    expect(app.pathnameWithParams()).toBe('/levels/play?id=L001');
    expect(screen.getByTestId('level-ready')).toBeOnTheScreen();
    expect(screen.queryByTestId('fake-stage')).toBeNull();
    await act(async () => void jest.advanceTimersByTime(LEVEL_UI.readyMs));
    await fireEvent.press(screen.getByTestId('fake-stage-finish'));
    await screen.findByTestId('level-result');
    // The result is a state of the stage's route: no navigation.
    expect(app.pathname()).toBe('/levels/play');
    expect(screen.getByTestId('level-result-title')).toHaveTextContent(
      lang === 'he' ? 'שלב 1 הושלם' : 'Stage 1 complete',
    );

    await fireEvent.press(screen.getByTestId('level-result-map'));
    await waitFor(() => expect(app.pathname()).toBe('/levels'));
    // Back on the map: stage 1 played with ★★★, stage 2 is next.
    await waitFor(() =>
      expect(screen.getByTestId('node-1')).toHaveProp(
        'accessibilityLabel',
        lang === 'he'
          ? 'שלב 1, מיקום מדויק, שלושה כוכבים מתוך שלושה'
          : 'Stage 1, Pinpoint, three stars of three',
      ),
    );
    expect(screen.getByTestId('node-2-tile-pin', hidden)).toBeTruthy();
    // The panel moved on with it.
    expect(screen.getByTestId('level-panel-title')).toHaveTextContent(
      lang === 'he' ? /^שלב 2 · / : /^Stage 2 · /,
    );
  });
});

/** The levels' data the map reads is the shipped file (300 stages). */
it('reads the shipped stages', () => {
  expect(LEVELS).toHaveLength(300);
  expect((LEVELS[FIND_N - 1] as AppLevel).kind).toBe('find');
});
