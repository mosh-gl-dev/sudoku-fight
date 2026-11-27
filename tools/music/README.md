# tools/music: film-score synthesis engine

Pure Node 24 (ES modules, typed arrays). No dependencies, no samples, no third-party audio.
Deterministic: the same command gives the same bytes (seeded PRNG only).

```
node tools/music/render.mjs <trackId> [--out dir] [--from sec --to sec] [--solo busName] [--seed n] [--quiet]
                                      [--m4a [file.m4a]] [--ffmpeg path]
node tools/music/analyze.mjs <out>/<trackId>.wav --score <out>/<trackId>.score.json --png <out>/<trackId>.png
```

Writes `<out>/<trackId>.wav` (16-bit stereo 44.1 kHz) and `<out>/<trackId>.score.json`.
Default output folder: the session scratchpad `.../scratchpad/music/` (override with `--out` or the env var `MUSIC_OUT`;
the scratchpad of an old session does not exist any more, so a later session must pass one of them).
`--from/--to` renders a window in seconds (fast preview, no loop fold, file gets a `.20-30` suffix).
`--solo` renders one bus only (suffix `.solo-<bus>`). The score JSON always holds every note.

`--m4a` encodes the finished WAV to AAC 192 kbit/s (default `assets/music/candidates/<trackId>.m4a`), decodes it again
and prints the true peak, loudness, length and loop seam **of the decoded m4a**, which is what the app plays.
ffmpeg is taken from `--ffmpeg`, the env var `FFMPEG`, or this session's portable copy. The manual equivalent:
`ffmpeg -y -i in.wav -c:a aac -b:a 192k -movflags +faststart out.m4a`.

The render log prints `HINT:` lines (limiter working hard, low stereo correlation, very wet reverb, missed loudness,
notes outside an instrument's comfortable range). Read them before listening.

Speed: about 2800 notes / 3 minutes of audio render in about 55-75 s with about 1.1 GB of memory. The demo (`_demo`, 80 s)
takes about 13 s. The band instruments render at 9x-137x realtime per note (section 4b).

Files:

| file | what |
|---|---|
| `engine.mjs` | Session, Part, Bus, mixer, master chain, WAV and score writers. Re-exports everything below. |
| `lib/instruments.mjs` | the orchestral instruments, `renderNote()` |
| `lib/band.mjs` | the "Kugel" band: tuba, accordion, whistle/theremin leads, jingles, kit, 808, mono synth bass, stabs, plucks, glass pad, boom, impacts, riser (section 4b). Registers itself into `INSTRUMENTS`. |
| `lib/effects.mjs` | reverb IR synthesis, FFT convolution, delay, compressor, saturation, width, limiter, dither |
| `lib/dsp.mjs` | FFT, biquads, BS.1770 loudness, true-peak detector, PRNG |
| `lib/theory.mjs` | note names, scales, chords, phrase notation |
| `render.mjs` | CLI |
| `tracks/<id>.mjs` | one composition per file. `tracks/_demo.mjs` plays every instrument. |
| `analyze.mjs` | analyzer and score linter (separate tool, not used by the engine) |

---

## 1. A track module

```js
// tools/music/tracks/nocturne.mjs
import { chord, scale } from '../engine.mjs';

export default {
  id: 'nocturne',          // file name of the output
  title: 'Nocturne',
  bpm: 66,                 // initial tempo
  loop: true,              // seamless loop: the tail is folded onto the start
  build(s) {               // s = Session
    s.meter(4, 4);
    s.reverb('hall');
    s.master({ lufs: -16 });
    const B = (bar, beat = 1) => s.bar(bar, beat);   // bars and beats are 1-based

    // buses: gain in dB, sends 0..1
    const pianoBus = s.bus('piano', { gain: -3, reverb: 0.3, room: 0.12 });
    const celliBus = s.bus('celli', { gain: -7, pan: 0.25, reverb: 0.38 });
    const vlnBus = s.bus('violins', { gain: -8, pan: -0.25, reverb: 0.42 });

    // parts: one instrument on one bus, with default parameters
    const piano = s.part(pianoBus, 'feltPiano', { hardness: 0.3 });
    const celli = s.part(celliBus, 'stringsEnsemble', { section: 'celli' });
    const vln = s.part(vlnBus, 'stringsEnsemble', { section: 'violins', sordino: true });

    s.section('A', B(1), B(9), 'gentle');
    for (let bar = 1; bar <= 8; bar += 2) piano.pedal(B(bar), B(bar + 2));
    let b = piano.play(B(1), 'p D3:1 A3 F4 A4 | E5:2 D5:1 F4', { shape: 'arch' });   // returns the end beat
    b = piano.play(b, 'Bb2:1 F3 D4 F4 | A4:2 G4:1.5 F4:.5');
    piano.chord(B(4, 4.5), 0.5, ['C#4', 'E4'], 0.3, { tag: 'tension' });               // an intended dissonance

    celli.play(B(5), 'D3:4 G3:4 F3:4 E3:4', { vel: 0.55, legato: true, expr: 'hairpin' });
    vln.note(B(5), 16, 'A5', 0.6, { expr: 'swell' });                                   // one long swell
    vln.chord(B(7), 8, chord('Dm9', 4).slice(2), 0.5, { expr: 'cresc' });

    s.rit(B(8, 3), B(9), 54);        // ritardando into the loop point
    s.tempo(B(9), 66);               // (not needed here, shown for the API)
    s.length(B(9));                  // loop point = total length in beats
  },
};
```

All note calls are queued. Rendering happens after `build()` returns, so the tempo map, pedals and bus
settings may be declared in any order.

Time is always in **quarter-note beats from the start** (beat 0 = bar 1 beat 1). Use `s.bar(bar, beat)`.

---

## 2. Session API

### Time

| call | meaning |
|---|---|
| `s.tempo(beat, bpm)` | step change of tempo at `beat` |
| `s.tempo(beat, bpm, { ramp: true })` | tempo moves linearly from the previous point to this one |
| `s.rit(fromBeat, toBeat, bpm)` / `s.accel(...)` | ritardando / accelerando between two beats (then stays at `bpm`; add `s.tempo(toBeat, old)` for "a tempo") |
| `s.sec(beat)` / `s.bpmAt(beat)` | beats to seconds / tempo at a beat |
| `s.meter(num, den = 4, fromBar = 1)` | time signature from a bar on |
| `s.bar(bar, beatInBar = 1)` | absolute beat of a bar position, both 1-based. `s.bar(5, 2.5)` = bar 5, the "and" of beat 2. In 6/8 the beat unit is the eighth. |
| `s.barBeats(bar)` | quarter-note beats in that bar |
| `s.section(name, startBeat, endBeat, mood)` | declares a section for the score JSON. mood: `gentle`, `tension`, `climax`, `release` or any string |
| `s.length(beats)` | total length = the loop point. Without it: the end of the last note (rounded up to a bar when `loop`). |
| `s.rng(name)` | a named seeded random generator: `const r = s.rng('melody'); r()` gives 0..1. **Never use `Math.random()`.** |
| `s.humanize = { time: 0.008, vel: 0.04 }` | default humanisation: gaussian timing jitter (seconds) and relative velocity jitter. Per part: `{ humanize: { time, vel } }`. Per note: `{ exact: true }`. |

### Mixer

| call | meaning |
|---|---|
| `s.bus(name, opts)` | create or fetch a bus. opts below. |
| `s.part(busOrName, instrument, defaults)` | an instrument on a bus. `defaults` = default note parameters, plus `name` (label in the score JSON). |
| `s.reverb(presetOrOpts)` | the hall. Presets: `'hall'` (3.2 s), `'cathedral'` (4.0 s), `'chamber'` (2.5 s). Or `{ rt60, predelay, damping, lowDecay, early, buildup, hp, lp, wet, seed }` |
| `s.room(presetOrOpts)` | the second reverb, short and dark (`'room'`, 1.1 s), fed by the `room` send |
| `s.delay({ beats, feedback, damp, pingpong, toReverb, bpm })` | tempo-synced delay fed by the `delay` send. `beats: 0.75` = dotted eighth. Time uses the track bpm (or `bpm`). |
| `s.master({ lufs, ceiling, eq, glue, width, sat, hp, tail })` | master chain, see section 7 |
| `bus.tapeStop(fromBeat, toBeat, { curve, resume })` | tape stop on this bus: speed and pitch fall to zero between the two beats (`curve` 1.6: the brake bites late), then silence until `resume` (default `toBeat`). Whatever still sounds on the bus after `resume` comes back normally: leave the bus resting there or start the next section on it. |

Bus options:

| option | default | meaning |
|---|---|---|
| `gain` | 0 | dB |
| `pan` | 0 | -1..1 balance (notes also take their own `pan`) |
| `reverb`, `room`, `delay` | 0 | post-fader send levels, 0..1. A send of 1 gives a reverb about as loud as the dry sound. |
| `width` | 1 | mid/side width, 0 = mono |
| `eq` | none | list of `{ type, f, q, gain }`. type: `highpass`/`hp`, `lowpass`/`lp`, `peak`, `lowshelf`/`ls`, `highshelf`/`hs`, `bandpass`, `notch` |
| `comp` | none | `{ threshold: -18, ratio: 2, attack: 0.02, release: 0.2, knee: 6, makeup: 0 }` |
| `sat` | 0 | tape-style saturation drive in dB (3 to 9 is gentle). 0 = off |
| `mute` | false | |

`bus.set(opts)` changes options later. Automation, linear between points, in beats:

```js
bus.automate('gain', [[s.bar(17), -12], [s.bar(21), 0]]);        // dB, added to the bus gain
bus.automate('lowpass', [[s.bar(17), 600], [s.bar(21), 12000]]); // filter cutoff in Hz (opens up)
```

---

## 3. Part API: writing notes

| call | meaning |
|---|---|
| `p.note(beat, durBeats, pitch, vel, opts)` | one note. `pitch`: `'C#4'`, `'Bb2'`, a midi number (fractions allowed), or an array (several notes at once). `vel` 0..1. |
| `p.play(beat, phrase, opts)` | a phrase in the notation below. Returns the end beat. |
| `p.chord(beat, dur, pitches, vel, { strum, ... })` | chord. `strum`: seconds between notes, low to high (negative: high to low) |
| `p.arp(beat, pitches, step, { dur, vel, shape, ... })` | pitches one after another every `step` beats. Returns the end beat. |
| `p.roll(beat, dur, pitch, { from, to, rate })` | roll: strokes at `rate` per second, velocity ramps `from` to `to` (timpani, marimba, lowDrum) |
| `p.hit(beat, dur, vel, opts)` | unpitched event (cymbalSwell, riser, heartbeat, lowDrum) |
| `p.pedal(downBeat, upBeat)` | feltPiano sustain pedal: notes starting in the range ring until `upBeat` |
| `p.reverse(endBeat, lenBeats, pitch, vel, { smear, curve })` | reversed swell of this instrument's note, ending exactly at `endBeat` |

Options common to every note: `pan` (-1..1), `amp` (linear level multiplier, default 1), `tag` (`'tension'` marks an intended
dissonance for the linter), `exact: true` (no humanisation). Every other key is an instrument parameter (section 4).

### Phrase notation

Tokens are separated by spaces.

```
C4:1         note, length 1 beat           lengths are sticky: "C4:1 E4 G4" = three quarter notes
Bb3:.5       half a beat                   length may also be a symbol: w h q e s t (4 2 1 .5 .25 .125 beats),
F#5:q.       dotted quarter                followed by . (dotted) or t (triplet): e. = .75, qt = 2/3, et = 1/3
[C4 E4 G4]:2 chord
_:1          rest (also sticky length)     _  alone rests for the current length
~:1          tie: lengthens the note(s) that just ended by 1 beat
60:1         midi number instead of a name
|            bar line, ignored
p mf ff      dynamics, apply from here on: ppp .14  pp .24  p .36  mp .48  mf .60  f .74  ff .87  fff .97
C4:1@0.8     explicit velocity for this note
suffix flags (after length/velocity):  !  tension tag    '  staccato (45 % length)    ^  accent (+0.12)    -  tenuto (slight overlap)
             example: "C#4:1.5!"  "E4:e'"  "[D4 Eb4]:2@0.5!"
```

`p.play(beat, phrase, opts)` options:

| option | meaning |
|---|---|
| `vel` | base velocity when the phrase has no dynamics mark (default: part default or 0.6) |
| `transpose` | semitones |
| `shape`, `shapeAmt` | velocity shape over the phrase: `'arch'`, `'cresc'`, `'dim'`, `'dip'` or `fn(u)` (u = 0..1, returns a multiplier). `shapeAmt` default 0.25 |
| `legato` | **true legato** for `stringsEnsemble`, `contrabass`, `soloViolin`, `soloCello`, `warmHorn`, `flutePad`: notes that touch (one ends on the beat where the next starts, also across two `play()` calls) are rendered as ONE continuous sound. Every player moves to the new pitch with a short slide (30-120 ms: wider and softer = slower) and a small dip in level and brightness, each section player at his own moment; a repeated pitch is a bow change (or a re-articulation on horn and flute). Notes are joined only when `section`, `sordino`, `players`, `detune`, `spread`, `pan`, `vibrato`, `noise` agree; two lines at once are joined lowest to lowest. Other sustained instruments (tremolo, choir, sub): consecutive notes overlap slightly. The score JSON still lists every note. |
| `stretch` | multiplies all beat positions and lengths (0.5 = double time) |
| `gate` | fraction of the written length that sounds (default 1) |
| anything else | passed to every note as an instrument parameter (`expr`, `sordino`, `tag`, `pan`, ...) |

Helpers exported from `engine.mjs`:

```js
n('C#4')                         // 61
scale('D', 'dorian', 4)          // .deg(1)=D4 .deg(8)=D5 .deg(0)=C4 .deg(-1)=B3 .deg(5, -1)=Ab4 (chromatic alteration)
                                 // .degs([1,3,5]) .triad(5) .seventh(2) .notes('C3','C5')
chord('Dm9', 3)                  // [50,53,57,60,64]; also 'Fmaj7/A', m7b5, dim7, sus4, add9, maj7#11, 7b9, mMaj7 ...
invert(notes, 1)   spread(notes) // inversion, open voicing
transpose(pitchOrList, semis)
phraseBeats('C4:1 E4 G4:2')      // 4
SCALES                           // major minor dorian phrygian lydian mixolydian locrian harmonicMinor melodicMinor
                                 // phrygianDominant hungarianMinor wholeTone octatonic octatonicHW chromatic pentatonic*
accordionVoicing('F#m')          // { bass: 42, chord: [54, 57, 61] }: root in E2-D#3, close chord in F#3-F4 (the "pah")
swingGroove(part, beat, beats, { step: .25, swing: .58, vel, accents: [1, .5] })   // swung shaker/hat grid, returns end beat
hatRoll(part, beat, beats, { step: .125, from: .35, to: .8, open })                // trap roll (1/6 = 16th triplets)
```

---

## 4. Instruments

`vel` changes the timbre of every instrument, not only its level: louder = brighter.
Struck and plucked instruments never repeat a stroke exactly (round robin, seeded per note, so still deterministic):
where the mallet or finger lands (upper partial levels), hardness, a trace of tuning and decay, and the contact noise differ
on every note. The register trims in `lib/instruments.mjs` (`TRIMS`) keep each sustained instrument at the loudness the
mixing advice below was written for.
"Range" is the comfortable midi range; outside it the instrument still plays but sounds less natural.
Typical level of one note at vel 0.8 (loudest 400 ms, LUFS, bus gain 0): strings, solo strings, horn, flute and choir
-12 to -21 (higher notes are louder), felt piano and harp -15 to -20, timpani -16, cymbalSwell -16, riser -18,
lowDrum and subBass -18 to -21, celesta, glockenspiel, vibraphone -20 to -22, marimba -22 to -25, heartbeat -24.
Each velocity step of 0.3 is about 6 LU. The bus gains in section 5 balance these.

### Sustained (length matters; `dur` + release)

Common parameters: `expr` (see below), `attack`, `release` (seconds), `vibrato` (depth multiplier, 0 = senza vibrato),
`bright` (cutoff multiplier, 0.5 = darker, 1.5 = brighter), `detune` (cents spread of the players; strings default 9, a
little wider below A2, up to 16 at E1, and spread evenly over the players), `players`,
`spread` (stereo width of the section), `noise` (bow/breath noise multiplier).

| instrument | range | extra parameters | notes |
|---|---|---|---|
| `stringsEnsemble` | 28-103 | `section`: `violins` (default), `violins2`, `violas`, `celli`, `basses`. `sordino: true` | 4-7 detuned players. Each player: his own onset (8-40 ms after the leader), a small pitch scoop into the note, irregular delayed vibrato (rate and depth wander), slow bow-pressure changes in brightness, his own bow contact point (slip-time notches), and bow changes on long notes at his own moments (about every 3-6 s). Slow bow attack (faster when loud). The section is always centred on pitch. |
| `stringsTremolo` | 28-103 | `section`, `tremRate` (12.5 per s) | unsynchronised bow tremolo. With `expr: 'cresc'` it is the classic tension device. |
| `contrabass` | 28-60 | (= stringsEnsemble with `section: 'basses'`) | |
| `soloViolin` | 55-100 | `glideFrom` (midi), `glideTime` (0.11 s; inside a legato chain: the slide time of that note change), `vibDelay` (0.2 s) | single bowed voice: Helmholtz (saw) wave with a finite slip time at a moving bow point (moving spectral notches; louder = brighter), stick-slip pitch jitter and shimmer, bow noise pulsed at every period (louder at the attack and at bow changes), bow changes every 2.5-4.5 s. Vibrato starts late, grows through the note and is irregular (rate and depth vary 5-7 % and 20-30 % from cycle to cycle); after a legato note change it narrows and grows back. Violin body: air mode A0 ~280 Hz, corpus modes ~455/550 Hz, low "nasal" region 1-1.5 kHz, bridge hill ~2.6 kHz, roll-off above ~5 kHz, and a dense set of sharp plate modes above 900 Hz that makes every harmonic flicker with the vibrato. |
| `soloCello` | 36-81 | same | the same instrument scaled (body modes x0.38, bridge hill and roll-off x0.66). The warmest lead voice. Best between C2 and A4. |
| `warmHorn` | 34-77 | `players` (3) | timbre follows the dynamic: dark and round below vel 0.45, then a brassy table is crossfaded in (spectral centroid x3.5 from p to ff). Each player scoops into the pitch on his own. True legato (slurred note changes, a repeated pitch is re-tongued). |
| `flutePad` | 55-96 | `players` (2) | breathy, slow attack, gentle vibrato with a level pulse. Soft = almost a sine, loud = an edge. True legato. |
| `choirPad` | 36-84 | `vowel`: `aah` (default), `ooh` (darker, the safest), `oh`, `mm` (hum). `morph` (1; 0 = static vowel, 2 = twice as far) | 6 voices in two groups with different formants (different singers). The vowel moves slowly over a long note: `aah` closes towards `ooh`, `ooh` opens a little towards `oh`, `oh` closes to `ooh`, `mm` opens slightly; nothing moves on notes shorter than about 1 s. |
| `subBass` | 24-55 | | sine with a few harmonics so that small speakers still show the note. Velocity changes only the level. Keep it quiet. |

**Expression (`expr`)** shapes a sustained note over its length. It scales the dynamic, so the note also gets
brighter as it gets louder. `vel` is the peak.

`'flat'` (default), `'cresc'` (0.3 to 1), `'dim'` (1 to 0.25), `'swell'` (0.25, peak at 55 %, 0.3), `'hairpin'`,
`'fp'` (forte-piano), `'rise'` (from nothing), `'fade'` (to nothing), `'niente'` (nothing, peak, nothing),
or your own points `[[0, 0.2], [0.7, 1], [1, 0.4]]` (position 0..1, level 0..1).

### Struck and plucked (ring by themselves)

Common parameters: `decay` (multiplier of the natural ring time), `damp: true` (stop at the written length),
`bright`, `stereo` (keyboard spread).

| instrument | range | extra parameters | notes |
|---|---|---|---|
| `feltPiano` | 24-103 | `hardness` 0..1 (0.35; lower = softer felt), `ring` (seconds until the damper falls), `pedal: true`, `detune` (string beating, 1), `noise` (hammer and damper noise, 1) | inharmonic partials, two-stage decay, 2-3 beating strings, hammer thump, sympathetic bloom under the pedal. The written length is the key-down time: without pedal the damper stops the note at its end. Use `p.pedal()`. |
| `harp` | 31-100 | `pluck` (position, 0.23) | rings unless `damp: true`. Soft = round finger, loud = bright snap. |
| `stringsPizzicato` | 28-96 | `section`, `players` (3), `detune` (cents between players, 4) | short, with a soft snap. Pick the `section` that owns the register (violins from G3, violas from C3, celli from C2, basses below). |
| `contrabassPizz` | 28-60 | | |
| `celesta` | 60-108 | | soft bell with a slow shimmer; a loud stroke adds a bell-like "ting" (upper modes +18 dB from p to ff) |
| `glockenspiel` | 72-108 | | bright. Use low velocities and a low bus gain. |
| `marimba` | 36-96 | | soft mallet, nearly pure tone when soft; loud strokes add the woody overtone two octaves up |
| `vibraphone` | 53-89 | `motor` 0..1 (tremolo depth), `motorRate` | long ring |
| `timpani` | 36-60 | | pitched, with a pitch drop after the stroke. `p.roll()` for rolls. |
| `lowDrum` | 24-43 (default 31) | | deep film drum (unpitched in the score). `p.hit(beat, dur, vel)` or `p.note(..., 'G1', ...)` to tune it. |

### Effects (`p.hit`)

| instrument | parameters | notes |
|---|---|---|
| `heartbeat` | `gap` (0.27 s between lub and dub), `tone` (harmonics, 0.5), `midi` (33) | soft double pulse. One hit = one lub-dub. |
| `cymbalSwell` | `tail` (1.8 s after the peak), `curve` (2.2), `bright` | rises over the written length, peaks at its end. Put the end on the downbeat you are building to. |
| `riser` | `from` (250 Hz), `to` (4200 Hz), `q` (2.5), `curve`, `tail` (0.12 s) | noise sweep, stops short at the end |
| any + `p.reverse()` | `smear` (0.6), `curve` | reversed note with a reversed reverb, ends on the beat |

`renderNote(instrument, { midi, vel, dur, ...params })` returns `{ L, R, n }` for one dry note (QA scripts).

### 4b. The band ("Kugel" style, `lib/band.mjs`)

The hybrid klezmer-noir band of the Kugel score (Assa Raviv and Tom Armony). Each instrument was fitted to measurements
of the score's cues; the reference numbers are in a comment above each instrument in `lib/band.mjs` and in the table at
the end of this section. Same conventions as above: `vel` is timbre (louder = brighter, brassier, harder), every stroke
is a little different (round robin from the seeded rng), `pan` and `amp` on every note, nothing random or clock-based.

Typical level of one note at vel 0.8 (loudest 400 ms, LUFS, bus gain 0): tuba -16.6 to -18, accordion -17 to -19,
whistle/theremin -18, kick and dropKick -17, sub808 -17.5 to -20, monoSynthBass -16 to -17, boom -17.4, stabs -20,
pluck -19 to -20, dropImpact / glissRiser / glassPad -20 to -21, snare and clap -21, riq -24 to -25, tambourine -24,
jingleRoll -23, fingerCymbals -26, shaker -27, closed hat -26 (open -17). Each velocity step of 0.3 is about 6-7 LU, as
for the orchestral instruments.

**Chain instruments** (`tuba`, `whistleLead`, `thereminLead`, `sub808`, `monoSynthBass`): with
`p.play(beat, phrase, { legato: true })` touching notes become ONE sound that glides from note to note (slur / portamento
/ 808 slide). Without `legato` every note is a new attack.

| instrument | range | parameters (default; safe range) | notes |
|---|---|---|---|
| `tuba` | 28-58 (E1-Bb3) | `accent` (0.38 = +2.8 dB; 0-0.8), `scoop` (semitones, -0.45; 0..-1), `scoopTime` (0.04 s), `glide` (legato slide, 0.055 s; 0.03-0.12), `growl` (1; 0-2: flutter of the upper harmonics above vel 0.55), `release` (stop time constant, 0.075 s; 0.04-0.15), `bright` (1; 0.7-1.4), `noise` (lip air, 1), `drift` (intonation wander 3 c x, 1), `expr` | oom-pah bass: write the BODY length (0.25-0.45 s staccato quarters: `C2:1'` in phrases, or `dur` 0.3). Flat body, abrupt stop, harmonics 2-4 as strong as the fundamental: the phone hears it from D2 up. vel 0.5-0.65 = round mf (Shidduch), 0.75-0.85 = Schlep's forte, 0.9+ = brassy with growl. |
| `accordion` | 40-96 | `musette` (cents of the side reeds, 10; 15-25 = wide), `wet` (side-reed level, 0.25 = the score's light musette, AM ~35 %; 0.5-0.7 = a deep French wah-wah; 0 = dry), `reeds` (3; 1-3), `octave` (16' reed level, 0; 0-1: bass drones), `high` (4' reed, 0; 0-1), `chop` (false: true = short dry stab), `spread` (reed panning, 1; 0-1.5), `attack` (0.025-0.05 s), `release` (0.075 s), `expr` (the bellows), `bright`, `drift` (1) | vibrato-free reeds; a light musette beating (about 4 Hz at G5 with 10 c, ~35 % deep, as in Shkoyach and Clown). `accordionVoicing(sym)` gives the left-hand bass + close "pah" chord. Use `chop: true` with written lengths 0.08-0.2 for off-beat stabs (a bright bellows punch that chokes ~8 dB in 0.12 s). |
| `whistleLead` | 67-98 (G4-D7) | `sharp` (cents reached after ~1 s, 25; 10-40), `sharpStart` (cents at the start of a chain, -5), `creep` (more cents over the next 1.2 s, 12; 0-20), `jitter` (fast pitch/level turbulence, 1; 0-2), `scoop` (semitones from below, -0.55; 0..-1), `scoopTime` (0.1 s; 0.06-0.12), `fall` (cents at phrase end, -35; 0..-60), `fallTime` (0.13 s), `glide` (portamento, 0.2 s; 0.05-0.35), `drift` (x6 c wander, 1; 0-2), `vibrato` (0; 1 = +-20 c), `vibRate` (5.5), `noise` (breath, 1), `attack` (0.07), `release` (0.09) | near-sinusoidal (h2 -33, h3 -37 dB); the human whistle of Goodbye: starts on pitch, warms sharp (+25 c by ~1 s, +37 c by ~2 s). Phrases of 1-2 bars with `legato: true`; held notes above ~1.8 kHz only briefly (earbuds). |
| `thereminLead` | 55-96 | as whistle, defaults: `sharp` 8 (no creep), `scoop` -0.35, `fall` -25, `glide` 0.035, `vibrato` (1 = +-34 c; 0-1.3), `vibRate` (7.1; 5-7.5), `vibDelay` (0 s: full depth from the first note, as in Schvitz), `drift` (x5 c) | the Schvitz / Antwerp / Rabbi Nuchem coda lead. Fast stepwise lines in 8ths glide 20-40 ms. |
| `tambourine` | (unpitched) | `stroke` ('hit' head+jingles, 'shake' jingles only, softer attack), `skin` (head level, 0.35), `ring` (jingle ring x, 1; 0.5-1.5), `bright` (1), `spread` (jingle stereo, 1: as wide as Schlep's) | the house sound: quarters or off-beat 8ths. Use `p.hit(beat, dur, vel)`. Each hit = ringing jingle lines + a ~0.4 s "sizzle" of collisions (the fizz between the lines). |
| `riq` | (unpitched) | `stroke` ('dum' head, 'tek' rim crack, 'jingle'), `skin` (1), `skinF` (Hz, 196), `ring` (0.45), `spread` (0.8) | frame drum with jingles (Shkoyach intro): dum on the beat, tek on the off-beats. Both strokes are broadband slaps (a noisy head, not a tone) with a wash of 10 small jingles. |
| `jingleRoll` | (unpitched) | `rate` (strokes/s, 14; 8-20), `from`, `to` (level ramp x vel, 0.45 -> 1), `ring`, `spread` (0.45) | a continuous shake for the written length: 16th rolls at peaks, a 1-beat "breath" fill. |
| `fingerCymbals` | (unpitched; a written pitch >= C6 tunes them) | `ring` (1), `damp: true` (closed clack) | zils: long-ringing pings, sparse. |
| `shaker` | (unpitched) | `attack` (rise, 9-16 ms by vel), `decay` (tail x, 1: a 15-40 ms time constant by vel; 2-3 = a long egg / shekere 'shhk'), `bright`, `spread` (grain width, 1) | dry clicks with a darkening tail (Clown C). Ghosts at vel 0.3-0.5, accents 0.7-0.9. `swingGroove(part, beat, beats, { swing })` writes the shuffled 16ths (Schlep ~0.62-0.65). |
| `kick` | (unpitched, tunable 21-50, default A1) | `drop` (semitones of the pitch drop, 18), `dropTime` (0.05 s), `decay` (x0.42 s t60), `drive` (1.4), `click` (0.5), `tune` (cents) | tuned: give it the bass note (`kick.note(b, .5, 'E1', .8)`) so kick and bass fuse. |
| `dropKick` | (unpitched, default C#1) | same, defaults `drop` 26, `dropTime` 0.14, `decay` x0.8 | the breakdown / trailer kick that sweeps ~150 Hz -> ~35 Hz. |
| `snare` | (unpitched) | `tune` (cents), `decay` (shell + wires x, 1), `bright` | dry and broadband (a shell thump + wires, no ringing tom tone), for the "pah" with the stab. |
| `clap` | (unpitched) | `flam` (s, 0; 0.02-0.08: a grace clap that much EARLIER, -6 dB), `decay`, `bright` | 2-4 bursts + a room tail that is wide above 3.5 kHz; flat from 300 Hz to 9 kHz like Schvitz's intro clap (0.08 s flam). |
| `hat` | (unpitched) | `open` (0; 0.3-1), `decay` (x; closed t60 0.07-0.17 s by vel), `tune` (cents), `bright`, `spread` (overhead width, 0.35) | `hatRoll(part, beat, beats, { step })` for trap rolls (0.125 = 32nds, 1/6 = 16th triplets). |
| `sub808` | 24-52 | `tune` (cents, 0; the score's 808s sit -15..-25), `drop` (attack drop in semitones, 5), `dropTime` (0.06 s), `glide` (tail glide in semitones, 0; -1..-2 = the Prelude tail), `glideTime` (0.15 s), `decay` (dB/s, 17; 6-25), `drive` (2.4; 0-4), `bias` (asymmetry of the saturation = even harmonics, 0.4: h2 ~-10 dB as in Prelude / Mori; 0.15-0.6), `phone` (hard-driven layer above 180 Hz, 1; 0-2), `click` (0.25), `slide` (legato slide, 0.07 s), `release` (0.03 s gate) | sustains for the written length, then gates. Never alone: layer a tuba or synth bass an octave up. |
| `monoSynthBass` | 31-62 | `scoop` (semitones into each phrase, +1.1 = from ABOVE like Prelude; -1 = from below), `scoopTime` (0.07 s), `glide` (0.035 s), `punch` (filter/level accent, 1.6; 0-3), `retrig` (accent on every slurred note, 2.2 = ~+10 dB falling in 0.15 s, as in Prelude; 0.3 = nearly flat), `octUp` (octave-up saw layer, 0.85: Prelude's strong even harmonics; 0 = a plain saw), `reso` (0.5; 0.4-2), `bright` (1), `tone` ('saw' or 'tuba'), `drift` (x6 c) | gliding mono synth (saw + octave saw, 4-pole low-pass): write ostinatos with `legato: true` (one phrase = one scoop; the rest glides and re-accents). |
| `stab` | 40-88 | `kind` ('brass', 'reed', 'keys'), `decay` (fall after the accent, s: 0.1 brass / 0.08 keys; 0 = a flat held chord), `detune` (brass players, 6 c), `spread`, `attack`, `release`, `bright`; reed: `musette` (14), `wet`, `reeds` | short chord HITS (Schvitz A: ~8 dB down 0.12 s after the peak, darkening from ~1 kHz to ~400 Hz): `stab.chord(b, 0.2, [...], vel, { kind })`. |
| `pluck` | 43-93 | `body` ('mandolin' or 'guitar'), `course` (cents between the paired strings, 3 mandolin / 0 guitar), `double` (1 = a second take panned opposite, 10-22 ms late: very wide; 0 = single), `spread` (0.75), `tremolo` (false; true = a tremolo for the written length), `tone` (with tremolo: 'soft' = Kugel's near-pure pedal, two takes ~10 c apart, narrow; 'pick' = a bright mandolin tremolo with pick strokes), `tremRate` (7.8/s), `sharp` (cents), `decay` (x), `damp` | plucked comping (Shkoyach: bright at the pick, dark within 0.1 s) and the tremolo pedal (Kugel: `tremolo: true, sharp: 25-35`). |
| `glassPad` | 52-100 | `decayDb` (7 dB/s; 5-12), `bloom` (0.8: mostly a ~0.15 s swell, a little strike), `split` (pan by pitch: high left, low right, 0.6; 0-1), `bright`, `damp` | the struck glassy pad of Schvitz: near-pure tones (h2 -30 dB), no vibrato. |
| `boom` | (unpitched, tunable 21-43, default G1) | `drop` (7 st), `dropTime` (0.15), `hold` (plateau, 2 s), `tail` (x), `fifth` (0.7), `gong` (0.5), `spread` (gong width, 1) | trailer boom: impact, ~2 s plateau, then a slow (~10 dB/s) release, ~4.4 s in all; gong layer wide, sub mono. |
| `dropImpact` | (unpitched, target note default G1) | `from` (semitones above the target, 17) | pitch-drop impact over the written length (0.3-0.6 s): a quick first step, then an almost linear fall. |
| `glissRiser` | (unpitched, target note default C5) | `from` (semitones below, 12), `curve` (1.6), `spread` (1: the three voices at -0.7 / 0 / +0.7) | pitched glissando riser into the written end. |

Reference (measured in the Kugel cues) and our result. Audited 2026-11-26 by rendering the same notes on the
reference's own onsets and comparing harmonics, third-octave spectra, envelopes, pitch tracks, stereo and stacked
zoomed spectrograms (reference above, ours below). Where the reference is a dense mix, only the clean measure is listed.

| instrument | reference (cue, time) | reference value | ours |
|---|---|---|---|
| tuba | Schlep 2.4-13 s (solo), Shidduch 2.5-9 s | attack 10-35 ms; body flat; stop 90-180 dB/s; G1: h2 0, h3 -1..-6, h4 -10..-16, h5 -7..-9; 700-3000 Hz band -22..-31 dB under 60-700 Hz (off-beat notes, no jingles); h1-h3 steady within 0.2-0.4 dB, h4+ flicker 1-5 dB | attack 8-23 ms; body flat; stop 109-129 dB/s; G1 vel .8: h2 -1, h3 -2..-5, h4 -7..-8, h5 -12..-16; 700-3000 Hz within 2-4 dB of the reference; h1-h3 within 0.1-1 dB, h4+ 1-4 dB |
| accordion | Shkoyach chorus G5 26-27.6 s | h2 -8 h3 -15 h4 -28 h5 -24 h6 -20 h7 -25; side reeds 17-22 dB under the main reed: beating AM sd 1.9 dB (~35 %) | h2 -7 h3 -17 h4 -35 h5 -24 h6 -26 h7 -33; `wet` 0.25: AM sd 1.8 dB (the first fit had 0.72 side reeds: sd 5.2 dB, a deep wah-wah) |
| whistleLead | Goodbye 31.3-39.3 s | enters -5..-35 c, holds near pitch ~0.5 s, +25..+30 c by ~1 s, creeps to +38..+47 c by 1.5-2 s; h2 -29..-39, h3 -29..-44, h4 -34..-47 | -2..0 c for 0.5 s, +20..+30 by 1 s, +30..+45 by 1.5-2 s; h2 -33, h3 -38, h4 -43 (the reference's wider line skirt is room ambience: as strong in the side channel) |
| thereminLead | Schvitz 60-62.6 s (left) | vibrato ~7-7.5 Hz, 61-75 c peak-to-peak from the first note; centred near pitch (+3 c); h2 -31..-39, h3 -33..-41, h4 -30..-40 | 6.7-7.1 Hz, 58-73 c p-p from the first note; +9..+15 c; h2 -32, h3 -38, h4 -42 |
| tambourine | Schlep 2.4-9 s, every beat | third-octaves re 6.3k: 4k -13, 5k -4, 8k -16, 10k -1, 12.5k -7, 16k -19; a dense fizz between the lines; side/mid -1.7 dB > 5 kHz; centroid 8.5 -> 7.8 kHz | 4k -22, 5k -6, 8k -22, 10k -5, 12.5k -9, 16k -23; sizzle grains between the lines; side/mid -0.6 dB; 7.6 -> 7.1 kHz (the first fit: clean sine lines, 4k -33, 16k -61, side/mid -16 dB) |
| riq | Shkoyach intro 0-8.8 s | dum and tek both broadband, flat within ~7 dB from 80 Hz to 16 kHz; fall -6 -> -26 dB in 88-136 ms; side/mid -7 dB > 5 kHz | within 3-6 dB of the reference from 63 Hz to 16 kHz; fall 88-108 ms; side/mid -11 dB (the first fit: a 196 Hz tone + jingles, 25-50 dB short at 0.4-3 kHz) |
| shaker / hat | Clown C 65.8-71 s (dry shuffle clicks) | rise 12 ms; -19 dB at 50 ms, -30 dB at 100 ms; centroid 8.1 kHz; side/mid -3.6 dB | shaker: rise 12 ms; -21 / -37 dB; 8.2 kHz; -6.8 dB. hat: -22 / -43 dB; 10.8 kHz (the first fits: a rectangular white block at 11.5 kHz; a 7.2 kHz high-pass hat, mono) |
| clap | Schvitz intro 1.94 + 2.01 s | grace clap 75-80 ms early; tail -7/-12/-16/-20/-25 dB at 30/60/90/140/200 ms; centroid 3.4-4.1 kHz; side/mid -2.7 dB > 5 kHz | same flam; tail -6/-9/-13/-17/-21 dB; centroid 3.5-3.9 kHz; side/mid -6.6 dB (the first fit: centroid 1.7-2.7 kHz, mono) |
| kick | Schvitz A 14.2-20 s | onset sweep ~155-175 Hz -> ~46 Hz within ~60 ms (fused with the bass; decay not measurable) | 18 st drop, 50 ms (the first fit started ~93 Hz) |
| dropKick | Prelude 66-78 s | diagonal sweeps ~200 -> ~30 Hz (not trackable under the drone) | ~156 -> 48 Hz in 0.1 s, 32-38 Hz after 0.25 s |
| sub808 | Prelude 14.2 s (D2), Mori 99.4 s | settles -18..-22 c within 50 ms; ~18-20 dB/s; h2 -7..-11 (both cues) | -20 c as set; 17 dB/s; h2 -10, h3 -22 (`bias` 0.4, `drive` 2.4; the first fit had h2 -18) |
| monoSynthBass | Prelude 0.4-2.5 s | strong EVEN harmonics: h2 -2..+3, h3 -16, h4 -5..-12, h5 -22..-25, h6 -11..-24, h7 -36..-42; every note re-accents, ~-13 dB in 0.15 s; up-slides < 30 ms, down 40-60 ms | h2 0..+1, h3 -14..-15, h4 -11..-13, h5 -24..-27, h6 -20..-24, h7 -34..-37; re-accent 0 -> -11 dB in 0.2 s; slides ~40 ms (the first fit: a plain saw, h3 -8, no re-accent) |
| stab | Schvitz A off-beats 13.5-17.5 s | peak at 20-40 ms, -8 dB 0.12 s after it; centroid 1040 -> 600 -> 390 Hz at 5/30/80 ms | brass -3/-5/-7/-9 dB at 40/60/80/100 ms, 850 -> 645 -> 530 Hz; reed chop -2/-4/-5/-6 dB (the first fit: flat held chords, no darkening) |
| pluck | Shkoyach verse 9.5-16 s (A7 / G stabs) | centroid 1.4-1.9 kHz at the pick, ~430 Hz after 0.1 s; 1-2.5 kHz -11..-20 dB re the peak band; L/R correlation 0.42 | 0.75-1.1 kHz at the pick, 420-510 Hz after 0.1 s; -8..-19 dB; correlation 0.46 (the reference's brighter onset is probably percussion on the same beats) |
| pluck tremolo | Kugel 2.2-7.8 s (C5 pedal) | near-pure: h2 -32, h3 -47; nearly mono (correlation 0.93); 12.4 dB p-p irregular movement, beating ~3 Hz; no pick transients | `tone: 'soft'`: h2 -29, h3 -41; correlation 0.92; 12.5 dB p-p (the first fit: a bright mandolin course, h2 -2, pick columns, correlation 0.39) |
| glassPad | Schvitz A 18.2 s (C6 Eb6 G6, left) | 6.7-7.8 dB/s; h2..h4 -27..-37 dB; swells in over ~160 ms | 7.0 dB/s; h2 -30, h3 -30..-39, h4 -41; ~135 ms (the first fit: h2 -14, 30 ms attack) |
| boom | Schvitz 4.28 s | impact, plateau to ~2 s, then ~9 dB/s, still there 3.6 s after the hit; sub wide (corr 0.33) | same plateau, then ~10-13 dB/s to 4.4 s; sub mono on purpose (master target) (the first fit cut off at ~2.4 s) |
| dropImpact | Schvitz 11.74 s | semitones above G1 every 40 ms: 17, 13.4, 12.2, 10.9, 9.7, 8.2, 7.0, 5.8, 4.4; level ~-40 dB/s | 16, 14, 12.1, 10.4, 8.9, 7.6, 6.4, 5.3, 4.1; ~-40 dB/s |
| jingleRoll / glissRiser | Schlep C 23-27 s / Rabbi Nuchem 31-32.4 s | (not clean rolls or risers; stereo only) correlation 0.66 / 0.60 | 0.71 / 0.65 |
| fingerCymbals | (no exposed reference in the 14 cues) | | unchanged |

Render speed (one note, this machine, 2026-11-26 audit): tuba 8 ms per 0.3 s note, accordion 6 ms per 1.2 s,
whistle/theremin 5-8 ms per 1 s, tambourine 12 ms and riq 8 ms per hit, jingleRoll 54 ms per 1 s roll, shaker 1 ms,
kick 2 ms, snare/clap/hat under 1 ms, sub808 5 ms per 0.8 s, monoSynthBass 1 ms, stab 5 ms, pluck 6 ms, glassPad 15 ms
per 2 s, boom 25 ms: every instrument at least 19x realtime.
Checks (2026-11-26): pitch within 0.5 c of the written note with drift off (the drift is intentional: tuba 3 c, accordion
3 c, synth 6 c, whistle 6 c plus its sharpness creep); no harmonic above 19 kHz and every non-harmonic component below -66 dB; no NaN, no DC
(< -200 dB), every note ends at 0; click figures as before the audit; levels re-trimmed after the audit to within
0.7 LU of the levels above; the orchestral instruments render bit-identically with the band loaded.

---

## 5. Mixing advice

Start from these and adjust with the analyzer. Gains in dB, sends 0..1.

| instrument | bus gain | pan | reverb | other |
|---|---|---|---|---|
| feltPiano (lead) | -3 | 0 | 0.25-0.32 | `room: 0.1-0.15` for closeness |
| violins / violins2 | -8 / -9 | -0.3 / -0.1 | 0.40-0.45 | |
| violas | -8 | +0.1 | 0.40 | |
| celli | -7 | +0.25 | 0.35-0.40 | |
| contrabass (bowed, pizz) | -8 | +0.15 | 0.20-0.25 | `eq: [{ type: 'hp', f: 45 }]` |
| soloCello / soloViolin | -5 / -7 | small | 0.35-0.40 | |
| harp | -5 | -0.3 | 0.35 | |
| celesta | -9 | +0.3 | 0.40 | `delay: 0.1-0.2` is lovely |
| glockenspiel | -14 | +0.2 | 0.45 | |
| marimba / vibraphone | -6 / -8 | | 0.25 / 0.35 | |
| warmHorn | -7 | -0.1 | 0.45-0.50 | horns live in the back of the hall |
| flutePad | -9 | +0.2 | 0.45 | |
| choirPad | -9 | 0 | 0.50 | `width: 1.1` |
| subBass | -12 | 0 | 0 | never send sub to the reverb |
| timpani / lowDrum | -8 | 0 | 0.30 | drums have the highest peaks of all: raise them only if the limiter stays quiet |
| heartbeat | -6 | 0 | 0.05-0.10 | |
| cymbalSwell / riser | -10 | 0 | 0.40 | |
| **band** (section 4b) | | | | |
| tuba | -3 to -5 | 0 (mono) | 0 | `room: 0.05-0.1` at most; dry is the style. The bass of every phone mix: write it D2 and up when it carries the line alone |
| sub808 | -6 to -9 | 0 | 0 | always under a tuba / synth bass an octave up (phones). `eq: [{ type: 'hp', f: 28 }]` |
| monoSynthBass | -5 | 0 | 0 | |
| accordion (pad / drone) | -6 to -8 | ±0.2 | 0.10-0.20 | `width: 1.1-1.3` (the musette reeds are panned apart) |
| accordion chop / stab | -8 to -10 | small | 0.05-0.10 | a stab on the off-beat with the clap. The chop opens bright: `eq: [{ type: 'peak', f: 3000, q: 1, gain: -3 }]` for earbuds |
| whistleLead / thereminLead | -5 to -7 | ±0.15, up to hard ±0.8 (Schvitz: hard left) | 0.25-0.35 | `delay: 0.08` at most. Keep held notes under ~1.8 kHz (earbuds) |
| tambourine / riq / jingleRoll | -6 to -9 | ±0.3 | `room: 0.05-0.1` | `eq: [{ type: 'peak', f: 3500, q: 0.8, gain: -5 }]` for earbuds: the jingle sizzle, the 4.6 kHz cluster and the riq slap all sit at 2.5-5 kHz, as in the score (Schlep and Shkoyach themselves fail the 2-5 kHz check). In the band test mix this dip plus the chop dip brought the 2-5 kHz p95 from 5.6 to 2.3 dB |
| shaker | -9 to -12 | ±0.3 | 0 | |
| kick / dropKick | -6 to -9 | 0 | 0 | the highest peaks of the band: start low and watch "limiter max" (a test mix with the kit bus at -4 dB hit 6 dB of limiting) |
| clap / snare | -9 to -11 | 0 | `room: 0.08-0.15` | |
| hat | -10 to -14 | ±0.2 | 0 | |
| pluck (mandolin / guitar) | -7 | 0 (`double` makes it wide) | 0.15-0.25 | tremolo pedal: `sharp: 20-30` for the vintage detune |
| glassPad | -8 | `split` does the panning | 0.25-0.35 | |
| boom / dropImpact | -8 to -10 | 0 | 0.15-0.25 | one per 2 bars at most |
| glissRiser | -10 | 0 | 0.25 | |

- More reverb send = further away. The gentle lead (piano, solo cello) wants less reverb than the pads behind it.
- The piece is heard on a phone speaker: nothing below about 150 Hz is audible there. Double every bass line an octave
  higher (celli over basses, piano left hand not below C2 alone). subBass and lowDrum are only a bonus for earbuds.
- Nothing may be harsh at 2-5 kHz: glockenspiel, high celesta, violins above C6 at ff and cymbalSwell are the
  candidates. Lower their velocity first (it darkens them), then their gain. `bright: 0.7` also helps.
- Low intervals: no thirds or seconds below C3.
- Dynamics come from velocity and `expr`, not from bus gain: a soft velocity is a different (darker) sound.
- A swell into a section: `cymbalSwell` + `stringsTremolo` with `expr: 'cresc'` + timpani `roll` + bus `automate('lowpass', ...)`.
- The master limiter is transparent up to about 4 dB of reduction (the render log prints "limiter max"). If a
  climax needs more, lower the loud buses instead of leaning on the limiter.

---

## 6. Loop rendering

With `loop: true` the engine renders the body (0 to `s.length()`) plus a tail (6 s or more) and adds the tail onto the start
of the body. So the reverb and the ringing notes of the last bar continue under the first bar, and the file wraps
without a click or a level jump. The master chain (filters, compressor, limiter) is warmed up on the end of the loop
before it processes the start, so its state is identical on both sides of the wrap.

- The whole time axis of a looping track is stretched by a few parts in 100,000 (at most 512 samples over the
  piece) so that its length is a whole number of AAC frames (1024 samples). Then the m4a decodes to exactly the
  same number of samples as the WAV, with no encoder padding at the end, and the loop point stays sample exact.
  `durationSec` in the score JSON is the stretched length. `s.sec()` called inside `build()` does not include the
  stretch (the difference is below 12 ms).
- Write the music so that the last bar leads into the first bar (same key, the bass moves to the first chord).
- A note humanised to slightly before beat 0, or a `reverse()` that starts before beat 0, wraps to the end of the file.
- Do not start a long loud swell in the last bar unless bar 1 continues it.
- Partial renders (`--from/--to`) are not looped.

## 7. Master chain

High-pass 30 Hz, stereo width, loudness normalisation, glue compressor (default threshold -15 dB, ratio 1.6, soft knee),
master EQ, optional saturation, normalisation to the target, look-ahead true-peak limiter (4x oversampled detection,
5 ms look-ahead), loudness corrected after limiting, TPDF dither to 16 bit.

The default ceiling is -1.8 dBTP because AAC encoding adds inter-sample peaks: on the demo the decoded m4a peaked
0.3 to 0.45 dB above the WAV. With -1.8 the m4a stays below the -1 dBTP target. Check it with `--m4a`.

The limiter is transparent for short peaks up to about 4 dB. The render log reports its largest reduction with the
time it happens, and how long it holds more than 2 dB; a hint appears when that is more than 2 % of the piece.
Peaks come from drums, low piano chords and loud harp/pizzicato; the cure is a lower bus gain or velocity there,
not a lower loudness target.

```js
s.master({
  lufs: -16,            // integrated loudness target (BS.1770 gated)
  ceiling: -1.8,        // limiter ceiling in dBTP (the m4a ends below -1 dBTP)
  eq: [{ type: 'peak', f: 3200, q: 1, gain: -1.5 }],
  glue: { threshold: -15, ratio: 1.6, attack: 0.03, release: 0.3, knee: 10 },   // or false
  width: 1, sat: 0, hp: 30,
  tail: 8,              // seconds of tail rendered after the last bar (default: max(6, rt60 * 1.2 + 2))
});
```

## 8. Score JSON

Written next to the WAV, read by `analyze.mjs`:

```json
{ "id": "...", "title": "...", "bpm": 66, "durationSec": 180.0, "loop": true,
  "sections": [ { "name": "A", "t0": 0, "t1": 29.09, "mood": "gentle" } ],
  "beatsPerBar": 4, "bars": [0, 3.636, 7.273],
  "notes": [ { "inst": "feltPiano", "t": 0.0041, "dur": 0.909, "midi": 50, "vel": 0.352, "tag": "tension" } ] }
```

`bars` (start of every bar in seconds) lets the analyzer's bar-based checks follow meter and tempo changes.
A note humanised to before 0 has a slightly negative `t`; in a loop it sounds at the end of the file.

Every note of every instrument is recorded automatically, in absolute seconds after the tempo map and the
humanisation. `inst` is the instrument name, plus `:section` for strings (`stringsEnsemble:celli`), or the part's
`name`. Unpitched instruments get `"tag": "unpitched"` (`heartbeat` is recorded as `heartbeatPerc`).

## 9. How it sounds like it does

- Sustained instruments: band-limited wavetables built per pitch band by additive synthesis (no aliasing: measured
  below -110 dB at C7), several players per note with individual detune, onset (8-40 ms), pitch scoop, irregular
  delayed vibrato (two slow sines plus value noise on rate and depth, plus fast stick-slip pitch jitter), drift and level
  wobble, a dynamic low-pass driven by velocity times expression, bow/breath noise, then fixed body resonances applied
  once per layer. Bowed strings add per player: a finite slip time (running mean over a bow-point fraction of the period,
  so spectral notches move with the bow point and the dynamic), a one-pole bow-pressure shelf that wanders slowly in
  brightness, and bow changes (a 90 ms dip, a brighter restart and a burst of bow noise) when the bow runs out. The solo
  strings add bow noise pulsed at every period. The horn crossfades from a dark to a brassy wavetable with the dynamic.
- Legato chains (`legato: true` on the six chain instruments): `Session._renderChains` joins touching notes and
  `renderSustained` plays the segments as one sound per player; each player has his own list of transitions
  (slide 30-120 ms with a late-moving portamento curve, a sin² dip of level and brightness, vibrato narrowed during the
  slide and regrowing after it, bow changes and re-articulations). Expression, velocity, brightness and level follow
  the segments, smoothed over 30 ms.
- Choir: two groups of singers, each through its own time-varying formant filter (formants scaled 0.97 / 1.03), the
  vowel moving slowly towards its neighbour over a long note.
- Measured against the previous engine (2026-11-21): mallets and harp went from identical strokes (0.00-0.06 dB spectral
  difference between strokes) to 1.4-3.4 dB; solo vibrato cycle-to-cycle variation 4 % rate / 15 % depth before,
  5-7 % / 18-34 % now; solo violin harmonic-to-noise about 27 dB at 1-2 kHz (was about 38, real violins 20-30).
- Struck and plucked instruments: banks of decaying sine resonators (modal synthesis) with inharmonicity,
  frequency-dependent decay and beating string pairs. Velocity sets the level and the hardness of the excitation
  (upper partials, contact click).
- Reverb: FFT convolution with a synthesized impulse response (decorrelated stereo noise in 16 half-octave bands,
  each with its own decay time, early reflections, pre-delay). Measured: RT60 at 500 Hz to 1 kHz within 10 % of the
  preset, longer in the bass and shorter in the treble as in a real hall, no periodic flutter in the tail
  (autocorrelation below 0.08 for lags of 3-150 ms), L/R correlation below 0.05, nothing below 150 Hz in the tail
  (-23 dB). A send of 1 gives a reverb as loud as the dry sound on music-like (pink) material.

## 10. Known limits and tips (read before writing a cue)

The band (`lib/band.mjs`, 2026-11-26), fitted by measurement, not heard:

- Every band instrument was fitted to measurements of the Kugel cues (section 4b), not by listening. Spectra, envelopes,
  pitch behaviour and stereo match the references within a few dB / cents; the "feel" (how a tuba player breathes
  between notes, how a whistler phrases) is a rule set, not a performance. Judge on a phone and on earbuds.
- tuba: one generic lip glide for every interval; no breaths between phrases; very fast legato runs (16ths at 120+)
  blur. Keep it at D1-G3. A G1 tuba loses ~9 LU through a phone's 150 Hz high-pass (6.8 LU at E2): a line that must
  read on phones belongs at D2 and up.
- accordion: a fixed reed spectrum per register (bass reeds ~0.21 open fraction, treble ~0.25); no bellows-reversal
  articulation, no key/air noise, no register switch inside a note. The musette beating is regular (fixed cents per reed).
  The low reeds were not refitted: the Clown G2 drone shares its band with other chord tones.
- whistleLead / thereminLead: `legato: true` is what makes them glide; separate notes re-scoop each time. The fall-off
  comes at the end of every chain (a rest = a new phrase). The whistle's breath is a constant-colour band, not real air;
  its sharpness creep restarts with every chain, so long held whistle notes end up 35-40 c sharp (Goodbye does the same).
- jingles: 8 measured clusters + 2 random modes per jingle, each jingle excited once, plus a cloud of collision grains
  (the sizzle). A tambourine on every 8th at -6 dB bus fails the analyzer's 2-5 kHz harshness check: dip 3.5 kHz on that bus.
- sub808: `phone` (default 1) adds a hard-driven copy above 180 Hz; even so an E1 808 alone loses ~12 LU through a
  150 Hz high-pass (an E1 808 + E2 tuba: 6.9 LU). The 808 is never the only bass.
- kick: the `click` and the saturation are its only phone-audible parts. `dropKick` is a sound-design hit, not a groove kick.
- pluck tremolo: `tone: 'soft'` (default) is a near-sine pedal shaped by soft strokes; `tone: 'pick'` is alternating
  mandolin strokes at a fixed rate (+-8 % jitter), each stopping the previous one. No fret noise, no string choice.
- stab: `kind: 'brass'` is two players of the tuba model (not a trumpet section); `'keys'` is a drawbar organ without
  leakage or rotary. Stabs are hits that decay; pass `decay: 0` for a held organ chord. Their tail ends in a gate.
- boom: fixed inharmonic gong ratios (2.47-9.2 x the root, from Schvitz); the sub stays mono, only the gong is wide.
- tapeStop works on a whole bus: put what must stop on its own bus.
- Not built: clarinet (the style bible says not to lead with it), a violin lead (use `soloViolin`), cimbalom,
  frame-drum grooves beyond the riq, sidechain pumping (use `bus.automate('gain', ...)` on the quarter).

Orchestral engine:

Nobody has listened to these sounds yet: they were tuned and checked by measurement (pitch, spectra, levels,
envelopes, clicks), not by ear. Judge every render by listening on a phone speaker and on earbuds.

Timbre rebuild of 2026-11-21 (true legato, section realism, new solo strings, round robin, moving choir vowels):

- Loudness per register was calibrated against the previous engine (`TRIMS`); in the three finished tracks every
  section stayed within 0.7 LU and most buses within 1 LU. Legato lines can still move by up to about 1.8 LU on one bus
  in one section, because a chain has no re-attacks (louder) and the new solo bodies resonate on different notes.
  The bus EQs in `clockwork` (soloCello notch at 885 Hz, soloViolin -3 dB at 3.3 kHz) were tuned to the old
  instruments' resonances; re-check them by ear.
- Still synthetic: wavetable sources (no physical string or air column), one generic legato shift for every interval
  (no fingering choice, no string crossing, no open strings), no detache or spiccato, no breaths, choir without
  consonants, and fixed body filters (the radiation does not change with direction or with the player's position).

General:

- Bowed, horn and flute lines written with `legato: true` are true slurs (one continuous sound, a slide and a small dip
  per note change, bow changes). Without `legato` every note is a new bow stroke with a full attack; there is still no
  real detache, spiccato or tonguing, so fast repeated notes on a sustained instrument still sound re-triggered.
  Write sustained parts long and `legato`; give rhythm to piano, harp, pizzicato, marimba, celesta and timpani.
- No breaths: a very long horn or flute chain never breathes. Break it (a rest) where a player would breathe.
- The legato slide is the same kind of shift for every interval (no choice of fingering, no audible string crossing).
- Velocity is timbre: a pp note is darker, not only quieter. Shape phrases with `vel`, `expr` and `shape`,
  not with bus gain.
- The phone speaker hears nothing below 150 Hz: every bass line needs an octave above it (celli over basses,
  piano left hand in octaves). `subBass` and `lowDrum` are a bonus for earbuds only.
- Harshness (2-5 kHz) comes from: glockenspiel, celesta above C7, violins above C6 at ff, `warmHorn` ff in its top
  octave, `cymbalSwell` and a loud `riser`. Lower their velocity first.
- No close intervals below C3; no minor seconds held for long unless tagged `tension` and resolved.
- Peaks: drums, low piano chords at f and loud harp chords hit the limiter. Watch the `HINT:` lines.

| instrument | does well | safe register | avoid |
|---|---|---|---|
| `stringsEnsemble` violins / violins2 | long swells, sustained chords, soaring octave lines with `legato`, `sordino` for a veiled pp | G3-C7 (55-96) | fast runs, repeated quavers, ff above C7 (thin and bright) |
| `stringsEnsemble` violas | inner harmony, warm middle | C3-E6 (48-88) | melody alone above A5 |
| `stringsEnsemble` celli | bass line an octave above the basses, lyrical tenor lines | C2-A5 (36-81) | thirds below C3 |
| `contrabass` / basses | the floor under celli; long notes | E1-G3 (28-55) | alone (the phone loses it), fast notes |
| `stringsTremolo` | tension beds, `expr: 'cresc'` builds, clusters tagged `tension` | as the section | long exposed pp (it is busy), more than about 8 bars at a time |
| `stringsPizzicato` / `contrabassPizz` | ostinatos, playful or nervous pulses, walking bass | the register of the chosen `section` | the violins section below G3 (the body filter swallows the fundamental) |
| `soloViolin` | expressive legato phrases, sighs, slides with `legato` | G3-E6 (55-88) | above E6 at ff, long exposed notes without vibrato, fast passages (no spiccato) |
| `soloCello` | the main lyrical lead voice, long lines with slides | C2-A4 (36-69), up to A5 | very fast notes; notes shorter than about 0.25 s |
| `feltPiano` | intimate lead, arpeggios, motifs, chords with `pedal()` | C2-C7 (36-96) | ff low chords (mud, limiter), very long pedal over changing harmony |
| `harp` | arpeggios, glissando-like runs (`arp` with small steps), strummed chords | G1-E7 (31-100) | loud low chords (boomy) |
| `celesta` | magic, music-box motifs, doubling the melody an octave up | C4-C7 (60-96) | above C7 loud (harsh), dense chords |
| `glockenspiel` | single sparkle notes on top of a melody | G5-C8 (79-108) | anything loud; more than a few notes per bar |
| `marimba` | soft ostinatos, warm pulse, rolls | C2-C6 (36-84) | high register at ff (clicky) |
| `vibraphone` | jazzy or dreamy chords with `motor`, long ring | F3-F6 (53-89) | fast passages (it rings over them; use `damp: true`) |
| `warmHorn` | noble pads, slow chorales, a swell into a climax (mf to ff gets brassy) | Bb1-F5 (34-77) | fast notes, staccato, ff in the top octave for long |
| `flutePad` | airy high lines, gentle counter-melodies | G4-C7 (67-96) | low notes loud (a flute is weak low), rhythmic figures |
| `choirPad` | distant pads, `ooh` behind the strings, `mm` for a hum | C3-C5 (48-72) | exposed melody, aah at f (no consonants, no words; the vowel only drifts slowly) |
| `subBass` | sub weight under drums and climaxes, earbuds only | C1-G3 (24-55) | reverb send; the only bass line |
| `timpani` | pulses, rolls into a downbeat (`roll`), the root of a cadence | C2-C4 (36-60) | many loud strokes (limiter) |
| `lowDrum` | big film hits on downbeats, slow ostinato | (unpitched, tunable 24-43) | busy patterns; it is mostly below 150 Hz |
| `heartbeat` | suspense under a quiet texture | default | loud (it is a pulse, not a drum) |
| `cymbalSwell` | the swell into a downbeat (end exactly on it) | - | exposed, or loud with bright strings |
| `riser` | the last 1-2 bars before a hit, quiet | - | long risers (thin when exposed), vel above 0.7 |
| `p.reverse()` | a swell sucked into a downbeat (piano, harp, celesta, strings) | - | long reverses of struck low notes (they rumble) |

