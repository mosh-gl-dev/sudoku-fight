import { LEVEL_KINDS } from '@sudoku-fight/engine';

import { MUSIC_CONFIG, MUSIC_TRACK_IDS } from '../../config/music';
import {
  clampVolume,
  emptyCellsOf,
  friendsRoomSceneOf,
  gameSceneOf,
  LOBBY,
  matchSceneOf,
  requestOf,
  routeMusicOf,
  routePatternOf,
  SILENCE,
  sceneOf,
  stageSceneOf,
  stepVolume,
  trackOf,
  volumePercent,
} from '../musicModel';

/** What plays where (config/music.ts), read by the pure model. */

/** A board with `empty` empty cells. */
const grid = (empty: number) => Array.from({ length: 81 }, (_, i) => (i < empty ? 0 : 1 + (i % 9)));
const running = (empty: number) => ({ status: 'running' as const, grid: grid(empty) });

describe('music model: routes', () => {
  it("reads a route's pattern as expo-router gives it", () => {
    expect(routePatternOf([])).toBe('/');
    expect(routePatternOf(['index'])).toBe('/');
    expect(routePatternOf(['levels', 'index'])).toBe('/levels');
    expect(routePatternOf(['levels', 'play'])).toBe('/levels/play');
    expect(routePatternOf(['results', '[id]'])).toBe('/results/[id]');
    expect(routePatternOf(['(tabs)', 'history'])).toBe('/history');
  });

  it('Home and the menus play the lobby', () => {
    for (const route of [
      '/',
      '/modes',
      '/game-type',
      '/bot-select',
      '/settings',
      '/history',
      '/leaderboard',
      '/achievements',
      '/edit-profile',
      '/player/[id]',
      '/friends/room',
      '/friends/join',
      '/levels',
      '/replay/[id]',
      '/match',
    ])
      expect([route, routeMusicOf(route)]).toEqual([route, 'lobby']);
  });

  it('the results, the developer tools, and the game and a stage before their claims are silent', () => {
    for (const route of ['/results/[id]', '/dev/sounds', '/dev', '/game', '/levels/play'])
      expect([route, routeMusicOf(route)]).toEqual([route, 'silence']);
  });

  it('the longest pattern wins, and a pattern covers only whole segments', () => {
    const config = { ...MUSIC_CONFIG, routes: { '/a': 'silence', '/a/b': 'lobby' } } as typeof MUSIC_CONFIG;
    expect(routeMusicOf('/a/b/c', config)).toBe('lobby');
    expect(routeMusicOf('/a/x', config)).toBe('silence');
    expect(routeMusicOf('/ab', config)).toBe('lobby');
  });

  it('the Splash is silent; a claim wins over the route', () => {
    expect(sceneOf({ pattern: '/', covered: true, claim: null })).toEqual(SILENCE);
    expect(sceneOf({ pattern: '/', covered: false, claim: null })).toEqual(LOBBY);
    const stage = stageSceneOf('chain', 'playing');
    expect(sceneOf({ pattern: '/levels/play', covered: false, claim: stage })).toBe(stage);
    expect(sceneOf({ pattern: '/levels/play', covered: true, claim: stage })).toEqual(SILENCE);
  });
});

describe('music model: tracks', () => {
  it('solo practice and the bot play the kibbitzer; ranked and friends the caper', () => {
    expect(trackOf(gameSceneOf('solo', running(40), false))).toBe('kibbitzer');
    expect(trackOf(gameSceneOf('bot', running(40), false))).toBe('kibbitzer');
    expect(trackOf(gameSceneOf('ranked', running(40), false))).toBe('caper');
    expect(trackOf(gameSceneOf('friends', running(40), false))).toBe('caper');
  });

  it(`ranked and friends turn to the final loop at ${MUSIC_CONFIG.finalAtEmptyCells} empty cells, and stay`, () => {
    const at = MUSIC_CONFIG.finalAtEmptyCells;
    expect(trackOf(gameSceneOf('ranked', running(at + 1), false))).toBe('caper');
    expect(trackOf(gameSceneOf('ranked', running(at), false))).toBe('caper_final');
    expect(trackOf(gameSceneOf('friends', running(1), false))).toBe('caper_final');
    // The latch: once reached, the final loop to the end.
    expect(trackOf(gameSceneOf('ranked', running(at + 5), true))).toBe('caper_final');
    // Practice has no final loop.
    expect(trackOf(gameSceneOf('solo', running(1), false))).toBe('kibbitzer');
    expect(trackOf(gameSceneOf('bot', running(1), true))).toBe('kibbitzer');
    expect(emptyCellsOf(grid(7))).toBe(7);
  });

  it('a game is silent before it runs (its count) and once it is over (the results carry it)', () => {
    expect(gameSceneOf('ranked', null, false)).toEqual(SILENCE);
    expect(gameSceneOf('ranked', { status: 'waiting', grid: grid(50) }, false)).toEqual(SILENCE);
    expect(gameSceneOf('ranked', { status: 'over', grid: grid(0) }, true)).toEqual(SILENCE);
    expect(trackOf(gameSceneOf('solo', { status: 'paused', grid: grid(30) }, false))).toBe('kibbitzer');
  });

  it('each staged-practice kind has a cue; the fill kinds share one, find and duel borrow one (no cue passed)', () => {
    const cues = Object.fromEntries(LEVEL_KINDS.map((k) => [k, trackOf(stageSceneOf(k, 'playing'))]));
    expect(cues).toEqual({
      find: 'stage_spot',
      findDuel: 'stage_race',
      fillBox: 'stage_fill',
      fillRow: 'stage_fill',
      fillCol: 'stage_fill',
      duel: 'stage_race',
      spotError: 'stage_spot',
      pointHunter: 'stage_hunter',
      chain: 'stage_chain',
      puzzle: 'stage_puzzle',
    });
    for (const track of Object.values(cues)) expect(MUSIC_TRACK_IDS).toContain(track);
  });

  it('a stage run: the lobby on "איך משחקים", silence on "מוכן?" and the result, the cue while it plays', () => {
    expect(stageSceneOf('find', 'tutorial')).toEqual(LOBBY);
    expect(stageSceneOf('find', 'ready')).toEqual(SILENCE);
    expect(stageSceneOf('find', 'playing')).toEqual({ kind: 'stage', levelKind: 'find' });
    expect(stageSceneOf('find', 'result')).toEqual(SILENCE);
    expect(stageSceneOf('find', 'left')).toEqual(LOBBY);
  });

  it('the ranked search plays the lobby until "found"; a friends room until its count', () => {
    for (const phase of ['connecting', 'searching', 'timeout', 'failed', 'cancelled'])
      expect(matchSceneOf(phase)).toEqual(LOBBY);
    for (const phase of ['found', 'countdown', 'started']) expect(matchSceneOf(phase)).toEqual(SILENCE);
    expect(friendsRoomSceneOf('lobby')).toEqual(LOBBY);
    expect(friendsRoomSceneOf('opening')).toEqual(LOBBY);
    expect(friendsRoomSceneOf('countdown')).toEqual(SILENCE);
    // GO! and on its way to the game: the lobby does not come back between the count and the game.
    expect(friendsRoomSceneOf('starting')).toEqual(SILENCE);
  });
});

describe('music model: requests', () => {
  it("a stage's end fades out in 0.5 s; other changes cross-fade", () => {
    const stage = stageSceneOf('duel', 'playing');
    expect(requestOf(stage, SILENCE)).toEqual({
      track: null,
      fadeMs: MUSIC_CONFIG.stageEndFadeMs,
      delayMs: 0,
    });
    expect(requestOf(LOBBY, stage)).toEqual({
      track: 'stage_race',
      fadeMs: MUSIC_CONFIG.crossfadeMs,
      delayMs: MUSIC_CONFIG.startDelayMs.stage,
    });
    expect(requestOf(null, LOBBY)).toEqual({
      track: 'lobby',
      fadeMs: MUSIC_CONFIG.crossfadeMs,
      delayMs: MUSIC_CONFIG.startDelayMs.lobby,
    });
    expect(requestOf(SILENCE, gameSceneOf('ranked', running(40), false)).delayMs).toBe(
      MUSIC_CONFIG.startDelayMs.game,
    );
  });
});

describe('music model: the volume', () => {
  it('keeps a volume in 0..1 on 5% steps', () => {
    expect(clampVolume(2)).toBe(1);
    expect(clampVolume(-1)).toBe(0);
    expect(clampVolume('x')).toBe(MUSIC_CONFIG.defaultVolume);
    expect(stepVolume(0.62)).toBe(0.6);
    expect(stepVolume(0.63)).toBe(0.65);
    expect(stepVolume(0.01)).toBe(0);
    expect(volumePercent(0.35)).toBe(35);
  });
});
