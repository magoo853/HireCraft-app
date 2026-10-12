"use client";

import { useEffect, useState } from "react";
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
                      className="text-xs font-bold bg-navy text-white rounded-full px-3 py-2 min-h-[36px] inline-flex items-center">
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
