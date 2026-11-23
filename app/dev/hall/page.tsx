import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Showtime } from "@/lib/types";
import { halls } from "@/lib/data";
import { buildSeats } from "@/lib/halls";
import { HallLab } from "./HallLab";

export const metadata: Metadata = { title: "Hall engine · Star Cineplex — Concept Redesign" };

// Phase 1 test page for the 3D hall engine. Showtimes are read on the server so the 377 KB file
// never reaches the browser; only one evening show per hall is passed down.
export default async function Page() {
  const raw = await readFile(join(process.cwd(), "data", "showtimes.json"), "utf8");
  const { showtimes } = JSON.parse(raw) as { showtimes: Showtime[] };
  const byHall: Record<string, { id: string; movie: string; bookedSeats: string[] }> = {};
  // per hall: the evening show closest to half full (a typical, readable mix of free and booked seats)
  const capacity = Object.fromEntries(halls.map((h) => [h.id, buildSeats(h).length]));
  const off = (hall: string, n: number) => Math.abs(n - capacity[hall] * 0.5);
  for (const s of showtimes) {
    if (s.time < "17:00") continue;
    const cur = byHall[s.hall];
    if (!cur || off(s.hall, s.bookedSeats.length) < off(s.hall, cur.bookedSeats.length))
      byHall[s.hall] = { id: s.id, movie: s.movie, bookedSeats: s.bookedSeats };
  }
  return <HallLab shows={byHall} />;
}
