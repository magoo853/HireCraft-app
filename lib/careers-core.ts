/**
 * Shared career types and small helpers used across tabs (roadmap types,
 * salary formatting, job-board deep links, the RIASEC letter type). Kept
 * separate from the heavy ROLES / matching engine in ./careers so pages
 * that only need these don't pay for the whole engine in First Load JS.
 *
 * SALARY BANDS ARE ESTIMATES — rough US national ranges (2026) for illustration.
 * Always labeled as estimates in the UI. Verify against BLS OES or live postings
 * before making decisions.
 */
export type RiasecLetter = "R" | "I" | "A" | "S" | "E" | "C";
export interface Role {
  title: string;
  cluster: RiasecLetter[]; // primary first
  salaryLow: number; // USD annual, ESTIMATE
  salaryHigh: number; // USD annual, ESTIMATE
  skills: string[];
  next: string[]; // natural next-step titles (must match other titles)
}
export interface JobMatch {
  role: Role;
  fit: number; // 0..100
  why: string;
  matchedSkills: string[];
  missingSkills: string[];
}
/** Deep links to live job-board searches for a title. No API key needed —
 *  the boards do the searching; we just send the user to the right query. */
export function jobSearchLinks(title: string, location = "", veteranFirst = false): { name: string; url: string }[] {
  const q = encodeURIComponent(title);
  const l = encodeURIComponent(location.trim());
  const links = [
    { name: "Indeed", url: `https://www.indeed.com/jobs?q=${q}${l ? `&l=${l}` : ""}` },
    { name: "LinkedIn", url: `https://www.linkedin.com/jobs/search/?keywords=${q}${l ? `&location=${l}` : ""}` },
    { name: "Glassdoor", url: `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${q}${l ? `&locT=C&locKeyword=${l}` : ""}` },
    { name: "USAJobs", url: `https://www.usajobs.gov/Search/Results?k=${q}` },
  ];
  if (veteranFirst) {
    const usajobs = links.pop()!;
    return [usajobs, ...links];
  }
  return links;
}
/* ------------------------------------------------------------------ */
/* Roadmap                                                             */
/* ------------------------------------------------------------------ */

export interface HorizonGoal {
  text: string;
  salary: number; // annual USD target, 0 = not set
}

/** A user-defined checkpoint: N years out, with a goal and salary target. */
export interface RoadmapGoal {
  years: number;
  text: string;
  salary: number; // annual USD target, 0 = not set
}

export interface RoadmapNode {
  horizon: string; // "Now" | "2 years" | "5 years" | custom e.g. "3 years"
  years: number; // 0 = now
  titles: {
    title: string;
    salaryLow: number;
    salaryHigh: number;
    salaryFlag: "hit" | "can-hit" | "below";
    salaryNote: string;
    dayInLife?: string; // illustrative preview of the role, derived from its skill profile
  }[];
  steppingStones: string[];
  gaps: string[];
  goalText: string;
  /** Every skill the checkpoint's target roles expect, marked against the user's resume. */
  skillsToHave: { skill: string; have: boolean }[];
}
/** Format a salary number as $120K. */
export function fmtSalary(n: number): string {
  if (!n || n <= 0) return "";
  return n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`;
}
/** Suggested goal examples per mode (chips on the roadmap form). */
export const GOAL_EXAMPLES: Record<string, string[]> = {
  veteran: [
    "Operations manager at a logistics company",
    "IT project manager or cybersecurity analyst",
    "Federal service / law enforcement career",
    "Start my own business",
  ],
  general: [
    "Senior or lead role in my field",
    "Move into management",
    "Switch into tech",
    "Six-figure remote role",
  ],
  new: [
    "Land my first full-time job",
    "Become a certified electrician",
    "Finish my degree while working",
    "Get promoted to supervisor",
  ],
};
