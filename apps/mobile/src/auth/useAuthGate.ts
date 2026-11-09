import { type Href, router, useRootNavigationState, useSegments } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { needsNewName } from '../api/me';
import { ROOM_PATHS, roomPath } from '../config/links';
import { startedOffHome } from '../game/flowStack';
import { followRankedGame, resumeAtStart } from '../game/rankedResume';
import { initAuth, useAuth } from './authStore';
import { forgetInvite, markStarted, roomToResume, usePendingInviteCode } from './pendingInvite';
import { pathOf, redirectFor } from './redirect';

/**
 * The root layout's part of accounts (work plan stage 8): starts the auth store once per run and keeps the
 * player on the screens their status allows (redirect.ts). Returns whether the Splash should cover the app:
 * while the status loads, and at start until the screen under it is the right one (so a signed-out player
 * never sees Home for a frame). Later changes (sign-in, sign-out) just move to their screen.
 *
 * A redirect starts a fresh stack (signing in leaves no login screen behind Home; signing out leaves no Home
 * behind the login screen).
 *
 * Room links (1.0.4, friends-room.md §6.5, D88; auth/pendingInvite.ts):
 * - A pending invite (a room link opened before the player could go in) takes the sign-in, the registration's
 *   end and a new name straight into its room (redirect.ts). Reaching a room screen uses it up.
 * - Once per run, at the start: a player who was in a friends room when the app was closed goes back to it, to
 *   the same seat (`/room/<code>?resume=1`), unless a link opened the app somewhere else.
 *
 * And back into a game (QA "density-change-orphans-ranked-game", game/rankedResume.ts): once per root, at the
 * start on Home, to what the game store still holds (an activity recreated with the JS alive), else to the
 * ranked game kept on the phone (the app killed in it), joined again by its room within the grace.
 */
export function useAuthGate(): { splash: boolean } {
  const status = useAuth((s) => s.status);
  // Spec §3.5: an admin reset the name; the player chooses a new one before anything else.
  const nameReset = useAuth((s) => s.status === 'ready' && needsNewName(s.me));
  const owner = useAuth((s) => s.user?.uid ?? null);
  const invite = usePendingInviteCode();
  const segments = useSegments();
  const path = pathOf(segments);
  const navigationReady = Boolean(useRootNavigationState()?.key);
  const target = redirectFor(status, segments, { nameReset, invite });
  // Settled: the first time the status is known and the screen is right. Derived during render.
  const [settled, setSettled] = useState(false);
  if (!settled && status !== 'loading' && target === null) setSettled(true);

  useEffect(() => {
    void initAuth();
  }, []);

  // "The ranked game I am in", kept on the phone for the next start (game/rankedResume.ts).
  useEffect(() => followRankedGame(), []);

  useEffect(() => {
    if (!navigationReady || target === null) return;
    if (router.canDismiss()) router.dismissAll();
    // The typed routes know the room's route by its pattern; redirectFor builds it from a code.
    router.replace(target as Href);
  }, [navigationReady, target]);

  // In a room's screen (sent there, or the link went straight in): the invite is used up.
  const inRoom = status === 'ready' && !nameReset && ROOM_PATHS.includes(path);
  useEffect(() => {
    if (inRoom) forgetInvite();
  }, [inRoom]);

  // Once, when the start settles: back to the room the app was closed in (Home only; a link went elsewhere).
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !navigationReady || !settled) return;
    started.current = true;
    // A root that started on a live flow's screen, or that gets the old root's screens back (a recreated
    // activity), is not on Home, whatever its first route info says: nothing is pushed over its screens
    // (game/flowStack.ts).
    const home = status === 'ready' && !nameReset && path === '' && !startedOffHome();
    const code = home ? roomToResume(owner) : null;
    if (code) router.push(roomPath(code, { resume: true }) as Href);
    else if (home) resumeAtStart(owner);
    markStarted();
  }, [navigationReady, settled, status, nameReset, path, owner]);

  return { splash: status === 'loading' || (!settled && target !== null) };
}
