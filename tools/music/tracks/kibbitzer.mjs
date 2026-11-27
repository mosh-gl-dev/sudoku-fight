// tools/music/tracks/kibbitzer.mjs
// "Kibbitzer": the main in-game loop, in the style of the Kugel score (STYLE.md concept A, section 4.2).
// node tools/music/render.mjs kibbitzer
//
// A sly, deadpan mid-tempo groove: 100 BPM, 4/4, straight 8ths, a lightly swung 16th shaker. B minor (harmonic:
// B C# D E F# G A#), so the dominant is F# Freygish (F# G A# B C# D E). 74 bars = 2:57.6, the whole file loops.
//
// Revision 4 (gate round 3): ONE motto. The CALL (rhythm: a quarter rest, three falling 8ths, a long note tied over the
// beat) and its mirror, the ANSWER, carry every lead phrase: the CALL in minor (9), its answer over G -> F#7 (15), the
// CALL third-swapped in B (22, 24), in A' as a pickup with the tail turned up into the Neapolitan (48/4&), the answer on
// the accordion (53), the KIBBITZ = the CALL in diminution (61), the CALL developed over G (63) and the PEAK (71).
// Revision 5 (gate round 4): the pizz riff no longer traces Mori's pickup (now B1 D2 F#2 C2 B1: +3 +4 -6 -1); the C
// lament left the bass (no i - i/maj7 - i7 - IV6 line cliche) and runs as an inner voice on the tremolo mandolin over a
// B riff; B has a real cadence (29 B | 30 A | 31 G | 32 F#7) so the F# pedal at 37 arrives; the plateau got a developed
// CALL with a counter-line and a real peak (E6); the 70/4 breath keeps the bed; the tuba is back in its own octave
// (G1-G2) with a leaning oom; the breakdown floor is raised; fewer b6 -> 5 sighs on the same two pitches.
// Revision 6 (gate round 5, polish): the plateau no longer stalls in 69-70 (an accordion link climbs C#5 -> A5 -> G5
// into the PEAK, the marimba ticks again); the breakdown's tremolo pedal is F#3, so the accordion's G4 / E#4 rub it as a
// b9 / maj7, not as a same-octave minor 2nd; the peak is lower and less sharp (its own whistle take); the second
// B-A-G-F# descent became the chromatic lament B | E/G# | G | F#7 (29-32); 54 is Em6 (iv), not another Bm; the KIBBITZ
// is a real diminution (16ths); the developed CALL starts on 1& (its 4-3 lands inside bar 63); fewer celesta comments,
// fewer upward tritones; the chop moved into the left-hand (stradella) register; one shared ensemble drift with role
// offsets instead of white jitter only; the pizz double is a second player (quarters only, its own timing).
// Revision 7 (final fix round): the breakdown pedal is back in the mandolin's range (F#4, a player's tremolo in two
// phrases with moving rate and swells) and the accordion is re-voiced so every neighbour rubs it from another octave
// (G3 = maj7 below, G5 = b9 above; 43 voiced like 39); 14 is Bm(maj7)/A# (the A cycle deflects once more); three b6 -> 5
// sighs became other endings (16 D5 -> E5, 54 -> E5, 60 the D5 held); 30 the G# arrives with the whistle's G#5; 63 has
// no B under the C6 suspension; 69/4 F#1 -> G1 under the link (no octaves); the B-major CALL (24) is on the celesta;
// a lighter turnaround bell figure; tighter second bassist; the jingle lines and the shaker's air are back.
//
// ---------------------------------------------------------------------------------------------------------------
// MOTIFS (all our own; checked against the hook table of STYLE.md section 3: no 4 shared consecutive intervals)
//   TICK (marimba, 1 bar of 8ths)  F#4 F#4 G4 F#4 | E#4 F#4 F#4 .     the fifth circled by b6 and its leading tone
//        (D1). Lighter cells every other bar: LOW (F#4 F#4 E#4 F#4 . F#4 F#4 .) or REP (plain repeated notes). The
//        accent moves once in a while, phrase ends are ghosted. Over F#7 / Em6 / G the lower neighbour is E (E# only
//        over Bm and the F# pedal, where it is a true leading tone). Over E/B:
//        G#4 G#4 A4 G#4 | F#4 G#4 G#4. Over B major the FLICKER D#5 D#5 E5 D#5 | D5 D#5 D#5 (D8); over E . Em the SWAP
//        G#4 G#4 A4 G#4 | G4 G4 F#4 G4 (D10). Over G the PIVOT: G4 G4 A4 G4 | F#4 G4 G4 (D7); in C the G4 stays the
//        pedal through Em6 (3rd) and F#7b9 (b9) before it falls to the F#4 TICK in 67. The ticker rests in a third
//        of the bars (13-14, 17-18, most of B, 38, 42, 45-46, 57-58, 69-70); bar 6 is plain repeated notes.
//   RIFF (pizz bass, staccato)  Bm: B1 D2 F#2-C2 B1 (+3 +4 -6 -1: the fifth drops a tritone onto the b2 needle, D1/D2);
//        BmC (under the leads): B1 F#2 B1-D2 F#2;  Bm2: B1-B1 F#2 D2-B1 A1;  G: G1 D2 B1-A1 G1 -> F#1 (D2);
//        F#7: F#1 C#2 E2-C#2 A#1 -> B1 (leading tone at every cycle seam, D4); Em6/G: G1 E2 C#2-B1 G1 -> F#1.
//   TUBA (its own part, a player, G1-G2): oom on 1 (leaning) and the fifth on 3 (up, or down to F#1 in BmC / Bm2), the
//        seam A#1 on 4 of F#7 bars, 0.34 s marcato; out in 11 and 47-50; an octave up only in B (light) and over the 808.
//   CALL (whistle)    _ E5 D5 C#5 ^G5~ | ~ F#5 (8th rest) E5 D5 C#5     a stepwise fall, a TRITONE leap onto the b6
//        tied over the beat, the b6 -> 5 sigh late, a deadpan 8th rest, the fall again (-2 -1 +6 -1 -2 -2 -1).
//   ANSWER (the mirror) _ G5 F#5 E5 C#5~ | ~ D5 C#5      it starts on the CALL's peak note and falls; over G the held
//        C#5 is a #11 that the harmony resolves (G -> F#7), then the D5 -> C#5 sigh (b6 -> 5, D3). -1 -2 -3 +1 -1.
//   Third-swapped CALLs in B: 22 _ E5 D5 C#5 ^A5~ | G#5 (A/B -> E/B: the 4-3 sigh); 24 _ E5 D#5 C#5 ^G5~ | F#5
//        (the CALL in B major, its b6 kept: B Freygish colour, D10).
//   SNEER (whistle, 19-20, over Em6/G | F#7b9)  _ D5 G5. A#5 B5 A#5 | G5. F#5~ : the cue's one sung augmented second.
//   SIGH (theremin, breakdown)  G5 | F#5. E#5~ | F#5 (double encirclement of the pedal), then D5 -> C#5 (b6 -> 5).
//   KIBBITZ (accordion musette, C)  the CALL's fall in diminution (16ths, a step higher), the leap a 4th, not a tritone:
//        _ F#5 E5 D5 C#5 (16ths) D5 ^G5 F#5 E5 | D5 B4 A#4 C#5 D5 (open), answered closed in 67-68 (F#5 F#5 D5 E5 G5 E5
//        F#5 | C#5 B4 A#4 B4 F#5 D5 B4: the tonic encircled).
//   LINK (accordion, 69-70, Bm/A -> G)  _ C#5 D5 E5 F#5 A5 | G5. F#5 G5~ : the KIBBITZ answer pushed up a step at a
//        time; the G5 held through the 70/4 breath is taken up by the PEAK's B5 C#6 E6.
//   CALL DEVELOPED (whistle, 63-65, over G -> Em6)  from 1&: B5 A5 F#5 ^C6 B5~ (the tritone leap onto a 4-3 suspension
//        that resolves inside the bar, the pad's 3rd entering with it), up to D6, held as the 7th of Em6 and sighing to
//        C#6 (7 -> 6); under it a soft accordion counter-line D5 E5 | E5 D5 B4.
//   PEAK (whistle, 71-72, Em6 -> F#7b9)  _ B5 C#6 E6~ | ~ D6 C#6 A#5: up the chord to the cue's top note, held into
//        F#7b9 as its 7th, then b13 -> 5 -> 3; the A#5 is taken home by the bells and the turnaround's C6 -> A#5 -> B5.
//   CONTRARY APPROACHES (C, 8th triplets): 66/4 bass E2 D2 C#2 -> B1 under bells A#5 B5 C#6 -> D6;
//        72/4 bass F#1 A#1 B1 -> C2 (the F#7 arpeggio leaning into the bII) under bells E6 D#6 D6 -> C6.
//
// FORM AND HARMONIC PLAN (bar: chord; time at 100 BPM, a bar = 2.4 s)
//   Intro 1-4     0:00.0  Bm Bm G F#7. C thinning out across the wrap: kick and clap/chop pahs fade out in 1-2, the
//                         shaker falls 0.5 -> 0.34, the tambourine goes from 8ths to quarters; a celesta B5 on 1/1
//                         resolves the turnaround's C6 -> A#5.
//   A    5-20     0:09.6  [Bm | Bm | G | F#7] x3, then 17 Bm | 18 Bm/A | 19 Em6/G | 20 F#7b9 (bass B A G F#).
//                         the groove alone 5-8, CALL 9-10, celesta answer 11, accordion sforzando 12/4&, ANSWER 15-16, SNEER 19-20,
//                         20/4 a one-beat breath. Rests 12-14 and 17-18 (bed only). Shaker and tambourine quarters.
//   B   21-36     0:48.0  THE LIFT: 21-28 and 33-36 over a B PEDAL (B | A/B | E/B | B, E . Em/B in 27 and 35: D10);
//                         29-32 REAL ROOTS: B | E/G# | G (bVI, D natural back) | F#7, the bass a chromatic lament B G# G F#
//                         (D5) under the whistle's A5 -> G#5 sigh (the 22-23 sigh again, now over a moving bass). Third swap D -> D# (D8),
//                         shaker 16ths, celesta calls / whistle CALLs (21-25), the 3-bar line 29-31, the swap 35-36, the
//                         reverse swap D#6 -> D6 -> C#6 in the celesta at 36/4 into the F# pedal.
//   Brk 37-44     1:26.4  F# FREYGISH PEDAL, half time, 5+3 bars: 37 F# | 38 G/F# | 39 C#7/F# | 40 F# | 41 Bm/F# ||
//                         42 G/F# | 43 C#7/F# | 44 F#7b9 (breath on 44/4). Drop kick, riq, tremolo pedal, accordion
//                         G -> F# and E# -> F# sighs, theremin SIGH. The thinnest terrace.
//   A'  45-60     1:45.6  oom-pah kit, tambourine 8ths. 45 Bm | 46 Bm | 47 G | 48 F#7 | 49 Bm | 50 Bm | 51 C (the
//                         Neapolitan flashes under the whistle's held E5) | 52 F#7 | 53 Bm | 54 Em6 (iv) | 55 G | 56 F#7 |
//                         57 Bm | 58 Bm | 59 Em6 | 60 F#7b9. Mandolin ticks 47-52, marimba 53-56 (55-56 an octave up),
//                         59-60. Celesta 47-48, whistle 48/4&-51, accordion ANSWER 53-54, whistle 59-60.
//   C   61-72     2:24.0  TENSION PLATEAU, two 6-bar phrases, the 808 enters (18 c flat). 61 Bm | 62 Bm | 63 G | 64 G |
//                         65 Em6 | 66 F#7b9 | 67 Bm | 68 Bm(maj7) | 69 Bm7 | 70 G | 71 Em6 | 72 F#7b9.
//                         D5 as an inner voice on the tremolo mandolin: B4 A#4 A4 G4 . G4 -> F#4, the bass on its B riff
//                         in 67-69, then G1 E2 C#2 F#1. KIBBITZ 61-62 / 67-68, CALL developed 63-65, LINK 69-70 (the
//                         marimba back under it), PEAK 71-72; on 70/4 the drums and plucks breathe while the link's G5,
//                         the tremolo line and the 808 hold.
//   Turn 73-74    2:52.8  NEAPOLITAN: 73 C | 74 F#7 (played through: no stop before the wrap). Celesta C6 / E6 D6 C6 |
//                         A#5 -> (bar 1) B5; bass C#2 A#1 -> B1 (D4, D9).
//
// SEMITONE DEVICES: D1 (tick, riff needle, encirclements, C6 peak), D2 (G -> F# bass, C2 -> B1), D3 (b6 sighs D -> C#,
//   G -> F#, A -> G#, D6 -> C#6 over Em6), D4 (A#1 -> B1 seams), D5 (C inner line), D6 (two contrary approaches), D7 (pivot pedal; the held E5
//   over Bm -> C), D8 (third swap, flicker, reverse swap), D9 (Neapolitan, C6 -> A#5 -> B5), D10 (E -> Em, G/B, the
//   B-major CALL with G natural), D12 (whistle scoops, +13 c, fall-offs).
// ---------------------------------------------------------------------------------------------------------------

import { swingGroove } from '../engine.mjs';

const BAR_COUNT = 74;

// accordion right hand (pad / chop), mandolin "pah" voicings, bass riffs (pizz)
const PAD = {
  Bm: ['D4', 'F#4', 'B4'], Bm5: ['B3', 'F#4', 'B4'], G: ['D4', 'G4', 'B4'], F7: ['C#4', 'E4', 'A#4'], F7b9: ['C#4', 'E4', 'G4', 'A#4'],
  Em6: ['C#4', 'E4', 'G4'], C: ['C4', 'E4', 'G4'], BmA: ['D4', 'F#4', 'A4'], BmAs: ['D4', 'F#4', 'B4'],
  B: ['B3', 'D#4', 'F#4'], AB: ['A3', 'C#4', 'E4'], E: ['B3', 'E4', 'G#4'], Em: ['B3', 'E4', 'G4'], GB: ['B3', 'D4', 'G4'],
  F: ['C#4', 'F#4', 'A#4'], GF: ['B3', 'D4', 'G4'], Cs7F: ['B3', 'E#4', 'C#5'], BmM7: ['D4', 'F#4', 'A#4'],
  BmF: ['B3', 'D4', 'F#4'], Gs: ['B3', 'E4', 'G#4'], F74: ['A#3', 'C#4', 'E4', 'F#4'],
};
const PAH = {
  B: ['F#4', 'B4', 'D#5'], AB: ['E4', 'A4', 'C#5'], E: ['G#4', 'B4', 'E5'], Em: ['G4', 'B4', 'E5'], GB: ['G4', 'B4', 'D5'],
  F7: ['A#4', 'C#5', 'E5'], F7b9: ['G4', 'A#4', 'E5'],
  Bm: ['F#4', 'B4', 'D5'], G: ['G4', 'B4', 'D5'], Em6: ['G4', 'C#5', 'E5'], C: ['G4', 'C5', 'E5'],
  BmA: ['F#4', 'A4', 'D5'], A: ['E4', 'A4', 'C#5'], BmM7: ['F#4', 'A#4', 'D5'],
};
const RIFF = {
  Bm: "B1:q' D2:q' F#2:e' C2:e' B1:q'",                    // up the triad, the fifth drops a tritone onto the b2 needle C2 -> B1 (D1 / D2)
  BmC: "B1:q' F#2:q' B1:e' D2:e' F#2:q'",                  // under the CALL / ANSWER: no C2 against the lead's C#5
  Bm2: "B1:e' B1:e' F#2:q' D2:e' B1:e' A1:q'",
  BmN: "B1:e' B1:e' F#2:q' D2:e' C#2:e' B1:q'",            // into the Neapolitan (B1 -> C2)
  G: "G1:q' D2:q' B1:e' A1:e' G1:q'",
  G2: "G1:q' D2:e' G1:e' B1:e' A1:e' G1:q'",
  G3: "G1:q' D2:e' G1:e' D2:e' A1:e' G1:q'",               // 63: no B under the C6 suspension (the 3rd comes with its resolution)
  Bm2F: "B1:e' B1:e' F#2:q' D2:e' B1:e' F#1:q'",           // 69: F#1 -> G1 against the LINK's A5 -> G5 (contrary, no octaves)
  EmG: "G1:q' E2:q' C#2:e' B1:e' G1:q'",                   // Em6/G: no A natural under the SNEER
  F7: "F#1:q' C#2:q' E2:e' C#2:e' A#1:q'",
  F7C: "C#2:q' F#1:q' E2:e' C#2:e' A#1:q'",                // 72: from the fifth, so the lament stops at G (4 steps)
  Em6: "E2:q' B1:q' C#2:e' B1:e' G1:q'",
  BmAs: "A#1:q' F#2:q' D2:e' A#1:e' F#2:q'",
  BmA: "A1:q' D2:q' B1:e' F#2:e' A1:q'",                   // no D-A-F# triad cycle (Prelude's ostinato)
  Gs: "G#1:q' E2:q' B1:e' G#1:e' E2:q'",
  C: "C2:q' G2:e' C2:e' E2:q' G1:q'",
};
// the tuba is a player, not an octave doubling: oom on 1 and 3 (+12), the seam note on 4 of the F#7 bars
const TUBA = {
  Bm: "B1:q@.62 _:q F#2:q@.5 _:q", BmC: "B1:q@.62 _:q F#1:q@.5 _:q", Bm2: "B1:q@.62 _:q F#1:q@.5 _:q", BmN: "B1:q@.62 _:q F#2:q@.5 _:q",
  G: "G1:q@.62 _:q D2:q@.5 _:q", G2: "G1:q@.62 _:q D2:q@.5 _:q", G3: "G1:q@.62 _:q D2:q@.5 _:q", Bm2F: "B1:q@.62 _:q F#1:q@.5 _:q", EmG: "G1:q@.62 _:q E2:q@.5 _:q",
  F7: "F#1:q@.62 _:q C#2:q@.5 A#1:q@.48", F7C: "C#2:q@.6 _:q F#1:q@.52 _:q", Em6: "E2:q@.62 _:q B1:q@.5 _:q", BmAs: "A#1:q@.6 _:q F#2:q@.5 _:q",
  BmA: "A1:q@.6 _:q F#2:q@.5 _:q", Gs: "G#1:q@.6 _:q E2:q@.5 _:q", C: "C2:q@.62 _:q E2:q@.5 G1:q@.48",
};
const ROOT = { Bm: 'B1', BmC: 'B1', Bm2: 'B1', BmN: 'B1', G: 'G1', G2: 'G1', G3: 'G1', Bm2F: 'B1', EmG: 'G1', F7: 'F#1', F7C: 'F#1', Em6: 'E2', BmAs: 'A#1', BmA: 'A1', Gs: 'G#1', C: 'C2' };
// the chord each riff key stands for (pads, pahs, chops, tick choice)
const CHORD = { Bm: 'Bm', BmC: 'Bm', Bm2: 'Bm', BmN: 'Bm', G: 'G', G2: 'G', G3: 'G', Bm2F: 'Bm', EmG: 'Em6', F7: 'F7', F7C: 'F7', Em6: 'Em6', BmAs: 'BmM7', BmA: 'BmA', Gs: 'E', C: 'C' };

export default {
  id: 'kibbitzer',
  title: 'Kibbitzer',
  bpm: 100,
  loop: true,

  build(s) {
    s.meter(4, 4);
    // dry and close (STYLE 1.8 / 4.5): a short plate for the leads, almost nothing on bass and percussion
    s.reverb({ rt60: 0.7, predelay: 0.01, damping: 0.5, early: 0.35, wet: 1 });
    s.room('room');
    s.delay({ beats: 0.75, feedback: 0.13, damp: 3200, pingpong: true, toReverb: 0.15 });
    s.master({
      lufs: -16, ceiling: -2.2,
      eq: [
        { type: 'peak', f: 420, q: 0.8, gain: -2.5 },
        { type: 'peak', f: 3200, q: 0.8, gain: 4 },
        { type: 'peak', f: 4300, q: 1, gain: 1.5 },
        { type: 'lowshelf', f: 110, q: 0.7, gain: -2 },
        { type: 'highshelf', f: 9000, q: 0.7, gain: 0 },
      ],
      glue: { threshold: -16, ratio: 1.5, attack: 0.008, release: 0.2, knee: 8 },
      width: 1.2,                                  // the low end is centred at the source; this opens the plucks and pads
    });
    // the random part of the timing is small: the feel comes from one shared ensemble drift and the role offsets below
    s.humanize = { time: 0.006, vel: 0.05 };
    const B = (bar, beat = 1) => s.bar(bar, beat);
    const LOCK = { time: 0.004, vel: 0.05 };          // the bass pair is played tight
    // ONE band: a seeded, smooth +-4 ms push/pull over 2-bar phrases, shared by every player (cyclic over the loop)
    const ensR = s.rng('ensemble');
    const NODES = (BAR_COUNT * 4) / 8;                 // a node every 2 bars: 37
    const dn = Array.from({ length: NODES }, () => (ensR() * 2 - 1) * 0.004);
    const drift = (beat) => {
      const x = beat / 8, i = Math.floor(x), f = x - i, w = (1 - Math.cos(Math.PI * f)) / 2;
      const a = dn[((i % NODES) + NODES) % NODES], b = dn[(((i + 1) % NODES) + NODES) % NODES];
      return a + (b - a) * w;
    };
    // the pocket: each role sits at its own place against the beat (seconds; + = laid back)
    const feel = (part, role = 0) => {
      const orig = part.note.bind(part);
      part.note = (beat, dur, pitch, vel, o = {}) => {
        if (Array.isArray(pitch)) { for (const p of pitch) part.note(beat, dur, p, vel, o); return part; }
        return orig(beat, dur, pitch, vel, { ...o, _shift: (o._shift || 0) + role + drift(beat) });
      };
      return part;
    };

    // ---------------------------------------------------------------- buses
    const pres = (g = 2, f = 3500, q = 0.9) => ({ type: 'peak', f, q, gain: g });
    const pizzComp = { threshold: -22, ratio: 3, attack: 0.001, release: 0.06, knee: 6, makeup: 1 };
    const busPizz = s.bus('pizz', { gain: -8, pan: 0, room: 0.05, eq: [{ type: 'hp', f: 38 }, { type: 'lowshelf', f: 100, q: 0.7, gain: -3.5 }, pres(2.5, 3000, 0.8), pres(1.5, 2800, 0.9)], comp: pizzComp });
    // C: the 808 owns everything under ~100 Hz, the pizz keeps its harmonics (no phase fight on the downbeats)
    const busPizzC = s.bus('pizzC', { gain: -8, pan: 0, room: 0.05, eq: [{ type: 'hp', f: 100 }, { type: 'hp', f: 100 }, pres(2.5, 3000, 0.8)], comp: pizzComp });
    // a second pizz take, high-passed (the low end stays mono), panned opposite: the stereo-doubled pluck of the score
    const busPizzW = s.bus('pizzW', { gain: -8, pan: 0.3, room: 0.05, eq: [{ type: 'hp', f: 170 }, { type: 'hp', f: 170 }, pres(2.5, 3000, 0.8), pres(2, 2200, 1)] });
    // one tuba, its own room (no second take: no comb in the phone band)
    // back in its own octave (G1-G2): its 2nd-4th harmonics (120-250 Hz) carry the line on a phone
    const busTuba = s.bus('tuba', { gain: -10, pan: 0, width: 0, room: 0.15, eq: [{ type: 'hp', f: 40 }, { type: 'lowshelf', f: 110, q: 0.7, gain: -3.5 }, { type: 'peak', f: 220, q: 1, gain: 3.5 }],
      comp: { threshold: -20, ratio: 2.5, attack: 0.003, release: 0.09, knee: 6, makeup: 1 } });   // the oom's attack spike, not its body
    const bus808 = s.bus('sub', { gain: -9.5, width: 0, eq: [{ type: 'hp', f: 28 }] });
    const marEq = [{ type: 'peak', f: 400, q: 1, gain: -2.5 }, pres(2.5, 3200), pres(1.5, 2800)];
    // one marimba, one player: no double-track (no flam on a phone); its room gives the width
    const busMar = s.bus('marimba', { gain: -5.5, pan: -0.3, room: 0.14, reverb: 0.1, eq: marEq,
      comp: { threshold: -22, ratio: 2, attack: 0.0015, release: 0.08, knee: 6, makeup: 1 } });   // the body levelled, the stick's first spike caught
    // 560 Hz: the whistle's C#5 / D5 sit on the 2nd harmonics of the pad; 1976 Hz: a reed resonance (B6)
    const accEq = [{ type: 'hp', f: 150 }, { type: 'hp', f: 150 }, { type: 'peak', f: 350, q: 1, gain: -1.5 },
      { type: 'peak', f: 560, q: 1.4, gain: -2.5 }, { type: 'peak', f: 750, q: 1.2, gain: -1 }, { type: 'peak', f: 1800, q: 1, gain: 1.5 },
      { type: 'peak', f: 1976, q: 8, gain: -4 }, pres(2.5, 3000)];   // the reed buzz (1.8 kHz) up, the B6 line notched surgically
    const busAcc = s.bus('accordion', { gain: -9.5, pan: -0.6, reverb: 0.18, room: 0.05, width: 1.6, eq: accEq });
    const busAccR = s.bus('accordion2', { gain: -9.5, pan: 0.65, reverb: 0.18, room: 0.05, width: 1.6, eq: accEq });
    const busKib = s.bus('kibbitz', { gain: -8.5, pan: -0.3, width: 1.0, reverb: 0.12, room: 0.04, delay: 0.05,
      eq: [{ type: 'peak', f: 350, q: 1, gain: -1.5 }, { type: 'peak', f: 1976, q: 8, gain: -3 }, pres(2, 3000)] });
    // the chop is the accordionist's LEFT hand (stradella chord buttons, F#3-E4), under the right hand's pad
    const busChop = s.bus('chop', { gain: -6, pan: -0.4, room: 0.06, width: 1.8, eq: [{ type: 'hp', f: 140 }, { type: 'peak', f: 300, q: 1.2, gain: -2 }, { type: 'peak', f: 560, q: 1.4, gain: -2 }, pres(3, 2200, 1), { type: 'peak', f: 1976, q: 8, gain: -3 }] });
    const busWhis = s.bus('whistle', { gain: -6.5, pan: -0.04, reverb: 0.26, delay: 0.05 });
    const busThere = s.bus('theremin', { gain: -10.5, pan: -0.15, reverb: 0.28 });
    const busCel = s.bus('celesta', { gain: -4.5, pan: 0.25, width: 1.2, reverb: 0.22, delay: 0.1, eq: [pres(2), pres(1.5, 2800)] });
    const busGlock = s.bus('glock', { gain: -6, pan: -0.45, reverb: 0.15 });
    const busPluck = s.bus('pluck', { gain: -9.5, reverb: 0.08, eq: [{ type: 'peak', f: 1976, q: 8, gain: -4 }, pres(2.5, 3000)],
      comp: { threshold: -21, ratio: 4, attack: 0.0012, release: 0.06, knee: 6, makeup: 0.5 } });   // the pick spike of a strum
    const busPluckT = s.bus('pluckT', { gain: -9.5, pan: -0.35, reverb: 0.08, eq: [pres(2, 3000)],
      comp: { threshold: -24, ratio: 4, attack: 0.0008, release: 0.05, knee: 6, makeup: 1.5 } });
    const busTrem = s.bus('trem', { gain: -9, pan: 0.15, reverb: 0.12 });
    const busGlass = s.bus('glass', { gain: -10, reverb: 0.2 });
    // the jingles' own lines (5.6-7.1 and 10-12 kHz) only trimmed (-1.5 dB, narrow); the steady 4.6 kHz cluster and
    // the 9.2 kHz line are the ones tamed
    // round 6: the fixed jingle lines (measured at 4683, 6831 and 11122 Hz) notched narrowly, so the fizz between them
    // stays; the ring also varies per hit (RINGF below)
    const busTamb = s.bus('tamb', { gain: -9.5, pan: 0, room: 0.05, width: 0.75,
      eq: [{ type: 'peak', f: 4600, q: 3, gain: -3.5 }, { type: 'peak', f: 4683, q: 12, gain: -3 }, { type: 'notch', f: 9220, q: 4, gain: -2.5 },
        { type: 'peak', f: 6831, q: 6, gain: -4 }, { type: 'peak', f: 11122, q: 12, gain: -2 }] });
    // a faster attack catches the grain spikes that drove the limiter; the long-short body passes
    // the grain clicks' top octave shelved down: they overshot in the AAC decode (+1.6 dB at 14/4)
    const busShk = s.bus('shaker', { gain: -7.5, pan: -0.5, width: 0.7, eq: [{ type: 'highshelf', f: 8000, q: 0.7, gain: -1.8 }, { type: 'lp', f: 15000 }],
      comp: { threshold: -23, ratio: 4, attack: 0.0005, release: 0.05, knee: 4, makeup: 1.4 } });
    const busRiq = s.bus('riq', { gain: -9.5, pan: -0.2, room: 0.05 });
    // the oom must survive a phone speaker: a body at 180 Hz and a felt click
    const busKick = s.bus('kick', { gain: -14, width: 0, eq: [{ type: 'peak', f: 180, q: 1.2, gain: 3 }, { type: 'peak', f: 2500, q: 1, gain: 2 }] });
    const busClap = s.bus('clap', { gain: -8, room: 0.08 });
    const busStab = s.bus('stab', { gain: -17, room: 0.05, comp: { threshold: -14, ratio: 3, attack: 0.002, release: 0.08, knee: 6, makeup: 1.5 } });
    const busFx = s.bus('fx', { gain: -8, reverb: 0.12 });

    // ---------------------------------------------------------------- parts
    const pizzA = feel(s.part(busPizz, 'contrabassPizz', { bright: 1.1, humanize: LOCK }));
    const pizzC = feel(s.part(busPizzC, 'contrabassPizz', { bright: 1.1, humanize: LOCK, name: 'contrabassPizz:C' }));
    // the second bassist: his own timing (about 15 ms behind, his own jitter), and he plays the quarters only
    const pizzW = feel(s.part(busPizzW, 'contrabassPizz', { bright: 1.2, humanize: { time: 0.005, vel: 0.08 }, name: 'contrabassPizz:double' }), 0.008);
    let pizzMain = pizzA;
    const quartersOnly = (ph) => ph.split(/\s+/).map((tok) => {
      const m = tok.match(/^([^_:\s][^:]*):([a-z]+\.?)/);
      return m && !/^[qhw]/.test(m[2]) ? `_:${m[2]}` : tok;
    }).join(' ');
    const pz = {
      play: (b, ph, o = {}) => { pizzMain.play(b, ph, o); pizzW.play(b, quartersOnly(ph), { ...o, vel: (o.vel ?? 0.6) * 0.9 }); },
      note: (b, d, p, v, o = {}) => { pizzMain.note(b, d, p, v, o); if (d >= 1) pizzW.note(b, d, p, v * 0.9, o); },
    };
    const tuba = feel(s.part(busTuba, 'tuba', { growl: 1.0, bright: 1.15, humanize: LOCK }), 0.005);
    const sub = feel(s.part(bus808, 'sub808', { tune: -18, glide: 0, glideTime: 0.16, decay: 12 }));
    const mar = feel(s.part(busMar, 'marimba', { bright: 1.3, humanize: { time: 0.003, vel: 0.1 } }), -0.003);   // the tick sits on top
    // the accordion pad is stereo-miked: two takes (different reed beating and bellows drift) panned apart
    const accL = feel(s.part(busAcc, 'accordion', { wet: 0.25, musette: 10, spread: 1.5, high: 0.9, octave: 0.45, exact: true }));
    const accR = feel(s.part(busAccR, 'accordion', { wet: 0.3, musette: 13, spread: 1.5, high: 0.9, octave: 0.45, exact: true, name: 'accordion:R' }));
    // ONE performance, two mics: one timing/velocity jitter per bellows push, shared by both sides (+6 ms on R)
    const aR = s.rng('accTake');
    const take = () => [(aR() - 0.5) * 0.03, 1 + (aR() - 0.5) * 0.08];
    const acc = {
      chord: (b, d, p, v, o = {}) => { const [j, g] = take(); accL.chord(b + j, d, p, v * g, o); accR.chord(b + j + 0.01, d, p, v * g, o); },
      note: (b, d, p, v, o = {}) => { const [j, g] = take(); accL.note(b + j, d, p, v * g, o); accR.note(b + j + 0.01, d, p, v * g, o); },
    };
    const accLead = feel(s.part(busKib, 'accordion', { wet: 0.4, musette: 14, high: 0.45, spread: 1.5, name: 'accordion:lead' }));
    const chop = feel(s.part(busChop, 'accordion', { chop: true, high: 0.4, spread: 1.5, name: 'accordion:chop' }), 0.009);   // the pah laid back
    const whis = feel(s.part(busWhis, 'whistleLead', { sharp: 13, creep: 3, glide: 0.09 }));
    // the plateau's high phrases: the same whistler, less sharp up there (the peak must not nag)
    const whisC = feel(s.part(busWhis, 'whistleLead', { sharp: 10, creep: 1, drift: 0.4, glide: 0.09, name: 'whistleLead:C' }));
    const ther = feel(s.part(busThere, 'thereminLead', { vibrato: 0.8 }));
    const cel = feel(s.part(busCel, 'celesta'));
    const glock = feel(s.part(busGlock, 'glockenspiel'));
    const mand = feel(s.part(busPluck, 'pluck', { body: 'mandolin', double: 1, spread: 1, bright: 1.25 }), 0.008);
    // the mandolin that ticks the cell in A': one player, down/up strokes, no double (no flam, mono-safe)
    const mandT = feel(s.part(busPluckT, 'pluck', { body: 'mandolin', double: 0, decay: 0.6, bright: 1.25, name: 'pluck:tick' }), -0.002);
    // the plateau's inner line: close to the band's pitch (it holds octaves with the accordion lead)
    const trem = feel(s.part(busTrem, 'pluck', { tremolo: true, tone: 'soft', sharp: 9, name: 'pluck:tremolo' }));
    // the pedal (breakdown, 53-54): F#4, inside the mandolin's range, a little of the vintage detune
    const tremP = feel(s.part(busTrem, 'pluck', { tremolo: true, tone: 'soft', sharp: 12, name: 'pluck:pedal' }));
    const glass = feel(s.part(busGlass, 'glassPad'));
    // two tambourine players: beats / 2-and-4 on the right, the off-beat 8ths on the left (a hair late)
    const tambR = feel(s.part(busTamb, 'tambourine', { spread: 0.7, pan: 0.45 }));
    const tambL = feel(s.part(busTamb, 'tambourine', { spread: 0.7, pan: -0.45, name: 'tambourine:L' }), 0.005);
    const shk = feel(s.part(busShk, 'shaker'));
    const riq = feel(s.part(busRiq, 'riq'));
    const roll = feel(s.part(busTamb, 'jingleRoll'));
    const kick = feel(s.part(busKick, 'kick'));
    const dkick = feel(s.part(busKick, 'dropKick'));
    const clap = feel(s.part(busClap, 'clap', { flam: 0.03 }), 0.009);
    // the band's own sforzando: an accordion stab (reeds, musette), always with a tuba accent and a jingle
    const stab = feel(s.part(busStab, 'stab', { kind: 'reed', spread: 1 }));
    const zils = feel(s.part(busFx, 'fingerCymbals'));

    // whistle: under the bed in A (the CALL must not spotlight), level in B, a little up in the plateau
    // the plateau's whistle sits 1.8 dB lower than in round 5 and dips again at the peak (71-72): it must not nag on repeat
    busWhis.automate('gain', [[B(5), -2.5], [B(18, 4), -2.5], [B(19), -3.5], [B(20, 4), -3.5], [B(21), 0], [B(34, 4), 0], [B(35), -1.5], [B(36, 4), -1.5], [B(37), 0], [B(44), 0], [B(45), -1], [B(59, 4), -1], [B(60), -1.8], [B(60, 4), -1.8], [B(61), -1.8], [B(70, 4), -1.8], [B(71), -2.6], [B(72, 4), -2.6], [B(73), 0]]);
    // the celesta is the softest keyboard: 2 dB under its round-5 level through A and B, 1.5 dB in A'
    busCel.automate('gain', [[B(1), 0], [B(4, 4), 0], [B(5), -2], [B(36, 3.5), -2], [B(37), -1.5], [B(44, 4), -1.5], [B(45), -1.5], [B(60, 4), -1.5], [B(61), -2], [B(72, 3), -2], [B(73), 0]]);
    // the reed colour registers in A (bed level, not under it); the breakdown is a real thinning terrace (+0.5, not +1);
    // the plateau step is +0.75 (the KIBBITZ must clear its own family)
    for (const bus of [busAcc, busAccR]) bus.automate('gain', [[B(4, 4), 0], [B(5), 0], [B(20, 4), 0], [B(21), 0], [B(36, 4), 0], [B(37), -1], [B(44, 4), -1], [B(45), 0], [B(60, 4), 0], [B(61), 0.5], [B(72, 4), 0.5], [B(73), 0]]);
    busTamb.automate('gain', [[B(4, 4), 0], [B(5), -1], [B(20, 4), -1], [B(21), 0], [B(36, 4), 0], [B(37), -0.5], [B(44, 4), -0.5], [B(45), 0], [B(60, 4), 0], [B(61), 0], [B(72, 4), 0], [B(73), 0]]);
    // the breakdown pedal is F#4 (inside the mandolin's range, in the phone band: no lift); in 67-69 the inner line steps
    // back under the KIBBITZ answer and the link
    busTrem.automate('gain', [[B(36, 4), 0], [B(37), -3.5], [B(44, 3), -3.5], [B(44, 4), -1], [B(44, 4.9), -1], [B(45), 0], [B(66, 4), 0], [B(67), -2.5], [B(69, 4), -2.5], [B(70), 0]]);
    busShk.automate('gain', [[B(28, 4), 0], [B(29), -1.2], [B(34, 4), -1.2], [B(35), -2.5], [B(36, 4), -2.5], [B(37), 0]]);
    // the second bassist (quarters only) a little up in A and A' for the phone band
    busPizzW.automate('gain', [[B(1), 1.5], [B(4, 4), 1.5], [B(5), 3.5], [B(20, 4), 3.5], [B(21), 0], [B(44, 4), 0], [B(45), 4.5], [B(60, 4), 4.5], [B(61), 2], [B(72, 4), 2], [B(73), 2], [B(74, 4.9), 1.5]]);
    // the plateau is a terrace: the chop, the mandolin pahs, the marimba and the tuba step up with the bed (smaller steps
    // than round 5: the plateau is about -14.8 LUFS, not -14.1)
    busChop.automate('gain', [[B(60, 4), 0], [B(61), 0], [B(72, 4), 0], [B(73), 0]]);
    busPluck.automate('gain', [[B(4, 4), 0], [B(5), -1], [B(20, 4), -1], [B(21), 0], [B(60, 4), 0], [B(61), 0.3], [B(72, 4), 0.3], [B(73), 0]]);
    // the KIBBITZ and the LINK clear the reed family around them
    busKib.automate('gain', [[B(60, 4), 0], [B(61), 1], [B(62, 4), 1], [B(63), 0], [B(66, 4), 0], [B(67), 1], [B(68, 4.9), 1], [B(69), 0]]);
    // the 808 entering is felt, not only seen
    bus808.automate('gain', [[B(60, 4), 0], [B(61), 1], [B(72, 4), 1], [B(73), 0]]);
    busTuba.automate('gain', [[B(60, 4), 0], [B(61), -1], [B(72, 4), -1], [B(73), 0]]);
    busKick.automate('gain', [[B(44, 4), 0], [B(45), -1], [B(60, 4), -1], [B(61), 0]]);
    busMar.automate('gain', [[B(60, 4), 0], [B(61), 0], [B(72, 4), 0], [B(73), 0]]);
    // the Intro is carried by the phone band, not by the low pizz
    // (A and A': the low take 2-2.5 dB down, the high double carries the line: phone band)
    busPizz.automate('gain', [[B(1), -1.5], [B(4, 3), -1.5], [B(5), -2], [B(20, 4), -2], [B(21), 0], [B(44, 4), 0], [B(45), -2.5], [B(60, 4), -2.5], [B(61), 0]]);

    // ---------------------------------------------------------------- helpers
    const cutLast = (ph) => ph.replace(/\S+$/, '_:q');
    // the tuba's written velocities (oom .62, pah .5) scaled to the terrace; gate 0.57 = a 0.34 s marcato body
    const velScale = (ph, k) => ph.replace(/@([.\d]+)/g, (m, v) => `@${(+v * k).toFixed(3)}`);
    const TG = { gate: 0.57 };
    let tubaUp = 0;                                    // over the 808 (C) the tuba takes the upper octave
    const riff = (bar, key, vel = 0.62, tubaVel = 0.56, withTuba = true, cut = false) => {
      pz.play(B(bar), cut ? cutLast(RIFF[key]) : RIFF[key], { vel });
      if (withTuba) tuba.play(B(bar), velScale(cut ? cutLast(TUBA[key]) : TUBA[key], tubaVel / 0.56), { ...TG, transpose: tubaUp });
    };
    const cutBeat4 = (cell) => cell.split(' ').slice(0, 6).join(' ');
    const TICK = "F#4:e@.62 F#4:e@.36 G4:e@.56 F#4:e@.38 E#4:e@.5 F#4:e@.36 F#4:e@.58 _:e";
    const LOW = "F#4:e@.6 F#4:e@.36 E#4:e@.52 F#4:e@.38 _:e F#4:e@.42 F#4:e@.56 _:e";
    const REP = "F#4:e@.6 F#4:e@.34 _:e F#4:e@.5 _:e F#4:e@.4 F#4:e@.56 _:e";
    const TICKF = "F#4:e@.6 F#4:e@.34 G4:e@.54 F#4:e@.36 E4:e@.5 F#4:e@.36 F#4:e@.58 _:e";
    const LOWF = "F#4:e@.58 F#4:e@.34 E4:e@.5 F#4:e@.36 _:e F#4:e@.4 F#4:e@.55 _:e";
    const TICKGS = "G#4:e@.6 G#4:e@.36 A4:e@.54 G#4:e@.38 F#4:e@.5 G#4:e@.36 G#4:e@.58 _:e";
    const FLICK = "D#5:e@.5 D#5:e@.34 E5:e@.52 D#5:e@.36 D5:e@.5 D#5:e@.34 D#5:e@.56 _:e";
    const SWAP = "G#4:e@.6 G#4:e@.36 A4:e@.52 G#4:e@.38 G4:e@.58 G4:e@.36 F#4:e@.5 G4:e@.42";
    const PIVOT = "G4:e@.58 G4:e@.38 A4:e@.56 G4:e@.4 F#4:e@.5 G4:e@.38 G4:e@.6 _:e";
    const PIVOTL = "G4:e@.6 G4:e@.38 F#4:e@.52 G4:e@.4 _:e G4:e@.44 G4:e@.6 _:e";
    // a player moves the accent now and then (k = the 8th that leans), and ghosts the last tick at a phrase end
    const accentAt = (cell, k) => { let n = -1; return cell.split(' ').map((tok) => { if (tok.startsWith('_')) return tok; n++; return `${tok.split('@')[0]}@${n === k ? '.6' : n % 2 ? '.34' : '.44'}`; }).join(' '); };
    const ghostEnd = (cell) => { const t = cell.split(' '); for (let i = t.length - 1; i >= 0; i--) if (!t[i].startsWith('_')) { t[i] = t[i].split('@')[0] + '@.2'; break; } return t.join(' '); };
    // a light cell every other bar: the F#-G-F# neighbour is heard in half the tick bars only
    const cellFor = (ch, light, plain = false) => {
      if (ch === 'F7' || ch === 'F7b9' || ch === 'Em6') return light ? LOWF : TICKF;
      if (ch === 'G') return light ? REP : TICKF;      // over G the E# would point to C (G7): E natural, toward the F# pillar
      if (ch === 'E') return TICKGS;
      return light ? (plain ? REP : LOW) : TICK;
    };
    const ARC = [0.9, 0.95, 1.0, 0.88];               // the player's shape over a 4-bar phrase
    const tick = (bar, cell = TICK, amp = 1, transpose = 0) => { mar.play(B(bar), cell, { amp, transpose }); };
    // the bellows: every chord breathes its own way (peak position, depth), some are pushed flat
    const bR = s.rng('bellows');
    const bellows = () => (bR() < 0.2 ? 'flat' : [[0, 0.7 + 0.2 * bR()], [0.2 + 0.4 * bR(), 1], [1, 0.8 + 0.15 * bR()]]);
    const pad = (bar, beats, key, vel = 0.42, opts = {}) => {
      const o = { expr: bellows(), ...opts };
      if (key !== 'F7b9') return acc.chord(B(bar), beats, PAD[key], vel, o);
      acc.chord(B(bar), beats, ['C#4', 'E4', 'A#4'], vel, o);
      acc.note(B(bar), beats, 'G4', vel, { ...o, tag: 'tension' });
    };
    // tambourine figures (R = the beats, L = the off-beats)
    // the 2/4 hits ring (~0.5 s of jingle, as in Schlep / Shidduch), the 1/3 shakes stay short
    // every hit rings its own way (1.1-1.45): no identical jingle decay on every backbeat
    const ringR = s.rng('ring');
    const RINGF = () => ({ ring: 1.1 + 0.35 * ringR() });
    const tambQ = (bar, v = 0.5, acc2 = 1) => {   // quarters: shakes on 1/3, hits on 2/4
      tambR.hit(B(bar, 1), 0.5, v * 0.6, { stroke: 'shake' }); tambR.hit(B(bar, 2), 0.9, v * acc2, RINGF());
      tambR.hit(B(bar, 3), 0.5, v * 0.6, { stroke: 'shake' }); tambR.hit(B(bar, 4), 0.9, v, RINGF());
    };
    const tamb24 = (bar, v = 0.45) => { tambR.hit(B(bar, 2), 0.9, v, RINGF()); tambL.hit(B(bar, 4), 0.9, v * 0.95, RINGF()); };
    const tamb8 = (bar, v = 0.48, acc2 = 1, beats = 4) => {  // off-beat 8ths (L) + a soft shake on the beats (R)
      for (let b = 1; b <= beats; b++) {
        tambR.hit(B(bar, b), 0.5, v * 0.45, { stroke: 'shake' });
        tambL.hit(B(bar, b + 0.5), 0.5, v * (b === 2 ? acc2 : b === 4 ? 1 : 0.85));
      }
    };
    const tambFill = (bar, v = 0.42) => {      // a player's phrase-end fill: 16th pair on 4e / 4a
      tambR.hit(B(bar, 4.25), 0.25, v * 0.7); tambL.hit(B(bar, 4.75), 0.25, v * 0.85);
    };
    // a long-short hand: ghosts 6-8 dB under the accent; on the 4th bar of a phrase the hand turns over (no last 16th)
    const SHK = [[0.9, 0.32, 0.62, 0.4], [0.84, 0.36, 0.58, 0.34]];
    const shaker = (bar, beats, vel) => swingGroove(shk, B(bar), beats, { step: 0.25, swing: 0.57, vel, accents: SHK[bar % 2],
      skip: (bar - 1) % 4 === 3 ? (i) => i === 15 : null });
    // A: long-short 8ths only (grid density is a device: the swung 16ths enter with the lift at 21)
    const shaker8 = (bar, beats, vel) => swingGroove(shk, B(bar), beats, { step: 0.5, swing: 0.57, vel, accents: [1, 0.45] });
    // oom-pah kit: kick on 1 (fused with the bass note), a ghost on 3& before a chord change
    const kickOom = (bar, root, v = 0.66, ghost = false, nextRoot = root) => {
      kick.note(B(bar, 1), 0.5, root, v);
      if (ghost) kick.note(B(bar, 3.5), 0.5, nextRoot, v * 0.42);
    };
    // the "pah": a clap fused with an accordion chop on 2 and 4 (the chop stays on one side, like a player)
    // the chop is the left hand: stradella chord buttons inside F#3-E4 (3 notes; the 7th buttons drop the 5th)
    const CHOPV = {
      Bm: ['F#3', 'B3', 'D4'], G: ['G3', 'B3', 'D4'], F7: ['F#3', 'A#3', 'E4'], F7b9: ['G3', 'A#3', 'E4'], Em6: ['G3', 'C#4', 'E4'],
      C: ['G3', 'C4', 'E4'], BmA: ['F#3', 'A3', 'D4'], BmM7: ['F#3', 'A#3', 'D4'],
    };
    const pah = (bar, key, v = 0.5, beats = [2, 4]) => {
      for (const b of beats) {
        clap.hit(B(bar, b), 0.5, v * 0.8);
        chop.chord(B(bar, b), 0.2, CHOPV[key] || PAD[key], v);
      }
    };
    // the wide mandolin pah (its double take on the other side); the player leans to one side per 4-bar phrase
    const pahs = (bar, key, v = 0.5, beats = [2, 4]) => {
      const side = Math.floor((bar - 1) / 4) % 2 ? 0.3 : -0.3;
      for (const b of beats) mand.chord(B(bar, b), 0.5, PAH[key], v * (Number.isInteger(b) ? 1 : 0.7), { strum: 0.012, pan: side });
    };
    // the band's sforzando: accordion stab + a tuba accent + a tambourine hit
    const push = (bar, beat, pitches, v, bassNote = 'F#2') => {
      stab.chord(B(bar, beat), 0.3, pitches, v);
      tuba.note(B(bar, beat), 0.3, bassNote, Math.min(0.6, v + 0.06));
      tambR.hit(B(bar, beat), 0.5, 0.46);
    };
    // whistle phrasing: a breath swell on every note, light late vibrato on the held ones, a capped sharp drift
    const WX = { legato: true, shape: 'arch', expr: [[0, 0.86], [0.4, 1], [1, 0.82]], vibrato: 0.22, vibDelay: 1.0 };

    // ================================================================ INTRO 1-4 (C thinning out across the wrap)
    s.section('Intro', B(1), B(5), 'gentle');
    const intro = ['Bm', 'Bm2', 'G', 'F7'];
    cel.note(B(1), 1, 'B5', 0.46);                      // the turnaround's C6 -> A#5 lands here (D9 across the seam)
    for (let i = 0; i < 4; i++) {
      tick(1 + i, i === 1 ? LOW.replace('F#4:e@.6', 'F#4:e@.46') : cellFor(CHORD[intro[i]], i % 2), 0.88 * ARC[i] * (i === 2 ? 0.9 : 1));   // 2/1 and 3/1 no longer trip the limiter
      if (i < 2) tamb8(1 + i, 0.5 - 0.04 * i); else tambQ(1 + i, 0.46 + 0.02 * i);
      shaker(1 + i, 4, [0.5, 0.44, 0.38, 0.34][i]);
    }
    kickOom(1, 'B1', 0.46, false); kickOom(2, 'B1', 0.3, true, 'G1');
    pah(1, 'Bm', 0.36); pah(2, 'Bm', 0.3);
    pahs(3, 'G', 0.26); pahs(4, 'F7', 0.27);
    riff(1, 'Bm', 0.56, 0.44); riff(2, 'Bm2', 0.56, 0.44);
    riff(3, 'G', 0.58, 0.46); riff(4, 'F7', 0.6, 0.48);
    acc.chord(B(1, 1.5), 7.5, PAD.Bm, 0.38, { expr: [[0, 1], [0.5, 0.95], [1, 0.88]] });   // in on 1&: the celesta B5 sings first
    acc.chord(B(3), 4, PAD.G, 0.31, { expr: bellows() });
    acc.chord(B(4), 4, PAD.F7, 0.32, { expr: bellows() });
    zils.note(B(4, 4.5), 1, 'F#6', 0.26);

    // ================================================================ A 5-20
    s.section('A', B(5), B(21), 'gentle');
    const cycA = ['Bm', 'Bm2', 'G', 'F7'];
    const keysA = [];
    for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) keysA.push(cycA[i]);
    keysA[4] = 'BmC'; keysA[9] = 'BmAs'; keysA[13] = 'BmA'; keysA[14] = 'EmG';   // 14 Bm(maj7)/A#               // 18 Bm/A, 19 Em6/G: the cycle deflects (bass B A G F#)
    for (let j = 0; j < 16; j++) {
      const bar = 5 + j, i = j % 4, k = Math.floor(j / 4);
      const key = keysA[j], ch = CHORD[key];
      const breath = bar === 20;
      // the tuba breathes like a player: out in 11, under the celesta's answer (the pizz carries)
      riff(bar, key, 0.52, 0.5 + 0.02 * k, bar !== 11, breath);
      if (breath) { pz.note(B(bar, 4.5), 0.25, 'A#1', 0.5); tuba.note(B(bar, 4.5), 0.25, 'A#1', 0.46); }
      // marimba: rests in 13-14 and 17-18 (bed only); a lighter cell every other bar; 6 only repeated notes, soft
      if (![13, 14, 17, 18].includes(bar)) {
        const amp = (bar === 6 ? 0.66 : bar === 7 ? 0.86 : 0.76) * ARC[i];
        let cell = cellFor(ch, i % 2 === 1, k === 1);
        if (bar === 6) cell = REP;
        if (bar === 7) cell = accentAt(cell, 3);
        if (bar === 11) cell = accentAt(cell, 1);
        if (bar === 12) cell = cutBeat4(TICKF);           // stops before the push on 4&
        if (bar === 15) cell = TICKF;                     // E, not E#, under the ANSWER's E5
        if (bar === 8 || bar === 16) cell = ghostEnd(cell);
        if (breath) cell = cutBeat4(TICKF);
        tick(bar, cell, amp);
      }
      // 15: no pah on 4 (its D5 would rub the whistle's held C#5)
      pahs(bar, ch === 'F7' && bar === 20 ? 'F7b9' : ch, 0.32 + 0.01 * k, breath || bar === 15 ? [2] : [2, 4]);
      if (!breath) tambQ(bar, 0.4 + 0.015 * k, k % 2 ? 0.9 : 1.05);
      else {
        tambR.hit(B(bar, 1), 0.5, 0.36, { stroke: 'shake' }); tambR.hit(B(bar, 2), 0.5, 0.52);
        tambR.hit(B(bar, 3), 0.5, 0.36, { stroke: 'shake' }); tambL.hit(B(bar, 4), 1, 0.4, { stroke: 'shake' });
      }
      if (bar === 8 || bar === 16) tambFill(bar, 0.46);
      // a soft long-short 8th shaker under A (really out in 17-18 for air); 16ths only in 19-20, a hint of the lift
      if (bar === 19 || bar === 20) shaker(bar, breath ? 3 : 4, 0.34);
      else if (bar !== 17 && bar !== 18) shaker8(bar, 4, 0.36 + 0.02 * k);
    }
    // accordion bed, low; held across repeated harmonies
    for (let k = 0; k < 3; k++) {
      const b0 = 5 + 4 * k, v = 0.26 + 0.015 * k;
      if (b0 === 13) { pad(13, 4, 'Bm', v); pad(14, 4, 'BmM7', v, { tag: 'tension' }); }
      else pad(b0, 8, b0 === 9 ? 'Bm5' : 'Bm', v);
      pad(b0 + 2, 4, 'G', b0 === 5 ? v + 0.06 : v); pad(b0 + 3, 4, 'F7', v);
    }
    pad(17, 4, 'Bm', 0.29); pad(18, 4, 'BmA', 0.29); pad(19, 4, 'Em6', 0.29, { tag: 'tension' });
    // 20: the inner voice sighs G4 -> F#4 together with the whistle's G5 -> F#5
    acc.chord(B(20), 3, ['C#4', 'E4', 'A#4'], 0.31, { expr: 'flat' });
    acc.note(B(20), 1.5, 'G4', 0.31, { expr: 'flat', tag: 'tension' });
    acc.note(B(20, 2.5), 2, 'F#4', 0.3, { expr: 'flat' });      // held to the 4& pickup: the breath is not a hole
    // CALL (9-10) and the celesta's answer (11), soft: the tritone answered by a 3rd and a turn (G5 B5 C#6 B5), home on B5
    whis.play(B(9), "_:q mp E5:e D5:e C#5:e G5:h! F#5:e _:e E5:e D5:e C#5:e _:q", { ...WX, fall: -40 });
    cel.play(B(11), "_:e p A#5:e B5:e F#5:e G5:e B5:e C#6:e B5:e", { shape: 'dim' });
    // the band's push on 12/4& (the hit), the next downbeat left to the bass
    push(12, 4.5, ['F#3', 'C#4', 'E4', 'A#4'], 0.56);
    kick.note(B(12, 4.5), 0.5, 'F#1', 0.58);
    // ANSWER (15-16): from the CALL's peak note G5 down; the held C#5 (#11 over G) is resolved by the harmony (F#7)
    // the line does not stop on C#5: it lifts to E5 (the 7th of F#7), which bar 17's Bm takes down to D
    whis.play(B(15), "_:q mp G5:e F#5:e E5:e C#5:h! D5:q! E5:q _:h", { ...WX, fall: -35 });
    // 5-8: the groove alone (no celesta comment): the loop establishes itself before the CALL, as the score does
    // SNEER over Em6/G | F#7b9 (19-20): the cue's one sung augmented second
    whis.play(B(19), "_:e mp D5:e G5:q. A#5:e B5:e A#5:e | G5:q. F#5:e ~:q", { ...WX, fall: -45 });
    // the breath: 20/4 is empty except a tambourine shake (and the bass pickup on 4&)

    // ================================================================ B 21-36 (the lift: a 4-bar loop over a B pedal)
    s.section('B', B(21), B(37), 'release');
    // two pedal units (21-28 the lift, 33-36 the swap) around a unit with REAL roots: 29 B | 30 E/G# | 31 G (bVI) | 32 F#7,
    // the bass a chromatic lament B G# G F# (D5; the G# -> G drop is a third swap of the E chord) under the whistle's
    // long line, so the F# pedal at 37 arrives after a cadence (no second diatonic B-A-G-F# walk after 17-20)
    const harmB = ['B', 'AB', 'E', 'B', 'B', 'AB', 'E|Em', 'B', 'B', 'Gs', 'G', 'F7', 'B', 'AB', 'E|Em', 'B'];
    const ROOTED = { Gs: [RIFF.Gs, "G#1:q _:q E2:q _:q"], G: [RIFF.G, "G1:q _:q D2:q _:q"], F7: [RIFF.F7, "F#1:q _:q C#2:q A#1:q"] };
    for (let i = 0; i < 16; i++) {
      const bar = 21 + i, u = i % 4, h = harmB[i];
      let line;
      if (ROOTED[h]) line = ROOTED[h][0];
      else if (bar === 21 || bar === 29 || bar === 33) line = "B1:q' F#2:q' B1:e' D#2:e' F#2:q@.48'";   // the 4th-beat F#2 lighter (it sat on the limiter with the pah)
      else if (u === 1) line = "B1:q' _:q F#2:e' B1:e' _:q";
      else if (u === 3 && bar !== 36) line = "B1:q' _:q F#2:q' _:e A#1:e'";
      else if (bar === 36) line = "B1:q' _:q F#2:q' _:e G1:e'";            // b2 -> 1 into the F# pedal (D2)
      else if (h === 'E|Em') line = "B1:q' _:q B1:q' _:q";
      else line = "B1:q' _:q F#2:q' _:q";
      pizzMain.play(B(bar), line, { vel: 0.58 }); pizzW.note(B(bar), 1, line.split(':')[0], 0.52);   // the second bassist: the downbeat only
      // the tuba stays an octave up in B: the lift is light (and 4-5 LU under the whistle)
      const tl = ROOTED[h] ? ROOTED[h][1] : h === 'E|Em' ? "B1:q _:q B1:q _:q" : u % 2 ? "B1:q _:q F#1:q _:q" : "B1:q _:q F#2:q _:q";
      tuba.play(B(bar), tl, { vel: 0.46, transpose: 12, ...TG });
      if (u === 3 && h !== 'F7') tuba.note(B(bar, 4.5), 0.25, bar === 36 ? 'G2' : 'A#2', 0.4);
      const PK = { G: 'GB' }[h] || h;
      if (h === 'E|Em') {
        acc.chord(B(bar), 2, PAD.E, bar === 35 ? 0.34 : 0.4, { expr: 'flat' });
        acc.chord(B(bar, 3), 2, ['B3', 'E4'], bar === 35 ? 0.37 : 0.44, { expr: 'flat' });
        acc.note(B(bar, 3), 2, 'G4', bar === 35 ? 0.37 : 0.44, { expr: 'flat', tag: 'tension' });   // the swapped 3rd (G# -> G) is the tension
        pahs(bar, 'E', bar === 35 ? 0.35 : 0.39, [2]); pahs(bar, 'Em', bar === 35 ? 0.34 : 0.37, [4]);
      } else {
        const tied = h === 'B' && harmB[i - 1] === 'B';
        if (bar === 30) {
          // the G# arrives with the whistle's G#5 on 2& (no 4-3 against its own resolution)
          acc.chord(B(30), 4, ['B3', 'E4'], 0.39, { expr: bellows() });
          acc.note(B(30), 1.5, 'B4', 0.34, { expr: 'flat' }); acc.note(B(30, 2.5), 2.5, 'G#4', 0.37, { expr: 'flat' });
        } else if (!tied) pad(bar, bar === 36 ? 3 : h === 'B' && harmB[i + 1] === 'B' ? 8 : 4, PK, 0.36 + (i >= 8 ? 0.03 : 0));
        // 24: the pah moves off 2 (the B-major CALL's E5 lands there)
        const pb = bar === 24 ? [2.5, 4] : bar === 30 ? [2.5, 3.5, 4] : i >= 8 && u !== 0 ? [2, 3.5, 4] : [2, 4];
        pahs(bar, h === 'Gs' ? 'E' : h, bar === 36 ? 0.34 : 0.39, pb);
      }
      // marimba in 21, 27, 31 and 33 only (the celesta and the shaker carry B): FLICKER on B, G#-cell on E/B, SWAP on E . Em, PIVOT on G
      if ([21, 27, 31, 33].includes(bar)) {
        const cell = h === 'B' ? FLICK : h === 'E|Em' ? SWAP : h === 'G' ? accentAt(PIVOT, 5) : TICKGS;
        tick(bar, cell, (h === 'B' ? 0.8 : 0.9) * ARC[u]);   // the high FLICKER cell lighter (limiter)
      }
      tamb24(bar, 0.42);
      if (bar === 24 || bar === 32) tambFill(bar, 0.42);
    }
    for (let bar = 21; bar <= 36; bar++) shaker(bar, 4, bar < 29 ? 0.42 : 0.46);
    glass.chord(B(21), 3, ['D#5', 'F#5', 'B5'], 0.5);
    glass.chord(B(33), 3, ['B4', 'D#5', 'F#5'], 0.4);
    // the celesta calls, the whistle answers with the CALL itself, third-swapped
    cel.play(B(21), "_:e mp B5:e D#6:e F#6:e E6:e D#6:e B5:q", {});
    // 22-23 over A/B -> E/B: the CALL head, a minor-6th leap onto A5, the 4-3 sigh A5 -> G#5 when E arrives
    whis.play(B(22), "_:q mp E5:e D5:e C#5:e A5:h G#5:q. _:h", { ...WX, fall: -35 });
    // 23: no celesta under the whistle (the sigh A5 -> G#5 speaks alone)
    // 24-25 over B: the CALL in B major with its b6 kept (G natural: D10), resolving to F#5
    // (fit: one whistle statement fewer per loop: the bells take it, an octave up, the toy-bell reply to 22-23)
    cel.play(B(24), "_:q mp E6:e D#6:e C#6:e G6:q.! F#6:e ~:q F#6:e _:e _:h", {});
    // 26-28: no lead; the E -> Em swap is the event (the marimba SWAP cell and the pahs carry it)
    // 29-31 the long line from the downbeat: up to B5 through its leading tone, then the A5 -> G#5 sigh over E/G# (an
    // appoggiatura a b9 above the bass, the 22-23 sigh again), down the E chord, and it settles on D5 over G (bVI: the
    // D natural comes back for one bar) while the bass drops G# -> G
    whis.play(B(29), "mp D#5:q. E5:e F#5:q A#5:e B5:e | A5:q.! G#5:e E5:q C#5:q | D5:h. _:q", { ...WX, fall: -35 });
    // 35: the whistle sings the swap G# -> G -> F# (D10) from the downbeat; 36/4 the celesta swaps back D# -> D -> C#
    whis.play(B(35), "mp G#5:h G5:h! | F#5:h. _:q", { ...WX, fall: -40 });
    cel.play(B(36, 4), "mp D#6:e D6:e! C#6:q", {});

    // ================================================================ BREAKDOWN 37-44 (F# Freygish pedal, half time, 5+3)
    s.section('Breakdown', B(37), B(45), 'tension');
    const brkTick = {
      37: "F#4:q@.5 F#4:q@.3 G4:q@.42 F#4:q@.3",
      39: "F#4:q@.48 F#4:q@.3 E#4:q@.42 F#4:q@.3", 40: "F#4:q@.5 F#4:q@.3 G4:q@.42 F#4:q@.3",
      41: "F#4:q@.55 F#4:q@.38 G4:q@.5 F#4:q@.38",
      43: "F#4:q@.48 F#4:q@.3 E#4:q@.42 F#4:q@.3", 44: "F#4:q@.46 F#4:q@.3 F#4:q@.36",
    };
    for (let bar = 37; bar <= 44; bar++) {
      const last = bar === 44;
      pz.note(B(bar), 1, 'F#1', 0.5);
      if (bar === 40 || bar === 43) pz.note(B(bar, 3), 1, 'C#2', 0.44);
      tuba.play(B(bar), last ? "F#2:h@.4' C#3:e@.33' E3:e@.33'" : bar === 41 ? "F#2:h@.38' D3:q@.3' _:q" : bar === 42 || bar === 38 ? "F#2:h@.4' _:q D3:q@.31'" : "F#2:h@.4' _:q C#3:q@.31'", {});
      if (last) pz.play(B(bar, 3), "C#2:e' E2:e' _:e A#1:e'", { vel: 0.56 });
      if (brkTick[bar]) tick(bar, brkTick[bar], 0.66);       // 38 and 42 (G/F#): the marimba rests under the sighs
      // riq: dum on 1, tek on 3 (half-time backbeat), ghost teks; fills at the ends of the 5- and 3-bar units
      riq.hit(B(bar, 1), 0.5, 0.42, { stroke: 'dum' });
      riq.hit(B(bar, 2.5), 0.5, 0.26, { stroke: 'tek' });
      riq.hit(B(bar, 3), 0.5, 0.38, { stroke: 'tek' });
      if (bar === 39) riq.hit(B(bar, 3.5), 0.5, 0.3, { stroke: 'dum' });
      if (bar === 41 || bar === 43) for (const b of [4, 4.25, 4.5, 4.75]) riq.hit(B(bar, b), 0.25, b === 4 ? 0.34 : 0.24 + 0.03 * (b - 4) * 4, { stroke: 'tek' });
      else if (!last) riq.hit(B(bar, 4.5), 0.5, 0.28, { stroke: 'tek' });
    }
    // accordion: the pedal chord with its semitone neighbours (G -> F#, E# -> F#), sighs with fall-offs
    acc.chord(B(37), 4, PAD.F, 0.36, { expr: bellows() });
    // 38 / 42 G/F#: G3 B3 D4, the G a major 7th under the pedal; it sighs to F#3 (the pedal's lower octave)
    acc.chord(B(38), 3.5, ['G3', 'B3', 'D4'], 0.37, { expr: 'swell', tag: 'tension' });
    acc.note(B(38, 4.5), 0.5, 'F#3', 0.36);
    // 39: the theremin sings the E# (E#5); the bed keeps C#7's B and G# under it, no doubled leading tone
    acc.chord(B(39), 4, ['B3', 'G#4', 'C#5'], 0.35, { expr: 'dim' });
    acc.chord(B(40), 4, PAD.F, 0.35, { expr: bellows() });
    // 41 (no theremin): the bed sighs itself, an octave over the pedal: G5 (its b9) -> F#5 over B3 D4 (Bm/F#)
    acc.chord(B(41), 4, ['B3', 'D4'], 0.36, { expr: bellows() });
    acc.note(B(41, 2.5), 1.5, 'G5', 0.3, { expr: 'swell', tag: 'tension' }); acc.note(B(41, 4), 1, 'F#5', 0.28);
    acc.chord(B(42), 3.5, ['G3', 'B3', 'D4'], 0.37, { expr: 'swell', tag: 'tension' });
    acc.note(B(42, 4.5), 0.5, 'F#3', 0.35);
    // 43 voiced like 39 (no held E#4 against the pedal and the marimba's F#4): the leading tone is the marimba's E#4 tick
    acc.chord(B(43), 4, ['B3', 'G#4', 'C#5'], 0.36, { expr: 'dim', tag: 'tension' });
    // 44 F#7b9: the b9 at the bottom (G3, a major 7th under the pedal)
    acc.chord(B(44), 3.4, ['G3', 'C#4', 'E4', 'A#4'], 0.35, { expr: [[0, 1], [0.8, 0.95], [1, 0.6]], tag: 'tension' });
    // the pedal on F#4 (the mandolin's D string, Kugel's own register): the accordion's G3 / G5 and the theremin's G5 /
    // E#5 rub it from other octaves (maj7 below, b9 above), never as a held same-octave minor 2nd. A player, not a drone:
    // two strokes-phrases (5 + 3 bars, re-picked at 42), the rate moving 7.0 -> 7.9, swells like bellows; it rings
    // through the 44/4 breath (the floor is the pedal, not silence)
    tremP.note(B(37), 20.25, 'F#4', 0.38, { tremRate: 7.0, expr: [[0, 0.8], [0.2, 1], [0.45, 0.82], [0.7, 1], [0.94, 0.9], [1, 0.72]] });
    tremP.note(B(42), 12, 'F#4', 0.37, { tremRate: 7.9, expr: [[0, 0.74], [0.35, 1], [0.7, 0.86], [0.85, 0.84], [0.96, 0.9], [1, 0.75]] });
    // the shaker does not vanish at the barline: soft quarters through 37-38, the fall is a step, not a cliff
    for (let bar = 37; bar <= 38; bar++) for (let b = 1; b <= 4; b++) shk.note(B(bar, b), 0.2, null, (b % 2 ? 0.3 : 0.24) * (bar === 37 ? 1 : 0.85));
    dkick.hit(B(37), 2, 0.5); dkick.hit(B(42), 2, 0.42);
    // theremin SIGH: G over G/F# (38), E# over C#7/F# (39), home on F# (40); then D (42, G/F#) -> C# (43, C#7/F#)
    ther.play(B(38, 3), "mp G5:h | F#5:q. E#5:e ~:h | F#5:h", { legato: true });
    ther.play(B(42, 2), "mf D5:h. | C#5:h", { legato: true, fall: -50 });
    // the breath on 44/4: a finger-cymbal ping over the soft tremolo pedal
    zils.note(B(44, 4), 1, 'F#6', 0.2);
    // ... and the riq's fingertips through it (ghost teks rising into A'): a breath, not a hole
    for (const [b, v] of [[4, 0.13], [4.25, 0.12], [4.5, 0.16], [4.75, 0.2]]) riq.hit(B(44, b), 0.25, v, { stroke: 'tek' });
    roll.hit(B(44, 2.5), 1.25, 0.16, { from: 0.3, to: 0.6 });

    // ================================================================ A' 45-60
    s.section("A'", B(45), B(61), 'tension');
    // 54: Em6 (the borrowed iv, root E) instead of a third Bm: the cycle deflects B E G F# under the accordion's ANSWER
    const keysA2 = ['Bm', 'Bm2', 'G', 'F7', 'BmC', 'BmN', 'C', 'F7', 'BmC', 'Em6', 'G', 'F7', 'Bm', 'Bm2', 'Em6', 'F7'];
    for (let j = 0; j < 16; j++) {
      const bar = 45 + j, i = j % 4, k = Math.floor(j / 4);
      const key = keysA2[j], ch = CHORD[key];
      const tubaOn = bar !== 49 && bar !== 50 && bar !== 47 && bar !== 48;
      riff(bar, key, 0.6, 0.53, tubaOn);
      if (bar >= 47 && bar < 53) {
        // the mandolin ticks (45-46 bed only); under the whistle's G5 (49-50) down an octave
        const cell = ch === 'C' ? PIVOT : bar === 50 ? REP : cellFor(ch, i % 2 === 1);   // 50: no E# under the held E5
        mandT.play(B(bar), bar === 52 ? ghostEnd(cell) : cell, { transpose: bar === 49 || bar === 50 ? 0 : 12, amp: 0.64 * ARC[i] });
      } else if (bar >= 53 && bar !== 57 && bar !== 58) {
        let cell = i === 1 ? REP : cellFor(ch, false);
        if (bar === 53) cell = accentAt(TICKF, 1);           // E natural under the ANSWER's E5 (as in 15)
        if (bar === 56 || bar === 60) cell = ghostEnd(cell);
        // 55-56 an octave up and lighter: the cell alone is the event (no celesta over it)
        if (bar === 55 || bar === 56) tick(bar, cell, 0.56 * ARC[i], 12); else tick(bar, cell, 0.92 * ARC[i]);
      }
      tamb8(bar, 0.4, k % 2 ? 0.9 : 1.08);
      if (bar === 48 || bar === 52 || bar === 56) tambFill(bar, 0.44);
      const nextKey = keysA2[j + 1] || 'Bm';
      kickOom(bar, ROOT[key], 0.55, i === 1 || i === 3, ROOT[nextKey]);
      pah(bar, ch, 0.39);
      // the wide mandolin answers the chop (54: Em voicing, its B4 with the ANSWER's B4, no C#5 against it)
      if (bar >= 53) pahs(bar, bar === 60 ? 'F7b9' : bar === 54 ? 'Em' : ch, 0.36, [2.5, 4.5]);
    }
    mar.note(B(55, 1.93), 0.07, 'A5', 0.2);               // a grace into the G (one, like a player)
    // the tuba out in 49-50; a slurred G1 -> F#1 in 47-48 (b2 -> 1 of the dominant, a player's legato)
    tuba.play(B(47), "G1:q@.6 _:q D2:q@.5", TG);
    tuba.play(B(47, 4), "G1:q F#1:h", { vel: 0.54, legato: true });
    tuba.play(B(48, 3), "C#2:q@.5 A#1:q@.48", TG);
    pad(45, 8, 'Bm', 0.27); pad(47, 4, 'G', 0.27); pad(48, 4, 'F7', 0.28);
    pad(49, 8, 'Bm5', 0.26); pad(51, 4, 'C', 0.32, { tag: 'tension' }); pad(52, 4, 'F7', 0.29);
    // 53-54: the accordion player has the tune (right hand) and the chop (left hand): no pad. A soft tremolo pedal holds the bed
    tremP.note(B(53), 8, 'F#4', 0.3, { expr: [[0, 0.8], [0.5, 1], [1, 0.85]] });
    pad(55, 4, 'G', 0.27); pad(56, 4, 'F7', 0.28);
    pad(57, 8, 'Bm', 0.29); pad(59, 4, 'Em6', 0.3);
    acc.chord(B(60), 4, PAD.F7, 0.27, { expr: bellows() });
    acc.note(B(60), 3, 'G4', 0.27, { tag: 'tension' }); acc.note(B(60, 4), 1, 'F#4', 0.26);   // b9 -> 1 in the inner voice
    // 45-46 bed only. 47-48 the celesta counter-line (off-beat comments: G5 -> B5 a 3rd, then the leading tone A#5)
    cel.play(B(47), "_:e p F#5:e _:q _:e B5:e G5:q | _:e B5:e _:q A#5:q _:h", {});
    // 48/4& the CALL as a pickup: its tail turns up (C#5 D5 E5) and the E5 is held while the Neapolitan C arrives under
    // it (4th of Bm -> 3rd of C: a pivot note, D7)
    whis.play(B(48, 4.5), "mp E5:e D5:e C#5:e G5:q.! F#5:e _:e C#5:e D5:e E5:w ~:e", { ...WX, fall: -35 });
    // 51-52 bed; the push into 53
    push(52, 4.5, ['F#3', 'C#4', 'E4', 'A#4'], 0.52);
    kick.note(B(52, 4.5), 0.5, 'F#1', 0.56);
    // 53-54 the ANSWER on the accordion (musette), closing on the tonic
    // (it ends up on E5, the root of Em6: no b6 -> 5 sigh here)
    accLead.play(B(53), "_:q mp A5:e' F#5:e' E5:e' C#5:h D5:e' E5:q' _:h", { shape: 'arch' });
    // 57-58 bed only (the marimba rests too). 59-60 from the downbeat: Em6 (Dorian C# flash) -> F#7b9, the b6 -> 5 flicker
    // one sigh only (D5 -> C#5), then a turn round C#5 (inside a whistler's range); the pad's A#4 is the leading tone
    // 60: it stops on the D5, held as the b13 of F#7b9; only the bass resolves it (A#1 -> B1)
    whis.play(B(59), "mp G5:q. A5:e G5:e E5:e C#5:e E5:e | D5:h.! _:q", { ...WX, fall: -40 });

    // ================================================================ C 61-72 (tension plateau, 808)
    s.section('C', B(61), B(73), 'climax');
    pizzMain = pizzC; tubaUp = 12;
    // second phrase: the bass keeps the riff on B (67-69) while the D5 line runs INSIDE the band, on a new colour, the
    // tremolo mandolin: B4 A#4 A4 | G4 (bass to G, bVI) | G4 (Em6) | G4 -> F#4 (b9 -> 1). -1 -1 -2 . . -1: no line cliche.
    const cycC = ['BmC', 'BmC', 'G3', 'G', 'Em6', 'F7', 'BmC', 'BmC', 'Bm2F', 'G', 'Em6', 'F7C'];
    const chC = ['Bm', 'Bm', 'G', 'G', 'Em6', 'F7b9', 'Bm', 'BmM7', 'BmA', 'G', 'Em6', 'F7b9'];
    // 69-70: the ticking does NOT die before the climax: LOWF under the link, then the pivot cell cut before the breath
    // 63: the PIVOT keeps G4 on beat 3 (ghosted): no F#4 under the C6 suspension
    const cellC = [TICK, LOW, "G4:e@.44 G4:e@.34 A4:e@.44 G4:e@.6 G4:e@.24 G4:e@.34 G4:e@.44 _:e", PIVOTL, PIVOTL, PIVOTL, accentAt(TICK, 5), "_:e F#4:e@.36 _:e F#4:e@.5 _:e F#4:e@.4 F#4:e@.56 _:e", LOWF, cutBeat4(PIVOTL), LOWF, cutBeat4(TICKF)];
    const kibBars = [61, 62, 67, 68];
    for (let i = 0; i < 12; i++) {
      const bar = 61 + i, u = i % 6;
      const cut = bar === 66 || bar === 70 || bar === 72;      // 66 and 72: contrary approaches; 70/4: the band breathes, the bed holds
      riff(bar, cycC[i], 0.66, 0.58, true, cut);
      const ch = chC[i];
      const kib = kibBars.includes(bar);
      const tAmp = bar === 69 ? 0.8 : bar === 70 ? 0.74 : bar === 63 ? 0.92 : (kib ? 0.85 : 1.0) * 0.92 * [0.92, 0.96, 1.0, 0.97, 0.94, 0.88][u];
      if (cellC[i]) tick(bar, cellC[i], tAmp);
      tamb8(bar, bar < 67 ? 0.46 : 0.48, i % 3 === 0 ? 1.1 : 0.95, bar === 70 ? 3 : 4);
      // jingle rolls into the phrase seams only (62 -> 63, 66 -> 67, 72 -> 73), plus a soft shake through the breath
      if (bar === 62) { roll.hit(B(bar, 4), 1, 0.32, { from: 0.4, to: 0.8 }); tambFill(bar, 0.38); }
      kickOom(bar, ROOT[cycC[i]], 0.45, !cut && i < 11, ROOT[cycC[i + 1] || 'F7']);
      const beats = bar === 70 ? [2] : [2, 4];
      // in the KIBBITZ bars the accordion player's left hand keeps the chop (right hand: the tune); no mandolin
      if (bar === 63) {
        // under the C6 suspension: the beat-2 chop has no B (G3 D4), the mandolin's 2& pah no B4 (G4 D5 G5)
        clap.hit(B(63, 2), 0.5, 0.46 * 0.8); chop.chord(B(63, 2), 0.2, ['G3', 'D4'], 0.46); pah(63, 'G', 0.46, [4]);
        mand.chord(B(63, 2.5), 0.5, ['G4', 'D5', 'G5'], 0.38 * 0.7, { strum: 0.012, pan: 0.3 });
        mand.chord(B(63, 4.5), 0.5, PAH.G, 0.38 * 0.7, { strum: 0.012, pan: 0.3 });
      } else pah(bar, ch, kib ? 0.4 : 0.46, beats);
      if (!kib && bar !== 63) pahs(bar, ch, [63, 64, 71, 72].includes(bar) ? (bar === 64 ? 0.35 : 0.38) : bar === 70 ? 0.42 : 0.46, bar === 70 ? [2.5] : [2.5, 4.5]);
      shaker(bar, bar === 70 ? 3 : 4, 0.46);
    }
    // the 70/4 breath: the drums and plucks stop, the bed, the tremolo line and the 808 hold; a shake and a ghost carry it
    tambR.hit(B(70, 4), 1, 0.55, { stroke: 'shake' });
    roll.hit(B(70, 4), 1, 0.26, { from: 0.3, to: 0.65 });
    shk.note(B(70, 4.57), 0.2, null, 0.2);
    // the 808: 18 c flat, its glide only at the phrase ends (64, 66, 70, 72), lengths that breathe with the phrase
    const G8 = { glide: -1.5 };
    sub.note(B(61), 2.5, 'B1', 0.64); sub.note(B(62, 3), 1.5, 'B1', 0.5);
    sub.note(B(63), 4, 'G1', 0.62); sub.note(B(64, 3), 1.5, 'G1', 0.5, G8);
    sub.note(B(65), 2, 'E1', 0.62); sub.note(B(66), 1.5, 'F#1', 0.52, G8);
    sub.note(B(67), 2, 'B1', 0.64); sub.note(B(68), 1.5, 'B1', 0.56); sub.note(B(68, 3), 1.5, 'F#1', 0.48);
    sub.note(B(69), 2, 'B1', 0.6); sub.note(B(69, 4), 1, 'F#1', 0.5);  // F#1 -> G1 under the link's A5 -> G5 (contrary)
    sub.note(B(70), 3.6, 'G1', 0.58, G8);                      // its tail (and glide) crosses the breath
    sub.note(B(71, 1.06), 2, 'E1', 0.56);                     // a 64th late: not stacked on the re-entry transient
    sub.note(B(72), 1, 'C#2', 0.5); sub.note(B(72, 2), 1.4, 'F#1', 0.54, G8);   // with the pizz: C#2 F#1
    // KIBBITZ: the CALL's fall in diminution (16ths, a step higher) on the accordion (musette), the leap a 4th (D5 -> G5),
    // open on D5 (61-62); closed in 67-68 by a rising turn (E5 F#5 G5 F#5 E5) and the tonic encircled (C#5 B4 A#4 B4)
    accLead.play(B(61), "_:e mf F#5:s' E5:s' D5:s' C#5:s' D5:e' G5:q'! F#5:e' E5:e' | D5:e' B4:e' A#4:q' C#5:e' D5:q _:e", { shape: 'arch' });
    accLead.play(B(67), "mf F#5:e' F#5:e' D5:e' E5:e' G5:e'! E5:q' F#5:e' | C#5:e' B4:e' A#4:e' B4:e' F#5:q D5:e' B4:e'", { shape: 'arch' });
    // 63-65: the CALL developed, a 4th up and over G, displaced to 1& (B5 A5 F#5, the tritone leap onto C6 on 3 = a 4-3
    // suspension resolving onto B5 on 4, inside the bar), then it climbs to D6, held as a 7th over Em6 and sighing to
    // C#6 (7 -> 6), the 5th of F#7 in 66
    whisC.play(B(63), "_:e mp B5:e A5:e F#5:e C6:q! B5:h ~:e A5:e B5:e D6:h! ~:e C#6:h. _:q", { ...WX, vibrato: 0.12, fall: -40 });
    // the counter-line under it: the accordion player stays on, soft, in contrary motion
    accLead.play(B(63), "p D5:h. E5:q | E5:q. D5:e B4:h", { shape: 'dim', vel: 0.34 });
    // 71-72 the PEAK: up the Em6 chord to E6 (the top of the cue), held into F#7b9 as its 7th, then D6 -> C#6 -> A#5
    // (b13 -> 5 -> 3): the leading tone that the turnaround's bells and C6 -> A#5 -> B5 take home
    // (mp, its own less-sharp take, the bus dipped: the gesture stays, the nag goes)
    whisC.play(B(71), "_:q mp B5:e C#6:e E6:h. D6:e! C#6:e A#5:q _:q", { ...WX, fall: -45, vibrato: 0.1 });
    // 69-70 the LINK: the KIBBITZ answer pushed up a step at a time (C#5 D5 E5 F#5 A5), then G5 with its leading-note
    // turn, held through the 70/4 breath; the PEAK's B5 C#6 E6 takes it up (the plateau keeps climbing into the top)
    // (the G5 overlaps the PEAK's entry by an 8th: the line is handed on, not dropped)
    accLead.play(B(69), "_:e mp C#5:e' D5:e' E5:e' F#5:q A5:q | G5:q. F#5:e G5:h ~:e", { shape: 'cresc', shapeAmt: 0.15 });
    // the D5 line on the tremolo mandolin (new colour in the plateau), under the KIBBITZ answer and the LINK
    // (panned off the centre, opposite the KIBBITZ: the plateau opens up)
    const TP = { pan: 0.35 };
    trem.note(B(67), 4, 'B4', 0.4, TP); trem.note(B(68), 4, 'A#4', 0.4, { ...TP, tag: 'tension' }); trem.note(B(69), 4, 'A4', 0.4, TP);
    trem.note(B(70), 8, 'G4', 0.4, { ...TP, expr: [[0, 1], [0.4, 1.05], [1, 0.95]] });
    trem.note(B(72), 2, 'G4', 0.38, { ...TP, tag: 'tension' }); trem.note(B(72, 3), 2, 'F#4', 0.36, TP);
    // CONTRARY APPROACHES (8th-triplets on beat 4), two only: into 67 (bass falls, bells rise) and into 73 (the reverse)
    const contrary = (bar, bass, bells, land, bellVel = 0.48, glockUp = 12, tubaT = tubaUp) => {
      tuba.play(B(bar, 4), bass.map((p) => `${p}:et'`).join(' '), { vel: 0.44, transpose: tubaT });
      pz.play(B(bar, 4), bass.map((p) => `${p}:et'`).join(' '), { vel: 0.5 });
      cel.play(B(bar, 4), bells.map((p) => `${p}:et`).join(' '), { vel: bellVel });
      glock.play(B(bar, 4), bells.map((p) => `${p}:et`).join(' '), { vel: 0.22, transpose: glockUp });
      cel.note(B(bar + 1), 1, land, bellVel + 0.04);
    };
    contrary(66, ['E2', 'D2', 'C#2'], ['A#5', 'B5', 'C#6'], 'D6');          // -> Bm: B1 / D6 (the 3rd); C#2 -> B1 under C#6 -> D6
    contrary(72, ['F#1', 'A#1', 'B1'], ['E6', 'D#6', 'D6'], 'C6', 0.44, 0, 0); // -> C: the F#7 arpeggio leans into the bII (tuba B1 -> C2 too)
    roll.hit(B(66, 3), 0.95, 0.34, { from: 0.35, to: 0.8 });
    roll.hit(B(72, 3), 0.95, 0.34, { from: 0.35, to: 0.8 });
    push(64, 4.5, ['B3', 'D4', 'G4'], 0.38, 'G2');
    // pads: low under the whistle (63-64, 71), fuller in the bed bars; none in the KIBBITZ bars
    // 63: open (G3 D4 G4, no 3rd) under the C6 suspension; the B4 enters with its resolution on 63/4
    acc.chord(B(63), 8, ['G3', 'D4', 'G4'], 0.27, { expr: bellows() });
    acc.note(B(63, 4), 5, 'B4', 0.25, { expr: [[0, 0.8], [0.3, 1], [1, 0.9]] });
    pad(65, 4, 'Em6', 0.36);
    acc.chord(B(66), 3, PAD.F7, 0.38, { expr: 'flat' });
    acc.note(B(66), 2, 'G4', 0.38, { tag: 'tension' }); acc.note(B(66, 3), 1, 'F#4', 0.36);
    // 69-70: no pad (the accordionist's right hand plays the LINK, the left hand chops); the link's held G5, the tremolo
    // G4 and the 808 are the bed through the breath
    pad(71, 4, 'Em6', 0.28);

    // ================================================================ TURNAROUND 73-74 (Neapolitan, played through)
    s.section('Turn', B(73), B(75), 'tension');
    pizzMain = pizzA; tubaUp = 0;
    pz.play(B(73), RIFF.C, { vel: 0.6 });
    tuba.play(B(73), TUBA.C, TG);
    sub.note(B(73), 2, 'C2', 0.56);
    acc.chord(B(73), 4, PAD.C, 0.35, { expr: 'flat' });
    kickOom(73, 'C2', 0.5, true, 'F#1'); pah(73, 'C', 0.36); tamb8(73, 0.43);
    shaker(73, 4, 0.41);                                // its 3rd-beat grain overshot in the AAC decode
    tick(73, "G4:e@.6 G4:e@.36 A4:e@.5 G4:e@.36 F#4:e@.48 G4:e@.36 G4:e@.56 _:e", 0.95);
    // the b2 is held (C6), then A#5, then (bar 1) B5: the diminished third crosses the seam
    cel.play(B(73, 3), "p _:e D6:e C6:q", {});
    cel.note(B(74), 1, 'A#5', 0.4);
    // 74: F#7 straight through (no stop at the wrap: the Intro continues it), the bass pickup A#1 on 4&
    pz.play(B(74), "F#1:q' C#2:e' F#1:e' E2:q' C#2:e' A#1:e'", { vel: 0.58 });
    tuba.play(B(74), "F#1:q@.58 _:q _:q C#2:e@.48 A#1:e@.46", TG);   // no C#2 against the pizz's E2 on 3
    sub.note(B(74), 1.5, 'F#1', 0.52, G8);
    acc.chord(B(74), 3.6, PAD.F74, 0.36, { expr: [[0, 1], [0.7, 0.9], [1, 0.8]] });     // top voice G4 (bar 73) -> F#4
    kick.note(B(74), 0.5, 'F#1', 0.56);
    pah(74, 'F7', 0.34, [2, 4]);
    tick(74, ghostEnd(TICKF), 0.9);
    tamb8(74, 0.43);
    shaker(74, 4, 0.45);
    zils.note(B(74, 3), 1, 'F#6', 0.3);

    s.length(B(BAR_COUNT + 1));
  },
};
