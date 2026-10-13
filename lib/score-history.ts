import type { ScoreHistoryEntry } from "./types";

/**
 * Score history (Wave 3, backlog #4) — pure helpers for the additive
 * `scoreHistory` array in `hirecraft-state-v1`. Entries are appended
 * oldest → newest; the list is capped at the most recent MAX entries.
 * All logic lives here so it is unit-testable without React; the store
 * holds the state and calls these helpers.
 */
export const MAX_SCORE_HISTORY = 30;

/**
 * Validate persisted history on load. Legacy blobs have no key → `[]`.
 * Malformed entries are dropped (non-finite `at`/`total` or non-string
 * `grade`/`jobBasis`); a corrupt value can never crash load or render.
 */
export function sanitizeScoreHistory(raw: unknown): ScoreHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: ScoreHistoryEntry[] = [];
  for (const e of raw) {
    if (!e || typeof e !== "object") continue;
    const x = e as Partial<ScoreHistoryEntry>;
    if (typeof x.at !== "number" || !Number.isFinite(x.at)) continue;
    if (typeof x.total !== "number" || !Number.isFinite(x.total)) continue;
    if (typeof x.grade !== "string" || !x.grade) continue;
    if (typeof x.jobBasis !== "string") continue;
    out.push({ at: x.at, total: x.total, grade: x.grade, jobBasis: x.jobBasis });
  }
  return out.slice(-MAX_SCORE_HISTORY);
}

/**
 * Append an entry, enforcing the cap (most recent kept). An entry whose
 * total is identical to the immediately previous entry is NOT appended
 * (returns the same list) — this is the dedupe that keeps render /
 * navigation cycles from spamming the history.
 */
export function appendScoreHistory(
  list: ScoreHistoryEntry[],
  entry: ScoreHistoryEntry
): ScoreHistoryEntry[] {
  const last = list[list.length - 1];
  if (last && last.total === entry.total) return list;
  return [...list, entry].slice(-MAX_SCORE_HISTORY);
}

/** Short label of what a score was judged against. */
export function scoreJobBasis(targetTitle: string, company: string, jobText: string): string {
  if (!jobText.trim()) return "General";
  const parts = [targetTitle.trim(), company.trim()].filter(Boolean);
  return parts.length ? parts.join(" — ") : "Job posting";
}
