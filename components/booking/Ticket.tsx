"use client";

import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/nav/Navbar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { formatPhone, getBooking, type Booking } from "@/lib/booking";
import { playSound } from "@/lib/sound";
import { getBranch, getHall, getMovie, hallName } from "@/lib/data";
import { dateLocale, formatTime, showDateLabel } from "@/lib/demo-date";
import { useT } from "@/lib/i18n";
import type { SeatClass } from "@/lib/types";

const CLASS_KEY: Record<SeatClass, string> = { premium: "booking.classPremium", "semi-recliner": "booking.classSemiRecliner", vip: "booking.classVip" };

/** "YYYY-MM-DD" + "HH:mm" in Dhaka (UTC+6) → iCalendar UTC stamp */
function icsStamp(date: string, time: string, plusMin = 0) {
  const t = Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10), +time.slice(0, 2) - 6, +time.slice(3, 5) + plusMin);
  return new Date(t).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Step 4 — Your ticket (CLAUDE.md §9.8): the ticket prints out of a slot, then settles. */
export function Ticket({ bookingId }: { bookingId: string }) {
  const { t, lang } = useT();
  const [b, setB] = useState<Booking | null | undefined>(undefined);
  const [qr, setQr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const found = getBooking(bookingId);
    setB(found);
    if (found) playSound("print");
    QRCode.toDataURL(`STARCINEPLEX:${bookingId}`, { margin: 0, width: 240, color: { dark: "#231f20", light: "#ffffff" } }).then(setQr);
  }, [bookingId]);

  if (b === undefined) return <div className="theme-light min-h-[100svh]" />;
  if (!b) {
    return (
      <div className="theme-light min-h-[100svh]">
        <Navbar />
        <main className="grid min-h-[100svh] place-items-center px-8 text-center">
          <div>
            <p className="display-s">{t("ticket.notFound")}</p>
            <p className="mt-3 text-ink/65">{t("ticket.notFoundBody")}</p>
            <ButtonLink href="/book" className="mt-8" icon="ticket">
              {t("common.buyTickets")}
            </ButtonLink>
          </div>
        </main>
      </div>
    );
  }

  const movie = getMovie(b.movie)!;
  const branch = getBranch(b.branch)!;
  const hall = getHall(b.hall)!;
  const title = (lang === "bn" && movie.titleBn) || movie.title;
  const classes = [...new Set(b.seats.map((s) => s.class))].map((c) => t(CLASS_KEY[c])).join(", ");

  const save = async () => {
    if (!ticketRef.current) return;
    setSaving(true);
    try {
      const { toPng } = await import("html-to-image");
      const url = await toPng(ticketRef.current, { pixelRatio: 2, backgroundColor: "#faf9f5", style: { transform: "none", animation: "none" } });
      const a = document.createElement("a");
      a.href = url;
      a.download = `star-cineplex-${b.id}.png`;
      a.click();
    } finally {
      setSaving(false);
    }
  };

  const calendar = () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Star Cineplex concept//EN",
      "BEGIN:VEVENT",
      `UID:${b.id}@starcineplex-concept`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
      `DTSTART:${icsStamp(b.date, b.time)}`,
      `DTEND:${icsStamp(b.date, b.time, (movie.runtimeMin ?? 150) + 15)}`,
      `SUMMARY:${movie.title} · Star Cineplex`,
      `LOCATION:Star Cineplex ${branch.name}\\, ${hall.name}`,
      `DESCRIPTION:Seats ${b.seats.map((s) => s.id).join(" ")} · Booking ${b.id}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT1H",
      "ACTION:DISPLAY",
      "DESCRIPTION:Your movie starts in an hour",
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = `star-cineplex-${b.id}.ics`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="theme-light min-h-[100svh]">
      <Navbar />
      <main className="mx-auto max-w-[1120px] px-8 pt-[128px] pb-24 max-lg:pt-[124px] max-md:px-5">
        <div className="text-center">
          <p className="inline-flex items-center gap-2 text-[14px] font-medium text-[#237a51]">
            <Icon name="checkCircleDuo" size={20} />
            {t("ticket.confirmed")}
          </p>
          <h1 className="display-m mt-3">{t("ticket.title")}</h1>
        </div>

        {/* the ticket machine: a slot, and the ticket printing out of it */}
        <div className="mx-auto mt-10 w-full max-w-[760px]">
          <div className="ticket-slot" aria-hidden />
          <div className="ticket-print">
            <div ref={ticketRef} className="ticket-print__paper">
              <article className="ticket" aria-label={t("ticket.title")}>
                <div className="ticket__main">
                  <div className="flex gap-5">
                    <Image src={movie.poster} alt="" width={96} height={144} className="h-[144px] w-[96px] shrink-0 rounded-[10px] object-cover" />
                    <div className="min-w-0">
                      <p className="eyebrow text-purple">Star Cineplex · {(lang === "bn" && branch.nameBn) || branch.name}</p>
                      <h2 className="mt-2 text-[26px] leading-tight font-semibold">{title}</h2>
                      <p className="mt-1 text-[14px] text-ink/65">
                        {movie.format} · {movie.certificate ?? ""} {movie.runtimeMin ? `· ${Math.floor(movie.runtimeMin / 60)}h ${movie.runtimeMin % 60}m` : ""}
                      </p>
                    </div>
                  </div>
                  <dl className="mt-6 grid grid-cols-3 gap-x-6 gap-y-4 text-[14px]">
                    <div>
                      <dt className="ticket__label">{t("ticket.date")}</dt>
                      <dd className="font-semibold">
                        {/* the real date too: tickets get screenshotted and checked later (QA, Nov 27) */}
                        {(() => {
                          const day = showDateLabel(b.date, t, lang);
                          const full = new Date(`${b.date}T00:00:00`).toLocaleDateString(dateLocale(lang), { weekday: "short", day: "numeric", month: "short" });
                          return day === full ? full : (
                            <>
                              {day}
                              <span className="block text-[12px] font-normal text-ink/65">{full}</span>
                            </>
                          );
                        })()}
                      </dd>
                    </div>
                    <div>
                      <dt className="ticket__label">{t("ticket.time")}</dt>
                      <dd className="font-semibold tabular-nums">{formatTime(b.time)}</dd>
                    </div>
                    <div>
                      <dt className="ticket__label">{t("ticket.hall")}</dt>
                      <dd className="font-semibold">{hallName(hall, lang)}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="ticket__label">{t(b.seats.length === 1 ? "ticket.seatOne" : "ticket.seats")}</dt>
                      <dd className="font-mono text-[18px] font-semibold text-purple">{b.seats.map((s) => s.id).join("  ")}</dd>
                    </div>
                    <div>
                      <dt className="ticket__label">{t("ticket.class")}</dt>
                      <dd className="font-semibold">{classes}</dd>
                    </div>
                  </dl>
                  {b.view && <img src={b.view} alt={t("checkout.viewAlt", { seat: b.seats[0].id })} className="mt-6 aspect-[21/9] w-full rounded-[12px] object-cover object-[center_30%]" />}
                </div>
                <div className="ticket__stub">
                  {qr ? <img src={qr} alt={t("ticket.qrAlt")} className="size-[148px]" /> : <span className="size-[148px]" />}
                  <p className="mt-4 font-mono text-[12px] tracking-wide text-ink/65">{b.id}</p>
                  <p className="mt-4 text-[13px] text-ink/65">
                    {b.seats.length === 1 ? t("checkout.seatCountOne") : t("checkout.seatCount", { n: b.seats.length })} · <span className="font-semibold text-ink tabular-nums">৳{b.total.toLocaleString("en-US")}</span>
                  </p>
                </div>
              </article>
            </div>
          </div>

          <p className="mt-8 text-center text-[15px] text-ink/70">{t("ticket.showQr", { phone: `+880 ${formatPhone(b.phone)}` })}</p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button variant="secondary" size="sm" className="btn-secondary-light" icon="download" onClick={save} loading={saving}>
              {t("ticket.save")}
            </Button>
            <Button variant="secondary" size="sm" className="btn-secondary-light" icon="calendarAdd" onClick={calendar}>
              {t("ticket.calendar")}
            </Button>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branch.mapsQuery)}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-secondary-light btn-sm"
            >
              <Icon name="route" size={18} />
              {t("ticket.directions")}
            </a>
            <Link href="/" className="btn btn-primary btn-sm">
              <Icon name="home" size={18} />
              {t("ticket.home")}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
