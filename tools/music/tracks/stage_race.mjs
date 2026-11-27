// "Stage Race" ("Neck and Neck") - the staged-practice cue for findDuel (race vs the bot: 5 targets in a row, whoever
// taps the right cell first takes it). Concept: scratchpad music/stage-set/PLAN.md section 2.8 (revision 3).
//                                                                       node tools/music/render.mjs stage_race
//
// TEMPO / METRE: 156 BPM, 4/4 (a bar = 1.538 s). 20 bars = 30.77 s = FIVE LAPS of 4 bars, one per target. The whole file
// loops (stages up to 60 s play it twice). No intro: bar 1 beat 1 = the mandolin's RUN + the gallop + the lap chord.
// TONIC D, D Freygish (D Eb F# G A Bb C); lap 2 moves to the iv region, G Freygish, via D as its V.
// Not D at 113 (Prelude): the forbidden pairs of STYLE.md section 3 are kept. No Cm/D (Shkoyach's chorus chord).
//
// THE STORY: "me" is a picked MANDOLIN (left of centre, +14 c sharp of the band, D12), "the bot" is a MUTED BRASS horn
// an octave lower (right of centre, a cup-mute colour, tongued and slurred like one player) that chases it: it starts a
// beat late, skips notes, CATCHES UP (a beat of octaves with "me") and falls back. Each lap ends with a short neutral
// "point" an 8th after the finish (a mandolin double-stop flick or a clipped muted-brass blat, each with one celesta
// ping): it marks the lap, it does not mock the player. The lead order changes lap by lap.
//
// MOTIF (ours; checked by script against the STYLE.md section 3 hooks, kibbitzer TICK/CALL/RIFF, caper
// SNEAK/CALL/FLICK/TUBA and the other stage cues: no 4 consecutive shared intervals, no chromatic run over 3 semitones)
//   RUN  A4 D5 F#5 D5 Eb5. C5 D5 A4 | Bb4 A4 _ C5 A4 D5 (finish, beat 3)
//        rhythm: 16-16-8 (the gallop's da-da-DUM as its head) 8, then the b2 Eb5 SYNCOPATED (a dotted 8th across beat 3)
//        snapping to C5 (16th) -> D5: the tonic encircled from the b2 and the b7 (D1/D2); one b6-5 sigh Bb-A (D3), a
//        breath, then a 16th lean C5 -> A4 and the jump to the finish line.
//
// FORM (bar: seconds; every lap = melody bars 1-2, then two lead-free bars of groove + chords + the pivot pedal)
//   L1  1-4   0:00.0  D D Eb/D D7: me first; the bot a beat behind, catches up (octaves on beat 3), loses by half a beat.
//                     Pivot G4 -> F#4. Bar 4: the tuba's F#2 -> G2 (D4) into lap 2
//   L2  5-8   0:06.2  G G Ab/G | corner: the head a 4th up (a rake from C#5), but a NEW tail: Eb5 D5, then B4 D5 F#5
//                     and the b2 snap Ab5 -> G5 (D2) from above, against the bot's F#4 from below; the bot skips its
//                     echo and loses by only a 16th. Bar 8 = the corner G7/B - C - It+6 over Eb2 (Eb G C#): bass B1 C2
//                     Eb2 -> D2, top F5 E5 C#5 -> D5 (a double encirclement of D, D1)
//   L3  9-12  0:12.3  D D Eb/D Eb: the bot GETS AHEAD (it plays the RUN); the mandolin answers a beat late with its
//                     own line (the head inverted, D5 A4 F#4, then C#5 -> D5) and loses by half a beat. Bar 12 = the
//                     Eb chord held (one bellows stroke over bars 11-12), its bass walking Eb2 -> C2 -> C#2 -> D2, the drum
//                     fill, and the bot's 16th pickup Eb4 C#4 -> D (it starts the hocket: the grid breaks once)
//   L4  13-16 0:18.5  D Gm/D Eb/D D: HOCKET over a new progression (iv, then the b2 chord): the line handed between the
//                     two every 2 beats; both land on D together (beat 4 of bar 14): a tie. Bar 16 = a BREATH on
//                     beat 1 (the glue holds, a soft tuba D2 on 3), a short jingle roll, the muted horns swelling a
//                     fifth (a real crescendo) and the gallop pickup
//   L5  17-20 0:24.6  D D D wedge: PHOTO FINISH, both in UNISON (octaves): a new head from F#5 (F#5 D5 A4), the line
//                     climbs Bb4 C5 Eb5 -> C#5 (picked tremolo in 16ths, a beat) -> D5 (the double neighbour); the
//                     photo flash on bar 19 (a theremin D6 scoop + celesta + zils) over a plain D, a clean Gm/D on beat
//                     4; bar 20 = the wedge B1 C2 C#2 / F5 E5 Eb5 (D6), its C#2 the loop seam (D4) into bar 1
//   Melody (lead) in 10 of 20 bars; the Freygish pivot pedal (Kugel's soft mandolin tremolo) and the chords own the rest.
//
// GROOVE (the "gallop motor", PLAN 2.8): da-da-DUM INTO beats 1 and 3 only: the damped guitar plays two 16ths on the
// "and-a" of 2 and 4 (with a light kick on the "a"), the DUM on 1 and 3 with the tuba and the tuned kick, a single short
// chop on 2 and 4. No snare backbeat: a riq tek on 4 only, closed hats on the off-beats, the tambourine on the "and" of
// 1 and 3 and a shake on the "and" of 4 (lead-free bars). The guitarist digs in: lighter under the lead, harder in the
// free bars and in lap 5, the pickup into every lap accented, once per lap the first 16th of a da-da the louder one.
// One ghost-snare 16th pickup into every lap, an open hat at each lap's end, one fill (bar 12, hand to hand).
//
// SEMITONE DEVICES: D1/D2 (the RUN's Eb-C-D encirclement; lap 2's F#5 Ab5 -> G5; the final Eb5 C#5 D5; bar 8's E5 C#5
// D5 over Eb2 -> D2), D3 (Bb-A in every RUN; the pivot Bb4 -> A4 in lap 4), D4 (F#2 -> G2 into lap 2; C#2 -> D2 into
// lap 4 and the seam), D6 (the wedge B1 C2 C#2 / F5 E5 Eb5 -> D at the seam; lap 2's Ab5 / F#4 closing on G), D7 (the
// pivot G4 -> F#4 over Eb/D -> D7), the bass b2-1 (tuba Eb2 -> D2 at the lap's bar 3 -> 4), the Gm/D - Eb/D - D chain.
//
// MIX: dry and close (a 0.2 s room on everything, a 0.55 s plate on the two leads and a touch of it behind the backing),
// mono low end (tuba, kick, guitar high-passed at 160 Hz), wide plucks (the guitar DUM double-tracked; chops left, da-da
// right), the mandolin left of centre, the bot right of centre. The tuba's harmonics (330/500 Hz) and the kick click
// carry the bottom on phones.
//
// MEASURED (gate round 3, final render): 30.77 s = 20 bars, -16.0 LUFS, -2.60 dBTP (ceiling -2.7, limiter max 2.6 dB on
// the bar 17 downbeat), LRA 2.2, 0 clicks, DC 0, seam PASS (0.13x local step, every bus's wrap step below its local
// step), 0.87 LU lost after a 150 Hz HP (2.12 after 300 Hz), sub -23.7 / bass -7.5 / presence -14.5 / air -16.0,
// centroid 786 Hz, harshness -11.5, corr 0.73, side/mid -8.0 dB, L-R within 1.2 dB in every bar, no resonance above
// 5 kHz in bars 15-19. Buses (LU vs mix): mandolin -3.0 (-3.3 in its bars), tuba -4.9, bot -5.2, chop -8.3, gallop
// -10.9, kit -12.3, bells -13.4. Phone mono: the bot -5..-8 dB vs the mix in laps 1-2 and 5, the celesta pings -10..-15.
// The bot stem sags 2-4 dB between attacks (was 6-9); the bar 16 horns swell -52 -> -40 dB over 0.75 s.
// AAC decoded: -16.1 LUFS, -2.0 dBTP, same length, 0 clicks, seam PASS.

import { n } from '../engine.mjs';

const BPM = 156;

// lap harmony, per bar: glue (lead-free bars only), tuba on 1 and 3, guitar dyads (beats 1-2, 3-4)
const H = {
  D: { glue: ['A3', 'D4'], t1: 'D2', t3: 'A1', g1: ['D3', 'A3'], g2: ['D3', 'A3'] },
  Ds: { glue: ['A3', 'D4'], t1: 'D2', t3: 'A1', g1: ['D3', 'F#3'], g2: ['D3', 'A3'] },   // the sigh bar: no A3 under the Bb
  EbD: { glue: ['Bb3', 'Eb4'], t1: 'D2', t3: 'Eb2', g1: ['D3', 'Bb3'], g2: ['Eb3', 'Bb3'] },
  D7: { glue: ['A3', 'C4'], t1: 'D2', t3: 'A1', g1: ['D3', 'A3'], g2: ['D3', 'C4'] },
  G: { glue: ['B3', 'D4'], t1: 'G2', t3: 'D2', g1: ['D3', 'G3'], g2: ['D3', 'G3'] },
  AbG: { glue: ['C4', 'Eb4'], t1: 'G2', t3: 'Ab2', g1: ['D3', 'G3'], g2: ['Eb3', 'Ab3'] },
  Eb: { glue: ['Bb3', 'Eb4'], t1: 'Eb2', t3: 'C2', g1: ['Eb3', 'Bb3'], g2: ['Eb3', 'Bb3'] },   // bar 12: the bII held, bass Eb2 -> C2 -> C#2 -> D2
  GmDd: { glue: ['Bb3', 'D4'], t1: 'D2', t3: 'A1', g1: ['D3', 'Bb3'], g2: ['D3', 'A3'] },   // Gm/D, then back to D under the finish
};
// the lap chords on the reed chop (close) and the brass (low); '...lo' = voiced under the lead's head
const CH = {
  D: ['F#4', 'A4', 'D5'], Dlo: ['D4', 'F#4', 'A4'], EbD: ['G4', 'Bb4', 'Eb5'], EbDlo: ['Eb4', 'G4', 'Bb4'], D7: ['F#4', 'A4', 'C5'],
  G: ['G4', 'B4', 'D5'], Glo: ['D4', 'G4', 'B4'], AbG: ['Ab4', 'C5', 'Eb5'], GmD: ['G4', 'Bb4', 'D5'],
};
const BR = { D: ['D3', 'A3'], G: ['D3', 'G3'], EbD: ['Eb3', 'Bb3'], GmD: ['D3', 'Bb3'] };

// lines: [pitch, beat from the bar's start (1 = beat 1, 5 = the next bar's beat 1), length, vel, flag]
// flag 't' = a top note (louder in hotter laps), 's' = slurred (the bot: no re-tongue)
const RUN = [
  ['A4', 1, 0.25, 0.7], ['D5', 1.25, 0.25, 0.58], ['F#5', 1.5, 0.5, 0.78, 't'], ['D5', 2, 0.5, 0.6],
  ['Eb5', 2.5, 0.75, 0.76, 't'], ['C5', 3.25, 0.25, 0.56], ['D5', 3.5, 0.5, 0.66], ['A4', 4, 0.5, 0.56],
  ['Bb4', 5, 0.5, 0.72], ['A4', 5.5, 0.5, 0.54], ['C5', 6.5, 0.25, 0.6], ['A4', 6.75, 0.25, 0.56],
];
const HEAD = RUN.slice(0, 8);
// lap 2's new tail (G region, absolute pitches): Eb5 D5, then B4 D5 F#5 and the b2 snap Ab5 -> the finish G5
const TAIL2 = [['Eb5', 5, 0.5, 0.72], ['D5', 5.5, 0.5, 0.56], ['B4', 6, 0.25, 0.56], ['D5', 6.25, 0.25, 0.54], ['F#5', 6.5, 0.25, 0.62], ['Ab5', 6.75, 0.25, 0.7, 't']];
// the bot's chase in laps 1-2: a beat late, skips the turn, octaves with "me" on beat 3, half a beat late at the end
const CHASE = [
  ['A3', 2, 0.25, 0.62], ['D4', 2.25, 0.25, 0.54, 's'], ['F#4', 2.5, 0.5, 0.66],
  ['Eb4', 3, 0.5, 0.7], ['D4', 3.5, 0.25, 0.55, 's'], ['C4', 3.75, 0.25, 0.58], ['D4', 4, 0.5, 0.6, 's'], ['A3', 4.5, 0.5, 0.56],
  ['Bb3', 5.5, 0.5, 0.68], ['A3', 6, 0.5, 0.52, 's'], ['A3', 7.25, 0.25, 0.56],
];
// lap 2: the bot skips its echo and cuts the corner with two 16ths (A3 C#4, i.e. D4 F#4 a 4th up) into the finish
const CHASE2 = [...CHASE.slice(0, 8), ['A3', 6.5, 0.25, 0.56], ['C#4', 6.75, 0.25, 0.64, 's']];
// the bot playing the RUN (lap 3, it leads), phrased as a horn: slurred in pairs
const BOTRUN = RUN.map((x, i) => [x[0], x[1], x[2], x[3], [1, 3, 5, 6, 9, 11].includes(i) ? 's' : '']);
// "me" answers in lap 3: the head inverted (D5 A4 F#4), up to C5, the sigh, then C#5 -> D5
const ANSWER = [
  ['D5', 2, 0.25, 0.64], ['A4', 2.25, 0.25, 0.52], ['F#4', 2.5, 0.5, 0.6], ['G4', 3, 0.5, 0.56], ['A4', 3.5, 0.5, 0.62],
  ['C5', 4, 0.5, 0.66, 't'], ['Bb4', 5, 0.5, 0.68], ['A4', 5.5, 0.5, 0.52], ['C#5', 7.25, 0.25, 0.6],
];
// lap 5: a new head from F#5, then the climb to the double neighbour (Eb5 8th, C#5 picked tremolo, D5 on 4.5)
const FIN = [
  ['F#5', 1, 0.25, 0.7, 't'], ['D5', 1.25, 0.25, 0.58], ['A4', 1.5, 0.5, 0.6], ['D5', 2, 0.5, 0.62],
  ['Eb5', 2.5, 0.75, 0.78, 't'], ['C5', 3.25, 0.25, 0.58], ['D5', 3.5, 0.5, 0.68], ['A4', 4, 0.5, 0.58],
  ['Bb4', 5, 0.5, 0.74], ['A4', 5.5, 0.5, 0.56, 's'], ['Bb4', 6, 0.5, 0.66], ['C5', 6.5, 0.5, 0.7, 's'], ['Eb5', 7, 0.5, 0.76, 't'],
];

export default {
  id: 'stage_race',
  title: 'Stage Race',
  bpm: BPM,
  loop: true,

  build(s) {
    s.meter(4, 4);
    s.reverb({ rt60: 0.55, predelay: 0.008, damping: 0.5, early: 0.6, buildup: 0.01, hp: 220, lp: 9000 });   // a short plate
    s.room('room'); s.room({ rt60: 0.22, predelay: 0.003, lp: 8000 });                                          // a close room (everything)
    s.master({ lufs: -16, ceiling: -2.7, eq: [{ type: 'peak', f: 3800, q: 0.9, gain: 0.8 }, { type: 'peak', f: 380, q: 0.8, gain: -1.5 }, { type: 'highshelf', f: 5000, q: 0.7, gain: 1.2 }] });
    s.humanize = { time: 0.004, vel: 0.05 };
    const B = (bar, beat = 1) => s.bar(bar, beat);

    // a part with a fixed push (-) or lag (+) in beats (0.01 beat = 3.8 ms at 156) + a shared ensemble drift.
    // The loop's first downbeat is placed a hair late (0.03 beat) so no attack starts before the seam.
    const rDrift = s.rng('ensemble'), DR = Array.from({ length: 16 }, () => 2 * rDrift() - 1);
    const drift = (b) => { const x = Math.max(0, b) / 8, k = Math.floor(x), f = x - k, w = (1 - Math.cos(Math.PI * f)) / 2; return 0.008 * (DR[k % 16] * (1 - w) + DR[(k + 1) % 16] * w); };
    const lay = (p, off) => new Proxy(p, {
      get(t, k) {
        const v = t[k];
        if (typeof v !== 'function') return v;
        if (k === 'note' || k === 'hit' || k === 'chord' || k === 'play' || k === 'arp') return (b, ...r) => v.call(t, b < 1e-6 ? 0.03 : b + off + drift(b), ...r);
        return v.bind(t);
      },
    });
    const rG = s.rng('gallop'), rJ = s.rng('jingles'), rK = s.rng('kit');
    const jit = (r, a) => 1 - a / 2 + a * r();

    // ---------------------------------------------------------------- buses
    const busTuba = s.bus('tuba', { gain: -6.8, sat: 5, comp: { threshold: -20, ratio: 3, attack: 0.002, release: 0.08, knee: 6 }, eq: [{ type: 'hp', f: 40 }, { type: 'lowshelf', f: 100, gain: -4.5 }, { type: 'peak', f: 330, q: 1, gain: 1.5 }, { type: 'peak', f: 500, q: 1.2, gain: 1.5 }, { type: 'lp', f: 9000, q: 0.7 }] });
    const busKick = s.bus('kick', { gain: -11, comp: { threshold: -20, ratio: 4, attack: 0.001, release: 0.05, knee: 4 }, eq: [{ type: 'hp', f: 45 }, { type: 'lowshelf', f: 80, gain: -6 }, { type: 'peak', f: 3500, q: 1.4, gain: 4 }] });
    const busKit = s.bus('kit', { gain: -6.5, room: 0.12, sat: 2, eq: [{ type: 'peak', f: 8850, q: 6, gain: -3 }, { type: 'peak', f: 12075, q: 6, gain: -3 }] });
    const busJing = s.bus('jingles', { gain: -8.5, width: 1.4, room: 0.06, eq: [{ type: 'peak', f: 3500, q: 0.8, gain: -1.5 }, { type: 'peak', f: 4600, q: 6, gain: -3 }, { type: 'peak', f: 6600, q: 5, gain: -3 }, { type: 'peak', f: 10200, q: 5, gain: -2 }, { type: 'peak', f: 12000, q: 5, gain: -3 }, { type: 'highshelf', f: 9000, q: 0.7, gain: -2 }, { type: 'lp', f: 15000, q: 0.6 }] });
    const busGal = s.bus('gallop', { gain: -14.8, width: 2, room: 0.08, sat: 2, comp: { threshold: -22, ratio: 2, attack: 0.006, release: 0.03, knee: 6 }, eq: [{ type: 'hp', f: 160 }, { type: 'peak', f: 220, q: 1, gain: -2 }, { type: 'peak', f: 1175, q: 5, gain: -4 }, { type: 'peak', f: 2350, q: 5, gain: -4 }, { type: 'peak', f: 3000, q: 1, gain: 2.5 }] });
    const busLead = s.bus('mandolin', { gain: -11, room: 0.1, reverb: 0.16, comp: { threshold: -13, ratio: 4, attack: 0.0005, release: 0.06, knee: 6 }, eq: [{ type: 'peak', f: 900, q: 1, gain: 1.5 }, { type: 'peak', f: 1175, q: 4, gain: -3.5 }, { type: 'highshelf', f: 2500, q: 0.7, gain: 2 }] });
    const busBot = s.bus('bot', { gain: -10, pan: 0.55, room: 0.1, reverb: 0.13, sat: 2, eq: [{ type: 'hp', f: 180 }, { type: 'peak', f: 1550, q: 2, gain: 5 }, { type: 'lp', f: 3800, q: 0.7 }] });   // cup mute: nasal, no top
    const busChop = s.bus('chop', { gain: -8.5, room: 0.16, reverb: 0.1, width: 2, sat: 3, eq: [{ type: 'hp', f: 220 }, { type: 'peak', f: 2800, q: 1, gain: 3 }] });
    const busBrass = s.bus('brass', { gain: -15, room: 0.16, reverb: 0.08, width: 1.6, eq: [{ type: 'hp', f: 220 }, { type: 'lp', f: 5000, q: 0.7 }] });
    const busGlue = s.bus('glue', { gain: -13, pan: -0.1, width: 1.9, room: 0.06, reverb: 0.12, eq: [{ type: 'hp', f: 180 }] });
    const busTrem = s.bus('tremolo', { gain: -7, pan: 0.6, room: 0.08, reverb: 0.1 });
    const busBells = s.bus('bells', { gain: -11, room: 0.08, reverb: 0.12, eq: [{ type: 'peak', f: 2700, q: 3, gain: -3 }] });

    // ---------------------------------------------------------------- parts
    const tight = { time: 0.0025, vel: 0.04 };
    const tuba = lay(s.part(busTuba, 'tuba', { bright: 1.35, humanize: tight }), 0.008);
    const kick = lay(s.part(busKick, 'kick', { click: 1.5, humanize: tight }), 0.004);
    const snare = lay(s.part(busKit, 'snare', { pan: -0.05, bright: 1.1 }), -0.01);
    const riq = lay(s.part(busKit, 'riq', { pan: -0.5, ring: 0.35, spread: 0.6 }), 0);
    const hat = lay(s.part(busKit, 'hat', { pan: 0.5, bright: 0.85 }), 0.006);
    const tamb = lay(s.part(busJing, 'tambourine', { pan: -0.55, skin: 0.25, ring: 0.35, spread: 0.6 }), 0.012);
    const roll = s.part(busJing, 'jingleRoll', { spread: 0.45, pan: 0.1 });
    // the gallop guitar: the DUM double-tracked (wide), the chops (left) and the 16ths (right) single, palm-muted
    const gtrD = lay(s.part(busGal, 'pluck', { body: 'guitar', double: 1, spread: 0.9, damp: true, decay: 0.25, bright: 1.15, humanize: tight }), -0.004);
    const gtrS = lay(s.part(busGal, 'pluck', { body: 'guitar', double: 0, pan: -0.45, damp: true, decay: 0.22, bright: 1.2, humanize: tight, name: 'guitar chops' }), -0.004);
    const gtrP = lay(s.part(busGal, 'pluck', { body: 'guitar', double: 0, pan: 0.48, damp: true, decay: 0.2, bright: 1.25, humanize: tight, name: 'guitar pickups' }), -0.006);
    const me = lay(s.part(busLead, 'pluck', { body: 'mandolin', double: 1, spread: 0.6, pan: -0.35, damp: true, bright: 1.05, sharp: 14, humanize: { time: 0.004, vel: 0.04 }, name: 'mandolin (me)' }), 0.006);
    const bot = lay(s.part(busBot, 'stab', { kind: 'brass', spread: 0.7, detune: 3, decay: 0.45, bright: 0.9, humanize: { time: 0.005, vel: 0.04 }, name: 'muted brass (bot)' }), 0.018);
    const chop = lay(s.part(busChop, 'accordion', { chop: true, spread: 1.4, bright: 1.2 }), -0.01);
    const brass = lay(s.part(busBrass, 'stab', { kind: 'brass', spread: 1.2, decay: 0.1 }), -0.006);
    const horns = s.part(busBrass, 'warmHorn', { players: 2, name: 'muted horns (swell)' });
    const glue = s.part(busGlue, 'accordion', { spread: 1.45, wet: 0.14, musette: 8, attack: 0.05, release: 0.1, name: 'accordion glue' });
    const trem = s.part(busTrem, 'pluck', { tremolo: true, tone: 'soft', sharp: 22, tremRate: 10.4 });   // locked to the 16ths
    const cel = s.part(busBells, 'celesta');
    const ther = s.part(busBells, 'thereminLead', { vibrato: 0.7, name: 'theremin (flash)' });
    const zils = s.part(busBells, 'fingerCymbals', { pan: 0.15 });

    // ---------------------------------------------------------------- helpers
    const HATV = [1, 0.94, 1.02, 0.9, 1.08];   // the hats per lap (lap 4 lighter, lap 5 hotter)
    const hatHit = (b, v, lap) => hat.hit(b, 0.25, v * HATV[lap - 1] * jit(rK, 0.14), { tune: rK() < 0.5 ? 0 : 140 });
    // the gallop motor for one bar. o: { upto, lead (a melody bar: hats on the off-beats only, no tambourine), lap,
    // lift, pick (false: no pickup into the next bar), tv (tuba vel), into (accent the pickup into the next lap),
    // flip (that beat's da-da leads with its first 16th) }
    const gallop = (bar, h, o = {}) => {
      const upto = o.upto ?? 5, lift = o.lift ?? 1, lap = o.lap ?? 1, lead = !!o.lead;
      const gv = lift * (lead ? 0.9 : 1.05) * (lap === 5 ? 1.08 : 1);   // the guitarist digs in when the lead rests
      for (let bt = 1; bt < upto; bt++) {
        const g = bt < 3 ? h.g1 : h.g2, strong = bt % 2 === 1;
        if (strong) gtrD.chord(B(bar, bt), 0.28, g, 0.75 * gv * jit(rG, 0.1), { strum: 0.006 });                     // DUM
        else gtrS.chord(B(bar, bt), 0.16, g, (bt === 4 ? 0.54 : 0.46) * gv * jit(rG, 0.16), { strum: 0.004 });     // a single chop
        // da-da: the two 16ths INTO beats 3 and 1 only, the second leaning forward, a light kick under it
        if (!strong && (bt < 4 || o.pick !== false)) {
          const gn = bt === 2 ? h.g2 : g, flip = o.flip === bt, into = bt === 4 && o.into;
          gtrP.chord(B(bar, bt + 0.5), 0.13, gn, (flip ? 0.52 : 0.38) * gv * jit(rG, 0.12), { strum: 0.004 });
          gtrP.chord(B(bar, bt + 0.75), 0.13, gn, (into ? 0.6 : flip ? 0.4 : 0.48) * gv * jit(rG, 0.12), { strum: -0.004 });
          kick.note(B(bar, bt + 0.75), 0.3, 'D1', (into ? 0.3 : 0.22) * lift * jit(rK, 0.1));
        }
        if (!lead) hatHit(B(bar, bt), strong ? 0.18 : 0.16, lap);
        hatHit(B(bar, bt + 0.5), 0.32, lap);
      }
      if (!lead) {
        tamb.hit(B(bar, 1.5), 0.25, 0.46 * jit(rJ, 0.14), { bright: 0.8 + 0.2 * rJ() });
        if (upto > 3) tamb.hit(B(bar, 3.5), 0.25, 0.42 * jit(rJ, 0.14), { bright: 0.8 + 0.2 * rJ() });
        if (upto > 4) tamb.hit(B(bar, 4.5), 0.25, 0.4 * jit(rJ, 0.14), { stroke: 'shake', bright: 0.8 + 0.2 * rJ() });
      }
      if (upto > 4) riq.hit(B(bar, 4), 0.3, (lead ? 0.5 : 0.58) * jit(rK, 0.1), { stroke: 'tek' });
      if (!lead && upto > 4) riq.hit(B(bar, 2.75), 0.2, 0.3 * jit(rK, 0.12), { stroke: 'tek' });
      const tv = o.tv ?? 0.74;
      tuba.note(B(bar), 0.78, h.t1, tv * lift);
      kick.note(B(bar), 0.5, 'D1', 0.66 * lift);
      if (upto > 3) { tuba.note(B(bar, 3), 0.72, h.t3, tv * 0.9 * lift); kick.note(B(bar, 3), 0.5, 'D1', 0.58 * lift); }
    };
    // the glue: one bellows stroke per span (no dip of more than ~2 dB at a barline). 'a' + 'b' = one stroke over two bars
    const BELLOWS = { a: [[0, 0.8], [0.6, 1], [1, 0.92]], b: [[0, 0.92], [0.5, 1], [1, 0.85]], one: [[0, 0.82], [0.5, 1], [1, 0.88]] };
    const glueBar = (bar, h, beats = 4, v = 0.27, st = 'one') => glue.chord(B(bar), beats + 0.02, h.glue, v, { expr: beats >= 3 ? BELLOWS[st] : 'flat' });
    // the lap marker: a short tutti chord on the lap's downbeat (voiced under the head when the lead starts there)
    const marker = (bar, c, v = 0.56, lo = false) => { chop.chord(B(bar), 0.3, CH[lo ? c + 'lo' : c], v); brass.chord(B(bar), 0.35, BR[c], v * 0.72); };
    // the lap's end: a ghost-snare 16th pickup into the next lap and an open hat on the "and" of 4
    const lapEnd = (bar, lap) => { snare.hit(B(bar, 4.75), 0.2, 0.22 * jit(rK, 0.1)); hat.hit(B(bar, 4.5), 0.5, 0.24 * HATV[lap - 1], { open: 0.5 }); };
    // the corner: beat 1 the lap's chord, then G7/B - C - (It+6) on the beats -> D. alt: over Eb2 (Eb G C#), top C#5
    const wedge = (bar, h1, lap, alt = false) => {
      gallop(bar, h1, { upto: 2, lap });
      glueBar(bar, h1, 1, 0.3);
      const W = [
        { t: 'B1', b: ['B2', 'F3'], c: ['G4', 'B4', 'F5'], g: ['B2', 'F3'], gl: ['B3', 'F4'] },
        { t: 'C2', b: ['C3', 'G3'], c: ['G4', 'C5', 'E5'], g: ['C3', 'G3'], gl: ['C4', 'E4'] },
        alt ? { t: 'Eb2', b: ['G3', 'C#4'], c: ['Eb4', 'G4', 'C#5'], g: ['Eb3', 'G3'], gl: ['G3', 'C#4'] }
          : { t: 'C#2', b: ['C#3', 'G3'], c: ['G4', 'C#5', 'Eb5'], g: ['C#3', 'G3'], gl: ['C#4', 'Eb4'] },
      ];
      const gw = lap === 5 ? 1.06 : 1;
      W.forEach((w, i) => {
        const bt = 2 + i, v = 0.56 + 0.05 * i;
        tuba.note(B(bar, bt), 0.6, w.t, 0.74 + 0.04 * i);
        kick.note(B(bar, bt), 0.5, 'D1', 0.5 + 0.06 * i);
        brass.chord(B(bar, bt), 0.4, w.b, v * (i === 2 ? 0.84 : 0.95), i === 2 ? { tag: 'tension' } : {});
        chop.chord(B(bar, bt), 0.36, w.c, v, i === 2 ? { tag: 'tension' } : {});
        // the motor keeps running on the walking bass: DUM on each beat, da-da into 3 and 1 only
        gtrD.chord(B(bar, bt), 0.28, w.g, (0.7 + 0.04 * i) * gw * jit(rG, 0.08), { strum: 0.006 });
        if (bt % 2 === 0) {
          gtrP.chord(B(bar, bt + 0.5), 0.13, w.g, 0.4 * gw, { strum: 0.004 }); gtrP.chord(B(bar, bt + 0.75), 0.13, w.g, (bt === 4 ? 0.6 : 0.5) * gw, { strum: -0.004 });
          kick.note(B(bar, bt + 0.75), 0.3, 'D1', bt === 4 ? 0.3 : 0.24);
        }
        hatHit(B(bar, bt), 0.18, lap); hatHit(B(bar, bt + 0.5), 0.32, lap);
        glue.chord(B(bar, bt), 1.02, w.gl, 0.3 + 0.01 * i, i === 2 ? { tag: 'tension' } : {});
      });
      tamb.hit(B(bar, 2.5), 0.25, 0.44 * jit(rJ, 0.12), { bright: 0.8 + 0.2 * rJ() });
      tamb.hit(B(bar, 3.5), 0.25, 0.46 * jit(rJ, 0.12), { bright: 0.8 + 0.2 * rJ() });
      riq.hit(B(bar, 4), 0.3, 0.6, { stroke: 'tek' });
      lapEnd(bar, lap);
    };
    // the Freygish pivot pedal: a soft tremolo (Kugel's near-pure mandolin pedal), right of centre
    const pivot = (bar, pitch, beats, v = 0.36) => trem.note(B(bar), beats, pitch, v);
    // a line on a part: tr (semitones), vs (vel scale), top (added to 't' notes), shape (i, count) -> vel multiplier.
    // horn: tongued notes sustain between attacks (a slow fall), slurred ('s') ones come in soft without an accent.
    // mandolin: notes on the 2nd and 4th 16th of a beat are UP-strokes (lighter, darker, a hair early).
    const line = (part, bar, L, o = {}) => {
      L.forEach(([p, bt, d, v, f], i) => {
        const sh = o.shape ? o.shape(i, L.length) : 1;
        const vel = Math.min(0.95, v * (o.vs ?? 1) * sh + (f === 't' ? o.top ?? 0 : 0));
        const at = B(bar) + bt - 1, pitch = n(p) + (o.tr ?? 0) + (o.cents ?? 0) / 100;
        if (o.horn) part.note(at, d * 0.92, pitch, vel, f === 's' ? { attack: 0.03, decay: 1.5, amp: 0.82 } : { attack: 0.012, decay: 0.45 });
        else if (Math.abs((bt % 0.5) - 0.25) < 1e-6) part.note(at - 0.005, d * 0.94, pitch, vel * 0.9, { bright: 0.86 });
        else part.note(at, d * 0.94, pitch, vel);
      });
    };
    // a finish on the muted brass: held, then clipped (no ghost fall-off)
    const botFinish = (at, beats, p, v) => bot.note(at, beats, p, v, { attack: 0.012, decay: 0.3, release: 0.04 });
    // the "points", an 8th after the finish, neutral lap markers: me = a mandolin double-stop flick, the bot = a clipped
    // muted-brass blat; each with one short celesta ping on its side
    const mePoint = (at, pitches, v = 0.45) => {
      me.chord(at, 0.3, pitches, v, { pan: -0.6, sharp: 18 });
      cel.note(at + 0.01, 0.35, pitches[pitches.length - 1], 0.34, { pan: -0.4 });
    };
    const botPoint = (at, pitches, v = 0.45) => {
      bot.chord(at, 0.3, pitches, v, { pan: 0.35, decay: 0.08, release: 0.04 });
      cel.note(at + 0.01, 0.35, n(pitches[pitches.length - 1]) + 24, 0.3, { pan: 0.4 });
    };

    // ================================================================ L1  1-4  me first
    s.section('L1 me first', B(1), B(5), 'chase');
    marker(1, 'D', 0.52, true);
    line(me, 1, RUN);
    me.note(B(2, 3), 1, 'D5', 0.72, { sharp: 18 });
    line(bot, 1, CHASE, { horn: true, vs: 1.02, cents: 10 });
    botFinish(B(2, 3.5), 0.5, 'D4', 0.7);
    mePoint(B(2, 3.5), ['A5', 'F#6']);
    gallop(1, H.D, { lead: true, tv: 0.7 }); gallop(2, H.Ds, { lead: true }); gallop(3, H.EbD, { flip: 2 }); gallop(4, H.D7, { into: true });
    glueBar(3, H.EbD, 4, 0.27, 'a'); glueBar(4, H.D7, 4, 0.27, 'b');
    chop.chord(B(3), 0.3, CH.EbD, 0.5); chop.chord(B(3, 2.5), 0.25, CH.EbD, 0.46);
    chop.chord(B(4, 2.5), 0.25, CH.D7, 0.46); chop.chord(B(4, 4), 0.2, CH.D7, 0.4);
    pivot(3, 'G4', 4); pivot(4, 'F#4', 3.5);
    tuba.note(B(4, 4.5), 0.4, 'F#2', 0.7);   // D4: the leading tone into G
    lapEnd(4, 1);

    // ================================================================ L2  5-8  a 4th up (G Freygish), a new tail
    s.section('L2 a 4th up', B(5), B(9), 'chase');
    marker(5, 'G', 0.58, true);
    me.note(B(5) - 0.06, 0.06, 'C#5', 0.4);   // the rake into the head
    line(me, 5, HEAD, { tr: 5, top: 0.02, vs: 0.97 });
    line(me, 5, TAIL2);
    me.note(B(6, 3), 1, 'G5', 0.68, { sharp: 18 });
    line(bot, 5, CHASE2, { horn: true, tr: 5, vs: 1.02, cents: 10 });
    botFinish(B(6, 3.25), 0.5, 'G4', 0.7);   // only a 16th behind: the race tightens before the bot takes lap 3
    mePoint(B(6, 3.5), ['B5', 'D6']);
    gallop(5, H.G, { lead: true, lap: 2, lift: 1.02 }); gallop(6, H.G, { lead: true, lap: 2 }); gallop(7, H.AbG, { lap: 2, flip: 2 });
    glueBar(7, H.AbG);
    chop.chord(B(7), 0.3, CH.AbG, 0.5); chop.chord(B(7, 2.5), 0.25, CH.AbG, 0.46);
    pivot(7, 'Eb5', 4, 0.32);
    wedge(8, H.G, 2, true);   // over Eb2: E5 C#5 -> D5 on top, Eb2 -> D2 below

    // ================================================================ L3  9-12  the bot gets ahead
    s.section('L3 bot ahead', B(9), B(13), 'chase');
    marker(9, 'D', 0.58, true);
    // the bot's RUN phrased as one breath: rising into the b2 Eb, then easing off
    line(bot, 9, BOTRUN, { horn: true, tr: -12, cents: 12, shape: (i) => [1.05, 1.06, 1.1, 1.1, 1.2, 1.12, 1.14, 1.08, 1.16, 1.04, 1.06, 1.02][i] });
    botFinish(B(10, 3), 0.6, 'D4', 0.8);
    line(me, 9, ANSWER, { vs: 0.88 });
    me.note(B(10, 3.5), 1, 'D5', 0.72, { sharp: 18 });
    botPoint(B(10, 3.5), ['F#4', 'A4']);
    gallop(9, H.D, { lead: true, lap: 3, lift: 1.02 }); gallop(10, H.Ds, { lead: true, lap: 3 }); gallop(11, H.EbD, { lap: 3, flip: 4 });
    glue.chord(B(11), 8.02, H.EbD.glue, 0.27, { expr: [[0, 0.82], [0.55, 1], [1, 0.9]] });   // one bellows stroke over bars 11-12
    chop.chord(B(11), 0.3, CH.EbD, 0.5); chop.chord(B(11, 2.5), 0.25, CH.EbD, 0.46);
    pivot(11, 'Bb4', 4); pivot(12, 'C5', 2, 0.32);
    // bar 12: the Eb chord held, its bass walking Eb2 -> C2 -> C#2 -> D2, the single drum fill (hand to hand, accent on 4, a kick under 4.5)
    gallop(12, H.Eb, { upto: 3, lap: 3 });
    chop.chord(B(12), 0.3, CH.EbD, 0.5); chop.chord(B(12, 2.5), 0.25, CH.EbD, 0.48); brass.chord(B(12, 3), 0.4, BR.EbD, 0.5);
    tuba.note(B(12, 3), 0.7, 'C2', 0.68); kick.note(B(12, 3), 0.5, 'D1', 0.56);
    tuba.note(B(12, 4.5), 0.4, 'C#2', 0.72); kick.note(B(12, 4.5), 0.3, 'D1', 0.3);
    for (let k = 0; k < 8; k++) snare.hit(B(12, 3 + k * 0.25), 0.2, 0.22 + 0.034 * k + (k % 2 ? -0.05 : 0.05) + (k === 4 ? 0.12 : 0) + (k === 7 ? 0.1 : 0));
    for (const bt of [3, 3.5, 4]) hatHit(B(12, bt), 0.24, 3);
    hat.hit(B(12, 4.5), 0.5, 0.26, { open: 0.5 });
    // the bot grabs the next lap first: a 16th pickup Eb4 C#4 -> the hocket's D (the grid breaks once)
    line(bot, 12, [['Eb4', 4.5, 0.25, 0.54], ['C#4', 4.75, 0.25, 0.6, 's']], { horn: true, cents: 10 });

    // ================================================================ L4  13-16  hocket over D - Gm/D - Eb/D - D
    s.section('L4 hocket', B(13), B(17), 'chase');
    marker(13, 'D', 0.46, true);
    line(me, 13, [['D5', 1, 0.5, 0.72], ['F#5', 1.5, 0.5, 0.62], ['A5', 2, 0.5, 0.72, 't'], ['G5', 2.5, 0.5, 0.58]], { vs: 0.9 });
    line(bot, 13, [['F#4', 3, 0.5, 0.74], ['G4', 3.5, 0.5, 0.66, 's'], ['F#4', 4, 0.5, 0.74], ['D4', 4.5, 0.5, 0.64, 's']], { horn: true, vs: 1.15, cents: 10 });
    line(me, 14, [['G5', 1, 0.5, 0.72], ['Eb5', 1.5, 0.5, 0.62], ['D5', 2, 0.5, 0.66], ['A4', 2.5, 0.5, 0.56]], { vs: 0.9 });
    line(bot, 14, [['C4', 3, 0.5, 0.74], ['C#4', 3.5, 0.5, 0.68, 's']], { horn: true, vs: 1.15, cents: 10 });
    botFinish(B(14, 4), 0.55, 'D4', 0.74); me.note(B(14, 4), 1, 'D5', 0.76, { sharp: 18 });
    mePoint(B(14, 4.5), ['A5', 'F#6'], 0.42); botPoint(B(14, 4.5), ['F#4', 'A4'], 0.42);   // a tie: both, a touch softer
    gallop(13, H.D, { lead: true, lap: 4 }); gallop(14, H.GmDd, { lead: true, lap: 4 }); gallop(15, H.EbD, { lap: 4, flip: 2 });
    glueBar(15, H.EbD);
    glue.chord(B(16), 4.02, ['F#3', 'A3', 'D4'], 0.46, { expr: [[0, 0.75], [0.3, 0.6], [1, 1]] });   // the breath: the bellows hold and push
    chop.chord(B(15), 0.3, CH.EbDlo, 0.5); chop.chord(B(15, 2.5), 0.25, CH.EbDlo, 0.46);
    pivot(15, 'Bb4', 4); pivot(16, 'A4', 4, 0.42);
    // bar 16: a BREATH on beat 1 (a soft floor stays: tuba D2 on 3), a short jingle roll, the muted horns swelling a
    // fifth into the last lap, the gallop's pickup relaunching it
    gallop(16, H.D, { upto: 2, pick: false, lap: 4 });
    chop.chord(B(16), 0.3, CH.Dlo, 0.56); brass.chord(B(16), 0.4, BR.D, 0.52);
    tuba.note(B(16, 3), 0.5, 'D2', 0.45); kick.note(B(16, 3), 0.4, 'D1', 0.3);
    roll.hit(B(16, 3), 1.5, 0.3, { from: 0.35, to: 0.85 });
    horns.chord(B(16, 3), 1.75, ['D3', 'A3'], 0.52, { expr: 'cresc', release: 0.08 });
    gtrP.chord(B(16, 4.5), 0.13, ['D3', 'A3'], 0.44); gtrP.chord(B(16, 4.75), 0.13, ['D3', 'A3'], 0.6);
    kick.note(B(16, 4.75), 0.3, 'D1', 0.3);
    tuba.note(B(16, 4.5), 0.4, 'A1', 0.66);
    snare.hit(B(16, 4.5), 0.2, 0.26); lapEnd(16, 4);

    // ================================================================ L5  17-20  photo finish
    s.section('L5 photo finish', B(17), B(21), 'climax');
    marker(17, 'D', 0.42, true);
    me.note(B(17) - 0.06, 0.06, 'F5', 0.34);   // the rake (the blue third) into the new head
    line(me, 17, FIN, { vs: 0.98, top: 0.02, shape: (i) => (i === 0 ? 0.86 : 1) });
    line(bot, 17, FIN, { horn: true, tr: -12, vs: 1.02, cents: 10, shape: (i) => (i === 0 ? 0.72 : 1) });
    // the double neighbour: Eb5 (an 8th, above) -> C#5 (picked tremolo in 16ths, a beat, below) -> D5 on 4.5
    me.note(B(18, 3.5), 1, 'C#5', 0.7, { tremolo: true, tone: 'pick', tremRate: 10.4, damp: true, sharp: 18, tag: 'tension' });
    bot.note(B(18, 3.5), 0.9, 'C#4', 0.62, { decay: 1.5, attack: 0.02, tag: 'tension' });
    me.note(B(18, 4.5), 2, 'D5', 0.76, { tremolo: true, tone: 'pick', tremRate: 10.4, damp: true, sharp: 18 });
    botFinish(B(18, 4.5), 1, 'D4', 0.7);
    roll.hit(B(17, 3), 2, 0.28, { from: 0.35, to: 0.75 }); roll.hit(B(18, 3), 2, 0.32, { from: 0.4, to: 0.85 });   // 16th bursts
    // the photo flash (bar 19, beat 1) over a plain D: a short theremin D6 scoop + celesta + zils, centre
    ther.note(B(19), 0.7, 'D6', 0.36, { scoop: -1, scoopTime: 0.06, fall: -40, pan: 0 });
    cel.note(B(19), 0.4, 'D6', 0.34, { pan: 0 }); zils.note(B(19), 1, 'D7', 0.2, { damp: true });
    gallop(17, H.D, { lead: true, lap: 5, lift: 1.01, tv: 0.66 }); gallop(18, H.Ds, { lead: true, lap: 5, lift: 1.02 }); gallop(19, H.D, { lap: 5, flip: 4 });
    // bar 19: the D triad for three beats, then a clean Gm/D on beat 4 (iv -> the wedge)
    glue.chord(B(19), 3.02, ['A3', 'D4', 'F#4'], 0.27, { expr: [[0, 0.85], [0.6, 1], [1, 0.92]] });
    glue.chord(B(19, 4), 1.02, ['G3', 'Bb3', 'D4'], 0.28, { expr: 'flat' });
    chop.chord(B(19, 2.5), 0.25, CH.D, 0.48); chop.chord(B(19, 4), 0.2, CH.GmD, 0.44);
    s.section('seam', B(20), B(21), 'chase');
    wedge(20, H.D, 5);   // C#2 on beat 4 -> D2 of bar 1 (the seam, D4); the top Eb5 -> the lap chord's D5

    s.length(B(21));
  },
};
