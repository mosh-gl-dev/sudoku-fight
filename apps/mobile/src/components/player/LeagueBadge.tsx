import { useTranslation } from 'react-i18next';
import { StyleSheet, type TextStyle, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import { color, text } from '../../theme';
import { Text } from '../ui/Text';
import { LEAGUE_THRESHOLDS, leagueFor, type League, type LeagueThresholds } from './league';
import { metrics } from './metrics';

export interface LeagueBadgeProps {
  /**
   * The player's highest rating [D9]. Null hides the badge: it appears only once 10 provisional games are
   * done in some rating key (spec §11.3).
   */
  rating?: number | null;
  /** The league itself (the server's answer), instead of a rating; null hides the badge too. */
  league?: League | null;
  level?: number | null;
  /** `text`: "ליגת זהב · רמה 14" (Home). `icon`: hexagon, tier name in its colour, then the level. */
  variant?: 'text' | 'icon';
  /**
   * `icon` in a narrow column (a leaderboard row): the level goes under the league's name when both don't fit
   * one line, never over what follows the column, and no word breaks (QA loop 7: "LevelProvisional").
   */
  wrap?: boolean;
  thresholds?: LeagueThresholds;
  style?: StyleProp<ViewStyle>;
}

const { hexWidth: W, hexHeight: H } = metrics.league;
const HEXAGON = `${W / 2},0 ${W},${H / 4} ${W},${(3 * H) / 4} ${W / 2},${H} 0,${(3 * H) / 4} 0,${H / 4}`;

/** The league of a rating (components.md §5.2). */
export function LeagueBadge({
  rating = null,
  league: given,
  level = null,
  variant = 'text',
  wrap = false,
  thresholds = LEAGUE_THRESHOLDS,
  style,
}: LeagueBadgeProps) {
  const { t } = useTranslation('player');
  const league: League | null =
    given !== undefined ? given : rating === null ? null : leagueFor(rating, thresholds);
  if (league === null) return null;
  const tier = t(`league.${league}`);
  const name = t('league.name', { league: tier });
  const levelText = level === null ? null : t('league.level', { level });
  const sep = t('sep');
  const a11y = levelText ? `${name}${t('listSep')}${levelText}` : name;
  const tint = color.league[league];

  if (variant === 'text') {
    return (
      // The badge takes a container style; as text it lays out the same way (Expo's web types widen ViewStyle).
      <Text
        style={[text('body'), styles.muted, style as StyleProp<TextStyle>]}
        accessibilityLabel={a11y}
        testID={`league-${league}`}
      >
        {levelText ? `${name}${sep}${levelText}` : name}
      </Text>
    );
  }

  const hexagon = (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Polygon points={HEXAGON} fill={tint} />
    </Svg>
  );
  const tierText = <Text style={[text('micro'), { color: tint }]}>{tier}</Text>;
  return (
    <View
      style={[styles.row, wrap && styles.wrap, style]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={a11y}
      testID={`league-${league}`}
    >
      {/* Wrapping, the hexagon stays with its tier's name: the level is what moves to the next line. */}
      {wrap ? (
        <View style={styles.row}>
          {hexagon}
          {tierText}
        </View>
      ) : (
        <>
          {hexagon}
          {tierText}
        </>
      )}
      {level === null ? null : (
        <Text style={[text('micro'), styles.muted]}>{t('league.levelAfter', { level })}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: metrics.league.gap },
  wrap: { flexWrap: 'wrap', flexShrink: 1, maxWidth: '100%' },
  muted: { color: color.textMuted },
});
