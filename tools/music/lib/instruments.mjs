// Instruments. Every instrument is a function (emit, note, rng) that renders ONE note into scratch
// buffers and hands them to emit(layerKey, bodyDescriptor, tSec, L, R, n).
//
// Three synthesis cores:
//   1. renderSustained  - band-limited wavetable voices (additive tables built per pitch band, so there is
//                         no aliasing), each voice with its own detune, delayed vibrato, drift and onset;
//                         then a dynamic state-variable low-pass driven by velocity * expression.
//                         Used by strings, solo strings, horn, flute, choir, sub bass.
//   2. addPartial       - banks of exponentially decaying sine resonators (modal synthesis).
//                         Used by felt piano, harp, pizzicato, celesta, glockenspiel, marimba, vibraphone.
//   3. custom loops     - membranes with pitch drop, heartbeat, noise swells.
//
// Fixed resonances (instrument bodies, vowel formants) are NOT applied here per note. They are linear and
// time-invariant, so the mixer applies them once per layer ("body" descriptor), which is exact and cheap.

import { SR, TAU, mtof, clamp, smoothstep, fft, biquad, biquadRun, eqBand, NOISE, NOISE_MASK, NOISE_LEN, curveAt, mulberry32, hashSeed } from './dsp.mjs';

// ---------------------------------------------------------------- scratch buffers

const SCR = [];
function scratch(idx, n) {
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

// ---------------------------------------------------------------- band-limited wavetables

const TS = 4096;
const SPECTRA = {
  // bowed string: sawtooth-like 1/k with a fixed irregularity so it is not a textbook saw
  strings: (k) => (1 / k) * (1 + 0.28 * Math.sin(k * 12.9898 + 1.3)),
  horn: (k) => 1 / Math.pow(k, 1.15),
  // a horn played loud: the bell radiates the upper harmonics almost as strongly as the low ones ("brassy")
  hornBright: (k) => (k === 1 ? 0.55 : 1) / (1 + Math.pow(k / 6.5, 2.4)),
  // rich enough that a loud flute gets an edge; the dynamic low-pass leaves a soft one nearly a sine
  flute: (k) => [1, 0.5, 0.24, 0.13, 0.075, 0.045, 0.028, 0.018, 0.012, 0.008][k - 1] || 0,
  choir: (k) => (1 / Math.pow(k, 1.5)) * (1 + 0.2 * Math.sin(k * 7.13 + 0.4)),
  sub: (k) => [1, 0.38, 0.14, 0.05, 0.02][k - 1] || 0,
};
const tableCache = new Map();

/** Single-cycle table whose top harmonic stays below 20 kHz for any pitch up to topMidi (+1.2 st margin). */
function getTable(specName, topMidi) {
  const band = Math.ceil(topMidi / 2);
  const key = specName + ':' + band;
  let t = tableCache.get(key);
  if (t) return t;
  const fTop = mtof(band * 2 + 1.2);
  const K = Math.max(1, Math.min(TS / 8, Math.floor(20000 / fTop)));
  const re = new Float64Array(TS), im = new Float64Array(TS);
  const spec = SPECTRA[specName];
  let e = 0;
  for (let k = 1; k <= K; k++) {
    const a = spec(k);
    im[k] = (-a * TS) / 2;
    im[TS - k] = (a * TS) / 2;
    e += (a * a) / 2;
  }
  fft(re, im, true);
  t = new Float32Array(TS + 1);
  const norm = 1 / Math.sqrt(e);
  for (let i = 0; i < TS; i++) t[i] = re[i] * norm;
  t[TS] = t[0];
  tableCache.set(key, t);
  return t;
}

// ---------------------------------------------------------------- expression curves

export const EXPR = {
  flat: [[0, 1], [1, 1]],
  cresc: [[0, 0.3], [1, 1]],
  dim: [[0, 1], [1, 0.25]],
  swell: [[0, 0.25], [0.55, 1], [1, 0.3]],
  hairpin: [[0, 0.25], [0.5, 1], [1, 0.25]],
  fp: [[0, 1], [0.1, 0.4], [1, 0.85]],
  rise: [[0, 0.05], [1, 1]],
  fade: [[0, 1], [1, 0.02]],
  niente: [[0, 0.02], [0.5, 1], [1, 0.02]],
};
function exprPoints(e) {
  if (!e) return null;
  if (typeof e === 'string') {
    if (!EXPR[e]) throw new Error('unknown expr "' + e + '"');
    return e === 'flat' ? null : EXPR[e];
  }
  return e;
}

// ---------------------------------------------------------------- sustained (wavetable) core

/** Smooth value noise from the shared noise table: x in "cells" (rate * seconds), result about -1..1. */
const vn = (base, x) => {
  const i = Math.floor(x), f = x - i;
  const a = NOISE[(base + i) & NOISE_MASK], b = NOISE[(base + i + 1) & NOISE_MASK];
  return a + (b - a) * f * f * (3 - 2 * f);
};

function makeVoices(rng, count, o) {
  const vs = [];
  let mean = 0;
  // stratified detune (sections): the players are spread evenly over +-detune in a random order, so a section never
  // lands near unison by chance (which makes slow-beating low notes louder or softer by several dB at random)
  let slots = null;
  if (o.stratify && count > 1) {
    slots = Array.from({ length: count }, (_, i) => ((i + 0.5) / count) * 2 - 1);
    for (let i = count - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
  }
  for (let i = 0; i < count; i++) {
    const det = slots ? (slots[i] + ((rng() - 0.5) * 0.7) / count) * o.detune : (rng() * 2 - 1) * o.detune;
    mean += det;
    const pos = count > 1 ? (i / (count - 1)) * 2 - 1 : 0;
    const [gl, gr] = panGains(o.pan + o.spread * pos + (count > 1 ? (rng() - 0.5) * 0.06 : 0));
    const st = o.stagger || 0;
    vs.push({
      detune: det, phase: rng(), gl, gr,
      vibRate: o.vibRate * (0.9 + 0.2 * rng()), vibDepth: o.vibDepth * (count > 1 ? 0.65 + 0.7 * rng() : 1),
      vibDelay: o.vibDelay * (count > 1 ? 0.6 + 0.8 * rng() : 1), vibRamp: o.vibRamp * (0.75 + 0.5 * rng()),
      vibGrow: o.vibGrow, vibPhase: rng() * TAU,
      // a player's vibrato is never regular: its rate and depth wander slowly (two sines) and randomly (value noise)
      irA: o.vibIrreg ?? 0.06, irR1: 0.31 + 0.5 * rng(), irP1: rng() * TAU, irR2: 1.1 + 1.2 * rng(), irP2: rng() * TAU,
      irR3: 0.23 + 0.45 * rng(), irP3: rng() * TAU, irP4: rng() * TAU,
      driftA: o.drift * (0.6 + 0.8 * rng()), driftR1: 0.3 + 0.5 * rng(), driftP1: rng() * TAU,
      driftR2: (o.jitterRate || 0.45) * (1 + rng()), driftP2: rng() * TAU,
      // players never start together: one leads, the others follow 8-40 ms later (with stagger 0.04)
      onset: i === 0 || st <= 0 ? 0 : Math.min(st, 0.008 + (st - 0.008) * Math.pow(rng(), 1.2)), onRamp: 0.015 + 0.03 * rng(),
      gain: (0.8 + 0.4 * rng()) / Math.sqrt(count),
      wobA: count > 1 ? 0.14 * rng() : 0.04, wobR: 0.3 + 0.9 * rng(), wobP: rng() * TAU,
      tremRate: o.trem ? o.trem * (0.88 + 0.24 * rng()) : 0, tremP: rng() * Math.PI,
      // each player finds the pitch with a small scoop of his own (mostly from below)
      scoop: o.scoop ? o.scoop * (0.35 + 0.9 * rng()) * (rng() < 0.15 ? -0.4 : 1) : 0, scoopT: (o.scoopTime ?? 0.08) * (0.7 + 0.6 * rng()),
      // bow contact point (fraction of the string): sets where the slip-time notches fall
      beta: (o.beta ?? 0.11) * (0.8 + 0.4 * rng()),
      nz: [0, 0, 0, 0, 0, 0, 0].map(() => (rng() * NOISE_LEN) | 0),
    });
  }
  // power-weighted zero mean, so the section as a whole is in tune
  let w = 0; mean = 0;
  for (const v of vs) { mean += v.detune * v.gain * v.gain; w += v.gain * v.gain; }
  mean /= w;
  for (const v of vs) v.detune -= mean;
  return vs;
}

/**
 * Per player: the list of events inside a legato chain (pitch transitions, bow changes, re-articulations).
 * Every player changes pitch at a slightly different moment and speed, and changes bow when his bow runs out.
 */
function voiceTransitions(v, segs, P, rng, solo, end) {
  const tr = [];
  const Lg = P.leg || DEFAULT_LEG, B = P.bow;
  const S = segs.length;
  const s0 = segs[0];
  if (s0.glideFrom != null && s0.glideFrom !== s0.midi) {
    // explicit glideFrom on the first note: the classic portamento into the note
    const gt = Math.min(s0.glideTime ?? 0.11, s0.dur * 0.6);
    tr.push({ t0: 0, t1: Math.max(gt, 0.005), from: s0.glideFrom, to: s0.midi, pitch: true, legacy: true, dip: 0, win: gt, bow: false, br: 0 });
  }
  const newBow = () => (B ? B.len * (0.7 + 0.6 * rng()) : Infinity);
  let bowAt = v.onset, bowLen = newBow();
  for (let j = 0; j < S; j++) {
    const sg = segs[j];
    if (j > 0 && Lg) {
      const pv = segs[j - 1];
      const iv = sg.midi - pv.midi, aiv = Math.abs(iv);
      const vel = clamp(sg.vel, 0, 1);
      // 30-120 ms: wider intervals take longer, louder playing is quicker
      let tg = sg.glideTime ?? clamp((0.032 + 0.011 * aiv) * (1.2 - 0.45 * vel), 0.03, 0.12);
      if (!solo) tg *= 0.55 + 0.6 * rng();
      tg = Math.max(0.012, Math.min(tg, 0.45 * pv.dur, 0.45 * sg.dur));
      const off = solo ? 0 : (rng() * 2 - 1) * Lg.jit;
      const t0 = Math.max(pv.t + 0.02, sg.t - 0.6 * tg + off);
      const same = aiv < 0.01;
      const bow = same || (B != null && t0 - bowAt > bowLen);
      if (bow) { bowAt = t0; bowLen = newBow(); }
      const dip = bow ? (B ? B.dip : Lg.reart) * (solo ? 1 : 0.75 + 0.5 * rng())
        : Lg.dip * (0.55 + 0.45 * Math.min(1, aiv / 5)) * (solo ? 1 : 0.7 + 0.6 * rng());
      tr.push({ t0, t1: t0 + tg, from: pv.midi, to: sg.midi, pitch: !same, dip, win: bow ? 0.09 : tg * 1.5, bow, br: bow ? 0 : Lg.brightDip });
    }
    if (B) {
      // a long note outlasts the bow: the player changes bow somewhere in the middle (each player at his own time)
      const stop = (j + 1 < S ? segs[j + 1].t : end) - 0.35;
      while (bowAt + bowLen < stop) {
        bowAt += bowLen; bowLen = newBow();
        tr.push({ t0: bowAt, t1: bowAt + 0.05, from: sg.midi, to: sg.midi, pitch: false, dip: B.dip * (solo ? 0.8 : 0.6 + 0.5 * rng()), win: 0.09, bow: true, br: 0 });
      }
    }
  }
  tr.sort((a, b) => a.t0 - b.t0);
  // length of the note that each pitch transition starts (vibrato grows through a note)
  let first = end;
  for (let k = 0; k < tr.length; k++) {
    if (!tr[k].pitch || tr[k].legacy) continue;
    if (first === end) first = tr[k].t0;
    let nx = end;
    for (let q = k + 1; q < tr.length; q++) if (tr[q].pitch) { nx = tr[q].t0; break; }
    tr[k].nd = Math.max(0.05, nx - tr[k].t1);
  }
  tr.firstDur = Math.max(0.05, first);
  return tr;
}

const DEFAULT_LEG = { dip: 0.25, brightDip: 0.15, jit: 0.01, carry: 0.6, reart: 0.4 };
const portaCurve = (u) => smoothstep(Math.pow(u, 1.25)); // the finger moves late and arrives quickly
const bowShape = (u) => (u < 0.3 ? smoothstep(u / 0.3) : 1 - smoothstep((u - 0.3) / 0.7));
const RING = 1024, RING_MASK = RING - 1;

/**
 * Register trims in dB (midi -> dB, linear between points, held beyond the ends). The 2026-11 timbre rebuild changed
 * the spectra (new solo bodies, slip time, bow pressure, moving vowels); these trims keep the loudness of every
 * instrument per register equal to the previous engine (measured on 3 s notes, 3 velocities, 3 seeds, smoothed over
 * a few semitones), so the existing mixes keep their balance. The note-to-note character of a body is not trimmed.
 * pizz_*: flat per section (the round-robin pluck points). Re-measure them whenever a sustained core changes.
 */
const TRIMS = {
  violins: [[55,0.55],[57,0.7],[59,0.7],[61,0.48],[63,0.48],[65,0.49],[67,0.37],[69,0.25],[71,0.22],[73,0.33],[75,0.45],[77,0.45],[79,0.45],[81,0.38],[83,0.21],[85,0.02],[87,-0.11],[89,-0.1],[91,0],[93,-0.07],[95,-0.19],[97,-0.34],[99,-0.52]],
  violas: [[48,0.2],[50,0.09],[52,-0.14],[54,-0.09],[56,0.02],[58,0.16],[60,0.4],[62,0.44],[64,0.43],[66,0.56],[68,0.63],[70,0.58],[72,0.37],[74,0.26],[76,0.2],[78,0.2],[80,0.16],[82,0.16],[84,0.28],[86,0.18],[88,0.1]],
  celli: [[36,0.56],[38,0.33],[40,0.2],[42,0.36],[44,0.48],[46,0.48],[48,0.31],[50,-0.06],[52,-0.08],[54,0.18],[56,0.27],[58,0.3],[60,0.37],[62,0.2],[64,0.08],[66,0.21],[68,0.28],[70,0.41],[72,0.41],[74,0.49],[76,0.69],[78,0.76],[80,0.6]],
  basses: [[28,-0.52],[30,-0.22],[32,-0.16],[34,-0.46],[36,-0.25],[38,0.04],[40,0.5],[42,1.07],[44,0.97],[46,0.47],[48,0.2],[50,0.04],[52,-0.01],[54,-0.06],[56,-0.41]],
  tremolo: [[48,0.91],[51,0.67],[54,0.62],[57,0.62],[60,0.38],[63,0.25],[66,0.25],[69,0.2],[72,0.06],[75,-0.01],[78,0.23],[81,0.4],[84,0.28],[87,0.16],[90,0.2]],
  soloViolin: [[55,1.47],[57,0.98],[59,0.42],[61,0.07],[63,1.21],[65,2.65],[67,3.23],[69,2.15],[71,0.66],[73,0.54],[75,1.97],[77,2.54],[79,2.39],[81,1.75],[83,1.05],[85,1.24],[87,1.56],[89,0.88],[91,-0.12],[93,-0.31],[95,-0.11],[97,-1.13]],
  soloCello: [[36,1.27],[38,1],[40,0.39],[42,-0.16],[44,-0.99],[46,0.8],[48,2.39],[50,2.44],[52,1.57],[54,1.17],[56,0.25],[58,0.53],[60,1.66],[62,2.86],[64,2.64],[66,2.83],[68,2.02],[70,1.95],[72,2.49],[74,1.54],[76,0.9],[78,1.44]],
  horn: [[36,-0.09],[38,-0.32],[40,-0.39],[42,-0.29],[44,-0.19],[46,-0.13],[48,0.17],[50,0.35],[52,0.29],[54,0.02],[56,-0.29],[58,-0.5],[60,-0.3],[62,-0.13],[64,-0.15],[66,-0.15],[68,0.12],[70,0.23],[72,0.21],[74,0.16],[76,0.12]],
  flute: [[60,-0.11],[62,0.01],[64,0.14],[66,0.26],[68,0.16],[70,0.12],[72,0.11],[74,0.12],[76,0.06],[78,-0.02],[80,0.16],[82,0.38],[84,0.46],[86,0.14],[88,-0.1],[90,-0.02],[92,0.26],[94,0.47],[96,0.55]],
  ooh: [[46,1.2],[48,0.56],[50,0.22],[52,0.59],[54,0.8],[56,0.07],[58,-0.37],[60,0.26],[62,1.61],[64,2.33],[66,1.39],[68,-0.84],[70,-2.52],[72,-2.63],[74,-2.23]],
  aah: [[45,-0.1],[51,-1.9],[57,-0.75],[63,-2.13],[69,-3.99],[75,-1.48]],
  mm: [[45,0.73],[55,1.26],[65,-1.08],[75,-0.1]],
  pizz_violins: [[55,0],[99,0]],
  pizz_violas: [[48,1.2],[88,1.2]],
  pizz_celli: [[36,-0.6],[80,-0.6]],
  pizz_basses: [[28,0],[60,0]],
};
const trimOf = (name) => {
  const t = TRIMS[name];
  return (m) => {
    let d;
    if (m <= t[0][0]) d = t[0][1];
    else if (m >= t[t.length - 1][0]) d = t[t.length - 1][1];
    else { let i = 1; while (t[i][0] < m) i++; const [a, x] = t[i - 1], [b, y] = t[i]; d = x + ((y - x) * (m - a)) / (b - a); }
    return Math.pow(10, d / 20);
  };
};
const TRIM_FN = Object.fromEntries(Object.keys(TRIMS).map((k) => [k, trimOf(k)]));

/**
 * One note, or a legato chain of notes (nt._segs = [{ t, dur, midi, vel, expr, bright, amp, glideFrom, glideTime }],
 * t relative to the chain start), played by P.voices as ONE continuous sound per player.
 */
function renderSustained(emit, nt, rng, P) {
  const segs = nt._segs || [{ t: 0, dur: Math.max(nt.dur, 0.04), midi: nt.midi, vel: nt.vel, expr: nt.expr, bright: nt.bright, amp: nt.amp, glideFrom: nt.glideFrom, glideTime: nt.glideTime }];
  const S = segs.length, last = segs[S - 1];
  const dur = Math.max(last.t + last.dur, 0.04);
  const attack = Math.max(0.004, P.attack), release = Math.max(0.01, P.release);
  const total = dur + release + 0.002;
  const n = Math.ceil(total * SR) + 1;
  const L = scratch(0, n), R = scratch(1, n);
  const CB = 32;
  const nb = Math.ceil(n / CB);
  const solo = P.voices.length === 1;
  const amp0 = nt.amp ?? 1;

  // shared curves per control block: dynamic (velocity x expression), written pitch, brightness, level
  const dynA = new Float32Array(nb + 1), midA = new Float32Array(nb + 1), brA = new Float32Array(nb + 1), ampA = new Float32Array(nb + 1), dipA = new Float32Array(nb + 1);
  {
    const exprs = segs.map((s) => exprPoints(s.expr));
    const kS = 1 - Math.exp(-CB / (0.03 * SR));
    let j = 0, d = 0, m = 0, br = 1, am = 1;
    const bd = P.leg ? P.leg.brightDip : 0;
    for (let b = 0; b <= nb; b++) {
      const t = Math.min(n, b * CB) / SR;
      while (j + 1 < S && t >= segs[j + 1].t) j++;
      const sg = segs[j];
      const u = clamp((t - sg.t) / sg.dur, 0, 1);
      const raw = clamp(sg.vel, 0, 1) * (exprs[j] ? curveAt(exprs[j], u) : 1);
      const rb = sg.bright ?? 1, ra = ((sg.amp ?? 1) / amp0) * (P.trim ? P.trim(sg.midi) : 1);
      if (b === 0) { d = raw; m = sg.midi; br = rb; am = ra; } else { d += (raw - d) * kS; m += (sg.midi - m) * kS; br += (rb - br) * kS; am += (ra - am) * kS; }
      dynA[b] = d; midA[b] = m; brA[b] = br; ampA[b] = am;
      if (bd > 0 && S > 1) {
        // the section darkens a little while it changes notes
        let dd = 0;
        for (let q = j; q <= j + 1; q++) {
          if (q < 1 || q >= S) continue;
          const x = (t - segs[q].t) / 0.06;
          if (x > -1 && x < 1) { const s = Math.cos((Math.PI * x) / 2); if (s * s > dd) dd = s * s; }
        }
        dipA[b] = bd * dd;
      }
    }
  }

  // Each voice wanders, but the power-weighted centre of the section stays exactly on pitch:
  // the mean drift of the ensemble is removed (a single voice keeps its own drift).
  const driftOf = (v, t) => v.driftA * Math.sin(TAU * v.driftR1 * t + v.driftP1) + v.driftA * 0.6 * Math.sin(TAU * v.driftR2 * t + v.driftP2);
  let meanDrift = null;
  if (!solo) {
    meanDrift = new Float32Array(nb + 1);
    let wsum = 0;
    for (const v of P.voices) wsum += v.gain * v.gain;
    for (let b = 0; b <= nb; b++) {
      const t = Math.min(n, b * CB) / SR;
      let s = 0;
      for (const v of P.voices) s += driftOf(v, t) * v.gain * v.gain;
      meanDrift[b] = s / wsum;
    }
  }
  const tabs = [], tabs2 = [];
  const tabFor = (m) => { const k = Math.ceil(m / 2); return tabs[k] || (tabs[k] = getTable(P.spec, m)); };
  const tab2For = (m) => { const k = Math.ceil(m / 2); return tabs2[k] || (tabs2[k] = getTable(P.spec2, m)); };
  const b2lo = P.bright2 ? P.bright2[0] : 0, b2hi = P.bright2 ? P.bright2[1] : 1, att2 = P.bright2 ? P.bright2[2] ?? 0 : 0;
  const mixOf = (d) => { const u = clamp((d - b2lo) / (b2hi - b2lo), 0, 1); return u * u * (3 - 2 * u); };
  const ampVib = P.ampVib || 0;
  const jitC = P.jitter || 0, shim = P.shimmer || 0;
  const press = P.press || null, slip = P.slip || null, bn = P.bowNoise || null;
  const noiseBump = P.bow ? new Float32Array(nb + 1) : null;
  const ring = slip ? new Float64Array(RING) : null;
  const bnC = bn ? biquad('bandpass', bn.f, bn.q) : null;
  const nV = P.voices.length;

  for (const v of P.voices) {
    const tr = voiceTransitions(v, segs, P, rng, solo, dur);
    const K = tr.length;
    let kp = 0, kd = 0;
    let curMidi = segs[0].midi, noteStart = -1, noteDur = tr.firstDur;
    let vibPh = v.vibPhase, lastT = 0;
    const nz = v.nz;
    // state of the per-sample filters of this player
    let lp = 0, cs = 0, wpos = 0, bz1 = 0, bz2 = 0, bni = nz[6];
    if (ring) ring.fill(0);
    let phase = v.phase;
    let inc = 0, amp = 0, mix = 0, D = press ? press.base : 0, dS = 4, nAmp = 0, kL = 0.1;
    for (let b = -1; b < nb; b++) {
      // b = -1 initialises the state at t = 0, then each block ramps from the previous block end to its own end
      const i0 = b < 0 ? 0 : b * CB, i1 = b < 0 ? 0 : Math.min(n, i0 + CB);
      const bi = b + 1;
      const t = i1 / SR;
      // ---- pitch: the written line with this player's own transitions
      while (kp < K && t >= tr[kp].t1) {
        const q = tr[kp];
        if (q.pitch) { curMidi = q.to; if (!q.legacy) { noteStart = q.t1; noteDur = q.nd; } }
        kp++;
      }
      let midiNow = curMidi, tabMidi = curMidi, moving = 0;
      if (kp < K && tr[kp].pitch && t > tr[kp].t0) {
        const q = tr[kp];
        const u = (t - q.t0) / (q.t1 - q.t0);
        midiNow = q.from + (q.to - q.from) * (q.legacy ? smoothstep(u) : portaCurve(u));
        tabMidi = Math.max(q.from, q.to);
        moving = q.legacy ? 0 : Math.sin(Math.PI * clamp(u, 0, 1));
      }
      // ---- dips (legato note change, bow change, re-articulation) and their brightness
      let dipG = 1, brMod = 0, nzB = 0;
      while (kd < K && t > tr[kd].t0 + tr[kd].win) kd++;
      for (let q = kd; q < K && tr[q].t0 < t; q++) {
        const e = tr[q];
        const u = (t - e.t0) / e.win;
        if (u >= 1) continue;
        if (e.bow) {
          const s = bowShape(u);
          dipG *= 1 - e.dip * s;
          if (u > 0.3) { brMod -= 0.18 * s; nzB += s; }
        } else {
          const s = Math.sin(Math.PI * u) ** 2;
          dipG *= 1 - e.dip * s;
          brMod += e.br * s;
        }
      }
      if (noiseBump && nzB > 0) noiseBump[bi] += (nzB * P.bow.noise) / nV;
      // ---- cents around the current pitch
      let c = v.detune + driftOf(v, t) - (meanDrift ? meanDrift[bi] : 0);
      let vibNow = 0;
      if (v.vibDepth > 0) {
        const w1 = (Math.sin(TAU * v.irR1 * t + v.irP1) + 0.6 * Math.sin(TAU * v.irR2 * t + v.irP2)) * 0.625 + 0.7 * vn(nz[0], t * 0.9);
        vibPh += TAU * v.vibRate * (1 + v.irA * w1) * (t - lastT);
        lastT = t;
        let ramp, grow;
        if (noteStart < 0) {
          const tv = t - v.onset - v.vibDelay;
          ramp = tv <= 0 ? 0 : tv < v.vibRamp ? smoothstep(tv / v.vibRamp) : 1;
          grow = Math.min(1, t / noteDur);
        } else {
          // a new note inside a slur: the vibrato does not stop, it narrows and grows back
          const tn = t - noteStart;
          const carry = P.leg ? P.leg.carry : 0.5;
          ramp = carry + (1 - carry) * smoothstep((tn - 0.35 * v.vibDelay) / v.vibRamp);
          grow = Math.min(1, tn / noteDur);
        }
        if (ramp > 0) {
          const w2 = (Math.sin(TAU * v.irR3 * t + v.irP3) + 0.6 * Math.sin(TAU * v.irR2 * 0.73 * t + v.irP4)) * 0.625 + 0.8 * vn(nz[1], t * 1.3);
          const depth = ramp * (1 + 3.2 * v.irA * w2 + 0.12 * vn(nz[2], t * v.vibRate)) * (1 - 0.6 * moving);
          c += v.vibDepth * (1 + v.vibGrow * grow) * depth * Math.sin(vibPh);
          // the level pulse leads the pitch by a quarter cycle: uncorrelated with it, so it cannot bias the heard pitch
          vibNow = depth * Math.cos(vibPh);
        }
      } else lastT = t;
      const to = t - v.onset;
      if (v.scoop !== 0 && to >= 0 && to < v.scoopT) { const u = 1 - to / v.scoopT; c += v.scoop * u * u; }
      if (jitC) c += jitC * vn(nz[3], t * 45);
      const fNow = mtof(midiNow + c / 100);
      const incT = fNow / SR;
      // ---- level of this player
      let a = v.gain * dipG;
      if (to <= 0) a = 0; else if (to < v.onRamp) a *= to / v.onRamp;
      a *= 1 + v.wobA * Math.sin(TAU * v.wobR * t + v.wobP);
      if (ampVib) a *= 1 + ampVib * vibNow;
      if (shim) a *= 1 + shim * vn(nz[4], t * 30);
      if (v.tremRate) { const s = Math.sin(Math.PI * v.tremRate * t + v.tremP); a *= 0.2 + 0.8 * s * s; }
      const dyn = dynA[bi];
      // ---- bow pressure (brightness wander), slip time, bow noise
      const DT = press ? clamp(press.base + press.depth * vn(nz[5], t * press.rate) + brMod, -0.4, 0.9) : 0;
      const kLT = press ? 1 - Math.exp((-TAU * clamp(fNow * 2.2, 400, 5000)) / SR) : 0;
      let dST = 0;
      if (slip) {
        const atk = to > 0 ? 1 + slip.att * (1 - dyn) * Math.exp(-to / 0.06) : 1 + slip.att;
        // the first slip notch never falls below ~1.2 kHz: low notes keep their upper harmonics (small speakers need them)
        dST = clamp((v.beta * (1.3 - 0.55 * dyn) * atk * (1 + 0.12 * vn(nz[5] + 7777, t * 0.6)) * SR) / fNow, 1, SR / 1200);
      }
      const nAT = bn ? bn.level * (1.5 - 0.7 * dyn) * (1 + bn.chiff * Math.exp(-Math.max(0, to) / 0.045) + 1.5 * nzB) : 0;
      const mixT = P.spec2 ? mixOf(dyn) : 0;
      if (b < 0) { inc = incT; amp = 0; mix = mixT; D = DT; kL = kLT; dS = dST; nAmp = nAT; continue; }
      const tab = tabFor(tabMidi), tab2 = P.spec2 ? tab2For(tabMidi) : null;
      const m = i1 - i0;
      const dInc = (incT - inc) / m, dA = (a - amp) / m, dM = (mixT - mix) / m, dD = (DT - D) / m, dDS = (dST - dS) / m, dNA = (nAT - nAmp) / m;
      kL = kLT;
      const g = slip ? slip.g : 0;
      for (let i = i0; i < i1; i++) {
        const pos = phase * TS;
        const k = pos | 0, fr = pos - k;
        const s0 = tab[k];
        let x = s0 + fr * (tab[k + 1] - s0);
        if (tab2) {
          const s1 = tab2[k];
          const x1 = s1 + fr * (tab2[k + 1] - s1);
          x = (x + mix * (x1 - x)) * (1 - att2 * mix);
          mix += dM;
        }
        if (ring) {
          // finite slip time: the mean over the last dS samples (running sum), mixed with the sharp Helmholtz wave
          cs += x;
          ring[wpos & RING_MASK] = cs;
          const rp = wpos - dS, ri = Math.floor(rp), rf = rp - ri;
          const d0 = ring[ri & RING_MASK];
          const avg = (cs - (d0 + rf * (ring[(ri + 1) & RING_MASK] - d0))) / dS;
          x += g * (avg - x);
          wpos++; dS += dDS;
        }
        if (press) { lp += kL * (x - lp); x -= D * (x - lp); D += dD; }
        if (bnC) {
          // bow noise, pulsed at the slip of every period
          const w = NOISE[bni++ & NOISE_MASK];
          const y = bnC.b0 * w + bz1; bz1 = bnC.b1 * w - bnC.a1 * y + bz2; bz2 = bnC.b2 * w - bnC.a2 * y;
          const p = 0.6 + 0.4 * Math.cos(TAU * phase);
          x += y * nAmp * p * p;
          nAmp += dNA;
        }
        const s = x * amp;
        L[i] += s * v.gl; R[i] += s * v.gr;
        phase += inc; if (phase >= 1) phase -= 1;
        inc += dInc; amp += dA;
      }
    }
  }

  // note-level: envelope, expression, dynamic low-pass, bow/breath noise
  const cutLo = P.cutLo, cutRatio = P.cutHi / P.cutLo;
  const kq = 1 / (P.q ?? 0.75);
  const ampRef = P.amp;
  const nLev = P.noise || 0;
  const nb1 = nLev > 0 ? biquad('bandpass', P.noiseF || 3000, P.noiseQ || 0.8) : null;
  let nzL1 = 0, nzL2 = 0, nzR1 = 0, nzR2 = 0;
  let niL = (rng() * NOISE.length) | 0, niR = (rng() * NOISE.length) | 0;
  const chiff = P.chiff || 0;
  const keytrack = P.keytrack ?? 0.3;
  let ic1L = 0, ic2L = 0, ic1R = 0, ic2R = 0;
  let g = 0, ng = 0;
  for (let b = 0; b < nb; b++) {
    const i0 = b * CB, i1 = Math.min(n, i0 + CB);
    const t = i1 / SR;
    const A = t < attack ? smoothstep(t / attack) : 1;
    let Rl = 1;
    if (t > dur) { const u = 1 - (t - dur) / release; Rl = u > 0 ? u * u : 0; }
    const dyn = dynA[b + 1];
    const gT = A * Rl * Math.pow(dyn, 1.4) * ampRef * ampA[b + 1];
    const kt = Math.pow(2, ((midA[b + 1] - 60) / 12) * keytrack) * brA[b + 1];
    const fc = clamp(cutLo * Math.pow(cutRatio, dyn) * kt * (0.6 + 0.4 * A) * (0.75 + 0.25 * Rl) * (1 - dipA[b + 1]), 60, 17000);
    const gg = Math.tan((Math.PI * fc) / SR);
    const a1 = 1 / (1 + gg * (gg + kq)), a2 = gg * a1, a3 = gg * a2;
    const ngT = nLev * (0.35 + 0.65 * dyn) * (1 + chiff * Math.exp(-t / 0.05) + (noiseBump ? noiseBump[b + 1] : 0));
    const m = i1 - i0;
    const dG = (gT - g) / m, dN = (ngT - ng) / m;
    if (nb1) {
      const { b0, b1, b2, a1: na1, a2: na2 } = nb1;
      for (let i = i0; i < i1; i++) {
        let x = L[i];
        let v3 = x - ic2L, v1 = a1 * ic1L + a2 * v3, v2 = ic2L + a2 * ic1L + a3 * v3;
        ic1L = 2 * v1 - ic1L; ic2L = 2 * v2 - ic2L;
        let w = NOISE[niL++ & NOISE_MASK];
        let y = b0 * w + nzL1; nzL1 = b1 * w - na1 * y + nzL2; nzL2 = b2 * w - na2 * y;
        L[i] = (v2 + y * ng) * g;
        x = R[i];
        v3 = x - ic2R; v1 = a1 * ic1R + a2 * v3; v2 = ic2R + a2 * ic1R + a3 * v3;
        ic1R = 2 * v1 - ic1R; ic2R = 2 * v2 - ic2R;
        w = NOISE[niR++ & NOISE_MASK];
        y = b0 * w + nzR1; nzR1 = b1 * w - na1 * y + nzR2; nzR2 = b2 * w - na2 * y;
        R[i] = (v2 + y * ng) * g;
        g += dG; ng += dN;
      }
    } else {
      for (let i = i0; i < i1; i++) {
        let x = L[i];
        let v3 = x - ic2L, v1 = a1 * ic1L + a2 * v3, v2 = ic2L + a2 * ic1L + a3 * v3;
        ic1L = 2 * v1 - ic1L; ic2L = 2 * v2 - ic2L;
        L[i] = v2 * g;
        x = R[i];
        v3 = x - ic2R; v1 = a1 * ic1R + a2 * v3; v2 = ic2R + a2 * ic1R + a3 * v3;
        ic1R = 2 * v1 - ic1R; ic2R = 2 * v2 - ic2R;
        R[i] = v2 * g;
        g += dG;
      }
    }
  }
  L[n - 1] = 0; R[n - 1] = 0;
  if (P.capture) return P.capture(L, R, n);
  emit(P.layer, P.body, nt.t, L, R, n);
}

// ---------------------------------------------------------------- string bodies

const VIOLIN_BODY = [[280, 3, 4], [460, 2.5, 3], [700, 2, 3], [1000, -1.5, 2.5], [1500, -1, 2.5], [2400, 2.5, 1.2], [3300, 1, 2]];
const bodyCache = new Map();
function stringBody(scale, sordino) {
  const key = scale + ':' + (sordino ? 1 : 0);
  let b = bodyCache.get(key);
  if (b) return b;
  const series = VIOLIN_BODY.map(([f, g, q]) => ({ type: 'peak', f: f * scale, gain: g, q }));
  // the body radiates the low harmonics less efficiently than the bridge drives them: flatten the saw tilt
  series.push({ type: 'lowshelf', f: 800 * scale, gain: -8 });
  series.push({ type: 'highshelf', f: 5500 * Math.sqrt(scale), gain: sordino ? -13 : -6 });
  series.push({ type: 'lowpass', f: 11000 * Math.pow(scale, 0.3), q: 0.707 });
  series.push({ type: 'highpass', f: 150 * scale, q: 0.707 });
  if (sordino) series.push({ type: 'peak', f: 1900 * Math.sqrt(scale), gain: -6, q: 0.8 });
  b = { series };
  bodyCache.set(key, b);
  return b;
}

/**
 * Solo violin / cello body. Measured violin bodies show: the air mode A0 near 280 Hz, the two main wood (corpus)
 * modes B1- near 450 and B1+ near 550 Hz, a weaker "nasal" region around 1-1.5 kHz, the bridge hill at 2-3 kHz and a
 * steep roll-off above about 5 kHz. Above 600 Hz the response is a dense thicket of sharp plate modes: a vibrato
 * sweeps every harmonic across their slopes, so the harmonics flicker in level (the living solo tone).
 * The cello is the same plan scaled down (modes x0.38, bridge hill and roll-off x0.66).
 */
function soloBody(cello) {
  const key = 'solo:' + (cello ? 'c' : 'v');
  let b = bodyCache.get(key);
  if (b) return b;
  const s = cello ? 0.38 : 1, h = cello ? 0.66 : 1;
  const series = [
    { type: 'highpass', f: 205 * s, q: 0.95 },
    { type: 'lowshelf', f: 900 * s, gain: -7 },
    { type: 'peak', f: 280 * s, gain: cello ? 3.5 : 4.5, q: 7 }, // A0 air mode
    { type: 'peak', f: 380 * s, gain: -2, q: 4 },     // between A0 and the corpus modes
    { type: 'peak', f: 455 * s, gain: 3.5, q: 8 },    // B1-
    { type: 'peak', f: 550 * s, gain: 4, q: 8 },      // B1+
    { type: 'peak', f: 1250 * h, gain: -3.5, q: 0.8 },// "nasal" region kept low
    { type: 'peak', f: 2600 * h, gain: 5, q: 0.9 },   // bridge hill
    { type: 'lowpass', f: 6500 * h, q: 0.75 },        // roll-off above ~5 kHz (24 dB/oct with the next)
    { type: 'lowpass', f: 8500 * h, q: 0.6 },
  ];
  const r = mulberry32(cello ? 0xce110 : 0x7101e);
  let f = 880 * Math.sqrt(s);
  for (let i = 0; f < 4800 * h; i++) {
    f *= 1.055 + 0.05 * r();
    series.push({ type: 'peak', f, gain: (i % 2 ? -2.6 : 3.2) * (0.6 + 0.7 * r()), q: 14 + 12 * r() + 0.004 * f });
  }
  b = { series };
  bodyCache.set(key, b);
  return b;
}

const SECTIONS = {
  violins: { players: 7, body: 1.0, cutLo: 900, cutHi: 8500, attack: 0.13, release: 0.3, spread: 0.26, pizzT: 0.72 },
  violins2: { players: 6, body: 0.97, cutLo: 850, cutHi: 8000, attack: 0.13, release: 0.3, spread: 0.24, pizzT: 0.72 },
  violas: { players: 6, body: 0.74, cutLo: 750, cutHi: 7000, attack: 0.14, release: 0.32, spread: 0.24, pizzT: 0.85 },
  celli: { players: 5, body: 0.44, cutLo: 520, cutHi: 5200, attack: 0.15, release: 0.36, spread: 0.2, pizzT: 1.2 },
  basses: { players: 4, body: 0.27, cutLo: 300, cutHi: 3000, attack: 0.19, release: 0.42, spread: 0.16, pizzT: 1.6 },
};
function sectionOf(nt, fallback = 'violins') {
  const name = nt.section || fallback;
  const s = SECTIONS[name];
  if (!s) throw new Error('unknown strings section "' + name + '" (violins, violins2, violas, celli, basses)');
  return [name, s];
}

// tuning of the section-realism layer (see renderSustained): measured loudness-neutral against the old engine
const STR_TUNE = { amp: 1, leg: { dip: 0.3, brightDip: 0.12, jit: 0.02, carry: 0.6, reart: 0.4 }, bow: { len: 4.4, dip: 0.42, noise: 1.6 },
  press: { base: -0.06, depth: 0.2, rate: 0.35 }, slip: { g: 0.15, att: 0.5 }, beta: 0.12, scoop: -11, jitter: 1.1, shimmer: 0.02 };

function stringsCore(emit, nt, rng, tremolo, fallbackSection) {
  const [name, S] = sectionOf(nt, fallbackSection);
  const vel = clamp(nt.vel, 0, 1);
  const sord = !!nt.sordino;
  const vib = nt.vibrato ?? (tremolo ? 0.3 : 1);
  const T = STR_TUNE;
  // low notes: a little wider default spread (real basses and celli are less precise, and it keeps them beating)
  const lowDet = clamp(Math.pow(110 / mtof(nt.midi), 0.7), 1, 1.8);
  const voices = makeVoices(rng, nt.players ?? S.players, {
    detune: nt.detune ?? 9 * lowDet, pan: nt.pan ?? 0, spread: nt.spread ?? S.spread, stratify: true,
    vibRate: 5.6, vibDepth: 13 * vib, vibDelay: 0.22, vibRamp: 0.35, vibGrow: 0.2,
    drift: 2.8, stagger: tremolo ? 0.02 : 0.04, trem: tremolo ? (nt.tremRate ?? 12.5) : 0,
    scoop: tremolo ? T.scoop * 0.4 : T.scoop, scoopTime: 0.09, beta: T.beta,
  });
  renderSustained(emit, nt, rng, {
    spec: 'strings', voices,
    layer: 'str:' + name + (sord ? ':sord' : ''), body: stringBody(S.body, sord),
    attack: nt.attack ?? (tremolo ? 0.06 : S.attack * (1.55 - vel)), release: nt.release ?? S.release,
    cutLo: S.cutLo * (sord ? 0.75 : 1), cutHi: S.cutHi * (sord ? 0.5 : 1), keytrack: 0.3, q: 0.8,
    noise: (nt.noise ?? 1) * (tremolo ? 0.05 : 0.028), noiseF: 3800 * Math.sqrt(S.body), noiseQ: 0.7,
    leg: tremolo ? null : T.leg, bow: tremolo ? null : T.bow, press: T.press, slip: T.slip, jitter: T.jitter, shimmer: T.shimmer,
    trim: TRIM_FN[tremolo ? 'tremolo' : name === 'violins2' ? 'violins' : name],
    amp: (nt.amp ?? 1) * (sord ? 0.3 : 0.23) * (tremolo ? 1.3 : 1) * T.amp,
  });
}

const SOLO_TUNE = {
  violin: { amp: 1, beta: 1 / 8.5, cutLo: 1100, cutHi: 9000, bowNoise: { level: 0.16, f: 3200, q: 0.7, chiff: 2.2 } },
  cello: { amp: 1, beta: 1 / 9, cutLo: 650, cutHi: 6000, bowNoise: { level: 0.11, f: 1900, q: 0.7, chiff: 2.2 } },
};

function soloCore(emit, nt, rng, kind) {
  const cello = kind === 'cello';
  const T = SOLO_TUNE[kind];
  const vib = nt.vibrato ?? 1;
  const voices = makeVoices(rng, 1, {
    detune: 0, pan: nt.pan ?? 0, spread: 0,
    // expressive vibrato: starts late, grows through the note, irregular in rate and depth
    vibRate: cello ? 5.3 : 5.8, vibDepth: (cello ? 18 : 19) * vib, vibDelay: nt.vibDelay ?? 0.2, vibRamp: 0.5, vibGrow: 0.75,
    drift: 1.6, jitterRate: 3.1, stagger: 0, vibIrreg: 0.1, scoop: -8, scoopTime: 0.07, beta: T.beta,
  });
  const vel = clamp(nt.vel, 0, 1);
  renderSustained(emit, nt, rng, {
    spec: 'strings', voices,
    layer: 'solo:' + kind, body: soloBody(cello),
    attack: nt.attack ?? (cello ? 0.09 : 0.075) * (1.5 - vel), release: nt.release ?? 0.24,
    cutLo: T.cutLo, cutHi: T.cutHi, keytrack: 0.3, q: 0.8, ampVib: 0.06,
    noise: (nt.noise ?? 1) * 0.02, noiseF: cello ? 2600 : 4200, noiseQ: 0.7, chiff: 1.5,
    leg: { dip: 0.34, brightDip: 0.18, jit: 0, carry: 0.35, reart: 0.4 }, bow: { len: cello ? 4.2 : 3.6, dip: 0.33, noise: 2.5 },
    press: { base: 0, depth: 0.22, rate: 0.5 }, slip: { g: 0.32, att: 0.8 }, jitter: 2.2, shimmer: 0.035,
    bowNoise: { ...T.bowNoise, level: T.bowNoise.level * (nt.noise ?? 1) }, trim: TRIM_FN[cello ? 'soloCello' : 'soloViolin'],
    amp: (nt.amp ?? 1) * 0.25 * T.amp,
  });
}

// ---------------------------------------------------------------- winds, voices, bass

const HORN_BODY = { series: [{ type: 'peak', f: 420, gain: 4, q: 1.2 }, { type: 'peak', f: 1200, gain: 1.5, q: 1.5 }, { type: 'lowpass', f: 4800 }, { type: 'highpass', f: 60 }] };
const FLUTE_BODY = { series: [{ type: 'lowpass', f: 9000 }, { type: 'highpass', f: 180 }] };
const SUB_BODY = { series: [{ type: 'highpass', f: 28 }, { type: 'lowpass', f: 1800 }] };
const VOWELS = {
  aah: { f: [700, 1100, 2600, 3300], g: [0, -5, -17, -23], q: [5, 7, 9, 9], dry: 0.22 },
  oh: { f: [500, 870, 2550, 3300], g: [0, -7, -21, -27], q: [5, 7, 9, 9], dry: 0.23 },
  ooh: { f: [380, 800, 2500, 3300], g: [0, -10, -27, -31], q: [5, 7, 9, 9], dry: 0.25 },
  mm: { f: [280, 1000, 2400, 3300], g: [0, -22, -32, -60], q: [4, 6, 8, 8], dry: 0.3 },
};
// a held vowel slowly closes (or opens a little): target vowel and how far it goes at morph 1
const VOWEL_MORPH = { aah: ['ooh', 0.6], oh: ['ooh', 0.5], ooh: ['oh', 0.55], mm: ['ooh', 0.3] };
const CHOIR_SERIES = { series: [{ type: 'highshelf', f: 6000, gain: -6 }, { type: 'highpass', f: 90 }] };

function warmHorn(emit, nt, rng) {
  const vel = clamp(nt.vel, 0, 1);
  const players = nt.players ?? 3;
  const voices = makeVoices(rng, players, {
    detune: players > 1 ? (nt.detune ?? 4) : 0, pan: nt.pan ?? 0, spread: nt.spread ?? 0.12,
    vibRate: 4.8, vibDepth: 5 * (nt.vibrato ?? 0.2), vibDelay: 0.4, vibRamp: 0.5, vibGrow: 0,
    drift: 2.5, stagger: 0.025, scoop: -16, scoopTime: 0.055,
  });
  renderSustained(emit, nt, rng, {
    spec: 'horn', voices, layer: 'horn', body: HORN_BODY,
    attack: nt.attack ?? 0.07 * (1.6 - vel), release: nt.release ?? 0.2,
    cutLo: 300, cutHi: 3600, keytrack: 0.25, q: 0.75, spec2: 'hornBright', bright2: [0.45, 1, 0.32],
    noise: (nt.noise ?? 1) * 0.012, noiseF: 1800, noiseQ: 0.6, chiff: 1.5,
    leg: { dip: 0.22, brightDip: 0.1, jit: 0.012, carry: 0.8, reart: 0.45 }, jitter: 0.7, shimmer: 0.012, trim: TRIM_FN.horn,
    amp: (nt.amp ?? 1) * 0.2,
  });
}

function flutePad(emit, nt, rng) {
  const vel = clamp(nt.vel, 0, 1);
  const players = nt.players ?? 2;
  const voices = makeVoices(rng, players, {
    detune: players > 1 ? (nt.detune ?? 5) : 0, pan: nt.pan ?? 0, spread: nt.spread ?? 0.15,
    vibRate: 4.9, vibDepth: 8 * (nt.vibrato ?? 1), vibDelay: 0.25, vibRamp: 0.4, vibGrow: 0.2,
    drift: 3, stagger: 0.03, scoop: -6, scoopTime: 0.06,
  });
  renderSustained(emit, nt, rng, {
    spec: 'flute', voices, layer: 'flute', body: FLUTE_BODY,
    attack: nt.attack ?? 0.16 * (1.5 - vel), release: nt.release ?? 0.3,
    cutLo: 260, cutHi: 5200, keytrack: 0.85, q: 0.72, ampVib: 0.09,
    noise: (nt.noise ?? 1) * 0.07, noiseF: clamp(mtof(nt.midi) * 3, 1500, 6000), noiseQ: 1.1, chiff: 2.2,
    leg: { dip: 0.25, brightDip: 0.1, jit: 0.01, carry: 0.6, reart: 0.45 }, jitter: 0.8, shimmer: 0.02, trim: TRIM_FN.flute,
    amp: (nt.amp ?? 1) * 0.24,
  });
}

/**
 * Time-varying formant filter for one group of choir voices: four band-passes whose frequency, gain and Q glide from
 * vowel A towards vowel B (m(t) 0..1), formants scaled by `fs` (a different singer), plus the dark dry path.
 */
function formantPass(xL, xR, n, A, B, mAt, fs, outL, outR) {
  const CB = 64;
  const nf = A.f.length;
  const z = new Float64Array(nf * 4);
  let lpL = 0, lpR = 0;
  const ad = Math.exp((-TAU * 450) / SR);
  const cf = new Float64Array(nf * 5);
  for (let b0 = 0; b0 < n; b0 += CB) {
    const m = mAt(b0 / SR);
    for (let k = 0; k < nf; k++) {
      const f = (A.f[k] + (B.f[k] - A.f[k]) * m) * fs;
      const g = Math.pow(10, (A.g[k] + (B.g[k] - A.g[k]) * m) / 20);
      const c = biquad('bandpass', f, A.q[k] + (B.q[k] - A.q[k]) * m);
      cf[k * 5] = c.b0 * g; cf[k * 5 + 1] = c.b2 * g; cf[k * 5 + 2] = c.a1; cf[k * 5 + 3] = c.a2; cf[k * 5 + 4] = g;
    }
    const dry = A.dry + (B.dry - A.dry) * m;
    const e = Math.min(n, b0 + CB);
    for (let i = b0; i < e; i++) {
      const vL = xL[i], vR = xR[i];
      lpL = vL + ad * (lpL - vL); lpR = vR + ad * (lpR - vR);
      let sL = lpL * dry, sR = lpR * dry;
      for (let k = 0; k < nf; k++) {
        const o = k * 4, c = k * 5;
        // band-pass (b1 = 0), gain folded into b0/b2, transposed direct form II
        const yL = cf[c] * vL + z[o]; z[o] = -cf[c + 2] * yL + z[o + 1]; z[o + 1] = cf[c + 1] * vL - cf[c + 3] * yL;
        const yR = cf[c] * vR + z[o + 2]; z[o + 2] = -cf[c + 2] * yR + z[o + 3]; z[o + 3] = cf[c + 1] * vR - cf[c + 3] * yR;
        sL += yL; sR += yR;
      }
      outL[i] += sL; outR[i] += sR;
    }
  }
}

function choirPad(emit, nt, rng) {
  const vowel = nt.vowel || 'aah';
  const A = VOWELS[vowel];
  if (!A) throw new Error('unknown vowel "' + vowel + '" (aah, ooh, oh, mm)');
  const [toName, amt] = VOWEL_MORPH[vowel];
  const B = VOWELS[toName];
  const mor = clamp(nt.morph ?? 1, 0, 2) * amt;
  const dur = Math.max(nt.dur, 0.04);
  const players = nt.players ?? 6;
  const voices = makeVoices(rng, players, {
    detune: nt.detune ?? 14, pan: nt.pan ?? 0, spread: nt.spread ?? 0.3,
    vibRate: 5.3, vibDepth: 16 * (nt.vibrato ?? 1), vibDelay: 0.3, vibRamp: 0.5, vibGrow: 0.2,
    drift: 4.5, stagger: 0.08, scoop: -12, scoopTime: 0.12,
  });
  // the vowel closes slowly over a long note (nothing on short ones), and wanders a little
  const span = Math.max(1.6, dur * 0.85);
  const p0 = rng() * 100;
  const mAt = (t) => clamp(mor * smoothstep((t - 0.35) / span) + 0.08 * mor * vn(((p0 * 1000) | 0), t * 0.4), 0, 1);
  // two groups of singers with different formants (different voices), each through its own moving formant filter
  const groups = [voices.filter((_, i) => i % 2 === 0), voices.filter((_, i) => i % 2 === 1)].filter((g) => g.length);
  const scales = [0.965 + 0.02 * rng(), 1.02 + 0.025 * rng()];
  let outL = null, outR = null, outN = 0;
  groups.forEach((grp, gi) => {
    renderSustained(emit, nt, rng, {
      spec: 'choir', voices: grp,
      attack: nt.attack ?? 0.28, release: nt.release ?? 0.5,
      cutLo: 420, cutHi: 6500, keytrack: 0.25, q: 0.72, ampVib: 0.04,
      noise: (nt.noise ?? 1) * 0.05 / Math.sqrt(groups.length), noiseF: 2500, noiseQ: 0.6, jitter: 0.8, trim: TRIM_FN[vowel],
      amp: (nt.amp ?? 1) * 0.9,
      capture: (L, R, n) => {
        if (!outL) { outN = n; outL = new Float32Array(outN); outR = new Float32Array(outN); }
        formantPass(L, R, n, A, B, mAt, scales[gi], outL, outR);
      },
    });
  });
  emit('choir:' + vowel, CHOIR_SERIES, nt.t, outL, outR, outN);
}

function subBass(emit, nt, rng) {
  const voices = makeVoices(rng, 1, { detune: 0, pan: nt.pan ?? 0, spread: 0, vibRate: 5, vibDepth: 0, vibDelay: 0, vibRamp: 1, vibGrow: 0, drift: 1, stagger: 0 });
  renderSustained(emit, nt, rng, {
    spec: 'sub', voices, layer: 'sub', body: SUB_BODY,
    attack: nt.attack ?? 0.06, release: nt.release ?? 0.22,
    cutLo: 250, cutHi: 1600, keytrack: 0.6, q: 0.72, amp: (nt.amp ?? 1) * 0.2,
  });
}


// ---------------------------------------------------------------- modal core (decaying sine resonators)

const FLOOR = 2e-6; // resonators stop at -114 dBFS

function addPartial(L, R, n, f, a, t60, gl, gr, off = 0, ph = 0) {
  if (f >= 20000 || f <= 0) return;
  const absA = a < 0 ? -a : a;
  if (absA <= FLOOR || off >= n) return;
  const r = Math.exp(-6.907755 / (Math.max(t60, 0.004) * SR));
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

function attackRamp(L, R, n, len, off = 0) {
  const m = Math.min(n - off, Math.max(2, Math.round(len)));
  for (let i = 0; i < m; i++) {
    const g = 0.5 - 0.5 * Math.cos((Math.PI * i) / m);
    L[off + i] *= g; R[off + i] *= g;
  }
}

function dampFrom(L, R, n, from, tau) {
  const k = Math.exp(-1 / (tau * SR));
  let g = 1;
  for (let i = Math.max(0, from); i < n; i++) { g *= k; L[i] *= g; R[i] *= g; }
}

function fadeEnd(L, R, n, len) {
  const m = Math.min(n, Math.round(len));
  for (let i = 0; i < m; i++) {
    const u = i / m;
    const g = u * u * (3 - 2 * u);
    L[n - 1 - i] *= g; R[n - 1 - i] *= g;
  }
}

/** Low-passed (optionally high-passed) noise burst with an attack/decay envelope. */
function noiseBurst(L, R, n, rng, { off = 0, level = 0.02, lp = 800, hp = 0, attack = 0.001, decay = 0.02, gl = 0.707, gr = 0.707 }) {
  const m = Math.min(n - off, Math.ceil((attack * 3 + decay * 8) * SR));
  if (m <= 0) return;
  const a = Math.exp((-TAU * lp) / SR), ah = hp > 0 ? Math.exp((-TAU * hp) / SR) : 1;
  let l1 = 0, l2 = 0, h = 0;
  let idx = (rng() * NOISE.length) | 0;
  const ka = Math.exp(-1 / (attack * SR)), kd = Math.exp(-1 / (decay * SR));
  let ea = 1, ed = 1;
  const norm = level * Math.sqrt(SR / (2 * lp)) * 0.9;
  for (let i = 0; i < m; i++) {
    const w = NOISE[idx++ & NOISE_MASK];
    l1 = w + a * (l1 - w); l2 = l1 + a * (l2 - l1);
    let y = l2;
    if (hp > 0) { h = l2 + ah * (h - l2); y = l2 - h; }
    ea *= ka; ed *= kd;
    y *= (1 - ea) * ed * norm;
    L[off + i] += y * gl; R[off + i] += y * gr;
  }
}

const DC_BODY = { series: [{ type: 'highpass', f: 24, q: 0.707 }] };
const PIANO_BODY = { series: [{ type: 'lowshelf', f: 160, gain: 1.5 }, { type: 'peak', f: 2600, gain: -1.5, q: 1 }, { type: 'highshelf', f: 7000, gain: -3 }, { type: 'highpass', f: 26 }] };

function feltPiano(emit, nt, rng) {
  const midi = nt.midi, vel = clamp(nt.vel, 0.02, 1), f0 = mtof(midi);
  const hard = nt.hardness ?? 0.35;
  // round robin: no two strokes are the same (hammer contact, felt, noise), seeded per note
  const rrHard = 1 + (rng() - 0.5) * 0.14, rrNoise = 0.75 + 0.5 * rng(), rrSeed = (rng() * 4294967296) >>> 0;
  const rr = mulberry32(rrSeed);
  const fc = 330 * Math.pow(2, vel * 3.1 + hard * 1.6 + ((midi - 60) / 12) * 0.45) * rrHard;
  const B = midi >= 40 ? 7e-5 * Math.pow(2, (midi - 40) / 9.5) : 7e-5 * Math.pow(2, (40 - midi) / 24);
  const T0 = clamp(20 * Math.pow(2, -(midi - 33) / 20), 0.6, 22) * (nt.decay ?? 1);
  const ring = Math.max(nt.dur, nt.ring ?? nt.dur);
  const pedal = ring > nt.dur + 0.05 || !!nt.pedal;
  const tauD = midi > 92 ? 0 : 0.045 + 0.2 * clamp((76 - midi) / 52, 0, 1);
  const natural = Math.min(14, T0 * 2.4);
  const total = tauD > 0 ? Math.min(natural, ring + tauD * 9) : natural;
  const n = Math.ceil(total * SR) + 2;
  const L = scratch(0, n), R = scratch(1, n);
  const pan = clamp((nt.pan ?? 0) + ((midi - 64) / 50) * (nt.stereo ?? 0.4), -1, 1);
  const [gl, gr] = panGains(pan), [gl2, gr2] = panGains(pan + 0.14), [gl3, gr3] = panGains(pan - 0.14);
  const sB = Math.sqrt(1 + B);
  const amps = [], freqs = [];
  let e = 0;
  for (let k = 1; k <= 60; k++) {
    const fk = (k * f0 * Math.sqrt(1 + B * k * k)) / sB;
    if (fk > 17000) break;
    const a = (Math.abs(Math.sin(Math.PI * k * 0.12)) / k) * Math.exp(-fk / fc) * (k > 2 ? 0.87 + 0.26 * rr() : 1);
    if (k > 4 && a < 1e-5) break;
    amps.push(a); freqs.push(fk); e += a * a;
  }
  const level = ((0.02 + 0.98 * Math.pow(vel, 1.6)) * 0.3 * (nt.amp ?? 1)) / Math.sqrt(e);
  const det = (0.5 + rng()) * 0.9 * (nt.detune ?? 1);
  const c2 = Math.pow(2, det / 1200), c3 = Math.pow(2, (-det * 0.8) / 1200);
  for (let i = 0; i < amps.length; i++) {
    const a = amps[i] * level, fk = freqs[i];
    const t60 = T0 / (1 + (fk - f0) / 1400);
    if (i < 10) {
      // two-stage decay and slow beating: a fast prompt string plus slower, slightly detuned aftersound strings
      addPartial(L, R, n, fk, a * 0.6, t60 * 0.55, gl, gr);
      addPartial(L, R, n, fk * c2, a * 0.36, t60 * 1.6, gl2, gr2);
      if (midi > 45 && i < 6) addPartial(L, R, n, fk * c3, a * 0.22, t60, gl3, gr3);
      if (pedal && i < 5) {
        // sympathetic bloom under the pedal: slow-rising faint doubles (difference of two decays)
        const hd = Math.pow(2, ((rng() - 0.5) * 7) / 1200);
        addPartial(L, R, n, fk * hd, a * 0.16, t60 * 1.3, gr, gl);
        addPartial(L, R, n, fk * hd, -a * 0.16, 0.45, gr, gl);
      }
    } else {
      addPartial(L, R, n, fk, a, t60 * 0.7, gl, gr);
    }
  }
  attackRamp(L, R, n, (0.0015 + 0.007 * (1 - vel) * (1 - hard)) * SR);
  const nz = (nt.noise ?? 1) * (0.25 + 0.75 * vel) * rrNoise;
  if (nz > 0) {
    noiseBurst(L, R, n, rng, { level: 0.02 * nz, lp: clamp(200 + f0, 250, 900), attack: 0.0015, decay: 0.014, gl, gr });
    noiseBurst(L, R, n, rng, { level: 0.004 * nz, lp: 2800, hp: 900, attack: 0.001, decay: 0.006, gl: gl3, gr: gr3 });
  }
  if (tauD > 0) {
    const rel = Math.round(ring * SR);
    if (rel < n) {
      dampFrom(L, R, n, rel, tauD);
      if (nz > 0) noiseBurst(L, R, n, rng, { off: rel, level: 0.004 * (nt.noise ?? 1), lp: 500, attack: 0.004, decay: 0.02, gl, gr });
    }
  }
  fadeEnd(L, R, n, Math.min(n / 3, 0.25 * SR));
  emit('piano', PIANO_BODY, nt.t, L, R, n);
}

const HARP_BODY = { series: [{ type: 'peak', f: 220, gain: 2, q: 1.5 }, { type: 'highshelf', f: 7000, gain: -2 }, { type: 'highpass', f: 30 }] };

function harp(emit, nt, rng) {
  // round robin: finger position, flesh/nail, pitch of the string (pulled harder = a hair sharp) differ per pluck
  const rrPos = (rng() - 0.5) * 0.05, rrFc = 1 + (rng() - 0.5) * 0.22, rrT = 1 + (rng() - 0.5) * 0.1, rrNz = 0.7 + 0.6 * rng();
  const midi = nt.midi, vel = clamp(nt.vel, 0.02, 1), f0 = mtof(midi) * Math.pow(2, (rng() - 0.35) * 1.6 / 1200);
  // soft = flesh of the finger (dark), hard = nail-like snap (bright)
  const fc = 560 * Math.pow(2, vel * 3.5 + ((midi - 60) / 12) * 0.45) * (nt.bright ?? 1) * rrFc;
  const T0 = clamp(7 * Math.pow(2, -(midi - 48) / 22), 0.5, 9) * (nt.decay ?? 1) * rrT;
  const damp = !!nt.damp;
  const total = damp ? Math.min(T0 * 1.6, nt.dur + 0.5) : Math.min(7, T0 * 1.6);
  const n = Math.ceil(total * SR) + 2;
  const L = scratch(0, n), R = scratch(1, n);
  const pan = clamp((nt.pan ?? 0) + ((midi - 64) / 60) * (nt.stereo ?? 0.3), -1, 1);
  const [gl, gr] = panGains(pan), [gl2, gr2] = panGains(pan + 0.1);
  const B = 2e-5, sB = Math.sqrt(1 + B);
  const pp = clamp((nt.pluck ?? 0.23) + rrPos, 0.05, 0.5);
  const amps = [], freqs = [];
  let e = 0;
  for (let k = 1; k <= 50; k++) {
    const fk = (k * f0 * Math.sqrt(1 + B * k * k)) / sB;
    if (fk > 17000) break;
    const a = (Math.abs(Math.sin(Math.PI * k * pp)) / Math.pow(k, 1.15)) * Math.exp(-fk / fc);
    if (k > 4 && a < 1e-5) break;
    amps.push(a); freqs.push(fk); e += a * a;
  }
  const level = ((0.03 + 0.97 * Math.pow(vel, 1.5)) * 0.45 * (nt.amp ?? 1)) / Math.sqrt(e);
  const c2 = Math.pow(2, (0.5 + rng() * 0.6) / 1200);
  for (let i = 0; i < amps.length; i++) {
    const a = amps[i] * level, fk = freqs[i];
    const t60 = T0 / (1 + (fk - f0) / 900);
    if (i < 8) {
      addPartial(L, R, n, fk, a * 0.7, t60 * 0.8, gl, gr);
      addPartial(L, R, n, fk * c2, a * 0.3, t60 * 1.3, gl2, gr2);
    } else addPartial(L, R, n, fk, a, t60, gl, gr);
  }
  attackRamp(L, R, n, 0.0012 * SR);
  noiseBurst(L, R, n, rng, { level: 0.006 * (0.3 + vel) * rrNz, lp: 3000 * (0.85 + 0.3 * rrNz - 0.21), hp: 600, attack: 0.0008, decay: 0.004, gl, gr });
  if (damp) dampFrom(L, R, n, Math.round(nt.dur * SR), 0.05);
  fadeEnd(L, R, n, Math.min(n / 3, 0.2 * SR));
  emit('harp', HARP_BODY, nt.t, L, R, n);
}

function pizzCore(emit, nt, rng, fallbackSection) {
  const [name, S] = sectionOf(nt, fallbackSection);
  const midi = nt.midi, vel = clamp(nt.vel, 0.02, 1), f0 = mtof(midi);
  const players = nt.players ?? 3;
  const fc0 = 650 * Math.pow(2, vel * 3.0 + ((midi - 60) / 12) * 0.45) * (nt.bright ?? 1) * Math.sqrt(S.body);
  const T0 = clamp(S.pizzT * Math.pow(2, -(midi - 60) / 40), 0.2, 2.6) * (nt.decay ?? 1) * (1 + (rng() - 0.5) * 0.1);
  const total = T0 * 1.5 + 0.05;
  const n = Math.ceil(total * SR) + 2;
  const L = scratch(0, n), R = scratch(1, n);
  // round robin: pluck point and finger hardness of each player differ on every note; each player normalised alone
  const pluckOf = (pp, fc) => {
    const amps = [], freqs = [];
    let e = 0;
    for (let k = 1; k <= 40; k++) {
      const fk = k * f0;
      if (fk > 16000) break;
      const a = (Math.abs(Math.sin(Math.PI * k * pp)) / Math.pow(k, 1.2)) * Math.exp(-fk / fc);
      if (k > 4 && a < 1e-5) break;
      amps.push(a); freqs.push(fk); e += a * a;
    }
    const s = 1 / Math.sqrt(e);
    for (let i = 0; i < amps.length; i++) amps[i] *= s;
    return [amps, freqs];
  };
  const level = ((0.03 + 0.97 * Math.pow(vel, 1.5)) * 0.7 * (nt.amp ?? 1)) / Math.sqrt(players);
  const spreadW = nt.spread ?? S.spread;
  let detMean = 0;
  const dets = [];
  const gps = [];
  let gw = 0;
  for (let p = 0; p < players; p++) {
    dets.push((rng() * 2 - 1) * (players > 1 ? (nt.detune ?? 4) : 0)); gps.push(0.8 + 0.4 * rng());
    detMean += dets[p] * gps[p] * gps[p]; gw += gps[p] * gps[p];
  }
  detMean /= gw;
  // the first player plucks alone for a few ms and sets the perceived pitch: give him the one closest to the centre
  let best = 0;
  for (let p = 1; p < players; p++) if (Math.abs(dets[p] - detMean) < Math.abs(dets[best] - detMean)) best = p;
  [dets[0], dets[best]] = [dets[best], dets[0]]; [gps[0], gps[best]] = [gps[best], gps[0]];
  for (let p = 0; p < players; p++) {
    const off = p === 0 ? 0 : Math.round(rng() * 0.016 * SR);
    const dc = Math.pow(2, (dets[p] - detMean) / 1200);
    const [gl, gr] = panGains((nt.pan ?? 0) + (players > 1 ? spreadW * ((p / (players - 1)) * 2 - 1) : 0));
    const gp = gps[p];
    const [amps, freqs] = pluckOf(0.19 + (rng() - 0.5) * 0.06, fc0 * (1 + (rng() - 0.5) * 0.22));
    // each player gets his own buffer, so that his attack ramp does not touch the players already sounding
    const pL = scratch(2, n), pR = scratch(3, n);
    for (let i = 0; i < amps.length; i++) {
      const fk = freqs[i] * dc;
      addPartial(pL, pR, n, fk, amps[i] * level * gp, T0 / (1 + (fk - f0) / 700), gl, gr, off);
    }
    attackRamp(pL, pR, n, Math.max(0.0009, 0.2 / f0) * SR, off);
    for (let i = off; i < n; i++) { L[i] += pL[i]; R[i] += pR[i]; }
    noiseBurst(L, R, n, rng, { off, level: (0.012 * (0.3 + vel) * (0.7 + 0.6 * rng())) / Math.sqrt(players), lp: 2500 * Math.sqrt(S.body) + 500, hp: 300, attack: 0.0006, decay: 0.005, gl, gr });
  }
  fadeEnd(L, R, n, Math.min(n / 3, 0.05 * SR));
  const tr = TRIM_FN['pizz_' + (name === 'violins2' ? 'violins' : name)](midi);
  if (tr !== 1) for (let i = 0; i < n; i++) { L[i] *= tr; R[i] *= tr; }
  emit('str:' + name, stringBody(S.body, false), nt.t, L, R, n);
}

/** Struck bars and plates. modes: [ratio, amp, decayMul, velSensitive] */
function malletCore(emit, nt, rng, M) {
  // round robin: where the mallet lands on the bar (upper mode levels), how hard it is, a trace of tuning and decay
  const rrHard = 1 + (rng() - 0.5) * 0.2, rrT = 1 + (rng() - 0.5) * 0.1, rrTh = 0.7 + 0.6 * rng(), rrLp = 0.85 + 0.3 * rng(), rrBeat = 0.7 + 0.6 * rng();
  const midi = nt.midi, vel = clamp(nt.vel, 0.02, 1), f0 = mtof(midi) * Math.pow(2, ((rng() * 2 - 1) * (M.rrTune ?? 1.2)) / 1200);
  const T0 = clamp(M.t0 * Math.pow(2, -(midi - M.ref) / M.oct), M.tMin, M.tMax) * (nt.decay ?? 1) * rrT;
  const damp = !!nt.damp;
  const total = damp ? Math.min(T0 * 1.5, nt.dur + 0.4) : T0 * 1.5;
  const n = Math.ceil(total * SR) + 2;
  const L = scratch(0, n), R = scratch(1, n);
  const pan = clamp((nt.pan ?? 0) + ((midi - M.ref) / 48) * (nt.stereo ?? 0.3), -1, 1);
  const [gl, gr] = panGains(pan), [gl2, gr2] = panGains(pan + 0.12);
  const hardV = (0.25 + 1.1 * Math.pow(vel, 1.4)) * (nt.bright ?? 1) * rrHard;
  const level = (0.03 + 0.97 * Math.pow(vel, 1.4)) * M.amp * (nt.amp ?? 1);
  const c2 = Math.pow(2, ((M.beat ?? 1) * rrBeat) / 1200);
  for (const [ratio, amp, dm, vs] of M.modes) {
    const f = f0 * ratio;
    const a = level * amp * (vs ? Math.pow(hardV, 0.6 + 0.5 * Math.log2(ratio)) : 1) * (ratio === 1 ? 1 : 0.8 + 0.4 * rng());
    if (ratio === 1 && M.beat !== 0) {
      addPartial(L, R, n, f, a * 0.65, T0 * dm, gl, gr);
      addPartial(L, R, n, f * c2, a * 0.35, T0 * dm * 1.15, gl2, gr2);
    } else addPartial(L, R, n, f, a, T0 * dm, gl, gr);
  }
  attackRamp(L, R, n, M.attack * SR);
  // the mallet contact: a harder (louder) stroke is a shorter, brighter click
  noiseBurst(L, R, n, rng, { level: M.thump * (0.3 + vel) * (nt.amp ?? 1) * rrTh, lp: M.thumpLp * (0.45 + 1.1 * vel) * (nt.bright ?? 1) * rrLp, attack: 0.0008, decay: M.thumpDecay * (1.3 - 0.5 * vel), gl, gr });
  if (M.motor && (nt.motor ?? 0) > 0) {
    // vibraphone motor: slow amplitude tremolo
    const depth = clamp(nt.motor, 0, 1) * 0.35, rate = nt.motorRate ?? 4.6, p0 = rng() * TAU;
    for (let i = 0; i < n; i++) { const g = 1 - depth * (0.5 + 0.5 * Math.sin((TAU * rate * i) / SR + p0)); L[i] *= g; R[i] *= g; }
  }
  if (damp) dampFrom(L, R, n, Math.round(nt.dur * SR), 0.06);
  fadeEnd(L, R, n, Math.min(n / 3, 0.1 * SR));
  emit(M.layer, DC_BODY, nt.t, L, R, n);
}

const MALLETS = {
  celesta: { layer: 'celesta', ref: 72, oct: 24, t0: 2.8, tMin: 0.5, tMax: 5, amp: 0.26, beat: 1.2, attack: 0.001,
    modes: [[1, 1, 1, 0], [2, 0.1, 0.6, 0], [3, 0.04, 0.4, 1], [4.07, 0.36, 0.14, 1], [6.9, 0.16, 0.07, 1], [10.2, 0.06, 0.04, 1]],
    thump: 0.012, thumpLp: 700, thumpDecay: 0.008 },
  glockenspiel: { layer: 'glock', ref: 84, oct: 24, t0: 3.4, tMin: 0.6, tMax: 5, amp: 0.2, beat: 0.6, attack: 0.0006,
    modes: [[1, 1, 1, 0], [2.756, 0.4, 0.45, 1], [5.404, 0.2, 0.2, 1], [8.933, 0.07, 0.1, 1], [13.34, 0.025, 0.05, 1]],
    thump: 0.006, thumpLp: 1500, thumpDecay: 0.004 },
  marimba: { layer: 'marimba', ref: 60, oct: 20, t0: 1.1, tMin: 0.25, tMax: 2.4, amp: 0.34, beat: 0, attack: 0.0018,
    modes: [[1, 1, 1, 0], [2, 0.05, 0.5, 0], [3.93, 0.5, 0.2, 1], [9.6, 0.16, 0.07, 1]],
    thump: 0.035, thumpLp: 500, thumpDecay: 0.01 },
  vibraphone: { layer: 'vibes', ref: 65, oct: 26, t0: 6, tMin: 1.2, tMax: 9, amp: 0.26, beat: 0.5, attack: 0.0012, motor: true,
    modes: [[1, 1, 1, 0], [4.0, 0.22, 0.28, 1], [10.0, 0.07, 0.08, 1], [2, 0.03, 0.6, 0]],
    thump: 0.012, thumpLp: 900, thumpDecay: 0.006 },
};

// ---------------------------------------------------------------- membranes, pulses, noise

/** Modal membrane with a pitch drop after the stroke. modes: [ratio, amp, t60] */
function membrane(emit, nt, rng, D) {
  const vel = clamp(nt.vel, 0.02, 1), f0 = mtof(nt.midi);
  const dec = nt.decay ?? 1;
  let tmax = 0;
  for (const m of D.modes) if (m[2] > tmax) tmax = m[2];
  const damp = !!nt.damp;
  const total = damp ? Math.min(tmax * dec * 1.25, nt.dur + 0.5) : tmax * dec * 1.25;
  const n = Math.ceil(total * SR) + 2;
  const L = scratch(0, n), R = scratch(1, n);
  const [gl, gr] = panGains(nt.pan ?? 0);
  const level = (0.03 + 0.97 * Math.pow(vel, 1.5)) * D.amp * (nt.amp ?? 1);
  const dropK = (Math.LN2 / 1200) * D.drop * (0.4 + vel);
  const dmul = Math.exp(-1 / (D.dropTau * SR));
  const hardV = 0.35 + 0.9 * vel;
  for (let mi = 0; mi < D.modes.length; mi++) {
    const [ratio, amp, t60] = D.modes[mi];
    const f = f0 * ratio;
    if (f > 18000) continue;
    const w = (TAU * f) / SR;
    const r = Math.exp(-6.907755 / (t60 * dec * SR));
    let a = level * amp * (mi === 0 ? 1 : hardV), ph = 0, dr = dropK;
    if (a <= FLOOR) continue;
    const m = Math.min(n, Math.ceil(Math.log(FLOOR / a) / Math.log(r)));
    const g2l = mi % 2 ? gl * 0.9 : gl, g2r = mi % 2 ? gr : gr * 0.9;
    for (let i = 0; i < m; i++) {
      const y = a * Math.sin(ph);
      L[i] += y * g2l; R[i] += y * g2r;
      ph += w * (1 + dr);
      if (ph > TAU) ph -= TAU;
      dr *= dmul; a *= r;
    }
  }
  attackRamp(L, R, n, D.attack * SR);
  noiseBurst(L, R, n, rng, { level: D.noise * (0.2 + vel) * level / D.amp, lp: D.noiseLp * (0.5 + vel), attack: 0.001, decay: D.noiseDecay, gl, gr });
  if (damp) dampFrom(L, R, n, Math.round(nt.dur * SR), 0.07);
  fadeEnd(L, R, n, Math.min(n / 3, 0.15 * SR));
  emit(D.layer, DC_BODY, nt.t, L, R, n);
}

const MEMBRANES = {
  timpani: { layer: 'timpani', amp: 0.5, drop: 55, dropTau: 0.09, attack: 0.003,
    modes: [[1, 1, 2.8], [1.5, 0.55, 1.9], [1.99, 0.32, 1.2], [2.44, 0.2, 0.8], [2.89, 0.12, 0.55], [3.4, 0.06, 0.35]],
    noise: 0.16, noiseLp: 1100, noiseDecay: 0.022 },
  lowDrum: { layer: 'lowDrum', amp: 0.6, drop: 240, dropTau: 0.05, attack: 0.004,
    modes: [[1, 1, 1.5], [1.59, 0.5, 0.8], [2.14, 0.3, 0.55], [2.3, 0.2, 0.45], [2.65, 0.15, 0.35], [2.92, 0.1, 0.3], [3.6, 0.07, 0.2]],
    noise: 0.3, noiseLp: 500, noiseDecay: 0.05 },
};

/** Soft "lub-dub" pulse. Pitched very low, with gentle harmonics so that a phone speaker still shows it. */
function heartbeat(emit, nt, rng) {
  const vel = clamp(nt.vel, 0.02, 1);
  const gap = nt.gap ?? 0.27;
  const f0 = mtof(nt.midi);
  const total = gap + 0.75;
  const n = Math.ceil(total * SR) + 2;
  const L = scratch(0, n), R = scratch(1, n);
  const [gl, gr] = panGains(nt.pan ?? 0);
  const level = (0.05 + 0.95 * Math.pow(vel, 1.3)) * 0.5 * (nt.amp ?? 1);
  const tone = (nt.tone ?? 0.5) * (0.3 + 1.2 * vel);
  for (let b = 0; b < 2; b++) {
    const off = Math.round(b * gap * SR);
    const fb = f0 * (b ? 1.12 : 1), amp = b ? 0.72 : 1;
    const tauA = 0.005, tauD = b ? 0.075 : 0.095;
    let ph = 0, drop = 0.55;
    const kd = Math.exp(-1 / (0.045 * SR));
    const m = Math.min(n - off, Math.ceil(0.7 * SR));
    for (let i = 0; i < m; i++) {
      const t = i / SR;
      const env = (1 - Math.exp(-t / tauA)) * Math.exp(-t / tauD);
      const s = Math.sin(ph) + tone * 0.5 * Math.sin(2 * ph + 0.4) + tone * 0.28 * Math.sin(3 * ph + 0.9) + tone * 0.12 * Math.sin(4 * ph);
      const y = Math.tanh(s * env * 1.6) * level * amp * 0.62;
      L[off + i] += y * gl; R[off + i] += y * gr;
      ph += (TAU * fb * (1 + drop)) / SR;
      if (ph > TAU) ph -= TAU;
      drop *= kd;
    }
    noiseBurst(L, R, n, rng, { off, level: 0.05 * level * amp, lp: 260, attack: 0.003, decay: 0.03, gl, gr });
  }
  fadeEnd(L, R, n, 0.05 * SR);
  emit('heartbeat', DC_BODY, nt.t, L, R, n);
}

const CYM_BANDS = [2350, 2930, 3480, 4120, 4790, 5510, 6370, 7280, 8350, 9500, 10900, 12600];

/** Soft-mallet cymbal roll: noise that opens up as it gets louder, with a few narrow metallic bands. */
function cymbalSwell(emit, nt, rng) {
  const vel = clamp(nt.vel, 0.02, 1);
  const dur = Math.max(0.2, nt.dur), tail = nt.tail ?? 1.8;
  const n = Math.ceil((dur + tail) * SR) + 2;
  const L = scratch(0, n), R = scratch(1, n);
  const [gl, gr] = panGains(nt.pan ?? 0);
  const level = (0.05 + 0.95 * Math.pow(vel, 1.3)) * 0.13 * (nt.amp ?? 1);
  const curve = nt.curve ?? 2.2;
  const bright = nt.bright ?? 1;
  const bands = CYM_BANDS.map((f) => biquad('bandpass', f * (0.95 + 0.1 * rng()), 7.5));
  const velOpen = 0.55 + 0.65 * vel;
  const hp = biquad('highpass', 420, 0.707);
  const CB = 32;
  for (let ch = 0; ch < 2; ch++) {
    const x = ch ? R : L, pg = (ch ? gr : gl) * 1.414;
    let idx = (rng() * NOISE.length) | 0;
    const z = new Float64Array(bands.length * 2);
    let ic1 = 0, ic2 = 0, h1 = 0, h2 = 0, g = 0, a1 = 0, a2 = 0, a3 = 0;
    const flP = rng() * TAU;
    for (let i = 0; i < n; i++) {
      if (i % CB === 0) {
        const t = i / SR;
        const env = t < dur ? Math.pow(t / dur, curve) : Math.exp(-(t - dur) / (tail / 5.5));
        const fcut = clamp(1500 * Math.pow(9, Math.pow(env, 0.5)) * bright * velOpen, 500, 15000);
        const gg = Math.tan((Math.PI * fcut) / SR);
        a1 = 1 / (1 + gg * (gg + 1.3)); a2 = gg * a1; a3 = gg * a2;
        g = env * level * (1 + 0.1 * Math.sin(TAU * 8.7 * t + flP)) * pg;
      }
      const w = NOISE[idx++ & NOISE_MASK];
      let s = w * 0.7;
      for (let b = 0; b < bands.length; b++) {
        const c = bands[b];
        const y = c.b0 * w + z[b * 2];
        z[b * 2] = c.b1 * w - c.a1 * y + z[b * 2 + 1];
        z[b * 2 + 1] = c.b2 * w - c.a2 * y;
        s += y * 1.2;
      }
      const y0 = hp.b0 * s + h1; h1 = hp.b1 * s - hp.a1 * y0 + h2; h2 = hp.b2 * s - hp.a2 * y0;
      const v3 = y0 - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3;
      ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
      x[i] = v2 * g;
    }
  }
  // partial L/R correlation keeps the swell mono compatible
  for (let i = 0; i < n; i++) { const m = (L[i] + R[i]) * 0.35; L[i] = L[i] * 0.65 + m; R[i] = R[i] * 0.65 + m; }
  fadeEnd(L, R, n, 0.3 * SR);
  emit('cymbal', null, nt.t, L, R, n);
}

/** Noise riser: a resonant band-pass sweeping upward under a rising envelope, cut short at the end. */
function riser(emit, nt, rng) {
  const vel = clamp(nt.vel, 0.02, 1);
  const dur = Math.max(0.2, nt.dur), tail = nt.tail ?? 0.12;
  const n = Math.ceil((dur + tail) * SR) + 2;
  const L = scratch(0, n), R = scratch(1, n);
  const [gl, gr] = panGains(nt.pan ?? 0);
  const fA = nt.from ?? 250, fB = (nt.to ?? 4200) * (0.72 + 0.4 * vel), q = nt.q ?? 2.5;
  const level = (0.05 + 0.95 * Math.pow(vel, 1.3)) * 0.5 * (nt.amp ?? 1);
  const curve = nt.curve ?? 1.8;
  const CB = 32;
  for (let ch = 0; ch < 2; ch++) {
    const x = ch ? R : L, pg = ch ? gr : gl;
    let idx = (rng() * NOISE.length) | 0;
    let ic1 = 0, ic2 = 0, g = 0, a1 = 0, a2 = 0, a3 = 0;
    const kq = 1 / q;
    for (let i = 0; i < n; i++) {
      if (i % CB === 0) {
        const t = i / SR;
        const u = Math.min(1, t / dur);
        const env = t < dur ? Math.pow(u, curve) : Math.exp(-(t - dur) / (tail / 5));
        const gg = Math.tan((Math.PI * fA * Math.pow(fB / fA, u)) / SR);
        a1 = 1 / (1 + gg * (gg + kq)); a2 = gg * a1; a3 = gg * a2;
        g = env * level * pg * 1.414;
      }
      const w = NOISE[idx++ & NOISE_MASK];
      const v3 = w - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3;
      ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
      x[i] = v1 * kq * g; // band-pass output, unity peak gain
    }
  }
  for (let i = 0; i < n; i++) { const m = (L[i] + R[i]) * 0.3; L[i] = L[i] * 0.7 + m; R[i] = R[i] * 0.7 + m; }
  fadeEnd(L, R, n, 0.02 * SR);
  emit('riser', null, nt.t, L, R, n);
}

// ---------------------------------------------------------------- registry

/**
 * name -> { render(emit, note, rng), pitched, range:[lo,hi] comfortable midi range, kind }
 * kind: 'sustain' (dur matters, has release), 'decay' (rings by itself), 'fx'
 */
export const INSTRUMENTS = {
  // chain: true = consecutive legato notes are rendered as one continuous sound (see Session._renderEvents)
  stringsEnsemble: { render: (e, nt, r) => stringsCore(e, nt, r, false, 'violins'), pitched: true, range: [28, 103], kind: 'sustain', chain: true },
  stringsTremolo: { render: (e, nt, r) => stringsCore(e, nt, r, true, 'violins'), pitched: true, range: [28, 103], kind: 'sustain' },
  stringsPizzicato: { render: (e, nt, r) => pizzCore(e, nt, r, 'violins'), pitched: true, range: [28, 96], kind: 'decay' },
  contrabass: { render: (e, nt, r) => stringsCore(e, nt, r, false, 'basses'), pitched: true, range: [28, 60], kind: 'sustain', chain: true },
  contrabassPizz: { render: (e, nt, r) => pizzCore(e, nt, r, 'basses'), pitched: true, range: [28, 60], kind: 'decay' },
  soloViolin: { render: (e, nt, r) => soloCore(e, nt, r, 'violin'), pitched: true, range: [55, 100], kind: 'sustain', chain: true },
  soloCello: { render: (e, nt, r) => soloCore(e, nt, r, 'cello'), pitched: true, range: [36, 81], kind: 'sustain', chain: true },
  feltPiano: { render: feltPiano, pitched: true, range: [24, 103], kind: 'decay' },
  harp: { render: harp, pitched: true, range: [31, 100], kind: 'decay' },
  celesta: { render: (e, nt, r) => malletCore(e, nt, r, MALLETS.celesta), pitched: true, range: [60, 108], kind: 'decay' },
  glockenspiel: { render: (e, nt, r) => malletCore(e, nt, r, MALLETS.glockenspiel), pitched: true, range: [72, 108], kind: 'decay' },
  marimba: { render: (e, nt, r) => malletCore(e, nt, r, MALLETS.marimba), pitched: true, range: [36, 96], kind: 'decay' },
  vibraphone: { render: (e, nt, r) => malletCore(e, nt, r, MALLETS.vibraphone), pitched: true, range: [53, 89], kind: 'decay' },
  warmHorn: { render: warmHorn, pitched: true, range: [34, 77], kind: 'sustain', chain: true },
  flutePad: { render: flutePad, pitched: true, range: [55, 96], kind: 'sustain', chain: true },
  choirPad: { render: choirPad, pitched: true, range: [36, 84], kind: 'sustain' },
  subBass: { render: subBass, pitched: true, range: [24, 55], kind: 'sustain' },
  timpani: { render: (e, nt, r) => membrane(e, nt, r, MEMBRANES.timpani), pitched: true, range: [36, 60], kind: 'decay' },
  lowDrum: { render: (e, nt, r) => membrane(e, nt, r, MEMBRANES.lowDrum), pitched: false, defaultMidi: 31, range: [24, 43], kind: 'decay' },
  heartbeat: { render: heartbeat, scoreName: 'heartbeatPerc', pitched: false, defaultMidi: 33, range: [28, 40], kind: 'fx' },
  cymbalSwell: { render: cymbalSwell, pitched: false, defaultMidi: 0, range: [0, 127], kind: 'fx' },
  riser: { render: riser, pitched: false, defaultMidi: 0, range: [0, 127], kind: 'fx' },
};

// ---------------------------------------------------------------- body filters (applied per layer by the mixer)

/** Apply a body descriptor { series:[eq...], parallel:[{f,q,gain}], dry, dryLp } in place to [start,end). */
export function applyBody(body, L, R, start, end) {
  if (!body) return;
  if (body.parallel) {
    const bands = body.parallel.map((p) => ({ c: biquad('bandpass', p.f, p.q), g: p.gain }));
    const dry = body.dry ?? 0;
    const ad = Math.exp((-TAU * (body.dryLp ?? 500)) / SR);
    for (const x of [L, R]) {
      const z = new Float64Array(bands.length * 2);
      let lp = 0;
      for (let i = start; i < end; i++) {
        const v = x[i];
        lp = v + ad * (lp - v);
        let s = lp * dry;
        for (let b = 0; b < bands.length; b++) {
          const c = bands[b].c;
          const y = c.b0 * v + z[b * 2];
          z[b * 2] = c.b1 * v - c.a1 * y + z[b * 2 + 1];
          z[b * 2 + 1] = c.b2 * v - c.a2 * y;
          s += y * bands[b].g;
        }
        x[i] = s;
      }
    }
  }
  if (body.series) {
    for (const d of body.series) {
      const c = eqBand(d);
      biquadRun(c, L, start, end);
      biquadRun(c, R, start, end);
    }
  }
}

/**
 * Render one note of one instrument to its own stereo buffer, body filter included, no reverb.
 * Used by QA scripts and by the reverse-swell helper.
 * Returns { L, R, n, pre } where `pre` is always 0 (the note starts at sample 0).
 */
export function renderNote(inst, note, seed = 1) {
  const def = INSTRUMENTS[inst];
  if (!def) throw new Error('unknown instrument ' + inst);
  const nt = { t: 0, dur: 1, vel: 0.7, midi: def.defaultMidi ?? 69, ...note };
  const rng = mulberry32(hashSeed(seed, inst, Math.round(nt.t * 1000), Math.round(nt.midi * 100)));
  let out = null;
  def.render((layer, body, t, L, R, n) => {
    const tail = body ? Math.round(0.25 * SR) : 0;
    const oL = new Float32Array(n + tail), oR = new Float32Array(n + tail);
    oL.set(L.subarray(0, n)); oR.set(R.subarray(0, n));
    applyBody(body, oL, oR, 0, n + tail);
    out = { L: oL, R: oR, n: n + tail, layer };
  }, nt, rng);
  return out;
}
