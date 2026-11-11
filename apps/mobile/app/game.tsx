import { type Href, router, Stack } from 'expo-router';
import { NavigationContext, NavigationRouteContext } from 'expo-router/react-navigation';
import { useContext, useEffect, useRef, useState } from 'react';

import { useGameStore } from '../src/game/gameStore';
import { FlowFallback } from '../src/screens/FlowFallback';
import { GameScreen, OnlineGame } from '../src/screens/game';
import { GoCover, handedGoCover, handGoCover, useGameOnItsWay } from '../src/screens/match/GoCover';
import { dropWhenCovered } from '../src/screens/results/dropWhenCovered';
import { readResultsThenOpen } from '../src/screens/results/resultsHandoff';

const retry = () => useGameStore.getState().retryOnline();

/**
 * /game: the game the game store holds. A practice, alone or against a bot (started from the game-type screen,
 * the bot selection or Home's "עוד סיבוב"), or an online game (work plan stage 7, from /dev/online): its
 * connecting, its private room's lobby, the game with its connection screens, and its end. No game, nothing to
 * play: back to Home. The back swipe is off; Android back and "סיום אימון" / "כניעה" ask first (spec §6.6).
 *
 * Leaving an online game on purpose (home, practice, the lobby's "יציאה מהחדר") navigates first and closes the
 * session as this screen goes, so the game stays drawn under the transition.
 *
 * Never an empty screen (Moshe's black screens of 1.0.0): with no game to draw, a spinner while Home comes, and a
 * way out should it not (FlowFallback); the game screen offers "לבית" too should its results not open.
 *
 * The game is over (after its `game.end` hold, motion.md): the results are pushed over the game, never in its
 * place, and the game leaves the history once they cover it (QA loop 7: a replace showed an empty frame, only the
 * wandering digits, between the board and the results, in 4 of 4 surrenders and 3 of 3 ended practices; the same
 * race as the results' "משחק חדש", dropWhenCovered.ts), and back from the results goes where it went before.
 * On Android the stack still fades the covered board out over its own 150 ms as the push begins, so the results
 * are read first, while the board is on screen, and handed over: their first frame is the hero, cross-fading with
 * the board (resultsHandoff.ts; QA fixcheck of APK 13: they came in empty, and the board's fade left 0.6–1.0 s of
 * nothing but the digits).
 */
export default function GameRoute() {
  const session = useGameStore((s) => s.session);
  const online = useGameStore((s) => s.online);
  const leaving = useRef(false);
  // The results are open over this screen (see above): it only waits to be covered, then leaves the history.
  const ended = useRef(false);
  const navigation = useContext(NavigationContext);
  const routeKey = useContext(NavigationRouteContext)?.key;
  // The results being read before they open (resultsHandoff.ts): a second end meanwhile waits for that one.
  const reading = useRef(false);
  const gone = useRef(false);
  useEffect(() => {
    gone.current = false;
    return () => {
      gone.current = true;
    };
  }, []);
  const openResults = (id: string) => {
    // Once: the results are above this screen from then on. Again only while this screen is still the one shown,
    // the push before lost (the game screen's watchdog offers "לתוצאות" RESULTS_WATCHDOG_MS later).
    if (reading.current || (ended.current && navigation?.isFocused() === false)) return;
    ended.current = true;
    reading.current = true;
    readResultsThenOpen(id, () => {
      reading.current = false;
      // Left meanwhile (its "לבית"), or gone: nothing to open over.
      if (leaving.current || gone.current) return;
      router.push({ pathname: '/results/[id]', params: { id } });
      if (navigation && routeKey) void dropWhenCovered(navigation, routeKey);
    });
  };
  // A ranked match's GO!, handed over by the match screen as it opened this one: kept over the game until the
  // game is drawn (GoCover, QA loop 3). Read once, as the screen first renders.
  const [goCover] = useState(handedGoCover);
  useEffect(() => handGoCover(null), []);
  // A friends room's GO! comes as GO! shows: the game is mounted under it once here (GoCover, gameOnItsWay).
  const waiting = useGameOnItsWay(goCover, online?.connection);

  useEffect(() => {
    // Under the results (ended), the store may let go of the game: they are the screen shown, not Home.
    if (!session && !online && !leaving.current && !ended.current) router.replace('/');
  }, [session, online]);

  // Left on purpose: the session goes with the screen (an online one leaves its room).
  useEffect(
    () => () => {
      if (leaving.current) useGameStore.getState().clear();
    },
    [],
  );

  const leaveTo = (href: Href) => {
    leaving.current = true;
    router.dismissTo(href);
  };
  const leaveBack = () => {
    leaving.current = true;
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  if (online) {
    return (
      <>
        <Stack.Screen options={{ gestureEnabled: false }} />
        <GoCover model={goCover} waiting={waiting}>
          <OnlineGame
            key={online.key}
            session={online}
            onEnded={openResults}
            onHome={() => leaveTo('/')}
            onRetry={retry}
            onLeave={leaveBack}
            onPractice={() => leaveTo('/game-type')}
            devMetrics={__DEV__}
          />
        </GoCover>
      </>
    );
  }
  if (!session) {
    // Home is on its way (the effect above), or this screen is going: only reported should it stay.
    return (
      <FlowFallback
        reason="game: no game in the store"
        report={() => !leaving.current && !ended.current}
        onHome={() => router.replace('/')}
      />
    );
  }
  return (
    <>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <GameScreen key={session.id} session={session} onEnded={openResults} onHome={() => leaveTo('/')} />
    </>
  );
}
