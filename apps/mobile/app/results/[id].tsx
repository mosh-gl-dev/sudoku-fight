import { router, useLocalSearchParams } from 'expo-router';
import { NavigationContext, NavigationRouteContext } from 'expo-router/react-navigation';
import { useCallback, useContext, useEffect, useState } from 'react';
import { BackHandler } from 'react-native';

import { refreshMe } from '../../src/auth/authStore';
import { useScreenFocused } from '../../src/avatars/useScreenFocused';
import { afterFrames } from '../../src/components/ui/retire';
import { useToast } from '../../src/components/ui/toastStore';
import { useGameStore } from '../../src/game/gameStore';
import i18n from '../../src/i18n';
import { friendsRoomOfSession } from '../../src/net/friends';
import { startAndOpen, startRankedAndOpen } from '../../src/screens/home';
import { newGameTarget, type PlayAgain, ResultsScreen } from '../../src/screens/results';
import { dropWhenCovered } from '../../src/screens/results/dropWhenCovered';
import { clearHandedResults, handedResults, loadResultsNow } from '../../src/screens/results/resultsHandoff';
import { useStackEntered } from '../../src/screens/results/useStackEntered';
import { crashReporter } from '../../src/services/crashlytics';

/**
 * The frames the results wait (their loading state shown) before they are drawn, when they read for themselves
 * (the history, after a restart, or a just-played game whose read was slower than RESULTS_READ_CEILING_MS; a game
 * that just ended usually hands its results over, drawn at once: resultsHandoff.ts). When the results replaced
 * the game in one commit, the game's views that just moved were deleted in its frame; a load that came back at
 * once drew the results' avatars and icons in that same frame, and on Android Reanimated still held the deleted
 * views: ~944 logged failures and two frames of 763 and 801 ms (QA run #3, T3-GAME-RESULTS-HITCH;
 * components/ui/retire.ts). Since QA loop 7 the results are pushed over the game, whose views go only once it is
 * covered (dropWhenCovered); the frames stay for the reads that come late.
 */
const RESULTS_AFTER_FRAMES = 2;

/** Reads at once (the same moment as before), and hands the results over RESULTS_AFTER_FRAMES later. */
const load = (id: string) => {
  const result = loadResultsNow(id);
  // A failure is the caller's ("unavailable"), once the frames have gone; not an unhandled rejection meanwhile.
  result.catch(() => undefined);
  return new Promise<void>((resolve) => afterFrames(RESULTS_AFTER_FRAMES, resolve)).then(() => result);
};

/**
 * Leaving the results ends the game's flow: the store lets go of the finished session. After a ranked game
 * the account's ratings are read again (GET /v1/me) at once, so Home and the modes show the new ones. Every other
 * way out (the game screen's home, leaving a running game, the background) is covered by the session-level
 * refresh (progress/rankedRefresh.ts), which also reads again until the server has stored the game; the rating it
 * showed at the end stays over an older answer, so nothing flickers back.
 */
const leave = () => {
  const ranked = useGameStore.getState().online?.host.game?.config.mode === 'ranked';
  useGameStore.getState().clear();
  if (ranked) void refreshMe();
};

const goHome = () => {
  leave();
  router.dismissTo('/');
};

/**
 * "משחק חדש" (UX-2): the same kind of game again, in one tap (resultsModel newGameTarget). A practice, alone or
 * against the same bot, starts at once in place of the results; a ranked game from matchmaking searches the same
 * queue; a friends room's game goes back to playing with friends (its host opens a new room, a guest goes to
 * "הצטרף עם קוד" for the next one); a development room's game goes back to the dev rooms (else the modes). A
 * practice that cannot start says so, and the results stay.
 * The practice and the search are pushed over the results, never in their place (QA loop 6: a replace showed
 * empty frames between them; dropWhenCovered.ts): resolves true when it did, and the results then leave the
 * history once covered.
 */
const newGame = async (again: PlayAgain): Promise<boolean> => {
  const online = useGameStore.getState().online;
  const target = newGameTarget(
    again,
    online ? { queueKey: online.queueKey, friendsHost: friendsRoomOfSession(online)?.isHost === true } : null,
  );
  leave();
  switch (target.kind) {
    case 'practice': {
      const ok = await startAndOpen(target.play, 'push');
      if (!ok) useToast.getState().show({ variant: 'error', message: i18n.t('home:start.failed') });
      return ok;
    }
    case 'ranked':
      startRankedAndOpen({ gameType: target.gameType, players: target.players }, 'push');
      return true;
    case 'friends':
      if (target.host) router.replace({ pathname: '/friends/room', params: { create: '1' } });
      else router.replace('/friends/join');
      return false;
    case 'rooms':
      router.dismissTo(__DEV__ ? '/dev/online' : '/modes');
      return false;
  }
};

/**
 * /results/[id]: the results of a practice saved on this phone (spec §12), alone or against a bot, after a
 * restart too; or of the online game that just ended. Every way back is "לבית" (UX-2): Android's back while
 * the results are the screen shown, and no iOS swipe back into the flow behind them.
 */
export default function ResultsRoute() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  // Just played here (the store still holds it): a full board, or a win, gets its fanfare.
  const [celebrate] = useState(() => {
    const { session, online } = useGameStore.getState();
    return session?.id === id || online?.id === id;
  });
  // Read by the game as it ended (resultsHandoff.ts): drawn in the commit that opens this screen.
  const [initial] = useState(() => handedResults(id));
  useEffect(() => clearHandedResults(id), [id]);
  // A breadcrumb for a later crash report (Moshe's black screens of 1.0.0): the results did come.
  useEffect(() => {
    const online = useGameStore.getState().online?.id === id;
    crashReporter().log(
      `results route: ${online ? 'online' : 'practice'}${celebrate ? ', just played' : ''}`,
    );
  }, [id, celebrate]);

  // Back goes home, as "לבית" does; not while a screen opened from here (a player's card, the replay) is on top.
  const focused = useScreenFocused();
  useEffect(() => {
    if (!focused) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goHome();
      return true;
    });
    return () => sub.remove();
  }, [focused]);
  // No iOS swipe back to the game's setup screens (read through the context: none outside a navigator).
  const navigation = useContext(NavigationContext);
  useEffect(() => {
    navigation?.setOptions({ gestureEnabled: false });
  }, [navigation]);
  // Handed over (pushed over the final board): on Android the parts below the hero wait for the stack's fade to
  // end, so its frames carry only what it shows (useStackEntered.ts, fullboard-empty-frame).
  const entered = useStackEntered(navigation ?? undefined, initial !== null);

  // "משחק חדש": the next screen over the results, which leave the history once it covers them (its button keeps
  // its spinner until then, so the results fade out as they were).
  const routeKey = useContext(NavigationRouteContext)?.key;
  const onNewGame = useCallback(
    async (again: PlayAgain) => {
      const over = await newGame(again);
      if (over && navigation && routeKey) await dropWhenCovered(navigation, routeKey);
    },
    [navigation, routeKey],
  );

  return (
    <ResultsScreen
      gameId={id}
      load={load}
      initial={initial}
      entered={entered}
      celebrate={celebrate}
      onNewGame={onNewGame}
      onHome={goHome}
    />
  );
}
