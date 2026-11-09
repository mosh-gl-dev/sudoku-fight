import { openPracticeRepo, type PracticeRepo } from '../../game/practiceRepo';
import { memoryDb } from '../../game/testing/sqlJsDb';
import { createPracticeHistory } from '../practiceHistory';

const game = (id: string, startedAt: number) => ({
  id,
  mode: 'solo' as const,
  gameType: 'fast' as const,
  puzzleId: 'p',
  playerId: 'me',
  seed: 1,
  startedAt,
});

describe('the recent practices', () => {
  it('lists the saved games, newest first, interrupted ones included', async () => {
    const repo = await openPracticeRepo(await memoryDb());
    await repo.createGame(game('old', 1));
    await repo.createGame(game('new', 2));
    await repo.markInterrupted('old');
    const useHistory = createPracticeHistory(async () => repo);
    expect(useHistory.getState()).toMatchObject({ recent: [], status: 'idle' });

    const loading = useHistory.getState().refresh();
    expect(useHistory.getState().status).toBe('loading');
    await loading;
    expect(useHistory.getState().status).toBe('ready');
    expect(useHistory.getState().recent.map((g) => [g.id, g.status])).toEqual([
      ['new', 'playing'],
      ['old', 'interrupted'],
    ]);
    await useHistory.getState().refresh(1);
    expect(useHistory.getState().recent.map((g) => g.id)).toEqual(['new']);
  });

  it('a list already read stays as it is while read again, and the same games change nothing (B14)', async () => {
    const repo = await openPracticeRepo(await memoryDb());
    await repo.createGame(game('a', 1));
    const useHistory = createPracticeHistory(async () => repo);
    await useHistory.getState().refresh();
    const first = useHistory.getState().recent;
    const changes = jest.fn();
    const stop = useHistory.subscribe(changes);
    // Read again (Home shown again): never 'loading', and no change at all for the same games.
    const again = useHistory.getState().refresh();
    expect(useHistory.getState().status).toBe('ready');
    await again;
    expect(changes).not.toHaveBeenCalled();
    expect(useHistory.getState().recent).toBe(first);
    // A game that changed, or a new one: the new list.
    await repo.markInterrupted('a');
    await useHistory.getState().refresh();
    expect(useHistory.getState().recent.map((g) => [g.id, g.status])).toEqual([['a', 'interrupted']]);
    await repo.createGame(game('b', 2));
    await useHistory.getState().refresh();
    expect(useHistory.getState().recent.map((g) => g.id)).toEqual(['b', 'a']);
    expect(changes).toHaveBeenCalledTimes(2);
    stop();
  });

  it('without a database the list is empty and says so', async () => {
    const useHistory = createPracticeHistory(async () => null);
    await useHistory.getState().refresh();
    expect(useHistory.getState()).toMatchObject({ recent: [], status: 'unavailable' });
  });

  it('a read that fails is logged; an older refresh never overwrites a newer one', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const repo = await openPracticeRepo(await memoryDb());
    await repo.createGame(game('g', 1));
    let calls = 0;
    const flaky: () => Promise<PracticeRepo> = async () => {
      if (++calls === 1) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        throw new Error('busy');
      }
      return repo;
    };
    const useHistory = createPracticeHistory(flaky);
    const slow = useHistory.getState().refresh();
    await useHistory.getState().refresh();
    await slow;
    expect(useHistory.getState()).toMatchObject({
      status: 'ready',
      recent: [expect.objectContaining({ id: 'g' })],
    });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[practice]'), expect.any(Error));
    warn.mockRestore();
  });
});
