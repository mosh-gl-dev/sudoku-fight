export const meta = {
  name: "loop14-fix-check",
  description: "Loop 14: fix results under Reduced Motion, a11y under covers, opponent countdown, first sound-on warp freeze; phone-check loop-13 fixes on APK 19 plus a navigation regression sweep and the dark-box investigation",
  phases: [
    { title: "Fix", detail: "fixer + skeptic + rework" },
    { title: "Phone check", detail: "loop-13 fixes, regression sweep, investigation on APK 19" },
  ],
}
const SNAP = 'refs/qa/snap-loop14'
const DATA = 'docs/handoff/2026-11-03/data'
const S = 'C:/Users/mosheg/AppData/Local/Temp/claude/c--Users-mosheg-Documents-ReactNative-sudoku-fight/4440d2fa-e446-41ad-83db-f79035cdf42c/scratchpad'
const SHOTS = `${S}/qa-shots`
const TODO = 'C:/Users/mosheg/AppData/Local/Temp/claude/b0377245321c840d/6deeb02e-1cd6-480d-8ffd-14ec3cc5da59/scratchpad/todo-whole.txt'

const COMMON = `Moshe explicitly asked for this autonomous test→fix loop ("תעבוד בלי הנחיות. בודק מתקן בודק מתקן"). Mid-run chat messages are for the main session.
Repo root = working directory; CLAUDE.md applies (t() for every string in all 19 locales via the repo's i18n tooling, Reduced Motion, RTL, signed-number isolation; never copy signing/keystore/Firebase files from other projects; never print passwords or tokens). QA testers are using the phones right now: NO adb, no APK build, no deploy (server code changes are fine), no npm install. Other agents edit other files at the same time: touch only what your items need, Edit tool with small targeted replacements, never rewrite whole shared files, never revert others' changes; prettier --write only on files you changed. Keep LF line endings: before you finish, check every file you changed has no \r (convert CRLF→LF; a CRLF docs/design/motion.md broke the docs tests last round). Never git stash/checkout/restore/reset/add/commit/clean. No cd.
Baseline for this round: "git diff ${SNAP} -- <file>". Intended behaviour: docs/01-SPEC.md, docs/00-original-spec-v1.md (wins on conflict), docs/design/*.md. Bug texts: ${DATA}/fixcheck-apk18.json (and older fixcheck-apk17.json) (appBugs and checks, by id; screenshots under ${SHOTS}). Earlier rounds: ${DATA}/fix-loop8.json, ${DATA}/fix-loop9.json, ${DATA}/fix-loop10.json, ${DATA}/fix-loop11.json, ${DATA}/fix-loop12.json, ${DATA}/fix-loop13.json (use each area's final/rework) — read what they changed for the same feature first.
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
Phones (USB, Samsung A16 SM-A165F, Android 16, 1080x2340, Hebrew): RF8Y60PP2XZ = "טלפון 1" (אורי, level 9), RF8Y30L038L = "טלפון 3" (אחוותא). Both run APK 19 (1.1.0, loop-13 fixes) — check ${S}/latest-build.json vs ${S}/installed-<serial>.txt and install -r the latest if they differ (then update the txt). Staging has the matching server. The stealth bot is ON on staging (a lone search gets a persona); use the two phones against each other where two players are needed.
Tools: npx tsx apps/server/scripts/adb.ts --device <serial> ui|tap|swipe|type|key|shot <file>|launch|stop|reset; raw adb always with -s <serial> (Git Bash: MSYS_NO_PATHCONV=1 for /sdcard paths); logcat -d only (NEVER -c). Screenshots under ${SHOTS}.
NEVER: uninstall, clear data, 'adb logcat -c', sign out, delete account, rename, switch accounts, log in, adb reverse. Typing ASCII only. Restore every setting you change (font scale, wm size/density, animations, locale, airplane, show_touches). At the end: adb.ts reset on both, app locale he, relaunch, leave on Home. Max ~12 min per item; stuck → untested with the reason. Never cd. Don't edit code.`
const AREAS = [
  {
    key: 'results-a11y',
    items: `1) results-reduced-motion-late-cards-and-count (minor, REGRESSION from the loop-12 full-board fix, ${DATA}/fixcheck-apk18.json appBugs): phone 1 with the system animations at 0 (animator, transition, window scales), ranked full-board loss: after the fade only the hero shows; the opponent and rating cards fade in ~0.8 s later and the 'משחק חדש' / 'צפייה חוזרת' bar ~1.9 s later; ~1.2 s after the results the content jumps ~60 dp up (a scroll with no animation) and the rating number counts 1030 → 1021 over ~0.7 s. With Reduced Motion (in-app or the system's), nothing should move: the whole results show at once (or within ~200 ms of the hero), no auto-scroll jump, the new rating shown at once (motion.md Reduced Motion forms). Likely: useStackEntered waits for a transitionStart/End that never fires when the system animations are off → the 1500 ms fallback; and the RM gates of the reveal/count read only the in-app setting. Fix both, tests for both (RM via the app's motion policy hook, including the system setting).
2) a11y-game-nodes-under-error-cover (minor, appBugs): on 'לא חזרת למשחק בזמן' (the connection-error cover over the game) uiautomator lists the whole game first (player cards, 'כניעה', 'תגובות', all 81 cells, the keypad), then the error's title, code and buttons; the same under the 'אחוותא עזב את המשחק · ניצחת בנטישה' dialog on the winner's phone. TalkBack users reach the dead board before the message. Hide the covered game from accessibility while a full cover or a modal dialog is up (importantForAccessibility='no-hide-descendants' / accessibilityElementsHidden on the game root, or accessibilityViewIsModal on the cover), and check the other covers/dialogs on the game screen (surrender confirm, opponent left, connection states, GoCover). Tests.
3) opponent-countdown-stops-at-1 (cosmetic, appBugs; catalog task network-abandon-countdown, ½ open): on the winner's phone 'היריב מתנתק…' counts 15 → 1, then straight to the 'עזב את המשחק · ניצחת בנטישה' dialog, with no '0' and no 'הזמן נגמר · בודקים מול השרת…' (the self side now shows that text, loop 12). Read the spec (abandonment, reconnect window) and the loop-12 SelfReconnecting change; make the opponent side consistent (e.g. after 1, 'הזמן נגמר · בודקים מול השרת…' until the server's verdict), or, if the spec says the jump is right, say so in notes with the line.`,
  },
  {
    key: 'warp',
    items: `warp-first-hit-150ms-freeze (minor, appBugs; 4th round on this — read ${DATA}/fix-loop10.json, fix-loop11.json, fix-loop12.json timing 'warp', measure-apk17.json B and fixcheck-apk18.json): after loop 12 the surfaces are fine (the standby TextureView is made ~2 s after the board; none at the hit), and with SOUND OFF the first warp now starts together and fades smoothly. With SOUND ON, the FIRST warp of a game: dim + faint banner at 1502 ms, faint overlay at 1536, then the WHOLE screen is frozen ~150 ms (identical frames 1553–1689, the score animation stuck too), then banner and overlay jump to near full strength at 1706. The second warp in the same game is smooth. So the remaining cost is sound-on and first-time only: most likely the first play() of the warp's hit cue (expo-audio play on Android runs blocking on the UI thread; the warm-up builds players but a first real play may still allocate the AudioTrack), or the first use of a sound-specific path. Make the first sound-on warp as smooth as the second: e.g. prime each hit cue's player with a silent/muted play during the existing warm-up so the AudioTrack exists, or start the cue off the UI-thread-critical frame (after the visual's first frames, still within ~100 ms), or anything the code shows is the first-time cost. Respect the sound setting (sound off → nothing built). Test the mechanism (the order/priming), and give a deviceCheck.`,
  },
]
const PHONE = `${TESTER}
Your job: (I) confirm on the phones that each loop-13 fix works; (II) a regression sweep of navigation, because loop 13 changed how the app rebuilds the navigation stack after a recreated activity (apps/mobile/src/game/flowStack.ts, app/+native-intent.tsx, auth/useAuthGate.ts) and how the friends room hands GO! to the game (push + GoCover); (III) one investigation.
Input: ${DATA}/fix-loop13.json — 'fixes' (rooms) and 'gohold'; for each use final; each item has a deviceCheck — follow it.
(I-1) cancel-after-recreate-skips-type-screen: its deviceCheck A–D (cancel after a density change lands on 'סוג משחק'; back → 'משחק חדש' → Home; a match found after a recreation opens the game and results ONCE; friends room after a density reset; mid-game density change, surrender, Home → שחק works).
(I-2) go-hold-joiner: phone 3 cold start joiner, sound off ×2 and on ×1; record both phones at ≤20 ms: GO! → board on both (target ≤ 1.0 s; it was 1.1–1.34 s on APK 18); no empty frame, no faded '1', the count's first frame has the avatars; Back during GO! does nothing; logcat '[friends] GO! shown…' lines.
(I-3) friends-room-spinner-after-game: host stays on results while the guest leaves; wait ≥ 2.5 min; the host never shows a bare spinner; if the room is gone, 'החדר נסגר.' with 'צור חדר' / 'לבית' works.
(II) Regression sweep, both phones, Hebrew, ~25 min total: Home tabs (בית, היסטוריה, דירוג, פרופיל/הגדרות), practice vs a bot to the end and 'עוד סיבוב', solo practice, levels (open a played level and back to the map), ranked 2P between the phones to the end → results → replay → back → 'משחק חדש' → cancel; friends room to the end → results → 'לבית'; Android Back on every screen goes where it should (no exit from the app mid-flow, no double screens); one density change on Home and one on the levels map (the app comes back where it was, back works). Anything wrong → appBugs.
(III) stale-dark-box-after-countdown-reconnect investigation: follow the item's deviceCheck in fix-loop13.json rooms (Developer options 'Show surface updates' and 'Show GPU view updates' ON — restore them OFF at the end; phone 3 at wm density 540; friends room; airplane 2 s on phone 3 during '3'); 3 runs plus once without the airplane step and once with Reduced Motion; report what you see with screenshots and SurfaceFlinger/gfxinfo output.
Screenshots fix14-<serial>-<id>-<n>.png. For each check also re-test the run #2 task named in it when that task is currently fail/partial ("npx tsx apps/server/scripts/qa.ts task 2 <taskId>"): every expected line seen → "qa.ts fix 2 <taskId> --fix-note-file <f> --fixed-in apk19" (Hebrew note, 2–4 lines); otherwise mark it again with --actual-file describing what happens NOW.
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
const checkP = agent(PHONE, { label: 'phones:fixcheck-loop13+sweep', phase: 'Phone check', schema: CHECKS })
const [fixes, check] = await Promise.all([fixesP, checkP])
return { fixes: (fixes || []).filter(Boolean), check }
