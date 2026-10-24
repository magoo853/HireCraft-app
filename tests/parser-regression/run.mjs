#!/usr/bin/env node
/**
 * HireCraft parser regression suite.
 *
 * Exercises lib/parse.ts `textToStructured()` (and the LinkedIn router)
 * against a set of fully synthetic resume fixtures and asserts the parsed
 * fields a user would check first: name/contact, summary, dated roles,
 * education, skills, certifications, and awards. A second phase feeds
 * synthetic pdf.js item streams through `extractPdfText()` to pin the
 * column-aware PDF extraction (and its false-positive guards).
 *
 * Run:  node tests/parser-regression/run.mjs
 * Exit: 0 when every non-known-issue assertion passes, 1 otherwise.
 *
 * Assertions tagged with `issue:` are EXPECTED-FAILURE probes for parser
 * bugs documented in tests/parser-regression/README.md. They print as
 * "KNOWN ISSUE" and do not change the exit code; if one starts passing,
 * it prints as a normal pass — remove the tag when the parser is fixed.
 * lib/parse.ts is never modified by this suite.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const fixturesDir = path.join(here, "fixtures");

/* Compile lib/parse.ts + lib/parse-file.ts (+ their imports) with the
 * project's own tsc into a throwaway dir and load the CommonJS output.
 * File ingestion (parseFile / extractPdfText) lives in parse-file.ts
 * since the Cycle 15 bundle split; its exports are merged into `mod`. */
function buildParser() {
  const out = mkdtempSync(path.join(tmpdir(), "hc-parse-build-"));
  const tsc = path.join(root, "node_modules", "typescript", "bin", "tsc");
  execFileSync(
    process.execPath,
    [
      tsc,
      path.join(root, "lib", "parse.ts"),
      path.join(root, "lib", "parse-file.ts"),
      "--outDir", out,
      "--module", "commonjs",
      "--target", "es2021",
      "--moduleResolution", "node",
      "--skipLibCheck",
      "--esModuleInterop",
    ],
    { stdio: "pipe" }
  );
  const require = createRequire(import.meta.url);
  const mod = require(path.join(out, "parse.js"));
  Object.assign(mod, require(path.join(out, "parse-file.js")));
  return { mod, out };
}

/* ---------------- assertion helpers ---------------- */

const ISSUES = {
  colonHeader:
    'Section headers with a trailing colon ("SUMMARY:", "EXPERIENCE:") match no SECTION_HEADERS pattern (the patterns are $-anchored), so the section never opens and its lines are silently dropped.',
  numericDates:
    "DATE_RANGE_RE has no MM/YYYY alternative, so a range like 03/2019 - 11/2021 matches nothing at all: the role is still created (short-line header fallback) but its dates come back empty — the employment dates silently disappear.",
  skillsOnePerLine:
    "A skills list written one-per-line (no commas, no bullets) is joined with spaces into a single token longer than 40 chars and discarded by the length filter; deriveSkills() then only recovers dictionary terms, so trade skills (Welding, HVAC Repair, ...) vanish entirely.",
  diplomaSchool:
    'The education school finder takes the FIRST comma segment matching /university|college|academy|institute|school|seminary/i. For "High School Diploma, <School>, <year>" that first match is the degree segment itself, so school and degree come back swapped on every diploma-only resume.',
  locationNewline:
    'The location regex runs over the first 8 lines joined with "\\n", and its \\s+ spans the line break: when the name line directly precedes a contact line starting with a one-word city, the surname is captured as part of the city — location comes back as "Nair\\nTampa, FL" (literal newline included) instead of "Tampa, FL".',
};

function collector(results, fixture) {
  const push = (label, pass, opts = {}) =>
    results.push({ fixture, label, pass, detail: opts.detail, issue: opts.issue });
  const ci = (s) => String(s ?? "").toLowerCase();
  return {
    check(label, cond, opts = {}) {
      push(label, !!cond, opts);
    },
    eq(label, actual, expected, opts = {}) {
      push(label, actual === expected, {
        ...opts,
        detail: `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
      });
    },
    includes(label, haystack, needle, opts = {}) {
      push(label, ci(haystack).includes(ci(needle)), {
        ...opts,
        detail: `expected to contain ${JSON.stringify(needle)}, got ${JSON.stringify(haystack)}`,
      });
    },
    count(label, arr, n, opts = {}) {
      push(label, Array.isArray(arr) && arr.length === n, {
        ...opts,
        detail: `expected ${n} entries, got ${Array.isArray(arr) ? arr.length : "not an array"}`,
      });
    },
    minCount(label, arr, n, opts = {}) {
      push(label, Array.isArray(arr) && arr.length >= n, {
        ...opts,
        detail: `expected >= ${n} entries, got ${Array.isArray(arr) ? arr.length : "not an array"}`,
      });
    },
    /** A role counts as "dated" when its dates string is non-empty and carries a 4-digit year. */
    jobDates(label, job, opts = {}) {
      push(label, !!job && typeof job.dates === "string" && /\d{4}/.test(job.dates), {
        ...opts,
        detail: `job ${JSON.stringify(job?.title)} has dates ${JSON.stringify(job?.dates)}`,
      });
    },
    hasSkill(label, skills, term, opts = {}) {
      push(label, (skills ?? []).some((s) => ci(s).includes(ci(term))), {
        ...opts,
        detail: `expected skills to include ${JSON.stringify(term)}, got ${JSON.stringify(skills)}`,
      });
    },
  };
}

/* ---------------- cases ---------------- */

const CASES = [
  {
    file: "general-civilian.txt",
    title: "General civilian — marketing manager, standard sections",
    run(r, a) {
      a.eq("name", r.name, "Priya Nair");
      a.eq("email", r.email, "priya.nair@example.com");
      a.includes("phone carries the 555 number", r.phone, "555");
      a.eq("location", r.location, "Tampa, FL", { issue: ISSUES.locationNewline });
      a.includes("summary mentions pipeline", r.summary, "pipeline");
      a.count("two roles", r.experience, 2);
      a.eq("role 1 title", r.experience[0]?.title, "Senior Marketing Manager");
      a.includes("role 1 company", r.experience[0]?.company, "Brightpath Software");
      a.jobDates("role 1 is dated", r.experience[0]);
      a.includes("role 1 runs to Present", r.experience[0]?.dates, "Present");
      a.minCount("role 1 bullets", r.experience[0]?.bullets, 3);
      a.eq("role 2 title", r.experience[1]?.title, "Marketing Specialist");
      a.jobDates("role 2 is dated", r.experience[1]);
      a.count("two education entries", r.education, 2);
      a.includes("education 1 school", r.education[0]?.school, "University of South Florida");
      a.includes("education 2 degree", r.education[1]?.degree, "Marketing");
      a.minCount("skills parsed from comma list", r.skills, 6);
      a.hasSkill("skills include SEO", r.skills, "SEO");
      a.count("two certifications", r.certifications, 2);
      a.includes("certifications include HubSpot", r.certifications.join(" | "), "HubSpot");
    },
  },
  {
    file: "veteran-army.txt",
    title: "Veteran — Army logistics, MILITARY EXPERIENCE + awards section",
    run(r, a) {
      a.eq("name", r.name, "Marcus Doyle");
      a.includes("summary mentions logistics", r.summary, "logistics");
      a.count("two roles", r.experience, 2);
      a.eq("role 1 title", r.experience[0]?.title, "Supply Sergeant");
      a.includes("role 1 company", r.experience[0]?.company, "U.S. Army");
      a.jobDates("role 1 is dated", r.experience[0]);
      a.jobDates("role 2 is dated", r.experience[1]);
      a.count("one education entry", r.education, 1);
      a.includes("education school", r.education[0]?.school, "Central Texas College");
      a.includes("education dates", r.education[0]?.dates, "2016");
      a.minCount("skills parsed", r.skills, 5);
      a.hasSkill("skills include Inventory Management", r.skills, "Inventory Management");
      a.count("two certifications", r.certifications, 2);
      a.count("three awards", r.awards, 3);
      a.includes("awards include Commendation Medal", r.awards.join(" | "), "Commendation Medal");
    },
  },
  {
    file: "veteran-marine.txt",
    title: "Veteran — Marine infantry, MILITARY SERVICE, PME + DECORATIONS",
    run(r, a) {
      a.eq("name", r.name, "Daniel Okafor");
      a.includes("summary mentions squad leader", r.summary, "squad leader");
      a.count("two roles", r.experience, 2);
      a.eq("role 1 title", r.experience[0]?.title, "Squad Leader");
      a.includes("role 1 company", r.experience[0]?.company, "Marine Corps");
      a.jobDates("role 1 is dated", r.experience[0]);
      a.jobDates("role 2 is dated", r.experience[1]);
      a.count("one education entry", r.education, 1);
      a.includes("education school is the high school", r.education[0]?.school, "Oceanside High School", {
        issue: ISSUES.diplomaSchool,
      });
      a.includes("education dates", r.education[0]?.dates, "2017");
      a.count("PME lands in certifications", r.certifications, 2);
      a.includes("certifications include Corporals Course", r.certifications.join(" | "), "Corporals Course");
      a.count("DECORATIONS lands in awards", r.awards, 2);
      a.includes("awards include Achievement Medal", r.awards.join(" | "), "Achievement Medal");
      a.hasSkill("derived skills include training", r.skills, "training");
    },
  },
  {
    file: "veteran-air-force.txt",
    title: "Veteran — Air Force, combined summary+experience header, clearance",
    run(r, a) {
      a.eq("name", r.name, "Sarah Lindqvist");
      a.includes("combined header: prose lands in summary", r.summary, "contracting specialist");
      a.count("combined header: two roles still parsed", r.experience, 2);
      a.eq("role 1 title", r.experience[0]?.title, "Contract Specialist");
      a.jobDates("role 1 is dated", r.experience[0]);
      a.includes("role 1 runs to Present", r.experience[0]?.dates, "Present");
      a.count("one education entry", r.education, 1);
      a.includes("education school", r.education[0]?.school, "Park University");
      a.minCount("PME + clearance land in certifications", r.certifications, 3);
      a.includes("certifications include Airman Leadership School", r.certifications.join(" | "), "Airman Leadership School");
      a.includes("certifications include the clearance", r.certifications.join(" | "), "Active Secret Clearance");
      a.count("two awards", r.awards, 2);
    },
  },
  {
    file: "veteran-navy.txt",
    title: "Veteran — Navy corpsman, LICENSES & CERTIFICATIONS, HONORS AND AWARDS",
    run(r, a) {
      a.eq("name", r.name, "Thomas Whitfield");
      a.count("two roles", r.experience, 2);
      a.includes("role 1 end date accepts 'Current'", r.experience[0]?.dates, "Current");
      a.jobDates("role 2 is dated", r.experience[1]);
      a.count("one education entry", r.education, 1);
      a.includes("education school", r.education[0]?.school, "Southern New Hampshire University");
      a.count("licenses & certifications parsed", r.certifications, 2);
      a.includes("certifications include EMT-B", r.certifications.join(" | "), "EMT-B");
      a.count("honors and awards parsed", r.awards, 2);
      a.includes("awards include Commendation Medal", r.awards.join(" | "), "Commendation Medal");
    },
  },
];

CASES.push(
  {
    file: "federal-style.txt",
    title: "Federal-style — SUMMARY OF QUALIFICATIONS, GS grade suffixes",
    run(r, a) {
      a.eq("name", r.name, "Angela Torres");
      a.eq("location", r.location, "Washington, DC", { issue: ISSUES.locationNewline });
      a.includes("summary mentions program analyst", r.summary, "program analyst");
      a.count("two roles", r.experience, 2);
      a.eq("role 1 title", r.experience[0]?.title, "Program Analyst");
      a.includes("role 1 company keeps the agency", r.experience[0]?.company, "Veterans Affairs");
      a.jobDates("role 1 is dated (grade suffix ignored)", r.experience[0]);
      a.minCount("role 1 bullets", r.experience[0]?.bullets, 3);
      a.eq("role 2 title", r.experience[1]?.title, "Management Analyst");
      a.count("two education entries", r.education, 2);
      a.includes("education 1 school", r.education[0]?.school, "George Washington University");
      a.includes("education 2 school", r.education[1]?.school, "University of Maryland");
      a.count("one certification", r.certifications, 1);
      a.includes("certification keeps FAC-P/PM", r.certifications.join(" | "), "FAC-P/PM");
    },
  },
  {
    file: "new-to-workforce.txt",
    title: "New to workforce — OBJECTIVE, diploma, PROJECTS, part-time role",
    run(r, a) {
      a.eq("name", r.name, "Tyler Brooks");
      a.includes("OBJECTIVE lands in summary", r.summary, "high school graduate");
      a.count("one education entry", r.education, 1);
      a.includes("education school is the high school", r.education[0]?.school, "Westlake High School", {
        issue: ISSUES.diplomaSchool,
      });
      a.includes("education dates", r.education[0]?.dates, "2025");
      a.count("one role", r.experience, 1);
      a.jobDates("year-only range still dates the role", r.experience[0]);
      a.includes("role dates keep the start year", r.experience[0]?.dates, "2023");
      a.count("one project", r.projects, 1);
      a.eq("project name", r.projects[0]?.name, "Community Food Drive");
      a.minCount("project bullets", r.projects[0]?.bullets, 2);
      a.minCount("skills parsed", r.skills, 5);
      a.hasSkill("skills include Cash Handling", r.skills, "Cash Handling");
    },
  },
  {
    file: "skills-light.txt",
    title: "Skills-light — no SKILLS section; skills must be derived from prose",
    run(r, a) {
      a.eq("name", r.name, "Robert Callahan");
      a.count("one role", r.experience, 1);
      a.jobDates("role is dated", r.experience[0]);
      a.count("one education entry", r.education, 1);
      a.includes("education school is the high school", r.education[0]?.school, "Fulton High School", {
        issue: ISSUES.diplomaSchool,
      });
      a.minCount("derived skills fill the gap (>= 5)", r.skills, 5);
      a.hasSkill("derived: inventory management", r.skills, "inventory management");
      a.hasSkill("derived: Microsoft Excel", r.skills, "Microsoft Excel");
      a.hasSkill("derived: scheduling", r.skills, "scheduling");
    },
  },
  {
    file: "messy-formats.txt",
    title: "Messy real-world formats — colon headers, MM/YYYY dates, skills one-per-line",
    run(r, a) {
      a.eq("name", r.name, "Grace Ellison");
      a.eq("email", r.email, "grace.e@example.com");
      a.includes("summary survives a 'SUMMARY:' header", r.summary, "Retail worker", {
        issue: ISSUES.colonHeader,
      });
      a.count("both jobs survive an 'EXPERIENCE:' header", r.experience, 2, {
        issue: ISSUES.colonHeader,
      });
      const qm = r.experience.find((j) => /quickmart/i.test(j.company ?? ""));
      a.check("dated-block job is found (QuickMart)", !!qm);
      a.eq("dated-block job title", qm?.title, "Sales Associate");
      a.minCount("dated-block bullets ('-' markers)", qm?.bullets, 2);
      a.includes("MM/YYYY range keeps its months", qm?.dates, "03/2019", {
        issue: ISSUES.numericDates,
      });
      a.hasSkill("one-per-line skills survive (Welding)", r.skills, "Welding", {
        issue: ISSUES.skillsOnePerLine,
      });
      a.minCount("one-per-line skills survive (count)", r.skills, 4, {
        issue: ISSUES.skillsOnePerLine,
      });
    },
  },
  {
    file: "linkedin-export.txt",
    title: "LinkedIn export — routed to parseLinkedInProfile",
    run(r, a) {
      a.eq("name", r.name, "Renee Vasquez");
      a.includes("location", r.location, "San Antonio");
      a.includes("About lands in summary", r.summary, "Operations manager");
      a.minCount("Top skills parsed", r.skills, 3);
      a.hasSkill("skills include Data Analysis", r.skills, "Data Analysis");
      a.count("two roles", r.experience, 2);
      a.eq("role 1 title (line above the company line)", r.experience[0]?.title, "Operations Manager");
      a.includes("role 1 company", r.experience[0]?.company, "BrightShip Logistics");
      a.includes("role 1 dates", r.experience[0]?.dates, "2020");
      a.minCount("role 1 bullets from description sentences", r.experience[0]?.bullets, 2);
      a.eq("role 2 title", r.experience[1]?.title, "Shift Supervisor");
      a.count("one education entry", r.education, 1);
      a.includes("education school", r.education[0]?.school, "University of Texas at San Antonio");
      a.includes("education degree", r.education[0]?.degree, "Bachelor");
      a.count("one certification", r.certifications, 1);
      a.count("one award", r.awards, 1);
    },
  }
);

CASES.push(
  {
    file: "modern-docx-layout.txt",
    title: "Modern DOCX layout — competencies table, education first, two-line job headers, soft hyphens",
    run(r, a) {
      a.eq("name", r.name, "Jordan Ellis");
      a.eq("location", r.location, "Austin, TX");
      a.minCount("competency table items land in skills", r.skills, 3);
      a.eq("the user's own first skill stays first", r.skills[0], "12+ Years of Operations Experience");
      a.hasSkill("digit-leading '…Years of Operations Experience' stays a skill, not a section flip", r.skills, "Operations Experience");
      a.hasSkill("skills include Vendor Negotiation", r.skills, "Vendor Negotiation");
      a.count("two roles from two-line headers", r.experience, 2);
      a.eq("role 1 title", r.experience[0]?.title, "Regional Operations Manager");
      a.includes("role 1 company from the following line", r.experience[0]?.company, "Lone Star Freight");
      a.includes("role 1 runs to Present", r.experience[0]?.dates, "Present");
      a.minCount("role 1 bullets", r.experience[0]?.bullets, 3);
      a.eq("role 2 title keeps its comma", r.experience[1]?.title, "Logistics Coordinator, Gulf Division");
      a.jobDates("role 2 is dated despite the soft hyphen", r.experience[1]);
      a.includes("role 2 dates keep Sept 2018", r.experience[1]?.dates, "Sept 2018");
      a.count("two education entries", r.education, 2);
      a.includes("education 1 school", r.education[0]?.school, "Texas A&M University");
      a.eq("education 1 degree is clean (no city/date residue)", r.education[0]?.degree, "Master of Science in Logistics");
      a.includes("education 1 dates", r.education[0]?.dates, "2019");
      a.eq("education 2 degree is clean", r.education[1]?.degree, "Bachelor of Arts in History");
      a.count("one certification", r.certifications, 1);
      a.includes("certification includes CSCP", r.certifications.join(" | "), "CSCP");
      a.check("certification whitespace is clean", !/[\t]| {2}/.test(r.certifications[0] ?? ""), {
        detail: `got ${JSON.stringify(r.certifications[0])}`,
      });
    },
  }
);

CASES.push(
  {
    file: "two-column-block.txt",
    title: "Two-column resume, block-sequenced extraction — whole sidebar first, then the main column",
    run(r, a) {
      a.eq("name", r.name, "Maya Chen");
      a.eq("location", r.location, "Seattle, WA");
      a.includes("summary survives arriving after the sidebar", r.summary, "Data analyst");
      a.minCount("sidebar skills parsed", r.skills, 5);
      a.hasSkill("skills include Python", r.skills, "Python");
      a.hasSkill("skills include Tableau", r.skills, "Tableau");
      a.count("two roles", r.experience, 2);
      a.eq("role 1 title", r.experience[0]?.title, "Senior Data Analyst");
      a.includes("role 1 company", r.experience[0]?.company, "Northwind Retail Group");
      a.jobDates("role 1 is dated", r.experience[0]);
      a.includes("role 1 runs to Present", r.experience[0]?.dates, "Present");
      a.eq("role 2 title", r.experience[1]?.title, "Data Analyst");
      a.jobDates("role 2 is dated", r.experience[1]);
      a.count("one education entry", r.education, 1);
      a.includes("education school", r.education[0]?.school, "University of Washington");
      a.includes("education degree", r.education[0]?.degree, "Statistics");
      a.count("one certification", r.certifications, 1);
    },
  },
  {
    // This fixture is the PRE-Cycle-9 extraction output for a two-column
    // PDF (columns interleaved row-by-row): the parser alone can only
    // salvage name/contact/certifications from it, which is what remains
    // asserted here. The fixed path — pdf.js items → column-aware
    // extractPdfText → textToStructured — is covered end-to-end by the
    // "pdf-two-column-interleaved" extraction case below, which carries
    // the summary/roles/education/skills assertions for this same resume.
    file: "two-column-interleaved.txt",
    title: "Two-column resume, row-interleaved extraction — parser-level salvage from pre-fix extraction text",
    run(r, a) {
      a.eq("name survives interleaving", r.name, "Daniel Reyes");
      a.eq("email survives interleaving", r.email, "daniel.reyes@example.com");
      a.eq("location survives interleaving", r.location, "Austin, TX");
      a.count("certifications block is salvaged", r.certifications, 2);
      a.includes("certifications include the clean entry", r.certifications.join(" | "), "Forklift Operator License");
    },
  },
  {
    file: "table-jobs.txt",
    title: "Table-based jobs — dates cell + header cell rows, and a job whose company sits on its own row",
    run(r, a) {
      a.eq("name", r.name, "Samuel Ortiz");
      a.eq("location", r.location, "Chicago, IL");
      a.includes("summary mentions operations leader", r.summary, "Operations leader");
      a.eq("role 1 title (dates cell + header cell row)", r.experience[0]?.title, "Operations Manager");
      a.includes("role 1 company", r.experience[0]?.company, "Brightline Logistics");
      a.jobDates("role 1 is dated", r.experience[0]);
      a.minCount("role 1 bullets", r.experience[0]?.bullets, 2);
      a.eq("role 2 title", r.experience[1]?.title, "Warehouse Supervisor");
      a.jobDates("role 2 is dated", r.experience[1]);
      const lead = r.experience.find((j) => j.title === "Shipping Lead");
      a.check("third job exists (Shipping Lead)", !!lead);
      a.jobDates("Shipping Lead is dated", lead);
      a.count("three roles in total", r.experience, 3);
      a.includes("Shipping Lead keeps its company", lead?.company, "Northgate");
      a.count("Shipping Lead keeps its bullets", lead?.bullets, 2);
      a.check(
        "no phantom role titled 'Northgate Distribution'",
        !r.experience.some((j) => j.title === "Northgate Distribution")
      );
      a.count("one education entry", r.education, 1);
      a.includes("education school", r.education[0]?.school, "DePaul University");
    },
  },
  {
    file: "table-company-boundary.txt",
    title: "Table company-row boundary — a dateless header after a role that already has a company is NOT absorbed",
    run(r, a) {
      a.eq("name", r.name, "Robin Delgado");
      a.count(
        "two roles in total (the dateless line starts its own role)",
        r.experience,
        2
      );
      a.eq("role 1 title", r.experience[0]?.title, "Store Manager");
      a.jobDates("role 1 is dated", r.experience[0]);
      a.includes(
        "role 1 company is not overwritten by the next dateless line",
        r.experience[0]?.company,
        "QuickMart"
      );
      a.count("role 1 has no bullets (none were written for it)", r.experience[0]?.bullets, 0);
      a.eq("role 2 title", r.experience[1]?.title, "Inventory Specialist");
      a.count("role 2 keeps its bullets", r.experience[1]?.bullets, 2);
    },
  },
  {
    file: "header-variants.txt",
    title: "Header variants — CAREER OBJECTIVE + WORK HISTORY",
    run(r, a) {
      a.eq("name", r.name, "Hannah Kim");
      a.includes("CAREER OBJECTIVE lands in summary", r.summary, "Customer service professional");
      a.count("WORK HISTORY yields two roles", r.experience, 2);
      a.eq("role 1 title", r.experience[0]?.title, "Customer Service Representative");
      a.jobDates("role 1 is dated", r.experience[0]);
      a.count("one education entry", r.education, 1);
      a.includes("education school", r.education[0]?.school, "Community College of Denver");
      a.minCount("skills parsed", r.skills, 4);
    },
  },
  {
    file: "professional-profile.txt",
    title: "Header variants — PROFESSIONAL PROFILE + EMPLOYMENT HISTORY",
    run(r, a) {
      a.eq("name", r.name, "Elena Petrova");
      a.includes("PROFESSIONAL PROFILE lands in summary", r.summary, "Registered nurse");
      a.count("two roles via EMPLOYMENT HISTORY", r.experience, 2);
      a.eq("role 1 title", r.experience[0]?.title, "Registered Nurse");
      a.count("one education entry", r.education, 1);
      a.includes("education school", r.education[0]?.school, "Northeastern University");
    },
  },
  {
    file: "career-summary.txt",
    title: "Header variants — CAREER SUMMARY + PROFESSIONAL EXPERIENCE",
    run(r, a) {
      a.eq("name", r.name, "David Osei");
      a.includes("CAREER SUMMARY lands in summary", r.summary, "Electrician");
      a.count("two roles via PROFESSIONAL EXPERIENCE", r.experience, 2);
      a.count("one education entry", r.education, 1);
      a.includes("education school", r.education[0]?.school, "Atlanta Technical College");
      a.includes("education degree keeps Certificate", r.education[0]?.degree, "Certificate");
    },
  },
  {
    file: "international-dates.txt",
    title: "International / alternate date formats — ISO, day-first, dotted abbreviations, open-ended",
    run(r, a) {
      a.eq("name", r.name, "Lucas Meyer");
      a.eq("location", r.location, "Toronto, ON");
      a.count("five roles", r.experience, 5);
      a.eq("role 1 title (ISO range)", r.experience[0]?.title, "Systems Administrator");
      a.jobDates("ISO range (2019-03 – 2021-11) dates the role", r.experience[0]);
      a.eq("ISO dates are kept verbatim", r.experience[0]?.dates, "2019-03 – 2021-11");
      a.count(
        "role 1 keeps all four bullets (lone ISO token / phone-like string in bullets spawn no role)",
        r.experience[0]?.bullets,
        4
      );
      a.eq("role 2 title (day-first range)", r.experience[1]?.title, "Network Technician");
      a.jobDates("day-first range (12 March 2016 – 4 June 2018) dates the role", r.experience[1]);
      a.eq("day-first dates are kept verbatim", r.experience[1]?.dates, "12 March 2016 – 4 June 2018");
      a.jobDates("dotted-abbrev range (Mar. 2014 – Jun. 2016) dates the role", r.experience[2]);
      a.includes("dotted-abbrev dates are kept verbatim", r.experience[2]?.dates, "Jun. 2016");
      a.jobDates("open-ended 'Since 2021' dates the role", r.experience[3]);
      a.eq("open-ended dates are kept verbatim", r.experience[3]?.dates, "Since 2021");
      a.count(
        "role 4 prose line carrying a lone ISO token stays a bullet (no phantom role, no dates)",
        r.experience[3]?.bullets,
        3
      );
      a.eq("role 5 title (open-ended From)", r.experience[4]?.title, "Seasonal Support Associate");
      a.jobDates("open-ended 'From Sep 2022' dates the role", r.experience[4]);
      a.eq("'From Sep 2022' is kept verbatim", r.experience[4]?.dates, "From Sep 2022");
      a.count("one education entry", r.education, 1);
      a.includes("education school", r.education[0]?.school, "Seneca College");
    },
  }
);

CASES.push(
  {
    file: "federal-multiline.txt",
    title: "Federal multi-line headers — title/company/dates on separate lines, GS grade on title line and standalone, Title Case Training header",
    run(r, a) {
      a.eq("name", r.name, "Michael Ortiz");
      a.includes("summary keeps the qualifications prose", r.summary, "administrative specialist");
      a.check("summary has no grade code leaked into it", !/GS-0962/.test(r.summary), {
        detail: `got ${JSON.stringify(r.summary)}`,
      });
      a.count("two roles (no phantom jobs from split headers)", r.experience, 2);
      a.eq("role 1 title (grade segment dropped)", r.experience[0]?.title, "Program Support Specialist");
      a.includes("role 1 company from its own line", r.experience[0]?.company, "Bureau of Land Management");
      a.includes("role 1 dates from the dates-only line", r.experience[0]?.dates, "03/2016");
      a.minCount("role 1 bullets", r.experience[0]?.bullets, 2);
      a.eq("role 2 title", r.experience[1]?.title, "Administrative Assistant");
      a.includes("role 2 company is the agency, not the grade line", r.experience[1]?.company, "Forest Service");
      a.includes("role 2 dates", r.experience[1]?.dates, "Jan 2012");
      a.check(
        "no role's company is a grade code",
        r.experience.every((j) => !/GS-\d/.test(j.company ?? "")),
        { detail: `got ${JSON.stringify(r.experience.map((j) => j.company))}` }
      );
      a.count("Title Case 'Training' header lands in certifications", r.certifications, 2);
      a.includes("certifications include the records course", r.certifications.join(" | "), "Records Management");
      a.count("one education entry", r.education, 1);
    },
  },
  {
    file: "batch-patterns.txt",
    title: "Batch patterns — Career Highlights, Areas of Expertise, colon skill labels, label-only group line, project description, trailing pipe, Licenses and Endorsements",
    run(r, a) {
      a.eq("name", r.name, "Robin Alvarez");
      a.includes("highlights prose lands in summary (combined handler)", r.summary, "Raised event attendance");
      a.check("summary has no 'Career Highlights' header text", !/Career Highlights/.test(r.summary), {
        detail: `got ${JSON.stringify(r.summary)}`,
      });
      a.hasSkill("Areas of Expertise item lands in skills", r.skills, "Volunteer Management");
      a.hasSkill("label-stripped skill (Salesforce)", r.skills, "Salesforce");
      a.hasSkill("one-word label not glued (stakeholder briefings)", r.skills, "stakeholder briefings");
      a.hasSkill("label-only group line kept as a skill", r.skills, "Project Coordination");
      a.hasSkill("items after a label-only line survive", r.skills, "budget tracking");
      a.check("no skill entry carries a colon label", r.skills.every((s) => !s.includes(":")), {
        detail: `got ${JSON.stringify(r.skills)}`,
      });
      a.count("two roles", r.experience, 2);
      a.includes("role 1 company", r.experience[0]?.company, "Mile High United Way, Denver");
      a.check("role 1 company has no trailing pipe", !(r.experience[0]?.company ?? "").includes("|"), {
        detail: `got ${JSON.stringify(r.experience[0]?.company)}`,
      });
      a.count("one project (description is not a second project)", r.projects, 1);
      a.eq("project name", r.projects[0]?.name, "Volunteer Portal");
      a.includes("project description captured", r.projects[0]?.description, "Web portal");
      a.minCount("project bullets", r.projects[0]?.bullets, 1);
      a.count("Licenses and Endorsements land in certifications", r.certifications, 2);
      a.includes("certifications include Notary Public", r.certifications.join(" | "), "Notary Public");
      a.count("one education entry", r.education, 1);
    },
  }
);

/* ---------------- PDF extraction cases (synthetic item streams) -------- */

/**
 * Verbatim copy of the pre-Cycle-9 page algorithm (group on rounded Y,
 * join in stream order). It is the reference for the column-mode guards:
 * any page that does not trigger column detection must come out of
 * extractPdfText byte-identical to this.
 */
function legacyPageText(items) {
  const lines = new Map();
  for (const it of items) {
    const y = Math.round(it.transform[5]);
    if (!lines.has(y)) lines.set(y, []);
    lines.get(y).push(it.str);
  }
  const sorted = Array.from(lines.entries()).sort((a, b) => b[0] - a[0]);
  return sorted.map(([, parts]) => parts.join(" ").trim()).filter(Boolean).join("\n");
}

/** A pdf.js text item in page coordinates (origin bottom-left, y up). */
const item = (str, x, y, w, size = 11) => ({
  str,
  transform: [size, 0, 0, size, x, y],
  width: w,
});

/** The pdf-like object extractPdfText consumes, serving `pagesItems`. */
const fakePdf = (pagesItems) => ({
  numPages: pagesItems.length,
  getPage: async (n) => ({
    getTextContent: async () => ({ items: pagesItems[n - 1] }),
  }),
});

/* A standard single-column page (widths are realistic pdf.js user-space
 * extents). Column detection must NOT fire: extraction must equal the
 * legacy algorithm byte for byte. */
const SINGLE_COLUMN_ITEMS = [
  item("Priya Nair", 72, 750, 105, 20),
  item("Tampa, FL | 813-555-0142 | priya.nair@example.com", 72, 730, 318),
  item("SUMMARY", 72, 700, 62),
  item("Marketing manager with eight years of experience growing pipeline", 72, 682, 452),
  item("for B2B software teams and leading small creative groups.", 72, 664, 408),
  item("EXPERIENCE", 72, 628, 78),
  item("Senior Marketing Manager, Brightpath Software, Tampa, FL, Mar 2021 – Present", 72, 610, 486),
  item("• Grew qualified pipeline 38 percent year over year", 90, 592, 330),
  item("• Led a team of four across content and demand programs", 90, 574, 372),
  item("Marketing Specialist, Suncoast Media, St. Petersburg, FL, Jun 2018 – Feb 2021", 72, 538, 492),
  item("• Ran paid search campaigns across three product lines", 90, 520, 352),
  item("• Wrote landing page copy that lifted conversion 12 percent", 90, 502, 386),
  item("EDUCATION", 72, 466, 72),
  item("Bachelor of Science in Marketing, University of South Florida, May 2014", 72, 448, 462),
  item("SKILLS", 72, 412, 42),
  item("SEO, Content Strategy, Email Marketing, Google Analytics, HubSpot", 72, 394, 438),
];

/* The Daniel Reyes two-column resume (same content as
 * two-column-interleaved.txt) as a positioned item stream, ordered
 * row-major the way a generator painting row-by-row emits it: sidebar at
 * x=40 (ends by x≈172), main column at x=210, a ~38pt gutter between
 * them, and a page-wide contact line crossing the gutter. */
const TWO_COLUMN_ITEMS = [
  item("Daniel Reyes", 40, 750, 115, 20),
  item("Austin, TX | 512-555-0119 | daniel.reyes@example.com", 40, 730, 338),
  item("SKILLS", 40, 700, 38),
  item("PROFESSIONAL SUMMARY", 210, 700, 150),
  item("Forecasting", 40, 682, 72),
  item("Operations manager with nine years of experience leading", 210, 682, 338),
  item("Inventory Planning", 40, 664, 102),
  item("warehouse teams and improving on-time delivery across", 210, 664, 320),
  item("Team Leadership", 40, 646, 92),
  item("three distribution centers.", 210, 646, 150),
  item("EDUCATION", 40, 614, 62),
  item("EXPERIENCE", 210, 614, 72),
  item("Bachelor of Business", 40, 596, 108),
  item("Warehouse Manager, Gulf Coast Logistics, Houston, TX,", 210, 596, 286),
  item("Mar 2018 – Present", 478, 596, 110),
  item("Administration,", 40, 578, 82),
  item("• Directed a 24-person warehouse team across two shifts", 210, 578, 320),
  item("University of Houston,", 40, 560, 118),
  item("• Raised on-time shipment rate from 91 to 98 percent", 210, 560, 318),
  item("2014", 40, 542, 26),
  item("Warehouse Supervisor, Gulf Coast Logistics, Jun 2015 – Mar 2018", 210, 542, 352),
  item("CERTIFICATIONS", 40, 510, 98),
  item("• Supervised a team of eight associates on the night shift", 210, 510, 322),
  item("Six Sigma Green Belt", 40, 492, 108),
  item("• Trained new hires on safety and scanning procedures", 210, 492, 308),
  item("Forklift Operator License", 40, 474, 132),
];

const TWO_COLUMN_EXPECTED = [
  "Daniel Reyes",
  "Austin, TX | 512-555-0119 | daniel.reyes@example.com",
  "SKILLS",
  "Forecasting",
  "Inventory Planning",
  "Team Leadership",
  "EDUCATION",
  "Bachelor of Business",
  "Administration,",
  "University of Houston,",
  "2014",
  "CERTIFICATIONS",
  "Six Sigma Green Belt",
  "Forklift Operator License",
  "PROFESSIONAL SUMMARY",
  "Operations manager with nine years of experience leading",
  "warehouse teams and improving on-time delivery across",
  "three distribution centers.",
  "EXPERIENCE",
  "Warehouse Manager, Gulf Coast Logistics, Houston, TX, Mar 2018 – Present",
  "• Directed a 24-person warehouse team across two shifts",
  "• Raised on-time shipment rate from 91 to 98 percent",
  "Warehouse Supervisor, Gulf Coast Logistics, Jun 2015 – Mar 2018",
  "• Supervised a team of eight associates on the night shift",
  "• Trained new hires on safety and scanning procedures",
].join("\n");

/* Centered-header single-column page: section headers and the name sit
 * mid-page, body text runs full width. No column mode may fire — every
 * candidate split is crossed by full-width body lines or fails the
 * vertical-span guard. */
const CENTERED_ITEMS = [
  item("Hannah Kim", 251, 750, 110, 20),
  item("Denver, CO | 303-555-0176 | hannah.kim@example.com", 141, 730, 330),
  item("SUMMARY", 268, 700, 76),
  item("Customer service professional with six years of experience helping", 72, 682, 468),
  item("retail customers resolve billing and shipping problems calmly.", 72, 664, 452),
  item("EXPERIENCE", 262, 628, 88),
  item("Customer Service Representative, Mile High Retail, Denver, CO, Apr 2019 – Present", 72, 610, 496),
  item("• Resolved an average of 45 customer tickets per day", 90, 592, 348),
  item("• Trained six new hires on the support playbook", 90, 574, 320),
  item("EDUCATION", 264, 538, 84),
  item("Associate of Arts, Community College of Denver, May 2016", 72, 520, 392),
  item("SKILLS", 272, 484, 68),
  item("Customer Support, Ticketing Systems, De-escalation, Billing Support", 72, 466, 452),
];

/* A jobs table: a dates cell and a header cell share every row. The
 * geometry looks column-like, but the left "column" is almost entirely
 * date ranges — the table guard must keep row pairing intact, so
 * extraction must equal the legacy algorithm byte for byte. */
const TABLE_ITEMS = [
  item("Samuel Ortiz", 72, 750, 120, 20),
  item("Chicago, IL | 312-555-0128 | samuel.ortiz@example.com", 72, 730, 338),
  item("Mar 2018 – Present", 72, 690, 105),
  item("Operations Manager, Brightline Logistics", 215, 690, 265),
  item("• Directed warehouse operations across two facilities", 215, 668, 320),
  item("Jun 2015 – Mar 2018", 72, 626, 112),
  item("Warehouse Supervisor, Brightline Logistics", 215, 626, 272),
  item("• Supervised a team of eight associates on the night shift", 215, 604, 352),
  item("Mar 2013 – May 2016", 72, 562, 112),
  item("Shipping Lead, Northgate Distribution", 215, 562, 238),
  item("• Coordinated outbound shipments for regional accounts", 215, 540, 338),
];

const EXTRACTION_CASES = [
  {
    id: "pdf-single-column",
    title: "PDF extraction — single-column page stays byte-identical to the legacy algorithm",
    async run(mod, a) {
      const text = await mod.extractPdfText(fakePdf([SINGLE_COLUMN_ITEMS]));
      a.eq("single-column extraction is byte-identical to legacy", text, legacyPageText(SINGLE_COLUMN_ITEMS));
      const r = mod.textToStructured(text);
      a.eq("single-column page still parses its name", r.name, "Priya Nair");
      a.count("single-column page still parses two roles", r.experience, 2);
    },
  },
  {
    id: "pdf-two-column-interleaved",
    title: "PDF extraction — two-column page is column-sequenced, then parses fully (Cycle 9 fix)",
    async run(mod, a) {
      a.includes(
        "the legacy algorithm interleaves this item stream (the original bug)",
        legacyPageText(TWO_COLUMN_ITEMS),
        "SKILLS PROFESSIONAL SUMMARY"
      );
      const text = await mod.extractPdfText(fakePdf([TWO_COLUMN_ITEMS]));
      a.eq("column-aware extraction emits sidebar, then main column", text, TWO_COLUMN_EXPECTED);
      const r = mod.textToStructured(text);
      a.includes("summary survives interleaving", r.summary, "Operations manager");
      a.count("two roles survive interleaving", r.experience, 2);
      a.check(
        "a role is titled 'Warehouse Manager'",
        r.experience.some((j) => j.title === "Warehouse Manager")
      );
      a.count("one education entry survives interleaving", r.education, 1);
      a.hasSkill("listed skills survive interleaving (Forecasting)", r.skills, "Forecasting");
    },
  },
  {
    id: "pdf-centered-layout",
    title: "PDF extraction — centered-header layout does NOT trigger column mode",
    async run(mod, a) {
      const text = await mod.extractPdfText(fakePdf([CENTERED_ITEMS]));
      a.eq("centered layout extraction is byte-identical to legacy", text, legacyPageText(CENTERED_ITEMS));
    },
  },
  {
    id: "pdf-table-layout",
    title: "PDF extraction — jobs table does NOT trigger column mode (dates column guard)",
    async run(mod, a) {
      const text = await mod.extractPdfText(fakePdf([TABLE_ITEMS]));
      a.eq("table layout extraction is byte-identical to legacy", text, legacyPageText(TABLE_ITEMS));
    },
  },
];

/* ---------------- main ---------------- */

async function main() {
  const { mod, out } = buildParser();
  try {
    const results = [];
    for (const c of CASES) {
      const text = readFileSync(path.join(fixturesDir, c.file), "utf8");
      let parsed;
      try {
        parsed = mod.textToStructured(text);
      } catch (err) {
        results.push({
          fixture: c.file,
          label: `parser threw: ${err instanceof Error ? err.message : String(err)}`,
          pass: false,
          detail: "exception",
        });
        continue;
      }
      c.run(parsed, collector(results, c.file));
    }

    for (const c of EXTRACTION_CASES) {
      try {
        await c.run(mod, collector(results, c.id));
      } catch (err) {
        results.push({
          fixture: c.id,
          label: `extraction case threw: ${err instanceof Error ? err.message : String(err)}`,
          pass: false,
          detail: "exception",
        });
      }
    }

    const TITLES = [
      ...CASES.map((c) => ({ file: c.file, title: c.title })),
      ...EXTRACTION_CASES.map((c) => ({ file: c.id, title: c.title })),
    ];
    let lastFixture = "";
    for (const res of results) {
      if (res.fixture !== lastFixture) {
        const c = TITLES.find((x) => x.file === res.fixture);
        console.log(`\n${res.fixture} — ${c ? c.title : ""}`);
        lastFixture = res.fixture;
      }
      if (res.pass) {
        console.log(`  ✓ ${res.label}`);
      } else if (res.issue) {
        console.log(`  ✗ ${res.label}  [KNOWN ISSUE]`);
        console.log(`      ${res.detail}`);
        console.log(`      ${res.issue}`);
      } else {
        console.log(`  ✗ ${res.label}`);
        console.log(`      ${res.detail ?? ""}`);
      }
    }

    const total = results.length;
    const passed = results.filter((r) => r.pass).length;
    const known = results.filter((r) => !r.pass && r.issue).length;
    const failed = results.filter((r) => !r.pass && !r.issue).length;
    console.log(
      `\nSUMMARY: ${total} assertions · ${passed} passed · ${failed} failed · ${known} known parser issues`
    );
    if (failed > 0) {
      console.log("RESULT: FAIL");
      process.exitCode = 1;
    } else {
      console.log("RESULT: PASS (with known issues documented above)");
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

await main();
