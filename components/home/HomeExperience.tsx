"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Navbar } from "@/components/nav/Navbar";
import { useUi } from "@/lib/store";
import type { Hall, Movie } from "@/lib/types";
import { ComingSoon } from "./ComingSoon";
import { FilmReel } from "./FilmReel";
import { Footer } from "./Footer";
import { Moments } from "./Moments";
import { HallHero, type HeroMovie } from "./HallHero";
import { NowShowing } from "./NowShowing";
import { OpeningSequence } from "./OpeningSequence";
import { PosterTransition, boxOf, fullScreen, type Box } from "./PosterTransition";
import type { ShowLite } from "./TonightStrip";

gsap.registerPlugin(ScrollTrigger);

interface Props {
  movies: HeroMovie[];
  allMovies: HeroMovie[];
  hall: Hall;
  bookedSeats: string[];
  tonight: ShowLite[];
  titles: Record<string, { en: string; bn: string | null }>;
}

type Flight =
  | { kind: "open"; poster: string; from: Box; movie: HeroMovie }
  | { kind: "cover"; poster: string; slug: string; scroll: number }
  | { kind: "shrink"; poster: string; to: Box };

/**
 * Home (CLAUDE.md §8): opening → navbar + 3D hall hero (sticky) → the Now Showing sheet slides over it (§8.3)
 * → Coming Soon. Play Trailer on any card opens the Trailer view (§8.7) at /?trailer=<slug>.
 * → Moments (§8.8, the lights come up) → the Film Reel of branches (§8.9) → Footer (§8.10).
 */
export function HomeExperience({ movies, allMovies, ...hero }: Props) {
  const heroWrap = useRef<HTMLDivElement>(null);
  const [trailer, setTrailer] = useState<HeroMovie | null>(null);
  const [trailerSound, setTrailerSound] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);
  const returnScroll = useRef(0);
  const trailerRef = useRef<HeroMovie | null>(null);
  trailerRef.current = trailer;
  const bySlug = useCallback((slug: string | null) => allMovies.find((m) => m.slug === slug) ?? null, [allMovies]);
  const nowShowing = allMovies.filter((m) => m.status === "now-showing");
  const comingSoon = allMovies.filter((m) => m.status === "coming-soon");

  // ── §8.3 hero → Now Showing: the hero stays pinned, the next section slides over it like a sheet ──
  useLayoutEffect(() => {
    const wrap = heroWrap.current;
    const next = document.getElementById("now-showing");
    if (!wrap || !next) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return; // no pinning, normal scroll
    const st = ScrollTrigger.create({
      trigger: next,
      start: "top bottom",
      end: "top top",
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        wrap.style.setProperty("--p", p.toFixed(4));
        const covered = p > 0.995;
        const s = useUi.getState();
        useUi.setState({ heroScroll: p, ...(s.heroCovered !== covered ? { heroCovered: covered } : null) });
      },
    });
    return () => st.kill();
  }, []);

  // ── §8.7 Trailer view: URL + browser Back ──
  useEffect(() => {
    const slug = new URLSearchParams(location.search).get("trailer");
    const m = bySlug(slug);
    if (m) {
      setTrailer(m); // direct link: no click, so the trailer starts muted (autoplay rules)
      setTrailerSound(false);
    }
    const onPop = () => {
      const s = new URLSearchParams(location.search).get("trailer");
      if (s) {
        const mm = bySlug(s);
        if (mm) {
          setTrailer(mm);
          window.scrollTo({ top: 0 });
        }
      } else closeTrailer(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bySlug]);

  const openTrailer = useCallback(
    (movie: Movie, from: HTMLElement) => {
      const m = bySlug(movie.slug);
      if (!m) return;
      returnScroll.current = window.scrollY;
      setFlight({ kind: "open", poster: m.poster, from: boxOf(from), movie: m });
    },
    [bySlug],
  );

  /** Back: the poster covers the hall, the page returns to where it was, the poster shrinks into its card */
  const closeTrailer = useCallback((pushHistory: boolean) => {
    const current = trailerRef.current;
    if (!current) return;
    if (pushHistory) history.pushState(null, "", "/");
    setFlight({ kind: "cover", poster: current.poster, slug: current.slug, scroll: returnScroll.current });
  }, []);

  const onBack = () => {
    if (history.state && (history.state as { trailer?: string }).trailer) history.back(); // popstate → closeTrailer
    else closeTrailer(true);
  };

  return (
    <>
      <OpeningSequence />
      <Navbar revealWithIntro />
      <main>
        {/* pinned hero; the sections below have a solid background and a higher z-index */}
        <div ref={heroWrap} className="sticky top-0 motion-reduce:relative" style={{ ["--p" as string]: 0 }}>
          <HallHero movies={movies} {...hero} trailer={trailer} trailerSound={trailerSound} onBack={onBack} />
        </div>
        {/* one opaque sheet for everything after the hero: no sub-pixel seams where the pinned hero could show */}
        <div className="relative z-10 bg-night">
          <NowShowing movies={nowShowing} onPlayTrailer={openTrailer} />
          <ComingSoon movies={comingSoon} onPlayTrailer={openTrailer} />
          <Moments />
          <FilmReel />
          <Footer />
        </div>
      </main>

      {flight?.kind === "open" && (
        <PosterTransition
          key="open"
          poster={flight.poster}
          from={flight.from}
          to={fullScreen()}
          fadeOut
          onArrive={() => {
            // under the cover: jump to the top and switch the hero to this film
            window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
            setTrailerSound(true);
            setTrailer(flight.movie);
            history.pushState({ trailer: flight.movie.slug }, "", `/?trailer=${flight.movie.slug}`);
          }}
          onDone={() => setFlight(null)}
        />
      )}
      {flight?.kind === "cover" && (
        <PosterTransition
          key="cover"
          poster={flight.poster}
          from={fullScreen()}
          to={fullScreen()}
          fadeIn
          onArrive={() => {}}
          onDone={() => {
            const { slug, poster, scroll } = flight;
            setTrailer(null);
            window.scrollTo({ top: scroll, behavior: "instant" as ScrollBehavior });
            // wait for layout at the restored position, then shrink into the card (or just fade if it's gone)
            requestAnimationFrame(() =>
              requestAnimationFrame(() => {
                const card = [...document.querySelectorAll(`[data-card-slug="${slug}"] .movie-card__frame`)].find((el) => {
                  const r = el.getBoundingClientRect();
                  return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && !el.closest("[inert]");
                });
                setFlight(card ? { kind: "shrink", poster, to: boxOf(card) } : null);
              }),
            );
          }}
        />
      )}
      {flight?.kind === "shrink" && (
        <PosterTransition key="shrink" poster={flight.poster} from={fullScreen()} to={flight.to} onArrive={() => {}} onDone={() => setFlight(null)} />
      )}
    </>
  );
}
