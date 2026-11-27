"use client";

import { create } from "zustand";

// §9.4 the cinema doors: close over the page, navigate under them, hold until the next screen is ready,
// then swing open. Mounted once in the root layout, so it survives the route change.

export type DoorsPhase = "idle" | "closing" | "holding" | "opening" | "fading";

interface DoorsState {
  phase: DoorsPhase;
  sign: { hall: string; line: string } | null;
  ready: boolean;
  /** close the doors, navigate to href under them, open once the next screen calls markDoorsReady() */
  go: (href: string, sign: { hall: string; line: string }, push: (href: string) => void) => void;
  markReady: () => void;
}

const CLOSE_MS = 350;
const MIN_HOLD_MS = 1500; // the sign gets its moment even when the next screen is ready instantly (designer, Nov 27: 1.5s)
const MAX_HOLD_MS = 6000; // never trap the user behind the doors
const OPEN_MS = 1000;
const FADE_MS = 400;

export const useDoors = create<DoorsState>((set, get) => ({
  phase: "idle",
  sign: null,
  ready: false,
  go: (href, sign, push) => {
    if (get().phase !== "idle") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    set({ phase: reduced ? "holding" : "closing", sign, ready: false });
    window.setTimeout(
      () => {
        push(href);
        set({ phase: "holding" });
        const start = performance.now();
        const wait = () => {
          const held = performance.now() - start;
          if ((get().ready && held >= MIN_HOLD_MS) || held >= MAX_HOLD_MS) {
            set({ phase: reduced ? "fading" : "opening" });
            window.setTimeout(() => set({ phase: "idle", sign: null }), reduced ? FADE_MS : OPEN_MS);
          } else requestAnimationFrame(wait);
        };
        requestAnimationFrame(wait);
      },
      reduced ? 0 : CLOSE_MS,
    );
  },
  markReady: () => set({ ready: true }),
}));

/** Call from a screen that can be entered through the doors once it has what it needs to show. */
export const markDoorsReady = () => useDoors.getState().markReady();
