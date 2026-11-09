import { cue, preloadCues } from '../feedback';
import { sfx } from '../sfx';
import { useSettings } from '../../state/settings';

/**
 * QA loop 3, K2-first-game-GO (apk9, two Galaxy A16, `dumpsys audio`): in the first ranked game after the launch
 * only 3 sounds started (the tap and 2 beats), against 5 in every later game (matchFound, 3 beats, GO). The
 * warm-up (screens/match/warmGame.ts) had made the matchFound, countdownBeat and go players seconds before, and
 * the players it made never started on their first play: only on the second (the "2" beat), which seeks back.
 *
 * The stand-in below plays as Android's player (expo-audio on media3) does with a short clip:
 * - made and left idle, it has handed its whole clip to the audio track and stopped it there: a moment later it
 *   takes the clip as heard (`drained`), and a play then ends it at once, with no sound;
 * - a seek to the position it is at (same ms) while it is ready does nothing;
 * - any other seek flushes the track (a fresh one, nothing heard yet); with play on, it starts.
 */

interface FakePlayer {
  volume: number;
  playing: boolean;
  /** "player piid:X event:started" in `dumpsys audio`, heard (above volume 0: not sfx's muted warm-up). */
  starts: number;
  play: jest.Mock;
  pause: jest.Mock;
  seekTo: jest.Mock;
  remove: jest.Mock;
  /** Idle for a moment after it was made: its clip is in the track, stopped at its end. */
  idle(): void;
}

jest.mock('expo-audio', () => {
  const players: unknown[] = [];
  return {
    __players: players,
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
    createAudioPlayer: jest.fn(() => {
      let state: 'ready' | 'ended' = 'ready';
      let positionMs = 0;
      let playWhenReady = false;
      let filled = true;
      let drained = false;
      const start = () => {
        if (drained) {
          state = 'ended';
          return;
        }
        if (player.volume > 0) player.starts++;
        state = 'ended';
        positionMs = 300;
        drained = true;
      };
      const player = {
        volume: 1,
        playing: false,
        starts: 0,
        play: jest.fn(() => {
          if (playWhenReady) return;
          playWhenReady = true;
          if (state === 'ready') start();
        }),
        pause: jest.fn(() => {
          playWhenReady = false;
        }),
        seekTo: jest.fn((seconds: number) => {
          const ms = Math.round(seconds * 1000);
          if (state === 'ready' && ms === positionMs) return Promise.resolve();
          positionMs = ms;
          state = 'ready';
          drained = false;
          filled = false;
          if (playWhenReady) start();
          return Promise.resolve();
        }),
        remove: jest.fn(),
        idle: () => {
          if (state === 'ready' && filled && !playWhenReady) drained = true;
        },
      };
      players.push(player);
      return player;
    }),
  };
});

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy', Soft: 'soft', Rigid: 'rigid' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

const audio = jest.requireMock<{ __players: FakePlayer[] }>('expo-audio');
const starts = () => audio.__players.reduce((n, p) => n + p.starts, 0);

beforeEach(() => {
  audio.__players.length = 0;
  useSettings.setState({ sound: true, haptics: false });
});

afterEach(() => {
  sfx.release();
});

describe('sfx: the first play of a player made ahead of time', () => {
  it('the first ranked game: the warm-up made the flow players during the search, and all 5 sounds start', () => {
    // warmGame.ts: the flow's three, made during the search, then idle while the search goes on.
    preloadCues(['matchFound', 'countdownBeat', 'go']);
    audio.__players.forEach((p) => p.idle());
    cue('matchFound');
    cue('countdownBeat');
    cue('countdownBeat');
    cue('countdownBeat');
    cue('go');
    expect(starts()).toBe(5); // was 2 (the "2" and "1" beats): dumpsys audio, QA loop 3
  });

  it('a preloaded player starts on its first play, and on every later one', () => {
    sfx.preload(['correct']);
    const [player] = audio.__players;
    player!.idle();
    sfx.play('correct');
    expect(player!.starts).toBe(1);
    // Warmed as it was made (a muted play, QA loop 6), so its first real play seeks back from the end, to 0.
    expect(player!.seekTo).toHaveBeenNthCalledWith(1, 0);
    expect(player!.volume).toBe(0.8);
    sfx.play('correct');
    sfx.play('correct');
    expect(player!.starts).toBe(3);
    expect(player!.seekTo).toHaveBeenLastCalledWith(0);
  });

  it('a player made by its own first play still starts (the lazy way)', () => {
    sfx.play('go');
    sfx.play('go');
    expect(audio.__players).toHaveLength(1);
    expect(audio.__players[0]!.starts).toBe(2);
  });

  it('both voices of a fast tick start on their first play', () => {
    sfx.preload(['count_tick']);
    audio.__players.forEach((p) => p.idle());
    sfx.play('count_tick');
    sfx.play('count_tick');
    expect(audio.__players.map((p) => p.starts)).toEqual([1, 1]);
  });

  it('released and made again: the new player gets the first-play start too', () => {
    sfx.preload(['win']);
    sfx.release();
    sfx.preload(['win']);
    const fresh = audio.__players[1]!;
    fresh.idle();
    sfx.play('win');
    expect(fresh.starts).toBe(1);
  });
});
