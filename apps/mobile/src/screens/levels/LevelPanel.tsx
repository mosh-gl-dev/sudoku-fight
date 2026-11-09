import { type AppLevel, botLevel, type BotLevelId, type GateState, type Stars } from '@sudoku-fight/engine';
import { type ReactNode, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { normalizeAvatarId } from '../../avatars';
import { Icon, type IconName } from '../../components/Icon';
import { BossBadge } from '../../components/levels/BossBadge';
import { LevelCoin } from '../../components/levels/LevelCoin';
import { MiniBar } from '../../components/levels/MiniBar';
import { Star, StarRow, STAR_SIZES } from '../../components/levels/StarRow';
import { Avatar, SeatGlyph } from '../../components/player';
import { ltr, withAlpha } from '../../components/player/format';
import { Button } from '../../components/ui';
import { curve } from '../../components/ui/motion';
import { tintLayer, verticalGradient } from '../../components/ui/tactile';
import { Text } from '../../components/ui/Text';
import { MAP_MOTION } from '../../config/levels';
import { color, radius, size, space, text, tokens } from '../../theme';
import { reduceMotionFlag, useReduceMotion } from '../../theme/motion';
import { KIND_ICON } from './LevelNode';
import {
  bestText,
  botNameOf,
  chapterName,
  goalText,
  kindName,
  type LevelsT,
  scaleRows,
  spotsOf,
  starsOf3,
} from './levelWording';
import { coinLook, type NodeInfo, toneOf } from './mapModel';

/**
 * The docked bottom panel of the map (components.md §19.4, D60; the Main board), in place of an opening sheet
 * (sheets over the map were part of the black screen): what is chosen on the map. For a stage: "שלב 37 · …",
 * its chapter (or its bot), the goal in one sentence, the star scale, the bot (avatar with ▲, name and level)
 * when it has one, my best ("★★ · שיא 7.6 ש׳") or "השלב הבא", and the gold button: "המשך · שלב 37" for the
 * current stage, "שחק" for another open one. For a locked stage or a gate: why, and the button goes on with
 * the current stage. Changes are said politely to a screen reader.
 *
 * The board-game road of 31.10.2026: a raised tray (a soft gradient, a lit top edge), the chosen stage's own coin
 * at its head (LevelCoin, as on the map) with its kind on a small badge, and the star scale as three raised cards,
 * the ones I already reached in gold. When the choice changes, the content fades in rising a little
 * (`level.map.panel`; Reduced Motion: at once).
 */

export type PanelSelection =
  | {
      kind: 'level';
      level: AppLevel;
      info: NodeInfo;
      /** My stored best measure (LEVEL_METRIC), or null. */
      bestMetric: number | null;
      /** Why it is locked, when it is: the stage before, or the gate in front of its chapter. */
      lockedBy?: { kind: 'previous'; n: number } | { kind: 'gate'; gate: GateState };
    }
  | { kind: 'gate'; chapter: number; gate: GateState };

export interface LevelPanelProps {
  selection: PanelSelection;
  /** The stage to go on with (the button of a locked stage or a gate). */
  current: number;
  onPlay: (n: number) => void;
  bottomInset: number;
}

/** The icon circle's tones (the Main board): neutral, the bot's, gold. */
type Tone = 'neutral' | 'bot' | 'gold';

export function LevelPanel({ selection, current, onPlay, bottomInset }: LevelPanelProps) {
  const { t } = useTranslation('levels');
  const swapKey = selection.kind === 'gate' ? `g${selection.chapter}` : `l${selection.info.n}`;
  return (
    <View
      style={[styles.panel, { paddingBottom: space[8] + bottomInset }]}
      accessibilityLabel={t('panel.label')}
      accessibilityLiveRegion="polite"
      testID="level-panel"
    >
      <Swap swapKey={swapKey}>
        {selection.kind === 'gate' ? (
          <GateBody selection={selection} t={t} />
        ) : (
          <LevelBody selection={selection} t={t} />
        )}
      </Swap>
      <Cta selection={selection} current={current} onPlay={onPlay} t={t} />
    </View>
  );
}

/** The panel's content when the choice changes: a fade in, rising a little (none under Reduced Motion). */
function Swap({ swapKey, children }: { swapKey: string; children: ReactNode }) {
  const reduce = useReduceMotion();
  const shown = useSharedValue(1);
  const first = useRef(swapKey);
  // Before the new content is painted (a layout effect, not a passive one): it never shows at full opacity for a
  // frame, then vanishes, then fades in.
  useLayoutEffect(() => {
    if (first.current === swapKey || reduce) return;
    first.current = swapKey;
    shown.set(0);
    shown.set(
      withTiming(1, {
        duration: MAP_MOTION.panelSwapMs,
        easing: curve('standard'),
        reduceMotion: reduceMotionFlag(false),
      }),
    );
  }, [swapKey, reduce, shown]);
  const rise = MAP_MOTION.panelRiseDp;
  const style = useAnimatedStyle(() => ({
    opacity: shown.get(),
    transform: [{ translateY: (1 - shown.get()) * rise }],
  }));
  return (
    <Animated.View style={[styles.swap, style]} testID="level-panel-content">
      {children}
    </Animated.View>
  );
}

function Cta({
  selection,
  current,
  onPlay,
  t,
}: Pick<LevelPanelProps, 'selection' | 'current' | 'onPlay'> & { t: LevelsT }) {
  const own = selection.kind === 'level' && selection.info.state !== 'locked' ? selection.info.n : null;
  const n = own ?? current;
  const label = own !== null && own !== current ? t('panel.play') : t('panel.continue', { n });
  return (
    <Button
      label={label}
      size="md"
      onPress={() => onPlay(n)}
      accessibilityHint={own !== null && own !== current ? t('stage', { n }) : undefined}
      style={styles.cta}
      testID="level-panel-play"
    />
  );
}

const toneTint = (tone: Tone) =>
  tone === 'bot' ? color.players[1]!.ring : tone === 'gold' ? color.accent : color.textMuted;
const toneGround = (tone: Tone) =>
  tone === 'bot' ? BOT_GROUND : tone === 'gold' ? color.accentSubtle : color.iconBg.info;

/** The head's lead for a stage: its coin as on the map, and its kind (or the boss's crown) on a small badge. */
function CoinLead({
  info,
  chapter,
  icon,
  tone,
}: {
  info: NodeInfo;
  chapter: number;
  icon: IconName;
  tone: Tone;
}) {
  return (
    <View style={styles.lead} testID="level-panel-coin">
      <LevelCoin
        n={info.n}
        variant="panel"
        look={coinLook(info)}
        tone={toneOf(chapter)}
        testID="level-panel-coin-tile"
      />
      <View style={[styles.kindBadge, { backgroundColor: toneGround(tone) }]} testID="level-panel-kind">
        <Icon name={icon} size={KIND_ICON_SIZE} color={toneTint(tone)} />
      </View>
    </View>
  );
}

/** The head's lead for a gate: a raised slate tile with its lock, shut or open. */
function GateLead({ open }: { open: boolean }) {
  return (
    <View style={styles.gateLead} testID="level-panel-gate-tile">
      <View style={styles.gateLeadEdge} />
      <View style={styles.gateLeadFace}>
        <Icon name={open ? 'unlock' : 'lock'} size={size.icon.header} color={color.textMuted} />
      </View>
    </View>
  );
}

function Head({ lead, title, sub, end }: { lead: ReactNode; title: string; sub: string; end?: ReactNode }) {
  return (
    <View style={styles.head}>
      {lead}
      {/* Two lines each, broken between words, at a large text size (QA loop 7, 360 dp at font 1.3: "שלב 10 · מרוץ מו…"). */}
      <View style={styles.titles}>
        <Text style={styles.title} numberOfLines={2} testID="level-panel-title">
          {title}
        </Text>
        <Text style={styles.sub} numberOfLines={2} testID="level-panel-sub">
          {sub}
        </Text>
      </View>
      {end}
    </View>
  );
}

function LevelBody({ selection, t }: { selection: Extract<PanelSelection, { kind: 'level' }>; t: LevelsT }) {
  const { level, info, bestMetric, lockedBy } = selection;
  const bot = botNameOf(level);
  if (info.state === 'locked') {
    let reason: string;
    if (lockedBy?.kind === 'gate')
      reason = t('panel.lockedGate', {
        chapter: level.chapter,
        prev: level.chapter - 1,
        count: lockedBy.gate.need,
        need: lockedBy.gate.need,
        stars: lockedBy.gate.stars,
      });
    else reason = t('panel.lockedPrev', { n: lockedBy?.kind === 'previous' ? lockedBy.n : info.n - 1 });
    return (
      <>
        <Head
          lead={<CoinLead info={info} chapter={level.chapter} icon="lock" tone="neutral" />}
          title={t('panel.lockedTitle', { n: info.n })}
          sub={t('panel.lockedSub', { chapter: level.chapter, kind: kindName(level, t) })}
        />
        <View style={styles.goalRow}>
          <Icon name="lock" size={space[7]} color={color.textMuted} />
          <Text style={[styles.goal, styles.strong]} testID="level-panel-goal">
            {reason}
          </Text>
        </View>
        <ScaleCells level={level} t={t} variant="cards" />
      </>
    );
  }
  const sub = level.boss
    ? t('panel.subBoss', { chapter: level.chapter, bot: bot ?? t('boss.name') })
    : bot
      ? t('panel.subBot', { chapter: level.chapter, bot })
      : t('panel.sub', { chapter: level.chapter, name: chapterName(level.chapter, t) });
  const played = info.state === 'played' || (info.state === 'current' && info.stars > 0);
  const end =
    info.state === 'current' && !played ? (
      <View style={styles.nextChip} testID="level-panel-next">
        <Text style={styles.nextText}>{t('panel.next')}</Text>
      </View>
    ) : played ? (
      <Best level={level} stars={info.stars} metric={bestMetric} t={t} />
    ) : undefined;
  return (
    <>
      <Head
        lead={
          <CoinLead
            info={info}
            chapter={level.chapter}
            icon={level.boss ? 'crown' : KIND_ICON[level.kind]}
            tone={level.boss ? 'gold' : bot ? 'bot' : 'neutral'}
          />
        }
        title={t('panel.title', { n: info.n, kind: kindName(level, t) })}
        sub={sub}
        end={end}
      />
      {level.boss ? <BossBadge /> : null}
      <Text style={styles.goal} testID="level-panel-goal">
        {goalText(level, t)}
      </Text>
      <ScaleCells level={level} t={t} variant="cards" achieved={played ? info.stars : 0} />
      {level.bot ? <BotLine level={level} /> : null}
    </>
  );
}

/** My best: the stars and the measure ("★★ · שיא 7.6 ש׳"). */
function Best({
  level,
  stars,
  metric,
  t,
}: {
  level: AppLevel;
  stars: Stars;
  metric: number | null;
  t: LevelsT;
}) {
  const words = metric === null ? null : bestText(level, metric, t);
  return (
    <View
      style={styles.best}
      accessible
      accessibilityLabel={
        words
          ? t('panel.bestLabel', { stars: starsOf3(stars, t), metric: words })
          : t('panel.bestStars', { stars: starsOf3(stars, t) })
      }
      testID="level-panel-best"
    >
      <StarRow stars={stars} size={STAR_SIZES.panel} label={null} testID="level-panel-best-stars" />
      {words ? (
        <Text style={styles.bestText} numberOfLines={1}>
          {t('panel.best', { metric: words })}
        </Text>
      ) : null}
    </View>
  );
}

/** The bot of a stage against one: its avatar with ▲, its name and level ("Pip · רמה 1 · טירון"). */
function BotLine({ level }: { level: AppLevel }) {
  const { t } = useTranslation('levels');
  const { t: th } = useTranslation('home');
  if (!level.bot) return null;
  const bot = botLevel(level.bot.level as BotLevelId);
  const line = t('panel.bot', {
    name: bot.name,
    level: bot.level,
    title: th(`botSelect.levels.${bot.level}.title`),
  });
  return (
    <View style={styles.botLine} accessible accessibilityLabel={line} testID="level-panel-bot">
      <Avatar avatarId={normalizeAvatarId(bot.avatar)} size="cell" colorIndex={1} bot />
      <SeatGlyph colorIndex={1} size={space[6]} />
      <Text style={styles.botText} numberOfLines={1}>
        {line}
      </Text>
    </View>
  );
}

/**
 * The star scale in three cells, ★★★ first (the Main board's "כמה כוכבים אפשר לקבל"): "עד 5 ש׳", "4–5
 * מקומות", "פער 15 ומעלה". "מוכן?" and a boss's opening show the same, as one divided strip; the map's panel as
 * three raised cards (`variant="cards"`), the ones up to my best stars (`achieved`) in gold.
 */
export function ScaleCells({
  level,
  t,
  variant = 'strip',
  achieved = 0,
  testID = 'level-scale',
}: {
  level: AppLevel;
  t: LevelsT;
  variant?: 'strip' | 'cards';
  /** My best stars: the cards up to them are reached (gold). */
  achieved?: number;
  testID?: string;
}) {
  const rows = scaleRows(level.stars, t, spotsOf(level));
  const cards = variant === 'cards';
  return (
    <View
      style={cards ? styles.cards : styles.scale}
      accessibilityRole="list"
      accessibilityLabel={t('scale.label')}
      testID={testID}
    >
      {rows.map((r, i) => (
        <View
          key={r.stars}
          style={
            cards
              ? [styles.card, r.stars <= achieved && styles.cardReached]
              : [styles.cell, i > 0 && styles.cellDivided]
          }
          accessible
          accessibilityLabel={r.label}
          testID={`${testID}-${r.stars}`}
        >
          <View style={styles.cellStars}>
            {Array.from({ length: r.stars }, (_, k) => (
              <Star key={k} filled size={STAR_SIZES.chip} />
            ))}
          </View>
          <Text style={styles.cellText} numberOfLines={1}>
            {r.text}
          </Text>
        </View>
      ))}
    </View>
  );
}

function GateBody({ selection, t }: { selection: Extract<PanelSelection, { kind: 'gate' }>; t: LevelsT }) {
  const { chapter, gate } = selection;
  const first = (chapter - 1) * 10 + 1;
  const values = { n: chapter, prev: chapter - 1, stars: gate.stars, need: gate.need };
  const have = Math.min(gate.need, gate.stars);
  return (
    <>
      <Head
        lead={<GateLead open={gate.open} />}
        title={t(gate.open ? 'panel.gateTitleOpen' : 'panel.gateTitleClosed', { n: chapter })}
        sub={t('panel.gateSub', { name: chapterName(chapter, t), range: ltr(`${first}–${first + 9}`) })}
      />
      <View style={styles.goalRow}>
        {gate.open ? null : <Icon name="lock" size={space[7]} color={color.textMuted} />}
        <Text style={[styles.goal, !gate.open && styles.strong]} testID="level-panel-goal">
          {gate.open
            ? t('panel.gateOpenBody', { ...values, count: gate.stars })
            : t('gateSheet.missing', {
                ...values,
                count: gate.need,
                missing: Math.max(0, gate.need - gate.stars),
              })}
        </Text>
      </View>
      <View
        style={styles.gateBar}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t('panel.gateBar', { stars: have, need: gate.need })}
      >
        <View style={styles.flex}>
          <MiniBar share={have / gate.need} height={GATE_BAR} />
        </View>
        <Star filled size={STAR_SIZES.panel} />
        <Text style={styles.gateCount}>{ltr(t('gate.count', { stars: have, need: gate.need }))}</Text>
      </View>
    </>
  );
}

/** The head's lead: the panel's coin (48, its edge 4) or the gate's tile. */
const LEAD = size.levelCoinPanel;
const LEAD_EDGE = 4;
const KIND_BADGE = 20;
const KIND_ICON_SIZE = 12;
/** The bot's tone: its P2 ring at 16 %, as the icon backgrounds of the theme. */
const BOT_GROUND = withAlpha(color.players[1]!.ring, 0.16);
const NEXT_CHIP = 22;
const SCALE_HEIGHT = 44;
const CARD_HEIGHT = 48;
const GATE_BAR = 6;
const T = color.tactile;

const styles = StyleSheet.create({
  panel: {
    gap: space[4],
    paddingTop: space[7],
    paddingHorizontal: tokens.layout.gutterGame,
    backgroundColor: color.surface,
    experimental_backgroundImage: verticalGradient([color.surface2, color.surface]),
    borderTopWidth: tokens.border.hairline,
    borderColor: color.border,
    borderTopColor: T.borderLit,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    boxShadow: [{ offsetX: 0, offsetY: 1, blurRadius: 0, color: T.cardLip, inset: true }],
  },
  swap: { gap: space[4] },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[6], minHeight: LEAD + LEAD_EDGE },
  lead: { width: LEAD, height: LEAD + LEAD_EDGE },
  kindBadge: {
    position: 'absolute',
    bottom: -space[2],
    end: -space[2],
    width: KIND_BADGE,
    height: KIND_BADGE,
    borderRadius: KIND_BADGE / 2,
    borderWidth: tokens.border.hairline,
    borderColor: color.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gateLead: { width: LEAD, height: LEAD + LEAD_EDGE },
  gateLeadEdge: {
    position: 'absolute',
    top: LEAD_EDGE,
    width: LEAD,
    height: LEAD,
    borderRadius: radius.xl,
    backgroundColor: T.slateEdge,
  },
  gateLeadFace: {
    width: LEAD,
    height: LEAD,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface2,
    experimental_backgroundImage: verticalGradient(T.slateFace),
    borderWidth: tokens.border.hairline,
    borderColor: color.border,
    borderTopColor: T.borderLit,
  },
  titles: { flex: 1, minWidth: 0, alignItems: 'flex-start', gap: space[1] },
  title: { ...text('playerName'), color: color.text },
  sub: { ...text('caption'), color: color.textMuted },
  nextChip: {
    height: NEXT_CHIP,
    paddingHorizontal: space[4],
    borderRadius: radius.pill,
    borderWidth: tokens.border.hairline,
    borderColor: color.accent,
    backgroundColor: color.accentSubtle,
    justifyContent: 'center',
  },
  nextText: { ...text('badge'), color: color.accent },
  best: { alignItems: 'flex-end', gap: space[3] },
  bestText: { ...text('micro'), color: color.textMuted },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  goal: { ...text('body'), color: color.textMuted, flexShrink: 1 },
  strong: { color: color.text },
  scale: {
    flexDirection: 'row',
    height: SCALE_HEIGHT,
    borderRadius: radius.md,
    borderWidth: tokens.border.hairline,
    borderColor: color.border,
    backgroundColor: color.surface2,
    overflow: 'hidden',
  },
  cell: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: space[2] },
  cellDivided: { borderStartWidth: tokens.border.hairline, borderColor: color.border },
  cards: { flexDirection: 'row', gap: space[4], paddingBottom: space[1] },
  card: {
    flex: 1,
    minWidth: 0,
    minHeight: CARD_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    paddingHorizontal: space[2],
    borderRadius: radius.lg,
    borderWidth: tokens.border.hairline,
    borderColor: color.border,
    borderTopColor: T.borderLit,
    backgroundColor: color.surface2,
    experimental_backgroundImage: verticalGradient(T.slateFace),
    boxShadow: [{ offsetX: 0, offsetY: 2, blurRadius: 0, color: T.cardBase }],
  },
  cardReached: {
    borderColor: color.accent,
    borderTopColor: color.accent,
    experimental_backgroundImage: tintLayer(color.accentSubtle),
  },
  cellStars: { flexDirection: 'row', gap: space[1] },
  cellText: { ...text('label'), color: color.text },
  botLine: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  botText: { ...text('caption'), color: color.textMuted, flexShrink: 1 },
  gateBar: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: size.touch },
  flex: { flex: 1 },
  gateCount: { ...text('scoreDelta'), color: color.text },
  cta: { marginTop: space[2] },
});
