"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODE_LABELS, Mode } from "../lib/types";

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

export function SourceNote({ source }: { source: "ai" | "fallback" }) {
  return source === "fallback" ? (
    <p className="text-xs text-muted mt-3">
      Running on HireCraft's built-in coach engine. Add an <code className="bg-slate-100 px-1 rounded">AI_API_KEY</code> to enable full AI rewrites.
    </p>
  ) : (
    <p className="text-xs text-muted mt-3">Generated with AI.</p>
  );
}

const NAV = [
  { href: "/score", label: "Score" },
  { href: "/rewrite", label: "Rewrite" },
  { href: "/design", label: "Design" },
  { href: "/cover", label: "Cover" },
  { href: "/linkedin", label: "LinkedIn" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/discover", label: "Discover" },
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
              <span className="w-[20px] h-[20px] rounded-[6px]" style={{ background: active ? "#10B981" : "currentColor", opacity: active ? 1 : 0.25 }} />
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
