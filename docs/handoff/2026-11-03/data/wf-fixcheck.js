export const meta = {
  name: 'qa-fix-check-on-phones',
  description: 'Check every fix of the 2026-11-03 round on the two phones and re-test run #2 fail/partial tasks',
  phases: [
    { title: 'Solo lanes', detail: 'one tester per phone' },
    { title: 'Two phones', detail: 'rooms, ranked, the both-phone checks' },
  ],
}

const S = args.scratch
const RUN = args.run
const BUILD = args.build
const SHOTS = `${S}/qa-shots`

const COMMON = `
You are a QA tester for the Sudoku Fight app. FIRST read .claude/skills/qa-run/SKILL.md (the rules of a test run) and follow it.
Run #${RUN} ("אוטומציה") is open on the staging server. Tonight a fix round changed the app and the server:
- The phones now run a NEW build of 1.1.0 (${BUILD}), installed over the old one. The server (staging) was deployed with the fixes.
- Two Samsung Galaxy A16 phones (SM-A165F, Android 16, Hebrew, 1080x2340, 3-button nav) are on USB:
  RF8Y60PP2XZ = "טלפון 1", signed in as "אורי" (has level progress and many games).
  RF8Y30L038L = "טלפון 3", signed in as "אחוותא" (a young account: level 2, provisional rating, little progress).
  (The run's old notes mention "טלפון 2" / "מומו" = RF8Y80NPLZW: that phone is NOT connected tonight.)
- If a check needs progress the account doesn't have (a level not reached), look for a dev unlock in the hidden 'בדיקה' section of Settings (7 taps on the version lines); if there is none, mark untested with the reason. Never switch accounts.

Your job: confirm on the phone that each fix really works, and re-test run #${RUN} tasks that failed before the fixes.
Inputs:
- ${S}/device-checks.md: for every bug id (### B<n>), the exact steps and what must be seen now. Read only your ids' sections.
- ${S}/fix-notes.md: what was changed for each bug (to write the fix note).
- ${S}/bugs-full.md: the original bug reports (what was seen before).
- Task text: read it with "node ${S}/task.cjs <taskId>" (the newest catalog wording, v6). "npx tsx apps/server/scripts/qa.ts task ${RUN} <taskId>" shows the run's old wording plus its current mark; use it only for the current mark.

Tools (repo root, Git Bash; never cd):
- npx tsx apps/server/scripts/qa.ts mark|fix ${RUN} <taskId> ...   (long Hebrew text: write a UTF-8 file under ${SHOTS}/ and pass --actual-file / --note-file / --fix-note-file)
- npx tsx apps/server/scripts/adb.ts --device <serial> ui|tap|swipe|type|key|shot <file>|launch|stop|reset
  'ui' now FAILS LOUDLY (non-zero exit) when uiautomator can't read the screen, instead of returning an old dump. If it fails, take a shot and read the PNG.
  Raw adb ALWAYS with -s <serial> (Git Bash: prefix MSYS_NO_PATHCONV=1 for /sdcard paths).
- Screenshots: ${SHOTS}/<serial>-fix-<id>-<n>.png (mkdir -p first). These checks are mostly about how things LOOK, so take and Read screenshots where the check is visual (slant, overlap, truncation, transparency). Crop/zoom with node if needed.

For each run #${RUN} task in your list (it is currently fail or partial from before the fixes):
- Do it with the v6 wording. If you now SEE every expected line:
  npx tsx apps/server/scripts/qa.ts fix ${RUN} <taskId> --fix-note-file <file> --fixed-in "${BUILD}"
  The fix note, in Hebrew, 2-4 short lines: what was wrong, what was changed (from fix-notes.md, in plain words), and "נבדק בטלפון N: <what you saw now>". Do NOT re-mark it pass: Moshe confirms fixes on the site himself.
- If it is still wrong, or something new is wrong: mark it again (fail/partial) with --actual-file describing what happens NOW on the new build, concretely, in Hebrew; report it in appBugs.
For each bug id in your list: follow its device check and report pass/fail/partial/untested with concrete evidence (screen text, measured pixels, screenshot path).

NEVER (these need Moshe's OK): uninstall, clear app data, sign out, delete an account, change a display name (30-day lock), factory settings, 'adb logcat -c' or any wipe, adb reverse, touching other apps' data. Typing is ASCII only. A task that changes a setting (app setting, font scale, display size/density, animation scales, airplane mode, app locale) MUST put it back. At the end: adb.ts --device <serial> reset for each phone you used, app language Hebrew (adb -s <serial> shell cmd locale set-app-locales com.mosheg.sudokufight --locales he if needed), relaunch the app and leave it on Home.
Don't spend more than about 12 minutes on one item: stuck → untested with the reason.
`

const RESULT = {
  type: 'object',
  properties: {
    checks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'bug id (B13) or run task id' },
          result: { type: 'string', enum: ['pass', 'partial', 'fail', 'untested'] },
          evidence: { type: 'string', description: 'concrete: what you saw, numbers, screenshot paths' },
          qaAction: { type: 'string', description: 'what you did in the run: "fix" / "mark partial" / "mark fail" / "none"' },
        },
        required: ['id', 'result', 'evidence', 'qaAction'],
      },
    },
    appBugs: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, title: { type: 'string' }, what: { type: 'string' } },
        required: ['id', 'title', 'what'],
      },
    },
    catalogIssues: {
      type: 'array',
      items: { type: 'object', properties: { taskId: { type: 'string' }, issue: { type: 'string' } }, required: ['taskId', 'issue'] },
    },
    phoneState: { type: 'string' },
  },
  required: ['checks', 'appBugs', 'catalogIssues', 'phoneState'],
}

const describe = (c) => `Run #${RUN} tasks to re-test: ${c.tasks.length ? c.tasks.join(', ') : '(none)'}.
Bug ids to check on the phone: ${c.bugs.length ? c.bugs.join(', ') : '(none)'}.${c.extra ? `\n${c.extra}` : ''}`

async function soloLane(lane) {
  const out = []
  for (let i = 0; i < lane.chunks.length; i++) {
    const c = lane.chunks[i]
    const r = await agent(
      `${COMMON}
YOU OWN ONE PHONE ONLY: ${lane.serial} (${lane.label}, "${lane.account}"). Another tester is using the other phone right now: never pass the other serial.
Don't start a ranked search, don't create or join a real room (typing a code that doesn't exist is fine).

Batch ${i + 1} of ${lane.chunks.length} on this phone.
${describe(c)}

Start: launch the app on your phone and go to Home.`,
      { label: `${lane.label} ${i + 1}/${lane.chunks.length}`, phase: 'Solo lanes', schema: RESULT },
    )
    out.push({ lane: lane.label, batch: i + 1, chunk: c, r })
  }
  return out
}

phase('Solo lanes')
const solo = (await parallel(args.lanes.map((lane) => () => soloLane(lane)))).filter(Boolean).flat()

phase('Two phones')
const two = []
for (let i = 0; i < args.both.length; i++) {
  const c = args.both[i]
  const r = await agent(
    `${COMMON}
YOU OWN BOTH PHONES now. טלפון 1 (RF8Y60PP2XZ) is "טלפון א'", טלפון 3 (RF8Y30L038L) is "טלפון ב'" unless a task says otherwise. Ranked games and friend rooms between them are allowed (test accounts on staging). On staging a stealth bot may join a 2-player ranked search after 8-20 s if the other phone doesn't: start both searches within a second or two of each other.

Batch ${i + 1} of ${args.both.length}.
${describe(c)}

Start: launch the app on both phones and go to Home on each.`,
    { label: `two phones ${i + 1}/${args.both.length}`, phase: 'Two phones', schema: RESULT },
  )
  two.push({ lane: 'two', batch: i + 1, chunk: c, r })
}

const all = [...solo, ...two]
return {
  batches: all.map((b) => ({ lane: b.lane, batch: b.batch, ok: !!b.r, phoneState: b.r ? b.r.phoneState : 'agent failed', chunk: b.chunk })),
  checks: all.flatMap((b) => (b.r ? b.r.checks : [])),
  appBugs: all.flatMap((b) => (b.r ? b.r.appBugs : [])),
  catalogIssues: all.flatMap((b) => (b.r ? b.r.catalogIssues : [])),
  missing: all.filter((b) => !b.r).map((b) => b.chunk),
}
