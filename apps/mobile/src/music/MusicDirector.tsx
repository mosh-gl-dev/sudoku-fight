import { useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';

import type { Music } from '../services/music';
import { appMusic, loadedMusic } from './appMusic';
import { type MusicScene, requestOf, routePatternOf, sameScene, sceneOf } from './musicModel';
import { claimOf, useMusicScenes } from './musicScene';

/**
 * The app's music director, once, in the root layout (config/music.ts says what plays where): the route shown
 * and its screen's claim (musicScene.ts) make the scene, and each change of scene asks the music service for its
 * track. Under the Splash (`covered`), silence. Draws nothing. The service is one for the app: a recreated
 * activity's new root asks for the same track, which plays on.
 */
export function MusicDirector({ covered, service }: { covered: boolean; service?: Music }) {
  const pattern = routePatternOf(useSegments() as readonly string[]);
  const claim = useMusicScenes((s) => claimOf(s.claims, pattern));
  const scene = sceneOf({ pattern, covered, claim });
  const key = JSON.stringify(scene);
  const last = useRef<MusicScene | null>(null);
  useEffect(() => {
    const now = JSON.parse(key) as MusicScene;
    if (sameScene(last.current, now)) return;
    const request = requestOf(last.current, now);
    last.current = now;
    // A silence before any track was asked for (the Splash at the start) needs no service: nothing plays yet, and
    // expo-audio stays out of the start.
    const target = service ?? (request.track === null ? loadedMusic() : appMusic());
    target?.play(request.track, { fadeMs: request.fadeMs, delayMs: request.delayMs });
  }, [key, service]);
  return null;
}
