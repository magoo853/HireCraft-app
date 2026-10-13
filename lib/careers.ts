/**
 * Career intelligence engine: job matching and roadmap pathfinding over
 * the ROLES ladder. Fully client-runnable (fallback path); the /api/ai
 * route can upgrade generation to an LLM when AI_API_KEY is set.
 *
 * SALARY BANDS ARE ESTIMATES — rough US national ranges (2026) for illustration.
 * Always labeled as estimates in the UI. Verify against BLS OES or live postings
 * before making decisions.
 *
 * The light pieces live in sibling modules so pages don't pay for the
 * whole engine in First Load JS: quiz data/scoring in ./quiz, MOS
 * translation in ./mos, shared types/helpers in ./careers-core. All of
 * them are re-exported here so existing importers (notably /api/ai)
 * keep working unchanged.
 */
import { JobMatch, Role, RoadmapGoal, RoadmapNode } from "./careers-core";
import { RIASEC_NAMES, RiasecScores } from "./quiz";

export * from "./careers-core";
export * from "./mos";
export * from "./quiz";
export const ROLES: Role[] = [
  // ---- Tech (I/C) ----
  { title: "Help Desk Technician", cluster: ["C", "I", "S"], salaryLow: 45000, salaryHigh: 65000, skills: ["troubleshooting", "customer service", "Windows", "ticketing systems", "networking basics"], next: ["IT Support Specialist", "Network Administrator"] },
  { title: "IT Support Specialist", cluster: ["C", "I", "S"], salaryLow: 55000, salaryHigh: 80000, skills: ["troubleshooting", "Active Directory", "networking", "customer service", "hardware support"], next: ["Systems Administrator", "Network Administrator", "Cybersecurity Analyst"] },
  { title: "Systems Administrator", cluster: ["I", "C", "R"], salaryLow: 75000, salaryHigh: 105000, skills: ["Linux", "Windows Server", "networking", "scripting", "virtualization"], next: ["Cloud Engineer", "DevOps Engineer", "IT Director"] },
  { title: "Network Administrator", cluster: ["I", "C", "R"], salaryLow: 70000, salaryHigh: 100000, skills: ["networking", "Cisco", "firewalls", "troubleshooting", "VPN"], next: ["Network Engineer", "Cybersecurity Analyst", "Cloud Engineer"] },
  { title: "Cybersecurity Analyst", cluster: ["I", "C", "R"], salaryLow: 85000, salaryHigh: 130000, skills: ["security monitoring", "SIEM", "incident response", "networking", "risk assessment"], next: ["Security Engineer", "Security Manager"] },
  { title: "Security Engineer", cluster: ["I", "R", "C"], salaryLow: 105000, salaryHigh: 150000, skills: ["penetration testing", "cloud security", "scripting", "incident response", "zero trust"], next: ["Security Architect", "Security Manager"] },
  { title: "Cloud Engineer", cluster: ["I", "R", "C"], salaryLow: 100000, salaryHigh: 150000, skills: ["AWS", "Terraform", "Linux", "networking", "CI/CD"], next: ["Cloud Architect", "DevOps Engineer"] },
  { title: "DevOps Engineer", cluster: ["I", "C", "R"], salaryLow: 105000, salaryHigh: 155000, skills: ["CI/CD", "Docker", "Kubernetes", "AWS", "scripting"], next: ["Platform Engineer", "Engineering Manager"] },
  { title: "Software Developer", cluster: ["I", "A", "C"], salaryLow: 85000, salaryHigh: 140000, skills: ["programming", "APIs", "databases", "testing", "Git"], next: ["Senior Software Developer", "Engineering Manager"] },
  { title: "Senior Software Developer", cluster: ["I", "A", "E"], salaryLow: 120000, salaryHigh: 175000, skills: ["system design", "mentoring", "APIs", "databases", "code review"], next: ["Staff Engineer", "Engineering Manager"] },
  { title: "QA Analyst", cluster: ["C", "I"], salaryLow: 65000, salaryHigh: 95000, skills: ["test planning", "automation", "bug tracking", "SQL", "attention to detail"], next: ["QA Engineer", "Business Analyst"] },
  { title: "Data Analyst", cluster: ["I", "C"], salaryLow: 70000, salaryHigh: 105000, skills: ["SQL", "Excel", "Tableau", "statistics", "data cleaning"], next: ["Data Scientist", "Analytics Manager", "Business Analyst"] },
  { title: "Data Scientist", cluster: ["I", "C"], salaryLow: 105000, salaryHigh: 160000, skills: ["Python", "machine learning", "statistics", "SQL", "data visualization"], next: ["Senior Data Scientist", "ML Engineer"] },
  { title: "IT Project Manager", cluster: ["E", "C", "S"], salaryLow: 90000, salaryHigh: 135000, skills: ["Agile", "stakeholder management", "risk management", "Jira", "budgeting"], next: ["Program Manager", "IT Director"] },
  // ---- Business (E/C/S) ----
  { title: "Sales Representative", cluster: ["E", "S"], salaryLow: 55000, salaryHigh: 110000, skills: ["prospecting", "negotiation", "CRM", "communication", "resilience"], next: ["Account Executive", "Sales Manager"] },
  { title: "Account Executive", cluster: ["E", "S"], salaryLow: 75000, salaryHigh: 140000, skills: ["negotiation", "pipeline management", "Salesforce", "discovery", "closing"], next: ["Senior Account Executive", "Sales Manager"] },
  { title: "Marketing Coordinator", cluster: ["A", "E", "C"], salaryLow: 50000, salaryHigh: 70000, skills: ["social media", "email marketing", "analytics", "copywriting", "events"], next: ["Marketing Manager", "Content Strategist"] },
  { title: "Marketing Manager", cluster: ["E", "A"], salaryLow: 80000, salaryHigh: 125000, skills: ["strategy", "budgeting", "analytics", "team leadership", "branding"], next: ["Director of Marketing", "Product Marketing Manager"] },
  { title: "HR Generalist", cluster: ["S", "C", "E"], salaryLow: 60000, salaryHigh: 85000, skills: ["recruiting", "onboarding", "employee relations", "compliance", "HRIS"], next: ["HR Manager", "Talent Acquisition Manager"] },
  { title: "HR Manager", cluster: ["S", "E"], salaryLow: 85000, salaryHigh: 125000, skills: ["team leadership", "employment law", "performance management", "compensation", "strategy"], next: ["Director of HR", "VP of People"] },
  { title: "Financial Analyst", cluster: ["C", "I"], salaryLow: 75000, salaryHigh: 110000, skills: ["Excel", "financial modeling", "forecasting", "SQL", "reporting"], next: ["Senior Financial Analyst", "Finance Manager"] },
  { title: "Accountant", cluster: ["C", "I"], salaryLow: 65000, salaryHigh: 95000, skills: ["GAAP", "QuickBooks", "reconciliation", "tax", "auditing"], next: ["Senior Accountant", "Controller"] },
  { title: "Business Analyst", cluster: ["I", "C", "S"], salaryLow: 80000, salaryHigh: 115000, skills: ["requirements gathering", "SQL", "process mapping", "stakeholder management", "documentation"], next: ["Senior Business Analyst", "Product Manager"] },
  { title: "Project Manager", cluster: ["E", "C", "S"], salaryLow: 85000, salaryHigh: 125000, skills: ["scheduling", "risk management", "stakeholder management", "Agile", "budgeting"], next: ["Program Manager", "Operations Manager"] },
  { title: "Operations Manager", cluster: ["E", "C"], salaryLow: 80000, salaryHigh: 120000, skills: ["process improvement", "team leadership", "budgeting", "KPIs", "vendor management"], next: ["Director of Operations", "Plant Manager"] },  { title: "Executive Assistant", cluster: ["C", "S"], salaryLow: 55000, salaryHigh: 85000, skills: ["calendar management", "travel coordination", "communication", "discretion", "Microsoft Office"], next: ["Chief of Staff", "Office Manager"] },
  { title: "Customer Success Manager", cluster: ["S", "E"], salaryLow: 70000, salaryHigh: 110000, skills: ["relationship management", "onboarding", "retention", "SaaS", "communication"], next: ["Senior CSM", "Customer Success Director"] },
  // ---- Trades & logistics (R/C) ----
  { title: "Electrician", cluster: ["R", "C"], salaryLow: 55000, salaryHigh: 85000, skills: ["wiring", "blueprint reading", "safety compliance", "troubleshooting", "NEC code"], next: ["Master Electrician", "Electrical Foreman"] },
  { title: "HVAC Technician", cluster: ["R", "I"], salaryLow: 50000, salaryHigh: 78000, skills: ["refrigeration", "electrical", "diagnostics", "customer service", "EPA certification"], next: ["HVAC Supervisor", "Facilities Manager"] },
  { title: "Welder", cluster: ["R"], salaryLow: 45000, salaryHigh: 72000, skills: ["MIG/TIG welding", "blueprint reading", "safety", "fabrication", "quality control"], next: ["Welding Supervisor", "Pipefitter"] },
  { title: "CDL Truck Driver", cluster: ["R", "C"], salaryLow: 55000, salaryHigh: 85000, skills: ["CDL-A", "route planning", "safety compliance", "ELD", "vehicle inspection"], next: ["Owner-Operator", "Dispatch Manager"] },
  { title: "Construction Manager", cluster: ["E", "R", "C"], salaryLow: 90000, salaryHigh: 140000, skills: ["project scheduling", "budgeting", "safety management", "subcontractor management", "blueprint reading"], next: ["Senior Project Manager", "Director of Construction"] },
  { title: "Maintenance Technician", cluster: ["R", "C"], salaryLow: 45000, salaryHigh: 68000, skills: ["preventive maintenance", "troubleshooting", "HVAC basics", "electrical basics", "work orders"], next: ["Maintenance Supervisor", "Facilities Manager"] },
  { title: "Logistics Coordinator", cluster: ["C", "R", "E"], salaryLow: 52000, salaryHigh: 75000, skills: ["shipment tracking", "vendor coordination", "Excel", "problem solving", "customs basics"], next: ["Logistics Manager", "Supply Chain Analyst"] },
  { title: "Supply Chain Analyst", cluster: ["I", "C"], salaryLow: 70000, salaryHigh: 100000, skills: ["data analysis", "forecasting", "Excel", "ERP systems", "supplier management"], next: ["Supply Chain Manager", "Procurement Manager"] },
  { title: "Warehouse Supervisor", cluster: ["E", "R", "C"], salaryLow: 55000, salaryHigh: 80000, skills: ["team leadership", "inventory management", "safety compliance", "WMS", "scheduling"], next: ["Warehouse Manager", "Operations Manager"] },
  // ---- Healthcare (S/I) ----
  { title: "Registered Nurse", cluster: ["S", "I", "R"], salaryLow: 75000, salaryHigh: 115000, skills: ["patient care", "clinical assessment", "EMR", "medication administration", "teamwork"], next: ["Nurse Manager", "Nurse Practitioner"] },
  { title: "Medical Assistant", cluster: ["S", "C"], salaryLow: 38000, salaryHigh: 52000, skills: ["vital signs", "phlebotomy", "EHR", "patient intake", "scheduling"], next: ["Lead Medical Assistant", "Registered Nurse"] },
  { title: "EMT / Paramedic", cluster: ["S", "R", "I"], salaryLow: 40000, salaryHigh: 62000, skills: ["emergency care", "patient assessment", "CPR", "composure", "documentation"], next: ["Paramedic Supervisor", "Firefighter"] },
  // ---- Creative (A) ----
  { title: "Graphic Designer", cluster: ["A", "C"], salaryLow: 52000, salaryHigh: 80000, skills: ["Adobe Creative Suite", "typography", "branding", "layout", "client feedback"], next: ["Senior Designer", "Art Director"] },
  { title: "UX Designer", cluster: ["A", "I", "S"], salaryLow: 80000, salaryHigh: 125000, skills: ["user research", "wireframing", "Figma", "prototyping", "usability testing"], next: ["Senior UX Designer", "Product Designer"] },
  { title: "Content Writer", cluster: ["A", "I"], salaryLow: 50000, salaryHigh: 80000, skills: ["copywriting", "SEO", "research", "editing", "storytelling"], next: ["Content Strategist", "Marketing Manager"] },
  // ---- Senior / leadership rungs ----
  { title: "Director of Operations", cluster: ["E", "C"], salaryLow: 120000, salaryHigh: 175000, skills: ["operations strategy", "P&L management", "team leadership", "process improvement", "budgeting"], next: ["VP of Operations"] },
  { title: "VP of Operations", cluster: ["E"], salaryLow: 160000, salaryHigh: 230000, skills: ["organizational leadership", "P&L ownership", "strategic planning", "executive communication", "change management"], next: ["COO"] },
  { title: "IT Director", cluster: ["E", "I"], salaryLow: 130000, salaryHigh: 185000, skills: ["technology strategy", "team leadership", "budgeting", "vendor management", "risk management"], next: ["CIO", "VP of Engineering"] },
  { title: "Engineering Manager", cluster: ["E", "I"], salaryLow: 140000, salaryHigh: 195000, skills: ["team leadership", "system design", "hiring", "roadmapping", "mentoring"], next: ["Director of Engineering", "VP of Engineering"] },
  { title: "Security Manager", cluster: ["E", "I", "C"], salaryLow: 125000, salaryHigh: 175000, skills: ["security strategy", "team leadership", "incident response", "risk assessment", "compliance"], next: ["CISO", "Director of Security"] },
];
const roleByTitle = new Map(ROLES.map((r) => [r.title.toLowerCase(), r]));
export function findRole(title: string): Role | undefined {
  const t = title.toLowerCase().trim();
  if (roleByTitle.has(t)) return roleByTitle.get(t);
  // fuzzy: title contains or is contained by a known title
  return ROLES.find((r) => r.title.toLowerCase().includes(t) || t.includes(r.title.toLowerCase()));
}
/** Common military titles mapped to their closest civilian ladder rungs. */
const MILITARY_TITLE_MAP: Record<string, string> = {
  "squad leader": "Warehouse Supervisor",
  "team leader": "Warehouse Supervisor",
  "section chief": "Warehouse Supervisor",
  "platoon sergeant": "Operations Manager",
  "platoon leader": "Operations Manager",
  "ncoic": "Project Manager",
  "oic": "Project Manager",
  "first sergeant": "HR Manager",
  "drill sergeant": "HR Manager",
};
export function findRoleWithMilitary(title: string): Role | undefined {
  const direct = findRole(title);
  if (direct) return direct;
  const mapped = MILITARY_TITLE_MAP[title.toLowerCase().trim()];
  return mapped ? findRole(mapped) : undefined;
}
/* ------------------------------------------------------------------ */
/* Job matching                                                        */
/* ------------------------------------------------------------------ */
function resumeSkillSet(resumeText: string, skills: string[]): Set<string> {
  const set = new Set<string>();
  const lower = resumeText.toLowerCase();
  for (const s of skills) set.add(s.toLowerCase());
  // also harvest known role skills mentioned in the resume text
  for (const r of ROLES) {
    for (const s of r.skills) {
      if (lower.includes(s.toLowerCase())) set.add(s.toLowerCase());
    }
  }
  return set;
}
export function matchJobs(
  scores: RiasecScores,
  resumeText: string,
  resumeSkills: string[],
  limit = 10
): JobMatch[] {
  const have = resumeSkillSet(resumeText, resumeSkills);
  const results: JobMatch[] = ROLES.map((role) => {
    // Cluster fit: average of user's scores on the role's letters (primary weighted 2x)
    const weights = [2, 1, 1];
    let wsum = 0;
    let wtotal = 0;
    role.cluster.forEach((letter, i) => {
      const w = weights[i] ?? 1;
      wsum += scores[letter] * w;
      wtotal += w;
    });
    const clusterFit = wsum / wtotal; // 0..100

    const matched = role.skills.filter((s) => have.has(s.toLowerCase()));
    const skillFit = role.skills.length ? (matched.length / role.skills.length) * 100 : 0;

    const fit = Math.round(clusterFit * 0.6 + skillFit * 0.4);
    const missing = role.skills.filter((s) => !have.has(s.toLowerCase()));
    const topLetter = role.cluster[0];
    const why =
      matched.length > 0
        ? `Your ${RIASEC_NAMES[topLetter].toLowerCase()} work style fits, and your resume already shows ${matched.length} of ${role.skills.length} key skills (${matched.slice(0, 3).join(", ")}).`
        : `Strong ${RIASEC_NAMES[topLetter].toLowerCase()} fit — a natural lane for how you like to work. Build the skills below to break in.`;
    return { role, fit, why, matchedSkills: matched, missingSkills: missing };
  });
  return results.sort((a, b) => b.fit - a.fit).slice(0, limit);
}
function salaryFlag(low: number, high: number, target: number): RoadmapNode["titles"][number] {
  const fmt = (n: number) => `$${Math.round(n / 1000)}K`;
  if (!target || target <= 0) {
    return { title: "", salaryLow: low, salaryHigh: high, salaryFlag: "can-hit", salaryNote: `Est. ${fmt(low)}–${fmt(high)}/yr` };
  }
  if (target <= low) {
    return { title: "", salaryLow: low, salaryHigh: high, salaryFlag: "hit", salaryNote: `✓ Hits your ${fmt(target)} target (est. ${fmt(low)}–${fmt(high)})` };
  }
  if (target <= high) {
    return { title: "", salaryLow: low, salaryHigh: high, salaryFlag: "can-hit", salaryNote: `✓ Can hit your ${fmt(target)} target at the upper band (est. ${fmt(low)}–${fmt(high)})` };
  }
  return { title: "", salaryLow: low, salaryHigh: high, salaryFlag: "below", salaryNote: `⚠ Below your ${fmt(target)} target (est. ${fmt(low)}–${fmt(high)})` };
}
/** Find roles matching free-text goal (title/skill keyword overlap). */
export function rolesForGoal(goalText: string, limit = 2): Role[] {
  const stop = new Set(["the", "and", "for", "with", "from", "into", "that", "this", "have", "want", "become", "going"]);
  const words = goalText
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !stop.has(w));
  if (!words.length) return [];
  const scored = ROLES.map((role) => {
    const titleWords = role.title.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/);
    const skillWords = role.skills.join(" ").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/);
    let score = 0;
    for (const w of words) {
      if (titleWords.includes(w)) score += 3;
      else if (skillWords.includes(w)) score += 1;
    }
    // Bonus when the goal names the title outright ("VP of Operations")
    if (words.length > 0 && words.every((w) => titleWords.includes(w))) score += 5;
    return { role, score };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.role);
}
/** BFS path between roles via `next` edges (stepping stones). */
export function pathBetween(fromTitle: string, toTitle: string, maxDepth = 4): string[] {
  const from = findRole(fromTitle);
  const to = findRole(toTitle);
  if (!from || !to) return [];
  if (from.title === to.title) return [from.title];
  const queue: string[][] = [[from.title]];
  const seen = new Set([from.title.toLowerCase()]);
  while (queue.length) {
    const path = queue.shift()!;
    if (path.length > maxDepth + 1) continue;
    const last = findRole(path[path.length - 1]);
    if (!last) continue;
    for (const nxt of last.next) {
      const key = nxt.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const newPath = [...path, nxt];
      if (key === to.title.toLowerCase()) return newPath;
      queue.push(newPath);
    }
  }
  return [];
}
/** Illustrative "what this job looks like" preview, derived from the role's skill profile. */
export function dayInLife(role: Role): string {
  const s = role.skills;
  const head = s.slice(0, 3).join(", ");
  const tail = s.length > 3 ? `, plus ${s.slice(3, 5).join(" and ")}` : "";
  return `Day to day, expect your time to revolve around ${head}${tail}.`;
}
/** Best-guess ladder role for a resume whose title matches nothing in ROLES. */
export function inferRoleFromResume(currentTitle: string, resumeText: string, resumeSkills: string[]): Role | undefined {
  // Probe with titles + skills only — body text is too noisy (it name-drops
  // other fields). Require at least a title-word or skill-word connection.
  const probe = `${currentTitle} ${resumeSkills.join(" ")}`;
  const candidate = rolesForGoal(probe, 1)[0];
  if (!candidate) return undefined;
  const probeWords = new Set(probe.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean));
  const connected = candidate.title.toLowerCase().split(/\s+/).some((w) => probeWords.has(w))
    || candidate.skills.some((s) => s.toLowerCase().split(/\s+/).some((w) => probeWords.has(w)));
  return connected ? candidate : undefined;
}
/** Next rungs when a goal names no recognizable role: climb from where you are. */
function progressionFrom(prevTitle: string, resumeText: string, resumeSkills: string[], limit: number): Role[] {
  const cur = (prevTitle ? findRoleWithMilitary(prevTitle) : undefined) ?? inferRoleFromResume(prevTitle, resumeText, resumeSkills);
  if (!cur) {
    const ops = findRole("Operations Manager");
    return ops ? [ops] : [];
  }
  const nexts = cur.next.map((t) => findRole(t)).filter((r): r is Role => !!r);
  if (nexts.length) return nexts.slice(0, limit);
  const sibs = ROLES
    .filter((r) => r.cluster[0] === cur.cluster[0] && r.salaryHigh > cur.salaryHigh)
    .sort((a, b) => a.salaryHigh - b.salaryHigh);
  return (sibs.length ? sibs : [cur]).slice(0, limit);
}
export function buildRoadmap(
  currentTitle: string,
  resumeText: string,
  resumeSkills: string[],
  goals: RoadmapGoal[]
): RoadmapNode[] {
  const have = resumeSkillSet(resumeText, resumeSkills);
  const horizons = [...goals]
    .filter((g) => g.years > 0)
    .sort((a, b) => a.years - b.years);

  const matchedRole = currentTitle ? findRoleWithMilitary(currentTitle) : undefined;
  const currentRole = matchedRole ?? inferRoleFromResume(currentTitle, resumeText, resumeSkills);
  const nowSkills = currentRole
    ? currentRole.skills.map((s) => ({ skill: s, have: have.has(s.toLowerCase()) }))
    : [];

  const nodes: RoadmapNode[] = [
    {
      horizon: "Now",
      years: 0,
      titles: currentTitle
        ? [{ title: matchedRole?.title ?? currentTitle, salaryLow: 0, salaryHigh: 0, salaryFlag: "can-hit", salaryNote: "Your current lane", dayInLife: currentRole ? dayInLife(currentRole) : "" }]
        : [],
      steppingStones: [],
      gaps: [],
      goalText: currentTitle ? `Current: ${currentTitle}` : "Starting point",
      skillsToHave: nowSkills,
    },
  ];

  let prevTitle = currentTitle;
  // Resolve the current title onto the ladder (with military translation).
  const startRole = currentTitle ? findRoleWithMilitary(currentTitle) : undefined;
  if (startRole) prevTitle = startRole.title;
  for (const goal of horizons) {
    const key = `${goal.years} year${goal.years === 1 ? "" : "s"}`;
    let roles = rolesForGoal(goal.text, 2);
    if (!roles.length) roles = progressionFrom(prevTitle, resumeText, resumeSkills, 2);
    const titles = roles.map((r) => ({ ...salaryFlag(r.salaryLow, r.salaryHigh, goal.salary), title: r.title, dayInLife: dayInLife(r) }));

    // Stepping stones: path from previous title to the top target
    let stones: string[] = [];
    if (roles.length && prevTitle) {
      const path = pathBetween(prevTitle, roles[0].title);
      if (path.length > 2) {
        stones = path.slice(1, -1);
      } else if (path.length === 0) {
        const prevRole = findRole(prevTitle);
        const targetRole = roles[0];
        const isStepUp = !prevRole || targetRole.salaryHigh > prevRole.salaryHigh;
        if (isStepUp) {
          // No ladder link — suggest roles that commonly lead INTO the target
          // (reverse ladder), then same-cluster roles as a fallback.
          const preds = ROLES.filter((r) => r.next.includes(targetRole.title)).map((r) => r.title);
          if (preds.length) {
            stones = preds.slice(0, 3);
          } else {
            stones = ROLES.filter((r) => r.cluster[0] === targetRole.cluster[0] && r.title !== targetRole.title)
              .slice(0, 2)
              .map((r) => r.title);
          }
        }
        // Lateral or downward move: no stepping stones needed.
      }
    }

    // Gaps: skills needed by target roles that the resume doesn't show
    const needed = new Set<string>();
    for (const r of roles) for (const s of r.skills) needed.add(s.toLowerCase());
    const gaps = Array.from(needed).filter((s) => !have.has(s)).slice(0, 6);
    // Skills to have by this checkpoint: every skill the target roles expect,
    // checked against what the resume already shows.
    const skillsToHave = Array.from(needed)
      .slice(0, 10)
      .map((s) => {
        const canonical = roles.flatMap((r) => r.skills).find((x) => x.toLowerCase() === s) ?? s;
        return { skill: canonical, have: have.has(s) };
      });

    // Salary upgrade suggestion when the top pick is below target
    if (roles.length && goal.salary > 0 && roles[0].salaryHigh < goal.salary) {
      const upgrades = roles[0].next
        .map(findRole)
        .filter((r): r is Role => !!r && r.salaryHigh >= goal.salary)
        .map((r) => r.title);
      if (upgrades.length && !stones.includes(upgrades[0])) stones = [...stones, ...upgrades].slice(0, 4);
    }

    nodes.push({ horizon: key, years: goal.years, titles, steppingStones: stones, gaps, goalText: goal.text || "No goal set", skillsToHave });
    if (roles.length) prevTitle = roles[0].title;
  }
  return nodes;
}
