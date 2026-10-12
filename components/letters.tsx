"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { AiResponse, CoverLetterResult, LinkedInResult } from "@/lib/types";
import { Button, Card, EmptyState, Field, SectionTitle, SourceNote, inputCls } from "./ui";

type Tone = "professional" | "confident" | "warm";

/* ---------------- Cover letter ---------------- */

export function CoverLetter() {
  const { resume, jobText, setJobText, jobUrl, setJobUrl, targetTitle, company } = useApp();
  const [tone, setTone] = useState<Tone>("confident");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResponse<CoverLetterResult> | null>(null);
  const [error, setError] = useState("");
  const [edited, setEdited] = useState("");
  const [copied, setCopied] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchMsg, setFetchMsg] = useState("");

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
      setFetchMsg(e instanceof Error ? e.message : "Fetch failed — paste the text below instead.");
    } finally {
      setFetching(false);
    }
  }

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "cover-letter", mode: "general", resume, jobText, targetTitle, company, tone }),
      });
      const json = (await res.json()) as AiResponse<CoverLetterResult>;
      setResult(json);
      setEdited(json.data.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    navigator.clipboard.writeText(edited).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  }

  function download() {
    const blob = new Blob([edited], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cover-letter.txt";
    a.click();
  }

  return (
    <>
      <Card className="mb-3">
        <Field label="Job posting link">
          <div className="flex gap-2">
            <input value={jobUrl} onChange={(e) => setJobUrl(e.target.value)}
              placeholder="🔗  paste the job posting link…" inputMode="url" className={inputCls} />
            <Button onClick={fetchJob} disabled={fetching} variant="secondary" className="shrink-0">
              {fetching ? "…" : "Fetch"}
            </Button>
          </div>
        </Field>
        {fetchMsg && <p className="text-sm text-emerald-900 font-medium -mt-2 mb-2">{fetchMsg}</p>}
        {jobText.trim().length > 100 ? (
          <p className="text-sm text-emerald-900 font-medium">✓ Posting loaded (~{jobText.split(/\s+/).length} words).</p>
        ) : (
          <Field label="…or paste the job description" hint="Tailoring works identically from pasted text.">
            <textarea value={jobText} onChange={(e) => setJobText(e.target.value)} rows={4}
              placeholder="Paste the full job posting here…" className={inputCls} />
          </Field>
        )}
        <div className="flex gap-2 mt-3">
          <Button onClick={generate} disabled={loading} className="flex-1">
            {loading ? "…" : "Tailor"}
          </Button>
        </div>
        {error && <p className="text-sm text-red-700 mb-2">{error}</p>}
      </Card>

      <div className="flex gap-2 mb-3">
        {(["professional", "confident", "warm"] as Tone[]).map((t) => (
          <button key={t} onClick={() => { setTone(t); setResult(null); }}
            className={`flex-1 text-center text-[13px] font-bold py-2.5 rounded-full border-[1.5px] min-h-[44px] capitalize transition ${
              tone === t ? "border-pine text-pine bg-mint" : "border-line text-muted bg-white"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {!result && !loading && (
        <Card className="text-center py-8">
          <p className="font-extrabold text-navy mb-2">A letter written for this exact job</p>
          <p className="text-sm text-muted mb-5 max-w-xs mx-auto">
            Tailored to your resume{jobText ? " and the posting" : ""}, in your tone. Fully editable before you send it.
          </p>
          <Button variant="emerald" onClick={generate} className="w-full !min-h-[52px]">
            ✉ Generate cover letter
          </Button>
        </Card>
      )}
      {loading && <p className="text-sm text-muted text-center py-8">Writing your letter…</p>}

      {result && (
        <>
          <div className="bg-white border border-line rounded-xl p-4 text-[13px] leading-[1.7] text-slate-700 mb-3">
            <textarea value={edited} onChange={(e) => setEdited(e.target.value)} rows={14}
              className="w-full bg-transparent resize-y focus:outline-none" />
          </div>
          <div className="flex gap-2 mb-2">
            <button onClick={() => { setResult(null); }} className="flex-1 text-center text-[13px] font-bold py-3 rounded-[10px] bg-slate-100 text-slate-700 min-h-[44px]">
              ↻ Regenerate
            </button>
            <button onClick={copy} className="flex-1 text-center text-[13px] font-bold py-3 rounded-[10px] bg-brand text-white min-h-[44px]">
              {copied ? "✓ Copied" : "Copy letter"}
            </button>
            <button onClick={download} className="flex-1 text-center text-[13px] font-bold py-3 rounded-[10px] bg-slate-100 text-slate-700 min-h-[44px]">
              .txt
            </button>
          </div>
          <SourceNote source={result.source} />
        </>
      )}
    </>
  );
}

/* ---------------- LinkedIn ---------------- */

export function LinkedIn() {
  const { resume, jobText, targetTitle, linkedinText, setLinkedinText } = useApp();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResponse<LinkedInResult> | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [picked, setPicked] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  // Editable copies of the generated content
  const [headlines, setHeadlines] = useState<string[]>([]);
  const [about, setAbout] = useState("");
  const [bullets, setBullets] = useState<{ original: string; polished: string }[]>([]);

  async function generate(fb = "") {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "linkedin", mode: "general", resume, jobText, targetTitle, linkedinText, feedback: fb }),
      });
      const json = (await res.json()) as AiResponse<LinkedInResult>;
      setResult(json);
      setPicked(0);
      setHeadlines(json.data.headlines);
      setAbout(json.data.about);
      setBullets(json.data.polishedBullets);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function uploadProfile(f: File) {
    setUploading(true);
    setUploadMsg("");
    try {
      const { parseFile } = await import("@/lib/parse");
      const text = await parseFile(f);
      if (text.trim().length < 50) throw new Error("Couldn't read much text from that file — try the LinkedIn PDF export or paste the text below.");
      setLinkedinText(text);
      setUploadMsg(`Profile loaded (~${text.split(/\s+/).length} words).`);
    } catch (e) {
      setUploadMsg(e instanceof Error ? e.message : "Upload failed — paste the text below instead.");
    } finally {
      setUploading(false);
    }
  }

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(""), 1500);
    }).catch(() => {});
  }

  function copyAll() {
    if (!result) return;
    const all = `HEADLINE\n${headlines[picked]}\n\nABOUT\n${about}`;
    copy(all, "all");
  }

  return (
    <>
      {!result && !loading && (
        <>
          <Card className="mb-3">
            <Field label="Your LinkedIn profile" hint="Export your profile as a PDF from LinkedIn (Me → View Profile → More → Save to PDF), or paste the text — generation uses it as the source of truth.">
              <label className={`${inputCls} flex items-center justify-center gap-2 cursor-pointer text-center !text-pine font-bold`}>
                {uploading ? "Reading file…" : linkedinText ? "↻ Replace profile file" : "⬆ Upload LinkedIn PDF / DOCX / TXT"}
                <input type="file" accept=".pdf,.docx,.txt" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadProfile(f); e.target.value = ""; }} />
              </label>
            </Field>
            {uploadMsg && <p className="text-sm text-emerald-900 font-medium -mt-2 mb-2">{uploadMsg}</p>}
            <Field label="…or paste your profile text">
              <textarea value={linkedinText} onChange={(e) => setLinkedinText(e.target.value)} rows={5}
                placeholder="Paste your LinkedIn About + Experience here…" className={inputCls} />
            </Field>
            {linkedinText.trim().length > 100 && (
              <p className="text-sm text-emerald-900 font-medium">✓ Profile loaded (~{linkedinText.split(/\s+/).length} words).</p>
            )}
          </Card>
          <Card className="text-center py-8">
            <p className="font-extrabold text-navy mb-2">A LinkedIn profile that gets found</p>
            <p className="text-sm text-muted mb-5 max-w-xs mx-auto">
              Headline options, an About rewrite, polished experience bullets, and the skills you're missing vs. the posting.
            </p>
            <Button variant="emerald" onClick={() => generate()} className="w-full !min-h-[52px]">
              Build my LinkedIn content
            </Button>
            {error && <p className="text-sm text-red-700 mt-3">{error}</p>}
          </Card>
        </>
      )}
      {loading && <p className="text-sm text-muted text-center py-8">Building your profile content…</p>}

      {result && (
        <>
          {result.data.appliedFeedback?.length ? (
            <div className="bg-mint border border-emerald-200 rounded-xl p-3 mb-3">
              {result.data.appliedFeedback.map((a, i) => (
                <p key={i} className="text-xs text-emerald-900 leading-relaxed">✓ {a}</p>
              ))}
            </div>
          ) : null}
          <p className="text-[13px] font-extrabold text-navy mt-1 mb-1">Headline — pick one, tap to edit</p>
          <div className="grid gap-2">
            {headlines.map((h, i) => (
              <div key={i} onClick={() => setPicked(i)}
                className={`rounded-xl p-3 border-[1.5px] min-h-[44px] transition cursor-pointer ${
                  picked === i ? "border-linkedin bg-blue-50" : "border-line bg-white"
                }`}>
                <span className={`text-[10px] font-bold uppercase tracking-wide ${picked === i ? "text-linkedin" : "text-muted"}`}>
                  {i === 0 ? "Recommended" : `Option ${i + 1}`}
                </span>
                {picked === i ? (
                  <textarea value={h} rows={2}
                    onChange={(e) => setHeadlines(headlines.map((x, j) => (j === i ? e.target.value : x)))}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-transparent text-[13px] mt-1 leading-relaxed text-slate-800 focus:outline-none resize-y" />
                ) : (
                  <p className="text-[13px] mt-1 leading-relaxed text-slate-800">{h}</p>
                )}
              </div>
            ))}
          </div>

          <p className="text-[13px] font-extrabold text-navy mt-5 mb-1">About section — edit freely</p>
          <div className="bg-white border border-line rounded-xl p-3">
            <textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={8}
              className="w-full bg-transparent text-[13px] text-slate-700 leading-relaxed focus:outline-none resize-y" />
            <button onClick={() => copy(about, "about")}
              className="text-xs text-linkedin font-bold mt-1 min-h-[36px]">{copied === "about" ? "✓ Copied" : "Tap to copy →"}</button>
          </div>

          {bullets.length > 0 && (
            <>
              <p className="text-[13px] font-extrabold text-navy mt-5 mb-1">Experience polish — edit freely</p>
              <div className="grid gap-2">
                {bullets.slice(0, 4).map((b, i) => (
                  <Card key={i} className="!p-3.5">
                    <p className="text-xs text-muted line-through decoration-red-400 mb-1">{b.original}</p>
                    <textarea value={b.polished} rows={2}
                      onChange={(e) => setBullets(bullets.map((x, j) => (j === i ? { ...x, polished: e.target.value } : x)))}
                      className="w-full bg-transparent text-[13px] text-ink font-medium focus:outline-none resize-y" />
                  </Card>
                ))}
              </div>
            </>
          )}

          {result.data.skillsGap.length > 0 && (
            <div className="mt-4 bg-white border border-line rounded-xl p-3 flex gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-sm shrink-0">🎯</span>
              <div>
                <p className="text-[13px] font-bold text-ink">{result.data.skillsGap.length} skills to add</p>
                <p className="text-xs text-muted leading-snug">{result.data.skillsGap.slice(0, 5).join(", ")}</p>
              </div>
            </div>
          )}

          <Button variant="emerald" onClick={copyAll} className="w-full mt-4 !min-h-[52px]">
            {copied === "all" ? "✓ Copied" : "Copy all to LinkedIn"}
          </Button>
          <Card className="mt-3">
            <Field label="Not quite right? Say what to change" hint='e.g. "make it punchier", "shorter", "warmer", "more formal"'>
              <div className="flex gap-2">
                <input value={feedback} onChange={(e) => setFeedback(e.target.value)}
                  placeholder="What should change…" className={inputCls} />
                <Button onClick={() => { setFeedback(""); generate(feedback); }} disabled={loading || !feedback.trim()} variant="secondary" className="shrink-0">
                  {loading ? "…" : "↻ Regenerate"}
                </Button>
              </div>
            </Field>
          </Card>
          <div className="flex items-center justify-between mt-2">
            <SourceNote source={result.source} />
            <button onClick={() => setResult(null)} className="text-xs text-muted underline min-h-[44px] px-2 shrink-0">Regenerate</button>
          </div>
        </>
      )}
    </>
  );
}

export function LettersGate({ children }: { children: React.ReactNode }) {
  const { hasResume } = useApp();
  if (!hasResume) {
    return (
      <EmptyState
        title="No resume yet"
        body="Add your resume first — everything here is built from it."
        cta="Add my resume" href="/resume"
      />
    );
  }
  return <>{children}</>;
}

export function CoverPageShell() {
  return (
    <div>
      <SectionTitle sub="Tailored to your resume and the posting. Edit anything — it's yours.">Cover Letter</SectionTitle>
      <LettersGate><CoverLetter /></LettersGate>
    </div>
  );
}

export function LinkedInPageShell() {
  return (
    <div>
      <SectionTitle sub="Headlines, About, and the skills gap — copy-paste ready.">LinkedIn</SectionTitle>
      <LettersGate><LinkedIn /></LettersGate>
    </div>
  );
}
