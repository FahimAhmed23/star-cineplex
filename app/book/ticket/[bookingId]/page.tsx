import type { Metadata } from "next";
import { Ticket } from "@/components/booking/Ticket";

export const metadata: Metadata = { title: "Your ticket · Star Cineplex" };

/** Step 4 — Your ticket (§9.8). Bookings live in this browser (localStorage), so the page renders on the client. */
export default async function TicketPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  return <Ticket bookingId={decodeURIComponent(bookingId)} />;
}
