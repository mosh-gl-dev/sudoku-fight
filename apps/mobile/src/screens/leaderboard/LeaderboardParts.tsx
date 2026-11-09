import type { LeaderboardEntry } from '@sudoku-fight/protocol';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import {
  Avatar,
  Flag,
  LeagueBadge,
  paletteAt,
  ProvisionalChip,
  Rating,
  SeatGlyph,
} from '../../components/player';
import { shownName } from '../../components/player/temporaryName';
import { Button } from '../../components/ui/Button';
import { PressableCard } from '../../components/ui/tactile';
import { Text } from '../../components/ui/Text';
import { color, radius, size, space, text, tokens } from '../../theme';
import { entryLabel, rankText, type ProgressT } from './leaderboardModel';
import { useTightRows } from './rowFit';

/**
 * The leaderboard's rows (spec §14.2; Leaderboard.dc.html in direction C): the podium of the first three, a
 * row per player after them, and my row pinned at the bottom. "Me" is always P1: the cyan frame and the ●,
 * so it never depends on the colour alone (CLAUDE.md). Each row is one button that opens the player's card,
 * with one summary for screen readers.
 */

const ME = paletteAt(0);
const GLYPH = space[5];

/** The podium's columns in screen order: 2nd, 1st, 3rd (the winner in the middle). */
const PODIUM_ORDER = [1, 0, 2] as const;
/** The steps' heights by place (1st highest), from the spacing scale (the design has no token). */
const STEP = [space[15], space[13], space[11]] as const;
/** The medals of the three places: the league colours gold, silver and bronze. */
const MEDAL = [color.league.gold, color.league.silver, color.league.bronze] as const;

export function Podium({
  podium,
  myId,
  onOpen,
}: {
  podium: readonly LeaderboardEntry[];
  myId: string | null;
  onOpen: (entry: LeaderboardEntry) => void;
}) {
  const { t, i18n } = useTranslation('progress');
  return (
    <View
      style={styles.podium}
      accessibilityRole="list"
      accessibilityLabel={t('leaderboard.podium')}
      testID="leaderboard-podium"
    >
      {PODIUM_ORDER.map((i) => {
        const entry = podium[i];
        if (!entry) return <View key={i} style={styles.podiumColumn} />;
        const mine = entry.id === myId;
        const medal = MEDAL[i]!;
        // The one card press (D125), on a column with no surface of its own: its step is the raised part.
        return (
          <PressableCard
            key={entry.id}
            variant="bare"
            accessibilityRole="button"
            accessibilityLabel={entryLabel(entry, t as ProgressT, i18n.language, mine)}
            accessibilityHint={t('leaderboard.openHint')}
            onPress={() => onOpen(entry)}
            style={styles.podiumColumn}
            testID={`leaderboard-podium-${entry.rank}-${entry.id}`}
          >
            <Avatar
              avatarId={entry.avatarId}
              size={i === 0 ? 'row' : 'card'}
              colorIndex={mine ? 0 : null}
              backdrop={color.bg}
            />
            {mine ? <MeChip /> : null}
            <View style={styles.podiumName}>
              <Text
                style={[text('label'), mine ? styles.me : styles.strong, styles.shrink]}
                numberOfLines={1}
              >
                {shownName(entry.displayName, t)}
              </Text>
              <Flag country={entry.country} size="compact" decorative />
            </View>
            {/* The chip goes under the number when both don't fit the column (QA loop 9: off the screen's edge). */}
            <Rating
              value={entry.rating}
              size="list"
              provisional={entry.provisional}
              decorative
              wrap
              style={styles.podiumRating}
              testID={`leaderboard-podium-${entry.rank}-rating`}
            />
            <View style={[styles.step, { height: STEP[i], borderTopColor: medal }]}>
              <Text style={[text('scoreCompact'), { color: medal }]}>{entry.rank}</Text>
            </View>
          </PressableCard>
        );
      })}
    </View>
  );
}

function MeChip() {
  const { t } = useTranslation('progress');
  return (
    <View style={styles.meChip}>
      <SeatGlyph colorIndex={0} size={GLYPH} color={ME.onRing} />
      <Text style={[text('micro'), styles.onMe]}>{t('common.you')}</Text>
    </View>
  );
}

export function LeaderboardRow({
  entry,
  mine,
  onOpen,
  compact = false,
  testID,
}: {
  entry: LeaderboardEntry;
  mine: boolean;
  onOpen: (entry: LeaderboardEntry) => void;
  /**
   * My pinned row, beside "שחק" (spec §14.2: "#214 · MosheG · 1287"): the rank only as wide as it is, and no flag,
   * so the name keeps its room on a narrow phone (Moshe's phone, 1.11.2026: "אורי" came out as "…"). B23: the
   * provisional chip goes under the rating, which leaves the line under the name its room ("בדירוג זמני · ר…" was
   * cut on the A16), and that line may take a second line before an ellipsis.
   */
  compact?: boolean;
  testID?: string;
}) {
  const { t, i18n } = useTranslation('progress');
  // Narrow or large text (rowFit.ts): the chip joins the line under the name, which wraps; the number stands alone.
  const tight = useTightRows();
  const chipUnderName = tight && entry.provisional;
  // A tappable card (D125): the surface on its base, my row in P1's border, the one card press and its tick.
  return (
    <PressableCard
      accessibilityRole="button"
      accessibilityLabel={entryLabel(entry, t as ProgressT, i18n.language, mine)}
      accessibilityHint={t('leaderboard.openHint')}
      onPress={() => onOpen(entry)}
      tone={mine ? ME.ring : undefined}
      style={styles.row}
      testID={testID ?? `leaderboard-row-${entry.id}`}
    >
      <Text
        style={[
          text('label'),
          compact ? styles.rankCompact : tight ? styles.rankTight : styles.rank,
          mine ? styles.me : styles.muted,
        ]}
        numberOfLines={1}
      >
        {rankText(entry.rank)}
      </Text>
      <Avatar
        avatarId={entry.avatarId}
        size="compact"
        colorIndex={mine ? 0 : null}
        backdrop={color.surface}
      />
      <View style={styles.who}>
        <View style={styles.nameRow}>
          {mine ? <SeatGlyph colorIndex={0} size={GLYPH} /> : null}
          <Text
            style={[text('playerName'), mine ? styles.me : styles.strong, styles.shrink]}
            numberOfLines={1}
          >
            {shownName(entry.displayName, t)}
          </Text>
          {compact ? null : <Flag country={entry.country} size="compact" decorative />}
        </View>
        {/* The line under the name wraps between its parts, never over the rating (QA loop 7: "LevelProvisional"). */}
        <View style={styles.under} testID={`under-${testID ?? `leaderboard-row-${entry.id}`}`}>
          {entry.league ? (
            <LeagueBadge league={entry.league} level={entry.level} variant="icon" wrap />
          ) : (
            <Text
              style={[text('micro'), styles.muted, styles.shrink]}
              numberOfLines={compact || tight ? 2 : 1}
            >
              {`${t('common.provisional')}${t('player:sep')}${t('common.level', { level: entry.level })}`}
            </Text>
          )}
          {chipUnderName ? <ProvisionalChip /> : null}
        </View>
      </View>
      <Rating
        value={entry.rating}
        size="list"
        provisional={entry.provisional && !chipUnderName}
        stacked={compact}
        decorative
      />
    </PressableCard>
  );
}

/**
 * My row, pinned at the bottom (spec §14.2: "#214 · MosheG · 1287"), with "שחק" beside it (Leaderboard.dc.html:
 * the screen's one gold action, "play to climb"); while I have no rating in this tab, a line saying so and
 * "שחק".
 */
export function PinnedMe({
  me,
  onOpen,
  onPlay,
}: {
  me: LeaderboardEntry | null;
  onOpen: (entry: LeaderboardEntry) => void;
  onPlay: () => void;
}) {
  const { t } = useTranslation('progress');
  // Narrow or large text (rowFit.ts): "שחק" goes under my row, which then has the width for my name and its line.
  const tight = useTightRows();
  // The app's own small primary (D125), not a gold pill of its own: 40 high, a 44 touch target.
  const play = (label: string) => (
    <Button
      label={t('leaderboard.play')}
      size="sm"
      accessibilityLabel={label}
      onPress={onPlay}
      testID="leaderboard-play"
    />
  );
  if (me) {
    return (
      <View style={[styles.pinned, tight ? styles.pinnedStack : styles.pinnedRow]} testID="leaderboard-me">
        <View style={tight ? null : styles.grow}>
          <LeaderboardRow entry={me} mine onOpen={onOpen} compact testID="leaderboard-me-row" />
        </View>
        {play(t('leaderboard.climbHint'))}
      </View>
    );
  }
  return (
    <View style={[styles.pinned, styles.pinnedRow, styles.pinnedEmpty]} testID="leaderboard-me-none">
      <SeatGlyph colorIndex={0} size={GLYPH} />
      <Text style={[text('caption'), styles.muted, styles.grow]}>{t('leaderboard.meNone')}</Text>
      {play(t('leaderboard.playHint'))}
    </View>
  );
}

const RANK_WIDTH = space[14];

const styles = StyleSheet.create({
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space[4],
    paddingTop: space[6],
  },
  podiumColumn: { flex: 1, minWidth: 0, alignItems: 'center', gap: space[3] },
  podiumName: { flexDirection: 'row', alignItems: 'center', gap: space[2], maxWidth: '100%' },
  podiumRating: { maxWidth: '100%' },
  step: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space[2],
    borderTopWidth: tokens.border.badgeRing,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    backgroundColor: color.surface,
  },
  meChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[3],
    borderRadius: radius.pill,
    backgroundColor: ME.ring,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[5],
    minHeight: size.listRow,
    paddingHorizontal: space[5],
    // The card surface (PressableCard, D125) gives the fill, the lit border, the radius and the base.
    borderWidth: tokens.border.hairline,
  },
  rank: { width: RANK_WIDTH, textAlign: 'center' },
  rankCompact: { minWidth: space[10], textAlign: 'center' },
  // A larger number takes its width rather than an ellipsis ("#1234" at font 1.3).
  rankTight: { minWidth: RANK_WIDTH, textAlign: 'center' },
  who: { flex: 1, minWidth: 0, alignItems: 'flex-start', gap: space[2] },
  under: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space[2],
    maxWidth: '100%',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], maxWidth: '100%' },
  shrink: { flexShrink: 1 },
  grow: { flex: 1 },
  pinned: {
    paddingHorizontal: tokens.layout.gutterGame,
    paddingVertical: space[4],
    borderTopWidth: tokens.border.hairline,
    borderTopColor: color.border,
  },
  pinnedRow: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  pinnedStack: { gap: space[4] },
  pinnedEmpty: { minHeight: size.listRow },
  strong: { color: color.text },
  muted: { color: color.textMuted },
  me: { color: ME.ring },
  onMe: { color: ME.onRing },
});
