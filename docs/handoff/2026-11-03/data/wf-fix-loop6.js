export const meta = {
  name: 'fix-round-loop6',
  description: 'Fix the 6 minor bugs from the apk10 fix check (GO!/Results handoff empty frames, first tap sound, 2P header in English at 360dp, target chip under scrim, licence line breaks), then one skeptic review',
  phases: [
    { title: 'Fix', detail: 'one agent per area' },
    { title: 'Review', detail: 'one skeptic over all fixes, rework on high/medium' },
  ],
}
const SNAP = 'refs/qa/snap-loop6'
const COMMON = `Moshe explicitly asked for this autonomous test→fix loop ("תעבוד בלי הנחיות. בודק מתקן בודק מתקן"). Mid-run chat messages are for the main session.
Repo root = working directory; CLAUDE.md applies (t() for every string in all 19 locales via the i18n tooling the repo uses, Reduced Motion, RTL, signed-number isolation; never copy signing/keystore/Firebase files from other projects; never print passwords). QA testers are using the phones right now: NO adb, no APK build, no deploy, no npm install. Other fix agents edit other files at the same time: touch only what your item needs, Edit tool with small targeted replacements, never rewrite whole shared files, never revert others' changes; prettier --write only on files you changed. Never git stash/checkout/restore/reset/add/commit/clean. No cd.
Baseline for this round: "git diff ${SNAP} -- <file>". Check docs/01-SPEC.md, docs/design/*.md and docs/BUILD-APK.md for the intended behaviour. Bug texts: docs/handoff/2026-11-03/data/loop6-bugs.json; QA task text: node docs/handoff/2026-11-03/data/task.cjs <taskId>. Root cause first; each fix gets a Jest regression test that fails on the old code. Run only relevant tests ("npx jest <paths> --maxWorkers=3"), "npx tsc -p apps/mobile --noEmit" (and apps/server if touched), eslint on changed files, and the repo's i18n check if you add keys.
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
    key: 'transitions',
    brief: `YOUR ITEMS (phone evidence in docs/handoff/2026-11-03/data/loop6-bugs.json: appBugs 1, 2, 5 and checks apk10-go-to-board-no-empty-frame / apk10-sounds-first-ranked; earlier work in docs/handoff/2026-11-03/data/fix-loop4.json, area 'pregame', GoCover.tsx):
1) In 3 of 4 ranked games (motion on), there is still an empty run of about 80 ms (5 frames with only the ambient background) at the switch from the match screen's count GO! to the game route's GO! cover (apps/mobile/src/screens/match/GoCover.tsx, apps/mobile/app/game.tsx). It comes about 0.55 s after GO! first shows. So the route's first frame is not drawn in the same frame the match screen leaves. Find the real gap: the native stack transition (animation 'none'/'fade'?), the match screen unmounting before the new route's first draw, or GoCover's first frame waiting for something. Make the old GO! stay on screen until the new one is drawn: keep the match screen's GO! under the new route, or use an opaque transition with no frame between. Respect Reduced Motion.
2) Empty frames between Results ('משחק חדש') and the search screen: the same kind of handoff gap. Find it and overlap the two screens.
3) The first ui_tap after a cold start ('שחק') and the first cell_select in the first game are still silent (sfx.ts FIRST_PLAY_AT_S warm-up from loop 4 fixed the countdown cues only). Find why the first play of a player that was never played is dropped: an expo-audio player not loaded yet? Preload and warm up the tap/select cues at app start (silently), so the first real play is heard. Add a Jest test with the audio mocks.`,
  },
  {
    key: 'header',
    brief: `YOUR ITEMS (phone evidence in docs/handoff/2026-11-03/data/loop6-bugs.json: appBugs 3, 4 and check apk10-2p-header-360dp; earlier work in docs/handoff/2026-11-03/data/fix-loop4.json, area 'game'):
1) 2P game header at 360dp (wm density 540) in ENGLISH: 'No mistakes' breaks mid-word, 'Interfere' shrinks to tiny text (Moshe hates tiny text), and the VS badge covers the opponent's flag. Make the 2P header fit at 320–360 dp in every layout language without mid-word breaks and without shrinking text below design sizes: reflow (secondary info on its own line, shorter labels via existing i18n keys, icon-only for the interfere button with an accessibility label), and keep VS clear of the flag. Test at 320 and 360 dp in en, de, ru, he.
2) In the arsenal (interference picker) the 'יעד' chip on the opponent's frame is half covered by the scrim. The chip must be fully above the scrim (z-order, or place it inside the highlighted frame).`,
  },
  {
    key: 'licences',
    brief: `YOUR ITEM (docs/handoff/2026-11-03/data/loop6-bugs.json appBug 6, task account-settings-licenses-expand): the licence texts on the licences screen (apps/mobile/src/screens/legal/LicensesScreen.tsx and its data) keep 80-column hard line breaks, so the lines are ragged on a phone. Reflow the text: join the single newlines inside a paragraph into spaces, and keep blank-line paragraph breaks and list or indented lines (numbered clauses, the MIT/OFL headings). Do this at build time in the licence generator, or at render. Keep LTR. Test it with a sample OFL/MIT text.`,
  },
]
phase('Fix')
const reps = await parallel(AREAS.map((a) => () => agent(`${COMMON}\n\n${a.brief}`, { label: `fix:${a.key}`, phase: 'Fix', schema: SCHEMA }).then((r) => ({ key: a.key, brief: a.brief, rep: r }))))
const done = reps.filter((r) => r && r.rep)
phase('Review')
const rev = await agent(`Moshe asked for this autonomous loop; mid-run chat is for the main session. You are an independent, skeptical reviewer (CLAUDE.md applies). Do NOT edit files. No adb, no build.
Fixes just made (briefs + reports): ${JSON.stringify(done)}
See the changes with "git diff ${SNAP} -- <file>" (judge only these items). Try hard to REFUTE each fix: does it fix the phone symptom, i18n in all 19 locales, Reduced Motion, TalkBack, RTL, no tiny text, regressions (ranked flow search→VS→count→game→results→new search, sounds in all games and practice, 3-4P headers, arsenal, legal screens). Run the relevant tests, tsc, eslint, i18n check. Verdict with evidence; tag each issue with its area key (transitions, header, licences).`, { label: 'review:loop6', phase: 'Review', schema: REVIEW })
const out = { reps: done, rev }
if (rev && rev.issues.some((i) => i.severity !== 'low')) {
  out.rework = await parallel(done.filter((d) => rev.issues.some((i) => i.area === d.key && i.severity !== 'low')).map((d) => () =>
    agent(`${COMMON}\n\n${d.brief}\n\nYou already have a first implementation in the tree (report below). A reviewer found issues. Resolve every high/medium issue for your area (or refute it with evidence), re-run tests, tsc, eslint. Return the full updated report.\nEarlier report: ${JSON.stringify(d.rep)}\nReview: ${JSON.stringify(rev.issues.filter((i) => i.area === d.key))}`, { label: `rework:${d.key}`, phase: 'Review', schema: SCHEMA })))
}
return out