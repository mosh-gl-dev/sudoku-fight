// First: expo-router's testing library swaps Reanimated for its old mock (no useReducedMotion), unless the real
// module is already in place as the mock (see the jest.mock below).
import 'react-native-reanimated';
import { screen } from 'expo-router/testing-library';
import * as svg from 'react-native-svg';

import type { AvatarIdOrNone } from '../../../avatars';
import { svgXmlsIn } from '../../../avatars/testing/avatarTesting';
import { svgAst } from '../../../avatars/svgMarkup';
import { useGameStore } from '../../../game/gameStore';
import { openPracticeRepo, type PracticeRepo } from '../../../game/practiceRepo';
import { practiceStorageOrNull } from '../../../game/storage';
import { memoryDb } from '../../../game/testing/sqlJsDb';
import i18n from '../../../i18n';
import { useProfile } from '../../../state/profile';
import { renderApp } from '../testing/homeTesting';
import { warmModes } from '../warmModes';

/**
 * QA run #3, T3-FIRST-PLAY-SLOW (docs/PERF.md, B14/B32): what Home warms is what "משחק חדש" draws. The markup of
 * each picture of me the screen draws is already parsed after warmModes (react-native-svg's parse, a character at
 * a time, was most of the first visit's extra cost), and only then. Should the screen's avatars change (a size, a
 * crop, a face), the warm-up would miss them, and this says so. (Under Jest an avatar's picture stays one host
 * element with its markup, jest.setup.ts: the screen's markups are read from there.)
 */

type Mocks = typeof import('../testing/nativeMocks');
type Node = Parameters<typeof svgXmlsIn>[0];

jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated'));
jest.mock('../../../game/storage', () => jest.requireActual<Mocks>('../testing/nativeMocks').practiceStorage);
jest.mock('../../../services/analytics', () => ({ track: jest.fn() }));
jest.mock('../../../services/feedback', () => ({ cue: jest.fn() }));
jest.mock('expo-audio', () => jest.requireActual<Mocks>('../testing/nativeMocks').expoAudio);
jest.mock('expo-haptics', () => jest.requireActual<Mocks>('../testing/nativeMocks').expoHaptics);

const hidden = { includeHiddenElements: true };
let repo: PracticeRepo;

beforeEach(async () => {
  jest.useRealTimers();
  repo = await openPracticeRepo(await memoryDb());
  jest.mocked(practiceStorageOrNull).mockImplementation(async () => repo);
  await i18n.changeLanguage('he');
});

afterEach(() => {
  jest.restoreAllMocks();
  useGameStore.getState().clear();
  jest.useRealTimers();
});

/** The markups of my avatar's pictures on "משחק חדש" (the header's and the solo practice's), with `avatarId`. */
async function modesPictures(avatarId: AvatarIdOrNone): Promise<string[]> {
  useProfile.setState({ name: null, avatarId, country: 'IL', lastPlay: null, botLevel: null });
  await renderApp('/modes');
  const xmls = ['modes-me-avatar', 'mode-solo-avatar'].flatMap((id) =>
    svgXmlsIn(screen.getByTestId(id, hidden) as unknown as Node).map((el) => el.props.xml as string),
  );
  expect(xmls).toHaveLength(2);
  return xmls;
}

/** How many of `xmls` react-native-svg still has to parse. */
function parsesFor(xmls: string[]): number {
  const parse = jest.spyOn(svg, 'parse');
  for (const xml of xmls) svgAst(xml);
  const count = parse.mock.calls.length;
  parse.mockRestore();
  return count;
}

it('after warmModes, both pictures "משחק חדש" draws are parsed already', async () => {
  warmModes('microphone');
  expect(parsesFor(await modesPictures('microphone'))).toBe(0);
});

it('without it, they are not (what the warm-up saves the first visit)', async () => {
  expect(parsesFor(await modesPictures('astronaut'))).toBe(2);
});
