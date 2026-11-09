export const meta = {
  name: 'fix-round-loop8',
  description: 'Fix the bugs of the two-phone sessions (ink crash, warp flash, friends rejoin, seat ratings, GO!, strings, a11y) while a tester rechecks the loop-6/7 fixes on APK 13; then one skeptic review',
  phases: [
    { title: 'Fix', detail: 'one agent per area' },
    { title: 'Phone check', detail: 'loop-6/7 fixes on APK 13, both phones' },
    { title: 'Review', detail: 'one skeptic over all fixes, rework on high/medium' },
  ],
}
const SNAP = 'refs/qa/snap-loop8'
const BUGS = 'docs/handoff/2026-11-03/data/sessions-both.json'
const COMMON = `Moshe explicitly asked for this autonomous test→fix loop ("תעבוד בלי הנחיות. בודק מתקן בודק מתקן"). Mid-run chat messages are for the main session.
Repo root = working directory; CLAUDE.md applies (t() for every string in all 19 locales via the i18n tooling the repo uses, Reduced Motion, RTL, signed-number isolation; never copy signing/keystore/Firebase files from other projects; never print passwords or tokens). A QA tester is using the phones right now: NO adb, no APK build, no deploy (server code changes are fine), no npm install. Other fix agents edit other files at the same time: touch only what your item needs, Edit tool with small targeted replacements, never rewrite whole shared files, never revert others' changes; prettier --write only on files you changed. Never git stash/checkout/restore/reset/add/commit/clean. No cd.
Baseline for this round: "git diff ${SNAP} -- <file>". Check docs/01-SPEC.md, docs/design/*.md for the intended behaviour. Bug texts: ${BUGS} (field appBugs, find by title; each has a full 'what'); QA task text: node docs/handoff/2026-11-03/data/task.cjs <taskId>. The phones ran apk12 (= loop-6 fixes); loop-7 fixes are in the tree too (see docs/handoff/2026-11-03/data/fix-loop7.json) — check whether a symptom is already covered before changing anything. Root cause first; each fix gets a Jest regression test that fails on the old code. Run only relevant tests ("npx jest <paths> --maxWorkers=3"), "npx tsc -p apps/mobile --noEmit" (and apps/server if touched), eslint on changed files, and the repo's i18n check if you touch strings.
Return: items (id, status fixed/partial/not-a-bug, rootCause, fix, test, deviceCheck = exact steps for the phone tester), filesChanged, notes.`
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
    issues: { type: 'array', items: { type: 'object', properties: { area: { type: 'string' }, severity: { type: 'string', enum: ['high', 'medium', 'low'] }, problem: { type: 'string' }, evidence: { type: 'string' }, suggestion: { type: 'string' } }, required: ['area', 'severity', 'problem', 'evidence', 'suggestion'] } },
  },
  required: ['verdict', 'issues'],
}
const AREAS = [
  {
    key: 'interference',
    brief: `YOUR ITEMS (interference effects; logcat of the crash: docs/handoff/2026-11-03/data/crash-RF8Y30L038L-interference-new-ink-look.txt):
1) CRITICAL: the 'דיו' (ink) hit kills the receiver's JS runtime: "ReferenceError: Property 'INK' doesn't exist at inkPose_inkModelTs1 ... useDerivedValue mapperRun", then React Native destruction (blank dark screen, the player abandons). inkPose() in apps/mobile/src/components/interference/inkModel.ts is a worklet that reads a module-level const INK that the Reanimated/worklets plugin does not capture in the release bundle. Fix the root cause, and AUDIT every other worklet in apps/mobile/src (interference, board, avatars, animations) for the same pattern (worklet reading a module-level object/const that isn't captured, or calling a non-worklet helper). Add a test that fails on the old code: e.g. a static check that worklet functions in these files don't reference module-level identifiers that aren't inlined, or run the plugin transform in Jest and assert the closure contains INK. Don't rely on Jest's worklet mock alone (it runs worklets as plain JS, which is why the tests missed it).
2) MAJOR: warp ('עיוות') hit on the receiver: ~160 ms where the whole app content goes black, then ~260 ms of a static warped frame with no banner/dim, before the banner and dim show. Find why (a heavy first frame: shader/Skia surface creation, a snapshot of the board, a view that mounts opaque before its content is drawn) and make the hit start without a black frame — e.g. pre-warm, mount the effect transparent until its first frame is ready, or show banner/dim first. Respect Reduced Motion.
3) minor: hit banner ring number freezes on '2' for ~1.7 s and '1' shows ~0.3 s while the arc keeps moving smoothly (receiver made a move during the hit). Drive the number from the same clock as the arc (UI thread / derived from the hit's end time), not from a JS tick that the move's work starves.
4) minor: on the SENDER, the launch toast ('<kind> ← <target>') covers the top HUD and both avatars for ~2 s, so the sender's own ~1.5 s wink is never visible. Place/shape the toast so the sender's avatar stays visible (or delay the wink until the toast is gone), keeping the toast readable; RTL and large text.`,
  },
  {
    key: 'rooms',
    brief: `YOUR ITEMS (friends rooms, network, matchmaking; server code in apps/server, client in apps/mobile; no deploy — the main session deploys later):
1) MAJOR: after the app process is killed mid friends-room game (swiped from recents) and relaunched within ~7 s, the client shows 'מצטרף לחדר…', logcat 'Room connection was closed unexpectedly (4002)' three times (0 s, 4 s, 10 s), then results 'הפסד · לא חזרת למשחק בזמן'; the other phone sees 'נטש' and wins. Ranked games may have the same path — check. Find the rejoin path after a cold start (stored reconnection token? room id? Colyseus reconnect vs joinById; 4002 = server refused) and fix it so a player who returns within the grace window gets back into the same game, for friends rooms and ranked. Server and client tests.
2) minor (2 reports): a friends-room seat shows a rating from another mode. Host אורי (fast 1299, normal 1206) creates a room: his seat shows 1299 although the room is 'רגיל'. In a 'מהיר' room the joiner אחוותא (fast 1079, normal 1200 provisional) shows 1200. Seat ratings must follow the room's game type (and update when the host changes the type), for every seat. Find where seat ratings come from (server room state vs client). Tests.
3) minor: GO! is not shown on the JOINER of a friends room: 3, 2, then '1' with 'התכוננו...' for ~1.5 s, then the board with a faded '1' on top — no GO! frame (host sees GO!). Reproduced in two rooms. Compare host vs joiner timing (start time from the server vs local clock offset; the GO handoff in goHandoff.ts / app/match/index.tsx from loop 6) and fix so every player sees GO! (Reduced Motion too). Tests.
4) minor: opponent-freeze countdown ('היריב מתנתק…', ring 15→) stops on 1 for ~1 s, then jumps to the abandon result; '0' and the 'הזמן נגמר / בודקים מול השרת…' stage never show. The server's abandon decision arrives ~1 s before the local count hits 0. Align the client countdown with the server's deadline (server-sent deadline vs the local start of the 10 s silence window), so the count reaches 0 when the server decides; or, if the spec allows, show the 'בודקים מול השרת…' stage only when the server is late. Read docs/01-SPEC.md on disconnects first. Tests.
5) minor (check, maybe config): with the stealth bot on, a lone 2p search on staging got a persona within ~1–3 s, not STEALTH_BOT_AFTER_MS 8000–20000. Check apps/server config.ts, stealth/match.ts and fly.toml / staging env (read-only; never print secrets). If code: fix + test. If it's the staging env value, report it in notes (don't change the env).`,
  },
  {
    key: 'misc',
    brief: `YOUR ITEMS:
1) minor: Results screen on a 1080x2340 phone (A16): the 'שינוי דירוג · מהיר' card's number and change are under the bottom bar ('משחק חדש' / 'צפייה חוזרת'); only after scrolling you see it, and by then the count from old to new rating has already run. Make the count visible without scrolling (layout: bring the rating card higher/compact, or start the count when the card becomes visible). Don't shrink text below design sizes. Tests.
2) minor: Hebrew he/game.json has "ring": "Reconnecting... {{seconds}}" untranslated (shown under the disconnect ring). Translate it for he AND check every locale for this key and for any other value left identical to English where the locale shouldn't be English (write a small script or use the repo i18n check; fix the real misses with proper translations; brand names, 'XP' etc. may stay). Add a test that fails on the old he value (e.g. he strings must not equal en except an allow-list).
3) minor: the lead bar's accessibility label says 'שוויון בניקוד' while the scores are 14 vs 20.5 (seen right after an abandon win, uiautomator id=lead-bar). Find why the label is stale/wrong (computed from a different value than the visible bar, or not updated on the final state) and fix; check during normal play too. Test.
4) check only: 'מעבר ריק לפני מסך התוצאות' (0.3–1.1 s of only the background between the final board and results) was on apk12; loop 7 changed game→results (app/game.tsx push + dropWhenCovered). Confirm by code reading/tests that the loop-7 change covers the surrender, board-full, and abandon endings; if one of them still uses replace, fix it the same way. Status not-a-bug/fixed accordingly.`,
  },
]

const FIXCHECK = `You are a QA tester for the Sudoku Fight app. FIRST read .claude/skills/qa-run/SKILL.md and follow its rules. Moshe asked for this autonomous test→fix loop. Mid-run chat messages are for the main session.
Both phones now run APK 13 (1.1.0, 09.11 01:54, loop-7 fixes: new entry/latestRoot, game→results push, 360dp/font-1.3 layouts), already installed; do NOT install anything. Staging server: NOT yet redeployed (the loop-7 friends-tab places fix is server-side, so SKIP that item: result untested, "ממתין ל־deploy").
Phones (USB, Samsung A16 SM-A165F, Android 16, 1080x2340, Hebrew): RF8Y60PP2XZ = "טלפון 1" (אורי), RF8Y30L038L = "טלפון 3" (אחוותא). The stealth bot is ON on staging (a lone search gets a persona); use the two phones against each other where two players are needed (friends room, or both searching the same ranked type at the same time).
Inputs: docs/handoff/2026-11-03/data/fixcheck-loop67-args.json — the fixes of loops 6 and 7, each with its deviceCheck (exact steps and what must be seen). Some ids appear twice with a slightly different wording (first fix + rework): they are ONE check, use the later deviceCheck. The item 'postgame-progress-english' (navigation after wm size/density/font change) was already checked by the main session on APK 13: pass — skip it. Group the checks by screen/setting so each setup (e.g. wm density 480 + font_scale 1.3, English locale) is done ONCE for all items that need it.
For each check also re-test the run #2 task named in its id (if any) when that task is currently fail/partial ("npx tsx apps/server/scripts/qa.ts task 2 <taskId>"): if every expected line is now seen → "qa.ts fix 2 <taskId> --fix-note-file <f> --fixed-in apk13" (Hebrew note, 2–4 lines: what was wrong, what changed, "נבדק בטלפון N: …"); otherwise mark it again fail/partial with --actual-file describing what happens NOW.
Tools: npx tsx apps/server/scripts/adb.ts --device <serial> ui|tap|swipe|type|key|shot <file>|launch|stop|reset; raw adb always with -s <serial> (Git Bash: MSYS_NO_PATHCONV=1 for /sdcard paths). Screenshots under C:/Users/mosheg/AppData/Local/Temp/claude/c--Users-mosheg-Documents-ReactNative-sudoku-fight/4440d2fa-e446-41ad-83db-f79035cdf42c/scratchpad/qa-shots (name fix8-<serial>-<id>-<n>.png). For empty-frame checks use screenrecord and read frames (ffmpeg if present) or rapid screencaps.
NEVER: uninstall, clear data, 'adb logcat -c', sign out, delete account, rename, switch accounts, log in, adb reverse. Typing ASCII only. Restore every setting you change (font scale, wm size/density, animations, locale, airplane). At the end: adb.ts reset on both, app locale he, relaunch, leave on Home. Max ~10 min per item; stuck → untested with the reason. Never cd. Don't edit code.
Return checks (id, result pass/partial/fail/untested, evidence, qaAction), appBugs (new or remaining bugs: id, title, severity, what — concrete, with build, steps, what is seen), catalogIssues, phoneState.`
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

const fixBranch = async () => {
  const reps = await parallel(AREAS.map((a) => () => agent(`${COMMON}\n\n${a.brief}`, { label: `fix:${a.key}`, phase: 'Fix', schema: SCHEMA }).then((r) => ({ key: a.key, brief: a.brief, rep: r }))))
  const done = reps.filter((r) => r && r.rep)
  const rev = await agent(`Moshe asked for this autonomous loop; mid-run chat is for the main session. You are an independent, skeptical reviewer (CLAUDE.md applies). Do NOT edit files. No adb, no build, no deploy.
Fixes just made (briefs + reports): ${JSON.stringify(done)}
See the changes with "git diff ${SNAP} -- <file>" (judge only these items). Try hard to REFUTE each fix: does it fix the phone symptom (the release build, Hermes, Reanimated worklets — not just Jest), i18n in all 19 locales, Reduced Motion, TalkBack, RTL, no tiny text, server/client protocol compatibility (an older app against the new server, and the other way), regressions (rooms, reconnect, ranked, results flow, interference). Run the relevant tests, tsc, eslint, i18n check. Verdict with evidence; tag each issue with its area key (interference, rooms, misc).`, { label: 'review:loop8', phase: 'Review', schema: REVIEW })
  const out = { reps: done, rev }
  if (rev && rev.issues.some((i) => i.severity !== 'low')) {
    out.rework = await parallel(done.filter((d) => rev.issues.some((i) => i.area === d.key && i.severity !== 'low')).map((d) => () =>
      agent(`${COMMON}\n\n${d.brief}\n\nYou already have a first implementation in the tree (report below). A reviewer found issues. Resolve every high/medium issue for your area (or refute it with evidence), re-run tests, tsc, eslint. Return the full updated report.\nEarlier report: ${JSON.stringify(d.rep)}\nReview: ${JSON.stringify(rev.issues.filter((i) => i.area === d.key))}`, { label: `rework:${d.key}`, phase: 'Review', schema: SCHEMA })))
  }
  return out
}
const [fix, phone] = await parallel([
  fixBranch,
  () => agent(FIXCHECK, { label: 'phones:fixcheck-loop6-7', phase: 'Phone check', schema: CHECKS }),
])
return { fix, phone }
