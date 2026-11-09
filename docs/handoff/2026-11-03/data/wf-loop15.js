export const meta = {
  name: "loop15-fix-check",
  description: "Loop 15: fix the joiner card box, GO cover jump, levels map lost on recreate, nav bar colour; perfetto-trace the first warp freeze on APK 20 then fix it; phone-check loop-14 fixes",
  phases: [
    { title: "Fix", detail: "fixer + skeptic + rework" },
    { title: "Phone check", detail: "warp trace + loop-14 fixes on APK 20" },
  ],
}
const SNAP = 'refs/qa/snap-loop15'
const DATA = 'docs/handoff/2026-11-03/data'
const S = 'C:/Users/mosheg/AppData/Local/Temp/claude/c--Users-mosheg-Documents-ReactNative-sudoku-fight/4440d2fa-e446-41ad-83db-f79035cdf42c/scratchpad'
const SHOTS = `${S}/qa-shots`
const TODO = 'C:/Users/mosheg/AppData/Local/Temp/claude/b0377245321c840d/6deeb02e-1cd6-480d-8ffd-14ec3cc5da59/scratchpad/todo-whole.txt'

const COMMON = `Moshe explicitly asked for this autonomous test→fix loop ("תעבוד בלי הנחיות. בודק מתקן בודק מתקן"). Mid-run chat messages are for the main session.
Repo root = working directory; CLAUDE.md applies (t() for every string in all 19 locales via the repo's i18n tooling, Reduced Motion, RTL, signed-number isolation; never copy signing/keystore/Firebase files from other projects; never print passwords or tokens). QA testers are using the phones right now: NO adb, no APK build, no deploy (server code changes are fine), no npm install. Other agents edit other files at the same time: touch only what your items need, Edit tool with small targeted replacements, never rewrite whole shared files, never revert others' changes; prettier --write only on files you changed. Keep LF line endings: before you finish, check every file you changed has no \r (convert CRLF→LF; a CRLF docs/design/motion.md broke the docs tests last round). Never git stash/checkout/restore/reset/add/commit/clean. No cd.
Baseline for this round: "git diff ${SNAP} -- <file>". Intended behaviour: docs/01-SPEC.md, docs/00-original-spec-v1.md (wins on conflict), docs/design/*.md. Bug texts: ${DATA}/fixcheck-apk19.json (and older fixcheck-apk18.json) (appBugs and checks, by id; screenshots under ${SHOTS}). Earlier rounds: ${DATA}/fix-loop8.json, ${DATA}/fix-loop9.json, ${DATA}/fix-loop10.json, ${DATA}/fix-loop11.json, ${DATA}/fix-loop12.json, ${DATA}/fix-loop13.json, ${DATA}/fix-loop14.json (use each area's final/rework) — read what they changed for the same feature first.
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
Phones (USB, Samsung A16 SM-A165F, Android 16, 1080x2340, Hebrew): RF8Y60PP2XZ = "טלפון 1" (אורי, level 9), RF8Y30L038L = "טלפון 3" (אחוותא). Both run APK 20 (1.1.0, loop-14 fixes) — check ${S}/latest-build.json vs ${S}/installed-<serial>.txt and install -r the latest if they differ (then update the txt). Staging has the matching server. The stealth bot is ON on staging (a lone search gets a persona); use the two phones against each other where two players are needed.
Tools: npx tsx apps/server/scripts/adb.ts --device <serial> ui|tap|swipe|type|key|shot <file>|launch|stop|reset; raw adb always with -s <serial> (Git Bash: MSYS_NO_PATHCONV=1 for /sdcard paths); logcat -d only (NEVER -c). Screenshots under ${SHOTS}.
NEVER: uninstall, clear data, 'adb logcat -c', sign out, delete account, rename, switch accounts, log in, adb reverse. Typing ASCII only. Restore every setting you change (font scale, wm size/density, animations, locale, airplane, show_touches). At the end: adb.ts reset on both, app locale he, relaunch, leave on Home. Max ~12 min per item; stuck → untested with the reason. Never cd. Don't edit code.`
const AREAS = [
  {
    key: 'friends-game',
    items: `1) joiner-me-card-box (minor, now reproducible 100%; ${DATA}/fixcheck-apk19.json: appBugs joiner-me-card-box and the check 'stale-dark-box-after-countdown-reconnect (investigation)' — read both in full): in a FRIENDS game, on the JOINER only (never the host, never ranked or bot games), from the first board frame a sharp rectangle exactly on the 'אני' PlayerCard frame (159×110 dp at density 450): clearly grey on phone 1 (54,56,61 vs bg 15,18,24), one level darker on phone 3; the card's avatar/'אני'/'0' draw on top. It stays >40 s and through the opponent's move, and goes away when the joiner taps any cell (a selection) or makes a move. 'Show view updates' proves it is DRAWN content (a view background/state), not stale pixels; no extra SurfaceFlinger layer. Find which style/state of the 'me' card (or a view placed on it) differs for the joiner after the friends handoff (loop 13 moved the friends GO to push + GoCover: goHandoff.ts, GoCover.tsx, FriendsGoFrame; also the lobby's 'me' seat, a pressed/focused/selected/target/highlight state, an a11y focus indicator, a leftover GoCover piece sized to the card) and what a cell tap resets. Fix + a test that fails on the old code.
2) go-cover-slam-jump (minor, regression from loop 13, appBugs go-cover-slam-jump): in a friends room the room's GO! slams in (1.4 → 1; with Reduced Motion a fade at scale 1); 220–280 ms later, exactly at the move to the game screen, GO! jumps to a bigger, doubled (two offset layers) size for 3–5 frames, then snaps back to 1 — host and joiner, every run, also with Reduced Motion (and the system animations at 0). The GoCover's GO! must continue from where the room's GO! is (same scale/opacity, no restart, no second copy visible), and with Reduced Motion never scale. Compare with ranked's CountdownView→GoCover handoff, which does not jump. Fix + test.`,
  },
  {
    key: 'nav',
    items: `1) levels-map-recreate-lands-home (minor, appBugs): Home → שחק → אימון בשלבים (map on level 78); 'adb shell wm density 540' (or reset; = a display-size or font-size change) → the app comes back on HOME, not on the map, and Android Back from there exits the app. 3 of 3. Loop 13's flowStack (apps/mobile/src/game/flowStack.ts; app/+native-intent.tsx; auth/useAuthGate.ts) restores the old stack only when the root started on a live flow; ordinary screens (the map, 'משחק חדש', settings, history, a level's result) are lost on every recreation. Make a recreated root come back to the SAME screen with the same stack under it for every screen, keeping the rules of loop 13 (screens that start something on mount — game, match, friends/room, friends/join, room/[code], results — are never re-created by restoring; the live flows keep working exactly as now, including the search and the room). Also keep the screen's params (e.g. the map's chapter/scroll if stored in params). Tests through the real root as loop 13's recreatedFlowStack.test.tsx does.
2) nav-bar-light-on-some-screens (cosmetic, appBugs): the Android 3-button navigation bar is sometimes light grey instead of dark: ranked game on phone 1 (same moment dark on phone 3), the opponent search, bot and friends games and the error screen on phone 3; dark in solo practice and levels. No clear pattern; maybe the colour/style set by the previous screen. Find where the nav bar colour/button style is set (expo-navigation-bar / edge-to-edge / SystemBars / per-screen StatusBar or NavigationBar calls, app.config androidNavigationBar) and make it consistently dark (as the app theme) on every screen, including after a recreation and after a modal. Test what can be tested (the calls per screen).`,
  },
]
const MEASURE = `${TESTER}
Your job (first part) is a MEASUREMENT for one stubborn bug, then (second part) a phone check.
PART 1 — warp-first-hit freeze (${DATA}/fixcheck-apk18.json appBugs warp-first-hit-150ms-freeze; loop-14 notes in ${DATA}/fix-loop14.json 'warp' (its review says the sound cause is unproven and the evidence is 1 recording per condition)). On APK 20, receiver phone 3, RM off, fresh app start each run, friends fast room, phone 1 sends 'עיוות' as the FIRST hit ≥10 s after the board. Do 3 runs with sound ON and 3 with sound OFF (the in-app sound setting; restore it ON at the end). For each run capture a system trace with perfetto on phone 3 covering the hit: e.g. 'adb -s RF8Y30L038L shell perfetto -o /data/misc/perfetto-traces/warp.pftrace -t 20s sched freq idle am wm gfx view input audio hal dalvik binder_driver -a com.mosheg.sudokufight' started just before phone 1 taps, then pull the trace (if the trace_processor is not available locally, use 'npx -y @perfetto/trace_processor' only if it installs without prompts; otherwise read it with 'perfetto --txt' alternatives or report the slices you can extract), plus a screenrecord at 60 fps (frames at ≤17 ms) and gfxinfo framestats. Report per run: whether a frozen stretch happens (start, length), and on the UI thread (main) and RenderThread what runs during it (Choreographer#doFrame, traversal, draw, a long binder call, AudioTrack/MediaPlayer/ExoPlayer creation, GC, Skia/GL shader compile, JS thread busy (mqt_js), Fabric commit/mount). Name the longest slices with their durations.
Save files under ${SHOTS} as measure15-....
PART 2 — confirm the loop-14 fixes (${DATA}/fix-loop14.json, use final; each item has a deviceCheck — follow it): results under Reduced Motion 'כמו במכשיר' with the system animations set to 0 while the app is open (A) and in-app 'מופעלת' (B) — everything at once, no jump, no counting; a11y under the covers ('uiautomator dump --compressed': no game nodes under 'לא חזרת למשחק בזמן' or under the opponent-left dialog); opponent-countdown time-up hold on the winner's phone ('הזמן נגמר · בודקים מול השרת…' after 1, then the dialog). Screenshots fix15-<serial>-<id>-<n>.png. Re-test the run #2 task named in each check when it is fail/partial (qa.ts task 2 <id>; fix with --fixed-in apk20 or mark again with --actual-file).
Leave both phones as found (adb.ts reset, locale he, settings restored, Home). Return: warp (runs, observations, suspects, files), and checks, appBugs, catalogIssues, phoneState as usual.`
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






const MEASURED15 = {
  type: 'object',
  properties: {
    warp: { type: 'object', properties: { runs: { type: 'array', items: { type: 'string' } }, observations: { type: 'string' }, suspects: { type: 'string' }, files: { type: 'array', items: { type: 'string' } } }, required: ['runs', 'observations', 'suspects', 'files'] },
    checks: CHECKS.properties.checks, appBugs: CHECKS.properties.appBugs, catalogIssues: CHECKS.properties.catalogIssues, phoneState: { type: 'string' },
  },
  required: ['warp', 'checks', 'appBugs', 'catalogIssues', 'phoneState'],
}
const WARP = `warp-first-hit-freeze (minor; rounds 8, 10, 11, 12, 14 tried — read ${DATA}/fix-loop12.json timing 'warp' and ${DATA}/fix-loop14.json 'warp' and their reviews first). The first warp of a game on the receiver freezes the whole screen ~150 ms after the dim/banner start, then the banner and the overlay jump to near full strength; the second warp is smooth. Below are perfetto/framestats measurements from APK 20 (3 runs sound on, 3 sound off). Name the cause from the slices (or say exactly what they rule out). Fix only what the evidence supports; if it points at a native first-time cost you cannot remove, pay it earlier (during the existing warm-up / standby, after GO!, never under the count) and say so. Regression test for the mechanism.`
const fixesP = parallel(AREAS.map((a) => () => fixArea(a)))
const phoneP = (async () => {
  const m = await agent(MEASURE, { label: 'phones:warp-trace+fixcheck-loop14', phase: 'Phone check', schema: MEASURED15 })
  const warp = m ? await fixArea({ key: 'warp', items: WARP + '\n\nMEASUREMENTS:\n' + JSON.stringify(m.warp) }) : null
  return { check: m, warp }
})()
const [fixes, phones] = await Promise.all([fixesP, phoneP])
return { fixes: (fixes || []).filter(Boolean), ...phones }
