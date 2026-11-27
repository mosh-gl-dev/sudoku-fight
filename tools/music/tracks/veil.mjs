// tools/music/tracks/veil.mjs
// "Veil": felt piano, string ensemble, celesta, a solo cello in the release and the return, a horn pair at the climax.
// D minor, 4/4, 48 bars, loops.
// Fourth draft (after quality gate 2):
//   - the head has a rhythmic fingerprint: x is syncopated (Bb on the "and" of 2, tied over 3) and the rising sixth
//     arrives early, on the "and" of 4, as an anticipation; the dotted figure is kept for at most every other bar;
//   - B moves its long notes off the beat (bars 10, 12), has a triplet tail (13) and no 4-3 at bar 16;
//   - C1 keeps the lament bass but re-harmonises it (Abmaj7/C, E7/B, G#dim7, Bb7 as a tritone substitute), the
//     piano gets a syncopated off-beat figure, two chords a bar from bar 20, and the bass goes on to G#: C1 ends on
//     E7, not on a 4-3 over A;
//   - C2 is a real tonal departure: the wedge is in A MINOR (bass A Bb B C C# D D# E), E7 turns into V/V of D minor
//     and the A pedal (bar 28) brings D minor back;
//   - climax: the tune in violins I + II in octaves (D6/D5), celli + basses on the bass (an octave apart), the
//     violas + horns counter starts on chord tones and never meets the tune's octave; the apex F6 is reached by the
//     theme's rising sixth (A5 -> F6); horns breathe;
//   - E: the pedal lifts at bar 39 (C#dim7/Bb, then A7 in bar 40) so the return is a cadence; the solo cello moves
//     against the rising violas and has a phrase-level dynamic;
//   - A': the head comes back in the solo cello an octave lower (not in the exposed piano); new cadence bII, VI,
//     German -> French sixth, a bare A with the top line on E5 (no D -> C# suspension) into bar 1.
// Fifth draft (after quality gate 3):
//   - register is planned in stages: C1 stays under C6, C2 reaches C6 then D6 (bar 27), the climax adds Eb6, the
//     apex F6 is held three beats;
//   - bar 7 closes on iv6 (a minor plagal approach to bar 8) instead of a fourth A7; bar 30 beats 3-4 are G minor,
//     so the climax cell D-Eb-D resolves like the theme's b6 -> 5 and G -> G# leads into the German sixth;
//   - C2's sigh sequence is broken once (bar 25: a held b9 in violins I, the sigh in violins II); the cadential
//     6/4 of bar 26 has its A; the piano's C1 off-beats are a moving inner voice under the tune;
//   - E: the violas are diatonic and motivic (the head's rising sixth and fall), the chromatic step only at 39-40;
//     the solo cello breathes (bar 37, bar 41) and is accompanied by pp horns and muted violins II in 37-38;
//   - climax balance: the violas + horns counter is a real second voice (horns mf, panned opposite the tune), the
//     piano ostinato sits above it, the timpani pulse is audible; the cymbal is a suspended swell that rings;
//   - fewer stops: no rit into C1, shallower rits into B and E; one flute colour (B, bar 13), fewer celesta sighs.
//
// ---------------------------------------------------------------------------------------------------------------
// THE MOTIF
//   x = "_ A4 Bb4~ A4"    : a rising minor second answered at once by the falling one (an upper-neighbour sigh).
//                            The Bb is the b6 of D minor, so the first idea already carries the semitone colour.
//   HEAD (bars 1-2)       : x (syncopated), then the rising SIXTH A4 -> F5 anticipated on the "and" of 4, and a
//                            fall F E D C#, whose last step is y = the 4-3 suspension D -> C# over the dominant.
//   ANSWER (bars 3-4)     : x up a fifth (E F E), G5 anticipated, then the FALLING sixth (G5 -> Bb4) into the
//                            b9 -> 8 sigh (Bb -> A) over the dominant.
//
// HARMONIC PLAN (bar: chords, "." = half-bar change)
//   A   1 i | 2 iv6 . V7sus4-3 | 3 iv(add6) | 4 ii(half-dim)7 . V7 (b9-8) | 5 i . i6 | 6 VImaj7 . V7 |
//       7 iv7 . iv6 (Gm/Bb, minor plagal) | 8 i . V7/III (C7, pivot to F)
//   B   9 I | 10 vi7 . V6 | 11 ii7 . V7b9 | 12 I7/3 . V7b9/ii | 13 ii9 . iv6 (Bbm6) | 14 i6/4 (Fm/C) . V7 |
//       15 IVmaj7 . N6 of D minor | 16 vii(dim)7/V . V7
//   C1  17 i | 18 V6/5 | 19 Abmaj7/C | 20 E7/B . G#dim7/B | 21 Gm7/Bb . Bb7 | 22 Dm/A . E7/G#
//   C2  (A minor) 23 i . bII (Bb) | 24 V4/3 (E7/B) . i6 | 25 V6/5 of iv (A7/C#) . bVI6 of D (Bb/D) |
//       26 V6/5 of V (B7/D#) . i6/4 | 27 V7b9 (E7, = V/V of D minor) | 28 V7 of D minor (luftpause in the violins)
//   D   29 VI (deceptive) . (Eb/Bb) | 30 bII . iv | 31 Ger+6 . i6/4 | 32 V7sus4 . V7 | 33 i . i4/2 | 34 iv6 . V7
//   E   35 i | 36 iv/D | 37 IV/D | 38 bVII/D | 39 C#dim7/Bb (pedal lifted) | 40 V7
//   A'  41 i . iv/D | 42 VImaj7 . V7sus4-3 | 43 iv7 | 44 ii(half-dim)7/3 . V7 | 45 i6 . iv6 | 46 bII . N6 |
//       47 VI . Ger+6 -> Fr+6 | 48 V (bare fifth) -> bar 1
//
// VOICING RULE: a piano or celesta note never sounds a semitone from a pitch a string section is holding in the
// same octave, unless it is tagged as an intended dissonance.
// ---------------------------------------------------------------------------------------------------------------

export default {
  id: 'veil',
  title: 'Veil',
  bpm: 64,
  loop: true,

  build(s) {
    s.meter(4, 4);
    s.reverb('hall');
    s.delay({ beats: 0.75, feedback: 0.22, damp: 0.5 });
    s.master({ lufs: -16 });
    s.humanize = { time: 0.009, vel: 0.04 };
    const B = (bar, beat = 1) => s.bar(bar, beat);

    // ---- mixer ---------------------------------------------------------------------------------------------
    // piano: a little air above 3.5 kHz (the gentle sections were 10-20 dB too dark at 4-8 kHz)
    const pianoBus = s.bus('piano', { gain: -2, reverb: 0.27, room: 0.12,
      eq: [{ type: 'ls', f: 200, gain: -2.5 }, { type: 'hs', f: 3000, gain: 4.5 }, { type: 'hs', f: 6500, gain: 6 }] });
    const celBus = s.bus('celesta', { gain: -5, pan: 0.48, reverb: 0.42, delay: 0.12 });
    // violins I, gentle (muted lead in B and A'): presence only, flat above 2 kHz
    const vln1Bus = s.bus('violins1', { gain: -9, pan: -0.35, width: 1.2, reverb: 0.32, eq: [
      { type: 'peak', f: 1800, q: 1, gain: 1.5 }, { type: 'hs', f: 4000, gain: 5 }] });
    // violins I, high and open (C1, C2, climax): a gentler dip at 3.3 kHz (string sheen kept), the 1.25 kHz
    // fundamentals of D6-F6 trimmed, the static partials of F6/E6 notched
    const vln1hBus = s.bus('violins1hi', { gain: -9, pan: -0.35, width: 1.2, reverb: 0.32, eq: [
      { type: 'peak', f: 1250, q: 1.4, gain: -1.5 }, { type: 'peak', f: 1800, q: 1, gain: 1.5 }, { type: 'peak', f: 3300, q: 0.7, gain: -3 },
      { type: 'peak', f: 5580, q: 4, gain: -3 }, { type: 'peak', f: 7000, q: 4, gain: -4 }, { type: 'hs', f: 6000, gain: -2.5 }] });
    const vln2Bus = s.bus('violins2', { gain: -10, pan: -0.26, width: 1.2, reverb: 0.36, eq: [{ type: 'peak', f: 3400, q: 0.9, gain: -3 }] });
    const vlaBus = s.bus('violas', { gain: -9, pan: 0.26, width: 1.2, reverb: 0.4, eq: [{ type: 'hs', f: 4000, gain: 2 }] });
    const vcBus = s.bus('celli', { gain: -8, pan: 0.42, width: 1.15, reverb: 0.36 });
    const cbBus = s.bus('basses', { gain: -10.5, pan: 0.32, reverb: 0.22, eq: [{ type: 'hp', f: 56 }] });
    const soloBus = s.bus('cello', { gain: -10.5, pan: 0.05, reverb: 0.24, room: 0.12, eq: [{ type: 'hs', f: 4000, gain: 4 }] });
    // horns opposite the tune (the climax counter needs its own place)
    const hornBus = s.bus('horns', { gain: -11, pan: 0.3, reverb: 0.48 });
    const fluteBus = s.bus('flute', { gain: -9, pan: 0.2, reverb: 0.45 });
    // timpani: stick contact at 2.2 kHz so the strokes exist above 300 Hz
    const timpBus = s.bus('timpani', { gain: -10, reverb: 0.45, eq: [{ type: 'peak', f: 700, q: 1, gain: 7 }, { type: 'peak', f: 2500, q: 1, gain: 9 }] });
    const cymBus = s.bus('cymbal', { gain: -4, reverb: 0.4, eq: [{ type: 'hs', f: 5000, gain: -2 }] });

    // ---- bus automation (dB added to the bus gain) ------------------------------------------------------------
    vln1Bus.automate('gain', [[B(8, 3), 0], [B(9), 4.5], [B(16, 4), 4.5], [B(17), 2.5], [B(48, 3), 2.5], [B(49), 0]]);
    // the high violins: C1 +2, the wedge +2.5, +3 from bar 25 through the dominant (the lead stays clear of the
    // build); the climax +2.5 (the tune 3-4 dB over the counter, not 10)
    vln1hBus.automate('gain', [[B(17), 2], [B(22, 3), 2], [B(23), 2.5], [B(24, 4), 2.5], [B(25), 3], [B(28, 4), 3], [B(29), 2.5],
      [B(33, 3), 2.5], [B(35), 1]]);
    vln2Bus.automate('gain', [[B(28, 4), 0], [B(29), 0], [B(34, 3), 0], [B(35), 1.5], [B(48, 3), 1.5], [B(49), 0]]);
    // violas: the counter in D only -2.5/-3 dB; in E they make room for the cello in bar 40
    vlaBus.automate('gain', [[0, 1.5], [B(8, 4), 1.5], [B(9), 0], [B(28, 4), 0], [B(29), -2.5], [B(30, 4), -2.5], [B(31), -3], [B(32, 4), -3],
      [B(33), -2.5], [B(34, 3), -2.5], [B(35), 0], [B(36), 1.5], [B(39, 2), 1.5], [B(39, 3), -1.5], [B(41, 3), -1.5], [B(41, 4), 1.5], [B(49), 1.5]]);
    // celli: the pedal stays at 0 under the solo cello's entry (35), +1.5 from 36
    vcBus.automate('gain', [[0, 1.5], [B(8, 4), 1.5], [B(9), -1.5], [B(12, 4), -1.5], [B(13), 0],
      [B(28, 4), 0], [B(29), -1], [B(34, 3), -1], [B(35), 0], [B(35, 4), 0], [B(36), 1.5], [B(40, 4), 1.5], [B(41), 0], [B(44, 4), 0], [B(45), 1.5], [B(49), 1.5]]);
    cbBus.automate('gain', [[B(28, 4), 0], [B(29), -0.5], [B(34, 3), -0.5], [B(35), 0]]);
    // the return grows in (no step at the E -> A' join)
    pianoBus.automate('gain', [[0, 0.5], [B(8, 4), 0.5], [B(9), 0], [B(40, 3), 0], [B(42, 3), 1.5], [B(47, 4), 1.5], [B(49), 0.5]]);
    // the solo clears its own entry, then sits 1.5 dB up
    soloBus.automate('gain', [[B(34, 4), 0], [B(35), 5], [B(35, 3), 3], [B(36, 3), 1.5], [B(37), -1], [B(38, 2), -1], [B(38, 4), 1.5],
      [B(39), 2], [B(39, 4), 2.5], [B(40), 3.5], [B(41, 2), 3.5], [B(42), 2.5], [B(43, 4), 2.5], [B(44), 3.5], [B(45), 3.5]]);
    timpBus.automate('gain', [[B(30, 3), 0], [B(31), 4.5], [B(32, 4.5), 4.5], [B(33), 2], [B(33, 3), 0]]);
    celBus.automate('gain', [[B(34, 4), 0], [B(35), 1.5], [B(47, 4), 1.5], [B(49), 0]]);

    // piano: the tune (right hand) and the accompaniment (left hand) are two parts on one bus
    const pm = s.part(pianoBus, 'feltPiano', { name: 'pianoMelody', hardness: 0.35, humanize: { time: 0.013, vel: 0.05 } });
    const pa = s.part(pianoBus, 'feltPiano', { name: 'piano', hardness: 0.3 });
    const cel = s.part(celBus, 'celesta');
    const v1 = s.part(vln1Bus, 'stringsEnsemble', { section: 'violins' });
    const v1h = s.part(vln1hBus, 'stringsEnsemble', { section: 'violins' });
    const v2 = s.part(vln2Bus, 'stringsEnsemble', { section: 'violins2' });
    const v2t = s.part(vln2Bus, 'stringsTremolo', { section: 'violins2' });
    const va = s.part(vlaBus, 'stringsEnsemble', { section: 'violas' });
    const vat = s.part(vlaBus, 'stringsTremolo', { section: 'violas' });
    const vc = s.part(vcBus, 'stringsEnsemble', { section: 'celli' });
    const cb = s.part(cbBus, 'contrabass');
    const solo = s.part(soloBus, 'soloCello', { name: 'celloRelease' });
    const hn = s.part(hornBus, 'warmHorn', { players: 2 });
    const fl = s.part(fluteBus, 'flutePad', { players: 1 });
    const timp = s.part(timpBus, 'timpani');
    const cym = s.part(cymBus, 'cymbalSwell');

    const ped = (a, b) => { pm.pedal(a, b); pa.pedal(a, b); };
    const L = (bar, beat, dur, pitch, vel, o) => pa.note(B(bar, beat), dur, pitch, vel, o);
    // figure 1: eight quavers of a broken chord, pedalled by half bars (bars 9-12)
    const arp8 = (bar, notes, vel, o = {}) => {
      pa.play(B(bar), notes, { vel, shape: 'arch', shapeAmt: 0.18, ...o });
      ped(B(bar), B(bar, 3));
      ped(B(bar, 3), B(bar + 1));
    };
    // figure 2: a lilting half bar: bass on the beat, a dyad on the off-beat, a top note on the "and" of 2
    const lilt = (bar, beat, bass, dyad, topNote, vel, o) => {
      L(bar, beat, 2, bass, vel * 0.88);
      L(bar, beat + 0.5, 1.5, dyad, vel * 0.8, o);
      L(bar, beat + 1.5, 0.5, topNote, vel * 0.74);
      ped(B(bar, beat), B(bar, beat + 2));
    };
    const SORD = { sordino: true };
    // per-note bow arcs: almost flat (a section shapes the phrase with the velocity shape, not every note of a slur)
    const ARC_VC = [[0, 0.95], [0.35, 1], [1, 0.96]];
    const ARC_VA = [[0, 0.95], [0.6, 1], [1, 0.96]];
    const ARC_IN = [[0, 0.95], [0.5, 1], [1, 0.96]];
    const LEAD = [[0, 0.93], [0.45, 1], [1, 0.95]];
    const TREM = [[0, 0.92], [1, 1]];

    // ---- tempo: rubato at the big cadences only; a tempo is regained over one beat ---------------------------
    s.tempo(0, 54);
    s.accel(0, B(1, 3), 64);
    // fewer stops: B -> C1 runs on without a rit; the rits into B and E are shallow
    s.rit(B(8, 3), B(9), 61); s.accel(B(9), B(9, 2), 66);
    s.accel(B(17), B(23), 67);
    s.accel(B(23), B(27), 70);
    s.rit(B(27), B(29), 58); s.accel(B(29), B(29, 2), 60);
    s.rit(B(34, 3), B(35), 61); s.accel(B(35), B(35, 2), 60);
    s.rit(B(40, 2), B(41), 52); s.accel(B(41), B(41, 2), 60);
    s.rit(B(47, 3), B(49), 52);

    // ---- sections -------------------------------------------------------------------------------------------
    s.section('A theme', B(1), B(9), 'gentle');
    s.section('B inversion (F major)', B(9), B(17), 'gentle');
    s.section('C1 lament', B(17), B(23), 'tension');
    s.section('C2 wedge (A minor)', B(23), B(29), 'tension');
    s.section('D climax', B(29), B(35), 'climax');
    s.section('E release', B(35), B(41), 'release');
    s.section("A' return", B(41), B(49), 'gentle');

    // =========================================================================================================
    // A  bars 1-8: the head phrase and its answer in the piano, a muted string floor under it.
    // =========================================================================================================
    // x syncopated, the rising sixth anticipated on the "and" of 4, the fall, y
    pm.play(B(1), 'p _:1 A4:.5@0.38 Bb4:1.5@0.43! A4:.5@0.35 F5:1.5@0.45 E5:.5@0.38 D5:1.5@0.42! C#5:1@0.35', {});
    // the answer: x up a fifth, G5 anticipated, the falling sixth, b9 -> 8 a quaver late
    pm.play(B(3), 'p _:1 E5:.5@0.38 F5:1.5@0.43! E5:.5@0.35 G5:1.5@0.44 Bb4:1.5@0.41! A4:1.5@0.34', {});
    // x in quarter-note triplets, D5 tied over the bar, F5 on 2 held into the dominant (b13 -> 5)
    pm.play(B(5), '_:1 A4:qt@0.4 Bb4:qt@0.45! A4:qt@0.38 D5:2@0.43 F5:1.5@0.45! E5:.5@0.39 C#5:1@0.36', {});
    // G F E down to the b13 appoggiatura on 3 (no dotted figure), then D E Bb (3rd and 7th of C7)
    pm.play(B(7), 'G5:1@0.44 F5:.5@0.39 E5:.5@0.37 F5:1@0.43! E5:1@0.37 | D5:2@0.43 E5:1@0.39 Bb4:1@0.35', {});
    // left hand, held keys
    L(1, 1, 4, 'D3', 0.28); L(1, 2, 3, 'A3', 0.21); L(1, 3, 2, 'F4', 0.19);
    ped(B(1), B(1, 4.5)); ped(B(1, 4.5), B(2));
    L(2, 1, 2, 'Bb2', 0.27); L(2, 2, 1, ['G3', 'D4'], 0.19); L(2, 3, 1, 'G3', 0.17); L(2, 3, 2, 'A2', 0.26);
    L(2, 4, 1, ['E3', 'G3'], 0.18);
    ped(B(2), B(2, 3)); ped(B(2, 3), B(3));
    L(3, 1, 4, 'G2', 0.26); L(3, 2, 3, 'D3', 0.2); L(3, 3, 2, 'Bb3', 0.19);
    ped(B(3), B(3, 3)); ped(B(3, 3), B(3, 4.5)); ped(B(3, 4.5), B(4));
    L(4, 1, 2, 'E3', 0.25); L(4, 2, 1, ['G3', 'D4'], 0.19); L(4, 3, 2, 'A2', 0.27); L(4, 4, 1, ['E3', 'G3', 'C#4'], 0.18);
    ped(B(4), B(4, 3)); ped(B(4, 3), B(4, 4)); ped(B(4, 4), B(5));
    L(5, 1, 2, 'D3', 0.24); L(5, 2, 3, 'A3', 0.2); L(5, 3, 2, 'F3', 0.22);
    ped(B(5), B(5, 3)); ped(B(5, 3), B(5, 4.5)); ped(B(5, 4.5), B(6));
    L(6, 1, 2, 'Bb2', 0.24); L(6, 2, 1, 'F3', 0.2); L(6, 3, 1, ['A2', 'D3'], 0.23); L(6, 4, 1, ['A2', 'E3', 'G3'], 0.2);
    ped(B(6), B(6, 3)); ped(B(6, 3), B(6, 4)); ped(B(6, 4), B(7));
    // bar 7 second half: iv6 (Gm/Bb), not a fourth A7: the tune's F E become the 7th and 6th, bar 8 arrives plagally
    L(7, 1, 2, 'G2', 0.24); L(7, 2, 1, 'D3', 0.2); L(7, 3, 2, 'Bb2', 0.25); L(7, 3.5, 1.5, ['G3', 'D4'], 0.19);
    ped(B(7), B(7, 3)); ped(B(7, 3), B(7, 4.5)); ped(B(7, 4.5), B(8));
    L(8, 1, 2, 'D3', 0.23); L(8, 2, 2, ['A3', 'F4'], 0.19); L(8, 3, 2, 'C3', 0.23); L(8, 3.5, 1.5, ['E3', 'G3'], 0.18);
    ped(B(8), B(8, 3)); ped(B(8, 3), B(9));

    // the muted floor: it crosses the loop seam and carries straight on into the string entry of bar 5
    vc.play(B(1), 'D3:4 | Bb2:2 A2:2 | G2:4 | E2:2 A2:2', { vel: 0.33, legato: true, expr: ARC_VC, ...SORD });
    va.play(B(1), 'F4:4 | D4:2 E4:2 | D4:4 | D4:2 C#4:2', { vel: 0.33, legato: true, expr: ARC_VA, ...SORD });
    // violins II resolve Bb -> A with the tune (bar 4 beat 3.5), not under its suspension
    v2.play(B(2, 3), 'A4:2 | Bb4:4 | Bb4:2.5 A4:1.5', { vel: 0.26, legato: true, expr: ARC_IN, ...SORD });
    vc.play(B(5), 'D3:2 F3:2 | Bb2:2 A2:2 | G2:2 Bb2:2 | D3:2 C3:2', { vel: 0.3, legato: true, expr: ARC_VC, shape: 'arch', shapeAmt: 0.15, ...SORD });
    cb.play(B(7), 'pp G1:2 Bb1:2 | D2:2 C2:2', { legato: true, expr: ARC_VC });
    va.play(B(5), 'F4:4 | F4:3 E4:1 | D4:4 | D4:2 G4:1.85', { vel: 0.3, legato: true, expr: ARC_VA, ...SORD });
    // Bb held through iv7 -> iv6, resolving to A on the tonic (the sigh lands on bar 8)
    v2.play(B(7), 'Bb4:4 | A4:2 Bb4:2 | A4:4', { vel: 0.3, legato: true, expr: ARC_IN, ...SORD });
    cel.play(B(6, 1.5), 'p A5:2!', {});                                    // the maj7 of Bb, a held bell (no sigh)
    cel.play(B(8, 3), 'p C6:1 Bb5:1', {});                                  // root and 7th of C7 (the tune has E)

    // =========================================================================================================
    // B  bars 9-16: F major. x inverted in the muted violins; long notes moved off the beat (10, 12), a triplet
    // tail (13), and bar 16 lands on the 5th of V7 (no suspension).
    // =========================================================================================================
    v1.play(B(9),
      '_:1 C5:1 B4:1.5! C5:1 | F5:2.5! E5:1 | _:1 D5:1 Db5:1.5! C5:1 | Eb5:2.5! D5:1 | '
      + '_:1 A5:1! Bb5:1 G5:et F5:et G5:et | Ab5:1.5 G5:.5 F5:1 E5:1 | D5:2 Eb5:2 | D5:1 F5:1 E5:2',
      { vel: 0.42, legato: true, expr: LEAD, shape: (u) => 0.85 + 0.25 * Math.sin(Math.PI * u), ...SORD });
    v2.play(B(13), 'D5:2 F5:2 | C5:2 Bb4:2 | A4:2! G4:2 | B4:2 C#5:2', { vel: 0.41, legato: true, expr: ARC_IN, ...SORD });
    // the inner voices follow the phrase: an arch over the 8 bars, a dip in bar 12 before violins II enter
    const innerB = (u) => (0.9 + 0.16 * Math.sin(Math.PI * u)) * (u >= 0.375 && u < 0.5 ? 0.88 : 1);
    va.play(B(9), 'A3:4 | A3:2 G3:2 | Bb3:4 | A3:4 | Bb3:2 Db4:2 | C4:2 Bb3:2 | A3:2! Bb3:2 | B3:2 A3:2',
      { vel: 0.41, legato: true, expr: ARC_VA, shape: innerB, ...SORD });
    vc.play(B(9), 'F2:4 | D3:2 E3:2 | G2:2 C3:2 | A2:2 F#2:2 | G2:2 Bb2:2 | C3:4 | Bb2:2 G2:2 | G#2:2 A2:2',
      { vel: 0.4, legato: true, expr: ARC_VC, shape: innerB });
    cb.play(B(15), 'p Bb1:2 G1:2 | G#1:2 A1:2', { legato: true, expr: ARC_VC });

    arp8(9, 'F3:.5@0.16 C4 A3 C4 G4 C4 A3 C4', 0.225);
    arp8(10, 'F3:.5@0.17 A3 C4 F4 G3@0.17 C4 E4 C4', 0.225);
    arp8(11, 'G3:.5@0.16 D4 Bb3 F4 Bb3@0.17 E4 G4 E4', 0.235);
    arp8(12, 'A3:.5@0.17 C4 F4 Eb4 A3@0.17 C4 F#4 D4', 0.245);
    lilt(13, 1, 'G2', ['D3', 'Bb3'], 'F4', 0.28); lilt(13, 3, 'Bb2', ['F3', 'Db4'], 'G4', 0.28);
    lilt(14, 1, 'C3', ['F3', 'Ab3'], 'C4', 0.29); lilt(14, 3, 'C3', ['G3', 'Bb3'], 'E4', 0.28);
    lilt(15, 1, 'Bb2', ['F3', 'A3'], 'D4', 0.28, { tag: 'tension' }); lilt(15, 3, 'G2', ['Eb3', 'Bb3'], 'Eb4', 0.28);
    lilt(16, 1, 'G#2', ['D3', 'F3'], 'B3', 0.26); lilt(16, 3, 'A2', ['E3', 'G3'], 'C#4', 0.24);

    // the one woodwind colour: a pp flute call, a falling fourth D6 -> A5 that hands its A5 to the violins (bar 13
    // beat 2, a dovetail on the unison); no celesta sigh here
    fl.play(B(13), 'D6:.5 A5:1.5!', { legato: true, vel: 0.3, expr: [[0, 0.7], [0.3, 1], [1, 0.45]] });

    // =========================================================================================================
    // C1 bars 17-22: the lament bass D C# C B Bb A, re-harmonised, extended to G# (E7: the door to A minor).
    // =========================================================================================================
    vc.play(B(17), 'D3:4 | C#3:4 | C3:4 | B2:4 | Bb2:4 | A2:2 G#2:2', { vel: 0.56, legato: true, expr: ARC_VC, shape: 'cresc', shapeAmt: 0.2 });
    cb.play(B(17), 'D2:4 | C#2:4 | C2:4 | B1:4 | Bb1:4 | A1:2 G#1:2', { vel: 0.52, legato: true, expr: ARC_VC, shape: 'cresc', shapeAmt: 0.2 });
    // 17 rise | 18 Bb-A (b9 -> 8), G | 19 G held as the maj7 of Ab, rise to C | 20 C tied in as b13 of E7 -> B,
    // G# B (G#dim7) | 21 B -> Bb (root of Gm7/Bb), F, Ab (7th of Bb7) | 22 Ab -> A, F, E: the root of E7.
    // C1 stays under C6: D6 is kept for bar 27 (C2), Eb6 for the climax, F6 for the apex.
    v1h.play(B(17), 'D5:1@0.48 F5:1@0.52 A5:2 Bb5:2! A5:1 G5:2! Ab5:1 C6:3! B5:1 G#5:1 B5:1 Bb5:2 F5:1 Ab5:1! A5:1.5 F5:.5 E5:2',
      { vel: 0.56, legato: true, bright: 0.45, expr: LEAD, shape: (u) => 0.92 + 0.12 * Math.sin(Math.PI * Math.min(1, u * 1.25)) });
    // sustained muted violas, then the tremolo as a new colour from bar 21 (to the luftpause)
    va.play(B(17), '[D4 F4]:4 | [C#4 G4]:4 | [Eb4 Ab4]:4 | [D4 G#4]:2 [D4 F4]:2', { vel: 0.4, legato: true, expr: ARC_VA, ...SORD, shape: 'cresc', shapeAmt: 0.15 });
    vat.play(B(21), '[D4 F4]:2 [D4 Ab4]:2! | [D4 A4]:2 [D4 B4]:2 | C4:2 D4:2 | D4:2 E4:2 | E4:2 F4:2 | F#4:2 E4:2 | D4:4 | C#4:3.5',
      { vel: 0.34, expr: TREM, shape: 'cresc', shapeAmt: 0.3 });
    // piano: x on a free chord tone (17, 18), then a syncopated figure: bass octaves on 1 and 3, and on the
    // off-beats a moving inner voice under the tune (a dyad, then the upper note alone, laid back ~12 ms)
    pm.play(B(17), '_:.5 A4:.5@0.31 Bb4:.5@0.35! A4:2.5@0.27', {});
    pm.play(B(18), '_:.5 E4:1@0.31 F4:1@0.36! E4:1.5@0.28', {});
    L(17, 1, 4, 'F3', 0.25); L(17, 2, 3, 'A3', 0.21);
    L(18, 1, 4, 'E3', 0.27); L(18, 2, 3, 'G3', 0.23);
    const LAID = 0.013;
    const syn = (bar, bass1, bass2, offs, vel) => {
      L(bar, 1, 1.8, bass1, vel); L(bar, 3, 1.8, bass2, vel * 0.88);
      const v = [0.8, 0.66, 0.78, 0.7];
      offs.forEach((d, k) => L(bar, 1.5 + k + LAID, Array.isArray(d) ? 0.4 : 0.3, d, vel * v[k]));
    };
    // 19 Abmaj7/C: Eb D Eb F over a fixed C | 20 E7/B . G#dim7/B: G# alone, then F over D, F alone
    // 21 Gm7/Bb . Bb7: D F under Bb5, then Ab under the tune's F5 | 22 Dm/A . E7/G#: under A5/F5, then under E5
    syn(19, ['C3', 'C4'], ['C3', 'C4'], [['C5', 'Eb5'], ['C5', 'D5'], ['C5', 'Eb5'], 'F5'], 0.23);
    syn(20, ['B2', 'B3'], ['B2', 'B3'], [['D5', 'G#5'], 'G#5', ['D5', 'F5'], 'F5'], 0.235);
    syn(21, ['Bb2', 'Bb3'], ['Bb2', 'Bb3'], [['Bb4', 'D5'], 'F5', ['D4', 'Ab4'], ['F4', 'Ab4']], 0.24);
    syn(22, ['A2', 'A3'], ['G#2', 'G#3'], [['D5', 'F5'], ['A4', 'D5'], ['B4', 'D5'], 'G#4'], 0.245);

    // =========================================================================================================
    // C2 bars 23-28: the wedge, in A minor. Bass A Bb B C C# D D# E (E7 = V/V of D), then the A pedal.
    // Violins I sigh down a step on every chord (the first sigh is x in A minor: F -> E); the violas' tremolo
    // rises in tenths with the bass. At bar 28 beat 4.5 the violins lift (a breath); the low strings tie through.
    // =========================================================================================================
    vc.play(B(23), 'A2:2 Bb2:2 | B2:2 C3:2 | C#3:2 D3:2 | D#3:2 E3:6 | A2:4', { legato: true, expr: ARC_VC, vel: 0.56, shape: 'cresc', shapeAmt: 0.15 });
    cb.play(B(23), 'A1:2 Bb1:2 | B1:2 C2:2 | C#2:2 D2:2 | D#2:2 E2:6 | A1:4', { legato: true, expr: ARC_VC, vel: 0.52, shape: 'cresc', shapeAmt: 0.15 });
    // bar 25 breaks the sequence: violins I hold the b9 (Bb5) over A7/C# until it turns consonant on Bb/D, and
    // violins II take the sigh Bb4 -> A4 under it (root a ninth below the b9)
    v1h.play(B(23), 'F5:1! E5:1 G5:1! F5:1 | A5:1! G#5:1 B5:1! A5:1 | Bb5:2! C6:1.5! Bb5:.5 | C6:1! B5:1 C6:2 | '
      + 'B5:1.5 C6:.5 D6:2!',
      { vel: 0.5, legato: true, expr: LEAD, shape: 'cresc', shapeAmt: 0.15, bright: 0.42 });
    v1h.note(B(28), 3.5, 'C#6', 0.58, { _leg: true, expr: [[0, 0.74], [1, 0.97]], bright: 0.44 });
    v2.play(B(25), 'Bb4:1! A4:1', { legato: true, vel: 0.44, expr: ARC_IN });
    // the tremolo: bar 26 second half on A5, the 6/4's A, resolving by semitone to G#5 (bar 27)
    v2t.play(B(23), 'C5:2 D5:2 | D5:2 E5:2 | E5:2 D5:2 | F#5:2 A5:2@0.3 | G#5:2 F5:2! | E5:2 G5:1.5', { vel: 0.34, expr: TREM, shape: 'cresc', shapeAmt: 0.3 });
    // piano: the pulse in octaves on the rising bass, quarters, then quavers (25-26); one sixteenth-note
    // statement of the head (26) lands its F on the b9 of E7
    const ACC = [1, 0.8, 0.86, 0.76];
    const pulse = (bar, beats, vel) => beats.forEach(([beat, dur, pitch], k) => {
      const len = dur >= 2 ? dur * 0.85 : dur * (k % 2 === 0 ? 0.85 : 0.55);
      L(bar, beat, len, pitch, vel * ACC[Math.floor(beat - 1)]);
    });
    const oct = (p, q) => [p, q];
    pulse(23, [[1, 1, oct('A2', 'A3')], [2, 1, oct('A2', 'A3')], [3, 1, oct('Bb2', 'Bb3')], [4, 1, oct('Bb2', 'Bb3')]], 0.215);
    pulse(24, [[1, 1, oct('B2', 'B3')], [2, 1, oct('B2', 'B3')], [3, 1, oct('C3', 'C4')], [4, 1, oct('C3', 'C4')]], 0.215);
    // quavers: each group of four grows a little, the off-quavers drop the upper octave (a pianist's hand, not a
    // sequencer's)
    const quav = (bar, beat, pitch, n, vel) => {
      for (let k = 0; k < n; k++) {
        const p = k % 2 && Array.isArray(pitch) ? pitch[0] : pitch;
        L(bar, beat + k * 0.5, k % 2 ? 0.3 : 0.42, p, vel * (1 + 0.04 * k) * (k % 2 ? 0.8 : 1) * ACC[Math.floor(beat - 1 + k * 0.5) % 4]);
      }
    };
    quav(25, 1, oct('C#3', 'C#4'), 4, 0.185); quav(25, 3, oct('D3', 'D4'), 4, 0.19);
    // bar 26 and the head figure a little lighter: the violins' sighs stay on top of the build
    quav(26, 1, oct('D#3', 'D#4'), 4, 0.145); quav(26, 3, oct('E3', 'E4'), 2, 0.15);
    pm.play(B(26, 4), 'A4:.25@0.23 Bb4:.25@0.25! A4:.25@0.23 F5:.25@0.27', {});
    pm.play(B(27), '_:.5 G#4:.5 D5:.5 F5:.5! _:.5 G#4:.5 B4:.5 D5:.5', { vel: 0.2, shape: 'cresc', shapeAmt: 0.2 });
    pm.play(B(28), 'A4:.5 C#5:.5 E5:.5 G5:.5 _:2', { vel: 0.22, shape: 'cresc', shapeAmt: 0.2 });
    pulse(27, [[1, 2, oct('E2', 'E3')], [3, 2, 'E3']], 0.22);
    pulse(28, [[1, 2, oct('A2', 'A3')]], 0.21);
    timp.note(B(27), 2, 'E3', 0.22);
    timp.roll(B(28), 4, 'A2', { from: 0.06, to: 0.2, rate: 11 });
    // a suspended-cymbal swell that crests under the tutti and rings away (no reverse-cymbal cut-off)
    cym.hit(B(27, 3), 6, 0.12, { bright: 0.25, tail: 3.0 });
    // the horns are prepared: a soft swell on the dominant, ending with the violins' breath
    hn.note(B(28), 3.4, ['A3', 'E4'], 0.3, { expr: 'cresc' });

    // =========================================================================================================
    // D  bars 29-34: climax. Tune in violins I + II in octaves; celli + basses on the bass; violas + horns
    // counter (chord tones first, then the climb G# -> A against the held D6, then D E F G against F6 E6 D6).
    // =========================================================================================================
    const up = { legato: true, expr: LEAD, shape: (u) => 1 - 0.08 * Math.max(0, u - 0.4) / 0.6 };
    const down = { legato: true, expr: [[0, 1], [0.5, 0.92], [1, 0.75]], shape: (u) => (u < 0.25 ? 1 : 1 - 0.3 * (u - 0.25) / 0.75) };
    // the apex F6 comes from A5 by the theme's rising sixth, and is held three beats.
    // The held D6 (bars 31-32: Ger+6, 6/4, sus4) is played on its own and grows into the 6/4 (no sag).
    const tuneA1 = 'D6:2 Eb6:4! D6:1! C6:.5 Bb5:.5', tuneA3 = 'C#6:.5 A5:1.5', tuneB = 'F6:3 E6:.5! D6:.5 | E6:2 C#6:2';
    const APEX = [[0, 0.84], [0.5, 0.95], [0.82, 1], [1, 0.93]];
    v1h.play(B(29), tuneA1, { ...up, vel: 0.68, bright: 0.34 });
    v1h.play(B(31), 'D6:6!', { legato: true, vel: 0.71, bright: 0.37, expr: APEX });
    v1h.play(B(32, 3), tuneA3, { legato: true, vel: 0.65, bright: 0.34, expr: LEAD });
    v1h.play(B(33), tuneB, { ...down, vel: 0.68, bright: 0.4 });
    v2.play(B(29), tuneA1, { ...up, vel: 0.66, transpose: -12 });
    v2.play(B(31), 'D6:6!', { legato: true, vel: 0.68, expr: APEX, transpose: -12 });
    v2.play(B(32, 3), tuneA3, { legato: true, vel: 0.62, expr: LEAD, transpose: -12 });
    v2.play(B(33), tuneB, { ...down, vel: 0.6, transpose: -12 });
    // the bass an octave above the basses (the climax progression needs its bass on a phone)
    vc.play(B(29), 'Bb2:4 | Eb3:2 G2:2 | Bb2:2 A2:2 | A2:4', { legato: true, expr: ARC_VC, vel: 0.62, shape: 'cresc', shapeAmt: 0.08 });
    vc.play(B(33), 'D3:2 C3:2 | Bb2:2 A2:2', { ...down, expr: ARC_VC, vel: 0.58 });
    cb.play(B(29), 'Bb1:4 | Eb2:2 G1:2 | Bb1:2 A1:2 | A1:4', { legato: true, expr: ARC_VC, vel: 0.6, shape: 'cresc', shapeAmt: 0.08 });
    cb.play(B(33), 'D2:2 C2:2 | Bb1:2 A1:2', { ...down, expr: ARC_VC, vel: 0.52 });
    // the counter: F G (Bb, then Eb/Bb), Bb Ab G (the 3rd of N6 doubled), G# A (the augmented sixth resolving
    // up while the bass falls Bb -> A), A G E; then D E F G against F E D (a voice exchange with the tune)
    va.play(B(29), 'F4:2 G4:2 | Bb4:1.5 Ab4:.5 G4:2 | G#4:2! A4:4 G4:1 E4:1', { legato: true, expr: ARC_VA, vel: 0.66 });
    va.play(B(33), 'D4:1 E4:1! F4:2 G4:2 E4:2', { ...down, expr: ARC_VA, vel: 0.6 });
    // the horns play the same line (mf: some brass edge) but breathe at the phrase joins (a quaver before bar 31
    // beat 3, 32 beat 3, 33); bar 29 is their re-entry after the swell of bar 28
    hn.play(B(29), 'F4:2@0.56 G4:2@0.58 | Bb4:1.5@0.6 Ab4:.5@0.56 G4:2@0.58 | G#4:1.75@0.62! _:.25 A4:3.5@0.62 _:.5 G4:1@0.58 E4:.75@0.55',
      { legato: true });
    hn.play(B(33), 'D4:1 E4:1! F4:2 G4:2 E4:1.5', { legato: true, vel: 0.56, shape: (u) => 1 - 0.3 * u });
    hn.note(B(35), 4, ['A3', 'D4'], 0.25, { expr: 'fade' });             // re-tongued after a quaver rest
    // piano: the arrival chord (struck, f), a quaver ostinato of chord tones an octave ABOVE the counter (between
    // the violins' two octaves), the bass in octaves
    const ost = (bar, beat, notes, vel) => {
      notes.forEach((p, k) => L(bar, beat + k * 0.5, 0.45, p, vel * (k === 0 ? 1.06 : k % 2 ? 0.8 : 0.92)));
      ped(B(bar, beat), B(bar, beat + notes.length * 0.5));
    };
    pa.chord(B(29), 2, ['Bb2', 'F3', 'Bb3', 'D4', 'F4'], 0.24, { strum: 0.05 });
    ped(B(29), B(29, 2));
    ost(29, 2, ['F5', 'Bb5'], 0.17); ost(29, 3, ['Eb5', 'G5', 'Bb5', 'G5'], 0.18);
    // 30: Eb, then G MINOR (the tune's D6 is its 5th: Eb -> D resolves like b6 -> 5)
    ost(30, 1, ['Eb5', 'G5', 'Bb5', 'G5'], 0.18); ost(30, 3, ['D5', 'G5', 'Bb5', 'G5'], 0.18);
    ost(31, 1, ['D5', 'F5', 'G#5', 'F5'], 0.18); ost(31, 3, ['D5', 'F5', 'A5', 'F5'], 0.17);
    ost(32, 1, ['D5', 'E5', 'A5', 'E5'], 0.17); ost(32, 3, ['C#5', 'E5', 'G5', 'E5'], 0.17);
    ost(33, 1, ['D5', 'F5', 'A5', 'F5'], 0.18); ost(33, 3, ['A4', 'D5', 'A5', 'D5'], 0.16);
    L(30, 1, 1.9, ['Eb2', 'Eb3'], 0.25); L(30, 3, 1.9, ['G2', 'G3'], 0.24);
    L(31, 1, 1.9, ['Bb2', 'Bb3'], 0.24); L(31, 3, 1.9, ['A2', 'A3'], 0.24);
    L(32, 1, 3.9, ['A2', 'A3'], 0.24);
    L(33, 1, 1.9, ['D2', 'D3'], 0.24); L(33, 3, 1.9, ['C2', 'C3'], 0.22);
    pa.chord(B(34), 2, ['Bb2', 'G3', 'D4', 'E4'], 0.2, { strum: 0.025 }); ped(B(34), B(34, 3));
    pa.chord(B(34, 3), 2, ['A2', 'G3', 'C#4', 'E4'], 0.18, { strum: -0.035 }); ped(B(34, 3), B(35));
    // timpani: the arrival, then the German sixth and the dominant on 1 and 3, a short roll into bar 33
    timp.note(B(29), 2, 'Bb2', 0.42);
    timp.note(B(31), 2, 'Bb2', 0.4); timp.note(B(31, 3), 2, 'A2', 0.41);
    timp.note(B(32), 2, 'A2', 0.38); timp.note(B(32, 3), 1, 'A2', 0.39);
    timp.roll(B(32, 4), 1, 'A2', { from: 0.18, to: 0.38, rate: 12 });
    timp.note(B(33), 2, 'D3', 0.45);

    // =========================================================================================================
    // E  bars 35-40: release over a tonic pedal (35-38), the head's sixth and fall in the violas (A F E D C), the
    // pedal lifts at 39 (C#dim7 over Bb, then A7): the return of bar 41 is a cadence.
    // =========================================================================================================
    cb.note(B(35), 16, 'D2', 0.4, { expr: [[0, 1], [1, 0.62]] });
    cb.play(B(39), 'Bb1:4 A1:4 D2:3', { legato: true, vel: 0.32, expr: ARC_VC });
    vc.note(B(35), 16, 'D3', 0.44, { expr: [[0, 1], [0.6, 0.8], [1, 0.66]] });
    vc.play(B(39), 'Bb2:4 A2:4', { legato: true, vel: 0.38, expr: ARC_VC });
    v1h.note(B(35), 6, 'D6', 0.28, { expr: 'fade' });
    v2.play(B(35), 'F5:1.5', { legato: true, vel: 0.3, expr: 'fade' });  // violins II: E -> F, fading out of the climax
    vat.note(B(35), 3, ['A3', 'D4'], 0.17, { expr: 'fade' });             // the tremolo fades instead of stopping
    // muted violins II: G (iv), then B natural (the Dorian IV), G (5th of C), E into the dim7 and A7; they and
    // pp horns accompany the cello's high register (37-38), so it is never left alone up there
    v2.play(B(36), 'G4:4 | B4:4 | G4:4', { legato: true, vel: 0.26, expr: ARC_IN, ...SORD });
    v2.note(B(39), 8, 'E4', 0.24, { expr: [[0, 0.8], [0.5, 1], [1, 0.7]], ...SORD });
    hn.play(B(37), 'G3:4 | G3:2 E4:2', { legato: true, vel: 0.24, expr: [[0, 0.7], [0.5, 1], [1, 0.8]] });
    // violas: diatonic and motivic, the head's rising sixth and its fall (A F E D C), the one chromatic step
    // (C -> C#) only as the pedal lifts (39)
    va.play(B(35), 'p A3:4 | F4:4 | E4:2 D4:2 | C4:4 | C#4:8! | D4:3',
      { legato: true, vel: 0.4, expr: ARC_VA, shape: (u) => 0.72 + 0.4 * Math.sin(Math.PI * u), ...SORD });
    // the solo: x inverted (F E F), x (Bb A), a breath, the rising fourth to D5 against the violas' fall E D,
    // a descent E D C Bb over their C, Bb tied into the dim7, A G over A7 resolving to F on bar 41;
    // then the head (bars 41-42, an octave below the piano's) and the falling-sixth answer (44).
    // Velocity follows the phrase (one arc 35-40, a smaller one 41-44); long notes swell, short ones are flat.
    const soloVel = (b) => {
      if (b < B(41)) { const u = (b - B(35)) / (B(41) - B(35)); return 0.36 + 0.13 * Math.sin(Math.PI * Math.min(1, u * 1.3)); }
      const u = (b - B(41)) / (B(45) - B(41)); return 0.42 + 0.08 * Math.sin(Math.PI * u);
    };
    const SWELL = [[0, 0.78], [0.55, 1], [1, 0.86]], EVEN = [[0, 0.97], [1, 1]];
    const sl = (beat, list) => {
      let b = beat;
      for (const [p, d, o] of list) {
        const len = parseFloat(d);
        if (p === '_') { b += len; continue; }                             // a breath
        solo.play(b, `${p}:${d}`, { legato: true, vel: soloVel(b), expr: len >= 2 ? SWELL : EVEN, ...o });
        b += len;
      }
      return b;
    };
    const STEP = { glideTime: 0.035 };
    // two breaths: a quaver before the D5 of bar 37, and a quaver before the head returns (bar 41 beat 2)
    sl(B(35), [['F4', '3'], ['E4', '.5', STEP], ['F4', '.5', STEP],
      ['G4', '2', STEP], ['Bb4', '1.5'], ['A4', '1', STEP], ['_', '.5'],
      ['D5', '3'],
      ['E5', '1', STEP], ['D5', '1', STEP], ['C5', '1', STEP], ['Bb4', '3', STEP],
      ['G4', '1'], ['E4', '1'],
      ['A4', '2'], ['G4', '2', STEP],
      ['F4', '.5', STEP], ['_', '.5'], ['A3', '.5'], ['Bb3', '1.5!', STEP], ['A3', '.5', STEP], ['F4', '1.5'],
      ['E4', '.5', STEP], ['D4', '1.5!', STEP], ['C#4', '1', STEP],
      ['Bb3', '1'], ['D4', '.5'], ['E4', '.5', STEP], ['F4', '1.5!', STEP], ['E4', '.5', STEP],
      ['G4', '1'], ['Bb3', '2!'], ['A3', '1', STEP]]);
    // one strike of the open fifth, held under the pedal (35-38); the octaves of the lifted bass (39, 40)
    L(35, 1, 15.5, ['D2', 'A2'], 0.2);                                   // soft: the solo cello's entry is clear
    ped(B(35), B(39));
    L(39, 1, 3.9, ['Bb1', 'Bb2'], 0.2); ped(B(39), B(40));
    L(40, 1, 3.9, ['A1', 'A2'], 0.2); L(40, 2, 2.9, ['E4', 'G4'], 0.15); ped(B(40), B(41));
    cel.play(B(40, 3), 'pp A5:.5 Bb5:.5! A5:1', {});                     // x as the b9 of A7: the head is coming

    // =========================================================================================================
    // A' bars 41-48: the head in the solo cello (41-44) under a piano halo, then muted violins I: bII, VI,
    // German -> French sixth, a bare A with the top line on E5, into bar 1.
    // =========================================================================================================
    // celesta only on the held notes of the cello's tune, two octaves up
    cel.note(B(41, 3), 1, 'Bb5', 0.3); cel.note(B(41, 4.5), 1.5, 'F6', 0.28);
    cel.note(B(42, 2.5), 1.5, 'D6', 0.28); cel.note(B(43, 3), 1.5, 'F6', 0.26); cel.note(B(44, 2), 2, 'Bb5', 0.27, { tag: 'tension' });
    // muted violins I: A G F | D-Eb (the climax cell) G | F G G# (the augmented sixth) | A, then E5 (bare fifth)
    v1.play(B(45), 'A5:2 G5:1 F5:1 | D5:1! Eb5:2 G5:1 | F5:1 G5:1 G#5:2! | A5:1',
      { legato: true, vel: 0.5, expr: LEAD, shape: 'arch', shapeAmt: 0.12, ...SORD });
    v1.note(B(48, 2), 3, 'E5', 0.42, { _leg: true, expr: [[0, 1], [0.6, 0.85], [1, 0.62]], ...SORD });
    v2.play(B(45), 'p D5:2 Bb4:6 | D5:4 | A4:4', { legato: true, expr: ARC_IN, ...SORD });
    va.play(B(45), 'p F4:2 D4:2 | G4:2 Eb4:2 | F4:3 E4:5', { legato: true, expr: ARC_VA, ...SORD });
    vc.play(B(41), 'p D3:4 | Bb2:2 A2:2 | G2:4 | G2:2 A2:2 | F2:2 Bb2:2 | Eb2:2 G2:2 | Bb2:4 | A2:4',
      { legato: true, vel: 0.3, expr: ARC_VC, ...SORD, shape: 'dim', shapeAmt: 0.12 });
    // the piano above the cello: dyads on the off-beat, bass on the beat (41-44)
    L(41, 1, 4, 'D3', 0.19); L(41, 1.5, 1.5, ['A4', 'D5'], 0.16); L(41, 3.5, 1.5, ['Bb4', 'D5'], 0.16);
    ped(B(41), B(41, 3)); ped(B(41, 3), B(42));
    L(42, 1, 2, 'Bb2', 0.22); L(42, 1.5, 1.5, 'A4', 0.19, { tag: 'tension' }); L(42, 1.5, 1.5, 'D5', 0.19); L(42, 3, 2, 'A2', 0.22); L(42, 3.5, 1.5, ['E4', 'G4'], 0.17);
    ped(B(42), B(42, 3)); ped(B(42, 3), B(43));
    L(43, 1, 4, 'G2', 0.21); L(43, 1.5, 1.5, ['G4', 'Bb4'], 0.18); L(43, 3.5, 1.5, ['G4', 'D5'], 0.18);
    ped(B(43), B(43, 3)); ped(B(43, 3), B(44));
    L(44, 1, 2, 'G2', 0.21); L(44, 1.5, 1.5, ['Bb4', 'E5'], 0.18); L(44, 3, 2, 'A2', 0.21); L(44, 3.5, 1.5, ['E4', 'G4', 'C#5'], 0.14);
    ped(B(44), B(44, 3)); ped(B(44, 3), B(45));
    // block chords (45-47), the bare fifth (48)
    L(45, 1, 2, 'F2', 0.25); L(45, 1, 1.5, ['A3', 'D4'], 0.2); L(45, 2.5, .5, ['C4'], 0.17);
    L(45, 3, 2, 'Bb2', 0.24); L(45, 3, 1.5, ['G3', 'D4'], 0.19);
    ped(B(45), B(45, 3)); ped(B(45, 3), B(46));
    L(46, 1, 2, 'Eb2', 0.24); L(46, 1, 1.5, ['Bb2', 'G3'], 0.19); L(46, 3, 2, 'G2', 0.23); L(46, 3, 1.5, ['Eb3', 'Bb3', 'G3'], 0.18);
    ped(B(46), B(46, 3)); ped(B(46, 3), B(47));
    L(47, 1, 2, 'Bb2', 0.23); L(47, 1, 1.5, ['F3', 'D4'], 0.18); L(47, 3, 2, ['D4', 'G#4'], 0.16, { tag: 'tension' });
    ped(B(47), B(47, 3)); ped(B(47, 3), B(48));
    L(48, 1, 4, 'A2', 0.23); L(48, 2, 3, 'E3', 0.2); L(48, 3, 2, 'A3', 0.17);
    ped(B(48), B(48, 4)); ped(B(48, 4), B(49));

    s.length(B(49));
  },
};
