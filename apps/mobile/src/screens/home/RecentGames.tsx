import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Icon, type IconName } from '../../components/Icon';
import { Avatar, type GameResultKind, ltr, scoreText } from '../../components/player';
import { LARGE_TEXT_SCALE, SkeletonGroup, SkeletonRows } from '../../components/ui';
import { Enter, type ListEntrance } from '../../components/ui/Enter';
import { PressableCard } from '../../components/ui/tactile';
import { Text } from '../../components/ui/Text';
import type { PracticeGameRecord } from '../../game/practiceRepo';
import { decimalSeparator } from '../../i18n/compose';
import type { PracticeHistoryState } from '../../state/practiceHistory';
import { color, radius, size, space, text, tokens } from '../../theme';
import { playerIdentity } from '../game/identity';
import { playedAtText, type RecentOutcome, recentOutcome } from './homeModel';
import { Chip, linesAt } from './parts';

const OUTCOME_ICON: Record<RecentOutcome, IconName> = {
  completed: 'check',
  ended: 'surrender',
  win: 'trophy',
  loss: 'surrender',
  tie: 'check',
  interrupted: 'pause',
  playing: 'history',
};

/** The avatar's result badge (Dir-C-Home: "נ" on a won game). */
const RESULT_BADGE: Partial<Record<RecentOutcome, GameResultKind>> = {
  win: 'win',
  loss: 'loss',
  tie: 'draw',
};

export interface RecentGamesProps {
  games: readonly PracticeGameRecord[];
  status: PracticeHistoryState['status'];
  onOpen: (gameId: string) => void;
  /** The rows stagger in (`list.enter`): Home's first view of a session. Left out, they are simply there. */
  entrance?: ListEntrance;
}

/**
 * "משחקים אחרונים" on Home (spec §4.3): the newest practices saved on this phone [D25], each opening its
 * results. Interrupted games are listed too, marked. A game against a bot shows the bot's avatar with the
 * result badge (Dir-C-Home), and reads "ניצחון מול Pip". While the first read is under way the rows show as a
 * skeleton (Loading.dc.html, stage 13), so the empty state never flashes before the games arrive; a later
 * read (Home back in view) keeps what is there.
 */
export function RecentGames({ games, status, onOpen, entrance }: RecentGamesProps) {
  const { t } = useTranslation('home');
  // Derived during render (no extra effect pass): once read, a new read shows no skeleton.
  const [read, setRead] = useState(status === 'ready');
  if (status === 'ready' && !read) setRead(true);
  if (status === 'unavailable') {
    return (
      <Text style={styles.note} testID="recent-unavailable">
        {t('recent.unavailable')}
      </Text>
    );
  }
  if (!games.length) {
    if (status !== 'ready') {
      if (read) return null;
      return (
        <SkeletonGroup label={t('history:loading')} testID="recent-loading">
          <SkeletonRows count={RECENT_SKELETON_ROWS} trailing />
        </SkeletonGroup>
      );
    }
    return (
      <View style={styles.empty} testID="recent-empty">
        <Text style={styles.emptyTitle}>{t('recent.emptyTitle')}</Text>
        <Text style={styles.note}>{t('recent.emptyBody')}</Text>
      </View>
    );
  }
  return (
    <View style={styles.list} testID="recent-list">
      {games.map((game, index) => (
        <Enter
          key={game.id}
          index={index}
          enabled={entrance !== undefined && entrance.enabled !== false}
          play={entrance?.play}
          delayMs={entrance?.delayMs}
        >
          <RecentRow game={game} onPress={() => onOpen(game.id)} />
        </Enter>
      ))}
    </View>
  );
}

function RecentRow({ game, onPress }: { game: PracticeGameRecord; onPress: () => void }) {
  const { t, i18n } = useTranslation('home');
  const { fontScale } = useWindowDimensions();
  const outcome = recentOutcome(game);
  const title = t('recent.title', {
    mode: t(`modes.${game.mode}.name`),
    type: t(`gameTypes.${game.gameType}.name`),
  });
  const opponent = game.opponents[0] ? playerIdentity(game.opponents[0]) : null;
  const badge = RESULT_BADGE[outcome] ?? null;
  // "ניצחון מול Pip": a Latin name keeps its own order inside Hebrew.
  const outcomeText =
    opponent && badge
      ? t('recent.versus', {
          outcome: t(`recent.outcome.${outcome}`),
          name: ltr(opponent.name ?? t('player:unknownName')),
        })
      : t(`recent.outcome.${outcome}`);
  const when = playedAtText(game.startedAt, i18n.language);
  const decimal = decimalSeparator(t);
  const score = game.score === null ? t('profile.none') : scoreText(game.score, decimal);
  const mistakes = game.mistakes === null ? null : t('player:mistakes.short', { count: game.mistakes });
  const label = [
    title,
    outcomeText,
    game.score === null
      ? null
      : t('player:points', { count: game.score, score: scoreText(game.score, decimal) }),
    mistakes,
    when,
  ]
    .filter(Boolean)
    .join(t('player:listSep'));

  // With large text the score and the mistakes go under the words, which then have the row's width less the
  // picture and the chevron: beside them, a long word of the title had no line of its own (QA
  // levels-new-game-small-phone, loop 5: "Practice…" at 1.3; "Entraînement", "Тренировка" broke inside).
  const under = fontScale >= LARGE_TEXT_SCALE;
  const numbers = (
    <View style={under ? styles.numbersUnder : styles.numbers} testID={`recent-numbers-${game.id}`}>
      <Text style={styles.score}>{score}</Text>
      {mistakes ? (
        <Text style={styles.sub} numberOfLines={linesAt(fontScale, 1)}>
          {mistakes}
        </Text>
      ) : null}
    </View>
  );

  // A tappable card (D125): the surface on its base, the one card press and its tick.
  return (
    <PressableCard
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={t('recent.openHint')}
      onPress={onPress}
      style={styles.row}
      testID={`recent-${game.id}`}
    >
      {opponent ? (
        <Avatar avatarId={opponent.avatar} size="list" result={badge} testID={`recent-avatar-${game.id}`} />
      ) : (
        <View style={styles.iconBox}>
          <Icon name={OUTCOME_ICON[outcome]} size={size.icon.card} color={color.textMuted} />
        </View>
      )}
      <View style={styles.texts}>
        <Text style={styles.title} numberOfLines={linesAt(fontScale, TITLE_LINES)}>
          {title}
        </Text>
        {/* B4: the date goes under the result when the two don't fit one line; on a narrow phone in a long
            language either may take a second line, never an ellipsis that hides the bot's name or the time. */}
        <View style={styles.subRow} testID={`recent-sub-${game.id}`}>
          {outcome === 'interrupted' ? (
            <Chip label={outcomeText} testID={`interrupted-${game.id}`} />
          ) : (
            <Text style={styles.sub} numberOfLines={linesAt(fontScale, SUB_LINES)}>
              {outcomeText}
            </Text>
          )}
          <Text style={styles.sub} numberOfLines={linesAt(fontScale, SUB_LINES)}>
            {when}
          </Text>
        </View>
        {under ? numbers : null}
      </View>
      {under ? null : numbers}
      {/* With large text the chevron's room goes to the words ("Entraînement" at 2.0 had no line of its own
          beside it); the row is still a button, with its hint. */}
      {under ? null : <Icon name="chevronForward" size={size.icon.chevron} color={color.iconFaint} />}
    </PressableCard>
  );
}

/** Rows in the loading skeleton: as many as Home shows. */
const RECENT_SKELETON_ROWS = 3;
/**
 * The most lines a game's title takes ("Practice vs bot · Normal"): a second line, broken between words, rather
 * than "…"; with large text no cap at all (linesAt), as the words need (QA levels-new-game-small-phone, loop 5:
 * "Practice…", "Solo pra…" at font scale 1.3 on a 360 dp phone).
 */
export const TITLE_LINES = 2;
/** The most lines the result or the date takes (B4). */
const SUB_LINES = 2;

const styles = StyleSheet.create({
  list: { gap: space[4] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[6],
    minHeight: size.listRow,
    paddingHorizontal: space[6],
    paddingVertical: space[4],
    // The card surface (PressableCard, D125) gives the fill, the lit border, the radius and the base.
    borderWidth: tokens.border.hairline,
  },
  iconBox: {
    width: size.avatar.list.size,
    height: size.avatar.list.size,
    borderRadius: size.avatar.list.radius,
    backgroundColor: color.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, minWidth: 0, alignItems: 'flex-start', gap: space[3] },
  title: { ...text('rowTitle'), color: color.text },
  // B4: "הפסד מול Mr. Hoot" and the date side by side cut both ("הפסד מול Mr. …", "23 באוק׳, 0…").
  subRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    alignSelf: 'stretch',
    columnGap: space[4],
    rowGap: space[2],
  },
  sub: { ...text('caption'), color: color.textMuted, flexShrink: 1 },
  numbers: { alignItems: 'flex-end', gap: space[2] },
  // Large text: under the words, the score and then the mistakes, wrapping to a line of their own if need be.
  numbersUnder: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    alignSelf: 'stretch',
    columnGap: space[4],
    rowGap: space[2],
  },
  score: { ...text('scoreSm'), color: color.text },
  note: { ...text('bodyLong'), color: color.textMuted },
  empty: {
    gap: space[3],
    padding: space[8],
    borderRadius: radius.button,
    borderWidth: tokens.border.hairline,
    borderColor: color.border,
  },
  emptyTitle: { ...text('rowTitle'), color: color.text },
});
