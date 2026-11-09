import { AppState } from 'react-native';

import { cue, GAME_CUES, preloadCues } from '../feedback';
import { MAX_CONCURRENT_SOUNDS, SOUND_SOURCES, type SoundId, sfx } from '../sfx';
import { useSettings } from '../../state/settings';

/**
 * QA loop 6, pregame-found-sound (apk10, Galaxy A16, `dumpsys audio`): after a cold start the first "שחק" tap
 * (`ui_tap`, its player made by Home's warm-up 13 s before) and the first cell selection of the first game
 * (`cell_select`, made by the game's warm-up) never started, while the long countdown cues, first played the same
 * way (loop 4: a first play sent 1 ms in), did. The seek released the old track, and no new one started.
 *
 * The stand-in plays as Android's player (expo-audio on media3) does with these clips:
 * - made and left idle, it has handed its whole clip to the audio track and stopped it there: a moment later it
 *   takes the clip as heard (`drained`), and a play then ends it at once, with no sound;
 * - a seek to the position it is at (same ms) while it is ready does nothing;
 * - a WAV is read in chunks of 100 ms, and after a seek the first chunk starts on the sample at or before the
 *   position asked; a chunk that starts before it is dropped (1 ms is 22.05 samples at 22050 Hz: it starts at
 *   0.998 ms). A 45 ms or 60 ms clip is one chunk, so nothing is left to play; a 380 ms clip loses its head;
 * - a play right after it was made (the lazy way) and every play after a seek back from the end are heard whole.
 */

/** The clips' lengths, ms (assets/sounds/placeholder, 22050 Hz mono). */
const CLIP_MS: Partial<Record<SoundId, number>> = {
  ui_tap: 45,
  cell_select: 60,
  count_tick: 30,
  correct: 380,
  match_found: 380,
  countdown_beat: 260,
  go: 390,
};
const CHUNK_MS = 100;
const SAMPLE_RATE = 22050;

interface Heard {
  volume: number;
  /** Where in the clip the sound began, ms. */
  fromMs: number;
}

interface FakePlayer {
  source: unknown;
  volume: number;
  playing: boolean;
  /** Track starts with something to play ("event:started"), at whatever volume. */
  heard: Heard[];
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
    __clipMs: { current: (_source: unknown): number => 100 },
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
    createAudioPlayer: jest.fn((source: unknown) => {
      const audio = jest.requireMock<{ __clipMs: { current: (s: unknown) => number } }>('expo-audio');
      const clipMs = audio.__clipMs.current(source);
      let state: 'ready' | 'ended' = 'ready';
      /** Where the next chunk starts, ms; null: nothing left to play. */
      let nextChunkMs: number | null = 0;
      let positionMs = 0;
      let playWhenReady = false;
      let drained = false;
      const start = () => {
        state = 'ended';
        player.playing = false;
        if (drained || nextChunkMs === null || nextChunkMs >= clipMs) return;
        player.heard.push({ volume: player.volume, fromMs: nextChunkMs });
        drained = true;
        positionMs = clipMs;
      };
      const player = {
        source,
        volume: 1,
        playing: false,
        heard: [] as Heard[],
        play: jest.fn(() => {
          if (playWhenReady && state === 'ready') return;
          playWhenReady = true;
          if (state === 'ready') start();
        }),
        pause: jest.fn(() => {
          playWhenReady = false;
          player.playing = false;
        }),
        seekTo: jest.fn((seconds: number) => {
          const ms = Math.round(seconds * 1000);
          if (state === 'ready' && ms === positionMs) return Promise.resolve();
          positionMs = ms;
          state = 'ready';
          drained = false;
          // The chunk from the sample at or before `ms`: dropped if it starts before `ms`.
          const chunkStart = Math.floor((ms * SAMPLE_RATE) / 1000) / (SAMPLE_RATE / 1000);
          nextChunkMs = chunkStart < ms ? chunkStart + CHUNK_MS : chunkStart;
          if (playWhenReady) start();
          return Promise.resolve();
        }),
        remove: jest.fn(),
        idle: () => {
          if (state === 'ready' && !playWhenReady) drained = true;
        },
      };
      players.push(player);
      return player;
    }),
  };
});

// Each clip its own source (Jest's asset stub makes every file `1`), so a player tells which sound it plays.
jest.mock('../../../../../assets/sounds/placeholder/ui_tap.wav', () => 'ui_tap');
jest.mock('../../../../../assets/sounds/placeholder/cell_select.wav', () => 'cell_select');
jest.mock('../../../../../assets/sounds/placeholder/count_tick.wav', () => 'count_tick');
jest.mock('../../../../../assets/sounds/placeholder/correct.wav', () => 'correct');
jest.mock('../../../../../assets/sounds/placeholder/match_found.wav', () => 'match_found');
jest.mock('../../../../../assets/sounds/placeholder/countdown_beat.wav', () => 'countdown_beat');
jest.mock('../../../../../assets/sounds/placeholder/go.wav', () => 'go');

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy', Soft: 'soft', Rigid: 'rigid' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

const audio = jest.requireMock<{
  __players: FakePlayer[];
  __clipMs: { current: (source: unknown) => number };
}>('expo-audio');
audio.__clipMs.current = (source) => CLIP_MS[source as SoundId] ?? 200;

const playerOf = (id: SoundId) => audio.__players.find((p) => p.source === SOUND_SOURCES[id])!;
/** What a person hears: starts at a volume above 0. */
const heardOf = (id: SoundId) => playerOf(id).heard.filter((h) => h.volume > 0);
const idleAll = () => audio.__players.forEach((p) => p.idle());

beforeEach(() => {
  audio.__players.length = 0;
  useSettings.setState({ sound: true, haptics: false });
});

afterEach(() => {
  sfx.release();
  jest.restoreAllMocks();
});

describe('sfx: the warm-up of a player made ahead of time (QA loop 6)', () => {
  it('a cold start: Home made the tap\'s player, and the first "שחק" tap is heard, whole', () => {
    // warmModes.ts: PRESS_CUES, on a settled Home; the tap comes seconds later.
    preloadCues(['primaryPress']);
    idleAll();
    cue('primaryPress');
    expect(heardOf('ui_tap')).toEqual([{ volume: 0.3, fromMs: 0 }]); // was [] (dumpsys: no start)
    cue('primaryPress');
    expect(heardOf('ui_tap')).toHaveLength(2);
  });

  it('the first game: the first cell selection is heard', () => {
    // warmGame.ts makes the game screen's players during the search; GameScreen preloads them again as it mounts.
    preloadCues(GAME_CUES);
    preloadCues();
    idleAll();
    cue('cellSelect');
    expect(heardOf('cell_select')).toEqual([{ volume: 0.5, fromMs: 0 }]); // was []
  });

  it('the warm-up itself is never heard: it plays at volume 0, and the sound keeps its own volume', () => {
    preloadCues(['primaryPress', 'cellSelect', 'correct']);
    for (const id of ['ui_tap', 'cell_select', 'correct'] as const) {
      expect(playerOf(id).heard).toEqual([{ volume: 0, fromMs: 0 }]);
      expect(heardOf(id)).toEqual([]);
    }
    idleAll();
    cue('correct');
    expect(playerOf('correct').volume).toBe(0.8);
    expect(heardOf('correct')).toEqual([{ volume: 0.8, fromMs: 0 }]);
  });

  it('a long cue made ahead is heard from its start, not from its second chunk', () => {
    preloadCues(['matchFound', 'countdownBeat', 'go']);
    idleAll();
    cue('matchFound');
    cue('countdownBeat');
    cue('countdownBeat');
    cue('countdownBeat');
    cue('go');
    expect(heardOf('match_found')).toEqual([{ volume: 0.7, fromMs: 0 }]); // was fromMs 100
    expect(heardOf('countdown_beat').map((h) => h.fromMs)).toEqual([0, 0, 0]);
    expect(heardOf('go')).toEqual([{ volume: 0.9, fromMs: 0 }]);
  });

  it('both voices of a fast tick are warmed, and each is heard on its first play', () => {
    sfx.preload(['count_tick']);
    idleAll();
    sfx.play('count_tick');
    sfx.play('count_tick');
    expect(audio.__players.map((p) => p.heard.filter((h) => h.volume > 0).length)).toEqual([1, 1]);
  });

  it('a player made by its own first play is not warmed: it plays at once, at its volume', () => {
    sfx.play('ui_tap');
    expect(playerOf('ui_tap').heard).toEqual([{ volume: 0.3, fromMs: 0 }]);
    expect(playerOf('ui_tap').play).toHaveBeenCalledTimes(1);
  });

  it('muted warm-ups do not count against the sounds at once: a tap right after is still played', () => {
    // A stand-in whose plays run on (`playing` stays on), as warm-ups do for a moment.
    preloadCues(GAME_CUES);
    audio.__players.forEach((p) => {
      p.playing = true;
    });
    expect(audio.__players.length).toBeGreaterThan(MAX_CONCURRENT_SOUNDS);
    const before = playerOf('cell_select').play.mock.calls.length;
    cue('cellSelect');
    expect(playerOf('cell_select').play.mock.calls.length).toBe(before + 1);
    expect(playerOf('cell_select').volume).toBe(0.5);
  });

  /** `preload` as the app is in the background (Home's or the game's warm-up as the phone is put away). */
  const preloadInBackground = (ids: SoundId[]) => {
    const original = Object.getOwnPropertyDescriptor(AppState, 'currentState')!;
    Object.defineProperty(AppState, 'currentState', { value: 'background', configurable: true });
    try {
      sfx.preload(ids);
    } finally {
      Object.defineProperty(AppState, 'currentState', original);
    }
  };

  it('in the background nothing plays, not even muted; back in front, the first tap is still heard', () => {
    preloadInBackground(['ui_tap', 'cell_select', 'correct']);
    expect(audio.__players.every((p) => p.play.mock.calls.length === 0)).toBe(true);
    idleAll();
    // Its first play makes the player again (the lazy way), so even a 45 ms clip is heard whole.
    cue('primaryPress');
    cue('cellSelect');
    cue('correct');
    const heard = (id: SoundId) =>
      audio.__players
        .filter((p) => p.source === SOUND_SOURCES[id])
        .flatMap((p) => p.heard.filter((h) => h.volume > 0));
    expect(heard('ui_tap')).toEqual([{ volume: 0.3, fromMs: 0 }]); // was [] (a seek to 1 ms: nothing left)
    expect(heard('cell_select')).toEqual([{ volume: 0.5, fromMs: 0 }]); // was []
    expect(heard('correct')).toEqual([{ volume: 0.8, fromMs: 0 }]); // was fromMs 100
    // The cold player was let go, not left behind.
    const tapPlayers = audio.__players.filter((p) => p.source === SOUND_SOURCES.ui_tap);
    expect(tapPlayers).toHaveLength(2);
    expect(tapPlayers[0]!.remove).toHaveBeenCalled();
    cue('primaryPress');
    expect(heard('ui_tap')).toHaveLength(2);
    expect(audio.__players.filter((p) => p.source === SOUND_SOURCES.ui_tap)).toHaveLength(2);
  });

  it('a player made in the background is warmed by the next preload in the foreground', () => {
    preloadInBackground(['ui_tap']);
    sfx.preload(['ui_tap']);
    expect(playerOf('ui_tap').heard).toEqual([{ volume: 0, fromMs: 0 }]);
    idleAll();
    cue('primaryPress');
    expect(audio.__players.filter((p) => p.source === SOUND_SOURCES.ui_tap)).toHaveLength(1);
    expect(heardOf('ui_tap')).toEqual([{ volume: 0.3, fromMs: 0 }]);
    // Warmed once only: a later preload plays nothing more.
    sfx.preload(['ui_tap']);
    expect(playerOf('ui_tap').heard).toHaveLength(2);
  });
});
