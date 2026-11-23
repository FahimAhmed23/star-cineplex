"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { hash01, type HallLayout, type PlacedSeat } from "@/lib/hall-layout";
import { createTintMaterial } from "./materials";
import { usePersonGeometries } from "./models";

// Flat dark colours with slight variation, faintly rim-lit by the screen (§9.5 Seated people on booked seats)
const PALETTE = ["#2b2a30", "#3a2438", "#1f2540", "#302a2a"].map((c) => new THREE.Color(c));
const VIP_SCALE = 1.04; // recliners sit a little lower/deeper; a touch bigger reads better

interface Props {
  layout: HallLayout;
  booked: Set<string>;
  rimColor?: THREE.Color;
}

/** Seated silhouettes on booked seats: 4 variants, one InstancedMesh (one draw call) per variant. */
export function Audience({ layout, booked, rimColor }: Props) {
  const geometries = usePersonGeometries();
  const material = useMemo(() => createTintMaterial({ rim: true }), []);

  useLayoutEffect(() => {
    if (rimColor) material.rimUniforms.uRimColor.value.copy(rimColor);
  });

  const byVariant = useMemo(() => {
    const v: PlacedSeat[][] = [[], [], [], []];
    for (const s of layout.seats) if (booked.has(s.id)) v[Math.floor(hash01(s.id, 1) * 4)].push(s);
    return v;
  }, [layout, booked]);

  return (
    <group>
      {byVariant.map((seats, i) => (
        <Variant key={i} geometry={geometries[i]} material={material} seats={seats} />
      ))}
    </group>
  );
}

function Variant({ geometry, material, seats }: { geometry: THREE.BufferGeometry; material: THREE.Material; seats: PlacedSeat[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const c = new THREE.Color();
    seats.forEach((s, i) => {
      const turn = (hash01(s.id, 2) - 0.5) * THREE.MathUtils.degToRad(10); // ±5°
      const size = (0.95 + hash01(s.id, 3) * 0.1) * (s.model === "vip" ? VIP_SCALE : 1);
      const back = s.model === "vip" ? -0.08 : s.model === "semi-recliner" ? -0.04 : 0;
      q.setFromEuler(e.set(0, turn, 0));
      m.compose(new THREE.Vector3(s.x, s.y + (s.model === "vip" ? 0.02 : 0), s.z + back), q, new THREE.Vector3(size, size, size));
      mesh.setMatrixAt(i, m);
      c.copy(PALETTE[Math.floor(hash01(s.id, 4) * PALETTE.length)]).multiplyScalar(0.9 + hash01(s.id, 5) * 0.2);
      mesh.setColorAt(i, c);
    });
    mesh.count = seats.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [seats]);

  // the shared geometry needs the glow attribute the tint shader expects
  const glow = useMemo(() => new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, seats.length)), 1), [seats.length]);
  const geo = useMemo(() => {
    const g = geometry.clone();
    g.setAttribute("instanceGlow", glow);
    return g;
  }, [geometry, glow]);

  if (!seats.length) return null;
  return <instancedMesh ref={ref} args={[geo, material, seats.length]} raycast={() => null} />;
}
