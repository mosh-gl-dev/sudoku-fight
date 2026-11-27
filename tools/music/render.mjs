#!/usr/bin/env node
// CLI: node tools/music/render.mjs <trackId> [--out dir] [--from sec] [--to sec] [--solo busName] [--seed n] [--quiet]
//                                             [--m4a [file.m4a]] [--ffmpeg path]
// Writes <out>/<trackId>.wav and <out>/<trackId>.score.json (partial or solo renders get a suffix).
// --m4a also encodes AAC 192k (default: assets/music/candidates/<trackId>.m4a), decodes it again and checks the
// decoded file (true peak, loudness, length, loop seam): the m4a is what the app plays, not the WAV.

import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync, readdirSync, mkdirSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { renderTrack, writeWav, writeScore } from './engine.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUT = process.env.MUSIC_OUT || 'C:/Users/mosheg/AppData/Local/Temp/claude/b0377245321c840d/81d091e1-ea27-49e8-9aa7-9a02734ff5ad/scratchpad/music';

function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === '--quiet') a.quiet = true;
    else if (x === '--m4a') a.m4a = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    else if (x.startsWith('--')) a[x.slice(2)] = argv[++i];
    else a._.push(x);
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));
const id = args._[0];
if (!id) {
  const list = readdirSync(join(here, 'tracks')).filter((f) => f.endsWith('.mjs')).map((f) => f.replace(/\.mjs$/, ''));
  console.error('usage: node tools/music/render.mjs <trackId> [--out dir] [--from sec] [--to sec] [--solo busName] [--seed n] [--quiet] [--m4a [file]] [--ffmpeg path]');
  console.error('tracks: ' + list.join(', '));
  process.exit(2);
}
const file = join(here, 'tracks', id + '.mjs');
if (!existsSync(file)) { console.error('no such track: ' + file); process.exit(2); }

const t0 = process.hrtime.bigint();
const track = (await import(pathToFileURL(file).href)).default;
const opts = {};
if (args.from != null) opts.from = Number(args.from);
if (args.to != null) opts.to = Number(args.to);
if (args.solo) opts.solo = args.solo;
if (args.seed != null) opts.seed = Number(args.seed);
const log = args.quiet ? () => {} : (m) => console.log(m);

let out;
try {
  out = renderTrack(track, opts, log);
} catch (e) {
  console.error('render failed: ' + e.message);
  if (!args.quiet && e.stack) console.error(e.stack.split('\n').slice(1, 6).join('\n'));
  process.exit(1);
}
const outDir = resolve(args.out || DEFAULT_OUT);
let suffix = '';
if (opts.solo) suffix += '.solo-' + opts.solo;
if (out.session.partial) suffix += `.${Math.round(out.session.from)}-${Math.round(out.session.to)}`;
const wavPath = join(outDir, track.id + suffix + '.wav');
const scorePath = join(outDir, track.id + suffix + '.score.json');
writeWav(wavPath, out.pcm);
writeScore(scorePath, out.score);
const ms = Number((process.hrtime.bigint() - t0) / 1000000n);
const st = out.stats;
console.log(`${track.id}: ${st.seconds.toFixed(2)} s audio${out.session.loop ? ' (seamless loop)' : ''}, ${out.score.notes.length} notes, ` +
  `${Number.isFinite(st.lufs) ? st.lufs.toFixed(2) : '-inf'} LUFS, ${st.truePeakDb?.toFixed(2)} dBTP, clipped ${st.clipped}, rendered in ${(ms / 1000).toFixed(1)} s`);
if (st.reverbDb != null) console.log(`reverb ${st.reverbDb.toFixed(1)} dB relative to the dry mix, limiter max ${(st.limiterMaxReductionDb ?? 0).toFixed(1)} dB (> 2 dB for ${(st.limiterSecOver2dB ?? 0).toFixed(1)} s), stereo correlation ${(st.correlation ?? 1).toFixed(2)}`);
for (const h of st.hints || []) console.log('HINT: ' + h);
console.log(wavPath);
console.log(scorePath);

if (args.m4a) {
  if (out.session.partial || opts.solo) { console.error('--m4a: only for a full render (no --from/--to/--solo)'); process.exit(2); }
  const ffmpeg = args.ffmpeg || process.env.FFMPEG ||
    'C:/Users/mosheg/AppData/Local/Temp/claude/b0377245321c840d/81d091e1-ea27-49e8-9aa7-9a02734ff5ad/scratchpad/ff/node_modules/ffmpeg-static/ffmpeg.exe';
  if (!existsSync(ffmpeg)) { console.error('--m4a: ffmpeg not found at ' + ffmpeg + ' (use --ffmpeg or the FFMPEG env var)'); process.exit(1); }
  const m4a = resolve(args.m4a === true ? join(here, '../../assets/music/candidates', track.id + '.m4a') : args.m4a);
  mkdirSync(dirname(m4a), { recursive: true });
  const run = (argv) => {
    const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...argv], { encoding: 'utf8' });
    if (r.status !== 0) { console.error('ffmpeg failed: ' + (r.stderr || r.error)); process.exit(1); }
  };
  run(['-i', wavPath, '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', m4a]);
  const dec = join(outDir, track.id + '.m4a-decoded.wav');
  run(['-i', m4a, '-c:a', 'pcm_f32le', dec]);
  const { readWav, analyzeAudio } = await import('./analyze.mjs');
  const w = readWav(dec);
  const rep = analyzeAudio(w, { loop: out.session.loop, file: dec });
  unlinkSync(dec);
  const tp = rep.level.truePeakDbtp, lu = rep.loudness.integratedLufs;
  const lenOk = w.numSamples === out.n;
  console.log(`m4a: ${m4a}`);
  console.log(`m4a decoded: ${lu} LUFS, ${tp} dBTP, ${w.numSamples} samples (${lenOk ? 'same length as the WAV' : 'WAV has ' + out.n}), clicks ${rep.defects.clickCount}` +
    (rep.loop ? `, loop seam ${rep.loop.verdict === 'pass' ? 'PASS' : 'FAIL'}` : ''));
  if (tp > -1) console.log('HINT: the AAC file peaks above -1 dBTP: lower the ceiling, e.g. s.master({ ceiling: -2.2 })');
  if (!lenOk && out.session.loop) console.log('HINT: the decoded m4a length differs from the WAV: the loop point will not be sample exact');
}
