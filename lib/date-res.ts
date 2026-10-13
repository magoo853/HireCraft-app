/* Shared date atoms for resume parsing: used by ./parse (job-header and
 * section logic) and ./parse-file (PDF column detection's date-like test).
 * Single source of truth so the two can never drift apart. */

export const MONTHS = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|Sept|October|November|December";
// One date atom. The ISO form (YYYY-MM) must precede the bare year so a
// range like "2019-03 – 2021-11" is not truncated at the ISO month's dash;
// the day-first form covers "12 March 2016". A bare atom can never match on
// its own here — DATE_RANGE_RE always requires two atoms around a dash.
const DATE_ATOM = `(?:${MONTHS})\\.?\\s+\\d{4}|\\d{1,2}\\s+(?:${MONTHS})\\.?\\s+\\d{4}|\\d{4}-\\d{2}|\\d{1,2}/\\d{4}|\\d{4}`;
/** A full date range anywhere in a line: "Feb 2015 – Present", "Mar 2013 – Mar 2015", "2019 - 2025", "2019-03 – 2021-11", "12 March 2016 – 4 June 2018". */
export const DATE_RANGE_RE = new RegExp(`(${DATE_ATOM})\\s*[-–—]\\s*(${DATE_ATOM}|present|current)`, "i");
/** An open-ended start with no end date: "Since 2021", "From Mar 2019".
 * Kept apart from DATE_RANGE_RE (which requires a separator + end atom)
 * and consulted only for lines inside the experience section, so summary
 * prose like "serving customers since 2021" never trips it. The matched
 * text is kept verbatim — downstream display/scoring only needs the
 * dates string to be non-empty and carry the year. */
export const DATE_OPEN_RE = new RegExp(`\\b(?:since|from)\\s+(?:(?:${MONTHS})\\.?\\s+\\d{4}|\\d{1,2}/\\d{4}|\\d{4})`, "i");
