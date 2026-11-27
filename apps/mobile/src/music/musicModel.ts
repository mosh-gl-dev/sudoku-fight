import type { GameView, LevelKind } from '@sudoku-fight/engine';

import {
  MUSIC_CONFIG,
  type MusicConfig,
  type MusicGameMode,
  type MusicTrackId,
  type RouteMusic,
} from '../config/music';

/**
 * What plays where (config/music.ts), pure: no player, no React, no navigation. The director
 * (music/MusicDirector.tsx) turns the screen shown into a scene, and the scene into a track and how to get there;
 * services/music.ts plays it.
 */

/** What the screen shown wants to hear. */
export type MusicScene =
  | { kind: 'silence' }
  | { kind: 'lobby' }
  /** The game screen; `final`: the end of the game (finalAtEmptyCells), latched until the game is over. */
  | { kind: 'game'; mode: MusicGameMode; final: boolean }
  /** A stage of staged practice, from GO to its end. */
  | { kind: 'stage'; levelKind: LevelKind };

export const SILENCE: MusicScene = { kind: 'silence' };
export const LOBBY: MusicScene = { kind: 'lobby' };

export const sameScene = (a: MusicScene | null, b: MusicScene | null): boolean =>
  a === b || (a !== null && b !== null && JSON.stringify(a) === JSON.stringify(b));

/** The track of a scene, or null for silence. */
export function trackOf(scene: MusicScene, config: MusicConfig = MUSIC_CONFIG): MusicTrackId | null {
  switch (scene.kind) {
    case 'silence':
      return null;
    case 'lobby':
      return 'lobby';
    case 'game':
      return (scene.final ? config.final[scene.mode] : undefined) ?? config.game[scene.mode] ?? null;
    case 'stage':
      return config.stage[scene.levelKind] ?? null;
  }
}

/** What the service is asked to do: the track (null: silence), how fast to get there, and when to start it. */
export interface MusicRequest {
  track: MusicTrackId | null;
  /** The fade (out of the old track, into the new one). */
  fadeMs: number;
  /** How long to wait before a new track starts (its player is made then). */
  delayMs: number;
}

/** From the scene before to the scene now: the request (a stage's end fades out faster). */
export function requestOf(
  before: MusicScene | null,
  now: MusicScene,
  config: MusicConfig = MUSIC_CONFIG,
): MusicRequest {
  const track = trackOf(now, config);
  const fadeMs =
    before?.kind === 'stage' && now.kind !== 'stage' ? config.stageEndFadeMs : config.crossfadeMs;
  const delayMs = now.kind === 'silence' ? 0 : config.startDelayMs[now.kind];
  return { track, fadeMs, delayMs };
}

/**
 * The route's pattern from expo-router's segments ('/', '/settings', '/results/[id]'): groups left out, an
 * "index" leaf is its folder (as telemetry/screens.ts reads them).
 */
export function routePatternOf(segments: readonly string[]): string {
  const parts = segments.filter((s) => !(s.startsWith('(') && s.endsWith(')')));
  if (parts[parts.length - 1] === 'index') parts.pop();
  return `/${parts.join('/')}`;
}

/** What a route plays by itself: the longest pattern of config.routes that covers it, else defaultRoute. */
export function routeMusicOf(pattern: string, config: MusicConfig = MUSIC_CONFIG): RouteMusic {
  let best: string | null = null;
  for (const key of Object.keys(config.routes)) {
    const covers = pattern === key || (key !== '/' && pattern.startsWith(`${key}/`));
    if (covers && (best === null || key.length > best.length)) best = key;
  }
  return best === null ? config.defaultRoute : config.routes[best]!;
}

export const sceneOfRouteMusic = (music: RouteMusic): MusicScene => (music === 'lobby' ? LOBBY : SILENCE);

/**
 * The scene of the screen shown: silence under the Splash; else the claim of the route's screen (the game, a
 * stage, the match search, a friends room), else what the route plays by itself.
 */
export function sceneOf(
  input: { pattern: string; covered: boolean; claim: MusicScene | null },
  config: MusicConfig = MUSIC_CONFIG,
): MusicScene {
  if (input.covered) return SILENCE;
  return input.claim ?? sceneOfRouteMusic(routeMusicOf(input.pattern, config));
}

/** How many cells of a board are still empty (0 = empty). */
export const emptyCellsOf = (grid: readonly number[]): number => grid.filter((v) => v === 0).length;

/** The game's end has come for music: few cells left (config.finalAtEmptyCells), in a mode that has a final loop. */
export function reachedFinal(
  mode: MusicGameMode,
  view: Pick<GameView, 'grid'>,
  config: MusicConfig = MUSIC_CONFIG,
): boolean {
  return config.final[mode] !== undefined && emptyCellsOf(view.grid) <= config.finalAtEmptyCells;
}

/**
 * The game screen's scene: silence before the game is on (an online game's connecting, its 3… 2… 1…) and once
 * it is over (the results' sounds carry it); the mode's track while it runs (paused too: the app's own pause
 * stops the music anyway), turning to its final loop at the end. `final` is the latch: true once reached.
 */
export function gameSceneOf(
  mode: MusicGameMode,
  view: Pick<GameView, 'status' | 'grid'> | null,
  final: boolean,
  config: MusicConfig = MUSIC_CONFIG,
): MusicScene {
  if (!view || view.status === 'waiting' || view.status === 'over') return SILENCE;
  return { kind: 'game', mode, final: final || reachedFinal(mode, view, config) };
}

/** A stage run's phase (app/levels/play.tsx) as music hears it. */
export type StagePhase = 'tutorial' | 'ready' | 'playing' | 'result' | 'left';

/**
 * A stage run's scene: "איך משחקים" is a menu (the lobby), "מוכן?" is the count before GO (silence), the stage
 * plays its kind's cue, its result is silent (the stage's end sounds carry it), and on the way to the map the lobby.
 */
export function stageSceneOf(levelKind: LevelKind, phase: StagePhase): MusicScene {
  switch (phase) {
    case 'tutorial':
    case 'left':
      return LOBBY;
    case 'ready':
    case 'result':
      return SILENCE;
    case 'playing':
      return { kind: 'stage', levelKind };
  }
}

/** The perceptual curve: the setting (0..1) to the player's volume. 0 is off. */
export function musicGain(volume: number, track: MusicTrackId, config: MusicConfig = MUSIC_CONFIG): number {
  const v = clampVolume(volume);
  if (v <= 0) return 0;
  return Math.min(1, config.masterGain * v * v * (config.trackGain[track] ?? 1));
}

/** A volume setting kept in 0..1 (anything else: the default). */
export function clampVolume(volume: unknown, fallback: number = MUSIC_CONFIG.defaultVolume): number {
  if (typeof volume !== 'number' || !Number.isFinite(volume)) return fallback;
  return Math.min(1, Math.max(0, volume));
}

/** A volume on the slider's steps (5%), so a drag saves only when it reaches another step. */
export function stepVolume(volume: number, step: number = MUSIC_CONFIG.volumeStep): number {
  const v = clampVolume(volume, 0);
  return Math.round(Math.round(v / step) * step * 100) / 100;
}

/** The slider's whole percent (0..100). */
export const volumePercent = (volume: number): number => Math.round(clampVolume(volume, 0) * 100);

/**
 * The ranked search's scene (/match): the lobby while searching (and on its timeout, its failure or once it is
 * called off), silence from "found" on: the VS screen, 3… 2… 1… and GO! have their own sounds.
 */
export function matchSceneOf(phase: string): MusicScene {
  return phase === 'found' || phase === 'countdown' || phase === 'started' ? SILENCE : LOBBY;
}

/**
 * A friends room (/friends/room): the lobby while waiting, silence for its 3… 2… 1…, GO! and the moment after it
 * ('starting': the game is here, on its way to the game screen), so the lobby never comes back between the count
 * and the game.
 */
export function friendsRoomSceneOf(phase: string): MusicScene {
  return phase === 'countdown' || phase === 'starting' ? SILENCE : LOBBY;
}
