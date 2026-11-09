/**
 * The small error code on a connection error (spec §16.3: "קוד שגיאה קטן לצורך תמיכה"), from any of the app's
 * request errors: one that already has a support code (OnlineError, MatchmakingFailure), or one with a `code`
 * and an HTTP `status` (ProgressApiError, HistoryApiError, AccountApiError): "unavailable-503", "network".
 * Only the app's own enumerated codes go in it, never a message, a token or a URL. Null when there is none.
 */
export function supportCodeOf(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const e = error as { supportCode?: unknown; code?: unknown; status?: unknown };
  if (typeof e.supportCode === 'string' && SAFE.test(e.supportCode)) return e.supportCode;
  if (typeof e.code !== 'string' || !SAFE.test(e.code)) return null;
  const status = typeof e.status === 'number' || typeof e.status === 'string' ? String(e.status) : '';
  return status && SAFE.test(status) ? `${e.code}-${status}` : e.code;
}

/** A code is a short word: letters, digits, "-", "_" and "/" ("auth/network-request-failed"). */
const SAFE = /^[\w/-]{1,64}$/;

/**
 * The small support code as the error screens show it (spec §16.3; design Connection-Error: "ERR_SOCKET_TIMEOUT ·
 * 504"): plainly a code, not an English word inside the Hebrew text (connection-error-english-chip): the game's
 * connection error, the match error and StateView's chip. The app's
 * code in upper snake case after "ERR_", and the SDK's status, if any, after a middle dot: 'network' →
 * "ERR_NETWORK", 'notFound-522' → "ERR_NOT_FOUND · 522", 'tokenExpired' → "ERR_TOKEN_EXPIRED".
 */
export function supportCodeLabel(code: string): string {
  const split = /^(.+?)-(\d+)$/.exec(code);
  const name = split ? split[1]! : code;
  const status = split ? split[2]! : null;
  const snake = name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  const word = snake.startsWith('ERR_') ? snake : `ERR_${snake || 'UNKNOWN'}`;
  return status === null ? word : `${word} · ${status}`;
}
