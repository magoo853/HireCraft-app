import type { AiResponse, RewriteResult, ScoreResult } from "./types";

/**
 * Persistence for the Rewrite tab's working set (2026-10-24, James
 * report: rewrites vanished on tab switch). Until now the result, the
 * per-bullet accept choices, the user's text edits, and the baseline
 * score snapshot were component useState in app/rewrite/page.tsx and
 * died on unmount. The session is now an additive store field in
 * `hirecraft-state-v1`, guarded by this sanitizer — pure and
 * typeof-guarded so it is unit-testable without React: a
 * missing/legacy/garbage value → null; a salvageable object is coerced
 * field by field and can never crash load or render.
 *
 * Ownership: `resumeRawHash` is the hash of the resume's rawText the
 * session was generated against. The Rewrite page refreshes it after
 * its own accepts (accepting rewrites rawText through the accept
 * flow); any other resume change — upload, sample, saved-version
 * load — makes the hash mismatch and the page drops the session, so a
 * different resume always starts the rewrite area fresh.
 */
export interface RewriteSession {
  result: AiResponse<RewriteResult[]>;
  /** Indices into result.data the user has accepted (the page's Set, serialized). */
  accepted: number[];
  /** User-edited rewrite text, keyed by result.data index (JSON object keys). */
  edits: Record<number, string>;
  /** Score snapshot taken when the result was generated — the "before" anchor. */
  baseline: { score: ScoreResult; jobText: string } | null;
  resumeRawHash: number;
}

/** FNV-1a over UTF-16 code units — tiny, deterministic, dependency-free. */
export function hashRawText(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function sanitizeRewriteItem(raw: unknown): RewriteResult | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<RewriteResult>;
  if (typeof r.original !== "string" || typeof r.rewritten !== "string") return null;
  return {
    original: r.original,
    rewritten: r.rewritten,
    why: typeof r.why === "string" ? r.why : "",
    gaps: Array.isArray(r.gaps) ? r.gaps.filter((g): g is string => typeof g === "string") : [],
    ...(typeof r.translationNote === "string" ? { translationNote: r.translationNote } : {}),
    ...(r.source === "review" || r.source === "eval" ? { source: r.source } : {}),
  };
}

function sanitizeBaseline(raw: unknown): RewriteSession["baseline"] {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as { score?: unknown; jobText?: unknown };
  if (!b.score || typeof b.score !== "object") return null;
  const s = b.score as Partial<ScoreResult>;
  // The readout reads total / grade / keywordBasis / genericTitle; a
  // score without a trustworthy total+grade is no anchor at all, so the
  // baseline drops (the result itself stays usable).
  if (typeof s.total !== "number" || !Number.isFinite(s.total) || typeof s.grade !== "string") return null;
  return {
    score: {
      ...(s as ScoreResult),
      total: s.total,
      grade: s.grade,
      keywordBasis: s.keywordBasis === "job" ? "job" : "generic",
      genericTitle: typeof s.genericTitle === "string" ? s.genericTitle : "",
    },
    jobText: typeof b.jobText === "string" ? b.jobText : "",
  };
}

export function sanitizeRewriteSession(raw: unknown): RewriteSession | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<RewriteSession>;
  // Without the ownership hash the session can't be trusted to belong
  // to the current resume — drop it rather than resurrect stale work.
  if (typeof s.resumeRawHash !== "number" || !Number.isFinite(s.resumeRawHash)) return null;
  if (!s.result || typeof s.result !== "object" || !Array.isArray(s.result.data)) return null;
  const data = s.result.data
    .map(sanitizeRewriteItem)
    .filter((x): x is RewriteResult => x !== null);
  const accepted = Array.isArray(s.accepted)
    ? Array.from(new Set(s.accepted.filter((n): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0).map((n) => Math.floor(n))))
    : [];
  const edits: Record<number, string> = {};
  if (s.edits && typeof s.edits === "object") {
    for (const [k, v] of Object.entries(s.edits)) {
      const idx = Number(k);
      if (Number.isInteger(idx) && idx >= 0 && typeof v === "string") edits[idx] = v;
    }
  }
  return {
    result: {
      source: s.result.source === "ai" ? "ai" : "fallback",
      data,
      ...(typeof s.result.note === "string" ? { note: s.result.note } : {}),
    },
    accepted,
    edits,
    baseline: sanitizeBaseline(s.baseline),
    resumeRawHash: s.resumeRawHash,
  };
}
