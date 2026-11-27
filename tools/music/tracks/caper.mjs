// "Caper" - Concept B "Clockwork Caper" of the Kugel style bible (STYLE.md 4.3): a fast, tense-comic heist cue
// for ranked matches and the final minute.            node tools/music/render.mjs caper
// (the D-only final-minute loop: node tools/music/render.mjs caper_final, see tracks/caper_final.mjs; it plays D TWICE =
// 64 bars = 58.2 s, the second pass varied (the question on the theremin, the climax an octave lower), so one pass of
// the file covers the final minute and the top-of-cue climax never comes twice in 30 s. Its length is deliberately
// outside the 2:30-3:30 target and it is mastered at FINAL_LUFS, inside the -17..-15 window and ~0.5 LU under the level
// of bar 141-172 inside the full cue, so the analyzer verdict fails it on length only)
//
// TEMPO / METRE: 132 BPM, 2/4 oom-pah (a bar = 0.909 s). 180 bars = 2:43.6, the whole file loops.
// TONIC E. E Phrygian (E F G A B C D) in the A sections, E Freygish (E F G# A B C D) in B and D,
// E harmonic minor over a B (dominant) pedal in the half-time heist section H, and ONE REGION SHIFT: D3 steps the whole
// band up a semitone into F Freygish (F F Ebm C° | Gb Gb F F) and falls back onto E for the climax (D7 at large).
// The whole cue is a large-scale chromatic encirclement of E: every A phrase falls onto E from F (b2, Phrygian),
// the D3 region falls onto E from F, the loop seam rises onto E from D# (the leading tone, D4).
//
// IN-POINTS for the game (seconds of the file; the stretch to whole AAC frames moves them by < 12 ms):
//   bar 85 H heist 76.364 s | bar 109 A' 98.182 s | bar 141 D peak 127.273 s. A "final minute" start should seek to
//   bar 109 or 141, or play caper_final (D twice, 64 bars = 58.18 s, loops into itself).
//
// MOTIFS (all our own. Every lead line is checked by script against the hook table of STYLE.md section 3 and the
// Schvitz lead, as ONE phrase across rests of up to 2 beats (top line of each instrument): no 4 consecutive intervals
// shared, no chromatic run longer than 3 semitones, no 2+2 block shuttle. Leads play in about half the bars.)
//   SNEAK  A4 C5 A4 F5 E5 | F5 E5 D5 _ C5 | B4      the A-section HOOK, dry accordion staccato over the F pair (bII):
//                           +3 -3 +8 -1 | +1 -1 -2 . -2 | -1: a leap up, the F-E b2 shuffle (D2) and the C-B b6-5 sigh
//                           (D3) into the Em bar. The pizz doublings play its 8th skeleton (SNEAK8). Statements (f1: the
//                           exact head only 3 times per loop): its head on pizz violas at the loop's head (5); A1 plain;
//                           A3 + pizz violins; A4 the bells alone finish it; A'1 a strict CANON (the celesta 1 beat later,
//                           a 6th below + an octave = a 3rd above, the same rhythm); A'2 in AUGMENTATION; A'3 a 4th up in
//                           the pizz violins (over F | Bb); A'4 only its tail over Dm/F, the bells answer a step lower; in
//                           D: the whistle's question in its rhythm on the downbeat (141), the marimba in DIMINUTION
//                           (16ths, "clockwork", 145) and MIRRORED (149), and in D3 transposed with the region (161).
//                           Inverted in K (pizz violas C4 A3 C4 E3 F3), and it surfaces in the theremin of H (A5 C6 A5 E6 F6).
//   CALL   B6 C7 B6 E6 | F6 E6        toy-bell call (TICK + the b2-1 drop). In A4 an octave lower; A2 has its own
//                           CALL' B5 E6 G6 F6 | E6 C6; A' closes it with a D1 encirclement; K plays it in RETROGRADE
//   TICK   B C B            the pillar B with its b9 neighbour C (bells, the pivot pedal B->C in D, the marimba over B7b9)
//   FLICK  G5 G#5 G5 G5     marimba repeated-note cell, the two modes a semitone apart (D8); over F / B° A5 G#5 A5 A5,
//                           over B7b9 the TICK. In A'1 REGROUPED 3+3+2 over two bars (a clockwork hemiola, the G#s
//                           leaning), and at 139 the G# once on the downbeat (an appoggiatura into G)
//   TUBA   E2 | B1 | E2 | C2.B1 | F2 | C2 | E2 | B1.F2    root-fifth oom-pah, b6-5 sigh C2-B1 (D3), b2-1 pickup F2-E2 (D2);
//                           boom-chick: the accordion's left hand / the guitar's bass string doubles the root on 1 (lighter
//                           than the chord on 2: oom-PAH)
//   GLUE   B3 E4 -> C4 E4 -> C4 F4 -> B3 F4 -> B3 E4   a quiet held musette dyad (5th + root) under the oom-pah in A, B2,
//                           B4, A', D1-D2 and T: the groove never falls into holes; its voice-leading is a semitone game
//   B whistle (the score's pure-tone lead: every phrase LANDS ON A LONG NOTE, warming sharp (+18..+28 c) and falling off;
//   steps more than leaps; slides only on leaps). f1: every phrase has its own ENTRY RHYTHM:
//     Q    off the beat, dotted:  _ B5. C6 B5 | E6 (2.5 beats) A5 C6 A5 D6 (the SNEAK's head, final) | G#5 (a slide down the Freygish tritone D-G#)
//          -> the bells' TICK C7 B6 in the next 8th -> the whistle answers with a 16th PICKUP C6 D6 (call and response
//          inside one beat)
//     ANS  on the downbeat: E6 D6 B5 | G#5 (3 beats, over the F bar: the augmented 2nd) C6 D6 | E6 (4 beats, into B2):
//          the melody takes the whole step D-E while only the bass plays the b2-1 F-E
//     Q2   ON the downbeat, dotted 8th + 16th: G#5. B5 E6 | C6 B5 (held) | _ A5 D6 F6 | E6. D6 G#5 (held), over an
//          accordion counter of b6-5 sighs C5 B4 | A4 G#4 (right, soft)
//     ANS4 syncopated 16ths, tied over the barline: _ A5 C6 E6 D6 B5 E6~ | ~ D6 B5 | C6. B5 A5 F5 | E5 (into the breath)
//   H LEAD (theremin, our own order and shape: pairs in the phone octave, a bell interruption, a swoop, ONE peak on bII,
//          a fall on V, the leading tone resolved on the A' downbeat)
//     H2  E5F5E5F5 E5 | G5F#5 G5 B5 | A5 G#5 A5 F6 E6   pairs from below / above / above, each answered by the celesta
//     H3  B4->B5 swoop | G5 A5 B5 C6~ | B5 D#6 E6 (f1: a stepwise climb, two semitone pairs) | G6 (the peak over
//         C/B = bII) F6 E6~ | G5 (a 6th down), breath |
//         A5 C6 A5 E6 | F6 E6 (over F/B) | F#6 D#6 (the fall over B7b9) | B5 F#5 D#5 -> E5 (bar 109, D4).
//         Semitone sighs only where they carry bII (103, 106): the pairs of H2 get contrast
//   BELLS3 B6 D#7 E7        a RISING 3-beat glock cell (leading tone onto the tonic) against the half-time grid (hemiola)
//   D whistle  the B voice returns at the peak: question ON the downbeat in the SNEAK's rhythm (A5 C6 A5 F6 | E6: the b2
//              an appoggiatura on beat 2), answer from a 16th-triplet run (A5 B5 C6 F6 E6 | D6 C6 D6 | E6 D6 C6 | B5 C6 B5),
//              the theremin answers once in D3 with the H peak recast in the new region (A6 F6, final: the aug. 2nd is kept
//              for the climax)
//   CLIMAX (164-172) pickup C6 D#6 | E6 B5 | C6 B5 G#5 B5 | D6 F6 A6 (Dm) | G#6 F6 E6 (B°) | G#6 held 3.5 beats over the
//              F pair (bII: the augmented 2nd against F, a semitone under A; the violas crescendo A3-F4, a jingle roll) |
//              B6 an 8th | F6 a FULL BEAT over E (b9 against the pivot B4 and the tuba E2) -> E6 held 3 beats, the violas
//              resolving A-G#, F-E with it: the cue's b2-1 paid off in three voices
//
// FORM (bar: time, section, harmony; measured section LUFS after normalisation)
//   I   1-8    0:00.0  Tiptoe: tuba E2 + pizz celli, the glue reeds breathing, a soft kick on every bar (the pulse never
//                     stops across the seam), pizz "pah", marimba FLICK, the SNEAK head on pizz violas (5), a tiny bell
//                     reply (7), kick + clap from 5                                                              ~ -17.7
//   A   9-24   0:07.3  oom-pah, E Phrygian, the LOWEST groove terrace (one tambourine hand + a soft egg shaker, no riq).
//                     Phrase = Em Em Em C | F F Em B° -> F2-E2. A1 9-16 held "pah" + glue + SNEAK; A2 17-24 marimba TICK +
//                     CALL', and a DECEPTIVE end: B° walks B1 D2 into C (bVI) at 25, E arrives a bar late      ~ -16.6
//   A up 25-40 0:21.8  the next terrace: A3 25-34 (C | Em ...) FLICK, reed bed, two hands, SNEAK + pizz violins + a 2-bar
//                     STOP-TIME (tutti hit, celesta D1 flick, shaker); A4 35-40 = 6 bars, low CALL, the bells finish
//                     the SNEAK                                                                                 ~ -16.9
//   B   41-72  0:36.4  E Freygish (THIRD SWAP G->G#): E E Dm B° | E E(G#2 G2) F E. Guitar chop (+ accordion in B3-B4).
//                     Tambourine 8ths in B1/B3, the riq's jingles in B2/B4, shaker 16ths only in B3. B1 whistle Q + ANS
//                     with a bell TICK in the gap; B2 49-56 the groove alone over the glue (walking bass, the bells'
//                     Freygish reply, riq fills); B3 Q2 over the accordion counter, pizz answer in 6ths, 63-68 groove alone
//                     with a STOP at 66 (beat 2: tuba + pizz + riq dum, the glue cut with the band); B4 the whistle's last
//                     answer (69-72); 72 beat 2 = a breath (the whistle's fall-off, two riq teks)            ~ -16.4
//   K   73-84  1:05.5  break, a TERRACE: no kick, tuba quarters, a quiet tremolo pedal on B4; a conversation: the celesta's
//                     D1 cells (74, 80) answered by the SNEAK inverted on low pizz (76) and the CALL in retrograde (82);
//                     ends on B7, drop into H                                                                   ~ -18.0
//   H   85-108 1:16.4  HEIST, half time over a B pedal, 2-bar units Em/B | C/B | Am/B (cycle 1) or F/B (cycles 2-3) |
//                     B7b9. Booms on B1 every 4 bars, mono synth bass + celli pizz, glass
//                     pad, reed stabs alternating L/R and stuttering, half-time clap, riq 16th rolls, the rising BELLS3,
//                     the theremin centre-left against the bells right; 99 the celesta's B7b9 arpeggio         ~ -16.4
//   A'  109-140 1:38.2 oom-pah returns. A'1: SNEAK CANON (celesta) over the clock's 3+3+2 hemiola, CONTRARY approaches
//                     (D6) closing on E6 at 117 and 133; A'2: the varied CALL, the SNEAK in AUGMENTATION, the one SEMITONE
//                     PLANING a whole beat long (124 beat 2 = Eb: chop, stab, glue, reed bed, tuba D#2, marimba A#5 ->
//                     Em at 125, D9), tuba G2 at 126; A'3: no marimba, a lighter backbeat, groove alone 125-128, the SNEAK
//                     a 4th up in the pizz violins, bar 130 a Bb (tuba A#1-B1-E2), and the harmonic rhythm DOUBLES at the
//                     end (131 E2 / C, 132 F2 / B7b9, B1 -> E2: the F2-E2 cadence withheld once); A'4: Dm/F -> B°, the
//                     SNEAK's tail only, the G# downbeat wink (139), riser into D                               ~ -16.2
//   D   141-172 2:07.3 PEAK, E Freygish: E E Dm B° | F F E E. 808 sub with the tuba, 16th jingles, clap backbeat, chop
//                     (accordion, G#4 on top of every E chord; + guitar left in D2 and D4), violas con sordino left
//                     (G#3-E4 / A3-F4 / G#3-F4: semitone voice-leading); the PIVOT PEDAL (D7, right) breathes like
//                     a bellows (B4, C5 over F; a 2-beat push every 4th bar; a D1 turn rising into the F at 152).
//                     D1 the whistle question (SNEAK head); 145-152 the CLOCKWORK: SNEAK diminution on marimba + glock
//                     pings, its mirror over E, the reed's b6-5 sighs over Dm | B°; D2 the whistle answer; D3 157-164 REGION
//                     SHIFT to F Freygish: the tremolo pivot C5 (left + right) -> C#5 over Gb -> C5, brass + reed hits,
//                     the theremin's A6 F6 and a C° climb, the SNEAK a semitone up (reed + pizz in 3rds); the bass
//                     F2 falls onto E2: D4 the CLIMAX back in E (pivot C5 -> B4), see CLIMAX above             ~ -14.6
//   T   173-180 2:36.4 turnaround: Neapolitan F | B7b9 (D9), light kick and chop, the violas then the glue, marimba
//                     FLICK / TICK into the intro; bar 180 = B, a light chop on 2, tuba D#2 -> E2 of bar 1 (D4)  ~ -16.0
//
// SEMITONE DEVICES: D1 (TICK, bells C B A# B / F E D# E, the pivot's C5 B4 A#4 B4 turn, CALL' E5 D#5 E5, bass C2 B1 A#1
// B1), D2 (F-E everywhere, the climax F6-E6, the glue E4-F4), D3 (C2-B1, C5-B4 sighs, the B3 accordion counter, the
// glue B3-C4), D4 (D#2 at the loop seam, D#5 -> E5 at 109, BELLS3 D#7-E7), D5 (bass G#-G-F-E in B), D6 (contrary
// approaches in A'), D7 (pivot pedal in D, the tremolo B4 in K, the D3 REGION SHIFT up a semitone and back with the
// pivot C5 -> C#5 -> C5 -> B4), D8 (FLICK, the third swap, the G# downbeat wink), D9 (F-B7-E turnaround, one Eb->Em
// planing, F/B over the pedal, the Bb bar, the doubled harmonic rhythm of 131-132), D12 (whistle/theremin scoops,
// fall-offs, sharp drift, slides on leaps).
//
// SURPRISES (about every 15 s): 4 s the SNEAK head on pizz; 7 s band + SNEAK; 16 s CALL'; 29 s stop-time + bell flick;
// 22 s the deceptive C; 36 s third swap + whistle; 40 s whistle - bells - whistle in one beat; 45 s the bells' Freygish reply; 51 s Q2 + counter-line; 59 s the stop on beat 2; 65 s
// breath + break; 68 s the SNEAK upside down on low pizz; 77 s boom + half time; 84 s the theremin pairs; 90 s celesta
// interrupts, the swoop; 93 s G6 peak; 98 s slam back + stretto over the hemiola clock; 109 s augmented SNEAK + Eb
// planing; 117 s the Bb bar; 127 s riser, 808 + the whistle at the peak; 131 s the clockwork SNEAK; 142 s the whole
// band a semitone up; 149 s climax.
//
// FEEL: every part has a fixed push or lag (tuba +4.5 ms, chop and clap pushed 5 ms, jingles +7 ms, whistle and theremin
// +9-14 ms) plus a SHARED ensemble drift (+-5 ms over several bars, applied once per lead phrase so its slur holds) and
// a phrase push (the phrase-end bar a little early, the next downbeat laid back); leads are shaped (phrase arches,
// lifted peaks, dropped tails); bell phrases lean on the first stroke and taper; tuba, chop, clap, marimba and stabs
// follow a velocity arch per phrase; one jingle instrument per phrase (two hands, close together).
//
// MIX: mid-forward and dry like the score; low end mono (tuba, 808, kick, synth, boom sub); the tuba's 2nd-4th harmonics
// lifted (330 Hz, saturation) and a kick beater click so the oom reads on phones; everything above ~200 Hz spread:
// marimba left (0.72), bells right (0.65), pizz wide (1.9), chops +-0.75, theremin -0.25 (centre-left: a cousin of
// Schvitz C, not its layout) against the glock +0.6, glass split, stabs alternate, in D the guitar chop and violas left
// against the pivot pedal right; leads close (reverb 0.13-0.16).
// f1, measured lead stem vs the rest of the mix inside its phrases (normalisation undone): B whistle -4.5..-6.5 LU, H
// theremin -4.5..-5.5, D whistle -3.8 (question) -> -2.2 (answer) -> -1.5 (climax); in D1-D2 the chop and pizz play
// lighter and their buses dip 1.5 dB while the whistle plays, the pivot pedal too. Phone: every section loses <= 1.5 LU
// after a 150 Hz high-pass (the tuba's fundamental shelved, its 4th-5th harmonics lifted at 330 Hz, brighter ooms in A, K
// and T); the top keeps a continuous shimmer (ringing jingles, a soft egg shaker in 16ths, notches on the jingle lines).
// caper_final is mastered at FINAL_LUFS (-15.25: -15.0, -15.15 and -15.2 hit the same one-sample AAC encoder glitch).
// FINAL ROUND: the low-pizz pah is chord-aware (pahOf: the voicing's lowest tone a 4th+ above the oom, no blind fifth);
// the marimba's G# off beat 2 on F / B° bars; A, A' and T hold their pah (longer chop + bass button, release 0.1 s) over
// a glue 1.5 dB up; the A3 / A'2 beds on violas con sordino; K's jingles on the riq (no fixed tambourine 'ting'), a
// 4.6 kHz notch on the jingles; the 808 1.5 dB down; the climax extremes trimmed; the second wedge (132) a D1 turn.

import { swingGroove, hatRoll } from '../engine.mjs';

const BPM = 132;
// caper_final: inside the -17..-15 window, ~0.5 LU under D inside the full cue (an inaudible step when the game switches)
const FINAL_LUFS = -15.25;   // final: -15.15 and -15.2 glitched in the AAC encoder (25.9 s, +1.07 dBTP; 27.2 s)

// close "pah" voicings (G3-F4) and their first inversions (B3-A4) for the chop / stabs
// (+ the F-Freygish region of D3: F#  = Gb, D#m = Ebm, Co = C°; Bb = the one tritone-substitute bar of A'3)
const V = {
  Em: ['G3', 'B3', 'E4'], E: ['G#3', 'B3', 'E4'], C: ['G3', 'C4', 'E4'], F: ['A3', 'C4', 'F4'],
  Dm: ['A3', 'D4', 'F4'], Bo: ['B3', 'D4', 'F4'], Am: ['A3', 'C4', 'E4'], B7b9: ['A3', 'C4', 'D#4'],
  B7: ['A3', 'D#4', 'F#4'], Eb: ['G3', 'A#3', 'D#4'],
  'F#': ['F#3', 'A#3', 'C#4'], 'D#m': ['F#3', 'A#3', 'D#4'], Co: ['F#3', 'C4', 'D#4'], Bb: ['A#3', 'D4', 'F4'],
};
const V2 = {
  Em: ['B3', 'E4', 'G4'], E: ['B3', 'E4', 'G#4'], C: ['C4', 'E4', 'G4'], F: ['C4', 'F4', 'A4'],
  Dm: ['D4', 'F4', 'A4'], Bo: ['D4', 'F4', 'B4'], Am: ['C4', 'E4', 'A4'], B7b9: ['C4', 'D#4', 'A4'],
  B7: ['D#4', 'F#4', 'A4'], Eb: ['A#3', 'D#4', 'G4'],
  'F#': ['A#3', 'C#4', 'F#4'], 'D#m': ['A#3', 'D#4', 'F#4'], Co: ['C4', 'D#4', 'F#4'], Bb: ['D4', 'F4', 'A#4'],
};
// glass pad voicings over the B pedal (H): high while the theremin is low (85-100), low under its high line (101-108)
const GLASS = { Em: ['B4', 'E5', 'G5'], C: ['E5', 'G5', 'C6'], Am: ['C5', 'E5', 'A5'], F: ['C5', 'F5', 'A5'], B7b9: ['C5', 'D#5', 'A5'] };
const GLASS_LO = { Em: ['B3', 'E4', 'G4'], C: ['C4', 'E4', 'G4'], Am: ['C4', 'E4', 'A4'], F: ['C4', 'F4', 'A4'], B7b9: ['C4', 'D#4', 'A4'] };
// trombone / horn register under the reed hits in D3 (they speak, and the phone hears them)
const BRASS = { E: ['E3', 'B3', 'E4'], F: ['F3', 'C4', 'F4'], Dm: ['D3', 'A3', 'D4'], Bo: ['F3', 'B3', 'D4'], 'F#': ['F#3', 'C#4', 'F#4'], 'D#m': ['D#3', 'A#3', 'D#4'], Co: ['F#3', 'C4', 'D#4'] };
// the GLUE: a quiet held musette dyad (5th + root) under the oom-pah, so the groove never falls into holes between the
// oom and the pah (the score's grooves are flat inside a section). Its voice-leading is itself a semitone game:
// B3 E4 -> C4 E4 (b6-5 sigh, inverted) -> C4 F4 (the E-F rub) -> B3 F4 (tritone) -> B3 E4
const GLUE = {
  Em: ['B3', 'E4'], E: ['B3', 'E4'], C: ['C4', 'E4'], F: ['C4', 'F4'], Bo: ['B3', 'F4'], Dm: ['A3', 'D4'], B7b9: ['B3', 'D#4'], B7: ['B3', 'D#4'],
  'F#': ['C#4', 'F#4'], 'D#m': ['A#3', 'D#4'], Co: ['C4', 'F#4'], Bb: ['A#3', 'D4'],
};

// A phrase (Phrygian): c = chord, t = tuba on 1, p = tuba pickup on 2&
const PA = [
  { c: 'Em', t: 'E2' }, { c: 'Em', t: 'B1' }, { c: 'Em', t: 'E2' }, { c: 'C', t: 'C2', p: 'B1' },
  { c: 'F', t: 'F2' }, { c: 'F', t: 'C2' }, { c: 'Em', t: 'E2' }, { c: 'Bo', t: 'B1', p: 'F2' },
];
const PA6 = [PA[0], PA[1], PA[4], PA[5], PA[6], PA[7]];
// the same phrase with walking pickups (B1-D2 -> E2, C2-D2 -> E2) and a bounce on bar 3
const PAW = PA.map((h, i) => (i === 1 || i === 5 ? { ...h, p: 'D2' } : i === 2 ? { ...h, b: 'B1' } : h));
// A'4: the F pair re-harmonised as Dm/F, then B° (the C5-B4 sigh lands over a B° pickup chord)
const PAR = PAW.map((h, i) => (i === 4 ? { c: 'Dm', t: 'F2' } : i === 5 ? { c: 'Bo', t: 'B1', p: 'D2' } : h));
// B / D phrases (Freygish): the vii colour is a passing B° whose F2 falls onto E2 (b2-1 in the bass)
const PB = [
  { c: 'E', t: 'E2' }, { c: 'E', t: 'B1' }, { c: 'Dm', t: 'D2' }, { c: 'Bo', t: 'F2' },
  { c: 'E', t: 'E2' }, { c: 'E', t: 'G#2', p: 'G2' }, { c: 'F', t: 'F2' }, { c: 'E', t: 'E2', p: 'B1' },
];
const PD = [
  { c: 'E', t: 'E2' }, { c: 'E', t: 'B1' }, { c: 'Dm', t: 'D2' }, { c: 'Bo', t: 'B1', p: 'E2' },
  { c: 'F', t: 'F2' }, { c: 'F', t: 'C2' }, { c: 'E', t: 'E2' }, { c: 'E', t: 'B1', p: 'F2' },
];
// D3 (157-164) steps the whole groove UP A SEMITONE into F Freygish (the region shift of STYLE.md section 2, with the
// pivot pedal): F F Ebm C° | Gb Gb F F; the last pickup F2 falls onto the E2 of D4 (b2-1 at the scale of the region)
const PD3 = [
  { c: 'F', t: 'F2' }, { c: 'F', t: 'C2' }, { c: 'D#m', t: 'D#2' }, { c: 'Co', t: 'C2', p: 'F2' },
  { c: 'F#', t: 'F#2' }, { c: 'F#', t: 'C#2' }, { c: 'F', t: 'F2' }, { c: 'F', t: 'C2', p: 'F2' },
];
const SUB = { E2: 'E1', B1: 'B1', D2: 'D2', A1: 'A1', F2: 'F1', C2: 'C2', 'G#2': 'G#1', G2: 'G1', 'D#2': 'D#1', 'F#2': 'F#1', 'C#2': 'C#2' };
// a gentle velocity arch over each 8-bar phrase (on top of the strong/weak bar alternation)
const ARCH = [0.98, 0.95, 1.0, 0.97, 1.03, 0.99, 1.02, 0.98];

// SNEAK, the A hook (2 bars over F F + the landing on the Em bar)
const SNEAK = "A4:.5' C5:.25' A4:.25' F5:.5' E5:.5' | F5:.25' E5:.25' D5:.5' _:.5 C5:.5' | B4:.5' _:1.5";
// its 8th-note skeleton for the pizzicato doublings (a string section does not pluck alternating 16ths at 132 cleanly:
// the 16th neighbours stay with the accordion and the bells)
const SNEAK8 = "A4:.5' C5:.5' F5:.5' E5:.5' | F5:.5' D5:.5' _:.5 C5:.5' | B4:.5' _:1.5";

export function makeCaper(variant = 'full') {
  const full = variant === 'full';
  let OFF = full ? 0 : 140;              // caper_final: bar 141 of the full cue = bar 1
  return {
    id: full ? 'caper' : 'caper_final',
    title: full ? 'Caper' : 'Caper (final minute)',
    bpm: BPM,
    loop: true,

    build(s) {
      s.meter(2, 4);
      s.reverb({ rt60: 1.1, predelay: 0.012, damping: 0.5 });
      s.room('room');
      s.delay({ beats: 0.75, feedback: 0.22, pingpong: true });
      s.master({ lufs: full ? -16.25 : FINAL_LUFS, ceiling: -2.6, eq: [{ type: 'peak', f: 3500, q: 0.8, gain: 1 }] });   // f1: -16.2 / -2.6: the native AAC encoder put a one-sample glitch at 127.7 s with -16.2 / -2.5 and -16.3 / -2.7; final: -16.25 (-16.2 glitched at 11.9 / 89.0 s; decoded clean at -16.25)
      s.humanize = { time: 0.004, vel: 0.05 };
      const B = (bar, beat = 1) => s.bar(bar - OFF, beat);
      // a part with a fixed push (-) or lag (+) in beats: the band's pocket (0.01 beat = 4.5 ms)
      // + a shared ensemble drift (the whole band breathes together, +-5 ms over several bars) and PUSH, a phrase-level
      // push into the phrase-end bar and a lay-back on the downbeat after it (set by oomPah)
      const rDrift = s.rng('ensemble'), DR = Array.from({ length: 64 }, () => 2 * rDrift() - 1);
      const drift = (b) => { const x = Math.max(0, b) / 16, k = Math.floor(x), f = x - k, w = (1 - Math.cos(Math.PI * f)) / 2; return 0.012 * (DR[k % 64] * (1 - w) + DR[(k + 1) % 64] * w); };
      let PUSH = 0;
      const lay = (p, off) => new Proxy(p, {
        get(t, k) {
          if (k === '__lay') return { raw: t, off };   // legLine shifts a whole line once (the chain must stay joined)
          const v = t[k];
          if (typeof v !== 'function') return v;
          if (k === 'note' || k === 'hit' || k === 'chord' || k === 'play' || k === 'arp' || k === 'roll') return (b, ...r) => v.call(t, b + off + drift(b) + PUSH, ...r);
          return v.bind(t);
        },
      });
      const rChop = s.rng('chop'), rJing = s.rng('jingles'), rMar = s.rng('marimba'), rTuba = s.rng('tuba');

      // ---------------------------------------------------------------- buses
      const leadEq = [{ type: 'peak', f: 1300, q: 1, gain: -2 }];
      // the tuba's 2nd-4th harmonics carry the oom on phones: a lift at 280 Hz and more saturation (round 4)
      const busTuba = s.bus('tuba', { gain: -7, room: 0.04, sat: 5, comp: { threshold: -20, ratio: 3, attack: 0.002, release: 0.09, knee: 6 }, eq: [{ type: 'hp', f: 32 }, { type: 'lowshelf', f: 115, gain: -6.5 }, { type: 'peak', f: 330, q: 1, gain: 3.5 }, { type: 'lp', f: 9000, q: 0.7 }] });
      const bus808 = s.bus('808', { gain: -8.5, eq: [{ type: 'hp', f: 38 }] });   // f1: 2 dB down, final 1.5 more (the tuba's harmonics carry the line on phones; limiter headroom)
      const busKick = s.bus('kick', { gain: -10.5, comp: { threshold: -20, ratio: 4, attack: 0.001, release: 0.05, knee: 4 }, eq: [{ type: 'lowshelf', f: 90, gain: -2 }, { type: 'peak', f: 3500, q: 1.4, gain: 5 }] });
      const busKit = s.bus('kit', { gain: -7, room: 0.1, sat: 3 });
      const busJing = s.bus('jingles', { gain: -6.5, width: 1.2, room: 0.06, eq: [{ type: 'peak', f: 3500, q: 0.8, gain: -1.5 }, { type: 'peak', f: 4600, q: 6, gain: -4 }, { type: 'peak', f: 6750, q: 6, gain: -4 }, { type: 'peak', f: 6690, q: 12, gain: -2.5 }, { type: 'peak', f: 10950, q: 6, gain: -3 }, { type: 'highshelf', f: 9000, q: 0.7, gain: -1 }, { type: 'lp', f: 18000, q: 0.6 }] });   // f1: notches on the jingles' fixed lines, the air opened (a ringing shimmer, not clicks); final: + 4.6 kHz (the 'ting' of K)
      // the chop: wide (two accordions at +-0.75), a little more room, a gentle saturation that rounds the reed pulses'
      // crest at the onset (they set the limiter's work in round 2)
      const busChop = s.bus('chop', { gain: -4, room: 0.115, reverb: 0.04, width: 1.6, sat: 4, comp: { threshold: -24, ratio: 3, attack: 0.001, release: 0.08, knee: 6 }, eq: [{ type: 'hp', f: 160 }, { type: 'peak', f: 380, q: 1.2, gain: -3 }, { type: 'peak', f: 1800, q: 0.8, gain: 3 }, { type: 'peak', f: 2800, q: 0.7, gain: 3.5 }] });
      const busAcc = s.bus('accordion', { gain: -3, reverb: 0.17, width: 1.8, pan: 0.12, eq: [{ type: 'peak', f: 988, q: 4, gain: -2 }, { type: 'peak', f: 2200, q: 0.8, gain: 3 }] });
      const busReed = s.bus('reed', { gain: -6, reverb: 0.12, room: 0.08, pan: 0.22, eq: [{ type: 'hp', f: 180 }, { type: 'peak', f: 2200, q: 0.8, gain: 3 }] });
      const busPizz = s.bus('pizz', { gain: -2, sat: 3, comp: { threshold: -28, ratio: 4, attack: 0.0005, release: 0.06, knee: 6 }, room: 0.03, reverb: 0.17, width: 1.9, eq: [{ type: 'hp', f: 70 }, { type: 'peak', f: 1800, q: 0.8, gain: 2 }, { type: 'peak', f: 3000, q: 0.8, gain: 4 }, { type: 'highshelf', f: 2000, q: 0.7, gain: 1 }] });
      const busBells = s.bus('bells', { gain: -6, pan: 0.65, reverb: 0.16, delay: 0.1, eq: [{ type: 'peak', f: 2700, q: 3, gain: -3 }] });
      const busMar = s.bus('marimba', { gain: -2, pan: -0.72, reverb: 0.1 });
      // the leads are close and dry like the score's (less reverb than round 4: they sat behind the band)
      const busLead = s.bus('lead', { gain: -8.5, pan: -0.12, reverb: 0.13, delay: 0.05, eq: leadEq });
      // the theremin left (Schvitz C layout) against the glock right; a notch on its static 7.95 kHz resonance
      const busTher = s.bus('theremin', { gain: -8.5, pan: -0.25, reverb: 0.16, eq: [...leadEq, { type: 'peak', f: 7950, q: 8, gain: -8 }] });
      // D: the whistle returns at the peak on its own bus (no 1.3 kHz dip: its climax fundamentals sit at 1.2-2 kHz)
      const busLeadD = s.bus('leadD', { gain: -5.5, pan: -0.06, reverb: 0.13, delay: 0.05, eq: [{ type: 'peak', f: 500, q: 1, gain: -1 }, { type: 'peak', f: 2000, q: 1, gain: -1 }] });   // f1: +1 dB, the 700 Hz dip moved off its G#5-A5
      const busSynth = s.bus('synth', { gain: -13.5, eq: [{ type: 'lowshelf', f: 90, gain: -2 }, { type: 'peak', f: 180, q: 1, gain: 2 }, { type: 'lp', f: 9000, q: 0.7 }] });
      const busGlass = s.bus('glass', { gain: -11.5, reverb: 0.28, width: 1.8 });
      const busStab = s.bus('stabs', { gain: -12.5, reverb: 0.08, width: 1.8, sat: 2, comp: { threshold: -18, ratio: 3, attack: 0.002, release: 0.06, knee: 6 }, eq: [{ type: 'peak', f: 2500, q: 1, gain: 2 }] });
      const busFx = s.bus('fx', { gain: -11, reverb: 0.15, eq: [{ type: 'hp', f: 35 }] });
      const busTrem = s.bus('tremolo', { gain: -12.5, pan: 0.2, reverb: 0.15 });   // K: the pedal carries the break's mid-range on phones (f1: +2.5 dB)
      // the glue reeds: a second, softer accordion, wide, behind the chop (see GLUE)
      const busGlue = s.bus('glue', { gain: -9.5, pan: -0.15, width: 1.4, room: 0.06, reverb: 0.1, eq: [{ type: 'hp', f: 180 }, { type: 'peak', f: 988, q: 4, gain: -2 }, { type: 'highshelf', f: 4000, q: 0.7, gain: -3 }] });

      // f1: in D1-D2 the held dyads move from a third accordion to violas con sordino (one reed family was stacked 4-5 deep)
      const busStr = s.bus('strings', { gain: -9, pan: -0.4, width: 1.4, reverb: 0.16, eq: [{ type: 'hp', f: 180 }, { type: 'peak', f: 2000, q: 0.8, gain: 1.5 }] });

      // ---------------------------------------------------------------- parts (with their pocket)
      const tight = { time: 0.003, vel: 0.04 };
      const tuba = lay(s.part(busTuba, 'tuba', { bright: 1.4, humanize: tight }), 0.01);
      const s808 = lay(s.part(bus808, 'sub808', { tune: -15, humanize: tight }), 0.01);
      const kick = lay(s.part(busKick, 'kick', { click: 1.6, humanize: tight }), 0);
      const clap = lay(s.part(busKit, 'clap'), -0.012);
      const snare = lay(s.part(busKit, 'snare'), -0.012);
      const hat = lay(s.part(busKit, 'hat', { pan: 0.2 }), 0.01);
      // one tambourine player, two hands (close together, right of centre); the shaker is the second player
      const tambA = lay(s.part(busJing, 'tambourine', { pan: 0.2, bright: 0.85, skin: 0.2, ring: 0.65, spread: 0.6, name: 'tambourine A' }), 0.015);
      const tambB = lay(s.part(busJing, 'tambourine', { pan: 0.35, bright: 0.98, skin: 0.45, ring: 0.6, spread: 0.6, name: 'tambourine B' }), 0.015);
      const riq = lay(s.part(busJing, 'riq', { pan: 0.3 }), 0.01);
      const roll = s.part(busJing, 'jingleRoll', { spread: 0.4 });
      const shak = lay(s.part(busJing, 'shaker', { pan: 0.25 }), 0.01);
      // f1: a second shaker player (a long, open egg, left of centre): the quiet continuous shake under the tambourine
      // hits, so the top keeps a shimmer between the strokes as in the score's grooves
      const shim = lay(s.part(busJing, 'shaker', { pan: -0.3, decay: 2.4, bright: 1.3, spread: 1.2, name: 'shaker shimmer' }), 0.012);
      const strD = s.part(busStr, 'stringsEnsemble', { section: 'violas', sordino: true, name: 'violas sord' });
      const zils = s.part(busJing, 'fingerCymbals', { pan: 0.2 });
      const chopAcc = lay(s.part(busChop, 'accordion', { chop: true, spread: 1.2, pan: -0.75, amp: 0.75, bright: 1.3 }), -0.012);
      const chopAcc2 = lay(s.part(busChop, 'accordion', { chop: true, spread: 1.2, pan: 0.75, amp: 0.56, name: 'accordion chop R', wet: 0.3, bright: 1.3 }), -0.002);
      const chopGtr = lay(s.part(busChop, 'pluck', { body: 'guitar', double: 1, damp: true, amp: 0.42, bright: 1.2, pan: 0.3 }), -0.008);
      const acc = s.part(busAcc, 'accordion', { spread: 1.4 });
      const reed = lay(s.part(busReed, 'accordion', { spread: 0.8, wet: 0.18, release: 0.05, bright: 1.2, name: 'accordion SNEAK' }), 0.005);
      const pizz = lay(s.part(busPizz, 'stringsPizzicato', { section: 'violas', pan: -0.7 }), 0.005);
      const pizzV = lay(s.part(busPizz, 'stringsPizzicato', { section: 'violins', pan: 0.5, name: 'pizz violins' }), 0.005);
      const pizzLo = lay(s.part(busPizz, 'stringsPizzicato', { section: 'celli', pan: 0.15 }), 0.01);
      const cel = s.part(busBells, 'celesta');
      const glock = s.part(busBells, 'glockenspiel');
      const mar = s.part(busMar, 'marimba', { stereo: 1 });
      // the leads sit in the band's pocket (round 5: 9 ms behind, not 22-25); a whistler slurs 8ths in ~40 ms and slides
      // only on leaps (legLine gives every leap of 4+ semitones its own 80-140 ms slide)
      const whistle = lay(s.part(busLead, 'whistleLead', { amp: 0.9, glide: 0.04 }), 0.02);
      const ther = lay(s.part(busTher, 'thereminLead', { humanize: { time: 0.006, vel: 0.05 } }), 0.03);
      const whistleD = lay(s.part(busLeadD, 'whistleLead', { amp: 0.9, glide: 0.04, name: 'whistle D' }), 0.02);
      const glueAcc = s.part(busGlue, 'accordion', { spread: 1.2, wet: 0.14, musette: 8, attack: 0.06, release: 0.1, name: 'accordion glue' });
      const syn = lay(s.part(busSynth, 'monoSynthBass', { humanize: tight }), 0.005);
      const glass = s.part(busGlass, 'glassPad', { split: 1 });
      const stab = lay(s.part(busStab, 'stab', { kind: 'reed', spread: 1.6 }), -0.01);
      const brass = lay(s.part(busStab, 'stab', { kind: 'brass', spread: 1.2 }), -0.005);
      const boom = s.part(busFx, 'boom', { spread: 1.2 });
      const drop = s.part(busFx, 'dropImpact');
      const riser = s.part(busFx, 'glissRiser');
      const trem = s.part(busTrem, 'pluck', { tremolo: true, sharp: 25 });

      // ---------------------------------------------------------------- helpers
      const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      function midiOf(name) {
        const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
        const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
        return base + 12 * (Number(m[3]) + 1);
      }
      function transposeName(name, semis) { const x = midiOf(name) + semis; return NAMES[x % 12] + (Math.floor(x / 12) - 1); }
      // the pah over the tuba: the lowest pitch class of the chord's chop voicing (V) at +5..+12 semitones above the oom
      function pahOf(h) {
        const pcs = new Set((V[h.c] || []).map((p) => midiOf(p) % 12)), t = midiOf(h.t);
        for (let m = t + 5; m <= t + 12; m++) if (pcs.has(m % 12)) return NAMES[m % 12] + (Math.floor(m / 12) - 1);
        return null;
      }
      // a played legato line: [pitch | '_', beats, vel?, extra?]. Velocity follows a phrase shape ('arch' | 'dim');
      // every leap of 4+ semitones gets an audible slide (80-140 ms), as a thereminist / whistler / flautist would play it
      // Round 5: the whole line is shifted ONCE by the part's pocket and the ensemble drift (per-note drift broke the
      // chain apart: every note re-scooped and fell off), so touching notes are one slurred whistle / theremin phrase.
      const legLine = (part, beat, notes, o = {}) => {
        const { vel = 0.6, shape, shapeAmt = 0.2, legato, ...rest } = o;
        const LY = part.__lay;
        const tgt = LY ? LY.raw : part, base = LY ? beat + LY.off + drift(beat) + PUSH : beat;
        const total = notes.reduce((a, x) => a + x[1], 0);
        let at = 0, prev = null;
        for (const [p, d, v, ex] of notes) {
          if (p === '_') { prev = null; at += d; continue; }
          const u = total > 0 ? at / total : 0;
          const sh = shape === 'arch' ? 1 - shapeAmt * (2 * u - 1) ** 2 : shape === 'dim' ? 1 - shapeAmt * u : 1;
          const m = midiOf(p), leap = prev == null ? 0 : Math.abs(m - prev);
          const gl = leap >= 4 ? { glideTime: Math.min(0.14, 0.06 + 0.008 * leap) } : {};
          tgt.note(base + at, d, p, Math.min(1, (v ?? vel) * sh), { ...rest, ...gl, ...(ex || {}), _leg: true });
          prev = m; at += d;
        }
        return beat + at;
      };
      // the same in a short notation: 'E6:1.5@0.6 ~:.5 _:.5 B5:.25 G#5:1@0.5>0.24' (~ = tie to the previous note,
      // >s = the slide into this note in seconds)
      const legPhrase = (part, beat, str, o = {}) => {
        const notes = [];
        for (const tok of str.split(/\s+/)) {
          if (!tok || tok === '|') continue;
          const [, p, d, v, g] = /^([^:]+):([\d.]+)(?:@([\d.]+))?(?:>([\d.]+))?$/.exec(tok);
          if (p === '~') { notes[notes.length - 1][1] += +d; continue; }
          notes.push([p, +d, v == null ? undefined : +v, g == null ? undefined : { glideTime: +g }]);
        }
        return legLine(part, beat, notes, o);
      };
      // every jingle stroke rings a little differently (ring 0.42-0.68). Round 5: one instrument per phrase (a player does
      // not switch instruments stroke by stroke): JRIQ = the off-beats on the riq's jingles (B2, B4), else the tambourine
      let JRIQ = false;
      const RIQF = new Set([52, 56, 64, 136]);
      const tj = (part, beat, dur, v, o = {}) => {
        const ring = (o.ring ?? 0.44) * 1.4 * (0.78 + 0.45 * rJing());   // f1: x1.4, the jingles ring 120-200 ms (they read as clicks)
        if (JRIQ && !o.stroke) riq.hit(beat, dur, v * 1.05, { stroke: 'jingle', ring: 0.5 + 0.2 * rJing() });
        else part.hit(beat, dur, v, { ...o, ring });
      };
      const jingles = (bar, kind, v, cut = false) => {
        if (!kind) return;
        const j = () => 0.94 + 0.12 * rJing();
        if (kind === 'off') { tj(tambA, B(bar, 1.5), 0.25, v * j()); tj(tambB, B(bar, 2.5), 0.25, v * 0.92 * j()); }
        else if (kind === 'offA') { tj(tambA, B(bar, 1.5), 0.25, v * j()); tj(tambA, B(bar, 2.5), 0.25, v * 0.85 * j(), { stroke: 'shake', ring: 0.4 }); }   // A1-A2: one hand
        else if (kind === 'off2') { tj(tambA, B(bar, 1.5), 0.25, v * j()); tj(tambB, B(bar, 2.5), 0.25, v * 0.95 * j(), { stroke: 'shake' }); }
        else if (kind === 'shake') { tj(tambA, B(bar, 1.5), 0.25, v * j(), { stroke: 'shake' }); tj(tambB, B(bar, 2.5), 0.25, v * 0.9 * j(), { stroke: 'shake' }); }
        else if (kind === 'q') { tj(tambB, B(bar, 1), 0.25, v * 0.7 * j(), { stroke: 'shake', ring: 0.45 }); tj(tambA, B(bar, 2), 0.25, v * 0.8 * j(), { stroke: 'shake' }); }
        else if (kind === '8') {
          for (const bt of [1, 1.5, 2, 2.5]) {
            const off = bt % 1 !== 0;
            if (off && bt === 2.5 && JRIQ && RIQF.has(bar)) continue;   // final: the riq fill owns 2.5 (one player, one stroke)
            if (off) tj(bt === 1.5 ? tambA : tambB, B(bar, bt), 0.25, v * j());
            else tj(bt === 2 ? tambA : tambB, B(bar, bt), 0.25, v * 0.6 * j(), { stroke: 'shake', ring: 0.3 });
          }
        } else if (kind === '16') {
          for (let i = 0; i < (cut ? 4 : 8); i++) {   // cut: the flourish owns beat 2 (one hand, not two at once)
            const bt = 1 + i * 0.25;
            const hit = i % 4 === 2;
            const a8 = i % 2 === 0 ? (hit ? 1 : 0.7) : 0.48;
            if (i % 2) shak.note(B(bar, bt), 0.25, null, v * 0.95 * j());   // the in-between 16ths on the shaker
            else tj(i % 4 ? tambB : tambA, B(bar, bt), 0.2, v * a8 * j(), hit ? {} : { stroke: 'shake', ring: 0.32 });
          }
        }
      };
      const flourish = (bar, v) => {   // 4 crescendo shakes on beat 2 (a phrase end instead of the clap)
        for (let k = 0; k < 4; k++) (k % 2 ? tambB : tambA).hit(B(bar, 2 + k * 0.25), 0.2, v * (0.55 + 0.15 * k), { stroke: 'shake', ring: 0.5 });
      };
      // f1: the continuous shake (second shaker, long egg) in 16ths, 8-10 dB under the tambourine strokes; the accents
      // lean on the off-beats like a player's wrist
      const SHA = [0.62, 0.42, 0.9, 0.46, 0.66, 0.42, 0.95, 0.5];
      const shimBar = (bar, v, from = 0) => { for (let k = from; k < 8; k++) shim.note(B(bar, 1 + k * 0.25), 0.25, null, v * SHA[k] * (0.94 + 0.12 * rJing())); };
      // one oom-pah bar. o: { i (bar of the phrase 0-7), ph (phrase number), tv tuba vel, kick, sub, chop: 'acc'|'gtr'|'both'|null,
      //   cv chop vel, clap, snare, jing, jv, pizz, ends: false = no phrase-end variation }
      const oomPah = (bar, h, o) => {
        const i = o.i ?? 0;
        PUSH = o.ends === false ? 0 : i === 7 ? -0.01 : i === 0 ? 0.006 : 0;
        const a1 = (i % 2 ? 0.95 : 1.05) * ARCH[i % 8];
        const tv = o.tv ?? 0.72;
        if (h.t) tuba.note(B(bar), (o.tdur ?? 0.56) + 0.08 * rTuba(), h.t, tv * a1, o.tb ? { bright: o.tb } : {});   // tb: a brighter, brassier oom (its harmonics reach the phone)   // f1: tdur ~0.9 = a longer body (A, T)
        if (h.b) tuba.note(B(bar, 1.5), 0.3, h.b, tv * 0.62);
        if (h.p) tuba.note(B(bar, 2.5), 0.38, h.p, tv * 0.82);
        if (o.kick) kick.note(B(bar), 0.5, 'E1', o.kick * a1);
        if (o.sub && h.t) s808.note(B(bar), 1.4, SUB[h.t] || 'E1', o.sub, { glide: o.subGlide || 0 });
        const cv = (o.cv ?? 0.6) * a1 * (0.96 + 0.08 * rChop());
        const len = o.len ? o.len[0] + (o.len[1] - o.len[0]) * rChop() : 0.22 + 0.12 * rChop();
        const inv = Math.floor(i / 4) % 2 === 1;          // the second half-phrase uses the inversion
        const th3 = o.third && h.c === 'E';               // D: G#4 on top of the E chord (the Freygish 3rd)
        const v1 = th3 ? V2.E : (inv ? V2 : V)[h.c], v2 = th3 ? V.E : (inv ? V : V2)[h.c];
        // the left hand / the bass string on 1 (boom-chick): the root an octave over the tuba, short - on a phone this is
        // the oom's own voice above 300 Hz. Round 5: the bass button is lighter than the chord button (oom-PAH, not even
        // quarters: above 300 Hz beat 2 sits 1.5-3 dB over beat 1)
        const root = h.t ? transposeName(h.t, 12) : null;
        if (root && (o.chop === 'acc' || o.chop === 'both')) chopAcc.note(B(bar), o.rel ? 0.42 : 0.2, root, cv * 0.7, { pan: -0.35, ...(o.rel ? { release: o.rel } : {}) });   // final: held into the 1& where the pah is held (A, A', T: no hole between oom and pah)
        if (root && (o.chop === 'gtr' || o.chop === 'both')) chopGtr.note(B(bar), 0.22, root, cv * 0.7, { pan: 0 });
        if (o.chop === 'acc' || o.chop === 'both') {
          const rl = o.rel ? { release: o.rel } : {};
          chopAcc.chord(B(bar, 2), len, v1, cv * 1.1, rl); chopAcc2.chord(B(bar, 2), len * 0.92, v2, cv * 1.05, rl);
          if (i === 3) chopAcc.chord(B(bar, 2.5), 0.18, v1, cv * 0.6);
        }
        if (o.chop === 'gtr' || o.chop === 'both') {
          chopGtr.chord(B(bar, 2), len, v1, cv * 0.94, { strum: 0.012, ...(o.gtrPan != null ? { pan: o.gtrPan } : {}) });
          if (i === 3 && o.chop === 'gtr') chopGtr.chord(B(bar, 2.5), 0.18, v2, cv * 0.6, { strum: -0.01 });
        }
        const end = i === 7 && o.ends !== false;
        if (end && (o.ph ?? 0) % 2 === 0) {               // a snare flam instead of the clap
          snare.hit(B(bar, 2) - 0.06, 0.2, (o.clap ?? 0.5) * 0.5); snare.hit(B(bar, 2), 0.25, (o.clap ?? 0.5) * 0.9);
        } else if (end) {                                  // drop the clap, a tambourine flourish on beat 2
          flourish(bar, o.jv ?? 0.5);
        } else {
          if (o.clap) clap.hit(B(bar, 2), 0.25, o.clap * a1 * (0.95 + 0.08 * rChop()));
          if (o.snare) snare.hit(B(bar, 2), 0.25, o.snare * a1);
        }
        if (o.pizz && h.t) pizzLo.note(B(bar), 0.5, transposeName(h.t, 12), Math.min(1, o.pizz * 1.15 * a1));   // the phone octave of the tuba
        const endOdd = end && (o.ph ?? 0) % 2 === 1;
        if (endOdd && o.jing === '16') jingles(bar, '16', (o.jv ?? 0.5) * 0.96, true);
        else if (!endOdd) jingles(bar, o.jing, (o.jv ?? 0.5) * (i % 2 ? 0.96 : 1));
        else tambA.hit(B(bar, 1.5), 0.25, (o.jv ?? 0.5) * 0.9);
        if (o.shim) shimBar(bar, o.shim * a1);
        // f1: the 'pah' on low pizz every other bar (the bottom keeps a tail between the ooms). Final: CHORD-AWARE (the
        // blind +7 put F#2 under B° / Em, C#3 under B7b9): the lowest tone of the chop's own voicing at least a 4th
        // above the tuba - Em/B1 E2, C/C2 G2, F/C2 F2, B°/B1 F2, F/A1 F2, B7b9/F#2 C3
        if (o.pah5 && h.t && i % 2 === 1) { const pn = pahOf(h); if (pn) pizzLo.note(B(bar, 2), 0.5, pn, o.pah5 * a1); }
        if (o.tek) { riq.hit(B(bar, 2), 0.25, o.tek * a1, { stroke: 'tek' }); tambB.hit(B(bar, 2.25), 0.2, o.tek * 0.5, { stroke: 'shake', ring: 0.35 }); }
        PUSH = 0;
      };
      // a soft musette reed bed, one swell per chord (Schlep / Bombach bed)
      const PAD = { Em: ['B3', 'E4', 'B4'],   // f1: no third under the FLICK's G# (a mode wink, not a mistuned doubling)
        Eb: ['A#3', 'D#4', 'G4'], C: ['C4', 'E4', 'G4'], F: ['C4', 'F4', 'A4'], Bo: ['B3', 'D4', 'F4'], Dm: ['A3', 'D4', 'F4'] };
      const reedPad = (bar0, table, v = 0.32) => {
        let i = 0;
        while (i < table.length) {
          let j = i + 1; while (j < table.length && table[j].c === table[i].c) j++;
          acc.chord(B(bar0 + i), 2 * (j - i) - 0.25, PAD[table[i].c], v, { expr: j - i >= 2 ? 'swell' : 'flat', wet: 0.35 });
          i = j;
        }
      };
      // final: the same bed on violas con sordino (A3, A'2: one accordion family was stacked four deep)
      const strPad = (bar0, table, v = 0.27) => {
        let i = 0;
        while (i < table.length) {
          let j = i + 1; while (j < table.length && table[j].c === table[i].c) j++;
          strD.chord(B(bar0 + i), 2 * (j - i) - 0.25, PAD[table[i].c], v, { expr: j - i >= 2 ? 'swell' : 'flat' });
          i = j;
        }
      };
      // the glue: one held dyad per chord (tied across repeated chords), the bellows breathing a little per phrase
      const rGlue = s.rng('glue');
      const glueRun = (bar0, table, v = 0.3, o = {}) => {
        let i = 0;
        while (i < table.length) {
          let j = i + 1; while (j < table.length && table[j].c === table[i].c) j++;
          const vv = v * (0.94 + 0.12 * rGlue()) * (o.lift && i >= 4 ? o.lift : 1);
          glueAcc.chord(B(bar0 + i), 2 * (j - i) + 0.04, GLUE[table[i].c], vv, { expr: j - i >= 2 ? 'swell' : 'flat', ...(o.pan != null ? { pan: o.pan } : {}) });
          i = j;
        }
      };
      // the clock regrouped: 8ths as 3+3+2 over two bars (G G# G | G G# G | G G), each G# leaning (A'1)
      const marHemi = (bar, v) => {
        const P = ['G5', 'G#5', 'G5', 'G5', 'G#5', 'G5', 'G5', 'G5'], A = [0.82, 1, 0.62, 0.8, 1, 0.62, 0.78, 0.6];
        P.forEach((p, k) => mar.note(B(bar) + k * 0.5, 0.5, p, v * A[k] * (0.95 + 0.1 * rMar()), { ...(p.includes('#') ? { tag: 'tension' } : {}), bright: k % 2 ? 0.9 : 1.1 }));
      };
      const riqFill = (bar, v = 0.5) => {
        riq.hit(B(bar, 2), 0.25, v * 0.8, { stroke: 'tek' }); riq.hit(B(bar, 2.25), 0.25, v * 0.7, { stroke: 'tek' });
        riq.hit(B(bar, 2.5), 0.25, v * 0.9, { stroke: 'dum' }); riq.hit(B(bar, 2.75), 0.25, v, { stroke: 'tek' });
      };
      // marimba cells, played an octave up (a dry tick above the chop): FLICK (G G# G G), TICK (B B C B), EF (E F E E);
      // over F / B° A A G# A, over the dominant the TICK. A mallet player: the phrase arch and a hairpin over 8 bars, the
      // accent moves to the 1& every 3rd bar, every 4th bar varied (a rest, the last 8th an octave down), and the phrase's
      // last bar ends with a 16th double stroke (even bars) or opens with two dead strokes (odd bars).
      const marCell = (bar, c, kind, v, i = 0, oct = 1) => {
        const hi = c === 'F' || c === 'Bo' || c === 'Dm';
        const dom = c === 'B7' || c === 'B7b9';
        // final: over F / B° / Dm the G# on the off-beat 8th like the E bars' FLICK (it sat on beat 2 against the chop's A)
        let pat = dom ? ['B4', 'B4', 'C5', 'B4'] : hi ? ['A4', 'G#4', 'A4', 'A4'] : kind === 'tick' ? ['B4', 'B4', 'C5', 'B4'] : kind === 'ef' ? ['E4', 'F4', 'E4', 'E4'] : ['G4', 'G#4', 'G4', 'G4'];
        if (i % 4 === 3) pat = [pat[0], null, pat[2], transposeName(pat[3], -12)];
        if (oct) pat = pat.map((p) => (p ? transposeName(p, 12 * oct) : p));
        const arch = ARCH[i % 8] * (0.9 + 0.15 * (i % 8) / 7);
        const vv = i % 3 === 2 ? [0.84, 0.96, 0.7, 0.68] : [1, 0.74, 0.72, 0.7];   // beat 2 lighter: the mallet leans on the oom
        const end = i % 8 === 7;
        pat.forEach((p, k) => {
          if (!p) return;
          // final: alternating sticking (the two mallets strike a little differently: repeated strokes are not copies)
          const tg = { ...(p.includes('#') || p.startsWith('C') || p.startsWith('F') ? { tag: 'tension' } : {}), bright: k % 2 ? 0.9 : 1.1 };
          const vel = v * vv[k] * arch * (0.95 + 0.1 * rMar()) * (k % 2 ? 0.97 : 1.03);
          if (end && bar % 2 === 1 && k < 2) mar.note(B(bar, 1 + k * 0.5), 0.12, p, vel * 0.85, { ...tg, damp: true });   // dead strokes
          else if (end && bar % 2 === 0 && k === 2) { mar.note(B(bar, 2), 0.25, p, vel, tg); mar.note(B(bar, 2.25), 0.25, p, vel * 0.82, tg); }
          else mar.note(B(bar, 1 + k * 0.5), 0.5, p, vel, tg);
        });
      };
      const CALL = 'B6:.5 C7:.5 B6:.5 E6:.5 | F6:.5 E6:.5 _:1';
      // a bell player's phrase: the first stroke leans in, the line tapers to the end
      const BSH = (u) => (u < 0.04 ? 1.14 : 1.02 - 0.24 * u);
      const bO = (vel, extra = {}) => ({ vel, shape: BSH, ...extra });

      if (full) {
        // ================================================================ I  1-8  Tiptoe
        s.section('I tiptoe', B(1), B(9), 'gentle');
        for (let bar = 1; bar <= 8; bar++) {
          const cresc = bar === 7 ? 0.74 : bar % 2 ? 0.7 : 0.62;
          tuba.note(B(bar), 0.84 + 0.1 * rTuba(), 'E2', cresc, { bright: 1.9 });   // final: A's body (0.4 s) and brightness
          pizz.chord(B(bar, 2), 0.5, ['B3', 'E4'], bar % 2 ? 0.62 : 0.56);
          jingles(bar, 'shake', bar % 2 ? 0.46 : 0.4);
          shak.note(B(bar, 1.75), 0.25, null, 0.3); if (bar >= 3) shak.note(B(bar, 2.75), 0.25, null, 0.26);
          marCell(bar, 'Em', 'flick', bar <= 4 ? 0.4 : 0.36, bar - 1);   // the clock ticks through the whole intro
          pizzLo.note(B(bar), 0.5, 'E3', bar % 2 ? 0.36 : 0.3);           // the phone octave of the tuba
          pizzLo.note(B(bar, 2), 0.5, 'B2', bar % 2 ? 0.3 : 0.26);         // final: the pah's fifth (the bottom is not a hole on 2)
          if (bar <= 4) kick.note(B(bar), 0.5, 'E1', bar % 2 ? 0.42 : 0.36);   // the pulse never stops across the loop seam
          if (bar >= 5) { kick.note(B(bar), 0.5, 'E1', bar % 2 ? 0.52 : 0.46); clap.hit(B(bar, 2), 0.25, bar === 7 ? 0.4 : 0.34); }
          if (bar >= 5) riq.hit(B(bar, 2.5), 0.25, 0.24, { stroke: 'tek' });
          shimBar(bar, bar >= 5 ? (bar === 8 ? 0.26 : 0.24) : bar >= 3 ? 0.2 : 0.17);   // final: the shimmer runs on from the seam (~70 % of A)
        }
        tuba.note(B(2, 2.5), 0.25, 'E2', 0.35);                     // a ghost
        tuba.note(B(4, 1.5), 0.3, 'B1', 0.42); tuba.note(B(6, 1.5), 0.3, 'B1', 0.45);   // bounces
        tuba.note(B(8, 2.5), 0.38, 'F2', 0.6);
        // the hook at the seam: the SNEAK's head, whispered by the pizz violas over the tonic (the F-E b2 rub, Phrygian),
        // and the bells' tiny reply (G6 A6 | E6, not the CALL: the loop's head is not signposted)
        pizz.play(B(5), "A4:.5' C5:.5' F5:.5' E5:.5' | _:2", { vel: 0.46, shape: 'arch', shapeAmt: 0.12 });
        cel.play(B(7, 1.5), 'G6:.25 A6:.25 E6:.5', bO(0.34));
        // the glue reeds breathe under the tiptoe (the loop's head is not a hole after the turnaround)
        glueAcc.chord(B(1), 8.04, GLUE.Em, 0.3, { expr: 'swell' }); glueAcc.chord(B(5), 8.04, GLUE.Em, 0.31, { expr: 'swell' });

        // ================================================================ A  9-40  oom-pah, E Phrygian
        // two terraces (round 5): A1-A2 the lowest groove (one tambourine hand, no riq), A3-A4 adds the reed bed + 2 hands
        s.section('A', B(9), B(25), 'tension');
        // A is the lower terrace (round 4: ~1.2 dB under B); the clap sits back, the jingles (the house sound) come forward
        const aOpt = (i, ph, extra = {}) => ({ i, ph, tv: 0.68, kick: 0.6, chop: 'acc', cv: 0.45, clap: 0.38, jing: 'off2', jv: 0.42, shim: 0.34, ...extra });
        const rv = { vel: 0.48, shape: 'arch', shapeAmt: 0.15 };
        // A1 9-16: the bare oom-pah (longer chop: a held "pah") over the glue reeds, and the SNEAK on the F pair
        // f1: a longer tuba body, the pah fifth on low pizz and the phone octave (A had the most hollow bottom and the
        // biggest phone loss of the cue)
        PA.forEach((h, i) => oomPah(9 + i, h, aOpt(i, 0, { cv: 0.64, clap: 0.42, len: [0.48, 0.6], rel: 0.11, jing: 'offA', tdur: 0.9, tb: 1.9, pizz: 0.5, pah5: 0.4 })));
        glueRun(9, PA, 0.46);
        reed.play(B(13), SNEAK, rv);
        // A2 17-24: the marimba TICK (not the intro's FLICK), pizz octave, the bells' own CALL' (a rising Em arpeggio that
        // turns on the b2 F6 -> E6 and sinks onto C6 over the C bar); no hook (the clock carries the phrase)
        // f1: A2 ends DECEPTIVELY - the B° pickup walks B1 D2 into a C (bVI) at the A3 downbeat, E arrives a bar late
        const PAWd = PAW.map((h, i) => (i === 7 ? { ...h, p: 'D2' } : h));
        PAWd.forEach((h, i) => { oomPah(17 + i, h, aOpt(i, 1, { pizz: 0.58, cv: 0.56, clap: 0.42, jing: 'offA', len: [0.46, 0.58], rel: 0.11, tdur: 0.9, tb: 1.9, pah5: 0.38 })); marCell(17 + i, h.c, 'tick', 0.42, i); });
        glueRun(17, PAWd, 0.39);
        cel.play(B(19), 'B5:.5 E6:.5 G6:.75 F6:.25 | E6:.5 C6:.5 _:1', bO(0.44));
        // A3 25-32: FLICK marimba, SNEAK doubled by pizz violins (right, against the reed); + stop-time echo 33-34
        s.section('A up', B(25), B(41), 'tension');
        const PA3d = PAW.map((h, i) => (i === 0 ? { c: 'C', t: 'C2' } : i === 1 ? { c: 'Em', t: 'E2', p: 'D2' } : h));
        PA3d.forEach((h, i) => { oomPah(25 + i, h, aOpt(i, 2, { pizz: 0.5, cv: 0.46, len: [0.42, 0.54], rel: 0.1 })); marCell(25 + i, h.c, 'flick', 0.44, i); });
        reed.play(B(29), SNEAK, { ...rv, vel: 0.54 });
        pizzV.play(B(29), SNEAK8, { vel: 0.52, shape: 'arch', shapeAmt: 0.15 });
        strPad(25, PA3d, 0.44);   // the bed enters only in A3 (final: violas con sordino, not a third accordion voice)
        // 33: tutti hit on 1, the bells' 16th D1 flick fills beat 2; 34: pizz E-F and the tuba pickup
        tuba.note(B(33), 0.5, 'E2', 0.86); kick.note(B(33), 0.5, 'E1', 0.85);
        chopAcc.chord(B(33), 0.16, ['G3', 'B3', 'E4'], 0.7); chopAcc2.chord(B(33), 0.15, ['B3', 'E4', 'G4'], 0.66); clap.hit(B(33), 0.25, 0.55);
        pizzLo.note(B(33), 0.5, 'E3', 0.6); zils.note(B(33), 1, 'B6', 0.4);
        cel.play(B(33, 2), 'C6:.25 B5:.25 A#5:.25 B5:.25', bO(0.42));
        tambA.hit(B(33, 1.5), 0.25, 0.34, { ring: 0.5 }); riq.hit(B(33, 2.5), 0.25, 0.3, { stroke: 'tek' });
        for (let k = 0; k < 10; k++) shak.note(B(33, 1.5 + k * 0.25), 0.25, null, 0.22 + 0.03 * k);   // the shaker keeps time
        pizz.note(B(33, 2), 0.25, 'E4', 0.36);
        tambA.hit(B(34, 1.5), 0.25, 0.4); tambB.hit(B(34, 2.5), 0.25, 0.36, { stroke: 'shake' });
        pizz.note(B(34), 0.5, 'B3', 0.4);
        pizz.note(B(34, 2), 0.25, 'E4', 0.45); pizz.note(B(34, 2.25), 0.25, 'F4', 0.48);
        tuba.note(B(34, 2.5), 0.38, 'F2', 0.66);
        // A4 35-40: a 6-bar phrase; the accordion starts the SNEAK, the bells finish it an octave up
        PA6.forEach((h, k) => { const i = [0, 1, 4, 5, 6, 7][k]; oomPah(35 + k, h, aOpt(i, 3, { pizz: 0.5, cv: 0.42, len: [0.42, 0.54], rel: 0.1 })); marCell(35 + k, h.c, 'flick', 0.42, i); });
        glueRun(35, PA6, 0.31);
        // the CALL an octave lower here (not the same high B6-C7 pair again)
        cel.play(B(35), 'B5:.5 C6:.5 B5:.5 E5:.5 | F5:.5 E5:.5 _:1', bO(0.42));
        // (f1: no accordion head at 37 - the hook is not stated again; the bells finish it alone)
        cel.play(B(38), 'F6:.25 E6:.25 D6:.5 _:.5 C6:.5 | B5:.5 _:1.5', bO(0.46));
        // into B: a pizz approach on the last beat (B C D# -> E)
        pizzLo.play(B(40, 2), "B2:.333' C3:.333' D#3:.333'", { vel: 0.55 });

        // ================================================================ B  41-72  E Freygish, whistle lead
        s.section('B', B(41), B(73), 'tension');
        const bOpt = (i, ph, extra = {}) => ({ i, ph, tv: 0.78, kick: 0.68, chop: 'gtr', cv: 0.68, clap: 0.5, jing: '8', jv: 0.5, pizz: 0.42, ...extra });
        // the 4 phrases are not the same 8 bars: B2 walks the bass (D2 pickups), B3 adds the accordion chop to the guitar,
        // B4 creeps the bass down F2 (Dm/F) - F2 - B1 (F2) into E (bar 69)
        const PBW = PB.map((h, i) => (i === 1 ? { ...h, p: 'D2' } : i === 4 ? { ...h, b: 'B1' } : h));
        const PB4 = PB.map((h, i) => (i === 2 ? { c: 'Dm', t: 'F2' } : i === 3 ? { c: 'Bo', t: 'B1', p: 'F2' } : h));
        const PBT = [PB, PBW, PB, PB4];
        // the jingle player: tambourine in B1 and B3, the riq's jingles in B2 and B4 (one instrument per phrase); the
        // shaker 16ths only in B3 (B1, B2 and B4 tick in 8ths: the D peak is the only section with the full 16th grid)
        for (let ph = 0; ph < 4; ph++) {
          JRIQ = ph % 2 === 1;
          PBT[ph].forEach((h, i) => {
            const bar = 41 + ph * 8 + i;
            if (bar >= 72) return;
            if (bar === 66) oomPah(bar, h, bOpt(i, ph, { chop: null, clap: 0, jing: null }));   // the stop (below)
            else oomPah(bar, h, bOpt(i, ph, ph >= 2 ? { chop: 'both', cv: 0.48, shim: ph === 3 ? 0.26 : 0 } : { shim: 0.26 }));   // f1: the soft egg except in B3 (its own 16th shaker)
          });
        }
        // 66: a surprise - the band drops out on beat 2 (tuba + pizz alone), a riq dum and two pizz plucks fill the hole
        riq.hit(B(66, 2), 0.25, 0.5, { stroke: 'dum' });
        pizz.play(B(66, 2), "B3:.5' G#3:.5'", { vel: 0.5 });
        // 72: the oom on 1, then a 1-beat breath: the whistle's last note falls off through it, two soft riq teks keep time
        tuba.note(B(72), 0.6, 'E2', 0.76); kick.note(B(72), 0.5, 'E1', 0.74); pizzLo.note(B(72), 0.5, 'E3', 0.45);
        riq.hit(B(72, 1.5), 0.25, 0.42, { stroke: 'jingle', ring: 0.6 });
        riq.hit(B(72, 2), 0.25, 0.3, { stroke: 'tek' }); riq.hit(B(72, 2.5), 0.25, 0.32, { stroke: 'tek' });
        pizzLo.note(B(72, 2), 0.5, 'B2', 0.34);
        JRIQ = false;
        swingGroove(shak, B(57), 16, { step: 0.25, swing: 0.55, vel: 0.3, accents: [1, 0.5] });   // B3 only
        zils.note(B(41), 2, 'G#6', 0.38);
        // B leaves the groove bare for long stretches (49-56, 63-68). Round 5: the whistle is the score's pure-tone lead -
        // each 4-bar phrase lands on a LONG note (3-4 beats, sharpening and falling off like Goodbye's whistler) and moves
        // by step more than by leap. Q: the TICK as a dotted cell, E6 held over the barline, a stepwise rise A5-D6 over Dm,
        // then the Freygish tritone D6 -> G#5 as one slow slide. ANS: a falling E7 arpeggio onto a held G#5 (the
        // augmented 2nd against the F bar under it), a stepwise climb C6 D6 onto E6 held into B2 - the melody takes the
        // whole step D-E while only the bass plays the b2-1 F-E.
        // f1: every phrase has its own ENTRY - Q off the beat (dotted), ANS a 16th pickup (after the bells' TICK in the same
        // beat: whistle - bells - whistle), Q2 ON the downbeat (dotted 8th + 16th), ANS4 syncopated 16ths tied over the barline
        const Q = '_:.5 B5:.75 C6:.25 B5:.5 | E6:2@0.58 | ~:.5 A5:.5 C6:.25 A5:.25 D6:.5@0.56 | G#5:1@0.5>0.14';   // final: 43 = the SNEAK's head (A C A, its rhythm) over Dm
        const ANS = 'C6:.25@0.5 D6:.25@0.54 | E6:1@0.58 D6:.5 B5:.5 | G#5:2@0.54 | ~:1 C6:.5 D6:.5@0.54 | E6:2@0.56 | ~:2';
        // Q2 (B3): the stronger restatement - a dotted E-major rise to E6, the b6-5 sigh C6-B5 held, a Dm arpeggio to F6 and
        // the augmented-2nd fall onto G#5 over B°, held into B3's answer
        const Q2 = 'G#5:.75@0.54 B5:.25 E6:1@0.58 | C6:.5 B5:1.5@0.5 | _:.5 A5:.5 D6:.5 F6:.5@0.58 | E6:.75 D6:.25 G#5:1.5@0.46';
        // B4 answer: a 6th up, a tie over the barline, the F-major line falling through G# onto E, which falls off into the breath
        const ANS4 = '_:.25 A5:.25 C6:.25 E6:.5@0.58 D6:.25 B5:.25 E6:.25@0.58 | ~:1 D6:.5 B5:.5 | C6:.75 B5:.25 A5:.5 F5:.5 | E5:1.5@0.44';   // final: 71 C B A F (the aug. 2nd is not sung here)
        // (sharpness capped: a 4-bar chain warms to about +28 c, the bible's +10..+30, not the preset's +37)
        const wOpt = { vel: 0.56, shape: 'arch', shapeAmt: 0.2, vibrato: 0.25, sharp: 16, creep: 4 };   // f1: phrase ends +18..+28 c
        // B1 41-48: question and answer; the bells answer in the gaps (the TICK under nothing, not under held notes)
        legPhrase(whistle, B(41), Q, wOpt);
        cel.play(B(44, 2), 'C7:.25 B6:.25', bO(0.32));
        legPhrase(whistle, B(44, 2.5), ANS, wOpt);
        // B2 49-56: the groove alone (walking bass) over the glue reeds; the bells' Freygish reply, a riq fill at 52, a
        // stop-hit at 56 (tutti on 1, the riq on 2)
        glueRun(49, PBW, 0.3);
        cel.play(B(50, 1.5), 'G#6:.25 A6:.25 E6:.5', bO(0.3));
        riqFill(52, 0.43);
        zils.note(B(53), 1, 'B6', 0.3);
        riqFill(56, 0.5);
        // final: the marimba enters B once (53-56), the clock in its Freygish form, following the bass's G#-G at 54
        [[53, ['G#5', 'G#5', 'A5', 'G#5']], [54, ['G#5', 'G#5', 'A5', 'G5']], [55, ['A5', 'G#5', 'A5', 'A5']], [56, ['G#5', 'G#5']]].forEach(([bar, pat], n) =>
          pat.forEach((p, k) => mar.note(B(bar, 1 + k * 0.5), 0.5, p, 0.4 * [1, 0.74, 0.8, 0.7][k] * (1 + 0.04 * n) * (0.95 + 0.1 * rMar()), { bright: k % 2 ? 0.9 : 1.1, ...(p === 'G5' ? { tag: 'tension' } : {}) })));
        // B3 57-62: whistle Q2 over an accordion counter-line of long b6-5 sighs (C5 B4 | A4 G#4), the pizz violins answer
        // in 6ths with the violas (61-62); 63-68 the groove alone
        legPhrase(whistle, B(57), Q2, wOpt);
        acc.play(B(57), 'C5:2- B4:2- A4:2- G#4:2', { vel: 0.23, wet: 0.3, pan: 0.5, shape: 'arch', shapeAmt: 0.15, tag: 'tension' });   // f1: 2.5 dB down, right
        pizzV.play(B(61), "_:.5 B5:.5' A5:.5' G#5:.5' | E5:.5' F5:.5' E5:1'", { vel: 0.5, shape: 'arch', shapeAmt: 0.15 });
        pizz.play(B(61), "_:.5 D5:.5' C5:.5' B4:.5' | G#4:.5' A4:.5' G#4:1'", { vel: 0.44, shape: 'arch', shapeAmt: 0.15 });
        riqFill(64, 0.47);
        // B4: the glue under the groove-alone bars around the stop (not under the stop itself), then the whistle's last
        // answer (69-72) and the 1-beat breath
        glueRun(63, PB.slice(6), 0.28); glueRun(67, PB4.slice(2, 7), 0.28);
        glueAcc.chord(B(65), 2.9, GLUE.E, 0.28, { expr: 'flat' });   // released just before the stop: everything cuts at once
        legPhrase(whistle, B(69), ANS4, wOpt);
        // the jingles step back 1.5 dB in the groove-alone stretches (riq fills, the hottest HF of the cue in round 4)
        busJing.automate('gain', [[B(49) - 0.25, 0], [B(49), -1.5], [B(57) - 0.25, -1.5], [B(57), 0], [B(61) - 0.25, 0], [B(61), -1.5], [B(69) - 0.25, -1.5], [B(69), 0]]);

        // ================================================================ K  73-84  break (no kick): a terrace
        s.section('K break', B(73), B(85), 'release');
        const PK = [['Em', 'E2', 'B1'], ['Em', 'E2', 'B1'], ['Em', 'E2', 'G2'], ['C', 'C2', 'B1'], ['F', 'F2', 'C2'], ['F', 'F2', 'A1'],
          ['Em', 'E2', 'B1'], ['Em', 'G2', 'E2'], ['F', 'F2', 'C2'], ['F', 'A1', 'C2'], ['Em', 'E2', 'C2'], ['B7', 'B1', null]];
        PK.forEach(([c, t1, t2], i) => {
          const bar = 73 + i;
          // round 5: the tuba a little firmer (its 2nd-3rd harmonics are what a phone hears of K)
          tuba.note(B(bar), 0.5, t1, i % 2 ? 0.55 : 0.6, { bright: 1.9 });
          pizzLo.note(B(bar), 0.5, transposeName(t1, 12), 0.5);   // the phone octave
          if (t2) tuba.note(B(bar, 2), 0.5, t2, 0.5, { bright: 1.9 });
          if (i < 11) {   // final: K's jingles on the riq (its many small jingles are a wash, not the tambourine's fixed 'ting' lines)
            riq.hit(B(bar, 1), 0.25, 0.4 * (0.94 + 0.12 * rJing()), { stroke: 'jingle', ring: 0.55 + 0.15 * rJing() });
            riq.hit(B(bar, 2), 0.25, 0.45 * (0.94 + 0.12 * rJing()), { stroke: 'jingle', ring: 0.6 + 0.15 * rJing() });
            if (i >= 1) shimBar(bar, i === 1 ? 0.13 : 0.17);
          }   // (84: the breath has one shake only)
          if (i < 11 && i !== 3 && i !== 4) pizz.chord(B(bar, 2.5), 0.25, V[c].slice(1), 0.4);   // (76-77: the aside)
          if (i % 4 === 3) shak.note(B(bar, 2.75), 0.25, null, 0.28);
        });
        busTrem.automate('gain', [[B(73) - 0.25, 0], [B(73), 2], [B(85) - 0.25, 2], [B(85), 0]]);   // final: K's mid on phones
        trem.note(B(73), 11.8, 'B4', 0.56, { tag: 'tension', expr: 'hairpin' });
        trem.note(B(79), 10, 'B4', 0.58, { tag: 'tension', expr: 'hairpin' });
        trem.note(B(79), 10, 'G5', 0.42, { expr: 'swell', pan: -0.3 });
        trem.note(B(84), 1.9, ['B4', 'F#5'], 0.5, { tag: 'tension', expr: 'dim' });   // f1: rings through the breath (no bare hiss)
        // K is a conversation, not a row of the same cell: the celesta's D1 encirclement (74, 80: two registers), answered
        // by a comic aside low in the pizz violas - the SNEAK's head INVERTED (C4 A3 C4 E3 -> F3: -3 +3 -8 +1) over C -> F;
        // and the bell CALL in retrograde, an octave down (E5 F5 | E5 B5 C6 B5), sinking onto the B7 drop
        cel.play(B(74), 'C7:.5 B6:.5 A#6:.5 B6:.5', bO(0.36, { pan: 0.3 }));
        pizz.play(B(76), "C4:.5' A3:.5' C4:.5' E3:.5' | F3:.5'", { vel: 0.5, shape: 'arch', shapeAmt: 0.1 });
        cel.play(B(80), 'F5:.5 E5:.5 D#5:.5 E5:.5', bO(0.4, { pan: 0.3 }));
        cel.play(B(82), 'E5:.5 F5:.5 _:1 | E5:.5 B5:.5 C6:.5 B5:.5', bO(0.4, { pan: 0.3 }));
        riq.hit(B(84), 0.25, 0.5, { stroke: 'dum' });
        tambB.hit(B(84, 2), 0.25, 0.3, { stroke: 'shake' });               // the 1-beat breath before H (f1: softer, one hand)
        drop.note(B(84, 2), 1, 'B1', 0.4);

        // ================================================================ H  85-108  HEIST, half time over a B pedal
        s.section('H heist', B(85), B(109), 'climax');
        const HU = [['Em', 'C', 'Am', 'B7b9'], ['Em', 'C', 'F', 'B7b9'], ['Em', 'C', 'F', 'B7b9']];
        const SYN = {
          Em: 'B1:1 _:.5 B1:.5 | E2:.5 D#2:.5 B1:.75 _:.25',
          C: 'B1:1 _:.5 B1:.5 | C2:1 B1:.75 _:.25',
          Am: 'B1:1 _:.5 B1:.5 | A1:.5 C2:.5 B1:.75 _:.25',
          F: 'B1:1 _:.5 B1:.5 | F2:.5 C2:.5 B1:.75 _:.25',
          B7b9: 'B1:1 _:.5 F#2:.5 | C2:.5 B1:.5 A#1:.5 B1:.25 _:.25',
        };
        const SYN3 = {   // cycle 3: octave-up F#2 runs
          ...SYN,
          C: 'B1:1 _:.5 B1:.5 | C2:.5 F#2:.5 G2:.5 F#2:.25 _:.25',
          F: 'B1:1 _:.5 B1:.5 | F2:.5 C2:.5 A1:.5 B1:.25 _:.25',   // f1: A1, not F#2 under the F stab (106)
        };
        let stabSide = 1;
        for (let u = 0; u < 12; u++) {
          const bar = 85 + u * 2, cyc = Math.floor(u / 4), c = HU[cyc][u % 4];
          syn.play(B(bar), (cyc === 2 ? SYN3 : SYN)[c], { vel: 0.62, gate: 0.72 });
          pizzLo.note(B(bar), 0.5, 'B2', 0.5); pizzLo.note(B(bar + 1), 0.5, 'B2', 0.4);
          // (95-96: the pad under the theremin's B5 landing, so the lead is the top voice: a clean major 7th over C)
          glass.chord(B(bar), 4, (bar >= 101 || bar === 95 ? GLASS_LO : GLASS)[c], u % 4 === 0 ? 0.46 : 0.38);
          // booms on B1 (62 Hz: earbuds reproduce it, the harmonics reach the phone)
          if (u % 2 === 0) boom.hit(B(bar), 4, u === 0 ? 0.56 : 0.44, { midi: 35, hold: 1.2, tail: 0.6 });
          // (f1: no 808 B0 here - 31 Hz spent headroom and no phone hears it; the booms and the synth carry the weight)
          clap.hit(B(bar + 1), 0.25, (u % 2 ? 0.48 : 0.43) * (0.96 + 0.08 * rChop()), { flam: 0.03 });
          const sv = V[c];
          for (const b2 of [bar, bar + 1]) {
            if (b2 === 99 || b2 === 100) continue;          // the celesta interruption and the swoop stay exposed
            const second = b2 === bar + 1;
            const stutter = (u % 4 === 3 && second);
            const sv0 = (second ? 0.46 : 0.4) + (second && u % 2 === 1 ? 0.03 : 0);   // round 5: accents 2 dB lower (they drove the limiter)
            stabSide = -stabSide;
            stab.chord(B(b2, 2), second && !stutter ? 0.2 : 0.14, sv, sv0, { pan: 0.4 * stabSide });
            if (stutter) { stab.chord(B(b2, 2.25), 0.1, sv, sv0 * 0.9, { pan: -0.4 * stabSide }); stab.chord(B(b2, 2.5), 0.2, sv, sv0, { pan: 0.4 * stabSide }); }
          }
          if (u >= 8) { hat.note(B(bar, 1.5), 0.25, null, 0.4); hat.note(B(bar + 1, 1.5), 0.25, null, 0.42); hat.note(B(bar + 1, 2.5), 0.25, null, 0.38, { open: 0.4 }); }
        }
        stab.chord(B(103), 0.2, ['C4', 'E4', 'G4'], 0.52, { tag: 'tension' });      // the bII hit under the G6 peak
        swingGroove(shim, B(85), 48, { step: 0.25, swing: 0.56, vel: 0.38, accents: [1, 0.6] });   // f1: the long open egg (the top no longer drops out)
        // the house sound instead of trap zippers: riq 16th rolls (tek strokes, crescendo) into 93, 101 and 109
        const riqRoll = (bar, v0, v1) => { for (let k = 0; k < 4; k++) riq.hit(B(bar, 2 + k * 0.25), 0.25, 0.85 * (v0 + (v1 - v0) * k / 3), { stroke: k === 3 ? 'dum' : 'tek' }); };
        for (const bar of [92, 100, 108]) riqRoll(bar, 0.32, 0.62);
        // BELLS3: a RISING 3-beat glock cell against the half-time grid (hemiola): the leading tone climbing onto the tonic
        // B6 D#7 E7 (85-88), alternating with C7 B6 G6 in 101-104; the bells sit right of centre, the theremin left of it
        const bells3 = (fromBar, beats, v, alt) => {
          for (let k = 0; k < beats; k++) {
            const pat = alt && Math.floor(k / 3) % 2 ? ['C7', 'B6', 'G6'] : ['B6', 'D#7', 'E7'];
            glock.note(B(fromBar) + k, 0.5, pat[k % 3], v * (k % 3 === 0 ? 1 : 0.8), { decay: 0.3, pan: 0.6, ...(pat[k % 3] === 'D#7' ? { tag: 'tension' } : {}) });
          }
        };
        bells3(85, 8, 0.17);
        bells3(101, 8, 0.16, true);
        // H2: the theremin's pairs in the phone octave (E5-A5), each answered by the celesta; the third pair jumps onto F6
        const tO = { vibrato: 0.6 }, VW = { vibrato: 0.95 };   // f1: the held notes get the full Schvitz-like wobble
        legLine(ther, B(93), [['E5', 0.5], ['F5', 0.5], ['E5', 0.5], ['F5', 0.5], ['E5', 1.5]], { ...tO, vel: 0.56, shape: 'arch', shapeAmt: 0.12 });
        cel.play(B(94, 2), 'F6:.25 E6:.25', bO(0.4, { pan: 0.5 }));
        legLine(ther, B(95), [['G5', 0.5], ['F#5', 0.5], ['G5', 1], ['B5', 1.5, undefined, { tag: 'tension', ...VW }]], { ...tO, vel: 0.58, shape: 'arch', shapeAmt: 0.12 });
        cel.play(B(96, 2), 'G6:.25 F#6:.25', bO(0.4, { pan: 0.5 }));
        legLine(ther, B(97), [['A5', 1], ['G#5', 0.5], ['A5', 0.5], ['F6', 1, 0.66], ['E6', 0.5, 0.58]], { ...tO, vel: 0.6, shape: 'arch', shapeAmt: 0.12 });
        // 99: the celesta interrupts alone - NEW material, not K's cell: a falling diminished arpeggio of the B7b9 (C7 A6
        // F#6 D#6) onto B5, one glock B6 ringing over it; 100: the theremin swoops B4 -> B5
        cel.play(B(99), 'C7:.25 A6:.25 F#6:.25 D#6:.25 B5:1', bO(0.42, { pan: 0.5 }));
        glock.note(B(99, 2), 1, 'B6', 0.14, { pan: 0.6 });
        // H3, in two breaths. 1) from the swoop: G5 B5 E6 (Em arpeggio) | D6 A5 F#5 (the B-dominant arpeggio: no semitone)
        // | G6 (the peak, +13, over C/B = bII) F6 E6 held | the 6th fall E6 -> G5, a rest. 2) the SNEAK's head surfaces in
        // the heist: A5 C6 A5 E6 | F6 (over F/B) E6 | F#6 D#6 (the fall over B7b9) | B5 F#5 D#5 -> E (bar 109).
        // Semitone sighs only where they carry bII (103 F6-E6, 106 F6-E6) - the pairs of H2 get contrast.
        // f1: 101-102 climb by step in E harmonic minor with two semitone pairs (C6-B5, D#6-E6) instead of two arpeggios;
        // the swoop is quicker and softer (it stays in the texture)
        legLine(ther, B(100), [['B4', 0.5, 0.52], ['B5', 1.5, 0.6, { tag: 'tension', glideTime: 0.08, ...VW }],
          ['G5', 0.5, 0.6], ['A5', 0.5, 0.6], ['B5', 0.5, 0.62], ['C6', 1, 0.64, { tag: 'tension' }], ['B5', 0.5, 0.6], ['D#6', 0.5, 0.62, { tag: 'tension' }], ['E6', 0.5, 0.62],
          ['G6', 1, 0.66, VW], ['F6', 0.5, 0.64], ['E6', 1.5, 0.62, VW], ['G5', 0.5, 0.56]], { ...tO });
        legLine(ther, B(105), [['A5', 0.5, 0.6], ['C6', 0.5, 0.62], ['A5', 0.5, 0.6], ['E6', 0.5, 0.64], ['F6', 1.5, 0.66, VW], ['E6', 0.5, 0.6],
          ['F#6', 1, 0.66], ['D#6', 1, 0.6], ['B5', 1, 0.56, VW], ['F#5', 0.5, 0.5], ['D#5', 0.5, 0.46],
          ['E5', 0.75, 0.5]], { ...tO, fall: -45 });   // the leading tone resolves in the line itself (109 downbeat)

        // f1: the theremin's second H3 breath sits 1.75 dB back (it was as loud as the whole band)
        busTher.automate('gain', [[B(100) - 0.25, 0], [B(100), -1.75], [B(109) - 0.25, -1.75], [B(109), 0]]);

        // ================================================================ A'  109-140  oom-pah returns, the hook developed
        s.section("A'", B(109), B(141), 'tension');
        const contrary = (bar, short) => {      // D6: bass up into E against bells down G-F#-F into E (8th triplets on beat 2)
          pizzLo.play(B(bar, 2), short ? "_:.333 D3:.333' D#3:.333'" : "C#3:.333' D3:.333' D#3:.333'", { vel: 0.58 });
          // final: the second statement (132) develops - the bells turn round E (D1: F6 E6 D#6 -> E6) over the celli climb
          glock.play(B(bar, 2), short ? 'G6:.333 F#6:.333 F6:.333 E6:1' : 'F6:.333 E6:.333 D#6:.333 E6:1', { vel: 0.26, shape: 'cresc', shapeAmt: 0.12 });   // closes on E (downbeat)
        };
        // A'3: bar 130 is a Bb - one witty foreign chord (the tritone away from E), the tuba A#1 -> B1 -> E2
        // f1: and the harmonic rhythm doubles at its end - 131 oom E2 / pah C, 132 oom F2 / pah B7b9 (one chord per beat),
        // B1 -> E2: the F2-E2 cadence is withheld once
        const PA3 = PA.map((h, i) => (i === 5 ? { c: 'Bb', t: 'A#1', p: 'B1' } : i === 6 ? { c: 'C', t: 'E2' } : i === 7 ? { c: 'B7b9', t: 'F2', p: 'B1' } : h));
        const TAB = [PA, PAW, PA3, PAR];
        for (let ph = 0; ph < 4; ph++) {
          TAB[ph].forEach((h, i) => {
            const bar = 109 + ph * 8 + i;
            const last = ph === 3 && i >= 6;
            // 124: no pickup (the planing); 126: G2, not B1 (Em/G: the tuba line B1 D#2 E2 G2 E2 is our own contour);
            // A'3 (125-132) has a lighter backbeat: a riq tek + a soft shake instead of the clap
            const hh = bar === 124 ? { c: 'Eb', t: 'B1' } : bar === 126 ? { ...h, t: 'G2' } : h;   // 124: the pah is the Eb (planing)
            oomPah(bar, hh, aOpt(i, ph, { pizz: 0.52, jing: last ? '16' : (ph >= 2 ? '8' : 'off'), jv: 0.5, cv: 0.56, clap: ph === 2 ? 0 : 0.48, tek: ph === 2 ? 0.4 : 0, tv: 0.75, kick: 0.68, len: [0.42, 0.54], rel: 0.1, shim: ph >= 2 ? 0 : 0.34 }));   // final: a held pah; in A'3-A'4 the 16th shaker alone (no second egg on the same grid)
            // the clock: A'1 first half (regrouped 3+3+2, below), A'2, A'4 (not under the stretto, not in A'3; 139 below)
            if (ph === 1 && bar !== 124) marCell(bar, h.c, 'flick', 0.62, i);   // f1: +2 dB (the A' clock was masked)
            else if (ph === 3 && bar !== 139) marCell(bar, h.c, 'flick', 0.46, i);
          });
        }
        marHemi(109, 0.66); marHemi(111, 0.64);   // f1: the hemiola up 2.3 dB, the marimba further left (bus)
        // 124: the marimba takes part in the planing - A5 A5 | A#5 A#5 -> B5 (125)
        [['A5', 0.5, 1], ['A5', 0.42, 1.5], ['A#5', 0.5, 2], ['A#5', 0.4, 2.5]].forEach(([p, v, bt]) => mar.note(B(124, bt), 0.5, p, v, p.includes('#') ? { tag: 'tension' } : {}));
        mar.note(B(125), 0.5, 'B5', 0.46);
        // 139: a wink before D - the G# on the downbeat once, an appoggiatura falling into G
        [['G#5', 0.5], ['G5', 0.36], ['G5', 0.32], ['G5', 0.3]].forEach(([p, v], k) => mar.note(B(139) + k * 0.5, 0.5, p, v, p.includes('#') ? { tag: 'tension' } : {}));
        // the glue under the oom-pah where nothing holds (A'1, A'3, A'4 first half)
        glueRun(109, PA, 0.36); glueRun(125, PA3, 0.34); glueRun(133, PAR.slice(0, 4), 0.36); glueRun(139, PAR.slice(6, 7), 0.33);   // final: +1.5 dB
        // 109: the slam back in
        boom.hit(B(109), 4, 0.55, { midi: 28 });
        zils.note(B(109), 2, 'E7', 0.36);
        // A'1: the SNEAK in STRETTO - accordion, and the pizz violins 1 beat later a (diatonic) 6th below
        reed.play(B(113), SNEAK, { ...rv, vel: 0.54 });
        // f1: a STRICT canon - the celesta 1 beat later, a 6th below and an octave up (= a 3rd above), the same rhythm
        cel.play(B(113, 2), 'C5:.5 E5:.25 C5:.25 A5:.5 G5:.5 | A5:.25 G5:.25 F5:.5 _:.5 E5:1', bO(0.46, { pan: 0.4 }));   // (lands on E: no 5-note scale run)
        contrary(116, true); contrary(132, false);
        // A'2: the CALL varied (an octave lower, closing with E5 D#5 E5), the SNEAK in AUGMENTATION on a held reed, the planing
        strPad(117, PA.slice(0, 7), 0.25);   // final: violas con sordino (not a fourth accordion voice), soft under the clock and the bells
        acc.chord(B(124), 0.95, PAD.Bo, 0.2, { wet: 0.35 }); acc.chord(B(124, 2), 0.95, PAD.Eb, 0.22, { wet: 0.35, tag: 'tension' });
        cel.play(B(119), 'B5:.5 C6:.5 B5:.5 F5:.5 | E5:.5 D#5:.5 E5:1', bO(0.48));
        pizz.play(B(117), "_:.5 F4:.5' E4:.5' G4:.5' | F4:.5' E4:.5' _:1", { vel: 0.5 });
        // one bellows push over the whole phrase (shape), not a swell per note; only the held F5 and the C5 sigh swell
        reed.play(B(121), 'A4:1 C5:.5 A4:.5 | _:1 E5:1 | F5:.5 E5:.5 D5:1', { vel: 0.46, shape: 'arch', shapeAmt: 0.25, expr: 'flat' });
        reed.note(B(122), 1, 'F5', 0.52, { expr: 'swell' }); reed.note(B(124), 1, 'B4', 0.43, { expr: 'swell' });
        // 124: the one semitone PLANING of the cue, a whole beat: beat 2 is an Eb triad (chop + stab + glue + reed bed,
        // the tuba D#2) that slides up onto Em at 125; the reed's B4 -> A#4 -> B4 (D1 around the 5th)
        reed.note(B(124, 2), 1, 'A#4', 0.44, { tag: 'tension' }); reed.note(B(125), 0.5, 'B4', 0.4);
        stab.chord(B(124, 2), 0.7, V.Eb, 0.54, { tag: 'tension' });
        glueAcc.chord(B(124, 2), 0.98, ['D#4', 'G4'], 0.3, { expr: 'flat' });
        tuba.note(B(124, 2), 0.9, 'D#2', 0.66);
        cel.play(B(124, 2.5), 'D#6:.5 E6:.5', bO(0.34));
        // A'3: no marimba, no lead in 125-128 (the groove breathes, a lighter backbeat), then the SNEAK a 4th up in the
        // pizz violins (right) + a sparse reed counter
        // (over F | Bb: the A5 is Bb's major 7th, the reed's A#4 -> G4 slips into Em)
        pizzV.play(B(129), "D5:.5' F5:.5' A5:.5' G#5:.5' | A5:.5' F5:.5' _:.5 F5:.5' | E5:.5' _:1.5", { vel: 0.58, shape: 'arch', shapeAmt: 0.15 });
        reed.play(B(129), "A4:.5' _:1.5 | D5:.5' _:1 A#4:.5' | G4:.5' _:1.5", { vel: 0.44 });
        swingGroove(shak, B(125), 30, { step: 0.25, swing: 0.55, vel: 0.4, accents: [1, 0.5] });
        // A'4: the SNEAK re-harmonised (Dm/F, then B°): accordion bar 1, the bells bar 2; riq fill, a 2-beat riser into D
        // f1: only the hook's TAIL here (no exact head again), and the bells answer it a step lower onto the G# (dim7 of B°)
        reed.play(B(137), "F5:.25' E5:.25' D5:.5' _:.5 C5:.5'", rv);
        cel.play(B(138), 'C6:.25 B5:.25 A5:.5 _:.5 G#5:.5', bO(0.46));
        reedPad(137, [{ c: 'Dm' }, { c: 'Bo' }], 0.24);
        riqFill(136, 0.58);
        riser.note(B(140), 2, 'E5', 0.5);
        roll.hit(B(140), 2, 0.5, { from: 0.4, to: 1 });
      }

      // ================================================================ D  141-172  PEAK: 808, pivot pedal, whistle
      // dSection(pass): the full cue plays pass 0. caper_final plays D twice (64 bars, 58 s = the final minute), and pass 1
      // is varied: the question on the theremin, the climax an octave lower (the cue's top never comes twice in 30 s)
      const dipPts = { chop: [], pizz: [] };
      const dSection = (pass) => {
        s.section(pass ? 'D peak 2' : 'D peak', B(141), B(173), 'climax');
        // the peak terrace: the 808 sub, 16th jingles, a firmer clap; the chop steps back under the climax (D4).
        // f1: while the whistle plays in D1-D2 the chop and pizz play lighter (and their buses dip 1.5 dB), the pivot
        // pedal too; the E bars voice the chop with G#4 on top (the Freygish 3rd is heard at the peak)
        const WB = (bar) => (bar >= 141 && bar <= 144) || (bar >= 153 && bar <= 156);
        const dOpt = (i, ph, bar, extra = {}) => ({ i, ph, tv: 0.73, kick: 0.62, sub: 0.48, chop: ph % 2 ? 'both' : 'acc', cv: ph === 3 ? 0.44 : WB(bar) ? 0.46 : 0.53, clap: 0.6, jing: '16', jv: 0.4, pizz: WB(bar) ? 0.42 : 0.5, gtrPan: -0.45, third: true, ...extra });
        // the PIVOT PEDAL with bellows phrasing: per 2-bar unit strong, light, medium, light, each bar a little different
        // (a player, not a step sequencer); every 4th bar one 2-beat bellows push instead of two notes
        const PV = [0.48, 0.36, 0.43, 0.38], PL = [0.45, 0.7, 0.45, 0.7];
        const rPiv = s.rng(pass ? 'pivot2' : 'pivot');
        const PIV = { pan: 0.42, wet: 0.3 };
        const shake = (bar, d) => { for (let k = 0; k < 4; k++) acc.note(B(bar, 2 + k * 0.25), 0.2, 'B4', (0.3 + 0.05 * k) * d, PIV); };
        for (let ph = 0; ph < 4; ph++) {
          const tab = ph === 2 ? PD3 : PD;
          tab.forEach((h, i) => {
            const bar = 141 + ph * 8 + i;
            const lastBar = ph === 3 && i === 7;
            oomPah(bar, lastBar ? { ...h, p: full ? null : 'D#2' } : h, dOpt(i, ph, bar, { subGlide: i === 7 ? -1.5 : 0 }));
            const pv = h.c === 'F' ? 'C5' : 'B4';
            if (ph === 2) return;                           // D3: the tremolo has the pivot
            // 145-152 (the clockwork SNEAK over it): the pedal a little stronger; under the whistle and on the E bars lighter
            const lift = (bar >= 145 && bar <= 152 ? 1.08 : 1) * (WB(bar) ? 0.85 : 1) * (h.c === 'E' ? 0.82 : 1);
            if (bar === 148) { acc.note(B(bar), PL[2], pv, PV[2] * lift, PIV); shake(bar, lift); return; }
            if (bar === 152) {                              // a D1 turn in 16ths, rising into the C5 of the F bar
              acc.note(B(bar), 0.7, pv, PV[0] * lift, PIV);
              ['C5', 'B4', 'A#4', 'B4'].forEach((p, k) => acc.note(B(bar, 2 + k * 0.25), 0.22, p, 0.34 + 0.03 * k, { ...PIV, ...(p === 'A#4' ? { tag: 'tension' } : {}) }));
              return;
            }
            if (i % 4 === 2) { acc.note(B(bar), 1.9, pv, PV[0] * lift * (0.9 + 0.2 * rPiv()), { ...PIV, expr: 'swell' }); return; }
            for (const bt of [1, 2]) {
              const k = (i % 2) * 2 + (bt - 1);
              acc.note(B(bar, bt), PL[k] * (0.88 + 0.24 * rPiv()), pv, PV[k] * lift * (0.88 + 0.24 * rPiv()), PIV);
            }
          });
        }
        // f1: the held dyads under D1-D2 on violas con sordino (not a fourth accordion): G#3-E4 on E (the Freygish 3rd),
        // A3-F4 over Dm and F, G#3-F4 over B° (dim7) - every move a semitone (G#-A, E-F)
        const STRD = { E: ['G#3', 'E4'], Dm: ['A3', 'F4'], Bo: ['G#3', 'F4'], F: ['A3', 'F4'] };
        const strRun = (bar0, table, v) => {
          let i = 0;
          while (i < table.length) {
            let j = i + 1; while (j < table.length && table[j].c === table[i].c) j++;
            strD.chord(B(bar0 + i), 2 * (j - i) + 0.04, STRD[table[i].c], v * (0.94 + 0.12 * rGlue()), { expr: j - i >= 2 ? 'swell' : 'flat' });
            i = j;
          }
        };
        strRun(141, PD, 0.4); strRun(149, PD, 0.4);
        // D3 157-164: THE REGION SHIFT - the whole band steps up a semitone into F Freygish. The pivot moves onto the
        // mandolin tremolo (the K colour returns): two players, left and right (f1: the right one a little late, slower,
        // less sharp and softer - two mandolins, not one copied), C5 (the new 5th) held, C#5 over Gb, C5 - and it falls
        // back C5 -> B4 when D4 returns to E (bar 165, the accordion pedal again)
        const TP = [{ pan: -0.45, amp: 1.2 }, { pan: 0.45, amp: 1.2, tremRate: 7.3, sharp: 12, dt: 0.025, vm: 0.9 }];
        for (const tp of TP) {
          const { dt = 0, vm = 1, ...o } = tp;
          trem.note(B(157) + dt, 7.9, 'C5', 0.5 * vm, { tag: 'tension', expr: 'swell', ...o });
          trem.note(B(161) + dt, 3.9, 'C#5', 0.52 * vm, { tag: 'tension', expr: 'swell', ...o });
          trem.note(B(163) + dt, 3.9, 'C5', 0.48 * vm, { expr: 'dim', ...o });
        }
        boom.hit(B(141), 4, 0.62, { midi: 28 });
        boom.hit(B(157), 4, 0.58, { midi: 29 });            // the boom follows the region (F)
        zils.note(B(141), 2, 'G#6', 0.4);
        // the WHISTLE returns at the peak (the cue's two lead colours: the whistle of B and D, the theremin of H, which
        // answers once more in D3). f1: each D phrase has its own entry - D1 ON the downbeat in the SNEAK's own rhythm
        // (the b2 F6 an appoggiatura on beat 2), D2 a 16th-triplet run into an off-beat F6, D4 a pickup from 164.
        const dW = { vel: 0.62, shape: 'arch', shapeAmt: 0.2, vibrato: 0.3, sharp: 18, creep: 6 };
        const D1 = 'A5:.5 C6:.25 A5:.25 F6:1@0.64 | E6:2@0.6 | _:.5 D6:.25 E6:.25 F6:.5 A5:.5 | G#5:1.5@0.5 _:.5';
        if (pass) legPhrase(ther, B(141), D1, { vel: 0.6, shape: 'arch', shapeAmt: 0.2, vibrato: 0.7 });
        else legPhrase(whistleD, B(141), D1, dW);
        // 145-152: the CLOCKWORK - the SNEAK in diminution (16ths) on the marimba with glock pings on the downbeats, over
        // the F pair (its B5 against the pivot's C5); 149-150 its head mirrored in Freygish over E (E6 C6 E6 G#5 | A5 E6 D6 B5 |
        // C6 B5: the b6-5 sigh); f1: 151-152 the reed no longer quotes the head - long b6-5 sighs C5-B4 | A4-G#4 over
        // Dm and B° (the counter-line of B3) prepare the whistle's answer
        const MV = { vel: 0.72, shape: 'arch', shapeAmt: 0.12 };   // final: +1.5 dB (it dropped under the accordion pedal)
        mar.play(B(145), 'A5:.25 C6:.25 A5:.25 E6:.25 F6:.25 E6:.25 D6:.25 C6:.25 | B5:.5! C6:.5 _:1', MV);   // final: F6 on beat 2 (not E6 against the F chord), the B5-C6 turn
        glock.note(B(145), 0.5, 'A6', 0.16); glock.note(B(146), 0.5, 'C7', 0.14);
        mar.play(B(149), 'E6:.25 C6:.25 E6:.25 A5:.25 G#5:.25 E6:.25 D6:.25 B5:.25 | C6:.5! B5:.5 _:1', MV);   // final: G#5 on beat 2 (not A5 against the chop's G#4)
        glock.note(B(149), 0.5, 'E7', 0.13); glock.note(B(150), 0.5, 'C7', 0.14);
        reed.play(B(151), 'C5:1 B4:1 | A4:1 G#4:.75', { vel: 0.5, shape: 'arch', shapeAmt: 0.12, expr: 'swell', tag: 'tension' });
        // D2 153-156: the answer over the F pair - a 16th-triplet run A5 B5 C6 into F6 on the off-beat, E6, the C-D-E climb,
        // the B-C-B close
        legPhrase(whistleD, B(153), 'A5:.167@0.5 B5:.167@0.54 C6:.166@0.56 F6:1@0.62 E6:.5 | D6:1 C6:.5 D6:.5 | E6:1.5@0.6 D6:.25 C6:.25 | B5:1 C6:.5 B5:.5@0.44', dW);
        // D3 157-164 (F Freygish): reed + brass hits on the off-beats; between them the theremin echoes the H peak recast
        // in the new region (A6 F#6 F6: the augmented 2nd instead of H's G6 F6 E6), then climbs the C° (F#5 A5 C6 D#6)
        // into Gb; the SNEAK a semitone up on the dry reed with the pizz in 3rds (8th skeletons) over Gb Gb F (161-163)
        const hits = [[157, 2.5], [158, 1.5], [159, 2.5], [161, 2.5], [162, 1.5], [163, 2], [163, 2.5]];
        hits.forEach(([bar, bt], k) => {
          const c = PD3[(bar - 157) % 8].c;
          const v = 0.48 + 0.04 * (k % 3) + (k === hits.length - 1 ? 0.06 : 0);
          stab.chord(B(bar, bt), 0.2, V2[c], v, { pan: k % 2 ? 0.35 : -0.35 });
          brass.chord(B(bar, bt), 0.29, BRASS[c], v * 0.95);
        });
        legPhrase(ther, B(157), '_:1 A6:1@0.56 | F6:2@0.58 | _:1.5 F#5:.5@0.5 | A5:.5@0.52 C6:.5@0.55 D#6:1@0.58', { vibrato: 0.6 });
        reed.play(B(161), SNEAK, { vel: 0.5, shape: 'arch', shapeAmt: 0.15, transpose: 1 });
        pizzV.play(B(161), SNEAK8, { vel: 0.5, shape: 'arch', shapeAmt: 0.15, transpose: 1 });
        pizz.play(B(161), "F#4:.5' A#4:.5' D#5:.5' C#5:.5' | D#5:.5' A#4:.5' _:.5 A#4:.5' | A4:.5' _:1.5", { vel: 0.46 });   // final: written out in F# (162: A#4, not B#)
        riqFill(164, 0.6);
        // D4 165-172: the CLIMAX, back in E. f1: a pickup from 164 (C6 D#6: the pivot's C and the leading tone) onto E6;
        // the b6-5 sigh, a Dm arpeggio to A6, G#6 over B° (dim7); then the SWELL: G#6 held 3.5 beats over the F pair (bII:
        // the augmented 2nd against F and a semitone under its A), the violas crescendo A3-F4 and a jingle roll under it, a
        // short B6 pickup, and the PAYOFF at full length: F6 a whole beat over E (b9 against the pivot B4 and the tuba E2)
        // -> E6 held 3 beats, while the violas resolve A-G#, F-E with it (b2-1 in three voices)
        const cO = { players: 1, sharp: 14, sharpStart: 12, creep: 4, vibrato: 0.32, amp: 0.9 };
        const X = pass ? -12 : 0, xv = pass ? 0.04 : 0;
        const tp = (arr) => arr.map(([p, d, v, ex]) => [p === '_' ? p : transposeName(p, X), d, v == null ? v : v + xv, ex]);
        legLine(whistleD, B(164, 2), tp([['C6', 0.5, 0.5], ['D#6', 0.5, 0.54, { tag: 'tension' }],
          ['E6', 1.5, 0.6], ['B5', 0.5, 0.55],
          ['C6', 0.5, 0.57], ['B5', 0.5, 0.55], ['G#5', 0.5, 0.53], ['B5', 0.5, 0.55],
          ['D6', 0.5, 0.6], ['F6', 0.5, 0.62], ['A6', 1, 0.62],
          ['G#6', 1, 0.61, { tag: 'tension' }], ['F6', 0.5, 0.58], ['E6', 0.5, 0.57]]), { ...cO, scoop: -0.2, fall: -20 });
        legLine(whistleD, B(169), tp([['G#6', 3.5, 0.65, { expr: 'swell', tag: 'tension' }], ['B6', 0.5, 0.63],
          ['F6', 1, 0.66, { tag: 'tension' }], ['E6', 3, 0.6]]), { ...cO, scoop: -0.45, fall: -30 });
        strD.chord(B(169), 4.02, ['A3', 'F4'], 0.42, { expr: 'cresc', tag: 'tension' });
        strD.chord(B(171), 4, ['G#3', 'E4'], 0.42, { expr: 'dim' });
        roll.hit(B(169), 4, 0.3, { from: 0.3, to: 0.85 });
        stab.chord(B(171), 0.25, V2.E, 0.48, { pan: 0 }); zils.note(B(171), 2, 'E7', 0.32);
        cel.play(B(172), '_:.5 G#5:.25 A5:.25 F5:.5 E5:.5', bO(0.3));   // the echo an octave under the held E6
        // the mix makes room for the whistle: chop and pizz step back 1.5 dB while it plays
        for (const [b0, b1] of [[141, 145], [153, 157], [165, 173]]) for (const k of ['chop', 'pizz']) dipPts[k].push([B(b0) - 0.5, 0], [B(b0), -1.5], [B(b1) - 0.25, -1.5], [B(b1), 0]);
        if (!full) {   // caper_final: a 2-beat riser back into bar 141 (= bars 1 and 33)
          riser.note(B(172), 2, 'E5', 0.44);
          roll.hit(B(172), 2, 0.42, { from: 0.4, to: 0.9 });
        }
      };
      dSection(0);
      if (!full) { OFF = 108; dSection(1); OFF = 140; }
      const byT = (a) => a.sort((x, y) => x[0] - y[0]);
      busChop.automate('gain', byT([...dipPts.chop, ...(full ? [[B(9) - 0.25, 0], [B(9), 1], [B(41) - 0.6, 1], [B(41) - 0.5, 0], [B(173) + 0.25, 1], [B(180), 1], [B(181) - 0.25, 0], [B(41), -2.2], [B(49) - 0.25, -2.2], [B(49), 0], [B(57) - 0.5, 0], [B(57), -2.2], [B(61) - 0.25, -2.2], [B(61), 0], [B(69) - 0.5, 0], [B(69), -2.2], [B(73) - 0.5, -2.2], [B(73), 0]] : [])]));   // B: the guitar chop 2.2 dB down under the whistle (final: full level in the groove-alone bars, B is the lift terrace)
      busPizz.automate('gain', byT(dipPts.pizz));

      if (full) {
        // into T: a tuba approach G2 F#2 -> F2 and a snare ruff
        tuba.note(B(172, 2.5), 0.25, 'G2', 0.6); tuba.note(B(172, 2.75), 0.25, 'F#2', 0.64);
        [0, 1, 2].forEach((k) => snare.hit(B(172, 2.5 + k / 6), 0.17, 0.3 + 0.1 * k));
        // ================================================================ T  173-180  turnaround F | B7b9 -> D#2
        s.section('T turn', B(173), B(181), 'release');
        const aOptT = (i, extra = {}) => ({ i, ph: 1, tv: 0.7, kick: 0.62, chop: 'acc', cv: 0.56, clap: 0.46, jing: 'off', jv: 0.44, ends: false, shim: 0.36, tdur: 0.9, tb: 1.9, pah5: 0.36, len: [0.44, 0.56], rel: 0.11, ...extra });   // f1: shimmer, longer tuba, pah fifth
        const PT = [
          { c: 'F', t: 'F2' }, { c: 'F', t: 'C2' }, { c: 'B7b9', t: 'B1' }, { c: 'B7b9', t: 'F#2' },
          { c: 'F', t: 'F2' }, { c: 'F', t: 'A1' }, { c: 'B7b9', t: 'B1' }, { c: 'B7b9', t: 'B1' },
        ];
        PT.forEach((h, i) => {
          const bar = 173 + i;
          if (i < 4) oomPah(bar, h, aOptT(i, { pizz: 0.48 }));
          else if (i < 7) oomPah(bar, h, aOptT(i, { tv: 0.64, kick: 0.5, cv: 0.42, clap: 0.36, jing: 'shake', jv: 0.42, pizz: 0.4 }));
          if (bar !== 180) marCell(bar, h.c, 'flick', i < 4 ? 0.36 : 0.42, i);   // over B7b9 the TICK doubles the b9
        });
        acc.chord(B(173), 4, ['A3', 'C4', 'F4'], 0.46, { expr: 'dim', wet: 0.3 });
        acc.chord(B(175), 4, ['A3', 'C4', 'D#4'], 0.48, { expr: 'dim', wet: 0.3, tag: 'tension' });
        cel.play(B(177), 'C7:.5 B6:.5 A6:.5 F6:.5 | E6:1 _:1', bO(0.4));
        // f1: the violas con sordino carry D's colour into the turnaround (A3-F4 -> A3-D#4: F -> B7b9), then the glue
        strD.chord(B(173), 4.02, ['A3', 'F4'], 0.4, { expr: 'swell' }); strD.chord(B(175), 4, ['A3', 'D#4'], 0.4, { expr: 'flat', tag: 'tension' });   // final: held through 176 (T's mid had holes)
        glueRun(177, PT.slice(4, 7), 0.29);
        // 180: B on 1, a light chop on 2 (T does not hollow out before the seam), marimba B, bell, jingle, the tuba's D#2
        // on the last 8th -> E2 (bar 1)
        chopAcc2.chord(B(180, 2), 0.16, V2.B7b9, 0.36);
        tuba.note(B(180), 0.5, 'B1', 0.6);
        pizz.note(B(180), 0.5, 'B3', 0.4);
        kick.note(B(180), 0.5, 'E1', 0.42);
        mar.note(B(180), 0.5, 'C6', 0.34, { tag: 'tension' }); mar.note(B(180, 1.5), 0.5, 'B5', 0.3);   // final: the b9 resolves inside the bar
        glock.note(B(180, 2), 0.5, 'B6', 0.22);
        tambB.hit(B(180, 2), 0.25, 0.36, { stroke: 'shake' });
        shak.note(B(180, 2.75), 0.25, null, 0.3); shimBar(180, 0.24, 4);   // f1: the shimmer runs through the seam
        tuba.note(B(180, 2.5), 0.4, 'D#2', 0.62);
        // the phone hears the tuba's harmonics: +0.5 dB in K (with firmer, brighter notes); A and T sit a little lighter (the chop carries them)
        busTuba.automate('gain', [[B(9) - 0.25, 0], [B(9), -1], [B(41) - 0.25, -1], [B(41), 0], [B(73) - 0.25, 0], [B(73), 0.5], [B(85) - 0.25, 0.5], [B(85), 0], [B(173) - 0.25, 0], [B(173), -0.5], [B(180), -0.5], [B(181) - 0.25, 0]]);   // final: A and T 1 dB lighter below (their phone loss after a 300 Hz HP was 3.6-3.8 LU)
        s.length(B(181));
      } else {
        s.length(s.bar(65));   // caper_final: D twice
      }
    },
  };
}

export default makeCaper('full');
