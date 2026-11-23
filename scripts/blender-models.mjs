// Runs tools/blender/build_models.py headless. Override the Blender path with the BLENDER env var.
// Run: npm run models:blender   (then npm run models to pack them)
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const candidates = [
  process.env.BLENDER,
  "C:\\Program Files\\Blender Foundation\\Blender 5.3\\blender.exe",
  "/Applications/Blender.app/Contents/MacOS/Blender",
  "blender",
].filter(Boolean);
const blender = candidates.find((p) => p === "blender" || existsSync(p));

const r = spawnSync(blender, ["-b", "--factory-startup", "--python", "tools/blender/build_models.py", "--", "tools/blender/out"], {
  stdio: "inherit",
});
process.exit(r.status ?? 1);
