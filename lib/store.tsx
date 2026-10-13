"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { MilitaryInfo, Mode, StructuredResume, emptyMilitary, emptyResume } from "./types";
import type { JobAlert } from "./jobs";
import {
  SavedVersion, addVersion, createVersion, findVersion,
  removeVersion, renameVersion as renameVersionInList, sanitizeVersions, versionToContext,
} from "./versions";

interface AppState {
  mode: Mode;
  setMode: (m: Mode) => void;
  targetTitle: string;
  setTargetTitle: (t: string) => void;
  company: string;
  setCompany: (c: string) => void;
  resume: StructuredResume;
  setResume: (r: StructuredResume) => void;
  updateResume: (patch: Partial<StructuredResume>) => void;
  jobText: string;
  setJobText: (t: string) => void;
  jobUrl: string;
  setJobUrl: (u: string) => void;
  linkedinText: string;
  setLinkedinText: (t: string) => void;
  military: MilitaryInfo;
  setMilitary: (m: MilitaryInfo) => void;
  alerts: JobAlert[];
  setAlerts: (a: JobAlert[]) => void;
  seenJobIds: string[];
  setSeenJobIds: (ids: string[]) => void;
  newJobCount: number;
  setNewJobCount: (n: number) => void;
  aiConsent: boolean;
  setAiConsent: (v: boolean) => void;
  scoreViewed: boolean;
  setScoreViewed: (v: boolean) => void;
  rewriteAccepted: boolean;
  setRewriteAccepted: (v: boolean) => void;
  designChosen: boolean;
  setDesignChosen: (v: boolean) => void;
  exported: boolean;
  setExported: (v: boolean) => void;
  onboardingDismissed: boolean;
  setOnboardingDismissed: (v: boolean) => void;
  templateId: string;
  setTemplateId: (t: string) => void;
  versions: SavedVersion[];
  /** Snapshot the current resume + target-job context. Returns an error message to show, or null on success. */
  saveVersion: (name: string) => string | null;
  loadVersion: (id: string) => void;
  renameVersion: (id: string, name: string) => void;
  deleteVersion: (id: string) => void;
  hasResume: boolean;
  resetAll: () => void;
}

const Ctx = createContext<AppState | null>(null);
const KEY = "hirecraft-state-v1";

function load(): Partial<AppState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("general");
  const [targetTitle, setTargetTitle] = useState("");
  const [company, setCompany] = useState("");
  const [resume, setResume] = useState<StructuredResume>(emptyResume());
  const [jobText, setJobText] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [linkedinText, setLinkedinText] = useState("");
  const [military, setMilitary] = useState<MilitaryInfo>(emptyMilitary());
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [seenJobIds, setSeenJobIds] = useState<string[]>([]);
  const [newJobCount, setNewJobCount] = useState(0);
  const [aiConsent, setAiConsent] = useState(false);
  const [scoreViewed, setScoreViewed] = useState(false);
  const [rewriteAccepted, setRewriteAccepted] = useState(false);
  const [designChosen, setDesignChosen] = useState(false);
  const [exported, setExported] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [templateId, setTemplateId] = useState("modern");
  const [versions, setVersions] = useState<SavedVersion[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const s = load();
    if (s) {
      if (s.mode) setMode(s.mode as Mode);
      if (s.targetTitle) setTargetTitle(s.targetTitle as string);
      if (s.company) setCompany(s.company as string);
      if (s.resume) setResume({ ...emptyResume(), ...(s.resume as StructuredResume) });
      if (s.jobText) setJobText(s.jobText as string);
      if (s.jobUrl) setJobUrl(s.jobUrl as string);
      if (s.linkedinText) setLinkedinText(s.linkedinText as string);
      if (s.military) setMilitary({ ...emptyMilitary(), ...(s.military as MilitaryInfo) });
      if (Array.isArray(s.alerts)) setAlerts(s.alerts as JobAlert[]);
      if (Array.isArray(s.seenJobIds)) setSeenJobIds(s.seenJobIds as string[]);
      if (typeof s.newJobCount === "number") setNewJobCount(s.newJobCount);
      if (typeof s.aiConsent === "boolean") setAiConsent(s.aiConsent);
      if (typeof s.scoreViewed === "boolean") setScoreViewed(s.scoreViewed);
      if (typeof s.rewriteAccepted === "boolean") setRewriteAccepted(s.rewriteAccepted);
      if (typeof s.designChosen === "boolean") setDesignChosen(s.designChosen);
      if (typeof s.exported === "boolean") setExported(s.exported);
      if (typeof s.onboardingDismissed === "boolean") setOnboardingDismissed(s.onboardingDismissed);
      if (typeof s.templateId === "string" && s.templateId) setTemplateId(s.templateId);
      if (Array.isArray(s.versions)) setVersions(sanitizeVersions(s.versions));
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ mode, targetTitle, company, resume, jobText, jobUrl, linkedinText, military, alerts, seenJobIds, newJobCount, aiConsent, scoreViewed, rewriteAccepted, designChosen, exported, onboardingDismissed, templateId, versions }));
    } catch { /* storage full — non-fatal */ }
  }, [hydrated, mode, targetTitle, company, resume, jobText, jobUrl, linkedinText, military, alerts, seenJobIds, newJobCount, aiConsent, scoreViewed, rewriteAccepted, designChosen, exported, onboardingDismissed, templateId, versions]);

  const updateResume = (patch: Partial<StructuredResume>) =>
    setResume((r) => ({ ...r, ...patch }));

  const saveVersion = (name: string): string | null => {
    const v = createVersion({ targetTitle, company, jobText, jobUrl, templateId, resume }, name);
    const res = addVersion(versions, v);
    if (!res.ok) return res.error;
    setVersions(res.versions);
    return null;
  };

  const loadVersion = (id: string) => {
    const v = findVersion(versions, id);
    if (!v) return;
    const ctx = versionToContext(v);
    setResume(ctx.resume);
    setTargetTitle(ctx.targetTitle);
    setCompany(ctx.company);
    setJobText(ctx.jobText);
    setJobUrl(ctx.jobUrl);
    setTemplateId(ctx.templateId);
  };

  const renameVersion = (id: string, name: string) =>
    setVersions((list) => renameVersionInList(list, id, name));

  const deleteVersion = (id: string) =>
    setVersions((list) => removeVersion(list, id));

  const resetAll = () => {
    setMode("general");
    setTargetTitle("");
    setCompany("");
    setResume(emptyResume());
    setJobText("");
    setJobUrl("");
    setLinkedinText("");
    setMilitary(emptyMilitary());
    setAlerts([]);
    setSeenJobIds([]);
    setNewJobCount(0);
    setAiConsent(false);
    setScoreViewed(false);
    setRewriteAccepted(false);
    setDesignChosen(false);
    setExported(false);
    setOnboardingDismissed(false);
    setTemplateId("modern");
    setVersions([]);
    try { localStorage.removeItem(KEY); } catch { /* noop */ }
  };

  const hasResume = !!(resume.rawText || resume.name || resume.experience.length);

  return (
    <Ctx.Provider value={{
      mode, setMode, targetTitle, setTargetTitle, company, setCompany,
      resume, setResume, updateResume, jobText, setJobText, jobUrl, setJobUrl, linkedinText, setLinkedinText,
      military, setMilitary,
      alerts, setAlerts, seenJobIds, setSeenJobIds, newJobCount, setNewJobCount,
      aiConsent, setAiConsent,
      scoreViewed, setScoreViewed, rewriteAccepted, setRewriteAccepted,
      designChosen, setDesignChosen, exported, setExported,
      onboardingDismissed, setOnboardingDismissed,
      templateId, setTemplateId,
      versions, saveVersion, loadVersion, renameVersion, deleteVersion,
      hasResume, resetAll,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
