// The "Kugel" band: tuba, accordion, pure-tone leads, jingles, kit, 808, mono synth bass, stabs, plucks, glass pad,
// trailer boom, impacts and risers. Registered into INSTRUMENTS (lib/instruments.mjs) when this module is imported
// (engine.mjs imports it), so they are used exactly like the orchestral instruments: s.part(bus, 'tuba', {...}).
//
// Same conventions as lib/instruments.mjs: one function (emit, note, rng) renders ONE note (or one legato chain, for the
// `chain` instruments) into scratch buffers and hands them to emit(layerKey, body, tSec, L, R, n); velocity changes the
// timbre (louder = brighter / brassier / harder), every stroke is a little different (round robin from the seeded rng),
// `pan` and `amp` work on every note, and nothing uses Math.random() or the clock.
//
// Three synthesis cores:
//   harmVoice  - a bank of harmonics of ONE time-varying fundamental (complex-rotation recursion, so the cost is ~6 flops
//                per harmonic per sample). Harmonic amplitudes are recomputed every 32 samples by the instrument (spectral
//                envelope, brightness, growl) and ramped in between; harmonics above 16.5 kHz fade out and nothing above
//                19 kHz is generated, so a glide never aliases. Used by tuba, leads, synth bass, brass/keys stabs, riser.
//   reedTable  - per-note band-limited single-cycle tables (inverse FFT) through a shared time-varying one-pole
//                low-pass (the bellows). Used by the accordion and the reed stab (10-15x cheaper than a harmonic bank).
//   modes      - exponentially decaying sine resonators (as in instruments.mjs). Used by jingles, plucks, glass pad, boom,
//                kit shells.
//
// Every instrument has its MEASURED reference target in a comment above it (scratchpad measurements of the Kugel cues,
// 2026-11-26; the numbers are what the reference shows, the render was then tuned to them).

import { SR, TAU, mtof, clamp, smoothstep, biquad, fft, NOISE, NOISE_MASK, NOISE_LEN, curveAt } from './dsp.mjs';
import { INSTRUMENTS, EXPR } from './instruments.mjs';
import { chord as chordOf, n as noteNum } from './theory.mjs';

// ---------------------------------------------------------------- small helpers

const SCR = [];
function buf(idx, n) {
  let a = SCR[idx];
  if (!a || a.length < n) a = SCR[idx] = new Float32Array(Math.max(1 << 16, 1 << Math.ceil(Math.log2(n))));
  const v = a.subarray(0, n);
  v.fill(0);
  return v;
}
const panGains = (pan) => {
  const a = ((clamp(pan, -1, 1) + 1) * Math.PI) / 4;
  return [Math.cos(a), Math.sin(a)];
};
const dbl = (d) => Math.pow(10, d / 20);
/** Smooth value noise from the shared table, about -1..1 (x in cells). */
const vn = (base, x) => {
  const i = Math.floor(x), f = x - i;
  const a = NOISE[(base + i) & NOISE_MASK], b = NOISE[(base + i + 1) & NOISE_MASK];
  return (a + (b - a) * f * f * (3 - 2 * f)) * 1.7;
};
const seedOf = (rng) => (rng() * NOISE_LEN) | 0;
const portaCurve = (u) => smoothstep(Math.pow(clamp(u, 0, 1), 1.2));
function exprPoints(e) {
  if (!e) return null;
  if (typeof e === 'string') {
    if (!EXPR[e]) throw new Error('unknown expr "' + e + '"');
    return e === 'flat' ? null : EXPR[e];
  }
  return e;
}

const FLOOR = 2e-6;
/** Decaying sine resonator (modal synthesis), same as instruments.mjs addPartial. */
function addMode(L, R, n, f, a, t60, gl, gr, off = 0, ph = 0) {
  if (f >= 19000 || f <= 0) return;
  const absA = a < 0 ? -a : a;
  if (absA <= FLOOR || off >= n) return;
  const r = Math.exp(-6.907755 / (Math.max(t60, 0.002) * SR));
  const w = (TAU * f) / SR;
  let m = n - off;
  const mm = Math.ceil(Math.log(FLOOR / absA) / Math.log(r));
  if (mm < m) m = mm;
  const c = 2 * r * Math.cos(w), r2 = r * r;
  let y1 = (a * Math.sin(ph - w)) / r, y2 = (a * Math.sin(ph - 2 * w)) / r2;
  const end = off + m;
  for (let i = off; i < end; i++) {
    const y = c * y1 - r2 * y2;
    y2 = y1; y1 = y;
    L[i] += y * gl; R[i] += y * gr;
  }
}
/** addMode that stops at -60 dB below its own start (for dense banks where the absolute floor is far too low). */
function addModeRel(L, R, n, f, a, t60, gl, gr, off, ph) {
  if (f >= 19000 || off >= n) return;
  const len = Math.min(n - off, Math.ceil(t60 * SR));
  addMode(L, R, off + len, f, a, t60, gl, gr, off, ph);
}
/** Band-limited noise burst with attack/decay (one-pole sections). */
function noiseBurst(L, R, n, rng, { off = 0, level = 0.02, lp = 8000, hp = 0, attack = 0.001, decay = 0.02, gl = 0.707, gr = 0.707, hold = 0 }) {
  off = Math.max(0, Math.round(off));
  const m = Math.min(n - off, Math.ceil((attack * 3 + hold + decay * 9) * SR));
  if (m <= 0) return;
  const a = Math.exp((-TAU * Math.min(lp, 18000)) / SR), ah = hp > 0 ? Math.exp((-TAU * hp) / SR) : 1;
  let l1 = 0, l2 = 0, h = 0, h2 = 0;
  let idx = (rng() * NOISE_LEN) | 0;
  const ka = Math.exp(-1 / (Math.max(attack, 1e-4) * SR)), kd = Math.exp(-1 / (decay * SR));
  let ea = 1, ed = 1;
  const holdN = Math.round(hold * SR);
  const norm = level * Math.sqrt(SR / (2 * Math.min(lp, 18000))) * 0.9;
  for (let i = 0; i < m; i++) {
    const w = NOISE[idx++ & NOISE_MASK];
    l1 = w + a * (l1 - w); l2 = l1 + a * (l2 - l1);
    let y = l2;
    if (hp > 0) { h = y + ah * (h - y); y -= h; h2 = y + ah * (h2 - y); y -= h2; }
    ea *= ka; if (i >= holdN) ed *= kd;
    y *= (1 - ea) * ed * norm;
    L[off + i] += y * gl; R[off + i] += y * gr;
  }
}
function fadeEnd(L, R, n, len) {
  const m = Math.min(n, Math.round(len));
  for (let i = 0; i < m; i++) { const u = i / m, g = u * u * (3 - 2 * u); L[n - 1 - i] *= g; R[n - 1 - i] *= g; }
}
function fadeIn(L, R, n, len, off = 0) {
  const m = Math.min(n - off, Math.max(2, Math.round(len)));
  for (let i = 0; i < m; i++) { const g = 0.5 - 0.5 * Math.cos((Math.PI * i) / m); L[off + i] *= g; R[off + i] *= g; }
}
function dampFrom(L, R, n, from, tau) {
  const k = Math.exp(-1 / (tau * SR));
  let g = 1;
  for (let i = Math.max(0, from); i < n; i++) { g *= k; L[i] *= g; R[i] *= g; }
}
/** Run a biquad over [s, e) of one channel (direct form II transposed). */
function bq(c, x, s = 0, e = x.length) {
  let z1 = 0, z2 = 0;
  for (let i = s; i < e; i++) { const v = x[i]; const y = c.b0 * v + z1; z1 = c.b1 * v - c.a1 * y + z2; z2 = c.b2 * v - c.a2 * y; x[i] = y; }
}

// ---------------------------------------------------------------- harmonic bank core

const CB = 32;
const HB = { a0: new Float32Array(512), a1: new Float32Array(512), cur: new Float32Array(512), da: new Float32Array(512) };
function nyq(a, K, f) {
  for (let k = 0; k < K; k++) {
    const fk = (k + 1) * f;
    if (fk >= 19000) { for (let q = k; q < K; q++) a[q] = 0; return; }
    if (fk > 16500) a[k] *= (19000 - fk) / 2500;
  }
}
/**
 * Harmonic voice. ctl(t, amps) is called every 32 samples (t = seconds from `off`): it fills amps[0..K-1] (linear
 * amplitude of harmonics 1..K) and returns the fundamental in Hz. Writes m samples into L/R from `off`. Returns the phase.
 */
function harmVoice(L, R, off, m, K, ctl, gl, gr, ph0 = 0) {
  K = Math.max(1, Math.min(K, 512));
  const { a0, a1, cur, da } = HB;
  // ctl may report how many harmonics it wrote (HB.cnt); everything above is zero
  HB.cnt = K;
  let f = ctl(0, a0);
  let c0 = Math.min(K, HB.cnt);
  let ph = ph0;
  for (let b = 0; b < m; b += CB) {
    const e = Math.min(m, b + CB), len = e - b;
    HB.cnt = K;
    const fT = ctl(e / SR, a1);
    const c1 = Math.min(K, HB.cnt);
    for (let k = c1; k < c0; k++) a1[k] = 0;
    for (let k = c0; k < c1; k++) a0[k] = 0;
    const cm = Math.max(c0, c1);
    const fMax = Math.max(f, fT);
    nyq(a0, cm, fMax); nyq(a1, cm, fMax);
    let top = 0;
    for (let k = 0; k < cm; k++) { cur[k] = a0[k]; da[k] = (a1[k] - a0[k]) / len; if (a0[k] !== 0 || a1[k] !== 0) top = k + 1; }
    let inc = (TAU * f) / SR;
    const dI = ((TAU * fT) / SR - inc) / len;
    for (let i = b; i < e; i++) {
      const c = Math.cos(ph), s = Math.sin(ph);
      let ck = c, sk = s, y = 0;
      for (let k = 0; k < top; k++) {
        y += cur[k] * sk; cur[k] += da[k];
        const nc = ck * c - sk * s; sk = sk * c + ck * s; ck = nc;
      }
      const j = off + i;
      L[j] += y * gl; R[j] += y * gr;
      ph += inc; inc += dI;
      if (ph >= TAU) ph -= TAU;
    }
    for (let k = 0; k < c1; k++) a0[k] = a1[k];
    c0 = c1;
    f = fT;
  }
  return ph;
}

/** Segments of a note or of a legato chain (engine `_segs`, times relative to the chain start). */
function segsOf(nt) {
  return nt._segs || [{ t: 0, dur: Math.max(nt.dur, 0.02), midi: nt.midi, vel: nt.vel, expr: nt.expr, bright: nt.bright, amp: nt.amp, glideTime: nt.glideTime }];
}
/** Written pitch along a chain with portamento centred on each joint. gDef = default glide time (s). */
function chainMidi(segs, t, gDef, st) {
  let j = st.j || 0;
  while (j + 1 < segs.length && t >= segs[j + 1].t) j++;
  st.j = j;
  const glideOf = (q) => Math.max(0.004, Math.min(segs[q].glideTime ?? gDef, 0.8 * segs[q - 1].dur, 0.8 * segs[q].dur));
  let m = segs[j].midi;
  if (j > 0) {
    const g = glideOf(j), u = (t - (segs[j].t - 0.5 * g)) / g;
    if (u < 1) m = segs[j - 1].midi + (segs[j].midi - segs[j - 1].midi) * portaCurve(u);
  }
  if (j + 1 < segs.length) {
    const g = glideOf(j + 1), u = (t - (segs[j + 1].t - 0.5 * g)) / g;
    if (u > 0) m = segs[j].midi + (segs[j + 1].midi - segs[j].midi) * portaCurve(u);
  }
  return m;
}
const chainEnd = (segs) => segs[segs.length - 1].t + segs[segs.length - 1].dur;

// ================================================================= 1. TUBA
//
// Reference (measured): Schlep solo tuba 2.6-14.7 s (17 notes G1-G2) and Shidduch section A 2.5-9 s (12 notes Ab1-C#2):
//   attack (body-20 -> body-1 dB) 10-35 ms, median 15 ms; accent 2-4.5 dB above the body (median 3.5)
//   body (above body-6 dB) 0.21-0.33 s for staccato quarters, up to 0.45 s; flat, no decay inside the body
//   stop: body-6 -> body-26 dB in 110-240 ms (90-180 dB/s, median ~120 dB/s)
//   harmonics re h1, G1-C2 at mf-f: h2 -7..+2 (median 0), h3 -2..-16, h4 -2..-24, h5 -8..-45, h6 -8..-33, h7 -6..-50,
//     h8 -16..-38. Schlep (f) is brighter than Shidduch (mf, h5 -22..-47): the upper harmonics are the velocity axis.
//   dip near 290 Hz (G1 h6, F#2/G2 h3 sit 6-10 dB under their neighbours), formant 450-500 Hz (G2 h5 -8)
//   lip scoop: h2 starts -30..-60 cents low and settles in 25-50 ms (many notes), pitch steady after that (+-10 c)
//   stereo: mono (side/mid -41 dB below 150 Hz, -29 dB at 150-1000 Hz)
//
// Synthesis: harmonic bank; spectral envelope 1/(1+(f/fc)^p) x formant(470 Hz); fc and the slope p follow the dynamic,
// so a loud note gets brassy (p 3.1 -> 1.7) and a growl (random flutter of h3+ and a pitch jitter) above vel ~0.6.
// Legato (play(..., { legato: true })): touching notes are slurred (lip glide 40-70 ms, a small re-tongue accent).

const TUBA_BODY = { series: [{ type: 'highpass', f: 24, q: 0.707 }, { type: 'peak', f: 290, gain: -6, q: 2.5 }, { type: 'peak', f: 2600, gain: -3, q: 0.8 }, { type: 'lowpass', f: 9000, q: 0.707 }] };
const TUBA_TUNE = { amp: 0.33 };

function tubaSpectrumAt(f0, fc, p, K, out, gain, growl, gseed, t) {
  let e = 0, k = 1;
  for (; k <= K; k++) {
    const fk = k * f0;
    const x = Math.log2(fk / 470) / 0.5;
    let a = (1 / (1 + Math.pow(fk / fc, p))) * (1 + 0.5 * Math.exp(-0.5 * x * x));
    // Schlep: h1-h3 hold within 0.2-0.4 dB, h4+ flicker 1-5 dB (10 ms frames): the growl lives in the upper partials
    if (growl > 0 && k >= 4) a *= 1 + growl * 0.6 * Math.min(1, (k - 3) / 4) * vn(gseed + k * 31, t * 38);
    // -60 dB re h1: inaudible; past the formant the envelope only falls, so the bank stops here
    if (a < 1e-3) { if (fk > 700) break; a = 0; }
    out[k - 1] = a * gain;
    e += a * a;
  }
  HB.cnt = k - 1;
  return e;
}

function tuba(emit, nt, rng) {
  const segs = segsOf(nt);
  const D = chainEnd(segs);
  const legatoChain = segs.length > 1;
  const stop = nt.release ?? 0.075;                     // exponential time constant of the stop (s)
  const total = D + stop * 6.5 + 0.01;               // -56 dB, then a short fade
  const n = Math.ceil(total * SR) + 1;
  const L = buf(0, n), R = buf(1, n);
  const [gl, gr] = panGains(nt.pan ?? 0);
  const bright = nt.bright ?? 1;
  const growlAmt = nt.growl ?? 1;
  // round robin: lip scoop depth/time, accent, attack time, brightness differ on every note
  const rrScoop = (nt.scoop ?? -0.45) * 100 * (0.55 + 0.8 * rng());   // semitones -> cents
  const rrScoopT = (nt.scoopTime ?? 0.04) * (0.75 + 0.5 * rng());
  const rrAcc = 0.75 + 0.5 * rng(), rrBr = 1 + (rng() - 0.5) * 0.12, rrAtk = 0.85 + 0.3 * rng();
  const ps = seedOf(rng), gseed = seedOf(rng);
  const v0 = clamp(segs[0].vel, 0.02, 1);
  const f00 = mtof(segs[0].midi);
  const K = Math.min(400, Math.floor(19000 / (f00 * 0.9)));
  // fitted: vel 0.6 ~ Shidduch (fc ~145 Hz, slope p ~4.1), vel 0.8 ~ Schlep (fc ~170, p ~3), vel 1 brassy (fc ~215, p ~2.3)
  const fcOf = (v, f0) => 70 * Math.pow(2, 1.6 * v) * Math.pow(f0 / 49, 0.4) * bright * rrBr;
  const pOf = (v) => 4.3 - 2.0 * smoothstep((v - 0.5) / 0.5);
  // loudness normalisation from the body spectrum of the first note (brightness then changes the level naturally)
  const tmp = new Float32Array(K);
  const e0 = tubaSpectrumAt(f00, fcOf(v0, f00), pOf(v0), K, tmp, 1, 0, 0, 0);
  const norm = 1 / Math.sqrt(Math.max(e0, 1e-9));
  const level = TUBA_TUNE.amp * (nt.amp ?? 1) * norm;
  const atk0 = (nt.attack ?? 0.026 - 0.014 * v0) * rrAtk;   // 12-26 ms
  const accent = (nt.accent ?? 0.38) * rrAcc;                 // +2.8 dB at the default
  const st = { j: 0 };
  let vS = v0, aS = segs[0].amp ?? 1;
  const kS = 1 - Math.exp(-CB / (0.025 * SR));
  const exprs = segs.map((s) => exprPoints(s.expr));
  const envTrack = new Float32Array(Math.ceil(n / CB) + 2);
  harmVoice(L, R, 0, n, K, (t, amps) => {
    const midi = chainMidi(segs, t, nt.glide ?? 0.055, st);
    const j = st.j, sg = segs[j];
    const ex = exprs[j] ? curveAt(exprs[j], clamp((t - sg.t) / sg.dur, 0, 1)) : 1;
    vS += (clamp(sg.vel, 0.02, 1) * ex - vS) * kS; aS += ((sg.amp ?? 1) - aS) * kS;
    // pitch: lip scoop into the first note, slow intonation drift, growl jitter when loud
    let c = 0;
    if (t < rrScoopT * 2) { const u = clamp(t / rrScoopT, 0, 1); c += rrScoop * (1 - u) * (1 - u); }
    c += 3 * (nt.drift ?? 1) * vn(ps, t * 1.7);
    const growl = growlAmt * smoothstep((vS - 0.55) / 0.4);
    if (growl > 0) c += growl * 4 * vn(ps + 999, t * 45);
    const f0 = mtof(midi + c / 100);
    // envelope: attack, accent (re-tongued a little on every slurred note), flat body, stop
    let g = t < atk0 ? smoothstep(t / atk0) : 1;
    let acc = t >= atk0 * 0.6 ? accent * Math.exp(-(t - atk0 * 0.6) / 0.07) : accent;
    if (legatoChain && j > 0) { const ts = t - sg.t; if (ts >= 0) acc += 0.12 * Math.exp(-ts / 0.05); }
    g *= 1 + acc;
    if (t > D) g *= Math.exp(-(t - D) / stop);
    const dyn = Math.pow(vS, 1.4);
    const fc = fcOf(vS, f0) * (1 + 0.8 * acc);
    tubaSpectrumAt(f0, fc, pOf(vS) - 0.4 * acc, K, amps, g * dyn * level * aS, growl, gseed, t);
    const bi = Math.round((t * SR) / CB);
    if (bi < envTrack.length) envTrack[bi] = g * dyn * aS * (0.5 + vS);
    return f0;
  }, gl, gr, rng() * TAU);
  // lip buzz / air between the harmonics (about -35 dB re the tone, 300-2500 Hz), following the envelope
  const air = 0.012 * (nt.noise ?? 1) * TUBA_TUNE.amp * (nt.amp ?? 1);
  if (air > 0) {
    const c = biquad('bandpass', 1000, 0.5);
    let z1 = 0, z2 = 0, idx = (rng() * NOISE_LEN) | 0;
    for (let i = 0; i < n; i++) {
      const w = NOISE[idx++ & NOISE_MASK];
      const y = c.b0 * w + z1; z1 = c.b1 * w - c.a1 * y + z2; z2 = c.b2 * w - c.a2 * y;
      const bf = i / CB, b0 = bf | 0, fr = bf - b0;
      const e = envTrack[b0] + fr * ((envTrack[b0 + 1] ?? 0) - envTrack[b0]);
      const v = y * e * air;
      L[i] += v * gl; R[i] += v * gr;
    }
  }
  fadeEnd(L, R, n, 0.004 * SR);
  emit('tuba', TUBA_BODY, nt.t, L, R, n);
}

// ================================================================= 2. ACCORDION
//
// Reference (measured): Shkoyach chorus G5 line 26.0-27.6 s: h2 -7, h3 -15, h4 -26, h5 -24, h6 -18, h7 -24, h8 -38
//   (the deep h4/h8 = a reed with an open time of about 1/4 of the period); pitch G5 +13 c, dead straight (+-8 c slow
//   drift, no vibrato); main peak pair at -9 / 0 c with weaker -16 / +4 c: musette spread about 9-16 cents;
//   beating 2.7-4 Hz (35 % AM). Clown G2 drone 8-12 s (octave-coupled reeds): h2 -9, h3 -14, h4 -12, h5 -30, h6 -21,
//   h7 -23, h8 -21; h1 split into peaks at -17 / +4 / +13 c (3 reeds); in the side channel (side/mid -8 dB at
//   150-1000 Hz). Antwerp coda G2 drone: buzzy (h2/h3 above h1).
//
// Synthesis: 1-3 free reeds per note (centre, +musette, -musette cents), each a band-limited wavetable with a pulse-like
// reed spectrum (open fraction 0.21 bass .. 0.27 treble, +- round robin), all through one bellows-pressure one-pole
// low-pass (the fitted ~6 dB/octave slope); optional 16' (octave below) and
// 4' (octave above) reeds. The reeds are panned apart a little, so the musette beating is also a slow stereo movement.
// `expr` is the bellows. `chop: true` = a short dry stab (fast speak, quick choke), for off-beat "pah" chords.

const ACC_BODY = { series: [{ type: 'highpass', f: 60, q: 0.707 }, { type: 'peak', f: 1150, gain: 2, q: 1 }, { type: 'peak', f: 3200, gain: -2, q: 1 }, { type: 'lowpass', f: 8500, q: 0.707 }] };
const ACC_TUNE = { amp: 0.15 };

/**
 * Band-limited single-cycle reed table (no aliasing up to the given pitch + 1 semitone): |sin(pi k duty)| / k, i.e. a pulse
 * whose open fraction is `duty`, every harmonic below 19 kHz (faded from 16.5 kHz). Returns { tab, e } with the energy
 * of the spectrum after a one-pole low-pass at fcRef (used to normalise the level).
 */
const RTS = 4096;
function reedTable(f0, duty, fcRef) {
  const re = new Float64Array(RTS), im = new Float64Array(RTS);
  const fTop = f0 * Math.pow(2, 1 / 12);
  const K = Math.min(RTS / 2 - 1, Math.floor(19000 / fTop));
  let e = 0;
  for (let k = 1; k <= K; k++) {
    const fk = k * fTop;
    let a = Math.abs(Math.sin(Math.PI * k * duty)) / k;
    if (fk > 16500) a *= (19000 - fk) / 2500;
    im[k] = (-a * RTS) / 2; im[RTS - k] = (a * RTS) / 2;
    const x = (k * f0) / fcRef;
    e += (a * a) / (1 + x * x) / 2;
  }
  fft(re, im, true);
  const tab = new Float32Array(RTS + 1);
  for (let i = 0; i < RTS; i++) tab[i] = re[i];
  tab[RTS] = tab[0];
  return { tab, e };
}

function accordionCore(emit, nt, rng, layer, chopDefault = false) {
  const chop = nt.chop ?? chopDefault;
  const dur = Math.max(nt.dur, 0.02);
  const vel = clamp(nt.vel, 0.02, 1);
  const attack = nt.attack ?? (chop ? 0.006 : 0.05 - 0.025 * vel);
  const release = nt.release ?? (chop ? 0.035 : 0.075);
  const total = dur + release * 1.2 + 0.005;
  const n = Math.ceil(total * SR) + 1;
  const L = buf(0, n), R = buf(1, n);
  const mus = nt.musette ?? 10;
  const nReeds = clamp(Math.round(nt.reeds ?? 3), 1, 3);
  const spread = nt.spread ?? 1;
  const pan = nt.pan ?? 0;
  const reeds = [{ c: 0, g: 1, p: 0 }];
  // side (musette) reeds: Shkoyach / Clown show them 17-22 dB under the main reed (AM ~35 %, sd ~2 dB); wet 0.25 = that.
  // wet 0.5-0.7 = a full 'wet' musette (deep wah-wah).
  const wet = clamp(nt.wet ?? 0.25, 0, 1);
  if (nReeds >= 2) reeds.push({ c: mus * (0.9 + 0.2 * rng()), g: wet * (0.85 + 0.3 * rng()), p: 0.45 });
  if (nReeds >= 3) reeds.push({ c: -mus * (0.9 + 0.2 * rng()), g: wet * (0.85 + 0.3 * rng()), p: -0.45 });
  if ((nt.octave ?? 0) > 0) reeds.push({ c: -1200 + (rng() - 0.5) * 6, g: nt.octave, p: 0.1 });
  if ((nt.high ?? 0) > 0) reeds.push({ c: 1200 + (rng() - 0.5) * 6, g: nt.high * 0.8, p: -0.1 });
  const ex = exprPoints(nt.expr);
  const bright = (nt.bright ?? 1) * (chop ? 1.2 : 1);
  const ds = seedOf(rng), bs = seedOf(rng);
  let gsum = 0; for (const r of reeds) gsum += r.g * r.g;
  const level = (ACC_TUNE.amp * (nt.amp ?? 1)) / Math.sqrt(gsum);
  const f0w = mtof(nt.midi);
  // bellows low-pass (one pole = the fitted ~6 dB/octave slope), shared by all reeds; follows the pressure
  const fcOf = (dyn) => 390 * Math.pow(2, 1.7 * dyn) * (f0w / 392) * bright;
  const fcRef = fcOf(vel);
  for (const r of reeds) {
    const f0n = mtof(nt.midi + r.c / 100);
    // reed open fraction: bass reeds ~0.21 (weak h5), treble ~0.25 (deep h4/h8, h7 kept: Shkoyach G5), +- round robin
    const duty = 0.21 + 0.04 * clamp((nt.midi + r.c / 100 - 43) / 36, 0, 1) + (rng() - 0.5) * 0.03;
    const { tab, e } = reedTable(f0n, duty, fcRef * Math.pow(2, r.c / 1200));
    const g0 = (r.g / Math.sqrt(e)) * level;
    const rs = seedOf(rng);
    const [gl, gr] = panGains(pan + r.p * spread);
    let ph = rng(), inc = 0;
    for (let b = 0; b < n; b += CB) {
      const e2 = Math.min(n, b + CB), t = e2 / SR;
      const c = r.c + (nt.drift ?? 1) * (3 * vn(ds, t * 0.25) + 0.8 * vn(rs, t * 1.1));
      const incT = mtof(nt.midi + c / 100) / SR;
      if (b === 0) inc = incT;
      const dI = (incT - inc) / (e2 - b);
      for (let i = b; i < e2; i++) {
        const pos = ph * RTS, k = pos | 0, fr = pos - k;
        const y = (tab[k] + fr * (tab[k + 1] - tab[k])) * g0;
        L[i] += y * gl; R[i] += y * gr;
        ph += inc; inc += dI;
        if (ph >= 1) ph -= 1;
      }
    }
  }
  // envelope (attack, bellows, release) and the bellows low-pass; the reed speaks dark and opens up in its attack
  let zl = 0, zr = 0, g = 0, kk = 0;
  for (let b = 0; b < n; b += CB) {
    const e2 = Math.min(n, b + CB), t = e2 / SR;
    const u = clamp(t / dur, 0, 1);
    // chop: a bellows punch that chokes (Schvitz A stabs: ~8 dB down 0.12 s after the peak)
    const press = (ex ? curveAt(ex, u) : 1) * (1 + 0.015 * vn(bs, t * 0.7)) * (chop ? 0.45 + 0.55 * Math.exp(-t / 0.06) : 1);
    const dyn = clamp(vel * press, 0.01, 1.2);
    let gT = t < attack ? smoothstep(t / attack) : 1;
    if (t > dur) { const q = 1 - (t - dur) / release; gT *= q > 0 ? q * q : 0; }
    gT *= Math.pow(dyn, 1.3);
    // a held reed speaks dark and opens up; a chop is a bright hit that darkens as the bellows choke
    const speak = chop ? 1 + 1.4 * Math.exp(-t / 0.03) : t < attack * 2 ? 0.55 + 0.45 * smoothstep(t / (attack * 2)) : 1;
    const kT = 1 - Math.exp((-TAU * Math.min(16000, fcOf(dyn) * speak)) / SR);
    if (b === 0) { g = 0; kk = kT; }
    const dg = (gT - g) / (e2 - b);
    kk = kT;
    for (let i = b; i < e2; i++) {
      zl += kk * (L[i] - zl); zr += kk * (R[i] - zr);
      L[i] = zl * g; R[i] = zr * g;
      g += dg;
    }
  }
  fadeEnd(L, R, n, 0.003 * SR);
  emit(layer, ACC_BODY, nt.t, L, R, n);
}
const accordion = (e, nt, r) => accordionCore(e, nt, r, 'accordion', false);

/**
 * Accordion left-hand / close voicing helper. Returns { bass, chord } midi numbers: the root (or `bassNote`) placed in
 * the Stradella bass window E2-D#3 and the chord tones in close position inside F#3-F4 (the "pah").
 * accordionVoicing('F#m') -> { bass: 42, chord: [54, 57, 61] }.  opts: { bassLow: 40, chordLow: 54, bassNote }
 */
export function accordionVoicing(sym, opts = {}) {
  const tones = chordOf(sym, 4);
  const bl = opts.bassLow ?? 40, cl = opts.chordLow ?? 54;
  const into = (m, lo) => { let x = ((m % 12) + 12) % 12; while (x < lo) x += 12; return x; };
  const bassPc = opts.bassNote != null ? noteNum(opts.bassNote) : tones[0];
  const chord = [...new Set(tones.map((m) => into(m, cl)))].sort((a, b) => a - b);
  return { bass: into(bassPc, bl), chord };
}

// ================================================================= 3. PURE-TONE LEADS
//
// whistleLead. Reference (measured): Goodbye whistle 31.5-39 s (G6 / F#6 / Ab6): h2 -30, h3 -29, h4 -32 (dB re h1;
//   the published analysis gives h2 -30..-40, h3 -35..-50 elsewhere in the cue); first entry fades in over ~0.3 s;
//   enters 5-15 c low and rises to +25..+40 c over 0.4-0.5 s (scoop + sharp); held note wobbles irregularly
//   (sd ~11 c, 1-1.5 Hz drift); steps glide over 0.25-0.35 s; a note can sag 30 c inside itself; no periodic vibrato;
//   sits 20-50 c sharp of the band.
// thereminLead. Reference (measured): Schvitz section C lead 60.0-62.6 s (hard left): vibrato period 0.13-0.14 s
//   (7.0-7.6 Hz), +-30-37 c from the first note (no fade-in), centred near pitch (mean +3 c); 8th-note steps (0.25 s)
//   with fast slides (20-40 ms); h2 -31..-39, h3 -33..-41, h4 -30..-40 (L channel, 2026-11-26 audit)
//   (Rabbi Nuchem coda saw/theremin: h2 -32, h3 -46, 7 Hz wide vibrato; Antwerp: 5-6 Hz +-30 c, slow portamento).
//
// Both are `chain` instruments: with play(..., { legato: true }) touching notes glide into each other (portamento).
// Every phrase (chain) scoops in from below, ends with a fall-off, drifts slowly and sits `sharp` cents high.

const LEAD_BODY = { series: [{ type: 'highpass', f: 160, q: 0.707 }, { type: 'lowpass', f: 13000, q: 0.707 }] };
const LEAD_TUNE = { whistle: 0.239, theremin: 0.256 };
const LEADS = {
  whistle: { harm: [0, -33, -37, -42, -46], harmVel: 8, glide: 0.2, scoop: -0.55, scoopTime: 0.1, fall: -35, fallTime: 0.13, drift: 6,
    driftRate: 1.25, vib: 0, vibRate: 5.5, vibDelay: 0.12, vibRamp: 0.25, sharp: 25, sharpStart: -5, creep: 12, jitter: 4, ajitter: 0.09, attack: 0.07, release: 0.09, breath: 1 },
  theremin: { harm: [0, -31, -36, -40, -47], harmVel: 6, glide: 0.035, scoop: -0.35, scoopTime: 0.08, fall: -25, fallTime: 0.12, drift: 5,
    driftRate: 0.7, vib: 34, vibRate: 7.1, vibDelay: 0, vibRamp: 0.1, sharp: 8, sharpStart: 8, creep: 0, jitter: 0, ajitter: 0, attack: 0.05, release: 0.12, breath: 0 },
};

function pureLead(emit, nt, rng, kind) {
  const P = LEADS[kind];
  const segs = segsOf(nt);
  const D = chainEnd(segs);
  const release = nt.release ?? P.release;
  const n = Math.ceil((D + release * 2.5 + 0.01) * SR) + 1;
  const L = buf(0, n), R = buf(1, n);
  const [gl, gr] = panGains(nt.pan ?? 0);
  const sharp = nt.sharp ?? P.sharp;
  // whistle: starts near pitch (sharpStart), warms up to `sharp` by ~1 s, then creeps `creep` cents more over 1.2 s
  // (Goodbye: -5 c for 0.5 s, +30 at 0.8-1 s, +38..+47 at 1.5-2 s)
  const sharp0 = nt.sharpStart ?? (P.sharpStart === P.sharp ? sharp : P.sharpStart), creep = nt.creep ?? P.creep;
  const jit = P.jitter * (nt.jitter ?? 1), ajit = P.ajitter * (nt.jitter ?? 1);
  const scoop = (nt.scoop ?? P.scoop) * 100 * (0.75 + 0.5 * rng());
  const scoopT = (nt.scoopTime ?? P.scoopTime) * (0.8 + 0.4 * rng());
  const fall = (nt.fall ?? P.fall) * (0.75 + 0.5 * rng());
  const fallT = nt.fallTime ?? P.fallTime;
  // theremin: vibrato 1 = +-30 c (default on); whistle: off by default, vibrato 1 = +-20 c
  const vibD = kind === 'theremin' ? P.vib * (nt.vibrato ?? 1) : 20 * (nt.vibrato ?? 0);
  const vibR = (nt.vibRate ?? P.vibRate) * (0.95 + 0.1 * rng());
  const vibDelay = nt.vibDelay ?? P.vibDelay;
  const drift = (nt.drift ?? 1) * P.drift;
  const attack = nt.attack ?? P.attack;
  const ds = seedOf(rng), ds2 = seedOf(rng), vs = seedOf(rng), bs = seedOf(rng);
  const level = LEAD_TUNE[kind] * (nt.amp ?? 1);
  const K = P.harm.length;
  const st = { j: 0 };
  let vS = clamp(segs[0].vel, 0.02, 1);
  const kS = 1 - Math.exp(-CB / (0.04 * SR));
  let vph = rng() * TAU, lastT = 0;
  const exprs = segs.map((s) => exprPoints(s.expr));
  // breath noise follows the tone (computed per block below, filtered per block)
  const breath = (nt.noise ?? 1) * P.breath;
  const bc = { f: 0, c: null, z: [0, 0], idx: (rng() * NOISE_LEN) | 0 };
  const fTrack = new Float32Array(Math.ceil(n / CB) + 2), gTrack = new Float32Array(Math.ceil(n / CB) + 2);
  harmVoice(L, R, 0, n, K, (t, amps) => {
    const m0 = chainMidi(segs, t, nt.glide ?? P.glide, st);
    const j = st.j, sg = segs[j];
    const ex = exprs[j] ? curveAt(exprs[j], clamp((t - sg.t) / sg.dur, 0, 1)) : 1;
    vS += (clamp(sg.vel, 0.02, 1) * ex - vS) * kS;
    let c = sharp0 + (sharp - sharp0) * smoothstep((t - 0.35) / 0.6) + creep * clamp((t - 0.95) / 1.2, 0, 1);
    c += drift * (0.75 * vn(ds, t * P.driftRate) + 0.35 * vn(ds2, t * P.driftRate * 3.1));
    // turbulence: fast pitch / level jitter widens the line (Goodbye: skirt at +-30-60 Hz only ~26 dB under the peak bin)
    if (jit > 0) c += jit * vn(ds2 + 4242, t * 31);
    if (t < scoopT) { const u = t / scoopT; c += scoop * (1 - u) * (1 - u); }
    if (t > D - fallT) c += fall * smoothstep((t - (D - fallT)) / fallT);
    if (vibD > 0) {
      vph += TAU * vibR * (1 + 0.07 * vn(vs, t * 1.3)) * (t - lastT);
      const ramp = smoothstep((t - vibDelay) / P.vibRamp);
      c += vibD * ramp * (1 + 0.25 * vn(vs + 5000, t * 1.7)) * Math.sin(vph);
    }
    lastT = t;
    const f0 = mtof(m0 + c / 100);
    let g = t < attack ? smoothstep(t / attack) : 1;
    if (t > D) { const q = 1 - (t - D) / release; g *= q > 0 ? q * q : 0; }
    if (P.breath) g *= 1 + 0.02 * vn(bs, t * 6) + ajit * vn(bs + 777, t * 27);
    const lev = g * Math.pow(vS, 1.4) * level;
    for (let k = 0; k < K; k++) amps[k] = k === 0 ? lev : lev * dbl(P.harm[k] + P.harmVel * (vS - 0.6) * Math.min(k, 2));
    const bi = Math.round((t * SR) / CB);
    if (bi < fTrack.length) { fTrack[bi] = f0; gTrack[bi] = lev; }
    return f0;
  }, gl, gr, rng() * TAU);
  if (breath > 0) {
    // the air: a narrow band of noise around the tone (-24 dB) + a faint high hiss (-44 dB) + a chiff at the start
    let z1 = 0, z2 = 0, h1 = 0, h2 = 0;
    const hc = biquad('highpass', 5000, 0.7);
    let idx = bc.idx;
    for (let b = 0; b * CB < n; b++) {
      const f = fTrack[b] || fTrack[b - 1] || mtof(segs[0].midi);
      const g = gTrack[b];
      const c = biquad('bandpass', f, 7);
      const t = (b * CB) / SR;
      const chiff = 1 + 3 * Math.exp(-t / 0.04);
      const e = Math.min(n, (b + 1) * CB);
      for (let i = b * CB; i < e; i++) {
        const w = NOISE[idx++ & NOISE_MASK];
        const y = c.b0 * w + z1; z1 = c.b1 * w - c.a1 * y + z2; z2 = c.b2 * w - c.a2 * y;
        const hh = hc.b0 * w + h1; h1 = hc.b1 * w - hc.a1 * hh + h2; h2 = hc.b2 * w - hc.a2 * hh;
        const s = (y * 0.5 * chiff + hh * 0.006 * chiff) * g * breath;
        L[i] += s * gl; R[i] += s * gr;
      }
    }
  }
  fadeEnd(L, R, n, 0.004 * SR);
  emit('lead:' + kind, LEAD_BODY, nt.t, L, R, n);
}

// ================================================================= 4. JINGLES
//
// Reference (measured): Schlep intro jingle on every beat 2.5-9 s: inharmonic line clusters at 4.56-4.62 kHz,
//   6.71-6.94 kHz (8 lines within +-60 c: several jingles), 9.41 kHz, 10.96-11.29 kHz and ~12.5 kHz; attack (5-16 kHz
//   band) 5-10 ms; body (above -6 dB) 110-160 ms; then the lines ring: -6 -> -26 dB in 320-420 ms (~50 dB/s);
//   accent 3-5 dB above the body. Bombach / Kugel jingles: 5.6-7.1 kHz (+7..+13 dB), 9.9, 10.5-11.6 kHz.
//   Shkoyach riq intro 0-9 s: skin ~196 Hz on the beats, crack ~1.17 kHz on the off-beats, broadband to 12 kHz with a
//   smeared rattle (~0.1 s) and jingle lines ringing between hits (4.69, 5.57, 6.75, 7.67 kHz).
//   Shaker (Schlep from 15 s, shuffled 16ths, pairs 0.21 / 0.11 s): rise 15-28 ms, accent body 100-145 ms,
//   ghost 50 ms and 6-8 dB softer, 90-120 ms before the accent; broadband 1-18 kHz.
//
// Synthesis: each jingle pair = 8 inharmonic modes (clusters above), each hit = 3-5 collisions over 0-40 ms (the
// rattle) exciting random jingles, plus a high-passed noise transient and a short hiss; the riq/tambourine head is a
// damped membrane mode. Shaker = a cloud of short bead grains under a rise/decay envelope.

// cluster levels fitted to Schlep third-octaves (4.6 kHz within ~4 dB of 6.7 kHz; 10 kHz band ~1 dB under it)
const JINGLE_MODES = [[4590, 0.75, 0.8], [6720, 1, 1.0], [6860, 0.8, 0.95], [6930, 0.7, 0.85], [9410, 0.6, 0.8], [10960, 0.85, 0.8], [11280, 0.65, 0.7], [12500, 0.5, 0.6]];
let SIZZLE = 2.0;
const SLAP = { dum: 4, tek: 11, thump: 4 };
export const _setSlap = (d, t, th) => { SLAP.dum = d; SLAP.tek = t; if (th != null) SLAP.thump = th; };
export const _setSizzle = (v) => { SIZZLE = v; };
const JINGLE_BODY = { series: [{ type: 'highpass', f: 90, q: 0.707 }] };
const JINGLE_TUNE = { amp: 0.108, riq: 0.054, roll: 0.36, shaker: 22.3, zils: 0.071 };   // re-trimmed after the sizzle / slap (2026-11-26 audit)

function jingleHit(L, R, n, rng, off, vel, o) {
  const pairs = o.pairs ?? 5, ring = o.ring ?? 1, bright = o.bright ?? 1, fscale = o.fscale ?? 1;
  const hv = 0.35 + 0.75 * vel;
  // the rattle: 3-5 collisions over the first 10-50 ms; every jingle sounds from ONE of them (its own moment)
  const nCol = (o.collisions ?? 3) + Math.floor(rng() * 3);
  const cols = [];
  let tCol = 0;
  for (let ci = 0; ci < nCol; ci++) {
    cols.push({ t: tCol, a: (ci === 0 ? 1 : 0.55 * Math.pow(0.7, ci - 1)) * (0.7 + 0.6 * rng()) });
    tCol += (o.rattle ?? 0.011) * (0.5 + rng());
  }
  const [gl0, gr0] = panGains(o.pan ?? 0);
  for (let p = 0; p < pairs; p++) {
    const s = fscale * (1 + (rng() - 0.5) * (o.detune ?? 0.045));
    const [gl, gr] = panGains((o.pan ?? 0) + (rng() - 0.5) * 0.9 * (o.width ?? 1));
    const c = p === 0 ? cols[0] : cols[Math.floor(rng() * cols.length)];
    // stereo pair: each jingle reaches the two mics up to +-0.06 ms apart, so its lines arrive at partly unrelated phases
    // (Schlep: side/mid ~-2 dB above 5 kHz, while a panned mono source gives -8 dB at best)
    const dly = (rng() - 0.5) * 0.00012 * (o.width ?? 1);
    const o2 = off + Math.round(c.t * SR);
    // 8 shared clusters + 2 modes of its own (bent metal is never identical)
    const modes = JINGLE_MODES.concat([[3500 + 10000 * rng(), 0.12 + 0.2 * rng(), 0.25 + 0.4 * rng()], [3500 + 10000 * rng(), 0.12 + 0.2 * rng(), 0.25 + 0.4 * rng()]]);
    for (const [f, amp, t60] of modes) {
      const ff = f * s * (1 + (rng() - 0.5) * 0.006);
      const hiW = Math.pow(ff / 6800, 0.9 * (hv * bright - 0.8));
      const ma = (c.a * amp * hiW * (0.6 + 0.8 * rng()) * 1.3) / Math.sqrt(pairs), mt = t60 * ring * (0.8 + 0.4 * rng()), ph = rng() * TAU;
      addModeRel(L, R, n, ff, ma, mt, gl, 0, o2, ph);
      addModeRel(L, R, n, ff, ma, mt, 0, gr, o2, ph + TAU * ff * dly);
    }
  }
  // a click per collision, the contact transient and the rattle hiss
  for (const c of cols) noiseBurst(L, R, n, rng, { off: off + c.t * SR, level: 0.035 * hv * c.a, lp: 15000, hp: 4000 * bright, attack: 0.0004, decay: 0.0025, gl: gl0, gr: gr0 });
  noiseBurst(L, R, n, rng, { off, level: 0.05 * hv, lp: 16000, hp: 3000 * bright, attack: 0.0006, decay: 0.004, gl: gl0, gr: gr0 });
  noiseBurst(L, R, n, rng, { off, level: 0.03 * hv, lp: 14000, hp: 5000, attack: o.hissAttack ?? 0.003, decay: (o.hiss ?? 0.045), gl: gl0, gr: gr0 });
  // the sizzle: the jingles keep colliding for ~0.2-0.35 s after the hit. Schlep shows a dense broadband fizz between the
  // lines with visible micro-hits (2.5-18 kHz), as wide as the room (side/mid ~-2 dB above 5 kHz). Without it the
  // tambourine reads as a bank of clean sine lines.
  const sz = (o.sizzle ?? 1) * hv;
  if (sz > 0) {
    const len = (o.sizzleLen ?? 0.42) * (0.8 + 0.4 * rng());
    const G = Math.max(6, Math.round((70 * len) / 0.28));
    for (let g = 0; g < G; g++) {
      const u = rng(), tg = len * u * u;
      const a = sz * SIZZLE * Math.exp(-tg / (len * 0.22)) * (0.3 + rng());
      const [gl, gr] = panGains((o.pan ?? 0) + (rng() * 2 - 1) * 0.6 * (o.width ?? 1));
      noiseBurst(L, R, n, rng, { off: off + tg * SR, level: a, lp: 17500, hp: 2500 + 3000 * rng(), attack: 0.0003, decay: 0.0012 + 0.003 * rng(), gl, gr });
    }
  }
}

function jingleCore(emit, nt, rng, kind) {
  const vel = clamp(nt.vel, 0.02, 1);
  // riq: shorter ring (Shkoyach strokes fall -6 -> -26 dB in 90-140 ms) and a closer image than the tambourine (side/mid -7 dB > 5 kHz)
  const ring = nt.ring ?? (kind === 'riq' ? 0.45 : 1);
  const n = Math.ceil((1.3 * ring + 0.2) * SR);
  const L = buf(0, n), R = buf(1, n);
  const stroke = nt.stroke ?? (kind === 'riq' ? 'tek' : 'hit');
  const pan = nt.pan ?? 0;
  const amp = (kind === 'riq' ? JINGLE_TUNE.riq : JINGLE_TUNE.amp) * (nt.amp ?? 1) * Math.pow(vel, 1.3);
  const jv = stroke === 'dum' ? 0.45 : 1;
  const shake = stroke === 'shake';
  jingleHit(L, R, n, rng, shake ? Math.round(0.004 * SR) : 0, vel * jv, {
    pairs: kind === 'riq' ? 10 : 5, ring, bright: nt.bright ?? 1, fscale: kind === 'riq' ? 0.83 : 1, pan, width: nt.spread ?? (kind === 'riq' ? 0.8 : 1),
    detune: kind === 'riq' ? 0.11 : 0.045,   // many small riq jingles: a wash, not lines
    collisions: shake ? 4 : 3, rattle: shake ? 0.016 : 0.011, hissAttack: shake ? 0.008 : 0.003, hiss: shake ? 0.06 : 0.045,
  });
  const skin = nt.skin ?? (kind === 'riq' ? 1 : 0.35);
  if (skin > 0 && !shake) {
    const [gl, gr] = panGains(pan);
    const sv = 0.3 + 0.8 * vel;
    if (stroke === 'dum' || stroke === 'hit') {
      const f = nt.skinF ?? (kind === 'riq' ? 196 : 240);
      const lv = skin * (stroke === 'dum' ? 3.2 : 1.1) * sv;
      addMode(L, R, n, f * (1 + (rng() - 0.5) * 0.02), lv, 0.16, gl, gr, 0, 0);
      addMode(L, R, n, f * 1.59, lv * 0.45, 0.09, gl, gr, 0, 0);
      addMode(L, R, n, f * 2.14, lv * 0.25, 0.06, gl, gr, 0, 0);
      // the slap of the head: broadband, not a tone (Shkoyach dum: flat within ~7 dB from 80 Hz to 3 kHz)
      noiseBurst(L, R, n, rng, { level: SLAP.dum * lv, lp: 2600, hp: 70, attack: 0.0008, decay: 0.03 * (0.85 + 0.3 * rng()), gl, gr });
      noiseBurst(L, R, n, rng, { level: SLAP.thump * lv, lp: 380, hp: 55, attack: 0.001, decay: 0.05 * (0.85 + 0.3 * rng()), gl, gr });
    }
    if (stroke === 'tek' || stroke === 'hit') {
      const lv = skin * (stroke === 'tek' ? 1.4 : 0.6) * sv;
      addMode(L, R, n, 1170 * (1 + (rng() - 0.5) * 0.03), lv, 0.05, gl, gr, 0, 0);
      addMode(L, R, n, 1870 * (1 + (rng() - 0.5) * 0.03), lv * 0.5, 0.035, gl, gr, 0, 0);
      noiseBurst(L, R, n, rng, { level: 0.12 * lv, lp: 5000, hp: 700, attack: 0.0005, decay: 0.006, gl, gr });
      // the crack: a broadband slap of the fingers on the rim (Shkoyach tek: 1-5 kHz within ~5 dB of the jingles)
      noiseBurst(L, R, n, rng, { level: SLAP.tek * lv, lp: 9000, hp: 450, attack: 0.0005, decay: 0.022 * (0.85 + 0.3 * rng()), gl, gr });
      if (stroke === 'tek') noiseBurst(L, R, n, rng, { level: SLAP.thump * lv, lp: 380, hp: 55, attack: 0.001, decay: 0.04, gl, gr });
    }
  }
  for (let i = 0; i < n; i++) { L[i] *= amp; R[i] *= amp; }
  fadeIn(L, R, n, 0.0005 * SR);
  fadeEnd(L, R, n, 0.08 * SR);
  emit('jingles', JINGLE_BODY, nt.t, L, R, n);
}

/** Continuous jingle roll / shake for the written length: strokes at `rate` per second, level `from` -> `to` (x vel). */
function jingleRoll(emit, nt, rng) {
  const dur = Math.max(0.1, nt.dur), vel = clamp(nt.vel, 0.02, 1);
  const n = Math.ceil((dur + 1.2) * SR);
  const L = buf(0, n), R = buf(1, n);
  const rate = nt.rate ?? 14, from = nt.from ?? 0.45, to = nt.to ?? 1;
  const count = Math.max(2, Math.round(dur * rate));
  for (let i = 0; i < count; i++) {
    const u = i / (count - 1);
    const t = (i / rate) * (1 + (rng() - 0.5) * 0.12);
    const v = vel * (from + (to - from) * u) * (i % 2 ? 0.82 : 1);
    jingleHit(L, R, n, rng, Math.round(t * SR), v, { pairs: 4, ring: (nt.ring ?? 1) * 0.6, bright: nt.bright ?? 1, pan: (nt.pan ?? 0) + (i % 2 ? 0.08 : -0.08), width: nt.spread ?? 0.45, collisions: 3, rattle: 0.014, hiss: 0.05, hissAttack: 0.006, sizzleLen: 0.12 });
  }
  const amp = JINGLE_TUNE.amp * JINGLE_TUNE.roll * (nt.amp ?? 1) * Math.pow(vel, 0.3);
  for (let i = 0; i < n; i++) { L[i] *= amp; R[i] *= amp; }
  fadeIn(L, R, n, 0.002 * SR);
  fadeEnd(L, R, n, 0.1 * SR);
  emit('jingles', JINGLE_BODY, nt.t, L, R, n);
}

/** Finger cymbals (zils): two small cymbals, a few strong inharmonic modes, long ring. `damp: true` = closed clack. */
function fingerCymbals(emit, nt, rng) {
  const vel = clamp(nt.vel, 0.02, 1);
  const closed = !!nt.damp;
  const ring = (nt.ring ?? 1) * (closed ? 0.12 : 1);
  const n = Math.ceil((2.6 * ring + 0.1) * SR);
  const L = buf(0, n), R = buf(1, n);
  const base = (nt.midi >= 84 ? mtof(nt.midi) : 2650) * (1 + (rng() - 0.5) * 0.03);
  const modes = [[1, 1, 2.2], [1.53, 0.5, 1.6], [2.31, 0.55, 1.15], [2.7, 0.35, 0.9], [3.92, 0.25, 0.6], [5.1, 0.15, 0.45]];
  const hv = 0.4 + 0.8 * vel;
  for (let c = 0; c < 2; c++) {
    const s = c ? 1.012 + rng() * 0.01 : 1;
    const [gl, gr] = panGains((nt.pan ?? 0) + (c ? 0.2 : -0.2));
    for (const [r, a, t60] of modes) addMode(L, R, n, base * s * r, a * (r > 2 ? hv : 1) * (c ? 0.8 : 1), t60 * ring, gl, gr, 0, rng() * TAU);
  }
  const [gl, gr] = panGains(nt.pan ?? 0);
  noiseBurst(L, R, n, rng, { level: 0.25 * hv, lp: 15000, hp: 4000, attack: 0.0004, decay: 0.003, gl, gr });
  const amp = JINGLE_TUNE.zils * (nt.amp ?? 1) * Math.pow(vel, 1.3);
  for (let i = 0; i < n; i++) { L[i] *= amp; R[i] *= amp; }
  fadeEnd(L, R, n, 0.05 * SR);
  emit('jingles', JINGLE_BODY, nt.t, L, R, n);
}

/**
 * Shaker: a cloud of bead grains. Fitted (2026-11-26 audit) to the dry shuffle clicks of Clown section C (66-71 s, the
 * cleanest exposed shaker/hat in the score): rise ~12 ms, -19 dB at 50 ms and -30 dB at 100 ms after the peak, centroid
 * ~8 kHz (flat 4-12.5 kHz, -7 dB at 16 kHz), the top octave dying first (only the first ~20 ms reach 14-18 kHz), wide
 * (side/mid -3.6 dB above 5 kHz). Loud = a sharper rise and a longer tail; soft (ghost) = short and dull. decay > 1
 * gives the longer 'shhk' of a big egg / shekere.
 */
function shaker(emit, nt, rng) {
  const vel = clamp(nt.vel, 0.02, 1);
  const rise = nt.attack ?? 0.016 - 0.007 * vel;                     // 9-16 ms
  const tau = (nt.decay ?? 1) * (0.012 + 0.027 * vel * vel);          // 25 ms at vel 0.7 (Clown), 17 ms for a ghost
  const len = rise + tau * 7;                                        // ends ~-60 dB: no hard stop
  const n = Math.ceil((len + 0.03) * SR);
  const L = buf(0, n), R = buf(1, n);
  const pan = nt.pan ?? 0, width = nt.spread ?? 1;
  const bright = (nt.bright ?? 1) * (0.8 + 0.3 * vel);
  const grains = Math.round((rise + tau * 3) * 1500);
  for (let i = 0; i < grains; i++) {
    const t = len * rng();
    const env = t < rise ? smoothstep(t / rise) : Math.exp(-(t - rise) / tau);
    const a = env * (0.4 + 0.6 * rng());
    if (a < 1e-3) continue;
    // the beads' brightness: the first ~20 ms reach the top octave, then the band closes to ~7 kHz
    const lp = Math.min(17500, (5500 + 9000 * Math.exp(-t / 0.01)) * bright);
    const [gl, gr] = panGains(pan + (rng() * 2 - 1) * width);
    noiseBurst(L, R, n, rng, { off: t * SR, level: a * 0.06, lp, hp: 1000 + 2500 * rng(), attack: 0.0003, decay: 0.0012 + 0.002 * rng(), gl, gr });
  }
  const amp = JINGLE_TUNE.shaker * (nt.amp ?? 1) * Math.pow(vel, 1.1);
  for (let i = 0; i < n; i++) { L[i] *= amp; R[i] *= amp; }
  fadeEnd(L, R, n, 0.01 * SR);
  emit('shaker', JINGLE_BODY, nt.t, L, R, n);
}

/**
 * Shaker / hat groove with swing. Writes notes on `part` every `step` beats from `beat` for `beats` beats.
 * swing: where the off-step falls inside a pair of steps (0.5 straight, 0.58 light, 0.667 triplet; Schlep ~0.65).
 * accents: velocity multipliers cycling over the steps (default [1, 0.5]: accent on the beat-steps, ghost between).
 * Returns the end beat.
 */
export function swingGroove(part, beat, beats, opts = {}) {
  const { step = 0.25, swing = 0.58, vel = 0.6, accents = [1, 0.5], skip = null, ...rest } = opts;
  const count = Math.round(beats / step);
  for (let i = 0; i < count; i++) {
    if (skip && skip(i)) continue;
    const pair = Math.floor(i / 2), odd = i % 2;
    const b = beat + pair * 2 * step + (odd ? 2 * step * swing : 0);
    part.note(b, step * 0.9, null, clamp(vel * accents[i % accents.length], 0.01, 1), rest);
  }
  return beat + count * step;
}

// ================================================================= 5. KIT
//
// Reference (measured): Prelude breakdown 66-78 s: pitch-dropping kick sweeps ~150 Hz -> ~31 Hz in 0.15-0.2 s;
//   Prelude 808 onsets: a kick layer falling ~70 -> 33 Hz in ~0.1 s under the 808. Schvitz section A: four-on-the-floor
//   kick, attack 10-20 ms to the plateau in 30-120 Hz, ~0.15 s body. Schvitz intro clap (1.85-2.4 s, alone): a grace
//   clap 80 ms before the main one (flam) about 6 dB softer, each clap 2-3 bursts 5-15 ms apart, then a tail falling
//   -6 -> -26 dB in ~115 ms (~170 dB/s); body around 270-330 Hz, energy 1.1-1.7 kHz. Prelude A3: trap hats on 16ths,
//   jingle blips at ~7 and ~12 kHz. Snares (Rabbi Nuchem, Antwerp): bright, dry, layered with the off-beat stab.
//
// kick: tuned sine with an exponential pitch drop (`drop` semitones over `dropTime`), saturated a little so phones hear
// its 3rd harmonic, plus a click. dropKick: the same with a long, deep drop (trailer / breakdown kick).

const KIT_BODY = { series: [{ type: 'highpass', f: 25, q: 0.707 }] };
const KIT_TUNE = { kick: 1.2, snare: 1.42, clap: 2.97, hat: 4.8 };   // clap, hat re-trimmed (2026-11-26 audit)

function kickCore(emit, nt, rng, D) {
  const vel = clamp(nt.vel, 0.02, 1);
  const f0 = mtof(nt.midi + (nt.tune ?? 0) / 100);
  const decay = (nt.decay ?? 1) * D.t60;
  const n = Math.ceil((decay * 1.1 + 0.05) * SR);
  const L = buf(0, n), R = buf(1, n);
  const [gl, gr] = panGains(nt.pan ?? 0);
  const drop = (nt.drop ?? D.drop) * (0.85 + 0.3 * vel) * (1 + (rng() - 0.5) * 0.08);
  const tau = (nt.dropTime ?? D.dropTime) / 2.3;
  const drive = (nt.drive ?? D.drive) * (0.6 + 0.7 * vel);
  const kd = Math.exp(-6.907755 / (decay * SR));
  let ph = 0, a = 1;
  const nd = Math.tanh(drive) || 1;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = f0 * Math.pow(2, (drop / 12) * Math.exp(-t / tau));
    ph += (TAU * f) / SR;
    if (ph > TAU) ph -= TAU;
    const atk = t < 0.0015 ? t / 0.0015 : 1;
    const y = (drive > 0.05 ? Math.tanh(drive * Math.sin(ph)) / nd : Math.sin(ph)) * a * atk;
    a *= kd;
    L[i] += y * gl; R[i] += y * gr;
  }
  const click = (nt.click ?? D.click) * (0.3 + vel);
  if (click > 0) noiseBurst(L, R, n, rng, { level: 0.35 * click, lp: 9000, hp: 1500, attack: 0.0003, decay: 0.0025, gl, gr });
  const amp = KIT_TUNE.kick * D.amp * (nt.amp ?? 1) * Math.pow(vel, 1.4);
  for (let i = 0; i < n; i++) { L[i] *= amp; R[i] *= amp; }
  fadeEnd(L, R, n, 0.03 * SR);
  emit(D.layer, KIT_BODY, nt.t, L, R, n);
}
const KICKS = {
  // kick drop: Schvitz A kick onsets sweep ~155-175 Hz -> ~46 Hz within ~60 ms (about 20 semitones; 2026-11-26 audit)
  kick: { layer: 'kick', t60: 0.42, drop: 18, dropTime: 0.05, drive: 1.4, click: 0.5, amp: 1 },
  dropKick: { layer: 'kick', t60: 0.8, drop: 26, dropTime: 0.14, drive: 1.1, click: 0.3, amp: 0.73 },
};

/** Dry snare: two shell modes and band-passed wire noise. `tune` (cents), `decay` (wire length), `bright`. */
function snare(emit, nt, rng) {
  const vel = clamp(nt.vel, 0.02, 1);
  const dec = nt.decay ?? 1;
  const n = Math.ceil((0.5 * dec + 0.05) * SR);
  const L = buf(0, n), R = buf(1, n);
  const [gl, gr] = panGains(nt.pan ?? 0);
  const ts = Math.pow(2, (nt.tune ?? 0) / 1200) * (1 + (rng() - 0.5) * 0.02);
  const hv = 0.3 + 0.9 * vel, br = nt.bright ?? 1;
  // 2026-11-26 audit: three pure shell modes left holes of -30 dB at 250 and 400 Hz and a 185 Hz 'tom' ringing 0.2 s;
  // the score's backbeat snares are broadband, bright and dry. Shorter, lower modes + a noisy shell thump + more wire.
  addMode(L, R, n, 185 * ts, 0.5, 0.08 * dec, gl, gr, 0, 0);
  addMode(L, R, n, 330 * ts, 0.3 * hv, 0.06 * dec, gl, gr, 0, 0);
  addMode(L, R, n, 465 * ts, 0.18 * hv, 0.04 * dec, gl, gr, 0, 0);
  noiseBurst(L, R, n, rng, { level: 0.8 * hv, lp: 1300, hp: 130, attack: 0.0008, decay: 0.03 * dec, gl, gr });
  noiseBurst(L, R, n, rng, { level: 0.36 * hv, lp: 5500 * br * (0.7 + 0.5 * vel), hp: 1400, attack: 0.0008, decay: 0.055 * dec * (0.9 + 0.2 * rng()), gl, gr });
  noiseBurst(L, R, n, rng, { level: 0.3 * hv * hv, lp: 14000, hp: 4000, attack: 0.0004, decay: 0.006, gl, gr });
  const amp = KIT_TUNE.snare * (nt.amp ?? 1) * Math.pow(vel, 1.4);
  for (let i = 0; i < n; i++) { L[i] *= amp; R[i] *= amp; }
  fadeIn(L, R, n, 0.0004 * SR);
  fadeEnd(L, R, n, 0.03 * SR);
  emit('snare', KIT_BODY, nt.t, L, R, n);
}

/** Hand clap: 2-4 bursts 6-14 ms apart and a noise tail; `flam` (s): a softer grace clap that much earlier. */
function clap(emit, nt, rng) {
  const vel = clamp(nt.vel, 0.02, 1);
  const flam = Math.max(0, nt.flam ?? 0);
  const pre = Math.round(flam * SR);
  const n = Math.ceil((flam + 0.45 * (nt.decay ?? 1) + 0.05) * SR);
  const L = buf(0, n), R = buf(1, n);
  const pan = nt.pan ?? 0;
  // Schvitz intro clap (alone): flat from 300 Hz to 12 kHz (centroid 3.4-4.1 kHz), a room tail wide above 5 kHz
  // (side/mid -2.7 dB); the 2.6 kHz low-pass of the first fit made it a dull 'thup' (centroid 1.7-2.7 kHz).
  const one = (off, v, bursts) => {
    const [gl, gr] = panGains(pan + (rng() - 0.5) * 0.5);
    let t = 0;
    for (let b = 0; b < bursts; b++) {
      const lv = (b === bursts - 1 ? 1 : 0.55 + 0.3 * rng()) * v;
      const [bl, br] = panGains(pan + (rng() - 0.5) * 0.6);
      noiseBurst(L, R, n, rng, { off: off + t * SR, level: 0.5 * lv, lp: 5500 * (nt.bright ?? 1) * (0.8 + 0.4 * v), hp: 450, attack: 0.0005, decay: 0.0035, gl: bl, gr: br });
      if (b < bursts - 1) t += 0.006 + 0.008 * rng();
    }
    // the tail (room of the hands) and the body thump
    // the room tail: different noise on each side
    noiseBurst(L, R, n, rng, { off: off + t * SR, level: 0.28 * v, lp: 4500 * (nt.bright ?? 1), hp: 600, attack: 0.001, decay: 0.05 * (nt.decay ?? 1), gl, gr });
    for (const [tl, tr] of [[gl, 0], [0, gr]]) noiseBurst(L, R, n, rng, { off: off + t * SR, level: 0.24 * v, lp: 9000 * (nt.bright ?? 1), hp: 3500, attack: 0.001, decay: 0.05 * (nt.decay ?? 1), gl: tl, gr: tr });
    addMode(L, R, n, 300 * (1 + (rng() - 0.5) * 0.06), 0.08 * v, 0.06, gl, gr, Math.round(off + t * SR), 0);
  };
  if (flam > 0) one(0, 0.5 * (0.3 + 0.7 * vel), 2);
  one(pre, 0.3 + 0.7 * vel, 2 + Math.floor(rng() * 3));
  const amp = KIT_TUNE.clap * (nt.amp ?? 1) * Math.pow(vel, 1.2);
  for (let i = 0; i < n; i++) { L[i] *= amp; R[i] *= amp; }
  fadeEnd(L, R, n, 0.03 * SR);
  emit('clap', KIT_BODY, nt.t - flam, L, R, n);
}

/** Hi-hat: six detuned square waves (band-limited) through a high band, closed or `open` (0..1). */
const HAT_F = [205.3, 304.4, 369.6, 522.7, 540, 800];
const hatCache = new Map();
/** 2 s of the six band-limited square waves through the high band, cached per tune/brightness. */
function hatSource(tune, bright) {
  const key = Math.round(tune) + ':' + bright.toFixed(3);
  let x = hatCache.get(key);
  if (x) return x;
  const n = 2 * SR;
  x = new Float32Array(n);
  const tmp = new Float32Array(n);
  const ts = Math.pow(2, tune / 1200);
  HAT_F.forEach((f0, j) => {
    const f = f0 * ts * (1 + 0.0013 * j);
    for (let k = 1; k * f < 19000; k += 2) addMode(x, tmp, n, k * f, 1 / k, 1e4, 1, 0, 0, (j * 1.7 + k * 0.37) % TAU);
  });
  // Clown C dry hats/shaker: flat from ~4 kHz up, centroid ~8 kHz; a 7.2 kHz high-pass left them 15-19 dB short at
  // 4-5 kHz. 5.6 kHz is the compromise with earbud harshness (2-5 kHz), which a 4.8 kHz high-pass raised by 12 dB.
  const hp = biquad('highpass', 5600 * bright, 0.7), hp2 = biquad('highpass', 5600 * bright, 0.7), pk = biquad('peak', 10500, 1.2, 2);
  bq(hp, x, 0, n); bq(hp2, x, 0, n); bq(pk, x, 0, n);
  hatCache.set(key, x);
  return x;
}
function hat(emit, nt, rng) {
  const vel = clamp(nt.vel, 0.02, 1);
  const open = clamp(nt.open ?? 0, 0, 1);
  // closed: Clown C clicks fall ~19 dB in 50 ms (t60 ~0.14 s at vel 0.7)
  const t60 = (nt.decay ?? 1) * (open > 0 ? 0.25 + 0.6 * open : 0.07 + 0.1 * vel);
  const n = Math.ceil((t60 * 1.2 + 0.02) * SR);
  const L = buf(0, n), R = buf(1, n);
  const src = hatSource(nt.tune ?? 0, nt.bright ?? 1);
  // round robin: every stroke reads the (2 s, non-repeating) metallic source from its own place
  const M = buf(2, n);
  const start = Math.floor(rng() * (src.length - n - 1)), start2 = Math.floor(rng() * (src.length - n - 1));
  for (let i = 0; i < n; i++) M[i] = src[start + i];
  const [gl, gr] = panGains(nt.pan ?? 0);
  // a little width (overheads): the right side partly hears the cymbals at another phase (Clown hats: side/mid ~-4 dB)
  const wd = clamp(nt.spread ?? 0.35, 0, 1);
  const kd = Math.exp(-6.907755 / (t60 * SR));
  let a = 1;
  const hv = 0.4 + 0.7 * vel;
  for (let i = 0; i < n; i++) {
    const atk = i < 0.0008 * SR ? i / (0.0008 * SR) : 1;
    const e = a * atk * 0.18;
    a *= kd;
    L[i] += M[i] * e * gl; R[i] += (M[i] * (1 - wd) + src[start2 + i] * wd) * e * gr;
  }
  noiseBurst(L, R, n, rng, { level: 0.22 * hv * (1 - 0.5 * wd), lp: 16000, hp: 5000, attack: 0.0004, decay: t60 / 6.9, gl, gr });
  if (wd > 0) {
    noiseBurst(L, R, n, rng, { level: 0.22 * hv * 0.5 * wd, lp: 16000, hp: 5000, attack: 0.0004, decay: t60 / 6.9, gl, gr: 0 });
    noiseBurst(L, R, n, rng, { level: 0.22 * hv * 0.5 * wd, lp: 16000, hp: 5000, attack: 0.0004, decay: t60 / 6.9, gl: 0, gr });
  }
  const amp = KIT_TUNE.hat * (nt.amp ?? 1) * Math.pow(vel, 1.4) * (1 + 0.7 * open);
  for (let i = 0; i < n; i++) { L[i] *= amp; R[i] *= amp; }
  fadeEnd(L, R, n, Math.min(n / 4, 0.01 * SR));
  emit('hat', KIT_BODY, nt.t, L, R, n);
}

/**
 * Trap hat roll on `part` (a hat part): strokes every `step` beats (0.125 = 32nds, 1/6 = 16th triplets, 1/12 = 32nd
 * triplets) from `beat` for `beats` beats, velocity `from` -> `to`. Returns the end beat.
 */
export function hatRoll(part, beat, beats, opts = {}) {
  const { step = 0.125, from = 0.35, to = 0.8, ...rest } = opts;
  const count = Math.max(1, Math.round(beats / step));
  for (let i = 0; i < count; i++) {
    const u = count > 1 ? i / (count - 1) : 1;
    part.note(beat + i * step, step, null, clamp(from + (to - from) * u, 0.01, 1), { exact: true, ...rest });
  }
  return beat + count * step;
}

// ================================================================= 6. 808 SUB
//
// Reference (measured): Prelude 808 at 14.2 s (D2): settles on its pitch within 40-70 ms after a falling attack,
//   sits -17..-25 c flat (the score's 808 is flat of the band), decays ~16-17 dB/s, sustains 1.0-1.6 s then stops
//   (gated); tail glides down 1-2 semitones over ~150 ms (STYLE D12). Fingerprint: attack pitch drop ~100 -> 73 Hz in
//   ~0.1 s. Antwerp 808: ~0.3 s notes, ~23 c flat. Kugel: F1 43.75 Hz holding 1.2-1.3 s with a click.
//
// Synthesis: sine with an attack pitch drop, saturated (tanh with a small bias: odd AND even harmonics for phones;
// louder = more harmonics), level falls `decay` dB/s, gated release; optional tail glide; legato chain = 808 slides.

const SUB_BODY = { series: [{ type: 'highpass', f: 22, q: 0.707 }, { type: 'lowpass', f: 2500, q: 0.707 }] };
const SUB_TUNE = { amp: 0.39 };
let BIAS808 = 0.4;
export const _setBias = (v) => { BIAS808 = v; };

function sub808(emit, nt, rng) {
  const segs = segsOf(nt);
  const D = chainEnd(segs);
  const rel = nt.release ?? 0.03;
  const n = Math.ceil((D + rel * 3 + 0.01) * SR) + 1;
  const L = buf(0, n), R = buf(1, n);
  const [gl, gr] = panGains(nt.pan ?? 0);
  const tune = nt.tune ?? 0;
  const drop = (nt.drop ?? 5) * (0.9 + 0.2 * rng()), tau = (nt.dropTime ?? 0.06) / 2.3;
  const glide = nt.glide ?? 0, glideT = nt.glideTime ?? 0.15;
  // Prelude D2 808: ~18-20 dB/s in 30-120 Hz; h2 -7..-11 dB re h1 in Prelude and Mori (a warm, asymmetric saturation)
  const decayDb = nt.decay ?? 17;
  const bias = nt.bias ?? BIAS808;
  const st = { j: 0 };
  let ph = rng() * TAU;
  const v0 = clamp(segs[0].vel, 0.02, 1);
  const drive0 = (nt.drive ?? 2.4);
  const level = SUB_TUNE.amp * (nt.amp ?? 1);
  let vS = v0, f = 0, inc = 0;
  // phone layer: a hard-driven copy (tanh x 6) high-passed at 180 Hz, so harmonics 4-12 of a low 808 reach a phone
  const phone = (nt.phone ?? 1) * (0.5 + 0.7 * v0);
  const P = phone > 0 ? buf(2, n) : null;
  for (let b = 0; b < n; b += CB) {
    const e = Math.min(n, b + CB);
    const t = e / SR;
    const midi = chainMidi(segs, t, nt.slide ?? 0.07, st);
    vS += (clamp(segs[st.j].vel, 0.02, 1) - vS) * 0.1;
    let m = midi + tune / 100 + drop * Math.exp(-t / tau);
    if (glide !== 0 && t > D - glideT) m += glide * smoothstep((t - (D - glideT)) / glideT);
    const fT = mtof(m);
    const incT = (TAU * fT) / SR;
    if (b === 0) inc = incT;
    const dI = (incT - inc) / (e - b);
    const drive = drive0 * (0.55 + 0.7 * vS);
    const nd = drive > 0.05 ? Math.tanh(drive * (1 + bias)) : 1;
    const dc = drive > 0.05 ? Math.tanh(drive * bias) : 0;
    for (let i = b; i < e; i++) {
      const ti = i / SR;
      let g = ti < 0.0015 ? ti / 0.0015 : 1;
      g *= Math.pow(10, (-decayDb * ti) / 20);
      if (ti > D) { const q = 1 - (ti - D) / rel; g *= q > 0 ? q * q : 0; }
      const s = Math.sin(ph);
      const y = drive > 0.05 ? (Math.tanh(drive * (s + bias)) - dc) / nd : s;
      const gg = g * Math.pow(vS, 1.3) * level;
      const out = y * gg;
      L[i] += out * gl; R[i] += out * gr;
      if (P) P[i] = Math.tanh(6 * s) * gg * phone;
      ph += inc; inc += dI;
      if (ph > TAU) ph -= TAU;
    }
    f = fT;
  }
  void f;
  if (P) {
    bq(biquad('highpass', 180, 0.707), P, 0, n); bq(biquad('highpass', 180, 0.707), P, 0, n);
    for (let i = 0; i < n; i++) { L[i] += P[i] * gl; R[i] += P[i] * gr; }
  }
  const click = (nt.click ?? 0.25) * (0.3 + v0);
  if (click > 0) noiseBurst(L, R, n, rng, { level: 0.05 * click * level, lp: 6000, hp: 900, attack: 0.0003, decay: 0.002, gl, gr });
  fadeEnd(L, R, n, 0.003 * SR);
  emit('sub808', SUB_BODY, nt.t, L, R, n);
}

// ================================================================= 7. MONO SYNTH BASS
//
// Reference (measured): Prelude intro ostinato 0.3-2.4 s (D3/A3, 140-220 Hz): every D3 attack scoops DOWN from about
//   Eb3/E3 (+100..+150 c) onto the note in 60-80 ms; D3 -> A3 portamento 40-60 ms, A3 -> D3 ~60 ms through the
//   in-between pitches; pitch wobbles +-15 c; harmonics h2 -7..+1, h3 -12..-17, h4 -4..-17, h5 -21..-23, h6 -9..-14,
//   h7 -32..-38 (a low-passed saw); level: accent peak, -6..-10 dB within ~0.1 s, then HOLDS (legato mono synth,
//   no decay); no vibrato.
//
// Synthesis: band-limited saw + an octave-up saw (`octUp`) through a resonant 4-pole low-pass with a filter envelope;
// mono legato: chained notes glide (`glide` s) without re-attack; each new phrase scoops (`scoop` semitones, + = from
// above) and accents. `tone: 'tuba'` swaps the saw for the tuba spectrum (darker, rounder).

const SYNTH_BODY = { series: [{ type: 'highpass', f: 28, q: 0.707 }] };
const SYNTH_TUNE = { amp: 0.265 };
const SYN = { fc: 230, reso: 0.5, octUp: 0.85, retrig: 2.2 };
export const _setSyn = (o) => Object.assign(SYN, o);

function monoSynthBass(emit, nt, rng) {
  const segs = segsOf(nt);
  const D = chainEnd(segs);
  const rel = nt.release ?? 0.03;
  const n = Math.ceil((D + rel * 3 + 0.01) * SR) + 1;
  const L = buf(0, n), R = buf(1, n);
  const [gl, gr] = panGains(nt.pan ?? 0);
  const scoop = (nt.scoop ?? 1.1) * 100 * (0.8 + 0.4 * rng());
  const scoopT = (nt.scoopTime ?? 0.07) * (0.85 + 0.3 * rng());
  // every note of the Prelude ostinato re-accents (~10-13 dB fall in 0.1-0.15 s after each new note): retrig 2.2
  const punch = nt.punch ?? 1.6, retrig = nt.retrig ?? SYN.retrig;
  const reso = nt.reso ?? SYN.reso, bright = nt.bright ?? 1;
  // octave-up saw layer: the Prelude bass has strong EVEN harmonics (h2 ~0, h4 -5..-11, h6 -11..-23) and weak odd ones
  // (h3 -16, h5 -21, h7 -36..-42), on D3 and on A3: a saw doubled an octave up, through a steep (4-pole) low-pass
  const octUp = nt.octUp ?? SYN.octUp;
  const tubaTone = nt.tone === 'tuba';
  const f00 = mtof(segs[0].midi);
  const K = Math.min(200, Math.floor(19000 / (f00 * 0.8)));
  const ws = seedOf(rng);
  const st = { j: 0 };
  let vS = clamp(segs[0].vel, 0.02, 1);
  const level = SYNTH_TUNE.amp * (nt.amp ?? 1);
  harmVoice(L, R, 0, n, K, (t, amps) => {
    const midi = chainMidi(segs, t, nt.glide ?? 0.035, st);
    const j = st.j, sg = segs[j];
    vS += (clamp(sg.vel, 0.02, 1) - vS) * 0.1;
    let c = 6 * (nt.drift ?? 1) * vn(ws, t * 2.3);
    if (t < scoopT * 1.5) { const u = clamp(t / scoopT, 0, 1); c += scoop * (1 - u) * (1 - u); }
    const f0 = mtof(midi + c / 100);
    let env = Math.exp(-t / 0.09) * punch;
    if (j > 0) { const ts = t - sg.t; if (ts >= 0) env += retrig * Math.exp(-ts / 0.07); }
    let g = t < 0.004 ? t / 0.004 : 1;
    g *= (1 + env) / (1 + punch * 0.15);
    if (t > D) { const q = 1 - (t - D) / rel; g *= q > 0 ? q * q : 0; }
    const lev = g * Math.pow(vS, 1.4) * level;
    if (tubaTone) {
      const fc = 80 * Math.pow(2, 2.2 * vS) * Math.pow(f0 / 49, 0.4) * bright * (1 + 0.6 * env);
      const e = tubaSpectrumAt(f0, fc, 2.8, K, amps, 1, 0, 0, 0);
      const k = lev / Math.sqrt(Math.max(e, 1e-9)) * 1.6;
      for (let q = 0; q < K; q++) amps[q] *= k;
    } else {
      const fc = SYN.fc * Math.pow(2, 1.6 * vS) * Math.pow(f0 / 147, 0.6) * bright * (1 + 1.2 * env);
      for (let k = 1; k <= K; k++) {
        const x = (k * f0) / fc;
        const h2 = 1 / ((1 - x * x) * (1 - x * x) + (x / reso) * (x / reso));
        const a = h2 * (1 / k + (k % 2 === 0 ? (2 * octUp) / k : 0)) / (1 + octUp * 0.5);
        if (a < 8e-4 && x > 2) { HB.cnt = k - 1; break; }
        amps[k - 1] = a < 8e-4 ? 0 : a * lev;
      }
    }
    return f0;
  }, gl, gr, rng() * TAU);
  fadeEnd(L, R, n, 0.003 * SR);
  emit('synthBass', SYNTH_BODY, nt.t, L, R, n);
}

// ================================================================= 8. STABS, PLUCKS, GLASS PAD, BOOM, FX
//
// stab. Reference: Schvitz section A short reed/brass/keys stabs on the bass notes (~0.2 s "pah", G3+D4 on every
// off-beat), Rabbi Nuchem off-beat A3-C4-E4 stabs layered with the snare, Clown A chord stabs on every beat (falling
// ~10 dB in 0.1 s). kind: 'brass' (two players, brassy table), 'reed' (accordion chop with musette), 'keys' (organ
// drawbars 8' 4' 2 2/3' 2' with a key click). Written length = held length (keep it 0.1-0.3 s).

const STAB_BODY = { series: [{ type: 'highpass', f: 90, q: 0.707 }, { type: 'lowpass', f: 11000, q: 0.707 }] };
const STAB_TUNE = { brass: 0.395, keys: 0.31, reed: 2.6 };   // re-trimmed after the decaying stab body (2026-11-26 audit)
const DRAWBARS = { 1: 1, 2: 0.7, 3: 0.45, 4: 0.5, 6: 0.18, 8: 0.22 };

function stab(emit, nt, rng) {
  const kind = nt.kind ?? 'brass';
  if (kind === 'reed') return accordionCore(emit, { ...nt, reeds: nt.reeds ?? 3, musette: nt.musette ?? 14, amp: (nt.amp ?? 1) * STAB_TUNE.reed }, rng, 'stab:reed', true);
  const vel = clamp(nt.vel, 0.02, 1);
  const dur = Math.max(0.03, nt.dur);
  const attack = nt.attack ?? (kind === 'keys' ? 0.003 : 0.009);
  const rel = nt.release ?? (kind === 'keys' ? 0.04 : 0.06);
  const n = Math.ceil((dur + rel * 2 + 0.01) * SR) + 1;
  const L = buf(0, n), R = buf(1, n);
  const players = kind === 'brass' ? 2 : 1;
  const stabDecay = nt.decay ?? (kind === 'brass' ? 0.1 : 0.08);
  const f0n = mtof(nt.midi);
  const K = Math.min(200, Math.floor(19000 / f0n));
  for (let p = 0; p < players; p++) {
    const det = players > 1 ? (p ? 1 : -1) * (nt.detune ?? 6) * (0.7 + 0.6 * rng()) : 0;
    const [gl, gr] = panGains((nt.pan ?? 0) + (players > 1 ? (p ? 0.2 : -0.2) * (nt.spread ?? 1) : 0));
    const off = p ? Math.round(rng() * 0.006 * SR) : 0;
    const ps = seedOf(rng);
    const tmp = new Float32Array(K);
    const fcB = (v) => 420 * Math.pow(2, 1.8 * v) * Math.pow(f0n / 220, 0.3) * (nt.bright ?? 1);
    const norm = kind === 'brass' ? 1 / Math.sqrt(tubaSpectrumAt(f0n, fcB(vel), 2.2, K, tmp, 1, 0, 0, 0)) : 1;
    harmVoice(L, R, off, n - off, K, (t, amps) => {
      let g = t < attack ? smoothstep(t / attack) : 1;
      const acc = 1 + 0.4 * Math.exp(-t / 0.05);
      g *= acc;
      // a hit, not a held chord: Schvitz A stabs fall ~8 dB in 0.12 s after the peak while their centroid drops from
      // ~1 kHz to ~400 Hz in 80 ms (decay: 0 = the flat organ chord)
      const flo = kind === 'brass' ? 0.45 : 0.3, fall = stabDecay > 0 ? flo + (1 - flo) * Math.exp(-t / stabDecay) : 1;
      g *= fall;
      const shine = 1 + 1.3 * Math.exp(-t / 0.035);
      if (t > dur) { const q = 1 - (t - dur) / rel; g *= q > 0 ? q * q : 0; }
      const f0 = mtof(nt.midi + (det + 2 * vn(ps, t * 2)) / 100 + (kind === 'brass' ? (-25 * Math.exp(-t / 0.02)) / 100 : 0));
      const lev = g * Math.pow(vel, 1.4) * (nt.amp ?? 1) / Math.sqrt(players);
      if (kind === 'keys') {
        const lp = 2500 * Math.pow(2, vel) * (nt.bright ?? 1) * (stabDecay > 0 ? 0.6 * shine : 1);
        for (let k = 1; k <= K; k++) { const d = DRAWBARS[k] || 0; amps[k - 1] = d ? (d * lev * STAB_TUNE.keys) / (1 + Math.pow((k * f0) / lp, 2)) : 0; }
      } else {
        tubaSpectrumAt(f0, fcB(vel) * acc * (stabDecay > 0 ? 0.55 * shine : 1), 2.2 - 0.5 * smoothstep((vel - 0.5) / 0.4), K, amps, lev * norm * STAB_TUNE.brass, 0, 0, t);
      }
      return f0;
    }, gl, gr, rng() * TAU);
  }
  if (kind === 'keys') {
    const [gl, gr] = panGains(nt.pan ?? 0);
    noiseBurst(L, R, n, rng, { level: 0.012 * vel * (nt.amp ?? 1), lp: 6000, hp: 1500, attack: 0.0003, decay: 0.002, gl, gr });
  }
  fadeEnd(L, R, n, 0.003 * SR);
  emit('stab:' + kind, STAB_BODY, nt.t, L, R, n);
}

// pluck. Reference (measured): Shkoyach verse plucked stabs 9.5-25 s: onsets 13-35 ms (smeared by doubling), decay
// ~50 dB/s in 300-1500 Hz (20 dB in 0.4 s), dense mid harmonics, VERY wide (L/R correlation 0.42, side/mid -2 dB at
// 150-1000 Hz): stereo-doubled. Kugel tremolo pedal 2-8 s: C5 +35 c sharp, h2 -26, h3 -34, strokes at 7.6-7.9 Hz
// (AM depth ~50 %, 4-8 dB), G4/Bb4 tremolo chord at 9-10.2 s flutters every 0.1-0.13 s.
//
// Synthesis: paired strings (a mandolin course, `course` cents apart) as modal partials with a pick-position comb,
// velocity = pick hardness; `double` adds a second take panned to the other side, 10-22 ms late, re-plucked;
// `tremolo: true` repeats alternate down/up strokes at `tremRate` per second for the written length, each new stroke
// cutting the previous one short (the pick stops the string).

const PLUCK_BODIES = {
  mandolin: { series: [{ type: 'highpass', f: 140, q: 0.707 }, { type: 'peak', f: 420, gain: 3, q: 1.5 }, { type: 'peak', f: 1500, gain: 2, q: 1.2 }, { type: 'peak', f: 3200, gain: 2.5, q: 1 }, { type: 'lowpass', f: 9500, q: 0.707 }] },
  guitar: { series: [{ type: 'highpass', f: 70, q: 0.707 }, { type: 'peak', f: 105, gain: 3, q: 1.5 }, { type: 'peak', f: 220, gain: 2, q: 1.2 }, { type: 'peak', f: 2500, gain: 2, q: 1 }, { type: 'lowpass', f: 8000, q: 0.707 }] },
};
const PLUCK_TUNE = { amp: 0.46 };
const PLK = { damp: 450, pick: 0.09, soft: 0.38 };
export const _setPlk = (o) => Object.assign(PLK, o);

function pluckString(L, R, n, rng, f0, vel, off, T0, bright, gl, gr, pp) {
  const fc = 900 * Math.pow(2, vel * 3.0 + Math.log2(f0 / 440) * 0.4) * bright;
  const amps = [], fr = [];
  let e = 0;
  for (let k = 1; k <= 40; k++) {
    const fk = k * f0 * (1 + 0.00004 * k * k);
    if (fk > 16000) break;
    const a = (Math.abs(Math.sin(Math.PI * k * pp)) / Math.pow(k, 0.9)) * Math.exp(-fk / fc);
    if (k > 4 && a < 1e-5) break;
    amps.push(a); fr.push(fk); e += a * a;
  }
  const s = 1 / Math.sqrt(e);
  // upper partials die fast: Shkoyach A7 stabs darken from ~1.4-1.9 kHz (centroid at the pick) to ~430 Hz within 0.1 s
  for (let i = 0; i < amps.length; i++) addMode(L, R, n, fr[i], amps[i] * s * (i > 1 ? 0.85 + 0.3 * rng() : 1), T0 / (1 + (fr[i] - f0) / PLK.damp), gl, gr, off, 0);
}

/**
 * Soft tremolo pedal (the default for `tremolo: true`). Kugel 2-8 s: the 'tremolo pedal' is a near-pure tone (h2 -32,
 * h3 -47 dB), +35 c sharp, nearly mono (correlation 0.93), with ~50 % irregular amplitude movement and beating near 3 Hz,
 * and NO pick transients. A bright mandolin course (h2 -2 dB, a broadband pick column on every stroke, double-tracked
 * wide) was nothing like it. Here: two takes ~10 c apart of a sustained near-sine, each shaped by soft strokes.
 */
function softTremolo(emit, nt, rng, vel) {
  const dur = Math.max(0.1, nt.dur);
  const n = Math.ceil((dur + 0.4) * SR);
  const L = buf(0, n), R = buf(1, n);
  const f0 = mtof(nt.midi + (nt.sharp ?? 0) / 100);
  const rate = nt.tremRate ?? 7.8;
  const env = buf(2, n);
  for (let tk = 0; tk < 2; tk++) {
    env.fill(0);
    // strokes: 8 ms rise, then a decay (tau 90 ms) until the next stroke; up-strokes softer; timing loose
    let t = tk ? 0.03 * rng() : 0, i = 0;
    const strokes = [];
    while (t < dur) { strokes.push([t, (i % 2 ? 0.75 : 1) * (0.8 + 0.4 * rng())]); t += (1 / rate) * (1 + (rng() - 0.5) * 0.3); i++; }
    let g = 0;
    for (let s = 0; s < n; s++) {
      const tt = s / SR;
      let a = 0;
      for (let q = strokes.length - 1; q >= 0; q--) { const d = tt - strokes[q][0]; if (d >= 0) { a = strokes[q][1] * (d < 0.008 ? 0.35 + 0.65 * smoothstep(d / 0.008) : 0.35 + 0.65 * Math.exp(-(d - 0.008) / 0.09)); break; } }
      if (tt > dur) a *= Math.exp(-(tt - dur) / 0.06);
      g += (a - g) * 0.02;   // ~1.1 ms smoothing: no clicks
      env[s] = g;
    }
    const det = (tk ? 5 : -5) * (0.8 + 0.4 * rng());
    const [gl, gr] = panGains((nt.pan ?? 0) + (tk ? 0.25 : -0.25));
    const ds = seedOf(rng);
    let ph = rng() * TAU;
    const h2 = dbl(-30) * (0.7 + 0.6 * vel), h3 = dbl(-42) * (0.7 + 0.6 * vel);
    for (let s = 0; s < n; s++) {
      const tt = s / SR;
      ph += (TAU * f0 * Math.pow(2, (det + 7 * vn(ds, tt * 1.3)) / 1200)) / SR;
      if (ph > TAU) ph -= TAU;
      const y = (Math.sin(ph) + h2 * Math.sin(2 * ph) + h3 * Math.sin(3 * ph)) * env[s] * (tk ? 0.65 : 1);
      L[s] += y * gl; R[s] += y * gr;
    }
  }
  const amp = PLUCK_TUNE.amp * PLK.soft * (nt.amp ?? 1) * (0.03 + 0.97 * Math.pow(vel, 1.4));
  for (let i = 0; i < n; i++) { L[i] *= amp; R[i] *= amp; }
  fadeEnd(L, R, n, 0.02 * SR);
  emit('pluck:tremolo', PLUCK_BODIES.mandolin, nt.t, L, R, n);
}

function pluck(emit, nt, rng) {
  const vel = clamp(nt.vel, 0.02, 1);
  if (nt.tremolo && (nt.tone ?? 'soft') === 'soft') return softTremolo(emit, nt, rng, vel);
  const kind = nt.body === 'guitar' ? 'guitar' : 'mandolin';
  const f0 = mtof(nt.midi + (nt.sharp ?? 0) / 100);
  const T0 = (nt.decay ?? 1) * (kind === 'guitar' ? 2.4 : 1.2) * clamp(Math.pow(2, -(nt.midi - 67) / 30), 0.4, 2);
  const trem = !!nt.tremolo;
  const dur = Math.max(0.05, nt.dur);
  const n = Math.ceil(((trem ? dur : 0) + T0 * 1.25 + 0.05) * SR);
  const L = buf(0, n), R = buf(1, n);
  const course = nt.course ?? (kind === 'mandolin' ? 3 : 0);
  const doubled = (nt.double ?? 1) > 0;
  const spread = nt.spread ?? 0.75;
  const takes = doubled ? 2 : 1;
  const bright = nt.bright ?? 1;
  for (let tk = 0; tk < takes; tk++) {
    const pan = (nt.pan ?? 0) + (doubled ? (tk ? spread : -spread) : 0);
    const delay = tk ? Math.round((0.01 + 0.012 * rng()) * SR) : 0;
    const tdet = tk ? (rng() - 0.5) * 8 : 0;
    const [gl, gr] = panGains(pan);
    const T = buf(4, n), T2 = buf(5, n);
    const strokes = [];
    if (trem) {
      const rate = (nt.tremRate ?? 7.8) * (0.97 + 0.06 * rng());
      for (let t = 0, i = 0; t < dur; i++) { strokes.push({ t, up: i % 2 === 1 }); t += (1 / rate) * (1 + (rng() - 0.5) * 0.16); }
    } else strokes.push({ t: 0, up: false });
    strokes.forEach((sk, si) => {
      const off = delay + Math.round(sk.t * SR);
      if (off >= n) return;
      const v = vel * (sk.up ? 0.78 : 1) * (0.9 + 0.2 * rng());
      const pp = 0.13 + (rng() - 0.5) * 0.04 + (sk.up ? 0.02 : 0);
      // previous strokes are stopped by the pick (fast damping just before this stroke)
      if (si > 0) dampFrom(T, T2, n, off - Math.round(0.004 * SR), 0.012);
      // each stroke in its own buffer with a short pick ramp (a re-struck string must not click)
      const S = si > 0 ? buf(6, n) : T, S2 = si > 0 ? buf(7, n) : T2;
      for (let c = 0; c < (course > 0 ? 2 : 1); c++) {
        const cd = course > 0 ? (c ? course / 2 : -course / 2) : 0;
        const f = f0 * Math.pow(2, (cd + tdet + (rng() - 0.5) * 1.5) / 1200);
        pluckString(S, S2, n, rng, f, v, off + (c ? Math.round(rng() * 0.003 * SR) : 0), T0 * (0.9 + 0.2 * rng()), bright * (sk.up ? 0.8 : 1), 1, 1, pp);
      }
      const nz = PLK.pick * (0.3 + v) * (si > 0 ? 0.5 : 1);
      noiseBurst(S, S2, n, rng, { off, level: nz, lp: 9000 * bright, hp: 1200, attack: 0.0006, decay: 0.003, gl: 1, gr: 1 });
      if (si > 0) {
        fadeIn(S, S2, n, 0.0012 * SR, off);
        for (let i = off; i < n; i++) T[i] += S[i];
      }
    });
    if (trem) dampFrom(T, T2, n, delay + Math.round((dur + 0.02) * SR), 0.08);
    else if (nt.damp) dampFrom(T, T2, n, delay + Math.round(dur * SR), 0.03);
    const tg = (1 / Math.sqrt(takes)) * (tk ? 0.9 : 1);
    for (let i = 0; i < n; i++) { L[i] += T[i] * gl * tg; R[i] += T[i] * gr * tg; }
  }
  // tremolo sustains (about +5 LU at the same velocity) and the guitar body is fuller: both trimmed to the single mandolin pluck
  const amp = PLUCK_TUNE.amp * (nt.amp ?? 1) * (0.03 + 0.97 * Math.pow(vel, 1.4)) / (course > 0 ? Math.SQRT2 : 1) * (trem ? 0.6 : 1) * (kind === 'guitar' ? 0.75 : 1);
  for (let i = 0; i < n; i++) { L[i] *= amp; R[i] *= amp; }
  fadeIn(L, R, n, 0.0008 * SR);
  fadeEnd(L, R, n, Math.min(n / 3, 0.05 * SR));
  emit('pluck:' + kind, PLUCK_BODIES[kind], nt.t, L, R, n);
}

// glassPad. Reference (measured / analysis): Schvitz section A "struck glassy pad": no vibrato, decaying 7-9 dB/s,
// voicing split high-left / low-right; A Prayer celesta-like tones ~8 dB/s with a long ring.
// Synthesis: near-harmonic struck partials (slightly stretched) in beating pairs, half struck (5 ms) and half blooming
// (~0.1 s) so it reads as a pad; fundamental t60 = 60 / `decayDb` s (default 8 dB/s); pan follows pitch (`split`).

const GLASS_BODY = { series: [{ type: 'highpass', f: 120, q: 0.707 }, { type: 'highshelf', f: 6000, gain: -3 }] };
const GLASS_TUNE = { amp: 0.285 };
// Schvitz A glass chord (C6 Eb6 G6, left): near-pure tones, h2..h4 -27..-37 dB re h1 over the sustain, swelling in over
// ~0.16 s (-20 -> -1 dB) and decaying 6.7-7.8 dB/s (2026-11-26 audit; the first fit had h2 at -14 dB and a 30 ms attack)
const GLASS_P = [[1, 1, 1], [2.003, 0.06, 0.55], [3.01, 0.035, 0.4], [4.03, 0.04, 0.3], [5.94, 0.02, 0.2], [8.2, 0.015, 0.12]];

function glassPad(emit, nt, rng) {
  const vel = clamp(nt.vel, 0.02, 1);
  const f0 = mtof(nt.midi);
  const t60 = 60 / (nt.decayDb ?? 7) * (nt.decay ?? 1);
  const damp = !!nt.damp;
  const total = damp ? Math.min(t60, nt.dur + 0.4) : Math.min(t60 * 1.05, 10);
  const n = Math.ceil(total * SR) + 2;
  const L = buf(0, n), R = buf(1, n);
  const split = nt.split ?? 0.6;
  const pan = clamp((nt.pan ?? 0) - split * clamp((nt.midi - 62) / 18, -1, 1), -1, 1);
  const [gl, gr] = panGains(pan), [gl2, gr2] = panGains(pan + 0.15), [gl3, gr3] = panGains(pan - 0.15);
  const hv = 0.4 + 0.8 * vel;
  const bloom = nt.bloom ?? 0.8;
  for (const [r, a, dm] of GLASS_P) {
    const f = f0 * r * (1 + (rng() - 0.5) * 0.002);
    if (f > 17000) continue;
    const aa = a * (r > 2 ? Math.pow(hv, 1.2) * (nt.bright ?? 1) : 1);
    // a slow shimmer (0.15-0.4 c, beat period 5-15 s on the fundamental), not a tremolo
    const beat = Math.pow(2, (0.15 + 0.25 * rng()) / 1200);
    addMode(L, R, n, f, aa * (1 - bloom) * 0.65, t60 * dm, gl2, gr2, 0, 0);
    addMode(L, R, n, f * beat, aa * (1 - bloom) * 0.35, t60 * dm * 1.05, gl3, gr3, 0, 0);
    // bloom: difference of two decays rises over ~0.15 s (same frequency: no extra beating)
    addMode(L, R, n, f, aa * bloom, t60 * dm, gl, gr, 0, 0);
    addMode(L, R, n, f, -aa * bloom, 0.6 + 0.15 * rng(), gl, gr, 0, 0);
  }
  fadeIn(L, R, n, 0.005 * SR);
  if (damp) dampFrom(L, R, n, Math.round(nt.dur * SR), 0.12);
  const amp = GLASS_TUNE.amp * (nt.amp ?? 1) * (0.03 + 0.97 * Math.pow(vel, 1.4));
  for (let i = 0; i < n; i++) { L[i] *= amp; R[i] *= amp; }
  fadeEnd(L, R, n, Math.min(n / 3, 0.3 * SR));
  emit('glassPad', GLASS_BODY, nt.t, L, R, n);
}

// boom. Reference (measured): Schvitz boom at 4.3 s (sub on G1 + D2 = root + fifth, gong lines 121, 165, 190, 211,
// 238 Hz = 2.47-4.86 x the root): loud impact -18 dB falling ~11 dB in 0.6 s, then a plateau ~2 s, then ~20 dB/s;
// total ~3.7 s; WIDE (correlation 0.33). Shidduch outro: ~40 Hz booms every 2 bars decaying over ~1.2 s.
// Synthesis: tuned sub sine with a pitch drop + fifth, a low noise impact, and a gong layer (inharmonic modes that
// bloom and ring, panned wide). The sub stays mono; only the gong is wide.

const BOOM_BODY = { series: [{ type: 'highpass', f: 24, q: 0.707 }] };
const BOOM_TUNE = { amp: 0.565 };
const GONG = [[2.47, 1, 1.0], [3.37, 0.8, 0.9], [3.88, 0.7, 0.8], [4.31, 0.6, 0.7], [4.86, 0.5, 0.6], [6.1, 0.35, 0.45], [7.4, 0.25, 0.35], [9.2, 0.18, 0.25]];

function boom(emit, nt, rng) {
  const vel = clamp(nt.vel, 0.02, 1);
  const tail = nt.tail ?? 1;
  const f0 = mtof(nt.midi);
  const n = Math.ceil(((nt.hold ?? 2) * tail + 2.4 * tail + 0.1) * SR);
  const L = buf(0, n), R = buf(1, n);
  const drop = nt.drop ?? 7, tau = (nt.dropTime ?? 0.15) / 2.3;
  // sub: impact + sustain (two decays), with the fifth
  let ph = 0, ph5 = 0;
  // impact (tau 0.16 s) + body: a near-flat plateau (-4 dB/s) for `hold` s, then a slow release: Schvitz keeps fading
  // ~9-13 dB/s after the plateau and is still there 3.6 s after the hit (a 0.9 s t60 cut it off at ~2.4 s)
  const hold = (nt.hold ?? 2) * tail;
  const k1 = Math.exp(-1 / (0.16 * SR)), k2 = Math.pow(10, -4 / 20 / SR), k3 = Math.exp(-6.907755 / (4.5 * tail * SR));
  let a1 = 1, a2 = 0.3;
  const holdN = Math.round(hold * SR);
  const fifth = nt.fifth ?? 0.7;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = f0 * Math.pow(2, (drop / 12) * Math.exp(-t / tau));
    ph += (TAU * f) / SR; ph5 += (TAU * f * 1.5) / SR;
    if (ph > TAU) ph -= TAU;
    if (ph5 > TAU) ph5 -= TAU;
    const atk = t < 0.004 ? t / 0.004 : 1;
    // the fifth is added after the saturator (inside it, the two would make a sub-octave difference tone)
    const y = (Math.tanh(1.3 * Math.sin(ph)) / Math.tanh(1.3) + fifth * 0.5 * Math.sin(ph5)) * 0.8 * (a1 + a2) * atk;
    a1 *= k1; a2 *= i < holdN ? k2 : k3;
    L[i] += y * 0.707; R[i] += y * 0.707;
  }
  noiseBurst(L, R, n, rng, { level: 0.5 * (0.3 + vel), lp: 220, attack: 0.002, decay: 0.12, gl: 0.707, gr: 0.707 });
  noiseBurst(L, R, n, rng, { level: 0.06 * (0.3 + vel), lp: 6000, hp: 800, attack: 0.001, decay: 0.03, gl: 0.6, gr: 0.8 });
  const gong = nt.gong ?? 0.5;
  if (gong > 0) {
    const hv = 0.5 + 0.6 * vel;
    GONG.forEach(([r, a, dm], i) => {
      const f = f0 * r * (1 + (rng() - 0.5) * 0.01);
      const p = (i % 2 ? 0.85 : -0.85) * (nt.spread ?? 1);
      const [gl, gr] = panGains(p), [gl2, gr2] = panGains(-p * 0.6);
      const aa = gong * a * 0.4 * (r > 5 ? hv : 1);
      const T = (hold + 2.5) * dm;
      addMode(L, R, n, f, aa, T, gl, gr, 0, 0);
      addMode(L, R, n, f, -aa, 0.25 + 0.2 * rng(), gl, gr, 0, 0);       // the gong blooms
      addMode(L, R, n, f * 1.004, -aa * 0.5, T * 0.9, gl2, gr2, 0, 0);   // opposite polarity on the other side: wide
    });
  }
  const amp = BOOM_TUNE.amp * (nt.amp ?? 1) * Math.pow(vel, 1.3);
  for (let i = 0; i < n; i++) { L[i] *= amp; R[i] *= amp; }
  fadeEnd(L, R, n, 0.3 * SR);
  emit('boom', BOOM_BODY, nt.t, L, R, n);
}

// dropImpact. Reference (measured): Schvitz pitch-drop impact at 11.76-12.23 s: C3 (131 Hz) -> G1 (50 Hz), 17 semitones
// in 0.47 s, fast at first (about 36 st/s) then slowing. A sine with harmonics falling from `from` semitones above the
// written note onto it over the written length, decaying, plus a dark noise hit.

function dropImpact(emit, nt, rng) {
  const vel = clamp(nt.vel, 0.02, 1);
  const dur = Math.max(0.1, nt.dur);
  const n = Math.ceil((dur + 0.4) * SR);
  const L = buf(0, n), R = buf(1, n);
  const span = nt.from ?? 17;
  const f0 = mtof(nt.midi);
  let ph = rng() * TAU;
  // Schvitz: ~3.5 st in the first 40 ms, then an almost linear fall (~33 st/s); level falls only ~40 dB/s
  const k = Math.exp(-6.907755 / ((dur + 0.3) * 2 * SR));
  let a = 1;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const u = clamp(t / dur, 0, 1);
    const f = f0 * Math.pow(2, (span / 12) * (0.8 * (1 - u) + 0.2 * Math.pow(1 - u, 6)));
    ph += (TAU * f) / SR;
    if (ph > TAU) ph -= TAU;
    const atk = t < 0.003 ? t / 0.003 : 1;
    const y = Math.tanh(1.8 * Math.sin(ph)) * a * atk;
    a *= k;
    L[i] += y * 0.707; R[i] += y * 0.707;
  }
  noiseBurst(L, R, n, rng, { level: 0.4 * (0.3 + vel), lp: 400, attack: 0.002, decay: 0.08, gl: 0.707, gr: 0.707 });
  const amp = BOOM_TUNE.amp * 0.73 * (nt.amp ?? 1) * Math.pow(vel, 1.3);
  for (let i = 0; i < n; i++) { L[i] *= amp; R[i] *= amp; }
  fadeEnd(L, R, n, 0.1 * SR);
  emit('boom', BOOM_BODY, nt.t, L, R, n);
}

// glissRiser. A pitched glissando riser (Rabbi Nuchem): three detuned saw voices gliding up `span` semitones INTO the
// written note over the written length, getting louder and brighter, with a rising noise band; stops short at the end.

function glissRiser(emit, nt, rng) {
  const vel = clamp(nt.vel, 0.02, 1);
  const dur = Math.max(0.2, nt.dur);
  const n = Math.ceil((dur + 0.03) * SR);
  const L = buf(0, n), R = buf(1, n);
  const span = nt.from ?? 12;
  const curve = nt.curve ?? 1.6;
  const target = nt.midi;
  for (let v = 0; v < 3; v++) {
    const det = (v - 1) * 9;
    const [gl, gr] = panGains((nt.pan ?? 0) + (v - 1) * 0.7 * (nt.spread ?? 1));   // Rabbi Nuchem riser / string smear: wide (corr 0.6)
    const K = Math.min(60, Math.floor(19000 / mtof(target + 1)));
    harmVoice(L, R, 0, n, K, (t, amps) => {
      const u = clamp(t / dur, 0, 1);
      const m = target - span * (1 - smoothstep(u * 0.98 + 0.02 * u * u));
      const f = mtof(m + det / 100);
      const g = Math.pow(u, curve) * (t > dur ? Math.max(0, 1 - (t - dur) / 0.015) : 1);
      const fc = f * (2 + 6 * u * vel);
      for (let k = 1; k <= K; k++) amps[k - 1] = (g / k) / (1 + Math.pow((k * f) / fc, 2));
      return f;
    }, gl, gr, rng() * TAU);
  }
  const amp = 0.12 * (nt.amp ?? 1) * Math.pow(vel, 1.2);
  for (let i = 0; i < n; i++) { L[i] *= amp; R[i] *= amp; }
  fadeEnd(L, R, n, 0.012 * SR);
  emit('riser', STAB_BODY, nt.t, L, R, n);
}

// ---------------------------------------------------------------- registry

/** name -> definition (same shape as INSTRUMENTS in lib/instruments.mjs). */
export const BAND_INSTRUMENTS = {
  tuba: { render: tuba, pitched: true, range: [28, 58], kind: 'sustain', chain: true },
  accordion: { render: accordion, pitched: true, range: [40, 96], kind: 'sustain' },
  whistleLead: { render: (e, nt, r) => pureLead(e, nt, r, 'whistle'), pitched: true, range: [67, 98], kind: 'sustain', chain: true },
  thereminLead: { render: (e, nt, r) => pureLead(e, nt, r, 'theremin'), pitched: true, range: [55, 96], kind: 'sustain', chain: true },
  tambourine: { render: (e, nt, r) => jingleCore(e, nt, r, 'tambourine'), pitched: false, defaultMidi: 0, range: [0, 127], kind: 'decay' },
  riq: { render: (e, nt, r) => jingleCore(e, nt, r, 'riq'), pitched: false, defaultMidi: 0, range: [0, 127], kind: 'decay' },
  jingleRoll: { render: jingleRoll, pitched: false, defaultMidi: 0, range: [0, 127], kind: 'fx' },
  fingerCymbals: { render: fingerCymbals, pitched: false, defaultMidi: 0, range: [0, 127], kind: 'decay' },
  shaker: { render: shaker, pitched: false, defaultMidi: 0, range: [0, 127], kind: 'decay' },
  kick: { render: (e, nt, r) => kickCore(e, nt, r, KICKS.kick), pitched: false, defaultMidi: 33, range: [21, 50], kind: 'decay' },
  dropKick: { render: (e, nt, r) => kickCore(e, nt, r, KICKS.dropKick), pitched: false, defaultMidi: 25, range: [18, 45], kind: 'decay' },
  snare: { render: snare, pitched: false, defaultMidi: 0, range: [0, 127], kind: 'decay' },
  clap: { render: clap, pitched: false, defaultMidi: 0, range: [0, 127], kind: 'decay' },
  hat: { render: hat, pitched: false, defaultMidi: 0, range: [0, 127], kind: 'decay' },
  sub808: { render: sub808, pitched: true, range: [24, 52], kind: 'sustain', chain: true },
  monoSynthBass: { render: monoSynthBass, pitched: true, range: [31, 62], kind: 'sustain', chain: true },
  stab: { render: stab, pitched: true, range: [40, 88], kind: 'sustain' },
  pluck: { render: pluck, pitched: true, range: [43, 93], kind: 'decay' },
  glassPad: { render: glassPad, pitched: true, range: [52, 100], kind: 'decay' },
  boom: { render: boom, pitched: false, defaultMidi: 31, range: [21, 43], kind: 'fx' },
  dropImpact: { render: dropImpact, pitched: false, defaultMidi: 31, range: [21, 50], kind: 'fx' },
  glissRiser: { render: glissRiser, pitched: false, defaultMidi: 72, range: [0, 127], kind: 'fx' },
};
for (const [k, v] of Object.entries(BAND_INSTRUMENTS)) {
  if (INSTRUMENTS[k] && INSTRUMENTS[k] !== v) throw new Error('band.mjs: instrument name clash: ' + k);
  INSTRUMENTS[k] = v;
}

/** Note options read by the band instruments (added to the engine's list of known keys). */
export const BAND_KEYS = ['growl', 'accent', 'wet', 'octUp', 'bias', 'scoop', 'scoopTime', 'glide', 'musette', 'reeds', 'octave', 'high', 'chop', 'sharp', 'fall',
  'fallTime', 'drift', 'vibRate', 'stroke', 'skin', 'skinF', 'rate', 'drop', 'dropTime', 'drive', 'click', 'tune', 'flam', 'open', 'decayDb',
  'glideTime', 'slide', 'hold', 'sharpStart', 'creep', 'jitter', 'phone', 'punch', 'retrig', 'reso', 'tone', 'kind', 'course', 'double', 'tremolo', 'body', 'split', 'bloom', 'gong', 'fifth'];
