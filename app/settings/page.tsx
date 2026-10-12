"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { MODE_DESCRIPTIONS, MODE_LABELS, Mode } from "@/lib/types";
import { Button, Card, Field, SectionTitle, inputCls } from "@/components/ui";

const MODES: Mode[] = ["veteran", "general", "new"];

export default function SettingsPage() {
  const { mode, setMode, resetAll } = useApp();
  const [aiKey, setAiKey] = useState("");
  const [aiMsg, setAiMsg] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  function saveKey() {
    // The key must live server-side (env var) for production. This stores it
    // locally only as a convenience note — the /api/ai route reads process.env.
    setAiMsg(
      "For this build, the AI key must be set as the AI_API_KEY environment variable where the server runs (see README). " +
      "A future App Store build will add an in-app key entry like the Code Red hub's Integrations screen."
    );
  }

  return (
    <div>
      <SectionTitle sub="Modes, AI, and your data.">Settings</SectionTitle>

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
        <Field label="AI API key" hint="Without a key, HireCraft runs its built-in coach engine — every feature still works. With a key, rewrites and letters use full AI.">
          <div className="flex gap-2">
            <input value={aiKey} onChange={(e) => setAiKey(e.target.value)} type="password"
              placeholder="sk-…" className={inputCls} autoComplete="off" />
            <Button variant="secondary" onClick={saveKey} className="shrink-0">Save</Button>
          </div>
        </Field>
        {aiMsg && <p className="text-xs text-muted leading-relaxed">{aiMsg}</p>}
        <p className="text-xs text-muted mt-2">
          Env vars: <code className="bg-stone-100 px-1 rounded">AI_API_KEY</code>, <code className="bg-stone-100 px-1 rounded">AI_API_BASE</code> (default OpenAI), <code className="bg-stone-100 px-1 rounded">AI_MODEL</code> (default gpt-4o-mini). Any OpenAI-compatible endpoint works.
        </p>
      </Card>

      <Card className="mb-4">
        <p className="font-bold text-ink text-sm mb-1">Privacy</p>
        <p className="text-xs text-muted leading-relaxed mb-3">
          Your resume never leaves your device unless you add an AI key — and even then, it's sent only to your configured AI provider to generate your results. Nothing is used for training. Deleting below wipes everything stored locally.
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

      <p className="text-center text-xs text-muted">HireCraft v0.1.0 · working title</p>
    </div>
  );
}
