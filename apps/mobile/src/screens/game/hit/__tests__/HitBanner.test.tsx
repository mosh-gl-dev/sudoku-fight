import { ManualClock } from '@sudoku-fight/engine';
import { act, render, renderHook, screen } from '@testing-library/react-native';
import { makeMutable } from 'react-native-reanimated';

import { type HitTime, useHitClock } from '../../../../components/interference/hitClock';
import { HitBanner, type HitBannerProps, ringSeconds } from '../HitBanner';

// Skia draws natively; under Jest a canvas is a plain view.
jest.mock(
  '@shopify/react-native-skia',
  () => jest.requireActual('../../../../components/interference/testing/skiaMock').skiaModule,
);

const hidden = { includeHiddenElements: true };
const number = () => screen.getByTestId('hit-banner-ring-seconds', hidden);

const banner = (over: Partial<HitBannerProps> & Pick<HitBannerProps, 'elapsed'>) => (
  <HitBanner
    title="NinaVolt שלח/ה לך זיקוקים!"
    subtitle="המשחק ממשיך"
    seconds={5}
    label="NinaVolt שלח/ה לך זיקוקים!"
    fromColorIndex={1}
    totalMs={5000}
    reduce={false}
    top={0}
    {...over}
  />
);

describe('ringSeconds: the ring’s number from the hit’s own clock (QA loop 8, interference-hit-banner)', () => {
  it('counts whole seconds left, rounded up, as the arc drains', () => {
    expect(ringSeconds(0, 5000, 5)).toBe(5);
    expect(ringSeconds(999, 5000, 5)).toBe(5);
    expect(ringSeconds(1000, 5000, 5)).toBe(4);
    expect(ringSeconds(4001, 5000, 5)).toBe(1);
  });

  it('does not wait for the screen: a render that comes late (a move’s work) still shows the clock’s second', () => {
    // The screen last rendered with 2 s left; the hit's clock is 4.2 s in.
    expect(ringSeconds(4200, 5000, 2)).toBe(1);
  });

  it('never shows more than the screen: a hit that began part-way, before its clock caught up', () => {
    expect(ringSeconds(0, 5000, 3)).toBe(3);
  });

  it('at the end (the clock stands at 5 s through the fade-out) it keeps the screen’s last second, never 0', () => {
    expect(ringSeconds(5000, 5000, 1)).toBe(1);
  });
});

describe('HitBanner: the ring’s number turns with the arc, on the UI thread', () => {
  it('shows the clock’s second even while the screen’s render is behind', async () => {
    const elapsed = makeMutable(0);
    await render(banner({ elapsed, seconds: 5 }));
    expect(number()).toHaveAnimatedProps({ text: '5' });
    // A move's work holds the screen's tick back: it still says 2, the hit's clock is at 4.2 s.
    await act(async () => elapsed.set(4200));
    expect(number()).toHaveAnimatedProps({ text: '1' });
  });

  it('follows the screen’s seconds where the hit’s clock has not moved (frozen, or part-way in)', async () => {
    const elapsed = makeMutable(0);
    const { rerender } = await render(banner({ elapsed, seconds: 3 }));
    expect(number()).toHaveAnimatedProps({ text: '3' });
    await rerender(banner({ elapsed, seconds: 2 }));
    expect(number()).toHaveAnimatedProps({ text: '2' });
  });

  it('the next hit’s clock starts from 0, not from where the last one ended', async () => {
    const clock = new ManualClock(10_000);
    // A hit that began 3 s ago: its clock starts there.
    const first: HitTime = { endsAt: 12_000, totalMs: 5000 };
    const { result, rerender } = await renderHook(
      ({ hit }: { hit: HitTime | null }) => useHitClock(hit, clock),
      {
        initialProps: { hit: first },
      },
    );
    expect(result.current.get()).toBe(3000);
    // It ends: the next hit's first frames must not read 3 s in (nor its end), or the ring and the banner
    // would start as if it were nearly over.
    await rerender({ hit: null });
    expect(result.current.get()).toBe(0);
  });

  it('is hidden from screen readers: the banner’s label says the time left', async () => {
    await render(banner({ elapsed: makeMutable(0) }));
    expect(screen.queryByTestId('hit-banner-ring-seconds')).toBeNull();
    expect(number()).toHaveProp('editable', false);
  });
});
