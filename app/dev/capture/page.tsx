import { halls } from "@/lib/data";
import { loadShowtimes, typicalShow } from "@/lib/showtimes.server";
import { CaptureLab } from "./CaptureLab";

// Dev-only: renders the hall at a fixed size from a seat, to capture the phone hero still (Phase 9, §11).
export default async function Page() {
  const hall = halls.find((h) => h.id === "bdc-hall-1")!;
  const show = typicalShow(await loadShowtimes(), hall.id);
  return <CaptureLab hall={hall} booked={show?.bookedSeats ?? []} />;
}
