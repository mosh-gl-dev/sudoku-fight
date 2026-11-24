import type { ReactNode } from 'react';
import { type BoxShadowValue, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import type { ChapterTone, CoinLook } from '../../screens/levels/mapModel';
import { color, size as sizes, space, text, tokens } from '../../theme';
import { Icon } from '../Icon';
import { SeatGlyph } from '../player/SeatGlyph';
import { paletteAt } from '../player/metrics';
import { NO_BORDER, verticalGradient } from '../ui/tactile';
import { Text } from '../ui/Text';
import { BossFrame } from './BossFrame';

/**
 * A stage as a coin on the level map (components.md §19.2, the board-game road of 31.10.2026): the tactile
 * language of D125 (an edge under a face, a dark outline around both) on a small sudoku box with the stage
 * number in Teko. 64 on the map, the boss's fortress 92, the panel's 48.
 *
 * - **plain** (open, current, or played with no star): the board's light cell face, its grid, the given's dark
 *   number, a grey edge;
 * - **gilded** (one or two stars): the same on a gold edge;
 * - **gold** (three stars): a gold face and edge, the number in dark gold;
 * - **locked**: the face in its chapter's tone (so the road ahead is colourful, never grey), its number light,
 *   a lock badge at the top-end corner.
 * The boss is a fortress: two merlons and a crown badge over its face, its bot's avatar on it, the arena's gold
 * corners around it unless it is locked. A press sinks the face onto its edge (the node drives `press`).
 *
 * Depth (Moshe 25.11.2026: "ממש תלת מימדיים"): the edge darkens toward its foot like a side in shade, the face's
 * far side is shaded and its near top lit (inset bevels), and a soft sheen runs across the face from its top
 * corner, as on enamel. The map's node floats it and lays its shadow on the ground (LevelNode).
 *
 * Decorative: the button around it says which stage it is and how it stands.
 */

const M = color.levelMap.coin;
const T = color.tactile;

export type CoinVariant = 'node' | 'boss' | 'panel';

/** Each variant's side, corner, edge, number size and grid inset (the grid is three cells of (side − 2·inset)/3). */
export const COIN = {
  node: {
    side: sizes.levelCoin,
    radius: 18,
    edge: 6,
    number: 32,
    inset: 8,
    travel: 4,
    lock: 22,
    lockIcon: 12,
  },
  boss: {
    side: sizes.levelCoinBoss,
    radius: 22,
    edge: 6,
    number: 28,
    inset: 0,
    travel: 4,
    lock: 22,
    lockIcon: 12,
  },
  panel: {
    side: sizes.levelCoinPanel,
    radius: 14,
    edge: 4,
    number: 24,
    inset: 6,
    travel: 0,
    lock: 16,
    lockIcon: 10,
  },
} as const;

/** The dark outline around face and edge. */
const OUTLINE = 2;
/** The old "you are here" pin (LEVEL_UI.mapToken off): 22, radius 7, P1 with ●, at the top-start corner. */
const PIN = { size: 22, glyph: 8, inset: -8 } as const;
/** The boss's crown badge over its face, and its merlons. */
const CROWN = { width: 40, height: 28, icon: 22, top: -24 } as const;
const MERLON = { width: 18, height: 14, top: -10, at: [12, 62] } as const;
/** The arena's corners on the fortress: a little out of the face, outside the current ring. */
export const COIN_ARENA = { length: 18, thickness: 3, outset: 8 } as const;

export interface LevelCoinProps {
  /** The stage number, 1–300. */
  n: number;
  variant: CoinVariant;
  look: CoinLook;
  /** The chapter's tone (a locked face). */
  tone: ChapterTone;
  /** The press, 0 → 1: the face travels onto its edge. */
  press?: SharedValue<number>;
  /** A tap on a locked coin under Reduced Motion: the lock badge's border lights up for a moment. */
  flash?: boolean;
  /** The old P1 pin (LEVEL_UI.mapToken off, on the current stage). */
  pin?: boolean;
  /** The boss's bot (its avatar), on the fortress's face. */
  bot?: ReactNode;
  testID: string;
}

const inset = (offsetY: number, tint: string, offsetX = 0): BoxShadowValue => ({
  offsetX,
  offsetY,
  blurRadius: 0,
  color: tint,
  inset: true,
});

/** The bevel: the face's far side in shade, this wide. */
const BEVEL = 2;
/** The edge's foot in shade: the side of the coin turning away from the light. */
const EDGE_SHADE = `linear-gradient(180deg, transparent 55%, ${color.levelMap.token.shadow} 100%)`;
/**
 * The sheen across the face, from its top corner: white on gold, the chapter's lit tone on a closed coin (it
 * fades sooner), none on a light face.
 */
export function sheenOf(look: CoinLook, tone: ChapterTone): string | null {
  if (look === 'gold') return `linear-gradient(160deg, ${T.goldLip} 0%, ${clearOf(T.goldLip)} 55%)`;
  if (look === 'locked') return `linear-gradient(160deg, ${tone.lit} 0%, ${clearOf(tone.lit)} 35%)`;
  return null;
}

/**
 * The same colour with no alpha ("#rrggbb" or "rgba(r,g,b,a)", the token forms). A sheen must fade to its own
 * colour, not to `transparent`: Android blends a gradient's stops unpremultiplied, so a fade to transparent
 * (black) would run a grey band across the face.
 */
export function clearOf(value: string): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const n = parseInt(hex[1]!, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, 0)`;
  }
  const rgba = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(value);
  return rgba ? `rgba(${rgba[1]}, ${rgba[2]}, ${rgba[3]}, 0)` : 'transparent';
}

/** The face, edge, grid and number colours of a look. */
export function coinColors(look: CoinLook, tone: ChapterTone) {
  switch (look) {
    case 'gold':
      return { edge: M.gildedEdge, grid: M.goldGrid, number: M.goldNumber };
    case 'gilded':
      return { edge: M.gildedEdge, grid: M.grid, number: M.number };
    case 'locked':
      return { edge: tone.edge, grid: tone.lit, number: M.onDeep };
    default:
      return { edge: M.plainEdge, grid: M.grid, number: M.number };
  }
}

function faceOf(look: CoinLook, tone: ChapterTone): ViewStyle {
  // The locked face has a border, so the others set 0 (NO_BORDER): a coin that unlocks never drops it.
  if (look === 'gold')
    return {
      ...NO_BORDER,
      backgroundColor: color.accent,
      experimental_backgroundImage: verticalGradient(T.goldFace),
      boxShadow: [
        inset(tokens.elevation.tactile.lip.gold, T.goldLip),
        inset(-tokens.elevation.tactile.goldShade, T.goldShade),
        inset(0, T.goldShade, -BEVEL),
      ],
    };
  if (look === 'locked')
    return {
      backgroundColor: tone.deep,
      experimental_backgroundImage: verticalGradient([tone.lit, tone.deep, tone.deep]),
      borderWidth: tokens.border.hairline,
      borderColor: tone.lit,
      boxShadow: [
        inset(tokens.elevation.tactile.lip.slate, T.slateLip),
        inset(0, color.levelMap.chip, -BEVEL),
      ],
    };
  return {
    ...NO_BORDER,
    backgroundColor: M.face[1],
    experimental_backgroundImage: verticalGradient(M.face),
    boxShadow: [inset(-3, M.faceShade), inset(0, M.faceShade, -BEVEL)],
  };
}

export function LevelCoin({
  n,
  variant,
  look,
  tone,
  press,
  flash = false,
  pin = false,
  bot,
  testID,
}: LevelCoinProps) {
  const c = COIN[variant];
  const boss = variant === 'boss';
  const locked = look === 'locked';
  const colors = coinColors(look, tone);
  const travel = c.travel;
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (press ? press.get() : 0) * travel }],
  }));
  const cell = (c.side - 2 * c.inset) / 3;
  const lines = boss ? [] : [c.inset + cell, c.inset + 2 * cell];
  const sheen = sheenOf(look, tone);
  return (
    <View
      style={{ width: c.side, height: c.side + c.edge }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
    >
      <View
        style={[
          styles.abs,
          {
            top: -OUTLINE,
            left: -OUTLINE,
            width: c.side + 2 * OUTLINE,
            height: c.side + c.edge + 2 * OUTLINE,
            borderRadius: c.radius + OUTLINE,
            backgroundColor: M.outline,
          },
        ]}
      />
      <View
        style={[
          styles.abs,
          {
            top: c.edge,
            left: 0,
            width: c.side,
            height: c.side,
            borderRadius: c.radius,
            backgroundColor: colors.edge,
            ...NO_BORDER,
            experimental_backgroundImage: EDGE_SHADE,
          },
        ]}
        testID={`${testID}-edge`}
      />
      {boss
        ? MERLON.at.map((x) => (
            <View
              key={x}
              style={[
                styles.merlon,
                {
                  start: x,
                  backgroundColor: locked ? tone.deep : look === 'gold' ? color.accent : M.face[0],
                },
              ]}
            />
          ))
        : null}
      <Animated.View
        style={[
          styles.abs,
          styles.face,
          { width: c.side, height: c.side, borderRadius: c.radius },
          faceOf(look, tone),
          pressStyle,
        ]}
        testID={`${testID}-face`}
      >
        {lines.map((at) => (
          <View
            key={`v${at}`}
            style={[
              styles.vLine,
              { start: at, top: c.inset, height: c.side - 2 * c.inset, backgroundColor: colors.grid },
            ]}
          />
        ))}
        {lines.map((at) => (
          <View
            key={`h${at}`}
            style={[
              styles.hLine,
              { top: at, start: c.inset, width: c.side - 2 * c.inset, backgroundColor: colors.grid },
            ]}
          />
        ))}
        {sheen ? (
          <View
            style={[StyleSheet.absoluteFill, { experimental_backgroundImage: sheen }]}
            pointerEvents="none"
            testID={`${testID}-sheen`}
          />
        ) : null}
        {boss && bot ? <View style={styles.bot}>{bot}</View> : null}
        <Text
          style={[
            styles.number,
            {
              fontSize: c.number,
              lineHeight: Math.round(c.number * 0.82),
              color: colors.number,
            },
            boss && styles.bossNumber,
          ]}
          testID={`${testID}-number`}
        >
          {String(n)}
        </Text>
      </Animated.View>
      {pin ? (
        <View style={styles.pin} testID={`${testID}-pin`}>
          <SeatGlyph colorIndex={0} size={PIN.glyph} />
        </View>
      ) : null}
      {locked ? (
        <View
          style={[
            styles.lock,
            { width: c.lock, height: c.lock, borderRadius: c.lock / 2 },
            flash && styles.lockFlash,
          ]}
          testID={`${testID}-lock`}
        >
          <Icon name="lock" size={c.lockIcon} color={color.textMuted} />
        </View>
      ) : null}
      {boss && !locked ? (
        <View style={[styles.abs, { top: 0, left: 0, width: c.side, height: c.side }]} pointerEvents="none">
          <BossFrame {...COIN_ARENA} testID={`${testID}-arena`} />
        </View>
      ) : null}
      {boss ? (
        <View style={styles.crownRow} testID={`${testID}-crown`}>
          <View style={styles.crown}>
            <Icon name="crown" size={CROWN.icon} color={locked ? color.iconFaint : color.accent} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const ME = paletteAt(0);

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  face: { top: 0, left: 0, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  vLine: { position: 'absolute', width: tokens.border.hairline },
  hLine: { position: 'absolute', height: tokens.border.hairline },
  number: {
    ...text('scoreSm'),
    // Teko's figures sit low in their line.
    paddingTop: space[2],
    writingDirection: 'ltr',
    textAlign: 'center',
  },
  bossNumber: { position: 'absolute', bottom: space[5], start: 0, end: 0 },
  bot: { position: 'absolute', top: space[6], start: 0, end: 0, alignItems: 'center' },
  merlon: {
    position: 'absolute',
    top: MERLON.top,
    width: MERLON.width,
    height: MERLON.height,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: color.bg,
  },
  pin: {
    position: 'absolute',
    top: PIN.inset,
    start: PIN.inset,
    width: PIN.size,
    height: PIN.size,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: ME.ring,
    backgroundColor: color.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lock: {
    position: 'absolute',
    top: -6,
    end: -6,
    borderWidth: tokens.border.hairline,
    borderColor: color.border,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockFlash: { borderColor: color.text },
  crownRow: { position: 'absolute', top: CROWN.top, start: 0, end: 0, alignItems: 'center' },
  crown: {
    width: CROWN.width,
    height: CROWN.height,
    borderRadius: 8,
    borderWidth: tokens.border.hairline,
    borderColor: color.border,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
