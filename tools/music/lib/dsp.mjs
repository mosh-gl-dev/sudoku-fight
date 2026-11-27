// Core DSP primitives: constants, seeded PRNG, FFT, biquads, loudness meter, true-peak detector.
// Pure Node, no dependencies. Nothing here uses Math.random() or Date.now().

export const SR = 44100;
export const TAU = Math.PI * 2;

export const dB = (d) => Math.pow(10, d / 20);
export const toDb = (x) => 20 * Math.log10(Math.max(x, 1e-12));
export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
export const ftom = (f) => 69 + 12 * Math.log2(f / 440);
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, u) => a + (b - a) * u;
export const smoothstep = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
export const cents = (c) => Math.pow(2, c / 1200);

// ---------------------------------------------------------------- PRNG

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a hash of any list of values -> uint32 seed. */
export function hashSeed(...parts) {
  const s = parts.join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // final avalanche
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export function gauss(rng) {
  let u = 0;
  while (u < 1e-12) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * rng());
}

/** Shared white-noise table (uniform, -1..1). Read with a per-note random offset and NOISE_MASK. */
export const NOISE_LEN = 1 << 18;
export const NOISE_MASK = NOISE_LEN - 1;
export const NOISE = (() => {
  const a = new Float32Array(NOISE_LEN);
  const r = mulberry32(0x5eed1234);
  for (let i = 0; i < NOISE_LEN; i++) a[i] = r() * 2 - 1;
  return a;
})();

// ---------------------------------------------------------------- FFT

const plans = new Map();
function plan(n) {
  let p = plans.get(n);
  if (p) return p;
  if (n & (n - 1)) throw new Error('fft size must be a power of two: ' + n);
  const bits = Math.round(Math.log2(n));
  const rev = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    let r = 0;
    for (let b = 0; b < bits; b++) if (i & (1 << b)) r |= 1 << (bits - 1 - b);
    rev[i] = r;
  }
  const half = n >> 1;
  const cos = new Float64Array(half);
  const sin = new Float64Array(half);
  for (let i = 0; i < half; i++) {
    cos[i] = Math.cos((TAU * i) / n);
    sin[i] = Math.sin((TAU * i) / n);
  }
  p = { rev, cos, sin };
  plans.set(n, p);
  return p;
}

/** In-place complex radix-2 FFT. Forward: X[k] = sum x[n] e^{-i 2 pi k n / N}. Inverse includes the 1/N scale. */
export function fft(re, im, inverse = false) {
  const n = re.length;
  const { rev, cos, sin } = plan(n);
  for (let i = 0; i < n; i++) {
    const j = rev[i];
    if (j > i) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  const sgn = inverse ? 1 : -1;
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const step = n / size;
    if (half === 1) {
      for (let i = 0; i < n; i += 2) {
        const xr = re[i + 1], xi = im[i + 1];
        re[i + 1] = re[i] - xr; im[i + 1] = im[i] - xi;
        re[i] += xr; im[i] += xi;
      }
      continue;
    }
    for (let j = 0, k = 0; j < half; j++, k += step) {
      const wr = cos[k];
      const wi = sgn * sin[k];
      for (let i = j; i < n; i += size) {
        const l = i + half;
        const xr = re[l] * wr - im[l] * wi;
        const xi = re[l] * wi + im[l] * wr;
        re[l] = re[i] - xr; im[l] = im[i] - xi;
        re[i] += xr; im[i] += xi;
      }
    }
  }
  if (inverse) {
    const s = 1 / n;
    for (let i = 0; i < n; i++) { re[i] *= s; im[i] *= s; }
  }
}

export const nextPow2 = (n) => { let p = 1; while (p < n) p <<= 1; return p; };

// ---------------------------------------------------------------- Biquads (RBJ cookbook)

/**
 * type: lowpass | highpass | bandpass (0 dB peak) | notch | peak | lowshelf | highshelf
 * Returns normalised coefficients { b0, b1, b2, a1, a2 }.
 */
export function biquad(type, f, q = Math.SQRT1_2, gainDb = 0, sr = SR) {
  const w0 = (TAU * clamp(f, 5, sr * 0.49)) / sr;
  const cs = Math.cos(w0), sn = Math.sin(w0);
  const alpha = sn / (2 * q);
  const A = Math.pow(10, gainDb / 40);
  let b0, b1, b2, a0, a1, a2;
  switch (type) {
    case 'lowpass': b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; a0 = 1 + alpha; a1 = -2 * cs; a2 = 1 - alpha; break;
    case 'highpass': b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; a0 = 1 + alpha; a1 = -2 * cs; a2 = 1 - alpha; break;
    case 'bandpass': b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * cs; a2 = 1 - alpha; break;
    case 'notch': b0 = 1; b1 = -2 * cs; b2 = 1; a0 = 1 + alpha; a1 = -2 * cs; a2 = 1 - alpha; break;
    case 'peak': b0 = 1 + alpha * A; b1 = -2 * cs; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cs; a2 = 1 - alpha / A; break;
    case 'lowshelf': {
      const sq = 2 * Math.sqrt(A) * alpha;
      b0 = A * (A + 1 - (A - 1) * cs + sq); b1 = 2 * A * (A - 1 - (A + 1) * cs); b2 = A * (A + 1 - (A - 1) * cs - sq);
      a0 = A + 1 + (A - 1) * cs + sq; a1 = -2 * (A - 1 + (A + 1) * cs); a2 = A + 1 + (A - 1) * cs - sq; break;
    }
    case 'highshelf': {
      const sq = 2 * Math.sqrt(A) * alpha;
      b0 = A * (A + 1 + (A - 1) * cs + sq); b1 = -2 * A * (A - 1 + (A + 1) * cs); b2 = A * (A + 1 + (A - 1) * cs - sq);
      a0 = A + 1 - (A - 1) * cs + sq; a1 = 2 * (A - 1 - (A + 1) * cs); a2 = A + 1 - (A - 1) * cs - sq; break;
    }
    default: throw new Error('unknown biquad type ' + type);
  }
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

/** Run one biquad in place over x[start..end). Transposed direct form II. */
export function biquadRun(c, x, start = 0, end = x.length) {
  const { b0, b1, b2, a1, a2 } = c;
  let z1 = 0, z2 = 0;
  for (let i = start; i < end; i++) {
    const v = x[i];
    const y = b0 * v + z1;
    z1 = b1 * v - a1 * y + z2;
    z2 = b2 * v - a2 * y;
    x[i] = y;
  }
}

/** Build a biquad from an EQ descriptor { type, f, q?, gain? }. Aliases: hp, lp, peaking, ls, hs. */
export function eqBand(d) {
  const alias = { hp: 'highpass', lp: 'lowpass', peaking: 'peak', bell: 'peak', ls: 'lowshelf', hs: 'highshelf', bp: 'bandpass' };
  const type = alias[d.type] || d.type;
  return biquad(type, d.f, d.q ?? Math.SQRT1_2, d.gain ?? 0);
}

/** Apply a list of EQ descriptors to a stereo pair in place. */
export function eqStereo(bands, L, R, start = 0, end = L.length) {
  for (const d of bands) {
    const c = eqBand(d);
    biquadRun(c, L, start, end);
    biquadRun(c, R, start, end);
  }
}

// ---------------------------------------------------------------- Loudness (ITU-R BS.1770-4, gated)

function kWeightCoefs(sr) {
  // Analog prototypes of the BS.1770 pre-filter, re-derived for any sample rate.
  const f0 = 1681.974450955533, G = 3.999843853973347, Q = 0.7071752369554196;
  let K = Math.tan((Math.PI * f0) / sr);
  const Vh = Math.pow(10, G / 20), Vb = Math.pow(Vh, 0.4996667741545416);
  let a0 = 1 + K / Q + K * K;
  const shelf = {
    b0: (Vh + (Vb * K) / Q + K * K) / a0, b1: (2 * (K * K - Vh)) / a0, b2: (Vh - (Vb * K) / Q + K * K) / a0,
    a1: (2 * (K * K - 1)) / a0, a2: (1 - K / Q + K * K) / a0,
  };
  const f1 = 38.13547087602444, Q1 = 0.5003270373238773;
  K = Math.tan((Math.PI * f1) / sr);
  a0 = 1 + K / Q1 + K * K;
  const hp = { b0: 1, b1: -2, b2: 1, a1: (2 * (K * K - 1)) / a0, a2: (1 - K / Q1 + K * K) / a0 };
  return { shelf, hp };
}

/** Integrated loudness in LUFS of the stereo range [start, start+n). */
export function integratedLufs(L, R, n = L.length, start = 0) {
  const { shelf, hp } = kWeightCoefs(SR);
  const hop = Math.round(SR / 10);
  const nh = Math.floor(n / hop);
  if (nh < 4) return -Infinity;
  const e = new Float64Array(nh);
  const chans = [L, R];
  for (let c = 0; c < 2; c++) {
    const x = chans[c];
    let s1 = 0, s2 = 0, h1 = 0, h2 = 0, acc = 0, h = 0, cnt = 0;
    const lim = nh * hop;
    for (let i = 0; i < lim; i++) {
      const v = x[start + i];
      const y = shelf.b0 * v + s1;
      s1 = shelf.b1 * v - shelf.a1 * y + s2;
      s2 = shelf.b2 * v - shelf.a2 * y;
      const z = y + h1;
      h1 = -2 * y - hp.a1 * z + h2;
      h2 = y - hp.a2 * z;
      acc += z * z;
      if (++cnt === hop) { e[h++] += acc; acc = 0; cnt = 0; }
    }
  }
  const nb = nh - 3;
  const p = new Float64Array(nb);
  for (let j = 0; j < nb; j++) p[j] = (e[j] + e[j + 1] + e[j + 2] + e[j + 3]) / (4 * hop);
  const absT = Math.pow(10, (-70 + 0.691) / 10);
  let sum = 0, cnt = 0;
  for (let j = 0; j < nb; j++) if (p[j] > absT) { sum += p[j]; cnt++; }
  if (!cnt) return -Infinity;
  const relT = (sum / cnt) * 0.1; // -10 LU
  sum = 0; cnt = 0;
  for (let j = 0; j < nb; j++) if (p[j] > absT && p[j] > relT) { sum += p[j]; cnt++; }
  if (!cnt) return -Infinity;
  return -0.691 + 10 * Math.log10(sum / cnt);
}

// ---------------------------------------------------------------- True peak (4x oversampled)

const TP_TAPS = 12; // taps per phase
const TP_HALF = TP_TAPS / 2;
const TP_COEF = (() => {
  const c = [];
  for (let p = 1; p < 4; p++) {
    const frac = p / 4;
    const row = new Float64Array(TP_TAPS);
    for (let m = -TP_HALF + 1; m <= TP_HALF; m++) {
      const t = m - frac;
      const sinc = Math.abs(t) < 1e-9 ? 1 : Math.sin(Math.PI * t) / (Math.PI * t);
      const u = t / (TP_HALF + 0.5);
      // Blackman window over |t| <= TP_HALF + 0.5
      const w = 0.42 + 0.5 * Math.cos(Math.PI * u) + 0.08 * Math.cos(2 * Math.PI * u);
      row[m + TP_HALF - 1] = sinc * w;
    }
    c.push(row);
  }
  return c;
})();

/**
 * Per-sample true-peak envelope: out[i] = max |x| over channel samples i and the three
 * interpolated points between i and i+1. Interpolation is skipped where the sample peak is below `skipBelow`.
 * Returns the overall true peak (linear).
 */
export function truePeakEnvelope(L, R, n, out, skipBelow = 0) {
  let top = 0;
  const chans = [L, R];
  if (out) out.fill(0, 0, n);
  for (let c = 0; c < 2; c++) {
    const x = chans[c];
    for (let i = 0; i < n; i++) {
      let pk = Math.abs(x[i]);
      if (i >= TP_HALF - 1 && i < n - TP_HALF) {
        const nx = Math.abs(x[i + 1]);
        if (pk >= skipBelow || nx >= skipBelow) {
          for (let p = 0; p < 3; p++) {
            const row = TP_COEF[p];
            let s = 0;
            const base = i - TP_HALF + 1;
            for (let k = 0; k < TP_TAPS; k++) s += x[base + k] * row[k];
            if (s < 0) s = -s;
            if (s > pk) pk = s;
          }
        }
      }
      if (out) { if (pk > out[i]) out[i] = pk; }
      if (pk > top) top = pk;
    }
  }
  return top;
}

/** Piecewise-linear curve lookup. points = [[x, y], ...] sorted by x. */
export function curveAt(points, x) {
  const n = points.length;
  if (!n) return 0;
  if (x <= points[0][0]) return points[0][1];
  if (x >= points[n - 1][0]) return points[n - 1][1];
  let i = 1;
  while (points[i][0] < x) i++;
  const a = points[i - 1], b = points[i];
  const w = b[0] - a[0];
  return w <= 0 ? b[1] : a[1] + ((b[1] - a[1]) * (x - a[0])) / w;
}
