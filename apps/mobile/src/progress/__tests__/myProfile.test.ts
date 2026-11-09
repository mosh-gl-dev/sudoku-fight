import { renderHook } from '@testing-library/react-native';

import { type MyProfile, sameProfile, useProfileOver } from '../myProfile';

/**
 * What a screen shows of me over what it read from the server (Moshe's phone, 1.11.2026: the card kept the old
 * avatar after Edit profile): my profile once it changed after the read came; the read as it is otherwise (an
 * admin's name reset shows as the server sent it); my profile over a saved copy while nothing is read yet.
 */

const MOSHE: MyProfile = { displayName: 'MosheG', avatarId: 'lava-lamp', country: 'IL' };
const EDITED: MyProfile = { displayName: 'MosheG', avatarId: 'fox', country: 'DE' };

function over(profile: MyProfile | null, read: object | null) {
  return renderHook(
    (p: { profile: MyProfile | null; read: object | null }) => useProfileOver(p.profile, p.read),
    {
      initialProps: { profile, read },
    },
  );
}

describe('useProfileOver', () => {
  it('nothing changed since the read: the read as it came', async () => {
    const card = {};
    const hook = await over(MOSHE, card);
    expect(hook.result.current).toBeNull();
    // A new object with the same values (me after a rating update) is no change.
    await hook.rerender({ profile: { ...MOSHE }, read: card });
    expect(hook.result.current).toBeNull();
  });

  it('an edit made after the read: my profile, until a newer read comes', async () => {
    const card = {};
    const hook = await over(MOSHE, card);
    await hook.rerender({ profile: EDITED, read: card });
    expect(hook.result.current).toEqual(EDITED);
    await hook.rerender({ profile: EDITED, read: {} });
    expect(hook.result.current).toBeNull();
  });

  it('a read that comes while my profile is stale is newer: it shows (an admin reset my name)', async () => {
    const hook = await over(MOSHE, null);
    await hook.rerender({ profile: MOSHE, read: {} });
    expect(hook.result.current).toBeNull();
  });

  it('nothing read yet (a saved copy shows): my profile; nobody signed in: none', async () => {
    expect((await over(MOSHE, null)).result.current).toEqual(MOSHE);
    expect((await over(null, {})).result.current).toBeNull();
  });

  it('sameProfile compares the values', () => {
    expect(sameProfile(MOSHE, { ...MOSHE })).toBe(true);
    expect(sameProfile(MOSHE, EDITED)).toBe(false);
    expect(sameProfile(MOSHE, { ...MOSHE, displayName: 'Moshe' })).toBe(false);
    expect(sameProfile(null, null)).toBe(true);
    expect(sameProfile(MOSHE, null)).toBe(false);
  });
});
