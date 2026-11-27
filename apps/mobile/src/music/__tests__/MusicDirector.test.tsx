import { router, Slot } from 'expo-router';
import { act, renderRouter } from 'expo-router/testing-library';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { MUSIC_CONFIG } from '../../config/music';
import type { Music } from '../../services/music';
import { silenceMusic } from '../appMusic';
import { MusicDirector } from '../MusicDirector';
import { stageSceneOf } from '../musicModel';
import { useMusicScene, useMusicScenes } from '../musicScene';

/** The director in a root layout: the route shown, and its screen's claim, ask the service for a track. */

const service = { play: jest.fn(), release: jest.fn(), wanted: null } as unknown as Music & {
  play: jest.Mock;
};

/** The app's service, as the director requires it when none is given. */
const mockAppMusic = { play: jest.fn(), release: jest.fn(), wanted: null };
jest.mock('../../services/music', () => ({ music: mockAppMusic }));

let covered = false;
let setStagePhase: ((phase: 'ready' | 'playing' | 'result') => void) | null = null;

function Stage() {
  const [phase, setPhase] = useState<'ready' | 'playing' | 'result'>('ready');
  useEffect(() => {
    setStagePhase = setPhase;
  }, []);
  useMusicScene('/levels/play', stageSceneOf('chain', phase));
  return <Text>stage</Text>;
}

const routes = {
  _layout: () => (
    <>
      <Slot />
      <MusicDirector covered={covered} service={service} />
    </>
  ),
  index: () => <Text>home</Text>,
  settings: () => <Text>settings</Text>,
  'results/[id]': () => <Text>results</Text>,
  'levels/play': Stage,
};

const lastCall = () => service.play.mock.calls[service.play.mock.calls.length - 1] as unknown[];

beforeEach(() => {
  covered = false;
  service.play.mockClear();
  useMusicScenes.setState({ claims: {} });
});

describe('MusicDirector', () => {
  it('Home plays the lobby, the menus keep it, the results are silent', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    expect(lastCall()).toEqual([
      'lobby',
      { fadeMs: MUSIC_CONFIG.crossfadeMs, delayMs: MUSIC_CONFIG.startDelayMs.lobby },
    ]);
    await act(async () => router.push('/settings'));
    // The same scene: nothing asked again.
    expect(service.play).toHaveBeenCalledTimes(1);
    await act(async () => router.push('/results/abc'));
    expect(lastCall()).toEqual([null, { fadeMs: MUSIC_CONFIG.crossfadeMs, delayMs: 0 }]);
  });

  it("a stage's claim: silence on its count, its kind's cue while it plays, a 0.5 s fade at its end", async () => {
    await renderRouter(routes, { initialUrl: '/levels/play' });
    expect(lastCall()?.[0]).toBeNull();
    await act(async () => setStagePhase!('playing'));
    expect(lastCall()).toEqual([
      'stage_chain',
      { fadeMs: MUSIC_CONFIG.crossfadeMs, delayMs: MUSIC_CONFIG.startDelayMs.stage },
    ]);
    await act(async () => setStagePhase!('result'));
    expect(lastCall()).toEqual([null, { fadeMs: MUSIC_CONFIG.stageEndFadeMs, delayMs: 0 }]);
  });

  it('under the Splash: silence', async () => {
    covered = true;
    await renderRouter(routes, { initialUrl: '/' });
    expect(lastCall()?.[0]).toBeNull();
  });

  it("the app's own service: not loaded for the silence under the Splash; silenceMusic stops what plays", async () => {
    let uncover: (() => void) | null = null;
    function OwnLayout() {
      const [hidden, setHidden] = useState(true);
      useEffect(() => {
        uncover = () => setHidden(false);
      }, []);
      return (
        <>
          <Slot />
          <MusicDirector covered={hidden} />
        </>
      );
    }
    silenceMusic();
    await renderRouter({ ...routes, _layout: OwnLayout }, { initialUrl: '/' });
    expect(mockAppMusic.play).not.toHaveBeenCalled();
    await act(async () => uncover!());
    expect(mockAppMusic.play).toHaveBeenLastCalledWith('lobby', expect.anything());
    // "צריך לעדכן את האפליקציה" in place of the app (app/_layout.tsx): silence.
    silenceMusic();
    expect(mockAppMusic.play).toHaveBeenLastCalledWith(null);
  });
});
