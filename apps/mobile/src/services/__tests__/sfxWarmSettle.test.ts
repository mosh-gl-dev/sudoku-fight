import { cue, type FeedbackCue, preloadCues } from '../feedback';
import { sfx } from '../sfx';
import { useSettings } from '../../state/settings';

/**
 * QA fixcheck of APK 18, warp-first-hit-150ms-freeze: with sound on, the first warp of a game froze the whole
 * screen ~150 ms right as it came in; the second warp of the same game, and a first warp with sound off, did not.
 * The only sound path at a hit is the start cue's `play` (expo-audio runs it on the UI thread while JS waits), and
 * the first real play of a warmed player differed from every later one in one call: it also turned the volume back
 * up from the muted warm-up, at the moment of the hit. Now the volume goes back as soon as the muted play has
 * ended, so the first real play makes exactly the calls of the second. (expo-audio's volume setter only posts to
 * the main queue, so this is not shown to be the freeze's cause: these tests pin the order, not the cost.)
 *
 * The stand-in logs every call the native player gets, and sends `playbackStatusUpdate` as expo-audio does when
 * a play reaches the end of its clip (`finish()`).
 */

/** What expo-audio sends with playbackStatusUpdate (the part sfx reads). */
type MockStatus = { didJustFinish: boolean; playing: boolean };
type MockListener = (mockStatus: MockStatus) => void;

interface FakePlayer {
  calls: string[];
  /** The volumes it started playing at. */
  starts: number[];
  volume: number;
  playing: boolean;
  listeners: number;
  play: jest.Mock;
  emit(status: MockStatus): void;
  finish(): void;
}

jest.mock('expo-audio', () => {
  const players: unknown[] = [];
  return {
    __players: players,
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
    createAudioPlayer: jest.fn(() => {
      let volume = 1;
      const listeners = new Set<MockListener>();
      const player = {
        calls: [] as string[],
        starts: [] as number[],
        playing: false,
        get volume() {
          return volume;
        },
        set volume(v: number) {
          volume = v;
          player.calls.push(`volume ${v}`);
        },
        get listeners() {
          return listeners.size;
        },
        play: jest.fn(() => {
          player.calls.push('play');
          player.starts.push(volume);
          player.playing = true;
        }),
        pause: jest.fn(() => {
          player.playing = false;
        }),
        seekTo: jest.fn((seconds: number) => {
          player.calls.push(`seekTo ${seconds}`);
          return Promise.resolve();
        }),
        remove: jest.fn(),
        addListener: jest.fn((event: string, fn: MockListener) => {
          if (event === 'playbackStatusUpdate') listeners.add(fn);
          return { remove: () => listeners.delete(fn) };
        }),
        emit: (mockStatus: MockStatus) => {
          [...listeners].forEach((fn) => fn(mockStatus));
        },
        finish: () => {
          player.playing = false;
          player.emit({ didJustFinish: true, playing: false });
        },
      };
      players.push(player);
      return player;
    }),
  };
});

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy', Soft: 'soft', Rigid: 'rigid' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

const audio = jest.requireMock<{ __players: FakePlayer[]; createAudioPlayer: jest.Mock }>('expo-audio');
const last = () => audio.__players[audio.__players.length - 1]!;

beforeEach(() => {
  audio.__players.length = 0;
  audio.createAudioPlayer.mockClear();
  useSettings.setState({ sound: true, haptics: false });
});

afterEach(() => {
  sfx.release();
});

/** The start cues of the interferences (warmHitCues.ts warms each kind the game allows). */
const HIT_START_CUES: FeedbackCue[] = [
  'hitWarp',
  'hitFireworks',
  'hitCats',
  'hitInk',
  'hitScramble',
  'hitKeypad',
];

describe('sfx: a warmed player gets its volume back when the muted warm-up ends (warp-first-hit-150ms-freeze)', () => {
  it.each(HIT_START_CUES)(
    '%s: the first real play makes the very calls of the second, with no volume change',
    (name) => {
      preloadCues([name]);
      const player = last();
      // The warm-up: muted, then its own volume back once that play has ended, with nothing playing.
      expect(player.calls).toEqual(['volume 0.6', 'volume 0', 'play']);
      player.finish();
      expect(player.calls.slice(3)).toEqual(['volume 0.6']); // the old code left it at 0 until the hit
      expect(player.playing).toBe(false);
      expect(player.play).toHaveBeenCalledTimes(1);

      // The first hit, then the second.
      player.calls.length = 0;
      cue(name);
      const first = [...player.calls];
      player.finish();
      player.calls.length = 0;
      cue(name);
      const second = [...player.calls];
      expect(first).toEqual(['seekTo 0', 'play']); // was ['volume 0.6', 'seekTo 0', 'play']
      expect(first).toEqual(second);
      // Heard at its own volume both times; the warm-up was not heard.
      expect(player.starts).toEqual([0, 0.6, 0.6]);
    },
  );

  it('the restore follows the end of the muted play only: no other status puts the volume up while it plays', () => {
    preloadCues(['hitWarp']);
    const player = last();
    expect(player.volume).toBe(0);
    expect(player.playing).toBe(true);
    // A status that is not the end (expo-audio sends some while it plays) changes nothing.
    player.calls.length = 0;
    expect(player.listeners).toBe(1);
    player.emit({ didJustFinish: false, playing: true });
    expect(player.calls).toEqual([]);
    expect(player.volume).toBe(0);
    player.finish();
    expect(player.volume).toBe(0.6);
    // Done once: the listener is gone, and later ends change nothing.
    expect(player.listeners).toBe(0);
    cue('hitWarp');
    player.finish();
    expect(player.calls).toEqual(['volume 0.6', 'seekTo 0', 'play']);
  });

  it('a real play before the warm-up has ended is heard at its volume, and the late end changes nothing', () => {
    preloadCues(['hitWarp']);
    const player = last();
    player.calls.length = 0;
    cue('hitWarp');
    expect(player.calls).toEqual(['volume 0.6', 'seekTo 0', 'play']);
    expect(player.starts).toEqual([0, 0.6]);
    player.calls.length = 0;
    player.finish();
    expect(player.calls).toEqual([]);
    expect(player.volume).toBe(0.6);
  });

  it('both voices of a fast tick get their volume back on their own end', () => {
    sfx.preload(['count_tick']);
    const [a, b] = audio.__players;
    a!.finish();
    expect([a!.volume, b!.volume]).toEqual([0.3, 0]);
    b!.finish();
    expect([a!.volume, b!.volume]).toEqual([0.3, 0.3]);
  });

  it('sound off: no player is made for the hit cues, and nothing listens', () => {
    useSettings.setState({ sound: false });
    preloadCues(HIT_START_CUES);
    expect(audio.createAudioPlayer).not.toHaveBeenCalled();
  });

  it('released before the warm-up ended: the listener is gone, and the end does not touch the player', () => {
    preloadCues(['hitWarp']);
    const player = last();
    sfx.release();
    expect(player.listeners).toBe(0);
    player.calls.length = 0;
    player.finish();
    expect(player.calls).toEqual([]);
  });

  it('sound turned off mid warm-up (stopAll pauses it): the next real play is heard at its volume, once', () => {
    preloadCues(['hitWarp']);
    const player = last();
    useSettings.setState({ sound: false }); // stopAll: the muted play is paused, it never ends by itself
    expect(player.playing).toBe(false);
    expect(player.volume).toBe(0);
    useSettings.setState({ sound: true });
    player.calls.length = 0;
    cue('hitWarp');
    expect(player.calls).toEqual(['volume 0.6', 'seekTo 0', 'play']);
    expect(player.starts).toEqual([0, 0.6]);
    // The end of that real play lets the listener go and changes nothing.
    player.calls.length = 0;
    player.finish();
    expect(player.calls).toEqual([]);
    expect(player.listeners).toBe(0);
    expect(player.volume).toBe(0.6);
  });

  it('a stand-in without status events keeps the old way: the first real play puts the volume back', () => {
    audio.createAudioPlayer.mockImplementationOnce(() => {
      const player: FakePlayer & { pause: jest.Mock; seekTo: jest.Mock; remove: jest.Mock } = {
        calls: [],
        starts: [],
        volume: 1,
        playing: false,
        listeners: 0,
        play: jest.fn((): void => {
          player.starts.push(player.volume);
        }),
        pause: jest.fn(),
        seekTo: jest.fn(() => Promise.resolve()),
        remove: jest.fn(),
        emit: () => undefined,
        finish: () => undefined,
      };
      audio.__players.push(player);
      return player;
    });
    preloadCues(['hitWarp']);
    const player = last();
    cue('hitWarp');
    expect(player.starts).toEqual([0, 0.6]);
  });
});
