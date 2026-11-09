/* eslint-disable @typescript-eslint/no-require-imports -- the modules below are loaded again with the flag on */
import type * as Rntl from '@testing-library/react-native';
import type * as ReactNative from 'react-native';

import type * as HomeEntrance from '../../../screens/home/homeEntrance';
import type * as Settings from '../../../state/settings';
import type * as EnterModule from '../Enter';

/**
 * B46 with Reanimated's settled-props sync on, as in the app (FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS; Reanimated
 * turns it off under Jest, so the modules are loaded again here with it on). Natively, every 500 ms, what the UI
 * thread last drew on a view that has stood still for 1 to 2 s is handed back to React, as settled props laid over
 * the view's own style for good; past 2 s it is dropped unsynced. Jest has no native registry: `settle` plays that
 * sync by hand, with what the view's animated style last drew, when one is on it.
 *
 * The case: Home's parts held under the Splash while the sign-in loads (JS idle: whatever Reanimated drew on them
 * then is synced back), the entrance's end dropped unsynced (JS busy after the restart for a new direction), then
 * the account arriving: the card must stay opaque.
 *
 * The native registry is played too (`registryOf`): what the UI thread last wrote for a view while an animated
 * style was on it; once the style comes off, nothing writes there again. And the UI thread can stall (`stallUi`):
 * no frame runs while JS timers still do, as on a phone drawing a screen's first frame (History's cards, Home after a
 * cold start or the restart for a new direction).
 */

jest.mock('react-native-reanimated/lib/module/featureFlags', () => {
  const actual = jest.requireActual<{ getStaticFeatureFlag: (name: string) => boolean }>(
    'react-native-reanimated/lib/module/featureFlags',
  );
  return {
    ...actual,
    getStaticFeatureFlag: (name: string) =>
      name === 'FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS' || actual.getStaticFeatureFlag(name),
  };
});

jest.resetModules();
require('react-native-reanimated').setUpTests();
const rntl = require('@testing-library/react-native') as typeof Rntl;
const { Text } = require('react-native') as typeof ReactNative;
const { ENTER, Enter } = require('../Enter') as typeof EnterModule;
const { useSettings } = require('../../../state/settings') as typeof Settings;
const { HOME_ENTRANCE } = require('../../../screens/home/homeEntrance') as typeof HomeEntrance;

/** What a test needs of Reanimated's animated component (its internals). */
interface AnimatedView {
  props: { testID?: string };
  jestAnimatedStyle: { value: object };
  _animatedStyles: unknown[];
  _syncStylePropsBackToReact(props: object): void;
  /** Whether an animated style is on the view (the test's own record). */
  attached?: boolean;
  /** What the native registry kept for the view when its animated style came off (the test's own record). */
  kept?: object;
}
const views: AnimatedView[] = [];
const { default: AnimatedComponent } =
  require('react-native-reanimated/lib/module/createAnimatedComponent/AnimatedComponent') as {
    default: {
      prototype: {
        componentDidMount(this: AnimatedView): void;
        _updateAnimatedStylesAndProps(this: AnimatedView): void;
      };
    };
  };
const didMount = AnimatedComponent.prototype.componentDidMount;
AnimatedComponent.prototype.componentDidMount = function (this: AnimatedView) {
  views.push(this);
  didMount.call(this);
};
// Natively, a view's registry entry gets what its animated style draws only while that style is on the view
// (Jest's updater keeps writing to the component's record after it comes off): keep what it had then.
const updateStyles = AnimatedComponent.prototype._updateAnimatedStylesAndProps;
AnimatedComponent.prototype._updateAnimatedStylesAndProps = function (this: AnimatedView) {
  const was = this.attached === true;
  updateStyles.call(this);
  this.attached = this._animatedStyles.length > 0;
  if (was && !this.attached) this.kept = { ...this.jestAnimatedStyle.value };
};
const viewOf = (testID: string) => views.findLast((v) => v.props.testID === testID)!;
/** What the native registry holds for a part: what the UI thread drew last while an animated style was on it. */
const registryOf = (testID: string): object => {
  const view = viewOf(testID);
  return view.attached ? view.jestAnimatedStyle.value : (view.kept ?? {});
};

// The UI thread: Reanimated's frames, held while it is busy (JS timers still run), and run again after.
const runFrame = globalThis.requestAnimationFrame;
let held: FrameRequestCallback[] | null = null;
function stallUi() {
  held = [];
  globalThis.requestAnimationFrame = (callback: FrameRequestCallback) => {
    held!.push(callback);
    return 0;
  };
}
function resumeUi() {
  const waiting = held ?? [];
  held = null;
  globalThis.requestAnimationFrame = runFrame;
  for (const callback of waiting) runFrame(callback);
}
// The sync is played by hand (`settle`): the native one is not there under Jest.
const { PropsRegistryGarbageCollector } =
  require('react-native-reanimated/lib/module/PropsRegistryGarbageCollector') as {
    PropsRegistryGarbageCollector: { syncPropsBackToReact(): void };
  };
PropsRegistryGarbageCollector.syncPropsBackToReact = () => {};

/** Reanimated's settled-props sync for one part: what the native registry holds for it, if anything. */
async function settle(testID: string) {
  const drawn = registryOf(testID);
  if (Object.keys(drawn).length > 0)
    await rntl.act(async () => viewOf(testID)._syncStylePropsBackToReact({ ...drawn }));
}

async function frames(ms: number) {
  await rntl.act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

const KINDS = ['rise', 'settle', 'pop', 'fade'] as const;
const parts = (play: boolean, content: string) => (
  <>
    {KINDS.map((kind) => (
      <Enter key={kind} kind={kind} play={play} testID={kind}>
        <Text>{`${kind} ${content}`}</Text>
      </Enter>
    ))}
  </>
);
const END = {
  rise: { opacity: 1, transform: [{ translateY: 0 }] },
  settle: { opacity: 1, transform: [{ scale: 1 }] },
  pop: { opacity: 1, transform: [{ scale: 1 }] },
  fade: { opacity: 1 },
};

beforeEach(() => {
  views.length = 0;
  jest.useFakeTimers();
  useSettings.setState({ reduceMotion: 'off' });
});
afterEach(() => {
  resumeUi();
  jest.useRealTimers();
});

/**
 * What the phone ends up showing for a part: its own style (what React hands the view, where Reanimated's settled
 * props sit too), what its registry entry holds (laid over that on each commit until it is dropped, and what the
 * native view last got), and no settled props at the top of the view's props, where a View applies them as well.
 */
function expectEnd(testID: string, end: object) {
  const host = rntl.screen.getByTestId(testID);
  expect(host).toHaveStyle(end);
  expect(registryOf(testID)).toEqual(end);
  const props = host.props as { opacity?: unknown; transform?: unknown };
  expect(props.opacity).toBeUndefined();
  expect(props.transform).toBeUndefined();
}

describe('Enter under Reanimated’s settled-props sync (B46)', () => {
  it('a long hold leaves no start to sync back, so an end dropped unsynced never hides the part again', async () => {
    const view = await rntl.render(parts(false, 'loading'));
    // Under the Splash: the start is React's own style, and nothing animated is on the view to sync back.
    await frames(1500);
    for (const kind of KINDS) {
      expect(rntl.screen.getByTestId(kind)).toHaveStyle({ opacity: 0 });
      await settle(kind);
    }
    // The Splash goes; the entrance plays and ends while JS is busy (no sync), then the account arrives.
    await view.rerender(parts(true, 'loading'));
    await frames(2000);
    await view.rerender(parts(true, 'with the account'));
    for (const kind of KINDS) {
      expect(rntl.screen.getByTestId(kind)).toHaveStyle(END[kind]);
      expect(rntl.screen.getByText(`${kind} with the account`)).toBeOnTheScreen();
    }
  });

  it('an end synced back agrees with React’s own', async () => {
    const view = await rntl.render(parts(true, 'first'));
    await frames(2000);
    for (const kind of KINDS) await settle(kind);
    await view.rerender(parts(true, 'again'));
    for (const kind of KINDS) expect(rntl.screen.getByTestId(kind)).toHaveStyle(END[kind]);
  });
});

/** Home's parts as HomeScreen lays them out (HOME_ENTRANCE), held until the Splash goes. */
const HOME = {
  card: { kind: 'rise', delayMs: HOME_ENTRANCE.card },
  play: { kind: 'settle', delayMs: HOME_ENTRANCE.play },
  again: { kind: 'rise', delayMs: HOME_ENTRANCE.again },
  header: { kind: 'rise', delayMs: HOME_ENTRANCE.recentHeader },
} as const;
const RECENT = [0, 1, 2].map((i) => `recent-${i}`);
const home = (play: boolean, content: string) => (
  <>
    {Object.entries(HOME).map(([id, part]) => (
      <Enter key={id} kind={part.kind} delayMs={part.delayMs} play={play} testID={id}>
        <Text>{`${id} ${content}`}</Text>
      </Enter>
    ))}
    {RECENT.map((id, index) => (
      <Enter key={id} index={index} delayMs={HOME_ENTRANCE.recent} play={play} testID={id}>
        <Text>{id}</Text>
      </Enter>
    ))}
  </>
);
const HOME_END = [
  ...Object.entries(HOME).map(([id, part]) => [id, END[part.kind]] as const),
  ...RECENT.map((id) => [id, END.rise] as const),
];

/** History's cards: the first ENTER.cap rows rise in, 40 ms apart (HistoryScreen: an Enter with its index). */
const GAMES = Array.from({ length: 10 }, (_, i) => `game-${i}`);
const history = (games: readonly string[]) => (
  <>
    {games.map((id, index) => (
      <Enter key={id} index={index} testID={id}>
        <Text>{id}</Text>
      </Enter>
    ))}
  </>
);

describe('Enter when the UI thread stalls as it starts (E1 History, E2 Home’s hero, E3 the restart)', () => {
  it('Home after a cold start: the UI thread stalls just after "שחק" starts to settle; it still lands at full size', async () => {
    const view = await rntl.render(home(false, 'loading'));
    await frames(1500);
    // The Splash goes; the card has risen a little and "שחק" has settled about 80 ms (0.964 of its size).
    await view.rerender(home(true, 'loading'));
    await frames(HOME_ENTRANCE.play + 80);
    // Then the first frames of Home take the UI thread for 2.5 s: JS timers run, and JS, idle, syncs back what the
    // registry kept, which has stood still that long.
    stallUi();
    await frames(2500);
    for (const [id] of HOME_END) await settle(id);
    // The UI thread is back and the entrance runs out; JS is busy (the account loading), its end goes unsynced.
    resumeUi();
    await frames(1500);
    await view.rerender(home(true, 'with the account'));
    expectEnd('play', END.settle);
    for (const [id, end] of HOME_END) expectEnd(id, end);
  });

  it('the restart for a new direction (he → ar): the UI thread is busy as the parts start; none stays hidden', async () => {
    const view = await rntl.render(home(false, 'loading'));
    await frames(1500);
    // The Splash goes while the UI thread is still building the app after the reload: no frame for 2.5 s.
    stallUi();
    await view.rerender(home(true, 'loading'));
    await frames(2500);
    for (const [id] of HOME_END) await settle(id);
    resumeUi();
    await frames(1500);
    await view.rerender(home(true, 'with the account'));
    for (const [id, end] of HOME_END) expectEnd(id, end);
    for (const id of Object.keys(HOME))
      expect(rntl.screen.getByText(`${id} with the account`)).toBeOnTheScreen();
  });

  it('History: the UI thread stalls on its cards’ first frame; every card ends opaque and in place, after filters too', async () => {
    const view = await rntl.render(history(GAMES));
    // The newest card has risen half way; the UI thread then draws the cards for 2.5 s.
    await frames(60);
    stallUi();
    await frames(2500);
    const moving = GAMES.slice(0, ENTER.cap);
    for (const id of moving) await settle(id);
    resumeUi();
    await frames(1500);
    for (const id of moving) expectEnd(id, END.rise);
    // 'מדורג' and back to 'הכל': the cards that stay keep their place in the list, the others come in again.
    await view.rerender(history(GAMES.filter((_, i) => i % 3 === 0)));
    await frames(2000);
    await view.rerender(history(GAMES));
    await frames(2000);
    for (const id of moving) expectEnd(id, END.rise);
  });
});
