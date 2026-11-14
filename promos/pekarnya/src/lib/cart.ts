import { menuItems, type MenuItem } from "../data/menu";

export const CART_KEY = "teply-ugolok:cart:v1";
export const CART_EVENT = "teply-ugolok:cart-change";
export const MAX_QTY = 20;

export interface CartLine {
  id: string;
  qty: number;
}

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface StoredCart {
  lines: CartLine[];
  storageAvailable: boolean;
  repaired: boolean;
}

const catalogById = new Map(menuItems.map((item) => [item.id, item]));

function catalogFor(items: readonly MenuItem[]): Map<string, MenuItem> {
  return new Map(items.map((item) => [item.id, item]));
}

export function parseCart(
  raw: string | null,
  catalog: readonly MenuItem[] = menuItems,
): { lines: CartLine[]; repaired: boolean } {
  if (raw === null || raw.trim() === "") return { lines: [], repaired: false };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { lines: [], repaired: true };
  }

  if (!Array.isArray(parsed)) return { lines: [], repaired: true };

  const known = catalogFor(catalog);
  const lines: CartLine[] = [];
  const byId = new Map<string, CartLine>();
  let repaired = false;

  for (const entry of parsed) {
    if (typeof entry !== "object" || entry === null) {
      repaired = true;
      continue;
    }

    const id = "id" in entry ? entry.id : undefined;
    const qty = "qty" in entry ? entry.qty : undefined;

    if (
      typeof id !== "string" ||
      !known.has(id) ||
      typeof qty !== "number" ||
      !Number.isFinite(qty)
    ) {
      repaired = true;
      continue;
    }

    const integerQty = Math.trunc(qty);
    if (integerQty <= 0) {
      repaired = true;
      continue;
    }

    const safeQty = Math.min(MAX_QTY, integerQty);
    if (safeQty !== qty) repaired = true;

    const existing = byId.get(id);
    if (existing) {
      existing.qty = Math.min(MAX_QTY, existing.qty + safeQty);
      repaired = true;
    } else {
      const line = { id, qty: safeQty };
      byId.set(id, line);
      lines.push(line);
    }
  }

  return { lines, repaired };
}

export function readStoredCart(
  storage: StorageLike | null,
  catalog: readonly MenuItem[] = menuItems,
): StoredCart {
  if (!storage) return { lines: [], storageAvailable: false, repaired: false };

  let raw: string | null = null;
  try {
    raw = storage.getItem(CART_KEY);
  } catch {
    return { lines: [], storageAvailable: false, repaired: false };
  }

  const parsed = parseCart(raw, catalog);
  if (parsed.repaired) {
    try {
      storage.removeItem(CART_KEY);
    } catch {
      // The cart is still usable in memory when storage refuses writes.
    }
  }

  return { lines: parsed.lines, storageAvailable: true, repaired: parsed.repaired };
}

export function writeStoredCart(storage: StorageLike | null, lines: readonly CartLine[]): boolean {
  if (!storage) return false;

  try {
    storage.setItem(CART_KEY, JSON.stringify(lines));
    return true;
  } catch {
    return false;
  }
}

export function cartCount(lines: readonly CartLine[]): number {
  return lines.reduce((total, line) => total + line.qty, 0);
}

export function cartTotal(
  lines: readonly CartLine[],
  catalog: readonly MenuItem[] = menuItems,
): number {
  const byId = catalogFor(catalog);
  return lines.reduce((total, line) => {
    const item = byId.get(line.id);
    return item ? total + item.price * line.qty : total;
  }, 0);
}

export function lineQty(lines: readonly CartLine[], id: string): number {
  return lines.find((line) => line.id === id)?.qty ?? 0;
}

export function addLine(
  lines: readonly CartLine[],
  id: string,
  quantity = 1,
  catalog: readonly MenuItem[] = menuItems,
): CartLine[] {
  const known = catalogFor(catalog);
  if (!known.has(id) || !Number.isFinite(quantity) || quantity <= 0) return [...lines];

  const qty = Math.min(MAX_QTY, Math.trunc(quantity));
  const existing = lines.find((line) => line.id === id);

  if (!existing) return [...lines, { id, qty }];

  return lines.map((line) =>
    line.id === id ? { ...line, qty: Math.min(MAX_QTY, line.qty + qty) } : line,
  );
}

export function setLineQty(lines: readonly CartLine[], id: string, quantity: number): CartLine[] {
  if (!Number.isFinite(quantity)) return [...lines];

  if (quantity <= 0) return removeLine(lines, id);

  const qty = Math.min(MAX_QTY, Math.trunc(quantity));
  return lines.map((line) => (line.id === id ? { ...line, qty } : line));
}

export function removeLine(lines: readonly CartLine[], id: string): CartLine[] {
  return lines.filter((line) => line.id !== id);
}

export function clearLines(): CartLine[] {
  return [];
}

export function findItem(
  id: string,
  catalog: readonly MenuItem[] = menuItems,
): MenuItem | undefined {
  return catalogFor(catalog).get(id) ?? catalogById.get(id);
}
