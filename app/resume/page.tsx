"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { parseFile, structuredToText, textToStructured } from "@/lib/parse";
import { ExperienceItem, ProjectItem, StructuredResume, emptyResume } from "@/lib/types";
import { Button, Card, Field, SectionTitle, inputCls } from "@/components/ui";

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
  const { mode, resume, setResume, targetTitle, setTargetTitle, company, setCompany, jobText, setJobText, jobUrl, setJobUrl, military, setMilitary } = useApp();
  const [tab, setTab] = useState<Tab>(mode === "new" ? "builder" : "upload");
  const [paste, setPaste] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseMsg, setParseMsg] = useState("");
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
      const text = await parseFile(f);
      if (text.trim().length < 50) throw new Error("Couldn't read much text from that file. Try pasting the text instead.");
      setMilitary({ ...military, evalText: text });
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
      const text = await parseFile(f);
      if (text.trim().length < 50) throw new Error("Couldn't read much text from that file. Try pasting the text instead.");
      setResume(textToStructured(text));
      setParseMsg(`Parsed ${text.split(/\s+/).length} words from ${f.name}.`);
    } catch (e) {
      setParseMsg(e instanceof Error ? e.message : "Couldn't parse that file.");
    } finally {
      setParsing(false);
    }
  }

  function handlePaste() {
    if (paste.trim().length < 50) { setParseMsg("Paste a bit more — at least a few lines of your resume."); return; }
    setResume(textToStructured(paste));
    setParseMsg("Resume loaded from pasted text.");
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
      <SectionTitle sub="Upload, paste, or build from scratch. Everything stays on your device unless you add an AI key.">
        Your resume
      </SectionTitle>

      <AiStatusPill />

      <div className="grid grid-cols-3 gap-1 bg-stone-200/60 rounded-xl p-1 mb-5">
        {(["upload", "paste", "builder"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg py-2.5 text-sm font-bold min-h-[44px] ${tab === t ? "bg-white text-ink shadow-sm" : "text-muted"}`}>
            {t === "upload" ? "Upload" : t === "paste" ? "Paste" : "Build"}
          </button>
        ))}
      </div>

      {tab === "upload" && (
        <Card>
          <Field label="Resume file (PDF, DOCX, or TXT)">
            <input
              type="file" accept=".pdf,.docx,.txt"
              onChange={(e) => handleFile(e.target.files?.[0])}
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
            <button onClick={() => setResume(emptyResume())} className="text-xs text-muted underline min-h-[44px] px-2">clear</button>
          </div>
          <p className="text-xs text-muted mb-3">
            {resume.name || "Unnamed"} · {resume.experience.length} role(s) · {resume.skills.length} skills · ~{resume.rawText.split(/\s+/).length} words
          </p>
          <Link href="/score"><Button className="w-full">Score my resume →</Button></Link>
        </Card>
      ) : (
        <p className="text-sm text-muted mt-4 text-center">Add your resume above to unlock scoring, rewrites, and tailoring.</p>
      )}

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
            <Field label="Yearly performance review (NCOER / OER / EPR / FITREP / eval)">
              <input
                type="file" accept=".pdf,.docx,.txt"
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
                <button onClick={() => setShowEvalPaste(!showEvalPaste)} className="text-xs font-bold text-brand underline underline-offset-2 min-h-[40px]">
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
                        setMilitary({ ...military, evalText: evalPaste });
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
        </Card>
      </div>
    </div>
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
          className="text-brand font-bold text-sm min-h-[44px] px-2">+ Add</button>
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
          className="text-brand font-bold text-sm min-h-[44px] px-2">+ Add</button>
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
