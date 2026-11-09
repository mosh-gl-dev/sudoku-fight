import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { router, Stack } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { NavigationContext, NavigationRouteContext } from 'expo-router/react-navigation';
import { useContext } from 'react';
import { Pressable, Text } from 'react-native';

import { COVERED_DROP_FALLBACK_MS, dropWhenCovered } from '../dropWhenCovered';

/**
 * QA loop 6 (apk10, motion on): 80–90 ms of nothing but the wandering digits between the results' "משחק חדש" and
 * the search, which then faded in. The results were *replaced*: react-native-screens on Android fades the old
 * screen out, but its views can be gone before that fade starts (the removal transition is posted from the
 * mounting thread: a race), so the new screen faded in over nothing. Now the next screen is pushed over the
 * results, which stay whole under it for the cross-fade and leave the history once covered (dropWhenCovered.ts).
 * The route's own wiring ("push", then dropWhenCovered) is pinned in resultsRoute.test.tsx and below; the stack
 * part runs here on the real navigator, with a light stand-in for the results screen.
 */

/** The results, as app/results/[id].tsx wires "משחק חדש": the next screen pushed, then dropWhenCovered. */
function Results() {
  const navigation = useContext(NavigationContext);
  const key = useContext(NavigationRouteContext)?.key;
  const newGame = () => {
    router.push('/match');
    if (navigation && key) void dropWhenCovered(navigation, key);
  };
  return (
    <Pressable onPress={newGame} accessibilityRole="button">
      <Text testID="results">משחק חדש</Text>
    </Pressable>
  );
}

const Layout = () => <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
const ROUTES = {
  _layout: Layout,
  index: () => <Text>home</Text>,
  'results/[id]': Results,
  match: () => <Text testID="search">search</Text>,
};

/** The stack's native screens, bottom first, as host elements (react-native-screens' RNSScreen). */
function nativeScreens(): { props: Record<string, unknown> }[] {
  const found: { props: Record<string, unknown> }[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    const n = node as { type?: string; props?: Record<string, unknown>; children?: unknown[] };
    if (n.type === 'RNSScreen' && n.props) found.push({ props: n.props });
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return found;
}

const resultsThere = () => screen.queryAllByTestId('results', { includeHiddenElements: true }).length > 0;

describe('"משחק חדש" over the results (the stack)', () => {
  it('the results stay under the search for the fade, then leave the history once covered', async () => {
    const app = renderRouter(ROUTES, { initialUrl: '/' });
    await app;
    await act(async () => router.push('/results/abc'));
    expect(resultsThere()).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: 'משחק חדש' }));
    expect(app.getPathname()).toBe('/match');
    // Both are there as the stack fades between them: the results under the search (a replace: gone at once).
    expect(nativeScreens()).toHaveLength(3);
    expect(resultsThere()).toBe(true);

    // Covered (the stack's transitionEnd for the results): they leave, unseen; back goes where it went before.
    await act(async () => (nativeScreens()[1]!.props.onDisappear as () => void)());
    expect(resultsThere()).toBe(false);
    expect(nativeScreens()).toHaveLength(2);
    expect(app.getPathname()).toBe('/match');
    await act(async () => router.back());
    expect(app.getPathname()).toBe('/');
  });

  it('the results route pushes its next screen and hands itself to dropWhenCovered', () => {
    const route = readFileSync(join(__dirname, '..', '..', '..', '..', 'app', 'results', '[id].tsx'), 'utf8');
    expect(route).toContain("startAndOpen(target.play, 'push')");
    expect(route).toContain(
      "startRankedAndOpen({ gameType: target.gameType, players: target.players }, 'push')",
    );
    expect(route).toMatch(
      /if \(over && navigation && routeKey\) await dropWhenCovered\(navigation, routeKey\);/,
    );
  });
});

describe('dropWhenCovered', () => {
  type Listener = (e: { data: { closing: boolean } }) => void;
  const fakeStack = (keys: string[], index = keys.length - 1) => {
    const listeners: Listener[] = [];
    const nav = {
      state: { key: 'stack', index, routes: keys.map((key) => ({ key, name: key })) },
      dispatch: jest.fn(),
      getState: () => nav.state,
      addListener: jest.fn((_type: string, listener: Listener) => {
        listeners.push(listener);
        return () => listeners.splice(listeners.indexOf(listener), 1);
      }),
      emit: (closing: boolean) => [...listeners].forEach((l) => l({ data: { closing } })),
    };
    return nav;
  };

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('drops the covered route on its closing transitionEnd, not on an opening one, and only once', async () => {
    const nav = fakeStack(['home', 'results', 'match']);
    const done = dropWhenCovered(nav as never, 'results');
    nav.emit(false);
    expect(nav.dispatch).not.toHaveBeenCalled();
    nav.emit(true);
    await done;
    expect(nav.dispatch).toHaveBeenCalledTimes(1);
    const action = nav.dispatch.mock.calls[0]![0] as {
      type: string;
      target: string;
      payload: { index: number; routes: { key: string }[] };
    };
    expect(action.type).toBe('RESET');
    expect(action.target).toBe('stack');
    expect(action.payload.routes.map((r) => r.key)).toEqual(['home', 'match']);
    expect(action.payload.index).toBe(1);
    jest.advanceTimersByTime(COVERED_DROP_FALLBACK_MS);
    nav.emit(true);
    expect(nav.dispatch).toHaveBeenCalledTimes(1);
  });

  it('with no transition event, drops it COVERED_DROP_FALLBACK_MS later', async () => {
    const nav = fakeStack(['home', 'results', 'match']);
    const done = dropWhenCovered(nav as never, 'results');
    jest.advanceTimersByTime(COVERED_DROP_FALLBACK_MS - 1);
    expect(nav.dispatch).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    await done;
    expect(nav.dispatch).toHaveBeenCalledTimes(1);
  });

  it('a navigator that throws (gone, or a stale state) is reported, never thrown out of the timer', async () => {
    const recordError = jest.fn();
    const crash = jest.requireActual<typeof import('../../../services/crashlytics')>(
      '../../../services/crashlytics',
    );
    const spy = jest.spyOn(crash, 'crashReporter').mockReturnValue({
      recordError,
      log: jest.fn(),
    } as never);
    try {
      const nav = fakeStack(['home', 'results', 'match']);
      nav.dispatch.mockImplementation(() => {
        throw new Error('navigator gone');
      });
      const done = dropWhenCovered(nav as never, 'results');
      expect(() => jest.advanceTimersByTime(COVERED_DROP_FALLBACK_MS)).not.toThrow();
      await done;
      expect(recordError).toHaveBeenCalledWith(expect.any(Error), 'dropWhenCovered');

      const gone = fakeStack(['home', 'results', 'match']);
      gone.addListener.mockImplementation(() => {
        throw new Error('no listeners');
      });
      const settled = dropWhenCovered(gone as never, 'results');
      jest.advanceTimersByTime(COVERED_DROP_FALLBACK_MS);
      await settled;
      expect(gone.dispatch).toHaveBeenCalledTimes(1); // the fallback still dropped it
    } finally {
      spy.mockRestore();
    }
  });

  it('never drops the screen shown (back from the next one within the fade): it stays', async () => {
    const nav = fakeStack(['home', 'results']);
    const done = dropWhenCovered(nav as never, 'results');
    jest.advanceTimersByTime(COVERED_DROP_FALLBACK_MS);
    await done;
    expect(nav.dispatch).not.toHaveBeenCalled();
  });
});
