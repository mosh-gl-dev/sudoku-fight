import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, ScrollView, StyleSheet, type TextStyle, View } from 'react-native';

import { Icon } from '../../components/Icon';
import { ConfirmModal, Sheet } from '../../components/ui';
import { Text } from '../../components/ui/Text';
import { listOf } from '../../i18n/compose';
import { languageLabels } from '../../i18n/languageNamesIn';
import { type AppLanguage, ENABLED_LANGUAGES, isLanguage, languageName } from '../../i18n/languages';
import type { LanguageSetting } from '../../i18n/languageRules';
import { chooseLanguage, predictLanguage } from '../../i18n/languageSync';
import { cue } from '../../services/feedback';
import { useSettings } from '../../state/settings';
import { color, radius, size, space, text, tokens, typefaceFor } from '../../theme';

/**
 * The settings' language (localization plan 0י; components.md §21): a field with the language the app runs in,
 * and a sheet like the country picker's: "שפת המכשיר" first (the setting that follows the phone, D102), then each
 * language this build offers in the plan's order. A row names its language twice (Moshe, 25.11.2026: one who
 * switched to Chinese by mistake must still find his own): in the app's language ("גרמנית", "希伯来语"), and under
 * it, smaller, by its own name in its own font, the same in every language of the app ("Deutsch", "עברית",
 * "日本語" in Japanese forms). The row of the app's own language has one line; "שפת המכשיר" has the phone's
 * language under it. A screen reader reads both names in the app's language (iOS: a label has one language).
 * A choice that changes the language asks first, since the app restarts for it (D104); the question names the
 * language by its own name, which its speaker reads whatever the app speaks; it opens once the sheet has left
 * the screen (two native modals at once fail on iOS). A choice that keeps the language ("עברית" while
 * "שפת המכשיר" is Hebrew) is saved at once.
 */

interface Option {
  value: LanguageSetting;
  /** The row's name in the app's language ("גרמנית", "שפת המכשיר"). */
  label: string;
  /** Under it, smaller: the language by its own name ("Deutsch"; the phone's for "שפת המכשיר"), or none. */
  native: string | null;
  /** `native`'s font: its language's typeface. */
  nativeFont: TextStyle | null;
}

type Pending = { setting: LanguageSetting; phase: 'afterSheet' | 'asking' | 'closed' };

/** A language's own name, small, in its typeface (theme/typeface.ts): Rubik, or the system's for CJK and Thai. */
const nativeStyle = (lang: string): TextStyle => text('caption', typefaceFor(lang, Platform.OS));

export function LanguagePicker({ testID = 'setting-language' }: { testID?: string }) {
  const { t, i18n } = useTranslation('home');
  const setting = useSettings((s) => s.language);
  const [open, setOpen] = useState(false);
  // The choice, from its row to the dialog's answer (kept while the dialog closes, for its title).
  const [pending, setPending] = useState<Pending | null>(null);
  const running = i18n.language;
  const device = setting === 'system';
  // "שפת המכשיר" shows the language it is now under it; a chosen language is its name in the app's language,
  // with its own name under it when that differs.
  const shown = languageLabels(device ? running : setting, running);
  const name = shown.native ? listOf([shown.name, shown.native], t) : shown.name;
  // The phone's language, under "שפת המכשיר" (none while Android 13+ holds a choice of its own): read as the
  // sheet opens, not on every render (it asks the system).
  const [phone, setPhone] = useState<AppLanguage | null>(null);
  const openSheet = () => {
    setPhone(predictLanguage('system'));
    setOpen(true);
  };

  const options: Option[] = [
    {
      value: 'system',
      label: t('settings.languageDevice'),
      native: phone && isLanguage(phone) ? languageName(phone) : null,
      nativeFont: phone ? nativeStyle(phone) : null,
    },
    ...ENABLED_LANGUAGES.map((lang) => {
      const labels = languageLabels(lang, running);
      return { value: lang, label: labels.name, native: labels.native, nativeFont: nativeStyle(lang) };
    }),
  ];

  const choose = (next: LanguageSetting) => {
    setOpen(false);
    if (next === setting) return;
    if (predictLanguage(next) === running) {
      chooseLanguage(next);
      cue('toggle');
      return;
    }
    setPending({ setting: next, phase: 'afterSheet' });
  };

  const answer = (confirmed: boolean) => {
    if (confirmed && pending) {
      chooseLanguage(pending.setting);
      cue('toggle');
    }
    setPending((p) => p && { ...p, phase: 'closed' });
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          device
            ? t('settings.languageFieldDevice', { language: name })
            : t('settings.languageField', { language: name })
        }
        accessibilityHint={t('settings.languageSheetTitle')}
        onPress={openSheet}
        style={({ pressed }) => [styles.field, pressed && styles.pressed]}
        testID={testID}
      >
        <View style={styles.texts}>
          <Text style={styles.value} numberOfLines={1} testID={`${testID}-value`}>
            {device ? t('settings.languageDevice') : shown.name}
          </Text>
          {device ? (
            <Text style={styles.detail} numberOfLines={1} testID={`${testID}-device`}>
              {name}
            </Text>
          ) : shown.native ? (
            <Text style={[nativeStyle(setting), styles.muted]} numberOfLines={1} testID={`${testID}-native`}>
              {shown.native}
            </Text>
          ) : null}
        </View>
        <Icon name="chevronDown" size={size.icon.chevron} color={color.textMuted} />
      </Pressable>

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title={t('settings.languageSheetTitle')}
        onExited={() => setPending((p) => (p?.phase === 'afterSheet' ? { ...p, phase: 'asking' } : p))}
        testID={`${testID}-sheet`}
      >
        <ScrollView style={styles.list} bounces={false}>
          <View accessibilityRole="radiogroup" accessibilityLabel={t('settings.language')}>
            {options.map((o) => {
              const checked = o.value === setting;
              return (
                <Pressable
                  key={o.value}
                  accessibilityRole="radio"
                  accessibilityLabel={o.native ? listOf([o.label, o.native], t) : o.label}
                  accessibilityLanguage={running}
                  accessibilityState={{ checked }}
                  onPress={() => choose(o.value)}
                  style={({ pressed }) => [
                    styles.option,
                    checked && styles.optionOn,
                    pressed && styles.pressed,
                  ]}
                  testID={`${testID}-${o.value}`}
                >
                  <View style={styles.texts}>
                    <Text style={styles.optionName} numberOfLines={2}>
                      {o.label}
                    </Text>
                    {o.native ? (
                      <Text
                        style={[o.nativeFont, styles.muted]}
                        numberOfLines={1}
                        testID={`${testID}-${o.value}-native`}
                      >
                        {o.native}
                      </Text>
                    ) : null}
                  </View>
                  {checked ? <Icon name="check" size={size.icon.card} color={color.accent} /> : null}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </Sheet>

      <ConfirmModal
        visible={pending?.phase === 'asking'}
        placement="center"
        icon="refresh"
        title={
          pending?.setting === 'system'
            ? t('settings.languageConfirm.titleDevice')
            : t('settings.languageConfirm.title', { language: pending ? languageName(pending.setting) : '' })
        }
        body={t('settings.languageConfirm.body')}
        confirmLabel={t('settings.languageConfirm.confirm')}
        onConfirm={() => answer(true)}
        onCancel={() => answer(false)}
        testID="language-confirm"
      />
    </>
  );
}

const styles = StyleSheet.create({
  // The country field's box (account/PickerField): 44 high, the input fill, a hairline border.
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
    minHeight: size.input,
    paddingVertical: space[2],
    paddingStart: space[6],
    paddingEnd: space[5],
    borderRadius: radius.button,
    borderWidth: tokens.border.hairline,
    borderColor: color.input.border,
    backgroundColor: color.input.bg,
  },
  pressed: { backgroundColor: color.surface2 },
  texts: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  // The language the app runs in: the app's own typeface.
  value: { ...text('input'), color: color.input.text },
  detail: { ...text('caption'), color: color.textMuted },
  muted: { color: color.textMuted },
  // A sheet's worth of rows; more scroll inside it (19 languages are taller than the sheet).
  list: { flexShrink: 1, marginTop: space[4] },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[6],
    minHeight: size.listRow,
    paddingHorizontal: space[6],
    // A name with its own name under it keeps the row's air.
    paddingVertical: space[2],
    borderRadius: radius.button,
  },
  optionOn: { backgroundColor: color.surface2 },
  // The name in the app's language and font; its own name under it is a caption in its language's font.
  optionName: { ...text('rowTitle'), color: color.text },
});
