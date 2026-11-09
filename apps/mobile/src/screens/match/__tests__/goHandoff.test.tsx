import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { router, Stack } from 'expo-router';
import { NavigationContext, NavigationRouteContext } from 'expo-router/react-navigation';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { useContext, useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';

import { transitions } from '../../../theme/transitions';
import { dropWhenCovered } from '../../results/dropWhenCovered';
import { GO_HANDOFF_TRANSITION, gameRouteTransition, handedGoCover, handGoCover } from '../goHandoff';
import type { CountdownModel } from '../goHandoff';

/**
 * QA loop 6, apk10-go-to-board-no-empty-frame (motion on, 3 ranked games of 4): ~80 ms of nothing but the
 * wandering digits as the match screen's GO! gave way to the game route's GO! cover, which then faded in from 0.
 * The cover itself starts opaque (GoCover.tsx): what faded in was the stack's own 'fade' into /game, over a match
 * screen whose views were already gone (react-native-screens posts their removal transition from the mounting
 * thread: a race). Now the game is pushed over the match screen, which stays whole under it until covered, and
 * over a handed GO! it comes in at once ('none'), opaque from its first frame, for as long as the route is there.
 */

const GO = { kind: 'countdown', step: 'go' } as unknown as CountdownModel;

afterEach(() => handGoCover(null));

/** The stack's native screens, bottom first, as host elements (react-native-screens' RNSScreen). */
function nativeScreens(): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    const n = node as { type?: string; props?: Record<string, unknown>; children?: unknown[] };
    if (n.type === 'RNSScreen' && n.props) found.push(n.props);
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return found;
}

describe('the game route over a handed GO!', () => {
  it.each([false, true])(
    'comes in at once, the new screen’s cut even for a replace, for as long as it is there (reduce motion %s)',
    (reduce) => {
      const flow = transitions(reduce).flow;
      expect(gameRouteTransition(flow, `plain-${reduce}`)).toBe(flow);
      handGoCover(GO);
      expect(handedGoCover()).toBe(GO);
      const cut = { ...flow, animation: 'none', animationTypeForReplace: 'push' };
      expect(gameRouteTransition(flow, `ranked-${reduce}`)).toEqual(cut);
      // The game route lets go of the GO! as it mounts; the navigator reads its options again: still the cut.
      handGoCover(null);
      expect(gameRouteTransition(flow, `ranked-${reduce}`)).toEqual(cut);
      // A route that was there before, or comes later, keeps the flow's own.
      expect(gameRouteTransition(flow, `plain-${reduce}`)).toBe(flow);
      expect(gameRouteTransition(flow, `next-${reduce}`)).toBe(flow);
    },
  );

  it('match → game on the real native stack: a cut that holds through the game route’s mount, over a match screen still whole', async () => {
    const flow = transitions(false).flow;
    // As the root layout wires /game.
    const Layout = () => (
      <Stack screenOptions={{ headerShown: false, ...transitions(false).menu }}>
        <Stack.Screen name="game" options={({ route }) => gameRouteTransition(flow, route.key)} />
      </Stack>
    );
    /** As app/match/index.tsx opens the game once GO! is held (MatchScreen hands it first). */
    function Match() {
      const navigation = useContext(NavigationContext);
      const routeKey = useContext(NavigationRouteContext)?.key;
      const onPlay = () => {
        handGoCover(GO);
        router.push('/game');
        if (navigation && routeKey) void dropWhenCovered(navigation, routeKey);
      };
      return (
        <Pressable onPress={onPlay} accessibilityRole="button">
          <Text testID="match-go">GO!</Text>
        </Pressable>
      );
    }
    /** As app/game.tsx mounts: reads the GO!, lets go of it in an effect, and sets its own options every render. */
    function Game() {
      const [goCover] = useState(handedGoCover);
      useEffect(() => handGoCover(null), []);
      return (
        <>
          <Stack.Screen options={{ gestureEnabled: false }} />
          <Text>{goCover ? 'game under GO!' : 'game'}</Text>
        </>
      );
    }
    const app = renderRouter(
      { _layout: Layout, index: () => <Text>home</Text>, match: Match, game: Game },
      { initialUrl: '/' },
    );
    await app;
    await act(async () => router.push('/match'));
    await fireEvent.press(screen.getByRole('button', { name: 'GO!' }));
    expect(app.getPathname()).toBe('/game');
    expect(screen.getByText('game under GO!')).toBeTruthy();
    expect(handedGoCover()).toBeNull(); // let go of, as the route does
    // The match screen is still there, whole, under the game (a replace took it out in the same commit)...
    expect(nativeScreens()).toHaveLength(3);
    expect(screen.queryAllByTestId('match-go', { includeHiddenElements: true })).toHaveLength(1);
    // ...and the game comes in as a cut, still after its own effects and setOptions (was 'fade': QA loop 6).
    expect(nativeScreens().at(-1)!.stackAnimation).toBe('none');

    // Covered (the stack's transitionEnd for the match screen): it leaves the history, unseen.
    await act(async () => (nativeScreens()[1]!.onDisappear as () => void)());
    expect(nativeScreens()).toHaveLength(2);
    expect(screen.queryAllByTestId('match-go', { includeHiddenElements: true })).toHaveLength(0);
    expect(nativeScreens().at(-1)!.stackAnimation).toBe('none');
    await act(async () => router.back());
    expect(app.getPathname()).toBe('/');

    // Any other way into /game: its fade.
    await act(async () => router.push('/game'));
    expect(nativeScreens().at(-1)!.stackAnimation).toBe('fade');
  });

  it('the root layout and the match route are wired so', () => {
    const app = join(__dirname, '..', '..', '..', '..', 'app');
    const layout = readFileSync(join(app, '_layout.tsx'), 'utf8');
    expect(layout).toContain(
      '<Stack.Screen name="game" options={({ route }) => gameRouteTransition(moves.flow, route.key)} />',
    );
    expect(GO_HANDOFF_TRANSITION).toEqual({ animation: 'none', animationTypeForReplace: 'push' });
    const match = readFileSync(join(app, 'match', 'index.tsx'), 'utf8');
    expect(match).toMatch(
      /router\.push\('\/game'\);\s*if \(navigation && routeKey\) void dropWhenCovered\(navigation, routeKey\);/,
    );
    expect(match).not.toContain("router.replace('/game')");
  });

  it('react-native-screens as this relies on it (re-check on an upgrade)', () => {
    const java = join(
      dirname(require.resolve('react-native-screens/package.json')),
      'android',
      'src',
      'main',
      'java',
      'com',
      'swmansion',
      'rnscreens',
    );
    const stack = readFileSync(join(java, 'ScreenStack.kt'), 'utf8');
    // A replace whose new screen asks 'push' plays the new screen's animation...
    expect(stack).toContain(
      'val isPushReplace = newTop.screen.replaceAnimation === Screen.ReplaceAnimation.PUSH',
    );
    expect(stack).toContain('if (shouldUseOpenAnimation) newTop.screen.stackAnimation');
    // ...and 'none' holds both screens fully opaque (no fade in from 0).
    const tween = readFileSync(join(java, 'utils', 'FragmentTransactionKt.kt'), 'utf8');
    expect(tween).toMatch(
      /StackAnimation\.NONE ->\s*this\.setCustomAnimations\(\s*R\.anim\.rns_no_animation_20,/,
    );
    // The race itself: the outgoing screen's removal transition is posted, not run before the views go.
    const proxy = readFileSync(
      join(
        java,
        '..',
        '..',
        '..',
        '..',
        '..',
        'fabric',
        'java',
        'com',
        'swmansion',
        'rnscreens',
        'NativeProxy.kt',
      ),
      'utf8',
    );
    expect(proxy).toMatch(/screen\.post \{\s*screen\.startRemovalTransition\(\)/);
  });
});
