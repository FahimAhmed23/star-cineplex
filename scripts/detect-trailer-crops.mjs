// Measures the black bars baked into each trailer (scope films inside a 16:9 file) and stores the picture
// area in data/movies.json as trailerCrop = { top, height } (fractions of the frame height).
// The hall screen then shows only the real picture — no letterbox bars on the 3D screen.
// Run: node scripts/detect-trailer-crops.mjs   (after npm run media)
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import ffmpegPath from "ffmpeg-static";

const file = new URL("../data/movies.json", import.meta.url);
const data = JSON.parse(readFileSync(file, "utf8"));

for (const m of data.movies) {
  const src = `public${m.trailer}`;
  // sample 30s from 15s in (past the opening cards); keep the largest picture area seen
  const r = spawnSync(ffmpegPath, ["-hide_banner", "-ss", "15", "-i", src, "-t", "30", "-vf", "cropdetect=limit=24:round=2:reset=0", "-f", "null", "-"], { encoding: "utf8" });
  const hits = [...r.stderr.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)];
  if (!hits.length) { console.log(`${m.slug}: no crop found, leaving as is`); continue; }
  const [, , h, , y] = hits.at(-1).map(Number);
  const full = 720;
  m.trailerCrop = { top: +(y / full).toFixed(4), height: +(h / full).toFixed(4) };
  console.log(`${m.slug.padEnd(38)} picture ${h}px tall from y=${y}  (aspect ${(1280 / h).toFixed(2)}:1)`);
}
writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
