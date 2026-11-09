import {
  type AvatarDef,
  EXPRESSIONS,
  type Expression,
  MOTION_IDS,
  PIRATE_CAST,
  PIRATE_LOOKS,
  type PirateCharacter,
  type PirateLook,
} from '@sudoku-fight/avatars';
import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Switch, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvatarArt, type AvatarReaction, expressionName } from '../avatars';
import { Button, IconButton } from '../components/ui';
import { Text } from '../components/ui/Text';
import { color, radius, size, space, text, tokens } from '../theme';
import { useReduceMotion } from '../theme/motion';

/** The stage, then the smaller sizes the app draws avatars at: Home, a duel's card, a locked cell. */
const STAGE = 96;
const SIZES = [64, 36] as const;
const CELL = size.avatar.cell.size;
/** The every-expression grid. */
const GRID = 52;
/** A column of the stage and the size rows: wide enough for the stage. */
const COLUMN = STAGE + 2 * space[2];
/** The frames between two steps of a character switch (see SwitchStep). */
const SWITCH_FRAMES = 2;

/**
 * A character switch, step by step (B32, QA run #2: a switch every 0.8 s froze the phone, "isn't responding"):
 * `gone`, the old character's avatars go, in a frame of their own; `still`, the new ones come, still; `live`,
 * they move. In the frame that deletes a view Reanimated moved, it still holds that view's last props, and on
 * Android every shape react-native-svg drew for the first time in that frame failed on it (AvatarArt
 * LAYERS_RETIRE_MS): some 3,000 new shapes against dozens of moving layers. What it holds costs every new shape a
 * little too, so the shapes draw before any layer moves.
 */
type SwitchStep = 'gone' | 'still' | 'live';

export interface PiratesLabScreenProps {
  onClose?: () => void;
  testID?: string;
}

/**
 * /dev/pirates (development builds): the Pirates, the first of Moshe's digit series (packages/avatars
 * catalog/pirates/, the avatars evaluation of 2026-10-30), for him to judge on his phone. The whole crew, 1 to 9
 * (the Captain and Peg-leg Peg first, the other seven since 31.10.2026), one character at a time, each in two
 * looks side by side: the house style and an invested one. At 96 px (a stage that idles), 64, 36 and 22 px (the
 * locked cell's face crop); every expression and motion (a motion plays on every size at once); and a board mock
 * with three opponents' locks, the face crop beside the whole numeral, to show the confusion risk and its fix. The
 * reduced-motion switch starts as the app's decision and is then this screen's own. Since 31.10.2026 the pirates
 * are choosable avatars too (AVATAR_IDS, the picker's first rows of the symbols); this screen stays the one place
 * that shows the two looks side by side. It draws them as the app does, through AvatarArt by id (its reduceMotion
 * prop for the switch), so the stage idles in beats with rests. A new character comes in steps (SwitchStep).
 */
export function PiratesLabScreen({ onClose, testID = 'dev-pirates-screen' }: PiratesLabScreenProps) {
  const { t } = useTranslation('dev');
  const { t: ta } = useTranslation('avatars');
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const appReduce = useReduceMotion();
  const [ownReduce, setOwnReduce] = useState<boolean | null>(null);
  const reduce = ownReduce ?? appReduce;
  const [digit, setDigit] = useState<PirateCharacter['digit']>(PIRATE_CAST[0]!.digit);
  const [step, setStep] = useState<SwitchStep>('live');
  // The next step of a switch, SWITCH_FRAMES after this one is on screen (a new switch starts over).
  useEffect(() => {
    if (step === 'live') return;
    return afterFrames(SWITCH_FRAMES, () => setStep(step === 'gone' ? 'still' : 'live'));
  }, [step, digit]);
  const choose = (next: PirateCharacter['digit']) => {
    if (next === digit) return;
    setDigit(next);
    setStep('gone');
  };
  // The character's avatars (not the board's, which keep theirs): none while the old ones go, then still.
  const drawn = step !== 'gone';
  const still = reduce || step === 'still';
  const [expression, setExpression] = useState<Expression>('neutral');
  const [reaction, setReaction] = useState<AvatarReaction | null>(null);
  const [idle, setIdle] = useState(true);
  const [boardLook, setBoardLook] = useState<PirateLook>('invested');
  const character = PIRATE_CAST.find((c) => c.digit === digit) ?? PIRATE_CAST[0]!;
  // Every digit of the crew has its name (with its digit) and a note on its own moving parts.
  const names: Record<PirateCharacter['digit'], string> = {
    1: t('piratesLab.captain'),
    2: t('piratesLab.pirateLady'),
    3: t('piratesLab.cabinGirl'),
    4: t('piratesLab.riggerBoy'),
    5: t('piratesLab.parrotKeeper'),
    6: t('piratesLab.deckhand'),
    7: t('piratesLab.peg'),
    8: t('piratesLab.grandpaCook'),
    9: t('piratesLab.navigator'),
  };
  const gimmicksNotes: Record<PirateCharacter['digit'], string> = {
    1: t('piratesLab.gimmicksCaptain'),
    2: t('piratesLab.gimmicksPirateLady'),
    3: t('piratesLab.gimmicksCabinGirl'),
    4: t('piratesLab.gimmicksRiggerBoy'),
    5: t('piratesLab.gimmicksParrotKeeper'),
    6: t('piratesLab.gimmicksDeckhand'),
    7: t('piratesLab.gimmicksPeg'),
    8: t('piratesLab.gimmicksGrandpaCook'),
    9: t('piratesLab.gimmicksNavigator'),
  };
  const gimmicksNote = gimmicksNotes[character.digit];
  const lookName = (look: PirateLook) => t(`piratesLab.${look}`);
  const boardWidth = Math.max(0, width - 2 * tokens.layout.gutterHome);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]} testID={testID}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space[12] }]}>
        <View style={styles.header}>
          <View style={styles.heading}>
            <Text style={styles.title} accessibilityRole="header">
              {t('piratesLab.title')}
            </Text>
            <Text style={styles.muted}>{t('piratesLab.subtitle')}</Text>
          </View>
          {onClose ? (
            <IconButton
              icon="close"
              iconSize="header"
              accessibilityLabel={t('piratesLab.close')}
              onPress={onClose}
              testID="dev-pirates-close"
            />
          ) : null}
        </View>
        <Text style={styles.muted}>{t('piratesLab.intro')}</Text>

        <Text style={styles.section}>{t('piratesLab.character')}</Text>
        <View style={styles.buttons}>
          {PIRATE_CAST.map((c) => (
            <Button
              key={c.digit}
              label={names[c.digit]}
              variant="secondary"
              size="modal"
              selected={c.digit === digit}
              onPress={() => choose(c.digit)}
              testID={`dev-pirates-character-${c.digit}`}
            />
          ))}
        </View>

        {/* The stage and the smaller sizes: the two looks in two columns. */}
        <View style={styles.stage} testID="dev-pirates-stage">
          <View style={styles.row}>
            <View style={styles.rowLabel} />
            {PIRATE_LOOKS.map((look) => (
              <Text key={look} style={[styles.columnTitle, { width: COLUMN }]}>
                {lookName(look)}
              </Text>
            ))}
          </View>
          <SizeRow label={t('piratesLab.sizeRow', { px: STAGE })}>
            {PIRATE_LOOKS.map((look) =>
              drawn ? (
                <AvatarArt
                  key={`${look}-${character.looks[look].id}`}
                  avatarId={character.looks[look].id}
                  size={STAGE}
                  expression={expression}
                  reaction={reaction}
                  idle={idle}
                  reduceMotion={still}
                  testID={`dev-pirates-stage-${look}`}
                />
              ) : (
                <Gap key={look} side={STAGE} />
              ),
            )}
          </SizeRow>
          {SIZES.map((px) => (
            <SizeRow key={px} label={t('piratesLab.sizeRow', { px })}>
              {PIRATE_LOOKS.map((look) =>
                drawn ? (
                  <AvatarArt
                    key={`${look}-${character.looks[look].id}`}
                    avatarId={character.looks[look].id}
                    size={px}
                    expression={expression}
                    reaction={reaction}
                    reduceMotion={still}
                    testID={`dev-pirates-size-${px}-${look}`}
                  />
                ) : (
                  <Gap key={look} side={px} />
                ),
              )}
            </SizeRow>
          ))}
          <SizeRow label={t('piratesLab.cellRow', { px: CELL })}>
            {PIRATE_LOOKS.map((look) =>
              drawn ? (
                <AvatarArt
                  key={`${look}-${character.looks[look].id}`}
                  avatarId={character.looks[look].id}
                  size={CELL}
                  crop="head"
                  radius={size.avatar.cell.radius}
                  expression={expression}
                  reaction={reaction}
                  reduceMotion={still}
                  testID={`dev-pirates-size-${CELL}-${look}`}
                />
              ) : (
                <Gap key={look} side={CELL} />
              ),
            )}
          </SizeRow>
          <Text style={styles.muted} testID="dev-pirates-gimmicks">
            {gimmicksNote}
          </Text>
        </View>

        <Toggle label={t('piratesLab.idle')} value={idle} onChange={setIdle} testID="dev-pirates-idle" />
        <Toggle
          label={t('piratesLab.reduceMotion')}
          value={reduce}
          onChange={setOwnReduce}
          testID="dev-pirates-reduce"
        />

        <Text style={styles.section}>{t('piratesLab.expressions')}</Text>
        <View style={styles.buttons}>
          {EXPRESSIONS.map((e) => (
            <Button
              key={e}
              label={expressionName(ta, e)}
              accessibilityLabel={t('piratesLab.expressionLabel', { name: expressionName(ta, e) })}
              variant="secondary"
              size="modal"
              selected={e === expression}
              onPress={() => setExpression(e)}
              testID={`dev-pirates-expression-${e}`}
            />
          ))}
        </View>

        <Text style={styles.section}>{t('piratesLab.motions')}</Text>
        <View style={styles.buttons}>
          {MOTION_IDS.map((m) => (
            <Button
              key={m}
              label={ta(`motions.${m}`)}
              accessibilityLabel={t('piratesLab.motionLabel', { name: ta(`motions.${m}`) })}
              variant="secondary"
              size="modal"
              onPress={() => setReaction((r) => ({ motion: m, key: Number(r?.key ?? 0) + 1 }))}
              testID={`dev-pirates-motion-${m}`}
            />
          ))}
        </View>

        <Text style={styles.sectionTitle} accessibilityRole="header">
          {t('piratesLab.allFaces')}
        </Text>
        {PIRATE_LOOKS.map((look) => (
          <View key={look} style={styles.group} testID={`dev-pirates-faces-${look}`}>
            <Text style={styles.groupTitle}>{lookName(look)}</Text>
            <View style={styles.grid}>
              {EXPRESSIONS.map((e) =>
                drawn ? (
                  <AvatarArt
                    key={`${e}-${character.looks[look].id}`}
                    avatarId={character.looks[look].id}
                    size={GRID}
                    expression={e}
                    reduceMotion={still}
                  />
                ) : (
                  <Gap key={e} side={GRID} />
                ),
              )}
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle} accessibilityRole="header">
          {t('piratesLab.board')}
        </Text>
        <Text style={styles.muted}>{t('piratesLab.boardIntro')}</Text>
        <Text style={styles.section}>{t('piratesLab.boardLook')}</Text>
        <View style={styles.buttons}>
          {PIRATE_LOOKS.map((look) => (
            <Button
              key={look}
              label={lookName(look)}
              variant="secondary"
              size="modal"
              selected={look === boardLook}
              onPress={() => setBoardLook(look)}
              testID={`dev-pirates-board-look-${look}`}
            />
          ))}
        </View>
        <View style={styles.group}>
          <Text style={styles.groupTitle}>{t('piratesLab.faceCrop')}</Text>
          <BoardMock width={boardWidth} look={boardLook} crop="head" testID="dev-pirates-board-crop" />
        </View>
        <View style={styles.group}>
          <Text style={styles.groupTitle}>{t('piratesLab.wholeNumeral')}</Text>
          <BoardMock width={boardWidth} look={boardLook} crop="tile" testID="dev-pirates-board-whole" />
        </View>

        <View style={styles.notes}>
          <Text style={styles.groupTitle} accessibilityRole="header">
            {t('piratesLab.judge')}
          </Text>
          {(['judge1', 'judge2', 'judge3', 'judge4'] as const).map((k) => (
            <Text key={k} style={styles.muted}>
              {t(`piratesLab.${k}`)}
            </Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

/** A row of the stage: its size, then the house look and the invested one. */
function SizeRow({ label, children }: { label: string; children: ReactNode[] }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.muted, styles.rowLabel]}>{label}</Text>
      {children.map((child, i) => (
        <View key={i} style={[styles.spot, { width: COLUMN }]}>
          {child}
        </View>
      ))}
    </View>
  );
}

/** An avatar's place while a switch has none there (SwitchStep `gone`): the rows keep their height. */
function Gap({ side }: { side: number }) {
  return <View style={{ width: side, height: side }} />;
}

/**
 * Runs `run` once `frames` frames have gone by (each requestAnimationFrame comes with a frame of the UI thread, so
 * the views of the commit before it are on screen); returns what cancels it.
 */
function afterFrames(frames: number, run: () => void): () => void {
  let id = 0;
  const next = (left: number) => {
    id = requestAnimationFrame(() => (left > 1 ? next(left - 1) : run()));
  };
  next(frames);
  return () => cancelAnimationFrame(id);
}

function Toggle({
  label,
  value,
  onChange,
  testID,
}: {
  label: string;
  value: boolean;
  onChange: (on: boolean) => void;
  testID: string;
}) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchText}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={TRACK}
        thumbColor={color.text}
        testID={testID}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------
// The board mock: a still 9 x 9 board mid-game, with three opponents' locks

/** Digits on the board, row A first, left to right ('.' empty). Data, not words: the board is the same in every language. */
const BOARD =
  '5.6.1.7.9' +
  '7..56.1.8' +
  '.41.78..6' +
  '.298.1..7' +
  '8.5...9.3' +
  '1...5.2.4' +
  '.9..47.35' +
  '..469.8..' +
  '6.73...91';

/**
 * The opponents' locks: the cell, the seat (its colours), the character (its digit: the Captain, Peg-leg Peg and
 * the Parrot Keeper, whose face crop came closest to its numeral: a bar, a stem and a bowl, until it moved off the
 * stem on 31.10.2026; Moshe checks here that it now reads as a cap's brim, not as a 5) and a wrong digit.
 */
export const BOARD_LOCKS = [
  { cell: 11, seat: 1, digit: 1, wrong: null },
  { cell: 40, seat: 2, digit: 7, wrong: '7' },
  { cell: 71, seat: 3, digit: 5, wrong: null },
] as const;

/** The design's cell, which the board's sizes are measured on (components.md §11). */
const DESIGN_CELL = 38.4;
const BOX_GAP = 3;
const CELL_GAP = 1;

function BoardMock({
  width,
  look,
  crop,
  testID,
}: {
  width: number;
  look: PirateLook;
  crop: 'head' | 'tile';
  testID: string;
}) {
  const cell = Math.max(8, Math.floor((width - 2 * BOX_GAP - 6 * CELL_GAP - 2 * BOX_GAP) / 9));
  const k = cell / DESIGN_CELL;
  const avatar = Math.round(CELL * k);
  const digitType = tokens.type.digitCell;
  const wrongType = tokens.type.wrongDigit;
  const boxes = [0, 1, 2];
  return (
    <View style={styles.board} testID={testID}>
      {boxes.map((br) => (
        <View key={br} style={styles.boxRow}>
          {boxes.map((bc) => (
            <View key={bc} style={styles.box}>
              {boxes.map((r) => (
                <View key={r} style={styles.cellRow}>
                  {boxes.map((c) => {
                    const index = (br * 3 + r) * 9 + bc * 3 + c;
                    const digit = BOARD[index];
                    const lock = BOARD_LOCKS.find((l) => l.cell === index);
                    const def: AvatarDef | undefined = lock
                      ? PIRATE_CAST.find((p) => p.digit === lock.digit)?.looks[look]
                      : undefined;
                    const palette = lock ? color.players[lock.seat] : undefined;
                    return (
                      <View
                        key={c}
                        style={[
                          styles.cell,
                          { width: cell, height: cell },
                          (br + bc) % 2 === 1 ? styles.cellAlt : null,
                        ]}
                        testID={lock ? `${testID}-lock-${index}` : undefined}
                      >
                        {digit && digit !== '.' ? (
                          <Text
                            style={[
                              text('digitCell'),
                              styles.given,
                              { fontSize: digitType.size * k, lineHeight: digitType.lineHeight * k },
                            ]}
                          >
                            {digit}
                          </Text>
                        ) : null}
                        {lock && def && palette ? (
                          <>
                            <View
                              style={[
                                styles.ring,
                                { borderColor: palette.ring, borderWidth: tokens.border.lockRing },
                              ]}
                            />
                            <View
                              style={[
                                styles.ring,
                                {
                                  margin: tokens.border.lockRing,
                                  borderColor: palette.lockEdge,
                                  borderWidth: tokens.border.lockEdge,
                                },
                              ]}
                            />
                            <View style={lock.wrong ? { top: -Math.round(size.lockBadge.inset * k) } : null}>
                              <AvatarArt
                                avatarId={def.id}
                                size={avatar}
                                crop={crop}
                                radius={Math.round(size.avatar.cell.radius * k)}
                                reduceMotion
                              />
                            </View>
                            {lock.wrong ? (
                              <Text
                                style={[
                                  text('wrongDigit'),
                                  styles.wrong,
                                  {
                                    fontSize: wrongType.size * k,
                                    lineHeight: wrongType.lineHeight * k,
                                    right: Math.round(2 * k) + tokens.border.lockRing,
                                    bottom: tokens.border.lockRing,
                                  },
                                ]}
                              >
                                {lock.wrong}
                              </Text>
                            ) : null}
                          </>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const TRACK = { false: color.border, true: color.accent } as const;

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: tokens.layout.gutterHome, gap: space[8] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[6] },
  heading: { flexShrink: 1, gap: space[2] },
  title: { ...text('screenTitle'), color: color.text },
  muted: { ...text('body'), color: color.textMuted },
  section: { ...text('label'), color: color.textMuted },
  sectionTitle: { ...text('h2'), color: color.text },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: space[4] },
  stage: {
    gap: space[4],
    padding: space[6],
    borderRadius: radius.card,
    backgroundColor: color.surface,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  rowLabel: { flex: 1 },
  columnTitle: { ...text('label'), color: color.text, textAlign: 'center' },
  spot: { alignItems: 'center', justifyContent: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[6] },
  switchText: { ...text('label'), color: color.text, flexShrink: 1 },
  group: { gap: space[4] },
  groupTitle: { ...text('rowTitle'), color: color.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  notes: {
    gap: space[3],
    padding: space[6],
    borderRadius: radius.card,
    backgroundColor: color.surface,
  },
  // The board is left to right in every language (CLAUDE.md), as the game's.
  board: {
    direction: 'ltr',
    alignSelf: 'center',
    gap: BOX_GAP,
    padding: BOX_GAP,
    borderRadius: radius.lg,
    backgroundColor: color.board.boxGap,
  },
  boxRow: { flexDirection: 'row', gap: BOX_GAP },
  box: { gap: CELL_GAP, backgroundColor: color.board.grid },
  cellRow: { flexDirection: 'row', gap: CELL_GAP },
  cell: { alignItems: 'center', justifyContent: 'center', backgroundColor: color.board.cell },
  cellAlt: { backgroundColor: color.board.cellAlt },
  given: { color: color.board.given, writingDirection: 'ltr' },
  ring: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  wrong: { position: 'absolute', color: color.board.wrongDigit, writingDirection: 'ltr' },
});
