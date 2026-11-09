# The Pirates series: the bible

This is for whoever draws a pirate. Read this page, then the code of the nine finished characters in
`packages/avatars/src/catalog/pirates/`: `one.ts` (the Captain) and `seven.ts` (Peg-leg Peg), the two the series
was built from, then `two.ts`, `three.ts`, `four.ts`, `five.ts`, `six.ts`, `eight.ts` and `nine.ts`. Their toolbox
is `shared.ts`. Everything in `docs/avatars/STYLE.md` still holds, except where this page says otherwise (the invested
look's outlines).

**The brief.** Moshe's idea (30.10.2026): avatars that are only digits, in themed series of 1 to 9, with "very
invested" animation. On 31.10.2026 he saw the Captain and Peg, each in a "house" look and an "invested" look, and
said: "תכין על בסיס שני הראשונים את כל סדרת הפיראטים" (build the whole series on the base of the first two). **He
has not chosen a look**, so every character comes in both looks, exactly like 1 and 7.

**Status (31.10.2026): the whole crew is drawn and in the catalog.** All nine characters, 18 avatars, are in
`PIRATE_CAST`, `AVATAR_IDS` and the 19 locales (section 14 done; the server accepts the seven new ones once it is
redeployed, and sends an app before the pirates "no avatar" for one: DECISIONS-PENDING 3.27). Where an artist
departed from section 2, the cast below says what was built, and why ("As built"). The art director's review of the
same day is in too: the 3 redrawn so it reads as a 3, the 9's headband turned into the twins' scarf, the 6 grown
up, the 5's head crop moved off its stem, the 8's top counter tucked under the toque, the 4's coil wound as rope,
and the rig's extras drawn over every hat (STYLE.md §1).

**Kids' game rules.** No guns, no blades (no cutlass, no pistol, no cannon), no smoking (no pipe), no alcohol (no
bottle of rum). No offensive stereotypes: no hooked noses, no "exotic" caricature. Only the Captain has a nose (it
is his digit's flag, long and pointed, never hooked).

---

## 1. Your file, and only your file

| Digit | File | Export | Ids |
|---|---|---|---|
| 1 | `one.ts` (done) | `CAPTAIN` | `pirates-1-house`, `pirates-1-invested` |
| 2 | `two.ts` (done) | `PIRATE_LADY` | `pirates-2-house`, `pirates-2-invested` |
| 3 | `three.ts` (done) | `CABIN_GIRL` | `pirates-3-house`, `pirates-3-invested` |
| 4 | `four.ts` (done) | `RIGGER_BOY` | `pirates-4-house`, `pirates-4-invested` |
| 5 | `five.ts` (done) | `PARROT_KEEPER` | `pirates-5-house`, `pirates-5-invested` |
| 6 | `six.ts` (done) | `DECKHAND` | `pirates-6-house`, `pirates-6-invested` |
| 7 | `seven.ts` (done) | `PEG` | `pirates-7-house`, `pirates-7-invested` |
| 8 | `eight.ts` (done) | `GRANDPA_COOK` | `pirates-8-house`, `pirates-8-invested` |
| 9 | `nine.ts` (done) | `NAVIGATOR` | `pirates-9-house`, `pirates-9-invested` |

- Write `packages/avatars/src/catalog/pirates/<digit>.ts`. It exports **exactly one** `PirateCharacter`
  (`{ digit, looks: { house, invested } }`) and nothing else that is an avatar. Build the ids with
  `pirateId(digit, look)` and the names with `pirateName(ROLE, look)`.
- **Do not edit** `shared.ts`, `index.ts`, `one.ts`, `seven.ts`, another artist's file, `catalog/index.ts`, the
  protocol, the app or the locales. Seven people draw at once; a helper you miss goes in your own file. Joining the
  catalog is one integrator's job afterwards (section 13).
- Your file is tested as soon as it exists: `pirates.test.ts` loads `one.ts` … `nine.ts` by name and runs the series'
  checks on it (section 12), before it is in `PIRATE_CAST`.
- Start from a copy of the structure of `seven.ts`: header comment, `ROLE`, `tile`, the shared face, the moving parts
  (shared by both looks), the house look, the invested look, the export.

## 2. The cast

Moshe's words are the source of truth: **"1 is the captain, whose big nose is the digit's flag; 2 is the pirate lady;
3, 4 and 5 are kids; 6 and 7 are pirates; 8 is an old man; 9 is a young woman."** The roles below give each digit a
job and a prop driven by its shape (the avatars evaluation of 30.10.2026). They stay inside his words: 7 was built
this way and he asked for the rest "on the base of the first two". The names are working names; Moshe may rename.

**1, the Captain** (done). He / הקפטן. The 1's flag is his long pointed nose; tricorne with an anchor, navy coat,
spyglass through the belt. Gimmicks: draw tube slides out (surprised), hat tips (laugh) and hops (surprised), glint on
the brass (idle). Motion: `nod` first. Tile teal.

**2, the Pirate Lady** (Moshe's "pirate lady"; the quartermaster, who keeps the treasure map). She / "The Pirate
Lady", "הגברת הפיראטית". The 2's top bowl is her head (the face on it), the swan neck her neck and torso, the base bar
the hem of her long coat. A wide hat with a long feather (not a tricorne: that is the Captain's), a rolled treasure map
in her hand. Gimmicks: the map unrolls on laugh; the feather flutters (`flutter`). Motion: `tilt`, `spin`, `nod`,
`bounce`. Tile cobalt; coat `CLOTH.plum`. *As built:* the map is a parchment roll tucked into her mustard sash along
the slanted stroke (held out on her arm, it broke the 2 and read like a cigarette at 48 px). On laugh a sheet unrolls
from it into the 2's lower-right space; that sheet is `rest: 'hidden'`, an exception written into section 10 (at rest
the map is rolled up, so the rest pose is complete). A pearl drop earring, not a hoop (the hoop is Peg's).
*Reviewed (31.10.2026):* her plume reacts to every mood, as "very invested" asks: it flutters wider (12°, as Peg's
tails), bristles upright when she is cross, droops and twitches when she is puzzled and circles when she is dizzy;
the roll bobs in her sash when she smiles.

**3, the Cabin Girl** (a kid). She / "The Cabin Girl", "נערת הסיפון". The two bowls are her head (top, the face) and
her body (bottom); the open left side holds a bucket. Pigtails. Gimmicks: the bucket sloshes drops (`R.drip`, hidden)
on surprised; the pigtails bounce (`flutter`). Motion: `bounce`, `squash`, `tilt`, `nod`. Tile rose; dress
`CLOTH.mustard`; hair `HAIR.ginger`. *As built:* the bucket filled the 3's open left side and the pigtails read as cat
ears at 48 px, so she holds a thin brass-ring bubble wand out in the open side instead, and wears one wind-blown
ponytail on the right under a folded paper hat. Gimmicks: soap bubbles drift from the wand (idle, faster on smile and
laugh), a big bubble balloons and pops on surprised, the wand waves and droops, the ponytail bounces. Her hair is
`HAIR.auburn` lit in `HAIR.ginger` (ginger alone vanishes on the rose tile). *Reviewed (31.10.2026):* at 48 px
she read as a teddy bear, so the top bowl (the head, x 43–80) is now narrower than the bottom one (the body, x
41–86) with a 12-deep waist notch on the right; the ponytail hangs down along the head's right curve (at most 7
wide) instead of sticking out; the middle point is a long cusp with the wand at its tip; the dress is a pinafore
that leaves the bowl's wood showing round its right side and under its hem; the hat carries a blue crayon fish (a
red star read as an insignia); the bubbles are thicker, and the big one twice the size.

**4, the Rigger Boy** (a kid). He / "The Rigger Boy", "נער החבלים". The upright stem is the boy (the face at its top,
above the crossbar), the diagonal and the crossbar frame a cream sail, with a pennant on top and a rope coil on his
shoulder. The sail must not fill the counter: leave tile showing round it, or the 4 stops reading as a 4. Gimmicks:
the pennant flutters (`flutter`); the sail billows on laugh (a small `inflate` around the mast). Motion: `bounce`,
`flip`, `tilt`, `squash`. Tile slate; vest `CLOTH.forest`; sail `cream`; pennant `bandanaRed`. *As built:* three
gimmicks: the sail, the pennant and the coil of rope on his shoulder, which swings when he moves and jumps when he
is surprised. The coil is rope wound flat in turns round a dark middle, with a short frayed end hanging down (drawn
first as a ring of loops with a loose end, it read as a racket at 48 px).

**5, the Parrot Keeper** (a kid, neutral). "The Parrot Keeper", "שומר התוכי" (Hebrew has no neutral form; Moshe
decides). The top bar is a perch with a parrot on it; the bowl is a round belly, the face on its upper part (keep it
high: section 9). The parrot is a red macaw (`OBJECT.red`, wing `OBJECT.blue`, beak `OBJECT.gold`); a single ink dot
for its eye is fine (it is a prop, not the character's face). Gimmicks: the parrot bobs (idle) and flaps (laugh).
Motion: `wobble`, `nod`, `bounce`, `squash`. Tile leaf; overalls `CLOTH.denim`. *As built:* three gimmicks: the
parrot, its wing (a part of its own, which rides on the parrot and flaps round its shoulder, so the two never come
apart), and a paper boat in the hip pocket, which rocks, bobs and pops up. The face sits right of the belly's middle
and the head crop starts right of the stem (x 38.5): a crop with the bar, the stem's corner and the round belly read
as a placed 5; now it shows a bar over a face, a cap's brim. The dizzy stars circle just under the perch.

**6, the Deckhand** (Moshe's "6 is a pirate"; twin brother of 9). He / "The Deckhand", "מלח הסיפון". The bowl is his
body (a striped shirt), the face on the upper stroke, made wide enough for it (section 4). A mop. Gimmicks: the mop
swishes on laugh; the bandana tails flutter. Motion: `flip`, `wobble`, `nod`, `tilt`. Tile orchid. *As built:* five
gimmicks: the bandana's tails, the mop, and three soap bubbles that rise from it (smile and laugh; one when idle),
with an anchor tattoo on his wooden belly. *Reviewed (31.10.2026):* he read as a kid the 5's age, so he lost the
blush, got heavier brows and long sideburns, and his twin's espresso hair; the invested terminal is a slanted plank
that flicks up (the deep block read as a crate), and both looks open the counter wider (24 × 18, the house oval 23
× 19).

**7, Peg-leg Peg** (done; Moshe's "7 is a pirate"; the boatswain). She / פג רגל־עץ. The bar is her head and
shoulders, the slanted stem her peg leg; bandana, eye patch, hook hand, brass hoop earring. Gimmicks: hook waves
(happy), sways (idle), jerks up (surprised); bandana tails flutter. Motion: `wobble` first, around her foot. Tile sky.

**8, Grandpa Cook** (Moshe's "old man"). He / "Grandpa Cook", "סבא הטבח". The top bowl is his round head, the bottom
bowl a round belly with an apron; a white beard over the waist, bushy white brows, a ladle and a steaming soup pot
(**no pipe**). Gimmicks: steam from the pot (`R.steam`, three puffs a third apart, hidden); the ladle stirs on laugh.
Motion: `nod`, `wobble`, `tilt`, `shake`, slow and kind. Tile jade; apron `CLOTH.white`; beard `HAIR.platinum`.
*As built:* seven gimmicks: his arm (it comes out from behind his belly to stir), the ladle, the beard (it jiggles
when he laughs), the toque (it puffs up like a soufflé, falls, droops and flops) and three steam puffs. If the phone
needs fewer layers, the beard goes first. *Reviewed (31.10.2026):* the house look's top counter is tucked under the
toque's band (in the middle of his forehead it read as a bindi), and the invested belly is one octagonal slab with
its counter cut through it, as the 6's bowl (four mitred planks read as a robot at 48 px).

**9, the Navigator** (Moshe's "young woman"; twin sister of 6). She / "The Navigator", "הנווטת". The bowl is her
head (the face), the tail her body in a long coat. A brass compass. Gimmicks: the compass needle spins (`R.spin`) on
surprised and dizzy, a glint on the brass (`glint`), bandana tails. Motion: `flip`, `tilt`, `spin`, `nod`. Tile berry;
coat `CLOTH.forest`. *As built:* the 9's counter is open through her dark hair crown, and the twins' bandana is a
headband below it (a counter on her forehead read like a bindi), so her eyes sit lower (y 44.5) than the adult line
of section 8. Her hair is `HAIR.espresso`, apart from the auburn of the 2, the 3 and her twin; the twin link is the
bandana fabric, the mirrored knot and the iris. A long braid swings in the wind. *Reviewed (31.10.2026):* a narrow
headband with flying tails, a single braid and a cream two-lobed tie read as a costume caricature, not a pirate, and
as a child. Now the twins' pirate scarf covers her crown up to just under the counter (her hair is up in a bun round
it), knotted at the back on the left; the braid is tied with a red ribbon of two pointed loops; the star pin is gone
(the north star is the compass's); and a loose wave of hair falls past the scarf at her right temple, with smaller
cheeks (0.6), so she reads as a young woman.

**The twins, 6 and 9.** A mirror pair (a 6 turned a half-turn is a 9; the `flip` motion mirrors left to right, so it
is their favourite move for the family joke, not a literal 6-to-9): the same plank widths, the same matching bandana
(cream and `bandanaRed` stripes, not Peg's navy-and-cream shirt stripes), the same iris, one prop each. Agree on the
bandana by copying the same path shape mirrored; never import from each other's file.

**One signature each.** Peg owns the patch, the hook, the peg leg and the hoop earring; the Captain owns the
tricorne, the nose and the spyglass. Nobody else repeats them.

## 3. What the two looks share (the 1:1 contract)

Both looks of a character compare 1:1, so Moshe can choose a look and not a character. The test checks it:

- the same `tile` (`PIRATE_TILES[digit]`), `pivot`, `headBox`, `squash` (always `true`) and `motionBias`;
- the same `face`, except that the invested look adds an iris (`withIris(FACE, iris)`);
- the same gimmicks: ids, order, `z`, `rest` and anims (only the `markup` differs). Declare the anims once, above
  both looks, and pass the same object to both (as `spyAnim`, `hatAnims`, `hookAnims` and `tailsAnims` do).

What may differ: the art, `base` (the invested foot is a little lower: 93 → 94, 90.6 → 92.6) and the iris.

## 4. The digit is the body

- **The face sits on the widest calm plank in the upper part of the digit.** The Captain: the top of the 1's stem.
  Peg: the middle of the 7's bar. The rest of the numeral is the body: costume, limbs, the prop.
- **It reads as its digit at 48 px.** The silhouette carries it: keep the counters open (the tile shows through), the
  strokes thick, the costume inside the strokes. A prop may overlap a stroke, never hide what makes the digit.
- **Its 22 px head crop never reads as a game digit** (section 9).
- **No skin.** The face is painted on the wood; the wood is the character's skin. Arms are optional: a sleeve cuff
  and a hook or a prop (Peg's raised left arm), never a skin hand.
- **Proportions, measured on 1 and 7.** Stay near them so the series looks like one family.

| | The Captain (1) | Peg (7) | For the others |
|---|---|---|---|
| Digit top / bottom (invested) | y 14 (hat from 3.6) / 94 | y 17.5 / 92.6 | top 14–18 (adults), 22–28 (kids); bottom 92–94 |
| Face plank | stem 34 wide (x 33–67) | bar 74 × 37.5 | ≥ 32 wide where the eyes go |
| Other strokes | foot 65 × 12 | peg 24 → 12.5 wide | 12–24 thick; a bowl's ring ≥ 12 |
| Chamfer (invested) | 3 | 3.4 | 3–3.4 |
| Rounding (house) | r 6 (stem), 6.5 (foot ends) | r 8 (bar) | r 6–8 |
| Width used | x 14.6–82.5 (nose to foot) | x 8.6–87 (hook to bar) | fill about 80% of the tile; nothing important within 6 of a corner |

**Kids (3, 4, 5)** are shorter (the digit's top at y 22–28, on the same base line), with the same stroke weight (it
is one typeface), bigger eyes (`r` 5.6–6.0) and cheeks. **The old man (8)**: white bushy brows (`{ ...BROWS, color:
HAIR.silver.base }`), a beard that stays clear of the mouth's room. **The women (2, 9)**: character from hair,
costume and props; no painted lashes (the rig closes the eyes, painted lashes would stay).

**Bowls (2, 3, 5, 6, 8, 9).** In the house look, draw the round balloon shape with an oval counter
(`houseCounter`, as `digits.ts` does). In the invested look a bowl is planks: an octagon (a `chamfer` with a big
corner) or a ring of straight planks around an opening; the counter is the tile between the planks. Where the face
sits in a bowl, keep the counter open, smaller and above the face (as `digits.ts` does); never paint it shut.

## 5. The house look

The current flat style (STYLE.md §5), so it sits with the other 101 avatars.

- The digit in `wood` with **one offset shade**: `shaded(d, wood.base, wood.shade)` (the default offset −1.4, −1.3).
- One or two `wood.light` highlights at the upper left: a long thin oval on the main stroke (the Captain's
  `ellipse(37.4, 30, 1.8, 5, …)`), a short one on the foot.
- Costume in flat fills: the surface in `ramp.base`, one shade shape on the lower right or underneath in
  `ramp.shade` (the Captain's coat: the same path in shade, then the base path a little smaller).
- Lines only for things that are lines (the hook, a strap, a brim's braid): `line()`.
- **No outlines.** The test fails if a house look strokes anything in `FACE.ink`.

## 6. The invested look

The series' own typeface, a chunky digit built of wooden planks, and a richer costume. Flat colours only (no
gradients, filters or opacity tricks): the rig carries it to the phone as it is.

**Planks.** Every stroke of the digit is a convex plank: `woodSlab(chamfer(x0, y0, x1, y1, 3))` for a straight one,
`woodSlab(slantedPlank(top, bottom).pts, 2.2)` for a slanted one, a convex polygon of your own for anything else.
`slab()` needs a convex polygon: a curve is several planks. Draw a later plank over an earlier one: its ink outline
is the joint (the Captain's foot over his stem, Peg's bar over her peg). **Nail the joints**: two `nail()`s where one
plank overlaps another (Peg: 66, 52.4 and 80.6, 52.4), or at a foot's ends (the Captain: 21.4, 88 and 78.6, 88).

**The bevel and the light.** `slab` cuts a bevel strip on every edge and lights it by its direction: `wood.light` on
edges that face the upper left (`LIGHT`), `wood.shade` on those that face away, `woodMid` on the sides. Bevel 2.4 for
a plank, 2.2 for a narrow one (under about 20 wide), 1–1.1 for iron (`ironSlab`: an iron band or shoe).

**The outline.** One ink, `INK` (= `FACE.ink`, so the art and the face are one drawing), showing `OUTLINE` (1.25)
outside every filled piece: `slab` and `inked()` stroke the shape at 2.5 behind its fill. A line gets ink behind it
that is 1.4–2.4 wider (`inkedLine`: Peg's hook 2.6 on 5, her patch strap 1.8 on 3.4; `inkedRing`: her hoop 1.2 on
2.6). An emblem gets an offset ink copy (the Captain's anchor: ink at +0.25, +0.25, width 1.6 under 1.05). **Not
inked:** grain, highlights, shade shapes, stitches, dots, buttons, fringes: anything under about 3 units.

**Wood detail.** Two `grain()` lines along each long plank, in `woodDeep` at 0.55 wide, kept off the face's room;
a knot (`ellipse(…, 0.8, 2, woodDeep)`) at most one per plank. On the nose or another carved piece, grain in
`woodMid` at 0.5.

**Cast shadows.** A hat or a bandana throws a `woodMid` shape on the brow (the Captain: under the brim, down to
y 28.4; Peg: under the bandana). A piece that sticks out throws a `woodDeep` shadow on the wood (under the Captain's
nose).

**Costume recipe** (the Captain's coat, Peg's shirt): `inked(shape, ramp.base)`, then a `ramp.shade` piece on the
side away from the light (right or bottom), then a `ramp.light` strip on the side toward it (left or top), then trims:
brass braid as a `brass.base` line, brass pieces `inked(…, brass.base)` with a `brass.light` glint line or dot.

## 7. Palette

Import colours; never paste hex values (STYLE.md §4).

| Use | Name in `shared.ts` | From the palette |
|---|---|---|
| The digit (both looks) | `wood` | `FUR.tawny` |
| Grain, deep shadow | `woodDeep` | `FUR.brown.base` |
| Side bevels, a hat's shadow | `woodMid` | wood base/shade mixed |
| Buttons, buckles, braid, spyglass, compass | `brass` | gold mixed toward wood |
| Coats, shirts | `navy` | `CLOTH.navy` |
| Jabot, sail, stripes, plume | `cream` | `CLOTH.cream` |
| Hats | `hatCloth` | `CLOTH.charcoal` |
| Belts, grips | `leather` | `FUR.brown` |
| Bands, a peg's shoe, nails | `iron`, `nailHead` | charcoal and steel |
| Hooks, a compass needle | `steel` | `OBJECT.steel` |
| Bandanas | `bandanaRed` | `CLOTH.brick` |
| Patches | `patchBlack` | `HAIR.black` |

**Tiles** are fixed: `PIRATE_TILES[digit]` (1 teal, 2 cobalt, 3 rose, 4 slate, 5 leaf, 6 orchid, 7 sky, 8 jade,
9 berry). They were chosen together: the picker lists the house looks 1–9 then the invested 1–9, after the walking eye
(mustard) and before the 8 (iris), and every neighbour pair is at least ΔE 48 apart (the catalog test wants 25).
Three pairs look alike and are kept apart only by the digits between them: 1 teal and 8 jade (they meet if 9 is
missing: the last house look, then the first invested one), 3 rose and 9 berry, 4 slate and 7 sky. So the series joins
the catalog whole (section 14). Do not change yours.

**Your costume colour** must stand clear of your tile and of the wood: the proposals in section 2 do. Add your hair
from `HAIR` (Peg: chestnut). A colour the palette lacks: mix it from palette colours in your file, with a name.

**Iris** (invested only): 1 `CLOTH.denim.base`, 7 `CLOTH.forest.light`. Suggested for the rest: 2 `CLOTH.plum.light`,
3 `HAIR.honey.base`, 4 `OBJECT.blue.base`, 5 `OBJECT.green.base`, 6 and 9 the same `HAIR.chestnut.light` (twins),
8 `OBJECT.steel.shade`.

## 8. The face

The rig draws it from your anchors (STYLE.md §6). The series' face, from 1 and 7:

```ts
const FACE_ANCHORS: AvatarDef['face'] = {
  ink: FACE.ink,
  eyes: { left: { x: 41.5, y: 34.5 }, right: { x: 58.5, y: 34.5 }, r: 5.3, style: 'round' },
  brows: { ...BROWS, color: hair.base },          // BROWS: lift 1.75, length 1.75, thickness 2.3
  mouth: { x: 50, y: 45.5, w: 14 },
  cheeks: { color: FACE.blush, dx: 0.55, dy: 1.45, size: 0.72 },
  halo: { x: 50, y: 8 },                          // just above the hat or the bandana
};
```

- **Eyes** always `round` (the test checks), `r` 5.2–5.3 for adults, 5.6–6.0 for kids, 16–17 apart (at least
  2.7 `r`), on one line at y 34–35 for adults (kids lower, with their shorter digit).
- **Mouth** 11–20 below the eyes (Peg 11; the Captain 20, because his nose sits between), `w` 13.5–14 (kids 12–13).
- **Brows** `BROWS`, in the hair colour (the Captain: `HAIR.espresso.base`; Peg: her chestnut).
- **Cheeks** where there is room (the Captain has none: his nose takes the place).
- **Halo** just above the head: the top of the hat or the bandana.
- **Iris** in the invested look only: `face: withIris(FACE_ANCHORS, iris)`.
- **Room the rig needs** (STYLE.md §6): 1.3 `r` around each eye, the brows' lift above, the mouth's laugh box
  (`w` wide, down to `y` + 0.45 `w`). Keep hair, a patch strap, a beard or a hat's shadow out of it. A covered eye
  (`covered: 'left'`) is Peg's alone.

## 9. headBox: the 22 px crop

In an opponent-locked board cell the avatar is 22 px and the app draws only `headBox`. A whole numeral there would
read as a placed digit (the evaluation's main risk), so:

- a square of 54–62 around the face and the hat (the Captain `{ x: 12, y: 2, size: 62 }`, with the nose tip; Peg
  `{ x: 23, y: 8, size: 54 }`);
- it holds both eyes (with `r`) and the mouth's laugh box;
- its bottom is at least 25 above `base` (the test: `y + size ≤ base − 25`), so the lower half of the numeral stays
  out: the eyes at y ≤ ~52 and the mouth at y ≤ ~63. For 5 and 6 (faces low in the digit) this is the tight one;
- seen alone at 22 px it must not read as a digit 1–9 (a round head in a bowl reading as "o" or "0" is fine). Check
  the `48 head` and `22 head` columns of the lineup page (section 12).

## 10. Gimmicks

Two or more per character (the test wants at least two, and at least one `idle` anim): the brief's signature move,
an accessory that follows the body, and a quiet idle. As built, the crew has three to five each, and the 8 seven
(his three steam puffs). Same ids, `z`, `rest` and anims in both looks.

**Timing**, from 1 and 7:

| Beat | Trigger | Time | Shape | In 1 and 7 |
|---|---|---|---|---|
| The surprise | `surprised` | 700–1100 ms, once | `ease: 'emphasized'` at t 0, the peak at t ≈ 0.3, settle by 0.55–0.7, hold to t 1 | the draw tube slides 9 units (1100); the hat hops 3.5 (700); the hook jerks up 14° → 10° (800) |
| The joy | `laugh` (`smile`, `wink` for small moves) | once 1300 ms, or a loop 520–760 ms | | the hat tips −15°, lifts 6 (`R.lid`, 1300); the hook waves 16° (760) |
| Follow-through | `wobble`, `spin`, `flip` | loop 520 ms | cloth only | the bandana tails 12° |
| Idle | `idle` | loop 2200–3000 ms, at most 6° | barely there | the hook 6° (2800); the tails 5° (3000); the glint (2200) |

**Building blocks** in `shared.ts` (they hold exactly the numbers above):

- `tipAndHop(hinge)`: a hat that tips on laugh and hops on surprise. The hinge is the far brim point.
- `flutter(root)`: cloth (tails, a pennant, a plume, a sail's corner): fast with the body's motions and laugh, slow
  when idle.
- `wave(wrist, { side })`: a raised hand or prop: waves when happy, sways when idle, jerks up on surprise. `side: -1`
  for an arm on the viewer's left (Peg), `1` on the right.
- `glint(at, { origin })`: a whole hidden sparkle gimmick on brass, idle and smile. Pass the same `origin` in both
  looks if the star moves (the Captain's sits 0.5 higher in the invested look).
- For the rest, `GIMMICK_RECIPES` (STYLE.md §14): `R.steam` (8's pot), `R.drip` (3's bucket), `R.spin` (9's needle),
  `R.inflate` (4's sail), `R.sway` (5's wings), `R.lid`, `R.popUp`.

**Rules.** The rest pose is complete (nothing plays under 48 px or with reduced motion). `z: 'behind'` for what comes
out from behind the digit (the draw tube, knot tails), `front` (the default) for what sits over the face (a hat, a
hook). `rest: 'hidden'` only for sparkles, drops, steam and soap bubbles (and the 2's map sheet, which exists only
while she laughs: at rest the map is rolled in her sash). Origins at real hinges, wrists and knots. Nothing crosses
the eyes or the mouth while it moves, and every frame stays in the tile (look at `gimmicks-<id>.png`).

## 11. Motion

`pivot` in the middle of the face plank (the Captain 50, 50; Peg 48, 40, so her wobble turns around her foot);
`base` the bottom of the lowest piece; `squash: true` (they are objects). `motionBias`: 3–4 motions, favourite first
(section 2). The series' signature is a rock, as on a deck: a character on a point (a peg, a narrow foot) favours
`wobble`; a proud one `nod`; the kids `bounce` and `squash`.

## 12. The toolbox and the check loop

**`shared.ts`** (import from `./shared`; the drawing basics stay in `../draw`: `path`, `line`, `circle`, `ellipse`,
`shaded`, `P`, `lerp`, `mirrored`, `sx`, `polar`):

| Helper | What for |
|---|---|
| `pirateId`, `pirateName`, `PIRATE_TILES`, `PirateCharacter`, `PirateDigit`, `PIRATE_LOOKS` | the def's id, name, tile and your export |
| `chamfer`, `poly`, `slantedPlank`, `inset`, `inwardNormals`, `signedArea`, `along`, `Pts`, `LIGHT` | plank geometry |
| `slab`, `woodSlab`, `ironSlab` | bevelled planks (convex) |
| `inked`, `inkedLine`, `ring`, `inkedRing` | inked costume pieces, straps, hoops |
| `nail`, `grain`, `anchor`, `star` | wood and brass details |
| `houseCounter` | the house look's oval counter |
| `BROWS`, `withIris` | the face |
| `tipAndHop`, `flutter`, `wave`, `glint` | gimmicks |
| `wood`, `woodDeep`, `woodMid`, `brass`, `navy`, `cream`, `hatCloth`, `leather`, `iron`, `steel`, `bandanaRed`, `patchBlack`, `INK`, `OUTLINE`, `nailHead` | colours |

**Look at what you draw** (STYLE.md §10), from the repo root, with your own output folder:

```
npm run sheet -w @sudoku-fight/avatars -- --file packages/avatars/src/catalog/pirates/two.ts --out <your folder> --shoot
```

Use an absolute folder of your own for `--out` (e.g. `C:/Users/mosheg/AppData/Local/Temp/sfa-pirates-2`; a
relative one is taken from `packages/avatars`). Six PNGs land there: `sheet-`, `film-` and `gimmicks-pirates-2-house.png` and the same for
`-invested` (without `--out`: `<os temp>/sfa-sheets`, shared by everyone). Then compare with the finished two:

```
npm run sheet -w @sudoku-fight/avatars -- --file packages/avatars/src/catalog/pirates/two.ts pirates-2-house pirates-1-house pirates-7-house pirates-2-invested pirates-1-invested pirates-7-invested --lineup --out <your folder> --shoot
```

`lineup.png` shows them in that order at 96, 64, 48, 36 and 24 px and the 48 and 22 px head crop, on the dark app
and the light board. Ids after `--file` are looked up in your file first, then in the catalog. Without `--shoot` it
prints the HTML paths. Do not `cd`: if you call npm from elsewhere, use `npm --prefix <repo> -w
@sudoku-fight/avatars run sheet -- …`, with an absolute `--file` path or one relative to `packages/avatars`
(`src/catalog/pirates/two.ts`).

**Tests and types**, targeted (a flag must come first: `--selectProjects` would swallow a bare pattern):

```
npm --prefix packages/avatars test -- --testPathPattern pirates
npm --prefix packages/avatars run typecheck
```

`pirates.test.ts` checks your file as soon as it exists: one character of your digit; both looks 1:1 (section 3);
the id, name and tile; wood in both looks, bevelled planks in the invested one; ink only in the invested look; round
eyes, `squash`, ≥ 2 gimmicks, ≥ 3 motions; everything inside the tile and measurable; the head crop; native layers
and motions at the app's sizes. The catalog's own checks (clean SVG, anchors in the canvas, eye spacing, gimmick
data) run once you join the catalog; meet them now (STYLE.md §8–9).

**Done** means: every expression reads at 160, 48 and 24 px on both grounds; the digit reads at 48 px; the 22 px
crop shows a face, not a digit; every motion and gimmick looks right in its film; the lineup sits with 1 and 7; the
tests and the typecheck pass.

## 13. Do and don't, from 1 and 7

**Do**

- Make the digit's shape do the character's work: the 1's flag is a nose, the 7's stem is a peg leg.
- Keep one calm wooden surface under the face; costume below it, hat or bandana above it.
- Draw both looks from the same anchors and the same anim objects; differ only in the art.
- In the invested look, ink every filled piece, light every plank with `slab`, nail the joints, put a cast shadow
  under the hat.
- Keep the house look honest: no ink, one offset shade, a highlight or two.
- Give every moving part a real hinge, and a rest pose that looks finished.
- Look at the lineup with 1 and 7 before you call it done.

**Don't**

- No weapons, no pipe, no bottle; no hooked nose; no second nose, patch, hook or peg leg.
- No skin hands, no painted lashes, no drawn face in the layers (the rig owns it).
- No concave `slab` (split it into planks); no painted-shut counters.
- No grain, nails or hair in the face's room; no nail on a face.
- No outlines in the house look; no gradients, filters or opacity tricks in either.
- No hex values; no new tile; no edits outside your file.

## 14. Joining the catalog (the integrator, after the artists)

One person, once every character is done, in this order:

1. `pirates/index.ts`: import each export and add it to `PIRATE_CAST` (it is sorted by digit), all of them in one go
   (section 7: three tile pairs would meet otherwise). `PIRATES`, the catalog, the rig test's iris list and
   `pirates.test.ts` follow by themselves.
2. `packages/protocol/src/account.ts`: `AVATAR_IDS`, at the start of the symbols, in `PIRATES` order (every house
   look 1–9, then every invested look); fix the count in its comment. The server validates against this list, so
   the server needs a redeploy (another session does deploys). Check `apps/server/src/stealth/personas.ts`
   (`PERSONA_AVATAR_IDS`).
3. The app: `npm run avatars:strings -w @sudoku-fight/mobile` (Hebrew and English names), then the other 17
   locales' `avatars.json` (`npm run i18n:check`); `apps/mobile/src/avatars/__tests__/catalog.test.ts` (the symbols'
   first ids); `PiratesLabScreen` (a name and a gimmicks note per character, in `dev.json`).
4. `npm run preview -w @sudoku-fight/avatars` regenerates `docs/avatars/preview.html`.
5. The counts in `docs/03-DESIGN.md`, `docs/01-SPEC.md` and DECISIONS-PENDING 3.27 (119 avatars since 31.10.2026:
   101 + 18 with the whole series).

Done on 31.10.2026, steps 1 to 5 (the full checks of step 6 are the release's).
6. The full checks: `npm test`, `npm run typecheck`, `npm run lint`.
