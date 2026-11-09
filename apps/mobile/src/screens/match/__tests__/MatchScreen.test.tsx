import { ManualClock, ManualScheduler } from '@sudoku-fight/engine';
import type { MatchPlayer, QueueKey } from '@sudoku-fight/protocol';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { useState } from 'react';
import { AppState, BackHandler, Platform } from 'react-native';

import { drawnAvatarId, type RenderedNode } from '../../../avatars/testing/avatarTesting';
import { ltr } from '../../../components/player/format';
import { afterFrames, RETIRE_MS } from '../../../components/ui/retire';
import { MatchmakingClient } from '../../../net/matchmaking';
import { FakeMatchEntry, FakeMatchmaking, MATCH_PLAYERS } from '../../../net/testing/fakeMatchmaking';
import { cue } from '../../../services/feedback';
import { latestRootOnly, resetLatestRootForTests } from '../../../services/latestRoot';
import { color } from '../../../theme';
import { motion } from '../../../theme/motion';
import { ANDROID_FADE_MS } from '../../../theme/transitions';
import { FALLBACK_ACTIONS_MS } from '../../FlowFallback';
import { hidden, iso, type Setup, setUp, styleOf, wait } from '../../game/connection/testing/setup';
import { FoundView } from '../FoundView';
import { handedGoCover } from '../GoCover';
import type { MatchScreenModel } from '../matchModel';
import { goHoldMs, MatchScreen, SEARCH_REOPEN_MS } from '../MatchScreen';
import { metrics } from '../metrics';

/**
 * The match screens (work plan stage 9, spec §10; Match-Search, Match-Found, Match-Countdown, Match-Timeout)
 * over a real MatchmakingClient and a fake matchmaking room: what each shows in Hebrew and English, what each
 * button does, the sounds of the flow, Android's back, and reduced motion.
 */

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../../../services/feedback', () => ({ cue: jest.fn() }));
// The UI thread's frames, as the screen waits for them (requestAnimationFrame): real ones, unless a test holds them.
jest.mock('../../../components/ui/retire', () => {
  const actual = jest.requireActual<typeof import('../../../components/ui/retire')>(
    '../../../components/ui/retire',
  );
  return { ...actual, afterFrames: jest.fn(actual.afterFrames) };
});

const cues = jest.mocked(cue);
const frames = jest.mocked(afterFrames);
const realFrames = jest.requireActual<typeof import('../../../components/ui/retire')>(
  '../../../components/ui/retire',
).afterFrames;

/**
 * The UI thread busy drawing (QA B37-still: a Galaxy A16 took up to 1.5 s over the count's first frame): no frame
 * comes until `release()`, while the JS clock and its ticks go on.
 */
function holdFrames() {
  const held: (() => void)[] = [];
  frames.mockImplementation((_count, run) => {
    held.push(run);
    return () => {
      const k = held.indexOf(run);
      if (k >= 0) held.splice(k, 1);
    };
  });
  return {
    release: async () => {
      frames.mockImplementation(realFrames);
      await act(async () => held.splice(0).forEach((run) => run()));
    },
  };
}
/** GO! before the board (motion tokens `sequence.matchFound`: the board at GO + 400). */
const GO_HOLD_MS = motion.sequence.matchFound.boardRevealAt - motion.sequence.matchFound.goAt;

/** A table of four: the two of MATCH_PLAYERS and two more. */
const FOUR_PLAYERS: MatchPlayer[] = [
  ...MATCH_PLAYERS,
  { id: 'p3', name: 'Ziv', avatarId: 'omer', country: 'FR', rating: 1250, provisional: false },
  { id: 'p4', name: 'Lea', avatarId: 'sudoku-board', country: 'US', rating: 1190, provisional: false },
];

/** Every SvgXml under an element, the hidden stacks an avatar keeps a while (LAYERS_RETIRE_MS) included. */
const svgsIn = (el: RenderedNode): RenderedNode[] => [
  ...(el.type === 'SvgXml' ? [el] : []),
  ...el.children.flatMap((c) => (typeof c === 'string' ? [] : svgsIn(c))),
];

/** The players of a 2-player table in the order they are drawn: the VS tiles (`seat`) or the countdown's (`mini`). */
const seatIds = (prefix: 'seat' | 'mini') =>
  screen
    .getAllByTestId(new RegExp(`^${prefix}-(me|opp)$`))
    .map((el) => String(el.props.testID).slice(prefix.length + 1));

let env: Setup;
let backs: jest.SpyInstance;

afterEach(() => {
  backs.mockRestore();
  env.restore();
  cues.mockClear();
  frames.mockImplementation(realFrames);
});

async function show(
  lang: 'he' | 'en' = 'he',
  reduceMotion: 'on' | 'off' = 'off',
  queueKey: QueueKey = 'normal-2p',
) {
  env = await setUp(lang, reduceMotion);
  backs = jest.spyOn(BackHandler, 'addEventListener');
  const clock = new ManualClock(1_000_000);
  const scheduler = new ManualScheduler(clock);
  const mm = new FakeMatchmaking(clock, scheduler);
  const entries: FakeMatchEntry[] = [];
  const client = new MatchmakingClient(queueKey, {
    connector: mm,
    clock,
    scheduler,
    enter: (m) => {
      const entry = new FakeMatchEntry(() => clock.now(), m.reservation);
      entries.push(entry);
      return entry;
    },
  });
  const handlers = {
    onPlay: jest.fn(),
    onLeave: jest.fn(),
    onBot: jest.fn(),
    onPractice: jest.fn(),
    onVerifyEmail: jest.fn(),
    onHome: jest.fn(),
  };
  await render(
    <MatchScreen
      match={client}
      self={{ name: 'Moshe', avatarId: 'lava-lamp' }}
      clock={clock}
      {...handlers}
    />,
  );
  await act(async () => {
    await client.start();
  });
  /** Server messages, inside act. */
  const server = async (send: () => void) => {
    await act(async () => send());
  };
  /** Moves the phone's clock (the client's) and its timers (the screen's ticks and animations). */
  const advance = async (ms: number, step = 250) => {
    for (let done = 0; done < ms; done += step) {
      const by = Math.min(step, ms - done);
      scheduler.advance(by);
      await wait(by);
    }
  };
  /** Android's back button, as the screen registered it last. */
  const back = async () => {
    const [, handler] = backs.mock.calls.at(-1)!;
    let handled = false;
    await act(async () => {
      handled = (handler as () => boolean)();
    });
    return handled;
  };
  return { client, mm, entries, handlers, server, advance, back, clock };
}

describe('Searching (Match-Search)', () => {
  it('connects, then shows what is played, the search time, my rating and the range as it widens', async () => {
    const { mm, server, advance } = await show();
    expect(screen.getByRole('header')).toHaveTextContent('מתחבר לתור…');
    expect(screen.queryByTestId('match-search-range')).not.toBeOnTheScreen();

    await server(() => mm.searching());
    expect(screen.getByTestId('match-search-header')).toHaveTextContent('מדורג · 2 שחקנים · רגיל');
    expect(screen.getByRole('header')).toHaveTextContent('מחפש יריב…');
    expect(screen.getByTestId('match-search-elapsed')).toHaveTextContent('0:00');
    expect(screen.getByTestId('match-search-radar')).toHaveAccessibleName('הדירוג שלי 1287');
    expect(screen.getByTestId('match-search-radar-rating')).toHaveTextContent('1287');
    expect(screen.getByTestId('match-search-range-value')).toHaveTextContent('⁦1237–1337⁩');
    expect(styleOf(screen.getByTestId('match-search-range-value'))).toMatchObject({
      writingDirection: 'ltr',
    });
    expect(screen.getByLabelText('טווח דירוג 1237 עד 1337')).toBeOnTheScreen();
    expect(screen.getByText('הטווח מתרחב ככל שהחיפוש נמשך')).toBeOnTheScreen();
    expect(screen.getByLabelText('מקום פנוי: מחפש יריב')).toBeOnTheScreen();
    expect(screen.getByText('נמנעים מיריבים ששיחקת מולם לאחרונה')).toBeOnTheScreen();
    // Said once as the search runs; never the seconds.
    expect(env.announced()).toEqual(['מחפש יריב בטווח דירוג 1237 עד 1337']);

    await advance(14_000, 1000);
    expect(screen.getByTestId('match-search-elapsed')).toHaveTextContent('0:14');
    expect(screen.getByTestId('match-search-elapsed')).toHaveAccessibleName('זמן חיפוש 0:14');
    await server(() => mm.searching({ elapsedMs: 15_000 }));
    expect(screen.getByTestId('match-search-range-value')).toHaveTextContent('⁦1162–1412⁩');
    // The range is shown as it widens, not said again every 5 s.
    expect(env.announced()).toEqual(['מחפש יריב בטווח דירוג 1237 עד 1337']);
  });

  it('the bar: lower ratings on the left, the band widening toward the cap, my mark in P1', async () => {
    const { mm, server } = await show();
    await server(() => mm.searching());
    const bar = screen.getByTestId('range-bar', { includeHiddenElements: true });
    expect(styleOf(bar)).toMatchObject({ direction: 'ltr', width: 240 });
    const narrow = styleOf(screen.getByTestId('range-band', { includeHiddenElements: true })).width as number;
    await server(() => mm.searching({ elapsedMs: 50_000 }));
    const wide = styleOf(screen.getByTestId('range-band', { includeHiddenElements: true })).width as number;
    expect(narrow).toBeLessThan(wide);
    expect(wide).toBe(240);
  });

  it('"ביטול חיפוש" leaves the queue and goes back', async () => {
    const { client, mm, server, handlers } = await show();
    await server(() => mm.searching());
    await fireEvent.press(screen.getByRole('button', { name: 'ביטול חיפוש' }));
    expect(mm.room.sent).toEqual([{ type: 'cancel' }]);
    expect(client.info.phase).toBe('cancelled');
    expect(handlers.onLeave).toHaveBeenCalledTimes(1);
  });

  it('Android back cancels a search', async () => {
    const { client, mm, server, back, handlers } = await show();
    await server(() => mm.searching());
    expect(await back()).toBe(true);
    expect(client.info.phase).toBe('cancelled');
    expect(handlers.onLeave).toHaveBeenCalledTimes(1);
  });

  it('cancelled: never an empty screen; should the way back not come, "לבית" after a moment', async () => {
    const { client, mm, server, handlers } = await show();
    await server(() => mm.searching());
    await fireEvent.press(screen.getByRole('button', { name: 'ביטול חיפוש' }));
    expect(client.info.phase).toBe('cancelled');
    // The route leaves at once (onLeave); here it stays, as if that got lost.
    expect(screen.getByTestId('flow-fallback')).toBeOnTheScreen();
    expect(screen.getByText('רגע…')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'לבית' })).toBeNull();
    await wait(FALLBACK_ACTIONS_MS);
    await fireEvent.press(screen.getByRole('button', { name: 'לבית' }));
    expect(handlers.onHome).toHaveBeenCalledTimes(1);
  });

  it('a match that fell through brings a new search view, not the one kept under the VS: its entrance, and what it says (review of QA loop 3)', async () => {
    const { mm, server } = await show();
    await server(() => mm.searching());
    const before = screen.getByTestId('match-search');
    await server(() => mm.found());
    await server(() => mm.matchCancelled({ requeued: true }));
    await server(() => mm.searching({ elapsedMs: 8000, requeued: true }));
    // A new one, as before the stage kept the search: its own entrance and its own line.
    expect(screen.getByTestId('match-search')).not.toBe(before);
    expect(screen.getAllByTestId('match-search', hidden)).toHaveLength(1);
    expect(env.announced().at(-1)).toBe(
      'השחקן השני לא התחבר בזמן. חזרת לראש התור. מחפש יריב בטווח דירוג 1237 עד 1337',
    );
  });

  it.each(['off', 'on'] as const)(
    'the search the screen opens on is there from its first frame (the stack fades it in); one after a fallen match fades in (QA fixcheck APK 13), reduced motion %s',
    async (reduceMotion) => {
      // Results "משחק חדש" → search, 1 of 3: the column's own fade from 0 started late, the stack's fade had
      // already taken the results away, and only "ביטול חיפוש" (outside the column) was on screen.
      const { mm, server } = await show('he', reduceMotion);
      expect(screen.getByTestId('match-search-column')).toHaveAnimatedStyle({ opacity: 1 });
      await server(() => mm.searching());
      expect(screen.getByTestId('match-search-column')).toHaveAnimatedStyle({ opacity: 1 });

      await server(() => mm.found());
      await server(() => mm.matchCancelled({ requeued: true }));
      await server(() => mm.searching({ elapsedMs: 8000, requeued: true }));
      // A change inside the screen: the new search view has its own entrance.
      expect(screen.getByTestId('match-search-column')).toHaveAnimatedStyle({ opacity: 0 });
      await wait(motion.duration.stateChange + 50);
      expect(screen.getByTestId('match-search-column')).toHaveAnimatedStyle({ opacity: 1 });
    },
  );

  it('a match that fell through: back at the head of the queue, and the screen says so', async () => {
    const { mm, server } = await show();
    await server(() => mm.searching());
    await server(() => mm.found());
    await server(() => mm.matchCancelled({ requeued: true }));
    await server(() => mm.searching({ elapsedMs: 8000, requeued: true }));
    expect(screen.getByTestId('match-search-requeued')).toHaveTextContent(
      'השחקן השני לא התחבר בזמן. חזרת לראש התור.',
    );
  });

  it('the radar sweeps around me (motion.md search.sweep), the empty seat blinks', async () => {
    const { mm, server, advance } = await show();
    await server(() => mm.searching());
    const arc = screen.getByTestId('match-search-radar-arc', { includeHiddenElements: true });
    await advance(600, 100);
    expect(arc).not.toHaveAnimatedStyle({ transform: [{ rotate: '0deg' }] });
  });
});

describe('Nobody found (Match-Timeout)', () => {
  it('says how long and in what range it searched, and offers three ways on', async () => {
    const { mm, server } = await show();
    await server(() => mm.searching());
    await server(() => mm.timeout());
    expect(screen.getByRole('header')).toHaveTextContent('עדיין לא מצאנו יריב ברמה שלך');
    expect(screen.getByTestId('match-timeout-elapsed')).toHaveTextContent('1:00');
    expect(screen.getByTestId('match-timeout-body')).toHaveTextContent(
      'חיפשנו דקה שלמה שחקנים זמינים בטווח ⁦987–1587⁩, בלי יריבים ששיחקת מולם לאחרונה. אפשר להמשיך לחפש בלי הגבלת טווח, או להתאמן מול בוט בינתיים.',
    );
    expect(screen.getByRole('button', { name: 'המשך לחפש' })).toBeOnTheScreen();
    expect(screen.getByText('בלי הגבלת טווח')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'שחק מול בוט בינתיים' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'חזרה לבית' })).toBeOnTheScreen();
    expect(env.announced().at(-1)).toMatch(/^עדיין לא מצאנו יריב ברמה שלך\. חיפשנו דקה שלמה/);
  });

  it('"המשך לחפש": the search goes on with no cap on the range', async () => {
    const { mm, server } = await show();
    await server(() => mm.searching());
    await server(() => mm.timeout());
    await fireEvent.press(screen.getByRole('button', { name: 'המשך לחפש' }));
    expect(mm.room.sent).toEqual([{ type: 'keepSearching' }]);
    await server(() => mm.searching({ elapsedMs: 60_000, extended: true }));
    expect(screen.getByRole('header')).toHaveTextContent('מחפש יריב…');
    expect(screen.getByText('בלי הגבלת טווח: הטווח ממשיך להתרחב')).toBeOnTheScreen();
    expect(screen.getByTestId('match-search-range-value')).toHaveTextContent('⁦937–1637⁩');
  });

  it('"שחק מול בוט בינתיים" and "חזרה לבית" leave the queue first', async () => {
    const first = await show();
    await first.server(() => first.mm.searching());
    await first.server(() => first.mm.timeout());
    await fireEvent.press(screen.getByRole('button', { name: 'שחק מול בוט בינתיים' }));
    expect(first.mm.room.left).toBe(true);
    expect(first.handlers.onBot).toHaveBeenCalledTimes(1);
    expect(first.handlers.onLeave).not.toHaveBeenCalled();
    first.client.close();
    env.restore();
    backs.mockRestore();

    const second = await show();
    await second.server(() => second.mm.searching());
    await second.server(() => second.mm.timeout());
    await fireEvent.press(screen.getByRole('button', { name: 'חזרה לבית' }));
    expect(second.mm.room.left).toBe(true);
    expect(second.handlers.onHome).toHaveBeenCalledTimes(1);
  });
});

describe('Nobody else is searching (the server’s nextRange is null)', () => {
  const ALONE = 'כרגע אין שחקנים אחרים שמחפשים משחק כזה';

  it('says so at once instead of the range, offers a bot, and the search (and its clock) goes on', async () => {
    const { mm, server, advance } = await show();
    await server(() => mm.searching({ nextRange: null }));
    expect(screen.getByRole('header')).toHaveTextContent('מחפש יריב…');
    expect(screen.getByTestId('match-search-alone-title')).toHaveTextContent(ALONE);
    expect(screen.getByTestId('match-search-alone-body')).toHaveTextContent(
      'ממשיכים לחפש: כשעוד שחקן יחפש משחק כזה, נמצא לך יריב כאן. אפשר גם לשחק מול בוט בינתיים.',
    );
    expect(
      screen.getByLabelText(
        `${ALONE}. ממשיכים לחפש: כשעוד שחקן יחפש משחק כזה, נמצא לך יריב כאן. אפשר גם לשחק מול בוט בינתיים.`,
      ),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'שחק מול בוט בינתיים' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'ביטול חיפוש' })).toBeOnTheScreen();
    // No range, no "widening", no "avoiding recent opponents": nobody is there to range over.
    expect(screen.queryByTestId('match-search-range')).not.toBeOnTheScreen();
    expect(screen.queryByText('הטווח מתרחב ככל שהחיפוש נמשך')).not.toBeOnTheScreen();
    expect(screen.queryByText('נמנעים מיריבים ששיחקת מולם לאחרונה')).not.toBeOnTheScreen();
    // The radar and the empty seat stay: the search goes on.
    expect(screen.getByTestId('match-search-radar')).toBeOnTheScreen();
    expect(screen.getAllByTestId('empty-seat')).toHaveLength(1);
    expect(env.announced()).toEqual([ALONE]);
    await advance(3000, 500);
    expect(screen.getByTestId('match-search-elapsed')).toHaveTextContent('0:03');
    // Said once, not again as the range widens behind the notice.
    await server(() => mm.searching({ elapsedMs: 5000, nextRange: null }));
    expect(env.announced()).toEqual([ALONE]);
  });

  it('someone turns up: the notice goes and the range is back (and said)', async () => {
    const { mm, server } = await show();
    await server(() => mm.searching({ nextRange: null }));
    await server(() => mm.searching({ elapsedMs: 15_000, nextRange: 150 }));
    expect(screen.queryByTestId('match-search-alone')).not.toBeOnTheScreen();
    expect(screen.getByTestId('match-search-range-value')).toHaveTextContent('⁦1162–1412⁩');
    expect(screen.getByText('נמנעים מיריבים ששיחקת מולם לאחרונה')).toBeOnTheScreen();
    expect(env.announced()).toEqual([ALONE, 'מחפש יריב בטווח דירוג 1162 עד 1412']);
  });

  it('a range, then nobody, then someone later: the range said is the one on the card then', async () => {
    const { mm, server } = await show();
    await server(() => mm.searching());
    const first = 'מחפש יריב בטווח דירוג 1237 עד 1337';
    expect(env.announced()).toEqual([first]);
    await server(() => mm.searching({ elapsedMs: 5000, nextRange: null }));
    expect(env.announced()).toEqual([first, ALONE]);
    await server(() => mm.searching({ elapsedMs: 15_000, nextRange: 150 }));
    expect(screen.getByTestId('match-search-range-value')).toHaveTextContent('⁦1162–1412⁩');
    expect(env.announced()).toEqual([first, ALONE, 'מחפש יריב בטווח דירוג 1162 עד 1412']);
  });

  it('"שחק מול בוט בינתיים" leaves the queue first, then the bot game', async () => {
    const { client, mm, server, handlers } = await show();
    await server(() => mm.searching({ nextRange: null }));
    await fireEvent.press(screen.getByRole('button', { name: 'שחק מול בוט בינתיים' }));
    expect(mm.room.sent).toEqual([{ type: 'cancel' }]);
    expect(mm.room.left).toBe(true);
    expect(client.info.phase).toBe('cancelled');
    expect(handlers.onBot).toHaveBeenCalledTimes(1);
    expect(handlers.onLeave).not.toHaveBeenCalled();
  });

  it('the search went on behind it: a match found meanwhile shows the VS, with its chime', async () => {
    const { mm, server } = await show();
    await server(() => mm.searching({ nextRange: null }));
    await server(() => mm.found());
    expect(screen.getByRole('header')).toHaveTextContent('נמצא יריב!');
    expect(cues).toHaveBeenCalledWith('matchFound');
  });

  it('an older server that does not say: the range as before, no notice', async () => {
    const { mm, server } = await show();
    await server(() => mm.searching({ legacy: true }));
    expect(screen.queryByTestId('match-search-alone')).not.toBeOnTheScreen();
    expect(screen.getByTestId('match-search-range-value')).toHaveTextContent('⁦1237–1337⁩');
  });

  it('a table of 3: "not enough players"', async () => {
    const { mm, server } = await show('he', 'off', 'normal-3p');
    await server(() => mm.searching({ nextRange: null }));
    expect(screen.getByTestId('match-search-alone-title')).toHaveTextContent(
      'כרגע אין מספיק שחקנים שמחפשים משחק כזה',
    );
    expect(screen.getByTestId('match-search-alone-body')).toHaveTextContent(
      'ממשיכים לחפש: כשיחפשו מספיק שחקנים, נמצא לך יריבים כאן. אפשר גם לשחק מול בוט בינתיים.',
    );
  });

  it('speaks English', async () => {
    const { mm, server } = await show('en');
    await server(() => mm.searching({ nextRange: null }));
    expect(screen.getByTestId('match-search-alone-title')).toHaveTextContent(
      'No one else is searching for this game right now',
    );
    expect(screen.getByRole('button', { name: 'Play a bot meanwhile' })).toBeOnTheScreen();
    expect(env.announced()).toEqual(['No one else is searching for this game right now']);
  });

  it('the timeout says nobody else was searching, without "no range limit"', async () => {
    const { mm, server } = await show();
    await server(() => mm.searching({ nextRange: null }));
    await server(() => mm.timeout({ nextRange: null }));
    expect(screen.getByRole('header')).toHaveTextContent('עדיין אין שחקנים אחרים שמחפשים משחק כזה');
    expect(screen.getByTestId('match-timeout-body')).toHaveTextContent(
      'חיפשנו דקה שלמה, ואף שחקן אחר לא חיפש משחק כזה. אפשר להמשיך לחכות, או להתאמן מול בוט בינתיים.',
    );
    expect(screen.queryByText('בלי הגבלת טווח')).not.toBeOnTheScreen();
    // The same three ways on.
    expect(screen.getByRole('button', { name: 'המשך לחפש' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'שחק מול בוט בינתיים' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'חזרה לבית' })).toBeOnTheScreen();
    expect(env.announced().at(-1)).toBe(
      'עדיין אין שחקנים אחרים שמחפשים משחק כזה. חיפשנו דקה שלמה, ואף שחקן אחר לא חיפש משחק כזה. אפשר להמשיך לחכות, או להתאמן מול בוט בינתיים.',
    );
    // "המשך לחפש": back to the notice until the server says otherwise.
    await fireEvent.press(screen.getByRole('button', { name: 'המשך לחפש' }));
    expect(screen.getByTestId('match-search-alone-title')).toHaveTextContent(ALONE);
  });

  it('the timeout in English, at a table of 4', async () => {
    const { mm, server } = await show('en', 'off', 'hard-4p');
    await server(() => mm.searching({ nextRange: null }));
    await server(() => mm.timeout({ nextRange: null }));
    expect(screen.getByRole('header')).toHaveTextContent(
      'Still not enough players are searching for this game',
    );
    expect(screen.getByTestId('match-timeout-body')).toHaveTextContent(
      'We searched a whole minute and not enough players looked for this game. You can keep waiting, or practice against a bot meanwhile.',
    );
    expect(screen.queryByText('No range limit')).not.toBeOnTheScreen();
  });

  it('reduced motion: the notice only fades in (no movement), and the radar stands still', async () => {
    const { mm, server, advance } = await show('he', 'on');
    await server(() => mm.searching({ nextRange: null }));
    await advance(200, 100);
    expect(screen.getByTestId('match-search-alone')).toHaveAnimatedStyle({ opacity: 1 });
    const arc = screen.getByTestId('match-search-radar-arc', { includeHiddenElements: true });
    await advance(1000, 100);
    expect(arc).toHaveAnimatedStyle({ transform: [{ rotate: '0deg' }] });
  });
});

describe('Found (Match-Found) and 3-2-1-GO (Match-Countdown)', () => {
  it('found: VS, both players with flag and rating ("זמני"), ready badges after the VS; no way out', async () => {
    const { mm, server, advance, back, client, handlers } = await show();
    await server(() => mm.searching());
    await server(() => mm.found());
    expect(cues).toHaveBeenCalledWith('matchFound');
    expect(screen.getByRole('header')).toHaveTextContent('נמצא יריב!');
    expect(screen.getByTestId('match-found-vs')).toHaveTextContent('VS');
    // Me at the start edge, across the VS from the opponent (Match-Found; my card's side in the game, §6.8).
    expect(seatIds('seat')).toEqual(['me', 'opp']);
    expect(screen.getByTestId('seat-opp')).toHaveTextContent(/NinaVolt/);
    expect(screen.getByTestId('seat-opp')).toHaveTextContent(/1305/);
    expect(screen.getByTestId('seat-opp')).toHaveTextContent(/זמני/);
    expect(screen.getByTestId('seat-me')).toHaveTextContent(/אני/);
    expect(styleOf(screen.getByTestId('seat-me'))).toMatchObject({ borderColor: color.players[0].ring });
    expect(screen.getByText('לא שיחקתם זה מול זה לאחרונה')).toBeOnTheScreen();
    expect(screen.getByText('מכאן אין ביטול: יציאה נחשבת נטישה')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'ביטול חיפוש' })).not.toBeOnTheScreen();
    expect(env.announced()).toContain(`נמצא יריב: ${iso('NinaVolt')}`);
    // The "מוכן" badges pop in 800 ms after the VS (motion.md vs.slam).
    expect(screen.queryByTestId('seat-me-ready')).not.toBeOnTheScreen();
    await server(() => mm.ready(['me']));
    await advance(800, 100);
    expect(screen.getByTestId('seat-me-ready')).toHaveTextContent('מוכן');
    expect(screen.getByTestId('seat-opp-connecting')).toHaveTextContent('מתחבר…');
    expect(screen.getByTestId('seat-opp')).toHaveAccessibleName(
      `${iso('NinaVolt')}, דירוג 1305, זמני, מתחבר…`,
    );
    expect(screen.getByTestId('match-found-status')).toHaveTextContent(/^מחכים שכולם יתחברו…/);
    expect(screen.getByTestId('match-found-status')).toHaveAccessibleName(
      'מחכים שכולם יתחברו… 1 מתוך 2 מוכנים',
    );
    expect(screen.getByTestId('match-found-count')).toHaveTextContent('1/2');
    await server(() => mm.ready(['me', 'opp']));
    expect(screen.getByTestId('match-found-status')).toHaveTextContent(/^כל השחקנים מוכנים · המשחק מתחיל/);
    // Android back from here does nothing [D32].
    expect(await back()).toBe(true);
    expect(client.info.phase).toBe('found');
    expect(handlers.onLeave).not.toHaveBeenCalled();
  });

  it('3 · 2 · 1 · GO! at the server’s time, with a beat each, then the board: open the game', async () => {
    const { mm, server, advance, entries, handlers } = await show();
    await server(() => mm.searching());
    await server(() => mm.found());
    await server(() => mm.ready(['me', 'opp']));
    cues.mockClear();
    await server(() => void mm.countdown(3000));
    const text = () => screen.getByTestId('match-countdown-step-text');
    expect(text()).toHaveTextContent('3');
    // The two players as the game will seat them: me first (Match-Countdown), then VS and the opponent.
    expect(seatIds('mini')).toEqual(['me', 'opp']);
    expect(screen.getByTestId('match-countdown-players')).toHaveTextContent(/VS/);
    expect(screen.getByText('התכוננו…')).toBeOnTheScreen();
    expect(screen.getByText('הלוח ייחשף לשניכם באותו רגע')).toBeOnTheScreen();
    expect(screen.getByTestId('ghost-board')).toHaveAccessibleName('הלוח, מוסתר עד תחילת המשחק');
    expect(styleOf(screen.getByTestId('ghost-board'))).toMatchObject({ direction: 'ltr' });
    expect(screen.getByTestId('match-countdown-step-ring')).toBeOnTheScreen();
    expect(env.announced().at(-1)).toBe('המשחק מתחיל בעוד 3 שניות');
    await advance(1000, 100);
    expect(text()).toHaveTextContent('2');
    await advance(1000, 100);
    expect(text()).toHaveTextContent('1');
    expect(env.announced().at(-1)).toBe('המשחק מתחיל בעוד שנייה אחת');
    await advance(1000, 100);
    expect(text()).toHaveTextContent('GO!');
    expect(screen.getByText('מכינים את הלוח…')).toBeOnTheScreen();
    expect(cues.mock.calls.map((c) => c[0])).toEqual([
      'countdownBeat',
      'countdownBeat',
      'countdownBeat',
      'go',
    ]);
    expect(handlers.onPlay).not.toHaveBeenCalled();

    await server(() => entries[0]!.host.set({ status: 'live', hasGame: true }));
    // GO! holds 400 ms before the board (motion.md `go`), then stays on screen while the game takes over.
    expect(handlers.onPlay).not.toHaveBeenCalled();
    await advance(GO_HOLD_MS, 100);
    expect(handlers.onPlay).toHaveBeenCalledTimes(1);
    expect(text()).toHaveTextContent('GO!');
    // GO! as drawn, handed to the game screen before it opens, to stay over the game until it is drawn (GoCover).
    expect(handedGoCover()).toMatchObject({
      kind: 'countdown',
      step: 'go',
      seats: [{ id: 'me' }, { id: 'opp' }],
    });
  });

  it('a count shown late runs its digits faster: 3 · 2 · 1 all seen, GO at the server’s time (QA B37)', async () => {
    const { mm, server, advance, entries, handlers } = await show();
    await server(() => mm.searching());
    await server(() => mm.found());
    await server(() => mm.ready(['me', 'opp']));
    cues.mockClear();
    // The count reaches the screen with 1.8 s left (its message late, or the phone busy): three digits of 600 ms.
    await server(() => void mm.countdown(1800));
    const text = () => screen.getByTestId('match-countdown-step-text');
    expect(text()).toHaveTextContent('3');
    await advance(600, 100);
    expect(text()).toHaveTextContent('2');
    await advance(600, 100);
    expect(text()).toHaveTextContent('1');
    await advance(500, 100);
    expect(text()).toHaveTextContent('1');
    await advance(100, 100);
    expect(text()).toHaveTextContent('GO!');
    expect(cues.mock.calls.map((c) => c[0])).toEqual([
      'countdownBeat',
      'countdownBeat',
      'countdownBeat',
      'go',
    ]);
    // The board comes at once after GO: GO! is seen first, and the game opens goHoldMs after GO! was drawn
    // (QA B37-still); the game screen's own fade in over GO! makes up the rest of its 400 ms (motion.md `go`).
    await advance(100, 100);
    await server(() => entries[0]!.host.set({ status: 'live', hasGame: true }));
    expect(handlers.onPlay).not.toHaveBeenCalled();
    await advance(200, 100);
    expect(handlers.onPlay).toHaveBeenCalledTimes(1);
  });

  it('GO! holds 400 ms less the game screen’s fade over it as each platform runs it, from its first drawn frame (QA B37-still)', () => {
    // iOS: the flow's own fade, 240 ms (reduced motion 200).
    expect(goHoldMs(false, 'ios')).toBe(GO_HOLD_MS - motion.duration.stateChange);
    expect(goHoldMs(true, 'ios')).toBe(GO_HOLD_MS - motion.duration.reducedFade);
    expect([goHoldMs(false, 'ios'), goHoldMs(true, 'ios')]).toEqual([160, 200]);
    // Android: react-native-screens fades in its own 150 ms, whatever the duration asked.
    expect(goHoldMs(false, 'android')).toBe(GO_HOLD_MS - ANDROID_FADE_MS);
    expect(goHoldMs(true, 'android')).toBe(GO_HOLD_MS - ANDROID_FADE_MS);
    expect(goHoldMs(false, 'android')).toBe(250);
    // The screen's own platform by default (Jest's is iOS).
    expect(goHoldMs(false)).toBe(goHoldMs(false, Platform.OS));
  });

  it('on Android the game opens 250 ms after GO! was drawn (its 150 ms fade makes up the 400)', async () => {
    const os = Platform.OS;
    Platform.OS = 'android';
    try {
      const { mm, server, advance, entries, handlers } = await show();
      await server(() => mm.searching());
      await server(() => mm.found());
      await server(() => mm.ready(['me', 'opp']));
      await server(() => void mm.countdown(3000));
      await advance(2700, 100);
      await server(() => entries[0]!.host.set({ status: 'live', hasGame: true }));
      expect(screen.getByTestId('match-countdown-step-text')).toHaveTextContent('GO!');
      // GO! drawn a couple of frames on; then 250 ms, not iOS's 160.
      await advance(200, 100);
      expect(handlers.onPlay).not.toHaveBeenCalled();
      await advance(200, 100);
      expect(handlers.onPlay).toHaveBeenCalledTimes(1);
    } finally {
      Platform.OS = os;
    }
  });

  it.each(['off', 'on'] as const)(
    'a count first drawn late (the phone still drawing it) shows 3 first, then 3 · 2 · 1 evenly to GO (QA B37-still; reduced motion %s)',
    async (reduceMotion) => {
      const { mm, server, advance } = await show('he', reduceMotion);
      await server(() => mm.searching());
      await server(() => mm.found());
      await server(() => mm.ready(['me', 'opp']));
      cues.mockClear();
      // The count's first frame takes 1.1 s to draw; the JS clock and its ticks go on meanwhile.
      const ui = holdFrames();
      await server(() => void mm.countdown(3000));
      const text = () => screen.getByTestId('match-countdown-step-text');
      await advance(1100, 100);
      // Nothing seen yet: the first digit waits for its frame instead of moving on to "2", its beat too.
      expect(text()).toHaveTextContent('3');
      expect(cues).not.toHaveBeenCalled();
      await ui.release();
      // Drawn with 1.9 s left: three digits of about 633 ms each, GO still at the server's time.
      expect(text()).toHaveTextContent('3');
      expect(cues.mock.calls.map((c) => c[0])).toEqual(['countdownBeat']);
      await advance(600, 100);
      expect(text()).toHaveTextContent('3');
      await advance(100, 100);
      expect(text()).toHaveTextContent('2');
      await advance(600, 100);
      expect(text()).toHaveTextContent('1');
      await advance(500, 100);
      expect(text()).toHaveTextContent('1');
      await advance(100, 100);
      expect(text()).toHaveTextContent('GO!');
      expect(cues.mock.calls.map((c) => c[0])).toEqual([
        'countdownBeat',
        'countdownBeat',
        'countdownBeat',
        'go',
      ]);
    },
  );

  it('a frame or two after the render is no late draw: the count keeps the server’s whole seconds', async () => {
    const { mm, server, advance } = await show();
    await server(() => mm.searching());
    await server(() => mm.found());
    await server(() => mm.ready(['me', 'opp']));
    const ui = holdFrames();
    await server(() => void mm.countdown(3000));
    await advance(100, 100);
    await ui.release();
    const text = () => screen.getByTestId('match-countdown-step-text');
    await advance(800, 100);
    expect(text()).toHaveTextContent('3');
    await advance(100, 100);
    expect(text()).toHaveTextContent('2');
    await advance(1000, 100);
    expect(text()).toHaveTextContent('1');
  });

  it.each(['off', 'on'] as const)(
    'the VS fades in over the search, the same search view fading out under it: no empty frame between them (QA loop 3; reduced motion %s)',
    async (reduceMotion) => {
      const { mm, server, advance } = await show('he', reduceMotion);
      await server(() => mm.searching());
      const search = screen.getByTestId('match-search');
      await server(() => mm.found());
      // The commit that mounts the VS (its entrance at opacity 0) still draws the search: the same view, not deleted.
      expect(screen.getByTestId('match-found')).toBeOnTheScreen();
      expect(screen.getByTestId('match-search', hidden)).toBe(search);
      expect(screen.getByTestId('match-stage-search', hidden)).not.toHaveAnimatedStyle({ opacity: 0 });
      // Out of reach of touch and screen readers from the start.
      expect(screen.queryByTestId('match-search')).not.toBeOnTheScreen();
      expect(screen.getByTestId('match-stage-search', hidden).props.pointerEvents).toBe('none');
      await advance(300, 100);
      expect(screen.getByTestId('match-stage-search', hidden)).toHaveAnimatedStyle({ opacity: 0 });
      // Unseen, it stands still (its radar's sweep stops), and goes once Reanimated let go of it (retire.ts).
      expect(screen.getByTestId('match-search-radar-arc', hidden)).toHaveAnimatedStyle({
        transform: [{ rotate: '0deg' }],
      });
      expect(screen.getByTestId('match-search', hidden)).toBe(search);
      await advance(RETIRE_MS, 250);
      expect(screen.queryByTestId('match-search', hidden)).toBeNull();
    },
  );

  it('the count gets ready unseen behind the VS once its slam has swung, before the badges pop, and the same view then counts', async () => {
    const { mm, server, advance } = await show();
    await server(() => mm.searching());
    await server(() => mm.found());
    await server(() => mm.ready(['me', 'opp']));
    expect(screen.queryByTestId('match-countdown', hidden)).toBeNull();
    // Not as the VS slams in: the count's first draw would hold the UI thread through the slam (QA K3 review).
    await advance(200, 100);
    expect(screen.queryByTestId('match-countdown', hidden)).toBeNull();
    // The VS drawn and its slam swung (metrics.vs.settleMs): then the count's players and board, behind it, before
    // the badges and the nod they bring (QA K3: the count's first draw held the UI thread through the nod).
    await advance(200, 100);
    expect(screen.queryByTestId('seat-me-ready')).not.toBeOnTheScreen();
    const count = screen.getByTestId('match-countdown', hidden);
    expect(screen.queryByTestId('match-countdown')).not.toBeOnTheScreen();
    expect(screen.getByTestId('match-stage-count', hidden)).toHaveAnimatedStyle({ opacity: 0 });
    expect(screen.getByTestId('mini-opp', hidden)).toBeTruthy();
    // No digit yet (each slams in as it is seen), and nothing said.
    expect(screen.queryByTestId('match-countdown-step', hidden)).toBeNull();
    expect(env.announced()).not.toContain('המשחק מתחיל בעוד 3 שניות');

    await server(() => void mm.countdown(3000));
    expect(screen.getByTestId('match-countdown')).toBe(count);
    expect(screen.getByTestId('match-countdown-step-text')).toHaveTextContent('3');
    expect(env.announced().at(-1)).toBe('המשחק מתחיל בעוד 3 שניות');
    await advance(300, 100);
    expect(screen.getByTestId('match-stage-count')).toHaveAnimatedStyle({ opacity: 1 });
  });

  it('the VS stays under the count, unseen and still, until the screen goes: nothing it moved goes as the count is drawn (docs/PERF.md B14/B32)', async () => {
    const { mm, server, advance, entries, handlers } = await show();
    await server(() => mm.searching());
    await server(() => mm.found());
    await server(() => mm.ready(['me', 'opp']));
    await advance(900, 100);
    const vs = screen.getByTestId('match-found');
    await server(() => void mm.countdown(3000));
    // Hidden from sight, touch and screen readers, and faded out; the same view, not a new one.
    expect(screen.queryByTestId('match-found')).not.toBeOnTheScreen();
    expect(screen.getByTestId('match-found', hidden)).toBe(vs);
    await advance(300, 100);
    expect(screen.getByTestId('match-stage-vs', hidden)).toHaveAnimatedStyle({ opacity: 0 });
    expect(screen.getByTestId('match-stage-vs', hidden).props.pointerEvents).toBe('none');
    await advance(2800, 100);
    await server(() => entries[0]!.host.set({ status: 'live', hasGame: true }));
    await advance(GO_HOLD_MS, 100);
    expect(handlers.onPlay).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('match-found', hidden)).toBe(vs);
  });

  it.each([
    ['2 players', 'normal-2p', MATCH_PLAYERS],
    ['4 players', 'fast-4p', FOUR_PLAYERS],
  ] as const)(
    'the VS under the count is frozen: a nod under way never ends in a new picture there (%s; docs/PERF.md B14/B32)',
    async (_, queueKey, players) => {
      const { mm, server, advance } = await show('he', 'off', queueKey);
      await server(() => mm.searching());
      await server(() => mm.found({ players: [...players] }));
      await server(() => mm.ready(players.map((p) => p.id)));
      // The badges pop at 800 ms, each avatar nodding as its "מוכן" shows: its moving layers, no still picture.
      await advance(900, 100);
      await server(() => void mm.countdown(3000));
      const vs = screen.getByTestId('match-found', hidden);
      for (const p of players)
        expect(
          svgsIn(screen.getByTestId(`seat-${p.id}-avatar`, hidden)).some(
            (x) => drawnAvatarId(x.props.xml) === null,
          ),
        ).toBe(true);
      const before = svgsIn(vs);
      const xmls = before.map((x) => x.props.xml);
      // Long past the nod's end (AvatarArt's timer would swap it for a new still picture) and well into the count.
      await advance(2000, 100);
      expect(screen.getByTestId('match-countdown-step-text')).toHaveTextContent('1');
      const after = svgsIn(screen.getByTestId('match-found', hidden));
      expect(after).toHaveLength(before.length);
      after.forEach((x, i) => {
        expect(x).toBe(before[i]);
        expect(x.props.xml).toBe(xmls[i]);
      });
    },
  );

  it('the "מוכן" badges pop 800 ms after "found", not after the VS mounted: a VS drawn late still shows them (QA B43)', async () => {
    env = await setUp();
    backs = jest.spyOn(BackHandler, 'addEventListener');
    const clock = new ManualClock(1_000_000);
    const foundAt = clock.now();
    const seat = (id: 'me' | 'opp', colorIndex: number) => ({
      id,
      name: id === 'me' ? 'Moshe' : 'NinaVolt',
      avatarId: 'fox' as const,
      country: 'IL',
      rating: 1250,
      provisional: false,
      isMe: id === 'me',
      colorIndex,
      ready: true,
    });
    const model: Extract<MatchScreenModel, { kind: 'found' }> = {
      kind: 'found',
      header: { gameType: 'fast', players: 2 },
      seats: [seat('me', 0), seat('opp', 1)],
      readyCount: 2,
      allReady: true,
      rematch: false,
    };
    // The phone took 500 ms to draw the VS after "found" (the Galaxy A16 of QA run 2).
    clock.advance(500);
    const settled = jest.fn();
    await render(
      <FoundView model={model} reduce={false} badgesAt={foundAt + 800} clock={clock} onSettled={settled} />,
    );
    expect(screen.queryByTestId('seat-me-ready')).not.toBeOnTheScreen();
    await wait(299);
    expect(screen.queryByTestId('seat-opp-ready')).not.toBeOnTheScreen();
    // The VS is drawn: settled now, before the badges and their nod (QA K3).
    expect(settled).toHaveBeenCalledTimes(1);
    await wait(1);
    expect(screen.getByTestId('seat-me-ready')).toHaveTextContent('מוכן');
    expect(screen.getByTestId('seat-opp-ready')).toHaveTextContent('מוכן');
    // Settled once the VS was drawn, long before the badges (QA K3): the count got ready behind it then.
    expect(settled).toHaveBeenCalledTimes(1);
    await wait(100);
    expect(settled).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['with the count, in the same batch', 'mm'],
    ['after the game room’s count, on the other connection', 'host'],
  ] as const)(
    'the last "ready" %s: the VS under the count says everyone is ready, never "מתחבר…" (QA K3, B43 1 of 5)',
    async (_, via) => {
      const { mm, server, advance, entries } = await show('he', 'on');
      await server(() => mm.searching());
      await server(() => mm.found());
      await server(() => mm.ready(['me']));
      await advance(1100, 100);
      // The whole VS: the opponent still connecting, as they were.
      expect(screen.getByTestId('seat-opp-connecting')).toHaveTextContent('מתחבר…');
      expect(screen.getByTestId('match-found-count')).toHaveTextContent('1/2');
      // The opponent gets in at the VS's very end: the server counts at once.
      if (via === 'mm') {
        await server(() => {
          mm.ready(['me', 'opp']);
          void mm.countdown(3000);
        });
      } else {
        entries[0]!.host.sync.synced = true;
        await server(() => entries[0]!.host.set({ startsAt: entries[0]!.host.serverNow() + 3000 }));
      }
      expect(screen.getByTestId('match-countdown-step-text')).toHaveTextContent('3');
      // The VS fading out under the count: everyone ready, 2/2.
      expect(screen.queryByTestId('seat-opp-connecting', hidden)).toBeNull();
      expect(screen.getByTestId('seat-opp-ready', hidden)).toHaveTextContent('מוכן');
      expect(screen.getByTestId('match-found-count', hidden)).toHaveTextContent('2/2');
      expect(screen.getByTestId('match-found-status', hidden)).toHaveTextContent(/^כל השחקנים מוכנים/);
      if (via === 'host') await server(() => mm.ready(['me', 'opp']));
      expect(screen.getByTestId('seat-opp-ready', hidden)).toBeTruthy();
    },
  );

  it('the "מוכן" badges move nothing as they pop: their place is kept from the start, and they pop in (QA K3)', async () => {
    const { mm, server, advance } = await show();
    await server(() => mm.searching());
    await server(() => mm.found());
    await server(() => mm.ready(['me', 'opp']));
    // Before the pop: an empty place of the badge's height in each tile, so the tiles keep their size.
    for (const id of ['me', 'opp'])
      expect(styleOf(screen.getByTestId(`seat-${id}-badge-slot`))).toMatchObject({
        height: metrics.badgeHeight,
      });
    await advance(800, 100);
    const badge = screen.getByTestId('seat-opp-ready');
    expect(styleOf(badge)).toMatchObject({ height: metrics.badgeHeight });
    expect(screen.queryByTestId('seat-opp-badge-slot')).toBeNull();
    // It pops in (motion.md `vs.slam`, the `pop` spring): from 0.6, fading in, then whole.
    const pop = screen.getByTestId('seat-opp-badge-pop');
    expect(pop).toHaveAnimatedStyle({ opacity: 0, transform: [{ scale: metrics.vs.badgePopFrom }] });
    await advance(1200, 100);
    expect(pop).toHaveAnimatedStyle({ opacity: 1, transform: [{ scale: 1 }] });
  });

  it('reduced motion: nothing slams, so the count gets ready behind the VS as soon as the VS is drawn', async () => {
    const { mm, server, advance } = await show('he', 'on');
    await server(() => mm.searching());
    await server(() => mm.found());
    await server(() => mm.ready(['me', 'opp']));
    await advance(100, 100);
    expect(screen.getByTestId('match-countdown', hidden)).toBeTruthy();
  });

  it('"ready" changes the status line, never the VS’s height: the other line keeps its place, unseen and unread (QA K3)', async () => {
    const { mm, server } = await show();
    await server(() => mm.searching());
    await server(() => mm.found());
    await server(() => mm.ready(['me']));
    const spare = () => screen.getByTestId('match-found-status-spare', hidden);
    // Both lines, side by side, the spare pulled back over the shown one: the row is as tall as the taller.
    expect(spare()).toHaveTextContent('כל השחקנים מוכנים · המשחק מתחיל');
    expect(styleOf(spare())).toMatchObject({ width: '100%', marginStart: '-100%', opacity: 0 });
    expect(screen.queryByTestId('match-found-status-spare')).toBeNull();
    await server(() => mm.ready(['me', 'opp']));
    expect(spare()).toHaveTextContent('מחכים שכולם יתחברו…');
    expect(screen.getByTestId('match-found-status')).toHaveAccessibleName(
      /^כל השחקנים מוכנים · המשחק מתחיל\.? 2 מתוך 2 מוכנים$/,
    );
  });

  it('reduced motion: the badges are there with the VS, whole, nothing popping', async () => {
    const { mm, server } = await show('he', 'on');
    await server(() => mm.searching());
    await server(() => mm.found());
    await server(() => mm.ready(['me', 'opp']));
    expect(screen.getByTestId('seat-opp-ready')).toBeOnTheScreen();
    expect(screen.getByTestId('seat-opp-badge-pop')).toHaveAnimatedStyle({
      opacity: 1,
      transform: [{ scale: 1 }],
    });
  });

  it('the board before the phone’s own GO: GO! still shows, and holds, before the game', async () => {
    const { mm, server, advance, entries, handlers } = await show();
    await server(() => mm.searching());
    await server(() => mm.found());
    await server(() => mm.ready(['me', 'opp']));
    await server(() => void mm.countdown(3000));
    await advance(2700, 100);
    expect(screen.getByTestId('match-countdown-step-text')).toHaveTextContent('1');
    await server(() => entries[0]!.host.set({ status: 'live', hasGame: true }));
    expect(screen.getByTestId('match-countdown-step-text')).toHaveTextContent('GO!');
    expect(handlers.onPlay).not.toHaveBeenCalled();
    await advance(GO_HOLD_MS, 100);
    expect(handlers.onPlay).toHaveBeenCalledTimes(1);
  });
});

describe('a table of 3–4 (stage 10)', () => {
  const FOUR: MatchPlayer[] = [
    ...MATCH_PLAYERS,
    { id: 'p3', name: 'Ziv', avatarId: 'omer', country: 'FR', rating: 1250, provisional: false },
    { id: 'p4', name: 'Lea', avatarId: 'sudoku-board', country: 'US', rating: 1190, provisional: false },
  ];
  /** The seats' tiles (or the countdown's columns) in the order they are drawn. */
  const order = (prefix: 'seat' | 'mini') =>
    screen
      .getAllByTestId(new RegExp(`^${prefix}-(me|opp|p3|p4)$`))
      .map((el) => String(el.props.testID).slice(prefix.length + 1));

  it('searches three seats, then shows all four players (me first) and counts down with all four', async () => {
    const { mm, server, advance } = await show('he', 'off', 'fast-4p');
    await server(() => mm.searching());
    expect(screen.getByTestId('match-search-header')).toHaveTextContent('מדורג · 4 שחקנים · מהיר');
    expect(screen.getByRole('header')).toHaveTextContent('מחפש יריבים…');
    expect(screen.getAllByTestId('empty-seat')).toHaveLength(3);
    expect(env.announced()).toEqual(['מחפש יריבים בטווח דירוג 1237 עד 1337']);

    // Found: "נמצאו יריבים!", a grid in the game's order, me in P1's colour.
    await server(() => mm.found({ players: FOUR }));
    expect(screen.getByRole('header')).toHaveTextContent('נמצאו יריבים!');
    expect(screen.queryByTestId('match-found-vs')).not.toBeOnTheScreen();
    expect(order('seat')).toEqual(['me', 'opp', 'p3', 'p4']);
    expect(styleOf(screen.getByTestId('seat-me'))).toMatchObject({ borderColor: color.players[0].ring });
    for (const [id, name, rating] of [
      ['p3', 'Ziv', 1250],
      ['p4', 'Lea', 1190],
    ] as const) {
      expect(screen.getByTestId(`seat-${id}`)).toHaveTextContent(new RegExp(`${name}.*${rating}`));
    }
    expect(env.announced()).toContain(`נמצאו יריבים: ${iso('NinaVolt')}, ${iso('Ziv')}, ${iso('Lea')}`);
    await server(() => mm.ready(['me', 'opp', 'p3']));
    await advance(800, 100);
    expect(screen.getByTestId('match-found-count')).toHaveTextContent('3/4');
    expect(screen.getByTestId('seat-p4-connecting')).toBeOnTheScreen();
    expect(screen.getByTestId('match-found-status')).toHaveAccessibleName(
      'מחכים שכולם יתחברו… 3 מתוך 4 מוכנים',
    );

    // One of them never came: back at the head of the queue, and the line says "one of the players".
    await server(() => mm.matchCancelled({ requeued: true, missing: ['p4'] }));
    await server(() => mm.searching({ elapsedMs: 9000, requeued: true }));
    expect(screen.getByTestId('match-search-requeued')).toHaveTextContent(
      'אחד השחקנים לא התחבר בזמן. חזרת לראש התור.',
    );

    // Found again; everyone in: 3 · 2 · 1 with the four across the top, no "VS" between them.
    await server(() => mm.found({ players: FOUR, matchId: 'match-2' }));
    await server(() => mm.ready(['me', 'opp', 'p3', 'p4'], 'match-2'));
    await server(() => void mm.countdown(3000, 'match-2'));
    expect(screen.getByTestId('match-countdown-step-text')).toHaveTextContent('3');
    expect(order('mini')).toEqual(['me', 'opp', 'p3', 'p4']);
    expect(within(screen.getByTestId('match-countdown-players')).queryByText('VS')).not.toBeOnTheScreen();
    expect(screen.getByTestId('mini-p4')).toHaveTextContent(/Lea.*1190/);
    expect(screen.getByText('הלוח ייחשף לכולם באותו רגע')).toBeOnTheScreen();
  });

  it('the timeout says there are not enough opponents yet', async () => {
    const he = await show('he', 'off', 'normal-3p');
    await he.server(() => he.mm.searching());
    expect(screen.getByRole('header')).toHaveTextContent('מחפש יריבים…');
    expect(screen.getAllByTestId('empty-seat')).toHaveLength(2);
    await he.server(() => he.mm.timeout());
    expect(screen.getByRole('header')).toHaveTextContent('עדיין לא מצאנו מספיק יריבים ברמה שלך');
    expect(screen.getByTestId('match-timeout-header')).toHaveTextContent('מדורג · 3 שחקנים · רגיל');
  });

  it('speaks English at a table of three', async () => {
    const en = await show('en', 'off', 'normal-3p');
    await en.server(() => en.mm.searching());
    expect(screen.getByRole('header')).toHaveTextContent('Finding opponents…');
    await en.server(() => en.mm.found({ players: FOUR.slice(0, 3) }));
    expect(screen.getByRole('header')).toHaveTextContent('Opponents found!');
    expect(env.announced()).toContain(`Opponents found: ${iso('NinaVolt')}, ${iso('Ziv')}`);
    await en.server(() => en.mm.matchCancelled({ requeued: true, missing: ['p3'] }));
    await en.server(() => en.mm.searching({ elapsedMs: 9000, requeued: true }));
    expect(screen.getByTestId('match-search-requeued')).toHaveTextContent(
      "A player didn't connect in time. You're back at the head of the queue.",
    );
    await en.server(() => en.mm.timeout());
    expect(screen.getByRole('header')).toHaveTextContent('Not enough opponents at your level yet');
  });
});

describe('A failure', () => {
  it('explains it with the support code, and offers to search again, to practise, or home', async () => {
    const { client, mm, handlers } = await show();
    mm.refuse = FakeMatchmaking.refusal('alreadyQueued');
    await act(async () => {
      await client.retry();
    });
    expect(screen.getByRole('header')).toHaveTextContent('החיפוש נעצר');
    expect(screen.getByTestId('match-error-body')).toHaveTextContent(
      'כבר יש לך חיפוש או משחק מדורג פעיל, אולי במכשיר אחר.',
    );
    expect(screen.getByTestId('match-error-code')).toHaveAccessibleName(
      `קוד שגיאה: ${ltr('ERR_ALREADY_QUEUED · 4215')}`,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'חפש שוב' }));
    expect(mm.joins).toHaveLength(3);
    expect(screen.getByRole('header')).toHaveTextContent('מתחבר לתור…');

    mm.offline = true;
    await act(async () => {
      await client.retry();
    });
    expect(screen.getByRole('header')).toHaveTextContent('אין חיבור לשרת');
    expect(screen.getByTestId('match-error-body')).toHaveTextContent(
      'לא הצלחנו להגיע לשרת המשחק. בדוק את החיבור ונסה שוב.',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'עבור לאימון' }));
    expect(handlers.onPractice).toHaveBeenCalledTimes(1);
  });
});

describe('English (LTR)', () => {
  it('searching, the timeout and the VS speak English', async () => {
    const { mm, server } = await show('en');
    await server(() => mm.searching());
    expect(screen.getByTestId('match-search-header')).toHaveTextContent('Ranked · 2 players · Normal');
    expect(screen.getByRole('header')).toHaveTextContent('Finding an opponent…');
    expect(screen.getByLabelText('Rating range 1237 to 1337')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Cancel search' })).toBeOnTheScreen();
    await server(() => mm.timeout());
    expect(screen.getByRole('header')).toHaveTextContent('No opponent at your level yet');
    expect(screen.getByRole('button', { name: 'Keep searching' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Play a bot meanwhile' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Keep searching' }));
    await server(() => mm.searching({ elapsedMs: 60_000, extended: true }));
    await server(() => mm.found());
    expect(screen.getByRole('header')).toHaveTextContent('Opponent found!');
    expect(screen.getByText("You haven't played each other lately")).toBeOnTheScreen();
    await server(() => void mm.countdown(3000));
    expect(screen.getByText('Get ready…')).toBeOnTheScreen();
    expect(screen.getByText('The board appears for both of you at the same moment')).toBeOnTheScreen();
  });

  it('a failure speaks English', async () => {
    const { client, mm } = await show('en');
    mm.refuse = FakeMatchmaking.refusal('queueClosed');
    await act(async () => {
      await client.retry();
    });
    expect(screen.getByRole('header')).toHaveTextContent('The search stopped');
    expect(screen.getByTestId('match-error-body')).toHaveTextContent("This queue isn't open yet.");
    expect(screen.getByTestId('match-error-code')).toHaveAccessibleName(
      `Error code: ${ltr('ERR_QUEUE_CLOSED · 4215')}`,
    );
    expect(screen.getByRole('button', { name: 'Search again' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Go to practice' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Back home' })).toBeOnTheScreen();
  });
});

describe('reduced motion (spec §22)', () => {
  it('the radar stands still (the time still runs), the badges show at once, no ring around the digits', async () => {
    const { mm, server, advance } = await show('he', 'on');
    await server(() => mm.searching());
    const arc = screen.getByTestId('match-search-radar-arc', { includeHiddenElements: true });
    await advance(1200, 100);
    expect(arc).toHaveAnimatedStyle({ transform: [{ rotate: '0deg' }] });
    expect(screen.getByTestId('match-search-elapsed')).toHaveTextContent('0:01');

    await server(() => mm.found());
    await server(() => mm.ready(['me']));
    expect(screen.getByTestId('seat-me-ready')).toBeOnTheScreen();

    await server(() => void mm.countdown(3000));
    expect(screen.getByTestId('match-countdown-step-text')).toHaveTextContent('3');
    expect(screen.queryByTestId('match-countdown-step-ring')).not.toBeOnTheScreen();
  });
});

describe('the screen going while searching (QA density-change-orphans-ranked-game, the review of its fix)', () => {
  it('left by the player, the app in front: the search is left (as before)', async () => {
    const { client, mm, server } = await show();
    await server(() => mm.searching());
    await screen.unmount();
    await wait(0);
    expect(mm.room.sent).toEqual([{ type: 'cancel' }]);
    expect(client.info.phase).toBe('cancelled');
  });

  it('gone with its React root (Android paused, then recreated the activity): the search goes on', async () => {
    const { client, mm, server } = await show();
    await server(() => mm.searching());
    // The activity's pause reached AppState before its surface's stop unmounted the tree.
    // (The test environment's AppState holds a mock function there: set the value, then put it back.)
    const appState = AppState as { currentState: unknown };
    const was = appState.currentState;
    appState.currentState = 'background';
    try {
      await screen.unmount();
    } finally {
      appState.currentState = was;
    }
    await wait(0);
    expect(mm.room.sent).toEqual([]);
    expect(client.info.phase).toBe('searching');
  });

  it('gone because a newer root took over (latestRootOnly): the search goes on', async () => {
    env = await setUp('he', 'off');
    backs = jest.spyOn(BackHandler, 'addEventListener');
    resetLatestRootForTests();
    const clock = new ManualClock(1_000_000);
    const scheduler = new ManualScheduler(clock);
    const mm = new FakeMatchmaking(clock, scheduler);
    const client = new MatchmakingClient('normal-2p', {
      connector: mm,
      clock,
      scheduler,
      enter: (m) => new FakeMatchEntry(() => clock.now(), m.reservation),
    });
    const noop = () => undefined;
    let first = true;
    const Root = latestRootOnly(function App() {
      // The first root draws the search; the newer one anything (here: nothing).
      const [mine] = useState(() => {
        const was = first;
        first = false;
        return was;
      });
      if (!mine) return null;
      return (
        <MatchScreen
          match={client}
          self={{ name: 'Moshe', avatarId: 'lava-lamp' }}
          clock={clock}
          onPlay={noop}
          onLeave={noop}
          onBot={noop}
          onPractice={noop}
          onVerifyEmail={noop}
          onHome={noop}
        />
      );
    });
    await render(<Root />);
    await act(async () => {
      await client.start();
    });
    await act(async () => mm.searching());
    expect(screen.getByRole('header')).toHaveTextContent('מחפש יריב…');
    // The recreated activity's root mounts: the older one renders nothing from then on.
    await render(<Root />);
    await wait(0);
    expect(mm.room.sent).toEqual([]);
    expect(client.info.phase).toBe('searching');
    resetLatestRootForTests();
  });
});

describe('the search through a recreated activity (QA density-change-cancels-ranked-search)', () => {
  /**
   * The app's root (latestRootOnly) drawing the real MatchScreen over a real MatchmakingClient, as the app's
   * entry wraps it: each root drawn while `searchShown()` says so.
   */
  async function rooted(searchShown: () => boolean) {
    env = await setUp('he', 'off');
    backs = jest.spyOn(BackHandler, 'addEventListener');
    resetLatestRootForTests();
    const clock = new ManualClock(1_000_000);
    const scheduler = new ManualScheduler(clock);
    const mm = new FakeMatchmaking(clock, scheduler);
    const client = new MatchmakingClient('normal-2p', {
      connector: mm,
      clock,
      scheduler,
      enter: (m) => new FakeMatchEntry(() => clock.now(), m.reservation),
    });
    const noop = () => undefined;
    const Root = latestRootOnly(function App() {
      const [mine] = useState(searchShown);
      if (!mine) return null;
      return (
        <MatchScreen
          match={client}
          self={{ name: 'Moshe', avatarId: 'lava-lamp' }}
          clock={clock}
          onPlay={noop}
          onLeave={noop}
          onBot={noop}
          onPractice={noop}
          onVerifyEmail={noop}
          onHome={noop}
        />
      );
    });
    await render(<Root />);
    await act(async () => {
      await client.start();
    });
    await act(async () => mm.searching());
    expect(screen.getByRole('header')).toHaveTextContent('מחפש יריב…');
    return { client, mm, Root };
  }

  afterEach(() => resetLatestRootForTests());

  it('the old surface stopped after the new activity resumed (AppState active, no newer root yet): the search goes on, and the new root shows it', async () => {
    const { client, mm, Root } = await rooted(() => true);
    // Android paused, destroyed and created the activity in one go; React got to the old surface's stop (a
    // scheduled render) only after the resume put AppState back to 'active', before the new root mounted.
    expect(AppState.currentState).not.toBe('background');
    await screen.unmount();
    await wait(0);
    expect(mm.room.sent).toEqual([]);
    expect(client.info.phase).toBe('searching');
    // The new root (game/liveFlow.ts sends it to /match) shows the same search; long after, it still runs.
    await render(<Root />);
    expect(screen.getByRole('header')).toHaveTextContent('מחפש יריב…');
    await wait(SEARCH_REOPEN_MS + 1000);
    expect(mm.room.sent).toEqual([]);
    expect(client.info.phase).toBe('searching');
    // And the player can still call it off there.
    fireEvent.press(screen.getByRole('button', { name: 'ביטול חיפוש' }));
    expect(mm.room.sent).toEqual([{ type: 'cancel' }]);
  });

  it('the root went and no screen shows the search again (the task removed, the process alive): it is left after SEARCH_REOPEN_MS', async () => {
    let first = true;
    const { client, mm, Root } = await rooted(() => {
      const was = first;
      first = false;
      return was;
    });
    await screen.unmount();
    await wait(SEARCH_REOPEN_MS - 100);
    expect(mm.room.sent).toEqual([]);
    expect(client.info.phase).toBe('searching');
    // A new root that shows something else (Home, a link) does not keep it alive.
    await render(<Root />);
    await wait(200);
    expect(mm.room.sent).toEqual([{ type: 'cancel' }]);
    expect(client.info.phase).toBe('cancelled');
  });
});
