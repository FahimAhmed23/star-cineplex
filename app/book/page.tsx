import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/nav/Navbar";

export const metadata: Metadata = { title: "Showtimes · Star Cineplex — Concept Redesign" };

// Placeholder so the navbar / hero links land somewhere during review. The real page is Phase 5 (§9.2–9.3).
export default async function BookPage({ searchParams }: { searchParams: Promise<{ movie?: string }> }) {
  const { movie } = await searchParams;
  return (
    <>
      <Navbar />
      <main className="grid min-h-[100svh] place-items-center px-8 text-center">
        <div>
          <p className="display-s mb-4">showtimes are coming.</p>
          <p className="text-muted">Built in Phase 5{movie ? ` — will open with “${movie}” selected` : ""}.</p>
          <Link href="/" className="mt-6 inline-block text-purple-light underline underline-offset-4">Back to home</Link>
        </div>
      </main>
    </>
  );
}
