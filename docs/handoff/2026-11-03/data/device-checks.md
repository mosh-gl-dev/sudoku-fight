# Device checks after the fix round

## skew
### B13 [fixed]
New APK, Hebrew. Home: the gold 'שחק' must be a parallelogram leaning like '/'. Its left edge at the top sits about 35 px (13.5 dp) right of its left edge at the bottom, and the same on the right edge. Before, it was x=68..1012 at every height. The gold edge (#b88f00, about 4 dp) under it is the same slanted shape, straight below. The word 'שחק' is upright and centred. Press and hold: the face sinks onto the edge and springs back. Repeat in English ('Play'), then switch back to Hebrew. Also check 'צור חדר', 'התחל אימון' and 'שחק' beside my row in the leaderboard.

### B16 [fixed]
Modes > friends footer: 'צור חדר' (gold) and 'הצטרף עם קוד' (slate) are both parallelograms with the same lean. Their inner edges run parallel with an even gap, and each edge band is slanted under its own face. Measure the 'צור חדר' edge at y≈2040 and y≈2150: x must differ by about 17-18 px (it was 562/557/560). In a solo practice, X > 'לסיים את האימון?': 'ביטול' (gold) and 'כן, לסיים' are both slanted. Settings > language > the restart dialog: 'החלפה והפעלה מחדש' is slanted, and so is its partner. After 'ביטול', the language stays Hebrew.

### B19 [fixed]
Finish a bot practice > Results: 'משחק חדש' (gold) and 'צפייה חוזרת' (slate) are both parallelograms with parallel inner edges, labels upright, edges slanted under each one. Compare with qa-shots/RF8Y80NPLZW-action-pair-1crop.png, where they were rounded rectangles.

### B38 [fixed]
Ranked game against the bot or phone 2. On 'נמצא יריב!' and in the duel HUD, the 'VS' tag is a small parallelogram with 'VS' upright. In the game, open the surrender dialog: 'ביטול' (gold, wider) and 'כן, להיכנע' (red outline on a red edge) are both slanted with parallel inner edges. Tap 'ביטול': the dialog closes and the game continues. Compare with RF8Y80NPLZW-network-surrender-cancel-2.png, A-home-cta.png and A-end-btn.png.

### B49 [fixed]
Friends room (create a room, alone): 'התחל משחק' is grey, flat, thin-bordered, with no edge, and still a parallelogram. With phone 2 joined it turns gold with its edge, still slanted, and the app does not crash. Ranked game > surrender dialog: both buttons slanted, as in B38. Home 'שחק' slanted, as in B13.

### general-depth-disabled [fixed]
Modes > 'הצטרף עם קוד': with an empty code, 'הצטרף' is a grey, flat, thin-bordered parallelogram with no edge. Type 123459: 'לא מצאנו חדר עם הקוד ⁦123 459⁩' appears, the app stays open, and 'הצטרף' turns gold with its edge, still slanted.

### general-depth-no-pair [fixed]
Friends room: 'שתף קישור' and 'העתק קוד' stay straight grey slate buttons on grey edges. 'התחל משחק' in its own row is a parallelogram: grey and flat while disabled, gold with an edge once a second player is connected.

NOTES: Root cause confirmed in node_modules/react-native 0.86.3 (ReactAndroid uimanager). BaseViewManager.setTransformProperty runs TransformHelper.processTransform, then MatrixMathHelper.decomposeMatrix, then sets only setTranslationX/Y, setRotation/X/Y, setScaleX/Y and setCameraDistance. decomposeMatrix computes ctx.skew, but nothing reads it. TransformHelper applies skewX to the matrix (m[4] = tan), and the decomposition then discards it.

Decision (mine, per rule 7): no react-native-svg or Skia shape. Instead, an exact SVD split of the shear into rotate·stretch·rotate on two nested Views (slant.tsx). Why:
- Skia must stay off the startup path (startupGraph.test).
- An SVG path needs onLayout measuring, which risks a first-frame flash, and it would re-implement the gradient, the inset lines and the border.
- Native views keep the existing faceStyle recipe and the NO_BORDER guard as they were.
- Cost: 2 extra plain views per slanted face, 1 per edge.
- iOS and Android share one code path and one look.

The rotation rounding Android applies (3 places) costs less than 0.001 dp; this is covered by a test that replicates the Android pipeline.

Test ID convention for slanted surfaces:
- `${testID}-face` stays the face box (layout and press).
- The look moved to `${testID}-face-shape`.
- The edge box is `${testID}-shadow` or `${testID}-edge`, with its look on `-shadow-shape` / `-edge-shape`.
- Non-slanted surfaces are unchanged.

QA catalog steps that read the face colour of a primary by resource-id should use the new -shape ids.

Behaviour changes:
- Labels and 'VS' are now never counter-skewed, so upright on both platforms. FoundView's 'VS' used to be skewed on iOS.
- A slanted slate, danger or disabled button's content box is 1 dp wider on each side, because the border lives on the plate now.

Not changed (out of scope):
- TokenArt.tsx's Warp wobble (arsenal icon animation) still uses skewX. Android shows only its swell. It is listed with this reason in the source-scan test's ALLOWED map.
- warpModel.ts's existing note about Android skew is untouched.

Other notes:
- Button.test.tsx and ModesAndGameType.test.tsx were already CRLF in the working tree before this workflow. The edits kept CRLF. `prettier --check` flags those two files for line endings only; content diff is empty.
- docs/design/components.md: §0.7 item 4, §1.1 anatomy and Container row, and §3.5 updated (targeted edits).
- Nothing needed adb or an APK.

## online
### B42 [fixed]
Two phones with different avatars (e.g. Momo with a regular avatar, Uri with the pirate lady). Phone 1: שחק → חדר עם חברים → צור חדר. Phone 2: הצטרף עם קוד → the code. Phone 1: התחל משחק. On both phones in the game: the opponent's card shows his own avatar and flag, not the grey silhouette. When the opponent selects a cell, his avatar's head appears in that locked cell. Opponent sends 😂: the emoji rises AND his avatar reacts (laughs/jumps). End the game (finish or surrender): the results show the opponent's avatar. Then play one ranked 2p match between the same accounts: avatars are still correct.

### B51 [fixed]
Same steps as B42. Phone 2 must see 'Uri' with the pirate lady, and phone 1 must see 'Momo' with his regular avatar: in the opponent card, on the opponent's locked cell and on the results screen. None of them is a grey silhouette.

### B37 [fixed]
After the staging deploy and the new APK: ranked מהיר · 2 between the two phones, once with reduced motion on and once off; also once against the ranked bot. Capture at about 9 fps from 'נמצא יריב!' to the board. Expected: '3', '2' and '1' each visible for about 1 s ('3' at least about 0.8 s, never missing). Then 'GO!' visible for at least about 0.4 s before the board appears. No digit skipped and no blank frame instead of GO!. Reduced motion: digits cross-fade, no ring.

### B43 [fixed]
Needs the staging deploy (server change). Ranked 2p מהיר between the two phones, both searching so they match and connect instantly. Capture from the match: the 'נמצא יריב!' screen with the VS badge and both tiles stays at least about 1.1–1.2 s before the 3·2·1 screen. With reduced motion off, the 'מוכן' badges pop on the tiles before the count starts. No dark single frame straight from search to countdown.

### B40 [fixed]
3-button navigation. שחק → חדר עם חברים → צור חדר. Without scrolling: 'התחל משחק' and 'יציאה מהחדר' are both fully above the navigation bar (uiautomator: the friends-leave button's bottom bound < the bar's top, about y 2205 on the A16). Tap 'יציאה מהחדר' once: you leave the room back to the previous screen and the app does not go to the background. Repeat with a guest phone in the room: on the guest, 'מחכים ש־… יתחיל' and 'יציאה מהחדר' are pinned at the bottom, fully tappable.

### B53 [fixed]
Phone 2 alone in a new friends room (צור חדר, nobody joins): the hint 'צריך לפחות 2 שחקנים מחוברים כדי להתחיל' and 'יציאה מהחדר' are both visible above the nav bar without scrolling. A tap on 'יציאה מהחדר' leaves the room (it does not press the system bar).

### avatars-pirates-crash-join-code [fixed]
שחק → חדר עם חברים → הצטרף עם קוד. Type 6 digits of a code that doesn't exist (e.g. 918273). During the request (capture at about 9 fps) the text 'מצטרף לחדר…' with a small gold spinner shows where the 'הצטרף' button was. Then the refusal 'לא מצאנו חדר עם הקוד ⁦918 273⁩…' appears under the boxes and the 'הצטרף' button is back. Also join a real room's code: the same line shows briefly, then the room opens.

NOTES: Decisions made on my own:
(1) VS minimum time is enforced on the server. It is FOUND_HOLD_MS = 1200 after 'found', taken from tokens sequence.matchFound.countdownAt and DS-Motion '+1.2s'. It is a protocol constant plus the MatchmakingConfig.foundHoldMs config, so Moshe can lengthen it. FoundView pops the 'מוכן' badges 800 ms after the VS mounts, so with 1200 ms they are on screen about 0.4 s. If Moshe wants the ready reaction to linger, raise FOUND_HOLD_MS.
(2) The client handles the remaining lateness and clock-sync error without moving GO: a late count runs its 3 digits evenly over the time left, never skipping one. GO stays on server time, so the board still comes for everyone at once.
(3) GO! is held 400 ms before the board (motion.md `go`), checked on MatchScreen's 100 ms useNow tick. I first wrote the hold with setTimeout. That made 8 tests in __tests__/ranked.e2e.test.tsx crash in Reanimated's jest frame-callback mock (a router.replace from inside a fake timer). The tick-driven version passes them all and is simpler.
(4) The friends lobby's start and 'יציאה מהחדר' are now a pinned footer, the same pattern as GameTypeScreen, so the start button is also always visible. The design doc lines were updated.
(5) Join: a status line in the button's place, matching the Friends-Join mock. The shared Button is untouched.

Server change: apps/server/src/matchmaking/service.ts and packages/protocol need a staging deploy before B43 (and the server half of B37) can be checked on the phones. Without the deploy, B37's client half (pacing and GO hold) works on its own.

Known residual (not fixed, to keep the server change minimal): if the app is killed mid-game in a friends room and reopened, the rejoin gets a snapshot but no lobby, so the opponent's avatar falls back to the silhouette for that session. An in-app 'נסה שוב' keeps the avatars, because retryOnline passes the profiles on. Fixing the kill case needs FriendsRoom to send the lobby to a player who comes back after the start.

Not touched: GameScreen comments that still say profiles come from 'a ranked match'. The GAME agent owns that file.

Housekeeping: I created and deleted a temporary debug test copy (apps/mobile/src/__tests__/zzOnlineAgentDebug.e2e.test.tsx) while tracing the e2e crash. It is gone. Other agents' concurrent edits seen in FoundView.tsx, docs/01-SPEC.md and components.md were left intact. My doc edits were small targeted insertions.

## postgame
### B1 [fixed]
1. Settings › language العربية. Play a short solo practice with one correct move and one wrong move, then Results › replay. 2. Step to the correct move. Under 'حساب النقاط' in the explanation card, the line reads '9 − 6 + (9 − 5) / 2 = 5' (real numbers), left to right, with no English 'points'. Under it is one Arabic line naming the two counts. 3. Step to the wrong move: under the penalty title, the same formula form plus the counts line. 4. Repeat in 日本語 and Hebrew. In Hebrew the title is 'חישוב הניקוד' and the caption reads like '6 בשורה, 5 בריבוע'.

### B18 [fixed]
Solo practice: play 1–2 moves, end the practice, then Results › צפייה חוזרת. The top HUD card says 'אני' with the cyan P1 dot (TalkBack: 'אני · מקום 1 · …'), the same word as the 'הסבר לכל שחקן' card. It must never say 'שחקן'.

### B24 [fixed]
Practice against Pip, a few moves, then Results › צפייה חוזרת. Step to 'אני · נכון ב־A2 · +5'. The top card reads 'אני · מקום 1 · …', the same as the explanation card.

### B31 [fixed]
Practice vs a bot (any level), end it, open the replay. My card says 'אני' with the P1 dot. The bot card shows its own name (e.g. 'Pip').

### B34 [fixed]
Same as B31. In the replay of a bot practice the top card shows 'אני', matching the narration 'אני · נכון ב־A1'.

### B20 [fixed]
1. Hebrew, normal font size. Practice vs Pip with a correct move, then Results. In 'מהלך המשחק' the move after the gold points shows the whole 'A2 → 4', digit visible. 2. Tap צפייה חוזרת and step to 'אני · נכון ב־A2 · +5'. The big line at the top of my explanation card shows the whole 'A2 → 4', left to right, digit visible, with 'בודד גלוי' beside it. 3. Repeat at the largest font size (font_scale 2.0) and in Deutsch and العربية. 4. In uiautomator, replay-explain-me-move is now a row holding three text nodes: 'A2', '→', '4'.

### B44 [fixed]
Phone 2 (needs staging data): History › open the friends game marked 'עם חברים'. The replay subtitle reads 'עם חברים · מהיר · היום', not 'מדורג'. A real ranked game's replay still says 'מדורג · …'.

### B52 [fixed]
Same as B44: History › friends game › צפייה חוזרת. The subtitle reads 'עם חברים · …'.

### B41 [fixed]
Friends room between the two phones: start, make no correct move, end (surrender or leave). On Results the 'מהלך המשחק' card reads 'לא היה לך מהלך נכון במשחק הזה'. A solo practice ended at once shows the same line.

### B54 [fixed]
Ranked 2-player game between the phones: surrender before any correct move. On Results the 'מהלך המשחק' card says 'לא היה לך מהלך נכון במשחק הזה'.

### B17 [fixed]
Settings › font size max (font_scale 2.0), Hebrew. Practice vs Pip with at least one correct move, end it. On Results: the four 'מהלך המשחק' chips show 2×2 (or one per line) with whole words ('בשורה', 'בריבוע', 'ספרות 6 בלוח'), nothing broken mid-word and no '…'. The header shows the full 'אימון מול בוט · מהיר · 2 שחקנים' (wrapped if needed). The 'בוט' tag on Pip's avatar is whole. The award line is complete. Back at normal font size, the chips are four in a row.

### B21 [fixed]
Settings › language Deutsch, normal font. Practice vs a bot with a correct move, end it. On Results the 'Zug des Spiels' chips show 2×2 with '4er auf dem Spielfeld' complete (no '…'). At the bottom, 'Neues Spiel' (gold) and 'Wiederholung' sit side by side on one row. Switch back to Hebrew: the two buttons are still side by side.

### B22 [fixed]
Language 日本語: practice vs Pip › Results. The tag on Pip's avatar reads 'ボット' whole. Language Русский: Results of a bot practice. The award line 'Меньше всех ошибок · …' and the header 'Тренировка с ботом · Быстро · 2 игрока' are complete. Deutsch: the header 'Training gegen Bot • Schnell • 2 Spieler' is complete. Return the language to Hebrew.

NOTES: Review issues addressed:
(1) MEDIUM, B20: the reviewer was right that removing flexWrap could not fix it. I traced the real mechanism in node_modules/react-native 0.86.3. TextLayoutManager measures with a StaticLayout that uses the default FIRSTSTRONG_LTR (there is an explicit TODO at TextLayoutManager.kt:1058). ReactTextView then draws through TextView with FIRSTSTRONG_RTL in an RTL app. The LRI…PDI isolate hides every letter from first-strong detection, so measure and draw used different paragraph directions. The screenshot shows the draw side is RTL: 'A2 →' is right-aligned in its box. numberOfLines 1 with ellipsizeMode clip would NOT fix it on Android, because ReactTextView.setNumberOfLines only calls setMaxLines, so the TextView still breaks the line and drops or ellipsizes the '4'. So I took the reviewer's second option: MoveText draws cell, arrow and digit as separate Texts in an LTR row, matching Replay.dc.html's three nowrap spans. None of them has a break opportunity. I applied it to the results' move of the game too, because the same single-Text pattern there is the same latent bug. The levels best-move line is a Hebrew sentence in a full-width column, so it is not at risk, and I did not touch it.
(2) LOW, QA catalog: updated the 4 lines with Edit (no reformatting); catalog.test.ts passes. That is why serverChanged is true. It is QA catalog data only, no server code, and it takes effect with the next staging deploy.
(3) LOW, 'אני' in ranked replays: documented in docs/01-SPEC.md §13.1 as an override of Replay.dc.html, which shows my name, together with the friends-room subtitle (B44). Worth mentioning to Moshe as a visible change in ranked replays.
(4) LOW, ja/ar/tr/id/vi 'match' word in solo practice: kept, on purpose. docs/i18n/glossary.csv defines 'game' as 対戦 / مباراة / maç / pertandingan / trận đấu ('One game played on a board'). docs/i18n/style/ja.md:56 says '対戦 is one game; ゲーム is the app or the game in general', so ゲーム would break the style guide. The app already uses 対戦 in strings shown in solo practice, e.g. the D65 freeze '対戦を凍結中'. Per-mode keys stay possible if Moshe wants them.
(5) LOW, stale docs: DECISIONS-PENDING §3.7 'built now' is rewritten for B1. The withDecimal comment in format.ts no longer mentions the score line; withDecimal is still used by howToPlayFixtures.
Earlier decisions still stand: B1 keeps the formula as spec §13.2/D129 require and adds the counts in words. B41/B54 use one neutral key. B21 keeps the buttons side by side below fontScale 1.15. Avatar.tsx: the bot chip room shares the file with another agent's B30 change, so please check that the two edits merged cleanly. New shared export: MoveText in components/player/index.ts (one added line).

## levels-map
### B33 [fixed]
Signed in, with progress in the middle of a chapter (for example the next stage is 17): Home > משחק חדש > אימון בשלבים. Without touching anything, the current stage (gold ring) and my avatar token must be visible about 40% down the map, above the bottom panel. Go back to Home and enter again, twice: the same each time. Then play the current stage and choose 'למפה': the map follows to the new current stage, still above the panel.

### B7 [fixed]
Settings > language, one at a time: Español, Português (Brasil), Deutsch, Français, Русский, Italiano, Türkçe, Bahasa Indonesia, Polski, Tiếng Việt, ไทย, Nederlands (and English). Open משחק חדש > staged practice. The header title must be fully visible, on one or two lines and possibly a little smaller, with no '…' and no word split across lines. German 'Etappentraining' should be one line, smaller. The 'star N/900' chip and the back button must be intact. In Hebrew the title is unchanged: one line at full size.

### B30 [fixed]
Map > tap L010 (also L020/L021). In the panel's bottom row (Pip's small avatar with ▲, 'Pip · רמה 1 · טירון'), the chip on the avatar must read the full word 'בוט' on one line, inside the screen and not clipped. Also check it in Japanese (ボット).

### B27 [fixed]
In Hebrew, play to L020 (or use the unlock-all testing switch). On the boss intro / 'מוכן?' screen, the 'מה קשה יותר' chip must read right to left as 'Pip מהיר ב־10%': 'Pip' at the right edge, '10%' at the far left after 'ב־'. Map > tap L010: the panel's bot row reads 'Pip · רמה 1 · טירון' with Pip next to the ▲ on the right. Lose a race: the result reason reads 'Pip הגיע ראשון' and the verdict 'Pip ניצח', with Pip on the right. Tap the gate before chapter 6: the panel's sub line reads 'Biscuit · שלבים 51–60' with Biscuit on the right. Repeat the boss chip in Arabic: 'Pip' on the right.

### B39 [fixed]
With chapter 1 under 20 stars (as in QA: 8/20), open L010 and tap X. The dialog must say 'לצאת מהשלב?' / 'תקבל 0 כוכבים, והשלב הבא יישאר נעול.'. Tap 'יציאה': the result shows 'השלב הבא עוד נעול' and L011 stays locked on the map. Then open a regular stage (for example L005) and tap X: 'תקבל 0 כוכבים, והשלב הבא ייפתח.'. With 20 or more stars in chapter 1 (or the unlock-all switch on), L010's X says 'ייפתח' and L011 opens after leaving. Optionally switch to English and check 'You'll get 0 stars, and the next stage will stay locked.'.

NOTES: Decisions:
(1) B7: I added a generic opt-in ScreenHeader `wrapTitle` in the shared file apps/mobile/src/screens/home/parts.tsx instead of shortening translations, so the 19 names stay consistent with the Modes row. Only the map uses it; every other header keeps the one-line title. The B3/B8 agents can reuse it for the 'משחק חדש' title. The size steps are driven by onTextLayout, because Android's adjustsFontSizeToFit cannot see mid-word breaks. A long title can therefore take 1-3 extra frames to settle when the map opens.
(2) B27: I used a leading RLM in the he/ar translations rather than FSI-isolating names in code. It works on every platform and version without depending on isolate-aware first-strong detection, and it covers both visible lines and labels. A new test enforces the rule for the levels namespace. The Edit tool wrote the RLMs as literal invisible characters, not ‏ escapes; account.json deleteGoogleBody already does the same. The updated test files also contain literal RLM characters, the same way the repo's tests already use literal LRI/PDI.
(3) B39: besides the gate case, I also handled stage 300 ('תקבל 0 כוכבים.') and the quitCountsAsPlayed=false config. The text follows the same computation as the result's 'לשלב הבא', so the dialog and the result can no longer disagree.
(4) B30: the root cause, the Yoga width cap on an absolute child of a column, is fixed in apps/mobile/src/components/player/Avatar.tsx by a parallel agent's botRoom change made during this workflow. I verified it and added a panel-level assertion, but did not touch Avatar.tsx.
apps/mobile/app/levels/play.tsx also carries another agent's B28 change (useAppActive via useSyncExternalStore); I left it as is. No adb, APK build, deploy or commit.

## levels-play
### B11 [fixed]
1) Open L010 (race against Pip) and tap no place. Press HOME exactly as the clock reaches the end. Wait 20 s and return. The result ('הבוס ניצח הפעם' / 'הזמן נגמר', '0 מתוך 5 מקומות') must stay fully visible after 10 s, 30 s and 60 s, including while scrolling. A uiautomator dump must list children under id=level-result. Repeat 3 times, once with HOME at 'עוד 1 ש׳'.
2) Finish a find stage fast for 2-3 new stars. Press HOME about 2 s into the result, just after '+20 XP' counted up. Return after 20 s and wait 10 s: the stars stay gold and the line still reads '+20 XP' (not '+0 XP').
3) Beat a boss (L010 or L020). Press HOME as the crown pops (about 0.3 s into the result) and return after 20 s: the gold crown medallion is full size, not small.

### B28 [needs-device]
1) Play L040 to its result and tap 'לשלב הבא'. While 'מוכן?' of L041 shows (within 1.5 s), press HOME for 90 s, then return. 'מוכן?' must finish its remaining time, or, if the board was already up, it must be covered with 'ממשיכים בעוד 3·2·1'. The clock must read 0:30 (or what it showed before HOME) when play starts. Measure with a stopwatch from the return: 'הזמן נגמר' must come no sooner than about 30 s of visible play later.
2) Repeat, pressing HOME exactly as 'מוכן?' ends and the board appears. The return must show the cover with 3·2·1, and the clock must not have moved.
3) Repeat once with 'שוב' instead of 'לשלב הבא'. If time is lost again, note the exact clock value before HOME and right after the return, and whether the 3·2·1 cover appeared.

### B25 [fixed]
L041 (ציד הנקודות, chapter 5):
1) Place one right digit (for example +3.5), then a wrong digit, so the score becomes −0.5 and the red '−4' chip and 'מהלך 2 נשרף' show. The chip sits above 'נקודות', beside the big number. Neither touches the move dots or 'מהלך 2 נשרף', and the board does not jump.
2) If a move remains, place another wrong digit: the number may get smaller, still whole (no '…'), and nothing overlaps.
3) Repeat with Settings > Display > font size at maximum. The number stays at its normal size or smaller, the small words grow only a little, nothing overlaps, and the number is never cut.
4) Repeat once in English and once in Portuguese (Brasil) or German. 'Jogada 2 queimada' / 'Zug 2 verschenkt' may take two centred lines under the dots, and the score stays whole.

### B29 [fixed]
Same as B25. On L041, after a wrong move, 'מהלך 2 נשרף' and the dots are fully readable, and 'נקודות' is not covered by anything, at normal and at maximum system font size.

### B26 [fixed]
1) Use a race stage never played on this account, for example L013 or L017. Let the time run out with 0 places. The result shows 'הזמן נגמר', '0 מתוך 5 מקומות' and empty stars, with no 'שיא חדש!' and no 'השיא שלך:' line.
2) Tap 'שוב' and take at least 2 places (a star): 'שיא חדש!' shows.
3) Tap 'שוב' and let it run out with 0: 'השיא שלך:' shows with the earned star(s), and no 'שיא חדש!'.

### B35 [fixed]
Same as B26, on L017 if it was not played yet: time up with 0 of 5 shows no 'שיא חדש!'.

### B48 [fixed]
Same as B26, once in Hebrew and once in English: no 'New best!' on a zero-star result.

NOTES: How each review issue was handled:\n\n1. **MEDIUM, B25/B29 HUD under long translations and large text: resolved.** The fixes:\n   - The 64 dp number is capped at ×1.0 (`scale=\"board\"`, the same rule as Score.tsx scoreScale for display scores).\n   - The chip, 'נקודות', the move words and the clock are capped at ×1.35 (`scale=\"hud\"`, BRD-3, components.md §10/§12 policy).\n   - The move words are limited to 96 dp and 2 lines, centred. 96 is the narrowest width that keeps 'verschenkt' at ×1.35 unbroken.\n   - The number may shrink to 0.3 (was 0.5).\n\n   The new hunterHudFit.test.tsx measures it with the shipped fonts on a 360 dp phone in all 19 languages at ×1 and ×1.35:\n   - The widest reachable score ('−28.5': three wrong digits in the costliest cell of a shipped board, worth 9.5) always shows whole.\n   - Worst case is nl ×1.35, which needs 0.318. In Hebrew at normal text, '−0.5' still shows at 0.62 of 64 dp (about 40 dp).\n   - Row height: at ×1.0 two lines of move words (52 dp) stay under the 57 dp score box. At ×1.35 the clock column is already about as tall as two lines, so the board does not jump.\n   - Remaining edge, outside the test: on a 320 dp phone at ×1.35 in de/nl, the theoretical '−28.5' would need about 0.2, so it could be cut with '…'. It still never overlaps.\n\n   Design note for the lead: docs/design/screens/Lv-PointHunter.dc.html L47 draws the counter in Teko 44 (the `rating` token). The app has used scoreXL 64 since 1.0.2. I kept 64 because of Moshe's 'tiny digits' feedback. Switching to 44 would let the number nearly always show at full size; that is your call.\n\n2. **LOW, B11 XP count and boss crown on the same screen: fixed.** I applied the same 'React holds the end state' guard:\n   - BossVerdict: `popped` from the completion callback plus a fallback timer, style scale 1.\n   - XpLine: `settled` timer remounts CountUpText with the final value. Its animated props' initial value, which PropsFilter always applies last, then becomes '+20 XP'.\n\n   Both have regression tests that fail without the guards. The game results screen and the game cards' scores elsewhere were not touched (out of this area). The global alternative is still open: the `staticFeatureFlags` FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS=false setting, which needs a native rebuild.\n\n3. **LOW, B28 reported as 'fixed' without a reproduction: agreed.** The status is now 'needs-device'. Both closed gaps were real and would leak the whole background time. The report's partial leak (about 20 s of play after the return instead of about 33 s) matches neither, so the trigger is unconfirmed. I checked ReadyView's pause logic, BackgroundPause's countdown/resume, and the AppState.currentState ordering at return (RN updates currentState before user listeners run). I found no other leak path. I added no diagnostic logging: console is not stripped in release, but noisy production logs are against the codebase's __DEV__-gated style. The device check asks for stopwatch timing and clock values if it happens again.\n\nDecisions from the first pass, unchanged:\n- B26/B35/B48: 'שיא חדש!' needs a star. docs/01-SPEC.md §12 and components.md §19.10 were updated.\n\nNo APK, deploy, adb, commit, stash or other git write commands were run. No peer-session files were touched. No locale files were touched. The import reformat seen in PointHunterHud.tsx (the clockLabelSeconds import) came from another agent's clock-label change and was left intact.

## home
### B46 [fixed]
Phone 1 (new APK):
1. In the app, Settings > language = 'שפת המכשיר'. On a fresh launch, Home's card still rises and 'שחק' settles.
2. Android Settings > General management > Language: put Deutsch first (he→de), then return to Sudoku Fight from recents. The app restarts LTR in German.
3. Home must show the profile card (avatar, name, 3 ratings, stats row) between the header and 'Spielen', and uiautomator must list testID profile-card. Wait 5 s, open Settings and come back: still there.
4. Repeat with only sv-SE (app in English), then back to Hebrew (restart to RTL): the card is there each time. Do the full switch 3 times in a row.
5. Long-hold case: force-stop the app, then cold-start it with weak or no network so the Splash stays a few seconds. When Home appears, the card, 'שחק' and the recent rows must all be visible, and must stay visible after the ratings load and after a pull or a tab switch.

### B4 [fixed]
Hebrew, Home, 'משחקים אחרונים', with a recent practice against Mr. Hoot (bot level 3) that was lost.
- The row shows the title 'אימון מול בוט · מהיר', then 'הפסד מול Mr. Hoot' whole, with the date and time (e.g. '23 באוק׳, 09:41') whole, beside it or on the next line. No '…' anywhere in the row.
- Same in Arabic ('خسارة ضد Mr. Hoot' and the full date with the time).
- Rows without a rival look as before.

### B8 [fixed]
Set the app to Indonesian and open Home on an account with 10 games and a 40% win rate.
- In the profile card's stats row, '10' and 'pertandingan' sit side by side, or 'pertandingan' is centred under '10', inside the first third.
- Nothing crosses the thin divider, and '40%' 'menang' stays in its own cell.
- Hebrew looks as before (one line per stat).

### B23 [fixed]
Account 'מומו' (provisional), Leaderboard tab, 'כללי' and then 'מהיר'.
- The pinned row at the bottom (leaderboard-me-row, P1 border, 'שחק' beside it) shows '#1', the avatar, '● מומו', and under the name 'בדירוג זמני · רמה 4' whole on one line on the A16, with no '…'.
- On the end side is '1235', with the small 'זמני' chip under the number.
- List rows (e.g. 'אחוותא') still show 'בדירוג זמני · רמה 2' on one line, with '1229 זמני' side by side.
- TalkBack on the pinned row reads the same label as before.
- Known limit, not part of this fix: in long languages (de, ru, ar, es, fr, it, nl, pl, vi, en) the pinned row is still too narrow, so a '…' there is expected until Moshe decides on the layout.

### B10 [fixed]
With the new APK, in Hebrew and then in one other language (e.g. de), run a uiautomator dump on Home, on New Game (משחק חדש) and on the level map.
- The avatar picture nodes (e.g. modes-me-avatar-image, mode-solo-avatar-image, the map token's ...-avatar-image) have an empty content-desc, with no 'neutral'.
- With TalkBack, the Home profile card reads its label (name, country, league/level, ratings, stats), and nothing in English for the avatar.

NOTES: How I handled each review issue:\n\n1. HIGH, B46: held Enter start synced into settledProps. Agreed and fixed.\n- Confirmed in the 4.5.1 sources:\n  - AnimatedComponent.tsx:538-543 renders settledProps after the user's style.\n  - _syncStylePropsBackToReact only ever merges.\n  - ViewDescriptorsSet.add calls updater(true) when a style attaches.\n  - styleUpdater's shallowEqual fails on transform arrays.\n- The fix is the reviewer's option 1. While held, the start is a plain React style and no animated style is on the view. The animated style attaches only once the part starts, with START kept under it, because PropsFilter hands a late-attached handle {} and that would flash one frame.\n- enterSettled.test.tsx models the sync with the flag on. It fails on the earlier version and passes now.\n- Residual edge, not covered: if the UI thread stalls for 1 s or more in the middle of an entrance (e.g. the app goes to the background mid-animation), a mid value could be synced, and if the end is then also dropped, it would override END.\n- The global cure is the reviewer's option 2: \"reanimated\": {\"staticFeatureFlags\": {\"FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS\": false}} in apps/mobile/package.json. It needs a native rebuild and changes every animated view in the app. I did not do it: it can't be verified without a device, and it is outside this area's minimal change. It also bears on B11 (another agent's area). This is a decision for the lead.\n\n2. MEDIUM, B23 dropped the 'בדירוג זמני' words. Agreed.\n- The full line is back in the pinned row. Stacking the chip and allowing 2 lines fix the Hebrew case.\n- The test now checks the full line against the stacked column: 1 line on the A16, at most 2 at 360 dp.\n- List rows, the accessibility label and the QA catalog ('מתחת לשם: סמל הליגה, או בדירוג זמני · רמה N'; 'בצד השני: הדירוג') all agree, so the catalog needs no change.\n- The components.md §5 line is updated to match.\n\n3. LOW, long languages in the pinned row. Not fixed: it needs a layout decision from Moshe, so B23 is closed for Hebrew only, not for all 19 languages.\n- Name column with the chip stacked, at 360/384 dp (font-metric estimate): he 86/110, en 47/71, es 34/58, de 33/57, fr 39/63, it 35/59, nl 35/59, pl 38/62, pt-BR 39/63, id 45/69, vi 31/55, ru 20/44, ar 21/45. The CJK, ko, tr and th columns are 62-82/86-106.\n- In about 12 languages, 'Provisional rating · Level 14' cannot fit 2 lines, because single words are wider than the column. The name itself may also be cut there.\n- The cause is the 'Play' button (81-133 dp) and the rating's width next to it. Options for Moshe: a narrower or icon-only play button in the pinned row (the design, Leaderboard.dc.html, has a 62 px button), or play above the row. This needs to go into the handoff.\n\n4. LOW, ProfileCard.tsx CRLF. Fixed: converted to LF with no content change, and prettier --check is clean.\n\nFor the lead:\n- Enter.tsx and Enter.test.tsx are not in git's index (they were new in earlier rounds), so 'git diff af4c8a5 -- <file>' shows them as deleted. Compare with 'git show af4c8a5:<path>' instead.\n- enterSettled.test.tsx uses jest.resetModules plus require with a flag mock on 'react-native-reanimated/lib/module/featureFlags' (Jest resolves Reanimated to lib/module). It also touches Reanimated internals (AnimatedComponent.prototype, PropsRegistryGarbageCollector.syncPropsBackToReact). It is written against 4.5.1, so a Reanimated upgrade may need it adjusted.\n- B4, B8 and B10 are unchanged since the review, which found them correct.

## newgame-i18n
### B3 [fixed]
(a) Normal resolution, Hebrew, profile name "אורי": Home → "שחק". The header must show "משחק חדש" whole at the start, with "אורי" and the avatar together at the far end. The title must not be missing and must not be a lone "…". (b) Small phone: `adb shell wm size 720x1560`, then `adb shell wm density 320`, then `adb shell cmd locale set-app-locales com.mosheg.sudokufight --locales ru`. Open New Game. Must see: "Новая партия" whole with no "…" (the avatar at the end; the name may be hidden). On "Тренировка с ботом" and "Соло · полное поле", the chips "Без рейтинга" and "Можно без сети" on ONE line. The whole "Тренировка по этапам" card above the hairline of the "Создать | Войти по коду" footer. Take a screenshot, run `adb shell input swipe 360 1200 360 400`, take another: the two must be identical. Repeat in fr ("Nouvelle partie" whole; "Non classée" + "Jouable hors ligne" on one line) and in es ("Sin puntuación" + "Sin conexión" on one line). In de, th, ja, pl and nl the swipe must not move the list at all. (c) Optional, with TalkBack in ru on the small phone: focus the avatar at the header's end; it reads the profile name. Finally run `adb shell wm size reset` and `adb shell wm density reset`, and restore the locale.

### B8 [fixed]
At normal resolution and again under the 360×780 emulation from B3. In id, Home → "Main" → New Game: the header shows "Pertandingan baru" whole, maybe slightly smaller, with no "…", and the avatar at the end. In ru, New Game: the line "Рейтинговые ——— Живые соперники онлайн" is whole, with a visible rule between the title and the note. In nl: "Ranked spelen ——— Tegelijk tegen echte spelers" is whole.

### B9 [fixed]
Play one stage so the row shows progress. In tr, New Game: the "Aşamalı antrenman" row shows "Aşama N · ★ M" and "Çevrimdışı" on one line, not "Offline". In vi: "Màn N · ★ M" and "Không mạng" on one line, and the bot and solo rows show "Không xếp hạng" + "Không mạng" on one line. In nl, the ranked section line reads "Ranked spelen ——— Tegelijk tegen echte spelers".

### B5 [fixed]
In ar, Home → Settings, scroll to the bottom. The small build line must show the new build's sha (e.g. "87760ce-dirty") in one piece right after "البناء", then "· staging · المحرك 0.4.0". The digits must never jump before the Arabic word (never "87760 البناءce-dirty").

### B2 [fixed]
In th, open the "Plurals and numbers" screen (Settings → the hidden testing section, opened by 7 taps on the version → Plurals and numbers). The dates must show 2569 ("2 พฤศจิกายน 2569", "02/11/2569"), not 2026. Then open my player card from Home's profile card: it must read "เล่นมาตั้งแต่ ตุลาคม 2569".

### general-lang19-pseudo [partial]
In ru, Settings → "Меньше движения": the first segment shows "Как на устройстве" whole on two lines, with no "…". Check it ("Come il dispositivo") the same way. Under the 360×780 emulation in en, Home: the bottom bar shows "Achievements" whole, slightly smaller if needed. In en-XA, New Game: the header title has no "…" (the avatar at the end), and Settings' first motion segment is on two lines with its closing ']' visible.

NOTES: Review issues, in order:
1. HIGH, title 0 wide (fixed, confirmed). In Yoga's processFlexBasis (RN 0.86.3), a positive `flex` turns an auto basis into 0, so laying titlesFirst over `titles {flex:1}` left the title box at basis 0 and grow 0. I split the style rather than counting on overrides. `titles` no longer has `flex`. Headers without fitTitle get `titlesRest {flex: 1}`, so the other ~17 screens using ScreenHeader are unchanged. With fitTitle the box gets `titlesFirst`, which has no `flex` at all, plus a comment saying why. Regression check: ModesAndGameType asserts that the flattened title box has no positive flex; this fails on the reviewed version. yoga-layout is not a repo dependency, so a real Yoga layout test was not added; the reviewer's script (scratchpad yoga-scripts/header.mjs) confirms the numbers above. The lead should still do the B3 (a) Hebrew check on the phone.
2. LOW, Me accessibility and pop-in (fixed). Me is one accessible View labelled with my name (accessible only when there is a name), so the name is still read when only the avatar shows. Before the first layout the name now shows, so Hebrew and most languages get no pop-in. A tight language (ru/fr/id) can show the name squeezed for one frame before it hides. Me's width does not depend on its content (flexBasis 0), so this never moves the title. The name-hiding rule itself is still a decision for Moshe to confirm (see 5 below).
3. LOW, es/ar/vi offline wording (partly disagree, with evidence). es: the device proves the long wording wraps. The run-2 sweep (es-2new.xml, 384 dp A16) has \"Sin puntuación\" and \"Funciona sin conexión\" on two lines (y 1217 vs 1296 px; 88 + 130 dp of text, a 260 dp row). The capability phrasings I measured do not fit 226: \"Juega sin conexión\" 241, \"También sin conexión\" 255. \"Juega sin red\" fits, but \"sin red\" is also the idiom for 'without a safety net'. \"Sin conexión\" next to \"Sin puntuación\" reads as a property of the mode, the standard Spanish feature label (\"Disponible sin conexión\"). Kept. ar/vi: the reviewer is right that the long wording fit on the Android device: ar row 186 dp, vi row 220 dp of 226 (ar-2new.xml, vi-2new.xml). The shared estimator puts them at 241 and 251: fontMetrics measures Arabic's isolated forms, plus 10%, and textWidth adds 10% for vi on top of a wide Latin estimate. Repo policy requires every real language to pass, and iOS's system font for Vietnamese is wider than Roboto. No capability phrasing I measured fits that estimate: ar \"يعمل دون إنترنت\" 246, \"متاح دون اتصال\" 238; vi \"Ngoại tuyến\" 231, \"Chơi không mạng\" 259. So ar \"دون اتصال\" and vi \"Không mạng\" stay; each pairs with its row's \"دون تصنيف\" / \"Không xếp hạng\" as a property. I did not change the shared estimator (layout.ts / fontMetrics.ts), because ~10 agents' layout tests depend on it. Suggested follow-up: shape Arabic joined forms in fontMetrics and calibrate the vi margin, then restore \"يعمل دون اتصال\" and \"Không cần mạng\".
4. LOW, it \"Home\" and nl \"live\". nl is fixed: the ranked note is now the Dutch \"Tegelijk tegen echte spelers\" ('at the same time against real players'; 169 dp of 179 dp of room, modesFit passes), so no English loan outside the glossary is left. it \"Home\" is kept, because the project already decided it: scripts/lib/i18n-locales.mjs lists 'ui:nav.tabs.home' among the Italian values allowed to match English ('the Italian word too'), and it/common.json, friends.json and game.json use \"Alla home\" in about 10 places. I did not add a glossary row; the checker's allowlist already records the decision.
Earlier decisions, still open for Moshe to confirm:
(1) On New Game the title wins the header row. My name shows beside the avatar only when about 3–4 letters fit (ME_NAME_ROOM 74); otherwise only the avatar shows, still read as my name. A title too wide for the row (id) shrinks to at least 70% instead of ending in \"…\". I did not use wrapTitle (two lines), because a taller header would eat the tight vertical budget.
(2) The chips line may run into the 12 dp gap before the chevron (226 dp, never under the chevron).
(3) Over the friends footer or the offline actions, the list's bottom padding is 8 instead of 16 (QA's emulation keeps the A16's 50 dp status bar).
(4) D124 shortenings only in the languages that failed the new tests (see 3 above for ar/vi).
(5) B2: Hermes is assumed to honour the ca extension or the calendar option. Both are passed, but only the phone can confirm it. If it still shows 2026, the next step is the region tag 'th-TH-u-nu-latn'.
Shared files I touched this round, each with small Edits: parts.tsx (the styles split), ModesScreen.tsx (Me only), ModesAndGameType.test.tsx (CRLF kept; I checked that all 897 lines are CRLF), components.md §19.1 (one clause), nl/home.json (one value). The temporary measurement probe (apps/mobile/src/screens/home/__tests__/zzProbeNewgameI18n.test.ts) was deleted.

## game
### B36 [fixed]
Phone 1, phone animation settings left at default. Settings → 'הפחתת תנועה' → 'מופעלת'. Home → 'שחק' → 'אימון לבד · לוח מלא' → 'מהיר' → 'התחל אימון'. Start a screen recording (adb shell screenrecord). Tap an empty cell, then type a wrong digit. Expected: no shake. A 2 dp red frame around the cell stays solid about 0.3 s, then fades for about 0.2 s, over at least 4–5 frames at 30 fps. The small red digit appears in the bottom-right corner, and the penalty on my card is red for about 0.3 s. Set the setting back to 'כבויה' at the end.

### B15 [fixed]
Any game with no cell selected: the digit keys look dimmed as before. A zoomed screenshot shows no ambient digit inside any key. Fill all of one digit (count 0): that key is darker and still opaque. Tap a cell: the keys brighten in about 0.24 s, and the 3 dp lip under each key is solid with no digit showing through.

### B50 [fixed]
Ranked 2P between the two phones, no cell selected. Zoom in on keys 1 and 6 and the rest of the keypad while ambient digits drift: no digit inside any key. On the rival's card, zoom on 'הפרעה': no digit inside the button or its frame. With 0–1 points (blocked), the button looks dimmed as before and still hides the digits behind it.

### B12 [fixed]
Settings → 'הפחתת תנועה', with 'כבויה' selected. Zoom in while ambient digits pass the selector: no digit inside any segment or the frame, and the gold tint looks as before. Tap 'מופעלת' and check again. Leaderboard: the tabs 'כללי'/'מהיר' and the 2/3/4 picker hide the digits. History: the streak chip hides them. In a stage of type box/puzzle, make a mistake: the red mistakes chip hides the digits.

### B47 [fixed]
Needs ranked 2P between the two phones (a bot game has no interference button, D44). App language German, then Russian, then Thai: in my card, 'Keine Fehler' / 'Без ошибок' / 'ไม่มีข้อผิดพลาด' in full, on 2 lines if needed, with no '…'.

Then Spanish, Portuguese, French, Vietnamese, Arabic, Dutch, Turkish: while the rival has no cell, their card shows the whole word and the whole button with no '…':
- 'Piensa…' + 'Interferir'
- 'Pensa…' + 'Interferir'
- 'Pense…' + 'Perturber'
- 'Nghĩ…' + 'Phá rối'
- 'يفكر…' + 'تشويش'
- 'Denkt na…' + 'Storen'
- 'Düşünüyor…' + 'Baltala'

While the rival holds a cell, note how the button looks (a known limit, see notes).

### B45 [fixed]
App language Thai, ranked 2P with my score at least 2, tap 'ก่อกวน'. In 'เลือกการก่อกวน', 'ราคา −2 คะแนน · ครั้งถัดไป: 4' and 'คะแนนของคุณ 8.5 → 6.5' do not overlap. The words may take a second line inside the row, and −2 / 8.5 / 6.5 stay full size. All 6 kinds are visible with no scroll. Repeat in German, Russian and Japanese: no overlap and no '…'.

### Q1 [partial]
Phone 1, 'שחק' → 'אימון לבד · לוח מלא' → 'מהיר' → 'התחל אימון'. Lock nothing and wait 3 s.
1. Run `adb shell uiautomator dump /sdcard/q1.xml` 3 times. Expected: 'UI hierchary dumped', not 'could not get idle state'. In the dump, node solo-hud-time-stat has content-desc 'זמן M:S0' or 'זמן M:S5' (a multiple of 5 s) and solo-hud-time has no text.
2. Visually, the clock looks like before (white Teko digits, same height, ticking every second), only slightly more evenly spaced.
3. Optional: `adb shell uiautomator events` for 10 s shows no per-second CONTENT_CHANGE from the HUD.
4. TalkBack on: focus the time stat → 'זמן' and the time (rounded down to 5 s). Focus a locked cell → '…נעולה אצלך, 10 שניות' (not every second).
5. Report, but do not count as failure: a dump while I hold a lock may still fail (pill, strip text and bar), and stage screens may still fail (StarsBar).

NOTES: החלטות וממצאים:

**תגובה להערות הסוקר**
- **בינוני 1, כפתור 'הפרעה' ב־2P שקוף:** תוקן.
  - המילוי והלחיצה אטומים (opaqueOver).
  - במצב חסום יש וילון בצבע color.bg ב־0.5 מעל הכפתור האטום.
  - ניסיתי קודם צבעים מחושבים מראש, אבל a11yAudit דורש שצבע טקסט יהיה מה־tokens. לכן וילון: הטקסט נשאר בצבעי התמה, והמראה זהה ל־opacity 0.5 מעל הרקע.
- **בינוני 2, Q1:** השעון של אימון לבד מצויר עכשיו ב־SVG, והתוויות של שניות הנעילה מתעדכנות בצעדים. פירוט בסעיף Q1.
  - נשאר: בזמן שאני מחזיק נעילה, הטקסט והפס של הנעילה עדיין משתנים כל שנייה. במסכי השלבים, StarsBar מונפש כל הזמן.
  - לכן Q1 מסומן partial. ההכרעה במכשיר.
  - בנוסף: כלי ה־QA (‏adb.ts ‏`ui`) מחזיר dump ישן כש־uiautomator נכשל. כדאי שייכשל בקול. זה שרת, אחר, לא נגעתי.
- **בינוני 3, B47:** קוצר לפי D124 ב־7 השפות, ורשימת החריגים נמחקה מהבדיקה. "Baltala" נבחר כי אין בטורקית קיצור טבעי ל־"Düşünüyor". "Sabotaj" לא נכנס (0.72), והוא שם עצם, בעוד שהמדריך דורש ציווי לכפתור.
- **נמוך:**
  - Choice עם ground: תוקן.
  - צ'יפים: BoxHud, PuzzleHud ו־FindHud תוקנו.
  - עיגול הזמן שנותר: תוקן, עכשיו כלפי מטה.
  - ReactionPicker לא תוקן בכוונה. ה־withDelay שם רץ רק בענף התנועה המלאה, ושם MotionPolicy פותר את System להחלטת האפליקציה (לא מופחת), כך שה־delay לא מדולג. זה לא באג.

**תיקון הסיבה של B36**
- לא הגדרת האנימציות של הטלפון. MotionPolicy מעביר את הגדרת 'מופעלת' ל־ReducedMotionConfig, ואז withDelay בלי Never מדלג על ההמתנה, גם בטלפון רגיל.
- התיקון עצמו נשאר.

**ממצא חדש, B47 כשהיריב מחזיק משבצת**
- בשורה של היריב, כשהוא "בוחר · A8", לפי מודל המדידה כמעט בכל השפות משמאל לימין אין מקום גם לטבעת, למילה וגם למילה על הכפתור ב־0.75. באנגלית, גם בחלוקה אופטימלית יוצא 0.70.
- כיום (מהסבב הקודם) המילה של היריב נשמרת, והמילה על הכפתור מתכווצת ועלולה להיחתך ("Interf…"). האייקון נשאר.
- פתרון מלא דורש החלטה של משה: כפתור עם אייקון בלבד בכרטיס 2P (בניגוד ל־§8.1), או שינוי רוחב או ריפוד של הכפתור. לא שיניתי.

**נמצא ולא תוקן (אזורים אחרים, או מחוץ להיקף)**
- CardIconButton (כניעה ותגובות בכרטיס שלי): opacity 0.4 או 0.5 כשהוא מושבת או בהשהיית התגובות, וגם עמעום הכרטיס (dimmedCard). אותה תקלת שקיפות מול הספרות המשוטטות.
- PointHunterHud (צ'יפים iconBg.danger ו־dangerSubtle): סוכן אחר עורך את הקובץ.
- SpotErrorHud lensFill: מילוי מונפש, ייתכן שהשקיפות מכוונת.
- הרשימה הקודמת (ResultsScreen, BossBand, OfflineBanner, עיגולי אייקונים) עדיין פתוחה.
- numberPlurals.test.ts נכשל בגלל RLM ש־peer הוסיף ל־he/levels.json (hud.duel.meLabel ו־botLabel). לא שלי.

**QA**
- את הזמן באימון לבד קוראים עכשיו מה־content-desc של solo-hud-time-stat, בצעדים של 5 שניות. אין יותר טקסט "3:12" על solo-hud-time.
- תוויות הנעילה בצעדים: 7 שניות נקראות "5 שניות".
- ב־qa-catalog לא מצאתי ציפייה שתלויה בזה.

## perf
### B14 [partial]
New APK on RF8Y60PP2XZ, Home, wait 5 s. Run `adb shell dumpsys gfxinfo com.mosheg.sudokufight reset` and `adb logcat -c`. (a) Tap 'שחק' and wait 2 s, then `adb shell dumpsys gfxinfo com.mosheg.sudokufight framestats`. Write down the longest frame and the time from the tap to the end of the fade (video or screenshots). Before: frames of 310–530 ms and 0.8–1.05 s in total. Now there must be no frame over about 200 ms; expect a first frame of about 130 ms and about 0.45–0.6 s in total. Over 0.5 s confirms that B14 stays partial until the native patch. Repeat 'שחק' a second time (Back first): it should be a little faster, since the markups are already parsed. (b) Back arrow, then system Back: Home within about 0.4 s. Its avatar is the same picture with no flicker during the fade and starts idling about 1 s later. The recent games list does not flash or re-animate. (c) Settings icon: Settings within about 0.35 s (was 0.5–0.65 s), then back. (d) `adb logcat -d | grep -c "synchronouslyUpdateUIProps failed"` must be 0; it was about 250 per change of screen from Home. (e) Bot game: make correct moves and one mistake. No hitch when the card avatars' reactions end, and the count stays 0. (f) Game → results: finish that bot game. Run `adb logcat -c` and the gfxinfo reset just before the last move, then after the results show take framestats and the grep count. Expected 0 failures and no frame over about 200 ms. If failures show up, report them: that is the residual game→results exposure noted in PERF.md. (g) Edit profile → avatar picker, choose 5 avatars quickly: no freeze, count 0.

### B32 [fixed]
Settings → 'פיראטים' (/dev/pirates), idle on. Run `adb logcat -c`. Tap the 'דמות' buttons 1→9 and back, about every 0.8 s, for 30–60 s. There must be no 'isn't responding' dialog, and every tap responds at once. On each switch the old character disappears for a moment, the new one appears still, then the stage starts idling, all within about 1 s. Then tap several motion buttons (e.g. נדנוד, קפיצה) and expressions, and switch character during a motion. `adb logcat -d | grep -c "synchronouslyUpdateUIProps failed"` must be 0, with no logcat flood (QA saw 309 MB in 2.5 min).

NOTES: Status: B32 is fixed. B14 is partial on purpose and is reported as partial (PERF.md says so in plain words): 'שחק'→'משחק חדש' is expected at about 0.45–0.6 s, still inside the bug's range, and none of it has been measured on a phone yet.

Reviewer issues:
- Medium (B14 not finished): addressed as far as low-risk JS allows.
  - Implemented the suggested parsed-SVG cache (SvgMarkup, a 96-entry LRU). I measured its value first: in Jest, parse is about 7% of an avatar's JS; the rest is react-native-svg building one component per shape.
  - Decided against the Reanimated native patch this round. It needs patch-package (a new dependency and postinstall, and an npm install in a working tree that ~10 agents share), a native build and its own device check, and the area rules forbid builds and require low-risk changes.
  - The exact diff is saved at C:/Users/mosheg/AppData/Local/Temp/claude/c--Users-mosheg-Documents-ReactNative-sudoku-fight/4440d2fa-e446-41ad-83db-f79035cdf42c/scratchpad/perf/reanimated-onEventDispatch.patch and described in PERF.md. It needs Moshe's OK.
  - Added framestats for 'שחק'→'משחק חדש', with pass criteria, to the deviceCheck.
- Low (homeTransitions hid the focus re-renders): fixed the cause rather than the wording. practiceHistory is now stale-while-revalidate, and the test runs the focus effect on every focus. Server-driven refreshes (refreshMyProgress, refreshMeIfStale) can still re-render Home when their data arrives, after the transition has started; PERF.md says so.
- Low (game→results): no code change, a deviceCheck step (f) instead, plus a note in PERF.md.
  - Reasoning: the results load asynchronously (load() returns a Promise; practice results come from SQLite), so their avatars most likely mount in a later frame than the one that deletes the game.
  - Stale tags there would also come from non-avatar game views (TimerRing, cells, Score), which AvatarArt cannot control.
  - ResultsScreen.tsx is being edited by another agent this workflow, so I did not touch it.
- Low (timers Map): fixed, with a regression test using React 19.2's Activity.

New finding, from the Reanimated 4.5.1 source and not measured: useAnimatedStyle seeds `last` with the initial style, and its first mapper run compares the `transform` arrays by reference. So every Animated.View with a transform style (each tactile button has 2, each PressableCard 1, each Enter 1) writes once on mount and stays in the props registry for 2 s. On a new screen, that list is mostly the screen's own buttons and cards, which is why the first draw of 278 shapes still costs about 130 ms.
- A JS-only alternative to the native patch: attach those animated styles only while moving, as Enter already does before it starts (B46).
- It touches press feedback app-wide, and tactile.tsx and Enter.tsx are being edited by other agents right now (slant, B46), so I left it as a documented follow-up.

Other decisions:
- AST_CACHE_SIZE = 96: a few dozen kB per tree, enough for a list screen plus the screens around it.
- SvgMarkup no longer hands the markup string to the native Svg view as a prop. SvgXml did, and the native view never used it.
- sameGames compares rows with JSON.stringify: 20 small plain rows from SQLite.

Shared files: jest.setup.ts got one small mock block next to the existing react-native-svg mock. AvatarArt.tsx keeps the B10 change (accessibilityValue only under NODE_ENV test). PERF.md edits stay inside the B14/B32 section.

No UI strings or locales changed, nothing on the server, no engine changes, and no peer-session files touched. A temporary perf probe test I created under apps/mobile/src/__perftmp__ was deleted.

## server-tools
### B6 [fixed]
Needs a staging server deploy, not the APK. On the phone in Samsung Internet (and Chrome), portrait: 1) Open https://sudoku-fight-staging.fly.dev/legal/privacy?lang=he. The top bar shows 'סודוקו פייט' on one line at the right, and under it the 19 language names in about 6 rows, each name whole on one line ('Português (Brasil)', 'Bahasa Indonesia', 'Tiếng Việt' not broken). 2) Swipe sideways: the page must not move, and there must be no empty area to the left. 3) Repeat with ?lang=ar, ?lang=pt-BR, ?lang=en, and /legal/terms?lang=de and /legal/delete-account?lang=ja. In ar the bar starts from the right; in en, pt-BR, de and ja it starts from the left. 'Sudoku Fight' is on one line. 4) Open https://sudoku-fight-staging.fly.dev/r/123456?lang=he and /r/123456?lang=pt-BR: same header, the code '123 456' and the 'open in app' button, no sideways scroll. 5) Tap a language name: the page reloads in that language, and the current one shows bold without underline.

### Q2 [fixed]
No APK needed (PC script). With a phone connected:
1) Open a screen that keeps moving (Home with the floating digits, or a game in progress). Run 'npm run adb -- --device <serial> ui' a few times. Each run must either list the current screen's labels, or after up to ~30s exit with code 1 and print 'uiautomator could not read the screen (3 tries): ERROR: could not get idle state.' plus 'Something on the screen keeps moving: wait and run ui again, or take a shot.'
2) It must never show the labels of the screen you were on before. To check, run 'ui' on Settings, go back to Home, run 'ui' again: either Home's labels or the error, never Settings' labels.
3) After a failed run, 'adb -s <serial> shell ls /sdcard/qa-ui.xml' says 'No such file'.
4) On a still screen (Settings), 'ui' works as before, and 'npm run adb -- tap "<label>"' taps it.
5) 'npm run adb -- shot' still prints a path to a PNG that opens. 'npm run adb -- shot C:/tmp/x.png' twice overwrites x.png.

NOTES: - The phone I was allowed to use, RF8Y80NPLZW, was not connected; adb devices showed only RF8Y30L038L and RF8Y60PP2XZ. So I did not test a live uiautomator dump. I did not touch the other two phones, beyond seeing them in 'adb devices -l'.\n- How the Q2 failure looks comes from AOSP DumpCommand: the idle-state and null-root errors go to stderr, no file is written, and the process returns normally (exit 0). That is why the fix deletes the old file first and checks that the file read back is a whole hierarchy, instead of trusting the exit code.\n- Decisions I made on my own:\n  (a) B6: all 19 language names wrap under the brand as plain wrapped links, instead of moving them into a <details> menu. That is the smallest CSS change, and the pages stay script-free with the 44px touch targets. The cost is a taller header on phones: ~330px, 6 rows.\n  (b) Q2: 3 tries, 500ms apart. Each idle failure already costs ~10s inside uiautomator, so the worst case is ~31s before exit 1.\n  (c) 'shot' deletes the given file name before capturing, so a failure never leaves an older picture under that name.\n- I updated no docs. No doc describes the web pages' language bar. The QA skill (.claude/skills/qa-run/SKILL.md) points to the adb.ts header, which I updated.\n- links.test.ts (a peer file) was not edited.\n- B6 reaches users only after a staging server deploy. The adb.ts change is a local dev script.

