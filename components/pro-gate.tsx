"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { isNativeShell } from "@/lib/purchases";
import { proGateState, type ProGateState } from "@/lib/pro-gate";
import { Button, Card } from "./ui";

/**
 * RR-26 — the React side of the Pro gate. Platform detection follows
 * the paywall's established pattern (false during prerender and first
 * paint, resolved in an effect), so web and native agree on the
 * initial render and hydration never mismatches. On web the gate is
 * always "open" (unlocked demo by design); on native it follows
 * proStatus — see lib/pro-gate.ts for the truth table.
 */
export function useProGate(): ProGateState {
  const { proStatus } = useApp();
  const [native, setNative] = useState(false);
  useEffect(() => {
    setNative(isNativeShell());
  }, []);
  return proGateState(native, proStatus);
}

/** The prompt a gated user sees instead of the feature. Both states
 *  route to /paywall: "locked" sells the subscription, "checking"
 *  hands off to the paywall's RR-27 checking/retry state. */
export function ProPrompt({ feature, state }: { feature: string; state: "locked" | "checking" }) {
  if (state === "checking") {
    return (
      <Card className="text-center py-10">
        <p className="text-lg font-extrabold text-navy mb-2">Checking your Pro status…</p>
        <p className="text-sm text-muted mb-5 max-w-sm mx-auto">
          We couldn&apos;t confirm your subscription yet, so Pro features are paused — not locked
          for good. The Pro page can finish checking or restore a purchase.
        </p>
        <Link href="/paywall">
          <Button variant="emerald">Check on the Pro page</Button>
        </Link>
      </Card>
    );
  }
  return (
    <Card className="text-center py-10">
      <p className="text-lg font-extrabold text-navy mb-2">🔒 {feature}</p>
      <p className="text-sm text-muted mb-5 max-w-sm mx-auto">
        In the app this is a ResumeRoadmap Pro feature — $25/year unlocks everything: unlimited
        rewrites, job tailoring, cover letters, the LinkedIn builder, career roadmaps, job alerts,
        and PDF &amp; DOCX export. Your ATS score, simulator, resume builder, and all 9 design
        templates stay free.
      </p>
      <Link href="/paywall">
        <Button variant="emerald">See Pro</Button>
      </Link>
    </Card>
  );
}

/** Wrap a whole paid surface: open → children; otherwise the prompt. */
export function ProGate({ feature, children }: { feature: string; children: ReactNode }) {
  const gate = useProGate();
  if (gate === "open") return <>{children}</>;
  return <ProPrompt feature={feature} state={gate} />;
}
