import { StructuredResume, emptyResume } from "./types";

/* Client-side resume parsing: PDF / DOCX / TXT -> text -> structured resume */

export async function parseFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return parsePdf(file);
  if (ext === "docx") return parseDocx(file);
  return file.text();
}

async function parsePdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
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
export function textToStructured(text: string): StructuredResume {
  const r = emptyResume();
  r.rawText = text;
  const lines = text.split("\n").map((l) => l.trim());

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
