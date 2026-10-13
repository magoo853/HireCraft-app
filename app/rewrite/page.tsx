"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store";
import { extractKeywords, scoreResume } from "@/lib/fallback";
import { applyRewriteToResume } from "@/lib/resume-sync";
import { AiResponse, RewriteResult, ScoreResult, StructuredResume } from "@/lib/types";
import { Button, Card, EmptyState, SectionTitle, SourceNote, ModeBadge, TargetJobBanner, inputCls } from "@/components/ui";
import { SaveVersionForm } from "@/components/versions";
import { AiOffNote } from "@/components/consent";
import { ScoreJumpCard } from "@/components/score-card";
import { scoreJobBasis } from "@/lib/score-history";

function ImproveInner() {
  const params = useSearchParams();
  const { resume, jobText, mode, hasResume, setResume, military, perfReview, setRewriteAccepted, aiConsent, recordScore, targetTitle, company } = useApp();
  const [tab, setTab] = useState<"rewrite" | "tailor">(params.get("tab") === "tailor" ? "tailor" : "rewrite");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResponse<RewriteResult[]> | null>(null);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState<Set<number>>(new Set());
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [edits, setEdits] = useState<Record<number, string>>({});
  // Score snapshot captured when a rewrite result is generated — the
  // "before" anchor for the score-delta readout. Component state only,
  // same lifetime as `result`; nothing is persisted to the store.
  const [baseline, setBaseline] = useState<{ score: ScoreResult; jobText: string } | null>(null);

  const keywords = useMemo(
    () => (jobText && hasResume ? extractKeywords(jobText, resume.rawText, 14) : []),
    [jobText, resume, hasResume]
  );

  async function runRewrite() {
    if (!aiConsent) return; // AI off — no request fires; the CTA shows AiOffNote instead
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "rewrite", mode, resume, jobText, military, perfReview }),
      });
      const json = (await res.json()) as AiResponse<RewriteResult[]>;
      if (!Array.isArray(json.data)) throw new Error("Unexpected response");
      setResult(json);
      setBaseline({ score: scoreResume(resume, jobText), jobText });
      setAccepted(new Set());
      setEdits({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const shown = (r: RewriteResult, i: number) => edits[i] ?? r.rewritten;

  // Only show bullets that actually changed — an unchanged "rewrite" is
  // noise. Eval-mined additions always differ from their source line, so
  // they always show. Hidden ones are counted, not vanished.
  const normCmp = (s: string) =>
    s.toLowerCase().replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[–—]/g, "-")
      .replace(/\s+/g, " ").replace(/\.+$/, "").trim();
  const visible = result
    ? result.data.map((r, i) => ({ r, i })).filter(({ r }) => r.source === "review" || r.source === "eval" || normCmp(r.original) !== normCmp(r.rewritten))
    : [];
  const regularVisible = visible.filter(({ r }) => r.source !== "review" && r.source !== "eval");
  const reviewVisible = visible.filter(({ r }) => r.source === "review");
  const evalVisible = visible.filter(({ r }) => r.source === "eval");
  const hiddenCount = result ? result.data.length - visible.length : 0;

  // Score-delta readout. The baseline, the live resume, and the projection
  // are all scored with the SAME yardstick — the job text as it stood when
  // the rewrites were generated — using scoreResume, the exact function the
  // Score tab renders. The projection replays the split/join replacements
  // acceptRewrite performs, in list order, so an estimate can never promise
  // more than actually accepting would deliver.
  const acceptedCount = visible.filter(({ i }) => accepted.has(i)).length;
  const acceptedReviewCount = reviewVisible.filter(({ i }) => accepted.has(i)).length;
  const acceptedEvalCount = evalVisible.filter(({ i }) => accepted.has(i)).length;
  const remaining = visible.filter(({ i }) => !accepted.has(i));
  const currentScore = baseline ? scoreResume(resume, baseline.jobText) : null;
  const projectedScore =
    baseline && currentScore && remaining.length > 0
      ? scoreResume(
          {
            ...resume,
            rawText: remaining.reduce(
              (txt, { r, i }) => {
                const text = shown(r, i);
                return r.source === "review" || r.source === "eval"
                  ? txt.includes(text)
                    ? txt
                    : `${txt.trim()}\n• ${text}`
                  : txt.split(r.original).join(text);
              },
              resume.rawText
            ),
          },
          baseline.jobText
        )
      : null;
  const fmtScore = (s: ScoreResult) => `${s.total} (${s.grade})`;

  // Pure accept step against an explicit resume value, so Accept-all can
  // fold every pending item over the evolving resume (each addition is
  // appended at most once; replacements mirror into the structure).
  function applyAccept(current: StructuredResume, item: RewriteResult, text: string): StructuredResume {
    if (item.source === "review" || item.source === "eval") {
      // A review/evaluation addition is new material, not a replacement:
      // append the accepted bullet to the working resume (raw text + the
      // current role's structured bullets). Saved versions are snapshots
      // and are never touched here — the user saves a new version explicitly.
      if (text && !current.rawText.includes(text)) {
        const experience = current.experience.map((e, idx) =>
          idx === 0 && !e.bullets.includes(text) ? { ...e, bullets: [...e.bullets, text] } : e
        );
        return {
          ...current,
          rawText: `${current.rawText.trim()}\n• ${text}`,
          ...(experience.length ? { experience } : {}),
        };
      }
      return current;
    }
    // Mirror the replacement into the structured bullets as well as
    // rawText, so Design/PDF/DOCX (structured) and Score (rawText)
    // never fork into two versions of the truth.
    return applyRewriteToResume(current, item.original, text);
  }

  // Record a Wave 3 score-history entry when an accept actually moves
  // the score, scored with the same yardstick as the delta readout.
  function recordIfScoreChanged(before: StructuredResume, after: StructuredResume) {
    const basisText = baseline?.jobText ?? jobText;
    const b = scoreResume(before, basisText);
    const a = scoreResume(after, basisText);
    if (a.total !== b.total) recordScore(a.total, a.grade, scoreJobBasis(targetTitle, company, basisText));
  }

  function acceptRewrite(i: number, original: string) {
    const item = result?.data[i];
    if (!item) return;
    const text = shown(item, i);
    const next = applyAccept(resume, item, text);
    recordIfScoreChanged(resume, next);
    setResume(next);
    setRewriteAccepted(true);
    setAccepted((s) => new Set(s).add(i));
    setEditingIdx(null);
  }

  // One human action that accepts every pending rewrite — the same
  // per-item operations, folded in list order (the order the delta
  // projection replays), so the outcome matches the projection.
  function acceptAll() {
    if (!result || remaining.length === 0) return;
    let next = resume;
    const ids: number[] = [];
    for (const { r, i } of remaining) {
      next = applyAccept(next, r, shown(r, i));
      ids.push(i);
    }
    recordIfScoreChanged(resume, next);
    setResume(next);
    setRewriteAccepted(true);
    setAccepted((s) => { const n = new Set(s); ids.forEach((id) => n.add(id)); return n; });
    setEditingIdx(null);
  }

  const renderRewriteCard = ({ r, i }: { r: RewriteResult; i: number }) => (
    <div key={i} className="bg-white border border-line rounded-[14px] p-3">
      <p className="text-[10.5px] font-bold text-muted uppercase tracking-wider">{r.source === "review" ? "From your review" : r.source === "eval" ? "From your evaluation" : "Original"}</p>
      <p className={`text-[13px] text-muted mt-1.5 leading-relaxed ${r.source === "review" || r.source === "eval" ? "" : "line-through decoration-red-400"}`}>{r.original}</p>
      <p className="text-[10.5px] font-bold text-muted uppercase tracking-wider mt-2.5">Rewritten</p>
      {editingIdx === i ? (
        <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3}
          className={`${inputCls} !text-[13px] mt-1.5`} aria-label={`Edit rewrite ${i + 1}`} />
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
              aria-label={`Edit rewrite ${i + 1}`}
              className="flex-1 text-center text-[13px] font-bold py-2.5 rounded-[10px] bg-slate-100 text-slate-700 min-h-[44px]">Edit</button>
            <button onClick={() => acceptRewrite(i, r.original)} disabled={accepted.has(i)}
              aria-label={`${accepted.has(i) ? "Accepted" : "Accept"} rewrite ${i + 1}`}
              className={`flex-1 text-center text-[13px] font-bold py-2.5 rounded-[10px] min-h-[44px] ${accepted.has(i) ? "bg-slate-100 text-muted" : "bg-brand text-white"}`}>
              {accepted.has(i) ? "✓ Accepted" : "✓ Accept"}
            </button>
          </>
        )}
      </div>
    </div>
  );

  if (!hasResume) {
    return <EmptyState title="No resume yet" body="Add your resume to get bullet-by-bullet rewrites with the reasoning behind each one." cta="Add my resume" href="/resume" />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-extrabold text-navy">Rewrites{result ? ` · ${visible.length} improved` : ""}</h2>
        <ModeBadge mode={mode} />
      </div>

      <TargetJobBanner />

      <div className="grid grid-cols-2 gap-1 bg-slate-200/60 rounded-xl p-1 mb-4">
        {(["rewrite", "tailor"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg py-2.5 text-sm font-bold min-h-[44px] ${tab === t ? "bg-white text-ink shadow-sm" : "text-slate-600"}`}>
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
              {aiConsent ? (
                <Button variant="emerald" onClick={runRewrite} className="w-full !min-h-[52px]">
                  ✎ Rewrite my bullets
                </Button>
              ) : (
                <AiOffNote />
              )}
              {error && <p className="text-sm text-red-700 mt-3">{error}</p>}
            </Card>
          )}
          {loading && <p className="text-sm text-muted text-center py-8">Rewriting your bullets…</p>}

          {result && (
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted">Tap Accept to apply a rewrite to your resume.{hiddenCount > 0 ? ` ${hiddenCount} bullet${hiddenCount > 1 ? "s were" : " was"} already strong — not shown.` : ""}</p>
                <button onClick={() => { setResult(null); setBaseline(null); }} className="text-xs text-muted underline min-h-[44px] px-2">run again</button>
              </div>
              {baseline && currentScore && visible.length > 0 && (
                <Card className="mb-3">
                  <p className="font-bold text-ink text-sm mb-1.5">ATS score impact</p>
                  {acceptedCount === 0 ? (
                    <>
                      <p className="text-[13px] text-ink leading-snug">
                        Your score now: <b>{fmtScore(currentScore)}</b>
                      </p>
                      {projectedScore && projectedScore.total !== currentScore.total ? (
                        <p className="text-[13px] text-ink leading-snug mt-1">
                          Apply all {visible.length} rewrites and it would score <b>~{fmtScore(projectedScore)}</b> — an estimate; your score only changes when you accept.
                        </p>
                      ) : (
                        <p className="text-[13px] text-ink leading-snug mt-1">
                          These rewrites sharpen the wording — the measured ATS score would not change.
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-[13px] text-ink leading-snug">
                        {currentScore.total === baseline.score.total ? (
                          <>ATS score still <b>{fmtScore(currentScore)}</b> — {acceptedCount} accepted rewrite{acceptedCount > 1 ? "s" : ""} so far strengthened wording without moving the measured score.</>
                        ) : (
                          <>ATS score <b>{fmtScore(baseline.score)} → {fmtScore(currentScore)}</b> · <b>{currentScore.total - baseline.score.total > 0 ? `+${currentScore.total - baseline.score.total}` : currentScore.total - baseline.score.total}</b> from {acceptedCount} accepted rewrite{acceptedCount > 1 ? "s" : ""} so far</>
                        )}
                      </p>
                      {projectedScore && projectedScore.total !== currentScore.total && (
                        <p className="text-[13px] text-ink leading-snug mt-1">
                          The remaining {remaining.length} would take it to <b>~{fmtScore(projectedScore)}</b> if accepted — an estimate.
                        </p>
                      )}
                    </>
                  )}
                  <p className="text-xs text-muted leading-snug mt-2">
                    {baseline.score.keywordBasis === "job"
                      ? "Scored against your job posting — the same scoring the Score tab uses."
                      : `No job posting set — scored against a generic ${baseline.score.genericTitle} checklist, like the Score tab. Add a posting on the Resume tab for a sharper read.`}
                  </p>
                  {remaining.length > 0 && (
                    <Button variant="emerald" onClick={acceptAll} className="w-full mt-3">
                      Accept all {remaining.length} remaining rewrite{remaining.length > 1 ? "s" : ""}
                    </Button>
                  )}
                </Card>
              )}
              {baseline && currentScore && currentScore.total > baseline.score.total && (
                <ScoreJumpCard
                  beforeTotal={baseline.score.total} beforeGrade={baseline.score.grade}
                  afterTotal={currentScore.total} afterGrade={currentScore.grade}
                  basis={scoreJobBasis(targetTitle, company, baseline.jobText)}
                />
              )}
              {visible.length === 0 ? (
                <Card className="text-center py-8">
                  <p className="font-extrabold text-navy mb-2">Nothing to change 🎉</p>
                  <p className="text-sm text-muted max-w-xs mx-auto">Every bullet came back already strong — the rewrite had no improvements to make.</p>
                </Card>
              ) : (
              <>
                {regularVisible.length > 0 && (
                  <div className="grid gap-2.5">
                    {regularVisible.map(renderRewriteCard)}
                  </div>
                )}
                {reviewVisible.length > 0 && (
                  <div className="mt-5">
                    <div className="mb-2.5">
                      <h3 className="font-extrabold text-navy">From your review</h3>
                      <p className="text-[13px] text-muted leading-relaxed mt-1">
                        Accomplishments from your latest performance review that aren&apos;t in your resume yet. Accept the ones you want added to your working resume.
                      </p>
                    </div>
                    <div className="grid gap-2.5">
                      {reviewVisible.map(renderRewriteCard)}
                    </div>
                    {acceptedReviewCount > 0 && (
                      <Card className="mt-3 !bg-mint !border-brand/30">
                        <p className="text-sm text-emerald-950 leading-relaxed">
                          <b>{acceptedReviewCount} review addition{acceptedReviewCount === 1 ? "" : "s"} added</b> to your working resume. Saved versions stay untouched — save these as a new version to keep this tailored set.
                        </p>
                        <a href="#save-new-version" className="inline-flex items-center text-sm font-bold text-emerald-900 underline underline-offset-2 min-h-[44px]">
                          Save as a new version ↓
                        </a>
                      </Card>
                    )}
                  </div>
                )}
                {evalVisible.length > 0 && (
                  <div className="mt-5">
                    <div className="mb-2.5">
                      <h3 className="font-extrabold text-navy">From your evaluation</h3>
                      <p className="text-[13px] text-muted leading-relaxed mt-1">
                        Accomplishments from your military evaluation (EPR/appraisal) that aren&apos;t in your resume yet. Accept the ones you want added to your working resume.
                      </p>
                    </div>
                    <div className="grid gap-2.5">
                      {evalVisible.map(renderRewriteCard)}
                    </div>
                    {acceptedEvalCount > 0 && (
                      <Card className="mt-3 !bg-mint !border-brand/30">
                        <p className="text-sm text-emerald-950 leading-relaxed">
                          <b>{acceptedEvalCount} evaluation addition{acceptedEvalCount === 1 ? "" : "s"} added</b> to your working resume. Saved versions stay untouched — save these as a new version to keep this tailored set.
                        </p>
                        <a href="#save-new-version" className="inline-flex items-center text-sm font-bold text-emerald-900 underline underline-offset-2 min-h-[44px]">
                          Save as a new version ↓
                        </a>
                      </Card>
                    )}
                  </div>
                )}
              </>
              )}
              <SourceNote source={result.source} note={result.note} />
              <div id="save-new-version">
                <SaveVersionForm className="mt-3" />
              </div>
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
