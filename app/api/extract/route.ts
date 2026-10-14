import { NextRequest, NextResponse } from "next/server";
import { EXTRACT_RATE_LIMIT, checkRateLimit, clientIpFromHeaders } from "@/lib/rate-limit";

/**
 * Server-side document text extraction for formats the browser can't read
 * reliably — above all the legacy Word .doc (OLE) format, which is what a
 * large share of veteran resumes still are. .docx handled as a convenience.
 */

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  // RR-07: per-IP throttle in the /api/ai idiom — 20 requests / 10
  // minutes / IP (EXTRACT_RATE_LIMIT; parsing up to 10 MB uploads is
  // heavier than an AI call, so the limit is tighter). Checked before
  // any parsing work; over-limit is a 429 in this route's JSON shape.
  const throttle = checkRateLimit(
    `extract:${clientIpFromHeaders((n) => req.headers.get(n))}`,
    EXTRACT_RATE_LIMIT.limit,
    EXTRACT_RATE_LIMIT.windowMs
  );
  if (!throttle.allowed) {
    return NextResponse.json(
      { error: "You've uploaded a lot of files in a short stretch — please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(throttle.retryAfterSeconds) } }
    );
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File is larger than 10 MB" }, { status: 413 });
  }
  const name = file.name.toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());
  try {
    if (name.endsWith(".doc")) {
      // @ts-expect-error optional runtime dependency for legacy .doc support
      const WordExtractor = (await import("word-extractor")).default as new () => {
        extract: (b: Buffer) => Promise<{ getBody: () => string }>;
      };
      const doc = await new WordExtractor().extract(buf);
      const text = doc.getBody();
      if (!text || text.trim().length < 30) throw new Error("empty");
      return NextResponse.json({ text });
    }
    if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const r = await mammoth.extractRawText({ buffer: buf });
      return NextResponse.json({ text: r.value });
    }
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  } catch {
    return NextResponse.json({ error: "Could not read that document." }, { status: 422 });
  }
}
