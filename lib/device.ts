"use client";

import { useSyncExternalStore } from "react";

// §11 phones: what the device can do. "phone" = narrow screen (< 768px); "full3D" = WebGL2 and not a low-end
// device (deviceMemory ≥ 4 GB and ≥ 4 cores, where the browser reports them). Desktop always gets full 3D.

const PHONE_QUERY = "(max-width: 767px)";

// Probe WebGL2 ONCE per page and release the test context straight away. (Before Nov 27 this ran on every
// useDevice() render, creating a new WebGL context each time; Chrome caps live contexts, kills the oldest, and after
// repeated losses blocks WebGL for the page: "Web page caused context loss and was blocked".)
let glProbe: boolean | null = null;
function webgl2() {
  if (glProbe !== null) return glProbe;
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    glProbe = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    glProbe = false;
  }
  return glProbe;
}

let cached: { phone: boolean; full3D: boolean } | null = null;
function read() {
  const phone = window.matchMedia(PHONE_QUERY).matches;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const strong = (nav.deviceMemory ?? 8) >= 4 && (nav.hardwareConcurrency ?? 8) >= 4;
  const gl = webgl2();
  const next = { phone, full3D: gl && (!phone || strong) };
  if (!cached || cached.phone !== next.phone || cached.full3D !== next.full3D) cached = next;
  return cached;
}

const SERVER = { phone: false, full3D: true };
function subscribe(cb: () => void) {
  const mq = window.matchMedia(PHONE_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** { phone, full3D } — updates when the window crosses the phone breakpoint. SSR renders the desktop version. */
export function useDevice() {
  return useSyncExternalStore(subscribe, read, () => SERVER);
}

/** One-off check outside React. */
export function deviceNow() {
  return typeof window === "undefined" ? SERVER : read();
}

/** true while a media query matches (SSR: false). Used for layout-only switches, e.g. the hero below 1024px. */
export function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
