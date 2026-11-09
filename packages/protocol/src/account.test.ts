import { BOT_LEVELS } from '@sudoku-fight/engine';

import {
  ACCOUNT_ERROR_CODES,
  ACCOUNT_PATHS,
  AVATAR_CATALOG,
  AVATAR_CATALOG_ADDED,
  AVATAR_CATALOG_HEADER,
  AVATAR_IDS,
  type AvatarId,
  avatarCatalogOf,
  avatarIdForCatalog,
  COUNTRY_CODES,
  DISPLAY_NAME_PATTERN,
  devToken,
  invalidNameChars,
  isAvatarId,
  isCountryCode,
  isLegacyAvatarId,
  LEGACY_AVATAR_IDS,
  LEGACY_AVATAR_MAP,
  NAME_RULES,
  NO_AVATAR_ID,
  normalizeAvatarId,
  normalizeForCompare,
  parseDevToken,
  RENAME_COOLDOWN_MS,
  ratingKeysFor,
  validateDisplayName,
} from './index';

describe('display names (spec §3.1)', () => {
  it.each(['Moshe', 'abc', 'ABCDEFGHIJKLMNOP', 'משה'])('accepts %s (3 to 16 characters)', (name) => {
    expect(validateDisplayName(name)).toBeNull();
    expect(DISPLAY_NAME_PATTERN.test(name)).toBe(true);
  });

  it.each(['moshe_g', 'm.g', 'Player.007', '___', 'שלום_עולם', 'אבגדהוזחטיכלמנסע', 'ךםןףץ', 'Dan.דן', '123'])(
    'accepts %s (letters of both scripts, digits, _ and .)',
    (name) => {
      expect(validateDisplayName(name)).toBeNull();
    },
  );

  it.each([
    ['', 'tooShort'],
    ['ab', 'tooShort'],
    ['דן', 'tooShort'],
    ['A'.repeat(17), 'tooLong'],
    ['אבגדהוזחטיכלמנסעפ', 'tooLong'],
    ['Moshe G', 'invalidChars'],
    ['moshe-g', 'invalidChars'],
    ['שָׁלוֹם', 'invalidChars'], // niqqud
    ['José', 'invalidChars'],
    ['محمد', 'invalidChars'],
    ['😀😀😀', 'invalidChars'],
    ['<b>', 'invalidChars'],
    [' Moshe', 'invalidChars'], // the app trims; the rule itself doesn't
    ['a b', 'invalidChars'], // invalid characters come first, before the length
    ['x'.repeat(20) + '!', 'invalidChars'],
  ])('refuses %j: %s', (name, problem) => {
    expect(validateDisplayName(name)).toBe(problem);
    expect(DISPLAY_NAME_PATTERN.test(name)).toBe(false);
  });

  it('counts characters, not UTF-16 units', () => {
    expect(validateDisplayName('אבג')).toBeNull();
    expect(NAME_RULES.minLength).toBe(3);
    expect(NAME_RULES.maxLength).toBe(16);
  });

  it('lists the characters that are not allowed, each once', () => {
    expect(invalidNameChars('a b c!!')).toEqual([' ', '!']);
    expect(invalidNameChars('Moshe_G.1')).toEqual([]);
  });

  it('agrees with DISPLAY_NAME_PATTERN on random strings', () => {
    const alphabet = 'aZ09_.אךת -!é';
    let seed = 7;
    const next = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31);
    for (let i = 0; i < 2000; i++) {
      const length = next() % 20;
      let name = '';
      for (let k = 0; k < length; k++) name += alphabet[next() % alphabet.length];
      expect(validateDisplayName(name) === null).toBe(DISPLAY_NAME_PATTERN.test(name));
    }
  });
});

describe('normalizeForCompare', () => {
  it('ignores case and Hebrew final letters', () => {
    expect(normalizeForCompare('MoShE')).toBe('moshe');
    expect(normalizeForCompare('דן')).toBe('דנ');
    expect(normalizeForCompare('ךםןףץ')).toBe('כמנפצ');
    expect(normalizeForCompare('Dan.דן_1')).toBe('dan.דנ_1');
    expect(normalizeForCompare('DANA')).toBe(normalizeForCompare('dana'));
  });

  it('keeps everything else: digits, `_` and `.` are part of the name', () => {
    expect(normalizeForCompare('a.b')).not.toBe(normalizeForCompare('a_b'));
    expect(normalizeForCompare('moshe1')).not.toBe(normalizeForCompare('moshe'));
    expect(normalizeForCompare('שלום')).toBe('שלומ');
  });

  it('is idempotent', () => {
    for (const name of ['Moshe', 'דן', 'Dan.דן_1', 'ABC']) {
      expect(normalizeForCompare(normalizeForCompare(name))).toBe(normalizeForCompare(name));
    }
  });
});

describe('avatars (spec §3.4)', () => {
  it('has the 119 choosable avatars of the catalog, once each, as ids the catalog allows', () => {
    expect(AVATAR_IDS).toHaveLength(119);
    expect(new Set(AVATAR_IDS).size).toBe(119);
    for (const id of AVATAR_IDS) expect(id).toMatch(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/);
    // The picker's first of each kind (people, animals, objects, food, nature, creatures, symbols).
    expect(
      ['noam', 'fox', 'coffee-cup', 'pickle', 'cactus', 'alien', 'pirates-1-house'].map((id) =>
        AVATAR_IDS.indexOf(id as AvatarId),
      ),
    ).toEqual([0, 12, 19, 53, 64, 74, 86]);
  });

  it('opens the symbols with the 18 pirates: 1 to 9 in the house style, then 1 to 9 invested', () => {
    const pirates = (['house', 'invested'] as const).flatMap((look) =>
      [1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => `pirates-${digit}-${look}`),
    );
    expect(AVATAR_IDS.slice(86, 105)).toEqual([...pirates, 'eight']);
    for (const id of pirates) expect(isAvatarId(id)).toBe(true);
    // the four of the first slice keep their ids (stored with accounts since 31.10.2026)
    for (const id of ['pirates-1-house', 'pirates-7-house', 'pirates-1-invested', 'pirates-7-invested'])
      expect(isAvatarId(id)).toBe(true);
    // every pirate id is in the symbols group, and nowhere else
    expect(AVATAR_IDS.filter((id) => id.startsWith('pirates-'))).toEqual(pirates);
  });

  it('av00 means "no avatar" and is never chosen; the old pack is not chosen either', () => {
    expect(NO_AVATAR_ID).toBe('av00');
    expect(isAvatarId('av00')).toBe(false);
    expect(isAvatarId('av01')).toBe(false);
    expect(isAvatarId('av51')).toBe(false);
    expect(isAvatarId('NOAM')).toBe(false);
    expect(isAvatarId(1)).toBe(false);
    expect(isAvatarId('noam')).toBe(true);
    expect(isAvatarId('minus')).toBe(true);
  });

  it('keeps the 50 ids of the old pack: av01–av51 without av36', () => {
    const expected = Array.from({ length: 51 }, (_, i) => `av${String(i + 1).padStart(2, '0')}`).filter(
      (id) => id !== 'av36',
    );
    expect([...LEGACY_AVATAR_IDS]).toEqual(expected);
    expect(isLegacyAvatarId('av07')).toBe(true);
    expect(isLegacyAvatarId('av36')).toBe(false);
    expect(isLegacyAvatarId('av00')).toBe(false);
    expect(isLegacyAvatarId('noam')).toBe(false);
  });

  it('maps every old avatar to a different new one', () => {
    expect(Object.keys(LEGACY_AVATAR_MAP).sort()).toEqual([...LEGACY_AVATAR_IDS].sort());
    const targets = Object.values(LEGACY_AVATAR_MAP);
    for (const id of targets) expect(isAvatarId(id)).toBe(true);
    expect(new Set(targets).size).toBe(LEGACY_AVATAR_IDS.length);
  });

  it('keeps the character of the old avatars that had one', () => {
    expect(LEGACY_AVATAR_MAP.av39).toBe('professor'); // the gentleman
    expect(LEGACY_AVATAR_MAP.av40).toBe('furry-monster'); // the chimpanzee
    expect(LEGACY_AVATAR_MAP.av44).toBe('hatchling'); // the mouse
    expect(LEGACY_AVATAR_MAP.av41).toBe('panda');
    expect(LEGACY_AVATAR_MAP.av46).toBe('cat');
    expect(LEGACY_AVATAR_MAP.av48).toBe('rabbit');
    expect(LEGACY_AVATAR_MAP.av49).toBe('owl');
    expect(LEGACY_AVATAR_MAP.av50).toBe('fox');
  });

  it('dresses every bot in an avatar one can choose: the same ids as the players', () => {
    expect(BOT_LEVELS.map((l) => l.avatar)).toEqual([
      'hatchling',
      'fox',
      'owl',
      'professor',
      'furry-monster',
    ]);
    for (const level of BOT_LEVELS)
      expect([level.name, isAvatarId(level.avatar)]).toEqual([level.name, true]);
  });

  it('normalizes a stored id: current as is, old as its replacement, anything else as "no avatar"', () => {
    expect(normalizeAvatarId('noam')).toBe('noam');
    expect(normalizeAvatarId('coffee-cup')).toBe('coffee-cup');
    for (const id of LEGACY_AVATAR_IDS) expect(normalizeAvatarId(id)).toBe(LEGACY_AVATAR_MAP[id]);
    for (const v of ['av00', 'av36', 'av52', 'AV01', 'Noam', '', null, undefined, 7, {}, ['noam']])
      expect(normalizeAvatarId(v)).toBe(NO_AVATAR_ID);
  });

  it('reads an id a newer app may send (one this list does not have yet) as "no avatar", never as junk', () => {
    for (const v of ['pirates-10-house', 'dragons-1-house', 'pirates-1-golden'])
      expect(normalizeAvatarId(v)).toBe(NO_AVATAR_ID);
  });
});

describe('the avatar catalog an app knows (an older app refuses an answer with an id it does not know)', () => {
  const PIRATES = AVATAR_IDS.filter((id) => id.startsWith('pirates-'));

  it('is catalog 2 since the pirates: the 18 of them are what it added to the 101 of 1.1.0', () => {
    expect(AVATAR_CATALOG).toBe(2);
    expect(AVATAR_CATALOG_HEADER.toLowerCase()).toBe('x-avatar-catalog');
    expect(PIRATES).toHaveLength(18);
    expect([...(AVATAR_CATALOG_ADDED[2] ?? [])]).toEqual(PIRATES);
    expect(AVATAR_IDS.length - PIRATES.length).toBe(101);
    // every catalog after the first adds ids that exist, once
    const added = Object.values(AVATAR_CATALOG_ADDED).flat();
    expect(new Set(added).size).toBe(added.length);
    for (const id of added) expect(isAvatarId(id)).toBe(true);
    expect(Math.max(...Object.keys(AVATAR_CATALOG_ADDED).map(Number))).toBe(AVATAR_CATALOG);
  });

  it('reads the header: a whole number from 1, else 1 (an app that sends none is an app of catalog 1)', () => {
    expect(avatarCatalogOf(undefined)).toBe(1);
    expect(avatarCatalogOf(null)).toBe(1);
    expect(avatarCatalogOf('')).toBe(1);
    expect(avatarCatalogOf('2')).toBe(2);
    expect(avatarCatalogOf(' 2 ')).toBe(2);
    expect(avatarCatalogOf(['2', '1'])).toBe(2);
    expect(avatarCatalogOf('7')).toBe(7);
    for (const junk of ['0', '-1', '2.5', 'two', '1e3', '00002', 2, {}, '99999'])
      expect(avatarCatalogOf(junk)).toBe(1);
  });

  it('shows an app only the avatars of its catalog: a newer one as "no avatar", the rest as they are', () => {
    for (const id of PIRATES) {
      expect(avatarIdForCatalog(id, 1)).toBe(NO_AVATAR_ID);
      expect(avatarIdForCatalog(id, 2)).toBe(id);
      expect(avatarIdForCatalog(id, 3)).toBe(id);
    }
    for (const id of AVATAR_IDS.filter((a) => !a.startsWith('pirates-')))
      expect(avatarIdForCatalog(id, 1)).toBe(id);
    expect(avatarIdForCatalog(NO_AVATAR_ID, 1)).toBe(NO_AVATAR_ID);
  });
});

describe('countries (D21)', () => {
  it('has the 249 ISO 3166-1 alpha-2 codes and XK, upper case, sorted, once each', () => {
    expect(COUNTRY_CODES).toHaveLength(250);
    expect(new Set(COUNTRY_CODES).size).toBe(250);
    for (const code of COUNTRY_CODES) expect(code).toMatch(/^[A-Z]{2}$/);
    expect([...COUNTRY_CODES]).toEqual([...COUNTRY_CODES].sort());
  });

  it('names every code as a region (ICU knows them all)', () => {
    const names = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' });
    for (const code of COUNTRY_CODES) expect([code, names.of(code)]).toEqual([code, expect.any(String)]);
    expect(names.of('IL')).toBe('Israel');
  });

  it('checks codes', () => {
    expect(isCountryCode('IL')).toBe(true);
    expect(isCountryCode('XK')).toBe(true);
    expect(isCountryCode('il')).toBe(false);
    expect(isCountryCode('ZZ')).toBe(false);
    expect(isCountryCode('EU')).toBe(false);
    expect(isCountryCode('UK')).toBe(false); // GB
    expect(isCountryCode(null)).toBe(false);
  });
});

describe('rating keys (D7, spec §11.1)', () => {
  it('option B: one per game type', () => {
    expect(ratingKeysFor('B')).toEqual(['fast', 'normal', 'hard']);
  });

  it('option A: one per game type and player count', () => {
    expect(ratingKeysFor('A')).toEqual([
      'fast-2p',
      'fast-3p',
      'fast-4p',
      'normal-2p',
      'normal-3p',
      'normal-4p',
      'hard-2p',
      'hard-3p',
      'hard-4p',
    ]);
  });
});

describe('the account API', () => {
  it('lives under /v1', () => {
    expect(ACCOUNT_PATHS).toEqual({
      namesAvailable: '/v1/names/available',
      users: '/v1/users',
      me: '/v1/me',
    });
  });

  it('renames once in 30 days (D20)', () => {
    expect(RENAME_COOLDOWN_MS).toBe(30 * 86_400_000);
  });

  it('has distinct error codes', () => {
    expect(new Set(ACCOUNT_ERROR_CODES).size).toBe(ACCOUNT_ERROR_CODES.length);
    expect(ACCOUNT_ERROR_CODES).toEqual(expect.arrayContaining(['taken', 'renameTooSoon', 'disabled']));
  });
});

describe('development tokens', () => {
  it('round-trips a uid, with or without an email', () => {
    expect(devToken('ana_1')).toBe('dev:ana_1');
    expect(parseDevToken('dev:ana_1')).toEqual({ uid: 'ana_1', email: null });
    expect(devToken('ana', 'ana@example.com')).toBe('dev:ana:ana@example.com');
    expect(parseDevToken('dev:ana:ana@example.com')).toEqual({ uid: 'ana', email: 'ana@example.com' });
  });

  it.each([
    '',
    'dev:',
    'dev:a b',
    'dev:a:b',
    'dev:a:@x',
    'Dev:ana',
    'eyJhbGciOi.x.y',
    `dev:${'a'.repeat(65)}`,
  ])('is not a dev token: %j', (token) => {
    expect(parseDevToken(token)).toBeNull();
  });

  it('refuses to build a bad one', () => {
    expect(() => devToken('a:b')).toThrow(RangeError);
    expect(() => devToken('ana', 'not-an-email')).toThrow(RangeError);
  });
});
