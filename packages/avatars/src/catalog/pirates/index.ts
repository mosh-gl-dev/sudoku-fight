/**
 * Pirates: the first digit series (Moshe, 30.10.2026: avatars that are only digits, in themed series of 1 to 9,
 * with "very invested" animation). The series bible is docs/avatars/PIRATES.md; the shared toolbox is
 * shared.ts; each character is its own file (one.ts, the Captain; two.ts, the Pirate Lady; … nine.ts, the
 * Navigator), exporting one PirateCharacter with both looks.
 *
 * Choosable since 31.10.2026 (Moshe: "שלב אותם באווטארים הקיימים ואראה"): catalog/index.ts joins PIRATES, so
 * every look is in AVATARS, the protocol's AVATAR_IDS and the avatar names, and a player picks one like any
 * other: the first rows of the symbols, in the picker's last group. /dev/pirates shows the looks side by side.
 * The whole crew (1–9) joined the same day (Moshe: "תכין על בסיס שני הראשונים את כל סדרת הפיראטים ותוסיף גם
 * בשרת"). Moshe has not chosen a look yet; the ids are stored with the user once chosen, so the look he drops
 * later is retired the way the old pack was (an entry in the protocol's legacy map), never just deleted.
 *
 * A new character joins here: import it and add it to PIRATE_CAST (in any order: the list is sorted by digit).
 * Its looks then join PIRATES, the catalog and pirates.test.ts by themselves; AVATAR_IDS, the names in the
 * app's locales and the app's catalog test follow (docs/avatars/PIRATES.md, "Joining the catalog").
 */

import type { AvatarDef } from '../../types';
import { GRANDPA_COOK } from './eight';
import { PARROT_KEEPER } from './five';
import { RIGGER_BOY } from './four';
import { NAVIGATOR } from './nine';
import { CAPTAIN } from './one';
import { PEG } from './seven';
import { chamfer, inset, PIRATE_LOOKS, type PirateCharacter, slab } from './shared';
import { DECKHAND } from './six';
import { CABIN_GIRL } from './three';
import { PIRATE_LADY } from './two';

export { PIRATE_LOOKS, type PirateCharacter, type PirateLook } from './shared';

/**
 * The cast, in digit order: the Captain (1), the Pirate Lady (2), the Cabin Girl (3), the Rigger Boy (4), the
 * Parrot Keeper (5), the Deckhand (6), Peg-leg Peg (7), Grandpa Cook (8) and the Navigator (9).
 */
export const PIRATE_CAST: readonly PirateCharacter[] = [
  CAPTAIN,
  PIRATE_LADY,
  CABIN_GIRL,
  RIGGER_BOY,
  PARROT_KEEPER,
  DECKHAND,
  PEG,
  GRANDPA_COOK,
  NAVIGATOR,
].sort((a, b) => a.digit - b.digit);

/**
 * Every pirate AvatarDef, the catalog file's list (catalog/index.ts): look by look, each in cast order, so the
 * picker shows every character in the house style (1–9), then every one invested (1–9). The two looks of a
 * character share a tile, so they are never neighbours, and the tiles (shared.ts PIRATE_TILES) keep all
 * neighbours apart.
 */
export const PIRATES: readonly AvatarDef[] = PIRATE_LOOKS.flatMap((l) => PIRATE_CAST.map((c) => c.looks[l]));

export const pirateById = (id: string): AvatarDef | undefined => PIRATES.find((a) => a.id === id);

/** Exported for the series' tests only (shared.ts exports them to the character files). */
export const __pirateGeometry = { inset, chamfer, slab } as const;
