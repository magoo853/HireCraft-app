import { NextRequest, NextResponse } from "next/server";
import {
  buildRoadmap,
  matchJobs,
  scoreQuiz,
  HorizonGoal,
} from "@/lib/careers";
import {
  generateCoverLetter,
  generateLinkedIn,
  rewriteBullets,
} from "@/lib/fallback";
import { Mode, StructuredResume } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface AiRequest {
  task: "rewrite" | "cover-letter" | "linkedin" | "roadmap" | "discover";
  mode: Mode;
  resume: StructuredResume;
  jobText?: string;
  targetTitle?: string;
  company?: string;
  tone?: "professional" | "confident" | "warm";
  goals?: { h2: HorizonGoal; h5: HorizonGoal; h10: HorizonGoal };
  answers?: number[];
}

const API_KEY = process.env.AI_API_KEY;
// Default: Google Gemini (free tier, OpenAI-compatible endpoint). Override with
// AI_API_BASE / AI_MODEL env vars for any other OpenAI-compatible provider.
const API_BASE = (process.env.AI_API_BASE || "https://generativelanguage.googleapis.com/v1beta/openai").replace(/\/$/, "");
const MODEL = process.env.AI_MODEL || "gemini-2.0-flash";

const HONESTY = `Critical rules: NEVER invent facts, numbers, job titles, companies, dates, or skills the user did not provide. Only rephrase what exists. Where a bullet lacks a metric, say so in the "gaps" field instead of inventing one.`;

async function callLLM(system: string, user: string): Promise<string> {
  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI provider returned ${res.status}`);
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty AI response");
  return text;
}

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in AI response");
  return JSON.parse(text.slice(start, end + 1));
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as AiRequest;
  const { task, mode, resume, jobText = "", targetTitle = "", company = "", tone = "professional" } = body;

  if (!API_KEY) {
    return NextResponse.json({ source: "fallback", data: runFallback(body) });
  }

  try {
    const data = await runAi(body);
    return NextResponse.json({ source: "ai", data });
  } catch (e) {
    console.error("AI call failed, using fallback:", e);
    return NextResponse.json({ source: "fallback", data: runFallback(body) });
  }
}

function runFallback(b: AiRequest) {
  const { task, mode, resume, jobText = "", targetTitle = "", company = "", tone, goals, answers } = b;
  if (task === "rewrite") return rewriteBullets(resume.rawText, mode);
  if (task === "cover-letter") return generateCoverLetter(resume, jobText, targetTitle, company, (tone ?? "professional") as "professional" | "confident" | "warm");
  if (task === "roadmap") {
    const current = resume.experience[0]?.title || "";
    return buildRoadmap(current, resume.rawText, resume.skills, goals ?? { h2: { text: "", salary: 0 }, h5: { text: "", salary: 0 }, h10: { text: "", salary: 0 } });
  }
  if (task === "discover") {
    const { scores, code, top } = scoreQuiz(answers ?? []);
    return { scores, code, top, matches: matchJobs(scores, resume.rawText, resume.skills, 10) };
  }
  return generateLinkedIn(resume, jobText, targetTitle);
}

async function runAi(b: AiRequest) {
  const { task, mode, resume, jobText = "", targetTitle = "", company = "", tone = "professional", goals, answers } = b;
  const resumeContext = `RESUME:\n${resume.rawText.slice(0, 6000)}`;
  const jobContext = jobText ? `\n\nTARGET JOB POSTING:\n${jobText.slice(0, 4000)}` : "";
  const modeContext =
    mode === "veteran"
      ? "\n\nMODE: Veteran transition. Translate military jargon (MOS, rank, unit terms) into civilian language. Note translations applied."
      : mode === "new"
        ? "\n\nMODE: New to workforce. Be encouraging; emphasize transferable experience (projects, volunteer work, coursework)."
        : "";

  if (task === "roadmap") return runAiRoadmap(b);
  if (task === "discover") return runAiDiscover(b);

  if (task === "rewrite") {
    const text = await callLLM(
      `You are a senior resume coach. Rewrite each resume bullet to be punchier and impact-first. ${HONESTY}${modeContext}\n\nReturn JSON: {"rewrites":[{"original":string,"rewritten":string,"why":string,"gaps":[string],"translationNote":string|null}]}`,
      `${resumeContext}${jobContext}\n\nRewrite every bullet point found in the resume.`
    );
    const parsed = extractJson(text) as { rewrites: unknown[] };
    return parsed.rewrites;
  }

  if (task === "cover-letter") {
    const text = await callLLM(
      `You are a senior career coach writing a cover letter. Tone: ${tone}. ${HONESTY}\n\nReturn JSON: {"tone":string,"text":string}`,
      `${resumeContext}${jobContext}\n\nTarget title: ${targetTitle || "(not specified)"}\nCompany: ${company || "(not specified)"}\n\nWrite a concise cover letter (3-4 short paragraphs) tailored to the posting.`
    );
    return extractJson(text);
  }

  const text = await callLLM(
    `You are a LinkedIn profile coach. ${HONESTY}${modeContext}\n\nReturn JSON: {"headlines":[string,string,string],"about":string,"polishedBullets":[{"original":string,"polished":string}],"skillsGap":[string],"tip":string}`,
    `${resumeContext}${jobContext}\n\nTarget title: ${targetTitle || "(not specified)"}\n\nProduce 3 headline options, a first-person About section (~120 words), polished experience bullets, skills missing vs the posting, and one actionable tip.`
  );
  return extractJson(text);
}

async function runAiRoadmap(b: AiRequest) {
  const { resume, goals } = b;
  const g = goals ?? { h2: { text: "", salary: 0 }, h5: { text: "", salary: 0 }, h10: { text: "", salary: 0 } };
  const text = await callLLM(
    `You are a career strategist. Build a 2/5/10-year career roadmap. ${HONESTY}\n\nSalary bands must be realistic US estimates — label every band as an estimate. For each recommended title, compare its band against the user's salary target and set salaryFlag: "hit" (target <= low end), "can-hit" (target within band), or "below" (target above band), with a one-line salaryNote.\n\nReturn JSON: {"nodes":[{"horizon":string,"goalText":string,"titles":[{"title":string,"salaryLow":number,"salaryHigh":number,"salaryFlag":string,"salaryNote":string}],"steppingStones":[string],"gaps":[string]}]}`,
    `RESUME:\n${resume.rawText.slice(0, 5000)}\n\nCurrent title: ${resume.experience[0]?.title || "(unknown)"}\n\nGOALS:\n2 years: ${g.h2.text} (salary target: ${g.h2.salary || "not set"})\n5 years: ${g.h5.text} (salary target: ${g.h5.salary || "not set"})\n10 years: ${g.h10.text} (salary target: ${g.h10.salary || "not set"})\n\nReturn 4 nodes: "Now", "2 years", "5 years", "10 years".`
  );
  return (extractJson(text) as { nodes: unknown }).nodes;
}

async function runAiDiscover(b: AiRequest) {
  const { resume, answers } = b;
  const text = await callLLM(
    `You are a career counselor using the Holland Code (RIASEC) framework. ${HONESTY}\n\nSalary bands must be realistic US estimates, labeled as estimates.\n\nReturn JSON: {"code":string,"scores":{"R":number,"I":number,"A":number,"S":number,"E":number,"C":number},"matches":[{"title":string,"fit":number,"why":string,"matchedSkills":[string],"missingSkills":[string],"salaryLow":number,"salaryHigh":number}]}`,
    `RESUME:\n${resume.rawText.slice(0, 5000)}\n\nRIASEC quiz answers (1=strongly disagree .. 5=strongly agree, 18 questions in R,I,A,S,E,C order, 3 each):\n${(answers ?? []).join(",")}\n\nScore the quiz, derive the 3-letter Holland code, and recommend the 10 best-fit job titles with fit scores (0-100), one-line why, skills the resume already shows vs. missing, and estimated salary bands.`
  );
  const parsed = extractJson(text) as { code: string; scores: unknown; matches: unknown[] };
  return { scores: parsed.scores, code: parsed.code, top: parsed.code.split(""), matches: parsed.matches };
}
