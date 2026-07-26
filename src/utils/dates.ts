// ── Date rail formatting ──────────────────────────────────────────────────────
// The résumé's time axis sets each role's years in a mono rail hanging in the
// sheet margin. The authored strings in resume.json carry month precision
// ("September 2014 - March 2017"); the rail carries years, because a column of
// dates only reads as a column when the digits line up, and on a document
// spanning thirty-four years the months are noise in the margin.
//
// The full authored string is never discarded — index.astro renders it into a
// visually hidden span so assistive technology still gets the precise range.

/**
 * Compresses an authored date range to the span shown in the rail.
 *
 * "September 2014 - March 2017" → "2014–2017"
 * "January 2023 - Present"      → "2023–"   (the dash runs into the text column)
 * "1991 - 1992"                 → "1991–1992"
 * A role inside one year collapses to that year rather than "2019–2019".
 *
 * @param dates Authored range from resume.json.
 * @returns The span, or the input unchanged when it holds no four-digit year.
 */
export function yearSpan(dates: string): string {
  const years = [...dates.matchAll(/\d{4}/g)].map((m) => m[0]);
  if (years.length === 0) return dates;
  const start = years[0];
  if (/present|current/i.test(dates)) return `${start}–`;
  const end = years[years.length - 1];
  return end === start ? start : `${start}–${end}`;
}

/**
 * The start year alone.
 *
 * Shown once the sheet margin is too narrow to hold nine characters — sequence
 * survives where duration will not fit.
 *
 * @param dates Authored range from resume.json.
 * @returns The first four-digit year, or the input unchanged when there is none.
 */
export function startYear(dates: string): string {
  return dates.match(/\d{4}/)?.[0] ?? dates;
}
