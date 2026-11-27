// tools/music/tracks/stage_hunter.mjs
// "Counting Coins": the staged-practice cue for the POINT HUNTER stages (as many points as possible in 3 moves:
// calculating, greedy, a treasure hunt with a pirate-tavern wink). Part of the stage-cue set (scratchpad
// music/stage-set/PLAN.md, 2.7).
// node tools/music/render.mjs stage_hunter
//
// CONCEPT: three moves, three grabs. A tipsy tavern accordion SNATCHES at the treasure (C, the major 3rd) a beat early
// (a celesta glint doubles the grab), and the treasure turns to fool's gold (Cb) in its hand, souring as it is held;
// music-box coins are counted out after each grab, the last one slipping onto the leading tone. The second grab reaches
// higher, fails again (Fb), but lands on the real C. The third grab goes straight for the fool's gold, shakes it over a
// Freygish dominant (Eb7 b9 b13: Fb and Cb, a bellows shake) and turns it UP into C: the jackpot (glock cha-ching, a
// jingle rattle, coins). Then the seam.
//
// TEMPO / METRE: 147 BPM, 3/4, a waltz felt one in a bar (a dotted half = 49). A bar = 1.2245 s. 24 bars = 29.39 s, the
// whole file loops (stages of 6-60 s; the app fades it in 0.5 s at the stage end). The only waltz of the set. The pah
// instruments (guitar, left hand, tambourine shake) push beat 2 about 9 ms ahead and lay beat 3 back 3 ms (half that
// under the lead): a tavern lilt over a tuba and bass button that stay on the beat.
// KEY: Ab major with mixture, on PEDALS and short cycles as in the score: an Ab pedal (1-4: C <-> Cb, D8), a Db pedal
// (9-11: Db | Db6 | Dbm, F -> Fb, D10), an Eb dominant pedal (13-16, the harmony moves above it: Ab/Eb | Db/Eb |
// Bbm7/Eb | Eb7b9) and an Ab pedal again (20-22). The bVI (Fb major) is the deceptive surprise of move 3 (Eb2 -> Fb2),
// and the dominant of the jackpot is FREYGISH (Eb G Cb Db Fb: the b9 and the b13).
//
// MOTIFS (our own; checked by script against STYLE.md section 3, the Mori / Schvitz lists, kibbitzer TICK/CALL/RIFF,
// caper SNEAK/CALL/FLICK/TUBA and the other stage cues: no 4 consecutive shared intervals, no chromatic run over 3
// semitones, no 2+2 block shuttle; ornaments are not counted)
//   GRAB rhythm (all three moves): q | q 8 [top note on 2&, tied over the barline]: the reach arrives early, greedy.
//   GREED   (accordion, 1-4)   Eb5 _ (Bb)Ab5 | G5 Ab5. C6~ | Cb6~ _ Bb5 | Ab5 _       +5 -1 +1 +4 -1 -1 -2
//            over the Ab1 pedal: the C turns to Cb (fool's gold, D8 in the lead and the guitar's top C5 -> Cb5 -> Bb4,
//            rubbing against the held tonic); the held Cb6 sours (its side reeds open to 14 c, a ghost tone under it
//            sags -25 c: D12), then the sigh onto Ab5 over Eb7sus/Ab. An upper-neighbour crush Bb5 -> Ab5 in bar 1.
//   GREED+  (accordion, 9-12)  F5 _ Bb5 | A5 (Bb5 Cb6 Bb5) Db6~ | Fb6~ _ Eb6 Db6 | C6 _   +5 -1 +1 +1 -1 +3 +3 -1 -2 -1
//            a step higher over the Db pedal: the A5 is a sly #5 over Db6, the upper-neighbour turn flickers a second
//            fool's gold (Cb6), the grab lands on Fb6 over a bare Db-Ab fifth (the lead alone sours the F the pahs
//            held in bar 10: D10), then it steps down onto the REAL gold: C6 on a root-position Ab.
//   JACKPOT (accordion, 17-20) Eb5 _ (G)Ab5 | G5 Ab5. Cb6~ | ~ (bellows shake) | C6^ _    +5 -1 +1 +3 +1
//            the head over the deceptive bVI (Fb: the Eb5 is its maj7, the G5 a b3/3 rub), the grab goes straight to
//            Cb6, HELD through the Freygish Eb7 b9 b13 (guitar G4 Db5 Fb5, left hand G3 Cb4 Fb4) in a bellows shake
//            that grows, then the semitone turns UP: Cb6 -> C6 on the tonic (D8 reversed). Glock cha-ching, jingle rattle.
//   COINS   (celesta, music box) two-note drops (top, then a triplet 8th lower):
//            move 1 (4-5) Eb6 Db6 Bb5 falling, then the count SLIPS: Ab5 -> G5 (the leading tone; bar 6 lands it);
//            move 2 (12-13) a counterfeit coin Ab5 -> G5, a true one C6 -> Ab5, and one snatched F6 (bitten from E6,
//            left hanging into bar 14); move 3 (20) two coins from Ab6.
//   TAIL    (accordion, 23)    Fb5~ _ Eb5   the iv-minor sigh (D10), which is also the head's first note: the seam.
// SEMITONE DEVICES: D8 (C <-> Cb over the Ab pedal 2-3, the Cb6 turn 10, Ab -> Abm in bed bar 6, reversed into the
// jackpot 19-20), D10 (F -> Fb over the Db pedal 10-11, the left-hand sigh Fb4 -> Eb4 in 7, the tail 23), D3 (Cb -> Bb in
// the guitar top 3-4; Eb2 -> Fb2 deceptive bass 16-17; the coins' Ab -> G), the Freygish b9 (Fb over Eb in 16, 19, 24),
// D4 (the seam: G1 on beat 3 of bar 24 under G dim7 -> Ab1), D12 (a 12 c sharp lead, the souring fool's golds).
//
// FORM (bar: chord / bass; time)
//   Move 1   1-8   0:00.0  Ab | Ab/Eb | Abm/Ab | Eb7sus/Ab || Eb7 | Ab(->Abm) | Db(->Dbm6/Bb) | Ab7(/C)
//                          GREED 1-4, COINS 4-5, bed 6-8 (Ab7 = V/IV: Db arrives as expected, so the bVI stays the
//                          only deceptive move)
//   Move 2   9-16  0:09.8  Db | Db6 | Dbm(5) | Ab || Ab/Eb | Db/Eb | Bbm7/Eb | Eb7b9 (breath)   GREED+ 9-12, COINS 12-13
//   Move 3  17-24  0:19.6  Fb | Fb/Cb | Eb7b9b13 | Ab (JACKPOT) || Ab(7) | Db/Ab (off-beat wink) | Dbm/Fb | Eb7 (G dim7 seam)
//                          JACKPOT 17-20 (+coins), bed 21-22, TAIL 23, bed 24.
// Every move starts with the head on beat 1, so the cue says "who it is" in its first beat and is complete after 4.9 s
// (the first grab) or after any move. The lead plays in 13 of 24 bars, the coins answer inside 2 more; 9 bars are bed.
//
// ACCOMPANIMENT: tuba oom + the accordion's left-hand BASS BUTTON an octave above it on 1 (the oom a phone can hear),
// a pah on 2 and 3 from a wide doubled guitar pluck (a down-strum on 2, a lighter up-strum on 3) + the left-hand chord
// buttons (one pallet: all reeds of a button speak together; dry and short in the bed bars). In the lead bars the beat-3
// pah thins out (guitar only, soft) so the lead breathes; the left hand pushes and pulls every 2 bars; bed bars vary: a
// left-hand sigh Fb4 Eb4 (7), a guitar arpeggio (15), a breath before the bVI (16: the tuba holds its Eb2, one soft
// Freygish button chord, one jingle shake), one off-beat bar (22: dry guitar chops, a tuba + tambourine hit on 2&).
// Tambourine shake on 2 (on 3 every second bar), a hit on 1 of the heads and the bed bars, a ghost 8th shaker whose
// accents follow the bellows (seeded per bar) and that stops under the held fool's golds (3, 11, 19) and the breath (16).
//
// SOUND: a light musette accordion lead (wet 0.28, side reeds tuned per note so the beating stays 4-5 Hz across
// Eb5-Fb6, clamped 5.5-12 c; 14 c on the held fool's golds, where it sours), celesta coins with a triplet ping-pong
// echo, a glock cha-ching, a glass shimmer on the bVI. Dry and close: a 0.55 s plate on the lead and bells, a 0.25 s
// room on the band. The band (left hand + guitar) leans in only +1 to +2.5 dB where the lead rests; the rest is played
// (harder pahs, a brighter left hand). Guitar doubled wide (double 0.8, spread 0.85, bus width 1.35), left-hand buttons
// spread across the bellows (pan 0.02-0.42), tambourine and shaker at +-0.3, master width 1.1. The bass button keeps
// one 160 Hz high-pass, a -6 dB shelf at 240 Hz and +6.5 dB at 550 Hz (its phone harmonics), and tracks the bass pitch.
//
// MASTER (measured, revision 3): 29.40 s = 24 bars, -16.01 LUFS, -2.06 dBTP (AAC decoded -16.05 LUFS / -2.1 dBTP),
// LRA 1.9 LU, limiter max 2.3 dB, 0 clicks, DC 0.00003, loss after a 150 Hz high-pass 1.0 LU, bands sub -35.6 / bass
// -5.4 / presence -14.7 dB, harshness -11.9 dB (p95 -5.0), correlation 0.80, side/mid 150-1000 Hz -7.4 dB,
// 5-16 kHz -3.7 dB, loop seam PASS (level step 1.15 dB). Through a 300 Hz high-pass (phone) beat 1/2/3 = +2.7/0/+0.1 dB
// in the lead bars and +2.8/0/-0.1 dB in the bed bars; no bar has its downbeat under beat 2 or 3. Beat-2 pahs sit
// 5-8 ms ahead of the oom (score onsets).

import { n } from '../engine.mjs';

const BAR_COUNT = 24;

// harmony on beat 2 (and on beat 3 unless BEAT3 says otherwise)
const HARM = [null,
  'Ab', 'Ab', 'Abm', 'Eb7sus', 'Eb7', 'Ab', 'Db', 'Ab7',
  'Db', 'Db6', 'Db5', 'Ab', 'Ab', 'DbEb', 'Bbm7Eb', 'Eb7b9',
  'Fb', 'Fb', 'Eb7b9b13', 'Ab', 'Ab', 'Db', 'DbmFb', 'Eb7'];
// beat-3 colours of the bed bars (mixture without melody)
const BEAT3 = { 6: 'Abm', 7: 'Dbm6', 21: 'Ab7', 24: 'Gdim7' };
// the tuba's oom (beat 1): pedals on Ab (1-4), Db (9-11), Eb (13-16) and Ab (20-22)
const BASS = [null,
  'Ab1', 'Eb2', 'Ab1', 'Ab1', 'Eb2', 'Ab1', 'Db2', 'Ab1',
  'Db2', 'Db2', 'Db2', 'Ab1', 'Eb2', 'Eb2', 'Eb2', 'Eb2',
  'Fb2', 'Cb2', 'Eb2', 'Ab1', 'Ab1', 'Ab1', 'Fb2', 'Eb2'];
// accordion left-hand chord buttons ("pah", G3-F4: phones hear the harmony here). Bars 3 and 11 are open 5ths: the
// fool's gold belongs to the lead (and in 3 the guitar top) alone
const LH = {
  Ab: ['Ab3', 'C4', 'Eb4'], Abm: ['Ab3', 'Eb4'], Eb7sus: ['Ab3', 'Db4', 'Eb4'], Eb7: ['G3', 'Db4', 'Eb4'],
  Db: ['Ab3', 'Db4', 'F4'], Ab7: ['Gb3', 'C4', 'Eb4'], Db6: ['Bb3', 'Db4', 'F4'], Db5: ['Ab3', 'Db4'],
  DbEb: ['Ab3', 'Db4', 'F4'], Bbm7Eb: ['Bb3', 'Db4', 'F4'], Eb7b9: ['G3', 'Db4', 'Fb4'],
  Eb7b9b13: ['G3', 'Cb4', 'Fb4'], Fb: ['Ab3', 'Cb4', 'Fb4'], DbmFb: ['Ab3', 'Db4', 'Fb4'],
  Abm3: ['Ab3', 'Cb4', 'Eb4'], Dbm6: ['Ab3', 'Db4'], Gdim7: ['G3', 'Db4', 'Fb4'],
};
// guitar pah; the top voice moves by semitones: C5 -> Cb5 -> Bb4 (D8, D3) over the pedal
const GTR = {
  Ab: ['Eb4', 'Ab4', 'C5'], Abm: ['Eb4', 'Ab4', 'Cb5'], Eb7sus: ['Eb4', 'Ab4', 'Bb4'], Eb7: ['G4', 'Bb4', 'Db5'],
  Db: ['F4', 'Ab4', 'Db5'], Ab7: ['Eb4', 'Gb4', 'C5'], Db6: ['F4', 'Bb4', 'Db5'], Db5: ['Db4', 'Ab4', 'Db5'],
  DbEb: ['F4', 'Ab4', 'Db5'], Bbm7Eb: ['F4', 'Ab4', 'Db5'], Eb7b9: ['G4', 'Db5', 'Fb5'],
  Eb7b9b13: ['G4', 'Db5', 'Fb5'], Fb: ['Fb4', 'Ab4', 'Cb5'], DbmFb: ['Fb4', 'Ab4', 'Db5'],
  Dbm6: ['Fb4', 'Ab4', 'Db5'], Gdim7: ['G4', 'Db5', 'Fb5'],
};
const LEAD_BARS = new Set([1, 2, 3, 4, 9, 10, 11, 12, 17, 18, 19, 20, 23]);
// the band's lean (dB on the left hand and the guitar): coin bars a little, bed bars a little more; the rest is PLAYED
const LEAN = [null,
  0, 0, 0, 0, 1, 2.5, 2.5, 2.5,
  0, 0, 0, 0, 1, 2.5, 2.5, 2,
  0, 0, 0, 0, 1.5, 2, 1, 2.5];
// no shaker under the held fool's golds and in the breath
const SHAKER_REST = new Set([3, 11, 16, 19]);

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export default {
  id: 'stage_hunter',
  title: 'Counting Coins',
  bpm: 147,
  loop: true,

  build(s) {
    s.meter(3, 4);
    s.reverb({ rt60: 0.55, predelay: 0.01, damping: 0.45, early: 0.4, wet: 1 });   // the plate (lead, bells)
    s.room({ rt60: 0.25 });                                                          // the band's room
    s.delay({ beats: 2 / 3, feedback: 0.22, damp: 3500, pingpong: true, toReverb: 0.15 });   // the coins bounce in triplets
    s.master({
      lufs: -16, ceiling: -2.1,
      eq: [
        { type: 'peak', f: 420, q: 1, gain: -0.8 },
        { type: 'peak', f: 3000, q: 0.8, gain: 2 },
        { type: 'highshelf', f: 9000, q: 0.7, gain: 2 },
      ],
      glue: { threshold: -16, ratio: 1.5, attack: 0.015, release: 0.2, knee: 8 },
      width: 1.1,
    });
    s.humanize = { time: 0.004, vel: 0.04 };
    const B = (bar, beat = 1) => s.bar(bar, beat);
    const LOCK = { time: 0.003, vel: 0.03 };

    // ONE band: a smooth +-3 ms push/pull, a node every 2 bars, cyclic over the loop
    const ensR = s.rng('ensemble');
    const NODES = BAR_COUNT / 2;
    const dn = Array.from({ length: NODES }, () => (ensR() * 2 - 1) * 0.003);
    const drift = (beat) => {
      const x = beat / 6, i = Math.floor(x), f = x - i, w = (1 - Math.cos(Math.PI * f)) / 2;
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
    // the tavern lilt of the pah players: beat 2 pushed, beat 3 laid back (half under the lead)
    const lilt = (bt, inLead) => {
      const k = inLead ? 0.5 : 1;
      if (bt >= 2 && bt < 2.5) return inLead ? -0.007 : -0.010;
      if (bt >= 3 && bt < 3.5) return 0.003 * k;
      return 0;
    };
    // a chord played by ONE hand: one timing and level offset for the whole chord (seeded), then the strum
    const chR = s.rng('chords');
    const pah = (part, bar, bt, dur, pitches, vel, o = {}, strum = 0, inLead = false) => {
      const off = (chR() + chR() - 1) * 0.0045 + lilt(bt, inLead);
      const vj = 1 + (chR() * 2 - 1) * 0.04;
      const ps = strum < 0 ? [...pitches].reverse() : pitches;
      // a strum is aimed with its middle string on the (lilted) beat
      const c = Math.abs(strum) * (ps.length - 1) / 2;
      // the left hand's buttons spread a little across the bellows (stereo-miked bass side)
      const pn = part === lh ? (i) => ({ pan: 0.22 + 0.4 * (i / Math.max(1, ps.length - 1) - 0.5) * (strum < 0 ? -1 : 1) }) : () => ({});
      ps.forEach((p, i) => part.note(B(bar, bt), dur, p, Math.min(1, vel * vj * (1 - 0.03 * i)),
        { ...o, ...pn(i), exact: true, _shift: off - c + Math.abs(strum) * i + (chR() * 2 - 1) * 0.001 }));
    };

    // ---------------------------------------------------------------- buses
    const busLead = s.bus('lead', { gain: -7.6, pan: -0.1, width: 1.6, reverb: 0.18, room: 0.08, delay: 0.03,
      eq: [{ type: 'hp', f: 180 }, { type: 'peak', f: 988, q: 4, gain: -1.5 }, { type: 'peak', f: 2200, q: 0.8, gain: 1 },
        { type: 'peak', f: 3800, q: 1, gain: -1.5 }, { type: 'highshelf', f: 6500, q: 0.7, gain: -3 }] });
    const busGhost = s.bus('ghost', { gain: -19, pan: -0.1, reverb: 0.18, room: 0.08 });
    const busLH = s.bus('lh', { gain: 0, pan: 0, width: 1.6, room: 0.14,
      eq: [{ type: 'hp', f: 150 }, { type: 'peak', f: 400, q: 1, gain: -1.5 }, { type: 'highshelf', f: 4000, q: 0.7, gain: -3 }] });
    // the bass button: the oom the phone hears (its reed harmonics at 200-800 Hz); one gentle high-pass so an Ab2 keeps
    // its 2nd and 3rd harmonics
    const busOom = s.bus('oom', { gain: -2, width: 0, room: 0.06,
      eq: [{ type: 'hp', f: 160 }, { type: 'lowshelf', f: 240, q: 0.7, gain: -6 }, { type: 'peak', f: 550, q: 0.9, gain: 6.5 }, { type: 'highshelf', f: 3000, q: 0.7, gain: -2 }] });
    const busGtr = s.bus('guitar', { gain: -6.5, pan: -0.18, width: 1.35, room: 0.1, reverb: 0.06, comp: { threshold: -24, ratio: 3, attack: 0.0008, release: 0.05, knee: 6, makeup: 0 },
      eq: [{ type: 'hp', f: 150 }, { type: 'peak', f: 2800, q: 0.8, gain: 2.5 }] });
    const busTuba = s.bus('tuba', { gain: -3.5, width: 0, room: 0.05, sat: 5, comp: { threshold: -22, ratio: 3, attack: 0.004, release: 0.09, knee: 6 },
      eq: [{ type: 'hp', f: 32 }, { type: 'lowshelf', f: 90, q: 0.7, gain: 2 }, { type: 'peak', f: 450, q: 1, gain: 4.5 }, { type: 'lp', f: 9000, q: 0.7 }] });
    const busCel = s.bus('celesta', { gain: -5.5, pan: 0.3, width: 1.7, reverb: 0.18, delay: 0.14,
      eq: [{ type: 'peak', f: 2500, q: 1.5, gain: 2 }, { type: 'highshelf', f: 3500, q: 0.7, gain: 4 }] });
    const busGlock = s.bus('glock', { gain: -9, pan: 0.25, reverb: 0.2, delay: 0.18, eq: [{ type: 'peak', f: 3200, q: 3, gain: -2 }] });
    const busGlass = s.bus('glass', { gain: -12, reverb: 0.25, width: 1.3 });
    const busTamb = s.bus('tamb', { gain: -1.5, pan: 0.3, room: 0.06, width: 0.8,
      eq: [{ type: 'peak', f: 3500, q: 0.8, gain: -3 }, { type: 'peak', f: 4683, q: 12, gain: -3 }, { type: 'peak', f: 5265, q: 10, gain: -3 },
        { type: 'peak', f: 6315, q: 10, gain: -3 }, { type: 'peak', f: 6831, q: 6, gain: -3 }, { type: 'highshelf', f: 9000, q: 0.7, gain: -1.5 }] });
    const busShk = s.bus('shaker', { gain: -9, pan: -0.3 });
    const busJing = s.bus('jingles', { gain: -5.5, pan: 0.2, room: 0.06,
      eq: [{ type: 'peak', f: 3500, q: 0.8, gain: -4 }, { type: 'highshelf', f: 8000, q: 0.7, gain: -2 }] });

    // the band (left hand + guitar) leans in where the lead rests; a 0.5-beat ramp into each new value
    const lean = [[0, LEAN[1]]];
    for (let bar = 2; bar <= BAR_COUNT; bar++) if (LEAN[bar] !== LEAN[bar - 1]) lean.push([B(bar) - 0.5, LEAN[bar - 1]], [B(bar), LEAN[bar]]);
    lean.push([B(BAR_COUNT + 1) - 0.5, LEAN[BAR_COUNT]], [B(BAR_COUNT + 1), LEAN[1]]);
    busLH.automate('gain', lean);
    busGtr.automate('gain', lean);
    // the third head and the tail sit a little forward; the jackpot bar on top
    busLead.automate('gain', [
      [B(17) - 0.5, 0], [B(17), 2], [B(18) - 0.5, 2], [B(18), 0],
      [B(20) - 0.5, 0], [B(20), 1.5], [B(21) - 0.5, 1.5], [B(21), 0],
      [B(23) - 0.5, 0], [B(23), 2.5], [B(24) - 0.5, 2.5], [B(24), 0]]);

    // ---------------------------------------------------------------- parts
    const SHARP = 0.12;   // the lead sits 12 c sharp of the band (D12)
    const acc = feel(s.part(busLead, 'accordion', { wet: 0.28, reeds: 3, spread: 1, name: 'accordion:lead' }));
    // side reeds tuned per note: a 4-5 Hz beat from Eb5 to Fb6 (a real musette is tuned narrower going up)
    {
      const inner = acc.note;
      acc.note = (beat, dur, pitch, vel, o = {}) => {
        const m = typeof pitch === 'number' ? pitch : n(pitch);
        const mus = Math.min(12, Math.max(5.5, 4.7 / (mtof(m) * 0.000578)));
        return inner(beat, dur, pitch, vel, { musette: mus, ...o });
      };
    }
    const ghost = feel(s.part(busGhost, 'thereminLead', { name: 'ghost:sag' }));
    const lh = feel(s.part(busLH, 'accordion', { wet: 0, reeds: 1, high: 0.35, bright: 0.8, spread: 1.5, name: 'accordion:lh' }), 0.002);
    const oom = feel(s.part(busOom, 'accordion', { wet: 0, reeds: 1, chop: false, attack: 0.012, release: 0.05, bright: 2.2, name: 'accordion:bass' }), 0.001);
    const gtr = feel(s.part(busGtr, 'pluck', { body: 'guitar', double: 0.8, spread: 0.85, damp: true, name: 'guitar:pah' }), 0.002);
    const tuba = feel(s.part(busTuba, 'tuba', { growl: 0.5, humanize: LOCK }));
    const cel = feel(s.part(busCel, 'celesta', { name: 'celesta:coins' }));
    const glock = feel(s.part(busGlock, 'glockenspiel'));
    const glass = feel(s.part(busGlass, 'glassPad', { split: 0.5 }));
    const tamb = feel(s.part(busTamb, 'tambourine', { stroke: 'shake', spread: 0.8 }), 0.002);
    const shk = feel(s.part(busShk, 'shaker'), 0.002);
    const jing = feel(s.part(busJing, 'jingleRoll'));

    // ---------------------------------------------------------------- the waltz
    const MOVE_HEAD = new Set([1, 9, 17]);
    const shR = s.rng('shaker');
    const SH = [0.5, 0.26, 0.36, 0.24, 0.38, 0.28];
    const DRY = { release: 0.04 };   // the left hand's short, dry buttons in the bed bars
    for (let bar = 1; bar <= BAR_COUNT; bar++) {
      const h = HARM[bar], h3 = BEAT3[bar] || h;
      const inLead = LEAD_BARS.has(bar);
      const head = MOVE_HEAD.has(bar) || bar === 20;
      // oom: the tuba and the left-hand bass button an octave above it
      // (16: the breath; the tuba holds its Eb2 through it and steps a semitone up into the bVI)
      const tv = bar === 17 ? 0.58 : bar === 23 ? 0.5 : head ? 0.66 : 0.6 + 0.04 * (bar % 2);
      tuba.note(B(bar), bar === 16 ? 2.7 : 0.85, BASS[bar], tv, bar === 16 ? { expr: [[0, 1], [0.35, 0.8], [1, 0.72]] } : {});
      // the bass button tracks the pitch a little (a low button speaks weaker through a phone)
      // (and leans on the bars where the lead's grab lands on a weak beat: 10, 19, 20)
      const track = Math.min(1.3, Math.max(1, 1 + 0.03 * (n('Eb2') - n(BASS[bar])))) * (bar === 10 || bar === 19 || bar === 20 ? 1.12 : 1);
      oom.note(B(bar), 0.4, n(BASS[bar]) + 12, Math.min(1, (head ? 0.7 : inLead ? 0.7 : 0.68) * track));
      // the bellows push and pull every 2 bars
      const pushed = Math.floor((bar - 1) / 2) % 2 === 0;
      const pv = pushed ? 0.43 : 0.38, bright = pushed ? 0.85 : 0.75;
      const lhBed = { expr: 'fp', bright: 0.9, ...DRY };
      if (bar === 22) {
        // the off-beat bar: dry guitar chops on 1& and 3&, a tuba + tambourine + button hit on 2& (a wink, once per loop)
        pah(gtr, bar, 1.5, 0.25, GTR[h], 0.44, {}, 0.008);
        pah(lh, bar, 2.5, 0.15, LH[h], 0.5, { chop: true });
        pah(gtr, bar, 3.5, 0.25, GTR[h], 0.4, {}, -0.007);
      } else if (bar === 16) {
        // the breath: one soft Freygish button chord on 2, its Fb4 the common tone into the bVI
        pah(lh, bar, 2, 1.6, LH[h], 0.3, { expr: [[0, 0.7], [0.3, 1], [1, 0.6]], bright: 0.7, tag: 'tension' });
      } else {
        // pah on 2: guitar down-strum + left hand (in 15 the guitar breaks the chord into 8ths instead)
        if (bar !== 15) pah(gtr, bar, 2, 0.55, GTR[h], inLead ? 0.36 : 0.47, {}, 0.010, inLead);
        if (inLead) pah(lh, bar, 2, bar % 4 === 1 ? 0.7 : 0.6, LH[h], pv * 0.88, { expr: 'fp', bright }, 0, true);
        else pah(lh, bar, 2, 0.4, LH[h], pv * 0.98, lhBed);
        // pah on 3: soft guitar only under the lead
        if (bar === 7) {
          // Db -> Dbm6/Bb: the left hand sighs Fb4 -> Eb4 (D10) over the tuba's Bb1
          pah(lh, bar, 3, 0.4, LH.Dbm6, pv * 1.0, lhBed);
          lh.note(B(7, 3), 0.5, 'Fb4', pv * 0.95, { expr: 'fp', bright: 0.9, pan: 0.3, _shift: lilt(3, false) });
          lh.note(B(7, 3.5), 0.45, 'Eb4', pv * 0.8, { expr: 'dim', bright: 0.9, pan: 0.3 });
          pah(gtr, bar, 3, 0.45, GTR.Dbm6, 0.42, {}, -0.008);
        } else if (bar === 15) {
          // the guitar breaks the chord: 3 8ths on 2, 2&, 3, each left ringing
          const g = GTR[h];
          gtr.note(B(15, 2), 1, g[0], 0.5, { _shift: lilt(2, false) });
          gtr.note(B(15, 2.5), 0.9, g[1], 0.46);
          gtr.note(B(15, 3), 0.9, g[2], 0.46, { _shift: lilt(3, false) });
          pah(lh, bar, 3, 0.4, LH[h], pv * 0.95, lhBed);
        } else {
          pah(gtr, bar, 3, 0.5, GTR[h3], inLead ? 0.26 : 0.41, {}, -0.008, inLead);
          if (!inLead && bar !== 14) pah(lh, bar, 3, 0.4, LH[h3 === 'Abm' ? 'Abm3' : h3], pv * 0.95, lhBed);
        }
      }
      // tambourine: shake on 2, on 3 every second bar; a hit on 1 of each move head, the jackpot and the bed bars
      if (bar !== 22) tamb.hit(B(bar, 2), 0.5, inLead ? 0.3 : 0.25, { _shift: lilt(2, inLead) });
      if (bar % 2 === 1 && bar !== 15 && bar !== 5 && bar !== 13) tamb.hit(B(bar, 3), 0.5, 0.25, { _shift: lilt(3, inLead) });
      if (head) tamb.hit(B(bar), 0.5, bar === 20 ? 0.45 : 0.38, { stroke: 'hit' });
      else if (!inLead && bar !== 16) tamb.hit(B(bar), 0.5, 0.38, { stroke: 'hit' });
      // the ghost 8th shaker (a hand that counts, pushing with the bellows); it stops under the held fool's golds
      if (!SHAKER_REST.has(bar)) {
        const push = (bar % 2 === 1) ? 0.06 : 0;
        for (let i = 0; i < 6; i++) {
          if (i === 3 && inLead && bar % 4 === 2) continue;   // the hand breathes with the phrase
          const v = SH[i] + (shR() * 2 - 1) * 0.06 + (i === 0 ? push : 0);
          shk.hit(B(bar, 1 + i * 0.5), 0.25, Math.max(0.12, v));
        }
      }
    }
    tamb.hit(B(22, 2.5), 0.5, 0.42, { stroke: 'hit' });   // the wink
    // tuba walks: Bb1 under Dbm6 into Ab7 (7); C2 under Ab7 -> Db (8); Ab1 Bb1 into the Eb pedal (12); Bb1 the pedal's
    // 5th (14); Eb2 the wink (22); the seam G1 -> Ab1 under G dim7 (D4), short so it is gone before the Ab1
    tuba.note(B(7, 3), 0.6, 'Bb1', 0.48);
    tuba.note(B(8, 3), 0.6, 'C2', 0.5);
    tuba.note(B(12, 3), 0.6, 'Bb1', 0.48);
    tuba.note(B(14, 3), 0.5, 'Bb1', 0.44);
    tuba.note(B(22, 2.5), 0.35, 'Eb2', 0.56);
    tuba.note(B(24, 3), 0.5, 'G1', 0.58, { expr: [[0, 1], [0.8, 0.95], [1, 0.6]] });
    // the breath bar keeps one held jingle shake on 3, so the bVI is waited for, not fallen into
    tamb.hit(B(16, 3), 0.9, 0.3);
    // bed bars: the guitar lilts on 3& (a top-note pickup, a semitone neighbour where it can be)
    gtr.note(B(6, 3.5), 0.4, 'Bb4', 0.36);     // Cb5 -> Bb4 (D3)
    gtr.note(B(8, 3.5), 0.4, 'C5', 0.38);      // doubles the tuba's C into Db
    gtr.note(B(14, 3.5), 0.4, 'Eb5', 0.36);    // the pedal note on top
    gtr.note(B(21, 3.5), 0.4, 'C5', 0.36);
    gtr.note(B(24, 3.5), 0.4, 'Db5', 0.36);    // the 7th of the dominant, falling to the head's C/Eb

    // ---------------------------------------------------------------- the lead
    const L = (bar, beat, dur, p, vel, o = {}) => acc.note(B(bar, beat), dur, n(p) + SHARP, vel, { _extend: 0.05, ...o });
    const grace = (bar, beat, p, vel, len = 0.12) => acc.note(B(bar, beat) - len, len + 0.02, n(p) + SHARP, vel, { attack: 0.008, release: 0.03 });
    const sag = (bar, beat, dur, p, vel) => ghost.note(B(bar, beat), dur, n(p) + SHARP, vel,
      { sharp: 0, scoop: 0, vibrato: 0, fall: -25, fallTime: 0.3, drift: 0.3, attack: 0.06 });
    const coin = (bar, beat, top, low, v = 0.42) => {
      cel.note(B(bar, beat), 1 / 3, top, v);
      if (low) cel.note(B(bar, beat + 1 / 3), 1 / 3, low, v * 0.8);
    };
    const T = 1 / 6;   // 16th triplets
    const turn = (bar, beat, ps, vels) => ps.forEach((p, i) =>
      acc.note(B(bar, beat) + i * T, T + 0.02, n(p) + SHARP, vels[i], { attack: 0.01, release: 0.03 }));

    // Move 1: GREED, then three coins and a slip
    s.section('Move 1', B(1), B(9), 'gentle');
    L(1, 1, 1, 'Eb5', 0.62);
    grace(1, 3, 'Bb5', 0.5);                                         // the upper crush
    L(1, 3, 1, 'Ab5', 0.6);
    L(2, 1, 1, 'G5', 0.54);
    L(2, 2, 0.5, 'Ab5', 0.58);
    L(2, 2.5, 1.5, 'C6', 0.72, { expr: [[0, 1], [0.6, 0.92], [1, 0.85]], _extend: 0 });   // snatched a beat early
    cel.note(B(2, 2.5), 0.5, 'C6', 0.3);                                         // ...and it glints
    L(3, 1, 2, 'Cb6', 0.64, { expr: [[0, 0.95], [0.3, 1], [1, 0.72]], musette: 14 });   // fool's gold, souring...
    sag(3, 1, 2, 'Cb6', 0.5);                                                   // ...in the hand (D12)
    L(3, 3, 1, 'Bb5', 0.54, { expr: 'flat' });
    L(4, 1, 2, 'Ab5', 0.58, { expr: [[0, 1], [0.6, 0.85], [1, 0.5]] });
    coin(4, 3, 'Eb6', 'Bb5', 0.44);
    coin(5, 1, 'Db6', 'G5', 0.42);
    coin(5, 2, 'Bb5', 'Eb5', 0.4);
    coin(5, 3, 'Ab5', 'G5', 0.38);   // the count slips onto the leading tone; bar 6 lands it

    // Move 2: GREED+, then a counterfeit coin, a true one and a snatched one
    s.section('Move 2', B(9), B(17), 'gentle');
    L(9, 1, 1, 'F5', 0.62);
    L(9, 3, 1, 'Bb5', 0.6);
    L(10, 1, 0.9, 'A5', 0.54, { _extend: 0 });
    turn(10, 2, ['Bb5', 'Cb6', 'Bb5'], [0.56, 0.5, 0.54]);                       // a fool's-gold flicker in the turn
    L(10, 2.5, 1.5, 'Db6', 0.68, { expr: [[0, 1], [0.6, 0.92], [1, 0.85]], _extend: 0 });
    L(11, 1, 2, 'Fb6', 0.6, { expr: [[0, 0.95], [0.3, 1], [1, 0.7]], musette: 12 });   // fool's gold again (D10)
    sag(11, 1, 2, 'Fb6', 0.44);
    L(11, 3, 0.5, 'Eb6', 0.54);
    L(11, 3.5, 0.5, 'Db6', 0.52);
    L(12, 1, 2, 'C6', 0.62, { expr: [[0, 1], [0.6, 0.88], [1, 0.5]] });        // the real gold
    coin(12, 3, 'Ab5', 'G5', 0.38);                                             // counterfeit
    coin(13, 1, 'C6', 'Ab5', 0.4);                                              // true
    cel.note(B(13, 2) - 1 / 6, 1 / 6, 'E6', 0.26);                               // bitten...
    cel.note(B(13, 2), 1, 'F6', 0.34);                                            // ...snatched, left hanging

    // Move 3: the bVI surprise, the held fool's gold over the Freygish dominant, the JACKPOT
    s.section('Move 3', B(17), B(BAR_COUNT + 1), 'climax');
    glass.chord(B(17), 5.5, ['Ab3', 'Cb4', 'Fb4'], 0.32);
    L(17, 1, 1, 'Eb5', 0.64);
    grace(17, 3, 'G5', 0.48);                                                   // the leading-tone crush
    L(17, 3, 1, 'Ab5', 0.62);
    L(18, 1, 1, 'G5', 0.56);
    L(18, 2, 0.5, 'Ab5', 0.6);
    // the grab goes straight for the fool's gold and HOLDS it: steady, then a bellows shake in 8ths that grows into the turn
    const shake = [[0, 0.85], [0.3, 0.88]];
    for (let k = 0; k < 6; k++) {
      const u0 = 1 / 3 + k / 9, pk = 0.86 + 0.045 * k;
      shake.push([u0, pk * 0.62], [u0 + 0.025, pk], [u0 + 1 / 9 - 0.02, pk * 0.92]);
    }
    L(18, 2.5, 4.5, 'Cb6', 0.62, { expr: shake, tag: 'tension', _extend: 0 });
    jing.hit(B(19, 3), 1, 0.6, { from: 0.3, to: 0.75 });
    L(20, 1, 2.7, 'C6', 0.78, { expr: [[0, 1], [0.4, 0.95], [1, 0.65]] });     // Cb -> C: the jackpot
    glock.chord(B(20), 0.25, ['Eb6', 'Ab6'], 0.42);                     // cha-
    glock.chord(B(20, 1.5), 0.75, ['Ab6', 'Eb7'], 0.46, { amp: 1.26 });   // -ching (no C: clear of the lead's octave)
    coin(20, 2.5, 'Ab6', 'Eb6', 0.38);
    coin(20, 3.5, 'Eb6', 'Ab5', 0.36);
    // the tail: the iv-minor sigh, which hands the Eb5 to bar 1
    L(23, 1, 2, 'Fb5', 0.52, { expr: [[0, 0.85], [0.4, 1], [1, 0.7]] });
    L(23, 3, 1, 'Eb5', 0.46, { expr: 'dim', _extend: 0 });

    s.length(B(BAR_COUNT + 1));
  },
};
