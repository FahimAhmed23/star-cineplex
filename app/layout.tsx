import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVariables } from "./fonts";
import { CinemaDoors } from "@/components/booking/CinemaDoors";
import { LanguageSync } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Star Cineplex — Concept Redesign",
  description:
    "An unofficial concept redesign of the Star Cineplex booking experience: pick your seat inside a 3D cinema hall. Not affiliated with Star Cineplex.",
};

export const viewport: Viewport = {
  themeColor: "#07050A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <body>
        <LanguageSync />
        {children}
        {/* §9.4: lives above every route, so it stays put while the page changes underneath */}
        <CinemaDoors />
      </body>
    </html>
  );
}
