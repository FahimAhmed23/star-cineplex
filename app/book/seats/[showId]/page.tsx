import type { Metadata } from "next";
import { SeatsPlaceholder } from "@/components/booking/SeatsPlaceholder";

export const metadata: Metadata = { title: "Choose your seats · Star Cineplex — Concept Redesign" };

// Seat selection is Phase 6 (§9.5). Phase 5 lands here through the cinema doors (§9.4).
export default async function SeatsPage({ params }: { params: Promise<{ showId: string }> }) {
  const { showId } = await params;
  return <SeatsPlaceholder showId={showId} />;
}
