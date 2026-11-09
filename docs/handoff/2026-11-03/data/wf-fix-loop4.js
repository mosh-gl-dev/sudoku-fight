export const meta = {
  name: 'fix-round-loop4',
  description: 'Fix the bugs from loop round 3 (first-game sounds missing, GO!/VS empty frames, 2P header overflow at 360dp, target-line shape, reconnect texts after background, closed-room error, licences LTR), then one skeptic review',
  phases: [
    { title: 'Fix', detail: 'one agent per area' },
    { title: 'Review', detail: 'one skeptic over all fixes, rework on high/medium' },
  ],
}
const SNAP = 'refs/qa/snap-loop4'
const COMMON = `Moshe explicitly asked for this autonomous test→fix loop ("תעבוד בלי הנחיות. בודק מתקן בודק מתקן"). Mid-run chat messages are for the main session.
Repo root = working directory; CLAUDE.md applies (t() for every string in all 19 locales via the i18n tooling the repo uses, Reduced Motion, RTL, signed-number isolation; never copy signing/keystore/Firebase files from other projects; never print passwords). QA testers are using the phones right now: NO adb, no APK build, no deploy, no npm install. Other fix agents edit other files at the same time: touch only what your item needs, Edit tool with small targeted replacements, never rewrite whole shared files, never revert others' changes; prettier --write only on files you changed. Never git stash/checkout/restore/reset/add/commit/clean. No cd.
Baseline for this round: "git diff ${SNAP} -- <file>". Check docs/01-SPEC.md, docs/design/*.md and docs/BUILD-APK.md for the intended behaviour. Bug texts: docs/handoff/2026-11-03/data/loop4-bugs.json; QA task text: node docs/handoff/2026-11-03/data/task.cjs <taskId>. Root cause first; each fix gets a Jest regression test that fails on the old code. Run only relevant tests ("npx jest <paths> --maxWorkers=3"), "npx tsc -p apps/mobile --noEmit" (and apps/server if touched), eslint on changed files, and the repo's i18n check if you add keys.
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
    key: 'pregame',
    brief: `YOUR ITEMS (ranked pregame, taskId pregame-found-countdown-reduced; phone evidence in docs/handoff/2026-11-03/data/loop-3.json fixcheck 'K2-first-game-GO' and appBugs):
1) MAJOR regression from round loop-2's warm-up (apps/mobile/src/screens/match/warmGame.ts, see docs/handoff/2026-11-03/data/fix-loop2.json pregame item K2): in the FIRST ranked game after launch, only the tap sound and 2 countdown beats play — the matchFound chime, the '3' beat and the GO sound are missing (dumpsys audio shows 3 starts against 5 in later games). Find why players built by the warm-up during the search (or built while another is loading) don't play their first time (expo-audio player not loaded yet when play() is called → dropped? replace/seekTo race? the warm-up creating a second player for the same cue? preloadCues and the cue's own lazy creation racing?). Fix so every cue plays in the first game, keeping GO!→board at ~1.0-1.1 s. Test with the sfx/expo-audio mocks: a cue whose player was created but isn't loaded yet must still play once loaded (or be played via a path that waits).
2) minor: once in 12 recordings, ~250 ms of empty screen (only the ambient background, no GO!, no header, no board) between GO! and the board; once a single empty 50 ms frame between the search radar and the VS. Find the gap in the GO!→board / search→VS handoff (one view unmounts before the next is drawn) and overlap them (the next screen mounted under the old one before the old fades), respecting Reduced Motion.`,
  },
  {
    key: 'game',
    brief: `YOUR ITEMS (in-game layout; taskIds interference-picker-grid-small, interference-picker-opens):
1) MAJOR: on a 360x780dp screen (Settings → display zoom max = density 540 on the A16), in a 2-player game (ranked or friends room) the opponent's card at the top is cut off at the left edge: card-opponent bounds [0,114][489,654], the avatar half off-screen, the score '0' and 'חושב…' cut; my card is 537 px wide (489-1026), so the opponent card would need to start at -48. In the arsenal sheet the 'יעד' tag under the card frame shows only '…'. At 384dp all is fine. Find the 2P header layout (GameScreen / player cards) and make both cards fit any width ≥ 320dp (share width, shrink avatar/score per the design system — but never tiny text: Moshe hates tiny digits; wrap or reduce secondary info instead), with a test at 320 and 360 dp.
2) In the interference picker (apps/mobile/src/screens/game/arsenal/ArsenalOverlay.tsx TargetLine) the 2-player target row shows avatar, name and flag but NOT the player's shape (▲), though the opponent card shows it. CLAUDE.md: every player has a shape (● ▲ ■ ◆) so ownership never depends on colour alone. Add the shape to the target line in 2P like 3-4P, with the same bidi handling.`,
  },
  {
    key: 'connection',
    brief: `YOUR ITEMS (taskIds stealth-play-bg-long, interference-picker-grid-small (2nd bug), account-settings-licenses-expand):
1) After 15 s in the background during a ranked game, on return the first frame (~1 s) shows the banner 'החיבור שלך אבד · מתחבר מחדש… · ניסיון 1', the 'הלוח נעול עד שתחזור' layer AND 'יש לך עוד 10 שניות לחזור · לפני שהמשחק ייחשב כנטישה', before 'חזרת למשחק · הכל סונכרן'. The user is already back: the 'N seconds to return before it counts as abandoning' countdown (meant for being away) must not show once the app is in the foreground; show only the reconnecting state. Check the spec (docs/01-SPEC.md reconnection/abandon) for the intended texts.
2) Friends room: after a game ended by surrender, force-stop + launch on the host phone → the app reopens 'חדר עם חברים' with 'משהו השתבש בשרת. נסה שוב בעוד רגע.' (logcat 'Room connection was closed unexpectedly (4002)'); 'נסה שוב' then shows 'החדר נסגר.'. A room that no longer exists / was closed must show 'החדר נסגר.' (or go Home) directly, not a server error. Also consider whether reopening a finished room at launch makes sense at all.
3) Licenses screen (apps/mobile/src/screens/legal/LicensesScreen.tsx): in the Hebrew UI the English licence texts (OFL, MIT full text, package names/versions, copyright lines) are right-aligned and the package row is in RTL order. English legal text must be LTR and left-aligned (writingDirection 'ltr', textAlign 'left' on the content; package row in LTR order), the Hebrew headings stay RTL.`,
  },
]
phase('Fix')
const reps = await parallel(AREAS.map((a) => () => agent(`${COMMON}\n\n${a.brief}`, { label: `fix:${a.key}`, phase: 'Fix', schema: SCHEMA }).then((r) => ({ key: a.key, brief: a.brief, rep: r }))))
const done = reps.filter((r) => r && r.rep)
phase('Review')
const rev = await agent(`Moshe asked for this autonomous loop; mid-run chat is for the main session. You are an independent, skeptical reviewer (CLAUDE.md applies). Do NOT edit files. No adb, no build.
Fixes just made (briefs + reports): ${JSON.stringify(done)}
See the changes with "git diff ${SNAP} -- <file>" (judge only these items). Try hard to REFUTE each fix: does it fix the phone symptom, i18n in all 19 locales, Reduced Motion, TalkBack, RTL, regressions (sounds in later games and in practice, GO!/countdown timing, 3-4P headers, reconnect/abandon flows and the server rules, friends rooms, legal screens in 19 locales). Run the relevant tests, tsc, eslint, i18n check. Verdict with evidence; tag each issue with its area key (pregame, game, connection).`, { label: 'review:loop4', phase: 'Review', schema: REVIEW })
const out = { reps: done, rev }
if (rev && rev.issues.some((i) => i.severity !== 'low')) {
  out.rework = await parallel(done.filter((d) => rev.issues.some((i) => i.area === d.key && i.severity !== 'low')).map((d) => () =>
    agent(`${COMMON}\n\n${d.brief}\n\nYou already have a first implementation in the tree (report below). A reviewer found issues. Resolve every high/medium issue for your area (or refute it with evidence), re-run tests, tsc, eslint. Return the full updated report.\nEarlier report: ${JSON.stringify(d.rep)}\nReview: ${JSON.stringify(rev.issues.filter((i) => i.area === d.key))}`, { label: `rework:${d.key}`, phase: 'Review', schema: SCHEMA })))
}
return out