// "Caper (final minute)": section D of caper played twice (bars 141-172 of the full cue, then a varied second pass:
// the whistle's question on the theremin, the climax an octave lower), 64 bars = 58.18 s, loops into itself.
// For the game's last-60-seconds state: crossfade or seek into it from caper at bar 141 (127.273 s).
//   node tools/music/render.mjs caper_final
import { makeCaper } from './caper.mjs';
export default makeCaper('final');
