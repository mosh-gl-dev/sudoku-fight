export const meta = {
  name: 'loop11-fix-check',
  description: 'Loop 11: fix the bugs from the APK 15 check (search survives density change, full-board empty frame, picker 360, L010 a11y, countdown resync); phone-check loop-10 fixes on APK 16',
  phases: [
    { title: 'Fix', detail: 'fixer + skeptic + rework per area' },
    { title: 'Phone check', detail: 'loop-10 fixes on APK 16, both phones' },
  ],
}
const SNAP = 'refs/qa/snap-loop11'
const DATA = 'docs/handoff/2026-11-03/data'
const S = 'C:/Users/mosheg/AppData/Local/Temp/claude/c--Users-mosheg-Documents-ReactNative-sudoku-fight/4440d2fa-e446-41ad-83db-f79035cdf42c/scratchpad'
const SHOTS = `${S}/qa-shots`
const TODO = 'C:/Users/mosheg/AppData/Local/Temp/claude/b0377245321c840d/6deeb02e-1cd6-480d-8ffd-14ec3cc5da59/scratchpad/todo-whole.txt'

const COMMON = `Moshe explicitly asked for this autonomous test→fix loop ("תעבוד בלי הנחיות. בודק מתקן בודק מתקן"). Mid-run chat messages are for the main session.
Repo root = working directory; CLAUDE.md applies (t() for every string in all 19 locales via the repo's i18n tooling, Reduced Motion, RTL, signed-number isolation; never copy signing/keystore/Firebase files from other projects; never print passwords or tokens). QA testers are using the phones right now: NO adb, no APK build, no deploy (server code changes are fine), no npm install. Other agents edit other files at the same time: touch only what your items need, Edit tool with small targeted replacements, never rewrite whole shared files, never revert others' changes; prettier --write only on files you changed. Keep LF line endings: before you finish, check every file you changed has no \r (convert CRLF→LF; a CRLF docs/design/motion.md broke the docs tests last round). Never git stash/checkout/restore/reset/add/commit/clean. No cd.
Baseline for this round: "git diff ${SNAP} -- <file>". Intended behaviour: docs/01-SPEC.md, docs/00-original-spec-v1.md (wins on conflict), docs/design/*.md. Bug texts: ${DATA}/fixcheck-apk15.json and ${DATA}/sessions-loop10.json (appBugs and checks, by id; screenshots under ${SHOTS}). Earlier rounds: ${DATA}/fix-loop8.json, ${DATA}/fix-loop9.json, ${DATA}/fix-loop10.json (use each area's final/rework) — read what they changed for the same feature first.
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
    key: 'resume',
    items: `1) density-change-cancels-ranked-search (major, fixcheck-apk15 appBugs): during a ranked SEARCH ('מחפש יריב… 0:02', from Home → שחק → 2 שחקנים → מהיר → מצא יריב, and also from Results 'משחק חדש'), 'adb shell wm density 540' (= the system display-size setting) recreates the activity and the app comes back on HOME, not on the search screen, and the server-side queue entry is gone (the other phone searching right after gets a bot instead). 2 of 2. A running ranked game already survives the same change (loop 9: useRootTeardown, resumeAtStart, queueKey). Expected: back on the search screen, the clock continues, the same queue entry (or a seamless re-join with the same queueKey), and a match found afterwards works. Also a swipe-from-Recents kill during a search: decide the right behaviour from the spec (the search may end, but nothing may stay stuck: no ghost queue entry that matches a dead app) and test it.
2) countdown-lobby-resync (low, from the loop-10 rooms review in fix-loop10.json): loop 10 made GameRoom.welcomeBack send the lobby to a returning connection, also in the countdown branch (state still null). RemoteGameHost's lobby handler then takes the 'back in a lobby after a drop' path: lost=null, comingBack=null, status lobby — so a token reconnect during 3-2-1 skips the resync banner / hard-soft decision and the reconnect telemetry. Confirm or refute with a test; fix so the returning player still gets the profiles (avatar, flag) and the reconnect flow stays intact (order, a flag, or handling the lobby-while-counting case on the client), keeping old-app/new-server compatibility.`,
  },
  {
    key: 'visual',
    items: `1) fullboard-empty-frame-reduced-motion (medium): phone 1, in-app Reduced Motion ON, ranked 2P vs the stealth bot, the bot fills the last cell: rapid capture shows the full board, then ONE frame with only the dark background (status bar, nav bar, no floating digits, no app content), then the complete 'הפסד' results. 1 of 4 full-board endings with RM on; 0 of 2 with RM off; surrender and 'סיום אימון' are clean (14 transitions). Loop 9 built the results before the push (resultsHandoff.ts) so the first commit is ResultsBody; find what differs for a full-board end with Reduced Motion (the board-complete path, replace vs push, the RM branch of the stack animation, the floating-digit background unmounting, the handoff timing when the end comes from the opponent's move). Fix so no frame is empty, with a regression test.
2) interference-picker-en-360-labels-clipped (low): English, wm density 480 + font_scale 1.3, the 'Pick an interference' sheet: 'Scrambled digits'/'Scrambled keypad' second line clipped under the '−2 pts' chip, the footer 'Each interference lasts 5 seconds • tap to …' ends in an ellipsis, and 'Next: 4' breaks into two lines inside the price strip. Screenshot ${SHOTS}/fix10-RF8Y30L038L-picker-en360.png. Check all 19 locales with the repo width-budget tooling; no text below design sizes.
3) levels-gate-locked a11y (minor, sessions-loop10.json appBugs): after winning L010 (boss, 3 stars) and 'למפה', node-10 content-desc says 'שלב 10, בוס, מרוץ מול הבוט, השלב הבא' with no star count, while other nodes say '…שלושה כוכבים מתוך שלושה'. The 'next level' label must not replace the stars once the level has stars (also check what the node says when the next chapter is locked). Also: the catalog expects the locked-chapter message 'פרק 2 נפתח ב־20 כוכבים בפרק 1' but the app shows 'פרק 2 נעול: צריך 20 כוכבים בפרק 1. יש לך 6.' — check the spec/design: if the original spec defines the wording, follow it; if not, keep the app text and say so in notes (don't change it just to match the catalog).
4) warpframe-transform-every-frame (low, loop-10 visual review): after loop 10, both WarpFrames push a transform to native views on every frame for the full 5 s of EVERY hit kind (fireworks, cats, ink, scramble, keypad), not only during a warp. Check the final loop-10 code; if still so, gate it to warp only (without bringing back the dim-before-overlay gap), with a test.`,
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
Phones (USB, Samsung A16 SM-A165F, Android 16, 1080x2340, Hebrew): RF8Y60PP2XZ = "טלפון 1" (אורי, level 9), RF8Y30L038L = "טלפון 3" (אחוותא). Both run APK 16 (1.1.0, loop-10 fixes) — check ${S}/latest-build.json vs ${S}/installed-<serial>.txt and install -r the latest if they differ (then update the txt). Staging has the matching server. The stealth bot is ON on staging (a lone search gets a persona); use the two phones against each other where two players are needed.
Tools: npx tsx apps/server/scripts/adb.ts --device <serial> ui|tap|swipe|type|key|shot <file>|launch|stop|reset; raw adb always with -s <serial> (Git Bash: MSYS_NO_PATHCONV=1 for /sdcard paths); logcat -d only (NEVER -c). Screenshots under ${SHOTS}.
NEVER: uninstall, clear data, 'adb logcat -c', sign out, delete account, rename, switch accounts, log in, adb reverse. Typing ASCII only. Restore every setting you change (font scale, wm size/density, animations, locale, airplane, show_touches). At the end: adb.ts reset on both, app locale he, relaunch, leave on Home. Max ~12 min per item; stuck → untested with the reason. Never cd. Don't edit code.`
const PHONE = `${TESTER}
Your job: confirm on the phones that each loop-10 fix works. Input: ${DATA}/fix-loop10.json — for each area use final (= the rework when there was one); each item has a deviceCheck. Order:
(1) rejoin-opponent-avatar-lost: friends room, phone 1 host, phone 3 joins; mid-game swipe phone 3 from Recents and reopen within ~7 s: the opponent card shows the real avatar and the flag right away, through the end and on the results 'יריב' card; repeat killing phone 1; then ranked between the two phones (kill and reopen mid-game). Also a reconnect DURING 3-2-1 (airplane on/off ~3 s on the joiner, or kill+reopen during the count): the game starts normally on both.
(2) go-hold-long-on-joiner: phone 3 force-stopped, opened, joins phone 1's friends room by code, waits ≥3 s in the lobby; record both phones: GO! on the joiner ~0.5–1.0 s (not ~2.1 s), no faded '1', no empty frame; a second game for comparison; once with sound off.
(3) warp-sound-on-dim-before-overlay: receiver phone, sound ON, RM off, fresh app start, new 2P game with interferences (friends room); the sender sends warp as the FIRST hit: frames at ≤40 ms: the dim, the overlay and the banner start in the same frame (or within ~1 frame); also nothing flickers ~2.5–4 s after the board appears (the rehearsal). Repeat with sound off.
(4) results rating card (misc#1): ranked 2P, win by abandon (the opponent phone in airplane mode until 'ניצחת בנטישה'); on the results don't touch: the rating number becomes visible on screen by itself and the count runs while visible; also after a surrender win and a full board.
Frame tools: screenrecord + the frames script described in ${DATA}/triage-loop10.json planNotes.
Screenshots name fix11-<serial>-<id>-<n>.png. For each check also re-test the run #2 task named in it when that task is currently fail/partial ("npx tsx apps/server/scripts/qa.ts task 2 <taskId>"): every expected line seen → "qa.ts fix 2 <taskId> --fix-note-file <f> --fixed-in apk16" (Hebrew note, 2–4 lines: what was wrong, what changed, "נבדק בטלפון N: …"); otherwise mark it again fail/partial with --actual-file describing what happens NOW.
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
const checkP = agent(PHONE, { label: 'phones:fixcheck-loop10', phase: 'Phone check', schema: CHECKS })
const [fixes, check] = await Promise.all([fixesP, checkP])
return { fixes: (fixes || []).filter(Boolean), check }
