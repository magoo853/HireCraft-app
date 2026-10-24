import { readFileSync } from "fs";
import path from "path";

/* Serves the pdf.js worker from the installed pdfjs-dist package so PDF
 * parsing never depends on an outside CDN. Same-origin is what makes it
 * reliable: it passes CSP for both the module worker and pdf.js's
 * main-thread fallback import, and the version always matches the
 * pdf.js API the client bundles. Prerendered at build time
 * (force-static), when node_modules is guaranteed present; the
 * outputFileTracingIncludes entry in next.config.js covers runtime
 * serving if prerendering is ever skipped. */
export const dynamic = "force-static";
export const runtime = "nodejs";

export function GET() {
  const worker = readFileSync(
    path.join(process.cwd(), "node_modules/pdfjs-dist/build/pdf.worker.min.mjs")
  );
  return new Response(worker, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
    },
  });
}
