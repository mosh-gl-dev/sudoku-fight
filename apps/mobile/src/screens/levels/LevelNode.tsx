import { type AppLevel, botLevel, type BotLevelId, chapterOf, type Stars } from '@sudoku-fight/engine';
import { memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { normalizeAvatarId } from '../../avatars';
import { useScreenFocused } from '../../avatars/useScreenFocused';
import { shake } from '../../components/board/animation';
import { Icon, type IconName } from '../../components/Icon';
import { COIN, LevelCoin } from '../../components/levels/LevelCoin';
import { StarCrown } from '../../components/levels/StarCrown';
import { StarRow } from '../../components/levels/StarRow';
import { Avatar } from '../../components/player';
import { pressScale, useTactilePress } from '../../components/ui/tactile';
import { LEVEL_UI } from '../../config/levels';
import { color, space, tokens } from '../../theme';
import { motion, useReduceMotion } from '../../theme/motion';
import { kindLabel, type LevelsT, starsOf3 } from './levelWording';
import { useAppActive, useBeacon } from './mapMotion';
import { coinLook, MAP, type NodeInfo, toneOf } from './mapModel';

/**
 * A stage on the map (components.md §19.2; the board-game road of 31.10.2026): one button, a coin with depth
 * (LevelCoin) and its crown of three stars over the coin's top edge (StarCrown). Played: the stars it got in gold,
 * a gold edge, all gold at ★★★. Current: the gold ring and its beacon (`level.node.current`, in beats with rests,
 * never under Reduced Motion), and my token beside it (the chapter draws it). The next stage after it: a dashed
 * ring. Locked: in its chapter's tone, a lock badge, no stars; a tap shakes it once (`level.node.locked`; Reduced
 * Motion: the lock badge's border lights up instead) and the map says why. A press sinks the coin onto its edge
 * (`level.node.press`, the tactile press of D125). A boss is the 92 fortress with a crown, the arena's gold corners
 * (never the current stage's ring unless it is the current one), its bot's avatar from chapter 1, and its stars on
 * a pedestal under it. No kind icon (D60), unless LEVEL_UI.nodeKindIcon is turned on.
 *
 * Its label says it all: "שלב 5, מיקום מדויק, שני כוכבים מתוך שלושה", "שלב 12, נעול".
 */

export interface LevelNodeProps {
  info: NodeInfo;
  /** The stage's data (its kind, its bot); missing while the data is not there (the label then has no kind). */
  level: AppLevel | undefined;
  selected: boolean;
  /** Bumped by the map on each tap on this locked node: the shake (or the flash) plays again. */
  shakeKey: number;
  /** The locked stage right after the current one (a dashed ring). */
  next?: boolean;
  /** The old 1.0.2 pin on the current coin (LEVEL_UI.mapToken off). */
  pin?: boolean;
  /** The stars to draw, when the map shows an earlier picture than the true one (back from a stage). */
  shownStars?: Stars;
  /** Pop the new stars (back from a stage). */
  reveal?: { from: number; delayMs: number } | null;
  onPress: (info: NodeInfo) => void;
}

/** The kinds' icons (the panel's, and a node's when LEVEL_UI.nodeKindIcon is on). */
export const KIND_ICON: Record<AppLevel['kind'], IconName> = {
  find: 'target',
  findDuel: 'bot',
  fillBox: 'gridBox',
  duel: 'swords',
  spotError: 'search',
  pointHunter: 'leaderboard',
  chain: 'links',
  // 1.0.3 (levels-ui.md §5): the row and the column lit in a 3 × 3 grid, and the puzzle's swapped boxes (Icon.tsx).
  fillRow: 'gridRow',
  fillCol: 'gridCol',
  puzzle: 'puzzle',
};

/**
 * The label of a node (pure; the map's tests read it). The current node says "השלב הבא" only while it has no
 * stars: once won it says its stars like any played node, as its coin and the panel show them (QA loop 10: after
 * the boss L010 won with ★★★ and chapter 2 still closed, L010 stays the current node and said "השלב הבא").
 */
export function nodeLabel(info: NodeInfo, level: AppLevel | undefined, t: LevelsT): string {
  if (info.state === 'locked') return t('node.locked', { n: info.n });
  const plain = level ? kindLabel(level, t) : '';
  const kind = info.boss ? t('boss.label', { kind: plain }) : plain;
  if (info.state === 'current' && info.stars === 0) return t('node.current', { n: info.n, kind });
  if (info.state === 'open') return t('node.open', { n: info.n, kind });
  return t('node.played', { n: info.n, kind, stars: starsOf3(info.stars, t) });
}

/** The rings around face and edge: "you are here" (gold), chosen (light), next (dashed); 4 out, 2 wide. */
const RING = { out: 4, width: 2 } as const;
/** The beacon's band: 10 out, 6 wide. */
const BAND = { out: 10, width: 6 } as const;
/** Reduced Motion: the locked badge's border lights for this long instead of the shake. */
const FLASH_MS = motion.duration.wrongShake;

/** The node's button box: the coin, what is over it (crown, or the boss's badge) and under it (edge, pedestal). */
export const nodeFrame = (boss: boolean) => {
  const c = boss ? COIN.boss : COIN.node;
  const above = boss ? MAP.bossAbove : MAP.crown;
  const below = boss ? MAP.bossBelow : MAP.edge;
  return {
    width: c.side,
    height: above + c.side + below,
    above,
    side: c.side,
    edge: c.edge,
    radius: c.radius,
  };
};

function LevelNodeBase({
  info,
  level,
  selected,
  shakeKey,
  next = false,
  pin = false,
  shownStars,
  reveal = null,
  onPress,
}: LevelNodeProps) {
  const { t } = useTranslation('levels');
  const reduce = useReduceMotion();
  const { n, state, boss } = info;
  const frame = nodeFrame(boss);
  const locked = state === 'locked';
  const stars = shownStars ?? info.stars;
  const look = coinLook({ state, stars });
  const tone = toneOf(chapterOf(n));

  // The locked tap: one shake of this node only, or (Reduced Motion) the badge's flash until FLASH_MS later.
  const x = useSharedValue(0);
  const [flashed, setFlashed] = useState(shakeKey);
  const flash = reduce && shakeKey !== flashed;
  const seen = useRef(shakeKey);
  useEffect(() => {
    if (shakeKey === seen.current) return;
    seen.current = shakeKey;
    if (reduce) {
      const timer = setTimeout(() => setFlashed(shakeKey), FLASH_MS);
      return () => clearTimeout(timer);
    }
    x.set(0);
    x.set(shake());
  }, [shakeKey, reduce, x]);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  // The press: the face onto its edge, the whole node to 0.98 (none under Reduced Motion).
  const { progress, pressIn, pressOut } = useTactilePress(reduce);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: pressScale(progress.get(), reduce) }] }));

  const bot = boss && level?.bot ? botLevel(level.bot.level as BotLevelId) : null;
  const kindIcon = LEVEL_UI.nodeKindIcon && level && !locked ? KIND_ICON[level.kind] : null;
  const ringBox = {
    top: frame.above - RING.out,
    start: -RING.out,
    width: frame.side + 2 * RING.out,
    height: frame.side + frame.edge + 2 * RING.out,
    borderRadius: frame.radius + RING.out,
    borderWidth: RING.width,
  };

  return (
    <Animated.View style={shakeStyle} testID={`node-${n}-shake`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={nodeLabel(info, level, t)}
        accessibilityState={{ selected }}
        onPress={() => onPress(info)}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={{ width: frame.width, height: frame.height }}
        testID={`node-${n}`}
      >
        <Animated.View style={[styles.fill, pressStyle]}>
          {state === 'current' ? (
            <CurrentRing frame={frame} ringBox={ringBox} reduce={reduce} testID={`node-${n}-ring`} />
          ) : selected ? (
            <View style={[styles.ring, ringBox, styles.selectedRing]} testID={`node-${n}-selected`} />
          ) : next ? (
            <View style={[styles.ring, ringBox, styles.nextRing]} testID={`node-${n}-next`} />
          ) : null}
          <View style={[styles.coin, { top: frame.above }]}>
            <LevelCoin
              n={n}
              variant={boss ? 'boss' : 'node'}
              look={look}
              tone={tone}
              press={progress}
              flash={flash}
              pin={pin && state === 'current'}
              bot={
                bot ? (
                  <View testID={`node-${n}-bot`}>
                    <Avatar avatarId={normalizeAvatarId(bot.avatar)} size="compact" colorIndex={1} bot />
                  </View>
                ) : null
              }
              testID={`node-${n}-tile`}
            />
            {kindIcon ? (
              <View style={styles.kind} testID={`node-${n}-kind`}>
                <Icon name={kindIcon} size={KIND_ICON_SIZE} color={color.textMuted} />
              </View>
            ) : null}
          </View>
          {boss ? (
            <View
              style={[
                styles.pedestal,
                { top: frame.above + frame.side - PEDESTAL.overlap },
                locked && styles.hidden,
              ]}
            >
              <StarRow
                stars={locked ? 0 : stars}
                size={PEDESTAL.star}
                label={null}
                gap={space[1]}
                // Only the new stars pop, at the step's moment, as a coin's crown does.
                reveal={reveal}
                testID={`node-${n}-stars`}
              />
            </View>
          ) : locked ? null : (
            <View style={styles.crown}>
              <StarCrown stars={stars} reveal={reveal} testID={`node-${n}-stars`} />
            </View>
          )}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export const LevelNode = memo(LevelNodeBase);

/** The gold ring of "you are here", and its band beating (in bursts with rests; none under Reduced Motion). */
function CurrentRing({
  ringBox,
  frame,
  reduce,
  testID,
}: {
  ringBox: object;
  frame: ReturnType<typeof nodeFrame>;
  reduce: boolean;
  testID: string;
}) {
  const focused = useScreenFocused();
  const active = useAppActive();
  const band = useBeacon(!reduce && focused && active);
  const bandStyle = useAnimatedStyle(() => ({ opacity: band.get() }));
  return (
    <>
      {reduce ? null : (
        <Animated.View
          style={[
            styles.ring,
            {
              top: frame.above - BAND.out,
              start: -BAND.out,
              width: frame.side + 2 * BAND.out,
              height: frame.side + frame.edge + 2 * BAND.out,
              borderRadius: frame.radius + BAND.out,
              borderWidth: BAND.width,
            },
            styles.band,
            bandStyle,
          ]}
          testID={`${testID}-band`}
        />
      )}
      <View style={[styles.ring, ringBox, styles.currentRing]} testID={testID} />
    </>
  );
}

const KIND_ICON_SIZE = 14;
const KIND_BADGE = 20;
/** The boss's stars on a pedestal: a plate 76 × 24 whose top is 8 dp over the face's bottom. */
const PEDESTAL = { width: 76, height: 24, overlap: 8, star: 14 } as const;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  coin: { position: 'absolute', start: 0 },
  crown: { position: 'absolute', top: 0, start: 0, end: 0, alignItems: 'center' },
  ring: { position: 'absolute' },
  currentRing: { borderColor: color.levelMap.beacon.ring },
  selectedRing: { borderColor: color.text },
  nextRing: { borderColor: color.levelMap.next.ring, borderStyle: 'dashed' },
  band: { borderColor: color.levelMap.beacon.band },
  hidden: { opacity: 0 },
  pedestal: {
    position: 'absolute',
    start: (COIN.boss.side - PEDESTAL.width) / 2,
    width: PEDESTAL.width,
    height: PEDESTAL.height,
    borderRadius: PEDESTAL.height / 2,
    borderWidth: tokens.border.hairline,
    borderColor: color.border,
    borderTopColor: color.tactile.borderLit,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kind: {
    position: 'absolute',
    bottom: -space[1],
    end: -space[1],
    width: KIND_BADGE,
    height: KIND_BADGE,
    borderRadius: KIND_BADGE / 2,
    borderWidth: tokens.border.hairline,
    borderColor: color.border,
    backgroundColor: color.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
