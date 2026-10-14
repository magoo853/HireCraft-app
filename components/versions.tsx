"use client";

import { useState } from "react";
import { useApp } from "../lib/store";
import {
  MAX_VERSIONS, defaultVersionName,
  type ApplicationStatus, type SavedVersion, type VersionApplication,
} from "../lib/versions";
import { Button, Card, Field, SectionTitle, inputCls } from "./ui";

const APPLICATION_STATUS_LABELS: { value: ApplicationStatus; label: string }[] = [
  { value: "saved", label: "Saved" },
  { value: "applied", label: "Applied" },
  { value: "interviewing", label: "Interviewing" },
  { value: "offer", label: "Offer" },
  { value: "closed", label: "Closed" },
];

function epochToDateInput(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Tracker-lite editor (Wave 4): status + applied date + a short note,
 * pinned to this saved version. Lite by design — no kanban, contacts,
 * or reminders. Selects/date commit immediately; the note commits on
 * blur. Choosing "Not tracked" clears the record.
 */
function VersionApplicationEditor({ v }: { v: SavedVersion }) {
  const { updateVersionApplication } = useApp();
  const app = v.application;
  const [note, setNote] = useState(app?.note ?? "");

  function apply(patch: Partial<VersionApplication>) {
    if (!app) return;
    const next: VersionApplication = {
      status: patch.status ?? app.status,
      appliedAt: "appliedAt" in patch ? patch.appliedAt : app.appliedAt,
      note: "note" in patch ? patch.note : app.note,
    };
    if (!next.appliedAt) delete next.appliedAt;
    if (!next.note) delete next.note;
    updateVersionApplication(v.id, next);
  }

  return (
    <div className="mt-2.5 border-t border-line pt-2.5">
      <div className="flex flex-wrap gap-2">
        <label className="flex-1 min-w-[150px]">
          <span className="block text-[11px] font-extrabold uppercase tracking-widest text-muted mb-1">Application status</span>
          <select
            value={app?.status ?? ""}
            aria-label={`Application status for version ${v.name}`}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) { updateVersionApplication(v.id, undefined); setNote(""); return; }
              if (app) apply({ status: val as ApplicationStatus });
              else updateVersionApplication(v.id, { status: val as ApplicationStatus });
            }}
            className={`${inputCls} !py-2 !min-h-[44px] text-sm`}
          >
            <option value="">Not tracked</option>
            {APPLICATION_STATUS_LABELS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        {app && (
          <label>
            <span className="block text-[11px] font-extrabold uppercase tracking-widest text-muted mb-1">Date applied</span>
            <input
              type="date"
              value={app.appliedAt ? epochToDateInput(app.appliedAt) : ""}
              aria-label={`Date applied for version ${v.name}`}
              onChange={(e) => apply({ appliedAt: e.target.value ? new Date(`${e.target.value}T00:00:00`).getTime() : undefined })}
              className={`${inputCls} !py-2 !min-h-[44px] text-sm !w-auto`}
            />
          </label>
        )}
      </div>
      {app && (
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => { if (note !== (app.note ?? "")) apply({ note: note.trim() || undefined }); }}
          placeholder="Note — e.g. Recruiter screen Tue 10am"
          aria-label={`Application note for version ${v.name}`}
          className={`${inputCls} !py-2 !min-h-[44px] text-sm mt-2`}
        />
      )}
    </div>
  );
}

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

              <VersionApplicationEditor key={v.id} v={v} />

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
