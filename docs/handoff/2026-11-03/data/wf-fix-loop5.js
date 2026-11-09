export const meta = {
  name: 'fix-round-loop5',
  description: 'Fix the 4 minor bugs from round 4 (chips at font 2.0, Provisional chip and recent titles at 1.3, Home XP after reconnect, reduced-motion fire reaction), then one skeptic review',
  phases: [
    { title: 'Fix', detail: 'one agent per area' },
    { title: 'Review', detail: 'one skeptic over all fixes, rework on high/medium' },
  ],
}
const SNAP = 'refs/qa/snap-loop5'
const COMMON = `Moshe explicitly asked for this autonomous test→fix loop ("תעבוד בלי הנחיות. בודק מתקן בודק מתקן"). Mid-run chat messages are for the main session.
Repo root = working directory; CLAUDE.md applies (t() for every string in all 19 locales via the i18n tooling the repo uses, Reduced Motion, RTL, signed-number isolation; never copy signing/keystore/Firebase files from other projects; never print passwords). QA testers are using the phones right now: NO adb, no APK build, no deploy, no npm install. Other fix agents edit other files at the same time: touch only what your item needs, Edit tool with small targeted replacements, never rewrite whole shared files, never revert others' changes; prettier --write only on files you changed. Never git stash/checkout/restore/reset/add/commit/clean. No cd.
Baseline for this round: "git diff ${SNAP} -- <file>". Check docs/01-SPEC.md, docs/design/*.md and docs/BUILD-APK.md for the intended behaviour. Bug texts: docs/handoff/2026-11-03/data/loop5-bugs.json; QA task text: node docs/handoff/2026-11-03/data/task.cjs <taskId>. Root cause first; each fix gets a Jest regression test that fails on the old code. Run only relevant tests ("npx jest <paths> --maxWorkers=3"), "npx tsc -p apps/mobile --noEmit" (and apps/server if touched), eslint on changed files, and the repo's i18n check if you add keys.
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
    key: 'layout',
    brief: `YOUR ITEMS (large font / small screen; taskId levels-new-game-small-phone; bug texts in docs/handoff/2026-11-03/data/loop5-bugs.json items 1 and 3):
1) New game screen at font_scale 2.0 on 360x780dp: the mode-row chips ('ללא דירוג', 'עובד גם בלי אינטרנט', 'שלב 76 • ★ 130', 'גם אופליין' / English) are shorter than their text; the bottom border cuts the glyphs. The chip height looks fixed and doesn't grow with fontScale. Make the chips grow with the text (minHeight, not height; padding), and wrap if needed, never cut.
2) Home in English at font 1.3 on 360dp: the 'Provisional' rating chip breaks mid-word ('Provisiona' / 'l'), and the Recent games titles get '…' ('Practice…', 'Solo pra…'). A word must never break mid-word: let the chip take its intrinsic width (or move it under the rating) and let the titles wrap to 2 lines (numberOfLines 2) or reflow the row. Check all 19 locales' longest strings (German, Russian, Thai). Never shrink text below the design system sizes: Moshe hates tiny text.
Tests: render at fontScale 2.0 / width 360 and assert no fixed heights on the chips, and that the chip and title props allow wrapping.`,
  },
  {
    key: 'home',
    brief: `YOUR ITEMS (bug texts in docs/handoff/2026-11-03/data/loop5-bugs.json items 2 and 4):
1) taskId levels-xp-offline: Home's XP doesn't update while Home stays open when the connection comes back (stayed 1,320 for 20 s after airplane mode off; History → Home then showed 1,380 at once). fix-loop3 (docs/handoff/2026-11-03/data/fix-loop3.json) made startProgress subscribe to useConnectivity and call syncProgressNow() + refreshMyProgress() on offline→online. Find why Home doesn't re-render from that (Home reads a different store/query? refresh before the sync finished? connectivity event not firing on airplane-mode off — NetInfo isInternetReachable null first?). Fix so Home updates within a few seconds while open. Also look at the result screen estimate '+27.5 XP' for 3 new stars vs the server's 30 (10 per star): the client estimate must use the same rule as the server (packages/engine), or not be shown as a number if it can't be exact.
2) taskId avatars-motion-on-game: with Reduced Motion on, the static 🔥 reaction emoji sits right over my avatar's face for ~2 s and when it fades the face is already neutral, so the laugh (apps/mobile/src/avatars/reactions.ts '🔥': laugh, spin) is never seen. Expected (catalog): reduced motion shows the laugh, no spin. Place the static emoji off the face (beside/above the avatar, as the moving version ends) and/or keep the laugh face on until after the emoji fades. Check the other reactions in reduced motion with the same issue.`,
  },
]
phase('Fix')
const reps = await parallel(AREAS.map((a) => () => agent(`${COMMON}\n\n${a.brief}`, { label: `fix:${a.key}`, phase: 'Fix', schema: SCHEMA }).then((r) => ({ key: a.key, brief: a.brief, rep: r }))))
const done = reps.filter((r) => r && r.rep)
phase('Review')
const rev = await agent(`Moshe asked for this autonomous loop; mid-run chat is for the main session. You are an independent, skeptical reviewer (CLAUDE.md applies). Do NOT edit files. No adb, no build.
Fixes just made (briefs + reports): ${JSON.stringify(done)}
See the changes with "git diff ${SNAP} -- <file>" (judge only these items). Try hard to REFUTE each fix: does it fix the phone symptom, i18n in all 19 locales, Reduced Motion, TalkBack, RTL, regressions (Home, New game, levels, XP sync and offline, reactions in game and in rooms, avatars at all sizes). Run the relevant tests, tsc, eslint, i18n check. Verdict with evidence; tag each issue with its area key (layout, home).`, { label: 'review:loop5', phase: 'Review', schema: REVIEW })
const out = { reps: done, rev }
if (rev && rev.issues.some((i) => i.severity !== 'low')) {
  out.rework = await parallel(done.filter((d) => rev.issues.some((i) => i.area === d.key && i.severity !== 'low')).map((d) => () =>
    agent(`${COMMON}\n\n${d.brief}\n\nYou already have a first implementation in the tree (report below). A reviewer found issues. Resolve every high/medium issue for your area (or refute it with evidence), re-run tests, tsc, eslint. Return the full updated report.\nEarlier report: ${JSON.stringify(d.rep)}\nReview: ${JSON.stringify(rev.issues.filter((i) => i.area === d.key))}`, { label: `rework:${d.key}`, phase: 'Review', schema: SCHEMA })))
}
return out