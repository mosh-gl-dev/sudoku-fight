import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { color } from '../../../theme';
import { type Setup, setUp, styleOf, wait } from '../../game/connection/testing/setup';
import { CodeInput } from '../CodeInput';
import { type CodeDigits, EMPTY_CODE } from '../friendsModel';

let env: Setup;
afterEach(() => env.restore());

/** The screen's part: it keeps the boxes. */
function Harness({
  onComplete,
  readClipboard,
  error,
}: {
  onComplete?: (code: string) => void;
  readClipboard?: () => Promise<string | null>;
  error?: string | null;
}) {
  const [digits, setDigits] = useState<CodeDigits>(EMPTY_CODE);
  return (
    <CodeInput
      digits={digits}
      onChange={setDigits}
      onComplete={onComplete}
      readClipboard={readClipboard}
      error={error}
    />
  );
}

const box = (i: number) => screen.getByTestId(`code-input-${i}`);
const values = () => [0, 1, 2, 3, 4, 5].map((i) => box(i).props.value as string);

describe('CodeInput (friends-room.md §3.3)', () => {
  beforeEach(async () => {
    env = await setUp('he');
  });

  it('is six boxes for the number pad, always left to right, each its own field for a screen reader', async () => {
    await render(<Harness />);
    expect(styleOf(screen.getByTestId('code-input-boxes'))).toMatchObject({
      direction: 'ltr',
      flexDirection: 'row',
    });
    expect(values()).toEqual(['', '', '', '', '', '']);
    expect(box(0)).toHaveProp('accessibilityLabel', 'ספרה 1 מתוך 6');
    expect(box(5)).toHaveProp('accessibilityLabel', 'ספרה 6 מתוך 6');
    expect(box(0)).toHaveProp('keyboardType', 'number-pad');
    // Three and three: a wider gap before the fourth.
    expect(styleOf(box(3)).marginStart).toBeGreaterThan(0);
    expect(styleOf(box(2)).marginStart).toBeUndefined();
  });

  it('typing fills the boxes one by one; the sixth digit completes the code', async () => {
    const onComplete = jest.fn();
    await render(<Harness onComplete={onComplete} />);
    for (const [i, d] of [...'12345'].entries()) await fireEvent.changeText(box(i), d);
    expect(values()).toEqual(['1', '2', '3', '4', '5', '']);
    expect(onComplete).not.toHaveBeenCalled();
    await fireEvent.changeText(box(5), '6');
    expect(onComplete).toHaveBeenCalledWith('123456');
  });

  it('a digit typed over one replaces it; anything but a digit is dropped', async () => {
    await render(<Harness />);
    await fireEvent.changeText(box(0), '3');
    // Its box tapped (the digit selected): the new digit alone comes in, and replaces it.
    await fireEvent.changeText(box(0), '5');
    expect(values()[0]).toBe('5');
    // The caret in front of the digit: the new one wins too.
    await fireEvent.changeText(box(0), '75');
    expect(values()[0]).toBe('7');
    await fireEvent.changeText(box(1), 'x');
    expect(values()[1]).toBe('');
  });

  it('QA: typed fast, a key that reaches a box before the focus moved on goes on to the next box', async () => {
    const onComplete = jest.fn();
    await render(<Harness onComplete={onComplete} />);
    await fireEvent.changeText(box(0), '1');
    // The "2" landed in the first box, after its "1" (it used to replace it: "12345" came out "2345").
    await fireEvent.changeText(box(0), '12');
    expect(values()).toEqual(['1', '2', '', '', '', '']);
    await fireEvent.changeText(box(2), '345');
    expect(values()).toEqual(['1', '2', '3', '4', '5', '']);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('QA: keys faster than the screen renders each build on the one before (no digit lost)', async () => {
    await render(<Harness />);
    // Both keys before the boxes render again: the second box's handler is still the old render's.
    const first = box(0).props as { onChangeText: (s: string) => void };
    const second = box(1).props as { onChangeText: (s: string) => void };
    await act(() => {
      first.onChangeText('1');
      second.onChangeText('2');
    });
    expect(values()).toEqual(['1', '2', '', '', '', '']);
  });

  it('QA: once the code is whole, another digit changes nothing (a seventh never replaces the sixth)', async () => {
    const onComplete = jest.fn();
    await render(<Harness onComplete={onComplete} />);
    for (const [i, d] of [...'918273'].entries()) await fireEvent.changeText(box(i), d);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('918273');
    // A seventh digit typed after the sixth box's own, and one typed after a middle box's digit.
    await fireEvent.changeText(box(5), '35');
    await fireEvent.changeText(box(2), '84');
    expect(values()).toEqual(['9', '1', '8', '2', '7', '3']);
    expect(onComplete).toHaveBeenCalledTimes(1);
    // A box chosen and its digit typed over (the digit selected): that is an edit, and it completes again;
    // the same digit typed over itself too (a try again).
    await fireEvent.changeText(box(5), '4');
    expect(values()).toEqual(['9', '1', '8', '2', '7', '4']);
    expect(onComplete).toHaveBeenLastCalledWith('918274');
    await fireEvent.changeText(box(5), '4');
    expect(onComplete).toHaveBeenCalledTimes(3);
  });

  it('the sixth box with a digit, the code not whole: a digit typed after it is written nowhere', async () => {
    const onComplete = jest.fn();
    await render(<Harness onComplete={onComplete} />);
    await fireEvent.changeText(box(0), '1');
    await fireEvent.changeText(box(5), '6');
    await fireEvent.changeText(box(5), '67');
    expect(values()).toEqual(['1', '', '', '', '', '6']);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('QA: a held backspace deletes digit after digit, faster than the screen renders', async () => {
    await render(<Harness />);
    for (const [i, d] of [...'12345'].entries()) await fireEvent.changeText(box(i), d);
    const fifth = box(4).props as {
      onChangeText: (s: string) => void;
      onKeyPress: (e: { nativeEvent: { key: string } }) => void;
    };
    const backspace = { nativeEvent: { key: 'Backspace' } };
    // On Android a key press comes before the text it changes: the first one clears the fifth box's digit,
    // the second one (the box now empty) goes back and clears the fourth.
    await act(() => {
      fifth.onKeyPress(backspace);
      fifth.onChangeText('');
      fifth.onKeyPress(backspace);
    });
    expect(values()).toEqual(['1', '2', '3', '', '', '']);
  });

  it('backspace in an empty box clears the one before', async () => {
    await render(<Harness />);
    await fireEvent.changeText(box(0), '1');
    await fireEvent.changeText(box(1), '2');
    await fireEvent(box(2), 'keyPress', { nativeEvent: { key: 'Backspace' } });
    expect(values()).toEqual(['1', '', '', '', '', '']);
    // Clearing a box with a digit clears it alone.
    await fireEvent.changeText(box(0), '');
    expect(values()).toEqual(['', '', '', '', '', '']);
  });

  it('a whole WhatsApp message pasted into any box finds the code in it', async () => {
    const onComplete = jest.fn();
    await render(<Harness onComplete={onComplete} />);
    await fireEvent.changeText(
      box(2),
      'בוא לשחק איתי סודוקו פייט! קוד החדר: 654321\nhttps://sudoku-fight-staging.fly.dev/r/654321',
    );
    expect(values()).toEqual(['6', '5', '4', '3', '2', '1']);
    expect(onComplete).toHaveBeenCalledWith('654321');
  });

  it('"הדבק" reads the clipboard, and says so when there is no code in it', async () => {
    const onComplete = jest.fn();
    let clip: string | null = 'Room code: 123 456';
    await render(<Harness onComplete={onComplete} readClipboard={async () => clip} />);
    expect(screen.getByText('אפשר להדביק את כל ההודעה מוואטסאפ')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'הדבק' }));
    await wait(0);
    expect(values()).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(onComplete).toHaveBeenCalledWith('123456');

    clip = 'call me at 054-123-4567';
    await fireEvent.press(screen.getByRole('button', { name: 'הדבק' }));
    await wait(0);
    expect(screen.getByTestId('code-input-error')).toHaveTextContent('לא מצאנו קוד של 6 ספרות בטקסט שהועתק');
    // Typing clears the line.
    await fireEvent.changeText(box(0), '9');
    expect(screen.queryByTestId('code-input-error')).not.toBeOnTheScreen();
  });

  it('shows the screen’s error under the boxes, in red boxes', async () => {
    await render(<Harness error="לא מצאנו חדר עם הקוד הזה." />);
    expect(screen.getByTestId('code-input-error')).toHaveTextContent('לא מצאנו חדר עם הקוד הזה.');
    for (const i of [0, 5]) expect(styleOf(box(i)).borderColor).toBe(color.input.borderError);
  });
});
