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

// ── Group picking (reference video B): the selection is one block of N seats that moves together ──

/** single empty seats a selection would leave stranded in its row (between taken seats / walls / aisles) */
function strandedCount(rowSeats: Seat[], taken: Set<string>, pick: Set<string>) {
  let n = 0;
  rowSeats.forEach((s, i) => {
    if (taken.has(s.id) || pick.has(s.id)) return;
    const l = rowSeats[i - 1];
    const r = rowSeats[i + 1];
    const blocked = (x: Seat | undefined, side: -1 | 1) => !x || x.col !== s.col + side || taken.has(x.id) || pick.has(x.id);
    if (blocked(l, -1) && blocked(r, 1)) n++;
  });
  return n;
}

/** runs of `n` free, side-by-side seats in one row (no aisle inside) */
function freeRuns(rowSeats: Seat[], taken: Set<string>, n: number) {
  const out: Seat[][] = [];
  for (let i = 0; i + n <= rowSeats.length; i++) {
    const run = rowSeats.slice(i, i + n);
    if (run.some((s, k) => k > 0 && s.col !== run[k - 1].col + 1)) continue;
    if (run.some((s) => taken.has(s.id))) continue;
    out.push(run);
  }
  return out;
}

/**
 * The block of `n` seats to drop at `target` (drag / tap): the free run in that row whose centre is nearest the
 * target, preferring runs that don't strand a single seat; falls back to the next row up or down. null = no room.
 */
export function groupAround(seats: Seat[], taken: Set<string>, target: Seat, n: number): string[] | null {
  const rows = rowsOf(seats);
  const order = [...rows.values()].sort((a, b) => Math.abs(a[0].rowIndex - target.rowIndex) - Math.abs(b[0].rowIndex - target.rowIndex));
  for (const row of order) {
    if (Math.abs(row[0].rowIndex - target.rowIndex) > 1) break;
    const all = freeRuns(row, taken, n);
    if (!all.length) continue;
    // the seat you pointed at is yours: when a run can include it, only those runs count (Nov 27 — before, the
    // single-seat rule could slide the block off the seat you tapped, e.g. the middle of three; §9.5 says that rule
    // is a suggestion, never a block — the hint in the bottom bar still offers the shift)
    const withTarget = all.filter((run) => run.some((x) => x.id === target.id));
    const runs = withTarget.length ? withTarget : all;
    const score = (run: Seat[]) => {
      const mid = (run[0].col + run[run.length - 1].col) / 2;
      return Math.abs(mid - target.col) + strandedCount(row, taken, new Set(run.map((s) => s.id))) * 1.5;
    };
    runs.sort((a, b) => score(a) - score(b));
    return runs[0].map((s) => s.id);
  }
  return null;
}

/** change the block size: grow next to the current seats (right, then left), else move the block; shrink from the end */
export function resizeGroup(hall: Hall, seats: Seat[], taken: Set<string>, current: string[], n: number): string[] | null {
  if (!current.length) return bestAvailable(hall, seats, taken, n) ?? spreadPick(hall, seats, taken, n);
  if (n < current.length) return current.slice(0, n);
  const byId = new Map(seats.map((s) => [s.id, s]));
  const cur = current.map((id) => byId.get(id)!).sort((a, b) => a.col - b.col);
  const row = rowsOf(seats).get(cur[0].row)!;
  const pick = new Set(current);
  let lo = row.indexOf(cur[0]);
  let hi = row.indexOf(cur[cur.length - 1]);
  while (pick.size < n) {
    const r = row[hi + 1];
    const l = row[lo - 1];
    if (r && r.col === row[hi].col + 1 && !taken.has(r.id)) { pick.add(r.id); hi++; continue; }
    if (l && l.col === row[lo].col - 1 && !taken.has(l.id)) { pick.add(l.id); lo--; continue; }
    break;
  }
  if (pick.size === n) return row.slice(lo, hi + 1).map((s) => s.id);
  const mid = cur[Math.floor(cur.length / 2)];
  return groupAround(seats, taken, mid, n) ?? bestAvailable(hall, seats, taken, n) ?? spreadPick(hall, seats, taken, n);
}

/** last resort when no N seats sit together anywhere: the N free seats closest to the best spot */
export function spreadPick(hall: Hall, seats: Seat[], taken: Set<string>, n: number): string[] | null {
  const free = seats.filter((s) => !taken.has(s.id));
  if (free.length < n) return null;
  const width = hall.rows[0].pattern.length;
  const idealRow = (hall.rows.length - 1) * 0.6;
  return free
    .map((s) => ({ s, d: Math.hypot((s.rowIndex - idealRow) * 1.4, s.col - (width - 1) / 2) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((x) => x.s.id);
}

/** "Row F · 07–09" style label for a block (or "F07, G08" when split) */
export function groupLabel(seats: Seat[], ids: string[]) {
  const byId = new Map(seats.map((s) => [s.id, s]));
  const g = ids.map((id) => byId.get(id)!).filter(Boolean).sort((a, b) => a.rowIndex - b.rowIndex || a.col - b.col);
  if (!g.length) return null;
  const oneRow = g.every((s) => s.row === g[0].row);
  if (!oneRow) return { row: null as string | null, seats: g.map((s) => s.id).join(", ") };
  const nums = g.map((s) => s.id.slice(s.row.length)).sort((a, b) => +a - +b);
  return { row: g[0].row, seats: nums.length > 1 ? `${nums[0]}–${nums[nums.length - 1]}` : nums[0] };
}
