import { ENGINE_VERSION } from '@sudoku-fight/engine';
import { router } from 'expo-router';
import { type ReactNode, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VersionInfo } from '../../components/VersionInfo';
import { RowButton } from '../../components/ui/RowButton';
import { Text } from '../../components/ui/Text';
import { useToast } from '../../components/ui/toastStore';
import { type AppVersionInfo, appVersionInfo } from '../../config/appVersion';
import {
  nextTapRun,
  type TapRun,
  type TestingBuildSources,
  testingSectionShown,
  testingSwitchesAllowed,
  thisBuild,
  UNLOCK_TAPS,
} from '../../config/testing';
import { cue } from '../../services/feedback';
import { type ReduceMotionSetting, useSettings } from '../../state/settings';
import { useTestingSwitches } from '../../state/testingSwitches';
import { AccountSettings } from '../account/AccountSettings';
import { LegalSettings } from '../legal/LegalSettings';
import { color, radius, space, text, tokens } from '../../theme';
import { LanguagePicker } from './LanguagePicker';
import { goBack } from './navigation';
import { GUTTER, ScreenHeader, SectionLabel } from './parts';
import { PseudoLanguageSettings } from './PseudoLanguageSettings';
import { Choice, SwitchRow } from './SettingControls';

const REDUCE_MOTION: readonly ReduceMotionSetting[] = ['system', 'on', 'off'];

/**
 * "הגדרות" (spec §4.1; no board yet, built in direction C with the design-system pieces): sound, haptics,
 * reduced motion and language, kept in the persisted settings store. The language is a picker ("שפת המכשיר" and
 * every language this build offers, LanguagePicker; localization plan 0י), and a change restarts the app (the
 * root layout does it, D104), so the picker asks first (work plan stage 13). Stage 8 adds the
 * account: edit profile, sign out, and delete the account (spec §3.3, §23: deletion inside the app). Stage 14
 * adds "מידע ומשפטי": the privacy policy, the terms of use and the licenses (screens/legal). At the bottom, the
 * version (Moshe, 14.10.2026): the installed app's, its build and its server (components/VersionInfo).
 *
 * 1.0.2: a staging build (and a development build not on production) adds "בדיקה" before the version, so
 * Moshe can try staged practice before he decides (config/testing.ts): "שרשרת: ניחוש עולה 5 ש׳" [D64] and
 * "פתח את כל השלבים (בדיקה)". A production build never shows it. 1.1.0 adds the pseudo languages and the plural
 * check screen there (PseudoLanguageSettings; localization plan 0יג). 30.10.2026 adds the Pirates slice of the
 * digit-series avatars (/dev/pirates), for Moshe to judge on the phone (choosable avatars too since 31.10.2026).
 *
 * 31.10.2026 (Moshe: "ראיתי דברים מוזרים במסך הגדרות שלא הבנתי"): "בדיקה" is hidden even on staging. 7 quick taps
 * on the version lines open it, with a toast, like Android's developer options (config/testing.ts UNLOCK_TAPS);
 * it stays open on the phone, and "הסתרת אזור הבדיקה" at its end hides it again. Its switches keep working
 * while it is hidden. A production build never shows it, and its version lines take no taps.
 */
export interface SettingsScreenProps {
  /**
   * The version lines at the bottom ("גרסה 1.0.0", then "build a1b2c3d · staging · מנוע 3"); by default the
   * installed app's own (config/appVersion.ts). Null hides them.
   */
  version?: AppVersionInfo | null;
  /** Which build this is, for the "בדיקה" section (staging only, config/testing.ts); this build's by default. */
  build?: TestingBuildSources;
}

const openPirates = () => router.push('/dev/pirates');
/** Hides "בדיקה" again; its switches stay as they are. */
const hideTesting = () => useTestingSwitches.getState().setSectionOpen(false);

/**
 * The version lines' taps: UNLOCK_TAPS quick ones in a row open the "בדיקה" section, and say so in a toast.
 * Undefined (the lines stay plain text) where they open nothing: a build without the section, or once it is open.
 */
function useUnlockTaps(enabled: boolean, opened: string): (() => void) | undefined {
  const run = useRef<TapRun | null>(null);
  if (!enabled) return undefined;
  return () => {
    const next = nextTapRun(run.current, Date.now());
    run.current = next.count < UNLOCK_TAPS ? next : null;
    if (next.count < UNLOCK_TAPS) return;
    useTestingSwitches.getState().setSectionOpen(true);
    useToast.getState().show({ variant: 'success', message: opened });
  };
}

export function SettingsScreen({ version = appVersionInfo(), build = thisBuild() }: SettingsScreenProps) {
  const { t } = useTranslation('home');
  // The developer screens' words (D109: Hebrew and English only).
  const { t: td } = useTranslation('dev');
  const { top, bottom } = useSafeAreaInsets();
  const sound = useSettings((s) => s.sound);
  const haptics = useSettings((s) => s.haptics);
  const reduceMotion = useSettings((s) => s.reduceMotion);
  const testing = testingSwitchesAllowed(build);
  const sectionOpen = useTestingSwitches((s) => s.sectionOpen);
  const chainPenalty = useTestingSwitches((s) => s.chainPenalty);
  const unlockAllLevels = useTestingSwitches((s) => s.unlockAllLevels);
  const tapVersion = useUnlockTaps(testing && !sectionOpen, td('testingSection.opened'));
  const testingShown = testingSectionShown(sectionOpen, build);

  // The cue comes after the change, so it follows the new setting: turning sound on is heard, turning it off is not.
  const changed =
    <T,>(apply: (value: T) => void) =>
    (value: T) => {
      apply(value);
      cue('toggle');
    };

  return (
    <View style={[styles.screen, { paddingTop: top }]}>
      <ScreenHeader title={t('settings.title')} onBack={goBack} style={styles.header} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottom + space[12] }]}>
        <Section title={t('settings.feedback')}>
          <View style={styles.card}>
            <SwitchRow
              title={t('settings.sound')}
              hint={t('settings.soundHint')}
              value={sound}
              onChange={changed(useSettings.getState().setSound)}
              testID="setting-sound"
            />
            <View style={styles.rule} />
            <SwitchRow
              title={t('settings.haptics')}
              hint={t('settings.hapticsHint')}
              value={haptics}
              onChange={changed(useSettings.getState().setHaptics)}
              testID="setting-haptics"
            />
          </View>
        </Section>

        <Section title={t('settings.motion')} hint={t('settings.motionHint')}>
          <Choice
            label={t('settings.motion')}
            options={REDUCE_MOTION.map((value) => ({ value, label: t(`settings.reduceMotion.${value}`) }))}
            value={reduceMotion}
            onChange={changed(useSettings.getState().setReduceMotion)}
            testID="setting-motion"
          />
        </Section>

        <Section title={t('settings.language')} hint={t('settings.languageHint')}>
          <LanguagePicker testID="setting-language" />
        </Section>

        <AccountSettings />

        <LegalSettings />

        {testingShown ? (
          <Section title={t('settings.testing')} hint={t('settings.testingHint')}>
            <View style={styles.card} testID="settings-testing">
              <SwitchRow
                title={t('settings.chainPenalty')}
                hint={t('settings.chainPenaltyHint')}
                value={chainPenalty}
                onChange={changed(useTestingSwitches.getState().setChainPenalty)}
                testID="setting-chain-penalty"
              />
              <View style={styles.rule} />
              <SwitchRow
                title={t('settings.unlockAll')}
                hint={t('settings.unlockAllHint')}
                value={unlockAllLevels}
                onChange={changed(useTestingSwitches.getState().setUnlockAllLevels)}
                testID="setting-unlock-all"
              />
            </View>
            <PseudoLanguageSettings />
            <RowButton
              icon="reactions"
              title={td('piratesLab.open')}
              accessibilityHint={td('piratesLab.openHint')}
              onPress={openPirates}
              testID="setting-pirates"
            />
            <RowButton
              icon="eyeOff"
              title={td('testingSection.hide')}
              accessibilityHint={td('testingSection.hideHint', { n: UNLOCK_TAPS })}
              onPress={hideTesting}
              testID="setting-testing-hide"
            />
          </Section>
        ) : null}

        <VersionInfo info={version} engine={ENGINE_VERSION} onPress={tapVersion} />
      </ScrollView>
    </View>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <SectionLabel title={title} />
      {children}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: GUTTER.screen },
  content: { paddingHorizontal: GUTTER.screen, paddingTop: space[6], gap: space[11] },
  section: { gap: space[5] },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  rule: { height: tokens.border.hairline, backgroundColor: color.border, marginHorizontal: space[8] },
  hint: { ...text('caption'), color: color.textMuted },
});
