import { useAuth } from '../src/auth/authStore';
import { announceLink, rememberInvite } from '../src/auth/pendingInvite';
import { useToast } from '../src/components/ui/toastStore';
import { roomLinkOf, roomPath } from '../src/config/links';
import { useGameStore } from '../src/game/gameStore';
import { noteFlowStart } from '../src/game/flowStack';
import { liveFlowPathOf } from '../src/game/liveFlow';
import i18n from '../src/i18n';
import { track } from '../src/services/analytics';

/**
 * Every URL the app is opened with (expo-router's NativeIntent; 1.0.4, friends-room.md §6, D87, D88): a room
 * link goes straight into its room.
 *
 * - `https://<this app's server>/r/123456` (Android App Links) or `sudokufight://room/123456` (the browser page's
 *   "פתח באפליקציה"): the code waits as the pending invite (auth/pendingInvite.ts) until the player can go in.
 *   - The app starting from the link: `/room/123456` (app/room/[code].tsx), which the auth gate turns into the
 *     sign-in first when there is one to do (auth/redirect.ts); after it, straight back into the room.
 *   - The app already running: it stays where it is, and auth/InviteLinkPrompt.tsx goes in, or first asks when
 *     the player is in the middle of something (§6.6: a practice, a search, another room, a game).
 * - A room link that leads nowhere (another server's, a code that is not 6 digits): "הקישור לא תקין", and
 *   Home when the app starts from it (a running app stays where it is: a bad link never ends a game).
 * - Anything else: as it is (expo-router's own routes; app/+not-found.tsx for the unknown).
 * - A new React root while the game store holds something under way (Android recreated the activity: display
 *   size, font size, bold text…; QA "density-change-orphans-ranked-game"): its screen (game/liveFlow.ts), not
 *   Home and not the link the activity was first opened with, so a ranked game is never left behind on Home.
 *   A first start never has one (the store is empty). The screens under it (Home, "משחק חדש", "סוג משחק")
 *   come back once the root is ready (game/flowStack.ts; QA "cancel-after-recreate-skips-type-screen").
 *
 * friends_link_open {signedIn} once the sign-in is known (never the code). Never throws: a link that breaks
 * here only leaves the app where it was (or at Home, starting).
 */
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }): string | null {
  try {
    if (initial) {
      const live = liveFlowPathOf(useGameStore.getState());
      // The screens under it come back once the root is ready; with nothing under way, the old root's screens
      // over Home (game/flowStack.ts; QA "levels-map-recreate-lands-home").
      noteFlowStart(live);
      if (live) return live;
    }
    const link = roomLinkOf(path);
    if (link.kind === 'other') return path;
    if (link.kind === 'badRoom') {
      say('link.badCode');
      return initial ? '/' : null;
    }
    rememberInvite(link.code);
    reportLinkOpen();
    if (initial) return roomPath(link.code);
    announceLink(link.code);
    return null;
  } catch (error) {
    if (__DEV__) console.warn('[links] could not read a link', error);
    return initial ? '/' : null;
  }
}

/** A short line at the bottom (the app's one toast viewport). */
function say(key: string): void {
  useToast.getState().show({ variant: 'warning', message: i18n.t(key, { ns: 'friends' }) });
}

/** friends_link_open, once the sign-in is known (at a start it is still loading). */
function reportLinkOpen(): void {
  const send = (status: string) => track('friends_link_open', { signedIn: status === 'ready' });
  const { status } = useAuth.getState();
  if (status !== 'loading') {
    send(status);
    return;
  }
  const unsubscribe = useAuth.subscribe((s) => {
    if (s.status === 'loading') return;
    unsubscribe();
    send(s.status);
  });
}
