// tools/music/tracks/stage_fill.mjs
// "Brick by Brick": the staged-practice cue for fillBox / fillRow / fillCol (fill the missing cells of one box, row or
// column). PLAN: scratchpad/music/stage-set/PLAN.md section 2.3.      node tools/music/render.mjs stage_fill
//
// TEMPO / METRE: 108 BPM (the PLAN's slot: 8 BPM from kibbitzer 100 and stage_chain 116), 4/4, straight 8ths. A bar =
// 2.222 s. 12 bars = 26.67 s, the whole file loops (stages up to 60 s play it about twice; a stage that ends after 8 s
// has heard the box filled AND resolved on the tonic at 5.0 s).
// KEY: Bb minor -> Bb major. Not the harmonic-minor groove of kibbitzer: the cue's own colour is the NEAPOLITAN Cb as a
// plain triad (bII) at its cadences: Cb -> Bb in the bass at 3/1 and the seam, Cb over a Bb PEDAL in the stop bar (D9),
// and the German-sixth A natural only once, in the seam figure (12/3-4). The bed is modal, over pedals: a chromatic
// inner line Eb -> D -> Db -> C (Ebm, Ebm(maj7), Gb, F7b9: D1/D5) and ONE Freygish dominant per loop (F7b9) whose b9
// (the viola Gb4) sags flat before it sighs to F4 on the lift (D12 + D3).
//   Bbm | Gb | Cb -> Bbm | Bbm -> Bb7 || Ebm (Eb pedal) | Ebm(maj7) (Eb pedal) | Gb | F7b9 (F pedal) ||
//   Bb -> Eb/Bb -> Bb/D | Cb over a Bb pedal (stop) | Bb -> Bb7 | Gb -> Cb7 (the seam)
//
// THE IDEA: a sudoku box has nine cells, the motif has nine notes in three CELLS of "tap tap PLACE" (8th, 8th, quarter).
// Every cell is the same gesture at a new height: the finger hovers a SEMITONE below (the tap), then the digit is
// PLACED with a leap up; the PLACEs spell the Bb minor chord upwards (Db, F, Bb = the box is complete on the tonic).
//   c1  Bb4 A4 Db5     -1 +4        (the semitone is the very first interval of the cue: identity on beat 1)
//   c2  Eb5 D5 F5      -1 +3        (the D natural is only a tap here; it becomes a PLACED digit when solved)
//   c3  Gb5 F5 Bb5     -1 +5        (over Cb -> Bbm: the tonic arrives on the PLACE, an octave above c1's start)
// ADDITIVE in a balanced phrase: bar 1 = c1 + rest | bar 2 = c1 (shaded as a pickup) c2 | bar 3 = c3 + the box ringing |
// bar 4 = the box glows (harp, celesta, a D-natural flicker). The box is full ON THE TONIC at 5.0 s.
// BED (5-8, no piano): the harp has a different figure in every bar (a roll and a high tap-tap-PLACE, a rising ringing
// arpeggio, the c3 ECHO in bar 7, damped comping in 8); the inner line falls Eb D Db C; the violas hold Gb4 as the b9.
// SOLVED (9-11): c1 played QUICK (16th 16th, the PLACE D5 on 1&: the confident solver; the one Picardy digit, D8), c2
// with its PLACE F5 over Bb/D, then the last cell HESITATES: tap tap (Gb F) ... stop time (the band holds Cb over a Bb
// pedal, a soft pulse stays, the tambourine clicks where the digit should land) ... the same tap again, slower and unsure
// ... and the Bb5 is placed LATE, on the downbeat of bar 11. Not a wrong digit (spot's and puzzle's joke): a late one.
// Anti-copy: every pitched part's top line checked with scratchpad/music/stage_fill/hookcheck.mjs (STYLE.md section 3,
// kibbitzer, caper) and scratchpad/music/stage_fill_r4/hooksib.mjs (the sibling cues' lead and celesta lines as BUILT:
// intervals and exact pitch pairs at the same metric position).
//
// FORM (seconds from the loop start)
//   1-4    0.00- 8.89  the box fills: piano cells, the celesta clicks the PLACEs (a chord tone, never the piano's octave),
//                      the harp rolls the PLACE digits when the box is full, then comps off the beat in bar 4.
//   5-8    8.89-17.78  the bed (no piano, no kick): Ebm | Ebm(maj7) over a tuba Eb pedal (the pizz walks above it), Gb
//                      with the harp's c3 echo, F7b9 over an F pedal; the celesta answers in bars 6-8.
//   9-12  17.78-26.67  solved: c1 c2 in Bb major, the stop-time hesitation over Cb/Bb, the late PLACE on 11/1 (harp roll
//                      after the piano, celesta), Bb7; 12 the light dims (Gb) and Cb7 leads into the seam.
// BASS (quarters, '~' = ghosted passing tone): 1 Bb1 F2 Eb2~ Db2 | 2 Gb2 Bb1 Eb2~ Db2 | 3 Cb2 Bb1 Db2 F2 |
//   4 Bb2 Ab2 F2 D2 | 5 Eb pedal; pizz Eb F~ Gb Ab~ | 6 Eb pedal; pizz Gb F~ Eb D | 7 Gb2 Ab2~ Bb2 Gb2 |
//   8 F pedal; pizz F Eb C A~ | 9 Bb1 F2 Bb1 D2 | 10 Bb1 pedal (stop, pizz ghosts) F 8th | 11 Bb1 F2 D2 Ab2 |
//   12 Gb2 Db2~ Eb2 Cb2.
// Melody (piano) in bars 1-3 and 9-11 (bars 1, 3 and 11 are half bars): about 10 s of melody in 26.7 s.
//
// BAND: felt piano lead (near centre, +11 c sharp of the band: a slightly worn upright; no other voice doubles its PLACE
// notes at the octave); ONE harp, panned by string (low left, high right, about +-0.3: a close-miked harp, a chord
// sounds from one place); celesta clicks (left, opposite the piano's high notes); tuba + celli pizz WALKING quarter bass
// (the bricks), the only walking bass of the set, with pedals in the bed; violas/celli con sordino pad (the mortar); NO
// pulse kick: one soft tuned thump under each completion only (3/2 the box is full, 11/1 the late PLACE); tambourine on
// 2 and 4 (the PLACE clicks, accented on the PLACE beats) with soft shakes on 1 and 3 outside the bed; shaker 8ths with
// three accent levels and a 4-bar swell. Production: dry and close (a 0.6 s plate, sent mostly from the piano and celesta,
// a 0.3 s room), mono bass, the jingles bright (one narrow ring notch only), plucks and metal wide.

const BPM = 108;
const BARS = 12;
const LEAD_SHARP = 0.11;            // semitones: the piano sits 11 c sharp of the band (D12)

export default {
  id: 'stage_fill',
  title: 'Brick by Brick',
  bpm: BPM,
  loop: true,

  build(s) {
    s.meter(4, 4);
    s.reverb({ rt60: 0.6, predelay: 0.012, damping: 0.5, early: 0.35, wet: 1 });
    s.room({ rt60: 0.3, predelay: 0.004 });
    s.master({
      lufs: -16, ceiling: -2.2,
      eq: [
        { type: 'lowshelf', f: 110, q: 0.7, gain: -0.5 },
        { type: 'peak', f: 230, q: 0.9, gain: -1.5 },
        { type: 'peak', f: 400, q: 0.9, gain: -1.5 },
        { type: 'peak', f: 3200, q: 0.8, gain: 2.5 },
        { type: 'highshelf', f: 10000, q: 0.7, gain: 1.5 },
      ],
      glue: { threshold: -16, ratio: 1.5, attack: 0.01, release: 0.2, knee: 8 },
      width: 1.2,
    });
    s.humanize = { time: 0.005, vel: 0.05 };
    const B = (bar, beat = 1) => s.bar(bar, beat);

    // one band: a seeded, smooth +-4 ms push/pull over 2-bar spans, cyclic over the loop
    const ensR = s.rng('ensemble');
    const NODES = BARS / 2;
    const dn = Array.from({ length: NODES }, () => (ensR() * 2 - 1) * 0.004);
    const drift = (beat) => {
      const x = beat / 8, i = Math.floor(x), f = x - i, w = (1 - Math.cos(Math.PI * f)) / 2;
      const a = dn[((i % NODES) + NODES) % NODES], b = dn[(((i + 1) % NODES) + NODES) % NODES];
      return a + (b - a) * w;
    };
    // the pocket of each role (seconds, + = laid back)
    const feel = (part, role = 0) => {
      const orig = part.note.bind(part);
      part.note = (beat, dur, pitch, vel, o = {}) => {
        if (Array.isArray(pitch)) { for (const p of pitch) part.note(beat, dur, p, vel, o); return part; }
        return orig(beat, dur, pitch, vel, { ...o, _shift: (o._shift || 0) + role + drift(beat) });
      };
      return part;
    };

    // ---------------------------------------------------------------- buses
    const pres = (g, f = 3000, q = 0.9) => ({ type: 'peak', f, q, gain: g });
    const busPiano = s.bus('piano', { gain: -5, pan: -0.12, reverb: 0.23, room: 0.42,
      eq: [{ type: 'hp', f: 120 }, { type: 'peak', f: 300, q: 1, gain: -2 }, pres(1.5, 2500, 0.9), { type: 'highshelf', f: 6000, q: 0.7, gain: -4 }] });
    // one harp, panned by string inside the instrument (stereo), the bus widened above its own image
    const busHarp = s.bus('harp', { gain: -4, pan: -0.05, width: 1.6, reverb: 0.11, room: 0.42,
      eq: [{ type: 'hp', f: 190 }, { type: 'peak', f: 350, q: 1, gain: -2 }, { type: 'peak', f: 1700, q: 1, gain: 2 }, pres(2, 2800)] });
    const busCel = s.bus('celesta', { gain: -5, pan: -0.5, width: 1.4, reverb: 0.14, room: 0.06, eq: [{ type: 'peak', f: 2700, q: 2, gain: -2 }] });
    const busTuba = s.bus('tuba', { gain: -7.5, pan: 0, width: 0, room: 0.06,
      eq: [{ type: 'hp', f: 36 }, { type: 'lowshelf', f: 110, q: 0.7, gain: -3 }, { type: 'peak', f: 220, q: 1, gain: -1.5 },
        { type: 'peak', f: 550, q: 1, gain: 2.5 }],
      comp: { threshold: -20, ratio: 2.5, attack: 0.003, release: 0.09, knee: 6, makeup: 1 } });
    const busPizz = s.bus('pizz', { gain: -3.5, pan: 0, width: 0.3, room: 0.06,
      eq: [{ type: 'hp', f: 70 }, { type: 'lowshelf', f: 160, q: 0.7, gain: -2 }, { type: 'peak', f: 180, q: 1.2, gain: -2 },
        { type: 'peak', f: 900, q: 1, gain: 3.5 }, { type: 'peak', f: 1600, q: 1.2, gain: 1.5 }, pres(2, 2500)],
      comp: { threshold: -22, ratio: 3, attack: 0.001, release: 0.06, knee: 6, makeup: 1 } });
    const busPad = s.bus('pad', { gain: -7, pan: 0.1, width: 1.5, room: 0.1, eq: [{ type: 'hp', f: 150 }, { type: 'peak', f: 1100, q: 1, gain: 2 }, { type: 'highshelf', f: 4000, q: 0.7, gain: -3 }] });
    const busKick = s.bus('kick', { gain: -13, width: 0, comp: { threshold: -20, ratio: 4, attack: 0.001, release: 0.05, knee: 4 },
      eq: [{ type: 'lowshelf', f: 90, gain: -2 }, { type: 'peak', f: 3500, q: 1.4, gain: 2 }] });
    // the jingles bright: one narrow ring notch (7.1 kHz), a gentle 3.5 kHz dip, a little air
    const busJing = s.bus('jingles', { gain: -7.5, width: 1.2, room: 0.06,
      eq: [{ type: 'peak', f: 3500, q: 0.8, gain: -2 }, { type: 'peak', f: 7100, q: 6, gain: -3 },
        { type: 'highshelf', f: 8500, q: 0.7, gain: 2 }] });
    // a soft damped guitar doubles the harp's off-beat comping (bars 4, 8, 12): the idiomatic comping voice, two takes
    // panned wide (the wide plucks of the score), quiet under the harp
    const busPluck = s.bus('pluck', { gain: -6.5, room: 0.08, eq: [{ type: 'hp', f: 220 }, { type: 'peak', f: 400, q: 1, gain: -2 }] });
    const busShak = s.bus('shaker', { gain: -11, pan: -0.6, eq: [{ type: 'peak', f: 3500, q: 0.8, gain: -2 }] });

    // ---------------------------------------------------------------- parts
    const piano = feel(s.part(busPiano, 'feltPiano', { hardness: 0.55, name: 'piano lead', stereo: 0.55 }), 0.004);
    const harpP = feel(s.part(busHarp, 'harp', { pluck: 0.22, stereo: 0.9, name: 'harp' }), 0.007);
    const NAMES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    const midiOf = (name) => {
      if (typeof name === 'number') return name;
      const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
      return NAMES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12 * (Number(m[3]) + 1);
    };
    const harp = {
      note: (b, d, p, v, o = {}) => harpP.note(b, d, midiOf(p), v, o),
      // strummed low to high
      chord: (b, d, ps, v, o = {}) => {
        const { strum = ps.length > 1 && o.damp ? 0.012 : 0, ...rest } = o;   // damped comping: a hand never lands as one
        ps.map(midiOf).sort((x, y) => x - y).forEach((m, i) => harp.note(b, d, m, v, { ...rest, _shift: strum * i }));
      },
    };
    const cel = feel(s.part(busCel, 'celesta'), 0.008);
    const tuba = feel(s.part(busTuba, 'tuba', { bright: 1.5, humanize: { time: 0.003, vel: 0.04 } }), 0.003);
    const pizz = feel(s.part(busPizz, 'stringsPizzicato', { section: 'celli', humanize: { time: 0.003, vel: 0.04 } }), 0.006);
    const vla = s.part(busPad, 'stringsEnsemble', { section: 'violas', sordino: true, name: 'violas sord' });
    const vcl = s.part(busPad, 'stringsEnsemble', { section: 'celli', sordino: true, name: 'celli sord' });
    const kick = feel(s.part(busKick, 'kick', { click: 0.6, humanize: { time: 0.002, vel: 0.03 } }), 0.003);
    const tamb = feel(s.part(busJing, 'tambourine', { pan: 0.3, bright: 0.9, skin: 0.3, ring: 0.4, spread: 0.7 }), 0.01);
    const gtr = feel(s.part(busPluck, 'pluck', { body: 'guitar', double: 1, spread: 0.8, decay: 0.7 }), 0.009);
    const shak = feel(s.part(busShak, 'shaker', {}), 0.006);

    // ---------------------------------------------------------------- helpers
    const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
    const P = (p, beat, len, v) => piano.note(beat, len, midiOf(p) + LEAD_SHARP, v);
    // a cell = tap tap PLACE: the first tap, the semitone dip (a touch softer), the PLACE (rings a little over its quarter)
    const cell = (bar, beat, [a, b, c], [va, vb, vc], placeLen = 1.15, dipLen = 0.5) => {
      P(a, B(bar, beat), 0.55, va); P(b, B(bar, beat + 0.5), dipLen, vb); P(c, B(bar, beat + 1), placeLen, vc);
    };
    const C1 = ['Bb4', 'A4', 'Db5'], C2 = ['Eb5', 'D5', 'F5'];
    const ping = (bar, beat, p, len = 0.5, v = 0.3) => cel.note(B(bar, beat), len, p, v);
    const DRY = { damp: true };     // harp comping: damped, gone by about 0.35 s
    // off-beat comping: the damped harp dyad doubled by the damped guitar (bars 4, 8, 12 only)
    const comp = (b, ps, v) => { harp.chord(b, 0.6, ps, v, DRY); ps.forEach((p, i) => gtr.note(b, 0.32, midiOf(p), v * 0.8, { damp: true, _shift: 0.008 * i })); };
    // the completion thump: a soft tuned kick under the two moments the box is complete (not a pulse)
    const thump = (bar, beat, root, v = 0.5) => kick.note(B(bar, beat), 0.5, root, v);

    // walking bass: tuba (phone octave by its harmonics) + celli pizz an octave up.
    // 'Bb1' = chord tone, 'Eb2~' = ghosted passing tone (shorter, softer), null = rest.
    // ped = the tuba holds this pedal on its beats while the pizz walks; slur = beats whose note is slurred into the next
    // (the next one softer); tv / pv = per-beat velocity offsets of the tuba / pizz; lean = phrase weight on beat 1.
    const walk = (bar, notes, { v = 0.6, tubaOn = [1, 2, 3, 4], pizzOff = [], lean = 0, ped = null, slur = [], tv = {}, pv = 0, pvb = {} } = {}) => {
      notes.forEach((n, i) => {
        if (!n) return;
        const ghost = n.endsWith('~'), p = ghost ? n.slice(0, -1) : n, beat = 1 + i, m = midiOf(p);
        const acc = (i === 0 ? 0.05 + lean : i === 2 ? 0.02 : -0.04) - (ghost ? 0.08 : 0);
        let len = ghost ? 0.45 : i === 0 || i === 2 ? 0.66 + lean * 1.5 : 0.58;
        if (slur.includes(beat)) len = 0.95;
        const soft = slur.includes(beat - 1) ? 0.05 : 0;
        if (tubaOn.includes(beat)) tuba.note(B(bar, beat), ped ? 0.62 : len, ped || p, v + (ped ? (i === 0 ? 0.04 : -0.02) : acc) - soft + (tv[beat] || 0));
        if (!pizzOff.includes(beat)) pizz.note(B(bar, beat), clamp(1.0 - (m + 12 - 40) * 0.02, 0.6, 1.0) * (ghost ? 0.75 : 1), m + 12, 0.56 + acc + pv + (pvb[beat] || 0) - soft * 0.5);
      });
    };
    // the pad: celli (first note) under the violas; each voice a legato line, re-bowed where `brk` ends a span early.
    // Only the first segment of a bow swells (ARCH); continuation segments with common tones stay level (HOLD).
    const ARCH = [[0, 0.82], [0.5, 1], [1, 0.88]], HOLD = [[0, 0.95], [1, 0.9]];
    const pad = (bar, beat, beats, notes, v = 0.3, { brk = false, gl = [], expr = ARCH, tag } = {}) => {
      const len = beats - (brk ? 0.06 : 0);
      notes.forEach((p, i) => {
        const o = { _leg: true, expr };
        if (tag) o.tag = tag;
        if (gl[i]) o.glideTime = gl[i];
        (i === 0 ? vcl : vla).note(B(bar, beat), len, midiOf(p), v, o);
      });
    };
    // the groove: tambourine clicks on 2 and 4 (the PLACE beats get an accent: `place`), soft shakes on 1 and 3 except
    // in the bed; shaker 8ths in three accent levels with a 4-bar swell, a 16th ghost every other bar
    const SHK = [0.3, 0.48, 0.38, 0.52];
    const groove = (bar, { fill = false, bed = false, lift = false, place = [] } = {}) => {
      const even = bar % 2 === 0, swell = 0.9 + 0.2 * (((bar - 1) % 4) / 3);
      if (!bed) tamb.hit(B(bar, 1), 0.3, 0.24, { stroke: 'shake' });
      tamb.hit(B(bar, 2), 0.5, (bed ? 0.47 : 0.52) + (place.includes(2) ? (bar === 3 ? 0.17 : 0.09) : 0));
      if (!bed) tamb.hit(B(bar, 3), 0.3, 0.21 + (lift ? 0.04 : 0), { stroke: 'shake' });
      tamb.hit(B(bar, 4), 0.5, (bed ? 0.5 : 0.54) + (even ? 0.05 : 0) + (place.includes(4) ? 0.09 : 0));
      if (fill) tamb.hit(B(bar, 4.5), 0.4, 0.34, { stroke: 'shake' });
      for (let i = 0; i < 8; i++) {
        const b = 1 + i / 2;
        if (bed && i === 0) continue;                 // the bed breathes: no shaker downbeat
        shak.hit(B(bar, b), 0.25, SHK[i % 4] * swell);
      }
      if (!even) shak.hit(B(bar, 4.75), 0.2, 0.26);
    };

    // ================================================================ 1-4: the box fills (Bb minor)
    s.section('fill', B(1), B(5), 'gentle');
    // bar 1  Bbm (GO): one confident cell, then a rest; the celesta clicks the PLACE a 10th up and ticks A -> Bb in the
    // rest (D1). The walk answers the PLACE with F2 (a 6th under Db5, not an octave) and leans Db2 -> Gb2 into bar 2.
    cell(1, 1, C1, [0.61, 0.54, 0.71], 1.2);
    ping(1, 2, 'F6', 0.5, 0.3);
    ping(1, 3.75, 'A5', 0.25, 0.22); ping(1, 4, 'Bb5', 0.5, 0.28);
    walk(1, ['Bb1', 'F2', 'Eb2~', 'Db2'], { v: 0.57, slur: [2], tv: { 2: -0.02 } });
    pad(1, 1, 4, ['F3', 'Bb3', 'Db4'], 0.31);
    groove(1);
    // bar 2  Gb: c1 shaded as a pickup (a softer first tap, a legato dip; the harp ticks F4 under the PLACE, not its
    // octave), then c2. A plain Gb triad in the pad (bVI), Db in the bass under the PLACE F5.
    cell(2, 1, C1, [0.44, 0.42, 0.6], 1.15, 0.6);
    harp.note(B(2, 2), 0.6, 'F4', 0.26, DRY);
    cell(2, 3, C2, [0.54, 0.49, 0.63]);
    ping(2, 4, 'Bb5', 0.5, 0.26);
    walk(2, ['Gb2', 'Bb1', 'Eb2~', 'Db2'], { tv: { 4: -0.03 } });
    pad(2, 1, 4, ['Gb3', 'Bb3', 'Db4'], 0.3, { brk: true });
    groove(2, { place: [4] });
    // bar 3  Cb -> Bbm: c3 = the box is full ON THE TONIC (5.0 s): a plain Neapolitan triad, every voice falls a step
    // (Cb -> Bb bass, Gb -> F, Cb -> Bb, Eb -> Db in the pad, F -> Bb in the lead). The harp rolls F Db F under the
    // PLACE (the Bb is the piano's alone); the celesta's loudest click; the completion thump.
    P('Gb5', B(3), 0.55, 0.57); P('F5', B(3, 1.5), 0.5, 0.52);
    P('Bb5', B(3, 2), 3.1, 0.68); P('Db5', B(3, 2), 2.4, 0.36);
    ping(3, 2, 'F6', 0.75, 0.33);
    harp.chord(B(3, 2), 2, ['F3', 'Db4', 'F4'], 0.36, { strum: 0.04 });
    thump(3, 2, 'Bb1', 0.5);
    walk(3, ['Cb2', 'Bb1', 'Db2', 'F2'], { v: 0.6, tv: { 2: -0.04 }, pvb: { 2: -0.04 } });
    pad(3, 1, 1, ['Gb3', 'Cb4', 'Eb4'], 0.3, { gl: [0, 0.09, 0] });
    pad(3, 2, 3, ['F3', 'Bb3', 'Db4'], 0.31, { gl: [0.08, 0.09, 0.08], expr: HOLD });
    groove(3, { place: [2] });
    // bar 4  Bbm -> Bb7: the box glows. The harp comps off the beat (one of the three comping bars), the celesta
    // answers; Db -> D in the pad and the walk (a flicker of the major to come, D8); the pad's D4 resolves to Eb4 on 5/1
    ping(4, 1.5, 'Db6', 0.5, 0.24); ping(4, 2, 'F5', 0.5, 0.26);
    comp(B(4, 1.5), ['Db4', 'F4'], 0.5);
    comp(B(4, 2.5), ['Bb3', 'Db4'], 0.47);
    comp(B(4, 3.5), ['Ab3', 'D4'], 0.52);
    harp.note(B(4, 4.5), 0.6, 'F4', 0.45, DRY);
    walk(4, ['Bb2', 'Ab2', 'F2', 'D2'], { v: 0.57 });
    pad(4, 1, 2, ['F3', 'Bb3', 'F4'], 0.31);
    pad(4, 3, 2, ['F3', 'Ab3', 'D4'], 0.31, { brk: true, gl: [0, 0.08, 0.1], expr: HOLD });
    groove(4, { fill: true });

    // ================================================================ 5-8: the bed (no piano), modal, over pedals
    s.section('bed', B(5), B(9), 'gentle');
    // bar 5  Ebm over a tuba Eb pedal; the pizz walks up Eb F Gb Ab above it. The harp rolls on 1, then a small
    // tap tap PLACE high up (Eb5 F5 -> Gb5, a b9 above the violas' F4, not a 2nd); the violas: Eb4 -> F4 (9th on 3)
    harp.chord(B(5), 1.5, ['Gb3', 'Bb3', 'Eb4', 'Gb4'], 0.48, { strum: 0.035 });
    harp.note(B(5, 3.5), 0.3, 'Eb5', 0.4, DRY); harp.note(B(5, 3.75), 0.3, 'F5', 0.42, DRY);
    harp.note(B(5, 4), 1, 'Gb5', 0.48);
    walk(5, ['Eb2', 'F2~', 'Gb2', 'Ab2~'], { tubaOn: [1, 3], ped: 'Eb2', v: 0.58, pv: -0.05 });
    pad(5, 1, 2, ['Eb3', 'Bb3', 'Eb4'], 0.32);
    pad(5, 3, 2, ['Eb3', 'Bb3', 'F4'], 0.33, { expr: HOLD });
    groove(5, { bed: true });
    // bar 6  Ebm(maj7) over the pedal: the inner line falls Eb -> D (D1; the D natural of the lift, heard early), the
    // top climbs F4 -> Gb4. The harp rises through the chord and lets it ring (Gb4 Bb4 D5), a damped dyad on 4; the
    // celesta answers D6, then Eb6 that steps down to the Db6 of bar 7. The pizz walks down Gb F Eb D.
    harp.note(B(6, 1.5), 1.5, 'Gb4', 0.42); harp.note(B(6, 2), 1.2, 'Bb4', 0.45); harp.note(B(6, 2.5), 1.2, 'D5', 0.48);
    harp.chord(B(6, 4), 0.6, ['Bb4', 'Eb5'], 0.44, DRY);
    ping(6, 3, 'F6', 0.25, 0.22); ping(6, 4.5, 'Eb6', 0.25, 0.2);
    walk(6, ['Gb2', 'F2~', 'Eb2', 'D2'], { tubaOn: [1, 3], ped: 'Eb2', v: 0.55, pv: -0.06 });
    pad(6, 1, 4, ['Eb3', 'Bb3', 'D4', 'Gb4'], 0.33, { brk: true, gl: [0, 0, 0.1, 0.11], tag: 'tension' });
    groove(6, { bed: true });
    // bar 7  Gb: the harp ECHOES c3 an octave down (Gb4 F4 -> Bb4: tap tap PLACE, the celesta clicks Db6 on the PLACE),
    // then falls through the triad; the inner line goes on D4 -> Db4; the walk climbs and turns Gb2
    harp.note(B(7), 0.5, 'Gb4', 0.5, DRY); harp.note(B(7, 1.5), 0.5, 'F4', 0.46, DRY);
    harp.note(B(7, 2), 1, 'Bb4', 0.56);
    ping(7, 2, 'Db6', 0.5, 0.26);
    harp.note(B(7, 3), 1, 'Db4', 0.46); harp.note(B(7, 4), 0.6, 'Bb3', 0.42, DRY); harp.note(B(7, 4.5), 0.6, 'Db4', 0.4, DRY);
    walk(7, ['Gb2', 'Ab2~', 'Bb2', 'Gb2'], { tubaOn: [1, 3], v: 0.56, pv: -0.05, lean: -0.03, slur: [1] });
    pad(7, 1, 4, ['Gb3', 'Bb3', 'Db4', 'Gb4'], 0.32, { gl: [0, 0, 0.1, 0] });
    groove(7, { bed: true });
    tamb.hit(B(7, 4.5), 0.4, 0.3, { stroke: 'shake' });
    // bar 8  F7b9, the one Freygish dominant: tuba F pedal, the pizz walks down to A; the inner line reaches C4, the
    // celli take the Eb3, the violas HOLD Gb4 (now the b9) and let it SAG about 35 c flat in its last 0.18 s before it
    // sighs to F4 on 9/1 (D12 + D3). The harp comps (a comping bar), spelling the b9 on 3 and 4.
    comp(B(8, 1.5), ['A3', 'Eb4'], 0.46);
    harp.note(B(8, 2.5), 0.6, 'C4', 0.42, DRY);
    comp(B(8, 3), ['A3', 'Eb4', 'Gb4'], 0.44);
    comp(B(8, 4), ['A3', 'Gb4'], 0.48);
    ping(8, 2.5, 'Eb6', 0.25, 0.22); ping(8, 4.5, 'Gb5', 0.25, 0.22);
    walk(8, ['F2', 'Eb2', 'C2', 'A1~'], { tubaOn: [1, 3], ped: 'F2', v: 0.6, pv: -0.04 });
    const E8 = [[0, 0.85], [1, 1]];
    pad(8, 1, 4, ['Eb3', 'A3', 'C4'], 0.35, { brk: true, gl: [0, 0.08, 0.09], expr: E8 });
    vla.note(B(8), 3.62, midiOf('Gb4'), 0.35, { _leg: true, expr: E8 });
    vla.note(B(8, 4.62), 0.32, midiOf('Gb4') - 0.35, 0.34, { _leg: true, glideTime: 0.13, expr: HOLD });
    groove(8, { fill: true, bed: true });

    // ================================================================ 9-12: solved (Bb major), the late PLACE, the seam
    s.section('solved', B(9), B(13), 'release');
    // bar 9  Bb -> Eb/Bb -> Bb/D: c1 played QUICK (16th 16th, the PLACE D5 on 1&: the confident solver; the one
    // Picardy digit, D8), c2 with its PLACE F5 over Bb/D (a chord tone: the walk Bb1 F2 Bb1 D2 puts the D natural in the
    // bass too). Beat 3 is IV over the tonic pedal, not a maj7 over G. The harp roll resolves the b9: Gb4 -> F4.
    P('Bb4', B(9), 0.3, 0.47); P('A4', B(9, 1.25), 0.3, 0.42);
    P('D5', B(9, 1.5), 1.35, 0.6); P('F4', B(9, 1.5), 1.25, 0.3);
    cell(9, 3, C2, [0.5, 0.46, 0.6]);
    P('Bb4', B(9, 4), 1.0, 0.3);
    ping(9, 1.5, 'Bb5', 0.5, 0.27);
    harp.chord(B(9), 1.5, ['F3', 'Bb3', 'F4'], 0.4, { strum: 0.025 });
    harp.chord(B(9, 3.5), 0.6, ['G3', 'Eb4'], 0.38, DRY);
    walk(9, ['Bb1', 'F2', 'Bb1', 'D2'], { v: 0.57, lean: 0.05, tv: { 2: -0.03, 4: -0.03 } });
    pad(9, 1, 2, ['F3', 'Bb3', 'D4', 'F4'], 0.32);
    pad(9, 3, 1, ['G3', 'Bb3', 'Eb4'], 0.32, { expr: HOLD });
    pad(9, 4, 1, ['F3', 'Bb3', 'D4'], 0.32, { brk: true, expr: HOLD });
    groove(9, { lift: true, place: [2, 4] });
    // bar 10 Cb over a Bb PEDAL, STOP TIME: the band hits 1 and holds a plain Neapolitan triad over the tonic (bII over
    // I: a semitone rub, D9), so a stage that ends here still leaves Bb in the ear. The last cell is tapped (Gb F), then
    // the SAME tap again, later and unsure (Gb F, softer, off the grid): the finger hovers; the PLACE is withheld. A soft
    // pulse stays (pizz Bb ghosts, shaker at half level, the tambourine clicks on 2 and 4 where the digit should land).
    P('Gb5', B(10), 0.55, 0.56); P('F5', B(10, 1.5), 0.5, 0.48);
    P('Gb5', B(10, 3.06), 0.42, 0.42); P('Gb5', B(10, 3.58), 0.6, 0.35);
    harp.chord(B(10), 0.6, ['Gb3', 'Cb4', 'Eb4'], 0.44, DRY);
    tuba.note(B(10), 1.5, 'Bb1', 0.56, { expr: [[0, 1], [0.6, 0.8], [1, 0.7]] });
    pizz.note(B(10), 0.8, 'Bb2', 0.56);
    pizz.note(B(10, 2), 0.5, 'Bb2', 0.3);
    pizz.note(B(10, 3), 0.6, 'Bb2', 0.38);
    pizz.note(B(10, 4.5), 0.5, 'F2', 0.46);
    pad(10, 1, 4, ['Bb2', 'Gb3', 'Cb4', 'Eb4'], 0.31, { brk: true, expr: [[0, 0.7], [0.4, 0.9], [1, 0.85]], tag: 'tension' });
    tamb.hit(B(10, 2), 0.5, 0.55); tamb.hit(B(10, 4), 0.5, 0.57);
    for (let i = 0; i < 8; i++) shak.hit(B(10, 1 + i / 2), 0.25, i % 2 ? 0.26 : 0.18);
    // bar 11 Bb -> Bb7: the PLACE, late: Bb5 on the downbeat (the piano first, the harp rolls after it, the completion
    // thump), the celesta rings F6. The D natural is the piano's (and later the walk's) alone: the pad and the roll are
    // open fifths. On 3& the harp rings Ab4 D5 high (Bb7), the D falling to Db in bar 12.
    P('Bb5', B(11), 2.6, 0.72); P('D5', B(11), 1.9, 0.32);
    harp.chord(B(11, 1.08), 2, ['F3', 'Bb3', 'F4'], 0.26, { strum: 0.06 });
    thump(11, 1, 'Bb1', 0.5);
    ping(11, 1.5, 'F6', 1, 0.3);
    harp.chord(B(11, 3.5), 1.2, ['Ab4', 'D5'], 0.32);
    for (const b of [1.5, 2.5, 3.5]) tamb.hit(B(11, b), 0.4, 0.28, { stroke: 'shake' });
    walk(11, ['Bb1', 'F2', 'D2', 'Ab2'], { v: 0.55, pizzOff: [4], tv: { 1: -0.04 }, pvb: { 1: -0.07, 2: -0.05, 3: -0.04 } });
    pad(11, 1, 3, ['F3', 'Bb3', 'F4'], 0.3);
    pad(11, 4, 1, ['F3', 'Ab3', 'D4'], 0.3, { expr: HOLD });
    groove(11, {});
    // bar 12 Gb -> Cb7: the light dims (D -> Db); off-beat dyads (a comping bar) lead A -> Bb and Cb -> Bb over the
    // seam; the pad voices move Gb -> F, A -> Bb, Eb -> Db into bar 1 and the walk steps Cb2 -> Bb1 (D2). The ONLY
    // A natural of the loop (the German-sixth colour) lives here; the celesta's A5 leans into the bar-1 Bb4.
    harp.chord(B(12), 1.5, ['Gb3', 'Bb3', 'Db4', 'Gb4'], 0.46, { strum: 0.035 });
    harp.note(B(12, 2.5), 0.6, 'Db4', 0.43, DRY);
    comp(B(12, 3.5), ['A3', 'Eb4'], 0.48);
    comp(B(12, 4.5), ['Gb3', 'Cb4'], 0.46);
    walk(12, ['Gb2', 'Db2~', 'Eb2', 'Cb2'], { v: 0.57, slur: [2] });
    pad(12, 1, 2, ['Gb3', 'Bb3', 'Db4'], 0.33);
    ping(12, 2.5, 'Db6', 0.25, 0.22); ping(12, 4.5, 'A5', 0.25, 0.2);
    pad(12, 3, 2, ['Gb3', 'A3', 'Eb4'], 0.3, { gl: [0, 0.08, 0.09] });
    groove(12, { fill: true });

    s.length(B(BARS + 1));
  },
};
