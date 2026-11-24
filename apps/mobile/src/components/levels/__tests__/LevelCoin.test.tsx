// First: the real Reanimated (its test setup), before anything that draws.
import { makeMutable } from 'react-native-reanimated';

import { act, render, screen } from '@testing-library/react-native';
import { I18nManager, StyleSheet, type ViewStyle } from 'react-native';

import { toneOf } from '../../../screens/levels/mapModel';
import { useSettings } from '../../../state/settings';
import { color, size } from '../../../theme';
import { REVEAL } from '../StarRow';
import { clearOf, COIN, LevelCoin, sheenOf } from '../LevelCoin';
import { StarCrown } from '../StarCrown';

/**
 * A stage's coin on the level map, and its crown of stars (components.md §19.2; the board-game road of
 * 31.10.2026): each look paints its face, edge, grid and number from color.levelMap; a closed coin wears its
 * chapter's tone and a lock; the boss is a fortress with its crown, its bot and the arena's corners; a press sinks
 * the face onto its edge. The crown's earned stars count from the start side, and the new ones pop in (at once
 * under Reduced Motion).
 */

const hidden = { includeHiddenElements: true };
const styleOf = (el: { props: { style?: unknown } }) =>
  (StyleSheet.flatten(el.props.style as ViewStyle) ?? {}) as ViewStyle;
const M = color.levelMap.coin;
const DUSK = toneOf(1);

beforeEach(() => useSettings.setState({ reduceMotion: 'off' }));
afterEach(() => jest.useRealTimers());

describe('LevelCoin', () => {
  it('64 on the map, the boss’s 92, the panel’s 48: an outline, an edge 6 dp under the face, and the face', async () => {
    expect([COIN.node.side, COIN.boss.side, COIN.panel.side]).toEqual([
      size.levelCoin,
      size.levelCoinBoss,
      size.levelCoinPanel,
    ]);
    await render(<LevelCoin n={5} variant="node" look="plain" tone={DUSK} testID="coin" />);
    expect(styleOf(screen.getByTestId('coin', hidden))).toMatchObject({ width: 64, height: 70 });
    expect(styleOf(screen.getByTestId('coin-edge', hidden))).toMatchObject({ top: 6, width: 64, height: 64 });
    // Decorative: the node's button says it.
    expect(screen.getByTestId('coin', hidden)).toHaveProp('accessibilityElementsHidden', true);
  });

  it('every look sets a border width, so a coin that unlocks never drops it (the Android gradient crash, NO_BORDER)', async () => {
    for (const look of ['plain', 'gilded', 'gold', 'locked'] as const) {
      await render(<LevelCoin n={5} variant="node" look={look} tone={DUSK} testID="coin" />);
      const face = styleOf(screen.getByTestId('coin-face', hidden));
      expect(face.experimental_backgroundImage).toBeTruthy();
      expect(typeof face.borderWidth).toBe('number');
    }
  });

  it.each([
    ['plain', M.face[1], M.plainEdge, M.number, M.grid],
    ['gilded', M.face[1], M.gildedEdge, M.number, M.grid],
    ['gold', color.accent, M.gildedEdge, M.goldNumber, M.goldGrid],
    ['locked', DUSK.deep, DUSK.edge, M.onDeep, DUSK.lit],
  ] as const)(
    'the %s look: its face, edge, number and grid colours',
    async (look, face, edge, number, grid) => {
      await render(<LevelCoin n={5} variant="node" look={look} tone={DUSK} testID="coin" />);
      expect(styleOf(screen.getByTestId('coin-face', hidden))).toMatchObject({ backgroundColor: face });
      expect(styleOf(screen.getByTestId('coin-edge', hidden))).toMatchObject({ backgroundColor: edge });
      const digits = screen.getByTestId('coin-number', hidden);
      expect(digits).toHaveTextContent('5');
      // Digits never mirror.
      expect(styleOf(digits)).toMatchObject({ color: number, writingDirection: 'ltr' });
      const lines = screen.getByTestId('coin-face', hidden).props.children[0] as {
        props: { style: unknown };
      }[];
      expect(StyleSheet.flatten(lines[0]!.props.style as ViewStyle)).toMatchObject({ backgroundColor: grid });
    },
  );

  it('a locked coin: the lock badge, its border lit while it flashes (Reduced Motion’s tap); no lock when open', async () => {
    await render(<LevelCoin n={12} variant="node" look="locked" tone={DUSK} testID="coin" />);
    expect(styleOf(screen.getByTestId('coin-lock', hidden))).toMatchObject({ borderColor: color.border });
    await screen.rerender(<LevelCoin n={12} variant="node" look="locked" tone={DUSK} flash testID="coin" />);
    expect(styleOf(screen.getByTestId('coin-lock', hidden))).toMatchObject({ borderColor: color.text });
    await screen.rerender(<LevelCoin n={12} variant="node" look="plain" tone={DUSK} testID="coin" />);
    expect(screen.queryByTestId('coin-lock', hidden)).toBeNull();
  });

  it('the boss: the crown badge (faint when locked), the arena’s corners unless locked, its bot on the face', async () => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    await render(
      <LevelCoin
        n={10}
        variant="boss"
        look="plain"
        tone={DUSK}
        bot={<Text testID="bot">bot</Text>}
        testID="coin"
      />,
    );
    expect(screen.getByTestId('coin-crown', hidden)).toBeTruthy();
    expect(screen.getByTestId('coin-arena', hidden)).toBeTruthy();
    expect(screen.getByTestId('bot', hidden)).toBeTruthy();
    expect(styleOf(screen.getByTestId('coin', hidden))).toMatchObject({ width: 92 });
    await screen.rerender(<LevelCoin n={10} variant="boss" look="locked" tone={DUSK} testID="coin" />);
    expect(screen.queryByTestId('coin-arena', hidden)).toBeNull();
    expect(screen.getByTestId('icon-crown', hidden)).toHaveProp('stroke', color.iconFaint);
  });

  it('the old pin (LEVEL_UI.mapToken off): P1’s ring with ●', async () => {
    await render(<LevelCoin n={8} variant="node" look="plain" tone={DUSK} pin testID="coin" />);
    expect(styleOf(screen.getByTestId('coin-pin', hidden))).toMatchObject({
      borderColor: color.players[0]!.ring,
    });
    expect(screen.getByTestId('glyph-circle', hidden)).toBeTruthy();
  });

  it('a press moves the face 4 dp onto its edge', async () => {
    jest.useFakeTimers();
    const press = makeMutable(0);
    await render(<LevelCoin n={5} variant="node" look="plain" tone={DUSK} press={press} testID="coin" />);
    expect(screen.getByTestId('coin-face', hidden)).toHaveAnimatedStyle({ transform: [{ translateY: 0 }] });
    await act(async () => {
      press.set(1);
      jest.advanceTimersByTime(50);
    });
    expect(screen.getByTestId('coin-face', hidden)).toHaveAnimatedStyle({ transform: [{ translateY: 4 }] });
  });
});

describe('StarCrown', () => {
  it('three stars, the earned ones gold, counted from the start side; hidden from screen readers', async () => {
    await render(<StarCrown stars={2} testID="crown" />);
    expect(screen.getByTestId('crown', hidden)).toHaveProp('accessibilityElementsHidden', true);
    expect(screen.getByTestId('crown-0-filled', hidden)).toBeTruthy();
    expect(screen.getByTestId('crown-1-filled', hidden)).toBeTruthy();
    expect(screen.getByTestId('crown-2-empty', hidden)).toBeTruthy();
  });

  it('the earned stars start from the right in a right-to-left layout', async () => {
    const spy = jest.replaceProperty(I18nManager, 'isRTL', true);
    try {
      await render(<StarCrown stars={1} testID="crown" />);
      // The first star earned is drawn at the right side's place (x 52 of the 64 box).
      const first = screen.getByTestId('crown-0-filled', hidden);
      const shape = first.props.children as { props: { place: { x: number } } };
      expect(shape.props.place.x).toBe(52);
    } finally {
      spy.restore();
    }
  });

  it('reveal: only the new stars pop in, one after another, with the result’s timings', async () => {
    jest.useFakeTimers();
    await render(<StarCrown stars={3} reveal={{ from: 1, delayMs: 350 }} testID="crown" />);
    expect(screen.queryByTestId('crown-0-pop', hidden)).toBeNull();
    const pop = (i: number) => screen.getByTestId(`crown-${i}-pop`, hidden);
    expect(pop(1)).toHaveAnimatedStyle({ opacity: 0 });
    await act(async () => void jest.advanceTimersByTime(350 + REVEAL.staggerMs - 10));
    expect(pop(1)).not.toHaveAnimatedStyle({ opacity: 0 });
    expect(pop(2)).toHaveAnimatedStyle({ opacity: 0 });
    await act(async () => void jest.advanceTimersByTime(1500));
    for (const i of [1, 2]) expect(pop(i)).toHaveAnimatedStyle({ opacity: 1, transform: [{ scale: 1 }] });
  });

  it('reveal under Reduced Motion: every earned star at once', async () => {
    useSettings.setState({ reduceMotion: 'on' });
    await render(<StarCrown stars={3} reveal={{ from: 1, delayMs: 350 }} testID="crown" />);
    expect(screen.queryByTestId('crown-1-pop', hidden)).toBeNull();
    for (const i of [0, 1, 2]) expect(screen.getByTestId(`crown-${i}-filled`, hidden)).toBeTruthy();
  });
});

describe('the coin’s sheen (Moshe 25.11.2026: ממש תלת מימדיים)', () => {
  it('fades to its own colour with no alpha, never to `transparent` (Android would run a grey band)', () => {
    expect(clearOf('#4a5ca8')).toBe('rgba(74, 92, 168, 0)');
    expect(clearOf('rgba(255,255,255,0.55)')).toBe('rgba(255, 255, 255, 0)');
    const tone = toneOf(1);
    for (const look of ['gold', 'locked'] as const) {
      const sheen = sheenOf(look, tone);
      expect(sheen).toMatch(/^linear-gradient\(/);
      expect(sheen).not.toMatch(/transparent/);
    }
    for (const look of ['plain', 'gilded'] as const) expect(sheenOf(look, tone)).toBeNull();
  });
});
