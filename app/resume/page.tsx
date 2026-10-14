"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { deriveSkills, structuredToText, textToStructured } from "@/lib/parse";
import { mosTranslations } from "@/lib/mos";
import { redactDocumentText } from "@/lib/redact";
import { sampleForMode } from "@/lib/sample";
import { AiResponse, ExperienceItem, ProjectItem, StructuredResume, SummaryResult, emptyResume } from "@/lib/types";
import { Button, Card, Field, SectionTitle, SourceNote, inputCls } from "@/components/ui";
import { GettingStartedCard } from "@/components/getting-started";
import { AiOffNote } from "@/components/consent";
import { VersionsCard } from "@/components/versions";

type Tab = "upload" | "paste" | "builder";

function AiStatusPill() {
  const [status, setStatus] = useState<{ working: boolean; detail: string } | null>(null);
  useEffect(() => {
    fetch("/api/ai-health")
      .then((r) => r.json())
      .then((j) => setStatus({ working: !!j.working, detail: String(j.detail || "") }))
      .catch(() => setStatus({ working: false, detail: "Couldn't reach the AI status check." }));
  }, []);
  if (!status) return null;
  return (
    <p className={`text-xs font-bold rounded-xl px-3 py-2.5 mb-4 ${status.working ? "bg-mint text-emerald-900" : "bg-amber-50 text-amber-900 border border-amber-200"}`}>
      {status.working ? "🤖 AI connected — full rewrites enabled." : `⚠️ ${status.detail}`}
    </p>
  );
}

export default function ResumePage() {
  const router = useRouter();
  const { mode, setMode, resume, setResume, targetTitle, setTargetTitle, company, setCompany, jobText, setJobText, jobUrl, setJobUrl, military, setMilitary, setPerfReview, hasResume, saveVersion } = useApp();
  // The sample offer follows the persona picked on Home (the store's
  // mode field) — a civilian never gets offered the veteran sample.
  const sample = sampleForMode(mode);
  const [tab, setTab] = useState<Tab>(mode === "new" ? "builder" : "upload");
  const [paste, setPaste] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseMsg, setParseMsg] = useState("");
  // Wave 3 (#10): replacing/clearing a loaded resume is destructive, so
  // it goes through an inline two-step confirm (the VersionsCard idiom)
  // with an option to snapshot the current resume as a version first.
  const [pending, setPending] = useState<
    | { kind: "replace"; next: StructuredResume; msg: string }
    | { kind: "clear" }
    | null
  >(null);

  function requestReplace(next: StructuredResume, msg: string) {
    if (hasResume && next.rawText !== resume.rawText) {
      setPending({ kind: "replace", next, msg });
      return;
    }
    setResume(next);
    setParseMsg(msg);
  }

  function applyPending(saveFirst: boolean) {
    if (!pending) return;
    if (saveFirst) {
      const err = saveVersion("");
      if (err) { setParseMsg(err); return; }
    }
    if (pending.kind === "replace") {
      setResume(pending.next);
      setParseMsg(pending.msg);
    } else {
      setResume(emptyResume());
      setParseMsg("Resume cleared.");
    }
    setPending(null);
  }
  const [fetching, setFetching] = useState(false);
  const [fetchMsg, setFetchMsg] = useState("");
  const [evalParsing, setEvalParsing] = useState(false);
  const [evalMsg, setEvalMsg] = useState("");
  const [evalPaste, setEvalPaste] = useState("");
  const [showEvalPaste, setShowEvalPaste] = useState(false);

  async function handleEvalFile(f: File | undefined) {
    if (!f) return;
    setEvalParsing(true);
    setEvalMsg("");
    try {
      const { parseFile } = await import("@/lib/parse-file");
      const text = await parseFile(f);
      if (text.trim().length < 50) throw new Error("Couldn't read much text from that file. Try pasting the text instead.");
      // B1: filter identifiers BEFORE the text is stored — persisted state
      // never holds names/SSN/DoD ID from an evaluation.
      setMilitary({ ...military, evalText: redactDocumentText(text) });
      setEvalMsg(`Performance review loaded (${text.split(/\s+/).length} words). It now feeds Discover, Roadmap, and Rewrites.`);
    } catch (e) {
      setEvalMsg(e instanceof Error ? e.message : "Couldn't parse that file.");
    } finally {
      setEvalParsing(false);
    }
  }

  async function handleFile(f: File | undefined) {
    if (!f) return;
    setParsing(true);
    setParseMsg("");
    try {
      const { parseFile } = await import("@/lib/parse-file");
      const text = await parseFile(f);
      if (text.trim().length < 50) throw new Error("Couldn't read much text from that file. Try pasting the text instead.");
      requestReplace(textToStructured(text), `Parsed ${text.split(/\s+/).length} words from ${f.name}.`);
    } catch (e) {
      setParseMsg(e instanceof Error ? e.message : "Couldn't parse that file.");
    } finally {
      setParsing(false);
    }
  }

  function handlePaste() {
    if (paste.trim().length < 50) { setParseMsg("Paste a bit more — at least a few lines of your resume."); return; }
    requestReplace(textToStructured(paste), "Resume loaded from pasted text.");
  }

  async function fetchJob() {
    if (!jobUrl.trim()) { setFetchMsg("Paste a job posting URL first."); return; }
    setFetching(true);
    setFetchMsg("");
    try {
      const res = await fetch(`/api/fetch-job?url=${encodeURIComponent(jobUrl.trim())}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Fetch failed");
      setJobText(json.text);
      setFetchMsg(`Pulled ${json.text.split(/\s+/).length} words from the posting.`);
    } catch (e) {
      setFetchMsg(e instanceof Error ? e.message : "Fetch failed — paste the text manually below.");
    } finally {
      setFetching(false);
    }
  }

  return (
    <div>
      <SectionTitle sub="Upload, paste, or build from scratch. Everything stays on your device — when you use an AI feature, the text it needs is sent to our AI provider, only with your consent.">
        Your resume
      </SectionTitle>

      <AiStatusPill />

      <GettingStartedCard />

      <div className="grid grid-cols-3 gap-1 bg-stone-200/60 rounded-xl p-1 mb-5">
        {(["upload", "paste", "builder"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg py-2.5 text-sm font-bold min-h-[44px] ${tab === t ? "bg-white text-ink shadow-sm" : "text-slate-600"}`}>
            {t === "upload" ? "Upload" : t === "paste" ? "Paste" : "Build"}
          </button>
        ))}
      </div>

      {pending && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
          <p className="text-sm text-amber-900 font-medium leading-relaxed mb-2">
            {pending.kind === "clear" ? "This clears your current resume." : "This replaces your current resume."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => applyPending(true)} className="flex-1">
              {pending.kind === "clear" ? "Save as a version & clear" : "Save as a version & replace"}
            </Button>
            <Button variant="danger" onClick={() => applyPending(false)} className="flex-1">
              {pending.kind === "clear" ? "Clear" : "Replace"}
            </Button>
            <Button variant="secondary" onClick={() => setPending(null)} className="flex-1">Cancel</Button>
          </div>
        </div>
      )}

      {tab === "upload" && (
        <Card>
          <Field label="Resume file (PDF, DOCX, or TXT)">
            <input
              type="file" accept=".pdf,.docx,.doc,.txt"
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; void handleFile(f); }}
              className="block w-full text-sm text-muted file:mr-4 file:rounded-xl file:border-0 file:bg-ink file:text-white file:px-5 file:py-3 file:text-sm file:font-bold file:min-h-[44px]"
            />
          </Field>
          {parsing && <p className="text-sm text-muted">Reading your file…</p>}
          {parseMsg && <p className="text-sm text-emerald-900 font-medium">{parseMsg}</p>}
        </Card>
      )}

      {tab === "paste" && (
        <Card>
          <Field label="Paste your resume text">
            <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={10}
              placeholder="Paste your full resume here…" className={inputCls} />
          </Field>
          <Button onClick={handlePaste} className="w-full">Use this text</Button>
          {parseMsg && <p className="text-sm text-emerald-900 font-medium mt-2">{parseMsg}</p>}
        </Card>
      )}

      {tab === "builder" && <BuilderForm />}

      {resume.rawText ? (
        <Card className="mt-4 border-brand/40">
          <div className="flex items-center justify-between mb-2">
            <p className="font-bold text-ink text-sm">Resume loaded ✓</p>
            <button onClick={() => setPending({ kind: "clear" })} className="text-xs text-muted underline min-h-[44px] px-2">clear</button>
          </div>
          <p className="text-xs text-muted mb-3">
            {resume.name || "Unnamed"} · {resume.experience.length} role(s) · {resume.skills.length} skills · ~{resume.rawText.split(/\s+/).length} words
          </p>
          <Link href="/score"><Button className="w-full">Score my resume →</Button></Link>
        </Card>
      ) : (
        <>
        <p className="text-sm text-muted mt-4 text-center">Add your resume above to unlock scoring, rewrites, and tailoring.</p>
        <Card className="mt-4 text-center !bg-mint/60 border-emerald-100">
          <p className="font-extrabold text-navy text-sm mb-1">Just looking around?</p>
          <p className="text-xs text-muted leading-relaxed mb-3">
            {sample.cardText}
          </p>
          <Button variant="emerald" className="w-full" onClick={() => {
            // One shared loader for every persona: same store setters,
            // same result — only the bundle's payloads differ.
            const s = sampleForMode(mode);
            setMode(s.mode);
            if (s.military) setMilitary(s.military);
            if (s.perfReviewText) setPerfReview({ text: s.perfReviewText, updatedAt: Date.now() });
            setResume(s.resume);
            setParseMsg(s.loadedMessage);
          }}>
            {sample.buttonText}
          </Button>
        </Card>
        </>
      )}

      {resume.rawText ? <SummaryCard /> : null}

      <PerformanceReviewCard />

      {mode === "veteran" && (
        <div className="mt-8">
          <SectionTitle sub="Your job codes + yearly evaluation power the civilian translation across Discover, Roadmap, and Rewrites.">
            Your military record
          </SectionTitle>
          <Card>
            <Field label="Branch">
              <select value={military.branch} onChange={(e) => setMilitary({ ...military, branch: e.target.value })}
                className={inputCls}>
                <option value="">Select branch…</option>
                {["Army", "Navy", "Air Force", "Marine Corps", "Coast Guard", "Space Force"].map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </Field>
            <Field label="MOS / job codes" hint="What you were rated as — e.g. Army MOS 11B, 68W · Navy rate HM, IT · Air Force AFSC 3P0X1 · Marine 0311. Separate multiples with commas.">
              <input value={military.mosCodes} onChange={(e) => setMilitary({ ...military, mosCodes: e.target.value })}
                placeholder="e.g. 25B, 42A" className={inputCls} />
            </Field>
            {military.mosCodes.trim() && (() => {
              const translations = mosTranslations(military.mosCodes);
              if (!translations.length) {
                return (
                  <p className="text-xs text-muted -mt-2 mb-3">
                    That code isn't in the built-in crosswalk yet — the AI still translates it on Discover, Roadmap, and Rewrite.
                  </p>
                );
              }
              return (
                <div className="-mt-2 mb-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-4">
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-900">
                    🎖 Your civilian translation
                  </p>
                  {translations.map((t, i) => (
                    <div key={t.code} className={i > 0 ? "border-t border-emerald-100 pt-3 mt-3" : "mt-3"}>
                      <p className="text-[11px] font-bold text-muted">
                        {t.code} · {t.label}{military.branch ? ` — ${military.branch}` : ""}
                      </p>
                      <p className="text-[18px] font-extrabold text-navy leading-snug mt-0.5">{t.equivalent}</p>
                      <p className="text-[13px] text-slate-600 leading-relaxed mt-1">{t.about}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {t.roles.map((role) => (
                          <span key={role} className="rounded-full bg-white border border-emerald-200 px-2.5 py-1 text-[11px] font-bold text-emerald-950">
                            {role}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Link href="/discover"
                          className="flex-1 text-center text-[13px] font-bold py-2.5 rounded-[10px] bg-white border border-emerald-200 text-emerald-950 min-h-[44px] flex items-center justify-center">
                          See matching jobs →
                        </Link>
                        <button
                          onClick={() => { setTargetTitle(t.equivalent); router.push("/roadmap"); }}
                          className="flex-1 text-center text-[13px] font-bold py-2.5 rounded-[10px] bg-brand text-white min-h-[44px]">
                          Build my roadmap →
                        </button>
                      </div>
                    </div>
                  ))}
                  <p className="text-[11px] text-emerald-900 mt-3.5 leading-relaxed">
                    This translation also drives your rewrites, cover letters, and LinkedIn — anywhere the app speaks civilian.
                  </p>
                </div>
              );
            })()}
            <Field label="Yearly performance review (NCOER / OER / EPR / FITREP / eval)">
              <input
                type="file" accept=".pdf,.docx,.doc,.txt"
                onChange={(e) => handleEvalFile(e.target.files?.[0])}
                className="block w-full text-sm text-muted file:mr-4 file:rounded-xl file:border-0 file:bg-ink file:text-white file:px-5 file:py-3 file:text-sm file:font-bold file:min-h-[44px]"
              />
            </Field>
            {evalParsing && <p className="text-sm text-muted">Reading your evaluation…</p>}
            {evalMsg && <p className="text-sm text-emerald-900 font-medium">{evalMsg}</p>}
            {military.evalText ? (
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted">✓ Review on file (~{military.evalText.split(/\s+/).length} words) — mined for accomplishments and scope.</p>
                <button onClick={() => setMilitary({ ...military, evalText: "" })} className="text-xs text-muted underline min-h-[44px] px-2 shrink-0">clear</button>
              </div>
            ) : (
              <>
                <button onClick={() => setShowEvalPaste(!showEvalPaste)} className="text-xs font-bold text-emerald-700 underline underline-offset-2 min-h-[44px]">
                  {showEvalPaste ? "Hide paste box" : "…or paste the review text instead"}
                </button>
                {showEvalPaste && (
                  <>
                    <textarea value={evalPaste} onChange={(e) => setEvalPaste(e.target.value)} rows={6}
                      placeholder="Paste your evaluation bullets / rater comments here…" className={inputCls} />
                    <Button
                      className="w-full mt-2"
                      onClick={() => {
                        if (evalPaste.trim().length < 50) { setEvalMsg("Paste a bit more — at least a few lines of your review."); return; }
                        setMilitary({ ...military, evalText: redactDocumentText(evalPaste) });
                        setEvalMsg("Performance review saved. It now feeds Discover, Roadmap, and Rewrites.");
                      }}
                    >
                      Use this review
                    </Button>
                  </>
                )}
              </>
            )}
          </Card>
        </div>
      )}

      <div className="mt-8">
        <SectionTitle sub="Paste a posting to tailor everything against it. Optional — but this is where the magic happens.">
          Target job
        </SectionTitle>
        <Card>
          <Field label="Job title you're targeting">
            <input value={targetTitle} onChange={(e) => setTargetTitle(e.target.value)}
              placeholder="e.g. Logistics Coordinator" className={inputCls} />
          </Field>
          <Field label="Company (optional)">
            <input value={company} onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Acme Corp" className={inputCls} />
          </Field>
          <Field label="Job posting URL">
            <div className="flex gap-2">
              <input value={jobUrl} onChange={(e) => setJobUrl(e.target.value)}
                placeholder="https://…" inputMode="url" className={inputCls} />
              <Button onClick={fetchJob} disabled={fetching} variant="secondary" className="shrink-0">
                {fetching ? "…" : "Fetch"}
              </Button>
            </div>
          </Field>
          {fetchMsg && <p className="text-sm text-emerald-900 font-medium -mt-2 mb-3">{fetchMsg}</p>}
          <Field label="…or paste the job description" hint="If the fetch is blocked, paste the text — tailoring works identically.">
            <textarea value={jobText} onChange={(e) => setJobText(e.target.value)} rows={6}
              placeholder="Paste the full job posting here…" className={inputCls} />
          </Field>
          {jobText.trim().length > 100 && (
            <p className="text-sm text-emerald-900 font-medium">✓ Job posting loaded (~{jobText.split(/\s+/).length} words).</p>
          )}
          {jobText.trim().length > 0 && (
            <Link href="/rewrite">
              <Button variant="emerald" className="w-full mt-3">Tailor for this job →</Button>
            </Link>
          )}
        </Card>
      </div>

      <VersionsCard />
    </div>
  );
}

/* General performance-review intake for every mode. This is separate from
   the veteran record above: the veteran card keeps branch/MOS/EPR context,
   while this card holds a civilian employer's latest review. The text is
   stored only on-device; Rewrite mines it, and the strengths below are
   derived locally from the app's skills dictionary. */
function PerformanceReviewCard() {
  const { perfReview, setPerfReview, resume, updateResume, hasResume } = useApp();
  const [parsing, setParsing] = useState(false);
  const [msg, setMsg] = useState("");
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(false);

  const reviewText = perfReview.text;
  const strengths = reviewText
    ? deriveSkills(reviewText).filter((skill) => {
        const s = skill.toLowerCase();
        return !resume.skills.some((existing) => {
          const e = existing.trim().toLowerCase();
          return e === s || e.includes(s) || s.includes(e);
        });
      })
    : [];
  const atSkillCap = resume.skills.length >= 24;

  async function handleReviewFile(f: File | undefined) {
    if (!f) return;
    setParsing(true);
    setMsg("");
    try {
      const { parseFile } = await import("@/lib/parse-file");
      const text = await parseFile(f);
      if (text.trim().length < 50) throw new Error("Couldn't read much text from that file. Try pasting the review instead.");
      setPerfReview({ text: redactDocumentText(text), updatedAt: Date.now() });
      setMsg(`Performance review loaded (${text.split(/\s+/).length} words). Find mined accomplishments in Rewrite and strengths below.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Couldn't parse that file.");
    } finally {
      setParsing(false);
    }
  }

  function savePaste() {
    if (paste.trim().length < 50) {
      setMsg("Paste a bit more — at least a few lines of your review.");
      return;
    }
    setPerfReview({ text: redactDocumentText(paste), updatedAt: Date.now() });
    setMsg("Performance review saved. Find mined accomplishments in Rewrite and strengths below.");
  }

  function addSkill(skill: string) {
    if (atSkillCap) return;
    if (resume.skills.some((s) => s.toLowerCase() === skill.toLowerCase())) return;
    updateResume({ skills: [...resume.skills, skill] });
  }

  return (
    <div className="mt-8">
      <SectionTitle sub="Your employer's review documents wins your resume may leave out. Add it once — Rewrite can mine it, and ResumeRoadmap can surface strengths from it.">
        Your latest performance review
      </SectionTitle>
      <Card>
        <Field label="Performance review file (PDF, DOCX, or TXT)">
          <input
            type="file" accept=".pdf,.docx,.doc,.txt"
            aria-label="Upload your latest performance review"
            onChange={(e) => handleReviewFile(e.target.files?.[0])}
            className="block w-full text-sm text-muted file:mr-4 file:rounded-xl file:border-0 file:bg-ink file:text-white file:px-5 file:py-3 file:text-sm file:font-bold file:min-h-[44px]"
          />
        </Field>
        {parsing && <p className="text-sm text-muted">Reading your performance review…</p>}
        {msg && <p className="text-sm text-emerald-900 font-medium">{msg}</p>}
        {reviewText ? (
          <div className="flex items-center justify-between mt-1 gap-3">
            <p className="text-xs text-muted">
              ✓ Review on file (~{reviewText.split(/\s+/).length} words)
              {perfReview.updatedAt ? ` · Updated ${new Date(perfReview.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}
              {" "}— stored only on this device.
            </p>
            <button
              onClick={() => { setPerfReview({ text: "", updatedAt: 0 }); setPaste(""); setMsg(""); }}
              aria-label="Clear performance review"
              className="text-xs text-muted underline min-h-[44px] px-2 shrink-0"
            >
              clear
            </button>
          </div>
        ) : null}
        <>
          <button
            onClick={() => { if (!paste && reviewText) setPaste(reviewText); setShowPaste(!showPaste); }}
            aria-expanded={showPaste}
            className="text-xs font-bold text-emerald-700 underline underline-offset-2 min-h-[44px]"
          >
            {showPaste ? "Hide paste box" : reviewText ? "…or replace it by pasting the review text" : "…or paste the review text instead"}
          </button>
          {showPaste && (
            <>
              <Field label="Paste your performance review">
                <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={6}
                  placeholder="Paste your latest performance review here…" className={inputCls}
                  aria-label="Paste your performance review" />
              </Field>
              <Button className="w-full mt-2" onClick={savePaste}>Use this review</Button>
            </>
          )}
        </>

        {reviewText && (
          <div className="border-t border-line mt-4 pt-4">
            <p className="font-bold text-ink text-sm mb-1.5">Strengths found in your review</p>
            {!hasResume ? (
              <p className="text-[13px] text-muted leading-relaxed">Add your resume to turn the strengths in this review into one-tap skill additions.</p>
            ) : strengths.length ? (
              <>
                <p className="text-[13px] text-muted leading-relaxed mb-2.5">
                  These skills appear in your review but not in your resume skills. Add the ones you want — Discover and Roadmap will use them right away.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {strengths.map((skill) => (
                    <button key={skill} onClick={() => addSkill(skill)} disabled={atSkillCap}
                      aria-label={`Add ${skill} to your resume skills`}
                      className="text-xs font-bold rounded-full px-3 py-2 border border-brand/40 bg-mint text-emerald-900 min-h-[44px] disabled:opacity-50">
                      + {skill}
                    </button>
                  ))}
                </div>
                {atSkillCap && <p className="text-xs text-muted mt-2">Your resume skills list is at the 24-skill cap — remove one before adding more.</p>}
              </>
            ) : (
              <p className="text-[13px] text-muted leading-relaxed">No additional skills from the built-in dictionary — your resume already lists what this review evidences.</p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

/* Professional summary editor — catches a missing summary and drafts one
   with AI (user edits after; nothing is written without the tap). */
function SummaryCard() {
  const { resume, updateResume, mode, jobText, targetTitle, company, military, aiConsent } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AiResponse<SummaryResult> | null>(null);
  const hasSummary = resume.summary.trim().length > 0;

  async function draftWithAi() {
    if (!aiConsent) return; // AI off — no request fires; the button shows AiOffNote instead
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "summary", mode, resume, jobText, targetTitle, company, military }),
      });
      // Parse the body manually instead of res.json(): on a non-JSON error
      // body, Safari's res.json() throws a raw browser exception ("The
      // string did not match the expected pattern.") — that must never
      // reach the user. Raw details go to the console only.
      const raw = await res.text();
      let json: AiResponse<SummaryResult> | null = null;
      try { json = JSON.parse(raw) as AiResponse<SummaryResult>; } catch { /* non-JSON body — handled below */ }
      if (!json) throw new Error(`Summary draft failed: non-JSON response (HTTP ${res.status})`);
      if (!json.data?.text) throw new Error(`Summary draft failed: unexpected response (HTTP ${res.status})`);
      setResult(json);
      updateResume({ summary: json.data.text });
    } catch (e) {
      console.error("Summary draft failed:", e);
      setError("Couldn't draft your summary right now. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mt-4">
      {!hasSummary && (
        <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-3">
          ⚠️ <b>No summary yet</b> — most recruiters read this first. Draft one from your resume, then edit it to sound like you.
        </p>
      )}
      <Field label="Professional summary" hint="Sits at the top of your resume — 3–5 sentences on who you are and your strongest proof.">
        <textarea
          value={resume.summary}
          onChange={(e) => updateResume({ summary: e.target.value })}
          rows={5}
          placeholder="e.g. Logistics manager who cut picking errors 38% across a 120-person team…"
          className={inputCls}
          aria-label="Professional summary"
        />
      </Field>
      {aiConsent ? (
        <Button variant="emerald" onClick={draftWithAi} disabled={loading} className="w-full">
          {loading ? "Drafting…" : hasSummary ? "↻ Redraft with AI" : "✨ Draft it with AI"}
        </Button>
      ) : (
        <AiOffNote />
      )}
      {hasSummary && (
        <p className="text-xs text-muted mt-2">Redrafting replaces the text above with a fresh draft — you can edit it right after.</p>
      )}
      {error && <p className="text-sm text-red-700 mt-2">{error}</p>}
      {result && <SourceNote source={result.source} note={result.note} />}
    </Card>
  );
}

/* New-to-workforce guided builder */
function BuilderForm() {
  const { setResume, targetTitle, setTargetTitle } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [objective, setObjective] = useState("");
  const [school, setSchool] = useState("");
  const [degree, setDegree] = useState("");
  const [eduDates, setEduDates] = useState("");
  const [projects, setProjects] = useState<ProjectItem[]>([{ name: "", description: "", tech: "", bullets: [] }]);
  const [work, setWork] = useState<ExperienceItem[]>([{ title: "", company: "", dates: "", bullets: [] }]);
  const [skills, setSkills] = useState("");
  const [msg, setMsg] = useState("");

  function generate() {
    if (!name.trim()) { setMsg("Add your name to generate the resume."); return; }
    const r = emptyResume();
    r.name = name.trim();
    r.email = email.trim();
    r.phone = phone.trim();
    r.location = location.trim();
    r.summary = objective.trim() || `${targetTitle ? `Aspiring ${targetTitle}` : "Motivated self-starter"} seeking an entry-level opportunity. Eager to contribute, learn fast, and deliver reliable results.`;
    r.education = school.trim() ? [{ school: school.trim(), degree: degree.trim(), dates: eduDates.trim(), details: "" }] : [];
    r.projects = projects.filter((p) => p.name.trim()).map((p) => ({
      ...p,
      bullets: p.description.trim() ? [p.description.trim()] : [],
    }));
    r.experience = work.filter((w) => w.title.trim()).map((w) => ({
      ...w,
      bullets: w.bullets.length ? w.bullets : [],
    }));
    r.skills = skills.split(",").map((s) => s.trim()).filter(Boolean);
    r.rawText = structuredToText(r);
    setResume(r);
    setMsg("✓ Your resume is built — head to Score to see how it reads.");
  }

  return (
    <Card>
      <p className="text-sm text-muted mb-4">No experience? No problem. Answer a few prompts — we'll write it with you, emphasizing projects, school, and volunteer work.</p>
      <Field label="Full name"><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Jordan Lee" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Email"><input value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" className={inputCls} placeholder="you@email.com" /></Field>
        <Field label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className={inputCls} placeholder="(555) 123-4567" /></Field>
      </div>
      <Field label="City, State"><input value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} placeholder="Tampa, FL" /></Field>
      <Field label="What job do you want?" hint="We'll aim the whole resume at this.">
        <input value={targetTitle} onChange={(e) => setTargetTitle(e.target.value)} className={inputCls} placeholder="e.g. Help Desk Technician" />
      </Field>
      <Field label="In your own words — why should someone hire you?" hint="2–3 sentences. We'll polish it.">
        <textarea value={objective} onChange={(e) => setObjective(e.target.value)} rows={3} className={inputCls}
          placeholder="I'm reliable, I learn fast, and I…" />
      </Field>

      <p className="font-bold text-ink text-sm mt-5 mb-2">Education</p>
      <Field label="School"><input value={school} onChange={(e) => setSchool(e.target.value)} className={inputCls} placeholder="Riverview High School" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Degree / diploma"><input value={degree} onChange={(e) => setDegree(e.target.value)} className={inputCls} placeholder="High School Diploma" /></Field>
        <Field label="Dates"><input value={eduDates} onChange={(e) => setEduDates(e.target.value)} className={inputCls} placeholder="2022 – 2026" /></Field>
      </div>

      <div className="flex items-center justify-between mt-5 mb-2">
        <p className="font-bold text-ink text-sm">Projects <span className="font-normal text-muted">(class, personal, anything you built)</span></p>
        <button onClick={() => setProjects([...projects, { name: "", description: "", tech: "", bullets: [] }])}
          className="text-emerald-700 font-bold text-sm min-h-[44px] px-2">+ Add</button>
      </div>
      {projects.map((p, i) => (
        <div key={i} className="rounded-xl border border-line p-3 mb-2">
          <input value={p.name} onChange={(e) => { const c = [...projects]; c[i].name = e.target.value; setProjects(c); }}
            className={`${inputCls} mb-2`} placeholder="Project name" />
          <textarea value={p.description} onChange={(e) => { const c = [...projects]; c[i].description = e.target.value; setProjects(c); }}
            className={inputCls} rows={2} placeholder="What did you do? What was the result?" />
          <input value={p.tech} onChange={(e) => { const c = [...projects]; c[i].tech = e.target.value; setProjects(c); }}
            className={`${inputCls} mt-2`} placeholder="Tools used (optional)" />
        </div>
      ))}

      <div className="flex items-center justify-between mt-4 mb-2">
        <p className="font-bold text-ink text-sm">Work / volunteer <span className="font-normal text-muted">(any job counts)</span></p>
        <button onClick={() => setWork([...work, { title: "", company: "", dates: "", bullets: [] }])}
          className="text-emerald-700 font-bold text-sm min-h-[44px] px-2">+ Add</button>
      </div>
      {work.map((w, i) => (
        <div key={i} className="rounded-xl border border-line p-3 mb-2">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input value={w.title} onChange={(e) => { const c = [...work]; c[i].title = e.target.value; setWork(c); }}
              className={inputCls} placeholder="Job title" />
            <input value={w.company} onChange={(e) => { const c = [...work]; c[i].company = e.target.value; setWork(c); }}
              className={inputCls} placeholder="Employer / org" />
          </div>
          <input value={w.dates} onChange={(e) => { const c = [...work]; c[i].dates = e.target.value; setWork(c); }}
            className={`${inputCls} mb-2`} placeholder="Dates" />
          <textarea value={w.bullets.join("\n")} onChange={(e) => { const c = [...work]; c[i].bullets = e.target.value.split("\n").filter(Boolean); setWork(c); }}
            className={inputCls} rows={2} placeholder={"What did you do there? One per line.\nHelped customers… / Trained 3 new hires…"} />
        </div>
      ))}

      <Field label="Skills (comma-separated)" hint="Anything: Spanish, Excel, cashier, Canva, CPR…">
        <input value={skills} onChange={(e) => setSkills(e.target.value)} className={inputCls} placeholder="Customer service, cash handling, Microsoft Word" />
      </Field>

      <Button onClick={generate} className="w-full">Build my resume →</Button>
      {msg && <p className="text-sm text-emerald-900 font-medium mt-2">{msg}</p>}
    </Card>
  );
}
