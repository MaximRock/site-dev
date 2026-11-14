import { describe, expect, it } from "vitest";
import {
  addDaysIso,
  formatOrderDate,
  getMoscowIsoDate,
  getOrderDates,
  isFutureOrderDate,
  isOrderDateInRange,
  isValidTimeSlot,
} from "./date";

describe("getMoscowIsoDate", () => {
  it("uses Moscow midnight, not UTC midnight", () => {
    expect(getMoscowIsoDate(new Date("2026-11-02T20:59:00Z"))).toBe("2026-11-02");
    expect(getMoscowIsoDate(new Date("2026-11-02T21:00:00Z"))).toBe("2026-11-03");
  });
});

describe("addDaysIso", () => {
  it("crosses month and year boundaries", () => {
    expect(addDaysIso("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDaysIso("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysIso("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("rejects invalid input", () => {
    expect(() => addDaysIso("2026-02-30", 1)).toThrow();
    expect(() => addDaysIso("not-a-date", 1)).toThrow();
  });
});

describe("formatOrderDate", () => {
  it("writes a Russian weekday and genitive month", () => {
    expect(formatOrderDate("2025-11-07")).toBe("пт, 7 ноября");
    expect(formatOrderDate("2026-01-01")).toBe("чт, 1 января");
  });

  it("rejects invalid dates", () => {
    expect(() => formatOrderDate("2026-13-01")).toThrow();
  });
});

describe("getOrderDates", () => {
  it("starts tomorrow in Moscow and returns seven days", () => {
    const dates = getOrderDates(new Date("2026-11-02T09:00:00Z"), 7);

    expect(dates).toHaveLength(7);
    expect(dates[0]).toMatchObject({ iso: "2026-11-03", label: "вт, 3 ноября" });
    expect(dates[6]?.iso).toBe("2026-11-09");
  });

  it("rejects a non-positive range", () => {
    expect(() => getOrderDates(new Date(), 0)).toThrow();
  });
});

describe("date guards", () => {
  const now = new Date("2026-11-02T09:00:00Z");

  it("only accepts dates after today in Moscow", () => {
    expect(isFutureOrderDate("2026-11-03", now)).toBe(true);
    expect(isFutureOrderDate("2026-11-02", now)).toBe(false);
    expect(isFutureOrderDate("nope", now)).toBe(false);
  });

  it("keeps dates inside the preorder window", () => {
    expect(isOrderDateInRange("2026-11-03", now, 7)).toBe(true);
    expect(isOrderDateInRange("2026-11-09", now, 7)).toBe(true);
    expect(isOrderDateInRange("2026-11-10", now, 7)).toBe(false);
    expect(isOrderDateInRange("2026-11-02", now, 7)).toBe(false);
  });

  it("checks slots against the list", () => {
    expect(isValidTimeSlot("10:00-12:00", ["08:00-10:00", "10:00-12:00"])).toBe(true);
    expect(isValidTimeSlot("22:00-23:00", ["08:00-10:00"])).toBe(false);
  });
});
