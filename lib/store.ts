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
  /** 0..1 — progress of the "Into the hall" scroll story (§8.3); read in render loops, not React */
  heroScroll: number;
  /** the hall has fully scrolled away: pause the trailer and the 3D render loop */
  heroCovered: boolean;
  /** scroll position where the story ends (the first Now Showing row in place), for "Show less" */
  storyEnd: number;
  setStage: (s: UiState["stage"]) => void;
  setHallReady: (v: boolean) => void;
}

export const useUi = create<UiState>((set) => ({
  stage: "intro",
  hallReady: false,
  heroScroll: 0,
  heroCovered: false,
  storyEnd: 0,
  setStage: (stage) => set({ stage }),
  setHallReady: (hallReady) => set({ hallReady }),
}));
