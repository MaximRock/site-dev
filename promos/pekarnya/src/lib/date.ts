const MOSCOW_TIME_ZONE = "Europe/Moscow";
const WEEKDAYS = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"] as const;
const MONTHS = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
] as const;

export interface OrderDate {
  iso: string;
  label: string;
  weekday: string;
  day: number;
  month: number;
}

function parseIsoDate(iso: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function getMoscowIsoDate(now: Date = new Date()): string {
  if (Number.isNaN(now.getTime())) throw new Error("Invalid date");

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MOSCOW_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function addDaysIso(iso: string, days: number): string {
  const parsed = parseIsoDate(iso);
  if (!parsed) throw new Error(`Invalid ISO date: ${iso}`);
  if (!Number.isFinite(days)) throw new Error(`Invalid day offset: ${days}`);

  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + Math.trunc(days)));
  return date.toISOString().slice(0, 10);
}

export function formatOrderDate(iso: string): string {
  const parsed = parseIsoDate(iso);
  if (!parsed) throw new Error(`Invalid ISO date: ${iso}`);

  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  return `${WEEKDAYS[date.getUTCDay()]}, ${parsed.day} ${MONTHS[parsed.month - 1]}`;
}

export function getOrderDates(now: Date = new Date(), days = 7): OrderDate[] {
  if (!Number.isInteger(days) || days < 1) throw new Error("Days must be a positive integer");

  const today = getMoscowIsoDate(now);
  return Array.from({ length: days }, (_, index) => {
    const iso = addDaysIso(today, index + 1);
    const parsed = parseIsoDate(iso);
    if (!parsed) throw new Error(`Invalid ISO date: ${iso}`);

    return {
      iso,
      label: formatOrderDate(iso),
      weekday: WEEKDAYS[new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)).getUTCDay()],
      day: parsed.day,
      month: parsed.month,
    };
  });
}

export function isFutureOrderDate(iso: string, now: Date = new Date()): boolean {
  return parseIsoDate(iso) !== null && iso > getMoscowIsoDate(now);
}

export function isOrderDateInRange(iso: string, now: Date = new Date(), days = 7): boolean {
  return getOrderDates(now, days).some((date) => date.iso === iso);
}

export function isValidTimeSlot(slot: string, slots: readonly string[]): boolean {
  return slots.includes(slot);
}
