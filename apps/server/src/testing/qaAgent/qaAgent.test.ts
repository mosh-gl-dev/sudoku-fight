import type { AdminQaBug, AdminQaItem, AdminQaRun } from '@sudoku-fight/protocol';

import {
  centerOf,
  describeNodes,
  dumpUi,
  findNode,
  formatBug,
  formatItem,
  formatRun,
  isPng,
  isUiDump,
  parseUiDump,
  readToken,
  serverUrlOf,
  UI_DUMP_RETRY_MS,
  UI_DUMP_TRIES,
  type UiDumpDevice,
} from './index';

const DUMP = `<?xml version='1.0' encoding='UTF-8' standalone='yes' ?><hierarchy rotation="0">
<node index="0" text="" resource-id="" class="android.widget.FrameLayout" content-desc="" clickable="false" bounds="[0,0][1080,2400]">
<node index="1" text="משחק חדש" resource-id="com.mosheg.sudokufight:id/home-new-game" class="android.widget.TextView" content-desc="" clickable="true" bounds="[100,200][980,320]" />
<node index="2" text="A &amp; B &quot;C&quot; &#1488;" resource-id="" class="android.widget.TextView" content-desc="" clickable="false" bounds="[0,400][500,450]" />
<node index="3" text="" resource-id="" class="android.view.View" content-desc="הגדרות" clickable="true" bounds="[900,40][1040,180]" />
<node index="4" text="משחק חדש עם חברים" resource-id="" class="android.widget.TextView" content-desc="" clickable="true" bounds="[100,600][980,700]" />
</node></hierarchy>`;

describe('the ADB screen dump', () => {
  it('keeps the views with a text, a description, an id or a click, unescaped, with their bounds', () => {
    const nodes = parseUiDump(DUMP);
    expect(nodes.map((n) => n.text || n.desc)).toEqual([
      'משחק חדש',
      'A & B "C" א',
      'הגדרות',
      'משחק חדש עם חברים',
    ]);
    expect(nodes[0]).toMatchObject({ clickable: true, bounds: [100, 200, 980, 320] });
    expect(centerOf(nodes[0]!)).toEqual({ x: 540, y: 260 });
  });

  it('finds an exact text, description or testID before a view that only contains it', () => {
    const nodes = parseUiDump(DUMP);
    expect(findNode(nodes, 'משחק חדש')?.bounds).toEqual([100, 200, 980, 320]);
    expect(findNode(nodes, 'הגדרות')?.desc).toBe('הגדרות');
    expect(findNode(nodes, 'home-new-game')?.text).toBe('משחק חדש');
    expect(findNode(nodes, 'עם חברים')?.text).toBe('משחק חדש עם חברים');
    expect(findNode(nodes, 'אין כזה')).toBeNull();
    expect(findNode(nodes, '  ')).toBeNull();
  });

  it('reads the screen as short lines: label, centre, and whether it takes a tap', () => {
    expect(describeNodes(parseUiDump(DUMP))[0]).toBe('"משחק חדש" id=home-new-game @540,260 [tap]');
  });
});

describe('a fresh dump every time (QA run #2: an animated screen read as the one before it)', () => {
  const IDLE_ERROR = 'ERROR: could not get idle state.';
  const OLD = DUMP.replace('משחק חדש', 'המסך הקודם');

  /** A phone whose uiautomator fails `failures` times before it dumps `DUMP`; the old screen's file is there. */
  function fakePhone(failures: number) {
    const files = new Map([['/sdcard/qa-ui.xml', OLD]]);
    const calls: string[] = [];
    let left = failures;
    const device: UiDumpDevice = {
      shell: (...args) => {
        calls.push(args.join(' '));
        if (args[0] === 'rm') files.delete(args[2]!);
        if (args[0] !== 'uiautomator') return '';
        if (left-- > 0) return IDLE_ERROR;
        files.set(args[2]!, DUMP);
        return `UI hierchary dumped to: ${args[2]}`;
      },
      read: (path) => files.get(path) ?? `cat: ${path}: No such file or directory`,
      sleep: (ms) => calls.push(`sleep ${ms}`),
    };
    return { device, calls };
  }

  it('deletes the old dump before it dumps, and reads the new one', () => {
    const { device, calls } = fakePhone(0);
    expect(dumpUi(device, '/sdcard/qa-ui.xml')).toBe(DUMP);
    expect(calls).toEqual(['rm -f /sdcard/qa-ui.xml', 'uiautomator dump /sdcard/qa-ui.xml']);
  });

  it('tries again, briefly, while the screen will not settle', () => {
    const { device, calls } = fakePhone(UI_DUMP_TRIES - 1);
    expect(parseUiDump(dumpUi(device, '/sdcard/qa-ui.xml'))[0]?.text).toBe('משחק חדש');
    expect(calls.filter((c) => c === `sleep ${UI_DUMP_RETRY_MS}`)).toHaveLength(UI_DUMP_TRIES - 1);
    expect(calls.filter((c) => c.startsWith('rm '))).toHaveLength(UI_DUMP_TRIES);
  });

  it('then fails with uiautomator’s reason instead of the old screen', () => {
    const { device, calls } = fakePhone(UI_DUMP_TRIES);
    expect(() => dumpUi(device, '/sdcard/qa-ui.xml')).toThrow(
      `uiautomator could not read the screen (${UI_DUMP_TRIES} tries): ${IDLE_ERROR}`,
    );
    expect(() => dumpUi(fakePhone(UI_DUMP_TRIES).device, '/sdcard/qa-ui.xml')).toThrow(/keeps moving/);
    expect(calls.filter((c) => c.startsWith('uiautomator'))).toHaveLength(UI_DUMP_TRIES);
  });

  it('a dump is whole, from <hierarchy> to its end', () => {
    expect(isUiDump(DUMP)).toBe(true);
    expect(isUiDump(`${DUMP}\n`)).toBe(true);
    expect(isUiDump(DUMP.slice(0, -20))).toBe(false);
    expect(isUiDump('cat: /sdcard/qa-ui.xml: No such file or directory')).toBe(false);
    expect(isUiDump('')).toBe(false);
  });

  it('a shot is a PNG, not the error text adb passes on in its place', () => {
    expect(isPng(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]))).toBe(true);
    expect(isPng(Buffer.from('/system/bin/sh: screencap: inaccessible or not found'))).toBe(false);
    expect(isPng(Buffer.alloc(0))).toBe(false);
  });
});

describe('the API side', () => {
  it('a server by name or URL; anything else is refused', () => {
    expect(serverUrlOf('staging')).toBe('https://sudoku-fight-staging.fly.dev');
    expect(serverUrlOf('local')).toBe('http://localhost:2567');
    expect(serverUrlOf('http://192.168.1.5:2567/')).toBe('http://192.168.1.5:2567');
    expect(() => serverUrlOf('prod')).toThrow('unknown server');
  });

  it('the key comes from its file, trimmed; an error names the file and never shows the key', () => {
    const key = 'k'.repeat(40);
    expect(readToken('/x/qa-agent.token', () => `${key}\r\n`)).toBe(key);
    expect(() => readToken('/x/qa-agent.token', () => 'short')).toThrow(/shorter than 32/);
    expect(() =>
      readToken('/x/qa-agent.token', () => {
        throw new Error('ENOENT');
      }),
    ).toThrow('no agent key in /x/qa-agent.token');
  });

  it('prints a run and a task the way Claude reads them', () => {
    const run = {
      id: 3,
      title: 'בדיקה',
      appVersion: '1.0.5',
      device: 'Pixel',
      platform: 'android',
      status: 'open',
      counts: { total: 4, untested: 1, pass: 1, partial: 1, fail: 1, openBugs: 2, handled: 0 },
    } as AdminQaRun;
    expect(formatRun(run)).toBe(
      '#3 [open] בדיקה (1.0.5 · android · Pixel) V 1 · ½ 1 · X 1 · · 1 / 4; bugs open 2, handled 0',
    );
    const item = {
      taskId: 'friends-room-create',
      who: 'claude',
      title: 'יצירת חדר',
      subtitle: 'בדוק יצירת חדר עם קוד',
      categoryTitle: 'חברים',
      subcategoryTitle: 'חדר',
      steps: ['פותחים', 'לוחצים'],
      expected: ['רואים קוד'],
      result: 'fail',
      actual: 'אין קוד',
      note: null,
      bugStatus: 'handled',
      fixNote: 'תוקן',
      fixedIn: '1.0.5',
    } as AdminQaItem;
    expect(formatItem(item)).toBe('X friends-room-create [claude] יצירת חדר {handled}');
    expect(formatItem(item, true).split('\n')).toEqual([
      'X friends-room-create [claude] יצירת חדר {handled}',
      '  בדוק יצירת חדר עם קוד',
      '  חברים › חדר',
      '  1. פותחים',
      '  2. לוחצים',
      '  ✓ רואים קוד',
      '  בפועל: אין קוד',
      '  טופל (1.0.5): תוקן',
    ]);
    // A task of a run opened before subtitles: no subtitle line.
    expect(
      formatItem({ ...item, subtitle: null }, true)
        .split('\n')
        .slice(0, 2),
    ).toEqual(['X friends-room-create [claude] יצירת חדר {handled}', '  חברים › חדר']);
  });

  it('prints a bug with its subtitle on the second line (none on a run from before subtitles)', () => {
    const bug = {
      run: { id: 3, title: 'בדיקה', appVersion: '1.0.5', device: null, platform: null, status: 'open' },
      taskId: 'friends-room-create',
      categoryTitle: 'חברים',
      subcategoryTitle: 'חדר',
      title: 'יצירת חדר',
      subtitle: 'בדוק יצירת חדר עם קוד',
      steps: ['פותחים'],
      expected: ['רואים קוד'],
      result: 'partial',
      actual: 'הקוד חתוך',
      note: 'רק בטלפון קטן',
      bugStatus: 'open',
      fixNote: null,
      fixedIn: null,
    } as AdminQaBug;
    expect(formatBug(bug).split('\n')).toEqual([
      '½ friends-room-create {open} run #3 בדיקה (1.0.5)',
      '  בדוק יצירת חדר עם קוד',
      '  חברים › חדר › יצירת חדר',
      '  1. פותחים',
      '  ✓ רואים קוד',
      '  בפועל: הקוד חתוך',
      '  הערה: רק בטלפון קטן',
    ]);
    expect(
      formatBug({ ...bug, subtitle: null })
        .split('\n')
        .slice(0, 2),
    ).toEqual(['½ friends-room-create {open} run #3 בדיקה (1.0.5)', '  חברים › חדר › יצירת חדר']);
    // Short (bugs --short): the run, the subtitle and the title, nothing more.
    expect(formatBug(bug, false).split('\n')).toEqual([
      '½ friends-room-create {open} run #3 בדיקה (1.0.5)',
      '  בדוק יצירת חדר עם קוד',
      '  חברים › חדר › יצירת חדר',
    ]);
  });
});
