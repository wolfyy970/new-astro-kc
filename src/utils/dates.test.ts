import { describe, it, expect } from "vitest";
import { dateRangeLines } from "./dates";
import resume from "../content/resume.json";

describe("dateRangeLines", () => {
  it("splits a month-precision range into start and end lines", () => {
    expect(dateRangeLines("September 2014 - March 2017")).toEqual({
      start: "Sep 2014",
      end: "Mar 2017",
    });
    expect(dateRangeLines("Dec 2008 - Oct 2012")).toEqual({
      start: "Dec 2008",
      end: "Oct 2012",
    });
  });

  it("leaves an ongoing role open on the second line", () => {
    expect(dateRangeLines("January 2023 - Present")).toEqual({
      start: "Jan 2023",
      end: "–",
    });
  });

  it("handles a range that is already years only", () => {
    expect(dateRangeLines("1991 - 1992")).toEqual({
      start: "1991",
      end: "1992",
    });
  });

  it("keeps the start month when the end is year-only", () => {
    expect(dateRangeLines("January 2023 - 2026")).toEqual({
      start: "Jan 2023",
      end: "2026",
    });
  });

  it("formats the current GPC role with a month-precision end", () => {
    expect(dateRangeLines("January 2023 - May 2026")).toEqual({
      start: "Jan 2023",
      end: "May 2026",
    });
    expect(resume.experience[0].dates).toBe("January 2023 - May 2026");
  });

  it("returns one line when start and end match", () => {
    expect(dateRangeLines("March 2019 - March 2019")).toEqual({
      start: "Mar 2019",
      end: null,
    });
  });

  it("returns the input untouched when it holds no year", () => {
    expect(dateRangeLines("Ongoing")).toEqual({ start: "Ongoing", end: null });
    expect(dateRangeLines("")).toEqual({ start: "", end: null });
  });
});

describe("the rail against the real résumé", () => {
  it("produces two short lines for every experience entry", () => {
    for (const job of resume.experience) {
      const { start, end } = dateRangeLines(job.dates);
      expect(start.length).toBeGreaterThan(0);
      expect(start.length).toBeLessThanOrEqual(10);
      if (end) {
        expect(end.length).toBeLessThanOrEqual(10);
      }
    }
  });

  it("orders newest first, so the rail runs backwards down the page", () => {
    const starts = resume.experience.map((j) => {
      const match = dateRangeLines(j.dates).start.match(/\d{4}/);
      return Number(match?.[0]);
    });
    const sorted = [...starts].sort((a, b) => b - a);
    expect(starts).toEqual(sorted);
  });
});
