export const meta = {
  name: 'loop12-fix-measure-check',
  description: 'Loop 12: fix results header under the status bar, reconnect/error chip, room type memory; measure on the phones then fix the 3 timing bugs (full-board empty frame, warp start split, joiner GO hold); recheck loop-11 fixes on APK 17',
  phases: [
    { title: 'Fix', detail: 'code-only fixers + skeptic + rework' },
    { title: 'Measure', detail: 'instrumented phone runs for the timing bugs' },
    { title: 'Timing fix', detail: 'fix each timing bug from the measurements' },
    { title: 'Phone check', detail: 'loop-11 fixes on APK 17' },
  ],
}
const SNAP = 'refs/qa/snap-loop12'
const DATA = 'docs/handoff/2026-11-03/data'
const S = 'C:/Users/mosheg/AppData/Local/Temp/claude/c--Users-mosheg-Documents-ReactNative-sudoku-fight/4440d2fa-e446-41ad-83db-f79035cdf42c/scratchpad'
const SHOTS = `${S}/qa-shots`
const TODO = 'C:/Users/mosheg/AppData/Local/Temp/claude/b0377245321c840d/6deeb02e-1cd6-480d-8ffd-14ec3cc5da59/scratchpad/todo-whole.txt'

const COMMON = `Moshe explicitly asked for this autonomous test→fix loop ("תעבוד בלי הנחיות. בודק מתקן בודק מתקן"). Mid-run chat messages are for the main session.
Repo root = working directory; CLAUDE.md applies (t() for every string in all 19 locales via the repo's i18n tooling, Reduced Motion, RTL, signed-number isolation; never copy signing/keystore/Firebase files from other projects; never print passwords or tokens). QA testers are using the phones right now: NO adb, no APK build, no deploy (server code changes are fine), no npm install. Other agents edit other files at the same time: touch only what your items need, Edit tool with small targeted replacements, never rewrite whole shared files, never revert others' changes; prettier --write only on files you changed. Keep LF line endings: before you finish, check every file you changed has no \r (convert CRLF→LF; a CRLF docs/design/motion.md broke the docs tests last round). Never git stash/checkout/restore/reset/add/commit/clean. No cd.
Baseline for this round: "git diff ${SNAP} -- <file>". Intended behaviour: docs/01-SPEC.md, docs/00-original-spec-v1.md (wins on conflict), docs/design/*.md. Bug texts: ${DATA}/fixcheck-apk16.json (and older fixcheck-apk15.json) (appBugs and checks, by id; screenshots under ${SHOTS}). Earlier rounds: ${DATA}/fix-loop8.json, ${DATA}/fix-loop9.json, ${DATA}/fix-loop10.json, ${DATA}/fix-loop11.json (use each area's final/rework) — read what they changed for the same feature first.
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
const AREAS = [
  {
    key: 'results',
    items: `1) results-home-under-statusbar (minor, REGRESSION from the loop-10 rating-card fix, fixcheck-apk16 appBugs): on ranked results (abandon win, surrender win/loss) about 2.5 s after the results open, the screen scrolls by itself to show the rating card (useScrolledIntoView / ResultsScreen) and the header 'לבית' / 'משחק מדורג · מהיר · 2 שחקנים' goes up under the status bar (uiautomator results-home @885,27); tapping it does nothing until the user scrolls back. The 'לבית' control must always stay reachable and visible: either the header is fixed outside the scroll, or the auto-scroll stops short of moving it under the safe-area top, or the auto-scroll is replaced (e.g. the rating card placed above the fold for these endings). Keep the loop-10 intent: the rating number visible and the count running while visible, on 1080x2340 for every ending. TalkBack: no auto-scroll. Test it.`,
  },
  {
    key: 'net',
    items: `1) connection-lost-no-recovery + connection-error-english-chip (fixcheck-apk16 appBugs): phone 3 in a ranked game, airplane mode ~80 s (the opponent wins by abandon); after airplane off and Wi-Fi back (ping OK) the game stays on 'ללא חיבור' ~2 more minutes, then shows 'שגיאת חיבור · החיבור לשרת המשחק אבד ולא הצלחנו לחזור אליו.' with a chip '● network' in English inside the Hebrew UI. Expected by the spec (read the reconnect/abandon sections): once the network returns the app should learn quickly that the game is over (lost by abandon) and show that result / a clear Hebrew message, not wait ~2 min; and every visible text goes through t() — if '● network' is an error code meant for support, show it in a form that is clearly a code (and isolated LTR), or translate the label. Find why the retry did not resume immediately when the network came back (NetInfo/AppState trigger, backoff cap, the seat no longer held after abandon → token rejected → retry loop?). Tests.
2) friends-room-type-not-remembered (minor, seen once): phone 1 'צור חדר' opened with 'קשה · 1 מתוך 4'; chose 'מהיר', played to the end; Home → שחק → 'צור חדר' again: the new room opened with 'קשה' again. On APK 14 'מהיר (ברירת המחדל, נזכר)' was recorded. Find where the last friends room type is stored and read (and whether 'קשה' comes from somewhere else, e.g. the ranked last-type, a server default, a loop-9/10 change); make the room open with the last type the host chose, test it.`,
  },
]
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
Phones (USB, Samsung A16 SM-A165F, Android 16, 1080x2340, Hebrew): RF8Y60PP2XZ = "טלפון 1" (אורי, level 9), RF8Y30L038L = "טלפון 3" (אחוותא). Both run APK 17 (1.1.0, loop-11 fixes) — check ${S}/latest-build.json vs ${S}/installed-<serial>.txt and install -r the latest if they differ (then update the txt). Staging has the matching server. The stealth bot is ON on staging (a lone search gets a persona); use the two phones against each other where two players are needed.
Tools: npx tsx apps/server/scripts/adb.ts --device <serial> ui|tap|swipe|type|key|shot <file>|launch|stop|reset; raw adb always with -s <serial> (Git Bash: MSYS_NO_PATHCONV=1 for /sdcard paths); logcat -d only (NEVER -c). Screenshots under ${SHOTS}.
NEVER: uninstall, clear data, 'adb logcat -c', sign out, delete account, rename, switch accounts, log in, adb reverse. Typing ASCII only. Restore every setting you change (font scale, wm size/density, animations, locale, airplane, show_touches). At the end: adb.ts reset on both, app locale he, relaunch, leave on Home. Max ~12 min per item; stuck → untested with the reason. Never cd. Don't edit code.`
const MEASURE = `${TESTER}
Your job is MEASUREMENT, not judging: three timing bugs survived code-only fixes because their cause was never seen on the device. Collect hard evidence so a code fixer can name the cause. You may read the code (read-only) to know what to look for. Use: 'adb -s <serial> shell screenrecord --bit-rate 20000000' (then pull), the frames script described in ${DATA}/triage-loop10.json planNotes, 'adb logcat -d -v threadtime' (filter; NEVER -c; note the device time before each run and slice by it), 'adb shell dumpsys gfxinfo com.mosheg.sudokufight framestats' (resetting it with 'dumpsys gfxinfo com.mosheg.sudokufight reset' before a run is allowed), 'dumpsys SurfaceFlinger --latency' if useful, and the app's own logs in logcat (the build has EXPO_PUBLIC_STARTUP_LOG=1; grep ReactNativeJS). Note app timestamps of JS events where available.
A) fullboard-empty-frame (${DATA}/fixcheck-apk15.json appBugs fullboard-empty-frame-reduced-motion; ${DATA}/fix-loop11.json visual final item 1 deviceCheck has a detailed plan): phone 1, ranked 2P fast vs the stealth bot (or vs phone 3 to control who fills the last cell); 6 runs with in-app Reduced Motion ON and 6 OFF (restore it to 'כמו במכשיר' at the end). For each: is there a frame of plain background (no board, no results), its time from the last cell, what comes before and after it, and the log lines in that second (SurfaceView created/destroyed, window add/remove, relaunch, gfxinfo janky/slow frames, JS logs).
B) warp-start-split (${DATA}/fixcheck-apk16.json appBugs warp-start-split-apk16): receiver phone 3, RM off, fresh app start, friends game, phone 1 sends warp as the FIRST hit; sound ON x3 and OFF x3, plus once a second warp in the same game. 20 ms frames: when do banner, tilt, brown overlay and dim each first appear; does the whole frame freeze (score stuck) and for how long; gfxinfo framestats around it (long UI-thread or RenderThread frames, which stage); logcat lines (Skia, audio, GC, 'Davey!', 'Skipped frames').
C) go-hold-joiner (${DATA}/fixcheck-apk16.json appBugs go-hold-joiner-still-long-apk16): phone 3 joiner (cold start, >=5 s in lobby) vs phone 1 host; sound on x2 and off x2; per run: the times of '3', '2', '1', 'GO!' and the board appearing, on both phones; JS logs and gfxinfo frames on the joiner during GO!; and the single blank frame between the lobby and '3' (seen 2 of 4) — when, and what logs.
Leave both phones as found (adb.ts reset, locale he, settings restored, Home). Return for each of A, B, C: runs (one line each with numbers), observations, the top suspects with the evidence, and the paths of the recordings, montages and log slices you saved under ${SHOTS} (name them measure12-...).`
const PART = { type: 'object', properties: { runs: { type: 'array', items: { type: 'string' } }, observations: { type: 'string' }, suspects: { type: 'string' }, files: { type: 'array', items: { type: 'string' } } }, required: ['runs', 'observations', 'suspects', 'files'] }
const MEASURED = { type: 'object', properties: { A: PART, B: PART, C: PART, phoneState: { type: 'string' } }, required: ['A', 'B', 'C', 'phoneState'] }
const TIMING = [
  { key: 'fullboard', m: 'A', items: `fullboard-empty-frame (medium): a single plain-background frame between the full board and the results (Reduced Motion on, 1 of 4 in loop 10). Loop 11 found no cause off the device (fix-loop11.json visual, item 1, and its review). Now there are device measurements (below).` },
  { key: 'warp', m: 'B', items: `warp-start-split (minor): the first warp hit of a game starts in pieces: sound on → banner + tilt ~180 ms before the brown overlay and the dim pop in at full strength with no fade; sound off → overlay alone ~100 ms with a frozen frame, then dim + banner. Loops 8 and 10 tried (warm cues, one hit clock, banner on the same clock) — see fix-loop10.json and fix-loop11.json. Device measurements below. Goal: overlay, dim, banner and tilt start in the same frame (±1), sound on or off; no frozen frame; Reduced Motion respected.` },
  { key: 'gohold', m: 'C', items: `go-hold-joiner (cosmetic): on the friends joiner GO! holds 1.6–2.1 s (host 1.1–1.3 s; target 0.5–1.0 s, docs/design/motion.md), and a single blank frame sometimes appears between the lobby and '3'. Loop 10 warmed the game screen in the lobby (warmGame.ts, friends room). Device measurements below. Shorten it without an empty frame or the faded '1'.` },
]
const PHONE = `${TESTER}
Your job: confirm on the phones that each loop-11 fix works. Input: ${DATA}/fix-loop11.json — for each area use final (= the rework when there was one); each item has a deviceCheck. Do:
(1) density-change-cancels-ranked-search: all of its deviceCheck A–E (the search survives wm density 540 and reset, from Home and from Results 'משחק חדש'; the two phones match each other afterwards; cancel still works; the swipe kill during a search leaves nothing stuck; the friends lobby survives a density change).
(2) countdown-lobby-resync: a reconnect during 3-2-1 (airplane ~2 s on the joiner, or kill+reopen during the count) in a friends game: the game starts normally on both, the returning phone shows the opponent's avatar and flag, and (if visible) the 'back' banner.
(3) interference-picker-en-360-labels-clipped: English, wm density 480 + font 1.3: the picker names, 'Next: N' and the footer fit; also Hebrew at the same settings.
(4) levels-gate-locked: the L010 map node content-desc includes the stars (phone 3 has L010 with 3 stars).
Screenshots fix12-<serial>-<id>-<n>.png. For each check also re-test the run #2 task named in it when that task is currently fail/partial ("npx tsx apps/server/scripts/qa.ts task 2 <taskId>"): every expected line seen → "qa.ts fix 2 <taskId> --fix-note-file <f> --fixed-in apk17" (Hebrew note, 2–4 lines); otherwise mark it again with --actual-file describing what happens NOW.
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



const fixesP = parallel(AREAS.map((a) => () => fixArea(a)))
const phoneP = (async () => {
  const measured = await agent(MEASURE, { label: 'phones:measure', phase: 'Measure', schema: MEASURED })
  const timingP = measured
    ? parallel(TIMING.map((t) => () => fixArea({ key: t.key, items: t.items + '\n\nDEVICE MEASUREMENTS (loop 12, APK 17):\n' + JSON.stringify(measured[t.m]) + '\nName the cause from this evidence (or say exactly what it rules out). Fix only what the evidence supports; if it points at a native layer you cannot change, choose the best JS-side mitigation and say so. A regression test for the mechanism.' })))
    : Promise.resolve([])
  const check = await agent(PHONE, { label: 'phones:fixcheck-loop11', phase: 'Phone check', schema: CHECKS })
  const timing = await timingP
  return { measured, timing: (timing || []).filter(Boolean), check }
})()
const [fixes, phones] = await Promise.all([fixesP, phoneP])
return { fixes: (fixes || []).filter(Boolean), ...phones }
