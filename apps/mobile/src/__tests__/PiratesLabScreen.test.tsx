import {
  EXPRESSIONS,
  MOTION_IDS,
  PIRATE_CAST,
  PIRATE_LOOKS,
  PIRATES,
  renderStatic,
} from '@sudoku-fight/avatars';
import { AVATAR_IDS, NO_AVATAR_ID, normalizeAvatarId } from '@sudoku-fight/protocol';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { avatarDef } from '../avatars';
import { drawnAvatarId, svgXmlsIn } from '../avatars/testing/avatarTesting';
import i18n from '../i18n';
import { BOARD_LOCKS, PiratesLabScreen } from '../screens/PiratesLabScreen';
import { useSettings } from '../state/settings';

/**
 * /dev/pirates: the Pirates, the first digit series (packages/avatars catalog/pirates/), the whole crew 1 to 9,
 * each in two looks side by side, for Moshe to judge on a phone. Since 31.10.2026 all eighteen are choosable
 * avatars too (AVATAR_IDS).
 */

const hidden = { includeHiddenElements: true };
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const xmls = (testID: string) =>
  svgXmlsIn(screen.getByTestId(testID, hidden)).map((x) => x.props.xml as string);
const byDigit = (digit: number) => PIRATE_CAST.find((c) => c.digit === digit);
const captain = byDigit(1);
const peg = byDigit(7);
/** The character switch, digit by digit, in Hebrew and English. */
const NAMES: Record<number, [he: string, en: string]> = {
  1: ['הקפטן (1)', 'The Captain (1)'],
  2: ['הגברת הפיראטית (2)', 'The Pirate Lady (2)'],
  3: ['נערת הסיפון (3)', 'The Cabin Girl (3)'],
  4: ['נער החבלים (4)', 'The Rigger Boy (4)'],
  5: ['שומר התוכי (5)', 'The Parrot Keeper (5)'],
  6: ['מלח הסיפון (6)', 'The Deckhand (6)'],
  7: ['פג רגל־עץ (7)', 'Peg-leg Peg (7)'],
  8: ['סבא הטבח (8)', 'Grandpa Cook (8)'],
  9: ['הנווטת (9)', 'The Navigator (9)'],
};

async function frames(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

/** Chooses a character and lets its switch end (the new one drawn, moving as set). */
async function choose(digit: number) {
  await fireEvent.press(screen.getByTestId(`dev-pirates-character-${digit}`));
  await frames(200);
}

async function show(onClose = jest.fn()) {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <PiratesLabScreen onClose={onClose} />
    </SafeAreaProvider>,
  );
  return onClose;
}

beforeEach(async () => {
  jest.useFakeTimers();
  await i18n.changeLanguage('he');
  useSettings.setState({ reduceMotion: 'off' });
});
afterEach(() => {
  jest.useRealTimers();
});

describe('the Pirates are choosable (31.10.2026)', () => {
  it('the contract knows all 18 ids (9 characters, 2 looks), and the app draws each one by its id', () => {
    expect(PIRATE_CAST.map((c) => c.digit)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(PIRATES).toHaveLength(18);
    for (const a of PIRATES) {
      expect(AVATAR_IDS).toContain(a.id);
      expect(normalizeAvatarId(a.id)).toBe(a.id);
      expect(normalizeAvatarId(a.id)).not.toBe(NO_AVATAR_ID);
      expect(avatarDef(a.id)).toBe(a);
    }
  });
});

describe('PiratesLabScreen (/dev/pirates)', () => {
  it('shows both looks at 96, 64, 36 and 22 px, a button for each expression and motion, and closes', async () => {
    const onClose = await show();
    expect(screen.getByRole('header', { name: 'פיראטים' })).toBeOnTheScreen();
    for (const look of PIRATE_LOOKS) {
      expect(screen.getByTestId(`dev-pirates-stage-${look}`, hidden)).toBeOnTheScreen();
      for (const px of [64, 36, 22])
        expect(screen.getByTestId(`dev-pirates-size-${px}-${look}`, hidden)).toBeOnTheScreen();
    }
    expect(screen.getAllByText('סגנון הבית').length).toBeGreaterThan(0);
    expect(screen.getAllByText('מושקע').length).toBeGreaterThan(0);
    for (const e of EXPRESSIONS) expect(screen.getByTestId(`dev-pirates-expression-${e}`)).toBeOnTheScreen();
    for (const m of MOTION_IDS) expect(screen.getByTestId(`dev-pirates-motion-${m}`)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'הבעה: חיוך' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'סגירה' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('draws the chosen character in each look, the 22 px one as the face crop', async () => {
    await show();
    await fireEvent(screen.getByTestId('dev-pirates-idle'), 'valueChange', false);
    // sleepy starts none of their moving parts: every size is one still picture
    await fireEvent.press(screen.getByTestId('dev-pirates-expression-sleepy'));
    for (const look of PIRATE_LOOKS) {
      const def = captain!.looks[look];
      expect(xmls(`dev-pirates-stage-${look}`)).toEqual([
        renderStatic(def, { size: 96, expression: 'sleepy' }),
      ]);
      expect(xmls(`dev-pirates-size-36-${look}`)).toEqual([
        renderStatic(def, { size: 36, expression: 'sleepy' }),
      ]);
      expect(xmls(`dev-pirates-size-22-${look}`)).toEqual([
        renderStatic(def, { size: 22, crop: 'head', expression: 'sleepy' }),
      ]);
    }
    // surprised opens the Captain's spyglass on the 96 px stage (a gimmick: layers); under 48 px nothing moves
    await fireEvent.press(screen.getByTestId('dev-pirates-expression-surprised'));
    for (const look of PIRATE_LOOKS) {
      expect(xmls(`dev-pirates-stage-${look}`).length).toBeGreaterThan(1);
      expect(xmls(`dev-pirates-size-36-${look}`)).toEqual([
        renderStatic(captain!.looks[look], { size: 36, expression: 'surprised' }),
      ]);
    }
    await fireEvent.press(screen.getByTestId('dev-pirates-expression-sleepy'));
    await choose(7);
    for (const look of PIRATE_LOOKS)
      expect(drawnAvatarId(xmls(`dev-pirates-stage-${look}`)[0])).toBe(peg!.looks[look].id);
  });

  it('switches between all nine characters, each with its name, both looks and a note on its moving parts', async () => {
    await show();
    await fireEvent(screen.getByTestId('dev-pirates-idle'), 'valueChange', false);
    await fireEvent.press(screen.getByTestId('dev-pirates-expression-sleepy'));
    const notes = new Set<string>();
    for (const c of PIRATE_CAST) {
      const button = screen.getByTestId(`dev-pirates-character-${c.digit}`);
      expect(screen.getByRole('button', { name: NAMES[c.digit]![0] })).toBe(button);
      await choose(c.digit);
      // under 48 px nothing moves: one still picture of the character, the 22 px one its face crop
      for (const look of PIRATE_LOOKS) {
        const def = c.looks[look];
        expect(xmls(`dev-pirates-size-36-${look}`)).toEqual([
          renderStatic(def, { size: 36, expression: 'sleepy' }),
        ]);
        expect(xmls(`dev-pirates-size-22-${look}`)).toEqual([
          renderStatic(def, { size: 22, crop: 'head', expression: 'sleepy' }),
        ]);
        expect(xmls(`dev-pirates-stage-${look}`).length).toBeGreaterThan(0);
      }
      const note = screen.getByTestId('dev-pirates-gimmicks', hidden);
      notes.add(String(note.props.children));
    }
    // a note of its own for each one
    expect(notes.size).toBe(9);
    // and the English names
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    for (const c of PIRATE_CAST)
      expect(screen.getByRole('button', { name: NAMES[c.digit]![1] })).toBe(
        screen.getByTestId(`dev-pirates-character-${c.digit}`),
      );
  });

  it('idles on the stage, plays a motion on every size, and with reduced motion only the face changes', async () => {
    useSettings.setState({ reduceMotion: 'system' });
    await show();
    // Idling: the stage's layers, not one still picture.
    expect(xmls('dev-pirates-stage-invested').length).toBeGreaterThan(1);
    await fireEvent(screen.getByTestId('dev-pirates-idle'), 'valueChange', false);
    await fireEvent.press(screen.getByTestId('dev-pirates-motion-nod'));
    await act(async () => {
      jest.advanceTimersByTime(0);
    });
    for (const id of ['dev-pirates-stage-house', 'dev-pirates-size-36-invested', 'dev-pirates-size-22-house'])
      expect(xmls(id).every((x) => drawnAvatarId(x) === null)).toBe(true);
    await act(async () => {
      jest.advanceTimersByTime(5_000);
    });
    expect(drawnAvatarId(xmls('dev-pirates-stage-house')[0])).toBe(captain!.looks.house.id);
    await fireEvent(screen.getByTestId('dev-pirates-reduce'), 'valueChange', true);
    await fireEvent.press(screen.getByTestId('dev-pirates-motion-spin'));
    await act(async () => {
      jest.advanceTimersByTime(0);
    });
    expect(xmls('dev-pirates-stage-house')).toHaveLength(1);
    expect(useSettings.getState().reduceMotion).toBe('system');
  });

  it('a new character comes in steps: the old one goes in a frame of its own, the new one comes still, then moves (B32)', async () => {
    await show();
    const stage = () => screen.queryByTestId('dev-pirates-stage-invested', hidden);
    const stepNow = () =>
      stage() === null ? 'gone' : xmls('dev-pirates-stage-invested').length === 1 ? 'still' : 'live';
    // The stage idles (its layers) as the switch starts.
    expect(stepNow()).toBe('live');
    await fireEvent.press(screen.getByTestId('dev-pirates-character-2'));
    // None of the character's avatars in the commit that deletes the old ones; the board keeps its own.
    expect(stepNow()).toBe('gone');
    expect(svgXmlsIn(screen.getByTestId('dev-pirates-stage', hidden))).toEqual([]);
    expect(svgXmlsIn(screen.getByTestId('dev-pirates-faces-invested', hidden))).toEqual([]);
    expect(xmls('dev-pirates-board-crop')).toHaveLength(BOARD_LOCKS.length);
    const steps = ['gone'];
    for (let i = 0; i < 20 && steps[steps.length - 1] !== 'live'; i++) {
      await frames(16);
      const now = stepNow();
      if (now === steps[steps.length - 1]) continue;
      steps.push(now);
      // Still: the new character's one picture at every size.
      if (now === 'still')
        expect(xmls('dev-pirates-stage-invested')).toEqual([
          renderStatic(byDigit(2)!.looks.invested, { size: 96 }),
        ]);
    }
    expect(steps).toEqual(['gone', 'still', 'live']);
    expect(drawnAvatarId(xmls('dev-pirates-size-64-house')[0])).toBe(byDigit(2)!.looks.house.id);
  });

  it('mocks the board with three opponents’ locks: the face crop beside the whole numeral', async () => {
    await show();
    for (const [board, crop] of [
      ['dev-pirates-board-crop', 'head'],
      ['dev-pirates-board-whole', 'tile'],
    ] as const) {
      expect(BOARD_LOCKS).toHaveLength(3);
      for (const lock of BOARD_LOCKS) {
        const shown = xmls(`${board}-lock-${lock.cell}`);
        expect(shown).toHaveLength(1);
        const def = byDigit(lock.digit)!.looks.invested;
        expect(drawnAvatarId(shown[0])).toBe(def.id);
        const size = Number(/width="([\d.]+)"/.exec(shown[0]!)?.[1]);
        expect(shown[0]).toBe(renderStatic(def, { size, crop }));
      }
    }
    // the wrong 7 beside Peg's lock
    expect(screen.getAllByText('7').length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByTestId('dev-pirates-board-look-house'));
    const lock = BOARD_LOCKS[0];
    expect(drawnAvatarId(xmls(`dev-pirates-board-crop-lock-${lock.cell}`)[0])).toBe(
      byDigit(lock.digit)!.looks.house.id,
    );
  });
});
