import { type AppLevel, chapterOf, type GateState, type Stars } from '@sudoku-fight/engine';
import { memo, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, type LayoutChangeEvent, StyleSheet, View } from 'react-native';

import type { AvatarIdOrNone } from '../../avatars';
import { LEVEL_UI } from '../../config/levels';
import { color } from '../../theme';
import { ChapterGateway, FinishLine } from './ChapterGateway';
import { LevelNode, nodeFrame } from './LevelNode';
import { RoadPieceView, type RoadPour } from './MapRoad';
import { MapScenery } from './MapScenery';
import { chapterScenery } from './sceneryModel';
import { MapToken } from './MapToken';
import {
  type ChapterLayout,
  itemLayoutOf,
  MAP,
  type MapLayout,
  type NodeInfo,
  type Point,
  toneOf,
  tokenSpot,
} from './mapModel';

/**
 * The road (components.md §19.3, §19.14; the board-game road of 31.10.2026): a virtualised list with one item
 * per chapter (300 stages in 30 items, every item the same height), each drawn from the map's layout (mapModel),
 * bottom to top: the chapter's quiet scenery (sceneryModel), the road's pieces (gold up to where I am, slate after),
 * the gateway (the banner "פרק 4 · בלש · ★ 18/30" as an arch's lintel, the gate's sign under it, the barrier of a
 * shut gate; chapter 1's start pad), the current stage's glow, the ten coins, and my token beside the current one.
 * The item heights are known (getItemLayout), so the list opens straight at the current chapter
 * (initialScrollIndex), and the screen then puts the current stage at 40 % of the height. Nothing here paints a
 * ground: the wandering digits behind the app show between the pieces.
 */

/** What is chosen on the map: a stage, or a gate. */
export type MapSelection = { kind: 'level'; n: number } | { kind: 'gate'; chapter: number };

/** Where my token stands, and how it gets there. */
export interface MapTokenPlan {
  n: number;
  /** It hops from this stage's spot (in the same chapter), after `delayMs`. */
  hop?: { from: number; delayMs: number } | null;
  /** It drops onto its spot after `delayMs`. */
  land?: { delayMs: number } | null;
}

/** The map's short sequence back from a stage, as the items draw it (LevelMapScreen plays it). */
export interface MapStepView {
  /** False while it waits for the map to be shown. */
  running: boolean;
  stars?: { n: number; from: Stars; to: Stars; delayMs: number };
  /** The road's segments drawn as not reached yet (until their pour), and their pours once it runs. */
  ahead: ReadonlySet<number>;
  pour: ReadonlyMap<number, RoadPour>;
}

export interface LevelPathProps {
  /** The map's layout (mapModel; not React Native's `layout` prop, a layout animation's). */
  geometry: MapLayout;
  levelsById: ReadonlyMap<string, AppLevel>;
  nodeOf: (n: number) => NodeInfo;
  /** The gate in front of a chapter (2 and up). */
  gateOf: (chapter: number) => GateState;
  chapterStarsOf: (chapter: number) => { stars: number; max: number };
  selected: MapSelection | null;
  /** The locked node tapped last, and a counter that replays its shake. */
  shake: { n: number; key: number } | null;
  /** The chapter whose gate opened and is shown open for the first time. */
  unlocking: number | null;
  /** The current stage (its ring and glow), and the locked one after it (its dashed ring), if any. */
  current: number;
  next: number | null;
  token: MapTokenPlan;
  avatarId: AvatarIdOrNone | null;
  step: MapStepView | null;
  initialIndex: number;
  onNode: (info: NodeInfo) => void;
  onGate: (chapter: number) => void;
  /** The list's own height, once laid out (where 40 % is). */
  onViewport: (height: number) => void;
  /**
   * The list's content laid out (FlatList's onContentSizeChange). FlatList jumps to `initialIndex` right before
   * it calls this, the first time: a scroll made before that is undone (B33).
   */
  onContentReady: () => void;
  /** A drag on the map (it finishes the sequence back from a stage). */
  onScrollBeginDrag?: () => void;
  /** Where the list is scrolled to now (its top's offset), as it scrolls. */
  onScrollOffset?: (offset: number) => void;
  listRef: Ref<FlatList<ChapterLayout>>;
}

/** How often the list reports where it is scrolled (onScrollOffset): a frame. */
const SCROLL_THROTTLE_MS = 16;

/** The chapters a sequence touches (its stars' stage, its road pieces, both ends of the hop). */
function stepChapters(step: MapStepView | null, layout: MapLayout): Set<number> {
  const out = new Set<number>();
  if (!step) return out;
  if (step.stars) out.add(chapterOf(step.stars.n));
  for (const item of layout.chapters) if (item.road.some((p) => step.ahead.has(p.seg))) out.add(item.chapter);
  return out;
}

export function LevelPath({
  geometry: layout,
  levelsById,
  nodeOf,
  gateOf,
  chapterStarsOf,
  selected,
  shake,
  unlocking,
  current,
  next,
  token,
  avatarId,
  step,
  initialIndex,
  onNode,
  onGate,
  onViewport,
  onContentReady,
  onScrollBeginDrag,
  onScrollOffset,
  listRef,
}: LevelPathProps) {
  const { t } = useTranslation('levels');
  const touched = stepChapters(step, layout);
  const tokenChapter = chapterOf(token.n);
  const hopChapter = token.hop ? chapterOf(token.hop.from) : null;
  return (
    <FlatList
      ref={listRef}
      data={layout.chapters}
      keyExtractor={(c) => String(c.chapter)}
      getItemLayout={itemLayoutOf(layout)}
      initialScrollIndex={initialIndex}
      initialNumToRender={2}
      windowSize={5}
      maxToRenderPerBatch={1}
      updateCellsBatchingPeriod={32}
      showsVerticalScrollIndicator={false}
      extraData={[selected, shake, unlocking, nodeOf, gateOf, current, next, token, avatarId, step]}
      onLayout={(e: LayoutChangeEvent) => onViewport(e.nativeEvent.layout.height)}
      onContentSizeChange={onContentReady}
      onScrollBeginDrag={onScrollBeginDrag}
      onScroll={onScrollOffset ? (e) => onScrollOffset(e.nativeEvent.contentOffset.y) : undefined}
      scrollEventThrottle={SCROLL_THROTTLE_MS}
      accessibilityLabel={t('map.label')}
      testID="level-map-list"
      renderItem={({ item }) => {
        const c = item.chapter;
        return (
          <ChapterBlock
            item={item}
            geometry={layout}
            levelsById={levelsById}
            nodeOf={nodeOf}
            gateOf={gateOf}
            chapterStarsOf={chapterStarsOf}
            selectedHere={
              selected?.kind === 'gate'
                ? selected.chapter === c
                  ? 'gate'
                  : null
                : selected && chapterOf(selected.n) === c
                  ? selected.n
                  : null
            }
            shakeHere={shake && chapterOf(shake.n) === c ? shake : null}
            unlocking={unlocking === c}
            currentHere={chapterOf(current) === c ? current : null}
            nextHere={next !== null && chapterOf(next) === c ? next : null}
            tokenHere={tokenChapter === c && (hopChapter === null || hopChapter === c) ? token : null}
            landHere={tokenChapter === c && hopChapter !== null && hopChapter !== c ? token : null}
            avatarId={avatarId}
            stepHere={touched.has(c) ? step : null}
            onNode={onNode}
            onGate={onGate}
          />
        );
      }}
    />
  );
}

interface ChapterBlockProps {
  item: ChapterLayout;
  /** The whole map's layout (mapModel). */
  geometry: MapLayout;
  levelsById: ReadonlyMap<string, AppLevel>;
  nodeOf: (n: number) => NodeInfo;
  gateOf: (chapter: number) => GateState;
  chapterStarsOf: (chapter: number) => { stars: number; max: number };
  /** What is chosen in this chapter: a stage, its gate, or nothing. */
  selectedHere: number | 'gate' | null;
  shakeHere: { n: number; key: number } | null;
  unlocking: boolean;
  currentHere: number | null;
  nextHere: number | null;
  /** My token, when it stands (or hops) in this chapter. */
  tokenHere: MapTokenPlan | null;
  /** My token arriving here from another chapter: it lands instead of hopping. */
  landHere: MapTokenPlan | null;
  avatarId: AvatarIdOrNone | null;
  stepHere: MapStepView | null;
  onNode: (info: NodeInfo) => void;
  onGate: (chapter: number) => void;
}

const ChapterBlock = memo(function ChapterBlock({
  item,
  geometry: layout,
  levelsById,
  nodeOf,
  gateOf,
  chapterStarsOf,
  selectedHere,
  shakeHere,
  unlocking,
  currentHere,
  nextHere,
  tokenHere,
  landHere,
  avatarId,
  stepHere,
  onNode,
  onGate,
}: ChapterBlockProps) {
  const c = item.chapter;
  const tone = toneOf(c);
  const width = layout.width;
  const scenery = LEVEL_UI.mapScenery ? chapterScenery(layout, c) : null;
  const currentNode = currentHere !== null ? item.nodes.find((p) => p.n === currentHere) : undefined;
  const plan = tokenHere ?? landHere;
  const spot = plan ? tokenSpot(item, plan.n) : null;
  const tokenNode = plan ? item.nodes.find((p) => p.n === plan.n) : undefined;
  const hopFrom: Point | null = tokenHere?.hop && spot ? tokenSpot(item, tokenHere.hop.from) : null;
  return (
    <View style={{ height: item.height, width }} testID={`chapter-${c}`}>
      {scenery ? <MapScenery chapter={c} items={scenery} tone={tone} /> : null}
      <View
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        testID={`chapter-${c}-road`}
      >
        {item.road.map((piece) => {
          const held = stepHere?.ahead.has(piece.seg) ?? false;
          return (
            <RoadPieceView
              key={piece.key}
              piece={piece}
              ahead={held && !stepHere?.running}
              pour={held && stepHere?.running ? (stepHere.pour.get(piece.seg) ?? null) : null}
            />
          );
        })}
      </View>
      {item.finish ? <FinishLine rect={item.finish} /> : null}
      <ChapterGateway
        chapter={c}
        gateway={item.gateway}
        tone={tone}
        gate={c > 1 ? gateOf(c) : null}
        stars={chapterStarsOf(c)}
        selected={selectedHere === 'gate'}
        unlocking={unlocking}
        onGate={onGate}
      />
      {currentNode ? (
        <Halo cx={currentNode.cx} cy={currentNode.cy} size={currentNode.size} n={currentNode.n} />
      ) : null}
      {item.nodes.map((p) => {
        const frame = nodeFrame(p.boss);
        const stars = stepHere?.stars?.n === p.n ? stepHere.stars : undefined;
        return (
          <View
            key={p.n}
            style={[styles.abs, { top: p.cy - frame.above - p.size / 2, start: p.cx - p.size / 2 }]}
          >
            <LevelNode
              info={nodeOf(p.n)}
              level={levelsById.get(p.id)}
              selected={selectedHere === p.n}
              shakeKey={shakeHere?.n === p.n ? shakeHere.key : 0}
              next={nextHere === p.n}
              pin={!LEVEL_UI.mapToken}
              shownStars={stars ? (stepHere?.running ? stars.to : stars.from) : undefined}
              reveal={stars && stepHere?.running ? { from: stars.from, delayMs: stars.delayMs } : null}
              onPress={onNode}
            />
          </View>
        );
      })}
      {LEVEL_UI.mapToken && plan && spot && tokenNode ? (
        <MapToken
          key={`${plan.n}-${plan.hop?.from ?? ''}`}
          spot={spot}
          side={Math.sign(spot.x - tokenNode.cx)}
          avatarId={avatarId}
          hop={hopFrom && tokenHere?.hop ? { from: hopFrom, delayMs: tokenHere.hop.delayMs } : null}
          land={landHere?.hop ? { delayMs: landHere.hop.delayMs } : (plan.land ?? null)}
          testID={`node-${plan.n}-tile-pin`}
        />
      ) : null}
    </View>
  );
});

/** The current stage's soft gold glow, under the coins (so it never tints the stage before it). */
function Halo({ cx, cy, size, n }: { cx: number; cy: number; size: number; n: number }) {
  const d = Math.round(size * HALO);
  const b = color.levelMap.beacon;
  return (
    <View
      style={[
        styles.abs,
        {
          start: cx - d / 2,
          top: cy + MAP.edge / 2 - d / 2,
          width: d,
          height: d,
          borderRadius: d / 2,
          experimental_backgroundImage: `radial-gradient(circle, ${b.halo} 0%, ${b.halo} 30%, ${b.haloOut} 70%)`,
        },
      ]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={`node-${n}-halo`}
    />
  );
}

/** The glow's diameter, as a share of its coin. */
const HALO = 2.2;

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
});
