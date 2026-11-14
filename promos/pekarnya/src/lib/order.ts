import { site } from "../data/site";
import { menuItems, type MenuItem } from "../data/menu";
import { formatMeasure, formatPrice } from "./format";
import { formatOrderDate, isOrderDateInRange, isValidTimeSlot } from "./date";
import { type CartLine } from "./cart";

export interface OrderDraft {
  name: string;
  phone: string;
  date: string;
  slot: string;
  comment: string;
  consent: boolean;
}

export type OrderField = "name" | "phone" | "date" | "slot" | "comment" | "consent" | "cart";

export interface OrderIssue {
  field: OrderField;
  message: string;
}

export const EMPTY_ORDER: OrderDraft = {
  name: "",
  phone: "",
  date: "",
  slot: "",
  comment: "",
  consent: false,
};

export function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function validateOrder(
  draft: OrderDraft,
  lines: readonly CartLine[],
  now: Date = new Date(),
): OrderIssue[] {
  const issues: OrderIssue[] = [];
  const name = draft.name.trim();
  const digits = phoneDigits(draft.phone);
  const comment = draft.comment.trim();

  if (!name) {
    issues.push({ field: "name", message: "Укажите имя." });
  } else if (name.length < 2) {
    issues.push({ field: "name", message: "Имя должно быть не короче 2 символов." });
  } else if (name.length > 80) {
    issues.push({ field: "name", message: "Имя должно быть не длиннее 80 символов." });
  }

  if (!digits) {
    issues.push({ field: "phone", message: "Укажите телефон." });
  } else if (digits.length < 10 || digits.length > 15) {
    issues.push({ field: "phone", message: "Телефон должен содержать от 10 до 15 цифр." });
  }

  if (!draft.date) {
    issues.push({ field: "date", message: "Выберите дату." });
  } else if (!isOrderDateInRange(draft.date, now, site.preorder.days)) {
    issues.push({ field: "date", message: "Выберите дату с завтрашнего дня." });
  }

  if (!draft.slot) {
    issues.push({ field: "slot", message: "Выберите интервал." });
  } else if (!isValidTimeSlot(draft.slot, site.preorder.slots)) {
    issues.push({ field: "slot", message: "Выберите интервал из списка." });
  }

  if (comment.length > 400) {
    issues.push({ field: "comment", message: "Комментарий должен быть не длиннее 400 символов." });
  }

  if (!lines.some((line) => line.qty > 0)) {
    issues.push({ field: "cart", message: "Добавьте хотя бы одну позицию." });
  }

  if (!draft.consent) {
    issues.push({ field: "consent", message: "Подтвердите согласие на обработку данных." });
  }

  return issues;
}

function dateLabel(iso: string): string {
  try {
    return formatOrderDate(iso);
  } catch {
    return iso;
  }
}

export function buildOrderSubject(draft: OrderDraft): string {
  const date = draft.date ? dateLabel(draft.date) : "дату не выбрали";
  const slot = draft.slot || "интервал не выбрали";
  return `Предзаказ на ${date}, ${slot}`;
}

export function buildOrderText(
  draft: OrderDraft,
  lines: readonly CartLine[],
  catalog: readonly MenuItem[] = menuItems,
): string {
  const byId = new Map(catalog.map((item) => [item.id, item]));
  const items = lines
    .filter((line) => line.qty > 0 && byId.has(line.id))
    .map((line) => {
      const item = byId.get(line.id) as MenuItem;
      return `${line.qty} × ${item.name}, ${formatMeasure(item.weight, item.unit)}, ${formatPrice(
        item.price * line.qty,
      )}`;
    });

  const total = lines.reduce((sum, line) => {
    const item = byId.get(line.id);
    return item ? sum + item.price * line.qty : sum;
  }, 0);

  return [
    "Заказ на самовывоз",
    `Дата: ${draft.date ? dateLabel(draft.date) : "не выбрана"}`,
    `Интервал: ${draft.slot || "не выбран"}`,
    `Имя: ${draft.name.trim() || "не указано"}`,
    `Телефон: ${draft.phone.trim() || "не указан"}`,
    `Комментарий: ${draft.comment.trim() || "без комментария"}`,
    "",
    "Состав:",
    ...(items.length ? items.map((item, index) => `${index + 1}. ${item}`) : ["Пока пусто"]),
    "",
    `Итого: ${formatPrice(total)}`,
    "Оплата при получении.",
    site.demoNote,
  ].join("\n");
}

export function buildMailto(
  draft: OrderDraft,
  lines: readonly CartLine[],
  email: string = site.email.label,
): string {
  const subject = encodeURIComponent(buildOrderSubject(draft));
  const body = encodeURIComponent(buildOrderText(draft, lines));
  return `mailto:${email}?subject=${subject}&body=${body}`;
}
