"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Navbar } from "@/components/nav/Navbar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import {
  clearHold,
  formatPhone,
  holdStart,
  HOLD_SECONDS,
  newBookingId,
  saveBooking,
  seatView,
  validPhone,
  type PayMethod,
} from "@/lib/booking";
import { getBranch, getHall, getMovie, hallName } from "@/lib/data";
import { dateLocale, formatTime, showDateLabel } from "@/lib/demo-date";
import { seatPrice } from "@/lib/halls";
import { useT } from "@/lib/i18n";
import type { SeatClass, Showtime } from "@/lib/types";
import { Stepper } from "./Stepper";

const CLASS_KEY: Record<SeatClass, string> = { premium: "booking.classPremium", "semi-recliner": "booking.classSemiRecliner", vip: "booking.classVip" };
const METHODS: { id: PayMethod; name: string; color: string }[] = [
  { id: "bkash", name: "bKash", color: "#E2136E" },
  { id: "nagad", name: "Nagad", color: "#EE4023" },
  { id: "card", name: "Card", color: "#7f3e98" },
];

/**
 * Step 3 — Checkout (CLAUDE.md §9.6–9.7): one calm light page. Left: mobile number + payment method.
 * Right: the sticky ticket summary with the 10-minute seat hold, the view from your seat and the Pay button.
 * Demo hooks for the case study: a mobile number ending in 0000 (or Alt-click on Pay) makes the payment fail;
 * `?hold=20` shortens the hold to 20 seconds.
 */
export function Checkout({ show, seatIds, holdSeconds }: { show: Showtime; seatIds: string[]; holdSeconds?: number }) {
  const { t, lang } = useT();
  const router = useRouter();
  const hall = getHall(show.hall)!;
  const movie = getMovie(show.movie)!;
  const branch = getBranch(show.branch)!;
  const seats = useMemo(
    () => seatIds.map((id) => {
      const row = hall.rows.find((r) => r.row === id.replace(/\d+$/, ""));
      const cls = (row?.class ?? "premium") as SeatClass;
      return { id, class: cls, price: seatPrice(hall, cls, show.priceBand) ?? 0 };
    }),
    [seatIds, hall, show.priceBand],
  );
  const total = seats.reduce((s, x) => s + x.price, 0);
  const lines = useMemo(() => {
    const m = new Map<SeatClass, { n: number; price: number }>();
    seats.forEach((s) => m.set(s.class, { n: (m.get(s.class)?.n ?? 0) + 1, price: s.price }));
    return [...m];
  }, [seats]);

  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [email, setEmail] = useState("");
  const [method, setMethod] = useState<PayMethod>("bkash");
  // phones: the payment method is a dropdown (bKash by default) instead of three cards (designer, Nov 27)
  const [payOpen, setPayOpen] = useState(false);
  const paySel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!payOpen) return;
    const off = (e: PointerEvent) => !paySel.current?.contains(e.target as Node) && setPayOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setPayOpen(false);
    document.addEventListener("pointerdown", off);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", off);
      document.removeEventListener("keydown", esc);
    };
  }, [payOpen]);
  const [card, setCard] = useState({ number: "", exp: "", cvc: "" });
  const [stage, setStage] = useState<"idle" | "paying" | "done">("idle");
  const [failed, setFailed] = useState(false);
  const [left, setLeft] = useState<number | null>(null);
  const [view, setView] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false); // phones: the summary as a bottom sheet (§9.6 Mobile)
  const altRef = useRef(false);
  const phoneRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLInputElement>(null);

  // the seat hold: 10:00 from landing on checkout (kept across a refresh)
  useEffect(() => {
    const limit = holdSeconds ?? HOLD_SECONDS;
    const start = holdStart(show.id, seatIds);
    const tick = () => setLeft(Math.max(0, Math.ceil(limit - (Date.now() - start) / 1000)));
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [show.id, seatIds, holdSeconds]);
  useEffect(() => {
    setView(seatView(show.id));
  }, [show.id]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const expired = left === 0 && stage !== "done";
  const phoneOk = validPhone(phone);
  const cardOk = method !== "card" || (card.number.replace(/\D/g, "").length >= 12 && card.exp.length >= 4 && card.cvc.length >= 3);
  const canPay = phoneOk && cardOk && !expired && stage === "idle";

  const pay = () => {
    if (!canPay) {
      setPhoneTouched(true);
      // take the user to the first thing still missing
      const target = !phoneOk ? phoneRef.current : !cardOk ? cardRef.current : null;
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.focus({ preventScroll: true });
      }
      return;
    }
    const fail = altRef.current || phone.endsWith("0000");
    setFailed(false);
    setStage("paying");
    window.setTimeout(() => {
      if (fail) {
        setStage("idle");
        setFailed(true);
        return;
      }
      const id = newBookingId();
      saveBooking({
        id,
        showId: show.id,
        movie: movie.slug,
        branch: branch.slug,
        hall: hall.id,
        date: show.date,
        time: show.time,
        seats,
        total,
        phone,
        email: email.trim() || undefined,
        method,
        createdAt: new Date().toISOString(),
        view,
      });
      clearHold();
      setStage("done");
      window.setTimeout(() => router.push(`/book/ticket/${id}`), 700);
    }, method === "card" ? 1800 : 1600);
  };

  const m = METHODS.find((x) => x.id === method)!;
  const mm = left === null ? "10:00" : `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
  const title = (lang === "bn" && movie.titleBn) || movie.title;
  // always show the real date, e.g. "Today · Fri 27 Nov, 9:30 PM" (tickets get checked later)
  const dayLabel = showDateLabel(show.date, t, lang);
  const fullDate = new Date(`${show.date}T00:00:00`).toLocaleDateString(dateLocale(lang), { weekday: "short", day: "numeric", month: "short" });
  const when = `${dayLabel === fullDate ? fullDate : `${dayLabel} · ${fullDate}`}, ${formatTime(show.time)}`;
  // seat hold: amber from 5:00, red under 2:00 (with the release note)
  const holdTone = left === null || left > 300 ? "calm" : left > 120 ? "warn" : "urgent";
  const payLabel = method === "card"
    ? t("checkout.payCard", { amount: total.toLocaleString("en-US") })
    : t("checkout.payWith", { amount: total.toLocaleString("en-US"), name: m.name });
  const back = `/book/seats/${show.id}?seats=${seatIds.join(",")}`;

  return (
    <div className="theme-light checkout-in min-h-[100svh]">
      <Navbar />
      <main className="mx-auto grid max-w-[1120px] gap-12 px-5 pt-[124px] pb-32 md:px-8 lg:pt-[168px] md:pb-24 lg:grid-cols-[1fr_420px]">
        {/* left: details + payment */}
        <div>
          <Stepper step={3} tone="light" className="max-lg:justify-center" />
          <h1 className="display-m mt-8 max-md:mt-5">{t("checkout.title")}</h1>

          {failed && (
            <div role="alert" className="mt-8 flex gap-3 rounded-card-sm border border-[#e5484d]/30 bg-[#e5484d]/8 p-4 text-[15px]">
              <Icon name="danger" size={22} className="shrink-0 text-[#b42f34]" />
              <div>
                <p className="font-semibold">{t("checkout.failedTitle")}</p>
                <p className="mt-1 text-ink/70">{t("checkout.failedBody")}</p>
              </div>
            </div>
          )}

          <section className="mt-10 max-md:mt-5" aria-labelledby="details-h">
            <h2 id="details-h" className="text-[20px] font-semibold">
              {t("checkout.yourDetails")}
            </h2>
            <label className="mt-5 block">
              <span className="text-[14px] font-medium">{t("checkout.mobile")}<span aria-hidden className="ml-0.5 text-[#b42f34]">*</span></span>
              <span className={`field mt-2 flex items-center ${phoneTouched && !phoneOk ? "is-invalid" : ""}`}>
                <span className="border-r border-ink/10 pr-3 font-medium text-ink/65 tabular-nums">+880</span>
                <input
                  ref={phoneRef}
                  type="tel"
                  required
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="1712-345678"
                  value={formatPhone(phone)}
                  onChange={(e) => {
                    let d = e.target.value.replace(/\D/g, "");
                    if (d.startsWith("880")) d = d.slice(3);
                    if (d.startsWith("0")) d = d.slice(1);
                    setPhone(d.slice(0, 10));
                    setFailed(false);
                  }}
                  onBlur={() => setPhoneTouched(true)}
                  aria-invalid={phoneTouched && !phoneOk}
                  aria-describedby="phone-help"
                  className="min-w-0 flex-1 bg-transparent pl-3 tabular-nums outline-none"
                />
                {phoneOk && <Icon name="checkCircleDuo" size={20} className="text-[#237a51]" />}
              </span>
              <span id="phone-help" className={`mt-2 block text-[13px] ${phoneTouched && !phoneOk ? "text-[#b42f34]" : "text-ink/65"}`}>
                {phoneTouched && !phoneOk ? (phone ? t("checkout.mobileInvalid") : t("checkout.mobileRequired")) : t("checkout.mobileHelp")}
              </span>
            </label>
            <label className="mt-5 block">
              <span className="text-[14px] font-medium">{t("checkout.email")}</span>
              <span className="field mt-2 flex items-center">
                <input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="min-w-0 flex-1 bg-transparent outline-none" />
              </span>
            </label>
          </section>

          <section className="mt-12 max-md:mt-6" aria-labelledby="pay-h">
            <h2 id="pay-h" className="text-[20px] font-semibold">
              {t("checkout.payment")}
            </h2>
            <div ref={paySel} className="pay-select mt-4 md:hidden">
              <button type="button" className="pay-select__trigger focus-ring" aria-haspopup="listbox" aria-expanded={payOpen} aria-labelledby="pay-h" onClick={() => setPayOpen((o) => !o)}>
                <PayMark id={method} />
                <span className="font-semibold">{method === "card" ? t("checkout.card") : METHODS.find((x) => x.id === method)!.name}</span>
                <Icon name="chevronDown" size={18} className={`ml-auto text-ink/60 transition-transform ${payOpen ? "rotate-180" : ""}`} />
              </button>
              {payOpen && (
                <ul
                  role="listbox"
                  aria-labelledby="pay-h"
                  className="pay-select__list"
                  onKeyDown={(e) => {
                    const opts = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="option"]')];
                    const i = opts.indexOf(document.activeElement as HTMLElement);
                    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                      e.preventDefault();
                      opts[(i + (e.key === "ArrowDown" ? 1 : opts.length - 1)) % opts.length]?.focus();
                    }
                  }}
                >
                  {METHODS.map((x) => (
                    <li
                      key={x.id}
                      id={`pay-opt-${x.id}`}
                      role="option"
                      aria-selected={method === x.id}
                      tabIndex={method === x.id ? 0 : -1}
                      ref={(el) => {
                        if (el && method === x.id && document.activeElement?.closest(".pay-select")) el.focus();
                      }}
                      className="pay-select__option focus-ring"
                      onClick={() => {
                        setMethod(x.id);
                        setPayOpen(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setMethod(x.id);
                          setPayOpen(false);
                        }
                      }}
                    >
                      <PayMark id={x.id} />
                      <span className="font-medium">{x.id === "card" ? t("checkout.card") : x.name}</span>
                      {method === x.id && <Icon name="check" size={18} className="ml-auto text-purple" />}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div role="radiogroup" aria-labelledby="pay-h" className="mt-5 grid grid-cols-3 gap-2 max-md:hidden md:gap-3">
              {METHODS.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  role="radio"
                  aria-checked={method === x.id}
                  onClick={() => setMethod(x.id)}
                  className={`pay-card focus-ring ${method === x.id ? "is-on" : ""}`}
                >
                  {x.id === "card" ? (
                    <>
                      <span className="pay-card__logo gap-2" aria-label="Visa, Mastercard">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/payments/visa.svg" alt="" className="h-[14px] w-auto" />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/payments/mastercard.svg" alt="" className="h-[26px] w-auto" />
                      </span>
                      <span className="text-[16px] font-semibold">{t("checkout.card")}</span>
                    </>
                  ) : (
                    <>
                      <span className="pay-card__logo">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/payments/${x.id}.svg`} alt="" className="h-full w-auto" />
                      </span>
                      <span className="text-[16px] font-semibold">{x.name}</span>
                    </>
                  )}
                  <span className="pay-card__radio" aria-hidden />
                </button>
              ))}
            </div>

            {method === "card" ? (
              <div className="mt-5 rounded-card-sm border border-ink/10 bg-white p-5">
                <p className="inline-flex items-center gap-2 rounded-pill bg-gold/20 px-3 py-1 text-[12px] font-semibold text-[#7a5600]">
                  <Icon name="info" size={14} />
                  {t("checkout.demoCard")}
                </p>
                <label className="mt-4 block">
                  <span className="text-[14px] font-medium">{t("checkout.cardNumber")}<span aria-hidden className="ml-0.5 text-[#b42f34]">*</span></span>
                  <span className="field mt-2 flex">
                    <input
                      ref={cardRef}
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="4242 4242 4242 4242"
                      value={card.number}
                      onChange={(e) => setCard({ ...card, number: e.target.value.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ") })}
                      className="min-w-0 flex-1 bg-transparent tabular-nums outline-none"
                    />
                  </span>
                </label>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-[14px] font-medium">{t("checkout.expiry")}<span aria-hidden className="ml-0.5 text-[#b42f34]">*</span></span>
                    <span className="field mt-2 flex">
                      <input
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="MM/YY"
                        value={card.exp}
                        onChange={(e) => setCard({ ...card, exp: e.target.value.replace(/\D/g, "").slice(0, 4).replace(/(\d{2})(?=\d)/, "$1/") })}
                        className="min-w-0 flex-1 bg-transparent tabular-nums outline-none"
                      />
                    </span>
                  </label>
                  <label className="block">
                    <span className="text-[14px] font-medium">{t("checkout.cvc")}<span aria-hidden className="ml-0.5 text-[#b42f34]">*</span></span>
                    <span className="field mt-2 flex">
                      <input inputMode="numeric" autoComplete="off" placeholder="123" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })} className="min-w-0 flex-1 bg-transparent tabular-nums outline-none" />
                    </span>
                  </label>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-[14px] text-ink/65">{t("checkout.walletNote", { name: m.name })}</p>
            )}
          </section>
        </div>

        {/* right: the ticket summary */}
        <aside className={`lg:sticky lg:top-[124px] lg:self-start ${sheet ? "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-40 max-md:max-h-[88svh] max-md:overflow-y-auto max-md:px-3 max-md:pt-3 max-md:pb-[88px]" : "max-md:hidden"}`} id="checkout-summary">
          <div className="ticket-card">
            <div className="ticket-card__top p-6">
              <div className={`hold hold--${holdTone}`}>
                <p className="flex items-center gap-2 text-[15px] font-semibold" aria-live="off">
                  <Icon name="stopwatch" size={20} />
                  {t("checkout.held")} <span className="font-mono tabular-nums">{mm}</span>
                </p>
                {holdTone === "urgent" && (
                  <p className="mt-1 flex items-center gap-1.5 text-[13px]" role="status">
                    <Icon name="info" size={14} />
                    {t("checkout.releaseNote")}
                  </p>
                )}
              </div>
              <div className="mt-5 flex gap-4">
                <Image src={movie.poster} alt="" width={72} height={108} className="h-[108px] w-[72px] shrink-0 rounded-[10px] object-cover shadow-md" />
                <div className="min-w-0">
                  <p className="text-[18px] leading-snug font-semibold">{title}</p>
                  <p className="mt-1 text-[14px] text-ink/65">
                    {(lang === "bn" && branch.nameBn) || branch.name} · {hallName(hall, lang)}
                  </p>
                  <p className="text-[14px] text-ink/65">{when}</p>
                </div>
              </div>
              {view && (
                <figure className="mt-5">
                  <img src={view} alt={t("checkout.viewAlt", { seat: seatIds[0] })} className="aspect-[16/9] w-full rounded-[8px] object-cover" />
                  <figcaption className="mt-2 text-[12px] text-ink/65">{t("checkout.viewCaption", { seat: seatIds[0] })}</figcaption>
                </figure>
              )}
            </div>
            <div className="ticket-card__bottom p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {seatIds.map((s) => (
                    <span key={s} className="rounded-pill bg-purple/10 px-3 py-1 font-mono text-[13px] font-semibold text-purple">
                      {s}
                    </span>
                  ))}
                </div>
                <Link href={back} className="focus-ring shrink-0 rounded-[6px] text-[14px] font-medium text-purple underline-offset-4 hover:underline">
                  {t("checkout.changeSeats")}
                </Link>
              </div>
              <dl className="mt-4 space-y-2 text-[14px]">
                {lines.map(([cls, l]) => (
                  <div key={cls} className="flex justify-between">
                    <dt className="text-ink/70">
                      {t(CLASS_KEY[cls])} ·{" "}
                      {l.n === 1 ? t("booking.ticketOne", { n: 1 }) : <span className="tabular-nums">{l.n} × ৳{l.price.toLocaleString("en-US")}</span>}
                    </dt>
                    <dd className="tabular-nums">৳{(l.n * l.price).toLocaleString("en-US")}</dd>
                  </div>
                ))}
                <div className="flex items-baseline justify-between border-t border-ink/10 pt-3">
                  <dt className="font-semibold">{t("booking.total")}</dt>
                  <dd className="text-[24px] font-semibold tabular-nums">৳{total.toLocaleString("en-US")}</dd>
                </div>
              </dl>
              {/* phones: the summary sheet has no Pay button — the bottom bar has it (designer, Nov 27) */}
              <div className="max-md:hidden">
              <Button
                  size="lg"
                  className="mt-5 w-full"
                  disabled={expired || stage !== "idle"}
                  onClick={(e) => {
                    altRef.current = e.altKey;
                    pay();
                  }}
                >
                  {payLabel}
                </Button>
              </div>
              <p className="mt-3 text-center text-[12px] text-ink/65">{t("checkout.noFee")}</p>
            </div>
          </div>
        </aside>
      </main>

      {/* phones: total + Pay always in reach; tap the total for the full ticket summary */}
      {sheet && <div aria-hidden className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setSheet(false)} />}
      <div className="fixed inset-x-0 bottom-0 z-50 flex items-center gap-3 border-t border-ink/10 bg-white/95 px-4 py-3 backdrop-blur-md md:hidden">
        <button type="button" onClick={() => setSheet((v) => !v)} aria-expanded={sheet} aria-controls="checkout-summary" className="focus-ring flex min-w-0 flex-1 flex-col items-start rounded-[8px] text-left">
          <span className={`flex items-center gap-1 text-[12px] ${holdTone === "urgent" ? "font-semibold text-[#b42f34]" : holdTone === "warn" ? "font-semibold text-[#8f5d12]" : "text-ink/65"}`}>
            {seatIds.length} {t("ticket.seats").toLowerCase()} · <span className="font-mono tabular-nums">{mm}</span>
            <Icon name="altArrowUp" size={14} className={`transition-transform ${sheet ? "rotate-180" : ""}`} />
          </span>
          <span className="text-[20px] font-semibold tabular-nums">৳{total.toLocaleString("en-US")}</span>
        </button>
        <Button
          size="sm"
          disabled={expired || stage !== "idle"}
          onClick={(e) => {
            altRef.current = e.altKey;
            setSheet(false);
            pay();
          }}
        >
          {payLabel}
        </Button>
      </div>

      {/* payment in progress (mock, §9.7) */}
      {stage !== "idle" && (
        <div className="pay-overlay" role="status" aria-live="polite" style={{ ["--brand" as string]: m.color }}>
          <div className="text-center">
            {stage === "paying" && method !== "card" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/payments/${method}.svg`} alt={m.name} className="mx-auto mb-6 h-12 w-auto" />
            )}
            {stage === "paying" ? <span className="pay-spinner" aria-hidden /> : <Icon name="checkCircleDuo" size={56} className="mx-auto text-[#237a51]" />}
            <p className="mt-6 text-[20px] font-semibold">
              {stage === "done" ? t("checkout.paid") : method === "card" ? t("checkout.processing") : t("checkout.connecting", { name: m.name })}
            </p>
            <p className="mt-2 text-[14px] text-ink/65">{t("checkout.demoNote")}</p>
          </div>
        </div>
      )}

      {/* the hold ran out (§9.7) */}
      {expired && (
        <div className="pay-overlay" role="alertdialog" aria-modal="true" aria-labelledby="exp-h">
          <div className="w-[min(440px,90vw)] rounded-card-lg bg-white p-8 text-center shadow-2xl">
            <span className="mx-auto grid size-14 place-items-center rounded-pill bg-gold/20 text-[#8f5d12]">
              <Icon name="stopwatch" size={28} />
            </span>
            <h2 id="exp-h" className="mt-5 text-[22px] font-semibold">{t("checkout.releasedTitle")}</h2>
            <p className="mt-2 text-[15px] text-ink/65">{t("checkout.releasedBody")}</p>
            <Button className="mt-6 w-full" onClick={() => router.push(`/book/seats/${show.id}`)} autoFocus>
              {t("checkout.pickAgain")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** a payment method's logo, small (phone dropdown) */
function PayMark({ id }: { id: PayMethod }) {
  return (
    <span className="flex h-6 w-[64px] shrink-0 items-center gap-1.5">
      {id === "card" ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/payments/visa.svg" alt="" className="h-[11px] w-auto" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/payments/mastercard.svg" alt="" className="h-[20px] w-auto" />
        </>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/payments/${id}.svg`} alt="" className="h-6 w-auto" />
      )}
    </span>
  );
}
