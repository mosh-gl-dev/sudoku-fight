import type { GameType } from '@sudoku-fight/engine';
import type { TFunction } from 'i18next';
import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type LayoutChangeEvent,
  Pressable,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';

import { AVATAR_STAGES, type AvatarIdOrNone, endFaceOf, placeCue, useAfter } from '../../avatars';
import { Icon, type IconName } from '../../components/Icon';
import {
  Avatar,
  CountUpText,
  displayName,
  formatScore,
  ltr,
  mistakesShort,
  paletteAt,
  scoreText,
  SeatGlyph,
  signedText,
} from '../../components/player';
import { shownName } from '../../components/player/temporaryName';
import { PressableCard } from '../../components/ui/tactile';
import { Text } from '../../components/ui/Text';
import { decimalSeparator, labelValue, stopSentences } from '../../i18n/compose';
import { color, radius, size, space, text, tokens } from '../../theme';
import { motion, useReduceMotion } from '../../theme/motion';
import { formatSeconds } from '../game/model';
import { PODIUM_STAGGER_MS, useEntrance, useGrow, victory } from './resultsMotion';
import type {
  AwardResult,
  OpponentResult,
  Outcome,
  RankingRow,
  RatingGuardRow,
  RatingPairRow,
  RatingResult,
} from './resultsModel';

/**
 * The parts of the results that only a game with opponents has (spec §12; Results-Victory, Results-Defeat and
 * Results-4P in direction C): each opponent's row (avatar, name, score, mistakes, and in a ranked game the
 * rating change), the full ranking of a 3–4 player game (a podium and 4th place), my rating change counting
 * from the old rating to the new one, and the game's awards with what each one means. Each row and each
 * award is one summary for screen readers.
 *
 * The avatars react to the end (spec §3.4, avatars/reactions.ts): as the players' section lands, the winner
 * laughs and spins (and idles on), whoever is behind or left looks sad, a draw smiles. With reduced motion only
 * the faces change. The podium's columns grow from their feet (motion.md §4.7 `podium`), and after a win the
 * awards come in one by one, each badge popping (`awards`); with reduced motion both are simply there.
 */

/** The players' section is in place (motion.md §4.7: section 1 of the sequence): the end's reactions play. */
function useEndReactions(): boolean {
  const reduce = useReduceMotion();
  return useAfter(
    reduce
      ? motion.duration.reducedFade
      : victory.crownAt + victory.awardsStagger + motion.duration.rewardMin,
  );
}

type GameT = TFunction<'game'>;

/**
 * A player's row: one summary for screen readers; with `onPress` (another player of a ranked game, stage 12)
 * a button that opens their card.
 */
function PlayerRow({
  label,
  onPress,
  style,
  testID,
  children,
}: {
  label: string;
  onPress?: () => void;
  style: StyleProp<ViewStyle>;
  testID: string;
  children: ReactNode;
}) {
  const { t } = useTranslation('progress');
  if (!onPress)
    return (
      <View style={style} accessible accessibilityRole="text" accessibilityLabel={label} testID={testID}>
        {children}
      </View>
    );
  // Inside its card, a row has no surface of its own: the one card press (D125), as the leaderboard's podium.
  return (
    <PressableCard
      variant="bare"
      style={style}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={t('leaderboard.openHint')}
      onPress={onPress}
      testID={testID}
    >
      {children}
    </PressableCard>
  );
}

export function OpponentsSection({
  opponents,
  outcome = null,
  onOpenPlayer,
}: {
  opponents: readonly OpponentResult[];
  /** Mine: an opponent first with me is a draw (their face). */
  outcome?: Outcome | null;
  /** A ranked game: another player's row opens their card (spec §14.3). */
  onOpenPlayer?: (playerId: string) => void;
}) {
  const { t } = useTranslation('game');
  const { t: tp } = useTranslation('player');
  const { t: th } = useTranslation('history');
  const decimal = decimalSeparator(t);
  const play = useEndReactions();
  return (
    <Card
      title={t('results.opponents.title')}
      icon={opponents.every((o) => o.isBot) ? 'bot' : 'leaderboard'}
      testID="results-opponents"
    >
      {opponents.map((o) => {
        const name = displayName(o, tp);
        const mistakes = mistakesShort(o.mistakes, tp);
        const end = placeCue(o.place, o.place === 1 && outcome === 'tie' ? 2 : 1, o.left);
        const face = endFaceOf(end, play);
        const label = o.rating
          ? th('results.opponentLabel', {
              name,
              count: o.score,
              score: scoreText(o.score, decimal),
              mistakes,
              delta: signedText(o.rating.delta, decimal),
            })
          : t('results.opponents.label', {
              name,
              count: o.score,
              score: scoreText(o.score, decimal),
              mistakes,
            });
        return (
          <PlayerRow
            key={o.playerId}
            style={styles.row}
            label={label}
            onPress={onOpenPlayer && !o.isBot ? () => onOpenPlayer(o.playerId) : undefined}
            testID={`results-opponent-${o.playerId}`}
          >
            <Avatar
              avatarId={o.avatar}
              size="compact"
              colorIndex={o.colorIndex}
              bot={o.isBot}
              expression={face.expression}
              reaction={face.reaction}
              // The winner's stage: it idles on after its reaction.
              idle={AVATAR_STAGES.winner && end === 'win'}
              testID={`results-opponent-${o.playerId}-avatar`}
            />
            <View style={styles.who}>
              <View style={styles.nameRow}>
                <SeatGlyph colorIndex={o.colorIndex} size={GLYPH} />
                <Text style={[text('playerName'), styles.strong, styles.shrink]} numberOfLines={1}>
                  {name}
                </Text>
              </View>
              <Text style={[text('caption'), styles.muted]} numberOfLines={1}>
                {o.left ? t('results.opponents.left') : mistakes}
              </Text>
            </View>
            <View style={styles.numbers}>
              <Text
                style={[text('rating'), styles.score, { color: paletteAt(o.colorIndex).ring }]}
                testID={`results-opponent-${o.playerId}-score`}
              >
                {scoreText(o.score, decimal)}
              </Text>
              {o.rating ? (
                <Text
                  style={[text('caption'), styles.muted]}
                  testID={`results-opponent-${o.playerId}-rating`}
                >
                  {[
                    signedText(o.rating.delta, decimal),
                    ltr(
                      th('results.ratingOf', {
                        before: Math.round(o.rating.before),
                        after: Math.round(o.rating.after),
                      }),
                    ),
                  ].join(tp('sep'))}
                </Text>
              ) : null}
            </View>
          </PlayerRow>
        );
      })}
    </Card>
  );
}

// ---------------------------------------------------------------------------------------------------------
// 3–4 players: the full ranking (spec §12), a podium for the first three and a row for the 4th

/** The podium's columns in screen order: 2nd, 1st, 3rd (the winner in the middle). */
const PODIUM_ORDER = [1, 0, 2] as const;
/** Heights of the podium steps by position (1st highest), from the spacing scale: the design has no token. */
const STEP_HEIGHT = [space[15], space[13], space[11]] as const;
/** The seat shape before each name (● ▲ ■ ◆): who is who never depends on the colour alone (spec §22). */
const GLYPH = space[5];

export function RankingSection({
  ranking,
  myAvatar,
  onOpenPlayer,
  growAt = null,
}: {
  ranking: readonly RankingRow[];
  myAvatar: AvatarIdOrNone;
  /** A ranked game: another player opens their card (spec §14.3). */
  onOpenPlayer?: (playerId: string) => void;
  /**
   * When the podium starts to grow (ms after the results open; its columns 100 ms apart, in screen order).
   * Null: the steps are at their height from the start (reduced motion, or a podium on its own).
   */
  growAt?: number | null;
}) {
  const { t } = useTranslation('history');
  const { t: tg } = useTranslation('game');
  const { t: tp } = useTranslation('player');
  const decimal = decimalSeparator(t);
  const podium = ranking.slice(0, 3);
  const rest = ranking.slice(3);
  const nameOf = (r: RankingRow) => (r.isMe ? tg('me') : displayName(r, tp));
  const detailOf = (r: RankingRow) => (r.left ? t('results.ranking.left') : mistakesShort(r.mistakes, tp));
  const labelOf = (r: RankingRow) => {
    const base = {
      place: r.place,
      name: nameOf(r),
      count: r.score,
      score: scoreText(r.score, decimal),
      mistakes: detailOf(r),
    };
    return r.rating
      ? t('results.ranking.labelRating', { ...base, delta: signedText(r.rating.delta, decimal) })
      : t('results.ranking.label', base);
  };
  const avatarOf = (r: RankingRow) => (r.isMe ? myAvatar : r.avatar);
  const play = useEndReactions();
  const firstPlaces = ranking.filter((r) => r.place === 1).length;
  const faceOf = (r: RankingRow) => endFaceOf(placeCue(r.place, firstPlaces, r.left), play);
  const openOf = (r: RankingRow) =>
    onOpenPlayer && !r.isMe && !r.isBot ? () => onOpenPlayer(r.playerId) : undefined;
  const delta = (r: RankingRow) =>
    r.rating ? (
      <Text
        style={[text('caption'), deltaStyle(r.rating.delta, styles.success)]}
        testID={`results-ranking-${r.playerId}-delta`}
      >
        {signedText(r.rating.delta, decimal)}
      </Text>
    ) : null;

  return (
    <Card title={t('results.ranking.title')} icon="leaderboard" testID="results-ranking">
      <View style={styles.podium}>
        {PODIUM_ORDER.map((k, column) => {
          const r = podium[k];
          if (!r) return null;
          const palette = paletteAt(r.colorIndex);
          const face = faceOf(r);
          return (
            <PlayerRow
              key={r.playerId}
              style={styles.podiumColumn}
              label={labelOf(r)}
              onPress={openOf(r)}
              testID={`results-podium-${r.place}-${r.playerId}`}
            >
              <Avatar
                avatarId={avatarOf(r)}
                size="compact"
                colorIndex={r.colorIndex}
                bot={r.isBot}
                inactive={r.left}
                expression={face.expression}
                reaction={face.reaction}
                // The winner's stage: it idles (blinks) on after its reaction.
                idle={AVATAR_STAGES.winner && r.place === 1}
                testID={`results-podium-${r.place}-${r.playerId}-avatar`}
              />
              <View style={styles.nameRow}>
                <SeatGlyph colorIndex={r.colorIndex} size={GLYPH} />
                <Text style={[text('label'), styles.strong, styles.shrink]} numberOfLines={1}>
                  {nameOf(r)}
                </Text>
              </View>
              <Text style={[text('rating'), { color: palette.ring }]}>{scoreText(r.score, decimal)}</Text>
              {delta(r)}
              <PodiumStep
                place={r.place}
                height={STEP_HEIGHT[k]}
                borderColor={r.isMe ? palette.ring : color.border}
                growAt={growAt === null ? null : growAt + column * PODIUM_STAGGER_MS}
                testID={`results-podium-${r.place}-${r.playerId}-step`}
              />
            </PlayerRow>
          );
        })}
      </View>
      {rest.map((r) => (
        <PlayerRow
          key={r.playerId}
          style={[styles.row, styles.restRow, r.isMe ? { borderColor: paletteAt(0).ring } : null]}
          label={labelOf(r)}
          onPress={openOf(r)}
          testID={`results-ranking-${r.place}-${r.playerId}`}
        >
          <Text style={[text('h1'), styles.muted]}>{r.place}</Text>
          <Avatar
            avatarId={avatarOf(r)}
            size="compact"
            colorIndex={r.colorIndex}
            bot={r.isBot}
            inactive={r.left}
            {...faceOf(r)}
            testID={`results-ranking-${r.place}-${r.playerId}-avatar`}
          />
          <View style={styles.who}>
            <View style={styles.nameRow}>
              <SeatGlyph colorIndex={r.colorIndex} size={GLYPH} />
              <Text style={[text('playerName'), styles.strong, styles.shrink]} numberOfLines={1}>
                {nameOf(r)}
              </Text>
            </View>
            <Text style={[text('caption'), styles.muted]} numberOfLines={1}>
              {detailOf(r)}
            </Text>
          </View>
          <View style={styles.numbers}>
            <Text style={[text('rating'), { color: paletteAt(r.colorIndex).ring }]}>
              {scoreText(r.score, decimal)}
            </Text>
            {delta(r)}
          </View>
        </PlayerRow>
      ))}
    </Card>
  );
}

/** A podium's step under a player, with their place on it: it grows from its foot from `growAt` (`podium`). */
function PodiumStep({
  place,
  height,
  borderColor,
  growAt,
  testID,
}: {
  place: number;
  height: number;
  borderColor: string;
  growAt: number | null;
  testID: string;
}) {
  const grow = useGrow(growAt ?? 0, growAt === null);
  return (
    <Animated.View style={[styles.podiumStep, { height, borderColor }, grow]} testID={testID}>
      <Text style={[text('h1'), place === 1 ? styles.accent : styles.strong]}>{place}</Text>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------------------------------------
// My rating change (spec §12: "שינוי דירוג מונפש")

/** A rating as its count shows it, in whole points. A worklet: it runs on the UI thread, every frame. */
function ratingText(n: number): string {
  'worklet';
  return String(Math.round(n));
}

/**
 * The colour of a rating change: a loss in danger, a gain in `gain`, and a 0 muted (nothing won: a pair a
 * leave guard held, spec §11.2, or a draw between equals).
 */
function deltaStyle(delta: number, gain: { color: string }) {
  return delta < 0 ? styles.danger : delta === 0 ? styles.muted : gain;
}

/**
 * The new rating counts from the old one as the sections land (motion.md §4.7 `ratingCountAt`), on the UI
 * thread (CountUpText: no frame of the count renders in React). Reduced motion: the new rating at once. A game
 * of 3–4 players also shows the change against each opponent (Results-4P: "מחושב מול כל יריב בנפרד"), in
 * tenths that add up to the change. A pair a leave guard held at 0 (spec §11.2) gets a caption that says why,
 * whatever the number of players.
 */
export function RatingSection({
  rating,
  gameType,
  pairs = [],
  guards = [],
  waiting = false,
  onValueLayout,
  countAt = motion.sequence.victory.ratingCountAt,
}: {
  rating: RatingResult;
  gameType: GameType;
  pairs?: readonly RatingPairRow[];
  /** My pairs a leave guard held at 0 (spec §11.2): one caption each, saying why. */
  guards?: readonly RatingGuardRow[];
  /**
   * The number is not on the screen yet (below the fold, under the action bar: QA loop 8 on a 1080 × 2340 phone):
   * the count waits on the old rating until it is, then runs (never before `ratingCountAt`).
   */
  waiting?: boolean;
  /** Where the number and the change are laid out in this card (the screen tells when they come into view). */
  onValueLayout?: (e: LayoutChangeEvent) => void;
  /**
   * When the count may start, ms after this card mounts: `ratingCountAt`, or less for a card that mounted after
   * the screen's first frame (the results' stack fade on Android, ResultsScreen), so it still counts at the same time.
   */
  countAt?: number;
}) {
  const { t } = useTranslation('history');
  const { t: tg } = useTranslation('game');
  const { t: tp } = useTranslation('player');
  const decimal = decimalSeparator(t);
  const reduce = useReduceMotion();
  const before = Math.round(rating.before);
  const after = Math.round(rating.after);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (reduce) return;
    const id = setTimeout(() => setStarted(true), countAt);
    return () => clearTimeout(id);
  }, [reduce, countAt]);
  const target = reduce || (started && !waiting) ? after : before;
  const delta = signedText(rating.delta, decimal);
  const pairLabels = pairs.map((p) =>
    t('results.rating.pairLabel', { name: displayName(p, tp), delta: signedText(p.delta, decimal) }),
  );
  const captions = guards.map((g) => ({
    playerId: g.playerId,
    line: t(`results.rating.guard.${g.reason}`, { name: displayName(g, tp) }),
  }));
  const label = stopSentences(
    [
      t('results.rating.label', { delta, before, after }),
      pairs.length ? labelValue(t('results.rating.perOpponent'), pairLabels.join(tg('listSep')), t) : null,
      ...captions.map((c) => c.line),
    ],
    t,
  );
  return (
    <View
      style={styles.card}
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
      testID="results-rating"
    >
      <View style={styles.head}>
        <HeadBadge icon="leaderboard" />
        <Text style={[text('playerName'), styles.strong, styles.shrink]}>
          {t('results.rating.title', { type: tg(`type.${gameType}`) })}
        </Text>
        {pairs.length ? (
          <Text style={[text('caption'), styles.faint, styles.headNote]} numberOfLines={1}>
            {t('results.rating.perOpponent')}
          </Text>
        ) : null}
      </View>
      <View style={styles.ratingRow} onLayout={onValueLayout} testID="results-rating-row">
        <CountUpText
          value={target}
          format={ratingText}
          durationMs={motion.duration.rewardMax}
          style={[text('scoreXL'), styles.strong]}
          testID="results-rating-value"
        />
        <View style={styles.numbers}>
          <Text
            style={[text('rating'), deltaStyle(rating.delta, styles.success)]}
            testID="results-rating-delta"
          >
            {delta}
          </Text>
          <Text style={[text('caption'), styles.muted]}>{t('results.rating.from', { before })}</Text>
        </View>
      </View>
      {pairs.length ? (
        <View style={styles.pairs} testID="results-rating-pairs">
          {pairs.map((p) => (
            <View key={p.playerId} style={styles.pair} testID={`results-rating-pair-${p.playerId}`}>
              <Avatar avatarId={p.avatar} size="cell" bot={p.isBot} />
              <View style={styles.pairText}>
                <Text style={[text('micro'), styles.muted]} numberOfLines={1}>
                  {displayName(p, tp)}
                </Text>
                <Text
                  style={[text('label'), deltaStyle(p.delta, styles.accent)]}
                  testID={`results-rating-pair-${p.playerId}-delta`}
                >
                  {signedText(p.delta, decimal)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
      {captions.map((c) => (
        <Text
          key={c.playerId}
          style={[text('caption'), styles.muted]}
          testID={`results-rating-guard-${c.playerId}`}
        >
          {c.line}
        </Text>
      ))}
      {rating.provisional ? (
        <Text style={[text('caption'), styles.muted]}>{t('results.rating.provisional')}</Text>
      ) : null}
    </View>
  );
}

const AWARD_ICONS: Readonly<Record<AwardResult['kind'], IconName>> = {
  bestMove: 'trophy',
  fewestMistakes: 'check',
  fastest: 'bolt',
  comeback: 'refresh',
  mostPoints: 'leaderboard',
};

/** An award's value in its own unit: points, mistakes, seconds per move. */
function awardValue(a: AwardResult, t: GameT): string {
  switch (a.kind) {
    case 'bestMove':
    case 'comeback':
    case 'mostPoints':
      return t(`results.awards.value.${a.kind}`, { value: ltr(formatScore(a.value, decimalSeparator(t))) });
    case 'fewestMistakes':
      return t('results.awards.value.fewestMistakes', { value: a.value });
    case 'fastest':
      return t('results.awards.value.fastest', { value: formatSeconds(a.value, decimalSeparator(t)) });
  }
}

/**
 * The game's awards (spec §12), one line each: the award, who won it, and the value. What an award is for is a
 * tap away (the line opens to show it), so the list reads at a glance; a screen reader hears it with the line.
 * `popAt` (after a win, full motion): the lines come in from then, 150 ms apart, each badge popping (motion.md
 * §4.7 `awards`). Null: they come in with their card.
 */
export function AwardsSection({
  awards,
  popAt = null,
}: {
  awards: readonly AwardResult[];
  popAt?: number | null;
}) {
  const { t } = useTranslation('game');
  return (
    <Card title={t('results.awards.title')} icon="trophy" tone="gold" testID="results-awards">
      <View style={styles.awards}>
        {awards.map((a, i) => (
          <AwardRow
            key={a.kind}
            award={a}
            popAt={popAt === null ? null : popAt + i * victory.awardsStagger}
          />
        ))}
      </View>
    </Card>
  );
}

function AwardRow({ award: a, popAt }: { award: AwardResult; popAt: number | null }) {
  const { t } = useTranslation('game');
  const { t: tp } = useTranslation('player');
  const { t: th } = useTranslation('history');
  const reduce = useReduceMotion();
  const [open, setOpen] = useState(false);
  const still = popAt === null;
  const row = useEntrance('fade', popAt ?? 0, still || reduce);
  const badge = useEntrance('pop', popAt ?? 0, still || reduce);
  const title = t(`results.awards.${a.kind}`);
  const who = a.winners
    .map((w) => (w.mine ? t('me') : w.name === null ? tp('unknownName') : shownName(w.name, tp)))
    .join(t('listSep'));
  const value = awardValue(a, t);
  const definition = th(`results.awardDefinitions.${a.kind}`);
  const mine = a.winners.some((w) => w.mine);
  return (
    <Animated.View style={still ? null : row} testID={`results-award-${a.kind}-in`}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={({ pressed }) => [styles.award, pressed && styles.awardDown]}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={stopSentences([t('results.awards.label', { title, who, value }), definition], t)}
        testID={`results-award-${a.kind}`}
      >
        <View style={styles.awardLine}>
          <Animated.View style={[styles.awardBadge, mine ? styles.badgeMine : null, still ? null : badge]}>
            <Icon
              name={AWARD_ICONS[a.kind]}
              size={size.icon.inline}
              color={mine ? color.accent : color.textMuted}
            />
          </Animated.View>
          {/* The whole award and who won it, on two lines if it must ("Меньше всех ошибок", B22), never "…". */}
          <Text style={[text('label'), styles.awardTitle]} testID={`results-award-${a.kind}-title`}>
            <Text style={styles.strong}>{title}</Text>
            <Text style={styles.muted}>{`${tp('sep')}${who}`}</Text>
          </Text>
          <Text style={[text('rowTitle'), mine ? styles.accent : styles.strong]} numberOfLines={1}>
            {value}
          </Text>
          <View style={open ? styles.chevronOpen : null}>
            <Icon name="chevronDown" size={size.icon.inline} color={color.textFaint} />
          </View>
        </View>
        <Text
          style={[text('caption'), styles.faint, styles.definition, open ? null : styles.closed]}
          testID={`results-award-${a.kind}-definition`}
        >
          {definition}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/** A card's head (VIS-4): a 28 dp tinted badge with the icon, and the title in the text colour. */
export function HeadBadge({ icon, tone = 'plain' }: { icon: IconName; tone?: HeadTone }) {
  const gold = tone === 'gold';
  return (
    <View style={[styles.headBadge, gold ? styles.headBadgeGold : null]}>
      <Icon name={icon} size={HEAD_ICON} color={gold ? color.accent : color.textMuted} />
    </View>
  );
}

/** A plain card, or one about a prize (the best move, the awards): its badge in gold. */
export type HeadTone = 'plain' | 'gold';

function Card({
  title,
  icon,
  tone = 'plain',
  children,
  testID,
}: {
  title: string;
  icon: IconName;
  tone?: HeadTone;
  children: ReactNode;
  testID: string;
}) {
  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.head}>
        <HeadBadge icon={icon} tone={tone} />
        <Text style={[text('playerName'), styles.strong, styles.shrink]} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

/** The icon in a card's head badge (16), inside its 28 dp tile (VIS-4). */
const HEAD_ICON = space[8];
const HEAD_BADGE = space[11];
/** An award's badge on its line (32). */
const AWARD_BADGE = space[12];

const styles = StyleSheet.create({
  card: {
    gap: space[6],
    padding: space[8],
    borderRadius: radius.card,
    borderWidth: tokens.border.hairline,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[5] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[6], minHeight: size.touch },
  who: { flex: 1, minWidth: 0, gap: space[1], alignItems: 'flex-start' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], maxWidth: '100%' },
  shrink: { flexShrink: 1 },
  strong: { color: color.text },
  muted: { color: color.textMuted },
  faint: { color: color.textFaint },
  accent: { color: color.accent },
  success: { color: color.success },
  danger: { color: color.danger },
  score: { includeFontPadding: false },
  numbers: { alignItems: 'flex-end', gap: space[1] },
  podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: space[4] },
  podiumColumn: { flex: 1, minWidth: 0, alignItems: 'center', gap: space[2] },
  podiumStep: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    // It grows from its foot (useGrow).
    transformOrigin: 'bottom',
    marginTop: space[2],
    borderTopStartRadius: radius.lg,
    borderTopEndRadius: radius.lg,
    borderWidth: tokens.border.hairline,
    backgroundColor: color.surface2,
  },
  restRow: {
    paddingHorizontal: space[4],
    borderRadius: radius.lg,
    borderWidth: tokens.border.hairline,
    borderColor: color.border,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[6] },
  headNote: { flexShrink: 1, marginStart: 'auto' },
  pairs: { flexDirection: 'row', gap: space[3] },
  pair: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[3],
    borderRadius: radius.lg,
    borderWidth: tokens.border.hairline,
    borderColor: color.border,
    backgroundColor: color.surface2,
  },
  pairText: { flex: 1, minWidth: 0, gap: space[1], alignItems: 'flex-start' },
  awardBadge: {
    width: AWARD_BADGE,
    height: AWARD_BADGE,
    borderRadius: radius.md,
    backgroundColor: color.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeMine: { borderWidth: tokens.border.hairline, borderColor: color.accent },
  headBadge: {
    width: HEAD_BADGE,
    height: HEAD_BADGE,
    borderRadius: radius.badge,
    backgroundColor: color.iconBg.info,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headBadgeGold: { backgroundColor: color.iconBg.warning },
  awards: { gap: space[2] },
  award: {
    minHeight: size.touch,
    justifyContent: 'center',
    gap: space[2],
    paddingVertical: space[2],
    borderRadius: radius.button,
  },
  // Held down: the pressed overlay, as a plain icon button and a ghost (D125); never a fade.
  awardDown: { backgroundColor: color.pressedOverlay },
  awardLine: { flexDirection: 'row', alignItems: 'center', gap: space[5] },
  awardTitle: { flex: 1, minWidth: 0 },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  definition: { paddingStart: AWARD_BADGE + space[5] },
  closed: { display: 'none' },
});
