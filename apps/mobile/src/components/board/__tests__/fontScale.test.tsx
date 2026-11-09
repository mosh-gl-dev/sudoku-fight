import { parseCellName } from '@sudoku-fight/engine';
import { act, render, screen } from '@testing-library/react-native';
import { Dimensions, StyleSheet, type TextStyle } from 'react-native';

import i18n from '../../../i18n';
import { useSettings } from '../../../state/settings';
import { text, tokens } from '../../../theme';
import { fourPlayerView, NOW, twoPlayerView } from '../../player/__fixtures__/gameView';
import { cardModel, type LockStripModel } from '../../player/cardModel';
import { LockStrip } from '../../player/LockStrip';
import { PlayerCard } from '../../player/PlayerCard';
import { PlayerCardCompact } from '../../player/PlayerCardCompact';
import { DeltaLabel, scoreScale, ScoreNumber } from '../../player/Score';
import { FONT_SCALE_CAPS, maxFontScale, Text } from '../../ui/Text';
import { Board } from '../Board';
import { boardModel, type CellLock, type CellModel, type CellPlayer, emptyCell } from '../boardModel';
import { CancelSelection } from '../CancelSelection';
import { Cell, type CellFlash } from '../Cell';
import { demoBoard } from '../demo';
import { boardGeometry, cellTextPx, isLargeText, LARGE_TEXT } from '../geometry';
import { Keypad } from '../Keypad';

/*
 * BRD-3 (polish audit, 2026-10-30): the play surface's policy for the system text size. The board and the keypad
 * have fixed geometry (a 38 dp cell that clips, a 60 dp key), so their digits never grow past the design
 * ('board', ×1.0); a cell gives large-text users bigger digits of its own instead. The HUD around them (the lock
 * strip, the cards' names and scores, "ביטול בחירה") grows up to ×1.35, on one line.
 */

const hidden = { includeHiddenElements: true };
const styleOf = (el: { props: { style?: unknown } }) =>
  (StyleSheet.flatten(el.props.style as TextStyle) ?? {}) as TextStyle;

type Node = { type: string; props: Record<string, unknown> };
/** Every host text on the screen: what React Native draws, with the props it gets. */
const hostTexts = (): Node[] => screen.container.queryAll((n) => n.type === 'Text');
const capsOf = (nodes: Node[]) => nodes.map((n) => n.props.maxFontSizeMultiplier);

const me: CellPlayer = {
  id: 'moshe',
  seat: 0,
  colorIndex: 0,
  name: 'MosheG',
  avatar: 'cassette',
  isMe: true,
};
const lock = (seconds: number, over: Partial<CellLock> = {}): CellLock => ({
  seconds,
  remainingMs: seconds * 1000,
  paused: false,
  urgent: false,
  ...over,
});
const cell = (name: string, over: Partial<CellModel> = {}): CellModel => ({
  ...emptyCell(parseCellName(name)),
  ...over,
});

beforeEach(async () => {
  await i18n.changeLanguage('he');
  useSettings.setState({ reduceMotion: 'off' });
});

describe('ui/Text scale', () => {
  it("'board' caps the system text at ×1.0, 'hud' at ×1.35; without one, nothing is capped", async () => {
    expect(FONT_SCALE_CAPS).toEqual({ board: 1, hud: 1.35 });
    expect([maxFontScale('board'), maxFontScale('hud'), maxFontScale(undefined)]).toEqual([
      1,
      1.35,
      undefined,
    ]);
    await render(
      <>
        <Text scale="board">1</Text>
        <Text scale="hud">2</Text>
        <Text>3</Text>
        <Text scale="board" maxFontSizeMultiplier={2}>
          4
        </Text>
      </>,
    );
    expect(capsOf(hostTexts())).toEqual([1, 1.35, undefined, 2]);
    expect(hostTexts()[2]!.props).not.toHaveProperty('maxFontSizeMultiplier');
  });
});

describe('the board and the keypad: never past the design', () => {
  // Every row names its flash (null: none): it.each passes exactly the row, so the test takes three arguments.
  const states: [string, CellModel, CellFlash | null][] = [
    ['a given', cell('A3', { kind: 'given', digit: 4 }), null],
    [
      'a solved cell with wrong digits',
      cell('A5', { kind: 'solved', digit: 7, player: me, wrong: [2, 3] }),
      null,
    ],
    ['my lock and its seconds', cell('F8', { kind: 'myLock', player: me, lock: lock(7), wrong: [5] }), null],
    ['my lock, urgent', cell('F8', { kind: 'myLock', player: me, lock: lock(2, { urgent: true }) }), null],
    ['my digit waiting for the connection', cell('E5', { kind: 'queued', digit: 6, player: me }), null],
    ['a find’s target chip', cell('B2', { kind: 'given', digit: 6, mark: 'target' }), null],
    ['a found error', cell('C3', { kind: 'solved', digit: 3, player: me, correction: { wrong: 8 } }), null],
    ['a wrong digit’s flash', cell('D4', { wrong: [9] }), { kind: 'wrong', id: 1, digit: 9 }],
  ];

  it.each(states)('every text of a cell carries the board cap: %s', async (_name, model, flash) => {
    await render(<Cell cell={model} flash={flash} />);
    const texts = hostTexts();
    expect(texts.length).toBeGreaterThan(0);
    expect(capsOf(texts).every((cap) => cap === FONT_SCALE_CAPS.board)).toBe(true);
  });

  it('the seconds pill, the digit and the wrong marks each carry it', async () => {
    await render(<Cell cell={cell('F8', { kind: 'myLock', player: me, lock: lock(7), wrong: [5] })} />);
    expect(screen.getByTestId('cell-pill-seconds')).toHaveProp('maxFontSizeMultiplier', 1);
    expect(screen.getByTestId('cell-wrong')).toHaveProp('maxFontSizeMultiplier', 1);
    await render(<Cell cell={cell('A3', { kind: 'given', digit: 4 })} />);
    expect(screen.getByTestId('cell-digit')).toHaveProp('maxFontSizeMultiplier', 1);
  });

  it('every key’s digit and count carry the board cap', async () => {
    const { view, mySeat, now } = demoBoard();
    await render(<Keypad model={boardModel(view, mySeat, now).keypad} onDigit={jest.fn()} />);
    for (let d = 1; d <= 9; d++) {
      expect(screen.getByTestId(`key-${d}-digit`)).toHaveProp('maxFontSizeMultiplier', FONT_SCALE_CAPS.board);
      expect(screen.getByTestId(`key-${d}-count`)).toHaveProp('maxFontSizeMultiplier', FONT_SCALE_CAPS.board);
    }
    expect(capsOf(hostTexts()).every((cap) => cap === FONT_SCALE_CAPS.board)).toBe(true);
  });
});

describe('large text: the cells’ own bigger digits', () => {
  const setFontScale = async (fontScale: number) => {
    const { window, screen: whole } = { window: Dimensions.get('window'), screen: Dimensions.get('screen') };
    await act(async () => {
      Dimensions.set({ window: { ...window, fontScale }, screen: { ...whole, fontScale } });
    });
  };
  const initial = Dimensions.get('window').fontScale;
  afterEach(async () => setFontScale(initial));

  it('from a system text of ×1.15: the digit 22 → 25 and the wrong marks 11 → 12 at the design’s cell', () => {
    expect([isLargeText(1), isLargeText(1.1), isLargeText(1.15), isLargeText(2)]).toEqual([
      false,
      false,
      true,
      true,
    ]);
    const plain = boardGeometry();
    const large = boardGeometry(undefined, { largeText: true });
    expect(plain).not.toHaveProperty('largeText');
    expect(cellTextPx(plain, 'digit')).toEqual({ fontSize: 22, lineHeight: 22 });
    expect(cellTextPx(plain, 'wrongDigit')).toEqual({ fontSize: 11, lineHeight: 11 });
    expect(cellTextPx(large, 'digit')).toEqual({ fontSize: LARGE_TEXT.digit, lineHeight: 25 });
    expect(cellTextPx(large, 'wrongDigit')).toEqual({ fontSize: LARGE_TEXT.wrongDigit, lineHeight: 12 });
    // About 0.66 of the cell, and scaled with the board like every inner value.
    expect(LARGE_TEXT.digit / plain.cell).toBeCloseTo(0.65, 1);
    const small = boardGeometry(300, { largeText: true });
    expect(cellTextPx(small, 'digit').fontSize).toBe(Math.round(25 * small.scale * 2) / 2);
  });

  it('the board reads the phone’s text size: the design’s digits at ×1, the bigger ones at ×1.3', async () => {
    const { view, mySeat, now } = demoBoard();
    const model = boardModel(view, mySeat, now);
    await setFontScale(1);
    await render(<Board model={model} width={tokens.size.board} />);
    const digit = () => styleOf(screen.getAllByTestId('cell-digit')[0]!);
    const wrong = () => styleOf(screen.getAllByTestId('cell-wrong')[0]!);
    expect(digit()).toMatchObject({ fontSize: 22, lineHeight: 22 });
    expect(wrong()).toMatchObject({ fontSize: 11 });

    await setFontScale(1.3);
    expect(digit()).toMatchObject({ fontSize: 25, lineHeight: 25 });
    expect(wrong()).toMatchObject({ fontSize: 12 });
    // Still capped: the system scale itself never reaches them.
    expect(screen.getAllByTestId('cell-digit')[0]).toHaveProp('maxFontSizeMultiplier', 1);
  });
});

describe('the HUD: up to ×1.35, on one line', () => {
  const locked: LockStripModel = {
    kind: 'locked',
    cell: 'F8',
    cellIndex: parseCellName('F8'),
    secondsLeft: 7,
    remainingMs: 7000,
    totalMs: 8000,
    expiresAt: null,
    paused: false,
    urgent: false,
  };

  it('the lock strip: every word, the cell and the seconds', async () => {
    await render(<LockStrip model={locked} testID="strip" />);
    const texts = hostTexts();
    expect(texts).toHaveLength(4);
    expect(capsOf(texts)).toEqual(Array(4).fill(FONT_SCALE_CAPS.hud));
    expect(texts.map((n) => n.props.numberOfLines)).toEqual([1, 1, 1, 1]);
    expect(screen.getByTestId('strip-seconds', hidden)).toHaveProp('maxFontSizeMultiplier', 1.35);
    // "בחר משבצת" too, shrinking to fit before it wraps.
    await render(<LockStrip model={{ kind: 'none' }} />);
    expect(hostTexts().map((n) => [n.props.maxFontSizeMultiplier, n.props.adjustsFontSizeToFit])).toEqual([
      [1.35, true],
    ]);
  });

  it('"ביטול בחירה"', async () => {
    await render(<CancelSelection cell="F8" onPress={jest.fn()} />);
    expect(capsOf(hostTexts())).toEqual([FONT_SCALE_CAPS.hud]);
  });

  it('the cards: names and scores; the 64 dp score of the 2-player card stays as designed', async () => {
    const view = twoPlayerView();
    await render(<PlayerCard model={cardModel(view, 'moshe', 0, NOW)} avatarId="cassette" testID="me" />);
    expect(screen.getByText('MosheG', hidden)).toHaveProp('maxFontSizeMultiplier', FONT_SCALE_CAPS.hud);
    expect(screen.getByTestId('me-score', hidden)).toHaveProp('maxFontSizeMultiplier', FONT_SCALE_CAPS.board);

    const four = fourPlayerView();
    await render(
      <PlayerCardCompact
        model={cardModel(four, 'nina', 0, NOW)}
        avatarId="cassette"
        width={84}
        testID="nina"
      />,
    );
    expect(screen.getByTestId('nina-score', hidden)).toHaveProp('maxFontSizeMultiplier', FONT_SCALE_CAPS.hud);
    const name = hostTexts().find((n) => n.props.numberOfLines === 1);
    expect(name?.props.maxFontSizeMultiplier).toBe(FONT_SCALE_CAPS.hud);
  });

  it('a score’s cap follows its size: display type stays, the rest takes the HUD’s', async () => {
    expect(scoreScale(text('scoreXL'))).toBe('board');
    expect(scoreScale(text('scoreCompact'))).toBe('hud');
    await render(
      <>
        <ScoreNumber score={12} tint="#fff" textStyle={text('scoreCompact')} testID="small" />
        <ScoreNumber score={12} tint="#fff" textStyle={text('scoreXL')} scale="hud" testID="forced" />
        <DeltaLabel
          delta={{ id: 1, value: 3.5, kind: 'gain' }}
          tint="#fff"
          textStyle={text('scoreDelta')}
          testID="delta"
        />
      </>,
    );
    expect(screen.getByTestId('small', hidden)).toHaveProp('maxFontSizeMultiplier', 1.35);
    expect(screen.getByTestId('forced', hidden)).toHaveProp('maxFontSizeMultiplier', 1.35);
    expect(screen.getByTestId('delta', hidden)).toHaveProp('maxFontSizeMultiplier', 1.35);
  });
});
