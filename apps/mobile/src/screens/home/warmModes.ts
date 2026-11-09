import { avatarDef } from '../../avatars/catalog';
import { staticXml } from '../../avatars/layerStack';
import { svgAst } from '../../avatars/svgMarkup';
import { AVATAR_SIZES } from '../../components/player/metrics';
import { type FeedbackCue, preloadCues } from '../../services/feedback';
import { whenIdle } from '../../services/startup';
import { useSettings } from '../../state/settings';

/**
 * "משחק חדש" ready before its first tap (QA run #3, T3-FIRST-PLAY-SLOW; docs/PERF.md B14/B32). The first
 * "שחק" → "משחק חדש" after the start took 0.8–1.1 s (no frame from ~90 to 544 ms), every later one 0.45–0.5 s.
 * What only the first one paid, all of it plain JS:
 * - the route's code: app/modes.tsx imports this folder's barrel, which no screen of the start loads
 *   (startupGraph.test.ts): Modes, the game type, the bot selection, the settings and their imports, ~200 KB of
 *   source run for the first time;
 * - my avatar's two still pictures there (the header's `compact`, the solo row's `card`): renderStatic builds each
 *   one's markup and react-native-svg parses it, a character at a time. Both are remembered after that
 *   (layerStack staticXml, svgMarkup svgAst), which is why the second visit was faster.
 * Once Home has settled (MODES_WARM_DELAY_MS, then an idle moment) these run ahead of time, once per avatar.
 * Nothing is drawn or mounted, and nothing the start loads changes: the barrel is required inside a function.
 *
 * Not JS, and most likely the larger part (apk6 still showed no frame from ~85 to 533–606 ms with the above warmed;
 * Jest, where the sound player is a mock, shows no first-visit JS left): the press
 * itself. "שחק" is a primary Button, whose press plays "primaryPress" (its `ui_tap` sound) before router.push. The
 * first sound of the app's run makes its player there: expo-audio's AudioPlayer constructor runs on the UI thread
 * and the JS thread waits for it (runBlocking), and the first ExoPlayer of the process is a slow one to build. So
 * no frame, and no render of "משחק חדש", until it was there; every later press finds it (sfx keeps its players).
 * The warm-up makes that player too (PRESS_CUES), with sound on (else the press plays nothing): a one-time stall
 * of the UI thread on a settled Home, in place of one between the tap and the next screen.
 */

/** The cue a primary Button plays on press ("שחק" and every other primary button): its player, made ahead. */
const PRESS_CUES: readonly FeedbackCue[] = ['primaryPress'];

/** How long after Home is up the warm-up waits (Home's entrance is ~1 s), before its idle moment. */
export const MODES_WARM_DELAY_MS = 1200;

/** The sizes "משחק חדש" draws my avatar at (ModesScreen: its header, and the solo practice's row). */
const MODES_AVATAR_SIZES = ['compact', 'card'] as const;

const warmed = new Set<string>();

/**
 * Loads the route's code, makes the press cue's player (with sound on) and my avatar's pictures for the route
 * (each avatar once).
 */
export function warmModes(avatarId: string | null): void {
  try {
    /* eslint-disable @typescript-eslint/no-require-imports -- lazy on purpose: the start never loads the barrel */
    require('./index');
    /* eslint-enable @typescript-eslint/no-require-imports */
  } catch {
    // A head start only: whatever failed here fails again, as before, where the route loads it.
  }
  // Each time (a player already made is kept, and nothing is made again): sound may have been turned on since.
  try {
    if (useSettings.getState().sound) preloadCues(PRESS_CUES);
  } catch {
    // A head start only (sfx never throws; a test's stand-in for the feedback service may have no preloadCues).
  }
  const key = avatarId ?? '';
  if (warmed.has(key)) return;
  warmed.add(key);
  const def = avatarDef(avatarId);
  // As AvatarArt's still picture asks for them (StaticArt): the image size, the whole tile, the base face, in colour.
  for (const name of MODES_AVATAR_SIZES)
    svgAst(
      staticXml(def, {
        size: AVATAR_SIZES[name].image,
        crop: 'tile',
        expression: 'neutral',
        grayscale: false,
      }),
    );
}

/** warmModes after MODES_WARM_DELAY_MS and an idle moment; returns what cancels it. */
export function warmModesLater(avatarId: string | null): () => void {
  let stopIdle: (() => void) | null = null;
  const timer = setTimeout(() => {
    stopIdle = whenIdle(() => warmModes(avatarId));
  }, MODES_WARM_DELAY_MS);
  return () => {
    clearTimeout(timer);
    stopIdle?.();
  };
}
