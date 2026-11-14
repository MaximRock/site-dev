import { menuItems } from "../data/menu";
import {
  CART_EVENT,
  CART_KEY,
  addLine,
  cartCount,
  cartTotal,
  lineQty,
  readStoredCart,
  removeLine,
  setLineQty,
  writeStoredCart,
} from "../lib/cart";
import { formatPrice } from "../lib/format";

let initialized = false;

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readCart(): ReturnType<typeof readStoredCart>["lines"] {
  return readStoredCart(storage(), menuItems).lines;
}

export function writeCart(lines: ReturnType<typeof readCart>): void {
  writeStoredCart(storage(), lines);
  window.dispatchEvent(new CustomEvent(CART_EVENT, { detail: lines }));
}

function syncSteppers(lines: ReturnType<typeof readCart>): void {
  document.querySelectorAll<HTMLElement>("[data-qty-for]").forEach((stepper) => {
    const id = stepper.dataset.qtyFor;
    if (!id) return;
    const input = stepper.querySelector<HTMLInputElement>("[data-qty-input]");
    const dec = stepper.querySelector<HTMLButtonElement>("[data-qty-dec]");
    const qty = lineQty(lines, id);
    if (input) input.value = String(qty);
    if (dec) dec.disabled = qty <= 0;
  });
}

function syncCartBar(lines: ReturnType<typeof readCart>): void {
  const count = cartCount(lines);
  const total = cartTotal(lines, menuItems);

  document.querySelectorAll<HTMLElement>("[data-cart-count]").forEach((el) => {
    el.textContent = String(count);
    el.hidden = count === 0;
  });
  document.querySelectorAll<HTMLElement>("[data-cart-count-header]").forEach((el) => {
    el.textContent = String(count);
    el.hidden = count === 0;
  });
  document.querySelectorAll<HTMLElement>("[data-cart-total]").forEach((el) => {
    el.textContent = formatPrice(total);
  });
  document.querySelectorAll<HTMLElement>("[data-cart-bar]").forEach((bar) => {
    bar.hidden = count === 0;
  });
  document.body.classList.toggle("has-cart", count > 0);
}

export function syncCartUi(): void {
  const lines = readCart();
  syncSteppers(lines);
  syncCartBar(lines);
}

export function initCart(): void {
  if (initialized) return;
  initialized = true;

  syncCartUi();

  const clearDialog = document.querySelector<HTMLDialogElement>("[data-clear-dialog]");
  const clearCancel = clearDialog?.querySelector<HTMLButtonElement>("[data-clear-cancel]");
  const clearConfirm = clearDialog?.querySelector<HTMLButtonElement>("[data-clear-confirm]");
  let clearTrigger: HTMLElement | null = null;

  const closeClearDialog = () => {
    if (clearDialog?.open) clearDialog.close();
  };

  clearCancel?.addEventListener("click", closeClearDialog);

  clearConfirm?.addEventListener("click", () => {
    writeCart([]);
    syncCartUi();
    closeClearDialog();
  });

  clearDialog?.addEventListener("click", (event) => {
    if (event.target === clearDialog) closeClearDialog();
  });

  clearDialog?.addEventListener("close", () => {
    const trigger = clearTrigger;
    clearTrigger = null;
    if (trigger?.isConnected && trigger.getClientRects().length > 0) {
      trigger.focus();
    } else {
      document.getElementById("main")?.focus();
    }
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const dec = target.closest<HTMLElement>("[data-qty-dec]");
    if (dec) {
      const stepper = dec.closest<HTMLElement>("[data-qty-for]");
      const id = stepper?.dataset.qtyFor;
      if (id) {
        const lines = readCart();
        const next = setLineQty(lines, id, lineQty(lines, id) - 1);
        writeCart(next);
        syncCartUi();
      }
      return;
    }

    const inc = target.closest<HTMLElement>("[data-qty-inc]");
    if (inc) {
      const stepper = inc.closest<HTMLElement>("[data-qty-for]");
      const id = stepper?.dataset.qtyFor;
      if (id) {
        const lines = readCart();
        const current = lineQty(lines, id);
        const next =
          current === 0 ? addLine(lines, id, 1, menuItems) : setLineQty(lines, id, current + 1);
        writeCart(next);
        syncCartUi();
      }
      return;
    }

    const clear = target.closest<HTMLElement>("[data-cart-clear]");
    if (clear) {
      if (!clearDialog) {
        writeCart([]);
        syncCartUi();
        return;
      }
      clearTrigger = clear;
      if (!clearDialog.open) clearDialog.showModal();
      return;
    }
  });

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.matches("[data-qty-input]")) return;

    const stepper = target.closest<HTMLElement>("[data-qty-for]");
    const id = stepper?.dataset.qtyFor;
    if (!id) return;

    const value = Number(target.value);
    const lines = readCart();
    const next =
      Number.isFinite(value) && value > 0
        ? setLineQty(lines, id, Math.trunc(value))
        : removeLine(lines, id);
    writeCart(next);
    syncCartUi();
  });

  window.addEventListener("storage", (event) => {
    if (event.key === CART_KEY) syncCartUi();
  });
}
