"use client";

import { useRouter } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { getBooking, lastBookingId } from "@/lib/booking";
import { useT } from "@/lib/i18n";
import { usePanels } from "@/lib/panels";
import { SlideOver } from "./SlideOver";

/** §7 My tickets: opens the last ticket booked in this browser; with none, a small "No tickets yet" panel. */
export function useMyTickets() {
  const router = useRouter();
  const show = usePanels((s) => s.show);
  return () => {
    const id = lastBookingId();
    if (id && getBooking(id)) router.push(`/book/ticket/${id}`);
    else show("tickets");
  };
}

export function NoTicketsPanel() {
  const { t } = useT();
  const { open, close } = usePanels();
  return (
    <SlideOver open={open === "tickets"} onClose={close} title={t("myTickets.title")}>
      <div className="flex flex-1 flex-col items-center justify-center pb-16 text-center">
        <span className="grid size-16 place-items-center rounded-pill bg-white/8 text-purple-light">
          <Icon name="ticket" size={30} />
        </span>
        <p className="mt-5 text-[18px] font-semibold">{t("myTickets.empty")}</p>
        <p className="mt-2 max-w-[300px] text-[14px] text-muted">{t("myTickets.emptyBody")}</p>
        <ButtonLink href="/book" icon="ticket" className="mt-7" onClick={close}>
          {t("common.buyTickets")}
        </ButtonLink>
      </div>
    </SlideOver>
  );
}
