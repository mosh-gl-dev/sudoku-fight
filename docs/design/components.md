# Sudoku Fight: component specification, direction C ("לילה רגוע" / Calm Night)

Stage 3 of `docs/02-WORK-PLAN.md` (design system in the app). Direction C was chosen on 2026-10-09 (`docs/01-SPEC.md` §24, D30).

This file says **what every stage-3 component looks like and how it behaves**. Colours, fonts, spacing, radii and motion values
come from `docs/design/tokens.json`. That file is the source of truth for values. The hex codes here are for reference only.

---

## 0. How to read this file

### 0.1 Sources and provenance tags
| Tag | Meaning |
|---|---|
| **[C]** | Taken exactly from `Dir-C-Home.dc.html` or `Dir-C-Game.dc.html`. These two boards decide **colour, font and look**. |
| **[R1→C]** | Structure, size, state or behaviour from round 1 ("Arena Ink": `DS-Components`, `DS-Foundations`, `DS-Motion`, `Game-*`, `Arsenal`, `Surrender`, …), translated into C's calm palette. Translation means C's palette only, **no textures or halftone, no glows**, 1px borders instead of 2px, and the skew only on the primary button, the VS badge and a button paired with the primary (§1.0). **Revised by Moshe's decision D125 (2026-10-30, "כפתורים וכרטיסים עם עומק"):** the old rule also said "no gradients" and "flat fills". Since D125, raised controls and tappable cards have depth: tonal gradients through C's own tokens, inset highlights, hard edges and card bases (§0.7). The palette does not change. |
| **[new]** | Not drawn on any board. Added because the spec requires it (the section is cited). These need Moshe's eye. |

Every Hebrew string in this file is a UI string. A string marked **†** is *proposed* copy that follows a pattern from the design or
the work plan. It does not appear on any board, so add it to `locales/he.json` and `locales/en.json` for review.

### 0.2 Units and canvas
- All sizes are dp at the **390 × 844** reference screen. Side gutter: **16** on game screens [C] and **24** on Home [C].
- Fixed widths below (358, 159, …) are at 390 width. Section 11.1 has the scaling rules for the board and keypad.

### 0.3 Tokens used (names written by the sibling `tokens.json`)
| Token | C reference | Used for |
|---|---|---|
| `color.bg` | `#0f1218` | Screen ground, box gaps on the board, text on coloured pills |
| `color.surface` | `#171b24` | Raised areas: Home profile card, sheets, modals, compact cards |
| `color.surface2` | `#1f2430` | Keys, VS badge, progress track, toasts |
| `color.border` | `#2a3140` | Outlines, dividers, inactive frames |
| `color.text` | `#eef1f6` | Primary text (16.6:1 on bg) |
| `color.textMuted` | `#9aa3b5` | Secondary text, icons (7.4:1 on bg, 6.1:1 on surface2) |
| `color.textFaint` | `#828ba1` | Third text level (timestamps, hints). C's `#677086` lifted to pass: 5.5:1 on bg, 5.05:1 on surface, 4.55:1 on surface2. |
| `color.iconFaint` | `#677086` | **Decorative only** (C's faint gray): chevrons, separator dots, locked-token art. 3.8:1 on bg and 3.5:1 on surface, so it fails 4.5:1. Never use it for text that carries information. |
| `color.accent` | `#ffcf3f` | The one primary action, rating numbers, the active nav item, the "#1" rank badge, the interference target frame |
| `color.onAccent` | `#241a00` | Text on accent (11.7:1) |
| `color.danger` | `#ff4d5e` | Mistakes, penalties, surrender, errors (5.8:1 on bg). **Not** for small text on the light board (3.05:1). Use `color.board.wrongDigit` there. |
| `color.players[n].ring` | P1 `#36c9f0` · P2 `#ff9440` · P3 `#a2e28e` · P4 `#a57af0` | Avatar frame, score number, lock ring, lead-bar segment, glyph on dark backgrounds |
| `color.players[n].tint` | P1 `#d6f4fc` · P2 `#ffe8d4` · P3 `#b2eea0` · P4 `#e0d1fa` | Background of a solved cell and of my lock cell |
| `color.players[n].digit` | P1 `#0b6a85` · P2 `#9a4a0c` · P3 `#256412` · P4 `#6234b2` | Digit in a solved cell, glyph on the board (≥5.28:1 on its tint) |
| `color.players[n].onRing` / `.lockEdge` | `#0f1218` / = `.digit` | Text on a ring-coloured pill / 1 dp inner edge of a lock ring (§11.3) |
| `color.board.*` | see below | Board only |

**`color.board.*` subkeys** (names as in `tokens.json`).
| Subkey | C reference | Note |
|---|---|---|
| `color.board.cell` | `#f7f8fa` | Cells in boxes 0, 2, 4, 6, 8 |
| `color.board.cellAlt` | `#eceff4` | Cells in boxes 1, 3, 5, 7 (checkerboard) |
| `color.board.grid` | `#c8cdd6` | 1px lines between cells inside a box |
| `color.board.boxGap` | = `color.bg` | 3px gaps between boxes |
| `color.board.given` | `#0f1218` | Given digits (17.6:1) |
| `color.board.wrongDigit` | **not in C:** `#b8102f` | Small red wrong digits. C uses `#ff4d5e` (3.05:1 on the cell, which fails). Round 1's `#d10f37` fails on the P3 and P4 tints (4.08 and 3.83:1). `#b8102f` measures ≥4.65:1 on every cell, alt-cell and tint background. |
| `color.board.peer` | `null` | **Not used.** C draws no row/column/box highlight (§11.3 #8). |

**Other tokens this file uses** (all defined in `tokens.json`):
`color.accentShadow` (`#b88f00`, the hard shadow under the primary button) [C] · `color.success` (`#40e29f`: connected dot
and success toast only, never on the board; a correct move uses the mover's seat colour) · `color.status.online` /
`.offline` · `color.scrim` (`rgba(7,9,12,.72)`) [R1→C] · `color.dangerSubtle` / `dangerBorder` / `dangerPressed` ·
`color.keypad.*` · `color.interfere.*` · `color.league.{bronze,silver,gold,diamond,legend}` [R1].
P3 ■ and P4 ◆ are round 1's lime and magenta, calmed for C to green `#a2e28e` and violet `#a57af0` (see `tokens.json` `_cvd`).

### 0.4 Type, spacing, radii, icons
- **Fonts [C]:** `Rubik` 400/500/700 for UI text (plus 600 for given digits, which C asks for; `tokens.json` loads it), and `Teko` 500/600 for every number (score, rating, timer, keys, cell names such
  as F8, "VS"). Teko is always tabular (`fontVariant: ['tabular-nums']`). C drops round 1's Karantina headings.
- **Teko metrics:** C sets `line-height: .8` plus a small `padding-top` (3–6) to centre Teko optically. In RN use
  `includeFontPadding: false` (Android), set `lineHeight ≈ 0.8 × size`, and nudge with `paddingTop`. Check on both platforms.
- **Numbers** are always Latin digits. The minus sign is U+2212 (`−2`). Half points show one decimal (`39.5`). Whole numbers show
  none (`55`).
- **Spacing:** 4-dp grid [R1].
- **Radii used by C:** 2 (thin bars) · 6 (VS, small chips) · 7 (22-dp mini avatar) · 8 (seconds pill) · 10 (key, 36-dp avatar) ·
  12 (buttons, board, icon buttons) · 14 (Home profile card, 44-dp avatar frame) · 16 (popover) · 20 (72-dp avatar frame, centred
  modal) · 24 (sheet top corners).
- **Icons [C]:** 24×24 viewBox, stroke 2, round caps and joins, `currentColor`. Drawn at 20–24. The icon set is round 1's list
  (DS-Foundations §08).
  - **Bot** (Moshe's device test, 15.10.2026: "not clear enough"): redrawn after DS-Components' bot chip, with a mouth, solid eyes
    twice as large (r 1 under the 2 stroke) and an antenna ball. Used on the Modes card (at 28, §2), Match-Timeout's "play a bot"
    and the results' opponents of a bot game.

### 0.5 Motion, haptics and reduced motion (DS-Motion → C)
| Token | Value | Use |
|---|---|---|
| tap | 80–140ms | Key or button press. **Every action gets feedback within 140ms.** |
| state | 240ms, `cubic-bezier(.2,.8,.2,1)` | Any state change: lock appears or releases, colours cross-fade |
| shake | 300ms | Wrong move, "taken" cell, nudge |
| count | 650ms | Score counting up on the card |
| reward | 420–900ms, `cubic-bezier(.34,1.56,.64,1)` | Digit pop, popover pop, slam |
| timers | linear | Lock ring and bars only |
| lock | 8 / 12 / 18 s | From `rules` (D2). **Never hard-code.** |
| interference | 5000ms exactly | From `rules` |

**Reduced motion** (`ReduceMotion.System` in Reanimated, plus the in-app switch). The information stays and the drama goes:
shake becomes a 2-dp red frame for 300ms. The flying "+3.5" appears next to the score and fades. The score count jumps
straight to the final number. Slam or zoom becomes a 200ms fade. Pulsing rings become fixed rings. A gold burst becomes a
static frame.

**Haptics [R1]:** light tick when you select a cell · success when a digit is correct · a low 120ms buzz on a wrong digit (no
drama) · a quiet tick once per second in the last 3 s of **my** lock only · medium impact when an interference lands · a short
medium knock ("taken") when you tap an opponent's lock. The full list is `motion.md` §7. All haptics and sounds respect the user's settings.

### 0.6 Global rules
- **Me is always P1** (`players[0]`, shape ●). Opponents get P2–P4 by seat order, shapes ▲ ■ ◆. Components take a `colorIndex`
  (0 = me), never a raw server seat.
- **The board, the keypad and cell names are always LTR.** Wrap them in `direction: 'ltr'`. Everything else follows the app
  direction. In RN, `flexDirection: 'row'` flips automatically under `I18nManager.isRTL`.
- **Mixed text:** a cell name, score or Latin player name inside Hebrew text is wrapped in an LTR isolate (`⁦…⁩`), or
  goes in its own `<Text>` with `writingDirection: 'ltr'`. For example `בוחרת · ‪A8‬`.
- **Touch targets** are ≥44×44 (use `hitSlop` when the visual is smaller). Two exceptions you need to approve are in §17.
- **Contrast:** text needs ≥4.5:1. Non-text cues need ≥3:1, or a redundant non-colour cue (shape, avatar, text).
- **Focus ring** (keyboard, switch control): 2-dp `color.accent` outline, offset 2 [R1→C].
- **One primary (gold) action per screen** [R1].
- **Example data** must follow the known-fixes list in `docs/03-DESIGN.md`: the best move is ≤6.5 points on fast, ≤9.5 on normal and ≤12 on hard (the bank after D43), a provisional rating
  says "10 משחקים", the league thresholds follow §11.3, and there is no "עונה 3".

### 0.7 Tactile surfaces (D125, Moshe 2026-10-30) [new]
Moshe's words: "כפתורים וכרטיסים עם עומק". Every raised control and every tappable card is built the same way, in
`components/ui/tactile.tsx`. Values are in `tokens.json` (`color.tactile`, `elevation.tactile`).

**Layers, bottom to top**
1. **Edge:** a hard band under the face, offset down by its depth, with no blur. Its tone comes from the palette:
   - gold under gold: `accentShadow`, 4 dp;
   - slate under slate: the border's tone, 3 dp, or 2 dp under an icon button;
   - red under danger: `dangerShadow` at 50%, 2 dp.

   An edge darker than the ground would not show on C's `bg` (1.04:1), so the slate edge uses the border's tone (1.44:1).
   Buttons draw the edge as a View under the face, the CTA's Android-safe recipe. The edge sits outside the button's box,
   so no layout changes.
2. **Face:** opaque, so the edge never shows through it.
   - Gold: a vertical gradient `accentHover` → `accent` → `accentPressed`.
   - Slate: `surface2` → `surface`, with the top border one step lighter (`tactile.borderLit`).
   - Danger: the 8% red tint over an opaque `surface`. The danger label measures 4.88:1 on it, and 4.65:1 when pressed.
   - In RN the gradient is `experimental_backgroundImage`. The plain fill under it shows on a phone that draws no
     gradient.
3. **Highlight:** an inset top line (RN `boxShadow` with `inset`). White at 55% on gold, at 6% on slate, at 5% on a card.
   The gold face also has a 10% black shade along its foot.
4. **Label**, always upright. When the face is skewed, the face's look is a slanted plate under the label, and the
   label is not inside it, so nothing is counter-skewed (§1.1).

**Tappable cards (L1):**
- The card is the pressable itself: its role, test id and layout stay where they were.
- Fill `surface`, a hairline `border` whose top edge is `tactile.borderLit`, and an inset top highlight.
- A **2 dp base** in the border's tone. This is an RN `boxShadow` (`0 2 0`, no blur), drawn from Android 9 on and simply
  absent before.
- Radius 14 (`radius.card`) for every card and tappable row.
- Selected or checked: the `accent` border on every side, and `accentSubtle` over the fill.
- A border of its own replaces the lit top (my leaderboard row in P1).
- Disabled cards keep their own meaning (dashed, faded) and have no base.

**One press, everywhere:**
- On press-in, the face sinks onto its edge in 80 ms (`standard` curve), leaving 1 dp of the edge (4 → 1 under gold,
  3 → 1 under slate). A card covers its whole base.
- The whole surface shrinks to 0.98.
- The face changes colour: gold one step darker; slate flat and lighter (`#2a3140`, as a pressed key); a card goes to
  `surface2`.
- On release, everything comes back on the `press` spring (`motion.spring.press`).
- **Reduced Motion:** no scale and no tween. The face lands at once and its colour changes, so the press still shows.
  A press of 1–3 dp is not vestibular motion (motion.md `key.press`, `cta.press`).

**Sound and haptics:**
- The primary button plays `primaryPress` itself (a soft tap and a light haptic, §1.1). Its screen no longer calls it.
  - Except where the screen decides: a form that can be refused (edit profile, both registration steps, a new name,
    the report sheet) and "הצטרף" (the sixth digit also joins) pass `cue={null}` and play `primaryPress` only when the
    action goes ahead. A refused form only nudges. The friends room's "התחל" plays it only when it starts at once
    (asking "להתחיל בלי…?" leaves it to the dialog's confirm).
  - A dialog's "ביטול" is always silent, even as the gold primary of a danger dialog (§14): backing out commits nothing.
    A danger confirm plays its own cue from its screen ("surrender").
- A tappable card plays the `toggle` selection tick. A screen that plays its own cue passes `cue={null}` (Modes,
  game type, bot selection).

**Disabled buttons:**
- Never a faded gold.
- The face is `surface2` with the border and no edge, and the label is `textFaint` (4.55:1).
- The skew stays on a disabled primary.

**Keypad keys (BRD-9):**
- Each key stands on a 3 dp lip: P1 at 35% while armed, grey (`keyLip`) while idle.
- The face is 57 dp, so the row stays 60 dp.
- The press goes exactly 3 dp down and lands flush on the lip.
- A complete or tried key has no lip.
- The idle row (.55) fades as one layer (`needsOffscreenAlphaCompositing` on the row). Android otherwise draws each child
  at the row's alpha on its own, and the lip under each opaque face would show through it as a darker band.

**Bottom navigation (VIS-10):**
- The active tab has a 56 × 32 `accentSubtle` pill behind its icon, and its label in Rubik 700.
- The pill pops in as the tab's screen opens: the `pop` spring from 0.8, fading in over 140 ms. With Reduced Motion it
  is simply there.
- A pressed tab shows the `pressedOverlay` pill.

**Not in this revision:**
- Glows: the optional warm glow under the hero CTA, and the hero sheen sweep.
- Sheet and modal drop shadows. The scrim still separates them.

---

## 1. Buttons

All buttons: `accessibilityRole="button"`, and `accessibilityState` with `disabled` and `busy` (and `expanded` where it applies). The
label is the visible text. Icon-only buttons need an explicit label. Since D125 every raised button is a tactile surface (§0.7).

### 1.0 The pair rule (D130, ☐ a default for Moshe to judge on the phone) [new]
The audit left the choice to Moshe: skew the button beside the gold one, or inset the gold one. Built: the skew.
When the primary and another button share one row (the friends footer "צור חדר" | "הצטרף עם קוד", the dialogs'
"ביטול" | "כן, להיכנע"), the other button is skewed −8° with the primary (`skew`).
- The two inner edges then run parallel, with an even gap.
- The outer corners stand out by tan 8° × h/2 (3.4 dp at 48 dp), as every primary's do.
- The other way, insetting the primary, leaves a gap that widens from top to bottom.
- Its colour still says what it is: slate or red, never gold.

### 1.1 Primary: skewed gold ("שחק") [C]
**Anatomy:** skewed face › upright label. A hard gold edge sits under it (§0.7).

| Property | Value |
|---|---|
| Container | Face and edge slanted −8° (`effects.skewXDeg`), as `skewX(-8deg)` draws them: the top leans right and the foot left. The label stands upright on the face. **RN:** never a `skewX` on a view. Android drops it (QA run 2, B13/B16: `BaseViewManager` gives a View only the translation, rotation and scale of its transform), so every button there was a plain rectangle. The slant is the shared `Slant` (`components/ui/slant.tsx`): the same shear as a rotation, a stretch and a second rotation on two nested views, which both platforms draw. The face's look sits on a slanted plate behind the label; the edge is the same shape, 4 dp lower. |
| Fill | **D125:** a vertical gradient `accentHover` → `accent` → `accentPressed` (`tactile.goldFace`), an inset top highlight of white at 55% (1.5 dp), and an inset 10% black shade along its foot (2 dp). Before D125: flat `color.accent`. |
| Radius | 12 |
| Shadow | Hard offset `0 4 0 color.accentShadow`. In RN, draw it as a View in `accentShadow` under the face, placed 4 dp lower. RN shadows blur, and Android elevation has no colour or offset. |
| Label | Rubik 700, `color.onAccent`, centred |
| Sizes | `hero`: height **96**, label **44** [C, Home "שחק", full width 342] · `lg`: height 60, label 28 [R1 height, C font] · `md`: height 52, label 20 [R1→C] · `modal`: height 48, label 18 [R1→C] · `sm` (D125): height 40, label Rubik 700 16, with a 2 dp hit slop to reach 44 (the leaderboard's "שחק" beside my row). Heights are `size.ctaHero`, `size.buttonLg`, `size.buttonMd`, `size.buttonModal`, `size.buttonSm`. A long label uses `md` (Register-Account's "צור משתמש והיכנס לזירה": at `lg` it could not fit a 360 dp phone; at `md` it does, measured in Rubik 700, up to text scale 1.1, and `wrapLabel` gives it a second line from 1.15). |
| Large text | With `wrapLabel`, from the system's "Large" text size (fontScale ≥ 1.15) the label may take a second line when it no longer fits on one, and the button grows (min height instead of height; the shadow follows). Below that, and without `wrapLabel`, one line at the fixed height. |
| Width | Fill the parent, or content plus 26 padding on each side |

| State | Visual |
|---|---|
| default | As above |
| pressed | The face sinks 3 dp onto its edge (80 ms), so the edge shows 1 dp. The whole button shrinks to 0.98, and both spring back (`press`). The gradient goes one step darker (`accent` → `accentPressed`). The button plays `primaryPress` itself (a light haptic and a soft tap, MOT-4). Reduced Motion: no scale and no tween (§0.7). |
| disabled | **D125:** never a faded gold. Face `surface2` with a 1 dp `border`, no edge, label `textFaint`, still skewed. `accessibilityState.disabled`. |
| loading | Label is replaced by a spinner: 22 dp, 3 dp ring in `onAccent` at 22% with the top arc in `onAccent`, rotating every .8 s, linear. `busy: true`. Label "שחק, טוען" [R1]. A press does not sink. |

**RTL:** the skew angle stays −8° in both languages (it is a brand slant, not a direction cue), as round 1 did in RTL.
**Tokens:** `color.accent`, `color.onAccent`, `color.accentShadow`, `color.tactile.goldFace` / `goldFacePressed` / `goldLip` / `goldShade`.

### 1.2 Secondary: slate (D125; until then an outline)
Two shapes.

**a) Slate button** [R1→C, D125]:
- Height 52 (`md`), 48 (`modal`), 60 (`lg`) or 40 (`sm`). Radius 12. Label Rubik 500 16 in `color.text`.
- Face: a filled slate, a vertical gradient `surface2` → `surface`. A 1 dp `border` whose top edge is
  `tactile.borderLit`, and an inset 6% white line at the top.
- Edge: a 3 dp hard edge in the border's tone (`tactile.slateEdge`).
- **Not skewed on its own.** Beside the primary it is skewed with it (§1.0).

| State | Visual |
|---|---|
| pressed | Face flat `tactile.slatePressed` (`#2a3140`), sinks 2 dp onto its edge, and the whole shrinks to 0.98 (§0.7) |
| selected (chip-like use) | Border `color.accent`, `accentSubtle` over `surface2`, label `color.accent` |
| disabled | Face `surface2` with the border, no edge, label `textFaint` |
| loading | Spinner in the label's colour, `busy`. A press does not sink. |

**b) Row button ("עוד סיבוב")** [C, D125]:
- Full width, height **64**, padding 0 16, gap 14, text aligned to start.
- Since D125 it is a tappable card (§0.7): `surface`, the lit border, the 2 dp base, radius 14. Until then it was
  transparent with a 1 dp `color.border` and radius 12.
- Leading icon: 22, `color.textMuted`.
- Text stack (gap 5): title Rubik 500 16 `color.text` ("עוד סיבוב"), subtitle Rubik 400 13 `color.textMuted` ("מדורג · 2 שחקנים · רגיל"). A title too long for one line takes a second, broken between words, never "…" (QA 2026-11-03, en-XA); two lines and the subtitle still fit the 64.
- Trailing chevron: 20, stroke 2.2, `color.iconFaint`, decorative. It points to the reading direction's "forward": left in Hebrew, mirrored in English.

| State | Visual |
|---|---|
| pressed | The one card press (§0.7): `surface2`, over its base, 0.98 |
| disabled | No base, no press, title and subtitle `textFaint`, icon `iconFaint` |
| loading | 20 dp spinner in `color.text`, `busy` |
| selected (chip-like use) | Border `color.accent`, `accentSubtle` over the fill, label `color.accent` [R1→C] |

**Tokens:** `color.border`, `color.text`, `color.textMuted`, `color.iconFaint`, `color.surface`, `color.tactile.*`.

### 1.3 Ghost / text ("הכל", "ביטול בחירה") [C]
- Height **44**, padding 0 4 (text only) or 0 16 (with icon), transparent, no border, radius 12.
- Label Rubik 500 14 ("הכל") or 15 ("ביטול בחירה"), `color.textMuted`.
- Optional leading icon 20, gap 8.

| State | Visual |
|---|---|
| pressed | A `pressedOverlay` pill (white at 5%, D125), label `color.text` |
| disabled | Opacity .4 |
| loading | 14 dp spinner (2 dp ring) before the label [R1] |

**Tokens:** `color.textMuted`, `color.text`, `color.pressedOverlay`.

### 1.4 Icon button 44×44 (settings, surrender, reactions, close) [C, D125]
- 44×44, radius 12, centred icon 20 (in a card) or 22 (in a header), `color.textMuted`.
- D125: the slate surface of §1.2a on a **2 dp** edge (until then transparent with a 1 dp `color.border`).
- The player card's "כניעה" and "תגובות" (`CardIconButton`) are this button too, so they look the same in a game and in
  a staged practice's HUD. The cooldown [D19] rests it at .5. The compact card's 32 dp strip buttons stay flat (no room
  for an edge in their row).
- `plain`: no face and no edge, for an icon inside a panel of its own (a tip's close). Only the pressed overlay.
- **The label is required:** "הגדרות", "כניעה", "תגובות", "סגירה" [design].

| State | Visual |
|---|---|
| pressed | Face flat `tactile.slatePressed`, sinks 1 dp onto its edge, icon `color.text` |
| expanded (reactions picker open) | Face flat `color.surface2`, border `color.textMuted`, icon `color.text`, `expanded: true` [R1→C; round 1 used gold here, and C keeps gold for the primary action] |
| disabled | Face `surface2` with the border, no edge, icon `textFaint` |
| loading | 18 dp spinner. Label e.g. "הגדרות, טוען" [R1] |

**Tokens:** `color.border`, `color.textMuted`, `color.text`, `color.surface2`, `color.tactile.*`.

### 1.5 Danger ("כן, להיכנע") [R1→C]
C has no danger button, so this is a translation. **It is an outline, not a fill**, for two reasons. `#fff` on `color.danger` is only
3.24:1, and §6.6 requires that "ביטול" be the *more prominent* button.
- Same height as the paired primary (60 in the surrender modal). Radius 12. Label Rubik 700 18 `color.danger`.
- The fill is `color.dangerSubtle` (8%) with a 1 dp `color.dangerBorder` (55%), the same pattern as C's interference
  button.
- D125: the tint lies over an opaque `surface` face (4.88:1), on a 2 dp edge in `dangerShadow` at 50%.
- Beside the primary in one row it is skewed with it (§1.0). Its red still tells it apart from the gold.

| State | Visual |
|---|---|
| pressed | Tint `color.dangerPressed` (12%; label 4.65:1. Do not go to 16%, which drops it to 4.40:1). The face sinks 1 dp, the whole shrinks to 0.98. |
| disabled | Face `surface2` with the border, no edge, label `textFaint` |
| loading | Spinner in `color.danger`. Label "כן, להיכנע, טוען" [R1] |

**Tokens:** `color.danger`, `color.dangerSubtle`, `color.dangerBorder`, `color.dangerPressed`.

---

## 2. Avatar with frame [C sizes where they exist, R1→C for the rest]

**Anatomy:** frame (border plus inner padding) › image › optional badges (presence dot, bot chip, result badge).

The frame is a **border, not a filled plate** [C]. Image size = outer − 2 × (border + padding). Image radius = frame radius − (border + padding). Values: `tokens.json` `size.avatar.*`.

| Size | Use | Border / padding | Image | Frame radius / image radius | Source |
|---|---|---|---|---|---|
| 22 | Mini avatar in an opponent-locked cell | none | 22 | — / 7 | [C] |
| 34 | Compact card (3–4P) | 2 / 1 | 28 | 10 / 7 | [R1→C] |
| 36 | Recent games, neutral lists | none | 36 | — / 10 | [C] |
| 44 | 2P player card | 2 / 2 | 36 | 14 / 10 | [C] |
| 52 | Lists, leaderboard rows | 2 / 2 | 44 | 16 / 12 | [R1→C] |
| 72 | Home profile | 2 / 2 | 64 | 20 / 16 | [C] |
| 96 | Profile screen | 2 / 3 | 86 | 24 / 19 | [R1→C] |

- **Frame colour:** `color.players[n].ring` during a game, and also on Home for "me" (P1) [C]. Outside a game, other players use `color.border` (neutral) [R1→C].
  - **Exception, the bot on the Modes card** (Moshe's device test, 15.10.2026; as the Modes board drew it): no avatar but the robot
    icon at 28 in P2's ring, in a 44 frame (radius 14, border 2) of P2's ring on `color.surface2`. The bot is my one opponent, so
    this phone shows it as P2. It stands next to the solo row's "my avatar at 44 in my P1 frame"; the picture is decorative (the
    row's label says it), and its shape tells it apart without colour.
- **No avatar:** id `av00` (`NO_AVATAR_ID`; a deleted or missing account): the placeholder from `packages/avatars`, drawn in code. The avatars themselves are our own animated characters (`packages/avatars`, spec §3.4), not image files.
- **Badges** [R1→C]:
  - **Presence dot** [new in C, from R1]: 10 dp (12 on 44+). Sits at the bottom-end corner with a −3 offset and a 2 dp border in the background colour behind it. Connected → `color.status.online`. **Unstable** (the connection is lost, still inside its soft phase, D42, Moshe 2026-10-15) → `color.status.unstable` (amber, the warning colour), and the image is **not** greyed: the game goes on as usual. Reconnecting (the grace, after the soft phase) → `color.textMuted`. Left → no dot. Static, so reduced motion changes nothing.
  - **Bot chip:** height 18, padding 0 5, radius 9, background `color.bg`, 1 dp `color.textMuted`, bot icon 11 plus "בוט" Rubik 700 10 `color.text`. Sits at the top-start corner (−7, −9). Its word is never cut: the chip is as wide as the word even past the avatar's width ("ボット" on a 34 dp avatar), on one line, and the word grows with the phone's text size up to ×1.35, the cards' HUD cap (QA run #2, B17/B22). On the compact card (§7.2) it stays at ×1.0 (`Avatar botScale="board"`): there it shares the avatar's top with the place badge, and a bigger chip only hid the picture (QA 2026-11-03).
  - **Result badge (Home recent games)** [C]: a 20 dp circle at top-end (−6, −6), background `color.border`, 2 dp `color.bg` ring, letter Rubik 700 12 `color.text` ("נ").
- **States:**
  - Disconnected: image grayscale with opacity .7, frame `color.status.offline` [R1→C].
  - Left or surrendered: same, plus the card dims (§3.4).
- **A11y:** decorative (`accessible={false}`) whenever the name is next to it, which is almost always. When it stands alone, the label is the player name.
- **RTL:** badge corners use start/end, so they mirror.
- **Avatar picker** (Register-Fighter, Edit profile; Moshe's device test, 14.10.2026, replaces the stage and strip): a field as high as the name's (44): the chosen avatar at 34 in my P1 frame, its name, "שינוי ⌄". A tap opens the sheet in its `fill` form (§13), "בחר אווטאר" with "הבחירה שלך: …" under it: all 119 in a grid of 72 dp frames (the 18 pirates open the symbols, 31.10.2026: 1 to 9 in the house style, then 1 to 9 invested) (as many to a row as fit, at least 8 apart: 4 on a 360 dp phone), under a sticky header per kind (Rubik 500 16 `color.textMuted`). Each one is a radio and a still picture, except the chosen one, which idles (`AVATAR_STAGES.picker`, decision 3.19; never with reduced motion); the chosen one in my P1 frame with a tick badge, a locked one [D17] grey with a lock badge. A tap chooses and closes; the field's avatar smiles and bounces (reduced motion: the smile only). The grid is virtualized and opens on the chosen avatar's row.
- **Fighter card** (Register-Fighter's preview "ככה יראו אותך בזירה", Register-Account's "הלוחם מוכן"): one full-width card, `color.surface`, 1 dp P1 border, radius 14, padding 12: the avatar at 52 in my P1 frame, ● and the name (Rubik 700 16, one line, room for 16 characters on a 360 dp phone), and under it the flag 13 with the country's name and a note ("חדש" / "✓ הלוחם מוכן"). No VS and no opponent.

**Tokens:** `color.players[n].ring`, `color.border`, `color.bg`, `color.status.online`, `color.status.unstable`, `color.status.offline`, `color.textMuted`.

---

## 3. Player card: 2 players [C layout, with additions marked]

### 3.1 Placement (game screen, 390 wide) [C]
| Element | Frame |
|---|---|
| My card | Top 48, **start edge** (right 16 in Hebrew), 159 × 160 |
| Opponent card | Top 48, end edge (left 16 in Hebrew), 159 × 160 |
| VS badge | Top 58, centred (x 177–213), 36 × 24 |

**Narrower than 360 dp** (display zoom at its largest: 320 dp on the A16; QA loop 4): the two cards share the row
equally with 8 dp between them (`duelCardWidth`: 140 each at 320), so neither runs off the screen. The score (64) and
the name (16) keep their size; the name ends in "…" sooner and the status row's words wrap and shrink as in §3.2 (B47).

**VS clear of the names (QA loop 6):** where the cards are closer than the badge is wide (8–10 dp at 320–360 dp), each card's
identity row keeps `vsInset` on its inner side (half of what VS overlaps, plus `metrics.vs.clear` 4 dp), so VS never covers
a flag or a rating: 17 dp at 360, 18 at 320, 2 at 390, none from about 400.

**Cards have no background, border or shadow in C.** They sit straight on `color.bg`. The opponent card is a mirror image:
`flexDirection: 'row-reverse'` on each row, so the avatar is on the outer edge. In English the whole pair flips: me on the left
(see Game-2P-EN).

### 3.2 Anatomy (three rows, total height 160) [C]
| Row | Height / top margin | Content |
|---|---|---|
| 1 · identity | 44 / 0 | Avatar 44 (§2), gap 10, then the name block: **[new]** seat glyph 7 dp in `players[n].ring` (● me, ▲ opponent), gap 4, then name Rubik 700 16/1.2 `color.text`, single line with ellipsis, gap 6, flag 15 (§4). The glyph is the legend for the shapes on the board (spec §22: ownership must not depend on colour alone), as on the compact card (§7.2). **[new] Under the name:** rating, Teko 600 16 `color.accent` (§5). Name plus rating come to 37 dp, which fits in 44. For the opponent, the name block is LTR (`dir=ltr` in C). |
| 2 · score | 56 / 10 | Score Teko 600 **64**, line-height .8, padding-top 6, tabular, `color.players[n].ring`. Gap 8, baseline-aligned. **Last delta** "+3.5" in Teko 500 22, same colour. |
| 3 · status + actions | 44 / 6 | Space-between. **Me:** mistake text "1 טעות", Rubik 400 14 `color.textMuted`, then [כניעה][תגובות] icon buttons 44 with gap 4. **Opponent:** activity text "בוחרת · A8" in Rubik 400 14 `color.textMuted`, with the cell name in `color.text`. **[new]** A 14 dp timer ring sits before the text (§3.3). Then the interference button (§8.1). **Long languages (B47):** the mistake text wraps to a second line (two body lines fit 44 dp in every script), the activity's lone word shrinks on its line and its cell may take a second line, and the interference button may shrink beside it, its word shrinking to fit; each down to .75 (`metrics.card.statusMinFontScale`) before anything is cut. Where the opponent's "thinking" word and the button's word still didn't both fit at .75, the language says them shorter (D124): es "Piensa" / "Elige", pt-BR "Pensa" / "Escolhe", fr "Pense", vi "Nghĩ", ar "يفكر", and the button nl "Storen", tr "Baltala" (`statusFit.test.tsx`, every language). **Full size or another form (QA loop 6):** Android breaks a word wider than its line in the middle ("No mi / stakes") rather than shrink it, and shrunk words read as tiny. So the card measures its status words on the phone (hidden copies, `statusFit.tsx`) and keeps them only at full size: my mistakes keep their words where each word fits its line and they take at most two lines, else they become the `cancel` mark (16) and the count in Teko 500 22 (`mistakes-mark`); "הפרעה" keeps its word only where it fits at full size beside the activity at full size (the ring and the lock's word, or "חושב…"), else the button is its icon alone, 44 × 44, with the same label (§8.1). Until measured, as drawn. Hebrew keeps both at 159; English, German and Russian show the icon; at 320 dp (140) every language shows the icon, and English and Russian the mark. nl "Pauze" and tr "Durdu" (paused) were shortened so the lock's word fits beside the icon at 320 dp. |

**The original spec requires each card to show** name, country, avatar, score, **rating**, **online status** and **activity
indicator** (original spec §10 and spec §6.8). Dir-C-Game leaves out the rating, the presence dot and the activity timer. They are
added above in C styling.

### 3.3 Activity indicator (opponent card, row 3; me via the lock strip §10)
| State | Visual | Source |
|---|---|---|
| Locking | Timer ring 14 dp (stroke 2, track `color.border`, arc `players[n].ring`, starts at 12 o'clock, drains linearly) plus "בוחרת · A8" | Text [C]. Ring [R1→C, spec §6.8 "עם טיימר"] |
| Thinking (no lock) | "חושבת…" `color.textMuted`. The ellipsis blinks at 1.2 s. Reduced motion: static. | [R1] |
| Paused (game frozen or under interference) | "מושהה · A8" `color.textMuted`, ring frozen | [R1] |
| Without a connection, soft phase (D42) | The activity stays as it is ("בוחרת · A8", "חושבת…"): the game goes on. **The icon-only pill replaces the interference button:** a round chip as high as the countdown pill (30; 24 on the compact card), background `color.bg`, 1 dp `color.status.unstable`, wifi-off icon 14 in `color.status.unstable`, no seconds. With the amber presence dot (§2) and no grey. The card's label adds "ללא חיבור" (mine too). Static: no pulse, so reduced motion changes nothing. | [new, Moshe 2026-10-15] |
| Reconnecting | "מתנתקת…" plus a countdown pill: height 30, radius 15, background `color.bg`, 1 dp `color.textMuted`, wifi-off icon 14, seconds Teko 600 20 `color.text`. **This pill replaces the interference button.** Only after the soft phase (D42). | [R1→C] |
| Left (abandoned) | Text "נטשה". The card goes to opacity .5 and the avatar to grayscale. | [R1→C] |
| Turn-based variant (D1 = turns) | "התור שלה" replaces "בוחרת" | spec §6.8 |

The gendered forms in the design ("בוחרת", "שלחה") need a grammatical-gender source. See §17.

### 3.4 Card states
| State | Visual |
|---|---|
| default | As drawn |
| leader | No change on the card in 2P. The lead is shown by the lead bar and its tag (§9) [C]. |
| correct move (any player) | The "+3.5" chip flies from the cell to the delta slot next to the score (key press t0: pops at t0+140, leaves at t0+440, lands at t0+800; `motion.md` §4.2). The score counts up over 650ms (t0+800 → t0+1450). The delta stays next to the score for 2400ms after landing, then fades (240ms). The 2400ms is an assumption; no board specifies it. |
| wrong move | No shake on the card (the cell already shook). The score turns `color.danger` and returns to the seat colour while it counts down (650ms). A "−6.5" chip (`color.bg`, `color.danger` text) flies from the cell to the delta slot. **Me:** the mistake text pops (scale .8 → 1), briefly turns `color.danger` (600ms) and then becomes e.g. "2 טעויות" (`motion.md` §4.3). |
| sent an interference | The score drops by the cost. "−8" floats in `color.textMuted` (a cost, not a penalty) [new] |
| under interference (others see it) | Hit chip at the avatar top-end: height 18, radius 9, `color.surface2`, 1 dp `color.border`, interference icon 12 plus seconds left Teko 600 14 `color.textMuted` [new, spec §7.4 "תג קטן על הכרטיס של מי שנפגע"] |
| target (the picker is open from this card, D45) | The card gets a container (radius 12, padding 6, **14 at the bottom**, background `color.surface`) with a 2 dp **solid** `color.accent` outline, and stays **above the scrim**: the container is the scrim's hole (`targetFrameOf`). A "יעד" / "Target" chip sits on its bottom edge, its top 4 dp over the card and its bottom on the outline's outer side, so all of it is inside the hole (QA loop 6: with padding 6 all round it hung 8 dp past the hole and the scrim dimmed its lower half): height 20, radius 6, `color.accent` background, Rubik 700 12 `color.onAccent`. The word is drawn 2 dp wider on each side than its measured width (a hidden copy sizes the chip), so pixel rounding at a fractional density never cuts it to "י…". No march, no breathing, no hover state (there is no drag). Accessibility hint while targeted: the picker is open for this player. **Old (drag, replaced by two taps, D45):** the dashed marching outline, the hover fill and the "גרור לכאן" chip. |
| dimmed (not the target) | Opacity .4 (`opacity.dimmedCard`), under the scrim, not tappable [spec §7.3; round 1 used .38] |
| reconnecting / left / surrendered | See §3.3 |

### 3.5 VS badge [C]
36 × 24, `color.surface2`, 1 dp `color.border`, radius 6, slanted −8° (a `Slant` plate, §1.1; never a view's
`skewX`, which Android drops). "VS" in Teko 600 18, letter-spacing .04em, `color.textMuted`, upright over the plate.
`aria-hidden`.

### 3.6 Accessibility
- The card container is an accessible group whose label summarises it:
  - "MosheG · 55 נקודות · טעות אחת" [design]
  - "NinaVolt · 39.5 נקודות · בוחרת A8" [design]
  - Extended with the rating and connection state, e.g. "…, דירוג 1305, מחוברת"†.
- Mistakes, long form: "טעויות: אחת, הבאה עולה 2" [R1].
- Buttons inside the card stay separately focusable.
- **Solo practice's time** (my card's end, "זמן 3:12"): nothing on the game screen may change every second for the
  accessibility layer (QA run #2, Q1: uiautomator never found the screen idle, and a screen reader gains nothing from it). The
  clock is drawn as paths (`ClockDigits`, Teko 600 outlines in the `cellRef` line box, tabular digits so its box never
  resizes): on Android a text whose words change is an event. Its stat's label, "זמן 3:10", says the time in 5 s steps,
  rounded down (`clockLabelSeconds`).

**Tokens:** `color.text`, `color.textMuted`, `color.accent`, `color.accentSubtle`, `color.onAccent`, `color.danger`,
`color.surface`, `color.surface2`, `color.border`, `color.players[n].ring`, `color.status.*`.

---

## 4. Country flag [C]
- System emoji (Apple or Noto Color Emoji), drawn as `<Text>`.
- Sizes: **18** Home profile · **15** 2P card · **13** compact card and lists · **12** sheet subtitle.
- In a compact card the flag sits on the avatar's bottom-start corner (−10, −5) [R1].
- **A11y:** never read the emoji. The label is the country name, e.g. "מדינה: ישראל" [R1]. Inside a card, the flag is decorative because the card label carries the information.
- **Names** come from the app's own tables (`apps/mobile/src/i18n/countries/<lang>.json`, generated from CLDR by `npm run countries:names -w @sudoku-fight/mobile`), never from the phone: Hermes has no `Intl.DisplayNames`.
- **Country picker** (Register-Fighter, Edit profile): a field like the name's ("🇮🇱 ישראל · שינוי ⌄"), and a sheet in its `fill` form (§13) with a search and every country: flag 22 and the full name (Rubik 500 16, up to two lines), sorted by the name in the app's language; the chosen row on `color.surface2` with a gold tick. The search matches as a phone keyboard types (`countrySearch.ts`): the Hebrew ׳ ״ as ' " or left out (צ'כיה, צכיה), Latin without accents (curacao, turkiye), "&" as "and", "St." as "saint", and a few other names people use (USA, UK, Turkey, Holland, אמריקה, אנגליה); an exact name or code comes first.
- No colour tokens.

---

## 5. Rating number and league badge

### 5.1 Rating number
- Teko 600, tabular, LTR, `color.accent`. There is **no star icon in C** (round 1's star is dropped).

| Size | Use | Source |
|---|---|---|
| 44 | Home: three columns, each with a Rubik 500 13 `color.textMuted` label above ("מהיר", "רגיל", "קשה") and 1×40 `color.border` dividers between them | [C] |
| 22 | Leaderboard row | [R1→C] |
| 16 | 2P card | [new] |
| 15 | Compact card | [R1→C] |

- **Provisional** (the first 10 games in a rating key, §11.2): a chip, min height 18, radius 9, 1 dp `color.border`, Rubik 500 11 `color.textMuted`, "זמני". In lists and cards it follows the number. **On Home (44) it sits under the number, centred** (a word too long for its column takes a second line, centred, never "…": QA 2026-11-03, en-XA), and the number stays on one line, shrinking rather than being cut at the largest text sizes: beside it, the chip squeezed the numbers out of their third of the card (Moshe's device test, 14.10.2026). **So it does in my pinned leaderboard row** (beside "שחק"), whose line under the name ("בדירוג זמני · רמה 4") then has its room, and may take a second line before an ellipsis: beside the number, the chip cut that line to "בדירוג זמני · ר…" (QA run #2, B23). **Narrow or large text (QA loop 7):** below 340 dp of room at the normal text size (the window's width over its font scale), a leaderboard row's chip leaves the number for the line under the name, which wraps between its parts (the league's name, "· רמה N", the chip), and my pinned row gives "שחק" a line of its own under it; the leaderboard's tabs wrap when a label does not fit an equal share.
- **A11y:** e.g. "דירוג רגיל 1287"†.
- Works unchanged with rating option A (9 ratings) or B (3 ratings). The key comes from `ratingKey()`.

### 5.2 League badge
| Variant | Visual | Source |
|---|---|---|
| `text` | "ליגת זהב · רמה 14", Rubik 400 14 `color.textMuted` | [C, Home] |
| `icon` | Flat hexagon 16×18 filled with `color.league.<tier>` (no gloss, no stroke), then the tier name in Rubik 500 12 `color.league.<tier>`, then "· רמה 14" in `color.textMuted` | [R1 `badge.league`→C] |

- Tiers (§11.3): ארד to 1099 · כסף 1100–1249 · זהב 1250–1399 · יהלום 1400–1599 · אגדה 1600+.
- The tier is the **highest** of the player's ratings (D9).
- The badge is hidden until 10 provisional games are done in some rating key.
- All five league colours pass as text: ≥6.1:1 on `color.surface` and ≥6.6:1 on `color.bg` (lowest: bronze `#d08a52`).

**Tokens:** `color.accent`, `color.textMuted`, `color.border`, `color.league.*`.

---

## 6. Avatar badges for leader and rank (3–4P) [R1→C]
2P has no crown in C. In 3–4P each compact card gets a **rank badge**: height 22, min-width 30, padding 0 6, radius 6, Teko 600 18
tabular, LTR "#1".
- **#1:** `color.accent` background, `color.onAccent` text.
- **#2–#4:** `color.surface2` background, 1 dp `color.border`, `color.text`.
- Round 1's medal gradients are dropped. Only the leader is highlighted.
- When the leader changes, the badges cross-fade with an 8 dp vertical slide over 240ms (spec §6.8, "החלפת מוביל באנימציה"). A light haptic plays only when **I** take the lead (`motion.md` §7).

---

## 7. Player card: compact, 3–4 players [R1→C, structure from Game-3P and Game-4P]

### 7.1 Placement
| Players | Card widths | Gap | Height |
|---|---|---|---|
| 3 | 114 · 114 · 114 | 8 | 160 |
| 4 | **106** (me) · 78 · 78 · 78 | 6 | 160 |

- One row, 358 wide. The order is **fixed by seat** and never re-sorted (spec §6.8, so interference targets never move). Me is first, at the start edge.

### 7.2 Anatomy (column, items centred, padding-top 7)
| Part | Spec |
|---|---|
| Container | Background `color.surface`, 1 dp `color.border`, radius 12. **No skew, gradient or glow** (round 1's tinted gradient is dropped). |
| Rank badge | §6. Absolute: top −10, start −6. |
| Avatar | 34 framed in `players[n].ring` (§2). Presence dot at bottom-end, flag 13 at bottom-start. |
| Name row (mt 5) | Glyph 7 in `players[n].ring` (● ▲ ■ ◆), gap 4, name Rubik 500 11 (`type.plateNameCompact`) `color.text` with ellipsis, horizontal padding 5 |
| Rating (mt 2) | Teko 600 15 `color.accent`, height 12 |
| Score (mt 2, h 24) | Teko 600 28 `players[n].ring` plus mistake pips: each pip has height 14, padding 0 3, radius 4, 1 dp `color.danger` at 70%, Teko 600 13 `color.danger`. Each pip is the real penalty of that mistake, as the engine charged it (`PlayerView.mistakePenalties`, spec §6.5: what the right digit was worth there, e.g. "−8", "−6.5"). Show the last 2 where they fit: a 3-player card (114 dp) without "×n". A 4-player card (78 dp, mine 106) shows the last one only, and so does any card with "×n" (half points make two pips about 100–111 dp next to the score; penalty design, decision 3). Five or more mistakes show "×n" first. Should they still not fit (a large system font), the pips shrink and the oldest is cut, never the score. The design boards (`screens/*.dc.html`) still show "−1" and "−2", sample values from the old 1, 2, 4, 8 ladder, which Moshe removed on 2026-10-15. Take the layout from them, not the numbers. |
| Activity (mt 3, h 16) | Timer ring 16 (stroke 2, track `color.border`, arc `players[n].ring`, seconds Teko 600 11 `color.text` inside), then "בוחר" Rubik 500 11 `color.textMuted`, then the cell name Teko 600 17 `color.text` |
| Action strip | Absolute: start 5, end 5, bottom 4, height 32. **Opponent:** the compact "הפרעה" button (§8.1) at full width (not in a game without interferences, D44). **Me:** [כניעה][תגובות], each flex 1, gap 4, transparent, 1 dp `color.border`, radius 8, icon 17 `color.textMuted`. `hitSlop` top and bottom 6, giving a 44 dp target. |
| Text size (BRD-3; QA 2026-11-03, the replay at ×2.0) | Every word on the card grows with the phone's text size up to ×1.35 (`scale="hud"`: name, rating, score, pips, activity, place badge, hit chip, reconnect pill); the flag and the bot chip on the avatar and the ring's seconds stay at ×1.0. The score row (24) and the activity row (16, a least height) grow as much as their text (`compactRows`). The score is a TextInput (count-up, motion.md §6): its box (4 + its 25 line) is taller than its row, and given less it scrolls to its last line and loses the digits' tops, so it takes negative vertical margins and gets its whole box, centred on the row. The card is 160 high at least (`minHeight`) and grows only when its column and a shown strip need more (a ranked 3–4 player game at the largest sizes); with no strip (the replay) it keeps 160. |

### 7.3 States
Same as §3.4, plus:
- **Surrendered** (3–4P, D36): opacity .5, avatar grayscale, the activity line replaced by "נכנע"†. Cells this player solved keep their colour.
- **Left** (D4): same treatment, with "נטש"†.
- **Gain float:** "+2.5" in Teko 600 22 `players[n].ring` rises from the score (reduced motion: no float).
- **Reaction float:** see §8.2.

### 7.4 Accessibility
- Group label example: "Aiko_M · מקום 1 · 39 נקודות · בוחרת D4"†.
- Interference button: "הפרעה ל־Aiko_M · 4 נק׳" [R1] (the price is in the label, not on the button). While the picker is open from this card: "סגירת חלון ההפרעות".

**Tokens:** as §3, plus `color.surface`.

---

## 8. Card actions

### 8.1 Interference button ("הפרעה" on each opponent card) [new, D45]
**Moshe's decision, 2026-10-17 (spec §6.8, §7.3, D45).** The old "⚡ + next cost" button (drawn on Game-2P, Game-Bot, Game-3P and
Game-4P) is replaced. Original §10: "אצל היריב: לחצן הפרעה". The tap on an opponent's own button is also the target choice (§17).
- **Anatomy:** an icon button in the reactions-button family (§1.4): the new `interfere` icon (an outline bolt with impact sparks,
  stroke 2, not filled) plus the word **"הפרעה"** / **"Interfere"**. **No price on the button.** The price is in the picker (§13)
  and in the accessibility label.
- Height **44** (as the reactions button), radius 12, padding 0 10, gap 6. Background `color.interfere.bg`, 1 dp
  `color.interfere.border` (P1 at 8% / 55%: **in my colour, because it is my action** [C]). Icon 20 `color.interfere.icon`, label
  Rubik 600 14 `color.interfere.label`, one line.
- **2P, where the word doesn't fit at full size** beside the activity (§3.2 row 3, measured on the phone; QA loop 6): the icon
  alone, 44 × 44, padding 0, never shrunk by the row. Same label ("הפרעה ל־NinaVolt · עלות 2 נק׳"), so screen readers hear the
  same. Hebrew at 360 dp and wider keeps the word (Moshe, 17.10: "כתוב עליו רק הפרעה"); English, German, Russian and every
  language at 320 dp show the icon.
- **2P: opaque.** The 2P card has no surface, so the button sits right over the wandering digits (D126): its fill is P1 at 8%
  laid flat over `color.bg` (`opaqueOver`, `theme/blend.ts`), and so is the pressed fill; blocked, a `color.bg` veil lets .5 of
  the opaque button through. No digit shows through it (QA run #2, as B12/B50). The compact one sits on its card's
  `color.surface` and keeps the tokens as they are.
- **Compact (3–4P, §7.2 action strip):** height 32 plus `hitSlop` 6 (a 44 dp target), icon 16, label Rubik 600 12, one line,
  shrinking to fit (min scale .75) so "Interfere" fits the 68 dp strip of a 78 dp card.
- Every opponent card has its own button: 2P (the end of the status row) and 3–4P (each compact card). Never on my card.

| State | Visual | Label |
|---|---|---|
| available | As above | "הפרעה ל־NinaVolt · עלות 2 נק׳" |
| pressed | Background at 16% | — |
| expanded (picker open from this card) | Fill `players[0].ring`, icon and text `color.bg`, `expanded: true`. A tap closes the picker. | "סגירת חלון ההפרעות" |
| blocked: not enough points (D10), target under interference or in its 1 s immunity (D11), game not running | Opacity .5 (`opacity.inactivePlayer`; on the 2P card the same look from a `color.bg` veil at .5 over the opaque button, never a see-through button), `accessibilityState.disabled`. **The tap still answers:** a short toast with the reason and a light haptic, and the picker does not open. Points: error toast "אין מספיק נקודות להפרעה הבאה (8 נק׳)". Busy: warning toast "NinaVolt כבר תחת הפרעה. אפשר שוב בעוד 2 שניות". Not running: info toast. | "הפרעה ל־NinaVolt · חסרות 3 נק׳"† / "…כבר תחת הפרעה"† |
| opponent reconnecting or soft-offline (D42), out | Hidden. The reconnect pill (or the unstable mark) takes the slot (§3.3). | — |
| solo practice, practice vs a bot (D44) | **Not rendered**: no interferences in a game against a known bot (spec §7.2). The bot card's status row holds only its activity line. | — |

Launching is **two taps** (D45): this button, then a kind in the picker (§13). There is no drag. D18 (an accessible alternative to
drag) is obsolete: both taps are the screen reader's normal "activate", so they work with TalkBack and VoiceOver.

### 8.2 Reaction button, picker and float
- **Button:** the icon button "תגובות" on my card (§1.4) [C].
- **Picker** [R1→C]: a popover anchored under my card (4 dp gap).
  - Row of 6 emoji buttons, 44×44 each, emoji at 26: 😂 😱 😎 🤦 🔥 👀.
  - Container: padding 4, gap 2, `color.surface`, 1 dp `color.border`, radius 16. A 14 dp arrow (rotated square, same fill and border) points at the button.
  - Opens with a pop (200ms, `pop` spring, emoji staggered 40ms; `motion.md` `reactions.strip`). Closes on selection or an outside tap (120ms). `role=group`, label "תגובות".
  - Each emoji's label: "תגובה: צחוק / בהלה / קול / פספוס / אש / עיניים" [R1].
- **Rate limit** (D19, from `rules`): after sending, the button is disabled for 2 s at opacity .5.
- **Float:** the emoji at 36 rises 74 dp from the sender's avatar with a small wiggle, over 1.6 s (`sf-react`). At most 3 on screen. It never covers the board. Reduced motion: fade in at the card, hold, fade out.
- **Mute an opponent** is "via the opponent card's menu" (spec §8). **No board shows that menu.** See §17.

### 8.3 Surrender button
- The icon button "כניעה" on my card, flag icon, `color.textMuted` [C]. Round 1's red icon is dropped.
- In practice the label is "סיום אימון" (spec §6.6).
- Opens the modal in §14.

---

## 9. Score lead bar [C 2P · R1→C 3–4P]

### 9.1 Two players
- Top 224, 358 × **4**, gap 2, radius 2 per segment [C].
- Two segments in `players[n].ring`. **Segment order follows the cards**: my segment is under my card (right in Hebrew, left in English).
  - In the C board the bar is `dir=ltr` with the opponent on the left, which matches Hebrew.
- Width of each segment = max(0, score) ÷ the sum of the clamped scores, kept between 6% and 94% (negative scores are allowed, D15) [R1]. 0 : 0 splits 50/50.
- **Lead tag** [R1→C, required by spec §6.8 "סימון ברור של המוביל"]:
  - Centred on the split point, 3 dp under the bar, kept at least 24 dp from either edge.
  - Height 15, padding 0 5, radius 4, background `color.bg`, 1 dp border, label "+15.5" in Teko 600 15. Border and text use the leader's `players[n].ring`.
  - On a tie: "שוויון" in Rubik 500 11 `color.textMuted` with a `color.border` border.
- **Motion:** segment widths and the tag position animate over 650ms (standard easing). When the leader changes, the tag colour cross-fades over 240ms. A light haptic plays only when **I** take the lead (`motion.md` §7).
- **A11y:** `role=img`, label "MosheG מוביל ב־15.5 נקודות" [design]. Announce leader changes through the live region (§11.6).

### 9.2 Three to four players
- Same 358 × 4 bar. Segments are ordered **by place** (1st at the start) [R1], gap 2, coloured `players[n].ring`.
- The lead tag shows the gap between 1st and 2nd ("+2.5") and **the leader's glyph (6 dp)** before the number, so the tag does not rely on colour alone.
- **A11y:** "Aiko_M מובילה ב־2.5 נקודות"†. The full ranking is in each card's label.

**Tokens:** `color.players[n].ring`, `color.bg`, `color.border`, `color.textMuted`.

---

## 10. Lock timer strip ("המשבצת שלך F8 · 7 שניות") [C]
**Placement (2P):** top 248, start 16, end 16, height 24. Space-between with gap 12.

| Part | Spec |
|---|---|
| Text group (start) | Baseline-aligned, gap 6, single line: "המשבצת שלך" Rubik 500 15 `color.textMuted` · "F8" Teko 600 24 `players[0].ring` (LTR) · "·" Rubik 500 15 `color.iconFaint` (`aria-hidden`) · "7 שניות" Rubik 500 15 `color.text` (plural rules: "שנייה אחת"†) |
| Progress (end) | 96 × 4, radius 2, track `color.surface2`, fill `players[0].ring`. Fill width = remaining ÷ lock length (8, 12 or 18 from `rules`). Fills from the **start** edge. Drains linearly, 1 s steps animated. |

| State | Visual |
|---|---|
| no lock | The text group shows a target icon 16 plus "בחר משבצת" Rubik 500 15 `color.textMuted`. The bar is hidden [R1→C, round 1's gold chip is calmed]. |
| nudge (a disabled key was pressed) | The "בחר משבצת" group shakes once (300ms) and a light haptic plays [R1] |
| locked | As drawn |
| urgent (≤ 3 s) | The seconds text, the bar fill (`color.progress.timerWarning`) and the cell's seconds pill switch to `color.accent` (pill text `color.onAccent`). The seconds text and the pill blink opacity 1 ↔ .35 on a 1 s loop, as round 1 did ("זהב מהבהב"; `motion.md` `lock.urgent`). Reduced motion: gold without the blink. The ring stays P1. Haptic tick once per second. Gold rather than red, because a timeout has no penalty (D2) and red means penalty. |
| paused (I am under interference, or the game is frozen) | Text "המשבצת שלך F8 · מושהה"†, a pause icon, the bar fill turns `color.textMuted` and freezes |
| released | The strip cross-fades back to "no lock" over 240ms |

- **3–4P:** the same component. Where the screen places it (above the board, or next to the release button as in Game-4P) is a stage-10 layout decision.
- **A11y:**
  - The bar: `accessibilityRole="progressbar"`, label "זמן שנותר למשבצת F8" [design], `accessibilityValue {min:0, max:12, now:10}`.
  - The whole strip is one group, e.g. "המשבצת שלך F8, נותרו 10 שניות"†.
  - **Do not announce every second.** Announce on lock, at 3 s, and on release.
  - **No label changes every second either** (QA run #2, Q1): a changed label is an accessibility event, so the strip's label,
    the bar's `accessibilityValue` and the cell's label (§11.5) say the seconds in 5 s steps, rounded down, and every second
    only in the last 5 ("נותרו 10 שניות" from 12 to 10, then 5 from 9 to 5, then 4, 3, 2, 1; `labelSecondsLeft`). The
    strip's text and the cell's pill still show every second, and the announcements say the exact seconds.

**Tokens:** `color.textMuted`, `color.iconFaint`, `color.text`, `color.progress.timerTrack` (= `color.surface2`), `color.players[0].ring`, `color.accent`, `color.onAccent`.

---

## 11. Board and cells

### 11.1 Geometry [C]
| Property | Value |
|---|---|
| Frame | Top 288, x 16, **358 × 358**, `direction: 'ltr'` |
| Container | 3 × 3 boxes, **gap 3**, background `color.board.boxGap` (= `color.bg`), radius 12, `overflow: hidden` (this rounds the outer corners of the corner boxes) |
| Box | 3 × 3 cells, **gap 1**, background `color.board.grid` |
| Cell size | ((W − 6) ÷ 3 − 2) ÷ 3 = **38.4** at W = 358 |
| Digit | Rubik **22**, roughly 0.57 × the cell size when scaled. From the phone's text size ×1.15 (BRD-3): **25**, and the wrong digits 11 → 12 (`geometry.ts` `LARGE_TEXT`, `cellTextPx`) |
| Text size | Every text on the board ignores the phone's text size above ×1.0 (`Text scale="board"`, `FONT_SCALE_CAPS`): the cell is fixed, so a bigger digit would be cut. Smaller text still shrinks. Spec §22 |
| Checkerboard | Boxes 1, 3, 5, 7 use `cellAlt`. Boxes 0, 2, 4, 6, 8 use `cell`. |
| No shadow or frame | Round 1's 16-radius frame and drop shadow are dropped |

- **Scaling:** W = min(screen width − 32, height available after the cards, strip and keypad). Every inner value scales with the cell size. Corner offsets stay in whole dp.
- **Coordinate rails** (A–I down the side, 1–9 across the top; Rubik 600 10 `color.textMuted`, the active row and column in `players[0].ring`) existed in round 1 and are **not drawn in C**. Ship them as an optional `showCoordinates` prop, off by default. See §17.

### 11.2 Fixed corners inside a cell [R1, kept in C]
Top-start (top-left, the board is LTR) **owner glyph** · top-end **lock seconds pill** · bottom-end **wrong digits** · centre
**digit or mini avatar**. These positions never move, so cues never collide.

### 11.3 Cell states
| # | State | Background | Content | Extras | Source |
|---|---|---|---|---|---|
| 1 | **Empty** | `cell` / `cellAlt` | — | — | [C] |
| 2 | **Given** | `cell` / `cellAlt` | Digit Rubik **600** `color.board.given` (`type.digitCell`; C asks for 600, and `tokens.json` loads Rubik 600 so it is not faked) | Not tappable | [C] |
| 3 | **Solved by me** | `players[0].tint` | Digit Rubik **500** `players[0].digit` | **Glyph ● 6 dp** at top-start (3, 3) in `players[0].glyph` (= digit; `size.solverGlyph`) | Colours [C]. Glyph [R1→C]: C leaves out shapes, which CLAUDE.md requires. |
| 4 | **Solved by opponent n** | `players[n].tint` | Digit Rubik 500 `players[n].digit` | Glyph ▲ ■ ◆ 6 dp in `players[n].glyph` (paths: `players[n].shapePath`) | Same as #3 |
| 5 | **My lock** | `players[0].tint` | — | **Ring:** inset 3 dp `players[0].ring`, plus **[new]** a 1 dp inner edge in `players[0].lockEdge` (the bright ring alone is 1.7:1 on the tint; the edge gives 5.3:1, WCAG 1.4.11). **Pulse:** a second inset band from 3 to 7 dp in `players[0].lockPulse` (ring at 28%), fading in and out over 1.6 s ease-in-out, infinite (`sf-lock`). **Seconds pill** at top-end (3, 3): min-width 16, height 16, padding 0 4, radius 8, `players[0].ring` background, Teko 600 15 `players[0].onRing` (urgent: `color.accent` / `color.onAccent`). | [C], edge [new] |
| 6 | **Opponent lock** | `cell` / `cellAlt` (unchanged, no stripes: C has no textures) | **Mini avatar 22**, radius 7, centred | Ring inset 3 dp `players[n].ring`, plus **[new]** the 1 dp `players[n].lockEdge` inner edge (rings alone are 1.3–3.0:1 on the light cells). No pulse and no visible seconds (C keeps the board calm). The seconds are in the label. | Ring and avatar [C] (spec §6.2.8: ring + small avatar), edge [new] |
| 7 | **Wrong digits** (overlay on any state) | — | — | At bottom-end (right 3, bottom 2): Rubik 700 **11** `color.board.wrongDigit`. Several are separated by a space. Show the last 3. **They stay after the cell is solved**, and every player sees them (§6.5). | [C] position, colour token [new] |
| 8 | **Peer of my lock** | — | — | **Not used in V1.** C draws no row, column or box highlight, and `color.board.peer` is `null` (round 1's peer tint was too close to the P4 tint). If approved later, a C-neutral `#dfe3ec`. | — |
| 9 | **Lock pending** (tap sent, server not yet confirmed) | `cell` / `cellAlt` (no tint yet) | — | Ring at 50% opacity, no pill, no pulse. If rejected, behaves like #11. Gives feedback within 140ms despite latency (`motion.md` `cell.pending`). | [new] |
| 10 | **Lock paused** (my interference, game freeze) | as #5 | — | The pulse stops. The pill shows a pause glyph (two 2 × 7 bars). The opponent lock keeps its look. | [R1→C] |
| 11 | **Taken** (tap on an opponent's lock) | as #6 | — | Shake 300ms plus a short haptic (`impact(Medium)`, `motion.md` §7). No penalty (§6.2.3). Announced as "תפוסה". | [R1] |
| 12 | **Correct (transient)** | Settles to #3 or #4 | Digit pop 420ms (`pop` spring) | Tint flash: `players[n].ring` at 60% (`opacity.correctFlash`) fading to 0 over 700ms. A "+3.5" chip (`color.bg`, radius 8, Teko 600 22 in `players[n].ring`; a bare ring colour on the light board would be 1.8:1) pops above the cell and flies to the card (§3.4). | [R1→C] |
| 13 | **Wrong (transient)** | unchanged | The digit appears in `color.board.wrongDigit` | Flash: `color.danger` at 55% fading to 0 over 550ms, plus shake 300ms. A "−6.5" chip (`color.bg`, `color.danger` text; the penalty, spec §6.5) flies to the card. The digit then becomes a small wrong mark (#7), and the cell is **released to everyone** (D3). | [R1→C] |
| 14 | **Queued offline** (my digit entered while my connection is lost, waiting to be sent and judged; spec §16.2, D42) | `cell` / `cellAlt` (no tint: nothing is mine yet) | Digit Rubik 500 `players[0].digit` | The pending ring of #9 (`players[0].ring` at 50%, no edge, no pill, no pulse), and a **wifi-off icon** at top-end (3, 3), `size.solverGlyph` (6 dp scaled), in `players[0].glyph`. Not tappable. **Static**: it appears with the ring's normal fade-in, and under reduced motion at once. On the server's answer it becomes #12 then #3, or #13; a move that did not count shakes like #11 and shows a short warning toast ("D5 נתפסה בזמן שלא היה לך חיבור · בלי קנס"). Label: "D5, 7, ממתין לחיבור". Precedence: filled > queued > lock > pending > empty. | [new, Moshe 2026-10-15] |

**"Cell under interference":** there is no per-cell interference state in V1. The interference is a full-screen overlay until D35 is
approved. What it changes on the board is the **paused lock** (#10) for the victim (§6.2.7).

**Interaction:**
- Tap an empty, unlocked cell → lock it (#9, then #5).
- Tap my own lock → nothing.
- Tap a given or solved cell → nothing.
- Within 1 s after a release, re-locking the same cell is refused (D2): treat it like #11 without the word "תפוסה".

**Implementation notes:**
- RN has no inset box-shadow. Draw the ring, the 1 dp edge and the pulse band as absolutely positioned bordered Views.
- Animate with Reanimated 4, honouring `ReduceMotion.System`. Reduced motion: no pulse, no pop, static flash frames.

### 11.4 Corner collisions
When an opponent-locked cell also has wrong digits, shift the mini avatar up 3 dp so it clears the bottom-end digits.

### 11.5 Accessibility labels for a cell
Each cell is a button inside a container with `accessibilityRole="grid"`. Label pattern:
`{cell}, {content}, {state}[, {owner}][, {seconds}][, {wrong digits}]`.

| State | Label |
|---|---|
| Opponent lock | **"D5, ריקה, נעולה על ידי NinaVolt, 4 שניות"** [work plan §3] |
| Empty | "D5, ריקה"† |
| Given | "D5, 4, רמז"† |
| Solved by me | "D5, 6, נפתרה על ידיך"† |
| Solved by opponent | "D5, 7, נפתרה על ידי NinaVolt"† |
| My lock | "F8, ריקה, נעולה אצלך, 10 שניות"†, hint "בחר ספרה במקלדת"† |
| Lock paused | "F8, ריקה, נעולה אצלך, הטיימר עצור"† |
| Wrong digits suffix | "…, טעויות במשבצת: 5, 3"† |

- **Board container label:** "לוח המשחק · המשבצת שלך F8 · NinaVolt תופסת A8" [design].
- **`{seconds}`** go in 5 s steps, every second only in the last 5 (§10, Q1): 7 seconds left read "5 שניות".

### 11.6 Live region [new]
C removed round 1's visible event log ("I1 +3.5"). Keep an **invisible** live region (Android `accessibilityLiveRegion="polite"`,
iOS `announceForAccessibility`) that announces opponent moves and leader changes. Throttle it to at most one announcement per
1.5 s and merge bursts. Example: "NinaVolt פתרה את A8, ‎+3.5"†.

**Tokens:** `color.board.*`, `color.players[n].ring/tint/digit/glyph/onRing/lockEdge/lockPulse`, `color.bg`, `color.accent`, `color.onAccent`, `color.danger`.

---

## 12. Keypad [C] (with the cancel button)

### 12.1 Digit row
| Property | Value |
|---|---|
| Frame | Top 666, x 16, 358 × **60**, `direction: 'ltr'`, gap 4 |
| Key | 9 keys at flex 1 (about 36.2 wide), height 60, background `color.surface2`, border 1 dp `players[0].ring` at 50%, radius 10, column with gap 5 |
| Digit | Teko 600 **32**, line-height .8, padding-top 4, `color.text` |
| Remaining count | Rubik 500 12 `color.textMuted`. It is 9 minus the occurrences on the board (givens plus solved, **not** wrong marks). |
| Text size | The key's digit and count ignore the phone's text size above ×1.0 (`scale="board"`): the 60 dp key can't grow. The HUD around the board (lock strip, "ביטול בחירה", card names) grows up to ×1.35 (`scale="hud"`). Spec §22 |
| Order | Always 1–9 from left to right, in both languages. The one exception: during a `keypad` hit on me (D47, 5 s) the keys change places; each key keeps its own digit, count and state (§15.4) |

| State | Visual | Label |
|---|---|---|
| armed (I hold a lock, **or the cell I just tapped is waiting for the server**, BRD-1) | As above. While a tap is pending, the keys belong to that cell: its tried digits and the board's counts. A digit goes to the cell the player sees selected (`boardModel` `keypadCell`); if the server refuses that select, the digit comes back refused, with no penalty. | "ספרה 5 · נותרו 3" [design] |
| pressed | Background `color.keypad.keyPressedBg` (`#2a3140`), border `color.keypad.keyPressedBorder` (P1 at 100%), `translateY(3)` (`elevation.keyPressed`) for 80ms. No press haptic: the result haptic follows within about 150ms (`motion.md` §7). | — |
| idle (no lock) | The whole row looks as at opacity .55 over `color.bg`, borders `color.border`, `disabled`. A tap nudges the lock strip (§10). **The keys stay opaque** (D126: no wandering digit shows through a key): each key draws a veil of `color.bg` over its face and lip at 1 − .55, never an opacity on the row or the key (B15, B50). The same for the two states below. | "ספרה 5, נשארו 3, קודם בוחרים משבצת" [R1] |
| complete digit (0 left) | Opacity .3, count "0", `disabled` | "ספרה 6, נשארו 0" [R1] |
| **tried wrongly in this cell** (D12, disabled for **every** player for this cell) | Opacity .55. The digit is drawn in `color.danger` with a 1.5 dp strike line in `color.danger`. The count is unchanged. `disabled`. Complete-digit styling wins if both apply. | "ספרה 5 · כבר נוסתה במשבצת הזו"† [new; no board draws this state] |

### 12.2 Cancel selection ("ביטול בחירה") [C]
- A ghost button (§1.3) centred under the keypad: top 742, height 44, padding 0 16, gap 8.
- Release icon 20 (rounded square with ×). Label Rubik 500 15 `color.textMuted`.
- **Enabled only while I hold a lock.** Otherwise opacity .4 and `disabled`.
- Tap → release (§6.2.5), a selection haptic (`motion.md` §7), and the cell fades back over 240ms.
- Label "ביטול בחירה, F8"† (round 1 showed the cell name as a chip; C keeps it out of view, but the label includes it).
- There is no "delete" key in V1 (§6.3).

**Tokens:** `color.keypad.*`, `color.border`, `color.text`, `color.textMuted`, `color.danger`, `color.players[0].ring`.

---

## 13. Drawer / bottom sheet, and the interference picker [R1→C; the picker: new, D45]

> **Arsenal.dc.html and Interference-Target.dc.html: ישן: גרירה — הוחלף בשתי הקשות (D45).** Both boards still draw the drag
> tray (big tokens, the "גרור אל…" hint, the drag ghost, the dashed drop zone). Until they are redrawn, this section, §3.4 ("target")
> and §8.1 win. Interference-Drag.dc.html was deleted on 2026-10-18. Moshe's decision of 2026-10-17 (spec §7.3) replaces the drag
> of original §16 by two taps: the "הפרעה" button on an opponent's card (§8.1), then a kind in this picker.

**Anatomy:** scrim › sheet (handle, header, content). In the interference picker the target card stays above the scrim, framed
(§3.4 "target"), and the scrim has a hole over it.

| Part | Spec |
|---|---|
| Scrim | Full screen, `color.scrim` (`rgba(7,9,12,.72)`). Tap → close. Picker label "סגירת חלון ההפרעות וחזרה ללוח"†. Fade 240ms. Other cards under it can't be tapped. |
| Sheet | Full width, bottom 0, radius **24** on the top corners (the Foundations token said 28, but every sheet drawn uses 24), background `color.surface`, top border 1 dp `color.border`, padding 10 16 (16 + bottom safe area), max height 85%. No glow or gradient. `fill`: always 85% high, the content filling it (a long scrolling list: the country and avatar pickers). |
| Handle | 40 × 4, radius 2, `color.border`, centred, `aria-hidden`. Dragging down past 25% of the height (or a fast fling) closes the sheet. This pull-to-close is the only gesture left in the picker. |
| Header (mt 8, h 48) | Title Rubik 700 22 `color.text`: "בחר הפרעה"†. A close icon button 44 at the end ("סגירה"). **Target line**, Rubik 500 13 `color.textMuted`. **2P:** "יעד:", a mini avatar 18 (radius 5, 1.5 dp ring in the target's `players[n].ring`), the seat glyph (▲ ■ ◆), the name in Rubik 500 `color.text`, and a flag at 12. **3–4P:** the route "[my avatar, ●] אני ← [their avatar, ▲] Biscuit", both rings in seat colours with their glyphs; one accessibility element, "הפרעה ממני אל Biscuit"†. The target never changes inside the sheet (spec §17). |
| Price row (mt 10, h 48) | `color.surface2`, 1 dp `color.border`, radius 12; one accessibility element. Start: "מחיר" (muted) and the price "‎−2 נק׳" (the number in Teko 600 30 `color.accent`, through `signedText()`, so the minus never jumps in Hebrew), then muted "· הבאה: 4". End: "הניקוד שלך" and the score before and after the launch ("53 ← 51" in Hebrew, "53 → 51" in English) in Teko 600 22 `players[0].ring`, through `scoreText()`. Short of points: the end says "חסרות 3 נק׳". Target busy: "NinaVolt כבר תחת הפרעה · 2 שנ׳". Where the two halves don't fit one line (Thai, German), they share the row and their words ("· הבאה: 4", "הניקוד שלך") wrap to a second line inside the 48 dp, then shrink to .75; the numbers keep their size, and one half never draws over the other (B45). |
| Grid (mt 12) | **3 columns × 2 rows**, gap 8, flex-wrap; the reading order follows the app direction. Column width = (window − 32 − 2 × 8) / 3: 104 at 360, 114 at 390. Order: `INTERFERENCE_KINDS` (זיקוקים, חתולים, עיוות, מספרים מתערבלים, דיו, מקלדת מתערבלת). Only the kinds in `view.rules.interferenceKinds` are shown (spec §7.2, D47); the rest are hidden, not locked. **No "בקרוב" row** in the game: future kinds stay on the Interferences collection screen. |
| Kind button | A plain Pressable (no gesture). Height 100, radius 16, `color.surface2`, 1 dp `color.border`, padding-top 8. Preview art 40 (the §16 "Preview": a live loop; still under reduced motion, or when locked or blocked). Name Rubik 600 13/16, centred, up to 2 lines ("מספרים / מתערבלים"). Price chip: mt 6, h 22, radius 11, `color.bg`, one text "‎−2 נק׳" with the number in Teko 600 17 `color.accent` and the unit in Rubik 500 11. Pressed: border `color.accent`, background `color.accentSubtle`, scale .96 (`press` spring; no scale under reduced motion). |
| Locked kind (D17) | Stays in its place, opacity .5, still art, the chip shows a lock and "רמה 3" in `color.textMuted`. A tap explains ("נפתחת ברמה 3"†) and never launches. |
| Blocked kind | Opacity .5; the chip shows "חסרות 3 נק׳" or "תחת הפרעה". A tap explains (a 2 s bubble, announced, cue `nudge`) and never launches. |
| Info line (mt 10) | Rubik 500 12 `color.textMuted`, centred: "כל הפרעה נמשכת 5 שניות · הקשה משגרת"†. |

- **No scrolling** (Moshe: all kinds visible at once): 14 (handle) + 56 (header) + 58 (price) + 12 + 2 × 100 + 8 (grid) + 26 (info)
  + 16 + bottom inset ≈ 390 dp + inset. At a 48 dp inset that is 438 dp, under 85% of a 780 dp screen (663) and of a 640 dp screen
  (544). The layout is a pure function of width, height, inset and the number of kinds, with a Jest test for 360×780 and 360×640.
- **Launch (the second tap, D45):**
  - Taps in the first **250 ms** after the sheet opens are ignored, silently (`ARSENAL_CONFIG`, a setting). A fast double tap on
    "הפרעה" therefore never launches.
  - A launchable kind launches at once, with no confirm: one launch per opening (a second tap before the answer sends nothing), the
    launch cue (sound and haptic), the announcement "שיגרת זיקוקים אל NinaVolt"†, `host.interfere(target, kind)`, the sheet closes
    in 200 ms, and a ripple runs on the target card (full motion only).
  - The sender toast "זיקוקים ← NinaVolt" and the cost on my card come from the host's confirmation, as before.
  - Refused by the server after the sheet closed (the target just turned busy, the score changed): a warning toast "ההפרעה לא
    נשלחה, ולא ירדו לך נקודות"†.
- **3–4 players (spec §17, never the wrong target):** the target is set only by the tap on that opponent's own button. There is no
  default and no target row in the sheet. The target card is framed above the scrim, the others dimmed under it. To hit someone
  else: close the sheet and tap their "הפרעה". If the target goes out or disconnects, or the game ends, the sheet closes by itself.
- **Motion:** enter `translateY(100% → 0)` with standard easing: 240ms for the interference picker (round 1 "מגש הארסנל עולה",
  `motion.duration.trayRise`), 320ms for other sheets (`sheetIn`). Exit 240ms (200ms after a launch). Reduced motion: 200ms fade.
- **A11y:**
  - `accessibilityViewIsModal`, role dialog, label "חלון ההפרעות"†. Initial focus on the title. The picker is an overlay, not an
    RN `Modal` (no native window), so it never holds up the move to the results.
  - Android back and the iOS escape gesture close it.
  - Each kind's label names the kind, the price and the target: "זיקוקים · 2 נק׳ · הקשה משגרת אל NinaVolt"†; a locked or blocked
    kind says why. Activating it launches; there is no long-press alternative (D18 is obsolete).
- **RTL:** header and content mirror. The numbers are LTR isolates. The grid follows the app direction (it is not the keypad).

**Old (drag, replaced by two taps, D45; kept here only to read the old boards):** a next-cost row of 60 dp with "שיגור בגרירה
בלבד", tokens of 108 × 136, a separate row of locked tokens (76 dp) with "רמה 18" chips, the hint pill "גרור אל הכרטיס של NinaVolt
כדי לשגר", the drag ghost (lift 1.08, `token.lift`), the cancel spring (`launch.cancel`), and the tap bubble "גרור אל NinaVolt,
הקשה לא משגרת". None of these is built any more.

**Tokens:** `color.scrim`, `color.surface`, `color.surface2`, `color.border`, `color.text`, `color.textMuted`, `color.iconFaint`,
`color.accent`, `color.accentSubtle`, `color.onAccent`, `color.bg`, `color.players[n].ring`.

---

## 14. Modal (from Surrender) [R1→C]
There are two shells with the same content model: icon, title, body, actions, and an optional footnote.

### 14.1 In-game confirm (bottom-anchored, the board stays visible above it)
| Part | Spec |
|---|---|
| Scrim | `color.scrim`. Tap = "ביטול". No blur (C drops round 1's blur and red radial). |
| Panel | Full width, bottom 0, radius 24 on the top corners, `color.surface`, top border 1 dp `color.border`, padding 24 24 (26 + safe area), centred column. Round 1's 150 dp flag illustration and halftone are dropped. |
| Icon | 40 dp circle, `color.danger` at 15%, 1 dp `color.danger` border, flag icon 18 `color.danger` [R1 `sheet.confirm`] |
| Chip (optional) | "כניעה": h 24, radius 12, 1 dp `color.danger` at 60%, Rubik 700 11 `color.danger` |
| Title | Rubik 700 **22**/1.25 `color.text`, balanced wrap: **"אתה בטוח שאתה רוצה להיכנע?"** (spec §6.6) |
| Body | Rubik 400 15/1.45 `color.textMuted`: "המשחק ייחשב כהפסד · שינוי דירוג משוער −15", with "−15" in Teko 600 21 `color.danger` [R1] |
| Score summary (optional) | Mini 2P summary: avatars 36, scores Teko 600 28 in the ring colours, a 6 dp lead bar. Background `color.surface2`, radius 12. No skew. |
| Actions (mt 24, gap 12) | **"ביטול"**: primary `lg` (60), flex 1.4, skewed gold. It is the prominent and safe choice (§6.6). **"כן, להיכנע"**: danger `lg` (60), flex 1 (§1.5). |
| Footnote | Rubik 500 12 `color.textMuted`: "המשחק ממשיך ברקע", with a static 7 dp `color.danger` dot (round 1 blinked; C does not). The lock timer is **not** paused (§6.2.7). |

**Variants:**
- **Practice:** title "לסיים את האימון?", buttons "כן, לסיים" and "ביטול" (§6.6).
- **3–4P** (D36): body copy TBD. The player leaves the game, and their solved cells keep their colour.
- **No rating lost** (2P, the leave guards of spec §11.2, Moshe 2026-10-15): when a surrender now costs no rating (I have not placed a digit yet, or I am not behind), the Body is one plain line in the same Rubik 400 15/1.45 `color.textMuted`, with **no Teko number**: "המשחק ייחשב כהפסד · הדירוג שלך לא ירד, כי עוד לא ביצעת מהלך" / "…, כי אין לך פיגור". 3–4P with nobody still in ahead of me: the 3–4P body plus "הדירוג שלך לא ירד מול אף שחקן שנשאר במשחק."

### 14.2 Centred dialog (outside a game, e.g. "אין חיבור לאינטרנט")
- Width min(342, screen − 48), padding 20, radius 20, `color.surface`, 1 dp `color.border`, column gap 8.
- Header row: icon circle 40, then the title in Rubik 700 18.
- Body: Rubik 400 14/1.45 `color.textMuted`.
- Actions row, gap 12: primary `modal` (48) at flex 1.5 ("עבור לאימון") and secondary `modal` at flex 1 ("נסה שוב") [R1 `modal.confirm`].
- Enter: fade plus scale .96 → 1 over 240ms. Reduced motion: fade.
- **A label too long for its share (both shells, QA loop 3):** "מחק את החשבון לצמיתות" beside "ביטול" shrank to about a
  third of its size (Android's `adjustsFontSizeToFit` has no floor). Each label is measured once, unseen, in its
  button's style: a transparent copy drawn far above the screen, removed as soon as it is measured (never a second
  text over the buttons for a finger or for uiautomator), and its width is kept per label, style and text scale, so the
  next dialog with that label opens in its final layout; when one doesn't fit its flex share of the row, the two actions stack (column, gap 12), in the same
  order, each the whole width, upright (the pair rule is for a row), and a label still too long takes a second line
  at its own size (`wrapLabel="always"`). Never smaller text.
- **Notice** (`notice`): one action only ("הבנתי"), which takes the first focus; e.g. Settings' "מחיקת חשבון" for a
  Google-only account in a build without Google sign-in.

**A11y (both):** `accessibilityViewIsModal`, `role=dialog` label "אישור כניעה" [R1]. **Initial focus goes to the safe action
("ביטול").** Android back = the safe action. The title is a header.

**Tokens:** `color.scrim`, `color.surface`, `color.surface2`, `color.border`, `color.text`, `color.textMuted`, `color.danger`,
`color.accent`, `color.onAccent`, `color.accentShadow`.

---

## 15. Toast and interference banner [R1→C]

### 15.1 Toast
| Property | Value |
|---|---|
| Position | Top, under the safe area plus 8, inset 16 on both sides. It **never covers the board**, only the card area. One toast at a time, queued. |
| Box | Height 40 (`size.toast`; not tappable) for one line, taller when the text wraps (padding 6 12), gap 10, `color.toast.bg`, 1 dp `color.toast.border.<variant>`, radius 12. **No skew and no shadow** (round 1 was skewed). |
| Icon | 24 dp circle filled with `color.iconBg.<semantic>` (16%), glyph 14 in the semantic colour (≥3.9:1 on the circle) |
| Text | Rubik 500 14/18 `color.text`, one line where it fits; otherwise it wraps between words and the box grows, never an ellipsis (QA loop 9: the cost in "אין מספיק נקודות להפרעה הבאה (2 נק׳)" was cut at 360 dp). The one exception is the sender's chip under the cards (`motion.md` `sender.toast`): two lines at most, so it ends above the board, and only its tail, the target's name, may shorten. Inline cell names in Teko 600 17. |
| Motion | Enter: slide down 12 dp plus fade, 240ms. Exit: fade 240ms. Reduced motion: fade only (`motion.md` `toast`). |

| Variant | Border / icon colour | Role | Default duration (assumed, not on any board) | Example [R1] |
|---|---|---|---|---|
| success | `color.success` | status | 2.5 s | "חזרת למשחק. הלוח והניקוד סונכרנו" |
| warning | `color.accent` | status | While the condition lasts, max 3 s | "עוד 3 שניות והמשבצת F8 משתחררת" |
| error | `color.danger` | alert | 4 s | "אין מספיק נקודות להפרעה הבאה (8 נק׳)" |
| connection | `color.textMuted` | status | Until resolved | "היריב מתנתק…" plus a countdown pill (h 26, radius 13, `color.bg`, 1 dp `color.textMuted`, Teko 600 18) |
| info (sender) | border `color.toast.border.info` (= `color.border`), icon `color.toast.iconInfo` (= `color.textMuted`; an icon in the border colour would be 1.2:1) | status | 2 s (`motion.md` `sender.toast`) | "זיקוקים ← NinaVolt" (spec §7.4) |

### 15.2 Interference banner (shown to the victim)
- Same placement, **height 52**, 1 dp `color.accent`, `color.surface2`, radius 12. Drawn above the interference overlay.
- **Content:**
  - Sender avatar 34 framed in the sender's `players[n].ring`.
  - Title "NinaVolt שלחה לך זיקוקים!" in Rubik 700 16 `color.text`, with ellipsis.
  - Subtitle "זה עלה לה 2 נק׳ · המשחק ממשיך" in Rubik 400 12 `color.textMuted`.
  - Countdown ring 38 (stroke 3, track `color.border`, arc `color.accent`, draining over 5 s, linear) with the seconds in Teko 600 22 `color.accent`.
- **Motion:** round 1's slam becomes a drop-in: 16 dp with the `settle` spring (about 300ms), out 240ms (`motion.md` `hit.banner`). Reduced motion: fade.
- **A11y:** `role=alert`. The timer's label is "נותרו 3 שניות" [R1], announced only when the banner appears. The announcement also
  says the board is dimmed (§15.3) and that my lock timer is stopped.
- **A kind this app does not know** (sent by a newer app, D47): a generic title "NinaVolt שלח/ה לך הפרעה!"†, the dim of §15.3, no
  effect, no rumble. Never a crash or a raw i18n key.

### 15.3 Board dim during a hit [new, D46]
Moshe's request of 2026-10-17 (spec §7.2): every hit darkens the victim's board.
- A layer of `color.scrim` (`#07090c`) at **60%** opacity (`HIT_DIM` in `apps/mobile/src/components/interference/config.ts`), the
  **same for every kind**, over the **board only**: inside the board slot, under the kind's effect and the banner. It follows the
  board's radius, and warp tilts it with the board. The keypad and the cards stay bright, so play goes on.
- **Timing:** from the hit's own clock: fade in 240 ms, hold, and gone exactly at `endsAt`. Frozen while the game is frozen. It
  never pulses.
- **Readability (tokens):** given digits about 3.5:1 and P1 digits about 2.4:1 on their cells under the dim: readable with effort.
  A Jest test keeps every digit colour at 2:1 or more under the dim.
- **Reduced motion:** the same dim, static, with a 200 ms fade (opacity only).
- **Who sees it:** only the victim. The sender and third players see the small hit chip on the victim's card (§3.4).
- **A11y:** the layer is hidden from the screen reader; the banner announces the dim (§15.2).

### 15.4 The new kinds (D47): scramble, ink, keypad [new]
Three kinds Moshe asked for on 2026-10-17 (spec §7.1). No board draws them. Same 5 s, same cost, same banner and dim. Each is
seeded from the game and the interference event's `seq` (deterministic, no `Math.random()`), and none changes what a tap or a key
enters.

| Kind | What the victim sees | Reduced motion | Preview art (40 dp, picker) |
|---|---|---|---|
| `scramble` "מספרים מתערבלים" | Every filled cell (given or solved; not queued, not wrong marks) shows rolling fake digits in the **sender's** ring colour, so they read as fake. At each step about 30% of the cells show their real digit. At most 2.5 changes per second. Visual only: taps go through to the cell, and cell labels keep the real values. | A static "?" in every filled cell for the 5 s. | A 2 × 2 mini grid whose digits swap |
| `ink` "דיו" | About 5 dark blots (a thin rim in the sender's colour) cover about 40% of the board; they splat in 300 ms, hold, and fade over the last 1.5 s. | The same blots, still; gone at the end. | A blot that splats and fades |
| `keypad` "מקלדת מתערבלת" | The nine digit keys swap places every 1.5 s, sliding in about 200 ms. Each key always shows (and enters) its own digit, with its count and its disabled state. "ביטול בחירה" stays put. A key never moves under a finger (a shuffle waits for the release), and a press during a move (and shortly after) is ignored with the nudge, never sent. Back to 1–9 at the end. | One shuffle for the whole 5 s, with a fade. | Keys that swap |

- The keypad grid itself stays LTR (§0.6); only the order of its keys changes, for 5 s.
- Haptics and sounds per kind: `motion.md` §7–§8.

**Tokens:** `color.toast.*`, `color.iconBg.*`, `color.surface2`, `color.text`, `color.textMuted`, `color.success`, `color.accent`, `color.danger`, `color.border`, `color.bg`, `color.scrim`, `color.players[n].ring`.

---

## 16. Bottom navigation (from Dir-C-Home) [C]
| Property | Value |
|---|---|
| Frame | Bottom 0, full width, height **84** = 64 content + bottom safe area (C draws 20, so use the real inset), padding 0 8, background `color.bg`, top border 1 dp `color.border` |
| Items | 4 at flex 1, column, gap 6, centred: icon 24 (stroke 2) and label Rubik 500 13 single line; a label wider than its quarter shrinks, down to 70%, instead of ending in "…" ("Achievements" on a 360 phone; QA run #2) |
| Order (start → end) | "בית" · "טבלת מובילים" · "היסטוריה" · "הישגים". In Hebrew "בית" is rightmost, and the row mirrors automatically. |
| Active | Icon and label `color.accent`. Round 1's 18 × 3 underline is dropped. VIS-10 (D125): a 56 × 32 pill in `nav.activePill` (accent 10%) behind the icon, and the label in Rubik 700. The pill pops in with the tab's screen (`pop` spring from 0.8, fading in over 140 ms; with Reduced Motion it is simply there), since each tab screen draws its own navigation. |
| Inactive | `color.textMuted` |
| Pressed | Label and icon `color.text` for the tap duration, over a `pressedOverlay` pill |
| Where | Home-level screens only [R1]. Never during a game. |

- **A11y:** container `accessibilityRole="tablist"`, label "ניווט ראשי" [design]. Each item is a `tab` with `selected` (C uses `aria-current="page"`). Each target is about 93 × 64.

**Tokens:** `color.bg`, `color.border`, `color.accent`, `color.textMuted`, `color.text`.

---

## 17. Open points for Moshe (nothing here changes the original spec until approved)
1. **Touch targets below 44.**
   - The **9 keypad keys** are about 36 × 60. With `hitSlop` covering the 4 dp gaps the target becomes about 40 × 64. Nine keys at 44 do not fit in a 358-wide row.
   - **Board cells** are 38.4 dp. They are inherent to a 9 × 9 board on a phone, and they meet WCAG 2.5.8 (24 dp).
   - The alternative for the keypad is two rows (5 + 4), which changes C's look. **Default: C's single row.**
2. **Wrong-digit colour.** C's `#ff4d5e` on the light board is 3.05:1, which fails §22. `tokens.json` sets `color.board.wrongDigit` = `#b8102f` (round 1's strike-deep, ≥4.65:1 on every cell and tint). `#ff4d5e` stays for dark surfaces.
3. **Lock ring contrast.** The 3 dp `players[n].ring` on the light board is 1.3–3.0:1 (P1 on its tint 1.7:1), under the 3:1 non-text minimum. This file adds a 1 dp inner edge in `players[n].lockEdge` (= digit colour, ≥5.3:1), as `tokens.json` recommends. It is a small change to C's look; drop it if you prefer C exactly, and rely on the redundant cues (tint and seconds pill for me, avatar for opponents).
4. **Additions to the C game card** that the original spec requires (§10): the rating, the presence dot, the activity timer ring, and the seat **glyph** next to the name (spec §22). Also the owner **glyph on solved cells** (CLAUDE.md). None of these is drawn on Dir-C-Game.
5. **Leader marking in 2P.** C shows only the bar. This file adds round 1's lead tag ("+15.5") under the bar. There is no crown.
6. **Peer highlight** (row, column and box of my lock) is **not** used: C does not draw it, and round 1's peer tint was too close to the P4 tint. It can be added later with a neutral `#dfe3ec`.
7. **Coordinate rails** (A–I, 1–9) are off by default (C has none). Enable them if players struggle to find "F8".
8. **Gendered strings** in the design ("בוחרת", "שלחה", "מובילה") need a grammatical-gender field on the profile, or neutral wording. The spec has neither.
9. **Mute-opponent menu** (§8, D19) has no design. Proposal: long-press an opponent card to open a one-item menu.
10. **Opponent mistakes in 2P.** C shows a mistake count only on my card. The opponent's count is in its accessibility label and appears briefly as "−2" when it happens.
11. **Lock urgency colour.** Gold rather than red (DS-Motion said gold and the playable Game-2P used red). It blinks at 1 s, as DS-Motion did (`motion.md` §9.1).
12. **P3 and P4 colours** for C are not defined on any board. `tokens.json` defines them: P3 ■ green `#a2e28e`, P4 ◆ violet `#a57af0`, with darker tints so they stay apart for colour-blind players (`_cvd`). They need your eye.
13. **A screen reader in a 5–20 s stage** (staged practice, §19). Every node has a label, and a stage announces its goal and the time left, but a stage that ends in 5–20 s is very hard with TalkBack or VoiceOver. Open: a longer time limit while a screen reader is on would change the stars, so it is not built.

---

## 18. Checklist for `/dev/design-system` (stage 3 "סיום")
Render each of these in Hebrew and in English. The board and keypad must look identical in both.
- **Buttons:** primary (hero, lg, md) × {default, pressed, disabled, loading} · secondary plain and row · ghost · icon (default, expanded, disabled, loading) · danger.
- **Avatars:** 22/34/36/44/52/72/96 × P1–P4 plus neutral · presence (connected, unstable [D42], reconnecting) · bot chip · result badge · disconnected.
- **Flags and ratings:** flags at 12/13/15/18 · rating at 44/22/16/15 plus provisional · league badge `text` and `icon` for all 5 tiers.
- **Player cards:** 2P card (me and opponent) × {default, locking, thinking, paused, reconnecting, left, correct, wrong, under interference, target (picker open), dimmed} · compact cards for 3P and 4P with rank badges #1–#4.
- **Card actions:** the "הפרעה" button, 2P and compact, × {available, expanded, blocked: points / busy / not running (each with its toast)} · no button on a bot card (D44) · reaction picker plus float.
- **Bars and strip:** lead bar 2P (me leading, opponent leading, tie, negative score) and 4P · lock strip × {none, locked, urgent, paused}.
- **Board:** every cell state in §11.3 (#1–#14, except #8, which is not used; #14 queued [D42] as a close-up), all four player colours and glyphs, and wrong digits on the empty, tint and lock backgrounds.
- **Keypad:** armed, idle, pressed, complete digit, tried-wrong digit · cancel selection (enabled and disabled).
- **Overlays:** the interference picker (§13: 2P target line and 3–4P route, price row, the 3 × 2 grid with a locked and a blocked kind, no scroll at 360 × 640) · in-game confirm modal (surrender and practice) · centred dialog · toasts (all 5) · interference banner (and the generic one for an unknown kind) · the board dim (§15.3) · scramble, ink and the keypad shuffle (§15.4).
- **Navigation:** bottom nav with each tab active.
- **Staged practice (§19, version 1.0.2):** the new-game row "אימון בשלבים" (new player and returning) · map nodes × {played 0–3 stars, current, locked, boss with crown and bot} · chapter header · gate plate × {locked 17/20, enough stars but the boss unplayed 22/20, open} · the docked bottom panel · star row (12 / 14 / 16 / 44) · star meter × {time, count, gap} · the "+5 ש׳" chip · region frame and dimmed cells · tap target, red X, correction, "mine" digit with ● · race freeze layer · RaceTo30 bars and the gap meter · chain links · point chips and "שווה 6" · ready view · resume countdown over the covered board (D65) · result × {0, 1, 3 stars, vs bot} · gate sheet · chapter unlocked · how-to-play frame · the exit dialog · the player-card line · **1.0.3:** the region look (in, out, the frame with its keylines, the spotlight) on a box, a row and a column · the answer ring · `MiniRegion` (27 and 72) · the ready view per kind · the fill row and fill column HUD · the boss intro, band, arena corners and crowned bot avatar · the boss result × {won, lost} · the boss node with arena corners beside a current node · the puzzle × {rest, held, target, over a fixed box, tap-selected, solved}. In Hebrew and English: English says "Stage", never "Level", for a stage.
- **Playing with friends (§20, version 1.0.4):** the friends footer on the Modes screen × {online, suspended; offline: none, the offline bottom} (D100) and the ranked rows without their chip · the code card × {code, copied} · the game-type picker × {host, guest} · seat rows × {me (P1 ●), host with the crown, a guest with the host's X, away, empty and waiting} · the start box × {1 connected (off, with the hint), 2 connected, someone away} and the guest's "מחכים ש־MosheG יתחיל" · the six code boxes × {empty, half, full, joining, refused} with "הדבק" · the room's countdown · the closed and failed states · the "משחק עם חברים · בלי דירוג" label on a result and a history card. In Hebrew and English: the code and the boxes are LTR in both.
- **Reduced motion:** toggle it and check every row above again.

---

## 19. Staged practice components [new] (versions 1.0.2 and 1.0.3)
The level map, a stage and its result (`docs/01-SPEC.md` §5.3, D48–D65). **Provenance:** where a row names a board
(`Levels-Map`, `Levels-Gate`, `Level-Result`, `Lv-*`, `Modes-Levels`; copied from the staged-practice canvas, see
`docs/03-DESIGN.md`), that board decides the look, in C. A row marked **no board** has no drawing: Moshe decided
(2026-10-18) to build it from C's tokens and the brief (`docs/handoff/2026-10-15/staged-practice/brief.md`) and to
check it on the device. Values come from `tokens.json`; the star colours, node sizes and the cell dim are added there
by the screen stages (2ז, 2ח). Motion and its Reduced Motion forms: `motion.md` §4.11.

**1.0.3 (D66–D79; `docs/handoff/2026-10-19/levels-ui.md`): no new board was drawn.** The plan proposed three (Lv-Focus, Lv-Puzzle and
Lv-Boss), but Moshe asked to build the numbered items of his feedback without asking (2026-10-20). So every 1.0.3 row below is
**no board**: built from the written plan and C's tokens, and judged by Moshe on the device (`docs/LEVELS-DEVICE-CHECKS.md`, checks
12–19). Where a 1.0.2 board still draws the old dim (Lv-Find, Lv-Race, Lv-Box), the region look of §19.7 wins.

Rules that hold for every row: me = P1 with ●, the bot = P2 with ▲ (ownership never by colour alone) · the board, the
keypad, cell names (D5), times ("7.6 ש׳"), scores and "14/20" are LTR (`ltr()`) · signed numbers ("‎+5 ש׳", "‎−6",
"‎+50 XP") go through `signedText()` (an LTR isolate) · every string through `t()` in the `levels` namespace, Hebrew and
English, and **English says "Stage" / "Staged practice", never "Level"** for a stage ("Level" already means a bot level and
an XP level) · one gold primary action per screen · touch targets ≥ 44 · no interference button, banner or dim in a
stage (D49) · no reactions button for me (D62; `LEVEL_UI.reactions` brings it back).

### 19.1 New-game row "אימון בשלבים" [Modes-Levels]
- The sixth row of the Modes screen (D48), after "אימון לבד · לוח מלא" (only the solo row's title changes). Same row as the
  others (§1.2 row: 64 min height, radius 14, `color.surface`, 1 dp `color.border`).
- **Leading 44:** a mini level node (a 3 × 3 tile, lines at 14 / 29, the current stage number in Teko 24).
- **Text:** title "אימון בשלבים"; subtitle "שלבים קצרים · עד 3 כוכבים" (English "Short stages · up to 3 stars");
  chips "שלב 14 · ★ 29" and "עובד גם בלי אינטרנט". A new player: "300 שלבים קצרים · 0–3 כוכבים". No "דורש חיבור" tag.
- **A11y:** one button, label "אימון בשלבים · שלבים קצרים · עד 3 כוכבים · שלב 14 · 29 כוכבים · עובד גם בלי אינטרנט".
- Six rows and the bottom line fit at 360 × 780 with navigation buttons, in Hebrew and English, without scrolling. Fallback: drop
  the bottom line (DECISIONS-PENDING 3.23, option ד).
- **Every language (QA run #2, B3/B8/B9; D124):** the six rows fit under a 50 dp status bar too (the list keeps 8, not 16,
  over the friends footer); a row's chips stay on one line, which may run into the gap before the chevron (226 on a 360
  phone, never under it); a section's title, a rule and its whole note fit one line. A language that does not fit says it
  shorter; until it does, a section's note and a row's tagline take a second line, broken between words, never "…" (the
  rule keeps 16; QA 2026-11-03, en-XA). The header's title comes first and whole: my name beside the avatar gets what it leaves, and shows only where
  all of it fits, by the widths the phone laid out (the name measured out of the row, at its own width), never cut with
  "…" (QA 2026-11-03: "אחוו…" beside "Новая партия"); else the avatar alone, still read as my name. A title wider than
  the row shrinks, down to 70%, instead of ending in "…".

### 19.2 Map node (`LevelNode`, `LevelCoin`, `StarCrown`) [Levels-Map; the board-game road of 31.10.2026: no board]
**31.10.2026 (Moshe: "מסך אימון בשלבים נראה ממש דלוח ועלוב. יש כל מיני משחקים שהמסך הזה מעוצב ממש יפה").** The map
was redrawn as a board-game road (§19.14), from two written proposals (the "board-game road" as the base, with the
"chapter worlds" proposal's next-stage ring, glow, coloured banners and reached scale cards grafted in). No board was
drawn: it is judged on the phone (`docs/DECISIONS-PENDING.md` 3.29). The 1.0.2 tile (`LevelTile`, 56 / 68) stays for
the Modes row, the gate sheet, "איך משחקים" and a stage's header; the map uses the coin.
- **One button, 64 × 84** (the boss 92 × 138): a **coin** (`LevelCoin`, `size.levelCoin` 64, radius 18) with depth in
  the tactile language of D125: a 2 dp dark outline (`color.levelMap.coin.outline`) around a 6 dp **edge** under the
  **face**; on the face a small 3 × 3 sudoku box (1 dp lines at 24 / 40, from 8 to 56) and the stage number in Teko 600
  32 (LTR, three digits fit). Over the coin's top edge its **crown of three stars** (`StarCrown`, 64 × 28: the middle
  star 18 on the edge line, the side ones 15, 3 dp lower and turned ∓12°; each with a dark outline, so it reads on the
  light coin and on the gold road). Earned stars are `levelMap.crown.filled`, counted from the start side; the others
  `emptyFill` with an `emptyStroke` outline. **No kind icon** on a node (`LEVEL_UI.nodeKindIcon = false`).

| State (`coinLook`) | Face / lines / number | Edge | Extras | A11y label |
|---|---|---|---|---|
| plain: open, current, or played with no star | `levelMap.coin.face` gradient (the board's cell) / `coin.grid` / `coin.number`, a soft foot shade | `coin.plainEdge` | the crown | "שלב 5, מיקום מדויק, שני כוכבים מתוך שלושה" |
| gilded: played, ★ or ★★ | as plain | `coin.gildedEdge` (a gold side) | the crown, its earned stars gold | as above |
| gold: ★★★ (`LEVEL_UI.goldPerfectCoins`) | `tactile.goldFace` / `coin.goldGrid` / `coin.goldNumber` | `coin.gildedEdge` | three gold stars | as above |
| current | its look (plain until played) | its look | the gold ring around face and edge (2 dp `levelMap.beacon.ring`, 4 out) and its **beacon** band (6 dp `beacon.band`, 10 out) beating in bursts with rests (`level.node.current`; none under reduced motion); a soft gold **glow** under the coin (`node-N-halo`, `beacon.halo` radial, drawn by the chapter before its coins); **my token** beside it (below) | "שלב 37, …, השלב הבא" |
| next: locked, right after the current one, in its chapter | as locked | as locked | a **dashed** 2 dp ring (`levelMap.next.ring`) | "שלב 38, נעול" |
| locked | the chapter's tone: `deep` with a `lit` top and rim / `lit` / `levelMap.coin.onDeep` (light, ≥ 7:1) | the tone's `edge` | no crown (the box keeps its height); the lock badge at the top-end corner (22 circle, `color.bg`, 1 dp `color.border`, lock 12 `textMuted`) | "שלב 12, נעול" |

- **Never by opacity:** a locked number stays readable (`onDeep` on every tone ≥ 7.00:1). A closed coin is told apart
  by its tone face, its lock and its missing crown, never by colour alone.
- **Press** (`level.node.press`): the tactile press of D125 (`useTactilePress`): the face travels 4 dp onto its edge
  and the node goes to 0.98, back on the `press` spring; under reduced motion it lands at once, without the scale.
- **Tap on a locked node:** `level.node.locked` (one shake of that node; reduced motion: the lock badge's border
  turns `color.text` for 300 ms) and the toast "קודם משחקים את שלב 37".
- **Boss node, the fortress (92):** two merlons over the face, the crown badge (40 × 28, gold; faint while locked),
  its bot's avatar (`compact`, P2 with ▲, `node-N-bot`) on the face from chapter 1, the number at the bottom, the
  arena's gold corners (`COIN_ARENA`: 18 long, 3 thick, 8 out) in every state but locked, and its stars on a
  pedestal (76 × 24, `color.surface`, lit top) under the face. **Not the gold ring** unless it is the current stage.
- **My token** (`MapToken`, `LEVEL_UI.mapToken`): my avatar (`card` 44, P1's frame, never idle) stands beside the
  current coin like a piece on a board, my ● on a small P1 badge at its bottom-end corner, a soft shadow under it, a 6°
  lean toward the coin. It stands on the coin's side toward the middle of the road (on the middle line: away from the
  next stage), 6 dp from the coin (`tokenSpot`). It lands when the map first shows (`level.map.token.land`) and hops on
  after a stage (`level.map.token.hop`). Hidden from screen readers (the current coin's label says "השלב הבא"). With
  `mapToken` off: 1.0.2's 22 dp pin on the coin (the same testID, `node-N-tile-pin`).

### 19.3 Road, chapter banner and gateway (`LevelPath`, `ChapterGateway`, `GatePlate`) [Levels-Map, Levels-Gate]
- **Road:** see §19.14. One virtualised list item per chapter, every item the same height (1126; chapter 30 1174), so a
  gate that opens never moves the list; it opens with the current coin at 40 % of the height.
- **Chapter banner** (the gateway's lintel, `chapter-N-header`, at the top of each chapter's block): a ribbon in the
  chapter's tone (`levelMap.chapter[(c − 1) % 6].deep`, a lit hairline rim, a 3 dp `edge` under it, notched tails in
  `edge` behind both ends), width `min(W − 32, 332)`, min height 56 (a taller script grows it, never cuts it). In a row:
  a 36 medallion with the chapter's number (Teko 22, `color.text` on the tone's `edge`; its ring `accent` at 30/30),
  "פרק 4" (h2, `color.text`, `role="header"`) over its name ("בלש", caption, `levelMap.coin.onDeep`), and the stars chip
  "★ 18/30" (pill 28, `levelMap.chip` over the ribbon, Teko, LTR; `role="img"` "18 כוכבים מתוך 30"; an accent ring at
  30/30). No strip of the ground across the screen: the wandering digits show around it.
- **The gateway (chapters 2–30):** two slate pillars (22 wide, at W/2 ± 126, the tactile slate face, a plinth; a 4 dp cap,
  `levelMap.gate.capOpen` gold once the gate is open), the banner over them, and **the gate's sign** (`GatePlate`, the
  only button) hung from the banner on two chains:
  - **closed** (220 wide, 44–70 high, hung from the top of its 220 × 70 box at y 76; radius 12, `color.surface`,
    **dashed** 1 dp `color.iconFaint`; padding 12 × 4): "נפתח ב־20 כוכבים" (buttonSm, centred) across the plate's
    whole inner width (194), up to two lines, and under it a lock, a gold bar and "17/20" (star 16, Teko, LTR). The
    plate grows to two lines and never cuts the words: beside the count, on one line, it showed "נפתח ב־20 כו…" on
    the phone (31.10.2026); every language's lines are measured against it (`gatePlate.test.tsx`). **Enough stars,
    the boss unplayed:** "22/20" and "שחק את שלב הבוס כדי לפתוח";
  - while shut, a **striped barrier** lies across the road under the sign (145 × 8, 45° stripes
    `gate.stripeLight` / `stripeDark`, `gate-N-barrier`);
  - **open** (a 168 × 44 touch box, the pill 36 high in its middle): a raised pill (the L1 card), an open lock and
    "פרק 5 פתוח"; the first time it shows open, the barrier swings up and away (`level.gate.unlock`).
  - Every node after a closed gate is locked. A11y: the sign is a button, "פרק 5 נעול, 17 מתוך 20 כוכבים בפרק 4".
- **Chapter 1** has the banner, a slate **start pad** where the road begins, and a small gold flag. **Chapter 30** ends
  at a checkered finish line.
- **Focus order in a chapter:** the banner's title, its stars chip, the gate's sign, stages 1…10. Everything else
  (scenery, road, pillars, chains, barrier, ribbon tails, medallion, glow, token) is hidden from screen readers.
- **Header chip** "★ 84/900": a raised slate button (`TactileSurface kind="slate"`, 36 high): opens the chapter list
  (**no board**), a sheet with one row per chapter (its medallion in the chapter's tone, name, "★ 18/30", locked or
  open); a row scrolls the map to its chapter (`level.map.jump`). Beside it the title "אימון בשלבים" may take two lines and
  a smaller size, down to 18, never a word cut or "…" (`ScreenHeader wrapTitle`; QA run 2, B7: 12 languages were cut).

### 19.4 Docked bottom panel (`LevelPanel`) [Levels-Map]
- A fixed panel at the bottom of the map, instead of a sheet over it (D60; sheets over the map were part of the black screen,
  spec §12): the selected node's "שלב 37 · פרק 4", the kind's name, the goal in one sentence ("מציאה אחת. השלב נגמר ב־20 ש׳"),
  the star scale ("★★★ עד 5 ש׳ · ★★ עד 10 · ★ עד 20"), the bot (avatar with ▲, name and level) when the kind has one, my best
  ("★★ · 7.6 ש׳"), and the primary md button "המשך · שלב 37" (or "שחק" for a replay).
- This is the stage's opening: there is no separate opening sheet.
- **1.0.3 (D76, D79):** the kind's name is fixed ("מיקום מדויק", never "איפה ה־7?"), and the goal names no box, row or column
  ("מלא את 4 המשבצות החסרות בריבוע אחד, עד 20 ש׳"): "שוב" plays an equivalent board where the region moves. The fill kinds and the
  puzzle show their own end of the stage (up to 60 s, D68).
- **31.10.2026 (the board-game road):** a raised tray (`surface2` → `surface` gradient, a lit top edge, an inset top
  highlight; it stays opaque). Its head leads with the chosen stage's **own coin** (`LevelCoin`, 48, in its look) with
  its kind on a 20 badge (neutral, the bot's P2, or the boss's gold crown); a gate leads with a raised slate tile and its
  lock. The scale is **three raised cards** (`ScaleCells variant="cards"`, 48 high), the ones up to my best stars in gold
  (accent border, `accentSubtle`); "מוכן?" and a boss's opening keep the one divided strip. When the choice changes, the
  content fades in rising 6 dp (`level.map.panel`). Labels, the live region and every testID are unchanged.
- **The chosen coin stays in sight above the panel** (QA 3.11.2026): the panel takes its height from the map, and a boss's is
  taller. A stage (or gate) chosen near the bottom is scrolled up until its whole coin, crown to edge, is `MAP.revealGap` (16)
  inside the map (`revealOffset`), at the tap and again when the panel's height changes; a drag or a chapter jump ends it.

### 19.5 Stars (`StarRow`) and the star meter (`StarsBar`) [Lv-*, Level-Result]
- **Star:** the 24 viewBox star of the brief; filled `color.accent`, empty outlined `color.iconFaint` (decorative). Sizes 12 node ·
  14 counter · 16 sheet and panel · 44 result. A row carries one label (`role="img"` "2 כוכבים מתוך 3"); stars count from the
  **start** side (right in Hebrew).
- **Star meter**, the "scale" of a stage, by kind:
  - **Time** (kind 1, box, row, column, puzzle, spot the mistake, chain; up to 60 s for the fill kinds and the puzzle): a 6 dp bar (radius 3, track `color.surface2`), filling **left to right in both
    languages** (`level.timeBar`), ticks at the thresholds (2 dp `color.bg` cuts), the stars of each band above it (gold while
    reachable, `color.iconFaint` once lost), the seconds under the ticks (Teko 15, muted). `role="progressbar"`, "זמן: 7 שניות,
    עכשיו 2 כוכבים".
  - **Count** (race): 5 pips 28 × 28 (radius 8, gap 6): empty `color.surface2` + 1 dp `color.border`; mine P1 with ● in `color.bg`;
    the bot's P2 with ▲ in `color.bg`. Under it "4 ומעלה = 3 כוכבים".
  - **Gap** (duel): see §19.9.
  - **Points** (point hunter): the bar fills to the board's maximum, with ticks at 70 %, 85 % and 95 % (98 % from chapter 27).
  - **The numbers under the ticks** (every bar): HUD text, they grow with the phone's text size up to ×1.35 (BRD-3), and
    their row with them. Each starts 6 before its tick, unless that runs it into the next (4 apart at least) or past the
    bar's end further than at the design's size; then it moves just enough (`placeNumbers`, from the widths the phone
    laid out). Where one line cannot hold them, every other one goes on a second line. QA 2026-11-03: "15.517.5" and a
    cut "17.5" at ×2.0.
- **Penalty chip** "‎+5 ש׳" beside the clock (chip 22, `color.surface2`, text `color.danger`, `signedText`): `level.miss.flash`.

### 19.6 Stage chrome and HUD [Lv-*]
- **Header** (top 48, h 56): "שלב 37" (h1) over the kind's name (caption muted; "מיקום מדויק" for Pinpoint since 1.0.3, D79); the
  chapter chip "פרק 4"; at the end an icon button **X** "יציאה מהשלב" (no surrender button; spec §6.6). Pinpoint's digit ("איפה
  ה־5? · פרק 4", `hud.subFind`) comes only from the attempt's board, never from the stored stage. A boss: the boss band (below).
- **Goal line** (status 15), the digit as a dark chip (24 × 24, radius 6, Teko 20), and the star meter (§19.5).
- **Kind 1:** the target chip (a big digit and "6 · ריבוע 5") with a 20 s ring; under the board, in place of the keypad, the digit
  big and "הקש איפה ה־6 חייב להיות".
- **Kind 2 (race):** two small cards, ● me and ▲ the bot (the bot's activity "מחפש…", and its 😂 when it reacts), the task line
  "מקום 4 מתוך 5 · מצא את ה־4 בריבוע 9", the 5 pips, and "עוד 13 ש׳".
- **Box (kind 3):** clock, time bar, "1/4 משבצות" and a mistakes counter; the keypad 1–9 and "ביטול בחירה".
- **Spot the mistake:** "בלוח מסתתרות 2 ספרות שגויות. הקש עליהן." and, muted, "הספרות הכהות הן של הלוח, והן תמיד נכונות.";
  magnifier icons ("נמצאו 1/2"); a dismissible tip card in the kind's first three stages.
- **Point hunter:** a big points counter, 3 move dots ("מהלך 3 מתוך 3"), the clock ("0:14" of 0:30), the points bar; the keypad.
  "נקודות" and a burned move's "‎−4" stack in a narrow column beside the counter, and a wide counter ("‎−11.5") shrinks to fit
  its half of the row (the row keeps its height, down to 0.3 of its size): nothing ever runs over the move dots. Text size
  (BRD-3): the counter ignores the phone's text size above ×1.0 (`scale="board"`); the row's words grow up to ×1.35
  (`scale="hud"`), and "מהלך 1 מתוך 3" takes two lines rather than more than 96 dp ("Zug 2 verschenkt").
- **Chain:** links (filled P1, current P1 outline, empty), "צעד 3 מתוך 4" and the time; the keypad. The view never marks the next
  step.
- **Duel (kind 4):** the Game-Bot screen without the interference button, plus RaceTo30 (§19.9).
- **Exit:** X, or Android "חזרה", opens the in-game confirm (§14.1) "לצאת מהשלב? תקבל 0 כוכבים, והשלב הבא ייפתח." (**no board**).
  The body says what the quit really leaves (`afterQuit`): on a boss whose gate stays shut, "…, והשלב הבא יישאר נעול.";
  on stage 300, "תקבל 0 כוכבים.". The clock runs on under the dialog (the spec has no rule; stopping it is Moshe's call). A
  stage that ends by itself while it is open closes it, and its result takes no press for `LEVEL_UI.resultGuardMs` (1 s), so
  a tap meant for "יציאה" cannot press "למפה" (QA N1, 3.11.2026).
- **Fill row and fill column (1.0.3, D69):** as the box: clock, time bar, "1/4 משבצות", mistakes, the keypad. The task line "מלא
  את שורה D" / "מלא את עמודה 5" with a 27 dp `MiniRegion` (the box's HUD map grows from 20 to 27 too). The letter or number comes from
  the played board (`fillRegionOf` on the attempt). Board label: "הלוח · ממלאים רק את 4 המשבצות החסרות בשורה D".
- **Puzzle (1.0.3):** §19.13.
- **Boss (1.0.3, D77; no board):** a boss band at the top, in place of the small chip (`accentSubtle` background, a 1 dp gold rule,
  a crown and "בוס · פרק 3" in gold); gold **arena corners** around the board (3 dp thick, 20 long; deliberately not a full frame,
  so it never reads as the region frame); and a 16 dp crown on the bot's avatar in the race and duel cards. All static.
- **Clocks for screen readers (every kind; QA run #2, Q1):** a clock's label says its seconds in 5 s steps, never every second
  (a changed label is an accessibility event), rounded down so it never says more time than the clock does; time left is
  exact in its last 5 s, never "0" while some is left (`clockLabelSeconds`). The mistakes chips (box, puzzle, the find
  penalty) are `dangerSubtle` laid flat over the ground (`opaqueOver`): the wandering digits pass behind the HUD (B12).

### 19.7 Board additions [Lv-*]
New states of §11.3, all from the engine's view (no game logic in the board):
- **Region frame** (`RegionFrame`; 1.0.3, D75): the target area (box, row or column) in a **3 dp gold frame between two 1 dp dark
  keylines** (`board.given`), the same frame for every shape; "the whole board" has no frame. The keylines give it contrast against
  both sides (gold alone on a light cell is about 1.3:1). The 1.0.2 frame in the text colour (1.07:1) is gone.
- **In and out** (1.0.3, D75; replaces the 1.0.2 dim, `cellDim`): cells in the area get `board.focusCell` / `focusCellAlt` (warm
  cream), cells outside `board.outCell` / `outCellAlt` (a much darker grey-blue) with their givens in `board.givenOut`, still
  readable, because they are part of the logic. Pinpoint's target chips and solved cells (P1 or P2 tint) keep their look outside
  too. In and out differ first in lightness (at least 1.6:1), so it holds in greyscale and with colour blindness. In a fill stage
  only the region's empty cells can be selected.
- **Spotlight** (`level.region.intro`, `LEVEL_UI.regionIntro`): when the board first shows, the frame lands and a gold band
  (`board.regionBand`) flashes once, under a second, while the clock runs; a race flashes the band at each new spot. Reduced
  motion: the frame is simply there.
- **Answer** (a missed Pinpoint or race spot; 1.0.3): its own look, never the region's gold: a 3 dp dark ring (`board.given`) with a
  1 dp white inner line, and the digit in a dark chip. In the `contrast` list (at least 3:1).
- **Rails** (`LEVEL_UI.regionRails`, off by default, D75c): the board's A–I and 1–9 rails, with the region's letter or number in
  gold. On, the board is about 20 dp smaller.
- **Tap target** (tap kinds): every empty cell is a button; a filled cell does nothing (`LEVEL_RULES.tapOnFilled = 'ignore'`).
- **Red X** on a wrong tap (2 dp, `color.danger`; reduced motion: a static frame), and the miss flash (`level.miss.flash`).
- **A lock without a timer** (box, point hunter, chain): the ring stays, with no seconds pill and no draining bar.
- **"Mine" digits** (spot the mistake): in my P1 digit colour with a small ● in the corner; the givens stay dark.
- **Correction** (a mistake found): the wrong digit struck through in red, the right digit small beside it, a green ring
  (`level.spot.found`). At the end, the mistakes not found are shown the same way.
- **Cell chips** (`CellChipsLayer`, point hunter): "‎+6.5" on each of my moves (the dark chip of §11, text P1), and "שווה 6" over the
  selected cell in the kind's first two stages only, from the engine (`selectedWorth`).
- **Race freeze** (`BoardFreezeLayer`): a gray layer over the board with "3 · 2 · 1" for 3 s after my wrong tap (`level.race.freeze`).
- **Taken spots** (race): the cell in the taker's tint with their shape (● or ▲); the bot's avatar hops there (`level.bot.hop`).
- **Board and keypad stay LTR** in every kind (§0.6). A cell is named like D5 in every label and message ("עוד אי אפשר לדעת מה
  נכנס ב־A9", with the cell name in an LTR isolate).

### 19.8 Ready, how to play, resume countdown [no board]
- **"מוכן?"** (quick entry, D56): for 2 s (`LEVEL_UI.readyMs`), the kind, the goal and the star scale over the empty stage area,
  without the board (`level.ready`). Then the board appears and the clock starts.
  - **Where to look (1.0.3, D76, `LEVEL_UI.readyRegion`):** Pinpoint: "איפה ה־6?" big, and in a region a 72 dp `MiniRegion` (9 × 9,
    the region in gold, always LTR) with "בריבוע 5" / "בשורה D". The fill kinds: the map and "ריבוע 5" / "שורה D" / "עמודה 5". The
    puzzle: "3 ריבועים זזים · 6 ריבועים קבועים", no map. **The race: no spot and no digit** ("5 מקומות, מרוץ מול Pip"), so there is
    no head start on the bot. The other kinds as before. The digit and the region are the attempt's: `play.tsx` reads the attempt
    before "מוכן?", and on a failure both "מוכן?" and the stage use attempt 1.
- **Boss intro** (1.0.3, D77; `BossIntro`, in place of "מוכן?"): 3 s (`LEVEL_UI.bossReadyMs`). "שלב בוס!" big in gold; the bot's
  avatar (96, P2 ring with ▲) under a 32 dp gold crown (a gold medallion with a crown only under D72 ב, a boss with no bot);
  "שלב 10 · מרוץ מול הבוט" and "הבוס: Pip"; up to two "מה קשה יותר" chips, **only from the engine's `bossTraits(level)`**
  (`firstBot` "הבוט הראשון: Pip", `faster` "Pip מהיר ב־10%" with the per cent through `ltr()`, `overlord` "Overlord"; never a
  "hard board" chip); then the goal and the star scale. Motion: `level.boss.intro`.
- **"איך משחקים"** (before a kind's first stage): a card of 3 panels drawn from the real board (`HowToPlayPanels`), with "הבנתי"
  (primary) and "דלג" (ghost). Once per kind. Each panel has an accessibility label.
  - **1.0.3:** three panels for each new kind too (the row and the column each their own, saying "שורה" or "עמודה"; the puzzle:
    the wrong order, a drag with the gold target, the solved board). Pinpoint's title is its name, with no digit. The first boss
    (L010, also the first race) shows one card, the race's, with a fourth panel "זה גם שלב בוס" (`LEVEL_UI.mergeFirstBossTutorial`).
- **Resume countdown** (D65): when the app is back in front mid-stage, the board is **covered** (a dark cover over the board slot,
  so the pause gives no free thinking time) and "3 · 2 · 1" counts down over it (`level.resume.countdown`; reduced motion: the
  number just changes); then the cover goes and the stage continues with the same time left. `LEVEL_UI.backgroundPause`,
  `LEVEL_UI.resumeCountdownMs = 3000`. A11y: the cover says "השלב בהשהיה", and each number is announced.

### 19.9 RaceTo30 and the gap meter (duel) [Lv-Sprint]
- Two thin bars to 30, mine (P1, with ●) and the bot's (P2, with ▲), a "30" flag between them and the stage clock ("0:11"). The
  shapes sit on the bars, so the two never differ by colour alone. Fills with scaleX (`level.race30.fill`).
- **Gap meter** under it: "פער ‎+10.5" (`signedText`), with ticks at 8 and 15 (the ★★ and ★★★ thresholds). A11y: "אתה מוביל ב־10.5
  נקודות, עכשיו 2 כוכבים".

### 19.10 Result (`LevelResultView`) [Level-Result; 0 stars: no board]
- **A state inside the stage screen,** not a new route or window (no black screen, spec §12).
- "שלב 37 הושלם" (screen title, centred) · **3 stars of 44** (gap 12; `level.stars.reveal`) · the metric in Teko 64 P1 ("4.2 ש׳",
  "4 מתוך 5 מקומות", "פער 17", "21.5 נקודות") · "שיא חדש!" or "השיא שלך: ★★" · "‎+20 XP" only when there are new stars (an
  estimate; the server decides) · the chapter line "בפרק הזה: ★ 18/30 · לשער צריך 20".
- From the original §23: mistakes, time (when the metric is not the time), the bot's row in a stage against a bot ("ניצחת" or "Pip
  ניצח", avatar with ▲, its score or spots), and the best move in the duel and the point hunter.
- **"למה?":** a short explanation of the target from the engine's `explain()`, including the wrong tap, with cell names LTR.
- **Buttons:** primary lg "לשלב הבא" (quick entry), secondary "שוב", ghost "למפה". 3 stars: one confetti burst (`level.confetti`).
- **0 stars** (time up, a second wrong tap, a quit): the same layout with three empty stars, the answer shown, and no XP line.
  Never "שיא חדש!" (a first try of "0 מתוך 5 מקומות" is no record): "השיא שלך: ★★" when an earlier try has stars, else no
  record line. "שיא חדש!" needs a star: new stars, or a better measure in a try with a star.
- **Boss** (1.0.3, D77; no board): a 56 dp crown medallion over the title: "ניצחת את הבוס!" when the engine's
  `levelOutcome().bossBeaten` is true (the crown pops, `level.boss.won`; reduced motion: no pop), else "הבוס ניצח הפעם", still. The
  screen never decides it from the stars: a race boss can give a star and still be lost to the bot. The chapter line stands out
  ("השער לפרק 2: ★ 22/20 · נפתח!"). The gate still asks only that the boss was played.
- **Puzzle** (1.0.3): the metric is the time; the swaps under it ("4 החלפות, המינימום 3"), with no effect on the stars. "למה?" comes
  from the engine's `puzzleExplainSteps`.

### 19.11 Gate sheet and "פרק חדש נפתח" [Levels-Gate; chapter unlocked: no board]
- **Gate sheet** (§13 sheet): "פרק 5 נעול", "צריך 20 כוכבים בפרק 4. יש לך 17, חסרים 3.", up to 3 stages to replay ("שלב 34 · ★☆☆"
  with "שחק"; first a stage of the chapter not played yet, such as the boss), the primary "שחק את שלב 34", and muted "כל שלב עד
  30 שניות. הכוכבים הטובים ביותר נשמרים." With enough stars and the boss unplayed: "יש לך מספיק כוכבים. שחק את שלב 40 (בוס)
  כדי לפתוח", and the boss is the primary.
  - **1.0.3 (D68):** the muted line reads "רוב השלבים עד 30 שניות, ומילוי ופאזל עד 60. הכוכבים הטובים ביותר נשמרים."
    (`gate.footnote`).
- **"פרק חדש נפתח"** (once per chapter): "פרק 5 · Biscuit", the new bot introducing itself in one line, what is new in the chapter,
  and "‎+50 XP" once (`level.chapter.unlocked`; reduced motion: no motion, the content appears at once).

### 19.12 Player-card line [no board]
- On **my** card only, under the XP bar: "שלבים: 87 · ★ 214" (stages played, total stars), only after the first stage
  (`LEVEL_UI.cardShowsToOthers = false`; D58).

### 19.13 Puzzle (`PuzzleLevelScreen`, `PuzzleBoard`, `PuzzleHud`) [no board; 1.0.3]
The puzzle (spec §5.3.2; D70, D71, D78): nine full boxes, some of them fixed; swap two at a time. The screen draws only the engine's
`GameView.level.puzzle` and calls `session.swap(from, to)`, which calls `GameHost.swapBoxes`. It never decides whether a swap is
allowed, or whether the puzzle is solved.
- **Header:** "שלב 23" and "פאזל · פרק 3", the clock and X; the time star meter (§19.5). **Task line:** "סדר את הריבועים" · "3
  ריבועים זזים · 6 ריבועים קבועים" ("כל הריבועים זזים" when none is fixed) · "החלפות: 2".
- **Board:** 3 × 3 boxes, **always LTR**, box 1 at the top left; a 6 dp gap between the boxes (`PUZZLE_UI.slotGap`; the game board's
  is 3), so each reads as a tile. Under it, in place of the keypad: "גרור ריבוע אל ריבוע אחר כדי להחליף ביניהם" and "או: הקש על
  ריבוע, ואז על ריבוע אחר".

| State | Look |
|---|---|
| movable | `board.focusCell` background and a 2 dp bottom edge that gives it the depth of a tile |
| fixed | `board.outCell` background, no depth, and a 16 dp lock at the top corner (a shape, not only a colour). Its digits stay dark (9.8:1): a fixed box is the anchor of the logic |
| held (dragging) | follows the finger, scale 1.06, a shadow, and a 3 dp P1 frame (me is always P1) with a 1 dp dark inner keyline (`lockEdge`; P1 alone on cream is 1.8:1) |
| its home while held | a hole: a dashed 2 dp `color.border` frame on `surface2` |
| target (over a movable box) | a 3 dp gold frame with dark keylines, as the region frame |
| over a fixed box | no frame; the lock turns `board.wrongDigit` (not `color.danger`, which is for dark surfaces and is 1.7:1 on the grey). A drop there goes to the host, which refuses (`boxFixed`), and the box goes home |
| selected (tap mode) | a 3 dp P1 frame with the `lockEdge` keyline, and `selected` for the screen reader |
| in its right place | **not marked** (D71: no lock, because marking gives the answer away) |

- **Gestures:** one `GestureDetector` on the board: `Gesture.Pan().minDistance(6)` and `Gesture.Tap()` in `Gesture.Exclusive`. The box
  under the finger comes from the board's geometry, LTR. A drop on another box (movable or fixed) always calls the host; a drop off
  the board or on its own place calls nothing, and the box goes home.
- **Tap, then tap** (`LEVEL_UI.puzzleTapSwap = true`, for everyone, D78a): a tap selects a movable box, a tap on another swaps them,
  a second tap on the same box cancels, and a tap on a fixed box buzzes with "הריבוע הזה קבוע".
- **Screen reader:** each box is a button, "ריבוע 4, אפשר להזיז: 5 3 9, 6 1 2, 8 7 4" (the digits row by row, LTR), with the hint
  "הקש כדי לבחור, ואז הקש על ריבוע אחר". TalkBack's double tap is the `activate` action, not a touch, so every box has
  `onAccessibilityAction('activate')`, which runs the same select and swap. A live region announces "ריבוע 4 וריבוע 7 התחלפו"
  (with a penalty: "… עוד 5 שניות").
- **A wrong swap** (neither box lands in its place, D70c): the "‎+5 ש׳" chip of §19.5, from `boxesSwapped.penaltyMs`.
- **Repeated digits are never marked** (D78b, `LEVEL_RULES.puzzleConflicts = 'none'`). If the setting allows it, the screen only
  paints the engine's `conflicts` red.
- **Solved:** a gold frame on all nine boxes flashes once, then the usual hold on the final board before the result.
- **The rest** is the shell of every stage: the exit confirm, the background freeze with 3, 2, 1 (D65), the live region, and the
  hold on the final board (`useStageShell`).
- **Motion:** `level.puzzle.lift`, `.swap`, `.home`, `.denied` and `.solved` (`motion.md` §4.11). **Haptics and sound:** existing
  cues only (`cellSelect`, `cellRelease`, `cellDenied`, `correct`).


**Tokens:** `color.accent` (stars, current ring, gate bar, region frame, arena corners), `color.iconFaint` (empty stars, connectors),
`color.board.*`, `color.players[n].*`, `color.surface`, `color.surface2`, `color.border`, `color.danger`, `color.scrim`,
`color.text`, `color.textMuted`, `color.textFaint`; new in 2ז and 2ח: the star colours, `size.levelNode`, `board.cellDim` /
`cellDimAlt` and the dim given colour. **New in 1.0.3 (D75):** `board.focusCell` / `focusCellAlt`, `board.outCell` / `outCellAlt`,
`board.givenOut` and `board.regionBand` replace the dim tokens, with `border.regionFrame` (3) and `border.regionKeyline` (1). Each
pair is in the `contrast` list (`contrast.test.ts`).

**New icons** (24 viewBox, stroke 2, `currentColor`): star (filled), crown, chain links, box, swords (duel), open lock, and the
levels mark of the new-game row. New in 1.0.3: `gridRow`, `gridCol` and `puzzle` (`Icon.tsx`, for `KIND_ICON`).

---

### 19.14 The road (`mapModel`, `MapRoad`, `MapScenery`) [Levels-Map; 31.10.2026, no board]
- **Geometry (mapModel `MAP`, measured from the start edge, so the whole map mirrors in Hebrew; digits never do):**
  stage k of chapter c at `x = W/2 + σ·A·sway[k]`, `sway = sin(0.3πk)`, σ = +1 in odd chapters and −1 in even ones (the
  bends alternate, every gate is on the middle line), `A = clamp((W − 32 − 92)/2, 80, 104)` (centred on a wider screen).
  Coin centres from the item's top: 230, then pitches 76 / 92 / 88 / 76 / 92 / 92 / 76 / 88 and 116 into the boss; the
  pitches keep every coin's box (64 × 84, the boss 92 × 138) clear of the next one at every width. The gateway block is
  the item's first 184 (the banner 16–72, the road crossing at 140, the barrier at 148). `mapDirection: 'up'` turns each
  item over (stage 1 at the bottom) but keeps the gateway block upright, at the item's bottom.
- **The road:** one uniform Catmull-Rom curve through the start pad, every stage, every gate crossing and the finish
  (a continuous tangent: it bends smoothly through each coin). Drawn 44 wide in four strokes, bottom to top: an edge 6 dp
  lower (its depth), the kerb, the body (38: 3 dp of kerb each side) and a 3 dp dashed middle (10 on, 12 off, running on
  from piece to piece). **Gold** (`levelMap.roadDone`: kerb `#ffcf3f`, body `#e0ac1f`, edge `#b88f00`, cream dashes) up to
  and into the current stage; **slate** after it (`levelMap.road`). A gate's two segments follow the gate and its first
  stage. Done vs ahead is told by lightness (12.72:1 vs 2.46:1 for the kerb on the ground) and by the coins' own looks.
- **Memory:** each segment is drawn by every item it crosses, in a small Svg of its own (`RoadPiece`, its frame cut to the
  item); never one Svg as tall as a chapter (react-native-svg draws each Svg into a bitmap of its size). The pieces of an
  item are drawn top to bottom, their ends butt under the coins.
- **The chapter's tone** (`levelMap.chapter`, six, cycling: dusk, plum, teal, ember, ocean, rose): the banner, the
  medallion, the closed coins, the signpost and the pennant. Each `deep` is dark (≥ 3.08:1 below every seat ring, so it
  never reads as a player) and carries `color.text` at ≥ 8.59:1.
- **Scenery** (`sceneryModel`, `MapScenery`, `LEVEL_UI.mapScenery`; seeded per chapter, still, hidden from screen
  readers): two big rounded **zones** in the tone (translucent, 1.25–1.34:1 over the ground) in the bays the road leaves
  empty; a faint, empty **3 × 3 sudoku box** (96–132); a **signpost** with the chapter's number beside the first stage;
  a **pennant** beside the boss; three tiny gold **sparkles**. Every item but the zones keeps 34 dp from the road's
  middle line and 8 dp from every coin, every place my token can stand and the gateway; with no room it tries the other
  side, then is left out. **No digits in the scenery** (31.10.2026): the box
  holds none, and there is no big digit, because the only digits behind the app are the small wandering ones (D126;
  Moshe: "מספרים קטנים (בין 6 ל12 DP) משוטטים על המסך").
- **No ground:** the map's screen, its list and its items paint no background; the wandering digits behind the app
  (D126) show between the pieces and through the zones. Only the panel, the header chip, the banner, the sign and the
  coins are opaque.
- **Performance (Galaxy A16):** one item per chapter; exact `getItemLayout`; `initialNumToRender 2`, `windowSize 5`,
  `maxToRenderPerBatch 1`; the chapter blocks are memoised on per-chapter props (choosing a stage redraws only its
  chapters). No Skia on the map. Every animation is a transform, an opacity or an SVG dash offset on the UI thread; the
  only repeating one (the beacon) runs in bursts with rests.

## 20. Playing with friends components [new] (version 1.0.4)
The friends room, "join with a code" and the new-game group (`docs/01-SPEC.md` §5.4, D80–D89; plan
`docs/handoff/2026-10-19/friends-room.md`). **Provenance:** two boards, `Friends-Room` (the host's lobby) and `Friends-Join`
(the six boxes), drawn on 2026-10-20 **alongside the build**, from the written plan and the built screens: Moshe said "לך עם
ברירות המחדל, תמשיך לבנות", so nothing waited for a board. Every other row here is **no board**, built from C's tokens. Where a
board and this file disagree, the spec and the code win, and the board is updated. Motion: `motion.md` §4.12 (no new animation).

Rules that hold for every row: me = P1 with ● (my seat's frame, the "אני" tag), the others P2–P4 with ▲ ■ ◆ in the order
they came in (ownership never by colour alone) · **the code is LTR everywhere** ("123 456", three and three), and inside a
Hebrew sentence it is wrapped in an LTR isolate (LRI…PDI), or "123 456" turns into "456 123" · the six boxes are LTR in
Hebrew too, like the board and the keypad · every string through `t()` in the `friends` namespace (the group's in `home`),
Hebrew and English · one gold action per screen · touch targets ≥ 44 · the screens only draw what the server says: who the
host is, who is away, whether "התחל" is on, and the code itself all come from `lobby` (`friendsModel.ts`).

### 20.1 New-game friends buttons: the footer [no board; D80a, D100]
- **Pinned under the list** of the Modes screen (§19.1's screen), out of the scroll, always in view (D100, Moshe's device
  test of 2026-10-23: in the middle of the list, drawn unlike any other button, they looked odd). The bottom every screen
  with an action has (GameType's, `OfflineActions`): a 1 dp `color.border` rule on top, `color.bg`, the 16 gutters, 12 over
  the buttons, the inset + 16 under them. The list above no longer adds the inset.
- **Two app buttons (`Button`, §1) side by side**, `flex: 1` each, gap 12, size `'modal'` (48: the pair's size, as
  ConfirmModal's dialog and the room's "שתף קישור" | "העתק קוד"; at `'lg'` or `'md'` the primary's words do not fit half
  of a 360 dp row): **"צור חדר"** the one primary (skewed gold, first in reading order: on the right in Hebrew) and
  **"הצטרף עם קוד"** the secondary outline. English: "New room" ("Create room" is too wide for the half), "Join with
  code". No caption, no section label. Hints: "פותח חדר המתנה עם קוד ששולחים לחברים", "מקלידים את 6 הספרות שקיבלת".
- **Offline:** no footer; `OfflineActions` ("עבור לאימון", "בדוק שוב") takes the bottom, and the banner says why.
- **Suspended:** both buttons disabled; "החשבון מושעה" with the lock (micro, `color.textMuted`) over them, and each
  button's label says why ("צור חדר, לא זמין: החשבון מושעה").
- **Setting:** `FRIENDS_UI.modesPlacement` (`'footer'`; `'list'` is 1.0.4's group below).
- **1.0.4's group (`'list'`):** between the ranked group and the practice group, a `SectionLabel` (an icon, the title
  "עם חברים", a 1 dp rule, the note "חדר פרטי · עד 4 · בלי דירוג"; title setting `FRIENDS_UI.groupName`: `'short'` "עם
  חברים", or `'moshe'` "חברים אמיתיים בזמן אמת", D80b), then one row of two flat buttons, `flex: 1` each, 44 min height,
  radius 14 (`radius.card`), `color.surface`, 1 dp border, gap 12: "צור חדר" (`color.accent` border and label) and
  "הצטרף עם קוד" (`color.border`, `color.text`). Offline or suspended: both dimmed and disabled, the note the ranked
  rows' ("דורש חיבור", "החשבון מושעה").
- **To fit 360 × 780 without scrolling (D80a):** the ranked rows lose their "דירוג 1287 · מהיר" chip (two lines: title and
  tagline; `FRIENDS_UI.rankedChip` brings it back) and the footnote line goes. `ModesAndGameType.test.tsx` checks the budget in
  Hebrew and English, footer (628 of 644 dp) and list. `FRIENDS_UI.modesGroup = false` is 1.0.3's screen.
- **In every language (1.1.0, D124):** the same budget holds in all 19 (`ModesAndGameType.test.tsx` runs each). A script with
  taller least line heights (Arabic, Thai, Vietnamese, CJK: D106) takes what its lines add out of the rows' padding above
  and below (6, down to 2: `cardPaddingVertical` in `ModesScreen.tsx`), so the rows keep their 64 and 77 dp. Words that
  did not fit their line were shortened in that language.

### 20.2 Room header and code card (`FriendsRoomScreen`) [Friends-Room]
- **Header:** back (= "יציאה מהחדר" in the lobby), the title "חדר עם חברים", and the subtitle "מהיר · 3 מתוך 4" (type · seats).
- **Code card:** `color.surface`, radius 14, 1 dp border, padding 16, centred. "קוד החדר" (label, `color.textMuted`), then the
  code in **Teko 64** (`scoreXL`), `color.text`, LTR, selectable. Screen reader: "קוד החדר: 1 2 3 4 5 6" (digit by digit).
- **Actions:** two secondary buttons in one row, 52 high: **"שתף קישור"** (share icon; the phone's share sheet with "בוא לשחק
  איתי סודוקו פייט! קוד החדר: 123456" and the link on its own line; the code **without** a space there, so WhatsApp can't flip
  it) and **"העתק קוד"** (expo-clipboard). "שתף קישור" shows to everyone (`FRIENDS_UI.shareBy = 'everyone'`, D87).
- **Under them:** "אפשר לשלוח את הקוד או את הקישור" (caption), replaced for 2.5 s (`FRIENDS_UI.copiedHoldMs`) by "הקוד הועתק"
  in `color.success`, with a check on the button. The live region says it too.

### 20.3 Game-type picker [Friends-Room]
- "סוג משחק" and, at the row's end, "רק המארח משנה" (host) or "המארח בוחר" (guest).
- Three options in a radio group, `flex: 1`, 44 high, radius 12, `color.surface`: "מהיר", "רגיל", "קשה". **Checked:** a 2 dp
  `color.accent` border and an accent label. A guest's are not pressable; a change is announced ("סוג המשחק עכשיו: קשה").

### 20.4 Seat row (`RoomSeatRow`) [Friends-Room]
- **56 min height** (`size.recentRow`), radius 12, `color.surface`, 1 dp `color.border`, padding 12 × 4; my row's border is P1's.
- **Taken:** the seat shape (12) · the compact avatar (34 frame) in the seat's colour, smiling ("ready") · the name (`playerName`)
  with the P1 pill "אני" on mine · under it the flag, the rating in the room's game type (small, LTR, `color.textMuted`; it follows the host's type; none without a rated game of that type), and **"מארח"** with a
  12 dp crown in `color.accent`. One element for the screen reader: "Dana, ישראל, דירוג 1190, לא בחדר כרגע".
- **Away** [D84a]: the row's content at 55 % opacity, the avatar inactive, and "לא בחדר כרגע" (micro, `color.textMuted`).
- **Empty:** a dashed border on `color.bg`, a dashed 34 frame with a dot that blinks (`friends.seat.wait`; static with
  Reduced Motion), and "ממתין לשחקן…" (`color.textMuted`). Screen reader: "כיסא פנוי, ממתין לשחקן".
- **Host only, on a guest's row:** an X icon button (44), "הוצא את Dana מהחדר" [D85a] → the confirm "להוציא את Dana מהחדר?" ·
  "לא תהיה לו דרך לחזור לחדר הזה." · "הוצא" (§14.2 centred dialog). `FRIENDS_UI.kick = false` hides it.

### 20.5 Start box and the guest's wait [Friends-Room; guest: no board]
- **Host:** the primary gold button **"התחל משחק · 2 שחקנים"** (the count is the **connected** seats only). Off below 2
  connected, with "צריך לפחות 2 שחקנים מחוברים כדי להתחיל" under it.
- **Someone away** [D83]: pressing asks (§14.2 dialog) "להתחיל בלי Avi?" · "Avi לא בחדר כרגע. מי שלא בחדר נשאר בחוץ." ·
  "כן, להתחיל" / "לא, נחכה". (`FRIENDS_UI.startWithoutAway = 'wait'`: the button stays off instead.)
- **Guest**, in its place: a small accent spinner and "מחכים ש־MosheG יתחיל" (`rowTitle`); "המארח לא בחדר כרגע" while the host
  is away.
- **Last:** the ghost button "יציאה מהחדר" (X icon), no confirm: nothing is lost in a lobby.
- **A footer, pinned** (QA run 2, B40/B53): the start box (or the guest's wait) and "יציאה מהחדר" sit under the scroll, over a
  hairline `color.border`, with the screen's bottom inset added to their padding. On a phone with a 3-button bar the room's
  content was taller than the screen, and "יציאה מהחדר" was drawn under the bar: a tap there pressed Home.
- **Lost connection in the lobby:** a line over the card, "החיבור אבד. מתחבר מחדש…", with a spinner; the app comes back to the
  same seat by itself.

### 20.6 Join with a code (`JoinCodeScreen`, `CodeInput`) [Friends-Join]
- Header "הצטרף עם קוד"; the prompt "הקלד את 6 הספרות שקיבלת".
- **Six boxes**, 44 × 52 each, radius 12, `color.input.bg` with a 1 dp `color.input.border`, gap 8 and a wider gap between the
  third and the fourth: **always LTR** (`direction: 'ltr'`), the number pad. The focused box: a 2 dp `color.input.borderFocus`
  (gold) border. A refusal: every box `color.input.borderError`.
- A digit moves on; backspace in an empty box goes back and clears the one before. **Pasting or typing several digits** into any
  box reads the whole text with `extractFriendCode` (a whole WhatsApp message, or a link) and fills all six.
- **Fast typing loses nothing** (QA 3.11.2026): a digit typed after a box's own digit (the next key reaching the box before the
  focus moved on) goes on into the next box, and each key builds on the boxes the keys before it left. **A whole code takes no
  more digits:** a seventh never replaces the sixth (a box tapped and its digit typed over is still an edit). The keyboard goes
  at the sixth digit, from whichever box had it. A hardware key (or `adb shell input keyevent 67`) in an empty box: Android's
  TextInput does not report it (`onKeyPress` is the soft keyboard's), so only the on-screen ⌫ goes back a box.
- **"הדבק"** (a secondary button, the clipboard's text) with the caption "אפשר להדביק את כל ההודעה מוואטסאפ". No code in the
  text: "לא מצאנו קוד של 6 ספרות בטקסט שהועתק".
- **At the sixth digit the join starts by itself** (`FRIENDS_UI.autoJoin`): "מצטרף לחדר…" with a small gold spinner, in the place
  of "הצטרף" (as tall, a polite live region); "הצטרף" does it too,
  and again after a refusal. A refusal is one line under the boxes, e.g. "לא מצאנו חדר עם הקוד ⁦123 456⁩. בדוק את הספרות." (a
  block reads exactly the same, D85c). **A new try holds the last refusal in its place** (transparent, hidden from screen
  readers, the boxes not red) until its answer replaces it, so "הדבק" and "מצטרף לחדר…" never jump (QA 3.11.2026).
- **Screen reader:** the row is "קוד החדר, 6 ספרות"; each box is its own field, "ספרה 3 מתוך 6", so the digits are heard one by
  one. Nothing here moves.

### 20.7 Countdown, closed and failed states [no board]
- **Countdown** (`FriendsCountdown`): the match's 3 · 2 · 1 · GO (`countdown.digit` in motion.md §4.6) with the game's players,
  each in their seat colour and shape, me in P1's. Then the board, as in a ranked game.
- **Closed** ("החדר נסגר.", "המארח הוציא אותך מהחדר.", "יצאת מהחדר.", "החדר נפתח במכשיר אחר.", "המשחק התחיל בלעדיך."): a centred
  state on `color.bg` with the line and a way out; "החדר נסגר." also offers "צור חדר".
- **Failed** (no network, server, rate limit "נסה שוב בעוד 4 דקות", "האפשרות הזו עוד לא זמינה."): the line, "נסה שוב" and "לבית".
- **Busy when a link opens** (spec §5.4.5): the §14.2 dialog ("לעזוב את האימון ולהצטרף לחדר?", "לבטל את החיפוש ולהצטרף?", "לעבור
  לחדר ⁦654 321⁩?", "אתה באמצע משחק"). Over a frozen stage (D65) the dialog sits above the covered board.
- **Unknown link** (`+not-found`): "הקישור הזה לא מוכר" · "אולי הוא ישן, או שהוא לא של סודוקו פייט. אפשר להמשיך מהבית." ·
  "למסך הבית".

### 20.8 Result and history label [no board]
- **Result:** the ranked results screen (spec §12) with **no rating change**, no wait for a rating, and the label "משחק עם חברים ·
  בלי דירוג". "עוד סיבוב" on Home is not saved for it.
- **History card:** "עם חברים · בלי דירוג" where the rating change was; the "מדורג" filter leaves it out, "הכל" shows it.

### 20.9 The link's browser page (`GET /r/<code>`) [no board; a server page]
- In the style of the server's legal pages (`apps/server/src/legal/render.ts`), Hebrew or English by the browser (`?lang=en`):
  "הוזמנת למשחק סודוקו פייט · קוד החדר ⁦123 456⁩", the button "פתח באפליקציה" (falling back to the page), and the store link when
  there is one; without a store: the steps (משחק חדש ← הצטרף עם קוד) and "צריך גרסה 1.0.4 ומעלה".
- The same page for every valid code: it never says whether the room exists, or who is in it.

**Tokens:** no new token. `color.accent` (the group's create button, the checked game type, the host's crown), `color.surface`,
`color.border`, `color.bg` (the empty seat), `color.input.*` (the boxes), `color.success` ("הקוד הועתק"), `color.players[n].*`
(seat shapes, avatars, "אני"), `color.text`, `color.textMuted`; type `scoreXL` (the code), `playerName`, `ratingCompact`, `micro`,
`label`, `caption`, `rowTitle`, `button`.

**Icons:** existing only: `share`, `check`, `close`, `crown`, `lock`.

## 21. Language picker [new] (localization stage 0, version 1.1.0) [no board]
Settings → "שפה" (`screens/home/LanguagePicker.tsx`; localization plan
`docs/handoff/2026-10-23/localization/plan.md` 0י, D102–D104). Until 1.0.4 the section held two side-by-side radio buttons,
"עברית" and "English" (`Choice`); 19 languages do not fit there, so the section now has a field and a sheet, in the country
picker's style (§4). **No board:** built from C's tokens and the country picker's pieces. Motion: the sheet's (§13), nothing new.

- **Field** (in the section, under its label "שפה"; the hint "החלפת שפה מפעילה מחדש את האפליקציה." stays under it): the
  country field's box, 44 min height (`size.input`), `color.input.bg`, a hairline `color.input.border`, radius 12, padding
  4 × 12/10, the value in `input` type (`color.input.text`) and a `chevronDown` (`color.textMuted`) at the end.
  - A chosen language: its own name, "עברית" / "English".
  - **"שפת המכשיר"** (the setting that follows the phone, D102; where a new install starts): "שפת המכשיר", and under it, in
    `caption` `color.textMuted`, the language it is now ("עברית").
  - One button for screen readers: "שפה: עברית" / "שפה: שפת המכשיר, עברית" ("Language: English", "Language: device
    language, English"), hint "בחירת שפה".
- **Sheet** (§13, not `fill`: as tall as its rows, up to 85% of the screen, the rest scrolls inside), title "בחירת שפה", a
  radio group named "שפה":
  - **First row: "שפת המכשיר"** ("Device language"), in the app's language and font.
  - **Then every language this build offers** (`ENABLED_LANGUAGES`; he and en in stage 0), in the plan's order (עברית,
    English, then the order of the work: العربية, Español, Português (Brasil), Deutsch, Français, 日本語, Русский, 한국어, Italiano,
    Türkçe, 简体中文, Bahasa Indonesia, Polski, 繁體中文, Tiếng Việt, ไทย, Nederlands), **each by its own name, the same in
    every language of the app** (`LANGUAGE_NAMES`: a German player looks for "Deutsch", not "גרמנית"), **in its own font**
    (Rubik where it has the script; the system font for 日本語, 한국어, 简体中文, 繁體中文, ไทย and Tiếng Việt, with the
    language's own forms on iOS: `theme/typeface.ts`), and **read in its own language** by VoiceOver (`accessibilityLanguage`;
    Android has no such prop).
  - Rows as the country picker's: 64 min height (`size.listRow`), padding 0 × 12, radius 12, the name in `rowTitle`
    (`color.text`, one line); the checked row on `color.surface2` with a gold `check` (`color.accent`) at the end. Each row
    is a radio ("עברית", checked).
- **A choice:**
  - **That changes the language:** the sheet closes, then (once it is off the screen: two native modals at once fail on iOS)
    the centred dialog of §14.2 with the `refresh` icon: "להחליף את השפה ל־English?" ("Switch the language to עברית?"), or for
    "שפת המכשיר" "לעבור לשפת המכשיר?" ("Switch to the device language?"); the body "האפליקציה תופעל מחדש, כדי שכל המסכים יוצגו
    בכיוון של השפה החדשה."; "החלפה והפעלה מחדש" and "ביטול". The confirm saves the choice and **the app restarts, on every
    change of language** (D104: fonts and line heights are set as it starts), not only when the direction flips.
  - **That keeps the language** ("עברית" while "שפת המכשיר" is Hebrew): saved at once, no question, no restart.
  - On Android 13 and up the choice is also the system's "App languages" for Sudoku Fight (D103), and a language chosen there
    shows here on return.
- **RTL:** the field and the rows follow the app's direction (the chevron and the tick at the end); each language name is
  written in its own script and direction.

**Tokens:** no new token. `color.input.*`, `color.surface2`, `color.accent`, `color.text`, `color.textMuted`; type `input`,
`caption`, `rowTitle`; sizes `size.input`, `size.listRow`, `size.icon.chevron`, `size.icon.card`.

**Icons:** existing only: `chevronDown`, `check`, `refresh`, `close`.
