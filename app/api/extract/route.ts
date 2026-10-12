import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side document text extraction for formats the browser can't read
 * reliably — above all the legacy Word .doc (OLE) format, which is what a
 * large share of veteran resumes still are. .docx handled as a convenience.
 */

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
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
