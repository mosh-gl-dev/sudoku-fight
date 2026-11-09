import type { GateState } from '@sudoku-fight/engine';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { I18nManager, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Defs, G, Pattern, Polygon, Rect as SvgRect } from 'react-native-svg';

import { Star } from '../../components/levels/StarRow';
import { ltr, withAlpha } from '../../components/player/format';
import { curve } from '../../components/ui/motion';
import { verticalGradient } from '../../components/ui/tactile';
import { Text } from '../../components/ui/Text';
import { MAP_MOTION } from '../../config/levels';
import { color, radius, space, text, tokens } from '../../theme';
import { reduceMotionFlag, useReduceMotion } from '../../theme/motion';
import { GatePlate } from './GatePlate';
import { chapterName } from './levelWording';
import { type ChapterTone, type Gateway, MAP, type Rect } from './mapModel';

/**
 * A chapter's gateway (components.md §19.3, the board-game road of 31.10.2026): its banner is the lintel of an
 * arch over the road, "פרק 4", its name and "★ 18/30" on a ribbon in the chapter's tone, with the chapter's number
 * on a medallion. Under it hang the gate's sign (GatePlate, the only button here) on two chains, between two slate
 * pillars, and while the gate is shut a striped barrier lies across the road. The first time a gate shows open
 * (`unlocking`), the barrier swings up and away (`level.gate.unlock`; Reduced Motion: it is simply gone). Chapter 1
 * has the banner and the start pad, with a little flag.
 *
 * Focus order: the banner's title (a header), its stars (an image), the sign (a button). Pillars, chains,
 * barrier, pad, ribbon tails and medallion are hidden from screen readers.
 */

const G_ = color.levelMap.gate;
const T = color.tactile;

export interface ChapterGatewayProps {
  chapter: number;
  gateway: Gateway;
  tone: ChapterTone;
  /** The gate in front of this chapter (2 and up). */
  gate: GateState | null;
  stars: { stars: number; max: number };
  selected: boolean;
  unlocking: boolean;
  onGate: (chapter: number) => void;
}

const hidden = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
  pointerEvents: 'none',
} as const;

const boxOf = (r: Rect) => ({ start: r.x, top: r.y, width: r.w, height: r.h });

export function ChapterGateway({
  chapter,
  gateway,
  tone,
  gate,
  stars,
  selected,
  unlocking,
  onGate,
}: ChapterGatewayProps) {
  const open = gateway.plate === 'open';
  return (
    <>
      {gateway.pillars?.map((p, i) => (
        <Pillar key={i} rect={p} open={open} />
      ))}
      {gateway.start ? <StartPad rect={gateway.start} /> : null}
      <Banner chapter={chapter} rect={gateway.banner} tone={tone} stars={stars} />
      {gateway.sign && gate ? (
        <>
          <Chains
            sign={gateway.sign}
            face={MAP.sign[open ? 'open' : 'closed'].face}
            bannerBottom={gateway.banner.y + gateway.banner.h}
          />
          <View style={[styles.abs, boxOf(gateway.sign)]}>
            <GatePlate
              chapter={chapter}
              gate={gate}
              width={gateway.sign.w}
              height={gateway.sign.h}
              selected={selected}
              unlocking={unlocking}
              onPress={() => onGate(chapter)}
            />
          </View>
        </>
      ) : null}
      {gateway.barrier ? <Barrier chapter={chapter} rect={gateway.barrier} /> : null}
      {open && unlocking ? <SwingingBarrier chapter={chapter} gateway={gateway} /> : null}
    </>
  );
}

/** The banner: the arch's lintel, and the chapter's header (its testIDs are the header's of 1.0.2). */
function Banner({
  chapter,
  rect,
  tone,
  stars,
}: {
  chapter: number;
  rect: Rect;
  tone: ChapterTone;
  stars: { stars: number; max: number };
}) {
  const { t } = useTranslation('levels');
  const complete = stars.stars >= stars.max;
  return (
    <View
      style={[styles.abs, { start: rect.x, top: rect.y, width: rect.w, minHeight: rect.h }]}
      testID={`chapter-${chapter}-header`}
    >
      <Tail side="left" tone={tone} />
      <Tail side="right" tone={tone} />
      <View
        style={[
          styles.plate,
          { backgroundColor: tone.deep, borderColor: tone.lit, borderBottomColor: tone.edge },
        ]}
      >
        <View
          style={[
            styles.medallion,
            { backgroundColor: tone.edge, borderColor: complete ? color.accent : tone.lit },
          ]}
          {...hidden}
        >
          <Text style={styles.medallionText}>{String(chapter)}</Text>
        </View>
        <View style={styles.titles}>
          <Text accessibilityRole="header" style={styles.title} numberOfLines={1}>
            {t('chapter', { n: chapter })}
          </Text>
          <Text style={styles.name} numberOfLines={1}>
            {chapterName(chapter, t)}
          </Text>
        </View>
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={t('chapterHeader.label', {
            count: stars.stars,
            stars: stars.stars,
            max: stars.max,
          })}
          style={[styles.chip, complete && styles.chipComplete]}
          testID={`chapter-${chapter}-stars`}
        >
          <Star filled={stars.stars > 0} size={CHIP_STAR} />
          <Text style={styles.chipText}>{ltr(t('chapterHeader.stars', stars))}</Text>
        </View>
      </View>
    </View>
  );
}

/** The shadow on a ribbon tail's fold: the ground's ink, see-through. */
const FOLD_SHADE = withAlpha(color.bg, 0.35);

/** A ribbon's tail behind the banner's end: notched, in the chapter's darker tone, with its fold in shadow. */
function Tail({ side, tone }: { side: 'left' | 'right'; tone: ChapterTone }) {
  const { w, h } = TAIL;
  const points =
    side === 'left'
      ? `0,0 ${w},0 ${w},${h} 0,${h} 8,${h / 2}`
      : `0,0 ${w},0 ${w - 8},${h / 2} ${w},${h} 0,${h}`;
  const fold = side === 'left' ? `${w - 6},${h} ${w},${h} ${w},${h - 8}` : `0,${h - 8} 0,${h} 6,${h}`;
  return (
    <View style={[styles.tail, side === 'left' ? { left: -TAIL.out } : { right: -TAIL.out }]} {...hidden}>
      <Svg width={w} height={h}>
        <Polygon points={points} fill={tone.edge} />
        <Polygon points={fold} fill={FOLD_SHADE} />
      </Svg>
    </View>
  );
}

/** A slate pillar of the arch, its cap gold once the gate is open. */
function Pillar({ rect, open }: { rect: Rect; open: boolean }) {
  return (
    <View style={[styles.abs, boxOf(rect)]} {...hidden}>
      <View style={[styles.pillarEdge, { height: rect.h - PILLAR.plinth }]} />
      <View style={[styles.pillarFace, { height: rect.h - PILLAR.plinth - PILLAR.edge }]}>
        <View style={[styles.cap, { backgroundColor: open ? G_.capOpen : G_.capClosed }]} />
      </View>
      <View style={styles.plinth} />
    </View>
  );
}

/**
 * The two chains the sign hangs on, from the banner's bottom to the drawn sign's top corners (`face` high, in the
 * middle of its touch box).
 */
function Chains({ sign, face, bannerBottom }: { sign: Rect; face: number; bannerBottom: number }) {
  const h = sign.y + (sign.h - face) / 2 - bannerBottom + 4;
  if (h <= 0) return null;
  return (
    <>
      {[sign.x + CHAIN.inset, sign.x + sign.w - CHAIN.inset - CHAIN.width].map((x) => (
        <View key={x} style={[styles.chain, { start: x, top: bannerBottom - 2, height: h }]} {...hidden} />
      ))}
    </>
  );
}

/** The striped barrier across the road while the gate is shut. */
function Barrier({ chapter, rect }: { chapter: number; rect: Rect }) {
  return (
    <View style={[styles.abs, boxOf(rect)]} {...hidden} testID={`gate-${chapter}-barrier`}>
      <Stripes w={rect.w} h={rect.h} />
    </View>
  );
}

function Stripes({ w, h }: { w: number; h: number }) {
  const id = `stripes-${w}-${h}`;
  return (
    <Svg width={w} height={h}>
      <Defs>
        <Pattern id={id} width={12} height={12} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <SvgRect x={0} y={0} width={6} height={12} fill={G_.stripeLight} />
          <SvgRect x={6} y={0} width={6} height={12} fill={G_.stripeDark} />
        </Pattern>
      </Defs>
      <SvgRect
        x={0.5}
        y={0.5}
        width={w - 1}
        height={h - 1}
        rx={h / 2 - 0.5}
        fill={`url(#${id})`}
        stroke={color.bg}
        strokeWidth={1}
      />
    </Svg>
  );
}

/** A gate that has just opened: its barrier swings up about the pillar's end and fades (once). */
function SwingingBarrier({ chapter, gateway }: { chapter: number; gateway: Gateway }) {
  const reduce = useReduceMotion();
  const swing = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    swing.set(
      withTiming(1, {
        duration: MAP_MOTION.gateBarrierMs,
        easing: curve('emphasized'),
        reduceMotion: reduceMotionFlag(false),
      }),
    );
  }, [reduce, swing]);
  // The barrier as it stood while the gate was shut (the banner is centred on the road's middle line).
  const mid = gateway.banner.x + gateway.banner.w / 2;
  const inner = mid - MAP.pillarX + MAP.pillar.w / 2;
  const rect = {
    x: inner,
    y: gateway.banner.y - MAP.top + MAP.barrier.y,
    w: mid + MAP.barrier.past - inner,
    h: MAP.barrier.h,
  };
  // It turns about its start end: up, away from the road.
  const up = I18nManager.isRTL ? 80 : -80;
  const style = useAnimatedStyle(() => ({
    opacity: 1 - swing.get(),
    transform: [{ rotate: `${up * swing.get()}deg` }],
  }));
  if (reduce) return null;
  return (
    <Animated.View
      style={[
        styles.abs,
        boxOf(rect),
        { transformOrigin: I18nManager.isRTL ? 'right center' : 'left center' },
        style,
      ]}
      {...hidden}
      testID={`gate-${chapter}-barrier-swing`}
    >
      <Stripes w={rect.w} h={rect.h} />
    </Animated.View>
  );
}

/** Chapter 1's start: a slate pad on the road, a little flag beside it. */
function StartPad({ rect }: { rect: Rect }) {
  return (
    <>
      <View style={[styles.abs, boxOf(rect)]} {...hidden} testID="map-start">
        <View style={[styles.padEdge, { width: rect.w, height: rect.h, borderRadius: rect.w / 2 }]} />
        <View style={[styles.padFace, { width: rect.w, height: rect.h, borderRadius: rect.w / 2 }]} />
      </View>
      <View
        style={[styles.abs, { start: rect.x + rect.w + space[3], top: rect.y - FLAG.pole + rect.h / 2 }]}
        {...hidden}
      >
        <View style={styles.flagPole} />
        <View style={styles.flagCloth}>
          <Svg width={FLAG.w} height={FLAG.h}>
            <Polygon
              points={
                I18nManager.isRTL
                  ? `${FLAG.w},0 0,${FLAG.h / 2} ${FLAG.w},${FLAG.h}`
                  : `0,0 ${FLAG.w},${FLAG.h / 2} 0,${FLAG.h}`
              }
              fill={color.accent}
            />
          </Svg>
        </View>
      </View>
    </>
  );
}

/** Chapter 30's finish line across the road's end. */
export function FinishLine({ rect }: { rect: Rect }) {
  const cell = rect.h / 2;
  const cols = Math.round(rect.w / cell);
  return (
    <View style={[styles.abs, boxOf(rect)]} {...hidden} testID="map-finish">
      <Svg width={rect.w} height={rect.h}>
        <G>
          {Array.from({ length: cols * 2 }, (_, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            return (
              <SvgRect
                key={i}
                x={col * cell}
                y={row * cell}
                width={cell}
                height={cell}
                fill={(col + row) % 2 === 0 ? color.text : color.bg}
              />
            );
          })}
        </G>
        <SvgRect
          x={1}
          y={1}
          width={rect.w - 2}
          height={rect.h - 2}
          fill="none"
          stroke={color.bg}
          strokeWidth={2}
        />
      </Svg>
    </View>
  );
}

const TAIL = { w: 18, h: 44, out: 12, top: 18 } as const;
const MEDALLION = 36;
const CHIP = 28;
const CHIP_STAR = 14;
const PILLAR = { edge: 3, plinth: 6, cap: 4 } as const;
const CHAIN = { inset: 16, width: 2 } as const;
const FLAG = { pole: 30, w: 16, h: 10 } as const;

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  plate: {
    minHeight: MAP.header,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[5],
    paddingHorizontal: space[6],
    paddingVertical: space[3],
    borderRadius: radius.lg,
    borderWidth: tokens.border.hairline,
    borderBottomWidth: 3,
    boxShadow: [{ offsetX: 0, offsetY: 1, blurRadius: 0, color: T.cardLip, inset: true }],
  },
  medallion: {
    width: MEDALLION,
    height: MEDALLION,
    borderRadius: MEDALLION / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medallionText: {
    ...text('scoreSm'),
    fontSize: 22,
    lineHeight: 20,
    color: color.text,
    writingDirection: 'ltr',
  },
  titles: { flex: 1, minWidth: 0, alignItems: 'flex-start', gap: space[1] },
  title: { ...text('h2'), color: color.text },
  name: { ...text('caption'), color: color.levelMap.coin.onDeep },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    minHeight: CHIP,
    paddingHorizontal: space[5],
    borderRadius: radius.pill,
    borderWidth: tokens.border.hairline,
    borderColor: 'transparent',
    backgroundColor: color.levelMap.chip,
  },
  chipComplete: { borderColor: color.accent },
  chipText: { ...text('scoreSm'), color: color.text },
  tail: { position: 'absolute', top: TAIL.top, width: TAIL.w, height: TAIL.h },
  pillarEdge: {
    position: 'absolute',
    top: PILLAR.edge,
    start: 0,
    end: 0,
    borderRadius: 6,
    backgroundColor: T.slateEdge,
  },
  pillarFace: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: color.surface2,
    experimental_backgroundImage: verticalGradient(T.slateFace),
    borderWidth: tokens.border.hairline,
    borderColor: color.border,
    borderTopColor: T.borderLit,
  },
  cap: { height: PILLAR.cap },
  plinth: {
    position: 'absolute',
    bottom: 0,
    start: -4,
    end: -4,
    height: PILLAR.plinth,
    borderRadius: 2,
    backgroundColor: T.borderLit,
  },
  chain: { position: 'absolute', width: CHAIN.width, borderRadius: 1, backgroundColor: G_.chain },
  padEdge: { position: 'absolute', top: 3, start: 0, backgroundColor: T.slateEdge },
  padFace: {
    position: 'absolute',
    top: 0,
    start: 0,
    backgroundColor: color.surface2,
    experimental_backgroundImage: verticalGradient(T.slateFace),
    borderWidth: tokens.border.hairline,
    borderColor: color.border,
    borderTopColor: T.borderLit,
  },
  flagPole: { width: 3, height: FLAG.pole, borderRadius: 1.5, backgroundColor: color.levelMap.scenery.post },
  flagCloth: { position: 'absolute', top: 2, start: 3 },
});
