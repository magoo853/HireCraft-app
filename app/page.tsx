"use client";

import Link from "next/link";
import { useApp } from "@/lib/store";
import { MODE_DESCRIPTIONS, MODE_LABELS, Mode } from "@/lib/types";
import { Button, Card } from "@/components/ui";
import { gettingStartedSteps } from "@/lib/getting-started";

const MODES: { id: Mode; icon: string; tile: string }[] = [
  { id: "veteran", icon: "🎖️", tile: "#D1FAE5" },
  { id: "general", icon: "💼", tile: "#DBEAFE" },
  { id: "new", icon: "🎓", tile: "#FEF3C7" },
];

const TOOLS = [
  { href: "/score", icon: "◉", title: "ATS Score", body: "Your 0–100 score, keyword match, and what the robot actually reads." },
  { href: "/rewrite", icon: "✎", title: "Bullet Rewrites", body: "Impact-first rewrites with the 'why' behind every change." },
  { href: "/design", icon: "▦", title: "Design Templates", body: "Nine recruiter-grade layouts. Edit inline, export clean PDF." },
  { href: "/cover", icon: "✉", title: "Cover Letters", body: "Tailored to your resume + the posting, in three tones." },
  { href: "/linkedin", icon: "in", title: "LinkedIn Builder", body: "Headlines, About section, skills-gap analysis." },
  { href: "/roadmap", icon: "🗺", title: "Career Roadmap", body: "2/5/10-year goals → roles, salary bands, stepping stones." },
  { href: "/discover", icon: "🧭", title: "Discover", body: "Work-style quiz → job matches with fit scores." },
  { href: "/resume", icon: "🎯", title: "Job Tailoring", body: "Paste a posting link — mirror its language keyword by keyword." },
];

export default function Home() {
  const { mode, setMode, hasResume, jobText, scoreViewed, rewriteAccepted, designChosen, exported, versions } = useApp();
  // Returning users resume the getting-started journey at its next
  // unfinished step instead of restarting at the Resume tab.
  const nextStep = hasResume
    ? gettingStartedSteps({
        hasResume,
        hasTargetJob: jobText.trim().length > 0,
        scoreViewed, rewriteAccepted, designChosen, exported,
        trackedApplication: versions.some((v) => !!v.application),
      }).find((s) => s.state === "next")
    : undefined;

  return (
    <div>
      <h1 className="text-[22px] font-extrabold tracking-tight text-navy mb-1">
        Which best describes you?
      </h1>

      <div className="grid gap-2.5 mb-4">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`text-left rounded-2xl border-2 p-3.5 flex gap-3 items-center min-h-[44px] transition active:scale-[0.99] ${
              mode === m.id ? "border-brand bg-mint" : "border-line bg-white"
            }`}
          >
            <span className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: m.tile }}>
              {m.icon}
            </span>
            <span className="flex-1">
              <span className="block font-bold text-ink text-sm">{MODE_LABELS[m.id]}</span>
              <span className="block text-xs text-muted leading-snug mt-0.5">{MODE_DESCRIPTIONS[m.id]}</span>
            </span>
          </button>
        ))}
      </div>

      {hasResume && (
        <p className="text-[13px] text-muted leading-relaxed mb-2">Welcome back — pick up where you left off.</p>
      )}
      <Link href={nextStep ? nextStep.href : "/resume"}>
        <Button variant="emerald" className="w-full !min-h-[52px] !text-[15px] mb-8">
          {nextStep ? `${nextStep.label} →` : "Continue →"}
        </Button>
      </Link>

      <h2 className="text-xs font-extrabold text-ink uppercase tracking-widest mb-2">What ResumeRoadmap does</h2>
      <div className="grid grid-cols-2 gap-2">
        {TOOLS.map((t) => (
          <Link key={t.title} href={t.href}>
            <Card className="h-full !p-4 active:scale-[0.98] transition">
              <p className="text-xl mb-1.5 font-extrabold text-emerald-700">{t.icon}</p>
              <p className="font-bold text-ink text-sm mb-1">{t.title}</p>
              <p className="text-xs text-muted leading-snug">{t.body}</p>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-6 !bg-navy !border-navy text-white">
        <p className="font-bold mb-1">The honest pitch</p>
        <p className="text-sm text-white/70 leading-relaxed">
          ResumeRoadmap reads your resume the way screening software does — and shows you every finding, so you can fix what the software would flag before you apply.
        </p>
      </Card>
    </div>
  );
}
