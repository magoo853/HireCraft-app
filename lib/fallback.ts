import {
  CoverLetterResult,
  ExperienceItem,
  Keyword,
  LinkedInResult,
  Mode,
  RewriteResult,
  ScoreResult,
  StructuredResume,
  SummaryResult,
} from "./types";
import { deriveSkills, textToStructured, parseLinkedInProfile, isPdfJunkLine as isJunkLine } from "./parse";

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

/** Jargon terms with their civilian translations, for drill-down display. */
export function findMilitaryJargonDetailed(text: string): { term: string; civilian: string }[] {
  const out: { term: string; civilian: string }[] = [];
  const seen = new Set<string>();
  for (const [re, civilian] of MILITARY_GLOSSARY) {
    const m = text.match(re);
    re.lastIndex = 0;
    if (m && !seen.has(m[0].toLowerCase())) {
      seen.add(m[0].toLowerCase());
      out.push({ term: m[0], civilian });
    }
  }
  return out;
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
  // No length ceiling and no count cap: the scorer must see the WHOLE
  // resume — a windowed/sliced fallback silently scores only the head
  // (bullet counts, quantified/verb scoring, ATS bullet count).
  const body = lines.filter((l) => {
    if (l.length < 20) return false;
    if (/^[^a-z]*$/.test(l)) return false; // ALL-CAPS headers
    if (/:$/.test(l)) return false; // section headers
    if (/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(l)) return false;
    if (/^\(?\+?\d[\d\s().-]{7,}\d$/.test(l)) return false;
    if (/^(https?:\/\/|www\.|linkedin\.com)/i.test(l)) return false;
    if (/^(experience|education|skills|summary|objective|contact|work history|employment|certifications)/i.test(l)) return false;
    return true;
  });
  return body;
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

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 3);
  const wordArr = text.split(/\s+/).filter(Boolean);
  const bulletWordCounts = bullets.map((b) => b.split(/\s+/).filter(Boolean).length);
  const longestBullets = [...bullets]
    .sort((a, b) => b.split(/\s+/).length - a.split(/\s+/).length)
    .slice(0, 3);

  return {
    total,
    grade,
    breakdown,
    keywords,
    keywordMatchPct: keywords.length ? Math.round((matched / keywords.length) * 100) : 0,
    flags,
    readability: readability(text),
    readabilityDetail: {
      avgWordsPerSentence: sentences.length ? Math.round(wordArr.length / sentences.length) : 0,
      avgWordsPerBullet: bullets.length ? Math.round(bulletWordCounts.reduce((a, b) => a + b, 0) / bullets.length) : 0,
      longestBullets,
    },
    keywordBasis: jobText && jobText.trim() ? "job" : "generic",
    genericTitle: resume.experience[0]?.title || "professional",
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
        // "Helped increase…" -> "Assisted increase…" (don't capitalize the
        // next word — unless it looks like a proper noun / acronym).
        const firstWord = rest.split(" ")[0] ?? "";
        const keepCaps = firstWord.length <= 1 || /[A-Z]/.test(firstWord.slice(1));
        const adj = keepCaps ? rest : rest.charAt(0).toLowerCase() + rest.slice(1);
        return { text: (replacement + adj).trim(), changed: true };
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

/** True when two strings differ only in whitespace/punctuation spacing. */
function sameish(a: string, b: string): boolean {
  const norm = (s: string) => s.replace(/\s*([-—–,;:])\s*/g, "$1").replace(/\s+/g, " ").trim().toLowerCase();
  return norm(a) === norm(b);
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

  // Fragment pass — runs BEFORE tightening: summary-style fragments
  // ("Proficient with…", "5 years experience — oversees…") get restructured
  // into achievement shape while their structure is still intact.
  if (sameish(text, original)) {
    const frag = rewriteFragment(text);
    if (frag) {
      text = frag.text;
      whys.push("Restructured a summary fragment into achievement form — same facts, recruiter shape.");
      if (frag.gap) gaps.push(frag.gap);
    }
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

  // Tighten pass — always runs, so even strong bullets come back visibly sharper.
  const tightened = tighten(text);
  if (tightened.changed) {
    text = tightened.text;
    whys.push("Tightened the phrasing — same facts, sharper delivery.");
  }

  // Last resort: upgrade the opening verb so the rewrite never echoes the original.
  if (sameish(text, original)) {
    const upgraded = upgradeVerb(text);
    if (upgraded.changed) {
      text = upgraded.text;
      whys.push("Swapped in a stronger action verb — the first word sets the tone.");
    }
  }

  if (!whys.length) whys.push("Solid bullet — polished for flow while keeping every fact you provided.");

  // Final polish: a pass may have removed a sentence-initial word — re-case.
  if (/^[a-z]/.test(text)) text = text.charAt(0).toUpperCase() + text.slice(1);

  return { original, rewritten: text, why: whys[0], gaps, translationNote };
}

/** Deterministic tightening rules — same facts, fewer, sharper words. */
const TIGHTEN: [RegExp, string | ((...args: string[]) => string)][] = [
  [/\bsuccessfully\b/gi, ""],
  [/\bvarious\b/gi, ""],
  [/\bvery\b/gi, ""],
  [/\bby implementing\b/gi, "with"],
  [/\bby utilizing\b/gi, "with"],
  [/\butilizing\b/gi, "using"],
  [/\butilize\b/gi, "use"],
  [/\bin a timely manner\b/gi, "on time"],
  [/\bon a (daily|weekly|monthly) basis\b/gi, "$1"],
  [/\bresulting in a (\d[\d,.]*%?) increase\b/gi, "lifting $1"],
  [/\bresulting in\b/gi, "delivering"],
  [/\bthat provided\b/gi, "delivering"],
  [/\bleading to a\b/gi, "delivering a"],
  [/\bresponsible for managing\b/gi, "managed"],
  [/\btasked with\b/gi, ""],
  [/\bworked on\b/gi, "delivered"],
  [/\bhelped to\b/gi, "helped"],
  [/\bmade sure\b/gi, "ensured"],
  [/\bincreased ([a-z][\w-]*(?: [\w-]+){0,3}) by (\d[\d,.]*%?)/gi,
    (match: string, noun: string, num: string) => `${match[0] === match[0].toUpperCase() ? "Grew" : "grew"} ${noun} ${num}`],
  [/\breducing\b/gi, "cutting"],
  [/\bmaintaining a\b/gi, "holding a"],
  [/\bworked closely with\b/gi, "partnered with"],
  [/\bcollaborated with\b/gi, "partnered with"],
  [/\bthe integration of\b/gi, ""],
  [/\s{2,}/g, " "],
];

function tighten(bullet: string): { text: string; changed: boolean } {
  let text = bullet;
  for (const [re, rep] of TIGHTEN) text = text.replace(re, rep as string);
  text = text.replace(/\s{2,}/g, " ").replace(/\s+([,.])/g, "$1").trim();
  return { text, changed: text !== bullet };
}

/** Stronger synonyms for common openers — meaning preserved, impact raised. */
const VERB_UPGRADES: [RegExp, string][] = [
  [/^increased\b/i, "Grew"],
  [/^built\b/i, "Forged"],
  [/^led\b/i, "Directed"],
  [/^managed\b/i, "Oversaw"],
  [/^created\b/i, "Launched"],
  [/^improved\b/i, "Elevated"],
  [/^helped\b/i, "Drove"],
  [/^worked\b/i, "Delivered"],
  [/^handled\b/i, "Owned"],
  [/^did\b/i, "Delivered"],
  [/^made\b/i, "Built"],
  [/^ran\b/i, "Directed"],
  [/^oversaw\b/i, "Directed"],
  [/^coordinated\b/i, "Orchestrated"],
  [/^established\b/i, "Founded"],
  [/^identified\b/i, "Pinpointed"],
  [/^introduced\b/i, "Rolled out"],
  [/^guided\b/i, "Mentored"],
  [/^streamlined\b/i, "Overhauled"],
  [/^elevated\b/i, "Transformed"],
];

function upgradeVerb(bullet: string): { text: string; changed: boolean } {
  for (const [re, verb] of VERB_UPGRADES) {
    if (re.test(bullet)) {
      const text = bullet.replace(re, verb);
      // lowercase the next word's first letter if it was capitalized mid-sentence style
      return { text, changed: text !== bullet };
    }
  }
  return { text: bullet, changed: false };
}

export function rewriteBullets(text: string, mode: Mode): RewriteResult[] {
  return extractBullets(text).map((b) => rewriteBullet(b, mode));
}

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9%$+#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenOverlap(a: string, b: string): number {
  const aTokens = new Set(tokenize(a));
  const bTokens = new Set(tokenize(b));
  if (!aTokens.size || !bTokens.size) return 0;
  let shared = 0;
  aTokens.forEach((token) => {
    if (bTokens.has(token)) shared++;
  });
  return shared / Math.max(1, Math.min(aTokens.size, bTokens.size));
}

function reviewCandidates(reviewText: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const lines = reviewText.replace(/\r\n?/g, "\n").split("\n");
  for (const rawLine of lines) {
    const line = rawLine.replace(/^[\s•\-*▪◦‣·]+/, "").trim();
    if (!line) continue;
    // RR-12: mask decimal points (digit.digit) before sentence splitting —
    // the split pattern reads the "." in "99.2 percent" as a sentence
    // boundary and fragments the accomplishment into unusable candidates.
    // A NUL sentinel (never present in real text) stands in for the dot
    // and is restored immediately after the split. No lookbehind: older
    // Safari can't even parse it.
    const masked = line.replace(/(\d)\.(\d)/g, "$1\u0000$2");
    const sentences = (masked.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? []).map((s) => s.replace(/\u0000/g, "."));
    for (const rawSentence of sentences) {
      const sentence = rawSentence.replace(/\s+/g, " ").trim().replace(/[.!?]+$/, "");
      const key = normalizeForMatch(sentence);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(sentence);
    }
  }
  return out;
}

const REVIEW_HEADER_RE =
  /^(employee|reviewer|manager|supervisor|review period|reporting period|overall rating|rating|signature|department|position title|job title|date of review|review date|company|prepared by)\b/i;
const ACHIEVEMENT_SIGNAL_RE =
  /\b(led|directed|managed|supervised|oversaw|coordinated|spearheaded|drove|delivered|achieved|exceeded|accelerated|launched|built|developed|designed|created|established|implemented|deployed|streamlined|optimized|improved|enhanced|transformed|automated|reduced|cut|decreased|eliminated|increased|grew|boosted|expanded|scaled|generated|secured|negotiated|closed|mentored|coached|trained|resolved|executed|promoted|selected|recognized|earned|awarded|saved|won)\b/i;

/** Drop a leading subject ("Priya reduced…" / "She mentored…") — reviews are
 * written in third person; resume bullets are not. Facts stay verbatim. */
function dropReviewSubject(sentence: string): string {
  const pronoun = sentence.replace(/^(?:She|He|They)\s+/i, "");
  if (pronoun !== sentence) return pronoun.charAt(0).toUpperCase() + pronoun.slice(1);
  const m = sentence.match(/^([A-Z][a-z]+)\s+([a-z]+)\s+(.*)$/);
  if (m && ACHIEVEMENT_SIGNAL_RE.test(m[2])) {
    const rest = `${m[2]} ${m[3]}`;
    return rest.charAt(0).toUpperCase() + rest.slice(1);
  }
  return sentence;
}

const EVAL_HEADER_RE =
  /^(ratee|rater|senior rater|reporting official|reviewer|duty title|unit|organization|grade|rank|afsc|mos|evaluation|epr|opr|ncoer|oer|fitrep|period of report|report period)\b/i;

/**
 * Shared deterministic mining engine for review/evaluation additions.
 * The `original` is the source document's own sentence; the rewrite uses
 * the same deterministic bullet engine as the rest of the fallback.
 * Nothing is sourced from outside the source text.
 */
function extractMinedAdditions(
  sourceText: string,
  resume: StructuredResume,
  mode: Mode,
  source: "review" | "eval",
  why: string,
  extraHeaderRe: RegExp | null
): RewriteResult[] {
  if (!sourceText.trim()) return [];
  const resumeText = [resume.rawText, ...resume.experience.flatMap((e) => e.bullets)].join("\n");
  const resumeNorm = normalizeForMatch(resumeText);
  const ranked: { sentence: string; score: number; index: number }[] = [];

  reviewCandidates(sourceText).forEach((sentence, index) => {
    if (sentence.length < 35 || sentence.length > 340) return;
    if (REVIEW_HEADER_RE.test(sentence) || (extraHeaderRe !== null && extraHeaderRe.test(sentence)) || /@/.test(sentence) || /\?$/.test(sentence)) return;
    if (/^(overall|summary|comments?|strengths?|areas? for improvement|goals? for next year)\s*:/i.test(sentence)) return;

    const norm = normalizeForMatch(sentence);
    if (!norm || resumeNorm.includes(norm)) return;
    if (tokenOverlap(sentence, resumeText) >= 0.78) return;

    const hasMetric = /\$\s?\d|\b\d+(?:[.,]\d+)?\s*(?:%|percent|hours?|days?|weeks?|months?|years?|people|employees|customers|clients|projects|tickets|cases|accounts|sales|units|members)\b|\b\d+(?:[.,]\d+)?\b/.test(sentence);
    const hasAchievementSignal = ACHIEVEMENT_SIGNAL_RE.test(sentence);
    if (!hasMetric && !hasAchievementSignal) return;

    let score = hasMetric ? 3 : 0;
    if (hasAchievementSignal) score += 2;
    if (/\b(exceeded|reduced|improved|increased|saved|generated|promoted|recognized|awarded)\b/i.test(sentence)) score += 1;
    if (/\b(always|consistently|successfully)\b/i.test(sentence)) score -= 1;
    ranked.push({ sentence, score, index });
  });

  return ranked
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 4)
    .map(({ sentence }) => {
      let rewritten = rewriteBullet(sentence, mode).rewritten;
      if (normalizeForMatch(rewritten) === normalizeForMatch(sentence)) {
        rewritten = dropReviewSubject(sentence);
      }
      return {
        original: sentence,
        rewritten,
        why,
        gaps: [],
        source,
      };
    });
}

/**
 * Deterministically mine a civilian performance review for accomplishments
 * that are not already represented in the resume.
 */
export function extractReviewAdditions(
  reviewText: string,
  resume: StructuredResume,
  mode: Mode = "general"
): RewriteResult[] {
  return extractMinedAdditions(
    reviewText,
    resume,
    mode,
    "review",
    "New — mined from your performance review. This accomplishment is stated in the review and is not in your resume yet.",
    null
  );
}

/**
 * Deterministically mine a military evaluation (EPR/OPR/NCOER/OER/FITREP)
 * for accomplishments that are not already represented in the resume.
 * Mirrors extractReviewAdditions: verbatim source sentences, achievement-
 * shaped, nothing already in the resume, capped at 4.
 */
export function extractEvalAdditions(
  evalText: string,
  resume: StructuredResume,
  mode: Mode = "veteran"
): RewriteResult[] {
  return extractMinedAdditions(
    evalText,
    resume,
    mode,
    "eval",
    "New — mined from your evaluation (EPR/appraisal), not yet in your resume. This accomplishment is stated in the evaluation and is not in your resume yet.",
    EVAL_HEADER_RE
  );
}

/** True when two additions describe the same accomplishment: normalized
 *  original/rewritten text is equal, or one contains the other. */
function sameAccomplishment(a: RewriteResult, b: RewriteResult): boolean {
  const texts = (r: RewriteResult) =>
    [normalizeForMatch(r.original), normalizeForMatch(r.rewritten)].filter(Boolean);
  for (const x of texts(a)) {
    for (const y of texts(b)) {
      if (x === y || x.includes(y) || y.includes(x)) return true;
    }
  }
  return false;
}

/**
 * Merge eval + review addition streams, showing an accomplishment that
 * surfaces from BOTH documents only once. The preferred stream's copy is
 * kept (callers prefer the eval copy for veterans in veteran mode).
 */
export function dedupeAdditions(
  evalAdditions: RewriteResult[],
  reviewAdditions: RewriteResult[],
  preferEval: boolean
): RewriteResult[] {
  const primary = preferEval ? evalAdditions : reviewAdditions;
  const secondary = preferEval ? reviewAdditions : evalAdditions;
  const kept = [...primary];
  for (const item of secondary) {
    if (!kept.some((k) => sameAccomplishment(k, item))) kept.push(item);
  }
  return kept;
}

/** Skills evidenced by the review that the resume does not already list. */
export function reviewStrengths(reviewText: string, currentSkills: string[]): string[] {
  if (!reviewText.trim()) return [];
  return deriveSkills(reviewText).filter((skill) => {
    const s = skill.toLowerCase();
    return !currentSkills.some((existing) => {
      const e = existing.trim().toLowerCase();
      return e === s || e.includes(s) || s.includes(e);
    });
  });
}

/**
 * Restructure summary-style fragments into achievement shape. Returns null
 * when the line is a real sentence already. Never invents facts — it only
 * reorders and re-cases what is there.
 */
function rewriteFragment(bullet: string): { text: string; gap?: string } | null {
  const b = bullet.trim();
  // "5 years contract management experience — oversees base-level & enterprise…"
  const dash = b.match(/^(\d+\s+years?[^—–-]{3,60}?)\s*[—–-]\s*([a-z][\s\S]+)$/);
  if (dash) {
    const [, lead, rest] = dash;
    const tail = rest.trim();
    return { text: `${tail.charAt(0).toUpperCase() + tail.slice(1)} (${lead.trim()})` };
  }
  // Skills-style lines
  const skillsGap = "This is a skills line, not an achievement — it lands harder in the Skills section, or paired with a result it produced.";
  let m = b.match(/^proficient with\s+(.+)$/i);
  if (m) return { text: `Proficient in ${m[1]}`, gap: skillsGap };
  m = b.match(/^experience with\s+(.+)$/i);
  if (m) return { text: `Hands-on experience with ${m[1]}`, gap: skillsGap };
  m = b.match(/^efficient with\s+(.+)$/i);
  if (m) return { text: `Fluent in ${m[1]}`, gap: skillsGap };
  m = b.match(/^knowledge of\s+(.+)$/i);
  if (m) return { text: `Working knowledge of ${m[1]}`, gap: skillsGap };
  m = b.match(/^provided\s*&\s*executed\s+(.+)$/i);
  if (m) return { text: `Executed ${m[1]}` };
  m = b.match(/^provided\s+(.+)$/i);
  if (m) return { text: `Delivered ${m[1]}` };
  return null;
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

  // Achievement must come from real experience bullets — never from raw-text
  // extraction, which can surface contact lines or headers.
  const expBullets = resume.experience.flatMap((e) => e.bullets).filter((b) => b.trim().length > 12);
  const quantified = expBullets.find((b) => /\d/.test(b)) ?? expBullets[0] ?? "";
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
/* Professional summary (fallback)                                     */
/* ------------------------------------------------------------------ */

/** Join ["a","b","c"] as "a, b, and c". */
function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/** Score a bullet by the strength of its own numbers — $ and % weigh most. */
function metricStrength(bullet: string): number {
  let score = 0;
  if (/\$\s?\d/.test(bullet)) score += 3;
  if (/\d\s?%/.test(bullet)) score += 3;
  const nums = bullet.match(/\d[\d,.]*/g);
  if (nums) score += nums.length;
  return score;
}

/** Normalize a user bullet into a standalone summary sentence — facts verbatim. */
function asSentence(bullet: string): string {
  let s = bullet.replace(/^[\s•\-*·–—]+/, "").trim();
  if (!s) return "";
  s = s.charAt(0).toUpperCase() + s.slice(1);
  if (!/[.!?]$/.test(s)) s += ".";
  return s;
}

/**
 * Compose a professional summary ONLY from the structured resume: current
 * and prior roles, the user's own strongest quantified bullets, education,
 * and certifications. Nothing is invented — a thin resume gets a shorter
 * summary rather than padded generic claims.
 */
export function generateSummary(resume: StructuredResume): SummaryResult {
  const roles = resume.experience.filter((e) => (e.title || e.company).trim());
  const rolePhrase = (e: ExperienceItem) =>
    e.title && e.company ? `${e.title} at ${e.company}` : e.title || e.company;
  const skills = resume.skills.map((s) => s.trim()).filter(Boolean).slice(0, 4);
  const sentences: string[] = [];

  if (roles.length) {
    sentences.push(
      skills.length
        ? `${rolePhrase(roles[0])}, with strengths in ${joinList(skills)}.`
        : `${rolePhrase(roles[0])}.`
    );
  } else if (skills.length) {
    sentences.push(`Skilled in ${joinList(skills)}.`);
  }

  if (roles.length > 1) {
    sentences.push(`Previously ${joinList(roles.slice(1, 3).map(rolePhrase))}.`);
  }

  // Reserve room for the education/certification sentences so the strongest
  // achievement never crowds them out of the sentence budget.
  const edu = resume.education.find((e) => (e.degree || e.school).trim());
  const certs = resume.certifications.map((c) => c.trim()).filter(Boolean).slice(0, 3);
  const extras = (edu ? 1 : 0) + (certs.length ? 1 : 0);

  // The user's own quantified achievements, strongest numbers first.
  const bullets = roles
    .flatMap((e) => e.bullets)
    .filter((b) => b.trim().length > 12 && !isJunkLine(b));
  const ranked = bullets
    .map((b) => ({ text: asSentence(b), score: metricStrength(b) }))
    .filter((x) => x.text && x.score > 0)
    .sort((a, b2) => b2.score - a.score);
  const achCap = ranked.length ? Math.min(2, Math.max(1, 6 - sentences.length - extras)) : 0;
  const seen = new Set<string>();
  let added = 0;
  for (const item of ranked) {
    if (added >= achCap) break;
    const key = item.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    sentences.push(item.text);
    added++;
  }

  if (edu && sentences.length < 6) {
    if (edu.degree && edu.school) sentences.push(`Earned ${edu.degree} from ${edu.school}.`);
    else if (edu.degree) sentences.push(`Earned ${edu.degree}.`);
    else sentences.push(`Studied at ${edu.school}.`);
  }

  if (certs.length && sentences.length < 6) {
    sentences.push(
      certs.length === 1 ? `Certified: ${certs[0]}.` : `Certifications include ${joinList(certs)}.`
    );
  }

  return { text: sentences.join(" ") };
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
  // If the structured resume is thin (e.g. built from a LinkedIn PDF), parse
  // the source text structurally so titles/skills/bullets are real. A real
  // LinkedIn profile gets the dedicated LinkedIn parser.
  const parsedLinkedIn = linkedinText.trim() ? parseLinkedInProfile(linkedinText) : null;
  const parsedSource = parsedLinkedIn && parsedLinkedIn.experience.length
    ? parsedLinkedIn
    : resume.experience.length
      ? resume
      : textToStructured(sourceText);
  const title = targetTitle || parsedSource.experience[0]?.title || "Professional";
  const topSkills = (parsedSource.skills.length ? parsedSource.skills : resume.skills.length ? resume.skills : matched).slice(0, 3);
  const fb = feedback.toLowerCase();
  const applied: string[] = [];

  let headlines = [
    topSkills.length ? `${title} | ${topSkills.join(" · ")}` : `${title} | Open to new opportunities`,
    `${title} helping teams ${matched[0] ? `with ${matched[0]}` : "deliver results"} | Open to new opportunities`,
    `${title} | ${parsedSource.experience[0]?.company ? `Previously ${parsedSource.experience[0].company} · ` : ""}${topSkills[0] ?? "Results-driven"}`,
  ];

  const summaryBits = (resume.summary || parsedSource.summary) || `I'm a ${title.toLowerCase()} focused on delivering measurable results.`;
  const bringLine = topSkills.length || matched.length
    ? `\n\nWhat I bring: ${[...topSkills, ...matched.slice(0, 3)].filter((v, i, a) => a.indexOf(v) === i).join(", ")}.`
    : "";
  let about =
    `${summaryBits}` +
    `${bringLine}\n\n` +
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

  // Real experience bullets only — never PDF headers or headline fragments.
  const fromStructured = parsedSource.experience.flatMap((e) => e.bullets);
  const candidates = fromStructured.length
    ? fromStructured
    : extractBullets(sourceText).filter((b) => !isJunkLine(b) && b.trim().length >= 25);
  const bullets = candidates.filter((b) => !isJunkLine(b)).slice(0, 6);
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
