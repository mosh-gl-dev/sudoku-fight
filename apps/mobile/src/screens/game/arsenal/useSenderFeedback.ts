import type { InterferenceKind } from '@sudoku-fight/engine';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useToast } from '../../../components/ui';
import { track } from '../../../services/analytics';
import { senderText } from './wording';

export interface InterferenceSent {
  kind: InterferenceKind;
  /** The target's display name. */
  targetName: string;
  /** What it cost me (the event's `cost`). */
  cost: number;
  /**
   * Where the chip goes, from the top of the window: under the cards (motion.md `sender.toast`, "under my
   * card"). QA loop 8: at the top it covered both avatars for its 2 s, so my own wink (`hitSent`) never showed,
   * nor my score paying for it. Unknown (the cards not laid out yet): the usual top.
   */
  top?: number;
}

/**
 * The sender's chip takes two lines at most (QA loop 9): it sits under the cards, where two lines at font 1.3
 * still end above the board; a toast elsewhere takes every line its words need. Its tail is the target's name,
 * which is what shortens ("…") when even two are not enough, never the kind's words.
 */
export const SENDER_TOAST_LINES = 2;

/**
 * What the sender sees once an interference of theirs has started (spec §7.4: "זיקוקים ← NinaVolt", while the
 * card shows the cost leaving the score). The info toast of components.md §15.1, made for it: 2 s, a bolt in
 * the muted colour, said to screen readers, never over the board. Also reports `interference_sent` (spec
 * §22).
 *
 * Call it from the host's confirmation, not from the second tap: the screen's `interference` match effect with
 * `byMe` (matchEffectsOf), so a launch the host refused never says it was sent (the screen's "not sent" warning
 * says so instead, D45).
 */
export function useSenderFeedback(): (sent: InterferenceSent) => void {
  const { t } = useTranslation('game');
  return useCallback(
    ({ kind, targetName, cost, top }: InterferenceSent) => {
      useToast.getState().show({
        variant: 'info',
        message: senderText(kind, targetName, t),
        maxLines: SENDER_TOAST_LINES,
        ...(top === undefined ? null : { top }),
      });
      track('interference_sent', { kind, cost });
    },
    [t],
  );
}
