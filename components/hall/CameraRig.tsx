"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { EYE_HEIGHT, type HallLayout } from "@/lib/hall-layout";
import { EASE_IN_OUT } from "@/lib/motion";


export type CameraMode = "front" | "overview" | "seat" | "portrait" | "topdown";

interface Props {
  layout: HallLayout;
  mode: CameraMode;
  /** seat for "view from seat" */
  seatId?: string | null;
  /** bump to return the overview to its start position ("Reset view") */
  resetKey?: number;
  /** idle drift in the hero front view (±0.3°) */
  drift?: boolean;
  /** overview: glide in to show these seats (§9.5 Best available) */
  focusSeats?: string[] | null;
  focusKey?: number;
  /** "topdown": the camera the seat map is drawn from (lib/topdown.ts) */
  topdown?: { pos: THREE.Vector3; look: THREE.Vector3; fov: number } | null;
}

interface Pose {
  pos: THREE.Vector3;
  look: THREE.Vector3;
}

const OVERVIEW_ELEVATION = THREE.MathUtils.degToRad(52); // 50–55° looking down (§9.5)
const MARGIN = 0.92; // seats fill the view with ~8% margin
const BASE_FOV = 42; // overview + view from seat
const HERO_FOV = 54;
const SEAT_FOV = 66; // view from seat: the screen plus the lit walls around it, like the reference video

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
 * §11 phones: a centred, straight-on view from just behind the last row, a little above the heads, so the
 * screen sits square in the upper part of a portrait frame (the phone hero is a still of this view with the
 * trailer laid over its screen). Returns the pose and the vertical fov that fits the screen width.
 */
export function portraitPose(layout: HallLayout, aspect: number): Pose & { fov: number } {
  const t = layout.tiers[layout.tiers.length - 1];
  const { screen } = layout;
  const pos = new THREE.Vector3(0, t.y + EYE_HEIGHT + 0.7, t.z + 1.2);
  const d = pos.z - screen.z;
  const hHalf = Math.atan(screen.width / 2 / 0.94 / d); // screen fills 94% of the width
  const vHalf = Math.atan(Math.tan(hHalf) / aspect);
  // aim below the screen so it lands in the upper part of the frame (no pitch keystone worth noticing)
  const look = new THREE.Vector3(0, pos.y - Math.tan(vHalf) * d * 0.38, screen.z);
  return { pos, look, fov: THREE.MathUtils.radToDeg(vHalf * 2) };
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

/** §11 phones, view from seat in portrait: widen the lens until the whole screen width fits (capped at 100°). */
function seatFovPortrait(layout: HallLayout, seatId: string | null | undefined, aspect: number) {
  const s = seatId ? layout.byId.get(seatId) : null;
  if (!s) return BASE_FOV;
  const d = s.z - layout.screen.z;
  const hHalf = Math.atan(layout.screen.width / 2 / 0.96 / d);
  const v = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hHalf) / aspect));
  return Math.min(100, Math.max(BASE_FOV, v));
}

/** §9.5 Best available: a closer overview aimed at a group of seats, from the same side and angle. */
export function focusPose(layout: HallLayout, overview: Pose, ids: string[]): Pose | null {
  const seats = ids.map((id) => layout.byId.get(id)).filter(Boolean) as NonNullable<ReturnType<typeof layout.byId.get>>[];
  if (!seats.length) return null;
  const c = new THREE.Vector3();
  seats.forEach((s) => c.add(new THREE.Vector3(s.x, s.y + 0.5, s.z)));
  c.divideScalar(seats.length);
  const dir = overview.pos.clone().sub(overview.look).normalize();
  const dist = overview.pos.distanceTo(overview.look) * 0.5;
  return { pos: c.clone().addScaledVector(dir, dist), look: c };
}

export function CameraRig({ layout, mode, seatId, resetKey = 0, drift = false, focusSeats, focusKey = 0, topdown }: Props) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const controls = useRef<OrbitControlsImpl>(null);
  const pose = useRef<Pose>(frontPose(layout));
  const tweening = useRef(false);
  const first = useRef(true);
  const [orbitReady, setOrbitReady] = useState(false);
  const prevMode = useRef<CameraMode>(mode);
  const fovTween = useRef(false); // the dive tweens the lens itself

  // look-around while in a seat: full 360° yaw, ±30° pitch, eases back after ~2s idle
  const look = useRef({ yaw: 0, pitch: 0, dragging: false, lastInput: 0 });

  const overview = useMemo(
    () => overviewPose(layout, size.width / size.height, BASE_FOV),
    [layout, size.width, size.height],
  );

  const targetPose = useMemo<Pose>(() => {
    if (mode === "overview") return (focusSeats?.length && focusPose(layout, overview, focusSeats)) || overview;
    if (mode === "seat" && seatId) return seatPose(layout, seatId) ?? overview;
    if (mode === "portrait") return portraitPose(layout, size.width / size.height);
    if (mode === "topdown" && topdown) return { pos: topdown.pos.clone(), look: topdown.look.clone() };
    return frontPose(layout);
    // resetKey: recompute (and re-tween) on "Reset view"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, seatId, layout, overview, resetKey, focusKey, topdown]);

  useEffect(() => {
    const from = { p: pose.current.pos.clone(), l: pose.current.look.clone() };
    // read the live orbit position so the glide starts where the user left the camera
    if (controls.current && !tweening.current) {
      from.p.copy(camera.position);
      from.l.copy(controls.current.target);
    }
    look.current.yaw = 0;
    look.current.pitch = 0;
    // reference video A: map → seat is one continuous dive (descend first, tilt up to the screen late);
    // seat → map is the same move backwards (tilt down first, then rise)
    const from_ = prevMode.current;
    prevMode.current = mode;
    const dive = (from_ === "topdown" && mode === "seat") || (from_ === "seat" && mode === "topdown");
    const rising = from_ === "seat" && mode === "topdown";
    const duration = first.current || reducedMotion() ? 0 : dive ? 2.2 : mode === "seat" ? 1.2 : 1.0;
    first.current = false;
    const state = { t: 0 };
    tweening.current = true;
    setOrbitReady(false);
    const fov0 = camera.fov;
    const fov1 = mode === "topdown" && topdown ? topdown.fov : mode === "seat" ? (size.width / size.height < 1 ? camera.fov : SEAT_FOV) : camera.fov;
    fovTween.current = dive && duration > 0;
    // the map camera must match the flat map exactly the moment the hall fades in: set the lens now, not eased
    if (mode === "topdown" && topdown && !dive) {
      camera.fov = topdown.fov;
      camera.updateProjectionMatrix();
    }
    const easeInOut = gsap.parseEase("power2.inOut");
    const easeIn = gsap.parseEase("power2.in");
    const easeOut = gsap.parseEase("power2.out");
    const tween = gsap.to(state, {
      t: 1,
      duration,
      ease: dive ? "none" : EASE_IN_OUT,
      onUpdate: () => {
        const t = state.t;
        if (!dive) {
          pose.current.pos.lerpVectors(from.p, targetPose.pos, t);
          pose.current.look.lerpVectors(from.l, targetPose.look, t);
          return;
        }
        const pt = easeInOut(t);
        const lt = rising ? easeOut(Math.min(1, t / 0.7)) : easeIn(Math.max(0, (t - 0.25) / 0.75));
        pose.current.pos.lerpVectors(from.p, targetPose.pos, pt);
        pose.current.look.lerpVectors(from.l, targetPose.look, lt);
        if (fovTween.current) {
          camera.fov = THREE.MathUtils.lerp(fov0, fov1, lt);
          camera.updateProjectionMatrix();
        }
      },
      onComplete: () => {
        tweening.current = false;
        fovTween.current = false;
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
      // React runs effects twice in development: if this tween never got going, forget we switched modes,
      // so the re-run still knows it is a dive
      if (duration > 0 && tween.progress() < 0.02) prevMode.current = from_;
      tween.kill();
    };
  }, [targetPose, camera, mode]);
  // eslint note: size/topdown are read when a tween starts; a new tween starts when they change the target

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

  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, dt) => {
    // lens: wider for the hero, normal elsewhere (eased so mode changes never jump)
    const aspect = size.width / size.height;
    const targetFov =
      mode === "topdown" && topdown
        ? topdown.fov
        : mode === "front"
        ? HERO_FOV
        : mode === "portrait"
          ? portraitPose(layout, aspect).fov
          : mode === "seat" && aspect < 1
            ? seatFovPortrait(layout, seatId, aspect)
            : mode === "seat"
              ? SEAT_FOV
              : BASE_FOV;
    // a frame can land between the new mode arriving and the effect above starting its tween: leave the lens alone
    const pending = prevMode.current !== mode;
    if (!pending && !fovTween.current && Math.abs(camera.fov - targetFov) > 0.01) {
      camera.fov += (targetFov - camera.fov) * (first.current ? 1 : 1 - Math.exp(-dt * 4));
      camera.updateProjectionMatrix();
    }
    const orbiting = mode === "overview" && !tweening.current;
    if (orbiting) return; // OrbitControls owns the camera
    camera.position.copy(pose.current.pos);
    tmp.copy(pose.current.look);

    if (mode === "front" && drift) {
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
