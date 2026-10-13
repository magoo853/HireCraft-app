"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import {
  LIKERT_LABELS,
  QUIZ_QUESTIONS,
  RIASEC_BLURBS,
  RIASEC_NAMES,
  RiasecLetter,
  JobMatch,
  RiasecScores,
  fmtSalary,
  jobSearchLinks,
} from "@/lib/careers";
import { AiResponse } from "@/lib/types";
import { JobPosting, ScoredPosting, scorePosting } from "@/lib/jobs";
import { Button, Card, EmptyState, Field, SectionTitle, SourceNote, inputCls } from "@/components/ui";

interface DiscoverResult {
  scores: RiasecScores;
  code: string;
  top: RiasecLetter[];
  matches: JobMatch[];
}

type Stage = "intro" | "quiz" | "results";
const LS_KEY = "hirecraft-quiz";

export default function DiscoverPage() {
  const { resume, hasResume, mode, military } = useApp();
  const [stage, setStage] = useState<Stage>("intro");
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResponse<DiscoverResult> | null>(null);
  const [error, setError] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [location, setLocation] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.answers?.length === QUIZ_QUESTIONS.length && saved.result) {
          setAnswers(saved.answers);
          setResult(saved.result);
          setStage("results");
        }
        if (saved.location) setLocation(saved.location);
      }
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const saved = raw ? JSON.parse(raw) : {};
      localStorage.setItem(LS_KEY, JSON.stringify({ ...saved, location }));
    } catch { /* noop */ }
  }, [location]);

  if (!hasResume) {
    return (
      <EmptyState
        title="No resume yet"
        body="Discover matches your work style against your actual experience — add your resume first, then take the quiz."
        cta="Add my resume" href="/resume"
      />
    );
  }

  function answer(v: number) {
    const next = [...answers];
    next[qi] = v;
    setAnswers(next);
    if (qi < QUIZ_QUESTIONS.length - 1) {
      setQi(qi + 1);
    } else {
      finish(next);
    }
  }

  async function finish(finalAnswers: number[]) {
    setLoading(true);
    setError("");
    setStage("results");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "discover", mode, resume, answers: finalAnswers, military }),
      });
      const json = (await res.json()) as AiResponse<DiscoverResult>;
      setResult(json);
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({ answers: finalAnswers, result: json }));
      } catch { /* noop */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function retake() {
    setAnswers([]);
    setQi(0);
    setResult(null);
    setUnlocked(false);
    setSelected(null);
    try { localStorage.removeItem(LS_KEY); } catch { /* noop */ }
    setStage("quiz");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <SectionTitle sub="A work-style quiz meets your real resume. Find the lanes you're built for.">
          Discover
        </SectionTitle>
      </div>

      {stage === "intro" && (
        <Card className="text-center py-8">
          <p className="text-4xl mb-3">🧭</p>
          <p className="font-extrabold text-navy text-lg mb-2">What kind of work fits you?</p>
          <p className="text-sm text-muted mb-1 max-w-xs mx-auto leading-relaxed">
            {QUIZ_QUESTIONS.length} quick questions on how you like to work — mapped to the Holland Code
            (RIASEC) framework used by career counselors for decades.
          </p>
          <p className="text-sm text-muted mb-6 max-w-xs mx-auto leading-relaxed">
            We combine your result with your resume to recommend job titles with fit scores.
            The quiz is free — your top 3 matches are free, the full list is paid.
          </p>
          <Button variant="emerald" onClick={() => { setStage("quiz"); setQi(0); setAnswers([]); }} className="w-full !min-h-[52px]">
            Start the quiz →
          </Button>
        </Card>
      )}

      {stage === "quiz" && !loading && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-muted">Question {qi + 1} of {QUIZ_QUESTIONS.length}</p>
            {qi > 0 && (
              <button onClick={() => setQi(qi - 1)} className="text-xs text-pine font-bold underline min-h-[44px] px-2">← Back</button>
            )}
          </div>
          <div className="h-2 rounded-full bg-line mb-6 overflow-hidden">
            <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${((qi + 1) / QUIZ_QUESTIONS.length) * 100}%` }} />
          </div>
          <Card className="text-center py-8 mb-4">
            <p className="text-lg font-bold text-navy leading-snug max-w-xs mx-auto mb-6">
              "{QUIZ_QUESTIONS[qi].text}"
            </p>
            <div className="grid gap-2">
              {LIKERT_LABELS.map((label, v) => (
                <button
                  key={label}
                  onClick={() => answer(v + 1)}
                  className={`rounded-xl border-2 py-3 px-4 text-sm font-bold min-h-[52px] transition active:scale-[0.98] ${
                    answers[qi] === v + 1 ? "border-brand bg-mint text-pine" : "border-line bg-white text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}

      {stage === "results" && (
        <>
          {loading && <p className="text-sm text-muted text-center py-8">Analyzing your work style…</p>}
          {error && <p className="text-sm text-red-700 mb-3">{error}</p>}

          {result && (
            <>
              <Card className="mb-4 !bg-navy !border-navy text-white text-center">
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-white/60 mb-1">Your Holland Code</p>
                <p className="text-4xl font-black tracking-[0.2em] text-brand mb-2">{result.data.code}</p>
                <p className="text-sm text-white/75 leading-relaxed max-w-xs mx-auto">
                  {result.data.top.slice(0, 2).map((l) => `${RIASEC_NAMES[l]} — you're ${RIASEC_BLURBS[l]}`).join(". ")}.
                </p>
                <div className="grid grid-cols-6 gap-1.5 mt-4">
                  {(Object.keys(result.data.scores) as RiasecLetter[]).map((l) => (
                    <div key={l} className="text-center">
                      <div className="h-16 bg-white/10 rounded-lg flex items-end overflow-hidden">
                        <div className="w-full bg-brand rounded-b-lg" style={{ height: `${result.data.scores[l]}%` }} />
                      </div>
                      <p className="text-[10px] font-extrabold text-white/80 mt-1">{l}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-extrabold text-navy">Top matches for you</p>
                <button onClick={retake} className="text-xs text-muted underline min-h-[44px] px-2">retake quiz</button>
              </div>
              {mode === "veteran" && military.mosCodes.trim() && (
                <p className="text-xs font-bold text-emerald-900 bg-mint rounded-xl px-3 py-2.5 mb-3">
                  🎖 Includes civilian translations of your {military.branch ? `${military.branch} ` : ""}code{military.mosCodes.includes(",") ? "s" : ""}: {military.mosCodes}
                  {military.evalText ? " — plus what your performance review proves." : ""}
                </p>
              )}
              <Card className="mb-3 !p-3.5">
                <Field label="Where should we look? (optional)" hint="Adds location to every job-board search.">
                  <input value={location} onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Tampa, FL or Remote" className={inputCls} />
                </Field>
              </Card>

              <MatchList
                matches={result.data.matches.slice(0, 3)}
                selected={selected}
                onSelect={setSelected}
                offset={0}
                location={location}
                veteran={mode === "veteran"}
              />

              {!unlocked ? (
                <button onClick={() => setUnlocked(true)} className="w-full mt-3 bg-white border-2 border-dashed border-brand/50 rounded-2xl p-5 text-center min-h-[44px]">
                  <p className="font-extrabold text-navy text-sm">🔓 Unlock all {result.data.matches.length} matches</p>
                  <p className="text-xs text-muted mt-1">Paid feature — unlocked in this web build</p>
                </button>
              ) : (
                <>
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted mt-5 mb-2">More matches</p>
                  <MatchList
                    matches={result.data.matches.slice(3)}
                    selected={selected}
                    onSelect={setSelected}
                    offset={3}
                    location={location}
                    veteran={mode === "veteran"}
                  />
                </>
              )}
              <SourceNote source={result.source} note={result.note} />
              <p className="text-xs text-muted mt-2">Salary bands are rough US estimates — verify against live postings.</p>
            </>
          )}
        </>
      )}

      <JobAlertsSection />
    </div>
  );
}

function MatchList({ matches, selected, onSelect, offset, location, veteran }: {
  matches: JobMatch[]; selected: number | null; onSelect: (i: number | null) => void; offset: number;
  location: string; veteran: boolean;
}) {
  return (
    <div className="grid gap-2">
      {matches.map((m, i) => {
        const idx = offset + i;
        const isOpen = selected === idx;
        const links = jobSearchLinks(m.role.title, location, veteran);
        return (
          <div key={idx} className="bg-white border border-line rounded-2xl overflow-hidden">
            <button onClick={() => onSelect(isOpen ? null : idx)} className="w-full text-left p-4 min-h-[44px]">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <p className="font-bold text-ink text-[15px]">{m.role.title}</p>
                <span className="text-sm font-extrabold text-pine shrink-0">{m.fit}%</span>
              </div>
              <div className="h-2 rounded-full bg-line overflow-hidden mb-2">
                <div className="h-full bg-brand rounded-full" style={{ width: `${m.fit}%` }} />
              </div>
              <p className="text-[13px] text-muted leading-snug">{m.why}</p>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 border-t border-line pt-3">
                <p className="text-xs text-muted mb-1">Est. salary <span className="font-bold text-ink">{fmtSalary(m.role.salaryLow)}–{fmtSalary(m.role.salaryHigh)}/yr</span></p>
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted mt-3 mb-1.5">🔎 Real postings right now</p>
                <div className="flex flex-wrap gap-1.5">
                  {links.map((l) => (
                    <a key={l.name} href={l.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-bold bg-navy text-white rounded-full px-3 py-2 min-h-[44px] inline-flex items-center">
                      {l.name} ↗
                    </a>
                  ))}
                </div>
                {m.matchedSkills.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted mb-1.5">You already have</p>
                    <div className="flex flex-wrap gap-1.5">
                      {m.matchedSkills.map((s) => (
                        <span key={s} className="text-xs font-bold bg-mint text-emerald-900 rounded-full px-2.5 py-1.5">✓ {s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {m.missingSkills.length > 0 && (
                  <div className="mt-2.5">
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted mb-1.5">To break in</p>
                    <div className="flex flex-wrap gap-1.5">
                      {m.missingSkills.map((s) => (
                        <span key={s} className="text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 rounded-full px-2.5 py-1.5">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Job alerts — saved role/company watches with resume match scores    */
/* ------------------------------------------------------------------ */

function JobAlertsSection() {
  const { resume, alerts, setAlerts, seenJobIds, setSeenJobIds, setNewJobCount, setJobText, setTargetTitle, setCompany } = useApp();
  const router = useRouter();
  const [role, setRole] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loc, setLoc] = useState("");
  const [minMatch, setMinMatch] = useState(0);
  const [checking, setChecking] = useState(false);
  const [msg, setMsg] = useState("");
  const [feed, setFeed] = useState<ScoredPosting[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const checkedOnce = useRef(false);

  async function check(manual: boolean) {
    if (!alerts.length || checking) return;
    setChecking(true);
    if (manual) setMsg("");
    try {
      const all: ScoredPosting[] = [];
      const freshIds: string[] = [];
      for (const a of alerts) {
        const params = new URLSearchParams({ role: a.role });
        if (a.company) params.set("company", a.company);
        if (a.location) params.set("location", a.location);
        const res = await fetch(`/api/jobs?${params}`);
        if (!res.ok) continue;
        const j = (await res.json()) as { postings?: JobPosting[] };
        for (const p of j.postings ?? []) {
          const score = scorePosting(resume, p);
          if (score.match < a.minMatch) continue;
          const isNew = !seenJobIds.includes(p.id);
          if (isNew) freshIds.push(p.id);
          all.push({ ...p, score, isNew, alertRole: a.role });
        }
      }
      all.sort((x, y) => y.score.match - x.score.match);
      setFeed(all.slice(0, 30));
      if (freshIds.length) {
        setSeenJobIds([...seenJobIds, ...freshIds].slice(-600));
        setNewJobCount(freshIds.length);
        setMsg(`${freshIds.length} new posting${freshIds.length === 1 ? "" : "s"} since your last check.`);
      } else if (manual) {
        setMsg("No new postings since your last check — showing the latest matches.");
      }
    } catch {
      if (manual) setMsg("Couldn't reach the job sources — try again in a bit.");
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (checkedOnce.current || !alerts.length) return;
    checkedOnce.current = true;
    void check(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts.length]);

  function addAlert() {
    const r = role.trim();
    if (!r) { setMsg("Give the alert a job title first — e.g. Software Developer."); return; }
    setAlerts([
      ...alerts,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, role: r, company: companyName.trim(), location: loc.trim(), minMatch, createdAt: Date.now() },
    ]);
    setRole(""); setCompanyName(""); setLoc(""); setMinMatch(0);
    setMsg("Alert saved — tap “Check for new jobs” to scan now.");
  }

  function tailor(p: ScoredPosting) {
    setTargetTitle(p.title);
    setCompany(p.company);
    setJobText(`${p.title} at ${p.company}${p.location ? ` (${p.location})` : ""}\n\n${p.description}`);
    router.push("/score");
  }

  return (
    <div className="mt-10">
      <SectionTitle sub="Watch a role — optionally at one company — and get new postings scored against your resume.">
        🔔 Job alerts
      </SectionTitle>
      <Card>
        <div className="grid gap-3">
          <Field label="Job title to watch">
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Software Developer" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company (optional)">
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Any company" className={inputCls} />
            </Field>
            <Field label="Location (optional)">
              <input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="City, ST or Remote" className={inputCls} />
            </Field>
          </div>
          <Field label="Only show matches at or above">
            <select value={minMatch} onChange={(e) => setMinMatch(Number(e.target.value))} className={inputCls}>
              <option value={0}>Any match</option>
              <option value={50}>50% — decent fit</option>
              <option value={70}>70% — strong fit</option>
              <option value={85}>85% — near-perfect fit</option>
            </select>
          </Field>
          <Button variant="emerald" onClick={addAlert} className="w-full">＋ Create alert</Button>
          {msg && <p className="text-sm text-emerald-900 font-medium">{msg}</p>}
        </div>

        {alerts.length > 0 && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {alerts.map((a) => (
                <span key={a.id} className="inline-flex items-center gap-1.5 text-xs font-bold bg-mint text-emerald-950 rounded-full pl-3 pr-1.5 py-1.5">
                  {a.role}{a.company ? ` @ ${a.company}` : ""}{a.location ? ` · ${a.location}` : ""}{a.minMatch ? ` · ≥${a.minMatch}%` : ""}
                  <button
                    aria-label={`Delete alert for ${a.role}`}
                    onClick={() => setAlerts(alerts.filter((x) => x.id !== a.id))}
                    className="relative w-6 h-6 rounded-full bg-white/70 text-emerald-900 font-extrabold leading-none after:absolute after:-inset-[10px] after:content-['']"
                  >×</button>
                </span>
              ))}
            </div>
            <Button onClick={() => void check(true)} disabled={checking} className="w-full">
              {checking ? "Scanning job boards…" : "Check for new jobs"}
            </Button>
          </div>
        )}
      </Card>

      {feed.length > 0 && (
        <div className="grid gap-2 mt-4">
          {feed.map((p) => {
            const open = openId === p.id;
            return (
              <div key={p.id} className="bg-white border border-line rounded-2xl overflow-hidden">
                <button onClick={() => setOpenId(open ? null : p.id)} className="w-full text-left p-4 min-h-[44px]">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-bold text-ink text-[15px] leading-snug">{p.title}</p>
                    <span className="text-sm font-extrabold text-pine shrink-0">{p.score.match}% match</span>
                  </div>
                  <p className="text-xs text-muted mb-2">
                    {p.company}{p.location ? ` · ${p.location}` : ""} · via {p.source}
                    {p.isNew && <span className="ml-2 font-extrabold text-white bg-emerald-700 rounded-full px-2 py-0.5 text-[10px] align-middle">NEW</span>}
                  </p>
                  <div className="h-2 rounded-full bg-line overflow-hidden">
                    <div className="h-full bg-brand rounded-full" style={{ width: `${p.score.match}%` }} />
                  </div>
                </button>
                {open && (
                  <div className="px-4 pb-4 border-t border-line pt-3">
                    {p.score.matched.length > 0 && (
                      <div className="mb-2.5">
                        <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted mb-1.5">Why you match</p>
                        <div className="flex flex-wrap gap-1.5">
                          {p.score.matched.map((s) => (
                            <span key={s} className="text-xs font-bold bg-mint text-emerald-900 rounded-full px-2.5 py-1.5">✓ {s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {p.score.missing.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted mb-1.5">What the posting wants that your resume doesn't show</p>
                        <div className="flex flex-wrap gap-1.5">
                          {p.score.missing.map((s) => (
                            <span key={s} className="text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 rounded-full px-2.5 py-1.5">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <a href={p.url} target="_blank" rel="noopener noreferrer"
                        className="flex-1 text-center text-sm font-bold bg-navy text-white rounded-xl px-3 py-3 min-h-[48px] inline-flex items-center justify-center">
                        View posting ↗
                      </a>
                      <button onClick={() => tailor(p)}
                        className="flex-1 text-sm font-bold bg-brand text-white rounded-xl px-3 py-3 min-h-[48px]">
                        Tailor my resume →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <p className="text-[11px] text-muted mt-3 leading-relaxed">
        Alerts are checked when you open this tab or tap Check — matches are scored against the resume on this device.
        Postings come from Remotive, Himalayas, Arbeitnow{", and USAJobs for federal roles"}; listings change fast, so a posting may close before you apply.
      </p>
    </div>
  );
}
