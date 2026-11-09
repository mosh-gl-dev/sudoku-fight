import type { GameMode } from '@sudoku-fight/engine';
import { router } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  StyleSheet,
  type TextLayoutEvent,
  type TextStyle,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, { FadeIn, FadeInUp, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AVATAR_STAGES, type AvatarIdOrNone, endFaceOf, useAfter } from '../../avatars';
import { Icon } from '../../components/Icon';
import {
  Avatar,
  CountUpText,
  formatScore,
  ltr,
  MoveText,
  paletteAt,
  scoreFormat,
  scoreText,
  signedText,
} from '../../components/player';
import { Button, LARGE_TEXT_SCALE, Spinner } from '../../components/ui';
import { Confetti } from '../../components/ui/Confetti';
import { framesPassed, SWAP_FRAMES } from '../../components/ui/retire';
import { Text } from '../../components/ui/Text';
import { decimalSeparator, labelValue, stopSentences } from '../../i18n/compose';
import { crashReporter } from '../../services/crashlytics';
import { cue } from '../../services/feedback';
import { openPlayerCard } from '../player/navigation';
import { useProfile } from '../../state/profile';
import { appTypeface, color, lineHeightIn, radius, size, space, text, tokens, uiFont } from '../../theme';
import { motion, useReduceMotion } from '../../theme/motion';
import type { UiWeight } from '../../theme/typeface';
import { formatClock, formatSeconds } from '../game/model';
import {
  type BestMoveModel,
  myEndCue,
  type PlayAgain,
  playAgainOf,
  type ResultsLoad,
  type ResultsModel,
  SCORE_COUNTS,
  type ScoreCount,
} from './resultsModel';
import { type Entrance, COUNT_MS, SECTION_RISE, useCountPhase, useEntrance, victory } from './resultsMotion';
import {
  AwardsSection,
  HeadBadge,
  type HeadTone,
  OpponentsSection,
  RankingSection,
  RatingSection,
} from './ResultsVersus';
import { useScreenReaderOn } from './useScreenReaderOn';
import { useScrolledIntoView } from './useScrolledIntoView';

/**
 * The results of a game (spec §12; Results-Victory / Results-Defeat / Results-4P in direction C).
 *
 * At the top, the hero: my avatar (my P1 frame, idling on the results' stage, its face taking the end), a crown
 * over it after a win, then the headline in the display size (ניצחון / הפסד / תיקו / "מקום 2!", or how a
 * practice ended), my final place ("מקום 1 מתוך 2"), the "ניצחת בנטישה" tag (spec §12, §16.2), how it ended, and
 * my final score. A win lands (motion.md §4.7): the title slams, the place and the crown pop, one burst of
 * confetti falls behind the cards, the score counts up; anything else enters calmly; with reduced motion every
 * part is simply there (no confetti).
 *
 * Below: the opponent's row, or the full ranking of 3–4 players (a podium and the 4th); my rating change counting
 * from the old rating to the new one in a rated game (a practice changes none, spec §6.6, and says so); the move
 * of the game, told in plain words from the engine's breakdown (how full the row, column and box were, how many
 * of its digit were down, and which two of those set the score); the time, the correct moves and the average
 * think time; the game's awards, one line each. A practice is read from the saved game, so it works after an app
 * restart too. Buttons: "משחק חדש" (the one gold action: the same kind of game again, in one tap), "צפייה
 * חוזרת" (the game's replay) and "לבית".
 */
export interface ResultsScreenProps {
  gameId: string;
  load: (id: string) => Promise<ResultsLoad>;
  /**
   * Already read (the game that just ended, resultsHandoff.ts): drawn in the first commit, with no load, and the
   * hero in view from that first frame (the stack's fade brings it in over the final board).
   */
  initial?: ResultsLoad | null;
  /**
   * When the stack's transition into the screen ended, ms after its first commit (app/results/[id].tsx,
   * useStackEntered.ts); null while it runs. Until then the results draw only their top bar, hero and score; the
   * rest mounts once it is, its entrances still timed from the screen's first frame.
   */
  entered?: number | null;
  /**
   * "משחק חדש": the same kind of game again (UX-2), as the route decides from what this game was. The button
   * shows a spinner until a returned promise settles.
   */
  onNewGame: (again: PlayAgain) => void | Promise<unknown>;
  onHome: () => void;
  /** "צפייה חוזרת": the game's replay (default: the /replay route, from the phone or the server). */
  onReplay?: (gameId: string, mode: GameMode) => void;
  /** Another player of a ranked game: their card, with this game for a report (the /player route by default). */
  onOpenPlayer?: (playerId: string, gameId: string) => void;
  /** The game was just played here: it gets its sounds (motion.md §7, "Win"; the score's count ticks). */
  celebrate?: boolean;
  testID?: string;
}

const ME = paletteAt(0);

/** The replay route: a practice from the phone's log, a ranked game from the server (spec §13). */
export const openReplay = (gameId: string, mode: GameMode): void =>
  router.push({
    pathname: '/replay/[id]',
    params: { id: gameId, source: mode === 'ranked' ? 'ranked' : 'practice' },
  });

export function ResultsScreen({
  gameId,
  load,
  initial = null,
  entered = 0,
  onNewGame,
  onHome,
  onReplay = openReplay,
  onOpenPlayer = openPlayerCard,
  celebrate = false,
  testID = 'results',
}: ResultsScreenProps) {
  const { t } = useTranslation('game');
  const insets = useSafeAreaInsets();
  // Handed over (`initial`): this game's results from the first render on, never read again.
  const [handedFor] = useState(() => (initial ? gameId : null));
  const [loaded, setLoaded] = useState<{ id: string; result: ResultsLoad } | null>(() =>
    initial ? { id: gameId, result: initial } : null,
  );

  useEffect(() => {
    if (handedFor === gameId) {
      crashReporter().log('results: handed over');
      return;
    }
    let alive = true;
    crashReporter().log('results: loading');
    const show = (result: ResultsLoad) => {
      crashReporter().log(`results: ${result.kind}`);
      if (alive) setLoaded({ id: gameId, result });
    };
    // A load that fails says so ("unavailable", with "לבית"), reported, instead of a spinner for ever.
    load(gameId).then(show, (error: unknown) => {
      crashReporter().recordError(error, 'results: could not load');
      show({ kind: 'unavailable' });
    });
    return () => {
      alive = false;
    };
  }, [gameId, load, handedFor]);

  const result = loaded?.id === gameId ? loaded.result : null;
  const model = result?.kind === 'found' ? result.model : null;

  // Just played: a full board alone, or a game against a bot, gets its sound as the title lands (+200 ms).
  const fanfare =
    !celebrate || !model
      ? null
      : model.outcome === 'win'
        ? 'win'
        : model.outcome === 'loss'
          ? 'lose'
          : model.players === 1 && model.end === 'completed'
            ? 'practiceDone'
            : null;
  useEffect(() => {
    if (!fanfare) return;
    const id = setTimeout(() => cue(fanfare), victory.slamAt);
    return () => clearTimeout(id);
  }, [fanfare]);

  const padding = { paddingTop: insets.top + space[4], paddingBottom: insets.bottom + space[8] };

  if (!result) return <ResultsLoading padding={padding} testID={testID} />;

  if (!model) {
    return (
      <View style={[styles.root, styles.center, padding]} testID={`${testID}-${result.kind}`}>
        <Icon name="alert" size={size.icon.nav} color={color.textMuted} />
        <Text style={[text('sheetTitle'), styles.title]} accessibilityRole="header">
          {result.kind === 'missing' ? t('results.missing') : t('results.unavailable')}
        </Text>
        <Button
          label={t('results.actions.home')}
          icon="home"
          onPress={onHome}
          size="md"
          testID="results-home"
        />
      </View>
    );
  }

  return (
    <ResultsBody
      model={model}
      arrived={handedFor === gameId}
      entered={entered}
      celebrate={celebrate}
      onNewGame={onNewGame}
      onHome={onHome}
      onReplay={onReplay}
      onOpenPlayer={onOpenPlayer}
      padding={padding}
      testID={testID}
    />
  );
}

/**
 * How long the results' loading state stays unseen, ms. Results that read for themselves wait two frames
 * (app/results/[id].tsx, QA run #3) and then draw: the spinner and "טוען…" would flash in between. Only a load
 * slower than this shows them. (A game that just ended hands its results over, with no loading state at all:
 * on Android the stack's fade is a fixed 150 ms on the first commit, and this one is empty; resultsHandoff.ts.)
 */
export const RESULTS_QUIET_MS = 300;

/**
 * The rating card mounted after the stack's fade (useStackEntered.ts): the least time its glide and count wait from
 * its mount, ms, so its layout is in first; also the gap between the glide's retries (REVEAL_RETRIES) while it is
 * not (loop 12 review: a glide tried before the card's onLayout never moved, and the count then waited for a scroll).
 */
export const RATING_SETTLE_MS = 300;
const REVEAL_RETRIES = 3;

/** The spinner and "טוען את התוצאה…", once the load has taken RESULTS_QUIET_MS (the same place and look). */
function ResultsLoading({ padding, testID }: { padding: ViewStyle; testID: string }) {
  const { t } = useTranslation('game');
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setSeen(true), RESULTS_QUIET_MS);
    return () => clearTimeout(id);
  }, []);
  return (
    <View style={[styles.root, styles.center, padding]} testID={`${testID}-loading`}>
      <View style={[styles.loading, seen ? null : styles.unseen]} testID={`${testID}-loading-shown`}>
        <Spinner color={color.textMuted} />
        <Text style={[text('body'), styles.muted]} accessibilityLiveRegion="polite">
          {t('results.loading')}
        </Text>
      </View>
    </View>
  );
}

function ResultsBody({
  model,
  arrived,
  entered,
  celebrate,
  onNewGame,
  onHome,
  onReplay,
  onOpenPlayer,
  padding,
  testID,
}: {
  model: ResultsModel;
  /** Drawn in the commit that opened the screen (handed over): the hero is in view from its first frame. */
  arrived: boolean;
  /** When the stack's transition into the screen ended, or null while it runs (ResultsScreenProps.entered). */
  entered: number | null;
  celebrate: boolean;
  onNewGame: (again: PlayAgain) => void | Promise<unknown>;
  onHome: () => void;
  onReplay: (gameId: string, mode: GameMode) => void;
  onOpenPlayer: (playerId: string, gameId: string) => void;
  padding: { paddingTop: number; paddingBottom: number };
  testID: string;
}) {
  const { t } = useTranslation('game');
  const { t: th } = useTranslation('history');
  const myAvatar = useProfile((s) => s.avatarId);
  const reduce = useReduceMotion();
  // The parts below the hero: in the first commit, or (handed over, on Android) once the stack's fade is over
  // (useStackEntered.ts), their entrances then shortened by the time gone, so the sequence (motion.md §4.7) still
  // starts at the screen's first frame.
  const rest = entered !== null;
  const since = entered ?? 0;
  const after = (at: number) => Math.max(0, at - since);
  const enter = enteringFor(reduce, since);
  // Results-Victory: "משחק חדש" and "צפייה חוזרת" side by side, a long label shrinking in its button (German
  // stacked them, B21). Only the phone's large text puts the second on its own line.
  const stackActions = useWindowDimensions().fontScale >= LARGE_TEXT_SCALE;
  // My rating's count runs where it is seen: below the fold (a 1080 × 2340 phone, QA loop 8) it waits until
  // scrolled to.
  const ratingInView = useScrolledIntoView();
  // ...and is brought there as it would count (QA fixcheck of APK 14: after an abandon win only the card's title
  // was above the bar): the view glides up just enough for the number, then it counts. Not under Reduced Motion
  // (the new rating is simply there, nothing moves), nor once the user has scrolled, nor by more than a part of
  // the screen (a four-player ranking: the user scrolls to it), nor with a screen reader on (the screen must not
  // move under its focus; the count is not for it).
  const { reveal } = ratingInView;
  const rated = model.rating !== null;
  const screenReader = useScreenReaderOn();
  // The glide and the count, from the card's mount: at ratingCountAt from the screen's first frame, as the rest
  // came; a card that mounted late (handed over, after Android's fade) still gets RATING_SETTLE_MS to lay out first,
  // and the glide retries while its layout is not in (it never moves a part already seen or dragged past).
  const ratingAt =
    since > 0 ? Math.max(RATING_SETTLE_MS, after(victory.ratingCountAt)) : victory.ratingCountAt;
  useEffect(() => {
    if (!rated || !rest || reduce || screenReader) return;
    let tries = 0;
    let id: ReturnType<typeof setTimeout>;
    const glide = () => {
      if (!reveal(space[8], true) && ++tries <= REVEAL_RETRIES) id = setTimeout(glide, RATING_SETTLE_MS);
    };
    id = setTimeout(glide, ratingAt);
    return () => clearTimeout(id);
  }, [rated, rest, ratingAt, reduce, screenReader, reveal]);
  const none = t('results.stats.none');
  const decimal = decimalSeparator(t);
  // Another player's card from here carries this game: a report from it is about this game (spec §3.5).
  const { gameId } = model;
  const openPlayer = useCallback(
    (playerId: string) => onOpenPlayer(playerId, gameId),
    [onOpenPlayer, gameId],
  );
  const versus = model.players > 1;
  const win = model.outcome === 'win';
  // A win lands in full (motion.md §4.7): the confetti, the score's count, the awards one by one.
  const lands = win && !reduce;
  // A full board against someone was filled by both: "the board filled up", not "you filled it".
  const reason = versus && model.end === 'completed' ? t('results.end.full') : t(`results.end.${model.end}`);
  // Results-4P: behind the winner in a game of 3–4 the headline is the place ("מקום 2!"), not "הפסד".
  const placeTitle = model.outcome === 'loss' && model.players >= 3 && model.place !== null;
  const title = placeTitle
    ? t('results.placeTitle', { place: model.place })
    : model.outcome
      ? t(`results.outcome.${model.outcome}`)
      : t(`results.title.${model.end}`);
  // Spec §12 "מקום סופי": "מקום 1 מתוך 2" (Results-Victory), or "מתוך 4 שחקנים" under "מקום 2!" (Results-4P).
  const players = t('progress:common.players', { count: model.players });
  const placeLine =
    model.place === null
      ? null
      : placeTitle
        ? t('results.outOf', { players })
        : t('results.placeOf', { place: model.place, total: model.players });
  const ranked = model.mode === 'ranked';
  // A friends room's game (1.0.4) is a ranked game without a rating [D81a]: named for what it is.
  const modeTitle = model.friends
    ? t('friends:modeLong')
    : ranked
      ? t('titleRanked')
      : model.mode === 'bot'
        ? t('titleBot')
        : t('title');
  const type = t(`type.${model.gameType}`);
  const header = versus
    ? t('results.header', { title: modeTitle, type, players })
    : t('subtitle', { title: modeTitle, type });
  const gold = model.outcome ? win : model.end === 'completed';
  // Gold lands (slam); a plain "הפסד" is said quietly (muted), the rest in the text colour.
  const tone: TitleTone = gold ? 'gold' : model.outcome === 'loss' && !placeTitle ? 'muted' : 'plain';

  const again = playAgainOf(model);
  // One start at a time: a second tap before the first settles does nothing (the button shows its spinner).
  const [starting, setStarting] = useState(false);
  const busy = useRef(false);
  const gone = useRef(false);
  useEffect(() => {
    // Set on every mount too: StrictMode and <Activity> run cleanup and then mount the same instance again.
    gone.current = false;
    return () => {
      gone.current = true;
    };
  }, []);
  const newGame = async () => {
    if (busy.current) return;
    busy.current = true;
    setStarting(true);
    try {
      // The spinner is mounted in a frame of its own before the next screen is (K1): a ranked or friends start
      // navigates at once, and that change to the results in the same commit as the new screen tore the React
      // host down on Android (see Button.tsx). The frames keep any last change of the results apart from it.
      await framesPassed(SWAP_FRAMES);
      if (gone.current) return;
      await onNewGame(again);
    } finally {
      busy.current = false;
      if (!gone.current) setStarting(false);
    }
  };
  const newGameHint = again.friends
    ? t('results.again.friends')
    : again.mode === 'bot'
      ? again.botName
        ? t('results.again.bot', { bot: ltr(again.botName), type })
        : t('results.again.botAny', { type })
      : t(`results.again.${again.mode}`, { type });

  const stats: { key: string; label: string; value: string }[] = [
    {
      key: 'time',
      label: t('results.stats.time'),
      value: model.durationMs === null ? none : formatClock(model.durationMs),
    },
    { key: 'mistakes', label: t('results.stats.mistakes'), value: String(model.mistakes) },
    { key: 'correct', label: t('results.stats.correct'), value: String(model.correct) },
    {
      key: 'think',
      label: t('results.stats.think'),
      value:
        model.avgThinkMs === null
          ? none
          : t('results.stats.seconds', { value: formatSeconds(model.avgThinkMs, decimal) }),
    },
  ];

  return (
    <View style={styles.root} testID={testID}>
      {/* One burst, behind the cards (motion.md §4.7: "kept clear of the score cards"); never under reduced motion. */}
      {lands && rest ? <Confetti delayMs={after(victory.crownAt)} testID="results-confetti" /> : null}
      {/* Fixed above the scroll view, not in it (fixcheck APK 16): when the view glides to the rating card, or the
          user scrolls, "לבית" stays where it is, below the status bar and always reachable. At the top of the
          scroll the layout is as it was: its bottom padding and the content's top padding add up to the gap. */}
      <View style={[styles.header, styles.top, { paddingTop: padding.paddingTop }]} testID="results-top">
        <Button
          label={t('results.actions.home')}
          icon="home"
          variant="ghost"
          onPress={onHome}
          testID="results-home"
        />
        {/* All of it, on a second line if it must ("Training gegen Bot • Schnell • 2 Spieler", B22). */}
        <Text style={[text('caption'), styles.muted, styles.shrink]} testID="results-header">
          {header}
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, styles.scrollTop]}
        {...(model.rating ? ratingInView.scroll : null)}
        testID={`${testID}-scroll`}
      >
        <Hero
          model={model}
          myAvatar={myAvatar}
          title={title}
          tone={tone}
          placeLine={placeLine}
          reason={t('results.end.line', { label: t('results.end.label'), reason })}
          reduce={reduce}
          arrived={arrived}
        />

        <FinalScore score={model.score} counts={lands} celebrate={celebrate} reduce={reduce} />

        {!rest ? null : model.ranking.length ? (
          <Animated.View entering={enter.section(1)}>
            <RankingSection
              ranking={model.ranking}
              myAvatar={myAvatar}
              onOpenPlayer={ranked ? openPlayer : undefined}
              growAt={reduce ? null : after(victory.crownAt + victory.awardsStagger)}
            />
          </Animated.View>
        ) : model.opponents.length ? (
          <Animated.View entering={enter.section(1)}>
            <OpponentsSection
              opponents={model.opponents}
              outcome={model.outcome}
              onOpenPlayer={ranked ? openPlayer : undefined}
            />
          </Animated.View>
        ) : null}

        {rest && model.rating ? (
          <Animated.View
            entering={enter.section(1)}
            onLayout={ratingInView.onBlockLayout}
            testID="results-rating-block"
          >
            <RatingSection
              rating={model.rating}
              gameType={model.gameType}
              pairs={model.ratingPairs}
              guards={model.ratingGuards}
              waiting={ratingInView.below}
              onValueLayout={ratingInView.onPartLayout}
              countAt={ratingAt}
            />
          </Animated.View>
        ) : null}

        {rest ? (
          <Animated.View entering={enter.section(2)}>
            <BestMove best={model.bestMove} />
          </Animated.View>
        ) : null}

        {rest ? (
          <Animated.View entering={enter.section(3)} style={styles.grid}>
            {stats.map((s) => (
              <View
                key={s.key}
                style={styles.tile}
                accessible
                accessibilityRole="text"
                accessibilityLabel={t('results.stats.label', { label: s.label, value: s.value })}
                testID={`results-stat-${s.key}`}
              >
                <Text style={[text('cellRef'), styles.strong]}>{s.value}</Text>
                <Text style={[text('micro'), styles.muted]} numberOfLines={2}>
                  {s.label}
                </Text>
              </View>
            ))}
          </Animated.View>
        ) : null}

        {rest && model.awards.length ? (
          // After a win the awards come in at +1500, one by one (motion.md §4.7 `awards`); else with their card.
          <Animated.View entering={lands ? enter.at(victory.awardsAt) : enter.section(4)}>
            <AwardsSection awards={model.awards} popAt={lands ? after(victory.awardsAt) : null} />
          </Animated.View>
        ) : null}

        {rest && versus && !model.rating ? (
          <Text style={[text('caption'), styles.muted, styles.centered]} testID="results-unrated">
            {model.friends ? t('friends:label') : ranked ? t('results.ratingSoon') : t('results.unrated')}
          </Text>
        ) : null}

        {!rest || model.saved || ranked ? null : (
          <Text style={[text('caption'), styles.muted, styles.centered]}>{t('results.notSaved')}</Text>
        )}
      </ScrollView>
      {/* The status bar's band in the screen's colour: nothing (the confetti) is drawn under the phone's clock and
          icons (the screen draws edge to edge); the cards scroll only below the fixed header. */}
      <View
        style={[styles.statusBand, { height: padding.paddingTop - space[4] }]}
        pointerEvents="none"
        testID="results-status-band"
      />

      {rest ? (
        <Animated.View
          entering={enter.actions}
          style={[
            styles.actions,
            stackActions ? styles.actionsStacked : null,
            { paddingBottom: padding.paddingBottom },
          ]}
          testID="results-actions"
        >
          <Button
            label={t('results.actions.newGame')}
            size="md"
            onPress={() => void newGame()}
            loading={starting}
            accessibilityHint={newGameHint}
            style={styles.action}
            testID="results-new-game"
          />
          {/* Beside the gold one, the secondary skews with it (the pair rule, D130, components.md §1.0). */}
          <Button
            label={th('results.replay')}
            icon="history"
            variant="secondary"
            skew
            size="md"
            onPress={() => onReplay(model.gameId, model.mode)}
            accessibilityHint={th('results.replayHint')}
            style={styles.action}
            testID="results-replay"
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

/** How the headline is said: gold (a win, a full board), plain, or muted (a plain loss: calm, VIS-4). */
type TitleTone = 'gold' | 'plain' | 'muted';

/**
 * The hero (VIS-4): my avatar with the end's face (it reacts as the crown lands, and idles on the results'
 * stage), the crown over it after a win, the headline, my place and the abandonment tag, and how it ended.
 * Gold slams in at +200 and its badges pop at +700 (motion.md §4.7 `results.title.win`, `results.rank`); the
 * rest drops in quietly at +200 (`results.title.loss`). Reduced motion: all of it fades in at once.
 * `arrived` (a game that just ended, its results handed over): the avatar, the headline, the place and the end
 * line are opaque from the first frame, the stack's fade over the final board being their fade; their moves start
 * at once. Only the crown and a win's place badge still pop in at +700, accents over a hero already there.
 */
function Hero({
  model,
  myAvatar,
  title,
  tone,
  placeLine,
  reason,
  reduce,
  arrived,
}: {
  model: ResultsModel;
  myAvatar: AvatarIdOrNone;
  title: string;
  tone: TitleTone;
  placeLine: string | null;
  reason: string;
  reduce: boolean;
  arrived: boolean;
}) {
  const { t } = useTranslation('game');
  const gold = tone === 'gold';
  const win = model.outcome === 'win';
  const titleIn: Entrance = gold ? 'slam' : 'drop';
  const avatarStyle = useEntrance('rise', 0, reduce, arrived);
  const titleStyle = useEntrance(titleIn, victory.slamAt, reduce, arrived);
  const badgeStyle = useEntrance(
    gold ? 'pop' : 'drop',
    gold ? victory.crownAt : victory.slamAt,
    reduce,
    arrived && !gold,
  );
  const crownStyle = useEntrance('pop', victory.crownAt, reduce);
  const lineStyle = useEntrance('fade', victory.slamAt, reduce, arrived);
  // My face takes the end as the crown lands (AvatarArt never plays a reaction on its first render).
  const play = useAfter(reduce ? motion.duration.reducedFade : victory.crownAt);
  const face = endFaceOf(myEndCue(model), play);
  return (
    <View style={styles.hero}>
      <Animated.View style={[styles.heroAvatar, avatarStyle]}>
        <Avatar
          avatarId={myAvatar}
          size="profile"
          colorIndex={0}
          expression={face.expression}
          reaction={face.reaction}
          // The results are the winner's stage (spec §3.4, AVATAR_STAGES): my avatar lives on there after a win
          // (or a full board); behind, tied or out early it holds its face still, as ResultsVersus's do.
          idle={AVATAR_STAGES.winner && myEndCue(model) === 'win'}
          testID="results-hero-avatar"
        />
        {win ? (
          <Animated.View
            style={[styles.crownRow, crownStyle]}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            testID="results-crown"
          >
            <View style={styles.crown}>
              <Icon name="crown" size={CROWN_ICON} color={color.accent} />
            </View>
          </Animated.View>
        ) : null}
      </Animated.View>

      <Animated.View style={[styles.titleWrap, titleStyle]} testID="results-title-block">
        {gold ? (
          // The hard edge under the gold word, in the gold's own shade (the CTA's depth): a copy of it 4 dp lower,
          // not a text shadow (Android draws no shadow without a blur).
          <Text
            style={[DISPLAY_TITLE, styles.titleEdge]}
            numberOfLines={1}
            adjustsFontSizeToFit
            maxFontSizeMultiplier={TITLE_MAX_SCALE}
            aria-hidden
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            testID="results-title-edge"
          >
            {title}
          </Text>
        ) : null}
        <Text
          style={[DISPLAY_TITLE, styles.title, TITLE_COLOUR[tone]]}
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={TITLE_MAX_SCALE}
          accessibilityRole="header"
          testID="results-title"
        >
          {title}
        </Text>
      </Animated.View>

      {placeLine || model.abandonWin ? (
        <Animated.View style={[styles.tags, badgeStyle]} testID="results-tags">
          {placeLine ? (
            <View style={[styles.tag, model.place === 1 ? null : styles.tagPlain]} testID="results-place">
              {win ? <Icon name="crown" size={TAG_ICON} color={color.accent} /> : null}
              <Text style={[text('badge'), model.place === 1 ? styles.tagText : styles.strong]}>
                {placeLine}
              </Text>
            </View>
          ) : null}
          {model.abandonWin ? (
            <View style={styles.tag} testID="results-abandon-win">
              <Text style={[text('badge'), styles.tagText]}>{t('results.abandonWin')}</Text>
            </View>
          ) : null}
        </Animated.View>
      ) : null}

      <Animated.View style={lineStyle}>
        <Text style={[text('caption'), styles.muted, styles.centered]} testID="results-end">
          {reason}
        </Text>
      </Animated.View>
    </View>
  );
}

/**
 * My final score. After a win (full motion) it counts from 0 at +900 for 900 ms (motion.md §4.7, MOT-2) on the UI
 * thread, with the count's ticks when the game was just played; the plain number holds its place meanwhile (the
 * count never moves the layout) and takes over when the count is done. Otherwise the number is simply there.
 */
function FinalScore({
  score,
  counts,
  celebrate,
  reduce,
}: {
  score: number;
  counts: boolean;
  celebrate: boolean;
  reduce: boolean;
}) {
  const { t } = useTranslation('game');
  const decimal = decimalSeparator(t);
  const phase = useCountPhase(counts);
  const format = useMemo(() => scoreFormat(decimal), [decimal]);
  const style = useEntrance('rise', victory.crownAt, reduce);
  // The five ticks of a count (DS-Motion "MICRO TICKS"), as the count starts: only for a game just played.
  const ticking = celebrate && phase === 'counting';
  useEffect(() => {
    if (!ticking) return;
    const timers = motion.limits.countTicks.map((ms) => setTimeout(() => cue('countTick'), ms));
    return () => timers.forEach(clearTimeout);
  }, [ticking]);
  const shown = scoreText(score, decimal);
  return (
    <Animated.View
      style={[styles.scoreBlock, style]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={t('results.scoreLabel', { count: score, score: shown })}
    >
      <Text style={[text('label'), styles.muted]}>{t('results.score')}</Text>
      <View style={styles.scoreRow}>
        <View>
          <Text
            style={[text('scoreXL'), styles.score, phase === 'done' ? null : styles.holding]}
            testID="results-score"
          >
            {shown}
          </Text>
          {phase === 'done' ? null : (
            <CountUpText
              value={phase === 'counting' ? score : 0}
              format={format}
              durationMs={COUNT_MS}
              style={[text('scoreXL'), styles.score, styles.counting]}
              testID="results-score-count"
            />
          )}
        </View>
        <Text style={[text('status'), styles.muted]}>{t('results.points')}</Text>
      </View>
    </Animated.View>
  );
}

/**
 * The move of the game (spec §12), in plain words (Moshe's 1.0.4 check: the engine's "points = 9 − 6 + …" line
 * was English and said nothing). Its points and the move, then the four counts the engine scored it by, on the
 * board before it: the filled cells in the row, the column and the box, and how many of its digit were down. The
 * two that set the score are marked, and one line says the rule: the emptier, the more it is worth; the fullest
 * weighs in full, the next by half (named, not numbered: the marks show which). Every number is the engine's
 * breakdown.
 */
function BestMove({ best }: { best: BestMoveModel | null }) {
  const { t } = useTranslation('game');
  const decimal = decimalSeparator(t);
  if (!best) {
    return (
      <Section
        title={t('results.best.title')}
        icon="trophy"
        tone="gold"
        label={t('results.best.none')}
        testID="results-best"
      >
        <Text style={[text('body'), styles.muted]}>{t('results.best.none')}</Text>
      </Section>
    );
  }
  const name = (c: ScoreCount) => t(`results.best.countName.${c}`, { digit: best.digit });
  const why = t('results.best.why', { highest: name(best.highest.count), next: name(best.next.count) });
  // A screen reader hears the counts as one list: "6 בשורה, 4 בטור, 6 בריבוע, הספרה 9 5 פעמים בלוח".
  const filled = SCORE_COUNTS.map((c) =>
    t(`results.best.filled.${c}`, { count: best.counts[c], digit: best.digit }),
  ).join(t('listSep'));
  const label = stopSentences(
    [
      t('results.best.label', {
        count: best.points,
        points: ltr(formatScore(best.points, decimal)),
        digit: best.digit,
        cell: ltr(best.cell),
      }),
      labelValue(t('results.best.before'), filled, t),
      why,
    ],
    t,
  );
  return (
    <Section title={t('results.best.title')} icon="trophy" tone="gold" label={label} testID="results-best">
      <View style={styles.bestRow}>
        <Text style={[text('rating'), styles.bestPoints]}>{signedText(best.points, decimal)}</Text>
        <MoveText
          move={t('results.best.move', { cell: best.cell, digit: best.digit })}
          style={[text('cellRef'), styles.strong]}
          testID="results-best-move"
        />
      </View>
      <Text style={[text('micro'), styles.muted]}>{t('results.best.before')}</Text>
      <CountChips best={best} />
      <Text style={[text('caption'), styles.muted]} testID="results-best-why">
        {why}
      </Text>
    </Section>
  );
}

/** How many of the four count chips share a line: all four (the design), two by two, or one a line. */
type CountColumns = 4 | 2 | 1;
/** A count's label may take this many lines in its chip; a longer one asks for fewer chips a line. */
const COUNT_LINES = 2;
const FEWER_COLUMNS: Readonly<Record<CountColumns, CountColumns>> = { 4: 2, 2: 1, 1: 1 };

/** Letters and digits: a line break between two of them cuts a word… */
const WORD_CHAR = /[\p{L}\p{N}\p{M}]/u;
/** …except in the scripts written without spaces, which break between any two letters (CJK, Thai). */
const BREAKS_ANYWHERE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u;

/**
 * Whether a text laid out in `lines` (React Native's onTextLayout: consecutive slices of it, a line's trailing
 * spaces in it or not) was broken inside a word: "בשור" + "ה", "Spielfel" + "d". Lines that are not slices of
 * `text` tell nothing: false.
 */
export function breaksInsideWord(text: string, lines: readonly string[]): boolean {
  let at = 0;
  for (const line of lines.slice(0, -1)) {
    if (!text.startsWith(line, at)) return false;
    at += line.length;
    let space = /\s$/.test(line);
    while (at < text.length && /\s/.test(text[at]!)) {
      at++;
      space = true;
    }
    const before = text[at - 1];
    const after = text[at];
    if (space || before === undefined || after === undefined) continue;
    if (WORD_CHAR.test(before) && WORD_CHAR.test(after) && !BREAKS_ANYWHERE.test(before + after)) return true;
  }
  return false;
}

/**
 * The four counts of the move of the game (B17, B21). Four in a row while every label fits its chip in up to
 * two lines broken between words; a label broken inside a word (Hebrew "בשור|ה" at the largest text, German
 * "Spiel|feld" on a narrow phone) or longer puts them two by two, then one a line. Each label reports its lines
 * as it is laid out, for the columns it was laid out in; a new window size, text size or language starts again
 * at four.
 */
function CountChips({ best }: { best: BestMoveModel }) {
  const { t, i18n } = useTranslation('game');
  const { width, fontScale } = useWindowDimensions();
  const key = `${width}:${fontScale}:${i18n.language}`;
  const [fit, setFit] = useState<{ key: string; columns: CountColumns }>({ key, columns: 4 });
  const columns = fit.key === key ? fit.columns : 4;
  const report = (at: CountColumns, label: string, e: TextLayoutEvent) => {
    const lines = e.nativeEvent.lines.map((l) => l.text);
    if (at === 1 || (lines.length <= COUNT_LINES && !breaksInsideWord(label, lines))) return;
    // Once per layout: the other labels of the same layout report the same columns, and change nothing more.
    setFit((f) => ((f.key === key ? f.columns : 4) === at ? { key, columns: FEWER_COLUMNS[at] } : f));
  };
  const deciding = new Set([best.highest.count, best.next.count]);
  return (
    // A new set of chips for each count of columns: a layout of the old one still on its way reports nothing.
    <View key={columns} style={styles.counts} testID="results-best-counts">
      {SCORE_COUNTS.map((c) => {
        const marked = deciding.has(c);
        const label = t(`results.best.count.${c}`, { digit: best.digit });
        return (
          <View
            key={c}
            style={[styles.count, COUNT_COLUMN[columns], marked ? styles.countMarked : null]}
            testID={`results-best-count-${c}${marked ? '-marked' : ''}`}
          >
            <Text style={[text('scoreCompact'), marked ? styles.countValueMarked : styles.strong]}>
              {best.counts[c]}
            </Text>
            <Text
              style={[text('micro'), styles.muted, styles.centered]}
              onTextLayout={(e) => report(columns, label, e)}
              testID={`results-best-count-${c}-label`}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** A count chip's share of its line: four equal chips, two, or the whole line. */
const COUNT_COLUMN: Readonly<Record<CountColumns, ViewStyle>> = {
  4: { flexBasis: 0 },
  2: { flexBasis: '40%' },
  1: { flexBasis: '100%' },
};

function Section({
  title,
  icon,
  tone,
  label,
  children,
  testID,
}: {
  title: string;
  icon: 'trophy';
  tone: HeadTone;
  label: string;
  children: ReactNode;
  testID: string;
}) {
  return (
    <View
      style={styles.section}
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
      testID={testID}
    >
      <View style={styles.sectionHead}>
        <HeadBadge icon={icon} tone={tone} />
        <Text style={[text('playerName'), styles.strong]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

/**
 * motion.md §4.7: the sections rise 14 dp from +700 (150 ms apart), the actions rise at +1900. Reduced motion:
 * 200 ms fades, together. (The hero and the score move by their own hooks: resultsMotion.ts.) `since`: how long
 * after the screen's first frame these parts mount (ResultsBody), taken off their delays.
 */
function enteringFor(reduce: boolean, since = 0) {
  const fade = FadeIn.duration(motion.duration.reducedFade).reduceMotion(ReduceMotion.Never);
  const rise = (delay: number) =>
    FadeInUp.duration(motion.duration.rewardMin)
      .delay(Math.max(0, delay - since))
      .withInitialValues({ opacity: 0, transform: [{ translateY: SECTION_RISE }] })
      .reduceMotion(ReduceMotion.Never);
  if (reduce) return { section: () => fade, at: () => fade, actions: fade };
  return {
    section: (i: number) => rise(victory.crownAt + i * victory.awardsStagger),
    at: rise,
    actions: FadeInUp.duration(motion.duration.stateChange)
      .delay(Math.max(0, victory.actionsAt - since))
      .withInitialValues({ opacity: 0, transform: [{ translateY: ACTIONS_RISE }] })
      .reduceMotion(ReduceMotion.Never),
  };
}

/** The actions rise 8 dp (motion.md §4.7). */
const ACTIONS_RISE = space[4];

/**
 * VIS-5: the display size of the result's word (52, Rubik's heaviest weight the app loads: Black 900 once the
 * tokens load it, Bold 700 until then), in the language's typeface (its font and least line height).
 */
const DISPLAY_SIZE = 52;
const DISPLAY_LINE = 60;
const DISPLAY_WEIGHT = ('900' in tokens.font.load.Rubik ? '900' : '700') as UiWeight;
function displayTitle(): TextStyle {
  const typeface = appTypeface();
  return {
    ...uiFont(typeface, DISPLAY_WEIGHT),
    fontSize: DISPLAY_SIZE,
    lineHeight: lineHeightIn(typeface, DISPLAY_SIZE, DISPLAY_LINE),
    letterSpacing: 0,
  };
}
const DISPLAY_TITLE = displayTitle();
/** The word is already large: the phone's text size may grow it this much at most. */
const TITLE_MAX_SCALE = 1.2;
/** The gold word's hard edge (4 dp, like the CTA's). */
const TITLE_EDGE = space[2];
/** The crown medallion over my avatar (32, its crown 18), and the crown in the "מקום 1" tag (12). */
const CROWN = space[12];
const CROWN_ICON = size.icon.inline;
const TAG_ICON = space[6];

const TITLE_COLOUR: Readonly<Record<TitleTone, { color: string }>> = {
  gold: { color: color.accent },
  plain: { color: color.text },
  muted: { color: color.textMuted },
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  statusBand: { position: 'absolute', top: 0, start: 0, end: 0, backgroundColor: color.bg },
  center: { alignItems: 'center', justifyContent: 'center', gap: space[8], paddingHorizontal: space[10] },
  loading: { alignItems: 'center', gap: space[8] },
  unseen: { opacity: 0 },
  content: { paddingHorizontal: tokens.layout.gutterHome, gap: space[10] },
  // The fixed header's bottom (8) and the scroll's top (16) together are the content's gap (space[10], 24).
  top: { paddingHorizontal: tokens.layout.gutterHome, paddingBottom: space[4] },
  scrollTop: { paddingTop: space[8] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[6],
  },
  hero: { alignItems: 'center', gap: space[4] },
  heroAvatar: { marginTop: CROWN / 2, marginBottom: space[2] },
  crownRow: { position: 'absolute', top: -CROWN / 2, start: 0, end: 0, alignItems: 'center' },
  crown: {
    width: CROWN,
    height: CROWN,
    borderRadius: CROWN / 2,
    borderWidth: tokens.border.focus,
    borderColor: color.accent,
    backgroundColor: color.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: { alignSelf: 'stretch', paddingBottom: TITLE_EDGE },
  title: { textAlign: 'center' },
  titleEdge: {
    position: 'absolute',
    top: TITLE_EDGE,
    start: 0,
    end: 0,
    textAlign: 'center',
    color: color.accentShadow,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space[3] },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[6],
    paddingVertical: space[2],
    borderRadius: radius.pill,
    backgroundColor: color.accentSubtle,
    borderWidth: tokens.border.hairline,
    borderColor: color.accent,
  },
  tagPlain: { backgroundColor: color.surface2, borderColor: color.border },
  tagText: { color: color.accent },
  shrink: { flexShrink: 1 },
  centered: { textAlign: 'center' },
  muted: { color: color.textMuted },
  strong: { color: color.text },
  scoreBlock: { alignItems: 'center', gap: space[4] },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: space[3] },
  score: { color: ME.ring, includeFontPadding: false },
  // While the count runs, the final number keeps its place unseen and the count sits over it, at its end.
  holding: { opacity: 0 },
  counting: { position: 'absolute', top: 0, end: 0 },
  section: {
    gap: space[5],
    padding: space[8],
    borderRadius: radius.card,
    borderWidth: tokens.border.hairline,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: space[5] },
  bestRow: { flexDirection: 'row', alignItems: 'baseline', gap: space[6] },
  bestPoints: { color: ME.ring, includeFontPadding: false },
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  count: {
    flexGrow: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: space[2],
    paddingVertical: space[4],
    paddingHorizontal: space[2],
    borderRadius: radius.md,
    borderWidth: tokens.border.hairline,
    borderColor: color.border,
    backgroundColor: color.surface2,
  },
  countMarked: { borderColor: ME.ring },
  countValueMarked: { color: ME.ring },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[4] },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: size.listRow,
    justifyContent: 'center',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[6],
    paddingHorizontal: space[4],
    borderRadius: radius.lg,
    backgroundColor: color.surface2,
  },
  // Results-Victory / -Defeat / -4P: "משחק חדש" and "צפייה חוזרת" side by side, each as wide as its label and
  // sharing what is left; when the two don't fit, both narrow in proportion and a label shrinks inside its
  // button (Button's FIT_LABEL). With the phone's large text the second one wraps to its own line instead.
  actions: {
    flexDirection: 'row',
    paddingHorizontal: tokens.layout.gutterHome,
    paddingTop: space[6],
    gap: space[6],
    borderTopWidth: tokens.border.hairline,
    borderTopColor: color.border,
  },
  actionsStacked: { flexWrap: 'wrap' },
  action: { flexGrow: 1, flexShrink: 1, flexBasis: 'auto', minWidth: 0 },
});
