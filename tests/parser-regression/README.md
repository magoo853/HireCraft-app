# Parser regression suite

Synthetic-fixture regression tests for `lib/parse.ts` (`textToStructured`
and the LinkedIn profile router). Every fixture is a fictional resume —
invented people, 555 phone numbers, `example.com` emails. No real user
data is used or needed.

## Run

```bash
node tests/parser-regression/run.mjs
```

The runner compiles `lib/parse.ts` with the project's own TypeScript
(`node_modules/typescript`) into a temp directory, loads it in Node, feeds
each fixture through `textToStructured()`, and asserts the fields users
check first: name/contact, summary, dated roles, education, skills,
certifications, and awards. A second phase feeds synthetic pdf.js item
streams (positioned text items, hand-built below in `run.mjs`) through
`extractPdfText()` to pin the column-aware PDF extraction: a
single-column page and two false-positive layouts (centered headers, a
jobs table) must come out byte-identical to the pre-Cycle-9 legacy
algorithm, while a two-column page must come out column-sequenced and
parse fully. Exit code is 0 unless an unexpected assertion fails. No new
dependencies; nothing in the app imports this folder.

## Fixtures

| File | Covers |
| --- | --- |
| `general-civilian.txt` | Standard sections, comma job headers, certs |
| `veteran-army.txt` | `MILITARY EXPERIENCE`, `AWARDS & DECORATIONS` |
| `veteran-marine.txt` | `MILITARY SERVICE`, `PROFESSIONAL MILITARY EDUCATION`, `DECORATIONS`, diploma education |
| `veteran-air-force.txt` | Combined `PROFESSIONAL EXPERIENCE & ABILITY SUMMARY` header, `SECURITY CLEARANCE` section |
| `veteran-navy.txt` | `LICENSES & CERTIFICATIONS`, `HONORS AND AWARDS`, `Current` end date |
| `federal-style.txt` | `SUMMARY OF QUALIFICATIONS`, `WORK EXPERIENCE`, GS grade suffixes after `;` |
| `new-to-workforce.txt` | `OBJECTIVE`, diploma, `PROJECTS`, year-only date range |
| `skills-light.txt` | No SKILLS section — skills must be derived from prose (`deriveSkills`) |
| `messy-formats.txt` | Colon-suffixed headers, `MM/YYYY` dates, skills one-per-line (known-issue probes) |
| `linkedin-export.txt` | LinkedIn export shape — routed to `parseLinkedInProfile` |
| `modern-docx-layout.txt` | Modern DOCX layout — competencies table, education first, two-line job headers, soft hyphens |
| `two-column-block.txt` | Two-column resume as block-sequenced extraction (whole sidebar, then main column) |
| `two-column-interleaved.txt` | Two-column resume as row-interleaved extraction (pdf.js Y-grouping) — parser-level salvage only; the fixed extraction path is covered by the synthetic `pdf-two-column-interleaved` case in `run.mjs` |
| `table-jobs.txt` | Table-based jobs: dates-cell + header-cell rows, and a company on its own row (merged into the role) |
| `table-company-boundary.txt` | Negative boundary: a dateless header after a role that already has a company is NOT absorbed as a company row |
| `header-variants.txt` | `CAREER OBJECTIVE` + `WORK HISTORY` headers |
| `professional-profile.txt` | `PROFESSIONAL PROFILE` + `EMPLOYMENT HISTORY` headers |
| `career-summary.txt` | `CAREER SUMMARY` + `PROFESSIONAL EXPERIENCE` headers |
| `international-dates.txt` | ISO, day-first, dotted-abbreviation, and open-ended date formats |

## Known parser issues (expected-failure probes)

Assertions probing these bugs are tagged with an `issue:` note in
`run.mjs`. They print as `KNOWN ISSUE`, do not fail the suite, and should
have their tags removed once the parser is fixed (they will then act as
ordinary regression assertions):

1. **Colon headers are dropped.** `SECTION_HEADERS` patterns are
   `$`-anchored, so `SUMMARY:` / `EXPERIENCE:` never match; the section
   never opens and every line under it is silently lost.
2. **`MM/YYYY` date ranges are dropped entirely.** `DATE_RANGE_RE` has no
   numeric-month alternative, so `03/2019 - 11/2021` matches nothing: the
   role is still created (short-line header fallback) but its `dates`
   come back empty — the employment dates silently disappear.
3. **Skills listed one-per-line vanish.** Section lines are joined with
   spaces before splitting, so an unseparated list becomes one >40-char
   token that the length filter discards; `deriveSkills()` only recovers
   dictionary terms, so trade skills disappear.
4. **Diploma school/degree are swapped.** The education school finder
   takes the first comma segment matching `/school/i`, which for
   `High School Diploma, <School>, <year>` is the degree segment itself —
   `school` returns `"High School Diploma"` and the real school lands in
   `degree`. Hits every diploma-only resume (the new-to-workforce segment).
5. **Surname leaks into location.** The location regex runs over the
   first 8 lines joined with `"\n"`, and its `\s+` spans the line break:
   when the name line directly precedes a contact line starting with a
   one-word city, the surname is captured as part of the city — `location`
   returns `"Nair\nTampa, FL"` (literal newline included) instead of
   `"Tampa, FL"`. Discovered by this suite (general-civilian and
   federal-style fixtures).

   *Issues 1–5 above were fixed in the 2026-10-13 hardening pass; their
   `issue:` tags remain in `run.mjs` as regression guards and the
   assertions now pass. The issues below are still open.*

6. **Row-interleaved two-column extraction defeats section detection.**
   When a two-column PDF's text comes out interleaved row-by-row (the
   pdf.js Y-grouping in `extractPdfText` joins sidebar and main-column
   text onto shared lines), headers collide — `"SKILLS PROFESSIONAL
   SUMMARY"` matches no pattern — education lines are consumed as job
   headers, and bullets are promoted to phantom roles. Summary, listed
   skills, and education are lost; roles come back mangled. Block-
   sequenced two-column text (whole sidebar first) parses cleanly
   (`two-column-block.txt`). A real fix needs column-aware extraction
   (X-coordinate splitting in `extractPdfText`), not a parser tweak.
   *Issue 6 was fixed in Cycle 9, at the extraction layer:
   `extractPdfText` is now column-aware when a page shows a strong
   two-column signal — two item groups separated by a page-wide empty
   gutter (≥20pt), both substantial (≥4 core items, ≥20% of items) and
   spanning ≥45% of the page height, with only page-wide lines (a
   name/contact header) crossing the split, and neither group mostly
   date ranges (that pattern is a table, whose row pairing is kept).
   Detected pages emit the left column's lines top-to-bottom, then the
   right column's; every other page extracts byte-identically to the
   legacy Y-grouping, which survives verbatim as the fallback. The five
   probes moved from the text fixture (which still documents the
   pre-fix extraction output and asserts the parser-level salvage) into
   the synthetic `pdf-two-column-interleaved` extraction case in
   `run.mjs`, where the same fictional resume goes items → column-aware
   extraction → structured parse and all five now pass as ordinary
   assertions, alongside byte-identity guards for single-column,
   centered-header, and jobs-table pages. One honest residual: a
   full-width section banner in the MIDDLE of a two-column page is
   emitted within the column flow where its X-start places it, not at
   its visual position between the columns' content — cosmetically
   imperfect ordering, but sections still parse.*
   *Issue 7 (table jobs with the company on its own row spawning a
   phantom role) was fixed in Cycle 8: in the experience loop, a short,
   dateless, non-sentence line that arrives while the current role is
   dated, has no company yet, and has no bullets is absorbed as that
   role's company instead of spawning a phantom role that steals the
   bullets. A role that already has a company never absorbs the line —
   `table-company-boundary.txt` guards that boundary. Jobs whose dates
   and header share one row parse cleanly (`table-jobs.txt`).*
   *Issues 8–10 (ISO ranges `2019-03 – 2021-11`, day-first ranges
   `12 March 2016 – 4 June 2018`, and open-ended `Since 2021` /
   `From Sep 2022` starts) were fixed in Cycle 7: `DATE_RANGE_RE`
   gained ISO (`YYYY-MM`) and day-first atoms — the ISO atom ordered
   before the bare year so a range is never truncated at the ISO
   month's dash — and a separate `DATE_OPEN_RE` covers open-ended
   starts, consulted only inside the experience section so summary
   prose never trips it. Their probes were flipped to ordinary
   assertions in `international-dates.txt`, which also guards the
   atoms against misfires (a lone `2019-03` token or a phone-like
   string inside a bullet spawns no role and no dates).*

   *Dotted month abbreviations (`Mar. 2014 – Jun. 2016`) parse correctly
   and are covered by passing assertions in `international-dates.txt`,
   as are the `CAREER OBJECTIVE`, `WORK HISTORY`, `PROFESSIONAL
   PROFILE`, and `CAREER SUMMARY` section headers (fixed in Cycle 6 —
   before the fix, each silently dropped its entire section).* 
