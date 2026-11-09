import { opaqueOver } from '../blend';
import { color } from '../index';

describe('opaqueOver (B12, B15: opaque fills in front of the wandering digits)', () => {
  it('lays a translucent token over the ground as one opaque colour', () => {
    // accentSubtle, gold #ffcf3f at 10 %, over bg #0f1218.
    expect(opaqueOver('rgba(255,207,63,0.1)', '#0f1218')).toBe('#27251c');
    expect(opaqueOver(color.accentSubtle)).toBe(opaqueOver(color.accentSubtle, color.bg));
    expect(opaqueOver(color.keypad.keyLipArmed)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('keeps an opaque colour as it is, and the ground at alpha 0', () => {
    expect(opaqueOver('#1f2430', '#0f1218')).toBe('#1f2430');
    expect(opaqueOver('rgba(255,255,255,0)', '#0f1218')).toBe('#0f1218');
    expect(opaqueOver('rgb(54,201,240)', '#0f1218')).toBe('#36c9f0');
  });

  it('refuses what is not a colour', () => {
    expect(() => opaqueOver('gold')).toThrow('Not a colour');
  });
});
