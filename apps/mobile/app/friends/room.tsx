import * as Clipboard from 'expo-clipboard';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { NavigationContext, NavigationRouteContext } from 'expo-router/react-navigation';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { BackHandler, Share } from 'react-native';

import { useScreenFocused } from '../../src/avatars/useScreenFocused';
import { systemClock } from '../../src/game/clock';
import { useGameStore } from '../../src/game/gameStore';
import { useNow } from '../../src/game/useNow';
import type { FriendsRoomView } from '../../src/net/friends';
import { friendsRoomLink, friendsRooms, useFriendsRoom } from '../../src/net/friendsDevice';
import {
  entryFailure,
  type FriendsEntryState,
  type FriendsRoomPhase,
  FriendsRoomScreen,
  roomScreenPhase,
} from '../../src/screens/friends';
import { goBack } from '../../src/screens/home/navigation';
import { handGoCover } from '../../src/screens/match/goHandoff';
import { warmFriendsGameSteps, warmGameLater } from '../../src/screens/match/warmGame';
import { dropWhenCovered } from '../../src/screens/results/dropWhenCovered';
import { cue } from '../../src/services/feedback';
import { useRootTeardown } from '../../src/services/latestRoot';
import { useProfile } from '../../src/state/profile';

/** The system share sheet, with the message (the code, then the link on its own line: §6.7). */
const shareSheet = (message: string) => Share.share({ message });

/**
 * /friends/room: the friends room the game store holds (friends-room.md §3.2), from "צור חדר" (`?create=1`:
 * the room opens at once, with my last game type [D82]) or a join (/friends/join, /room/[code]) to the
 * 3… 2… 1…; then the game screen takes its place. Everything goes through net/friends.ts (friendsRooms,
 * useFriendsRoom); the screen only draws. Leaving the screen any way but into the game leaves the room
 * ("יציאה מהחדר" frees the seat; nothing is lost before the game), and calls off a way in still waiting for the
 * server (a late ticket enters nothing). Once the host started (3… 2… 1…, then the board coming), there is no
 * way back: Android's back does nothing, as the header has no back and iOS no swipe, so the game is never left
 * without a screen.
 */
export default function FriendsRoomRoute() {
  const { create } = useLocalSearchParams<{ create?: string }>();
  const current = useFriendsRoom();
  const [entry, setEntry] = useState<FriendsEntryState | null>(
    create === '1' ? { kind: 'opening', via: 'create' } : null,
  );
  // [D82] The room opens with the type I chose in the last room I hosted (QA friends-room-type-not-remembered:
  // it opened with the last practice's or ranked game's type instead); before any, the last game's.
  const lastType = useProfile((s) => s.friendsGameType ?? s.lastPlay?.gameType);
  const toGame = useRef(false);
  const left = useRef(false);
  /** Ways in (create, rejoin) still waiting for the server. */
  const pending = useRef(0);
  const room = current?.room ?? null;
  // Only the count ticks: once the game came, GO! stays as it is (and this screen, under the game's while it
  // mounts, does nothing every 100 ms).
  const counting = room?.phase === 'countdown';
  const now = useNow(COUNTDOWN_TICK_MS, { enabled: counting, clock: current?.session.clock });
  // Read through the contexts: none outside a navigator.
  const navigation = useContext(NavigationContext);
  const routeKey = useContext(NavigationRouteContext)?.key;
  // The screen shown (not one left under another: its ways away would move the screen over it).
  const focused = useScreenFocused();

  /**
   * This room's type is my choice: I created it here, or I changed its type. Not a room whose hosting merely
   * passed to me when its host left (its type was not mine to remember).
   */
  const [chose, setChose] = useState(false);

  /** The count's last beat played, and when GO! was first shown (phone time). */
  const beat = useRef<string | null>(null);
  const [goShownAt, setGoShownAt] = useState<number | null>(null);

  const openRoom = useCallback(
    async (replace = false) => {
      setEntry({ kind: 'opening', via: 'create' });
      pending.current++;
      const out = await friendsRooms().createRoom({ gameType: lastType, replace });
      pending.current--;
      // Called off: the screen is gone (or going).
      if (!out.ok && out.cancelled) return;
      if (out.ok) {
        setChose(true);
        // A new room on this screen ("צור חדר" after a closed one): its own way on, count and game, from the start.
        left.current = false;
        toGame.current = false;
        beat.current = null;
        setGoShownAt(null);
      }
      setEntry(out.ok ? null : entryFailure(out));
    },
    [lastType],
  );

  /** Back into a room I have a seat in (the lobby I host already, or a refused try again). */
  const rejoin = async (code: string) => {
    setEntry({ kind: 'opening', via: 'join' });
    pending.current++;
    const out = await friendsRooms().joinByCode(code, 'resume');
    pending.current--;
    if (!out.ok && out.cancelled) return;
    setEntry(out.ok ? null : entryFailure(out, code));
  };

  // The type of the room I host, as its lobby shows it (my choice, once the server took it): the next room's.
  const hostedType = chose && room?.isHost && room.phase === 'lobby' ? room.gameType : null;
  useEffect(() => {
    if (hostedType) useProfile.getState().rememberFriendsType(hostedType);
  }, [hostedType]);

  // "צור חדר": once, as the screen opens.
  const opened = useRef(false);
  useEffect(() => {
    if (create !== '1' || opened.current) return;
    opened.current = true;
    void openRoom();
  }, [create, openRoom]);

  // The first game of a run, made ready while waiting in the lobby (its sounds' players, its code, the count's
  // two players), one step per idle moment; stopped once the count starts, so nothing is made under 3… 2… 1… or
  // GO! (QA go-hold-long-on-joiner: a phone in by a link right after the start held GO! ~2.1 s; warmGame.ts).
  const inLobby = room?.phase === 'lobby';
  useEffect(() => (inLobby ? warmGameLater(warmFriendsGameSteps) : undefined), [inLobby]);

  // The 3… 2… 1…: a beat for each step, GO, then the board (the game screen).
  const drawn = roomScreenPhase(room, entry, now);
  // QA friends-room-spinner-after-game: "no room" whose way on did not come is a closed room, with its ways out.
  const phase = useGoneWayOut(drawn, focused);
  useEffect(() => {
    const step = phase.kind === 'countdown' ? String(phase.step) : null;
    if (step === null || step === beat.current) return;
    beat.current = step;
    cue(step === 'go' ? 'go' : 'countdownBeat');
  }, [phase]);
  // GO! is seen before the board, on every phone (QA loop 8: the joiner's count, a little behind the server's,
  // went from "1" straight to the board). The game screen opens the moment the game came, over this screen and on
  // this same GO! (GoCover, goHandoff.ts FriendsGo), and mounts the game under it; GO! fades into the board once
  // the game is drawn and GO! has been seen (motion.md `go`). QA go-hold-joiner, loop 13: holding GO! here first
  // (250 ms) and only then replacing the screen put the game's whole mount (~0.6 s on the phones) after the hold:
  // GO! → board 1.1–1.34 s, the game's state itself coming 17–189 ms after GO!.
  const showsGo = phase.kind === 'countdown' && phase.step === 'go';
  if (showsGo && goShownAt === null) setGoShownAt(systemClock.now());
  const go = showsGo ? phase : null;
  useEffect(() => {
    if (room?.phase !== 'game' || toGame.current) return;
    toGame.current = true;
    handGoCover(
      go
        ? { kind: 'friendsGo', lobby: go.lobby, myId: go.myId, shownAt: goShownAt ?? systemClock.now() }
        : null,
    );
    // Over this screen, not in its place: it stays whole under the game's GO! until covered, and only then leaves
    // the history (as the match screen does, goHandoff.ts; a replace could show an empty frame between the two).
    router.push('/game');
    if (navigation && routeKey) void dropWhenCovered(navigation, routeKey);
  }, [room?.phase, go, goShownAt, navigation, routeKey]);

  // No room any more (left on purpose, the game ended, or none to begin with): nothing more to show here. Only
  // from the screen shown: a room screen left under another (the game, its results) never moves that one away
  // (QA friends-room-spinner-after-game); it moves on once it is shown again.
  useEffect(() => {
    if (entry || left.current || !focused) return;
    if (room && (room.phase !== 'closed' || room.closed?.problem || room.closed?.reason)) return;
    left.current = true;
    goBack();
  }, [entry, room, focused]);

  // Leaving the screen (back, a swipe, Android's back) leaves the room, unless the game takes its place, and
  // calls off a way in still waiting for the server. The screen going with its React root (Android recreating
  // the activity: display size, font size…) keeps the seat: the new root opens the room again (game/liveFlow.ts;
  // QA density-change-orphans-ranked-game). A way in still waiting is called off all the same: the new root
  // started without it.
  const tornDown = useRootTeardown();
  useEffect(
    () => () => {
      if (pending.current > 0) {
        pending.current = 0;
        friendsRooms().cancel();
      }
      if (!toGame.current && !tornDown()) leaveRoom(friendsRooms().room());
    },
    [tornDown],
  );

  // The host started: Android's back is held until the game screen takes over (MatchScreen does the same).
  const holdsBack = phase.kind === 'countdown' || phase.kind === 'starting';
  useEffect(() => {
    if (!holdsBack) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [holdsBack]);

  const leave = () => {
    left.current = true;
    friendsRooms().leave();
    goBack();
  };
  const home = () => {
    left.current = true;
    friendsRooms().leave();
    router.dismissTo('/');
  };

  // A closed room on the stack's only screen (nothing under it to go back to): Android's back goes Home, not out
  // of the app.
  const closedShown = focused && phase.kind === 'closed';
  useEffect(() => {
    if (!closedShown) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (router.canGoBack()) return false;
      home();
      return true;
    });
    return () => sub.remove();
  });

  return (
    <>
      <Stack.Screen options={{ gestureEnabled: !holdsBack }} />
      <FriendsRoomScreen
        phase={phase}
        goShownAt={goShownAt}
        linkFor={friendsRoomLink}
        onShare={async (message) => {
          await shareSheet(message);
          friendsRooms().shared();
        }}
        onCopy={(code) => Clipboard.setStringAsync(code)}
        onStart={(withoutAway) => friendsRooms().start(withoutAway)}
        onSetGameType={(gameType) => {
          setChose(true);
          return friendsRooms().setGameType(gameType);
        }}
        onKick={(playerId) => friendsRooms().kick(playerId)}
        onLeave={leave}
        onRetry={() => {
          if (entry?.kind !== 'failed') {
            // The room's own connection gave up: back in by its code (my own seat).
            useGameStore.getState().retryOnline();
            return;
          }
          if (entry.retry === 'create' || entry.code === null) void openRoom();
          else void rejoin(entry.code);
        }}
        onCreateRoom={() => void openRoom()}
        onJoinWithCode={() => {
          left.current = true;
          friendsRooms().leave();
          router.replace('/friends/join');
        }}
        onHome={home}
        onReplace={(choice) => {
          if (entry?.kind !== 'replace') return;
          if (choice === 'close') {
            void openRoom(true);
            return;
          }
          void rejoin(entry.openCode);
        }}
      />
    </>
  );
}

/**
 * How long "no room" (phase 'gone': left on purpose, or the room closed after its game) may show its spinner
 * while the route moves on (its goBack). The move takes one transition; past this, it did not come.
 */
const GONE_WAY_OUT_MS = 2000;

/**
 * The phase drawn, with a way out of a 'gone' that stayed (QA friends-room-spinner-after-game: the host's room
 * screen showed only its title and a spinner for over a minute, no code, no seats, no back button, and Android's
 * back left the app). 'gone' has no way out of its own, as it only covers the move away; when the move did not
 * come (the screen still shown GONE_WAY_OUT_MS later: it was the stack's only screen, after a recreated
 * activity, or its goBack went nowhere), it is drawn as a closed room: "החדר נסגר.", "צור חדר" and "לבית".
 */
function useGoneWayOut(drawn: FriendsRoomPhase, focused: boolean): FriendsRoomPhase {
  // Counted only while shown: a room screen under another moves on once shown again (and says nothing meanwhile).
  const gone = drawn.kind === 'gone' && focused;
  const [stuck, setStuck] = useState(false);
  if (!gone && stuck) setStuck(false);
  useEffect(() => {
    if (!gone) return;
    const timer = setTimeout(() => setStuck(true), GONE_WAY_OUT_MS);
    return () => clearTimeout(timer);
  }, [gone]);
  return gone && stuck ? { kind: 'closed', reason: 'closed' } : drawn;
}

/** The count's own clock tick: each step lands within a tenth of a second of the server's. */
const COUNTDOWN_TICK_MS = 100;

/** The room as the screen goes: still waiting (or getting in), its seat is freed. */
function leaveRoom(room: FriendsRoomView | null): void {
  if (room && (room.phase === 'lobby' || room.phase === 'connecting' || room.phase === 'reconnecting'))
    friendsRooms().leave();
}
