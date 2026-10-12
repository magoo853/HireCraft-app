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
  bulletCount: number;
  quantifiedCount: number;
}

export interface RewriteResult {
  original: string;
  rewritten: string;
  why: string;
  gaps: string[];
  translationNote?: string;
}

export interface CoverLetterResult {
  tone: string;
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

export interface AiResponse<T> {
  source: "ai" | "fallback";
  data: T;
}
