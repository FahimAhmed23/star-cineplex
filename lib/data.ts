// Typed access to /data (client-safe: halls, branches, movies are small; showtimes stay server-side later).
import hallsData from "@/data/halls.json";
import branchesData from "@/data/branches.json";
import moviesData from "@/data/movies.json";
import type { Branch, BranchTheme, Hall, Movie } from "./types";

export const halls = hallsData.halls as Hall[];
export const branches = (branchesData.branches as Branch[]).slice().sort((a, b) => a.order - b.order);
export const movies = moviesData.movies as Movie[];

export const getHall = (id: string) => halls.find((h) => h.id === id);
export const getBranch = (slug: string) => branches.find((b) => b.slug === slug);
export const getMovie = (slug: string) => movies.find((m) => m.slug === slug);

/** The branch look with any per-hall overrides applied (§6 Branch hall themes). */
export function hallTheme(hall: Hall): BranchTheme {
  const theme = getBranch(hall.branch)!.theme;
  return { ...theme, ...hall.look };
}
