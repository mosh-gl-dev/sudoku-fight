import type { TFunction } from 'i18next';
import { type ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { AVATAR_REACTIONS, AVATAR_STAGES } from '../../avatars/reactions';
import { useReadyFace } from '../../avatars/useFaces';
import { Icon } from '../../components/Icon';
import { Avatar } from '../../components/player/Avatar';
import { NEVER_REDUCE } from '../../components/player/anim';
import { Flag } from '../../components/player/Flag';
import { ltr } from '../../components/player/format';
import { paletteAt } from '../../components/player/metrics';
import { SeatGlyph } from '../../components/player/SeatGlyph';
import { timing } from '../../components/ui/motion';
import { Text } from '../../components/ui/Text';
import { parenthetical } from '../../i18n/compose';
import { color, radius, space, text, tokens } from '../../theme';
import { motion } from '../../theme/motion';
import { usePulse } from '../game/connection/motion';
import { isolateName } from '../game/hit/hitModel';
import type { MatchHeader, RatingRange, SeatModel } from './matchModel';
import { metrics } from './metrics';

/**
 * Pieces the match screens share: the header chip, a player's tile (the VS, the countdown), the rating
 * range as text and as a bar. Numbers are Teko and left to right inside the Hebrew (LRI…PDI around a range).
 */

export type MatchT = TFunction<'match'>;

/**
 * A part that already ends a sentence ("מחכים…", "נמצא יריב!") takes no full stop after it: Latin and Hebrew
 * punctuation, the full-width 。！？ of Japanese and Chinese, and the Arabic ؟ (plan 0ה).
 */
const ENDS_SENTENCE = /[.…!?:。！？؟]$/;

/**
 * Sentences as one label or announcement: "כל השחקנים מוכנים. 2 מתוך 2 מוכנים". After a part that ends itself
 * comes the space after a sentence (sentenceSpace: none in Japanese and Chinese), else the full stop with it (sep).
 */
export function joinSentences(parts: readonly (string | null | false | undefined)[], t: MatchT): string {
  return parts
    .filter((p): p is string => !!p)
    .reduce(
      (all, part) =>
        !all ? part : `${all}${ENDS_SENTENCE.test(all) ? t('sentenceSpace') : t('sep')}${part}`,
      '',
    );
}

/** "1237–1337", isolated so it keeps its order inside a Hebrew sentence. */
export const rangeText = (range: Pick<RatingRange, 'low' | 'high'>): string =>
  ltr(`${range.low}–${range.high}`);

/** "מדורג · 2 שחקנים · רגיל". */
export function headerText(header: MatchHeader, t: MatchT): string {
  return t('header', {
    mode: t('ranked'),
    players: t('players', { count: header.players }),
    type: t(`home:gameTypes.${header.gameType}.name`),
  });
}

/** The chip at the top of every match screen: what is being played. */
export function HeaderChip({ header, testID }: { header: MatchHeader; testID?: string }) {
  const { t } = useTranslation('match');
  return (
    <View style={styles.chip} testID={testID}>
      <Icon name="trophy" size={tokens.size.icon.inline - space[2]} color={color.accent} />
      <Text style={styles.chipText} numberOfLines={1}>
        {headerText(header, t)}
      </Text>
    </View>
  );
}

export interface SeatTileProps {
  seat: SeatModel;
  /** The ready badges show (they pop in after the VS, motion.md `vs.slam`). */
  showReady: boolean;
  reduce: boolean;
  /**
   * Kept still, unseen, under the count (the VS once the count took its place): the avatar stays as it is drawn,
   * a nod under way never swapped for a new picture (AvatarArt `frozen`), and "מתחבר…" stops pulsing.
   */
  frozen?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * A player at the table (Match-Found): the avatar in the seat's colour (me: P1), the seat's shape, the name
 * and flag, the rating (with "זמני" for the first 10 games, spec §11.2), and ready or still connecting (D37).
 * One label for screen readers: "NinaVolt, דירוג 1305, זמני, מוכן". Ready, the avatar smiles, and it nods as
 * its "מוכן" shows (avatars/useFaces useReadyFace): when the badges pop for a player who was in before them
 * (most are: phones connect within a few hundred ms), or when a player still connecting gets in after them. Tied to
 * the readiness on screen, the nod is never lost to a player who was in before the VS was first drawn (QA B43).
 */
export function SeatTile({ seat, showReady, reduce, frozen = false, style }: SeatTileProps) {
  const { t } = useTranslation('match');
  const { t: tp } = useTranslation('player');
  const connecting = showReady && !seat.ready;
  const pulse = usePulse(connecting && !frozen, reduce);
  const shown = useReadyFace(showReady && seat.ready);
  // The mood follows the player (a smile once in); the nod, what the tile says.
  const face = {
    expression: seat.ready ? AVATAR_REACTIONS.moods.ready : shown.expression,
    reaction: shown.reaction,
  };
  const ring = paletteAt(seat.colorIndex).ring;
  const name = seat.name;
  const ratingLabel = seat.provisional
    ? tp('rating.provisionalLabel', { label: tp('rating.label', { value: seat.rating }) })
    : tp('rating.label', { value: seat.rating });
  const state = seat.ready ? t('found.ready') : t('found.connecting');
  // The name isolated, so a Latin one keeps its order in a Hebrew sentence.
  const label = t('found.seatLabel', {
    name: seat.isMe ? parenthetical(isolateName(name), t('me'), t) : isolateName(name),
    rating: ratingLabel,
    state,
  });

  return (
    <View
      style={[styles.tile, seat.isMe && { borderColor: ring }, style]}
      accessible
      accessibilityLabel={label}
      testID={`seat-${seat.id}`}
    >
      <View style={styles.tileGlyph}>
        <SeatGlyph colorIndex={seat.colorIndex} size={metrics.tile.glyph} />
      </View>
      <Avatar
        avatarId={seat.avatarId}
        size="row"
        colorIndex={seat.colorIndex}
        idle={AVATAR_STAGES.vs}
        expression={face.expression}
        reaction={face.reaction}
        frozen={frozen}
        testID={`seat-${seat.id}-avatar`}
      />
      <View style={styles.nameRow}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Flag country={seat.country} size="compact" decorative />
      </View>
      {seat.isMe ? <Text style={[styles.meTag, { color: ring }]}>{t('me')}</Text> : null}
      <View style={styles.ratingRow}>
        <Text style={styles.rating}>{seat.rating}</Text>
        {seat.provisional ? <Text style={styles.provisional}>{tp('rating.provisional')}</Text> : null}
      </View>
      {showReady ? (
        // A new badge (connecting, then ready) pops in its turn.
        <BadgePop
          key={seat.ready ? 'ready' : 'connecting'}
          still={reduce || frozen}
          testID={`seat-${seat.id}-badge-pop`}
        >
          <Animated.View
            style={[styles.badge, seat.ready ? styles.badgeReady : styles.badgeWaiting, connecting && pulse]}
            testID={`seat-${seat.id}-${seat.ready ? 'ready' : 'connecting'}`}
          >
            {seat.ready ? <Icon name="check" size={space[7]} color={color.success} /> : null}
            <Text style={[styles.badgeText, seat.ready ? styles.badgeTextReady : null]}>{state}</Text>
          </Animated.View>
        </BadgePop>
      ) : (
        // Its place, kept from the start: the badges popping in move nothing (QA K3: the VS jumped ~50 px).
        <View style={styles.badgeSlot} testID={`seat-${seat.id}-badge-slot`} />
      )}
    </View>
  );
}

/**
 * A ready badge popping in (motion.md `vs.slam`: the badges pop; `pop` spring, as chips and badges): 0.6 → 1 as
 * it fades in. `still` (reduced motion, or the VS kept unseen under the count): there at once, nothing moves.
 * Transforms only, so nothing around it moves either.
 */
function BadgePop({ still, testID, children }: { still: boolean; testID: string; children: ReactNode }) {
  const shown = useSharedValue(still ? 1 : 0);
  const scale = useSharedValue(still ? 1 : metrics.vs.badgePopFrom);
  useEffect(() => {
    if (still) {
      shown.set(1);
      scale.set(1);
      return;
    }
    shown.set(withTiming(1, timing(motion.duration.stateChange, 'standard', false)));
    scale.set(withSpring(1, { ...motion.spring.pop, reduceMotion: NEVER_REDUCE }));
  }, [still, shown, scale]);
  const style = useAnimatedStyle(() => ({ opacity: shown.get(), transform: [{ scale: scale.get() }] }));
  return (
    <Animated.View style={style} testID={testID}>
      {children}
    </Animated.View>
  );
}

/**
 * The range as a bar (Match-Search): my rating in the middle (a P1 mark), the band of ratings I can meet, and
 * dashed ends that fill in as it widens toward its cap; with no cap ("keep searching") the band runs to the
 * ends. Always left to right (lower ratings on the left). Decorative: the text above it says the range.
 */
export function RangeBar({ range }: { range: RatingRange }) {
  const band = range.extended ? 1 : metrics.rangeBar.minBand + (1 - metrics.rangeBar.minBand) * range.widened;
  const width = metrics.rangeBar.width;
  const bandWidth = Math.round(width * band);
  const side = Math.max(0, Math.round((width - bandWidth) / 2));
  return (
    <View
      style={[styles.bar, { width }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="range-bar"
    >
      {side > 0 ? <View style={[styles.barDash, { start: 0, width: side }]} /> : null}
      {side > 0 ? <View style={[styles.barDash, { end: 0, width: side }]} /> : null}
      <View style={[styles.barBand, { start: side, width: bandWidth }]} testID="range-band" />
      <View style={[styles.barMarker, { start: width / 2 - metrics.rangeBar.marker.width / 2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: space[3],
    height: metrics.chipHeight,
    paddingHorizontal: space[6],
    borderRadius: radius.badge,
    borderWidth: tokens.border.hairline,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  chipText: { ...text('label'), color: color.textMuted },
  rating: { ...text('scoreCompact'), color: color.accent },
  tile: {
    flex: 1,
    minWidth: 0,
    minHeight: metrics.tile.minHeight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[3],
    paddingVertical: space[7],
    paddingHorizontal: space[5],
    borderRadius: radius.card,
    borderWidth: tokens.border.hairline,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  tileGlyph: { position: 'absolute', top: space[5], start: space[5] },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], maxWidth: '100%' },
  name: { ...text('playerName'), color: color.text, flexShrink: 1 },
  meTag: { ...text('micro') },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  provisional: { ...text('micro'), color: color.textMuted },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    height: metrics.badgeHeight,
    paddingHorizontal: space[4],
    borderRadius: radius.pill,
    borderWidth: tokens.border.hairline,
  },
  /** A badge's place before it pops in: its height, so the tile is the same size with or without it. */
  badgeSlot: { height: metrics.badgeHeight },
  badgeReady: { borderColor: color.success, backgroundColor: color.iconBg.success },
  badgeWaiting: { borderColor: color.border, backgroundColor: color.bg },
  badgeText: { ...text('micro'), color: color.textMuted },
  badgeTextReady: { color: color.success },
  bar: { height: metrics.rangeBar.marker.height, direction: 'ltr', alignSelf: 'center' },
  barDash: {
    position: 'absolute',
    top: (metrics.rangeBar.marker.height - tokens.border.focus) / 2,
    height: 0,
    borderTopWidth: tokens.border.focus,
    borderStyle: 'dashed',
    borderColor: color.border,
  },
  barBand: {
    position: 'absolute',
    top: (metrics.rangeBar.marker.height - metrics.rangeBar.height) / 2,
    height: metrics.rangeBar.height,
    borderRadius: radius.bar,
    backgroundColor: color.accent,
  },
  barMarker: {
    position: 'absolute',
    top: 0,
    width: metrics.rangeBar.marker.width,
    height: metrics.rangeBar.marker.height,
    borderRadius: radius.bar,
    backgroundColor: paletteAt(0).ring,
  },
});
