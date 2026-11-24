"use client";

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { HallLayout, PlacedSeat, SeatModel } from "@/lib/hall-layout";
import { createTintMaterial } from "./materials";
import { SEAT_MODEL_URL, useModelGeometry } from "./models";

export interface SeatColors {
  fabric: string;
  leather: string;
}

interface Props {
  layout: HallLayout;
  colors: SeatColors;
  booked: Set<string>;
  selected?: Set<string>;
  hovered?: string | null;
  /** seats of this class glow softly (legend hover, §9.5 readability rule) */
  highlightClass?: string | null;
  onSeatPointer?: (seat: PlacedSeat | null, e?: ThreeEvent<PointerEvent>) => void;
  onSeatClick?: (seat: PlacedSeat, e: ThreeEvent<MouseEvent>) => void;
}

const GOLD = new THREE.Color("#f5b72e"); // "your seat" (§9.5)
const BOOKED = new THREE.Color("#1d1c20"); // dark grey, ≈40% brightness — must read darker than oxblood VIP leather (§9.5)
const LIFT = 0.06;

/** One InstancedMesh (= one draw call) per seat model, built straight from the hall data. */
export function Seats(props: Props) {
  const groups = useMemo(() => {
    const g = new Map<SeatModel, PlacedSeat[]>();
    for (const s of props.layout.seats) {
      if (!g.has(s.model)) g.set(s.model, []);
      g.get(s.model)!.push(s);
    }
    return [...g.entries()];
  }, [props.layout]);

  return (
    <group>
      {groups.map(([model, seats]) => (
        <SeatGroup key={model} model={model} seats={seats} {...props} />
      ))}
    </group>
  );
}

function SeatGroup({
  model,
  seats,
  colors,
  booked,
  selected,
  hovered,
  highlightClass,
  onSeatPointer,
  onSeatClick,
}: Props & { model: SeatModel; seats: PlacedSeat[] }) {
  const geometry = useModelGeometry(SEAT_MODEL_URL[model]);
  const material = useMemo(() => createTintMaterial(), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  const glow = useMemo(() => new THREE.InstancedBufferAttribute(new Float32Array(seats.length), 1), [seats.length]);
  const lift = useRef(new Float32Array(seats.length));
  const base = useMemo(() => new THREE.Color(model === "vip" ? colors.leather : colors.fabric), [model, colors]);

  useLayoutEffect(() => {
    geometry.setAttribute("instanceGlow", glow);
  }, [geometry, glow]);

  // colours + targets whenever state changes
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const c = new THREE.Color();
    seats.forEach((s, i) => {
      c.copy(booked.has(s.id) ? BOOKED : selected?.has(s.id) ? GOLD : base);
      mesh.setColorAt(i, c);
    });
    mesh.instanceColor!.needsUpdate = true;
  }, [seats, booked, base, selected]);

  // matrices, hover/selected lift and glow — eased every frame
  const m = useMemo(() => new THREE.Matrix4(), []);
  useFrame((_, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    const k = 1 - Math.exp(-dt * 14);
    let dirty = false;
    seats.forEach((s, i) => {
      const isBooked = booked.has(s.id);
      const isSel = !!selected?.has(s.id);
      const isHover = hovered === s.id && !isBooked;
      const targetLift = isSel || isHover ? LIFT : 0;
      const targetGlow = isBooked ? 0 : isHover ? 0.3 : highlightClass === s.class ? 0.22 : isSel ? 0.12 : 0;
      const l = lift.current[i] + (targetLift - lift.current[i]) * k;
      const g = glow.array[i] + (targetGlow - glow.array[i]) * k;
      if (Math.abs(l - lift.current[i]) > 1e-5 || Math.abs(g - glow.array[i]) > 1e-5 || !mesh.userData.ready) {
        lift.current[i] = l;
        (glow.array as Float32Array)[i] = g;
        m.makeTranslation(s.x, s.y + l, s.z);
        mesh.setMatrixAt(i, m);
        dirty = true;
      }
    });
    if (dirty) {
      mesh.instanceMatrix.needsUpdate = true;
      glow.needsUpdate = true;
      if (!mesh.userData.ready) {
        mesh.computeBoundingSphere();
        mesh.userData.ready = true;
      }
    }
  });

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, seats.length]}
      onPointerMove={(e) => {
        e.stopPropagation();
        if (e.instanceId != null) onSeatPointer?.(seats[e.instanceId], e);
      }}
      onPointerOut={() => onSeatPointer?.(null)}
      onClick={(e) => {
        e.stopPropagation();
        if (e.instanceId != null) onSeatClick?.(seats[e.instanceId], e);
      }}
    />
  );
}
