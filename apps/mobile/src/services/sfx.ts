import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { AppState } from 'react-native';

import { useSettings } from '../state/settings';

/**
 * Sound effects (docs/design/motion.md §8, spec §22 "צליל ורטט"), on expo-audio.
 *
 * - Off while the "צליל" setting is off (persisted in `useSettings`); turning it off stops what is playing.
 * - The iOS silent switch mutes the game, and the player's own music keeps playing (mix with others).
 * - A sound always plays from its start. Each sound gets its own player, created once on first use
 *   (or by `preload`, then warmed up muted: see below); `count_tick` and `lock_tick` get two, so fast repeats
 *   don't cut each other off.
 * - At most 4 sounds at once: a UI tick that would be the fifth is dropped.
 * - Errors never reach the caller: feedback is optional. They are logged in development.
 *
 * Screens don't call this directly: they call `cue()` from ./feedback, which plays the sound and the haptic.
 */

/** Every sound of motion.md §8, by its file name. */
export const SOUND_IDS = [
  'cell_select',
  'cell_denied',
  'cell_release',
  'correct',
  'count_tick',
  'wrong',
  'lock_tick',
  'lead_take',
  'lead_lose',
  'arsenal_open',
  'interfere_launch',
  'hit_fireworks',
  'hit_cats',
  'hit_warp',
  'hit_scramble',
  'hit_ink',
  'hit_keypad',
  'react_laugh',
  'react_scream',
  'react_cool',
  'react_facepalm',
  'react_fire',
  'react_eyes',
  'react_pop',
  'match_found',
  'countdown_beat',
  'go',
  'win',
  'lose',
  'disconnect',
  'reconnect',
  'ui_tap',
] as const;

export type SoundId = (typeof SOUND_IDS)[number];

/**
 * The files. Until the final CC0 sounds arrive (motion.md §8), each one is a generated placeholder
 * (scripts/gen-placeholder-sounds.mjs, assets/sounds/README.md). Replacing one is a change of path here.
 * The CC0 candidates (assets/sounds/candidates) are auditioned on /dev/sounds and promoted as the README says.
 * Requires stay static so Metro bundles them.
 */
export const SOUND_SOURCES: Record<SoundId, number> = {
  cell_select: require('../../../../assets/sounds/placeholder/cell_select.wav') as number,
  cell_denied: require('../../../../assets/sounds/placeholder/cell_denied.wav') as number,
  cell_release: require('../../../../assets/sounds/placeholder/cell_release.wav') as number,
  correct: require('../../../../assets/sounds/placeholder/correct.wav') as number,
  count_tick: require('../../../../assets/sounds/placeholder/count_tick.wav') as number,
  wrong: require('../../../../assets/sounds/placeholder/wrong.wav') as number,
  lock_tick: require('../../../../assets/sounds/placeholder/lock_tick.wav') as number,
  lead_take: require('../../../../assets/sounds/placeholder/lead_take.wav') as number,
  lead_lose: require('../../../../assets/sounds/placeholder/lead_lose.wav') as number,
  arsenal_open: require('../../../../assets/sounds/placeholder/arsenal_open.wav') as number,
  interfere_launch: require('../../../../assets/sounds/placeholder/interfere_launch.wav') as number,
  hit_fireworks: require('../../../../assets/sounds/placeholder/hit_fireworks.wav') as number,
  hit_cats: require('../../../../assets/sounds/placeholder/hit_cats.wav') as number,
  hit_warp: require('../../../../assets/sounds/placeholder/hit_warp.wav') as number,
  hit_scramble: require('../../../../assets/sounds/placeholder/hit_scramble.wav') as number,
  hit_ink: require('../../../../assets/sounds/placeholder/hit_ink.wav') as number,
  hit_keypad: require('../../../../assets/sounds/placeholder/hit_keypad.wav') as number,
  react_laugh: require('../../../../assets/sounds/placeholder/react_laugh.wav') as number,
  react_scream: require('../../../../assets/sounds/placeholder/react_scream.wav') as number,
  react_cool: require('../../../../assets/sounds/placeholder/react_cool.wav') as number,
  react_facepalm: require('../../../../assets/sounds/placeholder/react_facepalm.wav') as number,
  react_fire: require('../../../../assets/sounds/placeholder/react_fire.wav') as number,
  react_eyes: require('../../../../assets/sounds/placeholder/react_eyes.wav') as number,
  react_pop: require('../../../../assets/sounds/placeholder/react_pop.wav') as number,
  match_found: require('../../../../assets/sounds/placeholder/match_found.wav') as number,
  countdown_beat: require('../../../../assets/sounds/placeholder/countdown_beat.wav') as number,
  go: require('../../../../assets/sounds/placeholder/go.wav') as number,
  win: require('../../../../assets/sounds/placeholder/win.wav') as number,
  lose: require('../../../../assets/sounds/placeholder/lose.wav') as number,
  disconnect: require('../../../../assets/sounds/placeholder/disconnect.wav') as number,
  reconnect: require('../../../../assets/sounds/placeholder/reconnect.wav') as number,
  ui_tap: require('../../../../assets/sounds/placeholder/ui_tap.wav') as number,
};

/** Starting volumes (motion.md §8); the final tuning is stage 14. Unlisted sounds play at DEFAULT_VOLUME. */
const DEFAULT_VOLUME = 0.7;
const VOLUME: Partial<Record<SoundId, number>> = {
  count_tick: 0.3,
  lock_tick: 0.3,
  ui_tap: 0.3,
  cell_select: 0.5,
  correct: 0.8,
  wrong: 0.8,
  react_laugh: 0.6,
  react_scream: 0.6,
  react_cool: 0.6,
  react_facepalm: 0.6,
  react_fire: 0.6,
  react_eyes: 0.6,
  react_pop: 0.6,
  hit_fireworks: 0.6,
  hit_cats: 0.6,
  hit_warp: 0.6,
  hit_scramble: 0.6,
  hit_ink: 0.6,
  hit_keypad: 0.6,
  win: 0.9,
  go: 0.9,
};

export const volumeOf = (id: SoundId): number => VOLUME[id] ?? DEFAULT_VOLUME;

/** Players per sound: two for the ticks that repeat fast (motion.md §8). */
export const voicesOf = (id: SoundId): number => (id === 'count_tick' || id === 'lock_tick' ? 2 : 1);

/**
 * The game's audio mode: the iOS silent switch mutes it, and the player's own music keeps playing (motion.md §8).
 * The sound audition screen (/dev/sounds) changes it while open and puts this back.
 */
export const GAME_AUDIO_MODE = { playsInSilentMode: false, interruptionMode: 'mixWithOthers' } as const;

/*
 * The first play of a player made ahead of time (`preload`). On Android a player made and left idle has its whole
 * short clip already handed to the audio track, stopped at its end, so after a moment it takes the clip as heard:
 * its first `play()` ends it at once, with no sound, and a seek to where it already is (0) is skipped (QA loop 3,
 * K2-first-game-GO). Loop 4 sent that first play 1 ms in (a real seek), which saved the long cues only (QA loop 6,
 * pregame-found-sound, apk10: the first "שחק" tap after a cold start and the first cell selection of the first
 * game were still silent): Android's player reads a WAV in chunks of ~100 ms, so `ui_tap` (45 ms) and
 * `cell_select` (60 ms) are one chunk, which starts a hair before 1 ms, and the player drops a chunk that starts
 * before where it was sent. dumpsys shows just that: the old track released by the seek, and no new one started.
 *
 * Two plays always work on the phone: one made as the player is made (the lazy way, inside `play`), and every
 * play after the first (a seek back from the end). So a player made ahead of time plays once at once, at volume 0,
 * where nobody hears it (the warm-up); its first real play is then a second play, at the sound's volume, from 0.
 * Nothing plays in the background, not even muted: a player made there is warmed by the next preload in the
 * foreground, and should none come first, its first play makes it again (the lazy way) instead.
 *
 * Once the muted play has ended, the player gets its own volume back right away, while nothing plays. Its first
 * real play then makes the very calls every later play makes (a seek to 0 and `play`, which expo-audio runs on the
 * UI thread while JS waits), so the first and the second play of a cue differ in nothing JS does. This came with
 * QA's fixcheck of APK 18 (warp-first-hit-150ms-freeze: with sound on, the first warp of a game froze the screen
 * ~150 ms, and the second warp did not). It is not shown to be that freeze's cause: on Android expo-audio's volume
 * setter only posts to the main queue (nothing waits for it). It takes one difference out of the first play while
 * the freeze is traced on the phone. Should the real play come before the warm-up has ended, that play puts the
 * volume back itself, as before.
 */

/** Sounds that are dropped first when 4 are already playing. */
const UI_TICKS: ReadonlySet<SoundId> = new Set<SoundId>(['count_tick', 'lock_tick', 'cell_select', 'ui_tap']);
export const MAX_CONCURRENT_SOUNDS = 4;

export interface Sfx {
  /** Plays a sound from its start, if sound is on and the app is in the foreground. */
  play(id: SoundId): void;
  /**
   * Creates the players ahead of time (the game screen, on mount), so the first play isn't late; each new one
   * plays once, muted (the warm-up above), so that its first real play is heard. Nothing while sound is off.
   */
  preload(ids?: readonly SoundId[]): void;
  /** Stops everything that is playing (sound turned off, the game screen unmounts). */
  stopAll(): void;
  /** Frees every player. The next play or preload starts over. */
  release(): void;
}

function report(error: unknown): void {
  if (__DEV__) console.warn('[sfx]', error);
}

/** Background or inactive: nothing plays (motion.md §7, same rule as haptics). */
function inForeground(): boolean {
  const state: unknown = AppState.currentState;
  return state !== 'background' && state !== 'inactive';
}

/** A fresh sound service. The app uses the `sfx` singleton below; tests make their own. */
export function createSfx(): Sfx {
  const players = new Map<SoundId, AudioPlayer[]>();
  const nextVoice = new Map<SoundId, number>();
  /** Players that were played at least once, muted or not (the others are cold: made ahead, in the background). */
  const played = new WeakSet<AudioPlayer>();
  /** Players in their muted warm-up: at volume 0 until it ends (see above) or their first real play. */
  const warming = new WeakSet<AudioPlayer>();
  /** What puts each warming player's volume back when its muted play ends; let go by `release`. */
  const settles = new Set<{ remove(): void }>();
  let ready = false;
  let unsubscribe: (() => void) | null = null;

  function setUp(): void {
    if (ready) return;
    ready = true;
    unsubscribe = useSettings.subscribe((now, before) => {
      if (before.sound && !now.sound) stopAll();
    });
    try {
      setAudioModeAsync(GAME_AUDIO_MODE).catch(report);
    } catch (error) {
      report(error);
    }
  }

  /**
   * Its own volume back once the muted play has ended, while nothing plays (the note above). A player without
   * status events (a stand-in) keeps the volume at 0 until its first real play, which puts it back.
   */
  function settleWhenWarm(id: SoundId, player: AudioPlayer): void {
    if (typeof player.addListener !== 'function') return;
    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (!status.didJustFinish) return;
      subscription.remove();
      settles.delete(subscription);
      if (warming.delete(player)) player.volume = volumeOf(id);
    });
    settles.add(subscription);
  }

  /** The muted first play of a player made ahead of time (the warm-up above). */
  function warmUp(id: SoundId, player: AudioPlayer): void {
    try {
      player.volume = 0;
      warming.add(player);
      settleWhenWarm(id, player);
      player.play();
      played.add(player);
    } catch (error) {
      report(error);
    }
  }

  function makePlayer(id: SoundId): AudioPlayer {
    const player = createAudioPlayer(SOUND_SOURCES[id], { keepAudioSessionActive: true });
    player.volume = volumeOf(id);
    return player;
  }

  function voices(id: SoundId, warm = false): AudioPlayer[] {
    const existing = players.get(id);
    if (existing) {
      // Made ahead in the background (left cold): warmed now, by a preload in the foreground.
      if (warm && inForeground()) existing.filter((p) => !played.has(p)).forEach((p) => warmUp(id, p));
      return existing;
    }
    setUp();
    const created = Array.from({ length: voicesOf(id) }, () => makePlayer(id));
    players.set(id, created);
    if (!warm) {
      // Made by its own first play: nothing handed to the track yet, so it plays from 0, whole (the lazy way).
      created.forEach((p) => played.add(p));
    } else if (inForeground()) {
      created.forEach((p) => warmUp(id, p));
    }
    return created;
  }

  /** A cold player (made ahead in the background, never warmed) made again for its first play: the lazy way. */
  function remade(id: SoundId, list: AudioPlayer[], i: number): AudioPlayer {
    const old = list[i]!;
    try {
      old.remove();
    } catch (error) {
      report(error);
    }
    const player = makePlayer(id);
    list[i] = player;
    return player;
  }

  /** Sounds being heard (a muted warm-up is not one). */
  function playingCount(): number {
    let n = 0;
    for (const list of players.values()) for (const p of list) if (p.playing && !warming.has(p)) n++;
    return n;
  }

  function play(id: SoundId): void {
    if (!useSettings.getState().sound || !inForeground()) return;
    try {
      const list = voices(id);
      if (UI_TICKS.has(id) && playingCount() >= MAX_CONCURRENT_SOUNDS) return;
      const i = nextVoice.get(id) ?? 0;
      nextVoice.set(id, (i + 1) % list.length);
      const player = played.has(list[i]!) ? list[i]! : remade(id, list, i);
      // Warmed (muted): its own volume back, and it plays from 0 (a seek back from where the warm-up left it).
      if (warming.delete(player)) player.volume = volumeOf(id);
      played.add(player);
      player.seekTo(0).catch(report);
      player.play();
    } catch (error) {
      report(error);
    }
  }

  function preload(ids: readonly SoundId[] = SOUND_IDS): void {
    // Sound off: nothing made ahead for sounds that will not play (each player is built on the UI thread while JS
    // waits; QA go-hold-joiner, loop 12: a game screen's 13, built under GO! with sound off, froze the phone over a
    // second). Turned on later, a play makes its player then (the lazy way), or the screen preloads again.
    if (!useSettings.getState().sound) return;
    try {
      for (const id of ids) voices(id, true);
    } catch (error) {
      report(error);
    }
  }

  function stopAll(): void {
    for (const list of players.values())
      for (const p of list) {
        try {
          if (p.playing) p.pause();
        } catch (error) {
          report(error);
        }
      }
  }

  function release(): void {
    for (const list of players.values())
      for (const p of list) {
        try {
          p.remove();
        } catch (error) {
          report(error);
        }
      }
    players.clear();
    nextVoice.clear();
    settles.forEach((s) => s.remove());
    settles.clear();
    unsubscribe?.();
    unsubscribe = null;
    ready = false;
  }

  return { play, preload, stopAll, release };
}

/** The app's sound service. */
export const sfx: Sfx = createSfx();
