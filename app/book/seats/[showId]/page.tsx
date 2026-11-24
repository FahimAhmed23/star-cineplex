import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeatSelection } from "@/components/booking/SeatSelection";
import { getBranch, getHall, getMovie } from "@/lib/data";
import { loadShowtimes } from "@/lib/showtimes.server";

export const metadata: Metadata = { title: "Choose your seats · Star Cineplex — Concept Redesign" };

/** Step 2 — seat selection in the 3D hall (CLAUDE.md §9.5). */
export default async function SeatsPage({ params }: { params: Promise<{ showId: string }> }) {
  const { showId } = await params;
  const show = (await loadShowtimes()).find((s) => s.id === showId);
  const hall = show && getHall(show.hall);
  const movie = show && getMovie(show.movie);
  const branch = show && getBranch(show.branch);
  if (!show || !hall || !movie || !branch) notFound();
  return <SeatSelection show={show} hallId={hall.id} />;
}
