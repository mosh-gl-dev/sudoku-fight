import 'react-native-reanimated';

import { type AppLevel, ManualClock, ManualScheduler } from '@sudoku-fight/engine';
import { act, render, screen } from '@testing-library/react-native';

import { LevelStage } from '../../../../app/levels/play';
import { boardGeometry } from '../../../components/board/geometry';
import i18n from '../../../i18n';
import type { AppStateSource, LevelSessionDeps } from '../../../levels/levelSession';
import { firstLevelOf } from '../../../levels/__tests__/helpers/levelsOf';
import { useSettings } from '../../../state/settings';
import * as geometry from '../../game/geometry';

/**
 * QA levels-freeze-ready (apk7): as "מוכן?" ended, the stage's board and keypad first drew at the window's width,
 * then shrank to the room left for them at the room's onLayout, ~0.5 s later. The room is read at the first
 * commit (layoutHeightOf, React Native's element API in a layout effect), so the first frame is the final size:
 * here with no onLayout at all. The game screen (a fill-box stage) and the tap screen (a find).
 */

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../../../services/analytics', () => ({ track: jest.fn() }));
jest.mock('../../../services/feedback', () => ({
  cue: jest.fn(),
  preloadCues: jest.fn(),
  cueCountUp: jest.fn(() => jest.fn()),
}));

const BOX = firstLevelOf('fillBox', 1);
const FIND = firstLevelOf('find', 1);
const idleApp: AppStateSource = { addEventListener: () => ({ remove: () => undefined }) };
/** The room as the phone lays it out: shorter than the window is wide, so it sets the board's side. */
const ROOM = 300;

beforeEach(async () => {
  jest.useFakeTimers();
  await i18n.changeLanguage('he');
  useSettings.setState({ reduceMotion: 'off' });
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

async function show(level: AppLevel) {
  const clock = new ManualClock(1_000_000);
  const deps: LevelSessionDeps = {
    clock,
    scheduler: new ManualScheduler(clock),
    appState: idleApp,
    windowFocus: null,
    finish: async () => null,
    track: jest.fn(),
    attemptOf: async () => 1,
    bestStarsOf: () => 0,
  };
  await render(
    <LevelStage level={level} quick={false} onFinished={jest.fn()} onLeave={jest.fn()} deps={deps} />,
  );
  await act(async () => undefined);
}

const cellWidth = () => {
  const style = screen.getByTestId('cell-A1').props.style as { width: number } | { width: number }[];
  return (Array.isArray(style) ? Object.assign({}, ...style) : style).width as number;
};

describe('the stage’s board: its final size from the first frame (QA levels-freeze-ready)', () => {
  it.each<[string, AppLevel]>([
    ['the game screen (fill the box)', BOX],
    ['the tap screen (find)', FIND],
  ])('%s: sized by the room read at the commit, before any onLayout', async (_, level) => {
    const read = jest.spyOn(geometry, 'layoutHeightOf').mockImplementation((node) => (node ? ROOM : null));
    await show(level);
    expect(read).toHaveBeenCalled();
    expect(geometry.boardSide(1000, ROOM)).toBe(ROOM);
    expect(cellWidth()).toBeCloseTo(boardGeometry(ROOM).cell, 5);
  });

  it('where the layout cannot be read: onLayout, as before (the design’s 358 until then)', async () => {
    await show(BOX);
    expect(cellWidth()).toBeCloseTo(boardGeometry(358).cell, 5);
  });
});

describe('layoutHeightOf', () => {
  it('reads the element’s laid-out height; null for nothing to read or no height yet', () => {
    const el = (height: unknown) => ({ getBoundingClientRect: () => ({ height }) });
    expect(geometry.layoutHeightOf(el(412.5))).toBe(412.5);
    expect(geometry.layoutHeightOf(el(0))).toBeNull();
    expect(geometry.layoutHeightOf(el(Number.NaN))).toBeNull();
    expect(geometry.layoutHeightOf(null)).toBeNull();
    expect(geometry.layoutHeightOf({})).toBeNull();
    expect(
      geometry.layoutHeightOf({
        getBoundingClientRect: () => {
          throw new Error('gone');
        },
      }),
    ).toBeNull();
  });
});
