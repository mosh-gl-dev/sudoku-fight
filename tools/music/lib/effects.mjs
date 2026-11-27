// Effects: synthesized-IR convolution reverb, stereo delay, compressor, saturation, width,
// look-ahead true-peak limiter, TPDF dither.

import { SR, TAU, mulberry32, gauss, fft, nextPow2, biquad, biquadRun, truePeakEnvelope, clamp, dB } from './dsp.mjs';

// ---------------------------------------------------------------- Reverb impulse response

const irCache = new Map();

export const REVERB_PRESETS = {
  hall: { rt60: 3.2, predelay: 0.024, damping: 0.55, lowDecay: 1.12, early: 0.45, buildup: 0.05, hp: 170, lp: 9500, seed: 11 },
  cathedral: { rt60: 4.0, predelay: 0.035, damping: 0.5, lowDecay: 1.18, early: 0.3, buildup: 0.09, hp: 180, lp: 8500, seed: 23 },
  chamber: { rt60: 2.5, predelay: 0.016, damping: 0.6, lowDecay: 1.05, early: 0.55, buildup: 0.035, hp: 170, lp: 10000, seed: 37 },
  room: { rt60: 1.1, predelay: 0.006, damping: 0.9, lowDecay: 1.0, early: 0.8, buildup: 0.012, hp: 140, lp: 6500, seed: 41 },
  smear: { rt60: 1.4, predelay: 0, damping: 0.6, lowDecay: 1.0, early: 0.1, buildup: 0.03, hp: 150, lp: 8000, seed: 53 },
};

/**
 * Synthesize a decorrelated stereo impulse response: sparse early reflections followed by a dense
 * exponentially decaying noise field whose decay time depends on frequency (shorter RT60 at the top).
 * Each channel is normalised to unit gain for pink noise (60 Hz..12 kHz), which is close to the long-term
 * spectrum of music: a send of 1.0 gives a reverb about as loud as the dry sound. (Unit energy, the white-noise
 * calibration, made the reverb 6 to 7 dB louder than the dry sound on real material.)
 */
export function makeIR(opts = {}) {
  const o = { ...REVERB_PRESETS.hall, ...opts };
  const key = JSON.stringify([o.rt60, o.predelay, o.damping, o.lowDecay, o.early, o.buildup, o.hp, o.lp, o.seed]);
  const hit = irCache.get(key);
  if (hit) return hit;
  const len = Math.min((1 << 18) - 1, Math.ceil((o.predelay + o.rt60 * 1.2 + 0.15) * SR));
  const pre = Math.round(o.predelay * SR);
  // Half-octave bands split in the frequency domain (raised-cosine crossovers that sum to one), so every
  // band keeps its own decay time without leaking into its neighbours.
  const NB = 16, F0 = 88;
  const N = nextPow2(len);
  const out = [];
  for (let ch = 0; ch < 2; ch++) {
    const rng = mulberry32(o.seed * 7919 + ch * 104729 + 17);
    const wre = new Float64Array(N), wim = new Float64Array(N);
    for (let i = pre; i < len; i++) wre[i] = gauss(rng);
    fft(wre, wim);
    const h = new Float64Array(len);
    const bre = new Float64Array(N), bim = new Float64Array(N);
    for (let b = 0; b < NB; b++) {
      const fc = F0 * Math.pow(2, b / 2);
      bre.fill(0); bim.fill(0);
      const kLo = b === 0 ? 1 : Math.max(1, Math.floor((fc / Math.SQRT2) * N / SR));
      const kHi = b === NB - 1 ? N / 2 - 1 : Math.min(N / 2 - 1, Math.ceil((fc * Math.SQRT2 * N) / SR));
      for (let k = kLo; k <= kHi; k++) {
        const d = Math.log2((k * SR) / N / fc) * 2; // -1..1 across the band
        let w = 1;
        if (!((b === 0 && d < 0) || (b === NB - 1 && d > 0))) { const c = Math.cos((Math.PI / 2) * Math.min(1, Math.abs(d))); w = c * c; }
        bre[k] = wre[k] * w; bim[k] = wim[k] * w;
        bre[N - k] = wre[N - k] * w; bim[N - k] = wim[N - k] * w;
      }
      fft(bre, bim, true);
      let mul;
      if (fc <= 500) mul = 1 + (o.lowDecay - 1) * clamp(Math.log2(500 / fc) / 2, 0, 1);
      else mul = 1 / (1 + o.damping * ((fc - 500) / 2500));
      const tilt = fc <= 2000 ? 1 : Math.pow(2000 / fc, 0.4);
      const kd = -6.9078 / (o.rt60 * mul * SR);
      for (let i = pre; i < len; i++) h[i] += bre[i] * tilt * Math.exp(kd * (i - pre));
    }
    // Late-field build-up.
    const bu = Math.max(1, o.buildup * SR);
    let late = 0;
    for (let i = pre; i < len; i++) {
      const g = 1 - Math.exp(-(i - pre) / bu);
      h[i] *= g * g;
      late += h[i] * h[i];
    }
    // Early reflections: sparse taps, getting weaker and denser with time.
    const er = new Float64Array(len);
    let early = 0;
    const taps = 18;
    for (let k = 0; k < taps; k++) {
      const tt = 0.004 + Math.pow((k + rng()) / taps, 1.4) * 0.085;
      const pos = pre + Math.round(tt * SR);
      if (pos + 3 >= len) continue;
      const g = (rng() < 0.5 ? -1 : 1) * (0.5 + 0.5 * rng()) / (1 + tt / 0.025);
      er[pos] += g * 0.55; er[pos + 1] += g * 0.33; er[pos + 2] += g * 0.12;
      early += g * g * 0.42;
    }
    const eg = early > 0 ? o.early * Math.sqrt((late * 0.12) / early) : 0;
    for (let i = 0; i < len; i++) h[i] += er[i] * eg;
    // Tone: remove the mud and the fizz.
    const hf = new Float32Array(len);
    for (let i = 0; i < len; i++) hf[i] = h[i];
    biquadRun(biquad('highpass', o.hp, 0.707), hf);
    biquadRun(biquad('lowpass', o.lp, 0.707), hf);
    // Fade the very end to exact silence.
    const fade = Math.min(len, Math.round(0.08 * SR));
    for (let i = 0; i < fade; i++) hf[len - 1 - i] *= i / fade;
    const pre2 = new Float64Array(N), pim2 = new Float64Array(N);
    for (let i = 0; i < len; i++) pre2[i] = hf[i];
    fft(pre2, pim2);
    let e = 0, wsum = 0;
    const k0 = Math.ceil((60 * N) / SR), k1 = Math.floor((12000 * N) / SR);
    for (let k = k0; k <= k1; k++) { const w = 1 / k; e += (pre2[k] * pre2[k] + pim2[k] * pim2[k]) * w; wsum += w; }
    const norm = 1 / Math.sqrt(e / wsum);
    const res = new Float64Array(len);
    for (let i = 0; i < len; i++) res[i] = hf[i] * norm;
    out.push(res);
  }
  const ir = { L: out[0], R: out[1], len };
  irCache.set(key, ir);
  return ir;
}

// ---------------------------------------------------------------- FFT convolution (overlap-add, large blocks)

const irSpectra = new WeakMap();

/**
 * out += wet * (in convolved with ir), per channel (inL*irL -> outL, inR*irR -> outR).
 * The output is truncated at out.length. All-zero input blocks are skipped.
 */
export function convolveStereo(inL, inR, n, ir, outL, outR, wet = 1) {
  const N = Math.max(1 << 16, nextPow2(ir.len * 2));
  const B = N - ir.len + 1;
  let spec = irSpectra.get(ir);
  if (!spec || spec.N !== N) {
    spec = { N, re: [], im: [] };
    for (const h of [ir.L, ir.R]) {
      const re = new Float64Array(N), im = new Float64Array(N);
      re.set(h);
      fft(re, im);
      spec.re.push(re); spec.im.push(im);
    }
    irSpectra.set(ir, spec);
  }
  // Both channels go through ONE complex FFT (left = real part, right = imaginary part), are separated by
  // conjugate symmetry, multiplied by their own IR spectrum and recombined: half the FFT work of two real passes.
  const re = new Float64Array(N), im = new Float64Array(N);
  const hLr = spec.re[0], hLi = spec.im[0], hRr = spec.re[1], hRi = spec.im[1];
  const lim0 = Math.min(outL.length, outR.length);
  const half = N >> 1;
  for (let pos = 0; pos < n; pos += B) {
    const m = Math.min(B, n - pos);
    let any = false;
    for (let i = 0; i < m; i++) if (inL[pos + i] !== 0 || inR[pos + i] !== 0) { any = true; break; }
    if (!any) continue;
    re.fill(0); im.fill(0);
    for (let i = 0; i < m; i++) { re[i] = inL[pos + i]; im[i] = inR[pos + i]; }
    fft(re, im);
    for (let k = 0; k <= half; k++) {
      const j = k === 0 ? 0 : N - k;
      const a = re[k], b = im[k], c = re[j], d = im[j];
      // spectra of the two real inputs at bin k
      const lr = (a + c) * 0.5, li = (b - d) * 0.5;
      const rr = (b + d) * 0.5, ri = (c - a) * 0.5;
      // times the impulse responses
      const yLr = lr * hLr[k] - li * hLi[k], yLi = lr * hLi[k] + li * hLr[k];
      const yRr = rr * hRr[k] - ri * hRi[k], yRi = rr * hRi[k] + ri * hRr[k];
      // Y = YL + i YR at k, and conj(YL) + i conj(YR) at N - k
      re[k] = yLr - yRi; im[k] = yLi + yRr;
      if (j !== k) { re[j] = yLr + yRi; im[j] = yRr - yLi; }
    }
    fft(re, im, true);
    const lim = Math.min(N, lim0 - pos);
    for (let i = 0; i < lim; i++) { outL[pos + i] += re[i] * wet; outR[pos + i] += im[i] * wet; }
  }
}

// ---------------------------------------------------------------- Stereo delay

/**
 * Feedback delay with a low-pass in the loop. pingpong: the echoes alternate sides.
 * out += wet signal only (no dry).
 */
export function stereoDelay(inL, inR, n, outL, outR, { time = 0.4, feedback = 0.35, damp = 3500, pingpong = true, hp = 250, wet = 1 } = {}) {
  const d = Math.max(1, Math.round(time * SR));
  const bl = new Float32Array(d), br = new Float32Array(d);
  const a = Math.exp((-TAU * damp) / SR);
  const ah = Math.exp((-TAU * hp) / SR);
  let lpL = 0, lpR = 0, hpL = 0, hpR = 0, p = 0;
  const on = Math.min(n, outL.length);
  for (let i = 0; i < on; i++) {
    const dl = bl[p], dr = br[p];
    lpL = dl + a * (lpL - dl); lpR = dr + a * (lpR - dr);
    hpL = lpL + ah * (hpL - lpL); hpR = lpR + ah * (hpR - lpR);
    const fl = lpL - hpL, fr = lpR - hpR;
    const xl = inL[i], xr = inR[i];
    if (pingpong) {
      const mono = (xl + xr) * 0.5;
      bl[p] = mono + fr * feedback;
      br[p] = fl * feedback;
    } else {
      bl[p] = xl + fl * feedback;
      br[p] = xr + fr * feedback;
    }
    outL[i] += fl * wet; outR[i] += fr * wet;
    if (++p >= d) p = 0;
  }
}

// ---------------------------------------------------------------- Dynamics, colour, width

/** Stereo-linked feed-forward compressor with a soft knee. In place. */
export function compress(L, R, start, end, { threshold = -18, ratio = 2, attack = 0.02, release = 0.2, knee = 6, makeup = 0 } = {}) {
  const aA = Math.exp(-1 / (attack * SR)), aR = Math.exp(-1 / (release * SR));
  const slope = 1 - 1 / ratio;
  const mk = dB(makeup);
  let env = 0, g = 1;
  const LOG = 8.685889638065035; // 20 / ln 10
  for (let i = start; i < end; i++) {
    const l = L[i], r = R[i];
    const al = l < 0 ? -l : l, ar = r < 0 ? -r : r;
    const pk = al > ar ? al : ar;
    env = pk > env ? pk + aA * (env - pk) : pk + aR * (env - pk);
    if ((i & 3) === 0) {
      const lvl = LOG * Math.log(env + 1e-9);
      const over = lvl - threshold;
      let gr;
      if (over <= -knee / 2) gr = 0;
      else if (over >= knee / 2) gr = over * slope;
      else { const t = over + knee / 2; gr = (slope * t * t) / (2 * knee); }
      g = Math.exp(-gr / LOG) * mk;
    }
    L[i] = l * g; R[i] = r * g;
  }
}

/** Tape-style soft saturation. driveDb sets how hard the signal hits the curve; output level is compensated. */
export function saturate(L, R, start, end, driveDb = 6, refDb = -12) {
  const pre = dB(driveDb - refDb);
  const post = 1 / pre;
  const bias = 0.08;
  const tb = Math.tanh(bias);
  for (let i = start; i < end; i++) {
    L[i] = (Math.tanh(L[i] * pre + bias) - tb) * post;
    R[i] = (Math.tanh(R[i] * pre + bias) - tb) * post;
  }
}

/** Mid/side width: 0 = mono, 1 = unchanged, >1 = wider. */
export function stereoWidth(L, R, start, end, width = 1) {
  if (width === 1) return;
  for (let i = start; i < end; i++) {
    const m = (L[i] + R[i]) * 0.5, s = (L[i] - R[i]) * 0.5 * width;
    L[i] = m + s; R[i] = m - s;
  }
}

// ---------------------------------------------------------------- Limiter

/**
 * Look-ahead true-peak limiter, in place over [0, n).
 * Gain = boxcar average of a released, look-ahead minimum of the required gain, so it reaches the
 * needed reduction exactly at each peak and never overshoots.
 * Returns { maxReduction (dB, positive), overs (samples that needed reduction), at (sample of the largest reduction),
 * secOver2dB (seconds during which the gain is reduced by more than 2 dB) }.
 */
export function limit(L, R, n, { ceiling = -1.2, lookahead = 0.005, release = 0.12 } = {}) {
  const ceil = dB(ceiling);
  const W = Math.max(8, Math.round(lookahead * SR));
  const pk = new Float32Array(n);
  truePeakEnvelope(L, R, n, pk, ceil * 0.5);
  const need = new Float32Array(n).fill(1);
  let overs = 0, minG = 1, at = -1;
  for (let i = 0; i < n; i++) {
    const p = pk[i];
    if (p > ceil) {
      const g = ceil / p;
      overs++;
      if (g < minG) { minG = g; at = i; }
      const a = Math.max(0, i - W - 1), b = Math.min(n - 1, i + 1);
      for (let j = a; j <= b; j++) if (g < need[j]) need[j] = g;
    }
  }
  if (!overs) return { maxReduction: 0, overs: 0, at: -1 };
  // release: recover slowly towards 1
  const k = 1 - Math.exp(-1 / (release * SR));
  let r = 1;
  for (let i = 0; i < n; i++) {
    r += (1 - r) * k;
    if (need[i] < r) r = need[i];
    pk[i] = r; // reuse pk as the released curve
  }
  // boxcar smoothing over W samples (causal), then apply
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc += pk[i];
    if (i >= W) acc -= pk[i - W];
    const g = i >= W - 1 ? acc / W : (acc + (W - 1 - i)) / W;
    need[i] = g;
  }
  let over2 = 0;
  const g2 = dB(-2);
  for (let i = 0; i < n; i++) { const g = need[i]; L[i] *= g; R[i] *= g; if (g < g2) over2++; }
  return { maxReduction: -20 * Math.log10(minG), overs, at, secOver2dB: over2 / SR };
}

// ---------------------------------------------------------------- Dither + quantise

/** Float stereo -> interleaved Int16 with TPDF dither (seeded). Returns { pcm, clipped }. */
export function ditherTo16(L, R, n, seed = 0xd17e) {
  const pcm = new Int16Array(n * 2);
  const rng = mulberry32(seed);
  let clipped = 0;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 2; c++) {
      const x = (c ? R[i] : L[i]) * 32767;
      let v = Math.round(x + (rng() - rng()));
      if (v > 32767) { v = 32767; clipped++; } else if (v < -32768) { v = -32768; clipped++; }
      pcm[i * 2 + c] = v;
    }
  }
  return { pcm, clipped };
}

export { clamp };
