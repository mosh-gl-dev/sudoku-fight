import { useEffect, useState } from 'react';

import type { ConnectionModel, OpponentReconnectingModel } from './connectionModel';

/**
 * How long the opponent's freeze shows its time-up state ("הזמן נגמר · <name> לא חזר · בודקים מול השרת…",
 * the ring at 0) before "the opponent left" may replace it.
 */
export const TIME_UP_HOLD_MS = 800;

/** The ring's last whole second: a verdict that comes while it shows "1" is the grace running out. */
const LAST_SECOND_MS = 1000;

interface TimeUp {
  model: OpponentReconnectingModel;
  done: boolean;
}

/**
 * The opponent's countdown ends at 0 and "הזמן נגמר · בודקים מול השרת…" on every phone (STAGE7 test 3, QA
 * checklist row 25), as my own does (SelfReconnecting), not at "1". The server ends the grace at graceEndsAt
 * itself (spec §16.2), so on a good network its verdict lands while the ring still shows "1" (whole seconds,
 * rounded up) and the time-up state never got a frame. Here the model the layer draws keeps the freeze in its
 * time-up state for TIME_UP_HOLD_MS from the moment it first shows, before "the opponent left" (which keeps
 * the results waiting for its "לתוצאות" anyway). A verdict that comes later than that shows at once; a freeze
 * that ends before its last second (not the time running out) is not held; nor is a game opened over already.
 */
export function useTimeUpHold(model: ConnectionModel): ConnectionModel {
  // The freeze's last frame, and its time-up state once it shows (kept as derived state: no frame between).
  const [last, setLast] = useState<OpponentReconnectingModel | null>(null);
  const [timeUp, setTimeUp] = useState<TimeUp | null>(null);

  if (model.kind === 'opponentReconnecting') {
    if (model !== last) setLast(model);
    if (model.expired) {
      if (timeUp?.model.playerId !== model.playerId) setTimeUp({ model, done: false });
    } else if (timeUp !== null) setTimeUp(null);
  } else if (model.kind === 'opponentLeft') {
    if (
      timeUp === null &&
      last !== null &&
      last.playerId === model.playerId &&
      last.remainingMs <= LAST_SECOND_MS
    )
      setTimeUp({ model: { ...last, secondsLeft: 0, remainingMs: 0, expired: true }, done: false });
  } else {
    if (last !== null) setLast(null);
    if (timeUp !== null) setTimeUp(null);
  }

  useEffect(() => {
    if (timeUp === null || timeUp.done) return;
    const timer = setTimeout(
      () => setTimeUp((held) => (held === null ? null : { ...held, done: true })),
      TIME_UP_HOLD_MS,
    );
    return () => clearTimeout(timer);
  }, [timeUp]);

  const holding =
    model.kind === 'opponentLeft' &&
    timeUp !== null &&
    !timeUp.done &&
    timeUp.model.playerId === model.playerId;
  return holding ? timeUp.model : model;
}
