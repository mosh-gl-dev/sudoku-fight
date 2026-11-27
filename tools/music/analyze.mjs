#!/usr/bin/env node
// tools/music/analyze.mjs
//
// Objective audio analyzer + score linter for the synthesized soundtrack.
// Pure Node (no dependencies, no ffmpeg). Deterministic: no RNG, no clock.
//
// CLI:
//   node tools/music/analyze.mjs <file.wav> [--score file.score.json] [--png out.png]
//                                [--loop] [--json out.json] [--strict]
//
// Exports: readWav, analyzeAudio, lintScore, writeSpectrogramPng
//
// What is exact and what is approximate is documented next to each measurement
// and repeated in report.notes.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const db10 = (x) => (x > 0 ? 10 * Math.log10(x) : -Infinity);
const db20 = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
const rnd = (x, d = 2) => {
  if (x === null || x === undefined || !Number.isFinite(x)) return null;
  const m = 10 ** d;
  return Math.round(x * m) / m;
};
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const pc = (m) => ((Math.round(m) % 12) + 12) % 12;
export function pitchName(midi) {
  const r = Math.round(midi);
  return NOTE_NAMES[((r % 12) + 12) % 12] + (Math.floor(r / 12) - 1);
}
function freqToNote(f) {
  const m = 69 + 12 * Math.log2(f / 440);
  const r = Math.round(m);
  const cents = Math.round((m - r) * 100);
  return pitchName(r) + (cents === 0 ? '' : (cents > 0 ? '+' : '') + cents + 'c');
}

// ---------------------------------------------------------------------------
// WAV reader (PCM 8/16/24/32, IEEE float 32/64, WAVE_FORMAT_EXTENSIBLE)
// ---------------------------------------------------------------------------

export function readWav(file) {
  const buf = Buffer.isBuffer(file) ? file : fs.readFileSync(file);
  if (buf.length < 12 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('not a RIFF/WAVE file');
  }
  let pos = 12;
  let fmt = null;
  let dataOff = -1;
  let dataLen = 0;
  while (pos + 8 <= buf.length) {
    const id = buf.toString('ascii', pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    const body = pos + 8;
    if (id === 'fmt ') {
      let format = buf.readUInt16LE(body);
      const numChannels = buf.readUInt16LE(body + 2);
      const sampleRate = buf.readUInt32LE(body + 4);
      const bits = buf.readUInt16LE(body + 14);
      if (format === 0xfffe && size >= 26) format = buf.readUInt16LE(body + 24);
      fmt = { format, numChannels, sampleRate, bits };
    } else if (id === 'data') {
      dataOff = body;
      dataLen = Math.min(size, buf.length - body);
      if (fmt) break;
    }
    pos = body + size + (size & 1);
  }
  if (!fmt) throw new Error('WAV: missing fmt chunk');
  if (dataOff < 0) throw new Error('WAV: missing data chunk');
  const { format, numChannels, sampleRate, bits } = fmt;
  const bps = bits >> 3;
  const frames = Math.floor(dataLen / (bps * numChannels));
  const channels = [];
  for (let c = 0; c < numChannels; c++) channels.push(new Float32Array(frames));
  const stride = bps * numChannels;
  for (let c = 0; c < numChannels; c++) {
    const out = channels[c];
    let o = dataOff + c * bps;
    if (format === 1 && bits === 16) {
      for (let i = 0; i < frames; i++, o += stride) out[i] = (((buf[o] | (buf[o + 1] << 8)) << 16) >> 16) / 32768;
    } else if (format === 1 && bits === 24) {
      for (let i = 0; i < frames; i++, o += stride) out[i] = (((buf[o] | (buf[o + 1] << 8) | (buf[o + 2] << 16)) << 8) >> 8) / 8388608;
    } else if (format === 1 && bits === 32) {
      for (let i = 0; i < frames; i++, o += stride) out[i] = buf.readInt32LE(o) / 2147483648;
    } else if (format === 1 && bits === 8) {
      for (let i = 0; i < frames; i++, o += stride) out[i] = (buf[o] - 128) / 128;
    } else if (format === 3 && bits === 32) {
      for (let i = 0; i < frames; i++, o += stride) out[i] = buf.readFloatLE(o);
    } else if (format === 3 && bits === 64) {
      for (let i = 0; i < frames; i++, o += stride) out[i] = buf.readDoubleLE(o);
    } else {
      throw new Error(`WAV: unsupported format ${format} / ${bits} bit`);
    }
  }
  return {
    sampleRate,
    numChannels,
    channels,
    numSamples: frames,
    bitDepth: bits,
    format: format === 3 ? 'float' : 'pcm',
  };
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

// BS.1770 K-weighting, re-derived for any sample rate (the standard only
// tabulates 48 kHz; these are the analog prototypes used by libebur128).
function kWeightingSos(fs) {
  const out = [];
  {
    const f0 = 1681.974450955533;
    const G = 3.999843853973347;
    const Q = 0.7071752369554196;
    const K = Math.tan((Math.PI * f0) / fs);
    const Vh = 10 ** (G / 20);
    const Vb = Vh ** 0.4996667741545416;
    const a0 = 1 + K / Q + K * K;
    out.push([
      (Vh + (Vb * K) / Q + K * K) / a0,
      (2 * (K * K - Vh)) / a0,
      (Vh - (Vb * K) / Q + K * K) / a0,
      (2 * (K * K - 1)) / a0,
      (1 - K / Q + K * K) / a0,
    ]);
  }
  {
    const f0 = 38.13547087602444;
    const Q = 0.5003270373238773;
    const K = Math.tan((Math.PI * f0) / fs);
    const a0 = 1 + K / Q + K * K;
    out.push([1, -2, 1, (2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0]);
  }
  return out;
}

// 4th-order Butterworth high-pass as two RBJ biquads.
function butterHp4Sos(fc, fs) {
  const out = [];
  for (const Q of [0.5411961001461969, 1.3065629648763766]) {
    const w = (2 * Math.PI * fc) / fs;
    const c = Math.cos(w);
    const al = Math.sin(w) / (2 * Q);
    const a0 = 1 + al;
    out.push([(1 + c) / 2 / a0, -(1 + c) / a0, (1 + c) / 2 / a0, (-2 * c) / a0, (1 - al) / a0]);
  }
  return out;
}

// K-weighted energy per 100 ms sub-block, summed over channels (L/R weight 1).
// `pre` is an optional list of extra biquads applied before the K filter.
function kEnergyBlocks(channels, fs, pre = []) {
  const sub = Math.round(fs / 10);
  const N = channels[0].length;
  const nSub = Math.floor(N / sub);
  const e = new Float64Array(nSub);
  const sos = [...pre, ...kWeightingSos(fs)];
  const nS = sos.length;
  const B0 = new Float64Array(nS), B1 = new Float64Array(nS), B2 = new Float64Array(nS);
  const A1 = new Float64Array(nS), A2 = new Float64Array(nS);
  for (let s = 0; s < nS; s++) [B0[s], B1[s], B2[s], A1[s], A2[s]] = sos[s];
  for (const x of channels) {
    const z1 = new Float64Array(nS), z2 = new Float64Array(nS);
    let n = 0;
    for (let j = 0; j < nSub; j++) {
      let acc = 0;
      for (let i = 0; i < sub; i++, n++) {
        let v = x[n];
        for (let s = 0; s < nS; s++) {
          const y = B0[s] * v + z1[s];
          z1[s] = B1[s] * v - A1[s] * y + z2[s];
          z2[s] = B2[s] * v - A2[s] * y;
          v = y;
        }
        acc += v * v;
      }
      e[j] += acc / sub;
    }
  }
  return e;
}

const lufsOf = (z) => (z > 0 ? -0.691 + 10 * Math.log10(z) : -Infinity);
const ABS_GATE = 10 ** ((-70 + 0.691) / 10);

function meanRange(e, a, b) {
  a = Math.max(0, a);
  b = Math.min(e.length, b);
  if (b <= a) return 0;
  let s = 0;
  for (let i = a; i < b; i++) s += e[i];
  return s / (b - a);
}

// Integrated loudness (BS.1770-4 gating) from 100 ms sub-block energies.
function integratedFromBlocks(e) {
  const nb = e.length - 3;
  if (nb < 1) return lufsOf(meanRange(e, 0, e.length));
  const z = new Float64Array(nb);
  let run = e[0] + e[1] + e[2] + e[3];
  z[0] = run / 4;
  for (let j = 1; j < nb; j++) {
    run += e[j + 3] - e[j - 1];
    z[j] = run / 4;
  }
  let s = 0, c = 0;
  for (let j = 0; j < nb; j++) if (z[j] > ABS_GATE) { s += z[j]; c++; }
  if (!c) return -Infinity;
  const rel = (s / c) * 0.1; // -10 LU
  let s2 = 0, c2 = 0;
  for (let j = 0; j < nb; j++) if (z[j] > ABS_GATE && z[j] > rel) { s2 += z[j]; c2++; }
  return c2 ? lufsOf(s2 / c2) : -Infinity;
}

function windowedLufs(e, len) {
  const nb = e.length - len + 1;
  if (nb < 1) return new Float32Array(0);
  const out = new Float32Array(nb);
  let run = 0;
  for (let i = 0; i < len; i++) run += e[i];
  out[0] = lufsOf(run / len);
  for (let j = 1; j < nb; j++) {
    run += e[j + len - 1] - e[j - 1];
    if (run < 0) run = 0;
    out[j] = lufsOf(run / len);
  }
  return out;
}

// Loudness range per EBU Tech 3342 (3 s blocks, here hopped every 100 ms).
function loudnessRange(shortTerm) {
  const z = [];
  for (const l of shortTerm) if (l > -70) z.push(10 ** ((l + 0.691) / 10));
  if (z.length < 2) return 0;
  const mean = z.reduce((a, b) => a + b, 0) / z.length;
  const thr = lufsOf(mean) - 20;
  const v = [];
  for (const l of shortTerm) if (l > -70 && l > thr) v.push(l);
  if (v.length < 2) return 0;
  v.sort((a, b) => a - b);
  const q = (p) => v[Math.round(p * (v.length - 1))];
  return q(0.95) - q(0.1);
}

// ---------------------------------------------------------------------------
// FFT (iterative radix-2, in place)
// ---------------------------------------------------------------------------

function makeFFT(n) {
  const levels = Math.round(Math.log2(n));
  if (1 << levels !== n) throw new Error('FFT size must be a power of two');
  const rev = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    let r = 0;
    for (let b = 0; b < levels; b++) r |= ((i >>> b) & 1) << (levels - 1 - b);
    rev[i] = r;
  }
  const cos = new Float64Array(n / 2), sin = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    cos[i] = Math.cos((2 * Math.PI * i) / n);
    sin[i] = Math.sin((2 * Math.PI * i) / n);
  }
  return function fft(re, im) {
    for (let i = 0; i < n; i++) {
      const j = rev[i];
      if (j > i) {
        let t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1, step = n / size;
      for (let i = 0; i < n; i += size) {
        for (let j = 0, k = 0; j < half; j++, k += step) {
          const a = i + j, b = a + half;
          const tr = re[b] * cos[k] + im[b] * sin[k];
          const ti = im[b] * cos[k] - re[b] * sin[k];
          re[b] = re[a] - tr; im[b] = im[a] - ti;
          re[a] += tr; im[a] += ti;
        }
      }
    }
  };
}

// ---------------------------------------------------------------------------
// True peak (4x oversampling, 16 taps per phase, Blackman-windowed sinc)
// ---------------------------------------------------------------------------

const TP_HALF = 8;
const TP_COEF = (() => {
  const out = [];
  for (let p = 1; p < 4; p++) {
    const c = new Float64Array(2 * TP_HALF);
    let sum = 0;
    for (let j = -TP_HALF + 1; j <= TP_HALF; j++) {
      const u = j - p / 4;
      const sinc = Math.sin(Math.PI * u) / (Math.PI * u);
      const w = 0.42 + 0.5 * Math.cos((Math.PI * u) / TP_HALF) + 0.08 * Math.cos((2 * Math.PI * u) / TP_HALF);
      c[j + TP_HALF - 1] = sinc * w;
      sum += sinc * w;
    }
    for (let i = 0; i < c.length; i++) c[i] /= sum;
    out.push(c);
  }
  return out;
})();

function truePeakOf(x, samplePeak) {
  let tp = samplePeak;
  const gate = samplePeak * 0.3; // inter-sample peaks only matter near loud samples
  const N = x.length;
  const [c1, c2, c3] = TP_COEF;
  const L = 2 * TP_HALF;
  for (let n = TP_HALF - 1; n < N - TP_HALF; n++) {
    const a = x[n], b = x[n + 1];
    if ((a < gate && a > -gate) && (b < gate && b > -gate)) continue;
    const base = n - TP_HALF + 1;
    let y1 = 0, y2 = 0, y3 = 0;
    for (let k = 0; k < L; k++) {
      const v = x[base + k];
      y1 += v * c1[k]; y2 += v * c2[k]; y3 += v * c3[k];
    }
    if (y1 < 0) y1 = -y1;
    if (y2 < 0) y2 = -y2;
    if (y3 < 0) y3 = -y3;
    if (y1 > tp) tp = y1;
    if (y2 > tp) tp = y2;
    if (y3 > tp) tp = y3;
  }
  return tp;
}

// ---------------------------------------------------------------------------
// Click detector
// ---------------------------------------------------------------------------
// A click is a sample-to-sample jump that is an isolated outlier: more than
// CLICK_K_MAX times the largest jump anywhere else within +-46 ms AND more than
// CLICK_K_RMS times the RMS jump there. Comparing against the local *maximum*
// keeps periodic steep waveforms (saw, pulse) and noise bursts from being
// reported, because they contain many jumps of the same size.

const CLICK_K_MAX = 3;
const CLICK_K_RMS = 8;
const CLICK_FLOOR = 0.003; // about -50 dBFS

function detectClicks(x, fs) {
  const N = x.length;
  const B = 256, CTX = 2048, EXC = 4;
  const out = [];
  for (let b0 = 1; b0 < N; b0 += B) {
    const b1 = Math.min(N, b0 + B);
    let m = 0, mi = -1;
    for (let i = b0; i < b1; i++) {
      let d = x[i] - x[i - 1];
      if (d < 0) d = -d;
      if (d > m) { m = d; mi = i; }
    }
    if (m < CLICK_FLOOR) continue;
    const c0 = Math.max(1, mi - CTX), c1 = Math.min(N, mi + CTX + 1);
    const lim = m / CLICK_K_MAX;
    let cm = 0, ss = 0, cnt = 0, ok = true;
    for (let i = c0; i < c1; i++) {
      if (i >= mi - EXC && i <= mi + EXC) continue;
      let d = x[i] - x[i - 1];
      if (d < 0) d = -d;
      if (d > lim) { ok = false; break; }
      if (d > cm) cm = d;
      ss += d * d; cnt++;
    }
    if (!ok) continue;
    const rms = cnt ? Math.sqrt(ss / cnt) : 0;
    if (m > CLICK_K_RMS * rms) {
      out.push({ sample: mi, t: mi / fs, jump: m, ratioToLocalMax: cm > 0 ? m / cm : Infinity, ratioToLocalRms: rms > 0 ? m / rms : Infinity });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Spectral analysis (STFT 8192 / hop 2048, Hann)
// ---------------------------------------------------------------------------

const SPEC_N = 8192;
const SPEC_HOP = 2048;
const SPEC_FMIN = 30;
const SPEC_FMAX = 18000;
const SPEC_ROWS = 480;

const BANDS = [
  { name: 'sub', lo: 0, hi: 40 },
  { name: 'bass', lo: 40, hi: 120 },
  { name: 'lowMid', lo: 120, hi: 400 },
  { name: 'mid', lo: 400, hi: 2000 },
  { name: 'presence', lo: 2000, hi: 6000 },
  { name: 'air', lo: 6000, hi: Infinity },
];

function spectralAnalysis(channels, fs) {
  const N = SPEC_N, hop = SPEC_HOP, half = N / 2;
  const len = channels[0].length;
  // Full frames only: a zero-padded last frame would smear a fake broadband line at the end.
  const F = Math.max(1, Math.floor((len - N) / hop) + 1);
  const df = fs / N;
  const fft = makeFFT(N);
  const win = new Float64Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N);
  // Scale so that the one-sided sum of pw[] equals the mean square of the frame.
  const scale = 16 / (3 * N * N) / channels.length;
  const re = new Float64Array(N), im = new Float64Array(N);
  const pw = new Float64Array(half + 1);
  const lt = new Float64Array(half + 1);

  const bandOfBin = new Uint8Array(half + 1);
  for (let k = 0; k <= half; k++) {
    const f = k * df;
    bandOfBin[k] = BANDS.findIndex((b) => f >= b.lo && f < b.hi);
  }
  const bin = (f) => Math.min(half, Math.max(1, Math.round(f / df)));
  const k300 = bin(300), k2k = bin(2000), k5k = bin(5000), k8k = bin(8000), k16k = bin(16000);

  // log-frequency rows for the spectrogram
  const rowLo = new Int32Array(SPEC_ROWS), rowHi = new Int32Array(SPEC_ROWS);
  const rowPos = new Float64Array(SPEC_ROWS);
  const ratio = SPEC_FMAX / SPEC_FMIN;
  for (let r = 0; r < SPEC_ROWS; r++) {
    const kLo = (SPEC_FMIN * ratio ** (r / SPEC_ROWS)) / df;
    const kHi = (SPEC_FMIN * ratio ** ((r + 1) / SPEC_ROWS)) / df;
    const a = Math.ceil(kLo), b = Math.floor(kHi);
    if (a <= b) { rowLo[r] = a; rowHi[r] = Math.min(b, half); } else { rowLo[r] = -1; rowPos[r] = (kLo + kHi) / 2; }
  }

  const rows = new Float32Array(F * SPEC_ROWS);
  const tot = new Float64Array(F), fsum = new Float64Array(F);
  const bandE = BANDS.map(() => new Float64Array(F));
  const e25 = new Float64Array(F), eMid = new Float64Array(F), e816 = new Float64Array(F), e16 = new Float64Array(F);

  for (let f = 0; f < F; f++) {
    const off = f * hop;
    pw.fill(0);
    for (const x of channels) {
      const avail = Math.min(N, len - off);
      for (let i = 0; i < avail; i++) re[i] = x[off + i] * win[i];
      for (let i = Math.max(0, avail); i < N; i++) re[i] = 0;
      im.fill(0);
      fft(re, im);
      for (let k = 0; k <= half; k++) pw[k] += (re[k] * re[k] + im[k] * im[k]) * scale;
    }
    let t = 0, fs1 = 0;
    for (let k = 1; k <= half; k++) {
      const p = pw[k];
      lt[k] += p;
      t += p; fs1 += p * k;
      bandE[bandOfBin[k]][f] += p;
    }
    tot[f] = t; fsum[f] = fs1 * df;
    let s = 0;
    for (let k = k2k; k < k5k; k++) s += pw[k];
    e25[f] = s; s = 0;
    for (let k = k300; k < k2k; k++) s += pw[k];
    eMid[f] = s; s = 0;
    for (let k = k8k; k < k16k; k++) s += pw[k];
    e816[f] = s; s = 0;
    for (let k = k16k; k <= half; k++) s += pw[k];
    e16[f] = s;
    const base = f * SPEC_ROWS;
    for (let r = 0; r < SPEC_ROWS; r++) {
      if (rowLo[r] >= 0) {
        let m = 0;
        for (let k = rowLo[r]; k <= rowHi[r]; k++) if (pw[k] > m) m = pw[k];
        rows[base + r] = m;
      } else {
        const k0 = Math.floor(rowPos[r]), fr = rowPos[r] - k0;
        rows[base + r] = pw[k0] * (1 - fr) + pw[Math.min(half, k0 + 1)] * fr;
      }
    }
  }
  for (let k = 0; k <= half; k++) lt[k] /= F;
  const frameTime = (f) => (f * hop + N / 2) / fs;
  return { N, hop, half, df, F, lt, rows, tot, fsum, bandE, e25, eMid, e816, e16, frameTime, k16k, k8k, bin };
}

function centroidRange(sp, fs, t0, t1) {
  let a = 0, b = 0;
  const f0 = Math.max(0, Math.floor((t0 * fs - sp.N / 2) / sp.hop));
  const f1 = Math.min(sp.F, Math.ceil((t1 * fs - sp.N / 2) / sp.hop) + 1);
  for (let f = f0; f < f1; f++) {
    const t = sp.frameTime(f);
    if (t < t0 || t >= t1) continue;
    a += sp.fsum[f]; b += sp.tot[f];
  }
  return b > 0 ? a / b : 0;
}

// Narrow long-term peaks standing more than `minDb` above the 1/3-octave
// smoothed long-term spectrum.
function findResonances(sp, minDb = 9) {
  const { lt, half, df } = sp;
  const pre = new Float64Array(half + 2);
  for (let k = 0; k <= half; k++) pre[k + 1] = pre[k] + lt[k];
  const total = pre[half + 1] - pre[1];
  let maxP = 0;
  for (let k = 1; k <= half; k++) if (lt[k] > maxP) maxP = lt[k];
  const w = 2 ** (1 / 6);
  const out = [];
  const kMin = Math.ceil(80 / df), kMax = Math.min(half - 3, Math.floor(16000 / df));
  for (let k = kMin; k <= kMax; k++) {
    const p = lt[k];
    if (p < maxP * 1e-5) continue;
    if (!(p >= lt[k - 1] && p >= lt[k + 1] && p >= lt[k - 2] && p >= lt[k + 2])) continue;
    const a = Math.max(1, Math.floor(k / w)), b = Math.min(half, Math.ceil(k * w));
    const smooth = (pre[b + 1] - pre[a]) / (b - a + 1);
    const excess = db10(p / smooth);
    if (excess <= minDb) continue;
    // parabolic interpolation of the peak frequency
    const l0 = Math.log(lt[k - 1] + 1e-30), l1 = Math.log(p + 1e-30), l2 = Math.log(lt[k + 1] + 1e-30);
    const den = l0 - 2 * l1 + l2;
    const delta = den !== 0 ? clamp((0.5 * (l0 - l2)) / den, -0.5, 0.5) : 0;
    const freq = (k + delta) * df;
    const line = lt[k - 2] + lt[k - 1] + p + lt[k + 1] + lt[k + 2];
    out.push({ freqHz: freq, excessDb: excess, levelDbRelTotal: db10(line / total) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Loop (wrap-around) check
// ---------------------------------------------------------------------------

function loopCheck(channels, fs) {
  const N = channels[0].length;
  const halfSec = Math.min(Math.round(fs * 0.5), N >> 1);
  const one = Math.min(fs, N >> 1);
  let worst = { jump: 0, maxDiff: 0, rmsDiff: 0, slopeJump: 0, ratioMax: 0, ratioRms: 0 };
  let seamClicks = 0;
  for (const x of channels) {
    const j = new Float32Array(2 * halfSec);
    j.set(x.subarray(N - halfSec), 0);
    j.set(x.subarray(0, halfSec), halfSec);
    const jump = Math.abs(j[halfSec] - j[halfSec - 1]);
    const slopeJump = Math.abs(j[halfSec] - 2 * j[halfSec - 1] + j[halfSec - 2]);
    let mx = 0, ss = 0, cnt = 0;
    const c0 = Math.max(1, halfSec - 4096), c1 = Math.min(j.length, halfSec + 4096);
    for (let i = c0; i < c1; i++) {
      if (i >= halfSec - 4 && i <= halfSec + 4) continue;
      const d = Math.abs(j[i] - j[i - 1]);
      if (d > mx) mx = d;
      ss += d * d; cnt++;
    }
    const rms = Math.sqrt(ss / Math.max(1, cnt));
    const ratioMax = mx > 0 ? jump / mx : jump > 0 ? Infinity : 0;
    const ratioRms = rms > 0 ? jump / rms : jump > 0 ? Infinity : 0;
    if (jump >= worst.jump) worst = { jump, maxDiff: mx, rmsDiff: rms, slopeJump, ratioMax, ratioRms };
    for (const c of detectClicks(j, fs)) if (Math.abs(c.sample - halfSec) <= 6) seamClicks++;
  }
  const rmsOf = (a, b) => {
    let s = 0;
    for (const x of channels) for (let i = a; i < b; i++) s += x[i] * x[i];
    return Math.sqrt(s / ((b - a) * channels.length));
  };
  const endDb = db20(rmsOf(N - one, N)), startDb = db20(rmsOf(0, one));
  const end50 = db20(rmsOf(N - Math.round(fs * 0.05), N)), start50 = db20(rmsOf(0, Math.round(fs * 0.05)));
  const bothSilent = endDb < -70 && startDb < -70;
  const levelStep = bothSilent ? 0 : startDb - endDb; // > 0: the start of the file is louder than its end
  const levelDiff = Math.abs(levelStep);

  // The seam is judged against the music itself. A downbeat after a quiet bar is a level step of many dB, and
  // so is every other entry in the piece: the wrap is seamless when it is no more abrupt than the steps (of the
  // same direction) found inside the file. A faded-out ending or a cut-off tail has nothing like it inside.
  let innerRise = 0, innerDrop = 0;
  {
    const hopL = Math.max(1, Math.round(fs * 0.25));
    const nb = Math.floor(N / hopL);
    const e = new Float64Array(nb + 1);
    for (let b = 0; b < nb; b++) { let acc = 0; for (const x of channels) for (let i = b * hopL; i < (b + 1) * hopL; i++) acc += x[i] * x[i]; e[b + 1] = e[b] + acc; }
    const k = Math.max(1, Math.round(one / hopL));
    const lv = (a, b) => db20(Math.sqrt((e[b] - e[a]) / ((b - a) * hopL * channels.length)));
    for (let b = k; b + k <= nb; b++) {
      const before = lv(b - k, b), after = lv(b, b + k);
      if (before < -70 && after < -70) continue;
      const d = after - before;
      if (d > innerRise) innerRise = d;
      if (-d > innerDrop) innerDrop = -d;
    }
  }
  const levelLimit = Math.max(3, (levelStep >= 0 ? innerRise : innerDrop) + 1);

  // spectral difference between the last and the first 0.37 s, 1/3-octave bands
  let spectralDiff = 0, bandsUsed = 0, spectralInner = 0;
  const M = 16384;
  if (N >= 2 * M) {
    const fft = makeFFT(M);
    const spec = (off) => {
      const p = new Float64Array(M / 2 + 1);
      const re = new Float64Array(M), im = new Float64Array(M);
      for (const x of channels) {
        for (let i = 0; i < M; i++) re[i] = x[off + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / M));
        im.fill(0);
        fft(re, im);
        for (let k = 0; k <= M / 2; k++) p[k] += re[k] * re[k] + im[k] * im[k];
      }
      const bands = [];
      for (let fc = 50; fc < 16000; fc *= 2 ** (1 / 3)) {
        const a = Math.max(1, Math.round((fc / 2 ** (1 / 6)) / (fs / M)));
        const b = Math.min(M / 2, Math.round((fc * 2 ** (1 / 6)) / (fs / M)));
        let s = 0;
        for (let k = a; k <= b; k++) s += p[k];
        bands.push(s);
      }
      return bands;
    };
    const diffOf = (A, B) => {
      const mx = Math.max(...A, ...B);
      if (!(mx > 0)) return 0;
      let d = 0, used = 0;
      for (let i = 0; i < A.length; i++) {
        if (Math.max(A[i], B[i]) < mx * 1e-5) continue; // ignore bands 50 dB below the strongest
        const fl = mx * 1e-7;
        d += Math.abs(db10((A[i] + fl) / (B[i] + fl)));
        used++;
      }
      return used ? d / used : 0;
    };
    spectralDiff = diffOf(spec(N - M), spec(0));
    bandsUsed = 1;
    // the same measure at up to 240 places inside the file: how different can two adjacent 0.37 s windows be?
    const inner = [];
    const stepS = Math.max(M, Math.floor((N - 2 * M) / 240));
    for (let p = M; p + M <= N; p += stepS) inner.push(diffOf(spec(p - M), spec(p)));
    inner.sort((a, b) => a - b);
    if (inner.length) spectralInner = inner[inner.length - 1];
  }
  const spectralLimit = Math.max(15, spectralInner + 3);
  const discontinuity = seamClicks > 0 || (worst.jump > CLICK_FLOOR && worst.ratioMax > CLICK_K_MAX);
  const pass = !discontinuity && levelDiff <= levelLimit && spectralDiff <= spectralLimit;
  return {
    seamJump: rnd(worst.jump, 5),
    seamJumpDbfs: rnd(db20(worst.jump), 1),
    seamJumpVsLocalMaxStep: rnd(worst.ratioMax, 2),
    seamJumpVsLocalRmsStep: rnd(worst.ratioRms, 2),
    seamSlopeJump: rnd(worst.slopeJump, 5),
    seamClickDetected: seamClicks > 0,
    levelLast1sDbfs: rnd(endDb, 2),
    levelFirst1sDbfs: rnd(startDb, 2),
    levelDiffDb: rnd(levelDiff, 2),
    levelStepDb: rnd(levelStep, 2),
    largestStepInsideDb: { rise: rnd(innerRise, 2), drop: rnd(innerDrop, 2) },
    levelLast50msDbfs: rnd(end50, 2),
    levelFirst50msDbfs: rnd(start50, 2),
    spectralDiffDb: rnd(spectralDiff, 2),
    spectralDiffInsideMaxDb: rnd(spectralInner, 2),
    limits: { seamJumpVsLocalMaxStep: CLICK_K_MAX, levelDiffDb: rnd(levelLimit, 2), spectralDiffDb: rnd(spectralLimit, 2) },
    note: 'level and spectral limits adapt to the music: 3 dB / 15 dB, or the largest same-direction 1 s level step inside the file + 1 dB / the largest adjacent-window spectral difference inside the file + 3 dB, whichever is larger',
    discontinuity,
    verdict: pass ? 'pass' : 'fail',
  };
}

// ---------------------------------------------------------------------------
// analyzeAudio
// ---------------------------------------------------------------------------

export const MASTER_TARGETS = {
  sampleRate: 44100,
  channels: 2,
  minDurationSec: 150,
  maxDurationSec: 210,
  lufsMin: -17,
  lufsMax: -15,
  truePeakMaxDbtp: -1,
  dcMax: 0.001,
  minCorrelation: 0,
  phoneHp150MaxLossLu: 3,
  harshnessMaxDb: -6, // 2-5 kHz energy relative to 300 Hz-2 kHz, long term
  harshnessP95MaxDb: 0,
  rumbleMaxDb: -20, // energy below 30 Hz relative to total
};

export function analyzeAudio(wav, opts = {}) {
  const { score = null } = opts;
  const fs = wav.sampleRate;
  const channels = wav.channels;
  const nch = channels.length;
  const N = channels[0].length;
  const L = channels[0], R = channels[1] || channels[0];
  const duration = N / fs;
  const wantLoop = opts.loop ?? !!(score && score.loop);
  const notes = [];

  // ---- pass 1: peak, clipping, DC, NaN, stereo sums --------------------------
  const sub = Math.round(fs / 10);
  const nSubAll = Math.ceil(N / sub);
  const sLL = new Float64Array(nSubAll), sRR = new Float64Array(nSubAll), sLR = new Float64Array(nSubAll);
  let nan = 0, clipped = 0;
  const peaks = [], dcs = [];
  for (const x of channels) {
    let pk = 0, sum = 0;
    for (let i = 0; i < N; i++) {
      const v = x[i];
      if (v !== v || v === Infinity || v === -Infinity) { nan++; x[i] = 0; continue; }
      sum += v;
      const a = v < 0 ? -v : v;
      if (a > pk) pk = a;
      if (a >= 0.9999) clipped++;
    }
    peaks.push(pk); dcs.push(sum / N);
  }
  for (let j = 0, n = 0; j < nSubAll; j++) {
    const end = Math.min(N, n + sub);
    let ll = 0, rr = 0, lr = 0;
    for (; n < end; n++) { const a = L[n], b = R[n]; ll += a * a; rr += b * b; lr += a * b; }
    sLL[j] = ll; sRR[j] = rr; sLR[j] = lr;
  }
  const samplePeak = Math.max(...peaks);

  // flat-topped runs: >= 5 identical consecutive samples within 2 % of the peak
  let flatSamples = 0, flatRuns = 0;
  if (samplePeak > 0.05) {
    const thr = samplePeak * 0.98;
    for (const x of channels) {
      let run = 1;
      for (let i = 1; i <= N; i++) {
        if (i < N && x[i] === x[i - 1] && (x[i] >= thr || x[i] <= -thr)) run++;
        else { if (run >= 5) { flatRuns++; flatSamples += run; } run = 1; }
      }
    }
  }

  let truePeak = 0;
  for (let c = 0; c < nch; c++) truePeak = Math.max(truePeak, truePeakOf(channels[c], peaks[c]));

  let totLL = 0, totRR = 0, totLR = 0;
  for (let j = 0; j < nSubAll; j++) { totLL += sLL[j]; totRR += sRR[j]; totLR += sLR[j]; }
  const rms = Math.sqrt((totLL + (nch > 1 ? totRR : totLL)) / (2 * N));

  // ---- loudness ----------------------------------------------------------------
  const e = kEnergyBlocks(channels, fs);
  const integrated = integratedFromBlocks(e);
  const momentary = windowedLufs(e, 4);
  const shortTerm = windowedLufs(e, 30);
  const lra = loudnessRange(shortTerm);
  let maxM = -Infinity, maxS = -Infinity;
  for (const v of momentary) if (v > maxM) maxM = v;
  for (const v of shortTerm) if (v > maxS) maxS = v;
  const stCurve = [];
  for (let j = 0; j < shortTerm.length; j += 10) stCurve.push(rnd(Math.max(-99, shortTerm[j]), 1));

  const rangeLufs = (t0, t1) => lufsOf(meanRange(e, Math.round(t0 * 10), Math.round(t1 * 10)));

  // ---- phone speaker figure ---------------------------------------------------
  const l300 = integratedFromBlocks(kEnergyBlocks(channels, fs, butterHp4Sos(300, fs)));
  const l150 = integratedFromBlocks(kEnergyBlocks(channels, fs, butterHp4Sos(150, fs)));

  // ---- spectrum -----------------------------------------------------------------
  const sp = spectralAnalysis(channels, fs);
  let ltTotal = 0;
  for (let k = 1; k <= sp.half; k++) ltTotal += sp.lt[k];
  const bandsDb = {};
  BANDS.forEach((b, i) => {
    let s = 0;
    for (let f = 0; f < sp.F; f++) s += sp.bandE[i][f];
    bandsDb[b.name] = rnd(db10(s / sp.F / ltTotal), 1);
  });
  const sumArr = (a) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s; };
  const E25 = sumArr(sp.e25), EMID = sumArr(sp.eMid), E816 = sumArr(sp.e816), E16 = sumArr(sp.e16), ETOT = sumArr(sp.tot);
  const harshLong = db10(E25 / EMID);
  const harshFrames = [];
  let aliasFrames = 0, activeFrames = 0;
  const bw816 = 8000, bw16 = fs / 2 - 16000;
  for (let f = 0; f < sp.F; f++) {
    if (sp.tot[f] < 1e-7) continue;
    activeFrames++;
    if (sp.eMid[f] > 0) harshFrames.push(db10(sp.e25[f] / sp.eMid[f]));
    if (sp.e16[f] > sp.tot[f] * 1e-5 && sp.e16[f] / bw16 > 2 * sp.e816[f] / bw816) aliasFrames++;
  }
  harshFrames.sort((a, b) => a - b);
  const harshP95 = harshFrames.length ? harshFrames[Math.floor(0.95 * (harshFrames.length - 1))] : -Infinity;
  let worstHarsh = { v: -Infinity, t: 0 };
  for (let f = 0; f < sp.F; f++) {
    if (sp.tot[f] < 1e-6 || sp.eMid[f] <= 0) continue;
    const v = db10(sp.e25[f] / sp.eMid[f]);
    if (v > worstHarsh.v) worstHarsh = { v, t: sp.frameTime(f) };
  }

  let rumble = 0;
  for (let k = 1; k * sp.df < 30; k++) rumble += sp.lt[k];
  const rumbleDb = db10(rumble / ltTotal);

  // aliasing hint
  const kA = sp.bin(10000), kB = sp.k16k, kC = sp.bin(Math.min(21000, fs / 2 - 500));
  let dMid = 0, dHi = 0;
  for (let k = kA; k < kB; k++) dMid += sp.lt[k];
  for (let k = kB; k < kC; k++) dHi += sp.lt[k];
  dMid /= Math.max(1, kB - kA); dHi /= Math.max(1, kC - kB);
  const hfRel = db10(E16 / ETOT);
  const hfVsBelow = db10(dHi / dMid);
  const aliasFrac = activeFrames ? aliasFrames / activeFrames : 0;
  const aliasSuspected = hfRel > -55 && (hfVsBelow > 0 || aliasFrac > 0.1);
  const noHfRolloff = hfRel > -55 && hfVsBelow > -3;

  const resonancesAll = findResonances(sp).filter((r) => r.levelDbRelTotal > -40);
  resonancesAll.sort((a, b) => b.excessDb - a.excessDb);
  const resonances = resonancesAll.slice(0, 12).map((r) => ({
    freqHz: rnd(r.freqHz, 1),
    note: freqToNote(r.freqHz),
    excessDb: rnd(r.excessDb, 1),
    levelDbRelTotal: rnd(r.levelDbRelTotal, 1),
    significant: r.levelDbRelTotal > -15,
  }));

  // ---- dynamic arc ----------------------------------------------------------------
  const windows5s = [];
  for (let t = 0; t + 2.5 <= duration; t += 5) {
    const t1 = Math.min(duration, t + 5);
    windows5s.push({ t0: t, lufs: rnd(Math.max(-99, rangeLufs(t, t1)), 1), centroidHz: Math.round(centroidRange(sp, fs, t, t1)) });
  }
  let sections = null, moodSummary = null, moodContrast = null;
  if (score && Array.isArray(score.sections) && score.sections.length) {
    const sn = Array.isArray(score.notes) ? score.notes : [];
    sections = score.sections.map((s) => {
      const t0 = Math.max(0, s.t0), t1 = Math.min(duration, s.t1);
      let cnt = 0;
      for (const n of sn) if (n.t >= s.t0 && n.t < s.t1) cnt++;
      let stMax = -Infinity;
      for (let j = Math.round(t0 * 10); j < Math.min(shortTerm.length, Math.round(t1 * 10) - 30); j++) if (shortTerm[j] > stMax) stMax = shortTerm[j];
      return {
        name: s.name, mood: s.mood, t0: rnd(s.t0, 2), t1: rnd(s.t1, 2),
        lufs: rnd(Math.max(-99, rangeLufs(t0, t1)), 1),
        shortTermMaxLufs: rnd(stMax, 1),
        centroidHz: Math.round(centroidRange(sp, fs, t0, t1)),
        notesPerSec: rnd(cnt / Math.max(0.001, s.t1 - s.t0), 2),
      };
    });
    const by = {};
    for (const s of sections) {
      const m = (by[s.mood] ||= { dur: 0, z: 0, c: 0, d: 0 });
      const d = s.t1 - s.t0;
      m.dur += d; m.z += d * 10 ** ((s.lufs + 0.691) / 10); m.c += d * s.centroidHz; m.d += d * s.notesPerSec;
    }
    moodSummary = {};
    for (const [k, m] of Object.entries(by)) {
      moodSummary[k] = { seconds: rnd(m.dur, 1), lufs: rnd(lufsOf(m.z / m.dur), 1), centroidHz: Math.round(m.c / m.dur), notesPerSec: rnd(m.d / m.dur, 2) };
    }
    const g = moodSummary.gentle;
    const intense = ['tension', 'climax'].map((k) => moodSummary[k]).filter(Boolean);
    if (g && intense.length) {
      const loud = Math.max(...intense.map((m) => m.lufs));
      const bright = Math.max(...intense.map((m) => m.centroidHz));
      moodContrast = {
        loudestIntenseMinusGentleLu: rnd(loud - g.lufs, 1),
        brightestIntenseMinusGentleHz: Math.round(bright - g.centroidHz),
        gentleIsQuieter: loud - g.lufs >= 2,
        gentleIsDarker: bright > g.centroidHz,
      };
    }
  }

  // ---- stereo ----------------------------------------------------------------------
  const corrOf = (ll, rr, lr) => (ll > 0 && rr > 0 ? lr / Math.sqrt(ll * rr) : 1);
  let worstCorr = { v: 1, t: 0 };
  for (let j = 0; j + 30 <= nSubAll; j += 10) {
    let ll = 0, rr = 0, lr = 0;
    for (let i = j; i < j + 30; i++) { ll += sLL[i]; rr += sRR[i]; lr += sLR[i]; }
    if ((ll + rr) / (2 * 30 * sub) < 1e-6) continue; // quieter than -60 dBFS
    const c = corrOf(ll, rr, lr);
    if (c < worstCorr.v) worstCorr = { v: c, t: j / 10 };
  }
  const corr = nch > 1 ? corrOf(totLL, totRR, totLR) : 1;
  const eMidCh = (totLL + totRR + 2 * totLR) / 4, eSide = (totLL + totRR - 2 * totLR) / 4;

  // ---- defects ---------------------------------------------------------------------
  let clicksAll = [];
  for (let c = 0; c < nch; c++) for (const k of detectClicks(channels[c], fs)) clicksAll.push({ ...k, ch: c });
  clicksAll.sort((a, b) => a.sample - b.sample);
  const clicks = [];
  for (const k of clicksAll) {
    const last = clicks[clicks.length - 1];
    if (last && k.t - last.t < 0.005) { if (k.jump > last.jump) Object.assign(last, k); continue; }
    clicks.push({ ...k });
  }

  const gaps = [];
  {
    let start = -1;
    for (let j = 0; j <= nSubAll; j++) {
      const len = Math.min(sub, N - j * sub);
      const quiet = j < nSubAll && (sLL[j] + sRR[j]) / (2 * Math.max(1, len)) < 1e-6;
      if (quiet && start < 0) start = j;
      if (!quiet && start >= 0) {
        if (j - start >= 15) gaps.push({ t0: rnd(start / 10, 1), durationSec: rnd(Math.min(duration, j / 10) - start / 10, 1) });
        start = -1;
      }
    }
  }

  // ---- loop ------------------------------------------------------------------------
  const loop = wantLoop ? loopCheck(channels, fs) : null;

  // ---- verdict ---------------------------------------------------------------------
  const T = MASTER_TARGETS;
  const tpDb = db20(truePeak);
  const maxDc = Math.max(...dcs.map(Math.abs));
  const hp150Loss = integrated - l150, hp300Loss = integrated - l300;
  const items = [];
  const add = (target, pass, value, limit) => items.push({ target, pass: !!pass, value, limit });
  add('format 44.1 kHz stereo', fs === T.sampleRate && nch === T.channels, `${fs} Hz, ${nch} ch`, '44100 Hz, 2 ch');
  add('length 2:30-3:30', duration >= T.minDurationSec && duration <= T.maxDurationSec, rnd(duration, 2), '150..210 s');
  add('integrated loudness', integrated >= T.lufsMin && integrated <= T.lufsMax, rnd(integrated, 2), '-17..-15 LUFS');
  add('true peak', tpDb <= T.truePeakMaxDbtp, rnd(tpDb, 2), '<= -1 dBTP');
  add('clipped samples', clipped === 0 && flatSamples === 0, clipped + flatSamples, '0');
  add('no NaN/Inf', nan === 0, nan, '0');
  add('DC offset', maxDc < T.dcMax, rnd(maxDc, 5), '< 0.001');
  add('stereo correlation (mono compatible)', corr > T.minCorrelation, rnd(corr, 3), '> 0');
  add('worst 3 s correlation', worstCorr.v > T.minCorrelation, rnd(worstCorr.v, 3), '> 0');
  add('survives without <150 Hz', hp150Loss <= T.phoneHp150MaxLossLu, rnd(hp150Loss, 2), '<= 3 LU loss after 150 Hz HP');
  add('harshness 2-5 kHz', harshLong <= T.harshnessMaxDb && harshP95 <= T.harshnessP95MaxDb,
    `${rnd(harshLong, 1)} dB long-term, ${rnd(harshP95, 1)} dB p95`, '<= -6 dB long-term, <= 0 dB p95 (vs 300 Hz-2 kHz)');
  add('no clicks', clicks.length === 0, clicks.length, '0');
  add('no silence gaps > 1.5 s', gaps.length === 0, gaps.length, '0');
  add('rumble < 30 Hz', rumbleDb <= T.rumbleMaxDb, rnd(rumbleDb, 1), '<= -20 dB rel. total');
  if (loop) add('seamless loop', loop.verdict === 'pass',
    `jump ${loop.seamJumpVsLocalMaxStep}x local max step, level step ${loop.levelStepDb} dB, spectral diff ${loop.spectralDiffDb} dB`,
    `no seam click, <= ${loop.limits.levelDiffDb} dB, <= ${loop.limits.spectralDiffDb} dB (no more abrupt than the music inside)`);

  notes.push('Loudness: BS.1770-4 K-weighting re-derived for the file sample rate, 400 ms blocks with 75 % overlap, absolute (-70) and relative (-10 LU) gates. A mono file counts as one channel, so a full-scale 997 Hz mono (or one-channel) sine reads -3.01 LUFS and the same sine in both stereo channels reads 0.00 LUFS, exactly as the standard defines.');
  notes.push('True peak: 4x oversampling with a 64-tap Blackman-windowed sinc (not the exact BS.1770 annex filter); only evaluated near samples above 30 % of the sample peak. Expect +-0.1 dB, slightly more for content above 18 kHz.');
  notes.push('LRA uses 3 s blocks hopped every 100 ms (EBU 3342 asks for at least 1 Hz).');
  notes.push('Harshness, phone-speaker, rumble, aliasing and resonance thresholds are engineering heuristics, not standards. Harshness = energy 2-5 kHz relative to 300 Hz-2 kHz (pink noise reads about -3 dB; typical balanced music -8 to -15 dB).');
  notes.push('Resonance finder compares 5.4 Hz FFT bins with a 1/3-octave average, so sustained pure tones (a drone, a pedal note) are reported too; "significant" marks lines carrying more than about 3 % of total energy.');
  notes.push('Aliasing hint is only a hint: "suspected" fires when the energy density above 16 kHz is higher than in 10-16 kHz (overall, or by 3 dB in more than 10 % of frames). "noRolloffAbove16k" is the weaker sign (density within 3 dB): white noise does that too, and so does a naive non-band-limited oscillator. Aliases that fold below 16 kHz are not detected at all.');
  notes.push('Click detector reports isolated single-sample jumps (> 3x the largest other step within +-46 ms and > 8x the local RMS step, above -50 dBFS). Clicks buried in dense noise or smaller than the surrounding waveform steps are not found.');
  notes.push('Spectral figures use full 8192-sample frames only, so up to the last 0.19 s of the file is not in the spectrum or the spectrogram (levels, loudness, clicks and the loop check do cover it).');
  notes.push('Rumble uses FFT bins below 30 Hz with a Hann window; a strong bass note at 31-35 Hz leaks into it.');
  if (nch === 1) notes.push('Mono file: stereo figures are trivially 1 / -inf.');

  const report = {
    file: opts.file || null,
    format: { sampleRate: fs, channels: nch, bitDepth: wav.bitDepth ?? null, encoding: wav.format ?? null, samples: N, durationSec: rnd(duration, 3) },
    level: {
      samplePeakDbfs: rnd(db20(samplePeak), 2),
      truePeakDbtp: rnd(tpDb, 2),
      rmsDbfs: rnd(db20(rms), 2),
      crestFactorDb: rnd(db20(samplePeak / rms), 2),
      peakToLoudnessRatioLu: rnd(tpDb - integrated, 2),
      clippedSamples: clipped,
      flatTopSamples: flatSamples,
      flatTopRuns: flatRuns,
      dcOffset: dcs.map((d) => rnd(d, 6)),
      nanSamples: nan,
    },
    loudness: {
      integratedLufs: rnd(integrated, 2),
      loudnessRangeLu: rnd(lra, 2),
      maxMomentaryLufs: rnd(maxM, 2),
      maxShortTermLufs: rnd(maxS, 2),
      shortTerm: { windowSec: 3, firstCentreSec: 1.5, stepSec: 1, lufs: stCurve },
    },
    dynamicArc: { windows5s, sections, moodSummary, moodContrast },
    spectrum: {
      bandsDbRelTotal: bandsDb,
      centroidHz: Math.round(sumArr(sp.fsum) / Math.max(1e-30, ETOT)),
      phoneSpeaker: {
        lufsAfterHp300: rnd(l300, 2), lossAfterHp300Lu: rnd(hp300Loss, 2),
        lufsAfterHp150: rnd(l150, 2), lossAfterHp150Lu: rnd(hp150Loss, 2),
      },
      harshness: {
        longTermDb: rnd(harshLong, 1), p95Db: rnd(harshP95, 1),
        worstFrameDb: rnd(worstHarsh.v, 1), worstFrameSec: rnd(worstHarsh.t, 2),
        definition: 'energy 2-5 kHz relative to 300 Hz-2 kHz',
      },
      resonances,
      resonanceCount: resonancesAll.length,
    },
    stereo: {
      correlation: rnd(corr, 3),
      worst3sCorrelation: rnd(worstCorr.v, 3),
      worst3sAtSec: worstCorr.t,
      sideToMidDb: rnd(db10(eSide / eMidCh), 2),
      leftMinusRightDb: nch > 1 ? rnd(db10(totLL / totRR), 2) : 0,
    },
    defects: {
      clickCount: clicks.length,
      clicks: clicks.slice(0, 50).map((k) => ({
        t: rnd(k.t, 4), channel: k.ch, jump: rnd(k.jump, 4),
        ratioToLocalMaxStep: rnd(Math.min(k.ratioToLocalMax, 9999), 1), ratioToLocalRmsStep: rnd(Math.min(k.ratioToLocalRms, 99999), 1),
      })),
      silenceGaps: gaps,
      rumbleBelow30HzDbRelTotal: rnd(rumbleDb, 1),
      aliasing: {
        above16kDbRelTotal: rnd(hfRel, 1),
        density16to21kVs10to16kDb: rnd(hfVsBelow, 1),
        framesWithRisingHfFraction: rnd(aliasFrac, 3),
        noRolloffAbove16k: noHfRolloff,
        suspected: aliasSuspected,
      },
    },
    loop,
    verdict: { pass: items.every((i) => i.pass), failed: items.filter((i) => !i.pass).map((i) => i.target), items },
    notes,
  };
  Object.defineProperty(report, '__spectrogram', {
    enumerable: false,
    value: { rows: sp.rows, F: sp.F, nRows: SPEC_ROWS, fMin: SPEC_FMIN, fMax: SPEC_FMAX, hopSec: sp.hop / fs, firstSec: sp.N / 2 / fs, duration, shortTerm, momentary, integrated, truePeakDb: tpDb, lra },
  });
  return report;
}

// ---------------------------------------------------------------------------
// Score lint
// ---------------------------------------------------------------------------

const UNPITCHED_RE = /drum|kick|snare|hat|perc|clap|noise|shaker|cymbal|\btom|rim|riser|impact|boom|tick|click|fx|sweep|whoosh|taiko|crash/i;
const DECAY_RE = /piano|harp|pluck|celest|bell|glock|marimba|vibra|guitar|pizz|kalimba|music.?box|chime|keys|mallet|dulcimer|koto|timp/i;
const LEAD_RE = /lead|melod|solo|theme/i;
const DECAY_CAP_SEC = 1.2;

const SCALES = [
  ['major', [0, 2, 4, 5, 7, 9, 11]],
  ['natural minor', [0, 2, 3, 5, 7, 8, 10]],
  ['harmonic minor', [0, 2, 3, 5, 7, 8, 11]],
  ['dorian', [0, 2, 3, 5, 7, 9, 10]],
  ['phrygian', [0, 1, 3, 5, 7, 8, 10]],
  ['lydian', [0, 2, 4, 6, 7, 9, 11]],
  ['mixolydian', [0, 2, 4, 5, 7, 9, 10]],
  ['melodic minor', [0, 2, 3, 5, 7, 9, 11]],
];

function bestKey(notes) {
  const w = new Float64Array(12), bw = new Float64Array(12);
  for (const n of notes) {
    const d = Math.min(4, Math.max(0.05, n.dur));
    w[pc(n.midi)] += d;
    if (n.midi < 55) bw[pc(n.midi)] += d;
  }
  const total = w.reduce((a, b) => a + b, 0);
  if (!total) return null;
  const mw = Math.max(...w), mb = Math.max(...bw);
  let best = null;
  SCALES.forEach(([name, steps], si) => {
    for (let root = 0; root < 12; root++) {
      let inS = 0;
      for (const s of steps) inS += w[(root + s) % 12];
      const sc = inS / total + 0.25 * (w[root] / mw) + 0.15 * (w[(root + 7) % 12] / mw) + 0.1 * (w[(root + steps[2]) % 12] / mw)
        + (mb ? 0.25 * (bw[root] / mb) : 0) - 0.01 * Math.min(si, 2);
      if (!best || sc > best.sc) best = { sc, root, name, steps, inScale: inS / total };
    }
  });
  const set = new Set(best.steps.map((s) => (best.root + s) % 12));
  return { key: `${NOTE_NAMES[best.root]} ${best.name}`, root: best.root, scale: best.name, set, inScaleWeight: best.inScale };
}

export function lintScore(score, opts = {}) {
  const unpitchedRe = opts.unpitchedRe || UNPITCHED_RE;
  const decayRe = opts.decayRe || DECAY_RE;
  const all = (score.notes || []).filter((n) => n && Number.isFinite(n.t) && Number.isFinite(n.dur));
  const duration = score.durationSec || Math.max(0, ...all.map((n) => n.t + n.dur));
  const bpm = score.bpm || 120;
  const beat = 60 / bpm;
  const beatsPerBar = score.beatsPerBar || 4;
  const warnings = [];

  const isPitched = (n) => Number.isFinite(n.midi) && !unpitchedRe.test(n.inst || '');
  const pitched = all.filter(isPitched).map((n) => {
    const decaying = decayRe.test(n.inst);
    return { ...n, end: n.t + n.dur, effEnd: n.t + (decaying ? Math.min(n.dur, DECAY_CAP_SEC) : n.dur), decaying, tension: n.tag === 'tension' };
  }).sort((a, b) => a.t - b.t);

  const sections = (score.sections && score.sections.length) ? score.sections : [{ name: 'all', t0: 0, t1: duration, mood: '' }];
  const sectionOf = (t) => { const s = sections.find((x) => t >= x.t0 && t < x.t1); return s ? s.name : null; };

  // ---- instruments ----------------------------------------------------------
  const instruments = {};
  for (const n of all) {
    const i = (instruments[n.inst] ||= { notes: 0, pitched: !unpitchedRe.test(n.inst || '') && Number.isFinite(n.midi), lo: Infinity, hi: -Infinity, vs: 0, vs2: 0, durs: [], vels: new Set() });
    i.notes++;
    if (Number.isFinite(n.midi)) { i.lo = Math.min(i.lo, n.midi); i.hi = Math.max(i.hi, n.midi); }
    const v = Number.isFinite(n.vel) ? n.vel : 0;
    i.vs += v; i.vs2 += v * v; i.vels.add(Math.round(v * 1000));
    i.durs.push(n.dur);
  }

  // ---- clashes + low interval limit (sweep) -----------------------------------
  const clashes = [], lowLimit = [];
  let clashCount = 0, intendedCount = 0, lowCount = 0;
  const clashBySection = {}, lowBySection = {};
  {
    let active = [];
    for (const a of pitched) {
      active = active.filter((b) => b.effEnd > a.t);
      for (const b of active) {
        const ov = Math.min(a.effEnd, b.effEnd) - a.t;
        const ma = Math.round(a.midi), mb = Math.round(b.midi);
        const iv = Math.abs(ma - mb);
        if (iv === 0) continue;
        const ic = iv % 12;
        if (ov > 0.6 && (ic === 1 || ic === 11)) {
          if (a.tension || b.tension) intendedCount++;
          else {
            clashCount++;
            const sec = sectionOf(a.t);
            clashBySection[sec] = (clashBySection[sec] || 0) + 1;
            const kind = iv === 1 ? 'minor 2nd' : iv === 13 ? 'minor 9th' : iv === 11 ? 'major 7th' : ic === 1 ? `compound minor 9th (${iv} st)` : `compound major 7th (${iv} st)`;
            if (clashes.length < 60) clashes.push({
              t: rnd(a.t, 2), section: sec, overlapSec: rnd(ov, 2), interval: kind,
              severity: iv === 1 || iv === 13 ? 'harsh' : 'mild',
              a: `${b.inst} ${pitchName(mb)}`, b: `${a.inst} ${pitchName(ma)}`,
            });
          }
        }
        const lo = Math.min(ma, mb);
        if (ov > 0.25 && iv >= 1 && iv <= 4 && lo < 48) {
          lowCount++;
          const sec = sectionOf(a.t);
          lowBySection[sec] = (lowBySection[sec] || 0) + 1;
          if (lowLimit.length < 30) lowLimit.push({ t: rnd(a.t, 2), section: sec, semitones: iv, a: `${b.inst} ${pitchName(mb)}`, b: `${a.inst} ${pitchName(ma)}` });
        }
      }
      active.push(a);
    }
  }
  if (clashCount) warnings.push(`${clashCount} untagged minor-2nd/minor-9th/major-7th clash(es) longer than 0.6 s`);
  if (lowCount) warnings.push(`${lowCount} close interval(s) (<= major 3rd) voiced below C3 (mud)`);

  // ---- tension resolution --------------------------------------------------------
  const tensions = pitched.filter((n) => n.tension);
  const unresolved = [];
  let resolvedSame = 0, resolvedOther = 0;
  for (const n of tensions) {
    const m = Math.round(n.midi);
    const limit = n.end + 4;
    let same = false, other = false;
    for (const x of pitched) {
      if (x.t <= n.t + 1e-6) continue;
      if (x.t > limit) break;
      const d = Math.abs(Math.round(x.midi) - m);
      if (d === 1 || d === 2) { if (x.inst === n.inst) { same = true; break; } other = true; }
    }
    if (same) resolvedSame++; else if (other) resolvedOther++;
    else unresolved.push({ t: rnd(n.t, 2), section: sectionOf(n.t), inst: n.inst, pitch: pitchName(m), durSec: rnd(n.dur, 2) });
  }
  if (unresolved.length) warnings.push(`${unresolved.length} tagged tension note(s) never resolve by step within 4 s`);

  // ---- per section ------------------------------------------------------------------
  const globalKey = bestKey(pitched);
  const sectionReports = sections.map((s) => {
    const ns = pitched.filter((n) => n.t >= s.t0 && n.t < s.t1);
    const allNs = all.filter((n) => n.t >= s.t0 && n.t < s.t1);
    const key = bestKey(ns);
    const pcsW = new Float64Array(12);
    for (const n of ns) pcsW[pc(n.midi)] += n.dur;
    const pcs = [];
    for (let p = 0; p < 12; p++) if (pcsW[p] > 0) pcs.push(NOTE_NAMES[p]);
    const chrom = {};
    let chromCount = 0;
    if (key) for (const n of ns) if (!key.set.has(pc(n.midi))) { chromCount++; chrom[NOTE_NAMES[pc(n.midi)]] = (chrom[NOTE_NAMES[pc(n.midi)]] || 0) + 1; }
    const reg = {};
    for (const n of ns) {
      const r = (reg[n.inst] ||= { lo: Infinity, hi: -Infinity });
      r.lo = Math.min(r.lo, n.midi); r.hi = Math.max(r.hi, n.midi);
    }
    const register = {};
    for (const [k, r] of Object.entries(reg)) register[k] = `${pitchName(r.lo)}-${pitchName(r.hi)}`;
    const len = Math.max(0.001, s.t1 - s.t0);
    return {
      name: s.name, mood: s.mood, t0: rnd(s.t0, 2), t1: rnd(s.t1, 2),
      notes: allNs.length, notesPerSec: rnd(allNs.length / len, 2), pitchedNotesPerSec: rnd(ns.length / len, 2),
      pitchClasses: pcs, pitchClassCount: pcs.length,
      key: key ? key.key : null,
      inKeyWeight: key ? rnd(key.inScaleWeight, 3) : null,
      chromaticNotes: chromCount,
      chromaticFraction: ns.length ? rnd(chromCount / ns.length, 3) : 0,
      chromaticPitches: chrom,
      taggedTensions: ns.filter((n) => n.tension).length,
      clashes: clashBySection[s.name] || 0,
      lowIntervalProblems: lowBySection[s.name] || 0,
      register,
    };
  });

  // ---- bars -------------------------------------------------------------------------
  let barStarts;
  if (Array.isArray(score.bars) && score.bars.length > 1) barStarts = score.bars.slice();
  else {
    barStarts = [];
    const bl = beat * beatsPerBar;
    for (let t = 0; t < duration - 1e-6; t += bl) barStarts.push(t);
  }
  const barEnd = (i) => (i + 1 < barStarts.length ? barStarts[i + 1] : Math.max(duration, barStarts[i] + beat * beatsPerBar));
  const barIndex = (t) => {
    let lo = 0, hi = barStarts.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (barStarts[m] <= t + 0.02) lo = m; else hi = m - 1; }
    return lo;
  };

  // ---- melody ------------------------------------------------------------------------
  let melodyInst = opts.melodyInst || null;
  if (!melodyInst) {
    const cands = Object.entries(instruments).filter(([, i]) => i.pitched && i.notes >= 8);
    const named = cands.find(([k]) => LEAD_RE.test(k));
    if (named) melodyInst = named[0];
    else {
      let best = -Infinity;
      for (const [k, i] of cands) {
        const d = i.durs.slice().sort((a, b) => a - b);
        if (d[d.length >> 1] < 0.12) continue;
        let s = 0, wsum = 0;
        for (const n of pitched) if (n.inst === k) { s += n.midi * n.dur; wsum += n.dur; }
        const mean = s / Math.max(1e-9, wsum);
        if (mean > best) { best = mean; melodyInst = k; }
      }
    }
  }
  let melody = null;
  if (melodyInst) {
    // top note per onset
    const raw = pitched.filter((n) => n.inst === melodyInst);
    const line = [];
    for (const n of raw) {
      const last = line[line.length - 1];
      if (last && Math.abs(n.t - last.t) < 0.03) { if (n.midi > last.midi) line[line.length - 1] = n; } else line.push(n);
    }
    const leaps = [];
    let leapCount = 0, maxLeap = 0;
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1], b = line[i];
      if (b.t - a.end > 1.0) continue; // a new phrase
      const d = Math.abs(Math.round(b.midi) - Math.round(a.midi));
      if (d > maxLeap) maxLeap = d;
      if (d > 16) { leapCount++; if (leaps.length < 20) leaps.push({ t: rnd(b.t, 2), from: pitchName(a.midi), to: pitchName(b.midi), semitones: d }); }
    }
    const sig = new Map(), pitchSig = new Map();
    const perBar = barStarts.map(() => []);
    for (const n of line) perBar[barIndex(n.t)].push(n);
    const barSigs = perBar.map((ns, i) => {
      if (!ns.length) return '';
      const bl = barEnd(i) - barStarts[i];
      return ns.map((n) => `${Math.round(((n.t - barStarts[i]) / bl) * 48)}:${Math.round(n.midi)}:${Math.round((n.dur / bl) * 24)}`).join(' ');
    });
    barSigs.forEach((s, i) => { if (s) { if (!sig.has(s)) sig.set(s, []); sig.get(s).push(i + 1); } });
    perBar.forEach((ns, i) => {
      if (ns.length < 2) return;
      const s = ns.map((n) => Math.round(n.midi)).join(' ');
      if (!pitchSig.has(s)) pitchSig.set(s, []);
      pitchSig.get(s).push(i + 1);
    });
    let most = [], mostP = [];
    for (const v of sig.values()) if (v.length > most.length) most = v;
    for (const v of pitchSig.values()) if (v.length > mostP.length) mostP = v;
    let run = 1, bestRun = 1, bestRunAt = 1;
    for (let i = 1; i < barSigs.length; i++) {
      if (barSigs[i] && barSigs[i] === barSigs[i - 1]) { run++; if (run > bestRun) { bestRun = run; bestRunAt = i - run + 2; } } else run = 1;
    }
    const barsWithMelody = barSigs.filter(Boolean).length;
    let exactRepeats = 0;
    for (const v of sig.values()) exactRepeats += v.length - 1;
    melody = {
      instrument: melodyInst, notes: line.length,
      range: line.length ? `${pitchName(Math.min(...line.map((n) => n.midi)))}-${pitchName(Math.max(...line.map((n) => n.midi)))}` : null,
      largestLeapSemitones: maxLeap, leapsOverATenth: leapCount, leaps,
      barsWithMelody, distinctBars: sig.size,
      exactRepeatedBars: exactRepeats,
      repetitionFraction: barsWithMelody ? rnd(exactRepeats / barsWithMelody, 3) : 0,
      mostRepeatedBar: { count: most.length, bars: most.slice(0, 16) },
      mostRepeatedPitchSequence: { count: mostP.length, bars: mostP.slice(0, 16) },
      longestRunOfIdenticalConsecutiveBars: { length: bestRun, firstBar: bestRunAt },
    };
    if (leapCount) warnings.push(`melody (${melodyInst}) has ${leapCount} leap(s) larger than a tenth`);
    if (most.length >= 5 || (barsWithMelody >= 8 && exactRepeats / barsWithMelody > 0.5)) warnings.push(`melody (${melodyInst}) repeats: one bar occurs ${most.length} times, ${exactRepeats} of ${barsWithMelody} bars are exact copies`);
  }

  // full-texture bar repetition
  let texture = null;
  {
    const perBar = barStarts.map(() => []);
    for (const n of pitched) perBar[barIndex(n.t)].push(n);
    const m = new Map();
    perBar.forEach((ns, i) => {
      if (!ns.length) return;
      const bl = barEnd(i) - barStarts[i];
      const s = ns.map((n) => `${n.inst}:${Math.round(((n.t - barStarts[i]) / bl) * 48)}:${Math.round(n.midi)}`).sort().join(' ');
      if (!m.has(s)) m.set(s, []);
      m.get(s).push(i + 1);
    });
    let most = [], rep = 0;
    for (const v of m.values()) { rep += v.length - 1; if (v.length > most.length) most = v; }
    const nb = perBar.filter((b) => b.length).length;
    texture = { bars: barStarts.length, nonEmptyBars: nb, distinctBars: m.size, exactRepeatedBars: rep, mostRepeatedBar: { count: most.length, bars: most.slice(0, 16) } };
    if (nb >= 8 && rep / nb > 0.4) warnings.push(`${rep} of ${nb} bars are exact copies of another bar in every instrument (copy-paste)`);
  }

  // ---- harmony stagnation --------------------------------------------------------------
  let harmony = null;
  {
    const win = (beat * beatsPerBar) / 2;
    const nW = Math.max(1, Math.ceil(duration / win));
    const W = Array.from({ length: nW }, () => ({ w: new Float64Array(12), low: Infinity }));
    for (const n of pitched) {
      if (n.inst === melodyInst) continue;
      const a = Math.max(0, Math.floor(n.t / win)), b = Math.min(nW - 1, Math.floor((n.effEnd - 1e-6) / win));
      for (let i = a; i <= b; i++) {
        const ov = Math.min(n.effEnd, (i + 1) * win) - Math.max(n.t, i * win);
        if (ov <= 0) continue;
        W[i].w[pc(n.midi)] += ov;
        if (ov >= 0.2 * win && n.midi < W[i].low) W[i].low = n.midi;
      }
    }
    const sigs = W.map((x) => {
      const mx = Math.max(...x.w);
      if (mx <= 0) return 'rest';
      const s = [];
      for (let p = 0; p < 12; p++) if (x.w[p] >= 0.25 * mx) s.push(NOTE_NAMES[p]);
      return (Number.isFinite(x.low) ? NOTE_NAMES[pc(x.low)] : '-') + '|' + s.join(',');
    });
    let run = 1, best = 1, bestAt = 0, changes = 0;
    for (let i = 1; i < nW; i++) {
      if (sigs[i] === sigs[i - 1]) { run++; if (run > best) { best = run; bestAt = i - run + 1; } } else { run = 1; changes++; }
    }
    harmony = {
      windowSec: rnd(win, 3), distinctHarmonies: new Set(sigs).size, changes,
      meanSecondsPerHarmony: rnd(duration / (changes + 1), 2),
      longestStaticStretch: { sec: rnd(best * win, 2), t0: rnd(bestAt * win, 2), harmony: sigs[bestAt] },
    };
    if (best * win > 8 * beat * beatsPerBar) warnings.push(`harmony does not change for ${rnd(best * win, 1)} s from ${rnd(bestAt * win, 1)} s`);
  }

  // ---- humanisation -----------------------------------------------------------------------
  const grid = beat / 24;
  const hasBarMap = Array.isArray(score.bars) && score.bars.length > 1;
  const onGrid = (t) => {
    if (hasBarMap) {
      // with a bar map (tempo changes) the grid is local: 1/24 beat of the bar the note sits in
      let lo = 0, hi = barStarts.length - 1;
      while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (barStarts[mid] <= t + 1e-6) lo = mid; else hi = mid - 1; }
      const g = (barEnd(lo) - barStarts[lo]) / (beatsPerBar * 24);
      if (!(g > 0)) return false;
      const r = (t - barStarts[lo]) / g;
      return Math.abs(r - Math.round(r)) * g < 0.001;
    }
    const r = t / grid; return Math.abs(r - Math.round(r)) * grid < 0.001;
  };
  const sortedT = all.map((n) => n.t).sort((a, b) => a - b);
  let coincide = 0, gridAll = 0;
  for (let i = 0; i < sortedT.length; i++) {
    if ((i > 0 && sortedT[i] - sortedT[i - 1] < 0.0002) || (i + 1 < sortedT.length && sortedT[i + 1] - sortedT[i] < 0.0002)) coincide++;
  }
  const perInst = {};
  for (const [name, i] of Object.entries(instruments)) {
    const ns = all.filter((n) => n.inst === name);
    const g = ns.filter((n) => onGrid(n.t)).length;
    gridAll += g;
    const mean = i.vs / i.notes;
    const sd = Math.sqrt(Math.max(0, i.vs2 / i.notes - mean * mean));
    perInst[name] = {
      notes: i.notes, pitched: i.pitched,
      range: Number.isFinite(i.lo) ? `${pitchName(i.lo)}-${pitchName(i.hi)}` : null,
      rangeSemitones: Number.isFinite(i.lo) ? Math.round(i.hi - i.lo) : null,
      velocityMean: rnd(mean, 3), velocityStd: rnd(sd, 4), distinctVelocities: i.vels.size,
      onGridFraction: rnd(g / i.notes, 3),
    };
    if (i.notes >= 4 && sd < 1e-6) warnings.push(`${name}: velocity never changes (mechanical)`);
  }
  const onGridFraction = all.length ? gridAll / all.length : 0;
  if (all.length >= 16 && onGridFraction > 0.95) warnings.push(`${rnd(onGridFraction * 100, 0)} % of note onsets sit exactly on the 1/24-beat grid (no timing humanisation)`);

  return {
    id: score.id ?? null, title: score.title ?? null, bpm, durationSec: rnd(duration, 2),
    counts: { notes: all.length, pitchedNotes: pitched.length, instruments: Object.keys(instruments).length, sections: sections.length, taggedTensions: tensions.length },
    key: globalKey ? { best: globalKey.key, inKeyWeight: rnd(globalKey.inScaleWeight, 3) } : null,
    clashes: { count: clashCount, intendedTaggedPairs: intendedCount, listed: clashes.length, items: clashes },
    tensions: { tagged: tensions.length, resolvedInSameInstrument: resolvedSame, resolvedInOtherInstrument: resolvedOther, unresolved },
    lowIntervalLimit: { count: lowCount, items: lowLimit },
    sections: sectionReports,
    melody, texture, harmony,
    humanisation: {
      gridUnit: '1/24 beat at the nominal bpm (1 ms tolerance); meaningless if the tempo map is not constant',
      onGridFraction: rnd(onGridFraction, 3),
      exactlySimultaneousOnsetFraction: all.length ? rnd(coincide / all.length, 3) : 0,
      instruments: perInst,
    },
    warnings,
    notes: [
      'Pitched/unpitched and sustained/decaying are guessed from the instrument name. Decaying instruments (piano, harp, pluck, bell...) count as sounding for at most 1.2 s when looking for clashes.',
      'Key fit is a weighted pitch-class match over 8 scale types with a tonic/bass bias; modes of the same scale are separated only by that bias.',
      'Bars assume a constant bar length of beatsPerBar (default 4) beats at score.bpm unless score.bars (bar start times in seconds) is present.',
      'Harmony stretch uses half-bar windows: bass pitch class plus every pitch class with at least 25 % of the strongest one, melody instrument excluded.',
      'A major 7th inside a deliberate maj7 chord is still listed (severity "mild"); tag the note "tension" or ignore it.',
    ],
  };
}

// ---------------------------------------------------------------------------
// PNG encoder + tiny drawing kit
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
export function encodePng(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    Buffer.from(rgb.buffer, rgb.byteOffset + y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr), pngChunk('IDAT', zlib.deflateSync(raw, { level: 6 })), pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// 5x7 bitmap font (upper case, digits, punctuation). Lower case maps to upper.
const FONT = {
  ' ': [0, 0, 0, 0, 0, 0, 0], A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30], E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16], G: [14, 17, 16, 23, 17, 17, 15],
  H: [17, 17, 17, 31, 17, 17, 17], I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17],
  L: [16, 16, 16, 16, 16, 16, 31], M: [17, 27, 21, 21, 17, 17, 17], N: [17, 25, 21, 19, 17, 17, 17], O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16], Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17], S: [15, 16, 16, 14, 1, 1, 30],
  T: [31, 4, 4, 4, 4, 4, 4], U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 27, 17],
  X: [17, 17, 10, 4, 10, 17, 17], Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31], 3: [31, 2, 4, 2, 1, 17, 14],
  4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 30, 1, 1, 17, 14], 6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8],
  8: [14, 17, 17, 14, 17, 17, 14], 9: [14, 17, 17, 15, 1, 2, 12],
  '.': [0, 0, 0, 0, 0, 12, 12], ',': [0, 0, 0, 0, 12, 4, 8], ':': [0, 12, 12, 0, 12, 12, 0], '-': [0, 0, 0, 31, 0, 0, 0],
  '+': [0, 4, 4, 31, 4, 4, 0], '/': [1, 1, 2, 4, 8, 16, 16], '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8],
  '%': [24, 25, 2, 4, 8, 19, 3], _: [0, 0, 0, 0, 0, 0, 31], '=': [0, 0, 31, 0, 31, 0, 0], '#': [10, 10, 31, 10, 31, 10, 10],
  '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8], "'": [4, 4, 8, 0, 0, 0, 0], '|': [4, 4, 4, 4, 4, 4, 4],
  '?': [14, 17, 1, 2, 4, 0, 4], '*': [0, 21, 14, 31, 14, 21, 0], '!': [4, 4, 4, 4, 4, 0, 4], '[': [14, 8, 8, 8, 8, 8, 14], ']': [14, 2, 2, 2, 2, 2, 14],
};

class Canvas {
  constructor(w, h, bg) {
    this.w = w; this.h = h;
    this.d = new Uint8Array(w * h * 3);
    for (let i = 0; i < w * h; i++) { this.d[i * 3] = bg[0]; this.d[i * 3 + 1] = bg[1]; this.d[i * 3 + 2] = bg[2]; }
  }
  px(x, y, c, a = 1) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const o = (y * this.w + x) * 3;
    if (a >= 1) { this.d[o] = c[0]; this.d[o + 1] = c[1]; this.d[o + 2] = c[2]; } else {
      this.d[o] += (c[0] - this.d[o]) * a; this.d[o + 1] += (c[1] - this.d[o + 1]) * a; this.d[o + 2] += (c[2] - this.d[o + 2]) * a;
    }
  }
  rect(x, y, w, h, c, a = 1) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.px(i, j, c, a); }
  vline(x, y0, y1, c, a = 1, dash = 0) { for (let y = y0; y <= y1; y++) if (!dash || ((y - y0) % (dash * 2)) < dash) this.px(x, y, c, a); }
  hline(x0, x1, y, c, a = 1, dash = 0) { for (let x = x0; x <= x1; x++) if (!dash || ((x - x0) % (dash * 2)) < dash) this.px(x, y, c, a); }
  text(x, y, str, c, scale = 2, bg = null) {
    const s = String(str).toUpperCase();
    if (bg) this.rect(x - 2, y - 2, s.length * 6 * scale + 2, 7 * scale + 4, bg, 0.75);
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]] || FONT['?'];
      for (let r = 0; r < 7; r++) for (let b = 0; b < 5; b++) if (g[r] & (16 >> b)) this.rect(x + (i * 6 + b) * scale, y + r * scale, scale, scale, c);
    }
    return s.length * 6 * scale;
  }
  textRight(xRight, y, str, c, scale = 2) { this.text(xRight - String(str).length * 6 * scale + scale, y, str, c, scale); }
}

const MAGMA = [[0, 0, 4], [28, 16, 68], [79, 18, 123], [129, 37, 129], [181, 54, 122], [229, 80, 100], [251, 135, 97], [254, 194, 135], [252, 253, 191]];
function magma(v) {
  v = clamp(v, 0, 1) * (MAGMA.length - 1);
  const i = Math.min(MAGMA.length - 2, Math.floor(v)), f = v - i;
  const a = MAGMA[i], b = MAGMA[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}
const MOOD_COLORS = { gentle: [90, 200, 170], tension: [240, 170, 60], climax: [240, 80, 80], release: [150, 140, 240] };

export function writeSpectrogramPng(outPath, source, opts = {}) {
  const report = source && source.__spectrogram ? source : analyzeAudio(source, opts);
  const S = report.__spectrogram;
  const score = opts.score || null;
  const W = 1600, H = 700;
  const left = 64, right = 84, top = 48, plotH = S.nRows, plotW = W - left - right;
  const axisY = top + plotH; // 528
  const stripTop = axisY + 34, stripH = 96, stripBot = stripTop + stripH;
  const DB_RANGE = 80;
  const cv = new Canvas(W, H, [18, 18, 24]);
  const FG = [225, 225, 230], DIM = [150, 150, 160], WHITE = [255, 255, 255];
  const dur = S.duration;
  const xOf = (t) => left + Math.round((t / dur) * (plotW - 1));

  // --- spectrogram ---
  let ref = 0;
  for (let i = 0; i < S.rows.length; i++) if (S.rows[i] > ref) ref = S.rows[i];
  if (ref <= 0) ref = 1;
  const col = new Float32Array(S.nRows);
  for (let x = 0; x < plotW; x++) {
    const tA = (x / plotW) * dur, tB = ((x + 1) / plotW) * dur;
    let f0 = Math.round((tA - S.firstSec) / S.hopSec), f1 = Math.round((tB - S.firstSec) / S.hopSec);
    f0 = clamp(f0, 0, S.F - 1); f1 = clamp(Math.max(f1, f0 + 1), 1, S.F);
    col.fill(0);
    for (let f = f0; f < f1; f++) {
      const base = f * S.nRows;
      for (let r = 0; r < S.nRows; r++) if (S.rows[base + r] > col[r]) col[r] = S.rows[base + r];
    }
    for (let r = 0; r < S.nRows; r++) {
      const d = col[r] > 0 ? 10 * Math.log10(col[r] / ref) : -200;
      cv.px(left + x, top + S.nRows - 1 - r, magma(1 + d / DB_RANGE));
    }
  }

  // --- frequency axis ---
  const yOfF = (f) => top + plotH - 1 - Math.round((Math.log(f / S.fMin) / Math.log(S.fMax / S.fMin)) * (plotH - 1));
  for (const f of [30, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 18000]) {
    const y = yOfF(f);
    cv.hline(left, left + plotW - 1, y, WHITE, 0.16, 3);
    cv.hline(left - 6, left - 1, y, FG);
    const label = f >= 1000 ? `${f / 1000}K` : String(f);
    cv.textRight(left - 10, clamp(y - 7, top, top + plotH - 14), label, FG, 2);
  }
  for (const f of [40, 60, 70, 80, 90, 300, 400, 600, 700, 800, 900, 3000, 4000, 6000, 7000, 8000, 9000]) cv.hline(left - 3, left - 1, yOfF(f), DIM);
  cv.text(4, 4, 'HZ', DIM, 2);

  // --- colour bar ---
  const cbX = left + plotW + 14;
  for (let y = 0; y < plotH; y++) cv.rect(cbX, top + y, 14, 1, magma(1 - y / (plotH - 1)));
  for (let d = 0; d <= DB_RANGE; d += 10) {
    const y = top + Math.round((d / DB_RANGE) * (plotH - 1));
    cv.hline(cbX + 14, cbX + 18, y, FG);
    cv.text(cbX + 22, clamp(y - 7, top, top + plotH - 14), d === 0 ? '0' : `-${d}`, FG, 2);
  }
  cv.text(cbX + 22, top - 24, 'DB', DIM, 2);

  // --- time axis ---
  const steps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60];
  const step = steps.find((s) => dur / s <= 24) || 60;
  const minor = step / (step === 15 ? 3 : step === 30 ? 3 : 5);
  for (let k = 0; k * minor <= dur + 1e-9; k++) {
    const x = xOf(k * minor);
    cv.vline(x, axisY, axisY + 3, DIM);
    cv.vline(x, stripBot, stripBot + 3, DIM);
  }
  for (let k = 0; k * step <= dur + 1e-9; k++) {
    const t = k * step, x = xOf(t);
    cv.vline(x, top, axisY - 1, WHITE, 0.1);
    cv.vline(x, stripTop, stripBot - 1, WHITE, 0.1);
    cv.vline(x, axisY, axisY + 7, FG);
    cv.vline(x, stripBot, stripBot + 7, FG);
    const label = step < 1 ? t.toFixed(1) : String(Math.round(t));
    cv.text(clamp(x - label.length * 6, left - 20, W - label.length * 12 - 2), axisY + 12, label, FG, 2);
  }
  cv.text(W - 40, axisY + 12, 'SEC', DIM, 2);

  // --- loudness strip ---
  const LMIN = -40, LMAX = -5;
  cv.rect(left, stripTop, plotW, stripH, [8, 8, 12]);
  const yOfL = (l) => stripTop + Math.round(((LMAX - clamp(l, LMIN, LMAX)) / (LMAX - LMIN)) * (stripH - 1));
  cv.rect(left, yOfL(-15), plotW, yOfL(-17) - yOfL(-15) + 1, [60, 200, 120], 0.3);
  for (const l of [-10, -20, -30]) {
    cv.hline(left, left + plotW - 1, yOfL(l), WHITE, 0.18, 3);
    cv.textRight(left - 10, yOfL(l) - 7, String(l), FG, 2);
  }
  cv.text(left + plotW + 14, stripTop + 4, 'LUFS', DIM, 2);
  const curve = (arr, winSec, c, thick) => {
    let prevY = null;
    for (let x = 0; x < plotW; x++) {
      const t = (x / plotW) * dur;
      const j = Math.round((t - winSec / 2) * 10);
      if (j < 0 || j >= arr.length) { prevY = null; continue; }
      const y = yOfL(arr[j]);
      const a = prevY === null ? y : Math.min(prevY, y), b = prevY === null ? y : Math.max(prevY, y);
      for (let yy = a; yy <= b; yy++) for (let k = 0; k < thick; k++) cv.px(left + x, yy + k, c);
      prevY = y;
    }
  };
  curve(S.momentary, 0.4, [95, 110, 150], 1);
  curve(S.shortTerm, 3, [255, 230, 90], 2);
  cv.text(left, stripBot + 26, 'LOUDNESS:', DIM, 2);
  let lx = left + 10 * 12;
  cv.rect(lx, stripBot + 31, 22, 3, [255, 230, 90]); lx += 28;
  lx += cv.text(lx, stripBot + 26, 'SHORT-TERM 3 S', FG, 2) + 24;
  cv.rect(lx, stripBot + 32, 22, 2, [95, 110, 150]); lx += 28;
  lx += cv.text(lx, stripBot + 26, 'MOMENTARY 0.4 S', FG, 2) + 24;
  cv.rect(lx, stripBot + 27, 22, 12, [60, 200, 120], 0.45); lx += 28;
  cv.text(lx, stripBot + 26, 'TARGET -17..-15 LUFS', FG, 2);

  // --- sections ---
  if (score && Array.isArray(score.sections)) {
    for (const s of score.sections) {
      const x0 = xOf(clamp(s.t0, 0, dur)), x1 = xOf(clamp(s.t1, 0, dur));
      if (s.t0 > 0.01) {
        for (const dx of [0, 1]) {
          cv.vline(x0 + dx, top - 4, axisY - 1, dx ? [0, 0, 0] : WHITE, dx ? 0.5 : 0.9, 5);
          cv.vline(x0 + dx, stripTop, stripBot - 1, dx ? [0, 0, 0] : WHITE, dx ? 0.5 : 0.9, 5);
        }
      }
      const mc = MOOD_COLORS[s.mood] || [170, 170, 180];
      cv.rect(x0 + 2, top - 6, Math.max(1, x1 - x0 - 3), 4, mc);
      const maxChars = Math.floor((x1 - x0 - 6) / 12);
      if (maxChars >= 1) cv.text(x0 + 4, top - 24, String(s.name).slice(0, maxChars), mc, 2);
    }
  }

  // --- title ---
  const name = opts.title || (report.file ? path.basename(report.file) : 'audio');
  const fmtT = `${Math.floor(dur / 60)}:${String(Math.floor(dur % 60)).padStart(2, '0')}`;
  const title = `${name}   ${fmtT}   ${S.integrated > -200 ? S.integrated.toFixed(1) : '-INF'} LUFS   TP ${S.truePeakDb > -200 ? S.truePeakDb.toFixed(1) : '-INF'} DB   LRA ${S.lra.toFixed(1)} LU`;
  cv.text(left, 4, title.slice(0, Math.floor((W - left - 8) / 12)), FG, 2);

  // frame
  cv.hline(left - 1, left + plotW, top - 1, DIM); cv.hline(left - 1, left + plotW, axisY, DIM);
  cv.vline(left - 1, top - 1, axisY, DIM); cv.vline(left + plotW, top - 1, axisY, DIM);
  cv.hline(left - 1, left + plotW, stripTop - 1, DIM); cv.hline(left - 1, left + plotW, stripBot, DIM);
  cv.vline(left - 1, stripTop - 1, stripBot, DIM); cv.vline(left + plotW, stripTop - 1, stripBot, DIM);

  const png = encodePng(W, H, cv.d);
  if (outPath) fs.writeFileSync(outPath, png);
  return png;
}

// ---------------------------------------------------------------------------
// Human-readable table
// ---------------------------------------------------------------------------

export function formatReport(report, lint = null) {
  const L = [];
  const f = report.format, lv = report.level, ld = report.loudness, sx = report.spectrum, st = report.stereo, df = report.defects;
  const pad = (s, n) => String(s).padEnd(n);
  const v = (x, unit = '') => (x === null || x === undefined ? '-inf' : `${x}${unit}`);
  L.push(`== ${report.file || 'audio'} ==`);
  L.push(`${pad('format', 22)}${f.sampleRate} Hz, ${f.channels} ch, ${f.bitDepth ?? '?'} bit ${f.encoding ?? ''}, ${f.durationSec} s`);
  L.push(`${pad('peak / true peak', 22)}${v(lv.samplePeakDbfs)} dBFS / ${v(lv.truePeakDbtp)} dBTP   clipped ${lv.clippedSamples}, flat-top ${lv.flatTopSamples}, NaN ${lv.nanSamples}, DC ${lv.dcOffset.join(' / ')}`);
  L.push(`${pad('loudness', 22)}${v(ld.integratedLufs)} LUFS integrated, LRA ${ld.loudnessRangeLu} LU, max short-term ${v(ld.maxShortTermLufs)}, crest ${v(lv.crestFactorDb)} dB`);
  L.push(`${pad('bands dB rel total', 22)}${Object.entries(sx.bandsDbRelTotal).map(([k, x]) => `${k} ${v(x)}`).join('  ')}`);
  L.push(`${pad('centroid / phone', 22)}${sx.centroidHz} Hz   loss after 150 Hz HP ${v(sx.phoneSpeaker.lossAfterHp150Lu)} LU, after 300 Hz HP ${v(sx.phoneSpeaker.lossAfterHp300Lu)} LU`);
  L.push(`${pad('harshness 2-5k', 22)}${v(sx.harshness.longTermDb)} dB long-term, ${v(sx.harshness.p95Db)} dB p95, worst ${v(sx.harshness.worstFrameDb)} dB at ${sx.harshness.worstFrameSec} s`);
  L.push(`${pad('resonances', 22)}${sx.resonances.length ? sx.resonances.slice(0, 6).map((r) => `${r.freqHz} Hz ${r.note} +${r.excessDb} dB${r.significant ? ' !' : ''}`).join('; ') : 'none'}`);
  L.push(`${pad('stereo', 22)}corr ${st.correlation} (worst 3 s ${st.worst3sCorrelation} at ${st.worst3sAtSec} s), side/mid ${v(st.sideToMidDb)} dB, L-R ${v(st.leftMinusRightDb)} dB`);
  L.push(`${pad('defects', 22)}clicks ${df.clickCount}${df.clicks.length ? ' (' + df.clicks.slice(0, 5).map((c) => c.t + ' s').join(', ') + ')' : ''}, gaps ${df.silenceGaps.length}${df.silenceGaps.length ? ' (' + df.silenceGaps.map((g) => `${g.t0}+${g.durationSec} s`).join(', ') + ')' : ''}, rumble ${v(df.rumbleBelow30HzDbRelTotal)} dB, aliasing ${df.aliasing.suspected ? 'SUSPECTED' : 'no'} (>16k ${v(df.aliasing.above16kDbRelTotal)} dB)`);
  if (report.loop) {
    const lp = report.loop;
    L.push(`${pad('loop seam', 22)}${lp.verdict.toUpperCase()}  jump ${lp.seamJump} (${lp.seamJumpVsLocalMaxStep}x local max step), level diff ${lp.levelDiffDb} dB, spectral diff ${lp.spectralDiffDb} dB`);
  }
  if (report.dynamicArc.sections) {
    L.push('');
    L.push(`${pad('section', 20)}${pad('mood', 10)}${pad('t0-t1', 16)}${pad('LUFS', 8)}${pad('centroid', 10)}notes/s`);
    for (const s of report.dynamicArc.sections) L.push(`${pad(String(s.name).slice(0, 19), 20)}${pad(s.mood ?? '', 10)}${pad(`${s.t0}-${s.t1}`, 16)}${pad(v(s.lufs), 8)}${pad(s.centroidHz + ' Hz', 10)}${s.notesPerSec}`);
    const mc = report.dynamicArc.moodContrast;
    if (mc) L.push(`mood contrast: intense minus gentle = ${mc.loudestIntenseMinusGentleLu} LU, ${mc.brightestIntenseMinusGentleHz} Hz (gentle quieter: ${mc.gentleIsQuieter}, darker: ${mc.gentleIsDarker})`);
  }
  L.push('');
  for (const i of report.verdict.items) L.push(`${i.pass ? 'PASS' : 'FAIL'}  ${pad(i.target, 38)}${pad(String(i.value), 44)} [${i.limit}]`);
  L.push(`VERDICT: ${report.verdict.pass ? 'PASS' : 'FAIL' + ' (' + report.verdict.failed.join('; ') + ')'}`);
  if (lint) {
    L.push('');
    L.push(`== score lint: ${lint.id ?? ''} ${lint.counts.notes} notes, ${lint.counts.instruments} instruments, key ${lint.key ? lint.key.best : '?'} ==`);
    L.push(`clashes ${lint.clashes.count} (intended/tagged pairs ${lint.clashes.intendedTaggedPairs}), unresolved tensions ${lint.tensions.unresolved.length}/${lint.tensions.tagged}, low-interval problems ${lint.lowIntervalLimit.count}`);
    for (const c of lint.clashes.items.slice(0, 8)) L.push(`  clash ${c.t} s [${c.section}] ${c.interval}: ${c.a} vs ${c.b} (${c.overlapSec} s, ${c.severity})`);
    for (const s of lint.sections) L.push(`  ${pad(String(s.name).slice(0, 19), 20)}${pad(s.key ?? '-', 20)}chromatic ${pad(`${s.chromaticNotes} (${Math.round(s.chromaticFraction * 100)} %)`, 12)}tensions ${pad(s.taggedTensions, 4)}${s.pitchedNotesPerSec} notes/s`);
    if (lint.melody) L.push(`melody ${lint.melody.instrument}: ${lint.melody.range}, largest leap ${lint.melody.largestLeapSemitones} st, exact repeated bars ${lint.melody.exactRepeatedBars}/${lint.melody.barsWithMelody}, most repeated x${lint.melody.mostRepeatedBar.count}`);
    if (lint.harmony) L.push(`harmony: ${lint.harmony.distinctHarmonies} distinct, longest static ${lint.harmony.longestStaticStretch.sec} s at ${lint.harmony.longestStaticStretch.t0} s`);
    L.push(`humanisation: ${Math.round(lint.humanisation.onGridFraction * 100)} % on grid, ${Math.round(lint.humanisation.exactlySimultaneousOnsetFraction * 100)} % exactly simultaneous`);
    for (const w of lint.warnings) L.push(`  WARN ${w}`);
  }
  return L.join('\n');
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main(argv) {
  const args = { file: null, score: null, png: null, json: null, loop: false, strict: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--score') args.score = argv[++i];
    else if (a === '--png') args.png = argv[++i];
    else if (a === '--json') args.json = argv[++i];
    else if (a === '--loop') args.loop = true;
    else if (a === '--strict') args.strict = true;
    else if (a === '-h' || a === '--help') { args.file = null; break; } else if (!args.file) args.file = a;
  }
  if (!args.file) {
    process.stderr.write('usage: node tools/music/analyze.mjs <file.wav> [--score file.score.json] [--png out.png] [--loop] [--json out.json] [--strict]\n');
    process.exit(1);
  }
  const wav = readWav(args.file);
  const score = args.score ? JSON.parse(fs.readFileSync(args.score, 'utf8')) : null;
  const report = analyzeAudio(wav, { score, loop: args.loop || !!(score && score.loop), file: args.file });
  const lint = score ? lintScore(score) : null;
  if (lint) report.scoreLint = lint;
  if (args.png) writeSpectrogramPng(args.png, report, { score });
  const json = JSON.stringify(report, null, 1);
  if (args.json) fs.writeFileSync(args.json, json);
  else process.stdout.write(json + '\n');
  process.stderr.write(formatReport(report, lint) + '\n');
  if (args.strict && !report.verdict.pass) process.exit(2);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    process.stderr.write('analyze: ' + (err && err.message ? err.message : err) + String.fromCharCode(10));
    process.exit(1);
  }
}
