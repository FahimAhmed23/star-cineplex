"use client";

import { NoTicketsPanel } from "./MyTickets";
import { PricesPanel } from "./PricesPanel";

/** Global slide-overs, mounted once in the root layout so the navbar and the footer can open them anywhere. */
export function Panels() {
  return (
    <>
      <PricesPanel />
      <NoTicketsPanel />
    </>
  );
}
