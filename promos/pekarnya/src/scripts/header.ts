export function initHeader(): void {
  const dialog = document.querySelector<HTMLDialogElement>("#site-drawer");
  const openButton = document.querySelector<HTMLButtonElement>("[data-drawer-open]");
  const closeButton = document.querySelector<HTMLButtonElement>("[data-drawer-close]");
  if (!dialog || !openButton) return;

  const open = () => {
    if (!dialog.open) dialog.showModal();
    openButton.setAttribute("aria-expanded", "true");
  };

  const close = () => {
    if (dialog.open) dialog.close();
    openButton.setAttribute("aria-expanded", "false");
  };

  openButton.addEventListener("click", open);
  closeButton?.addEventListener("click", close);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });
  dialog.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", close);
  });
  dialog.addEventListener("close", () => {
    openButton.setAttribute("aria-expanded", "false");
  });
}

let headerInitialized = false;
export function initHeaderOnce(): void {
  if (headerInitialized) return;
  headerInitialized = true;
  initHeader();
}
