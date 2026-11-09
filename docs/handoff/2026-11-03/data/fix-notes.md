# What the fix round changed, per bug (for fix notes)

## B13 [fixed] area skew task general-depth-gold
New apps/mobile/src/components/ui/slant.tsx. slantTransforms(deg) splits skewX into a closed-form 2x2 SVD: an outer view that rotates about -42.99° and stretches (scaleX 1.0727, scaleY 0.9322), and an inner view that rotates about 47.01°. outer·inner is exactly skewX(-8°) about the centre, and each part is something an Android View can apply, so the same code draws on both platforms. Slant renders the two views as an absolutely placed, pointerEvents-none sibling behind the content. In TactileSurface with skew, the edge is a Slant (edge colour, radius, depth offsets) and the face's whole look (faceStyle: gradient, inset highlight and shade, border, disabled flat look) moves onto a slanted plate inside the face box. The face box keeps the layout, the press translateY and an explicit NO_BORDER, and the label sits upright beside the plate. Button.tsx: the label counter-skew (UNSKEW) is gone.

## B16 [fixed] area skew task general-depth-pair
Same fix as B13. Button's skew prop (the pair rule) now draws the slate or danger plate and edge through Slant, the same as the primary. ConfirmModal, ModesScreen's friends footer and ResultsScreen pass skew as before, so no screen code changed.

## B19 [fixed] area skew task postgame-results-v2-action-pair
Same fix as B13. The results action pair draws a slanted plate and edge via Slant.

## B38 [fixed] area skew task network-surrender-cancel
Buttons: same fix as B13. VS badges: VsBadge and FoundView's VS box now draw a Slant plate (vsBadge bg, border and radius) behind the word 'VS'. 'VS' stays upright, with no counter-skew any more; FoundView's word used to be skewed on iOS. The box keeps its 36x24 size and centring.

## B49 [fixed] area skew task game-surrender-ranked-dialog
Same fix as B13. A disabled slanted button draws the flat disabled look (surface2, hairline border, no edge) on the slanted plate. Disabled to enabled now switches the plate's look; the face box keeps NO_BORDER in every state, and faceStyle still sets an explicit border width in every state. So the RN 0.86 Android NaN-border gradient crash guard still holds.

## general-depth-disabled [fixed] area skew
Same fix as B13 and B49: the disabled look is drawn on the slanted plate. The NO_BORDER guard is kept for the disabled to gold transition.

## general-depth-no-pair [fixed] area skew
The same Slant fix makes 'התחל משחק' slanted, disabled or gold. 'שתף קישור' and 'העתק קוד' are unchanged on purpose (by design, components.md §1.0 and §1.2 'Not skewed on its own').

## B42 [fixed] area online task avatars-pirates-rival-phone
apps/mobile/src/game/onlineSession.ts: `profiles` is now a getter. It returns the given profiles (ranked) if there are any, otherwise the avatars and flags from the host's lobby seats (friends rooms). Names and ratings stay out, so the ranked-only loading card is unchanged. The result is cached per lobby object so the screens' useMemo stays stable. A dev room's lobby has names only, so it still gives null. retryOnline() passes online.profiles on, so a friends retry keeps them. Ranked behaviour is unchanged because given profiles win.

## B51 [fixed] area online task avatars-pirates-rival-fake
Same fix as B42 (OnlineSession.profiles getter that reads the lobby seats' avatarId and country).

## B37 [fixed] area online task pregame-found-countdown-reduced
Server (authoritative): see B43. The count now starts at least FOUND_HOLD_MS (1200) after 'found', when the phones are idle. Client: matchModel.countdownStepOver(remaining, span). MatchScreen records when the count first showed (countdownSince). A count shown late runs its three digits evenly over the time left (none skipped, GO stays on server time). Under 250 ms per digit the first digits are dropped. countdownStep(remaining) is unchanged for its other callers. MatchScreen also records when GO! first showed and calls onPlay only after GO_HOLD_MS (= tokens sequence.matchFound.boardRevealAt − goAt = 400), on the screen's own useNow tick. The friends room countdown is unchanged. Docs: 01-SPEC §10 (ספירה לאחור), motion.md §4.6 rows countdown.digit and go.

## B43 [fixed] area online task avatars-idle-still
Server stays authoritative. MatchmakingConfig.foundHoldMs (default FOUND_HOLD_MS = 1200, a new protocol constant matching tokens sequence.matchFound.countdownAt). Match.foundAt is set when 'found' goes out. A new everyoneIn() starts the countdown at once if the hold has passed. Otherwise it arms a holdTimer that starts it at foundAt + 1200 if everyone is still in. A player who drops during the hold is waited for as before: the count starts when they are back, or the ready check at readyBy calls the match off. clearMatchTimer clears the hold timer too. Late connections (after 1.2 s) start the count at once, as before. Old apps need no change. Docs: 01-SPEC §10 (נמצאו), motion.md vs.slam row.

## B40 [fixed] area online task postgame-results-v2-new-game-friends
The start box (or the guest's wait line) and 'יציאה מהחדר' moved into a footer pinned under the ScrollView (testID friends-lobby-footer), as in GameTypeScreen and ModesScreen. It has a hairline top border and paddingBottom = bottom inset + space[6]. The scroll now holds the code card, game type and seats with a plain paddingBottom. The footer uses the same enter animation, so reduced motion is respected. Works with iOS's home-indicator inset too. Docs: components.md §20.5. Other footers checked: JoinCodeScreen's content is short (button mid-screen); the friends failed/closed StateViews are centred; the dev-only LobbyView (connection) has the same scroll pattern but is not reachable in production, so it was left as is.

## B53 [fixed] area online task friends-game-start-button
Same fix as B40: the pinned footer (start, hint, leave) above the bottom inset.

## avatars-pirates-crash-join-code [fixed] area online
apps/mobile/src/screens/friends/JoinCodeScreen.tsx: while joining, a status row (accent Spinner + 'מצטרף לחדר…', the existing key join.joining) takes the button's place. It is as tall as the button (size.buttonMd) so nothing moves, and it is a polite live region. After a refusal, 'הצטרף' comes back. No new strings, and the shared Button is untouched. Docs: components.md §20.6.

## B1 [fixed] area postgame task general-lang19-arabic-solo
PlayerExplanation now carries the engine's breakdowns (`score` and `penaltyScore`, both MoveScore | null), and ReplayStep.scoreLine is gone, so the model stores no strings. ReplayParts.calculationOf writes the formula through a new key, replay:explain.formula ("9 − {{x}} + (9 − {{y}}) / 2 = {{points}}"). It is an LTR isolate and uses the language's decimal separator. Under it a caption names the two counts that set the score (e.g. "6 בשורה, 5 בריבוע"). The caption reuses the results helper scoreCountsOf and the existing keys game:results.best.filled.*. Spec §13.2 and D129 keep the full calculation line in the replay, so the line stays, without the English word. The card's accessibility label carries both. Updated docs/01-SPEC.md §13.2 and docs/DECISIONS-PENDING.md §3.7 ('built now'). Also updated the stale withDecimal comment in components/player/format.ts.

## B18 [fixed] area postgame task postgame-results-v2-best-move-replay-line
The replay cards now take their names the way the explanations do. My card is always t('replay:me') = 'אני', and it keeps colorIndex 0 (P1). The other cards take the replay's player names, the same as the explanation heads. docs/01-SPEC.md §13.1 now records that my replay card is 'אני' in every mode, overriding Replay.dc.html, which shows my name.

## B24 [fixed] area postgame task postgame-replay-explain-correct
Same fix as B18: my replay card is named t('replay:me') = 'אני'.

## B31 [fixed] area postgame task avatars-id-everywhere
Same fix as B18. The bot card keeps its own name from the replay's players.

## B34 [fixed] area postgame task avatars-pirates-game
Same fix as B18.

## B20 [fixed] area postgame task postgame-replay-explain-correct
New component components/player/MoveText.tsx draws the move as Replay.dc.html does, as three spans in an LTR row that never wraps: each word of the translated move ('A2', '→', '4') is its own Text, side by side, with direction 'ltr', alignItems baseline, and the design's gap of 4. A Text with no space and no isolate has no break opportunity: 'A2' starts with a Latin letter, so measure and draw both read it LTR (a BoringLayout on both sides), and '→' and the digit are single characters. ReplayParts uses it for the explanation card's move. The card's accessibility label still says the whole '⁦A2 → 4⁩'. The no-op `move: { flexShrink: 0 }` style was removed. The technique keeps flexShrink 1 and numberOfLines 2 beside it. The results screen's move of the game drew the same single ltr() Text in a row (the same latent bug, seen whole there only by sub-pixel luck), so it uses MoveText too (testI

## B44 [fixed] area postgame task avatars-pirates-rival-phone
replaySource.fromServer copies game.friends into ReplayMeta (`friends?: true`). When it is set, ReplayScreen's subtitle uses t('friends:mode') = 'עם חברים', the same key and source of truth as the history card. docs/01-SPEC.md §13.1 records it. Results already labels friends games from OnlineSession.isFriends, and its 'באימון הזה' line is fixed under B41.

## B52 [fixed] area postgame task avatars-pirates-rival-fake
Same as B44: ReplayMeta.friends, then friends:mode in the subtitle.

## B41 [fixed] area postgame task postgame-results-v2-new-game-friends
One neutral wording that is right in solo, bot, ranked and friends games. It is about MY moves, because the card shows my best move. he: 'לא היה לך מהלך נכון במשחק הזה'. en: 'You had no correct move in this game'. All 19 locales have real translations that use the glossary term for 'game' (مباراة, Spiel, partie, 対戦, партия, maç, 对局…) and the style guides' forms of address (pl and ru avoid gendered past forms).

## B54 [fixed] area postgame task game-surrender-ranked-dialog
Same as B41: neutral wording in all 19 locales.

## B17 [fixed] area postgame task postgame-results-buttons-large-font
(1) A CountChips component lays the chips out in a wrapping row. There are four columns while every label fits in up to 2 lines broken between words; each label reports its lines through onTextLayout. A new pure helper, breaksInsideWord(text, lines), detects a mid-word break, ignoring CJK/Thai, spaces and hyphen/ZWSP hints. A mid-word break or a label of 3+ lines steps the chips down to 2×2, then to one per line. There is one step per layout, and it resets on a new window size, font scale or language. Labels no longer have numberOfLines, so they never end in '…'. (2) The header and award title Texts lost numberOfLines and wrap at word boundaries. (3) The avatar's bot chip sits in an absolute row 96 dp wide, with numberOfLines 1, scale 'hud' (×1.35 cap) and minHeight 18. docs/design/components.md updated.

## B21 [fixed] area postgame task postgame-results-v2-languages
(1) CountChips as in B17. (2) The actions row no longer wraps at normal text sizes. Each button has flexGrow 1, flexShrink 1, flexBasis auto and minWidth 0, so both narrow in proportion and each label shrinks inside its button (Button's FIT_LABEL). The row wraps only at fontScale ≥ LARGE_TEXT_SCALE (1.15). Following D124, three labels were shortened: fr history:results.replay 'Revoir', it 'Rivedi', id game:results.actions.newGame 'Main lagi'.

## B22 [fixed] area postgame task postgame-results-v2-languages
(1) The avatar's bot chip has its own 96 dp room, one line, ×1.35 cap. (2) The award title wraps (no numberOfLines). (3) The header caption wraps between words. All three are layout fixes; no fonts were made smaller.

## B33 [fixed] area levels-map task avatars-pirates-everywhere
LevelPath now passes FlatList's onContentSizeChange up as onContentReady. LevelMapScreen places the map once, after both the list height and the first content layout are known, whichever comes second. VirtualizedList calls our onContentSizeChange only after its own initial jump, so our openOffset scroll always comes last. follow() and onJump are unchanged.

## B7 [fixed] area levels-map task general-lang19-sweep
ScreenHeader gets an opt-in wrapTitle prop, used only by LevelMapScreen. The title (WrappingTitle) starts at screenTitle size with no line limit. It reads the phone's own lines (onTextLayout), and while they are more than 2 lines, cut short, or broken inside a word (wrapsWhole), it steps down 2 at a time to TITLE_WRAP.minSize 18, with the line height scaled. At 18 it allows 2 lines with an ellipsis as the last resort. A new title starts again at full size. CJK and Thai titles have no spaces, so they get one line. The default ScreenHeader path is unchanged. components.md §19.3 is updated.

## B30 [fixed] area levels-map task levels-panel-bot
No code change from me. While I was working, a parallel agent fixed this same root cause in apps/mobile/src/components/player/Avatar.tsx (it reported it as the Japanese 'ボッ' cut). The chip now sits in a 'botRoom' wrapper: absolute, 96 dp wide, row direction, numberOfLines 1, scale 'hud'. I checked that this covers the panel's 22 dp avatar in RTL: the chip keeps its start −9 position, takes the width of its word, and stays 7 dp from the screen edge. I did not edit Avatar.tsx, to avoid clashing with that change.

## B27 [fixed] area levels-map task levels-boss-l020
In he and ar levels.json, every line that has Hebrew or Arabic letters and begins with a Latin name or a {{bot}}/{{name}}/{{cell}} placeholder now starts with an RLM (U+200F). That fixes the paragraph direction on every Android and iOS version, whether or not the platform skips isolates. ar result.botWon also got an RLM, to keep the bidi parity i18n:check requires with Hebrew. Two labels made only of placeholders, which TalkBack reads and nothing lays out (result.opponentLabel, hud.race.meLabel), were left without one: the ar-XB pseudo check fails otherwise. The rule is documented in docs/i18n/style/ar.md.

## B39 [fixed] area levels-map task levels-gate-locked
mapModel.afterQuit(levelId, records, openedChapters, rules) returns 'opens', 'locked' or 'last'. It uses the same reading as the result's 'לשלב הבא' (nextAfterAttempt with a 0-star quit), so quitCountsAsPlayed, opened chapters and the unlock-all switch all count. levelWording.exitBodyText maps it to exit.body, the new exit.bodyLocked ('תקבל 0 כוכבים, והשלב הבא יישאר נעול.') or the new exit.bodyLast ('תקבל 0 כוכבים.', for stage 300). levelChrome.useExitBody reads levelsStore progress, opened chapters and the unlock-all switch. It is used by TapLevelScreen, PuzzleLevelScreen, and LevelStage in play.tsx, which passes it through the new levelChrome option exitBody. Both new keys are in all 19 locales. 01-SPEC §(the X), components.md §19.6 and QA-CHECKLIST are updated.

## B11 [fixed] area levels-play task general-background-freeze-bot
In each case React now holds the end state once the entrance is over:
- **Result container:** gets a plain {opacity: 1} after the fade (the `entered` state, set from the withTiming completion callback, plus a fallback timer at fade + 400 ms). testID level-result-content.
- **StarRow RevealStar:** `popped` is set when the pop ends, and the style becomes opacity 1, scale 1.
- **BossVerdict crown (new, from the review):** `popped` is set from the completion callback, with a fallback at bossWonPopMs + 400 ms, and the style becomes scale 1.
- **XpLine (new, from the review):** a `settled` state is set at revealMs + scoreCount + 400 ms. It remounts CountUpText (key 'settled') with the final value, so React's own initial text is '+20 XP'.

Nothing changes visually in normal use, and Reduced Motion paths are unchanged.

## B28 [needs-device] area levels-play task levels-freeze-bot
Unchanged from the first pass:
- **(a)** AppStateSource gets an optional `currentState`. BackgroundPause starts `appActive` from it ('background'/'inactive' count as away; 'unknown' counts as active) and has a new `started()`. levelSession calls it right after the start, so a stage that starts while away starts frozen and counts 3-2-1 at the return.
- **(b)** play.tsx useAppActive uses useSyncExternalStore over AppState.currentState, which reads the state again after subscribing.

The levelSession doc comment was updated. Practice shares BackgroundPause and only gains a correct starting state.

## B25 [fixed] area levels-play task levels-hunter-rules
PointHunterHud:
- **Number:** stays on one line, auto-fits (`adjustsFontSizeToFit`, flexShrink 1), and is capped at ×1.0 of the system text size (`scale="board"`). This follows the codebase's rule for display scores of 40 dp and up (Score.tsx scoreScale). It may now shrink to `HUNT_ROW.scoreMinFontScale` = 0.3 instead of 0.5.
- **Side column:** 'נקודות' and the '−N' chip stack beside the number (chip on top) and never shrink. Their size is capped at ×1.35 (`scale="hud"`, BRD-3).
- **Move words:** capped at ×1.35, `numberOfLines={2}`, centred, and at most `HUNT_ROW.movesTextMax` = 96 dp wide, so a long translation wraps instead of eating the halves.
- **Clock:** its value and caption are capped at ×1.35.
- **Row height:** stays fixed, set by the 64 dp line box.

Result, measured: on a 360 dp phone in all 19 languages, at normal text and at the ×1.35 cap (every larger size stops there), th

## B29 [fixed] area levels-play task levels-hunter-hud
Same as B25: font-scale caps (number ×1.0, row words ×1.35), move words limited to 96 dp and 2 lines, auto-fitting number down to 0.3, and 'נקודות' with the chip in a side column.

## B26 [fixed] area levels-play task levels-region-ready
Decision: 'שיא חדש!' needs a star, meaning new stars or a measure that is now the stored best in an attempt with at least one star.
- A zero-star end never shows 'שיא חדש!'.
- It shows 'השיא שלך: ★★' when an earlier attempt earned stars.
- It shows no record line while the best still has no star.

Docs updated: docs/01-SPEC.md §12 and docs/design/components.md §19.10.

## B35 [fixed] area levels-play task avatars-pirates-map-coin
Same as B26: 'שיא חדש!' only for a result with at least one star.

## B48 [fixed] area levels-play task general-lang-signed-numbers
Same as B26.

## B46 [fixed] area home task general-lang19-phone-german
apps/mobile/src/components/ui/Enter.tsx (Moving): the style is animated only while the part moves. Before and after, React owns the start and the end.
- While held (not started): style = [style, START]. START comes from startOf(kind, distance): opacity 0 plus translateY or scale. No animated style is on the view, so the registry never holds this view's start and nothing can be synced back.
- Once started: [style, START, animated]. START stays under the handle, because a handle attached after the first render gets {} from PropsFilter, and that would flash one frame.
- Once ended: [style, END[kind]], as in the earlier fix. 'ended' comes from the withTiming/withSpring finish callbacks (scheduleOnRN), or from the ENTER.endSafetyMs JS timer as a safety net. 'play' is latched in state.
- All screens using Enter get this: Home, Modes, GameType, BotSelect, recent rows, History, Leaderboard, Prog

## B4 [fixed] area home task general-lang19-arabic-rtl
(Unchanged since the review, which found it correct.) subRow now wraps: flexWrap 'wrap', alignSelf 'stretch', columnGap 8, rowGap 4. When the result and the date don't fit one line, the date goes under the result, both whole. On a narrow phone in a long language, either piece may take a second line (SUB_LINES = 2) before an ellipsis. No string changes.

## B8 [fixed] area home task general-lang19-sweep
(Unchanged since the review, which found it correct.) The stat row wraps (flexWrap 'wrap', columnGap 6). The label gets flexShrink 1, textAlign center and up to 2 lines. A label that doesn't fit beside its number goes under it, inside its own third, and never past the divider. The file is also converted from CRLF to LF line endings (review, low), with no content change, so prettier --check is clean.

## B23 [fixed] area home task avatars-pirates-board-pinned-compact
Compact row only. The 'זמני' chip goes under the rating number (new optional Rating prop 'stacked'; the default is unchanged, STACKED[size]), as on Home's card. This gives the name column about 36-40 dp more.

After the review, the line under the name is again the FULL 'בדירוג זמני · רמה N', the same as list rows and the QA catalog. The earlier 'רמה N'-only text is reverted. The line may take 2 lines (numberOfLines 2) before an ellipsis.

List rows are unchanged: one line, chip beside the number. The docs/design/components.md §5 'Provisional' line is updated to match. Not closed for long languages; see notes.

## B10 [fixed] area home task general-lang19-sweep
(Unchanged since the review, which found it correct.) AvatarArt sets accessibilityValue only under Jest (process.env.NODE_ENV === 'test', the guard the app already uses in moderation.ts, connectivity.ts, appProgress.ts and friendsDevice.ts). In a build the picture carries no accessibility text. It stays hidden and decorative, and a labelled lone Avatar still speaks only the player's name. The doc comment is updated. No new string: the existing name and card labels already name the player.

## B3 [fixed] area newgame-i18n task general-lang19-fit-new-game
(1) ScreenHeader has a new opt-in `fitTitle` prop (parts.tsx). `styles.titles` no longer carries `flex`. A header without fitTitle gets `titlesRest {flex: 1}`, which is exactly as before. With fitTitle, the title box gets `titlesFirst {flexGrow 0, flexShrink 1, flexBasis 'auto'}` with no `flex` at all, so it keeps its natural width and shrinks only when the row is too narrow. The title Text uses adjustsFontSizeToFit with minimumFontScale 0.7 (TITLE_FIT). The Modes header turns fitTitle on. Me fills the rest of the row (flexGrow 1, flexBasis 0, minWidth = the 34 dp avatar, justifyContent flex-end). It reads its width with onLayout and shows the name only where a few letters fit (ME_NAME_ROOM 74). Before the first layout it shows the name, so nothing pops in where the name fits. Me is now one accessible element labelled with my name, so it is still read as my name when only the avatar show

## B8 [fixed] area newgame-i18n task general-lang19-sweep
id title: fixed by ScreenHeader fitTitle (see B3; with the review fix, the title box really gets 226 dp in Yoga and the font shrinks to about 86%). Section notes were shortened per D124. Ranked note: ru "Живые соперники онлайн", ar "خصوم حقيقيون، مباشرةً", id "Lawan sungguhan, langsung", pl "Prawdziwi gracze, na żywo", nl "Tegelijk tegen echte spelers" (this round, replacing the English loan "live"; see B9), vi "Đối thủ thật, trực tiếp". Practice note: fr "Sans pression ni classement", it "Senza pressione né punteggio", vi "Thư giãn, không xếp hạng". The offline and suspended lines on the same screen were shortened too.

## B9 [fixed] area newgame-i18n task general-lang19-sweep
With the chips row now allowed into the gap before the chevron (226 dp, see B3), tr levels.offline is "Çevrimdışı" and vi levels.offline is "Không mạng". vi chips.offline and availableOffline are "Không mạng" too, so vi uses one word everywhere. The other words the tester listed were reviewed against the style guides. id "Mode ranked" and "Room baru" are allowed: the glossary keeps ranked and room in English for id. nl "Ranked spelen" is allowed (style/nl.md: ranked). nl "realtime" and its first replacement "live" are both English loans that the glossary does not list, and style/nl.md says 'Everything else in Dutch'. So the ranked note is now the Dutch "Tegelijk tegen echte spelers". it "Home" was kept, because it is an explicit project decision: scripts/lib/i18n-locales.mjs allows 'ui:nav.tabs.home' to match English under 'the Italian word too', and it/common, friends and game already u

## B5 [fixed] area newgame-i18n task general-lang19-arabic-rtl
VersionInfo.tsx passes ltr(info.build) and ltr(String(engine)) into t('appVersion.build') and t('appVersion.engine'), so each value has its own isolate inside the line's LTR isolate. No locale changes.

## B2 [fixed] area newgame-i18n task general-lang19-numbers-screen
compose.ts has a CALENDARS map ({ th: 'buddhist' }). intlLocale now names the calendar: 'th-u-ca-buddhist-nu-latn', or 'th-u-ca-buddhist' when westernDigitsEverywhere is off. dateFormat also passes { calendar: 'buddhist' } in the options. Every other language is unchanged. There are no calls to toLocaleDateString, toLocaleString or Intl.DateTimeFormat outside the helper.

## general-lang19-pseudo [partial] area newgame-i18n
SettingControls Choice: the segment text uses numberOfLines SEGMENT_LINES (2), which fits the segment's 44 dp minimum height. BottomNav: labels use NAV_LABEL_FIT (adjustsFontSizeToFit, minimumFontScale 0.7), so a label shrinks instead of ending in "…". components.md §16 is updated. en-XA is 40% longer by design, and its misses are noted rather than failed (layout.ts expectFits). Even after these fixes, en-XA can still cut "[Åçĥîévéméñťš one]" in the bar and some section notes on a 360 phone. That is expected, hence partial.

## B36 [fixed] area game task game-moves-reduced-wrong
Done in the earlier round, kept: ReduceMotion.Never on every withDelay that is part of a chosen variant. That covers FlashLayer (the frame's hold and the wrong digit's shrink), Score.tsx (×2), ActivityLine MistakesText, ReactionLayer's reduced float and FlightLayer (×4). This round I corrected the root-cause comments in Cell.tsx and in the test, which had blamed only the phone's animation scale.

## B15 [fixed] area game task general-depth-keypad
Earlier round, kept: every key stays opaque. A color.bg veil over the face and lip has opacity 1 − keyAlpha × rowLevel, using the same 240 ms withTiming. The row's opacity and needsOffscreenAlphaCompositing are gone. The armed lip is pre-blended with theme/blend.ts opaqueOver(). components.md §12.1 and motion.md keypad.arm are updated.

## B50 [fixed] area game task general-ambient-everywhere
Same as B15. The same rule now also covers the 2P 'הפרעה' button, which the reviewer flagged. Its fill was color.interfere.bg (rgba P1 8%) straight on the game screen, its pressed fill was translucent, and its blocked state used opacity 0.5. Now: fill = opaqueOver(interfere.bg), pressed = opaqueOver(P1 16%), and blocked = a color.bg veil at 0.5 over the opaque button, including its border, with no opacity on the button. The same look as before, and the text keeps theme colours, which the a11y audit requires. The compact 3–4P button sits on its card's opaque surface and is unchanged.

## B12 [fixed] area game task general-motion-phone-off-ambient
Earlier round: opaqueOver() for the Choice frame and selected segment, Segmented chips and pressed state, and the streak chip. This round:
- Choice takes a `ground` prop (default color.bg). The frame is filled with the ground, and the selected segment is opaqueOver(accentSubtle, ground). PseudoLanguageSettings passes color.surface, so the Choice inside that surface card no longer shows a darker bg inset (reviewer, low).
- The interference button (B50).
- BoxHud, PuzzleHud and FindHud chips use opaqueOver(color.dangerSubtle).
- components.md §8.1 and §19.6 are updated.

## B47 [fixed] area game task general-lang19-fit-interference
Earlier round: mistakes get 2 lines and fit to 0.75; the rival's word gets 1 line and fit (2 lines with a cell); the '…' touches its word; the regular button and its label may shrink.

This round, the reviewer's medium: shortened per D124 ('shorten first') so the thinking row fits at ≥ 0.75 in all 19 languages:
- player:activity.thinking (+_female): es 'Piensa', pt-BR 'Pensa', fr 'Pense', vi 'Nghĩ', ar base 'يفكر' (female 'تفكر' unchanged).
- For one verb form with the existing 3rd-person words: es activity.locking 'Elige', pt-BR 'Escolhe'.
- player:interfere.button: nl 'Storen', tr 'Baltala' (TDK: baltalamak = sabote etmek; an imperative, as the tr style guide asks of buttons). The help texts that quote the button were updated to match: nl/tr account.json '…interfere', progress.json launch and howTo.
- The TOO_LONG_TODAY list is removed. components.md §3.2 row 3 lists the shortenings.

## B45 [fixed] area game task general-lang19-fit-interference
Earlier round, kept: both halves have flexShrink 1 and minWidth 0. Their words get flexShrink 1, numberOfLines 2 and adjustsFontSizeToFit 0.75, and the numbers keep their size. The row stays 48 dp. components.md §13 is updated.

## Q1 [partial] area game
- The solo practice's clock is now drawn as SVG paths. New ClockDigits (components/clock/ClockDigits.tsx) uses Teko 600 outlines for 0–9 and ':' from new scripts/gen-clock-glyphs.mjs → clockGlyphs.generated.ts. lib/ttf.mjs gained advance() and vertical(), additive and lazy.
  - It sits in the cellRef line box, with the baseline placed by RN's half-leading model.
  - The digits are tabular, so the box never resizes while it runs (a resize would be a layout event too).
  - It grows with the system font scale like the Text it replaces, and is hidden from screen readers.
  - Changing a path's `d` only invalidates the drawing: no text view, no content-description change.
- The time stat has a label again. game:hud.timeLabel is restored in all 19 locales with the 1.1.0 strings, so the net text change is none. The label is 'זמן 3:10', stepped to 5 s: clockLabelSeconds rounds elapsed time down.


## B14 [partial] area perf task general-ambient-screen-change
Earlier round, kept: (1) AvatarArt: a covered stage keeps its layered stack and only stops its beats, so there is no swap to a still picture and back. (2) AvatarArt: stacks it no longer shows stay mounted, hidden (opacity 0, no plans), for LAYERS_RETIRE_MS = 4000 ms before they unmount. That is longer than Reanimated's 2–2.5 s window, so nothing it still holds is deleted while new SVG is drawn. The stack key includes the set of moving layers, and each stack sits in its own non-collapsable, ltr wrapper. (3) useScreenFocused(enabled) and HomeScreen useScreenFocused(entrance): after its entrance, Home does not render on blur or focus. This round: (4) New avatars/svgMarkup.tsx (SvgMarkup + svgAst). AvatarArt draws each SvgXml through it: react-native-svg's parse() result, with its elements built once, is kept in a 96-entry LRU keyed by the markup. It draws exactly what SvgXml drew, except th

## B32 [fixed] area perf task avatars-pirates-lab
apps/mobile/src/screens/PiratesLabScreen.tsx: a character switch goes in steps (SwitchStep). 'gone': the character's avatars become same-size Gap placeholders, so the old ones are deleted in a commit that draws no new SVG. After 2 requestAnimationFrame ticks comes 'still': the new character drawn with reduceMotion, adding nothing to Reanimated's list. Two frames later comes 'live'. A new switch midway starts over. The board mock and the controls are untouched. Together with the AvatarArt changes (hidden kept stacks, timers that restart after effect re-runs, markup parsed once), the lab's motion buttons also no longer flood when a motion ends. The reviewer raised no issue on B32; it is unchanged this round apart from the shared AvatarArt improvements.

## B6 [fixed] area server-tools task general-lang19-legal
I changed the header rules in both styles (same rules in each): '.top .wrap' gets flex-wrap:wrap and gap:0 12px, so the bar can drop under the brand. '.langs' gets flex-wrap:wrap. '.langs a' and '.brand' get white-space:nowrap, so a name never breaks inside. '.brand' gets line-height:44px, so its row matches a 44px link row. The 44px touch targets stay. Body overflow-wrap:anywhere stays, because long addresses in the texts still need it. The CSP hashes are computed from the CSS, so they follow on their own. Checked again in headless Chrome on legal and room pages in he/ar/en/pt-BR/ja/de, at 360, 412 and 800px: nothing sticks out of the page. Every link is 44px tall (one line). The brand is one 44px line. The names wrap in 6 rows on a phone (header ~330px), 3–4 rows on desktop. Screenshots: C:/Users/mosheg/AppData/Local/Temp/claude/c--Users-mosheg-Documents-ReactNative-sudoku-fight/4440d2

## Q2 [fixed] area server-tools
New pure helpers in apps/server/src/testing/qaAgent/index.ts:
- dumpUi(device, path) does, on each try: 'rm -f' the old dump, then 'uiautomator dump', then read the file back. It accepts only a whole hierarchy (isUiDump: <hierarchy …</hierarchy> at the end). It makes UI_DUMP_TRIES=3 tries, UI_DUMP_RETRY_MS=500 apart, then throws 'uiautomator could not read the screen (3 tries): <uiautomator's own message>'. When the message is the idle-state error, it adds a hint.
- isPng(data) checks the 8-byte PNG header.

In adb.ts:
- adb() is split into run() (keeps stderr) and adb().
- A 'phone' UiDumpDevice passes stdout+stderr for shell calls and uses Atomics.wait for the sync sleep.
- screen() now uses dumpUi, so 'ui' and 'tap "…"' exit 1 with the reason and never print or tap old data.
- 'shot' deletes the target file first and checks the PNG header; on failure it throws 'screencap gave no pictu

