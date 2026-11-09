import { tokens } from './tokens.generated';

/**
 * Translucent tokens laid flat (B12, B15, B50). The wandering digits (D126) lie behind every screen, and the
 * cards, buttons and keys in front of them must be opaque, or a digit shows through. A fill that is a
 * translucent token (accentSubtle, a selected chip's 10 % gold) is drawn as the one opaque colour it makes over
 * the ground it was designed on, so it keeps its look and hides what is behind it.
 */

type Rgba = readonly [r: number, g: number, b: number, a: number];

/** "#rrggbb" or "rgba(r,g,b,a)" (the forms tokens.json uses). */
function parse(value: string): Rgba {
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const n = parseInt(hex[1]!, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const rgba = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(value);
  if (rgba)
    return [Number(rgba[1]), Number(rgba[2]), Number(rgba[3]), rgba[4] === undefined ? 1 : Number(rgba[4])];
  throw new Error(`Not a colour: ${value}`);
}

/** `top` over the opaque `under` (the screen's ground by default), as the screen shows it: "#rrggbb". */
export function opaqueOver(top: string, under: string = tokens.color.bg): string {
  const [r, g, b, a] = parse(top);
  const ground = parse(under);
  return `#${[r, g, b]
    .map((v, i) => Math.round(v * a + ground[i]! * (1 - a)))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
}
