import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/nav/Navbar";

export const metadata: Metadata = { title: "Checkout · Star Cineplex — Concept Redesign" };

// Checkout is Phase 7 (§9.6). Seat selection hands over ?show=…&seats=E07,E08.
export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ show?: string; seats?: string }> }) {
  const { show, seats } = await searchParams;
  return (
    <>
      <Navbar />
      <main className="grid min-h-[100svh] place-items-center px-8 text-center">
        <div>
          <p className="display-s mb-4">Checkout comes in Phase 7.</p>
          <p className="text-muted">
            Show <span className="font-mono">{show}</span> · seats <span className="font-mono">{seats}</span>
          </p>
          {show && (
            <Link href={`/book/seats/${show}`} className="mt-6 inline-block text-purple-light underline underline-offset-4">
              Back to seats
            </Link>
          )}
        </div>
      </main>
    </>
  );
}
