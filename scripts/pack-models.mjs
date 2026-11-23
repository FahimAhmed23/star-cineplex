// Packs the raw Blender exports (tools/blender/out/*.glb) into compressed web models in /public/models.
// Run: npm run models   (after running tools/blender/build_models.py)
//
// Seats and audience silhouettes are merged into ONE primitive so the hall can draw each type with a single
// InstancedMesh draw call (CLAUDE.md §10). Per-vertex attributes keep what the materials described:
//   COLOR_0  base colour (white on upholstery, real colour on frames, walnut, metal)
//   _TINT    1 = upholstery (recoloured per branch / seat state at runtime), 0 = keeps its own colour
//   _ROUGH   roughness
// Doors keep their materials. Everything is meshopt-compressed (drei useGLTF decodes meshopt by default).
import { readdirSync, mkdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { joinPrimitives, meshopt, prune, dedup, weld } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder } from "meshoptimizer";

const SRC = "tools/blender/out";
const OUT = "public/models";
const BUDGET_KB = 300;
mkdirSync(OUT, { recursive: true });

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder });

function mergeToSinglePrimitive(doc) {
  const root = doc.getRoot();
  const buffer = root.listBuffers()[0];
  const scene = root.getDefaultScene() ?? root.listScenes()[0];
  const meshNodes = [];
  scene.traverse((n) => { if (n.getMesh()) meshNodes.push(n); });
  if (meshNodes.length !== 1) throw new Error(`expected one mesh node, got ${meshNodes.length}`);
  const node = meshNodes[0];
  const mesh = node.getMesh();
  const prims = mesh.listPrimitives();

  for (const prim of prims) {
    const m = prim.getMaterial();
    const name = m?.getName() ?? "";
    const tint = name.startsWith("TINT_") ? 1 : 0;
    const [r, g, b] = m ? m.getBaseColorFactor() : [1, 1, 1];
    const rough = m ? m.getRoughnessFactor() : 0.8;
    const n = prim.getAttribute("POSITION").getCount();
    const color = new Float32Array(n * 3);
    const tintArr = new Float32Array(n).fill(tint);
    const roughArr = new Float32Array(n).fill(rough);
    for (let i = 0; i < n; i++) color.set([r, g, b], i * 3);
    prim.setAttribute("COLOR_0", doc.createAccessor().setType("VEC3").setArray(color).setBuffer(buffer));
    prim.setAttribute("_TINT", doc.createAccessor().setType("SCALAR").setArray(tintArr).setBuffer(buffer));
    prim.setAttribute("_ROUGH", doc.createAccessor().setType("SCALAR").setArray(roughArr).setBuffer(buffer));
  }

  // one shared material so the primitives can be joined; real colours now live in the vertex attributes
  const material = doc.createMaterial("seat").setBaseColorFactor([1, 1, 1, 1]).setRoughnessFactor(0.8).setMetallicFactor(0);
  for (const p of prims) p.setMaterial(material);
  const joined = prims.length > 1 ? joinPrimitives(prims) : prims[0];
  if (joined !== prims[0]) {
    for (const p of prims) { mesh.removePrimitive(p); p.dispose(); }
    mesh.addPrimitive(joined);
  }
}

const files = readdirSync(SRC).filter((f) => f.endsWith(".glb"));
if (!files.length) throw new Error(`No .glb in ${SRC} — run tools/blender/build_models.py first`);

for (const file of files) {
  const name = basename(file, ".glb");
  const doc = await io.read(join(SRC, file));
  if (name.startsWith("seat-") || name.startsWith("person-")) mergeToSinglePrimitive(doc);
  await doc.transform(
    dedup(),
    weld(),
    prune(),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  const out = join(OUT, `${name}.glb`);
  await io.write(out, doc);
  const kb = statSync(out).size / 1024;
  console.log(`${name.padEnd(20)} ${kb.toFixed(1).padStart(6)} KB${kb > BUDGET_KB ? "  ✗ over budget" : ""}`);
}
