/**
 * Rasterises the icon SVGs into the PNG sizes the platforms actually ask for.
 *
 * Run through `npm run icons` after editing public/icon.svg; the PNGs are
 * committed so the deploy does not depend on a rasteriser being present.
 */
import sharp from "sharp";
import { readFileSync } from "node:fs";

const square = readFileSync("public/icon.svg");
const maskable = readFileSync("public/icon-maskable.svg");
const apple = readFileSync("public/icon-apple.svg");

const jobs = [
  // Chrome's manifest sizes.
  { src: square, out: "public/icon-192.png", size: 192 },
  { src: square, out: "public/icon-512.png", size: 512 },
  // Android crops to a circle, so this one keeps its artwork inside the safe zone.
  { src: maskable, out: "public/icon-maskable-512.png", size: 512 },
  // iOS ignores the manifest and takes this one; it also has no transparency,
  // so the ground is baked in rather than left to the home screen.
  { src: apple, out: "public/apple-touch-icon.png", size: 180 },
  { src: square, out: "public/favicon-32.png", size: 32 },
];

for (const { src, out, size } of jobs) {
  const png = sharp(src, { density: 512 }).resize(size, size);
  // iOS rejects transparency on the touch icon and composites it unpredictably.
  const flat = out.includes("apple-touch") ? png.flatten({ background: "#17150F" }) : png;
  await flat.png().toFile(out);
  console.log(`${out}  ${size}×${size}`);
}
