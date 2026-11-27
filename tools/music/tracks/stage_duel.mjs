// tools/music/tracks/stage_duel.mjs
// "Standoff": the staged-practice cue for the DUEL stages (duel to 30 against the bot: locks, digits, score and
// penalties). Combative and cheeky. Plan: scratchpad/music/stage-set/PLAN.md section 2.6.
// node tools/music/render.mjs stage_duel
// Revision 4 (gate round 3): the jab no longer lands C#-E-D-B# (the D drops a tritone to G#, G#7b5 spelled out), the
// circling walk is new (no tonic-up-m3-down-semitone opening, no B#-C# close), bar 6 has its own twist (no exact
// transposed sequence), the seam's bass comes to C# from ABOVE (the D7 tritone substitute, D2 -> C#2) and the tuba's
// pickup drops a third to the feint (no step-down D#/D -> B# -> C# -> E across the seam), the taunt sings the #4 only as a lower
// neighbour with a -80 c sag (no third-wide fall), a sparse celesta blip doubles the bot's b6 -> 5 in its punch bars,
// the plunger is a mute colour (no cartoon sweep), the riq / stabs / master are narrowed (mono-safe jingles), the
// guitar "chk" and the walk guitar decay like plucked strings, bars 10 and 12 breathe, the knockout rings no bell.
//
// TEMPO / METRE: 140 BPM, 4/4, a bar = 1.714 s. 16 bars = 27.43 s, the whole file loops (a stage of up to 60 s loops
// it; the app fades it out in 0.5 s when the stage ends).
//   THE BOXER BOUNCE: the tuned kick and the pizz together on 1 and 3, a ghost kick on 2a (the skip into 3), the pizz
//   approach note on 4& into the next bar (the semitone approaches live there). The guitar "chk" bounces right after
//   each bass hit on 1& and 3& (short, damped: a skip-rope double bounce, not a 2/4 backbeat), a flammed clap on 4
//   only. Riq: steady seeded teks on every off-beat 8th with seeded 16th "ka" ghosts, a dum ghost on 2 or 2a (in the
//   punch bars a dum ON 1 for the phone, and the 2&/4& teks lean with the bot's hits). Nothing on 2 and 4 but the dum
//   ghost and the clap: no oom-pah (caper), no 3+3+2 bulgar (forbidden by the set), no half-time (Mori), no gallop (race).
//   Fills and stops at the 2-bar seams: 2/4 tek-ka pickup, bar 4 a STOP (the hook alone on 4), 6/4& pickup, 8 a 16th
//   roll, 10/4 a snare flam, 12/4& a jingle, 14 dum-tek-tek-tek-dum.
// KEY: C# harmonic minor (C# D# E F# G# A B#), the dominant G# Freygish, the Phrygian b2 (D) as a passing colour and
//   as the D7 tritone substitute (11 and the seam); ONE Misheberach flash (F## = the #4, a lower neighbour of G# in
//   the tuba over the D#7/C# chk) in the taunt.
//
// THE TWO SIDES (panned on purpose):
//   ME  = a solo TUBA in its upper register (G#2-A3), cheeky staccato 8ths with scoops, growl and leaning accents,
//         +12 c sharp of the band on its moving notes and pickups (D12); notes that meet the bass or a chord tone in
//         an octave (the landings) sit at +3/+4 c, the KO unison at 0. Slightly LEFT, pushing 6 ms AHEAD of the beat
//         (the very first note is clamped to start at sample 0); its own damped-guitar "chk" on 1& and 3& (left).
//   BOT = a MUTED BRASS section (stab, kind brass) on its own bus, slightly RIGHT (a point, not a wash). Its short
//         jabs are dry and open; its LONG hits (3/2&, 7/2&, 8/1) speak through a mute: the bus low-pass sits at
//         1.8 kHz on the attack and opens to 6.5 kHz within 0.3 beat (no re-closing "doo"). Loose players (seeded
//         1-7 ms per voice, the top voice on the beat). In its punch bars (3, 7) a soft dry CELESTA blip doubles its
//         top voice two octaves up on 2& and 4& (A5 -> G#5: the toy-bell layer of the score, b6 -> 5 on top).
//   When one side plays, the other side's comping is out: jab bars have the guitars, punch bars have only the bot,
//   and in the clinch the bot's hits TAKE the guitar's slots.
//
// MOTIFS (all our own; checked by script (scratchpad/music/duel_r4/ngram.mjs, contour.mjs): no 4 consecutive intervals of
// the tuba, pizz or walk shared with kibbitzer, caper, caper_final, lobby, the seven other stage cues or the STYLE
// section 3 hooks (only the bot's trivial A4/G#4 neighbour wiggles and generic 4-grams such as +1 +3 -2 -1 recur);
// contour check against the Kugel title riff: no 4-note window of a phrase matches its C#-E-D#-B# cell, transposed, in
// 4 of 4 pitch classes, and the walk and the seam no longer match it in 3 of 4. The jab's head B#-C#-E (leading tone,
// tonic, b3) is generic minor vocabulary and stays: it continues D -> C#, never down to the 5th or to D#-B#)
//   JAB   (tuba, bar 1)  B#2 C#3 _ E3^ D3 _ G#2 D#3 (+1 +3 -2 -6 +7): a FEINT from the leading tone on the very first
//         downbeat, the jab up to the b3, the Phrygian b2 (D, over the G# bass) dropping a tritone to G# (the G#7b5
//         spelled out, in octaves with the bass), D# (the 5th of G#7) pushing into the landing. Bar 2: C#3^ (land, the
//         D finally resolved) _ A2^ G#2 (b6 -> 5).
//   PUNCH (bot, on 2& and 4&, BETWEEN the bounce)  A [C#4 E4 A4] -> G#(maj) [B#3 D#4 G#4]: three semitone moves at
//         once (A -> G#, C# -> B#, E -> D#). Bar 4 = the bot's one-two-HOOK: 2& A, 3& A, 4 G#7b9 ALONE (the whole band
//         stops), 4& the b9 falls A4 -> G#4 (G#7) with the bass G#1 coming back in.
//   JAB UP A 4th (5) over F#m: E#3 F#3 _ A3^ G3 _ C#3 G#3 (the same slip, G over C#: C#7b5); bar 6 is the
//         TWIST: F#3^ A3 _ D3^ C#3 (a pop up to A3, then the b6 -> 5 of F#m a beat LATE: the Neapolitan D -> C# the
//         bot is about to shout).
//   RETORT (tuba, 8)  after the bot's G#7b9 on 1 (and a soft guitar G#7 on 1&): G#2 D#3 F#3^ A3^ (up the G#7b9, the
//         A3 falls to the clinch's G#3).
//   CLINCH (9-10)  9: the jab from the top, and the tuba takes the bot's correction: G#3 C#3 _ E3 D3 _ D#3 G#2 (D -> D#,
//         the bot mocks it in a low voicing, top E4 on 2 and D#4 on 3&); 10: the exchange breaks up: G#3 alone, the
//         bot's D major on 2, C#3 on 3, the bot's G#7 (top F#4) on 3&.
//   CIRCLING (11-12) no lead: the pizz walks C#2 G#1 D#2 E2 | D2 C#2 B#1 G#1 (-5 +7 +1 -2 -1 -1 -4: down to the 5th,
//         up the G# chord to E, the Neapolitan D on 3 falling through C# and the leading tone; accents on 1 and 3),
//         shadowed two octaves up by a soft, ringing guitar; 12 is a breath: the pizz alone G#1 _ A1 D2 B#1 -> C#2
//         under the chk and a glass dyad.
//   TAUNT (13-14)  C#3 D#3 E3 _ G#3 F##3 G#3~ (+2 +1 +4 -1 +1: the #4 flashes as G#'s lower neighbour WITH the D#7/C#
//         chk, the held G#3 sags -80 c at its end); 14: A3^ F##3 G#3 (the fifth circled from both sides, D1), the
//         bot's G#7b9 on 3& and a G#7b9 voiced up to B#4 on 4& (the leading tone on top into the KO's C#).
//   KO    (15/1)  tuba C#3 (in tune) + the bot G#3 C#4 G#4 + pizz + a dropKick + a short 808 C#2 (the one modern
//         device); a quiet finger-cymbal tick inside the band; the bounce goes straight on (riq teks, chk, the pizz E2
//         on 3 and A1 -> G#1 into 16), 15/4 a jingle breath: an arrival that pushes on, not a final button.
//   GET UP (16)  the bot climbs its top voice A4 -> G#4 -> B#4 over the D7 tritone substitute [D4 F#4 B#4] on 4&; the
//         bass G#1 B#1 D#2 D2 -> C#2 comes to the tonic from ABOVE (D2), the bot's top B#4 points up to C#, and the
//         tuba's pickup F#3 E3 drops a third to the feint B#2 -> C#3: the tonic reached from above (bass) and below
//         (lead and bot), a contrary-motion seam of our own.
//
// FORM (bar: chord; time at 140 BPM)
//   1-2   0.00  JAB              C#m (G#7b5 flash) | C#m        tuba + guitars; bass C#2 G#1 B#1 | C#2 C#2 (E2) B1
//   3-4   3.43  PUNCH            A -> G# | A -> G#7b9 -> G#7      the bot only (+ celesta blips in 3); bass A1 C#2 G#1;
//                                                                  STOP 4/4
//   5-6   6.86  JAB up a 4th     F#m (C#7b5) -> C#7 | F#m         tuba + guitars; bass F#1 C#2 E#2 | F#2 F#1 (A1) C#2
//   7-8  10.29  PUNCH + RETORT   D -> G# | G#7b9                  the bot (D4 -> D#4 vs A4 -> G#4, contrary: D6, the bass
//                                                                  D2 -> D#2 with it; celesta blips), retort over G#1 B#1 D#2
//   9-10 13.71  CLINCH           C#m . G#7 | D . G#7              the bot in the guitar's slots, mocking the jab
//   11-12 17.14 CIRCLING         C#m . D/C# | C#m . D/A           the bed: the pizz walk (+ a soft guitar shadow in 11),
//                                                                  a soft glass C#/E dyad
//   13-14 20.57 TAUNT            C#m . D#7/C# | G#7b9              the climb and the neighbour, the bot's anger
//   15   24.00  KNOCKOUT         C# (unison) -> C#m bed            the hit, the 808; the bounce goes on; 15/4 jingle breath
//   16   25.71  GET UP           G#7b9 -> G#7 -> D7(no 5)          bass G#1 B#1 D#2 D2 -> C#2, bot top -> B#4
//   Melody (the tuba) in 1, 2 (half), 5, 6 (half), 8 (half), 9, 10 (two notes), 13, 14 (half), 15 (one hit), 16 (a
//   pickup); the walk shadow in 11: about 8 of 16 bars carry a line.
//
// SEMITONE DEVICES: D4 (the feint B#2 -> C#3 on the first downbeat, E#3 -> F#3 in 5, the bot's B#4 -> the KO's C#),
//   D3 (A -> G# in every punch and in the celesta, the jab's b6 -> 5, the hook's b9 falling, the retort's A3 -> G#3,
//   15/4& A1 -> G#1), D2 (the jab's D -> C#, D -> C# in the walk, D/C# -> C#m in the circling, the seam's bass D2 ->
//   C#2 under the D7 tritone substitute), D6 (7: D4 -> D#4 against A4 -> G#4; 16: the bass D#2 D2 -> C#2 against the
//   bot's top G#4 -> B#4), D1 (the taunt's F## and A around G#; the walk's D C# B# C#; bass D2 and tuba B#2
//   around C# at the seam), the Misheberach #4 (13), the bot's correction D3 -> D#3 (9), D12 (tuba scoops, +12 c, the taunt's -80 c
//   sag).
// The one modern device: the 808 under the knockout (with a dropKick), short and an octave up (phones).

import { n } from '../engine.mjs';

const BARS = 16;

export default {
  id: 'stage_duel',
  title: 'Standoff',
  bpm: 140,
  loop: true,

  build(s) {
    s.meter(4, 4);
    // dry and close: a short plate for the lead and the stabs, a small room for the kit
    // (both returns high-passed at 180 Hz: the low end stays mono)
    s.reverb({ rt60: 0.6, predelay: 0.008, damping: 0.5, early: 0.35, wet: 1, hp: 180 });
    s.room('room'); s.room({ hp: 180 });
    s.master({
      lufs: -16, ceiling: -2.4,
      eq: [
        { type: 'lowshelf', f: 100, q: 0.7, gain: -1.5 },
        { type: 'peak', f: 450, q: 0.8, gain: -2 },
        { type: 'peak', f: 3300, q: 0.9, gain: 1.5 },
        { type: 'highshelf', f: 9000, q: 0.7, gain: 3.5 },    // air for the riq and the jingles
      ],
      glue: { threshold: -16, ratio: 1.6, attack: 0.008, release: 0.18, knee: 8 },
      width: 1.6,
    });
    s.humanize = { time: 0.004, vel: 0.05 };
    const B = (bar, beat = 1) => s.bar(bar, beat);

    // ONE band: a smooth seeded +-4 ms push/pull over 2-bar phrases shared by every player (cyclic over the loop)
    const ensR = s.rng('ensemble');
    const NODES = BARS / 2;
    const dn = Array.from({ length: NODES }, () => (ensR() * 2 - 1) * 0.004);
    const drift = (beat) => {
      const x = beat / 8, i = Math.floor(x), f = x - i, w = (1 - Math.cos(Math.PI * f)) / 2;
      const a = dn[((i % NODES) + NODES) % NODES], b = dn[(((i + 1) % NODES) + NODES) % NODES];
      return a + (b - a) * w;
    };
    // each role sits at its own place against the beat (seconds; + = laid back)
    const feel = (part, role = 0) => {
      const orig = part.note.bind(part);
      part.note = (beat, dur, pitch, vel, o = {}) => {
        if (Array.isArray(pitch)) { for (const p of pitch) part.note(beat, dur, p, vel, o); return part; }
        return orig(beat, dur, pitch, vel, { ...o, _shift: (o._shift || 0) + role + drift(beat) });
      };
      return part;
    };

    // ---------------------------------------------------------------- buses
    const pres = (g = 2, f = 3200, q = 0.9) => ({ type: 'peak', f, q, gain: g });
    // ME: the tuba lead. Its 2nd-4th harmonics (200-700 Hz) carry the line on a phone; 2.2 kHz = the staccato bite
    const busTuba = s.bus('tuba', { gain: -5.5, pan: -0.07, room: 0.12, reverb: 0.06, sat: 4,
      comp: { threshold: -20, ratio: 2.5, attack: 0.003, release: 0.09, knee: 6, makeup: 1 },
      eq: [{ type: 'hp', f: 45 }, { type: 'lowshelf', f: 140, q: 0.7, gain: -5 }, { type: 'peak', f: 330, q: 1, gain: 2.5 },
        { type: 'peak', f: 720, q: 1, gain: 2 }, { type: 'peak', f: 1150, q: 0.9, gain: 3 }, { type: 'peak', f: 2200, q: 1, gain: 2 },
        { type: 'lp', f: 9000, q: 0.7 }] });
    // BOT: the muted brass, right of centre as one section (width 1.2), a little plate; body at 500 Hz (phones), the nasal
    // peak at 1.45 kHz (off the G#4 harmonics); hp 200 keeps its low voicings out of the mono floor
    const busStab = s.bus('stabs', { gain: -7, pan: 0.28, width: 1.2, reverb: 0.1, room: 0.05, sat: 2,
      comp: { threshold: -18, ratio: 3, attack: 0.002, release: 0.07, knee: 6, makeup: 1 },
      eq: [{ type: 'hp', f: 200 }, { type: 'peak', f: 500, q: 1, gain: 2 }, { type: 'peak', f: 1450, q: 1.4, gain: 2 },
        { type: 'highshelf', f: 6000, q: 0.7, gain: -1 }] });
    // the bot's toy-bell shadow: a celesta, dry, on the bot's side, far under the stabs
    const busCel = s.bus('celesta', { gain: -7.5, pan: 0.22, room: 0.05, width: 0.8, eq: [{ type: 'peak', f: 3000, q: 1, gain: -2 }] });
    // the floor: contrabass pizz (centre, mono) and the tuned kick; the pizz's 2nd-4th harmonics (sat + a 600 Hz lift)
    // carry the downbeat on a phone
    const busPizz = s.bus('pizz', { gain: -7.5, width: 0, room: 0.04, sat: 5,
      comp: { threshold: -22, ratio: 3, attack: 0.001, release: 0.06, knee: 6, makeup: 1 },
      eq: [{ type: 'hp', f: 36 }, { type: 'lowshelf', f: 90, q: 0.7, gain: -2.5 }, { type: 'peak', f: 200, q: 1, gain: 2 },
        { type: 'peak', f: 600, q: 1, gain: 4 }, { type: 'peak', f: 900, q: 1, gain: 1.5 }, pres(2.5, 2600, 0.8)] });
    // the kick's 2.5 kHz click is what a phone hears of the 1 and the 3
    const busKick = s.bus('kick', { gain: -13, width: 0, eq: [{ type: 'peak', f: 180, q: 1.2, gain: 3 }, { type: 'peak', f: 2500, q: 1, gain: 5 }],
      comp: { threshold: -18, ratio: 3, attack: 0.001, release: 0.05, knee: 4 } });
    const busSub = s.bus('sub', { gain: -12, width: 0, eq: [{ type: 'hp', f: 32 }] });
    // ME's comping: a damped guitar, double-tracked (wide plucks); a gentle slow-attack comp so the pick leads and
    // each "chk" decays
    const busGtr = s.bus('guitar', { gain: -5.5, pan: -0.12, width: 1.15, reverb: 0.08, room: 0.05,
      comp: { threshold: -24, ratio: 2.5, attack: 0.004, release: 0.06, knee: 6, makeup: 0.5 },
      eq: [{ type: 'hp', f: 160 }, pres(2, 2800)] });
    // the circling walk's guitar shadow (two octaves over the pizz): soft, a slow-attack comp, ringing plucks
    const busWalk = s.bus('walk', { gain: -7, pan: -0.12, width: 1, reverb: 0.06, room: 0.05, sat: 2,
      comp: { threshold: -20, ratio: 2, attack: 0.007, release: 0.08, knee: 6, makeup: 0 },
      eq: [{ type: 'hp', f: 160 }, { type: 'peak', f: 700, q: 1, gain: 1.5 }, pres(1, 2800)] });
    // the kit's jingles and slaps (riq, jingle roll): ONE frame drum near the centre (mono-safe jingles), the 3.5 kHz
    // dip for earbuds
    const busPerc = s.bus('perc', { gain: -3, pan: 0, room: 0.07, width: 1.2,
      comp: { threshold: -14, ratio: 3, attack: 0.0008, release: 0.05, knee: 6, makeup: 0 },   // tames the odd loud slap
      eq: [{ type: 'peak', f: 3500, q: 0.8, gain: -4 }, { type: 'highshelf', f: 8000, q: 0.7, gain: 2 }, { type: 'peak', f: 4650, q: 8, gain: -3 }, { type: 'peak', f: 6785, q: 5, gain: -7 },
        { type: 'peak', f: 10820, q: 6, gain: -4 }, { type: 'peak', f: 11360, q: 6, gain: -4 },
        { type: 'lp', f: 18000, q: 0.7 }] });   // no single-sample slap spikes (they ring after the AAC encode)
    const busClap = s.bus('clap', { gain: -12, room: 0.1, eq: [{ type: 'peak', f: 3600, q: 0.9, gain: -6 }, { type: 'lp', f: 9000, q: 0.7 }] });
    const busBell = s.bus('bell', { gain: -10, pan: 0.05, reverb: 0.1, eq: [{ type: 'peak', f: 2700, q: 2, gain: 1 }] });
    const busGlass = s.bus('glass', { gain: -10, reverb: 0.25, width: 1.4 });
    const busFx = s.bus('fx', { gain: -14, width: 0, eq: [{ type: 'hp', f: 30 }] });

    // the bot alone (punch bars, and its get-up) steps forward; in the clinch both sides give a little
    busStab.automate('gain', [[B(1), 0], [B(2, 4.9), 0], [B(3), 2], [B(4, 4.9), 2], [B(5), 0], [B(6, 4.9), 0], [B(7), 2], [B(8, 4.9), 2],
      [B(9), -1], [B(10, 4.9), -1], [B(11), 0], [B(15, 4.9), 0], [B(16), 1.5], [B(16, 4.95), 1.5], [B(17), 0]]);
    // the tuba a touch back in its exposed jab bars (focus over many replays), back up for the retort and the pickup
    busTuba.automate('gain', [[B(1), -1], [B(6, 4.9), -1], [B(7), 0], [B(8, 4.9), 0], [B(9), -0.8], [B(10, 4.9), -0.8], [B(11), 0],
      [B(12, 4.9), 0], [B(13), -0.8], [B(14, 4.9), -0.8], [B(15), 0], [B(16, 4.92), 0], [B(17), -1]]);
    // the floor a little forward under the bot alone (the 1 on a phone: within a few dB of its 2& hit), and at the seam
    busPizz.automate('gain', [[B(2, 4.9), 0], [B(3), 1.5], [B(4, 4.9), 1.5], [B(5), 0], [B(6, 4.9), 0], [B(7), 1.5], [B(8, 4.9), 1.5], [B(9), 0],
      [B(16, 3.4), 0], [B(16, 3.5), 2], [B(16, 4.95), 2], [B(17), 0]]);
    busKick.automate('gain', [[B(15, 4.9), 0], [B(16), 1.5], [B(16, 4.95), 1.5], [B(17), 0]]);

    // ---------------------------------------------------------------- parts
    const TIGHT = { time: 0.003, vel: 0.04 };
    const tuba = feel(s.part(busTuba, 'tuba', { growl: 1.25, bright: 1.4, accent: 0.45, humanize: { time: 0.004, vel: 0.05 } }), -0.006);
    const stab = feel(s.part(busStab, 'stab', { kind: 'brass', decay: 0.1, spread: 1, bright: 1, humanize: { time: 0.002, vel: 0.03 } }), -0.002);
    const cel = feel(s.part(busCel, 'celesta', { humanize: { time: 0.003, vel: 0.04 } }), 0.002);
    const pizz = feel(s.part(busPizz, 'contrabassPizz', { bright: 1.15, humanize: TIGHT }), 0.002);
    const kick = feel(s.part(busKick, 'kick', { click: 0.9, humanize: TIGHT }));
    const dkick = feel(s.part(busFx, 'dropKick'));
    const sub = feel(s.part(busSub, 'sub808', { tune: -15, decay: 9, glide: -1, glideTime: 0.3 }));
    const gtr = feel(s.part(busGtr, 'pluck', { body: 'guitar', double: 1, spread: 0.3, damp: true, decay: 0.5, bright: 1.1 }), 0.006);
    const walkG = feel(s.part(busWalk, 'pluck', { body: 'guitar', double: 0, damp: true, decay: 0.3, bright: 0.9, name: 'walk guitar' }), 0.004);
    const riq = feel(s.part(busPerc, 'riq', { pan: 0.05, spread: 0.7, name: 'riq perc' }), 0.003);   // named 'perc' so the score lint treats it as unpitched
    const roll = feel(s.part(busPerc, 'jingleRoll', { spread: 0.4, ring: 0.6 }));
    const clap = feel(s.part(busClap, 'clap', {}), 0.004);
    const snare = feel(s.part(busClap, 'snare', { bright: 0.9 }), 0.004);
    const zils = feel(s.part(busBell, 'fingerCymbals'));
    const glass = feel(s.part(busGlass, 'glassPad', { split: 0.5, decayDb: 10 }));

    // ---------------------------------------------------------------- helpers
    const rP = s.rng('perc'), rS = s.rng('bot'), rB = s.rng('bass'), rG = s.rng('ghosts'), rV = s.rng('voicing'), rW = s.rng('walk');
    const jv = () => 0.92 + 0.16 * rP();                 // a player's stroke never the same twice
    const LEAD = 0.12;                                  // the lead tuba sits 12 c sharp of the band (D12) on its moving notes
    const LAND = 0.04;                                  // ... and nearly in tune where it meets the bass or a chord tone
    // the tuba line: [beat in bar, written length, pitch, vel, gate, extra]. Gates by role: before a rest 0.55,
    // into the next note 0.72-0.75, accented arrivals 0.85, landing quarters 0.8. `det` overrides the +12 c.
    const line = (bar, notes) => {
      for (const [b, len, p, v, g = 0.72, o = {}] of notes) {
        const { det = LEAD, ...rest } = o;
        tuba.note(B(bar, b), len * g, n(p) + det, v, rest);
      }
    };
    const ST = {
      A: ['C#4', 'E4', 'A4'], G: ['B#3', 'D#4', 'G#4'], G7: ['B#3', 'F#4', 'G#4'], G7b9: ['B#3', 'F#4', 'A4'], D: ['D4', 'F#4', 'A4'],
      KO: ['G#3', 'C#4', 'G#4'],
      // the low "mocking" voicings (9), the G#7 with the 7th on top (10), the b9 voiced up to the leading tone (14),
      // the D7 tritone substitute with the leading tone on top (16)
      CmLo: ['G#3', 'C#4', 'E4'], G7Lo: ['G#3', 'B#3', 'D#4'], G7f: ['G#3', 'B#3', 'F#4'], G7up: ['F#4', 'A4', 'B#4'], D7s: ['D4', 'F#4', 'B#4'],
    };
    // the bot's hit: loose players (seeded 1-7 ms, the top voice within 1 ms). Long hits (>= 0.5 beat) speak through
    // the mute; short jabs stay open and dry.
    const WAH = [];
    const punch = (bar, beat, key, v = 0.74, len = 0.22, o = {}) => {
      const ps = ST[key], at = B(bar, beat);
      const { wah, tag, ...rest } = o;
      ps.forEach((p, i) => {
        const top = i === ps.length - 1;
        const off = top ? (rS() * 2 - 1) * 0.001 : 0.001 + 0.006 * rS();
        stab.note(at, len, p, v * (top ? 1 : 0.9 + 0.08 * rS()), { ...rest, ...(top && tag ? { tag } : {}), _shift: off });
      });
      if (wah !== false && len >= 0.5) WAH.push([at, len]);
    };
    // the celesta shadow of the bot's top voice (two octaves up), a blip
    const blip = (bar, beat, p, v = 0.34) => cel.note(B(bar, beat), 0.4, n(p) + 12, v * (0.94 + 0.12 * rS()));
    const PAH = {
      Cm: ['G#4', 'C#5', 'E5'], Cm2: ['E4', 'G#4', 'C#5'], Fm: ['A4', 'C#5', 'F#5'], Fm2: ['F#4', 'A4', 'C#5'],
      G: ['G#4', 'B#4', 'D#5'], G7: ['G#4', 'B#4', 'F#5'], DC: ['A4', 'D5', 'F#5'], D7: ['F##4', 'A#4', 'C#5'],
    };
    // the guitar "chk": the bounce right after each bass hit (1& and 3&), short and damped (0.12 beat), a down-stroke
    // then a lighter up-stroke, always left; the tonic chords alternate two voicings (seeded) so the same partials do
    // not ring every time
    const chk = (bar, keys, v = 0.42, beats = [1.5, 3.5]) => {
      beats.forEach((b, i) => {
        let key = Array.isArray(keys) ? keys[i] : keys;
        if ((key === 'Cm' || key === 'Fm') && rV() < 0.5) key += '2';
        gtr.chord(B(bar, b), 0.12, PAH[key], v * (i % 2 ? 0.86 : 1) * jv(), { strum: i % 2 ? -0.0045 : 0.0045, pan: -0.3,
          ...(key === 'D7' ? { tag: 'tension' } : {}) });
      });
    };
    // the bounce floor: the tuned kick on 1 and 3 (with the pizz), a ghost on 2a (the skip into 3)
    const kicks = (bar, r1, r3, { ghost = true, v = 1 } = {}) => {
      kick.note(B(bar, 1), 0.5, r1, 0.7 * v * jv());
      kick.note(B(bar, 3), 0.5, r3, 0.6 * v * jv());
      if (ghost) kick.note(B(bar, 2.75), 0.25, r1, (0.2 + 0.06 * rP()) * v);
    };
    // the riq: steady teks on every off-beat 8th, a dum ghost on 2 (or 2a, seeded). 'punch': a dum ON 1 (the phone's
    // downbeat: a broadband slap) and the 2&/4& teks leaning with the bot's hits. In the jab bars a player's finger
    // "ka" ghosts on about 30 % of the 16th 'e'/'a' spots (seeded; never on 4a). `skip`: beats left out (fills and
    // stops write their own).
    const RIQ = {
      jab: [[1.5, 0.3, 'tek'], [2, 0.2, 'dum'], [2.5, 0.27, 'tek'], [3.5, 0.3, 'tek'], [4.5, 0.35, 'tek']],
      punch: [[1, 0.52, 'dum'], [1.5, 0.22, 'tek'], [2, 0.18, 'dum'], [2.5, 0.3, 'tek'], [3.5, 0.24, 'tek'], [4.5, 0.3, 'tek']],
    };
    const GHOST = [1.25, 1.75, 2.25, 3.25, 3.75, 4.25];
    const riqBar = (bar, kind, { v = 1, skip = [] } = {}) => {
      const late = kind === 'jab' && rG() < 0.35;           // the dum ghost slips to 2a in some bars
      for (const [b, tv, st] of RIQ[kind]) {
        if (skip.includes(b)) continue;
        const at = b === 2 && late ? 2.75 : b;
        riq.hit(B(bar, at), 0.5, tv * v * jv(), { stroke: st });
      }
      if (kind === 'jab') for (const b of GHOST) {
        const r = rG();
        if (r < 0.3 && !skip.some((x) => Math.abs(x - b) < 0.3)) riq.hit(B(bar, b), 0.25, (0.1 + 0.06 * rG()) * v, { stroke: 'tek' });
      }
    };
    // the clap on 4: a seeded flam and level per bar
    const clap4 = (bar, v = 0.55) => clap.hit(B(bar, 4), 0.5, v * jv(), { flam: 0.025 + 0.02 * rP() });
    // the pizz: [beat, length, pitch, vel, gate?]; the gate is seeded 0.7-0.85 unless given (a player, not a step sequencer)
    const bass = (bar, notes) => {
      for (const [b, len, p, v, g] of notes) pizz.note(B(bar, b), len * (g ?? 0.7 + 0.15 * rB()), p, v * (0.95 + 0.1 * rB()));
    };

    // ================================================================ 1-2 JAB (C#m)
    s.section('Jab', B(1), B(3), 'tension');
    // the feint opens the file ON sample 0 (its push clamped), in tune with the bass
    line(1, [[1, 0.5, 'B#2', 0.8, 0.75, { tag: 'tension', det: 0.03, _shift: 0.016 }], [1.5, 0.5, 'C#3', 0.86, 0.55],
      [2.5, 0.5, 'E3', 0.9, 0.85, { accent: 0.65 }], [3, 0.5, 'D3', 0.8, 0.55, { tag: 'tension' }],
      [4, 0.5, 'G#2', 0.82, 0.6, { det: LAND }], [4.5, 0.5, 'D#3', 0.84, 0.72]]);   // the D drops a tritone (G#7b5 spelled out), D# pushes into the landing
    line(2, [[1, 1, 'C#3', 0.9, 0.8, { accent: 0.6, det: LAND }], [2.5, 0.5, 'A2', 0.82, 0.75, { accent: 0.55, tag: 'tension' }], [3, 0.5, 'G#2', 0.72, 0.8]]);
    bass(1, [[1, 1.5, 'C#2', 0.72], [3, 1.5, 'G#1', 0.62], [4.5, 0.5, 'B#1', 0.6, 0.85]]);      // B#1 -> C#2 (bar 2)
    bass(2, [[1, 1.5, 'C#2', 0.7], [3, 1, 'C#2', 0.62], [4, 0.5, 'E2', 0.3, 0.35], [4.5, 0.5, 'B1', 0.6, 0.85]]);   // a dead ghost E2 on 4; B1 -> A1
    kicks(1, 'C#2', 'G#1'); kicks(2, 'C#2', 'C#2');
    chk(1, 'Cm', 0.44); chk(2, 'Cm', 0.42);
    riqBar(1, 'jab'); riq.hit(B(1, 4), 0.5, 0.26 * jv(), { stroke: 'dum' });   // no clap in the jab's first bar
    riqBar(2, 'jab', { skip: [4.5] }); clap4(2, 0.45);
    // 2/4: the tek-ka pickup into the bot's punch
    riq.hit(B(2, 4.25), 0.25, 0.3 * jv(), { stroke: 'tek' }); riq.hit(B(2, 4.5), 0.25, 0.4 * jv(), { stroke: 'tek' });
    riq.hit(B(2, 4.75), 0.25, 0.42 * jv(), { stroke: 'dum' });

    // ================================================================ 3-4 PUNCH (the bot)
    s.section('Punch', B(3), B(5), 'tension');
    punch(3, 2.5, 'A', 0.7, 0.55, { decay: 0.24 });     // the 2& is a long hit: it speaks through the mute
    punch(3, 4.5, 'G', 0.7);                           // A -> G#: three semitones at once (A-G#, E-D#, C#-B#)
    blip(3, 2.5, 'A4'); blip(3, 4.5, 'G#4', 0.3);      // the toy-bell shadow: b6 -> 5 on top
    // the one-two-HOOK: the band stops on 4, the hook lands alone (the 7th arrives), its b9 falls to the 8 on 4&
    punch(4, 2.5, 'A', 0.64); punch(4, 3.5, 'A', 0.72); punch(4, 4, 'G7b9', 0.84, 0.3, { tag: 'tension' }); punch(4, 4.5, 'G7', 0.66, 0.4);
    bass(3, [[1, 1.5, 'A1', 0.72], [3, 1.5, 'C#2', 0.62], [4.5, 0.5, 'G#1', 0.64, 0.85]]);     // root-position A under the bot; G#1 with the G#
    bass(4, [[1, 1.5, 'A1', 0.72], [3, 0.75, 'C#2', 0.6, 0.8], [4.5, 0.5, 'G#1', 0.62, 0.9]]); // ... stops before 4; G#1 back WITH the 4& resolution -> A1 (5)
    kicks(3, 'A1', 'C#2'); kicks(4, 'A1', 'C#2', { ghost: false }); kick.note(B(4, 4.5), 0.4, 'G#1', 0.4);
    riqBar(3, 'punch'); clap4(3, 0.44);
    riqBar(4, 'punch', { skip: [3.5, 4.5] });             // the stop: nothing in the kit from 3& on

    // ================================================================ 5-6 JAB up a 4th (F#m), and the twist
    s.section('Jab 2', B(5), B(7), 'tension');
    line(5, [[1, 0.5, 'E#3', 0.78, 0.75, { tag: 'tension', det: 0.03 }], [1.5, 0.5, 'F#3', 0.86, 0.55],
      [2.5, 0.5, 'A3', 0.92, 0.85, { accent: 0.75 }], [3, 0.5, 'G3', 0.8, 0.55, { tag: 'tension' }], [4, 0.5, 'C#3', 0.8, 0.6, { det: LAND }],
      [4.5, 0.5, 'G#3', 0.86, 0.5]]);                      // the same slip (G over C#: C#7b5, the tritone down), the last note clipped
    // the twist: a cheeky pop up to A3 on 2, then the b6 -> 5 of F#m (D3 -> C#3) a beat LATE, on 3 and 3& (bar 2 had it
    // on 2& and 3): it is also the Neapolitan D -> C# the bot is about to shout (7)
    line(6, [[1, 1, 'F#3', 0.9, 0.8, { accent: 0.6, det: LAND }], [2, 0.5, 'A3', 0.84, 0.5, { accent: 0.5 }], [3, 0.5, 'D3', 0.86, 0.85, { accent: 0.6, tag: 'tension' }],
      [3.5, 0.5, 'C#3', 0.76, 0.6, { det: LAND }]]);
    bass(5, [[1, 1.5, 'F#1', 0.74], [3, 1.5, 'C#2', 0.62], [4.5, 0.5, 'E#2', 0.6, 0.85]]);     // the root under my feint E#3 (as B#2 over C#2 in 1); E#2 under my G#3: C#7 -> F#m
    bass(6, [[1, 1.5, 'F#2', 0.7], [3, 1, 'F#1', 0.64], [4, 0.5, 'A1', 0.3, 0.35], [4.5, 0.5, 'C#2', 0.6, 0.85]]);   // the F# octave bounce under my D3 -> C#3 (b6 -> 5 of F#m); C#2 -> D2 (bar 7)
    kicks(5, 'F#1', 'C#2'); kicks(6, 'F#2', 'F#1');
    chk(5, 'Fm', 0.44); chk(6, 'Fm', 0.42);
    riqBar(5, 'jab'); riq.hit(B(5, 4), 0.5, 0.26 * jv(), { stroke: 'dum' });
    riqBar(6, 'jab', { skip: [4.5] }); clap4(6, 0.5);
    riq.hit(B(6, 4.5), 0.25, 0.36 * jv(), { stroke: 'tek' }); riq.hit(B(6, 4.75), 0.25, 0.36 * jv(), { stroke: 'dum' });
    kick.note(B(6, 4.75), 0.25, 'C#2', 0.28);

    // ================================================================ 7-8 PUNCH on the Neapolitan + the RETORT
    s.section('Punch 2', B(7), B(9), 'tension');
    punch(7, 2.5, 'D', 0.76, 0.55, { decay: 0.24 }); punch(7, 4.5, 'G', 0.66);   // D4 -> D#4 against A4 -> G#4 (contrary semitones, D6)
    blip(7, 2.5, 'A4'); blip(7, 4.5, 'G#4', 0.26);
    punch(8, 1, 'G7b9', 0.82, 0.5, { tag: 'tension' });    // the bot answers on the downbeat (it rings into beat 2) ...
    chk(8, 'G7', 0.34, [1.5]);                             // ... I shrug (a soft G#7) ...
    line(8, [[3, 0.5, 'G#2', 0.8, 0.72], [3.5, 0.5, 'D#3', 0.82, 0.72], [4, 0.5, 'F#3', 0.88, 0.75, { accent: 0.6 }],
      [4.5, 0.5, 'A3', 0.9, 0.85, { accent: 0.7, tag: 'tension' }]]);   // ... and talk back up the G#7b9 (A3 -> G#3)
    bass(7, [[1, 1.5, 'D2', 0.72], [3, 1.5, 'D2', 0.6], [4.5, 0.5, 'D#2', 0.64, 0.85]]);       // the Neapolitan bass rises a semitone with the bot's D4 -> D#4
    bass(8, [[1, 1.5, 'G#1', 0.72], [3, 1.5, 'B#1', 0.6], [4.5, 0.5, 'D#2', 0.6, 0.85]]);     // up the G#7 under the retort, D#2 -> C#2
    kicks(7, 'D2', 'D2'); kicks(8, 'G#1', 'B#1', { ghost: false });
    riqBar(7, 'punch'); clap4(7, 0.44);
    riqBar(8, 'punch', { skip: [3.5, 4.5] }); clap4(8, 0.42);
    // 8/3&-4a: a 16th riq roll in crescendo into the clinch (the last dum capped)
    for (let k = 0; k < 6; k++) riq.hit(B(8, 3.5 + k * 0.25), 0.25, Math.min(0.44, 0.24 + 0.044 * k) * jv(), { stroke: k === 5 ? 'dum' : 'tek' });

    // ================================================================ 9-10 CLINCH (the bot takes the guitar's slots)
    s.section('Clinch', B(9), B(11), 'climax');
    // the jab from the top; the bot mocks my D (its D#4 on 3&) and I take the correction: D3 -> D#3
    line(9, [[1, 0.5, 'G#3', 0.9, 0.75, { accent: 0.7, growl: 1.5 }], [1.5, 0.5, 'C#3', 0.82, 0.55, { det: LAND }], [2.5, 0.5, 'E3', 0.86, 0.85, { accent: 0.6 }],
      [3, 0.5, 'D3', 0.78, 0.55, { tag: 'tension' }], [4, 0.5, 'D#3', 0.76, 0.72, { det: LAND }], [4.5, 0.5, 'G#2', 0.82, 0.72]]);
    punch(9, 2, 'CmLo', 0.7); punch(9, 3.5, 'G7Lo', 0.74);
    // 10: the exchange breaks up: my G#3, the bot's D, my C#3, the bot's G#7 (its 7th on top)
    line(10, [[1, 0.5, 'G#3', 0.88, 0.75, { accent: 0.6, det: LAND }], [3, 0.5, 'C#3', 0.82, 0.6, { det: LAND }]]);
    punch(10, 2, 'D', 0.76, 0.22, { tag: 'tension' }); punch(10, 3.5, 'G7f', 0.76);
    bass(9, [[1, 1.5, 'C#2', 0.72], [3, 1.5, 'G#1', 0.6], [4.5, 0.5, 'D#2', 0.58, 0.85]]);
    bass(10, [[1, 1, 'C#2', 0.72], [2, 1, 'D2', 0.62], [3, 0.5, 'C#2', 0.66], [3.5, 1, 'G#1', 0.6], [4.5, 0.5, 'D#2', 0.6, 0.85]]);   // D2 under the bot's D; G#1 under its G#7; D#2 -> C#2
    kicks(9, 'C#2', 'G#1'); kicks(10, 'C#2', 'C#2', { ghost: false });
    riqBar(9, 'jab'); clap4(9, 0.52);
    riqBar(10, 'jab');
    // the clinch shakes: jingle strokes on the riq (seeded ring), not a tambourine
    for (const bar of [9, 10]) for (const b of [1, 3]) riq.hit(B(bar, b), 0.5, 0.3 * jv(), { stroke: 'jingle', ring: 0.5 + 0.15 * rP() });
    // 10/4: a snare flam instead of the clap
    snare.hit(B(10, 4) - 0.07, 0.25, 0.28); snare.hit(B(10, 4), 0.5, 0.52);

    // ================================================================ 11-12 CIRCLING (the bed: the pizz walks the footwork)
    s.section('Circling', B(11), B(13), 'gentle');
    // the footwork: C# down to G#, up the G# chord (D#) to E, the Neapolitan D on 3 falling through C# and B# to G#
    // (D2 then the leading tone); accents on the bounce (1: C#, 3: D), the rest shaded
    const WALK = ['C#2', 'G#1', 'D#2', 'E2', 'D2', 'C#2', 'B#1', 'G#1'];
    const WV = [0.72, 0.52, 0.56, 0.5, 0.68, 0.54, 0.54, 0.6], WGATE = [0.8, 0.6, 0.65, 0.6, 0.8, 0.6, 0.65, 0.8];
    WALK.forEach((p, k) => {
      pizz.note(B(11, 1 + k * 0.5), 0.5 * WGATE[k], p, WV[k]);
      // the guitar shadow: a soft ringing pluck per step (decays by itself), each pick a little different
      walkG.note(B(11, 1 + k * 0.5), 0.42, n(p) + 24, WV[k] * (0.85 + 0.15 * rW()), { pan: -0.15, bright: 0.8 + 0.2 * rW() });
    });
    // 12: a breath into the taunt, the pizz alone: G#1 _ A1 (b6 -> 5 upside down), D2 B#1 -> C#2 (D1)
    bass(12, [[1, 2, 'G#1', 0.66], [3, 1, 'A1', 0.6], [4, 0.5, 'D2', 0.56, 0.8], [4.5, 0.5, 'B#1', 0.62, 0.85]]);
    kicks(11, 'C#2', 'D2', { v: 0.85 }); kicks(12, 'G#1', 'A1', { v: 0.85 });
    chk(11, ['Cm', 'DC'], 0.46); chk(12, ['Cm', 'DC'], 0.44);
    glass.chord(B(11), 8, ['C#5', 'E5'], 0.4);           // the bed breathes: a soft glass C#/E dyad under the walk (centred, decaying)
    riqBar(11, 'jab'); clap4(11, 0.45);
    riqBar(12, 'jab', { skip: [4.5] }); clap4(12, 0.45);
    riq.hit(B(12, 4.5), 0.5, 0.42 * jv(), { stroke: 'jingle', ring: 0.6 });   // the jingle under my next move

    // ================================================================ 13-14 TAUNT (the #4 as a neighbour) and the bot's anger
    s.section('Taunt', B(13), B(15), 'climax');
    line(13, [[1, 0.5, 'C#3', 0.78, 0.72, { det: LAND }], [1.5, 0.5, 'D#3', 0.8, 0.72], [2, 0.5, 'E3', 0.84, 0.6, { accent: 0.5 }],
      [3, 0.5, 'G#3', 0.86, 0.75, { accent: 0.6 }], [3.5, 0.5, 'F##3', 0.82, 0.75, { tag: 'tension' }]]);   // the #4 flashes as G#'s lower neighbour
    // the G#3 held, sagging -80 c in its last 130 ms (a short D12 sag, not a fall)
    tuba.play(B(13, 4), 'G#3:.7@.88 55.2:.28@.5', { legato: true, glide: 0.1, transpose: 0.06, scoop: -0.5, scoopTime: 0.05 });
    chk(13, ['Cm', 'D7'], 0.36);                           // the II7 flashes once, WITH the F##
    line(14, [[1, 0.5, 'A3', 0.9, 0.8, { accent: 0.6, tag: 'tension' }], [1.5, 0.5, 'F##3', 0.8, 0.72], [2, 1, 'G#3', 0.86, 0.8, { det: LAND }]]);   // the fifth circled (D1)
    chk(14, 'G', 0.38, [2]);                               // a plain G# triad under the landing
    punch(14, 3.5, 'G7b9', 0.8, 0.22, { tag: 'tension' }); punch(14, 4.5, 'G7up', 0.84, 0.26, { tag: 'tension' });   // top A4 -> B#4 into the KO
    bass(13, [[1, 2, 'C#2', 0.72], [3, 1.5, 'C#2', 0.6], [4.5, 0.5, 'A1', 0.6, 0.85]]);         // a C# pedal; A1 -> G#1 (D3)
    bass(14, [[1, 1, 'G#1', 0.72], [2, 0.5, 'G#1', 0.3, 0.35], [3, 1.5, 'G#1', 0.6], [4.5, 0.5, 'B#1', 0.62, 0.85]]);
    kicks(13, 'C#2', 'C#2'); kicks(14, 'G#1', 'G#1', { ghost: false });
    riqBar(13, 'jab'); clap4(13, 0.52);
    riqBar(14, 'jab', { skip: [3.5, 4.5] });
    // 14/3-4a: dum-tek-tek-tek-dum into the KO
    [[3, 'dum', 0.42], [3.5, 'tek', 0.4], [4, 'tek', 0.44], [4.5, 'tek', 0.48], [4.75, 'dum', 0.48]].forEach(([b, st, v]) =>
      riq.hit(B(14, b), 0.25, v * jv(), { stroke: st }));

    // ================================================================ 15 KNOCKOUT, 16 GET UP
    s.section('KO', B(15), B(17), 'release');
    tuba.note(B(15), 0.9, n('C#3'), 0.88, { growl: 1.6, accent: 0.6 });   // the KO unison: the lead tunes to the band
    punch(15, 1, 'KO', 0.8, 0.5, { wah: false });
    pizz.note(B(15), 1, 'C#2', 0.78);
    dkick.note(B(15), 0.6, 'C#1', 0.62);
    sub.note(B(15), 1.2, 'C#2', 0.5);
    clap.hit(B(15), 0.5, 0.48, { flam: 0.03 });
    riq.hit(B(15), 0.5, 0.5, { stroke: 'dum' });
    zils.note(B(15, 1), 0.5, 'C#7', 0.12, { ring: 0.4 });   // a quiet tick inside the hit, not a bell
    glass.chord(B(15, 2.5), 2, ['G#4', 'E5'], 0.5);         // the bed holds (the crowd stunned), centred, short
    // 15/1&-4: the bounce goes straight on (an arrival that pushes on); the one-beat jingle breath on 4
    for (const [b, v] of [[1.5, 0.24], [2.5, 0.26], [3.5, 0.3]]) riq.hit(B(15, b), 0.5, v * jv(), { stroke: 'tek' });
    kick.note(B(15, 3), 0.5, 'E2', 0.5);
    pizz.note(B(15, 3), 1.2, 'E2', 0.6);                   // C#m/E: the floor keeps walking
    pizz.note(B(15, 4.5), 0.4, 'A1', 0.56);                // A1 -> G#1 (D3) into the get-up
    chk(15, ['Cm', 'Cm'], 0.38, [1.5, 3.5]);
    roll.hit(B(15, 4), 1, 0.4, { from: 0.3, to: 1 });
    // 16: the bot gets up, its top voice A4 -> G#4 -> B#4 (the D7 tritone substitute on 4&); the bass climbs the
    // G#7 and comes down D#2 D2 -> C#2 (the tonic from ABOVE) while my pickup F#3 E3 drops a third to the feint B#2 -> C#3
    // (no step-down into the leading tone: the Kugel title riff's seam is not ours)
    bass(16, [[1, 1.5, 'G#1', 0.72], [3, 0.5, 'G#1', 0.62, 0.8], [3.5, 0.5, 'B#1', 0.62, 0.85], [4, 0.5, 'D#2', 0.65, 0.85], [4.5, 0.5, 'D2', 0.7, 0.85]]);
    kicks(16, 'G#1', 'G#1', { ghost: false });
    punch(16, 2.5, 'G7b9', 0.7, 0.22, { tag: 'tension' }); punch(16, 3.5, 'G7', 0.72, 0.22); punch(16, 4.5, 'D7s', 0.76, 0.24, { tag: 'tension' });
    chk(16, 'G7', 0.38, [1.5]);
    line(16, [[4, 0.5, 'F#3', 0.8, 0.6, { accent: 0.5 }], [4.5, 0.5, 'E3', 0.8, 0.72]]);
    riqBar(16, 'punch', { v: 0.85, skip: [3.5] }); clap4(16, 0.45);
    riq.hit(B(16, 4.75), 0.25, 0.34 * jv(), { stroke: 'tek' });

    // the bot's mute on its LONG hits only: the bus low-pass at 1.8 kHz on the attack (the brass bite stays), open
    // within 0.3 beat (0.13 s), no re-closing; the filter rests open (6.5 kHz) under the short jabs
    const OPEN = 6500, SHUT = 1800, pts = [];
    for (const [at] of [...WAH].sort((a, b) => a[0] - b[0])) {
      pts.push([at - 0.05, OPEN], [at - 0.012, SHUT], [at + 0.3, OPEN]);
    }
    busStab.automate('lowpass', pts);

    s.length(B(BARS + 1));
  },
};
