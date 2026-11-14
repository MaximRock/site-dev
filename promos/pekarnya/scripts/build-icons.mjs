import { readFileSync } from "node:fs";
import sharp from "sharp";

const tokens = JSON.parse(readFileSync("tokens/colors.json", "utf8"));
const cream = tokens.primitive.cream.$value;

const source = "src/assets/images/brand-icon.webp";

const targets = [
  { file: "public/favicon.png", size: 64 },
  { file: "public/apple-touch-icon.png", size: 180 },
  { file: "public/icon-192.png", size: 192 },
  { file: "public/icon-512.png", size: 512 },
];

for (const { file, size } of targets) {
  await sharp(source)
    .resize(size, size, { fit: "cover", position: "centre" })
    .flatten({ background: cream })
    .png({ compressionLevel: 9, palette: true, quality: 92, colours: 128, dither: 0.5 })
    .toFile(file);
  console.log(`build-icons: ${file} ${size}x${size}`);
}
