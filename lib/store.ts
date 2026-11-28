"use client";

import { create } from "zustand";

/**
 * App-wide UI state shared by the 3D hall, the opening and the overlays (CLAUDE.md §4 State).
 * Booking state (movie, branch, show, seats) joins this store in Phases 5–6.
 */
interface UiState {
  /** "intro" while the opening plays, "revealed" once the hall is showing (navbar + hero info come in) */
  stage: "intro" | "revealed";
  /** the hero hall has its models, scene and first trailer frame ready */
  hallReady: boolean;
  /** the home page's images have loaded behind the curtain (or the cap passed); trailers start downloading after this */
  assetsReady: boolean;
  /** 0..1 — how far the Now Showing sheet has covered the hero (§8.3); read in render loops, not React */
  heroScroll: number;
  /** the hero is fully covered: pause the trailer and the 3D render loop */
  heroCovered: boolean;
  setStage: (s: UiState["stage"]) => void;
  setHallReady: (v: boolean) => void;
  setAssetsReady: (v: boolean) => void;
}

export const useUi = create<UiState>((set) => ({
  stage: "intro",
  hallReady: false,
  assetsReady: false,
  heroScroll: 0,
  heroCovered: false,
  setStage: (stage) => set({ stage }),
  setHallReady: (hallReady) => set({ hallReady }),
  setAssetsReady: (assetsReady) => set({ assetsReady }),
}));
