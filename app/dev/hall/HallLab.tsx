"use client";

// Internal test bench for Phase 1 (not part of the case-study flow): pick a hall, switch camera presets,
// hover/click seats, raise the house lights and watch the frame rate.
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { CameraMode } from "@/components/hall/CameraRig";
import { branches, getMovie, halls } from "@/lib/data";
import { buildLayout, type PlacedSeat } from "@/lib/hall-layout";

const Hall3D = dynamic(() => import("@/components/hall/Hall3D"), { ssr: false });

type Shows = Record<string, { id: string; movie: string; bookedSeats: string[] }>;

const chip = (on: boolean) =>
  `rounded-pill px-3 py-1.5 text-[13px] font-medium transition-colors ${on ? "bg-purple text-white" : "bg-white/8 text-muted hover:text-white"}`;

export function HallLab({ shows }: { shows: Shows }) {
  const [hallId, setHallId] = useState("bdc-hall-1");
  const [mode, setMode] = useState<CameraMode>("front");
  const [seatId, setSeatId] = useState<string | null>(null);
  const [house, setHouse] = useState(0);
  const [hover, setHover] = useState<PlacedSeat | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [fps, setFps] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const [showBooked, setShowBooked] = useState(true);
  const [highlight, setHighlight] = useState<string | null>(null);

  const hall = halls.find((h) => h.id === hallId)!;
  const show = shows[hallId];
  const movie = getMovie(show?.movie ?? "japito-jibon")!;
  const layout = useMemo(() => buildLayout(hall), [hall]);
  const booked = useMemo(() => (showBooked ? show?.bookedSeats ?? [] : []), [show, showBooked]);
  const bookedSet = useMemo(() => new Set(booked), [booked]);
  const classes = [...new Set(hall.rows.map((r) => r.class))];

  const pickMode = (m: CameraMode) => {
    setMode(m);
    setHouse(m === "overview" ? 0.85 : m === "seat" ? 0.15 : 0);
    if (m === "seat" && !seatId) setSeatId(layout.seats[Math.floor(layout.seats.length * 0.55)].id);
  };

  return (
    <main className="fixed inset-0 bg-night">
      <Hall3D
        key={hallId}
        className="!absolute inset-0"
        hall={hall}
        bookedSeats={booked}
        mode={mode}
        seatId={seatId}
        resetKey={resetKey}
        trailer={movie.trailer}
        poster={movie.trailerPoster}
        houseLights={house}
        selected={selected}
        hovered={hover?.id ?? null}
        highlightClass={highlight}
        onSeatPointer={(s) => {
          setHover(s);
          document.body.style.cursor = s ? (bookedSet.has(s.id) ? "not-allowed" : "pointer") : "";
        }}
        onSeatClick={(s) => {
          if (bookedSet.has(s.id)) return;
          setSelected((prev) => {
            const n = new Set(prev);
            if (n.has(s.id)) n.delete(s.id);
            else if (n.size < 10) n.add(s.id);
            return n;
          });
        }}
        onFps={setFps}
      />

      <div className="glass absolute top-4 left-4 w-[340px] rounded-card-md border border-white/10 p-5 text-[13px]">
        <p className="mb-3 text-[15px] font-semibold">Hall engine — Phase 1</p>
        <label className="mb-1 block text-muted">Hall</label>
        <select
          value={hallId}
          onChange={(e) => { setHallId(e.target.value); setSelected(new Set()); setSeatId(null); }}
          className="mb-4 w-full rounded-pill border border-white/15 bg-black/40 px-3 py-2"
        >
          {halls.map((h) => (
            <option key={h.id} value={h.id}>
              {branches.find((b) => b.slug === h.branch)?.name} · {h.name} ({h.type}{h.approx ? ", approx" : ""})
            </option>
          ))}
        </select>

        <p className="mb-1 text-muted">Camera</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {(["front", "overview", "seat"] as const).map((m) => (
            <button key={m} className={chip(mode === m)} onClick={() => pickMode(m)}>
              {m === "front" ? "Hero front" : m === "overview" ? "Overview" : `View from ${seatId ?? "seat"}`}
            </button>
          ))}
          {mode === "overview" && (
            <button className={chip(false)} onClick={() => setResetKey((k) => k + 1)}>Reset view</button>
          )}
        </div>

        <label className="mb-1 block text-muted">House lights {Math.round(house * 100)}%</label>
        <input type="range" min={0} max={1} step={0.01} value={house} onChange={(e) => setHouse(+e.target.value)} className="mb-4 w-full accent-[var(--purple)]" />

        <div className="mb-4 flex flex-wrap gap-2">
          <button className={chip(showBooked)} onClick={() => setShowBooked((v) => !v)}>Bookings {showBooked ? "on" : "off"}</button>
          {classes.map((c) => (
            <button key={c} className={chip(highlight === c)} onMouseEnter={() => setHighlight(c)} onMouseLeave={() => setHighlight(null)}>
              Glow {c}
            </button>
          ))}
        </div>

        <dl className="grid grid-cols-2 gap-y-1">
          <dt className="text-muted">Seats</dt><dd className="mono">{layout.seats.length}</dd>
          <dt className="text-muted">Booked</dt><dd className="mono">{booked.length}</dd>
          <dt className="text-muted">Selected</dt><dd className="mono">{[...selected].join(" ") || "—"}</dd>
          <dt className="text-muted">Trailer</dt><dd className="truncate">{movie.title}</dd>
          <dt className="text-muted">FPS</dt><dd className={`mono ${fps && fps < 50 ? "text-gold" : ""}`}>{fps || "…"}</dd>
        </dl>
      </div>

      {hover && (
        <div className="glass pointer-events-none absolute right-4 bottom-4 rounded-card-sm border border-white/10 px-4 py-3 text-[13px]">
          <p className="font-semibold">Row {hover.row} · Seat {hover.id}</p>
          <p className="text-muted capitalize">{bookedSet.has(hover.id) ? "Booked" : hover.class.replace("-", " ")}</p>
          {!bookedSet.has(hover.id) && (
            <button className="pointer-events-auto mt-2 text-purple-light underline" onClick={() => { setSeatId(hover.id); setMode("seat"); }}>
              View from seat
            </button>
          )}
        </div>
      )}
    </main>
  );
}
