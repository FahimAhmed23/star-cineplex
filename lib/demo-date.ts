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

/** Dates follow the language (Bangla weekday/month names), digits stay Latin (§5 Language). */
export const dateLocale = (lang: string) => (lang === "bn" ? "bn-BD-u-nu-latn" : "en-GB");

/** "Today" / "Tomorrow" (in the demo week) or "Wed 25 Nov" */
export function showDateLabel(date: string, t: (k: string) => string, lang = "en") {
  const now = new Date();
  if (date === demoDateFor(localIso(now))) return t("common.today");
  if (date === demoDateFor(localIso(new Date(now.getTime() + DAY)))) return t("common.tomorrow");
  return new Date(`${date}T00:00:00`).toLocaleDateString(dateLocale(lang), { weekday: "short", day: "numeric", month: "short" });
}

export function nowHhmm(d = new Date()) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
