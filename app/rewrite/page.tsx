"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store";
import { extractKeywords } from "@/lib/fallback";
import { AiResponse, RewriteResult } from "@/lib/types";
import { Button, Card, EmptyState, SectionTitle, SourceNote, ModeBadge, inputCls } from "@/components/ui";

function ImproveInner() {
  const params = useSearchParams();
  const { resume, jobText, mode, hasResume, updateResume } = useApp();
  const [tab, setTab] = useState<"rewrite" | "tailor">(params.get("tab") === "tailor" ? "tailor" : "rewrite");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResponse<RewriteResult[]> | null>(null);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState<Set<number>>(new Set());
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [edits, setEdits] = useState<Record<number, string>>({});

  const keywords = useMemo(
    () => (jobText && hasResume ? extractKeywords(jobText, resume.rawText, 14) : []),
    [jobText, resume, hasResume]
  );

  async function runRewrite() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "rewrite", mode, resume, jobText }),
      });
      const json = (await res.json()) as AiResponse<RewriteResult[]>;
      if (!Array.isArray(json.data)) throw new Error("Unexpected response");
      setResult(json);
      setAccepted(new Set());
      setEdits({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const shown = (r: RewriteResult, i: number) => edits[i] ?? r.rewritten;

  function acceptRewrite(i: number, original: string) {
    const text = result ? shown(result.data[i], i) : "";
    updateResume({ rawText: resume.rawText.split(original).join(text) });
    setAccepted((s) => new Set(s).add(i));
    setEditingIdx(null);
  }

  if (!hasResume) {
    return <EmptyState title="No resume yet" body="Add your resume to get bullet-by-bullet rewrites with the reasoning behind each one." cta="Add my resume" href="/resume" />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-extrabold text-navy">Rewrites{result ? ` · ${result.data.length} bullets` : ""}</h2>
        <ModeBadge mode={mode} />
      </div>

      <div className="grid grid-cols-2 gap-1 bg-slate-200/60 rounded-xl p-1 mb-4">
        {(["rewrite", "tailor"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg py-2.5 text-sm font-bold min-h-[44px] ${tab === t ? "bg-white text-ink shadow-sm" : "text-muted"}`}>
            {t === "rewrite" ? "Rewrites" : "Job tailoring"}
          </button>
        ))}
      </div>

      {tab === "rewrite" && (
        <>
          {!result && !loading && (
            <Card className="text-center py-8">
              <p className="font-extrabold text-navy mb-2">Rewrite every bullet, impact-first</p>
              <p className="text-sm text-muted mb-5 max-w-xs mx-auto">
                Stronger verbs. Results before tasks. {mode === "veteran" ? "Military terms translated to civilian language." : ""} Gaps flagged — never filled with fiction.
              </p>
              <Button variant="emerald" onClick={runRewrite} className="w-full !min-h-[52px]">
                ✎ Rewrite my bullets
              </Button>
              {error && <p className="text-sm text-red-700 mt-3">{error}</p>}
            </Card>
          )}
          {loading && <p className="text-sm text-muted text-center py-8">Rewriting your bullets…</p>}

          {result && (
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted">Tap Accept to apply a rewrite to your resume.</p>
                <button onClick={() => setResult(null)} className="text-xs text-muted underline min-h-[44px] px-2">run again</button>
              </div>
              <div className="grid gap-2.5">
                {result.data.map((r, i) => (
                  <div key={i} className="bg-white border border-line rounded-[14px] p-3">
                    <p className="text-[10.5px] font-bold text-muted uppercase tracking-wider">Original</p>
                    <p className="text-[13px] text-muted mt-1.5 leading-relaxed line-through decoration-red-400">{r.original}</p>
                    <p className="text-[10.5px] font-bold text-muted uppercase tracking-wider mt-2.5">Rewritten</p>
                    {editingIdx === i ? (
                      <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3}
                        className={`${inputCls} !text-[13px] mt-1.5`} />
                    ) : (
                      <p className="text-[13px] text-navy mt-1.5 leading-relaxed bg-mint rounded-lg p-2.5">{shown(r, i)}</p>
                    )}
                    <div className="text-[12px] text-slate-600 mt-2 bg-slate-100 rounded-lg p-2.5 leading-relaxed">
                      <b className="text-pine">Why it works:</b> {r.why}
                    </div>
                    {r.translationNote && (
                      <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 mt-2">🎖 {r.translationNote}</p>
                    )}
                    {r.gaps.map((g, j) => (
                      <p key={j} className="text-xs text-amber-800 mt-1.5">⚠️ {g}</p>
                    ))}
                    <div className="flex gap-2 mt-2.5">
                      {editingIdx === i ? (
                        <>
                          <button onClick={() => { setEdits({ ...edits, [i]: editText }); setEditingIdx(null); }}
                            className="flex-1 text-center text-[13px] font-bold py-2.5 rounded-[10px] bg-brand text-white min-h-[44px]">Save edit</button>
                          <button onClick={() => setEditingIdx(null)}
                            className="flex-1 text-center text-[13px] font-bold py-2.5 rounded-[10px] bg-slate-100 text-slate-700 min-h-[44px]">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingIdx(i); setEditText(shown(r, i)); }}
                            className="flex-1 text-center text-[13px] font-bold py-2.5 rounded-[10px] bg-slate-100 text-slate-700 min-h-[44px]">Edit</button>
                          <button onClick={() => acceptRewrite(i, r.original)} disabled={accepted.has(i)}
                            className={`flex-1 text-center text-[13px] font-bold py-2.5 rounded-[10px] min-h-[44px] ${accepted.has(i) ? "bg-slate-100 text-muted" : "bg-brand text-white"}`}>
                            {accepted.has(i) ? "✓ Accepted" : "✓ Accept"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <SourceNote source={result.source} note={result.note} />
              <Link href="/design"><Button className="w-full mt-4 !min-h-[52px]">See it in a designed template →</Button></Link>
            </>
          )}
        </>
      )}

      {tab === "tailor" && (
        <>
          {!jobText.trim() ? (
            <EmptyState title="No job posting yet" body="Paste a job posting on the Resume tab and we'll show you exactly which keywords you hit — and which you're missing." cta="Add a job posting" href="/resume" />
          ) : (
            <>
              <Card className="mb-3">
                <div className="flex items-baseline justify-between mb-3">
                  <p className="font-bold text-ink text-sm">Keyword match</p>
                  <p className="text-2xl font-extrabold text-navy">
                    {keywords.length ? Math.round((keywords.filter((k) => k.matched).length / keywords.length) * 100) : 0}
                    <span className="text-sm text-muted font-semibold">%</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map((k) => (
                    <span key={k.term}
                      className={`text-xs font-bold rounded-full px-2.5 py-1.5 border ${k.matched ? "bg-mint text-emerald-900 border-brand/40" : "bg-red-50 text-red-800 border-red-200"}`}>
                      {k.matched ? "✓ " : "✗ "}{k.term}
                    </span>
                  ))}
                </div>
              </Card>
              <Card className="!bg-navy !border-navy text-white">
                <p className="font-bold mb-2 text-sm">How to close the gaps</p>
                <ul className="text-[13px] text-white/75 space-y-1.5 leading-snug">
                  <li>• Mirror the posting's exact phrasing — parsers match keywords literally.</li>
                  <li>• Only add skills you truly have. Keyword-stuffing backfires in interviews.</li>
                  <li>• Weave missing terms into bullets naturally ("…using Salesforce to track…").</li>
                </ul>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function RewritePage() {
  return (
    <Suspense fallback={<p className="text-muted text-sm">Loading…</p>}>
      <ImproveInner />
    </Suspense>
  );
}
