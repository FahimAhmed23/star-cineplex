"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/lib/i18n";
import type { Movie } from "@/lib/types";
import { MovieCard } from "./MovieCard";

const VISIBLE = 4;
const INTERVAL = 3500; // slide one card left every 3.5s
const SLIDE_MS = 700;
const RESUME_MS = 1000; // resume 1s after the mouse leaves
const GAP = 24;

/**
 * Coming Soon (CLAUDE.md §8.6): the same MovieCard in an auto-sliding row — 4 visible, one card to the
 * left every 3.5s, looping. Pauses on hover / focus / off-screen; arrows + dots restart the timer.
 * Card click = Play Trailer; the top-left pill shows the release date.
 */
export function ComingSoon({ movies, onPlayTrailer }: { movies: Movie[]; onPlayTrailer: (m: Movie, el: HTMLElement) => void }) {
  const { t } = useT();
  const reduced = useReducedMotion();
  const n = movies.length;
  // enough copies for a seamless loop (fewer films than slots → copies fill the row)
  const copies = Math.max(3, Math.ceil((VISIBLE * 2) / Math.max(1, n)) + 1);
  const track = Array.from({ length: copies }, () => movies).flat();
  const [pos, setPos] = useState(n); // start on the second copy so ‹ can go back seamlessly
  const [animate, setAnimate] = useState(true);
  const [hold, setHold] = useState(false); // hover / focus
  const [onScreen, setOnScreen] = useState(false);
  const [cardW, setCardW] = useState(302);
  const [visible, setVisible] = useState(VISIBLE); // §11: 2 cards on phones, 3 on tablets
  const section = useRef<HTMLElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const resumeTimer = useRef<number | undefined>(undefined);
  const [tick, setTick] = useState(0); // bump to restart the interval after manual use

  // card width from the viewport (4 per row in the 1280 container)
  useLayoutEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const v = w < 640 ? 2 : w < 960 ? 3 : VISIBLE;
      setVisible(v);
      setCardW((w - GAP * (v - 1)) / v);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // pause while off-screen
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const go = useCallback(
    (delta: number) => {
      setAnimate(true);
      setPos((p) => p + delta);
    },
    [],
  );

  // auto-advance
  useEffect(() => {
    if (hold || !onScreen || reduced || n < 2) return;
    const id = window.setInterval(() => go(1), INTERVAL);
    return () => window.clearInterval(id);
  }, [hold, onScreen, reduced, n, go, tick]);

  // after a slide lands outside the middle copy, jump back by one set without animation (seamless loop)
  useEffect(() => {
    if (pos >= n * 2 || pos < n) {
      const id = window.setTimeout(() => {
        setAnimate(false);
        setPos((p) => ((p - n) % n + n) % n + n);
      }, reduced ? 0 : SLIDE_MS);
      return () => window.clearTimeout(id);
    }
  }, [pos, n, reduced]);
  useEffect(() => {
    if (!animate) {
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
      return () => cancelAnimationFrame(id);
    }
  }, [animate]);

  const manual = (fn: () => void) => {
    fn();
    setTick((x) => x + 1); // manual use restarts the 3.5s timer
  };

  const active = ((pos % n) + n) % n;
  const offset = -pos * (cardW + GAP);

  return (
    <section ref={section} id="coming-soon" aria-labelledby="coming-soon-title" className="theme-light relative z-10 scroll-mt-24 pt-[120px] pb-32">
      <div className="mx-auto max-w-[1280px] px-8">
        <h2 id="coming-soon-title" className="display-m mb-14 text-center text-ink">
          {t("home.comingSoonTitle")}
        </h2>

        <div
          className="relative"
          onMouseEnter={() => {
            window.clearTimeout(resumeTimer.current);
            setHold(true);
          }}
          onMouseLeave={() => {
            resumeTimer.current = window.setTimeout(() => setHold(false), RESUME_MS);
          }}
          onFocusCapture={() => setHold(true)}
          onBlurCapture={() => setHold(false)}
        >
          {/* viewport shows 4 cards; a little room for the hover lift */}
          <div ref={viewport} className="-my-4 overflow-hidden py-4" aria-roledescription="carousel">
            <motion.ul
              className="flex"
              style={{ gap: GAP }}
              animate={{ x: offset }}
              transition={animate && !reduced ? { duration: SLIDE_MS / 1000, ease: [0.65, 0, 0.35, 1] } : { duration: 0 }}
              initial={false}
            >
              {track.map((m, i) => {
                const inView = i >= pos && i < pos + visible;
                return (
                  <li key={`${m.slug}-${i}`} className="shrink-0" style={{ width: cardW }} aria-hidden={!inView || undefined}>
                    <MovieCard movie={m} variant="soon" onPlayTrailer={onPlayTrailer} inert={!inView} />
                  </li>
                );
              })}
            </motion.ul>
          </div>

          {/* ‹ › at the sides */}
          {n > 1 && (
            <>
              <button
                type="button"
                onClick={() => manual(() => go(-1))}
                className="focus-ring absolute top-1/2 -left-5 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-pill border border-ink/10 bg-white text-ink shadow-[0_8px_24px_rgb(35_31_32/0.14)] transition-colors hover:bg-paper"
                aria-label={t("cards.previous")}
              >
                <Icon name="altArrowLeft" size={20} />
              </button>
              <button
                type="button"
                onClick={() => manual(() => go(1))}
                className="focus-ring absolute top-1/2 -right-5 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-pill border border-ink/10 bg-white text-ink shadow-[0_8px_24px_rgb(35_31_32/0.14)] transition-colors hover:bg-paper"
                aria-label={t("cards.next")}
              >
                <Icon name="altArrowRight" size={20} />
              </button>
            </>
          )}
        </div>

        {/* dot pagination */}
        {n > 1 && (
          <ol className="mt-8 flex justify-center gap-2">
            {movies.map((m, i) => (
              <li key={m.slug}>
                <button
                  type="button"
                  onClick={() => manual(() => go(i - active))}
                  className="focus-ring grid h-6 place-items-center px-1"
                  aria-label={t("cards.goTo", { n: i + 1 })}
                  aria-current={i === active || undefined}
                >
                  {/* one 24px pill, scaled down to a dot when inactive (scale, not width) */}
                  <span
                    className={`block h-1.5 w-6 rounded-pill transition-[scale,background-color] duration-300 ease-out ${i === active ? "scale-x-100 bg-purple-light" : "scale-x-25 bg-ink/20"}`}
                  />
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
