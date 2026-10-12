import {
  CoverLetterResult,
  Keyword,
  LinkedInResult,
  Mode,
  RewriteResult,
  ScoreResult,
  StructuredResume,
} from "./types";

/* ------------------------------------------------------------------ */
/* Shared language data                                                */
/* ------------------------------------------------------------------ */

const STOPWORDS = new Set(
  `a,an,the,and,or,but,if,then,else,when,at,by,for,with,about,into,through,during,before,after,above,below,to,from,up,down,in,out,on,off,over,under,again,further,once,here,there,when,where,why,how,all,any,both,each,few,more,most,other,some,such,no,nor,not,only,own,same,so,than,too,very,can,will,just,don,should,now,of,as,is,are,was,were,be,been,being,have,has,had,having,do,does,did,doing,would,could,ought,i,you,he,she,it,we,they,them,his,her,its,our,their,this,that,these,those,am,me,my,your,yours,ours,us,who,whom,which,what,whose,also,per,via,within,including,include,includes,among,between,across,using,use,used,based,related,etc,eg,ie,looking,seeking,join,team,role,position,candidate,ideal,you'll,you're,we're,that's,it's,don't,doesn't,won't,can't,responsibilities,requirements,qualifications,benefits,apply,today,full,time,part,year,years,day,daily,work,working,job,company,successful,success,strong,excellent,great,good,high,fast,paced,growing,growth,opportunity,dynamic,passionate,driven,self,starter,detail,oriented,results,proven,track,record,ability,skills,skill,experience,knowledge,understanding,familiarity,plus,bonus,preferred,required,requirements,must,should,able,willing,help,ensure,maintain,support,provide,create,develop,build,manage,lead,work,including,diverse,inclusive,equal,employer,offer,offers,offering,package,competitive,salary,pay,benefits,health,dental,vision,pto,401k`.split(
    ","
  )
);

// Multi-word skills get a weight boost — these are the terms recruiters filter on.
const SKILL_PHRASES = [
  "project management",
  "program management",
  "product management",
  "data analysis",
  "data science",
  "machine learning",
  "artificial intelligence",
  "customer service",
  "customer success",
  "technical support",
  "supply chain",
  "logistics management",
  "quality assurance",
  "business development",
  "account management",
  "digital marketing",
  "content marketing",
  "social media marketing",
  "search engine optimization",
  "email marketing",
  "financial analysis",
  "budget management",
  "risk management",
  "change management",
  "stakeholder management",
  "cross functional",
  "cross-functional",
  "continuous improvement",
  "process improvement",
  "lean six sigma",
  "six sigma",
  "agile methodology",
  "scrum master",
  "software development",
  "full stack",
  "front end",
  "back end",
  "cloud computing",
  "cyber security",
  "network administration",
  "database administration",
  "help desk",
  "microsoft excel",
  "microsoft office",
  "google workspace",
  "salesforce",
  "hubspot",
  "quickbooks",
  "tableau",
  "power bi",
  "sap",
  "oracle",
  "workday",
  "servicenow",
  "jira",
  "confluence",
  "slack",
  "problem solving",
  "critical thinking",
  "attention to detail",
  "time management",
  "verbal communication",
  "written communication",
  "public speaking",
  "negotiation skills",
  "team leadership",
  "mentoring and coaching",
  "performance management",
  "strategic planning",
  "vendor management",
  "contract negotiation",
  "regulatory compliance",
  "standard operating procedure",
  "inventory management",
  "warehouse operations",
  "fleet management",
  "preventive maintenance",
  "safety compliance",
  "osha",
  "cpr",
  "first aid",
  "secret clearance",
  "top secret",
  "security clearance",
  "grant writing",
  "curriculum development",
  "lesson planning",
  "classroom management",
  "patient care",
  "electronic health records",
  "medical terminology",
  "phlebotomy",
  "food safety",
  "servsafe",
];

const SINGLE_SKILLS = new Set(
  `python,javascript,typescript,java,c#,c++,go,rust,swift,kotlin,php,ruby,sql,html,css,react,angular,vue,node,express,django,flask,laravel,.net,aws,azure,gcp,docker,kubernetes,terraform,linux,git,excel,powerpoint,word,outlook,photoshop,illustrator,figma,canva,autocad,solidworks,matlab,r,sas,spss,nursing,emt,welding,cdl,forklift,electrician,plumbing,hvac,carpentry,masonry,bookkeeping,payroll,tax,auditing,paralegal,recruiting,onboarding,training,coaching,sales,cold,calling,upselling,marketing,branding,copywriting,editing,journalism,photography,videography,spanish,french,german,mandarin,bilingual,interpreting,translation,leadership,supervision,delegation,scheduling,dispatch,procurement,purchasing,forecasting,analytics,reporting,dashboards,kpi,roi,ebitda`.split(
    ","
  )
);

const STRONG_VERBS = new Set(
  `led,directed,managed,supervised,oversaw,coordinated,orchestrated,spearheaded,championed,drove,delivered,achieved,exceeded,accelerated,launched,built,developed,designed,engineered,created,established,founded,implemented,deployed,streamlined,optimized,improved,enhanced,transformed,modernized,automated,reduced,cut,decreased,minimized,eliminated,increased,grew,boosted,expanded,scaled,generated,secured,negotiated,closed,acquired,retained,mentored,coached,trained,advised,consulted,presented,published,analyzed,evaluated,audited,forecasted,resolved,executed,pioneered`.split(
    ","
  )
);

const WEAK_OPENERS: [RegExp, string][] = [
  [/^(responsible for|was responsible for)\s+/i, ""],
  [/^(tasked with|was tasked with)\s+/i, ""],
  [/^helped (with|to)?\s*/i, "Assisted "],
  [/^assisted (with|in)?\s*/i, "Supported "],
  [/^worked on\s+/i, "Contributed to "],
  [/^(in charge of|was in charge of)\s+/i, "Directed "],
  [/^duties included\s+/i, ""],
  [/^involved in\s+/i, "Participated in "],
  [/^did\s+/i, ""],
];

// "Responsible for managing a team" -> "Managed a team" (not "Led managing a team")
const GERUND_TO_VERB: [RegExp, string][] = [
  [/^managing\b/i, "Managed"],
  [/^handling\b/i, "Oversaw"],
  [/^overseeing\b/i, "Oversaw"],
  [/^supervising\b/i, "Supervised"],
  [/^leading\b/i, "Led"],
  [/^coordinating\b/i, "Coordinated"],
  [/^developing\b/i, "Developed"],
  [/^creating\b/i, "Created"],
  [/^maintaining\b/i, "Maintained"],
  [/^monitoring\b/i, "Monitored"],
  [/^training\b/i, "Trained"],
  [/^supporting\b/i, "Supported"],
  [/^performing\b/i, "Performed"],
  [/^conducting\b/i, "Conducted"],
  [/^ensuring\b/i, "Ensured"],
  [/^improving\b/i, "Improved"],
  [/^reducing\b/i, "Reduced"],
  [/^increasing\b/i, "Increased"],
  [/^auditing\b/i, "Audited"],
];

const VERB_BY_SIGNAL: [RegExp, string][] = [
  [/\b(team|staff|crew|employees|direct reports|platoon|squad)\b/i, "Led"],
  [/\b(built|created|developed|designed|wrote|code|program)\b/i, "Built"],
  [/\b(increas|improv|boost|grow|rais|gain)\w*\b/i, "Drove"],
  [/\b(reduc|cut|decreas|lower|sav|streamlin|optimiz)\w*\b/i, "Reduced"],
  [/\b(launch|roll ?out|implement|deploy|establish|start)\w*\b/i, "Launched"],
  [/\b(train|mentor|coach|teach|onboard)\w*\b/i, "Trained"],
  [/\b(sold|revenue|client|customer|account)\b/i, "Delivered"],
  [/\b(plan|schedule|coordinat|organiz)\w*\b/i, "Coordinated"],
  [/\b(test|inspect|audit|review|analyz)\w*\b/i, "Evaluated"],
  [/\b(fix|repair|maintain|troubleshoot|resolv)\w*\b/i, "Resolved"],
  [/\b(inventory|stock|warehouse)\b/i, "Audited"],
];

/* Military → civilian translation glossary (veteran mode) */
export const MILITARY_GLOSSARY: [RegExp, string][] = [
  [/\bSGT\b/g, "Sergeant (frontline supervisor)"],
  [/\bSSG\b/g, "Staff Sergeant (team supervisor)"],
  [/\bSFC\b/g, "Sergeant First Class (senior supervisor)"],
  [/\bMSG\b/g, "Master Sergeant (operations manager)"],
  [/\b1SG\b/g, "First Sergeant (senior team leader)"],
  [/\bSGM\b/g, "Sergeant Major (senior advisor)"],
  [/\bCSM\b/g, "Command Sergeant Major (senior enlisted advisor)"],
  [/\bLT\b/g, "Lieutenant (junior manager)"],
  [/\bCPT\b/g, "Captain (mid-level manager)"],
  [/\bplatoon\b/gi, "team of 30–40"],
  [/\bsquad\b/gi, "team of 8–12"],
  [/\bNCOIC\b/g, "project lead"],
  [/\bOIC\b/g, "project manager"],
  [/\bNCO\b/g, "frontline supervisor"],
  [/\bPCS\b/g, "relocation"],
  [/\bTDY\b/g, "temporary assignment"],
  [/\bAAR\b/g, "after-action review"],
  [/\bSOP\b/gi, "standard operating procedure"],
  [/\bbattle buddy\b/gi, "peer partner"],
  [/\bchain of command\b/gi, "leadership structure"],
  [/\bfield exercise\b/gi, "field operation"],
  [/\bcomms\b/gi, "communications"],
  [/\bPME\b/g, "professional development"],
  [/\bETS\b/g, "career transition"],
  [/\bMOS\b/g, "military specialty"],
];

export function translateMilitary(text: string): { text: string; notes: string[] } {
  const notes: string[] = [];
  let out = text;
  for (const [re, replacement] of MILITARY_GLOSSARY) {
    if (re.test(out)) {
      notes.push(`Translated military term → "${replacement}"`);
      out = out.replace(re, replacement);
    }
    // reset regex state for global regexes
    re.lastIndex = 0;
  }
  return { text: out, notes };
}

export function findMilitaryJargon(text: string): string[] {
  const found: string[] = [];
  for (const [re] of MILITARY_GLOSSARY) {
    const m = text.match(re);
    if (m) found.push(m[0]);
    re.lastIndex = 0;
  }
  return Array.from(new Set(found));
}

/* ------------------------------------------------------------------ */
/* Text utilities                                                      */
/* ------------------------------------------------------------------ */

export function extractBullets(text: string): string[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const marked = lines
    .filter((l) => /^[•\-\*▪◦‣·]/.test(l) || /^\d+[.)]\s/.test(l))
    .map((l) => l.replace(/^[•\-\*▪◦‣·]\s*/, "").replace(/^\d+[.)]\s*/, "").trim())
    .filter((l) => l.length > 8);
  if (marked.length >= 3) return marked;
  // Fallback: pasted/PDF-parsed resumes often lose bullet markers entirely.
  // Treat substantive body lines as bullets so the feature never returns empty.
  const body = lines.filter((l) => {
    if (l.length < 40 || l.length > 400) return false;
    if (/^[^a-z]*$/.test(l)) return false; // ALL-CAPS headers
    if (/:$/.test(l)) return false; // section headers
    if (/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(l)) return false;
    if (/^\(?\+?\d[\d\s().-]{7,}\d$/.test(l)) return false;
    if (/^(https?:\/\/|www\.|linkedin\.com)/i.test(l)) return false;
    if (/^(experience|education|skills|summary|objective|contact|work history|employment|certifications)/i.test(l)) return false;
    return true;
  });
  return body.slice(0, 12);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s+#.\-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

export function extractKeywords(jobText: string, resumeText: string, top = 12): Keyword[] {
  const lower = jobText.toLowerCase();
  const counts = new Map<string, number>();

  for (const phrase of SKILL_PHRASES) {
    const re = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    const matches = lower.match(re);
    if (matches) counts.set(phrase, (counts.get(phrase) ?? 0) + matches.length * 2);
  }

  const tokens = tokenize(jobText);
  for (const t of tokens) {
    const clean = t.replace(/[.]+$/, "");
    if (SINGLE_SKILLS.has(clean) || clean.length > 5) {
      counts.set(clean, (counts.get(clean) ?? 0) + (SINGLE_SKILLS.has(clean) ? 2 : 1));
    }
  }

  const resumeLower = resumeText.toLowerCase();
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([term, count]) => ({
      term,
      count,
      matched: resumeLower.includes(term.toLowerCase()),
    }));
}

export function readability(text: string): { score: number; label: string } {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 3);
  const words = text.split(/\s+/).filter(Boolean);
  if (sentences.length === 0 || words.length === 0) return { score: 0, label: "Not enough text" };
  const syllables = words.reduce((acc, w) => {
    const s = w.toLowerCase().replace(/[^a-z]/g, "").replace(/(?:[^laeiouy]e|ed|es)$/, "").match(/[aeiouy]{1,2}/g);
    return acc + Math.max(1, s ? s.length : 1);
  }, 0);
  const ease = 206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syllables / words.length);
  const score = Math.max(0, Math.min(100, Math.round(ease)));
  const label = score >= 60 ? "Easy to scan" : score >= 40 ? "Standard" : "Dense — simplify";
  return { score, label };
}

/* ------------------------------------------------------------------ */
/* ATS scoring                                                         */
/* ------------------------------------------------------------------ */

export function scoreResume(
  resume: StructuredResume,
  jobText: string
): ScoreResult {
  const text = resume.rawText || "";
  const lower = text.toLowerCase();
  const bullets = extractBullets(text);
  const keywords = extractKeywords(jobText || defaultJobCorpus(resume), text);

  // 1. Keyword match (40)
  const matched = keywords.filter((k) => k.matched).length;
  const keywordScore = keywords.length ? Math.round((matched / keywords.length) * 40) : 20;

  // 2. Quantified achievements (15)
  const quantified = bullets.filter((b) => /\d/.test(b)).length;
  const quantifiedScore = Math.min(15, Math.round((quantified / 5) * 15));

  // 3. Action verbs (10)
  const strong = bullets.filter((b) => {
    const first = b.split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, "");
    return STRONG_VERBS.has(first);
  }).length;
  const verbScore = Math.min(10, Math.round((strong / 8) * 10));

  // 4. Contact info (10)
  const hasEmail = /[\w.+-]+@[\w-]+\.[\w.]+/.test(text);
  const hasPhone = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text);
  const hasLocation = !!resume.location || /\b[A-Z][a-z]+,\s*[A-Z]{2}\b/.test(text);
  const hasLinkedIn = /linkedin\.com/i.test(text) || !!resume.linkedin;
  const contactScore = (hasEmail ? 4 : 0) + (hasPhone ? 3 : 0) + (hasLocation ? 2 : 0) + (hasLinkedIn ? 1 : 0);

  // 5. Sections (15)
  const hasSummary = !!resume.summary || /\b(summary|objective|profile)\b/i.test(text);
  const hasExp = resume.experience.length > 0 || /\b(experience|employment|work history)\b/i.test(text);
  const hasEdu = resume.education.length > 0 || /\b(education|degree|university|college)\b/i.test(text);
  const hasSkills = resume.skills.length > 0 || /\bskills\b/i.test(text);
  const sectionScore = (hasSummary ? 4 : 0) + (hasExp ? 5 : 0) + (hasEdu ? 3 : 0) + (hasSkills ? 3 : 0);

  // 6. Formatting (10) — start full, deduct for parser hazards
  const flags: ScoreResult["flags"] = [];
  let formatting = 10;
  const tableChars = (text.match(/[│┃┆┇┈┉┊┋┌┐└┘├┤┬┴┼═║]/g) || []).length;
  if (tableChars > 3) {
    formatting -= 4;
    flags.push({ level: "warn", title: "Tables detected", detail: "Table characters break most ATS parsers. Use simple single-column layout with standard headings." });
  }
  const pipeHeavy = text.split("\n").filter((l) => (l.match(/\|/g) || []).length >= 3).length;
  if (pipeHeavy > 2) {
    formatting -= 2;
    flags.push({ level: "warn", title: "Multi-column layout risk", detail: "Heavy pipe separators suggest columns — parsers often read columns out of order." });
  }
  const capsLines = text.split("\n").filter((l) => l.length > 20 && l === l.toUpperCase() && /[A-Z]/.test(l)).length;
  if (capsLines > 6) {
    formatting -= 2;
    flags.push({ level: "info", title: "Heavy ALL-CAPS usage", detail: "A few caps headings are fine, but large caps blocks hurt readability." });
  }
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words > 0 && words < 200) {
    flags.push({ level: "warn", title: "Resume looks thin", detail: `Only ~${words} words detected. Most strong resumes run 400–800 words.` });
    formatting -= 2;
  } else if (words > 1100) {
    flags.push({ level: "info", title: "Resume looks long", detail: `~${words} words is typically 2+ pages. Keep it to one page under 10 years of experience.` });
    formatting -= 1;
  }
  if (!hasEmail) flags.push({ level: "warn", title: "No email found", detail: "Add a professional email address to the header." });
  if (!hasPhone) flags.push({ level: "warn", title: "No phone found", detail: "Add a phone number to the header." });
  if (!hasLinkedIn) flags.push({ level: "info", title: "No LinkedIn URL", detail: "Recruiters expect a LinkedIn profile link — it lifts response rates." });
  if (quantified < 3) flags.push({ level: "warn", title: "Few quantified achievements", detail: `Only ${quantified} bullet(s) include numbers. Hiring managers scan for metrics — add %, $, or counts.` });
  if (formatting === 10) flags.push({ level: "good", title: "Parser-friendly layout", detail: "No tables, columns, or graphics characters detected in the text." });

  const breakdown = {
    keyword: keywordScore,
    quantified: quantifiedScore,
    actionVerbs: verbScore,
    contact: contactScore,
    sections: sectionScore,
    formatting: Math.max(0, formatting),
  };
  const total = Math.max(0, Math.min(100,
    breakdown.keyword + breakdown.quantified + breakdown.actionVerbs + breakdown.contact + breakdown.sections + breakdown.formatting
  ));
  const grade = total >= 90 ? "A" : total >= 75 ? "B" : total >= 60 ? "C" : total >= 40 ? "D" : "F";

  return {
    total,
    grade,
    breakdown,
    keywords,
    keywordMatchPct: keywords.length ? Math.round((matched / keywords.length) * 100) : 0,
    flags,
    readability: readability(text),
    bulletCount: bullets.length,
    quantifiedCount: quantified,
  };
}

// When no job posting is pasted, score against a general corpus so the
// keyword section still demonstrates value.
function defaultJobCorpus(resume: StructuredResume): string {
  const title = resume.experience[0]?.title || "professional";
  return `We are seeking a ${title} with strong communication skills, leadership, problem solving, project management, data analysis, attention to detail, time management, Microsoft Excel, and a proven track record of results.`;
}

/* ------------------------------------------------------------------ */
/* Bullet rewrites                                                     */
/* ------------------------------------------------------------------ */

function strengthenOpener(bullet: string): { text: string; changed: boolean } {
  for (const [re, replacement] of WEAK_OPENERS) {
    if (re.test(bullet)) {
      const rest = bullet.replace(re, "").trim();
      if (replacement) {
        const cap = rest.charAt(0).toUpperCase() + rest.slice(1);
        return { text: (replacement + cap).trim(), changed: true };
      }
      // Empty replacement: pick a verb by signal, normalizing a leading gerund
      // ("responsible for managing a team" -> "Managed a team")
      for (const [gre, gverb] of GERUND_TO_VERB) {
        if (gre.test(rest)) {
          const tail = rest.replace(gre, "").trim();
          const cap = tail.charAt(0).toUpperCase() + tail.slice(1);
          return { text: `${gverb} ${cap.charAt(0).toLowerCase() + cap.slice(1)}`, changed: true };
        }
      }
      for (const [sig, verb] of VERB_BY_SIGNAL) {
        if (sig.test(rest)) {
          const cap = rest.charAt(0).toUpperCase() + rest.slice(1);
          return { text: `${verb} ${cap.charAt(0).toLowerCase() + cap.slice(1)}`, changed: true };
        }
      }
      const cap = rest.charAt(0).toUpperCase() + rest.slice(1);
      return { text: `Delivered ${cap.charAt(0).toLowerCase() + cap.slice(1)}`, changed: true };
    }
  }
  return { text: bullet, changed: false };
}

function resultFirst(bullet: string): { text: string; changed: boolean } {
  // "Did X, increasing Y by 20%" -> "Increased Y by 20% by doing X"
  const m = bullet.match(/^(.*?)[,;]\s*(increased|decreased|reduced|improved|grew|boosted|cut|saved|raised|grew|achieved|generated|delivered)\s+([^,.]{3,80})$/i);
  if (m) {
    const action = m[1].trim();
    const verb = m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase();
    const result = m[3].trim();
    const actionLower = action.charAt(0).toLowerCase() + action.slice(1);
    return { text: `${verb} ${result} by ${actionLower}`, changed: true };
  }
  return { text: bullet, changed: false };
}

export function rewriteBullet(original: string, mode: Mode): RewriteResult {
  const gaps: string[] = [];
  const whys: string[] = [];
  let translationNote: string | undefined;

  let text = original.trim();
  let { text: translated, notes } = mode === "veteran" ? translateMilitary(text) : { text, notes: [] as string[] };
  text = translated;
  if (notes.length) translationNote = notes.join("; ");

  const opener = strengthenOpener(text);
  if (opener.changed) {
    text = opener.text;
    whys.push("Opens with a strong action verb — recruiters decide in the first 3 words.");
  }

  const rf = resultFirst(text);
  if (rf.changed) {
    text = rf.text;
    whys.push("Leads with the result, not the task — impact-first bullets get read twice as often.");
  }

  if (!/\d/.test(original)) {
    gaps.push("No numbers — add a %, $, headcount, or timeframe (e.g. 'for a team of 12', 'in 6 weeks').");
  } else if (!whys.length) {
    whys.push("Already quantified — tightened the phrasing so the number hits harder.");
  }

  // Trim filler
  const before = text;
  text = text
    .replace(/\bin order to\b/gi, "to")
    .replace(/\bdue to the fact that\b/gi, "because")
    .replace(/\ba large number of\b/gi, "many")
    .replace(/\s+/g, " ")
    .trim();
  if (text !== before && !whys.length) whys.push("Cut filler words — every word on a resume has to earn its place.");

  if (!whys.length) whys.push("Solid bullet — polished for flow while keeping every fact you provided.");

  return { original, rewritten: text, why: whys[0], gaps, translationNote };
}

export function rewriteBullets(text: string, mode: Mode): RewriteResult[] {
  return extractBullets(text).map((b) => rewriteBullet(b, mode));
}

/* ------------------------------------------------------------------ */
/* ATS simulator                                                       */
/* ------------------------------------------------------------------ */

export interface AtsSimulation {
  parsedText: string;
  extracted: { label: string; value: string; found: boolean }[];
  notes: string[];
}

export function atsSimulate(resume: StructuredResume): AtsSimulation {
  const text = resume.rawText || "";
  // Simulate a naive parser: normalize bullets, collapse whitespace, strip fancy chars
  const parsedText = text
    .replace(/[•▪◦‣·]/g, "-")
    .replace(/[│┃┆┇┈┉┊┋┌┐└┘├┤┬┴┼═║|]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] ?? "";
  const phone = text.match(/(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)?.[0] ?? "";
  const linkedin = text.match(/(linkedin\.com\/[^\s)]+)/i)?.[0] ?? "";
  const bullets = extractBullets(text);

  return {
    parsedText,
    extracted: [
      { label: "Email", value: email || "not found", found: !!email },
      { label: "Phone", value: phone || "not found", found: !!phone },
      { label: "LinkedIn", value: linkedin || "not found", found: !!linkedin },
      { label: "Bullets parsed", value: `${bullets.length} found`, found: bullets.length > 0 },
      { label: "Sections", value: ["summary", "experience", "education", "skills"].filter((s) => new RegExp(`\\b${s}\\b`, "i").test(text)).join(", ") || "none detected", found: true },
    ],
    notes: [
      "This is what a typical parser extracts — formatting, columns, and graphics are discarded.",
      bullets.length === 0
        ? "No bullets detected. Use • or - at the start of achievement lines so parsers capture them."
        : `${bullets.length} achievement bullets detected and parsed cleanly.`,
      !email || !phone ? "Missing contact fields are the #1 reason qualified resumes never get a callback." : "Contact block parsed cleanly.",
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Cover letters                                                       */
/* ------------------------------------------------------------------ */

const TONE_OPENERS: Record<string, string[]> = {
  professional: [
    "I am writing to express my strong interest in the {title} position at {company}.",
    "Please accept my application for the {title} role at {company}.",
  ],
  confident: [
    "I don't just meet the requirements for the {title} role at {company} — I exceed them.",
    "{company} needs a {title} who delivers from day one. That's exactly what I do.",
  ],
  warm: [
    "When I saw the {title} opening at {company}, it felt like the role was written for me.",
    "I'm genuinely excited about the {title} position at {company} — and I'd love to tell you why.",
  ],
};

const TONE_CLOSERS: Record<string, string> = {
  professional: "Thank you for your time and consideration. I would welcome the opportunity to discuss how I can contribute to your team.",
  confident: "I'd welcome the chance to show you what I can do. Let's talk about what winning looks like in this role.",
  warm: "Thank you so much for considering my application — I'd be thrilled to discuss how I can help your team succeed.",
};

export function generateCoverLetter(
  resume: StructuredResume,
  jobText: string,
  targetTitle: string,
  company: string,
  tone: "professional" | "confident" | "warm"
): CoverLetterResult {
  const keywords = extractKeywords(jobText, resume.rawText, 8);
  const topSkills = keywords.filter((k) => k.matched).slice(0, 2).map((k) => k.term);
  const skillPhrase = topSkills.length >= 2
    ? `${topSkills[0]} and ${topSkills[1]}`
    : topSkills.length === 1
      ? topSkills[0]
      : "the core requirements of this role";

  const bullets = extractBullets(resume.rawText);
  const quantified = bullets.find((b) => /\d/.test(b)) ?? bullets[0] ?? "";
  const achievement = quantified
    ? `For example: ${quantified.charAt(0).toLowerCase() + quantified.slice(1)}`
    : "";

  const title = targetTitle || resume.experience[0]?.title || "the open position";
  const co = company || "your company";
  const name = resume.name || "Your Name";
  const opener = TONE_OPENERS[tone][0].replace("{title}", title).replace("{company}", co);

  const body =
    `In my background as ${resume.experience[0] ? `a ${resume.experience[0].title}${resume.experience[0].company ? ` at ${resume.experience[0].company}` : ""}` : "a dedicated professional"}, ` +
    `I've built real strength in ${skillPhrase} — directly aligned with what you're looking for. ${achievement ? achievement + " " : ""}` +
    `I bring ${resume.skills.slice(0, 4).join(", ") || "a versatile skill set"} and a habit of delivering measurable results, not just completing tasks.`;

  const closer = TONE_CLOSERS[tone];

  return {
    tone,
    text: `Dear Hiring Manager,\n\n${opener}\n\n${body}\n\n${closer}\n\nSincerely,\n${name}${resume.phone ? `\n${resume.phone}` : ""}${resume.email ? `\n${resume.email}` : ""}`,
  };
}

/* ------------------------------------------------------------------ */
/* LinkedIn                                                            */
/* ------------------------------------------------------------------ */

export function generateLinkedIn(
  resume: StructuredResume,
  jobText: string,
  targetTitle: string,
  linkedinText = "",
  feedback = ""
): LinkedInResult {
  // Prefer the uploaded LinkedIn profile as the source of truth when present.
  const sourceText = linkedinText.trim() || resume.rawText;
  const keywords = extractKeywords(jobText, sourceText, 12);
  const matched = keywords.filter((k) => k.matched).map((k) => k.term);
  const missing = keywords.filter((k) => !k.matched).map((k) => k.term);
  const title = targetTitle || resume.experience[0]?.title || "Professional";
  const topSkills = (resume.skills.length ? resume.skills : matched).slice(0, 3);
  const fb = feedback.toLowerCase();
  const applied: string[] = [];

  let headlines = [
    `${title} | ${topSkills.slice(0, 2).join(" · ")}${topSkills[2] ? ` · ${topSkills[2]}` : ""}`,
    `${title} helping teams ${matched[0] ? `with ${matched[0]}` : "deliver results"} | Open to new opportunities`,
    `${title} | ${resume.experience[0]?.company ? `Previously ${resume.experience[0].company} · ` : ""}${topSkills[0] ?? "Results-driven"}`,
  ];

  const summaryBits = resume.summary
    ? resume.summary
    : `I'm a ${title.toLowerCase()} focused on delivering measurable results.`;
  let about =
    `${summaryBits}\n\n` +
    `What I bring: ${topSkills.join(", ")}${matched.length ? `, with proven experience in ${matched.slice(0, 3).join(", ")}` : ""}.\n\n` +
    `Currently ${targetTitle ? `pursuing ${targetTitle} opportunities` : "open to new opportunities"} — let's connect.`;

  // Feedback heuristics — deterministic adjustments so regeneration visibly responds.
  if (/\b(short|concis|brief|tight)/.test(fb)) {
    const sentences = about.split(/(?<=[.!?])\s+/);
    about = sentences.slice(0, 2).join(" ");
    headlines = [...headlines].sort((a, b) => a.length - b.length);
    applied.push("Tightened: shorter About and most concise headline first.");
  }
  if (/\b(punch|bold|confident|strong|assertive)/.test(fb)) {
    headlines = [headlines[1], headlines[0], headlines[2]];
    about = about.replace("let's connect.", "let's build something worth talking about.");
    applied.push("Turned up the confidence: bolder headline first, stronger close.");
  }
  if (/\b(warm|friendly|casual|approachable|personable)/.test(fb)) {
    about = about.replace("let's connect.", "always happy to chat — my inbox is open.");
    applied.push("Warmed it up: friendlier, more approachable tone.");
  }
  if (/\b(formal|professional|corporate|polished)/.test(fb)) {
    about = about.replace(/let's connect\.|my inbox is open\./, "I welcome the opportunity to discuss how I can contribute.");
    applied.push("More formal: polished corporate phrasing.");
  }

  const bullets = extractBullets(sourceText).slice(0, 6);
  const polishedBullets = bullets.map((b) => ({ original: b, polished: rewriteBullet(b, "general").rewritten }));

  return {
    headlines,
    about,
    polishedBullets,
    skillsGap: missing.slice(0, 8),
    tip: missing.length
      ? `Add these to your Skills section if truthful: ${missing.slice(0, 5).join(", ")}. LinkedIn search ranks profiles on keyword matches.`
      : "Your profile already covers the posting's key terms — keep endorsements flowing on your top 3 skills.",
    appliedFeedback: applied.length ? applied : undefined,
  };
}
