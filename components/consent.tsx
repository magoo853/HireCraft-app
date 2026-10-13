"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui";

/**
 * One-time disclosure + consent before any resume data is sent to the
 * third-party AI provider (App Store Guideline 5.1.2(i)). The user can
 * agree, or continue without AI — declining persists and never blocks
 * the on-device features; the gate does not re-appear on navigation.
 * Consent can be withdrawn (or given) later in Settings.
 */
export function AiConsentGate() {
  const { aiConsent, setAiConsent, aiConsentDeclined, setAiConsentDeclined } = useApp();
  const path = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready || aiConsent || aiConsentDeclined) return null;
  if (path === "/privacy") return null; // let them read the policy first

  return (
    <div className="fixed inset-0 z-[60] bg-navy/60 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl max-h-[88vh] overflow-y-auto">
        <p className="text-3xl mb-2">🤝</p>
        <p className="font-extrabold text-navy text-lg leading-snug mb-2">How HireCraft uses AI</p>
        <div className="text-sm text-muted leading-relaxed grid gap-2.5">
          <p>
            When you use the AI features — bullet rewrites, cover letters, LinkedIn polish, career
            roadmaps, and job matching — <b className="text-ink">your resume text is sent to our AI
            provider, Google (Gemini)</b>, to generate your result. In Veteran mode, your job codes
            and performance-review text are sent too.
          </p>
          <p>
            That content is processed only to answer your request. It is <b className="text-ink">never
            sold, never used for advertising</b>, and your resume itself is stored only on this device.
          </p>
          <p>
            Scoring, design templates, and job alerts run without AI and don't send anything.
          </p>
        </div>
        <Button variant="emerald" className="w-full mt-5 !min-h-[52px]" onClick={() => { setAiConsent(true); setAiConsentDeclined(false); }}>
          Agree &amp; continue
        </Button>
        <Button variant="secondary" className="w-full mt-2 !min-h-[52px]" onClick={() => setAiConsentDeclined(true)}>
          Continue without AI
        </Button>
        <p className="text-center text-xs text-muted mt-3">
          <Link href="/privacy" className="underline font-semibold">Read the privacy policy</Link>
          {" · "}You can change this any time in Settings.
        </p>
      </div>
    </div>
  );
}

/**
 * Inline stand-in for AI action buttons when consent is not granted
 * (declined, withdrawn, or never given): the action does not fire, and
 * the user is pointed at Settings instead. Renders nothing when AI is on.
 */
export function AiOffNote({ className = "" }: { className?: string }) {
  const { aiConsent } = useApp();
  if (aiConsent) return null;
  return (
    <p className={`text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 ${className}`}>
      AI is off — <Link href="/settings" className="underline font-bold">turn it on in Settings</Link> to use this.
      Everything else in the app works without it.
    </p>
  );
}
