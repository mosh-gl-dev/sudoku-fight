// tools/music/tracks/lobby.mjs
// "Parlour Clock": the ambient bed for the Home screen and the menus (stage-set PLAN.md, section 3).
// node tools/music/render.mjs lobby
//
// BRIEF (the owner): "a few sounds in the background, not really music, but something like that". So: no beat, no
// hook, no tune. The family of kibbitzer and caper (the Kugel band), but asleep: a harmonium that breathes in A, glass
// glints, a toy bell now and then, a far mandolin tremolo, and a parlour clock that ticks for a few seconds and stops
// (the only rhythm; a hint of the game's timer).
//
// GRID: 60 BPM, 4/4, so a beat = 1 s; 96.00 s, the whole file loops (tail wrap-around). The grid is for placing events
// only: nothing pulses on it except the clock groups.
// KEY: A, over an A3 pedal that never leaves the harmonium. The chords change at IRREGULAR places (6-11 s apart, so the
// change grid never becomes a pulse), crossfaded legato by the reeds (no bellows dip on a change):
//    0 A |  7 Bb/A | 16 A | 22 F/A | 32 E7sus4/A | 40 A(add9) | 51 Dmaj7/A | 58 Dm6/A | 64 E7sus4/A | 73 A(add9)
//   81 F#m7/A | 88 Dmaj7/A -> back to 0.
// THE SEMITONE COLOURS (the Kugel colour arrives at 7 s: every visit of the Home screen hears it):
//    7 s  Bb/A: C#4 E4 PLANE up a semitone to D4 F4 and the top falls C#5 -> Bb4 (D9, the Neapolitan bII over the
//         pedal; Bb4 -> A4 at 16 s). The toy bell sounds C#6 over it (A Bb C# D F: the Freygish augmented 2nd Bb-C#), later Bb5 -> A5 as
//         the turn lets go at 16 s (D2), while the tremolo pivots E5 -> F5 -> E5 (D7) an octave over the reeds, the
//         celli sigh F3 -> E3 (D3) and the clock ticks on Bb.
//   22 s  F/A: the third swap C#4 -> C4 (D8) with E4 -> F4; at 32 s F4 -> E4 (D3) under E7sus4, the bell sighs
//         F6 -> E6 across the change; the celli lament E3 D3 C#3 (D5) into A(add9).
//   58 s  Dm6/A: F#4 -> F4 (the borrowed minor iv, D10/D8), then F4 -> E4 (D3) at 64 s; the tremolo laments
//         F#5 F5 E5 an octave over it (D5) and the celli join on F3 -> E3.
//   seam  Dmaj7/A -> A: D4 -> C#4 (the 4-3) and F#4 -> E4 inside a legato crossfade; the top C#5 and the pedal are held
//         across. The harmonium's C#4 and E4 attack at 0.0 s (as every chord change does; there is no other onset in
//         the first or last 2 s), the celli F#3 + A2 are held across the seam and step to E3 at 2.6 s.
//
// LAYERS (all soft; events are spaced so that no two attacks coincide)
//   1 harmonium: accordion, dry (wet 0.1, 2 reeds), four real fingers: a pitch that stays into the next chord is held,
//     a moving voice slides off with a 0.3 s overlap. The A3 pedal is re-taken only twice, at two bellows reversals
//     (5.9 s and 55.6 s), with a 0.15 s breath, never doubled. THE BELLOWS are independent of the chords: 7 reversals
//     at irregular places, each with its own depth (0.58-0.9) and width (0.5-1.6 s), and a slow swell in between.
//     TWO REAL RESTS: at 44-51 s the reeds thin to A3 + C#4 and at 76.5-81 s to A3 + E4 (about -6 dB), and the
//     glass, a bell and a pizz speak almost alone. Inner voices panned apart. Voiced A3-D5 (phone-safe warmth).
//   2 low warmth: celli con sordino, mono: long swells and legato sighs; a pizz A1 + celli A2 five times per loop
//     (the bass of the brief's "very sparse pizz warmth"; one on E under E7sus4), loud enough to survive a phone.
//   3 glass: glassPad dyads, 11 per loop, every roll different (0-120 ms, up or down or together, hand-set velocities).
//   4 toy bells: celesta single notes or 2-note semitone sighs (never a tune of 3), 13 per loop; the first note of a
//     sigh is dry (its own bus), so the delay echo never smears it into a cluster.
//   5 the parlour clock: 4 groups of 5-6 seconds (about every 18-22 s) of an OCTAVE tick-tock (B5 / B4, Bb in the Bb
//     turn), a damped marimba with a dry wooden click on the tick and one closed zil clack per group: an object, not
//     a tune. Never in the rests.
//   6 a far mandolin tremolo (Kugel's soft, slightly sharp tremolo, +15 c), twice per loop, as the pivot of the turns,
//     always an octave over the reed that holds its pitch (never a unison).
// ANTI-COPY: the clock's intervals are -12/+12 (not Rabbi Nuchem's bouncing E5/A4); no C -> B sigh anywhere (Rabbi
// Nuchem's coda, caper's CALL); no melodic line of more than 3 notes; the tremolo lament F#-F-E is 3 semitones.
// AVOID: a beat, kick, bass line, hook, whistle, theremin, tambourine, any held note above E6, any edge at the seam.
// DEVIATIONS FROM PLAN.md section 3 (gate round 2): the chords change at irregular places (not every 8 s) and the cycle
// starts on A -> Bb/A, so the semitone colour comes at 7 s; chord 8 is Dm6/A (no C -> B sigh over E); the harmonium is
// bright 0.9 (the top is opened by the glints and the master, not by the reeds); the clock is an octave tick-tock on B
// in 4 groups (18-22 s apart), not E5/A4; there are two real rests where the reeds thin to two voices.
// MASTER: -20 LUFS integrated (quieter than the game cues on purpose), true peak <= -3 dBTP, mono low end, a 15 kHz
// low-pass, +3.5 dB at 3.5 kHz and +2.5 dB above 9 kHz for the glints (the reed bed itself stays under 8 kHz, with
// notches on the pedal's 0.88 / 1.32 / 2.64 kHz partials); reverb 2.2 s with a 170 Hz high-pass (the low end stays mono).
// Set check 2026-11-27: Bb/A voiced A3 D4 F4 Bb4 again (was Dm/A), glass -2 dB, clock -3 dB, zil -2 dB; now
// -20.0 LUFS, -6.9 dBTP, LRA 3.2, corr 0.59, L-R +0.9 dB, the loudest 400 ms block 3.2 dB over the median.
// Measured (gate round 2): -20.0 LUFS, -5.4 dBTP, LRA 3.5, 0 clicks, 0 gaps, 150 Hz HP loss 0.1 LU, corr 0.58 (side/mid
// -5.6 dB), presence -24.3 / air -37.3 dB, centroid 530 Hz, harshness -23 dB; seam jump 0.51x, level 0.85 dB, spectral
// 2.6 dB. Stems (pre-master): harmonium -32.1, glass -34.6, celesta -36.3/-37.9, clock -37.5 (after HP 150 the same),
// tremolo -37.9, pizz -38.7, celli -39.0, zil -47.4 LUFS. Anti-copy script: no line shares more than 3 intervals with
// any hook.

const CH = [
  // [start s, name, harmonium voicing (midi): pedal, low, middle, top]
  [0, 'A', [57, 61, 64, 73]],          // A3 C#4 E4 C#5
  [7, 'Bb/A', [57, 62, 65, 70]],       // A3 D4 F4 Bb4    (C#4 E4 plane up a semitone, the top falls C#5 -> Bb4: the bII is heard)
  [16, 'A', [57, 61, 64, 69]],         // A3 C#4 E4 A4    (back down; the top settles)
  [22, 'F/A', [57, 60, 65, 69]],       // A3 C4 F4 A4     (C# -> C, E -> F)
  [32, 'E7sus4/A', [57, 62, 64, 71]],  // A3 D4 E4 B4     (F -> E)
  [40, 'A(add9)', [57, 61, 64, 71]],   // D -> C#
  [51, 'Dmaj7/A', [57, 62, 66, 73]],   // A3 D4 F#4 C#5
  [58, 'Dm6/A', [57, 62, 65, 71]],     // A3 D4 F4 B4     (F# -> F, C# -> B)
  [64, 'E7sus4/A', [57, 62, 64, 71]],  // F -> E
  [73, 'A(add9)', [57, 61, 64, 71]],   // D -> C#
  [81, 'F#m7/A', [57, 61, 66, 69]],    // E -> F#, B -> A
  [88, 'Dmaj7/A', [57, 62, 66, 73]],   // C# -> D, A -> C#; then D -> C#, F# -> E at the seam
];
const LEN = 96;
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midiOf = (p) => (typeof p === 'number' ? p : 12 * (+p.slice(-1) + 1) + NOTE[p[0]] + (p[1] === '#' ? 1 : p[1] === 'b' ? -1 : 0));
const mod = (t) => ((t % LEN) + LEN) % LEN;
const chordIdx = (t) => { const u = mod(t); let i = CH.length - 1; while (CH[i][0] > u) i--; return i; };
const chordAt = (t) => CH[chordIdx(t)][2];
// the semitone colours are meant: a note that rubs a semitone (or a major 7th / minor 9th) against the harmonium chord
// under it is tagged 'tension' for the linter
const rubs = (m, chord) => chord.some((c) => c !== m && [1, 11].includes((((m - c) % 12) + 12) % 12));
const tagAt = (t, p) => (rubs(midiOf(p), chordAt(t)) ? { tag: 'tension' } : {});

// ---------------------------------------------------------------- the bellows (independent of the chords)
// reversals: [time, depth (level at the turn), width (s)]; between them one slow swell, its own height each time
const REV = [[5.9, 0.6, 1.2], [19.4, 0.84, 0.6], [30.4, 0.7, 1.4], [41.6, 0.9, 0.5], [55.6, 0.58, 1.6], [67.3, 0.8, 0.8], [86.4, 0.72, 1.1]];
const SWELL = [0.97, 0.93, 1, 0.95, 0.99, 0.94, 0.96];
const cyc = (a, b) => { const d = Math.abs(mod(a) - mod(b)); return Math.min(d, LEN - d); };
function bellows(t) {
  const u = mod(t);
  let i = REV.length - 1;
  while (i >= 0 && REV[i][0] > u) i--;
  if (i < 0) i = REV.length - 1;
  const a = REV[i][0], b = REV[(i + 1) % REV.length][0] + (i + 1 === REV.length ? LEN : 0);
  const x = mod(u - a) / (b - a);
  let lvl = 0.84 + (SWELL[i] - 0.84) * Math.pow(Math.sin(Math.PI * x), 0.8);
  for (const [r, lo, w] of REV) lvl *= 1 - (1 - lo) * Math.exp(-0.5 * (cyc(t, r) / (w / 2.5)) ** 2);
  return lvl;
}
// the two rests: [fade-out start, silent from, silent to, fade-in end, the voices that drop out]; the voices come back
// on the chord they left (a breath in) and move at the next change (51 s, 81 s)
const RESTS = [[41.8, 44, 49.6, 52, [2, 3]], [74.3, 76.5, 80, 82.4, [1, 3]]];
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
// the level of the reeds that stay during a rest (all of them thin a little: about -2.2 dB)
function restAtten(t) {
  let g = 1;
  for (const [a, s0, s1, b] of RESTS) {
    const u = mod(t);
    if (u >= a && u <= b) g *= 1 - 0.22 * (u < s0 ? smooth((u - a) / (s0 - a)) : u > s1 ? 1 - smooth((u - s1) / (b - s1)) : 1);
  }
  return g;
}
// the fade of a voice that drops out
function voiceFade(v, t) {
  const u = mod(t);
  for (const [a, s0, s1, b, vs] of RESTS) {
    if (!vs.includes(v)) continue;
    if (u >= a && u < s0) return 1 - smooth((u - a) / (s0 - a));
    if (u >= s0 && u < s1) return 0;
    if (u >= s1 && u < b) return 0.06 + 0.94 * smooth((u - s1) / (b - s1));
  }
  return 1;
}

export default {
  id: 'lobby',
  title: 'Parlour Clock',
  bpm: 60,
  loop: true,

  build(s) {
    s.meter(4, 4);
    s.reverb({ rt60: 2.2, predelay: 0.02, damping: 0.6, early: 0.3, hp: 170, wet: 1 });
    s.room('room');
    s.delay({ beats: 0.75, feedback: 0.24, damp: 3200, pingpong: true, toReverb: 0.3 });
    s.master({
      lufs: -20, ceiling: -3.2,
      eq: [
        { type: 'lowshelf', f: 120, q: 0.7, gain: -1 },
        { type: 'peak', f: 3500, q: 0.7, gain: 3.5 },
        { type: 'highshelf', f: 9000, q: 0.7, gain: 2.5 },
        { type: 'lp', f: 15000 },
      ],
      glue: { threshold: -26, ratio: 1.4, attack: 0.05, release: 0.6, knee: 10 },
      tail: 16,
    });
    s.humanize = { time: 0.012, vel: 0.05 };
    const B = (beat) => beat;   // the grid IS seconds: beat = s

    // ---------------------------------------------------------------- buses
    const busAcc = s.bus('harmonium', { gain: -7.5, width: 1.4, reverb: 0.36, room: 0.1,
      eq: [{ type: 'hp', f: 120 }, { type: 'peak', f: 500, q: 1, gain: -1.5 }, { type: 'peak', f: 880, q: 4, gain: -3.5 }, { type: 'peak', f: 1320, q: 4, gain: -3 },
        { type: 'peak', f: 2640, q: 4, gain: -2 }, { type: 'lp', f: 8000 }] });
    const busCello = s.bus('celli', { gain: -6.5, pan: 0, width: 0.15, reverb: 0.14, room: 0.05,
      eq: [{ type: 'hp', f: 55 }, { type: 'peak', f: 240, q: 0.9, gain: 1.5 }] });
    const busPizz = s.bus('pizz', { gain: -8, width: 0, room: 0.1, reverb: 0.06, eq: [{ type: 'hp', f: 45 }, { type: 'peak', f: 240, q: 1.2, gain: 4 }, { type: 'lp', f: 5000 }] });
    const busGlass = s.bus('glass', { gain: -6, reverb: 0.36, delay: 0.06, width: 1.45, eq: [{ type: 'highshelf', f: 5000, q: 0.7, gain: 5 }] });
    const busCel = s.bus('celesta', { gain: -0.5, width: 1.45, reverb: 0.32, delay: 0.2,
      eq: [{ type: 'peak', f: 2600, q: 0.9, gain: 1.5 }, { type: 'highshelf', f: 6000, q: 0.7, gain: 3 }] });
    const busCelD = s.bus('celesta dry', { gain: -0.5, width: 1.45, reverb: 0.32,
      eq: [{ type: 'peak', f: 2600, q: 0.9, gain: 1.5 }, { type: 'highshelf', f: 6000, q: 0.7, gain: 3 }] });
    const busClock = s.bus('clock', { gain: -2.5, pan: -0.3, width: 0.8, room: 0.08, reverb: 0.08,
      eq: [{ type: 'hp', f: 400 }, { type: 'peak', f: 2500, q: 1, gain: 3 }, { type: 'lp', f: 12000 }] });
    const busZil = s.bus('zil', { gain: 1, pan: -0.35, room: 0.1, eq: [{ type: 'peak', f: 3500, q: 0.8, gain: -3 }, { type: 'lp', f: 9000 }] });
    const busTrem = s.bus('tremolo', { gain: -4.5, pan: 0.4, width: 0.7, reverb: 0.3, room: 0.06, eq: [{ type: 'hp', f: 200 }] });

    // ---------------------------------------------------------------- parts
    const acc = s.part(busAcc, 'accordion', { wet: 0.1, reeds: 2, musette: 8, bright: 0.9, spread: 1.2, attack: 0.35, release: 0.4, name: 'harmonium' });
    const cello = s.part(busCello, 'stringsEnsemble', { section: 'celli', sordino: true, vibrato: 0.6 });
    const pizzB = s.part(busPizz, 'contrabassPizz', { bright: 0.85 });
    const pizzC = s.part(busPizz, 'stringsPizzicato', { section: 'celli', players: 2, bright: 0.9 });
    const glass = s.part(busGlass, 'glassPad', { split: 0.7, bright: 1, decayDb: 5 });
    const cel = s.part(busCel, 'celesta', { bright: 1 });
    const celD = s.part(busCelD, 'celesta', { bright: 1 });
    const clock = s.part(busClock, 'marimba', { damp: true, humanize: { time: 0.004, vel: 0.03 } });
    const click = s.part(busClock, 'shaker', { decay: 0.45, bright: 0.8, spread: 0.2, humanize: { time: 0.004, vel: 0.03 } });
    const zil = s.part(busZil, 'fingerCymbals', { damp: true });
    const trem = s.part(busTrem, 'pluck', { tremolo: true, tone: 'soft', sharp: 15 });

    // ---------------------------------------------------------------- 1 the harmonium
    const VPAN = [0.05, -0.5, 0.5, -0.2];   // a stereo pair on the reed board: the inner voices apart
    const OV = 0.3, STEP = 0.25;
    const exprOf = (v, t0, t1, tail) => {
      const pts = [], dur = t1 - t0;
      for (let t = t0; t < t1 - (tail ? OV : 0) - 1e-6; t += STEP) pts.push([(t - t0) / dur, bellows(t) * restAtten(t) * voiceFade(v, t)]);
      const te = t1 - (tail ? OV : 0);
      const le = bellows(te) * restAtten(te) * voiceFade(v, te);
      pts.push([(te - t0) / dur, le]);
      if (tail) pts.push([1, 0.4 * le]);
      return pts.map(([x, y]) => [+x.toFixed(4), +Math.max(0, y).toFixed(4)]);
    };
    const tension = (m, t0, t1) => {
      for (let t = t0; t < t1; t += 1) if (rubs(m, chordAt(t))) return { tag: 'tension' };
      return {};
    };
    // the pedal: held, re-taken only at the two deep bellows reversals (a 0.15 s breath, never two A3 reeds at once)
    for (const [a, b] of [[5.9, 55.6], [55.6, 5.9 + LEN]]) {
      const t1 = b - 0.15;
      acc.note(B(a), t1 - a, 57, 0.31, { expr: exprOf(0, a, t1, false), pan: VPAN[0], exact: true });
    }
    // the upper voices: one note per run of equal pitch, cut by the rests
    for (let v = 1; v < 4; v++) {
      const bounds = new Set();
      CH.forEach(([t, , ch], i) => { if (ch[v] !== CH[(i + CH.length - 1) % CH.length][2][v]) bounds.add(t); });
      for (const [, s0, s1, , vs] of RESTS) if (vs.includes(v)) { bounds.add(s0); bounds.add(s1); }
      const bl = [...bounds].sort((x, y) => x - y);
      const silent = (t) => RESTS.some(([, s0, s1, , vs]) => vs.includes(v) && mod(t) >= s0 && mod(t) < s1);
      for (let i = 0; i < bl.length; i++) {
        const a = bl[i], b = i + 1 < bl.length ? bl[i + 1] : bl[0] + LEN;
        if (silent(a)) continue;
        const nextSilent = silent(b);
        const t1 = nextSilent ? b + 0.05 : b + OV;
        const m = chordAt(a)[v];
        acc.note(B(a + 0.02 * v), t1 - a - 0.02 * v, m, 0.34, { expr: exprOf(v, a + 0.02 * v, t1, !nextSilent), pan: VPAN[v], ...tension(m, a, b) });
      }
    }
    s.section('the turns', B(0), B(41.8), 'gentle');
    s.section('first rest', B(41.8), B(52), 'gentle');
    s.section('the minor iv', B(52), B(74.3), 'gentle');
    s.section('second rest', B(74.3), B(82.4), 'gentle');
    s.section('home', B(82.4), B(96), 'gentle');

    // ---------------------------------------------------------------- 2 low warmth (celli con sordino, mono)
    const swell = [[0, 0], [0.35, 1], [0.7, 0.85], [1, 0]];
    const IN = [[0, 0], [0.5, 0.9], [1, 1]], OUT = [[0, 1], [0.45, 0.85], [1, 0]];   // a legato line's first and last segment
    // across the seam: A2 + F#3 under Dmaj7/A, the F#3 steps to E3 2.6 s into the next pass (folded onto the start)
    cello.note(B(79.5), 23.5, 'A2', 0.27, { expr: [[0, 0], [0.2, 0.8], [0.45, 0.62], [0.7, 0.9], [1, 0]] });   // fills the end of the second rest
    cello.play(B(88.6), 'F#3:10', { vel: 0.31, legato: true, expr: IN });
    cello.play(B(98.6), 'E3:6', { vel: 0.31, legato: true, expr: OUT });
    // the Bb turn: F3 (b6, the 5th of Bb) sighs to E3 as the harmony falls back (D3)
    cello.play(B(9.5), 'F3:8.1', { vel: 0.32, legato: true, expr: IN, tag: 'tension' });   // held over the change: a b6 suspension
    cello.play(B(17.6), 'E3:5', { vel: 0.32, legato: true, expr: OUT });
    // F/A sits on A
    cello.note(B(23), 8.6, 'A2', 0.28, { expr: swell });
    // the lament E3 D3 C#3 (D5) over E7sus4 -> A(add9), fading into the first rest (no thirds below C3)
    cello.play(B(33), 'E3:4', { vel: 0.32, legato: true, expr: IN });
    cello.play(B(37), 'D3:3.8', { vel: 0.32, legato: true, expr: 'flat', tag: 'tension' });   // the 4-3 into A, late
    cello.play(B(40.8), 'C#3:5', { vel: 0.31, legato: true, expr: OUT });
    // under Dmaj7/A, then the minor iv sigh F3 -> E3 under the tremolo lament
    cello.note(B(48), 10.5, 'A2', 0.27, { expr: swell });   // under the end of the first rest
    cello.play(B(60.5), 'F3:4.3', { vel: 0.31, legato: true, expr: IN, tag: 'tension' });
    cello.play(B(64.8), 'E3:6', { vel: 0.31, legato: true, expr: OUT });

    // pizz: A1 + the celli A2 (louder: the octave a phone keeps), five per loop at irregular places; one on E (E7sus4)
    for (const [t, p1, p2, v] of [[13.2, 'A1', 'A2', 0.4], [28.6, 'A1', 'A2', 0.36], [47.6, 'A1', 'A2', 0.42], [67.8, 'E1', 'E2', 0.38], [84.3, 'A1', 'A2', 0.36]]) {
      pizzB.note(B(t), 1, p1, v * 0.75);
      pizzC.note(B(t + 0.012), 1, p2, v);
    }

    // ---------------------------------------------------------------- 3 glass glints
    // [time, [low, high], roll s (+ = bottom-up, - = top-down, 0 = together), low vel, high vel]
    const GL = [
      [4.4, ['A5', 'C#6'], 0.09, 0.3, 0.24],
      [11.6, ['F5', 'D6'], 0, 0.29, 0.26],
      [18.4, ['E5', 'B5'], -0.07, 0.27, 0.21],
      [27.2, ['F5', 'C6'], 0.11, 0.29, 0.2],
      [35.6, ['E5', 'B5'], 0.04, 0.28, 0.24],
      [44.4, ['E5', 'C#6'], 0.12, 0.33, 0.27],    // the first rest
      [56.0, ['D5', 'A5'], -0.06, 0.28, 0.24],
      [61.6, ['F5', 'D6'], 0.05, 0.28, 0.22],
      [69.6, ['B5', 'D6'], -0.08, 0.26, 0.2],
      [76.2, ['A5', 'E6'], 0.1, 0.31, 0.19],      // the second rest
      [86.2, ['F#5', 'C#6'], 0, 0.28, 0.25],
    ];
    for (const [t, [lo, hi], roll, vl, vh] of GL) {
      const tl = roll < 0 ? t - roll : t, th = roll > 0 ? t + roll : t;
      glass.note(B(tl), 3, lo, vl, tagAt(tl, lo));
      glass.note(B(th), 3, hi, vh, tagAt(th, hi));
    }

    // ---------------------------------------------------------------- 4 toy bells
    // [time, pitch, vel, pan, dry]: dry = the first note of a semitone sigh (no echo under its resolution)
    const BELL = [
      [9.8, 'C#6', 0.27, -0.45],                         // over Bb/A: the augmented 2nd Bb-C#
      [14.6, 'Bb5', 0.3, 0.4, true], [16.1, 'A5', 0.23, 0.15],   // b2 -> 1 as the turn lets go (D2)
      [20.6, 'F#5', 0.27, -0.3],
      [24.6, 'A5', 0.26, 0.5],
      [30.9, 'F6', 0.27, -0.25, true], [32.2, 'E6', 0.21, -0.45],  // b6 -> 5 across the change (D3)
      [38.4, 'D6', 0.25, 0.3],
      [46.4, 'G#5', 0.26, -0.4],                         // the maj7, alone in the first rest
      [52.9, 'D6', 0.28, 0.45, true], [54.1, 'C#6', 0.22, 0.2],    // root -> maj7 over Dmaj7
      [66.8, 'B5', 0.26, -0.35],
      [77.6, 'C#6', 0.27, 0.35],                         // in the second rest
      [82.6, 'E6', 0.24, -0.2],
      [91.2, 'A5', 0.25, 0.4],
    ];
    for (const [t, p, v, pan, dry] of BELL) (dry ? celD : cel).note(B(t), dry ? 1.1 : 1.5, p, v, { pan, ...tagAt(t, p) });

    // ---------------------------------------------------------------- 5 the parlour clock
    // [start, ticks]; an octave tick-tock: tick on even indices (high + a dry wooden click), tock (an octave down) on
    // odd ones; one closed zil clack on the middle tock. Bb while the harmony is turned to Bb, B otherwise.
    const GROUPS = [[10.5, 6], [33.5, 5], [59, 6], [82.5, 5]];
    for (const [t0, k] of GROUPS) {
      const pc = chordAt(t0).includes(62) && chordAt(t0).includes(65) && chordAt(t0)[3] === 70 ? 'Bb' : 'B';
      const mid = 2 * Math.floor((k - 1) / 4) + 1;
      for (let i = 0; i < k; i++) {
        const t = t0 + i, u = (i + 0.5) / k;
        const env = Math.sin(Math.PI * u);           // in and out inside the group
        const v = 0.2 + 0.16 * env;
        if (i % 2 === 0) {
          clock.note(B(t), 0.1, pc + '5', v);
          click.hit(B(t + 0.004), 0.05, 0.09 + 0.06 * env);
        } else {
          clock.note(B(t), 0.14, pc + '4', v * 0.9);
          if (i === mid) zil.hit(B(t + 0.01), 0.08, 0.24 + 0.08 * env, { damp: true });
        }
      }
    }

    // ---------------------------------------------------------------- 6 the far tremolo (the pivot), octaves over the reeds
    trem.note(B(3.2), 4.4, 'E5', 0.3, { expr: [[0, 0.15], [0.6, 0.9], [1, 1]] });
    trem.note(B(7.6), 9.0, 'F5', 0.34);                // D7: the pivot steps up with the bII ...
    trem.note(B(16.6), 5, 'E5', 0.3, { expr: [[0, 1], [0.5, 0.75], [1, 0.05]] });   // ... and falls back
    trem.note(B(52.5), 5.8, 'F#5', 0.3, { expr: [[0, 0.2], [0.5, 0.9], [1, 1]] });
    trem.note(B(58.3), 6, 'F5', 0.36);                 // the lament F# F E (D5) over Dmaj7 -> Dm6 -> E7sus4
    trem.note(B(64.3), 5.2, 'E5', 0.31, { expr: [[0, 1], [0.5, 0.7], [1, 0.05]] });

    s.length(LEN);
  },
};
