// Seat-map logic shared by the 3D hall, the 2D map, the data generator and the validator.
// Only `import type` here, so Node can run this file directly (type stripping) from /scripts.
import type { Hall, PriceBand, Seat } from "./types";

/** Expands a hall's grid patterns into labelled seats (§6 halls.json format). */
export function buildSeats(hall: Hall): Seat[] {
  const seats: Seat[] = [];
  hall.rows.forEach((r, rowIndex) => {
    const cols: number[] = [];
    for (let c = 0; c < r.pattern.length; c++) if (r.pattern[c] === "S") cols.push(c);
    if (hall.numbering === "rtl") cols.reverse();
    cols.forEach((col, i) => {
      const number = r.start + i;
      seats.push({
        id: `${r.row}${String(number).padStart(hall.pad, "0")}`,
        row: r.row,
        rowIndex,
        col,
        number,
        class: r.class,
      });
    });
  });
  return seats;
}

export function gridWidth(hall: Hall): number {
  return hall.rows[0]?.pattern.length ?? 0;
}

/** §6 price time bands: Fri/Sat (+ holidays) = weekend; Sun–Thu before 17:00 = matinee, else evening. */
export function priceBandFor(date: string, time: string, holidays: string[] = []): PriceBand {
  const day = new Date(`${date}T00:00:00`).getDay(); // 5 = Fri, 6 = Sat
  if (day === 5 || day === 6 || holidays.includes(date)) return "weekend";
  const [h] = time.split(":").map(Number);
  return h < 17 ? "matinee" : "evening";
}

export function seatPrice(hall: Hall, seatClass: Seat["class"], band: PriceBand): number | null {
  return hall.prices[seatClass]?.[band] ?? null;
}
