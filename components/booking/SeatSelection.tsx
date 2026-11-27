"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CameraMode } from "@/components/hall/CameraRig";
import { Navbar } from "@/components/nav/Navbar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { RollingNumber } from "@/components/ui/RollingNumber";
import { saveSeatView, startHold } from "@/lib/booking";
import { getBranch, getHall, getMovie, hallName } from "@/lib/data";
import { dateLocale, formatTime } from "@/lib/demo-date";
import { deviceNow, useDevice } from "@/lib/device";
import { markDoorsReady } from "@/lib/doors";
import { buildLayout } from "@/lib/hall-layout";
import { seatPrice } from "@/lib/halls";
import { useT } from "@/lib/i18n";
import { bestAvailable, groupAround, groupLabel, resizeGroup, rowsOf, spreadPick } from "@/lib/seat-logic";
import { topDown, type MapBox } from "@/lib/topdown";
import type { SeatClass, Showtime } from "@/lib/types";

const Hall3D = dynamic(() => import("@/components/hall/Hall3D"), { ssr: false });

const MAX_SEATS = 10;
const DIVE_MS = 2200; // camera dive / rise (CameraRig)
const FADE_MS = 450; // hall fades in under the map before the dive
type Stage = "map" | "toHall" | "hall" | "toMap";

/**
 * Step 2 — seats (CLAUDE.md §9.5, rebuilt Nov 26 after the designer's reference videos):
 * B) pick how many tickets, then move them as ONE block — drag it (ghost outline + "Row F · 07–09"), tap a free
 *    seat, or use the arrow keys; the price rolls.
 * A) "Preview": the 3D hall fades in exactly under the map (the map IS the hall seen from above), the camera dives
 *    into your seat with the trailer playing, a strip of your row stays at the bottom; "Seats" flies back up.
 */
export function SeatSelection({ show, hallId, initialSeats = [], taken = [] }: { show: Showtime; hallId: string; initialSeats?: string[]; taken?: string[] }) {
  const { t, lang } = useT();
  const router = useRouter();
  // warm the checkout page up front, so "Continue" never lands on a blank page while it loads (Nov 27)
  useEffect(() => {
    router.prefetch("/book/checkout");
  }, [router]);
  const hall = getHall(hallId)!;
  const movie = getMovie(show.movie)!;
  const layout = useMemo(() => buildLayout(hall), [hall]);
  const booked = useMemo(() => new Set(show.bookedSeats), [show.bookedSeats]);
  const byId = useMemo(() => new Map(layout.seats.map((s) => [s.id, s])), [layout.seats]);
  const classes = useMemo(() => [...new Set(hall.rows.map((r) => r.class))], [hall]);
  const { full3D } = useDevice();

  // ── the block of seats ──
  const [count, setCount] = useState(() => Math.min(MAX_SEATS, Math.max(1, initialSeats.length || 1)));
  const [group, setGroup] = useState<string[]>(() =>
    initialSeats.length ? initialSeats : (bestAvailable(hall, layout.seats, booked, 1) ?? spreadPick(hall, layout.seats, booked, 1) ?? []),
  );
  const sorted = useMemo(
    () => [...group].filter((id) => byId.has(id)).sort((a, b) => byId.get(a)!.rowIndex - byId.get(b)!.rowIndex || byId.get(a)!.col - byId.get(b)!.col),
    [group, byId],
  );
  const together = useMemo(() => sorted.every((id) => byId.get(id)!.row === byId.get(sorted[0])?.row), [sorted, byId]);
  const label = useMemo(() => groupLabel(layout.seats, sorted), [layout.seats, sorted]);
  const price = useCallback((cls: SeatClass) => seatPrice(hall, cls, show.priceBand) ?? 0, [hall, show.priceBand]);
  const total = sorted.reduce((sum, id) => sum + price(byId.get(id)!.class), 0);
  const unit = sorted.length && sorted.every((id) => price(byId.get(id)!.class) === price(byId.get(sorted[0])!.class)) ? price(byId.get(sorted[0])!.class) : null;
  const [takenNote, setTakenNote] = useState(taken.length > 0);
  const [announce, setAnnounce] = useState("");

  const commit = useCallback(
    (ids: string[] | null) => {
      if (!ids) return;
      setGroup(ids);
      const l = groupLabel(layout.seats, ids);
      if (l) setAnnounce(l.row ? t("booking.rowSeats", { row: l.row, seats: l.seats }) : l.seats);
    },
    [layout.seats, t],
  );
  const setCountTo = (n: number) => {
    const next = Math.min(MAX_SEATS, Math.max(1, n));
    if (next === count) return;
    const g = resizeGroup(hall, layout.seats, booked, sorted, next);
    if (!g) return;
    setCount(next);
    commit(g);
  };

  // ── the map = the hall seen from straight above (lib/topdown.ts) ──
  const headRef = useRef<HTMLDivElement>(null);
  const footRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<MapBox | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const head = headRef.current?.getBoundingClientRect();
      const foot = footRef.current?.getBoundingClientRect();
      if (!head || !foot) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = Math.min(760, vw - 32);
      const top = head.bottom + 56; // room for the screen arc
      const next = { vw, vh, x: (vw - w) / 2, y: top, w, h: Math.max(140, foot.top - 20 - top) };
      setBox((b) => (b && Object.keys(next).every((k) => Math.abs(b[k as keyof MapBox] - next[k as keyof MapBox]) < 1) ? b : next));
    };
    measure();
    window.addEventListener("resize", measure);
    const ro = new ResizeObserver(measure);
    if (headRef.current) ro.observe(headRef.current);
    if (footRef.current) ro.observe(footRef.current);
    return () => {
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, []);
  const td = useMemo(() => (box ? topDown(layout, box) : null), [layout, box]);
  const camTop = useMemo(() => (td ? { pos: td.pos, look: td.look, fov: td.fov } : null), [td]);
  const glyph = td ? Math.max(9, Math.min(30, td.pitch * 0.8)) : 20;
  const doorsDone = useRef(false);
  useEffect(() => {
    if (td && !doorsDone.current) {
      doorsDone.current = true;
      markDoorsReady(); // the map is drawn: the doors can open (the 3D hall keeps loading behind it)
    }
  }, [td]);

  // ── the 3D hall: mounted at once on desktop (so Preview is instant), on phones when Preview is tapped ──
  const [hallOn, setHallOn] = useState(false);
  const [hallReady, setHallReady] = useState(false);
  useEffect(() => {
    const d = deviceNow();
    if (!d.phone && d.full3D) setHallOn(true);
  }, []);
  const [stage, setStage] = useState<Stage>("map");
  const [camMode, setCamMode] = useState<CameraMode>("topdown");
  const [diveSeat, setDiveSeat] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const timers = useRef<number[]>([]);
  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);
  const shot = useRef<{ seat: string; url: string } | null>(null);
  const pendingPreview = useRef(false);

  const capture = useCallback(() => {
    const src = document.querySelector<HTMLCanvasElement>("[data-hall] canvas");
    if (!src) return null;
    try {
      const c = document.createElement("canvas");
      c.width = 960;
      c.height = 540;
      const sh = Math.min(src.height, (src.width * 9) / 16);
      const sw = (sh * 16) / 9;
      c.getContext("2d")!.drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, 960, 540);
      return c.toDataURL("image/jpeg", 0.8);
    } catch {
      return null;
    }
  }, []);

  const runPreview = useCallback(() => {
    const first = sorted[0];
    setStage("toHall"); // the hall fades in under the map, from the same camera
    later(FADE_MS + 50, () => {
      setDiveSeat(first);
      setCamMode("seat"); // the dive
    });
    later(FADE_MS + 50 + DIVE_MS, () => {
      setStage("hall");
      later(700, () => {
        const url = capture();
        if (url) shot.current = { seat: first, url }; // the checkout's "view from your seat"
      });
    });
  }, [sorted, capture, later]);

  const preview = () => {
    if (!full3D || !sorted.length || stage !== "map") return;
    if (!hallReady) {
      pendingPreview.current = true;
      setHallOn(true);
      setWaiting(true);
      return;
    }
    runPreview();
  };
  useEffect(() => {
    if (hallReady && pendingPreview.current) {
      pendingPreview.current = false;
      setWaiting(false);
      runPreview();
    }
  }, [hallReady, runPreview]);

  const backToSeats = () => {
    if (stage !== "hall") return;
    setStage("toMap");
    setCamMode("topdown"); // rise back to the map's camera
    later(DIVE_MS, () => setStage("map"));
  };

  // ── moving the block: drag, tap, keys ──
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [ghost, setGhost] = useState<string[] | null>(null);
  const downAt = useRef<{ x: number; y: number; onGroup: boolean } | null>(null);
  const nearest = (p: { x: number; y: number }) => {
    if (!td) return null;
    let best: string | null = null;
    let bd = Infinity;
    for (const [id, q] of td.seats) {
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d < bd) {
        bd = d;
        best = id;
      }
    }
    return best && bd < td.pitch * 1.3 ? byId.get(best)! : null;
  };
  const candidate = (p: { x: number; y: number }) => {
    const s = nearest(p);
    return s ? groupAround(layout.seats, booked, s, count) : null;
  };

  const onDown = (e: React.PointerEvent) => {
    if (stage !== "map" || !td) return;
    const p = { x: e.clientX, y: e.clientY };
    const onGroup = sorted.some((id) => {
      const q = td.seats.get(id)!;
      return Math.hypot(q.x - p.x, q.y - p.y) < Math.max(glyph * 0.8, 14);
    });
    downAt.current = { ...p, onGroup };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };
  const onMove = (e: React.PointerEvent) => {
    const d = downAt.current;
    if (!d || !d.onGroup) return;
    const p = { x: e.clientX, y: e.clientY };
    if (drag || Math.hypot(p.x - d.x, p.y - d.y) > 4) {
      setDrag(p);
      setGhost(candidate(p));
    }
  };
  const onUp = (e: React.PointerEvent) => {
    const d = downAt.current;
    downAt.current = null;
    if (!d) return;
    if (drag) commit(ghost);
    else {
      // tap: move the block to the tapped seat
      const s = nearest({ x: e.clientX, y: e.clientY });
      if (s && !booked.has(s.id) && !sorted.includes(s.id)) commit(groupAround(layout.seats, booked, s, count));
    }
    setDrag(null);
    setGhost(null);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (stage !== "map" || !sorted.length) return;
    const head = byId.get(sorted[0])!;
    const cols = sorted.map((id) => byId.get(id)!.col);
    const midCol = (Math.min(...cols) + Math.max(...cols)) / 2;
    const rows = [...rowsOf(layout.seats).values()];
    const step = (dRow: number, dCol: number) => {
      const row = rows.find((r) => r[0].rowIndex === head.rowIndex + dRow);
      if (!row) return;
      // walk outwards until the block lands somewhere new
      for (let k = 1; k <= 24; k++) {
        const col = midCol + dCol * k;
        const target = row.reduce((b, s) => (Math.abs(s.col - col) < Math.abs(b.col - col) ? s : b), row[0]);
        const g = groupAround(layout.seats, booked, target, count);
        if (g && g.join() !== sorted.join()) return commit(g);
        if (!dCol) return;
      }
    };
    const keys: Record<string, () => void> = {
      ArrowLeft: () => step(0, -1),
      ArrowRight: () => step(0, 1),
      ArrowUp: () => step(-1, 0),
      ArrowDown: () => step(1, 0),
      "+": () => setCountTo(count + 1),
      "=": () => setCountTo(count + 1),
      "-": () => setCountTo(count - 1),
    };
    const fn = keys[e.key];
    if (fn) {
      e.preventDefault();
      fn();
    }
  };

  // ── leaving for checkout (§9.6): the still from your seat if you previewed it, then the fade to paper ──
  const [leaving, setLeaving] = useState(false);
  const goCheckout = () => {
    if (leaving || !sorted.length) return;
    setLeaving(true);
    startHold(show.id, sorted);
    let url = shot.current?.seat === sorted[0] ? shot.current.url : null;
    if (!url && stage === "hall" && diveSeat === sorted[0]) url = capture();
    saveSeatView(show.id, url);
    later(600, () => router.push(`/book/checkout?show=${encodeURIComponent(show.id)}&seats=${encodeURIComponent(sorted.join(","))}`));
  };

  const title = (lang === "bn" && movie.titleBn) || movie.title;
  const dateLabel = new Date(`${show.date}T00:00:00`).toLocaleDateString(dateLocale(lang), { weekday: "short", day: "numeric", month: "short" });
  const meta = [dateLabel, formatTime(show.time), hallName(hall, lang)].join(" · ");
  const inHall = stage !== "map";
  const mapVisible = stage === "map";
  const totalText = `৳${total.toLocaleString("en-US")}`;
  const selectedSet = useMemo(() => new Set(sorted), [sorted]);
  const screenY = td && box ? Math.max(td.screen.y, box.y - 44) : 0;
  // row letters share one column, just left of the widest row
  const rowX = td ? Math.min(...[...td.seats.values()].map((q) => q.x)) - td.pitch * 1.15 : 0;

  // your row and its neighbours, shown at the bottom in the hall view (reference video A)
  const strip = useMemo(() => {
    if (!sorted.length) return null;
    const first = byId.get(sorted[0])!;
    const rows = [...rowsOf(layout.seats).values()].filter((r) => Math.abs(r[0].rowIndex - first.rowIndex) <= 1);
    const cols = sorted.filter((id) => byId.get(id)!.row === first.row).map((id) => byId.get(id)!.col);
    return { rows, center: (Math.min(...cols) + Math.max(...cols)) / 2, row: first.row };
  }, [sorted, byId, layout.seats]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-night select-none">
      <Navbar />

      {/* the 3D hall, under the map */}
      <div
        data-hall
        className="absolute inset-0 transition-opacity ease-out"
        style={{ opacity: inHall ? 1 : 0, transitionDuration: `${FADE_MS}ms`, pointerEvents: stage === "hall" ? "auto" : "none" }}
      >
        {hallOn && camTop && (
          <Hall3D
            className="!absolute inset-0"
            hall={hall}
            bookedSeats={show.bookedSeats}
            mode={camMode}
            seatId={diveSeat}
            topdown={camTop}
            trailer={movie.trailer}
            poster={movie.trailerPoster}
            trailerCrop={movie.trailerCrop}
            startAt={0.18}
            houseLights={camMode === "seat" ? 0.12 : 0.45}
            playing={inHall}
            active={inHall || !hallReady}
            selected={selectedSet}
            onReady={() => setHallReady(true)}
          />
        )}
        {/* soft night edges so the header and footer stay readable over the hall */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-night/85 to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-night/90 to-transparent" />
      </div>

      {/* the seat map */}
      {td && (
        <div
          role="application"
          tabIndex={0}
          aria-label={t("booking.mapLabel")}
          aria-describedby="seatmap-help"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => {
            downAt.current = null;
            setDrag(null);
            setGhost(null);
          }}
          onKeyDown={onKey}
          className={`seatmap focus-ring absolute inset-0 touch-none ${drag ? "is-dragging" : ""}`}
          style={{
            opacity: mapVisible ? 1 : 0,
            transition: `opacity ${mapVisible ? 300 : 350}ms ease ${stage === "toHall" ? 300 : 0}ms`,
            pointerEvents: mapVisible ? "auto" : "none",
            ["--g" as string]: `${glyph}px`,
          }}
        >
          <p id="seatmap-help" className="sr-only">
            {t("booking.mapHelp")}
          </p>
          {/* the screen */}
          {/* the light falling from the screen over the front rows */}
          <span
            aria-hidden
            className="seatmap__glow"
            style={{ left: td.screen.x0 - 40, width: td.screen.x1 - td.screen.x0 + 80, top: screenY - 2 }}
          />
          <svg aria-hidden className="pointer-events-none absolute top-0 left-0 overflow-visible" width="1" height="1">
            <defs>
              <filter id="screen-glow" x="-10%" y="-200%" width="120%" height="500%">
                <feGaussianBlur stdDeviation="4" />
              </filter>
            </defs>
            {[0, 1].map((k) => (
              <path
                key={k}
                d={`M ${td.screen.x0} ${screenY + 10} Q ${(td.screen.x0 + td.screen.x1) / 2} ${screenY - 8} ${td.screen.x1} ${screenY + 10}`}
                fill="none"
                stroke={k ? "rgb(255 255 255 / 0.7)" : "rgb(220 205 240 / 0.8)"}
                strokeWidth={k ? 2 : 5}
                strokeLinecap="round"
                filter={k ? undefined : "url(#screen-glow)"}
              />
            ))}
          </svg>
          <span className="seatmap__screen" style={{ left: (td.screen.x0 + td.screen.x1) / 2, top: screenY - 30 }}>
            {t("booking.screen")}
          </span>
          {/* row letters */}
          {[...rowsOf(layout.seats).values()].map((row) => {
            const q = td.seats.get(row[0].id)!;
            return (
              <span key={row[0].row} aria-hidden className="seatmap__row" style={{ left: rowX, top: q.y }}>
                {row[0].row}
              </span>
            );
          })}
          {/* seats */}
          {layout.seats.map((s) => {
            const q = td.seats.get(s.id)!;
            return <span key={s.id} aria-hidden className={`seat-g ${booked.has(s.id) ? "seat-g--taken" : `seat-g--free seat-g--${s.class}`}`} style={{ left: q.x, top: q.y }} />;
          })}
          {/* ghost: where the block will land */}
          {ghost?.map((id) => {
            const q = td.seats.get(id)!;
            return <span key={`g-${id}`} aria-hidden className="seat-g seat-g--ghost" style={{ left: q.x, top: q.y }} />;
          })}
          {ghost &&
            (() => {
              const l = groupLabel(layout.seats, ghost);
              const qs = ghost.map((id) => td.seats.get(id)!);
              const x = qs.reduce((a, q) => a + q.x, 0) / qs.length;
              const y = Math.min(...qs.map((q) => q.y));
              return l ? (
                <span className="seat-tip" style={{ left: x, top: y - glyph * 0.6 - 18 }}>
                  {l.row ? t("booking.rowSeats", { row: l.row, seats: l.seats }) : l.seats}
                </span>
              ) : null;
            })()}
          {/* your seats: gold chips that move as one block (stacked under the pointer while dragging) */}
          {sorted.map((id, i) => {
            const q = td.seats.get(id);
            if (!q) return null;
            const p = drag ? { x: drag.x + i * glyph * 0.5, y: drag.y - i * 3, r: i * 6 } : { x: q.x, y: q.y, r: 0 };
            return (
              <span
                key={`chip-${i}`}
                aria-hidden
                className={`seat-g seat-g--yours seat-g--chip ${drag ? "is-lifted" : ""}`}
                style={{
                  transform: `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) rotate(${p.r}deg)`,
                  transitionDelay: drag ? "0ms" : `${i * 40}ms`,
                  zIndex: drag ? 30 - i : 5,
                }}
              >
                {byId.get(id)?.number}
              </span>
            );
          })}
        </div>
      )}
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>

      {/* header (the column) */}
      <div ref={headRef} className="pointer-events-none absolute inset-x-0 top-[76px] z-10 mx-auto w-full max-w-[760px] px-4 md:top-[120px]">
        <Link href={`/book?movie=${movie.slug}`} className="focus-ring pointer-events-auto inline-flex items-center gap-1.5 text-[13px] text-white/70 hover:text-white">
          <Icon name="arrowLeft" size={16} />
          {t("booking.changeShowtime")}
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-[18px] font-semibold text-white md:text-[20px]">{title}</h1>
            <p className="mt-0.5 text-[13px] text-muted">{meta}</p>
          </div>
          <div className={`tickets transition-opacity duration-300 ${inHall ? "opacity-0" : "pointer-events-auto"}`} role="group" aria-label={t("booking.ticketCount")}>
            <button type="button" className="focus-ring" onClick={() => setCountTo(count - 1)} disabled={count <= 1 || inHall} aria-label={t("booking.lessTickets")}>
              <Icon name="minus" size={18} />
            </button>
            <span className="tabular-nums">{t(count === 1 ? "booking.ticketOne" : "booking.ticketMany", { n: count })}</span>
            <button type="button" className="focus-ring" onClick={() => setCountTo(count + 1)} disabled={count >= MAX_SEATS || inHall} aria-label={t("booking.moreTickets")}>
              <Icon name="plus" size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* §9.9 a seat was taken while choosing */}
      {takenNote && (
        <div role="alert" className="absolute inset-x-0 top-[180px] z-20 flex justify-center px-4">
          <div className="glass flex items-center gap-3 rounded-pill border border-white/10 py-2 pr-2 pl-4 text-[14px] text-white">
            <Icon name="info" size={18} className="text-gold" />
            {t(taken.length > 1 ? "booking.justTakenMany" : "booking.justTaken", { seat: taken.join(", ") })}
            <button type="button" onClick={() => setTakenNote(false)} className="focus-ring grid size-8 place-items-center rounded-pill hover:bg-white/10" aria-label={t("common.close")}>
              <Icon name="closeSimple" size={16} />
            </button>
          </div>
        </div>
      )}

      {/* footer (the column): legend / your row, summary, actions */}
      <div ref={footRef} className="absolute inset-x-0 bottom-0 z-10 mx-auto w-full max-w-[760px] px-4 pb-5 md:pb-8">
        <div className="relative h-[72px]">
          <ul
            className={`absolute inset-x-0 bottom-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[12px] text-white/70 transition-opacity duration-300 ${inHall ? "opacity-0" : ""}`}
            aria-label={t("booking.legend")}
          >
            {classes.length === 1 && (
              <li className="inline-flex items-center gap-1.5">
                <span className={`legend-g seat-g--free seat-g--${classes[0]}`} />
                {t("booking.free")}
              </li>
            )}
            <li className="inline-flex items-center gap-1.5">
              <span className="legend-g seat-g--taken" />
              {t("booking.booked")}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span className="legend-g seat-g--yours" />
              {t("booking.yours")}
            </li>
            {classes.length > 1 &&
              classes.map((c) => (
                <li key={c} className="inline-flex items-center gap-1.5">
                  <span className={`legend-g seat-g--free seat-g--${c}`} />
                  {t(c === "semi-recliner" ? "booking.classSemiRecliner" : c === "vip" ? "booking.classVip" : "booking.classPremium")}{" "}
                  <span className="text-white/50 tabular-nums">৳{price(c)}</span>
                </li>
              ))}
          </ul>
          {strip && (
            <div aria-hidden className={`seat-strip transition-opacity duration-500 ${stage === "hall" ? "opacity-100" : "opacity-0"}`}>
              {strip.rows.map((row) => (
                <div key={row[0].row} className={`seat-strip__row ${row[0].row === strip.row ? "is-mine" : ""}`}>
                  {row[0].row === strip.row && (
                    <span className="seat-strip__label" style={{ left: `calc(50% + ${(row[0].col - strip.center) * 26 - 22}px)` }}>
                      {row[0].row}
                    </span>
                  )}
                  {row.map((s) => (
                    <span
                      key={s.id}
                      className={`seat-g ${selectedSet.has(s.id) ? "seat-g--yours" : booked.has(s.id) ? "seat-g--taken" : `seat-g--free seat-g--${s.class}`}`}
                      style={{ left: `calc(50% + ${(s.col - strip.center) * 26}px)`, top: "50%" }}
                    >
                      {selectedSet.has(s.id) ? s.number : ""}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-baseline justify-between gap-4 border-t border-white/10 pt-3 text-[13px]">
          <p className="min-w-0 truncate text-white">
            {label ? (
              label.row ? (
                <>
                  {t("booking.row")} {label.row}{" "}
                  <span className="text-muted">
                    · {t("booking.seatsWord")} {label.seats}
                  </span>
                </>
              ) : (
                <span className="text-muted">{label.seats}</span>
              )
            ) : (
              <span className="text-muted">{t("booking.noSeats")}</span>
            )}
            {!together && sorted.length > 1 && <span className="ml-2 text-gold">· {t("booking.splitNote", { n: count })}</span>}
          </p>
          <p className="shrink-0 text-muted tabular-nums">{unit !== null && sorted.length ? `${sorted.length} × ৳${unit}` : ""}</p>
        </div>

        <div className="mt-3 flex gap-3">
          {full3D && (
            <Button
              variant="secondary"
              icon={inHall ? "widget" : "eye"}
              onClick={inHall ? backToSeats : preview}
              disabled={stage === "toHall" || stage === "toMap" || !sorted.length}
              loading={waiting}
              className="shrink-0"
            >
              {inHall ? t("booking.seatsBtn") : t("booking.preview")}
            </Button>
          )}
          <Button className="flex-1" disabled={!sorted.length} loading={leaving} onClick={goCheckout}>
            {t("common.continue")} · <RollingNumber value={totalText} />
          </Button>
        </div>
      </div>

      {/* §9.6 leaving for checkout: fade to paper */}
      <div aria-hidden className={`pointer-events-none fixed inset-0 z-[60] bg-paper transition-opacity duration-[600ms] ${leaving ? "" : "opacity-0"}`} />
    </div>
  );
}
