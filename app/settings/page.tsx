"use client";

import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { MODE_DESCRIPTIONS, MODE_LABELS, Mode } from "@/lib/types";
import { Button, Card, Field, SectionTitle, inputCls } from "@/components/ui";

const MODES: Mode[] = ["veteran", "general", "new"];

export default function SettingsPage() {
  const { mode, setMode, resetAll, aiConsent, setAiConsent, aiConsentDeclined, setAiConsentDeclined } = useApp();
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div>
      <SectionTitle>Settings</SectionTitle>

      <Card className="mb-4">
        <Field label="Mode">
          <div className="grid gap-2">
            {MODES.map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`text-left rounded-xl border p-3 min-h-[44px] ${mode === m ? "border-brand bg-mint" : "border-line"}`}>
                <p className="font-bold text-ink text-sm">{MODE_LABELS[m]}</p>
                <p className="text-xs text-muted">{MODE_DESCRIPTIONS[m]}</p>
              </button>
            ))}
          </div>
        </Field>
      </Card>

      <Card className="mb-4">
        <p className="font-bold text-ink text-sm mb-1">AI data sharing</p>
        <p className="text-xs text-muted leading-relaxed mb-3">
          AI features (rewrites, cover letters, LinkedIn polish, roadmaps, matching) send your resume
          text to our AI provider, Google (Gemini), to generate results — with your consent. A
          performance review you've added is included in any mode; in Veteran mode, job codes are
          included too. The content is processed only to answer your request: never sold, never used
          for advertising. Scoring and templates run on-device without AI; job alerts run without
          AI and send only your search terms to the job boards.
        </p>
        {aiConsent ? (
          <>
            <p className="text-xs font-bold text-emerald-900 mb-2">✓ Consent given — AI features are on.</p>
            <Button variant="secondary" onClick={() => { setAiConsent(false); setAiConsentDeclined(true); }} className="w-full">Withdraw consent</Button>
            <p className="text-[11px] text-muted mt-2">Withdrawing stops all AI sending. The rest of the app keeps working, and you can turn AI back on here any time.</p>
          </>
        ) : aiConsentDeclined ? (
          <>
            <p className="text-xs font-bold text-amber-900 mb-2">You chose to continue without AI — AI features are off.</p>
            <Button variant="emerald" onClick={() => { setAiConsent(true); setAiConsentDeclined(false); }} className="w-full">Turn AI on</Button>
          </>
        ) : (
          <>
            <p className="text-xs font-bold text-amber-900 mb-2">Consent not given — AI features are paused.</p>
            <Button variant="emerald" onClick={() => { setAiConsent(true); setAiConsentDeclined(false); }} className="w-full">Give consent &amp; turn AI on</Button>
          </>
        )}
      </Card>

      <Card className="mb-4">
        <p className="font-bold text-ink text-sm mb-1">Privacy</p>
        <p className="text-xs text-muted leading-relaxed mb-3">
          Your resume is stored only on this device. The only time any of it leaves the device is when
          you use an AI feature (see above) or run a job-alert check, which sends just your search
          terms — never your resume — to the job boards. Deleting below wipes everything stored locally.
        </p>
        {!confirmReset ? (
          <Button variant="danger" onClick={() => setConfirmReset(true)} className="w-full">Delete all my data</Button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="danger" onClick={() => { resetAll(); setConfirmReset(false); }}>Yes, delete</Button>
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>Cancel</Button>
          </div>
        )}
      </Card>

      <Card className="mb-4">
        <p className="font-bold text-ink text-sm mb-1">Help & support</p>
        <p className="text-xs text-muted leading-relaxed mb-3">
          Answers on trials, restores, alerts, and translations — plus a human to email.
        </p>
        <Link href="/support"><Button variant="secondary" className="w-full">Open support &amp; FAQ</Button></Link>
      </Card>

      <p className="text-center text-xs text-muted">ResumeRoadmap v0.1.0</p>
    </div>
  );
}
