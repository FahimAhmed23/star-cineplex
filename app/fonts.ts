import { Anek_Bangla, Fraunces, IBM_Plex_Mono, Outfit } from "next/font/google";

// All four are SIL OFL fonts, self-hosted by next/font at build time (§4, §5 Typography).

/** Display — Fraunces variable with the SOFT / WONK / opsz axes (used at weight 900). */
export const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
  variable: "--font-fraunces",
});

/** UI & body — Outfit 300–700. */
export const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-outfit",
});

/** Bangla — Anek Bangla 600–700 (variable font; 400 kept for long Bangla body copy). */
export const anekBangla = Anek_Bangla({
  subsets: ["bengali", "latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-anek-bangla",
});

/** Ticket details — IBM Plex Mono 400–500. */
export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-plex-mono",
});

export const fontVariables = [fraunces, outfit, anekBangla, plexMono].map((f) => f.variable).join(" ");
