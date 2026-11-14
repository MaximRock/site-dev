import { describe, expect, it } from "vitest";
import { formatCount, formatMeasure, formatPrice, pluralizeRu } from "./format";

describe("formatPrice", () => {
  it("formats whole roubles", () => {
    expect(formatPrice(420)).toContain("420");
    expect(formatPrice(420)).toContain("₽");
  });
});

describe("formatMeasure", () => {
  it("keeps the unit with the number", () => {
    expect(formatMeasure(900, "г")).toBe("900 г");
    expect(formatMeasure(1, "шт.")).toBe("1 шт.");
  });
});

describe("pluralizeRu", () => {
  const forms = ["позиция", "позиции", "позиций"] as const;

  it.each([
    [0, "позиций"],
    [1, "позиция"],
    [2, "позиции"],
    [4, "позиции"],
    [5, "позиций"],
    [11, "позиций"],
    [14, "позиций"],
    [21, "позиция"],
    [22, "позиции"],
    [25, "позиций"],
    [101, "позиция"],
  ])("picks the right form for %i", (value, expected) => {
    expect(pluralizeRu(value, forms)).toBe(expected);
  });

  it("formats a count", () => {
    expect(formatCount(3, forms)).toBe("3 позиции");
  });
});
