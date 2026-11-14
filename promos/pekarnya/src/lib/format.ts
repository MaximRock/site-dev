const rouble = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

export function formatPrice(value: number): string {
  return rouble.format(value);
}

export function formatMeasure(value: number, unit: string): string {
  return `${value} ${unit}`;
}

export function pluralizeRu(value: number, forms: readonly [string, string, string]): string {
  const abs = Math.abs(Math.trunc(value));
  const lastTwo = abs % 100;
  const last = abs % 10;

  if (lastTwo >= 11 && lastTwo <= 14) return forms[2];
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}

export function formatCount(value: number, forms: readonly [string, string, string]): string {
  return `${value} ${pluralizeRu(value, forms)}`;
}
