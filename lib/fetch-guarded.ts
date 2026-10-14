import { isBlockedHost } from "./url-guard";

/**
 * Guarded fetch with manual redirect handling for /api/fetch-job
 * (RR-07). fetch's default redirect following never re-checks where a
 * redirect lands, so a public job URL could bounce the server to a
 * private/loopback address. Here every hop — the initial URL and every
 * redirect Location (relative Locations resolved against the current
 * URL) — is re-checked against lib/url-guard before it is fetched.
 *
 * Honest residual (unchanged): the guard checks the literal host only.
 * A public hostname that RESOLVES to a private address (DNS rebinding)
 * is not stopped — resolution-time checking is out of scope.
 */

export const MAX_REDIRECTS = 5;

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/** Minimal response shape this helper needs (the real fetch Response satisfies it). */
export interface FetchLikeResponse {
  status: number;
  ok: boolean;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
}

export type FetchLike = (
  url: string,
  init: {
    redirect: "manual";
    method?: string;
    headers?: Record<string, string>;
    signal?: AbortSignal;
  }
) => Promise<FetchLikeResponse>;

/** Thrown when the initial URL or any redirect hop points at a blocked host. */
export class BlockedHostError extends Error {
  readonly blockedUrl: string;
  constructor(url: string) {
    super(`Blocked host in URL: ${url}`);
    this.name = "BlockedHostError";
    this.blockedUrl = url;
  }
}

/** Thrown when the redirect chain exceeds MAX_REDIRECTS hops. */
export class TooManyRedirectsError extends Error {
  constructor(max: number) {
    super(`Too many redirects (more than ${max})`);
    this.name = "TooManyRedirectsError";
  }
}

export interface GuardedFetchResult {
  response: FetchLikeResponse;
  finalUrl: string;
  hops: number;
}

const defaultFetch: FetchLike = (url, init) => fetch(url, init) as Promise<FetchLikeResponse>;

/**
 * Fetch `initialUrl`, following at most `maxRedirects` redirects by
 * hand and re-running the SSRF guard on every hop. A blocked hop throws
 * BlockedHostError BEFORE that URL is ever fetched.
 */
export async function fetchWithGuardedRedirects(
  initialUrl: string | URL,
  options: {
    fetchImpl?: FetchLike;
    maxRedirects?: number;
    headers?: Record<string, string>;
    signal?: AbortSignal;
  } = {}
): Promise<GuardedFetchResult> {
  const fetchImpl = options.fetchImpl ?? defaultFetch;
  const maxRedirects = options.maxRedirects ?? MAX_REDIRECTS;
  let current = new URL(initialUrl.toString());
  if (current.protocol !== "http:" && current.protocol !== "https:") {
    throw new BlockedHostError(current.toString());
  }
  if (isBlockedHost(current.hostname)) throw new BlockedHostError(current.toString());

  let hops = 0;
  for (;;) {
    const res = await fetchImpl(current.toString(), {
      redirect: "manual",
      headers: options.headers,
      signal: options.signal,
    });
    if (!REDIRECT_STATUSES.has(res.status)) {
      return { response: res, finalUrl: current.toString(), hops };
    }
    const location = res.headers.get("location");
    if (!location) return { response: res, finalUrl: current.toString(), hops };
    if (hops >= maxRedirects) throw new TooManyRedirectsError(maxRedirects);
    const next = new URL(location, current);
    if (next.protocol !== "http:" && next.protocol !== "https:") {
      throw new BlockedHostError(next.toString());
    }
    if (isBlockedHost(next.hostname)) throw new BlockedHostError(next.toString());
    current = next;
    hops += 1;
  }
}
