// First: keeps the real Reanimated in place of the router testing library's old mock (see homeTesting.tsx).
import 'react-native-reanimated';
import { screen, within } from 'expo-router/testing-library';
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { AVATAR_SIZES } from '../../../components/player/metrics';
import { setWindow, widthIn } from '../../../components/ui/testing/layout';
import { openPracticeRepo } from '../../../game/practiceRepo';
import { practiceStorageOrNull } from '../../../game/storage';
import { memoryDb } from '../../../game/testing/sqlJsDb';
import i18n from '../../../i18n';
import { useProfile } from '../../../state/profile';
import { space, text, tokens } from '../../../theme';
import { renderApp } from '../testing/homeTesting';

type Mocks = typeof import('../testing/nativeMocks');

jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated'));
jest.mock('../../../game/storage', () => jest.requireActual<Mocks>('../testing/nativeMocks').practiceStorage);
jest.mock('../../../services/analytics', () => ({ track: jest.fn() }));
jest.mock('expo-audio', () => jest.requireActual<Mocks>('../testing/nativeMocks').expoAudio);
jest.mock('expo-haptics', () => jest.requireActual<Mocks>('../testing/nativeMocks').expoHaptics);

/**
 * QA loop 7 (general-display-small-big-font): at 360 dp and font 1.3 the bot cards cut "Biscu…" and "Mr. H…"
 * beside their level chip (in Hebrew "Mr. Ho…" beside a chip in two lines), and "Think time per m…". The chip now
 * goes under the name when both don't fit one line, and a fact's label takes two lines, broken between words.
 */

const F = 1.3;
const W = 360;
const flat = (el: { props: { style?: unknown } }) =>
  (StyleSheet.flatten(el.props.style as ViewStyle & TextStyle) ?? {}) as ViewStyle & TextStyle;
const textOf = (el: { props: { children?: unknown } }) =>
  [el.props.children]
    .flat(Infinity)
    .filter((c) => typeof c === 'string')
    .join('');
const widest = (lang: string, line: string, style: TextStyle) =>
  Math.max(
    ...line
      .replace(/[⁦-⁩]/g, '')
      .trim()
      .split(/\s+/)
      .map((w) =>
        widthIn(
          lang,
          w,
          { fontFamily: style.fontFamily, fontWeight: style.fontWeight, fontSize: style.fontSize! },
          { fontScale: F },
        ),
      ),
  );

let restore: (() => Promise<void>) | null = null;
beforeEach(async () => {
  const repo = await openPracticeRepo(await memoryDb());
  jest.mocked(practiceStorageOrNull).mockImplementation(async () => repo);
  useProfile.setState({ name: null, avatarId: 'av00', country: 'IL', lastPlay: null, botLevel: null });
  restore = setWindow({ width: W, height: 780, fontScale: F });
});
afterEach(async () => {
  await restore?.();
});
afterAll(async () => {
  await i18n.changeLanguage('he');
});

describe.each(['en', 'he'] as const)('bot select at 360 dp and font 1.3 (%s)', (lang) => {
  it('every name whole on its line, the chip free to go under it; the facts’ labels wrap between words', async () => {
    await i18n.changeLanguage(lang);
    await renderApp('/bot-select?gameType=normal');
    // The card: the screen less its gutters, the card's padding and border.
    const inner = W - 2 * tokens.layout.gutterGame - 2 * space[8] - 2 * tokens.border.hairline;
    const names = inner - AVATAR_SIZES.row.frame - 2 * space[6] - 24;
    const fact = (inner - space[6]) / 2;
    for (const level of [1, 2, 3, 4, 5]) {
      const name = screen.getByTestId(`bot-${level}-name`);
      expect(flat(screen.getByTestId(`bot-${level}-name-row`))).toMatchObject({ flexWrap: 'wrap' });
      expect(name).toHaveProp('numberOfLines', 1);
      // "Mr. Hoot" whole on its line (the chip, when it does not fit beside it, wraps under it).
      const nameStyle = flat(name);
      const nameWidth = widthIn(
        lang,
        textOf(name).replace(/[⁦-⁩]/g, ''),
        { fontFamily: nameStyle.fontFamily, fontWeight: nameStyle.fontWeight, fontSize: nameStyle.fontSize! },
        { fontScale: F },
      );
      expect(nameWidth).toBeLessThanOrEqual(names);
      const think = within(screen.getByTestId(`bot-${level}-think`)).getAllByText(/\S/)[0]!;
      expect(think).toHaveProp('numberOfLines', 2);
      expect(widest(lang, textOf(think), text('micro'))).toBeLessThanOrEqual(fact);
    }
  });
});
