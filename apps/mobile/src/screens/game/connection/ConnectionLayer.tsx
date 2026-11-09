import type { PlayerId } from '@sudoku-fight/engine';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AvatarIdOrNone } from '../../../avatars';
import type { Gender } from '../../../components/player/wording';
import { color } from '../../../theme';
import { Announcer } from './Announcer';
import { ConnectingView } from './ConnectingView';
import { ConnectionError } from './ConnectionError';
import type { ConnectionModel } from './connectionModel';
import type { MatchLoading } from './loadingModel';
import { LobbyView } from './LobbyView';
import { OpponentLeft } from './OpponentLeft';
import { OpponentReconnecting } from './OpponentReconnecting';
import { SelfReconnecting } from './SelfReconnecting';
import { useTimeUpHold } from './useTimeUpHold';

export interface ConnectionLayerProps {
  /** connectionModel(view, status, now), recomputed as time passes (the game screen's tick). */
  model: ConnectionModel;
  /** Error: "נסה שוב". */
  onRetry: () => void;
  /** Error and opponent-left: "לבית". */
  onHome: () => void;
  /** Opponent-left: "לתוצאות". */
  onResults: () => void;
  /** Lobby: "יציאה מהחדר". Connecting: "ביטול" (both left out → no button while connecting). */
  onLeave: () => void;
  /** Error: "עבור לאימון". */
  onPractice?: () => void;
  /** Lobby: copy the code (the app has no clipboard module yet; left out, the code is selectable). */
  onCopy?: (code: string) => void | Promise<void>;
  /** Where the opponent freeze begins (the bottom of the cards, in this layer's coordinates). */
  freezeTop?: number;
  /** The disconnected or departed opponent's grammatical gender (Hebrew verbs). */
  gender?: Gender;
  /** Avatars by player, when known (lobby seats, the opponent-left card). */
  avatars?: Partial<Record<PlayerId, AvatarIdOrNone>>;
  /** Countries by player, when known (a ranked match's profiles): the leaver's flag on the opponent-left card. */
  countries?: Partial<Record<PlayerId, string | null>>;
  /** This phone's player (for its avatar on the opponent-left card). */
  myId?: PlayerId;
  /** Connecting into a ranked match's room: its players, tag, percent and tip (./loadingModel). */
  loading?: MatchLoading | null;
  /**
   * Drawn over a live game (GameScreen), not alone: the error screen then paints the ground, so the board,
   * the cards and the keypad never show through it. Alone (no game yet), it stays see-through, and the app's
   * wandering digits [D126] are its background like any screen's.
   */
  overGame?: boolean;
}

/**
 * Everything the connection model can show, in one place, drawn over the game screen (or alone before the
 * game has a view): the integrator renders it last, over the screen's content, and hides that content from
 * screen readers and touches while blocksInput(model) is true. The full screens are also modal for VoiceOver
 * (accessibilityViewIsModal), so nothing of the game under them is reached first. The two transient overlays
 * (self and opponent reconnecting) stay mounted so they can fade out; the full screens (connecting, lobby, error, opponent-left)
 * come and go with the model. My connection's soft phase [D42] draws nothing at all (the game goes on, my card
 * shows the mark): screen readers hear it once. The opponent's freeze ends on its time-up state (the ring at
 * 0, "בודקים מול השרת…") for a moment before "the opponent left", even when the server's verdict was on time.
 */
export function ConnectionLayer({
  model: given,
  onRetry,
  onHome,
  onResults,
  onLeave,
  onPractice,
  onCopy,
  freezeTop = 0,
  gender,
  avatars,
  countries,
  myId,
  loading = null,
  overGame = false,
}: ConnectionLayerProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('game');
  // The opponent's countdown ends at 0 and its time-up state, before "the opponent left" (./useTimeUpHold).
  const model = useTimeUpHold(given);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" testID="connection-layer">
      {model.kind === 'selfOffline' ? (
        <Announcer line={t('connection.offline.announce')} testID="self-offline-announcer" />
      ) : null}
      <OpponentReconnecting
        model={model.kind === 'opponentReconnecting' ? model : null}
        gender={gender}
        top={freezeTop}
        bottomInset={insets.bottom}
      />
      <SelfReconnecting model={model.kind === 'selfReconnecting' ? model : null} />
      {model.kind === 'opponentLeft' ? (
        <OpponentLeft
          model={model}
          onResults={onResults}
          onHome={onHome}
          gender={gender}
          myAvatar={myId ? avatars?.[myId] : undefined}
          opponentAvatar={avatars?.[model.playerId]}
          opponentCountry={countries?.[model.playerId] ?? null}
        />
      ) : null}
      {model.kind === 'error' ? (
        <View
          style={[StyleSheet.absoluteFill, overGame && styles.ground]}
          accessibilityViewIsModal
          testID="connection-error-cover"
        >
          <ConnectionError model={model} onRetry={onRetry} onHome={onHome} onPractice={onPractice} />
        </View>
      ) : null}
      {model.kind === 'connecting' ? (
        <View style={StyleSheet.absoluteFill} accessibilityViewIsModal testID="connecting-cover">
          <ConnectingView model={model} match={loading} onCancel={onLeave} />
        </View>
      ) : null}
      {model.kind === 'lobby' ? (
        <View style={StyleSheet.absoluteFill} accessibilityViewIsModal testID="lobby-cover">
          <LobbyView model={model} onLeave={onLeave} onCopy={onCopy} avatars={avatars} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ground: { backgroundColor: color.bg },
});
