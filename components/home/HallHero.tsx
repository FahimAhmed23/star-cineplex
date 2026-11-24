"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/lib/i18n";
import { useUi } from "@/lib/store";
import type { Hall, Movie } from "@/lib/types";
import { releaseLabel } from "./MovieCard";
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
  /** Trailer view (§8.7): the hero locked to one film, trailer from the start, sound on */
  trailer?: HeroMovie | null;
  /** sound on when the trailer view was opened by a click (autoplay with sound needs a gesture) */
  trailerSound?: boolean;
  onBack?: () => void;
}

/**
 * Hero (CLAUDE.md §8.2): the 3D hall (angled left-side view) with the trailer carousel playing on its screen,
 * the movie info on the left and the "Tonight at" strip pinned to the bottom. Also the Trailer view (§8.7).
 * Scroll fades (§8.3) read the --p custom property set on the sticky wrapper.
 */
export function HallHero({ movies, hall, bookedSeats, tonight, titles, trailer, trailerSound, onBack }: Props) {
  const { t, lang } = useT();
  const stage = useUi((s) => s.stage);
  const covered = useUi((s) => s.heroCovered);
  const setHallReady = useUi((s) => s.setHallReady);
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [dipping, setDipping] = useState(false);
  const [ended, setEnded] = useState(false);
  const progress = useRef(0); // 0..1 of the current slide
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  const video = useRef<HTMLVideoElement | null>(null);
  const revealed = stage === "revealed";
  const single = !!trailer;
  const movie = trailer ?? movies[index];

  // entering / leaving the trailer view: sound follows the click, replay state resets
  useEffect(() => {
    setEnded(false);
    setMuted(single ? !trailerSound : true);
    setPaused(false);
  }, [single, trailer?.slug, trailerSound]);

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

  // progress bar + auto-advance (no React re-render per frame); off in the trailer view
  useEffect(() => {
    if (!revealed || single) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      if (!paused && !dipping && !covered) progress.current = Math.min(1, progress.current + dt / SLIDE_MS);
      bars.current.forEach((el, i) => {
        if (el) el.style.transform = `scaleX(${i === index ? progress.current : 0})`;
      });
      if (progress.current >= 1 && !dipping) goTo(index + 1);
      else raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [revealed, single, paused, dipping, index, goTo, covered]);

  const replay = () => {
    const el = video.current;
    if (!el) return;
    el.currentTime = 0;
    el.play().catch(() => {});
    setEnded(false);
  };

  const isBnTitle = lang === "bn" && !!movie.titleBn;
  const title = isBnTitle ? movie.titleBn! : movie.title;
  const long = title.length > 18;
  const runtime = movie.runtimeMin ? t("hero.minutes", { h: Math.floor(movie.runtimeMin / 60), m: movie.runtimeMin % 60 }) : null;
  const soon = movie.status === "coming-soon";

  // screen: 10% during the opening, full once revealed, black during a dip; the scroll sheet dims it to 35%
  // (when a trailer ends the screen dims to 25%, so Replay / Buy Tickets read clearly on it)
  const brightness = !revealed ? 0.1 : dipping ? 0 : ended ? 0.25 : 1;

  const item = {
    hidden: { opacity: 0, y: reduced ? 0 : 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
  };

  return (
    <section className="relative h-[100svh] min-h-[640px] overflow-hidden bg-night" aria-label={single ? title : t("hero.eyebrow")}>
      {/* the hall: slight scale + black overlay while the next section covers it (§8.3) */}
      <div className="hero-p-scale absolute inset-0">
        <Hall3D
          key={single ? "trailer" : "carousel"}
          className="!absolute inset-0"
          hall={hall}
          bookedSeats={bookedSeats}
          mode="front"
          active={!covered}
          trailer={movie.trailer}
          poster={movie.trailerPoster}
          trailerCrop={movie.trailerCrop}
          startAt={single ? 0 : START_AT}
          loop={!single}
          onTrailerEnded={() => setEnded(true)}
          videoRef={video}
          muted={muted}
          playing={!paused && !covered && !ended}
          screenBrightness={brightness}
          screenScale={() => 1 - 0.65 * useUi.getState().heroScroll}
          houseLights={0}
          onReady={() => setHallReady(true)}
        />
      </div>
      <div aria-hidden className="hero-p-dim pointer-events-none absolute inset-0 bg-black" />

      {/* one smooth left-to-right gradient over the whole hero: dark behind the text, clear before the screen */}
      <div aria-hidden className="hero-fade pointer-events-none absolute inset-0" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-night/90 to-transparent" />

      {/* trailer view: Back chip top-left (§8.7) */}
      {single && onBack && (
        <motion.button
          type="button"
          onClick={onBack}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="hero-p-early focus-ring absolute top-[112px] left-8 z-10 flex items-center gap-2 rounded-pill border border-white/25 bg-black/30 px-4 py-2 text-[14px] font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/10"
        >
          <Icon name="arrowLeft" size={18} />
          {t("trailer.back")}
        </motion.button>
      )}

      {/* hero info */}
      <div className={`absolute inset-x-0 mx-auto max-w-[1440px] px-8 ${single ? "top-[max(172px,22vh)]" : "top-[max(124px,16vh)]"}`}>
        <AnimatePresence mode="wait">
          {revealed && (
            <motion.div
              key={movie.slug}
              className="relative"
              // the column always ends before the screen (which starts at ~48% of the width)
              style={{ maxWidth: "min(600px, calc(46vw - max(0px, (100vw - 1440px) / 2) - 32px))" }}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, transition: { duration: 0.25 } }}
              variants={{ show: { transition: { staggerChildren: 0.1 } } }}
            >
              {/* scroll: the synopsis and buttons fade first, then the title (§8.3) */}
              <div className="hero-p-late">
                <motion.p variants={item} className="eyebrow mb-4">
                  <Icon name="star" size={16} />
                  {soon ? t("home.comingSoonTitle") : t("hero.eyebrow")}
                </motion.p>
                <motion.h1
                  variants={item}
                  lang={isBnTitle ? "bn" : "en"} /* English titles keep Fraunces in Bangla mode */
                  className="display-xl mb-5 !font-bold text-white" /* hero film title at 700 (designer) */
                  // display-xl, also capped by viewport height so title + buttons fit above the strip at 1280×720
                  style={{ fontSize: long ? "min(clamp(56px, 6vw, 96px), 9.5vh)" : "min(clamp(72px, 10vw, 150px), 14vh)" }}
                >
                  {title}
                </motion.h1>
              </div>
              <div className="hero-p-early">
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
                <motion.p variants={item} className="body-l mb-7 line-clamp-3 text-white/75">
                  {movie.synopsis}
                </motion.p>
                <motion.div variants={item} className="mb-6 flex flex-wrap gap-3">
                  {soon ? (
                    // Coming Soon in the trailer view: a non-clickable release badge instead of Buy Tickets (§8.6)
                    <span className="inline-flex items-center gap-2 rounded-pill border border-white/25 px-[22px] py-[14px] text-[15px] font-semibold text-white">
                      <Icon name="calendar" size={20} />
                      {t("common.releasing", { date: releaseLabel(movie.releaseDate, lang) })}
                    </span>
                  ) : (
                    <ButtonLink href={`/book?movie=${movie.slug}`} icon="ticket">
                      {t("common.buyTickets")}
                    </ButtonLink>
                  )}
                  <ButtonLink href="/book" variant="secondary" icon="calendar">
                    {t("common.fullSchedule")}
                  </ButtonLink>
                </motion.div>
                {!soon && (
                  <motion.p variants={item} className="flex items-center gap-1.5 text-[13px] text-muted">
                    <Icon name="mapPoint" size={16} />
                    {t("hero.playingAcross", { count: movie.branchCount })}
                  </motion.p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* trailer ended: Replay + Buy Tickets on the screen area (the screen fills ~48–94% of the width) */}
      <AnimatePresence>
        {single && ended && (
          <motion.div
            className="absolute top-[42%] left-[71%] z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            role="status"
          >
            <p className="text-[14px] text-white/80">{t("trailer.ended")}</p>
            <div className="flex gap-3">
              <button type="button" onClick={replay} className="btn btn-secondary btn-sm bg-black/40 backdrop-blur-md">
                <Icon name="restart" size={18} />
                {t("common.replay")}
              </button>
              {!soon && (
                <ButtonLink href={`/book?movie=${movie.slug}`} size="sm" icon="ticket">
                  {t("common.buyTickets")}
                </ButtonLink>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* carousel controls: sound, pause/play, progress dashes (click to jump); trailer view: sound only */}
      <div className="hero-p-early absolute right-8 bottom-[104px]">
        <motion.div
          className="flex items-center gap-4"
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
          {!single && (
            <>
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
            </>
          )}
        </motion.div>
      </div>

      {/* "Tonight at" pinned to the bottom of the hero; fades out first on scroll */}
      <div className="hero-p-strip absolute inset-x-0 bottom-0">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : 24 }}
          transition={{ duration: 0.6, delay: revealed ? 0.5 : 0, ease: [0.22, 1, 0.36, 1] }}
        >
          <TonightStrip shows={tonight} titles={titles} />
        </motion.div>
      </div>
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
