import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react-native';

import { CLOCK_GLYPHS } from '../components/clock/clockGlyphs.generated';
import { cardModel } from '../components/player';
import { NOW, twoPlayerView } from '../components/player/__fixtures__/gameView';
import { CLOCK_LABEL_STEP_S, clockLabelSeconds, labelSecondsLeft } from '../components/player/format';
import i18n from '../i18n';
import { SoloHud } from '../screens/game/SoloHud';
import { useSettings } from '../state/settings';

/**
 * Q1 (QA run #2): uiautomator never found the game screens idle ("could not get idle state"), because the clock
 * changed every second: its accessibility label, and its text (on Android a text view's new text is an event too).
 * A screen reader gains nothing from a change event a second either (spec §22: labels for screen readers, not a
 * stream of them). So a running clock's label changes in steps of CLOCK_LABEL_STEP_S, and the solo practice's
 * clock is drawn as paths (ClockDigits), not text.
 */

describe('clockLabelSeconds', () => {
  it('time gone: down to the step', () => {
    expect(CLOCK_LABEL_STEP_S).toBe(5);
    expect([0, 4999, 5000, 14_200, 29_999].map((ms) => clockLabelSeconds(ms, 'elapsed'))).toEqual([
      0, 0, 5, 10, 25,
    ]);
    expect(clockLabelSeconds(-300, 'elapsed')).toBe(0);
  });

  it('time left: down to the step, so never more than is left; exact in its last step, never "0" while some is left', () => {
    // As the clock shows it (6.2 s left shows 7), then down to the step: 7 is read as 5, not 10.
    expect([30_000, 26_100, 25_000, 9_000, 6200].map((ms) => clockLabelSeconds(ms, 'left'))).toEqual([
      30, 25, 25, 5, 5,
    ]);
    expect([5000, 4100, 900, 0].map((ms) => clockLabelSeconds(ms, 'left'))).toEqual([5, 5, 1, 0]);
    expect([18, 12, 10, 9, 5, 3, 1, 0].map(labelSecondsLeft)).toEqual([15, 10, 10, 5, 5, 3, 1, 0]);
  });

  it('a whole stage changes its label every 5 s, not every second', () => {
    const labels = new Set<number>();
    for (let ms = 0; ms <= 30_000; ms += 250) labels.add(clockLabelSeconds(ms, 'elapsed'));
    expect(labels.size).toBe(7); // 0, 5, …, 30, against 31 a second
  });
});

describe('the stages’ clocks label in steps (levels HUDs)', () => {
  const dir = join(__dirname, '..', 'screens', 'levels', 'hud');
  const files = readdirSync(dir).filter((name) => /\.tsx$/.test(name));

  // Its seconds now (`count` / `s`); a stage's limit (`limit: secondsOf(…)`) never changes.
  it.each(files)('%s: no label reads a running clock’s whole seconds', (name) => {
    const code = readFileSync(join(dir, name), 'utf8');
    const labels = [
      ...code.matchAll(/accessibilityLabel=\{t\(([\s\S]*?)\)\}/g),
      ...code.matchAll(/ringLabel = t\(([\s\S]*?)\);/g),
    ].map((m) => m[1]!);
    for (const label of labels) {
      const ticking = /\b(?:count|s): secondsOf\(/.test(label);
      expect({ name, label, ticking }).toEqual({ name, label, ticking: false });
    }
  });

  it('the scan finds the clocks it guards', () => {
    const code = files.map((name) => readFileSync(join(dir, name), 'utf8')).join('\n');
    expect(code.match(/clockLabelSeconds\(/g)?.length ?? 0).toBeGreaterThanOrEqual(8);
  });
});

describe('the solo practice’s time (SoloHud)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('he');
    useSettings.setState({ reduceMotion: 'off' });
  });

  const hud = (elapsedMs: number) => (
    <SoloHud
      card={cardModel(twoPlayerView(), 'moshe', 0, NOW)}
      delta={null}
      gameType="fast"
      stats={{ elapsedMs, filled: 30, total: 81, best: { points: 5, cell: 'G6' } }}
      onEnd={jest.fn()}
    />
  );

  const hidden = { includeHiddenElements: true };
  type Svg = { children: { children: { props: { d: string } }[] }[] };
  /** The clock's outlines, in order (its Svg › group › paths). */
  const clockPaths = () =>
    (screen.getByTestId('solo-hud-time', hidden) as unknown as Svg).children[0]!.children.map(
      (p) => p.props.d,
    );

  it('draws the clock, not a text that changes; its label says the time in 5-second steps', async () => {
    await render(hud(192_000));
    const time = screen.getByTestId('solo-hud-time-stat');
    expect(time).toHaveProp('accessible', true);
    expect(time).toHaveProp('accessibilityLabel', 'זמן 3:10');
    // Only the caption is text; the time is paths (on Android a text view's new text is an event every second).
    expect(time).toHaveTextContent('זמן');
    expect(screen.queryByText(/\d:\d\d/, hidden)).toBeNull();
    expect(clockPaths()).toEqual(['3', ':', '1', '2'].map((c) => CLOCK_GLYPHS[c]!.d));
    // The best move keeps its own label (it changes only with a new best); the row is no single element.
    expect(screen.getByTestId('solo-hud-best-stat')).toHaveProp(
      'accessibilityLabel',
      'מהלך שיא: ⁦5⁩ נקודות ב־⁦G6⁩',
    );
    expect(screen.getByTestId('solo-hud-stats').props.accessibilityLabel).toBeUndefined();

    // A second later only the drawing changed; the label changes at the next step.
    await screen.rerender(hud(193_000));
    expect(clockPaths()[3]).toBe(CLOCK_GLYPHS['3']!.d);
    expect(screen.getByTestId('solo-hud-time-stat')).toHaveProp('accessibilityLabel', 'זמן 3:10');
    await screen.rerender(hud(195_400));
    expect(screen.getByTestId('solo-hud-time-stat')).toHaveProp('accessibilityLabel', 'זמן 3:15');
  });
});
