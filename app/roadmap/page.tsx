"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { GOAL_EXAMPLES, HorizonGoal, RoadmapNode, fmtSalary } from "@/lib/careers";
import { AiResponse } from "@/lib/types";
import { Button, Card, EmptyState, Field, SectionTitle, SourceNote, Pill, inputCls } from "@/components/ui";

const HORIZONS = [
  { key: "h2", label: "2 years", hint: "Your next move — a promotion, a pivot, or a first big role." },
  { key: "h5", label: "5 years", hint: "Where you want to be established — senior, lead, or specialist." },
  { key: "h10", label: "10 years", hint: "The long game — leadership, mastery, or independence." },
] as const;

type HKey = (typeof HORIZONS)[number]["key"];

const blankGoals = (): Record<HKey, HorizonGoal> => ({
  h2: { text: "", salary: 0 },
  h5: { text: "", salary: 0 },
  h10: { text: "", salary: 0 },
});

const LS_KEY = "hirecraft-roadmap-goals";

function parseSalary(s: string): number {
  const n = parseInt(s.replace(/[^0-9]/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

export default function RoadmapPage() {
  const { resume, mode, hasResume } = useApp();
  const [goals, setGoals] = useState<Record<HKey, HorizonGoal>>(blankGoals());
  const [loading, setLoading] = useState(false);
  const [nodes, setNodes] = useState<AiResponse<RoadmapNode[]> | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<number | null>(1);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setGoals({ ...blankGoals(), ...JSON.parse(raw) });
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(goals));
    } catch { /* noop */ }
  }, [goals]);

  if (!hasResume) {
    return (
      <EmptyState
        title="No resume yet"
        body="Your roadmap is built from where you are now — add your resume first, then tell us where you want to go."
        cta="Add my resume" href="/resume"
      />
    );
  }

  async function build() {
    const anyGoal = HORIZONS.some((h) => goals[h.key].text.trim());
    if (!anyGoal) {
      setError("Set at least one horizon goal — even a rough one. The roadmap needs a destination.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "roadmap", mode, resume, goals }),
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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <SectionTitle sub="Tell us where you want to be. We'll map how to get there — roles, stepping stones, and the gaps to close.">
          Career roadmap
        </SectionTitle>
        <span className="text-[10px] font-extrabold uppercase tracking-wide bg-navy text-white rounded-full px-2.5 py-1 shrink-0 ml-2">
          Paid
        </span>
      </div>

      {!nodes && (
        <>
          <div className="grid gap-3 mb-4">
            {HORIZONS.map((h) => (
              <Card key={h.key} className="!p-4">
                <div className="flex items-baseline justify-between mb-1">
                  <p className="font-extrabold text-navy">{h.label}</p>
                  <p className="text-xs text-muted">{h.hint}</p>
                </div>
                <textarea
                  value={goals[h.key].text}
                  onChange={(e) => setGoals({ ...goals, [h.key]: { ...goals[h.key], text: e.target.value } })}
                  rows={2}
                  placeholder={`e.g. ${examples[0]}`}
                  className={`${inputCls} !text-sm mb-2`}
                />
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {examples.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setGoals({ ...goals, [h.key]: { ...goals[h.key], text: ex } })}
                      className="text-[11px] font-semibold text-pine bg-mint border border-brand/30 rounded-full px-2.5 py-1.5 min-h-[36px]"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
                <Field label="Salary target (annual)">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-bold">$</span>
                    <input
                      value={goals[h.key].salary ? String(goals[h.key].salary) : ""}
                      onChange={(e) => setGoals({ ...goals, [h.key]: { ...goals[h.key], salary: parseSalary(e.target.value) } })}
                      inputMode="numeric"
                      placeholder="120000"
                      className={`${inputCls} !pl-8`}
                    />
                  </div>
                </Field>
                {goals[h.key].salary > 0 && (
                  <p className="text-xs text-emerald-900 font-semibold -mt-2">Target: {fmtSalary(goals[h.key].salary)}/yr</p>
                )}
              </Card>
            ))}
          </div>
          <Button variant="emerald" onClick={build} disabled={loading} className="w-full !min-h-[52px]">
            {loading ? "Mapping your future…" : "🗺 Build my roadmap"}
          </Button>
          {error && <p className="text-sm text-red-700 mt-3">{error}</p>}
          <p className="text-xs text-muted mt-3 text-center">Salary bands are estimates — directionally right, not gospel.</p>
        </>
      )}

      {nodes && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-navy">Your next 10 years</p>
            <button onClick={() => setNodes(null)} className="text-xs text-muted underline min-h-[44px] px-2">
              edit goals
            </button>
          </div>

          <div className="relative pl-8">
            <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-line" />
            {nodes.data.map((n, i) => {
              const isOpen = open === i;
              const salaryTarget = i === 1 ? goals.h2.salary : i === 2 ? goals.h5.salary : i === 3 ? goals.h10.salary : 0;
              return (
                <div key={i} className="relative mb-3">
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="absolute -left-8 top-1 w-6 h-6 rounded-full bg-white border-2 border-brand flex items-center justify-center z-10 min-h-[24px]"
                    aria-label={`Toggle ${n.horizon}`}
                  >
                    {i === 0 && <span className="w-2 h-2 rounded-full bg-brand" />}
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
                            <p className="text-xs text-muted mt-0.5">Est. salary band — not a guarantee</p>
                            <div className="mt-1">
                              {t.salaryFlag === "hit" && <Pill tone="ok">{t.salaryNote}</Pill>}
                              {t.salaryFlag === "can-hit" && <Pill tone="warn">{t.salaryNote}</Pill>}
                              {t.salaryFlag === "below" && <Pill tone="bad">{t.salaryNote}</Pill>}
                            </div>
                          </div>
                        ))}

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
          <SourceNote source={nodes.source} />
          <p className="text-xs text-muted mt-2 leading-relaxed">
            Salary bands are rough US national estimates for illustration — verify against current BLS data or live postings before making decisions.
          </p>
        </>
      )}
    </div>
  );
}
