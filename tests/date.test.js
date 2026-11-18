import { describe, expect, it } from "vitest";
import { addDays, dueMeta, toISODate } from "../src/lib/date.js";

describe("toISODate", () => {
  it("formats a date as YYYY-MM-DD", () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("addDays", () => {
  it("adds days without mutating the input", () => {
    const base = new Date(2026, 0, 1);
    const result = addDays(base, 3);
    expect(toISODate(result)).toBe("2026-01-04");
    expect(toISODate(base)).toBe("2026-01-01");
  });
});

describe("dueMeta", () => {
  it("returns null when there is no due date", () => {
    expect(dueMeta(null, "todo")).toBeNull();
  });

  it("marks a done card with its completion date", () => {
    expect(dueMeta("2026-01-01", "done")).toEqual({ label: "1월 1일", cls: "done" });
  });

  it("flags a past due date as overdue", () => {
    const yesterday = toISODate(addDays(new Date(), -1));
    expect(dueMeta(yesterday, "todo")).toEqual({ label: "1일 지남", cls: "overdue" });
  });

  it("flags today as due soon", () => {
    const today = toISODate(new Date());
    expect(dueMeta(today, "doing")).toEqual({ label: "오늘 마감", cls: "soon" });
  });

  it("shows a D-day countdown for future dates", () => {
    const future = toISODate(addDays(new Date(), 5));
    expect(dueMeta(future, "todo")).toEqual({ label: "D-5", cls: "normal" });
  });
});
