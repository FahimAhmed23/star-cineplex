"use client";

import { create } from "zustand";

/** Which global slide-over is open (§7): Prices, My tickets ("No tickets yet"), About. */
export type PanelId = "prices" | "tickets" | "about";

export const usePanels = create<{ open: PanelId | null; show: (p: PanelId) => void; close: () => void }>((set) => ({
  open: null,
  show: (open) => set({ open }),
  close: () => set({ open: null }),
}));
