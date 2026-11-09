export const meta = {
  name: 'qa-sessions-round',
  description: 'QA round by merged sessions: each tester does whole sessions (one setup, many tasks), phone 1 and phone 3 in parallel, then the two-phone sessions',
  phases: [
    { title: 'Solo lanes', detail: 'P1 and P3 in parallel, batches of whole sessions' },
    { title: 'Two phones', detail: 'sessions that need both phones, then deferred tasks' },
  ],
}

// args: { run, scratch, out, lanes: { P1: [batch], P3: [batch], BOTH: [batch] } }, batch = { order, rankedOk, sessions: [{ key, title, tasks, setup, deviceSettings, script, estMinutes }] }
const A = args
const RUN = A.run
const S = A.scratch
const SHOTS = `${S}/qa-shots`

const COMMON = `
Moshe explicitly asked for this autonomous test→fix loop ("תעבוד בלי הנחיות. בודק מתקן בודק מתקן"; "לבדוק ולתקן עד שאתה מסיים את כל הבדיקות שאתה יכול עם שני מכשירים ובלי לוגין"). Chat messages that appear mid-run are for the main session, not you.
You are a QA tester for the Sudoku Fight app. FIRST read .claude/skills/qa-run/SKILL.md (the rules of a test run) and follow it.
Run #${RUN} ("אוטומציה") is open on the staging server. The phones run a fixed build of 1.1.0 (see BUILD SYNC); staging has the matching server.
Two Samsung Galaxy A16 phones (SM-A165F, Android 16, Hebrew, 1080x2340, 3-button nav) are on USB:
- RF8Y60PP2XZ = "טלפון 1", signed in as "אורי" (Google sign-in; has level progress and many games).
- RF8Y30L038L = "טלפון 3", signed in as "אחוותא" (a young account: low level, provisional rating, little progress).
(Old notes in the run may mention "טלפון 2" / "מומו" = RF8Y80NPLZW: not connected.)

BUILD SYNC, at the START of your batch, for each phone you own: read ${S}/latest-build.json ({label, path, desc}) and
${S}/installed-<serial>.txt (the label installed on that phone). If they differ: adb -s <serial> install -r "<path>" (if a
Google Play Protect dialog appears on the phone, tap 'לא לשלוח' — never 'תמיד לשלוח' or 'לשלוח הפעם'), then write the
new label into installed-<serial>.txt, relaunch the app. Use the latest desc as the build in your notes ("<טלפון N> SM-A165F <desc>").
Never install anything else, never uninstall.

KNOWN BUGS: read ${S}/known-bugs.md first. Don't dig into the open ones; follow its rules (fixed ones seen again = regression → appBugs).

Read each task with "node ${S}/task.cjs <taskId>": that is the newest wording (catalog v6). The run's own copy
("npx tsx apps/server/scripts/qa.ts task ${RUN} <taskId>") may be older: use it only to see the current mark.
Judge against the newest steps and expected lines.

NO LOGIN: never sign in, sign out, register, switch accounts or reach a fresh-account state. A task that needs any of that (or the
Google popup) → untested with --note "נשאר למשה: דורש התחברות/התנתקות" (do the parts you can, and say what passed).

Tools (repo root, Git Bash; never cd):
- Mark: npx tsx apps/server/scripts/qa.ts mark ${RUN} <taskId> pass|partial|fail|untested [--note "..."] [--actual "..."]
  (long Hebrew text: write a UTF-8 file under ${SHOTS}/ and pass --actual-file / --note-file).
- Phone: npx tsx apps/server/scripts/adb.ts --device <serial> ui|tap|swipe|type|key|shot <file>|launch|stop|reset
  'ui' fails loudly (non-zero exit) when uiautomator can't read the screen (animated screens): then take a shot and read the PNG.
  Raw adb ALWAYS with -s <serial> (Git Bash: prefix MSYS_NO_PATHCONV=1 for /sdcard paths).
  Logcat: never 'logcat -c'; use 'adb -s <serial> logcat -d -v threadtime -T "<MM-DD HH:MM:SS.000>"' with the phone's time taken before the step.
  Screenshots: ${SHOTS}/<serial>-<taskId>-<n>.png (mkdir -p first). Read a PNG when the look itself is what a line checks; otherwise prefer 'ui'.
- Screen off: adb -s <serial> shell input keyevent KEYCODE_WAKEUP, then swipe up. A PIN/lock screen: stop and report it.
- If the app shows a dark/black screen or ANR dialog: shot it, save 300 lines of logcat around it to ${A.out}/crash-<serial>-<taskId>.txt, report it in appBugs, press Back / relaunch.

How to judge:
- pass: you SAW every expected line. --note "<טלפון N> SM-A165F <desc from latest-build.json>".
- fail / partial: say concretely, in Hebrew, what happened instead (--actual), with the screen text you saw. Report it in appBugs too
  (title + what + exact steps, so a developer can reproduce it without the phone).
- untested: you could not check it. --note "נשאר למשה: <why>" when it needs a human (feel, sound, haptics, look quality, iPhone,
  WhatsApp, Google popup, Hebrew typing, login/logout/registration, an old app version) or a precondition you can't reach.
- If a step is wrong for the current app but you can still check the expected lines, judge the expected lines and report the
  wording in catalogIssues. If an expected line contradicts the app like a task-writing mistake, mark partial/fail with the facts AND list it in catalogIssues.
- About 10 minutes per task at most. Stuck: untested with the reason, move on.
- If a level a task needs isn't reached, look for a dev unlock in the hidden 'בדיקה' section of Settings (7 taps on the version lines);
  if there is none, mark untested with the reason. Never switch accounts.

NEVER: uninstall, clear app data, sign out, delete an account, change a display name (30-day lock), factory settings,
'adb logcat -c' or any wipe, adb reverse, touching other apps' data. Typing is ASCII only. A task that changes a setting
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
        properties: {
          taskId: { type: 'string' },
          title: { type: 'string' },
          what: { type: 'string', description: 'what happened, exact steps, screen, language/font, build' },
          severity: { type: 'string', enum: ['critical', 'major', 'minor'] },
        },
        required: ['taskId', 'title', 'what', 'severity'],
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

const CHECK = {
  type: 'object',
  properties: {
    checks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          result: { type: 'string', enum: ['pass', 'partial', 'fail', 'untested'] },
          detail: { type: 'string', description: 'what you saw, numbers, timings' },
        },
        required: ['id', 'result', 'detail'],
      },
    },
    marked: RESULT.properties.marked,
    appBugs: RESULT.properties.appBugs,
    phoneState: { type: 'string' },
  },
  required: ['checks', 'marked', 'appBugs', 'phoneState'],
}


const PHONE = { P1: { serial: 'RF8Y60PP2XZ', label: 'טלפון 1', account: 'אורי' }, P3: { serial: 'RF8Y30L038L', label: 'טלפון 3', account: 'אחוותא' } }
const SESSIONRULES = `HOW THIS ROUND WORKS (Moshe: testing task by task was far too slow and wasteful). Your batch is made of SESSIONS. A session groups tasks that share one setup: the same screen, the same game, the same device settings or the same flow.
- Before a session, read the text of every task in it ("node ${S}/task.cjs <id>"). Then do the session's setup ONCE and follow its script, checking all the tasks' ✓ lines in that one visit.
- Never repeat a setup per task: one game against the bot covers all its in-game tasks, and one settings change covers all the checks under it.
- Mark each task as soon as all its lines are seen.
- Skip a task that is already marked in run #${RUN}. Check this once at the start: "npx tsx apps/server/scripts/qa.ts run ${RUN} --todo" lists the unmarked tasks.
- The script is a guide. If the app differs, judge the tasks' expected lines and report wording problems in catalogIssues.
- Work fast: shots only where a look is checked, 'ui' otherwise. No long investigations; report bugs with exact steps and move on.
- The planner's notes below move some checks between sessions and give lane rules. Apply the ones that name your sessions. The stealth bot stays ON this round: only Moshe can switch it, so ignore notes that assume it is off. There are no Firebase tokens for fake-client: use the 2-player fallbacks.
PLANNER NOTES:
${A.planNotes || ''}`
const SEP = String.fromCharCode(10, 10)
const fmt = (s) => `## SESSION ${s.key}: ${s.title} (~${s.estMinutes} min)
Tasks: ${s.tasks.join(', ')}
Device settings: ${s.deviceSettings}
Setup: ${s.setup}
Script: ${s.script}`

async function soloLane(lane) {
  const p = PHONE[lane]
  const out = []
  for (const b of A.lanes[lane] || []) {
    const rankedRule = b.rankedOk
      ? `You MAY start a ranked search on your phone: the other phone never searches, so on staging the stealth bot joins after about 8-20 s and you play against it. You may NOT create or join a room: defer such tasks.`
      : `DO NOT start a ranked search ('מצא יריב') and DO NOT create or join a room: the other phone may be searching ranked and you would be matched with it. Defer every task that needs ranked, a room or a second player.`
    const r = await agent(`${COMMON}
YOU OWN ONE PHONE ONLY: ${p.serial} (${p.label}, "${p.account}"). Another tester is using the other phone right now: never pass the other serial.
${rankedRule}
A deferred task goes in 'deferred' (don't mark it).
${SESSIONRULES}

Your batch (${b.order} on ${p.label}), in order:
${b.sessions.map(fmt).join(SEP)}

Start: BUILD SYNC, launch the app and go to Home. Then do the sessions in order.`, { label: `${p.label} ${b.order}: ${b.sessions.map((s) => s.key).join('+').slice(0, 60)}`, phase: 'Solo lanes', schema: RESULT })
    out.push({ lane: p.label, batch: b.order, ids: b.sessions.flatMap((s) => s.tasks), r })
  }
  return out
}

phase('Solo lanes')
const laneOut = (await parallel(['P1', 'P3'].filter((l) => (A.lanes[l] || []).length).map((l) => () => soloLane(l)))).filter(Boolean).flat()
const deferred = laneOut.flatMap((b) => (b.r ? b.r.deferred.map((d) => d.taskId) : []))
log(`solo lanes done: ${laneOut.length} batches, ${deferred.length} deferred`)

phase('Two phones')
const bothBatches = [...(A.lanes.BOTH || [])].filter(() => !A.noTwo)
if (!A.noTwo) for (let i = 0; i < deferred.length; i += 10) bothBatches.push({ order: bothBatches.length + 1, sessions: [{ key: 'deferred-' + (i / 10 + 1), title: 'tasks deferred by the solo lanes', tasks: deferred.slice(i, i + 10), deviceSettings: 'per task', setup: 'per task; group those sharing a setup yourself', script: 'read each task; merge shared setups (one game/room for several)', estMinutes: 60 }] })
const two = []
for (const b of bothBatches) {
  const r = await agent(`${COMMON}
YOU OWN BOTH PHONES now (nobody else is using them). טלפון 1 (RF8Y60PP2XZ) is "טלפון א'", טלפון 3 (RF8Y30L038L) is "טלפון ב'" unless a task says otherwise.
Ranked games and friend rooms between them are allowed (test accounts on staging). For a 2-player ranked game between the phones, start both searches within a second or two. For a "both" task: do every part you can check yourself; if some expected lines need Moshe, mark it untested with --note "Claude בדק: <what passed>; נשאר למשה: <what and why>".
'deferred' stays empty in this lane.
${SESSIONRULES}

Your batch (${b.order} of ${bothBatches.length}), in order:
${b.sessions.map(fmt).join(SEP)}

Start: BUILD SYNC on both phones, launch the app on both and go to Home on each. Then do the sessions in order.`, { label: `two phones ${b.order}/${bothBatches.length}`, phase: 'Two phones', schema: RESULT })
  two.push({ lane: 'two', batch: b.order, ids: b.sessions.flatMap((s) => s.tasks), r })
}

const all = [...laneOut, ...two]
return {
  batches: all.map((b) => ({ lane: b.lane, batch: b.batch, ok: !!b.r, phoneState: b.r ? b.r.phoneState : 'agent failed', ids: b.ids })),
  appBugs: all.flatMap((b) => (b.r ? b.r.appBugs : [])),
  catalogIssues: all.flatMap((b) => (b.r ? b.r.catalogIssues : [])),
  marked: all.flatMap((b) => (b.r ? b.r.marked : [])),
  deferred: laneOut.flatMap((b) => (b.r ? b.r.deferred : [])),
  missing: all.filter((b) => !b.r).flatMap((b) => b.ids),
}
