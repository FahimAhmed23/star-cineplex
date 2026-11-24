"use client";

// Phase 7 booking state (CLAUDE.md §9.6–9.8). There is no backend: the seat hold lives in sessionStorage and
// confirmed bookings in localStorage, so the ticket page (and later "My tickets", §7) can open them again.
import type { SeatClass } from "./types";

export type PayMethod = "bkash" | "nagad" | "card";

export interface Booking {
  id: string;
  showId: string;
  movie: string;
  branch: string;
  hall: string;
  date: string;
  time: string;
  seats: { id: string; class: SeatClass; price: number }[];
  total: number;
  phone: string; // 10 digits after +880
  email?: string;
  method: PayMethod;
  createdAt: string;
  /** "view from your seat" still (JPEG data URL), when the 3D hall was used */
  view?: string | null;
}

const BOOKINGS = "sc-bookings";
const LAST = "sc-last-booking";
const HOLD = "sc-hold";
const VIEW = "sc-seat-view";
export const HOLD_SECONDS = 600;

const read = <T,>(store: Storage | undefined, key: string): T | null => {
  try {
    const raw = store?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};
const write = (store: Storage | undefined, key: string, value: unknown) => {
  try {
    store?.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked — the flow still works for this visit */
  }
};
const ls = () => (typeof window === "undefined" ? undefined : window.localStorage);
const ss = () => (typeof window === "undefined" ? undefined : window.sessionStorage);

export const holdKey = (showId: string, seats: string[]) => `${showId}|${[...seats].sort().join(",")}`;

/** start a fresh 10-minute hold (called when the user presses Continue on the seat screen) */
export function startHold(showId: string, seats: string[]) {
  write(ss(), HOLD, { key: holdKey(showId, seats), start: Date.now() });
}
/** when the hold for these seats started; starts one now if there is none for them */
export function holdStart(showId: string, seats: string[]): number {
  const h = read<{ key: string; start: number }>(ss(), HOLD);
  if (h && h.key === holdKey(showId, seats)) return h.start;
  startHold(showId, seats);
  return Date.now();
}
export function clearHold() {
  ss()?.removeItem(HOLD);
}

export function saveSeatView(showId: string, dataUrl: string | null) {
  if (dataUrl) write(ss(), VIEW, { showId, dataUrl });
  else ss()?.removeItem(VIEW);
}
export function seatView(showId: string): string | null {
  const v = read<{ showId: string; dataUrl: string }>(ss(), VIEW);
  return v && v.showId === showId ? v.dataUrl : null;
}

export function newBookingId() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return `SC-${s.slice(0, 4)}-${s.slice(4)}`;
}

export function saveBooking(b: Booking) {
  const all = read<Record<string, Booking>>(ls(), BOOKINGS) ?? {};
  // keep the store small: the five most recent tickets
  const kept = Object.values(all)
    .sort((a, z) => z.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);
  write(ls(), BOOKINGS, Object.fromEntries([...kept, b].map((x) => [x.id, x])));
  write(ls(), LAST, b.id);
}
export function getBooking(id: string): Booking | null {
  return read<Record<string, Booking>>(ls(), BOOKINGS)?.[id] ?? null;
}
export function lastBookingId(): string | null {
  return read<string>(ls(), LAST);
}

/** "+880 1712-345678" */
export function formatPhone(d: string) {
  return d.length > 4 ? `${d.slice(0, 4)}-${d.slice(4)}` : d;
}
/** Bangladeshi mobile after +880: 1 + operator 3–9 + 8 digits */
export const validPhone = (d: string) => /^1[3-9]\d{8}$/.test(d);
