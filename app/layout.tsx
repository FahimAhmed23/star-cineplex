import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVariables } from "./fonts";
import { CinemaDoors } from "@/components/booking/CinemaDoors";
import { Panels } from "@/components/nav/Panels";
import { LanguageSync } from "@/lib/i18n";
import { SoundUnlock } from "@/lib/sound";

export const metadata: Metadata = {
  // set NEXT_PUBLIC_SITE_URL to the deployed address so the share image gets an absolute URL
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Star Cineplex — Concept Redesign",
  openGraph: { type: "website", siteName: "Star Cineplex — Concept Redesign", title: "The best seat in the house is waiting for you." },
  twitter: { card: "summary_large_image", title: "The best seat in the house is waiting for you." },
  description:
    "An unofficial concept redesign of the Star Cineplex booking experience: pick your seat inside a 3D cinema hall. Not affiliated with Star Cineplex.",
};

export const viewport: Viewport = {
  themeColor: "#121015",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <body>
        <LanguageSync />
        {children}
        {/* §9.4: lives above every route, so it stays put while the page changes underneath */}
        <CinemaDoors />
        {/* §7 Prices / My tickets slide-overs, reachable from the navbar and the footer on every page */}
        <Panels />
        <SoundUnlock />
      </body>
    </html>
  );
}
