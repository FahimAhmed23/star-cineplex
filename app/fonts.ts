import { Anek_Bangla, Bricolage_Grotesque, Geist, IBM_Plex_Mono } from "next/font/google";

// All four are SIL OFL fonts, self-hosted by next/font at build time (§4, §5 Typography).

/** Display — Bricolage Grotesque variable (opsz + wdth axes), titles at weight 700 (designer, Nov 26). */
export const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
  display: "swap",
  variable: "--font-bricolage",
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
  variable: "--font-anek-bangla",
});

/** Ticket details — IBM Plex Mono 400–500. */
export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-plex-mono",
});

export const fontVariables = [bricolage, geist, anekBangla, plexMono].map((f) => f.variable).join(" ");
