import { memo } from 'react';
import { I18nManager, StyleSheet, View } from 'react-native';
import Svg, { Path, Polygon } from 'react-native-svg';

import { Text } from '../../components/ui/Text';
import { color, text, tokens } from '../../theme';
import type { ChapterTone } from './mapModel';
import type { SceneryItem } from './sceneryModel';

/**
 * A chapter's scenery (components.md §19.14; sceneryModel.ts places it): plain views and a few tiny Svgs, under the
 * road, still, hidden from screen readers and from touch. Its zones are translucent, so the wandering digits
 * behind the app show through them. A turn of +θ is −θ in a right-to-left layout (the map mirrors). No digits
 * here but the signpost's chapter number: the digits behind the app are the small wandering ones (D126).
 */

const S = color.levelMap.scenery;
const turn = (deg: number) => `${I18nManager.isRTL ? -deg : deg}deg`;

export interface MapSceneryProps {
  chapter: number;
  items: readonly SceneryItem[];
  tone: ChapterTone;
}

export const MapScenery = memo(function MapScenery({ chapter, items, tone }: MapSceneryProps) {
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={`chapter-${chapter}-scenery`}
    >
      {items.map((item, i) => (
        <SceneryPiece key={`${item.kind}-${i}`} item={item} tone={tone} chapter={chapter} />
      ))}
    </View>
  );
});

function SceneryPiece({ item, tone, chapter }: { item: SceneryItem; tone: ChapterTone; chapter: number }) {
  const { rect } = item;
  const box = { start: rect.x, top: rect.y, width: rect.w, height: rect.h };
  switch (item.kind) {
    case 'zone':
      return (
        <View
          style={[
            styles.abs,
            box,
            {
              borderRadius: Math.min(rect.w, rect.h) / 2,
              backgroundColor: tone.zone,
              transform: [{ rotate: turn(item.rotate) }],
            },
          ]}
          testID={`chapter-${chapter}-zone`}
        />
      );
    case 'grid': {
      const third = rect.w / 3;
      return (
        <View
          style={[
            styles.abs,
            box,
            styles.grid,
            { borderColor: tone.ink, transform: [{ rotate: turn(item.rotate) }] },
          ]}
          testID={`chapter-${chapter}-grid`}
        >
          {[1, 2].map((i) => (
            <View
              key={`v${i}`}
              style={[styles.vLine, { start: third * i - 0.5, backgroundColor: tone.ink }]}
            />
          ))}
          {[1, 2].map((i) => (
            <View key={`h${i}`} style={[styles.hLine, { top: third * i - 0.5, backgroundColor: tone.ink }]} />
          ))}
        </View>
      );
    }
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

const POST = 4;
const PLATE = { w: 44, h: 22 } as const;

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  grid: { borderWidth: 2, borderRadius: 4 },
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
