// tools/music/tracks/stage_find.mjs
// "Sonar": the staged-practice cue for the FIND stages (Pinpoint: find the one cell where a digit must go in a box,
// row or column; a quick tap, thinking). Part of the stage-cue set (scratchpad music/stage-set/PLAN.md, 2.2).
// node tools/music/render.mjs stage_find
//
// CONCEPT: the sonar sends a ping, the eye sweeps a row in two short waves; the second wave repeats the first a step
// higher but reaches ONE CELL TOO FAR (the b2, Bb) and drops a semitone onto the tonic: THERE. The scan down lands on a
// wrong cell (C over F) until the floor moves under it; the quick scan finds a NEW note (the major third). A true
// find gets a halo (glass a moment late + a celesta return). The shaker is the eye: a hand that leans into beats 1 and 3 while it scans
// and stops dead where the vibes strike. Airy, no kick, the most "thinking" cue of the set.
//
// Revision 5 (gate round 4 follow-up, composition only; the set-check mix fixes below are kept as they were):
// - FOUR DIFFERENT CADENCES. Round 4 resolved every phrase the same way (Bb -> A onto A: bar 3, bar 7, bar 9 and the
//   seam bass). Now each landing has its own target, approach and rhythm:
//     bar 3   A5 from Bb5 ABOVE, by a semitone, on the downbeat after a quarter: the overshoot, the cue's identity (kept).
//     bar 7   C5 over F (bass F2), from D5 above by a WHOLE step, the wave a beat late, square on the downbeat: a
//             DECEPTIVE landing on bVI (a wrong cell, not a wrong note). Bar 8 moves the floor back to Am under the
//             same pitch class (celesta C6, glass A E): the cell was right, the board moved (a common-tone turn).
//     bar 9   C#6 from C6 BELOW, by a semitone, an 8th early: the overshoot shape (+5 +3) from E5, but the semitone
//             now goes UP, minor third -> major third (D8 in the line, the pad turns with it): the Picardy find.
//     seam    E7b9 (the Freygish V) -> Am: bass E2 E2 B2 G#2 -> A2 from BELOW (D4), pad A3 -> G#3 and C4 -> B3 in bar
//             12 then B3 -> C4, the cello F4 -> E4 (the b9 sighs onto the root, D3) and D4 (the 7th) falling off into
//             the bar-1 C5 (7th -> 3rd). The Bb now lives only in the overshoot and the Gm/A colour of bar 6.
// - Bar 5: the echo rises a third (F5, the mirror of wave 1's falling third), so wave 2 (G5 D5 C5) starts a step
//   above it. Bar 9 wave 1 recalls the opening (C5 F5) with its top bent down (F5 -> E5); the old C#5 start is gone,
//   the C# is saved for the find. Bar 7's "doubt" is the band's (viola + pad F4 -> E4, bass F2 -> E2), not the lead's.
// - Tuba: E2 marcato + a soft B1 in bar 12 (was the Bb1 lean); violas pizz: Am roll in bar 9, E7 in bar 12, the seam
//   dyad G#3 F4 (-> A3 E4).
//
// Revision 4 (gate round 3):
// - KEY: A Phrygian over an A pedal (was F#: the same notes as kibbitzer's B minor, with its G -> F# sigh). The cue now
//   lives in the A Bb C D E F G collection (no other stage cue uses it as Phrygian; A at 92 is not a score pair), the
//   bass pedal is A2 (110 Hz, reads on a phone), the overshoot is Bb5 -> A5 and the twist is A major (C -> C#).
// - The bed is no accordion any more (the set gives the accordion to hunter): the pad is a muted viola section
//   (sordino, legato, phrased with the waves), the bed-bar voice is a solo cello with a scoop and a fall-off (D12).
// - Bar 9 QUICK: the second wave is now a diminished climb E5 G5 Bb5(16th) A5 (+3 +3 -1, an A7b9 lick), so the twist
//   bar has no avoid note and the +5 +3 -1 shape (shared with duel/chain) is heard only once per loop.
// - Bar 1: the second vibes note is a damped 8th and the halo enters on beat 2 (no semitone smear at GO, no clash with
//   the GO sound's tail). Bar 12: the cello's #11 (E4 over Bb) is a passing 8th. Bar 8 -> 9: the pad moves D4 G4 ->
//   C#4 E4 (no Bb -> A in the pad: the b2 fall stays the melody's and the seam bass's).
// - Groove played, not sequenced: the shaker bus only catches peaks (each sweep rises >= 6 dB), the sweeps are curved,
//   start at 1& or 2 and peak differently; the pizz bass bus lets the pluck through (accents vs ghosts ~5 / ~10 dB),
//   with rests and passing notes; the viola comp changes per wave; the halos enter at different moments.
// - Tuba: marcato A2 (+ a soft A1) on the 4-bar heads, one Bb1 lean in bar 12, nothing across the seam.
// - Mix: brighter and lighter (master tilt, jingles up, wider plucks, less plate and ping-pong, softer motor).
//
// Set check 2026-11-27 (mix only): the image is centred (lead/celesta/cello/pad/shaker pans; L-R -1.83 -> +0.13 dB),
// the viola comp is no longer double-widened (bus width 1.6 -> 1.0, pans +-0.7 -> +-0.5: comp corr -0.35 -> +0.34),
// master -2.5 dB at 720 Hz and +2.5 dB at 3.2 kHz (presence -19.2 -> -15.7 dB rel. total). Notes unchanged then.
//
// TEMPO / METRE: 92 BPM, 4/4, STRAIGHT (no swing anywhere: kibbitzer owns the half-swung 16th shaker). A bar =
// 2.609 s. 12 bars = 31.30 s, the whole file loops (stages of 6-60 s; the app fades it in 0.5 s at the stage end).
// KEY: A Phrygian over an A pedal, the bII (Bb) as the overshoot, a bVI deceptive "almost", a Picardy find (C#) and
//   a Freygish V (E7b9) at the seam:
//   1 Am | 2 Dm/A | 3 Am | 4 Am -> F/A on 3 | 5 Dm/A | 6 Gm/A | 7 F (bass F2: the wrong cell) | 8 Am -> Gm/A on 3
//   | 9 Am -> A on 4& | 10 A MAJOR | 11 F/A | 12 E7b9 (bass E2 .. G#2, the seam)
//
// MOTIFS (our own; checked by script against STYLE.md section 3, the Mori/Schvitz lists, kibbitzer's TICK/CALL/RIFF
// and caper's hooks, by intervals AND by pitch runs, and against the other stage cues)
//   PING  (1/1)  celesta A6 with the first vibes note: the sonar sends; the glass answers on beat 2.
//   SCAN  (1-2-3/1)  C5 F5 G5~ _ E5~ | _ _ _ _ D5 G5 Bb5^ | A5     cell = 8th 8th quarter, +5 +2; the echo falls a
//                third; the second wave is the cell a step higher, but its top overshoots by a semitone (+5 +3: Bb5
//                instead of A5, a b9 against the pedal) and drops onto A5 on the downbeat (D2: the find, 5.2 s).
//   SCAN DOWN (5-6-7)  A5 E5 D5~ _ F5~ | _ _ _ _ _ _ G5 D5 | C5~   the cell inverted (-5 -2), the echo rises a third;
//                its repeat comes a beat late and lands square on C5 over F (bass F2): one cell SHORT, a deceptive
//                bVI, approached by a whole step. Bar 8: the floor goes back to A under the same pitch class (celesta
//                C6, glass A4 E5): the cell was right.
//   QUICK (9-10/1)  C5 F5 E5~ _ E5 A5. C6(16th) C#6~   wave 1 recalls the opening with its top bent down (F5 -> E5,
//                D3); wave 2 is the overshoot shape (+5 +3) from E5, but the semitone goes UP: C6 -> C#6 an 8th
//                EARLY (D8 in the line; the pad turns C4 -> C#4 with it): found faster, on a new note. A major
//                landing (Picardy); C# falls back to C in bar 11 (pad, D8).
//   CELLO (4, 12)  4: E4 (taken over from the pad) ~ F4 on 3 (D7: it leans into the F chord), a fall-off at the end;
//                12: over E7b9, a scoop into F4 (the b9) -> E4 (D3) -> D4 (the 7th, falls off) -> the bar-1 C5.
// SEMITONE DEVICES: D2 (Bb5 -> A5, the overshoot), D8 (C6 -> C#6 in the line, C4 -> C#4 -> C4 in the pad), D7 (E -> F
// pivot, bar 4), D3 (F -> E sighs: bar 9 line, bar 7 viola + pad, bar 7 bass F2 -> E2, bar 12 cello), D4 (bass G#2 -> A2
// at the seam), D6 (contrary semitones at the seam: G#2 -> A2 against the seam dyad F4 -> E4), D12 (cello scoops and
// fall-offs), double semitone voice leading in the pad (bar 11 -> 12 A3 -> G#3 + C4 -> B3).
// SHAPE (3 + 1 | 3 + 1 | 2 + 2): scan bars 1-2, 5-6, 9; landing holds 3, 7, 10; bars 4, 8, 11 and 12 are bed (cello,
// pad, violas). The vibes sound in 8 of 12 bars (scan figures in 5, landing holds in 3); the cello is an inner voice
// in bar 4 and the hand-over in bar 12; bar 11 only has a two-note celesta return (the sonar echo).
//
// SOUND: vibes lead (soft mallets, a light motor, damped neighbours, short half-pedal overlaps inside a wave), glassPad
// halo (enters 25-70 ms after the vibes, never in unison, different length every time), celesta pings with a light
// dotted-8th ping-pong (the sonar return, the cue's one modern device), solo cello in the bed bars, pizz bass pedal
// phrased by a player (rests, passing notes, ghosts), tuba marcato on the 4-bar heads (E2 + a soft B1 in bar 12), violas
// pizz (wide L/C/R, a different comp per wave), a muted viola-section pad (sordino, legato, swelling with the waves and
// dipping on each landing), the shaker hand (curved 16th leans into beats 1 and 3 while the eye scans, silence on a
// landing, soft 16ths in the bed bars) and jingles in the bed bars plus one soft echo jingle after each true find.
// Dry and close: a small room on everything, a 0.55 s plate on the bells, a little on the vibes and the cello.

const BAR_COUNT = 12;
const HEADS = [1, 5, 9];                         // the bows change together only here
// the viola pad, as a chord timeline [bar, beat, pitches] (merged into legato voices below)
const PAD_T = [
  [1, 1, ['C4', 'E4']],
  [2, 1, ['D4', 'F4']],
  [3, 1, ['A3', 'C4', 'E4']],
  [4, 1, ['A3', 'C4']],                          // the E4 goes to the cello
  [5, 1, ['D4', 'F4']],
  [6, 1, ['D4', 'G4']],
  [7, 1, ['C4', 'F4']],
  [7, 4.5, ['C4', 'E4']],                        // the doubt: F4 -> E4 with the viola pizz
  [8, 1, ['A3', 'C4', 'E4']],
  [8, 3, ['D4', 'G4']],                          // Gm/A without Bb: D4 -> C4 and G4 -> E4 into bar 9
  [9, 1, ['A3', 'C4', 'E4']],                    // the quick wave starts in minor ...
  [9, 4.5, ['A3', 'C#4', 'E4']],                 // ... and turns major WITH the lead's C6 -> C#6 (D8)
  [11, 1, ['A3', 'C4', 'F4']],                   // C# falls back to C (D8); the F4 goes to the cello in bar 12
  [12, 1, ['G#3', 'B3', 'D5']],                  // E7b9 (the Freygish V): A3 -> G#3, C4 -> B3 (the D4 is the cello's)
];
// the violas pizz: three chord tones, low to high (the ripple)
const VLA = {
  Am: ['A3', 'C4', 'E4'], A: ['A3', 'C#4', 'E4'], Bb: ['Bb3', 'D4', 'F4'], F: ['A3', 'C4', 'F4'], Dm: ['A3', 'D4', 'F4'],
  Gm: ['Bb3', 'D4', 'G4'], E7: ['G#3', 'B3', 'D4'],
};
const HARM = [null, 'Am', 'Dm', 'Am', 'Am', 'Dm', 'Gm', 'F', 'Am', 'Am', 'A', 'F', 'E7'];
const SCAN_BARS = [1, 2, 5, 6, 9];
const LAND_BARS = [3, 7, 10];
const BED_BARS = [4, 8, 11, 12];
const ARC = [0.92, 1.0, 0.95, 0.86];             // the band's shape over each 4-bar phrase

export default {
  id: 'stage_find',
  title: 'Sonar',
  bpm: 92,
  loop: true,

  build(s) {
    s.meter(4, 4);
    s.reverb({ rt60: 0.55, predelay: 0.01, damping: 0.5, early: 0.35, wet: 1 });
    s.room('room');
    // the sonar return: a dotted-8th ping-pong on the bells only (the cue's one modern device), kept light
    s.delay({ beats: 0.75, feedback: 0.26, damp: 3200, pingpong: true, toReverb: 0.12 });
    s.master({
      lufs: -16, ceiling: -2.0,
      eq: [
        { type: 'lowshelf', f: 110, q: 0.7, gain: -1.5 },
        { type: 'peak', f: 300, q: 0.8, gain: -2.5 },
        { type: 'peak', f: 720, q: 0.9, gain: -2.5 },   // set check: less boxy mids (630-800 Hz)
        { type: 'peak', f: 1800, q: 0.7, gain: 1.5 },
        { type: 'peak', f: 3200, q: 0.8, gain: 2.5 },    // set check: presence back towards the set (2.5-5 kHz)
        { type: 'highshelf', f: 8000, q: 0.7, gain: 2 },
      ],
      glue: { threshold: -16, ratio: 1.5, attack: 0.01, release: 0.2, knee: 8 },
      width: 1.6,
    });
    s.humanize = { time: 0.005, vel: 0.05 };
    const B = (bar, beat = 1) => s.bar(bar, beat);
    const LOCK = { time: 0.003, vel: 0.04 };
    const arc = (bar) => ARC[(bar - 1) % 4];

    // ONE band: a smooth +-3 ms push/pull, a node every 2 bars, cyclic over the loop
    const ensR = s.rng('ensemble');
    const NODES = BAR_COUNT / 2;
    const dn = Array.from({ length: NODES }, () => (ensR() * 2 - 1) * 0.003);
    const drift = (beat) => {
      const x = beat / 8, i = Math.floor(x), f = x - i, w = (1 - Math.cos(Math.PI * f)) / 2;
      const a = dn[((i % NODES) + NODES) % NODES], b = dn[(((i + 1) % NODES) + NODES) % NODES];
      return a + (b - a) * w;
    };
    const feel = (part, role = 0) => {
      const orig = part.note.bind(part);
      part.note = (beat, dur, pitch, vel, o = {}) => {
        if (Array.isArray(pitch)) { for (const p of pitch) part.note(beat, dur, p, vel, o); return part; }
        return orig(beat, dur, pitch, vel, { ...o, _shift: (o._shift || 0) + role + drift(beat) });
      };
      return part;
    };

    // ---------------------------------------------------------------- buses
    const pres = (g = 2, f = 3000, q = 0.9) => ({ type: 'peak', f, q, gain: g });
    const busLead = s.bus('vibes', { gain: -3, pan: -0.12, width: 1.4, reverb: 0.06, room: 0.08,
      eq: [{ type: 'hp', f: 160 }, { type: 'peak', f: 420, q: 1, gain: -1.5 }, { type: 'peak', f: 880, q: 5, gain: -1.5 }, pres(2, 2400), { type: 'peak', f: 3520, q: 6, gain: -3 }, { type: 'peak', f: 3730, q: 6, gain: -2 }] });
    const busCello = s.bus('cello', { gain: -6, pan: -0.05, room: 0.1, reverb: 0.08,
      eq: [{ type: 'hp', f: 110 }, { type: 'peak', f: 300, q: 1, gain: -1.5 }, { type: 'peak', f: 1500, q: 1, gain: 2 }, { type: 'peak', f: 3300, q: 1, gain: -3.5 }, { type: 'lp', f: 7000 }] });
    const busGlass = s.bus('glass', { gain: -8, reverb: 0.3, delay: 0.06 });
    const busCel = s.bus('celesta', { gain: -4, pan: 0.1, width: 1.2, reverb: 0.22, delay: 0.3 });
    const busBass = s.bus('bass', { gain: -7, pan: 0, width: 0, room: 0.06,
      eq: [{ type: 'hp', f: 40 }, { type: 'lowshelf', f: 110, q: 0.7, gain: -1 }, { type: 'peak', f: 650, q: 1, gain: 2 }, pres(3.5, 1200, 1)],
      comp: { threshold: -16, ratio: 1.8, attack: 0.009, release: 0.08, knee: 6, makeup: 0 } });   // lets the pluck through
    const busTuba = s.bus('tuba', { gain: -14.5, width: 0, room: 0.08, eq: [{ type: 'hp', f: 36 }, { type: 'peak', f: 250, q: 1, gain: 3 }] });
    const busComp = s.bus('comp', { gain: -3, room: 0.08, width: 1.0, eq: [{ type: 'hp', f: 150 }, pres(3, 2800)],
      comp: { threshold: -24, ratio: 3, attack: 0.0003, release: 0.05, knee: 6, makeup: 0 } });   // holds the snap down, not up
    const busPad = s.bus('pad', { gain: -9.5, pan: -0.15, width: 1.3, room: 0.06,
      eq: [{ type: 'hp', f: 150 }, { type: 'peak', f: 260, q: 0.8, gain: -3 }, { type: 'peak', f: 1000, q: 0.9, gain: 1.5 }, { type: 'lp', f: 6000 }] });
    const busShk = s.bus('shaker', { gain: -2, pan: 0.05, width: 1.0,
      eq: [{ type: 'peak', f: 3000, q: 0.8, gain: -2.5 }, { type: 'peak', f: 4000, q: 0.9, gain: -3.5 }, { type: 'highshelf', f: 8000, q: 0.7, gain: -1 }, { type: 'lp', f: 11000 }],
      comp: { threshold: -16, ratio: 2, attack: 0.0025, release: 0.05, knee: 6, makeup: 0 } });   // a peak catcher only
    const busTamb = s.bus('tamb', { gain: 0, pan: -0.2, room: 0.06, delay: 0.1, width: 1.0,
      eq: [{ type: 'peak', f: 3500, q: 0.8, gain: -3.5 }] });

    // the eye rests in 11-12: the bed leans in a little so the seam is not a hole
    busPad.automate('gain', [[B(6, 4), 0], [B(7), 2], [B(8, 4.5), 2], [B(9), 0], [B(10), 0], [B(10, 2), 1], [B(11), 1], [B(12, 4.5), 1], [B(13), 0]]);
    busComp.automate('gain', [[B(7, 4), 0], [B(8), 2], [B(8, 4.5), 2], [B(9), 0], [B(10, 4), 0], [B(11), 2], [B(12, 4.5), 2], [B(13), 0]]);

    // ---------------------------------------------------------------- parts
    const vib = feel(s.part(busLead, 'vibraphone', { motor: 0.08, motorRate: 3, bright: 1.0, stereo: 0.75, pan: -0.17, name: 'vibraphone:lead' }));
    const cello = feel(s.part(busCello, 'soloCello', { humanize: { time: 0.01, vel: 0.04 } }), 0.008);
    const glass = feel(s.part(busGlass, 'glassPad', { split: 0.6, pan: 0.3 }));   // the halo spreads around the centre
    const cel = feel(s.part(busCel, 'celesta', { pan: -0.1 }));
    const bass = feel(s.part(busBass, 'contrabassPizz', { bright: 1.2, damp: true, humanize: LOCK }));
    const tuba = feel(s.part(busTuba, 'tuba', { growl: 0.2, bright: 1.25, humanize: LOCK }), 0.004);
    const vlaL = feel(s.part(busComp, 'stringsPizzicato', { section: 'violas', pan: -0.5, players: 2, bright: 0.82, name: 'pizz:L' }), 0.006);
    const vlaC = feel(s.part(busComp, 'stringsPizzicato', { section: 'violas', pan: 0, players: 2, bright: 0.82, name: 'pizz:C' }), 0.009);
    const vlaR = feel(s.part(busComp, 'stringsPizzicato', { section: 'violas', pan: 0.5, players: 2, bright: 0.82, name: 'pizz:R' }), 0.012);
    const pad = feel(s.part(busPad, 'stringsEnsemble', { section: 'violas', sordino: true, players: 4, name: 'violas sord:pad' }), 0.01);
    const shk = feel(s.part(busShk, 'shaker', { decay: 1.9, bright: 0.85, attack: 0.03 }));   // a soft egg, not a click
    const tamb = feel(s.part(busTamb, 'tambourine', { stroke: 'shake', spread: 0.6 }), 0.006);

    // ---------------------------------------------------------------- the pad, legato and phrased
    // each pitch is one held note for as long as the harmony keeps it; the bows change together only on the 4-bar
    // heads. The section breathes with the music: about +1.5 dB under each scan wave, a 2 dB dip on each landing (so
    // the halo speaks), and a small bow-pressure wobble (+-8 %, a node every 2 beats).
    const bR = s.rng('bows');
    const END = B(BAR_COUNT + 1, 1);
    const WOB = Array.from({ length: BAR_COUNT * 2 + 1 }, () => 1 + (bR() * 2 - 1) * 0.08);
    const env = (beat) => {
      const bar = Math.floor(beat / 4) + 1, inBar = beat / 4 + 1 - bar;
      let g = 1;
      if (SCAN_BARS.includes(bar)) g = 1 + 0.19 * Math.sin(Math.PI * Math.min(1, inBar * 1.1));
      if (LAND_BARS.includes(bar)) g = inBar < 0.5 ? 0.79 + 0.42 * inBar : 1;
      const k = beat / 2, i = Math.floor(k), f = k - i;
      return g * (WOB[i % WOB.length] + (WOB[(i + 1) % WOB.length] - WOB[i % WOB.length]) * f);
    };
    {
      const segs = PAD_T.map(([bar, beat, ps], i) => {
        const nx = PAD_T[i + 1];
        return { a: B(bar, beat), e: nx ? B(nx[0], nx[1]) : END, ps };
      });
      const open = new Map();   // pitch -> start beat
      const emit = (p, a, e) => {
        const bar = Math.floor(a / 4) + 1, len = e - a + 0.06;
        const top = p === 'D5';
        const v = (0.34 + 0.04 * bR()) * (0.94 + 0.06 * arc(bar)) * (top ? 0.78 : 1);
        const pts = [];
        const n = Math.max(2, Math.ceil(len));
        for (let j = 0; j <= n; j++) pts.push([j / n, +(env(a + (len * j) / n) * (j === 0 ? 0.85 : 1)).toFixed(3)]);
        pad.note(a, len, p, v, { expr: pts, pan: +p.slice(-1) < 4 ? -0.15 : 0.15 });
      };
      for (const sg of segs) {
        const isHead = HEADS.some((h) => B(h, 1) === sg.a);
        for (const [p, a0] of [...open]) {
          if (!sg.ps.includes(p) || isHead) { emit(p, a0, sg.a); open.delete(p); }
        }
        for (const p of sg.ps) if (!open.has(p)) open.set(p, sg.a);
      }
      for (const [p, a0] of open) emit(p, a0, END);
    }

    // the shaker sweeps, one hand: [start offset in the half bar, peak velocity] for the half bars into 3 and into 1;
    // a curved lean (it grows late), so it reads as a hand leaning in, not a riser
    const SWEEP = {
      1: [[0.5, 0.31], [0.5, 0.33]],
      2: [[1.0, 0.30], [0.5, 0.35]],
      5: [[0.5, 0.30], [1.0, 0.33]],
      6: [[1.0, 0.31], [0.5, 0.34]],
      9: [[0.5, 0.32], [1.0, 0.34]],
    };
    const sweep = (bar, hb, st0, peak, v0) => {
      const steps = [];
      for (let st = st0; st < 1.99; st += 0.25) steps.push(st);
      steps.forEach((st, i) => {
        const u = Math.pow(i / (steps.length - 1), 1.5);
        const vel = v0 * Math.pow(peak / v0, u);
        const late = (st * 4) % 2 ? 0.012 : 0;   // the "e"/"a" grains a touch late (a hand)
        shk.hit(B(bar, hb + st + late), 0.3, vel);
      });
    };

    for (let bar = 1; bar <= BAR_COUNT; bar++) {
      const h = HARM[bar], a = arc(bar), scan = SCAN_BARS.includes(bar), bed = BED_BARS.includes(bar), land = LAND_BARS.includes(bar);

      // ---- the pedal, phrased by a player (bar 7 leaves it: the miss; bar 12 is the bII); rests, passing notes,
      // ghosts well under the beat
      const BP = {
        1: 'A2:q.@.62 A2:e@.24 A2:q@.46 A2:q@.36',
        2: 'A2:q@.6 A2:e.@.36 A2:s@.24 A2:q@.5 _:e E2:e@.38',
        3: 'A2:h@.6 A2:q@.4 E2:q@.44',
        4: 'A2:q@.58 _:q A2:q@.5 E2:e.@.4 E2:s@.23',
        5: 'A2:q.@.62 A2:e@.24 A2:q@.47 A2:q@.35',
        6: 'A2:q@.6 A2:q@.33 A2:e.@.5 A2:s@.24 _:e G2:e@.38',
        7: 'F2:h@.62 F2:q@.42 E2:q@.44',
        8: 'A2:q@.6 A2:e.@.36 A2:s@.24 A2:q@.5 A2:e@.34 G2:e@.4',
        9: 'A2:q.@.62 A2:e@.24 A2:q@.48 _:e E2:e@.42',
        10: 'A2:h@.6 A2:q@.42 E2:q@.44',
        11: 'A2:q@.56 _:e A2:e@.22 A2:q@.48 A2:e@.33 A2:e@.4',
        12: 'E2:q@.6 E2:e.@.36 E2:s@.24 B2:q@.48 G#2:q@.46',   // the Freygish V walks up into the seam: G#2 -> A2
      };
      bass.play(B(bar), BP[bar].replace(/@([0-9.]+)/g, (m, x) => '@' + (parseFloat(x) * a).toFixed(3)), { gate: land ? 0.92 : 0.72 });

      // ---- the violas pizz: a different comp for each wave
      const v = VLA[h];
      if (bar === 1 || bar === 2) {                      // scan up: a low dyad on 2 (L), the top on 3& (R)
        vlaL.chord(B(bar, 2), 0.4, v.slice(0, 2), bar === 1 ? 0.34 : 0.3);
        vlaR.note(B(bar, 3.5), 0.4, v[2], bar === 1 ? 0.3 : 0.34);
        if (bar === 2) vlaL.chord(B(bar, 4.5), 0.35, v.slice(0, 2), 0.2);   // a ghost dyad, pushing to the find
      } else if (bar === 5 || bar === 6) {               // scan down: the dyad on 2&, the top on 4
        vlaL.chord(B(bar, 2.5), 0.4, v.slice(0, 2), bar === 5 ? 0.33 : 0.28);
        vlaR.note(B(bar, 4), 0.4, v[2], bar === 5 ? 0.27 : 0.32);
      } else if (bar === 9) {                            // quick: one roll L -> C -> R on 2 (still minor)
        vlaL.note(B(bar, 2), 0.4, VLA.Am[0], 0.32);
        vlaC.note(B(bar, 2.08), 0.4, VLA.Am[1], 0.3);
        vlaR.note(B(bar, 2.16), 0.4, VLA.Am[2], 0.33);
      } else if (bed) {                                  // the sonar sweep: low left, middle centre, top right
        const vv = bar === 4 ? VLA.F : bar === 8 ? VLA.Gm : v;
        const w = bar === 12 ? [0.34, 0.32, 0.3] : bar === 8 ? [0.36, 0.35, 0.33] : [0.38, 0.34, 0.31];
        vlaL.note(B(bar, 2.5), 0.4, (bar === 4 || bar === 8) ? VLA.Am[0] : vv[0], w[0] * a);
        vlaC.note(B(bar, 3), 0.4, vv[1], w[1] * a);
        vlaR.note(B(bar, 3.5), 0.4, vv[2], w[2] * a);
        if (bar !== 12) vlaL.chord(B(bar, 1.5), 0.4, (bar === 11 ? VLA.F : VLA.Am).slice(0, 2), (bar === 8 ? 0.22 : 0.26) * a);
        else vlaL.chord(B(bar, 4.5), 0.4, ['G#3', 'F4'], 0.28 * a);   // the seam keeps moving: G#3 -> A3, F4 -> E4
      } else {                                           // landing bars: one quiet top note, the halo speaks
        if (bar !== 7) vlaR.note(B(bar, 2.5), 0.4, (bar === 10 ? VLA.A : VLA.Am)[2], bar === 10 ? 0.29 : 0.26);
        else vlaL.chord(B(bar, 2), 0.4, ['C4', 'F4'], 0.32);   // the pizz says F: the miss
        // the "almost" doubts itself: F4 sighs to E4 (D3) together with the pad, pointing at the true i of bar 8
        if (bar === 7) { vlaC.note(B(bar, 4), 0.4, 'F4', 0.27); vlaR.note(B(bar, 4.5), 0.45, 'E4', 0.3); }
      }

      // ---- the shaker: the eye
      if (scan) {
        const [s1, s2] = SWEEP[bar];
        sweep(bar, 1, s1[0], s1[1] * a, 0.15 * a);
        sweep(bar, 3, s2[0], s2[1] * a, 0.15 * a);
      } else if (land) {
        // the hand stops on the landing; one soft lean in the second half leads on
        sweep(bar, 3, bar === 7 ? 1.0 : 0.5, 0.24 * a, 0.11 * a);
      } else {
        // the eye rests: soft 16ths, the accent moves (four hands)
        const ACC = [[0.7, 0.3, 0.48, 0.34], [0.66, 0.32, 0.36, 0.5], [0.62, 0.38, 0.52, 0.3], [0.72, 0.28, 0.42, 0.42]];
        const acc = ACC[(bar * 3) % 4];
        for (let i = 0; i < 16; i++) {
          let vel = 0.34 * acc[i % 4] * a;
          if ((bar === 4 || bar === 8) && i === 15) vel *= 0.5;
          shk.hit(B(bar, 1 + i * 0.25 + (i % 2 ? 0.01 : 0)), 0.22, vel);
        }
      }

      // ---- the jingles: only when the eye rests (off-beat 8ths), soft fills into bars 5 and 9
      if (bed) {
        const J = bar >= 11 ? [[2.5, 0.24], [4.5, 0.22]] : [[1.5, 0.22], [2.5, 0.28], [3.5, 0.24], [4.5, 0.28]];
        for (const [b, vv] of J) {
          if ((bar === 4 || bar === 8) && b === 4.5) continue;
          tamb.hit(B(bar, b), 0.5, vv * a);
        }
        if (bar === 4 || bar === 8) { tamb.hit(B(bar, 4.25), 0.25, 0.2); tamb.hit(B(bar, 4.75), 0.25, 0.24); }
      }
    }
    // the one jingle after each true find: on 4&, into the ping-pong (the return bounces L/R)
    tamb.hit(B(3, 4.5), 0.5, 0.22);
    tamb.hit(B(10, 4.5), 0.5, 0.22);

    // the tuba: a short marcato A2 (with a soft A1 under it) on each 4-bar head, and one Bb1 lean in the bII bar that
    // is over well before the seam (the seam's semitone belongs to the bass pizz alone)
    for (const [bar, v] of [[1, 0.56], [5, 0.6], [9, 0.58]]) {
      tuba.note(B(bar), 0.6, 'A2', v, { accent: 0.35 });
      tuba.note(B(bar), 0.6, 'A1', v * 0.35, { accent: 0.2 });
    }
    tuba.note(B(12), 0.55, 'E2', 0.5, { accent: 0.3 });
    tuba.note(B(12, 3), 0.9, 'B1', 0.3, { expr: 'fade' });

    // ---------------------------------------------------------------- the lead
    // inside a wave the notes overlap a little (a half pedal), semitone neighbours stay short, the overshoot is a dead
    // stroke so the find rings clean
    const vn = (bar, beat, pitch, vel, dur, o = {}) => vib.note(B(bar, beat), dur, pitch, vel, { damp: true, ...o });
    // the cello: a scoop into the first note (from 40-60 c below), and a fall-off (-35 c in ~120 ms) on the last
    const vc = (bar, beat, pitch, vel, dur, o = {}) => cello.note(B(bar, beat), dur, pitch, vel, { _leg: true, ...o });
    const fall = (bar, beat, midi, vel, dur, cents = -36) => {   // midi as a number
      vc(bar, beat, midi, vel, dur - 0.18, { expr: [[0, 1], [1, 0.85]] });
      vc(bar, beat + dur - 0.18, midi + cents / 100, vel * 0.7, 0.18, { glideTime: 0.1, expr: 'fade', release: 0.06 });
    };

    s.section('Scan', B(1), B(5), 'gentle');
    // the ping (the sonar sends): celesta with the first vibes note; the glass answers on beat 2 (A4 E5, under the G5)
    cel.note(B(1), 0.5, 'A6', 0.26);
    glass.chord(B(1, 2.07), 1.4, ['A4', 'E5'], 0.18);
    // wave 1: C5 F5 G5~ (+5 +2), the echo falls a third: E5. The F5 is a damped 8th (no smear at GO)
    vn(1, 1, 'C5', 0.5, 0.75); vn(1, 1.5, 'F5', 0.42, 0.45); vn(1, 2, 'G5', 0.56, 1.1); vn(1, 3.5, 'E5', 0.4, 1.6);
    // wave 2: the cell a step higher, D5 G5 -> Bb5^ (+5 +3: one cell too far)
    vn(2, 3, 'D5', 0.44, 0.65); vn(2, 3.5, 'G5', 0.5, 0.45); vn(2, 4, 'Bb5', 0.6, 0.5, { tag: 'tension' });
    // THE FIND: A5 rings, the glass a moment late (C5 E5 under it), the celesta returns a fifth on 1&
    vn(3, 1, 'A5', 0.58, 2.1);
    glass.chord(B(3, 1.06), 2.5, ['C5', 'E5'], 0.3);
    cel.note(B(3, 1.5), 0.5, 'E6', 0.3);
    // the cello takes the pad's E4 and leans into the F chord on 3 (D7), then lets it fall away
    vc(4, 1, 'E4', 0.34, 2.0, { glideFrom: 63.5, glideTime: 0.09, expr: [[0, 0.8], [0.3, 1], [1, 0.85]] });
    fall(4, 3, 65, 0.37, 1.85);

    s.section('Scan down', B(5), B(9), 'gentle');
    // the cell inverted: A5 E5 D5~ (-5 -2), the echo rises a third: F5 (the mirror of wave 1's falling third)
    vn(5, 1, 'A5', 0.54, 0.75); vn(5, 1.5, 'E5', 0.44, 0.65); vn(5, 2, 'D5', 0.52, 1.1); vn(5, 3.5, 'F5', 0.42, 1.6);
    // its repeat a step higher than the echo, G5 D5 C5 (-5 -2 again), comes a beat LATE (two 8ths on 4, 4&) and lands
    // squarely on the downbeat, sure of itself, one cell SHORT of the tonic, where the floor moves: bass F2, the F
    // chord: a DECEPTIVE landing (bVI), the melody on the 5th of F, approached by a whole step from above (no
    // semitone: the "almost" is a wrong cell, not a wrong note)
    vn(6, 4, 'G5', 0.46, 0.55); vn(6, 4.5, 'D5', 0.45, 0.45); vn(7, 1, 'C5', 0.58, 2.6);
    // the false find gets a false halo: F A under the C, short and thin, a little early (the eye is too sure)
    glass.chord(B(7, 1.03), 1.1, ['F4', 'A4'], 0.2);
    // the doubt is the band's, not the lead's: the vibes C5 just rings out while the viola pizz and the pad sigh
    // F4 -> E4 (D3) and the bass walks F2 -> E2, pointing at the A under the same cell
    // bar 8: the floor moves back to A under the same cell: C was right all along (now the 3rd of Am). The celesta
    // confirms C6 an octave up, the glass fills A E under it: there it is
    cel.note(B(8), 0.5, 'C6', 0.27);
    glass.chord(B(8, 1.05), 1.2, ['A4', 'E5'], 0.24);

    s.section('Quick', B(9), B(11), 'gentle');
    // wave 1 recalls the opening (C5 F5) but its top sighs down a semitone: F5 -> E5 (D3)
    vn(9, 1, 'C5', 0.47, 0.65); vn(9, 1.5, 'F5', 0.42, 0.4, { tag: 'tension' }); vn(9, 2, 'E5', 0.46, 0.8);
    // wave 2 is the overshoot shape again (+5 +3) from E5: E5 A5 C6, but this time the semitone goes UP: the minor
    // third C6 flips to the MAJOR third C#6 an 8th early (D8 in the line, the pad turns with it): found faster, and
    // found on a new note (the 3rd, not the tonic)
    vn(9, 3, 'E5', 0.4, 0.45); vn(9, 3.5, 'A5', 0.46, 0.7);
    vn(9, 4.25, 'C6', 0.4, 0.25, { tag: 'tension' });
    vn(9, 4.5, 'C#6', 0.56, 2.5);
    // the twist: A MAJOR (Picardy) halo, the widest and longest; the celesta answers with a fifth, not the third
    glass.chord(B(10, 1.07), 2.8, ['A4', 'C#5', 'E5'], 0.28);
    cel.note(B(10, 1.5), 0.5, 'A6', 0.28);
    cel.note(B(10, 3.5), 0.5, 'E6', 0.22);

    s.section('Seam', B(11), B(13), 'release');
    // bar 11: the sonar's last return, two soft bells (the cell's tail E -> A)
    cel.note(B(11, 3), 0.5, 'E5', 0.24);
    cel.note(B(11, 3.75), 0.5, 'A5', 0.22);
    // bar 12: the cello over E7b9 takes the pad's F4 (the b9) with a scoop, F4 -> E4 (D3, the b9 sighs onto the
    // root), then D4 (the 7th) falls off and resolves into the bar-1 C5 of the vibes (7th -> 3rd)
    vc(12, 1, 'F4', 0.48, 1.5, { glideFrom: 64.5, glideTime: 0.1, expr: [[0, 0.82], [0.4, 1], [1, 0.9]] });
    vc(12, 2.5, 'E4', 0.45, 1.5, { expr: [[0, 0.9], [0.5, 1], [1, 0.88]] });
    fall(12, 4, 62, 0.42, 1.0, -34);

    s.length(B(BAR_COUNT + 1));
  },
};
