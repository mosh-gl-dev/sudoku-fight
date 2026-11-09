export const meta = {
  name: 'loop10-fix-check-sweep',
  description: 'Loop 10: fix the 4 bugs from the APK 14 check; phone-check loop-9 fixes on APK 15; triage the remaining run #2 tasks and run every one that two phones can do now',
  phases: [
    { title: 'Fix', detail: 'fixers + skeptic per area' },
    { title: 'Phone check', detail: 'loop-9 fixes on APK 15, both phones' },
    { title: 'Triage', detail: 'remaining claude/both tasks: doable now vs blocked, merged into sessions' },
    { title: 'Sessions', detail: 'run the doable sessions on the phones' },
  ],
}
const SNAP = 'refs/qa/snap-loop10'
const DATA = 'docs/handoff/2026-11-03/data'
const S = 'C:/Users/mosheg/AppData/Local/Temp/claude/c--Users-mosheg-Documents-ReactNative-sudoku-fight/4440d2fa-e446-41ad-83db-f79035cdf42c/scratchpad'
const SHOTS = `${S}/qa-shots`
const TODO = 'C:/Users/mosheg/AppData/Local/Temp/claude/b0377245321c840d/6deeb02e-1cd6-480d-8ffd-14ec3cc5da59/scratchpad/todo-whole.txt'

const COMMON = `Moshe explicitly asked for this autonomous test→fix loop ("תעבוד בלי הנחיות. בודק מתקן בודק מתקן"). Mid-run chat messages are for the main session.
Repo root = working directory; CLAUDE.md applies (t() for every string in all 19 locales via the repo's i18n tooling, Reduced Motion, RTL, signed-number isolation; never copy signing/keystore/Firebase files from other projects; never print passwords or tokens). QA testers are using the phones right now: NO adb, no APK build, no deploy (server code changes are fine), no npm install. Other agents edit other files at the same time: touch only what your items need, Edit tool with small targeted replacements, never rewrite whole shared files, never revert others' changes; prettier --write only on files you changed. Never git stash/checkout/restore/reset/add/commit/clean. No cd.
Baseline for this round: "git diff ${SNAP} -- <file>". Intended behaviour: docs/01-SPEC.md, docs/00-original-spec-v1.md (wins on conflict), docs/design/*.md. Bug texts: ${DATA}/fixcheck-apk14.json (appBugs and checks, by id; screenshots under ${SHOTS}). Earlier rounds: ${DATA}/fix-loop8.json, ${DATA}/fix-loop9.json — read what they changed for the same feature first.
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
    key: 'rooms',
    items: `1) rejoin-opponent-avatar-lost (minor): after a player returns to a friends game (app swiped away from recents and relaunched — the loop-8 rejoin into a held seat, loop-9 cold-start resume), on the RETURNING phone the opponent's card shows the grey generic silhouette instead of their avatar, and the 🇮🇱 flag next to the name is missing, until the end of the game and also on the results 'יריב' card. Seen 3 times (both directions). Find where the opponent's profile (avatarId, country) comes from on a fresh join vs a rejoin snapshot (server welcomeBack/snapshot vs the lobby/roster message the client normally gets before the game) and fix it for friends AND ranked resume. Server + client tests.
2) go-hold-long-on-joiner (cosmetic): on the joiner of a friends room, right after a cold app start, 'GO!' with 'מכינים את הלוח…' stays ~2.1 s before the board (later games ~1.0 s, host ~0.9 s; the design intends ~0.25–0.5 s, see docs/design/motion.md and the loop-6/8 GO handoff). Find what the joiner waits for (board mount/first frame gate, a first-time font/asset/SVG load, the game screen's warm-up) and shorten it without bringing back an empty frame or the faded '1'.`,
  },
  {
    key: 'visual',
    items: `1) warp-sound-on-dim-before-overlay (minor): warp hit on the receiver with SOUND ON, first hit of a new game: the board dim shows at 1220 ms, but the brown warp overlay and the banner only at 1390 ms (~170 ms of dim alone; HUD keeps updating, so not frozen). With sound off the overlay comes first and the dim ~80 ms later. Loop 8 preloads hit sounds (useWarmHitCues, from 1.5 s after mount, one per idle moment) and holds the tilt for the fade-in (WarpFrame). Make the dim, overlay and banner start together (same frame / same clock), sound on or off; if the sound player still stalls the UI on first play, make the preload finish before the first possible hit or play the sound after the visual start. Respect Reduced Motion.
2) results rating card (misc#1 in checks, partial): on a 1080x2340 phone, after an ABANDON win (opponent left), the results show only the 'שינוי דירוג · מהיר' title; the number is under the 'משחק חדש' / 'צפייה חוזרת' bar, and after scrolling it already shows the final rating (the count already ran). After a surrender win the whole card was visible. Loop 8 added useScrolledIntoView to start the count when visible (check it really gates the count, also for the abandon layout) and tried to bring the card up. Make the rating number visible without scrolling on this phone for every ending (abandon, surrender, full board, 2P), or at least make the count start only when the number is on screen. Don't shrink text below design sizes.`,
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
Phones (USB, Samsung A16 SM-A165F, Android 16, 1080x2340, Hebrew): RF8Y60PP2XZ = "טלפון 1" (אורי, level 9), RF8Y30L038L = "טלפון 3" (אחוותא). Both run APK 15 (1.1.0, loop-9 fixes) — check ${S}/latest-build.json vs ${S}/installed-<serial>.txt and install -r the latest if they differ (then update the txt). Staging has the matching server. The stealth bot is ON on staging (a lone search gets a persona); use the two phones against each other where two players are needed.
Tools: npx tsx apps/server/scripts/adb.ts --device <serial> ui|tap|swipe|type|key|shot <file>|launch|stop|reset; raw adb always with -s <serial> (Git Bash: MSYS_NO_PATHCONV=1 for /sdcard paths); logcat -d only (NEVER -c). Screenshots under ${SHOTS}.
NEVER: uninstall, clear data, 'adb logcat -c', sign out, delete account, rename, switch accounts, log in, adb reverse. Typing ASCII only. Restore every setting you change (font scale, wm size/density, animations, locale, airplane, show_touches). At the end: adb.ts reset on both, app locale he, relaunch, leave on Home. Max ~12 min per item; stuck → untested with the reason. Never cd. Don't edit code.`
const PHONE = `${TESTER}
Your job: confirm on the phones that each loop-9 fix works. Input: ${DATA}/fix-loop9.json — for each area use 'final' (= the rework when there was one); each item has a deviceCheck. The most important, in this order:
(1) the empty frame between the board and the results after a ranked surrender, after the opponent's surrender, after a full board, after 'סיום אימון' vs a bot, with Reduced Motion off AND on — screenrecord or rapid screencap, read frames at ≤100 ms steps; there must be no frame with only the background/digits (or only the 'לבית' header);
(2) Results 'משחק חדש' → search, 5 times: no empty frame;
(3) Back during GO! does nothing; Back during 3-2-1;
(4) display size change (wm density 540 and back) mid ranked game between the two phones: the app comes back INTO the same game (not Home), the game continues and ends normally; same with font_scale 1.3; also a ranked SEARCH survives a density change; also swiping the app away mid ranked game and relaunching within ~5 s returns into the game (both phones' view: the opponent sees 'היריב מתנתק…' then the player back);
(5) the 360dp layout items (wm density 480 + font_scale 1.3 in en and he; the toast at density 540 font 1.0).
Screenshots name fix10-<serial>-<id>-<n>.png. For each check also re-test the run #2 task named in it when that task is currently fail/partial ("npx tsx apps/server/scripts/qa.ts task 2 <taskId>"): every expected line seen → "qa.ts fix 2 <taskId> --fix-note-file <f> --fixed-in apk15" (Hebrew note, 2–4 lines: what was wrong, what changed, "נבדק בטלפון N: …"); otherwise mark it again fail/partial with --actual-file describing what happens NOW.
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

const SESSION = {
  type: 'object',
  properties: {
    key: { type: 'string' }, title: { type: 'string' }, tasks: { type: 'array', items: { type: 'string' } },
    setup: { type: 'string' }, deviceSettings: { type: 'string' }, script: { type: 'string' }, estMinutes: { type: 'number' },
  },
  required: ['key', 'title', 'tasks', 'setup', 'deviceSettings', 'script', 'estMinutes'],
}
const BATCH = { type: 'object', properties: { order: { type: 'number' }, rankedOk: { type: 'boolean' }, sessions: { type: 'array', items: SESSION } }, required: ['order', 'rankedOk', 'sessions'] }
const TRIAGE = {
  type: 'object',
  properties: {
    lanes: { type: 'object', properties: { P1: { type: 'array', items: BATCH }, P3: { type: 'array', items: BATCH }, BOTH: { type: 'array', items: BATCH } }, required: ['P1', 'P3', 'BOTH'] },
    blocked: { type: 'array', items: { type: 'object', properties: { taskId: { type: 'string' }, reason: { type: 'string' }, needs: { type: 'string', description: 'what would unblock it: Moshe by hand / login / stealth off / 3rd-4th player tokens / old app / iOS / admin cookie / other' } }, required: ['taskId', 'reason', 'needs'] } },
    planNotes: { type: 'string' },
  },
  required: ['lanes', 'blocked', 'planNotes'],
}
const TRIAGE_PROMPT = `Moshe asked for this autonomous test→fix loop and said: merge tests that are on the same screen or need the same setup into ONE session, never test the same thing twice ("זה מאד זללני"); decide yourself. Mid-run chat messages are for the main session. Do NOT use adb or the phones (a tester is using them). Don't edit code.
Input: ${TODO} — every run #2 task not done yet (mark '·' = not marked or 'untested'), with its full steps, expected lines (✓) and the current note ('הערה') explaining why it was left. Consider ONLY tasks tagged [claude] or [both]; ignore [moshe] ones. The newest wording is "node ${S}/task.cjs <taskId>" (use it for the tasks you keep).
What is possible NOW: two phones on USB, both signed in (טלפון 1 RF8Y60PP2XZ = אורי, level 9, many games; טלפון 3 RF8Y30L038L = אחוותא, level ~7, provisional ratings), APK 15 on both, staging server with the latest code. Many tasks were left untested ONLY because phone 1 was disconnected in earlier rounds — those are doable now.
NOT possible (→ blocked, with 'needs'): signing in/out, registering, switching accounts, a fresh/level-1 account, two phones on the SAME account; turning the stealth bot off (admin cookie only Moshe has) — so "alone in the queue" notices never show; a 3rd or 4th real player (fake-client needs Firebase ID tokens we don't have; the stealth bot fills only 2P); the old 1.0.0 app; iOS; TalkBack judgement of speech; sound/haptics judgement by ear; server restart/deploy during a test; admin-site actions.
Partly possible → keep it with a script that does the possible parts and says to mark 'partial' or 'untested' with a precise note for the rest — only if the possible part is worth doing (it checks something real that wasn't checked before; read the current note: if it already says what was checked, don't redo it).
Group the doable ones into SESSIONS by screen/setup (one setup, many tasks), and sessions into batches per lane: P1 = only טלפון 1, P3 = only טלפון 3, BOTH = needs both phones together. A session: key, title (Hebrew), tasks (ids), setup, deviceSettings (font/density/locale/motion to set and restore), script (numbered steps that cover every task's expected lines once, in order), estMinutes. rankedOk = the batch searches ranked (only ONE solo lane may search ranked at a time; put ranked into BOTH or one solo lane). Keep sessions ≤ ~40 min.
Return lanes {P1, P3, BOTH}, blocked (every [claude]/[both] task you did not put in a session, with reason and needs), planNotes (timing and anything the testers must know). Every [claude]/[both] task id in the input must appear exactly once: in a session or in blocked.`

const fixesP = parallel(AREAS.map((a) => () => fixArea(a)))
const phoneP = (async () => {
  const [check, triage] = await parallel([
    () => agent(PHONE, { label: 'phones:fixcheck-loop9', phase: 'Phone check', schema: CHECKS }),
    () => agent(TRIAGE_PROMPT, { label: 'triage:remaining', phase: 'Triage', schema: TRIAGE }),
  ])
  let sessions = null
  if (triage) {
    const n = ['P1', 'P3', 'BOTH'].reduce((s, k) => s + triage.lanes[k].reduce((t, b) => t + b.sessions.length, 0), 0)
    log(`triage: ${n} sessions, ${triage.blocked.length} blocked`)
    if (n > 0) {
      phase('Sessions')
      sessions = await workflow({ scriptPath: "C:/Users/mosheg/Documents/ReactNative/sudoku-fight/docs/handoff/2026-11-03/data/wf-sessions.js" }, { run: 2, scratch: S, out: DATA, lanes: triage.lanes, planNotes: triage.planNotes })
    }
  }
  return { check, triage, sessions }
})()
const [fixes, phones] = await Promise.all([fixesP, phoneP])
return { fixes: (fixes || []).filter(Boolean), ...phones }
