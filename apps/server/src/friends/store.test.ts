import { ratings, users } from '../db/schema';
import { fakeClock } from '../testing/clock';
import { createTestDb, type TestDb } from '../testing/db';
import { FriendsLobby } from './lobby';
import { FRIENDS_RULES } from './options';
import { dbFriendsStore } from './store';

/**
 * A friends room seat's rating (QA 2026-11-09, two reports): a seat showed the player's best rating of any
 * type (אורי: fast 1299 in a 'רגיל' room, where his rating is 1206). The card now carries each type's rating,
 * and the seat shows the room's type's, also after the host changes the type.
 */
let t: TestDb;
beforeAll(async () => {
  t = await createTestDb();
}, 30_000);
afterAll(() => t.close());
beforeEach(async () => {
  await t.reset();
  await t.db.insert(users).values([
    { id: 'uri', firebaseUid: 'uid-uri', displayName: 'Uri' },
    { id: 'ahva', firebaseUid: 'uid-ahva', displayName: 'Ahva' },
    { id: 'new', firebaseUid: 'uid-new', displayName: 'New' },
  ]);
  const row = (userId: string, ratingKey: string, rating: number, games: number) => ({
    userId,
    ratingKey,
    rating,
    games,
    peak: rating,
  });
  await t.db.insert(ratings).values([
    row('uri', 'fast', 1299.4, 30),
    row('uri', 'normal', 1206, 12),
    row('ahva', 'fast', 1079, 20),
    row('ahva', 'normal', 1200, 1),
    // No rated game of this type: no rating to show for it.
    row('ahva', 'hard', 1300, 0),
  ]);
});

describe('dbFriendsStore: the seat card', () => {
  it('carries the general rating and each type’s', async () => {
    const store = dbFriendsStore(() => t.db, 'B');
    expect(await store.member('uri', 'Uri')).toMatchObject({
      rating: 1299,
      ratings: { fast: 1299, normal: 1206 },
    });
    const ahva = await store.member('ahva', 'Ahva');
    expect(ahva).toMatchObject({ rating: 1200, ratings: { fast: 1079, normal: 1200 } });
    expect(ahva.ratings?.hard).toBeUndefined();
    expect(await store.member('new', 'New')).toMatchObject({ rating: null, ratings: {} });
  });

  it('a seat shows the rating of the room’s type, and follows setGameType', async () => {
    const store = dbFriendsStore(() => t.db, 'B');
    const clock = fakeClock();
    const lobby = new FriendsLobby({
      hostId: 'uri',
      gameType: 'normal',
      rules: FRIENDS_RULES,
      now: clock.now,
    });
    for (const [id, name] of [
      ['uri', 'Uri'],
      ['ahva', 'Ahva'],
    ] as const) {
      expect(lobby.admit(id).ok).toBe(true);
      expect(lobby.connect(await store.member(id, name)).ok).toBe(true);
    }
    const shown = () => lobby.view().map((p) => [p.id, p.rating]);
    expect(shown()).toEqual([
      ['uri', 1206],
      ['ahva', 1200],
    ]);
    expect(lobby.setGameType('uri', 'fast').ok).toBe(true);
    expect(shown()).toEqual([
      ['uri', 1299],
      ['ahva', 1079],
    ]);
    expect(lobby.setGameType('uri', 'hard').ok).toBe(true);
    expect(shown()).toEqual([
      ['uri', null],
      ['ahva', null],
    ]);
  });
});
