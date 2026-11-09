export const meta = {
  name: 'fix-round-loop9',
  description: 'Loop 9: root-cause and fix the persistent board→results empty frame, the mid-game config-change/cold-start orphan, Back at GO!, 360dp leftovers; per-area skeptics; meanwhile a tester checks loop-8 fixes on APK 14 with both phones',
  phases: [
    { title: 'Investigate', detail: 'independent read-only root-cause analyses' },
    { title: 'Fix', detail: 'one fixer per area' },
    { title: 'Review', detail: 'one skeptic per area, rework on high/medium' },
    { title: 'Phone check', detail: 'loop-8 fixes on APK 14 + staging deploy, both phones' },
  ],
}
const SNAP = 'refs/qa/snap-loop9'
const DATA = 'docs/handoff/2026-11-03/data'
const BUGS = `${DATA}/fixcheck-apk13.json`
const SHOTS = 'C:/Users/mosheg/AppData/Local/Temp/claude/c--Users-mosheg-Documents-ReactNative-sudoku-fight/4440d2fa-e446-41ad-83db-f79035cdf42c/scratchpad/qa-shots'
const COMMON = `Moshe explicitly asked for this autonomous test→fix loop ("תעבוד בלי הנחיות. בודק מתקן בודק מתקן"). Mid-run chat messages are for the main session.
Repo root = working directory; CLAUDE.md applies (t() for every string in all 19 locales via the repo's i18n tooling, Reduced Motion, RTL, signed-number isolation; never copy signing/keystore/Firebase files from other projects; never print passwords or tokens). A QA tester is using the phones right now: NO adb, no APK build, no deploy (server code changes are fine), no npm install. Other agents edit other files at the same time: touch only what your items need, Edit tool with small targeted replacements, never rewrite whole shared files, never revert others' changes; prettier --write only on files you changed. Never git stash/checkout/restore/reset/add/commit/clean. No cd.
Baseline for this round: "git diff ${SNAP} -- <file>". Intended behaviour: docs/01-SPEC.md, docs/00-original-spec-v1.md (wins on conflict), docs/design/*.md (motion.md for transitions). Bug texts: ${BUGS} (appBugs, by id; screenshots named there are under ${SHOTS}). Earlier rounds on the same symptoms: ${DATA}/fix-loop6.json (area transitions), ${DATA}/fix-loop7.json (area navigation), ${DATA}/fix-loop8.json — read what they tried, and why it did not work on the phone, before you change anything. QA task text: node ${DATA}/task.cjs <taskId>.`
const FIXRET = `Root cause first; each fix gets a Jest regression test that fails on the old code (and say how you know it fails on the old code). Run only relevant tests ("npx jest <paths> --maxWorkers=3"), "npx tsc -p apps/mobile --noEmit" (and apps/server if touched), eslint on changed files, the repo's i18n check if you touch strings.
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
const ANALYSIS = {
  type: 'object',
  properties: {
    findings: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, rootCause: { type: 'string' }, evidence: { type: 'string', description: 'file:line references, code quotes, library source quotes, timings' }, confidence: { type: 'string', enum: ['high', 'medium', 'low'] }, proposedFix: { type: 'string' }, risks: { type: 'string' } }, required: ['item', 'rootCause', 'evidence', 'confidence', 'proposedFix', 'risks'] } },
  },
  required: ['findings'],
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
    key: 'transitions',
    items: `1) surrender-end-empty-frame-still (minor, but the THIRD round on it): APK 13 (it HAS loop 7's game→results push + dropWhenCovered). After 'כניעה' → 'כן, להיכנע' in ranked (4/4) and after 'סיום אימון' vs a bot (3/3), also with Reduced Motion ON: the board fades to ~50% and disappears, then 0.6–1.0 s of only the dark ambient background and digits (in the second half also 'לבית' at the top — the results screen's header?), only then 'הפסד' comes in. No cross-fade from board to results.
2) results-newgame-empty-frame-intermittent (minor): Results 'משחק חדש' → search: 1 of 3 times 170–500 ms of background with only the 'ביטול חיפוש' button (no title, no radar, no results). Loop 6 changed this path (push over results + dropWhenCovered).
3) back-during-go-opens-surrender (minor): Android Back while GO! is shown (game screen already mounted under the GO! cover) opens the 'אתה בטוח שאתה רוצה להיכנע?' dialog over GO!. Expected: Back during the count/GO! does nothing (check the spec for the pregame count; the match screen may already block Back during 3-2-1).`,
    angles: [
      'Angle A — native/navigation: how react-native-screens 4.26 (node_modules/react-native-screens, Android Fabric: ScreenStack, ScreenStackFragment/animations, NativeProxy, the transition used by expo-router stack options in app/_layout.tsx and goHandoff.ts) draws a push with animation fade / none, when the covered screen is detached, what the results screen looks like in its first frames (does it mount its content late: Suspense, data loading, InteractionManager, an entrance animation starting from opacity 0, a hidden-until-layout gate?).',
      'Angle B — JS/app side: what GameScreen does at the end of a game BEFORE navigating (game.end hold in motion.md, board fade-outs, overlays unmounting, the results "stage" hold, Reduced Motion paths, practice end path), what the results screen renders in its first ~1 s (entrance choreography from opacity 0, waiting for data from the host/store, skeletons), and the timeline from the surrender confirm to the results being visible. Build a millisecond timeline from the code.',
    ],
  },
  {
    key: 'resume',
    items: `1) density-change-orphans-ranked-game (MAJOR): APK 13, mid ranked 2P game, 'adb shell wm density 540' (= changing display size in Settings): the app rebuilds on Home with no active game and no way back to it; a new search fails 'You already have a ranked search or game going' (alreadyQueued); minutes later the game is recorded as a loss. Probably any activity recreation (font size, display size, maybe dark mode / locale / other config changes) does the same mid-game. Loop 7 made only the newest React root draw (apps/mobile/index.ts, src/services/latestRoot.tsx) instead of stopping recreation.
2) From the loop-8 review (medium): after the app PROCESS is killed mid ranked game and relaunched within the grace, the server now accepts the same identity back into the held seat (apps/server/src/rooms/GameRoom.ts holdSeat + takeover, loop 8), but the app has no cold-start resume for ranked (friends rooms rejoin via their stored room/ticket path). A player who returns within the grace must get back into the same game, ranked and friends, after a process kill AND after an activity recreation.
Decide the right design (read the spec first: disconnect/return rules §16, D4/D42; app lifecycle). Options to weigh, possibly both: (a) stop recreation for density/fontScale/screenSize/smallestScreenSize/screenLayout/uiMode/locale/layoutDirection via android:configChanges (Expo config plugin / app.config.ts), making sure RN still picks up the new font scale and window metrics (Dimensions/PixelRatio/useWindowDimensions update, re-layout) — verify in RN 0.86 source how ReactActivity forwards onConfigurationChanged; (b) a resume path: on app start / root remount, ask the server (or local persisted state) for an active game of this account and go straight back into it (ranked + friends), with the existing reconnect UI; the alreadyQueued error on search should also offer the way back. Server + client tests; keep older-app/newer-server compatibility.`,
    angles: [
      'Angle A — Android/RN platform: the generated AndroidManifest configChanges (apps/mobile/app.config.ts, plugins, android/app/src/main/AndroidManifest.xml if prebuilt), RN 0.86 ReactActivity/ReactActivityDelegate/ReactHost onConfigurationChanged, how font scale and density changes reach JS when the activity is NOT recreated (DeviceInfoModule, Dimensions change events, PixelRatio), Expo modules that might hold per-activity state, and what loop 7 (index.ts/latestRoot.tsx) does on recreation and why the game screen is lost.',
      'Angle B — app/server state: where the client keeps the active game (stores, GameHost/RemoteGameHost, room/reconnection tokens, persisted storage), why a new root starts on Home instead of the game, what the server knows (active game per account, alreadyQueued check, held seats from loop 8), and the cleanest resume API/flow for both a recreated activity and a killed process, ranked and friends.',
    ],
  },
  {
    key: 'layout',
    items: `All at 360dp (wm density 480 on a 1080-wide phone, or 540 = 360dp at font 1.0) — Moshe hates tiny text: never shrink below design sizes; wrap, reflow, or move secondary info; never break mid-word; no '…' on meaningful text (names may be shortened only when unavoidable):
1) history-he-practice-line-cut-360: Hebrew history, practice cards: 'הפסד • אימון / מול בוט • מ…' and 'האימון / הסתיים • אי…' — the subline needs 3 lines and gets 2 with '…' (English and ranked are fine).
2) playercard-en-stages-clipped-360: English player card, 'Stages: 9 • ★ 0' clipped at the bottom (descenders cut by a straight line) at font 1.3. Also in Hebrew the stats show 4 per row with 2-line labels vs 2 per row in English — check that's intended.
3) not-enough-points-toast-cut: at 360dp font 1.0, tapping interfere with <2 points: the top toast is cut: 'Not enough points for the next i…' / 'אין מספיק נקודות להפרעה הבאה (2 …'.
4) bot-header-chip-cut-360: practice vs Mr. Hoot, bot card: name 'Mr. Ho…' (name may shorten) but the level chip '3 • Adva…' is cut mid-word.
5) leaderboard-podium-edge-360 (cosmetic): English General tab podium: place 2's '1232 Provisional' is wider than its column; the '1' touches the screen's left edge (x≈5px).
6) botselect-en-desc-ellipsis-360 (cosmetic): English bot select descriptions end in '…' after 2 lines.
7) replay-prev-chevron-360 (cosmetic): English Replay: '‹ Previous / step' wraps to 2 lines but keeps the chevron; loop 7 said the chevron goes at this size.
Add tests at 360dp and font 1.3 (and 1.0 where stated) in en and he for each screen you touch (the repo has fit-test helpers from loops 5–7; reuse them).`,
    angles: null,
  },
]

const fixArea = async (a) => {
  let analyses = []
  if (a.angles) {
    analyses = (await parallel(a.angles.map((ang, i) => () => agent(`${COMMON}\n\nREAD-ONLY investigation: do NOT edit any file. Find the real root cause of these items, with evidence (file:line, quotes of our code and of library source in node_modules, a millisecond timeline). Earlier rounds guessed and the phone proved them wrong, so be concrete and say how confident you are.\n${ang}\n\nITEMS:\n${a.items}`, { label: `investigate:${a.key}:${i + 1}`, phase: 'Investigate', schema: ANALYSIS })))).filter(Boolean)
  }
  const fixPrompt = `${COMMON}\n\nYOUR ITEMS (area ${a.key}):\n${a.items}\n${analyses.length ? `\nIndependent read-only analyses (they may disagree; weigh the evidence, check it yourself, and fix the real cause — if both causes are real, fix both):\n${JSON.stringify(analyses)}\n` : ''}\n${FIXRET}`
  const rep = await agent(fixPrompt, { label: `fix:${a.key}`, phase: 'Fix', schema: SCHEMA })
  if (!rep) return { key: a.key, analyses, rep: null }
  const rev = await agent(`Moshe asked for this autonomous loop; mid-run chat is for the main session. You are an independent, skeptical reviewer for area '${a.key}' (CLAUDE.md applies). Do NOT edit files. No adb, no build, no deploy.
Items: ${a.items}
Fixer's report: ${JSON.stringify(rep)}
See the changes with "git diff ${SNAP} -- <file>". Try hard to REFUTE each fix: will it fix the symptom ON THE PHONE (release build, Hermes, Fabric, react-native-screens native transitions, Reanimated worklets — not just Jest)? Earlier rounds passed Jest and failed on the phone, so check the mechanism against library source. Also i18n in all 19 locales, Reduced Motion, TalkBack, RTL, no tiny text, server/client compatibility (old app vs new server and the other way), regressions (navigation, deep links, back handling, results flow, rooms, reconnect, ranked queue). Run the relevant tests, tsc, eslint, i18n check. Verdict with evidence.`, { label: `review:${a.key}`, phase: 'Review', schema: REVIEW })
  let final = rep
  let rework = null
  if (rev && rev.issues.some((i) => i.severity !== 'low')) {
    rework = await agent(`${fixPrompt}\n\nYou already have a first implementation in the tree (report below). A skeptical reviewer found issues. Resolve every high/medium issue (or refute it with concrete evidence), re-run tests, tsc, eslint. Return the full updated report.\nEarlier report: ${JSON.stringify(rep)}\nReview: ${JSON.stringify(rev.issues)}`, { label: `rework:${a.key}`, phase: 'Review', schema: SCHEMA })
    if (rework) final = rework
  }
  return { key: a.key, analyses, rep, rev, rework, final }
}

const PHONE = `You are a QA tester for the Sudoku Fight app. FIRST read .claude/skills/qa-run/SKILL.md and follow its rules. Moshe asked for this autonomous test→fix loop. Mid-run chat messages are for the main session.
Both phones run APK 14 (1.1.0, loop-8 fixes), already installed; do NOT install anything. Staging was just deployed with the loop-7 and loop-8 server fixes (friends-tab places, rejoin into a held seat after a process kill, seat ratings per room type).
Phones (USB, Samsung A16 SM-A165F, Android 16, 1080x2340, Hebrew): RF8Y60PP2XZ = "טלפון 1" (אורי, level 9), RF8Y30L038L = "טלפון 3" (אחוותא, level 6-7). The stealth bot is ON on staging (a lone search gets a persona); use the two phones against each other where two players are needed (friends room, or both searching the same ranked type at the same time).
Inputs: ${DATA}/fix-loop8.json — for each area use the 'rework' report when present (it supersedes the first one), otherwise reps[].rep; each item has a deviceCheck (exact steps and what must be seen). Also check loop 7's friends-tab places (${DATA}/fix-loop7.json area misc, 'Friends tab places'; now deployed). Skip items with status not-a-bug unless their deviceCheck asks for something.
The most important: the INK interference crash (critical) — do it first, and repeat it at least 3 times (including with Reduced Motion on), checking logcat (adb -s <serial> logcat -d, filtered; NEVER -c) for 'doesn't exist' / handleHostException. Then the friends rejoin after swiping the app away mid game (and the same in a ranked game between the two phones), the warp hit start frames (screenrecord on the receiver, read frames at fine steps), GO! on the joiner, seat ratings, the ring number, the sender toast + wink, the results rating card visible without scrolling, the lead-bar label.
Group checks by setup so each setup is done once. For each check, also re-test the run #2 task in its id when that task is currently fail/partial ("npx tsx apps/server/scripts/qa.ts task 2 <taskId>"): every expected line seen → "qa.ts fix 2 <taskId> --fix-note-file <f> --fixed-in apk14" (Hebrew note, 2–4 lines: what was wrong, what changed, "נבדק בטלפון N: …"); otherwise mark it again fail/partial with --actual-file describing what happens NOW.
Tools: npx tsx apps/server/scripts/adb.ts --device <serial> ui|tap|swipe|type|key|shot <file>|launch|stop|reset; raw adb always with -s <serial> (Git Bash: MSYS_NO_PATHCONV=1 for /sdcard paths). Screenshots under ${SHOTS} (name fix9-<serial>-<id>-<n>.png).
NEVER: uninstall, clear data, 'adb logcat -c', sign out, delete account, rename, switch accounts, log in, adb reverse. Typing ASCII only. Restore every setting you change (font scale, wm size/density, animations, locale, airplane, show_touches). At the end: adb.ts reset on both, app locale he, relaunch, leave on Home. Max ~12 min per item; stuck → untested with the reason. Never cd. Don't edit code.
Return checks (id, result pass/partial/fail/untested, evidence, qaAction), appBugs (new or remaining bugs: id, title, severity, what — concrete, with build, steps, what is seen, screenshot paths), catalogIssues, phoneState.`
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

const [areas, phone] = await parallel([
  () => parallel(AREAS.map((a) => () => fixArea(a))),
  () => agent(PHONE, { label: 'phones:fixcheck-loop8', phase: 'Phone check', schema: CHECKS }),
])
return { areas: (areas || []).filter(Boolean), phone }
