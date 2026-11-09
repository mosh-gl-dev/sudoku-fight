import designTokens from '../../../../../../docs/design/tokens.json';
import { contrast, tokens } from '../../../theme';

/**
 * The level map's colours (tokens.json color.levelMap; components.md §19.14): every text and mark it draws is
 * readable (WCAG 2: 4.5:1 for text, 3:1 for marks), the chapters' tones stay dark and quiet (never read as a
 * player's seat colour, never a loud ground under the wandering digits), and the generated theme holds them.
 */

const M = tokens.color.levelMap;
const C = tokens.color;

/** A translucent colour over an opaque one, as the screen shows it. */
function over(top: string, under: string): string {
  const m = /^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/.exec(top.replace(/\s/g, ''));
  if (!m) return top;
  const n = parseInt(under.slice(1), 16);
  const base = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const a = Number(m[4]);
  return `#${[1, 2, 3]
    .map((i, j) =>
      Math.round(Number(m[i]) * a + base[j]! * (1 - a))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

describe('the coins', () => {
  it.each(M.coin.face)('the number on the light face stop %s: 4.5:1 or more', (face) => {
    expect(contrast(M.coin.number, face)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(C.tactile.goldFace)('the number on the gold face stop %s: 4.5:1 or more', (face) => {
    expect(contrast(M.coin.goldNumber, face)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(M.chapter.map((t) => [t.name, t] as const))(
    'a closed coin of chapter tone %s: its light number 4.5:1 or more on the tone, on its lit top too (3:1, Teko 32)',
    (_name, tone) => {
      expect(contrast(M.coin.onDeep, tone.deep)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(M.coin.onDeep, tone.lit)).toBeGreaterThanOrEqual(3);
    },
  );

  it('the crown: a gold star against its outline, an empty star’s stroke against its fill (3:1 or more)', () => {
    expect(contrast(M.crown.filled, M.crown.outline)).toBeGreaterThanOrEqual(3);
    expect(contrast(M.crown.emptyStroke, M.crown.emptyFill)).toBeGreaterThanOrEqual(3);
  });

  it('the rings: "you are here" and "chosen" 3:1 or more against the ground; the coin’s outline against the gold road', () => {
    expect(contrast(M.beacon.ring, C.bg)).toBeGreaterThanOrEqual(3);
    expect(contrast(C.text, C.bg)).toBeGreaterThanOrEqual(3);
    expect(contrast(M.next.ring, C.bg)).toBeGreaterThanOrEqual(3);
    expect(contrast(M.coin.outline, M.roadDone.kerb)).toBeGreaterThanOrEqual(3);
  });
});

describe('the road', () => {
  it('the gold road (where I have been) stands out on the ground: 3:1 or more, kerb, body and edge', () => {
    for (const part of [M.roadDone.kerb, M.roadDone.body, M.roadDone.edge])
      expect(contrast(part, C.bg)).toBeGreaterThanOrEqual(3);
  });

  it('the road ahead is quieter than the gold one, but shows (its kerb over 2:1)', () => {
    expect(contrast(M.road.kerb, C.bg)).toBeGreaterThan(2);
    expect(contrast(M.road.kerb, C.bg)).toBeLessThan(contrast(M.roadDone.kerb, C.bg));
  });

  it('the barrier’s stripes 3:1 or more between them', () => {
    expect(contrast(M.gate.stripeLight, M.gate.stripeDark)).toBeGreaterThanOrEqual(3);
  });
});

describe('the chapters’ tones', () => {
  it('six of them, each with its ground, deep, edge, lit and ink colours', () => {
    expect(M.chapter.map((t) => t.name)).toEqual(['dusk', 'plum', 'teal', 'ember', 'ocean', 'rose']);
  });

  it.each(M.chapter.map((t) => [t.name, t] as const))(
    '%s: the banner’s words on it 4.5:1 or more',
    (_name, tone) => {
      expect(contrast(C.text, tone.deep)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(M.coin.onDeep, tone.deep)).toBeGreaterThanOrEqual(4.5);
      // The stars chip over the ribbon: the count and the gold star.
      const chip = over(M.chip, tone.deep);
      expect(contrast(C.text, chip)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(C.accent, chip)).toBeGreaterThanOrEqual(3);
    },
  );

  it.each(M.chapter.map((t) => [t.name, t] as const))(
    '%s never reads as a player: far darker than every seat ring (3:1 or more), and its ground stays quiet',
    (_name, tone) => {
      for (const p of C.players) expect(contrast(tone.deep, p.ring)).toBeGreaterThanOrEqual(3);
      const ground = over(tone.zone, C.bg);
      expect(contrast(ground, C.bg)).toBeGreaterThan(1.15);
      expect(contrast(ground, C.bg)).toBeLessThan(1.45);
      // Translucent: the wandering digits behind the app show through it.
      expect(tone.zone).toMatch(/^rgba\(.*,0\.\d+\)$/);
    },
  );
});

it('the generated theme holds the map’s tokens as tokens.json has them', () => {
  const source = (designTokens as unknown as { color: { levelMap: Record<string, unknown> } }).color.levelMap;
  const { _note: _ignored, ...rest } = source;
  expect(JSON.parse(JSON.stringify(M))).toEqual(rest);
  const sizes = (designTokens as unknown as { size: Record<string, number> }).size;
  expect([sizes.levelCoin, sizes.levelCoinBoss, sizes.levelCoinPanel]).toEqual([
    tokens.size.levelCoin,
    tokens.size.levelCoinBoss,
    tokens.size.levelCoinPanel,
  ]);
});
