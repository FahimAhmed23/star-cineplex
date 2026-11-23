// Shared data types for /data/*.json (CLAUDE.md §6, §9.5).

export type SeatClass = "premium" | "semi-recliner" | "vip";
export type HallType = "premium" | "vip" | "atmos";
export type PriceBand = "matinee" | "evening" | "weekend";
export type Format = "2D" | "3D" | "Atmos";

export type PriceTable = Partial<Record<SeatClass, Record<PriceBand, number>>>;

export interface HallRow {
  row: string;
  class: SeatClass;
  /** one char per grid column, left → right facing the screen: S = seat, . = gap */
  pattern: string;
  start: number;
}

export interface Hall {
  id: string;
  branch: string;
  name: string;
  type: HallType;
  numbering: "ltr" | "rtl";
  pad: number;
  /** true when the seat map is an approximation (not verified against the real hall) */
  approx?: boolean;
  /** BDT by seat class and price band */
  prices: PriceTable;
  /** optional per-hall overrides of the branch look (e.g. the walnut/amber VIP Hall 5) */
  look?: Partial<Pick<BranchTheme, "walls" | "accentLight" | "accentPattern" | "carpet">>;
  rows: HallRow[];
}

/** How the accent lights are drawn on the side walls (procedural, §6 Branch hall themes). */
export type AccentPattern = "diagonal" | "zigzag" | "hexagon" | "columns" | "lines" | "downlights" | "stars" | "sconces";

export interface BranchTheme {
  seat: string;
  seatMaterial: "fabric" | "leather";
  /** VIP / recliner rows keep their own leather colour where noted (§6) */
  leather?: string;
  walls: string;
  accentLight: string;
  accentPattern: AccentPattern;
  accentStyle: string;
  carpet: string;
  ref: string[];
}

export interface Branch {
  slug: string;
  name: string;
  nameBn: string;
  area: string;
  areaBn: string;
  city: "Dhaka" | "Chattogram" | "Narayanganj";
  /** display order: Dhaka branches first (§9.2) */
  order: number;
  reelLine: string | null;
  mapsQuery: string;
  theme: BranchTheme;
}

export interface Movie {
  slug: string;
  title: string;
  titleBn: string | null;
  status: "now-showing" | "coming-soon";
  imdbRating: number | null;
  certificate: "U" | "A" | null;
  runtimeMin: number | null;
  language: string;
  format: Format;
  genres: string[];
  synopsis: string;
  releaseDate: string;
  poster: string;
  trailer: string;
  trailerPoster: string;
  featured: boolean;
}

export interface Showtime {
  id: string;
  branch: string;
  hall: string;
  movie: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm (24h)
  format: Format;
  priceBand: PriceBand;
  bookedSeats: string[];
}

export interface Seat {
  id: string; // label, e.g. "E07"
  row: string;
  rowIndex: number; // 0 = nearest the screen
  col: number; // grid column, left → right facing the screen
  number: number;
  class: SeatClass;
}
