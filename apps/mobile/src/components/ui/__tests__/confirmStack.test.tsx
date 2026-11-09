import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import i18n from '../../../i18n';
import { useSettings } from '../../../state/settings';
import { size, space, tokens } from '../../../theme';
import { buttonLabelInset, buttonLabelStyle, LARGE_TEXT_SCALE } from '../Button';
import { ConfirmModal, forgetLabelWidths, stacksActions } from '../ConfirmModal';
import { SLANT } from '../slant';
import { expectFits, expectRoom, layoutLanguages, PHONE, setWindow, widthIn } from '../testing/layout';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../../../services/feedback', () => ({ cue: jest.fn() }));

/**
 * QA loop 3: Settings → "מחיקת חשבון" → "המשך למחיקה": the red "מחק את החשבון לצמיתות" beside "ביטול" shrank to
 * about a third of its size (Android's adjustsFontSizeToFit has no floor). A label that doesn't fit its share
 * of the row now puts the two actions one above the other, each the whole width, at the normal size.
 */

const HIDDEN = { includeHiddenElements: true };
const styleOf = (el: { props: { style?: unknown } }) => StyleSheet.flatten(el.props.style as ViewStyle) ?? {};
const layout = (width: number) => ({ nativeEvent: { layout: { x: 0, y: 0, width, height: 24 } } });

/** The centred dialog's actions row on a 360 dp phone: min(342, 360 − 48), less its padding of 20 each side. */
const CENTER_ROW =
  Math.min(tokens.layout.screenWidthRef, PHONE.width) - 2 * tokens.layout.gutterHome - 2 * space[9];
/** The in-game sheet's row: the whole width, less its padding of 24 each side. */
const BOTTOM_ROW = PHONE.width - 2 * space[10];
const GAP = space[6];

describe('stacksActions', () => {
  const danger = (confirm: number | undefined, cancel = 40) => [
    { labelWidth: cancel, inset: buttonLabelInset('primary'), flex: 1.4 },
    { labelWidth: confirm, inset: buttonLabelInset('danger'), flex: 1 },
  ];

  it('the 360 dp phone gives the centred dialog a 272 dp row', () => {
    expect(CENTER_ROW).toBe(272);
  });

  it('stacks the delete dialog: a 190 dp label in a 108 dp share (the QA case)', () => {
    expect(stacksActions(CENTER_ROW, GAP, danger(190))).toBe(true);
  });

  it('keeps a short pair side by side ("ביטול" | "כן, להיכנע")', () => {
    expect(stacksActions(CENTER_ROW, GAP, danger(70))).toBe(false);
  });

  it('decides nothing before the row and the labels are measured', () => {
    expect(stacksActions(0, GAP, danger(500))).toBe(false);
    expect(stacksActions(CENTER_ROW, GAP, danger(undefined, undefined))).toBe(false);
  });

  it('a notice has the whole row for its one action', () => {
    const one = [{ labelWidth: 200, inset: buttonLabelInset('primary'), flex: 1.5 }];
    expect(stacksActions(CENTER_ROW, GAP, one)).toBe(false);
    expect(stacksActions(CENTER_ROW, GAP, [{ ...one[0]!, labelWidth: 260 }])).toBe(true);
  });
});

describe('ConfirmModal: actions that do not fit side by side go one above the other', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('he');
    useSettings.setState({ reduceMotion: 'off' });
    forgetLabelWidths();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  const deleteDialog = () => (
    <ConfirmModal
      visible
      placement="center"
      tone="danger"
      icon="key"
      title="אישור בסיסמה"
      body="כדי למחוק את החשבון, כתוב את הסיסמה."
      confirmLabel="מחק את החשבון לצמיתות"
      onConfirm={jest.fn()}
      onCancel={jest.fn()}
      testID="del"
    />
  );

  /** What the phone would report: the row's width and each label's own width on one line. */
  async function lay(row: number, cancel: number, confirm: number) {
    await fireEvent(screen.getByTestId('del-actions'), 'layout', layout(row));
    await fireEvent(screen.getByTestId('del-measure-cancel', HIDDEN), 'layout', layout(cancel));
    await fireEvent(screen.getByTestId('del-measure-confirm', HIDDEN), 'layout', layout(confirm));
  }

  it('measures each label in its own button style, hidden from screen readers and touches', async () => {
    await render(deleteDialog());
    expect(styleOf(screen.getByTestId('del-measure-confirm', HIDDEN))).toMatchObject(
      buttonLabelStyle('danger', 'modal') as TextStyle,
    );
    expect(styleOf(screen.getByTestId('del-measure-cancel', HIDDEN))).toMatchObject(
      buttonLabelStyle('primary', 'modal') as TextStyle,
    );
    // Not a second copy for a screen reader or a test that reads the dialog.
    expect(screen.getAllByText('מחק את החשבון לצמיתות')).toHaveLength(1);
    expect(screen.getAllByRole('button').map((b) => b.props.accessibilityLabel)).toEqual([
      'ביטול',
      'מחק את החשבון לצמיתות',
    ]);
  });

  it('the hidden copies are drawn off the screen, and gone once measured: no second text over the buttons', async () => {
    // The QA agent finds a control by its text in a uiautomator dump (the first match): a copy of "ביטול" lying
    // over the red button would send its tap to the wrong action.
    await render(deleteDialog());
    const layer = styleOf(screen.getByTestId('del-measure', HIDDEN));
    expect(layer.opacity).toBe(0);
    expect(layer.transform).toEqual([{ translateY: expect.any(Number) as number }]);
    expect((layer.transform as { translateY: number }[])[0]!.translateY).toBeLessThanOrEqual(-5000);
    await lay(CENTER_ROW, 40, 190);
    expect(screen.queryByTestId('del-measure', HIDDEN)).toBeNull();
    expect(screen.getAllByText('ביטול', HIDDEN)).toHaveLength(1);
    expect(screen.getAllByText('מחק את החשבון לצמיתות', HIDDEN)).toHaveLength(1);
  });

  it('the same labels open stacked on their first frame the next time (no row-to-column jump)', async () => {
    const first = await render(deleteDialog());
    await lay(CENTER_ROW, 40, 190);
    await first.unmount();
    await render(deleteDialog());
    expect(screen.queryByTestId('del-measure', HIDDEN)).toBeNull();
    // Only the row's own width is laid out again; the labels' widths are known.
    await fireEvent(screen.getByTestId('del-actions'), 'layout', layout(CENTER_ROW));
    expect(styleOf(screen.getByTestId('del-actions')).flexDirection).toBe('column');
  });

  it('side by side while both fit: flex shares, the red one skewed with the gold one', async () => {
    await render(deleteDialog());
    await lay(CENTER_ROW, 40, 70);
    expect(styleOf(screen.getByTestId('del-actions')).flexDirection).toBe('row');
    expect(styleOf(screen.getByTestId('del-confirm')).flex).toBe(1);
    expect(styleOf(screen.getByTestId('del-confirm-face-shape')).transform).toEqual(SLANT.inner);
  });

  it('the long red label stacks them: the whole width each, upright, the label at its own size', async () => {
    await render(deleteDialog());
    // Side by side it shrank: one line, adjustsFontSizeToFit.
    expect(screen.getByTestId('del-confirm-label')).toHaveProp('adjustsFontSizeToFit', true);
    await lay(CENTER_ROW, 40, 190);
    expect(styleOf(screen.getByTestId('del-actions')).flexDirection).toBe('column');
    for (const id of ['del-cancel', 'del-confirm'])
      expect(styleOf(screen.getByTestId(id)).flex).toBeUndefined();
    // The pair rule is for a row only: the red outline stands upright under the gold "ביטול" (no slanted plate).
    expect(screen.queryByTestId('del-confirm-face-shape')).toBeNull();
    const [first, second] = screen.getAllByRole('button');
    expect(first).toHaveAccessibleName('ביטול');
    expect(second).toHaveAccessibleName('מחק את החשבון לצמיתות');
    // Never drawn smaller than the button's text: a label too long for the whole width takes a second line,
    // and the button grows from its height to hold it.
    const label = screen.getByTestId('del-confirm-label');
    expect(label).toHaveProp('numberOfLines', 2);
    expect(label.props.adjustsFontSizeToFit).toBeUndefined();
    expect(styleOf(screen.getByTestId('del-confirm'))).toMatchObject({ minHeight: size.buttonModal });
  });

  it.each([1, LARGE_TEXT_SCALE, 2])('the same at text scale %d', async (fontScale) => {
    const restore = setWindow({ ...PHONE, fontScale });
    try {
      await render(deleteDialog());
      await lay(CENTER_ROW, 60 * fontScale, 190 * fontScale);
      expect(styleOf(screen.getByTestId('del-actions')).flexDirection).toBe('column');
      expect(screen.getByTestId('del-confirm-label')).toHaveProp('numberOfLines', 2);
      expect(screen.getByTestId('del-cancel-label')).toHaveProp('numberOfLines', 2);
    } finally {
      await restore();
    }
  });

  it('a notice shows its one action, which takes the first focus', async () => {
    await render(
      <ConfirmModal
        visible
        placement="center"
        notice
        title="צריך כניסה עם Google"
        confirmLabel="הבנתי"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        testID="note"
      />,
    );
    expect(screen.getAllByRole('button').map((b) => b.props.accessibilityLabel)).toEqual(['הבנתי']);
    expect(screen.queryByTestId('note-cancel')).toBeNull();
    expect(screen.queryByTestId('note-measure-cancel', HIDDEN)).toBeNull();
  });
});

/** Words wrapped greedily into lines no wider than `room`; a script without spaces breaks anywhere. */
function wrappedLines(words: readonly string[], room: number, width: (line: string) => number): number {
  let lines = 1;
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (width(next) <= room || !line) line = next;
    else {
      lines++;
      line = word;
    }
  }
  return lines;
}

describe("the account dialogs' labels fit the whole width once stacked, at their own size (every language)", () => {
  /** A stacked action: the row less the face's padding on both sides. */
  const room = (variant: 'primary' | 'danger', row: number) => row - 2 * buttonLabelInset(variant);

  it.each(layoutLanguages())('in two lines at most, no word cut (%s)', async (lang) => {
    await i18n.changeLanguage(lang);
    const fits = (key: string, variant: 'primary' | 'danger', row = CENTER_ROW) => {
      const style = buttonLabelStyle(variant, 'modal');
      const width = (line: string) =>
        widthIn(lang, line, {
          fontFamily: style.fontFamily,
          fontWeight: style.fontWeight,
          fontSize: style.fontSize!,
        });
      const label = i18n.t(key);
      const space = room(variant, row);
      const words = label.split(' ');
      const longest = Math.max(...words.map(width));
      if (words.length === 1) expectRoom(lang, key, width(label), 2 * space);
      else {
        expectRoom(lang, `${key} (its longest word)`, longest, space);
        expectFits(lang, `${key} in two lines`, wrappedLines(words, space, width) <= 2);
      }
    };
    fits('account:settings.deleteSubmit', 'danger');
    fits('account:settings.deleteGoogleSubmit', 'danger');
    fits('account:settings.deleteContinue', 'danger');
    fits('account:settings.deleteGoogleOffOk', 'primary');
    fits('account:settings.signOut', 'primary');
    fits('ui:modal.cancel', 'primary');
    expect(BOTTOM_ROW).toBeGreaterThan(CENTER_ROW);
  });
});
