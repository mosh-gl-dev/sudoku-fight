export const meta = {
  name: 'fix-round-4-black-screen-countdown',
  description: 'Fix the black screen after New Game on ranked results, and the ranked countdown/VS/3p-timeout issues; review',
  phases: [
    { title: 'Fix', detail: 'black screen; countdown + VS + 3p timeout' },
    { title: 'Review', detail: 'skeptic per fix' },
  ],
}

const A = args
const SNAP = A.snap
const PEER = 'apps/mobile/scripts/build-apk.mjs, apps/mobile/scripts/lib/build-apk.*, docs/BUILD-APK.md, fly.toml, apps/mobile/app.config.ts, apps/mobile/src/__tests__/appConfig.test.ts, apps/mobile/src/__tests__/buildApk.test.ts, apps/server/src/friends/links.test.ts, docs/MOSHE-TODO.md, docs/FIREBASE-SETUP.md, apps/mobile/scripts/gen-digit-paths.mjs'

const COMMON = `
You are fixing bugs in the Sudoku Fight monorepo (repo root = working directory; CLAUDE.md rules apply).
Context: several fix rounds ran tonight (tree before them: commit ${SNAP}, on no branch; untracked files show as deleted in "git diff ${SNAP}", so compare those with "git show ${SNAP}:<path>"). Round reports (JSON): ${A.fix1}, ${A.fix2}. The phone check that found these bugs: ${A.check} (JSON; look for the ids below in checks/appBugs, and the batch phoneState). Videos/frames: ${A.scratch}/rec/, screenshots ${A.scratch}/qa-shots/.
Phones: Samsung Galaxy A16 (SM-A165F, Android 16), release APK against the staging server (deployed with tonight's server changes: matchmaking FOUND_HOLD_MS hold).
OTHER AGENTS ARE EDITING THE SAME TREE RIGHT NOW (a perf round: History/skeleton, IconButton press, route warm-up, game→results hitch; and a text-fit round). Rules:
1. Touch only what your items need. For any shared file: Edit tool, small targeted replacements, re-read right before each edit; never rewrite a whole file with a script; never run prettier/eslint --fix on directories or files you didn't change; never format locale JSON.
2. Never git stash/checkout/restore/reset/add/commit/clean. Never revert others' changes. Never edit peer-session files: ${PEER}.
3. No "cd" in Bash. No APK build, no deploy, no adb, no npm install.
4. No hard-coded UI strings (t(), 19 locales). Animations respect reduced motion. iOS and Android both keep working. Server stays authoritative; server changes need server tests.
5. Root cause first; check docs/01-SPEC.md and docs/design/motion.md for intended behaviour. Each fix gets a Jest regression test that fails on the current code. Run only relevant tests ("npx jest <paths> --maxWorkers=2"), then the right tsc (-p apps/mobile / apps/server / packages/protocol) and eslint on changed files. A failure in a file you didn't touch may be another agent mid-edit: re-run later.
Return per item: status (fixed/partial/needs-moshe/cannot-reproduce-in-code), root cause, fix, test, device check (exact steps, what must be seen, with timings); files changed; serverChanged; notes.`

const SCHEMA = {
  type: 'object',
  properties: {
    items: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string' }, rootCause: { type: 'string' }, fix: { type: 'string' }, test: { type: 'string' }, deviceCheck: { type: 'string' } }, required: ['id', 'status', 'rootCause', 'fix', 'test', 'deviceCheck'] } },
    filesChanged: { type: 'array', items: { type: 'string' } },
    serverChanged: { type: 'boolean' },
    notes: { type: 'string' },
  },
  required: ['items', 'filesChanged', 'serverChanged', 'notes'],
}

const BLACK = `${COMMON}

YOUR ITEM (critical): NEW-black-new-game. Reproduced 3 times on both of tonight's builds: on the Results of a RANKED 2-player מהיר game (vs the other phone, and also vs the stealth bot), tap 'משחק חדש'. After ~0.9 s the whole screen turns dark (every pixel luminance 19: no ambient digits, no UI); uiautomator sees only the root views; it stays 20 s to 90+ s. Android Back leaves the app to the launcher; relaunching... (read the full report in the check JSON: appBugs id NEW-black-new-game, and the batch 'two phones 2/3').
Find the root cause: what 'משחק חדש' does after a ranked game (router replace/dismiss, the match/game stack, an online session teardown, the results action pair that was restyled tonight (skew/Slant), the GO_HOLD tick in MatchScreen, Enter parts held under a screen that never focuses, the ambient layer / transparent screens with menus that fade, a modal or Scrim left open, an error boundary rendering nothing). Determine whether tonight's changes caused it (compare with git show ${SNAP}:<path>) or it is older. Reproduce it in a Jest e2e if at all possible (there are ranked e2e tests in apps/mobile/src/__tests__/), fix it, and check the same action from practice and friends results too.`

const MATCH = `${COMMON}

YOUR ITEMS (ranked pre-game flow):
- M1 B37-still: on the new build with the staging server, the ranked countdown still loses its start: '3' is missing whenever reduced motion is OFF (phone vs phone, phone vs bot); with reduced motion ON '3' shows only ~0.45–0.5 s; '2' sometimes 0.3 s; GO! stays 1.3–1.5 s before the board (should be ~0.4 s, motion.md 'go'), with blank frames before GO! and before the board. 'נמצא יריב!' runs 0.3–0.9 s past its 1.2 s server hold, so the switch to the count happens late and tonight's even spread (matchModel.countdownStepOver) doesn't show. Measured with screenrecord at 50 ms frames (${A.scratch}/rec/). Work out the real timeline (server: found → hold → countdown with goAt; client: FoundView exit, MatchScreen countdownSince, useNow 100 ms tick, server-time offset, the reduced-motion vs full-motion branches) and make the count show 3·2·1·GO! with each digit ~1 s and GO! ~0.4 s before the board, in both motion modes. If the server should send the countdown with more lead (e.g. goAt = countdown start + 3 s + GO), change it (authoritative, with tests).
- M2 B43-badges-phone3: on phone 3 (reduced motion off) the VS screen shows 1.8–2.1 s with 'כל השחקנים מוכנים · 2/2' but the 'מוכן' badges (metrics.vs.badgesAtMs = 800 ms) never pop and the avatars don't react; on phone 1 they do. Find why (a setTimeout/withDelay keyed to mount time on a busy JS thread, a held Enter, the ready state arriving before mount, reduced-motion branch confusion via MotionPolicy). Make the badges and reaction reliable.
- M3 NEW-3p-timeout-early: searching alone for 3 players ('כרגע אין מספיק שחקנים'), the search clock showed 0:16 at ~18.5 s, and at ~19–21 s the timeout screen appeared saying '1:00' / 'חיפשנו דקה שלמה' after only ~20 s. Check the client and server search timeout for 3–4 player searches (config, the shown text) and fix whichever is wrong (the text must match the real wait, or the wait must match the spec).
Note: the GAME 2P interference-button clip (B47-lock) is Moshe's decision — don't touch it.`

const reviewOf = (brief, rep, label) => agent(`You are an independent, skeptical reviewer (CLAUDE.md applies). Do not edit files.
An agent just fixed the item(s) below. Brief: ${brief}
Report: ${JSON.stringify(rep)}
See the change with "git diff ${SNAP} -- <file>" (git show ${SNAP}:<path> for untracked files); other agents changed other files tonight, judge only these items. Try hard to REFUTE that the root cause is fixed on a real Android phone against the real server (timings, clock offset, reduced motion on/off, busy JS thread, both players, bots), and look for regressions in practice/friends/levels flows. Run the tests. Verdict ok/issues with evidence.`, { label, phase: 'Review', schema: { type: 'object', properties: { verdict: { type: 'string', enum: ['ok', 'issues'] }, issues: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string', enum: ['high', 'medium', 'low'] }, problem: { type: 'string' }, evidence: { type: 'string' }, suggestion: { type: 'string' } }, required: ['severity', 'problem', 'evidence', 'suggestion'] } }, summary: { type: 'string' } }, required: ['verdict', 'issues', 'summary'] } })

const out = await pipeline(
  [{ key: 'black', brief: BLACK }, { key: 'match', brief: MATCH }],
  (g) => agent(g.brief, { label: `fix:${g.key}`, phase: 'Fix', schema: SCHEMA }),
  async (rep, g) => {
    if (!rep) return { key: g.key, rep: null }
    const rev = await reviewOf(g.brief, rep, `review:${g.key}`)
    if (!rev || !rev.issues.some((i) => i.severity !== 'low')) return { key: g.key, rep, rev }
    const re = await agent(`${g.brief}

An earlier agent implemented a fix (report below; see git diff ${SNAP} -- <file>). A reviewer found issues. Resolve every high/medium issue (or refute with evidence), re-run tests, tsc, eslint. Return the full updated report.
Earlier report: ${JSON.stringify(rep)}
Review: ${JSON.stringify(rev)}`, { label: `rework:${g.key}`, phase: 'Review', schema: SCHEMA })
    return { key: g.key, rep: re || rep, rev, reworked: !!re }
  },
)
return out
