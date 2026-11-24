import { memo, useMemo } from 'react';
import { I18nManager, StyleSheet, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Path, Polygon } from 'react-native-svg';

import { Text } from '../../components/ui/Text';
import { color, text, tokens } from '../../theme';
import { DRIFT, driftSpec, gridPose, shadowPose, zonePose } from './mapMotion';
import type { ChapterTone } from './mapModel';
import type { SceneryItem } from './sceneryModel';

/**
 * A chapter's scenery (components.md §19.14; sceneryModel.ts places it): plain views and a few tiny Svgs, under the
 * way, hidden from screen readers and from touch. Its zones are translucent, so the wandering digits behind the
 * app show through them. A turn of +θ is −θ in a right-to-left layout (the map mirrors). No digits here but the
 * signpost's chapter number: the digits behind the app are the small wandering ones (D126).
 *
 * The big zones float (Moshe 25.11.2026: "העיגולים הגדולים שירחפו וינועו וישנו גודל"): each wanders a little,
 * breathes in size and turns a little, in its own rhythm. The sudoku box floats in space on its own (it wanders,
 * turns and tilts in perspective over its soft shadow), not with the zone it lies on. All off the map's drift
 * clock (mapMotion.ts DRIFT), in its beats; still under Reduced Motion (no `drift`). The signpost, the pennant and
 * the sparkles stand on the ground: still.
 */

const S = color.levelMap.scenery;
/** A turn of +θ is −θ right to left (read when drawn, as the pennant does). */
const signOf = () => (I18nManager.isRTL ? -1 : 1);

export interface MapSceneryProps {
  chapter: number;
  items: readonly SceneryItem[];
  tone: ChapterTone;
  /** The map's drift clock (mapMotion.ts useDriftClock), or none: all still (Reduced Motion). */
  drift?: SharedValue<number> | null;
}

export const MapScenery = memo(function MapScenery({ chapter, items, tone, drift = null }: MapSceneryProps) {
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={`chapter-${chapter}-scenery`}
    >
      {items.map((item, i) => (
        <SceneryPiece
          key={`${item.kind}-${i}`}
          item={item}
          tone={tone}
          chapter={chapter}
          drift={drift}
          seed={chapter * 16 + i}
        />
      ))}
    </View>
  );
});

interface PieceProps {
  item: SceneryItem;
  tone: ChapterTone;
  chapter: number;
  drift: SharedValue<number> | null;
  /** The piece's own rhythm (mapMotion.ts driftSpec), by chapter and place: no two float in step. */
  seed: number;
}

function SceneryPiece({ item, tone, chapter, drift, seed }: PieceProps) {
  const { rect } = item;
  const box = { start: rect.x, top: rect.y, width: rect.w, height: rect.h };
  switch (item.kind) {
    case 'zone':
      return (
        <Zone
          box={box}
          radius={Math.min(rect.w, rect.h) / 2}
          tint={tone.zone}
          rotate={item.rotate}
          drift={drift}
          seed={seed}
          testID={`chapter-${chapter}-zone`}
        />
      );
    case 'grid':
      return (
        <Grid
          box={box}
          ink={tone.ink}
          rotate={item.rotate}
          drift={drift}
          seed={seed}
          testID={`chapter-${chapter}-grid`}
        />
      );
    case 'signpost':
      return (
        <View style={[styles.abs, box]} testID={`chapter-${chapter}-signpost`}>
          <View style={styles.post} />
          <View
            style={[
              styles.plate,
              { backgroundColor: tone.deep, borderColor: tone.lit },
              item.arrow < 0 ? styles.plateEnd : styles.plateStart,
            ]}
          >
            <View
              style={[
                styles.notch,
                { backgroundColor: tone.deep },
                item.arrow < 0 ? styles.notchStart : styles.notchEnd,
              ]}
            />
            <Text style={styles.signNumber}>{String(chapter)}</Text>
          </View>
        </View>
      );
    case 'pennant':
      return (
        <View style={[styles.abs, box]} testID={`chapter-${chapter}-pennant`}>
          <View style={styles.pole} />
          <View style={styles.flag}>
            <Svg width={22} height={14}>
              <Polygon
                points={I18nManager.isRTL ? '22,0 0,7 22,14' : '0,0 22,7 0,14'}
                fill={tone.deep}
                stroke={color.accent}
                strokeWidth={1.5}
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        </View>
      );
    case 'sparkle': {
      const s = rect.w;
      const m = s / 2;
      const k = s * 0.14;
      return (
        <View style={[styles.abs, box]} testID={`chapter-${chapter}-sparkle`}>
          <Svg width={s} height={s}>
            <Path
              d={`M${m} 0 L${m + k} ${m - k} L${s} ${m} L${m + k} ${m + k} L${m} ${s} L${m - k} ${m + k} L0 ${m} L${m - k} ${m - k} Z`}
              fill={S.sparkle}
            />
          </Svg>
        </View>
      );
    }
  }
}

type Box = { start: number; top: number; width: number; height: number };

interface FloatProps {
  box: Box;
  rotate: number;
  drift: SharedValue<number> | null;
  seed: number;
  testID: string;
}

/** A big zone: it wanders, breathes and turns a little about its own turn. */
function Zone({
  box,
  radius,
  tint,
  rotate,
  drift,
  seed,
  testID,
}: FloatProps & { radius: number; tint: string }) {
  const spec = useMemo(() => driftSpec(seed), [seed]);
  const sign = signOf();
  const base = sign * rotate;
  const floatStyle = useAnimatedStyle(() => {
    if (!drift) return { transform: [{ rotate: `${base}deg` }] };
    const p = zonePose(spec, drift.get());
    return {
      transform: [
        { translateX: p.dx },
        { translateY: p.dy },
        { rotate: `${base + sign * p.spin}deg` },
        { scale: p.scale },
      ],
    };
  });
  return (
    <Animated.View
      style={[styles.abs, box, { borderRadius: radius, backgroundColor: tint }, floatStyle]}
      testID={testID}
    />
  );
}

/** The sudoku box, floating in space over its soft shadow. */
function Grid({ box, ink, rotate, drift, seed, testID }: FloatProps & { ink: string }) {
  const spec = useMemo(() => driftSpec(seed), [seed]);
  const sign = signOf();
  const base = sign * rotate;
  const floatStyle = useAnimatedStyle(() => {
    if (!drift) return { transform: [{ translateY: -GRID_LIFT }, { rotate: `${base}deg` }] };
    const p = gridPose(spec, drift.get());
    return {
      transform: [
        { perspective: DRIFT.grid.perspective },
        { translateX: p.dx },
        { translateY: p.dy - GRID_LIFT },
        { rotateX: `${p.tiltX}deg` },
        { rotateY: `${p.tiltY}deg` },
        { rotate: `${base + sign * p.spin}deg` },
      ],
    };
  });
  // The shadow follows the box sideways; it shrinks and pales as the box rises.
  const shadowStyle = useAnimatedStyle(() => {
    if (!drift) return { opacity: GRID_SHADOW_OPACITY, transform: [] };
    const p = gridPose(spec, drift.get());
    const s = shadowPose(p.dy);
    return {
      opacity: GRID_SHADOW_OPACITY * s.opacity,
      transform: [{ translateX: p.dx }, { scale: s.scale }],
    };
  });
  const third = box.width / 3;
  return (
    <>
      <Animated.View
        style={[
          styles.abs,
          styles.gridShadow,
          {
            start: box.start + box.width * 0.1,
            top: box.top + box.height - GRID_SHADOW_H / 2 + GRID_LIFT,
            width: box.width * 0.8,
          },
          shadowStyle,
        ]}
        testID={`${testID}-shadow`}
      />
      <Animated.View style={[styles.abs, box, styles.grid, { borderColor: ink }, floatStyle]} testID={testID}>
        {[1, 2].map((i) => (
          <View key={`v${i}`} style={[styles.vLine, { start: third * i - 0.5, backgroundColor: ink }]} />
        ))}
        {[1, 2].map((i) => (
          <View key={`h${i}`} style={[styles.hLine, { top: third * i - 0.5, backgroundColor: ink }]} />
        ))}
      </Animated.View>
    </>
  );
}

/** The sudoku box floats this far over its place; its shadow (this high, this dark) lies where it would stand. */
const GRID_LIFT = 6;
const GRID_SHADOW_H = 18;
const GRID_SHADOW_OPACITY = 0.6;
const SHADOW_INK = color.levelMap.token.shadow;

const POST = 4;
const PLATE = { w: 44, h: 22 } as const;

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  grid: { borderWidth: 2, borderRadius: 4 },
  gridShadow: {
    height: GRID_SHADOW_H,
    borderRadius: GRID_SHADOW_H / 2,
    experimental_backgroundImage: `radial-gradient(${SHADOW_INK} 0%, transparent 70%)`,
  },
  vLine: { position: 'absolute', top: 0, bottom: 0, width: 1 },
  hLine: { position: 'absolute', start: 0, end: 0, height: 1 },
  post: {
    position: 'absolute',
    top: PLATE.h - 2,
    bottom: 0,
    start: '50%',
    marginStart: -POST / 2,
    width: POST,
    borderRadius: POST / 2,
    backgroundColor: S.post,
  },
  plate: {
    position: 'absolute',
    top: 0,
    width: PLATE.w,
    height: PLATE.h,
    borderRadius: 4,
    borderWidth: tokens.border.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateStart: { start: 0 },
  plateEnd: { end: 0 },
  notch: {
    position: 'absolute',
    top: (PLATE.h - 14) / 2,
    width: 14,
    height: 14,
    transform: [{ rotate: '45deg' }],
  },
  notchStart: { start: -6 },
  notchEnd: { end: -6 },
  signNumber: {
    ...text('scoreSm'),
    fontSize: 16,
    lineHeight: 16,
    paddingTop: 3,
    color: color.text,
    writingDirection: 'ltr',
  },
  pole: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    start: 0,
    width: 3,
    borderRadius: 1.5,
    backgroundColor: S.post,
  },
  flag: { position: 'absolute', top: 2, start: 3 },
});
