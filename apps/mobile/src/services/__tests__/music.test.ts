import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppState, type AppStateStatus } from 'react-native';

import { MUSIC_CONFIG, MUSIC_TRACK_IDS } from '../../config/music';
import { musicGain } from '../../music/musicModel';
import { useSettings } from '../../state/settings';
import { createMusic, FADE_STEP_MS, type Music, MUSIC_SOURCES } from '../music';

/**
 * The music service (services/music.ts): one looping track, cross-fades with at most two players, the volume
 * setting applied live on its curve, 0 = off with every player let go, a pause in the background.
 */

interface MockPlayer {
  source: unknown;
  volume: number;
  loop: boolean;
  playing: boolean;
  removed: boolean;
  play: jest.Mock;
  pause: jest.Mock;
  remove: jest.Mock;
}

jest.mock('expo-audio', () => {
  const players: unknown[] = [];
  return {
    __players: players,
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
    createAudioPlayer: jest.fn((source: unknown) => {
      const player = {
        source,
        volume: 1,
        loop: false,
        playing: false,
        removed: false,
        play: jest.fn(() => {
          player.playing = true;
        }),
        pause: jest.fn(() => {
          player.playing = false;
        }),
        remove: jest.fn(() => {
          player.removed = true;
          player.playing = false;
        }),
      };
      players.push(player);
      return player;
    }),
  };
});

const audio = jest.requireMock<{
  __players: MockPlayer[];
  setAudioModeAsync: jest.Mock;
  createAudioPlayer: jest.Mock;
}>('expo-audio');

const alive = () => audio.__players.filter((p) => !p.removed);
const sourceOf = (track: keyof typeof MUSIC_SOURCES) => MUSIC_SOURCES[track];

let appStateListener: ((state: AppStateStatus) => void) | null = null;
let music: Music;

/** A service on Jest's fake clock; its idle moment comes at once (startup.ts whenIdle has its own tests). */
function make(): Music {
  return createMusic({
    idle: (task) => {
      task();
      return () => undefined;
    },
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  audio.__players.length = 0;
  audio.createAudioPlayer.mockClear();
  audio.setAudioModeAsync.mockClear();
  useSettings.setState({ musicVolume: 0.6, sound: true });
  appStateListener = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appStateListener = listener as (state: AppStateStatus) => void;
    return { remove: () => undefined } as ReturnType<typeof AppState.addEventListener>;
  });
  music = make();
});

afterEach(() => {
  music.release();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const gain = (track: Parameters<typeof musicGain>[1], v = 0.6) => musicGain(v, track);

describe('music: the files', () => {
  it('has a file for every track, in assets/music/app', () => {
    const files = readdirSync(resolve(__dirname, '..', '..', '..', '..', '..', 'assets', 'music', 'app'));
    for (const id of MUSIC_TRACK_IDS) {
      expect(MUSIC_SOURCES[id]).toBeDefined();
      expect(files).toContain(`${id}.m4a`);
    }
  });

  it('holds only the tracks: no master, spectrogram or cue that did not pass its gate is bundled', () => {
    const files = readdirSync(resolve(__dirname, '..', '..', '..', '..', '..', 'assets', 'music', 'app'));
    expect([...files].sort()).toEqual(MUSIC_TRACK_IDS.map((id) => `${id}.m4a`).sort());
  });
});

describe('music: playing', () => {
  it('starts nothing before it is asked, then one looping player after the delay and an idle moment', () => {
    expect(audio.createAudioPlayer).not.toHaveBeenCalled();
    music.play('lobby', { delayMs: 1000 });
    expect(music.wanted).toBe('lobby');
    jest.advanceTimersByTime(999);
    expect(audio.createAudioPlayer).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(audio.createAudioPlayer).toHaveBeenCalledTimes(1);
    expect(audio.createAudioPlayer).toHaveBeenCalledWith(sourceOf('lobby'), { keepAudioSessionActive: true });
    const [player] = audio.__players;
    expect(player!.loop).toBe(true);
    expect(player!.play).toHaveBeenCalledTimes(1);
    // The game's audio mode: mix with others, the iOS silent switch mutes it.
    expect(audio.setAudioModeAsync).toHaveBeenCalledWith({
      playsInSilentMode: false,
      interruptionMode: 'mixWithOthers',
    });
  });

  it('fades the new track in to the setting on its curve', () => {
    music.play('kibbitzer', { fadeMs: 800 });
    jest.advanceTimersByTime(1);
    const [player] = audio.__players;
    expect(player!.volume).toBe(0);
    jest.advanceTimersByTime(400);
    expect(player!.volume).toBeGreaterThan(0);
    expect(player!.volume).toBeLessThan(gain('kibbitzer'));
    jest.advanceTimersByTime(400 + FADE_STEP_MS);
    expect(player!.volume).toBeCloseTo(gain('kibbitzer'));
  });

  it('the same track asked again keeps playing, and a start still waiting is called off', () => {
    music.play('lobby');
    jest.advanceTimersByTime(1000);
    music.play('lobby', { delayMs: 500 });
    jest.advanceTimersByTime(2000);
    expect(audio.createAudioPlayer).toHaveBeenCalledTimes(1);
    music.play('caper', { delayMs: 1000 });
    jest.advanceTimersByTime(500);
    // Back to the lobby before the caper started: it never does.
    music.play('lobby');
    jest.advanceTimersByTime(2000);
    expect(audio.createAudioPlayer).toHaveBeenCalledTimes(1);
    expect(alive()).toHaveLength(1);
  });

  it('cross-fades: the old track fades out and is let go, at most two players alive', () => {
    music.play('lobby');
    jest.advanceTimersByTime(1000);
    music.play('kibbitzer', { fadeMs: 800 });
    jest.advanceTimersByTime(1);
    expect(alive()).toHaveLength(2);
    const [lobby, kibbitzer] = audio.__players;
    jest.advanceTimersByTime(400);
    expect(lobby!.volume).toBeLessThan(gain('lobby'));
    expect(kibbitzer!.volume).toBeGreaterThan(0);
    // A third track mid-fade: the one fading out goes at once, never three players.
    music.play('caper', { fadeMs: 800 });
    jest.advanceTimersByTime(1);
    expect(lobby!.removed).toBe(true);
    expect(alive()).toHaveLength(2);
    jest.advanceTimersByTime(1000);
    expect(kibbitzer!.removed).toBe(true);
    expect(alive().map((p) => p.source)).toEqual([sourceOf('caper')]);
  });

  it("silence fades the track out over the fade asked (a stage's end: 0.5 s) and lets its player go", () => {
    music.play('stage_spot');
    jest.advanceTimersByTime(1000);
    const [player] = audio.__players;
    music.play(null, { fadeMs: MUSIC_CONFIG.stageEndFadeMs });
    expect(music.wanted).toBeNull();
    jest.advanceTimersByTime(250);
    expect(player!.removed).toBe(false);
    expect(player!.volume).toBeLessThan(gain('stage_spot'));
    jest.advanceTimersByTime(250 + FADE_STEP_MS);
    expect(player!.removed).toBe(true);
    expect(alive()).toHaveLength(0);
  });

  it('never throws: a player that fails is reported in development, and nothing reaches the caller', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    audio.createAudioPlayer.mockImplementationOnce(() => {
      throw new Error('no player');
    });
    expect(() => {
      music.play('lobby');
      jest.advanceTimersByTime(1000);
    }).not.toThrow();
    expect(warn).toHaveBeenCalled();
  });

  it('a player made that fails to start is let go, not left behind', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    audio.createAudioPlayer.mockImplementationOnce((source: unknown) => {
      const player = {
        source,
        volume: 1,
        loop: false,
        playing: false,
        removed: false,
        play: jest.fn(() => {
          throw new Error('no start');
        }),
        pause: jest.fn(),
        remove: jest.fn(() => {
          player.removed = true;
        }),
      };
      audio.__players.push(player as unknown as MockPlayer);
      return player;
    });
    music.play('lobby');
    jest.advanceTimersByTime(1000);
    expect(audio.__players).toHaveLength(1);
    expect(alive()).toHaveLength(0);
    // Asked again, it is made again.
    music.play('kibbitzer');
    jest.advanceTimersByTime(1000);
    expect(alive().map((p) => p.source)).toEqual([sourceOf('kibbitzer')]);
  });
});

describe('music: the volume setting', () => {
  it('applies a change live, on the perceptual curve', () => {
    music.play('caper');
    jest.advanceTimersByTime(2000);
    const [player] = audio.__players;
    expect(player!.volume).toBeCloseTo(gain('caper', 0.6));
    useSettings.getState().setMusicVolume(0.3);
    expect(player!.volume).toBeCloseTo(gain('caper', 0.3));
    useSettings.getState().setMusicVolume(1);
    expect(player!.volume).toBeCloseTo(gain('caper', 1));
    expect(audio.createAudioPlayer).toHaveBeenCalledTimes(1);
  });

  it('0 is off: every player let go; up again, the track asked for comes back', () => {
    music.play('lobby');
    jest.advanceTimersByTime(1000);
    useSettings.getState().setMusicVolume(0);
    expect(alive()).toHaveLength(0);
    // Asked meanwhile: remembered, not played.
    music.play('kibbitzer', { delayMs: 0 });
    jest.advanceTimersByTime(2000);
    expect(audio.createAudioPlayer).toHaveBeenCalledTimes(1);
    useSettings.getState().setMusicVolume(0.4);
    jest.advanceTimersByTime(2000);
    expect(alive().map((p) => p.source)).toEqual([sourceOf('kibbitzer')]);
    expect(alive()[0]!.volume).toBeCloseTo(gain('kibbitzer', 0.4));
  });

  it('starts nothing while the setting is 0', () => {
    useSettings.setState({ musicVolume: 0 });
    music.play('lobby');
    jest.advanceTimersByTime(5000);
    expect(audio.createAudioPlayer).not.toHaveBeenCalled();
  });

  it('is independent of the sound effects switch', () => {
    useSettings.setState({ sound: false });
    music.play('lobby');
    jest.advanceTimersByTime(1000);
    expect(alive()).toHaveLength(1);
  });

  it('has a perceptual curve: 0 is silent, the default about −9 dB under 100%', () => {
    expect(musicGain(0, 'lobby')).toBe(0);
    expect(musicGain(1, 'lobby')).toBeCloseTo(MUSIC_CONFIG.masterGain);
    expect(musicGain(0.6, 'lobby') / musicGain(1, 'lobby')).toBeCloseTo(0.36);
    expect(musicGain(0.3, 'lobby')).toBeLessThan(musicGain(0.6, 'lobby') / 2);
  });
});

describe('music: the background', () => {
  it('pauses in the background, and fades back in on return', () => {
    music.play('kibbitzer');
    jest.advanceTimersByTime(2000);
    const [player] = audio.__players;
    appStateListener!('background');
    expect(player!.pause).toHaveBeenCalled();
    expect(player!.playing).toBe(false);
    appStateListener!('active');
    expect(player!.playing).toBe(true);
    expect(player!.volume).toBe(0);
    jest.advanceTimersByTime(MUSIC_CONFIG.resumeFadeMs + FADE_STEP_MS);
    expect(player!.volume).toBeCloseTo(gain('kibbitzer'));
    expect(audio.createAudioPlayer).toHaveBeenCalledTimes(1);
  });

  it('a start waiting when the app leaves waits for its return; a fade out going then ends at once', () => {
    music.play('lobby');
    jest.advanceTimersByTime(1000);
    music.play('caper', { delayMs: 1000 });
    music.play(null);
    music.play('caper', { delayMs: 1000 });
    appStateListener!('background');
    jest.advanceTimersByTime(5000);
    expect(alive()).toHaveLength(0);
    appStateListener!('active');
    jest.advanceTimersByTime(MUSIC_CONFIG.resumeFadeMs + FADE_STEP_MS);
    expect(alive().map((p) => p.source)).toEqual([sourceOf('caper')]);
  });

  it('at 0, the way back from the background starts nothing; up again in the foreground, the track comes', () => {
    music.play('lobby');
    jest.advanceTimersByTime(1000);
    useSettings.getState().setMusicVolume(0);
    appStateListener!('background');
    appStateListener!('active');
    jest.advanceTimersByTime(5000);
    expect(audio.createAudioPlayer).toHaveBeenCalledTimes(1);
    expect(alive()).toHaveLength(0);
    useSettings.getState().setMusicVolume(0.5);
    jest.advanceTimersByTime(MUSIC_CONFIG.resumeFadeMs + FADE_STEP_MS);
    expect(alive().map((p) => p.source)).toEqual([sourceOf('lobby')]);
  });

  it('release lets every player go', () => {
    music.play('lobby');
    jest.advanceTimersByTime(1000);
    music.release();
    expect(alive()).toHaveLength(0);
    expect(music.wanted).toBeNull();
  });
});
