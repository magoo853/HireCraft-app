import { StructuredResume } from "./types";

/**
 * Keep rawText and the structured resume in sync when text is replaced.
 *
 * The structured resume is what Design renders and what PDF/DOCX export
 * reads; rawText is what scoring reads. A replacement must land in BOTH,
 * targeted — never by regenerating rawText from the structure, which
 * would wipe any accepted rewrite that only exists in rawText.
 */

/** Apply an accepted bullet rewrite: targeted rawText replacement plus
 *  the matching structured bullet (exact bullet text, experience and
 *  projects). If no structured bullet matches exactly, rawText-only is
 *  returned — the structure is never corrupted. Input is not mutated. */
export function applyRewriteToResume(
  resume: StructuredResume,
  original: string,
  replacement: string
): StructuredResume {
  if (!original || original === replacement) return resume;
  const rawText = resume.rawText.includes(original)
    ? resume.rawText.split(original).join(replacement)
    : resume.rawText;
  let matched = false;
  const experience = resume.experience.map((e) => ({
    ...e,
    bullets: e.bullets.map((b) => {
      if (b === original) { matched = true; return replacement; }
      return b;
    }),
  }));
  const projects = resume.projects.map((p) => ({
    ...p,
    bullets: p.bullets.map((b) => {
      if (b === original) { matched = true; return replacement; }
      return b;
    }),
  }));
  if (rawText === resume.rawText && !matched) return resume;
  return { ...resume, rawText, experience, projects };
}

/** Apply a Design-tab inline text edit: the first matching structured
 *  field (summary → name → experience → projects → education, the
 *  Design page's historical scan order) plus a targeted replacement of
 *  the same old→new strings in rawText. rawText is NOT regenerated from
 *  the structure, so previously accepted rewrites survive the edit.
 *  Returns the input unchanged (same reference) when nothing matches. */
export function applyTextEditToResume(
  resume: StructuredResume,
  oldText: string,
  newText: string
): StructuredResume {
  if (!oldText || oldText === newText) return resume;
  const r: StructuredResume = {
    ...resume,
    experience: resume.experience.map((e) => ({ ...e, bullets: [...e.bullets] })),
    projects: resume.projects.map((p) => ({ ...p, bullets: [...p.bullets] })),
    education: resume.education.map((e) => ({ ...e })),
  };
  let done = false;
  const swap = (s: string) => {
    if (!done && s.includes(oldText)) { done = true; return s.replace(oldText, newText); }
    return s;
  };
  r.summary = swap(r.summary);
  r.name = swap(r.name);
  r.experience = r.experience.map((e) => ({
    ...e,
    title: swap(e.title), company: swap(e.company), dates: swap(e.dates),
    bullets: e.bullets.map(swap),
  }));
  r.projects = r.projects.map((p) => ({
    ...p, name: swap(p.name), description: swap(p.description), tech: swap(p.tech),
    bullets: p.bullets.map(swap),
  }));
  r.education = r.education.map((e) => ({
    ...e, school: swap(e.school), degree: swap(e.degree), dates: swap(e.dates), details: swap(e.details),
  }));
  if (!done) return resume;
  // Targeted rawText step: replace the same strings where rawText holds
  // them; leave rawText untouched otherwise (never regenerate it).
  r.rawText = resume.rawText.includes(oldText)
    ? resume.rawText.replace(oldText, newText)
    : resume.rawText;
  return r;
}
