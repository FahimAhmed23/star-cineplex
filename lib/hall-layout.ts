// Turns a hall's grid patterns into 3D positions (CLAUDE.md §4 "The hall is procedural", §6).
// Coordinates (metres, three.js): screen at −Z, rows go back towards +Z, x = grid column left → right
// as seen from the audience, y up. Row A is nearest the screen; each row sits on its own stadium riser.
import { buildSeats } from "./halls";
import type { Hall, HallType, Seat, SeatClass } from "./types";

export type SeatModel = "premium" | "semi-recliner" | "vip" | "atmos";

interface Metrics {
  pitch: number; // seat centre to seat centre in a row (same for every row)
  rowDepth: number; // row to row
  riser: number; // height gained per row
  flatRows: number; // first rows on the flat floor before the stadium starts
  frontGap: number; // screen wall → row A
  backGap: number; // last row → back wall
  sideAisle: number; // walkway between the outermost grid column and the wall
  screenAspect: number;
  curvedScreen: boolean;
}

const METRICS: Record<HallType, Metrics> = {
  premium: { pitch: 0.6, rowDepth: 1.0, riser: 0.3, flatRows: 1, frontGap: 5.2, backGap: 2.4, sideAisle: 1.4, screenAspect: 1.9, curvedScreen: false },
  atmos: { pitch: 0.6, rowDepth: 1.0, riser: 0.3, flatRows: 1, frontGap: 5.6, backGap: 2.4, sideAisle: 1.5, screenAspect: 2.2, curvedScreen: true },
  vip: { pitch: 0.95, rowDepth: 1.75, riser: 0.36, flatRows: 1, frontGap: 4.6, backGap: 2.2, sideAisle: 1.2, screenAspect: 1.9, curvedScreen: false },
};

export const EYE_HEIGHT = 1.12; // seated eye height above the row floor

export interface PlacedSeat extends Seat {
  model: SeatModel;
  x: number;
  y: number; // floor height of its row
  z: number;
}

export interface RowTier {
  row: string;
  z: number;
  y: number;
  depth: number;
}

export interface HallLayout {
  hall: Hall;
  metrics: Metrics;
  seats: PlacedSeat[];
  byId: Map<string, PlacedSeat>;
  tiers: RowTier[];
  room: { width: number; depth: number; height: number; zFront: number; zBack: number };
  screen: { width: number; height: number; y: number; z: number; curved: boolean };
  seatBounds: { min: [number, number, number]; max: [number, number, number] };
}

export function modelFor(hallType: HallType, seatClass: SeatClass): SeatModel {
  if (seatClass === "vip") return "vip";
  if (seatClass === "semi-recliner") return "semi-recliner";
  return hallType === "atmos" ? "atmos" : "premium";
}

export function buildLayout(hall: Hall): HallLayout {
  const m = METRICS[hall.type];
  const cols = hall.rows[0].pattern.length;
  const gridWidth = cols * m.pitch;
  const rowY = (i: number) => Math.max(0, i - m.flatRows + 1) * m.riser;
  const rowZ = (i: number) => i * m.rowDepth;

  const seats: PlacedSeat[] = buildSeats(hall).map((s) => ({
    ...s,
    model: modelFor(hall.type, s.class),
    x: (s.col - (cols - 1) / 2) * m.pitch,
    y: rowY(s.rowIndex),
    z: rowZ(s.rowIndex),
  }));

  const tiers: RowTier[] = hall.rows.map((r, i) => ({ row: r.row, z: rowZ(i), y: rowY(i), depth: m.rowDepth }));

  const width = gridWidth + m.sideAisle * 2;
  const zFront = -m.frontGap;
  const zBack = rowZ(hall.rows.length - 1) + m.rowDepth / 2 + m.backGap;
  const screenWidth = width * 0.8;
  const screenHeight = screenWidth / m.screenAspect;
  const screenY = 1.3 + screenHeight / 2;
  const lastRowY = rowY(hall.rows.length - 1);
  const height = Math.max(screenY + screenHeight / 2 + 1.2, lastRowY + 3.2);

  const xs = seats.map((s) => s.x);
  const zs = seats.map((s) => s.z);
  return {
    hall,
    metrics: m,
    seats,
    byId: new Map(seats.map((s) => [s.id, s])),
    tiers,
    room: { width, depth: zBack - zFront, height, zFront, zBack },
    screen: { width: screenWidth, height: screenHeight, y: screenY, z: zFront + 0.25, curved: m.curvedScreen },
    seatBounds: {
      min: [Math.min(...xs) - m.pitch / 2, 0, Math.min(...zs) - m.rowDepth / 2],
      max: [Math.max(...xs) + m.pitch / 2, lastRowY + 1.2, Math.max(...zs) + m.rowDepth / 2],
    },
  };
}

/** Deterministic 0..1 hash for per-seat variation (silhouette variant, turn, colour). */
export function hash01(str: string, salt = 0): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10007) / 10007;
}
