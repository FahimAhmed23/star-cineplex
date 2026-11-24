import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeatSelection } from "@/components/booking/SeatSelection";
import { getBranch, getHall, getMovie } from "@/lib/data";
import { loadShowtimes } from "@/lib/showtimes.server";

export const metadata: Metadata = { title: "Choose your seats · Star Cineplex — Concept Redesign" };

/** Step 2 — seat selection in the 3D hall (CLAUDE.md §9.5). `?seats=` keeps a selection ("Change seats"). */
export default async function SeatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ showId: string }>;
  searchParams: Promise<{ seats?: string; taken?: string }>;
}) {
  const { showId } = await params;
  const { seats, taken } = await searchParams;
  const show = (await loadShowtimes()).find((s) => s.id === showId);
  const hall = show && getHall(show.hall);
  const movie = show && getMovie(show.movie);
  const branch = show && getBranch(show.branch);
  if (!show || !hall || !movie || !branch) notFound();
  const booked = new Set(show.bookedSeats);
  const initial = (seats ?? "").split(",").filter((s) => s && !booked.has(s)).slice(0, 10);
  return <SeatSelection show={show} hallId={hall.id} initialSeats={initial} taken={(taken ?? "").split(",").filter(Boolean)} />;
}
