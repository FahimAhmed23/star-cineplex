"use client";

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import type { SeatModel } from "@/lib/hall-layout";

export const SEAT_MODEL_URL: Record<SeatModel, string> = {
  premium: "/models/seat-premium.glb",
  "semi-recliner": "/models/seat-semi-recliner.glb",
  vip: "/models/seat-vip.glb",
  atmos: "/models/seat-atmos.glb",
};
/** The 8 hairstyles of references/ai/audience-silhouettes.png (messy, bun, cap, long, curly, hijab, ponytail, glasses). */
export const PERSON_URLS = "abcdefgh".split("").map((v) => `/models/person-${v}.glb`);
export const DOORS_URL = "/models/doors.glb";

/** Preload everything the hall needs (call on booking pages / during the opening sequence). */
export function preloadHallModels() {
  for (const u of [...Object.values(SEAT_MODEL_URL), ...PERSON_URLS]) useGLTF.preload(u);
}

/**
 * Pulls the single merged mesh out of a packed .glb and returns a plain Float32 geometry
 * with the node transform baked in (meshopt quantisation stores scale/offset on the node).
 */
function extractGeometry(scene: THREE.Object3D): THREE.BufferGeometry {
  scene.updateMatrixWorld(true);
  let mesh: THREE.Mesh | undefined;
  scene.traverse((o) => {
    if (!mesh && (o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh;
  });
  if (!mesh) throw new Error("model has no mesh");
  const src = mesh.geometry;
  const geo = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(src.attributes)) {
    const a = attr as THREE.BufferAttribute;
    const out = new Float32Array(a.count * a.itemSize);
    for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) out[i * a.itemSize + k] = a.getComponent(i, k);
    geo.setAttribute(name, new THREE.BufferAttribute(out, a.itemSize));
  }
  if (src.index) geo.setIndex(Array.from(src.index.array as ArrayLike<number>));
  geo.applyMatrix4(mesh.matrixWorld);
  fixZeroNormals(geo);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Some exported models carry a few zero-length normals (degenerate faces). Lighting normalises them into NaN, and
 * Bloom's blur spreads one NaN pixel over the whole frame — the hall flashed black during the seat dive (Nov 27).
 * Give those vertices the average normal of their neighbours in the same triangles (or straight up).
 */
function fixZeroNormals(geo: THREE.BufferGeometry) {
  const n = geo.getAttribute("normal") as THREE.BufferAttribute | undefined;
  if (!n) return;
  const bad: number[] = [];
  for (let i = 0; i < n.count; i++) {
    const l = Math.hypot(n.getX(i), n.getY(i), n.getZ(i));
    if (!(l > 1e-6) || !Number.isFinite(l)) bad.push(i);
  }
  if (!bad.length) return;
  const badSet = new Set(bad);
  const sum = new Map<number, THREE.Vector3>(bad.map((i) => [i, new THREE.Vector3()]));
  const idx = geo.index ? (geo.index.array as ArrayLike<number>) : null;
  const tris = idx ? idx.length / 3 : n.count / 3;
  const at = (t: number, k: number) => (idx ? idx[t * 3 + k] : t * 3 + k);
  for (let t = 0; t < tris; t++) {
    const v = [at(t, 0), at(t, 1), at(t, 2)];
    for (const a of v) {
      if (!badSet.has(a)) continue;
      for (const b of v) if (!badSet.has(b)) sum.get(a)!.add(new THREE.Vector3(n.getX(b), n.getY(b), n.getZ(b)));
    }
  }
  for (const i of bad) {
    const s = sum.get(i)!;
    if (s.lengthSq() < 1e-12) s.set(0, 1, 0);
    s.normalize();
    n.setXYZ(i, s.x, s.y, s.z);
  }
  n.needsUpdate = true;
}

export function useModelGeometry(url: string) {
  const { scene } = useGLTF(url);
  return useMemo(() => extractGeometry(scene), [scene]);
}

export function usePersonGeometries() {
  const gltfs = useGLTF(PERSON_URLS);
  return useMemo(() => gltfs.map((g) => extractGeometry(g.scene)), [gltfs]);
}
