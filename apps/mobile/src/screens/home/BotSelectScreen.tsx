import type { BotLevelId, GameType } from '@sudoku-fight/engine';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../../components/Icon';
import { Avatar, ltr } from '../../components/player';
import { Button, useToast } from '../../components/ui';
import { Enter } from '../../components/ui/Enter';
import { PressableCard } from '../../components/ui/tactile';
import { Text } from '../../components/ui/Text';
import { decimalSeparator, percent } from '../../i18n/compose';
import { cue } from '../../services/feedback';
import { color, size, space, text, tokens } from '../../theme';
import { type BotOption, botOptions, percentOf, secondsText } from './homeModel';
import { goBack } from './navigation';
import { Chip, GUTTER, ScreenHeader } from './parts';
import { startAndOpen } from './startGame';

export interface BotSelectScreenProps {
  gameType: GameType;
  /** Preselected: the level played last, or the default. */
  initialLevel: BotLevelId;
}

/**
 * "בחר יריב בוט" (spec §4.1 #9, §9; the BotSelect board, drawn in direction C like the game-type screen): the
 * five bots of the engine's level table, each with its avatar, name, level title, a line on how it plays, its
 * think time per move in the chosen game type (the table's time × the pace, spec §9) and its mistake rate. The
 * start button starts the practice and the game screen replaces this one, so "back" from the game never lands
 * here (spec §4.2: GameType → BotSelect → Game).
 */
export function BotSelectScreen({ gameType, initialLevel }: BotSelectScreenProps) {
  const { t } = useTranslation('home');
  const { top, bottom } = useSafeAreaInsets();
  const [selected, setSelected] = useState<BotLevelId>(initialLevel);
  const [starting, setStarting] = useState(false);
  const options = botOptions(gameType);
  const chosen = options.find((o) => o.level === selected) ?? options[0]!;
  const typeName = t(`gameTypes.${gameType}.name`);

  const select = (level: BotLevelId) => {
    if (level === selected || starting) return;
    cue('toggle');
    setSelected(level);
  };

  // The primary button plays its own press cue (MOT-4).
  const start = async () => {
    if (starting) return;
    setStarting(true);
    const ok = await startAndOpen({ mode: 'bot', gameType, botLevel: chosen.level }, 'replace');
    setStarting(false);
    if (!ok) useToast.getState().show({ variant: 'error', message: t('start.failed') });
  };

  return (
    <View style={[styles.screen, { paddingTop: top }]}>
      <ScreenHeader
        title={t('botSelect.title')}
        subtitle={t('botSelect.subtitle', { mode: t('modes.bot.name'), type: typeName })}
        onBack={goBack}
        style={styles.header}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View accessibilityRole="radiogroup" accessibilityLabel={t('botSelect.title')} style={styles.list}>
          {options.map((option, index) => (
            <Enter key={option.level} index={index}>
              <BotCard
                option={option}
                checked={option.level === selected}
                onPress={() => select(option.level)}
              />
            </Enter>
          ))}
        </View>
        <Text style={styles.note}>{t('botSelect.note')}</Text>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: bottom + space[8] }]}>
        <View style={styles.chips}>
          <Chip label={t('modes.chips.unrated')} />
          <Chip label={t('modes.chips.offline')} />
        </View>
        <Button
          label={t('botSelect.start')}
          size="lg"
          loading={starting}
          onPress={() => void start()}
          accessibilityHint={t('botSelect.startHint', { type: typeName, name: chosen.name })}
          testID="start"
        />
      </View>
    </View>
  );
}

function BotCard({ option, checked, onPress }: { option: BotOption; checked: boolean; onPress: () => void }) {
  const { t } = useTranslation('home');
  const { level, name, avatar, thinkMs, mistakeRate } = option;
  const title = t(`botSelect.levels.${level}.title`);
  const behavior = t(`botSelect.levels.${level}.behavior`);
  const decimal = decimalSeparator(t);
  const from = secondsText(thinkMs.min, decimal);
  const to = secondsText(thinkMs.max, decimal);
  const mistakes = percentOf(mistakeRate);
  const facts = [
    {
      key: 'think',
      label: t('botSelect.thinkTime'),
      value: t('botSelect.thinkValue', { range: ltr(`${from}–${to}`) }),
    },
    { key: 'mistakes', label: t('botSelect.mistakes'), value: ltr(percent(mistakes, t)) },
  ];
  // A plural of the longest think time, in seconds.
  const label = t('botSelect.cardLabel', {
    level,
    title,
    name,
    behavior,
    from,
    to,
    mistakes,
    count: thinkMs.max / 1000,
  });

  // A tappable card (D125): checked is the accent's border over the accent's 10%; `select` plays the tick.
  return (
    <PressableCard
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      selected={checked}
      cue={null}
      onPress={onPress}
      style={styles.card}
      testID={`bot-${level}`}
    >
      <View style={styles.cardTop}>
        <Avatar avatarId={avatar} size="row" colorIndex={null} backdrop={color.surface} />
        <View style={styles.names}>
          <View style={styles.nameRow} testID={`bot-${level}-name-row`}>
            {/* A name is data, the same in every language: Latin, in its own direction. */}
            <Text style={styles.name} numberOfLines={1} testID={`bot-${level}-name`}>
              {ltr(name)}
            </Text>
            <Chip label={t('botSelect.levelTitle', { level, title })} testID={`bot-${level}-title`} />
          </View>
          {/* Every line it needs, never "…" (QA loop 9, English at 360 dp and font 1.3: "…and lets you …"). */}
          <Text style={styles.behavior} testID={`bot-${level}-behavior`}>
            {behavior}
          </Text>
        </View>
        <View style={[styles.radio, checked && styles.radioChecked]}>
          {checked ? <Icon name="check" size={size.icon.inline} color={color.onAccent} /> : null}
        </View>
      </View>
      <View style={styles.facts}>
        {facts.map((f) => (
          <View key={f.key} style={styles.fact} testID={`bot-${level}-${f.key}`}>
            {/* Two lines, broken between words (QA loop 7, font 1.3: "Think time per m…"). */}
            <Text style={styles.factLabel} numberOfLines={2}>
              {f.label}
            </Text>
            <Text style={styles.factValue} numberOfLines={1}>
              {f.value}
            </Text>
          </View>
        ))}
      </View>
    </PressableCard>
  );
}

/** The radio mark at the end of a card, as on the game-type screen: 24 round. */
const RADIO = 24;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: GUTTER.screen },
  content: {
    paddingHorizontal: GUTTER.screen,
    paddingTop: space[6],
    paddingBottom: space[10],
    gap: space[8],
  },
  list: { gap: space[6] },
  // The card surface (PressableCard, D125) gives the fill, the border, the base and the checked look.
  card: {
    padding: space[8],
    gap: space[7],
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: space[6] },
  names: { flex: 1, minWidth: 0, alignItems: 'flex-start', gap: space[3] },
  // The level's chip goes under the name when both don't fit one line (QA loop 7, 360 dp at font 1.3: "Biscu…",
  // "Mr. H…" beside a chip in two lines): the name keeps the column's width.
  nameRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space[4],
    maxWidth: '100%',
  },
  name: { ...text('h1'), color: color.text, flexShrink: 1, maxWidth: '100%' },
  behavior: { ...text('caption'), color: color.textMuted },
  radio: {
    width: RADIO,
    height: RADIO,
    borderRadius: RADIO / 2,
    borderWidth: tokens.border.avatarFrame,
    borderColor: color.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioChecked: { borderColor: color.accent, backgroundColor: color.accent },
  facts: { flexDirection: 'row', gap: space[6] },
  fact: { flex: 1, minWidth: 0, alignItems: 'flex-start', gap: space[3] },
  factLabel: { ...text('micro'), color: color.textMuted },
  factValue: { ...text('status'), color: color.text },
  note: { ...text('bodyLong'), color: color.textMuted },
  footer: {
    paddingHorizontal: GUTTER.screen,
    paddingTop: space[6],
    gap: space[6],
    borderTopWidth: tokens.border.hairline,
    borderTopColor: color.border,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space[3] },
});
