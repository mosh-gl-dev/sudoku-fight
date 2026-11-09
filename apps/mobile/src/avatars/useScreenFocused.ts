import { NavigationContext } from 'expo-router/react-navigation';
import { useCallback, useContext, useSyncExternalStore } from 'react';

/**
 * Whether the screen this is drawn on is the one shown: false while another screen covers it (Home under the
 * game stays mounted in the stack). Outside a navigator (a test, a view on its own) it is always true.
 *
 * expo-router's useIsFocused throws outside a navigator; this reads the screen's navigation object if there is
 * one, as useIsFocused does.
 *
 * `enabled` false: it listens to nothing and says true, so a change of screen never renders the caller (Home once
 * its entrance has played: a whole render of Home in each change of screen from it and back, B14).
 */
export function useScreenFocused(enabled = true): boolean {
  const navigation = useContext(NavigationContext);
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!navigation || !enabled) return () => {};
      const offFocus = navigation.addListener('focus', onChange);
      const offBlur = navigation.addListener('blur', onChange);
      return () => {
        offFocus();
        offBlur();
      };
    },
    [navigation, enabled],
  );
  const focused = useCallback(() => !enabled || (navigation?.isFocused() ?? true), [navigation, enabled]);
  return useSyncExternalStore(subscribe, focused, focused);
}
