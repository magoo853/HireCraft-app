"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { AiResponse, CoverLetterResult, LinkedInResult } from "@/lib/types";
import { Button, Card, EmptyState, Field, SectionTitle, SourceNote, inputCls } from "./ui";

type Tone = "professional" | "confident" | "warm";

/* ---------------- Cover letter ---------------- */

export function CoverLetter() {
  const { resume, jobText, targetTitle, company } = useApp();
  const [tone, setTone] = useState<Tone>("confident");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResponse<CoverLetterResult> | null>(null);
  const [error, setError] = useState("");
  const [edited, setEdited] = useState("");
  const [copied, setCopied] = useState(false);

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
            <input value={jobText ? "🔗 Posting loaded ✓" : ""} readOnly placeholder="🔗  paste the link on the Resume tab…"
              className={`${inputCls} !text-muted`} />
            <Button onClick={generate} disabled={loading} className="shrink-0">
              {loading ? "…" : "Tailor"}
            </Button>
          </div>
        </Field>
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
  const { resume, jobText, targetTitle } = useApp();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResponse<LinkedInResult> | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [picked, setPicked] = useState(0);

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "linkedin", mode: "general", resume, jobText, targetTitle }),
      });
      const json = (await res.json()) as AiResponse<LinkedInResult>;
      setResult(json);
      setPicked(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
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
    const all = `HEADLINE\n${result.data.headlines[picked]}\n\nABOUT\n${result.data.about}`;
    copy(all, "all");
  }

  return (
    <>
      {!result && !loading && (
        <Card className="text-center py-8">
          <p className="font-extrabold text-navy mb-2">A LinkedIn profile that gets found</p>
          <p className="text-sm text-muted mb-5 max-w-xs mx-auto">
            Headline options, an About rewrite, polished experience bullets, and the skills you're missing vs. the posting.
          </p>
          <Button variant="emerald" onClick={generate} className="w-full !min-h-[52px]">
            Build my LinkedIn content
          </Button>
          {error && <p className="text-sm text-red-700 mt-3">{error}</p>}
        </Card>
      )}
      {loading && <p className="text-sm text-muted text-center py-8">Building your profile content…</p>}

      {result && (
        <>
          <p className="text-[13px] font-extrabold text-navy mt-1 mb-1">Headline — pick one</p>
          <div className="grid gap-2">
            {result.data.headlines.map((h, i) => (
              <button key={i} onClick={() => setPicked(i)}
                className={`text-left rounded-xl p-3 border-[1.5px] min-h-[44px] transition ${
                  picked === i ? "border-linkedin bg-blue-50" : "border-line bg-white"
                }`}>
                <span className={`text-[10px] font-bold uppercase tracking-wide ${picked === i ? "text-linkedin" : "text-muted"}`}>
                  {i === 0 ? "Recommended" : `Option ${i + 1}`}
                </span>
                <p className="text-[13px] mt-1 leading-relaxed text-slate-800">{h}</p>
              </button>
            ))}
          </div>

          <p className="text-[13px] font-extrabold text-navy mt-5 mb-1">About section</p>
          <button onClick={() => copy(result.data.about, "about")}
            className="w-full text-left bg-white border border-line rounded-xl p-3 min-h-[44px]">
            <p className="text-[13px] text-slate-700 whitespace-pre-wrap leading-relaxed">{result.data.about}</p>
            <p className="text-xs text-linkedin font-bold mt-2">{copied === "about" ? "✓ Copied" : "Tap to copy →"}</p>
          </button>

          {result.data.polishedBullets.length > 0 && (
            <>
              <p className="text-[13px] font-extrabold text-navy mt-5 mb-1">Experience polish</p>
              <div className="grid gap-2">
                {result.data.polishedBullets.slice(0, 4).map((b, i) => (
                  <Card key={i} className="!p-3.5">
                    <p className="text-xs text-muted line-through decoration-red-400 mb-1">{b.original}</p>
                    <p className="text-[13px] text-ink font-medium">{b.polished}</p>
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
