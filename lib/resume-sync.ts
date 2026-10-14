import { StructuredResume } from "./types";

/**
 * Keep rawText and the structured resume in sync when text is replaced.
 *
 * The structured resume is what Design renders and what PDF/DOCX export
 * reads; rawText is what scoring reads. A replacement must land in BOTH,
 * targeted — never by regenerating rawText from the structure, which
 * would wipe any accepted rewrite that only exists in rawText.
 */

/** Comparison normalization — the same recipe the Rewrite page uses to
 *  decide whether a rewrite actually changed a bullet (RR-13): case,
 *  curly quotes, en/em dashes, whitespace runs, and trailing periods are
 *  presentation differences, not content differences. An AI echo that
 *  differs only in these must still mirror into the structure. */
function normCmp(s: string): string {
  return s
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/\.+$/, "")
    .trim();
}

/** Apply an accepted bullet rewrite: targeted rawText replacement plus
 *  the matching structured bullet (experience and projects). Matching is
 *  exact first, then normalized (RR-13 — see normCmp). If neither matches,
 *  the input is returned unchanged — the structure is never corrupted.
 *  Input is not mutated. */
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
  const mapExact = (b: string) => {
    if (b === original) { matched = true; return replacement; }
    return b;
  };
  let experience = resume.experience.map((e) => ({ ...e, bullets: e.bullets.map(mapExact) }));
  let projects = resume.projects.map((p) => ({ ...p, bullets: p.bullets.map(mapExact) }));
  if (!matched) {
    // RR-13: exact matching missed — retry on the normalized form before
    // giving up on the mirror. The Score reads rawText (already updated
    // by the caller's replacement), but Design/PDF/DOCX read the
    // structure; an inexact AI echo (quote style, spacing, trailing
    // period) must not leave the export showing the old bullet.
    const target = normCmp(original);
    const mapNorm = (b: string) => {
      if (normCmp(b) === target) { matched = true; return replacement; }
      return b;
    };
    experience = experience.map((e) => ({ ...e, bullets: e.bullets.map(mapNorm) }));
    projects = projects.map((p) => ({ ...p, bullets: p.bullets.map(mapNorm) }));
  }
  if (rawText === resume.rawText && !matched) return resume;
  return { ...resume, rawText, experience, projects };
}

/** Scope for a Design-tab inline edit (Wave 4). The templates invoke
 *  the edit with only the field's text — no section/role/bullet index
 *  reaches the call site — so the Design page passes the occurrence
 *  ordinal of the instance the user actually clicked: 0 = first field
 *  containing the text in scan order, 1 = second, and so on. Two
 *  identical bullets in different roles are then edited individually
 *  instead of whichever scans first. */
export interface TextEditScope {
  occurrence?: number;
}

/** Replace the occurrence-th occurrence of oldText in text (0-based);
 *  falls back to the first occurrence when there are fewer, and
 *  returns text unchanged when oldText is absent. */
function replaceOccurrence(text: string, oldText: string, newText: string, occurrence: number): string {
  let idx = -1;
  let from = 0;
  for (let i = 0; i <= occurrence; i++) {
    idx = text.indexOf(oldText, from);
    if (idx === -1) break;
    from = idx + oldText.length;
  }
  if (idx === -1) {
    const first = text.indexOf(oldText);
    if (first === -1) return text;
    return text.slice(0, first) + newText + text.slice(first + oldText.length);
  }
  return text.slice(0, idx) + newText + text.slice(idx + oldText.length);
}

/** Apply a Design-tab inline text edit: the matching structured field
 *  (summary → name → experience → projects → education, the Design
 *  page's historical scan order) plus a targeted replacement of the
 *  same old→new strings in rawText. Without a scope this is exactly
 *  the historical behavior — the first matching field and the first
 *  rawText occurrence. With `scope.occurrence`, only that instance is
 *  edited (in both structure and rawText). rawText is NOT regenerated
 *  from the structure, so previously accepted rewrites survive the
 *  edit. Returns the input unchanged (same reference) when the scoped
 *  instance does not exist. */
export function applyTextEditToResume(
  resume: StructuredResume,
  oldText: string,
  newText: string,
  scope?: TextEditScope
): StructuredResume {
  if (!oldText || oldText === newText) return resume;
  const target = scope?.occurrence ?? 0;
  const r: StructuredResume = {
    ...resume,
    experience: resume.experience.map((e) => ({ ...e, bullets: [...e.bullets] })),
    projects: resume.projects.map((p) => ({ ...p, bullets: [...p.bullets] })),
    education: resume.education.map((e) => ({ ...e })),
  };
  let done = false;
  let seen = 0;
  const swap = (s: string) => {
    if (done || !s.includes(oldText)) return s;
    if (seen === target) { done = true; return s.replace(oldText, newText); }
    seen++;
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
  // Targeted rawText step: replace the same occurrence where rawText
  // holds it; leave rawText untouched otherwise (never regenerate it).
  r.rawText = replaceOccurrence(resume.rawText, oldText, newText, target);
  return r;
}
