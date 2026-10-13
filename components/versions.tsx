"use client";

import { useState } from "react";
import { useApp } from "../lib/store";
import { MAX_VERSIONS, defaultVersionName } from "../lib/versions";
import { Button, Card, Field, SectionTitle, inputCls } from "./ui";

/**
 * "Save as a version" form (Cycle 16 — see the schema design in the
 * improvement log). Snapshots the current resume + target-job context
 * + template via the store's saveVersion; the default name comes from
 * the target title/company and stays editable. Used on the Design tab
 * (the finalized artifact) and the Rewrite tab (where tailoring
 * happens). Renders nothing without a resume.
 */
export function SaveVersionForm({ className = "" }: { className?: string }) {
  const { hasResume, targetTitle, company, jobText, jobUrl, templateId, resume, versions, saveVersion } = useApp();
  const [name, setName] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  if (!hasResume) return null;

  const shown = name ?? defaultVersionName({ targetTitle, company, jobText, jobUrl, templateId, resume });

  function save() {
    const err = saveVersion(shown);
    if (err) {
      setError(err);
      setMsg("");
    } else {
      setError("");
      setMsg(`✓ Saved “${shown}” — find it under Saved versions on the Resume tab.`);
      setName(null);
    }
  }

  return (
    <Card className={`${className} print:hidden`}>
      <p className="font-bold text-ink text-sm mb-1">📌 Save as a version</p>
      <p className="text-xs text-muted leading-relaxed mb-3">
        Snapshot this resume with its target job and design, so you can restore it anytime.
        {versions.length > 0 ? ` ${versions.length} of ${MAX_VERSIONS} saved.` : ""}
      </p>
      <Field label="Version name">
        <input value={shown} onChange={(e) => setName(e.target.value)} className={inputCls}
          placeholder="e.g. Logistics Coordinator — Acme Corp" aria-label="Version name" />
      </Field>
      <Button variant="secondary" onClick={save} className="w-full">Save this version</Button>
      {msg && <p className="text-sm text-emerald-900 font-medium mt-2">{msg}</p>}
      {error && <p className="text-sm text-red-700 mt-2">{error}</p>}
    </Card>
  );
}

/**
 * Saved-versions manager for the Resume tab: load (with an inline
 * two-step confirm when there is current work to lose — the app's
 * Settings idiom), rename inline, delete with a two-step confirm.
 * The save form sits at the top so preserving current work before a
 * load is one tap in the same place. Renders nothing when no versions
 * exist yet.
 */
export function VersionsCard() {
  const { versions, loadVersion, renameVersion, deleteVersion, hasResume, jobText } = useApp();
  const [confirmLoadId, setConfirmLoadId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [loadedMsg, setLoadedMsg] = useState("");

  if (versions.length === 0) return null;

  const hasCurrentWork = hasResume || jobText.trim().length > 0;

  function doLoad(id: string, name: string) {
    loadVersion(id);
    setConfirmLoadId(null);
    setLoadedMsg(`✓ Loaded “${name}” — your resume and target job now match this version.`);
  }

  return (
    <div className="mt-8">
      <SectionTitle sub="Per-job snapshots of your resume. Load one to restore its resume, target job, and design exactly as saved.">
        Saved versions
      </SectionTitle>
      <SaveVersionForm className="mb-3" />
      <Card>
        {loadedMsg && <p className="text-sm text-emerald-900 font-medium mb-3">{loadedMsg}</p>}
        <div className="grid gap-2">
          {versions.map((v) => (
            <div key={v.id} className="rounded-xl border border-line p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink leading-snug">{v.name}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {[v.targetTitle, v.company].filter(Boolean).join(" · ") || "No target job"}
                    {" · "}
                    {new Date(v.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </div>

              {renameId === v.id ? (
                <div className="flex gap-2 mt-2">
                  <input value={renameText} onChange={(e) => setRenameText(e.target.value)}
                    className={inputCls} aria-label={`New name for version ${v.name}`} />
                  <Button onClick={() => { renameVersion(v.id, renameText); setRenameId(null); }}
                    disabled={!renameText.trim()} className="shrink-0">Save</Button>
                  <Button variant="secondary" onClick={() => setRenameId(null)} className="shrink-0">Cancel</Button>
                </div>
              ) : confirmLoadId === v.id ? (
                <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-amber-900 leading-relaxed mb-2">
                    Loading replaces your current resume and target job. Save the current one above first if you want to keep it.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="danger" onClick={() => doLoad(v.id, v.name)} className="flex-1"
                      aria-label={`Confirm loading version ${v.name}`}>Load it</Button>
                    <Button variant="secondary" onClick={() => setConfirmLoadId(null)} className="flex-1">Cancel</Button>
                  </div>
                </div>
              ) : confirmDeleteId === v.id ? (
                <div className="flex gap-2 mt-2">
                  <Button variant="danger" onClick={() => { deleteVersion(v.id); setConfirmDeleteId(null); }} className="flex-1"
                    aria-label={`Confirm deleting version ${v.name}`}>Delete it</Button>
                  <Button variant="secondary" onClick={() => setConfirmDeleteId(null)} className="flex-1">Cancel</Button>
                </div>
              ) : (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => (hasCurrentWork ? setConfirmLoadId(v.id) : doLoad(v.id, v.name))}
                    aria-label={`Load version ${v.name}`}
                    className="flex-1 text-center text-[13px] font-bold py-2.5 rounded-[10px] bg-brand text-white min-h-[44px]">
                    Load
                  </button>
                  <button onClick={() => { setRenameId(v.id); setRenameText(v.name); }}
                    aria-label={`Rename version ${v.name}`}
                    className="flex-1 text-center text-[13px] font-bold py-2.5 rounded-[10px] bg-slate-100 text-slate-700 min-h-[44px]">
                    Rename
                  </button>
                  <button onClick={() => setConfirmDeleteId(v.id)}
                    aria-label={`Delete version ${v.name}`}
                    className="flex-1 text-center text-[13px] font-bold py-2.5 rounded-[10px] bg-slate-100 text-red-700 min-h-[44px]">
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
