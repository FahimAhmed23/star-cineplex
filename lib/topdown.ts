// The seat map and the 3D hall share one camera (reference video A): the flat map is the 3D hall seen from
// straight above, so "Preview" can fade the hall in exactly underneath it and then dive into the seat.
// Pure math (three.js maths only, no WebGL), so phones can draw the map without mounting the hall.
import * as THREE from "three";
import type { HallLayout } from "./hall-layout";

export interface MapBox {
  /** viewport size in CSS px */
  vw: number;
  vh: number;
  /** where the seats should land, in CSS px */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TopDown {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
  /** projected seat centres (CSS px) by seat id */
  seats: Map<string, { x: number; y: number }>;
  /** seat pitch on screen (px), for sizing the seat glyphs */
  pitch: number;
  /** projected screen edge (y px) and width (px), for the "SCREEN" arc */
  screen: { x0: number; x1: number; y: number };
}

const FOV = 28; // long lens: as flat as a map, still a real camera
const TILT = THREE.MathUtils.degToRad(9); // a touch from behind, so the screen sits at the top
const CUSHION = 0.48; // seat cushion height: where the glyph sits

export function topDown(layout: HallLayout, box: MapBox): TopDown {
  const cam = new THREE.PerspectiveCamera(FOV, box.vw / box.vh, 0.1, 500);
  const p = layout.metrics.pitch;
  const pts = layout.seats.map((s) => new THREE.Vector3(s.x, s.y + CUSHION, s.z));
  const xs = pts.map((v) => v.x);
  const zs = pts.map((v) => v.z);
  const center = new THREE.Vector3((Math.min(...xs) + Math.max(...xs)) / 2, pts.reduce((a, v) => a + v.y, 0) / pts.length, (Math.min(...zs) + Math.max(...zs)) / 2);
  const dir = new THREE.Vector3(0, Math.cos(TILT), Math.sin(TILT));
  const corners = pts.flatMap((v) => [v.clone().add(new THREE.Vector3(-p / 2, 0, -p / 2)), v.clone().add(new THREE.Vector3(p / 2, 0, p / 2))]);

  const place = (d: number) => {
    cam.position.copy(center).addScaledVector(dir, d);
    cam.lookAt(center);
    cam.updateMatrixWorld();
  };
  const toPx = (v: THREE.Vector3) => {
    const n = v.clone().project(cam);
    return { x: ((n.x + 1) / 2) * box.vw, y: ((1 - n.y) / 2) * box.vh };
  };
  // distance so all seats fit the box
  let lo = 2;
  let hi = 400;
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2;
    place(mid);
    const q = corners.map(toPx);
    const w = Math.max(...q.map((a) => a.x)) - Math.min(...q.map((a) => a.x));
    const h = Math.max(...q.map((a) => a.y)) - Math.min(...q.map((a) => a.y));
    if (w <= box.w && h <= box.h) hi = mid;
    else lo = mid;
  }
  place(hi);
  // slide the camera (no rotation) so the seats' centre lands on the box centre
  const q = corners.map(toPx);
  const cx = (Math.max(...q.map((a) => a.x)) + Math.min(...q.map((a) => a.x))) / 2;
  const cy = (Math.max(...q.map((a) => a.y)) + Math.min(...q.map((a) => a.y))) / 2;
  const dist = cam.position.distanceTo(center);
  const worldPerPx = (2 * dist * Math.tan(THREE.MathUtils.degToRad(FOV / 2))) / box.vh;
  const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
  const up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
  const shift = right.multiplyScalar(-(box.x + box.w / 2 - cx) * worldPerPx).add(up.multiplyScalar((box.y + box.h / 2 - cy) * worldPerPx));
  // (moving the camera by +shift moves the picture the other way, onto the box; this was .sub before Nov 27, which
  // only worked while the box sat near the middle of the screen)
  cam.position.add(shift);
  const look = center.clone().add(shift);
  cam.lookAt(look);
  cam.updateMatrixWorld();

  const seats = new Map(layout.seats.map((s, i) => [s.id, toPx(pts[i])]));
  const a = toPx(pts[0]);
  const b = toPx(pts[0].clone().add(new THREE.Vector3(p, 0, 0)));
  const sw = layout.screen.width;
  const sl = toPx(new THREE.Vector3(-sw / 2, layout.screen.y - layout.screen.height / 2, layout.screen.z));
  const sr = toPx(new THREE.Vector3(sw / 2, layout.screen.y - layout.screen.height / 2, layout.screen.z));
  return { pos: cam.position.clone(), look, fov: FOV, seats, pitch: Math.hypot(b.x - a.x, b.y - a.y), screen: { x0: sl.x, x1: sr.x, y: Math.min(sl.y, sr.y) } };
}
