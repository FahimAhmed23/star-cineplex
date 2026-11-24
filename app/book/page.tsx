import type { Metadata } from "next";
import { BookingStepOne, type HallInfo, type ShowSlot } from "@/components/booking/BookingStepOne";
import { halls } from "@/lib/data";
import { buildSeats } from "@/lib/halls";
import { loadShowtimes } from "@/lib/showtimes.server";

export const metadata: Metadata = { title: "Showtimes · Star Cineplex — Concept Redesign" };

/** Step 1 (CLAUDE.md §9.2–9.3). Booked-seat lists stay on the server; the page only gets counts. */
export default async function BookPage({ searchParams }: { searchParams: Promise<{ movie?: string }> }) {
  const { movie } = await searchParams;
  const showtimes = await loadShowtimes();
  const slots: ShowSlot[] = showtimes.map((s) => ({
    id: s.id,
    branch: s.branch,
    hall: s.hall,
    movie: s.movie,
    date: s.date,
    time: s.time,
    format: s.format,
    booked: s.bookedSeats.length,
  }));
  const hallInfo: Record<string, HallInfo> = Object.fromEntries(
    halls.map((h) => [h.id, { id: h.id, name: h.name, type: h.type, branch: h.branch, capacity: buildSeats(h).length, prices: h.prices }]),
  );
  return <BookingStepOne slots={slots} halls={hallInfo} initialMovie={movie ?? null} />;
}
