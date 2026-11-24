"use client";

import { useMemo, useRef } from "react";
import { useT } from "@/lib/i18n";
import type { Hall, Seat, SeatClass } from "@/lib/types";

/**
 * §9.5 2D toggle: a flat seat map from the same hall data (rows, aisles, classes, booked / selected), screen at
 * the top. Fully keyboard-navigable: arrow keys move between seats, Enter / Space selects.
 */
export function SeatMap2D({ hall, seats, booked, selected, onToggle, price }: {
  hall: Hall;
  seats: Seat[];
  booked: Set<string>;
  selected: Set<string>;
  onToggle: (id: string) => void;
  price: (c: SeatClass) => number;
}) {
  const { t } = useT();
  const cols = hall.rows[0].pattern.length;
  const grid = useMemo(() => {
    const byPos = new Map(seats.map((s) => [`${s.rowIndex}:${s.col}`, s]));
    // screen at the top: the row nearest the screen (A) first
    return hall.rows.map((r, ri) => ({ row: r.row, cells: Array.from({ length: cols }, (_, c) => byPos.get(`${ri}:${c}`) ?? null) }));
  }, [hall, seats, cols]);
  const refs = useRef(new Map<string, HTMLButtonElement>());

  const move = (s: Seat, dr: number, dc: number) => {
    // next seat in that direction, skipping aisles
    let r = s.rowIndex;
    let c = s.col;
    for (let k = 0; k < cols + hall.rows.length; k++) {
      r += dr;
      c += dc;
      if (r < 0 || r >= grid.length || c < 0 || c >= cols) return;
      const hit = grid[r].cells[c] ?? (dr ? grid[r].cells.reduce<Seat | null>((best, x) => (x && (!best || Math.abs(x.col - s.col) < Math.abs(best.col - s.col)) ? x : best), null) : null);
      if (hit) {
        refs.current.get(hit.id)?.focus();
        return;
      }
    }
  };

  return (
    <div className="mx-auto w-max py-6">
      <div className="mx-auto mb-10 h-2 w-[70%] rounded-pill bg-gradient-to-r from-transparent via-white/70 to-transparent shadow-[0_8px_30px_rgb(255_255_255/0.25)]" />
      <p className="-mt-8 mb-8 text-center text-[12px] tracking-wide text-muted">{t("booking.screen")}</p>
      <div role="grid" aria-label={t("booking.seatMap")} className="flex flex-col gap-2">
        {grid.map((r) => (
          <div key={r.row} role="row" className="flex items-center gap-2">
            <span className="w-6 text-right font-mono text-[12px] text-muted">{r.row}</span>
            <div className="flex gap-1.5">
              {r.cells.map((s, c) =>
                s ? (
                  <button
                    key={s.id}
                    ref={(el) => {
                      if (el) refs.current.set(s.id, el);
                    }}
                    role="gridcell"
                    type="button"
                    disabled={booked.has(s.id)}
                    aria-pressed={selected.has(s.id)}
                    aria-label={`${t("booking.rowSeat", { row: s.row, seat: s.number })}, ${booked.has(s.id) ? t("booking.booked") : `৳${price(s.class)}`}`}
                    onClick={() => onToggle(s.id)}
                    onKeyDown={(e) => {
                      const d = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key];
                      if (d) {
                        e.preventDefault();
                        move(s, d[0], d[1]);
                      }
                    }}
                    className={`seat2d seat2d--${s.class} focus-ring ${selected.has(s.id) ? "is-selected" : ""}`}
                  >
                    {s.number}
                  </button>
                ) : (
                  <span key={c} className="seat2d-gap" aria-hidden />
                ),
              )}
            </div>
            <span className="w-6 font-mono text-[12px] text-muted">{r.row}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
