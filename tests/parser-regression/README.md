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
certifications, and awards. Exit code is 0 unless an unexpected assertion
fails. No new dependencies; nothing in the app imports this folder.

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
