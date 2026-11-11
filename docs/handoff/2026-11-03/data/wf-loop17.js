export const meta = {
  name: "loop17-final-fixes",
  description: "Loop 17 (final): fix the 3 open QA bugs no loop fixed yet: Home offline banner, levels 'למפה' focus, cold-start splash",
  phases: [{ title: "Fix", detail: "fixer + skeptic + rework" }],
}
const SNAP = 'refs/qa/snap-loop17'
const DATA = 'docs/handoff/2026-11-03/data'
const S = 'C:/Users/mosheg/AppData/Local/Temp/claude/c--Users-mosheg-Documents-ReactNative-sudoku-fight/4440d2fa-e446-41ad-83db-f79035cdf42c/scratchpad'
const SHOTS = `${S}/qa-shots`
const TODO = 'C:/Users/mosheg/AppData/Local/Temp/claude/b0377245321c840d/6deeb02e-1cd6-480d-8ffd-14ec3cc5da59/scratchpad/todo-whole.txt'

const COMMON = `Moshe explicitly asked for this autonomous test→fix loop ("תעבוד בלי הנחיות. בודק מתקן בודק מתקן"). Mid-run chat messages are for the main session.
Repo root = working directory; CLAUDE.md applies (t() for every string in all 19 locales via the repo's i18n tooling, Reduced Motion, RTL, signed-number isolation; never copy signing/keystore/Firebase files from other projects; never print passwords or tokens). QA testers are using the phones right now: NO adb, no APK build, no deploy (server code changes are fine), no npm install. Other agents edit other files at the same time: touch only what your items need, Edit tool with small targeted replacements, never rewrite whole shared files, never revert others' changes; prettier --write only on files you changed. Keep LF line endings: before you finish, check every file you changed has no \r (convert CRLF→LF; a CRLF docs/design/motion.md broke the docs tests last round). Never git stash/checkout/restore/reset/add/commit/clean. No cd.
Baseline for this round: "git diff ${SNAP} -- <file>". Intended behaviour: docs/01-SPEC.md, docs/00-original-spec-v1.md (wins on conflict), docs/design/*.md. Bug texts: ${DATA}/fixcheck-apk21.json, ${DATA}/fixcheck-apk20.json (and older fixcheck-apk19.json, fixcheck-apk18.json) (appBugs and checks, by id; screenshots under ${SHOTS}). Earlier rounds: ${DATA}/fix-loop8.json, ${DATA}/fix-loop9.json, ${DATA}/fix-loop10.json, ${DATA}/fix-loop11.json, ${DATA}/fix-loop12.json, ${DATA}/fix-loop13.json, ${DATA}/fix-loop14.json, ${DATA}/fix-loop15.json, ${DATA}/fix-loop16.json (use each area's final/rework) — read what they changed for the same feature first.
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

const AREAS = [
  { key: 'home-offline', items: `account-home-offline (QA run #2 task; read it whole: "npx tsx apps/server/scripts/qa.ts task 2 account-home-offline"): with Home open and online, airplane mode on → no banner 'אין חיבור לאינטרנט / משחקים מדורגים לא זמינים', 'עוד סיבוב' stays active; a tap opens the search with a network error. Only a restart in airplane mode shows the banner. Cause noted: useConnectivityWatch checks only when Home loads and re-checks only while already offline, so online→offline while Home is open is never noticed. Make Home notice going offline within a few seconds while it stays open (NetInfo/AppState/focus/poll — whatever the code base already uses; no battery-heavy polling; respect the existing back-online path), and keep the banner + disabled 'עוד סיבוב' + '· דורש חיבור' exactly as the catalog says. Test it.` },
  { key: 'levels-map', items: `levels-to-map (QA run #2 task; read it whole: "npx tsx apps/server/scripts/qa.ts task 2 levels-to-map"): after replaying an OLDER stage (picked on the map, then 'לשלב הבא' a few times), 'למפה' opens the map on the old pick (e.g. L001 or L008), not on the next stage after the one just played (L008 / L011). Cause noted: LevelMapScreen moves the selection only when currentLevel changes. Expected: 'למפה' from a result opens the map focused on the stage after the one just played (the next one, as the catalog says), stars shown; keep the loop-15 recreate restore (flowStack restoredHomeState, levels/shownResult.ts, the map's 'select' param) working. Test through the real routes if possible.` },
  { key: 'splash', items: `account-open-splash-look (QA run #2 task, FAIL; read it whole: "npx tsx apps/server/scripts/qa.ts task 2 account-open-splash-look"; docs/01-SPEC.md / docs/00-original-spec-v1.md on the opening screen; docs/design/*): on a cold start the Android 12+ system splash (the app icon on dark) covers the app's own designed splash (four shapes ● ▲ ■ ◆, 'SUDOKU FIGHT' / 'סודוקו פייט', 'לוח אחד. כולם פותרים. רק אחד מנצח.', spinner 'טוען את הזירה…', 'טיפ' + tip) for 1.5–2 s, and both disappear together, so the designed splash is never seen and there is no fade to Home. Find how the system splash is held (expo-splash-screen preventAutoHideAsync / hideAsync timing, the root layout's ready gate) and make the order right: the system splash hides as soon as the app's own splash is drawn (its first frame), the designed splash then shows its content while the app loads, and fades to Home (Reduced Motion: no fade or a short cross-fade per motion.md). Do not lengthen the cold start: if loading is already done, a short minimum is OK only if the spec asks for one. Keep the loop-13 startup rules (flowStack, +native-intent, auth gate) and startupGraph tests. Test the order (hideAsync called after the splash's first layout, not at app ready).` },
]
const results = await parallel(AREAS.map((a) => () => fixArea(a)))
return { fixes: results.filter(Boolean) }
