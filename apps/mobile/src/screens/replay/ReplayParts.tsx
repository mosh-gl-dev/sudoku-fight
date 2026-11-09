import type { Digit, MoveScore } from '@sudoku-fight/engine';
import type { TFunction } from 'i18next';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type AccessibilityActionEvent,
  type GestureResponderEvent,
  I18nManager,
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Icon } from '../../components/Icon';
import { useProbeWidths, WidthProbes, widthsOf, wordsOf } from '../../components/player/statusFit';
import {
  displayName,
  formatScore,
  ltr,
  MoveText,
  paletteAt,
  SeatGlyph,
  signedText,
} from '../../components/player';
import { Text } from '../../components/ui/Text';
import { closeSentences, decimalSeparator, labelValue } from '../../i18n/compose';
import { color, radius, size, space, text, tokens } from '../../theme';
import { scoreCountsOf } from '../results/resultsModel';
import type { KeyMoments, PlayerExplanation, ReplayPlayer, TimelineDot } from './replayModel';

/**
 * The pieces of the replay screen (spec §13; Replay.dc.html): a player's explanation card, the timeline with
 * its dots, the step buttons and the key-moment chips. They draw what the replay model worked out; nothing is
 * decided here.
 */

/** "אני" for me, the name for anyone else (bots by their own name). */
export function useWho() {
  const { t } = useTranslation('replay');
  const { t: tp } = useTranslation('player');
  return (p: Pick<ReplayPlayer, 'name' | 'isBot' | 'isMe'> | undefined): string =>
    p === undefined ? t('unknown') : p.isMe ? t('me') : displayName(p, tp);
}

// ---------------------------------------------------------------------------------------------------------
// A player's explanation (spec §13.2)

const STATUS_COLOR = {
  choosing: color.info,
  released: color.textMuted,
  correct: color.success,
  wrong: color.danger,
} as const;

export function ExplanationCard({
  player,
  explanation: x,
  testID,
}: {
  player: ReplayPlayer;
  explanation: PlayerExplanation;
  testID?: string;
}) {
  const { t } = useTranslation('replay');
  const { t: tg } = useTranslation('game');
  const who = useWho()(player);
  const palette = paletteAt(player.colorIndex);
  const border = x.live ? { borderColor: palette.ring, borderWidth: tokens.border.focus } : null;

  if (x.status === 'none') {
    const title = player.isMe ? t('explain.noneMe') : t('explain.none', { name: who });
    return (
      <View
        style={[styles.card, border]}
        accessible
        accessibilityRole="text"
        accessibilityLabel={t('explain.labelNone', { name: title, text: t('explain.noneBody') })}
        testID={testID}
      >
        <Head player={player} name={who} />
        <Text style={[text('label'), styles.strong]}>{title}</Text>
        <Text style={[text('caption'), styles.muted]}>{t('explain.noneBody')}</Text>
      </View>
    );
  }

  const statusWord =
    x.status === 'released' && x.releaseReason
      ? t(`explain.released.${x.releaseReason}`)
      : t(`explain.status.${x.status}`);
  const decimal = decimalSeparator(t);
  const chip =
    x.status === 'correct' && x.points !== null
      ? t('explain.chip', { status: statusWord, points: signedText(x.points, decimal) })
      : x.status === 'wrong' && x.penalty !== null
        ? t('explain.chip', { status: statusWord, points: signedText(-x.penalty, decimal) })
        : statusWord;
  const move = ltr(t('explain.move', { cell: x.cellName, digit: x.answer ?? '?' }));
  const body = x.text ?? t('explain.noLogic', { cell: x.cellName, digit: x.answer ?? '?' });
  const why = x.wrongText ? t('explain.why', { digit: x.played, text: x.wrongText }) : null;
  const score = x.score ? calculationOf(x.score, x.answer, t, tg, decimal) : null;
  const penalty = x.penaltyScore ? calculationOf(x.penaltyScore, x.answer, t, tg, decimal) : null;
  // The card's lines as one label, each closed as a sentence where it isn't one yet ("5 instead of 7", the
  // "label: value" lines), so no two run together: Japanese puts no space after a sentence (match:sentenceSpace).
  const parts = [
    t('explain.label', {
      name: who,
      status: chip,
      move,
      technique: x.techniqueName ?? '',
      text: body,
    }),
    x.status === 'wrong' ? t('explain.played', { digit: x.played, answer: x.answer }) : null,
    why,
    score ? labelValue(t('explain.scoreLine'), score.spoken, t) : null,
    penalty ? labelValue(t('explain.penaltyLine'), penalty.spoken, t) : null,
  ];
  const label = closeSentences(parts, t);

  return (
    <View
      style={[styles.card, border]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
      testID={testID}
    >
      <Head player={player} name={who}>
        <View style={[styles.chip, { borderColor: STATUS_COLOR[x.status] }]}>
          <Text
            style={[text('badge'), { color: STATUS_COLOR[x.status] }]}
            testID={testID && `${testID}-status`}
          >
            {chip}
          </Text>
        </View>
      </Head>
      {/* Replay.dc.html: the move whole on one line (MoveText, B20); a long technique wraps beside it. */}
      <View style={styles.moveRow}>
        <MoveText
          move={t('explain.move', { cell: x.cellName, digit: x.answer ?? '?' })}
          style={[text('cellRef'), styles.strong]}
          testID={testID && `${testID}-move`}
        />
        {x.techniqueName ? (
          <Text
            style={[text('caption'), styles.accent, styles.technique]}
            numberOfLines={2}
            testID={testID && `${testID}-technique`}
          >
            {x.techniqueName}
          </Text>
        ) : null}
      </View>
      {x.status === 'wrong' ? (
        <Text style={[text('caption'), styles.danger]}>
          {t('explain.played', { digit: x.played, answer: x.answer })}
        </Text>
      ) : null}
      <Text style={[text('body'), styles.strong]} testID={testID && `${testID}-text`}>
        {body}
      </Text>
      {why ? <Text style={[text('caption'), styles.muted]}>{why}</Text> : null}
      {score ? (
        <Calculation
          title={t('explain.scoreLine')}
          calculation={score}
          testID={testID && `${testID}-score`}
        />
      ) : null}
      {penalty ? (
        <Calculation
          title={t('explain.penaltyLine')}
          calculation={penalty}
          testID={testID && `${testID}-penalty`}
        />
      ) : null}
    </View>
  );
}

interface CalculationText {
  /** "9 − 6 + (9 − 5) / 2 = 5", an LTR isolate. */
  formula: string;
  /** The two counts it was worked out from: "6 בשורה, 5 בריבוע". */
  counts: string;
  /** Both, for the card's label. */
  spoken: string;
}

/**
 * A move's calculation (spec §13.2) in the viewer's language (B1: the engine's "points = 9 − 6 + …" was English
 * in every language). The formula in numbers alone, with the language's decimal separator, and under it the two
 * counts that set it (the engine's X and Y, matched to their counts by the results' scoreCountsOf), said as the
 * results say them (game:results.best.filled). `digit` is the right digit: its count is the one on the board.
 */
function calculationOf(
  s: MoveScore,
  digit: Digit | null,
  t: TFunction<'replay'>,
  tg: TFunction<'game'>,
  decimal: string,
): CalculationText {
  const formula = ltr(
    t('explain.formula', { x: String(s.X), y: String(s.Y), points: formatScore(s.points, decimal) }),
  );
  const { highest, next } = scoreCountsOf(s);
  const counts = [highest, next]
    .map((c) => tg(`results.best.filled.${c.count}`, { count: c.value, digit: digit ?? '?' }))
    .join(tg('listSep'));
  return { formula, counts, spoken: [formula, counts].join(tg('listSep')) };
}

function Calculation({
  title,
  calculation: c,
  testID,
}: {
  title: string;
  calculation: CalculationText;
  testID?: string;
}) {
  return (
    <View style={styles.formula}>
      <Text style={[text('micro'), styles.muted]}>{title}</Text>
      <Text style={[text('label'), styles.strong, styles.ltr]} testID={testID}>
        {c.formula}
      </Text>
      <Text style={[text('caption'), styles.muted]} testID={testID && `${testID}-counts`}>
        {c.counts}
      </Text>
    </View>
  );
}

function Head({ player, name, children }: { player: ReplayPlayer; name: string; children?: ReactNode }) {
  return (
    <View style={styles.head}>
      <SeatGlyph colorIndex={player.colorIndex} size={size.icon.inline} />
      <Text style={[text('playerName'), styles.strong, styles.name]} numberOfLines={1}>
        {name}
      </Text>
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------
// The timeline (spec §13.1: dots in the players' colours for right, wrong and interference)

export interface TimelineProps {
  total: number;
  /** 0-based. */
  index: number;
  dots: readonly TimelineDot[];
  /** "שלב 7 מתוך 94, 1:12" for screen readers. */
  valueText: string;
  onSeek: (index: number) => void;
  testID?: string;
}

const DOT = { correct: space[5], wrong: space[5], interference: space[6] } as const;
const TRACK = space[2];
const THUMB = space[8];

/**
 * A bar from the first step to the last, in reading order (from the right in Hebrew). A tap or a drag picks
 * a step; for screen readers it is an adjustable control (swipe up / down for the next / previous step).
 */
export function Timeline({
  total,
  index,
  dots,
  valueText,
  onSeek,
  testID = 'replay-timeline',
}: TimelineProps) {
  const { t } = useTranslation('replay');
  const [width, setWidth] = useState(0);
  const fractionOf = (i: number) => (total <= 1 ? 0 : i / (total - 1));

  const seekAt = (e: GestureResponderEvent) => {
    if (width <= 0 || total <= 1) return;
    const x = Math.max(0, Math.min(width, e.nativeEvent.locationX));
    const f = I18nManager.isRTL ? 1 - x / width : x / width;
    const next = Math.round(f * (total - 1));
    if (next !== index) onSeek(next);
  };
  const onAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'increment') onSeek(Math.min(total - 1, index + 1));
    if (e.nativeEvent.actionName === 'decrement') onSeek(Math.max(0, index - 1));
  };

  return (
    <View
      style={styles.timeline}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={seekAt}
      onResponderMove={seekAt}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={t('nav.timeline')}
      accessibilityHint={t('nav.timelineHint')}
      accessibilityValue={{ min: 1, max: total, now: index + 1, text: valueText }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onAction}
      testID={testID}
    >
      <View style={styles.track} pointerEvents="none" />
      <View
        style={[styles.fill, { width: `${fractionOf(index) * 100}%` }]}
        pointerEvents="none"
        testID={`${testID}-fill`}
      />
      {dots.map((d) => {
        const dot = DOT[d.kind];
        const palette = paletteAt(d.colorIndex);
        return (
          <View
            key={d.step}
            pointerEvents="none"
            style={[
              styles.dot,
              {
                width: dot,
                height: dot,
                borderRadius: dot / 2,
                marginStart: -dot / 2,
                start: `${fractionOf(d.step) * 100}%`,
                backgroundColor: palette.ring,
                borderColor:
                  d.kind === 'correct' ? color.success : d.kind === 'wrong' ? color.danger : color.bg,
                opacity: d.step <= index ? 1 : 0.4,
              },
            ]}
            testID={`${testID}-dot-${d.kind}`}
          />
        );
      })}
      <View
        pointerEvents="none"
        style={[styles.thumb, { start: `${fractionOf(index) * 100}%` }]}
        testID={`${testID}-thumb`}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------
// The step buttons (spec §13.1: "◀ שלב קודם | שלב הבא ▶")

export function StepButton({
  direction,
  disabled,
  onPress,
  testID,
}: {
  direction: 'prev' | 'next';
  disabled: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation('replay');
  const label = direction === 'prev' ? t('nav.prev') : t('nav.next');
  // The label takes two lines at a large text size, broken between words (QA loop 7, font 1.3: "Previous st…");
  // where its widest word (measured at full size) does not fit beside the chevron, the chevron goes: the word stays
  // whole and the button's name says the way.
  const [buttonWidth, setButtonWidth] = useState<number | null>(null);
  const [widths, report] = useProbeWidths();
  const probes = wordsOf(label).map((word, k) => ({ id: `step-${k}`, text: word, style: text('button') }));
  const measured = widthsOf(probes, widths);
  const chevron =
    buttonWidth === null || measured === null || stepWordFits(buttonWidth, Math.max(0, ...measured), true);
  const icon = !chevron ? null : (
    <View style={direction === 'prev' ? styles.flip : null}>
      <Icon name="chevronForward" size={size.icon.card} color={disabled ? color.textFaint : color.text} />
    </View>
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.stepButton, pressed && !disabled ? styles.pressed : null]}
      onLayout={(e) => setButtonWidth(e.nativeEvent.layout.width)}
      testID={testID}
    >
      <WidthProbes probes={probes} onWidth={report} />
      {direction === 'prev' ? icon : null}
      <Text
        style={[text('button'), disabled ? styles.faint : styles.strong, styles.stepLabel]}
        numberOfLines={2}
      >
        {label}
      </Text>
      {direction === 'next' ? icon : null}
    </Pressable>
  );
}

/** Whether a word `word` wide fits a step button `width` wide, beside the chevron or alone. */
export function stepWordFits(width: number, word: number, withChevron: boolean): boolean {
  const inner = width - 2 * STEP_PADDING - 2 * tokens.border.hairline;
  return word <= inner - (withChevron ? size.icon.card + STEP_GAP : 0);
}

const STEP_PADDING = space[4];
const STEP_GAP = space[3];

// ---------------------------------------------------------------------------------------------------------
// Key moments (spec §13.1: best move, mistakes, interferences, the turning point)

export type MomentKind = 'bestMove' | 'mistakes' | 'interferences' | 'turningPoint';

export function MomentChips({
  moments,
  onJump,
}: {
  moments: KeyMoments;
  onJump: (kind: MomentKind) => void;
}) {
  const { t } = useTranslation('replay');
  const chips: { kind: MomentKind; label: string }[] = [];
  if (moments.bestMove !== null) chips.push({ kind: 'bestMove', label: t('moments.bestMove') });
  if (moments.mistakes.length)
    chips.push({ kind: 'mistakes', label: t('moments.mistakes', { count: moments.mistakes.length }) });
  if (moments.interferences.length)
    chips.push({
      kind: 'interferences',
      label: t('moments.interferences', { count: moments.interferences.length }),
    });
  if (moments.turningPoint !== null) chips.push({ kind: 'turningPoint', label: t('moments.turningPoint') });
  if (!chips.length) return null;
  return (
    <View style={styles.moments} testID="replay-moments">
      <Text style={[text('label'), styles.muted]} accessibilityRole="header">
        {t('moments.title')}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {chips.map((c) => (
          <Pressable
            key={c.kind}
            accessibilityRole="button"
            accessibilityLabel={c.label}
            accessibilityHint={t('moments.hint')}
            onPress={() => onJump(c.kind)}
            style={({ pressed }) => [styles.momentChip, pressed ? styles.pressed : null]}
            testID={`replay-moment-${c.kind}`}
          >
            <Text style={[text('buttonSm'), styles.strong]} numberOfLines={1}>
              {c.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space[3],
    padding: space[6],
    borderRadius: radius.card,
    borderWidth: tokens.border.hairline,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  name: { flex: 1, minWidth: 0 },
  chip: {
    paddingHorizontal: space[4],
    paddingVertical: space[1],
    borderRadius: radius.pill,
    borderWidth: tokens.border.hairline,
  },
  moveRow: { flexDirection: 'row', alignItems: 'baseline', gap: space[5] },
  technique: { flexShrink: 1 },
  formula: { gap: space[1] },
  strong: { color: color.text },
  muted: { color: color.textMuted },
  faint: { color: color.textFaint },
  accent: { color: color.accent },
  danger: { color: color.danger },
  ltr: { writingDirection: 'ltr' },
  flip: { transform: [{ scaleX: -1 }] },
  timeline: { height: size.touch, justifyContent: 'center' },
  track: {
    position: 'absolute',
    start: 0,
    end: 0,
    height: TRACK,
    borderRadius: radius.bar,
    backgroundColor: color.surface2,
  },
  fill: {
    position: 'absolute',
    start: 0,
    height: TRACK,
    borderRadius: radius.bar,
    backgroundColor: color.accent,
  },
  dot: { position: 'absolute', borderWidth: tokens.border.hairline },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    marginStart: -THUMB / 2,
    borderRadius: THUMB / 2,
    backgroundColor: color.text,
    borderWidth: tokens.border.focus,
    borderColor: color.accent,
  },
  stepLabel: { flexShrink: 1, textAlign: 'center' },
  stepButton: {
    flex: 1,
    minHeight: size.buttonMd,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[3],
    paddingHorizontal: space[4],
    borderRadius: radius.button,
    borderWidth: tokens.border.hairline,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  pressed: { backgroundColor: color.pressedOverlay },
  moments: { gap: space[3] },
  chips: { gap: space[4], paddingEnd: space[4] },
  momentChip: {
    minHeight: size.touch,
    justifyContent: 'center',
    paddingHorizontal: space[6],
    borderRadius: radius.pill,
    borderWidth: tokens.border.hairline,
    borderColor: color.border,
    backgroundColor: color.surface2,
  },
});
