// Pure seat-selection helpers for §9.5: neighbours, Best available, the single-seat gap rule.
import type { Hall, Seat } from "./types";

/** Seats by row, ordered left → right by grid column (as seen from the audience). */
export function rowsOf(seats: Seat[]) {
  const rows = new Map<string, Seat[]>();
  for (const s of seats) {
    if (!rows.has(s.row)) rows.set(s.row, []);
    rows.get(s.row)!.push(s);
  }
  for (const r of rows.values()) r.sort((a, b) => a.col - b.col);
  return rows;
}

/** the seat physically next to `s` in its row (adjacent grid column), or null at an aisle / row end */
export function neighbour(byRowCol: Map<string, Seat>, s: Seat, dir: -1 | 1) {
  return byRowCol.get(`${s.row}:${s.col + dir}`) ?? null;
}

export function indexByRowCol(seats: Seat[]) {
  return new Map(seats.map((s) => [`${s.row}:${s.col}`, s]));
}

/**
 * Best available (§9.5): the best run of N adjacent free seats in one row — middle rows (a little behind the
 * centre), close to the centre line. Returns seat ids, or null when no row has room.
 */
export function bestAvailable(hall: Hall, seats: Seat[], taken: Set<string>, n: number, prefer?: Seat["class"]): string[] | null {
  const rows = rowsOf(seats);
  const rowCount = hall.rows.length;
  const width = hall.rows[0].pattern.length;
  const idealRow = (rowCount - 1) * 0.6;
  let best: { ids: string[]; score: number } | null = null;
  for (const [, row] of rows) {
    if (prefer && row[0].class !== prefer) continue;
    for (let i = 0; i + n <= row.length; i++) {
      const run = row.slice(i, i + n);
      // adjacent grid columns only (no aisle inside the group), all free
      if (run.some((s, k) => k > 0 && s.col !== run[k - 1].col + 1)) continue;
      if (run.some((s) => taken.has(s.id))) continue;
      const mid = (run[0].col + run[run.length - 1].col) / 2;
      const score = Math.abs(run[0].rowIndex - idealRow) / rowCount + (Math.abs(mid - (width - 1) / 2) / width) * 1.3;
      if (!best || score < best.score) best = { ids: run.map((s) => s.id), score };
    }
  }
  return best?.ids ?? null;
}

/**
 * Single-seat gap rule (§9.5): an empty seat squeezed between a selected seat and a booked seat (or the row
 * end / an aisle). Returns the first such gap and the shift that would close it, or null.
 */
export function findGap(seats: Seat[], booked: Set<string>, selected: Set<string>) {
  const idx = indexByRowCol(seats);
  for (const s of seats) {
    if (booked.has(s.id) || selected.has(s.id)) continue;
    const l = neighbour(idx, s, -1);
    const r = neighbour(idx, s, 1);
    const blocked = (x: Seat | null) => !x || booked.has(x.id);
    const sel = (x: Seat | null) => !!x && selected.has(x.id);
    let dir: -1 | 1 | 0 = 0;
    if (sel(r) && blocked(l)) dir = -1; // the group sits to the right: shift it left by one
    else if (sel(l) && blocked(r)) dir = 1; // the group sits to the left: shift it right by one
    if (!dir) continue;
    // the contiguous selected block next to the gap
    const block: Seat[] = [];
    let cur = dir === -1 ? r : l;
    while (cur && selected.has(cur.id)) {
      block.push(cur);
      cur = neighbour(idx, cur, dir === -1 ? 1 : -1);
    }
    const far = block[block.length - 1];
    return { gap: s.id, dir, add: s.id, remove: far.id };
  }
  return null;
}
