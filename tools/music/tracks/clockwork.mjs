// "Clockwork" - the mind at work on a puzzle.     (gate-3 rework: the lift, a motivic build, a contrapuntal arrival)
// node tools/music/render.mjs clockwork
//
// METRE: 7/8 throughout, grouped 2+2+3 (eighths). In the climax the ostinato regroups 3+2+2 (the gears slip
// against each other). Quarter = 96 (a bar = 3.5 quarter beats, about 2.19 s). 78 bars, about 2:52.
// The bar-1 downbeat is placed 55 ms late (a breath over the loop point): the first AAC frame of the file then holds
// only the quiet tail of bar 78, so the codec's first frame does not smear the downbeat.
//
// THE OSTINATO ("the mechanism"): four line notes L0..L3 and three ticks T0..T2.
//   223:  L0 T0 | L1 T1 | L2 L3 T2        322:  L0 T0 L1 | L2 T1 | L3 T2
// Accents: group heads strong, the last tick light. Each 4-bar phrase has its own accent table (seeded), an arc
// of velocity, agogic (heads early, the last tick late: wider in the gentle sections than in the tense ones) and a
// ghosted note now and then: a player, not a step sequencer.
//
// THE MOTIF  x = rising fourth + two steps (A-D-E-F), y = the semitone sigh (F-E, Bb-A, C#-D).
// Signature rhythm (bar 5, celesta):  A:e D:e E:q F:q. | E:e D C# D Bb:q A:e
// The motif's RHYTHM is developed, not only its pitches:
//   - B theme (9-20): the cello's 2+2+3 / 4+3 version.
//   - C canon: quarters with the head tied over the barline; the COUNTERSUBJECT is the tail (D-C#-D-Bb-A) in even
//     eighths and a quarter; the INVERSION (A-E-D-C, a falling fourth) replaces two head entries; the cello's
//     counter-lines in 24 and 27 regroup 3+2+2.
//   - D stretto: entries in quarters a minor third apart, the fourth one (bar 42) in DIMINUTION (eighths).
//   - 45-46: the violins syncopated against the 3+2+2 regrouping (2+2+2+1 eighths, tied over the group heads).
//   - 48: the horn answers the violins' held C6 with the head in its signature rhythm (Bb-Eb-F-G).
//   - 49-50: a running eighth-note countermelody (marimba; violins 2 bow its structural notes) against the theme.
//   - 51-53: the motif's turn (D-C#-D) in the 2+2+3 rhythm, sequenced up by semitones (A, Bb, B).
//   - 54: a stretto of the altered head (fourth, semitone, tone) on A7b9, entries two eighths apart.
//   - 55-58: the ARRIVAL is the bar-5 motif in true AUGMENTATION (x2): A:2e D:2e E:4e F:6e | E:2e D C# D:2e Bb:4e A:2e,
//     so the E and the D are tied over the barline (syncopated against the metre); its top reaches F6 and the G6 apex,
//     both heard nowhere else in the violins.
//
// FORM AND HARMONY (bar: harmony)
//   A "Mechanism" 1-8 (gentle)
//    1 Dm | 2 Dm (V7 neighbour line) | 3 Dm7 | 4 Bbmaj7#11 | 5 Dm (celesta motif, flute an octave below) | 6 A7
//    7 Gm9 (harp arpeggio, not motivic) | 8 A7.  A muted pad (violins 2, violas) carries the harmony on a phone.
//   B Theme 9-20 (gentle) - solo cello over a muted viola pad, a muted celli section under the soloist
//    9 Dm | 10 Gm7-6 | 11 A7sus4-3 | Dm | 12 Gm6 | A7sus4 (e2, the cello's Bb3 becomes a b9 appoggiatura) | A (e4)
//   13 F | 14 Gm7 | 15 C7sus4-3 | F | 16 Bbm | C7 (e2: the cello's Db-C is b6-5 over iv-V) | 17 Dm | A7sus4 | 18 Gm7/Bb
//   19 D pedal: the chromatic line hidden in the violas (A-G#-G-F#) | 20 Eb/G (Neapolitan bII6) | A7
//   C Canon 21-30 (development): two real voices. Head entries only at 21 (cello), 22 (solo violin, at the 12th),
//   26 (muted violins) and 28 (solo violin); the voice that has just stated the head plays the countersubject.
//   21 Bbmaj7#11 | 22 Am (6-5 suspension) | F | 23 E7sus4-E7 | 24 Am | Dm/F | 25 F | Bb (cello: INVERSION A-E-D-C)
//   26 Dm7 | Bb (cello countersubject D-C#-D-Bb-A under the violins' head) | 27 F/A | Gm7 (cello: inversion F-C-Bb-A,
//   violins' countersubject) | 28 Dm7 | F (violin head in F) | 29 E°7 (violin countersubject) | 30 A7 -> 31 Dm
//   D Gears 31-46 (tension)
//   31 Dm (low gears alone) | 32 Dm(V) | 33 Ebm over a D pedal | 34 Dm | 35 Bbm | 36 F#m | 37 Dm (hexatonic cycle,
//   tremolo from 35) | 38 A7b9 | 39-42 octatonic stretto, the bass falling D B Ab F: 39 Dm(b9) | 40 B7b9 | 41 Ab7#11 |
//   42 Ab7b5 | F7b9 (e4: the diminution; the bass reaches F under its C) | 43 Bb/F | 44 Gb/F | 45 F | 46 F7b9
//   E Climax 47-58. ONE arrival (55); 47 is a lift, not a second arrival (strings only, no horns, harp chord or drums)
//   47 Bb (ROOT POSITION: the bass resolves V-I) | 48 Eb6 | F7sus4 | 49 Cm7 | Bb/D | 50 Ebm | A7
//   51-54 a rising bass into the dominant: 51 Dm/F | 52 Em7b5/G | 53 G#dim7 | 54 A7b9 (stretto; a short timpani roll,
//   no cymbal)
//   55-58 THE ARRIVAL: 55 Dm(9) | 56 C - C7sus4 | 57 C7/Bb - Gm/Bb - E°7/Bb | 58 A7sus4(b9) - A7b9, the bass
//   falling D-C-Bb-A; violins 2 in thirds and sixths, the horns in thirds against the melody, violas and upper celli
//   a quarter-note countermelody, the 3+2+2 gears ticking underneath
//   F Release 59-68: 59 Dm | 60 Bbmaj7 | 61 Gm7 | 62 Em7b5 | A7 | 63 Bbmaj7 (DECEPTIVE) | 64 Dm6 (dorian lift)
//   65 G/D | 66 Fmaj7 | 67 Gm7 | 68 A7sus4 | A7 (the delayed dominant)
//   G Return 69-78 (gentle) - a reminiscence, not a recap
//   69 Dm (pizz violins, a muted pad under them) | 70 Dm(V) | 71 Bb/D | 72 Gm6 (solo cello: the augmented head only)
//   73 Fmaj7 | 74 Dm9 (felt piano: C-F-G-A, then a held F-E sigh) | 75 Bbmaj7#11 | 76 Gm6 | 77 Dm/F | 78 A7sus4/E | A7
//   -> bar 1 Dm. The bass falls Bb G F E and then cadences V-i across the loop point; the violas' falling
//   tetrachord A-G-F-E resolves on D at bar 1, the violins' G resolves on F.

import { n, parsePhrase, phraseShape } from '../engine.mjs';

const BPM = 96;

export default {
  id: 'clockwork',
  title: 'Clockwork',
  bpm: BPM,
  loop: true,

  build(s) {
    s.meter(7, 8);
    s.reverb('hall');
    s.delay({ beats: 0.75, feedback: 0.28 });
    s.master({ lufs: -16 });
    s.humanize = { time: 0.007, vel: 0.05 };

    const EI = 0.5; // an eighth in quarter beats
    const at = (bar, e = 0) => s.bar(bar) + e * EI;
    const LAST = 78;

    // ---------------------------------------------------------------- tempo (rubato only at the real joints)
    // the loop leaves bar 78 at 92 and bar 1 eases back up to 96: no jump at the wrap
    s.tempo(at(1), 92); s.accel(at(1), at(3), BPM);
    s.rit(at(8, 4), at(9), 89); s.tempo(at(9), BPM);
    s.rit(at(20, 3), at(21), 86); s.tempo(at(21), BPM);
    s.rit(at(30, 4), at(31), 92); s.tempo(at(31), BPM);
    s.accel(at(39), at(47), 102);
    s.tempo(at(51), 102);
    s.rit(at(54), at(55), 92); s.tempo(at(55), 94);
    s.rit(at(58, 3), at(59), 88); s.tempo(at(59), 90);
    s.rit(at(68), at(69), 88); s.tempo(at(69), BPM);
    s.rit(at(LAST, 2), at(LAST + 1), 92);

    // ---------------------------------------------------------------- mixer
    // depth: the leads (solo cello, solo violin, flute) sit 3-4 dB drier than the string pads behind them
    // marimba: its home register (D4-A4) boxes up the bookends at 300-600 Hz; a dip there and a little air on top
    // and the mallet attack (1.8 kHz and up) brought forward, so that a phone speaker hears the mechanism, not a knock
    const marB = s.bus('marimba', { gain: -4, pan: -0.05, reverb: 0.26, room: 0.1, width: 1.2, eq: [{ type: 'peak', f: 400, q: 1, gain: -2 }, { type: 'peak', f: 1800, q: 0.8, gain: 5 }, { type: 'hs', f: 3000, gain: 3 }] });
    // the harp is a bass instrument here: its 150-300 Hz body is cut so that it does not own the low mids
    const harpB = s.bus('harp', { gain: -6, pan: -0.3, reverb: 0.34, eq: [{ type: 'hp', f: 50 }, { type: 'ls', f: 220, gain: -4 }, { type: 'peak', f: 260, q: 1, gain: -2 }] });
    const pzHiB = s.bus('pizzHi', { gain: -8, pan: -0.35, reverb: 0.3 });
    // the low pizzicato: nothing below 55 Hz (a phone cannot play it, earbuds hear it as boom)
    const pzLoB = s.bus('pizzLo', { gain: -5, pan: 0.16, reverb: 0.22, eq: [{ type: 'hp', f: 55 }] });
    // celesta: its top octave is softened (no music-box sparkle announcing the restart of the loop)
    const celB = s.bus('celesta', { gain: -10, pan: 0.4, reverb: 0.4, delay: 0.12, eq: [{ type: 'hs', f: 5000, gain: -4 }] });
    const vcB = s.bus('soloCello', { gain: -7, pan: 0.12, reverb: 0.26, room: 0.1, eq: [{ type: 'peak', f: 885, q: 6, gain: -2 }, { type: 'peak', f: 1600, q: 1, gain: 2 }] });
    // solo violin: the presence band is taken down so that the canon is not the brightest passage outside the climax
    const vnB = s.bus('soloViolin', { gain: -7, pan: -0.16, reverb: 0.28, room: 0.08, eq: [{ type: 'peak', f: 2600, q: 1.1, gain: -3 }, { type: 'hs', f: 4000, gain: -3 }] });
    const flB = s.bus('flute', { gain: -9, pan: 0.2, reverb: 0.32 });
    const pnoB = s.bus('piano', { gain: -5, pan: 0.05, reverb: 0.3, room: 0.12 });
    const vln1B = s.bus('violins', { gain: -9, pan: -0.5, reverb: 0.34, eq: [{ type: 'peak', f: 1000, q: 1, gain: 1.5 }, { type: 'peak', f: 3200, q: 1.2, gain: -2 }, { type: 'hs', f: 4500, gain: -2 }] });
    const vln2B = s.bus('violins2', { gain: -10, pan: -0.1, reverb: 0.46 });
    const vlaB = s.bus('violas', { gain: -9, pan: 0.1, reverb: 0.46 });
    const vcsB = s.bus('celli', { gain: -8, pan: 0.45, reverb: 0.36 });
    // basses: a floor, not a boom (the celli carry the weight a phone hears)
    const cbB = s.bus('basses', { gain: -9, pan: 0.15, reverb: 0.22, eq: [{ type: 'hp', f: 45 }, { type: 'ls', f: 80, gain: -3 }] });
    // horns: their F3/C4 body piles up at 150-300 Hz in the build (bar 46)
    const hnB = s.bus('horns', { gain: -8, pan: -0.08, reverb: 0.38, eq: [{ type: 'peak', f: 210, q: 1, gain: -3 }] });
    const tmpB = s.bus('perc', { gain: -12, reverb: 0.3, eq: [{ type: 'hp', f: 45 }] });
    const fxB = s.bus('fx', { gain: -13, reverb: 0.42 });

    const mar = s.part(marB, 'marimba', { humanize: { time: 0.010, vel: 0.06 } });
    const harp = s.part(harpB, 'harp');
    const pzHi = s.part(pzHiB, 'stringsPizzicato', { section: 'violins', humanize: { time: 0.008, vel: 0.06 } });
    const pzVc = s.part(pzLoB, 'stringsPizzicato', { section: 'celli' });
    const pzCb = s.part(pzLoB, 'contrabassPizz');
    const cel = s.part(celB, 'celesta');
    const cello = s.part(vcB, 'soloCello', { humanize: { time: 0.012, vel: 0.04 } });
    const violin = s.part(vnB, 'soloViolin', { humanize: { time: 0.012, vel: 0.04 } });
    const flute = s.part(flB, 'flutePad');
    const piano = s.part(pnoB, 'feltPiano', { hardness: 0.3 });
    const vln1 = s.part(vln1B, 'stringsEnsemble', { section: 'violins' });
    const vln2 = s.part(vln2B, 'stringsEnsemble', { section: 'violins2' });
    const trem = s.part(vln2B, 'stringsTremolo', { section: 'violins2' });
    const vla = s.part(vlaB, 'stringsEnsemble', { section: 'violas' });
    const vcs = s.part(vcsB, 'stringsEnsemble', { section: 'celli' });
    const cbs = s.part(cbB, 'contrabass');
    const horn = s.part(hnB, 'warmHorn');
    const timp = s.part(tmpB, 'timpani');
    const cym = s.part(fxB, 'cymbalSwell');

    // ---------------------------------------------------------------- helpers
    // sing(): a legato line phrased like a player. The phrase gets one dynamic arc (velocity), and only the long or
    // leaning notes swell; short notes keep an almost flat expression. Touching calls still join into one bow.
    const SWELL = [[0, 0.8], [0.45, 1], [1, 0.88]];
    const PHR = (u) => 0.78 + 0.34 * Math.sin(Math.PI * Math.min(1, 0.1 + u * 0.85));
    const EVEN = [[0, 0.95], [1, 1]];
    const PAD = [[0, 0.88], [0.5, 1], [1, 0.93]];
    const BACK = [[0, 0.95], [0.25, 0.7], [1, 0.6]]; // a held note that steps back for the other voice
    function sing(part, beat, phrase, o = {}) {
      const evs = parsePhrase(phrase);
      const total = evs.beats;
      const sh = phraseShape(o.shape ?? 'arch', o.shapeAmt ?? 0.3);
      const base = o.vel ?? 0.5, tr = o.transpose ?? 0, longAt = o.longAt ?? 1.5;
      for (const e of evs) {
        let v = (e.vel ?? base) * sh(total > 0 ? e.at / total : 0);
        if (e.accent) v += 0.1;
        const expr = o.expr ?? (e.dur >= longAt || e.tension ? (o.longExpr ?? SWELL) : (o.shortExpr ?? EVEN));
        const opts = { ...(o.opts || {}), _leg: true, expr };
        if (e.tension) opts.tag = 'tension';
        for (const p of e.pitches) part.note(beat + e.at, e.dur, p + tr, Math.min(1, v), opts);
      }
      return beat + total;
    }

    // Ostinato bar. L = 4 line notes, T = tick (one pitch or three), mask = which of the 7 eighths sound.
    const SEQ = {
      223: [['L', 0], ['T', 0], ['L', 1], ['T', 1], ['L', 2], ['L', 3], ['T', 2]],
      322: [['L', 0], ['T', 0], ['L', 1], ['L', 2], ['T', 1], ['L', 3], ['T', 2]],
    };
    const ACC = { 223: [1, 0.62, 0.86, 0.62, 0.95, 0.74, 0.56], 322: [1, 0.62, 0.74, 0.92, 0.62, 0.88, 0.6] };
    const HEADS = { 223: [0, 2, 4], 322: [0, 3, 5] };
    // a player's accent table per 4-bar phrase (seeded), shared by every part in that phrase
    const accR = s.rng('ostinato-accents');
    const accCache = new Map();
    const accFor = (g, bar) => {
      const k = g + ':' + Math.floor((bar - 1) / 4);
      if (!accCache.has(k)) accCache.set(k, ACC[g].map((a) => a + (accR() - 0.5) * 0.12));
      return accCache.get(k);
    };
    const ARC4 = [0.9, 1.0, 1.05, 0.92]; // velocity arc over a 4-bar phrase
    const BEAT_PER_SEC = BPM / 60;
    function osti(part, bar, L, T, o = {}) {
      const Ls = L.split(/\s+/), Ts = Array.isArray(T) ? T : [T, T, T];
      const g = o.group || '223';
      const seq = SEQ[g], acc = accFor(g, bar), heads = HEADS[g];
      const mask = o.mask || 'xxxxxxx';
      const tr = (o.tr || 0) + 12 * (o.oct || 0);
      // agogic: free in the gentle sections, tight in the gears (31-58)
      const ag = bar >= 31 && bar <= 58 ? 0.5 : 1;
      for (let e = 0; e < 7; e++) {
        if (mask[e] !== 'x') continue;
        const [k, i] = seq[e];
        const p = k === 'L' ? Ls[i] : Ts[i];
        if (!p || p === '_') continue;
        let v = (o.vel ?? 0.5) * acc[e] * ARC4[(bar - 1) % 4];
        if (o.shape) v *= o.shape(e / 6);
        // a ghosted tick every fourth bar, and the inner note of the 3-group leans back every other phrase
        if (bar % 4 === 2 && e === 6) v *= 0.6;
        if (bar % 8 === 0 && g === '223' && e === 5) v *= 0.6;
        // group heads a little early, the last tick late (it leans into the next downbeat)
        const shift = (heads.includes(e) ? -0.006 : e === 6 ? 0.012 : 0) * ag * BEAT_PER_SEC;
        const tag = o.tagAll || (o.tagSet && o.tagSet.has(p)) ? 'tension' : undefined;
        const opts = o.opts || tag ? { ...(o.opts || {}), ...(tag ? { tag } : {}) } : undefined;
        part.note(at(bar, e) + shift, o.dur ?? 0.5, n(p) + tr, Math.min(1, v), opts);
      }
    }
    // Bass notes written as 'D3@0 A2@4' (eighth positions).
    const parseBass = (str) => (str || '').split(/\s+/).filter(Boolean).map((t) => { const [p, e] = t.split('@'); return [n(p), Number(e)]; });
    function bassLine(part, bar, str, vel, o = {}) {
      const list = parseBass(str);
      list.forEach(([m, e], i) => {
        const next = i + 1 < list.length ? list[i + 1][1] : 7;
        let p = m + 12 * (o.oct || 0);
        if (o.min != null) while (p < o.min) p += 12;
        if (o.max != null) while (p > o.max) p -= 12;
        const gap = next - e;
        const opts = o.dur != null && gap < o.dur ? { ...(o.opts || {}), damp: true } : o.opts;
        part.note(at(bar, e), Math.min(o.dur ?? gap, gap) * EI, p, vel * (i === 0 ? 1 : 0.85), opts);
      });
    }
    // Dynamic level per bar (piecewise linear): the arc of the whole piece. The build is held back so the
    // arrival (55-56) is the loudest moment and the bookends stay close to it.
    const DYN = [[1, 0.42], [8, 0.46], [9, 0.44], [20, 0.48], [21, 0.46], [30, 0.52], [31, 0.56], [38, 0.61], [42, 0.63],
      [46, 0.66], [47, 0.6], [48, 0.6], [50, 0.62], [51, 0.64], [53, 0.68], [54, 0.7], [55, 0.78], [56, 0.78], [57, 0.72],
      [58, 0.6], [59, 0.48], [68, 0.4], [69, 0.42], [LAST, 0.4]];
    const dyn = (bar) => {
      for (let i = 1; i < DYN.length; i++) if (bar <= DYN[i][0]) {
        const [b0, v0] = DYN[i - 1], [b1, v1] = DYN[i];
        return b1 === b0 ? v1 : v0 + ((v1 - v0) * (bar - b0)) / (b1 - b0);
      }
      return DYN[DYN.length - 1][1];
    };

    // ---------------------------------------------------------------- the harmonic table (ostinato + bass)
    // bar: [L, T, bass]. L/T for the ostinato in its home register, bass = lowest sounding notes with positions.
    const H = {
      1: ['D4 E4 F4 G4', 'A4', 'D3@0 A2@4'],
      2: ['G4 F4 E4 C#4', 'A4', 'D3@0 A2@4'],
      // bar 3: the line turns downwards (F-E-D-C over Dm7), so the bookend figure is not heard four times as it was
      3: ['F4 E4 D4 C4', 'C5', 'D3@0 C3@4'],
      4: ['D4 E4 F4 E4', 'A4', 'Bb2@0 F3@4'],
      5: ['D4 E4 F4 G4', 'D5', 'D3@0 A2@4'],
      6: ['G4 F4 E4 C#4', 'E5', 'A2@0 E3@4'],
      7: ['_ _ _ _', '_', 'G2@0 D3@4'],
      8: ['_ _ _ _', ['E4', 'G4', 'C#5'], 'A2@0 E3@4'],
      // theme: the ostinato line moves up an octave and runs against the cello, line notes only
      9: ['A5 F5 E5 D5', 'A5', 'D3@0 A2@4'],
      10: ['Bb4 D5 G5 E5', 'Bb5', 'G2@0 D3@4'],
      11: ['E5 G5 D5 F5', 'A5', 'A2@0 D3@4'],
      12: ['E5 D5 C#5 E5', 'A5', 'G2@0 A2@2'],
      13: ['F5 A4 E5 C5', 'A5', 'F2@0 C3@4'],
      14: ['D5 Bb4 F5 D5', 'G5', 'G2@0 D3@4'],
      15: ['C5 Bb4 A4 F5', 'E5', 'C3@0 F2@4'],
      // bar 16: Bbm - C7 (iv - V in F): the cello's Db-C is the b6-5 sigh, in contrary motion to the bass as in bar 12
      16: ['Ab4 F5 E5 Bb4', 'C5', 'Bb2@0 C3@2'],
      17: ['F5 D5 E5 C#5', 'A5', 'D3@0 A2@4'],
      18: ['Bb4 D5 G5 D5', 'Bb5', 'Bb2@0 D3@4'],
      19: ['_ _ _ _', 'A5', 'D3@0 D3@4'],
      20: ['G5 Eb5 C#5 E5', 'G5', 'G2@0 A2@4'],
      // canon: ticks follow the harmony; the bass is written low (harp lifted to G2 and up, basses below)
      21: ['', 'A5', 'Bb2@2 D3@4'],
      22: ['', ['A5', 'E5', 'C5'], 'A2@0 F2@4'],
      23: ['', ['E5', 'E5', 'D5'], 'E2@0 E2@4'],
      24: ['', ['E5', 'E5', 'D5'], 'A2@0 F2@4'],
      25: ['', ['C5', 'C5', 'D5'], 'F2@0 Bb2@4'],
      26: ['', ['A4', 'D5', 'F5'], 'D2@0 Bb1@4'],
      27: ['', ['F5', 'F5', 'D5'], 'A2@0 G2@4'],
      28: ['', ['F5', 'F5', 'C5'], 'D2@0 F2@4'],
      29: ['', ['Bb4', 'Bb4', 'Db5'], 'E2@0 G2@4'],
      30: ['', ['G5', 'E5', 'C#5'], 'A2@0 E2@4'],
      // tension
      31: ['D3 E3 F3 G3', 'A2', 'D2@0 A2@4'],
      32: ['G4 F4 E4 C#4', 'A4', 'D2@0 A2@4'],
      33: ['Eb4 F4 Gb4 Ab4', 'Bb4', 'D2@0 D2@4'],
      34: ['F4 E4 D4 C#4', 'D5', 'D2@0 A2@4'],
      35: ['Bb3 C4 Db4 Eb4', 'F4', 'Bb1@0 F2@4'],
      36: ['F#4 G#4 A4 B4', 'C#5', 'F#2@0 C#3@4'],
      37: ['D4 E4 F4 G4', 'D5', 'D2@0 A2@4'],
      38: ['E4 G4 Bb4 C#5', 'E5', 'A1@0 A2@4'],
      39: ['D4 Eb4 F4 F#4', 'A4', 'D2@0 D2@4'],
      40: ['D#4 F#4 G#4 A4', 'C5', 'B1@0 B1@4'],
      41: ['G#4 A4 B4 C5', 'Eb5', 'Ab1@0 Ab1@4'],
      // bar 42: the bass stays on Ab under the F# entry (Ab7b5) and reaches F only under its C5 (e4)
      42: ['_ _ _ _', 'F#5', 'Ab1@0 F1@4'],
      43: ['D5 Bb4 C5 A4', 'F5', 'F1@0 F1@4'],
      44: ['Db5 Bb4 C5 A4', ['Gb5', 'Gb5', 'F5'], 'F1@0 F1@4'],
      45: ['G4 Bb4 A4 C5', 'F5', 'F1@0 F1@3 F1@5'],
      46: ['A4 C5 Eb5 F5', 'Gb5', 'F1@0 F1@3 F1@5'],
      // climax (3+2+2): 47 resolves to a root-position Bb, then the bass moves every bar
      47: ['Bb4 D5 C5 D5', 'F5', 'Bb1@0 Bb1@3 Bb1@5'],
      48: ['C5 Eb5 C5 Bb4', ['G5', 'F5', 'F5'], 'Eb2@0 Eb2@3 F2@5'],
      49: ['G4 C5 Bb4 D5', ['Eb5', 'F5', 'F5'], 'C2@0 D2@3 D2@5'],
      50: ['Gb4 Bb4 C#5 E5', ['Eb5', 'G5', 'G5'], 'Eb2@0 A1@3 A1@5'],
      // 51-54: the bass rises F G G# A; the marimba plays only the group heads (e0 e3 e5)
      51: ['D5 _ F5 A5', '_', 'F1@0 F1@3 F1@5'],
      52: ['E5 _ G5 Bb5', '_', 'G1@0 G1@3 G1@5'],
      53: ['B4 _ D5 F5', '_', 'G#1@0 G#1@3 G#1@5'],
      54: ['C#5 _ E5 G5', '_', 'A1@0 A1@3 A1@5'],
      // 55-58: the 3+2+2 ticks keep turning under the arrival (e1 e4 e6)
      55: ['', ['A5', 'F5', 'E5'], 'D2@0 D2@4'],
      56: ['', ['C5', 'G5', 'G5'], 'C2@0 C2@4'],
      57: ['', ['G5', 'E5', 'C#5'], 'Bb1@0 Bb1@4'],
      58: ['', ['E5', 'G5', 'C#5'], 'A1@0 A1@4'],
      // release
      59: ['', '', 'D3@0 A2@4'],
      60: ['', '', 'Bb2@0 F3@4'],
      61: ['', '', 'G2@0 D3@4'],
      62: ['', '', 'E2@0 A2@4'],
      63: ['', '', 'Bb2@0 F3@4'],
      64: ['D4 A4 B4 F4', 'A4', 'D3@0 A2@4'],
      65: ['D4 G4 B4 G4', 'D5', 'D3@0 D3@4'],
      66: ['', '', 'F2@0 C3@4'],
      67: ['', '', 'G2@0 D3@4'],
      68: ['', '', 'A2@0 E3@4'],
      // return
      69: ['D4 E4 F4 G4', 'A4', 'D3@0 A2@4'],
      70: ['G4 F4 E4 C#4', 'A4', 'D3@0 A2@4'],
      71: ['D4 _ F4 _', 'Bb4', 'D3@0 F2@4'],
      72: ['Bb3 _ D4 _', 'G4', 'G2@0 D3@4'],
      73: ['F4 A4 C5 A4', 'C5', 'F2@0 C3@4'],
      74: ['D4 E4 F4 A4', 'C5', 'D3@0 A2@4'],
      75: ['D4 E4 F4 E4', 'A4', 'Bb2@0 F3@4'],
      76: ['D4 E4 G4 E4', 'Bb4', 'G2@0 D3@4'],
      77: ['D4 E4 F4 A4', 'A4', 'F2@0 C3@4'],
      78: ['D4 E4 C#4 E4', ['A4', 'A4', 'G4'], 'E2@0 A2@4'],
    };
    const tagSet = (...ps) => new Set(ps);
    // an upper layer the phone speaker keeps (bookends around the loop point): pizzicato ticks an octave up
    const phoneTicks = (b, vel) => {
      osti(pzHi, b, '_ _ _ _', H[b][1], { vel, oct: 1, mask: '.x.x..x' });
      osti(cel, b, H[b][0], '_', { vel: 0.34, oct: 1, mask: 'x.x.x..' });
    };
    const MUTE = { sordino: true };

    // ================================================================ A "Mechanism" bars 1-8 (gentle)
    s.section('A mechanism', at(1), at(9), 'gentle');
    // bars 3-4: the marimba keeps only the group heads and the pizzicato ticks answer between them (a hocket)
    for (let b = 1; b <= 6; b++) {
      const [L, T] = H[b];
      osti(mar, b, L, T, { vel: b <= 2 ? 0.66 : 0.62, mask: b === 3 || b === 4 ? 'x.x.x..' : 'xxxxxxx' });
    }
    osti(mar, 8, H[8][0], H[8][1], { vel: 0.52, mask: '.x.x..x' });
    for (let b = 1; b <= 4; b++) phoneTicks(b, 0.5);
    // the harp bass is barely there in bar 1 (it continues the end of the loop) and settles from bar 2
    for (let b = 1; b <= 8; b++) bassLine(harp, b, H[b][2], 0.34 * (b === 1 ? 0.62 : b === 2 ? 0.8 : 1), { dur: 3 });
    for (let b = 3; b <= 8; b++) bassLine(pzVc, b, H[b][2].split(' ')[0], 0.42, { dur: 1.2 });
    // bar 1: the violas' falling tetrachord of the return (A G F E) lands on D here, the violins' G on F
    vla.note(at(1), 3.5, 'D3', 0.26, { sordino: true, expr: 'fade' });
    // a muted pad in the phone band, so that a phone hears the harmony and not only the marimba line
    sing(vln2, at(1), 'F5:3.5 | A5:7 | F5:3.5 | A5:7 | G5:3.5 | A5:3.25 _:.25', { vel: 0.3, shape: 'flat', expr: PAD, opts: MUTE });
    sing(vla, at(2), 'F4:2 E4:1.5 | F4:3.5 | D4:7 | E4:3.5 | D4:3.5 | C#4:2 E4:1.25 _:.25', { vel: 0.26, shape: 'flat', expr: PAD, opts: MUTE });
    // the motif in its signature rhythm (celesta), the flute an octave below for the first bar; the harp answers
    // with a plain Gm9 arpeggio (no second statement of the motif)
    cel.play(at(5), "A5:e D6 E6:q F6:q.^ | E6:e D6 C#6 D6 Bb5:q! A5:e", { vel: 0.5, shape: 'arch', shapeAmt: 0.15 });
    sing(flute, at(5), 'A4:.5 D5:.5 E5:1 F5:1.25 _:.25', { vel: 0.3, shapeAmt: 0.1 });
    harp.play(at(7), 'G3:e Bb3 D4 F4 A4:q. | A4:e G4 E4 C#4:q A3:q', { vel: 0.4, shape: 'arch', shapeAmt: 0.15 });

    // ================================================================ B Theme bars 9-20 (gentle)
    s.section('B theme', at(9), at(21), 'gentle');
    // solo cello: the motif augmented into 2+2+3 / 4+3, three 4-bar phrases, each with its own bow and arc
    const CELLO = { vel: 0.4, shape: PHR, opts: { glideTime: 0.06 } };
    const TH1 = 'A3:1 D4:1 E4:1.5 | F4:2 E4:1.5 | D4:1! C#4:1 D4:1.5 | Bb3:2!^ A3:1 _:.5';
    // bar 15: a dotted F-E-F (3+1+3), not a third 2+2+3 in a row
    const TH2 = 'C4:1 F4:1 G4:1.5 | A4:2 G4:1.5 | F4:1.5! E4:.5 F4:1.5 | Db4:2!^ C4:1 _:.5';
    const TH3 = 'A4:1 E4:1 D4:1! C#4:.5 | D4:3.5 | F4:2 E4:2 | Eb4:1.5!^ C#4:1 _:.5';
    sing(cello, at(9), TH1, CELLO);
    sing(cello, at(13), TH2, CELLO);
    sing(cello, at(17), TH3, { ...CELLO, vel: 0.39 });
    // a muted celli section under the soloist: a principal over his section, not a lone synthetic voice
    const SOLI = { vel: 0.4, shape: PHR, expr: PAD, opts: MUTE };
    sing(vcs, at(9), TH1, SOLI);
    sing(vcs, at(13), TH2, SOLI);
    sing(vcs, at(17), TH3, SOLI);
    for (let b = 9; b <= 20; b++) {
      const [L, T, bass] = H[b];
      const tagged = b === 12 ? { tagSet: tagSet('D5') } : b === 16 ? { tagSet: tagSet('F5') } : {};
      // the cadence bars (12, 16, 20) keep the mechanism a little more present: the cello sits low there
      const mvB = b === 16 || b === 20 ? 0.36 : 0.3;
      // bars 12 and 19: ticks only (12: the cello's cadence must not be masked)
      if (b === 19 || b === 12) osti(mar, b, '_ _ _ _', T, { vel: mvB, mask: '.x.x..x' });
      else osti(mar, b, L, T, { vel: mvB, mask: 'x.x.xx.', ...tagged });
      // bar 19: no harp (the chromatic inner voice belongs to the violas; the pizzicato holds the D pedal)
      if (b !== 19) bassLine(harp, b, bass, 0.31, { dur: 3 });
      bassLine(pzVc, b, bass, 0.4, { dur: 1.2, min: 38 });
    }
    // celesta answers in the gaps of the cello's long notes (fragments of cell x)
    cel.play(at(10, 2), 'A6:e E6 D6:q', { vel: 0.3 });
    cel.play(at(12, 4), 'E5:e A5 C#6:e', { vel: 0.28 });
    cel.play(at(14, 2), 'D6:e G6 A6 Bb6:q', { vel: 0.28, shape: 'dim' });
    cel.play(at(18, 1), 'A5:e D6 E6:q F6:q', { vel: 0.32, shape: 'arch' });
    // violas: a muted pad under the bare cello first (9-12, with its own sus4-3 D-C# in the half cadence), then the
    // inner countermelody; in bar 19 the hidden chromatic line A-G#-G-F#, whose F# rises to the G of the Neapolitan
    sing(vla, at(9), 'D3:7 | A3:3.5 | D4:2 C#4:1 _:.5', { vel: 0.28, shape: 'flat', expr: PAD, opts: MUTE });
    sing(vla, at(13), 'C4:3.5 | D4:2 Bb3:1.5 | Bb3:2 A3:1.5 | F3:2 E3:1.5', { vel: 0.38, shapeAmt: 0.25, expr: PAD, opts: MUTE });
    sing(vla, at(17), 'A3:2 G3:1.5 | Bb3:3.5 | A3:1 G#3:1! G3:1 F#3:.5! | G3:3 _:.5', { vel: 0.38, shape: 'cresc', shapeAmt: 0.18, expr: PAD, opts: MUTE });

    // ================================================================ C Canon bars 21-30 (development)
    s.section('C canon', at(21), at(31), 'development');
    // Two equal voices. Subject = the head in quarters, tied over the barline. Countersubject (CS) = the tail as a
    // dotted figure (e. s e e q). Inversion = A-E-D-C. Head entries: 21 cello, 22 violin, 26 muted violins, 28 violin.
    const VC = { vel: 0.33, shapeAmt: 0.2, opts: { glideTime: 0.06 } };
    const VN = { vel: 0.28, shapeAmt: 0.2, opts: { glideTime: 0.06, bright: 0.66 } };
    // cello: subject (21) -> 6-5 suspension -> CS in A minor (C-B-C-A-G#) -> E7 arpeggio -> cadence in A
    // (the countersubject's figure is in even eighths on the bowed solo strings: no sixteenths a soloist would smear;
    // bar 24 regroups 3+2+2 against the 2+2+3 around it)
    sing(cello, at(21), 'A3:1 D4:1 E4:1 F4:1! E4:1 C4:.5 B3:.5 C4:.5 A3:.5 | G#3:1 B3:1 D4:1.5 | C4:1.5 B3:1 A3:1', VC);
    sing(vcs, at(21), 'A3:1 D4:1 E4:1 F4:1! E4:1 C4:.5 B3:.5 C4:.5 A3:.5 | G#3:1 B3:1 D4:1.5 | C4:1.5 B3:1 A3:1', { vel: 0.3, shapeAmt: 0.15, expr: PAD, opts: MUTE });
    //        inversion A-E-D-C (25) -> CS in D minor (D-C#-D-Bb-A) under the violins' head (26)
    sing(cello, at(25), 'A4:1 E4:1 D4:1 C4:1 D4:.5 C#4:.5 D4:.5 Bb3:.5 A3:1!', { ...VC, vel: 0.3 });
    // the muted celli under the cello's inversions and countersubject (a principal over his section)
    sing(vcs, at(25), 'A4:1 E4:1 D4:1 C4:1 D4:.5 C#4:.5 D4:.5 Bb3:.5 A3:1! F4:1.5 C4:1 Bb3:1 A3:1.5', { vel: 0.3, shapeAmt: 0.15, expr: PAD, opts: MUTE });
    //        inversion F-C-Bb-A (27, regrouped 3+2+2 | 3+2+2), then the E°7 arpeggio, A7 -> D
    sing(cello, at(27), 'F4:1.5 C4:1 Bb3:1 A3:1.5 F3:1 C4:1', { ...VC, vel: 0.33, shape: 'dim', shapeAmt: 0.15 });
    sing(cello, at(29), 'G3:1 Bb3:1 Db4:1.5 | E4:1.5 C#4:2', { ...VC, vel: 0.33, shape: 'cresc', shapeAmt: 0.15 });
    cello.note(at(31), 1.5, 'D4', 0.34, { expr: 'dim' });
    // violin: answer at the 12th (E-A-B-C), then its CS (A-G#-A-F-E) over E7, a rest while the others work
    const VN1 = 'E5:1 A5:1 B5:1 C6:1! B5:.5 A5:.5 G#5:.5 A5:.5 F5:.5! E5:2.5';
    //         answer in F (C-F-G-A) over Dm7, its CS over E°7 (Bb-A-Bb-G), and the line into the cadence
    const VN2 = 'C5:1 F5:1 G5:1 A5:1! G5:1 Bb5:.5 A5:.5 Bb5:.5 G5:.5 | A5:1 G5:2.5';
    // the solo violin plays alone (no section in unison with him): two soloists in dialogue
    sing(violin, at(22), VN1, VN);
    sing(violin, at(28), VN2, { ...VN, vel: 0.31 });
    violin.note(at(31), 1.5, 'F5', 0.3, { expr: 'dim' });
    // the third entry belongs to the muted violins (A-D-E-F in D minor), then their CS (D-C#-D-Bb-A); in the low
    // octave, so that the violins' D6-F6 is kept for the climax
    sing(vln1, at(26), 'A4:1 D5:1 E5:1 F5:1! E5:1! D5:.5 C#5:.5 D5:.5 Bb4:.5 A4:1.25 _:.25', { vel: 0.46, shapeAmt: 0.2, longExpr: PAD, opts: MUTE });
    for (let b = 21; b <= 30; b++) {
      const [, T, bass] = H[b];
      osti(pzHi, b, '_ _ _ _', T, { vel: 0.3 * (b >= 27 ? 1.1 : 1), mask: '.x.x..x' });
      // the harp's lowest octave is not a bass on a phone: harp from G2 up, the low octave in damped pizz basses
      bassLine(harp, b, bass, 0.32, { dur: 3, min: 43 });
      bassLine(pzCb, b, bass, 0.28, { dur: 1.2, max: 43 });
      if (b >= 23) bassLine(pzVc, b, bass, 0.28, { dur: 1.2, min: 48 });
    }
    // violas: a quiet muted inner voice that follows the harmony
    sing(vla, at(21), 'D4:3.5 | E4:2 F4:1.5 | E4:3.5 | E4:2 D4:1.5 | C4:2 F4:1.5 | F4:2 D4:1.5 | C4:2 D4:1.5 | F4:3.5 | E4:3.5 | E4:2 G4:1.5',
      { vel: 0.32, shapeAmt: 0.2, expr: PAD, opts: MUTE });

    // ================================================================ D Gears bars 31-46 (tension)
    s.section('D gears', at(31), at(47), 'tension');
    // 31-32: the mechanism in a new guise - low pizzicato celli alone; the marimba joins on the 3-group of bar 32
    osti(pzVc, 31, H[31][0], H[31][1], { vel: 0.7 });
    osti(pzVc, 32, 'G3 F3 E3 C#3', 'A2', { vel: 0.68 });
    osti(mar, 32, H[32][0], H[32][1], { vel: 0.7 * dyn(32) / 0.6, mask: '....xxx' });
    for (let b = 33; b <= 46; b++) {
      const [L, T, bass] = H[b];
      const d = dyn(b);
      const group = b >= 45 ? '322' : '223';
      const OCT_TAGS = { 39: ['Eb4', 'F#4'], 40: ['G#4'], 41: ['G#4', 'B4', 'Eb5'], 42: ['F#5'] };
      const tagged = b === 33 ? { tagAll: true } : OCT_TAGS[b] ? { tagSet: tagSet(...OCT_TAGS[b]) } : b === 44 ? { tagSet: tagSet('Db5', 'Gb5') } : b === 46 ? { tagSet: tagSet('Gb5') } : {};
      const mv = b <= 34 ? 0.7 : b === 39 || b === 40 ? 0.48 : b === 41 || b === 42 ? 0.45 : b === 43 || b === 44 ? 0.46 : b >= 45 ? 0.5 : 0.56;
      // bar 42: the marimba leaves the ostinato for the diminution (below)
      if (b !== 42) osti(mar, b, L, T, { vel: mv * d / 0.6, group, mask: b === 43 || b === 44 ? 'x.x.x.x' : 'xxxxxxx', ...tagged });
      if (b <= 38) {
        // 33-38: the gears double - the pizzicato celli run the whole mechanism an octave down, the marimba adds
        // its low octave on the group heads
        osti(pzVc, b, L, T, { vel: 0.46 * d / 0.6, oct: -1, ...(b === 33 ? { tagSet: tagSet('Eb4') } : tagged) });
        osti(mar, b, L, T, { vel: 0.34 * d / 0.6, oct: -1, mask: 'x.x.x..', ...tagged });
      }
      // pizzicato violins double the ticks in the stretto (39-44), an octave up only while the ticks are low (39-40);
      // from 45 the marimba's 3+2+2 ticks are enough
      if (b >= 39 && b <= 44) osti(pzHi, b, '_ _ _ _', T, { vel: 0.34 * (1 + 0.08 * (b - 39)) * d / 0.6, group, oct: b <= 40 ? 1 : 0, mask: '.x.x..x', ...tagged });
      const lowF = b === 39 || b === 40 ? 0.72 : 1;
      if (b >= 39) {
        // bar 40: no pizzicato B2 under the celli's D#3 (a third below C3); the pizz basses have the B1
        // bar 42: only the F (e4); the Ab is left to the pizz basses (no Ab2 a third under the celli's C3)
        if (b !== 40) bassLine(pzVc, b, b === 42 ? 'F1@4' : bass, 0.5 * lowF * d / 0.6, { dur: 1.2, min: b <= 42 ? 40 : 45 });
      }
      bassLine(pzCb, b, bass, 0.42 * lowF * d / 0.6, { dur: 1.2, max: 43 });
      // low pulse: timpani on the bar (and on every group from 39). Five drums tuned for the passage (D Eb F A Bb):
      // they take the root when it is on a drum, otherwise a chord tone (41 Eb over Ab7), and are silent on the
      // F#m of 36 and the B7b9 of 40; in 42 only the F under the C5 of the diminution (e4)
      const TIMP = { 33: 'D2', 34: 'D2', 35: 'Bb2', 37: 'D2', 38: 'A2', 39: 'D2', 41: 'Eb2', 42: 'F2' };
      const tn = TIMP[b] ? n(TIMP[b]) : b >= 43 ? n('F2') : null;
      if (tn != null) {
        if (b !== 42) timp.note(at(b), 0.75, tn, 0.36 * d / 0.6);
        if (b >= 39) timp.note(at(b, group === '322' ? 3 : 4), 0.5, tn, (b === 46 ? 0.36 : b === 42 ? 0.34 : 0.28) * d / 0.6);
        if (b >= 43) timp.note(at(b, group === '322' ? 5 : 6), 0.5, tn, (b === 46 ? 0.42 : 0.24) * d / 0.6);
      }
    }
    // celli: the pedal that the side-slips pull against, then the semitone voice-leading of the hexatonic cycle
    // (bar 33: the celli rest, so the gears' Eb3 rubs only against the low D2 - a ninth - and not a second at D3)
    sing(vcs, at(31), 'D3:6.75 _:.25 | _:3.5 | D3:3.5 | F3:3.5 | F#3:3.5 | F3:3.5 | E3:3.25 _:.25', { vel: 0.56, shape: 'cresc', shapeAmt: 0.14, expr: PAD });
    vla.note(at(31), 1.5, 'F4', 0.32, { expr: 'dim' });
    // violas peak a bar after the celli (their phrase is offset)
    sing(vla, at(35), 'Db4:3.5 | C#4:3.5 | D4:3.5 | C#4:3.5', { vel: 0.52, shapeAmt: 0.18, shape: (u) => 0.88 + 0.24 * Math.sin(Math.PI * Math.min(1, u * 0.9 + 0.1)), expr: PAD });
    // tremolo from 35: the celli's semitone line an octave up, growing into the stretto
    sing(trem, at(35), 'F4:3.5 | F#4:3.5 | F4:3.5 | E4:3.5', { vel: 0.4, shape: 'cresc', shapeAmt: 0.2, expr: [[0, 0.85], [1, 1]] });
    // violins: low and veiled first, then the top of the cycle (C#6 held as the common tone, D6, the b9 Bb5), and a
    // short soft A5 in bar 39 that makes room for the first stretto entry
    sing(vln1, at(31), 'A4:7 | Bb4:3.5! A4:3.25 _:.25', { vel: 0.36, shape: 'flat', longExpr: [[0, 0.6], [0.5, 1], [1, 0.8]], opts: MUTE });
    sing(vln1, at(35), 'C#6:7 | D6:3.5 | C#6:1.5 Bb5:2! | A5:2@.4 _:1.5', { vel: 0.54, shape: 'cresc', shapeAmt: 0.12, opts: { bright: 0.75 } });
    // octatonic stretto: the motif with its steps swapped, each entry a minor third higher, one bar later; each voice
    // steps back when the next one enters. The celli and violas reach their Eb on the downbeat of 40, where the violas'
    // A3 completes B7b9 (B D# A C) under the horn's C.
    sing(vcs, at(39), 'A2:1@.64 D3@.66 Eb3@.68! F3:.5@.64 Eb3:3.5@.46! D3:3.5@.4 C3:3.5@.36', { shape: 'flat', longExpr: [[0, 0.9], [0.3, 0.65], [1, 0.55]] });
    sing(vla, at(39), 'A3:1@.72 D4@.74 Eb4@.76! F4:.5@.7 Eb4:3.5@.44! D4:3.5@.36 C4:3.5@.32', { shape: 'flat', longExpr: [[0, 0.9], [0.3, 0.6], [1, 0.5]] });
    vla.note(at(40), 3.25, 'A3', 0.36, { expr: [[0, 0.9], [0.3, 0.6], [1, 0.5]] });
    sing(horn, at(40), 'C4:1@.7 F4@.72 F#4@.72! G#4@.72! F#4:3@.6!', { shape: 'flat', longExpr: 'dim' });
    sing(vln1, at(41), 'Eb5:1@.66! Ab5@.68! A5@.68 B5@.68! A5:2.5@.6 _:.5', { shape: 'flat' });
    sing(flute, at(41), 'Eb5:1@.32! Ab5@.34! A5@.34 B5@.34! A5:2.25@.3 _:.75', { shape: 'flat' });
    // bar 42: the fourth entry (on F#, over the F pedal: F7b9, all notes of the F octatonic) in DIMINUTION
    sing(vln2, at(42), 'F#4:.5 B4 C5 D5 C5:1.25 _:.25', { vel: 0.5, shape: 'flat', shortExpr: EVEN, longExpr: 'dim', opts: { tag: 'tension' } });
    mar.play(at(42), 'F#4:e! B4! C5 D5 C5:q.', { vel: 0.46 * dyn(42) / 0.6 });
    // F pedal: the build into the modulation
    cbs.note(at(43), 14, 'F1', 0.48, { expr: 'cresc' });
    vcs.note(at(43), 14, 'F2', 0.56, { expr: 'cresc' });
    sing(vla, at(43), 'Bb3:2! A3:1.5 | Bb3:2! A3:1.5 | Bb3:1.5! A3:2 | C4:3.5', { vel: 0.54, shape: 'cresc', shapeAmt: 0.15, expr: PAD });
    // violins: the sighs, then from 45 syncopated against the 3+2+2 regrouping (2+2+2+1, tied over the group heads)
    sing(vln1, at(43), 'D5:2 C5:1.5 | Db5:2! C5:1.5 | Eb5:1 F5:1 Gb5:1! F5:.5 | Gb5:1! F5:1 A5:1 C6:.5', { vel: 0.58, shape: 'cresc', shapeAmt: 0.18 });
    sing(trem, at(43), 'F4:3.5 | F4:3.5 | G4:1.5 A4:2 | C5:3.5', { vel: 0.44, shape: 'cresc', shapeAmt: 0.25, expr: [[0, 0.8], [1, 1]] });
    // violins 2 take the seventh of F7 (Eb5) and resolve it to D5 on the Bb
    sing(vln2, at(45), 'C5:3.5 | Eb5:3.5', { vel: 0.44, shape: 'cresc', shapeAmt: 0.15, expr: PAD });
    horn.chord(at(43), 7, ['F3', 'C4'], 0.42, { expr: 'cresc' });
    horn.chord(at(45), 7, ['C4', 'F4'], 0.44, { expr: 'cresc' });
    // the horn's leading tone A3 resolves to Bb3 at 47 and dies away there: the horns then wait (bar 48 answer only)
    sing(horn, at(46), 'A3:3.5 | Bb3:1.25 _:.25', { vel: 0.5, longExpr: [[0, 0.8], [0.7, 1], [1, 0.95]], shortExpr: 'dim' });

    // ================================================================ E Climax bars 47-58 (the lift, the build, the arrival)
    s.section('E climax', at(47), at(59), 'climax');
    // 47-50 THE LIFT, not an arrival: the F pedal resolves V-I into Bb and the texture opens out instead of piling up.
    // The first violins sing the theme alone (no horn doubling, no harp chord, no timpani); the horn answers it once,
    // in bar 48, under the violins' held C6; in 49-50 the marimba's line becomes a running eighth-note countermelody
    // whose structural notes the second violins bow in quarters.
    for (let b = 47; b <= 54; b++) {
      const [L, T, bass] = H[b];
      const d = dyn(b);
      if (b <= 48) osti(mar, b, L, T, { vel: 0.4 * d / 0.6, group: '322' });
      else if (b >= 51) osti(mar, b, L, T, { vel: 0.38, group: '322', mask: 'x..x.x.' });
      if (b <= 50) {
        osti(harp, b, '_ _ _ _', T, { vel: 0.28 * d / 0.6, group: '322', mask: '.x..x.x', opts: { damp: true } });
        bassLine(pzVc, b, bass, 0.36 * d / 0.6, { dur: 1.2, min: 55 }); // an octave above the bowed celli
      } else bassLine(pzVc, b, bass, 0.5 * d / 0.6, { dur: 1.2, min: 38 });
    }
    osti(mar, 49, 'Eb5 C5 D5 Eb5', ['D5', 'F5', 'D5'], { vel: 0.46 * dyn(49) / 0.6, group: '322' });
    osti(mar, 50, 'Bb4 Eb5 C#5 G5', ['Db5', 'E5', 'E5'], { vel: 0.46 * dyn(50) / 0.6, group: '322' });
    const THEME_VN = 'F5:1.5 Bb5:.5 C6:1 D6:1 C6:3 | Bb5:1 A5 Bb5 F5 Gb5:1! F5:1! E5:.5 _:.5';
    sing(vln1, at(47), THEME_VN, { vel: 0.56, shapeAmt: 0.12, opts: { bright: 0.74 } });
    // the horn's answer: the head of the motif in its signature rhythm (Bb-Eb-F-G: a rising fourth and two steps)
    sing(horn, at(48), 'Bb3:.5 Eb4:.5 F4:1 G4:.75 F4:.5 _:.25', { vel: 0.58, shapeAmt: 0.15 });
    // violins 2: D on the Bb, the Eb, then the countermelody's structural notes (a fifth / sixth under the theme)
    sing(vln2, at(47), 'D5:3.5 | Eb5:3.5 | Eb5:1.5 D5:2 | Bb4:1.5 C#5:1.75 _:.25', { vel: 0.38, shapeAmt: 0.1, expr: PAD });
    // the downbeat of the lift is a warm string chord (violas D4/F4, celli Bb2/F3), strings only: the V-I lands, the
    // texture opens, nothing hits
    vla.note(at(47), 3.5, 'F4', 0.34, { expr: PAD });
    vcs.note(at(47), 3.5, 'F3', 0.4, { expr: PAD });
    // inner voices with their thirds and sevenths (no octave doubling of the bass)
    sing(vla, at(47), 'D4:3.5 | Eb4:3.5 | Eb4:1.5 F4:2 | Gb4:1.5 G4:1.75 _:.25', { vel: 0.44, shapeAmt: 0.1, expr: PAD });
    // the bass resolves to a root-position Bb at 47 (V-I), then Eb F | C D | Eb A, the celli taking C# for the A7
    sing(vcs, at(47), 'Bb2:3.5 | Eb3:2.5 F3:1 | C3:1.5 D3:2 | Eb3:1.5 C#3:1.75 _:.25', { vel: 0.56, shapeAmt: 0.1, expr: PAD });
    sing(cbs, at(47), 'Bb1:3.5 | Eb2:2.5 F2:1 | C2:1.5 D2:2 | Eb2:1.5 A1:1.75 _:.25', { vel: 0.46, shapeAmt: 0.1, expr: PAD });
    harp.chord(at(49, 3), 1.5, ['D3', 'F3', 'Bb3', 'D4'], 0.24, { strum: 0.03, damp: true });
    // 51-54 THE BUILD: the bass rises F - G - G# - A into the dominant (Dm/F, Em7b5/G, G#dim7, A7b9). The first violins
    // turn around a rising chromatic line (A-G#-A | Bb-A-Bb | B-A#-B: the motif's turn D-C#-D, in the 2+2+3 rhythm);
    // the upper celli climb A-Bb-B-C# into the D of the arrival; the violas turn around D; the horns enter in 53.
    sing(cbs, at(51), 'F1:3.5 | G1:3.5 | G#1:3.5 | A1:3.5', { vel: 0.4, shape: 'cresc', shapeAmt: 0.12, expr: PAD });
    sing(vcs, at(51), 'F2:3.5 | G2:3.5 | G#2:3.5 | A2:3.25 _:.25', { vel: 0.6, shape: 'cresc', shapeAmt: 0.12, expr: PAD });
    sing(vcs, at(51), 'A3:3.5 | Bb3:3.5 | B3:3.5 | C#4:3.25 _:.25', { vel: 0.56, shape: 'cresc', shapeAmt: 0.14, expr: PAD });
    sing(vla, at(51), 'D4:3.5 | E4:3.5 | D4:3.5', { vel: 0.56, shape: 'cresc', shapeAmt: 0.14, expr: PAD });
    sing(vln1, at(51), 'A5:1 G#5:1 A5:1.5 | Bb5:1 A5:1 Bb5:1.5 | B5:1 A#5:1 B5:1.5', { vel: 0.6, shape: 'cresc', shapeAmt: 0.14, opts: { bright: 0.8 } });
    sing(horn, at(53), 'F4:3.5 | G4:3.25 _:.25', { vel: 0.44, shape: 'cresc', shapeAmt: 0.15, expr: [[0, 0.8], [1, 1]] });
    sing(horn, at(53), 'D4:3.5 | E4:3.25 _:.25', { vel: 0.4, shape: 'cresc', shapeAmt: 0.15, expr: [[0, 0.8], [1, 1]] });
    trem.chord(at(51, 1), 3, ['D5', 'F5'], 0.3, { expr: 'flat' });
    trem.chord(at(52), 3.5, ['E5', 'G5'], 0.32, { expr: 'flat' });
    trem.chord(at(53), 3.5, ['D5', 'F5'], 0.34, { expr: 'cresc' });
    // bar 54: a stretto of the altered head (the bar-39 shape: a fourth, a semitone, a tone) on the A7b9 collection,
    // entries two eighths apart - violas on C#4 (e0), violins 2 on C#5 (e2), violins 1 on G5 (e4), which reach the
    // arrival's E6. The seventh resolves in register: violas G4 -> F4, violins 2 G5 -> F5.
    sing(vla, at(54), 'C#4:.5 F#4:.5! G4:.5 A4:.5 G4:1.5', { vel: 0.5, shape: 'flat', expr: EVEN });
    sing(vln2, at(54, 2), 'C#5:.5 F#5:.5! G5:.5 A5:.5 G5:.5', { vel: 0.47, shape: 'flat', expr: EVEN });
    sing(vln1, at(54, 4), 'G5:.5 C6:.5! C#6:.375 _:.125', { vel: 0.58, shape: 'flat', expr: EVEN, opts: { bright: 0.8 } });
    // the harp (damped) articulates the entries' attacks
    [['C#5', 2], ['F#5', 3], ['G5', 4], ['C6', 5], ['C#6', 6]].forEach(([p, e]) => harp.note(at(54, e), 0.5, p, 0.24, { damp: true, ...(p === 'F#5' || p === 'C6' ? { tag: 'tension' } : {}) }));
    timp.note(at(51), 0.75, 'F2', 0.4);
    timp.roll(at(54, 3), 2, 'A2', { from: 0.26, to: 0.34 });
    // 55-58 THE ARRIVAL: the bar-5 motif in true augmentation in the first violins, now reaching the piece's one new
    // height - F6, first heard here, and the G6 apex (56 e4, over C7sus4) that falls to the E6 of 57. Real counterpoint
    // under it: violins 2 a third or sixth below in their own rhythm; the horns in thirds against it (A-G while the
    // violins rise, Bb held while they fall, the motif's Bb-A sigh into 58, joining the violins' A only there); violas
    // and upper celli a quarter-note countermelody (D-C#-D | E-G | G-F-E | E-C#); the bass falls D-C-Bb-A. The gears keep
    // turning: marimba and pizzicato ticks 3+2+2, the harp damped an octave below.
    const arrShape = (u) => (u < 0.37 ? 0.94 + 0.06 * (u / 0.37) : 1 - 0.32 * (u - 0.37));
    sing(vln1, at(55), 'E6:1! D6:1 E6:2! F6:1.5! G6:1.5^ | E6:1 D6:1 C#6:1! D6:1 Bb5:2! A5:1.75', { vel: 0.66, shape: arrShape, opts: { bright: 0.82 } });
    sing(vln2, at(55), 'F5:1 A5:1 C6:5 | G5:1 F5:1 E5:1 F5:1 D5:2 C#5:1', { vel: 0.44, shape: arrShape, expr: PAD });
    sing(horn, at(55), 'A4:3.25 _:.25 | G4:2 Bb4:5 | A4:3.25 _:.25', { vel: 0.5, shape: arrShape, expr: PAD });
    sing(horn, at(55), 'F4:3.25 _:.25 | C4:3.5 | Bb3:1 D4:1 C#4:1.5 | D4:2 E4:1.25 _:.25', { vel: 0.44, shape: arrShape, expr: PAD });
    sing(vla, at(55), 'F4:2 D4:1.5 | E4:2 G4:1.5 | G4:1 F4:1 E4:1.5 | E4:2 C#4:1.25 _:.25', { vel: 0.46, shape: arrShape, expr: PAD });
    sing(vcs, at(55), 'D4:1 C#4:1! D4:1.5 | E4:2 G4:1.5 | G4:1 F4:1 E4:1.5 | E4:2 C#4:1.25 _:.25', { vel: 0.48, shape: arrShape, expr: PAD });
    sing(vcs, at(55), 'D3:3.5 | C3:3.5 | Bb2:3.5 | A2:3.25 _:.25', { vel: 0.52, shape: arrShape, expr: PAD });
    sing(cbs, at(55), 'D2:3.5 | C2:3.5 | Bb1:3.5 | A1:3.5', { vel: 0.46, shape: arrShape, expr: PAD });
    for (let b = 55; b <= 58; b++) {
      const fade = 1 - 0.08 * (b - 55);
      osti(mar, b, '_ _ _ _', H[b][1], { vel: 0.64 * fade, group: '322', mask: '.x..x.x' });
      osti(pzHi, b, '_ _ _ _', H[b][1], { vel: 0.46 * fade, group: '322', mask: '.x..x.x' });
      osti(harp, b, '_ _ _ _', H[b][1], { vel: 0.34 * fade, group: '322', mask: '.x..x.x', oct: -1, opts: { damp: true } });
      // pizzicato basses: the attack of each bass note only
      bassLine(pzCb, b, H[b][2].split(' ')[0], b <= 56 ? 0.38 : 0.34, { dur: 1 });
    }
    timp.note(at(55), 1.5, 'D3', 0.46);
    timp.note(at(58), 1, 'A2', 0.34);

    // ================================================================ F Release bars 59-68
    s.section('F release', at(59), at(69), 'release');
    // strings settle (sordino); two phrases (59-62 and 63-68), the violas' peaks a bar after the celli's
    sing(vcs, at(59), 'D3:3.5 | Bb2:3.5 | G2:3.5 | E3:2 A2:1.25 _:.25', { vel: 0.47, shapeAmt: 0.25, expr: PAD, longExpr: PAD, opts: MUTE });
    sing(vcs, at(63), 'Bb2:3.5 | D3:3.5 | D3:3.5 | F2:3.5 | G2:3.5 | A2:3.5', { vel: 0.45, shapeAmt: 0.25, expr: PAD, opts: MUTE });
    sing(vla, at(59), 'F3:1.5 A3:2 | F3:3.5 | D3:3.5 | G3:3.5', { vel: 0.44, shape: (u) => 0.82 + 0.3 * Math.sin(Math.PI * Math.min(1, u * 0.8 + 0.2)), expr: PAD, opts: MUTE });
    sing(vla, at(63), 'F3:3.5 | A3:3.5 | G3:3.5 | A3:3.5 | F3:3.5 | E3:3.5', { vel: 0.44, shape: (u) => 0.82 + 0.3 * Math.sin(Math.PI * Math.min(1, u * 0.8 + 0.2)), expr: PAD, opts: MUTE });
    sing(vln2, at(59), 'A4:3.5 | F4:3.5 | Bb4:3.5 | Bb4:2 C#5:1.5 | D5:3.5', { vel: 0.34, shapeAmt: 0.2, expr: PAD, opts: MUTE });
    // ... and on through 69-70, so that the return of the machine does not fall into a hole
    sing(vln2, at(64), 'B4:7 | A4:3.5 | D4:3.5 | E4:3.5 | D4:6.75 _:.25', { vel: 0.33, shapeAmt: 0.2, expr: PAD, opts: MUTE });
    // the flute sings the inversion (A E D C# D); the cello answers with the subject on G
    sing(flute, at(59), 'A5:1 E5:1 D5:1 C#5:1! D5:3', { vel: 0.54, shapeAmt: 0.15 });
    sing(cello, at(61), 'G3:1 D4:1 E4:1 F4:1! E4:1.5 C#4:1.5 | D4:3', { vel: 0.38, shapeAmt: 0.25, opts: { glideTime: 0.06 } });
    sing(vcs, at(61), 'G3:1 D4:1 E4:1 F4:1 E4:1.5 C#4:1.5 | D4:3', { vel: 0.38, shapeAmt: 0.2, expr: PAD, opts: MUTE });
    for (let b = 59; b <= 68; b++) bassLine(pzVc, b, H[b][2].split(' ')[0], 0.38, { dur: 1.2, min: 38 });
    // harp arpeggios, varied like a player: rising, falling (61, 67), a pickup into the next bar (60, 66), a rolled
    // chord on the deceptive Bbmaj7 (63), and a velocity arc over each phrase
    const HARP_REL = { 59: 'D3 A3 F4 A4', 60: 'Bb2 F3 D4 F4', 61: 'G2 D3 Bb3 D4', 62: 'E3 G3 Bb3 C#4', 63: 'Bb2 F3 D4 F4', 64: 'D3 A3 D4 B4', 65: 'D3 G3 B3 D4', 66: 'F2 C3 A3 C4', 67: 'G2 D3 Bb3 F4', 68: 'A2 E3 A3 G4' };
    const HARP_VEL = { 59: 0.3, 60: 0.34, 61: 0.37, 62: 0.32, 63: 0.3, 64: 0.33, 65: 0.36, 66: 0.34, 67: 0.31, 68: 0.29 };
    for (const [bs, ps] of Object.entries(HARP_REL)) {
      const b = Number(bs), p = ps.split(' '), hv = HARP_VEL[b];
      if (b === 63) { harp.chord(at(b), 3.5, p, hv, { strum: 0.04 }); continue; }
      const order = b === 61 || b === 67 ? [0, 3, 2, 1] : [0, 1, 2, 3];
      // bar 62 changes chord at e4: the Em7b5 notes are damped there
      [0, 2, 3, 4].forEach((e, i) => harp.note(at(b, e), b === 62 && e < 4 ? (4 - e) * EI : 1.5, p[order[i]], hv * (i === 0 ? 1 : 0.8), b === 62 && e < 4 ? { damp: true } : undefined));
      if (b === 60 || b === 66) harp.note(at(b, 6), 0.5, HARP_REL[b + 1].split(' ')[2], hv * 0.7);
    }
    // dorian lift after the deceptive Bb: the music box (celesta + marimba) brightens with B natural
    for (const b of [64, 65]) osti(mar, b, H[b][0], H[b][1], { vel: 0.36, mask: 'x.x.xx.' });
    cel.play(at(64), 'A5:e B5 D6:q E6:q. | D6:e B5 G5 B5 D6:q E6:e', { vel: 0.55, shape: 'arch', shapeAmt: 0.15 });
    // the solo violin alone: a pickup (A-C, bar 65 e5-6) into the sighs over Fmaj7 - Gm7 - A7sus4 - A7, the E5 tied
    // over the barline into the Gm7 (a suspension), resolving to a held D5 into the return
    const VN3 = 'A4:.5 C5:.5 | F5:1.5 E5:2.5! D5:1 C5:.5 Bb4:1.5 | D5:2! C#5:1.5 | D5:3.5';
    sing(violin, at(65, 5), VN3, { vel: 0.4, shape: 'dim', shapeAmt: 0.18, opts: { glideTime: 0.06 } });

    // ================================================================ G Return bars 69-78 (gentle)
    s.section('G return', at(69), at(LAST + 1), 'gentle');
    // 69-70: the machine comes back in pizzicato violins, an octave up, with the marimba's heads under it in 69 and
    // its 3-group in 70; a muted viola dyad keeps the floor
    osti(pzHi, 69, H[69][0], H[69][1], { vel: 0.6, oct: 1 });
    osti(pzHi, 70, H[70][0], H[70][1], { vel: 0.58, oct: 1 });
    osti(mar, 69, H[69][0], H[69][1], { vel: 0.38, mask: 'x.x.x..' });
    osti(mar, 70, H[70][0], H[70][1], { vel: 0.48, mask: '....xxx' });
    vla.chord(at(69), 6.75, ['F3', 'A3'], 0.3, { sordino: true, expr: PAD });
    const RET_MASK = { 71: 'x.x.x..', 72: 'x.x.x..', 73: 'x.x.x.x', 74: 'xxxxxx.', 75: 'xxxxxxx', 76: 'x.....x', 77: 'x.x.x..', 78: 'x.....x' };
    for (let b = 69; b <= LAST; b++) {
      const [L, T, bass] = H[b];
      if (RET_MASK[b]) osti(mar, b, L, T, { vel: b >= 75 ? 0.64 : b === 74 ? 0.5 : 0.6, mask: RET_MASK[b] });
      // 76 and 78: the inner line notes pass to the harp (the bookend figure is not the same timbre every time)
      if (b === 76 || b === 78) osti(harp, b, L, T, { vel: 0.36, mask: '..x.x..', opts: { damp: true } });
      bassLine(harp, b, bass, 0.31, { dur: 3 });
      if (b <= 76) bassLine(pzVc, b, bass.split(' ')[0], 0.38, { dur: 1.2 });
      if (b >= 75) phoneTicks(b, 0.5);
    }
    // a reminiscence: the solo cello has only the augmented head (A:4e D:3e | E:4e F:3e) over Bb/D and Gm6, and
    // stays on F into the F-major bar, stepping back there for the felt piano; a muted celli section under him
    sing(cello, at(71), 'A3:2 D4:1.5 | E4:2 F4:1.5', { vel: 0.38, shapeAmt: 0.3, opts: { glideTime: 0.06 } });
    sing(cello, at(73), 'F4:2 E4:1.5! | D4:3 _:.5', { vel: 0.32, shape: 'dim', shapeAmt: 0.1, longExpr: BACK, opts: { glideTime: 0.06 } });
    sing(vcs, at(71), 'A3:2 D4:1.5 | E4:2 F4:1.5 | F4:2 E4:1.5! | D4:3 _:.5', { vel: 0.38, shapeAmt: 0.2, expr: PAD, opts: MUTE });
    // the felt piano answers with the B consequent (C-F-G-A), a held F-E sigh, and the falling fragments of 75 and 77
    for (const b of [73, 74, 75, 77]) piano.pedal(at(b), at(b + 1) - 0.05);
    piano.play(at(73), 'C5:e F5 G5:q A5:q.', { vel: 0.38, shape: 'arch', shapeAmt: 0.15 });
    piano.play(at(74), 'F5:h E5:q.!', { vel: 0.36, shape: 'dim', shapeAmt: 0.1 });
    piano.play(at(75, 2), 'F5:e D5 Bb4:q', { vel: 0.28 });
    piano.play(at(77, 2), 'A4:e F4 D4:q', { vel: 0.26 });
    // violas: F held, then the falling tetrachord A-G-F-E that answers the rising D-E-F-G and resolves on bar 1;
    // violins 2 (muted) carry the chord in the phone band and their G resolves to the F of bar 1
    sing(vla, at(73), 'F3:7 | A3:3.5! | G3:3.5 | F3:3.5 | E3:3.5', { vel: 0.55, shapeAmt: 0.2, expr: PAD, opts: MUTE });
    sing(vcs, at(75), 'Bb2:3.5 | G2:3.5 | F2:3.5 | E2:2 A2:1.5', { vel: 0.3, shapeAmt: 0.2, expr: PAD, opts: MUTE });
    sing(vln2, at(75), 'F5:3.5 | Bb5:3.5 | A5:3.5 | G5:3.5', { vel: 0.3, shape: 'flat', expr: PAD, opts: MUTE });

    // ---------------------------------------------------------------- bus rides (all in one place)
    // marimba: steps back under the solo cello's theme and under the first celesta motif (5-6); the bookends around
    // the loop point (1-8, 71-78) only a little more present (the same level on both sides)
    // marimba: the bookends around the loop point (1-4, 75-78) forward for the phone speaker (the same level on both
    // sides of the wrap); steps back under the first celesta motif (5-6), the solo cello's theme and the violins'
    // theme in the lift (47-48; less in 49-50, where it has the countermelody)
    marB.automate('gain', [[at(1), 4.5], [at(2, 6), 4.5], [at(4, 6), 2], [at(5), -2], [at(6, 6), -2], [at(7), 0], [at(8, 4), 0], [at(9, 1), -1.5],
      [at(20, 6), -1.5], [at(21), 0], [at(46, 6), 0], [at(47), -3], [at(48, 6), -3], [at(49), 0], [at(54, 6), 0], [at(55), 4], [at(58, 6), 4], [at(59), 0],
      [at(74, 4), 0], [at(75), 2], [at(76, 6), 2], [at(LAST), 4.5], [at(LAST + 1), 4.5]]);
    // solo violin: an equal voice in the canon, a little more for his first entry over the cello's countersubject
    vnB.automate('gain', [[at(21, 6), 0], [at(22), 2.2], [at(22, 6), 2.2], [at(23, 2), 1.5], [at(30, 6), 1.5], [at(31, 2), 0]]);
    // celli section: steps back under the soloist where he sits low (the cadence bars 12, 18, 20)
    vcsB.automate('gain', [[at(11, 6), 0], [at(12), -3.5], [at(12, 6), -3.5], [at(13), 0], [at(17, 6), 0], [at(18), -2.5], [at(18, 6), -2.5],
      [at(19), 0], [at(19, 6), 0], [at(20), -2.5], [at(20, 6), -2.5], [at(21), 0],
      [at(50, 6), 0], [at(51), -1.5], [at(54, 6), -1.5], [at(55), -2.5], [at(58, 6), -2.5], [at(59, 2), 0]]);
    // celli and basses: the low end of the build and the arrival is a floor, not the loudest thing in the room (a phone
    // cannot play it, earbuds feel it as weight; it would make the recurring climax tiring)
    cbB.automate('gain', [[at(50, 6), 0], [at(51), -2.5], [at(58, 6), -2.5], [at(59, 2), 0]]);
    // solo cello: steps back for the solo violin's first entry (22)
    vcB.automate('gain', [[at(21, 6), 0], [at(22), -2], [at(22, 6), -2], [at(23, 1), 0]]);
    // violins: the theme over its accompaniment in the lift (47-50) and the arrival (55-58), their moments
    vln1B.automate('gain', [[at(46, 6), 0], [at(47), 1], [at(50, 6), 1], [at(51), 0], [at(54, 6), 0], [at(55), 2], [at(56, 6), 2], [at(58, 6), 1], [at(59, 2), 0]]);
    // the lift (47-50) and the arrival (55-58): the violins' theme clears its accompaniment; violins 2 come forward only
    // for the countermelody's notes (49-50)
    vlaB.automate('gain', [[at(46, 6), 0], [at(47), -1.5], [at(47, 6), -1.5], [at(48), -2.5], [at(50, 6), -2.5], [at(51), 0], [at(54, 6), 0], [at(55), -1.5], [at(58, 6), -1.5], [at(59, 2), 0]]);
    harpB.automate('gain', [[at(46, 6), 0], [at(47), -3], [at(50, 6), -3], [at(51), 0]]);
    vln2B.automate('gain', [[at(46, 6), 0], [at(47), -2], [at(48, 6), -2], [at(49), 3], [at(50, 6), 3], [at(51), 0], [at(54, 6), 0], [at(55), -2], [at(58, 6), -2], [at(59, 2), 0]]);
    // horns: their answer to the violins in the lift (48); under the violins in the arrival
    hnB.automate('gain', [[at(47, 6), 0], [at(48), 1], [at(48, 6), 1], [at(49), 0], [at(54, 6), 0], [at(55), -2.5], [at(58, 6), -2.5], [at(59), 0]]);
    // celesta: the first motif (5-6) and the dorian lift (64-65) are melodies, but no title card
    celB.automate('gain', [[at(4, 6), 0], [at(5), 1], [at(6, 6), 1], [at(7), 0], [at(63, 6), 0], [at(64), 3], [at(65, 6), 3], [at(66), 0]]);
    // piano: its answer (73-74) over the cello's held F-E
    pnoB.automate('gain', [[at(72, 6), 0], [at(73), 3], [at(74, 6), 3], [at(75), 0]]);
    // pizzicato violins: the return of the machine (69-70), a little only (the marimba and the pad carry it now)
    pzHiB.automate('gain', [[at(68, 6), 0], [at(69), 1], [at(70, 6), 1], [at(71), 0]]);

    s.length(at(LAST + 1));

    // the bar-1 downbeat a breath late (55 ms, exact): the first AAC frame then holds only the tail of bar 78
    for (const ev of s._events) if (ev.beat < 1e-6) ev.opts = { ...(ev.opts || {}), _shift: (ev.opts?._shift || 0) + 0.055, exact: true };
  },
};
