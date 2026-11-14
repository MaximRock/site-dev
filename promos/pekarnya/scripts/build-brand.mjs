import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const SOURCE = "images/brend.png";
const OUT = "src/assets/images";

const lockupCrop = { left: 0, top: 0, width: 1536, height: 1024 };
const markCrop = { left: 350, top: 0, width: 800, height: 560 };
const iconCrop = { left: 440, top: 0, width: 560, height: 560 };

await mkdir(OUT, { recursive: true });

const targets = [
  {
    file: `${OUT}/brand-lockup.webp`,
    pipeline: sharp(SOURCE).extract(lockupCrop).resize({ width: 1200 }),
    quality: 85,
  },
  {
    file: `${OUT}/brand-mark.webp`,
    pipeline: sharp(SOURCE).extract(markCrop),
    quality: 88,
  },
  {
    file: `${OUT}/brand-icon.webp`,
    pipeline: sharp(SOURCE).extract(iconCrop),
    quality: 88,
  },
];

for (const { file, pipeline, quality } of targets) {
  await pipeline.webp({ quality, effort: 6 }).toFile(file);
  const meta = await sharp(file).metadata();
  console.log(`build-brand: ${file} ${meta.width}x${meta.height}`);
}
