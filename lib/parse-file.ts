/* Client-side file ingestion: PDF / DOCX / TXT -> plain text. Split out
 * of ./parse so tabs that never read files don't pay for the extraction
 * machinery (including the lazily-loaded pdf.js / mammoth chunks) in
 * First Load JS. Structuring (text -> StructuredResume) stays in ./parse. */
import { DATE_RANGE_RE, DATE_OPEN_RE } from "./date-res";

// Last-resort fallback if the bundled worker (see parsePdf) can't load.
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
  // Worker sources, in order:
  // 1. /pdf-worker — a route handler that serves the worker straight
  //    from the installed pdfjs-dist (see app/pdf-worker/route.ts).
  //    Same-origin, so it always exists in the deployment, always
  //    matches the API version, and passes CSP for both the real
  //    worker and pdf.js's main-thread fallback. This is primary: the
  //    old CDN-first order left users with no working path when the
  //    CDN fetch failed — the CDN copy was the only one that existed
  //    (the public/ copy never reaches the Vercel deployment) and the
  //    fallback import of the CDN module is blocked by script-src.
  // 2. The jsDelivr CDN copy.
  // 3. The legacy public/ path, if a build ever includes it.
  const workers = ["/pdf-worker", PDFJS_CDN_WORKER, "/pdf.worker.min.mjs"];
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

interface PdfItemLike {
  str: string;
  transform: number[];
  width?: number;
}

interface PositionedItem {
  str: string;
  x: number;
  y: number;
  xEnd: number;
}

/**
 * The original line reconstruction: group items on rounded Y and join
 * left-to-right in stream order. Kept verbatim as the fallback — any page
 * that does not show a strong two-column signal extracts byte-identically
 * to how it always has.
 */
function legacyPageText(items: PdfItemLike[]): string {
  const lines = new Map<number, string[]>();
  for (const it of items) {
    const y = Math.round(it.transform[5]);
    if (!lines.has(y)) lines.set(y, []);
    lines.get(y)!.push(it.str);
  }
  const sorted = Array.from(lines.entries()).sort((a, b) => b[0] - a[0]);
  return sorted.map(([, parts]) => parts.join(" ").trim()).filter(Boolean).join("\n");
}

/**
 * Detect a two-column page layout from positioned text items; returns the
 * split X when the signal is strong, else null. Conservative by design —
 * every guard must pass:
 *  - enough items spread over a real page width;
 *  - a page-wide vertical gutter (>= 20pt of empty X between the left
 *    group's text ends and the right group's starts);
 *  - both groups substantial (>= 4 core items and >= 20% of items) and
 *    spanning at least 45% of the page's content height (a centered
 *    header block fails this — its "column" lives only at the top);
 *  - nothing but genuinely page-wide lines (a name/contact header)
 *    crosses the split — a normal-width line crossing it means the page
 *    is one text flow, not two columns;
 *  - neither group is mostly date ranges — that is a table (a dates
 *    column beside a header column), whose row pairing must be kept.
 */
function detectColumnSplit(items: PositionedItem[]): number | null {
  if (items.length < 10) return null;
  const minX = Math.min(...items.map((i) => i.x));
  const contentWidth = Math.max(...items.map((i) => i.xEnd)) - minX;
  if (contentWidth < 200) return null;
  const contentHeight = Math.max(...items.map((i) => i.y)) - Math.min(...items.map((i) => i.y));
  if (contentHeight <= 0) return null;
  const dateLike = (s: string) =>
    DATE_RANGE_RE.test(s) || DATE_OPEN_RE.test(s) || /^\d{4}$/.test(s.trim());

  const starts = Array.from(new Set(items.map((i) => Math.round(i.x)))).sort((a, b) => a - b);
  let best: { split: number; gutter: number } | null = null;
  for (let k = 0; k + 1 < starts.length; k++) {
    // Provisional groups by start position; the split itself is placed in
    // the middle of the empty gutter band between them, so left-column
    // text that merely extends rightward never counts as crossing it.
    const left = items.filter((i) => i.x < starts[k + 1]);
    const right = items.filter((i) => i.x >= starts[k + 1]);
    if (left.length < 4 || right.length < 4) continue;
    if (left.length < items.length * 0.2 || right.length < items.length * 0.2) continue;
    const leftCore = left.filter((i) => i.xEnd <= starts[k + 1]);
    if (leftCore.length < 4) continue;
    const bandLo = Math.max(...leftCore.map((i) => i.xEnd));
    const bandHi = Math.min(...right.map((i) => i.x));
    const gutter = bandHi - bandLo;
    if (gutter < 20) continue;
    const split = (bandLo + bandHi) / 2;
    const crossers = left.filter((i) => i.xEnd > split);
    if (crossers.some((i) => i.xEnd - i.x < contentWidth * 0.5)) continue;
    const span = (g: PositionedItem[]) =>
      Math.max(...g.map((i) => i.y)) - Math.min(...g.map((i) => i.y));
    if (span(left) < contentHeight * 0.45 || span(right) < contentHeight * 0.45) continue;
    const dateShare = (g: PositionedItem[]) => g.filter((i) => dateLike(i.str)).length / g.length;
    if (dateShare(leftCore) > 0.5 || dateShare(right) > 0.5) continue;
    if (!best || gutter > best.gutter) best = { split, gutter };
  }
  return best?.split ?? null;
}

/** Render one page's items column by column: each column's lines top to
 * bottom (items within a line ordered by X), left column first. */
function columnPageText(items: PositionedItem[], split: number): string {
  const render = (group: PositionedItem[]) => {
    const lines = new Map<number, PositionedItem[]>();
    for (const it of group) {
      const y = Math.round(it.y);
      if (!lines.has(y)) lines.set(y, []);
      lines.get(y)!.push(it);
    }
    return Array.from(lines.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([, parts]) =>
        parts
          .sort((a, b) => a.x - b.x)
          .map((p) => p.str)
          .join(" ")
          .trim()
      )
      .filter(Boolean);
  };
  const left = items.filter((i) => i.x < split);
  const right = items.filter((i) => i.x >= split);
  return [...render(left), ...render(right)].join("\n");
}

function extractPageText(items: PdfItemLike[]): string {
  // Column detection needs trustworthy geometry for every text item; if
  // any item lacks a usable position or width, fall back to the legacy
  // reconstruction for the whole page.
  const positioned: PositionedItem[] = [];
  for (const it of items) {
    const t = it?.transform;
    if (
      !it ||
      typeof it.str !== "string" ||
      !it.str.trim() ||
      !Array.isArray(t) ||
      typeof t[4] !== "number" ||
      typeof t[5] !== "number" ||
      typeof it.width !== "number" ||
      !Number.isFinite(it.width)
    ) {
      return legacyPageText(items);
    }
    positioned.push({ str: it.str, x: t[4], y: t[5], xEnd: t[4] + Math.max(0, it.width) });
  }
  const split = detectColumnSplit(positioned);
  return split === null ? legacyPageText(items) : columnPageText(positioned, split);
}

export async function extractPdfText(pdf: { numPages: number; getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: unknown[] }> }> }): Promise<string> {
  const pages: string[] = [];
  for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items as PdfItemLike[];
    pages.push(extractPageText(items));
  }
  return pages.join("\n\n");
}

async function parseDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return result.value;
}
