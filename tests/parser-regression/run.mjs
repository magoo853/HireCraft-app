#!/usr/bin/env node
/**
 * HireCraft parser regression suite.
 *
 * Exercises lib/parse.ts `textToStructured()` (and the LinkedIn router)
 * against a set of fully synthetic resume fixtures and asserts the parsed
 * fields a user would check first: name/contact, summary, dated roles,
 * education, skills, certifications, and awards.
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

/* Compile lib/parse.ts (+ its types import) with the project's own tsc
 * into a throwaway dir and load the CommonJS output. */
function buildParser() {
  const out = mkdtempSync(path.join(tmpdir(), "hc-parse-build-"));
  const tsc = path.join(root, "node_modules", "typescript", "bin", "tsc");
  execFileSync(
    process.execPath,
    [
      tsc,
      path.join(root, "lib", "parse.ts"),
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
  return { mod: require(path.join(out, "parse.js")), out };
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

/* ---------------- main ---------------- */

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

  let lastFixture = "";
  for (const res of results) {
    if (res.fixture !== lastFixture) {
      const c = CASES.find((x) => x.file === res.fixture);
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
