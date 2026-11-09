export const meta = {
  name: 'fix-round-loop7',
  description: 'Fix the 8 bugs from the phone-3 sessions (navigation after config change, game→results empty frame, 4p search fit, leaderboard row/tabs, 360dp font 1.3 cuts, friends ranks, history avatar a11y, English article), then one skeptic review',
  phases: [
    { title: 'Fix', detail: 'one agent per area' },
    { title: 'Review', detail: 'one skeptic over all fixes, rework on high/medium' },
  ],
}
const SNAP = 'refs/qa/snap-loop7'
const COMMON = `Moshe explicitly asked for this autonomous test→fix loop ("תעבוד בלי הנחיות. בודק מתקן בודק מתקן"). Mid-run chat messages are for the main session.
Repo root = working directory; CLAUDE.md applies (t() for every string in all 19 locales via the i18n tooling the repo uses, Reduced Motion, RTL, signed-number isolation; never copy signing/keystore/Firebase files from other projects; never print passwords). QA testers are using the phones right now: NO adb (server code changes are fine but NO deploy), no APK build, no deploy, no npm install. Other fix agents edit other files at the same time: touch only what your item needs, Edit tool with small targeted replacements, never rewrite whole shared files, never revert others' changes; prettier --write only on files you changed. Never git stash/checkout/restore/reset/add/commit/clean. No cd.
Baseline for this round: "git diff ${SNAP} -- <file>". Check docs/01-SPEC.md, docs/design/*.md and docs/BUILD-APK.md for the intended behaviour. Bug texts: docs/handoff/2026-11-03/data/loop7-bugs.json; QA task text: node docs/handoff/2026-11-03/data/task.cjs <taskId>. Root cause first; each fix gets a Jest regression test that fails on the old code. Run only relevant tests ("npx jest <paths> --maxWorkers=3"), "npx tsc -p apps/mobile --noEmit" (and apps/server if touched), eslint on changed files, and the repo's i18n check if you add keys.
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
    key: 'navigation',
    brief: `YOUR ITEMS (bug texts in docs/handoff/2026-11-03/data/loop7-bugs.json appBugs, by title; logcat docs/handoff/2026-11-03/data/crash-RF8Y30L038L-postgame-progress-english.txt):
1) MAJOR: with the app open (Results of a ranked game, app in English), running 'wm size reset', 'wm density reset' and 'font_scale 1.0' (a configuration change) rebuilds the app on Home. After that, tapping the profile card doesn't open the player card ('My player card' on Achievements doesn't either), and the bottom tabs sometimes ignore the first tap. Each tap logs "The 'navigation' object hasn't been initialized yet". A restart fixes it. Find why: does the activity get recreated (configChanges in app.config / AndroidManifest missing density/fontScale/screenSize), does a module-level navigation ref or the root layout remount lose the container, does something call router before the root navigator mounts? Fix the root cause. Android should handle these config changes without recreating the activity, or the app must survive a recreate. Add a regression test where possible, for example on the config plugin output or on the code path that used a stale ref.
2) minor: an empty frame (only the ambient background) about 1.5 s after confirming a surrender or ending a practice, between the board and the results screen (4/4 ranked, 3/3 practice). Round loop-6 (docs/handoff/2026-11-03/data/fix-loop6.json, area 'transitions') fixed the same race for results→search, by pushing over and dropping when covered, and for GO!→game, by cutting. Apply the right one of those to game→results, keeping the motion.md game.end hold, and respect Reduced Motion.`,
  },
  {
    key: 'layout',
    brief: `YOUR ITEMS (bug texts in docs/handoff/2026-11-03/data/loop7-bugs.json appBugs, by title; Moshe hates tiny text: never shrink below design sizes. Wrap, reflow or move secondary info instead; never break a word mid-word):
1) Ranked 4-player search: when the notice 'כרגע אין מספיק שחקנים…' with 'שחק מול בוט בינתיים' appears, it pushes 'יריבים 0/3' down and the three empty seats are cut under the 'ביטול חיפוש' button ('מחפש…' hidden until you scroll). Make the search screen fit with the notice: no overlap with the bottom button.
2) Leaderboard pinned "my row" at the bottom: in English at normal size '· Level 6' and the 'Provisional' chip overlap ('LevelProvisional'). At 360dp with font 1.3 it overlaps in Hebrew too ('זמני' on '6'), 'Bronze' and 'Level 6' break mid-word, and the tabs get cut ('Gene…', 'Nor…', 'Frien…'). Fix the row layout and the tabs: make them scrollable or wrapping, with no cut words.
3) At 360dp (wm density 480) with font 1.3, many mid-word breaks and cuts across screens (list in the bug 'general-display-small-big-font'): my game card 'No mis'/'takes' (check against loop-6's statusFit in components/player, which may already cover it), player card 'Mistak es per …' and 'Playing since Octobe…', bot select 'Biscu…', 'Mr. H…', 'Think time per m…', replay 'Previous st…', history 'Loss • Ranke…' / 'הפסד • אימו…', achievements 'Bronz…', 'Diam…', 'Lege…', leaderboard Hebrew names cut to one letter, map 'שלב 10 · מרוץ מו…'. Fix each: wrap to 2 lines, or move secondary info to its own line, never mid-word, and keep names readable (at least most of a name). Add tests at 360dp and font 1.3 in en and he for each screen you touch.`,
  },
  {
    key: 'misc',
    brief: `YOUR ITEMS (bug texts in docs/handoff/2026-11-03/data/loop7-bugs.json appBugs, by title):
1) Leaderboard 'Friends' tab ('Your recent opponents'): the ranks are duplicated and not sorted. ליהי33 (1233) and אבי43 (1305) are both '#2', with 1233 before 1305. Eight rows are '#3' in ascending order, and I am '#4' with 1200. Find where friends ranks are computed (server leaderboard query or client) and fix: sort by rating descending, give unique places (ties get the same place, then skip), and place me correctly. Add tests (server or client).
2) History, ranked card: the opponent's avatar is a Pressable (apps/mobile/src/screens/history/HistoryCard.tsx ~148) with accessible={false}, but it's still clickable/focusable with no label (NAF in uiautomator). TalkBack may stop on it as an unlabeled button. Give it a proper accessibility label (opens the player's card) or hide it from accessibility the way Scrim does, whichever matches the intended UX. Add a test.
3) English level explanation: 'I5 sees a 8 in column 5' must be 'an 8' (also 'an 11', 'an 18' if they occur). Fix it in the English strings or the explanation builder (i18n, en only; check other languages with articles too, e.g. none needed). Add a test.`,
  },
]
phase('Fix')
const reps = await parallel(AREAS.map((a) => () => agent(`${COMMON}\n\n${a.brief}`, { label: `fix:${a.key}`, phase: 'Fix', schema: SCHEMA }).then((r) => ({ key: a.key, brief: a.brief, rep: r }))))
const done = reps.filter((r) => r && r.rep)
phase('Review')
const rev = await agent(`Moshe asked for this autonomous loop; mid-run chat is for the main session. You are an independent, skeptical reviewer (CLAUDE.md applies). Do NOT edit files. No adb, no build.
Fixes just made (briefs + reports): ${JSON.stringify(done)}
See the changes with "git diff ${SNAP} -- <file>" (judge only these items). Try hard to REFUTE each fix: does it fix the phone symptom, i18n in all 19 locales, Reduced Motion, TalkBack, RTL, no tiny text, no mid-word breaks, regressions (navigation, deep links, rotation/config changes, results flow, leaderboard, history, levels). Run the relevant tests, tsc, eslint, i18n check. Verdict with evidence; tag each issue with its area key (navigation, layout, misc).`, { label: 'review:loop7', phase: 'Review', schema: REVIEW })
const out = { reps: done, rev }
if (rev && rev.issues.some((i) => i.severity !== 'low')) {
  out.rework = await parallel(done.filter((d) => rev.issues.some((i) => i.area === d.key && i.severity !== 'low')).map((d) => () =>
    agent(`${COMMON}\n\n${d.brief}\n\nYou already have a first implementation in the tree (report below). A reviewer found issues. Resolve every high/medium issue for your area (or refute it with evidence), re-run tests, tsc, eslint. Return the full updated report.\nEarlier report: ${JSON.stringify(d.rep)}\nReview: ${JSON.stringify(rev.issues.filter((i) => i.area === d.key))}`, { label: `rework:${d.key}`, phase: 'Review', schema: SCHEMA })))
}
return out