import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/nav/Navbar";

export const metadata: Metadata = { title: "Choose your seats · Star Cineplex — Concept Redesign" };

// Placeholder for the "Tonight at" chips. Seat selection is Phase 6 (§9.4–9.5).
export default async function SeatsPage({ params }: { params: Promise<{ showId: string }> }) {
  const { showId } = await params;
  return (
    <>
      <Navbar />
      <main className="grid min-h-[100svh] place-items-center px-8 text-center">
        <div>
          <p className="display-s mb-4">your seat is waiting.</p>
          <p className="text-muted">Seat selection for show <span className="mono">{showId}</span> is built in Phase 6.</p>
          <Link href="/" className="mt-6 inline-block text-purple-light underline underline-offset-4">Back to home</Link>
        </div>
      </main>
    </>
  );
}
