import type { JobPosting } from "./jobs";
import { normalizeLocation } from "./jobs";

/**
 * Adzuna — the one US-general job source (Wave 5, backlog #9).
 *
 * Env-gated and dark until credentials exist, following the USAJobs
 * pattern in app/api/jobs/route.ts exactly: when ADZUNA_APP_ID or
 * ADZUNA_APP_KEY is unset, fetchAdzuna returns [] and performs NO
 * network call. Adzuna's free developer tier passes credentials as
 * query params (app_id + app_key) against the US search endpoint.
 *
 * Extracted from the route so the gate and the normalizer are
 * headlessly testable (the route module can't be imported outside
 * Next); the route imports fetchAdzuna and passes its own fetchJson.
 */

export function adzunaEnabled(): boolean {
  return Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function displayName(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") return String((v as Record<string, unknown>).display_name ?? "");
  return "";
}

/** Pure: an Adzuna search response → JobPosting[]. Tolerates missing
 *  fields (no company/location/date → ""), never throws. */
export function normalizeAdzunaResults(j: unknown): JobPosting[] {
  const results = (j as { results?: Record<string, unknown>[] })?.results ?? [];
  if (!Array.isArray(results)) return [];
  return results.slice(0, 25).map((d) => ({
    id: `adzuna-${String(d.id ?? d.redirect_url ?? "")}`,
    source: "Adzuna",
    title: String(d.title ?? ""),
    company: displayName(d.company),
    location: normalizeLocation(displayName(d.location)),
    url: String(d.redirect_url ?? ""),
    postedAt: String(d.created ?? ""),
    description: stripHtml(String(d.description ?? "")).slice(0, 1500),
  }));
}

export async function fetchAdzuna(
  q: string,
  location: string,
  fetchJson: (url: string) => Promise<unknown>
): Promise<JobPosting[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];
  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    what: q,
    results_per_page: "25",
    "content-type": "application/json",
  });
  // Adzuna's `where` is a place name; "Remote" is a work mode, not a
  // place — the route's own location filter keeps remote postings.
  if (location && !/remote/i.test(location)) params.set("where", location);
  const j = await fetchJson(`https://api.adzuna.com/v1/api/jobs/us/search/1?${params}`);
  return normalizeAdzunaResults(j);
}
