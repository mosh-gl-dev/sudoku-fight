import type { GameMode, LevelKind } from '@sudoku-fight/engine';

/**
 * Music (spec §22 "צליל ורטט", D-row "מוזיקה", Moshe 26.11.2026: "צריך להיות אפשרות במשחק להחליש עד כיבוי את
 * המוזיקה בסקרול קטן. הכל בהגדרות"; "מנגינה שונה לכל סוג משחק" in staged practice; "במסך ראשי ... משהו ברקע").
 * What plays where, in one object, so a change is one line (CLAUDE.md). The files are our own, made with
 * tools/music (assets/music/app/<id>.m4a, seamless loops); services/music.ts plays them, music/musicModel.ts reads
 * this object, and music/MusicDirector.tsx applies it to the screen shown.
 */

/** Every track of the app, by its file name in assets/music/app. */
export const MUSIC_TRACK_IDS = [
  'lobby',
  'kibbitzer',
  'caper',
  'caper_final',
  'stage_find',
  'stage_race',
  'stage_fill',
  'stage_spot',
  'stage_hunter',
  'stage_chain',
  'stage_puzzle',
  'stage_duel',
] as const;

export type MusicTrackId = (typeof MUSIC_TRACK_IDS)[number];

/** What a route plays while no screen of it says otherwise (a claim, music/musicScene.ts). */
export type RouteMusic = 'lobby' | 'silence';

/** The game modes as music tells them apart: a friends room is a ranked game without ratings. */
export type MusicGameMode = GameMode | 'friends';

export const MUSIC_CONFIG = {
  /** The slider's starting place for a new install and for a record from before music (0..1). */
  defaultVolume: 0.6,
  /** The slider's step (5%): the setting is saved only when it reaches another step. */
  volumeStep: 0.05,
  /** A screen reader's increment and decrement (10%). */
  volumeA11yStep: 0.1,
  /**
   * The player's volume at 100%: the slider is perceptual (gain = masterGain × volume², about −9 dB at the
   * default 60%), and the music stays under the sound effects (motion.md §8, 0.3–0.9).
   */
  masterGain: 0.7,
  /** Each track's own trim, on top (1 when absent). The lobby's file is mastered ~4–5 dB quieter already. */
  trackGain: {} as Partial<Record<MusicTrackId, number>>,

  /** One track to the next: the old one fades out while the new one fades in, this long. */
  crossfadeMs: 800,
  /** A stage's cue at the stage's end (its result): out this fast. */
  stageEndFadeMs: 500,
  /** Back in the foreground: the track fades in again, this long. */
  resumeFadeMs: 600,
  /**
   * How long after its screen asks for it a track starts (then on an idle moment): its player is made on the UI
   * thread while JS waits (sfx.ts, warmModes.ts), so never inside a screen's entrance or under GO!. A newer
   * request meanwhile replaces it. A stage's cue is short and starts with the stage, so it comes soonest.
   */
  startDelayMs: { lobby: 1000, game: 1200, stage: 300 },

  /**
   * Routes by their pattern (expo-router segments: '/results/[id]'); a pattern also covers the routes under it
   * ('/dev' covers '/dev/sounds'). The longest match wins; anything not listed plays `defaultRoute`. The screens
   * that claim a scene of their own (the game, a stage, the match search, a friends room) list what plays
   * before their claim.
   */
  defaultRoute: 'lobby' as RouteMusic,
  routes: {
    // The game and a stage: their screens claim the scene (useGameMusic, the stage run); silence until then.
    '/game': 'silence',
    '/levels/play': 'silence',
    // The results: the win/lose sounds carry the moment (spec §22).
    '/results/[id]': 'silence',
    // The developer tools: the sound audition (/dev/sounds) changes the audio mode while open.
    '/dev': 'silence',
  } as Record<string, RouteMusic>,

  /** The game screen: the track of each mode. */
  game: {
    solo: 'kibbitzer',
    bot: 'kibbitzer',
    ranked: 'caper',
    friends: 'caper',
  } as Record<MusicGameMode, MusicTrackId>,
  /** The end of a game (finalAtEmptyCells): the peak loop. Modes not listed keep their track to the end. */
  final: {
    ranked: 'caper_final',
    friends: 'caper_final',
  } as Partial<Record<MusicGameMode, MusicTrackId>>,
  /**
   * The game turns to its `final` loop once this few cells of the board are still empty (the view's grid:
   * 0 = empty, the very picture every player sees), and stays on it until the game is over. 12 of a ranked
   * board's ~50 empty cells: about the last 30–60 s of a 2–4 player game, a little under one pass of the loop.
   */
  finalAtEmptyCells: 12,

  /**
   * A stage of staged practice: the cue of its kind, from GO to its end. Every kind has its own cue (Moshe:
   * "מנגינה שונה לכל סוג משחק"); the three fill kinds share one. A new cue: its id in MUSIC_TRACK_IDS, its file in
   * services/music.ts, and its kind here.
   */
  stage: {
    find: 'stage_find',
    findDuel: 'stage_race',
    fillBox: 'stage_fill',
    fillRow: 'stage_fill',
    fillCol: 'stage_fill',
    duel: 'stage_duel',
    spotError: 'stage_spot',
    pointHunter: 'stage_hunter',
    chain: 'stage_chain',
    puzzle: 'stage_puzzle',
  } as Record<LevelKind, MusicTrackId>,
} as const;

export type MusicConfig = typeof MUSIC_CONFIG;
