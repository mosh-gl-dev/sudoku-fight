import type { Clock } from '@sudoku-fight/engine';
import { COUNTDOWN_MS } from '@sudoku-fight/protocol';
import {
  memo,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { AvatarIdOrNone } from '../../avatars';
import { timing } from '../../components/ui/motion';
import { afterFrames, RETIRE_MS, SWAP_FRAMES } from '../../components/ui/retire';
import { systemClock } from '../../game/clock';
import { useNow } from '../../game/useNow';
import type { MatchEntry, MatchmakingClient, MatchmakingInfo, MatchPhase } from '../../net/matchmaking';
import { cue } from '../../services/feedback';
import { useRootTeardown } from '../../services/latestRoot';
import { motion, useReduceMotion } from '../../theme/motion';
import { flowFadeMs } from '../../theme/transitions';
import { FlowFallback } from '../FlowFallback';
import { CountdownView } from './CountdownView';
import { FoundView } from './FoundView';
import { handGoCover } from './GoCover';
import { MatchErrorView } from './MatchErrorView';
import {
  countdownShownAt,
  headerOf,
  type MatchScreenModel,
  matchScreenModel,
  type SeatModel,
  seatsOf,
} from './matchModel';
import { metrics } from './metrics';
import { SearchView } from './SearchView';
import { TimeoutView } from './TimeoutView';
import { warmGameLater } from './warmGame';

type SearchModel = Extract<MatchScreenModel, { kind: 'search' }>;
type FoundModel = Extract<MatchScreenModel, { kind: 'found' }>;

/**
 * The search, once the VS took its place (QA loop 3: a single empty frame between the radar and the VS, the
 * search deleted in the very commit the VS mounted at its entrance's opacity 0): `fading` under the VS as the VS
 * fades in (a cross-fade, motion.md `flow.fade`; reduced motion, the shorter fade); `still` once unseen (its radar
 * and seats stop: retire.ts, nothing a worklet moves is deleted); `gone` RETIRE_MS later.
 */
type SearchOut = 'fading' | 'still' | 'gone';
type CountdownModel = Extract<MatchScreenModel, { kind: 'countdown' }>;

/** The VS of the match being started: its last model, kept to draw it under the count, and when it was found. */
interface KeptFound {
  match: NonNullable<MatchmakingInfo['match']>;
  /** The first render of its "found" (the clock's time): the badges pop 800 ms after it. */
  at: number;
  model: FoundModel;
}

export interface MatchScreenProps {
  /** The search (the game store's `match`). */
  match: MatchmakingClient<MatchEntry>;
  /** Me, as my avatar shows while searching. */
  self: { name: string | null; avatarId: AvatarIdOrNone };
  /** The board is here: open the game (it replaces this screen). */
  onPlay: () => void;
  /** The search was called off ("ביטול חיפוש", Android back): back where it was started. */
  onLeave: () => void;
  /** "שחק מול בוט בינתיים": from the timeout, or from the search when nobody else is searching. */
  onBot: () => void;
  /** A failure → "עבור לאימון". */
  onPractice: () => void;
  /** The server wants a verified email for ranked games [D22] → "אמת את המייל": the verification screen. */
  onVerifyEmail: () => void;
  /** "חזרה לבית". */
  onHome: () => void;
  /**
   * The server refused the search because the account is suspended (spec §3.5): once per failure, so the app
   * reads the profile again and shows the suspension everywhere.
   */
  onSuspended?: () => void;
  /**
   * `alreadyQueued` over this account's ranked game still running (the server named its room) → "back to the
   * game": into that room again (QA density-change-orphans-ranked-game).
   */
  onBackToGame?: (roomId: string) => void;
  /** The phone's clock (tests). */
  clock?: Clock;
}

/**
 * A search whose screen went with its React root (Android recreating the activity) waits this long for the new
 * root to show it again before it is left (MatchScreen's unmount; a Galaxy A16 takes ~2 s to recreate).
 */
export const SEARCH_REOPEN_MS = 6000;
/** The searches on screen now, by how many match screens show each (the old root's and the new one's). */
const showing = new Map<object, number>();

/** Phases with something counting on screen: the search time, the countdown. */
const TICKING: readonly MatchPhase[] = ['connecting', 'searching', 'countdown', 'started'];
/** Phases from which the player can still leave (no cancelling after "found" [D32]). */
const LEAVABLE: readonly MatchPhase[] = ['connecting', 'searching', 'timeout', 'failed', 'cancelled'];
/** The search's fade out under the VS (Layer: `stateChange`, or the shorter reduced-motion fade). */
const SEARCH_FADE_MS = Math.max(motion.duration.stateChange, motion.duration.reducedFade);
/** GO! is on screen this long before the board (motion tokens `sequence.matchFound`: GO + 400). */
const GO_HOLD_MS = motion.sequence.matchFound.boardRevealAt - motion.sequence.matchFound.goAt;

/**
 * How long GO!, once drawn, holds before the game screen opens: GO_HOLD_MS less the game screen's own fade in over
 * it as it really runs on this platform (theme/transitions flowFadeMs: iOS `flow.fade` 240 ms, reduced motion 200,
 * so 160 or 200 ms; Android react-native-screens' fixed 150 ms either way, so 250 ms), so GO! is seen about 400 ms
 * on a quick phone. A slower phone takes longer to draw the game, with GO! on screen all the while: nothing more is
 * added on top of that (QA B37-still: GO! for 1.3–1.5 s on a Galaxy A16, 400 ms of it a hold before the game
 * screen even started).
 */
export function goHoldMs(reduce: boolean, os: typeof Platform.OS = Platform.OS): number {
  return Math.max(0, GO_HOLD_MS - flowFadeMs(reduce, os));
}

/**
 * The VS once the count took its place: rendered again only should the count come before the last `ready` (then
 * once, everyone ready, frozen: a badge changes, no avatar starts to move), never drawn again otherwise.
 */
const KeptFoundView = memo(FoundView);

/**
 * The matchmaking flow (work plan stage 9, spec §10, §4.2: Search → Found → 3-2-1 → Game, Search → 60 s →
 * Timeout): one screen whose views follow the search (net/matchmaking.ts through matchModel), each fading
 * in as the one before it goes (motion.md `flow.fade`). The views hold no logic: cancelling, "keep
 * searching", retrying and leaving are the client's. Sounds and haptics as motion.md §7–§8: a chime when
 * found, a beat on 3 · 2 · 1, and GO. Android's back button cancels a search, and does nothing from "found"
 * on (leaving then would be abandonment [D32]). Leaving the screen while still searching cancels it.
 *
 * The VS and the count are one stage (QA B37-still, B43): the switch to the count took a Galaxy A16 0.5–1.5 s to
 * draw (the React work of two new avatars, then their shapes' first draw in the very frame that deleted the VS's
 * just-moved views, which Reanimated fails on once a shape for each: docs/PERF.md B14/B32), while the JS ticks
 * moved the count on: "3" never seen, the VS stuck past its time. So the count gets ready unseen behind the VS
 * once the VS's slam has swung, before its badges (FoundView onSettled: its React work and first draw done before
 * 3 · 2 · 1, between the slam and the nod, QA K3), the VS stays under the count, still and
 * unseen, until the screen goes, and a count drawn late runs from its first drawn frame.
 */
export function MatchScreen({
  match,
  self,
  onPlay,
  onLeave,
  onBot,
  onPractice,
  onVerifyEmail,
  onHome,
  onSuspended,
  onBackToGame,
  clock = systemClock,
}: MatchScreenProps) {
  const subscribe = useCallback((listener: () => void) => match.subscribe(listener), [match]);
  const info = useSyncExternalStore(subscribe, () => match.info);
  const reduce = useReduceMotion();
  const counting = info.phase === 'countdown' || info.phase === 'started';
  const now = useNow(counting ? 100 : 250, { enabled: TICKING.includes(info.phase), clock });
  // The count: when it first rendered, and when its first frame was drawn. One shown late (QA B37) or drawn late
  // (QA B37-still) runs its digits over what is left, none skipped and none unseen.
  const [countdownSince, setCountdownSince] = useState<number | null>(null);
  if (counting !== (countdownSince !== null)) setCountdownSince(counting ? clock.now() : null);
  const countdownDrawnAt = useDrawnAt(counting, clock);
  const shownAt = countdownSince === null ? null : countdownShownAt(countdownSince, countdownDrawnAt, now);
  const model = useMemo(() => matchScreenModel(info, self, now, shownAt), [info, self, now, shownAt]);
  // When GO! was first drawn: it holds goHoldMs before the game screen opens.
  const showsGo = model.kind === 'play' || (model.kind === 'countdown' && model.step === 'go');
  const goDrawnAt = useDrawnAt(showsGo, clock);

  // The VS of this match, kept to stay under the count; and whether the count got ready behind it.
  const current = info.match;
  const matchId = current?.matchId ?? null;
  const [found, setFound] = useState<KeptFound | null>(null);
  if (model.kind === 'found' && current !== null && found?.match !== current) {
    const at = found !== null && found.match.matchId === current.matchId ? found.at : clock.now();
    setFound({ match: current, at, model });
  }
  const [preparedFor, setPreparedFor] = useState<string | null>(null);
  const prepare = useCallback(() => setPreparedFor(matchId), [matchId]);
  // The VS under the count says what the count means: everyone is in (the server counts only then). The last
  // `ready` may come with the count, in the same batch, or after it on the other connection (the game room's
  // countdown first): the VS then faded out on "מתחבר…" and "1/2" (QA K3, B43 1 of 5).
  const onVs = model.kind === 'found';
  const vsModel = found?.model ?? null;
  const shownVs = useMemo(() => (vsModel === null || onVs ? vsModel : allReady(vsModel)), [vsModel, onVs]);

  // The first game's sounds and code, made while searching (./warmGame.ts, QA K2): not under GO!.
  const searching = model.kind === 'search';
  useEffect(() => (searching ? warmGameLater() : undefined), [searching]);

  // The search as it was last drawn, to fade out under the VS (SearchOut), then stand still and go.
  // (The model is the same object for the same inputs, so this settles in one more pass of this function.)
  // The search the screen opens on comes in with the screen (the stack's own fade): there from its first frame
  // (SearchView `still`). Any search after it, once the screen has shown something else, has its own entrance.
  const [openedOnSearch, setOpenedOnSearch] = useState(model.kind === 'search');
  if (openedOnSearch && model.kind !== 'search') setOpenedOnSearch(false);
  const [lastSearch, setLastSearch] = useState<SearchModel | null>(null);
  if (model.kind === 'search' && lastSearch !== model) setLastSearch(model);
  const pregame = model.kind === 'found' || model.kind === 'countdown' || model.kind === 'play';
  const [searchOut, setSearchOut] = useState<SearchOut>('fading');
  if (!pregame && searchOut !== 'fading') setSearchOut('fading');
  // A match that fell through brings a new search view (its own entrance and its announcement of the range as it
  // is now, as before the stage kept the search: review of QA loop 3), not the one that faded out under the VS.
  const [wasPregame, setWasPregame] = useState(false);
  const [searchGen, setSearchGen] = useState(0);
  if (pregame !== wasPregame) {
    setWasPregame(pregame);
    if (!pregame) setSearchGen((g) => g + 1);
  }
  const searchKey = `search-${searchGen}`;
  useEffect(() => {
    if (!pregame) return;
    const still = setTimeout(() => setSearchOut('still'), SEARCH_FADE_MS);
    const gone = setTimeout(() => setSearchOut('gone'), SEARCH_FADE_MS + RETIRE_MS);
    return () => {
      clearTimeout(still);
      clearTimeout(gone);
    };
  }, [pregame]);

  /** Left (or about to): the screen's own end is not reported twice. */
  const left = useRef(false);
  const leave = useCallback((then: () => void) => {
    if (left.current) return;
    left.current = true;
    then();
  }, []);

  // The board here: the game opens once GO! has been seen (motion.md `go`), on the screen's own tick. Also when
  // the board came before the phone's own GO: GO! shows first.
  const goHeld = goDrawnAt !== null && now - goDrawnAt >= goHoldMs(reduce);
  useEffect(() => {
    if (model.kind === 'play' && goHeld) {
      // GO! as it is drawn now, for the game screen to keep over it until the game is drawn (GoCover).
      const go = countModelOf(model, info, true);
      leave(() => {
        handGoCover(go);
        onPlay();
      });
    } else if (model.kind === 'cancelled') leave(onLeave);
  }, [model, info, goHeld, leave, onPlay, onLeave]);
  // A new search: nothing an earlier one handed over is left for the game screen (it takes what it gets).
  useEffect(() => handGoCover(null), []);

  const refusedSuspended = model.kind === 'failed' && model.code === 'suspended';
  const suspended = useRef(onSuspended);
  useEffect(() => {
    suspended.current = onSuspended;
  });
  useEffect(() => {
    if (refusedSuspended) suspended.current?.();
  }, [refusedSuspended]);

  // motion.md §7–§8: found, then 3 · 2 · 1 and GO; the count's first beat with its first frame, not before it.
  const beat =
    model.kind !== 'countdown' ? model.kind : countdownDrawnAt === null ? null : `countdown-${model.step}`;
  const lastBeat = useRef<string | null>(null);
  useEffect(() => {
    if (beat === null || beat === lastBeat.current) return;
    lastBeat.current = beat;
    if (beat === 'found') cue('matchFound');
    else if (beat === 'countdown-go') cue('go');
    else if (beat.startsWith('countdown-')) cue('countdownBeat');
  }, [beat]);

  const cancel = useCallback(() => {
    match.cancel();
    leave(onLeave);
  }, [match, leave, onLeave]);

  // "שחק מול בוט בינתיים" (the timeout, or nobody else searching): out of the queue, then a bot game.
  const toBot = useCallback(() => {
    match.cancel();
    leave(onBot);
  }, [match, leave, onBot]);

  // Android back: cancels a search; from "found" on there is no way out but abandonment [D32].
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (LEAVABLE.includes(match.info.phase)) cancel();
      return true;
    });
    return () => sub.remove();
  }, [match, cancel]);

  // Leaving the screen while searching (any way) leaves the queue. A beat later, so a remount at once (React's
  // strict mode in development) is not taken for leaving. Not when the screen goes with its React root (Android
  // recreating the activity: display size, font size…): the search goes on, and the new root opens this screen
  // on it again (game/liveFlow.ts; QA density-change-orphans-ranked-game).
  // Should no screen show the search again within SEARCH_REOPEN_MS of that (the app's task removed with its
  // process alive, the new root sent elsewhere), it is left all the same: never a search nobody sees, matched with
  // an app nobody looks at (QA density-change-cancels-ranked-search).
  const mounted = useRef(false);
  const tornDown = useRootTeardown();
  useEffect(() => {
    mounted.current = true;
    showing.set(match, (showing.get(match) ?? 0) + 1);
    const goneWithRoot = () => {
      setTimeout(() => {
        if (!showing.has(match)) match.cancel();
      }, SEARCH_REOPEN_MS);
    };
    return () => {
      mounted.current = false;
      const left = (showing.get(match) ?? 1) - 1;
      if (left > 0) showing.set(match, left);
      else showing.delete(match);
      if (tornDown()) return goneWithRoot();
      setTimeout(() => {
        if (mounted.current) return;
        if (tornDown()) goneWithRoot();
        else match.cancel();
      }, 0);
    };
  }, [match, tornDown]);

  switch (model.kind) {
    case 'search':
      // In the pre-game stage from the start, so the VS fades in over this very view (SearchOut).
      return (
        <View key="pregame" style={styles.stage}>
          <Layer key={searchKey} shown reduce={reduce} testID="match-stage-search">
            <SearchView
              model={model}
              reduce={reduce}
              onCancel={cancel}
              onBot={toBot}
              still={openedOnSearch}
            />
          </Layer>
        </View>
      );
    case 'timeout':
      return (
        <TimeoutView
          key="timeout"
          model={model}
          reduce={reduce}
          onKeepSearching={() => match.keepSearching()}
          onBot={toBot}
          onHome={() => {
            match.cancel();
            leave(onHome);
          }}
        />
      );
    case 'found':
    case 'countdown':
    case 'play': {
      const vsAt = found !== null && found.match.matchId === matchId ? found.at : null;
      const count = countModelOf(model, info, preparedFor !== null && preparedFor === matchId);
      const outgoing = searchOut === 'gone' ? null : lastSearch;
      return (
        <View key="pregame" style={styles.stage}>
          {outgoing !== null ? (
            <Layer key={searchKey} shown={false} reduce={reduce} testID="match-stage-search">
              <SearchView
                model={outgoing}
                reduce={reduce || searchOut === 'still'}
                onCancel={cancel}
                onBot={toBot}
              />
            </Layer>
          ) : null}
          {vsAt !== null && shownVs !== null ? (
            <Layer key="vs" shown={onVs} reduce={reduce} testID="match-stage-vs">
              <KeptFoundView
                model={shownVs}
                reduce={reduce}
                active={onVs}
                badgesAt={vsAt + metrics.vs.badgesAtMs}
                onSettled={prepare}
                clock={clock}
              />
            </Layer>
          ) : null}
          {count ? (
            <Layer key="count" shown={!onVs} reduce={reduce} testID="match-stage-count">
              <CountdownView model={count} reduce={reduce} revealed={!onVs} />
            </Layer>
          ) : null}
        </View>
      );
    }
    case 'failed':
      return (
        <MatchErrorView
          key="failed"
          model={model}
          reduce={reduce}
          onRetry={() => void match.retry()}
          onPractice={() => leave(onPractice)}
          onVerifyEmail={() => leave(onVerifyEmail)}
          onHome={() => leave(onHome)}
          onBackToGame={onBackToGame ? (roomId) => leave(() => onBackToGame(roomId)) : undefined}
        />
      );
    case 'cancelled':
      // The way back runs at once (the effect above); should it not, never an empty screen.
      return <FlowFallback reason="match: cancelled screen stayed" onHome={onHome} />;
  }
}

const readySeats = (seats: readonly SeatModel[]): SeatModel[] => seats.map((s) => ({ ...s, ready: true }));

/** The VS once the count runs: everyone ready, as the count's own seats (matchModel). */
function allReady(model: FoundModel): FoundModel {
  if (model.allReady) return model;
  return { ...model, seats: readySeats(model.seats), readyCount: model.seats.length, allReady: true };
}

/**
 * The count's view, if it is there: the count itself; GO! once the board is here (it stays on screen while the
 * game screen takes over); and behind the VS once it settled (`prepared`), its first digit not shown yet.
 */
function countModelOf(
  model: MatchScreenModel,
  info: MatchmakingInfo,
  prepared: boolean,
): CountdownModel | null {
  switch (model.kind) {
    case 'countdown':
      return model;
    case 'play':
      return {
        kind: 'countdown',
        header: headerOf(info.queueKey),
        seats: readySeats(seatsOf(info)),
        step: 'go',
        remainingMs: 0,
      };
    case 'found':
      return prepared
        ? {
            kind: 'countdown',
            header: model.header,
            seats: readySeats(model.seats),
            step: 3,
            remainingMs: COUNTDOWN_MS,
          }
        : null;
    default:
      return null;
  }
}

/**
 * When what `on` shows was first drawn (the clock's time), null while off: a couple of frames after the render
 * that turned it on. requestAnimationFrame comes with the UI thread's frames, after it mounted what came before;
 * the second one, after it drew it too, however long that took (retire.ts).
 */
function useDrawnAt(on: boolean, clock: Clock): number | null {
  const [drawnAt, setDrawnAt] = useState<number | null>(null);
  if (!on && drawnAt !== null) setDrawnAt(null);
  useEffect(() => {
    if (!on) return;
    return afterFrames(SWAP_FRAMES, () => setDrawnAt(clock.now()));
  }, [on, clock]);
  return on ? drawnAt : null;
}

/**
 * One view of the pre-game stage, over the other (the VS, then the count): shown, it fades in (motion.md
 * `flow.fade`; reduced motion, the shorter fade); hidden, it fades out and stays, unseen, untouchable and hidden
 * from screen readers. Nothing in it is deleted, so nothing Reanimated just moved goes in a frame that draws new
 * SVG (docs/PERF.md B14/B32); still and unchanged, it costs no more frame time.
 */
function Layer({
  shown,
  reduce,
  testID,
  children,
}: {
  shown: boolean;
  reduce: boolean;
  testID: string;
  children: ReactNode;
}) {
  const opacity = useSharedValue(shown ? 1 : 0);
  useEffect(() => {
    opacity.set(withTiming(shown ? 1 : 0, timing(motion.duration.stateChange, 'standard', reduce)));
  }, [shown, reduce, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, style]}
      pointerEvents={shown ? 'auto' : 'none'}
      accessibilityElementsHidden={!shown}
      importantForAccessibility={shown ? 'auto' : 'no-hide-descendants'}
      testID={testID}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1 },
});
