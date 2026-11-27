import { useEffect } from 'react';

import type { MusicGameMode } from '../config/music';
import { type GameStoreState, useGameStore } from '../game/gameStore';
import { gameSceneOf, type MusicScene } from './musicModel';
import { claimMusicScene, newClaimOwner, releaseMusicScene } from './musicScene';

/** The route the game screen claims for (app/game.tsx). */
export const GAME_ROUTE = '/game';

type GameSlice = Pick<GameStoreState, 'session' | 'online' | 'view'>;

/** The game's mode for music: a practice's own (solo, bot), an online game ranked, a friends room's friends. */
export function musicModeOf(s: Pick<GameStoreState, 'session' | 'online'>): MusicGameMode | null {
  if (s.session) return s.session.mode;
  if (s.online) return s.online.isFriends ? 'friends' : 'ranked';
  return null;
}

/**
 * Follows the game store and gives the scene each update calls for. The end's latch (finalAtEmptyCells) is kept
 * per game: a new game (another id, another session) starts without it.
 */
export function createGameMusic(): (s: GameSlice) => MusicScene | null {
  let game: unknown = null;
  let gameId: string | null = null;
  let final = false;
  return (s) => {
    const mode = musicModeOf(s);
    if (mode === null) return null;
    const current = s.session ?? s.online;
    const id = s.view?.gameId ?? null;
    if (current !== game || (id !== null && gameId !== null && id !== gameId)) final = false;
    game = current;
    if (id !== null) gameId = id;
    const scene = gameSceneOf(mode, s.view, final);
    if (scene.kind === 'game' && scene.final) final = true;
    return scene;
  };
}

/**
 * The game screen's music (app/game.tsx): its mode's track while the game runs, its final loop at the end
 * (config/music.ts finalAtEmptyCells), silence before and after. Read from the store outside React, so the
 * route does not render again on every move.
 */
export function useGameMusic(): void {
  useEffect(() => {
    const owner = newClaimOwner();
    const sceneOfState = createGameMusic();
    const apply = (s: GameSlice) => {
      const scene = sceneOfState(s);
      if (scene === null) releaseMusicScene(GAME_ROUTE, owner);
      else claimMusicScene(GAME_ROUTE, scene, owner);
    };
    apply(useGameStore.getState());
    const unsubscribe = useGameStore.subscribe(apply);
    return () => {
      unsubscribe();
      releaseMusicScene(GAME_ROUTE, owner);
    };
  }, []);
}
