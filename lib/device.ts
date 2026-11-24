"use client";

import { useSyncExternalStore } from "react";

// §11 phones: what the device can do. "phone" = narrow screen (< 768px); "full3D" = WebGL2 and not a low-end
// device (deviceMemory ≥ 4 GB and ≥ 4 cores, where the browser reports them). Desktop always gets full 3D.

const PHONE_QUERY = "(max-width: 767px)";

function webgl2() {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
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
