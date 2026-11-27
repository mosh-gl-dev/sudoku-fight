// tools/music/tracks/stage_chain.mjs
// "Domino Locks": the staged-practice cue for the CHAIN stages (only one cell is solvable at a time; each solved cell
// opens the next, 3-5 steps). Click-clack unlocking, domino. PLAN: scratchpad/music/stage-set/PLAN.md section 2.4.
// node tools/music/render.mjs stage_chain
//
// TEMPO / METRE: 116 BPM, 4/4, straight 8ths (a bar = 2.069 s). 14 bars = 28.97 s, the whole file loops (a stage of
// up to 60 s plays it twice; a stage that ends after 8 s has heard the first link and the first unlock).
// KEY: C harmonic minor, moving as a CHAIN OF REGIONS (the only cue of the set that changes key). Every link is 3 bars:
// the LINK figure, an echo bar, and the KEY-TURN bar, where the lead ticks on the leading tone of the next region and
// UNLOCKS it a semitone up on the next downbeat (a clap, a reed + keys stab on the new tonic), while the tuba's BOLT
// slides into the new root from a semitone ABOVE (a 16th pickup): the two bolts move in contrary semitones.
//   link 1  Cm   | Cm(maj7) | Eb7       (tick G4  -> Ab)       organ line cliche C4 B3 Bb3 -> Ab3
//   link 2  Ab   | Fm/Ab    | Ab7       (tick C5  -> Db)
//   link 3  Db   | Bbm7/Db  | G7b9      (tick the TRITONE F4+B4: the Neapolitan Db, then V b9: D9)
//   link 4  C    | Fm       | the WEDGE: Dø7 | F7/A | Bb | Db7/B (an augmented 6th) -> Cm (D6)
//           link 4 opens C MAJOR (G7b9 -> C, the third swap D8: the click is D#5-E5), and Fm turns it back to minor
//           (E -> F and G -> Ab in the organ, D10); the wedge lands on C minor, the first true homecoming.
//   tag     Cm   | Dø/C -> G7b9 (the ticks Ab4 -> B4: the augmented 2nd, then the seam B4 -> C5, D4)
// A PIVOT PEDAL (D7) holds the chain together: the organ's top voice is G4 through link 1, steps up to Ab4 at the first
// unlock and holds it through Ab, Db and G7b9 (where it is the b9), falls back to G4 on C (D3), rises to Ab4 on Fm.
// Under it the organ's inner line falls chromatically through the chain (C4 B3 Bb3 Ab3 | Gb3 F3 | E3 F3), common
// tones held across the barlines (only the moving voices are re-struck).
//
// THE IDEA (all our own; checked by script against STYLE.md section 3, the Mori / Schvitz lists, kibbitzer's
// TICK/CALL/RIFF, caper's SNEAK/CALL/FLICK/TUBA and the other stage cues of the plan: no 4 consecutive shared
// intervals, no chromatic run over 3 semitones in a line, no 2+2 shuttle)
//   LINK (1 bar of damped guitar, rest on beat 4)   R  R-5  R  R+3rd | 2nd-3rd LATCH (a 16th snap)  _  R
//     in C minor   C5 G4 C5 Eb5 | D5>Eb5~ _ C5      the CLICK-CLACK: D5 on 3 (a 16th), Eb5 snaps in on 3.25 and holds
//     in Ab major  Ab4 Eb4 Ab4 C5 | B4>C5~ _ Ab4    the click becomes the b3 -> 3 flicker B-C (D8)
//     in Db major  Db5 Ab4 Db5 F5 | E5>F5~ _ Db5    E-F (D8)
//     in C major   (marimba) C5 G4 C5 | (guitar) E5 D#5>E5~ _ C5: the domino passes from wood to string
//     link 4 sequences it up a 4th in Fm (F5 C5 F5 Ab5 | G5>Ab5~ held: the b6 of C) and falls into the wedge
//     F5 Eb5 D5 Db5 -> C5 (quarters, a stab "clack" on each, voiced under the line).
//   Each LINK latch is doubled by a closed finger-cymbal clack: the metal of the lock (the cue's own sound).
//   TICKS: repeated damped notes on the leading tone into the unlock (a key jiggling in a lock), each key-turn its own
//     gesture: link 1 marimba knocks taken over by the guitar, link 2 only two ticks and a tambourine shake, link 3 the
//     tritone F4+B4 syncopated, the tag Ab4 then B4 (the harmonic-minor augmented 2nd, melodic, at the restart).
//   ECHO: in the second bar of each link the click-clack is echoed by a NEW mechanism, climbing in register:
//     link 1 the tuba (D3>Eb3 _ C3), link 2 the celesta (B5>C6 _ Ab5), link 3 the marimba (E5>F5 _ Db5), the tag the
//     glockenspiel (D6>Eb6 _ C6): the chain passes from lock to lock.
//   BOLT: the tuba slides into every new root from a semitone above (Bb2 A2 > Ab2, Eb3 D3 > Db3, D3 Db3 > C3).
//
// FORM (seconds from the loop start; a bar = 2.069 s)
//   1-3    0.00- 6.21  link 1  C minor: LINK, tuba echo, key-turn (knocks + ticks G4)         unlock at 6.21 (Ab)
//   4-6    6.21-12.41  link 2  Ab: LINK, celesta echo, key-turn (two ticks C5)                unlock at 12.41 (Db)
//   7-9   12.41-18.62  link 3  Db: LINK, marimba echo, key-turn (tritone ticks over G7b9)     unlock at 18.62 (C major)
//   10-12 18.62-24.83  link 4  C: the LINK handed from marimba to guitar, the LINK up a 4th (Fm), the WEDGE
//   13-14 24.83-28.97  tag     the landing on C minor (C5, then G4: the door clicks shut), glock echo; Dø/C -> G7b9
//                              with soft Ab4 / B4 ticks and tambourine shakes, the seam (bar 1 = the next unlock)
// MASTER (2026-11-27, gate round 2): -16.03 LUFS, -2.39 dBTP (decoded m4a -16.07 LUFS, -1.9 dBTP, 0 clicks, seam PASS),
// LRA 2.1, limiter max 2.3 dB, 0 clicks, loss after a 150 Hz HP 1.35 LU (300 Hz: 2.6), centroid 699 Hz, air -16.1 dB,
// correlation 0.85 (lead stem 0.71, mono loss of the mix 0.43 LU), seam level step 1.0 dB (the unlocks inside: 0-1.3).
// The first phrase (the LINK) is complete at 1.9 s, the first unlock comes at 6.2 s; every 3 bars something opens, so
// the cue sounds complete whether it stops at 8 s or at 29 s. Melody (LINK statements, the wedge, the landing) in
// 1, 4, 7, 10, 11, 12, 13 = 7 of 14 bars; the echoes and ticks are short figures in the bars between.
//
// SEMITONE DEVICES: D4 (every unlock: the lead's leading tone -> the new tonic; the seam B4 -> C5), the tuba bolt from
// a semitone above into every new root, D8 (B-C, E-F and D#-E flickers in the major links; C major -> C minor), D9 (the
// Db Neapolitan link -> G7b9 -> C; the Db7/B augmented 6th in the wedge), D6 (bar 12: bass A1 Bb1 B1 -> C2 against the
// top Eb5 D5 Db5 -> C5), D7 (the G4 / Ab4 pivot pedal), D3 (Ab4 -> G4 into C; the b9 resolving), D10 (C -> Fm).
//
// BAND: damped guitar pluck LEAD (doubled but narrow, +10 c sharp of the band); monoSynthBass for the sub (no scoop:
// the one modern colour), the tuba an octave above it for phones and for the bolt; a tuned kick on 1 (and the push on
// 2&), short, tuned to the bass note it meets; off-beat closed hats in links 1-2 and the tag, off-beat tambourine taps
// in links 3-4 (the jingles join as the chain gets heavier), a closed finger-cymbal clack on 2, 4 and on the latch; a
// CLAP only on each unlock; reed + keys stabs on each new tonic; a soft drawbar organ (the only organ of the set) with
// held common tones and a swell pedal; celesta, marimba and glockenspiel for the echoes; a jingle roll into the landing.
// Production: dry and close (0.5 s plate on the lead and bells only, a short room on the rest), mono low end, the
// lead near the centre, plucks and stabs wide, no air boost (the hats are shelved down).

const BPM = 116;
const BARS = 14;

export default {
  id: 'stage_chain',
  title: 'Domino Locks',
  bpm: BPM,
  loop: true,

  build(s) {
    s.meter(4, 4);
    s.reverb({ rt60: 0.5, predelay: 0.01, damping: 0.45, early: 0.3, wet: 1 });
    s.room('room');
    s.master({
      lufs: -16, ceiling: -2.5,
      eq: [
        { type: 'lowshelf', f: 100, q: 0.7, gain: -1.5 },
        { type: 'peak', f: 420, q: 0.9, gain: -1.5 },
        { type: 'peak', f: 3300, q: 0.9, gain: 1 },
        { type: 'peak', f: 5000, q: 0.7, gain: 1.5 },
        { type: 'highshelf', f: 10000, q: 0.7, gain: 0 },
      ],
      glue: { threshold: -16, ratio: 1.6, attack: 0.008, release: 0.18, knee: 8 },
      width: 1.35,
    });
    s.humanize = { time: 0.004, vel: 0.05 };
    const B = (bar, beat = 1) => s.bar(bar, beat);

    // one band: a seeded, smooth +-4 ms push/pull over 2-bar spans, cyclic over the loop
    const ensR = s.rng('ensemble');
    const NODES = BARS / 2;
    const dn = Array.from({ length: NODES }, () => (ensR() * 2 - 1) * 0.008);   // beats (0.008 beat = 4 ms)
    const drift = (beat) => {
      const x = beat / 8, i = Math.floor(x), f = x - i, w = (1 - Math.cos(Math.PI * f)) / 2;
      const a = dn[((i % NODES) + NODES) % NODES], b = dn[(((i + 1) % NODES) + NODES) % NODES];
      return a + (b - a) * w;
    };
    // a part with its pocket (beats, + = laid back) and the shared drift. Events written on beat 0 stay exactly on 0
    // (no pocket, no humanising): nothing of the first downbeat wraps to the end of the file, so GO lands clean.
    const lay = (p, off) => new Proxy(p, {
      get(t, k) {
        const v = t[k];
        if (typeof v !== 'function') return v;
        if (k === 'note' || k === 'hit' || k === 'chord') {
          return (b, ...r) => {
            if (b < 1e-6) { const i = k === 'hit' ? 2 : 3; r[i] = { ...(r[i] || {}), exact: true }; return v.call(t, 0, ...r); }
            return v.call(t, b + off + drift(b), ...r);
          };
        }
        return v.bind(t);
      },
    });

    // ---------------------------------------------------------------- buses
    const busLead = s.bus('lead', { gain: -11, reverb: 0.16, room: 0.08, sat: 1.5,
      comp: { threshold: -18, ratio: 2, attack: 0.004, release: 0.05, knee: 6, makeup: 2 },
      eq: [{ type: 'hp', f: 140 }, { type: 'peak', f: 320, q: 1, gain: -2 }, { type: 'peak', f: 2110, q: 4, gain: -2 },
        { type: 'peak', f: 2600, q: 0.9, gain: 1 }] });
    const busSyn = s.bus('synth', { gain: -12, width: 0, sat: 3,
      comp: { threshold: -22, ratio: 3, attack: 0.002, release: 0.08, knee: 6, makeup: 2 },
      eq: [{ type: 'hp', f: 32 }, { type: 'lowshelf', f: 90, gain: -2 }, { type: 'peak', f: 200, q: 1, gain: 2 },
        { type: 'peak', f: 420, q: 1, gain: 2 }, { type: 'lp', f: 6000, q: 0.7 }] });
    const busTuba = s.bus('tuba', { gain: -9.5, width: 0, room: 0.04, sat: 4,
      eq: [{ type: 'hp', f: 40 }, { type: 'lowshelf', f: 115, gain: -2 }, { type: 'peak', f: 520, q: 1, gain: 3 }, { type: 'lp', f: 8000, q: 0.7 }],
      comp: { threshold: -20, ratio: 2.5, attack: 0.003, release: 0.09, knee: 6 } });
    const busKick = s.bus('kick', { gain: -13, width: 0, comp: { threshold: -20, ratio: 4, attack: 0.001, release: 0.05, knee: 4 },
      eq: [{ type: 'lowshelf', f: 90, gain: -2 }, { type: 'peak', f: 3500, q: 1.4, gain: 3 }] });
    const busKit = s.bus('kit', { gain: -7, room: 0.1, width: 0.95,
      comp: { threshold: -14, ratio: 4, attack: 0.0005, release: 0.06, knee: 3 },
      eq: [{ type: 'peak', f: 3500, q: 0.8, gain: -3 }, { type: 'peak', f: 12000, q: 3, gain: -2 }] });
    const busHat = s.bus('hats', { gain: -5, pan: 0.15, width: 1.4,
      eq: [{ type: 'hp', f: 300 }, { type: 'peak', f: 3500, q: 0.8, gain: -3 }, { type: 'highshelf', f: 9000, q: 0.7, gain: -2.5 },
        { type: 'peak', f: 12000, q: 3, gain: -3 }] });
    const busStab = s.bus('stabs', { gain: -12, reverb: 0.06, room: 0.08, width: 1.7, sat: 2,
      eq: [{ type: 'hp', f: 160 }, { type: 'peak', f: 530, q: 1.2, gain: -2 }, { type: 'peak', f: 2800, q: 0.8, gain: -2 }],
      comp: { threshold: -18, ratio: 3, attack: 0.002, release: 0.06, knee: 6 } });
    const busOrgan = s.bus('organ', { gain: -22.5, pan: -0.05, width: 1.5, reverb: 0.08, room: 0.1,
      eq: [{ type: 'hp', f: 150 }, { type: 'peak', f: 900, q: 1, gain: 1 }, { type: 'highshelf', f: 3500, q: 0.7, gain: -4 }] });
    const busBells = s.bus('bells', { gain: -8, pan: 0.35, width: 1.6, reverb: 0.2,
      eq: [{ type: 'peak', f: 2700, q: 2, gain: -2 }] });
    const busMar = s.bus('marimba', { gain: -5, pan: -0.3, width: 1.6, reverb: 0.1, room: 0.06 });

    // ---------------------------------------------------------------- parts
    const tight = { time: 0.003, vel: 0.04 };
    const gtr = lay(s.part(busLead, 'pluck', { body: 'guitar', double: 1, spread: 0.35, damp: true, sharp: 10, bright: 1.05, name: 'guitar lead' }), 0.006);
    const syn = lay(s.part(busSyn, 'monoSynthBass', { humanize: tight, punch: 1.4, retrig: 1.2, scoop: 0 }), 0.004);
    const tuba = lay(s.part(busTuba, 'tuba', { bright: 1.3, humanize: tight }), 0.006);
    const kick = lay(s.part(busKick, 'kick', { click: 1.1, decay: 0.7, humanize: { time: 0.005, vel: 0.06 } }), 0);
    const hat = lay(s.part(busHat, 'hat', { pan: 0.18 }), 0.008);
    const clap = lay(s.part(busKit, 'clap'), 0.002);
    const zils = lay(s.part(busKit, 'fingerCymbals', { pan: -0.2 }), 0.01);
    const clack = lay(s.part(busKit, 'fingerCymbals', { damp: true, pan: 0.25, name: 'latch clack' }), 0.004);
    const tamb = lay(s.part(busKit, 'tambourine', { pan: 0.3, bright: 0.85, skin: 0.25, ring: 0.7, spread: 0.5 }), 0.01);
    const roll = lay(s.part(busKit, 'jingleRoll', { spread: 0.45, ring: 0.6 }), 0);
    const stab = lay(s.part(busStab, 'stab', { kind: 'reed', spread: 1.4 }), 0);
    const stabK = lay(s.part(busStab, 'stab', { kind: 'keys', decay: 0.08, bright: 0.85, name: 'keys stab' }), 0.002);
    const organ = lay(s.part(busOrgan, 'stab', { kind: 'keys', decay: 0, attack: 0.012, release: 0.08, bright: 0.75, name: 'organ' }), 0);
    const cel = lay(s.part(busBells, 'celesta'), 0.01);
    const glock = lay(s.part(busBells, 'glockenspiel'), 0.01);
    const mar = lay(s.part(busMar, 'marimba', { stereo: 1 }), 0.008);

    // ---------------------------------------------------------------- helpers
    const NAMES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    const midiOf = (name) => {
      const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
      return NAMES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12 * (Number(m[3]) + 1);
    };
    // a figure: [beatInBar, pitch | [pitches], beats sounding, vel]
    const fig = (part, bar, notes, o = {}) => {
      for (const [bt, p, d, v] of notes) {
        for (const q of Array.isArray(p) ? p : [p]) part.note(B(bar, bt), d, q, v, o);
      }
    };
    // the LINK in any region: root and the 3rd above it (3 = minor, 4 = major). The click-clack is a LATCH: the
    // neighbour is a 16th snap (3), the 3rd clicks in on 3.25 and holds. Accents: the new tonic, the 3rd, the latch.
    // from = the first beat the guitar plays (bar 10 hands it over from the marimba)
    const LINK = (r, third) => [
      [1, r, 0.42, 0.82], [1.5, r - 5, 0.36, 0.5], [2, r, 0.38, 0.62], [2.5, r + third, 0.42, 0.72],
      [3, r + third - 1, 0.2, 0.55], [3.25, r + third, 0.6, 0.76], [4.5, r, 0.9, 0.6],
    ];
    const link = (bar, root, third, v = 1, from = 1) => {
      const n = LINK(midiOf(root), third).filter(([b]) => b >= from);
      fig(gtr, bar, n.map(([b, p, d, vv]) => [b, p, d, vv * v]));
      clack.hit(B(bar, 3.25), 0.2, 0.2);   // the metal of the latch
    };
    // the echo of the click-clack (3 a 16th, 3.25, 4.5) on any instrument
    const echo = (part, bar, a, b, c, v, len = 0.5, o = {}) =>
      fig(part, bar, [[3, a, 0.22, v * 0.85], [3.25, b, len, v * 1.08], [4.5, c, len * 1.6, v * 0.96]], o);

    // the organ: per-bar voicings (4 voices: the chromatic inner line, a middle voice, a third voice, the pivot pedal
    // on top). A voice that keeps its pitch over the barline is HELD, only the moving voices are re-struck.
    const VO = [
      [B(1), B(2), ['C4', 'Eb4', null, 'G4']],
      [B(2), B(3), ['B3', 'Eb4', null, 'G4'], true],
      [B(3), B(4), ['Bb3', 'Db4', null, 'G4']],
      [B(4), B(5), ['Ab3', 'C4', 'Eb4', 'Ab4']],
      [B(5), B(6), ['Ab3', 'C4', 'F4', 'Ab4']],
      [B(6), B(7), ['Gb3', 'C4', 'Eb4', 'Ab4']],
      [B(7), B(8), ['F3', 'Db4', 'F4', 'Ab4']],
      [B(8), B(9), ['F3', 'Bb3', 'F4', 'Ab4']],
      [B(9), B(10), ['F3', 'B3', 'D4', 'Ab4'], true],
      [B(10), B(11), ['E3', 'C4', 'E4', 'G4']],
      [B(11), B(12), ['F3', 'C4', 'F4', 'Ab4']],
      [B(12), B(12, 2), ['F3', 'C4', 'F4', 'Ab4']],   // = Dø7 over the wedge's D2, then the stabs alone
      [B(13), B(14), ['G3', 'Eb4', null, 'G4']],
      [B(14), B(15), ['Ab3', 'D4', 'F4', 'Ab4']],
    ];
    const OPAN = [-0.45, 0.3, -0.2, 0.45];   // the organ voices spread like a rotary
    for (let v = 0; v < 4; v++) {
      let cur = null;
      const flush = () => { if (cur) organ.note(cur.a, cur.b - cur.a - 0.08, cur.p, v === 3 ? 0.3 : 0.34, { pan: OPAN[v], ...(cur.tag ? { tag: 'tension' } : {}) }); cur = null; };
      for (const [a, b, ch, ten] of VO) {
        const p = ch[v];
        if (cur && p === cur.p && Math.abs(cur.b - a) < 1e-9) { cur.b = b; cur.tag = cur.tag || !!ten; continue; }
        flush();
        if (p) cur = { a, b, p, tag: !!ten };
      }
      flush();
    }
    // the swell pedal: a little lower under each echo, opening into each key-turn, ducked under the glock echo
    busOrgan.automate('gain', [
      [B(1), 0], [B(1, 4), 0], [B(2), -2.5], [B(2, 4), -2.5], [B(3, 4), 0.5], [B(4), 0],
      [B(4, 4), 0], [B(5), -2.5], [B(5, 4), -2.5], [B(6, 4), 0.5], [B(7), 0],
      [B(7, 4), 0], [B(8), -2.5], [B(8, 4), -2.5], [B(9, 4), 0.5], [B(10), 0],
      [B(12), 0], [B(13), 0], [B(13, 2.5), 0], [B(13, 3), -3], [B(13, 4.5), -3], [B(14), 0.8], [B(14, 4), 0.8], [B(15), 0],
    ]);

    // the bass: [beatInBar, beats, pitch, vel]; the synth plays them all (the sub), the tuba an octave up on 1 and 3
    // (tuba: { beat: pitch } overrides), the kick on the given beats, tuned to the bass note it meets
    const bass = (bar, notes, { tuba: tb = {}, kicks = [1, 2.5] } = {}) => {
      for (const [bt, d, p, v] of notes) {
        syn.note(B(bar, bt), d, p, v);
        if (bt === 1 || bt === 3) {
          const tp = bt in tb ? tb[bt] : midiOf(p) + 12;
          if (tp) tuba.note(B(bar, bt), Math.min(d, 0.45), tp, 0.54 + (bt === 1 ? 0.06 : 0));
        }
        if (kicks.includes(bt)) kick.note(B(bar, bt), 0.5, p, bt === 1 ? 0.62 : 0.34);
      }
    };
    // the BOLT: the tuba's 16th pickup a semitone above the new root, just before the unlock
    const bolt = (bar, p) => tuba.note(B(bar, 4.75), 0.2, p, 0.56, { tag: 'tension' });
    // the time: off-beat closed hats (links 1-2, tag) or off-beat tambourine taps (links 3-4); a closed finger-cymbal
    // clack on 2 and 4; on beat 4 of a key-turn everything breathes before the click
    const groove = (bar, { turn = false, jingles = false, open = false, clacks = true, lift = 1 } = {}) => {
      for (const bt of [1.5, 2.5, 3.5, 4.5]) {
        if (turn && bt >= 4) continue;
        if (open && bt === 4.5) { hat.hit(B(bar, bt), 0.5, 0.4 * lift, { open: 0.45 }); continue; }
        if (jingles) tamb.hit(B(bar, bt), 0.3, (bt === 2.5 || bt === 4.5 ? 0.3 : 0.25) * lift);
        else hat.hit(B(bar, bt), 0.25, (bt === 2.5 || bt === 4.5 ? 0.4 : 0.34) * lift);
      }
      if (clacks) for (const bt of turn ? [2] : [2, 4]) clack.hit(B(bar, bt), 0.2, 0.13);
    };
    // an UNLOCK: the flammed clap, a tambourine hit, a reed + keys stab on the new tonic
    const unlock = (bar, chord, v = 0.5, { flam = 0.04, clapV = v } = {}) => {
      clap.hit(B(bar), 0.5, clapV, flam ? { flam } : {});
      tamb.hit(B(bar), 0.5, v * 0.75);
      stab.chord(B(bar), 0.36, chord, v + 0.04);
      stabK.chord(B(bar), 0.3, chord, v * 0.8);
    };

    // ================================================================ link 1: C minor
    s.section('link 1 (Cm)', B(1), B(4), 'gentle');
    unlock(1, ['C4', 'Eb4', 'G4'], 0.46, { flam: 0, clapV: 0.42 });   // bar 1: no flam grace (nothing before 0)
    link(1, 'C5', 3);
    bass(1, [[1, 1.3, 'C2', 0.66], [2.5, 0.4, 'G1', 0.5], [3, 0.6, 'C2', 0.56], [4.5, 0.4, 'Bb1', 0.5]]);
    groove(1);
    // bar 2 Cm(maj7): the click-clack echoed by the tuba, inside the lock (the organ's line cliche C4 -> B3)
    bass(2, [[1, 1.3, 'C2', 0.62], [2.5, 0.4, 'G1', 0.48], [3, 0.6, 'C2', 0.52], [4, 0.4, 'D2', 0.48]], { tuba: { 3: null } });
    echo(tuba, 2, 'D3', 'Eb3', 'C3', 0.56, 0.42);
    groove(2);
    for (const [b, v] of [[4, 0.22], [4.25, 0.28]]) tamb.hit(B(2, b), 0.25, v, { stroke: 'shake' });   // the lock rattles
    // bar 3 Eb7: the key-turn. Marimba knocks on G4 (the leading tone of Ab), the guitar takes the last two
    fig(mar, 3, [[3, 'G4', 0.22, 0.46], [3.5, 'G4', 0.22, 0.5], [4, 'G4', 0.14, 0.54], [4.25, 'G4', 0.14, 0.56]], { damp: true });
    fig(gtr, 3, [[4.5, 'G4', 0.18, 0.56], [4.75, 'G4', 0.18, 0.66]]);
    clack.hit(B(3, 4.75), 0.2, 0.2);
    bass(3, [[1, 1.3, 'Eb2', 0.62], [2.5, 0.4, 'Bb1', 0.5], [3, 0.6, 'Eb2', 0.56]], { tuba: { 3: 'Bb2' }, kicks: [1] });
    bolt(3, 'A2');
    groove(3, { turn: true });

    // ================================================================ link 2: Ab
    s.section('link 2 (Ab)', B(4), B(7), 'gentle');
    unlock(4, ['C4', 'Eb4', 'Ab4'], 0.48);
    link(4, 'Ab4', 4, 0.96);
    bass(4, [[1, 1.3, 'Ab1', 0.66], [2.5, 0.4, 'Eb2', 0.5], [3, 0.6, 'Ab1', 0.58], [4.5, 0.4, 'Bb1', 0.5]]);
    groove(4);
    // bar 5 Fm/Ab: the celesta echoes the B-C flicker
    echo(cel, 5, 'B5', 'C6', 'Ab5', 0.42);
    bass(5, [[1, 1.3, 'Ab1', 0.62], [2.5, 0.4, 'Eb2', 0.48], [3, 0.6, 'C2', 0.54], [4.5, 0.4, 'G1', 0.5]]);
    groove(5);
    for (const [b, v] of [[4, 0.22], [4.25, 0.28]]) tamb.hit(B(5, b), 0.25, v, { stroke: 'shake' });
    // bar 6 Ab7: the key-turn, only two ticks C5 (the leading tone of Db) and a shake
    fig(gtr, 6, [[4, 'C5', 0.3, 0.54], [4.5, 'C5', 0.3, 0.62]]);
    tamb.hit(B(6, 3.5), 0.4, 0.3, { stroke: 'shake' });
    bass(6, [[1, 1.3, 'Ab1', 0.62], [2.5, 0.4, 'Eb2', 0.5], [3, 0.6, 'Eb2', 0.56]], { tuba: { 3: 'Eb3' }, kicks: [1] });
    bolt(6, 'D3');
    groove(6, { turn: true });

    // ================================================================ link 3: Db (the Neapolitan)
    s.section('link 3 (Db)', B(7), B(10), 'tension');
    unlock(7, ['Db4', 'F4', 'Ab4'], 0.5);
    link(7, 'Db5', 4, 0.94);
    bass(7, [[1, 1.3, 'Db2', 0.66], [2.5, 0.4, 'Ab1', 0.5], [3, 0.6, 'Db2', 0.58], [4.5, 0.4, 'Eb2', 0.5]]);
    groove(7, { jingles: true });
    // bar 8 Bbm7/Db: the marimba echoes the E-F flicker (wood: the domino), above the organ
    echo(mar, 8, 'E5', 'F5', 'Db5', 0.58);
    bass(8, [[1, 1.3, 'Db2', 0.62], [2.5, 0.4, 'Ab1', 0.48], [3, 0.6, 'Bb1', 0.54], [4.5, 0.4, 'Ab1', 0.5]]);
    groove(8, { jingles: true });
    for (const [b, v] of [[4, 0.22], [4.25, 0.28]]) tamb.hit(B(8, b), 0.25, v, { stroke: 'shake' });
    // bar 9 G7b9: the heaviest lock, the tritone F4+B4 ticking (syncopated), then C
    const TT = ['F4', 'B4'];
    fig(gtr, 9, [[2.5, TT, 0.3, 0.4], [3, TT, 0.3, 0.42], [3.75, TT, 0.2, 0.46], [4, TT, 0.2, 0.48], [4.5, TT, 0.18, 0.52], [4.75, TT, 0.18, 0.58]], { tag: 'tension' });
    clack.hit(B(9, 4.75), 0.2, 0.2);
    bass(9, [[1, 1.3, 'G1', 0.64], [2.5, 0.4, 'D2', 0.5], [3, 0.6, 'D2', 0.54]], { tuba: { 1: 'G2', 3: 'D3' }, kicks: [1] });
    bolt(9, 'Db3');
    groove(9, { turn: true, jingles: true });

    // ================================================================ link 4: C MAJOR, Fm, the wedge
    s.section('link 4 (C)', B(10), B(13), 'climax');
    unlock(10, ['C4', 'E4', 'G4'], 0.54);
    // the LINK in C major, handed over: the marimba starts it, the guitar takes it at the third (D#5 > E5: D8)
    fig(mar, 10, [[1, 'C5', 0.4, 0.66], [1.5, 'G4', 0.36, 0.48], [2, 'C5', 0.38, 0.56]], { damp: true });
    link(10, 'C5', 4, 1.0, 2.5);
    bass(10, [[1, 1.3, 'C2', 0.68], [2.5, 0.4, 'G1', 0.52], [3, 0.6, 'C2', 0.6], [4.5, 0.4, 'E2', 0.52]], { tuba: { 3: 'G2' } });
    groove(10, { jingles: true });
    // bar 11 Fm: the LINK up a 4th, the Ab5 held (the b6 of the home key) to the wedge; the major turns minor
    fig(gtr, 11, [[1, 'F5', 0.42, 0.78], [1.5, 'C5', 0.36, 0.5], [2, 'F5', 0.38, 0.62], [2.5, 'Ab5', 0.42, 0.72], [3, 'G5', 0.2, 0.55], [3.25, 'Ab5', 1.5, 0.76]]);
    clack.hit(B(11, 3.25), 0.2, 0.2);
    bass(11, [[1, 1.3, 'F2', 0.64], [2.5, 0.4, 'Eb2', 0.5], [3, 0.6, 'F2', 0.58], [4.5, 0.4, 'Eb2', 0.52]], { tuba: { 1: 'F2', 3: 'C3' } });
    groove(11, { jingles: true });
    // bar 12 the WEDGE: Dø7 | F7/A | Bb | Db7/B (aug 6th) -> Cm. Guitar and stabs on the quarters (the stabs voiced
    // under the line, never doubling it), the bass walks 8ths around the chromatic climb D2 A1 Bb1 B1 -> C2, kick and
    // tuba on 1 and 3, a jingle roll on beat 4 into the landing
    s.section('wedge', B(12), B(13), 'climax');
    fig(gtr, 12, [[1, 'F5', 0.5, 0.7], [2, 'Eb5', 0.5, 0.64], [3, 'D5', 0.5, 0.7], [4, 'Db5', 0.55, 0.76]]);
    const W = [['Ab3', 'C4', 'D4'], ['A3', 'C4', 'F4'], ['F3', 'Bb3', 'F4'], ['F3', 'Ab3', 'B3']];
    W.forEach((c, i) => stab.chord(B(12, 1 + i), 0.3, c, 0.4 + 0.02 * i, { pan: i % 2 ? 0.3 : -0.3, tag: i === 3 ? 'tension' : undefined }));
    bass(12, [[1, 0.45, 'D2', 0.62], [1.5, 0.4, 'Ab1', 0.46], [2, 0.45, 'A1', 0.58], [2.5, 0.4, 'C2', 0.46],
      [3, 0.45, 'Bb1', 0.6], [3.5, 0.4, 'D2', 0.46], [4, 0.45, 'B1', 0.64], [4.5, 0.3, 'B1', 0.5]],
    { tuba: { 1: 'D3', 3: 'Bb2' }, kicks: [1, 3] });
    bolt(12, 'Db3');
    roll.hit(B(12, 4), 0.95, 0.24, { from: 0.35, to: 0.9 });
    groove(12, { jingles: true, open: true, clacks: false });

    // ================================================================ tag: home, the seam
    s.section('tag', B(13), B(15), 'release');
    unlock(13, ['G3', 'Eb4', 'G4'], 0.56, { clapV: 0.48 });   // no C in the stab: the landing C5 is the guitar's
    zils.note(B(13), 0.5, 'C7', 0.26, { ring: 0.35 });   // a short ping, not a held high note
    fig(gtr, 13, [[1, 'C5', 1.0, 0.8], [2.5, 'G4', 0.3, 0.48]]);   // the landing, and the door clicks shut
    echo(glock, 13, 'D6', 'Eb6', 'C6', 0.38);
    bass(13, [[1, 1.3, 'C2', 0.7], [2.5, 0.4, 'G1', 0.5], [3, 0.6, 'C2', 0.58], [4.5, 0.4, 'G1', 0.5]], { tuba: { 3: 'G2' } });
    groove(13, { lift: 1.1 });
    // bar 14 Dø/C -> G7b9 over the C pedal: soft ticks, Ab4 then B4 (the augmented 2nd) -> (bar 1) C5; the tambourine
    // shakes on the off-beats, the tuba's bolt Db3 -> C3
    fig(gtr, 14, [[2.5, 'Ab4', 0.3, 0.44], [3, 'B4', 0.24, 0.4], [3.5, 'B4', 0.24, 0.42], [4, 'B4', 0.2, 0.44], [4.5, 'B4', 0.2, 0.46]], { tag: 'tension' });
    for (const b of [2.5, 3.5, 4.5]) tamb.hit(B(14, b), 0.4, 0.26 + 0.04 * (b - 2.5), { stroke: 'shake' });
    bass(14, [[1, 1.3, 'C2', 0.64], [2.5, 0.4, 'G1', 0.5], [3, 0.6, 'C2', 0.58]], { tuba: { 3: 'D3' }, kicks: [1, 2.5] });
    bolt(14, 'Db3');
    groove(14, { open: true, lift: 1.1 });

    s.length(B(BARS + 1));
  },
};
