import { site } from "../data/site";
import { menuItems } from "../data/menu";
import { getOrderDates } from "../lib/date";
import { validateOrder, buildOrderText, buildMailto, type OrderDraft } from "../lib/order";
import { CART_EVENT, cartTotal } from "../lib/cart";
import { formatPrice } from "../lib/format";
import { withBase } from "../lib/withBase";
import { readCart } from "./cart-store";

function $(selector: string): HTMLElement | null {
  return document.querySelector(selector);
}

function all(selector: string): HTMLElement[] {
  return Array.from(document.querySelectorAll(selector));
}

function collectDraft(): OrderDraft {
  const name = ($("#name") as HTMLInputElement | null)?.value ?? "";
  const phone = ($("#phone") as HTMLInputElement | null)?.value ?? "";
  const comment = ($("#comment") as HTMLTextAreaElement | null)?.value ?? "";
  const consent = ($("[data-consent]") as HTMLInputElement | null)?.checked ?? false;
  const date =
    (document.querySelector('input[name="date"]:checked') as HTMLInputElement | null)?.value ?? "";
  const slot =
    (document.querySelector('input[name="slot"]:checked') as HTMLInputElement | null)?.value ?? "";

  return { name, phone, date, slot, comment, consent };
}

function clearErrors(): void {
  all(".field__error").forEach((el) => {
    (el as HTMLElement).hidden = true;
    el.textContent = "";
  });
  all("input, textarea").forEach((el) => {
    el.setAttribute("aria-invalid", "false");
  });
}

function showError(field: string, message: string): void {
  if (field === "date" || field === "slot" || field === "consent" || field === "cart") {
    const el = document.querySelector(`[data-error-for="${field}"]`) as HTMLElement | null;
    if (el) {
      el.hidden = false;
      el.textContent = message;
    }
    return;
  }

  const error = document.getElementById(`${field}-error`) as HTMLElement | null;
  if (error) {
    error.hidden = false;
    error.textContent = message;
  }
  const input = document.getElementById(field);
  input?.setAttribute("aria-invalid", "true");
}

function focusField(field: string): void {
  if (field === "date") {
    (document.querySelector('input[name="date"]') as HTMLElement | null)?.focus();
    return;
  }
  if (field === "slot") {
    (document.querySelector('input[name="slot"]') as HTMLElement | null)?.focus();
    return;
  }
  if (field === "consent") {
    ($("[data-consent]") as HTMLElement | null)?.focus();
    return;
  }
  if (field === "cart") {
    ($("[data-order-summary]") as HTMLElement | null)?.focus();
    return;
  }

  document.getElementById(field)?.focus();
}

function renderDates(): void {
  const grid = $("[data-date-picker-grid]");
  if (!grid) return;

  const dates = getOrderDates(new Date(), site.preorder.days);
  grid.innerHTML = dates
    .map(
      (date) => `
        <label class="date-card">
          <input type="radio" name="date" value="${date.iso}" />
          <span>${date.label}</span>
        </label>
      `,
    )
    .join("");
}

function renderSummary(): void {
  const list = $("[data-order-summary-list]");
  const total = $("[data-order-summary-total]");
  const lines = readCart();
  const byId = new Map(menuItems.map((item) => [item.id, item]));

  if (list) {
    if (lines.length === 0) {
      list.innerHTML =
        `<p class="order-summary__empty">Корзина пуста. <a href="${withBase("/menu/")}">Открыть меню</a></p>`;
    } else {
      list.innerHTML = lines
        .map((line) => {
          const item = byId.get(line.id);
          if (!item) return "";
          return `<div class="summary-line"><span>${line.qty} × ${item.name}</span><span>${formatPrice(
            item.price * line.qty,
          )}</span></div>`;
        })
        .join("");
    }
  }

  if (total) total.textContent = formatPrice(cartTotal(lines, menuItems));

  const clear = $("[data-order-summary] [data-cart-clear]");
  if (clear) clear.hidden = lines.length === 0;
}

function setStatus(message: string): void {
  const status = $("[data-order-status]");
  if (status) status.textContent = message;
}

function submitOrder(event: Event): void {
  event.preventDefault();
  clearErrors();

  const draft = collectDraft();
  const lines = readCart();
  const issues = validateOrder(draft, lines, new Date());

  if (issues.length > 0) {
    issues.forEach((issue) => showError(issue.field, issue.message));
    setStatus("Проверьте выделенные поля.");
    focusField(issues[0].field);
    return;
  }

  const mailto = buildMailto(draft, lines);
  setStatus("Письмо подготовлено. Откроется почтовый клиент; пекарня подтвердит заказ.");
  window.location.href = mailto;
}

async function copyOrder(): Promise<void> {
  clearErrors();
  const draft = collectDraft();
  const lines = readCart();
  const issues = validateOrder(draft, lines, new Date());

  if (issues.length > 0) {
    issues.forEach((issue) => showError(issue.field, issue.message));
    setStatus("Проверьте выделенные поля.");
    focusField(issues[0].field);
    return;
  }

  const text = buildOrderText(draft, lines);
  try {
    await navigator.clipboard.writeText(text);
    setStatus("Заказ скопирован. Отправьте его в Telegram или на почту.");
  } catch {
    setStatus("Не удалось скопировать. Текст заказа подготовлен в письме.");
  }
}

function initOrderPage(): void {
  renderDates();
  renderSummary();

  const form = $("[data-order-form]");
  form?.addEventListener("submit", submitOrder);

  const copyButton = $("[data-copy-order]");
  copyButton?.addEventListener("click", () => {
    void copyOrder();
  });

  window.addEventListener(CART_EVENT, renderSummary);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initOrderPage);
} else {
  initOrderPage();
}
