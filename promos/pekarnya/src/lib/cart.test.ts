import { describe, expect, it } from "vitest";
import {
  addLine,
  cartCount,
  cartTotal,
  CART_KEY,
  findItem,
  lineQty,
  MAX_QTY,
  parseCart,
  readStoredCart,
  removeLine,
  setLineQty,
  writeStoredCart,
  type StorageLike,
} from "./cart";

function memoryStorage(initial: Record<string, string> = {}): StorageLike & {
  data: Map<string, string>;
} {
  const data = new Map(Object.entries(initial));

  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

describe("parseCart", () => {
  it("keeps known lines and merges duplicates", () => {
    const result = parseCart(
      JSON.stringify([
        { id: "croissant", qty: 2 },
        { id: "croissant", qty: 1 },
        { id: "filter", qty: 3 },
      ]),
    );

    expect(result.lines).toEqual([
      { id: "croissant", qty: 3 },
      { id: "filter", qty: 3 },
    ]);
    expect(result.repaired).toBe(true);
  });

  it("drops unknown, negative and malformed lines", () => {
    const result = parseCart(
      JSON.stringify([
        { id: "unknown", qty: 2 },
        { id: "croissant", qty: -1 },
        { id: "cinnamon", qty: 0 },
        { id: "filter", qty: "two" },
        null,
        { qty: 2 },
      ]),
    );

    expect(result.lines).toEqual([]);
    expect(result.repaired).toBe(true);
  });

  it("clamps large quantities", () => {
    const result = parseCart(JSON.stringify([{ id: "tea", qty: 99 }]));

    expect(result.lines).toEqual([{ id: "tea", qty: MAX_QTY }]);
    expect(result.repaired).toBe(true);
  });

  it("treats broken JSON as an empty repaired cart", () => {
    expect(parseCart("{nope")).toEqual({ lines: [], repaired: true });
    expect(parseCart(JSON.stringify({ id: "tea" }))).toEqual({ lines: [], repaired: true });
    expect(parseCart(null)).toEqual({ lines: [], repaired: false });
    expect(parseCart("[]")).toEqual({ lines: [], repaired: false });
  });
});

describe("storage", () => {
  it("reads a stored cart and reports storage as available", () => {
    const storage = memoryStorage({
      [CART_KEY]: JSON.stringify([{ id: "stolyarny", qty: 1 }]),
    });

    expect(readStoredCart(storage)).toEqual({
      lines: [{ id: "stolyarny", qty: 1 }],
      storageAvailable: true,
      repaired: false,
    });
  });

  it("clears malformed storage", () => {
    const storage = memoryStorage({ [CART_KEY]: "{nope" });

    expect(readStoredCart(storage)).toEqual({
      lines: [],
      storageAvailable: true,
      repaired: true,
    });
    expect(storage.data.has(CART_KEY)).toBe(false);
  });

  it("works without storage", () => {
    expect(readStoredCart(null)).toEqual({
      lines: [],
      storageAvailable: false,
      repaired: false,
    });
    expect(writeStoredCart(null, [])).toBe(false);
  });

  it("writes the cart and survives a throwing storage", () => {
    const storage = memoryStorage();
    expect(writeStoredCart(storage, [{ id: "tea", qty: 2 }])).toBe(true);
    expect(storage.data.get(CART_KEY)).toBe(JSON.stringify([{ id: "tea", qty: 2 }]));

    const broken: StorageLike = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };

    expect(readStoredCart(broken).storageAvailable).toBe(false);
    expect(writeStoredCart(broken, [])).toBe(false);
  });
});

describe("cart operations", () => {
  it("adds, increments and clamps", () => {
    const one = addLine([], "croissant");
    expect(one).toEqual([{ id: "croissant", qty: 1 }]);

    const two = addLine(one, "croissant", 2);
    expect(two).toEqual([{ id: "croissant", qty: 3 }]);

    const capped = addLine([{ id: "croissant", qty: MAX_QTY }], "croissant");
    expect(capped).toEqual([{ id: "croissant", qty: MAX_QTY }]);
  });

  it("ignores unknown items and non-positive quantities", () => {
    const lines = [{ id: "tea", qty: 1 }];
    expect(addLine(lines, "unknown")).toEqual(lines);
    expect(addLine(lines, "tea", 0)).toEqual(lines);
  });

  it("sets quantity and removes at zero", () => {
    const lines = [{ id: "tea", qty: 1 }];
    expect(setLineQty(lines, "tea", 4)).toEqual([{ id: "tea", qty: 4 }]);
    expect(setLineQty(lines, "tea", 0)).toEqual([]);
    expect(removeLine(lines, "tea")).toEqual([]);
  });

  it("counts lines and totals from the catalog", () => {
    const lines = [
      { id: "croissant", qty: 2 },
      { id: "filter", qty: 1 },
    ];

    expect(cartCount(lines)).toBe(3);
    expect(cartTotal(lines)).toBe(180 * 2 + 200);
    expect(lineQty(lines, "croissant")).toBe(2);
    expect(lineQty(lines, "missing")).toBe(0);
  });

  it("finds a catalog item", () => {
    expect(findItem("tea")?.price).toBe(180);
    expect(findItem("missing")).toBeUndefined();
  });
});
