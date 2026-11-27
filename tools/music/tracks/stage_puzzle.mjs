// tools/music/tracks/stage_puzzle.mjs
// "Slide Swap": the staged-practice cue for the puzzle stage (whole boxes sit in the wrong place; the player swaps
// them back by drag or tap). PLAN: scratchpad/music/stage-set/PLAN.md section 2.5.   node tools/music/render.mjs stage_puzzle
//
// Revision 3 (gate round 2: style 8, composition 7.8, realism 7.2, mix 7.4, fit 8.1). The swap now RUBS (A4 held by one
// bowed violin over Bbm6(maj7)); tile A is stated plainly once before the swap (bar 3 is the glock's answer alone);
// the shuffling bars really shuffle (a walking pizz bass and a scrambled hocket of single tile pitches, side to side);
// the bass rhythm changes from bar to bar (half notes, pushes, quarters) and the celli skip pickups; the organ chick
// breathes (no chick under the tiles, pushes, phrase-end chords, a softer compressor, a guitar pick layered under it,
// the notes panned across the image); a brushed soft-shoe (sand-block brush strokes on 2 and 4) is audible; the
// tambourine only in the swapped and the solved bars; presence restored at 2.5-5 kHz; the HF side narrowed; the iv
// minor kept for two moments (bars 2 and 5); one chord per bar in 9-11, a pushed C pedal in 11, V -> I in 12.
//
// TEMPO / METRE: 124 BPM, 4/4, SWUNG 8ths (the 'and' at 64 % of the beat): a soft-shoe shuffle, the only swung cue
// of the set. A bar = 1.935 s. 16 bars = 30.98 s, the whole file loops (a 60 s stage hears it twice; a stage that
// ends after 8 s has heard bars 1-4, a complete sentence, and the swap's first beat). No kick, no tuba.
// KEY: F major with Mixolydian colour (Eb/F) and mixture: the borrowed iv minor (Bbm6, Db -> C, D10) twice, a box in
// Ab (bIII, bar 7, "the wrong box"), and ONE bII flash (Gb, bar 15: the last tile lands a semitone too high and snaps
// down). Seam E1 -> F1 (D4), the only E -> F in the bass.
//
// THE IDEA: two little pizz "tiles" of 2 beats each that FIT TOGETHER BY A SEMITONE:
//   A  C5 C5 Ab4 A4      0 -4 +1      violins, LEFT (the blue b3 smeared up to the 3rd; ends on A, open)
//   B  Bb4 G4 F4         -3 -2        violas + wood, RIGHT (starts a semitone above A's last note; ends on the tonic)
// In order (A|B, bar 1) the joint A4 -> Bb4 is a semitone: C C Ab A Bb G F. Each tile keeps its home side all through.
// Swapped (B|A, bar 5) the joint is a leap (F4 -> C5); tile A comes in late (from 2&) and its A4 STICKS OUT: one bowed
// solo violin takes the plucked A4 (scooped up from Ab, the smear) and holds it 1.5 beats over the Bb1 and a Bbm6
// chick on 4& (G Bb Db under A: Bbm(maj7)); the wood knocks then "fix" it, A4 -> Bb4 (bar 6).
// Bar 7 has the right order in the wrong box (both tiles in Ab, a minor 3rd up); the bass Ab -> G slides it back.
// Bars 10-11 SHUFFLE: single tile pitches in scrambled order on the swung 'and's, wood right / violins left.
// Bar 12 slides tile B in alone; bar 13 puts both together in the centre, in 3rds, without the smear (C5 A4 Bb4 G4 F4:
// the solved gait); bar 15 shuffles both tiles one 8th late, 28 c sharp, and lands the last note on Gb (bII); the
// glock + violas snap it to F in tune on 16/1 and the whistle slides home.
// Anti-copy (checked by script against STYLE.md section 3, kibbitzer, caper and the other stage cues): hook intervals
// 0 -4 +1 +1 -3 -2; at most 2 consecutive intervals shared with any hook; no Ab-G-E-F; chromatic runs at most 2
// semitones; no 2+2 shuttle.
// Semitone devices: the semitone joint and the b3 -> 3 smear (Ab A Bb); D10 iv minor (Bbm6, Db4 -> C4, bars 2 and 5);
// A against Bb (Bbm maj7) in the swap; D9 G -> Gb -> F (bars 15-16, lead + organ + bass); D2 bass Gb1 -> F1 (bar 8)
// and the b9 Db over C (bar 12); D6 bass approaches of 1-2 semitones (F F# G, C# D, B C); D4 seam
// E1 -> F1; D12 whistle slides (overshoot and settle) and the bowed scoop; bar 15's tiles 28 c sharp until the snap.
//
// FORM (seconds from the loop start)                       chords (one per bar unless split)
//   1-4    0.00- 7.74  in order: F6 | Eb/F Bbm6 | F6/C | Gm7 C7. A|B (1); knocks D5 -> C5 (2); the glock answers
//                      A5 Bb5 C6 (3); the whistle slides C5 -> Db6 -> C6 (4, the swap is coming); bass pushes (4).
//   5-8    7.74-15.49  swapped: F Bbm(maj7) | C7b9 | Ab | C7b9 F. B|A, the A sticks out (5); knocks A4 -> Bb4 (6);
//                      A|B in Ab (7); bass Ab -> G, the bed breathes, Gb1 -> F1 (8).
//   9-12  15.49-23.23  shuffling: F6 | Bb6 | C9sus4 (C pedal) | C9sus4 C7b9 (C Bb C). Walking quarters (9-10), the
//                      scrambled hocket (10-11), a pushed pedal (11), tile B alone and V -> I (12).
//   13-16 23.23-30.98  solved: F6 | Eb/F Gm7/Bb | F Gb | F C7. Both tiles in 3rds (13), bed (14), the shuffled wink
//                      (15), the snap F4 + glock F6 on 16/1, the whistle C6 -> E5 -> F5, the bass seam E1 -> F1.
// Melody (pizz tiles) in 6 of 16 bars (1 5 7 12 13 15), the soft hocket (10-11, two notes a bar) and the snap; gestures:
// glock (3, 16), whistle (4, 16), the bowed A (5-6). No held note above C6 (1.05 kHz).
//
// BAND: pizz violins (tile A, left) and violas (tile B, right) on two lead buses + a centre bus for the solved bar;
// one bowed solo violin (the stuck A, bar 5); damped marimba "wood" doubling tile B (and the hocket); whistleLead as a
// slide whistle (2 gestures, glide 0.25 s); glockenspiel (four notes); pizz basses + celli (two-feel, walking 9-10,
// choked pickups); organ "chick" (stab keys) with a guitar pick under it; damped marimba "tile knocks" in the marimba's
// middle (bars 2, 6, 14); a sand-block soft-shoe (brush strokes on 2 and 4, ticks on the swung 'and's); tambourine on 4
// in the swapped and solved bars; finger cymbals on the swap and the solved downbeats (5/1, 13/1).
// Production: dry and close (0.5 s plate, short room), mono bass, wide tiles, the HF side narrower than the mid.
// MEASURED (render 2026-11-27, r3): -16.34 LUFS, -2.19 dBTP, LRA 1.95 LU, max short-term -14.6, corr 0.75, side/mid
// -8.4 dB (below 150 Hz -22.5, above 4 kHz -9.6), 0.76 LU lost after a 150 Hz high-pass, centroid 718 Hz, presence
// -16.0 dB, third-octaves 2.5/3.2/4/5 kHz -22.8/-24.3/-24.8/-23.8 dB re total, harshness -13.7 dB long-term, p95
// -3.3 dB (PASS), 0 clicks, 0 gaps, loop seam PASS (level 0.6 dB); limiter max 2.7 dB (0.1 s over 2 dB); sections
// -16.5 / -15.8 / -17.0 / -16.2 LUFS; m4a decoded -16.39 LUFS, -1.56 dBTP, sample-exact length, seam PASS.
// Anti-copy script: at most 2 consecutive intervals shared by any line, chromatic runs <= 2.

const BPM = 124;
const BARS = 16;
const LEAD_SHARP = 0.06;            // semitones: the pizz leads sit 6 c sharp of the band (bar 15: WINK_SHARP)
const WINK_SHARP = 0.28;            // the shuffled wink of bar 15: audibly sharp, then the snap in tune
const SW = 0.64;                    // the swung 8th: the 'and' falls at 64 % of the beat (soft-shoe)

export default {
  id: 'stage_puzzle',
  title: 'Slide Swap',
  bpm: BPM,
  loop: true,

  build(s) {
    s.meter(4, 4);
    s.reverb({ rt60: 0.5, predelay: 0.01, damping: 0.5, early: 0.35, wet: 1 });
    s.room('room');
    s.master({
      lufs: -16.3, ceiling: -2.2,
      eq: [
        { type: 'lowshelf', f: 110, q: 0.7, gain: -1 },
        { type: 'peak', f: 400, q: 0.9, gain: -1.5 },
        { type: 'peak', f: 3200, q: 0.6, gain: 2.5 },
      ],
      glue: { threshold: -16, ratio: 1.5, attack: 0.01, release: 0.2, knee: 8 },
      width: 1.4,
    });
    s.humanize = { time: 0.005, vel: 0.05 };

    // swung position: the 'and' of any beat moves to SW of the beat
    const swing = (beat) => {
      const i = Math.floor(beat + 1e-9), f = beat - i;
      return Math.abs(f - 0.5) < 1e-6 ? i + SW : beat;
    };
    const B = (bar, beat = 1) => s.bar(bar, swing(beat));

    // one band: a seeded, smooth +-4 ms push/pull over 2-bar spans, cyclic over the loop
    const ensR = s.rng('ensemble');
    const NODES = BARS / 2;
    const dn = Array.from({ length: NODES }, () => (ensR() * 2 - 1) * 0.004);
    const drift = (beat) => {
      const x = beat / 8, i = Math.floor(x), f = x - i, w = (1 - Math.cos(Math.PI * f)) / 2;
      const a = dn[((i % NODES) + NODES) % NODES], b = dn[(((i + 1) % NODES) + NODES) % NODES];
      return a + (b - a) * w;
    };
    // the loop point: a note written on 1/1 must start INSIDE the file (no attack straddling the seam)
    const feel = (part, role = 0) => {
      const orig = part.note.bind(part);
      part.note = (beat, dur, pitch, vel, o = {}) => {
        if (Array.isArray(pitch)) { for (const p of pitch) part.note(beat, dur, p, vel, o); return part; }
        let sh = (o._shift || 0) + role + drift(beat);
        if (beat < 1e-6) return orig(beat, dur, pitch, vel, { ...o, exact: true, _shift: Math.max(0.004, sh) });
        return orig(beat, dur, pitch, vel, { ...o, _shift: sh });
      };
      return part;
    };

    // ---------------------------------------------------------------- buses
    const pres = (g, f = 3000, q = 0.9) => ({ type: 'peak', f, q, gain: g });
    // the two tiles each have a home side: A (violins) left, B (violas + wood) right; the solved bar sits in the centre.
    // r3: a broad presence lift (the pizz snap on phones), the 1.58 kHz nasal notch halved
    const leadEq = [{ type: 'hp', f: 150 }, { type: 'peak', f: 450, q: 1, gain: -2 }, { type: 'peak', f: 1580, q: 4, gain: -1.5 }, pres(6, 3300, 0.7)];
    // gentle: the written velocities (the phrase shape) survive
    const leadComp = { threshold: -18, ratio: 2, attack: 0.003, release: 0.06, knee: 6, makeup: 1 };
    const busL = s.bus('leadL', { gain: -5, pan: -0.6, width: 1.1, reverb: 0.16, room: 0.1, eq: leadEq, sat: 3, comp: leadComp });
    const busR = s.bus('leadR', { gain: -6.5, pan: 0.6, width: 1.1, reverb: 0.16, room: 0.1, eq: leadEq, sat: 3, comp: leadComp });
    const busC = s.bus('leadC', { gain: -10, pan: 0, width: 1.0, reverb: 0.16, room: 0.1, eq: leadEq, sat: 3, comp: leadComp });
    const busArco = s.bus('arco', { gain: -5, pan: -0.55, width: 0.8, reverb: 0.2, room: 0.1,
      eq: [{ type: 'hp', f: 180 }, { type: 'peak', f: 3300, q: 1, gain: -2 }] });
    const busWood = s.bus('wood', { gain: -8.5, pan: 0.55, width: 1.1, room: 0.1, reverb: 0.05, eq: [{ type: 'hp', f: 220 }, pres(2, 2400, 1)] });
    const busWh = s.bus('whistle', { gain: -10.5, pan: 0.12, reverb: 0.26, room: 0.06,
      eq: [{ type: 'hp', f: 300 }, { type: 'peak', f: 2400, q: 1, gain: -1.5 }] });
    const busGl = s.bus('glock', { gain: -6, pan: 0.3, width: 1.1, reverb: 0.2, eq: [{ type: 'peak', f: 3850, q: 4, gain: -3 }] });
    const busBass = s.bus('bass', { gain: -8, pan: 0, width: 0.2, room: 0.07, sat: 3.5,
      eq: [{ type: 'hp', f: 36 }, { type: 'lowshelf', f: 100, q: 0.7, gain: -1 }, pres(3, 1000, 0.8)],
      comp: { threshold: -22, ratio: 3, attack: 0.001, release: 0.06, knee: 6, makeup: 1 } });
    // the celli (the phone octave of the bass) on their own bus: high-passed, with a presence lift a phone can play
    const busCello = s.bus('celli', { gain: -4, pan: 0, width: 0.3, room: 0.07, sat: 3.5,
      eq: [{ type: 'hp', f: 110 }, pres(3, 1000, 0.8)],
      comp: { threshold: -24, ratio: 4, attack: 0.0005, release: 0.06, knee: 6, makeup: 1 } });
    // organ chick: a softer compressor (the written velocities survive), the top darker so the tiles own 2-5 kHz
    const busOrg = s.bus('organ', { gain: -7.5, pan: 0, width: 1.3, room: 0.18, reverb: 0.06, sat: 4,
      eq: [{ type: 'hp', f: 160 }, { type: 'peak', f: 900, q: 1, gain: -1 }, { type: 'highshelf', f: 2500, q: 0.7, gain: -4 }],
      comp: { threshold: -24, ratio: 2.5, attack: 0.003, release: 0.06, knee: 6, makeup: 2 } });
    // a guitar pick under the chick: the attack and a varying timbre (wide: the take is doubled)
    const busPick = s.bus('pick', { gain: -11, pan: 0, width: 1.2, room: 0.12,
      eq: [{ type: 'hp', f: 250 }, { type: 'peak', f: 3000, q: 1, gain: -2 }] });
    const busKnock = s.bus('knock', { gain: -6.5, pan: -0.25, width: 1.1, room: 0.1, eq: [{ type: 'hp', f: 250 }, pres(-2, 2200, 1)] });
    // the sand-block soft-shoe: brush strokes on 2 and 4, ticks on the swung 'and's; the HF side narrow (close, dry)
    const busShak = s.bus('shaker', { gain: -4.5, pan: 0.25, width: 0.9,
      eq: [{ type: 'peak', f: 3000, q: 0.7, gain: -10 }, { type: 'peak', f: 4800, q: 1.2, gain: -4 }, { type: 'lp', f: 10000 }],
      comp: { threshold: -30, ratio: 2.5, attack: 0.001, release: 0.05, knee: 6, makeup: 2 } });
    // the ticks on the swung 'and's: the same sand block, a little to the other side, airier (the bite above 5 kHz)
    const busTick = s.bus('tick', { gain: -3.5, pan: -0.1, width: 0.8,
      eq: [{ type: 'peak', f: 3000, q: 0.6, gain: -14 }, { type: 'peak', f: 5000, q: 1.2, gain: -4 }, { type: 'lp', f: 10500 }] });
    const busTamb = s.bus('tamb', { gain: -10, pan: -0.2, width: 0.7, room: 0.06,
      eq: [{ type: 'hp', f: 400 }, { type: 'peak', f: 3500, q: 0.8, gain: -2 }, { type: 'lp', f: 11000 }] });
    const busZil = s.bus('zils', { gain: -6, pan: -0.35, reverb: 0.18, eq: [{ type: 'peak', f: 3500, q: 1, gain: -3 }] });

    // ---------------------------------------------------------------- parts
    const pz = (bus, section, name) => feel(s.part(bus, 'stringsPizzicato', { section, name, humanize: { time: 0.004, vel: 0.04 } }), 0.004);
    const vlnL = pz(busL, 'violins', 'pizz violins L');
    const vlaR = pz(busR, 'violas', 'pizz violas R');
    const vlnC = pz(busC, 'violins', 'pizz violins C'), vlaC = pz(busC, 'violas', 'pizz violas C');
    const arco = feel(s.part(busArco, 'soloViolin', { name: 'the stuck A (arco)' }), 0.01);
    const wood = feel(s.part(busWood, 'marimba', { damp: true, name: 'wood (tile B)' }), 0.006);
    const whistle = s.part(busWh, 'whistleLead', { glide: 0.25, sharp: 15, creep: 4, scoop: -0.3, fall: -40, fallTime: 0.2, name: 'slide whistle' });
    const glock = feel(s.part(busGl, 'glockenspiel'), 0.006);
    const cb = feel(s.part(busBass, 'stringsPizzicato', { section: 'basses', name: 'pizz basses', humanize: { time: 0.003, vel: 0.03 } }), 0.002);
    const vc = feel(s.part(busCello, 'stringsPizzicato', { section: 'celli', name: 'pizz celli', humanize: { time: 0.003, vel: 0.03 } }), 0.004);
    const org = feel(s.part(busOrg, 'stab', { kind: 'keys', decay: 0.14, attack: 0.012, name: 'organ chick' }), 0.008);
    const pick = feel(s.part(busPick, 'pluck', { body: 'guitar', double: 1, spread: 0.8, damp: true, name: 'guitar pick' }), 0.002);
    const knock = feel(s.part(busKnock, 'marimba', { damp: true, name: 'tile knock' }), 0.004);
    const shak = feel(s.part(busShak, 'shaker', { decay: 1.1, spread: 0.5, bright: 0.85, name: 'sand block' }), 0.006);
    const tick = feel(s.part(busTick, 'shaker', { decay: 0.8, spread: 0.4, bright: 0.95, name: 'sand ticks' }), 0.006);
    const tamb = feel(s.part(busTamb, 'tambourine', { stroke: 'shake', spread: 0.6, ring: 0.8 }), 0.008);
    const zils = feel(s.part(busZil, 'fingerCymbals'), 0.004);

    const NAMES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    const midiOf = (name) => {
      const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
      return NAMES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12 * (Number(m[3]) + 1);
    };

    // the two tiles: 2 beats of swung 8ths each; [midi, beats, vel, opts?]
    //   A  C5 C5 Ab4 A4    0 -4 +1     (the blue b3 smeared up: ends on the 3rd, open)
    //   B  Bb4 G4 F4       -3 -2       (a semitone above A's end: the joint; home on the tonic)
    const tileA = (v = 0.6, t = 0) => [[t + 72, 0.5, v - 0.1], [t + 72, 0.5, v + 0.02], [t + 68, 0.5, v - 0.05], [t + 69, 0.5, v + 0.03]];
    const tileB = (v = 0.58, t = 0, last = 65) => [[t + 70, 0.5, v + 0.06], [t + 67, 0.5, v - 0.1], [last + t, 1, v + 0.02]];
    // a pizz line from (bar, beat), positions swung; `woodV` doubles it on the wood (tile B's timbre tag)
    const play = (part, bar, beat, notes, { sharp = LEAD_SHARP, woodV = 0 } = {}) => {
      let at = beat;
      for (const [m, d, v, o = {}] of notes) {
        if (m != null) {
          part.note(B(bar, at), Math.max(0.3, d * 0.8), m + sharp, v, o);
          if (woodV > 0) wood.note(B(bar, at), Math.min(0.45, d * 0.8), m, v * woodV);
        }
        at += d;
      }
    };

    // bass: [beat, pitch, vel, decay?]; basses + celli an octave up (the phone octave). Pickups (an 'and') are choked
    // so they do not ring into their semitone target; the rest decay 0.5 (an upright), a half note rings (decay 0.8).
    // vc: 'all' | 'nopick' (celli skip the pickups) | 'down' (celli on beat 1 only) | 'soft' (the walk: celli lighter
    // after beat 1); solo: one player (9-12)
    const bass = (bar, notes, { solo = false, vcMode = 'all' } = {}) => {
      for (const [bt, p, v0 = 0.62, dk] of notes) {
        const m = midiOf(p), pick = Math.abs(bt % 1 - 0.5) < 1e-6, v = bt === 3 ? v0 * 0.9 : v0;   // the 3 is lighter
        const decay = dk ?? (pick ? 0.2 : 0.5);
        cb.note(B(bar, bt), 0.7, m, v, { decay, ...(solo ? { players: 1 } : {}) });
        const celli = vcMode === 'all' || vcMode === 'soft' || (vcMode === 'nopick' && !pick) || (vcMode === 'down' && bt === 1);
        const vk = vcMode === 'soft' && bt !== 1 ? 0.72 : solo ? 0.9 : 1.0;
        if (celli) vc.note(B(bar, bt), 0.7, m + 12, v * vk, { decay: pick ? 0.25 : Math.min(1, decay + 0.05) });
      }
    };
    // organ "chick": [beat, chord, vel?, decay?] hits; a player's hand: the notes 3-4 ms apart, low note left, top note
    // right (the chord spread across the image), the inner voice softer. `pickV` layers the guitar pick (top 2 notes).
    const phR = s.rng('phrase');
    const phV = Array.from({ length: BARS / 2 }, () => 1 + (phR() * 2 - 1) * 0.1);
    const chick = (bar, hits, { pickV = 0.32 } = {}) => {
      const k = phV[Math.floor((bar - 1) / 2)];
      for (const [bt, ch, v = 0.36, dk = 0.14] of hits) {
        const vv = v * k, nn = ch.length;
        ch.forEach((p, i) => org.note(B(bar, bt), dk > 0.2 ? 0.45 : 0.22, midiOf(p), vv * (i === 1 ? 0.85 : 1),
          { _shift: i * 0.0035, decay: dk, pan: nn > 1 ? -0.28 + (0.56 * i) / (nn - 1) : 0 }));
        if (pickV > 0) ch.slice(-2).forEach((p, i) => pick.note(B(bar, bt), 0.12, midiOf(p), pickV * (0.9 + 0.2 * phR()) * (i ? 1 : 0.85), { _shift: 0.002 + i * 0.006 }));
      }
    };
    // the soft-shoe: the sand block rubbed on 2 and 4 (a long brushy stroke), short ticks on the swung 'and's, the
    // on-beats light. mode 'off' = the shuffling bars (the on-beats a whisper); ghostEnd = the last 8th a ghost; half =
    // the second half without 'and's (a breath); swish = a long swish on 4& into the next bar; skip1 = no stroke on 1
    // (the zils own it); tamb = a tambourine shake on 4 (swapped and solved bars only)
    const shR = s.rng('shoe');
    const shoe = (bar, { mode = 'two', ghostEnd = false, half = false, swish = false, skip1 = false, tamb4 = false } = {}) => {
      for (let i = 0; i < 8; i++) {
        const bt = 1 + i / 2, on = i % 2 === 0, back = i === 2 || i === 6;
        if (skip1 && i === 0) continue;
        if (half && i >= 4 && !on) continue;
        if (swish && i === 7) { shak.hit(B(bar, bt), 0.45, 0.5, { decay: 3, attack: 0.03 }); continue; }
        if (back) {   // the brush stroke: a slow rise and a long 'shhh'
          shak.hit(B(bar, bt) - 0.03, 0.4, 0.52 + (shR() * 2 - 1) * 0.05, { attack: 0.028, decay: 1.9 });
          continue;
        }
        // the 'and' right after a brush stroke is a ghost (the 'shhh-k' of the rubbed blocks); 1& and 3& tick
        let v = on ? 0.3 : (i === 3 || i === 7) ? 0.32 : 0.46;
        if (mode === 'off') v = on ? 0.22 : (i === 3 || i === 7) ? 0.32 : 0.44;
        v += (shR() * 2 - 1) * 0.05;
        if (ghostEnd && i === 7) v = 0.26;
        tick.hit(B(bar, bt), 0.2, v, { decay: on ? 1.1 : 0.9 });
      }
      if (tamb4) tamb.hit(B(bar, 4), 0.4, 0.42 + (shR() * 2 - 1) * 0.05);
    };
    // the tiles sliding: dry wood knocks [beat, pitch, vel, len]; the second knock of a pair lands (louder, shorter)
    const knocks = (bar, hits) => { for (const [bt, p, v = 0.42, len = 0.1] of hits) knock.note(B(bar, bt), len, p, v); };
    // slide-whistle gesture (one legato chain: the glide runs through the short notes)
    const swoop = (bar, beat, phrase, o = {}) => whistle.play(B(bar, beat), phrase, { legato: true, vel: 0.5, ...o });

    // chords (organ voicings, below the tiles)
    const F6 = ['A3', 'C4', 'D4'], EbF = ['G3', 'Bb3', 'Eb4'], Bbm6 = ['G3', 'Bb3', 'Db4'];
    const Gm7 = ['F3', 'Bb3', 'D4'], C7 = ['Bb3', 'C4', 'E4'], Ab = ['Ab3', 'C4', 'Eb4'], Ab6n3 = ['Ab3', 'Eb4', 'F4'];
    const C7b9 = ['Bb3', 'Db4', 'E4'], Gb = ['Bb3', 'Db4', 'Gb4'], F = ['A3', 'C4', 'F4'], Gm7Bb = ['Bb3', 'D4', 'G4'];
    // the shuffling bars: voiced a 3rd / 4th higher, open
    const F6hi = ['D4', 'F4', 'A4'], Bb6hi = ['D4', 'G4', 'Bb4'], C9sHi = ['D4', 'F4', 'Bb4'], C7b9hi = ['Db4', 'E4', 'Bb4'];

    // ================================================================ 1-4: in order
    s.section('in order', s.bar(1), s.bar(5), 'gentle');
    // bar 1  F6: A|B. The joint A4 -> Bb4 is a semitone; no chick under the tiles until 4
    play(vlnL, 1, 1, tileA(0.6));
    play(vlaR, 1, 3, tileB(0.58), { woodV: 0.85 });
    bass(1, [[1, 'F1', 0.6], [3, 'C2'], [4.5, 'G1', 0.5]]);
    chick(1, [[4.5, F6, 0.36]]);
    shoe(1);
    // bar 2  Eb/F, then Bbm6 on 4 (Db4 falls to C4 in bar 3: D10). The bass rings a half note (no pickup);
    // the knocks D5 -> C5; a light dyad on 2
    bass(2, [[1, 'F1'], [3, 'Eb2', 0.6, 0.8]], { vcMode: 'nopick' });
    chick(2, [[2, ['Bb3', 'Eb4'], 0.27], [4, Bbm6, 0.4]]);
    knocks(2, [[3.5, 'D5', 0.36, 0.12], [4.5, 'C5', 0.48, 0.07]]);
    shoe(2);
    // bar 3  F6 over C (the 5th first): the glock answers alone, A5 Bb5 C6 (the joint, rising)
    glock.note(B(3, 2.5), 0.5, 'A5', 0.38);
    glock.note(B(3, 3), 0.5, 'Bb5', 0.4);
    glock.note(B(3, 3.5), 1, 'C6', 0.44);
    bass(3, [[1, 'C2', 0.6], [3, 'F1'], [4.5, 'F#1', 0.48]]);
    chick(3, [[2, F6, 0.34]]);
    shoe(3);
    // bar 4  Gm7 | C7: the whistle slides C5 -> Db6 (overshoot) -> C6 (the swap is coming); the bass pushes (1, 2&, 4)
    // and lands on the dominant; a phrase-end chord on 4& (longer); the sand block swishes into the swap
    swoop(4, 2, 'C5:.25 Db6:.25 C6:.75', { vel: 0.34 });
    bass(4, [[1, 'G1'], [2.5, 'Bb1', 0.52], [4, 'C2', 0.6, 0.6]]);
    chick(4, [[2, Gm7, 0.34], [4.5, C7, 0.4, 0.34]]);
    shoe(4, { swish: true });

    // ================================================================ 5-8: swapped
    s.section('swapped', s.bar(5), s.bar(9), 'tension');
    // bar 5  F | Bbm(maj7): B|A. B (right) first, A (left) late from 2&: the joint is a leap (F4 -> C5) and A's last
    // note STICKS OUT: the bowed violin scoops Ab -> A and holds it over Bb1 + the Bbm6 chick on 4& (A against Bb)
    zils.note(B(5, 1), 1, 'E6', 0.5);
    play(vlaR, 5, 1, [[70, 0.5, 0.62], [67, 0.5, 0.5], [65, 1, 0.6]], { woodV: 0.85 });
    play(vlnL, 5, 2.5, [[72, 1, 0.56], [72, 0.5, 0.6], [68, 0.5, 0.56], [69, 1.5, 0.54]]);
    arco.note(B(5, 4.5), 1.45, 69 + LEAD_SHARP, 0.44, { glideFrom: 68, glideTime: 0.13, vibDelay: 0.25, tag: 'tension' });
    bass(5, [[1, 'F1', 0.62], [3, 'Bb1', 0.62, 1.0]]);
    chick(5, [[4.5, Bbm6, 0.35, 0.4]]);
    shoe(5, { skip1: true, tamb4: true });
    // bar 6  C7b9: the knocks "fix" the stuck tile, A4 -> Bb4 (the missing joint); the bass rings (C2, then G1)
    knocks(6, [[2.5, 'A4', 0.4, 0.12], [3, 'Bb4', 0.52, 0.07]]);
    bass(6, [[1, 'C2', 0.62], [3, 'Bb1', 0.6, 0.8]], { vcMode: 'nopick' });
    chick(6, [[2, C7b9, 0.33], [4, C7b9, 0.37]]);
    shoe(6, { tamb4: true });
    // bar 7  Ab (bIII): the right order in the WRONG BOX, both tiles a minor 3rd up. The chick on 2 leaves out the 3rd
    // (the tile's Cb is blue), Ab with C on 4
    play(vlnL, 7, 1, tileA(0.47, 3));
    play(vlaR, 7, 3, tileB(0.5, 3), { woodV: 0.7 });
    bass(7, [[1, 'Ab1', 0.58], [2.5, 'Eb2', 0.5], [4.5, 'Ab1', 0.5]]);   // the 5th pushed to 2&: the box sits askew
    chick(7, [[2, Ab6n3, 0.34], [4.5, Ab, 0.36]]);
    shoe(7, { tamb4: true });
    // bar 8  C7b9 over G: Ab -> G in the bass slides the box home; the bed breathes (no 'and's in the second half),
    // the chick on 4 pushed to 3& (anticipating F); the bass b2 -> 1, Gb1 -> F1
    bass(8, [[1, 'G1', 0.62], [3, 'C2'], [4.5, 'Gb1', 0.5]]);
    chick(8, [[2, C7b9, 0.35], [3.5, F, 0.4, 0.3]]);
    shoe(8, { half: true, ghostEnd: true, tamb4: true });

    // ================================================================ 9-12: shuffling
    s.section('shuffling', s.bar(9), s.bar(13), 'gentle');
    // bar 9  F6: the upright walks alone in quarters (celli on 1 only); one chick, pushed to 3&, voiced higher
    bass(9, [[1, 'F1', 0.62], [2, 'A1', 0.5], [3, 'C2', 0.54], [4, 'C#2', 0.5, 0.3]], { vcMode: 'soft' });
    chick(9, [[1.5, ['F4', 'A4'], 0.26], [3.5, F6hi, 0.36]]);
    shoe(9, { mode: 'off' });
    // bar 10 Bb6: the walk goes on (C# -> D, B -> C); the tiles SCRAMBLED: single tile pitches on the swung 'and's,
    // wood right / violins left
    bass(10, [[1, 'D2', 0.6], [2, 'Bb1', 0.5], [3, 'G1', 0.52], [4, 'B1', 0.5, 0.3]], { vcMode: 'soft' });
    chick(10, [[2.5, Bb6hi, 0.3], [4.5, Bb6hi, 0.34]]);
    wood.note(B(10, 1.5), 0.3, 'F4', 0.4);
    play(vlnL, 10, 2.5, [[72, 0.5, 0.36]]);
    wood.note(B(10, 3.5), 0.3, 'G4', 0.38);
    play(vlnL, 10, 4.5, [[70, 0.5, 0.34]]);
    shoe(10, { mode: 'off' });
    // bar 11 C9sus4 over a C pedal (pushed: 1, 2&, 4); the scramble goes on, Bb on the left, G on the right
    bass(11, [[1, 'C2', 0.62], [2.5, 'C2', 0.44, 0.3], [4, 'C2', 0.52]], { vcMode: 'nopick' });
    chick(11, [[2.5, ['F4', 'Bb4'], 0.26], [4, C9sHi, 0.36]]);
    play(vlnL, 11, 1.5, [[70, 0.5, 0.36]]);
    wood.note(B(11, 2.5), 0.3, 'F4', 0.4);
    play(vlnL, 11, 3.5, [[72, 0.5, 0.34]]);
    shoe(11, { mode: 'off' });
    // bar 12 C9sus4 -> C7b9 (F4 -> E4, the sus resolves; Db4 -> C4 points into F): tile B slides in alone, late (right,
    // with the wood); the bass V -> I (C2 pickup into F1); the swish into the solved bar
    play(vlaR, 12, 3, tileB(0.48), { woodV: 0.75 });
    bass(12, [[1, 'C2', 0.62], [3, 'Bb1'], [4.5, 'C2', 0.5]], { solo: true });
    chick(12, [[2, C9sHi, 0.34], [4.5, C7b9hi, 0.34, 0.32]]);
    shoe(12, { mode: 'off', swish: true });

    // ================================================================ 13-16: right side up, the wink, the snap
    s.section('solved', s.bar(13), s.bar(17), 'release');
    // bar 13 F6: both tiles in the centre, in 3rds, WITHOUT the smear (C5 A4 | Bb4 G4 F4: the solved gait)
    zils.note(B(13, 1), 1, 'E6', 0.46);
    play(vlnC, 13, 1, [[72, 1, 0.66], [69, 1, 0.62], [70, 0.5, 0.7], [67, 0.5, 0.56], [65, 1, 0.64]]);
    play(vlaC, 13, 1, [[69, 1, 0.5], [65, 1, 0.47], [67, 0.5, 0.52], [64, 0.5, 0.44], [57, 1, 0.52]]);
    wood.note(B(13, 3), 0.4, 'Bb4', 0.34); wood.note(B(13, 3.5), 0.4, 'G4', 0.28); wood.note(B(13, 4), 0.45, 'F4', 0.32);
    bass(13, [[1, 'F1', 0.62], [3, 'C2'], [3.5, 'C2', 0.4, 0.25], [4, 'G1', 0.5]]);
    chick(13, [[4.5, F6, 0.32]]);
    shoe(13, { skip1: true, tamb4: true });
    // bar 14 Eb/F -> Gm7/Bb: bed over an F pedal (bass rings a half note on Bb); knocks C5 -> F4
    bass(14, [[1, 'F1'], [3, 'Bb1', 0.6, 0.8]], { vcMode: 'nopick' });
    chick(14, [[2, ['Bb3', 'Eb4'], 0.26], [4, Gm7Bb, 0.37]]);
    knocks(14, [[3.5, 'C5', 0.34, 0.1], [4.5, 'F4', 0.46, 0.06]]);
    shoe(14, { tamb4: true });
    // bar 15 F -> Gb: both tiles shuffled one 8th late (from 1&), 28 c sharp; the last tile lands on Gb4 (bII), choked
    // before the snap
    play(vlnL, 15, 1.5, tileA(0.54), { sharp: WINK_SHARP });
    play(vlaR, 15, 3.5, [[70, 0.5, 0.58], [67, 0.5, 0.5], [66, 1, 0.64, { decay: 0.35 }]], { sharp: WINK_SHARP, woodV: 0.75 });
    bass(15, [[1, 'F1', 0.6], [3, 'C2'], [4.5, 'Gb2', 0.54]]);
    chick(15, [[2, F6, 0.34], [4.5, Gb, 0.4]]);
    shoe(15, { ghostEnd: true, tamb4: true });
    // bar 16 F: the snap. Violas F4 IN TUNE (the tile is home) under a short glock F6; the whistle slides home from C6,
    // overshoots to E5 and settles on F5; the bass lands F2 then F1, the seam E1 -> F1; C7 on 4 (a longer chord)
    play(vlaR, 16, 1, [[65, 1, 0.42]], { sharp: 0 });
    glock.note(B(16, 1), 0.5, 'F6', 0.52, { damp: true });
    swoop(16, 2.25, 'C6:.5 E5:.25 F5:1', { vel: 0.4, fall: -30 });
    bass(16, [[1, 'F2', 0.62], [3, 'F1'], [4.5, 'E1', 0.54]]);
    chick(16, [[2, F, 0.3], [4, C7, 0.36, 0.3]]);
    shoe(16, { ghostEnd: true, tamb4: true });

    s.length(s.bar(BARS + 1));
  },
};
