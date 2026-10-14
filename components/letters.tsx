"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { hasLinkedInContent } from "@/lib/linkedin-result";
import { AiResponse, CoverLetterResult, LinkedInResult } from "@/lib/types";
import { postAi, readJson } from "@/lib/ai-client";
import { Button, Card, EmptyState, Field, SectionTitle, SourceNote, TargetJobBanner, inputCls } from "./ui";
import { AiOffNote } from "./consent";

type Tone = "professional" | "confident" | "warm";

/* ---------------- Cover letter ---------------- */

export function CoverLetter() {
  const { resume, jobText, setJobText, jobUrl, setJobUrl, targetTitle, company, mode, military, aiConsent, coverLetterText, setCoverLetterText } = useApp();
  const [tone, setTone] = useState<Tone>("confident");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResponse<CoverLetterResult> | null>(null);
  const [error, setError] = useState("");
  const [edited, setEdited] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchMsg, setFetchMsg] = useState("");
  // The letter persists in the store (coverLetterText); `edited` is the
  // working copy. Until the user touches it, mirror the stored letter in
  // (this also picks it up when the store hydrates after first render,
  // and when a saved version carrying a letter is loaded).
  const editedDirty = useRef(false);
  const [warnTone, setWarnTone] = useState<Tone | null>(null);
  useEffect(() => {
    if (!editedDirty.current && coverLetterText && coverLetterText !== edited) setEdited(coverLetterText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coverLetterText]);
  const hasLetter = edited.trim().length > 0;

  function editLetter(v: string) {
    editedDirty.current = true;
    setEdited(v);
    setCoverLetterText(v);
  }

  async function fetchJob() {
    if (!jobUrl.trim()) { setFetchMsg("Paste a job posting URL first."); return; }
    setFetching(true);
    setFetchMsg("");
    try {
      const res = await fetch(`/api/fetch-job?url=${encodeURIComponent(jobUrl.trim())}`);
      // Guarded parse (RR-11): a non-JSON error body must not throw a raw
      // browser exception into the user's message line.
      const json = (await readJson(res)) as { error?: string; text?: string } | null;
      if (!res.ok) throw new Error(json?.error || "Fetch failed");
      if (!json?.text) throw new Error("Fetch failed");
      setJobText(json.text);
      setFetchMsg(`Pulled ${json.text.split(/\s+/).length} words from the posting.`);
    } catch (e) {
      setFetchMsg(e instanceof Error ? e.message : "Fetch failed — paste the text below instead.");
    } finally {
      setFetching(false);
    }
  }

  async function doGenerate(t: Tone) {
    if (!aiConsent) return; // AI off — no request fires; the CTAs show AiOffNote instead
    setLoading(true);
    setError("");
    try {
      const json = await postAi<CoverLetterResult>({ task: "cover-letter", mode, resume, jobText, targetTitle, company, tone: t, military });
      setResult(json);
      editedDirty.current = true;
      setEdited(json.data.text);
      setCoverLetterText(json.data.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  // Any (re)generation replaces the current letter and the user's edits —
  // when a letter exists, warn inline first instead of discarding silently.
  function requestGenerate(t: Tone) {
    if (hasLetter) { setWarnTone(t); return; }
    setTone(t);
    void doGenerate(t);
  }

  function copy() {
    // RR-25: a denied clipboard permission used to fail silently — the
    // button now says so and tells the user the manual path.
    navigator.clipboard.writeText(edited).then(() => {
      setCopyFailed(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {
      setCopied(false);
      setCopyFailed(true);
      setTimeout(() => setCopyFailed(false), 2500);
    });
  }

  function download() {
    const blob = new Blob([edited], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cover-letter.txt";
    a.click();
  }

  async function downloadDocx() {
    try {
      const { buildCoverLetterDocxBlob } = await import("@/lib/docx");
      const blob = await buildCoverLetterDocxBlob(edited);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "cover-letter.docx";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch {
      setError("Couldn't build the Word file — the .txt download still works.");
    }
  }

  return (
    <>
      <TargetJobBanner />
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
          {aiConsent ? (
            <Button onClick={() => requestGenerate(tone)} disabled={loading} className="flex-1">
              {loading ? "…" : "Tailor"}
            </Button>
          ) : (
            <AiOffNote className="flex-1" />
          )}
        </div>
        {error && <p className="text-sm text-red-700 mb-2">{error}</p>}
      </Card>

      <div className="flex gap-2 mb-3">
        {(["professional", "confident", "warm"] as Tone[]).map((t) => (
          <button key={t} onClick={() => { if (hasLetter) setWarnTone(t); else setTone(t); }}
            className={`flex-1 text-center text-[13px] font-bold py-2.5 rounded-full border-[1.5px] min-h-[44px] capitalize transition ${
              tone === t ? "border-pine text-pine bg-mint" : "border-line text-muted bg-white"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {warnTone && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-3">
          <p className="text-xs text-amber-900 leading-relaxed mb-2">
            Regenerating replaces this letter and your edits.
          </p>
          <div className="flex gap-2">
            <Button variant="danger" onClick={() => { const t = warnTone; setWarnTone(null); setTone(t); void doGenerate(t); }} className="flex-1">Regenerate</Button>
            <Button variant="secondary" onClick={() => setWarnTone(null)} className="flex-1">Keep mine</Button>
          </div>
        </div>
      )}

      {!hasLetter && !loading && (
        <Card className="text-center py-8">
          <p className="font-extrabold text-navy mb-2">A letter written for this exact job</p>
          <p className="text-sm text-muted mb-5 max-w-xs mx-auto">
            Tailored to your resume{jobText ? " and the posting" : ""}, in your tone. Fully editable before you send it.
          </p>
          {aiConsent ? (
            <Button variant="emerald" onClick={() => requestGenerate(tone)} className="w-full !min-h-[52px]">
              ✉ Generate cover letter
            </Button>
          ) : (
            <AiOffNote />
          )}
        </Card>
      )}
      {loading && <p className="text-sm text-muted text-center py-8">Writing your letter…</p>}

      {hasLetter && (
        <>
          <div className="bg-white border border-line rounded-xl p-4 text-[13px] leading-[1.7] text-slate-700 mb-3">
            <textarea value={edited} onChange={(e) => editLetter(e.target.value)} rows={14}
              className="w-full bg-transparent resize-y" />
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            <button onClick={() => requestGenerate(tone)} className="flex-1 text-center text-[13px] font-bold py-3 rounded-[10px] bg-slate-100 text-slate-700 min-h-[44px]">
              ↻ Regenerate
            </button>
            <button onClick={copy} className="flex-1 text-center text-[13px] font-bold py-3 rounded-[10px] bg-brand text-white min-h-[44px]">
              {copyFailed ? "Copy failed — select the text to copy" : copied ? "✓ Copied" : "Copy letter"}
            </button>
            <button onClick={download} className="flex-1 text-center text-[13px] font-bold py-3 rounded-[10px] bg-slate-100 text-slate-700 min-h-[44px]">
              .txt
            </button>
            <button onClick={downloadDocx} className="flex-1 text-center text-[13px] font-bold py-3 rounded-[10px] bg-slate-100 text-slate-700 min-h-[44px]">
              Download .docx
            </button>
          </div>
          {result && <SourceNote source={result.source} note={result.note} />}
        </>
      )}
    </>
  );
}

/* ---------------- LinkedIn ---------------- */

export function LinkedIn() {
  const { resume, jobText, targetTitle, linkedinText, setLinkedinText, mode, military, aiConsent, linkedinResult, setLinkedinResult, updateResume } = useApp();
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<{ source: "ai" | "fallback"; note?: string } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [copyFailed, setCopyFailed] = useState("");
  const [picked, setPicked] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  // The generated content lives in the store (linkedinResult) so it
  // survives navigation; edits write straight back to it. `meta` only
  // carries this session's source/note for the SourceNote line.
  const data = hasLinkedInContent(linkedinResult) ? linkedinResult : null;
  const headlines = data?.headlines ?? [];
  const about = data?.about ?? "";
  const bullets = data?.polishedBullets ?? [];
  const atSkillCap = resume.skills.length >= 24;

  function patchResult(patch: Partial<LinkedInResult>) {
    if (data) setLinkedinResult({ ...data, ...patch });
  }

  // Mirrors the Resume tab's "Strengths found in your review" one-tap
  // add: same case-insensitive dedupe and the same 24-skill cap.
  function addSkill(skill: string) {
    if (atSkillCap) return;
    if (resume.skills.some((s) => s.toLowerCase() === skill.toLowerCase())) return;
    updateResume({ skills: [...resume.skills, skill] });
  }

  async function generate(fb = "") {
    if (!aiConsent) return; // AI off — no request fires; the CTA shows AiOffNote instead
    setLoading(true);
    setError("");
    try {
      const json = await postAi<LinkedInResult>({ task: "linkedin", mode, resume, jobText, targetTitle, linkedinText, feedback: fb, military });
      setLinkedinResult(json.data);
      setMeta({ source: json.source, note: json.note });
      setPicked(0);
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
      const { parseFile } = await import("@/lib/parse-file");
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
    // RR-25: surface clipboard failures instead of swallowing them.
    navigator.clipboard.writeText(text).then(() => {
      setCopyFailed("");
      setCopied(id);
      setTimeout(() => setCopied(""), 1500);
    }).catch(() => {
      setCopied("");
      setCopyFailed(id);
      setTimeout(() => setCopyFailed(""), 2500);
    });
  }

  function copyAll() {
    if (!data) return;
    // Every generated section, labelled — the button's label is the truth.
    const sections = [
      `HEADLINE\n${headlines[picked] ?? ""}`,
      `ABOUT\n${about}`,
      `POLISHED BULLETS\n${bullets.map((b) => `• ${b.polished}`).join("\n")}`,
      `SKILLS GAP\n${data.skillsGap.join(", ")}`,
      ...(data.tip ? [`TIP\n${data.tip}`] : []),
    ];
    copy(sections.join("\n\n"), "all");
  }

  return (
    <>
      {!data && !loading && (
        <>
          <Card className="mb-3">
            <Field label="Your LinkedIn profile" hint="Export your profile as a PDF from LinkedIn (Me → View Profile → More → Save to PDF), or paste the text — generation uses it as the source of truth.">
              <label className={`${inputCls} flex items-center justify-center gap-2 cursor-pointer text-center !text-pine font-bold focus-within:ring-2 focus-within:ring-brand/40 focus-within:border-brand`}>
                {uploading ? "Reading file…" : linkedinText ? "↻ Replace profile file" : "⬆ Upload LinkedIn PDF / DOCX / TXT"}
                <input type="file" accept=".pdf,.docx,.doc,.txt" className="sr-only"
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
            {aiConsent ? (
              <Button variant="emerald" onClick={() => generate()} className="w-full !min-h-[52px]">
                Build my LinkedIn content
              </Button>
            ) : (
              <AiOffNote />
            )}
            {error && <p className="text-sm text-red-700 mt-3">{error}</p>}
          </Card>
        </>
      )}
      {loading && <p className="text-sm text-muted text-center py-8">Building your profile content…</p>}

      {data && (
        <>
          {data.appliedFeedback?.length ? (
            <div className="bg-mint border border-emerald-200 rounded-xl p-3 mb-3">
              {data.appliedFeedback.map((a, i) => (
                <p key={i} className="text-xs text-emerald-900 leading-relaxed">✓ {a}</p>
              ))}
            </div>
          ) : null}
          <p className="text-[13px] font-extrabold text-navy mt-1 mb-1">Headline — pick one, tap to edit</p>
          <div className="grid gap-2" role="radiogroup" aria-label="Headline options">
            {headlines.map((h, i) => (
              <label key={i}
                className={`rounded-xl p-3 border-[1.5px] min-h-[44px] transition cursor-pointer has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-linkedin/50 ${
                  picked === i ? "border-linkedin bg-blue-50" : "border-line bg-white"
                }`}>
                <input type="radio" name="linkedin-headline" className="sr-only"
                  checked={picked === i} onChange={() => setPicked(i)} />
                <span className={`text-[10px] font-bold uppercase tracking-wide ${picked === i ? "text-linkedin" : "text-muted"}`}>
                  {i === 0 ? "Recommended" : `Option ${i + 1}`}
                </span>
                {picked === i ? (
                  <textarea value={h} rows={2}
                    onChange={(e) => patchResult({ headlines: headlines.map((x, j) => (j === i ? e.target.value : x)) })}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-transparent text-[13px] mt-1 leading-relaxed text-slate-800 resize-y" />
                ) : (
                  <p className="text-[13px] mt-1 leading-relaxed text-slate-800">{h}</p>
                )}
              </label>
            ))}
          </div>

          <p className="text-[13px] font-extrabold text-navy mt-5 mb-1">About section — edit freely</p>
          <div className="bg-white border border-line rounded-xl p-3">
            <textarea value={about} onChange={(e) => patchResult({ about: e.target.value })} rows={8}
              className="w-full bg-transparent text-[13px] text-slate-700 leading-relaxed resize-y" />
            <button onClick={() => copy(about, "about")}
              className="text-xs text-linkedin font-bold mt-1 min-h-[44px] inline-flex items-center">{copyFailed === "about" ? "Copy failed — select the text to copy" : copied === "about" ? "✓ Copied" : "Tap to copy →"}</button>
          </div>

          {bullets.length > 0 && (
            <>
              <p className="text-[13px] font-extrabold text-navy mt-5 mb-1">Experience polish — edit freely</p>
              <div className="grid gap-2">
                {bullets.map((b, i) => (
                  <Card key={i} className="!p-3.5">
                    <p className="text-xs text-muted line-through decoration-red-400 mb-1">{b.original}</p>
                    <textarea value={b.polished} rows={2}
                      onChange={(e) => patchResult({ polishedBullets: bullets.map((x, j) => (j === i ? { ...x, polished: e.target.value } : x)) })}
                      className="w-full bg-transparent text-[13px] text-ink font-medium resize-y" />
                  </Card>
                ))}
              </div>
            </>
          )}

          {data.skillsGap.length > 0 && (
            <div className="mt-4 bg-white border border-line rounded-xl p-3">
              <div className="flex gap-2.5 mb-2.5">
                <span className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-sm shrink-0">🎯</span>
                <div>
                  <p className="text-[13px] font-bold text-ink">{data.skillsGap.length} skills to add</p>
                  <p className="text-xs text-muted leading-snug">From the posting, not in your resume skills yet. Add the ones you truly have.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.skillsGap.map((skill) => {
                  const already = resume.skills.some((s) => s.toLowerCase() === skill.toLowerCase());
                  return (
                    <button key={skill} onClick={() => addSkill(skill)} disabled={already || atSkillCap}
                      aria-label={already ? `${skill} already in your resume skills` : `Add ${skill} to your resume skills`}
                      className="text-xs font-bold rounded-full px-3 py-2 border border-brand/40 bg-mint text-emerald-900 min-h-[44px] disabled:opacity-50">
                      {already ? `✓ ${skill}` : `+ Add ${skill}`}
                    </button>
                  );
                })}
              </div>
              {atSkillCap && <p className="text-xs text-muted mt-2">Your resume skills list is at the 24-skill cap — remove one before adding more.</p>}
            </div>
          )}

          <Button variant="emerald" onClick={copyAll} className="w-full mt-4 !min-h-[52px]">
            {copyFailed === "all" ? "Copy failed — try the sections above" : copied === "all" ? "✓ Copied" : "Copy all to LinkedIn"}
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
            {meta ? <SourceNote source={meta.source} note={meta.note} /> : <span />}
            <button onClick={() => { setLinkedinResult(null); setMeta(null); }} className="text-xs text-muted underline min-h-[44px] px-2 shrink-0">Regenerate</button>
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
