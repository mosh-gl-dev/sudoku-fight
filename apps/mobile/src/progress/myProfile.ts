import type { PublicPlayer } from '@sudoku-fight/protocol';
import { useMemo, useState } from 'react';

import { useAuth } from '../auth/authStore';

/** What a screen shows of a player's profile: name, avatar and country. */
export type MyProfile = Pick<PublicPlayer, 'displayName' | 'avatarId' | 'country'>;

export const sameProfile = (a: MyProfile | null, b: MyProfile | null): boolean =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.displayName === b.displayName &&
    a.avatarId === b.avatarId &&
    a.country === b.country);

/** My profile as the phone knows it (me); null while nobody is signed in. The same object while it stays. */
export function useMyProfile(): MyProfile | null {
  const displayName = useAuth((s) => s.me?.displayName);
  const avatarId = useAuth((s) => s.me?.avatarId);
  const country = useAuth((s) => s.me?.country);
  return useMemo(
    () =>
      displayName === undefined || avatarId === undefined || country === undefined
        ? null
        : { displayName, avatarId, country },
    [displayName, avatarId, country],
  );
}

/**
 * What to show of me over what a screen read from the server (`read`: the card, the board), so an edit made
 * after the read shows at once (Moshe's phone, 1.11.2026: the old avatar stayed on the card after "שמור"):
 * - my profile changed since `read` came: my profile;
 * - it is as it was then: null, the read is as new as me (a name an admin reset shows as the server sent it);
 * - nothing read yet (`read` null; a copy saved on the phone may show): my profile, newer than any saved copy.
 */
export function useProfileOver(profile: MyProfile | null, read: object | null): MyProfile | null {
  // My profile when `read` came (React's "state from the previous render": a new read records it at once).
  const [seen, setSeen] = useState({ read, profile });
  if (seen.read !== read) setSeen({ read, profile });
  if (profile === null || read === null) return profile;
  const then = seen.read === read ? seen.profile : profile;
  return sameProfile(profile, then) ? null : profile;
}
