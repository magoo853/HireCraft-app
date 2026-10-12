import { StructuredResume, emptyResume } from "./types";

/* Client-side resume parsing: PDF / DOCX / TXT -> text -> structured resume */

// Keep the major version in sync with the pdfjs-dist dependency in package.json.
const PDFJS_CDN_WORKER = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4/build/pdf.worker.min.mjs";

export async function parseFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return parsePdf(file);
  if (ext === "docx") return parseDocx(file);
  if (ext === "doc") {
    throw new Error("That's an older Word .doc file, which browsers can't read reliably. In Word: File → Save As → PDF (or .docx), then upload that instead.");
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

const SECTION_HEADERS: [RegExp, keyof Pick<StructuredResume, "summary" | "experience" | "education" | "skills"> | "projects"][] = [
  [/^(professional\s+)?summary$/i, "summary"],
  [/^objective$/i, "summary"],
  [/^profile$/i, "summary"],
  [/^(work\s+)?experience$/i, "experience"],
  [/^employment(\s+history)?$/i, "experience"],
  [/^professional\s+experience$/i, "experience"],
  [/^military\s+(experience|service)$/i, "experience"],
  [/^education$/i, "education"],
  [/^(technical\s+)?skills$/i, "skills"],
  [/^core\s+competencies$/i, "skills"],
  [/^projects?$/i, "projects"],
];

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

export function textToStructured(text: string): StructuredResume {
  // LinkedIn profile PDFs (official export or browser print) need their own parser.
  if (looksLikeLinkedInProfile(text)) return parseLinkedInProfile(text);
  const r = emptyResume();
  r.rawText = text;
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => !isPdfJunkLine(l));

  // Contact block: first ~6 lines
  const head = lines.slice(0, 8).join("\n");
  r.email = head.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] ?? "";
  r.phone = head.match(/(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)?.[0] ?? "";
  r.linkedin = head.match(/(linkedin\.com\/[^\s)]+)/i)?.[0] ?? "";
  const locMatch = head.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*([A-Z]{2})\b/);
  r.location = locMatch ? locMatch[0] : "";
  const nameLine = lines.find((l) => l.length > 2 && l.length < 60 && !/[@\d]/.test(l) && !/summary|resume|curriculum/i.test(l));
  r.name = nameLine ?? "";

  // Section split
  const sections = new Map<string, string[]>();
  let current: string | null = null;
  for (const line of lines) {
    const header = SECTION_HEADERS.find(([re]) => re.test(line.trim()));
    if (header) {
      current = header[1];
      if (!sections.has(current)) sections.set(current, []);
      continue;
    }
    if (current) sections.get(current)!.push(line);
  }

  r.summary = (sections.get("summary") ?? []).filter((l) => l.length > 10).join(" ");

  const expLines = sections.get("experience") ?? [];
  let currentJob: StructuredResume["experience"][number] | null = null;
  const dateRe = /((19|20)\d{2}|present|current)/i;
  for (const line of expLines) {
    if (/^[•\-\*▪◦‣·]/.test(line) || /^\d+[.)]\s/.test(line)) {
      const bullet = line.replace(/^[•\-\*▪◦‣·]\s*/, "").replace(/^\d+[.)]\s*/, "").trim();
      if (currentJob) currentJob.bullets.push(bullet);
      else {
        currentJob = { title: "", company: "", dates: "", bullets: [bullet] };
        r.experience.push(currentJob);
      }
    } else if (line.length > 3) {
      // Likely a job header: "Title, Company — dates" or "Title | Company"
      const hasDate = dateRe.test(line);
      const looksLikeHeader = hasDate || line.length < 90;
      if (looksLikeHeader) {
        const parts = line.split(/[,|–—\-]\s*(?=[A-Z])/);
        currentJob = {
          title: parts[0]?.trim() ?? line,
          company: parts[1]?.trim() ?? "",
          dates: (line.match(/((19|20)\d{2}\s*[-–—]\s*((19|20)\d{2}|present|current))/i)?.[0] ?? ""),
          bullets: [],
        };
        r.experience.push(currentJob);
      } else if (currentJob) {
        currentJob.bullets.push(line);
      }
    }
  }

  const eduLines = (sections.get("education") ?? []).filter((l) => l.length > 3);
  if (eduLines.length) {
    r.education.push({
      school: eduLines[0] ?? "",
      degree: eduLines[1] ?? "",
      dates: eduLines.join(" ").match(/((19|20)\d{2})/g)?.join(" – ") ?? "",
      details: eduLines.slice(2).join(" "),
    });
  }

  const skillText = (sections.get("skills") ?? []).join(" ");
  r.skills = skillText
    .split(/[,;•\n|]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 40)
    .slice(0, 30);

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
  if (r.skills.length) out.push("SKILLS", r.skills.join(", "));
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

  r.skills = Array.from(skills).slice(0, 24);
  return r;
}
