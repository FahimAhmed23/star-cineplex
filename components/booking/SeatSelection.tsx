"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CameraMode } from "@/components/hall/CameraRig";
import { Navbar } from "@/components/nav/Navbar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { getBranch, getHall, getMovie } from "@/lib/data";
import { formatTime } from "@/lib/demo-date";
import { markDoorsReady } from "@/lib/doors";
import { buildLayout, type PlacedSeat } from "@/lib/hall-layout";
import { seatPrice } from "@/lib/halls";
import { useT } from "@/lib/i18n";
import { bestAvailable, findGap } from "@/lib/seat-logic";
import type { SeatClass, Showtime } from "@/lib/types";
import { SeatMap2D } from "./SeatMap2D";
import { Stepper } from "./Stepper";

const Hall3D = dynamic(() => import("@/components/hall/Hall3D"), { ssr: false });

const MAX_SEATS = 10;
const CLASS_KEY: Record<SeatClass, string> = { premium: "booking.classPremium", "semi-recliner": "booking.classSemiRecliner", vip: "booking.classVip" };

/**
 * Step 2 — choose your seats inside the 3D hall (CLAUDE.md §9.5): overview camera, hover popup, select,
 * view from seat (look around), 2D map toggle, best available, single-seat gap hint, bottom bar with total.
 */
export function SeatSelection({ show, hallId }: { show: Showtime; hallId: string }) {
  const { t, lang } = useT();
  const router = useRouter();
  const hall = getHall(hallId)!;
  const movie = getMovie(show.movie)!;
  const branch = getBranch(show.branch)!;
  const layout = useMemo(() => buildLayout(hall), [hall]);
  const booked = useMemo(() => new Set(show.bookedSeats), [show.bookedSeats]);
  const classes = useMemo(() => [...new Set(hall.rows.map((r) => r.class))], [hall]);

  const [view, setView] = useState<"3d" | "2d">("3d");
  const [mode, setMode] = useState<CameraMode>("overview");
  const [seatId, setSeatId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hover, setHover] = useState<PlacedSeat | null>(null);
  const [pinned, setPinned] = useState<PlacedSeat | null>(null); // the popup stays while the pointer is on it
  const [highlight, setHighlight] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [focus, setFocus] = useState<{ ids: string[]; key: number } | null>(null);
  const [bestN, setBestN] = useState(2);
  const [limitHit, setLimitHit] = useState(false);
  const popupHover = useRef(false);
  const clearTimer = useRef<number | undefined>(undefined);
  const highlightTimer = useRef<number | undefined>(undefined);

  // 2D first on phones / when WebGL is missing (§11, §9.9)
  useEffect(() => {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl || window.matchMedia("(max-width: 767px)").matches) {
      setView("2d");
      markDoorsReady();
    }
  }, []);

  const price = useCallback((cls: SeatClass) => seatPrice(hall, cls, show.priceBand) ?? 0, [hall, show.priceBand]);
  const selectedSeats = useMemo(() => layout.seats.filter((s) => selected.has(s.id)), [layout.seats, selected]);
  const total = selectedSeats.reduce((sum, s) => sum + price(s.class), 0);
  const gap = useMemo(() => (selected.size ? findGap(layout.seats, booked, selected) : null), [layout.seats, booked, selected]);

  const toggle = useCallback(
    (id: string) => {
      if (booked.has(id)) return;
      setSelected((prev) => {
        const n = new Set(prev);
        if (n.has(id)) n.delete(id);
        else if (n.size < MAX_SEATS) n.add(id);
        else setLimitHit(true);
        return n;
      });
    },
    [booked],
  );
  useEffect(() => {
    if (!limitHit) return;
    const id = window.setTimeout(() => setLimitHit(false), 2500);
    return () => window.clearTimeout(id);
  }, [limitHit]);

  const viewFrom = (id: string) => {
    setPinned(null);
    setHover(null);
    setSeatId(id);
    setMode("seat");
  };
  const backToHall = () => setMode("overview");

  const onPointer = (s: PlacedSeat | null) => {
    window.clearTimeout(clearTimer.current);
    if (s) {
      setHover(s);
      setPinned(s);
      document.body.style.cursor = booked.has(s.id) ? "not-allowed" : "pointer";
    } else {
      document.body.style.cursor = "";
      setHover(null);
      // keep the popup a moment so the pointer can reach its buttons
      clearTimer.current = window.setTimeout(() => {
        if (!popupHover.current) setPinned(null);
      }, 350);
    }
  };
  useEffect(() => () => void (document.body.style.cursor = ""), []);

  const glowClass = (cls: string | null) => {
    window.clearTimeout(highlightTimer.current);
    setHighlight(cls);
    if (cls) highlightTimer.current = window.setTimeout(() => setHighlight(null), 1500);
  };

  const pickBest = () => {
    const taken = new Set([...booked]);
    const ids = bestAvailable(hall, layout.seats, taken, bestN);
    if (!ids) return;
    setSelected(new Set(ids));
    setMode("overview");
    setFocus((f) => ({ ids, key: (f?.key ?? 0) + 1 }));
  };
  const resetView = () => {
    setFocus(null);
    setResetKey((k) => k + 1);
  };
  const applyShift = () => {
    if (!gap) return;
    setSelected((prev) => {
      const n = new Set(prev);
      n.delete(gap.remove);
      n.add(gap.add);
      return n;
    });
  };

  const goCheckout = () => {
    const ids = selectedSeats.map((s) => s.id).join(",");
    router.push(`/book/checkout?show=${encodeURIComponent(show.id)}&seats=${encodeURIComponent(ids)}`);
  };

  const title = (lang === "bn" && movie.titleBn) || movie.title;
  const dateLabel = new Date(`${show.date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const info = [title, (lang === "bn" && branch.nameBn) || branch.name, hall.name, dateLabel, formatTime(show.time)].join(" · ");
  const popupSeat = mode === "overview" && view === "3d" ? pinned : null;
  const seatView = mode === "seat" && seatId ? layout.byId.get(seatId) : null;

  const popup = popupSeat && (
    <div
      className="seat-popup glass"
      onPointerEnter={() => {
        popupHover.current = true;
        window.clearTimeout(clearTimer.current);
      }}
      onPointerLeave={() => {
        popupHover.current = false;
        setPinned(null);
      }}
    >
      <p className="text-[14px] font-semibold text-white">{t("booking.rowSeat", { row: popupSeat.row, seat: popupSeat.number })}</p>
      {booked.has(popupSeat.id) ? (
        <p className="mt-1 text-[13px] text-muted">{t("booking.booked")}</p>
      ) : (
        <>
          <p className="mt-1 text-[13px] text-muted">
            {t(CLASS_KEY[popupSeat.class])} · <span className="text-white tabular-nums">৳{price(popupSeat.class)}</span>
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => toggle(popupSeat.id)} className="seat-popup__btn seat-popup__btn--primary focus-ring">
              {selected.has(popupSeat.id) ? `${t("booking.selected")} ✓` : t("booking.select")}
            </button>
            <button type="button" onClick={() => viewFrom(popupSeat.id)} className="seat-popup__btn focus-ring">
              <Icon name="eye" size={16} />
              {t("booking.viewFromSeat")}
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 overflow-hidden bg-night">
      <Navbar />

      {/* the hall */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${view === "3d" ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <Hall3D
          className="!absolute inset-0"
          hall={hall}
          bookedSeats={show.bookedSeats}
          mode={mode}
          seatId={seatId}
          resetKey={resetKey}
          trailer={movie.trailer}
          poster={movie.trailerPoster}
          trailerCrop={movie.trailerCrop}
          startAt={0.18}
          houseLights={mode === "seat" ? 0.15 : 0.85}
          active={view === "3d"}
          selected={selected}
          hovered={hover?.id ?? null}
          highlightClass={highlight}
          onSeatPointer={(s) => onPointer(s)}
          onSeatClick={(s) => {
            if (mode !== "overview") return;
            toggle(s.id);
          }}
          anchor={popup ? { seatId: popupSeat!.id, node: popup } : null}
          markers={[...selected]}
          focusSeats={focus?.ids ?? null}
          focusKey={focus?.key ?? 0}
          onReady={markDoorsReady}
        />
      </div>

      {view === "2d" && (
        <div className="absolute inset-x-0 top-[250px] bottom-[120px] overflow-auto px-8">
          <SeatMap2D hall={hall} seats={layout.seats} booked={booked} selected={selected} onToggle={toggle} price={price} />
        </div>
      )}

      {/* top-left: change showtime + show info */}
      <div className="pointer-events-none absolute inset-x-0 top-[112px] z-10 mx-auto flex max-w-[1440px] items-start justify-between gap-6 px-8">
        <div className="pointer-events-auto">
          <Link href={`/book?movie=${movie.slug}`} className="focus-ring inline-flex items-center gap-2 text-[14px] text-white/80 hover:text-white">
            <Icon name="arrowLeft" size={18} />
            {t("booking.changeShowtime")}
          </Link>
          <p className="mt-2 text-[15px] font-medium text-white">{info}</p>
          <div className="mt-3">
            <Stepper step={2} />
          </div>
        </div>

        {/* top-right: 3D / 2D + Best available + Reset view */}
        {mode === "overview" && (
          <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-3">
            <div className="glass flex rounded-pill border border-white/10 p-1" role="group" aria-label={t("booking.viewMode")}>
              {(["3d", "2d"] as const).map((v) => (
                <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v} className={`seg-btn focus-ring ${view === v ? "is-on" : ""}`}>
                  {v.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="glass flex items-center gap-1 rounded-pill border border-white/10 py-1 pr-1 pl-4">
              <button type="button" onClick={pickBest} className="focus-ring inline-flex items-center gap-2 text-[14px] font-medium text-white">
                <Icon name="magic" size={18} />
                {t("booking.bestAvailable")}
              </button>
              <label className="relative">
                <span className="sr-only">{t("booking.howMany")}</span>
                <select value={bestN} onChange={(e) => setBestN(+e.target.value)} className="focus-ring h-8 appearance-none rounded-pill bg-white/10 pr-7 pl-3 text-[14px] text-white">
                  {Array.from({ length: MAX_SEATS }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n} className="bg-[#0b0810]">
                      {n}
                    </option>
                  ))}
                </select>
                <Icon name="chevronDown" size={14} className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-muted" />
              </label>
            </div>
            {view === "3d" && (
              <button type="button" onClick={resetView} className="glass focus-ring grid size-10 place-items-center rounded-pill border border-white/10 text-white" aria-label={t("booking.resetView")} title={t("booking.resetView")}>
                <Icon name="restart" size={18} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* view from seat HUD */}
      {seatView && view === "3d" && (
        <div className="absolute inset-x-0 bottom-[132px] z-10 flex justify-center">
          <div className="glass flex items-center gap-4 rounded-pill border border-white/10 py-2 pr-2 pl-5">
            <span className="text-[15px] font-medium text-white">{t("booking.viewFrom", { seat: seatView.id })}</span>
            {!booked.has(seatView.id) && (
              <Button size="sm" variant={selected.has(seatView.id) ? "secondary" : "primary"} onClick={() => toggle(seatView.id)}>
                {selected.has(seatView.id) ? `${t("booking.selected")} ✓` : t("booking.selectThis")}
              </Button>
            )}
            <Button size="sm" variant="secondary" icon="arrowLeft" onClick={backToHall}>
              {t("booking.backToHall")}
            </Button>
          </div>
        </div>
      )}

      {/* bottom bar */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-4">
        <div className="glass mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-8 gap-y-3 rounded-card-md border border-white/10 px-6 py-4">
          <ul className="flex flex-wrap items-center gap-4 text-[13px] text-white/80" aria-label={t("booking.legend")}>
            {classes.map((c) => (
              <li key={c}>
                <button type="button" onMouseEnter={() => glowClass(c)} onFocus={() => glowClass(c)} className="focus-ring inline-flex items-center gap-2 hover:text-white">
                  <span className={`legend-dot legend-dot--${c}`} style={{ background: c === "vip" ? "#6B1E24" : c === "semi-recliner" ? "#8d1d23" : "#C0262D" }} />
                  {t(CLASS_KEY[c])} <span className="text-muted tabular-nums">৳{price(c)}</span>
                </button>
              </li>
            ))}
            <li className="inline-flex items-center gap-2">
              <span className="legend-dot" style={{ background: "#1d1c20", boxShadow: "inset 0 0 0 1px rgb(255 255 255 / .15)" }} />
              {t("booking.booked")}
            </li>
            <li className="inline-flex items-center gap-2">
              <span className="legend-dot" style={{ background: "var(--gold)" }} />
              {t("booking.selected")}
            </li>
          </ul>

          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {selectedSeats.length === 0 && <span className="text-[14px] text-muted">{t("booking.noSeats")}</span>}
            {selectedSeats.map((s) => (
              <span key={s.id} className="seat-chip">
                <button type="button" className="focus-ring" onClick={() => (view === "3d" ? viewFrom(s.id) : undefined)} title={view === "3d" ? t("booking.viewFromSeat") : undefined}>
                  {s.id}
                </button>
                <button type="button" onClick={() => toggle(s.id)} className="focus-ring text-white/60 hover:text-white" aria-label={t("booking.remove", { seat: s.id })}>
                  <Icon name="closeSimple" size={14} />
                </button>
              </span>
            ))}
            {limitHit && <span className="text-[13px] text-gold">{t("booking.maxSeats")}</span>}
            {gap && !limitHit && (
              <span className="inline-flex items-center gap-2 text-[13px] text-white/80">
                {t(gap.dir === 1 ? "booking.oneSeatAlone" : "booking.oneSeatAloneLeft")}
                <button type="button" onClick={applyShift} className="focus-ring rounded-pill border border-white/25 px-3 py-1 text-[13px] font-medium text-white hover:border-purple-light">
                  {t("booking.shift")}
                </button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="text-[12px] text-muted">{t("booking.total")}</p>
              <p className="text-[20px] font-semibold text-white tabular-nums">৳{total.toLocaleString("en-US")}</p>
            </div>
            <Button disabled={selected.size === 0} onClick={goCheckout} icon="arrowRight">
              {t("common.continue")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
