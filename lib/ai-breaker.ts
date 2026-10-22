/**
 * Circuit breaker for the AI provider (RR-43, 2026-10-22).
 *
 * Problem: when the provider is down or throttling (free-tier 503 storms,
 * multi-minute "unreachable" stretches — observed repeatedly Oct 2026),
 * every /api/ai request re-ran the full model/retry chain (up to the 42s
 * budget) before degrading to the built-in engine. During an outage, each
 * user action paid that full wait for an answer that was never coming.
 *
 * Semantics (deliberately simple and predictable):
 *  - The breaker trips ONLY when the whole chain is exhausted — every
 *    model and attempt failed with retryable errors (503/429/404 walk) or
 *    network failures — or when a full health probe fails. An immediate
 *    non-retryable error (e.g. a 400) never trips it: that's a request
 *    problem, not provider capacity.
 *  - While open (AI_BREAKER_OPEN_MS), /api/ai skips the chain and returns
 *    the built-in fallback result immediately, and /api/ai-health reports
 *    down without fetching. The user-facing contract is unchanged — same
 *    `source:"fallback"` body and the same honest note.
 *  - Half-open is implicit: once the window lapses, the next request runs
 *    the chain as the recovery probe. Success closes the breaker
 *    (recordAiSuccess); exhaustion re-opens it for a fresh window.
 *
 * State is per server instance (module scope), like the rate limiter and
 * the health cache: on Vercel each instance learns within one request,
 * and the worst case on a cold instance is the pre-RR-43 behavior.
 */

export const AI_BREAKER_OPEN_MS = 60_000;

let downUntil = 0;

/** True while the provider should be treated as down. */
export function aiBreakerOpen(now: number = Date.now()): boolean {
  return now < downUntil;
}

/** Milliseconds until the breaker half-opens (0 when closed). */
export function aiBreakerRemainingMs(now: number = Date.now()): number {
  return Math.max(0, downUntil - now);
}

/** A live AI call succeeded — close the breaker immediately. */
export function recordAiSuccess(): void {
  downUntil = 0;
}

/** The chain (or a full health probe) exhausted — open the breaker. */
export function recordAiFailure(now: number = Date.now(), openMs: number = AI_BREAKER_OPEN_MS): void {
  downUntil = now + openMs;
}

/** Test/reset hook. */
export function resetAiBreaker(): void {
  downUntil = 0;
}
