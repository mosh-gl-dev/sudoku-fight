import type { StyleProp, ViewStyle } from 'react-native';
import { type JsxAST, parse, SvgAst } from 'react-native-svg';

/**
 * An avatar's markup (renderStatic, a layer of nativeLayers), drawn by react-native-svg as SvgXml draws it, but
 * parsed once. SvgXml parses its markup again on every mount, a character at a time in JS, and builds a React
 * element for each shape; a screen that opens draws the same few avatars at the same sizes as the last time it
 * opened (B14, QA run #2: the JS before a new screen's first frame). The parsed tree, its elements with it, is
 * kept for the next mount: the oldest of AST_CACHE_SIZE goes first.
 *
 * Under Jest it is the host element SvgXml with its `xml` (jest.setup.ts), as SvgXml itself is.
 */

/** How many parsed trees stay (a few dozen kB each: a screen of different avatars, and the screens around it). */
export const AST_CACHE_SIZE = 96;

const asts = new Map<string, JsxAST | null>();

/** react-native-svg's parse() of `xml`, remembered; null for markup it cannot parse (logged, as SvgXml does). */
export function svgAst(xml: string): JsxAST | null {
  const hit = asts.get(xml);
  if (hit !== undefined) {
    asts.delete(xml);
    asts.set(xml, hit);
    return hit;
  }
  let ast: JsxAST | null = null;
  try {
    ast = parse(xml);
  } catch (error) {
    console.error(error);
  }
  asts.set(xml, ast);
  if (asts.size > AST_CACHE_SIZE) asts.delete(asts.keys().next().value!);
  return ast;
}

export interface SvgMarkupProps {
  xml: string;
  width: number;
  height: number;
  style?: StyleProp<ViewStyle>;
}

/** One avatar markup, as `<SvgXml xml width height style />` would draw it. */
export function SvgMarkup({ xml, width, height, style }: SvgMarkupProps) {
  return <SvgAst ast={svgAst(xml)} override={{ width, height, style }} />;
}
