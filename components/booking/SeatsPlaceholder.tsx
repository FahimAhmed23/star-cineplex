"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Navbar } from "@/components/nav/Navbar";
import { markDoorsReady } from "@/lib/doors";
import { Stepper } from "./Stepper";

/** Lands behind the cinema doors until the 3D seat selection is built (Phase 6, §9.5). */
export function SeatsPlaceholder({ showId }: { showId: string }) {
  useEffect(() => markDoorsReady(), []);
  return (
    <>
      <Navbar />
      <main className="mx-auto grid min-h-[100svh] max-w-[1280px] place-items-center px-8 text-center">
        <div className="flex flex-col items-center">
          <Stepper step={2} />
          <p className="display-s mt-10 mb-4 text-white">Seat selection comes in Phase 6.</p>
          <p className="text-muted">
            Show <span className="font-mono">{showId}</span>
          </p>
          <Link href="/book" className="mt-6 inline-block text-purple-light underline underline-offset-4">
            Back to showtimes
          </Link>
        </div>
      </main>
    </>
  );
}
