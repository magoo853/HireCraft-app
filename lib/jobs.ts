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
}
