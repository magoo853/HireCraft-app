"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { atsSimulate, scoreResume, findMilitaryJargon } from "@/lib/fallback";
import { Button, Card, EmptyState, SectionTitle, ScoreRing, ModeBadge, Pill } from "@/components/ui";

export default function ScorePage() {
  const { resume, jobText, mode, hasResume } = useApp();
  const [tab, setTab] = useState<"score" | "ats">("score");

  const result = useMemo(
    () => (hasResume ? scoreResume(resume, jobText) : null),
    [resume, jobText, hasResume]
  );
  const sim = useMemo(() => (hasResume ? atsSimulate(resume) : null), [resume, hasResume]);
  const jargon = useMemo(
    () => (mode === "veteran" && hasResume ? findMilitaryJargon(resume.rawText) : []),
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

  const kpis = [
    { label: "Keyword match", pct: result.keywords.length ? Math.round((result.keywords.filter((k) => k.matched).length / result.keywords.length) * 100) : 0 },
    { label: "Readability", pct: result.readability.score },
    { label: "Format safety", pct: Math.round((result.breakdown.formatting / 10) * 100) },
  ];

  const missingKw = result.keywords.filter((k) => !k.matched);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-extrabold text-navy">Resume Score</h2>
        <ModeBadge mode={mode} />
      </div>

      <div className="grid grid-cols-2 gap-1 bg-slate-200/60 rounded-xl p-1 mb-4">
        {(["score", "ats"] as const).map((t) => (
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
                  <div key={k.label} className="mb-2.5 last:mb-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted">{k.label}</span>
                      <b className="text-ink">{k.pct}%</b>
                    </div>
                    <div className="h-[7px] rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${k.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted mt-3">
              Grade <b className="text-ink">{result.grade}</b> · {result.bulletCount} bullets · {result.quantifiedCount} quantified · {result.readability.label.toLowerCase()}
              {jobText ? " · scored against your job posting" : " · paste a job posting for a sharper read"}
            </p>
          </Card>

          {missingKw.length > 0 && (
            <div className="bg-white border border-line rounded-xl p-3 flex gap-2.5 mb-2">
              <span className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center text-sm shrink-0">⚠️</span>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-ink">{missingKw.length} keywords missing</p>
                <p className="text-xs text-muted leading-snug">"{missingKw.slice(0, 3).map((k) => k.term).join('", "')}"{missingKw.length > 3 ? "…" : ""}</p>
                <Link href="/rewrite"><Pill tone="bad">Fix in rewrites →</Pill></Link>
              </div>
            </div>
          )}

          {result.flags.filter((f) => f.level === "warn").slice(0, 2).map((f, i) => (
            <div key={i} className="bg-white border border-line rounded-xl p-3 flex gap-2.5 mb-2">
              <span className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-sm shrink-0">📄</span>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-ink">{f.title}</p>
                <p className="text-xs text-muted leading-snug">{f.detail}</p>
                <Link href="/design"><Pill tone="warn">Use a safe template →</Pill></Link>
              </div>
            </div>
          ))}

          {jargon.length > 0 && (
            <div className="bg-white border border-line rounded-xl p-3 flex gap-2.5 mb-2">
              <span className="w-7 h-7 rounded-lg bg-mint flex items-center justify-center text-sm shrink-0">🎖</span>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-ink">Military jargon spotted ({jargon.length})</p>
                <p className="text-xs text-muted leading-snug">Recruiters won't know these terms. Rewrites translate them automatically.</p>
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
