"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { LinkedInResult, MilitaryInfo, Mode, PerformanceReview, ScoreHistoryEntry, StructuredResume, emptyMilitary, emptyPerfReview, emptyResume } from "./types";
import { appendScoreHistory, sanitizeScoreHistory } from "./score-history";
import { sanitizeLinkedInResult } from "./linkedin-result";
import type { JobAlert } from "./jobs";
import {
  SavedVersion, VersionApplication, VersionDensity, addVersion, createVersion, findVersion,
  removeVersion, renameVersion as renameVersionInList, sanitizeDesignOpts, sanitizeVersions,
  setVersionApplication, versionToContext,
} from "./versions";

/** The Design tab's own localStorage key for Custom Studio options —
 *  version snapshots capture from it and restore back into it. */
const DESIGN_OPTS_KEY = "hirecraft-design-opts";

/**
 * EVERY app-owned localStorage key — the single list delete-all wipes.
 * Enumerated by grepping the whole tree for localStorage get/set/remove
 * (S-batch, log #16): the main state blob, the Design tab's options key,
 * the Roadmap goals (current + legacy) and its saved-location key, the
 * Discover quiz key (its saved location lives inside that same blob),
 * the trial record, and the customized goal-ideas set. Keep this list
 * in sync when a new persisted key is added anywhere in the app.
 * (Not storage: "hirecraft-bullets" in lib/docx.ts is a DOCX style
 * reference name, and the hirecraft_trial cookie is httpOnly — set by
 * the verification callback — so it cannot be cleared from the client.)
 */
export const APP_STORAGE_KEYS = [
  "hirecraft-state-v1",
  "hirecraft-design-opts",
  "hirecraft-roadmap-goals-v2",
  "hirecraft-roadmap-goals",
  "hc_location",
  "hirecraft-quiz",
  "hirecraft-trial",
  "hirecraft-goal-ideas-v1",
] as const;

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
  perfReview: PerformanceReview;
  setPerfReview: (r: PerformanceReview) => void;
  alerts: JobAlert[];
  setAlerts: (a: JobAlert[]) => void;
  seenJobIds: string[];
  setSeenJobIds: (ids: string[]) => void;
  newJobCount: number;
  setNewJobCount: (n: number) => void;
  aiConsent: boolean;
  setAiConsent: (v: boolean) => void;
  aiConsentDeclined: boolean;
  setAiConsentDeclined: (v: boolean) => void;
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
  /** Wave 3: recorded ATS scores, oldest → newest (cap 30, deduped on total). */
  scoreHistory: ScoreHistoryEntry[];
  recordScore: (total: number, grade: string, jobBasis: string) => void;
  /** Wave 3: the current cover letter — persists across navigation and is
   *  captured into saved versions (the application packet). */
  coverLetterText: string;
  setCoverLetterText: (t: string) => void;
  /** Wave 3: the last generated LinkedIn result — survives navigation. */
  linkedinResult: LinkedInResult | null;
  setLinkedinResult: (r: LinkedInResult | null) => void;
  /** Wave 4: Design density lives in the store so version snapshots can
   *  capture it and loads can restore it. */
  designDensity: VersionDensity;
  setDesignDensity: (d: VersionDensity) => void;
  versions: SavedVersion[];
  /** Snapshot the current resume + target-job context. Returns an error message to show, or null on success. */
  saveVersion: (name: string) => string | null;
  loadVersion: (id: string) => void;
  renameVersion: (id: string, name: string) => void;
  deleteVersion: (id: string) => void;
  /** Wave 4 tracker-lite: set or clear a version's application record. */
  updateVersionApplication: (id: string, application: VersionApplication | undefined) => void;
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
  const [perfReview, setPerfReview] = useState<PerformanceReview>(emptyPerfReview());
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [seenJobIds, setSeenJobIds] = useState<string[]>([]);
  const [newJobCount, setNewJobCount] = useState(0);
  const [aiConsent, setAiConsent] = useState(false);
  const [aiConsentDeclined, setAiConsentDeclined] = useState(false);
  const [scoreViewed, setScoreViewed] = useState(false);
  const [rewriteAccepted, setRewriteAccepted] = useState(false);
  const [designChosen, setDesignChosen] = useState(false);
  const [exported, setExported] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [templateId, setTemplateId] = useState("modern");
  const [scoreHistory, setScoreHistory] = useState<ScoreHistoryEntry[]>([]);
  const [coverLetterText, setCoverLetterText] = useState("");
  const [linkedinResult, setLinkedinResult] = useState<LinkedInResult | null>(null);
  const [designDensity, setDesignDensity] = useState<VersionDensity>("comfortable");
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
      if (s.perfReview && typeof s.perfReview === "object") {
        const review = s.perfReview as Partial<PerformanceReview>;
        setPerfReview({
          text: typeof review.text === "string" ? review.text : "",
          updatedAt: typeof review.updatedAt === "number" && Number.isFinite(review.updatedAt) ? review.updatedAt : 0,
        });
      }
      if (Array.isArray(s.alerts)) setAlerts(s.alerts as JobAlert[]);
      if (Array.isArray(s.seenJobIds)) setSeenJobIds(s.seenJobIds as string[]);
      if (typeof s.newJobCount === "number") setNewJobCount(s.newJobCount);
      if (typeof s.aiConsent === "boolean") setAiConsent(s.aiConsent);
      if (typeof s.aiConsentDeclined === "boolean") setAiConsentDeclined(s.aiConsentDeclined);
      if (typeof s.scoreViewed === "boolean") setScoreViewed(s.scoreViewed);
      if (typeof s.rewriteAccepted === "boolean") setRewriteAccepted(s.rewriteAccepted);
      if (typeof s.designChosen === "boolean") setDesignChosen(s.designChosen);
      if (typeof s.exported === "boolean") setExported(s.exported);
      if (typeof s.onboardingDismissed === "boolean") setOnboardingDismissed(s.onboardingDismissed);
      if (typeof s.templateId === "string" && s.templateId) setTemplateId(s.templateId);
      if (Array.isArray(s.scoreHistory)) setScoreHistory(sanitizeScoreHistory(s.scoreHistory));
      if (typeof s.coverLetterText === "string") setCoverLetterText(s.coverLetterText);
      setLinkedinResult(sanitizeLinkedInResult(s.linkedinResult));
      if (s.designDensity === "comfortable" || s.designDensity === "compact") setDesignDensity(s.designDensity);
      if (Array.isArray(s.versions)) setVersions(sanitizeVersions(s.versions));
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ mode, targetTitle, company, resume, jobText, jobUrl, linkedinText, military, perfReview, alerts, seenJobIds, newJobCount, aiConsent, aiConsentDeclined, scoreViewed, rewriteAccepted, designChosen, exported, onboardingDismissed, templateId, versions, scoreHistory, coverLetterText, linkedinResult, designDensity }));
    } catch { /* storage full — non-fatal */ }
  }, [hydrated, mode, targetTitle, company, resume, jobText, jobUrl, linkedinText, military, perfReview, alerts, seenJobIds, newJobCount, aiConsent, aiConsentDeclined, scoreViewed, rewriteAccepted, designChosen, exported, onboardingDismissed, templateId, versions, scoreHistory, coverLetterText, linkedinResult, designDensity]);

  const updateResume = (patch: Partial<StructuredResume>) =>
    setResume((r) => ({ ...r, ...patch }));

  const recordScore = (total: number, grade: string, jobBasis: string) =>
    setScoreHistory((list) => appendScoreHistory(list, { at: Date.now(), total, grade, jobBasis }));

  const saveVersion = (name: string): string | null => {
    // Wave 4: capture the current design state — density from the store
    // and designOpts from the Design tab's own localStorage key — so the
    // snapshot restores the look exactly as saved.
    let designOpts: ReturnType<typeof sanitizeDesignOpts>;
    try {
      const raw = localStorage.getItem(DESIGN_OPTS_KEY);
      if (raw) designOpts = sanitizeDesignOpts(JSON.parse(raw));
    } catch { /* no stored design options — snapshot simply omits them */ }
    const v = createVersion({ targetTitle, company, jobText, jobUrl, templateId, resume, coverLetter: coverLetterText, density: designDensity, designOpts }, name);
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
    setCoverLetterText(ctx.coverLetter ?? "");
    // Wave 4: restore the saved design state. Legacy versions carry
    // neither field and leave current settings untouched.
    if (ctx.density) setDesignDensity(ctx.density);
    if (ctx.designOpts) {
      try { localStorage.setItem(DESIGN_OPTS_KEY, JSON.stringify(ctx.designOpts)); } catch { /* noop */ }
    }
  };

  const renameVersion = (id: string, name: string) =>
    setVersions((list) => renameVersionInList(list, id, name));

  const deleteVersion = (id: string) =>
    setVersions((list) => removeVersion(list, id));

  const updateVersionApplication = (id: string, application: VersionApplication | undefined) =>
    setVersions((list) => setVersionApplication(list, id, application));

  const resetAll = () => {
    setMode("general");
    setTargetTitle("");
    setCompany("");
    setResume(emptyResume());
    setJobText("");
    setJobUrl("");
    setLinkedinText("");
    setMilitary(emptyMilitary());
    setPerfReview(emptyPerfReview());
    setAlerts([]);
    setSeenJobIds([]);
    setNewJobCount(0);
    setAiConsent(false);
    setAiConsentDeclined(false);
    setScoreViewed(false);
    setRewriteAccepted(false);
    setDesignChosen(false);
    setExported(false);
    setOnboardingDismissed(false);
    setTemplateId("modern");
    setScoreHistory([]);
    setCoverLetterText("");
    setLinkedinResult(null);
    setDesignDensity("comfortable");
    setVersions([]);
    try {
      for (const k of APP_STORAGE_KEYS) localStorage.removeItem(k);
    } catch { /* noop */ }
  };

  const hasResume = !!(resume.rawText || resume.name || resume.experience.length);

  return (
    <Ctx.Provider value={{
      mode, setMode, targetTitle, setTargetTitle, company, setCompany,
      resume, setResume, updateResume, jobText, setJobText, jobUrl, setJobUrl, linkedinText, setLinkedinText,
      military, setMilitary,
      perfReview, setPerfReview,
      alerts, setAlerts, seenJobIds, setSeenJobIds, newJobCount, setNewJobCount,
      aiConsent, setAiConsent, aiConsentDeclined, setAiConsentDeclined,
      scoreViewed, setScoreViewed, rewriteAccepted, setRewriteAccepted,
      designChosen, setDesignChosen, exported, setExported,
      onboardingDismissed, setOnboardingDismissed,
      templateId, setTemplateId,
      scoreHistory, recordScore,
      coverLetterText, setCoverLetterText,
      linkedinResult, setLinkedinResult,
      designDensity, setDesignDensity,
      versions, saveVersion, loadVersion, renameVersion, deleteVersion, updateVersionApplication,
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
