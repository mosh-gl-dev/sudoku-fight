import { Redirect, router } from 'expo-router';

import { testingSwitchesAllowed } from '../../src/config/testing';

type Module = typeof import('../../src/screens/PiratesLabScreen');

const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

/**
 * /dev/pirates: the Pirates, the first digit series (the whole crew, 1 to 9), two looks side by side, for Moshe
 * to judge on his phone. Development and staging builds only (config/testing.ts, Settings → "בדיקה"), like
 * /dev/plurals, so the staging APK of `npm run apk` opens it; a production build goes Home. The screen is required
 * when the route is first drawn, not imported, so it stays off the start (and a production build never loads it).
 * Since 31.10.2026 all 18 pirates (9 characters, 2 looks) are in AVATAR_IDS too, so a player can choose one in the
 * avatar picker (the first rows of the symbols) in every build; this screen only compares the looks.
 */
export default function PiratesRoute() {
  if (!testingSwitchesAllowed()) return <Redirect href="/" />;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy on purpose, see above
  const { PiratesLabScreen } = require('../../src/screens/PiratesLabScreen') as Module;
  return <PiratesLabScreen onClose={close} />;
}
