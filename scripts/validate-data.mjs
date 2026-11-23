// Validates /data against CLAUDE.md §6. Run: npm run validate:data
import { readFileSync, existsSync } from "node:fs";
import { buildSeats, gridWidth, priceBandFor } from "../lib/halls.ts";

const read = (f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), "utf8"));
const { halls } = read("halls.json");
const { movies } = read("movies.json");
const { branches } = read("branches.json");
const { showtimes } = read("showtimes.json");

const errors = [];
const ok = (cond, msg) => { if (!cond) errors.push(msg); };

// Expected seat counts from §6
const EXPECT = { "bdc-hall-1": 248, "bdc-hall-2": 248, "bdc-hall-3": 248, "bdc-hall-5": 113, "bdc-hall-6": 231 };

const seatIndex = new Map();
for (const h of halls) {
  const w = gridWidth(h);
  ok(h.rows.every((r) => r.pattern.length === w), `${h.id}: rows have different grid widths`);
  ok(h.rows.every((r) => /^[S.]+$/.test(r.pattern)), `${h.id}: pattern has characters other than S and .`);
  ok(!h.rows.some((r) => r.row === "I"), `${h.id}: has a row I (there is no row I)`);
  ok(new Set(h.rows.map((r) => r.row)).size === h.rows.length, `${h.id}: duplicate row letters`);
  for (const r of h.rows) ok(h.prices[r.class], `${h.id}: no price for class ${r.class}`);
  ok(branches.some((b) => b.slug === h.branch), `${h.id}: unknown branch ${h.branch}`);
  const seats = buildSeats(h);
  const ids = new Set(seats.map((s) => s.id));
  ok(ids.size === seats.length, `${h.id}: duplicate seat labels`);
  if (EXPECT[h.id]) ok(seats.length === EXPECT[h.id], `${h.id}: ${seats.length} seats, expected ${EXPECT[h.id]}`);
  seatIndex.set(h.id, ids);
  console.log(`${h.id.padEnd(28)} ${h.type.padEnd(8)} ${String(seats.length).padStart(3)} seats  grid ${w}${h.approx ? "  (approx)" : ""}`);
}

// Spot checks from §6
const label = (id, pred) => buildSeats(halls.find((h) => h.id === id)).filter(pred).map((s) => s.id);
const e = label("bdc-hall-1", (s) => s.row === "E");
ok(e[0] === "E04" && e.at(-1) === "E18" && e.length === 15, `Hall 1 row E should be E04–E18, got ${e[0]}–${e.at(-1)}`);
const n = label("bdc-hall-1", (s) => s.row === "N");
ok(n.length === 22 && n.at(-1) === "N22", "Hall 1 row N should be N01–N22");
const vipA = buildSeats(halls.find((h) => h.id === "bdc-hall-5")).filter((s) => s.row === "A");
const a1 = vipA.find((s) => s.id === "A1"), a12 = vipA.find((s) => s.id === "A12");
ok(a1 && a12 && a1.col > a12.col, "VIP Hall 5: A1 should be on the right (rtl numbering)");

ok(branches.length === 9, `expected 9 branches, got ${branches.length}`);

for (const m of movies) {
  for (const f of ["poster", "trailer", "trailerPoster"]) ok(existsSync(new URL(`../public${m[f]}`, import.meta.url)), `${m.slug}: missing ${m[f]}`);
}
ok(movies.filter((m) => m.featured).length >= 5, "hero carousel needs 5–6 featured movies");

for (const s of showtimes) {
  const hall = halls.find((h) => h.id === s.hall);
  ok(hall && hall.branch === s.branch, `${s.id}: hall/branch mismatch`);
  ok(movies.some((m) => m.slug === s.movie && m.status === "now-showing"), `${s.id}: movie not now-showing`);
  ok(priceBandFor(s.date, s.time) === s.priceBand, `${s.id}: wrong price band`);
  const ids = seatIndex.get(s.hall);
  const bad = s.bookedSeats.filter((b) => !ids?.has(b));
  ok(bad.length === 0, `${s.id}: booked seats not in hall: ${bad.slice(0, 5).join(", ")}`);
}
const sold = showtimes.filter((s) => s.bookedSeats.length === seatIndex.get(s.hall).size).length;
console.log(`${branches.length} branches · ${movies.length} movies · ${showtimes.length} showtimes (${sold} sold out)`);

if (errors.length) {
  console.error(`\n✗ ${errors.length} problem(s):\n- ` + errors.slice(0, 40).join("\n- "));
  process.exit(1);
}
console.log("\n✓ data valid");
