import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import sharp from "sharp";

const tokens = JSON.parse(readFileSync("tokens/colors.json", "utf8"));
const color = (name) => tokens.primitive[name].$value;

const literata = readFileSync(
  "node_modules/@fontsource-variable/literata/files/literata-cyrillic-wght-normal.woff2",
).toString("base64");
const onest = readFileSync(
  "node_modules/@fontsource-variable/onest/files/onest-cyrillic-wght-normal.woff2",
).toString("base64");
const hero = readFileSync("src/assets/images/hero.webp").toString("base64");
const brandIcon = readFileSync("src/assets/images/brand-icon.webp").toString("base64");

const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<style>
@font-face {
  font-family: "Literata Variable";
  font-style: normal;
  font-weight: 200 900;
  font-display: block;
  src: url(data:font/woff2;base64,${literata}) format("woff2");
}
@font-face {
  font-family: "Onest Variable";
  font-style: normal;
  font-weight: 100 900;
  font-display: block;
  src: url(data:font/woff2;base64,${onest}) format("woff2");
}
* { box-sizing: border-box; }
html, body { width: 1200px; height: 630px; margin: 0; overflow: hidden; }
body {
  display: grid;
  grid-template-columns: 650px 550px;
  background: ${color("cream")};
  color: ${color("ink")};
  font-family: "Onest Variable", sans-serif;
}
.copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 62px 72px 54px;
}
.eyebrow {
  margin: 0;
  color: ${color("honey-strong")};
  font-size: 19px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
h1 {
  max-width: 540px;
  margin: 38px 0 0;
  font-family: "Literata Variable", serif;
  font-size: 78px;
  font-weight: 500;
  letter-spacing: -0.035em;
  line-height: 1;
}
.spacer { flex: 1; }
.brand { display: flex; align-items: center; gap: 16px; }
.mark {
  flex: 0 0 58px;
  width: 58px;
  height: 58px;
  overflow: hidden;
  border: 1px solid ${color("sand-strong")};
  border-radius: 14px;
  background: ${color("cream")};
}
.mark img { display: block; width: 100%; height: 100%; object-fit: cover; }
.brand-name {
  display: block;
  font-family: "Literata Variable", serif;
  font-size: 31px;
  font-weight: 600;
  line-height: 1;
}
.brand-note { display: block; margin-top: 7px; color: ${color("brown")}; font-size: 15px; }
.photo { position: relative; height: 630px; overflow: hidden; border-radius: 30px 0 0 30px; }
.photo img { width: 100%; height: 100%; object-fit: cover; object-position: 62% center; }
.badge {
  position: absolute;
  top: 34px;
  right: 26px;
  border: 1px solid ${color("sand-strong")};
  border-radius: 999px;
  background: ${color("cream")};
  color: ${color("ink")};
  font-size: 17px;
  font-weight: 600;
  padding: 9px 18px;
}
</style>
</head>
<body>
  <div class="copy">
    <p class="eyebrow">Пекарня на закваске · Москва</p>
    <h1>Хлеб,<br>который<br>успевает<br>к завтраку</h1>
    <div class="spacer"></div>
    <div class="brand">
      <span class="mark">
        <img src="data:image/webp;base64,${brandIcon}" alt="">
      </span>
      <span>
        <span class="brand-name">Тёплый Уголок</span>
        <span class="brand-note">Здесь пахнет уютом.</span>
      </span>
    </div>
  </div>
  <div class="photo">
    <img src="data:image/webp;base64,${hero}" alt="">
    <span class="badge">С 07:30</span>
  </div>
</body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});
await page.setContent(html, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
const png = await page.screenshot();
await browser.close();

await sharp(png).jpeg({ quality: 86, mozjpeg: true }).toFile("public/og-default.jpg");
console.log("build-og: public/og-default.jpg 1200x630");
