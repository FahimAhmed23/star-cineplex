import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVariables } from "./fonts";
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
      </body>
    </html>
  );
}
