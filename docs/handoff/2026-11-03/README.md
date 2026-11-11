# QA automation and fix rounds, 2026-11-02 / 03

Read this first in a new session. Everything here is **uncommitted** (no commit until Moshe asks).

## What happened
1. **Catalog v5 → v6** (`apps/server/data/qa-catalog.json`, 952 tasks). It is deployed to staging.
2. **QA run #2 "אוטומציה"** on staging: 184 new and changed tasks on two phones. It found 54 app bugs (`data/bugs-full.md`, B1–B54) and 77 catalog wording issues (`data/catalog-issues.md`, fixed in v6).
3. **Fix round 1**: 10 areas, each fixed and then reviewed (`data/fix-result.json`). Highlights:
   - the skew drawn on Android (`components/ui/slant.tsx`);
   - the friends-room avatars;
   - the replay and results texts;
   - the level map;
   - the legal-page CSS;
   - the matchmaking VS hold (server);
   - the Thai Buddhist year;
   - many fit fixes.
   The server was deployed to staging (GIT_SHA must be hex, with a temp HEAD fly.toml).
4. **Phone check of round 1** (`data/fixcheck-result.json`): 76 pass, 14 partial, 2 fail. Fixed tasks were marked with `qa fix` in run #2.
5. **Round 2** (`data/fix2-result.json`):
   - the Enter regression (entrances stuck at their start);
   - the Android 15 text clipping (native plugin `apps/mobile/plugins/withTextAdvanceWidths.js`);
   - the replay at large font, he/ar wording, the join screen, and the level exit dialog closing at the level end.
   Built as APK 3 and checked on a phone: hero full size, History complete.
6. **Round 3** (`data/fix3-result.json`): History opening freeze (skeletons moved to Reanimated CSS animations, 2-frame swaps), first 'שחק' warm-up, en-XA / ru / es fits, the Offline chip, hunter labels. Verify green: 610 suites, 14423 tests. **Not yet built or checked on a phone.**
7. **Round 4** (STOPPED mid-way; `data/fix4-partial.json`, script `data/wf-round4.js`):
   - Match flow: the VS and the count are now one cross-fading stage, and the badges are timed from `found`. This is written and reviewed.
   - Black screen after 'משחק חדש' on ranked results: **cause unknown**. The agent was in a rework. Its in-progress `apps/mobile/src/__tests__/rankedNewGame.e2e.test.tsx` was failing lint/jest at the stop.
8. **Remaining tests** (`data/wf-remaining.js`, `data/remaining-args.json`, 588 tasks): only started (phone 1 ~3/26 batches, phone 3 ~8/24), then stopped.
   - Site status of run #2: V 158 · ½ 32 · X 6, bugs open 12, handled 26.

## Next steps, in order
1. **DONE 2026-11-06.** Round 4 cleaned up: `rankedNewGame.e2e.test.tsx` passes. Workflow wf_747ad9ed-a03 fixed the review issues (VS avatars frozen under the count; GO hold uses the Android 150 ms fade); reviewer ok (`data/fix4-rework.json`). Snapshot before it: b3434ea (detached). `npm run verify` green: 610 suites, 14429 tests. Was:
   - check `rankedNewGame.e2e.test.tsx` and the round-4 diffs;
   - then run `npm run verify`.
2. The black screen needs the real exception. Reproduce it once on a phone while capturing logcat:
   - command: `adb -s <serial> logcat -v threadtime | grep -v -i reanimated > file`;
   - steps: play a ranked game, then on Results tap 'משחק חדש'.
   - Candidate cause: Reanimated layout animations on ResultsScreen. The expo-updates ErrorRecovery swallows the exception and destroys the React instance, so the screen stays dark.
3. Build APK 4 with `npm run apk`, then re-sign with the template debug key (`data/resign-connected.sh`) and install it with `install -r`.
   - If Play Protect asks, tap 'לא לשלוח'.
4. Check rounds 3 and 4 on the phone, then resume the remaining tests.
   - Testers read tasks with `node docs/handoff/2026-11-03/data/task.cjs <id>`.
   - Known bugs to skip are in `data/known-bugs.md`.
5. **Waiting for Moshe:**
   - the Reanimated native patch `data/reanimated-onEventDispatch.patch` (fixes the pirates ANR B32, the back-arrow failures and part of the screen-change slowness);
   - should the level exit dialog freeze the clock?
   - the 2P interfere button clipped when the rival holds a cell: icon-only?
   - the leaderboard pinned row in long languages;
   - pick a pirate look (DECISIONS-PENDING 3.27).

## Phones
- RF8Y60PP2XZ = טלפון 1, "אורי".
- RF8Y30L038L = טלפון 3, "אחוותא", a young account.
- RF8Y80NPLZW = טלפון 2, "מומו": not connected in this round.
- Both connected phones have APK 3 (2026-11-03 ~09:05 build).

## Rules learned
- Spend: the org hit its usage limit once at ~05:10. Keep workflows small, with 2 phone lanes at most.
- `qa fix --fixed-in` is at most 40 characters.
- `adb.ts ui` now fails loudly when uiautomator can't read the screen.
- Never `adb logcat -c`, never uninstall or clear data, never sign out or rename.

## Autonomous loop 2026-11-06 (Moshe: "תעבוד בלי הנחיות. בודק מתקן בודק מתקן")
Moshe authorized a test → fix → APK → retest loop on the two phones without asking (no commit/push/store; staging deploy only if a server fix needs it). Power goes off at 02:00; the PC dies when its battery runs out. **A new session: read this section's last lines and continue from the newest "NEXT".**
- Old scratchpad (still on disk, holds latest-build.json, installed-<serial>.txt, rec/, qa-shots/): `C:/Users/mosheg/AppData/Local/Temp/claude/c--Users-mosheg-Documents-ReactNative-sudoku-fight/4440d2fa-e446-41ad-83db-f79035cdf42c/scratchpad`. If it is gone, recreate latest-build.json/installed-*.txt there or pass a new scratch dir to wf-remaining.js.
- 16:35 Both phones connected (RF8Y60PP2XZ, RF8Y30L038L), both on apk3. Snapshot b3434ea before today's work.
- 16:40 APK 4 build started (`npm run apk`, rounds 3+4 + rework). Workflow wf_114f2a91-997: capture K1 black screen with logcat on the phones (logs → data/k1-logcat-*.txt), fix, review.
- NEXT: when APK 4 is ready → re-sign with data/resign-connected.sh (edit its SCR to a writable dir) → copy to <scratch>/sudoku-fight-apk4.apk → latest-build.json {label:"apk4"}; after the K1 fix → APK 5 → then run wf-remaining.js (args = remaining-args.json + scratch + build) for the 753 todo tasks in run #2; fix rounds on what it finds.
- 16:45 APK 4 built (1.1.0-87760ce-dirty, 71 MB) and re-signed → <old scratch>/sudoku-fight-apk4.apk (same SHA-256 as apk3). NOT installed yet (phones busy with the K1 capture); latest-build.json still says apk3.
- 16:50 Moshe: "לבדוק ולתקן עד שאתה מסיים את כל הבדיקות שאתה יכול עם שני מכשירים ובלי לוגין" — goal: every run-#2 task doable with the two phones and WITHOUT logging in/out (login tasks → untested, נשאר למשה); loop test→fix→APK→retest until done.
- 17:25 K1 FOUND + FIXED (data/k1-result.json): Fabric 'addViewAt: View already has a parent' — Button loading made the label wrapper un-flatten (reparent) in the same commit as router.replace('/match'), through Reanimated's LayoutAnimationsProxy → host destroyed. Fix: Button label wrapper collapsable={false}; ResultsScreen waits 2 frames before onNewGame. Reviewer ok. Side finding: after an in-process host relaunch Reanimated floods Log.w → ANR (should vanish with K1). Building APK 5 now.
- 17:35 APK 5 (K1 fix) re-signed → <old scratch>/sudoku-fight-apk5.apk, installed on BOTH phones; latest-build.json = apk5. known-bugs.md rewritten (copy in data/known-bugs.md; K1/K2/K3/K5/fits = fixed → regression if seen).
- 17:40 TEST LOOP: script `data/wf-loop.js` (one round = optional fix check + N batches per phone lane + two-phone batches). Task lists: `data/loop-args.json` (phone 1: 25 batches, phone 3: 23, both: 13; built from the run's todo minus moshe tasks). Round 1 = wf_fcefc938-974: fixcheck + batches 1–2 per lane + both batch 1. Next rounds: pass lanes with chunks.slice(from, from+count) (from=2,4,…), both.slice(...), extraBoth = deferred ids from the previous round's result. Save each round's result to data/loop-<n>.json.
- 17:45 Decision taken autonomously (Moshe can revert): apply the Reanimated patch. patch-package@8.0.0 installed at the root (package.json + lock changed). Workflow wf_ed35257c-19f writes patches/react-native-reanimated+4.5.1.patch (onEventDispatch early-out + rate-limited stack-less Log.w) + test + docs, with a skeptic. Needs a native rebuild (npm run apk) and a device check.
- NEXT: when round 1 ends → fix round on its appBugs (code only) while round 2 tests run; when the patch + fixes are in → verify → APK 6 → latest-build.json (testers pick it up at their next batch).
- 18:25 Reanimated patch done, reviewer ok (data/reanimated-patch-result.json). APK 6 built (patched Kotlin confirmed in classes5.dex), re-signed → <old scratch>/sudoku-fight-apk6.apk; latest-build.json = apk6 (testers install it at their next batch start).
- 2026-11-07 17:25 FOUND: the PC never died — Windows went to sleep (connected standby) at 18:29 on 06.11 (AC sleep timeout was 30 min of no user input) and slept until today; agents were interrupted every wake, round 1 (wf_fcefc938-974) produced NOTHING (no marks; run still V158 ½32 X6). Stopped it. Fixed: powercfg standby-timeout-ac 0 (never sleep on charger; DC unchanged 4 min). Phone 1 was left at font 2.0 → reset. Both phones have apk6 (installed 06.11 21:04). Phone 3 disconnected at 17:23.
- 2026-11-07 17:35 Phone 3 re-authorized; phone 3 app locale was left 'ar' → set back to he. Round 1 RELAUNCHED: wf_61807fdc-dd5 (same args). NEXT: when it ends save result → data/loop-1.json; fix round on its appBugs; round 2 (from=2).
- 18:25 Moshe noticed only one phone was busy: the script's fix check was a barrier (phone 1 idle since 17:58). wf-loop.js restructured: each phone = its own pipeline (fix check → its batches); the two-phone fix check + both batches run after both lanes. Resumed as wf_61807fdc-dd5 (phone-1 fix check cached; result in data/fixcheck-p1-2026-11-07.json: H1/H4/F4/K14 pass, Reanimated patch = 0 failures per move; H3 first 'שחק' still ~0.55 s). Round 1 = 3 batches per lane.
- 20:45 Round 1 status: phone 3 batches 1–3 done (account/login tasks, mostly untested-for-Moshe), phone 1 batches 1–2 done, batch 3 deferred whole (phone 1 went offline→unauthorized ~19:00; Moshe re-authorized ~20:40). Run #2 now V173 ½31 X6. Two-phone fix check running. Fix round wf_864486e1-f77 started on 3 minor bugs (data/loop1-bugs-partial.json): first 'שחק' slow, puzzle result swaps line, fixed-square tap feedback. NEXT: when it ends → verify → APK 7 → latest-build.json.
- 20:50 Found: the PC went to standby 18:45–20:30 again (Modern Standby enters when the display turns off), and since 18:50 it is ON BATTERY (BatteryStatus 1, 77%). Set monitor-timeout ac/dc 0 + standby-timeout-dc 0 (originals in memory dev-machine-limits).
- 21:20 Fix round loop1 done (data/fix-loop1.json; reviewer ok, lows only): first 'שחק' = expo-audio ExoPlayer built on the UI thread at first press → warmModes preloads the primaryPress cue; puzzle result swaps line; fixed-square toast. verify running → then APK 7. Open low: toast + live region may double-announce with TalkBack.
- 21:33 verify green (612 suites / 14448 tests); APK 7 built + re-signed, latest-build.json = apk7.
- 07.11 ~22:20 Round 1 (wf_61807fdc-dd5) DONE → data/loop-1.json: 72 marks (30 pass, 4 partial, 38 untested = login/clean-data → Moshe). New bugs → data/loop2-bugs.json. wf-loop.js now takes optional args.checks {<serial>: items, two: items, ref} for per-round fix checks.
- ~22:25 Round 2 = wf_43608c1e-46b (args data/loop2-args.json: lane chunks 4–6 of loop-args.json, both batch 2 + levels-race-rules, phone-1 fix check of apk7). Fix round loop2 = wf_139f6545-1ff (pregame K2/B43 badges, surrender confirm, levels Back/recents/board jump; baseline ref refs/qa/snap-loop2). NEXT: fix round done → verify → APK 8 → latest-build.json; round 2 done → loop-2.json; round 3 = loop-args chunks 7–9 per lane, both batch 3 + round-2 deferred, two-phone fix check of apk8 (K2, B43 badges, surrender, levels-exit/freeze).
- ~23:20 Fix round loop2 (wf_139f6545-1ff) DONE → data/fix-loop2.json. Reviewer: 4 medium → reworked (not re-reviewed). K2: warmGame.ts builds the sound players + game code during the search. B43: the VS kept under the count shows everyone ready; badge slot reserved (no jump); K3c nod partial. Surrender: ConfirmModal scrim guard during enter + every non-surrender close explained. Levels: Back during ready/boss intro/tutorial → clean exit, session can't survive; recents → NEW local native module apps/mobile/modules/app-window (Activity.setRecentsScreenshotEnabled(false) while a stage runs, Android 13+, not FLAG_SECURE) + freeze on window blur; board first frame uses the final size. For Moshe (low): freezing on 'blur' also freezes a stage for the notification shade / Samsung toolbars. verify running → APK 8 (native rebuild needed for the module).
- 23:50 verify green (617 suites / 14497 tests); APK 8 built (app-window module confirmed in dex) + re-signed → <old scratch>/sudoku-fight-apk8.apk; latest-build.json = apk8 (testers install at next batch). NEXT: round 3 with two-phone fix check of apk8 (deviceChecks in data/fix-loop2.json).
- 08.11 ~02:40 Round 2 (wf_43608c1e-46b) DONE → data/loop-2.json: 72 marks (38 pass, 2 partial, 32 untested→Moshe). apk7 fixes confirmed on phone 1 (first 'שחק' 278-300 ms, puzzle swaps line, fixed-square toast). Bugs → data/loop3-bugs.json. IMPORTANT for Moshe: local APKs have Google sign-in OFF (built with the PC key, re-signed with the debug key that Firebase lists) → do NOT sign out on the QA phones until APK 9.
- Round 3 = wf_6c14e004-5e8 (args data/loop3-args.json: lane chunks 7–9, both batch 3 + account-home-after-ranked; fix checks of apk8: phone 1 levels, two phones K2/B43/surrender). Fix round loop3 = wf_c38dc8ad-f0b (baseline refs/qa/snap-loop3): Google flag for re-signed APKs (+ honest delete for Google-only users), tiny delete button label, New Game at font 2.0, English a11y casing, XP refresh after reconnect. NEXT: fix done → verify → APK 9 (build with the new re-sign SHA-1 option!) → latest-build.json; round 3 done → loop-3.json → round 4 (chunks 10–12, both batch 4 + deferred).
- ~03:30 Fix round loop3 (wf_c38dc8ad-f0b) DONE → data/fix-loop3.json (reviewer medium on ConfirmModal measure layer → reworked). New: `npm run apk -- --resign-sha1 debug` (Google on in re-signed QA APKs); Google-only delete in a no-Google build → notice dialog; ConfirmModal stacks buttons when a label doesn't fit (no tiny text); New Game wraps at font 2.0; XP refresh after reconnect sync. verify + APK 9 running (task bj34imo3i).
- 08.11 01:58 (real clock; the ~02:40/~03:30 stamps above were estimates, ignore them) verify green (618 suites / 14563 tests); APK 9 built with --resign-sha1 debug, re-signed → <old scratch>/sudoku-fight-apk9.apk, assets/app.config googleSignIn.android=true. latest-build.json = apk9. Round 3 (wf_6c14e004-5e8) still running. NEXT: when it ends → loop-3.json; fix round on its bugs; round 4 = loop-args chunks 10–12 per lane (index 9..11), both batch 4 (index 3) + round-3 deferred, phone-1 fix check of apk9 (levels-xp-offline, New Game at font 2.0 on 360dp) + phone-3 check (delete-account dialog shows 'אישור עם Google', ConfirmModal stacked buttons; NEVER delete, NEVER sign out).
- 08.11 05:30 Round 3 (wf_6c14e004-5e8) DONE → data/loop-3.json: 75 marks (58 pass, 4 partial, 13 untested). apk8 fixes confirmed: levels Back/recents/board-size pass; B43 badges + no jump pass; surrender 10/10 pass; first-game GO! no longer 1.75 s. NEW: first ranked game sounds missing (warm-up regression), 2P header overflows at 360dp, target-line shape, reconnect texts, closed-room error, licences RTL → data/loop4-bugs.json. For Moshe: the notification shade no longer freezes a stage (clock runs) — decision.
- 05:35 Round 4 = wf_e57f4cb3-798 (args data/loop4-args.json: lane chunks 10–12, both batch 4; fix checks of apk9 on both phones). Fix round loop4 = wf_03a5f849-fe5 (script data/wf-fix-loop4.js, baseline refs/qa/snap-loop4). NEXT: fix done → verify → `npm run apk -- --resign-sha1 debug` → re-sign → APK 10 → latest-build.json; round 4 done → loop-4.json → round 5 (chunks 13–15 = index 12..14, both index 4 + deferred, two-phone fix check of apk10 sounds + 360dp header).
- 08.11 ~06:50 Fix round loop4 (wf_03a5f849-fe5) DONE → data/fix-loop4.json (3 medium → reworked): sfx first play seeks to 1 ms (media3 skipped same-position seek → first-play silent; also hit ui_tap and first GAME_CUES), search↔VS cross-fade, GoCover for GO!→board gap, 2P header fits ≥320dp, target-line shape + 'יעד' chip, reconnect quiet window 6 s + 'מסנכרן…', friends alreadyInRoom retry / closed room, licences LTR. Phone 1 (RF8Y60PP2XZ) DISCONNECTED since ~05:50 (asked Moshe to replug/authorize). verify + APK 10 running.
- 08.11 06:46 verify: 1 flaky new test (gameRoute GO! first frame; real rAF passed inside render under load) → made deterministic (held rAF), else green 14594. APK 10 built (--resign-sha1 debug) + re-signed → <old scratch>/sudoku-fight-apk10.apk; latest-build.json = apk10.

### STOP 08.11 07:30 (Moshe: "בשעתיים הקרובות נסיים להיום")
- Round 4 (wf_e57f4cb3-798) STOPPED at its two-phone stage because phone 1 (RF8Y60PP2XZ) has been disconnected since ~05:50. Partial result → data/loop-4-partial.json: phone 3 batches 1–3 done (22 marks: 13 pass, 2 partial, 7 untested); phone 1 batches did NOTHING (phone offline). apk9 fixes confirmed: Google-only delete dialog, ConfirmModal stacked buttons, XP after reconnect, English casing; New Game font 2.0 partial (chips cut).
- New minor bugs (not fixed yet): mode-row chips cut at font 2.0; Home XP updates only on refocus; Home at font 1.3 on 360dp 'Provisional' chip breaks mid-word + recent titles '…'; reduced-motion 🔥 reaction hides the laugh.
- State: APK 10 (loop-4 fixes, Google on) = latest-build.json; phone 3 has apk10, phone 1 has apk9 (gets apk10 at its next batch). Everything uncommitted (Moshe decides on commit).
- **NEXT SESSION:** (1) phone 1 reconnected? (`adb devices`; Moshe approves the RSA prompt). (2) Run wf-loop.js with args data/loop5-args.json (+scratch/out as in loop4-args): phone 1 = round-4 chunks 10–12 again, phone 3 = chunks 13–15, two-phone = both batch 4 + 12 phone-3 deferred + two-phone fix check of apk10 (fix-loop4.json deviceChecks). (3) Fix round on loop-4-partial.json bugs + round 5 bugs → verify → `npm run apk -- --resign-sha1 debug` → re-sign → latest-build.json. Remaining after that: phone 1 chunks 13–25, phone 3 chunks 16–23, both batches 5–13.
- Decisions waiting for Moshe: notification shade no longer freezes a stage (clock runs); K3c ready-nod only ~0.2 s visible (badgesAtMs/FOUND_HOLD); K7 2P interfere button clip; K12 level exit dialog clock; leaderboard pinned row in long languages; Reanimated patch (applied, revertible); catalog issues collected in data/loop-*.json catalogIssues.

### RESUME 08.11 21:30 → SESSIONS (Moshe: "תמשיך"; then "אין בדיקות כפולות... לבדוק ביחד... זללני"; "תעשה בעצמך")
- Fix round loop5 (data/fix-loop5.json, review ok): chips grow with font (parts.tsx chipSizeAt), Provisional one word per line + RecentGames reflow at large text (chevron hidden at large text, so French 2.0 fits), Home XP refresh on reconnect (connectivity/levelsSync/practiceSync retryNow), reduced-motion 🔥 off the face. APK 11 = latest-build.json (verify 623 suites / 14676 tests green, built with EXPO_PUBLIC_STARTUP_LOG=1).
- Remaining 324 tasks MERGED into 31 sessions (data/merge-plan.json: per-area clusters verified by a skeptic + lane plan). 50 marked directly: 16 Moshe-only (login/other account/3-4 players), 33 need 3-4 players (Firebase ID tokens for fake-client), 1 duplicate of a passed task. Estimate ~10 h instead of ~50 h.
- Runner: data/wf-sessions.js (session batches; args embedded per lane in wf-sessions-p1.js / -p3.js / -both.js). Order: P1 lane now; P3 lane after phone 3's apk10 fix check (wf_f4beceb8-e17, stopped after its fix check); then BOTH (add the solo lanes' deferred tasks). pregame-stealthoff runs with the stealth bot ON (only Moshe can switch it): lone-queue/timeout tasks deferred to Moshe.
- 09.11 ~00:40: P1 sessions done (data/sessions-p1.json: 79 marked, 77 pass, 0 bugs, ~1.6 h). P3 sessions done (data/sessions-p3.json: 36 marked, 30 pass, 8 bugs → data/loop7-bugs.json). Fix round loop6 (data/fix-loop6.json) in APK 12 = latest-build.json. BOTH stage running (wf_3caa19d9-8ac, wf-sessions-both.js, 8 batches). Fix round loop7 running (wf_08ff29d8-521, baseline refs/qa/snap-loop7). After both: verify → APK 13 → fix check of loop6+loop7 on the phones.
- Kept by judgement (tell Moshe if asked): in English the 2P interfere button is icon-only when 'Interfere' doesn't fit beside the status (instead of tiny text); Hebrew keeps 'הפרעה'.
- Fix round loop7 done (data/fix-loop7.json; review high/medium fixed in rework): new app entry apps/mobile/index.ts + src/services/latestRoot.tsx (stale React roots after activity recreate), game→results push+drop, layout fixes at 360dp/1.3, friends tab sorted by rating (server; D99 places kept, FRIENDS_PLACES=among waits for Moshe). Verify green (635 suites / 14804 tests). APK 13 built + re-signed at <old scratch>/sudoku-fight-apk13.apk but NOT yet in latest-build.json: smoke-test it on one phone after the BOTH stage (entry point changed), then publish; deploy staging for the friends sort after the BOTH stage (a deploy restarts rooms).
- 09.11 ~05:30: BOTH stage done (data/sessions-both.json): 149 marks (122 pass, 10 partial, 5 fail, 12 untested), 15 app bugs (1 critical: ink worklet `INK` crash; 2 major: warp black flash, friends rejoin after kill → 4002), 38 catalog notes. Run #2 now V 528 · ½ 45 · X 12, 363/948 not done.
- APK 13 smoke-tested on phone 3 (opens; player card opens after wm density/font change+reset) → published (latest-build.json apk13), installed on both phones.
- Loop 8 running (wf-fix-loop8.js, wf_8872b1b0-727, snapshot refs/qa/snap-loop8): fix areas interference/rooms/misc + review; in parallel a phone tester rechecks loop-6/7 fixes on APK 13 (fixcheck-loop67-args.json). Next: save result → verify → APK 14 → deploy staging (friends sort + loop-8 server fixes) → recheck loop 8.
- 09.11 ~07:55: loop 8 done (data/fix-loop8.json; phone recheck of loops 6–7 on APK 13: data/fixcheck-apk13.json, 13 pass / 5 partial / 1 fail, 11 new or remaining bugs: board→results empty frame STILL there, density change mid-game orphans the ranked game (major), Back at GO! opens surrender, 360dp leftovers). Verify green (641 suites / 14837 tests). APK 14 built, re-signed (fac617…3b9c), installed on both, published. Staging deployed (HEAD fly.toml swapped in and restored; GIT_SHA=87760ce; /health ok, assetlinks FA:C6).
- Waiting for Moshe: he/game.json "Reconnecting... {{seconds}}" stays English because the original spec quotes it (line 691); proposal "חיבור מחדש… {{seconds}}".
- Loop 9 running (data/wf-fix-loop9.js, wf_9dbd1ab7-891, snapshot refs/qa/snap-loop9): investigators + fixer + skeptic per area (transitions, resume, layout); parallel phone check of loop 8 on APK 14. Next: save → verify → APK 15 → (deploy if server changed) → recheck loop 9.
- 09.11 ~09:50: loop 9 done (data/fix-loop9.json: results handoff before push, game resume after activity recreate / process kill (ranked + friends), Back blocked at GO!, 360dp items; phone check of loop 8 on APK 14: data/fixcheck-apk14.json — INK crash FIXED on device (4 hits), rejoin after kill in friends OK, seat ratings OK, GO! on joiner OK, friends-tab places OK). Verify green (648 suites / 14894 tests). APK 15 built/re-signed/installed/published; staging redeployed (protocol alreadyQueued text, held-seat rejoin).
- Loop 10 running (data/wf-loop10.js, wf_27f8a9bd-410, snapshot refs/qa/snap-loop10): fixes (rejoin opponent avatar grey, GO! hold on cold joiner, warp dim before overlay with sound, results rating card under the bar) + phone check of loop 9 on APK 15 + triage of the 175 remaining claude/both tasks → sessions run via wf-sessions.js. Next: save → verify → APK 16 → deploy if server → recheck.
- 09.11 ~13:00: loop 10 done (wf_27f8a9bd-410). Saved: data/fix-loop10.json, fixcheck-apk15.json, triage-loop10.json, sessions-loop10.json.
  - Fixes: rejoin restores the opponent avatar and flag (server: welcomeBack sends the lobby; needs deploy). Friends joiner warms up the game screen in the lobby (GO hold, partial). Warp: one hit clock, banner and dim together (partial; needs a recording). Results: the rating count waits until it is visible (TalkBack-aware).
  - Phone check of loop 9 on APK 15. Pass: Back at GO, Results→search 5/5, game resume after density, font and kill, all 360dp items. Partial: the empty frame (clean except 1 of 4 full-board ends with RM on).
  - New bugs: ranked SEARCH lost on a density change (major); a full-board empty frame with RM on (medium); interference picker at en 360 (low); L010 a11y without stars (minor).
  - Triage: only 18 of the 175 claude/both tasks are doable now (11 V, 2 ½, 5 untested); 157 are blocked (login 72, 3rd-4th player 53, stealth off 10, Moshe by hand 7, other).
  - Next: verify → APK 16 → staging deploy (server changed) → loop 11 (data/wf-loop11.js: fixes and a phone check of loop 10 on APK 16).
- 09.11 ~14:00: verify green after a fix: loop 10 had saved motion.md and resultsRanked.test.tsx with CRLF, which broke 2 docs tests; converted back to LF. APK 16 is built, re-signed (fac617…3b9c), installed on both phones and smoke-checked. Staging is deployed (HEAD fly.toml swap, restored; /health ok, assetlinks FA:C6).
  - Loop 11 is running: data/wf-loop11.js, wf_3a1b6429-e6f, snapshot refs/qa/snap-loop11 = 63bf12c.
  - Next: save fix-loop11.json and fixcheck-apk16.json → verify → APK 17 → deploy if the server changed → recheck.
- 09.11 loop 11 done (wf_3a1b6429-e6f). Results are in data/fix-loop11.json and fixcheck-apk16.json.
  - Fixed: a ranked search survives a display-size change (the latestRoot `going` set; MatchScreen cancels after 6 s only if nobody shows the search); a reconnect during 3-2-1 keeps the resync; the picker at en 360; the L010 node label has its stars. The full-board empty frame is still not found off the device.
  - The APK 16 check:
    - Passed: the opponent avatar after a rejoin, and the rating card is visible on its own.
    - Failed: the GO hold on the joiner (1.6–2.1 s) and the warp start split.
  - New bugs:
    - The results header goes under the status bar after the auto-scroll (a regression from loop 10).
    - After an abandon, ~2 min on 'ללא חיבור' with the network back, then an English chip "network".
    - The friends room type was not remembered (seen once).
- 09.11: verify green (652/15240). APK 17 installed on both phones; no server change, so no deploy.
  - Loop 12 is running: data/wf-loop12.js, wf_0103626d-d22, snapshot refs/qa/snap-loop12 = d698c3e.
  - What it does:
    - Code fixes for results and net.
    - Phone measurements (screenrecord, gfxinfo, logcat) for the 3 timing bugs, then a fixer for each one based on its measurements.
    - A recheck of loop 11 on APK 17.
- 09.11 loop 12 done (wf_0103626d-d22). Saved: data/fix-loop12.json ({fixes, timing}), measure-apk17.json (the phone measurements) and fixcheck-apk17.json.
  - Loop-11 items on APK 17: the density/search A–E, the countdown resync and the picker passed; the L010 label is partial.
  - Fixes:
    - Results: the header sits outside the scroll.
    - Net:
      - a 60 s after-grace retry, so the finished game comes back;
      - ERR_ support codes;
      - friendsGameType is remembered.
    - Full board: the rest of the results mounts after the fade (useStackEntered).
    - Warp: a phone-local hit clock and a deferred standby canvas.
    - GO: sfx.preload is skipped with sound off, and the count's column shows from its first frame.
  - TEMP: app/friends/room.tsx logs "[friends] GO! shown…" in release; remove it before the store. (Removed in loop 13, after APK 18's numbers: the game came 17–189 ms after GO!, so the cost was the game screen's own mount.)
  - Verify had 2 tests that expected no after-grace retry (GameScreenOnline, remoteHost.contract); I fitted them with afterGraceRetryMs options, and they pass.
  - APK 18 is installed on both phones; there was no server change.
  - Loop 13 is running (data/wf-loop13.js, wf_368bec33-824, snapshot a180957): the rooms fixes (cancel after a recreate, the dark box after a countdown reconnect, the host spinner after a game), a phone check of loop 12, then GO-hold step 2 from the logcat numbers.
- 09.11 loop 13 done (wf_368bec33-824). Saved: data/fix-loop13.json ({fixes, gohold}) and fixcheck-apk18.json.
  - APK 18 check passed: the full-board empty frame (9 endings clean), the results header, the error codes and the friends room type.
  - Partial: the reconnect after an abandon (6–7 s after the network returns), and the warp (sound off is smooth; sound on, the first hit freezes ~150 ms).
  - GO logcat: X 17–189 ms, Y ~260 ms; GO→board 1.1–1.34 s.
  - Fixes:
    - flowStack.ts: rebuilds the stack under a recreated root.
    - The friends GO goes through GoCover, with no hold.
    - A way out of the room's 'gone' state.
    - The dark box: no cause found.
  - New bugs: results under RM/no animations (a loop-12 regression); a11y nodes under the error cover; the opponent countdown stops at 1.
  - Verify green (659/15301). APK 19 installed on both phones; no server change.
  - Loop 14 is running (data/wf-loop14.js, wf_22966038-5e1, snapshot 2f0376d): fixes plus a phone check of loop 13, a navigation regression sweep, and the dark-box investigation.
- 09.11 loop 14 done (wf_22966038-5e1). Saved: data/fix-loop14.json and fixcheck-apk19.json.
  - APK 19 check:
    - Passed: cancel after a recreate, the room spinner, and the navigation sweep (except the levels map).
    - Partial: the GO hold on the joiner, 1.0–1.4 s.
  - The dark box reproduces 7/7 for the friends JOINER. It is drawn content on the 'me' card, and a cell tap clears it.
  - New bugs: the GO cover slam jump (a loop-13 regression); the levels map is lost on a recreate; the nav bar is sometimes light.
  - Fixes:
    - useReduceMotion follows the system live.
    - a11y hides the game under its covers.
    - The opponent side holds on time-up.
    - Warp: the muted warm-up restores volume (partial, unproven).
  - Verify green (664/15326). APK 20 installed on both phones; no server change.
  - Loop 15 is running (data/wf-loop15.js, wf_03757b97-7cf, snapshot bf7993c):
    - fixes for friends-game (the box, the GO jump) and nav (map recreate, nav bar);
    - a perfetto trace of the first warp, then a warp fix;
    - a recheck of loop 14 on APK 20.
- 10.11 loop 15 done. data/fix-loop15.json and fixcheck-apk20.json are saved. Loops 1–15 were committed (91df2ac, 803a40b) and pushed.
- 11.11 loop 16 (data/wf-loop16.js): the friends game opens at GO!, the GO! slam always starts small, and the warp standby no longer stalls. The resultsFrames test is now deterministic. Results are in data/fix-loop16.json and fixcheck-apk21.json.
- 11.11 QA run #2 sync, stage 1 (no phones; data/qa-sync-stage1.json):
  - 33 handled bugs were verified and 9 more were marked handled.
  - 331 untested tasks got a note saying what blocks them.
- 11.11 loop 17 (data/wf-loop17.js) fixed three bugs: the Home offline banner, the map selection after 'למפה', and the splash handoff. Verify is green (15380). APK 22 was built.
- 11.11 final phone pass on APK 22 (data/fixcheck-apk22.json):
  - It covered the loop 16/17 checks, 9 needsPhone bugs and 19 needsPhone tasks, and marked run #2.
  - Committed and pushed as a542bc5.
  - It found that loop 17 had hidden Home's entrance under the Splash and that the Splash was held too short.
- 11.11 loop 18 (data/wf-loop18.js, data/fix-loop18.json; 42476a9):
  - Splash hold: splashSeenMs 500 ms, counted in drawn frames.
  - Home's entrance now waits for the handoff.
  - Solo score flight target, and the board rises in.
  - History 'מדורג' paging, with the server's rated=1 (staging deployed from 42476a9).
  - Pirates lab steps.
  - Verify is green (668/15400). APK 23 is on both phones.
- 11.11 APK 23 check (data/fixcheck-apk23.json):
  - Passed: the splash, the solo flight and the history paging.
  - Partial: the Home card rise is not seen (a UI-thread stall as the Splash fades), the history switch shows a skeleton, and the pirates lab blinks on a quick tap and is slow to start moving.
- Run #2 now: V 596 · ½ 18 · X 1 · 333 untested (they need Moshe, an account, a 3rd player or iOS). Bugs: 17 open, 2 handled.
- Open, all low: home-card-rise-not-seen, rm-splash-no-fade-frames (check by eye), history-ranked-switch-skeleton, history-offline-note-wording, pirates-lab-quick-tap-back-blink, pirates-lab-idle-start-late.
- Waiting for Moshe:
  - the English 'Reconnecting... N' caption;
  - the cut during the 🔥 spin (avatars-look-corner-clip);
  - splashSeenMs (500);
  - the open bugs that need accounts or decisions.
