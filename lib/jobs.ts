import type { StructuredResume } from "./types";
import { extractKeywords } from "./fallback";

/* ------------------------------------------------------------------ */
/* Job alerts                                                          */
/* ------------------------------------------------------------------ */

export interface JobAlert {
  id: string;
  role: string;
  company: string; // "" = any company
  location: string; // "" = anywhere
  minMatch: number; // only surface postings at/above this resume match %
  createdAt: number;
  // Additive (Cycle 13): stamped by the last completed check for this
  // alert. Optional — alerts saved before this field existed load fine
  // and display as "Not checked yet".
  lastCheckedAt?: number;
  lastNewCount?: number; // new matches that arrived on the latest check
}

export interface JobPosting {
  id: string;
  source: string;
  title: string;
  company: string;
  location: string;
  url: string;
  postedAt: string; // ISO date or ""
  description: string;
}

export interface PostingScore {
  match: number; // 0..100 — how close the resume is to this posting
  matched: string[];
  missing: string[];
}

/**
 * Score a posting against the user's resume: keyword overlap (the same
 * extraction the Score tab uses) blended with title-word resonance.
 */
export function scorePosting(resume: StructuredResume, posting: JobPosting): PostingScore {
  const text = `${posting.title}\n${posting.description}`;
  const kws = extractKeywords(text, resume.rawText, 14);
  const matched = kws.filter((k) => k.matched).map((k) => k.term);
  const missing = kws.filter((k) => !k.matched).map((k) => k.term);
  const kwScore = kws.length ? matched.length / kws.length : 0;

  const stop = new Set(["senior", "junior", "lead", "staff", "principal", "the", "and", "for", "with"]);
  const titleWords = posting.title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stop.has(w));
  const hay = `${resume.experience.map((e) => e.title).join(" ")} ${resume.skills.join(" ")}`.toLowerCase();
  const titleHit = titleWords.length
    ? titleWords.filter((w) => hay.includes(w)).length / titleWords.length
    : 0;

  const match = Math.round(Math.max(0, Math.min(100, (kwScore * 0.75 + titleHit * 0.25) * 100)));
  return { match, matched, missing };
}

export interface ScoredPosting extends JobPosting {
  score: PostingScore;
  isNew: boolean;
  alertRole: string;
  // Other sources the same posting was syndicated to, filled in by
  // dedupeScoredPostings when a cross-source duplicate is merged away.
  alsoOn?: string[];
}

/* ------------------------------------------------------------------ */
/* Location display normalization                                      */
/* ------------------------------------------------------------------ */

const US_PART = /^(us|usa|u\.s\.a\.|united states|united states of america|america)$/i;
const REMOTE_PART = /^(remote|work from home|wfh|anywhere|worldwide|global|distributed)$/i;

/**
 * Normalize the inconsistent location strings the job sources return
 * ("Remote - US", "United States", "tampa, fl", "Tampa, FL - Remote")
 * into one display shape: "Tampa, FL", "Tampa, FL (Remote)",
 * "Remote (US)", "Remote", "US". Display-only and total: it never
 * throws, and a string it doesn't recognize comes back merely
 * whitespace/punctuation-cleaned.
 */
export function normalizeLocation(raw: string): string {
  const cleaned = (raw ?? "")
    .replace(/[()]/g, " ")
    .replace(/\s*[-–—;·•|]\s*/g, ", ")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/^,+|,+$/g, "")
    .trim();
  if (!cleaned) return "";
  const remote = /\b(remote|work from home|wfh)\b/i.test(cleaned);
  let city = "";
  let state = "";
  let us = false;
  for (const part of cleaned.split(", ")) {
    const p = part.trim();
    if (!p) continue;
    if (US_PART.test(p)) { us = true; continue; }
    if (REMOTE_PART.test(p)) continue;
    // A place part: drop work-mode words ("Remote in Tampa" → "Tampa").
    const place = p
      .replace(/\b(remote|work from home|wfh|hybrid)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^in\s+/i, "");
    if (!place) continue;
    if (US_PART.test(place)) { us = true; continue; }
    if (/^[a-z]{2}$/i.test(place)) { state = place.toUpperCase(); continue; }
    if (!city) city = place;
    else city = `${city}, ${place}`; // e.g. "Austin" followed by "Texas"
  }
  const pretty = (c: string) =>
    c === c.toLowerCase() || c === c.toUpperCase()
      ? c.replace(/\b\w/g, (ch) => ch.toUpperCase())
      : c;
  const suffix = remote ? " (Remote)" : "";
  if (city && state) return `${pretty(city)}, ${state}${suffix}`;
  if (city) return `${pretty(city)}${suffix}`;
  if (state) return `${state}${suffix}`;
  if (remote) return us ? "Remote (US)" : "Remote";
  if (us) return "US";
  return cleaned;
}

/**
 * Coarse bucket used ONLY for dedupe keys: two location strings that
 * bucket equal are treated as the same place. Deliberately coarse in
 * the safe direction — "Remote" and "Remote (US)" stay apart (different
 * eligibility), while a city bucket ignores the "(Remote)" qualifier
 * because boards disagree on whether to mention it.
 */
export function locationBucket(location: string): string {
  const n = normalizeLocation(location).toLowerCase();
  if (!n) return "anywhere";
  if (n === "remote (us)" || n === "us") return "us";
  if (n === "remote") return "remote";
  return n.replace(/ \(remote\)$/, "");
}

/* ------------------------------------------------------------------ */
/* Cross-source dedupe                                                 */
/* ------------------------------------------------------------------ */

const COMPANY_SUFFIXES = new Set(["inc", "llc", "corp", "corporation", "ltd", "co", "company"]);
const TITLE_SENIORITY = new Set(["senior", "sr", "junior", "jr", "lead", "staff", "principal"]);

function keyTokens(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter(Boolean);
}

/** "Acme, Inc." / "ACME LLC" / "Acme Corp" → "acme". */
export function normalizeCompanyKey(name: string): string {
  const tokens = keyTokens(name);
  while (tokens.length > 1 && COMPANY_SUFFIXES.has(tokens[tokens.length - 1])) tokens.pop();
  return tokens.join(" ");
}

/** "Senior Contract Administrator" → "contract administrator" (leading
 *  seniority prefixes only; level suffixes like "II" are kept, so
 *  genuinely different levels never merge). */
export function normalizeTitleKey(title: string): string {
  const tokens = keyTokens(title);
  while (tokens.length > 1 && TITLE_SENIORITY.has(tokens[0])) tokens.shift();
  return tokens.join(" ");
}

export function postingDedupeKey(
  p: Pick<JobPosting, "company" | "title" | "location"> & { id?: string }
): string {
  const company = normalizeCompanyKey(p.company);
  // Without a company name we cannot prove two postings are the same
  // job — never merge them.
  if (!company) return `unique:${p.id ?? `${p.title}|${p.location}`}`;
  return `${company}|${normalizeTitleKey(p.title)}|${locationBucket(p.location)}`;
}

/**
 * Collapse the same posting syndicated to several boards into one
 * result: the highest-scored instance wins (ties → most recently
 * posted), the merged result is "new" if ANY instance was new, and the
 * losing sources are recorded on `alsoOn`. Same title at the same
 * company in a different city stays separate (location is in the key),
 * as do different titles. Group order follows first appearance.
 */
export function dedupeScoredPostings(list: ScoredPosting[]): ScoredPosting[] {
  const groups = new Map<string, ScoredPosting[]>();
  for (const p of list) {
    const key = postingDedupeKey(p);
    const g = groups.get(key);
    if (g) g.push(p);
    else groups.set(key, [p]);
  }
  const out: ScoredPosting[] = [];
  groups.forEach((g) => {
    const winner = g.reduce((best, p) =>
      p.score.match > best.score.match ||
      (p.score.match === best.score.match && (p.postedAt || "") > (best.postedAt || ""))
        ? p
        : best
    );
    const sources: string[] = [];
    g.forEach((p) => {
      if (!sources.includes(p.source)) sources.push(p.source);
    });
    const alsoOn = sources.filter((s) => s !== winner.source);
    out.push({
      ...winner,
      isNew: g.some((p) => p.isNew),
      alsoOn: alsoOn.length ? alsoOn : undefined,
    });
  });
  return out;
}

/** "just now" / "5m ago" / "2h ago" / "3d ago" — for the alert readout. */
export function checkedAgoLabel(ts: number, now: number): string {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
