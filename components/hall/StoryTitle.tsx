"use client";

import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { HallLayout } from "@/lib/hall-layout";
import { useUi } from "@/lib/store";
import { STORY, band } from "@/lib/story";

/**
 * §8.3 beat 2: the current film's title as giant 3D text standing inside the hall, between the screen
 * and the front rows, so the seat backs cover the bottom of the letters. It rises from below the floor,
 * then slides out to the left while the camera walks in. Driven by the story progress (no re-renders).
 */
export function StoryTitle({ layout, title }: { layout: HallLayout; title: string }) {
  const group = useRef<THREE.Group>(null);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color("#f3eee6"), transparent: true, opacity: 0, depthWrite: true }),
    [],
  );
  const width = useRef(layout.room.width);
  // "The Hunger Games: Sunrise on the Reaping" → "The Hunger Games": the short form reads at this size
  const text = title.split(/[:–—]/)[0].trim();
  // just in front of row A, so the first rows' seat backs cover the bottom of the letters from the hero camera
  const z = -layout.metrics.rowDepth * 1.2;
  // centred in the room: from the angled hero view the left wall hides anything wider, so the word fits the hall
  const x0 = -layout.room.width * 0.06;
  const target = layout.room.width * 0.8; // fills the hall between the walls (the walls frame it like "Embers")

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const p = useUi.getState().heroScroll;
    const rise = band(STORY.titleIn[0], STORY.titleIn[1], p);
    const out = band(STORY.titleOut[0], STORY.titleOut[1], p);
    g.visible = p > STORY.titleIn[0] && out < 1;
    g.position.set(x0 - out * width.current * 1.2, THREE.MathUtils.lerp(-2.6, 0.1, rise), z);
    mat.opacity = Math.min(rise * 1.6, 1) * (1 - band(STORY.titleOut[0] + 0.1, STORY.titleOut[1], p));
  });

  return (
    <group ref={group} visible={false}>
      <Text
        font="/fonts/fraunces-800-soft.ttf"
        fontSize={3.6}
        anchorX="center"
        anchorY="bottom"
        whiteSpace="nowrap"
        letterSpacing={-0.025}
        material={mat}
        onSync={(mesh: THREE.Mesh) => {
          // fit long titles to the target width; short ones keep their full size
          const box = (mesh as unknown as { textRenderInfo?: { blockBounds: number[] } }).textRenderInfo?.blockBounds;
          if (!box) return;
          const w = box[2] - box[0];
          const s = Math.min(1, target / w);
          mesh.scale.setScalar(s);
          width.current = w * s;
        }}
      >
        {text}
      </Text>
    </group>
  );
}
