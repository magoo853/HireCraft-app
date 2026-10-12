import { NextRequest, NextResponse } from "next/server";
import type { JobPosting } from "@/lib/jobs";

/**
 * Job-posting search for alerts. Fans out to free, no-key job APIs
 * (Arbeitnow, Remotive) plus USAJobs when the server has credentials.
 * Each source fails independently — a dead source never breaks the check.
 */

export const runtime = "nodejs";
export const maxDuration = 30;

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

async function fromArbeitnow(q: string): Promise<JobPosting[]> {
  const j = (await fetchJson(`https://www.arbeitnow.com/api/job-board-api?search=${encodeURIComponent(q)}`)) as {
    data?: Record<string, unknown>[];
  };
  return (j.data ?? []).slice(0, 25).map((d) => ({
    id: `arbeitnow-${String(d.slug ?? d.url ?? "")}`,
    source: "Arbeitnow",
    title: String(d.title ?? ""),
    company: String(d.company_name ?? ""),
    location: String(d.location ?? (d.remote ? "Remote" : "")),
    url: String(d.url ?? ""),
    postedAt: d.created_at ? new Date(Number(d.created_at) * 1000).toISOString() : "",
    description: stripHtml(String(d.description ?? "")).slice(0, 1500),
  }));
}

async function fromRemotive(q: string): Promise<JobPosting[]> {
  const j = (await fetchJson(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(q)}&limit=25`)) as {
    jobs?: Record<string, unknown>[];
  };
  return (j.jobs ?? []).map((d) => ({
    id: `remotive-${String(d.id ?? d.url ?? "")}`,
    source: "Remotive",
    title: String(d.title ?? ""),
    company: String(d.company_name ?? ""),
    location: String(d.candidate_required_location ?? "Remote"),
    url: String(d.url ?? ""),
    postedAt: String(d.publication_date ?? ""),
    description: stripHtml(String(d.description ?? "")).slice(0, 1500),
  }));
}

async function fromUsaJobs(q: string, location: string): Promise<JobPosting[]> {
  const key = process.env.USAJOBS_API_KEY;
  const email = process.env.USAJOBS_EMAIL;
  if (!key || !email) return [];
  const params = new URLSearchParams({ Keyword: q, ResultsPerPage: "25" });
  if (location) params.set("LocationName", location);
  const j = (await fetchJson(`https://data.usajobs.gov/api/search?${params}`, {
    "Authorization-Key": key,
    "User-Agent": email,
    Host: "data.usajobs.gov",
  })) as { SearchResult?: { SearchResultItems?: Record<string, unknown>[] } };
  const items = j.SearchResult?.SearchResultItems ?? [];
  return items.map((it) => {
    const d = (it.MatchedObjectDescriptor ?? {}) as Record<string, unknown>;
    const locs = (d.PositionLocation ?? []) as Record<string, unknown>[];
    return {
      id: `usajobs-${String(d.PositionID ?? "")}`,
      source: "USAJobs",
      title: String(d.PositionTitle ?? ""),
      company: String(d.OrganizationName ?? ""),
      location: locs.map((l) => String(l.LocationName ?? "")).filter(Boolean).join("; "),
      url: String(d.PositionURI ?? ""),
      postedAt: String(d.PublicationStartDate ?? ""),
      description: stripHtml(String((d.UserArea as Record<string, unknown>)?.Details ? String(((d.UserArea as Record<string, unknown>).Details as Record<string, unknown>)?.JobSummary ?? "") : "")).slice(0, 1500),
    };
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const role = (searchParams.get("role") || "").slice(0, 80).trim();
  const company = (searchParams.get("company") || "").slice(0, 80).trim();
  const location = (searchParams.get("location") || "").slice(0, 80).trim();
  if (!role && !company) {
    return NextResponse.json({ error: "role or company required" }, { status: 400 });
  }
  const q = [role, company].filter(Boolean).join(" ");
  const settled = await Promise.allSettled([
    fromArbeitnow(q),
    fromRemotive(q),
    fromUsaJobs(q, location),
  ]);
  let postings: JobPosting[] = [];
  for (const s of settled) if (s.status === "fulfilled") postings = postings.concat(s.value);

  // Server-side company/location narrowing (source search is loose).
  if (company) {
    const c = company.toLowerCase();
    const filtered = postings.filter((p) => p.company.toLowerCase().includes(c));
    if (filtered.length) postings = filtered;
  }
  if (location) {
    const l = location.toLowerCase();
    const filtered = postings.filter(
      (p) => p.location.toLowerCase().includes(l) || /remote/i.test(p.location)
    );
    if (filtered.length) postings = filtered;
  }

  const seen = new Set<string>();
  postings = postings.filter((p) => {
    if (!p.title || !p.url || seen.has(p.url)) return false;
    seen.add(p.url);
    return true;
  });

  return NextResponse.json(
    { postings: postings.slice(0, 40) },
    { headers: { "Cache-Control": "s-maxage=600, stale-while-revalidate=1200" } }
  );
}
