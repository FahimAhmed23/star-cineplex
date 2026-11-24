"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { EYE_HEIGHT, type HallLayout } from "@/lib/hall-layout";
import { EASE_IN_OUT } from "@/lib/motion";
import { useUi } from "@/lib/store";
import { STORY, band } from "@/lib/story";


export type CameraMode = "front" | "overview" | "seat";

interface Props {
  layout: HallLayout;
  mode: CameraMode;
  /** seat for "view from seat" */
  seatId?: string | null;
  /** bump to return the overview to its start position ("Reset view") */
  resetKey?: number;
  /** idle drift in the hero front view (±0.3°) */
  drift?: boolean;
}

interface Pose {
  pos: THREE.Vector3;
  look: THREE.Vector3;
}

const OVERVIEW_ELEVATION = THREE.MathUtils.degToRad(52); // 50–55° looking down (§9.5)
const MARGIN = 0.92; // seats fill the view with ~8% margin
const BASE_FOV = 42; // overview + view from seat
const HERO_FOV = 54; // the angled hero shot needs a wider lens to keep the whole screen on the right half

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * §8.1 step 5 / §8.2 hero: an angled view from the left side of the hall, just above the back rows.
 * The dark left wall and seats fill the left of the frame (calm space for the hero text) and the screen
 * sits on the right half. (Designer decision, replacing the centred front view.)
 */
export function frontPose(layout: HallLayout): Pose {
  const t = layout.tiers[layout.tiers.length - 1];
  const { room, screen } = layout;
  return {
    pos: new THREE.Vector3(-room.width * 0.36, t.y + EYE_HEIGHT + 0.9, t.z + 1.6),
    // aim left of the screen centre, so the screen lands right of the frame centre
    look: new THREE.Vector3(-screen.width * 0.46, screen.y - screen.height * 0.2, screen.z),
  };
}

/**
 * §8.3 beat 3, the end of the walk: down the left side aisle ~6 rows, seated eye height, turned towards
 * the screen, slightly off-axis (frames 05–06 of the reference).
 */
export function walkPose(layout: HallLayout): Pose {
  const { room, screen, tiers, metrics } = layout;
  const t = tiers[Math.max(0, tiers.length - 7)];
  return {
    pos: new THREE.Vector3(-(room.width / 2 - metrics.sideAisle * 0.55), t.y + EYE_HEIGHT + 0.15, t.z + 0.2),
    // aimed left of and below the screen: the screen lands upper-right, beside the headline and above the cards
    look: new THREE.Vector3(-screen.width * 0.32, screen.y - screen.height * 0.6, screen.z),
  };
}

/** §9.5 overview: behind the last row, high up, whole seating area fitted to the viewport. */
export function overviewPose(layout: HallLayout, aspect: number, fov: number): Pose {
  const { min, max } = layout.seatBounds;
  const s = layout.screen;
  const pts = [
    ...[min[0], max[0]].flatMap((x) => [min[1], max[1]].flatMap((y) => [min[2], max[2]].map((z) => new THREE.Vector3(x, y, z)))),
    new THREE.Vector3(-s.width * 0.3, s.y - s.height / 2, s.z),
    new THREE.Vector3(s.width * 0.3, s.y - s.height / 2, s.z),
  ];
  const look = new THREE.Vector3((min[0] + max[0]) / 2, min[1] + 0.4, (min[2] + max[2]) / 2 - 1.2);
  const dir = new THREE.Vector3(0, Math.sin(OVERVIEW_ELEVATION), Math.cos(OVERVIEW_ELEVATION));
  const cam = new THREE.PerspectiveCamera(fov, aspect, 0.1, 500);
  const fits = (d: number) => {
    cam.position.copy(look).addScaledVector(dir, d);
    cam.lookAt(look);
    cam.updateMatrixWorld();
    return pts.every((p) => {
      const v = p.clone().project(cam);
      return Math.abs(v.x) <= MARGIN && Math.abs(v.y) <= MARGIN && v.z < 1;
    });
  };
  let lo = 2;
  let hi = 120;
  for (let k = 0; k < 30; k++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) hi = mid;
    else lo = mid;
  }
  return { pos: look.clone().addScaledVector(dir, hi), look };
}

/** §9.5 view from seat: seated eye height, looking at the centre of the screen. */
export function seatPose(layout: HallLayout, seatId: string): Pose | null {
  const s = layout.byId.get(seatId);
  if (!s) return null;
  const back = s.model === "vip" ? -0.22 : s.model === "semi-recliner" ? -0.12 : -0.06;
  return {
    pos: new THREE.Vector3(s.x, s.y + EYE_HEIGHT + (s.model === "vip" ? -0.05 : 0), s.z + back),
    look: new THREE.Vector3(0, layout.screen.y - 0.2, layout.screen.z),
  };
}

export function CameraRig({ layout, mode, seatId, resetKey = 0, drift = false }: Props) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const controls = useRef<OrbitControlsImpl>(null);
  const pose = useRef<Pose>(frontPose(layout));
  const tweening = useRef(false);
  const first = useRef(true);
  const [orbitReady, setOrbitReady] = useState(false);

  // look-around while in a seat: full 360° yaw, ±30° pitch, eases back after ~2s idle
  const look = useRef({ yaw: 0, pitch: 0, dragging: false, lastInput: 0 });

  const overview = useMemo(
    () => overviewPose(layout, size.width / size.height, BASE_FOV),
    [layout, size.width, size.height],
  );

  const targetPose = useMemo<Pose>(() => {
    if (mode === "overview") return overview;
    if (mode === "seat" && seatId) return seatPose(layout, seatId) ?? overview;
    return frontPose(layout);
    // resetKey: recompute (and re-tween) on "Reset view"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, seatId, layout, overview, resetKey]);

  useEffect(() => {
    const from = { p: pose.current.pos.clone(), l: pose.current.look.clone() };
    // read the live orbit position so the glide starts where the user left the camera
    if (controls.current && !tweening.current) {
      from.p.copy(camera.position);
      from.l.copy(controls.current.target);
    }
    look.current.yaw = 0;
    look.current.pitch = 0;
    const duration = first.current || reducedMotion() ? 0 : mode === "seat" ? 1.2 : 1.0;
    first.current = false;
    const state = { t: 0 };
    tweening.current = true;
    setOrbitReady(false);
    const tween = gsap.to(state, {
      t: 1,
      duration,
      ease: EASE_IN_OUT,
      onUpdate: () => {
        pose.current.pos.lerpVectors(from.p, targetPose.pos, state.t);
        pose.current.look.lerpVectors(from.l, targetPose.look, state.t);
      },
      onComplete: () => {
        tweening.current = false;
        setOrbitReady(true);
        if (controls.current) {
          controls.current.target.copy(targetPose.look);
          camera.position.copy(targetPose.pos);
          controls.current.update();
        }
      },
    });
    if (duration === 0) tween.progress(1);
    return () => {
      tween.kill();
    };
  }, [targetPose, camera, mode]);

  // pointer look-around in seat mode
  useEffect(() => {
    if (mode !== "seat") return;
    const el = gl.domElement;
    let px = 0;
    let py = 0;
    const down = (e: PointerEvent) => {
      look.current.dragging = true;
      px = e.clientX;
      py = e.clientY;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!look.current.dragging) return;
      const k = 0.005;
      look.current.yaw += (e.clientX - px) * k;
      look.current.pitch = THREE.MathUtils.clamp(look.current.pitch + (e.clientY - py) * k, -Math.PI / 6, Math.PI / 6);
      px = e.clientX;
      py = e.clientY;
      look.current.lastInput = performance.now();
    };
    const up = () => {
      look.current.dragging = false;
      look.current.lastInput = performance.now();
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [mode, gl]);

  const walk = useMemo(() => walkPose(layout), [layout]);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, dt) => {
    // lens: wider for the hero, normal elsewhere (eased so mode changes never jump)
    const targetFov = mode === "front" ? HERO_FOV : BASE_FOV;
    if (Math.abs(camera.fov - targetFov) > 0.01) {
      camera.fov += (targetFov - camera.fov) * (first.current ? 1 : 1 - Math.exp(-dt * 4));
      camera.updateProjectionMatrix();
    }
    const orbiting = mode === "overview" && !tweening.current;
    if (orbiting) return; // OrbitControls owns the camera
    camera.position.copy(pose.current.pos);
    tmp.copy(pose.current.look);

    // §8.3 the scroll story walks the hero camera into the hall (progress from the pinned scroll)
    const k = mode === "front" ? band(STORY.walk[0], STORY.walk[1], useUi.getState().heroScroll) : 0;
    if (k > 0) {
      camera.position.lerp(walk.pos, k);
      tmp.lerp(walk.look, k);
    }

    if (mode === "front" && drift && k < 1) {
      const t = state.clock.elapsedTime;
      const a = THREE.MathUtils.degToRad(0.3);
      const d = tmp.distanceTo(camera.position);
      tmp.x += Math.sin(t * 0.07) * a * d;
      tmp.y += Math.sin(t * 0.05 + 1) * a * 0.5 * d;
    }

    if (mode === "seat") {
      const L = look.current;
      if (!L.dragging && performance.now() - L.lastInput > 2000) {
        // ease back to the screen; take the short way round
        L.yaw = Math.atan2(Math.sin(L.yaw), Math.cos(L.yaw));
        const k = 1 - Math.exp(-dt * 2.5);
        L.yaw -= L.yaw * k;
        L.pitch -= L.pitch * k;
      }
      const dir = tmp.clone().sub(camera.position);
      dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), -L.yaw);
      const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
      dir.applyAxisAngle(right, -L.pitch);
      tmp.copy(camera.position).add(dir);
    }
    camera.lookAt(tmp);
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enabled={mode === "overview" && orbitReady}
      enableDamping
      dampingFactor={0.08}
      enablePan={false}
      zoomToCursor
      minDistance={3}
      maxDistance={overview.pos.distanceTo(overview.look) * 1.08}
      minAzimuthAngle={THREE.MathUtils.degToRad(-60)}
      maxAzimuthAngle={THREE.MathUtils.degToRad(60)}
      minPolarAngle={THREE.MathUtils.degToRad(30)} /* 60° above the horizon */
      maxPolarAngle={THREE.MathUtils.degToRad(75)} /* 15° above the horizon */
    />
  );
}
