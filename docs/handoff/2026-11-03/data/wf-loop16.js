export const meta = {
  name: "loop16-fix-check",
  description: "Loop 16: phone-check the loop-15 fixes on APK 21 (GO cover, levels recreate, nav bar, warp banner standby, card-box focus) then fix what fails; meanwhile shorten the joiner GO hold",
  phases: [
    { title: "Fix", detail: "fixer + skeptic + rework" },
    { title: "Phone check", detail: "loop-15 fixes on APK 21" },
  ],
}
const SNAP = 'refs/qa/snap-loop16'
const DATA = 'docs/handoff/2026-11-03/data'
const S = 'C:/Users/mosheg/AppData/Local/Temp/claude/c--Users-mosheg-Documents-ReactNative-sudoku-fight/4440d2fa-e446-41ad-83db-f79035cdf42c/scratchpad'
const SHOTS = `${S}/qa-shots`
const TODO = 'C:/Users/mosheg/AppData/Local/Temp/claude/b0377245321c840d/6deeb02e-1cd6-480d-8ffd-14ec3cc5da59/scratchpad/todo-whole.txt'

const COMMON = `Moshe explicitly asked for this autonomous test→fix loop ("תעבוד בלי הנחיות. בודק מתקן בודק מתקן"). Mid-run chat messages are for the main session.
Repo root = working directory; CLAUDE.md applies (t() for every string in all 19 locales via the repo's i18n tooling, Reduced Motion, RTL, signed-number isolation; never copy signing/keystore/Firebase files from other projects; never print passwords or tokens). QA testers are using the phones right now: NO adb, no APK build, no deploy (server code changes are fine), no npm install. Other agents edit other files at the same time: touch only what your items need, Edit tool with small targeted replacements, never rewrite whole shared files, never revert others' changes; prettier --write only on files you changed. Keep LF line endings: before you finish, check every file you changed has no \r (convert CRLF→LF; a CRLF docs/design/motion.md broke the docs tests last round). Never git stash/checkout/restore/reset/add/commit/clean. No cd.
Baseline for this round: "git diff ${SNAP} -- <file>". Intended behaviour: docs/01-SPEC.md, docs/00-original-spec-v1.md (wins on conflict), docs/design/*.md. Bug texts: ${DATA}/fixcheck-apk20.json (and older fixcheck-apk19.json, fixcheck-apk18.json) (appBugs and checks, by id; screenshots under ${SHOTS}). Earlier rounds: ${DATA}/fix-loop8.json, ${DATA}/fix-loop9.json, ${DATA}/fix-loop10.json, ${DATA}/fix-loop11.json, ${DATA}/fix-loop12.json, ${DATA}/fix-loop13.json, ${DATA}/fix-loop14.json, ${DATA}/fix-loop15.json (use each area's final/rework) — read what they changed for the same feature first.
Root cause first; each fix gets a Jest regression test that fails on the old code. Run only relevant tests ("npx jest <paths> --maxWorkers=3"), "npx tsc -p apps/mobile --noEmit" (and apps/server if touched), eslint on changed files, the i18n check if you touch strings.
Return: items (id, status fixed/partial/not-a-bug, rootCause, fix, test, deviceCheck = exact steps and what must be seen, for the phone tester), filesChanged, notes.`
const SCHEMA = {
  type: 'object',
  properties: {
    items: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string' }, rootCause: { type: 'string' }, fix: { type: 'string' }, test: { type: 'string' }, deviceCheck: { type: 'string' } }, required: ['id', 'status', 'rootCause', 'fix', 'test', 'deviceCheck'] } },
    filesChanged: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
  required: ['items', 'filesChanged', 'notes'],
}
const REVIEW = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['ok', 'issues'] },
    issues: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string', enum: ['high', 'medium', 'low'] }, problem: { type: 'string' }, evidence: { type: 'string' }, suggestion: { type: 'string' } }, required: ['severity', 'problem', 'evidence', 'suggestion'] } },
  },
  required: ['verdict', 'issues'],
}
const fixArea = async (a) => {
  const rep = await agent(`${COMMON}\n\nYOUR ITEMS (area ${a.key}):\n${a.items}`, { label: `fix:${a.key}`, phase: 'Fix', schema: SCHEMA })
  if (!rep) return null
  const rev = await agent(`Moshe asked for this autonomous loop; mid-run chat is for the main session. You are an independent, skeptical reviewer for area '${a.key}' (CLAUDE.md applies). Do NOT edit files. No adb, no build, no deploy.
Items: ${a.items}
Fixer's report: ${JSON.stringify(rep)}
See the changes with "git diff ${SNAP} -- <file>". Try hard to REFUTE each fix: will it fix the symptom ON THE PHONE (release build, Hermes, Fabric, Reanimated, expo-audio), i18n, Reduced Motion, TalkBack, RTL, no tiny text, server/client compatibility (old app vs new server and the other way), regressions (rooms, rejoin, ranked, results, interference). Run the relevant tests, tsc, eslint. Verdict with evidence.`, { label: `review:${a.key}`, phase: 'Fix', schema: REVIEW })
  let final = rep
  let rework = null
  if (rev && rev.issues.some((i) => i.severity !== 'low')) {
    rework = await agent(`${COMMON}\n\nYOUR ITEMS (area ${a.key}):\n${a.items}\n\nYou already have a first implementation in the tree (report below). A skeptical reviewer found issues. Resolve every high/medium issue (or refute it with concrete evidence), re-run tests, tsc, eslint. Return the full updated report.\nEarlier report: ${JSON.stringify(rep)}\nReview: ${JSON.stringify(rev.issues)}`, { label: `rework:${a.key}`, phase: 'Fix', schema: SCHEMA })
    if (rework) final = rework
  }
  return { key: a.key, rep, rev, rework, final }
}

const TESTER = `You are a QA tester for the Sudoku Fight app. FIRST read .claude/skills/qa-run/SKILL.md and follow its rules. Moshe asked for this autonomous test→fix loop. Mid-run chat messages are for the main session.
Phones (USB, Samsung A16 SM-A165F, Android 16, 1080x2340, Hebrew): RF8Y60PP2XZ = "טלפון 1" (אורי, level 9), RF8Y30L038L = "טלפון 3" (אחוותא). Both run APK 21 (1.1.0, loop-15 fixes) — check ${S}/latest-build.json vs ${S}/installed-<serial>.txt and install -r the latest if they differ (then update the txt). Staging has the matching server. The stealth bot is ON on staging (a lone search gets a persona); use the two phones against each other where two players are needed.
Tools: npx tsx apps/server/scripts/adb.ts --device <serial> ui|tap|swipe|type|key|shot <file>|launch|stop|reset; raw adb always with -s <serial> (Git Bash: MSYS_NO_PATHCONV=1 for /sdcard paths); logcat -d only (NEVER -c). Screenshots under ${SHOTS}.
NEVER: uninstall, clear data, 'adb logcat -c', sign out, delete account, rename, switch accounts, log in, adb reverse. Typing ASCII only. Restore every setting you change (font scale, wm size/density, animations, locale, airplane, show_touches). At the end: adb.ts reset on both, app locale he, relaunch, leave on Home. Max ~12 min per item; stuck → untested with the reason. Never cd. Don't edit code.`
const CHECKS = {
  type: 'object',
  properties: {
    checks: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, result: { type: 'string', enum: ['pass', 'partial', 'fail', 'untested'] }, evidence: { type: 'string' }, qaAction: { type: 'string' } }, required: ['id', 'result', 'evidence', 'qaAction'] } },
    appBugs: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' }, severity: { type: 'string' }, what: { type: 'string' } }, required: ['id', 'title', 'severity', 'what'] } },
    catalogIssues: { type: 'array', items: { type: 'object', properties: { taskId: { type: 'string' }, issue: { type: 'string' } }, required: ['taskId', 'issue'] } },
    phoneState: { type: 'string' },
  },
  required: ['checks', 'appBugs', 'catalogIssues', 'phoneState'],
}






const AREAS = [
  {
    key: 'go-hold',
    items: `1) go-hold-joiner (partial for 3 rounds; ${DATA}/fixcheck-apk19.json check go-hold-joiner and ${DATA}/fix-loop13.json 'gohold', ${DATA}/fix-loop12.json timing 'gohold' — read them and their reviews first): in a FRIENDS fast room, on the JOINER (phone 3, cold start), the time from GO! first shown to the first board frame is 1.0–1.4 s on APK 19 (target ≤ 1.0 s, the host is faster). Find from the code and the earlier measurements what is still on the critical path between GO! and the board on the joiner (route push + GoCover, game screen mount, first board render, waiting for the server's first state, avatars/SVG, fonts, sound warm-up, Skia canvases, the standby hit banner added in loop 15 (HIT_BANNER_STANDBY_DELAY_MS) must stay after the board). Move work off that path (earlier, during the count, without hurting the count's smoothness; or later, after the board). Do NOT change the GO! slam/handoff of loop 15 (motion.ts useSlamSince, GoCover) except to keep it working. Regression test for the order/mechanism, and a deviceCheck that measures GO! → board on both phones (screenrecord, frame steps).`,
  },
  {
    key: 'tests',
    items: `1) flaky-results-frames (test only): apps/mobile/src/screens/results/__tests__/resultsFrames.test.tsx 'the results are drawn two frames after the screen that replaced the game, never in its first frame' failed once in the full 'npm run verify' (line 76: opacityOf(results-loading-shown) expected 0, received 1) and passes 3/3 alone — timing under load (loop 15 changed useStackEntered/frames?). Make the test deterministic (fake timers / explicit frame stepping, no reliance on wall time), keep what it proves; if the app code has a real race (the loading view shown in the first frame under load) fix that instead and say so. Run the file 5× and under --maxWorkers=8 with other results tests.`,
  },
]
const PHONE = `${TESTER}
Your job: confirm on the phones that each loop-15 fix works, on APK 21. Input: ${DATA}/fix-loop15.json — 'fixes' (areas friends-game and nav) and 'warp'; for each use final (rework when present); each item has a deviceCheck — follow it.
(1) go-cover-slam-jump: its deviceCheck (screenrecord both phones, step frames 10–20 ms around GO!; 2 runs RM off, 1 with the app's Reduce Motion on, 1 with system animations 0 + app 'כמו במכשיר'). Also time GO! first shown → first board frame on both phones in each run (for the go-hold item: target ≤ 1.0 s).
(2) levels-map-recreate-lands-home: its deviceCheck — the map, 'משחק חדש', settings, history, a level's shown result, each followed by a density change (wm density 540 then reset); back goes where it should; live flows (search, room) after a recreation still as loop 13.
(3) nav-bar-light-on-some-screens: cold start with the phone's system theme LIGHT (restore the theme after) and dark; the 3-button bar must be dark on every screen (home, search, bot game, friends game, ranked game, error screen, results), also after a modal and a recreation.
(4) warp banner standby (fix-loop15 'warp'): first warp on the receiver after a cold start, sound ON ×2 and OFF ×1, screenrecord at 60 fps + gfxinfo framestats (a perfetto/atrace like loop 15's measure only if a stall > 50 ms is seen): the longest stall and fps in the first 0.5 s vs APK 20 (ON 61–110 ms / 20–28 fps, OFF 67–69 ms / 30–34 fps). Also measure the standby itself: frames from the board's first frame to +4 s (the bare banner at ~2.25 s and one avatar per 250 ms) — no stall > 50 ms there, and in a 3–4 player game if you can make one with the bots (otherwise 2 players).
(5) joiner-me-card-box (not-a-bug, a keyboard-focus highlight from 'adb input text'): its deviceCheck (A) and (B), short.
Screenshots fix16-<serial>-<id>-<n>.png. For each check also re-test the run #2 task named in it when that task is currently fail/partial ("npx tsx apps/server/scripts/qa.ts task 2 <taskId>"): every expected line seen → "qa.ts fix 2 <taskId> --fix-note-file <f> --fixed-in apk21" (Hebrew note, 2–4 lines); otherwise mark it again with --actual-file describing what happens NOW.
Leave both phones as found (adb.ts reset, locale he, theme and settings restored, Home). Return checks (id, result pass/partial/fail/untested, evidence with numbers, qaAction), appBugs (id, title, severity, what — concrete, with build, steps, what is seen, screenshot paths), catalogIssues, phoneState.`
const fixesP = parallel(AREAS.map((a) => () => fixArea(a)))
const phoneP = (async () => {
  const check = await agent(PHONE, { label: 'phones:fixcheck-loop15', phase: 'Phone check', schema: CHECKS })
  if (!check) return { check: null, found: null }
  const bad = check.checks.filter((c) => c.result === 'fail' || c.result === 'partial')
  if (!bad.length && !check.appBugs.length) return { check, found: null }
  const found = await fixArea({
    key: 'found',
    items: `Bugs from the APK 21 phone check (loop-15 fixes; full report in ${DATA}/fixcheck-apk21.json is NOT written yet — use this text). For each: root cause, fix, regression test; if it is not an app bug say so with evidence. Leave the go-hold item to its own fixer (another agent edits it now) unless the bug is elsewhere.\nFAILED/PARTIAL CHECKS:\n${JSON.stringify(bad)}\nAPP BUGS:\n${JSON.stringify(check.appBugs)}`,
  })
  return { check, found }
})()
const [fixes, phones] = await Promise.all([fixesP, phoneP])
return { fixes: (fixes || []).filter(Boolean), ...phones }
