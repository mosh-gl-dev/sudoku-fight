import type { GameType } from '@sudoku-fight/engine';
import { memo, type ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type LayoutChangeEvent, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { type AvatarFace, type AvatarIdOrNone, sameFace } from '../../avatars';
import {
  Avatar,
  type CardModel,
  cardLabel,
  DeltaLabel,
  formatScore,
  Flag,
  ltr,
  MistakesText,
  paletteAt,
  sameCard,
  sameData,
  sameProps,
  sameStyle,
  type ScoreDelta,
  ScoreNumber,
  SeatGlyph,
  signedText,
} from '../../components/player';
import { ClockDigits } from '../../components/clock/ClockDigits';
import { clockLabelSeconds } from '../../components/player/format';
import { AVATAR_SIZES, metrics } from '../../components/player/metrics';
import { type Probe, useProbeWidths, WidthProbes, widthsOf } from '../../components/player/statusFit';
import { Button } from '../../components/ui';
import { Text } from '../../components/ui/Text';
import { decimalSeparator } from '../../i18n/compose';
import { color, size, space, text, tokens } from '../../theme';
import { type Rect, within } from './geometry';
import { formatClock, type SoloStats } from './model';

/**
 * My card in solo practice: Game-Solo's HUD in direction C. There is no opponent, so the card spans the row:
 * at the start the 2-player card's anatomy (components.md §3.2: avatar and name, the big score with its last
 * delta, the mistakes), at the end "סיום אימון" (spec §6.6) and the practice's time and best move. No
 * reactions button: nobody is there to see them. No background, as C's cards.
 */
export interface SoloHudProps {
  /** My card; its score is the one to show now (held back while a chip flies to it). */
  card: CardModel;
  delta: ScoreDelta | null;
  /** My flag (Game-Solo), ISO alpha-2; none when unknown. */
  country?: string | null;
  gameType: GameType;
  stats: SoloStats;
  avatarId?: AvatarIdOrNone | null;
  /** My avatar's face (game/useAvatarFaces): its mood, and the reaction to play. */
  face?: AvatarFace | null;
  onEnd: () => void;
  /** Where the delta slot is, in the HUD's own coordinates: the chips fly there. */
  onTargetLayout?: (slot: Rect) => void;
  onLayout?: (e: LayoutChangeEvent) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const ME = paletteAt(0);
const row = tokens.layout.game.playerCard;
const HUD_GAP = space[6];

export const SoloHud = memo(function SoloHud({
  card,
  delta,
  country = null,
  gameType,
  stats,
  avatarId,
  face = null,
  onEnd,
  onTargetLayout,
  onLayout,
  style,
  testID = 'solo-hud',
}: SoloHudProps) {
  const { t } = useTranslation('game');
  const { t: tp } = useTranslation('player');

  // The delta slot sits in the score row, which sits in my summary: all three rects are needed to place it in the
  // HUD (soloTargetOf). QA solo-score-flight-target (APK 22): without the summary's own place the chips landed at
  // the HUD's other side in Hebrew, on the time and best move, ~350 dp from the score that counts.
  const summary = useRef<Rect | null>(null);
  const scoreRow = useRef<Rect | null>(null);
  const slot = useRef<Rect | null>(null);
  const report = useCallback(() => {
    const target = soloTargetOf(summary.current, scoreRow.current, slot.current);
    if (target) onTargetLayout?.(target);
  }, [onTargetLayout]);
  const onSummary = useCallback(
    (e: LayoutChangeEvent) => {
      summary.current = e.nativeEvent.layout;
      report();
    },
    [report],
  );
  const onScoreRow = useCallback(
    (e: LayoutChangeEvent) => {
      scoreRow.current = e.nativeEvent.layout;
      report();
    },
    [report],
  );
  const onSlot = useCallback(
    (e: LayoutChangeEvent) => {
      slot.current = e.nativeEvent.layout;
      report();
    },
    [report],
  );

  // QA loop 7 (360 dp, font 1.3): "Solo practice · Normal" was cut to "Solo prac…". The identity is one button
  // high (no room for a second line under the name), so where the whole title is wider than its room at full
  // size, the line keeps the game type alone ("Normal"); "Solo practice" is said by "סיום אימון" beside it.
  const fullTitle = t('subtitle', { title: t('title'), type: t(`type.${gameType}`) });
  const titleProbes = useMemo<Probe[]>(
    () => [{ id: 'solo-title', text: fullTitle, style: text('caption') }],
    [fullTitle],
  );
  const [probeWidths, onProbe] = useProbeWidths();
  const [hudWidth, setHudWidth] = useState<number | null>(null);
  const [endWidth, setEndWidth] = useState<number | null>(null);
  const onHud = useCallback(
    (e: LayoutChangeEvent) => {
      setHudWidth(e.nativeEvent.layout.width);
      onLayout?.(e);
    },
    [onLayout],
  );
  const onEndLayout = useCallback((e: LayoutChangeEvent) => setEndWidth(e.nativeEvent.layout.width), []);
  const titleWidth = widthsOf(titleProbes, probeWidths)?.[0] ?? null;
  const shortTitle =
    titleWidth !== null &&
    hudWidth !== null &&
    endWidth !== null &&
    titleWidth > soloTitleRoom(hudWidth, endWidth);

  const decimal = decimalSeparator(t);
  const time = formatClock(stats.elapsedMs);
  const timeLabel = t('hud.timeLabel', {
    time: formatClock(clockLabelSeconds(stats.elapsedMs, 'elapsed') * 1000),
  });
  const best = stats.best;
  const bestLabel = best
    ? t('hud.bestLabel', {
        count: best.points,
        points: ltr(formatScore(best.points, decimal)),
        cell: ltr(best.cell),
      })
    : t('hud.noBestLabel');
  const canEnd = card.mine?.canSurrender ?? false;

  return (
    <View style={[styles.hud, style]} onLayout={onHud} testID={testID}>
      <WidthProbes probes={titleProbes} onWidth={onProbe} />
      {/* Start: who I am and my score, read as one summary (components.md §3.6). */}
      <View
        style={styles.start}
        onLayout={onSummary}
        accessible
        accessibilityRole="text"
        accessibilityLabel={cardLabel(card, tp)}
        testID={`${testID}-summary`}
      >
        <View style={styles.identity}>
          <Avatar
            avatarId={avatarId}
            size="card"
            colorIndex={card.colorIndex}
            expression={face?.expression}
            reaction={face?.reaction}
            testID={`${testID}-avatar`}
          />
          <View style={styles.nameBlock}>
            <View style={styles.nameRow}>
              <SeatGlyph colorIndex={card.colorIndex} size={metrics.glyph.name} />
              <Text style={[text('playerName'), styles.name]} numberOfLines={1}>
                {card.name}
              </Text>
              <Flag country={country} size="game" decorative />
            </View>
            <Text style={[text('caption'), styles.muted]} numberOfLines={1} testID={`${testID}-title`}>
              {shortTitle ? t(`type.${gameType}`) : fullTitle}
            </Text>
          </View>
        </View>
        <View style={styles.scoreRow} onLayout={onScoreRow} testID={`${testID}-score-row`}>
          <ScoreNumber
            score={card.score}
            tint={ME.ring}
            textStyle={text('scoreXL')}
            delta={delta}
            testID={`${testID}-score`}
          />
          <View style={styles.slot} onLayout={onSlot} testID={`${testID}-delta-slot`}>
            <DeltaLabel
              delta={delta}
              tint={ME.ring}
              textStyle={text('scoreDelta')}
              testID={`${testID}-delta`}
            />
          </View>
        </View>
        <View style={styles.statusRow}>
          <MistakesText count={card.mistakes} />
        </View>
      </View>

      {/* End: leave the practice, and how it is going. */}
      <View style={styles.end} onLayout={onEndLayout} testID={`${testID}-end`}>
        <View style={styles.endRow}>
          <Button
            label={t('end.button')}
            icon="surrender"
            variant="secondary"
            size="modal"
            onPress={onEnd}
            disabled={!canEnd}
            testID="end-practice-button"
          />
        </View>
        <View style={styles.statsRow} testID={`${testID}-stats`}>
          {/* Q1: nothing here changes every second for the accessibility layer. The clock is drawn as paths (no
              text whose change is an event), and its label says the time in 5-second steps. */}
          <Stat label={t('hud.time')} accessibilityLabel={timeLabel} testID={`${testID}-time-stat`}>
            <ClockDigits
              value={time}
              textStyle={text('cellRef')}
              color={color.text}
              testID={`${testID}-time`}
            />
          </Stat>
          <View style={styles.divider} />
          <Stat label={t('hud.best')} accessibilityLabel={bestLabel} testID={`${testID}-best-stat`}>
            {best ? (
              <View style={styles.best} testID={`${testID}-best`}>
                <Text style={[text('cellRef'), styles.bestPoints]}>{signedText(best.points, decimal)}</Text>
                <Text style={[text('scoreSm'), styles.value]}>{best.cell}</Text>
              </View>
            ) : (
              <Text style={[text('cellRef'), styles.muted]}>{t('hud.none')}</Text>
            )}
          </Stat>
        </View>
      </View>
    </View>
  );
}, sameSoloHud);

/**
 * The screen re-reads the time 4 times a second and builds my card, my face and the stats again each time: the
 * HUD renders only when what it shows changed, my card (sameCard), my face (sameFace) or the stats as shown (the
 * clock's whole seconds).
 */
function sameSoloHud(a: SoloHudProps, b: SoloHudProps): boolean {
  return sameProps(a, b, { card: sameCard, face: sameFace, stats: sameStats, style: sameStyle });
}

const sameStats = (a: SoloStats, b: SoloStats): boolean =>
  formatClock(a.elapsedMs) === formatClock(b.elapsedMs) &&
  a.filled === b.filled &&
  a.total === b.total &&
  sameData(a.best, b.best);

/**
 * The room of the title line under my name: the HUD's row less the end column, the gap between them, my avatar
 * and the gap beside it (the name block is all that is left of the start column's identity row).
 */
export const soloTitleRoom = (hudWidth: number, endWidth: number): number =>
  hudWidth - HUD_GAP - endWidth - AVATAR_SIZES.card.frame - row.headerGap;

/**
 * Where the chips land, in the HUD's own coordinates (motion.md `points.flight`: the delta slot beside my score):
 * the slot is laid out in the score row, the score row in my summary, the summary in the HUD. Null until all three
 * have come. Each onLayout is relative to its parent only, so each step is needed: my summary is at the HUD's
 * start, which is its right side in Hebrew.
 */
export function soloTargetOf(summary: Rect | null, scoreRow: Rect | null, slot: Rect | null): Rect | null {
  if (!summary || !scoreRow || !slot) return null;
  return within(summary, within(scoreRow, slot));
}

/** One stat, read as one element with its own label. */
function Stat({
  label,
  accessibilityLabel,
  testID,
  children,
}: {
  label: string;
  accessibilityLabel: string;
  testID?: string;
  children: ReactNode;
}) {
  return (
    <View
      style={styles.stat}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      <Text style={[text('micro'), styles.muted]} numberOfLines={1}>
        {label}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  hud: { flexDirection: 'row', justifyContent: 'space-between', gap: HUD_GAP },
  start: { flexShrink: 1, minWidth: 0 },
  identity: {
    height: size.buttonModal,
    flexDirection: 'row',
    alignItems: 'center',
    gap: row.headerGap,
  },
  nameBlock: { flexShrink: 1, minWidth: 0, gap: space[1], alignItems: 'flex-start' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: metrics.card.glyphGap },
  name: { color: color.text, flexShrink: 1 },
  muted: { color: color.textMuted },
  scoreRow: {
    height: row.scoreRowHeight,
    marginTop: row.scoreRowTop,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: row.scoreGap,
  },
  // The delta's place keeps a width while empty, so the chips have somewhere to land.
  slot: { minWidth: size.touch },
  statusRow: {
    height: space[10],
    marginTop: row.actionsRowTop,
    flexDirection: 'row',
    alignItems: 'center',
  },
  end: { alignItems: 'flex-end' },
  endRow: { height: size.buttonModal, justifyContent: 'center' },
  statsRow: {
    height: row.scoreRowHeight,
    marginTop: row.scoreRowTop,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[6],
  },
  stat: { alignItems: 'center', gap: space[3] },
  divider: {
    width: tokens.border.hairline,
    height: space[12] - space[2],
    backgroundColor: color.border,
  },
  value: { color: color.text, includeFontPadding: false },
  best: { flexDirection: 'row', alignItems: 'baseline', gap: space[2], direction: 'ltr' },
  bestPoints: { color: ME.ring, includeFontPadding: false },
});
