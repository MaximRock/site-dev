import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import sharp from "sharp";

const base = process.env.BASE_URL ?? "http://127.0.0.1:4321";
const outDir = "docs/studio-case";
const pages = [
  { slug: "home", path: "/" },
  { slug: "menu", path: "/menu/" },
  { slug: "order", path: "/order/", seedCart: true },
  { slug: "contacts", path: "/contacts/" },
];
const viewports = [
  { name: "desktop", width: 1835, height: 950 },
  { name: "mobile", width: 364, height: 748 },
];

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const viewportImages = Array.from(document.images).filter((image) => {
      if (image.complete) return false;
      const rect = image.getBoundingClientRect();
      return rect.bottom > -200 && rect.top < innerHeight + 200;
    });
    const loaded = Promise.all(
      viewportImages.map(
        (image) =>
          new Promise((resolve) => {
            const finish = () => {
              image.removeEventListener("load", finish);
              image.removeEventListener("error", finish);
              resolve();
            };
            image.addEventListener("load", finish);
            image.addEventListener("error", finish);
          }),
      ),
    );
    await Promise.race([loaded, new Promise((resolve) => setTimeout(resolve, 5000))]);
  });
  await page.waitForTimeout(120);
}

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();

for (const [index, target] of pages.entries()) {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
    });

    if (target.seedCart) {
      await context.addInitScript(() => {
        localStorage.setItem(
          "teply-ugolok:cart:v1",
          JSON.stringify([
            { id: "stolyarny", qty: 1 },
            { id: "croissant", qty: 2 },
          ]),
        );
      });
    }

    const page = await context.newPage();
    await page.goto(`${base}${target.path}`, { waitUntil: "networkidle" });

    if (target.seedCart) {
      await page.evaluate(() => {
        document.querySelector('input[name="date"]')?.click();
        document.querySelector('input[name="slot"]')?.click();
      });
    }

    await settle(page);
    const png = await page.screenshot({ fullPage: false });
    const file = `${outDir}/${viewport.name}-${index + 1}.webp`;
    await sharp(png).webp({ quality: 84, effort: 6 }).toFile(file);

    const meta = await sharp(file).metadata();
    console.log(`capture-case: ${file} ${meta.width}x${meta.height}`);
    await context.close();
  }
}

await browser.close();
