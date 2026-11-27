// Note names, scales, chords and the tiny phrase notation used by Part.play().

const LETTER = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** 'C4' -> 60, 'F#3' -> 54, 'Bb2' -> 46. Numbers pass through (fractional midi allowed). */
export function n(p) {
  if (typeof p === 'number') return p;
  const m = /^([A-Ga-g])([#b]{0,2})(-?\d)$/.exec(String(p).trim());
  if (!m) {
    const v = Number(p);
    if (Number.isFinite(v)) return v;
    throw new Error('bad pitch: ' + p);
  }
  let v = LETTER[m[1].toUpperCase()];
  for (const ch of m[2]) v += ch === '#' ? 1 : -1;
  return v + (Number(m[3]) + 1) * 12;
}

/** Pitch class of a note name without octave: 'Eb' -> 3. */
export function pc(name) {
  if (typeof name === 'number') return ((name % 12) + 12) % 12;
  const m = /^([A-Ga-g])([#b]{0,2})$/.exec(String(name).trim());
  if (!m) throw new Error('bad pitch class: ' + name);
  let v = LETTER[m[1].toUpperCase()];
  for (const ch of m[2]) v += ch === '#' ? 1 : -1;
  return ((v % 12) + 12) % 12;
}

const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
export const noteName = (midi) => NAMES[((Math.round(midi) % 12) + 12) % 12] + (Math.floor(Math.round(midi) / 12) - 1);

export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11], ionian: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10], aeolian: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10], locrian: [0, 1, 3, 5, 6, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11], melodicMinor: [0, 2, 3, 5, 7, 9, 11],
  phrygianDominant: [0, 1, 4, 5, 7, 8, 10], hungarianMinor: [0, 2, 3, 6, 7, 8, 11],
  wholeTone: [0, 2, 4, 6, 8, 10], octatonic: [0, 2, 3, 5, 6, 8, 9, 11], octatonicHW: [0, 1, 3, 4, 6, 7, 9, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], pentatonicMinor: [0, 3, 5, 7, 10], pentatonicMajor: [0, 2, 4, 7, 9],
};

/**
 * scale('D', 'dorian', 4) -> a scale object. sc.deg(1) is D4, sc.deg(8) is D5, sc.deg(0) is C4, sc.deg(-1) is B3.
 * sc.notes(lo, hi) lists all scale tones between two midi numbers. sc.steps and sc.root are exposed.
 */
export function scale(root, mode = 'major', octave = 4) {
  const steps = SCALES[mode];
  if (!steps) throw new Error('unknown scale ' + mode);
  const base = (typeof root === 'number' ? root : pc(root)) + (octave + 1) * 12;
  const len = steps.length;
  const deg = (d, alter = 0) => {
    const i = d - 1;
    const oct = Math.floor(i / len);
    return base + oct * 12 + steps[i - oct * len] + alter;
  };
  return {
    root: base, steps, mode, deg,
    degs: (list) => list.map((d) => deg(d)),
    notes: (lo, hi) => {
      const out = [];
      for (let m = Math.ceil(n(lo)); m <= n(hi); m++) if (steps.includes((((m - base) % 12) + 12) % 12)) out.push(m);
      return out;
    },
    /** Diatonic triad or seventh built on a degree: sc.triad(5), sc.seventh(2) */
    triad: (d) => [deg(d), deg(d + 2), deg(d + 4)],
    seventh: (d) => [deg(d), deg(d + 2), deg(d + 4), deg(d + 6)],
  };
}

const CHORDS = {
  '': [0, 4, 7], maj: [0, 4, 7], M: [0, 4, 7], m: [0, 3, 7], min: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8], '+': [0, 4, 8],
  sus2: [0, 2, 7], sus4: [0, 5, 7], 5: [0, 7],
  6: [0, 4, 7, 9], m6: [0, 3, 7, 9], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], M7: [0, 4, 7, 11], m7: [0, 3, 7, 10],
  mMaj7: [0, 3, 7, 11], m7b5: [0, 3, 6, 10], dim7: [0, 3, 6, 9], '7sus4': [0, 5, 7, 10], '7b9': [0, 4, 7, 10, 13], '7#9': [0, 4, 7, 10, 15],
  add9: [0, 4, 7, 14], madd9: [0, 3, 7, 14], 9: [0, 4, 7, 10, 14], maj9: [0, 4, 7, 11, 14], m9: [0, 3, 7, 10, 14],
  m11: [0, 3, 7, 10, 14, 17], 'maj7#11': [0, 4, 7, 11, 18], '7#11': [0, 4, 7, 10, 18], m6add9: [0, 3, 7, 9, 14],
  mb6: [0, 3, 7, 8], 'maj7#5': [0, 4, 8, 11],
};

/** chord('Cm9', 3) -> midi list rooted in octave 3. Slash bass supported: chord('Fmaj7/A', 3). */
export function chord(sym, octave = 4) {
  const m = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/.exec(sym.trim());
  if (!m) throw new Error('bad chord: ' + sym);
  const iv = CHORDS[m[2]];
  if (!iv) throw new Error('unknown chord quality "' + m[2] + '" in ' + sym);
  const root = pc(m[1]) + (octave + 1) * 12;
  const out = iv.map((i) => root + i);
  if (m[3]) {
    let bass = pc(m[3]) + (octave + 1) * 12;
    while (bass >= root) bass -= 12;
    out.unshift(bass);
  }
  return out;
}

/** Rotate a chord upward k times (negative: downward). */
export function invert(notes, k = 1) {
  const a = notes.map(n).sort((x, y) => x - y);
  for (let i = 0; i < Math.abs(k); i++) {
    if (k > 0) a.push(a.shift() + 12);
    else a.unshift(a.pop() - 12);
  }
  return a;
}

/** Open (drop-2 style) spread of a close chord: every second tone goes down an octave. */
export function spread(notes) {
  const a = notes.map(n).sort((x, y) => x - y);
  return a.map((m, i) => (i % 2 === 1 ? m - 12 : m)).sort((x, y) => x - y);
}

/** Transpose a pitch, a list of pitches, or a phrase string by semitones. */
export function transpose(x, semis) {
  if (Array.isArray(x)) return x.map((p) => n(p) + semis);
  if (typeof x === 'string' && /\s|\[|:/.test(x)) return parsePhrase(x).map((ev) => ({ ...ev, pitches: ev.pitches.map((p) => p + semis) }));
  return n(x) + semis;
}

export const DYNAMICS = { ppp: 0.14, pp: 0.24, p: 0.36, mp: 0.48, mf: 0.6, f: 0.74, ff: 0.87, fff: 0.97 };
const DUR_SYM = { w: 4, h: 2, q: 1, e: 0.5, s: 0.25, t: 0.125 };

function parseDur(s) {
  if (s == null || s === '') return null;
  const v = Number(s);
  if (Number.isFinite(v)) return v;
  const m = /^([whqest])([.t]?)$/.exec(s);
  if (!m) throw new Error('bad duration: ' + s);
  let d = DUR_SYM[m[1]];
  if (m[2] === '.') d *= 1.5;
  if (m[2] === 't') d *= 2 / 3;
  return d;
}

/**
 * Phrase notation -> list of events { at, dur, pitches[], vel|null, accent, staccato, tenuto, tension }.
 * `at` is in beats relative to the phrase start. See README.md for the grammar.
 */
export function parsePhrase(src) {
  if (Array.isArray(src)) return src;
  const out = [];
  const toks = String(src).match(/\[[^\]]*\]\S*|\S+/g) || [];
  let at = 0, dur = 1, vel = null;
  for (const tok of toks) {
    if (tok === '|') continue;
    if (Object.prototype.hasOwnProperty.call(DYNAMICS, tok)) { vel = DYNAMICS[tok]; continue; }
    let pitchPart, rest;
    if (tok[0] === '[') {
      const close = tok.indexOf(']');
      pitchPart = tok.slice(1, close).trim().split(/\s+/).filter(Boolean);
      rest = tok.slice(close + 1);
    } else {
      const m = /^(_|~|[A-Ga-g][#b]{0,2}-?\d|\d+(?:\.\d+)?)(.*)$/.exec(tok);
      if (!m) throw new Error('bad phrase token: "' + tok + '"');
      pitchPart = [m[1]];
      rest = m[2];
    }
    const m2 = /^(?::([0-9.]+|[whqest][.t]?))?(?:@([0-9.]+))?([!'^\-]*)$/.exec(rest);
    if (!m2) throw new Error('bad phrase token: "' + tok + '"');
    const d = parseDur(m2[1]);
    if (d != null) dur = d;
    const flags = m2[3] || '';
    if (pitchPart[0] === '_') { at += dur; continue; }
    if (pitchPart[0] === '~') {
      // tie: extend the previous event(s) that end here
      for (let i = out.length - 1; i >= 0; i--) {
        if (Math.abs(out[i].at + out[i].dur - at) < 1e-9) out[i].dur += dur; else if (out[i].at + out[i].dur < at - 1e-9) break;
      }
      at += dur;
      continue;
    }
    out.push({
      at, dur, pitches: pitchPart.map(n),
      vel: m2[2] != null ? Number(m2[2]) : vel,
      accent: flags.includes('^'), staccato: flags.includes("'"), tenuto: flags.includes('-'), tension: flags.includes('!'),
    });
    at += dur;
  }
  Object.defineProperty(out, 'beats', { value: at, enumerable: false });
  return out;
}

/** Total length in beats of a phrase string. */
export function phraseBeats(src) {
  const ev = parsePhrase(src);
  if (ev.beats != null) return ev.beats;
  let end = 0;
  for (const e of ev) end = Math.max(end, e.at + e.dur);
  return end;
}

/**
 * Velocity shape over a phrase. u is 0..1 position, returns a multiplier around 1.
 * names: flat, arch (rise then fall), cresc, dim, dip.
 */
export function phraseShape(name, amount = 0.25) {
  if (typeof name === 'function') return name;
  switch (name) {
    case 'arch': return (u) => 1 - amount + 2 * amount * Math.sin(Math.PI * Math.min(1, u * 1.1));
    case 'cresc': return (u) => 1 - amount + 2 * amount * u;
    case 'dim': return (u) => 1 + amount - 2 * amount * u;
    case 'dip': return (u) => 1 + amount - 2 * amount * Math.sin(Math.PI * u);
    default: return () => 1;
  }
}
