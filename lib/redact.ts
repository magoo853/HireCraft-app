/**
 * redactDocumentText — the PII filter for evaluation / performance-review
 * text (launch-readiness backlog B1; James's standing rule: eval/review
 * uploads are parsed for ACCOMPLISHMENTS ONLY — identifier fields are never
 * read, stored, or forwarded).
 *
 * Applied at every intake point (eval file upload, eval paste, civilian
 * review file upload, civilian review paste) so newly stored state never
 * holds identifiers, AND server-side at the /api/ai ingestion point so
 * legacy text already stored on a user's device is filtered before it can
 * reach the AI prompt or the deterministic mining engine.
 *
 * Three passes, in order:
 *
 * 1. LABELED-FIELD STRIPPING (position-independent). A line whose leading
 *    label marks it as an identifier field — Name / Ratee / Rater /
 *    Supervisor / SSN / SSAN / Social Security / DoD ID / EDIPI / Employee
 *    ID / DOB / Date of Birth / Address / Phone / Email / Unit /
 *    Organization headers, etc. — is dropped WHOLE (label + value).
 *    Two tiers, deliberately:
 *      - Tier A labels must be followed by a strong separator (`:`, `=`,
 *        or ` - `). A body sentence that merely STARTS with a word like
 *        "Phone" or "Unit" ("Phone calls rose 18 percent", "Unit cost
 *        savings totaled $18,500") has no such separator and is kept.
 *      - Tier B labels (SSN, SSAN, Social Security, DoD ID, EDIPI, Employee
 *        ID, DOB) also match with a bare whitespace separator, because real
 *        eval headers write "SSN 123-45-6789" with no colon.
 *    An optional leading field number ("1. Name: …") is allowed.
 *
 * 2. PATTERN REDACTION (anywhere in a kept line). Matched digit runs are
 *    replaced with "[redacted]":
 *      - SSN formats: 123-45-6789 and 123 45 6789.
 *      - A bare 9-digit run, but ONLY on a line that carries an SSN label
 *        (an unlabeled 9-digit run is not provably an SSN).
 *      - 10-digit runs: DoD ID / EDIPI numbers and contiguous phone
 *        numbers, plus formatted phones (123-456-7890, 123.456.7890,
 *        (123) 456-7890).
 *      - Email addresses.
 *    The rest of the line survives untouched.
 *
 * 3. HEADER-BLOCK PASS (first 12 lines only). Eval/review headers also
 *    carry UNLABELED identifier lines — a bare ratee name, a bare unit or
 *    address line — with no label to key on. Within the leading block a
 *    line is dropped only when it is PURELY identifier-shaped:
 *      - just a capitalized person name ("John M. Doe", "Doe, John M.",
 *        all-caps variants): letters/initials only, 2–4 tokens, no digits,
 *        no sentence punctuation;
 *      - just a date (a bare DOB-style line);
 *      - an address line (street suffix, PO Box, or ZIP) with no sentence
 *        punctuation;
 *      - a unit line ending in a unit designator (Squadron, Wing,
 *        Battalion, … AFB/Base) with no sentence punctuation.
 *    CONSERVATIVE BEATS CLEVER: a header line with sentence punctuation or
 *    any achievement content is KEPT. When in doubt, keep the line.
 *
 * PRESERVATION CONTRACT (critical): accomplishment body text passes
 * through BYTE-IDENTICAL when it contains no identifiers. Metrics
 * ("1,400 requisitions", "99 percent", "$18,500", "24-person team",
 * "18 percent"), dates inside body sentences, and ordinary prose are
 * never touched — no pattern above matches comma-grouped numbers,
 * percentages, dollar amounts, short digit runs, or punctuated sentences.
 *
 * The function is pure, idempotent ("[redacted]" and dropped lines are
 * stable under a second pass), and safe on empty/garbage input.
 */

const REDACTED = "[redacted]";
const HEADER_LINES = 12;

/* Tier A: identifier labels that require a strong separator (`:`, `=`,
   or ` - `) before the line is treated as a labeled field. */
const TIER_A_LABELS = [
  "ratee name", "rater name", "supervisor name", "employee name",
  "senior rater", "ratee", "rater", "supervisor", "evaluator",
  "name", "employee", "member",
  "social security number", "social security",
  "dod id number", "dod id", "edipi",
  "employee id", "emp id", "id number", "service number",
  "date of birth", "dob",
  "home address", "mailing address", "street address", "address",
  "home phone", "work phone", "phone number", "phone", "telephone",
  "cell phone", "mobile",
  "email address", "e-mail", "email",
  "unit/organization", "unit / organization", "organization", "organisation", "unit",
  "rank/grade", "rank", "grade",
];

/* Tier B: labels strong enough to also match with a bare whitespace
   separator ("SSN 123-45-6789"). Kept narrow on purpose: none of these
   words plausibly opens an accomplishment sentence. */
const TIER_B_LABELS = [
  "ssn/ssan", "ssn", "ssan", "social security",
  "dod id", "edipi", "employee id", "dob",
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const byLengthDesc = (a: string, b: string) => b.length - a.length;

const LABEL_PREFIX = String.raw`^\s*(?:\d{1,2}\s*[.)]\s*)?`;
const TIER_A_RE = new RegExp(
  `${LABEL_PREFIX}(?:${TIER_A_LABELS.slice().sort(byLengthDesc).map(escapeRe).join("|")})\\s*(?::|=|\\s[-—–]\\s)`,
  "i"
);
const TIER_B_RE = new RegExp(
  `${LABEL_PREFIX}(?:${TIER_B_LABELS.slice().sort(byLengthDesc).map(escapeRe).join("|")})\\b\\s*:?\\s+\\S`,
  "i"
);

/* Unlabeled header-block shapes (pass 3). */
/* "Doe, John M." / "Doe, John" */
const NAME_COMMA_RE = /^[A-Z][A-Za-z'’-]+,\s*[A-Z][A-Za-z'’-]+(?:\s+[A-Z]\.?)?$/;
/* "John M. Doe" / "JOHN M DOE" — 2–4 capitalized tokens, initials allowed,
   no digits, no sentence punctuation (a trailing initial's period is ok). */
const NAME_PLAIN_RE = /^[A-Z][A-Za-z'’-]+(?:\s+(?:[A-Z]\.?\s+)?[A-Z][A-Za-z'’-]+){1,3}$/;
/* A bare date line: "12 Jan 1990", "01/15/1990", "1990-01-15". */
const BARE_DATE_RE = /^(?:\d{1,2}[\s/-][A-Za-z]{3,9}[\s/-]\d{2,4}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})$/;
const ADDRESS_RE = /\b(?:st|street|ave|avenue|blvd|rd|road|dr|drive|ln|lane|ct|court|hwy|p\.?\s?o\.?\s?box)\b\.?|\b\d{5}(?:-\d{4})?\b/i;
const UNIT_RE = /(?:squadron|group|wing|battalion|brigade|regiment|company|detachment|battalion|unit|afb|nas|base)\s*$/i;
const SENTENCE_PUNCT_RE = /[.!?;]/;

const SSN_DASH_RE = /\b\d{3}-\d{2}-\d{4}\b/g;
const SSN_SPACE_RE = /\b\d{3} \d{2} \d{4}\b/g;
const SSN_LABEL_CONTEXT_RE = /\b(?:ssn|ssan|social security)\b/i;
const NINE_DIGIT_RE = /\b\d{9}\b/g;
const TEN_DIGIT_RE = /\b\d{10}\b/g;
const PHONE_RE = /(?:\(\d{3}\)\s?|\b\d{3}[-. ])\d{3}[-. ]\d{4}\b/g;
const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

function isLabeledIdentifierLine(line: string): boolean {
  return TIER_A_RE.test(line) || TIER_B_RE.test(line);
}

function isUnlabeledHeaderIdentifier(line: string, inHeader: boolean): boolean {
  if (!inHeader) return false;
  const t = line.trim();
  if (!t) return false;
  if (NAME_COMMA_RE.test(t) || NAME_PLAIN_RE.test(t)) return true;
  if (BARE_DATE_RE.test(t)) return true;
  /* Address and unit lines are only dropped when they carry no sentence
     punctuation — a punctuated line is prose, not a header field. */
  if (!SENTENCE_PUNCT_RE.test(t) && ADDRESS_RE.test(t)) return true;
  if (!SENTENCE_PUNCT_RE.test(t) && UNIT_RE.test(t)) return true;
  return false;
}

function redactPatterns(line: string): string {
  let out = line.replace(SSN_DASH_RE, REDACTED).replace(SSN_SPACE_RE, REDACTED);
  if (SSN_LABEL_CONTEXT_RE.test(out)) out = out.replace(NINE_DIGIT_RE, REDACTED);
  out = out.replace(PHONE_RE, REDACTED).replace(TEN_DIGIT_RE, REDACTED);
  out = out.replace(EMAIL_RE, REDACTED);
  return out;
}

export function redactDocumentText(text: string): string {
  if (!text) return text;
  /* Split into line chunks that RETAIN their terminators, so kept lines
     rejoin byte-identically (including \r\n input). */
  const chunks = text.split(/(?<=\n)/);
  const kept: string[] = [];
  let lineIndex = 0;
  for (const chunk of chunks) {
    if (chunk === "") continue;
    const line = chunk.replace(/[\r\n]+$/, "");
    if (isLabeledIdentifierLine(line) || isUnlabeledHeaderIdentifier(line, lineIndex < HEADER_LINES)) {
      lineIndex++;
      continue; // dropped whole — line and its terminator
    }
    kept.push(redactPatterns(line) + chunk.slice(line.length));
    lineIndex++;
  }
  return kept.join("");
}
