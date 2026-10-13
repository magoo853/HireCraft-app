import type { LinkedInResult } from "./types";

/**
 * Persistence guard for the last generated LinkedIn result (Wave 3,
 * backlog #11) — an additive store field in `hirecraft-state-v1`.
 * Pure and typeof-guarded so it is unit-testable without React: a
 * missing/legacy value → null; a salvageable object is coerced field
 * by field (fields optional-safe) and can never crash load or render.
 */
export function sanitizeLinkedInResult(raw: unknown): LinkedInResult | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<LinkedInResult>;
  const strings = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  const bullets = Array.isArray(r.polishedBullets)
    ? r.polishedBullets
        .filter((b): b is { original: string; polished: string } => !!b && typeof b === "object")
        .map((b) => ({
          original: typeof b.original === "string" ? b.original : "",
          polished: typeof b.polished === "string" ? b.polished : "",
        }))
    : [];
  return {
    headlines: strings(r.headlines),
    about: typeof r.about === "string" ? r.about : "",
    polishedBullets: bullets,
    skillsGap: strings(r.skillsGap),
    tip: typeof r.tip === "string" ? r.tip : "",
    ...(Array.isArray(r.appliedFeedback) ? { appliedFeedback: strings(r.appliedFeedback) } : {}),
  };
}

/** True when a (sanitized) result carries anything worth rendering. */
export function hasLinkedInContent(r: LinkedInResult | null): boolean {
  return !!r && (r.headlines.length > 0 || r.about.trim().length > 0 || r.polishedBullets.length > 0);
}
