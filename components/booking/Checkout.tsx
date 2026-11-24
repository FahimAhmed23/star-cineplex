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
import { getBranch, getHall, getMovie } from "@/lib/data";
import { formatTime, showDateLabel } from "@/lib/demo-date";
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
  const [card, setCard] = useState({ number: "", exp: "", cvc: "" });
  const [stage, setStage] = useState<"idle" | "paying" | "done">("idle");
  const [failed, setFailed] = useState(false);
  const [left, setLeft] = useState<number | null>(null);
  const [view, setView] = useState<string | null>(null);
  const altRef = useRef(false);

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

  const mm = left === null ? "10:00" : `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
  const title = (lang === "bn" && movie.titleBn) || movie.title;
  const when = `${showDateLabel(show.date, t)}, ${formatTime(show.time)}`;
  const m = METHODS.find((x) => x.id === method)!;
  const back = `/book/seats/${show.id}?seats=${seatIds.join(",")}`;

  return (
    <div className="theme-light checkout-in min-h-[100svh]">
      <Navbar />
      <main className="mx-auto grid max-w-[1120px] gap-12 px-8 pt-[136px] pb-24 lg:grid-cols-[1fr_420px]">
        {/* left: details + payment */}
        <div>
          <Link href={back} className="focus-ring inline-flex items-center gap-2 text-[14px] text-ink/60 hover:text-ink">
            <Icon name="arrowLeft" size={18} />
            {t("checkout.changeSeats")}
          </Link>
          <div className="mt-4">
            <Stepper step={3} tone="light" />
          </div>
          <h1 className="display-m mt-8">{t("checkout.title")}</h1>

          {failed && (
            <div role="alert" className="mt-8 flex gap-3 rounded-card-sm border border-[#e5484d]/30 bg-[#e5484d]/8 p-4 text-[15px]">
              <Icon name="danger" size={22} className="shrink-0 text-[#d23c41]" />
              <div>
                <p className="font-semibold">{t("checkout.failedTitle")}</p>
                <p className="mt-1 text-ink/70">{t("checkout.failedBody")}</p>
              </div>
            </div>
          )}

          <section className="mt-10" aria-labelledby="details-h">
            <h2 id="details-h" className="text-[20px] font-semibold">
              <span className="mr-2 font-mono text-[14px] text-purple">01</span>
              {t("checkout.yourDetails")}
            </h2>
            <label className="mt-5 block">
              <span className="text-[14px] font-medium">{t("checkout.mobile")}</span>
              <span className={`field mt-2 flex items-center ${phoneTouched && !phoneOk ? "is-invalid" : ""}`}>
                <span className="border-r border-ink/10 pr-3 font-medium text-ink/60 tabular-nums">+880</span>
                <input
                  inputMode="numeric"
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
                {phoneOk && <Icon name="checkCircleDuo" size={20} className="text-[#2f9e6a]" />}
              </span>
              <span id="phone-help" className={`mt-2 block text-[13px] ${phoneTouched && !phoneOk ? "text-[#d23c41]" : "text-ink/55"}`}>
                {phoneTouched && !phoneOk ? t("checkout.mobileInvalid") : t("checkout.mobileHelp")}
              </span>
            </label>
            <label className="mt-5 block">
              <span className="text-[14px] font-medium">
                {t("checkout.email")} <span className="font-normal text-ink/50">· {t("checkout.optional")}</span>
              </span>
              <span className="field mt-2 flex items-center">
                <input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="min-w-0 flex-1 bg-transparent outline-none" />
              </span>
            </label>
          </section>

          <section className="mt-12" aria-labelledby="pay-h">
            <h2 id="pay-h" className="text-[20px] font-semibold">
              <span className="mr-2 font-mono text-[14px] text-purple">02</span>
              {t("checkout.payment")}
            </h2>
            <div role="radiogroup" aria-labelledby="pay-h" className="mt-5 grid grid-cols-3 gap-3">
              {METHODS.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  role="radio"
                  aria-checked={method === x.id}
                  onClick={() => setMethod(x.id)}
                  className={`pay-card focus-ring ${method === x.id ? "is-on" : ""}`}
                  style={{ ["--brand" as string]: x.color }}
                >
                  {x.id === "card" ? (
                    <Icon name="cardDuo" size={30} className="text-purple" />
                  ) : (
                    <span className="pay-card__mark" aria-hidden>
                      {x.name[0].toLowerCase()}
                    </span>
                  )}
                  <span className="text-[16px] font-semibold">{x.id === "card" ? t("checkout.card") : x.name}</span>
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
                  <span className="text-[14px] font-medium">{t("checkout.cardNumber")}</span>
                  <span className="field mt-2 flex">
                    <input
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
                    <span className="text-[14px] font-medium">{t("checkout.expiry")}</span>
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
                    <span className="text-[14px] font-medium">CVC</span>
                    <span className="field mt-2 flex">
                      <input inputMode="numeric" autoComplete="off" placeholder="123" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })} className="min-w-0 flex-1 bg-transparent tabular-nums outline-none" />
                    </span>
                  </label>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-[14px] text-ink/60">{t("checkout.walletNote", { name: m.name })}</p>
            )}
          </section>
        </div>

        {/* right: the ticket summary */}
        <aside className="lg:sticky lg:top-[112px] lg:self-start">
          <div className="ticket-card">
            <div className="p-6">
              <p className={`flex items-center gap-2 text-[14px] font-medium ${left !== null && left <= 120 ? "text-[#b7791f]" : "text-ink/70"}`} aria-live="off">
                <Icon name="stopwatch" size={18} />
                {t("checkout.held")} <span className="font-mono font-semibold tabular-nums">{mm}</span>
              </p>
              <div className="mt-5 flex gap-4">
                <Image src={movie.poster} alt="" width={72} height={108} className="h-[108px] w-[72px] shrink-0 rounded-[10px] object-cover shadow-md" />
                <div className="min-w-0">
                  <p className="text-[18px] leading-snug font-semibold">{title}</p>
                  <p className="mt-1 text-[14px] text-ink/65">
                    {(lang === "bn" && branch.nameBn) || branch.name} · {hall.name}
                  </p>
                  <p className="text-[14px] text-ink/65">{when}</p>
                </div>
              </div>
              {view && (
                <figure className="mt-5">
                  <img src={view} alt={t("checkout.viewAlt", { seat: seatIds[0] })} className="aspect-[16/9] w-full rounded-[12px] object-cover" />
                  <figcaption className="mt-2 text-[12px] text-ink/55">{t("checkout.viewCaption", { seat: seatIds[0] })}</figcaption>
                </figure>
              )}
            </div>
            <div className="ticket-card__tear" aria-hidden />
            <div className="p-6">
              <div className="flex flex-wrap gap-2">
                {seatIds.map((s) => (
                  <span key={s} className="rounded-pill bg-purple/10 px-3 py-1 font-mono text-[13px] font-semibold text-purple">
                    {s}
                  </span>
                ))}
              </div>
              <dl className="mt-4 space-y-2 text-[14px]">
                {lines.map(([cls, l]) => (
                  <div key={cls} className="flex justify-between">
                    <dt className="text-ink/70">
                      {l.n} × {t(CLASS_KEY[cls])} <span className="tabular-nums">৳{l.price}</span>
                    </dt>
                    <dd className="tabular-nums">৳{(l.n * l.price).toLocaleString("en-US")}</dd>
                  </div>
                ))}
                <div className="flex items-baseline justify-between border-t border-ink/10 pt-3">
                  <dt className="font-semibold">{t("booking.total")}</dt>
                  <dd className="text-[24px] font-semibold tabular-nums">৳{total.toLocaleString("en-US")}</dd>
                </div>
              </dl>
              <Button
                size="lg"
                className="mt-5 w-full"
                disabled={expired || stage !== "idle"}
                onClick={(e) => {
                  altRef.current = e.altKey;
                  pay();
                }}
              >
                {t("checkout.pay", { amount: total.toLocaleString("en-US") })}
              </Button>
              <p className="mt-3 text-center text-[12px] text-ink/50">{t("checkout.noFee")}</p>
            </div>
          </div>
        </aside>
      </main>

      {/* payment in progress (mock, §9.7) */}
      {stage !== "idle" && (
        <div className="pay-overlay" role="status" aria-live="polite" style={{ ["--brand" as string]: m.color }}>
          <div className="text-center">
            {stage === "paying" ? <span className="pay-spinner" aria-hidden /> : <Icon name="checkCircleDuo" size={56} className="mx-auto text-[#2f9e6a]" />}
            <p className="mt-6 text-[20px] font-semibold">
              {stage === "done" ? t("checkout.paid") : method === "card" ? t("checkout.processing") : t("checkout.connecting", { name: m.name })}
            </p>
            <p className="mt-2 text-[14px] text-ink/55">{t("checkout.demoNote")}</p>
          </div>
        </div>
      )}

      {/* the hold ran out (§9.7) */}
      {expired && (
        <div className="pay-overlay" role="alertdialog" aria-modal="true" aria-labelledby="exp-h">
          <div className="w-[min(440px,90vw)] rounded-card-lg bg-white p-8 text-center shadow-2xl">
            <span className="mx-auto grid size-14 place-items-center rounded-pill bg-gold/20 text-[#b7791f]">
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
