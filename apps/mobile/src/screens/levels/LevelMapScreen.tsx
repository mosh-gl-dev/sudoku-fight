import {
  type AppLevel,
  type BotLevelId,
  chapterOf,
  chapterOpen,
  DEFAULT_PROGRESS_RULES,
  type GateState,
  isLevelOpen,
  LEVEL_RULES,
  levelIdOf,
  type LevelRecord,
  levelNumber,
  maxLevel,
} from '@sudoku-fight/engine';
import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../auth/authStore';
import { normalizeAvatarId } from '../../avatars';
import { useScreenFocused } from '../../avatars/useScreenFocused';
import { Star, STAR_SIZES } from '../../components/levels/StarRow';
import { ltr } from '../../components/player/format';
import { useToast } from '../../components/ui';
import { TactileSurface } from '../../components/ui/tactile';
import { Text } from '../../components/ui/Text';
import { LEVEL_UI, MAP_MOTION } from '../../config/levels';
import { useUnlockAllLevels } from '../../config/testing';
import { bestMetricAt } from '../../levels/levelsRepo';
import { cue } from '../../services/feedback';
import { useProfile } from '../../state/profile';
import { color, radius, size, space, text, tokens } from '../../theme';
import { useReduceMotion } from '../../theme/motion';
import { ScreenHeader } from '../home/parts';
import { ChapterJumpSheet, type ChapterRow } from './ChapterJumpSheet';
import { ChapterUnlockedView } from './ChapterUnlockedView';
import { GateSheet } from './GateSheet';
import { LevelPanel, type PanelSelection } from './LevelPanel';
import { LevelPath, type MapSelection, type MapStepView, type MapTokenPlan } from './LevelPath';
import { stepTimeline } from './mapMotion';
import {
  chapterTotal,
  type ChapterLayout,
  currentLevel,
  everyChapter,
  gateBefore,
  indexOfChapter,
  mapLayout,
  type MapSnapshot,
  nodeInfo,
  type ProgressStep,
  type NodeInfo,
  openOffset,
  progressStep,
  gateSpan,
  revealOffset,
  segmentsBetween,
  stageSpan,
  totalStars,
  unlockedNode,
} from './mapModel';

/**
 * The level map, /levels (components.md §19.2–§19.4, §19.14; the board-game road of 31.10.2026): the header (back,
 * "אימון בשלבים" and the raised "★ 84/900" chip that opens the chapter list), the road of 300 stages by chapter,
 * and the docked panel of what is chosen. It opens at the current chapter, with the current stage at 40 % of the
 * height and my token landing beside it. It paints no ground: the wandering digits behind the app show through.
 *
 * - A stage tapped: chosen, the panel says it. A locked one shakes and the map says why ("קודם משחקים את שלב 37",
 *   or its chapter's gate).
 * - A gate tapped: a closed one opens the gate sheet (up to 3 stages to play again); an open one is shown in the
 *   panel.
 * - The panel's button plays: "המשך · שלב 37" for the current stage, "שחק" for another open one.
 * - A gate that opened and was not celebrated yet: "פרק חדש נפתח" over the map, once.
 * - Back from a stage (LEVEL_UI.mapChoreography; never under Reduced Motion): the new stars pop on the coin, the
 *   gold pours along the road to the next stage and my token hops there (progressStep, stepTimeline). A touch or
 *   a drag finishes it at once. The labels, the panel and the live region always say the true state.
 *
 * What is open, the gates and the stars: the engine's rules over levels.db's records (the route reads them).
 * Every navigation waits for a closing sheet to leave first (no window torn down with the screen).
 */

/**
 * My bests by stage id, as levels.db reads them: the engine's records, the best measure and the rev it was made
 * at (best_rev; null for a row restored from the server). A best made at another rev is not shown [D73].
 */
export type MapRecords = Readonly<
  Record<string, (LevelRecord & { metric?: number | null; rev?: number | null }) | undefined>
>;

export interface LevelMapScreenProps {
  /** The stages (levels.json, read on first use). */
  levels: readonly AppLevel[];
  /** My bests by stage id (levels.db), with the measure for "השיא שלי". */
  records: MapRecords;
  /** The chapters a gate opened once. */
  openedChapters: readonly number[];
  /**
   * Every stage open (a staging build's "פתח את כל השלבים (בדיקה)", config/testing.ts); the switch by default.
   * Stars and XP count as usual.
   */
  unlockAll?: boolean;
  /** A stage to choose when the map opens (the result's "לשלב הבא" with the quick entry off). */
  select?: string | null;
  /** A chapter whose gate opened and whose "פרק חדש נפתח" waits, and when it was shown. */
  celebrate?: number | null;
  onCelebrated?: (chapter: number) => void;
  onBack: () => void;
  onPlay: (levelId: string) => void;
}

export function LevelMapScreen({
  levels,
  records,
  openedChapters: openedOnce,
  unlockAll: unlockAllProp,
  select = null,
  celebrate = null,
  onCelebrated,
  onBack,
  onPlay,
}: LevelMapScreenProps) {
  const { t } = useTranslation('levels');
  // The testing switch: every chapter as opened (every gate open), and every node open (nodeOf).
  const unlockSwitch = useUnlockAllLevels();
  const unlockAll = unlockAllProp ?? unlockSwitch;
  const openedChapters = useMemo(() => (unlockAll ? everyChapter() : openedOnce), [unlockAll, openedOnce]);
  const reduce = useReduceMotion();
  const { top, bottom } = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const levelsById = useMemo(() => new Map(levels.map((l) => [l.id, l])), [levels]);
  const current = useMemo(() => currentLevel(records, openedChapters), [records, openedChapters]);
  const me = useAuth((st) => st.me);
  const localAvatar = useProfile((st) => st.avatarId);
  const avatarId = normalizeAvatarId(me?.avatarId ?? localAvatar);
  const focused = useScreenFocused();
  const layout = useMemo(
    () =>
      mapLayout(width, LEVEL_UI.mapDirection, {
        plateOf: (c) => (gateBefore(c, records, openedChapters).open ? 'open' : 'closed'),
        isOpen: (n) => unlockAll || isLevelOpen(n, records, openedChapters),
      }),
    [width, records, openedChapters, unlockAll],
  );
  const nodeOf = useCallback(
    (n: number): NodeInfo => {
      const info = nodeInfo(n, records, openedChapters, current);
      return unlockAll ? unlockedNode(info) : info;
    },
    [records, openedChapters, current, unlockAll],
  );
  const gateOf = useCallback(
    (c: number) => gateBefore(c, records, openedChapters),
    [records, openedChapters],
  );
  const chapterStarsOf = useCallback((c: number) => chapterTotal(c, records), [records]);

  const preselected = select ? levelNumber(select) : null;
  const [selected, setSelected] = useState<MapSelection>({ kind: 'level', n: preselected ?? current });
  const [shake, setShake] = useState<{ n: number; key: number } | null>(null);
  const [gateSheet, setGateSheet] = useState<number | null>(null);
  const [jumpOpen, setJumpOpen] = useState(false);
  /** A stage picked in the gate sheet: played once the sheet has left the screen. */
  const pendingPlay = useRef<string | null>(null);

  // Open at the current (or chosen) node, at 40 % of the map's height; once. It needs the list's height and its
  // content laid out, whichever comes second: FlatList jumps to initialScrollIndex (the chapter's top) when its
  // content is first laid out, and that jump undid a scroll made on the layout alone, leaving the current stage
  // under the panel (B33).
  const list = useRef<FlatList<ChapterLayout>>(null);
  const focus = preselected ?? current;
  const initialIndex = Math.max(0, indexOfChapter(layout, chapterOf(focus)));
  const placed = useRef(false);
  const viewport = useRef(0);
  const contentReady = useRef(false);
  /** Where the list is scrolled to (as it reports it, or where the map last sent it). */
  const scrollAt = useRef(0);
  const scrollTo = (offset: number, animated: boolean) => {
    scrollAt.current = offset;
    list.current?.scrollToOffset({ offset, animated });
  };
  const place = () => {
    if (placed.current || viewport.current <= 0 || !contentReady.current) return;
    placed.current = true;
    scrollTo(openOffset(layout, focus, viewport.current), false);
  };

  // What a tap chose, kept all in sight: the panel it opens (a boss's is taller) takes its height from the map,
  // and a coin near the bottom went under it, its crown alone left in sight (QA). The map scrolls it back above
  // the panel, now and whenever the map's height changes, until the map is dragged or jumps elsewhere.
  const keepInSight = useRef<MapSelection | null>(null);
  const reveal = () => {
    const chosen = keepInSight.current;
    if (!chosen || !placed.current || viewport.current <= 0) return;
    const span = chosen.kind === 'level' ? stageSpan(layout, chosen.n) : gateSpan(layout, chosen.chapter);
    const to = span ? revealOffset(layout, span, scrollAt.current, viewport.current) : null;
    if (to !== null) scrollTo(to, !reduce);
  };
  const onViewport = (height: number) => {
    viewport.current = height;
    place();
    reveal();
  };
  const onContentReady = () => {
    contentReady.current = true;
    place();
  };

  // Back from a stage, the current one moved on: the choice follows it (when it was on the old one), and so
  // does the map (derived during render; the scroll once it has run).
  const [seenCurrent, setSeenCurrent] = useState(current);
  if (current !== seenCurrent) {
    setSeenCurrent(current);
    if (selected.kind === 'level' && selected.n === seenCurrent) setSelected({ kind: 'level', n: current });
  }
  const follow = useEffectEvent((n: number) => {
    if (!placed.current || viewport.current <= 0) return;
    keepInSight.current = null;
    scrollTo(openOffset(layout, n, viewport.current), !reduce);
  });
  // Only when the current stage moves (not for a new layout of the same progress).
  useEffect(() => follow(current), [current]);

  // Back from a stage: the map shows its last picture (`shown`) until the step from it to now has played. The
  // labels, the panel and the live region read the true records all along; only the coins' stars, the road's gold
  // and my token's place wait.
  const [shown, setShown] = useState<MapSnapshot>({ records, current });
  const raw =
    LEVEL_UI.mapChoreography && !reduce ? progressStep(shown, { records, current }, { unlockAll }) : null;
  // By content: the same records read again (a refresh on focus) are the same step, never a new one.
  const stepId = raw ? JSON.stringify(raw) : '';
  const pending = useMemo(() => (stepId ? (JSON.parse(stepId) as ProgressStep) : null), [stepId]);
  if (!pending && (shown.records !== records || shown.current !== current)) {
    // Nothing to play (the first picture, a jump, Reduced Motion): the map simply shows the new state.
    setShown({ records, current });
  }
  // It plays while the map is shown (from its start again if the map was left and comes back), and never under
  // "פרק חדש נפתח": crossing a gate opens one, and the overlay covers the map; the step starts once it has closed
  // (and the tap that closes it, under the overlay, does not finish a step that has not played).
  const running = pending !== null && focused && celebrate === null;
  const timeline = useMemo(() => {
    if (!pending) return null;
    const segs = pending.advance ? segmentsBetween(layout, pending.advance.from, pending.advance.to) : [];
    return {
      segs,
      ...stepTimeline(
        pending,
        segs.map((seg) => ({ seg, length: layout.segments[seg]!.length })),
      ),
    };
  }, [pending, layout]);
  const finishStep = useCallback(() => setShown({ records, current }), [records, current]);
  // Over at its end (or at once on a touch or a drag).
  useEffect(() => {
    if (!running || !timeline) return;
    const timer = setTimeout(finishStep, timeline.doneAt);
    return () => clearTimeout(timer);
  }, [running, timeline, finishStep]);
  const step: MapStepView | null = useMemo(() => {
    if (!pending || !timeline) return null;
    return {
      running,
      stars:
        pending.stars && timeline.starsAt !== null
          ? { ...pending.stars, delayMs: timeline.starsAt }
          : undefined,
      ahead: new Set(timeline.segs),
      pour: new Map(timeline.pour.map((p) => [p.seg, { delayMs: p.delayMs, durationMs: p.durationMs }])),
    };
  }, [pending, timeline, running]);

  // My token: it lands beside the current stage when the map first shows, and hops on with a step.
  const [landing, setLanding] = useState(LEVEL_UI.mapToken && !reduce);
  useEffect(() => {
    if (!landing) return;
    const timer = setTimeout(() => setLanding(false), LANDING_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [landing]);
  const advance = pending?.advance;
  const hopAt = timeline?.hopAt ?? null;
  const token: MapTokenPlan = useMemo(() => {
    if (advance && running && hopAt !== null)
      return { n: advance.to, hop: { from: advance.from, delayMs: hopAt } };
    const n = advance ? advance.from : current;
    return { n, land: landing ? { delayMs: MAP_MOTION.tokenLandDelayMs } : null };
  }, [advance, running, hopAt, current, landing]);

  // Stable handlers, so choosing a stage redraws only the chapters it touches (the blocks are memoised).
  const handlers = useRef({ onNode: (_info: NodeInfo) => {}, onGate: (_chapter: number) => {} });
  const onNodeStable = useCallback((info: NodeInfo) => handlers.current.onNode(info), []);
  const onGateStable = useCallback((chapter: number) => handlers.current.onGate(chapter), []);

  const toast = (message: string) => useToast.getState().show({ variant: 'info', message });

  const onNode = (info: NodeInfo) => {
    setSelected({ kind: 'level', n: info.n });
    keepInSight.current = { kind: 'level', n: info.n };
    reveal();
    if (info.state !== 'locked') {
      cue('toggle');
      return;
    }
    cue('cellDenied');
    setShake((s) => ({ n: info.n, key: (s?.key ?? 0) + 1 }));
    const chapter = chapterOf(info.n);
    if (chapter > 1 && !chapterOpen(chapter, records, openedChapters)) {
      const gate = gateOf(chapter);
      toast(t('map.gateToast', { chapter, count: gate.need, need: gate.need, prev: chapter - 1 }));
    } else toast(t('map.lockedToast', { n: current }));
  };

  const onGate = (chapter: number) => {
    setSelected({ kind: 'gate', chapter });
    keepInSight.current = { kind: 'gate', chapter };
    reveal();
    cue('toggle');
    if (!gateOf(chapter).open) setGateSheet(chapter);
  };

  useLayoutEffect(() => {
    handlers.current = { onNode, onGate };
  });

  const onJump = (chapter: number) => {
    setJumpOpen(false);
    keepInSight.current = null;
    const index = indexOfChapter(layout, chapter);
    if (index >= 0) list.current?.scrollToIndex({ index, animated: !reduce });
  };

  const sheetGone = () => {
    const id = pendingPlay.current;
    pendingPlay.current = null;
    if (id) onPlay(id);
  };

  const total = totalStars(records);
  const panel = panelSelection(selected, levelsById, nodeOf, gateOf, records, openedChapters);
  const chapters: ChapterRow[] = useMemo(
    () =>
      Array.from({ length: LEVEL_RULES.chapterCount }, (_, i) => ({
        chapter: i + 1,
        ...chapterTotal(i + 1, records),
        open: chapterOpen(i + 1, records, openedChapters),
      })),
    [records, openedChapters],
  );
  const celebrated = celebrate !== null ? chapterBot(levels, celebrate) : null;
  // The locked stage right after the current one, in its chapter (its dashed ring): none with every stage open.
  const nextInfo = current < maxLevel() ? nodeOf(current + 1) : null;
  const next =
    !unlockAll && nextInfo?.state === 'locked' && chapterOf(current + 1) === chapterOf(current)
      ? current + 1
      : null;
  const stopStep = () => {
    if (running) finishStep();
  };
  // A drag: the player moves the map now (the step finishes, and what was chosen is no longer held in sight).
  const onDrag = () => {
    keepInSight.current = null;
    stopStep();
  };

  return (
    <View style={[styles.screen, { paddingTop: top }]} onTouchStart={stopStep} testID="level-map">
      <ScreenHeader
        title={t('title')}
        onBack={onBack}
        // Beside the stars chip, a long title takes two lines and a smaller size, never "…" (B7).
        wrapTitle
        style={styles.header}
        end={
          <TactileSurface
            kind="slate"
            accessibilityRole="button"
            accessibilityLabel={t('map.totalLabel', {
              count: total.stars,
              stars: total.stars,
              max: total.max,
            })}
            onPress={() => setJumpOpen(true)}
            style={styles.totalButton}
            faceStyle={styles.total}
            testID="level-map-total"
          >
            {() => (
              <>
                <Star filled size={STAR_SIZES.chip + 3} />
                <Text style={styles.totalText}>{ltr(t('map.total', total))}</Text>
              </>
            )}
          </TactileSurface>
        }
      />
      <View style={styles.map}>
        <LevelPath
          geometry={layout}
          levelsById={levelsById}
          nodeOf={nodeOf}
          gateOf={gateOf}
          chapterStarsOf={chapterStarsOf}
          selected={selected}
          shake={shake}
          unlocking={celebrate}
          current={current}
          next={next}
          token={token}
          avatarId={avatarId}
          step={step}
          initialIndex={initialIndex}
          onNode={onNodeStable}
          onGate={onGateStable}
          onViewport={onViewport}
          onContentReady={onContentReady}
          onScrollBeginDrag={onDrag}
          onScrollOffset={(offset) => {
            scrollAt.current = offset;
          }}
          listRef={list}
        />
      </View>
      {panel ? (
        <LevelPanel
          selection={panel}
          current={current}
          onPlay={(n) => onPlay(levelIdOf(n))}
          bottomInset={bottom}
        />
      ) : null}
      <GateSheet
        visible={gateSheet !== null}
        chapter={gateSheet}
        gate={gateSheet !== null ? gateOf(gateSheet) : null}
        records={records}
        levelsById={levelsById}
        onClose={() => setGateSheet(null)}
        onPick={(id) => {
          pendingPlay.current = id;
          setGateSheet(null);
        }}
        onExited={sheetGone}
      />
      <ChapterJumpSheet
        visible={jumpOpen}
        chapters={chapters}
        onClose={() => setJumpOpen(false)}
        onJump={onJump}
      />
      {celebrate !== null ? (
        <ChapterUnlockedView
          chapter={celebrate}
          bot={celebrated}
          xp={DEFAULT_PROGRESS_RULES.xp.levelGate}
          onDone={() => onCelebrated?.(celebrate)}
        />
      ) : null}
    </View>
  );
}

/** The bot of a chapter: the first of its stages against one (Pip in chapter 2, Biscuit from 5…). */
function chapterBot(levels: readonly AppLevel[], chapter: number): BotLevelId | null {
  const level = levels.find((l) => l.chapter === chapter && l.bot);
  return (level?.bot?.level as BotLevelId | undefined) ?? null;
}

/** What the panel shows for the choice on the map. */
function panelSelection(
  selected: MapSelection,
  levelsById: ReadonlyMap<string, AppLevel>,
  nodeOf: (n: number) => NodeInfo,
  gateOf: (c: number) => GateState,
  records: MapRecords,
  openedChapters: readonly number[],
): PanelSelection | null {
  if (selected.kind === 'gate')
    return { kind: 'gate', chapter: selected.chapter, gate: gateOf(selected.chapter) };
  const id = levelIdOf(selected.n);
  const level = levelsById.get(id);
  if (!level) return null;
  const info = nodeOf(selected.n);
  const chapter = chapterOf(selected.n);
  const lockedBy: Extract<PanelSelection, { kind: 'level' }>['lockedBy'] =
    info.state !== 'locked'
      ? undefined
      : chapter > 1 && !chapterOpen(chapter, records, openedChapters)
        ? { kind: 'gate', gate: gateOf(chapter) }
        : { kind: 'previous', n: selected.n - 1 };
  // [D73] "השיא שלי" starts over on a rebuilt level (a new rev, maybe a new kind): the old rev's best is hidden.
  const record = records[id];
  const bestMetric = bestMetricAt({ metric: record?.metric ?? null, rev: record?.rev ?? null }, level.rev);
  return { kind: 'level', level, info, bestMetric, lockedBy };
}

const TOTAL_CHIP = 36;
/** My token's landing plays only in the map's first moments (not when a scroll brings its chapter back). */
const LANDING_WINDOW_MS = 1500;

const styles = StyleSheet.create({
  // No ground of its own: the wandering digits behind the app (D126) show through.
  screen: { flex: 1 },
  header: { paddingHorizontal: tokens.layout.gutterGame },
  totalButton: { minHeight: size.touch, justifyContent: 'center' },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    height: TOTAL_CHIP,
    paddingHorizontal: space[6],
    borderRadius: radius.button,
  },
  totalText: { ...text('scoreSm'), color: color.text },
  map: { flex: 1 },
});
