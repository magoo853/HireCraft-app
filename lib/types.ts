export type Mode = "veteran" | "general" | "new";

export const MODE_LABELS: Record<Mode, string> = {
  veteran: "Veteran in transition",
  general: "Experienced job seeker",
  new: "New to the workforce",
};

export const MODE_DESCRIPTIONS: Record<Mode, string> = {
  veteran: "MOS & rank translated to civilian language recruiters understand.",
  general: "Level up your resume and LinkedIn for your next move.",
  new: "No resume yet? We'll build your first one with you, step by step.",
};

export interface ExperienceItem {
  title: string;
  company: string;
  dates: string;
  bullets: string[];
}

export interface EducationItem {
  school: string;
  degree: string;
  dates: string;
  details: string;
}

export interface ProjectItem {
  name: string;
  description: string;
  tech: string;
  bullets: string[];
}

export interface StructuredResume {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  summary: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  skills: string[];
  certifications: string[];
  awards: string[];
  rawText: string;
}

export const emptyResume = (): StructuredResume => ({
  name: "",
  email: "",
  phone: "",
  location: "",
  linkedin: "",
  summary: "",
  experience: [],
  education: [],
  projects: [],
  skills: [],
  certifications: [],
  awards: [],
  rawText: "",
});

export interface Keyword {
  term: string;
  count: number;
  matched: boolean;
}

export interface FormatFlag {
  level: "warn" | "info" | "good";
  title: string;
  detail: string;
}

export interface ScoreBreakdown {
  keyword: number;
  quantified: number;
  actionVerbs: number;
  contact: number;
  sections: number;
  formatting: number;
}

export interface ScoreResult {
  total: number;
  grade: string;
  breakdown: ScoreBreakdown;
  keywords: Keyword[];
  keywordMatchPct: number;
  flags: FormatFlag[];
  readability: { score: number; label: string };
  readabilityDetail: { avgWordsPerSentence: number; avgWordsPerBullet: number; longestBullets: string[] };
  /** What the keyword score was judged against: the user's posting, or a generic checklist. */
  keywordBasis: "job" | "generic";
  genericTitle: string;
  bulletCount: number;
  quantifiedCount: number;
}

export interface RewriteResult {
  original: string;
  rewritten: string;
  why: string;
  gaps: string[];
  translationNote?: string;
  /** Set when this pair is an addition mined from the civilian performance
   *  review ("review") or from a military evaluation ("eval"). */
  source?: "review" | "eval";
}

export interface CoverLetterResult {
  tone: string;
  text: string;
}

export interface SummaryResult {
  text: string;
}

export interface LinkedInResult {
  headlines: string[];
  about: string;
  polishedBullets: { original: string; polished: string }[];
  skillsGap: string[];
  tip: string;
  appliedFeedback?: string[];
}

/** One recorded ATS score (Wave 3) — persisted additively in the store. */
export interface ScoreHistoryEntry {
  at: number;
  total: number;
  grade: string;
  /** Short label of what the score was judged against (target job, or "General"). */
  jobBasis: string;
}

export interface AiResponse<T> {
  source: "ai" | "fallback";
  data: T;
  /** Present when the AI key is set but the live call failed — explains the fallback. */
  note?: string;
}

/** Veteran-mode military background: branch, MOS/job codes, and the text of
 *  the service member's yearly performance review (NCOER/OER/EPR/FITREP…). */
export interface MilitaryInfo {
  branch: string;
  mosCodes: string;
  evalText: string;
}

export const emptyMilitary = (): MilitaryInfo => ({ branch: "", mosCodes: "", evalText: "" });

/** A user's latest civilian performance review, stored only on-device. */
export interface PerformanceReview {
  text: string;
  updatedAt: number;
}

export const emptyPerfReview = (): PerformanceReview => ({ text: "", updatedAt: 0 });
