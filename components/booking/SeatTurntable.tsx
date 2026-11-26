"use client";

import { PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { SEAT_MODEL_URL, useModelGeometry } from "@/components/hall/models";
import type { SeatModel } from "@/lib/hall-layout";

/**
 * §9.3 a slowly turning seat for an experience card (~8s per turn, soft studio light on night). Hover: a bit
 * faster, with a purple rim light. Atmos gets faint sound-wave rings. Rendered inside a drei <View>.
 */
export function SeatTurntable({ model, color, leather, hover, rings, angle }: { model: SeatModel; color: string; leather: boolean; hover: boolean; rings?: boolean; /** freeze at this angle (stills, /dev/capture) */ angle?: number }) {
  const geometry = useModelGeometry(SEAT_MODEL_URL[model]);
  const spin = useRef<THREE.Group>(null);
  const rim = useRef<THREE.DirectionalLight>(null);
  const ringGroup = useRef<THREE.Group>(null);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: leather ? 0.45 : 0.85, metalness: 0 }),
    [color, leather],
  );
  const ringMats = useMemo(
    () => [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ color: new THREE.Color("#b784d6"), transparent: true, opacity: 0, depthWrite: false })),
    [],
  );
  // centre the model on its footprint, feet on y = 0
  const { offset, height, width } = useMemo(() => {
    const b = geometry.boundingBox!;
    return {
      offset: new THREE.Vector3(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2),
      height: b.max.y - b.min.y,
      width: Math.max(b.max.x - b.min.x, b.max.z - b.min.z),
    };
  }, [geometry]);
  const speed = useRef(1);

  useFrame((state, dt) => {
    speed.current += ((hover ? 1.7 : 1) - speed.current) * (1 - Math.exp(-dt * 4));
    if (spin.current) spin.current.rotation.y = angle ?? spin.current.rotation.y + dt * ((Math.PI * 2) / 8) * speed.current;
    if (rim.current) rim.current.intensity += ((hover ? 3.2 : 0.7) - rim.current.intensity) * (1 - Math.exp(-dt * 5));
    if (ringGroup.current) {
      const t = state.clock.elapsedTime;
      ringGroup.current.children.forEach((r, i) => {
        const k = ((t * 0.35 + i / 3) % 1 + 1) % 1; // each ring grows and fades, one after another
        r.scale.setScalar(0.7 + k * 0.9);
        ringMats[i].opacity = 0.35 * (1 - k);
      });
    }
  });

  const dist = Math.max(height, width) * 2.6;
  return (
    <>
      <color attach="background" args={["#07050a"]} />
      <PerspectiveCamera makeDefault fov={28} position={[dist * 0.55, height * 0.95, dist * 0.85]} onUpdate={(c) => c.lookAt(0, height * 0.42, 0)} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.8} color="#fff4e8" />
      <directionalLight ref={rim} position={[-2.5, 2, -3]} intensity={0.7} color="#b784d6" />
      <group ref={spin}>
        <mesh geometry={geometry} material={material} position={offset} />
      </group>
      {rings && (
        <group ref={ringGroup} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          {ringMats.map((m, i) => (
            <mesh key={i} material={m}>
              <ringGeometry args={[width * 0.62, width * 0.64, 64]} />
            </mesh>
          ))}
        </group>
      )}
    </>
  );
}
