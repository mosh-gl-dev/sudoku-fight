export const meta = {
  name: 'qa-loop-round',
  description: 'One test round of the autonomous QA loop: optional fix check of the newest build, then N batches per phone lane and two-phone batches',
  phases: [
    { title: 'Fix check', detail: 'newest build: fixed bugs re-checked on the phones' },
    { title: 'Solo lanes', detail: 'one tester per phone, ~10 tasks per agent' },
    { title: 'Two phones', detail: 'rooms, network, deferred tasks' },
  ],
}

// args: { run, scratch, out, lanes:[{serial,label,account,ranked,chunks}], both:[[ids]], from, count, bothFrom, bothCount, extraBoth:[ids], fixcheck }
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

const FIXREF = `Background for the fix check: ${A.out}/fixcheck-result.json (the previous phone check: 'checks' with result, 'appBugs'), ${A.out}/fix3-result.json (round 3, each item has a deviceCheck), ${A.out}/fix4-partial.json + ${A.out}/fix4-rework.json (round 4: ranked VS/countdown), ${A.out}/k1-result.json (the black-screen fix, with its deviceCheck). Read the deviceCheck texts of your items and follow them (but never logcat -c: use -T).
When a check corresponds to a run-#${RUN} task id (fixcheck-result.json checks[].taskId when present, or the task named in the bug), re-mark that task with what you see now ("qa.ts mark"), note "<טלפון N> SM-A165F <desc> (בדיקת תיקון)".`

const TWOCHECK = `${COMMON}
YOU OWN BOTH PHONES now (nobody else is using them). Ranked games and friend rooms between them are allowed (test accounts on staging). For a 2-player ranked game between the phones, start both searches within a second or two (otherwise the stealth bot may join one of them). End games quickly when the check allows (one side surrenders), but play a real game where a check needs it.
FIX CHECK on the newest build. ${FIXREF}
Your items:
- K1 NEW-black-new-game: ranked 2P → Results → 'משחק חדש' on BOTH phones (winner and loser), once ~6 s after Results and once the moment the buttons appear; also a friends-room game → Results → 'משחק חדש' on host and guest. No dark screen; capture logcat (-T) and grep 'addViewAt|handleHostException|getOrCreateDestroyTask' = 0. Re-mark postgame-results-v2-new-game-ranked.
- K2 B37-still: the countdown 3·2·1·GO! (screenrecord at the phone, or many fast shots): '3' visible, digits even, GO! length, with reduced motion off and on (app setting; restore). Re-mark pregame-found-countdown-reduced and the B37 task.
- K3 B43-badges-phone3: the 'מוכן' badges and the avatars' nod on the VS screen, on טלפון 3 especially.
- K4 NEW-3p-timeout-early: one phone searches alone for 3 players: when does the timeout screen appear and what does it say (the search clock vs the text)? Note exact seconds.`
// Each phone runs on its own (fix check, then its batches); the two-phone work waits for both.
const P1CHECK = `${COMMON}
YOU OWN ONE PHONE ONLY: RF8Y60PP2XZ (טלפון 1, "אורי"). Another tester is using the other phone: never pass its serial. No ranked search, no rooms.
FIX CHECK on the newest build. ${FIXREF}
Your items: H1 T3-HISTORY-FREEZE + T3-HISTORY-ALL-ONE-CARD + NEW-history-hidden-cards (History opens fast, every card fully visible); H3 T3-FIRST-PLAY-SLOW (first 'שחק' after a cold start); H4 T3-MOVE-UIPROPS / T3-GAME-RESULTS-HITCH (count 'synchronouslyUpdateUIProps failed' per move in a bot game and at game→results); F4 NEW-hunter-stars-labels-maxfont (font 2.0, restore after); NEW-home-hero-scale (K14, 5 presses + cold starts); and the run tasks that were partial/fail in fixcheck-result.json for these areas: B14, general-ambient-screen-change, avatars-idle-still.`
const P3CHECK = `${COMMON}
YOU OWN ONE PHONE ONLY: RF8Y30L038L (טלפון 3, "אחוותא"). Another tester is using the other phone: never pass its serial. No ranked search, no rooms.
FIX CHECK on the newest build. ${FIXREF}
A previous attempt at this check was interrupted after ~50 minutes: first list today's marks in run #${RUN} (npx tsx apps/server/scripts/qa.ts run ${RUN} and the task notes with 'בדיקת תיקון') and don't redo tasks already re-marked today; still report every item below in checks.
Your items: F1 P3-B3-name (small screen wm size/density in ru/es: restore wm size/density after!), F2 P3-pseudo-cut (en-XA), F3 P3-offline-chip (de/it/nl/id), P3-AR-CLIP, P3-TH-CHIP, P3-JA-A11Y, P3-AR-PLURAL, NEW-he-hidden-single-row-gender, NEW-replay-hud-large-font, P3-HOME-AR; and the run tasks that were partial/fail in fixcheck-result.json for these areas: B3, B12, B50, general-lang19-arabic-rtl, general-lang19-numbers-app, general-lang19-fit-new-game, general-lang19-sweep, general-lang19-pseudo. Restore Hebrew at the end.`
// Optional per-round override: A.checks = { RF8Y60PP2XZ: '<items>', RF8Y30L038L: '<items>', two: '<items>', ref: '<background files>' }; an empty/missing entry = no check for that lane.
const CHECKREF = A.checks ? `FIX CHECK on the newest build. Background: ${A.checks.ref}. Read the deviceCheck texts of your items and follow them (never logcat -c: use -T).
When a check corresponds to a run-#${RUN} task id, re-mark that task with what you see now ("qa.ts mark"), note "<טלפון N> SM-A165F <desc> (בדיקת תיקון)".` : ''
const soloCheck = (serial, label, items) => `${COMMON}
YOU OWN ONE PHONE ONLY: ${serial} (${label}). Another tester is using the other phone: never pass its serial. No ranked search, no rooms.
${CHECKREF}
Your items: ${items}`
const LANECHECK = A.checks
  ? Object.fromEntries(A.lanes.filter((l) => A.checks[l.serial]).map((l) => [l.serial, soloCheck(l.serial, l.label, A.checks[l.serial])]))
  : { RF8Y60PP2XZ: P1CHECK, RF8Y30L038L: P3CHECK }
const TWOCHECK_RUN = A.checks
  ? A.checks.two
    ? `${COMMON}
YOU OWN BOTH PHONES now (nobody else is using them). Ranked games and friend rooms between them are allowed (test accounts on staging). For a 2-player ranked game between the phones, start both searches within a second or two (otherwise the stealth bot may join one of them).
${CHECKREF}
Your items: ${A.checks.two}`
    : ''
  : TWOCHECK

async function soloLane(lane) {
  const out = []
  if (A.fixcheck && LANECHECK[lane.serial]) {
    const c = await agent(LANECHECK[lane.serial], { label: `fixcheck ${lane.label}`, phase: 'Fix check', schema: CHECK })
    out.push({ lane: lane.label, batch: 0, ids: [], r: null, check: c })
  }
  const rankedRule = lane.ranked
    ? `You MAY start a ranked search on your phone: the other phone never searches, so on staging the stealth bot joins after about 8-20 s and you play against it. You may NOT create or join a room ('צור חדר', 'הצטרף עם קוד' with a real code): defer such tasks. Defer tasks that need a second human player.`
    : `DO NOT start a ranked search ('מצא יריב') and DO NOT create or join a room: the other phone may be in a ranked search and you would be matched with it. Defer every task that needs ranked, a room or a second player.`
  const end = Math.min(lane.chunks.length, A.from + A.count)
  for (let i = A.from; i < end; i++) {
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
const laneOut = (await parallel(A.lanes.map((lane) => () => soloLane(lane)))).filter(Boolean).flat()
const fcSolo = laneOut.filter((b) => b.check).map((b) => b.check)
const solo = laneOut.filter((b) => !b.check)
const deferred = solo.flatMap((b) => (b.r ? b.r.deferred.map((d) => d.taskId) : []))
log(`solo lanes done: ${solo.length} batches, ${deferred.length} deferred`)

let fixcheck = null
if (A.fixcheck) {
  phase('Fix check')
  const two = !TWOCHECK_RUN ? null : await agent(TWOCHECK_RUN, { label: 'fixcheck two phones', phase: 'Fix check', schema: CHECK })
  fixcheck = { solo: fcSolo, two }
}

phase('Two phones')
const bothChunks = A.noTwo ? [] : A.both.slice(A.bothFrom || 0, (A.bothFrom || 0) + (A.bothCount || 0))
const pending = [...(A.extraBoth || []), ...deferred]
if (!A.noTwo) for (let i = 0; i < pending.length; i += 8) bothChunks.push(pending.slice(i, i + 8))
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
const fc = fixcheck ? [...fixcheck.solo, fixcheck.two].filter(Boolean) : []
return {
  fixcheck: fc.map((f) => ({ checks: f.checks, phoneState: f.phoneState })),
  batches: all.map((b) => ({ lane: b.lane, batch: b.batch, ok: !!b.r, phoneState: b.r ? b.r.phoneState : 'agent failed', ids: b.ids })),
  appBugs: [...fc.flatMap((f) => f.appBugs || []), ...all.flatMap((b) => (b.r ? b.r.appBugs : []))],
  catalogIssues: all.flatMap((b) => (b.r ? b.r.catalogIssues : [])),
  marked: [...fc.flatMap((f) => f.marked || []), ...all.flatMap((b) => (b.r ? b.r.marked : []))],
  deferred: A.noTwo ? pending : [],
  missing: all.filter((b) => !b.r).flatMap((b) => b.ids),
}
