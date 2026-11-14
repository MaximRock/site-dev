import { describe, expect, it } from "vitest";
import {
  buildOrderSubject,
  buildOrderText,
  buildMailto,
  EMPTY_ORDER,
  validateOrder,
} from "./order";
import { addLine } from "./cart";

describe("validateOrder", () => {
  const now = new Date("2026-11-02T09:00:00Z");
  const lines = addLine([], "croissant");

  it("accepts a complete draft", () => {
    expect(
      validateOrder(
        {
          name: "Анна",
          phone: "+7 999 123-45-67",
          date: "2026-11-03",
          slot: "10:00-12:00",
          comment: "Без упаковки",
          consent: true,
        },
        lines,
        now,
      ),
    ).toEqual([]);
  });

  it("collects every problem", () => {
    const issues = validateOrder(
      {
        name: "A",
        phone: "123",
        date: "2026-11-02",
        slot: "22:00-23:00",
        comment: "x".repeat(401),
        consent: false,
      },
      [],
      now,
    );

    expect(issues.map((issue) => issue.field)).toEqual([
      "name",
      "phone",
      "date",
      "slot",
      "comment",
      "cart",
      "consent",
    ]);
  });

  it("rejects a future date outside the window", () => {
    expect(
      validateOrder(
        {
          ...EMPTY_ORDER,
          name: "Анна",
          phone: "79991234567",
          date: "2026-12-01",
          slot: "10:00-12:00",
          consent: true,
        },
        lines,
        now,
      ).map((issue) => issue.field),
    ).toContain("date");
  });
});

describe("order text", () => {
  const draft = {
    name: "Анна",
    phone: "+7 999 123-45-67",
    date: "2026-11-03",
    slot: "10:00-12:00",
    comment: "Без упаковки",
    consent: true,
  };
  const lines = addLine(addLine([], "croissant", 2), "filter", 1);

  it("builds the subject and body", () => {
    const subject = buildOrderSubject(draft);
    const text = buildOrderText(draft, lines);

    expect(subject).toBe("Предзаказ на вт, 3 ноября, 10:00-12:00");
    expect(text).toContain("2 × «Круассан с маслом», 1 шт., 360\u00A0₽");
    expect(text).toContain("1 × «Фильтр-кофе», 250 мл, 200\u00A0₽");
    expect(text).toContain("Итого: 560\u00A0₽");
    expect(text).toContain("Комментарий: Без упаковки");
  });

  it("builds a mailto link", () => {
    const mailto = buildMailto(draft, lines);

    expect(mailto.startsWith("mailto:hello@teply-ugolok.example?subject=")).toBe(true);
    expect(mailto).toContain("body=");
  });
});
