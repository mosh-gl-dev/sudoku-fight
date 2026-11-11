export const meta = {
  name: "loop18-final-pass-fixes",
  description: "Loop 18: fix what the APK 22 final phone pass found: splash hold + hidden Home entrance (loop-17 regression), solo score flight target, board rise, history ranked paging, first-game time, pirates lab speed",
  phases: [{ title: "Fix", detail: "fixer + skeptic + rework" }],
}
const SNAP = 'refs/qa/snap-loop18'
const DATA = 'docs/handoff/2026-11-03/data'
const S = 'C:/Users/mosheg/AppData/Local/Temp/claude/c--Users-mosheg-Documents-ReactNative-sudoku-fight/4440d2fa-e446-41ad-83db-f79035cdf42c/scratchpad'
const SHOTS = `${S}/qa-shots`
const TODO = 'C:/Users/mosheg/AppData/Local/Temp/claude/b0377245321c840d/6deeb02e-1cd6-480d-8ffd-14ec3cc5da59/scratchpad/todo-whole.txt'

const COMMON = `Moshe explicitly asked for this autonomous test→fix loop ("תעבוד בלי הנחיות. בודק מתקן בודק מתקן"). Mid-run chat messages are for the main session.
Repo root = working directory; CLAUDE.md applies (t() for every string in all 19 locales via the repo's i18n tooling, Reduced Motion, RTL, signed-number isolation; never copy signing/keystore/Firebase files from other projects; never print passwords or tokens). QA testers are using the phones right now: NO adb, no APK build, no deploy (server code changes are fine), no npm install. Other agents edit other files at the same time: touch only what your items need, Edit tool with small targeted replacements, never rewrite whole shared files, never revert others' changes; prettier --write only on files you changed. Keep LF line endings: before you finish, check every file you changed has no \r (convert CRLF→LF; a CRLF docs/design/motion.md broke the docs tests last round). Never git stash/checkout/restore/reset/add/commit/clean. No cd.
Baseline for this round: "git diff ${SNAP} -- <file>". Intended behaviour: docs/01-SPEC.md, docs/00-original-spec-v1.md (wins on conflict), docs/design/*.md. Bug texts: ${DATA}/fixcheck-apk22.json, ${DATA}/fixcheck-apk21.json (and older fixcheck-apk20.json, fixcheck-apk19.json, fixcheck-apk18.json) (appBugs and checks, by id; screenshots under ${SHOTS}). Earlier rounds: ${DATA}/fix-loop8.json, ${DATA}/fix-loop9.json, ${DATA}/fix-loop10.json, ${DATA}/fix-loop11.json, ${DATA}/fix-loop12.json, ${DATA}/fix-loop13.json, ${DATA}/fix-loop14.json, ${DATA}/fix-loop15.json, ${DATA}/fix-loop16.json, ${DATA}/fix-loop17.json (use each area's final/rework) — read what they changed for the same feature first.
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

const F = `${DATA}/fixcheck-apk22.json`
const AREAS = [
  { key: 'splash-home', items: `Two medium bugs from the APK 22 final phone pass (${F}: p3.appBugs splash-hold-too-short and home-entrance-hidden-under-splash; p3.checks account-open-splash-look, general-motion-home-entrance, general-alive-menus; loop 17's splash work: ${DATA}/fix-loop17.json key 'splash', use 'rework'). QA tasks: "npx tsx apps/server/scripts/qa.ts task 2 account-open-splash-look", "... task 2 general-motion-home-entrance", "... task 2 general-alive-menus" — read them whole.
1) splash-hold-too-short: on a signed-in cold start (APK 22, phone 3), after the system icon's 200 ms cross-fade, the designed Splash is alone and fully opaque for only 0–144 ms; in 2 of 4 recordings the icon and the Splash leave in the same frame (rm1 jumps straight to Home). In airplane mode it holds ~0.2 s. Required: the icon → Splash cross-fade completes, THEN the Splash is seen alone (fully opaque) for a clear minimum (use the existing config value for how long the Splash is seen — account.ts splashSeenMs or similar — counted from the moment the system splash has finished fading, not from hide() being called; make the minimum a config value, default so that it is seen alone for about 0.4–0.6 s; a 'decision for Moshe' value stays in config), and only then fades to Home. The two must never leave in the same frame. RM on: same order, fades instead of motion.
2) home-entrance-hidden-under-splash (regression from loop 17): since the Splash now covers Home until it leaves, Home's entrance (card rise, 'שחק' landing, staggered rows; docs/design/motion.md) runs under the Splash and is never seen. Required: Home's entrance starts when the Splash begins to leave (or right after), so it is seen on every cold start with RM off; with RM on no entrance (as now); no re-entrance on Back; no double entrance and no delay if the Splash was not shown (warm start / recreation). Find the trigger (useAfterFirstScreen / the entrance gate) and tie it to the Splash leaving.
Tests: regression tests for the order (system splash done → Splash hold ≥ min → Splash fade + Home entrance starting then) with fake timers; keep systemSplashHandoff.e2e passing. DeviceCheck: screenrecord cold starts (RM off ×2, RM on ×1, airplane ×1), frame by frame, with the timings that must be seen.` },
  { key: 'game-motion', items: `Low bugs from the APK 22 pass (${F}: p3.appBugs solo-score-flight-target, board-no-rise; p3.checks game-moves-flight, general-alive-menus). QA tasks: "qa.ts task 2 game-moves-flight", "qa.ts task 2 general-alive-menus".
1) solo-score-flight-target: in solo practice ('אימון לבד', one card), the flying +4.5 / −3.5 lands on the left stats ('מהלך שיא'/'זמן', covering '0:21' ~300 ms) while the score that counts up is ~350 px to the right. In the 2-card bot game it lands on the score. Fix the target so it is the score text that counts up, in every layout (solo, 2–4 cards, RTL/LTR, font scale).
2) board-no-rise: at game start the board just fades in with the screen (~70 ms) and does not move; general-alive-menus expects the board to 'rise in'. Check docs/design/motion.md and the spec: if a board rise is specified, implement it (RM off: a short rise + fade; RM on: fade only), without delaying the first playable frame or the GO! handoff (the friends/ranked GO cover from loops 15–16 must stay exactly as is: the board under the GO cover must not move when the cover lifts — if a rise would conflict there, apply it only where there is no GO cover, and say so). If no rise is specified anywhere, report not-a-bug with the evidence (a catalog issue).
Tests for both. DeviceCheck with exact steps.` },
  { key: 'history-results', items: `From the APK 22 pass (${F}: twoB.appBugs history-ranked-more, twoA.appBugs results-game-time-12min).
1) history-ranked-more (phone 1): History, filter 'מדורג': only 3 ranked cards show; 'עוד משחקים' tapped 13+ times adds nothing although older ranked games exist (2 Nov, 14–16 Oct; 'הכל' shows them). After the taps, tapping 'הכל' did nothing for over a minute; it recovered after Home and back. Find the cause (filter applied only to loaded pages? cursor/pagination with a filter? a stuck in-flight flag?) in the History screen, its store and the server's history endpoint (apps/server). Fix so the filtered list loads more until there are no more of that type, the button hides or explains when there are none, and the filter buttons never stop responding. A server change is allowed (keep old apps working).
2) results-game-time-12min (seen once): after a ~30 s friends game (the FIRST game in a new room 822889), both phones' results showed 'זמן משחק 12:03'; the next 5 games were right. durationMs comes from the server result. Find where the server takes the game's start time for a friends room's first game (room creation time? lobby time? a stale timestamp?) and fix it so the duration runs from GO!/board start to the end. Regression test in the server tests.
Tests for both; deviceCheck with steps.` },
  { key: 'pirates-lab', items: `Low, dev screen only (${F}: p1.appBugs pirates-lab-stage-fill-slow, p1.checks avatars-pirates-lab; QA task "qa.ts task 2 avatars-pirates-lab"; earlier fixes for B32: SwitchStep and the Reanimated patch, see fix-loop*.json and git log). Settings › בדיקה › פיראטים on APK 22 (release): after tapping a character button the button highlight lags 0.6–1.2 s and the stage stays blank until 1.2–1.8 s; the task expects the stage to fill within 1 s. No ANR / flood any more. Find what blocks (mounting all avatar SVG/Skia layers at once, JS work per switch, the SwitchStep delay itself) and make the highlight immediate and the stage fill < 1 s on a mid phone (keep the no-flood fix). Test + deviceCheck.` },
]
const results = await parallel(AREAS.map((a) => () => fixArea(a)))
return { fixes: results.filter(Boolean) }
