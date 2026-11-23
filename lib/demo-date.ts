// The demo showtimes cover one fixed week (data/showtimes.json). To keep "Tonight at" and the date strip
// meaningful on any day, today's real date is mapped onto the same weekday inside that week.
export const DATA_START = "2026-11-23";
const DAY = 86_400_000;

const toUtc = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

export function localIso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Real date (YYYY-MM-DD) → the date in the demo week with the same weekday. */
export function demoDateFor(realIso: string): string {
  const diff = Math.round((toUtc(realIso) - toUtc(DATA_START)) / DAY);
  const k = ((diff % 7) + 7) % 7;
  return iso(toUtc(DATA_START) + k * DAY);
}

/** "18:45" → "6:45 PM" */
export function formatTime(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export function nowHhmm(d = new Date()) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
