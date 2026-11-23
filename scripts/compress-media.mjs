// Compresses the designer's source media from /references into web-ready files in /public.
// Run: npm run media   (re-run safe: existing outputs are skipped unless --force is passed)
//
//  - Logo      references/logo.png        -> public/brand/logo.png + logo-white.png (1200px wide, PNG with alpha)
//  - Posters   references/_2Fmedia...png  -> public/posters/<slug>.webp (2:3, 600px wide)
//  - Trailers  references/<name>.mp4      -> public/trailers/<slug>.mp4 (720p H.264, <= 8MB, faststart)
//                                            + public/trailers/<slug>.webp (poster frame, 1280x720)
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import ffmpegPath from "ffmpeg-static";
import ffprobe from "ffprobe-static";

const ROOT = process.cwd();
const REF = join(ROOT, "references");
const OUT = join(ROOT, "public");
const FORCE = process.argv.includes("--force");
const MAX_BYTES = 7.4 * 1024 * 1024; // spec §10: <= 8MB per trailer; 2-pass ABR overshoots ~3%, so aim lower
const AUDIO_KBPS = 96;
const MAX_VIDEO_KBPS = 2000;

/** slug -> substring of the source file name in /references */
const MOVIES = [
  { slug: "hunger-games-sunrise-on-the-reaping", trailer: "Hunger Games", poster: "df6a1a1e" },
  { slug: "spider-man-brand-new-day", trailer: "SPIDER-MAN", poster: "7efefacd" },
  { slug: "resident-evil", trailer: "RESIDENT EVIL", poster: "0e33563c" },
  { slug: "clayface", trailer: "Clayface", poster: "85e728eb" },
  { slug: "avengers-endgame-encore", trailer: "Avengers Endgame", poster: "42e79cdd" },
  { slug: "soy", trailer: "SOY _", poster: "6083cfee" },
  { slug: "japito-jibon", trailer: "Japito Jibon", poster: "3b20e927" },
  { slug: "chirkut", trailer: "Chirkut", poster: "87a36198" },
  { slug: "onnopata", trailer: "ONNOPATA", poster: "6be7b903" },
];
// poster = the last 8 hex chars of the poster file name in /references

const refFiles = readdirSync(REF);
const find = (part, ext) => {
  const f = refFiles.find((n) => n.includes(part) && n.toLowerCase().endsWith(ext));
  if (!f) throw new Error(`No ${ext} in references/ matching "${part}"`);
  return join(REF, f);
};
const ensure = (d) => mkdirSync(d, { recursive: true });
const kb = (p) => `${Math.round(statSync(p).size / 1024)} KB`;
const skip = (p) => !FORCE && existsSync(p);

function run(bin, args) {
  const r = spawnSync(bin, args, { stdio: ["ignore", "ignore", "pipe"], encoding: "utf8" });
  if (r.status !== 0) throw new Error(`${bin} failed:\n${r.stderr.slice(-2000)}`);
}
function duration(file) {
  const r = spawnSync(ffprobe.path, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" });
  return parseFloat(r.stdout);
}

async function logos() {
  ensure(join(OUT, "brand"));
  const src = join(REF, "logo.png");
  const color = join(OUT, "brand", "logo.png");
  const white = join(OUT, "brand", "logo-white.png");
  if (!skip(color)) {
    await sharp(src).resize({ width: 1200 }).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(color);
  }
  if (!skip(white)) {
    // keep the alpha channel, paint every visible pixel white
    const { data, info } = await sharp(src).resize({ width: 1200 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) { data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; }
    await sharp(data, { raw: info }).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(white);
  }
  console.log(`logo        ${kb(color)} / white ${kb(white)}`);
}

async function posters() {
  ensure(join(OUT, "posters"));
  for (const m of MOVIES) {
    const out = join(OUT, "posters", `${m.slug}.webp`);
    if (!skip(out)) {
      await sharp(find(m.poster, ".png")).resize(600, 900, { fit: "cover", position: "top" }).webp({ quality: 82 }).toFile(out);
    }
    console.log(`poster      ${m.slug.padEnd(38)} ${kb(out)}`);
  }
}

function trailers() {
  ensure(join(OUT, "trailers"));
  const passlog = join(tmpdir(), "sc-ffmpeg-pass");
  for (const m of MOVIES) {
    const src = find(m.trailer, ".mp4");
    const out = join(OUT, "trailers", `${m.slug}.mp4`);
    const frame = join(OUT, "trailers", `${m.slug}.webp`);
    const dur = duration(src);
    if (!skip(out)) {
      // two-pass ABR so every file lands under the size cap; short trailers get up to MAX_VIDEO_KBPS
      const vk = Math.min(MAX_VIDEO_KBPS, Math.floor((MAX_BYTES * 8) / 1000 / dur - AUDIO_KBPS));
      const common = ["-y", "-i", src, "-vf", "scale=-2:720,fps=30", "-c:v", "libx264", "-preset", "slow",
        "-profile:v", "high", "-pix_fmt", "yuv420p", "-b:v", `${vk}k`, "-maxrate", `${Math.round(vk * 1.6)}k`,
        "-bufsize", `${vk * 2}k`, "-passlogfile", passlog];
      run(ffmpegPath, [...common, "-pass", "1", "-an", "-f", "mp4", process.platform === "win32" ? "NUL" : "/dev/null"]);
      run(ffmpegPath, [...common, "-pass", "2", "-c:a", "aac", "-b:a", `${AUDIO_KBPS}k`, "-ac", "2",
        "-movflags", "+faststart", out]);
    }
    if (!skip(frame)) {
      const tmp = join(tmpdir(), `sc-frame-${m.slug}.png`);
      // most representative frame (ffmpeg "thumbnail" filter) from ~4s around 25% in — avoids black title cards
      run(ffmpegPath, ["-y", "-ss", String(Math.round(dur * 0.25)), "-i", src, "-vf", "thumbnail=120,scale=1280:720",
        "-frames:v", "1", tmp]);
      sharp.cache(false);
      // eslint-disable-next-line no-await-in-loop
      sharpQueue.push(sharp(tmp).webp({ quality: 78 }).toFile(frame).then(() => rmSync(tmp, { force: true })));
    }
    console.log(`trailer     ${m.slug.padEnd(38)} ${kb(out)}  (${Math.round(dur)}s)`);
  }
  for (const f of readdirSync(tmpdir()).filter((n) => n.startsWith("sc-ffmpeg-pass"))) rmSync(join(tmpdir(), f), { force: true });
}
const sharpQueue = [];

await logos();
await posters();
trailers();
await Promise.all(sharpQueue);
console.log("done");
