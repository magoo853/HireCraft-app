import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { BlockedHostError, FetchLikeResponse, fetchWithGuardedRedirects } from "@/lib/fetch-guarded";
import { isBlockedHost } from "@/lib/url-guard";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Fetch a job posting URL and extract readable text. Falls back gracefully. */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("bad protocol");
  } catch {
    return NextResponse.json({ error: "That doesn't look like a valid http(s) URL. Paste the job text manually instead." }, { status: 400 });
  }

  // S-batch (log #17) + RR-07: SSRF guard — never fetch localhost or
  // literal private/loopback/link-local addresses. Redirects are now
  // followed manually (lib/fetch-guarded.ts) with this same guard
  // re-checked on EVERY hop, so a public URL cannot bounce the server
  // to a private address. (Literal host only; a public hostname
  // resolving to a private address is not stopped — see lib/url-guard.ts.)
  if (isBlockedHost(parsed.hostname)) {
    return NextResponse.json({ error: "That URL points to a local or private address, so it can't be fetched. Paste the job text manually instead." }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    let res: FetchLikeResponse;
    try {
      ({ response: res } = await fetchWithGuardedRedirects(parsed, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
          Accept: "text/html,application/xhtml+xml",
        },
      }));
    } catch (e) {
      if (e instanceof BlockedHostError) {
        return NextResponse.json({ error: "That URL points to a local or private address, so it can't be fetched. Paste the job text manually instead." }, { status: 400 });
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();
    const $ = cheerio.load(html);
    $("script, style, nav, header, footer, iframe, noscript, svg").remove();

    const candidates = [
      '[class*="job-description"]', '[class*="jobDescription"]', '[id*="job-description"]',
      '[class*="description"]', "article", "main", '[role="main"]',
    ];
    let text = "";
    for (const sel of candidates) {
      const el = $(sel).first();
      if (el.length) {
        text = el.text().replace(/\s+/g, " ").trim();
        if (text.length > 300) break;
      }
    }
    if (text.length < 300) {
      text = $("body").text().replace(/\s+/g, " ").trim();
    }
    text = text.slice(0, 20000);

    if (text.length < 200) {
      return NextResponse.json({
        error: "Couldn't extract enough text from that page (it may block scrapers or require login). Paste the job description manually below.",
      }, { status: 422 });
    }
    return NextResponse.json({ text, url: parsed.toString() });
  } catch (e) {
    return NextResponse.json({
      error: "Couldn't fetch that page (blocked or timed out). Paste the job description manually below — tailoring works the same.",
    }, { status: 422 });
  }
}
