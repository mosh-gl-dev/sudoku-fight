/**
 * Staged practice's screen settings (1.0.2; dev-plan §1.1, Moshe's answers of 2026-10-18; 1.0.3: levels-ui.md
 * §2–§4, §8, Moshe's "build the numbered items without asking" of 2026-10-20). Each is a ☐ default of spec §24
 * (or one of Moshe's decisions) built as a setting, read by the screen it names, with a test that flips it
 * (CLAUDE.md). The game's rules are the engine's LEVEL_RULES; the data's settings (the sync) are LEVELS_DATA in
 * levels/levelsConfig.ts.
 *
 * Two 1.0.3 decisions live in the engine, not here, so the screen never decides them twice:
 * - [D78b] repeated digits in a puzzle are not marked: LEVEL_RULES.puzzleConflicts = 'none'. The puzzle screen
 *   paints exactly view.level.puzzle.conflicts, which the engine leaves empty unless that setting allows it.
 * - [D70c] a wrong swap's +5 s: LEVEL_RULES.puzzleSwapPenaltyMs (the screen shows boxesSwapped.penaltyMs).
 */
export interface LevelUiSettings {
  /** "מוכן?" before a stage's clock starts, this long (D56; ReadyView). */
  readyMs: number;
  /**
   * "לשלב הבא" on a result starts the next stage straight away, through "מוכן?" (D56). Off: it goes back to
   * the map with the next stage chosen in the panel (app/levels/play.tsx).
   */
  quickEntry: boolean;
  /** A map node shows its kind's icon (D60: no, so the map stays calm; LevelNode). */
  nodeKindIcon: boolean;
  /** "שלבים: 87 · ★ 214" on another player's card too (D58: mine only; PlayerCardScreen). */
  cardShowsToOthers: boolean;
  /** The map's zigzag runs from stage 1 at the top down ('down', D60) or from the bottom up (mapModel). */
  mapDirection: 'down' | 'up';
  /** My reactions button in a stage against a bot (D62, Moshe 2026-10-18: none; the bot still reacts). */
  reactions: boolean;
  /**
   * The app leaving the foreground mid-stage freezes it, and "3, 2, 1" over the covered board brings it back
   * (D65, Moshe 2026-10-18; the stage screens).
   */
  backgroundPause: boolean;
  /** The resume countdown's length (D65). */
  resumeCountdownMs: number;
  /** Spot the error: its tip card in the kind's first this many stages. */
  tipLevels: number;
  /** Point hunter: "שווה 6" over my locked cell in the kind's first this many stages. */
  worthHintLevels: number;

  // 1.0.3 (levels-ui.md §8: D75–D78)

  /**
   * [D75b] The region's "spotlight" when the board first shows: the gold frame lands (1.06 → 1) and a gold
   * band around it flashes once (LEVEL_MOTION.region*); a race's every new spot flashes the band only. Under a
   * second, while the clock already runs; never a loop. Off, or Reduced Motion: the frame is simply there
   * (RegionFrame, motion.md `level.region.intro`).
   */
  regionIntro: boolean;
  /**
   * [D75c] The board's coordinate rails (A–I at the side, 1–9 on top) in a row or a column stage, the region's
   * letter or number in gold. Off: the new region look is tried on the phone first; on, the board is ~20 dp
   * smaller (a cell 36 dp instead of 38).
   */
  regionRails: boolean;
  /**
   * [D76] "מוכן?" shows where to look, per kind (levels-ui.md §2.4): Pinpoint's "איפה ה־6?" and, in a region,
   * the small map (MiniRegion); a fill stage's map and "ריבוע 5" / "שורה D" / "עמודה 5"; a puzzle's
   * "3 ריבועים זזים · 6 ריבועים קבועים". Never a race's spot or digit (no head start on the bot). The digit and
   * the region are the attempt's: play.tsx reads the attempt before "מוכן?". Off: "מוכן?" as in 1.0.2.
   */
  readyRegion: boolean;
  /** [D77] A boss's opening, in place of "מוכן?" (BossIntro): 3 s, against "מוכן?"'s readyMs. */
  bossReadyMs: number;
  /**
   * [D77] The first boss (L010) is also the first race: one "איך משחקים", the race's, with a fourth panel "זה
   * גם שלב בוס", rather than two cards in a row. On: a boss whose own kind's card has not been seen yet gets
   * that kind's card plus the boss panel, and both count as seen (HowToPlay, tutorialFor). Off: the boss's card,
   * then the kind's on its next stage, as in 1.0.2.
   */
  mergeFirstBossTutorial: boolean;
  /**
   * [D78a] The puzzle's "tap a box, then another" works for everyone, not only with a screen reader (quicker on
   * a small phone, and a fallback when dragging is awkward). A screen reader's activate always works (PuzzleBoard).
   */
  puzzleTapSwap: boolean;

  // 31.10.2026, the board-game road (Moshe: "מסך אימון בשלבים נראה ממש דלוח ועלוב"; components.md §19.2–§19.4,
  // §19.14; DECISIONS-PENDING 3.29). Each is a ☐ default, judged on the phone.

  /**
   * The map's quiet scenery beside the road (screens/levels/sceneryModel.ts): each chapter's translucent tone
   * zones, a faint sudoku box, a big digit, a signpost and a pennant. Off: the road and the coins alone.
   */
  mapScenery: boolean;
  /** My avatar stands beside the current stage like a board-game piece (P1 frame, ●). Off: 1.0.2's 22 dp pin. */
  mapToken: boolean;
  /**
   * Back from a stage: the new stars pop on the coin, the gold pours along the road to the next stage and my token
   * hops there (motion.md level.map.*). Off: the new state at once. Reduced Motion: always at once.
   */
  mapChoreography: boolean;
  /** A stage with ★★★ is a gold coin. Off: it keeps the gold edge of one or two stars. */
  goldPerfectCoins: boolean;

  /**
   * A stage that ends by itself while "לצאת מהשלב?" is open (its clock ran out under the dialog; QA N1): the
   * dialog closes, and the result's buttons take no press for this long once it shows, so a tap meant for the
   * dialog's "יציאה" cannot press "למפה" under the same finger. 0: no guard. The spec has no rule here: whether
   * the open dialog should stop the stage's clock instead is Moshe's decision (not built; the clock runs on).
   */
  resultGuardMs: number;
}

export const LEVEL_UI: LevelUiSettings = {
  readyMs: 2000,
  quickEntry: true,
  nodeKindIcon: false,
  cardShowsToOthers: false,
  mapDirection: 'down',
  reactions: false,
  backgroundPause: true,
  resumeCountdownMs: 3000,
  tipLevels: 3,
  worthHintLevels: 2,
  regionIntro: true,
  regionRails: false,
  readyRegion: true,
  bossReadyMs: 3000,
  mergeFirstBossTutorial: true,
  puzzleTapSwap: true,
  mapScenery: true,
  mapToken: true,
  mapChoreography: true,
  goldPerfectCoins: true,
  resultGuardMs: 1000,
};

/** The puzzle board's feel (levels-ui.md §4; D78): PuzzleBoard and PuzzleLevelScreen read these. */
export interface PuzzleUiSettings {
  /** The gap between the nine boxes, in dp, so each reads as a tile of its own (the game board's is 3). */
  slotGap: number;
  /** A drag starts after the finger moved this far, in dp (Gesture.Pan().minDistance); less is a tap. */
  dragMinDistance: number;
  /** The held box grows to this scale (with a shadow); Reduced Motion: no growth, no shadow. */
  liftScale: number;
  /** The held box slides into its new place (motion.md `level.puzzle.swap`). */
  swapMs: number;
  /** The box that stood there slides into the place left free. */
  swapOtherMs: number;
  /** A drop off the board, or on the same place, or a swap the engine refused: the box goes home. */
  homeMs: number;
  /** Solved: a gold frame on every box flashes once (motion.md `level.puzzle.solved`). */
  solvedFlashMs: number;
  /** Solved under Reduced Motion: the gold frame holds still, this long. */
  solvedReducedMs: number;
  /** A touch on a fixed box under Reduced Motion: the lock's frame lights up this long (no shake). */
  deniedReducedMs: number;
}

export const PUZZLE_UI: PuzzleUiSettings = {
  slotGap: 6,
  dragMinDistance: 6,
  liftScale: 1.06,
  swapMs: 200,
  swapOtherMs: 240,
  homeMs: 200,
  solvedFlashMs: 550,
  solvedReducedMs: 300,
  deniedReducedMs: 300,
};

/**
 * The motion of the region's spotlight and the boss's opening (levels-ui.md §2.3, §3.2; motion.md 4.11
 * `level.region.intro`, `level.boss.intro`, `level.boss.won`). Every one of them has a Reduced Motion form,
 * described where it is played; none loops.
 */
export const LEVEL_MOTION = {
  /** The frame lands: from this scale to 1, with opacity 0 → 1, on the `pop` spring. */
  regionLandScale: 1.06,
  regionLandMs: 320,
  /** Then the gold band (color.board.regionBand) around the frame: 0 → 1 → 0, this long, this wide (dp). */
  regionBandMs: 600,
  regionBandWidth: 6,
  /** The boss's crown lands from this scale to 1 on the `slam` spring. */
  bossCrownFrom: 1.4,
  bossCrownMs: 530,
  /** The "what's harder" chips come in one after another. */
  bossChipMs: 240,
  bossChipStaggerMs: 120,
  /** "ניצחת את הבוס!": the crown medallion pops (`lv-pop`). */
  bossWonPopMs: 420,
} as const;

/**
 * The level map's motion (31.10.2026; motion.md §4.11 `level.node.current`, `level.node.press`,
 * `level.map.token.land`, `level.map.stars`, `level.map.pour`, `level.map.token.hop`, `level.gate.unlock`,
 * `level.map.panel`). Every one has a Reduced Motion form, played where it is drawn. The map's one repeating
 * motion, the current stage's beacon, runs in beats with rests between them (avatars/idleBeat.ts: an endless view
 * animation keeps Android's accessibility layer and uiautomator from ever seeing a quiet screen).
 */
export const MAP_MOTION = {
  /** The beacon: a burst of `beaconBeats` pulses of `beaconBeatMs` (half out, half back), then a rest. */
  beaconBeatMs: 1200,
  beaconBeats: 2,
  beaconRestMs: 3600,
  /** The first burst, this long after the map shows (or comes back in front). */
  beaconWakeMs: 400,
  /**
   * My token lands on its spot when the map first shows: after this, from this far above, on the `pop` spring (its
   * own length, about 420 ms).
   */
  tokenLandDelayMs: 200,
  tokenDropDp: 20,
  /** Back from a stage: the steps start this long after the map has followed the current stage. */
  stepGapMs: 350,
  /** The gold pours along the road to the new stage in this long (split by length over a gate's two segments). */
  pourMs: 600,
  /** The cream middle dash fades in over the pour's last this long. */
  pourDashFadeMs: 120,
  /** Then my token hops there, on an arc this high, and lands with a squash. */
  hopMs: 520,
  hopArcDp: 28,
  landSquashMs: 160,
  /** A gate opening: its barrier swings up and away. */
  gateBarrierMs: 360,
  /** The panel's content, when the choice changes: a fade in, rising this far. */
  panelSwapMs: 160,
  panelRiseDp: 6,
} as const;
