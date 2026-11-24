"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Navbar } from "@/components/nav/Navbar";
import { scrollToY, startSmoothScroll } from "@/lib/smooth-scroll";
import { useUi } from "@/lib/store";
import { STORY } from "@/lib/story";
import type { Hall, Movie } from "@/lib/types";
import { ComingSoon } from "./ComingSoon";
import { HallHero, type HeroMovie } from "./HallHero";
import { NowShowing } from "./NowShowing";
import { OpeningSequence } from "./OpeningSequence";
import { PosterTransition, boxOf, fullScreen, type Box } from "./PosterTransition";
import { StoryOverlay } from "./StoryOverlay";
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
 * Home (CLAUDE.md §8): opening → navbar + 3D hall hero → the "Into the hall" scroll story (§8.3: the hero
 * pins, the film title stands in the room, the camera walks in, the first Now Showing row rises)
 * → the rest of Now Showing → Coming Soon. Play Trailer on any card opens the Trailer view (§8.7).
 */
export function HomeExperience({ movies, allMovies, ...hero }: Props) {
  const story = useRef<HTMLElement>(null);
  const after = useRef<HTMLDivElement>(null);
  // reduced motion: no pin, no camera walk, Now Showing as a normal section (decided on the client)
  const [storyMode, setStoryMode] = useState(true);
  const [trailer, setTrailer] = useState<HeroMovie | null>(null);
  const [trailerSound, setTrailerSound] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);
  const returnScroll = useRef(0);
  const trailerRef = useRef<HeroMovie | null>(null);
  trailerRef.current = trailer;
  const bySlug = useCallback((slug: string | null) => allMovies.find((m) => m.slug === slug) ?? null, [allMovies]);
  const nowShowing = allMovies.filter((m) => m.status === "now-showing");
  const comingSoon = allMovies.filter((m) => m.status === "coming-soon");

  useEffect(() => startSmoothScroll(), []);

  // ── §8.3 the scroll story: pin the hero for ~260vh; progress p drives the 3D (via the store) and the DOM (--p) ──
  useLayoutEffect(() => {
    const el = story.current;
    const next = after.current;
    if (!el || !next) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStoryMode(false);
      return;
    }
    const apply = (p: number) => {
      el.style.setProperty("--p", p.toFixed(4));
      useUi.setState({ heroScroll: p });
    };
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: () => `+=${Math.round(innerHeight * STORY.length)}`,
      pin: true,
      pinSpacing: true,
      scrub: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => apply(self.progress),
      onRefresh: (self) => useUi.setState({ storyEnd: self.end }),
    });
    // the hall has fully scrolled away once the next section reaches the top: pause the trailer + 3D loop
    const off = ScrollTrigger.create({
      trigger: next,
      start: "top top",
      onToggle: (self) => useUi.setState({ heroCovered: self.isActive }),
    });
    return () => {
      st.kill();
      off.kill();
      apply(0);
    };
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
          scrollToY(0);
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
        {/* pinned by ScrollTrigger for the scroll story; --p (0..1) drives the DOM layers */}
        <section ref={story} id="home-story" className="relative h-[100svh] min-h-[640px] overflow-hidden bg-night" style={{ ["--p" as string]: 0 }}>
          <HallHero movies={movies} {...hero} trailer={trailer} trailerSound={trailerSound} onBack={onBack} />
          {storyMode && <StoryOverlay movies={nowShowing} onPlayTrailer={openTrailer} />}
        </section>
        <div ref={after} className="relative z-10 bg-night">
          <NowShowing movies={nowShowing} onPlayTrailer={openTrailer} skip={storyMode ? 4 : 0} />
          <ComingSoon movies={comingSoon} onPlayTrailer={openTrailer} />
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
            scrollToY(0);
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
            scrollToY(scroll);
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
