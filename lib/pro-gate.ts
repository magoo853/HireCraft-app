/**
 * RR-26 — Pro gate decision (native only).
 *
 * Build behavior: this file is application code, so any commit touching it
 * triggers a full Vercel build under the docs-skip ignore rule
 * (vercel.json -> scripts/vercel-ignore.sh; see COORDINATION.md).
 *
 * The store listing sells a free tier (ATS score + breakdown, ATS
 * simulator, keyword match preview, resume builder + file upload, all 9
 * design templates with live previews) and ResumeRoadmap Pro ($25/yr:
 * unlimited rewrites, job tailoring, cover letters, LinkedIn builder,
 * career roadmaps, job alerts, PDF & DOCX export). Before RR-26 no
 * feature surface read proStatus, so on the iOS build the subscription
 * unlocked nothing — Guideline 3.1.1 exposure.
 *
 * The gate applies ONLY in the native shell: the web build is the
 * unlocked demo (the listing's review notes tell App Review exactly
 * that), so web is never locked. On native:
 *   pro     → "open"
 *   free    → "locked"   (clear Pro prompt routes to /paywall)
 *   unknown → "checking" (also routes to /paywall, whose RR-27 state
 *             resolves it via Check again / Restore — never a silent
 *             open, never a dead end)
 *
 * This module is the pure decision only; the React hook and the prompt
 * UI live in components/pro-gate.tsx. proStatus stays runtime-only
 * (lib/purchases.ts) — nothing here persists anything.
 */
import type { ProStatus } from "./purchases";

export type ProGateState = "open" | "locked" | "checking";

export function proGateState(native: boolean, proStatus: ProStatus): ProGateState {
  if (!native) return "open";
  if (proStatus === "pro") return "open";
  if (proStatus === "free") return "locked";
  return "checking";
}
