import { AVATAR_IDS } from '@sudoku-fight/protocol';
import { useTranslation } from 'react-i18next';
import { I18nManager, StyleSheet, View } from 'react-native';

import { Avatar, paletteAt } from '../../components/player';
import { Enter } from '../../components/ui/Enter';
import { Text } from '../../components/ui/Text';
import { radius, space, text } from '../../theme';

/** Four rivals from the catalogue, around the empty seat (any four: the picture only says "they wait"). */
const RIVALS = [AVATAR_IDS[3]!, AVATAR_IDS[17]!, AVATAR_IDS[24]!, AVATAR_IDS[40]!] as const;
const ME = paletteAt(0);
/** The board's fan: the outer pair tilts 12°, the inner pair 6°. */
const TILT = { outer: 12, inner: 6 } as const;
/** The fan opening (MOT-3): the inner pair pops in first, the outer pair 80 ms later. */
const FAN_STAGGER = 80;

/**
 * The Login board's arena: rivals fanned around an empty seat in my P1 frame, "המקום שלך" under it. Direction
 * C: flat frames, no glow and no bobbing. As the screen opens the rivals fan out around the seat once (MOT-3:
 * the inner pair pops in, then the outer pair); with Reduced Motion they are simply there. Decoration only,
 * hidden from screen readers: the title under it says the same.
 *
 * React Native mirrors the row in Hebrew but not a rotation, so each tilt turns over with it and the fan opens
 * outwards in both directions.
 */
export function LoginArena({ testID = 'login-arena' }: { testID?: string }) {
  const { t } = useTranslation('account');
  const tilt = (deg: number) => ({ transform: [{ rotate: `${I18nManager.isRTL ? -deg : deg}deg` }] });
  return (
    <View
      style={styles.arena}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
    >
      <Enter kind="pop" index={1} stagger={FAN_STAGGER} style={styles.outerSlot} testID={`${testID}-rival-0`}>
        <Avatar avatarId={RIVALS[0]} size="card" style={[styles.outer, tilt(-TILT.outer)]} />
      </Enter>
      <Enter kind="pop" index={0} stagger={FAN_STAGGER} style={styles.innerSlot} testID={`${testID}-rival-1`}>
        <Avatar avatarId={RIVALS[1]} size="row" presence="online" style={tilt(-TILT.inner)} />
      </Enter>
      <View style={styles.seat}>
        <Avatar avatarId={null} size="home" colorIndex={0} testID={`${testID}-seat`} />
        <View style={styles.spot}>
          <Text style={styles.spotText} numberOfLines={1}>
            {t('login.arenaSpot')}
          </Text>
        </View>
      </View>
      <Enter kind="pop" index={0} stagger={FAN_STAGGER} style={styles.innerSlot} testID={`${testID}-rival-2`}>
        <Avatar avatarId={RIVALS[2]} size="row" presence="online" style={tilt(TILT.inner)} />
      </Enter>
      <Enter kind="pop" index={1} stagger={FAN_STAGGER} style={styles.outerSlot} testID={`${testID}-rival-3`}>
        <Avatar avatarId={RIVALS[3]} size="card" style={[styles.outer, tilt(TILT.outer)]} />
      </Enter>
    </View>
  );
}

const styles = StyleSheet.create({
  arena: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: space[3] },
  // Where each rival sits in the fan (on its slot, which pops), and the outer pair a little dimmer.
  outerSlot: { marginTop: space[13] },
  innerSlot: { marginTop: space[10] },
  outer: { opacity: 0.85 },
  seat: { alignItems: 'center', gap: space[4] },
  spot: {
    paddingHorizontal: space[4],
    paddingVertical: space[1],
    borderRadius: radius.xs,
    backgroundColor: ME.ring,
  },
  spotText: { ...text('micro'), color: ME.onRing },
});
