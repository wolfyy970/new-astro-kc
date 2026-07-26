import { describe, it, expect } from "vitest";
import { yearSpan, startYear } from "./dates";
import resume from "../content/resume.json";

describe("yearSpan", () => {
  it("compresses a month-precision range to its years", () => {
    expect(yearSpan("September 2014 - March 2017")).toBe("2014–2017");
    expect(yearSpan("Dec 2008 - Oct 2012")).toBe("2008–2012");
  });

  it("leaves an ongoing role open-ended", () => {
    // The trailing en dash runs into the text column, which is how the rail
    // says "still there" without a word.
    expect(yearSpan("January 2023 - Present")).toBe("2023–");
    expect(yearSpan("Jan 2023 - present")).toBe("2023–");
    expect(yearSpan("2023 - Current")).toBe("2023–");
  });

  it("handles a range that is already years only", () => {
    expect(yearSpan("1991 - 1992")).toBe("1991–1992");
  });

  it("collapses a role that starts and ends in one year", () => {
    // "2019–2019" would be a column of noise.
    expect(yearSpan("March 2019 - November 2019")).toBe("2019");
  });

  it("returns the input untouched when it holds no year", () => {
    expect(yearSpan("Ongoing")).toBe("Ongoing");
    expect(yearSpan("")).toBe("");
  });

  it("ignores stray numbers that are not four digits", () => {
    expect(yearSpan("Q3 2015 - Q1 2018")).toBe("2015–2018");
  });
});

describe("startYear", () => {
  it("returns the first four-digit year", () => {
    expect(startYear("September 2014 - March 2017")).toBe("2014");
    expect(startYear("January 2023 - Present")).toBe("2023");
  });

  it("returns the input untouched when it holds no year", () => {
    expect(startYear("Ongoing")).toBe("Ongoing");
  });
});

describe("the rail against the real résumé", () => {
  // The rail only reads as a column if every entry produces a value of the same
  // shape. Driven off the real data so a new role with an unusual date string
  // fails here rather than silently rendering a paragraph in the margin.
  it("produces a compact span for every experience entry", () => {
    for (const job of resume.experience) {
      const span = yearSpan(job.dates);
      expect(span.length).toBeLessThanOrEqual(9);
      expect(span).toMatch(/^\d{4}(–(\d{4})?)?$/);
    }
  });

  it("produces a bare four-digit year for every entry at the narrow tier", () => {
    for (const job of resume.experience) {
      expect(startYear(job.dates)).toMatch(/^\d{4}$/);
    }
  });

  it("orders newest first, so the rail runs backwards down the page", () => {
    const starts = resume.experience.map((j) => Number(startYear(j.dates)));
    const sorted = [...starts].sort((a, b) => b - a);
    expect(starts).toEqual(sorted);
  });
});
