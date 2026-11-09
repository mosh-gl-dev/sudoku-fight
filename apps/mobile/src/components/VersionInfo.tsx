import { useTranslation } from 'react-i18next';
import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { type AppVersionInfo, appVersionInfo } from '../config/appVersion';
import { color, space, text } from '../theme';
import { ltr } from './player/format';

import { Text } from './ui/Text';
export interface VersionInfoProps {
  /** What to show; by default this app's (config/appVersion.ts). Null, or no version: nothing. */
  info?: AppVersionInfo | null;
  /** The settings add the engine's version at the end of the second line. */
  engine?: string | number | null;
  /**
   * A tap on the lines: the settings of a staging build count 7 quick ones to open "בדיקה" (config/testing.ts).
   * Left out, the lines are plain text.
   */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Which app this is (Moshe, 14.10.2026: "I can see it in the app"), at the bottom of the settings and of the
 * login screen: "גרסה 1.0.0", and under it, small, "build a1b2c3d · staging" (the commit `npm run apk` built and
 * the game server). Latin text in its own direction (CLAUDE.md: isolated), so it reads the same in Hebrew.
 */
export function VersionInfo({
  info = appVersionInfo(),
  engine = null,
  onPress,
  style,
  testID = 'app-version',
}: VersionInfoProps) {
  const { t } = useTranslation('common');
  if (!info?.version) return null;
  const version = t('appVersion.version', { version: ltr(info.version) });
  // The commit and the engine's version isolated too: after an Arabic word, "87760ce-dirty"'s leading digits
  // would join it as an Arabic number and come out "87760 البناءce-dirty" (the bidi algorithm's W2; QA run #2, B5).
  const details = [
    info.build ? t('appVersion.build', { build: ltr(info.build) }) : null,
    info.server,
    engine === null ? null : t('appVersion.engine', { engine: ltr(String(engine)) }),
  ]
    .filter((part): part is string => part !== null)
    .join(t('player:sep'));
  const label = `${version}${t('player:listSep')}${details}`;
  const lines = (
    <>
      <Text style={styles.version} testID={`${testID}-version`}>
        {version}
      </Text>
      <Text style={styles.details} testID={`${testID}-details`}>
        {ltr(details)}
      </Text>
    </>
  );
  // No press feedback, and read as the text it is (not "button"): the taps are a tester's way in, not a control
  // to offer. A screen reader's double tap still counts as one.
  return onPress ? (
    <Pressable
      style={[styles.root, style]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
      onPress={onPress}
      testID={testID}
    >
      {lines}
    </Pressable>
  ) : (
    <View style={[styles.root, style]} accessible accessibilityLabel={label} testID={testID}>
      {lines}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: space[1] },
  version: { ...text('caption'), color: color.textMuted, textAlign: 'center' },
  details: { ...text('micro'), color: color.textFaint, textAlign: 'center' },
});
