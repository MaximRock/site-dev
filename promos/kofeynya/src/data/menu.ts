export interface MenuItem {
  id: string;
  name: string;
  price: number;
  note: string;
  soldOut?: boolean;
}

export const currencyNote = "цены в рублях. в свою кружку — минус 20.";

export const coffeeItems: MenuItem[] = [
  { id: "01", name: "фильтр", price: 190, note: "капает три минуты. ждать здесь." },
  { id: "02", name: "эспрессо", price: 160, note: "маленький. горячий. без разговоров." },
  { id: "03", name: "капучино", price: 250, note: "обычный. не сладкий." },
  { id: "04", name: "флэт", price: 260, note: "меньше молока. для тех, кто знает." },
  { id: "05", name: "какао", price: 240, note: "детям и тем, кто замёрз." },
  { id: "06", name: "фильтр в свою кружку", price: 170, note: "минус 20. кружку моем сами." },
];

export const coffeeExtras: string[] = [
  "молоко обычное и овсяное. сиропов нет.",
  "рафа нет. не будет.",
];

export const bakeryItems: MenuItem[] = [
  { id: "07", name: "улитка с корицей", price: 180, note: "одна. с маслом. пока есть." },
  { id: "08", name: "творожник", price: 160, note: "если успели. разбирают к десяти." },
];

export const bakeryStamp = "если нет — значит, разобрали";
