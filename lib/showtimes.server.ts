import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { buildSeats } from "./halls";
import { getHall } from "./data";
import type { Showtime } from "./types";

// showtimes.json (~380 KB, with booked-seat lists) is only ever read on the server.
let cache: Showtime[] | null = null;

export async function loadShowtimes(): Promise<Showtime[]> {
  if (cache) return cache;
  const raw = await readFile(join(process.cwd(), "data", "showtimes.json"), "utf8");
  cache = (JSON.parse(raw) as { showtimes: Showtime[] }).showtimes;
  return cache;
}

/** An evening show of this hall that is about half full — a natural-looking audience for the hero. */
export function typicalShow(showtimes: Showtime[], hallId: string): Showtime | undefined {
  const hall = getHall(hallId);
  if (!hall) return undefined;
  const cap = buildSeats(hall).length;
  return showtimes
    .filter((s) => s.hall === hallId && s.time >= "17:00")
    .sort((a, b) => Math.abs(a.bookedSeats.length - cap * 0.5) - Math.abs(b.bookedSeats.length - cap * 0.5))[0];
}
