// QA demo: every instrument of the engine gets a few bars. Not a composition, a sound check.
// node tools/music/render.mjs _demo

import { chord, scale } from '../engine.mjs';

export default {
  id: '_demo',
  title: 'Instrument demo',
  bpm: 72,
  loop: true,

  build(s) {
    s.meter(4, 4);
    s.reverb('hall');
    s.delay({ beats: 0.75, feedback: 0.3 });
    s.master({ lufs: -16 });
    const B = (bar, beat = 1) => s.bar(bar, beat);

    const piano = s.part(s.bus('piano', { gain: -3, reverb: 0.3, room: 0.12 }), 'feltPiano');
    const vln = s.part(s.bus('violins', { gain: -7, pan: -0.25, reverb: 0.4 }), 'stringsEnsemble', { section: 'violins' });
    const vla = s.part(s.bus('violas', { gain: -8, pan: 0.1, reverb: 0.4 }), 'stringsEnsemble', { section: 'violas' });
    const vc = s.part(s.bus('celli', { gain: -7, pan: 0.25, reverb: 0.35 }), 'stringsEnsemble', { section: 'celli' });
    const cb = s.part(s.bus('basses', { gain: -7, pan: 0.15, reverb: 0.25 }), 'contrabass');
    const trem = s.part('violins', 'stringsTremolo', { section: 'violins' });
    const pizz = s.part(s.bus('pizz', { gain: -5, reverb: 0.3 }), 'stringsPizzicato', { section: 'violas' });
    const cbPizz = s.part('pizz', 'contrabassPizz');
    const cello = s.part(s.bus('soloCello', { gain: -5, pan: 0.1, reverb: 0.38 }), 'soloCello');
    const violin = s.part(s.bus('soloViolin', { gain: -7, pan: -0.15, reverb: 0.4 }), 'soloViolin');
    const harp = s.part(s.bus('harp', { gain: -5, pan: -0.3, reverb: 0.35 }), 'harp');
    const cel = s.part(s.bus('celesta', { gain: -9, pan: 0.3, reverb: 0.4, delay: 0.15 }), 'celesta');
    const glock = s.part(s.bus('glock', { gain: -14, pan: 0.2, reverb: 0.45 }), 'glockenspiel');
    const mar = s.part(s.bus('marimba', { gain: -6, pan: -0.1, reverb: 0.25 }), 'marimba');
    const vib = s.part(s.bus('vibes', { gain: -8, pan: 0.15, reverb: 0.35 }), 'vibraphone', { motor: 0.5 });
    const horn = s.part(s.bus('horns', { gain: -7, pan: -0.1, reverb: 0.45 }), 'warmHorn');
    const flute = s.part(s.bus('flutes', { gain: -9, pan: 0.2, reverb: 0.45 }), 'flutePad');
    const choir = s.part(s.bus('choir', { gain: -8, reverb: 0.5, width: 1.1 }), 'choirPad', { vowel: 'ooh' });
    const sub = s.part(s.bus('sub', { gain: -10 }), 'subBass');
    const timp = s.part(s.bus('perc', { gain: -9, reverb: 0.3 }), 'timpani');
    const drum = s.part('perc', 'lowDrum');
    const heart = s.part(s.bus('pulse', { gain: -6, reverb: 0.08 }), 'heartbeat');
    const cym = s.part(s.bus('fx', { gain: -10, reverb: 0.4 }), 'cymbalSwell');
    const rise = s.part('fx', 'riser');

    const dm = scale('D', 'minor', 4);

    // bars 1-4: felt piano alone, with pedal
    s.section('piano', B(1), B(5), 'gentle');
    piano.pedal(B(1), B(3)).pedal(B(3), B(5));
    piano.play(B(1), 'p D3:1 A3 F4 A4 | E5:2 D5:1 F4 | mp Bb2:1 F3 D4 F4 | A4:2 G4:1.5 F4:.5', { shape: 'arch' });
    piano.chord(B(4, 4.5), 0.5, ['C#4', 'E4'], 0.35, { tag: 'tension' });

    // bars 5-8: string sections, long swells, sordino violins
    s.section('strings', B(5), B(9), 'gentle');
    vln.note(B(5), 8, 'F5', 0.6, { expr: 'swell', sordino: true });
    vln.note(B(7), 8, 'A5', 0.7, { expr: 'swell' });
    vla.play(B(5), 'A4:4 Bb4:4 A4:4 G4:4', { vel: 0.55, legato: true, expr: 'hairpin' });
    vc.play(B(5), 'D3:4 G3:4 F3:4 E3:4', { vel: 0.6, legato: true, expr: 'hairpin' });
    cb.play(B(5), 'D2:8 A1:8', { vel: 0.55, expr: 'swell' });

    // bars 9-10: solo cello melody with portamento, 11-12 solo violin
    s.section('solos', B(9), B(13), 'gentle');
    cello.play(B(9), 'mf D3:1.5 F3:.5 A3:1 D4:1 | C#4:1.5! D4:.5 E4:1 A3:1', { legato: true, shape: 'arch' });
    violin.play(B(11), 'mp A4:1 D5:1 F5:1.5 E5:.5 | Eb5:1! D5:1 A4:2', { legato: true, expr: 'swell' });
    piano.pedal(B(9), B(11)).pedal(B(11), B(13));
    piano.arp(B(9), chord('Dm', 3), 1, { vel: 0.3, dur: 2 });
    piano.arp(B(11), chord('Gm', 2), 1, { vel: 0.3, dur: 2 });

    // bars 13-14: harp, celesta, glockenspiel; 15-16 marimba, vibraphone, pizzicato
    s.section('plucks', B(13), B(17), 'gentle');
    harp.arp(B(13), dm.degs([1, 3, 5, 8, 10, 12, 15, 12]), 0.5, { vel: 0.6, shape: 'arch' });
    harp.chord(B(14), 4, chord('Bbmaj7', 3), 0.6, { strum: 0.045 });
    cel.play(B(13), 'p A5:.5 D6 F6 A6 | E6:1 D6:1 | F6:.5 E6 D6 A5 | D6:2', {});
    glock.play(B(14, 3), 'pp D7:1 A6:1', {});
    mar.play(B(15), 'mp D4:.5 F4 A4 D5 A4 F4 D4 A3', { shape: 'arch' });
    vib.chord(B(15), 4, chord('Dm9', 3).slice(1), 0.5, { strum: 0.03 });
    pizz.play(B(16), "mf D4:.5 A4 D5 A4 | F4 A4 D5:1", {});
    cbPizz.play(B(15), 'mf D2:1 A2 D2 A1 | D2 F2 A2 D2', {});

    // bars 17-20: horn, flute, choir, sub
    s.section('winds', B(17), B(21), 'gentle');
    horn.play(B(17), 'mp D3:2 A3:2 | mf Bb3:3 A3:1 | F3:4', { legato: true, expr: 'swell' });
    horn.chord(B(20), 4, ['D3', 'A3', 'F4'], 0.55, { expr: 'cresc' });
    flute.play(B(17, 3), 'p A5:2 | D6:2 C6:1 A5:1 | F5:4', { legato: true });
    choir.chord(B(19), 8, ['D3', 'A3', 'D4', 'F4', 'A4'], 0.6, { expr: 'swell' });
    sub.play(B(17), 'D2:8 Bb1:4 A1:4', { vel: 0.5 });

    // bars 21-24: tension. tremolo cluster, heartbeat, timpani roll, drum, cymbal swell, riser, reverse piano
    s.section('tension', B(21), B(25), 'tension');
    trem.chord(B(21), 12, ['D5', 'Eb5'], 0.5, { expr: 'cresc', tag: 'tension' });
    trem.note(B(22), 8, 'A5', 0.5, { expr: 'cresc' });
    for (let bar = 21; bar <= 23; bar++) { heart.hit(B(bar), 1, 0.7); heart.hit(B(bar, 3), 1, 0.6); }
    timp.note(B(21), 2, 'D2', 0.6);
    timp.roll(B(23), 4, 'A2', { from: 0.2, to: 0.85 });
    timp.note(B(24), 2, 'D2', 0.95);
    drum.hit(B(24), 2, 0.9);
    cym.hit(B(23), 4, 0.8);
    rise.hit(B(23, 3), 2, 0.5);
    piano.reverse(B(24), 3, 'D4', 0.7);
    piano.chord(B(24), 4, ['D2', 'D3', 'A3', 'D4'], 0.8, { ring: 4 });
    s.bus('violins').automate('gain', [[B(21), -3], [B(24), 0]]);

    s.length(B(25));
  },
};
