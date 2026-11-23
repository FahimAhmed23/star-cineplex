"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/lib/i18n";
import { useUi } from "@/lib/store";
import type { Hall, Movie } from "@/lib/types";
import { TonightStrip, type ShowLite } from "./TonightStrip";

const Hall3D = dynamic(() => import("@/components/hall/Hall3D"), { ssr: false });

const SLIDE_MS = 18_000; // each trailer plays ~15–20s, then the carousel advances (§8.2)
const DIP_MS = 300; // screen dips to black between trailers
const START_AT = 0.18; // skip studio logos / title cards at the start of each trailer

export interface HeroMovie extends Movie {
  branchCount: number;
}

interface Props {
  movies: HeroMovie[];
  hall: Hall;
  bookedSeats: string[];
  tonight: ShowLite[];
  titles: Record<string, { en: string; bn: string | null }>;
}

/**
 * Hero (CLAUDE.md §8.2): the 3D hall in the front view with the trailer carousel playing on its screen,
 * the movie info on the left and the "Tonight at" strip pinned to the bottom.
 */
export function HallHero({ movies, hall, bookedSeats, tonight, titles }: Props) {
  const { t, lang } = useT();
  const stage = useUi((s) => s.stage);
  const setHallReady = useUi((s) => s.setHallReady);
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [dipping, setDipping] = useState(false);
  const progress = useRef(0); // 0..1 of the current slide
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  const revealed = stage === "revealed";
  const movie = movies[index];

  const goTo = useCallback(
    (next: number) => {
      if (dipping) return;
      setDipping(true);
      window.setTimeout(() => {
        setIndex((next + movies.length) % movies.length);
        progress.current = 0;
        window.setTimeout(() => setDipping(false), DIP_MS);
      }, DIP_MS);
    },
    [dipping, movies.length],
  );

  // progress bar + auto-advance (no React re-render per frame)
  useEffect(() => {
    if (!revealed) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      if (!paused && !dipping) progress.current = Math.min(1, progress.current + dt / SLIDE_MS);
      bars.current.forEach((el, i) => {
        if (el) el.style.transform = `scaleX(${i < index ? 0 : i === index ? progress.current : 0})`;
      });
      if (progress.current >= 1 && !dipping) goTo(index + 1);
      else raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [revealed, paused, dipping, index, goTo]);

  const isBnTitle = lang === "bn" && !!movie.titleBn;
  const title = isBnTitle ? movie.titleBn! : movie.title;
  const long = title.length > 18;
  const runtime = movie.runtimeMin ? t("hero.minutes", { h: Math.floor(movie.runtimeMin / 60), m: movie.runtimeMin % 60 }) : null;

  // screen: 10% during the opening, up to full once the hall is revealed; black during a dip
  const brightness = !revealed ? 0.1 : dipping ? 0 : 1;

  const item = {
    hidden: { opacity: 0, y: reduced ? 0 : 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
  };

  return (
    <section className="relative h-[100svh] min-h-[640px] overflow-hidden bg-night" aria-label={t("hero.eyebrow")}>
      <Hall3D
        className="!absolute inset-0"
        hall={hall}
        bookedSeats={bookedSeats}
        mode="front"
        trailer={movie.trailer}
        poster={movie.trailerPoster}
        trailerCrop={movie.trailerCrop}
        startAt={START_AT}
        muted={muted}
        playing={!paused}
        screenBrightness={brightness}
        houseLights={0}
        onReady={() => setHallReady(true)}
      />

      {/* soft dark gradient on the left ~40%, so the info never covers the screen's centre */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-[56%] bg-[linear-gradient(to_right,rgb(7_5_10/0.95)_0%,rgb(7_5_10/0.9)_45%,rgb(7_5_10/0.55)_72%,transparent_100%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-night/90 to-transparent" />

      {/* hero info */}
      <div className="absolute inset-x-0 top-[max(124px,16vh)] mx-auto max-w-[1440px] px-8">
        <AnimatePresence mode="wait">
          {revealed && (
            <motion.div
              key={movie.slug}
              className="max-w-[600px]"
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, transition: { duration: 0.25 } }}
              variants={{ show: { transition: { staggerChildren: 0.1 } } }}
            >
              <motion.p variants={item} className="eyebrow mb-4">
                <Icon name="star" size={16} />
                {t("hero.eyebrow")}
              </motion.p>
              <motion.h1
                variants={item}
                lang={isBnTitle ? "bn" : "en"} /* English titles keep Fraunces in Bangla mode */
                className="display-xl mb-5 text-white"
                // display-xl, also capped by viewport height so title + buttons fit above the strip at 1280×720
                style={{ fontSize: long ? "min(clamp(56px, 6vw, 96px), 9.5vh)" : "min(clamp(72px, 10vw, 150px), 14vh)" }}
              >
                {title}
              </motion.h1>
              <motion.ul variants={item} className="mb-5 flex flex-wrap items-center gap-x-2.5 gap-y-2 text-[14px] font-medium text-white/85" aria-label="Details">
                <li>{movie.releaseDate.slice(0, 4)}</li>
                <Dot />
                {movie.certificate && (
                  <>
                    <li className="rounded-[4px] border border-white/60 px-1.5 text-[12px] leading-5" title={t("hero.certificate", { c: movie.certificate })}>
                      {movie.certificate}
                    </li>
                    <Dot />
                  </>
                )}
                {runtime && (
                  <>
                    <li>{runtime}</li>
                    <Dot />
                  </>
                )}
                <li>{movie.language}</li>
                <Dot />
                <li className="rounded-[4px] bg-purple px-1.5 text-[12px] leading-5 font-semibold text-white">{movie.format}</li>
              </motion.ul>
              <motion.p variants={item} className="body-l mb-7 line-clamp-3 max-w-[540px] text-white/75">
                {movie.synopsis}
              </motion.p>
              <motion.div variants={item} className="mb-6 flex flex-wrap gap-3">
                <ButtonLink href={`/book?movie=${movie.slug}`} icon="ticket">
                  {t("common.buyTickets")}
                </ButtonLink>
                <ButtonLink href="/book" variant="secondary" icon="calendar">
                  {t("common.fullSchedule")}
                </ButtonLink>
              </motion.div>
              <motion.p variants={item} className="flex items-center gap-1.5 text-[13px] text-muted">
                <Icon name="mapPoint" size={16} />
                {t("hero.playingAcross", { count: movie.branchCount })}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* carousel controls: sound, pause/play, progress dashes (click to jump) */}
      <motion.div
        className="absolute right-8 bottom-[104px] flex items-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: revealed ? 1 : 0 }}
        transition={{ duration: 0.6, delay: revealed ? 0.4 : 0 }}
      >
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          className="focus-ring grid size-9 place-items-center rounded-pill text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          aria-label={muted ? t("common.unmute") : t("common.mute")}
          aria-pressed={!muted}
        >
          <Icon name={muted ? "volumeOff" : "volumeOn"} size={18} />
        </button>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="focus-ring grid size-9 place-items-center rounded-pill text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          aria-label={paused ? t("hero.playCarousel") : t("hero.pauseCarousel")}
        >
          <Icon name={paused ? "play" : "pause"} size={18} />
        </button>
        <ol className="flex items-center gap-2">
          {movies.map((m, i) => (
            <li key={m.slug}>
              <button
                type="button"
                onClick={() => i !== index && goTo(i)}
                className="focus-ring group relative block h-6 w-8"
                aria-label={t("hero.showTrailer", { n: i + 1, total: movies.length })}
                aria-current={i === index || undefined}
              >
                <span className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 rounded-pill bg-white/30 transition-colors group-hover:bg-white/60" />
                <span
                  ref={(el) => {
                    bars.current[i] = el;
                  }}
                  className="absolute inset-x-0 top-1/2 h-[2px] origin-left -translate-y-1/2 scale-x-0 rounded-pill bg-purple-light"
                />
              </button>
            </li>
          ))}
        </ol>
      </motion.div>

      {/* "Tonight at" pinned to the bottom of the hero */}
      <motion.div
        className="absolute inset-x-0 bottom-0"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : 24 }}
        transition={{ duration: 0.6, delay: revealed ? 0.5 : 0, ease: [0.22, 1, 0.36, 1] }}
      >
        <TonightStrip shows={tonight} titles={titles} />
      </motion.div>
    </section>
  );
}

function Dot() {
  return (
    <li aria-hidden className="text-white/40">
      ·
    </li>
  );
}
