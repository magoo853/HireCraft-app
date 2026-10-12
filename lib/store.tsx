"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { MilitaryInfo, Mode, StructuredResume, emptyMilitary, emptyResume } from "./types";

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
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const s = load();
    if (s) {
      if (s.mode) setMode(s.mode as Mode);
      if (s.targetTitle) setTargetTitle(s.targetTitle as string);
      if (s.company) setCompany(s.company as string);
      if (s.resume) setResume(s.resume as StructuredResume);
      if (s.jobText) setJobText(s.jobText as string);
      if (s.jobUrl) setJobUrl(s.jobUrl as string);
      if (s.linkedinText) setLinkedinText(s.linkedinText as string);
      if (s.military) setMilitary({ ...emptyMilitary(), ...(s.military as MilitaryInfo) });
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ mode, targetTitle, company, resume, jobText, jobUrl, linkedinText, military }));
    } catch { /* storage full — non-fatal */ }
  }, [hydrated, mode, targetTitle, company, resume, jobText, jobUrl, linkedinText, military]);

  const updateResume = (patch: Partial<StructuredResume>) =>
    setResume((r) => ({ ...r, ...patch }));

  const resetAll = () => {
    setMode("general");
    setTargetTitle("");
    setCompany("");
    setResume(emptyResume());
    setJobText("");
    setJobUrl("");
    setLinkedinText("");
    setMilitary(emptyMilitary());
    try { localStorage.removeItem(KEY); } catch { /* noop */ }
  };

  const hasResume = !!(resume.rawText || resume.name || resume.experience.length);

  return (
    <Ctx.Provider value={{
      mode, setMode, targetTitle, setTargetTitle, company, setCompany,
      resume, setResume, updateResume, jobText, setJobText, jobUrl, setJobUrl, linkedinText, setLinkedinText,
      military, setMilitary,
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
