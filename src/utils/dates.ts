// ── Date rail formatting ──────────────────────────────────────────────────────
// The résumé's time axis sets each role's dates in a mono rail hanging in the
// sheet margin. Authored strings in resume.json carry month precision
// ("September 2014 - March 2017"); the rail abbreviates months so tenure reads
// at a glance while the digits still stack.
//
// The full authored string is never discarded — index.astro renders it into a
// visually hidden span so assistive technology still gets the precise range.

const MONTHS: Record<string, string> = {
  january: "Jan",
  jan: "Jan",
  february: "Feb",
  feb: "Feb",
  march: "Mar",
  mar: "Mar",
  april: "Apr",
  apr: "Apr",
  may: "May",
  june: "Jun",
  jun: "Jun",
  july: "Jul",
  jul: "Jul",
  august: "Aug",
  aug: "Aug",
  september: "Sep",
  sep: "Sep",
  october: "Oct",
  oct: "Oct",
  november: "Nov",
  nov: "Nov",
  december: "Dec",
  dec: "Dec",
};

type ParsedPart =
  { month?: string; year: string } | { ongoing: true } | { raw: string };

function parsePart(part: string): ParsedPart {
  const trimmed = part.trim();
  if (/^(present|current|ongoing)$/i.test(trimmed)) return { ongoing: true };

  const year = trimmed.match(/\d{4}/)?.[0];
  if (!year) return { raw: trimmed };

  const monthWord = trimmed.match(/^([A-Za-z]+)/)?.[1]?.toLowerCase();
  const month = monthWord ? MONTHS[monthWord] : undefined;
  return { month, year };
}

function formatPart(part: ParsedPart): string {
  if ("ongoing" in part) return "";
  if ("raw" in part) return part.raw;
  return part.month ? `${part.month} ${part.year}` : part.year;
}

function splitRange(dates: string): [string, string] | null {
  const match = dates.match(/^(.+?)\s[-–]\s(.+)$/);
  if (!match) return null;
  return [match[1], match[2]];
}

export type DateRangeLines = {
  start: string;
  end: string | null;
};

/**
 * Splits an authored date range into two rail lines — start above, end below.
 *
 * "September 2014 - March 2017" → { start: "Sep 2014", end: "Mar 2017" }
 * "January 2023 - Present"      → { start: "Jan 2023", end: "–" }
 * "1991 - 1992"                 → { start: "1991", end: "1992" }
 *
 * @param dates Authored range from resume.json.
 */
export function dateRangeLines(dates: string): DateRangeLines {
  const split = splitRange(dates);
  if (!split) {
    const formatted = formatPart(parsePart(dates));
    return { start: formatted || dates, end: null };
  }

  const [startRaw, endRaw] = split;
  const start = parsePart(startRaw);
  const end = parsePart(endRaw);
  const startStr = formatPart(start);

  if (!startStr) return { start: dates, end: null };

  if ("ongoing" in end || /present|current/i.test(endRaw)) {
    return { start: startStr, end: "–" };
  }

  const endStr = formatPart(end);
  if (!endStr) return { start: startStr, end: null };
  if (startStr === endStr) return { start: startStr, end: null };

  return { start: startStr, end: endStr };
}

/**
 * @deprecated Prefer {@link dateRangeLines} for the two-line rail.
 */
export function dateSpan(dates: string): string {
  const { start, end } = dateRangeLines(dates);
  if (!end) return start;
  if (end === "–") return `${start}–`;
  return `${start}–${end}`;
}

/**
 * @deprecated Prefer {@link dateRangeLines}.
 */
export function dateStart(dates: string): string {
  return dateRangeLines(dates).start;
}

/** @deprecated Use {@link dateSpan} */
export const yearSpan = dateSpan;

/** @deprecated Use {@link dateStart} */
export const startYear = dateStart;
