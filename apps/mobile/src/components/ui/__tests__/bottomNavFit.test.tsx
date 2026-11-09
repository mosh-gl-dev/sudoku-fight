import { render, screen } from '@testing-library/react-native';

import i18n from '../../../i18n';
import { space, tokens } from '../../../theme';
import { BottomNav, NAV_LABEL_FIT, NAV_TABS } from '../BottomNav';
import { expectRoom, layoutLanguages, PHONE, widthIn } from '../testing/layout';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);

/**
 * The bottom bar's labels in every language on a 360 phone (QA run #2: en-XA's labels ended in "…"; a quarter of
 * the bar is 86 dp, less than "Achievements" or "Bảng xếp hạng" take): a label too wide shrinks (NAV_LABEL_FIT)
 * instead of ending in "…". Measured bold, as the active tab draws it (VIS-10).
 */

/** A quarter of the bar: the screen less the bar's padding. */
const ITEM = (PHONE.width - 2 * space[4]) / NAV_TABS.length;

describe('the bottom bar’s labels fit their quarter (after B3)', () => {
  it('shrink rather than end in "…"', async () => {
    await i18n.changeLanguage('en');
    await render(<BottomNav active="achievements" onSelect={jest.fn()} />);
    expect(screen.getByText('Achievements')).toHaveProp('numberOfLines', 1);
    expect(screen.getByText('Achievements')).toHaveProp('adjustsFontSizeToFit', true);
    expect(screen.getByText('Home')).toHaveProp('minimumFontScale', NAV_LABEL_FIT.minimumFontScale);
    await i18n.changeLanguage('he');
  });

  it.each(layoutLanguages())('%s', async (lang) => {
    await i18n.changeLanguage(lang);
    for (const { key } of NAV_TABS) {
      const width = widthIn(lang, i18n.t(`ui:nav.tabs.${key}`), {
        fontFamily: 'Rubik_700Bold',
        fontSize: tokens.type.label.size,
      });
      expectRoom(lang, `ui:nav.tabs.${key}`, width * NAV_LABEL_FIT.minimumFontScale, ITEM);
    }
    await i18n.changeLanguage('he');
  });
});
