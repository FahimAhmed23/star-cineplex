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
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

export function useModelGeometry(url: string) {
  const { scene } = useGLTF(url);
  return useMemo(() => extractGeometry(scene), [scene]);
}

export function usePersonGeometries() {
  const gltfs = useGLTF(PERSON_URLS);
  return useMemo(() => gltfs.map((g) => extractGeometry(g.scene)), [gltfs]);
}
