import { Anek_Bangla, Geist, IBM_Plex_Mono } from "next/font/google";
import localFont from "next/font/local";

// Google fonts (SIL OFL) are self-hosted by next/font at build time; the display face is a local file (§4, §5 Typography).

/**
 * Display — GC Movark Medium (500) by Glyphonic, supplied by the designer (references/GC-Movark-Family, Nov 26).
 * Commercial font ("All rights reserved"): check the licence covers web use before publishing the site.
 */
export const movark = localFont({
  src: "./fonts/GCMovark-Medium.woff2",
  weight: "500",
  style: "normal",
  display: "swap",
  variable: "--font-movark",
});

/** UI & body — Geist variable (100–900; the UI uses 400–600). */
export const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

/** Bangla — Anek Bangla 600–700 (variable font; 400 kept for long Bangla body copy). */
export const anekBangla = Anek_Bangla({
  subsets: ["bengali", "latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  // not needed for the first screen in English: load it when it is used, so it never delays the opening (Nov 27)
  preload: false,
  variable: "--font-anek-bangla",
});

/** Ticket details — IBM Plex Mono 400–500. */
export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  // not needed for the first screen in English: load it when it is used, so it never delays the opening (Nov 27)
  preload: false,
  variable: "--font-plex-mono",
});

export const fontVariables = [movark, geist, anekBangla, plexMono].map((f) => f.variable).join(" ");
