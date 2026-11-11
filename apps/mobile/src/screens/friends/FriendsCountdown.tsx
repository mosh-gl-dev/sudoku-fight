import type { PlayerId } from '@sudoku-fight/engine';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AVATAR_REACTIONS, AVATAR_STAGES } from '../../avatars/reactions';
import { Avatar } from '../../components/player/Avatar';
import { SeatGlyph } from '../../components/player/SeatGlyph';
import { Text } from '../../components/ui/Text';
import { systemClock } from '../../game/clock';
import { color, space, text } from '../../theme';
import { useReduceMotion } from '../../theme/motion';
import { Announcer } from '../game/connection/Announcer';
import { useSlam, useSlamSince } from '../game/connection/motion';
import type { CountdownStep } from '../match/matchModel';
import { type FriendsLobby, seatsOf } from './friendsModel';

export interface FriendsCountdownProps {
  lobby: FriendsLobby;
  myId: PlayerId | null;
  step: CountdownStep;
  /**
   * When GO! was first shown on the room screen (phone time, app/friends/room.tsx), GO!'s slam set by it
   * (useSlamSince): the room's own GO! and the game screen's cover take the one number. Not given: GO!'s first
   * render.
   */
  goShownAt?: number | null;
  /**
   * The game screen's GO!, standing for this one as the game mounts under it (GoCover): the avatars as they are
   * drawn (frozen), nothing said again, and GO!'s slam where the room's is (`goShownAt`), not again.
   */
  cover?: boolean;
}

/**
 * 3… 2… 1… GO! after the host's "התחל" (§3.5), at the server's time, before the board: the players who are in
 * the game (the seats not away), each in their colour and shape, me in P1's. Each step slams in (motion.md
 * `countdown.digit`); reduced motion: a fade only. A screen reader hears each step once. The ranked game's
 * own count (screens/match CountdownView) says "מדורג" in its header, so the room has this one, which doesn't.
 * The players are there from its first frame, only the step slams in (QA go-hold-joiner, loop 12: the whole
 * column faded in from 0, so the first frame after the lobby showed nothing but the header, on every phone).
 */
export function FriendsCountdown({ lobby, myId, step, goShownAt, cover = false }: FriendsCountdownProps) {
  const { t } = useTranslation('match');
  const { t: tp } = useTranslation('player');
  const reduce = useReduceMotion();
  const playing = seatsOf(lobby, myId).filter((s) => s.player && !s.player.away);
  const go = step === 'go';
  const line = go
    ? t('countdown.goLabel')
    : t('countdown.stepLabel', { time: tp('seconds', { count: step }) });
  return (
    <View style={styles.root} testID="friends-countdown">
      <View style={styles.column} testID="friends-countdown-players">
        <View style={styles.strip}>
          {playing.map((s) => (
            <View key={s.player!.id} style={styles.seat} testID={`friends-countdown-${s.player!.id}`}>
              <Avatar
                avatarId={s.player!.avatarId}
                size="card"
                colorIndex={s.colorIndex}
                idle={AVATAR_STAGES.countdown}
                expression={AVATAR_REACTIONS.moods.ready}
                frozen={cover}
              />
              <View style={styles.name}>
                <SeatGlyph colorIndex={s.colorIndex} size={GLYPH} />
                <Text style={styles.nameText} numberOfLines={1}>
                  {s.player!.isMe ? t('me') : s.player!.name}
                </Text>
              </View>
            </View>
          ))}
        </View>
        {go ? (
          <GoStep key="go" reduce={reduce} shownAt={goShownAt ?? undefined} owner={!cover} />
        ) : (
          <Step key={String(step)} step={step} reduce={reduce} />
        )}
        <Text style={styles.ready}>{go ? t('countdown.starting') : t('countdown.getReady')}</Text>
      </View>
      <Announcer line={cover ? null : line} testID="friends-countdown-live" />
    </View>
  );
}

function Step({ step, reduce }: { step: Exclude<CountdownStep, 'go'>; reduce: boolean }) {
  const slam = useSlam(reduce);
  return (
    <Animated.Text style={[styles.digit, slam]} testID="friends-countdown-step">
      {String(step)}
    </Animated.Text>
  );
}

/**
 * GO!, its slam set by the clock from when it was first shown (useSlamSince): the room's `goShownAt`
 * (app/friends/room.tsx), on the room and on the game screen's cover alike. So where both are drawn in the cut
 * they are one GO!, and the cover's goes on from where the room's is, never again (QA go-cover-slam-jump, loop 15).
 * The room's GO! (`owner`, not the cover's) slams from 1.4 on its own first frame, not from when the room noted it
 * as it rendered, 45–200 ms sooner (QA go-slam-start-skipped, APK 21); the cover's runs from that same frame.
 */
function GoStep({
  reduce,
  shownAt,
  owner,
}: {
  reduce: boolean;
  shownAt: number | undefined;
  owner: boolean;
}) {
  const { t } = useTranslation('match');
  const [rendered] = useState(() => systemClock.now());
  const slam = useSlamSince(reduce, shownAt ?? rendered, owner);
  return (
    <Animated.Text style={[styles.go, slam]} testID="friends-countdown-step">
      {t('countdown.go')}
    </Animated.Text>
  );
}

/** The seat shape under each avatar. */
const GLYPH = 10;
/** Four avatars of the card size side by side fit a 360 dp phone. */
const SEAT_WIDTH = 72;

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[8] },
  column: { alignItems: 'center', gap: space[10] },
  strip: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space[6] },
  seat: { width: SEAT_WIDTH, alignItems: 'center', gap: space[3] },
  name: { flexDirection: 'row', alignItems: 'center', gap: space[2], maxWidth: SEAT_WIDTH },
  nameText: { ...text('label'), color: color.text, flexShrink: 1 },
  digit: { ...text('scoreXL'), color: color.text },
  go: { ...text('scoreXL'), color: color.accent },
  ready: { ...text('h1'), color: color.text, textAlign: 'center' },
});
