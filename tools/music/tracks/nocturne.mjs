// "Nocturne": slow, wide, nocturnal cue in E minor for harp, solo cello, solo violin, strings, horns,
// a distant choir and celesta. About 3:00, loops seamlessly (bar 44 is a dominant that resolves into bar 1).
// Fourth draft (quality gate 1): the arrival of the climax is the motif in augmentation and the highest note so
// far, the build's top line climbs to it, the harp leaves for the answer and the release, the pads are true legato
// lines that breathe, the horns get a real counter-melody on their own bus, the soloists sit back in the gentle
// half, and the seam region no longer repeats the hook literally.
// Fifth draft (quality gate 2): the intro seeds the motif (celesta B-G-F#), bar 11 no longer repeats the apex A4,
// the climax is played (mf timbre in the low strings and violas, brassy horn pad) instead of mixed loud, its
// registers are separated (choir a halo above the horn counter-melody, which starts alone on E4), the apex G6
// sits over E in the bass (E -> F by a semitone), the top line closes the climax on the half cadence, the
// release cadence is re-harmonised (no third E -> D# suspension), and the coda has a soft viola floor.
// Sixth draft (quality gate 3): the falling chromatic line belongs to the theme's bass alone (the intro's inner
// line now rises E-F-F#-G, a bII colour that prepares bar 32; the coda's B/D# became Am/C); the consequent gets a
// real descant (muted 2nd violins E5-D#5-C5-B4) instead of a doubled fifth, and the violas a counter-line in bars
// 7-8; the arrival is reharmonised (F#m7b5, then G+ under the climb, its D# rising to E under the apex G6, which
// is now reached by a tenth); the climax is played louder (velocity and timbre) instead of faded up; the release
// canon is a solo violin over a celli section; the pads shape 4-bar phrases instead of every chord; the seam
// region is brighter, louder on a phone and carries the hook only once.
//
// node tools/music/render.mjs nocturne
//
// ============================================================================================================
// MOTIF (stated by the solo cello in bars 5-6)
//
//     B3:1  G4:2  F#4:.5 E4:.5 | D#4:1.5  E4:.5  B3:2           (the first statement only; see the rhythms below)
//     cell a = "reach and fall": a rising minor sixth, then a semitone fall      (B -> G -> F#)
//     cell b = "turn on the leading tone": a semitone below and back, then a fourth down (E -> D# -> E -> B)
//
// DEVELOPMENT PLAN
//   bars  5-8   statement (cello; a con sordino viola sheen only where it sustains). Bar 6 ties the E4 over the
//               barline as a 9-8 suspension; bars 7-8 are the tonal sequence one step down with the same
//               suspension, and a muted viola counter-line rises above it (A4 - B4, a 9-8 over A/C#).
//   bars  9-12  consequent, softer: the leap widened to a seventh; the sus4 E4 is held until the chord turns to B7;
//               bar 11 climbs the Am7 arpeggio C-E-G, leans G -> F# and turns up to A4 (the apex A4 is bar 9's
//               alone); b9 appoggiatura C4 over B7 (half cadence). Muted 2nd violins sing a descant E5-D#5-C5-B4.
//   bars 13-16  imitation: the solo violin takes the motif an octave up over Cmaj7 (deceptive resolution), the
//               Lydian C#5 resolving to D5 before the stretched sixth (A5). No harp here: divided strings (all
//               still con sordino) and a viola pizzicato on beats 1 and 3. The cello's counter-line is syncopated and ties over the
//               barlines (B3 a 9-8 over Am7, D4 held into D7/F# and falling to its seventh C4).
//   bars 17-18  the harp returns with a glissando and the strings take their mutes off; cello motif over the
//               Phrygian bII, violin holds E5 above.
//   bars 19-20  inversion (violin), falling D5-C5-B4 in A harmonic minor over E7, the B4 held as a 9-8 into bar 21.
//   bars 21-24  fragmentation: cell a tossed between cello and violin, the leap varying (m6, m7, m6, m7, m7, 8ve)
//               and the top climbing F4 - B4 - F5 - G5; the slur is broken before each leap.
//   bars 25-26  diminution: only the semitone sighs, one per beat, alternating 2nd violins / violas (E-D#, G-F#,
//               A-G, C-B), then the violins enter (C5-A5-G5-F#5) while the violas play cell b (F-E-F-C).
//   bars 27-28  the violins climb to C6, fall to B5 (4-3 over G7) and hold it over the dominant, swelling into the
//               arrival; G5 on the last beat is the motif's first note.
//   bars 29-30  ARRIVAL: the motif in augmentation in C major across the barline: G5 -> E6 (major sixth) on the
//               downbeat, then the stepwise fall D6-C6-B5-A5 over Am9 and F#m7b5. 2nd violins an octave below;
//               the G7's F5 (2nd violin tremolo) resolves to their E5, the violas take F4 -> E4 and B3 -> C4.
//   bars 31-33  apex: over B+ (D# rising to E in the violas) the line turns down to E5 and leaps a tenth to G6,
//               the widest leap of the cue; 9-7-8 over F and cell b lifted (E-F-C); C-C#-D over Dm(maj7). The
//               horns (doubled by a few celli) sing an independent counter-melody: E4 F#4 G4 | A4 | G4 E4 | A4 G4 |
//               F4 | D#4. The apex G6 lands over E in the bass, which then rises a semitone to F.
//   bar  34     the first violins close the line on the half cadence: D6 - C6 (b9) - B5 - A5 - G#5 (Picardy, bar 35).
//   bars 35-38  the inversion in canon (solo violin, a celli section one bar later and an octave lower) over
//               sustained strings and a sparse harp; cadence C/E - F#m7b5/C - B7(b9) with the violin's C5 -> B4
//               (no sus4 here). The harp sweeps up the B7 at bar 38. The violin's A4 (7th of B7) resolves to G4 on the downbeat of
//               bar 39 and hands over to the celesta.
//   bars 39-44  coda: celesta plays cell b and falls C6-B5-A5 over Am/C (a memory, not the hook); the cello's
//               farewell (cell a at home pitch) is the only literal statement between bar 31 and bar 5 (the intro's
//               celesta only hints at it: B5-E6, then the sigh F#6-E6).
//
// HARMONIC PLAN (E minor)
//   Intro    1 Em(add9) | 2 Fmaj7/E | 3 B7sus4/E | 4 Em              E pedal; choir and harp inner line E-F-F#-G
//   A1       5 Em | 6 B/D# | 7 Bm7/D | 8 A/C# | 9 Cmaj7 | 10 B7sus4 / B7 | 11 Am7 / F#o7/A | 12 B7(b9)
//   A2      13 Cmaj7 | 14 Am7 / D | 15 Gmaj7#11 | 16 D7/F# / G | 17 Fmaj7#11 | 18 B7/F# | 19 Em/G | 20 E7/G#
//   Build   21 Am(add9) | 22 A#o7 | 23 Bm7 / Cmaj7 | 24 C#m7b5 / D7 | 25 D#o7 / Em(maj7) | 26 Fmaj7#11 / F#m7b5
//           27 G7sus4 / G7(b13) | 28 G7(13) / G7
//   Climax  29 C(add9) / C6/E | 30 Am9 / F#m7b5 | 31 B+ (V+, = G+/B) / Em | 32 Fmaj7#11 | 33 Dm(maj7)/F | 34 B7(b9)/F# / B7
//   Release 35 E(add9) | 36 Am7(add9) | 37 C6/E / F#m7b5/C | 38 B7(b9)
//   Coda    39 Em(add9) | 40 Am/C | 41 Cmaj7/E | 42 Am/E | 43 Fmaj7/E | 44 B7sus4 / B7  -> bar 1
// ============================================================================================================

import { n } from '../engine.mjs';

// ---- chord table: [bar, beat, lengthInBeats, name, voices] -------------------------------------------------
// voices: cb contrabass, vc celli, vla violas, vln2 second violins, vlaT / vln2T tremolo, hn horn pad,
// ch choir, hp harp tones (low to high). "!" marks an intended dissonance (tagged "tension" in the score).
const H = [
  // Intro: harp (in its singing octave, so a phone hears it) and distant choir over an E pedal. The inner line
  // RISES by semitones (E - F - F# - G): a Phrygian bII colour that the climax (bar 32) and the coda (bar 43)
  // return to (the celli move with it, B2 - C3 - B2). The falling chromatic line is kept for the theme's bass alone.
  // No B in the choir in bars 1-3 (the celli hold it).
  [1, 1, 4, 'Em(add9)', { cb: 'E2', vc: 'B2', hp: 'G3 E4 F#4! B4 E5', ch: 'G3 E4' }],
  [2, 1, 4, 'Fmaj7/E', { cb: 'E2', vc: 'C3', hp: 'A3 C4 F4! A4 C5', ch: 'A3 F4!' }],
  [3, 1, 4, 'B7sus4/E', { cb: 'E2', vc: 'B2', hp: 'F#3 A3 E4 F#4 B4', ch: 'A3 F#4' }],
  [4, 1, 4, 'Em', { cb: 'E2', vc: 'B2', hp: 'G3 E4 G4 B4 E5', ch: 'B3 G4' }],
  // A1: cello theme over a chromatic lament bass; dark sordino violas and celli.
  [5, 1, 4, 'Em', { cb: 'E2', vc: 'E3', vla: 'G3', hp: 'B2 E3 G3 B3' }],
  // (no D# in the harp: the cello's E4 appoggiatura is still sounding on beat 1)
  [6, 1, 4, 'B/D#', { cb: 'D#2', vc: 'D#3', vla: 'F#3', hp: 'F#3 B3 F#4 B4' }],
  [7, 1, 4, 'Bm7/D', { cb: 'D2', vc: 'D3', vla: 'F#3 B3', hp: 'A2 F#3 B3 D4' }],
  [8, 1, 4, 'A/C#', { cb: 'C#2', vc: 'C#3', vla: 'E3 A3', hp: 'C#3 E3 A3 C#4' }],
  // consequent: lighter harp (no bass strings); the muted 2nd violins sing a descant E5 - D#5 - C5 - B4 (tenths
  // over the bass, then contrary motion into the octave; the E5 is held as the sus4 and steps to D#5 with the
  // chord: the celli leave the D# to it and drop to B2); the violas fall G3 -> E3 and keep B3 over the sus4 (no
  // fifths with the basses C -> B or with the cello)
  [9, 1, 4, 'Cmaj7', { cb: 'C2', vc: 'E3', vla: 'G3 B3!', vln2: 'E5', hp: 'G2 E3 G3 B3!' }],
  [10, 1, 2, 'B7sus4', { cb: 'B1', vc: 'E3', vla: 'E3 B3', vln2: 'E5', hp: 'F#2 B2 E3 A3' }],
  [10, 3, 2, 'B7', { cb: 'B1', vc: 'B2', vla: 'F#3 A3', vln2: 'D#5', hp: 'F#2 B2 F#3 A3' }],
  [11, 1, 2, 'Am7', { cb: 'A1', vc: 'E3', vla: 'G3 C4', vln2: 'C5', hp: 'E2 C3 E3 G3' }],
  [11, 3, 2, 'F#o7/A', { cb: 'A1', vc: 'E3', vla: 'F#3 C4', vln2: 'C5', hp: 'E2 C3 F#3 A3' }],
  [12, 1, 4, 'B7(b9)', { cb: 'B1', vc: 'D#3', vla: 'F#3 A3', vln2: 'B4', hp: 'F#2 D#3 F#3 A3' }],
  // A2: violin theme over divided strings (no harp in 13-16), cello counter-melody, horns from 15. The 2nd
  // violins keep their mutes on (a veiled pad under the soloist) and take them off in the rest of bar 16.
  [13, 1, 4, 'Cmaj7', { cb: 'C2', vc: 'E3', vla: 'G3', vln2: 'B3! E4' }],
  [14, 1, 2, 'Am7', { cb: 'A1', vc: 'E3', vla: 'G3', vln2: 'E4 A4' }],
  [14, 3, 2, 'D', { cb: 'D2', vc: 'F#3', vla: 'A3', vln2: 'D4 A4' }],
  // the 2nd violins leave D4 to B3 while the cello's C#4 leans on D4 (no appoggiatura against its own resolution)
  [15, 1, 2, 'Gmaj7#11', { cb: 'G1', vc: 'D3', vla: 'B3', vln2: 'D4 F#4!', hn: 'D3 B3' }],
  [15, 3, 2, 'Gmaj7#11', { cb: 'G1', vc: 'D3', vla: 'B3', vln2: 'B3 F#4!', hn: 'D3 B3' }],
  [16, 1, 2, 'D7/F#', { cb: 'F#2', vc: 'D3', vla: 'C4', vln2: 'D4 F#4', hn: 'D3 C4' }],
  [16, 3, 2, 'G', { cb: 'G2', vc: 'G3', vla: 'B3', hn: 'D3 B3' }],
  // the horns' D3 is held over the barline (F6 colour) and falls to C3 on beat 3: no fifths with the basses G -> F
  [17, 1, 2, 'Fmaj7#11', { cb: 'F2', vc: 'C3', vla: 'C4', vln2: 'A4', hp: 'C3 F3 A3 E4!', hn: 'D3 A3' }],
  [17, 3, 2, '+Fmaj7#11', { cb: 'F2', vc: 'C3', vla: 'C4', vln2: 'A4', hn: 'C3 A3' }],
  // (the violas fall C4 -> A3 and the horns take F#3: no octaves with the celli C3 -> B2)
  [18, 1, 4, 'B7/F#', { cb: 'F#2', vc: 'B2', vla: 'A3', vln2: 'A4', hp: 'B2 F#3 A3 D#4', hn: 'B2 F#3' }],
  // the harp's upper note is G4 (not E4): the violin's D#4 appoggiatura must not sound against its resolution
  [19, 1, 4, 'Em/G', { cb: 'G1', vc: 'G3', vla: 'E3 B3', hp: 'E3 G3 B3 G4', hn: 'E3 G3' }],
  // V/iv: the leading tone G# only in the basses and the violin (both rise to A); the celli keep E
  [20, 1, 4, 'E7/G#', { cb: 'G#1', vc: 'E3', vla: 'E3 B3', hp: 'E3 B3 D4 E4', hn: 'E3 D4' }],
  // Build: chromatic bass, harmonic rhythm doubles at 23, tremolo at 25, dominant pedal 27-28.
  [21, 1, 4, 'Am(add9)', { cb: 'A1', vc: 'A2 A3', vla: 'E3 A3', vln2: 'C4', hp: 'A2 E3 A3 B3! C4 E4' }],
  [22, 1, 4, 'A#o7', { cb: 'A#1', vc: 'A#2', vla: 'E3 G3', vln2: 'C#4', hp: 'A#2 E3 G3 C#4 E4' }],
  [23, 1, 2, 'Bm7', { cb: 'B1', vc: 'B2', vla: 'F#3 A3', vln2: 'D4', hp: 'B2 F#3 A3 D4 F#4', hn: 'B2 F#3' }],
  // contrary motion into Cmaj7 (no parallel fifths B/F# -> C/G): violas F#3 -> E3, horns F#3 -> E3. The 2nd
  // violins stay on D4 under the violin's F5 appoggiatura and take the E4 only with its resolution.
  [23, 3, 1.5, 'Cmaj7', { cb: 'C2', vc: 'C3', vla: 'E3 B3!', vln2: 'D4', hp: 'C3 E3 G3 B3! E4', hn: 'C3 E3' }],
  [23, 4.5, 0.5, '+Cmaj7', { cb: 'C2', vc: 'C3', vla: 'E3 B3!', vln2: 'E4', hn: 'C3 E3' }],
  [24, 1, 2, 'C#m7b5', { cb: 'C#2', vc: 'C#3', vla: 'G3 B3', vln2: 'E4', hp: 'C#3 G3 B3 E4 G4', hn: 'C#3 G3' }],
  // (D4, not F#4, under the violin's G5 appoggiatura; the F#4 comes with the resolution)
  [24, 3, 1.5, 'D7', { cb: 'D2', vc: 'D3', vla: 'A3 C4', vln2: 'D4', hp: 'D3 A3 C4 F#4 A4', hn: 'D3 A3' }],
  [24, 4.5, 0.5, '+D7', { cb: 'D2', vc: 'D3', vla: 'A3 C4', vln2: 'F#4', hn: 'D3 A3' }],
  // 25-28: the harp sinks below the tune; no choir (it enters as a new colour at the arrival); the horns take
  // their own chord tones in thirds instead of shadowing the viola tremolo
  [25, 1, 2, 'D#o7', { cb: 'D#2', vc: 'D#3', vlaT: 'A3 C4', hp: 'D#2 A2 F#3 A3 C4', hn: 'D#3 F#3' }],
  [25, 3, 2, 'Em(maj7)', { cb: 'E2', vc: 'E3', vlaT: 'B3 D#4!', hp: 'E2 B2 G3 B3 D#4!', hn: 'E3 G3' }],
  [26, 1, 2, 'Fmaj7#11', { cb: 'F2', vc: 'F3', vlaT: 'C4 E4!', hp: 'F2 C3 E3! A3 C4', hn: 'F3 A3' }],
  [26, 3, 2, 'F#m7b5', { cb: 'F#2', vc: 'F#3', vlaT: 'C4 E4', hp: 'F#2 C3 E3 A3 C4', hn: 'F#3 A3' }],
  // 27-28: the harp stays below the violins' held B5 (no B3/D4 on top in bar 28)
  [27, 1, 2, 'G7sus4', { cb: 'G1', vc: 'G2', vlaT: 'C4 F4', vln2T: 'D5', hp: 'G2 D3 F3 G3 C4', hn: 'G3 D4' }],
  [27, 3, 2, 'G7(b13)', { cb: 'G1', vc: 'G2', vlaT: 'B3 F4', vln2T: 'Eb5!', hp: 'G2 D3 F3 G3 B3', hn: 'G3 D4' }],
  [28, 1, 2, 'G7(13)', { cb: 'G1', vc: 'G2', vlaT: 'B3 F4', vln2T: 'E5!', hp: 'G2 D3 F3 G3', hn: 'G3 D4' }],
  [28, 3, 2, 'G7', { cb: 'G1', vc: 'G2', vlaT: 'B3 F4', vln2T: 'F5', hp: 'G2 D3 F3 G3', hn: 'D3 F3' }],
  // Climax: C (VI) arrival, apex 31-32, pivot through F (IV of C = bII of E) back towards E minor. The second
  // violins play the tune an octave below the firsts from bar 29, so they have no pad here. The arrival is not a
  // plain IV-ii-V-I in G: the D/F# became F#m7b5 (C in the violas), and the bar before the apex is B+ (the G+ of the
  // intro's Em(maj7) colour over a dominant bass: F# - B - E is a ii-V-i in E minor) whose D# (violas, harp)
  // rises to E with the bass under the apex G6; the celli fall C3 -> B2 against the violins' A5 -> B5. The choir is a halo at or below E5 (the top octave belongs to the violins), and it leaves
  // the E5 after the arrival (no held E under the violins' E6: that octave stack whistled).
  [29, 1, 2, 'C(add9)', { cb: 'C2', vc: 'C3', vla: 'G3 C4', hp: 'C2 G2 D3 E3 G3 C4 D4 E4 G4', hn: 'C3 E3', ch: 'G4 C5 E5' }],
  [29, 3, 2, 'C6/E', { cb: 'E2', vc: 'C3', vla: 'G3 C4', hp: 'E2 C3 G3 C4 E4 A4 C5', hn: 'C3 E3', ch: 'A4 C5 E5' }],
  [30, 1, 2, 'Am9', { cb: 'A1', vc: 'A2', vla: 'C4 E4', hp: 'A1 E2 E3 A3 C4 E4 G4', hn: 'E3 A3', ch: 'E4 A4 C5' }],
  [30, 3, 2, 'F#m7b5', { cb: 'F#2', vc: 'C3', vla: 'A3 C4', hp: 'F#2 C3 A3 C4 E4 A4 C5', hn: 'E3 A3', ch: 'F#4 A4 C5' }],
  [31, 1, 2, 'B+', { cb: 'B1', vc: 'B2', vla: 'G3 D#4!', hp: 'B1 G3 D#4! G4 B4', hn: 'G3 B3', ch: 'G4 B4' }],
  [31, 3, 2, 'Em', { cb: 'E2', vc: 'E3', vla: 'G3 E4', hn: 'G3 B3', ch: 'G4 B4 D5' }],
  [32, 1, 4, 'Fmaj7#11', { cb: 'F2', vc: 'C3', vla: 'A3 E4!', hp: 'F2 C3 A3 E4! G4 B4! C5', hn: 'F3 A3', ch: 'F4 A4 C5' }],
  // no D in the middle register under the violas' C#4 (and the violins' C# -> D): horn pad F3 A3, choir above
  [33, 1, 4, 'Dm(maj7)/F', { cb: 'F2', vc: 'D3', vla: 'A3 C#4!', hp: 'F2 D3 A3 C#4! F4 A4', hn: 'F3 A3', ch: 'F4 A4 D5' }],
  [34, 1, 2, 'B7(b9)/F#', { cb: 'F#2', vc: 'D#3', vla: 'A3 C4!', hp: 'F#2 D#3 A3 C4! F#4', hn: 'F#3 A3 C4!', ch: 'F#4 A4 D#5' }],
  // (the b9 C resolves to B in the violins only; the violas and horns move away from it, no doubled resolution)
  [34, 3, 2, 'B7', { cb: 'B1', vc: 'B2', vla: 'F#3 A3', hp: 'B1 F#2 B2 A3 D#4 F#4', hn: 'F#3 A3', ch: 'F#4 A4 D#5' }],
  // Release: the inversion in canon (solo violin, celli section one bar later) over sustained strings and a sparse
  // harp. The cadence is C6/E - F#m7b5/C - B7(b9) with the violin's C5 -> B4. The 2nd violins go B4 - G4 - A4 -
  // F#4 (no fifths with the bass E -> A, no unison with the soloist's C5, no octaves with the celli B2 -> A2; the A4
  // is the sixth of C/E); the violas keep E3 from bar 35 (no fifths with the basses or the celli) and move to F#3
  // with the half-diminished chord; the Picardy G# is the violins' alone.
  [35, 1, 4, 'E(add9)', { cb: 'E2', vc: 'B2', vla: 'E3', vln2: 'B4', hn: 'B2 G#3', ch: 'G#3 B3' }],
  [36, 1, 4, 'Am7(add9)', { cb: 'A1', vc: 'A2', vla: 'E3', vln2: 'G4', hn: 'E3 C4', hp: 'A2 E3 A3 C4' }],
  [37, 1, 2, 'C6/E', { cb: 'E2', vc: 'C3', vla: 'E3', vln2: 'A4', hn: 'E3 G3', hp: 'E3 G3 C4 E4' }],
  [37, 3, 2, 'F#m7b5/C', { cb: 'C2', vc: 'C3', vla: 'F#3', vln2: 'F#4', hn: 'E3 A3', hp: 'C3 F#3 A3 C4' }],
  [38, 1, 2, 'B7(b9)', { cb: 'B1', vc: 'B2', vla: 'F#3', vln2: 'F#4', hp: 'B2 F#3 A3 C4! D#4 F#4 A4 B4', hn: 'F#3 A3' }],
  [38, 3, 2, 'B7(b9)', { cb: 'B1', vc: 'B2', vla: 'F#3', vln2: 'F#4', hp: 'B1 F#2 A3 D#4', hn: 'F#3 A3' }],
  // Coda: the E pedal again, but bar 40 is Am/C (no second E -> D# step next to the seam: the leading tone is heard
  // only on the theme's bar 6 and in the last dominant). A soft con sordino viola line fills the floor; in bar 44
  // the violas and the harp carry the dominant in the middle register so a phone hears it.
  [39, 1, 4, 'Em(add9)', { cb: 'E2', vc: 'B2', vla: 'G3', hp: 'G3 B3 E4 F#4! B4', ch: 'G3 E4' }],
  [40, 1, 4, 'Am/C', { cb: 'C2', vc: 'E3', vla: 'A3', hp: 'E3 A3 C4 E4 A4', ch: 'C4 E4' }],
  [41, 1, 4, 'Cmaj7/E', { cb: 'E2', vc: 'C3', vla: 'G3', hp: 'C3 G3 B3! E4', ch: 'G3 E4' }],
  [42, 1, 4, 'Am/E', { cb: 'E2', vc: 'A2', vla: 'A3', hp: 'A2 E3 C4 E4', ch: 'A3 C4' }],
  // the harp's upper notes avoid E4 (the choir's F4 appoggiatura must not sound against its resolution)
  [43, 1, 4, 'Fmaj7/E', { cb: 'E2', vc: 'C3', vla: 'A3', hp: 'C3 A3 C4 F4! A4', ch: 'A3 F4!' }],
  [44, 1, 2, 'B7sus4', { cb: 'B1', vc: 'F#2', vla: 'A3 E4', hp: 'B2 F#3 A3 E4', ch: 'A3 F#4' }],
  [44, 3, 2, 'B7', { cb: 'B1', vc: 'F#2', vla: 'A3 D#4', hp: 'B2 F#3 A3 F#4', ch: 'A3 F#4' }],
];

// Composed dynamic plan for the accompaniment: [bar, beat, level 0..1]. The gentle half stays low, the build
// rises in steps, the arrival (bar 29) is the loudest downbeat, the apex is broad rather than loud. The climax
// values give the low strings and violas a forte timbre (velocity is timbre); their level is held back by the bus
// gains, so the loudness arc stays narrow for a long session while the sound still leans in.
const DYN = [
  [1, 1, 0.44], [4, 3, 0.44], [5, 1, 0.38], [9, 1, 0.39], [11, 1, 0.38], [12, 3, 0.38], [13, 1, 0.38], [17, 1, 0.41],
  [19, 1, 0.39], [21, 1, 0.42], [23, 1, 0.46], [25, 1, 0.48], [26, 1, 0.5], [27, 1, 0.56], [28, 3, 0.61], [29, 1, 0.7],
  [30, 3, 0.64], [31, 1, 0.68], [32, 3, 0.58], [33, 1, 0.52], [34, 1, 0.46], [34, 3, 0.42], [35, 1, 0.4],
  [36, 1, 0.39], [38, 1, 0.38], [38, 3, 0.4], [39, 1, 0.44], [43, 1, 0.43], [45, 1, 0.44],
];

const tok = (str) => (str || '').trim().split(/\s+/).filter(Boolean)
  .map((t) => ({ p: n(t.replace('!', '')), tag: t.endsWith('!') }));
const tagOf = (on, o = {}) => (on ? { ...o, tag: 'tension' } : o);

// Harp broken-chord orders by voicing size: never more than one note per string in a row.
const TRIP = {
  4: [0, 2, 1, 3, 2, 1, 0, 2, 1, 3, 2, 1],
  5: [0, 2, 1, 3, 2, 4, 3, 1, 2, 4, 3, 1],
  6: [0, 2, 1, 3, 2, 4, 3, 5, 4, 2, 3, 1],
};
const upDown = (len) => [...Array.from({ length: len }, (_, i) => i), ...Array.from({ length: Math.max(0, len - 2) }, (_, i) => len - 2 - i)];

export default {
  id: 'nocturne',
  title: 'Nocturne',
  bpm: 54,
  loop: true,

  build(s) {
    s.meter(4, 4);
    s.reverb('hall');
    s.reverb({ rt60: 3.1 });
    s.delay({ beats: 0.75, feedback: 0.28 });
    // early reflections for the soloists (they sit in front of the sections)
    s.room('room');
    // the instruments are brightened at the source and on their buses in the gentle half, so the master shelves
    // only add air (above the 2-5 kHz band, so the climax does not get harsh)
    s.master({ lufs: -16, eq: [{ type: 'peak', f: 350, q: 0.9, gain: -0.5 }, { type: 'highshelf', f: 6500, gain: 3 }, { type: 'highshelf', f: 9500, gain: 2.5 }] });
    s.humanize = { time: 0.011, vel: 0.05 };
    const B = (bar, beat = 1) => s.bar(bar, beat);

    // ---- tempo map: the loop starts where the coda's rit. ends (54), a tempo by bar 5; rubato at cadences,
    // accelerando through the build, broad climax, rit. into the loop
    s.tempo(0, 54);
    s.tempo(B(5), 60, { ramp: true });
    s.rit(B(12, 3), B(13), 53); s.tempo(B(13), 60);
    s.rit(B(20, 3), B(21), 55); s.tempo(B(21), 60);
    s.tempo(B(27), 66, { ramp: true });
    s.rit(B(28, 3), B(29), 58); s.tempo(B(29), 56);
    s.rit(B(33, 3), B(35), 52); s.tempo(B(35), 58);
    s.rit(B(38, 3), B(39), 52); s.tempo(B(39), 56);
    s.rit(B(43), B(45), 52);

    // ---- sections
    s.section('intro', B(1), B(5), 'gentle');
    s.section('theme (cello)', B(5), B(13), 'gentle');
    s.section('answer (violin)', B(13), B(21), 'gentle');
    s.section('build', B(21), B(29), 'tension');
    s.section('climax', B(29), B(35), 'climax');
    s.section('release', B(35), B(39), 'release');
    s.section('coda', B(39), B(45), 'gentle');

    // ---- mixer
    // concert-hall seating (violins left, celli and basses right); the harp's low strings are shelved off so the
    // bowed basses carry the low end and the harp keeps its shimmer. The harp sits nearer the centre (it leads at
    // the seam, where a side-heavy harp pulled the image left) and narrower than the climax buses, which widen.
    const hpBus = s.bus('harp', { gain: -11.5, pan: -0.22, reverb: 0.3, width: 1.0, eq: [{ type: 'lowshelf', f: 250, gain: -6 }, { type: 'peak', f: 280, q: 1, gain: -2.5 }, { type: 'highpass', f: 70 }, { type: 'peak', f: 2800, q: 0.8, gain: 2.5 }, { type: 'highshelf', f: 5000, gain: 6 }, { type: 'highshelf', f: 8000, gain: 3 }] });
    // the soloists stand in front of the sections: drier (less hall, some early reflections), more air (the cello
    // body rolls off steeply above 4 kHz; a hall recording keeps more top), presence, less 300 Hz
    const vcSoloBus = s.bus('soloCello', { gain: -5.1, pan: 0.12, reverb: 0.22, room: 0.12, eq: [{ type: 'highshelf', f: 4500, gain: 5 }, { type: 'highshelf', f: 7000, gain: 8 }, { type: 'peak', f: 300, q: 1, gain: -1.5 }, { type: 'peak', f: 2800, q: 0.8, gain: 2 }] });
    // a distant microphone on the solo violin: its A5 notes otherwise peak in 2-5 kHz (harshness has a margin)
    const vnSoloBus = s.bus('soloViolin', { gain: -3.5, pan: -0.15, reverb: 0.22, room: 0.12, width: 0.55, eq: [{ type: 'peak', f: 3300, q: 0.7, gain: -3 }, { type: 'highshelf', f: 6000, gain: -2 }] });
    // the first violins reach G6 at the apex: a presence dip keeps them sweet, plus a notch on the 3rd harmonic of
    // E6/G6 (3.95 kHz). The climax is played louder now (velocity), so the bus no longer rides the crescendo.
    const v1Bus = s.bus('violins', { gain: -7.3, pan: -0.42, reverb: 0.34, width: 0.75, eq: [{ type: 'peak', f: 3400, q: 0.8, gain: -3 }, { type: 'peak', f: 2300, q: 1, gain: -2.5 }, { type: 'peak', f: 3950, q: 3, gain: -5 }] });
    const v2Bus = s.bus('violins2', { gain: -9, pan: -0.2, reverb: 0.45, width: 1.1, eq: [{ type: 'highshelf', f: 6000, gain: 4 }] });
    // the pads leave 250-500 Hz to the soloists
    const lowMid = { type: 'peak', f: 320, q: 1, gain: -2.5 };
    const vlaBus = s.bus('violas', { gain: -7, pan: 0.17, reverb: 0.45, eq: [{ type: 'highshelf', f: 4000, gain: 3 }, { type: 'highshelf', f: 7000, gain: 6 }, lowMid] });
    const vcBus = s.bus('celli', { gain: -6, pan: 0.35, reverb: 0.45, eq: [{ type: 'highshelf', f: 4000, gain: 3 }, { type: 'highshelf', f: 7000, gain: 5 }, { type: 'peak', f: 250, q: 1, gain: -3 }] });
    const cbBus = s.bus('basses', { gain: -5, pan: 0.28, reverb: 0.25, eq: [{ type: 'hp', f: 40 }] });
    // the climax opens up in space: the 2nd violins' tune, the violas and the choir play on wider copies of their
    // buses in bars 29-34 (the violas' copy carries their climax trim: forte timbre, level held back)
    const v2wBus = s.bus('violins2Wide', { gain: -9.5, pan: -0.2, reverb: 0.45, width: 1.3 });
    const vlaWBus = s.bus('violasWide', { gain: -12, pan: 0.17, reverb: 0.45, width: 1.2, eq: [{ type: 'highshelf', f: 4000, gain: 2 }, lowMid] });
    const pizzBus = s.bus('pizz', { gain: -9.5, pan: 0.3, reverb: 0.3 });
    // notch: the brassy horn table has a narrow formant at 2.35 kHz that stands out at forte. One horn per pad note
    // now (a section of four, not twelve), so the bus is 3 dB up and needs no 250 Hz cut.
    const hnBus = s.bus('horns', { gain: -7, pan: -0.05, reverb: 0.6, eq: [{ type: 'peak', f: 2350, q: 5, gain: -10 }, lowMid] });
    // the horns' counter-melody in the climax: its own bus, so the pad can stay back while the tune sings (doubled
    // by a few celli, so 1 dB lower)
    const hnMelBus = s.bus('hornMelody', { gain: -12.5, pan: -0.1, reverb: 0.6, width: 0.5, eq: [{ type: 'peak', f: 2350, q: 5, gain: -10 }] });
    // far in the back: low level, no chest (high-pass), a little less 400 Hz
    const chEq = [{ type: 'highpass', f: 180 }, { type: 'peak', f: 400, q: 1, gain: -2 }, lowMid];
    const chBus = s.bus('choir', { gain: -21, reverb: 0.6, width: 1.1, eq: chEq });
    const chWBus = s.bus('choirWide', { gain: -21, reverb: 0.6, width: 1.35, eq: chEq });
    // the celesta's strike noise is the only content above 7 kHz in the coda: tone, not ticks
    const celBus = s.bus('celesta', { gain: -5, pan: 0.1, reverb: 0.36, width: 0.55, delay: 0.15, eq: [{ type: 'highshelf', f: 7000, gain: -3 }] });
    // timpani at the back of the hall: more reverb, less level, less 100 Hz boom
    const percBus = s.bus('perc', { gain: -12, reverb: 0.6, eq: [{ type: 'peak', f: 100, q: 1, gain: -3 }] });
    const fxBus = s.bus('fx', { gain: -13, reverb: 0.4 });
    const subBus = s.bus('sub', { gain: -20 });

    const harp = s.part(hpBus, 'harp', { stereo: 0.6 });
    const cello = s.part(vcSoloBus, 'soloCello', { bright: 1.25, humanize: { time: 0.016, vel: 0.05 } });
    const violin = s.part(vnSoloBus, 'soloViolin', { humanize: { time: 0.016, vel: 0.05 } });
    // the first violins' climax line: a wider detune and vibrato on the long high notes, so a held E6 or G6 is a
    // section and not a single whistling tone
    const vln1 = s.part(v1Bus, 'stringsEnsemble', { section: 'violins', detune: 13, vibrato: 1.35 });
    const vln2Mel = s.part(v2Bus, 'stringsEnsemble', { section: 'violins2', name: 'stringsEnsemble:violins2:melody' });
    const vln2MelW = s.part(v2wBus, 'stringsEnsemble', { section: 'violins2', detune: 12, vibrato: 1.3, name: 'stringsEnsemble:violins2:melody' });
    // divisi lines: a few players of the section (they double or sigh while the rest hold the pad)
    const vln2Dbl = s.part(v2Bus, 'stringsEnsemble', { section: 'violins2', players: 3, sordino: true, name: 'stringsEnsemble:violins2:div' });
    const vlaMel = s.part(vlaBus, 'stringsEnsemble', { section: 'violas', players: 3, name: 'stringsEnsemble:violas:div' });
    const vlaDbl = s.part(vlaBus, 'stringsEnsemble', { section: 'violas', players: 3, sordino: true, name: 'stringsEnsemble:violas:div' });
    // a few celli double the horns' counter-melody (bow definition for the line); a celli section takes the lower
    // voice of the release canon (the solo violin stays the only soloist there)
    const vcHn = s.part(vcBus, 'stringsEnsemble', { section: 'celli', players: 3, name: 'stringsEnsemble:celli:div' });
    const vcCanon = s.part(vcBus, 'stringsEnsemble', { section: 'celli', players: 4, name: 'stringsEnsemble:celli:canon' });
    const pizz = s.part(pizzBus, 'stringsPizzicato', { section: 'celli', players: 3 });
    const pizzVla = s.part(pizzBus, 'stringsPizzicato', { section: 'violas', players: 3 });
    const hornMel = s.part(hnMelBus, 'warmHorn', { players: 2, name: 'warmHorn:melody' });
    const cel = s.part(celBus, 'celesta');
    const timp = s.part(percBus, 'timpani');
    const cym = s.part(fxBus, 'cymbalSwell');
    const sub = s.part(subBus, 'subBass');
    const rHarp = s.rng('harp-accents');
    const rPizz = s.rng('pizz-accents');
    // one part per voice of a pad, so every voice is its own legato line (the engine joins touching notes of a part)
    const voicesOf = (bus, inst, defaults = {}) => { const m = []; return (i) => (m[i] ||= s.part(bus, inst, defaults)); };
    const cbV = voicesOf(cbBus, 'contrabass');
    const vcV = voicesOf(vcBus, 'stringsEnsemble', { section: 'celli' });
    const vlaV = voicesOf(vlaBus, 'stringsEnsemble', { section: 'violas' });
    const vlaWV = voicesOf(vlaWBus, 'stringsEnsemble', { section: 'violas' });
    const vln2V = voicesOf(v2Bus, 'stringsEnsemble', { section: 'violins2' });
    const vlaTV = voicesOf(vlaBus, 'stringsTremolo', { section: 'violas' });
    const vln2TV = voicesOf(v2Bus, 'stringsTremolo', { section: 'violins2' });
    const hnV = voicesOf(hnBus, 'warmHorn', { players: 1 });
    const chV = voicesOf(chBus, 'choirPad', { vowel: 'ooh' });
    const chWV = voicesOf(chWBus, 'choirPad', { vowel: 'ooh' });

    // ---- bus automation
    // the violins' crescendo is played (velocity and expression); the bus only lifts them a little at the arrival
    v1Bus.automate('gain', [[B(26), -1.5], [B(26, 4), -1], [B(27), 0.5], [B(28, 4), 2], [B(29), 0.5], [B(31), 0], [B(32), -0.5], [B(33), -0.5], [B(34), 0], [B(35), 0]]);
    // the seconds finish the phrase in bar 34 with the firsts
    v2wBus.automate('gain', [[B(30, 4), 0], [B(31), 0.5], [B(33, 4), 1], [B(34), 2], [B(35), 2]]);
    // the horn pad stays under the violins' held B5 (27-28), the climax tune and the horn counter-melody
    hnBus.automate('gain', [[B(26, 4), 0], [B(27), -3.5], [B(28, 4), -3.5], [B(29), -4.5], [B(35), -4.5], [B(35, 2), 0]]);
    // the low strings play forte at the climax (timbre); their bus gain holds the level back. The celli step back
    // in the intro and the coda (their B2/C3 drone was the boxiest band there, and a phone does not hear it).
    vcBus.automate('gain', [[0, -2], [B(4, 3), -2], [B(5), 0], [B(28, 4), 0], [B(29), -4.5], [B(34, 4), -4.5], [B(35), 0], [B(38, 4), 0], [B(39), -2], [B(45), -2]]);
    cbBus.automate('gain', [[B(28, 4), 0], [B(29), -4.5], [B(34, 4), -4.5], [B(35), 0]]);
    // the counter-melody steps back at the apex so the violins carry G6
    hnMelBus.automate('gain', [[B(30, 4), 0], [B(31, 3), -1.5], [B(33), -1.5], [B(33, 2), 0]]);
    // the soloists hand the build over to the sections; the solo violin steps back where it is most exposed
    // (the start of the answer and the release canon)
    vcSoloBus.automate('gain', [[B(22, 4), 0], [B(24), -1], [B(34), -1], [B(35), 0]]);
    vnSoloBus.automate('gain', [[B(12, 4), 0], [B(13), -1], [B(15), -1], [B(15, 2), 0], [B(35, 4), 0], [B(36), -1.75], [B(38, 4), -1.75], [B(39), 0]]);
    // harp and choir carry the intro and the coda (the 40 s around the seam must hold up on a phone); the harp also
    // bridges the release into the coda (no sudden drop at bar 39)
    hpBus.automate('gain', [[0, 2.5], [B(4, 3), 2.5], [B(5), 0], [B(38, 4), 0], [B(39), 1], [B(40, 4), 1], [B(41, 2), 2.5], [B(45), 2.5]]);
    // the choir stays back under the celesta in bars 39-40, then a slow ramp to the seam (no swells)
    chBus.automate('gain', [[0, 3.5], [B(4, 3), 3.5], [B(5), 0], [B(38, 4), 0], [B(39), 0], [B(40, 4), 0.5], [B(41, 2), 2], [B(44, 3), 3], [B(45), 3.5]]);
    // the violas balance the harp in the image before the seam (they sit right, the harp left)
    vlaBus.automate('gain', [[B(42, 4), 0], [B(43), 2.5], [B(45), 2.5]]);
    // the celesta's memory of the motif (cell b) is the focus of bars 39-40
    celBus.automate('gain', [[B(38, 4), 0], [B(39), 6], [B(40, 4), 6], [B(41, 2), 0]]);

    // ---- helpers
    const dynPts = DYN.map(([bar, beat, v]) => [B(bar, beat), v]);
    const dyn = (b) => {
      if (b <= dynPts[0][0]) return dynPts[0][1];
      for (let i = 1; i < dynPts.length; i++) {
        const [b1, v1] = dynPts[i];
        if (b <= b1) { const [b0, v0] = dynPts[i - 1]; return v0 + ((v1 - v0) * (b - b0)) / (b1 - b0); }
      }
      return dynPts[dynPts.length - 1][1];
    };
    // chords: every row (the pads read them). A row whose name starts with "+" only changes a pad voice inside the
    // previous chord; the harp and the pizzicati read `hchords`, where such rows are folded into their chord.
    const chords = H.map(([bar, beat, len, name, v]) => ({ at: B(bar, beat), len, name: name.replace(/^\+/, ''), sub: name.startsWith('+'), v, bar }));
    const hchords = [];
    for (const c of chords) {
      if (c.sub && hchords.length) hchords[hchords.length - 1].len += c.len;
      else hchords.push({ ...c });
    }

    // Voice lines: voices[i] = the i-th note of a voice key on consecutive chords; equal pitches are tied.
    const voices = (key) => {
      const vs = [];
      let prevEnd = -1;
      for (const c of chords) {
        const ts = tok(c.v[key]);
        ts.forEach((t, i) => {
          const arr = (vs[i] ||= []);
          const last = arr[arr.length - 1];
          if (last && Math.abs(c.at - prevEnd) < 1e-6 && Math.abs(last.end - c.at) < 1e-6 && last.p === t.p) {
            last.end = c.at + c.len; last.tag = last.tag || t.tag;
          } else arr.push({ start: c.at, end: c.at + c.len, p: t.p, tag: t.tag });
        });
        prevEnd = ts.length ? c.at + c.len : -1;
      }
      return vs;
    };
    // cuts: [from, to, voiceIndex|null]; a note is split around the cut (a breath, or a rest for a mute change)
    const applyCuts = (line, vi, cuts) => {
      let out = line;
      for (const [a, b, only] of cuts) {
        if (only != null && only !== vi) continue;
        const nx = [];
        for (const l of out) {
          if (l.end <= a + 1e-6 || l.start >= b - 1e-6) { nx.push(l); continue; }
          if (l.start < a - 1e-6) nx.push({ ...l, end: a });
          if (l.end > b + 1e-6) nx.push({ ...l, start: b });
        }
        out = nx;
      }
      return out;
    };
    const breath = (beats, gap = 0.25, vi = null) => beats.map((b) => [b - gap, b, vi]);
    // Phrase-long expression: the pads shape 4-bar phrases (rise to 60 %, fall back), computed from the absolute
    // position like the tremolo, so a chord change inside a phrase is not a new swell. `sh` offsets a section's
    // phrase (violas a beat ahead of the 2nd violins, horns a beat behind), `lo` is the phrase's floor.
    const PH = 16, PEAK = 0.6 * PH;
    const phr = (b, sh, lo) => {
      const x = (((b - sh) % PH) + PH) % PH;
      return x < PEAK ? lo + (1 - lo) * (x / PEAK) : 1 - (1 - lo) * ((x - PEAK) / (PH - PEAK));
    };
    const phraseExpr = (s0, e0, sh, lo) => {
      const pts = [[0, phr(s0, sh, lo)]];
      const len = e0 - s0;
      const knots = [];
      for (let k = Math.floor((s0 - sh) / PH) * PH + sh; k < e0 + PH; k += PH) knots.push(k, k + PEAK);
      for (const k of knots.sort((a, b) => a - b)) if (k > s0 + 1e-3 && k < e0 - 1e-3) pts.push([(k - s0) / len, phr(k, sh, lo)]);
      pts.push([1, phr(e0 - 1e-3, sh, lo)]);
      return pts;
    };
    // Pads as true legato lines: a voice that moves by a step or less is slurred (one sound, no new attack);
    // a leap is a new bow / breath. `shift` offsets a section's onsets so the sections do not re-articulate together.
    const playLines = (partOf, key, { mul = 1, vel = null, from = 0, to = 1e9, shift = 0, expr = null, phrase = null, cuts = [], legatoMax = 2, overlap = 0.06, opts = {} } = {}) => {
      voices(key).forEach((line0, vi) => {
        const line = applyCuts(line0, vi, cuts);
        line.forEach((l, k) => {
          if (l.start < from || l.start >= to) return;
          const nx = line[k + 1], pv = line[k - 1];
          const joinNext = !!nx && Math.abs(nx.start - l.end) < 1e-6 && Math.abs(nx.p - l.p) <= legatoMax;
          const joinPrev = !!pv && Math.abs(l.start - pv.end) < 1e-6 && Math.abs(l.p - pv.p) <= legatoMax;
          const d = dyn(l.start + 0.5);
          const v = Math.min(1, vel ? vel(d) : d * mul);
          const ex = phrase ? phraseExpr(l.start, l.end, phrase.sh, phrase.lo) : (expr || [[0, 0.9], [1, 1]]);
          const o = tagOf(l.tag, { expr: ex, ...opts });
          if (joinNext || joinPrev) o._leg = true;
          partOf(vi).note(l.start + shift, l.end - l.start + (joinNext ? 0 : overlap), l.p, v, o);
        });
      });
    };
    // Tremolo with one continuous crescendo from r0 to r1 (computed from the absolute position, not per note)
    const tremLines = (partOf, key, { vel, r0, r1, lo = 0.35 }) => {
      const r = (b) => lo + (1 - lo) * Math.min(1, Math.max(0, (b - r0) / (r1 - r0)));
      voices(key).forEach((line, vi) => line.forEach((l) =>
        partOf(vi).note(l.start, l.end - l.start + 0.05, l.p, vel, tagOf(l.tag, { expr: [[0, r(l.start)], [1, r(l.end)]] }))));
    };

    // ---- strings, horns and choir pads
    const sord = (a, b) => ({ from: B(a), to: B(b) });
    const phBass = { phrase: { sh: 0, lo: 0.76 } };
    const phVla = { phrase: { sh: -1, lo: 0.8 } };
    const phVln2 = { phrase: { sh: 0, lo: 0.8 } };
    const phHn = { phrase: { sh: 1, lo: 0.8 } };
    // the gentle half is brightened at the source (a hall recording of soft strings has more top than these)
    const brVc = { bright: 1.15 }, brVla = { bright: 1.15 };
    // (the con sordino strings of the theme and the answer a little more: the mute darkens them further)
    const brSord = { bright: 1.35 };
    // mutes change only after a rest. The whole string section stays con sordino through the answer (a veiled bed
    // under the solo violin, and no hole between the theme and the answer): the celli rest one beat (16.4), the
    // violas and 2nd violins two (from 16.3), and all come back senza with the harp glissando on bar 17. They
    // also breathe before the coda (sordino again from bar 39).
    const muteVc = [[B(16, 4), B(17), null], [B(38, 4), B(39), null]];
    // (the violas also rest on the last two beats of bar 38 to put the mutes back on for the coda)
    const muteVla = [[B(12, 4), B(13), null], [B(16, 3), B(17), null], [B(38, 3), B(39), null]];
    // (violas and 2nd violins breathe on the last beat of bar 12: no fifths with the basses B -> C, no octaves
    // with the cello B -> E)
    const breathVln2 = [[B(12, 4), B(13), null]];
    // basses: always senza (the intro pedal simply softer); a new bow at the start of the theme
    const cbCut = [[B(5) - 0.2, B(5), null]];
    playLines(cbV, 'cb', { mul: 0.5, ...sord(1, 5), cuts: cbCut, ...phBass });
    playLines(cbV, 'cb', { mul: 0.85, ...sord(5, 25), cuts: cbCut, ...phBass });
    playLines(cbV, 'cb', { mul: 0.72, ...sord(25, 26), ...phBass });   // the open E string speaks loudly
    playLines(cbV, 'cb', { mul: 0.85, ...sord(26, 39), ...phBass });
    playLines(cbV, 'cb', { mul: 0.58, ...sord(39, 46), ...phBass });   // the coda floor (softer than the theme)
    playLines(vcV, 'vc', { mul: 0.72, ...sord(1, 5), cuts: muteVc, ...phBass, opts: { sordino: true, ...brSord } });
    playLines(vcV, 'vc', { mul: 0.9, ...sord(5, 13), cuts: muteVc, ...phBass, opts: { sordino: true, ...brSord } });
    playLines(vcV, 'vc', { mul: 0.8, ...sord(13, 17), cuts: muteVc, ...phBass, opts: { sordino: true, ...brSord } });
    playLines(vcV, 'vc', { mul: 0.8, ...sord(17, 21), cuts: muteVc, ...phBass, opts: brVc });
    playLines(vcV, 'vc', { mul: 0.9, ...sord(21, 25), cuts: muteVc, ...phBass, opts: brVc });
    playLines(vcV, 'vc', { mul: 0.85, ...sord(25, 35), cuts: muteVc, ...phBass });
    playLines(vcV, 'vc', { mul: 0.7, ...sord(35, 39), cuts: muteVc, ...phBass, opts: brVc });
    playLines(vcV, 'vc', { mul: 0.55, ...sord(39, 46), cuts: muteVc, ...phBass, opts: { sordino: true, ...brVc } });
    playLines(vlaV, 'vla', { mul: 0.85, ...sord(1, 9), shift: 0.03, cuts: muteVla, ...phVla, opts: { sordino: true, ...brSord } });
    playLines(vlaV, 'vla', { mul: 0.7, ...sord(9, 13), shift: 0.03, cuts: muteVla, ...phVla, opts: { sordino: true, ...brSord } });
    playLines(vlaV, 'vla', { mul: 0.85, ...sord(13, 17), shift: 0.03, cuts: muteVla, ...phVla, opts: { sordino: true, ...brSord } });
    playLines(vlaV, 'vla', { mul: 0.85, ...sord(17, 25), shift: 0.03, cuts: muteVla, ...phVla, opts: brVla });
    playLines(vlaV, 'vla', { mul: 0.85, ...sord(25, 29), shift: 0.03, cuts: muteVla, ...phVla });
    // the climax on the wider violas bus (forte timbre, level trimmed there)
    playLines(vlaWV, 'vla', { mul: 0.8, ...sord(29, 35), shift: 0.03, ...phVla });
    playLines(vlaV, 'vla', { mul: 0.85, ...sord(35, 39), shift: 0.03, cuts: muteVla, ...phVla, opts: brVla });
    playLines(vlaV, 'vla', { mul: 0.7, ...sord(39, 46), shift: 0.03, cuts: muteVla, ...phVla, opts: { sordino: true, ...brVla } });
    playLines(vln2V, 'vln2', { mul: 0.75, ...sord(9, 17), cuts: breathVln2, ...phVln2, opts: { sordino: true, ...brSord } });
    playLines(vln2V, 'vln2', { mul: 0.82, ...sord(17, 21), ...phVln2 });
    playLines(vln2V, 'vln2', { mul: 0.9, ...sord(21, 46), ...phVln2 });
    // (the tremolos stay under the violins' held B5: the top line must read on a phone just before the arrival)
    tremLines(vlaTV, 'vlaT', { vel: 0.42, r0: B(25), r1: B(29) });
    tremLines(vln2TV, 'vln2T', { vel: 0.5, r0: B(27), r1: B(29) });
    // horns (one player per note): breathe every two bars (and before the last dominant of the release); in bar
    // 17 the breath comes before the C3, so the D3 is held over the barline
    const hnCuts = breath([B(17, 3), B(19), B(21), B(23), B(25), B(27), B(29), B(31), B(33), B(35), B(37), B(38)]);
    playLines(hnV, 'hn', { mul: 0.58, to: B(21), shift: 0.06, cuts: hnCuts, ...phHn });   // A2: they only warm it
    playLines(hnV, 'hn', { mul: 0.72, from: B(21), to: B(27), shift: 0.06, cuts: hnCuts, ...phHn });
    playLines(hnV, 'hn', { mul: 0.76, from: B(27), to: B(29), shift: 0.06, cuts: hnCuts, ...phHn });
    // the arrival and apex: the pad crosses into the brassy colour (vel ~0.5+), the bus gain keeps it back
    playLines(hnV, 'hn', { mul: 0.85, from: B(29), to: B(32), shift: 0.06, cuts: hnCuts, ...phHn });
    playLines(hnV, 'hn', { mul: 0.6, from: B(32), to: B(35), shift: 0.06, cuts: hnCuts, ...phHn });
    playLines(hnV, 'hn', { mul: 0.72, from: B(35), shift: 0.06, cuts: hnCuts, ...phHn });
    // choir: not a legato instrument; short overlaps, staggered breaths in the long intro and coda notes. The
    // climax choir sings on the wider bus.
    const chCuts = [...breath([B(3, 3)], 0.2, 0), ...breath([B(41)], 0.2, 1), ...breath([B(43, 3)], 0.2, 0)];
    const chOpt = { vel: (d) => 0.2 + 0.42 * d, shift: 0.08, overlap: 0.1, legatoMax: -1, cuts: chCuts, expr: [[0, 0.75], [0.2, 1], [1, 0.9]] };
    playLines(chV, 'ch', { ...chOpt, to: B(29), opts: { bright: 1.1 } });
    playLines(chWV, 'ch', { ...chOpt, from: B(29), to: B(35) });
    playLines(chV, 'ch', { ...chOpt, from: B(35), opts: { bright: 1.1 } });

    // ---- harp figuration (composed patterns per section)
    // ring until the next chord (plus a hair of overlap), at most `max` beats
    const ring = (c, t, max) => Math.max(0.25, Math.min(max, c.at + c.len - t + 0.06));
    const acc = () => 0.94 + 0.12 * rHarp();   // small irregular accents: a player, not a sequencer
    // intro and coda: finger brilliance, so the opening is not dark on earbuds; brighter through the whole gentle
    // half and the release (the build and the climax keep the natural tone)
    const hb = (c) => (c.bar <= 4 || c.bar >= 39 ? 1.4 : c.bar <= 12 ? 1.5 : c.bar <= 24 || c.bar >= 35 ? 1.2 : 1);
    // triplet broken chords (intro, A1 antecedent, coda)
    // `hemi`: pairs (low, high) against the triplets, accented every second note: a 2+2+2 cross-rhythm
    const HEMI = [0, 3, 1, 4, 2, 3, 0, 4, 1, 3, 2, 4];
    const hpTrip = (c, base, variant, hemi = false) => {
      const t = tok(c.v.hp);
      const order = hemi ? HEMI.map((i) => Math.min(i, t.length - 1)) : variant % 2 ? upDown(t.length) : (TRIP[t.length] || upDown(t.length));
      const count = Math.round(c.len * 3);
      for (let k = 0; k < count; k++) {
        const x = t[order[k % order.length]];
        const onBeat = hemi ? k % 2 === 0 : k % 3 === 0;
        const v = base * (onBeat ? 1.06 : 0.92) * acc() * (1 - 0.12 * Math.abs(k / count - 0.4));
        harp.note(c.at + k / 3, ring(c, c.at + k / 3, 3), x.p, v, tagOf(x.tag, { damp: true, bright: hb(c) }));
      }
    };
    // A1 consequent (bars 9-12): one rising triplet per half bar, then the strings ring: the music breathes
    const hpTripHalf = (c, base) => {
      const t = tok(c.v.hp);
      const groups = [[0, 1, 2], [1, 2, 3]];
      for (let g = 0; g * 2 < c.len; g++) {
        const idx = groups[(g + (c.at % 4 ? 1 : 0)) % 2];
        idx.forEach((i, k) => {
          const x = t[Math.min(i, t.length - 1)];
          const at = c.at + g * 2 + k / 3;
          harp.note(at, ring(c, at, 3), x.p, base * (k ? 0.9 : 1.04) * acc(), tagOf(x.tag, { damp: true, bright: hb(c) }));
        });
      }
    };
    // build, bars 21-24: eighths (up, then a turn); 25-28: sixteenths, two shapes, below the tune
    const hpEighths = (c, base) => {
      const t = tok(c.v.hp);
      const order = [0, 1, 2, 3, 4, 3, 2, 1].map((i) => Math.min(i, t.length - 1));
      const count = Math.round(c.len * 2);
      for (let k = 0; k < count; k++) {
        const x = t[order[k % order.length]];
        harp.note(c.at + k / 2, ring(c, c.at + k / 2, 2), x.p, base * (k % 2 ? 0.88 : 1.04) * acc(), tagOf(x.tag, { damp: true, bright: hb(c) }));
      }
    };
    const hpSix = (c, base, shape) => {
      const t = tok(c.v.hp);
      const order = shape ? (TRIP[t.length] || upDown(t.length)) : upDown(t.length);
      const count = Math.round(c.len * 4);
      for (let k = 0; k < count; k++) {
        const x = t[order[k % order.length]];
        harp.note(c.at + k / 4, ring(c, c.at + k / 4, 1.5), x.p, base * (k % 4 === 0 ? 1.06 : 0.88) * acc(), tagOf(x.tag, { damp: true }));
      }
    };
    // climax: one fast roll per chord change (a real hand: about 0.045 beat per string, unevenly), then it rings
    const hpGliss = (c, base) => {
      const t = tok(c.v.hp);
      let at = c.at;
      t.forEach((x, i) => {
        const u = i / Math.max(1, t.length - 1);
        harp.note(at, ring(c, at, 4), x.p, base * (0.8 + 0.3 * u) * acc(), tagOf(x.tag, { damp: true }));
        at += 0.045 * (0.8 + 0.4 * rHarp());
      });
    };
    // a true glissando: every string between two pitches, accelerating, the last string on `end`. A harp
    // glissando is a ringing wash: in the top eight strings every string that belongs to the chord it lands on
    // (`ringPcs`, pitch classes) rings on until `ringTo`; the passing strings and the low ones are damped soon
    // after the next one sounds, so no scale cluster is left hanging.
    const glissando = (start, end, pitches, v0, v1, ringTo, tense = true, ringPcs = null) => {
      const N = pitches.length - 1;
      pitches.forEach((p, i) => {
        const at = end - (end - start) * Math.pow(1 - i / N, 0.85);
        const v = (v0 + (v1 - v0) * (i / N)) * (0.92 + 0.16 * rHarp());
        const last = i >= N - 1;
        const wash = !last && i >= N - 8 && (!ringPcs || ringPcs.includes((typeof p === 'number' ? p : n(p)) % 12));
        const nextAt = end - (end - start) * Math.pow(1 - Math.min(N, i + 1) / N, 0.85);
        const dur = last ? Math.max(0.3, ringTo - at) : wash ? Math.max(0.3, ringTo - at) : nextAt - at + 0.25;
        harp.note(at, dur, p, v * (wash ? 0.92 : 1), { damp: !last, ...(tense ? { tag: 'tension' } : {}) });
      });
    };
    const hpRoll = (c, base) => {
      const t = tok(c.v.hp);
      const lo = t.slice(0, 3), hi = t.slice(3);
      const hd = (x) => tagOf(x.tag, { damp: true, bright: hb(c) });
      lo.forEach((x, i) => harp.note(c.at + i * 0.09, ring(c, c.at, 4), x.p, base * 1.05 * acc(), hd(x)));
      if (c.len >= 4) {
        if (hi.length) harp.note(c.at + 1.5, ring(c, c.at + 1.5, 4), hi[0].p, base * 0.8 * acc(), hd(hi[0]));
        hi.forEach((x, i) => harp.note(c.at + 2 + i * 0.08, ring(c, c.at + 2, 4), x.p, base * 0.9 * acc(), hd(x)));
        harp.note(c.at + 3.5, ring(c, c.at + 3.5, 4), t[2].p, base * 0.75 * acc(), hd(t[2]));
      } else hi.forEach((x, i) => harp.note(c.at + 1 + i * 0.08, ring(c, c.at + 1, 4), x.p, base * 0.85 * acc(), hd(x)));
    };
    let six = 0;
    for (const c of hchords) {
      if (!c.v.hp) continue;
      const lvl = dyn(c.at);
      if (c.bar <= 4) {
        if (c.bar === 3) hpRoll(c, Math.min(0.5, lvl * 1.4));   // the triplets breathe once in four bars
        else hpTrip(c, Math.min(0.52, lvl * 1.7), c.bar, c.bar === 4);   // the harp leads here; bar 4 in twos
      } else if (c.bar <= 8) hpTrip(c, lvl * 1.12, c.bar);       // under the cello theme
      else if (c.bar <= 12) hpTripHalf(c, Math.min(0.38, lvl * 1.2));
      else if (c.bar === 17) {
        // the harp comes back as an event: a glissando from the downbeat, then the upper chord on beat 3
        const st = ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5'];
        glissando(c.at, c.at + 0.7, st, 0.26, 0.4, c.at + 2.2, true, [0, 4, 5, 9, 11]);   // rings F A C E B
        tok(c.v.hp).slice(1).forEach((x, i) => harp.note(c.at + 2 + i * 0.08, ring(c, c.at + 2, 4), x.p, Math.min(0.5, lvl * 1.1) * acc(), tagOf(x.tag, { damp: true })));
      } else if (c.bar === 18) hpRoll(c, Math.min(0.5, lvl * 1.15));   // under the cello's falling tail
      else if (c.bar <= 20) hpRoll(c, Math.min(0.6, lvl * 1.35));
      else if (c.bar <= 22) hpEighths(c, Math.min(0.6, lvl * 1.15));
      else if (c.bar <= 24) hpEighths(c, lvl * 0.9);   // under the solo fragments
      else if (c.bar <= 28) hpSix(c, Math.min(0.45, lvl * 0.75), (six++ >> 1) % 2);
      else if (c.bar === 32) {
        // the glissando of bar 31 lands here: one strummed chord, left to ring
        tok(c.v.hp).forEach((x, i) => harp.note(c.at + i * 0.03, ring(c, c.at, 4), x.p, 0.38 * acc(), tagOf(x.tag, { damp: true })));
      } else if (c.bar <= 34) hpGliss(c, Math.min(0.5, lvl * 0.7));
      else if (c.bar === 38 && Math.abs(c.at - B(38)) < 1e-6) {
        // back after the bare release: one sweep up the B7(b9) strings
        glissando(c.at, c.at + 0.6, tok(c.v.hp).map((x) => x.p), 0.24, 0.36, c.at + 2.06, false, [11, 3, 6, 9]);
      } else if (c.bar === 38) hpRoll(c, Math.min(0.5, lvl * 1.2));
      else if (c.bar <= 37) hpTripHalf(c, 0.28);   // the release canon: a sparse plucked texture under the bows
      else if (c.bar <= 40) hpTrip(c, c.bar === 40 ? 0.36 : 0.32, c.bar + 1);   // under the celesta: continuous and soft (rolls spiked)
      else if (c.bar <= 42) hpTrip(c, Math.min(c.bar === 41 ? 0.3 : 0.34, lvl * 1.7), c.bar);   // under the cello's farewell
      else if (c.bar === 43) hpTrip(c, 0.4, c.bar);   // continuous (a roll here spiked and collapsed)
      else hpTrip(c, Math.min(0.52, lvl * 1.7), c.bar);
    }
    // bar 31, beats 3-4: a real glissando (every string E3..G5) into the apex downbeat. Pedals in E Phrygian
    // (F natural): it anticipates the F chord of bar 32, so no pedal change on a ringing string is needed.
    glissando(B(32) - 0.6, B(32), ['E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5'], 0.28, 0.44, B(32) + 0.6, true, [0, 4, 5, 9, 11]);

    // ---- solo cello: theme (A1), counter-melody (A2), motif, fragments (build), farewell (the release canon's
    // lower voice is a celli section now). Brighter at the source (bright 1.25 is the part default).
    const vcExpr = [[0, 0.72], [0.35, 1], [1, 0.82]];
    const L = { legato: true };
    // antecedent: an audible portamento into the first G4; the tied E4 / D4 make 9-8 suspensions
    const brTh = { bright: 1.5 };   // the theme (a soft lead must still have air)
    cello.play(B(5), 'B3:1', { ...L, ...brTh, vel: 0.38, expr: vcExpr });
    cello.play(B(5, 2), 'G4:2', { ...L, ...brTh, vel: 0.42, glideTime: 0.14, expr: vcExpr });
    cello.play(B(5, 4), 'F#4:.5 E4:.5! | ~:.5 D#4:1 E4:.5 B3:2 | A3:.5 F#4:2.5 E4:.5 D4:.5! | ~:.5 C#4:1 D4:.5 A3:2',
      { ...L, ...brTh, vel: 0.4, shape: 'arch', shapeAmt: 0.12, expr: vcExpr });
    // consequent, softer: a new bow on the leap; the sus4 E4 held until the chord turns to B7
    cello.play(B(9), 'B3:.5', { ...brTh, vel: 0.34, expr: vcExpr });
    // (the apex A4 belongs to bar 9 only: bar 11 climbs through the Am7 arpeggio C-E-G, leans G -> F# and turns up
    // to A4, which falls to F#4 while the bass rises A -> B: contrary motion, no fifths)
    cello.play(B(9, 1.5), 'A4:2 G4:1 F#4:.5 | E4:2.5 D#4:.5 B3:1 | C4:1 E4:.5 G4:1! F#4:1 A4:.5 | F#4:1@0.38 D#4:1@0.38 C4:1@0.39! B3:1@0.34',
      { ...L, ...brTh, vel: 0.37, shape: 'arch', shapeAmt: 0.12, expr: vcExpr });
    // counter-melody under the violin: syncopated, tied over the barlines into suspensions
    cello.play(B(13), 'E3:1 G3:1.5 B3:1.5! | ~:1 A3:1 F#3:2 | _:1 B3:1 C#4:1! D4:1 | ~:1 C4:1 B3:2',
      { ...L, vel: 0.24, expr: vcExpr });
    // the motif over the Phrygian bII (new bow on the leap); then the counter-line under the violin's inversion
    cello.play(B(17), 'A3:1.5', { vel: 0.4, expr: vcExpr });
    cello.play(B(17, 2.5), 'F4:1.5 E4:.5 D4:.5 | B3:2 A3:1 F#3:1', { ...L, vel: 0.5, shape: 'dim', shapeAmt: 0.05, expr: vcExpr });
    // (E4 - D4, the seventh of E7, then A3: no octaves with the violin, the basses, the celli or the violas)
    cello.play(B(19), '_:1 E3:1 G3:1 A3:1 | B3:2 E4:1 D4:1', { ...L, vel: 0.26, shape: 'arch', expr: vcExpr });
    // build fragments: separate bow on the leap, then the appoggiatura slurred onto its resolution
    cello.play(B(21), 'A3:1', { vel: 0.48, expr: vcExpr });
    cello.play(B(21, 2), 'F4:2! E4:1', { ...L, vel: 0.5, expr: vcExpr });
    cello.play(B(23), 'B3:.5', { vel: 0.48, expr: vcExpr });
    cello.play(B(23, 1.5), 'G4:1! F#4:.5', { ...L, vel: 0.5, expr: vcExpr });
    cello.play(B(24), 'E3:.5', { vel: 0.5, expr: vcExpr });
    cello.play(B(24, 1.5), 'D4:1! C#4:.5', { ...L, vel: 0.52, expr: vcExpr });
    // release canon, lower voice (one bar after the violin, an octave lower): a celli section, not a second
    // soloist; over B7(b9) it falls D#4 - C4 - B3 (no 4-3 here)
    vcCanon.play(B(36), 'E4:1 G#3:2! A3:.5 B3:.5 | C4:1.5 B3:.5 E4:2 | D#4:2 C4:1! B3:1', { ...L, vel: 0.36, bright: 1.15, expr: [[0, 0.8], [0.35, 1], [1, 0.85]] });
    // farewell: cell a at its original pitch with the portamento of bar 5, the F# (#11 of C) falling onto Am/E
    cello.play(B(41), 'B3:1!', { ...L, vel: 0.3, expr: [[0, 0.6], [0.3, 1], [1, 0.9]] });
    cello.play(B(41, 2), 'G4:2', { ...L, vel: 0.41, glideTime: 0.14, expr: [[0, 0.85], [0.4, 1], [1, 0.9]] });
    cello.play(B(41, 4), 'F#4:1! | E4:4', { ...L, vel: 0.4, expr: [[0, 0.9], [0.3, 1], [1, 0.45]] });

    // ---- solo violin: imitation (A2), inversion, fragments (build), inversion in canon (release)
    const vnExpr = [[0, 0.7], [0.4, 1], [1, 0.8]];
    violin.play(B(13), 'B4:1!', { vel: 0.34, expr: vnExpr });
    violin.play(B(13, 2), 'G5:2 F#5:.5 E5:.5 | D5:2.5 E5:.5 B4:1 | C#5:.5! D5:.5', { ...L, vel: 0.44, expr: vnExpr });
    // the stretched sixth: a held A5 that decays instead of swelling (it is the brightest note of the gentle half)
    violin.play(B(15, 2), 'A5:3', { ...L, vel: 0.42, expr: [[0, 0.7], [0.3, 0.95], [1, 0.65]] });
    violin.play(B(16), 'G5:.5! F#5:1 G5:.5 D5:2', { ...L, vel: 0.4, shape: 'dim', shapeAmt: 0.15, expr: vnExpr });
    violin.play(B(17), 'E5:4! | ~:1 D#5:1 F#5:2', { ...L, vel: 0.29, shape: 'arch', expr: vnExpr });
    // the inversion leads here; the B4 is held over the barline as a 9-8 suspension over Am(add9) and resolves
    // to A4 on beat 2, after the violas have moved: the voices meet one after the other, not in octaves
    violin.play(B(19), 'B4:1.5', { vel: 0.42, expr: vnExpr });
    violin.play(B(19, 2.5), 'D#4:1.5! E4:.5 F#4:.5 | G#4:2 D5:1 C5:.5 B4:1.5! | A4:1', { ...L, vel: 0.44, shape: 'dim', shapeAmt: 0.3, expr: vnExpr });
    violin.play(B(22), 'C#4:1', { vel: 0.44, expr: vnExpr });
    violin.play(B(22, 2), 'B4:2! A#4:1', { ...L, vel: 0.46, expr: vnExpr });
    violin.play(B(23, 3), 'G4:.5', { vel: 0.46, expr: vnExpr });
    violin.play(B(23, 3.5), 'F5:1! E5:.5', { ...L, vel: 0.5, expr: vnExpr });
    violin.play(B(24, 3), 'G4:.5', { vel: 0.48, expr: vnExpr });
    violin.play(B(24, 3.5), 'G5:1! F#5:.5', { ...L, vel: 0.52, expr: vnExpr });
    // release canon; the B7's seventh A4 resolves to G4 on the downbeat of the coda (handing over to the celesta)
    violin.play(B(35), 'E5:1 G#4:2 A4:.5 B4:.5 | C5:1.5 B4:.5 E5:2 | D5:1 C5:1 A4:1.5 B4:.5 | C5:1.5! B4:.5 A4:2',
      { ...L, vel: 0.47, shape: 'dim', shapeAmt: 0.15, expr: vnExpr });
    violin.play(B(39), 'G4:2', { ...L, vel: 0.3, expr: [[0, 0.9], [1, 0.3]] });

    // ---- build, bars 25-26: the semitone sighs in diminution, one per beat, 2nd violins and violas in turn
    const sigh = [[0, 1], [0.5, 0.75], [1, 0.6]];
    vln2Mel.play(B(25), 'E5:.5! D#5:.5', { ...L, vel: 0.58, expr: sigh });
    vlaMel.play(B(25, 2), 'G4:.5! F#4:.5', { ...L, vel: 0.6, expr: sigh });
    vln2Mel.play(B(25, 3), 'A5:.5! G5:.5', { ...L, vel: 0.62, expr: sigh });
    vlaMel.play(B(25, 4), 'C5:.5! B4:.5', { ...L, vel: 0.62, expr: sigh });
    // the violas' cell b (turn on the leading tone, then a fourth down) under the violins' entry
    vlaMel.play(B(26), 'F4:.5 E4:.5 F4:.5 C4:.5 E4:2', { ...L, vel: 0.42, expr: [[0, 0.85], [0.5, 1], [1, 0.8]] });

    // ---- violins section: entry (26), the climb to C6 and the held B5 (27-28), the arrival and the apex. The
    // crescendo is in the playing: the held B5 swells into the arrival, the arrival E6 and the apex G6 are the
    // loudest and brightest notes of the cue, then the line relaxes to the half cadence.
    const vEx = [[0, 0.85], [0.4, 1], [1, 0.92]];
    vln1.play(B(26), 'C5:.5', { vel: 0.6, expr: vEx });
    vln1.play(B(26, 1.5), 'A5:1.5 G5:1! F#5:1', { ...L, vel: 0.62, expr: vEx });
    vln1.play(B(27), 'D5:1', { ...L, vel: 0.62, gate: 0.94, expr: vEx });   // a new bow before the leap to C6
    // C6 = the sus4 of G7, resolving to B5 when the harmony turns; B5 held over the dominant (swelling), G5 is
    // the upbeat (a new bow on the C6: it starts softer and darker, so the attack does not bite)
    vln1.play(B(27, 2), 'C6:2!', { ...L, vel: 0.6, bright: 0.55, expr: [[0, 0.6], [0.35, 1], [1, 0.95]] });
    vln1.play(B(27, 4), 'B5:4', { ...L, vel: 0.74, bright: 0.7, expr: [[0, 0.62], [1, 1]] });
    vln1.play(B(28, 4), 'G5:1', { ...L, vel: 0.7, bright: 0.7, expr: vEx });
    // the arrival: G5 -> E6 across the barline (the motif in augmentation, a major sixth), then the stepwise fall;
    // over F#m7b5 the A5 is a chord tone, over G+ the line turns down to E5 for the leap of a tenth to the apex
    vln1.play(B(29), 'E6:3', { ...L, vel: 0.74, bright: 0.72, glideTime: 0.03, expr: [[0, 0.9], [0.3, 1], [1, 0.92]] });
    vln1.play(B(29, 4), 'D6:1@0.7 | C6:1.5@0.66 B5:.5@0.64! A5:2@0.62 | B5:1.5@0.6 E5:.5@0.58!', { ...L, bright: 0.68, expr: vEx });
    // the apex: cell a's G at its home pitch two octaves up, reached by the widest leap of the cue; then 9-7-8 over
    // F and cell b lifted; C-C#-D and out, relaxing towards the half cadence
    vln1.play(B(31, 3), 'G6:2 | ~:1 E6:1.5! F6:.5 C6:1 | C#6:2! D6:2', {
      ...L, vel: 0.76, bright: 0.72, glideTime: 0.03,
      shape: (u) => (u < 0.3 ? 1 : 1 - 0.36 * ((u - 0.3) / 0.7)),
      expr: [[0, 0.85], [0.3, 1], [1, 0.9]],
    });
    // the top line closes on the half cadence: D6 - C6 (b9 over B7) - B5 - A5, and the Picardy G#5 where the
    // release begins
    vln1.play(B(34), 'C6:2@0.48! B5:1@0.46 A5:1@0.45 | G#5:2@0.38', { ...L, bright: 0.66, expr: [[0, 0.95], [0.5, 1], [1, 0.6]] });
    // the second violins an octave below, on the wider bus (their tremolo F5 of bar 28 resolves to this E5)
    vln2MelW.play(B(29), 'E5:3@0.7 D5:1@0.66 | C5:1.5@0.62 B4:.5@0.6! A4:2@0.58 | B4:2@0.56', { ...L, expr: vEx });
    vln2MelW.play(B(31, 3), 'G5:2 | ~:1 E5:1.5! F5:.5 C5:1 | C#5:2! D5:1.5 A4:.5 | C5:2! B4:1 F#4:1', {
      ...L, vel: 0.72, glideTime: 0.03,
      shape: (u) => (u < 0.4 ? 1 : 1 - 0.3 * ((u - 0.4) / 0.6)),   // the seconds finish the phrase audibly
      expr: [[0, 0.85], [0.35, 1], [1, 0.85]],
    });
    // horns (a2): a counter-melody in their singing range, rising while the violins fall, with breaths before
    // bars 31 and 33. F4 -> D#4 (the third of B7) is its last step. At the apex it stays under the violins. A few
    // celli double it, for bow definition and for a phone.
    const hnEx = [[0, 0.8], [0.4, 1], [1, 0.9]];
    const hornA = 'E4:2@0.54 F#4:1@0.55! G4:1@0.57 | A4:3.75@0.52';
    const hornB = 'G4:2@0.56 E4:2@0.52 | A4:3@0.56 G4:.75@0.5 _:.25 | F4:4@0.5 | D#4:2@0.44';
    hornMel.play(B(29), hornA, { ...L, expr: hnEx });
    hornMel.play(B(31), hornB, { ...L, expr: hnEx });
    vcHn.play(B(29), hornA, { ...L, expr: hnEx, amp: 0.95 });
    vcHn.play(B(31), hornB, { ...L, expr: hnEx, amp: 0.95 });

    // ---- pizzicato: violas on beats 1 and 3 in the answer (13-16), celli (divisi) in the build
    // (audible: this pulse replaces the harp's motion in the answer)
    for (let bar = 13; bar <= 16; bar++) {
      let prev = null;
      for (const c of hchords.filter((x) => x.bar === bar)) {
        const root = tok(c.v.cb)[0].p;
        let p = root; while (p < n('C3')) p += 12;
        const fifth = p + 7 > n('A3') ? p - 5 : p + 7;
        for (let k = 0; k < c.len; k += 2) {
          const second = k > 0 || prev === c.name;   // beat 3 of the same chord: the fifth
          pizzVla.note(c.at + k, 0.9, second ? fifth : p, dyn(c.at) * (second ? 0.95 : 1.1) * (0.94 + 0.12 * rPizz()));
        }
        prev = c.name;
      }
    }
    for (let bar = 21; bar <= 28; bar++) {
      for (const c of hchords.filter((x) => x.bar === bar)) {
        const root = tok(c.v.vc)[0].p;
        const eighths = bar >= 23;
        const step = eighths ? 0.5 : 1;
        const count = Math.round(c.len / step);
        for (let k = 0; k < count; k++) {
          let pitch = eighths && k % 2 ? root + 12 : root;
          const last = k === count - 1 && Math.abs(c.at + c.len - B(bar + 1)) < 1e-6;
          if (eighths && last && bar % 2 === 0) {
            if (bar % 4 === 0) continue;   // every fourth bar: a rest on the last eighth
            // otherwise the fifth (the octave over a half-diminished chord, whose fifth the tremolo holds)
            pitch = /m7b5|o7/.test(c.name) ? root + 12 : root + 7;
          }
          const acc2 = k === 0 ? 1 : k % 2 === 0 ? 0.9 : 0.78;
          pizz.note(c.at + k * step, step * 0.9, pitch, dyn(c.at + k * step) * acc2 * 0.92 * (0.95 + 0.1 * rPizz()));
        }
      }
    }

    // ---- section divisi: a con sordino sheen under the cello only where it sustains (bars 6, 9, 10), and in bars
    // 7-8 a viola counter-line above it that rises while the cello falls (A4 - B4, the B4 a suspension over A/C#)
    const dblEx = [[0, 0.8], [0.4, 1], [1, 0.85]];
    vlaDbl.play(B(5, 4.5), 'E4:1! D#4:1 E4:.5', { ...L, vel: 0.16, expr: dblEx });
    vlaDbl.play(B(7), 'A4:2 B4:3! A4:3', { ...L, vel: 0.22, expr: [[0, 0.75], [0.55, 1], [1, 0.7]] });
    vlaDbl.play(B(9, 1.5), 'A4:2', { ...L, vel: 0.16, expr: dblEx });
    vlaDbl.play(B(10), 'E4:2.5 D#4:.5', { ...L, vel: 0.15, expr: dblEx });
    vln2Dbl.play(B(13, 2), 'G5:2 F#5:.5 E5:.5 | D5:2.5 E5:.5 B4:1 | C#5:.5 D5:.5 A5:3 | G5:.5 F#5:1 G5:.5 D5:2',
      { ...L, vel: 0.22, expr: dblEx });
    // release: a few muted 2nd violins an octave under the solo violin, so the bow is masked by a section
    vln2Dbl.play(B(35), 'E4:1 G#3:2 A3:.5 B3:.5 | C4:1.5 B3:.5 E4:2 | D4:1! C4:1 A3:1.5 B3:.5 | C4:1.5! B3:.5 A3:2',
      { ...L, vel: 0.15, expr: dblEx });

    // ---- timpani (four drums: E2 F2 G2 C3), one cymbal swell, sub (the climax ends on the strings' apex, not on
    // the drum: the roll and the F2 are softer, the sub an octave higher and quieter)
    timp.note(B(25, 3), 2, 'E2', 0.32);
    timp.note(B(26, 3), 2, 'C3', 0.34);
    timp.note(B(27), 2, 'G2', 0.4);
    timp.roll(B(28), 4, 'G2', { from: 0.14, to: 0.36 });   // under the dominant, still below the arrival
    timp.note(B(29), 3, 'C3', 0.5);
    timp.roll(B(31, 3), 2, 'E2', { from: 0.2, to: 0.45 });   // the apex bass E, rising a semitone to F
    timp.note(B(32), 3, 'F2', 0.46);
    timp.note(B(33), 2, 'F2', 0.34);
    cym.hit(B(28), 4, 0.24, { bright: 0.6 });
    sub.play(B(29), 'C2:2 E2:2 | A1:2 F#2:2 | B1:2 E2:2 | F2:4 | F2:4 | F#1:2 B1:2', { vel: 0.26, expr: [[0, 0.85], [0.3, 1], [1, 0.9]] });

    // ---- celesta glints. The intro only hints at the motif (B5 - E6, then the sigh F#6 - E6): the reach of a
    // sixth is left to the cello at bar 5, so the hook is heard once near the seam. In the coda a memory of cell b.
    cel.play(B(3, 3), 'B5:1@0.26 E6:2@0.28 _:1 F#6:1.5@0.26! E6:.5@0.2', {});
    cel.play(B(12, 3), 'F#5:1 B5:1', { vel: 0.34 });
    cel.play(B(20, 3), 'E6:1 G#5:1', { vel: 0.34 });
    cel.play(B(36, 3), 'C6:1 E6:1', { vel: 0.34 });
    cel.play(B(39), 'E6:2@0.38 D#6:1@0.38! E6:1@0.39 | C6:2@0.36 B5:1@0.29! A5:1@0.34', {});
    cel.play(B(43), 'F6:2! E6:2', { vel: 0.24 });

    s.length(B(45));
  },
};
