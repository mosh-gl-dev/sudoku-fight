import { parseCellName } from '@sudoku-fight/engine';
import { act, render, screen, within } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';

import i18n from '../../../i18n';
import { useSettings } from '../../../state/settings';
import { tokens } from '../../../theme';
import { motion } from '../../../theme/motion';
import { cssCurve } from '../../ui/cssMotion';
import { RETIRE_MS } from '../../ui/retire';
import { type CellLock, type CellModel, type CellPlayer, emptyCell } from '../boardModel';
import { Cell, type CellFlash, LOCK_PULSE } from '../Cell';

/**
 * A move in a bot game logged ~230 'synchronouslyUpdateUIProps failed' on Android (QA run #3, T3-MOVE-UIPROPS;
 * docs/PERF.md, B14/B32): views a worklet had just moved were deleted in the frame the movers' avatars drew new
 * shapes, and Reanimated still held them. On the cell:
 * - my lock's endless pulse went with the lock, as my move's result came, with my avatar's nod (new layers);
 * - the move's flash went at 900 ms, as the nod ended and the avatar drew its still picture;
 * - an opponent's 22 dp avatar went with their lock, as their avatar's reaction started.
 * Now the pulse is a CSS animation (nothing to hold), and the flash and the small avatar stay, at rest and unseen,
 * for RETIRE_MS after the cell stops showing them.
 */

type Host = { props: Record<string, unknown> };
type Node = { type: unknown; props: Record<string, unknown>; children: (Node | string)[] };
const hidden = { includeHiddenElements: true } as const;
const styleOf = (el: unknown) =>
  (StyleSheet.flatten((el as Host).props.style as ViewStyle) ?? {}) as Record<string, unknown>;
/** The host views right under `node` (through the components between them). */
const hostChildren = (node: Node): Node[] =>
  node.children.flatMap((child) =>
    typeof child === 'string' ? [] : typeof child.type === 'string' ? [child] : hostChildren(child),
  );
const workletStyleOf = (el: unknown) =>
  ((el as Host).props.jestAnimatedStyle as { value?: object } | undefined)?.value ?? {};
const cssOf = (el: unknown) =>
  (StyleSheet.flatten((el as Host).props.jestInlineStyle as ViewStyle) ?? {}) as Record<string, unknown>;

const me: CellPlayer = {
  id: 'moshe',
  seat: 0,
  colorIndex: 0,
  name: 'MosheG',
  avatar: 'microphone',
  isMe: true,
};
const nina: CellPlayer = {
  id: 'nina',
  seat: 1,
  colorIndex: 1,
  name: 'NinaVolt',
  avatar: 'lava-lamp',
  isMe: false,
};
const lock = (seconds: number): CellLock => ({
  seconds,
  remainingMs: seconds * 1000,
  paused: false,
  urgent: false,
});
const cell = (name: string, over: Partial<CellModel> = {}): CellModel => ({
  ...emptyCell(parseCellName(name)),
  ...over,
});
const flash = (kind: CellFlash['kind'], id: number, digit?: CellFlash['digit']): CellFlash => ({
  kind,
  id,
  digit,
});
const advance = (ms: number) => act(async () => void jest.advanceTimersByTime(ms));

beforeEach(async () => {
  await i18n.changeLanguage('he');
  useSettings.setState({ reduceMotion: 'off' });
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

describe('my lock’s pulse (motion.md lock.pulse)', () => {
  it('is a CSS animation, 0 → 1 and back on the loop curve, endless: no worklet holds it', async () => {
    expect(LOCK_PULSE).toMatchObject({
      animationDuration: motion.loop.lockPulse / 2,
      animationTimingFunction: cssCurve('loop'),
      animationIterationCount: 'infinite',
      animationDirection: 'alternate',
    });
    await render(<Cell cell={cell('F8', { kind: 'myLock', player: me, lock: lock(7) })} />);
    const pulse = screen.getByTestId('cell-pulse', hidden);
    expect(workletStyleOf(pulse)).toEqual({});
    expect(cssOf(pulse)).toMatchObject({ ...LOCK_PULSE, opacity: 0 });
  });
});

describe('a flash that is over stays, at rest and unseen, for RETIRE_MS', () => {
  const solved = cell('D5', { kind: 'solved', digit: 7, player: nina });

  it('cleared (the game screen drops it at 900 ms): the same view stays, at 0, then goes', async () => {
    await render(<Cell cell={solved} flash={flash('correct', 1)} />);
    const fill = screen.getByTestId('cell-flash-correct-fill', hidden);
    await advance(900);
    await screen.rerender(<Cell cell={solved} flash={null} />);
    // The same host view, not a new one: nothing is deleted while the avatars draw.
    expect(screen.getByTestId('cell-flash-retired', hidden)).toBe(fill);
    expect(fill).toHaveAnimatedStyle({ opacity: 0 });
    await advance(RETIRE_MS - 100);
    expect(screen.getByTestId('cell-flash-retired', hidden)).toBe(fill);
    await advance(200);
    expect(screen.queryByTestId('cell-flash-retired', hidden)).toBeNull();
    expect(screen.queryByTestId(/^cell-flash-/, hidden)).toBeNull();
  });

  it('replaced by another flash mid-fade: the old one is gone from sight at once, the new one plays', async () => {
    const empty = cell('D5', { wrong: [3] });
    await render(<Cell cell={empty} flash={flash('wrong', 1, 3)} />);
    await advance(100);
    const oldFill = screen.getByTestId('cell-flash-wrong-fill', hidden);
    await screen.rerender(<Cell cell={empty} flash={flash('wrong', 2, 4)} />);
    expect(oldFill).toHaveAnimatedStyle({ opacity: 0 });
    expect(screen.getAllByTestId('cell-flash-retired', hidden)).toHaveLength(2); // the old fill and digit
    const fresh = screen.getByTestId('cell-flash-wrong-fill', hidden);
    expect(fresh).not.toBe(oldFill);
    expect(fresh).toHaveAnimatedStyle({ opacity: 1 });
    expect(screen.getByTestId('cell-flash-digit', hidden)).toHaveTextContent('4');
    await advance(RETIRE_MS + 100);
    expect(screen.queryByTestId('cell-flash-retired', hidden)).toBeNull();
  });

  it('reduced motion: the same', async () => {
    useSettings.setState({ reduceMotion: 'on' });
    await render(<Cell cell={cell('D5', { wrong: [3] })} flash={flash('wrong', 1, 3)} />);
    const frame = screen.getByTestId('cell-flash-wrong-frame', hidden);
    await advance(900);
    await screen.rerender(<Cell cell={cell('D5', { wrong: [3] })} flash={null} />);
    expect(screen.getByTestId('cell-flash-retired', hidden)).toBe(frame);
    expect(frame).toHaveAnimatedStyle({ opacity: 0 });
    await advance(RETIRE_MS + 100);
    expect(screen.queryByTestId('cell-flash-retired', hidden)).toBeNull();
  });
});

describe('an opponent’s small avatar stays, unseen, for RETIRE_MS after their lock', () => {
  const locked = cell('D5', { kind: 'oppLock', player: nina, lock: lock(4) });

  it('their digit lands: the avatar is hidden at once, the same view, then goes', async () => {
    await render(<Cell cell={locked} />);
    const avatar = screen.getByTestId('cell-avatar', hidden);
    await advance(500);
    await screen.rerender(<Cell cell={cell('D5', { kind: 'solved', digit: 7, player: nina })} />);
    expect(screen.queryByTestId('cell-avatar', hidden)).toBeNull();
    expect(screen.getByTestId('cell-avatar-retired', hidden)).toBe(avatar);
    expect(avatar).toHaveAnimatedStyle({ opacity: 0 });
    expect(screen.getByTestId('cell-digit', hidden)).toHaveTextContent('7');
    await advance(RETIRE_MS + 100);
    expect(screen.queryByTestId('cell-avatar-retired', hidden)).toBeNull();
  });

  it('they lock it again meanwhile: the avatar pops in again', async () => {
    await render(<Cell cell={locked} />);
    await advance(500);
    await screen.rerender(<Cell cell={cell('D5')} />);
    await advance(300);
    await screen.rerender(<Cell cell={locked} />);
    const avatar = screen.getByTestId('cell-avatar', hidden);
    expect(avatar).not.toHaveAnimatedStyle({ opacity: 0 });
    await advance(2000);
    expect(avatar).toHaveAnimatedStyle({ opacity: 1, transform: [{ scale: 1 }] });
    await advance(RETIRE_MS + 100);
    expect(screen.getByTestId('cell-avatar', hidden)).toBe(avatar);
  });

  it('kept out of the cell’s flow: the digit that came in its place stays centred', async () => {
    await render(<Cell cell={locked} />);
    await advance(500);
    await screen.rerender(<Cell cell={cell('D5', { kind: 'solved', digit: 7, player: nina })} />);
    // Laid out in the cell's column, the hidden 22 dp avatar pushed the new digit up (and half out) for 4 s.
    const face = screen.getByTestId('cell-D5-face', hidden) as unknown as Node;
    const inFlow = hostChildren(face).filter((child) => styleOf(child).position !== 'absolute');
    expect(inFlow).toHaveLength(1);
    expect(
      within(inFlow[0] as unknown as Parameters<typeof within>[0]).getByTestId('cell-digit', hidden),
    ).toHaveTextContent('7');
    expect(styleOf(screen.getByTestId('cell-slot-avatar', hidden))).toMatchObject({
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      alignItems: 'center',
      justifyContent: 'center',
    });
  });

  it('reduced motion: no pop, and still kept unseen', async () => {
    useSettings.setState({ reduceMotion: 'on' });
    await render(<Cell cell={locked} />);
    const avatar = screen.getByTestId('cell-avatar', hidden);
    expect(avatar).toHaveAnimatedStyle({ opacity: 1, transform: [{ scale: 1 }] });
    await screen.rerender(<Cell cell={cell('D5', { kind: 'solved', digit: 7, player: nina })} />);
    await advance(16);
    expect(screen.getByTestId('cell-avatar-retired', hidden)).toBe(avatar);
    expect(avatar).toHaveAnimatedStyle({ opacity: 0 });
  });
});

describe('a retired part is unseen in the very commit that retires it', () => {
  // The part's animated style goes to 0 from an effect, after the commit; until the UI thread runs it (and while
  // Reanimated still lays the fade's middle over the view) the part could show for a frame: the bot's avatar under
  // its new digit, an old flash over the new one. Its slot's own opacity is React's, in that very commit.
  it('the opponent’s avatar, as their digit lands', async () => {
    await render(<Cell cell={cell('D5', { kind: 'oppLock', player: nina, lock: lock(4) })} />);
    expect(styleOf(screen.getByTestId('cell-slot-avatar', hidden)).opacity).toBeUndefined();
    await screen.rerender(<Cell cell={cell('D5', { kind: 'solved', digit: 7, player: nina })} />);
    const slot = screen.getByTestId('cell-slot-avatar', hidden);
    expect(styleOf(slot).opacity).toBe(0);
    expect(within(slot).getByTestId('cell-avatar-retired', hidden)).toBeTruthy();
    expect(slot).toHaveProp('collapsable', false);
  });

  it('a flash replaced mid-fade, while the new one shows', async () => {
    const empty = cell('D5', { wrong: [3] });
    await render(<Cell cell={empty} flash={flash('wrong', 1, 3)} />);
    await advance(100);
    await screen.rerender(<Cell cell={empty} flash={flash('wrong', 2, 4)} />);
    const slots = screen.getAllByTestId('cell-slot-flash', hidden);
    const unseen = slots.filter((slot) => styleOf(slot).opacity === 0);
    expect(unseen).toHaveLength(2);
    for (const slot of unseen) expect(within(slot).getByTestId('cell-flash-retired', hidden)).toBeTruthy();
    const shown = slots.filter((slot) => styleOf(slot).opacity === undefined);
    expect(shown.map((slot) => within(slot).queryByTestId('cell-flash-retired', hidden))).toEqual([
      null,
      null,
    ]);
  });
});

it('a correct flash still starts at the flash opacity (the look is unchanged)', async () => {
  await render(
    <Cell cell={cell('D5', { kind: 'solved', digit: 7, player: nina })} flash={flash('correct', 1)} />,
  );
  expect(screen.getByTestId('cell-flash-correct-fill', hidden)).toHaveAnimatedStyle({
    opacity: tokens.opacity.correctFlash,
  });
});
