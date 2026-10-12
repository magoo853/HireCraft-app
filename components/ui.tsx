"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODE_LABELS, Mode } from "../lib/types";
import { useApp } from "../lib/store";

export function Button({ children, onClick, variant = "primary", className = "", disabled, type }: {
  children: ReactNode; onClick?: () => void; variant?: "primary" | "emerald" | "secondary" | "ghost" | "danger";
  className?: string; disabled?: boolean; type?: "button" | "submit";
}) {
  const base = "inline-flex items-center justify-center gap-2 rounded-[14px] font-bold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none min-h-[44px] px-5 text-[15px]";
  const styles = {
    primary: "bg-pine text-white hover:bg-navy",
    emerald: "bg-brand text-white hover:bg-emerald-600",
    secondary: "bg-white text-ink border border-line hover:border-ink",
    ghost: "text-pine hover:bg-mint px-3",
    danger: "bg-red-700 text-white hover:bg-red-800",
  } as const;
  return (
    <button type={type ?? "button"} onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-line p-5 ${className}`}>{children}</div>;
}

export function SectionTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-[22px] font-extrabold tracking-tight text-navy">{children}</h2>
      {sub && <p className="text-[13px] text-muted mt-1 leading-relaxed">{sub}</p>}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block mb-4">
      <span className="block text-sm font-bold text-ink mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted mt-1">{hint}</span>}
    </label>
  );
}

export const inputCls = "w-full rounded-xl border border-line bg-white px-4 py-3 text-[15px] text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand min-h-[44px]";

export function ModeBadge({ mode }: { mode: Mode }) {
  const colors: Record<Mode, string> = {
    veteran: "bg-mint text-pine border-brand/40",
    general: "bg-slate-100 text-ink border-line",
    new: "bg-amber-50 text-amber-900 border-amber-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${colors[mode]}`}>
      {MODE_LABELS[mode]}
    </span>
  );
}

/** Conic score ring, per the approved mockup. */
export function ScoreRing({ score, size = 104 }: { score: number; size?: number }) {
  const pct = Math.max(0, Math.min(100, score));
  const color = pct >= 75 ? "#10B981" : pct >= 55 ? "#D97706" : "#DC2626";
  const inner = Math.round(size * 0.79);
  return (
    <div className="relative rounded-full flex items-center justify-center shrink-0"
      style={{ width: size, height: size, background: `conic-gradient(${color} 0 ${pct}%, #E2E8F0 ${pct}% 100%)` }}>
      <div className="rounded-full bg-white flex flex-col items-center justify-center"
        style={{ width: inner, height: inner }}>
        <span className="text-2xl font-extrabold text-navy leading-none">{score}</span>
        <span className="text-[10px] text-muted font-semibold mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

export function Pill({ tone, children }: { tone: "ok" | "warn" | "bad"; children: ReactNode }) {
  const styles = {
    ok: "bg-emerald-100 text-emerald-900",
    warn: "bg-amber-100 text-amber-900",
    bad: "bg-red-100 text-red-900",
  } as const;
  return (
    <span className={`inline-block text-[10.5px] font-bold px-2.5 py-1 rounded-full mt-1.5 ${styles[tone]}`}>
      {children}
    </span>
  );
}

export function EmptyState({ title, body, cta, href }: { title: string; body: string; cta: string; href: string }) {
  return (
    <Card className="text-center py-10">
      <p className="text-lg font-extrabold text-navy mb-2">{title}</p>
      <p className="text-sm text-muted mb-5 max-w-sm mx-auto">{body}</p>
      <Link href={href}><Button variant="emerald">{cta}</Button></Link>
    </Card>
  );
}

export function SourceNote({ source, note }: { source: "ai" | "fallback"; note?: string }) {
  if (note) {
    return <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 mt-3">⚠️ {note}</p>;
  }
  return source === "fallback" ? (
    <p className="text-xs text-muted mt-3">
      Running on HireCraft's built-in coach engine. Add an <code className="bg-slate-100 px-1 rounded">AI_API_KEY</code> to enable full AI rewrites.
    </p>
  ) : (
    <p className="text-xs text-muted mt-3">Generated with AI.</p>
  );
}

/**
 * Shows exactly which job posting everything is being judged against —
 * or that scoring is generic because none is set. Change/Clear included.
 */
export function TargetJobBanner() {
  const { jobText, targetTitle, company, setJobText, setJobUrl } = useApp();
  const has = jobText.trim().length > 0;
  if (!has) {
    return (
      <div className="bg-white border border-dashed border-line rounded-xl px-3 py-2.5 mb-4 flex items-center justify-between gap-2 print:hidden">
        <p className="text-xs text-muted leading-snug">
          🎯 <b className="text-ink">No target job set</b> — judging is generic. Add a posting to tailor everything to a real job.
        </p>
        <Link href="/resume" className="text-xs font-bold text-brand underline underline-offset-2 shrink-0 min-h-[36px] inline-flex items-center px-1">Add job</Link>
      </div>
    );
  }
  const firstLine = jobText.split("\n").map((l) => l.trim()).find((l) => l.length > 3) ?? "Pasted job posting";
  const name = targetTitle || (firstLine.length > 64 ? `${firstLine.slice(0, 64)}…` : firstLine);
  const words = jobText.split(/\s+/).filter(Boolean).length;
  return (
    <div className="bg-navy text-white rounded-xl px-3 py-2.5 mb-4 flex items-center justify-between gap-2 print:hidden">
      <p className="text-xs leading-snug min-w-0">
        🎯 Judging against: <b>{name}</b>{company ? ` · ${company}` : ""} <span className="opacity-70">({words} words)</span>
      </p>
      <span className="flex gap-2 shrink-0">
        <Link href="/resume" className="text-xs font-bold underline underline-offset-2 min-h-[36px] inline-flex items-center px-1">Change</Link>
        <button
          onClick={() => { setJobText(""); setJobUrl(""); }}
          className="text-xs font-bold underline underline-offset-2 min-h-[36px] inline-flex items-center px-1"
        >
          Clear
        </button>
      </span>
    </div>
  );
}

const NAV = [
  { href: "/score", label: "Score", icon: <><path d="m12 14 4-4" /><path d="M3.34 19a10 10 0 1 1 17.32 0" /></> },
  { href: "/rewrite", label: "Rewrite", icon: <><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></> },
  { href: "/design", label: "Design", icon: <><rect width="18" height="7" x="3" y="3" rx="1" /><rect width="9" height="7" x="3" y="14" rx="1" /><rect width="5" height="7" x="16" y="14" rx="1" /></> },
  { href: "/cover", label: "Cover", icon: <><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></> },
  { href: "/linkedin", label: "LinkedIn", icon: <><rect width="20" height="14" x="2" y="7" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></> },
  { href: "/roadmap", label: "Roadmap", icon: <><path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" /><path d="M15 5.764v15" /><path d="M9 3.236v15" /></> },
  { href: "/discover", label: "Discover", icon: <><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></> },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-line print:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="grid grid-cols-7 max-w-lg mx-auto">
        {NAV.map((n) => {
          const active = path === n.href || (n.href !== "/score" && path.startsWith(n.href));
          return (
            <Link key={n.href} href={n.href}
              className={`flex flex-col items-center justify-center py-2 min-h-[64px] text-[9px] font-semibold gap-1 ${active ? "text-pine" : "text-muted"}`}>
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round">{n.icon}</svg>
              {n.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <span className="rounded-[10px] bg-pine text-white flex items-center justify-center font-extrabold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.5 }}>
      H
    </span>
  );
}

export function TopBar({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur border-b border-line print:hidden">
      <div className="max-w-lg mx-auto px-4 h-[60px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
          <span className="font-extrabold text-navy tracking-tight">{title}</span>
        </Link>
        <div className="flex items-center gap-1">{right}</div>
      </div>
    </header>
  );
}
