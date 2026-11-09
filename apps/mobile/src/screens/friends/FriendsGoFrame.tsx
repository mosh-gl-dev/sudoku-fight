import type { PlayerId } from '@sudoku-fight/engine';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tokens } from '../../theme';
import { ScreenHeader } from '../home/parts';
import { FriendsCountdown } from './FriendsCountdown';
import { type FriendsLobby, roomSubtitleOf } from './friendsModel';

export interface FriendsGoFrameProps {
  lobby: FriendsLobby;
  myId: PlayerId | null;
  /** When GO! was first shown on the room screen (phone time): its slam goes on from where it is by then. */
  shownAt: number;
}

/**
 * The friends room's GO! as FriendsRoomScreen draws it (its header with no back, the players, GO!), for the game
 * screen to open on while the game mounts under it (GoCover; QA go-hold-joiner, loop 13): the same picture, so the
 * cut from the room to the game is between two identical frames, and GO!'s slam goes on, never again from 1.4.
 * Kept apart from FriendsRoomScreen (its lobby, share and seats) so the game screen loads only this.
 */
export function FriendsGoFrame({ lobby, myId, shownAt }: FriendsGoFrameProps) {
  const { t } = useTranslation('friends');
  const { top } = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: top }]} testID="friends-go-frame">
      <ScreenHeader title={t('title')} subtitle={roomSubtitleOf(t, lobby)} style={styles.header} />
      <FriendsCountdown lobby={lobby} myId={myId} step="go" goShownAt={shownAt} cover />
    </View>
  );
}

/** FriendsRoomScreen's own `screen` and `header`. */
const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: tokens.layout.gutterGame },
});
