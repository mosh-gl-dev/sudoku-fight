import { useEffect, useState } from 'react';
import { create } from 'zustand';

import { type MusicScene, sameScene } from './musicModel';

/**
 * The scenes the screens claim (config/music.ts): a route whose music depends on what it shows (the game, a
 * stage, the match search, a friends room) says so here, by its route pattern ('/game', '/levels/play'). The
 * director (MusicDirector.tsx) reads the claim of the route shown only, so a screen left mounted under another
 * (the game under its results) is not heard. No player here: tests read the store.
 */
interface Claim {
  scene: MusicScene;
  /** Whose claim it is: a screen's unmount clears only its own (the next run of a route may have claimed since). */
  owner: number;
}

interface MusicSceneState {
  claims: Readonly<Record<string, Claim>>;
}

export const useMusicScenes = create<MusicSceneState>()(() => ({ claims: {} }));

let owners = 0;

/** A new owner for claims (each screen instance takes one). */
export const newClaimOwner = (): number => ++owners;

/** The route's scene is `scene` (unchanged scenes are not written). */
export function claimMusicScene(route: string, scene: MusicScene, owner: number): void {
  const now = useMusicScenes.getState().claims[route];
  if (now && now.owner === owner && sameScene(now.scene, scene)) return;
  useMusicScenes.setState((s) => ({ claims: { ...s.claims, [route]: { scene, owner } } }));
}

/** The route's claim goes, if it is still this owner's. */
export function releaseMusicScene(route: string, owner: number): void {
  const now = useMusicScenes.getState().claims[route];
  if (!now || now.owner !== owner) return;
  useMusicScenes.setState((s) => {
    const { [route]: _gone, ...rest } = s.claims;
    return { claims: rest };
  });
}

/** The claim of a route, or null. */
export const claimOf = (claims: MusicSceneState['claims'], route: string): MusicScene | null =>
  claims[route]?.scene ?? null;

/**
 * A screen's claim for its route while it is mounted: `scene` (null: no claim, the route's own music). Written
 * after the render, and only when it changed.
 */
export function useMusicScene(route: string, scene: MusicScene | null): void {
  const [owner] = useState(newClaimOwner);
  const key = scene === null ? null : JSON.stringify(scene);
  useEffect(() => {
    if (key === null) releaseMusicScene(route, owner);
    else claimMusicScene(route, JSON.parse(key) as MusicScene, owner);
  }, [route, key, owner]);
  useEffect(() => () => releaseMusicScene(route, owner), [route, owner]);
}
