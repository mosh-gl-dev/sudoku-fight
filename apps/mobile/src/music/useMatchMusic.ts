import { useEffect } from 'react';

import type { RankedSearch } from '../game/gameStore';
import { matchSceneOf } from './musicModel';
import { claimMusicScene, newClaimOwner, releaseMusicScene } from './musicScene';

/** The route the ranked search claims for (app/match/index.tsx). */
export const MATCH_ROUTE = '/match';

/**
 * The ranked search's music (config/music.ts): the lobby while searching, silence from "found" on (matchSceneOf).
 * Read from the search outside React, so the route does not render again on its changes.
 */
export function useMatchMusic(match: RankedSearch | null): void {
  useEffect(() => {
    if (!match) return undefined;
    const owner = newClaimOwner();
    const apply = () => claimMusicScene(MATCH_ROUTE, matchSceneOf(match.info.phase), owner);
    apply();
    const unsubscribe = match.subscribe(apply);
    return () => {
      unsubscribe();
      releaseMusicScene(MATCH_ROUTE, owner);
    };
  }, [match]);
}
