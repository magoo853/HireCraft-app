/**
 * Career intelligence engine: RIASEC quiz scoring, job matching, and roadmap
 * pathfinding. Fully client-runnable (fallback path); the /api/ai route can
 * upgrade generation to an LLM when AI_API_KEY is set.
 *
 * SALARY BANDS ARE ESTIMATES — rough US national ranges (2026) for illustration.
 * Always labeled as estimates in the UI. Verify against BLS OES or live postings
 * before making decisions.
 */

export type RiasecLetter = "R" | "I" | "A" | "S" | "E" | "C";

export const RIASEC_NAMES: Record<RiasecLetter, string> = {
  R: "Realistic",
  I: "Investigative",
  A: "Artistic",
  S: "Social",
  E: "Enterprising",
  C: "Conventional",
};

export const RIASEC_BLURBS: Record<RiasecLetter, string> = {
  R: "hands-on builder — you like practical work with tools, machines, and tangible results",
  I: "analytical thinker — you like digging into data and solving complex problems",
  A: "creative original — you like designing, expressing, and unconventional approaches",
  S: "people helper — you energize from teaching, coaching, and supporting others",
  E: "driven leader — you like persuading, deciding, and chasing ambitious goals",
  C: "organized operator — you like structure, accuracy, and well-run processes",
};

export interface QuizQuestion {
  text: string;
  dimension: RiasecLetter;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  { text: "I enjoy working with my hands to build or fix things.", dimension: "R" },
  { text: "I like operating tools, machines, or vehicles.", dimension: "R" },
  { text: "I prefer practical, hands-on problems over abstract ones.", dimension: "R" },
  { text: "I enjoy analyzing data to find patterns.", dimension: "I" },
  { text: "I like solving complex, abstract problems.", dimension: "I" },
  { text: "I'm curious about how things work and why.", dimension: "I" },
  { text: "I enjoy expressing myself creatively.", dimension: "A" },
  { text: "I like designing how things look or feel.", dimension: "A" },
  { text: "I prefer original, unconventional approaches.", dimension: "A" },
  { text: "I enjoy helping people work through personal problems.", dimension: "S" },
  { text: "I like teaching, coaching, or mentoring others.", dimension: "S" },
  { text: "I get energy from working closely with people.", dimension: "S" },
  { text: "I enjoy persuading people and leading projects.", dimension: "E" },
  { text: "I like taking charge and making decisions.", dimension: "E" },
  { text: "I'm motivated by competition and ambitious goals.", dimension: "E" },
  { text: "I enjoy organizing information and keeping detailed records.", dimension: "C" },
  { text: "I like clear rules and structured processes.", dimension: "C" },
  { text: "I take pride in accuracy and thoroughness.", dimension: "C" },
];

export const LIKERT_LABELS = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"];

export interface Role {
  title: string;
  cluster: RiasecLetter[]; // primary first
  salaryLow: number; // USD annual, ESTIMATE
  salaryHigh: number; // USD annual, ESTIMATE
  skills: string[];
  next: string[]; // natural next-step titles (must match other titles)
}

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
/* Quiz scoring                                                        */
/* ------------------------------------------------------------------ */

export type RiasecScores = Record<RiasecLetter, number>; // 0..100 normalized

export function scoreQuiz(answers: number[]): { scores: RiasecScores; code: string; top: RiasecLetter[] } {
  const sums: Record<RiasecLetter, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  const counts: Record<RiasecLetter, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  QUIZ_QUESTIONS.forEach((q, i) => {
    sums[q.dimension] += answers[i] ?? 3;
    counts[q.dimension] += 1;
  });
  const scores = {} as RiasecScores;
  (Object.keys(sums) as RiasecLetter[]).forEach((k) => {
    const avg = sums[k] / Math.max(1, counts[k]); // 1..5
    scores[k] = Math.round(((avg - 1) / 4) * 100);
  });
  const top = (Object.keys(scores) as RiasecLetter[]).sort((a, b) => scores[b] - scores[a]);
  return { scores, code: top.slice(0, 3).join(""), top };
}

/* ------------------------------------------------------------------ */
/* Job matching                                                        */
/* ------------------------------------------------------------------ */

export interface JobMatch {
  role: Role;
  fit: number; // 0..100
  why: string;
  matchedSkills: string[];
  missingSkills: string[];
}

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

/** Deep links to live job-board searches for a title. No API key needed —
 *  the boards do the searching; we just send the user to the right query. */
export function jobSearchLinks(title: string, location = "", veteranFirst = false): { name: string; url: string }[] {
  const q = encodeURIComponent(title);
  const l = encodeURIComponent(location.trim());
  const links = [
    { name: "Indeed", url: `https://www.indeed.com/jobs?q=${q}${l ? `&l=${l}` : ""}` },
    { name: "LinkedIn", url: `https://www.linkedin.com/jobs/search/?keywords=${q}${l ? `&location=${l}` : ""}` },
    { name: "Glassdoor", url: `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${q}${l ? `&locT=C&locKeyword=${l}` : ""}` },
    { name: "USAJobs", url: `https://www.usajobs.gov/Search/Results?k=${q}` },
  ];
  if (veteranFirst) {
    const usajobs = links.pop()!;
    return [usajobs, ...links];
  }
  return links;
}

/* ------------------------------------------------------------------ */
/* Military translation (MOS / rating / AFSC -> civilian roles)        */
/* ------------------------------------------------------------------ */

/**
 * Common military job codes and the civilian roles they translate to.
 * Role titles match ROLES entries so matches carry real salary bands.
 * A starting crosswalk — the AI path covers any code; this keeps the
 * built-in engine useful for the most common codes.
 */
export const MOS_CROSSWALK: Record<string, { label: string; equivalent: string; about: string; roles: string[] }> = {
  // Army
  "11B": { label: "Infantryman", equivalent: "Operations Team Lead", about: "You led and worked as part of a small team carrying out missions on the ground — often under pressure, where the stakes were real. Civilian employers call that front-line operations and team leadership.", roles: ["Operations Manager", "Warehouse Supervisor", "Logistics Coordinator", "Project Manager"] },
  "11C": { label: "Indirect Fire Infantryman", equivalent: "Operations Team Lead", about: "You operated mortar systems and calculated firing data so rounds landed exactly where they needed to. In civilian terms, that's precision work on a small operations team — planning, math, and coordination under pressure.", roles: ["Operations Manager", "Warehouse Supervisor", "Logistics Coordinator"] },
  "12B": { label: "Combat Engineer", equivalent: "Construction Project Specialist", about: "You built and cleared the way for the force — construction, demolitions, bridges, and route clearance. Civilian employers call that construction and field engineering work.", roles: ["Construction Manager", "Maintenance Technician", "Project Manager"] },
  "13F": { label: "Fire Support Specialist", equivalent: "Operations Coordinator", about: "You coordinated artillery, mortar, and air support — pulling together targeting data and making sure every element executed the same plan at the same time. That's operations coordination and data-driven decision support in civilian terms.", roles: ["Operations Manager", "Data Analyst", "Logistics Coordinator"] },
  "19D": { label: "Cavalry Scout", equivalent: "Field Operations Specialist", about: "You were the commander's eyes and ears — moving ahead of the unit to gather information and report back what you found. Civilian employers call that field operations, reconnaissance, and situational reporting.", roles: ["Operations Manager", "Logistics Coordinator", "Warehouse Supervisor"] },
  "25B": { label: "Information Technology Specialist", equivalent: "IT Support Specialist", about: "You installed, maintained, and troubleshot the Army's computers, networks, and communications systems. That's the same work civilian companies hire IT support specialists and systems administrators to do.", roles: ["IT Support Specialist", "Systems Administrator", "Network Administrator", "Cybersecurity Analyst"] },
  "25U": { label: "Signal Support Systems Specialist", equivalent: "IT Support Specialist", about: "You kept radios, networks, and communications gear working for your unit — and helped everyone else use them. In civilian terms, that's IT support and network field service.", roles: ["IT Support Specialist", "Network Administrator", "Help Desk Technician"] },
  "31B": { label: "Military Police", equivalent: "Security Manager / Law Enforcement Officer", about: "You enforced the law, ran patrols and investigations, and protected people and property. Civilian employers and police departments call that law enforcement and security operations.", roles: ["Security Manager", "Operations Manager", "Logistics Coordinator"] },
  "35F": { label: "Intelligence Analyst", equivalent: "Intelligence / Data Analyst", about: "You collected, analyzed, and briefed intelligence so commanders could decide what to do next. Civilian employers call that analysis — the same skill set behind data and business analyst roles.", roles: ["Data Analyst", "Business Analyst", "Cybersecurity Analyst"] },
  "42A": { label: "Human Resources Specialist", equivalent: "HR Specialist", about: "You handled soldiers' pay issues, evaluations, promotions, awards, and personnel records. That's human resources administration — companies hire HR specialists to do exactly that.", roles: ["HR Generalist", "HR Manager", "Executive Assistant"] },
  "68W": { label: "Combat Medic Specialist", equivalent: "EMT / Paramedic", about: "You were the first medical responder for your unit — treating injuries and illness in the field and in the clinic. Civilian emergency medicine calls that an EMT or paramedic; your training is the same foundation.", roles: ["EMT / Paramedic", "Medical Assistant", "Registered Nurse"] },
  "88M": { label: "Motor Transport Operator", equivalent: "Commercial Truck Driver (CDL)", about: "You drove trucks and transported cargo and personnel over every kind of road, in every condition. That's commercial driving — your experience maps directly to CDL truck driver roles.", roles: ["CDL Truck Driver", "Logistics Coordinator", "Warehouse Supervisor"] },
  "89B": { label: "Ammunition Specialist", equivalent: "Inventory & Logistics Specialist", about: "You received, stored, accounted for, and issued ammunition — a job where an inventory error is a serious problem. In civilian terms, that's high-accountability inventory control and warehouse logistics.", roles: ["Logistics Coordinator", "Warehouse Supervisor", "Supply Chain Analyst"] },
  "91B": { label: "Wheeled Vehicle Mechanic", equivalent: "Automotive / Diesel Mechanic", about: "You diagnosed and repaired the Army's trucks and wheeled vehicles. That's the same trade as a civilian automotive or diesel mechanic — reading diagnostics, turning wrenches, and keeping a fleet running.", roles: ["Maintenance Technician", "HVAC Technician", "Electrician"] },
  "92A": { label: "Automated Logistical Specialist", equivalent: "Supply Chain / Inventory Specialist", about: "You ran the warehouse systems that tracked, ordered, and issued supplies and repair parts. Civilian companies call that inventory management and supply chain operations.", roles: ["Supply Chain Analyst", "Logistics Coordinator", "Warehouse Supervisor"] },
  "92Y": { label: "Unit Supply Specialist", equivalent: "Supply / Logistics Specialist", about: "You were your unit's supply room — ordering, receiving, storing, and issuing everything from uniforms to equipment, with signed accountability for all of it. That's supply and logistics work in civilian terms.", roles: ["Supply Chain Analyst", "Logistics Coordinator", "Warehouse Supervisor"] },
  "94E": { label: "Radio/Communications Security Repairer", equivalent: "Electronics / Communications Technician", about: "You repaired radios and communications-security equipment down to the component level. Civilian employers call that electronics and communications repair technician work.", roles: ["IT Support Specialist", "Network Administrator", "Maintenance Technician"] },
  // Navy ratings
  "HM": { label: "Hospital Corpsman", equivalent: "Medical Assistant / EMT", about: "You provided medical care to sailors and Marines — in clinics, in hospitals, and in the field. That clinical experience maps directly to civilian roles like medical assistant and EMT.", roles: ["Medical Assistant", "EMT / Paramedic", "Registered Nurse"] },
  "IT": { label: "Information Systems Technician", equivalent: "IT / Network Technician", about: "You ran and defended the Navy's computer networks and communications systems, ashore and at sea. That's the same work as a civilian IT or network technician.", roles: ["IT Support Specialist", "Network Administrator", "Cybersecurity Analyst", "Systems Administrator"] },
  "MA": { label: "Master-at-Arms", equivalent: "Security / Law Enforcement Officer", about: "You were the Navy's police force — patrols, investigations, force protection, and access control. Civilian employers call that law enforcement and security work.", roles: ["Security Manager", "Operations Manager", "Logistics Coordinator"] },
  "LS": { label: "Logistics Specialist", equivalent: "Logistics / Supply Specialist", about: "You ordered, tracked, stored, and issued the supplies and parts that keep a ship or command running. In civilian terms, that's purchasing support and supply chain logistics.", roles: ["Logistics Coordinator", "Supply Chain Analyst", "Warehouse Supervisor"] },
  "OS": { label: "Operations Specialist", equivalent: "Operations Center Specialist", about: "You tracked ships and aircraft on radar and kept the command's picture of what was happening up to date. That's operations-center work — monitoring, plotting, and reporting in real time.", roles: ["Operations Manager", "Data Analyst", "Logistics Coordinator"] },
  "ET": { label: "Electronics Technician", equivalent: "Electronics Technician", about: "You maintained and repaired the Navy's communications, radar, and navigation electronics. Civilian employers hire electronics technicians to do the same work on similar systems.", roles: ["Maintenance Technician", "Electrician", "IT Support Specialist"] },
  "BM": { label: "Boatswain's Mate", equivalent: "Deck Operations Supervisor", about: "You ran the ship's deck operations — cargo handling, mooring, underway replenishment — and led the sailors doing the work. In civilian terms, that's hands-on operations supervision, including in the maritime industry.", roles: ["Operations Manager", "Warehouse Supervisor", "Logistics Coordinator"] },
  // Air Force AFSC
  "3P0X1": { label: "Security Forces", equivalent: "Security Manager / Law Enforcement Officer", about: "You were the Air Force's police and security force — law enforcement, base defense, and protection of people and high-value assets. Civilian employers call that law enforcement and security management.", roles: ["Security Manager", "Operations Manager"] },
  "3D1X2": { label: "Cyber Transport Systems", equivalent: "Network Administrator", about: "You built and maintained the networks that carry Air Force voice, video, and data. That's a civilian network administrator's job — infrastructure, hardware, and keeping systems online.", roles: ["Network Administrator", "Systems Administrator", "Cybersecurity Analyst"] },
  "1D7X1": { label: "Cyber Defense Operations", equivalent: "Cybersecurity Analyst", about: "You defended Air Force networks against cyber threats — monitoring, detecting, and responding to attacks. Civilian companies hire cybersecurity analysts to do exactly that.", roles: ["Cybersecurity Analyst", "Network Administrator", "Systems Administrator"] },
  "2T1X1": { label: "Ground Transportation", equivalent: "Commercial Driver / Transportation Specialist", about: "You operated government vehicles of every size — moving people and cargo safely and on schedule. In civilian terms, that's commercial driving and transportation operations.", roles: ["CDL Truck Driver", "Logistics Coordinator", "Warehouse Supervisor"] },
  "4N0X1": { label: "Aerospace Medical Service", equivalent: "Medical Assistant / EMT", about: "You provided medical support in Air Force clinics and hospitals — vitals, immunizations, and direct patient care. That maps directly to civilian medical assistant and EMT roles.", roles: ["Medical Assistant", "EMT / Paramedic"] },
  "3F5X1": { label: "Administration", equivalent: "Administrative / Executive Assistant", about: "You ran the paperwork engine of an Air Force unit — official documents, correspondence, and records. Civilian employers call that administrative and executive assistant work.", roles: ["Executive Assistant", "HR Generalist", "Operations Manager"] },
  "2S0X1": { label: "Materiel Management", equivalent: "Supply Chain / Inventory Specialist", about: "You managed the Air Force's supply chain — ordering, storing, and issuing parts and equipment with strict accountability. That's civilian inventory and supply chain work.", roles: ["Supply Chain Analyst", "Logistics Coordinator", "Warehouse Supervisor"] },
  "6C0X1": { label: "Contracting", equivalent: "Contracting Officer", about: "You bought goods and services for the Air Force — negotiating contracts, managing vendors, and making sure every dollar was spent by the book. Companies call that procurement.", roles: ["Supply Chain Analyst", "Project Manager", "Business Analyst", "Operations Manager"] },
  "6F0X1": { label: "Financial Management & Comptroller", equivalent: "Financial Analyst / Budget Analyst", about: "You managed Air Force budgets, payments, and financial reporting. Civilian employers call that budget and financial analysis — the same rules, spreadsheets, and accountability.", roles: ["Financial Analyst", "Accountant", "Business Analyst"] },
  "2T2X1": { label: "Air Transportation", equivalent: "Air Cargo / Logistics Specialist", about: "You moved passengers and cargo by air — loading aircraft, processing documentation, and running the aerial port. In civilian terms, that's air cargo and logistics operations.", roles: ["Logistics Coordinator", "Warehouse Supervisor", "Supply Chain Analyst"] },
  "3F0X1": { label: "Personnel", equivalent: "HR Specialist", about: "You handled the personnel side of the Air Force — assignments, evaluations, promotions, and records. That's human resources, and companies hire HR specialists to run the same programs.", roles: ["HR Generalist", "HR Manager", "Executive Assistant"] },
  "3E6X1": { label: "Operations Management", equivalent: "Operations Manager", about: "You planned and coordinated the work of a civil engineer squadron — tracking projects, work orders, and resources. That's civilian operations and project coordination.", roles: ["Operations Manager", "Project Manager"] },
  // Marines
  "0311": { label: "Rifleman", equivalent: "Operations Team Lead", about: "You were the backbone of a Marine rifle squad — carrying out missions as part of a small team in demanding conditions. Civilian employers call that front-line operations and team leadership.", roles: ["Operations Manager", "Logistics Coordinator", "Warehouse Supervisor"] },
  "0651": { label: "Cyber Network Operator", equivalent: "Network / IT Support Specialist", about: "You installed, operated, and defended Marine Corps computer networks. That's the same work civilian companies hire network and IT support specialists to do.", roles: ["IT Support Specialist", "Network Administrator", "Systems Administrator"] },
  "0671": { label: "Data Systems Administrator", equivalent: "Systems Administrator", about: "You administered the servers, accounts, and data systems the Marine Corps runs on. In civilian terms, that's a systems administrator role.", roles: ["Systems Administrator", "IT Support Specialist", "Network Administrator"] },
  "3531": { label: "Motor Vehicle Operator", equivalent: "Commercial Truck Driver (CDL)", about: "You drove tactical vehicles to move Marines, equipment, and supplies wherever they were needed. That's commercial driving experience that maps to CDL roles.", roles: ["CDL Truck Driver", "Logistics Coordinator"] },
  "0431": { label: "Logistics/Embarkation Specialist", equivalent: "Logistics Coordinator", about: "You planned and executed the movement of Marines and gear — by air, land, and sea, down to the load plan. Civilian employers call that logistics coordination.", roles: ["Logistics Coordinator", "Supply Chain Analyst", "Operations Manager"] },
};

/** Parse a free-text MOS entry ("11B, 25B · Army") into known translations. */
export function mosTranslations(mosCodes: string): { code: string; label: string; equivalent: string; about: string; roles: string[] }[] {
  if (!mosCodes.trim()) return [];
  const tokens = mosCodes.toUpperCase().split(/[,;·•\n]+/).map((t) => t.trim()).filter(Boolean);
  const out: { code: string; label: string; equivalent: string; about: string; roles: string[] }[] = [];
  const seen = new Set<string>();
  for (const tok of tokens) {
    const word = (tok.split(/\s+/)[0] ?? "").replace(/[^A-Z0-9X]/g, "");
    const hit = MOS_CROSSWALK[word];
    if (hit && !seen.has(word)) {
      seen.add(word);
      out.push({ code: word, label: hit.label, equivalent: hit.equivalent, about: hit.about, roles: hit.roles });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Roadmap                                                             */
/* ------------------------------------------------------------------ */

export interface HorizonGoal {
  text: string;
  salary: number; // annual USD target, 0 = not set
}

/** A user-defined checkpoint: N years out, with a goal and salary target. */
export interface RoadmapGoal {
  years: number;
  text: string;
  salary: number; // annual USD target, 0 = not set
}

export interface RoadmapNode {
  horizon: string; // "Now" | "2 years" | "5 years" | custom e.g. "3 years"
  years: number; // 0 = now
  titles: {
    title: string;
    salaryLow: number;
    salaryHigh: number;
    salaryFlag: "hit" | "can-hit" | "below";
    salaryNote: string;
    dayInLife?: string; // illustrative preview of the role, derived from its skill profile
  }[];
  steppingStones: string[];
  gaps: string[];
  goalText: string;
  /** Every skill the checkpoint's target roles expect, marked against the user's resume. */
  skillsToHave: { skill: string; have: boolean }[];
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

/** Format a salary number as $120K. */
export function fmtSalary(n: number): string {
  if (!n || n <= 0) return "";
  return n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`;
}

/** Suggested goal examples per mode (chips on the roadmap form). */
export const GOAL_EXAMPLES: Record<string, string[]> = {
  veteran: [
    "Operations manager at a logistics company",
    "IT project manager or cybersecurity analyst",
    "Federal service / law enforcement career",
    "Start my own business",
  ],
  general: [
    "Senior or lead role in my field",
    "Move into management",
    "Switch into tech",
    "Six-figure remote role",
  ],
  new: [
    "Land my first full-time job",
    "Become a certified electrician",
    "Finish my degree while working",
    "Get promoted to supervisor",
  ],
};
