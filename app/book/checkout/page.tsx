import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Checkout } from "@/components/booking/Checkout";
import { getHall } from "@/lib/data";
import { buildSeats } from "@/lib/halls";
import { loadShowtimes } from "@/lib/showtimes.server";

export const metadata: Metadata = { title: "Checkout · Star Cineplex — Concept Redesign" };

/** Step 3 — Checkout (§9.6). Seat selection hands over ?show=…&seats=E07,E08. */
export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ show?: string; seats?: string; hold?: string }> }) {
  const { show: showId, seats: raw, hold } = await searchParams;
  const show = showId ? (await loadShowtimes()).find((s) => s.id === showId) : undefined;
  const hall = show && getHall(show.hall);
  if (!show || !hall) notFound();
  const valid = new Set(buildSeats(hall).map((s) => s.id));
  const seats = [...new Set((raw ?? "").split(",").filter((s) => valid.has(s)))].slice(0, 10);
  if (!seats.length) redirect(`/book/seats/${show.id}`);
  // §9.9: a seat taken while choosing → back to the hall with a note; the other seats stay selected
  const taken = seats.filter((s) => show.bookedSeats.includes(s));
  if (taken.length) redirect(`/book/seats/${show.id}?seats=${seats.filter((s) => !taken.includes(s)).join(",")}&taken=${taken.join(",")}`);
  const holdSeconds = hold && /^\d+$/.test(hold) ? Math.max(5, +hold) : undefined;
  return <Checkout show={show} seatIds={seats} holdSeconds={holdSeconds} />;
}
