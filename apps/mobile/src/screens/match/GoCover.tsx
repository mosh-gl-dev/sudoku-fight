import { type ReactNode, useEffect, useState } from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { timing } from '../../components/ui/motion';
import { afterFrames, RETIRE_MS, SWAP_FRAMES } from '../../components/ui/retire';
import { systemClock } from '../../game/clock';
import type { SessionConnection } from '../../game/onlineSession';
import type { OnlineInfo } from '../../net/remoteGameHost';
import { motion, useReduceMotion } from '../../theme/motion';
import { FriendsGoFrame } from '../friends/FriendsGoFrame';
import { useOnlineInfo } from '../game/online/useOnlineInfo';
import { CountdownView } from './CountdownView';
import { goCoverGate, GoCoverGateContext } from './goCoverGate';
import type { HandedGo } from './goHandoff';

/**
 * GO! from the match screen to the game screen (QA loop 3, 2a: once in 12 recordings, ~250 ms of nothing but
 * the wandering digits between GO! and the board). On Android the match screen's content goes in the frame the
 * game's route mounts, and the game screen is seen only once its first draw is done: the whole game (cards,
 * 81 cells, keypad) at once, on the UI thread. Usually that lands in the same frame; when it took longer, the
 * screen stood empty meanwhile (and its board reveal then ran in full view, board 50 ms after the lead bar).
 *
 * So the game screen opens on GO! itself, the count as the match screen last drew it, still (CountdownView
 * `still`: nothing comes in or slams, nothing said), a light first frame. The game mounts a frame later under
 * it, drawn but unseen (UNDER_OPACITY: drawn, so its first draw is paid under GO!), and once its frames come
 * again (SWAP_FRAMES: the UI thread drew it) GO! fades out as the game fades in (motion.md `go`: the game's fade
 * over GO!; `flow.fade`'s 240 ms, as the match screen's own layers; reduced motion, the shorter fade). A slow first
 * draw keeps GO! on screen, never an empty one. Taps reach the game from its first frame; GO! takes none, and
 * screen readers skip it (only while it stands alone, the game still on its way, may they reach it: then it is
 * all there is). Gone RETIRE_MS after its fade (retire.ts: nothing a worklet moved is deleted sooner).
 *
 * A friends room's GO! (FriendsGo) comes the moment GO! shows (or the game came, if sooner), its slam still under
 * way, and holds the game's mount until the game is here (`waiting`, gameOnItsWay): the room's own
 * picture (FriendsGoFrame) goes on with it, its GO! set by the clock from when the room first showed it (useSlamSince;
 * QA go-cover-slam-jump, loop 15: not from where it was as this screen rendered), and the fade waits, if the game was drawn sooner, until GO! has been
 * seen motion.md's GO + 400 ms less the fade itself, a fade as long as the room's old stack fade (goFadeOf; QA
 * go-hold-joiner, loop 13).
 */

/** The game, drawn under GO! before its fade: drawn (its first draw is paid then), yet not seen. */
export const UNDER_OPACITY = 0.01;

// The handoff itself (and how the route comes in over it, with no frame between): ./goHandoff.ts.
export { handedGoCover, handGoCover } from './goHandoff';

type Phase = 'cover' | 'under' | 'fade' | 'done';

export interface GoCoverProps {
  /** GO! as the match screen (or the friends room) drew it; null: no cover, the children as they are. */
  model: HandedGo | null;
  /**
   * The game is still on its way (a friends room's GO!, handed over as GO! showed: useGameOnItsWay): GO! stays, and
   * nothing is mounted under it until the game is here; then the game mounts at once, its cover long drawn.
   */
  waiting?: boolean;
  children: ReactNode;
}

export function GoCover({ model, waiting = false, children }: GoCoverProps) {
  if (model === null) return <>{children}</>;
  return (
    <Covered model={model} waiting={waiting}>
      {children}
    </Covered>
  );
}

/**
 * A friends room's GO! handed over before the game came (app/friends/room.tsx opens the game screen as GO! shows,
 * QA go-hold-joiner, loop 16): the game is on its way while the room has not closed. The push, the game route and
 * this cover's own first draw (the room's header and players) are then paid while the game is coming (17–189 ms
 * after GO! on the phones), no longer after it, ahead of the game's own mount. Never for a ranked GO! (its match
 * screen hands it over with the game here). Not once the connection was lost or the room closed on the way: the
 * game route's own connection layer then mounts under GO! (reconnecting with its attempts and ways out, or the
 * error), as the room's lobby showed its reconnecting before; GO! never stands there alone with no way out.
 */
export function gameOnItsWay(model: HandedGo | null, info: OnlineInfo | null): boolean {
  return (
    model?.kind === 'friendsGo' &&
    info !== null &&
    !info.hasGame &&
    info.status !== 'closed' &&
    info.status !== 'reconnecting'
  );
}

/** gameOnItsWay for the game route's online session, as its connection changes. */
export function useGameOnItsWay(
  model: HandedGo | null,
  connection: SessionConnection | null | undefined,
): boolean {
  return gameOnItsWay(model, useOnlineInfo(connection));
}

function Covered({ model, waiting, children }: { model: HandedGo; waiting: boolean; children: ReactNode }) {
  const reduce = useReduceMotion();
  const [phase, setPhase] = useState<Phase>('cover');
  // GO!'s own frame has been drawn: the game may mount under it, once it is here (`waiting`), with no frame more.
  const [coverDrawn, setCoverDrawn] = useState(false);
  if (phase === 'cover' && coverDrawn && !waiting) setPhase('under');
  const shown = useSharedValue(0);
  // Android's back does nothing while GO! is on screen (as from "found", [D32]); the game's handlers ask it
  // (goCoverGate.ts: theirs come after this one's, and React Native asks the newest first).
  const [gate] = useState(goCoverGate);
  useEffect(() => gate.lift, [gate]);

  useEffect(() => {
    switch (phase) {
      case 'cover': {
        // GO!'s own frame first; the game (and its back handlers, behind the gate) a frame later, or as it comes.
        const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
        const stop = afterFrames(1, () => setCoverDrawn(true));
        return () => {
          stop();
          sub.remove();
        };
      }
      case 'under': {
        let wait: ReturnType<typeof setTimeout> | undefined;
        const stop = afterFrames(SWAP_FRAMES, () => {
          const left = goFadeFrom(model, reduce) - systemClock.now();
          if (left <= 0) setPhase('fade');
          else wait = setTimeout(() => setPhase('fade'), left);
        });
        return () => {
          stop();
          clearTimeout(wait);
        };
      }
      case 'fade': {
        const fade = goFadeOf(model, reduce);
        shown.set(withTiming(1, fade));
        // Back is the game's again once GO! has faded out (a timer, so a lost animation callback never keeps it).
        const open = setTimeout(gate.lift, fade.duration ?? 0);
        const gone = setTimeout(() => setPhase('done'), (fade.duration ?? 0) + RETIRE_MS);
        return () => {
          clearTimeout(open);
          clearTimeout(gone);
        };
      }
      case 'done':
        gate.lift();
        return undefined;
    }
  }, [phase, reduce, shown, gate, model]);

  const gameStyle = useAnimatedStyle(() => ({
    opacity: UNDER_OPACITY + (1 - UNDER_OPACITY) * shown.get(),
  }));
  const coverStyle = useAnimatedStyle(() => ({ opacity: 1 - shown.get() }));
  // GO! alone, the game still on its way: all there is on screen, so screen readers may reach it meanwhile.
  const alone = phase === 'cover' && waiting;

  return (
    <View style={styles.fill}>
      <Animated.View style={[styles.fill, gameStyle]} testID="go-cover-game">
        <GoCoverGateContext.Provider value={gate}>
          {phase === 'cover' ? null : children}
        </GoCoverGateContext.Provider>
      </Animated.View>
      {phase === 'done' ? null : (
        <Animated.View
          style={[StyleSheet.absoluteFill, coverStyle]}
          pointerEvents="none"
          accessibilityElementsHidden={!alone}
          importantForAccessibility={alone ? 'auto' : 'no-hide-descendants'}
          testID="go-cover"
        >
          {model.kind === 'friendsGo' ? (
            <FriendsGoFrame lobby={model.lobby} myId={model.myId} shownAt={model.shownAt} />
          ) : (
            <CountdownView model={model} reduce={reduce} still testID="go-cover-count" />
          )}
        </Animated.View>
      )}
    </View>
  );
}

/**
 * The earliest GO! may start fading into the game (phone time): a friends room's GO!, once it has been seen
 * motion.md's `go` (boardRevealAt − goAt, 400 ms) less this fade; a ranked one, at once (its match screen held it).
 */
export function goFadeFrom(model: HandedGo, reduce: boolean): number {
  if (model.kind !== 'friendsGo') return -Infinity;
  const { goAt, boardRevealAt } = motion.sequence.matchFound;
  const fadeMs = goFadeOf(model, reduce).duration ?? 0;
  return model.shownAt + Math.max(0, boardRevealAt - goAt - fadeMs);
}

/**
 * GO!'s fade into the game. A ranked GO!: `flow.fade`'s 240 ms (reduced motion 200), as the match screen's own
 * layers. A friends room's GO!: the room's own way into the game before it (QA go-hold-joiner, loop 13), the stack
 * fade as this platform runs it (theme/transitions.ts flowFadeMs: Android's fixed 150 ms, iOS 240, reduced motion
 * 200), so the handover adds nothing after the game's draw that the old replace did not (the phones' tail after the
 * mount was 0.20–0.26 s with 150 ms; 240 would have eaten most of what starting the mount at once saves).
 */
export function goFadeOf(model: HandedGo, reduce: boolean): ReturnType<typeof timing> {
  const fade = timing(motion.duration.stateChange, 'standard', reduce);
  return model.kind === 'friendsGo' && Platform.OS === 'android'
    ? { ...fade, duration: ANDROID_STACK_FADE_MS }
    : fade;
}

/**
 * react-native-screens' fixed fade on Android (theme/transitions.ts ANDROID_FADE_MS, which GoCover.test.tsx checks
 * this against; not imported here: it brings the navigator's theme into the game screen's tests).
 */
const ANDROID_STACK_FADE_MS = 150;

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
