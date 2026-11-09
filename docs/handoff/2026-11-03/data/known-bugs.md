# Known open bugs (build apk6 of 2026-11-06 18:25; a newer build may already fix some)

If a task runs into one of these, don't dig: mark the task by its expected lines (fail/partial if a line is broken because of it),
write "באג ידוע: <id>" in --actual, and do NOT add it to appBugs again. Anything else you find is new: report it.

FIXED in apk4/apk5 (2026-11-06) — if you still see one of these, it is a REGRESSION: report it in appBugs with the id + "עדיין":
- K1 black-screen ('משחק חדש' on ranked Results → dark screen). Fixed in apk5.
- K2 countdown losing '3' / GO! too long (VS and count now cross-fade; count anchored to its first drawn frame). GO! ≈0.4 s on Android is the target; on the A16 up to ~1 s is the known residual (game-screen mount).
- K3 'מוכן' badges on the VS not popping on טלפון 3.
- K5 History opening freeze / only one card visible.
- K6 pirates-anr and the Reanimated flood (apk6, Reanimated patch): no ANR on /dev/pirates; 'synchronouslyUpdateUIProps failed' is now one short line, at most 5 per second plus a 'K more times' line; few or none per move / back arrow. An ANR anywhere is a regression.
- Round-3 fits: ru/es New Game name '…', en-XA cuts, 'Offline' chip in de/it/nl/id, hunter star labels at font 2.0.

STILL OPEN (known, don't report again):
- K4 3p-timeout: searching alone for 3 players shows the '1:00' timeout after ~20 s.
- K7 interfere-clip: in a 2P game, when the rival holds a cell and the 'הפרעה' button is enabled, its word is cut with no '…' (Moshe's decision).
- K8 perf: screen changes take ~0.45–0.5 s (the patch may improve it; just note numbers).
- K12 exit-dialog-clock: the level exit dialog ('לצאת מהשלב?') doesn't stop the level clock (Moshe's decision).
- K13 hw-del: a hardware DEL (adb keyevent 67) doesn't delete digits in the join-code boxes; use the on-screen ⌫ instead.
- K14 hero-scale: the Home 'שחק' hero sometimes stays at ~96.5% scale after a press.
