import { StructuredResume, emptyResume } from "./types";

/* Client-side resume parsing: PDF / DOCX / TXT -> text -> structured resume */

// Keep the major version in sync with the pdfjs-dist dependency in package.json.
const PDFJS_CDN_WORKER = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4/build/pdf.worker.min.mjs";

export async function parseFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return parsePdf(file);
  if (ext === "docx") return parseDocx(file);
  if (ext === "doc") {
    // Legacy Word format: browsers can't read it, so the server extracts it.
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/extract", { method: "POST", body: fd });
      if (!res.ok) throw new Error("extract failed");
      const j = (await res.json()) as { text?: string };
      if (j.text && j.text.trim().length > 30) return j.text;
      throw new Error("empty extraction");
    } catch {
      throw new Error("That's an older Word .doc file and it couldn't be read. In Word: File → Save As → PDF (or .docx), then upload that instead.");
    }
  }
  return file.text();
}

async function parsePdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const buf = await file.arrayBuffer();
  // Try the locally-served worker first; fall back to CDN if the build
  // didn't include it (e.g. install-time copy skipped).
  // CDN first (the locally-served copy isn't reliably included in the
  // Vercel build); local file as fallback for offline use.
  const workers = [PDFJS_CDN_WORKER, "/pdf.worker.min.mjs"];
  let lastErr: unknown = null;
  for (const src of workers) {
    try {
      pdfjs.GlobalWorkerOptions.workerSrc = src;
      const pdf = await pdfjs.getDocument({ data: buf.slice(0) }).promise;
      return await extractPdfText(pdf);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Couldn't read that PDF.");
}

async function extractPdfText(pdf: { numPages: number; getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: unknown[] }> }> }): Promise<string> {
  const pages: string[] = [];
  for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Reconstruct rough lines by grouping items on Y position
    const items = content.items as { str: string; transform: number[] }[];
    const lines = new Map<number, string[]>();
    for (const it of items) {
      const y = Math.round(it.transform[5]);
      if (!lines.has(y)) lines.set(y, []);
      lines.get(y)!.push(it.str);
    }
    const sorted = Array.from(lines.entries()).sort((a, b) => b[0] - a[0]);
    pages.push(sorted.map(([, parts]) => parts.join(" ").trim()).filter(Boolean).join("\n"));
  }
  return pages.join("\n\n");
}

async function parseDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return result.value;
}

const SECTION_HEADERS: [RegExp, keyof Pick<StructuredResume, "summary" | "experience" | "education" | "skills"> | "projects" | "summaryExperience" | "certifications" | "awards" | "other"][] = [
  // Combined headers ("PROFESSIONAL EXPERIENCE & ABILITY SUMMARY") start as a
  // summary and flip to experience at the first dated job line.
  [/experience.*summary|summary.*experience/i, "summaryExperience"],
  [/^(professional\s+)?summary$/i, "summary"],
  [/^objective$/i, "summary"],
  [/^career\s+objective$/i, "summary"],
  [/^profile$/i, "summary"],
  [/^professional\s+profile$/i, "summary"],
  [/^career\s+summary$/i, "summary"],
  [/^ability\s+summary$/i, "summary"],
  [/^summary\s+of\s+(qualifications|experience)$/i, "summary"],
  [/^(work\s+)?experience$/i, "experience"],
  [/^employment(\s+history)?$/i, "experience"],
  [/^professional\s+experience$/i, "experience"],
  [/^work\s+history$/i, "experience"],
  [/^professional\s+accomplishments\s*(and|&)\s*experience$/i, "experience"],
  [/^career\s+history$/i, "experience"],
  [/^professional\s+background$/i, "experience"],
  // Generic titled experience header: 1–4 capitalized words (plus
  // connectors) ending in Experience/Employment — "Leadership Experience",
  // "Professional Accomplishments and Experience". The leading token must
  // be a capitalized word, so a skills cell like "10+ Years of Leadership
  // Experience" (starts with a digit) can never trip it.
  [/^(?:(?:[A-Z][a-z]+|of|and|the|&)\s+){0,3}(?:Experience|Employment)$/, "experience"],
  [/^military\s+(experience|service)$/i, "experience"],
  [/^education$/i, "education"],
  [/^(technical\s+)?skills$/i, "skills"],
  [/^core\s+competencies$/i, "skills"],
  [/^projects?$/i, "projects"],
  // Certifications / training / awards have real homes now — they render in
  // every design template and the text export.
  [/^professional\s+military\s+education$/i, "certifications"],
  [/^(professional\s+)?certifications/i, "certifications"],
  [/^licenses?\s*(&|and)?\s*certifications/i, "certifications"],
  [/^training\s*(&|and)\s*certifications/i, "certifications"],
  [/^awards/i, "awards"],
  [/^honors?\s*(&|and)\s*awards/i, "awards"],
  [/^decorations/i, "awards"],
  [/^affiliations$/i, "certifications"],
  [/^security\s+clearance/i, "certifications"],
];

const MONTHS = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|Sept|October|November|December";
// One date atom. The ISO form (YYYY-MM) must precede the bare year so a
// range like "2019-03 – 2021-11" is not truncated at the ISO month's dash;
// the day-first form covers "12 March 2016". A bare atom can never match on
// its own here — DATE_RANGE_RE always requires two atoms around a dash.
const DATE_ATOM = `(?:${MONTHS})\\.?\\s+\\d{4}|\\d{1,2}\\s+(?:${MONTHS})\\.?\\s+\\d{4}|\\d{4}-\\d{2}|\\d{1,2}/\\d{4}|\\d{4}`;
/** A full date range anywhere in a line: "Feb 2015 – Present", "Mar 2013 – Mar 2015", "2019 - 2025", "2019-03 – 2021-11", "12 March 2016 – 4 June 2018". */
const DATE_RANGE_RE = new RegExp(`(${DATE_ATOM})\\s*[-–—]\\s*(${DATE_ATOM}|present|current)`, "i");
/** An open-ended start with no end date: "Since 2021", "From Mar 2019".
 * Kept apart from DATE_RANGE_RE (which requires a separator + end atom)
 * and consulted only for lines inside the experience section, so summary
 * prose like "serving customers since 2021" never trips it. The matched
 * text is kept verbatim — downstream display/scoring only needs the
 * dates string to be non-empty and carry the year. */
const DATE_OPEN_RE = new RegExp(`\\b(?:since|from)\\s+(?:(?:${MONTHS})\\.?\\s+\\d{4}|\\d{1,2}/\\d{4}|\\d{4})`, "i");

/** The datelike tail a job-header line carries: a full range, else an open-ended start. */
function matchJobDates(line: string): string {
  return line.match(DATE_RANGE_RE)?.[0] ?? line.match(DATE_OPEN_RE)?.[0] ?? "";
}
function hasJobDates(line: string): boolean {
  return DATE_RANGE_RE.test(line) || DATE_OPEN_RE.test(line);
}
const ACTION_VERBS = /^(administered|managed|led|developed|provided|directed|supervised|responsible|oversaw|maintained|coordinated|performed|conducted|executed|delivered|supported|assisted|ensured|prepared|operated|served|worked|handled|processed|created|built|implemented|trained|evaluated|reviewed|planned|organized|monitored|advised|negotiated|achieved|improved|increased|reduced|streamlined|established|designed|launched|mentored|briefed)\b/i;

/** "Title, Company, Location; Feb 2015 – Present, Rank, …" → parts. */
function parseJobHeader(line: string): { title: string; company: string; dates: string } {
  const dates = matchJobDates(line);
  let head = line.split(";")[0];
  head = head.replace(DATE_RANGE_RE, "").replace(DATE_OPEN_RE, "").replace(/[:;,]\s*$/, "").trim();
  let segs = head.split(/,\s*/).filter(Boolean);
  if (segs.length === 1 && /[|—–]/.test(head)) segs = head.split(/\s*[|—–]\s*/).filter(Boolean);
  return {
    title: segs[0] ?? head,
    company: segs.slice(1, 3).join(", "),
    dates,
  };
}

/** Heuristic: split flat resume text into a StructuredResume. */
/** Lines that are PDF/browser furniture, not content (print headers, footers, page numbers). */
export function isPdfJunkLine(line: string): boolean {
  const l = line.trim();
  return (
    /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(l) || // "10/12/26, 12:08 PM (1) James Hicks | LinkedIn"
    /\|\s*LinkedIn\s*$/i.test(l) ||
    /^page \d+(\s+of\s+\d+)?$/i.test(l) ||
    /^https?:\/\/\S+\s*\d+\/\d+\s*$/.test(l) || // "https://www.linkedin.com/in/…  3/11"
    /^https?:\/\/\S+$/.test(l) || // a bare URL on its own line
    /^\d+\/\d+$/.test(l) || // bare "3/11" page marker
    /^…?\s*more\s*…?$/i.test(l)
  );
}

/** Skill phrases scanned for when a resume has no skills section. */
const SKILL_TERMS = [
  "strategic sourcing", "contract management", "federal contracting", "government contracting",
  "spend analysis", "market research", "source selection", "negotiation", "vendor management",
  "supplier management", "procurement", "subcontracting", "purchasing", "acquisitions",
  "FAR", "DFARS", "budget management", "budgeting", "risk management", "compliance",
  "team leadership", "leadership", "supervision", "project management", "program management",
  "operations management", "logistics", "supply chain", "inventory management", "data analysis",
  "Microsoft Excel", "Microsoft Office", "PowerPoint", "public speaking", "training",
  "quality assurance", "process improvement", "stakeholder engagement", "scheduling",
  "customer service", "sales", "marketing", "accounting", "financial analysis", "auditing",
  "investigations", "physical security", "emergency management", "cybersecurity",
  "network administration", "help desk", "JavaScript", "Python", "SQL", "Java", "React",
  "cloud computing", "AWS", "Azure", "bookkeeping", "payroll", "recruiting", "onboarding",
  "case management", "grant writing", "technical writing", "documentation", "mentoring",
  "cross-functional collaboration", "performance management", "policy development",
];

/** Skills literally present in the text, in order of first appearance. */
export function deriveSkills(text: string): string[] {
  const lower = text.toLowerCase();
  const found: { term: string; at: number }[] = [];
  for (const term of SKILL_TERMS) {
    const at = lower.indexOf(term.toLowerCase());
    if (at !== -1) found.push({ term, at });
  }
  return found.sort((a, b) => a.at - b.at).map((f) => f.term).slice(0, 14);
}

export function textToStructured(text: string): StructuredResume {
  // LinkedIn profile PDFs (official export or browser print) need their own parser.
  if (looksLikeLinkedInProfile(text)) return parseLinkedInProfile(text);
  const r = emptyResume();
  r.rawText = text;
  // Normalize lines: strip invisible characters Word/PDF exports embed
  // (soft hyphens broke date ranges like "Aug 2021 ­– Present") and
  // collapse tab / multi-space runs (table cells, date columns) that
  // otherwise survive into parsed fields.
  const lines = text
    .split("\n")
    .map((l) => l.replace(/[\u00AD\u200B-\u200D\uFEFF]/g, "").replace(/[\t ]+/g, " ").trim())
    .filter((l) => !isPdfJunkLine(l));

  // Contact block: first ~6 lines
  const head = lines.slice(0, 8).join("\n");
  r.email = head.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] ?? "";
  r.phone = head.match(/(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)?.[0] ?? "";
  r.linkedin = head.match(/(linkedin\.com\/[^\s)]+)/i)?.[0] ?? "";
  const locMatch = head.match(/\b([A-Z][a-z]+(?:[^\S\n]+[A-Z][a-z]+)?),[^\S\n]*([A-Z]{2})\b/);
  r.location = locMatch ? locMatch[0] : "";
  const nameLine = lines.find((l) => l.length > 2 && l.length < 60 && !/[@\d]/.test(l) && !/summary|resume|curriculum/i.test(l));
  r.name = nameLine ?? "";

  // Section split
  const sections = new Map<string, string[]>();
  let current: string | null = null;
  for (const line of lines) {
    const headerLine = line.trim().replace(/:\s*$/, "");
    const header = SECTION_HEADERS.find(([re]) => re.test(headerLine));
    if (header) {
      current = header[1];
      if (!sections.has(current)) sections.set(current, []);
      continue;
    }
    // Combined summary+experience header: summary prose runs until the
    // first line carrying a job date range, then it's experience.
    if (current === "summaryExperience" && DATE_RANGE_RE.test(line)) {
      current = "experience";
      if (!sections.has(current)) sections.set(current, []);
    }
    if (current === "summaryExperience") {
      if (!sections.has("summary")) sections.set("summary", []);
      sections.get("summary")!.push(line);
    } else if (current) {
      sections.get(current)!.push(line);
    }
  }

  r.summary = (sections.get("summary") ?? []).filter((l) => l.length > 10).join(" ");

  const expLines = sections.get("experience") ?? [];
  let currentJob: StructuredResume["experience"][number] | null = null;
  for (let idx = 0; idx < expLines.length; idx++) {
    const line = expLines[idx];
    if (/^[•\-\*▪◦‣·]/.test(line) || /^\d+[.)]\s/.test(line)) {
      const bullet = line.replace(/^[•\-\*▪◦‣·]\s*/, "").replace(/^\d+[.)]\s*/, "").trim();
      if (currentJob) currentJob.bullets.push(bullet);
      else {
        currentJob = { title: "", company: "", dates: "", bullets: [bullet] };
        r.experience.push(currentJob);
      }
    } else if (line.length > 3) {
      const hasDate = hasJobDates(line);
      // A long sentence opening with an action verb is a bullet that lost
      // its marker, not a job title — don't promote it to a role.
      const sentenceLike = line.split(/\s+/).length > 6 && ACTION_VERBS.test(line);
      const looksLikeHeader = hasDate || (line.length < 90 && !sentenceLike);
      if (looksLikeHeader) {
        // Two-line job header: the title stands alone (blank lines may
        // intervene) and a following line carries "Company, Location;
        // dates". Merge them into one role instead of a title-only role
        // plus a company-only role.
        if (!hasDate) {
          let j = idx + 1;
          while (j < expLines.length && !expLines[j]) j++;
          const next = expLines[j];
          if (next && hasJobDates(next) && !/^[•\-\*▪◦‣·]/.test(next)) {
            const nd = matchJobDates(next);
            const nHead = next.split(";")[0].replace(DATE_RANGE_RE, "").replace(DATE_OPEN_RE, "").replace(/[:;,]\s*$/, "").trim();
            currentJob = { title: line, company: nHead, dates: nd, bullets: [] };
            r.experience.push(currentJob);
            idx = j; // the company/dates line is consumed
            continue;
          }
        }
        currentJob = { ...parseJobHeader(line), bullets: [] };
        r.experience.push(currentJob);
      } else if (currentJob) {
        currentJob.bullets.push(line);
      }
    }
  }

  // Education: one entry per degree line ("M.B.A, …, University of X, Dec 2017").
  const eduLines = (sections.get("education") ?? []).filter((l) => l.length > 3);
  const DEGREE_RE = /\b(bachelor|master|associate|doctor|ph\.?\s?d|m\.?\s?b\.?\s?a|b\.?\s?s|b\.?\s?a|a\.?\s?a\.?\s?s|a\.?\s?a|m\.?\s?s|m\.?\s?a|m\.?\s?ed|diploma|certificate|ged)\b/i;
  for (const line of eduLines) {
    if (DEGREE_RE.test(line)) {
      const segs = line.split(/,\s*/).filter(Boolean);
      const dates = line.match(new RegExp(`(?:${MONTHS})\\.?\\s+\\d{4}|\\b(19|20)\\d{2}\\b`, "i"))?.[0] ?? "";
      const schoolCandidates = segs.filter((s) => /university|college|academy|institute|school|seminary/i.test(s));
      const school = schoolCandidates.find((s) => !DEGREE_RE.test(s)) ?? schoolCandidates[0] ?? "";
      // Degree is what precedes the school on the line ("Master of X,
      // University of Y, City, ST  Dec 2017"). School-first lines fall
      // back to everything-but-the-school, minus the date segment and a
      // trailing bare state — the city/state and the date are not part
      // of the degree name.
      const schoolIdx = segs.indexOf(school);
      let degreeSegs = schoolIdx > 0 ? segs.slice(0, schoolIdx) : segs.filter((s) => s !== school);
      degreeSegs = degreeSegs.filter((s) => !(dates && s.includes(dates)));
      while (degreeSegs.length && /^[A-Z]{2}$/.test(degreeSegs[degreeSegs.length - 1])) degreeSegs.pop();
      const degree = degreeSegs.join(", ");
      r.education.push({ school, degree, dates, details: "" });
    } else if (r.education.length) {
      const last = r.education[r.education.length - 1];
      last.details = last.details ? `${last.details} ${line}` : line;
    }
  }

  const skillText = (sections.get("skills") ?? []).join("\n");
  r.skills = skillText
    .split(/[,;•\n|]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 40)
    .slice(0, 30);
  // A thin skills section still outranks derivation: keep the user's own
  // listed skills first and only top up with derived terms that aren't
  // already covered. With no section at all, derivation stands alone.
  if (r.skills.length < 4) {
    const derived = deriveSkills(r.rawText).filter(
      (d) => !r.skills.some((s) => s.toLowerCase().includes(d.toLowerCase()) || d.toLowerCase().includes(s.toLowerCase()))
    );
    r.skills = [...r.skills, ...derived].slice(0, 14);
  }

  const projLines = sections.get("projects") ?? [];
  let currentProj: StructuredResume["projects"][number] | null = null;
  for (const line of projLines) {
    if (/^[•\-\*▪◦‣·]/.test(line)) {
      const bullet = line.replace(/^[•\-\*▪◦‣·]\s*/, "").trim();
      if (currentProj) currentProj.bullets.push(bullet);
    } else if (line.length > 3) {
      currentProj = { name: line, description: "", tech: "", bullets: [] };
      r.projects.push(currentProj);
    }
  }

  const listSection = (key: string) =>
    (sections.get(key) ?? [])
      .map((l) => l.replace(/^[•\-\*▪◦‣·]\s*/, "").trim())
      .filter((l) => l.length > 3);
  r.certifications = Array.from(new Set(listSection("certifications"))).slice(0, 20);
  r.awards = Array.from(new Set(listSection("awards"))).slice(0, 20);

  return r;
}

/** Serialize a structured resume back to clean plain text (for ATS view / export). */
export function structuredToText(r: StructuredResume): string {
  const out: string[] = [];
  if (r.name) out.push(r.name);
  const contact = [r.location, r.phone, r.email, r.linkedin].filter(Boolean).join(" | ");
  if (contact) out.push(contact);
  out.push("");
  if (r.summary) out.push("SUMMARY", r.summary, "");
  if (r.experience.length) {
    out.push("EXPERIENCE");
    for (const e of r.experience) {
      out.push(`${e.title}${e.company ? `, ${e.company}` : ""}${e.dates ? ` — ${e.dates}` : ""}`);
      for (const b of e.bullets) out.push(`• ${b}`);
      out.push("");
    }
  }
  if (r.projects.length) {
    out.push("PROJECTS");
    for (const p of r.projects) {
      out.push(`${p.name}${p.tech ? ` (${p.tech})` : ""}`);
      if (p.description) out.push(p.description);
      for (const b of p.bullets) out.push(`• ${b}`);
      out.push("");
    }
  }
  if (r.education.length) {
    out.push("EDUCATION");
    for (const e of r.education) out.push(`${e.degree} — ${e.school}${e.dates ? `, ${e.dates}` : ""}${e.details ? `\n${e.details}` : ""}`);
    out.push("");
  }
  if (r.skills.length) out.push("SKILLS", r.skills.join(", "), "");
  if (r.certifications?.length) out.push("CERTIFICATIONS & TRAINING", ...r.certifications.map((c) => `• ${c}`), "");
  if (r.awards?.length) out.push("AWARDS & HONORS", ...r.awards.map((a) => `• ${a}`), "");
  return out.join("\n");
}

/* ------------------------------------------------------------------ */
/* LinkedIn profile parsing                                            */
/* ------------------------------------------------------------------ */

const LI_MONTHS = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec";

/** Heuristic: is this text a LinkedIn profile (vs. a resume document)? */
export function looksLikeLinkedInProfile(text: string): boolean {
  const head = text.slice(0, 600);
  if (/\|\s*LinkedIn/.test(head)) return true;
  return /linkedin\.com\/in\//i.test(text) && /\bTop skills\b/i.test(text) && /\bExperience\b/.test(text);
}
const LI_DATE_RE = new RegExp(`^(?:${LI_MONTHS})\\s\\d{4}\\s*[-–—]\\s*(?:Present|(?:${LI_MONTHS})\\s\\d{4})`);
const LI_COMPANY_CTX_RE = /^(Full-time|Part-time|Contract|Internship|Freelance|Self-employed)\s*·\s*(\d+\s*yrs?|\d+\s*mos)/;
const LI_TOTAL_DUR_RE = /^\d+\s*yrs?\s*\d*\s*mos$/;
const LI_SKILLS_TAIL_RE = /\s+and\s+\+\d+\s+skills?\.?$/i;
const LI_HEADINGS = new Set([
  "about", "experience", "education", "licenses & certifications", "licenses", "skills",
  "top skills", "featured", "activity", "projects", "honors & awards", "courses",
  "volunteer experience", "recommendations", "interests", "languages", "publications",
]);

function liClean(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0 && !isPdfJunkLine(l));
}

function liSection(lines: string[], heading: string, endHeadings: string[]): string[] {
  const start = lines.findIndex((l) => l.toLowerCase() === heading);
  if (start === -1) return [];
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (endHeadings.includes(lines[i].toLowerCase())) break;
    out.push(lines[i]);
  }
  return out;
}

function liDescriptionToBullets(descLines: string[]): string[] {
  const joined = descLines
    .join(" ")
    .replace(/…\s*more\s*…?/gi, "")
    .replace(/\s*…\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!joined) return [];
  const sentences = joined.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length >= 25);
  if (sentences.length) return sentences.slice(0, 6);
  return joined.length >= 25 ? [joined] : [];
}

/**
 * Parse a LinkedIn profile (official PDF export or browser print) into a
 * structured resume. The generic section parser mangles LinkedIn's layout,
 * so this anchors on the date-range line that starts every role block.
 */
export function parseLinkedInProfile(text: string): StructuredResume {
  const r = emptyResume();
  r.rawText = text;
  const lines = liClean(text);

  // Name: first short line before the About/Experience headings.
  const firstHeading = lines.findIndex((l) => LI_HEADINGS.has(l.toLowerCase()));
  const head = lines.slice(0, firstHeading === -1 ? 6 : firstHeading);
  r.name = head.find((l) => l.length > 2 && l.length < 50 && !/[@|·\d]/.test(l) && !/followers|connections/i.test(l)) ?? "";
  r.email = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] ?? "";
  r.linkedin = text.match(/(linkedin\.com\/[^\s)]+)/i)?.[0] ?? "";
  const locMatch = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,\s*[A-Z][a-z]+(?:,\s*United States)?)\b/);
  r.location = locMatch ? locMatch[0] : "";

  // About -> summary
  const about = liSection(lines, "about", ["top skills", "featured", "activity", "experience", "education"]);
  r.summary = about.join(" ").replace(/…\s*more\s*…?/gi, "").trim().slice(0, 1200);

  // Top skills (bulleted with • in exports, · in prints). Join the block's
  // lines first — skill names wrap across lines ("Executive Protection &" /
  // "Investigations" is one skill).
  const skills = new Set<string>();
  const topIdx = lines.findIndex((l) => l.toLowerCase() === "top skills");
  if (topIdx !== -1) {
    const block: string[] = [];
    for (let i = topIdx + 1; i < Math.min(lines.length, topIdx + 4); i++) {
      if (LI_HEADINGS.has(lines[i].toLowerCase())) break;
      block.push(lines[i]);
    }
    for (const part of block.join(" ").split(/[•·]/)) {
      const s = part.trim();
      if (s && s.length < 60) skills.add(s);
    }
  }

  // Experience — date-anchored blocks
  const expLines = liSection(lines, "experience", ["education", "licenses & certifications", "skills", "projects", "honors & awards", "volunteer experience", "courses"]);
  let currentCompany = "";
  let i = 0;
  while (i < expLines.length) {
    const line = expLines[i];
    // Company context header: "USAA" followed by "Full-time · 5 yrs 1 mo"
    if (i + 1 < expLines.length && (LI_COMPANY_CTX_RE.test(expLines[i + 1]) || LI_TOTAL_DUR_RE.test(expLines[i + 1]))) {
      currentCompany = line;
      i += 2;
      continue;
    }
    if (LI_DATE_RE.test(line)) {
      // Title/company sit above the date line.
      let title = "";
      let company = currentCompany;
      const above1 = expLines[i - 1] ?? "";
      const above2 = expLines[i - 2] ?? "";
      if (above1.includes("·") && !LI_DATE_RE.test(above1)) {
        company = above1.split("·")[0].trim();
        title = above2;
        // Wrapped title continuation ("…Investigative Services" / "(CSIS)")
        const above3 = expLines[i - 3] ?? "";
        if (title.startsWith("(") && above3 && !LI_DATE_RE.test(above3) && !LI_HEADINGS.has(above3.toLowerCase())) {
          title = `${above3} ${title}`;
        }
      } else {
        title = above1;
      }
      // Collect description lines until the next block starts.
      const desc: string[] = [];
      let j = i + 1;
      while (j < expLines.length) {
        const l = expLines[j];
        if (LI_DATE_RE.test(l)) break;
        if (j + 1 < expLines.length && (LI_COMPANY_CTX_RE.test(expLines[j + 1]) || LI_TOTAL_DUR_RE.test(expLines[j + 1]))) break;
        // Next role's title (its company line or date line follows)
        if (j + 1 < expLines.length && LI_DATE_RE.test(expLines[j + 1])) break;
        if (j + 2 < expLines.length && LI_DATE_RE.test(expLines[j + 2]) && expLines[j + 1].includes("·")) break;
        if (LI_SKILLS_TAIL_RE.test(l) || /\+\d+\s+skills?\.?$/i.test(l)) {
          for (const part of l.replace(LI_SKILLS_TAIL_RE, "").split(/,|\s+and\s+/)) {
            const s = part.trim();
            if (s && s.length < 60) skills.add(s);
          }
          j++;
          continue;
        }
        // Location line right after the dates
        if (desc.length === 0 && (/·\s*(On-site|Remote|Hybrid)/.test(l) || l === "United States" || l === "Remote" || /^[A-Z][\w .]+,\s*[A-Z]{2}/.test(l) || /,\s*United States$/.test(l))) {
          j++;
          continue;
        }
        desc.push(l);
        j++;
      }
      if (title && !LI_HEADINGS.has(title.toLowerCase())) {
        r.experience.push({ title, company, dates: line, bullets: liDescriptionToBullets(desc) });
      }
      i = j;
      continue;
    }
    i++;
  }

  // Education — first school/degree pair
  const eduLines = liSection(lines, "education", ["licenses & certifications", "skills", "experience", "courses", "honors & awards"]);
  if (eduLines.length >= 2) {
    r.education.push({ school: eduLines[0], degree: eduLines[1], dates: eduLines.slice(2).join(" ").match(/((19|20)\d{2})/g)?.join(" – ") ?? "", details: "" });
  } else if (eduLines.length === 1) {
    r.education.push({ school: eduLines[0], degree: "", dates: "", details: "" });
  }

  r.certifications = liSection(lines, "licenses & certifications", ["skills", "experience", "education", "courses", "honors & awards", "volunteer experience", "projects"])
    .filter((l) => l.length > 3).slice(0, 12);
  r.awards = liSection(lines, "honors & awards", ["skills", "experience", "education", "courses", "licenses & certifications", "volunteer experience", "projects"])
    .filter((l) => l.length > 3).slice(0, 12);

  r.skills = Array.from(skills).slice(0, 24);
  return r;
}
