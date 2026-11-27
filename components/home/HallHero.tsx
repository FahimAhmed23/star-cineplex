"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useDevice } from "@/lib/device";
import { useT } from "@/lib/i18n";
import { useUi } from "@/lib/store";
import type { Hall, Movie } from "@/lib/types";
import { releaseLabel } from "./MovieCard";
import { PhoneHall } from "./PhoneHall";
import { TonightStrip, type ShowLite } from "./TonightStrip";
import { RevealText, revealDuration } from "@/components/ui/RevealText";

const Hall3D = dynamic(() => import("@/components/hall/Hall3D"), { ssr: false });

const SLIDE_MS = 15_000; // each trailer plays 15s, then the carousel advances (designer, Nov 26)
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
  const { phone } = useDevice();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [dipping, setDipping] = useState(false);
  const [ended, setEnded] = useState(false);
  const progress = useRef(0); // 0..1 of the current slide
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  const video = useRef<HTMLVideoElement | null>(null);
  const revealed = stage === "revealed";
  // after the curtain rises (§8.1) things come in one after another: hall → navbar → hero text → "Tonight at".
  // A returning visitor (no opening) gets them at once.
  const afterCurtain = useRef(stage === "intro").current;
  const D = afterCurtain ? { text: 0.45, dashes: 0.9, strip: 1.05 } : { text: 0, dashes: 0.4, strip: 0.5 };
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
        // trailers already played stay full, the current one fills, later ones are empty (designer, Nov 26)
        if (el) el.style.transform = `translateY(-50%) scaleX(${i < index ? 1 : i === index ? progress.current : 0})`;
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

  const TITLE_DELAY = 0.15; // after the eyebrow
  const item = {
    hidden: { opacity: 0, y: reduced ? 0 : 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
  };

  return (
    <section className="relative h-[100svh] min-h-[640px] overflow-hidden bg-night" aria-label={single ? title : t("hero.eyebrow")}>
      {/* the hall: slight scale + black overlay while the next section covers it (§8.3) */}
      <div className="hero-p-scale absolute inset-0">
        {phone ? (
          // §11 phones: a still of the hall with the trailer on its screen — no live 3D
          <PhoneHall
            src={movie.trailer}
            poster={movie.trailerPoster}
            crop={movie.trailerCrop}
            startAt={single ? 0 : START_AT}
            loop={!single}
            onEnded={() => setEnded(true)}
            videoRef={video}
            muted={muted}
            playing={!paused && !covered && !ended}
            brightness={brightness}
            onReady={() => setHallReady(true)}
          />
        ) : (
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
        )}
      </div>
      <div aria-hidden className="hero-p-dim pointer-events-none absolute inset-0 bg-black" />

      {/* one smooth left-to-right gradient over the whole hero: dark behind the text, clear before the screen */}
      <div aria-hidden className="hero-fade pointer-events-none absolute inset-0 max-md:hidden" />
      {/* phones: the info sits under the screen, on a fade to night */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-night via-night/85 to-transparent md:hidden" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-night/90 to-transparent" />

      {/* trailer view: Back chip top-left (§8.7) */}
      {single && onBack && (
        <motion.button
          type="button"
          onClick={onBack}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="hero-p-early focus-ring absolute top-[76px] left-4 md:top-[124px] md:left-8 z-10 flex items-center gap-2 rounded-pill border border-white/25 bg-black/30 px-4 py-2 text-[14px] font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/10"
        >
          <Icon name="arrowLeft" size={18} />
          {t("trailer.back")}
        </motion.button>
      )}

      {/* hero info */}
      {/* desktop: always centred on the screen's height, whatever the display (designer, Nov 26) */}
      <div
        className={`pointer-events-none absolute inset-x-0 mx-auto max-w-[1440px] px-5 md:px-8 ${phone ? "bottom-[156px]" : "inset-y-0 flex items-center"}`}
      >
        {revealed && (
          <motion.div
            className="pointer-events-auto relative"
            // the column always ends before the screen (which starts at ~48% of the width)
            style={phone ? undefined : { maxWidth: "min(600px, calc(46vw - max(0px, (100vw - 1440px) / 2) - 32px))" }}
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { delayChildren: D.text, staggerChildren: 0.1 } } }}
          >
            {/* the eyebrow and the buttons stay put when the trailer changes; only the middle swaps (designer, Nov 26).
                They glide (layout) when the middle's height changes, since the block stays centred. */}
            {/* scroll: the synopsis and buttons fade first, then the title (§8.3) */}
            <motion.p layout="position" variants={item} className="hero-p-late eyebrow mb-3 md:mb-4">
              <Icon name="star" size={16} />
              {soon ? t("home.comingSoonTitle") : t("hero.eyebrow")}
            </motion.p>
            <AnimatePresence mode="wait">
              <motion.div
                key={movie.slug}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, transition: { duration: 0.25 } }}
                variants={{ show: { transition: { staggerChildren: 0.1 } } }}
              >
                <div className="hero-p-late">
                  {/* the title lands word by word (designer reference: Aave), then the rest follows */}
                  <RevealText
                    as="h1"
                    text={title}
                    show
                    delay={TITLE_DELAY}
                    lang={isBnTitle ? "bn" : "en"} /* English titles keep GC Movark in Bangla mode */
                    className="display-xl mb-4 text-white md:mb-5" /* hero film title at 700, like every title (designer) */
                    // compact hero title (designer, Nov 26): 72px / 55px at 1440×900 (short / long titles), capped by viewport height
                    style={{ fontSize: phone ? (long ? "clamp(26px, 7.2vw, 34px)" : "clamp(32px, 9.2vw, 44px)") : long ? "min(clamp(40px, 3.8vw, 60px), 7vh)" : "min(clamp(48px, 5vw, 80px), 9vh)" }}
                  />
                </div>
                <motion.div
                  className="hero-p-early"
                  variants={{ show: { transition: { delayChildren: reduced ? 0 : revealDuration(title, TITLE_DELAY) - 0.15, staggerChildren: 0.1 } } }}
                >
                  <motion.ul variants={item} className="mb-5 flex max-md:text-[13px] flex-wrap items-center gap-x-2.5 gap-y-2 text-[14px] font-medium text-white/85" aria-label="Details">
                    <li>{movie.releaseDate.slice(0, 4)}</li>
                    <Dot />
                    {movie.certificate && (
                      <>
                        <li className="rounded-[4px] border border-white/60 px-1.5 text-[12px] leading-5" title={t("hero.certificate", { c: movie.certificate, meaning: t(`hero.certificateMeaning.${movie.certificate}`) })}>
                          {movie.certificate}
                          <span className="sr-only">: {t(`hero.certificateMeaning.${movie.certificate}`)}</span>
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
                  <motion.p variants={item} className="body-l line-clamp-3 text-white/75 max-md:hidden">
                    {movie.synopsis}
                  </motion.p>
                </motion.div>
              </motion.div>
            </AnimatePresence>
            {/* 40px above the buttons (designer, Nov 26) */}
            <motion.div layout="position" variants={item} className="hero-p-early mt-10 mb-6 flex flex-wrap gap-3 max-md:mt-1 max-md:mb-0 max-md:[&_.btn]:flex-1">
                  {soon ? (
                    // Coming Soon in the trailer view: a non-clickable release badge instead of Buy Tickets (§8.6)
                    <span className="inline-flex items-center gap-2 rounded-pill border border-white/25 px-6 py-[14px] text-[15px] font-semibold text-white">
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
          </motion.div>
        )}
      </div>

      {/* trailer ended: Replay + Buy Tickets on the screen area (the screen fills ~48–94% of the width) */}
      <AnimatePresence>
        {single && ended && (
          <motion.div
            className={`absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-4 ${phone ? "top-[calc(100vw*2.1667*0.35)] left-1/2" : "top-[42%] left-[71%]"}`}
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
      <div className={`hero-p-early absolute ${phone ? "top-[calc(100vw*2.1667*0.455)] right-4" : "right-8 bottom-[104px]"}`}>
        <motion.div
          className="flex items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: revealed ? 1 : 0 }}
          transition={{ duration: 0.6, delay: revealed ? D.dashes : 0 }}
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
                      className="focus-ring group relative block h-6 w-10"
                      aria-label={t("hero.showTrailer", { n: i + 1, total: movies.length })}
                      aria-current={i === index || undefined}
                    >
                      <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-pill bg-white/25 transition-colors group-hover:bg-white/50" />
                      <span
                        ref={(el) => {
                          bars.current[i] = el;
                        }}
                        className="hero-progress absolute inset-x-0 top-1/2 h-[3px] origin-left rounded-pill"
                        // transform only (Tailwind 4 scale/translate classes would stack on it and hide the fill)
                        style={{ transform: "translateY(-50%) scaleX(0)" }}
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
          transition={{ duration: 0.7, delay: revealed ? D.strip : 0, ease: [0.22, 1, 0.36, 1] }}
        >
          <TonightStrip shows={tonight} titles={titles} order={movies.map((m) => m.slug)} current={movie.slug} />
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
