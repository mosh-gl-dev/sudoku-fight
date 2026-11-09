export const meta = {
  name: 'qa-run-2-remaining',
  description: 'Run the remaining claude/both QA tasks of run #2 on two phones (fixed build of 2026-11-03)',
  phases: [
    { title: 'Solo lanes', detail: 'one tester per phone, 10 tasks per agent' },
    { title: 'Two phones', detail: 'rooms, network, and the tasks the solo lanes deferred' },
  ],
}

const RUN = args.run
const S = args.scratch
const BUILD = args.build
const SHOTS = `${S}/qa-shots`

const COMMON = `
You are a QA tester for the Sudoku Fight app. FIRST read .claude/skills/qa-run/SKILL.md (the rules of a test run) and follow it.
Run #${RUN} ("אוטומציה") is open on the staging server. The phones run a fixed build of 1.1.0 (fixes of 2026-11-03; newer builds may arrive during the run, see BUILD SYNC); staging has the matching server.
Two Samsung Galaxy A16 phones (SM-A165F, Android 16, Hebrew, 1080x2340, 3-button nav) are on USB:
- RF8Y60PP2XZ = "טלפון 1", signed in as "אורי" (Google sign-in; has level progress and many games).
- RF8Y30L038L = "טלפון 3", signed in as "אחוותא" (a young account: level 2, provisional rating, little progress).
(Old notes in the run may mention "טלפון 2" / "מומו" = RF8Y80NPLZW: not connected now.)

BUILD SYNC, at the START of your batch, for each phone you own: read ${S}/latest-build.json ({label, path, desc}) and
${S}/installed-<serial>.txt (the label installed on that phone). If they differ: adb -s <serial> install -r "<path>" (if a
Google Play Protect dialog appears on the phone, tap 'לא לשלוח' — never 'תמיד לשלוח' or 'לשלוח הפעם'), then write the
new label into installed-<serial>.txt, relaunch the app. Use the latest desc as the build in your notes ("<טלפון N> SM-A165F <desc>").
Never install anything else, never uninstall.

KNOWN BUGS: read ${S}/known-bugs.md first. Don't dig into those; follow its rules.

Read each task with "node ${S}/task.cjs <taskId>": that is the newest wording (catalog v6). The run's own copy
("npx tsx apps/server/scripts/qa.ts task ${RUN} <taskId>") is older (v5): use it only to see the current mark.
Judge against the v6 steps and expected lines.

Tools (repo root, Git Bash; never cd):
- Mark: npx tsx apps/server/scripts/qa.ts mark ${RUN} <taskId> pass|partial|fail|untested [--note "..."] [--actual "..."]
  (long Hebrew text: write a UTF-8 file under ${SHOTS}/ and pass --actual-file / --note-file).
- Phone: npx tsx apps/server/scripts/adb.ts --device <serial> ui|tap|swipe|type|key|shot <file>|launch|stop|reset
  'ui' fails loudly (non-zero exit) when uiautomator can't read the screen (animated screens): then take a shot and read the PNG.
  Raw adb ALWAYS with -s <serial> (Git Bash: prefix MSYS_NO_PATHCONV=1 for /sdcard paths).
  Screenshots: ${SHOTS}/<serial>-<taskId>-<n>.png (mkdir -p first). Read a PNG when the look itself is what a line checks; otherwise prefer 'ui'.
- Screen off: adb -s <serial> shell input keyevent KEYCODE_WAKEUP, then swipe up. A PIN/lock screen: stop and report it.

How to judge:
- pass: you SAW every expected line. --note "<טלפון N> SM-A165F <desc from latest-build.json>".
- fail / partial: say concretely, in Hebrew, what happened instead (--actual), with the screen text you saw. Report it in appBugs too.
- untested: you could not check it. --note "נשאר למשה: <why>" when it needs a human (feel, sound, haptics, look quality, iPhone,
  WhatsApp, Google popup, Hebrew typing, signing out / a fresh account / registration, an old app version) or a precondition you can't reach.
- If a step is wrong for the current app but you can still reach and check the expected lines, judge the expected lines and report the
  wording in catalogIssues. If an expected line contradicts the app in a way that looks like a task-writing mistake, mark partial/fail with
  the facts AND list it in catalogIssues.
- About 10 minutes per task at most. Stuck: untested with the reason, move on.
- If a level a task needs isn't reached, look for a dev unlock in the hidden 'בדיקה' section of Settings (7 taps on the version lines);
  if there is none, mark untested with the reason. Never switch accounts.

NEVER (these need Moshe's OK): uninstall, clear app data, sign out, delete an account, change a display name (30-day lock),
factory settings, 'adb logcat -c' or any wipe, adb reverse, touching other apps' data. Typing is ASCII only. A task that changes a setting
(app setting, font scale, display size/density, animation scales, airplane mode, app locale, Wi-Fi) MUST put it back. At the end of your
batch: adb.ts --device <serial> reset for each phone you used, app language Hebrew (adb -s <serial> shell cmd locale set-app-locales
com.mosheg.sudokufight --locales he if needed), relaunch the app and leave it on Home.
`

const RESULT = {
  type: 'object',
  properties: {
    marked: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
          result: { type: 'string', enum: ['pass', 'partial', 'fail', 'untested'] },
          summary: { type: 'string', description: 'Hebrew, one line: what you saw' },
        },
        required: ['taskId', 'result', 'summary'],
      },
    },
    deferred: {
      type: 'array',
      description: 'solo lanes only: tasks NOT marked because they need the other phone (or, on טלפון 3, a ranked search)',
      items: { type: 'object', properties: { taskId: { type: 'string' }, why: { type: 'string' } }, required: ['taskId', 'why'] },
    },
    appBugs: {
      type: 'array',
      items: {
        type: 'object',
        properties: { taskId: { type: 'string' }, title: { type: 'string' }, what: { type: 'string' } },
        required: ['taskId', 'title', 'what'],
      },
    },
    catalogIssues: {
      type: 'array',
      items: { type: 'object', properties: { taskId: { type: 'string' }, issue: { type: 'string' } }, required: ['taskId', 'issue'] },
    },
    phoneState: { type: 'string', description: 'how you left the phone(s): screen, settings, anything not restored' },
  },
  required: ['marked', 'deferred', 'appBugs', 'catalogIssues', 'phoneState'],
}

async function soloLane(lane) {
  const out = []
  const rankedRule = lane.ranked
    ? `You MAY start a ranked search on your phone: the other phone never searches, so on staging the stealth bot joins after about 8-20 s and you play against it. You may NOT create or join a room ('צור חדר', 'הצטרף עם קוד' with a real code): defer such tasks. Defer tasks that need a second human player.`
    : `DO NOT start a ranked search ('מצא יריב') and DO NOT create or join a room: the other phone may be in a ranked search and you would be matched with it. Defer every task that needs ranked, a room or a second player.`
  for (let i = 0; i < lane.chunks.length; i++) {
    const ids = lane.chunks[i]
    const r = await agent(
      `${COMMON}
YOU OWN ONE PHONE ONLY: ${lane.serial} (${lane.label}, "${lane.account}"). Another tester is using the other phone right now: never pass the other serial.
${rankedRule}
A deferred task goes in 'deferred' (don't mark it); if only one of its expected lines needs that, still defer it whole.

Your tasks, in order (batch ${i + 1} of ${lane.chunks.length} on this phone): ${ids.join(', ')}

Start: launch the app on your phone and go to Home. Then for each task: read it, do it, mark it.`,
      { label: `${lane.label} ${i + 1}/${lane.chunks.length}`, phase: 'Solo lanes', schema: RESULT },
    )
    out.push({ lane: lane.label, batch: i + 1, ids, r })
  }
  return out
}

phase('Solo lanes')
const solo = (await parallel(args.lanes.map((lane) => () => soloLane(lane)))).filter(Boolean).flat()
const deferred = solo.flatMap((b) => (b.r ? b.r.deferred.map((d) => d.taskId) : []))
log(`solo lanes done: ${solo.length} batches, ${deferred.length} deferred to the two-phone lane`)

phase('Two phones')
const bothChunks = [...args.both]
for (let i = 0; i < deferred.length; i += 8) bothChunks.push(deferred.slice(i, i + 8))
const two = []
for (let i = 0; i < bothChunks.length; i++) {
  const ids = bothChunks[i]
  const r = await agent(
    `${COMMON}
YOU OWN BOTH PHONES now (nobody else is using them). טלפון 1 (RF8Y60PP2XZ) is "טלפון א'", טלפון 3 (RF8Y30L038L) is "טלפון ב'" unless a task says otherwise.
Ranked games and friend rooms between them are allowed (test accounts on staging). For a 2-player ranked game between the phones, start both searches within a second or two (otherwise the stealth bot may join one of them). For a "both" task: do every part you can check yourself; if some expected lines need Moshe, mark it untested with --note "Claude בדק: <what passed>; נשאר למשה: <what and why>" - or fail/partial if something you checked was wrong.
'deferred' stays empty in this lane.

Your tasks, in order (batch ${i + 1} of ${bothChunks.length}): ${ids.join(', ')}

Start: launch the app on both phones and go to Home on each. Then for each task: read it, do it, mark it.`,
    { label: `two phones ${i + 1}/${bothChunks.length}`, phase: 'Two phones', schema: RESULT },
  )
  two.push({ lane: 'two', batch: i + 1, ids, r })
}

const all = [...solo, ...two]
return {
  batches: all.map((b) => ({ lane: b.lane, batch: b.batch, ok: !!b.r, phoneState: b.r ? b.r.phoneState : 'agent failed', ids: b.ids })),
  appBugs: all.flatMap((b) => (b.r ? b.r.appBugs : [])),
  catalogIssues: all.flatMap((b) => (b.r ? b.r.catalogIssues : [])),
  marked: all.flatMap((b) => (b.r ? b.r.marked : [])),
  missing: all.filter((b) => !b.r).flatMap((b) => b.ids),
}
