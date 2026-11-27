import { MUSIC_CONFIG } from '../../config/music';
import type { GameStoreState } from '../../game/gameStore';
import { LOBBY, SILENCE, stageSceneOf } from '../musicModel';
import { claimMusicScene, claimOf, newClaimOwner, releaseMusicScene, useMusicScenes } from '../musicScene';
import { createGameMusic, musicModeOf } from '../useGameMusic';

/** The screens' claims (musicScene.ts), and the game screen's scene as its store changes (useGameMusic.ts). */

beforeEach(() => useMusicScenes.setState({ claims: {} }));

describe('music claims', () => {
  it("a route's claim is read for that route only, and goes with its owner", () => {
    const a = newClaimOwner();
    claimMusicScene('/game', LOBBY, a);
    expect(claimOf(useMusicScenes.getState().claims, '/game')).toEqual(LOBBY);
    expect(claimOf(useMusicScenes.getState().claims, '/results/[id]')).toBeNull();
    releaseMusicScene('/game', a);
    expect(claimOf(useMusicScenes.getState().claims, '/game')).toBeNull();
  });

  it("a newer screen's claim is not cleared by an older one leaving", () => {
    const older = newClaimOwner();
    const newer = newClaimOwner();
    claimMusicScene('/levels/play', SILENCE, older);
    claimMusicScene('/levels/play', stageSceneOf('chain', 'playing'), newer);
    releaseMusicScene('/levels/play', older);
    expect(claimOf(useMusicScenes.getState().claims, '/levels/play')).toEqual(
      stageSceneOf('chain', 'playing'),
    );
  });

  it('an unchanged claim is not written again', () => {
    const owner = newClaimOwner();
    claimMusicScene('/match', LOBBY, owner);
    const before = useMusicScenes.getState().claims;
    claimMusicScene('/match', { kind: 'lobby' }, owner);
    expect(useMusicScenes.getState().claims).toBe(before);
  });
});

type Slice = Pick<GameStoreState, 'session' | 'online' | 'view'>;

const grid = (empty: number) => Array.from({ length: 81 }, (_, i) => (i < empty ? 0 : 1));
const view = (gameId: string, empty: number, status = 'running') =>
  ({ gameId, status, grid: grid(empty) }) as unknown as GameStoreState['view'];
const practice = (mode: 'solo' | 'bot') => ({ mode }) as unknown as GameStoreState['session'];
const online = (isFriends: boolean) => ({ isFriends }) as unknown as GameStoreState['online'];

describe('the game screen music', () => {
  it('reads the mode: a practice its own, an online game ranked or friends', () => {
    expect(musicModeOf({ session: practice('solo'), online: null })).toBe('solo');
    expect(musicModeOf({ session: practice('bot'), online: null })).toBe('bot');
    expect(musicModeOf({ session: null, online: online(false) })).toBe('ranked');
    expect(musicModeOf({ session: null, online: online(true) })).toBe('friends');
    expect(musicModeOf({ session: null, online: null })).toBeNull();
  });

  it('a ranked game: silence until its snapshot, the caper, the final loop near the end (latched), silence at the end', () => {
    const sceneOf = createGameMusic();
    const game = online(false);
    const at = MUSIC_CONFIG.finalAtEmptyCells;
    const s = (v: Slice['view']): Slice => ({ session: null, online: game, view: v });
    expect(sceneOf(s(null))).toEqual(SILENCE);
    expect(sceneOf(s(view('g1', 50, 'waiting')))).toEqual(SILENCE);
    expect(sceneOf(s(view('g1', 50)))).toEqual({ kind: 'game', mode: 'ranked', final: false });
    expect(sceneOf(s(view('g1', at)))).toEqual({ kind: 'game', mode: 'ranked', final: true });
    // A cell emptied again (never in a real game; the latch holds the end anyway).
    expect(sceneOf(s(view('g1', at + 3)))).toEqual({ kind: 'game', mode: 'ranked', final: true });
    expect(sceneOf(s(view('g1', 0, 'over')))).toEqual(SILENCE);
  });

  it('a new game starts without the latch', () => {
    const sceneOf = createGameMusic();
    const first = online(true);
    sceneOf({ session: null, online: first, view: view('g1', 3) });
    const second = online(true);
    expect(sceneOf({ session: null, online: second, view: view('g2', 40) })).toEqual({
      kind: 'game',
      mode: 'friends',
      final: false,
    });
  });

  it('no game: no claim', () => {
    expect(createGameMusic()({ session: null, online: null, view: null })).toBeNull();
  });
});
