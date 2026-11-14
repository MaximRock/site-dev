import { initCart } from "./cart-store";
import { initHeaderOnce } from "./header";

export function initSite(): void {
  initHeaderOnce();
  initCart();
}
