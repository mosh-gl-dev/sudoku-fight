import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Whether a screen reader (TalkBack, VoiceOver) is on, and stays in step when it is turned on or off. False until
 * the phone has answered (a moment after mount). Used to keep the screen from moving by itself under the reader's
 * focus: the results' glide to the rating (its count is a visual nicety; the reader reads the final value).
 */
export function useScreenReaderOn(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isScreenReaderEnabled().then(
      (value) => {
        if (live) setOn(value);
      },
      () => undefined,
    );
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', (value: boolean) => {
      if (live) setOn(value);
    });
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return on;
}
