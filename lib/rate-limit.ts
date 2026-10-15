/**
 * In-memory fixed-window rate limiter (S-batch, log #17).
 *
 * Deliberately the smallest honest version: counters live in this
 * serverless instance's memory, so the limit is per-instance — a speed
 * bump against casual abuse, not a global limiter. The durable fix is
 * a shared store (e.g. Upstash) or a platform WAF rule.
 *
 * Pure and clock-injectable so it is headlessly testable.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

interface WindowState {
  windowStart: number;
  count: number;
}

const windows = new Map<string, WindowState>();

export const AI_RATE_LIMIT = { limit: 30, windowMs: 10 * 60 * 1000 } as const;

/**
 * /api/extract throttle (RR-07): document parsing is heavier per request
 * than an AI call (up to 10 MB uploads), so the limit is tighter than the
 * AI route's — 20 requests / 10 minutes / IP, same fixed-window idiom.
 */
export const EXTRACT_RATE_LIMIT = { limit: 20, windowMs: 10 * 60 * 1000 } as const;

/**
 * /api/fetch-job throttle (RR-32): the route fetches arbitrary public
 * URLs server-side, so it gets the AI route's ceiling — 30 requests /
 * 10 minutes / IP, same fixed-window idiom.
 */
export const FETCH_JOB_RATE_LIMIT = { limit: 30, windowMs: 10 * 60 * 1000 } as const;

/**
 * /api/jobs throttle (RR-32): each call fans out to up to five job
 * sources, so the ceiling is a notch above the AI route's — 60 requests
 * / 10 minutes / IP, same fixed-window idiom. (Responses are also
 * CDN-cached s-maxage=600, which absorbs most repeat traffic first.)
 */
export const JOBS_RATE_LIMIT = { limit: 60, windowMs: 10 * 60 * 1000 } as const;

/**
 * Record one hit for `key` and report whether it is within the limit.
 * Fixed window: the window starts at the first hit and resets whole.
 */
export function checkRateLimit(
  key: string,
  limit: number = AI_RATE_LIMIT.limit,
  windowMs: number = AI_RATE_LIMIT.windowMs,
  now: number = Date.now()
): RateLimitResult {
  const state = windows.get(key);
  if (!state || now - state.windowStart >= windowMs) {
    windows.set(key, { windowStart: now, count: 1 });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  state.count += 1;
  if (state.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((state.windowStart + windowMs - now) / 1000)),
    };
  }
  return { allowed: true, remaining: limit - state.count, retryAfterSeconds: 0 };
}

/** Client IP for throttling: first hop of x-forwarded-for, else a shared bucket. */
export function clientIpFromHeaders(getHeader: (name: string) => string | null): string {
  const xff = getHeader("x-forwarded-for");
  const first = xff?.split(",")[0]?.trim();
  return first || getHeader("x-real-ip")?.trim() || "unknown";
}

/** Test helper: forget all counters. */
export function resetRateLimits(): void {
  windows.clear();
}
