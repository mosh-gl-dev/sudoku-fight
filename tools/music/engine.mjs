// Film-score synthesis engine: session (tempo map, sections, parts), mixer, master chain, WAV + score writers.
// Pure Node (ES modules, typed arrays). Deterministic: seeded PRNG only.
// See README.md for the composing API.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { SR, dB, clamp, mulberry32, hashSeed, gauss, curveAt, eqStereo, biquad, biquadRun, integratedLufs, truePeakEnvelope, toDb } from './lib/dsp.mjs';
import { makeIR, REVERB_PRESETS, convolveStereo, stereoDelay, compress, saturate, stereoWidth, limit, ditherTo16 } from './lib/effects.mjs';
import { INSTRUMENTS, applyBody, renderNote, EXPR } from './lib/instruments.mjs';
import { n as noteNum, parsePhrase, phraseShape } from './lib/theory.mjs';
// the band (tuba, accordion, leads, jingles, kit, 808, synth bass, stabs...): registers itself into INSTRUMENTS
import { BAND_KEYS } from './lib/band.mjs';

export * from './lib/theory.mjs';
export { SR, dB, toDb, mtof, ftom, clamp, lerp, mulberry32, hashSeed, integratedLufs, fft } from './lib/dsp.mjs';
export { INSTRUMENTS, renderNote, EXPR } from './lib/instruments.mjs';
export { REVERB_PRESETS, makeIR } from './lib/effects.mjs';
export { BAND_INSTRUMENTS, BAND_KEYS, accordionVoicing, swingGroove, hatRoll } from './lib/band.mjs';

const now = () => Number(process.hrtime.bigint() / 1000000n);

// ---------------------------------------------------------------- sparse stereo layer

const CH_BITS = 16, CH = 1 << CH_BITS, CH_MASK = CH - 1;

class Layer {
  constructor(n, body) {
    this.n = n; this.body = body;
    const c = Math.ceil(n / CH);
    this.L = new Array(c); this.R = new Array(c);
  }
  /** Mix a note into the layer. wrapN > 0: samples before 0 wrap to the end of the loop body. */
  add(start, sL, sR, len, wrapN = 0) {
    let s0 = 0;
    if (start < 0) {
      const pre = Math.min(len, -start);
      if (wrapN > 0 && wrapN >= pre) this.add(wrapN + start, sL, sR, pre, 0);
      s0 = pre;
      if (s0 >= len) return;
    }
    let pos = start + s0;
    const end = Math.min(this.n, start + len);
    while (pos < end) {
      const ci = pos >> CH_BITS;
      let cl = this.L[ci];
      if (!cl) { cl = this.L[ci] = new Float32Array(CH); this.R[ci] = new Float32Array(CH); }
      const cr = this.R[ci];
      const o = pos & CH_MASK;
      const m = Math.min(CH - o, end - pos);
      const si = pos - start;
      for (let k = 0; k < m; k++) { cl[o + k] += sL[si + k]; cr[o + k] += sR[si + k]; }
      pos += m;
    }
  }
  mixInto(outL, outR) {
    let lo = Infinity, hi = 0;
    for (let ci = 0; ci < this.L.length; ci++) {
      const cl = this.L[ci];
      if (!cl) continue;
      const base = ci << CH_BITS;
      const m = Math.min(CH, this.n - base);
      const cr = this.R[ci];
      for (let k = 0; k < m; k++) { outL[base + k] += cl[k]; outR[base + k] += cr[k]; }
      if (base < lo) lo = base;
      if (base + m > hi) hi = base + m;
    }
    return lo === Infinity ? null : [lo, hi];
  }
}

// ---------------------------------------------------------------- bus

class Bus {
  constructor(session, name, opts) {
    this.session = session; this.name = name;
    checkBusOpts(name, opts);
    this.o = { gain: 0, pan: 0, reverb: 0, room: 0, delay: 0, width: 1, eq: null, comp: null, sat: 0, mute: false, ...opts };
    this.layers = new Map();
    this.auto = {};
  }
  /** Change mix settings after creation. */
  set(opts) { checkBusOpts(this.name, opts); Object.assign(this.o, opts); return this; }
  /**
   * Automation over time. param: 'gain' (dB, added to the bus gain) or 'lowpass' (cutoff in Hz).
   * points: [[beat, value], ...]. Linear between points, held before the first and after the last.
   */
  automate(param, points) {
    if (param !== 'gain' && param !== 'lowpass') throw new Error('automate: param must be "gain" or "lowpass"');
    this.auto[param] = points.slice().sort((a, b) => a[0] - b[0]);
    return this;
  }
  /**
   * Tape stop: between fromBeat and toBeat the bus slows down to a halt (pitch and speed fall together), then stays
   * silent until `resume` (beat, default toBeat). curve > 1 = the brake bites later. Anything still sounding on this bus
   * after `resume` is heard again normally, so leave the bus resting there or start the next section on it.
   */
  tapeStop(fromBeat, toBeat, { curve = 1.6, resume = toBeat } = {}) {
    if (!(toBeat > fromBeat)) throw new Error('tapeStop: toBeat must be after fromBeat');
    (this.tapeStops ||= []).push({ fromBeat, toBeat, curve, resume: Math.max(resume, toBeat) });
    return this;
  }
  _layer(key, body) {
    let l = this.layers.get(key);
    if (!l) { l = new Layer(this.session._nTot, body); this.layers.set(key, l); }
    return l;
  }
}

// ---------------------------------------------------------------- part

const PLAY_KEYS = new Set(['vel', 'transpose', 'shape', 'shapeAmt', 'legato', 'stretch', 'gate']);
// every option a note may carry: engine keys + all instrument parameters (lib/instruments.mjs reads them as nt.<key>)
const NOTE_KEYS = new Set(['pan', 'amp', 'tag', 'exact', 'humanize', 'midi', 'vel', 'section', 'name', '_shift', '_extend', '_leg', 'morph',
  'expr', 'attack', 'release', 'vibrato', 'vibDelay', 'bright', 'detune', 'players', 'spread', 'noise', 'sordino', 'tremRate',
  'glideFrom', 'glideTime', 'vowel', 'hardness', 'ring', 'pedal', 'decay', 'damp', 'stereo', 'pluck', 'motor', 'motorRate',
  'gap', 'tone', 'tail', 'curve', 'from', 'to', 'q', 'smear', 'strum', ...BAND_KEYS]);
// note options that define the players of a sustained instrument: two legato notes are joined only when they agree
const CHAIN_KEYS = ['section', 'sordino', 'players', 'detune', 'spread', 'pan', 'vibrato', 'noise', 'tremRate', 'vowel'];
const BUS_KEYS = new Set(['gain', 'pan', 'reverb', 'room', 'delay', 'width', 'eq', 'comp', 'sat', 'mute']);
const warned = new Set();
function checkBusOpts(name, opts) {
  for (const k in opts || {}) if (!BUS_KEYS.has(k)) throw new Error(`bus "${name}": unknown option "${k}". Known: ${[...BUS_KEYS].join(', ')}`);
  for (const k of ['gain', 'pan', 'reverb', 'room', 'delay', 'width', 'sat']) if (opts && opts[k] != null && !Number.isFinite(opts[k])) throw new Error(`bus "${name}": option "${k}" must be a number`);
}

class Part {
  constructor(session, bus, inst, defaults) {
    if (!INSTRUMENTS[inst]) throw new Error('unknown instrument "' + inst + '". Known: ' + Object.keys(INSTRUMENTS).join(', '));
    this.session = session; this.bus = bus; this.inst = inst;
    this.defaults = { ...defaults };
    const base = INSTRUMENTS[inst].scoreName || inst;
    this.label = this.defaults.name || (this.defaults.section ? base + ':' + this.defaults.section : base);
    delete this.defaults.name;
    this._pedals = [];
    this._checkKeys(this.defaults);
  }

  /** Warn once about a note option that no instrument reads (most often a typo: it would be silently ignored). */
  _checkKeys(o) {
    for (const k in o) {
      if (NOTE_KEYS.has(k)) continue;
      const id = this.inst + '.' + k;
      if (warned.has(id)) continue;
      warned.add(id);
      console.warn(`[music] warning: unknown note option "${k}" on ${this.label} (ignored). Known: ${[...NOTE_KEYS].filter((x) => x[0] !== '_').join(', ')}`);
    }
  }

  /**
   * One note (or several at once when `pitch` is an array).
   * beat/dur in quarter-note beats, pitch 'C4' | midi number, vel 0..1, opts = instrument parameters + { tag, exact }.
   */
  note(beat, dur, pitch, vel, opts) {
    if (Array.isArray(pitch)) { for (const p of pitch) this.note(beat, dur, p, vel, opts); return this; }
    const def = INSTRUMENTS[this.inst];
    const midi = pitch == null ? (opts?.midi ?? this.defaults.midi ?? def.defaultMidi ?? 60) : noteNum(pitch);
    const v = vel ?? this.defaults.vel ?? 0.6;
    if (!Number.isFinite(beat) || !Number.isFinite(dur) || !Number.isFinite(midi) || !Number.isFinite(v) || dur <= 0) {
      throw new Error(`${this.label}.note(beat ${beat}, dur ${dur}, pitch ${pitch}, vel ${vel}): beat, dur (> 0), pitch and vel must be finite numbers`);
    }
    if (def.pitched && (midi < 12 || midi > 120)) throw new Error(`${this.label}: pitch ${pitch} (midi ${midi}) is outside 12..120`);
    if (opts) this._checkKeys(opts);
    this.session._events.push({ part: this, beat, dur, midi, vel: clamp(v, 0.01, 1), opts: opts || null });
    return this;
  }

  /** Unpitched event (cymbalSwell, riser, heartbeat, lowDrum): hit(beat, durBeats, vel, opts). */
  hit(beat, dur, vel, opts) { return this.note(beat, dur, null, vel, opts); }

  /** Chord with optional strum (seconds between successive notes, low to high; negative = high to low). */
  chord(beat, dur, pitches, vel, opts = {}) {
    const { strum = 0, ...rest } = opts;
    const ps = pitches.map(noteNum).sort((a, b) => a - b);
    if (strum < 0) ps.reverse();
    ps.forEach((p, i) => this.note(beat, dur, p, vel, { ...rest, _shift: Math.abs(strum) * i }));
    return this;
  }

  /** Arpeggio: pitches one after another every `step` beats. opts.dur = length of each note (default: step). Returns the end beat. */
  arp(beat, pitches, step, opts = {}) {
    const { dur, vel, shape, shapeAmt, ...rest } = opts;
    const sh = phraseShape(shape, shapeAmt ?? 0.25);
    const base = vel ?? this.defaults.vel ?? 0.6;
    pitches.forEach((p, i) => this.note(beat + i * step, dur ?? step, p, clamp(base * sh(pitches.length > 1 ? i / (pitches.length - 1) : 0), 0.01, 1), rest));
    return beat + pitches.length * step;
  }

  /** Roll (timpani, marimba, lowDrum...): repeated strokes at `rate` per second with a velocity ramp from..to. */
  roll(beat, dur, pitch, opts = {}) {
    const { from = 0.3, to = 0.8, rate = 13, ...rest } = opts;
    const s = this.session;
    const t0 = s.sec(beat), t1 = s.sec(beat + dur);
    const count = Math.max(2, Math.round((t1 - t0) * rate));
    for (let i = 0; i < count; i++) {
      const u = i / (count - 1);
      const b = beat + dur * (i / count);
      this.note(b, dur / count, pitch, clamp((from + (to - from) * u) * (i % 2 ? 0.9 : 1), 0.01, 1), rest);
    }
    return beat + dur;
  }

  /** Sustain pedal (feltPiano): notes starting in [downBeat, upBeat) ring until upBeat. */
  pedal(downBeat, upBeat) { this._pedals.push([downBeat, upBeat]); return this; }

  /**
   * Play a phrase written in the phrase notation (see README). Returns the beat where the phrase ends.
   * opts: vel (base velocity), transpose (semitones), shape ('arch'|'cresc'|'dim'|'dip'|fn(u)), shapeAmt,
   *       legato (bool), stretch (beat multiplier), gate (fraction of the written length), plus any instrument parameter.
   */
  play(beat, phrase, opts = {}) {
    const evs = parsePhrase(phrase);
    let total = evs.beats;
    if (total == null) { total = 0; for (const e of evs) total = Math.max(total, e.at + e.dur); }
    const shape = phraseShape(opts.shape, opts.shapeAmt ?? 0.25);
    const baseVel = opts.vel ?? this.defaults.vel ?? 0.6;
    const tr = opts.transpose ?? 0, stretch = opts.stretch ?? 1, gate = opts.gate ?? 1;
    const legato = !!opts.legato;
    const solo = this.inst.startsWith('solo');
    const extra = {};
    for (const k in opts) if (!PLAY_KEYS.has(k)) extra[k] = opts[k];
    for (let i = 0; i < evs.length; i++) {
      const e = evs[i];
      let v = (e.vel ?? baseVel) * shape(total > 0 ? e.at / total : 0);
      if (e.accent) v += 0.12;
      let d = e.dur * stretch * gate;
      const o = { ...extra };
      if (e.staccato) d *= 0.45;
      if (e.tenuto) o._extend = 0.05;
      if (e.tension) o.tag = 'tension';
      if (legato && !e.staccato) {
        // instruments with `chain` join touching legato notes into one continuous sound (Session._renderEvents);
        // the overlap / glide below is what the others (and a chain that cannot be joined) use
        o._leg = true;
        const prev = evs[i - 1], next = evs[i + 1];
        if (next && Math.abs(next.at - (e.at + e.dur)) < 1e-6 && !next.staccato) {
          o._extend = solo ? 0.03 : 0.08;
          if (solo && o.release == null) o.release = 0.09;
        }
        if (prev && Math.abs(prev.at + prev.dur - e.at) < 1e-6 && !prev.staccato) {
          if (solo) {
            if (o.glideFrom == null) o.glideFrom = prev.pitches[prev.pitches.length - 1] + tr;
            if (o.attack == null) o.attack = 0.045;
          }
        }
      }
      for (const p of e.pitches) this.note(beat + e.at * stretch, d, p + tr, clamp(v, 0.01, 1), o);
    }
    return beat + total * stretch;
  }

  /**
   * Reversed swell: the note is rendered, smeared with a short reverb, reversed, and placed so that it
   * ends (at its loudest) exactly on `endBeat`. lenBeats = length of the swell.
   */
  reverse(endBeat, lenBeats, pitch, vel, opts = {}) {
    const def = INSTRUMENTS[this.inst];
    const midi = pitch == null ? (opts.midi ?? def.defaultMidi ?? 60) : noteNum(pitch);
    this.session._events.push({ part: this, beat: endBeat - lenBeats, dur: lenBeats, midi, vel: vel ?? 0.6, opts, reverse: true });
    return this;
  }
}

// ---------------------------------------------------------------- session

export class Session {
  /**
   * track: { id, title, bpm, loop }, opts: { from, to (seconds: partial render), solo (bus name), seed, quiet }
   */
  constructor(track, opts = {}) {
    this.id = track.id; this.title = track.title || track.id; this.bpm = track.bpm || 90; this.loopWanted = !!track.loop;
    this.seed = opts.seed ?? track.seed ?? 1;
    this.opts = opts;
    this._tempo = [{ beat: 0, bpm: this.bpm, ramp: false }];
    this._meters = [{ bar: 1, num: 4, den: 4 }];
    this._sections = [];
    this._events = [];
    this._buses = new Map();
    this._length = null;
    this._hall = { ...REVERB_PRESETS.hall, wet: 1 };
    this._room = { ...REVERB_PRESETS.room, wet: 1 };
    this._delay = { beats: 0.75, feedback: 0.35, damp: 3500, pingpong: true, toReverb: 0.25 };
    this._master = { lufs: -16, ceiling: -1.8, hp: 30, eq: [], glue: { threshold: -15, ratio: 1.6, attack: 0.03, release: 0.3, knee: 10 }, width: 1, sat: 0, tail: null };
    /** Default humanisation: gaussian timing jitter (seconds, sigma) and velocity jitter (sigma). */
    this.humanize = { time: 0.008, vel: 0.04 };
    this.score = [];
    this._nTot = 0;
    this._timeScale = 1;
  }

  // ---- time

  /** Set the tempo at a beat. With { ramp: true } the tempo moves linearly from the previous point to this one. */
  tempo(beat, bpm, { ramp = false } = {}) {
    if (!Number.isFinite(beat) || !(bpm > 0)) throw new Error(`tempo(${beat}, ${bpm}): beat must be a number and bpm > 0`);
    const p = this._tempo;
    // At one beat there may be a ramp end (the tempo arrived at) followed by a step (the tempo to go on with):
    // s.rit(a, b, 54); s.tempo(b, 66) = ritardando to 54, then "a tempo" 66.
    const same = (x) => Math.abs(x.beat - beat) < 1e-9;
    const pt = { beat, bpm, ramp };
    const i = p.findIndex((x) => same(x) && x.ramp === ramp);
    if (i >= 0) p[i] = pt;
    else if (ramp) { const j = p.findIndex(same); if (j >= 0) p.splice(j, 0, pt); else p.push(pt); }
    else p.push(pt);
    p.sort((a, b) => a.beat - b.beat || (a.ramp === b.ramp ? 0 : a.ramp ? -1 : 1));
    return this;
  }
  /** Ritardando or accelerando: from the current tempo at fromBeat to `bpm` at toBeat. */
  rit(fromBeat, toBeat, bpm) {
    if (!(toBeat > fromBeat)) throw new Error(`rit/accel: toBeat (${toBeat}) must be after fromBeat (${fromBeat})`);
    this.tempo(fromBeat, this.bpmAt(fromBeat));
    return this.tempo(toBeat, bpm, { ramp: true });
  }
  accel(fromBeat, toBeat, bpm) { return this.rit(fromBeat, toBeat, bpm); }
  bpmAt(beat) {
    const p = this._tempo;
    if (beat <= p[0].beat) return p[0].bpm;
    for (let i = 0; i < p.length; i++) {
      const a = p[i], nx = p[i + 1];
      if (!nx || beat < nx.beat) {
        if (nx && nx.ramp) return a.bpm + ((nx.bpm - a.bpm) * (beat - a.beat)) / (nx.beat - a.beat);
        return a.bpm;
      }
    }
    return p[p.length - 1].bpm;
  }
  /**
   * Beats (quarter notes from the start) -> seconds. A looping track is stretched by a few parts in 10^5
   * (see _prepare) so that its length is a whole number of AAC frames.
   */
  sec(beat) { return this._secRaw(beat) * this._timeScale; }
  _secRaw(beat) {
    const p = this._tempo;
    if (beat <= p[0].beat) return ((beat - p[0].beat) * 60) / p[0].bpm;
    let t = 0;
    for (let i = 0; i < p.length; i++) {
      const a = p[i], nx = p[i + 1];
      const end = nx ? Math.min(beat, nx.beat) : beat;
      if (end > a.beat) {
        if (nx && nx.ramp && Math.abs(nx.bpm - a.bpm) > 1e-9) {
          const slope = (nx.bpm - a.bpm) / (nx.beat - a.beat);
          t += (60 / slope) * Math.log((a.bpm + slope * (end - a.beat)) / a.bpm);
        } else t += ((end - a.beat) * 60) / a.bpm;
      }
      if (!nx || beat <= nx.beat) break;
    }
    return t;
  }
  /** Time signature from a bar on (bars are 1-based). */
  meter(num, den = 4, fromBar = 1) {
    this._meters = this._meters.filter((m) => m.bar !== fromBar);
    this._meters.push({ bar: fromBar, num, den });
    this._meters.sort((a, b) => a.bar - b.bar);
    return this;
  }
  /** Quarter-note beats in a given bar. */
  barBeats(bar = 1) {
    let m = this._meters[0];
    for (const x of this._meters) if (x.bar <= bar) m = x;
    return (m.num * 4) / m.den;
  }
  /** Absolute beat of (bar, beatInBar), both 1-based. bar(5) = downbeat of bar 5, bar(5, 3) = its third beat. */
  bar(bar, beatInBar = 1) {
    const ms = this._meters;
    let b = 0, cur = ms[0];
    for (let i = 0; i < ms.length; i++) {
      const m = ms[i];
      if (m.bar > bar) break;
      const nx = ms[i + 1];
      const last = nx && nx.bar < bar ? nx.bar : bar;
      b += ((last - m.bar) * m.num * 4) / m.den;
      cur = m;
    }
    return b + ((beatInBar - 1) * 4) / cur.den;
  }
  /** Declare a section (for the score JSON and the analyzer). mood: gentle | tension | climax | release | ... */
  section(name, startBeat, endBeat, mood = 'gentle') { this._sections.push({ name, b0: startBeat, b1: endBeat, mood }); return this; }
  /** Total length of the piece in beats (the loop point). */
  length(beats) { this._length = beats; return this; }
  /** A named deterministic random generator for the composer: const r = s.rng('melody'); r() -> 0..1 */
  rng(name = 'main') { return mulberry32(hashSeed(this.seed, 'user', name)); }

  // ---- mixer configuration

  /** Hall reverb: preset name ('hall' | 'cathedral' | 'chamber') or { rt60, predelay, damping, early, lp, hp, wet, seed }. */
  reverb(o) { this._hall = typeof o === 'string' ? { ...needPreset(o), wet: 1 } : { ...this._hall, ...o }; return this; }
  /** Second, darker and shorter reverb ("room" send). */
  room(o) { this._room = typeof o === 'string' ? { ...needPreset(o), wet: 1 } : { ...this._room, ...o }; return this; }
  /** Tempo-synced delay: { beats (0.75 = dotted eighth), feedback, damp (Hz), pingpong, toReverb, bpm? } */
  delay(o) { Object.assign(this._delay, o); return this; }
  /** Master: { lufs, ceiling, eq:[...], glue:{...}|false, width, sat (drive dB, 0 = off), hp, tail (seconds) } */
  master(o) { Object.assign(this._master, o); return this; }

  /** Create (or fetch) a mix bus. opts: gain (dB), pan, reverb, room, delay (send levels 0..1), width, eq, comp, sat, mute */
  bus(name, opts) {
    let b = this._buses.get(name);
    if (!b) { b = new Bus(this, name, opts); this._buses.set(name, b); } else if (opts) b.set(opts);
    return b;
  }
  /** A part = one instrument on one bus with default parameters. */
  part(bus, inst, defaults = {}) {
    return new Part(this, typeof bus === 'string' ? this.bus(bus) : bus, inst, defaults);
  }

  // ---- rendering

  _prepare() {
    const o = this.opts;
    let lenBeats = this._length;
    if (lenBeats == null) {
      lenBeats = 0;
      for (const e of this._events) lenBeats = Math.max(lenBeats, e.beat + e.dur);
      if (this.loopWanted) { const bb = this.barBeats(1); lenBeats = Math.ceil(lenBeats / bb - 1e-9) * bb; }
    }
    this.lengthBeats = lenBeats;
    // AAC codes 1024-sample frames. A loop whose length is a whole number of frames decodes to exactly the same
    // number of samples (the encoder delay is removed by the mp4 edit list and there is no end padding), so the
    // m4a wraps as seamlessly as the WAV. The whole time axis is stretched by at most 512 samples (< 0.02 %).
    this._timeScale = 1;
    if (this.loopWanted) {
      const raw = this._secRaw(lenBeats) * SR;
      const snapped = Math.max(1024, Math.round(raw / 1024) * 1024);
      this._timeScale = snapped / raw;
    }
    this.durationSec = this.sec(lenBeats);
    this.from = clamp(o.from ?? 0, 0, this.durationSec);
    this.to = clamp(o.to ?? this.durationSec, this.from, this.durationSec);
    this.partial = this.from > 0 || this.to < this.durationSec - 1e-6;
    this.loop = this.loopWanted && !this.partial;
    this._nBody = Math.round((this.to - this.from) * SR);
    const tailSec = this._master.tail ?? Math.max(6, this._hall.rt60 * 1.2 + 2);
    this._nTail = Math.round(tailSec * SR);
    if (this.loop) this._nTail = Math.min(this._nTail, this._nBody);
    this._nTot = this._nBody + this._nTail;
  }

  _renderEvents() {
    const solo = this.opts.solo || null;
    if (solo && !this._buses.has(solo)) throw new Error(`--solo: no bus named "${solo}". Buses: ${[...this._buses.keys()].join(', ')}`);
    const wrapN = this.loop ? this._nBody : 0;
    this.rangeNotes = {}; // part label -> notes written outside the comfortable range of the instrument
    const from = this.from, to = this.to;
    let rendered = 0;
    const chains = new Map();
    for (const ev of this._events) {
      const part = ev.part, def = INSTRUMENTS[part.inst];
      const o = { ...part.defaults, ...(ev.opts || {}) };
      const hum = o.exact ? null : (o.humanize ?? this.humanize);
      const hr = mulberry32(hashSeed(this.seed, 'hum', part.label, part.bus.name, ev.beat.toFixed(5), ev.midi));
      let jit = 0, vel = ev.vel;
      if (hum) {
        jit = clamp(gauss(hr), -2.5, 2.5) * (hum.time ?? 0);
        vel = clamp(vel * (1 + clamp(gauss(hr), -2.5, 2.5) * (hum.vel ?? 0)), 0.01, 1);
      }
      const tAbs = this.sec(ev.beat) + jit + (o._shift || 0);
      let dur = this.sec(ev.beat + ev.dur) - this.sec(ev.beat) + (o._extend || 0);
      if (dur < 0.01) dur = 0.01;
      const rec = { inst: part.label, t: round5(tAbs), dur: round5(dur), midi: ev.midi, vel: round5(vel) };
      if (def.pitched && (ev.midi < def.range[0] || ev.midi > def.range[1])) {
        const r = (this.rangeNotes[part.label] ||= { count: 0, lo: ev.midi, hi: ev.midi, range: def.range });
        r.count++; r.lo = Math.min(r.lo, ev.midi); r.hi = Math.max(r.hi, ev.midi);
      }
      const tag = o.tag || (def.pitched ? null : 'unpitched');
      if (tag) rec.tag = tag;
      this.score.push(rec);
      if (solo && part.bus.name !== solo) continue;
      if (part.bus.o.mute) continue;
      const nt = { ...o, t: tAbs - from, dur, midi: ev.midi, vel };
      const rng = mulberry32(hashSeed(this.seed, part.label, part.bus.name, Math.round(tAbs * 1000), Math.round(ev.midi * 100)));
      if (def.chain && o._leg && !ev.reverse) {
        // legato note of a bowed/blown instrument: collected, joined with its neighbours and rendered below
        let a = chains.get(part);
        if (!a) chains.set(part, (a = []));
        a.push({ nt, rng, b0: ev.beat, b1: ev.beat + ev.dur, tAbs, dur, midi: ev.midi });
        continue;
      }
      if (tAbs > to + 0.05 || tAbs + dur + 16 < from) continue;
      for (const [b0, b1] of part._pedals) {
        if (ev.beat >= b0 - 1e-6 && ev.beat < b1 - 1e-6) { nt.ring = Math.max(nt.ring ?? 0, this.sec(b1) - tAbs); break; }
      }
      const bus = part.bus;
      if (ev.reverse) {
        this._renderReverse(def, nt, rng, bus, wrapN);
      } else {
        def.render((key, body, t, L, R, n) => bus._layer(key, body).add(Math.round(t * SR), L, R, n, wrapN), nt, rng);
      }
      rendered++;
    }
    for (const [part, items] of chains) rendered += this._renderChains(part, items, wrapN);
    this.score.sort((a, b) => a.t - b.t || a.midi - b.midi);
    return rendered;
  }

  /**
   * True legato. Legato notes of one part that touch (one ends on the beat where the next starts) become ONE note
   * with segments: each player of the instrument keeps sounding and moves to the next pitch (renderSustained).
   * Several lines at once (divisi) are paired lowest to lowest. Notes whose player setup differs are not joined.
   */
  _renderChains(part, items, wrapN) {
    const def = INSTRUMENTS[part.inst], bus = part.bus, from = this.from, to = this.to;
    const emit = (key, body, t, L, R, n) => bus._layer(key, body).add(Math.round(t * SR), L, R, n, wrapN);
    const key = (b) => Math.round(b * 1e4);
    const starts = new Map(), ends = new Map();
    const push = (m, k, it) => { const a = m.get(k); if (a) a.push(it); else m.set(k, [it]); };
    for (const it of items) { push(starts, key(it.b0), it); push(ends, key(it.b1), it); }
    for (const [k, A] of ends) {
      const B = starts.get(k);
      if (!B || B.length !== A.length) continue;
      const a = A.slice().sort((x, y) => x.midi - y.midi), b = B.slice().sort((x, y) => x.midi - y.midi);
      for (let i = 0; i < a.length; i++) {
        if (b[i].tAbs > a[i].tAbs + 0.03 && CHAIN_KEYS.every((q) => a[i].nt[q] === b[i].nt[q])) { a[i].next = b[i]; b[i].prev = a[i]; }
      }
    }
    let count = 0;
    for (const it of items) {
      if (it.prev) continue;
      const list = [];
      for (let x = it; x; x = x.next) list.push(x);
      const first = list[0], last = list[list.length - 1];
      if (first.tAbs > to + 0.05 || last.tAbs + last.dur + 16 < from) continue;
      count += list.length;
      if (list.length === 1) { def.render(emit, first.nt, first.rng); continue; }
      const segs = list.map((x, i) => ({
        t: x.tAbs - first.tAbs, dur: i + 1 < list.length ? list[i + 1].tAbs - x.tAbs : x.dur, midi: x.midi, vel: x.nt.vel,
        expr: x.nt.expr, bright: x.nt.bright, amp: x.nt.amp, glideTime: x.nt.glideTime, glideFrom: i === 0 ? x.nt.glideFrom : undefined,
      }));
      def.render(emit, { ...first.nt, dur: last.tAbs + last.dur - first.tAbs, _segs: segs }, first.rng);
    }
    return count;
  }

  _renderReverse(def, nt, rng, bus, wrapN) {
    const len = nt.dur;
    const smear = nt.smear ?? 0.6;
    let cap = null;
    def.render((key, body, t, L, R, n) => { cap = { key, body, L: L.slice(0, n), R: R.slice(0, n), n }; }, { ...nt, t: 0, dur: Math.max(0.3, len * 0.8) }, rng);
    if (!cap) return;
    const m = Math.round(len * SR);
    const a = new Float32Array(m), b = new Float32Array(m);
    a.set(cap.L.subarray(0, Math.min(m, cap.n))); b.set(cap.R.subarray(0, Math.min(m, cap.n)));
    if (smear > 0) {
      const wl = new Float32Array(m), wr = new Float32Array(m);
      convolveStereo(a, b, m, makeIR(REVERB_PRESETS.smear), wl, wr, smear * 1.6);
      for (let i = 0; i < m; i++) { a[i] += wl[i]; b[i] += wr[i]; }
    }
    a.reverse(); b.reverse();
    // shape: slow fade-in over the whole length, quick fade at the very end so it stops cleanly on the beat
    const fo = Math.min(m >> 2, Math.round(0.012 * SR));
    for (let i = 0; i < m; i++) {
      const u = i / m;
      let g = Math.pow(u, nt.curve ?? 1.2);
      if (i >= m - fo) g *= (m - 1 - i) / fo;
      a[i] *= g; b[i] *= g;
    }
    bus._layer(cap.key, cap.body).add(Math.round(nt.t * SR), a, b, m, wrapN);
  }

  /** Mix all buses, reverbs and delay. Returns the dry+wet stereo mix of length nBody + nTail. */
  _mix(log) {
    const nTot = this._nTot;
    const mL = new Float32Array(nTot), mR = new Float32Array(nTot);
    const bL = new Float32Array(nTot), bR = new Float32Array(nTot);
    let tL = null, tR = null;
    const sends = { reverb: null, room: null, delay: null };
    const needSend = (k) => (sends[k] ||= [new Float32Array(nTot), new Float32Array(nTot)]);
    const from = this.from;
    const toSample = (beat) => (this.sec(beat) - from) * SR;

    for (const bus of this._buses.values()) {
      if (!bus.layers.size) continue;
      const t0 = now();
      bL.fill(0); bR.fill(0);
      let lo = nTot, hi = 0;
      for (const layer of bus.layers.values()) {
        let range;
        if (layer.body) {
          if (!tL) { tL = new Float32Array(nTot); tR = new Float32Array(nTot); } else { tL.fill(0); tR.fill(0); }
          range = layer.mixInto(tL, tR);
          if (!range) continue;
          const e = Math.min(nTot, range[1] + SR); // let the body ring out
          applyBody(layer.body, tL, tR, range[0], e);
          for (let i = range[0]; i < e; i++) { bL[i] += tL[i]; bR[i] += tR[i]; }
          range[1] = e;
        } else {
          range = layer.mixInto(bL, bR);
          if (!range) continue;
        }
        if (range[0] < lo) lo = range[0];
        if (range[1] > hi) hi = range[1];
        layer.L = layer.R = null; // free
      }
      if (hi <= lo) continue;
      const o = bus.o;
      if (bus.tapeStops) for (const ts of bus.tapeStops) applyTapeStop(bL, bR, nTot, toSample(ts.fromBeat), toSample(ts.toBeat), toSample(ts.resume), ts.curve);
      if (o.eq && o.eq.length) { eqStereo(o.eq, bL, bR, lo, nTot); hi = nTot; }
      if (o.sat) saturate(bL, bR, lo, hi, o.sat);
      if (o.comp) compress(bL, bR, lo, hi, o.comp);
      if (bus.auto.lowpass) {
        const pts = bus.auto.lowpass.map(([b, v]) => [toSample(b), v]);
        let i1L = 0, i2L = 0, i1R = 0, i2R = 0, a1 = 0, a2 = 0, a3 = 0;
        for (let i = lo; i < hi; i++) {
          if (((i - lo) & 63) === 0) {
            const g = Math.tan((Math.PI * clamp(curveAt(pts, i), 40, 19000)) / SR);
            a1 = 1 / (1 + g * (g + 1.414)); a2 = g * a1; a3 = g * a2;
          }
          let v3 = bL[i] - i2L, v1 = a1 * i1L + a2 * v3, v2 = i2L + a2 * i1L + a3 * v3;
          i1L = 2 * v1 - i1L; i2L = 2 * v2 - i2L; bL[i] = v2;
          v3 = bR[i] - i2R; v1 = a1 * i1R + a2 * v3; v2 = i2R + a2 * i1R + a3 * v3;
          i1R = 2 * v1 - i1R; i2R = 2 * v2 - i2R; bR[i] = v2;
        }
      }
      if (o.width !== 1) stereoWidth(bL, bR, lo, hi, o.width);
      const g0 = dB(o.gain);
      const gl = g0 * Math.min(1, 1 - o.pan), gr = g0 * Math.min(1, 1 + o.pan);
      if (bus.auto.gain) {
        const pts = bus.auto.gain.map(([b, v]) => [toSample(b), v]);
        let g = dB(curveAt(pts, lo));
        for (let i = lo; i < hi; i += 64) {
          const e = Math.min(hi, i + 64);
          const gT = dB(curveAt(pts, e));
          const dG = (gT - g) / (e - i);
          for (let k = i; k < e; k++) { bL[k] *= g * gl; bR[k] *= g * gr; g += dG; }
        }
      } else {
        for (let i = lo; i < hi; i++) { bL[i] *= gl; bR[i] *= gr; }
      }
      for (let i = lo; i < hi; i++) { mL[i] += bL[i]; mR[i] += bR[i]; }
      for (const k of ['reverb', 'room', 'delay']) {
        const s = o[k];
        if (s > 0) {
          const [sl, sr] = needSend(k);
          for (let i = lo; i < hi; i++) { sl[i] += bL[i] * s; sr[i] += bR[i] * s; }
        }
      }
      log(`  bus ${bus.name.padEnd(12)} ${[...bus.layers.keys()].join(',').padEnd(26)} ${now() - t0} ms`);
    }

    if (sends.delay) {
      const d = this._delay;
      const time = (d.beats * 60) / (d.bpm ?? this.bpm);
      const wl = new Float32Array(nTot), wr = new Float32Array(nTot);
      stereoDelay(sends.delay[0], sends.delay[1], nTot, wl, wr, { time, feedback: d.feedback, damp: d.damp, pingpong: d.pingpong });
      const tr = d.toReverb ?? 0;
      const rv = tr > 0 ? needSend('reverb') : null;
      for (let i = 0; i < nTot; i++) {
        mL[i] += wl[i]; mR[i] += wr[i];
        if (rv) { rv[0][i] += wl[i] * tr; rv[1][i] += wr[i] * tr; }
      }
    }
    const energy = (a, b) => { let e = 0; for (let i = 0; i < nTot; i++) e += a[i] * a[i] + b[i] * b[i]; return e; };
    const eDry = energy(mL, mR);
    this.mixStats = { wetDb: {} };
    for (const [k, cfg] of [['reverb', this._hall], ['room', this._room]]) {
      if (!sends[k]) continue;
      const t0 = now();
      const ir = makeIR(cfg);
      // rendered apart from the mix so that the reverb level can be reported
      const wl = new Float32Array(nTot), wr = new Float32Array(nTot);
      convolveStereo(sends[k][0], sends[k][1], nTot, ir, wl, wr, cfg.wet ?? 1);
      const rel = toDb(Math.sqrt(energy(wl, wr) / (eDry + 1e-30)));
      this.mixStats.wetDb[k] = rel;
      for (let i = 0; i < nTot; i++) { mL[i] += wl[i]; mR[i] += wr[i]; }
      sends[k] = null;
      log(`  ${k} (rt60 ${cfg.rt60}s) ${rel.toFixed(1)} dB relative to the dry mix, ${now() - t0} ms`);
    }
    return [mL, mR];
  }

  /**
   * Render everything. Returns { L, R (float, final), n, pcm (Int16 interleaved), stats, score }.
   */
  render(log = () => {}) {
    const t0 = now();
    this._prepare();
    const rendered = this._renderEvents();
    const t1 = now();
    log(`notes: ${this.score.length} scored, ${rendered} rendered in ${t1 - t0} ms`);
    const [mL, mR] = this._mix(log);
    const t2 = now();
    log(`mix: ${t2 - t1} ms`);
    const nBody = this._nBody, nTail = this._nTail;
    let L, R, n;
    if (this.loop) {
      // fade the very end of the tail, then fold the tail onto the start: the file wraps seamlessly
      const f = Math.min(nTail, SR);
      for (let i = 0; i < f; i++) { const g = i / f; mL[nBody + nTail - 1 - i] *= g; mR[nBody + nTail - 1 - i] *= g; }
      for (let i = 0; i < nTail; i++) { mL[i] += mL[nBody + i]; mR[i] += mR[nBody + i]; }
      n = nBody; L = mL.subarray(0, n); R = mR.subarray(0, n);
    } else {
      n = nBody + nTail;
      const f = Math.min(nTail, Math.round(1.5 * SR));
      for (let i = 0; i < f; i++) { const g = i / f; mL[n - 1 - i] *= g; mR[n - 1 - i] *= g; }
      L = mL; R = mR;
    }
    const stats = masterChain(L, R, n, this.loop, this._master, log);
    const { pcm, clipped } = ditherTo16(L, R, n, hashSeed(this.seed, 'dither'));
    stats.clipped = clipped;
    stats.seconds = n / SR;
    stats.reverbDb = this.mixStats?.wetDb?.reverb ?? null; // hall level relative to the dry mix
    stats.roomDb = this.mixStats?.wetDb?.room ?? null;
    // plain-language hints for the composer (render.mjs prints them)
    const hints = [];
    if (stats.limiterSecOver2dB > 0.02 * stats.seconds) hints.push(`limiter reduces more than 2 dB during ${stats.limiterSecOver2dB.toFixed(1)} s (${((100 * stats.limiterSecOver2dB) / stats.seconds).toFixed(0)} % of the piece): the music has too many peaks for the loudness target; lower the percussive buses (piano, drums, harp) or the velocities of their loudest notes`);
    if (stats.limiterMaxReductionDb > 4.5) hints.push(`limiter works ${stats.limiterMaxReductionDb.toFixed(1)} dB at ${fmtTime(stats.limiterAtSec + this.from)} (transparent up to about 4): lower the loudest buses, velocities or the sub bass there (drums and low piano chords have the highest peaks)`);
    if (stats.correlation != null && stats.correlation < 0.3) hints.push(`stereo correlation ${stats.correlation.toFixed(2)} is low: reduce bus/master width or hard panning (mono phone speaker)`);
    if (stats.reverbDb != null && stats.reverbDb > -4) hints.push(`reverb is only ${(-stats.reverbDb).toFixed(1)} dB below the dry mix: very wet, lower the reverb sends (-12 to -6 dB is the usual range)`);
    if (Number.isFinite(stats.lufs) && Math.abs(stats.lufs - this._master.lufs) > 0.5) hints.push(`loudness ${stats.lufs.toFixed(2)} LUFS missed the target ${this._master.lufs}: the limiter ate the difference, reduce the peaks`);
    for (const [label, r] of Object.entries(this.rangeNotes || {})) hints.push(`${label}: ${r.count} note(s) outside the comfortable range ${r.range[0]}-${r.range[1]} (written ${r.lo}-${r.hi})`);
    stats.hints = hints;
    stats.renderMs = now() - t0;
    log(`master: ${now() - t2} ms`);
    return { L, R, n, pcm, stats, score: this.scoreJson() };
  }

  scoreJson() {
    // bar map (start time of every bar, in seconds) so that the linter works with meter changes and a tempo map
    const bars = [];
    for (let bar = 1; bar < 100000; bar++) {
      const b = this.bar(bar);
      if (b >= (this.lengthBeats ?? 0) - 1e-9) break;
      bars.push(round5(this.sec(b)));
    }
    return {
      id: this.id, title: this.title, bpm: this.bpm, durationSec: round5(this.durationSec), loop: this.loopWanted,
      sections: this._sections.map((s) => ({ name: s.name, t0: round5(this.sec(s.b0)), t1: round5(this.sec(s.b1)), mood: s.mood })),
      beatsPerBar: this.barBeats(1), bars,
      notes: this.score,
    };
  }
}

const round5 = (x) => Math.round(x * 1e5) / 1e5;
const fmtTime = (sec) => (sec == null || !Number.isFinite(sec) ? '?' : `${Math.floor(sec / 60)}:${(sec % 60).toFixed(1).padStart(4, '0')} (${sec.toFixed(1)} s)`);
function needPreset(name) {
  const p = REVERB_PRESETS[name];
  if (!p) throw new Error('unknown reverb preset "' + name + '"');
  return p;
}

/** Tape stop on a bus buffer: playback speed falls from 1 to 0 over [s0, s1), silence until sResume. */
function applyTapeStop(L, R, nTot, s0, s1, sResume, curve) {
  s0 = Math.max(0, Math.round(s0)); s1 = Math.min(nTot, Math.round(s1)); sResume = Math.min(nTot, Math.round(sResume));
  const len = s1 - s0;
  if (len < 16) return;
  const srcL = L.slice(s0, s1), srcR = R.slice(s0, s1);
  for (let i = 0; i < len; i++) {
    const u = i / len;
    // position read = integral of the speed (1 - u)^curve
    const pos = (len / (curve + 1)) * (1 - Math.pow(1 - u, curve + 1));
    const k = Math.floor(pos), f = pos - k;
    const a = srcL[k] ?? 0, b = srcL[k + 1] ?? a, c = srcR[k] ?? 0, d = srcR[k + 1] ?? c;
    // the level sags as the motor dies (and the last 5 % fades to avoid a thump)
    const g = Math.pow(1 - u, 0.35) * (u > 0.95 ? (1 - u) / 0.05 : 1);
    L[s0 + i] = (a + (b - a) * f) * g; R[s0 + i] = (c + (d - c) * f) * g;
  }
  for (let i = s1; i < sResume; i++) { L[i] = 0; R[i] = 0; }
  const fi = Math.min(Math.round(0.005 * SR), nTot - sResume);
  for (let i = 0; i < fi; i++) { const g = i / fi; L[sResume + i] *= g; R[sResume + i] *= g; }
}

// ---------------------------------------------------------------- master chain

/**
 * In place: high-pass, width, loudness normalisation, glue compression, EQ, normalisation again,
 * true-peak limiter (re-normalised after limiting). In loop mode everything runs on a buffer extended with
 * a pre-roll (the end of the loop) and a post-roll (its start), so filter, compressor and limiter states
 * are identical at the wrap point.
 */
export function masterChain(L, R, n, loop, M, log = () => {}) {
  const P = loop ? Math.min(n, 3 * SR) : 0, Q = loop ? Math.min(n, SR >> 1) : 0;
  const N = P + n + Q;
  let eL = L, eR = R;
  if (loop) {
    eL = new Float32Array(N); eR = new Float32Array(N);
    eL.set(L.subarray(n - P, n), 0); eL.set(L.subarray(0, n), P); eL.set(L.subarray(0, Q), P + n);
    eR.set(R.subarray(n - P, n), 0); eR.set(R.subarray(0, n), P); eR.set(R.subarray(0, Q), P + n);
  }
  const gainAll = (g) => { for (let i = 0; i < N; i++) { eL[i] *= g; eR[i] *= g; } };
  const measure = () => integratedLufs(eL, eR, n, P);
  const stats = {};
  if (M.hp) { const c = biquad('highpass', M.hp, 0.707); biquadRun(c, eL, 0, N); biquadRun(c, eR, 0, N); }
  if (M.width !== 1) stereoWidth(eL, eR, 0, N, M.width);
  let l0 = measure();
  stats.rawLufs = l0;
  if (!Number.isFinite(l0)) { stats.lufs = l0; stats.silent = true; return stats; }
  gainAll(dB(M.lufs - l0));
  if (M.glue) compress(eL, eR, 0, N, M.glue);
  if (M.eq && M.eq.length) eqStereo(M.eq, eL, eR, 0, N);
  if (M.sat) saturate(eL, eR, 0, N, M.sat, -10);
  gainAll(dB(M.lufs - measure()));
  let red = 0, redAt = -1, over2 = 0;
  for (let it = 0; it < 4; it++) {
    const r = limit(eL, eR, N, { ceiling: M.ceiling });
    if (r.maxReduction > red) { red = r.maxReduction; redAt = r.at; }
    if (it === 0) over2 = r.secOver2dB || 0;
    const l = measure();
    const diff = M.lufs - l;
    if (Math.abs(diff) < 0.08 || it === 3) break;
    gainAll(dB(diff)); // the limiter cost some loudness: make it up and limit again
  }
  if (loop) { L.set(eL.subarray(P, P + n)); R.set(eR.subarray(P, P + n)); }
  stats.lufs = integratedLufs(L, R, n, 0);
  stats.truePeakDb = toDb(truePeakEnvelope(L, R, n, null, 0));
  stats.limiterMaxReductionDb = red;
  stats.limiterSecOver2dB = over2; // time the limiter holds more than 2 dB of reduction (first pass)
  stats.limiterAtSec = redAt < 0 ? null : (((redAt - P) % n) + n) % n / SR;
  let sl = 0, sr = 0, sll = 0, srr = 0, slr = 0;
  for (let i = 0; i < n; i++) { const a = L[i], b = R[i]; sl += a; sr += b; sll += a * a; srr += b * b; slr += a * b; }
  stats.dc = Math.max(Math.abs(sl / n), Math.abs(sr / n));
  stats.correlation = slr / Math.sqrt(sll * srr + 1e-30);
  stats.rmsDb = toDb(Math.sqrt((sll + srr) / (2 * n)));
  log(`  loudness ${stats.lufs.toFixed(2)} LUFS, true peak ${stats.truePeakDb.toFixed(2)} dBTP, limiter max ${red.toFixed(1)} dB, corr ${stats.correlation.toFixed(2)}`);
  return stats;
}

// ---------------------------------------------------------------- writers

/** 16-bit stereo 44.1 kHz WAV from interleaved Int16 samples. */
export function writeWav(path, pcm, sampleRate = SR) {
  mkdirSync(dirname(path), { recursive: true });
  const dataBytes = pcm.length * 2;
  const buf = Buffer.alloc(44 + dataBytes);
  buf.write('RIFF', 0, 'ascii'); buf.writeUInt32LE(36 + dataBytes, 4); buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii'); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(sampleRate, 24); buf.writeUInt32LE(sampleRate * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36, 'ascii'); buf.writeUInt32LE(dataBytes, 40);
  Buffer.from(pcm.buffer, pcm.byteOffset, dataBytes).copy(buf, 44);
  writeFileSync(path, buf);
}

export function writeScore(path, score) {
  mkdirSync(dirname(path), { recursive: true });
  const head = { ...score, notes: undefined };
  const notes = score.notes.map((x) => JSON.stringify(x)).join(',\n');
  let s = JSON.stringify(head, null, 1);
  s = s.slice(0, s.lastIndexOf('}')).trimEnd() + ',\n "notes": [\n' + notes + '\n ]\n}\n';
  writeFileSync(path, s);
}

/** Build and render a track module ({ id, title, bpm, loop, build(session) }). */
export function renderTrack(track, opts = {}, log = () => {}) {
  const s = new Session(track, opts);
  track.build(s);
  const out = s.render(log);
  out.session = s;
  return out;
}
