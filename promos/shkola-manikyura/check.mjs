// design-review: скриншоты страницы на мобильном/десктопе, light+dark
// Запуск: node check.mjs /path  (dev-сервер должен быть на http://localhost:4321)
// На NixOS системный chromium должен быть установлен: nix run nixpkgs#chromium --version
import fs from "node:fs";
import { chromium } from "playwright";

const nixChromium = fs
  .readdirSync("/nix/store")
  .filter((d) => d.includes("chromium-") && !d.includes("unwrapped") && !d.endsWith(".drv"))
  .find((d) => fs.existsSync(`/nix/store/${d}/bin/chromium`));
const executablePath =
  process.env.CHROMIUM_PATH ?? (nixChromium ? `/nix/store/${nixChromium}/bin/chromium` : undefined);

const path = process.argv[2] ?? "/";
const base = process.env.BASE_URL ?? "http://localhost:4321";
const browser = await chromium.launch({ executablePath });

for (const name of ["light", "dark"]) {
  for (const [vpName, vp] of [
    ["mobile", { width: 375, height: 812 }],
    ["desktop", { width: 1440, height: 900 }],
  ]) {
    const page = await browser.newPage({
      viewport: vp,
      colorScheme: name === "dark" ? "dark" : "light",
    });
    await page.addInitScript((mode) => {
      localStorage.setItem("theme", mode);
      if (mode === "dark") document.documentElement.setAttribute("data-theme", "dark");
    }, name);
    await page.goto(base + path, { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight / 2) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    if (vpName === "mobile" && scrollWidth > vp.width) {
      console.log(`OVERFLOW ${name}: scrollWidth ${scrollWidth} > ${vp.width}`);
    }
    await page.screenshot({ path: `/tmp/review-${vpName}-${name}.png`, fullPage: true });
    await page.close();
  }
}

await browser.close();
console.log("screenshots: /tmp/review-{mobile,desktop}-{light,dark}.png");
