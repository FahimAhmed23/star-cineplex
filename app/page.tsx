import { HomeExperience } from "@/components/home/HomeExperience";
import type { HeroMovie } from "@/components/home/HallHero";
import type { ShowLite } from "@/components/home/TonightStrip";
import { getHall, movies } from "@/lib/data";
import { loadShowtimes, typicalShow } from "@/lib/showtimes.server";

const HERO_HALL = "bdc-hall-1"; // §8.2: the hero is Bashundhara Hall 1

export default async function Home() {
  const showtimes = await loadShowtimes();

  // "Playing across N branches" — branches that have this film in the schedule
  const branchesFor = (slug: string) => new Set(showtimes.filter((s) => s.movie === slug).map((s) => s.branch)).size;
  const allMovies: HeroMovie[] = movies.map((m) => ({ ...m, branchCount: branchesFor(m.slug) }));
  const featured = allMovies.filter((m) => m.featured && m.status === "now-showing").slice(0, 6);

  // a week of shows without booked-seat lists (~35 KB); the browser picks "tonight" in local time
  const tonight: ShowLite[] = showtimes.map(({ id, branch, movie, date, time, format }) => ({ id, branch, movie, date, time, format }));
  const titles = Object.fromEntries(movies.map((m) => [m.slug, { en: m.title, bn: m.titleBn }]));

  const hall = getHall(HERO_HALL)!;
  const show = typicalShow(showtimes, HERO_HALL);

  return <HomeExperience movies={featured} allMovies={allMovies} hall={hall} bookedSeats={show?.bookedSeats ?? []} tonight={tonight} titles={titles} />;
}
