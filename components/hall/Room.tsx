"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { HallLayout } from "@/lib/hall-layout";
import type { AccentPattern } from "@/lib/types";
import { lightMaterial } from "./materials";

export interface RoomLook {
  walls: string;
  carpet: string;
  accentLight: string;
  accentPattern: AccentPattern;
}

/** Walls, stadium tiers, stage, ceiling, step lights and the branch's accent lights — all simple geometry. */
export function Room({ layout, look }: { layout: HallLayout; look: RoomLook }) {
  const { room, tiers, metrics } = layout;
  const W = room.width;
  const zMid = (room.zFront + room.zBack) / 2;

  const mats = useMemo(() => {
    // acoustic fabric: soft vertical pleats (a tiny repeating shade texture, no lights)
    const pleats = pleatTexture();
    pleats.repeat.set(room.depth / 0.22, 1);
    const backPleats = pleatTexture();
    backPleats.repeat.set(W / 0.22, 1);
    return {
      wall: new THREE.MeshStandardMaterial({ color: look.walls, roughness: 0.95, map: pleats }),
      backWall: new THREE.MeshStandardMaterial({ color: look.walls, roughness: 0.95, map: backPleats }),
      frontWall: new THREE.MeshStandardMaterial({ color: new THREE.Color(look.walls).multiplyScalar(0.75), roughness: 0.9 }),
      carpet: new THREE.MeshStandardMaterial({ color: look.carpet, roughness: 1 }),
      riser: new THREE.MeshStandardMaterial({ color: new THREE.Color(look.carpet).multiplyScalar(0.55), roughness: 1 }),
      ceiling: new THREE.MeshStandardMaterial({ color: "#0c0a10", roughness: 1 }),
      black: new THREE.MeshStandardMaterial({ color: "#050406", roughness: 0.8 }),
      // thin LED strips: bright enough to bloom softly, never brighter than the screen (§8.2)
      accent: lightMaterial(look.accentLight, look.accentPattern === "diagonal" ? 1.6 : 3.2),
      step: lightMaterial(look.accentPattern === "sconces" ? "#ffb25e" : look.accentLight, 2.2),
      down: lightMaterial("#ffe2b0", 4),
      // the light an LED strip throws on the fabric around it (additive, no real lights: cheap on phones)
      glow: glowMaterial(look.accentLight, 0.14),
      // the wall is lit where the lights are and falls off towards the back and the floor
      // tinted towards the violet wall, like blue light on purple fabric
      wash: washMaterial(new THREE.Color(look.accentLight).lerp(new THREE.Color("#9a5cc0"), 0.55).getStyle(), 0.1),
      speaker: new THREE.MeshStandardMaterial({ color: "#121015", roughness: 0.55, metalness: 0.1 }),
      grille: new THREE.MeshStandardMaterial({ color: "#060508", roughness: 0.9 }),
    };
  }, [look, room.depth, W]);

  const lastTier = tiers[tiers.length - 1];
  const backFloorY = lastTier.y;

  return (
    <group>
      {/* front floor + stage */}
      <mesh material={mats.carpet} position={[0, -0.05, (room.zFront + tiers[0].z) / 2]}>
        <boxGeometry args={[W, 0.1, tiers[0].z - room.zFront]} />
      </mesh>
      <mesh material={mats.carpet} position={[0, 0.35, room.zFront + 0.9]}>
        <boxGeometry args={[W * 0.9, 0.7, 1.4]} />
      </mesh>

      {/* stadium tiers: one block per row, full width */}
      {tiers.map((t, i) => {
        const h = t.y + 0.1;
        const depth = i === tiers.length - 1 ? t.depth / 2 + metrics.rowDepth + 2.4 : t.depth;
        const z0 = t.z - metrics.rowDepth / 2;
        return (
          <group key={t.row}>
            <mesh material={mats.carpet} position={[0, t.y - 0.05, z0 + depth / 2]}>
              <boxGeometry args={[W, 0.1, depth]} />
            </mesh>
            {t.y > 0 && (
              <mesh material={mats.riser} position={[0, (t.y - 0.1) / 2, z0 + 0.01]}>
                <boxGeometry args={[W, Math.max(0.01, h - 0.1), 0.02]} />
              </mesh>
            )}
            {/* step lights at the riser edge in both side aisles */}
            {t.y > 0 &&
              [-1, 1].map((s) => (
                <mesh key={s} material={mats.step} position={[s * (W / 2 - metrics.sideAisle / 2), t.y - 0.06, z0 + 0.03]}>
                  <boxGeometry args={[metrics.sideAisle * 0.7, 0.025, 0.02]} />
                </mesh>
              ))}
          </group>
        );
      })}
      {/* fill under the tiers so the room reads solid from the sides */}
      <mesh material={mats.riser} position={[0, backFloorY / 2 - 0.1, room.zBack + 0.05]}>
        <boxGeometry args={[W, backFloorY + 0.1, 0.1]} />
      </mesh>

      {/* walls + ceiling: one-sided planes facing into the room, so a camera outside (the seat-selection
          overview above and behind the hall) looks straight through them — a cutaway */}
      {[-1, 1].map((s) => (
        <mesh key={s} material={mats.wall} position={[s * (W / 2), room.height / 2 - 0.1, zMid]} rotation-y={(-s * Math.PI) / 2}>
          <planeGeometry args={[room.depth, room.height + 0.2]} />
        </mesh>
      ))}
      {/* front wall in the hall's wall colour (a little darker), so the black screen masking reads as a frame */}
      <mesh material={mats.frontWall} position={[0, room.height / 2, room.zFront]}>
        <planeGeometry args={[W, room.height]} />
      </mesh>
      <mesh material={mats.backWall} position={[0, room.height / 2, room.zBack]} rotation-y={Math.PI}>
        <planeGeometry args={[W, room.height]} />
      </mesh>
      <mesh material={mats.ceiling} position={[0, room.height, zMid]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[W, room.depth]} />
      </mesh>

      {/* ceiling downlights */}
      {downlights(W, room.zFront + 2, room.zBack - 1.5).map(([x, z], i) => (
        <mesh key={i} material={mats.down} position={[x, room.height - 0.01, z]} rotation-x={Math.PI / 2}>
          <circleGeometry args={[0.07, 12]} />
        </mesh>
      ))}

      {/* projector window in the back wall */}
      <mesh material={lightMaterial("#dfe6ff", 2.5)} position={[0, Math.min(room.height - 0.8, backFloorY + 3), room.zBack - 0.01]} rotation-y={Math.PI}>
        <planeGeometry args={[0.9, 0.5]} />
      </mesh>

      {/* the screen itself (surface, trim, masking) lives in Screen.tsx */}

      <Accents layout={layout} look={look} material={mats.accent} glow={mats.glow} wash={mats.wash} />
      <WallDetails layout={layout} speaker={mats.speaker} grille={mats.grille} floorLight={mats.step} />
    </group>
  );
}

function downlights(W: number, z0: number, z1: number): [number, number][] {
  const out: [number, number][] = [];
  const cols = Math.max(3, Math.round(W / 4));
  const rows = Math.max(3, Math.round((z1 - z0) / 3.2));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) out.push([(c / (cols - 1) - 0.5) * (W - 3), z0 + (r / (rows - 1)) * (z1 - z0)]);
  return out;
}

/** Thin emissive bar between two points on a side wall plane (x fixed), in (z, y) coordinates. */
function Bar({ x, a, b, material, thickness = 0.035 }: { x: number; a: [number, number]; b: [number, number]; material: THREE.Material; thickness?: number }) {
  const dz = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dz, dy);
  const angle = Math.atan2(dy, dz);
  return (
    <mesh material={material} position={[x, (a[1] + b[1]) / 2, (a[0] + b[0]) / 2]} rotation-x={-angle}>
      <boxGeometry args={[0.02, thickness, len]} />
    </mesh>
  );
}

/** A soft band of light on the wall along a strip (same placement maths as Bar, but wide and additive). */
function Glow({ x, a, b, material, width = 0.45 }: { x: number; a: [number, number]; b: [number, number]; material: THREE.Material; width?: number }) {
  const dz = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dz, dy) + width * 0.5;
  const angle = Math.atan2(dy, dz);
  return (
    <mesh material={material} position={[x, (a[1] + b[1]) / 2, (a[0] + b[0]) / 2]} rotation-x={-angle} renderOrder={1}>
      <boxGeometry args={[0.001, width, len]} />
    </mesh>
  );
}

let pleatCache: THREE.CanvasTexture | null = null;
function pleatTexture() {
  if (!pleatCache) {
    const c = document.createElement("canvas");
    c.width = 32;
    c.height = 1;
    const g = c.getContext("2d")!;
    for (let i = 0; i < 32; i++) {
      // one fold: lit on one side, shadowed in the crease
      const v = 0.86 + 0.14 * Math.pow(Math.sin((i / 32) * Math.PI), 0.7);
      const n = Math.round(v * 255);
      g.fillStyle = `rgb(${n},${n},${n})`;
      g.fillRect(i, 0, 1, 1);
    }
    pleatCache = new THREE.CanvasTexture(c);
    pleatCache.colorSpace = THREE.SRGBColorSpace;
    pleatCache.wrapS = THREE.RepeatWrapping;
  }
  const t = pleatCache.clone();
  t.needsUpdate = true;
  return t;
}

function gradientTexture(radial: boolean) {
  const c = document.createElement("canvas");
  c.width = radial ? 128 : 1;
  c.height = 128;
  const g = c.getContext("2d")!;
  const grad = radial ? g.createRadialGradient(64, 64, 0, 64, 64, 64) : g.createLinearGradient(0, 0, 0, 128);
  const stops: [number, number][] = radial ? [[0, 1], [0.45, 0.45], [1, 0]] : [[0, 0], [0.5, 1], [1, 0]];
  for (const [o, a] of stops) grad.addColorStop(o, `rgba(255,255,255,${a})`);
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  return new THREE.CanvasTexture(c);
}

function glowMaterial(color: string, opacity: number) {
  return new THREE.MeshBasicMaterial({ color, map: gradientTexture(false), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
}
function washMaterial(color: string, opacity: number) {
  return new THREE.MeshBasicMaterial({ color, map: gradientTexture(true), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
}

/**
 * What every real hall wall has (footer photo): black box speakers between the light features, angled slightly down
 * towards the seats, and small floor lights along the wall base. They give the eye a real-world size to measure by.
 */
function WallDetails({ layout, speaker, grille, floorLight }: { layout: HallLayout; speaker: THREE.Material; grille: THREE.Material; floorLight: THREE.Material }) {
  const { room, tiers } = layout;
  const W = room.width;
  const floorAt = (z: number) => {
    let y = 0;
    for (const t of tiers) if (z >= t.z - t.depth / 2) y = t.y;
    return y;
  };
  const items: React.ReactNode[] = [];
  const z0 = room.zFront + 1.6;
  const z1 = room.zBack - 1.6;
  const nSpk = Math.max(3, Math.round((z1 - z0) / 4.2));
  for (const s of [-1, 1]) {
    const x = s * (W / 2);
    for (let i = 0; i < nSpk; i++) {
      const z = z0 + ((i + 0.5) / nSpk) * (z1 - z0);
      const y = Math.min(room.height - 1.4, floorAt(z) + 4.4);
      items.push(
        <group key={`spk${s}${i}`} position={[x - s * 0.2, y, z]} rotation={[0, 0, s * 0.18]}>
          <mesh material={speaker}>
            <boxGeometry args={[0.34, 0.62, 0.44]} />
          </mesh>
          <mesh material={grille} position={[-s * 0.172, 0, 0]}>
            <boxGeometry args={[0.005, 0.54, 0.36]} />
          </mesh>
        </group>,
      );
    }
    // small floor lights along the wall base
    for (let z = room.zFront + 0.8; z < room.zBack - 0.6; z += 1.2) {
      items.push(
        <mesh key={`fl${s}${z.toFixed(1)}`} material={floorLight} position={[x - s * 0.012, floorAt(z) + 0.18, z]}>
          <boxGeometry args={[0.01, 0.04, 0.07]} />
        </mesh>,
      );
    }
  }
  return <group>{items}</group>;
}

function Accents({ layout, look, material, glow, wash }: { layout: HallLayout; look: RoomLook; material: THREE.Material; glow: THREE.Material; wash: THREE.Material }) {
  const { room, tiers } = layout;
  const W = room.width;
  const z0 = room.zFront + 0.8;
  const z1 = room.zBack - 0.8;
  const span = z1 - z0;
  const yLow = 1.2;
  const yHigh = room.height - 0.6;
  const floorAt = (z: number) => {
    let y = 0;
    for (const t of tiers) if (z >= t.z - t.depth / 2) y = t.y;
    return y;
  };
  const items: React.ReactNode[] = [];

  for (const s of [-1, 1]) {
    const x = s * (W / 2 - 0.01);
    const key = (i: number | string) => `${s}-${i}`;
    switch (look.accentPattern) {
      case "diagonal": {
        // Bashundhara (footer photo): thin blue LED strips from just above the floor to just under the ceiling,
        // in tall narrow X's (≈1:3) that overlap by half, so they cross twice like a lattice, along the whole wall
        // (designer, Nov 26: full length, a little dimmer).
        const w = 2.6; // horizontal run of one strip
        const d = w / 2; // spacing between strips
        const start = room.zFront + 0.8;
        const usable = room.zBack - 0.8 - start;
        const n = Math.max(3, Math.floor((usable - w) / d) + 1); // strips in each direction, end to end
        const top = room.height - 0.45;
        const lowAt = (z: number) => floorAt(z) + 0.55;
        for (let i = 0; i < n; i++) {
          const a = start + i * d;
          const b = a + w;
          const up: [[number, number], [number, number]] = [[a, lowAt(a)], [b, top]];
          const down: [[number, number], [number, number]] = [[a, top], [b, lowAt(b)]];
          if (i < n - 1) {
            items.push(<Bar key={key(`u${i}`)} x={x} a={up[0]} b={up[1]} material={material} thickness={0.026} />);
            items.push(<Glow key={key(`gu${i}`)} x={x - s * 0.004} a={up[0]} b={up[1]} material={glow} />);
          }
          if (i > 0) {
            items.push(<Bar key={key(`d${i}`)} x={x} a={down[0]} b={down[1]} material={material} thickness={0.026} />);
            items.push(<Glow key={key(`gd${i}`)} x={x - s * 0.004} a={down[0]} b={down[1]} material={glow} />);
          }
        }
        // the wall is lit around the lattice and falls off towards the back and the floor
        const zc = start + ((n - 1) * d + w) / 2;
        const len = Math.min(room.depth, (n - 1) * d + w + 3);
        items.push(
          <mesh key={key("wash")} material={wash} position={[x - s * 0.003, room.height * 0.6, zc]} rotation-y={(-s * Math.PI) / 2} renderOrder={1}>
            <planeGeometry args={[len, room.height * 1.1]} />
          </mesh>,
        );
        break;
      }
      case "zigzag": {
        const n = Math.max(6, Math.round(span / 1.6));
        for (let i = 0; i < n; i++) {
          const a = z0 + (i / n) * span;
          const b = z0 + ((i + 1) / n) * span;
          const mid = (yLow + yHigh) / 2 + floorAt(a) / 2;
          items.push(<Bar key={key(i)} x={x} a={[a, i % 2 ? mid + 0.6 : mid - 0.6]} b={[b, i % 2 ? mid - 0.6 : mid + 0.6]} material={material} />);
        }
        break;
      }
      case "columns": {
        const n = Math.max(4, Math.round(span / 3));
        for (let i = 0; i <= n; i++) {
          const z = z0 + (i / n) * span;
          items.push(<Bar key={key(i)} x={x} a={[z, floorAt(z) + 0.4]} b={[z + 0.001, yHigh]} material={material} thickness={0.12} />);
        }
        break;
      }
      case "lines": {
        for (let k = 0; k < 3; k++) {
          const y = yLow + 1 + k * ((yHigh - yLow - 1) / 3);
          items.push(<Bar key={key(k)} x={x} a={[z0, y]} b={[z1, y + 1.2]} material={material} />);
        }
        break;
      }
      case "hexagon":
      case "stars":
      case "downlights": {
        const n = Math.max(6, Math.round(span / 1.8));
        for (let i = 0; i < n; i++) {
          const z = z0 + ((i + 0.5) / n) * span;
          const y = floorAt(z) + (look.accentPattern === "downlights" ? yHigh - floorAt(z) - 0.4 : 2.2 + (i % 2) * 1.4);
          items.push(
            <mesh key={key(i)} material={material} position={[x, y, z]} rotation-y={(-s * Math.PI) / 2}>
              <circleGeometry args={[look.accentPattern === "stars" ? 0.05 : 0.14, look.accentPattern === "hexagon" ? 6 : 10]} />
            </mesh>,
          );
        }
        break;
      }
      case "sconces": {
        // VIP: warm wall sconces between walnut panels
        const n = Math.max(4, Math.round(span / 3.2));
        for (let i = 0; i < n; i++) {
          const z = z0 + ((i + 0.5) / n) * span;
          items.push(
            <mesh key={key(i)} material={material} position={[x - s * 0.04, floorAt(z) + 2.3, z]}>
              <boxGeometry args={[0.06, 0.4, 0.12]} />
            </mesh>,
          );
          items.push(
            <mesh key={key(`p${i}`)} position={[x - s * 0.02, (yHigh + 0.6) / 2, z + span / n / 2]}>
              <boxGeometry args={[0.03, yHigh + 0.6, 0.08]} />
              <meshStandardMaterial color="#4a2c1c" roughness={0.6} />
            </mesh>,
          );
        }
        break;
      }
    }
  }
  return <group>{items}</group>;
}
