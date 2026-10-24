/**
 * Roadmap "Gaps to close" classification.
 *
 * Gaps arrive as plain AI strings (RoadmapNode.gaps), but they are not
 * all the same kind of problem, and one-size routing sent every one of
 * them to a Discover job search:
 *
 *  - evidence — the gap is about the user's OWN resume: its bullets
 *    state duties without quantified results. No job board can fix
 *    that; the fix lives in the Rewrite tab, where the bullets are.
 *    Routed to /rewrite with the gap passed as a ?note= so the user
 *    lands oriented.
 *  - skill — the gap names a skill, tool, certification, or knowledge
 *    area the target roles expect and the resume lacks. Seeing live
 *    postings that ask for it is genuinely useful → Discover search,
 *    the pre-existing behavior.
 *  - explore — everything else (years, education, seniority, vague
 *    comparisons). Also Discover: the honest next step is comparing
 *    against live postings. This is the default on purpose.
 *
 * The classifier is deliberately conservative: it only routes to
 * Rewrite on explicit metrics/quantification/results language, matched
 * on whole word tokens (tokenized on non-alphanumerics), never on
 * substrings — "impactful" is not "impact". A clear skill gap ("No
 * experience with SQL", "Missing PMP certification") contains no
 * evidence tokens and can never be misrouted. Skill vs explore is a
 * low-stakes distinction (same destination); it only changes the
 * explanation copy and action label.
 */

export type GapKind = "evidence" | "skill" | "explore";

export interface GapInfo {
  kind: GapKind;
  /** One plain-English line: what this gap actually means. */
  meaning: string;
  /** The pill's call to action, naming the destination. */
  actionLabel: string;
  /** Where tapping takes the user. */
  href: string;
}

/** Whole words that mark a gap as being about proof in the bullets. */
const EVIDENCE_TOKENS = new Set([
  "metric", "metrics",
  "quantify", "quantified", "quantifying", "quantifiable", "quantification",
  "number", "numbers", "numeric", "numerical",
  "measurable", "measured", "measurement", "measurements",
  "result", "results",
  "impact", "impacts",
  "evidence",
  "achievement", "achievements",
  "accomplishment", "accomplishments",
  "outcome", "outcomes",
  "figure", "figures",
  "headcount",
  "kpi", "kpis", "roi",
  "percent", "percentage", "percentages",
]);

/** Whole words that mark a gap as naming a credential. */
const CERT_TOKENS = new Set([
  "certification", "certifications", "certified", "certificate", "certificates",
  "license", "licensed", "licence", "credential", "credentials",
]);

/** Adjacent word pairs that mark a gap as naming a skill/knowledge area. */
const SKILL_PHRASES: ReadonlyArray<readonly [string, string]> = [
  ["experience", "with"],
  ["experience", "in"],
  ["experience", "using"],
  ["knowledge", "of"],
  ["proficiency", "in"],
  ["proficient", "in"],
  ["familiarity", "with"],
  ["familiar", "with"],
  ["expertise", "in"],
  ["expertise", "with"],
  ["background", "in"],
  ["training", "in"],
  ["skilled", "in"],
  ["certified", "in"],
];

function tokenize(gap: string): string[] {
  return gap
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function hasPhrase(tokens: string[], a: string, b: string): boolean {
  for (let i = 0; i + 1 < tokens.length; i++) {
    if (tokens[i] === a && tokens[i + 1] === b) return true;
  }
  return false;
}

export function classifyGap(gap: string): GapKind {
  const tokens = tokenize(gap);
  if (tokens.length === 0) return "explore";

  // Evidence first: explicit proof language is the only signal strong
  // enough to send the user to their own bullets instead of a job board.
  if (hasPhrase(tokens, "no", "specific")) return "evidence";
  if (tokens.some((t) => EVIDENCE_TOKENS.has(t))) return "evidence";

  // Skill: a named credential, a skill-naming phrase ("experience with
  // X", "knowledge of X"), a short "… experience" statement, or a bare
  // named area (the deterministic roadmap engine emits those verbatim,
  // e.g. "Budget forecasting").
  if (tokens.some((t) => CERT_TOKENS.has(t))) return "skill";
  if (SKILL_PHRASES.some(([a, b]) => hasPhrase(tokens, a, b))) return "skill";
  if (tokens.includes("experience") && tokens.length <= 6) return "skill";
  if (tokens.length <= 4) return "skill";

  return "explore";
}

const KIND_COPY: Record<GapKind, { meaning: string; actionLabel: string }> = {
  evidence: {
    meaning:
      "Your bullets state duties but not results. Senior roles expect numbers — dollars, percentages, scale.",
    actionLabel: "Fix in Rewrite →",
  },
  skill: {
    meaning: "This skill shows up in target-role postings but isn't on your resume yet.",
    actionLabel: "See jobs asking for this ↗",
  },
  explore: {
    meaning: "See how this stacks up against live postings for your target role.",
    actionLabel: "See jobs asking for this ↗",
  },
};

/** Everything the Roadmap gaps block needs to render one gap. */
export function gapInfo(gap: string): GapInfo {
  const kind = classifyGap(gap);
  const href =
    kind === "evidence"
      ? `/rewrite?note=${encodeURIComponent(gap)}`
      : `/discover?q=${encodeURIComponent(gap)}`;
  return { kind, ...KIND_COPY[kind], href };
}
