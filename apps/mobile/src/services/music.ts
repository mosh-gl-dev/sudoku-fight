import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { AppState, type AppStateStatus } from 'react-native';

import { MUSIC_CONFIG, type MusicConfig, type MusicTrackId } from '../config/music';
import { clampVolume, musicGain } from '../music/musicModel';
import { useSettings } from '../state/settings';
import { GAME_AUDIO_MODE } from './sfx';
import { whenIdle } from './startup';

/**
 * The music (config/music.ts; spec §22, D-row "מוזיקה"), on expo-audio, beside the sound effects (sfx.ts).
 *
 * - One looping track at a time. A change cross-fades (config.crossfadeMs): the old track fades out while the new
 *   one fades in, so at most two players are alive, and only during a fade. Silence fades the track out and lets
 *   its player go.
 * - A new track starts `delayMs` after it was asked for, then on an idle moment: its player is made on the UI
 *   thread while JS waits (sfx.ts, warmModes.ts), so never inside a screen's entrance or under GO!. A newer
 *   request meanwhile replaces it; the same track asked again keeps playing, from where it is.
 * - The volume is the "מוזיקה" setting (useSettings.musicVolume, 0..1) on a perceptual curve (musicGain),
 *   applied live, while the slider moves. 0 is off: nothing plays and every player is let go; the track asked
 *   for starts again (faded in) once the volume is up. The "צליל" switch is the sound effects' only.
 * - Background or inactive: the track pauses, and comes back (faded in) in the foreground.
 * - The audio mode is the game's (sfx GAME_AUDIO_MODE): the iOS silent switch mutes it, and the player's own
 *   music keeps playing (mix with others).
 * - Errors never reach the caller: music is optional. They are logged in development.
 */

/**
 * The files. Static requires, so Metro bundles them. All are made with tools/music; the masters and their
 * spectrograms stay in assets/music/candidates (never bundled), and a cue's app copy (AAC-LC 160 kb/s) is put in
 * assets/music/app only once it passes its gate (assets/music/README.md).
 */
export const MUSIC_SOURCES: Record<MusicTrackId, number> = {
  lobby: require('../../../../assets/music/app/lobby.m4a') as number,
  kibbitzer: require('../../../../assets/music/app/kibbitzer.m4a') as number,
  caper: require('../../../../assets/music/app/caper.m4a') as number,
  caper_final: require('../../../../assets/music/app/caper_final.m4a') as number,
  stage_find: require('../../../../assets/music/app/stage_find.m4a') as number,
  stage_race: require('../../../../assets/music/app/stage_race.m4a') as number,
  stage_fill: require('../../../../assets/music/app/stage_fill.m4a') as number,
  stage_spot: require('../../../../assets/music/app/stage_spot.m4a') as number,
  stage_hunter: require('../../../../assets/music/app/stage_hunter.m4a') as number,
  stage_chain: require('../../../../assets/music/app/stage_chain.m4a') as number,
  stage_puzzle: require('../../../../assets/music/app/stage_puzzle.m4a') as number,
  stage_duel: require('../../../../assets/music/app/stage_duel.m4a') as number,
};

/** How often a fade moves the volume (each move only posts to the player). */
export const FADE_STEP_MS = 50;

export interface MusicOptions {
  /** The fade, out of the old track and into the new one (config.crossfadeMs by default). */
  fadeMs?: number;
  /** How long before a new track starts (0 by default; config.startDelayMs is the director's). */
  delayMs?: number;
}

export interface Music {
  /** Asks for a track (null: silence). See above. */
  play(track: MusicTrackId | null, options?: MusicOptions): void;
  /** The track asked for (null: silence), playing or not (volume 0, the background, its start still waiting). */
  readonly wanted: MusicTrackId | null;
  /** Lets every player go and stops listening; the next play starts over. */
  release(): void;
}

/** What the service runs on: the app's by default, a test's clock and timers. */
export interface MusicDeps {
  now?: () => number;
  setTimer?: (task: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  /** Runs a task on an idle moment; returns what calls it off. */
  idle?: (task: () => void) => () => void;
  config?: MusicConfig;
}

function report(error: unknown): void {
  if (__DEV__) console.warn('[music]', error);
}

const inForegroundState = (state: AppStateStatus | string | null | undefined): boolean =>
  state !== 'background' && state !== 'inactive';

/** A track's player and its fade: `level` (0..1) is how far in it is; its volume is level × the setting's gain. */
interface Voice {
  track: MusicTrackId;
  player: AudioPlayer;
  level: number;
  fade: { from: number; to: number; startAt: number; ms: number; then?: () => void } | null;
}

/** A fresh music service. The app uses the `music` singleton below; tests make their own. */
export function createMusic(deps: MusicDeps = {}): Music {
  const config = deps.config ?? MUSIC_CONFIG;
  const now = deps.now ?? (() => Date.now());
  const setTimer = deps.setTimer ?? ((task: () => void, ms: number) => setTimeout(task, ms));
  const clearTimer = deps.clearTimer ?? ((h: unknown) => clearTimeout(h as ReturnType<typeof setTimeout>));
  const idle = deps.idle ?? ((task: () => void) => whenIdle(task));

  /** The track playing (or fading in). */
  let current: Voice | null = null;
  /** The track fading out (a cross-fade's old one, or the way to silence). */
  let outgoing: Voice | null = null;
  let wanted: MusicTrackId | null = null;
  let volume = clampVolume(useSettings.getState().musicVolume);
  let foreground = inForegroundState(AppState.currentState);
  let pending: { timer: unknown; cancelIdle: (() => void) | null } | null = null;
  let ticker: unknown = null;
  let ready = false;
  let modeSet = false;
  let stops: (() => void)[] = [];

  function setUp(): void {
    if (ready) return;
    ready = true;
    volume = clampVolume(useSettings.getState().musicVolume);
    foreground = inForegroundState(AppState.currentState);
    const unsubscribe = useSettings.subscribe((s, before) => {
      if (s.musicVolume !== before.musicVolume) setVolume(s.musicVolume);
    });
    let subscription: { remove(): void } | null = null;
    try {
      subscription = AppState.addEventListener('change', onAppState);
    } catch (error) {
      report(error);
    }
    stops = [unsubscribe, () => subscription?.remove()];
  }

  function applyVolume(voice: Voice): void {
    try {
      voice.player.volume = voice.level * musicGain(volume, voice.track, config);
    } catch (error) {
      report(error);
    }
  }

  function drop(voice: Voice | null): void {
    if (!voice) return;
    voice.fade = null;
    try {
      voice.player.pause();
    } catch (error) {
      report(error);
    }
    try {
      voice.player.remove();
    } catch (error) {
      report(error);
    }
  }

  function dropOutgoing(): void {
    drop(outgoing);
    outgoing = null;
  }

  function dropAll(): void {
    cancelPending();
    dropOutgoing();
    drop(current);
    current = null;
    stopTicker();
  }

  function stopTicker(): void {
    if (ticker === null) return;
    clearTimer(ticker);
    ticker = null;
  }

  function tick(): void {
    ticker = null;
    const t = now();
    let moving = false;
    for (const voice of [current, outgoing]) {
      if (!voice?.fade) continue;
      const { from, to, startAt, ms, then } = voice.fade;
      const k = ms <= 0 ? 1 : Math.min(1, (t - startAt) / ms);
      voice.level = from + (to - from) * k;
      applyVolume(voice);
      if (k >= 1) {
        voice.fade = null;
        then?.();
      } else moving = true;
    }
    if (moving) ticker = setTimer(tick, FADE_STEP_MS);
  }

  function fade(voice: Voice, to: number, ms: number, then?: () => void): void {
    if (ms <= 0) {
      voice.fade = null;
      voice.level = to;
      applyVolume(voice);
      then?.();
      return;
    }
    voice.fade = { from: voice.level, to, startAt: now(), ms, then };
    if (ticker === null) ticker = setTimer(tick, FADE_STEP_MS);
  }

  /** The current track fades out and goes (the old one of a cross-fade, or the way to silence). */
  function fadeOutCurrent(ms: number): void {
    if (!current) return;
    dropOutgoing();
    const leaving = current;
    current = null;
    outgoing = leaving;
    fade(leaving, 0, ms, () => {
      if (outgoing === leaving) outgoing = null;
      drop(leaving);
    });
  }

  function cancelPending(): void {
    if (!pending) return;
    clearTimer(pending.timer);
    pending.cancelIdle?.();
    pending = null;
  }

  function setAudioMode(): void {
    if (modeSet) return;
    modeSet = true;
    try {
      setAudioModeAsync(GAME_AUDIO_MODE).catch(report);
    } catch (error) {
      report(error);
    }
  }

  /** Starts `track` now, fading in over `ms`, while the current one (if any) fades out. */
  function start(track: MusicTrackId, ms: number): void {
    if (wanted !== track || volume <= 0 || !foreground) return;
    if (current?.track === track) return;
    fadeOutCurrent(ms);
    let made: Voice | null = null;
    try {
      setAudioMode();
      const player = createAudioPlayer(MUSIC_SOURCES[track], { keepAudioSessionActive: true });
      made = { track, player, level: 0, fade: null };
      player.loop = true;
      applyVolume(made);
      player.play();
      current = made;
      fade(made, 1, ms);
    } catch (error) {
      report(error);
      // A player made but not started is let go, never left behind.
      if (made && current !== made) drop(made);
    }
  }

  /** `track` starts after `delayMs`, then on an idle moment (a newer request calls it off). */
  function schedule(track: MusicTrackId, ms: number, delayMs: number): void {
    cancelPending();
    const job: { timer: unknown; cancelIdle: (() => void) | null } = { timer: null, cancelIdle: null };
    pending = job;
    job.timer = setTimer(() => {
      if (pending !== job) return;
      job.cancelIdle = idle(() => {
        if (pending !== job) return;
        pending = null;
        start(track, ms);
      });
    }, delayMs);
  }

  function play(track: MusicTrackId | null, options: MusicOptions = {}): void {
    const ms = options.fadeMs ?? config.crossfadeMs;
    try {
      setUp();
      wanted = track;
      if (track === null) {
        cancelPending();
        fadeOutCurrent(ms);
        return;
      }
      if (current?.track === track) {
        // Asked again (the same track for another screen): it keeps playing; a start waiting is called off.
        cancelPending();
        return;
      }
      if (volume <= 0 || !foreground) {
        // Off, or away: nothing plays; it starts once the volume is up or the app is back.
        cancelPending();
        return;
      }
      schedule(track, ms, Math.max(0, options.delayMs ?? 0));
    } catch (error) {
      report(error);
    }
  }

  function setVolume(next: number): void {
    const before = volume;
    volume = clampVolume(next, 0);
    try {
      if (volume <= 0) {
        dropAll();
        return;
      }
      if (before <= 0) {
        // Back from off: the track asked for comes in (a short fade, on an idle moment).
        if (wanted && foreground) schedule(wanted, config.resumeFadeMs, 0);
        return;
      }
      if (current) applyVolume(current);
      if (outgoing) applyVolume(outgoing);
    } catch (error) {
      report(error);
    }
  }

  function onAppState(state: AppStateStatus): void {
    const front = inForegroundState(state);
    if (front === foreground) return;
    foreground = front;
    try {
      if (!front) {
        // Away: what was fading out goes, the track pauses where it is.
        cancelPending();
        dropOutgoing();
        stopTicker();
        if (current) {
          current.fade = null;
          current.level = 0;
          applyVolume(current);
          current.player.pause();
        }
        return;
      }
      if (!wanted || volume <= 0) return;
      if (current && current.track === wanted) {
        current.player.play();
        fade(current, 1, config.resumeFadeMs);
      } else {
        schedule(wanted, config.resumeFadeMs, 0);
      }
    } catch (error) {
      report(error);
    }
  }

  function release(): void {
    dropAll();
    stops.forEach((stop) => {
      try {
        stop();
      } catch (error) {
        report(error);
      }
    });
    stops = [];
    ready = false;
    modeSet = false;
    wanted = null;
  }

  return {
    play,
    get wanted() {
      return wanted;
    },
    release,
  };
}

/** The app's music service. */
export const music: Music = createMusic();
