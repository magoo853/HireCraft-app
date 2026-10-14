import { EducationItem, ExperienceItem, ProjectItem, StructuredResume } from "./types";

/**
 * Normalize a validated resume into the full StructuredResume shape
 * (RR-05). The /api/ai validator intentionally requires only a subset of
 * fields (rawText / skills / experience[].bullets, plus education for the
 * linkedin task), but downstream composers — the fallback engine and the
 * AI prompt builders — read the whole shape. A caller that omits an
 * optional array (education, certifications, …) used to crash the
 * summary fallback on an unguarded dereference and surface an empty
 * non-JSON 500.
 *
 * This runs ONCE at ingestion, AFTER validation, so validation semantics
 * are unchanged: a resume that is invalid on arrival stays invalid (it is
 * rejected before this is called). Provided values are preserved
 * verbatim; only missing fields gain the emptyResume() defaults.
 */

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function strArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeExperience(value: unknown): ExperienceItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((item) => ({
    title: str(item.title),
    company: str(item.company),
    dates: str(item.dates),
    bullets: strArray(item.bullets),
  }));
}

function normalizeEducation(value: unknown): EducationItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((item) => ({
    school: str(item.school),
    degree: str(item.degree),
    dates: str(item.dates),
    details: str(item.details),
  }));
}

function normalizeProjects(value: unknown): ProjectItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((item) => ({
    name: str(item.name),
    description: str(item.description),
    tech: str(item.tech),
    bullets: strArray(item.bullets),
  }));
}

/** Fill every missing StructuredResume field with its empty default. */
export function normalizeResume(input: unknown): StructuredResume {
  const r: Record<string, unknown> = isRecord(input) ? input : {};
  return {
    name: str(r.name),
    email: str(r.email),
    phone: str(r.phone),
    location: str(r.location),
    linkedin: str(r.linkedin),
    summary: str(r.summary),
    experience: normalizeExperience(r.experience),
    education: normalizeEducation(r.education),
    projects: normalizeProjects(r.projects),
    skills: strArray(r.skills),
    certifications: strArray(r.certifications),
    awards: strArray(r.awards),
    rawText: str(r.rawText),
  };
}
