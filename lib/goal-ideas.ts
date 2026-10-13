/**
 * Personalized goal ideas for the Roadmap form's quick-pick chips.
 *
 * The chips used to be the stock GOAL_EXAMPLES for the user's track —
 * identical for everyone, unlabeled, and easy to mistake for the user's
 * own data. Now the set is DERIVED from the user's actual resume and
 * military background, in priority order:
 *   (a) civilian roles from their MOS/rating/AFSC translation,
 *   (b) a progression step from their latest job title,
 *   (c) directions their listed skills cluster toward.
 * Every derived idea traces to something on the resume — no invented
 * employers, credentials, or history. When nothing can be derived
 * (empty/generic resume), the stock GOAL_EXAMPLES are returned and
 * flagged `personalized: false` so the UI labels them "Examples".
 *
 * Users can also edit the chip set (see components/goal-ideas.tsx);
 * a customized set persists per device under GOAL_IDEAS_STORAGE_KEY
 * and wins over the computed set until the user resets it.
 */
import { GOAL_EXAMPLES } from "./careers-core";
import { mosTranslations } from "./mos";
import type { ExperienceItem, MilitaryInfo, Mode, StructuredResume } from "./types";

export const GOAL_IDEAS_STORAGE_KEY = "hirecraft-goal-ideas-v1";
export const MAX_GOAL_IDEAS = 6;
const MIN_IDEAS_BEFORE_PADDING = 4;
const MAX_MOS_IDEAS = 3;
const MAX_SKILL_IDEAS = 2;

export interface GoalIdeasResult {
  ideas: string[];
  /** True when the lead ideas were derived from the user's own data. */
  personalized: boolean;
}

/* ------------------------------------------------------------------ */
/* Derivation                                                          */
/* ------------------------------------------------------------------ */

function articleFor(phrase: string): string {
  return /^[aeiou]/i.test(phrase.trim()) ? "an" : "a";
}

/** "Unit Supply Sergeant (92Y)" -> "Unit Supply Sergeant". */
function cleanTitle(title: string): string {
  return title.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
}

function latestExperience(resume: StructuredResume): ExperienceItem | undefined {
  if (!resume.experience.length) return undefined;
  return resume.experience.find((e) => /present|current/i.test(e.dates)) ?? resume.experience[0];
}

/** Normalized form used only for de-duplication (never displayed). */
function signature(idea: string): string {
  return idea
    .toLowerCase()
    .replace(/^(become|grow into|move into|advance to|step up to|land|work as|earn)\s+/, "")
    .replace(/^(a|an|the)\s+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isDupe(sig: string, sigs: string[]): boolean {
  if (!sig) return true;
  return sigs.some(
    (s) => s === sig || (sig.length >= 6 && s.length >= 6 && (s.includes(sig) || sig.includes(s)))
  );
}

const SKILL_CLUSTERS: { keywords: string[]; idea: string }[] = [
  {
    keywords: ["leadership", "mentor", "training", "supervis", "team lead"],
    idea: "Move into a management role leading a bigger team",
  },
  {
    keywords: [
      "inventory", "supply chain", "logistics", "warehouse", "shipping",
      "receiving", "procurement", "purchasing", "forklift", "distribution",
    ],
    idea: "Grow into a supply chain or operations leadership role",
  },
  {
    keywords: ["data", "excel", "sql", "analytics", "reporting", "tableau", "power bi"],
    idea: "Add a data angle — grow toward an analyst role",
  },
  {
    keywords: ["customer", "client", "sales", "retail", "hospitality"],
    idea: "Grow into a customer-facing leadership role",
  },
  {
    keywords: ["safety", "osha", "security", "compliance", "quality"],
    idea: "Grow into a safety, quality, or compliance leadership role",
  },
];

/**
 * Compute the goal-idea set for the roadmap form. Pure and synchronous —
 * no AI dependency, so it works with AI off or consent declined.
 */
export function computeGoalIdeas(
  resume: StructuredResume,
  military: MilitaryInfo,
  mode: Mode
): GoalIdeasResult {
  const stock = GOAL_EXAMPLES[mode] ?? GOAL_EXAMPLES.general;
  const ideas: string[] = [];
  const sigs: string[] = [];
  const add = (idea: string): boolean => {
    const sig = signature(idea);
    if (isDupe(sig, sigs)) return false;
    ideas.push(idea);
    sigs.push(sig);
    return true;
  };

  // (a) Military translation roles — the strongest personal signal.
  let mosCount = 0;
  for (const t of mosTranslations(military?.mosCodes ?? "")) {
    for (const role of t.roles) {
      if (mosCount >= MAX_MOS_IDEAS) break;
      if (add(`Become ${articleFor(role)} ${role}`)) mosCount++;
    }
    if (mosCount >= MAX_MOS_IDEAS) break;
  }

  // (b) Progression from the latest job title.
  const latest = latestExperience(resume);
  if (latest) {
    const title = cleanTitle(latest.title);
    const alreadySenior =
      /\b(senior|sr\.?|lead|principal|chief|head|manager|director|supervisor)\b/i.test(title);
    if (title && title.length <= 60 && !alreadySenior) {
      add(`Become a senior ${title}`);
    }
  }

  // (c) Skill-cluster adjacency — directions the listed skills support.
  const skills = (resume.skills ?? []).map((s) => s.toLowerCase());
  let skillCount = 0;
  for (const cluster of SKILL_CLUSTERS) {
    if (skillCount >= MAX_SKILL_IDEAS) break;
    const hit = skills.some((skill) =>
      cluster.keywords.some((kw) => skill.includes(kw) || (skill.length >= 4 && kw.includes(skill)))
    );
    if (hit && add(cluster.idea)) skillCount++;
  }

  const derived = ideas.slice(0, MAX_GOAL_IDEAS);
  if (derived.length === 0) {
    return { ideas: [...stock], personalized: false };
  }
  // Pad a thin derived set with stock examples so the row never looks
  // broken; the lead ideas stay the user's own and the set is capped.
  if (derived.length < MIN_IDEAS_BEFORE_PADDING) {
    for (const ex of stock) {
      if (derived.length >= MIN_IDEAS_BEFORE_PADDING) break;
      const sig = signature(ex);
      if (!isDupe(sig, sigs)) {
        derived.push(ex);
        sigs.push(sig);
      }
    }
  }
  return { ideas: derived.slice(0, MAX_GOAL_IDEAS), personalized: true };
}

/* ------------------------------------------------------------------ */
/* Customized-set persistence (per device)                             */
/* ------------------------------------------------------------------ */

/** Minimal storage shape so the helpers are testable outside the browser. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Load the user's customized idea set. Returns null when the user has
 * never customized (or the stored value is corrupt) — the caller then
 * falls back to the computed set. An explicitly saved empty set is a
 * valid customization and returns [].
 */
export function loadCustomGoalIdeas(storage: KeyValueStorage): string[] | null {
  try {
    const raw = storage.getItem(GOAL_IDEAS_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every((x) => typeof x === "string")) return null;
    return (parsed as string[]).map((s) => s.trim()).filter(Boolean).slice(0, 12);
  } catch {
    return null;
  }
}

export function saveCustomGoalIdeas(storage: KeyValueStorage, ideas: string[]): void {
  try {
    storage.setItem(GOAL_IDEAS_STORAGE_KEY, JSON.stringify(ideas));
  } catch {
    /* storage full/blocked — customization just won't persist */
  }
}

/** Reset: forget the customized set so the computed set returns. */
export function clearCustomGoalIdeas(storage: KeyValueStorage): void {
  try {
    storage.removeItem(GOAL_IDEAS_STORAGE_KEY);
  } catch {
    /* noop */
  }
}
