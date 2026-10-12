import { NextRequest, NextResponse } from "next/server";
import {
  buildRoadmap,
  matchJobs,
  mosTranslations,
  scoreQuiz,
  JobMatch,
  ROLES,
  RoadmapGoal,
  Role,
} from "@/lib/careers";
import {
  generateCoverLetter,
  generateLinkedIn,
  rewriteBullets,
} from "@/lib/fallback";
import { MilitaryInfo, Mode, StructuredResume } from "@/lib/types";

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
  goals?: RoadmapGoal[];
  answers?: number[];
  linkedinText?: string;
  feedback?: string;
  military?: MilitaryInfo;
}

const API_KEY = process.env.AI_API_KEY;
// Default: Google Gemini (free tier, OpenAI-compatible endpoint). Override with
// AI_API_BASE / AI_MODEL env vars for any other OpenAI-compatible provider.
const API_BASE = (process.env.AI_API_BASE || "https://generativelanguage.googleapis.com/v1beta/openai").replace(/\/$/, "");
const MODEL = process.env.AI_MODEL || "gemini-3.8-flash";

const HONESTY = `Critical rules: NEVER invent facts, numbers, job titles, companies, dates, or skills the user did not provide. Only rephrase what exists. Where a bullet lacks a metric, say so in the "gaps" field instead of inventing one.`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Call the LLM with resilience: the free tier 503s under load, so retry the
 * primary model, then walk a fallback chain of other current models before
 * giving up (the caller then falls back to the built-in engine).
 */
async function callLLM(system: string, user: string): Promise<string> {
  const models = Array.from(new Set([MODEL, "gemini-3.6-flash", "gemini-3.5-flash-lite"]));
  let lastErr = new Error("AI provider unavailable");
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      let res: Response;
      try {
        res = await fetch(`${API_BASE}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_KEY}`,
          },
          body: JSON.stringify({
            model,
            temperature: 0.4,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
          }),
        });
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error("Network error calling AI provider");
        await sleep(800);
        continue;
      }
      if (res.status === 503 || res.status === 429) {
        lastErr = new Error(`AI provider returned ${res.status}`);
        await sleep(attempt === 0 ? 900 : 1800);
        continue;
      }
      if (res.status === 404) {
        lastErr = new Error("AI provider returned 404");
        break; // model gone — try the next one
      }
      if (!res.ok) throw new Error(`AI provider returned ${res.status}`);
      const json = await res.json();
      const text = json.choices?.[0]?.message?.content;
      if (!text) throw new Error("Empty AI response");
      return text;
    }
  }
  throw lastErr;
}

/** Veteran context block shared by the AI prompts (empty when not applicable). */
function militaryContext(b: AiRequest): string {
  const m = b.military;
  if (!m || (b.mode !== "veteran" && !m.mosCodes && !m.evalText)) return "";
  const parts: string[] = [];
  if (m.branch || m.mosCodes) {
    parts.push(`MILITARY BACKGROUND: ${m.branch || "US military"}${m.mosCodes ? `, job code(s): ${m.mosCodes}` : ""}. Translate these codes into their civilian equivalents and weight recommendations toward roles those codes feed into.`);
  }
  if (m.evalText) {
    parts.push(`PERFORMANCE REVIEW EXCERPTS (the service member's own yearly evaluation — user-provided facts, on par with the resume as source material. Mine it for accomplishments, scope of responsibility, and ratings language; translate jargon):\n${m.evalText.slice(0, 4000)}`);
  }
  return parts.length ? `\n\n${parts.join("\n\n")}` : "";
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
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({
      source: "fallback",
      data: runFallback(body),
      note: `AI key is set, but the live AI call failed (${msg}). Showing built-in results instead.`,
    });
  }
}

function runFallback(b: AiRequest) {
  const { task, mode, resume, jobText = "", targetTitle = "", company = "", tone, goals, answers } = b;
  if (task === "rewrite") {
    // Prefer the resume's real experience bullets over raw lines — raw text
    // includes summary fragments that aren't bullets at all.
    const structured = resume.experience.flatMap((e) => e.bullets).filter((x) => x.trim().length > 10);
    return rewriteBullets(structured.length ? structured.join("\n") : resume.rawText, mode);
  }
  if (task === "cover-letter") return generateCoverLetter(resume, jobText, targetTitle, company, (tone ?? "professional") as "professional" | "confident" | "warm");
  if (task === "roadmap") {
    const current = resume.experience[0]?.title || "";
    const gs = (goals ?? []) as { years: number; text: string; salary: number }[];
    const fallbackGoals = gs.length ? gs : [{ years: 2, text: "", salary: 0 }, { years: 5, text: "", salary: 0 }, { years: 10, text: "", salary: 0 }];
    return buildRoadmap(current, resume.rawText, resume.skills, fallbackGoals);
  }
  if (task === "discover") {
    const { scores, code, top } = scoreQuiz(answers ?? []);
    let matches = matchJobs(scores, resume.rawText, resume.skills, 10);
    // Veteran MOS translation seeds the list: direct civilian equivalents first.
    const translations = b.military?.mosCodes ? mosTranslations(b.military.mosCodes) : [];
    if (translations.length) {
      const seeded: JobMatch[] = [];
      const seen = new Set(matches.map((m) => m.role.title.toLowerCase()));
      let fit = 93;
      for (const t of translations) {
        for (const title of t.roles) {
          const role = ROLES.find((r) => r.title.toLowerCase() === title.toLowerCase());
          if (!role || seen.has(role.title.toLowerCase())) continue;
          seen.add(role.title.toLowerCase());
          const matchedSkills = role.skills.filter((s) => resume.skills.some((rs) => rs.toLowerCase() === s.toLowerCase()));
          seeded.push({
            role,
            fit: fit--,
            why: `Direct civilian translation of your ${t.code} (${t.label})${b.military?.branch ? `, ${b.military.branch}` : ""}.`,
            matchedSkills,
            missingSkills: role.skills.filter((s) => !matchedSkills.includes(s)),
          });
        }
      }
      matches = [...seeded, ...matches].slice(0, 10);
    }
    return { scores, code, top, matches };
  }
  return generateLinkedIn(resume, jobText, targetTitle, b.linkedinText ?? "", b.feedback ?? "");
}

async function runAi(b: AiRequest) {
  const { task, mode, resume, jobText = "", targetTitle = "", company = "", tone = "professional", goals, answers } = b;
  const resumeContext = `RESUME:\n${resume.rawText.slice(0, 9000)}`;
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
      `You are a senior resume coach. Rewrite each resume bullet to be punchier and impact-first. ${HONESTY}${modeContext}\n\nIf a TARGET JOB POSTING is included, tailor word choice to the posting's keywords and lead with the experience it values most. If PERFORMANCE REVIEW EXCERPTS are included, they are the user's own documented accomplishments: when an eval fact (a figure, scope, or rating) strengthens a specific bullet, fold it into that bullet's rewrite and say so in its why; when an eval accomplishment has no matching resume bullet, add it to the closest bullet's gaps as a suggested addition, quoting the exact figure. ALSO return evalAdditions: up to 4 accomplishments that appear ONLY in the performance review (not in the resume), each with the eval's wording as original and a polished, resume-ready bullet as rewritten. evalAdditions must be an empty array when no performance review is provided.\n\nReturn JSON: {"rewrites":[{"original":string,"rewritten":string,"why":string,"gaps":[string],"translationNote":string|null}],"evalAdditions":[{"original":string,"rewritten":string,"why":string}]}`,
      `${resumeContext}${militaryContext(b)}${jobContext}\n\nRewrite every bullet point found in the resume.`
    );
    const parsed = extractJson(text) as { rewrites: Record<string, unknown>[]; evalAdditions?: Record<string, unknown>[] };
    if (!Array.isArray(parsed.rewrites)) throw new Error("Malformed AI rewrite response");
    const rewrites = parsed.rewrites.map((r) => ({
      original: String(r.original ?? ""),
      rewritten: String(r.rewritten ?? r.original ?? ""),
      why: String(r.why ?? ""),
      gaps: Array.isArray(r.gaps) ? r.gaps.map(String) : [],
      translationNote: r.translationNote ? String(r.translationNote) : undefined,
    }));
    // Eval-only accomplishments ride along as extra pairs — original is the
    // eval's own wording, rewritten is the resume-ready bullet.
    if (Array.isArray(parsed.evalAdditions)) {
      for (const a of parsed.evalAdditions.slice(0, 4)) {
        const original = String(a.original ?? "").trim();
        const rewritten = String(a.rewritten ?? "").trim();
        if (!original || !rewritten) continue;
        rewrites.push({
          original,
          rewritten,
          why: `New — mined from your performance review. ${String(a.why ?? "")}`.trim(),
          gaps: [],
          translationNote: undefined,
        });
      }
    }
    return rewrites;
  }

  if (task === "cover-letter") {
    const text = await callLLM(
      `You are a senior career coach writing a cover letter. Tone: ${tone}. ${HONESTY}\n\nReturn JSON: {"tone":string,"text":string}`,
      `${resumeContext}${militaryContext(b)}${jobContext}\n\nTarget title: ${targetTitle || "(not specified)"}\nCompany: ${company || "(not specified)"}\n\nWrite a concise cover letter (3-4 short paragraphs) tailored to the posting.`
    );
    return extractJson(text);
  }

  const text = await callLLM(
    `You are a LinkedIn profile coach. ${HONESTY}${modeContext}\n\nReturn JSON: {"headlines":[string,string,string],"about":string,"polishedBullets":[{"original":string,"polished":string}],"skillsGap":[string],"tip":string}`,
    `${resumeContext}${militaryContext(b)}${b.linkedinText ? `\n\nCURRENT LINKEDIN PROFILE:\n${b.linkedinText.slice(0, 4000)}` : ""}${jobContext}${b.feedback ? `\n\nUSER FEEDBACK ON PRIOR DRAFT — apply it: ${b.feedback.slice(0, 500)}` : ""}\n\nTarget title: ${targetTitle || "(not specified)"}\n\nProduce 3 headline options, a first-person About section (~120 words), polished experience bullets, skills missing vs the posting, and one actionable tip.`
  );
  const li = extractJson(text) as Record<string, unknown>;
  return {
    headlines: Array.isArray(li.headlines) && li.headlines.length ? li.headlines.map(String) : [""],
    about: String(li.about ?? ""),
    polishedBullets: Array.isArray(li.polishedBullets)
      ? (li.polishedBullets as Record<string, unknown>[]).map((p) => ({ original: String(p.original ?? ""), polished: String(p.polished ?? p.original ?? "") }))
      : [],
    skillsGap: Array.isArray(li.skillsGap) ? li.skillsGap.map(String) : [],
    tip: String(li.tip ?? ""),
  };
}

async function runAiRoadmap(b: AiRequest) {
  const { resume, goals } = b;
  const gs: RoadmapGoal[] = goals?.length ? goals : [{ years: 2, text: "", salary: 0 }, { years: 5, text: "", salary: 0 }, { years: 10, text: "", salary: 0 }];
  const goalLines = gs.map((g) => `${g.years} years: ${g.text || "(no goal set)"} (salary target: ${g.salary || "not set"})`).join("\n");
  const text = await callLLM(
    `You are a career strategist. Build a career roadmap for the user's custom checkpoints. ${HONESTY}\n\nSalary bands must be realistic US estimates — label every band as an estimate. For each recommended title, compare its band against the user's salary target and set salaryFlag: "hit" (target <= low end), "can-hit" (target within band), or "below" (target above band), with a one-line salaryNote. For each checkpoint list skillsToHave: every skill the recommended titles expect, each with have: true/false based on the resume. For each title include dayInLife: a one-sentence illustrative preview of what the job is like day to day.\n\nReturn JSON: {"nodes":[{"horizon":string,"years":number,"goalText":string,"titles":[{"title":string,"salaryLow":number,"salaryHigh":number,"salaryFlag":string,"salaryNote":string,"dayInLife":string}],"steppingStones":[string],"gaps":[string],"skillsToHave":[{"skill":string,"have":boolean}]}]}`,
    `RESUME:\n${resume.rawText.slice(0, 8000)}${militaryContext(b)}\n\nCurrent title: ${resume.experience[0]?.title || "(unknown)"}\n\nCHECKPOINTS:\n${goalLines}\n\nReturn one node per checkpoint plus a "Now" node (years: 0) first.`
  );
  const rawNodes = (extractJson(text) as { nodes: Record<string, unknown>[] }).nodes;
  if (!Array.isArray(rawNodes)) throw new Error("Malformed AI roadmap response");
  // Coerce every node into the full RoadmapNode shape the page renders —
  // a missing array from the model must never crash the screen.
  return rawNodes.map((n) => ({
    horizon: String(n.horizon ?? ""),
    years: Number(n.years) || 0,
    goalText: String(n.goalText ?? ""),
    titles: Array.isArray(n.titles)
      ? (n.titles as Record<string, unknown>[]).map((t) => ({
          title: String(t.title ?? ""),
          salaryLow: Number(t.salaryLow) || 0,
          salaryHigh: Number(t.salaryHigh) || 0,
          salaryFlag: (["hit", "can-hit", "below"].includes(String(t.salaryFlag)) ? String(t.salaryFlag) : "can-hit") as "hit" | "can-hit" | "below",
          salaryNote: String(t.salaryNote ?? ""),
          dayInLife: t.dayInLife ? String(t.dayInLife) : undefined,
        }))
      : [],
    steppingStones: Array.isArray(n.steppingStones) ? n.steppingStones.map(String) : [],
    gaps: Array.isArray(n.gaps) ? n.gaps.map(String) : [],
    skillsToHave: Array.isArray(n.skillsToHave)
      ? (n.skillsToHave as Record<string, unknown>[]).map((s) => ({ skill: String(s.skill ?? ""), have: !!s.have }))
      : [],
  }));
}

async function runAiDiscover(b: AiRequest) {
  const { resume, answers } = b;
  const text = await callLLM(
    `You are a career counselor using the Holland Code (RIASEC) framework. ${HONESTY}\n\nSalary bands must be realistic US estimates, labeled as estimates.\n\nReturn JSON: {"code":string,"scores":{"R":number,"I":number,"A":number,"S":number,"E":number,"C":number},"matches":[{"title":string,"fit":number,"why":string,"matchedSkills":[string],"missingSkills":[string],"salaryLow":number,"salaryHigh":number}]}`,
    `RESUME:\n${resume.rawText.slice(0, 8000)}${militaryContext(b)}\n\nRIASEC quiz answers (1=strongly disagree .. 5=strongly agree, 18 questions in R,I,A,S,E,C order, 3 each):\n${(answers ?? []).join(",")}\n\nScore the quiz, derive the 3-letter Holland code, and recommend the 10 best-fit job titles with fit scores (0-100), one-line why, skills the resume already shows vs. missing, and estimated salary bands. If military background is provided, lead with the civilian translations of the user's job code(s).`
  );
  const parsed = extractJson(text) as { code: string; scores: unknown; matches: Record<string, unknown>[] };
  // Normalize into the JobMatch shape the UI renders (role object + fit).
  const topLetters = (parsed.code || "").split("").filter((c) => "RIASEC".includes(c)) as Role["cluster"];
  const matches: JobMatch[] = (parsed.matches ?? []).map((m) => {
    const title = String(m.title ?? "Role");
    const known = ROLES.find((r) => r.title.toLowerCase() === title.toLowerCase());
    const matchedSkills = (m.matchedSkills as string[]) ?? [];
    const missingSkills = (m.missingSkills as string[]) ?? [];
    const role: Role = known ?? {
      title,
      cluster: topLetters.length ? topLetters : ["C"],
      salaryLow: Number(m.salaryLow) || 0,
      salaryHigh: Number(m.salaryHigh) || 0,
      skills: [...matchedSkills, ...missingSkills],
      next: [],
    };
    return { role, fit: Number(m.fit) || 0, why: String(m.why ?? ""), matchedSkills, missingSkills };
  });
  return { scores: parsed.scores, code: parsed.code, top: parsed.code.split(""), matches };
}
