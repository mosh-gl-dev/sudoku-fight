import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { tokens } from '../../theme';

/**
 * The brand's −8° slant (`tokens.effects.skewXDeg`: the primary button, a button paired with it, the VS badge),
 * drawn so that Android shows it too.
 *
 * React Native on Android never draws a skew. BaseViewManager decomposes a view's transform into a matrix and gives
 * the View only its translation, rotation, scale and camera distance (RN 0.86 `setTransformProperty`); the skew
 * the decomposition finds is dropped, since an Android View has nothing to set it on. So `skewX(-8deg)` was a
 * plain rectangle on every Android phone (QA run 2, B13/B16). But a shear is also a rotation, a stretch along the
 * axes and a second rotation (its singular value decomposition), and a View draws each of those. A slanted shape
 * is therefore two views: the outer one rotates and stretches, the inner one rotates, and together they are
 * exactly `skewX(deg)` about the shape's centre, the same on Android and iOS.
 *
 * What sits on the shape (a label) is not inside it, so it stays upright with no counter-skew.
 */

/** A rotation (degrees, as React Native takes it). */
type Rotate = { rotate: string };

export interface SlantTransforms {
  /** Rotate, then stretch along the view's own axes: what an Android View can apply. */
  outer: [Rotate, { scaleX: number }, { scaleY: number }];
  /** A rotation alone. */
  inner: [Rotate];
}

const DEG = 180 / Math.PI;

/**
 * `skewX(deg)` as two view transforms: outer · inner = [[1, tan deg], [0, 1]]. The closed-form SVD of that
 * matrix: its stretches multiply to 1 (a shear keeps the area) and differ by |tan deg|.
 */
export function slantTransforms(deg: number): SlantTransforms {
  const k = Math.tan(deg / DEG);
  const mean = Math.sqrt(1 + (k * k) / 4);
  const half = Math.abs(k) / 2;
  const a = Math.atan2(k / 2, 0);
  const b = Math.atan2(-k / 2, 1);
  return {
    outer: [{ rotate: `${((b + a) / 2) * DEG}deg` }, { scaleX: mean + half }, { scaleY: mean - half }],
    inner: [{ rotate: `${((b - a) / 2) * DEG}deg` }],
  };
}

/** The brand slant (−8°), once. */
export const SLANT = slantTransforms(tokens.effects.skewXDeg);

export interface SlantProps {
  /** Where the shape sits and how big it is (its box; it fills its parent by default). Never its look. */
  style?: StyleProp<ViewStyle>;
  /** Its look, slanted with it: fill, gradient, border, radius, inset lines. */
  shapeStyle?: StyleProp<ViewStyle>;
  testID?: string;
  /** The view that carries the look. */
  shapeTestID?: string;
}

/**
 * A slanted shape behind other content, drawn as the first sibling. It is absolutely placed, so the layout around
 * it does not change, and it never takes a touch or a reader's focus. Both views share one box, so the two
 * transforms turn about the same centre.
 */
export function Slant({ style, shapeStyle, testID, shapeTestID }: SlantProps) {
  return (
    <View
      pointerEvents="none"
      collapsable={false}
      style={[StyleSheet.absoluteFill, style, styles.outer]}
      testID={testID}
    >
      <View style={[StyleSheet.absoluteFill, shapeStyle, styles.inner]} testID={shapeTestID} />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { transform: SLANT.outer },
  inner: { transform: SLANT.inner },
});
