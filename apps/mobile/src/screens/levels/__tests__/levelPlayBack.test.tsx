// First: keeps the real Reanimated in place of the router testing library's old mock (see homeTesting.tsx).
import 'react-native-reanimated';
import { type AppLevel, levelOutcome } from '@sudoku-fight/engine';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { useEffect } from 'react';
import { BackHandler, Pressable, Text, View } from 'react-native';

import { LevelPlayFlow, type LevelPlayingProps } from '../../../../app/levels/play';
import { LEVEL_UI } from '../../../config/levels';
import i18n from '../../../i18n';
import { firstBossOf, levelsOf } from '../../../levels/__tests__/helpers/levelsOf';
import { useSettings } from '../../../state/settings';
import { useTutorials } from '../HowToPlay';

/**
 * QA levels-exit (apk7): Android back while "מוכן?" or a boss's opening is up went to the map with no question,
 * and the run went on unseen: the stage started and played itself out behind the map ("התשובה: D1", then its
 * result, when the stage was opened again). Before the stage is on, back ends the run where it is (nothing has
 * begun, nothing counts) and goes to the map; the stage never starts. Once a stage screen is up, its own back
 * ("לצאת מהשלב?") is heard first.
 */

type Mocks = typeof import('../../home/testing/nativeMocks');
jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated'));
jest.mock('../../../services/analytics', () => ({ track: jest.fn() }));
jest.mock('expo-audio', () => jest.requireActual<Mocks>('../../home/testing/nativeMocks').expoAudio);
jest.mock('expo-haptics', () => jest.requireActual<Mocks>('../../home/testing/nativeMocks').expoHaptics);

const FIND = levelsOf('find', { chapter: 1 })[1]!;
const BOSS = firstBossOf('findDuel');

let stageMounts = 0;
let stageTakesBack = false;
/** The `playing` phase's stand-in: counts its mounts; may take back itself, as a stage screen does. */
function FakeStage({ level, onFinished }: LevelPlayingProps) {
  useEffect(() => {
    stageMounts += 1;
    if (!stageTakesBack) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);
  return (
    <View testID="fake-stage">
      <Text>{level.id}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="finish"
        testID="fake-stage-finish"
        onPress={() =>
          onFinished({
            outcome: levelOutcome(level, {
              reason: 'targetReached',
              elapsedMs: 3000,
              penaltyMs: 0,
              spots: 1,
              found: 0,
              stars: 0,
            }),
            finished: null,
            mistakes: 0,
            opponent: null,
            bestMove: null,
            why: null,
          })
        }
      />
    </View>
  );
}

const ROUTES = {
  'levels/index': () => <Text testID="map-stub">map</Text>,
  'levels/play': () => <LevelPlayFlow Playing={FakeStage} attemptOf={async () => 1} />,
};

let backs: jest.SpyInstance;

/** Android back: the handlers, the last one in first, until one takes it (as React Native does). */
async function pressBack(): Promise<boolean> {
  const handlers = backs.mock.calls
    .filter(([event]) => event === 'hardwareBackPress')
    .map(([, handler]) => handler as () => boolean | null | undefined)
    .reverse();
  let taken = false;
  await act(async () => {
    for (const handler of handlers) {
      if (handler()) {
        taken = true;
        return;
      }
    }
  });
  return taken;
}

const later = async (ms: number) => act(async () => void jest.advanceTimersByTime(ms));

beforeEach(async () => {
  await i18n.changeLanguage('he');
  useSettings.setState({ reduceMotion: 'off' });
  useTutorials.setState({ seen: { find: true, findDuel: true, boss: true } });
  stageMounts = 0;
  stageTakesBack = false;
  backs = jest.spyOn(BackHandler, 'addEventListener');
});
afterEach(() => {
  // Only the subscriptions still on are cleared (a handler left registered would answer the next test's back).
  backs.mockRestore();
  jest.useRealTimers();
});

describe('Android back in a stage’s route (QA levels-exit)', () => {
  it.each<[string, AppLevel]>([
    ['"מוכן?"', FIND],
    ['a boss’s opening', BOSS],
  ])('during %s: the map, and the stage never starts (opened with no screen under it)', async (_, level) => {
    const app = renderRouter(ROUTES, { initialUrl: `/levels/play?id=${level.id}` });
    await app;
    expect(screen.getByTestId('level-ready')).toBeOnTheScreen();
    await later(1000);
    expect(await pressBack()).toBe(true);
    expect(app.getPathname()).toBe('/levels');
    // Long past the wait and the stage's time: nothing started behind the map.
    await later(LEVEL_UI.bossReadyMs + 60_000);
    expect(stageMounts).toBe(0);
    expect(screen.queryByTestId('fake-stage')).toBeNull();
    expect(screen.getByTestId('map-stub')).toBeOnTheScreen();
  });

  it('from the map: back leaves "מוכן?" for the map, and "שחק" again starts afresh from "מוכן?"', async () => {
    const app = renderRouter(ROUTES, { initialUrl: '/levels' });
    await app;
    await act(async () => router.push({ pathname: '/levels/play', params: { id: FIND.id } }));
    expect(screen.getByTestId('level-ready')).toBeOnTheScreen();
    await later(1000);
    expect(await pressBack()).toBe(true);
    expect(app.getPathname()).toBe('/levels');
    await later(22_000);
    expect(stageMounts).toBe(0);
    await act(async () => router.push({ pathname: '/levels/play', params: { id: FIND.id } }));
    expect(screen.getByTestId('level-ready')).toBeOnTheScreen();
    expect(screen.queryByTestId('fake-stage')).toBeNull();
    await later(LEVEL_UI.readyMs);
    expect(stageMounts).toBe(1);
  });

  it('during "איך משחקים": the map too, and nothing starts', async () => {
    useTutorials.setState({ seen: {} });
    const app = renderRouter(ROUTES, { initialUrl: `/levels/play?id=${FIND.id}` });
    await app;
    expect(screen.getByTestId('how-to-play')).toBeOnTheScreen();
    expect(await pressBack()).toBe(true);
    expect(app.getPathname()).toBe('/levels');
    await later(60_000);
    expect(stageMounts).toBe(0);
  });

  it('once the stage screen is up, its own back is heard first: the run stays', async () => {
    stageTakesBack = true;
    const app = renderRouter(ROUTES, { initialUrl: `/levels/play?id=${FIND.id}` });
    await app;
    await later(LEVEL_UI.readyMs);
    expect(screen.getByTestId('fake-stage')).toBeOnTheScreen();
    expect(await pressBack()).toBe(true);
    expect(app.getPathname()).toBe('/levels/play');
    expect(screen.getByTestId('fake-stage')).toBeOnTheScreen();
  });

  it('on the result too, back is "למפה": the map, and "שחק" again starts afresh from "מוכן?"', async () => {
    const app = renderRouter(ROUTES, { initialUrl: '/levels' });
    await app;
    await act(async () => router.push({ pathname: '/levels/play', params: { id: FIND.id } }));
    await later(LEVEL_UI.readyMs);
    await fireEvent.press(screen.getByTestId('fake-stage-finish'));
    expect(screen.getByTestId('level-result')).toBeOnTheScreen();
    const dismissTo = jest.spyOn(router, 'dismissTo');
    expect(await pressBack()).toBe(true);
    expect(dismissTo).toHaveBeenCalledTimes(1);
    expect(dismissTo).toHaveBeenCalledWith('/levels');
    expect(app.getPathname()).toBe('/levels');
    await later(22_000);
    await act(async () => router.push({ pathname: '/levels/play', params: { id: FIND.id } }));
    expect(screen.getByTestId('level-ready')).toBeOnTheScreen();
    expect(screen.queryByTestId('level-result')).toBeNull();
    dismissTo.mockRestore();
  });
});
