"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { GOAL_EXAMPLES, RoadmapGoal, RoadmapNode, fmtSalary, jobSearchLinks } from "@/lib/careers";
import { AiResponse } from "@/lib/types";
import { Button, Card, EmptyState, Field, SectionTitle, SourceNote, Pill, inputCls } from "@/components/ui";

const LS_KEY = "hirecraft-roadmap-goals-v2";
const LS_OLD = "hirecraft-roadmap-goals";
const LS_LOC = "hc_location";

const defaultGoals = (): RoadmapGoal[] => [
  { years: 2, text: "", salary: 0 },
  { years: 5, text: "", salary: 0 },
  { years: 10, text: "", salary: 0 },
];

function parseSalary(s: string): number {
  const n = parseInt(s.replace(/[^0-9]/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

function parseYears(s: string): number {
  const n = parseInt(s.replace(/[^0-9]/g, ""), 10);
  if (isNaN(n)) return 1;
  return Math.min(30, Math.max(1, n));
}

export default function RoadmapPage() {
  const { resume, mode, hasResume, military } = useApp();
  const [goals, setGoals] = useState<RoadmapGoal[]>(defaultGoals());
  const [loading, setLoading] = useState(false);
  const [nodes, setNodes] = useState<AiResponse<RoadmapNode[]> | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<number | null>(1);
  const [location, setLocation] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) { setGoals(parsed); return; }
      }
      // Migrate the old fixed-horizon shape
      const old = localStorage.getItem(LS_OLD);
      if (old) {
        const o = JSON.parse(old);
        const migrated = [
          { years: 2, text: o.h2?.text ?? "", salary: o.h2?.salary ?? 0 },
          { years: 5, text: o.h5?.text ?? "", salary: o.h5?.salary ?? 0 },
          { years: 10, text: o.h10?.text ?? "", salary: o.h10?.salary ?? 0 },
        ].filter((g) => g.text || g.salary);
        if (migrated.length) setGoals(migrated);
      }
      try {
        const loc = localStorage.getItem(LS_LOC);
        if (loc) setLocation(loc);
      } catch { /* noop */ }
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(goals));
    } catch { /* noop */ }
  }, [goals]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_LOC, location);
    } catch { /* noop */ }
  }, [location]);

  if (!hasResume) {
    return (
      <EmptyState
        title="No resume yet"
        body="Your roadmap is built from where you are now — add your resume first, then tell us where you want to go."
        cta="Add my resume" href="/resume"
      />
    );
  }

  function setGoal(i: number, patch: Partial<RoadmapGoal>) {
    setGoals(goals.map((g, j) => (j === i ? { ...g, ...patch } : g)));
  }

  function addHorizon() {
    if (goals.length >= 5) return;
    const maxYears = Math.max(...goals.map((g) => g.years), 0);
    setGoals([...goals, { years: Math.min(30, maxYears + 3), text: "", salary: 0 }]);
  }

  async function build() {
    const anyGoal = goals.some((g) => g.text.trim());
    if (!anyGoal) {
      setError("Set at least one goal — even a rough one. The roadmap needs a destination.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "roadmap", mode, resume, goals, military }),
      });
      const json = (await res.json()) as AiResponse<RoadmapNode[]>;
      if (!Array.isArray(json.data)) throw new Error("Unexpected response");
      setNodes(json);
      setOpen(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const examples = GOAL_EXAMPLES[mode] ?? GOAL_EXAMPLES.general;
  const maxYears = nodes ? Math.max(...nodes.data.map((n) => n.years)) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <SectionTitle sub="Tell us where you want to be. We'll map how to get there — roles, the skills each checkpoint demands, and the gaps to close.">
          Career roadmap
        </SectionTitle>
      </div>

      {!nodes && (
        <>
          <div className="grid gap-3 mb-4">
            {goals.map((g, i) => (
              <Card key={i} className="!p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted">In</span>
                    <input
                      value={String(g.years)}
                      onChange={(e) => setGoal(i, { years: parseYears(e.target.value) })}
                      inputMode="numeric"
                      aria-label="Years out"
                      className="w-14 text-center font-extrabold text-navy text-[15px] border-[1.5px] border-line rounded-lg py-1.5 min-h-[44px]"
                    />
                    <span className="text-xs font-bold text-muted">year{g.years === 1 ? "" : "s"}</span>
                  </div>
                  {goals.length > 1 && (
                    <button onClick={() => setGoals(goals.filter((_, j) => j !== i))}
                      className="text-xs text-muted underline min-h-[44px] px-2">remove</button>
                  )}
                </div>
                <p className="text-xs text-muted mb-2">
                  {g.years <= 2 ? "Your next move — a promotion, a pivot, or a first big role."
                    : g.years <= 5 ? "Where you want to be established — senior, lead, or specialist."
                    : "The long game — leadership, mastery, or independence."}
                </p>
                <textarea
                  value={g.text}
                  onChange={(e) => setGoal(i, { text: e.target.value })}
                  rows={2}
                  placeholder={`e.g. ${examples[0]}`}
                  className={`${inputCls} !text-sm mb-2`}
                />
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {examples.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setGoal(i, { text: ex })}
                      className="text-[11px] font-semibold text-pine bg-mint border border-brand/30 rounded-full px-2.5 py-1.5 min-h-[44px] inline-flex items-center"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
                <Field label="Salary target (annual)">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-bold">$</span>
                    <input
                      value={g.salary ? String(g.salary) : ""}
                      onChange={(e) => setGoal(i, { salary: parseSalary(e.target.value) })}
                      inputMode="numeric"
                      placeholder="120000"
                      className={`${inputCls} !pl-8`}
                    />
                  </div>
                </Field>
                {g.salary > 0 && (
                  <p className="text-xs text-emerald-900 font-semibold -mt-2">Target: {fmtSalary(g.salary)}/yr</p>
                )}
              </Card>
            ))}
          </div>
          {goals.length < 5 && (
            <button onClick={addHorizon}
              className="w-full mb-3 bg-white border-2 border-dashed border-brand/50 rounded-2xl p-4 text-center min-h-[44px] text-sm font-extrabold text-pine">
              + Add another checkpoint
            </button>
          )}
          <Button variant="emerald" onClick={build} disabled={loading} className="w-full !min-h-[52px]">
            {loading ? "Mapping your future…" : "🗺 Build my roadmap"}
          </Button>
          {error && <p className="text-sm text-red-700 mt-3">{error}</p>}
          <Field label="Location (optional — sharpens the job-board links)">
            <input value={location} onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Tampa, FL" className={inputCls} />
          </Field>
          <p className="text-xs text-muted mt-3 text-center">Salary bands are estimates — directionally right, not gospel.</p>
        </>
      )}

      {nodes && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-navy">Your next {maxYears} year{maxYears === 1 ? "" : "s"}</p>
            <button onClick={() => setNodes(null)} className="text-xs text-muted underline min-h-[44px] px-2">
              edit goals
            </button>
          </div>

          <div className="relative pl-8">
            <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-line" />
            {nodes.data.map((n, i) => {
              const isOpen = open === i;
              const goal = goals.find((g) => g.years === n.years);
              const salaryTarget = goal?.salary ?? 0;
              return (
                <div key={i} className="relative mb-3">
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="absolute -left-[42px] -top-[6px] w-11 h-11 min-h-[44px] flex items-center justify-center z-10"
                    aria-label={`Toggle ${n.horizon}`}
                  >
                    <span className="w-6 h-6 rounded-full bg-white border-2 border-brand flex items-center justify-center shrink-0">
                      {i === 0 && <span className="w-2 h-2 rounded-full bg-brand" />}
                    </span>
                  </button>
                  <div className="bg-white border border-line rounded-2xl overflow-hidden">
                    <button onClick={() => setOpen(isOpen ? null : i)} className="w-full text-left p-4 min-h-[44px]">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-extrabold text-navy">{n.horizon}</p>
                        {salaryTarget > 0 && i > 0 && (
                          <span className="text-[11px] font-bold text-emerald-900 bg-mint rounded-full px-2.5 py-1">
                            🎯 {fmtSalary(salaryTarget)}/yr
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] text-muted mt-1 leading-snug line-clamp-2">{n.goalText}</p>
                      {n.titles.length > 0 && n.titles[0].title && (
                        <p className="text-[13px] font-bold text-pine mt-1.5">{n.titles.map((t) => t.title).join(" · ")}</p>
                      )}
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 border-t border-line pt-3">
                        {n.titles.filter((t) => t.title).map((t, j) => (
                          <div key={j} className="mb-2.5 last:mb-0 bg-paper rounded-xl p-3 border border-line">
                            <p className="font-bold text-ink text-sm">{t.title}</p>
                            {t.dayInLife ? (
                              <p className="text-xs text-muted mt-1 leading-relaxed">👀 {t.dayInLife} <span className="italic">(illustrative)</span></p>
                            ) : null}
                            <p className="text-xs text-muted mt-1.5">Est. salary band — not a guarantee</p>
                            <div className="mt-1">
                              {t.salaryFlag === "hit" && <Pill tone="ok">{t.salaryNote}</Pill>}
                              {t.salaryFlag === "can-hit" && <Pill tone="warn">{t.salaryNote}</Pill>}
                              {t.salaryFlag === "below" && <Pill tone="bad">{t.salaryNote}</Pill>}
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {jobSearchLinks(t.title, location, mode === "veteran").map((l) => (
                                <a key={l.name} href={l.url} target="_blank" rel="noopener noreferrer"
                                  className="text-[11px] font-bold text-emerald-700 underline underline-offset-2 min-h-[44px] inline-flex items-center px-1">
                                  {l.name} ↗
                                </a>
                              ))}
                            </div>
                          </div>
                        ))}

                        {n.skillsToHave.length > 0 && (
                          <div className="mt-3">
                            <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted mb-1.5">
                              {i === 0 ? "Your current skill set" : `Skills to have by year ${n.years}`}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {n.skillsToHave.map((s, k) => (
                                <span key={k} className={`text-xs font-semibold rounded-full px-2.5 py-1.5 border ${
                                  s.have
                                    ? "bg-mint text-emerald-900 border-brand/30"
                                    : "bg-white text-slate-600 border-line"
                                }`}>
                                  {s.have ? "✓ " : "○ "}{s.skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {n.steppingStones.length > 0 && (
                          <div className="mt-3">
                            <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted mb-1.5">Stepping stones</p>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {n.steppingStones.map((s, k) => (
                                <span key={k} className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold bg-white border border-line rounded-full px-2.5 py-1.5">{s}</span>
                                  {k < n.steppingStones.length - 1 && <span className="text-muted text-xs">→</span>}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {n.gaps.length > 0 && (
                          <div className="mt-3">
                            <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted mb-1.5">Gaps to close</p>
                            <div className="flex flex-wrap gap-1.5">
                              {n.gaps.map((g, k) => (
                                <span key={k} className="text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 rounded-full px-2.5 py-1.5">
                                  {g}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <SourceNote source={nodes.source} note={nodes.note} />
          <p className="text-xs text-muted mt-2 leading-relaxed">
            Salary bands are rough US national estimates for illustration — verify against current BLS data or live postings before making decisions.
          </p>
        </>
      )}
    </div>
  );
}
