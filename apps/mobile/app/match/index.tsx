import { matchmakingQueueOf, parseQueueKey } from '@sudoku-fight/protocol';
import { type Href, router, Stack } from 'expo-router';
import { NavigationContext, NavigationRouteContext } from 'expo-router/react-navigation';
import { useContext, useEffect, useRef } from 'react';

import { normalizeAvatarId } from '../../src/avatars';
import { refreshMe, useAuth } from '../../src/auth/authStore';
import { ROUTES } from '../../src/auth/redirect';
import { useGameStore } from '../../src/game/gameStore';
import { rejoinRankedGame } from '../../src/game/rankedResume';
import { useMatchMusic } from '../../src/music/useMatchMusic';
import { FlowFallback } from '../../src/screens/FlowFallback';
import { goBack, startAndOpen } from '../../src/screens/home';
import { headerOf, MatchScreen } from '../../src/screens/match';
import { dropWhenCovered } from '../../src/screens/results/dropWhenCovered';
import { useProfile } from '../../src/state/profile';

/**
 * /match: the ranked search the game store holds (work plan stage 9, spec §10), from searching to GO; then
 * the game takes its place (pushed over it at once, and this screen leaves the history once covered: goHandoff.ts). Started from the game type's "מצא יריב", Home's "עוד סיבוב"
 * or the results' "משחק חדש" (screens/home/startGame.ts). No search, nothing to show: back to the modes (a
 * spinner meanwhile, and a way out should they not come: never an empty screen).
 * The back swipe is off; Android's back cancels a search, and nothing from "found" on [D32].
 */
export default function MatchRoute() {
  const match = useGameStore((s) => s.match);
  const me = useAuth((s) => s.me);
  const localName = useProfile((s) => s.name);
  const localAvatar = useProfile((s) => s.avatarId);
  const leaving = useRef(false);
  // Read through the contexts: none outside a navigator.
  const navigation = useContext(NavigationContext);
  const routeKey = useContext(NavigationRouteContext)?.key;
  // The search's music (config/music.ts): the lobby while searching, silence for the VS screen and its count.
  useMatchMusic(match);

  useEffect(() => {
    if (!match && !leaving.current) router.replace('/modes');
  }, [match]);

  if (!match) {
    // The modes are on their way (the effect above), or this screen is going: only reported should it stay.
    return (
      <FlowFallback
        reason="match: no search"
        report={() => !leaving.current}
        onHome={() => router.replace('/modes')}
      />
    );
  }
  const gameType = headerOf(match.queueKey).gameType;

  /** Out of the flow: the search (or its failure) goes, then the screen. */
  const leaveTo = (go: () => void) => {
    leaving.current = true;
    useGameStore.getState().clear();
    go();
  };
  const dismissTo = (href: Href) => leaveTo(() => router.dismissTo(href));

  return (
    <>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <MatchScreen
        match={match}
        self={{
          name: me?.displayName ?? localName,
          avatarId: me ? normalizeAvatarId(me.avatarId) : localAvatar,
        }}
        onPlay={() => {
          leaving.current = true;
          // Over this screen, not in its place: its GO! stays whole under the game's until it is covered, and
          // only then does it leave the history (goHandoff.ts; QA loop 6, empty frames at GO!).
          router.push('/game');
          if (navigation && routeKey) void dropWhenCovered(navigation, routeKey);
        }}
        onLeave={() => leaveTo(goBack)}
        onBot={() => {
          leaving.current = true;
          void startAndOpen({ mode: 'bot', gameType }, 'replace');
        }}
        onPractice={() =>
          leaveTo(() => router.replace({ pathname: '/game-type', params: { mode: 'solo', gameType } }))
        }
        onVerifyEmail={() => leaveTo(() => router.replace(ROUTES.verifyEmail))}
        onHome={() => dismissTo('/')}
        onSuspended={() => void refreshMe()}
        onBackToGame={(roomId) =>
          // The search is over (refused); the game this account is still in comes over this screen, joined
          // again by its room with the same account (QA density-change-orphans-ranked-game), and this screen
          // leaves the history once covered. The game screen shows the way in.
          leaveTo(() => {
            // The game's own queue, as the refusal named it (else this search's, an older server's text).
            const queueKey = matchmakingQueueOf(match.info.error?.message ?? '');
            rejoinRankedGame({
              roomId,
              gameType: parseQueueKey(queueKey)?.gameType ?? gameType,
              queueKey,
            });
            router.push('/game');
            if (navigation && routeKey) void dropWhenCovered(navigation, routeKey);
          })
        }
      />
    </>
  );
}
