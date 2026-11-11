import { AppState, type AppStateStatus } from 'react-native';

import {
  checkHealth,
  CONNECTIVITY,
  type FetchLike,
  setHealthCheck,
  useConnectivity,
  watchConnectionWhileShown,
} from '../connectivity';

/** "Is there a connection?" before a game (spec §16.1): GET /health with a time limit, and the shared state. */

afterEach(() => {
  setHealthCheck(null);
  jest.useRealTimers();
});

describe('checkHealth', () => {
  it('asks GET /health once, and an answer that is ok means online', async () => {
    const fetchFn = jest.fn<ReturnType<FetchLike>, Parameters<FetchLike>>(async () => ({ ok: true }));
    await expect(checkHealth({ url: 'http://server:2567/health', fetch: fetchFn })).resolves.toBe(true);
    expect(fetchFn).toHaveBeenCalledWith(
      'http://server:2567/health',
      expect.objectContaining({ method: 'GET', signal: expect.anything() }),
    );
  });

  it('a server error or a failed request means no connection; it never throws', async () => {
    await expect(checkHealth({ url: 'x', fetch: async () => ({ ok: false }) })).resolves.toBe(false);
    await expect(
      checkHealth({ url: 'x', fetch: () => Promise.reject(new TypeError('Network request failed')) }),
    ).resolves.toBe(false);
  });

  it('gives up after the time limit, and aborts the request', async () => {
    jest.useFakeTimers();
    let signal: AbortSignal | undefined;
    const pending = checkHealth({
      url: 'x',
      timeoutMs: 1000,
      fetch: (_url, init) => {
        signal = init.signal;
        return new Promise(() => undefined);
      },
    });
    jest.advanceTimersByTime(1000);
    await expect(pending).resolves.toBe(false);
    expect(signal?.aborted).toBe(true);
  });

  it('checks the configured server by default, and waits 5 s at most', () => {
    // QA levels-xp-offline (loop 5): offline, checked again every 5 s (was 10 s), so the connection back is seen
    // within a few seconds.
    // QA account-home-offline: online, a shown Home checks again every 10 s.
    expect(CONNECTIVITY).toEqual({ timeoutMs: 5000, recheckMs: 5000, onlineRecheckMs: 10000 });
  });
});

describe('watchConnectionWhileShown (QA account-home-offline)', () => {
  let onChange: ((state: AppStateStatus) => void) | null = null;
  const remove = jest.fn();

  beforeEach(() => {
    onChange = null;
    remove.mockClear();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      onChange = handler as (state: AppStateStatus) => void;
      return { remove } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
  });

  afterEach(() => jest.restoreAllMocks());

  const flush = async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve();
  };

  it('online, checks again every onlineRecheckMs and sees the connection go', async () => {
    jest.useFakeTimers();
    let answer = true;
    let calls = 0;
    setHealthCheck(async () => {
      calls++;
      return answer;
    });
    await useConnectivity.getState().check();
    expect(useConnectivity.getState().status).toBe('online');
    const stop = watchConnectionWhileShown();
    answer = false;
    jest.advanceTimersByTime(CONNECTIVITY.onlineRecheckMs - 1);
    expect(calls).toBe(1);
    jest.advanceTimersByTime(1);
    await flush();
    expect(calls).toBe(2);
    expect(useConnectivity.getState().status).toBe('offline');
    // Offline, it leaves the checks to useConnectivityWatch's 5 s recheck.
    jest.advanceTimersByTime(CONNECTIVITY.onlineRecheckMs * 2);
    await flush();
    expect(calls).toBe(2);
    stop();
    expect(remove).toHaveBeenCalled();
  });

  it('no checks in the background; one at once back in the foreground; none after the stop', async () => {
    jest.useFakeTimers();
    let calls = 0;
    setHealthCheck(async () => {
      calls++;
      return true;
    });
    // React Native's jest preset has no state to replace here; the app's is a string.
    const appState = AppState as unknown as { currentState: unknown };
    const saved = appState.currentState;
    appState.currentState = 'background';
    const stop = watchConnectionWhileShown();
    try {
      jest.advanceTimersByTime(CONNECTIVITY.onlineRecheckMs * 2);
      expect(calls).toBe(0);
    } finally {
      appState.currentState = saved;
    }
    onChange?.('active');
    await flush();
    expect(calls).toBe(1);
    stop();
    jest.advanceTimersByTime(CONNECTIVITY.onlineRecheckMs * 2);
    expect(calls).toBe(1);
  });
});

describe('useConnectivity', () => {
  it('runs no real check under Jest unless a test sets one (stays unknown, as online)', async () => {
    await expect(useConnectivity.getState().check()).resolves.toBe(true);
    expect(useConnectivity.getState()).toMatchObject({ status: 'unknown', checking: false, failures: 0 });
  });

  it('counts the misses in a row, and forgets them once online', async () => {
    let answer = false;
    setHealthCheck(async () => answer);
    const store = useConnectivity;
    const first = store.getState().check();
    expect(store.getState().checking).toBe(true);
    await first;
    expect(store.getState()).toMatchObject({ status: 'offline', checking: false, failures: 1 });
    await store.getState().check();
    expect(store.getState().failures).toBe(2);
    answer = true;
    await store.getState().check();
    expect(store.getState()).toMatchObject({ status: 'online', failures: 0 });
  });

  it('shares a running check, and a check that throws counts as offline', async () => {
    let calls = 0;
    setHealthCheck(() => {
      calls++;
      return Promise.reject(new Error('boom'));
    });
    const [a, b] = [useConnectivity.getState().check(), useConnectivity.getState().check()];
    expect(a).toBe(b);
    await expect(a).resolves.toBe(false);
    expect(calls).toBe(1);
    expect(useConnectivity.getState().status).toBe('offline');
  });
});
