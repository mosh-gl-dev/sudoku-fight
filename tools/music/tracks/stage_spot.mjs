// tools/music/tracks/stage_spot.mjs
// "The Suspect": the staged-practice cue for the spotError stages (1-3 wrong digits hide among the player's own; tap
// the wrong ones). Detective, suspicious, sly. Concept: scratchpad/music/stage-set/PLAN.md section 2.1 (round 4).
// node tools/music/render.mjs stage_spot
//
// 84 BPM, 4/4, straight 8ths played tiptoe. 10 bars = 28.57 s, the whole file loops (stages of up to 60 s loop it).
// Eb harmonic minor (Eb F Gb Ab Bb Cb D), so the dominant is Bb Freygish. The slowest cue of the stage set; no kick,
// no backbeat. No intro and no build: bar 1 beat 1 is the creeping bass (with a soft tuba toe), the theremin's QUESTION
// enters on 1&, and the first phrase is complete at 4.6 s. Whether the app fades it at 8 s or at 30 s, it has said
// something whole.
//
// ---------------------------------------------------------------------------------------------------------------
// MOTIFS (our own; checked by scratchpad/music/stage_spot/hooks.mjs against STYLE.md section 3, the Mori / Schvitz
// lists, kibbitzer and caper: no 4 shared consecutive intervals, no chromatic run longer than 3, no 2+2 block shuttle)
//   QUESTION (theremin, 1-2)  _ Gb4 / Eb5~ (D5)Eb5 | Cb5 Bb4      the "raised eyebrow": a quick scooped major-6th leap
//        onto the tonic (straight first, the vibrato blooms late, the level swells under it), then the WINK: a 16th
//        dip to D5 and back on beat 4 (D4 as a flick, never a leading tone on a strong beat). Over the Bb7 bar the Cb5
//        is a b9 APPOGGIATURA that sighs onto Bb4 (D3) with a fall-off: the phrase ends on the dominant, a question.
//   THE CATCH (theremin, 5)   _ Gb4 / Eb5 Fb5 (stare) .. bend .. \ Eb5~~   the same leap lands RIGHT (an 8th on true
//        Eb5: the listener recognises bar 1), then CREEPS one semitone too far: Fb5, the b2 over Ebm (a minor 9th over
//        the organ's Eb4). The wink is withheld: the wrong digit takes its place. The lead stares at it (no vibrato,
//        a hand's tremble of a few cents), one clear doubtful bend of -32 c and back ("hm?"), and on beat 4 it slides
//        SLOWLY a semitone down onto Eb5 (D2), where the vibrato blooms for the first time in that phrase: settled. The
//        band reacts: stop-time on beats 1&-3& (only the organ holds, its tone closes and it dips), and on beat 4 the
//        bass and a damped zil TAP land with the correction. That is the stage: the wrong digit is spotted and fixed.
//   ANSWER (theremin, 9-10)   _ Ab4 Gb4 Eb4. Gb4 | Fb4 / F4~ \   the third statement is NOT the leap and NOT the
//        sigh: a low reply that walks down to the tonic and turns, then the suspect once more, INVERTED: it lands a
//        semitone LOW (Fb4, the b5 of the V bar) and slips up to F4 at once (D2 upside down), with a shrug fall-off.
//        -2 -3 +3 -2 +1. Across the seam F4 -> Gb4 (the next QUESTION's pickup) is itself a semitone.
//   PEEK (violins pizz pp, 3) Gb4 Eb5 Fb5                 the catch foreshadowed before 8 s (fast solvers): the leap,
//        then the creep onto the wrong note, left hanging over the Cb bar (it is only corrected in bar 5).
//   CLUE (celesta, 7 -> 8)    Cb6 (4&) -> Bb5 (8/1)       the sigh across the bar line, over Fb/Ab -> Bb7.
//   TIPTOE (the groove)       contrabass pizz in 8th PAIRS with rests: step-step (1, 1&), freeze (2), step-step (3, 3&),
//        freeze (4): a creeping footstep, doubled an octave up by ONE pizz cello (the tick the phone hears; each pluck
//        a different brightness and place) and, on the downbeats of 1, 3, 5 and 9 only, by a short soft tuba toe. The
//        melody bars keep the freezes; the bed bars 3-4 and 7-8 fill one freeze with a GHOST semitone neighbour into
//        the next step (Fb2 -> Eb2, Gb2 -> F2, E2 -> F2), so they run like a riff. The Ebm riff Eb2 Bb1 _ Bb1 Cb2 _
//        | Bb1 (1 5 | 5 b6 | 5: the D3 sigh leans across the bar line onto the V). Into bars 5 and 9 the bass falls F2 Eb2 _ D2 | Eb2 (5 4 . 3 of V, D4); only into
//        the loop seam does it creep Bb1 Cb2 _ D2 | Eb2.
//        On the freezes answer off-beat ghosts, never a backbeat: a riq tek on 2& from the LEFT; a single short
//        tambourine shake on 2 in the odd bars only; soft riq jingles on 1& and 3& in the bed bars and on 4& in bars 2,
//        6, 8 and 10; on 4 the violins' pizz TIP from the right, answered a few ms later from the left by a softer
//        second desk (a solo violin's chromatic grace a 32nd before it in bars 1, 4 and 8, a 16th before in bar 10).
//   KNOCK (bar 4, 4 + 4 1/3)  two soft raps on the riq's head, tuned to the chord (Bb, F), into the catch.
//   NOIR ORGAN (the glue)     a soft drawbar organ (stab 'keys', held) written as three voices that TIE across bar
//        lines while their pitch holds; they move by a semitone, a whole step or a hold (once a minor 3rd: Ab3 -> Cb4
//        into the VI of bar 3; once the Neapolitan's diminished 3rd Fb4 -> D4), often in contrary semitones. Played
//        on two speakers of a slow Leslie: the left drum and a right one 5 c sharp and 4 dB softer, their level (+-2 dB)
//        and tone (+-600 Hz) riding in anti-phase at ~0.8 Hz, so the chord turns from side to side.
//
// FORM (bar: chord; a bar = 2.857 s)
//   1 Ebm      0:00.0  QUESTION (the leap) on 1&, the wink on 4; bass Eb Bb _ Bb Cb, tuba toe
//   2 Bb7      0:02.9  the sigh Cb5 -> Bb4 over Bb7 (b9 -> 1), a short open zil "hm?" on 4
//   3 Cb       0:05.7  a real VI (bass Cb Gb . Fb Eb Cb, organ Gb Cb Eb), a low glass halo, the violins' PEEK
//   4 Bb7b9    0:08.6  tiptoe, the bass falls F2 Eb2 _ D2 -> Eb2 (D4); the KNOCK into the catch
//   5 Ebm      0:11.4  THE CATCH (one bass step then stop-time, the creep, the stare, the bend, the tap, the slide)
//   6 Abm6     0:14.3  the corrected Eb5 held (now the 5th of iv: settled), a low glass bloom under it (F4 Ab4)
//   7 Fb/Ab    0:17.1  bII6, the Neapolitan: the suspect hides in plain sight (bass Ab1 on 1&, Cb Fb . Eb), glass
//                      Ab4 Cb5 Fb5, the celesta CLUE on 4&
//   8 Bb7      0:20.0  the clue lands (Bb5) as the organ resolves the Neapolitan (Fb3 -> F3, Cb4 -> Bb3, Fb4 -> D4)
//   9 Ebm      0:22.9  ANSWER (low, falling, turning), the bass hesitates, tuba toe
//   10 Bb7b9   0:25.7  the inverted catch Fb4 -> F4; tiptoe, the organ swells back up for the seam; D2 -> Eb2
//   Harmony: i V VI V7b9 | i iv6 bII6 V7 | i V7b9. Melody (theremin) in bars 1-2, 5-6 and 9-10 (in 2, 6 and 10 the
//   end of a phrase); pp comments only in 3 (peek) and 7-8 (clue); bar 4 is pure groove.
//
// SEMITONE DEVICES: D2 (Fb5 -> Eb5: the catch, the peek's creep; inverted Fb4 -> F4 in the answer; the bass's ghost
//   Fb2 -> Eb2), D3 (Cb -> Bb: the lead's b9 sigh, the bass's b6-5 across the bar lines 1 -> 2 and 9 -> 10, the celesta clue, the organ's Cb4 -> Bb3),
//   D4 (bass D2 -> Eb2 at the seams 4 -> 5, 8 -> 9, 10 -> 1; the lead's D5 only as a 16th wink), D6 (the organ's
//   contrary semitone voice leading, e.g. F3 -> Fb3 against Eb4 -> Fb4 into the Neapolitan), D9 (bII6 -> V),
//   D12 (theremin scoops, the creep, the trembling stare, the bend, the late-blooming vibrato, fall-offs; the theremin
//   is played +12 c sharp, vibrato ~6.2 Hz at about +-20-25 c).
// MODERN TOUCH (one): during the stop-time of bar 5 the organ's tone closes (a low-pass ride to 550 Hz) and its level
//   dips 2 dB; both open again with the correction: the room holds its breath.
// MIX (gate round 4): the theremin nearly clean (sat 6, body from the 2nd harmonic at 1.25 kHz, a small dip at 1.9 kHz:
//   h3 about -20 dB under h1 in the mix, a theremin, not a square lead), in the band (lead minus rest about -2.5 dB in
//   bars 1 and 9, -1 in the stop-time of bar 5), its echo on the ping-pong delay opening the sides; the master tilt
//   (+6 dB shelf from 1.4 kHz, +2 dB more from 7 kHz, -2.5 dB at 550 Hz, +2.5 dB at 1.1 kHz, off the lead's 1.25 kHz);
//   the jingles with air (+3 dB shelf above 10 kHz) but the tambourine's and riq's fixed lines cut narrow and deep
//   (4.69 / 6.645 / 6.88 / 9.3 / 10.76 / 11.5 / 12.4 kHz); the organ rotating on two sides through one moving
//   low-pass instead of a notch stack. Dry and close (a 0.6 s plate on the lead and the bells, a small room on the
//   rest), mono low end (bass and tuba centred; the bass's high-passed double and the cello tick are the phone line),
//   tip and riq answer each other right/left, the tip's second desk answers from the left.
// ---------------------------------------------------------------------------------------------------------------

import { n } from '../engine.mjs';

const BAR_COUNT = 10;

// bar -> chord
const CHORDS = ['Ebm', 'Bb7', 'Cb', 'Bb7b9', 'Ebm', 'Abm6', 'FbN6', 'Bb7', 'Ebm', 'Bb7b9'];
// contrabass pizz: 8th pairs with rests (step-step, freeze); the bed bars fill one freeze with a ghost semitone neighbour
const RIFF = [
  "Eb2:e@.56' Bb1:e@.46' _:q Bb1:e@.44' Cb2:e@.54' _:q",                        // 1 Ebm   1 5 | 5 b6 -> (5): the sigh across the bar line
  "Bb1:e@.6' F2:e@.44' _:q Ab1:e@.52' D2:e@.44' _:q",                           // 2 Bb7   1 5 | b7 3
  "Cb2:e@.6' Gb2:e@.44' _:e Fb2:e@.27' Eb2:e@.52' Cb2:e@.46' _:q",              // 3 Cb    1 5 . (4) | 3 1: a real VI
  "Bb1:e@.6' F2:e@.44' _:e Gb2:e@.26' F2:e@.5' Eb2:e@.46' _:e D2:e@.56'",       // 4 Bb7b9 1 5 . (b9) | 5 4 . 3: into the culprit
  "Eb2:e@.57' _:e _:q _:q Eb2:e@.58' _:e",                                       // 5 Ebm   one step, FREEZE (stop-time); lands WITH the correction on 4
  "Ab1:e@.6' Eb2:e@.44' _:q F2:e@.52' Cb2:e@.44' _:q",                          // 6 Abm6  1 5 | 6 b3
  "_:e Ab1:e@.52' _:q Cb2:e@.48' Fb2:e@.46' _:e Eb2:e@.27'",                    // 7 Fb/Ab the suspect hides (beat 1 rested): 3 | 5 1 . (the ghost correction)
  "Bb1:e@.6' Ab1:e@.44' _:e E2:e@.26' F2:e@.48' Eb2:e@.46' _:e D2:e@.5'",       // 8 Bb7   1 b7 . (#4) | 5 4 . 3
  "Eb2:e@.62' Bb1:e@.46' _:q Bb1:e@.42' _:e Cb2:e@.52' _:e",                     // 9 Ebm   the second pair hesitates
  "Bb1:e@.6' F2:e@.44' _:e A1:e@.28' Bb1:e@.48' Cb2:e@.53' _:e D2:e@.6'",      // 10 Bb7b9 the creep A Bb Cb . D | Eb (once per loop)
];
// the violins' TIP on beat 4: the section's dyad (playable double stops), a solo chromatic grace before it in some bars
const TIP = {
  Ebm: { g: 'F4', d: ['Bb3', 'Gb4'] }, Bb7: { g: 'C#4', d: ['Ab3', 'D4'] }, Cb: { g: 'F4', d: ['Cb4', 'Gb4'] },
  Bb7b9: { g: 'Bb3', d: ['Ab3', 'D4'] }, Abm6: { g: 'E4', d: ['Cb4', 'F4'], v: 0.84 },
};
const TIP_BARS = new Set([1, 2, 4, 6, 8, 10]);        // 3 = the peek, 5 = the tap, 7 = the freeze, 9 = the answer
const GRACE_AT = { 1: 3.875, 4: 3.875, 8: 3.875, 10: 3.75 };   // bars 2 and 6: the section alone
const TIP_VEL = [0.49, 0.42, 0.5, 0.52];               // a 4-bar accent table: the V bars lean
// organ voices (low, mid, top)
const ORG = {
  Ebm: ['Gb3', 'Bb3', 'Eb4'], Bb7: ['F3', 'Ab3', 'D4'], Cb: ['Gb3', 'Cb4', 'Eb4'], Bb7b9: ['F3', 'Cb4', 'D4'],
  Abm6: ['F3', 'Cb4', 'Eb4'], FbN6: ['Fb3', 'Cb4', 'Fb4'],
};
// bar 8: the Neapolitan resolves (Fb3 -> F3 up, Cb4 -> Bb3 down WITH the celesta's clue, Fb4 -> D4: the dim 3rd)
const ORG_AT = (bar) => (bar === 8 ? ['F3', 'Bb3', 'D4'] : ORG[CHORDS[bar - 1]]);
const TIP_KEY = (key) => (key === 'FbN6' ? 'Cb' : key);

export default {
  id: 'stage_spot',
  title: 'The Suspect',
  bpm: 84,
  loop: true,

  build(s) {
    s.meter(4, 4);
    // dry and close: a short plate for the lead and the bells, a small room for everything
    s.reverb({ rt60: 0.6, predelay: 0.022, damping: 0.5, early: 0.35, wet: 1 });
    s.room('room');
    s.delay({ beats: 0.75, feedback: 0.12, damp: 3000, pingpong: true, toReverb: 0.1 });
    s.master({
      lufs: -16, ceiling: -2.6,
      eq: [
        { type: 'lowshelf', f: 110, q: 0.7, gain: 0 },
        { type: 'peak', f: 550, q: 0.8, gain: -2.5 },
        { type: 'peak', f: 1100, q: 0.9, gain: 2.5 },
        { type: 'highshelf', f: 1400, q: 0.7, gain: 6 },
        { type: 'highshelf', f: 7000, q: 0.7, gain: 2 },
      ],
      glue: { threshold: -16, ratio: 1.5, attack: 0.008, release: 0.2, knee: 8 },
      width: 1.15,
    });
    s.humanize = { time: 0.005, vel: 0.05 };
    const B = (bar, beat = 1) => s.bar(bar, beat);
    const LOCK = { time: 0.003, vel: 0.05 };
    // ONE band: a seeded, smooth +-3 ms push/pull over 2-bar phrases shared by every player (cyclic over the loop)
    const ensR = s.rng('ensemble');
    const NODES = (BAR_COUNT * 4) / 8;
    const dn = Array.from({ length: NODES }, () => (ensR() * 2 - 1) * 0.003);
    const drift = (beat) => {
      const x = beat / 8, i = Math.floor(x), f = x - i, w = (1 - Math.cos(Math.PI * f)) / 2;
      const a = dn[((i % NODES) + NODES) % NODES], b = dn[(((i + 1) % NODES) + NODES) % NODES];
      return a + (b - a) * w;
    };
    // the pocket: each role at its own place against the beat (seconds; + = laid back: the tiptoe is lifted, late)
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
    const busBass = s.bus('bass', { gain: -12.5, width: 0, room: 0.05, sat: 4, eq: [{ type: 'hp', f: 36 }, { type: 'lowshelf', f: 75, q: 0.7, gain: 2 }, { type: 'peak', f: 160, q: 1, gain: -1.5 }, pres(2.5, 2800)],
      comp: { threshold: -22, ratio: 3, attack: 0.001, release: 0.06, knee: 6, makeup: 1 } });
    // the bass's high-passed double: tight with him (same pocket), nearly centred, its knuckle 'tock' for phones
    const busBassW = s.bus('bassW', { gain: -7, pan: 0.1, room: 0.05, sat: 7, eq: [{ type: 'hp', f: 160 }, { type: 'hp', f: 160 }, { type: 'peak', f: 1100, q: 1, gain: 2 }, pres(5, 2600, 1)] });
    // the tuba toe: four short soft downbeats under the pizz, mono, the family's bass voice
    const busTuba = s.bus('tuba', { gain: -15, width: 0, room: 0.06, eq: [{ type: 'hp', f: 38 }, { type: 'peak', f: 900, q: 1, gain: -2 }] });
    // one pizz cello an octave over the bass: the tiptoe's upper tick (1-3 kHz on the steps), left of the tip
    const busCello = s.bus('cello', { gain: -4.5, pan: -0.28, room: 0.08, reverb: 0.04, sat: 8, eq: [{ type: 'hp', f: 190 }, { type: 'peak', f: 400, q: 1, gain: -2 }, pres(5, 2600, 1), pres(3, 3800, 1.2)] });
    // the tip: the first desk from the right, the second desk a few ms later from the left, 6 dB softer
    const tipEq = [{ type: 'peak', f: 300, q: 1, gain: -1.5 }, pres(4, 3200)];
    const tipComp = { threshold: -32, ratio: 4, attack: 0.0005, release: 0.08, knee: 6, makeup: 2 };
    const busTip = s.bus('tiptoe', { gain: -6.5, pan: 0.38, width: 1.3, room: 0.08, reverb: 0.06, eq: tipEq, comp: tipComp });
    const busTip2 = s.bus('tiptoe2', { gain: -12.5, pan: -0.42, width: 1.4, room: 0.1, reverb: 0.06, eq: tipEq, comp: tipComp });
    // the noir organ on two Leslie sides: one low-pass instead of a notch stack, a little reed edge (sat 7)
    const orgEq = [{ type: 'hp', f: 120 }, { type: 'peak', f: 350, q: 1, gain: -2 }];
    const busOrgL = s.bus('organ', { gain: -19, pan: -0.5, width: 1.1, room: 0.1, reverb: 0.12, sat: 7, eq: orgEq });
    const busOrgR = s.bus('organR', { gain: -23, pan: 0.45, width: 1.1, room: 0.1, reverb: 0.14, sat: 7, eq: orgEq });
    // the theremin: in the band, nearly clean (a body from h2, a small dip on the 3rd-harmonic region)
    const busTher = s.bus('theremin', { gain: -13, pan: -0.12, reverb: 0.35, delay: 0.18, sat: 6,
      eq: [{ type: 'peak', f: 550, q: 1, gain: -3 }, { type: 'peak', f: 1250, q: 1.2, gain: 2 }, { type: 'peak', f: 1900, q: 3, gain: -1.5 }, { type: 'peak', f: 2490, q: 5, gain: -3 }] });
    const busGlass = s.bus('glass', { gain: -12, reverb: 0.3 });
    const busCel = s.bus('celesta', { gain: -9.5, pan: 0.3, width: 1.1, reverb: 0.25, delay: 0.12, eq: [pres(1.5, 3000)] });
    // the jingles: air above 10 kHz, their fixed lines cut deep (4.6/4.69, 6.645, 6.88, 9.4, 11 kHz)
    const lines = [{ type: 'peak', f: 6645, q: 8, gain: -7 }, { type: 'peak', f: 6880, q: 6, gain: -4 }, { type: 'peak', f: 9400, q: 4, gain: -4 }, { type: 'peak', f: 11040, q: 10, gain: -4 }, { type: 'highshelf', f: 10000, q: 0.7, gain: 3 }];
    const busRiq = s.bus('riq', { gain: -8, pan: -0.35, room: 0.06, eq: [{ type: 'peak', f: 4690, q: 6, gain: -3 }, ...lines] });
    // the tambourine owns most of the fixed lines: each cut narrow (4.69, 9.3, 10.76, 11.52, 12.37 kHz)
    const busTamb = s.bus('tamb', { gain: -8.5, room: 0.05, width: 0.8, eq: [{ type: 'peak', f: 4688, q: 8, gain: -5 }, { type: 'peak', f: 9296, q: 10, gain: -4 }, { type: 'peak', f: 10760, q: 7, gain: -5 }, { type: 'peak', f: 11520, q: 10, gain: -5 }, { type: 'peak', f: 12369, q: 10, gain: -5 }, ...lines] });
    // the knock: the riq's head alone, tuned, soft, no low-mid boom (music, not a door)
    const busKnock = s.bus('knock', { gain: -16, pan: -0.1, room: 0.12, eq: [{ type: 'hp', f: 160 }, { type: 'lp', f: 3200 }] });
    const busZil = s.bus('zils', { gain: -7, pan: 0.5, reverb: 0.2, eq: [{ type: 'peak', f: 2100, q: 4, gain: -3 }] });

    // ---------------------------------------------------------------- parts
    const bass = feel(s.part(busBass, 'contrabassPizz', { bright: 1.2, humanize: LOCK }), -0.003);
    const bassW = feel(s.part(busBassW, 'contrabassPizz', { bright: 1.6, humanize: LOCK, name: 'contrabassPizz:double' }), -0.002);
    const tuba = feel(s.part(busTuba, 'tuba', { humanize: LOCK, growl: 0, accent: 0 }), -0.003);
    const cello = feel(s.part(busCello, 'stringsPizzicato', { section: 'celli', players: 3, detune: 9, bright: 1.7, humanize: { time: 0.004, vel: 0.12 }, name: 'pizz cello tick' }), 0.002);
    // every cello pluck a little different: brightness, the players' spread and place cycle (a player's finger, not a sample)
    {
      const orig = cello.note; let ci = 0;
      const BR = [1.45, 1.8, 1.6, 1.95, 1.5, 1.7, 1.85];
      cello.note = (beat, dur, pitch, vel, o = {}) => { const k = ci++; return orig(beat, dur, pitch, vel, { bright: BR[k % BR.length], detune: [9, 13, 6, 11][k % 4], pan: ((k % 3) - 1) * 0.05, ...o }); };
    }
    const vln = feel(s.part(busTip, 'stringsPizzicato', { section: 'violins', bright: 1.3, name: 'pizz violins' }), 0.01);
    const vln2 = feel(s.part(busTip2, 'stringsPizzicato', { section: 'violins', players: 2, bright: 1.2, name: 'pizz violins 2nd desk' }), 0.0175);
    const vlnSolo = feel(s.part(busTip, 'stringsPizzicato', { section: 'violins', players: 1, bright: 1.3, name: 'pizz violin solo' }), 0.008);
    const orgOpts = { kind: 'keys', decay: 0, attack: 0.07, release: 0.32, exact: true, bright: 0.9 };
    const organ = s.part(busOrgL, 'stab', { ...orgOpts, name: 'organ' });
    const organR = s.part(busOrgR, 'stab', { ...orgOpts, name: 'organ (right drum, +5 c)' });
    const ther = s.part(busTher, 'thereminLead', { sharp: 12, vibRate: 6.2, drift: 1.6 });
    const glass = s.part(busGlass, 'glassPad');
    const cel = feel(s.part(busCel, 'celesta'));
    const riq = feel(s.part(busRiq, 'riq'), -0.004);
    const tamb = feel(s.part(busTamb, 'tambourine', { stroke: 'shake', pan: 0.3, spread: 0.6 }), 0.006);
    const knock = feel(s.part(busKnock, 'riq', { stroke: 'dum', ring: 0.06, name: 'knock' }), 0.004);
    const zils = feel(s.part(busZil, 'fingerCymbals'));

    // ---------------------------------------------------------------- the groove (every bar)
    s.section('A', B(1), B(BAR_COUNT + 1), 'tension');
    const TEK = [0.32, 0.29, 0.3, 0.27, 0, 0.28, 0.31, 0.29, 0.32, 0.28];
    for (let bar = 1; bar <= BAR_COUNT; bar++) {
      const key = TIP_KEY(CHORDS[bar - 1]);
      bass.play(B(bar), RIFF[bar - 1]);
      bassW.play(B(bar), RIFF[bar - 1].replace(/@([.\d]+)/g, (m, v) => `@${(+v * 0.85).toFixed(3)}`));
      // the cello tick: the same steps an octave up, softer
      cello.play(B(bar), RIFF[bar - 1].replace(/@([.\d]+)/g, (m, v) => `@${(+v * 0.62).toFixed(3)}`), { transpose: 12 });
      // the tip on 4, lifted late; the second desk answers from the other side
      if (TIP_BARS.has(bar)) {
        const v = (bar === BAR_COUNT ? 0.5 : TIP_VEL[(bar - 1) % 4]) * (TIP[key].v ?? 1);   // bar 10 leans into the seam
        if (GRACE_AT[bar]) vlnSolo.note(B(bar, GRACE_AT[bar]), 0.125, TIP[key].g, v * 0.45);
        vln.chord(B(bar, 4), 0.4, TIP[key].d, v);
        vln2.chord(B(bar, 4), 0.4, TIP[key].d, v * 0.9);
      }
      // off-beat ghosts: the riq answers from the left on 2& (not in the stop-time bar)
      if (bar !== 5) riq.hit(B(bar, 2.5), 0.5, TEK[bar - 1], { stroke: 'tek' });
      // a single short shake on 2 in the odd bars only (bar 9: a short hit instead); none in the catch
      if (bar % 2 === 1 && bar !== 5) tamb.hit(B(bar, 2), 0.5, bar === 9 ? 0.27 : 0.29, bar === 9 ? { stroke: 'hit', ring: 0.6 } : {});
    }
    // the bed bars: the riq's jingle grid, very soft, on 1& and 3&
    const JG = { 3: [0.15, 0.13], 4: [0.16, 0.14], 7: [0.14, 0.16], 8: [0.17, 0.14] };
    for (const [bar, [a, b]] of Object.entries(JG)) {
      riq.hit(B(+bar, 1.5), 0.5, a, { stroke: 'jingle' });
      riq.hit(B(+bar, 3.5), 0.5, b, { stroke: 'jingle' });
    }
    // a soft jingle on 4& in bars 2, 6, 10 (and the pickup out of the clue in 8)
    for (const bar of [2, 6, 10]) riq.hit(B(bar, 4.5), 0.5, bar === 10 ? 0.23 : 0.2, { stroke: 'jingle' });
    riq.hit(B(8, 4.5), 0.5, 0.24, { stroke: 'jingle' });
    // the tuba toe: downbeats of the phrase heads only, short and soft (with the bass's step)
    for (const [bar, p, v] of [[1, 'Eb2', 0.22], [3, 'Cb2', 0.28], [5, 'Eb2', 0.26], [9, 'Eb2', 0.28]]) tuba.note(B(bar), 0.35, p, v);
    // a dead (muted) ghost pizz on the 2& freeze of bar 6: the left hand stops the string
    bass.note(B(6, 2.5), 0.12, 'Eb2', 0.2, { damp: true });
    // the KNOCK into the catch: two soft raps on the riq's head, tuned to the V (Bb, then F)
    knock.hit(B(4, 4), 0.3, 0.44, { skinF: 233 });
    knock.hit(B(4, 4 + 1 / 3), 0.3, 0.38, { skinF: 175 });

    // ---------------------------------------------------------------- the organ: three tied voices, two Leslie sides
    const orgR = s.rng('organ vel');
    for (let v = 0; v < 3; v++) {
      let start = 1;
      for (let bar = 2; bar <= BAR_COUNT + 1; bar++) {
        const prev = ORG_AT(bar - 1)[v];
        if (bar <= BAR_COUNT && ORG_AT(bar)[v] === prev) continue;
        const len = (bar - start) * 4 + (bar <= BAR_COUNT ? 0.06 : 0);
        const vel = 0.3 + 0.04 * orgR();
        organ.note(B(start), len, prev, vel, { pan: [-0.45, 0.05, 0.5][v] });
        organR.note(B(start), len, n(prev) + 0.05, vel, { pan: [-0.3, 0.1, 0.45][v] });   // the right drum, 5 c sharp
        start = bar;
      }
    }
    // the organ's breath: a swell-pedal ride (bed bars fuller, every move over a beat), the Leslie (the two sides'
    // gain +-2 dB and tone +-600 Hz in anti-phase at ~0.8 Hz, 23 whole cycles per loop, its phase drifting), and the
    // catch's dip. Bar 10 swells back up after the answer so the seam does not sag.
    const MEL = [1, 1, 0, 0, 1, 1, 0, 0, 1, 1];
    const LO = -1.2, HI = 2.5, SEAM = -0.4;
    const orgRide = [[B(1), SEAM], [B(1, 2), LO]];
    for (let bar = 1; bar <= BAR_COUNT; bar++) {
      const v = MEL[bar - 1] ? LO : HI;
      if (bar > 1) orgRide.push([B(bar, 1.2), v]);
      if (bar < BAR_COUNT) orgRide.push([B(bar, 4), v]);
      else orgRide.push([B(bar, 3), v], [B(bar + 1), SEAM]);
    }
    const interp = (pts, at) => {
      if (at <= pts[0][0]) return pts[0][1];
      for (let i = 1; i < pts.length; i++) if (at <= pts[i][0]) { const [a, va] = pts[i - 1], [b, vb] = pts[i]; return va + (vb - va) * (at - a) / (b - a); }
      return pts[pts.length - 1][1];
    };
    const LOOP_BEATS = BAR_COUNT * 4;
    const phase = (beat) => { const u = beat / LOOP_BEATS; return 2 * Math.PI * (23 * u) + 0.7 * Math.sin(2 * Math.PI * 2 * u + 0.6) + 0.3 * Math.sin(2 * Math.PI * 5 * u); };
    const dip = (beat, a, b, c, d) => (beat <= a || beat >= d ? 0 : beat < b ? (beat - a) / (b - a) : beat <= c ? 1 : (d - beat) / (d - c));
    const b0 = B(1);
    const gL = [], gR = [], lL = [], lR = [];
    for (let k = 0; k <= LOOP_BEATS * 8; k++) {
      const rel = k / 8, at = b0 + rel;
      const w = Math.sin(phase(rel));
      const stop = dip(at, B(5, 2), B(5, 2.6), B(5, 3.8), B(5, 4.3));
      const sw = interp(orgRide, b0 + (rel % LOOP_BEATS));
      const close = Math.pow(550 / 3400, stop);
      gL.push([at, sw + 2 * w - 2 * stop]); gR.push([at, sw - 2 * w - 2 * stop]);
      lL.push([at, (3400 + 600 * w) * close]); lR.push([at, (3400 - 600 * w) * close]);
    }
    busOrgL.automate('gain', gL); busOrgR.automate('gain', gR);
    busOrgL.automate('lowpass', lL); busOrgR.automate('lowpass', lR);
    // the bed bars breathe a little in the jingles too (kept small: no sizzle ride)
    const ride = (bus, lo, hi) => {
      const pts = [];
      for (let bar = 1; bar <= BAR_COUNT; bar++) {
        const v = MEL[bar - 1] ? lo : hi, nx = MEL[bar % BAR_COUNT] ? lo : hi;
        pts.push([B(bar, 1.2), v], [B(bar, 4), v]);
        if (nx !== v) pts.push([B(bar + 1, 1.2), nx]);
      }
      pts.push([B(BAR_COUNT + 1, 1.2), MEL[0] ? lo : hi]);
      const seen = new Map(); for (const p of pts) seen.set(p[0].toFixed(4), p);
      bus.automate('gain', [[B(1), MEL[0] ? lo : hi], ...[...seen.values()].filter((p) => p[0] > B(1))]);
    };
    ride(busTamb, 0, 1);
    ride(busRiq, 0, 0.5);
    // the catch reads over the stop-time: +1 dB on the lead from the creep to the correction, ramped
    busTher.automate('gain', [[B(1), 0], [B(5, 2.2), 0], [B(5, 2.5), 1], [B(5, 4.4), 1], [B(6, 1.5), 0], [B(BAR_COUNT + 1), 0]]);

    // ---------------------------------------------------------------- the theremin
    // QUESTION (1-2): a quick leap (straight), Eb5 swells while the vibrato blooms late, the WINK on 4 (a 16th dip to D5
    // and back), then Cb5 over Bb7 = b9 -> 1
    const Q = { legato: true, vibrato: 0.75, vibDelay: 0.9 };
    ther.play(B(1, 1.5), 'mf Gb4:e', Q);
    ther.play(B(1, 2), 'mf Eb5:2@.62', { ...Q, glideTime: 0.07, expr: [[0, 0.85], [0.55, 1], [1, 0.92]] });
    ther.play(B(1, 4), 'D5:s@.5 Eb5:e.@.58', { ...Q, glideTime: 0.045 });
    ther.play(B(2, 1), 'Cb5:1@.62 Bb4:1.5@.56', { ...Q, fall: -38 });
    // THE CATCH (5): the leap lands right (an 8th), creeps a semitone too far, stares (a hand's tremble), one clear
    // bend, back, and the slow slide down; the vibrato only on the corrected Eb5. Softer than the question: a held breath.
    const C = { legato: true, vibrato: 0.65, vibDelay: 1.92 };
    ther.play(B(5, 1.5), 'mf Gb4:e', C);
    ther.play(B(5, 2), 'Eb5:.5@.54', { ...C, glideTime: 0.1 });                         // right...
    ther.play(B(5, 2.5), '76:.25@.5!', { ...C, glideTime: 0.09 });                      // ...and one semitone too far
    ther.play(B(5, 2.75), '76.05:.25@.48!', { ...C, glideTime: 0.2 });                  // the stare trembles
    ther.play(B(5, 3), '75.97:.25@.47!', { ...C, glideTime: 0.2 });
    ther.play(B(5, 3.25), '75.68:.375@.46!', { ...C, glideTime: 0.12 });                // the doubt: a clear -32 c bend
    ther.play(B(5, 3.625), '76:.375@.47!', { ...C, glideTime: 0.12 });                  // hm?
    ther.play(B(5, 4), 'Eb5:2.5@.56', { ...C, glideTime: 0.24, expr: [[0, 0.88], [0.45, 1], [1, 0.9]], fall: -22 });   // fixed, slowly
    // ANSWER (9-10): low, walking down to the tonic and turning; then the suspect inverted: Fb4 slips up to F4 (the 5th
    // of V) at once, and shrugs
    const T = { legato: true, vibrato: 0.55, vibDelay: 0.45 };
    ther.play(B(9, 1.5), 'mp Ab4:e@.5 Gb4:q@.5 Eb4:q.@.48 Gb4:e@.47', { ...T, glideTime: 0.07 });
    ther.play(B(10, 1), 'Fb4:e@.47!', { ...T, glideTime: 0.1 });
    ther.play(B(10, 1.5), 'F4:1.5@.49', { ...T, glideTime: 0.06, fall: -30 });

    // ---------------------------------------------------------------- colour
    zils.note(B(2, 4), 0.6, 'C7', 0.2);                               // "hm?" (short, soft)
    zils.note(B(5, 4), 0.3, 'C7', 0.62, { damp: true });              // the TAP: caught
    zils.note(B(10, 4), 0.6, 'C7', 0.18);
    // bar 3: the violins PEEK: the leap, then the creep onto the wrong note, left hanging
    vln.note(B(3, 3.5), 0.4, 'Gb4', 0.35);
    vln.note(B(3, 4), 0.22, 'Eb5', 0.33);
    vln.note(B(3, 4.25), 0.5, 'Fb5', 0.3, { tag: 'tension' });
    // bar 7 -> 8: the clue across the bar line (Cb is the 5th of the Neapolitan, then the b9 sighing onto Bb)
    cel.note(B(7, 4.5), 0.5, 'Cb6', 0.38);
    cel.note(B(8), 1.5, 'Bb5', 0.34);
    // glass: a low Cb halo (the peek's bed), a low bloom of relief UNDER the corrected Eb5, the Neapolitan, the V
    glass.chord(B(3), 3, ['Gb4', 'Cb5', 'Eb5'], 0.27);
    glass.chord(B(4), 3, ['Ab4', 'D5'], 0.27);
    glass.chord(B(6), 3, ['F4', 'Ab4'], 0.3);
    glass.chord(B(7), 3, ['Ab4', 'Cb5', 'Fb5'], 0.32);
    glass.chord(B(8), 3, ['Ab4', 'D5'], 0.32);

    s.length(B(BAR_COUNT + 1));
  },
};
