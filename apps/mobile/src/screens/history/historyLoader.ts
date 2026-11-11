import type { GameResult } from '@sudoku-fight/engine';
import type { HistoryGame } from '@sudoku-fight/protocol';

import { supportCodeOf } from '../../components/ui/stateModel';
import type { PracticeGameRecord, PracticeRepo } from '../../game/practiceRepo';
import { HISTORY_OFFLINE_CODES, type HistoryApi, isHistoryApiError } from './historyApi';
import {
  type HistoryEntry,
  type HistoryFilter,
  mergeEntries,
  PAGE_SIZE,
  practiceEntry,
  rankedEntry,
} from './historyModel';

/**
 * The history's data (spec §14.1): ranked games from the server and practices from the phone, merged newest
 * first, 20 more at a time. Each list is read only as far as the cards on screen need: to show the first n of
 * the merge, each source must have n (or be done), since whatever a source has not read yet is older than
 * everything it has. Offline, or signed out, the practices still show, with a note (spec §16).
 */

export type RankedStatus = 'ok' | 'signedOut' | 'offline' | 'error';

export interface HistorySnapshot {
  filter: HistoryFilter;
  entries: HistoryEntry[];
  /** More cards can come ("עוד משחקים"). */
  hasMore: boolean;
  ranked: RankedStatus;
  /** Why the ranked games could not be read, for support (spec §16.3: "unavailable-503"); null when they could. */
  rankedCode: string | null;
  /** False when the practice database could not be read. */
  practiceOk: boolean;
}

export interface HistoryDeps {
  /** The practice database, or null when it can't open. */
  practice: () => Promise<PracticeRepo | null>;
  /** The server's history; null when nobody is signed in. */
  ranked: HistoryApi | null;
}

/**
 * Server pages read in one call at the most, while too few of them are for the filter: what an older server
 * (which sends the friends games under "מדורג" too) costs a tap, at the most. Another tap reads on.
 */
export const MAX_PAGES_PER_READ = 10;

/** One list of games from the server, read page by page: every game ("הכל") or the rated ones ("מדורג"). */
interface ServerList {
  rated: boolean;
  games: HistoryGame[];
  cursor: string | null;
  done: boolean;
  status: RankedStatus;
  code: string | null;
  /** The page being read: a second read of the same list waits for it, never asks for the same page again. */
  reading: Promise<void> | null;
  /** Read from, or seeded: "מדורג"'s list starts from what "הכל"'s already has (`ratedList`). */
  started: boolean;
}

/**
 * "מדורג" is the rated games: a game with friends (1.0.4) shows under "הכל" only (historyModel inFilter). An older
 * server sends them under "מדורג" too: they are counted out here as well.
 */
const isRated = (g: HistoryGame) => g.friends !== true;

export class HistoryLoader {
  /**
   * Two lists, each read only as far as its own filter needs (QA loop 18, history-ranked-more): "מדורג" used to
   * page through every server game, friends ones included, and counted them all towards its 20, so with many
   * friends games between the rated ones a tap on "עוד משחקים" read a page of friends games and showed nothing
   * new; and one filter's reads ran on the same list as another's.
   */
  private all: ServerList;
  private rated: ServerList;

  private practice: PracticeGameRecord[] = [];
  private practiceDone = false;
  private practiceOk = true;
  /** The saved results of finished games against a bot (the bot's score on the card), by game id. */
  private results = new Map<string, GameResult | null>();

  private filter: HistoryFilter = 'all';
  private count = PAGE_SIZE;

  constructor(private readonly deps: HistoryDeps) {
    this.all = this.newList(false);
    this.rated = this.newList(true);
  }

  /** The first page of a filter. */
  async show(filter: HistoryFilter): Promise<HistorySnapshot> {
    this.filter = filter;
    this.count = PAGE_SIZE;
    return this.read(filter, PAGE_SIZE);
  }

  /** 20 more cards. */
  async more(): Promise<HistorySnapshot> {
    this.count += PAGE_SIZE;
    return this.read(this.filter, this.count);
  }

  /**
   * Starts over: reads both sources again (after "try again", or a game just played). New lists, not the old ones
   * emptied: a page still on its way lands in the list that asked for it, which is gone (`isLive`).
   */
  async reload(): Promise<HistorySnapshot> {
    this.all = this.newList(false);
    this.rated = this.newList(true);
    this.practice = [];
    this.practiceDone = false;
    this.practiceOk = true;
    return this.show(this.filter);
  }

  private newList(rated: boolean): ServerList {
    const signedIn = this.deps.ranked !== null;
    return {
      rated,
      games: [],
      cursor: null,
      done: !signedIn,
      status: signedIn ? 'ok' : 'signedOut',
      code: null,
      reading: null,
      started: false,
    };
  }

  /** The server's list a filter shows ("אימון": none). */
  private listOf(filter: HistoryFilter): ServerList | null {
    return filter === 'practice' ? null : filter === 'ranked' ? this.ratedList() : this.all;
  }

  /**
   * "מדורג"'s list, the first time from the rated games "הכל" has read already, and on from its cursor (the
   * server's keyset, startedAt and id, is the same with `rated=1` or without): the switch shows them at once, and
   * offline too, as before the two lists; only the pages after them are asked for with `rated=1`.
   */
  private ratedList(): ServerList {
    const rated = this.rated;
    const all = this.all;
    if (!rated.started && (all.games.length > 0 || all.done)) {
      Object.assign(rated, {
        games: all.games.filter(isRated),
        cursor: all.cursor,
        done: all.done,
        status: all.status,
        code: all.code,
        started: true,
      });
    }
    return rated;
  }

  /** Whether a list is still one of the loader's (not one `reload` let go of). */
  private isLive(list: ServerList): boolean {
    return list === this.all || list === this.rated;
  }

  /** Reads what `count` cards of `filter` need; its snapshot is that filter's, whatever was asked meanwhile. */
  private async read(filter: HistoryFilter, count: number): Promise<HistorySnapshot> {
    const list = this.listOf(filter);
    await Promise.all([
      list ? this.fillServer(list, count) : null,
      filter !== 'ranked' ? this.fillPractice(count) : null,
    ]);
    return this.snapshotOf(filter, count);
  }

  /** How many of the list's games its filter shows. */
  private shownOf(list: ServerList): number {
    return list.rated ? list.games.filter(isRated).length : list.games.length;
  }

  private async fillServer(list: ServerList, count: number): Promise<void> {
    let pages = 0;
    list.started = true;
    while (this.isLive(list) && !list.done && this.shownOf(list) < count && pages < MAX_PAGES_PER_READ) {
      if (list.reading) {
        await list.reading;
        continue;
      }
      const reading: Promise<void> = this.readPage(list).finally(() => {
        // Only its own: a newer read of the list is not let go of by an older one.
        if (list.reading === reading) list.reading = null;
      });
      list.reading = reading;
      await reading;
      pages++;
    }
  }

  private async readPage(list: ServerList): Promise<void> {
    const api = this.deps.ranked;
    if (!api) {
      list.done = true;
      return;
    }
    try {
      const page = await api.myGames(list.cursor, list.rated ? { rated: true } : undefined);
      // A list `reload` let go of meanwhile: its page goes nowhere.
      if (!this.isLive(list)) return;
      list.games.push(...page.games);
      list.cursor = page.nextCursor;
      list.done = page.nextCursor === null;
    } catch (error) {
      if (!this.isLive(list)) return;
      list.done = true;
      list.code = supportCodeOf(error);
      list.status = !isHistoryApiError(error)
        ? 'error'
        : HISTORY_OFFLINE_CODES.includes(error.code) || error.code === 'unexpected'
          ? 'offline'
          : error.code === 'signedOut' || error.code === 'unauthorized' || error.code === 'notRegistered'
            ? 'signedOut'
            : 'error';
    }
  }

  private async fillPractice(count: number): Promise<void> {
    if (this.practiceDone || this.practice.length >= count) return;
    try {
      const repo = await this.deps.practice();
      if (!repo) {
        this.practiceOk = false;
        this.practiceDone = true;
        return;
      }
      // One more than needed: whether there are more.
      const limit = count + 1;
      const rows = await repo.listRecent(limit);
      // A longer read (another filter's) that came back first stays.
      if (rows.length < this.practice.length) return;
      this.practice = rows;
      this.practiceDone = rows.length < limit;
      for (const r of rows) {
        if (r.mode === 'solo' || r.status !== 'finished' || this.results.has(r.id)) continue;
        this.results.set(r.id, (await repo.getGame(r.id))?.result ?? null);
      }
    } catch (error) {
      console.warn('[history] could not read the practice games', error);
      this.practiceOk = false;
      this.practiceDone = true;
    }
  }

  /** What the screen shows now. */
  snapshot(): HistorySnapshot {
    return this.snapshotOf(this.filter, this.count);
  }

  private snapshotOf(filter: HistoryFilter, count: number): HistorySnapshot {
    const list = this.listOf(filter);
    const ranked = (list?.games ?? []).map(rankedEntry);
    const practice = this.practice.map((r) => practiceEntry(r, this.results.get(r.id) ?? null));
    const merged = mergeEntries(ranked, practice, filter, count + 1);
    const sourcesLeft = (list !== null && !list.done) || (filter !== 'ranked' && !this.practiceDone);
    // "אימון" shows no server games: its status is that of "הכל"'s list (the screen notes none for it).
    const server = list ?? this.all;
    return {
      filter,
      entries: merged.slice(0, count),
      hasMore: merged.length > count || sourcesLeft,
      ranked: server.status,
      rankedCode: server.status === 'ok' ? null : server.code,
      practiceOk: this.practiceOk,
    };
  }
}
