export const meta = {
  name: "loop13-fix-check",
  description: "Loop 13: fix 3 small bugs (cancel after recreate, dark box after countdown reconnect, host spinner after game); phone-check loop-12 fixes on APK 18; then GO-hold step 2 from the logcat numbers",
  phases: [
    { title: "Fix", detail: "fixer + skeptic + rework" },
    { title: "Phone check", detail: "loop-12 fixes on APK 18" },
  ],
}
const SNAP = 'refs/qa/snap-loop13'
const DATA = 'docs/handoff/2026-11-03/data'
const S = 'C:/Users/mosheg/AppData/Local/Temp/claude/c--Users-mosheg-Documents-ReactNative-sudoku-fight/4440d2fa-e446-41ad-83db-f79035cdf42c/scratchpad'
const SHOTS = `${S}/qa-shots`
const TODO = 'C:/Users/mosheg/AppData/Local/Temp/claude/b0377245321c840d/6deeb02e-1cd6-480d-8ffd-14ec3cc5da59/scratchpad/todo-whole.txt'

const COMMON = `Moshe explicitly asked for this autonomous test→fix loop ("תעבוד בלי הנחיות. בודק מתקן בודק מתקן"). Mid-run chat messages are for the main session.
Repo root = working directory; CLAUDE.md applies (t() for every string in all 19 locales via the repo's i18n tooling, Reduced Motion, RTL, signed-number isolation; never copy signing/keystore/Firebase files from other projects; never print passwords or tokens). QA testers are using the phones right now: NO adb, no APK build, no deploy (server code changes are fine), no npm install. Other agents edit other files at the same time: touch only what your items need, Edit tool with small targeted replacements, never rewrite whole shared files, never revert others' changes; prettier --write only on files you changed. Keep LF line endings: before you finish, check every file you changed has no \r (convert CRLF→LF; a CRLF docs/design/motion.md broke the docs tests last round). Never git stash/checkout/restore/reset/add/commit/clean. No cd.
Baseline for this round: "git diff ${SNAP} -- <file>". Intended behaviour: docs/01-SPEC.md, docs/00-original-spec-v1.md (wins on conflict), docs/design/*.md. Bug texts: ${DATA}/fixcheck-apk17.json (and older fixcheck-apk16.json) (appBugs and checks, by id; screenshots under ${SHOTS}). Earlier rounds: ${DATA}/fix-loop8.json, ${DATA}/fix-loop9.json, ${DATA}/fix-loop10.json, ${DATA}/fix-loop11.json, ${DATA}/fix-loop12.json (use each area's final/rework) — read what they changed for the same feature first.
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
Phones (USB, Samsung A16 SM-A165F, Android 16, 1080x2340, Hebrew): RF8Y60PP2XZ = "טלפון 1" (אורי, level 9), RF8Y30L038L = "טלפון 3" (אחוותא). Both run APK 18 (1.1.0, loop-12 fixes) — check ${S}/latest-build.json vs ${S}/installed-<serial>.txt and install -r the latest if they differ (then update the txt). Staging has the matching server. The stealth bot is ON on staging (a lone search gets a persona); use the two phones against each other where two players are needed.
Tools: npx tsx apps/server/scripts/adb.ts --device <serial> ui|tap|swipe|type|key|shot <file>|launch|stop|reset; raw adb always with -s <serial> (Git Bash: MSYS_NO_PATHCONV=1 for /sdcard paths); logcat -d only (NEVER -c). Screenshots under ${SHOTS}.
NEVER: uninstall, clear data, 'adb logcat -c', sign out, delete account, rename, switch accounts, log in, adb reverse. Typing ASCII only. Restore every setting you change (font scale, wm size/density, animations, locale, airplane, show_touches). At the end: adb.ts reset on both, app locale he, relaunch, leave on Home. Max ~12 min per item; stuck → untested with the reason. Never cd. Don't edit code.`
const AREAS = [
  {
    key: 'rooms',
    items: `1) cancel-after-recreate-skips-type-screen (minor, ${DATA}/fixcheck-apk17.json appBugs): Home → שחק → 2 שחקנים → מהיר → מצא יריב; during the search 'adb shell wm density 540'; the search correctly comes back (loop 11); tapping 'ביטול חיפוש' then goes back to the 'משחק חדש' modes list, not to the game type screen (מהיר/רגיל/קשה) as it does without the recreation. The navigation stack rebuilt by resumeAtStart/liveFlowPath lacks the type screen. Rebuild the same stack (or make Back/cancel go where it goes normally), test it.
2) stale-dark-box-after-countdown-reconnect (cosmetic, appBugs): friends fast room, phone 3 (wm density 540) is the guest; airplane mode 2 s on phone 3 during '3'; when the board appears on phone 3 there is a darker rectangle over the 'אני' card (top right, about x 555–1025, y 110–480 px) that in the first board frame still shows the ghost of the lobby's 'חדר עם חברים' header; it stays >1 s (read the full text). Find which view of the lobby/count survives the reconnect path (loop 11 countdown-lobby-resync keeps lost/comingBack during the count) and remove it.
3) friends-room-spinner-after-game (minor, appBugs): the host stays on the results of a friends game while the guest leaves (Home, language change, app restarted); ~2 min later the host's room screen shows only the 'חדר עם חברים' title and a spinner, no code and no seats, for more than a minute. Read the full text; find what state the host's room is in (the room closed after closeAfterGameMs 60 s? the lobby lost?) and make it show the right thing (back to a live lobby with the code, or a clear Hebrew message with a way out), test it.`,
  },
]
const PHONE = `${TESTER}
Your job: confirm on the phones that each loop-12 fix works. Input: ${DATA}/fix-loop12.json — 'fixes' (results, net) and 'timing' (fullboard, warp, gohold); for each use final; each item has a deviceCheck — follow it. Order:
(1) gohold FIRST (its logcat line '[friends] GO! shown, game +X ms, game screen opens +Y ms' feeds the next fixer): joiner phone 3 cold start, sound OFF and ON (2 each), record both phones, logcat ReactNativeJS; report every X and Y and the GO!→board time on both phones; the first count frame already has the avatars.
(2) results-home-under-statusbar: abandon win, surrender win, surrender loss; 'לבית' stays at y≈185 px through the glide and works on the first tap; the rating number visible and counting.
(3) connection-lost-no-recovery + error chips: ranked, airplane ~80 s on phone 3, then off: how fast the app shows the finished game/expired message; every chip is a clear code (ERR_…), no bare English word in Hebrew screens; friends-room-type-not-remembered: choose 'מהיר' in a room, play, Home, 'צור חדר' again → 'מהיר'.
(4) fullboard: phone 1, 6 full-board endings RM OFF and 3 RM ON, recorded; no plain-background frame, no frame with the board gone and the hero under ~80%.
(5) warp: receiver phone 3, fresh start, friends game, first hit = warp, sound ON and OFF, plus a second warp; 20 ms frames: banner, tilt, overlay and dim start together (±1 frame), no frozen frame; logcat SkiaTextureView lines as in the deviceCheck.
Screenshots fix13-<serial>-<id>-<n>.png. For each check also re-test the run #2 task named in it when that task is currently fail/partial ("npx tsx apps/server/scripts/qa.ts task 2 <taskId>"): every expected line seen → "qa.ts fix 2 <taskId> --fix-note-file <f> --fixed-in apk18" (Hebrew note, 2–4 lines); otherwise mark it again with --actual-file describing what happens NOW.
Return checks (id, result pass/partial/fail/untested, evidence, qaAction), appBugs (id, title, severity, what — concrete, with build, steps, what is seen, screenshot paths), catalogIssues, phoneState.`
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




const GOHOLD2 = `go-hold-joiner, step 2 (cosmetic, target GO! 0.5–1.0 s per docs/design/motion.md; it was 1.1–1.25 s with sound on after loop 12). Loop 12 (${DATA}/fix-loop12.json timing 'gohold') fixed the sound-off excess and the count's first frame, and added a release logcat line '[friends] GO! shown, game +X ms, game screen opens +Y ms' in app/friends/room.tsx to split the remaining ~0.6 s between late game state (X) and the game screen's render (Y). The phone check below has the numbers. Decide from them: if X is large, make the game state arrive with or before GO! (server GameRoom start/countdown ordering, or the client preparing the board from the lobby's puzzle); if Y is large, move the board mount earlier (as ranked does with push plus GoCover, or mount the game screen under the count). Keep the count readable, no empty frame, no faded '1', Reduced Motion. If the numbers are missing, say so and change nothing. When done, remove the temporary diagnostic logcat line (it must not ship to the store) unless you still need it, and say which.`
const fixesP = parallel(AREAS.map((a) => () => fixArea(a)))
const phoneP = (async () => {
  const check = await agent(PHONE, { label: 'phones:fixcheck-loop12', phase: 'Phone check', schema: CHECKS })
  let gohold = null
  if (check) {
    const goChecks = check.checks.filter((c) => /go-?hold|gohold/i.test(c.id))
    gohold = await fixArea({ key: 'gohold2', items: GOHOLD2 + '\n\nPHONE CHECK (APK 18):\n' + JSON.stringify(goChecks) })
  }
  return { check, gohold }
})()
const [fixes, phones] = await Promise.all([fixesP, phoneP])
return { fixes: (fixes || []).filter(Boolean), ...phones }
