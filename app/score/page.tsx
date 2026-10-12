"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { atsSimulate, scoreResume, findMilitaryJargonDetailed } from "@/lib/fallback";
import { Button, Card, EmptyState, SectionTitle, ScoreRing, ModeBadge, Pill, TargetJobBanner } from "@/components/ui";

function flagCta(title: string): { href: string; label: string } | null {
  const t = title.toLowerCase();
  if (t.includes("quantified")) return { href: "/rewrite", label: "Fix in rewrites →" };
  if (t.includes("email") || t.includes("phone") || t.includes("linkedin")) return { href: "/resume", label: "Fix on Resume tab →" };
  if (t.includes("thin") || t.includes("long")) return { href: "/rewrite", label: "Fix in rewrites →" };
  return { href: "/design", label: "Use a safe template →" };
}

export default function ScorePage() {
  const { resume, jobText, mode, hasResume } = useApp();
  const [tab, setTab] = useState<"score" | "ats">("score");
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (k: string) => setOpen((o) => (o === k ? null : k));

  const result = useMemo(
    () => (hasResume ? scoreResume(resume, jobText) : null),
    [resume, jobText, hasResume]
  );
  const sim = useMemo(() => (hasResume ? atsSimulate(resume) : null), [resume, hasResume]);
  const jargon = useMemo(
    () => (mode === "veteran" && hasResume ? findMilitaryJargonDetailed(resume.rawText) : []),
    [mode, resume, hasResume]
  );

  if (!hasResume || !result || !sim) {
    return (
      <EmptyState
        title="No resume yet"
        body="Add your resume first — then we'll score it exactly the way applicant tracking software does."
        cta="Add my resume" href="/resume"
      />
    );
  }

  const matchedKw = result.keywords.filter((k) => k.matched);
  const missingKw = result.keywords.filter((k) => !k.matched);
  const formatFlags = result.flags.filter((f) =>
    /table|column|caps|layout/i.test(f.title)
  );

  const kpis: { key: string; label: string; pct: number }[] = [
    { key: "keyword", label: "Keyword match", pct: result.keywordMatchPct },
    { key: "readability", label: "Readability", pct: result.readability.score },
    { key: "format", label: "Format safety", pct: Math.round((result.breakdown.formatting / 10) * 100) },
  ];

  const breakdownRows: { label: string; pts: number; max: number; hint: string }[] = [
    { label: "Keyword match", pts: result.breakdown.keyword, max: 40, hint: `${matchedKw.length} of ${result.keywords.length} keywords found in your resume` },
    { label: "Quantified achievements", pts: result.breakdown.quantified, max: 15, hint: `${result.quantifiedCount} bullets carry numbers — 5+ maxes this out` },
    { label: "Action verbs", pts: result.breakdown.actionVerbs, max: 10, hint: "Bullets opening with strong verbs (Led, Built, Delivered…) — 8+ maxes this out" },
    { label: "Contact info", pts: result.breakdown.contact, max: 10, hint: "Email 4 · phone 3 · location 2 · LinkedIn 1" },
    { label: "Sections present", pts: result.breakdown.sections, max: 15, hint: "Summary 4 · experience 5 · education 3 · skills 3" },
    { label: "Format safety", pts: result.breakdown.formatting, max: 10, hint: "Starts at 10 — tables, columns, and caps blocks deduct" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-extrabold text-navy">Resume Score</h2>
        <ModeBadge mode={mode} />
      </div>

      <TargetJobBanner />

      <div className="grid grid-cols-2 gap-1 bg-slate-200/60 rounded-xl p-1 mb-4">
        {([ "score", "ats"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg py-2.5 text-sm font-bold min-h-[44px] ${tab === t ? "bg-white text-ink shadow-sm" : "text-muted"}`}>
            {t === "score" ? "Score" : "ATS simulator"}
          </button>
        ))}
      </div>

      {tab === "score" && (
        <>
          <Card className="mb-3">
            <div className="flex gap-4 items-center">
              <ScoreRing score={result.total} />
              <div className="flex-1 min-w-0">
                {kpis.map((k) => (
                  <button key={k.key} onClick={() => toggle(k.key)} className="block w-full text-left mb-2.5 last:mb-0 min-h-[36px]">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted">{k.label} <span className="text-brand font-bold">{open === k.key ? "▾" : "▸"}</span></span>
                      <b className="text-ink">{k.pct}%</b>
                    </div>
                    <div className="h-[7px] rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${k.pct}%` }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {open === "keyword" && (
              <div className="mt-3 pt-3 border-t border-line">
                <p className="text-xs text-muted leading-snug mb-2">
                  {result.keywordBasis === "job"
                    ? "Judged against the job posting shown above."
                    : <>No posting set — judged against a <b className="text-ink">generic checklist for a {result.genericTitle}</b>. Paste a real posting on the Resume tab and this becomes an exact read.</>}
                </p>
                {matchedKw.length > 0 && (
                  <>
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted mb-1.5">Found in your resume ({matchedKw.length})</p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {matchedKw.map((k) => (
                        <span key={k.term} className="text-xs font-bold bg-mint text-emerald-900 rounded-full px-2.5 py-1.5">✓ {k.term}</span>
                      ))}
                    </div>
                  </>
                )}
                {missingKw.length > 0 && (
                  <>
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted mb-1.5">Missing ({missingKw.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {missingKw.map((k) => (
                        <span key={k.term} className="text-xs font-semibold bg-red-50 text-red-800 border border-red-200 rounded-full px-2.5 py-1.5">{k.term}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {open === "readability" && (
              <div className="mt-3 pt-3 border-t border-line">
                <p className="text-xs text-muted leading-snug mb-2">
                  Recruiters skim — this measures how dense your text feels. Your bullets average{" "}
                  <b className="text-ink">{result.readabilityDetail.avgWordsPerBullet} words</b> (aim for 10–25) and your
                  sentences average <b className="text-ink">{result.readabilityDetail.avgWordsPerSentence} words</b>.
                  Resume fragments have no sentence punctuation, so long unbroken bullets tank this score.
                </p>
                {result.readabilityDetail.longestBullets.length > 0 && (
                  <>
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted mb-1.5">Your densest bullets</p>
                    <div className="grid gap-1.5">
                      {result.readabilityDetail.longestBullets.map((b, i) => (
                        <p key={i} className="text-xs text-ink bg-paper border border-line rounded-lg px-2.5 py-2 leading-snug">“{b.length > 140 ? `${b.slice(0, 140)}…` : b}”</p>
                      ))}
                    </div>
                    <p className="text-xs text-muted mt-2">Split each into a result + how, or let <Link href="/rewrite" className="font-bold text-brand underline underline-offset-2">Rewrites</Link> tighten them.</p>
                  </>
                )}
              </div>
            )}

            {open === "format" && (
              <div className="mt-3 pt-3 border-t border-line">
                {formatFlags.length > 0 ? (
                  <div className="grid gap-2">
                    {formatFlags.map((f, i) => (
                      <div key={i}>
                        <p className="text-[13px] font-bold text-ink">{f.title}</p>
                        <p className="text-xs text-muted leading-snug">{f.detail}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted leading-snug">
                    No parser hazards found. Checked for: table characters, multi-column pipe layouts, and heavy ALL-CAPS blocks.{" "}
                    {result.breakdown.formatting < 10 ? "Your remaining deductions are under “How your score is built” below (length/contact)." : "Full marks."}
                  </p>
                )}
              </div>
            )}

            <p className="text-xs text-muted mt-3">
              Grade <b className="text-ink">{result.grade}</b> · {result.bulletCount} bullets · {result.quantifiedCount} quantified · {result.readability.label.toLowerCase()}
              {result.keywordBasis === "job" ? " · scored against your job posting" : " · generic checklist — add a posting for a sharper read"}
            </p>

            <button onClick={() => toggle("breakdown")} className="text-xs font-bold text-brand underline underline-offset-2 min-h-[40px] mt-1">
              {open === "breakdown" ? "Hide" : "How your score is built"} {open === "breakdown" ? "▾" : "▸"}
            </button>
            {open === "breakdown" && (
              <div className="mt-1 grid gap-2">
                {breakdownRows.map((r) => (
                  <div key={r.label} className="flex items-baseline justify-between gap-3 bg-paper border border-line rounded-lg px-2.5 py-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-ink">{r.label}</p>
                      <p className="text-xs text-muted leading-snug">{r.hint}</p>
                    </div>
                    <b className={`text-sm shrink-0 ${r.pts === r.max ? "text-emerald-700" : "text-ink"}`}>{r.pts}/{r.max}</b>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {missingKw.length > 0 && (
            <div className="bg-white border border-line rounded-xl p-3 mb-2">
              <button onClick={() => toggle("missing")} className="flex gap-2.5 w-full text-left min-h-[44px]">
                <span className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center text-sm shrink-0">⚠️</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-ink">{missingKw.length} keywords missing <span className="text-brand">{open === "missing" ? "▾" : "▸"}</span></p>
                  <p className="text-xs text-muted leading-snug">
                    {result.keywordBasis === "job" ? "From the posting above" : `From a generic ${result.genericTitle} checklist`} — tap to see all of them.
                  </p>
                </div>
              </button>
              {open === "missing" && (
                <div className="flex flex-wrap gap-1.5 mt-2 ml-9">
                  {missingKw.map((k) => (
                    <span key={k.term} className="text-xs font-semibold bg-red-50 text-red-800 border border-red-200 rounded-full px-2.5 py-1.5">{k.term}</span>
                  ))}
                </div>
              )}
              <div className="ml-9 mt-2">
                <Link href="/rewrite"><Pill tone="bad">Fix in rewrites →</Pill></Link>
              </div>
            </div>
          )}

          {result.flags.map((f, i) => {
            const cta = f.level === "good" ? null : flagCta(f.title);
            return (
              <div key={i} className="bg-white border border-line rounded-xl p-3 flex gap-2.5 mb-2">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 ${f.level === "good" ? "bg-mint" : "bg-amber-100"}`}>
                  {f.level === "good" ? "✓" : "📄"}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-ink">{f.title}</p>
                  <p className="text-xs text-muted leading-snug">{f.detail}</p>
                  {cta && <Link href={cta.href}><Pill tone={f.level === "warn" ? "warn" : "ok"}>{cta.label}</Pill></Link>}
                </div>
              </div>
            );
          })}

          {jargon.length > 0 && (
            <div className="bg-white border border-line rounded-xl p-3 mb-2">
              <button onClick={() => toggle("jargon")} className="flex gap-2.5 w-full text-left min-h-[44px]">
                <span className="w-7 h-7 rounded-lg bg-mint flex items-center justify-center text-sm shrink-0">🎖</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-ink">Military jargon spotted ({jargon.length}) <span className="text-brand">{open === "jargon" ? "▾" : "▸"}</span></p>
                  <p className="text-xs text-muted leading-snug">Recruiters won't know these terms. Tap to see each one and its civilian translation.</p>
                </div>
              </button>
              {open === "jargon" && (
                <div className="grid gap-1.5 mt-2 ml-9">
                  {jargon.map((j) => (
                    <p key={j.term} className="text-xs bg-paper border border-line rounded-lg px-2.5 py-2">
                      <b className="text-ink">{j.term}</b> <span className="text-muted">→ say</span> <span className="text-emerald-900 font-semibold">{j.civilian}</span>
                    </p>
                  ))}
                </div>
              )}
              <div className="ml-9 mt-2">
                <Link href="/rewrite"><Pill tone="ok">Translate in rewrites →</Pill></Link>
              </div>
            </div>
          )}

          <button onClick={() => setTab("ats")}
            className="w-full bg-white border border-line rounded-xl p-3 flex gap-2.5 mb-4 text-left min-h-[44px]">
            <span className="w-7 h-7 rounded-lg bg-mint flex items-center justify-center text-sm shrink-0">🤖</span>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-ink">ATS simulator</p>
              <p className="text-xs text-muted leading-snug">See your resume exactly as the robot parses it.</p>
              <Pill tone="ok">View parsed text →</Pill>
            </div>
          </button>

          <Link href="/rewrite">
            <Button variant="emerald" className="w-full !min-h-[52px]">Rewrite my bullets →</Button>
          </Link>
          <SectionTitle sub=""> </SectionTitle>
        </>
      )}

      {tab === "ats" && (
        <>
          <Card className="mb-3">
            <p className="font-bold text-ink text-sm mb-2">What the parser extracted</p>
            {sim.extracted.map((e, i) => (
              <div key={i} className="flex justify-between py-1.5 border-b border-line last:border-0 text-sm gap-3">
                <span className="text-muted shrink-0">{e.label}</span>
                <span className={`font-semibold text-right break-all ${e.found ? "text-ink" : "text-red-700"}`}>
                  {e.found ? "✓ " : "✗ "}{e.value}
                </span>
              </div>
            ))}
          </Card>
          <Card className="mb-3">
            <p className="font-bold text-ink text-sm mb-2">Your resume as the robot reads it</p>
            <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono bg-paper rounded-xl p-3 max-h-96 overflow-auto border border-line">
              {sim.parsedText.slice(0, 4000)}{sim.parsedText.length > 4000 ? "\n…(truncated)" : ""}
            </pre>
          </Card>
          <div className="grid gap-2">
            {sim.notes.map((n, i) => (
              <p key={i} className="text-[13px] text-muted bg-white border border-line rounded-xl p-3">{n}</p>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
