// Turns each mural photo into a black-and-white "colouring page".
//
//   npm run line-art
//
// Reads  public/mural/<name>.jpg
// Writes public/mural/line/<name>.png
//
// Runs once on a developer's machine, not per visitor: the output is just
// another static image. Re-run it after adding or changing a mural.

import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SOURCE_DIR = "public/mural";
const OUT_DIR = "public/mural/line";

// Tuning knobs. Higher SMOOTHING ignores more brush texture; the two
// thresholds decide which edges become lines (below LOW: none, above HIGH:
// full black, in between: grey).
const SMOOTHING = 7; // median filter size, in pixels (odd number)
const EDGE_LOW = 28;
const EDGE_HIGH = 90;

async function toLineArt(file) {
  const input = path.join(SOURCE_DIR, file);

  // 1. Greyscale, then a median filter: it removes small speckles (paint
  //    texture) while keeping strong edges (outlines of people, houses).
  const { data, info } = await sharp(input)
    .greyscale()
    .median(SMOOTHING)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  // 2. Sobel filter: for each pixel, how fast does brightness change
  //    left-to-right (gx) and top-to-bottom (gy)? Big change = an edge.
  const out = Buffer.alloc(width * height, 255); // start with white paper
  const at = (x, y) => data[y * width + x];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const gx =
        -at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1) +
        at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1);
      const gy =
        -at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1) +
        at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1);
      const strength = Math.hypot(gx, gy) / 4;

      // 3. Map edge strength to ink: weak edges vanish, strong ones go black.
      const t = Math.min(1, Math.max(0, (strength - EDGE_LOW) / (EDGE_HIGH - EDGE_LOW)));
      out[y * width + x] = Math.round(255 * (1 - t));
    }
  }

  const name = file.replace(/\.(jpe?g)$/i, ".png");
  await sharp(out, { raw: { width, height, channels: 1 } })
    .blur(0.6) // soften jagged pixels so lines look drawn, not computed
    .png()
    .toFile(path.join(OUT_DIR, name));
  return `${file} -> line/${name} (${width}x${height})`;
}

await mkdir(OUT_DIR, { recursive: true });
const files = (await readdir(SOURCE_DIR)).filter((f) => /\.jpe?g$/i.test(f));
for (const file of files) console.log(await toLineArt(file));
